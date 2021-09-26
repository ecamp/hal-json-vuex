import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  devtool: 'source-map',
  externals: [nodeExternals()],
  entry: [
    './src/index.ts'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ],
  module: {
    rules: [

      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { test: /\.js$/, loader: 'source-map-loader' },

      { test: /\.js?$/, use: ['babel-loader', 'eslint-loader'], exclude: /node_modules/ }
    ]
  },
  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: ['.tsx', '.ts', '.js'],

    modules: [
      path.join(__dirname, 'src'),
      'node_modules'
    ]
  }
}
