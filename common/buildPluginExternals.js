const useBundleExternals = require('./useBundleExternals');
const getBundleExternals = require('./getBundleExternals');

function buildExternalsFromDependencies(packageJson) {
  if (useBundleExternals == 'true') {
    return getBundleExternals();
  }
  const { dependencies, optionalDependencies } = packageJson;
  const externals = {};
  for (let dep in dependencies || {}) {
    externals[dep] = `commonjs ${dep}`;
  }
  for (let dep in optionalDependencies || {}) {
    externals[dep] = `commonjs ${dep}`;
  }
  return externals;
}

module.exports = buildExternalsFromDependencies;
