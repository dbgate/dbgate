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
    'dbgate-tools': 'commmonjs dbgate-tools',
    'dbgate-query-splitter': 'commmonjs dbgate-query-splitter',
    lodash: 'commmonjs lodash',
    async: 'commmonjs async',
    ioredis: 'commmonjs ioredis',
    'node-redis-dump2': 'commmonjs node-redis-dump2',
  },
};

module.exports = config;
