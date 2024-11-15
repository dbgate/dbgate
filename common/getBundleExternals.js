const volatilePackages = require('./volatilePackages');

function getBundleExternals() {
  return volatilePackages.reduce((acc, item) => {
    acc[item] = `commonjs ${item}`;
    return acc;
  }, {});
}

module.exports = getBundleExternals;
