const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const readline = require('readline/promises');

const rootDir = path.resolve(__dirname, '..');
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z][0-9A-Za-z.-]*)?$/;
const NOTES_FILE = path.join(rootDir, 'release-notes.json');

const packagePath = path.join(rootDir, 'package.json');
const tauriPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const cargoLockPath = path.join(rootDir, 'src-tauri', 'Cargo.lock');

function git(args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf-8' }).trim();
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function nextPatch(version) {
  const [maj, min, pat] = version.split('-')[0].split('.').map(Number);
  return `${maj}.${min}.${pat + 1}`;
}

function applyVersions(newVersion) {
  const packageJson = readJson(packagePath);
  packageJson.version = newVersion;
  writeJson(packagePath, packageJson);

  const tauriJson = readJson(tauriPath);
  tauriJson.version = newVersion;
  writeJson(tauriPath, tauriJson);

  let cargoContent = fs.readFileSync(cargoPath, 'utf-8');
  cargoContent = cargoContent.replace(/^version = "[^"]*"/m, `version = "${newVersion}"`);
  fs.writeFileSync(cargoPath, cargoContent);

  if (fs.existsSync(cargoLockPath)) {
    let lockContent = fs.readFileSync(cargoLockPath, 'utf-8');
    lockContent = lockContent.replace(
      /(name = "manager-lock"\r?\nversion = ")[^"]+/,
      `$1${newVersion}`
    );
    fs.writeFileSync(cargoLockPath, lockContent);
  }
}

async function main() {
  const current = readJson(packagePath).version;
  const interactive = Boolean(process.stdin.isTTY);

  // --- Проверка чистого рабочего дерева ---
  const dirty = git(['status', '--porcelain']);
  if (dirty) {
    console.error('Ошибка: рабочее дерево не чистое. Сначала закоммитите или отбросьте изменения:');
    console.error(dirty);
    process.exit(1);
  }

  const rl = interactive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

  try {
    // --- 1. Версия (с указанием предыдущей версии и тега) ---
    console.log(`Текущая версия: ${current} (тег v${current})`);
    let version = process.argv[2] ? process.argv[2].trim() : '';

    if (interactive) {
      while (!version || !SEMVER.test(version)) {
        if (version) {
          console.error(`Некорректная версия "${version}". Ожидается формат X.Y.Z (например 1.7.0 или 1.7.0-beta.1).`);
        }
        version = (await rl.question(`Новая версия [${nextPatch(current)}]: `)).trim() || nextPatch(current);
      }
    }

    if (!SEMVER.test(version)) {
      console.error(`Ошибка: версия должна быть в формате X.Y.Z (например 0.2.0), получено: ${version}`);
      process.exit(1);
    }

    const tag = `v${version}`;

    const tagExists = git(['tag', '-l', tag]);
    if (tagExists) {
      console.error(`Ошибка: тег ${tag} уже существует.`);
      process.exit(1);
    }

    // --- 2. Название релиза ---
    const defaultName = `MLocker ${tag}`;
    let name = defaultName;
    if (interactive) {
      name = (await rl.question(`Название релиза [${defaultName}]: `)).trim() || defaultName;
    }

    // --- 3. Описание релиза (несколько строк) ---
    let body = '';
    if (interactive) {
      console.log('Описание релиза (что было сделано; несколько строк, пустая строка — завершить):');
      const lines = [];
      while (true) {
        const line = await rl.question(lines.length ? '  ' : '> ');
        if (!line.trim()) break;
        lines.push(line);
      }
      body = lines.join('\n');
    }

    // --- Подтверждение ---
    if (interactive) {
      console.log('');
      console.log('Будет выпущен релиз:');
      console.log(`  Версия:   ${current} → ${version}   (тег ${tag})`);
      console.log(`  Название: ${name}`);
      console.log(`  Описание: ${body ? body.replace(/\n/g, ' / ') : '(пусто)'}`);
      const answer = (await rl.question('\nВыпустить? (да/нет): ')).trim().toLowerCase();
      if (!['y', 'yes', 'д', 'да'].includes(answer)) {
        console.log('Отменено.');
        process.exit(0);
      }
    }

    // --- Обновление файлов ---
    applyVersions(version);
    writeJson(NOTES_FILE, { version, tag, name, body });
    console.log(`✓ Версия обновлена до ${version} (package.json, tauri.conf.json, Cargo.toml, Cargo.lock)`);
    console.log(`✓ release-notes.json записан`);

    // --- Git: коммит, тег, пуш ---
    const filesToStage = [packagePath, tauriPath, cargoPath, NOTES_FILE];
    if (fs.existsSync(cargoLockPath)) filesToStage.push(cargoLockPath);

    console.log('\n--- Git ---');
    try {
      git(['add', ...filesToStage.map((f) => path.relative(rootDir, f))]);
      git(['commit', '-m', `chore: bump version to ${version}`]);
      console.log('✓ Коммит создан');

      const tagArgs = ['tag', '-a', tag, '-m', name];
      if (body) tagArgs.push('-m', body);
      git(tagArgs);
      console.log(`✓ Тег ${tag} создан`);

      git(['push', '--set-upstream', 'origin', 'HEAD']);
      git(['push', 'origin', tag]);
      console.log('✓ Всё запушено, релиз запустится автоматически');
      console.log(`\nРелиз: https://github.com/rudmion/MLocker/releases/tag/${tag}`);
    } catch (e) {
      console.error('\nОшибка при работе с git:', e.message);
      console.log('Выполните вручную:');
      console.log('  git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock release-notes.json');
      console.log(`  git commit -m "chore: bump version to ${version}"`);
      console.log(`  git tag -a ${tag} -m "${name}"`);
      console.log(`  git push --set-upstream origin HEAD && git push origin ${tag}`);
      process.exit(1);
    }
  } finally {
    if (rl) rl.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
