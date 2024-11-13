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

  plugins: [
    new webpack.IgnorePlugin({
      checkResource(resource) {
        const lazyImports = ['pg-native', 'uws'];
        if (!lazyImports.includes(resource)) {
          return false;
        }
        try {
          require.resolve(resource);
        } catch (err) {
          return true;
        }
        return false;
      },
    }),
  ],

  externals: {
    'dbgate-tools': 'commonjs dbgate-tools',
    'dbgate-query-splitter': 'commonjs dbgate-query-splitter',
    lodash: 'commonjs lodash',
    pg: 'commonjs pg',
    'pg-copy-streams': 'commonjs pg-copy-streams',
  }
};

module.exports = config;
