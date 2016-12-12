'use strict';

var assert = require('assert');
var videoSearch = require('../src/loader/VideoSearch.js');



describe('parseParams', function() {
  var search = new videoSearch.NicoSearchApiLoader();
  var params = {
    searchWord: 'hogehoge',
    searchType: 'tag',
    order: 'd',
    u: '3m',
    l: 'short'
  };
  var p = search.parseParams('fugafuga', params);

  console.log(JSON.stringify(p));
  assert.equal(p.query, 'fugafuga');
  assert.equal(p.search.length, 1);
  assert.equal(p.search[0], 'tags_exact');
  assert.equal(p.order, 'desc');
  assert.equal(p.size, 100);
  assert.equal(p.sort_by, 'last_comment_time', 'デフォルトはコメントの新しい順');


  params.sort = '_hot';
  p = search.parseParams('', params);
  //console.log(JSON.stringify(p));
  assert.equal(p.sort_by, '_hot');

  params.userId = '1234';
  p = search.parseParams('', params);
  //console.log(JSON.stringify(p));

});


describe('parseParamsV2', function() {
  const api = 'http://api.search.nicovideo.jp/api/v2/video/contents/search'
  let params = {
    searchWord: 'hogehoge',
    searchType: 'tag',
    order: 'd',
  };
  let query;
  query = new videoSearch.NicoSearchApiV2Query(params);

  console.log('\nquery v2', api + '?' + query.toString());
  assert.equal(query.q, 'hogehoge');
  assert.equal(query.targets.length, 1);
  assert.equal(query.targets[0], 'tagsExact');
  assert.equal(query.sort, '-lastCommentTime');

  params = {
    searchWord: 'fugafuga',
    searchType: 'tag',
    sort: '_hot'
  };

  query = new videoSearch.NicoSearchApiV2Query(params);
  console.log('\nquery v2', api + '?' + query.toString());


});
