const path = require('path');

module.exports = {
  context: __dirname + "/src/backend",
  mode: 'production',
  target: 'node',
  entry: './src/backend/index.js',
  output: {
    filename: 'backend.js',
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
    'dbgate-tools': 'dbgate-tools',
    'dbgate-types': 'dbgate-types',
  },
}; 