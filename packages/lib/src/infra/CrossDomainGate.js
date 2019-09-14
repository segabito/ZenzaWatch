import {Emitter, PromiseHandler} from '../Emitter';
import { PRODUCT } from '../../../../src/ZenzaWatchIndex';
import {BroadcastEmitter} from '../message/messageUtil';

const TOKEN = 'ranbu';
//===BEGIN===

class CrossDomainGate extends Emitter {
  static get hostReg() {
    return /^[a-z0-9]*\.nicovideo\.jp$/;
  }
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  initialize(params) {
    this._baseUrl = params.baseUrl;
    this._origin = params.origin || location.href;
    this._type = params.type;
    this._suffix = params.suffix || '';
    this.name = params.name || params.type;
    this._sessions = {};
    this._initializeStatus = 'none';
  }
  _initializeFrame() {
    if (this._initializeStatus !== 'none') {
      return this.promise('initialize');
    }
    this._initializeStatus = 'initializing';
    const append = () => {
      if (!this.loaderFrame.parentNode) {
        console.warn('frame removed');
        this.port = null;
        this._initializeCrossDomainGate();
      }
    };
    setTimeout(append,  5 * 1000);
    setTimeout(append, 10 * 1000);
    setTimeout(append, 20 * 1000);
    setTimeout(append, 30 * 1000);
    setTimeout(() => {
      if (this._initializeStatus === 'done') {
        return;
      }
      this.emitReject('initialize', {
        status: 'timeout', message: `CrossDomainGate初期化タイムアウト (type: ${this._type}, status: ${this._initializeStatus})`
      });
      console.warn(`CrossDomainGate初期化タイムアウト (type: ${this._type}, status: ${this._initializeStatus})`);
    }, 60 * 1000);
    this._initializeCrossDomainGate();
    return this.promise('initialize');
  }
  _initializeCrossDomainGate() {
    // window.console.info(`%c1. CrossDomainGate open ${this.name} ${PRODUCT}`, 'background: orange; color: green; font-size: 120%');
    window.console.time(`GATE OPEN: ${this.name} ${PRODUCT}`);
    const loaderFrame = this.loaderFrame = document.createElement('iframe');
    loaderFrame.referrerPolicy = 'origin';
    loaderFrame.sandbox = 'allow-scripts allow-same-origin';
    loaderFrame.loading = 'eager';
    loaderFrame.name = `${this._type}${PRODUCT}Loader${this._suffix ? `#${this._suffix}` : ''}`;
    loaderFrame.className = `xDomainLoaderFrame ${this._type}`;
    loaderFrame.style.cssText = `
      position: fixed; left: -100vw; pointer-events: none;user-select: none; contain: strict;`;
    (document.body || document.documentElement).append(loaderFrame);

    this._loaderWindow = loaderFrame.contentWindow;
    const onInitialMessage = event => {
      if (event.source !== this._loaderWindow) {
        return;
      }
      // window.console.info(`%c2. CrossDomainGate onInitialMessage [${this.name} ${PRODUCT}]`, 'background: orange; color: green; font-size: 120%');
      window.removeEventListener('message', onInitialMessage);
      this._onMessage(event);
    };
    window.addEventListener('message', onInitialMessage, {capture: true});
    this._loaderWindow.location.replace(this._baseUrl + '#' + TOKEN);
  }
  _onMessage(event) {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    const {id, type, token, sessionId, body} = data;
    if (id !== PRODUCT || type !== this._type || token !== TOKEN) {
      console.warn('invalid token:',
        {id, PRODUCT, type, _type: this._type, token, TOKEN});
      return;
    }

    if (!this.port && body.command === 'initialized') {
      const port = this.port = event.ports[0];
      port.addEventListener('message', this._onMessage.bind(this));
      port.start();
      port.postMessage({body: {command: 'ok'}, token: TOKEN});
      // window.console.info(`%c3. CrossDomainGate MessageChannel OK [${this.name} ${PRODUCT}]`, 'background: orange; color: green; font-size: 120%');
    }
    return this._onCommand(body, sessionId);
  }
  _onCommand({command, status, params}, sessionId = null) {
    switch (command) {
      case 'initialized':
        if (this._initializeStatus !== 'done') {
          this._initializeStatus = 'done';
          const originalBody = params;
          window.console.timeEnd(`GATE OPEN: ${this.name} ${PRODUCT}`);
          const result = this._onCommand(originalBody, sessionId);
          this.emitResolve('initialize', {status: 'ok'});
          // window.console.info(`%c4. CrossDomainGate init OK [${this.name} ${PRODUCT}]`, 'background: orange; color: green; font-size: 120%');
          return result;
        }
        break;

      case 'message':
        BroadcastEmitter.emitAsync('message', params, 'broadcast', sessionId);
        break;

      default: {
        const session = this._sessions[sessionId];
        if (!session) {
          return;
        }
        if (status === 'ok') {
          session.resolve(params);
        } else {
          session.reject({message: status || 'fail'});
        }
        delete this._sessions[sessionId];
      }
        break;
    }
  }
  /**
   * @deprecated fetch使え
   * @param {string} url
   * @param {object} options
   */
  load(url, options) {
    return this._postMessage({command: 'loadUrl', params: {url, options}});
  }
  videoCapture(src, sec) {
    return this._postMessage({command: 'videoCapture', params: {src, sec}})
      .then(result => Promise.resolve(result.params.dataUrl));
  }
  _fetch(url, options) {
    return this._postMessage({command: 'fetch', params: {url, options}});
  }
  async fetch(url, options = {}) {
    const result = await this._fetch(url, options);
    if (typeof result === 'string' || !result.buffer || !result.init || !result.headers) {
      return result;
    }
    const {buffer, init, headers} = result;
    const _headers = new Headers();
    (headers || []).forEach(a => _headers.append(...a));
    const _init = {
      status: init.status,
      statusText: init.statusText || '',
      headers: _headers
    };
    if (options._format === 'arraybuffer') {
      return {buffer, init, headers};
    }
    return new Response(buffer, _init);
  }
  async configBridge(config) {
    const keys = config.getKeys();
    this._config = config;
    const configData = await this._postMessage({
      command: 'dumpConfig',
      params: { keys, url: '', prefix: PRODUCT }
    });
    for (const key of Object.keys(configData)) {
      config.props[key] = configData[key];
    }
    if (!this.constructor.hostReg.test(location.host) &&
      !config.props.allowOtherDomain) {
      return;
    }
    config.on('update', (key, value) => {
      if (key === 'autoCloseFullScreen') {
        return;
      }

      this._postMessage({command: 'saveConfig', params: {key, value, prefix: PRODUCT}}, false);
    });
  }
  async _postMessage(body, usePromise = true, sessionId = '') {
    await this._initializeFrame();
    sessionId = sessionId || (`gate:${Math.random()}`);
    const {params} = body;
    return this._sessions[sessionId] =
      new PromiseHandler((resolve, reject) => {
        try {
          this.port.postMessage({body, sessionId, token: TOKEN}, params.transfer);
          if (!usePromise) {
            delete this._sessions[sessionId];
            resolve();
          }
        } catch (error) {
          console.log('%cException!', 'background: red;', {error, body});
          delete this._sessions[sessionId];
          reject(error);
        }
    });
  }
  postMessage(body, promise = true) {
    return this._postMessage(body, promise);
  }
  /**
   * @param {MessageBody} body
   * @param {boolean} usePromise
   * @param {string?} sessionId
   */
  sendMessage(body, usePromise = false, sessionId = '') {
    return this._postMessage({command: 'message', params: body}, usePromise, sessionId);
  }
  pushHistory(path, title) {
    return this._postMessage({command: 'pushHistory', params: {path, title}}, false);
  }
  async bridgeDb({name, ver, stores}) {
    const worker = await this._postMessage(
      {command: 'bridge-db', params: {command: 'open', params: {name, ver, stores}}}
    );
    const post = (command, data, storeName, transfer) => {
      const params = {data, storeName, transfer, name};
      return this._postMessage({command: 'bridge-db', params: {command, params, transfer}});
    };
    const result = {worker};
    for (const meta of stores) {
      const storeName = meta.name;
      result[storeName] = (storeName => {
        return {
          close: params => post('close', params, storeName),
          put: (record, transfer) => post('put', record, storeName, transfer),
          get: ({key, index, timeout}) => post('get', {key, index, timeout}, storeName),
          updateTime: ({key, index, timeout}) => post('updateTime', {key, index, timeout}, storeName),
          delete: ({key, index, timeout}) => post('delete', {key, index, timeout}, storeName),
          gc: (expireTime = 30 * 24 * 60 * 60 * 1000, index = 'updatedAt') => post('gc', {expireTime, index}, storeName)
        };
      })(storeName);
    }
    return result;
  }
}


//===END===

export {CrossDomainGate};