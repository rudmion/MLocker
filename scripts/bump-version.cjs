const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Использование: node scripts/bump-version.js <version>');
  console.error('Пример: node scripts/bump-version.js 0.2.0');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('Ошибка: версия должна быть в формате X.Y.Z (например, 0.2.0)');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');

// 1. package.json
const packagePath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
const oldVersion = packageJson.version;
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`✓ package.json: ${oldVersion} → ${newVersion}`);

// 2. tauri.conf.json
const tauriPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriJson = JSON.parse(fs.readFileSync(tauriPath, 'utf-8'));
tauriJson.version = newVersion;
fs.writeFileSync(tauriPath, JSON.stringify(tauriJson, null, 2) + '\n');
console.log(`✓ tauri.conf.json: ${oldVersion} → ${newVersion}`);

// 3. Cargo.toml
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
let cargoContent = fs.readFileSync(cargoPath, 'utf-8');
cargoContent = cargoContent.replace(
  /^version = ".*"$/m,
  `version = "${newVersion}"`
);
fs.writeFileSync(cargoPath, cargoContent);
console.log(`✓ Cargo.toml: ${oldVersion} → ${newVersion}`);

console.log(`\nВерсия обновлена до ${newVersion}`);
console.log('Не забудьте запушить изменения и создать тег:');
console.log(`  git add . && git commit -m "chore: bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin development && git push origin v${newVersion}`);
