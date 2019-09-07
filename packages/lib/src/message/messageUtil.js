import {Emitter, PromiseHandler} from '../Emitter';
import {global, ZenzaWatch, PRODUCT, TOKEN} from '../../../../src/ZenzaWatchIndex';
import {Config} from '../../../../src/Config';
import {NicoVideoApi} from '../../../../src/loader/api';

//===BEGIN===
const messageUtil = {};
// WindowMessageEmitter 親子ウィンドウ間
// BroadcastEmitter 複数ウィンドウ間. CrossDomainGate を経由してドメインの壁を超える
/**
 * @typedef MessageEvent
 * @type {Object}
 * @property {string} source
 * @property {string} origin
 * @property {MessageEventData|string} data
 */
/**
 * @typedef MessageEventData
 * @type {Object}
 * @property {string} id
 * @property {string} type
 * @property {MessageBody} body
 * @property {string?} sessionId
 */
/**
 * @typedef MessageBody
 * @type {Object}
 * @property {string} command
 * @property {CommandBody} params
*/
/**
 * @typedef CommandBody
 * @type {Object}
 * @property {string?} status
 * @property {string} command
 * @property {object|string|number|boolean} params
*/

const WindowMessageEmitter = messageUtil.WindowMessageEmitter = ((safeOrigins = []) => {
  const emitter = new Emitter();
  const knownSource = [];

  /**
   * @param {MessageEvent} e
   */
  const onMessage = e => {
    if (!knownSource.includes(e.source) && !safeOrigins.includes(e.origin)
    ) {
      return;
    }
    try {
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {id, type, body, sessionId} = data;
      if (id !== PRODUCT) {
        return;
      }
      const message = body.params;
      if (type === 'blogParts') { // 互換のための対応
        global.external.sendOrExecCommand(message.command, message.params.watchId);
        return;
      } else if (body.command !== 'message' || !body.params.command) {
        return;
      }
      emitter.emit('message', message, type, sessionId);
    } catch (err) {
      console.log(
        '%cNicoCommentLayer.Error: window.onMessage  - ',
        'color: red; background: yellow',
        err,
        e
      );
      console.log('%corigin: ', 'background: yellow;', e.origin);
      console.log('%cdata: ', 'background: yellow;', e.data);
      console.trace();
    }
  };

  emitter.addKnownSource = win => knownSource.push(win);

  window.addEventListener('message', onMessage);

  return emitter;
})(['http://ext.nicovideo.jp', 'https://ext.nicovideo.jp']);

const BroadcastEmitter = messageUtil.BroadcastEmitter = (() => {
  const bcast = new Emitter();
  bcast.windowId = `${PRODUCT}-${Math.random()}`;
  // const promises = bcast.promises = {};

  const channel =
    (window.BroadcastChannel && location.host === 'www.nicovideo.jp') ?
      (new window.BroadcastChannel(PRODUCT)) : null;

  /**
   * @param {StorageEvent} e
   */
  const onStorage = e => {
    let command = e.key;
    if (e.type !== 'storage' || !command.startsWith(`${PRODUCT}_`)) {
      return;
    }

    command = command.replace('ZenzaWatch_', '');
    let oldValue = e.oldValue;
    let newValue = e.newValue;
    if (oldValue === newValue) {
      return;
    }

    switch (command) {
      case 'message': {
        const {body} = JSON.parse(newValue);
        console.log('%cmessage', 'background: cyan;', body);
        bcast.emitAsync('message', body, 'broadcast');
        break;
      }
    }
  };

  /**
   * @param {MessageEvent} e
   */
  const onBroadcastMessage = e => {
    console.log('%cbcast.onBroadcastMessage', 'background: cyan;', e.data);
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    const {body, sessionId} = data;
    if (body.command !== 'message' || !body.params.command) {
      console.warn('unknown broadcast format', body);
      return;
    }
    return bcast.emitAsync('message', body.params, 'broadcast', sessionId);
  };

  /**
   * @params {CommandBody} body
   */
  bcast.sendExecCommand = body =>
    bcast.sendMessagePromise({command: 'sendExecCommand', params: body});

  /**
   * @params {MessageBody} body
   * @params {string|null} sessionId
   */
  bcast.sendMessage = (body, sessionId = null) => {
    const requestId = `request-${Math.random()}`;
    Object.assign(body, {requestId, windowId: bcast.windowId, now: Date.now()});
    const req = {id: PRODUCT, body: {command: 'message', params: body}, sessionId};
    if (channel) {
      channel.postMessage(req);
    } else if (location.host === 'www.nicovideo.jp') {
      Config.setValue('message', {body, sessionId});
    } else if (location.host !== 'www.nicovideo.jp' &&
      NicoVideoApi && NicoVideoApi.sendMessage) {
      return NicoVideoApi.sendMessage(body, !!sessionId, sessionId);
    }
  };
  /**
   * @params {MessageBody} body
   * @params {number} timeout
   * @returns {Promise}
   */
  bcast.sendMessagePromise = (body, timeout = 60000) => {
    const sessionId = `sendMessage-${PRODUCT}-${Math.random()}`;
    let timer = null;
    return bcast.promise(sessionId, async (resolve, reject) => {
      const result = bcast.sendMessage(body, sessionId);
      // window.console.log('bcast.sendMessagePromise', {body, result, sessionId});
      timer = setTimeout(() => {
        if (!timer) { return; }
        return reject(`timeout ${timeout}msec. command: ${body.command}`);
      }, timeout);
      if (result instanceof Promise) {
        return resolve(await result);
      }
    }).catch(err => bcast.emitReject(sessionId, err))
      .finally(() => {
        timer = clearTimeout(timer);
        bcast.resetPromise(sessionId);
      });
  };

  /**
   * @params {Object} PingResult
   * @property {string} playerId
   */
  bcast.pong = result => bcast.sendMessage({command: 'pong', params: result});

  bcast.hello = (message = 'こんにちはこんにちは！') => bcast.sendMessagePromise(
    {command: 'hello', params: {
        message, from: document.title, url: location.href, now: Date.now(),
        ssid: `hello-${Math.random()}`, windowId: bcast.windowId
      }
    });

  bcast.ping = ({timeout, force} = {}) => {
    timeout = timeout || 500;
    return new Promise((resolve, reject) => {
      bcast.sendMessagePromise(
        {command: 'ping', params: {timeout, force, now: Date.now()}}).then(resolve);
      window.setTimeout(() => reject(`timeout ${timeout}ms`), timeout);
    });
  };

  bcast.sendOpen = (watchId, params) => {
    bcast.sendMessage({
      command: 'openVideo', params: Object.assign({watchId, eventType: 'click'}, params)});
  };

  bcast.notifyClose = () => bcast.sendMessage({command: 'notifyClose'});

  if (ZenzaWatch && ZenzaWatch.debug) {
    ZenzaWatch.debug.hello = bcast.hello;
    ZenzaWatch.debug.ping = ({timeout, force} = {}) => {
      window.console.time('ping');
      return bcast.ping({timeout, force}).then(result => {
        window.console.timeEnd('ping');
        window.console.info('ping result: ok', result);
        return result;
      }).catch(result => {
        window.console.timeEnd('ping');
        window.console.error('ping fail: ', result);
        return result;
      });
    };
  }

  if (location.host === 'www.nicovideo.jp') {
    if (channel) {
      channel.addEventListener('message', onBroadcastMessage);
    } else {
      window.addEventListener('storage', onStorage);
    }
  }

  return bcast;
})();


//===END===

export {messageUtil, BroadcastEmitter, WindowMessageEmitter};