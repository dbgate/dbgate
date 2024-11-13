const fs = require('fs');

function adjustRootPackageJson(file) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));
  json.workspaces.push('app');
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustRootPackageJson('package.json');
