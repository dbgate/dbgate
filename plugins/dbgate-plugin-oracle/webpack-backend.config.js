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
        const lazyImports = ['uws'];
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
};

module.exports = config;
