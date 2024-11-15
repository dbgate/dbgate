const fs = require('fs');
const path = require('path');
const volatilePackages = require('./common/volatilePackages');

function adjustFile(file, isApp = false) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));

  function processFile(packageFile) {
    const pluginJson = JSON.parse(fs.readFileSync(packageFile, { encoding: 'utf-8' }));
    for (const depkey of ['dependencies', 'optionalDependencies']) {
      for (const dependency of Object.keys(pluginJson[depkey] || {})) {
        if (!volatilePackages.includes(dependency)) {
          // add only voletile packages
          continue;
        }
        if (!json[depkey]) {
          json[depkey] = {};
        }
        if (json[depkey][dependency]) {
          if (json[depkey][dependency] != pluginJson[depkey][dependency]) {
            console.log(`Dependency ${dependency} in ${packageName} is different from ${file}`);
          }
          continue;
        }
        json[depkey][dependency] = pluginJson[depkey][dependency];
      }
    }
  }

  for (const packageName of fs.readdirSync('plugins')) {
    if (!packageName.startsWith('dbgate-plugin-')) continue;
    processFile(path.join('plugins', packageName, 'package.json'));
  }

  if (isApp) {
    // add volatile dependencies from api to app
    processFile(path.join('packages', 'api', 'package.json'));
  }

  if (process.platform != 'win32') {
    delete json.optionalDependencies.msnodesqlv8;
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustFile('packages/api/package.json');
adjustFile('app/package.json', true);

fs.writeFileSync('common/useBundleExternals.js', "module.exports = 'true';", 'utf-8');
