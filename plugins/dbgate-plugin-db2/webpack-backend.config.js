var webpack = require('webpack');
var path = require('path');

const packageJson = require('./package.json');
const buildPluginExternals = require('../../common/buildPluginExternals');
const externals = buildPluginExternals(packageJson);

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
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  externals,
};

module.exports = config;