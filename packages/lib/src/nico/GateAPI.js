import {gate} from '../message/gate';
import {ThumbInfoCacheDb} from './ThumbInfoCacheDb';
import {parseThumbInfo} from './parseThumbInfo';
import {WatchInfoCacheDb} from './WatchInfoCacheDb';
const PRODUCT = 'ZenzaWatch';
//===BEGIN===

const GateAPI = (() => {
  const {Handler, PromiseHandler, Emitter, EmitterInitFunc, workerUtil, parseThumbInfo} = window.ZenzaLib || {};
//@require gate
  const {post, parseUrl, xFetch, uFetch, init} = gate();
  const {IndexedDbStorage} = window.ZenzaLib;
//@require ThumbInfoCacheDb
  const thumbInfo = async () => {
    const {port, TOKEN} = init({prefix: `thumbInfo${PRODUCT}Loader`, type: 'thumbInfo'});
    const db = await ThumbInfoCacheDb.open();

    port.addEventListener('message', async e => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId, token} = data;
      const {command, params} = body;
      if (command !== 'fetch') { return; }
      const p = parseUrl(params.url);
      if (TOKEN !== token ||
        p.hostname !== location.host ||
        !p.pathname.startsWith('/api/getthumbinfo/')) {
        console.log('invalid msg: ', {origin: e.origin, TOKEN, token, body});
        return;
      }
      params.options = params.options || {};

      const watchId = params.url.split('/').reverse()[0];
      const expiresAt = Date.now() - (params.options.expireTime || 0);
      const cache = await db.get(watchId);
      if (cache && cache.thumbInfo.status === 'ok' && cache.updatedAt < expiresAt) {
        return post({status: 'ok', command, params: cache.thumbInfo}, {sessionId});
      }

      delete params.options.credentials;
      // return xFetch(params, sessionId);
      return uFetch(params)
      .then(res => res.text())
      .then(async xmlText => {
        let thumbInfo = parseThumbInfo(xmlText);
        if (thumbInfo.status === 'ok') {
          db.put(xmlText, thumbInfo);
        } else if (cache && cache.thumbInfo.status === 'ok') {
          thumbInfo = cache.thumbInfo;
        }
        const result = {status: 'ok', command, params: thumbInfo};
        post(result, {sessionId});
      }).catch(({status, message}) => {
        if (cache && cache.thumbInfo.status === 'ok') {
          return post({status: 'ok', command, params: cache.thumbInfo}, {sessionId});
        }
        return post({status, message, command}, {sessionId});
      });
    });
  };

  const nicovideo = () => {
    const {port, type, TOKEN, PID} = init({prefix: `nicovideoApi${PRODUCT}Loader`, type: 'nicovideoApi'});
    // if (!isWhiteHost(origin) &&
    //   localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
    //   console.log('disable bridge', origin);
    //   return;
    // }
    console.log('enable bridge', origin);


    let isOk = false;

    const pushHistory = ({path, title = ''}) => {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, title, path);
      if (broadcastChannel) {
        broadcastChannel.postMessage({body: {
          command: 'pushHistory', params: {path, title}
        }});
      }
    };

    const PREFIX = PRODUCT || 'ZenzaWatch';
    const dumpConfig = (params, sessionId) => {
      if (!params.keys) {
        return;
      }
      const prefix = params.prefix || PREFIX;
      const config = {};
      const {keys, command} = params;
      keys.forEach(key => {
        const storageKey = `${prefix}_${key}`;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });
      post({status: 'ok', command, params: config}, {sessionId});
    };

    const saveConfig = params => {
      if (!params.key) {
        return;
      }
      const prefix = params.prefix || PREFIX;
      const storageKey = `${prefix}_${params.key}`;
      const val = JSON.stringify(params.value);
      if (localStorage[storageKey] !== val) {
        // window.console.log('bridge save config: %s = %s', storageKey, params.value);
        localStorage.setItem(storageKey, val);
      }
    };

    const onStorage = e => {
      let key = e.key || '';
      if (e.type !== 'storage' || key.indexOf(`${PREFIX}_`) !== 0) {
        return;
      }

      key = key.replace(`${PREFIX}_`, '');
      const {oldValue, newValue} = e;
      if (oldValue === newValue || !isOk) {
        return;
      }
      switch (key) {
        case 'message':{
          const {body} = JSON.parse(newValue);
          return post({status: 'ok', command: 'message', params: body}, {sessionId: body.sessionId || ''});
        }
        default:
          return post({status: 'ok', command: 'configSync', params: {key, value: newValue}});
      }
    };

    const sendMessage = (body, sessionId) => {
      // window.console.info('onCommandPacket', message, isOk);
      if (!isOk || !broadcastChannel) {
        return;
      }
      broadcastChannel.postMessage({
        id: PRODUCT,
        status: 'ok',
        command: 'message',
        body,
        sessionId
      });
    };

    const dbMap = {};
    const bridgeDb = async (params, sessionId) => {
      const {command, name} = params;
      if (command === 'open') {
        const {name, ver, stores} = params;
        const db = dbMap[name] || await IndexedDbStorage.open({name, ver, stores});
        dbMap[name] = db;
        return post({status: 'ok', command: 'bridge-db-result', params: {name, ver}});
      }
      const db = dbMap[name];
      const {record, transfer, key, index, timeout} = params;
      let result = 'ok';
      switch(command) {
        case 'close':
          await db.close();
          break;
        case 'put':
          await db.put(record, transfer);
          break;
        case 'get':
          result = await db.get({key, index, timeout});
          break;
        case 'delete':
          await db.delete({key, index, timeout});
          break;
      }
      return post({status: 'ok', command: 'bridge-db-result', params: result}, {sessionId});
    };

    const onBroadcastMessage = e => {
      if (!isOk) { return; }
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId} = data;
      if (body.command !== 'message' || !body.params.command) {
        console.warn('unknown broadcast format', body);
        return;
      }
      // console.log('%cgate.onBroadcastMessage', 'background: cyan;', isOk, e.data);

      return post(body, {sessionId});
    };

    const broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel(PREFIX)) : null;
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    } else {
      window.addEventListener('storage', onStorage);
    }

    port.addEventListener('message', e => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId, token} = data;
      const {command, params} = body;
      if (TOKEN !== token) {
        console.log('invalid msg: ', {origin: e.origin, TOKEN, token, body});
        return;
      }
      try {
        let result;
        switch (command) {
          case 'ok':
            window.console.info('%cCrossDomainGate initialize OK!', 'color: red;');
            isOk = true;
            break;
          case 'fetch':
            return xFetch(params, sessionId);
          case 'dumpConfig':
            return dumpConfig(params, sessionId);
          case 'saveConfig':
            return saveConfig(params, sessionId);
          case 'pushHistory':
            return pushHistory(params);
          case 'bridge-db':
            return bridgeDb(params, sessionId);
          case 'message':
            return sendMessage(body, sessionId);
          case 'ping':
            result = {now: Date.now(), NAME: window.name, PID, url: location.href};
            console.log('pong!: %smsec', Date.now() - params.now, params);
            break;
        }
        post({status: 'ok', command: 'commandResult', params: {command, result}}, {sessionId});
      } catch(e) {
        console.error('Exception', e);
        post({status: 'fail', command, params: {message: e.message || `${type} command fail`}});
      }
    });
  };


  const smile = () => {
    const {port, TOKEN} = init({prefix: `storyboard${PRODUCT}`});

    const videoCapture = (src, sec) => {
      return new Promise((resolve, reject) => {
        const v = document.createElement('video');

        v.addEventListener('loadedmetadata', () => v.currentTime = sec);
        v.addEventListener('error', err => {
          v.remove();
          reject(err);
        });

        const onSeeked = () => {
          const c = document.createElement('canvas');
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0);
          v.remove();

          resolve(c);
        };

        v.addEventListener('seeked', onSeeked, {once: true});

        document.body.append(v);
        v.volume = 0;
        v.autoplay = false;
        v.controls = false;
        v.src = src;
        v.currentTime = sec;
      });
    };

    port.addEventListener('message', e => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId, token} = data;
      const {command, params} = body;
      if (command !== 'videoCapture') { return; }
      if (TOKEN !== token) {
        window.console.log('invalid msg: ', {origin: e.origin, TOKEN, token, body});
        return;
      }

      videoCapture(params.src, params.sec).then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        //console.info('video capture success', dataUrl.length);
        post({command, params: {dataUrl}}, {sessionId});
      });
    });

  };

  const search = () => {
    const {port, TOKEN} = init({prefix: `search${PRODUCT}`});
    port.addEventListener('message', e => {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId, token} = data;
      const {command, params} = body;
      if (command !== 'fetch') { return; }
      const p = parseUrl(params.url);
      if (TOKEN !== token ||
        p.hostname !== location.host) {
        console.log('invalid msg: ', {origin: e.origin, TOKEN, token, body});
        return;
      }
      params.options = params.options || {};
      delete params.options.credentials;

      xFetch(params, sessionId);
    });
  };

  return {thumbInfo, nicovideo, smile, search};
})();

//===END===


export {GateAPI};
