var webpack = require('webpack');
var path = require('path');

const packageJson = require('./package.json');
const buildPluginExternals = require('../../common/buildPluginExternals');
const externals = buildPluginExternals(packageJson);

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
