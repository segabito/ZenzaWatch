import {util} from '../util';
import {ZenzaWatch} from '../ZenzaWatchIndex';
import {PopupMessage} from '../util';
import {Emitter} from '../baselib';
import jsdom from 'jsdom';
import {Sleep} from '../util';

const JSDOM = jsdom.JSDOM;

//===BEGIN===

const {ThreadLoader} = (() => {
  // const VERSION_OLD = '20061206';
  const VERSION     = '20090904';

  const LANG_CODE = {
    'en_us': 1,
    'zh_tw': 2
  };

  class ThreadLoader extends Emitter {

    constructor() {
      super();
      this._threadKeys = {};
    }

    /**
     * 動画の長さに応じて取得するコメント数を変える
     * 本家よりちょっと盛ってる
     */
    getRequestCountByDuration(duration) {
      if (duration < 60)  { return 100; }
      if (duration < 240) { return 200; }
      if (duration < 300) { return 400; }
      return 1000;
    }

    getThreadKey(threadId, language = '', options = {}) {
      let url = `http://flapi.nicovideo.jp/api/getthreadkey?thread=${threadId}`;
      let langCode = this.getLangCode(language);
      if (langCode) { url = `${url}&language_id=${langCode}`; }

      let headers = options.cookie ? {Cookie: options.cookie} : {};
      return util.fetch(url, {
        method: 'post',
        dataType: 'text',
        headers,
        credentials: 'include'
      }).then(res => res.text()).then(e => {
        let result = util.parseQuery(e);
        this._threadKeys[threadId] = result;
        return result;
      }).catch(result => {
        return Promise.reject({
          result: result,
          message: `ThreadKeyの取得失敗 ${threadId}`
        });
      });
    }

    getWaybackKey(threadId, language = '', options = {}) {
      let url = `http://flapi.nicovideo.jp/api/getwaybackkey?thread=${threadId}`;
      let langCode = this.getLangCode(language);
      if (langCode) { url = `${url}&language_id=${langCode}`; }

      let headers = options.cookie ? {Cookie: options.cookie} : {};
      return util.fetch(url, {
        method: 'post',
        dataType: 'text',
        headers,
        credentials: 'include'
      }).then(res => res.text()).then(e => {
        let result = util.parseQuery(e);
        return result;
      }).catch(result => {
        return Promise.reject({
          result: result,
          message: `WaybackKeyの取得失敗 ${threadId} `
        });
      });
    }

    getLangCode(language = '') {
      language = language.replace('-', '_').toLowerCase();
      if (LANG_CODE[language]) {
        return LANG_CODE[language];
      }
      return 0;
    }

    getPostKey(threadId, blockNo, options = {}) {
      let url =
        `http://flapi.nicovideo.jp/api/getpostkey?device=1&thread=${threadId}&block_no=${blockNo}&version=1&version_sub=2&yugi=`;

      console.log('getPostkey url: ', url);
      let headers = options.cookie ? {Cookie: options.cookie} : {};
      return util.fetch(url, {
        method: 'post',
        dataType: 'text',
        headers,
        credentials: 'include'
      }).then(res => res.text()).then(e => {
        return util.parseQuery(e);
      }).catch(result => {
        return Promise.reject({
          result,
          message: `PostKeyの取得失敗 ${threadId}`
        });
      });
    }

    buildPacketData(msgInfo, options = {}) {
      let packets = [];
      const resCount = this.getRequestCountByDuration(msgInfo.duration);
      const leafContent = `0-${Math.floor(msgInfo.duration / 60) + 1}:100,${resCount}`;
      const language = this.getLangCode(msgInfo.language);

      msgInfo.threads.forEach(thread => {
        window.console.log('buildPacketData.threads', thread);
        if (!thread.isActive) { return; }
        
        let t = {
          thread: thread.id.toString(),
          user_id: msgInfo.userId > 0 ? msgInfo.userId.toString() : '', // 0の時は空文字
          language,
          nicoru: 0,
          scores: 1
        };
        if (thread.isThreadkeyRequired) {
          t.threadkey = msgInfo.threadKey[thread.id].key;
          t.force_184 = msgInfo.threadKey[thread.id].force184 ? '1' : '0';
        }
        if (msgInfo.when > 0 && msgInfo.waybackKey[thread.id]) {
          t.waybackkey = msgInfo.waybackKey[thread.id].key || '';
        }
        if (msgInfo.when > 0) {
          t.when = msgInfo.when;
        }
        if (thread.fork) {
          t.fork = thread.fork;
        }
        if (options.resFrom > 0) {
          t.res_from = options.resFrom;
        }
        // threadkeyかwaybackkeyがある場合にuserkeyをつけるとエラー。いらないなら無視すりゃいいだろが
        if (!t.threadkey && !t.waybackkey && msgInfo.userKey) {
          t.userkey = msgInfo.userKey;
        }
        packets.push({thread:        Object.assign({with_blobal: 1, version: VERSION}, t)});
        packets.push({thread_leaves: Object.assign({content: leafContent}, t)});
      });
      return packets;
    }

    buildPacket(msgInfo, options = {}) {
      let packet = document.createElement('packet');
      let data = this.buildPacketData(msgInfo);
      window.console.log('packetData', data);
      if (options.format !== 'xml') {
        return JSON.stringify(data);
      }
      data.forEach(d => {
        let t = document.createElement(d.thread ? 'thread' : 'thread_leaves');
        let thread = d.thread ? d.thread : d.thread_leaves;
        Object.keys(thread).forEach(attr => {
          if (attr === 'content') {
            t.textContent = thread[attr];
            return;
          }
          t.setAttribute(attr, thread[attr]);
        });
        packet.appendChild(t);
      });
      return packet.outerHTML;
    }

    _post(server, body, options = {}) {
      let url = server;
      return util.fetch(url, {
        method: 'POST',
        dataType: 'text',
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8'
        },
        body: body
      }).then(res => {
        if (options.format !== 'xml') {
          return res.json();
        }
        return res.text().then(text => {
          if (DOMParser) {
            return new DOMParser().parseFromString(text, 'application/xml');
          }
          return (new JSDOM(text)).window.document;
        });
      }).catch(result => {
        return Promise.reject({
          result,
          message: `コメントの通信失敗 server: ${server}`
        });
      });
    }

    _load(msgInfo, options = {}) {
      let packet;
      let language = msgInfo.language;
      msgInfo.threadKey = msgInfo.threadKey || {};
      msgInfo.waybackKey = msgInfo.waybackKey || {};
      const loadThreadKey = threadId => {
        if (msgInfo.threadKey[threadId]) { return; }
        msgInfo.threadKey[threadId] = {};
        return this.getThreadKey(threadId, language, options).then(info => {
          console.log('threadKey: ', threadId, info);
          msgInfo.threadKey[threadId] = {key: info.threadkey, force184: info.force_184};
        });
      };

      const loadThreadKeys = () => {
        return Promise.all(msgInfo.threads.filter(t => t.isThreadkeyRequired).map(t => loadThreadKey(t.id)));
      };

      const loadWaybackKey = threadId => {
        if (msgInfo.waybackKey[threadId]) { return; }
        msgInfo.waybackKey[threadId] = {};
        return this.getWaybackKey(threadId, language, options).then(info => {
          console.log('waybackKey: ', threadId, info);
          msgInfo.waybackKey[threadId] = {key: info.waybackkey};
        });
      };

      const loadWaybackKeys = () => {
        if (!msgInfo.when) {
          return Promise.resolve();
        }
        return Promise.all(msgInfo.threads.map(t => loadWaybackKey(t.id)));
      };

      return Promise.all([loadThreadKeys(), loadWaybackKeys()]).then(() => {
        let format = options.format === 'xml' ? 'xml' : 'json';
        let server = format === 'json' ? msgInfo.server.replace('/api/', '/api.json/') : msgInfo.server;
        packet = this.buildPacket(msgInfo, format);

        console.log('post packet...', server, packet);
        return this._post(server, packet, format);
      });

    }

    load(msgInfo, options = {}) {
      const server   = msgInfo.server;
      const threadId = msgInfo.threadId;
      const userId   = msgInfo.userId;

      const timeKey = `loadComment server: ${server} thread: ${threadId}`;
      console.time(timeKey);

      const onSuccess = result => {
        console.timeEnd(timeKey);
        ZenzaWatch.debug.lastMessageServerResult = result;

        let format = 'array';
        let thread, lastRes = 0, totalResCount = 0;
        let resultCode = null;
        msgInfo.threadInfo = {};
        try {
          let threads = result.filter(t => t.thread).map(t => t.thread);
          let lastId = null;
          Array.from(threads).forEach(t => {
            let id = parseInt(t.thread, 10);
            if (lastId === id) {
              return;
            }
            lastId = id;
            msgInfo[id] = thread;
            if (parseInt(id, 10) === parseInt(threadId, 10)) {
              thread = t;
              resultCode = t.resultcode;
            }
            let lr = parseInt(t.last_res, 10);
            if (!isNaN(lr)) {
              totalResCount += lr;
              lastRes = Math.max(lastRes, lr);
            }
          });
        } catch (e) {
          console.error(e);
        }

        if (resultCode !== 0) {
          console.log('comment fail:\n', result);
          return Promise.reject({
            message: `コメント取得失敗[${resultCode}]`
          });
        }

        let threadInfo = {
          server,
          userId,
          resultCode,
          threadId,
          thread:     thread.thread,
          serverTime: thread.server_time,
          lastRes,
          totalResCount,
          blockNo:    Math.floor((lastRes + 1) / 100),
          ticket:     thread.ticket || '0',
          revision:   thread.revision,
          language:   msgInfo.language,
          when:       msgInfo.when,
          isWaybackMode: !!msgInfo.when
        };

        console.log('threadInfo: ', threadInfo);
        return Promise.resolve({resultCode, threadInfo, body: result, format});
      };

      const onFailFinally = e => {
        console.timeEnd(timeKey);
        window.console.error('loadComment fail finally: ', e);
        return Promise.reject({
          message: 'コメントサーバーの通信失敗: ' + server
        });
      };

      const onFail1st = e => {
        console.timeEnd(timeKey);
        window.console.error('loadComment fail 1st: ', e);
        PopupMessage.alert('コメントの取得失敗: 3秒後にリトライ');

        return new Sleep(3000).then(() => this._load(msgInfo, options).then(onSuccess).catch(onFailFinally));
      };

      return this._load(msgInfo, options).then(onSuccess).catch(onFail1st);
    }

    _postChat(threadInfo, postKey, text, cmd, vpos) {
      let packet = JSON.stringify([{chat: {
        content: text,
        mail: cmd || '',
        vpos: vpos || 0,
        premium: util.isPremium() ? 1 : 0,
        postkey: postKey,
        user_id: threadInfo.userId.toString(),
        ticket: threadInfo.ticket,
        thread: threadInfo.threadId.toString()
      }}]);
      console.log('post packet: ', packet);
      let server = threadInfo.server.replace('/api/', '/api.json/');
      return this._post(server, packet, 'json').then(result => {
        let status = null, chat_result, no = 0, blockNo = 0;
        try {
          chat_result = result.find(t => t.chat_result).chat_result;
          status = chat_result.status;
          no = parseInt(chat_result.no, 10);
          blockNo = Math.floor((no + 1) / 100);
        } catch (e) {
          console.error(e);
        }

        if (parseInt(status) !== 0) {
          return Promise.reject({
            status: 'fail',
            no,
            blockNo,
            code: status,
            message: `コメント投稿失敗 status: ${status} server: ${threadInfo.server}`
          });
        }

        return Promise.resolve({
          status: 'ok',
          no,
          blockNo,
          code: status,
          message: 'コメント投稿成功'
        });
      });
    }

    postChat(threadInfo, text, cmd, vpos, language) {
      return this.getPostKey(threadInfo.threadId, threadInfo.blockNo, language)
        .then(result => {
          return this._postChat(threadInfo, result.postkey, text, cmd, vpos);
        });
    }

  }

  return {ThreadLoader};
})();




//===END===

export {ThreadLoader};