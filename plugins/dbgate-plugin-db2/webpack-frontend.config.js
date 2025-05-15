const path = require('path');

module.exports = {
  context: __dirname + "/src/frontend",
  mode: 'production',
  entry: './index.js',
  output: {
    filename: 'frontend.js',
    path: path.resolve(__dirname, 'dist'),
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
  externals: {
    'dbgate-types': 'dbgate-types',
  },
}; 