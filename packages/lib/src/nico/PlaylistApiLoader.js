import {netUtil} from '../infra/netUtil';
import {CacheStorage} from '../infra/CacheStorage';

//===BEGIN===
const PlaylistApiLoader = (() => {
  const CACHE_EXPIRE_TIME = 5 * 60 * 1000;
  let cacheStorage = null;

  class PlaylistApiLoader {
    constructor() {
      if (!cacheStorage) {
        cacheStorage = new CacheStorage(sessionStorage);
      }
    }

    async load({ type, id, options }, { frontendId = 6, frontendVersion = 0 } = {}) {
      const { url, cacheKey } = ((type) => {
        switch (type) {
          case 'series':
            return this._buildSeriesURL(id);
          case 'user-uploaded':
            return this._buildUserUploadedURL(id, options);
          case 'mylist':
            return this._buildMylistURL(id, options);
          case 'watchlater':
            return this._buildWatchlaterURL(options);
          case 'search':
            return this._buildSearchURL(options);
          default:
            return {};
        }
      })(type);

      if (url === undefined || cacheKey === undefined) {
        throw new Error(`プレイリストの取得失敗(3) ${type}`);
      }

      // nvapi でソートされた結果をもらうのでそのままキャッシュする
      const cacheData = cacheStorage.getItem(cacheKey);
      if (cacheData) {
        return cacheData;
      }

      // nvapi に X-Frontend-Id header が必要
      const result = await netUtil.fetch(url, {
        headers: { 'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion },
        credentials: 'include',
      }).then(r => r.json())
        .catch(e => { throw new Error(`プレイリストの取得失敗(2) ${type}`, e); });

      if (result.meta.status !== 200 || !result.data.items) {
        throw new Error(`プレイリストの取得失敗(1) ${type}`, result);
      }

      const data = result.data.items;
      cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
      return data;
    }

    // 動画シリーズ
    // https://nvapi.nicovideo.jp/v1/playlist/series/${seriesId}?sortOrder=${sortOrder}&sortKey=${sortKey}
    _buildSeriesURL(seriesId) {
      return {
        url: `https://nvapi.nicovideo.jp/v1/playlist/series/${seriesId}`,
        cacheKey: `playlist; series: ${seriesId}`,
      };
    }

    // ユーザー投稿
    // https://nvapi.nicovideo.jp/v1/playlist/user-uploaded/${userId}?sortOrder=${sortOrder}&sortKey=${sortKey}
    _buildUserUploadedURL(userId, options = {}) {
      const query = new URLSearchParams(Object.assign({ sortOrder: 'asc', sortKey: 'registeredAt' }, options));
      return {
        url: `https://nvapi.nicovideo.jp/v1/playlist/user-uploaded/${userId}?${query.toString()}`,
        cacheKey: `playlist; user-uploaded: ${userId}, orderBy: ${query.get('sortKey')} ${query.get('sortOrder')}`,
      };
    }

    // マイリスト
    // https://nvapi.nicovideo.jp/v1/playlist/mylist/${mylistId}?sortOrder=${sortOrder}&sortKey=${sortKey}
    _buildMylistURL(mylistId, options = {}) {
      const query = new URLSearchParams(Object.assign({ sortOrder: 'asc', sortKey: 'registeredAt' }, options));
      return {
        url: `https://nvapi.nicovideo.jp/v1/playlist/mylist/${mylistId}?${query.toString()}`,
        cacheKey: `playlist; mylist: ${mylistId}, orderBy: ${query.get('sortKey')} ${query.get('sortOrder')}`,
      };
    }

    // 後で見る
    // https://nvapi.nicovideo.jp/v1/playlist/watch-later?sortOrder=${sortOrder}&sortKey=${sortKey}
    _buildWatchlaterURL(options = {}) {
      const query = new URLSearchParams(Object.assign({ sortOrder: 'asc', sortKey: 'registeredAt' }, options));
      return {
        url: `https://nvapi.nicovideo.jp/v1/playlist/watch-later?${query.toString()}`,
        cacheKey: `playlist; watchlater, orderBy: ${query.get('sortKey')} ${query.get('sortOrder')}`,
      };
    }

    // 検索
    // https://nvapi.nicovideo.jp/v1/playlist/search?sortOrder=${sortOrder}&sortKey=${sortKey}&keyword=${keyword}&pageSize=${pageSize}&page=${page}
    _buildSearchURL(options = {}) {
      const query = new URLSearchParams(Object.assign({ sortOrder: 'desc', sortKey: 'registeredAt' }, options));
      return {
        url: `https://nvapi.nicovideo.jp/v1/playlist/search?${query.toString()}`,
        cacheKey: `playlist; search, query: ${query.toString()}`,
      };
    }
  }

  return new PlaylistApiLoader();
})();

//===END===
