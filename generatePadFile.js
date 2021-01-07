const fs = require('fs');
const path = require('path');
const packageJson = fs.readFileSync('app/package.json', { encoding: 'utf-8' });
const json = JSON.parse(packageJson);
const { version } = json;

const template = fs.readFileSync('app/dbgate-pad-template.xml', { encoding: 'utf-8' });

const date = new Date();
let size = 0;

const files = fs.readdirSync('app/dist');
for (const file of files) {
  if (file.endsWith('.exe')) {
    const stats = fs.statSync(path.join('app', 'dist', 'file'));
    size = stats.size;
  }
}

const padContent = template
  .replace('#VERSION#', version)
  .replace('#YEAR#', date.getFullYear())
  .replace('#MONTH#', (date.getMonth() + 1).toString().padStart(2, '0'))
  .replace('#DAY#', date.getDate().toString().padStart(2, '0'))
  .replace('#SIZE_BYTES#', size)
  .replace('#SIZE_KB#', Math.round(size / 1024))
  .replace('#SIZE_MB#', Math.round(size / 1024 / 1024));

fs.writeFileSync('app/dist/dbgate-pad.xml', padContent, 'utf-8');
