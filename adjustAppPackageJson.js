const fs = require('fs');

function adjustAppPackageJson(file) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));
  json.workspaces = ['../packages/tools', '../packages/types', '../packages/sqltree'];
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustAppPackageJson('app/package.json');
