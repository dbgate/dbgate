var webpack = require('webpack');
var path = require('path');

var config = {
  context: __dirname + '/src',

  entry: {
    app: './index.js',
  },
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2',
  },

  // optimization: {
  //   minimize: false,
  // },

  //   module: {
  //     rules: [
  //       {
  //         test: /\.js$/,
  //         exclude: /node_modules/
  //       },
  //     ],
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
