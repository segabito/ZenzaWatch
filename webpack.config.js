require('babel-core/register');
const path = require('path');
// require('@babel/register');
console.log('load webpack.config.js');

module.exports = {
  entry: {
    main: './src/ZenzaWatchIndex.js'
  },
  output: {
    filename: '[name].js',
    path: `${__dirname}/lib`,
  },
  module: {
    loaders: [{
      test: /\.m?jsx?$/,
      include: [
        // `${__dirname}/src`,
        `${__dirname}/test`,
      ],
      exclude: [
        /node_modules/,
        // `./src/browser.js`
      ],
      loader: 'babel-loader',
      query: {
        // presets: ['es2015', 'stage-3']
        presets: ['es2015', 'stage-3']
      }
    }],
  },
  devtool: 'inline-source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'test/browser'),
    headers: {
      "Access-Control-Allow-Origin": "http://www.nicovideo.jp",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-id, Content-Length, X-Requested-With",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    }
  }
};
