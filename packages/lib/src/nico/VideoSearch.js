import {CrossDomainGate} from '../infra/CrossDomainGate';
import {WindowMessageEmitter} from '../message/messageUtil';
import {textUtil} from '../text/textUtil';
import {sleep} from '../infra/sleep';
//===BEGIN===

const {NicoSearchApiV2Query, NicoSearchApiV2Loader} =
  (function () {
    // 参考: http://site.nicovideo.jp/search-api-docs/search.html
    // http://ch.nicovideo.jp/nico-lab/blomaga/ar930955
    // https://site.nicovideo.jp/search-api-docs/snapshot
    const BASE_URL = 'https://api.search.nicovideo.jp/api/v2/snapshot';
    const API_BASE_URL = `${BASE_URL}/video/contents/search`;
    const VERSION_URL = `${BASE_URL}/version`
    const MESSAGE_ORIGIN = 'https://api.search.nicovideo.jp/';
    const SORT = {
      f: 'startTime',
      v: 'viewCounter',
      r: 'commentCounter',
      m: 'mylistCounter',
      l: 'lengthSeconds',
      n: 'lastCommentTime',
      likeCount: 'likeCounter',
    };

    // 公式検索の日時指定パラメータ -1h -24h -1w -1m
    const F_RANGE = {
      U_1H: 4,
      U_24H: 1,
      U_1W: 2,
      U_30D: 3
    };

    // 公式検索の動画長指定パラメータ -5min 20min-
    const L_RANGE = {
      U_5MIN: 1,
      O_20MIN: 2
    };


    let gate;

    // なぜかv2はCORSがついてないのでCrossDomainGateの力を借りる
    let initializeCrossDomainGate = function () {
      initializeCrossDomainGate = function () {
      };
      gate = new CrossDomainGate({
        baseUrl: BASE_URL,
        origin: MESSAGE_ORIGIN,
        type: 'searchApi',
        messager: WindowMessageEmitter
      });
    };

    /**
     * 公式検索ページのqueryパラメータをv2用に変換するやつ＋α
     */
    class NicoSearchApiV2Query {

      constructor(word, params = {}) {
        if (word.searchWord) {
          this._initialize(word.searchWord, word);
        } else {
          this._initialize(word, params);
        }
      }

      get q() {
        return this._q;
      }

      get targets() {
        return this._targets;
      }

      get sort() {
        return this._sort;
      }

      get order() {
        return this._order;
      }

      get limit() {
        return this._limit;
      }

      get offset() {
        return this._offset;
      }

      get fields() {
        return this._fields;
      }

      get context() {
        return this._context;
      }

      get hotField() {
        return this._hotField;
      }

      get hotFrom() {
        return this._hotFrom;
      }

      get hotTo() {
        return this._hotTo;
      }

      _initialize(word, params) {
        if (params._now) {
          this.now = params._now;
        }
        const sortTable = SORT;
        this._filters = [];
        this._q = word || params.searchWord || 'ZenzaWatch';
        this._targets =
          params.searchType === 'tag' ?
            ['tagsExact'] : ['tagsExact', 'title', 'description'];
        this._sort =
          (params.order === 'd' ? '-' : '+') +
          (params.sort && sortTable[params.sort] ?
            sortTable[params.sort] : 'lastCommentTime');
        this._order = params.order === 'd' ? 'desc' : 'asc';
        this._limit = 100;
        this._offset = Math.min(
          params.page ? Math.max(parseInt(params.page, 10) - 1, 0) * 25 : 0,
          1600
        );
        this._fields = [
          'contentId', 'title', 'description', 'tags', 'categoryTags',
          'viewCounter', 'commentCounter', 'mylistCounter', 'likeCounter',
          'lengthSeconds', 'startTime', 'thumbnailUrl'
        ];
        this._context = 'ZenzaWatch';

        const n = new Date(), now = this.now;
        if (/^._hot/.test(this.sort)) {
          // 人気が高い順ソート
          (() => {
            this._hotField = 'mylistCounter';
            this._hotFrom = new Date(now - 1 * 24 * 60 * 60 * 1000);
            this._hotTo = n;

            this._sort = '-_hotMylistCounter';
          })();
        }

        if (params.f_range &&
          [F_RANGE.U_1H, F_RANGE.U_24H, F_RANGE.U_1W, F_RANGE.U_30D]
            .includes(params.f_range * 1)) {
          this._filters.push(this._buildFRangeFilter(params.f_range * 1));
        }
        if (params.l_range &&
          [L_RANGE.U_5MIN, L_RANGE.O_20MIN].includes(params.l_range * 1)) {
          this._filters.push(this._buildLRangeFilter(params.l_range * 1));
        }
        if (params.userId && (params.userId + '').match(/^\d+$/)) {
          this._filters.push({type: 'equal', field: 'userId', value: params.userId * 1});
        }
        if (params.channelId && (params.channelId + '').match(/^\d+$/)) {
          this._filters.push({type: 'equal', field: 'channelId', value: params.channelId * 1});
        }
        if (params.commentCount && (params.commentCount + '').match(/^[0-9]+$/)) {
          this._filters.push({
            type: 'range',
            field: 'commentCounter',
            from: params.commentCount * 1
          });
        }
        if (params.utimeFrom || params.utimeTo) {
          this._filters.push(this._buildStartTimeRangeFilter({
            from: params.utimeFrom ? params.utimeFrom * 1 : 0,
            to: params.utimeTo ? params.utimeTo * 1 : now
          }));
        }
        if (params.dateFrom || params.dateTo) {
          this._filters.push(this._buildStartTimeRangeFilter({
            from: params.dateFrom ? (new Date(params.dateFrom)).getTime() : 0,
            to: params.dateTo ? (new Date(params.dateTo)).getTime() : now
          }));
        }
        // 公式検索ページの日付指定
        const dateReg = /^\d{4}-\d{2}-\d{2}$/;
        if (dateReg.test(params.start) && dateReg.test(params.end)) {
          this._filters.push(this._buildStartTimeRangeFilter({
            from: (new Date(params.start)).getTime(),
            to: (new Date(params.end)).getTime()
          }));
        }
      }

      get stringfiedFilters() {
        if (this._filters.length < 1) {
          return '';
        }
        const result = [];
        const TIMEFIELDS = ['startTime'];
        this._filters.forEach((filter) => {
          let isTimeField = TIMEFIELDS.includes(filter.field);
          if (!filter) {
            return;
          }

          if (filter.type === 'equal') {
            result.push(`filters[${filter.field}][0]=${filter.value}`);
          } else if (filter.type === 'range') {
            let from = isTimeField ? this._formatDate(filter.from) : filter.from;
            if (filter.from) {
              result.push(`filters[${filter.field}][gte]=${from}`);
            }
            if (filter.to) {
              let to = isTimeField ? this._formatDate(filter.to) : filter.to;
              result.push(`filters[${filter.field}][lte]=${to}`);
            }
          }
        });
        return result.join('&');
      }

      get filters() {
        return this._filters;
      }

      _formatDate(time) {
        const dt = new Date(time);
        return dt.toISOString().replace(/\.\d*Z/, '') + '%2b00:00'; // '%2b00:00'
      }

      _buildStartTimeRangeFilter({from = 0, to}) {
        const range = {field: 'startTime', type: 'range'};
        if (from !== undefined && to !== undefined) {
          [from, to] = [from, to].sort(); // from < to になるように
        }
        if (from !== undefined) {
          range.from = from;
        }
        if (to !== undefined) {
          range.to = to;
        }
        return range;
      }

      _buildLengthSecondsRangeFilter({from, to}) {
        const range = {field: 'lengthSeconds', type: 'range'};
        if (from !== undefined && to !== undefined) {
          [from, to] = [from, to].sort(); // from < to になるように
        }
        if (from !== undefined) {
          range.from = from;
        }
        if (to !== undefined) {
          range.to = to;
        }
        return range;
      }

      _buildFRangeFilter(range) {
        const now = this.now;
        switch (range * 1) {
          case F_RANGE.U_1H:
            return this._buildStartTimeRangeFilter({
              from: now - 1000 * 60 * 60,
              to: now
            });
          case F_RANGE.U_24H:
            return this._buildStartTimeRangeFilter({
              from: now - 1000 * 60 * 60 * 24,
              to: now
            });
          case F_RANGE.U_1W:
            return this._buildStartTimeRangeFilter({
              from: now - 1000 * 60 * 60 * 24 * 7,
              to: now
            });
          case F_RANGE.U_30D:
            return this._buildStartTimeRangeFilter({
              from: now - 1000 * 60 * 60 * 24 * 30,
              to: now
            });
          default:
            return null;
        }
      }

      _buildLRangeFilter(range) {
        switch (range) {
          case L_RANGE.U_5MIN:
            return this._buildLengthSecondsRangeFilter({
              from: 0,
              to: 60 * 5
            });
          case L_RANGE.O_20MIN:
            return this._buildLengthSecondsRangeFilter({
              from: 60 * 20
            });
        }
      }

      toString() {
        const result = [];
        result.push('q=' + encodeURIComponent(this._q));
        result.push('targets=' + this.targets.join(','));
        result.push('fields=' + this.fields.join(','));

        result.push('_sort=' + encodeURIComponent(this.sort));
        result.push('_limit=' + this.limit);
        result.push('_offset=' + this.offset);
        result.push('_context=' + this.context);

        if (this.sort === '-_hot') {
          result.push('hotField=' + this.hotField);
          result.push('hotFrom=' + this.hotFrom);
          result.push('hotTo=' + this.hotTo);
        }

        const filters = this.stringfiedFilters;
        if (filters) {
          result.push(filters);
        }

        return result.join('&');
      }

      set now(v) {
        this._now = v;
      }

      get now() {
        return this._now || Date.now();
      }

    }

    NicoSearchApiV2Query.SORT = SORT;
    NicoSearchApiV2Query.F_RANGE = F_RANGE;
    NicoSearchApiV2Query.L_RANGE = L_RANGE;

    class NicoSearchApiV2Version {
      constructor() {
        this.date = this.lastUpdate = this._baseDate;
      }

      get isLatest() {
        return (this.date - this._baseDate) > 0;
      }

      async update() {
        const now = Date.now();
        if (now - this.lastUpdate <= 1000 * 60 * 5) {
          return this.date;
        }
        initializeCrossDomainGate();
        const res =  await gate.fetch(VERSION_URL);
        const body = await res.json();
        this.date = new Date(body.last_modified);
        this.lastUpdate = new Date(res.headers.get('Date') ?? now);
        return this.date;
      }

      // スナップショット検索は日本時間5時の時点のデータなので、UTCの20時を取る
      get _baseDate() {
        let now = new Date();
        return now.setUTCHours(now.getUTCHours() >= 20 ? 20 : -4, 0, 0);
      }
    }

    class NicoSearchApiV2Loader {
      static version = new NicoSearchApiV2Version;
      static cacheStorage;
      static CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

      static async search(word, params) {
        initializeCrossDomainGate();
        const query = new NicoSearchApiV2Query(word, params);
        const url = API_BASE_URL + '?' + query.toString();
        const version = this.version.isLatest
          ? this.version.date.getTime()
          : await this.version.update().then(date => date.getTime());

        if (!this.cacheStorage) {
          this.cacheStorage = new CacheStorage(sessionStorage);
        }
        const cacheKey = `search: ${[
          `words:${query.q}`,
          `targets:${query.targets.join(',')}`,
          `sort:${query.sort}`,
          `filters:${query.stringfiedFilters}`,
          `offset:${query.offset}`,
        ].join(', ')}`;
        const cacheData = this.cacheStorage.getItem(cacheKey);
        if (cacheData && cacheData.version === version) {
          return cacheData.data;
        }

        return gate.fetch(url).then(res => res.text()).then(result => {
          result = NicoSearchApiV2Loader.parseResult(result);
          if (typeof result !== 'number' && result.status === 'ok') {
            let data = Object.assign(result, {word, params});
            this.cacheStorage.setItem(cacheKey, {data, version}, this.CACHE_EXPIRE_TIME);
            return Promise.resolve(data);
          } else {
            let description;
            switch (result) {
              default:
                description = 'UNKNOWN ERROR';
                break;
              case 400:
                description = 'INVALID QUERY';
                break;
              case 500:
                description = 'INTERNAL SERVER ERROR';
                break;
              case 503:
                description = 'MAINTENANCE';
                break;
            }
            return Promise.reject({
              status: 'fail',
              description
            });
          }
        });
      }

      /**
       * 100件以上検索する用
       */
      static async searchMore(word, params, maxLimit = 300) {

        const ONCE_LIMIT = 100; // 一回で取れる件数
        const PER_PAGE = 25; // 検索ページで1ページあたりに表示される件数
        const MAX_PAGE = 64; // 25 * 64 = 1600

        const result = await NicoSearchApiV2Loader.search(word, params);

        const currentPage = params.page ? parseInt(params.page, 10) : 1;
        const currentOffset = (currentPage - 1) * PER_PAGE;

        if (result.count <= ONCE_LIMIT) {
          return result;
        }

        const searchCount = Math.min(
          Math.ceil((result.count - currentOffset) / PER_PAGE) - 1,
          Math.ceil((maxLimit - ONCE_LIMIT) / ONCE_LIMIT)
        );

        //// TODO: 途中で失敗したらそこまででもいいので返す？
        for (let i = 1; i <= searchCount; i++) {
          await sleep(300 * i);
          let page = currentPage + i * (ONCE_LIMIT / PER_PAGE);
          console.log('searchNext: "%s"', word, page, params);
          let res = await NicoSearchApiV2Loader.search(word, Object.assign(params, {page}));
          if (res && res.list && res.list.length) {
            result.list = result.list.concat(res.list);
          } else {
            break;
          }
        }
        return Object.assign(result, {word, params});
      }

      static _jsonParse(result) {
        try {
          return JSON.parse(result);
        } catch (e) {
          window.console.error('JSON parse error', e);
          return null;
        }
      }

      static parseResult(jsonText) {
        const data = NicoSearchApiV2Loader._jsonParse(jsonText);
        if (!data) {
          return 0;
        }
        const status = data.meta.status;
        const result = {
          status: status === 200 ? 'ok' : 'fail',
          count: data.meta.totalCount,
          list: []
        };
        if (status !== 200) {
          return status;
        }
        const midThumbnailThreshold = 23608629; // .Mのついた最小ID?
        data.data.forEach(item => {
          let description = item.description ? item.description.replace(/<.*?>/g, '') : '';
          if (item.thumbnailUrl.indexOf('.M') >= 0) {
            item.thumbnail_url = item.thumbnail_url.replace(/\.M$/, '');
            item.is_middle_thumbnail = true;
          } else if (item.thumbnailUrl.indexOf('.M') < 0 &&
            item.contentId.indexOf('sm') === 0) {
            let _id = parseInt(item.contentId.substring(2), 10);
            if (_id >= midThumbnailThreshold) {
              item.is_middle_thumbnail = true;
            }
          }
          const dt = textUtil.dateToString(new Date(item.startTime));

          result.list.push({
            id: item.contentId,
            type: 0, // 0 = VIDEO,
            length: item.lengthSeconds ?
              Math.floor(item.lengthSeconds / 60) + ':' +
              (item.lengthSeconds % 60 + 100).toString().substring(1) : '',
            mylist_counter: item.mylistCounter,
            view_counter: item.viewCounter,
            num_res: item.commentCounter,
            first_retrieve: dt,
            create_time: dt,
            thumbnail_url: item.thumbnailUrl,
            title: item.title,
            description_short: description.substring(0, 150),
            description_full: description,
            length_seconds: item.lengthSeconds,
            //last_res_body:     item.lastResBody,
            is_middle_thumbnail: item.is_middle_thumbnail
          });
        });
        return result;
      }
    }

    return {NicoSearchApiV2Query, NicoSearchApiV2Loader};
  })();
//===END===


export {
  NicoSearchApiV2Query,
  NicoSearchApiV2Loader
};

