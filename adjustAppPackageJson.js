const fs = require('fs');

function adjustFile(file) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));
  json.workspaces.push('app');
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustFile('app/package.json');
