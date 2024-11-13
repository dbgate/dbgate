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
  },
};

module.exports = config;
