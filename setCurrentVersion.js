const fs = require('fs');
const path = require('path');

function changeDependencies(deps, version) {
  if (!deps) return;
  for (const key of Object.keys(deps)) {
    if (key.startsWith('dbgate-') && key != 'dbgate-plugin-tools' && key != 'dbgate-query-splitter') {
      deps[key] = `^${version}`;
    }
  }
}

function changePackageFile(packagePath, version) {
  const text = fs.readFileSync(path.join(packagePath, 'package.json'), { encoding: 'utf-8' });
  const json = JSON.parse(text);
  json.version = version;
  changeDependencies(json.dependencies, version);
  changeDependencies(json.devDependencies, version);
  fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(json, null, 2), { encoding: 'utf-8' });
}

const packageJson = fs.readFileSync('package.json', { encoding: 'utf-8' });
const json = JSON.parse(packageJson);

const text = `
module.exports = { 
  version: '${json.version}',
  buildTime: '${new Date().toISOString()}'
};
`;

fs.writeFileSync('packages/api/src/currentVersion.js', text);

changePackageFile('app', json.version);

changePackageFile('packages/api', json.version);
changePackageFile('packages/sqltree', json.version);
changePackageFile('packages/types', json.version);
changePackageFile('packages/tools', json.version);
changePackageFile('packages/web', json.version);
changePackageFile('packages/datalib', json.version);
changePackageFile('packages/dbgate', json.version);
changePackageFile('packages/serve', json.version);
changePackageFile('packages/filterparser', json.version);

changePackageFile('plugins/dbgate-plugin-csv', json.version);
changePackageFile('plugins/dbgate-plugin-xml', json.version);
changePackageFile('plugins/dbgate-plugin-excel', json.version);
changePackageFile('plugins/dbgate-plugin-mssql', json.version);
changePackageFile('plugins/dbgate-plugin-mysql', json.version);
changePackageFile('plugins/dbgate-plugin-mongo', json.version);
changePackageFile('plugins/dbgate-plugin-postgres', json.version);
changePackageFile('plugins/dbgate-plugin-sqlite', json.version);
changePackageFile('plugins/dbgate-plugin-redis', json.version);
