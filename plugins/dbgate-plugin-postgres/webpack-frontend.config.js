var webpack = require('webpack');
var path = require('path');

var config = {
  context: __dirname + '/src/frontend',

  entry: {
    app: './index.js',
  },
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'frontend.js',
    libraryTarget: 'var',
    library: 'plugin',
  },

  plugins: [
    new webpack.DefinePlugin({
      'global.DBGATE_PACKAGES': 'window.DBGATE_PACKAGES',
    }),
  ],

  // uncomment for disable minimalization
  // optimization: {
  //   minimize: false,
  // },
};

module.exports = config;
