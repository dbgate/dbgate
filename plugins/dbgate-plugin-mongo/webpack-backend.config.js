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

  // module: {
  //   rules: [
  //     {
  //       test: /\.(js)$/,
  //       exclude: /node_modules/,
  //       use: ['babel-loader'],
  //     },
  //   ],
  // },
  // uncomment for disable minimalization
  //   optimization: {
  //     minimize: false,
  //   },
};

module.exports = config;
