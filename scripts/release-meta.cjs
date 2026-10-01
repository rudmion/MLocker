// Читает release-notes.json и передаёт название/описание релиза в GitHub Actions.
// Используется в .github/workflows/release.yml (шаг с id: meta).
const fs = require('fs');
const path = require('path');

const notesPath = path.join(__dirname, '..', 'release-notes.json');
const refTag = process.env.GITHUB_REF_NAME || '';

let name = refTag ? `MLocker ${refTag}` : 'MLocker релиз';
let body = 'См. страницу релиза для деталей.';

try {
  const meta = JSON.parse(fs.readFileSync(notesPath, 'utf-8'));
  const tagMatches = !refTag || meta.tag === refTag;
  if (tagMatches && meta.name) {
    name = meta.name;
    if (typeof meta.body === 'string' && meta.body.trim()) {
      body = meta.body;
    }
  }
} catch {
  // release-notes.json отсутствует/некорректен — используем значения по умолчанию
}

const outputs = { name, body };
const outputFile = process.env.GITHUB_OUTPUT;

if (outputFile) {
  for (const [key, value] of Object.entries(outputs)) {
    const delimiter = `RELEASE_META_${key}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    fs.appendFileSync(outputFile, `${key}<<${delimiter}\n${value}\n${delimiter}\n`, 'utf-8');
  }
}

console.log(`releaseName: ${name}`);
console.log(`releaseBody (${body.split('\n').length} строк)`);
