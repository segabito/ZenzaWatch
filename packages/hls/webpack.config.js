const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: path.join(__dirname, '/src/index.js'),
  mode: 1 ? 'development' : 'production',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'main.js'
  },
  devServer: {
    contentBase: './',
    // open: true
  },
  devtool: false, //'inline-source-map',
  cache: true,
  module: {
    // rules: [
    //   {
    //     test: /\.js$/,
    //     use: [
    //       {
    //         loader: 'babel-loader',
    //         options: {
    //           presets: [
    //             // '@babel/preset-env'
    //           ]
    //         }
    //       }
    //     ]
    //   }
    // ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('development')
      }
    }),
  ],
  resolve: {
    alias: {
      // 'hls.js': require.resolve('hls.js/dist/hls.light.js')
    }
  },
  externals: {
    // lit: true,
    render: true,
    html: true,
    _: true,
    self: true
  }
};