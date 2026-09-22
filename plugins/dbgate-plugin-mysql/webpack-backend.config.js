var webpack = require('webpack');
var path = require('path');

const packageJson = require('./package.json');
const buildPluginExternals = require('../../common/buildPluginExternals');
const externals = buildPluginExternals(packageJson);
// dbgate-mysql-dumper is not in common/volatilePackages.js, so it is not installed next to the
// packaged plugin - it must be bundled instead of required at runtime.
delete externals['dbgate-mysql-dumper'];

var config = {
  context: __dirname + '/src/backend',

  entry: {
    app: './index.js',
  },
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'backend.js',
    libraryTarget: 'commonjs2',
  },

  externals,

  // uncomment for disable minimalization
  // optimization: {
  //   minimize: false,
  // },
};

module.exports = config;
