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
    '@clickhouse/client': 'commonjs @clickhouse/client',
    'json-stable-stringify': 'commonjs json-stable-stringify',
    'dbgate-tools': 'commonjs dbgate-tools',
    lodash: 'commonjs lodash',
  },
};

module.exports = config;
