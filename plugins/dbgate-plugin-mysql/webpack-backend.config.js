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

  externals: {
    'dbgate-tools': 'commonjs dbgate-tools',
    'dbgate-query-splitter': 'commonjs dbgate-query-splitter',
    'antares-mysql-dumper': 'commonjs antares-mysql-dumper',
    lodash: 'commonjs lodash',
    mysql2: 'commonjs mysql2',
  },

  // uncomment for disable minimalization
  // optimization: {
  //   minimize: false,
  // },
};

module.exports = config;
