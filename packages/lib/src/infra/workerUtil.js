import {netUtil} from './netUtil';
// import {globalEmitter} from '../../../../src/ZenzaWatchIndex';
import {Config} from '../../../../src/Config';
import {TOKEN, PRODUCT} from '../../../../src/ZenzaWatchIndex';
import {PopupMessage} from '../ui/PopupMessage';
import {EmitterInitFunc} from '../Emitter';
const PID = 'PID';
const bcast = {};
const portMap = {};
//===BEGIN===

const workerUtil = (() => {
  let config, TOKEN, PRODUCT = 'ZenzaWatch?', netUtil, CONSTANT, NAME = '';
  let global = null, external = null;
  const isAvailable = !!(window.Blob && window.Worker && window.URL);

  const messageWrapper = function(self) {
    const _onmessage = self.onmessage || (() => {});
    const promises = {};
    const onMessage = async function(self, type, e) {
      const {body, sessionId, status} = e.data;
      const {command, params} = body;
      // console.log('onMessage', sessionId, {body, status});
      try {
        let result;
        switch (command) {
          case 'commandResult':
            if (promises[sessionId]) {
              if (status === 'ok') {
                if (params.command === 'fetch') {
                  const {buffer, init} = params.result;
                  promises[sessionId].resolve(new Response(buffer, init));
                } else {
                  promises[sessionId].resolve(params.result);
                }
              } else {
                promises[sessionId].reject(params.result);
              }
              delete promises[sessionId];
            }
          return;
          case 'ping':
            result = {now: Date.now(), NAME, PID, url: location.href};
            // console.log('PONG "%s" %sms', params.NAME, Date.now() - params.now);
            break;
          case 'port': {
            const port = e.ports[0];
            portMap[params.name] = port;
            port.addEventListener('message', onMessage.bind({}, port, params.name));
            bindFunc(port, 'MessageChannel');
            if (params.ping) {
              console.time('ping:' + sessionId);
              port.ping().then(result => {
                console.timeEnd('ping:' + sessionId);
                console.log('ok %smec', Date.now() - params.now, params);
              }).catch(err => {
                console.timeEnd('ping:' + sessionId);
                console.warn('ping fail', {err, data: e.data});
              });
            }
          }
            return;
          case 'broadcast': {
            if (!BroadcastChannel) { return; }
            const channel = new BroadcastChannel(`${params.name}`);
            channel.addEventListener('message', onMessage.bind({}, channel, 'BroadcastChannel'));
            bindFunc(channel, 'BroadcastChannel');
            bcast[params.basename] = channel;
          }
            return;
          case 'env':
            ({config, TOKEN, PRODUCT, CONSTANT} = params);
            return;
          default:
            result = await _onmessage({command, params}, type, PID);
            break;
          }
        self.postMessage({body:
          {command: 'commandResult', params:
            {command, result}}, sessionId, TYPE: type, PID, status: 'ok'
          });
      } catch(err) {
        console.error('failed', {err, command, params, sessionId, TYPE: type, PID, data: e.data});
        self.postMessage({body:
            {command: 'commandResult', params: {command, result: err.message || null}},
            sessionId, TYPE: type, PID, status: err.status || 'fail'
          });
      }
    };
    self.onmessage = onMessage.bind({}, self, self.name);

    self.onconnect = e => {
      const port = e.ports[0];
      port.onmessage = self.onmessage;
      port.start();
    };

    const bindFunc = (self, type = 'Worker') => {
      const post = function(self, body, options = {}) {
        const sessionId = `recv:${NAME}:${type}:${this.sessionId++}`;
        return new Promise((resolve, reject) => {
          promises[sessionId] = {resolve, reject};
          self.postMessage({body, sessionId, PID}, options.transfer);
          if (typeof options.timeout === 'number') {
            setTimeout(() => {
              reject({status: 'fail', message: 'timeout'});
              delete promises[sessionId];
            }, options.timeout);
          }
        }).finally(() => { delete promises[sessionId]; });
      };
      const emit = function(self, eventName, data = null) {
        self.post({command: 'emit', params: {eventName, data}});
      };
      const notify = function(self, message) {
        self.post({command: 'notify', params: {message}});
      };
      const alert = function(self, message) {
        self.post({command: 'alert', params: {message}});
      };
      const ping = async function(self, options = {}) {
        const timekey = `PING "${self.name}"`;
        console.log(timekey);
        let result;
        options.timeout = options.timeout || 10000;
        try {
          console.time(timekey);
          result = await self.post({command: 'ping', params: {now: Date.now(), NAME, PID, url: location.href}}, options);
          console.timeEnd(timekey);
        } catch (e) {
          console.timeEnd(timekey);
          console.warn('ping fail', e);
        }
        return result;

        // return self.post({command: 'ping', params: {now: Date.now(), NAME, PID, url: location.href}}, options);
      };
      self.post = post.bind({sessionId: 0}, this.port || self);
      self.emit = emit.bind({}, self);
      self.notify = notify.bind({}, self);
      self.alert = alert.bind({}, self);
      self.ping = ping.bind({}, self);
      return self;
    };
    bindFunc(self);

    /**
     * @param {string} url
     * @param {object} options
     * @returns {Promise}
     */
    self.xFetch = (url, options = {}) => {
      options = {...options, ...{signal: null}}; // remove AbortController
      if (url.startsWith(location.origin)) {
        return fetch(url, options);
      }
      return self.post({command: 'fetch', params: {url, options}});
    };
  };

  const workerUtil = {
    isAvailable,
    js: (q, ...args) => {
      const strargs = args.map(a => typeof a === 'string' ? a : a.toString);
      return String.raw(q, ...strargs);
    },
    env: params => {
      ({config, TOKEN, PRODUCT, netUtil, CONSTANT} =
        Object.assign({config, TOKEN, PRODUCT, netUtil, CONSTANT}, params));

      if (global) { ({config, TOKEN, PRODUCT, netUtil, CONSTANT} = global); }
    },
    create: function(func, options = {}) {
      let cache = this.urlMap.get(func);
      const name = options.name || 'Worker';
      if (!cache) {
        const src = `
        const PID = '${window && window.name || 'self'}:${location.href}:${name}:${Date.now().toString(16).toUpperCase()}';
        console.log('%cinit "%s"', 'font-weight: bold;', self.name || '');
        (${func.toString()})(self);
        `;
        const blob = new Blob([src], {type: 'text/javascript'});
        const url = URL.createObjectURL(blob);
        this.urlMap.set(func, url);
        cache = url;
      }

      if (options.type === 'SharedWorker') {
        const w = this.workerMap.get(func) || new SharedWorker(cache);
        this.workerMap.set(func, w);
        return w;
      }
      return new Worker(cache, options);
    }.bind({urlMap: new Map(), workerMap: new Map()}),


    /**
     * Promiseでやり取りできるworkerを生成する
     */
    createCrossMessageWorker: function(func, options = {}) {
      const promises = this.promises;
      const name = options.name || 'Worker';
      const PID = `${window && window.name || 'self'}:${location.host}:${name}:${Date.now().toString(16).toUpperCase()}`;

      const _func = `
      function (self) {
      let config = {}, PRODUCT, TOKEN, CONSTANT, NAME = decodeURI('${encodeURI(name)}'), bcast = {}, portMap = {};
      const {Handler, PromiseHandler, Emitter} = (${EmitterInitFunc.toString()})();
      (${func.toString()})(self);
      //===================================
      (${messageWrapper.toString()})(self);
      }
      `;
      const worker = workerUtil.create(_func, options);
      const self = options.type === 'SharedWorker' ? worker.port : worker;
      self.name = name;
      const onMessage = async function(self, e) {
        const {body, sessionId, status} = e.data;
        const {command, params} = body;
        // console.log('onMessage', sessionId, {body, status});
        try {
          let result = 'ok';
          let transfer = null;
          switch (command) {
            case 'commandResult':
              if (promises[sessionId]) {
                if (status === 'ok') {
                  promises[sessionId].resolve(params.result);
                } else {
                  promises[sessionId].reject(params.result);
                }
                delete promises[sessionId];
              }
              return;
            case 'ping':
                result = {now: Date.now(), NAME, PID, url: location.href};
                console.timeLog && console.timeLog(params.NAME, 'PONG');
                // console.log('pong!: %sms', Date.now() - params.now, params);
                break;
            case 'emit':
              global && global.emitter.emitAsync(params.eventName, params.data);
              break;
            case 'fetch':
              result = (netUtil || window).fetch(params.url,
                Object.assign({}, params.options || {}, {_format: 'arraybuffer'}));
              transfer = [result.buffer];
              break;
            case 'notify':
              global && global.notify(params.message);
              break;
            case 'alert':
              global && global.alert(params.message);
              break;
            default:
              self.oncommand && (result = await self.oncommand({command, params}));
              break;
          }
          self.postMessage({body: {command: 'commandResult', params: {command, result}}, sessionId, status: 'ok'}, transfer);
        } catch (err) {
          console.error('failed', {err, command, params, sessionId});
          self.postMessage({body: {command: 'commandResult', params: {command, result: err.message || null}}, sessionId, status: err.status || 'fail'});
        }
      };

      const bindFunc = (self, type = 'Worker') => {
        const post = function(self, body, options = {}) {
          const sessionId = `send:${name}:${type}:${this.sessionId++}`;
          return new Promise((resolve, reject) => {
              promises[sessionId] = {resolve, reject};
              self.postMessage({body, sessionId, TYPE: type, PID}, options.transfer);
              if (typeof options.timeout === 'number') {
                setTimeout(() => {
                  reject({status: 'fail', message: 'timeout'});
                  delete promises[sessionId];
                }, options.timeout);
              }
            }).finally(() => { delete promises[sessionId]; });
        };
        const ping = async function(self, options = {}) {
          const timekey = `PING "${self.name}" total time`;
          window.console.log(`PING "${self.name}"...`);
          let result;
          options.timeout = options.timeout || 10000;
          try {
          window.console.time(timekey);
          result = await self.post({command: 'ping', params: {now: Date.now(), NAME: self.name, PID, url: location.href}}, options);
          window.console.timeEnd(timekey);
          } catch (e) {
            console.timeEnd(timekey);
            console.warn('ping fail', e);
          }
          return result;
        };
        self.post = post.bind({sessionId: 0}, self);
        self.ping = ping.bind({}, self);
        self.addEventListener('message', onMessage.bind({sessionId: 0}, self));
        self.start && self.start();
      };
      bindFunc(self);

      if (config) {
        self.post({
          command: 'env',
          params: {config: config.export(true), TOKEN, PRODUCT, CONSTANT}
        });
      }

      self.addPort = (port, options = {}) => {
        const name = options.name || 'MessageChannel';
        return self.post({command: 'port', params: {port, name}}, {transfer: [port]});
      };
      const channel = new MessageChannel();
      self.addPort(channel.port2);
      bindFunc(channel.port1, {name: 'MessageChannel'});

      /**
       * Worker同士を繋げる
       * TODO: CrossDomainGate も対象にする
       */
      self.bridge = async (worker, options = {}) => {
        const name = options.name || 'MessageChannelBridge';
        const channel = new MessageChannel();
        await self.addPort(channel.port1, {name: worker.name || name});
        await worker.addPort(channel.port2, {name: self.name || name});
        console.log('ping self -> other', await channel.port1.ping());
        console.log('ping other -> self', await channel.port2.ping());
      };

      self.BroadcastChannel = basename => {
        const name = `${basename || 'Broadcast'}${TOKEN || Date.now().toString(16)}`;
        self.post({command: 'broadcast', params: {basename, name}});
        const channel = new BroadcastChannel(name);
        channel.addEventListener('message', onMessage.bind({}, channel, 'BroadcastChannel'));
        bindFunc(channel, 'BroadcastChannel');

        return name;
      };

      self.ping()
        .then(result => window.console.log('OK'))
        .catch(result => console.warn('FAIL', result));

      return self;
    }.bind({
      sessionId: 0,
      promises: {}
    })
  };
  return workerUtil;
})();
//===END===

export {workerUtil};
