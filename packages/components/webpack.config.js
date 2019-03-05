const path = require('path');
const webpack = require('webpack');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const DynamicCdnWebpackPlugin = require('dynamic-cdn-webpack-plugin');

module.exports = {
  entry: path.join(__dirname, '/src/index.js'),
  mode: 'development',
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
    // new HtmlWebpackPlugin(),
    new DynamicCdnWebpackPlugin()
  ],
  externals: {
    // lit: true,
    render: true,
    html: true,
    _: true,
    self: true
  }
};