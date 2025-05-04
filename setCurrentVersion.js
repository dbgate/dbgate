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
  try {
    const text = fs.readFileSync(path.join(packagePath, 'package.json'), { encoding: 'utf-8' });
    const json = JSON.parse(text);
    json.version = version;
    changeDependencies(json.dependencies, version);
    changeDependencies(json.devDependencies, version);
    fs.writeFileSync(path.join(packagePath, 'package.json'), JSON.stringify(json, null, 2), { encoding: 'utf-8' });
  } catch (err) {
    console.log('Error changing package file', packagePath, err.message);
  }
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
changePackageFile('packages/serve', json.version);
changePackageFile('packages/filterparser', json.version);
changePackageFile('packages/dbmodel', json.version);

if (fs.existsSync('packer/azure-ubuntu.pkr.hcl')) {
  const text = fs.readFileSync('packer/azure-ubuntu.pkr.hcl', { encoding: 'utf-8' });
  fs.writeFileSync('packer/azure-ubuntu.pkr.hcl', text.replace(/image_version\s*=\s*"[^"]+"/, `image_version = "${json.version}"`), { encoding: 'utf-8' });
}

for (const package of fs.readdirSync('plugins')) {
  if (!package.startsWith('dbgate-plugin-')) continue;

  changePackageFile(`plugins/${package}`, json.version);
}
