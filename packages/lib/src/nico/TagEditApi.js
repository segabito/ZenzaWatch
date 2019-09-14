import {util} from '../../../../src/util';

//===BEGIN===

class TagEditApi {

  load(videoId) {
    const url = `/tag_edit/${videoId}/?res_type=json&cmd=tags&_=${Date.now()}`;
    return this._fetch(url, {credentials: 'include'});
  }

  add({videoId, tag, csrfToken, watchAuthKey, ownerLock = 0}) {
    const url = `/tag_edit/${videoId}/`;

    const body = this._buildQuery({
      cmd: 'add',
      tag,
      id: '',
      token: csrfToken,
      watch_auth_key: watchAuthKey,
      owner_lock: ownerLock,
      res_type: 'json'
    });

    const options = {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body
    };

    return this._fetch(url, options);
  }

  remove({videoId, tag = '', id, csrfToken, watchAuthKey, ownerLock = 0}) {
    const url = `/tag_edit/${videoId}/`;

    const body = this._buildQuery({
      cmd: 'remove',
      tag, // いらないかも
      id,
      token: csrfToken,
      watch_auth_key: watchAuthKey,
      owner_lock: ownerLock,
      res_type: 'json'
    });

    const options = {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body
    };

    return this._fetch(url, options);
  }

  _buildQuery(params) {
    const t = [];
    Object.keys(params).forEach(key => {
      t.push(`${key}=${encodeURIComponent(params[key])}`);
    });
    return t.join('&');
  }

  _fetch(url, options) {
    return util.fetch(url, options).then(result => {
      return result.json();
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
