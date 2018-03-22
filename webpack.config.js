require('babel-core/register');
// require('@babel/register');
console.log('load webpack.config.js');
// hoge();
// export default {
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
};