const { rspack } = require('@rspack/core');
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
    library: {
      name: 'plugin',
      type: 'var',
      export: 'default',
    },
    module: true,
  },

  plugins: [
    new rspack.DefinePlugin({
      'global.DBGATE_PACKAGES': 'window.DBGATE_PACKAGES',
    }),
  ],

  // uncomment for disable minimalization
  // optimization: {
  //   minimize: false,
  // },
};

module.exports = config;
