const fs = require('fs');
const path = require('path');
const volatilePackages = require('./common/volatilePackages');

function adjustFile(file, isApp = false) {
  const json = JSON.parse(fs.readFileSync(file, { encoding: 'utf-8' }));

  function processPackageFile(packageFile) {
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
    processPackageFile(path.join('plugins', packageName, 'package.json'));
  }

  if (isApp) {
    // add volatile dependencies from api to app
    processPackageFile(path.join('packages', 'api', 'package.json'));
  }

  if (process.platform != 'win32') {
    delete json.optionalDependencies.msnodesqlv8;
  }

  if (process.argv.includes('--community')) {
    delete json.optionalDependencies['mongodb-client-encryption'];
  }

  if (isApp && process.argv.includes('--premium')) {
    json.build.win.target = [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ];
    json.build.linux.target = [
      {
        target: 'AppImage',
        arch: ['x64'],
      },
    ];
    json.name = 'dbgate-premium';
    json.build.artifactName = 'dbgate-premium-${version}-${os}_${arch}.${ext}';
    json.build.appId = 'org.dbgate.premium';
    json.build.productName = 'DbGate Premium';
  }

  fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf-8');
}

adjustFile('packages/api/package.json');
adjustFile('app/package.json', true);

fs.writeFileSync('common/useBundleExternals.js', "module.exports = 'true';", 'utf-8');
