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

  // uncomment for disable minimalization
  //   optimization: {
  //     minimize: false,
  //   },
  externals: {
    'dbgate-tools': 'commonjs dbgate-tools',
    'dbgate-query-splitter': 'commonjs dbgate-query-splitter',
    'better-sqlite3': 'commonjs better-sqlite3',
  },
};

module.exports = config;
