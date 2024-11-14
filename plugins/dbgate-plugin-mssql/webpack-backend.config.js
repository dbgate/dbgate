var webpack = require('webpack');
var path = require('path');

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

  // optimization: {
  //   minimize: false,
  // },

  externals: {
    msnodesqlv8: 'commonjs msnodesqlv8',
    'async-lock': 'commonjs async-lock',
    'dbgate-query-splitter': 'commonjs dbgate-query-splitter',
    'dbgate-tools': 'commonjs dbgate-tools',
    lodash: 'commonjs lodash',
    tedious: 'commonjs tedious',
  },
};

module.exports = config;
