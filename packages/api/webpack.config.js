var webpack = require('webpack');
var path = require('path');
var getBundleExternals = require('../../common/getBundleExternals');

var externals = getBundleExternals();

var config = {
  context: __dirname + '/src',

  entry: {
    app: './index.js',
  },
  target: 'node',
  node: {
    __dirname: false,
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2',
  },

  // optimization: {
  //   minimize: false,
  // },

  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },
  // plugins: [
  //   new webpack.IgnorePlugin({
  //     checkResource(resource) {
  //       const lazyImports = ['uws'];
  //       if (!lazyImports.includes(resource)) {
  //         return false;
  //       }
  //       try {
  //         require.resolve(resource);
  //       } catch (err) {
  //         return true;
  //       }
  //       return false;
  //     },
  //   }),
  // ],
  // externals: {
  //   'better-sqlite3': 'commonjs better-sqlite3',
  //   'oracledb': 'commonjs oracledb',
  //   'msnodesqlv8': 'commonjs msnodesqlv8',
  // },
  externals,
};

module.exports = config;
