const fs = require('fs');

function adjustFile(file) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));
  if (process.platform != 'win32') {
    delete json.optionalDependencies.msnodesqlv8;
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustFile('packages/api/package.json');
adjustFile('app/package.json');
