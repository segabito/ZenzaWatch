import assert from 'power-assert';
import {NicoSearchApiV2Query} from '../../src/loader/VideoSearch';
const {F_RANGE, L_RANGE} = NicoSearchApiV2Query;

describe('Video Search API v2', () => {
  let baseParams = {
    searchWord: 'hogehoge',
    searchType: 'tag',
    order: 'd',
  };

  const NOW = Date.now();
  const create = (params) => {
    let query = new NicoSearchApiV2Query(Object.assign(params, {'_now': NOW}));
    return query;
  };

  describe('基本パース', () => {
    let params = Object.assign({}, baseParams);
    let query = new NicoSearchApiV2Query(params);

    assert.equal(query.q, 'hogehoge');
    assert.equal(query.targets.length, 1);
    assert.equal(query.targets[0], 'tagsExact');
    assert.equal(query.sort, '-lastCommentTime');

    params = {
      searchWord: 'fugafuga',
      searchType: 'tag',
      sort: '_hot'
    };

    query = new NicoSearchApiV2Query(params);
  });

  describe('user指定対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    query = create(Object.assign(params, {userId: 1234}));
    filters = query.filters;
    assert.equal(filters[0].field, 'userId');
    assert.equal(filters[0].type,  'equal');
    assert.equal(typeof filters[0].value, 'number');
    assert.equal(filters[0].value, 1234);
  });

  describe('channel指定対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    query = create(Object.assign(params, {channelId: '2525'}));
    filters = query.filters;
    assert.equal(filters[0].field, 'channelId');
    assert.equal(filters[0].type,  'equal');
    assert.equal(typeof filters[0].value, 'number');
    assert.equal(filters[0].value, 2525);
  });

  describe('コメント数指定対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    query = create(Object.assign(params, {commentCount: 12345}));
    filters = query.filters;
    assert.equal(filters[0].field, 'commentCounter');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from,  12345);
  });

  describe('投稿日時指定対応(utime)', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    let from = new Date('2007-03-06').getTime();
    let to   = new Date('2017-03-06').getTime();
    query = create(Object.assign(params, {utimeFrom: from, utimeTo: to}));
    filters = query.filters;
    assert.equal(filters[0].field, 'startTime');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from, from);
    assert.equal(filters[0].to,   to);

    query = create(Object.assign(params, {utimeFrom: to, utimeTo: from}));
    assert.equal(filters[0].from, from, 'from > toの時は入れ替わる');
    assert.equal(filters[0].to,   to  , 'from > toの時は入れ替わる');

  });

  describe('投稿日時指定対応(date)', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    let from = new Date('2007-03-06');
    let to   = new Date('2017-03-06');
    query = create(Object.assign(params, {dateFrom: from, dateTo: to}));
    filters = query.filters;
    assert.equal(filters[0].field, 'startTime');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from, from.getTime());
    assert.equal(filters[0].to,   to.getTime());
  });

  describe('公式検索ページの f_range対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    query = create(Object.assign(params, {f_range: F_RANGE.U_1H}));
    filters = query.filters;
    assert.equal(filters[0].field, 'startTime');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from, NOW - 1000 * 60 * 60);

    query = create(Object.assign(params, {f_range: F_RANGE.U_24H}));
    filters = query.filters;
    assert.equal(filters[0].from, NOW - 1000 * 60 * 60 * 24);

    query = create(Object.assign(params, {f_range: F_RANGE.U_1W}));
    filters = query.filters;
    assert.equal(filters[0].from, NOW - 1000 * 60 * 60 * 24 * 7);

    query = create(Object.assign(params, {f_range: F_RANGE.U_30D}));
    filters = query.filters;
    assert.equal(filters[0].from, NOW - 1000 * 60 * 60 * 24 * 30);
  });

  describe('公式検索ページの l_range対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    query = create(Object.assign(params, {l_range: L_RANGE.U_5MIN}));
    filters = query.filters;
    assert.equal(filters[0].field, 'lengthSeconds');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from, 0);
    assert.equal(filters[0].to, 60 * 5);

    query = create(Object.assign(params, {l_range: L_RANGE.O_20MIN}));
    filters = query.filters;
    assert.equal(filters[0].from, 60 * 20);
  });

  describe('公式検索ページの 日付指定対応', () => {
    let params = Object.assign({}, baseParams);
    let query, filters;

    let start = '2007-03-06';
    let end   = '2017-03-06';
    query = create(Object.assign(params, {start, end}));
    filters = query.filters;
    console.log(filters);
    assert.equal(filters[0].field, 'startTime');
    assert.equal(filters[0].type,  'range');
    assert.equal(filters[0].from, (new Date(start)).getTime());
    assert.equal(filters[0].to,   (new Date(end)).getTime());
  });


});
