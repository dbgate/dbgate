var webpack = require('webpack');
var path = require('path');
var fs = require('fs');

console.log('process.env.NODE_ENV', process.env.NODE_ENV);
var envPath = path.resolve(__dirname, `.env.${process.env.NODE_ENV}`);
var dotenvConfig = require('dotenv').config({
  path: fs.existsSync(envPath)
    ? envPath
    : path.resolve(path.resolve(__dirname, '.env')),
});
const newConfig = {}
for(let key in dotenvConfig.parsed){
  newConfig['process.env.'+key] = JSON.stringify(dotenvConfig.parsed[key]);
}
console.log('newConfig', newConfig);

console.log('dotenvConfig', dotenvConfig);

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
    new webpack.DefinePlugin({
      ...newConfig
    }),
  ],
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
  },
};

module.exports = config;
