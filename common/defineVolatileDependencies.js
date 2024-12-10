const directory = process.argv[2];
const fs = require('fs');

const volatilePackages = require('./volatilePackages');
const apiPackageJson = JSON.parse(fs.readFileSync(`packages/api/package.json`, { encoding: 'utf-8' }));

const dependencies = {};
const optionalDependencies = {};
for (const pkg of volatilePackages) {
  if (pkg == 'msnodesqlv8' && process.platform != 'win32') {
    continue;
  }

  if (apiPackageJson.dependencies[pkg]) {
    dependencies[pkg] = apiPackageJson.dependencies[pkg];
  }
  if (apiPackageJson.optionalDependencies?.[pkg]) {
    optionalDependencies[pkg] = apiPackageJson.optionalDependencies[pkg];
  }
}

fs.writeFileSync(
  `${directory}/package.json`,
  JSON.stringify(
    {
      dependencies,
      optionalDependencies,
    },
    null,
    2
  ),
  'utf-8'
);
