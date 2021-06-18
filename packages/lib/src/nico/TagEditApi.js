import {util} from '../../../../src/util';
//===BEGIN===

class TagEditApi {

  load(videoId) {

    const url = `https://nvapi.nicovideo.jp/v1/videos/${videoId}/tags?_language=ja-jp`;
    //const url = `/tag_edit/${videoId}/?res_type=json&cmd=tags&_=${Date.now()}`;
    const options = {
      method: 'GET',
      credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Frontend-Id': 6, 'X-Frontend-Version': 0, 'X-Request-With': 'https://www.nicovideo.jp' }
    };
    return this._fetch(url, options).then(result => {
      return result.data;
    }).catch(result => {
      throw new Error('タグ一覧の取得失敗', {result, status: 'fail'});
    });
  }

  async add({videoId, tag, csrfToken, watchAuthKey, ownerLock = 0}) {


    const encodedTag = encodeURIComponent(tag);
    const url = `https://nvapi.nicovideo.jp/v1/videos/${videoId}/tags?_language=ja-jp&tag=${encodedTag}`;
    //const url = `/tag_edit/${videoId}/`;
/*
    const body = this._buildQuery({
      cmd: 'add',
      tag,
      id: '',
      token: csrfToken,
      watch_auth_key: watchAuthKey,
      owner_lock: ownerLock,
      res_type: 'json'
    });
*/
    const options = {
      method: 'POST',
      credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Frontend-Id': 6, 'X-Frontend-Version': 0, 'X-Request-With': 'https://www.nicovideo.jp' }
    };

    return await this._fetch(url, options).then(result => {
      return result.data;
    }).catch(result => {
      throw new Error('タグの追加失敗', {result, status: 'fail'});
    });

    //return await this.load(videoId);
  }

  async remove({videoId, tag = '', id, csrfToken, watchAuthKey, ownerLock = 0}) {

    const encodedTag = encodeURIComponent(tag);
    const url = `https://nvapi.nicovideo.jp/v1/videos/${videoId}/tags?_language=ja-jp&tag=${encodedTag}`;


    //const url = `/tag_edit/${videoId}/`;
/*
    const body = this._buildQuery({
      cmd: 'remove',
      tag, // いらないかも →というかこれだけ必要というか
      id,
      token: csrfToken,
      watch_auth_key: watchAuthKey,
      owner_lock: ownerLock,
      res_type: 'json'
    });
*/
    const options = {
      method: 'DELETE',
      credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Frontend-Id': 6, 'X-Frontend-Version': 0, 'X-Request-With': 'https://www.nicovideo.jp' }
      
    };

    return await this._fetch(url, options).then(result => {
      return result.data;
    }).catch(result => {
      throw new Error('タグの削除失敗', {result, status: 'fail'});
    });
    //return await this.load(videoId);
    
  }

  _buildQuery(params) {
    const t = [];
    Object.keys(params).forEach(key => {
      t.push(`${key}=${encodeURIComponent(params[key])}`);
    });
    return t.join('&');
  }

  async _fetch(url, options) {
    return await util.fetch(url, options).then(result => {
      return result.json();
    }).catch(result => {
      throw new Error('タグ一覧の取得失敗', {result, status: 'fail'});
    });
  }
}

//===END===
//
export {
  TagEditApi
};


/**

 // タグ一覧取得
 //www.nicovideo.jp/tag_edit/smXXXXXX/?res_type=json&cmd=tags

 { "is_owner": true,
   "is_uneditable_tag": false,
   "tags": [
     // can_cat カテゴリタグにできるか？ cat カテゴリタグか？ dic 大百科があるか？
     {"id": "11111", "tag": "aaa", "owner_lock": 0, "can_cat": false, "cat": null, "dic": true},
     {"id": "22222", "tag": "bbb", "owner_lock": 0, "can_cat": false, "cat": null, "dic": true},
     {"id": "33333", "tag": "ccc", "owner_lock": 0, "can_cat": false, "cat": null, "dic": true},
     {"id": "44444", "tag": "ddd", "owner_lock": 0, "can_cat": false, "cat": null, "dic": true},
     {"id": "55555", "tag": "eee", "owner_lock": 0, "can_cat": false, "cat": null}
   ],
   "status":"ok"
 }

 // タグ追加 レスポンスは一覧取得と同じ
 // URL: http://www.nicovideo.jp/tag_edit/smXXXXXX/
 // request POST
 res_type: json
 cmd: add
 tag: aaa bbb ccc ddd eee
 id: '' 空文字でよさそう
 token: CSRF_TOKEN
 watch_auth_key: WATCH_AUTH_KEY,
 owner_lock:1 ????

 // タグ削除
 res_type: json
 cmd: remove
 tag: eee
 id: 55555  // 削除するタグのID
 token: CSRF_TOKEN
 watch_auth_key: WATCH_AUTH_KEY,
 owner_lock: 1 ????


 // 編集系のエラー時は、statusがfailになるのとerror_msgが入っている以外は同じ 失敗でもタグ一覧は入っている
 { "is_owner":true,
   "is_uneditable_tag":false,
   "error_msg":"エラーメッセージ内容",
   "tags":[], // タグ一覧
   "status":"fail"
 }
 */
