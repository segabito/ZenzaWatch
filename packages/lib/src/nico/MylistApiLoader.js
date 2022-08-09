import {netUtil} from '../infra/netUtil';
import {CacheStorage} from '../infra/CacheStorage';
import {Emitter} from '../Emitter';
const emitter = new Emitter();
const ZenzaWatch = {emitter};
//===BEGIN===
const MylistApiLoader = (() => {
  // マイリスト/とりあえずマイリストの取得APIには
  // www.nicovideo.jp配下とflapi.nicovideo.jp配下の２種類がある
  // 他人のマイリストを取得するにはflapi、マイリストの編集にはwwwのapiが必要
  // データのフォーマットが微妙に異なるのでめんどくさい
  //
  // おかげでソート処理が悲しいことに
  //
  const CACHE_EXPIRE_TIME = 5 * 60 * 1000;
  const TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
  let cacheStorage = null;
  let token = '';


  if (ZenzaWatch) {
    emitter.on('csrfTokenUpdate', t => {
      token = t;
      if (cacheStorage) {
        cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
      }
    });
  }

  class MylistApiLoader {
    constructor() {
      if (!cacheStorage) {
        cacheStorage = new CacheStorage(sessionStorage);
      }
      if (!token) {
        token = cacheStorage.getItem('csrfToken');
        if (token) {
          console.log('cached token exists', token);
        }
      }
    }
    setCsrfToken(t) {
      token = t;
      if (cacheStorage) {
        cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
      }else{
        cacheStorage = new CacheStorage(sessionStorage);
        cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
      }
    }
    
    // どうにもトークンが取れなくなっていたので、専用の関数作成。
    // 一応、キャッシュもされている(はず)
    async _getCsrfToken(){

        if (!cacheStorage) {
            cacheStorage = new CacheStorage(sessionStorage);
        }
        
        token = cacheStorage.getItem('csrfToken');
        
        //キャッシュにあったらそこで返す
        if (token) {
            console.log('cached token exists', token);
        }else{
        
            //そもそもemit元からは取れる物がないんだから、
            //マイリストページからトークン持ってくるしかないでしょ
            const tokenUrl = 'https://www.nicovideo.jp/my/mylist';
            const result = await netUtil.fetch( tokenUrl, {
            cledentials: 'include'
            }).then(r => r.text()).catch(result => {
                throw new Error('マイリストトークン取得失敗', {result, status: 'fail'});
            });

            const dom = new DOMParser().parseFromString(result, 'text/html');
            const initUserpageDataContena = dom.querySelector('#js-initial-userpage-data');
            const env = JSON.parse(initUserpageDataContena.getAttribute('data-environment'));

            this.setCsrfToken(env.csrfToken); 
        }

        return token;

    }
    async _getDeflistItems(frontendId = 6, frontendVersion = 0) {
      const url = 'https://nvapi.nicovideo.jp/v1/users/me/watch-later?sortKey=addedAt&sortOrder=desc';
      const page = new URLSearchParams({ pageSize: 100, page: 1 });
      let data;

      do {
        // nvapi に X-Frontend-Id header が必要
        const res = await netUtil.fetch(`${url}&${page.toString()}`, {
          headers: {'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion},
          credentials: 'include'
        }).then(r => r.json())
          .catch(e => { throw new Error('とりあえずマイリストの取得失敗(2)', e); });
        if (res.meta.status !== 200 || !res.data.watchLater) {
          throw new Error('とりあえずマイリストの取得失敗(1)', res);
        }
        if (data == null) {
          data = res.data.watchLater;
        } else {
          data.hasInvisibleItems = data.hasInvisibleItems || res.data.watchLater.hasInvisibleItems;
          data.hasNext = res.data.watchLater.hasNext;
          data.items.concat(res.data.watchLater.items);
        }
        page.set('page', parseInt(page.get('page')) + 1);
      } while (data && data.hasNext);

      return data.items;
    }
    async _getMylistItems(id, frontendId = 6, frontendVersion = 0) {
      const url = `https://nvapi.nicovideo.jp/v1/users/me/mylists/${id}`;
      const page = new URLSearchParams({ pageSize: 100, page: 1 });
      let data;

      do {
        // nvapi に X-Frontend-Id header が必要
        const res = await netUtil.fetch(`${url}?${page.toString()}`, {
          headers: {'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion},
          credentials: 'include'
        }).then(r => r.json())
          .catch(e => { throw new Error('マイリスト取得失敗(2)', e); });
        if (res.meta.status !== 200 || !res.data.mylist) {
          throw new Error('マイリスト取得失敗(1)', res);
        }
        if (data == null) {
          data = res.data.mylist;
        } else {
          data.hasInvisibleItems = data.hasInvisibleItems || res.data.mylist.hasInvisibleItems;
          data.hasNext = res.data.mylist.hasNext;
          data.items.concat(res.data.mylist.items);
        }
        page.set('page', parseInt(page.get('page')) + 1);
      } while (data && data.hasNext);

      return data.items;
    }
    async getMylistList({ frontendId = 6, frontendVersion = 0 } = {}) {
      const url = 'https://nvapi.nicovideo.jp/v1/users/me/mylists';
      const cacheKey = 'mylistList';

      const cacheData = cacheStorage.getItem(cacheKey);
      if (cacheData) {
        return cacheData;
      }

      // nvapi に X-Frontend-Id header が必要
      const result = await netUtil.fetch(url, {
        headers: {'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion},
        credentials: 'include'
      }).then(r => r.json())
        .catch(e => { throw new Error('マイリスト一覧の取得失敗(2)', e); });
      if (result.meta.status !== 200 || !result.data.mylists) {
        throw new Error(`マイリスト一覧の取得失敗(1) ${result.status}${result.message}`, result);
      }

      const data = result.data.mylists;
      cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
      return data;
    }
    async findDeflistItemByWatchId(watchId) {
      const items = await this._getDeflistItems().catch(() => []);

      for (let item of items) {
        if (item.watchId === watchId) {
          return item;
        }
      }
      return Promise.reject();
    }
    async findMylistItemByWatchId(watchId, groupId) {
      const items = await this._getMylistItems(groupId).catch(() => []);

      for (let item of items) {
        if (item.watchId === watchId) {
          return item;
        }
      }
      return Promise.reject();
    }

    //nvapiに frontendId と frontendVersion の値が必要
    async removeDeflistItem(watchId, { frontendId = 6, frontendVersion = 0 } = {}) {
      const item = await this.findDeflistItemByWatchId(watchId).catch(result => {
        throw new Error('動画が見つかりません', {result, status: 'fail'});
      });

      const body = `itemIds=${item.itemId}`;
      const url = 'https://nvapi.nicovideo.jp/v1/users/me/watch-later?' + body;
      const cacheKey = 'deflistItems';

      const result = await netUtil.fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Frontend-Id': frontendId,
          'X-Frontend-Version': frontendVersion,
          'X-Request-With': 'https://www.nicovideo.jp'
        },
        credentials: 'include'
      }).then(r => r.json())
        .catch(result => {
          throw new Error('とりあえずマイリストから削除失敗(2)', { result, status: 'fail' });
        });

      if (result.meta.status && result.meta.status === 200) {
        cacheStorage.removeItem(cacheKey);
        emitter.emitAsync('deflistRemove', watchId);
        return {
          status: 'ok',
          result,
          message: 'とりあえずマイリストから削除'
        };
      }

      throw new Error(result.error.description, {
          status: 'fail', result, code: result.error.code
      });
    }

    //nvapiに frontendId と frontendVersion の値が必要
    async removeMylistItem(watchId, groupId, { frontendId = 6, frontendVersion = 0 } = {}) {
      const item = await this.findMylistItemByWatchId(watchId, groupId).catch(result => {
          throw new Error('動画が見つかりません', {result, status: 'fail'});
        });

      let body = 'itemIds=' + watchId;
      const url = 'https://nvapi.nicovideo.jp/v1/users/me/mylists/' + groupId + '/items?' + body;
      const cacheKey = `mylistItems: ${groupId}`;

      const result = await netUtil.fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Frontend-Id': frontendId,
          'X-Frontend-Version': frontendVersion,
          'X-Request-With': 'https://www.nicovideo.jp'
        },
        credentials: 'include'
      }).then(r => r.json())
        .catch(result => {
          throw new Error('マイリストから削除失敗(2)', {result, status: 'fail'});
        });

      if (result.meta.status && result.meta.status === 200) {
        cacheStorage.removeItem(cacheKey);
        emitter.emitAsync('mylistRemove', watchId, groupId);
        return {
          status: 'ok',
          result,
          message: 'マイリストから削除'
        };
      }

      throw new Error(result.error.description, {
        status: 'fail',
        result,
        code: result.error.code
      });
    }

    //nvapiに frontendId と frontendVersion の値が必要
    async addDeflistItem(watchId, description, isRetry = false, { frontendId = 6, frontendVersion = 0 } = {}) {
      let url = 'https://nvapi.nicovideo.jp/v1/users/me/watch-later';
      let body = `watchId=${watchId}&memo=`;
      if (description) {
        body += `${encodeURIComponent(description)}`;
      }
      let cacheKey = 'deflistItems';

      const result = await netUtil.fetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion, 'X-Request-With': 'https://www.nicovideo.jp' },
        credentials: 'include'
      }).then(r => r.json())
        .catch(err => {
            throw new Error('とりあえずマイリスト登録失敗(200)', {
              status: 'fail',
              result: err
            });
          });
      if (result.meta.status && ( result.meta.status === 200 || result.meta.status === 201 )) {
        cacheStorage.removeItem(cacheKey);
        emitter.emitAsync('deflistAdd', watchId, description);
        return {
          status: 'ok',
          result,
          message: 'とりあえずマイリスト登録'
        };
      }

      if (result.meta.status && result.meta.status === 409 && !isRetry) {
          /**
           すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
           例えば、とりマイの300番目に登録済みだった場合に「登録済みです」と言われても探すのがダルいし、
           他の動画を追加していけば、そのうち押し出されて消えてしまう。
           なので、重複時にエラーを出すのではなく、「消してから追加」することによって先頭に持ってくる。
           登録済みの場合、409が返ってくるようになったのでこちらで処理
           */
          await this.removeDeflistItem(watchId).catch(err => {
              throw new Error('とりあえずマイリスト登録失敗(101)', {
                status: 'fail',
                result: err.result,
                code: err.code
              });
            });
          const added = await this.addDeflistItem(watchId, description, true, {frontendId, frontendVersion});
          return {
            status: 'ok',
            result: added,
            message: 'とりあえずマイリストの先頭に移動'
          };
      }

      if (!result.meta.status || !result.error) { // result.errorが残っているかは不明
        throw new Error('とりあえずマイリスト登録失敗(100)', {
          status: 'fail',
          result,
        });
      }

        throw new Error(result.error.description, {
          status: 'fail',
          result,
          code: result.error.code,
          message: result.error.description
        });
    }

    //nvapiに frontendId と frontendVersion の値が必要
    async addMylistItem(watchId, groupId, description, { frontendId = 6, frontendVersion = 0 } = {}) {
      //const url = 'https://www.nicovideo.jp/api/mylist/add';
      let body = 'itemId=' + watchId + '&description=';//+ '&token=' + token + '&group_id=' + groupId;
      if (description) {
        body += encodeURIComponent(description);
      }
      const url = 'https://nvapi.nicovideo.jp/v1/users/me/mylists/' + groupId + '/items?' + body ;
      const cacheKey = `mylistItems: ${groupId}`;

      const result = await netUtil.fetch(url, {
        method: 'POST',
        body,
        headers: {  'Content-Type': 'application/x-www-form-urlencoded', 'X-Frontend-Id': frontendId, 'X-Frontend-Version': frontendVersion, 'X-Request-With': 'https://www.nicovideo.jp'},
        credentials: 'include'
      }).then(r => r.json())
        .catch(err => {
          throw new Error('マイリスト登録失敗(200)', {
            status: 'fail',
            result: err
          });
        });

      if (result.meta.status && ( result.meta.status === 200 || result.meta.status === 201 )) {
        cacheStorage.removeItem(cacheKey);
        // マイリストに登録したらとりあえずマイリストから除去(=移動)
        this.removeDeflistItem(watchId).catch(() => {});
        return {status: 'ok', result, message: 'マイリスト登録'};
      }

      if (!result.meta.status /*|| !result.error*/) {
        throw new Error('マイリスト登録失敗(100)', {status: 'fail', result});
      }

      // マイリストの場合は重複があっても「追加して削除」しない。
      // とりまいと違って押し出されることがないし、
      // シリーズ物が勝手に入れ替わっても困るため
      emitter.emitAsync('mylistAdd', watchId, groupId, description);

      throw new Error(result.error.description, {
          status: 'fail', result, code: result.error.code
      });
      
    }
  }

  return new MylistApiLoader();
})();

//===END===

export {MylistApiLoader};
