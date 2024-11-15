const fs = require('fs');
const path = require('path');
const volatilePackages = require('./common/volatilePackages');

function adjustFile(file) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));

  for (const packageName of fs.readdirSync('plugins')) {
    if (!packageName.startsWith('dbgate-plugin-')) continue;
    const pluginJson = JSON.parse(
      fs.readFileSync(path.join('plugins', packageName, 'package.json'), { encoding: 'utf-8' })
    );
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

  if (process.platform != 'win32') {
    delete json.optionalDependencies.msnodesqlv8;
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustFile('packages/api/package.json');
adjustFile('app/package.json');

fs.writeFileSync('common/useBundleExternals.js', "module.exports = 'true';", 'utf-8');
