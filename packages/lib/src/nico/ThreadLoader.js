import {util} from '../util';
import {PopupMessage} from '../util';
// import jsdom from 'jsdom';
import {sleep} from '../../packages/lib/src/infra/sleep';
import {netUtil} from '../../../lib/src/infra/netUtil';
import {textUtil} from '../../../lib/src/text/textUtil';

const JSDOM = {} ; //jsdom.JSDOM;
const debug = {};

//===BEGIN===

const {ThreadLoader} = (() => {
  const VERSION_OLD = '20061206';
  const VERSION     = '20090904';

  const LANG_CODE = {
    'en_us': 1,
    'zh_tw': 2
  };

  class ThreadLoader {

    constructor() {
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
      let url = `//flapi.nicovideo.jp/api/getthreadkey?thread=${threadId}`;
      let langCode = this.getLangCode(language);
      if (langCode) { url = `${url}&language_id=${langCode}`; }

      const headers = options.cookie ? {Cookie: options.cookie} : {};
      return netUtil.fetch(url, {
        method: 'POST',
        dataType: 'text',
        headers,
        credentials: 'include'
      }).then(res => res.text()).then(e => {
        const result = textUtil.parseQuery(e);
        this._threadKeys[threadId] = result;
        return result;
      }).catch(result => {
        return Promise.reject({
          result: result,
          message: `ThreadKeyの取得失敗 ${threadId}`
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
      const url =
        `//flapi.nicovideo.jp/api/getpostkey?device=1&thread=${threadId}&block_no=${blockNo}&version=1&version_sub=2&yugi=`;

      console.log('getPostkey url: ', url);
      const headers = options.cookie ? {Cookie: options.cookie} : {};
      return netUtil.fetch(url, {
        method: 'POST',
        dataType: 'text',
        headers,
        credentials: 'include'
      }).then(res => res.text()).then(e => textUtil.parseQuery(e)).catch(result => {
        return Promise.reject({
          result,
          message: `PostKeyの取得失敗 ${threadId}`
        });
      });
    }

    buildPacketData(msgInfo, options = {}) {
      const packets = [];
      const resCount = this.getRequestCountByDuration(msgInfo.duration);
      const leafContent = `0-${Math.floor(msgInfo.duration / 60) + 1}:100,${resCount}`;
      const language = this.getLangCode(msgInfo.language);

      msgInfo.threads.forEach(thread => {
        if (!thread.isActive) { return; }

        const t = {
          thread: thread.id.toString(),
          user_id: msgInfo.userId > 0 ? msgInfo.userId.toString() : '', // 0の時は空文字
          language,
          nicoru: 1,
          scores: 1
        };
        if (thread.isThreadkeyRequired) {
          t.threadkey = msgInfo.threadKey[thread.id].key;
          t.force_184 = msgInfo.threadKey[thread.id].force184 ? '1' : '0';
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
        // threadkeyかwaybackkeyがある場合にuserkeyをつけてしまうとエラー。いらないなら無視すりゃいいだろが
        if (!t.threadkey /*&& !t.waybackkey*/ && msgInfo.userKey) {
          t.userkey = msgInfo.userKey;
        }
        if (t.fork || thread.isLeafRequired === false) { // 投稿者コメントなど
          packets.push({thread: Object.assign({with_global: 1, version: VERSION_OLD, res_from: -1000}, t)});
        } else {
          packets.push({thread: Object.assign({with_global: 1, version: VERSION}, t)});
          packets.push({thread_leaves: Object.assign({content: leafContent}, t)});
        }
      });
      return packets;
    }

    buildPacket(msgInfo, options = {}) {
      const data = this.buildPacketData(msgInfo);
      if (options.format !== 'xml') {
        return JSON.stringify(data);
      }
      const packet = document.createElement('packet');
      data.forEach(d => {
        const t = document.createElement(d.thread ? 'thread' : 'thread_leaves');
        const thread = d.thread ? d.thread : d.thread_leaves;
        Object.keys(thread).forEach(attr => {
          if (attr === 'content') {
            t.textContent = thread[attr];
            return;
          }
          t.setAttribute(attr, thread[attr]);
        });
        packet.append(t);
      });
      return packet.outerHTML;
    }

    _post(server, body, options = {}) {
      const url = server;
      return netUtil.fetch(url, {
        method: 'POST',
        dataType: 'text',
        headers: {'Content-Type': 'text/plain; charset=UTF-8'},
        body
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
      const language = msgInfo.language;
      msgInfo.threadKey = msgInfo.threadKey || {};
      const loadThreadKey = threadId => {
        if (msgInfo.threadKey[threadId]) { return; }
        msgInfo.threadKey[threadId] = {};
        return this.getThreadKey(threadId, language, options).then(info => {
          console.log('threadKey: ', threadId, info);
          msgInfo.threadKey[threadId] = {key: info.threadkey, force184: info.force_184};
        });
      };

      const loadThreadKeys = () =>
        Promise.all(msgInfo.threads.filter(t => t.isThreadkeyRequired).map(t => loadThreadKey(t.id)));

      return Promise.all([loadThreadKeys()]).then(() => {
        const format = options.format === 'xml' ? 'xml' : 'json';
        let server = format === 'json' ? msgInfo.server.replace('/api/', '/api.json/') : msgInfo.server;
        server = server.replace(/^http:/, '');
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
        debug.lastMessageServerResult = result;

        const format = 'array';
        let thread, totalResCount = 0;
        let resultCode = null;
        try {
          let threads = result.filter(t => t.thread).map(t => t.thread);
          let lastId = null;
          Array.from(threads).forEach(t => {
            let id = parseInt(t.thread, 10);
            let fork = t.fork || 0;
            if (lastId === id || fork) {
              return;
            }
            lastId = id;
            msgInfo[id] = thread;
            if (parseInt(id, 10) === parseInt(threadId, 10)) {
              thread = t;
              resultCode = t.resultcode;
            }
            if (!isNaN(t.last_res) && !fork) { // 投稿者コメントはカウントしない
              totalResCount += t.last_res;
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

        const last_res = isNaN(thread.last_res) ? 0 : thread.last_res * 1;
        const threadInfo = {
          server,
          userId,
          resultCode,
          threadId,
          thread:     thread.thread,
          serverTime: thread.server_time,
          force184:   msgInfo.defaultThread.isThreadkeyRequired ? '1' : '0',
          lastRes:    last_res,
          totalResCount,
          blockNo:    Math.floor((last_res + 1) / 100),
          ticket:     thread.ticket || '0',
          revision:   thread.revision,
          language:   msgInfo.language,
          when:       msgInfo.when,
          isWaybackMode: !!msgInfo.when
        };

        msgInfo.threadInfo = threadInfo;

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

        return sleep(3000).then(() => this._load(msgInfo, options).then(onSuccess).catch(onFailFinally));
      };

      return this._load(msgInfo, options).then(onSuccess).catch(onFail1st);
    }

    async _postChat(threadInfo, postkey, text, cmd, vpos) {
      const packet = JSON.stringify([{chat: {
        content: text,
        mail: cmd || '',
        vpos: vpos || 0,
        premium: util.isPremium() ? 1 : 0,
        postkey,
        user_id: threadInfo.userId.toString(),
        ticket: threadInfo.ticket,
        thread: threadInfo.threadId.toString()
      }}]);
      console.log('post packet: ', packet);
      const server = threadInfo.server.replace('/api/', '/api.json/');
      const result = await this._post(server, packet, 'json');

      let status = null, chat_result, no = 0, blockNo = 0;
      try {
        chat_result = result.find(t => t.chat_result).chat_result;
        status = chat_result.status * 1;
        no = parseInt(chat_result.no, 10);
        blockNo = Math.floor((no + 1) / 100);
      } catch (e) {
        console.error(e);
      }
      if (status === 0) {
        return {
          status: 'ok',
          no,
          blockNo,
          code: status,
          message: 'コメント投稿成功'
        };
      }
      return Promise.reject({
        status: 'fail',
        no,
        blockNo,
        code: status,
        message: `コメント投稿失敗 status: ${status} server: ${threadInfo.server}`
      });
    }

    async postChat(msgInfo, text, cmd, vpos, lang) {
      const threadInfo = msgInfo.threadInfo;
      const tk = await this.getPostKey(threadInfo.threadId, threadInfo.blockNo, lang);
      const postkey = tk.postkey;
      let result = await this._postChat(threadInfo, postkey, text, cmd, vpos, lang).catch(r => r);
      if (result.status === 'ok') {
        return result;
      }
      const errorCode = parseInt(result.code, 10);
      if (errorCode === 3) { // ticket fail
        await this.load(msgInfo);
      } else if (![2, 4, 5].includes(errorCode)) { // リカバー不能系
        return Promise.reject(result);
      }
      await sleep(3000);
      result = await this._postChat(threadInfo, postkey, text, cmd, vpos, lang).catch(r => r);
      return result.status === 'ok' ? result : Promise.reject(result);
    }

  }

  return {ThreadLoader};
})();




//===END===

export {ThreadLoader};
