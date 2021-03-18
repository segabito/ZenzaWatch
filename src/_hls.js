// ==UserScript==
// @name           ZenzaWatch HLS Support
// @namespace      https://github.com/segabito/
// @description    ZenzaWatchをHLSに対応させる
// @match          *://www.nicovideo.jp/*
// @match          *://blog.nicovideo.jp/*
// @match          *://ch.nicovideo.jp/*
// @match          *://com.nicovideo.jp/*
// @match          *://commons.nicovideo.jp/*
// @match          *://dic.nicovideo.jp/*
// @match          *://ex.nicovideo.jp/*
// @match          *://info.nicovideo.jp/*
// @match          *://uad.nicovideo.jp/*
// @match          *://*.nicovideo.jp/smile*
// @match          *://site.nicovideo.jp/*
// @match          *://anime.nicovideo.jp/*
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.upload.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @grant          none
// @author         segabito macmoto
// @version        0.0.20
// @noframes
// @require        https://cdn.jsdelivr.net/npm/hls.js@latest
// @run-at         document-start
// ==/UserScript==

import {AntiPrototypeJs} from '../packages/lib/src/infra/AntiPrototype-js';
import {Emitter} from '../packages/lib/src/Emitter';
import {workerUtil} from '../packages/lib/src/infra/workerUtil';

const MODULES = `
const ZenzaHLSmodules = {ErrorEvent, MediaError, HTMLDialogElement: window.HTMLDialogElement || HTMLDivElement, DOMException};
`;
// hls.js@latest だと再生が始まらない動画がたまにある。 0.8.9ならok

//@require AntiPrototypeJs
AntiPrototypeJs();

AntiPrototypeJs().then(() => {
  const PRODUCT = 'ZenzaWatchHLS';
  const monkey = (PRODUCT, {ErrorEvent, MediaError, HTMLDialogElement, DOMException}) => {
    const window = globalThis ? globalThis.window : window;
    const console = window.console;
    const VER = '0.0.1';
    const PopupMessage = {debug: () =>{}};
    const Array = window.PureArray || window.Array;
    let primaryVideo;

    console.log(`%c${PRODUCT} v:%s`, 'background: cyan;', VER);

    console.time('ZenzaWatch HLS');
//@require Emitter
//@require workerUtil

    const DEFAULT_CONFIG = {
      // hls.js 以外のパラメータ
      segment_duration: 4000, // dmc!
      use_native_hls: true,   // SafariなどブラウザがHLS対応だったらそっちを使う
      show_video_label: false, //
      autoAbrEwmaDefaultEstimate: true,
      hls_js_ver: 'latest',

      enable_db_cache: !true,
      cache_expire_time: 6 * 60 * 60 * 1000,

      // 以下、 hls.js 関連

      // なんとなくわかる物
      debug: false, // used by logger
      autoStartLoad: true, // used by stream-controller
      startLevel: -1, // undefined, // used by level-controller
      capLevelOnFPSDrop: false, // used by fps-controller
      capLevelToPlayerSize: false, // used by cap-level-controller
      maxBufferLength: 30, // used by stream-controller
      maxBufferSize: 60 * 1000 * 1000, // used by stream-controller
      maxMaxBufferLength: 600, //600, // used by stream-controller
      minAutoBitrate: 0, // used by hls
      abrEwmaFastVoD: 3, // used by abr-controller
      abrEwmaSlowVoD: 9, // used by abr-controller
      abrEwmaDefaultEstimate: 5e5, // 500 kbps  // used by abr-controller
      abrBandWidthFactor: 0.95, // used by abr-controller
      abrBandWidthUpFactor: 0.7, // used by abr-controller
      abrMaxWithRealBitrate: false, // used by abr-controller
      manifestLoadingTimeOut: 30000, // used by playlist-loader
      manifestLoadingMaxRetry: 3, // used by playlist-loader
      manifestLoadingRetryDelay: 3000, //1000, // used by playlist-loader
      manifestLoadingMaxRetryTimeout: 64000, // used by playlist-loader
      levelLoadingTimeOut: 10000, // used by playlist-loader
      levelLoadingMaxRetry: 4, // used by playlist-loader
      levelLoadingRetryDelay: 3000, //1000, // used by playlist-loader
      levelLoadingMaxRetryTimeout: 64000, // used by playlist-loader
      fragLoadingTimeOut: 20000, // used by fragment-loader
      fragLoadingMaxRetry: 5, //6 // used by fragment-loader
      fragLoadingRetryDelay: 1000, // used by fragment-loader
      fragLoadingMaxRetryTimeout: 64000, // used by fragment-loader

      // よくわからん物
      startPosition: -1, // used by stream-controller
      maxBufferHole: 0.5, // used by stream-controller
      maxSeekHole: 2, // used by stream-controller
      lowBufferWatchdogPeriod: 0.5, // used by stream-controller
      highBufferWatchdogPeriod: 3, // used by stream-controller
      nudgeOffset: 0.1, // used by stream-controller
      nudgeMaxRetry: 3, // used by stream-controller
      maxFragLookUpTolerance: 0.25, // used by stream-controller
      enableWorker: true, // used by demuxer
      enableSoftwareAES: true, // used by decrypter

      startFragPrefetch: false, // used by stream-controller
      fpsDroppedMonitoringPeriod: 5000, // used by fps-controller
      fpsDroppedMonitoringThreshold: 0.2, // used by fps-controller
      appendErrorMaxRetry: 3, // used by buffer-controller
      stretchShortVideoTrack: false, // used by mp4-remuxer
      maxAudioFramesDrift: 1, // used by mp4-remuxer
      forceKeyFrameOnDiscontinuity: true, // used by ts-demuxer
      maxStarvationDelay: 4, // used by abr-controller
      maxLoadingDelay: 4, // used by abr-controller
      emeEnabled: false, // used by eme-controller

      // 生放送関連っぽい物
      abrEwmaFastLive: 3, // used by abr-controller
      abrEwmaSlowLive: 9, // used by abr-controller
      initialLiveManifestSize: 1, // used by stream-controller
      liveSyncDurationCount: 3, // used by stream-controller
      liveMaxLatencyDurationCount: Infinity, // used by stream-controller
      liveSyncDuration: undefined, // used by stream-controller
      liveMaxLatencyDuration: undefined, // used by stream-controller
      liveDurationInfinity: false, // used by buffer-controller
    };
    DEFAULT_CONFIG.clone = (() => {
      return Object.assign({}, DEFAULT_CONFIG);
    });

    const dimport = Object.assign(url => {
      if (window.ZenzaWatch && window.ZenzaWatch.util && window.ZenzaWatch.util.dimport) {
        return window.ZenzaWatch.util.dimport(url);
      }
      if (dimport.map[url]) {
        return dimport.map[url];
      }
      const now = Date.now();
      const callbackName = `dimport_${now}`;
      const loader = `
        import * as module${now} from "${url}";
        console.log('%cdynamic import from "${url}"',
          'font-weight: bold; background: #333; color: #ff9; display: block; padding: 4px; width: 100%;');
        window.${callbackName}(module${now});
        `.trim();
      console.time(`"${url}" import time`);
      const p = new Promise(res => {
        const s = document.createElement('script');
        s.type = 'module';
        s.append(document.createTextNode(loader));
        s.dataset.import = url;
        window[callbackName] = module => {
          console.timeEnd(`"${url}" import time`);
          res(module);
          delete window[callbackName];
        };
        document.documentElement.append(s);
      });
      dimport.map[url] = p;
      return p;
    }, {map: {}});


    const Config = (() => {
      const config = {}, emitter = new Emitter();
      Object.keys(DEFAULT_CONFIG).forEach(key => {
        const storageKey = `ZenzaWatch_video.hls.${key}`;
        if (localStorage[storageKey]) {
          try {
            config[key] = JSON.parse(localStorage[storageKey]);
          } catch(e) {
            console.error(storageKey, localStorage[storageKey]);
            localStorage.removeItem(storageKey);
            config[key] = DEFAULT_CONFIG[key];
          }
        } else {
          config[key] = DEFAULT_CONFIG[key];
        }
      });

      return {
        raw: config,
        get: (key) => {
          return config[key];
        },
        set: (key, value) => {
          if (!DEFAULT_CONFIG.hasOwnProperty(key)) { return; }
          const storageKey = `ZenzaWatch_video.hls.${key}`;
            if (config[key] !== value) {
            config[key] = value;
            localStorage[storageKey] = JSON.stringify(value);
            emitter.emit(`update-${key}`, value);
            emitter.emit('update', {key, value});
          }
        },
        on: (...args) => { emitter.on(...args); },
        off: (...args) => { emitter.off(...args); },
        emit: (...args) => { emitter.emit(...args); }
      };
    })();

    const debounce = (func, interval) => {
      let timer;
      const result = (...args) => {
        if (timer) {
          timer = clearTimeout(timer);
        }
        timer = setTimeout(() => {
          func(...args);
        }, interval);
      };
      result.cancel = () => {
        if (timer) { timer = clearTimeout(timer); }
      };
      return result;
    };

    const throttle = (func, interval) => {
      let lastTime = 0;
      let lastArgs = null;
      let timer;
      const result = (...args) => {
        const now = performance.now();
        const timeDiff = now - lastTime;

        if (timeDiff < interval) {
          lastArgs = args;
          if (!timer) {
            timer = setTimeout(() => {
              lastTime = performance.now();
              timer = null;
              func.apply(null, lastArgs);
              lastArgs = null;
            }, Math.max(interval - timeDiff, 0));
          }
          return;
        }

        if (timer) {
          timer = clearTimeout(timer);
        }
        lastTime = now;
        lastArgs = null;
        func(...args);
      };
      result.cancel = () => {
        if (timer) {
          timer = clearTimeout(timer);
        }
      };
      return result;
    };


    const StorageWorker = function(self) {
      const Config = {
        cache_expire_time: 6 * 60 * 60 * 1000
      };

      class IndexDBStorage {
        static get name() { return 'zenza_hls'; }
        static get ver() { return 4; }
        static get storeNames() { return ['ts-data']; }

        static get expireTime() {
          return Config.cache_expire_time;
        }

        static getInstance() {
          if (this._instance) {
            return this._instance;
          }
          this._instance = new this();
          return this._instance;
        }

        static async init() {
          if (this.db) {
            return Promise.resolve(this.db);
          }
          return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.name, this.ver);
            req.onupgradeneeded = e => {
              const db = e.target.result;

              if(db.objectStoreNames.contains(this.name)) {
                db.deleteObjectStore(this.name);
              }

              const [meta] = this.storeNames;
              const store = db.createObjectStore(meta,
                {keyPath: 'expiresAt', autoIncrement: false});
              store.createIndex('hash', 'hash', {unique: true});
              store.createIndex('videoId', 'videoId', {unique: false});
            };

            req.onsuccess = e => {
              this.db = e.target.result;
              resolve(this.db);
            };

            req.onerror = reject;

          });
        }

        static close() {
          if (!this.db) {
            return;
          }
          this.db.close();
          this.db = null;
        }

        async getStore({mode} = {mode: 'readwrite'}) {
          return new Promise(async (resolve, reject) => {
            const db = await this.constructor.init();
            const [data] = this.constructor.storeNames;
            // window.console.log('getStore', this.storeName, mode);
            const tx = db.transaction(this.constructor.storeNames, mode);
            tx.oncomplete = resolve;
            tx.onerror = reject;
            return resolve({
              transaction: tx,
              store: tx.objectStore(data)
            });
          });
        }

        putRecord(store, record) {
          return new Promise((resolve, reject) => {
            const req = store.put(record);
            req.onsuccess = e => {
              resolve(e.target.result);
            };
            req.onerror = reject;
          });
        }

        getRecord(store, key, {index, timeout}) {
          return new Promise((resolve, reject) => {
            const req =
              index ?
                store.index(index).get(key) : store.get(key);
            req.onsuccess = e => {
              resolve(e.target.result);
            };
            req.onerror = reject;
            if (timeout) {
              setTimeout(() => reject(`timeout: key${key}`), timeout);
            }
          });
        }

        getCount(store, key, {index, timeout}) {
          return new Promise((resolve, reject) => {
            const req =
              index ?
                store.index(index).count(key) : store.count(key);
            req.onsuccess = e => {
              resolve(req.result);
            };
            req.onerror = err => resolve;
            if (timeout) {
              setTimeout(() => reject(`timeout: key${key}`), timeout);
            }
          });
        }

        deleteRecord(store, key, {index}) {
          return new Promise((resolve, reject) => {
            let deleted = 0;
            const range = IDBKeyRange.only(key);
            const req =
              index ?
                store.index(index).openCursor(range) : store.openCursor(range);
            req.onsuccess = e =>  {
              const result = e.target.result;
              if (!result) {
                return resolve(deleted > 0);
              }
              result.delete();
              deleted++;
              result.continue();
            };
            req.onerror = reject;
          });
        }

        async load({hash}) {
          try {
            const {store} =
              await this.getStore({mode: 'readonly'});
            const meta = await this.getRecord(store, hash,
              {index: 'hash', timeout: 3000});
            // this.constructor.close();
            if (!meta) {
              return null;
            }
            return meta;
          } catch(e) {
            console.warn('exeption', e);
            return null;
          }
        }

        async hasData({hash}) {
          try {
            const {store} = await this.getStore({mode: 'readonly'});
            return 0 < await this.getCount(store, hash, {index: 'hash', timeout: 3000});
          } catch(e) {
            console.warn('exeption', e);
            return false;
          }
        }

        async save({hash, videoId, meta}, buffer) {
          const now = Date.now();
          const expiresAt = now + this.constructor.expireTime;
          const record = {
            expiresAt,
            hash,
            videoId,
            expireDate: new Date(expiresAt).toLocaleString(),
            meta,
            updatedAt: now,
            buffer
          };
          // console.log('save', record);
          const {transaction, store} = await this.getStore();
          try {
            await this.deleteRecord(store, hash, {index: 'hash', record});
            const result = await this.putRecord(store, record);
            transaction.commit && transaction.commit();
            this.constructor.close();
            return result;
          } catch (e) {
            console.error('save fail', e);
            transaction.abort();
            return false;
          }
        }

        async gc() {
          if (this.isBusy) {
            return;
          }
          const now = Date.now();
          const {store, transaction} = await this.getStore();
          this.isBusy = true;
          const timekey = `storage gc:${new Date().toLocaleString()}`;
          console.time(timekey);
          return new Promise((resolve, reject) => {
            const range = IDBKeyRange.upperBound(now);
            const req = store.delete(range);
            req.onsuccess = e => {
              this.isBusy = false;
              this.constructor.close();
              console.timeEnd(timekey);
              transaction.commit && transaction.commit();
              resolve();
            };
            req.onerror = e => {
              reject(e);
              this.isBusy = false;
            };
          }).catch((e) => {
            this.isBusy = false;
            console.error('gc fail', e);
            store.clear();
          });
        }

        async clear() {
          console.time('storage clear');
          const {store} = await this.getStore();
          return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = e => {
              console.timeEnd('storage clear');
              resolve();
            };
            req.onerror = e => {
              console.timeEnd('storage clear');
              reject(e);
            };
          });
        }
      }

      const Storage = {
        async save({hash, videoId, meta}, buffer) {
          return IndexDBStorage.getInstance().save({hash, videoId, meta}, buffer);
        },
        async load(...args) {
          try {
            const result = await IndexDBStorage.getInstance().load(...args);
            // console.log('Storage load result', result);
            if (!result) {
              return null;
            }
            const buffer = result.buffer;
            return {meta: result.meta, buffer};
          } catch(e) {
            console.warn('Storage load fail', e);
            return null;
          }
        },
        async hasData(...args) {
          const result = await IndexDBStorage.getInstance().hasData(...args);
          return {result};
        },
        async gc() {
          if (navigator && navigator.locks) {
            return await navigator.locks.request('ZenzaHLS_GC', {ifAvailable: true}, async lock => {
              if (!lock) {
                return;
              }
              await IndexDBStorage.getInstance().gc();
              await new Promise(r => setTimeout(r, 5000));
            });
          } else {
            return IndexDBStorage.getInstance().gc();
          }
        },
        async clear() {
          return IndexDBStorage.getInstance().clear();
        }
      };

      self.onmessage = async e => {
        let result;
        const data = e.data.data;
        const id = e.data.id;
        let status = 'ok';
        try {
          switch (e.data.command) {
            case 'config':
              Object.assign(Config, e.data);
              return self.postMessage({id, result: 'ok'});
            case 'save':
              // let {hash, videoId, meta} = data;
              result = await Storage.save(data, e.data.buffer);
              return self.postMessage({id, result});
            case 'load':
              result = await Storage.load(data);
              if (!result) {
                return self.postMessage({id, status, result: null}, []);
              }
              return self.postMessage({id, status, result: result.meta, buffer: result.buffer}, [result.buffer]);
            case 'hasData':
                result = await Storage.hasData(data);
                if (!result) {
                  return self.postMessage({id, status, result: false});
                }
                return self.postMessage({id, status, result});
              case 'gc':
              Storage.gc();
              return self.postMessage({id, status, result: null});
            case 'clear':
              result = await Storage.clear();
              return self.postMessage({id, status, result});
          }
        } catch (err) {
          status = 'fail';
          return self.postMessage({e, id, status, result: err});
        }
      };
    };

    const createWebWorker = (func, {type, name} = {}) => {
      const src = func.toString().replace(/^function.*?{/, '').replace(/}$/, '');

      const blob = new Blob([src], {type: 'text/javascript'});
      const url = URL.createObjectURL(blob);

      if (type === 'SharedWorker') {
        return new SharedWorker(url, {name});
      }
      return new Worker(url, {name});
    };

    const Storage = {
      request: {},
      worker: null,
      onMessage(e) {
        const id = e.data.id;
        const request = this.request[id];
        if (!request) {
          window.console.warn('unkwnown request id', id);
          return;
        }
        delete this.request[id];
        switch (request.command) {
          case 'load':
            if (e.data.result) {
              return request.resolve([e.data.result, e.data.buffer]);
            } else {
              return request.resolve([null, null]);
            }
          default:
            return request.resolve(e.data.result);
        }
      },
      getId() {
        return `id:${Math.random()}-${performance.now()}`;
      },
      async sendRequest(command, data, buffer = null) {
        if (window.Prototype) {
          return Promise.resolve(null);
        }
        const id = this.getId();
        // window.console.info('sendrequest', command, data, buffer);
        return new Promise(resolve => {
          this.request[id] = {id, command, resolve};
          if (buffer) {
            this.worker.postMessage({id, command, data, buffer}, [buffer]);
          } else {
            this.worker.postMessage({id, command, data});
          }
        });
      },
      async setConfig(config) {
        return this.sendRequest('config', config);
      },
      async save({hash, videoId, meta}, buffer) {
        return this.sendRequest('save', {hash, videoId, meta}, buffer);
      },
      async load({hash}) {
        return await this.sendRequest('load', {hash});
      },
      async hasData({hash}) {
        return await this.sendRequest('hasData', {hash});
      },
      async gc() {
        if (Config.get('enable_db_cache') && !window.Prototype) {
          return this.sendRequest('gc', {});
        } else {
          return Promise.resolve();
        }
      },
      async clear() {
        return this.sendRequest('clear', {});
      }
    };
    Storage.worker = createWebWorker(StorageWorker, {name: 'ZenzaWatchHLSWorker'});
    Storage.worker.addEventListener('message', Storage.onMessage.bind(Storage));
    Storage.setConfig({cache_expire_time: Config.get('cache_expire_time')});
    Storage.gc = debounce(Storage.gc.bind(Storage), 10 * 1000);


    const ZenzaVideoElement = (({Hls, throttle}) => {
      // TODO: ニコニコ動画の仕様に依存する部分を切り離して、もう少し汎用的にする

      const PLAYER_MODE = {
        HLS_JS: 'HLS-JS',
        HLS_NATIVE: 'HLS-N',
        DEFAULT: 'N'
      };

      const HLS_ERROR_CODE = {
        ABORT:   MediaError.MEDIA_ERR_ABORTED           + 1000,
        NETWORK: MediaError.MEDIA_ERR_NETWORK           + 1000,
        DECODE:  MediaError.MEDIA_ERR_DECODE            + 1000,
        UNKNOWN: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED + 1000
      };

      // readonly の Event.target を無理やり書き換える (意味ないかも)
      const overrideTarget = (event, target) => {
        return event;
      };

      let FragmentLoaderClass;
      const createFragmentLoader = (Hls) => {

        const xhrSetup = (xhr, url) => {
          //xhr.timeout = config.timeout + 1000;
          //xhr.setRequestHeader('Cache-Control', 'force-cache');
          xhr.ontimeout = () => {
            window.console.log('xhr timeout', xhr, url);
          };
          xhr.open('GET', url, true);
        };
        const frag2hash = fragment => {
          const url = fragment.url;
          const levels = this.levels;

          const [path, videoId, level, sn] =
              /\/nicovideo-([a-z0-9]+)_.*\/([\d]+)\/ts\/([\d]+)\.ts/.exec(url);
          let rel = '';
          if (fragment.levelkey && fragment.levelkey.reluri) {
            const m = /h=(.*?)&/.exec(fragment.levelkey.reluri);
            rel = m ? `-${m[1]}` : '';
          }
          if (levels && levels[fragment.level]) {
            const {width, height, bitrate, attrs} = levels[fragment.level];
            const fps = attrs['FRAME-RATE'] ? `${attrs['FRAME-RATE']}fps` : '(unknown)fps';
            return {hash: `${videoId}-${width}x${height}-${bitrate}bps-${fps}-${sn}${rel}`, videoId};
          }
          return {hash: `${videoId}-${fragment.level}-${sn}${rel}`, videoId};
        };

        const hasCache = async fragment => {
          const {hash} = frag2hash(fragment);
          return await Storage.hasData({hash});
        };

        const preloadFragment = async (fragment, url) => {
          if (fragment.hasCache) {
            return true;
          }
          if (await hasCache(fragment)) {
            fragment.hasCache = true;
            return true;
          }
          if (fragment.failed >= 3) {
            return false;
          }
          const {level, sn} = fragment;

          const {hash, videoId} = frag2hash(fragment);

          const abc = new AbortController();
          const debounceTimeout = debounce(() => abc.abort(), 30000);

          const params = {
            method: 'GET',
            // mode: 'cors',
            // credentials: 'same-origin',
            cache: 'force-cache',
            signal: abc.signal,
          };
          const request = new Request(url, params);
          debounceTimeout();
          let res;
          for (let i = 0; i < 3; i++) {
            res = await fetch(request, params).catch(e => ({e}));
            if (res.ok && res.status !== 206) {
              break;
            }
            fragment.failed = i;
            const status = res.status;
            console.warn('fetch fail', {i, res, url, request, params});
            if (status >= 400 && status < 499) {
              break;
            }
            await new Promise(res => setTimeout(res, 3000));
          }
          if (!res.ok) {
            return;
          }
          const data = await res.arrayBuffer();
          debounceTimeout.cancel();

          const buffer = data.slice();
          fragment.hasCache = true;
          Storage.save({
            hash,
            videoId,
            meta: {
              contentLength: buffer.length,
              sn,
              resp: { url },
              level,
              total: buffer.length,
              stats,
              url: context.url
            }
          }, buffer);
          return true;
        };

        // hls.config.fLoader にはクラスのインスタンスではなく定義を渡す
        // loaderはexportされていないため、Hls.DefaultConfig.loader経由で継承する
        // @see https://github.com/video-dev/hls.js/blob/master/docs/API.md#loader
        let lastFragLoadingTime = 0;
        let BLOCK_INTERVAL = 3000;
        class FragmentLoader extends Hls.DefaultConfig.loader {


          constructor(config) {
            super(config);
            this._config = config;
            this._isAborted = false;
            this._isDestroyed = false;
            Storage.gc();
          }

          /***
           *
           * @param {{url: string, frag: fragment, responseType: string, progressData: boolean}} context
           * @param config
           * @param {{onSuccess: function, onError: function, onTimout: function, onProgress: function}} callbacks
           * @returns {*}
           */
          async load(context, config, callbacks) {
            if (!context.frag || !/\.ts/.test(context.url)) {
              window.console.info('unknown context', context.url, context);
              return super.load(context, config, callbacks);
            }

            const frag = context.frag;
            const level = frag.level;

            const {hash, videoId} = frag2hash(frag);

            const {onSuccess, onError} = callbacks;
            if (!context.rangeStart && !context.rangeEnd) {

              callbacks.onSuccess = async (resp, stats, context, details = null) => {
                const status = details instanceof XMLHttpRequest ? details.status : 200;

                if (status === 206
               //     buffer.byteLength !== contentLength
                ) {
                  console.warn('CONTENT LENGTH MISMATCH!', resp.data.slice().length, frag.loaded);//, contentLength);
                } else if (Config.get('enable_db_cache') && !window.Prototype) {
                  const buffer = resp.data.slice();
                  frag.hasCache = true;
                  Storage.save({
                    hash,
                    videoId,
                    meta: {
                      contentLength: context.frag.loaded,
                      sn: context.frag.sn,
                      resp: {
                        url: resp.url
                      },
                      level,
                      total: context.frag.loaded,
                      stats,
                      url: context.url
                    }
                  }, buffer);
                }

                onSuccess(resp, stats, context, details);
              };

              // prototype.js のあるページでは動かないどころかブラクラ化する
              if (Config.get('enable_db_cache')) {
                // console.log('***load', hash, Config.get('enable_db_cache'),window.Prototype);
                const [meta, buffer] = await Storage.load({hash});
                // console.log('cache?', !!meta, hash);
                if (meta) {
                  frag.hasCache = true;
                  return callbacks.onSuccess(
                    {url: meta.url, data: buffer }, meta.stats, context, null);
                }
              }
            }

            callbacks.onError = (resp /* = {code, text} */, context, xhr) => {
              if (this._isAborted) {
                console.warn('error after aborted', resp, context);
                onError({code: 0, text: `error after aborted ${resp.code}: ${resp.text}`}, context, xhr);
                return;
              }
              onError(resp, context, xhr);
            };

            return this._load(context, config, callbacks, this._config.fragLoadingMaxRetry);
          }

          /**
           * バッドノウハウの塊
           * シーク連打などで短時間に多量のアクセスがあると弾かれるようになるため、
           * クライアント側でウェイトをかける。
           */
          _load(context, config, callbacks, maxRetry = 3) {
            if (this._isDestroyed) {
              return;
            }
            const now = performance.now();
            const timeDiff = now - lastFragLoadingTime;

            const sn = context.frag.sn; // ts の番号が入ってる

            if (!this._isBoostTime(sn) && timeDiff < BLOCK_INTERVAL) {
              if (maxRetry > 0) {
                setTimeout(() => {
                    if (this._isAborted) { return; }
                    this._load(context, config, callbacks, maxRetry - 1);
                  },
                  Math.max(
                    this._config.fragLoadingRetryDelay, BLOCK_INTERVAL - timeDiff)
                );
              } else {
                callbacks.onError(
                  {code: 429, text: 'Too Many Requests(blocked)'},
                  context,
                  {status: 429, statusText: ''}
                );
              }
              return;
            }

            lastFragLoadingTime = now;
            super.load(context, config, callbacks);
          }

          abort() {
            this._isAborted = true;
            super.abort();
          }

          destroy() {
            this._isDestroyed = true;
            this._isAborted = true;
            super.destroy();
          }

          // 再生開始直後だけは自粛したくないタイム
          _isBoostTime(sn) {
            return sn <= 3;
          }

        }


        class FetchLoader extends Hls.DefaultConfig.loader {
          constructor(config) {
            super(config);
            this.config = config;
            this.onTimeout = this.onTimeout.bind(this);
          }

          abort () {
            if (!this.stats.success) {
              this.stats.aborted = true;
            }
            if (this.abortController) {
              this.abortController.abort();
            }
            this.abortController = null;
            if (this.timeoutTimer) {
              this.timeoutTimer.cancel();
            }
            this.timeoutTimer = null;
          }

          destroy () {
            this.abort();
          }

          async load(context, config, callbacks) {
            if (!context.frag || !/\.ts/.test(context.url)) {
              window.console.info('unknown context', context.url, context);
              return super.load(context, config, callbacks);
            }
            this.context = context;
            this.config = config;
            this.callbacks = callbacks;
            this.stats = { loader: 'fetch', trequest: performance.now(), retry: 0, loaded: 0 };
            this.retryDelay = config.retryDelay;


            this._load(context, config, callbacks);
          }

          async _load(context, config, callbacks) {
            const frag = context.frag;
            const level = frag.level;
            const {hash, videoId} = frag2hash(frag);
            const {onSuccess, onError} = callbacks;
            if (!context.rangeStart && !context.rangeEnd) {

              callbacks.onSuccess = async (resp, stats, context, details = null) => {
                const status = details instanceof XMLHttpRequest ? details.status : 200;

                if (status === 206
               //     buffer.byteLength !== contentLength
                ) {
                  console.warn('CONTENT LENGTH MISMATCH!', resp.data.length, frag.loaded);//, contentLength);
                } else if (Config.get('enable_db_cache') && !window.Prototype) {
                  const buffer = resp.data.slice();
                  frag.hasCache = true;
                  Storage.save({
                    hash,
                    videoId,
                    meta: {
                      contentLength: context.frag.loaded,
                      sn: context.frag.sn,
                      resp: {
                        url: resp.url
                      },
                      level,
                      total: context.frag.loaded,
                      stats,
                      url: context.url
                    }
                  }, buffer);
                }

                onSuccess(resp, stats, context, details);
              };

              // prototype.js のあるページでは動かないどころかブラクラ化する
              if (Config.get('enable_db_cache')) {
                // console.log('***load', hash, Config.get('enable_db_cache'),window.Prototype);
                const [meta, buffer] = await Storage.load({hash});
                // console.log('cache?', !!meta, hash);
                if (meta) {
                  return callbacks.onSuccess(
                    {url: meta.url, data: buffer }, meta.stats, context, null);
                }
              }
            }

            callbacks.onError = (resp /* = {code, text} */, context, xhr) => {
              if (this._isAborted) {
                console.warn('error after aborted', resp, context);
                onError({code: 0, text: `error after aborted ${resp.code}: ${resp.text}`}, context, xhr);
                return;
              }
              onError(resp, context, xhr);
            };

            this.loadInternal(context, config, callbacks);
          }

          async loadInternal() {
            const {stats, context, config, callbacks} = this;
            let url = context.url;

            const headers = {};

            if (context.rangeEnd) {
              headers['Range'] = `bytes=${context.rangeStart}-${context.rangeEnd - 1}`;
            }

            const abc = this.abortController = new AbortController();
            const params = {
              // method: 'GET',
              // mode: 'cors',
              // credentials: 'same-origin',
              cache: 'force-cache',
              signal: abc.signal,
              headers: new Headers(headers)
            };

            const debounceTimeout = debounce(this.onTimeout, this.config.timeout);
            this.timeoutTimer = debounceTimeout;
            // const onProgress = this.onProgress.bind(this);

            const request = new Request(url, params);
            let data;

            try {
              debounceTimeout();

              let res;
              for (let i = 0; i < Math.min(config.maxRetry, 3); i++) {
                res = await fetch(request, params);
                if (res.ok) {
                  break;
                }
                const status = res.status;
                console.warn('fetch fail', i, res, url, request, params);
                if (status >= 400 && status < 499) {
                  break;
                }
                await new Promise(res => setTimeout(res, this.retryDelay));
              }

              if (!res.ok) {
                throw new Error('fetch, bad network response. ' + res);
              }

              debounceTimeout();

              url = res.url;
              stats.total = parseInt(res.headers.get('Content-Length'), 10);
              stats.loaded = 0;
              stats.tfirst = Math.max(stats.trequest, performance.now());

              if ((context.responseType || 'arrayBuffer').toLowerCase() !== 'arraybuffer') {
                data = await res.text();
              } else {
                data = await res.arrayBuffer();
                // data = await new Response(new ReadableStream({
                //     start(controller) {
                //       const reader = res.body.getReader();
                //       let result, value, done;
                //       const read = async () => {
                //         do {
                //           result = await reader.read();
                //           // let {value, done} = result;
                //           debounceTimeout();

                //           const value = result.value;
                //           stats.loaded += value.byteLength;
                //           controller.enqueue(value);
                //           onProgress(value);
                //         } while (!result.done);
                //         controller.close();
                //       };
                //       read();
                //     }
                //   })
                // ).arrayBuffer();
              }
            } catch (e) {
              callbacks.onError({ text: e.message }, context);
            }

            debounceTimeout.cancel();
            this.timeoutTimer = null;
            this.abortController = null;

            if (data) {
              const len = typeof data === 'string' ? data.length : data.byteLength;
              Object.assign(stats, {
                success: true,
                tload: Math.max(stats.tfirst, performance.now()),
                loaded: len,
                total: len
              });
              callbacks.onSuccess({url, data}, stats, context);
            } else {
              this.abort();
            }
          }

          onTimeout() {
            console.warn('request timeout', this.stats, this.context);
            this.abort();
            this.callbacks.onTimeout(this.stats, this.context, null);
          }

          /**
           * @param {ArrayBuffer} data
           */
          onProgress(data) {
            const onProgress = this.callbacks.onProgress;
            if (onProgress) {
              onProgress(this.stats, this.context, data, null);
            }
          }

        }


        FragmentLoaderClass = FragmentLoader;
        FragmentLoaderClass.frag2hash = frag2hash;
        FragmentLoaderClass.hasCache = hasCache;
        FragmentLoaderClass.preloadFragment = FragmentLoaderClass;
        return FragmentLoaderClass;
      };
      /** @param  */
      const objectUrlMap = {}; // {url: ObjectURL, time: number}
      const keyclean = () => {
        const keys = Object.keys(objectUrlMap)
          .sort((a, b) => a.time - b.time);
        while (keys.length > 100) {
          const key = keys.shift();
          URL.revokeObjectURL(objectUrlMap[key].url);
          delete objectUrlMap[key];
        }
      };
      const overrideKeyloader = (hls) => {
        const keyloader = hls.coreComponents.find(h => h.hasOwnProperty('decryptkey'));
        if (!keyloader) {
          console.warn('keyloader not founnd', hls.coreComponents);
          return;
        }
        keyloader.onKeyLoading_org = keyloader.onKeyLoading.bind(keyloader)
        keyloader.onKeyLoading = function(data) {
          const uri = data.frag.decryptdata.uri;
          const objUrl = objectUrlMap[uri].url;
          if (objUrl) {
            data.frag.decryptdata.uri = objUrl;
          }
          return this.onKeyLoading_org(data);

        }.bind(keyloader);

        keyloader.loadsuccess_org = keyloader.loadsuccess.bind(keyloader);
        keyloader.loadsuccess = function(response, stats, context) {
          if (this.decrypturl.startsWith('blob')) {
            return this.loadsuccess_org(response, stats, context);
          }
          const blob = new Blob([new DataView(response.data)]);
          objectUrlMap[this.decrypturl] =
            {url: URL.createObjectURL(blob), time: Date.now()};
          keyclean();
          return this.loadsuccess_org(response, stats, context);
        }.bind(keyloader);

      };

      let idCounter = 0;

      const parseUrl = url => {
        const a = document.createElement('a');
        a.href = url;
        return a;
      };

      const compareHash = (url1, url2) => {
        console.log('compareHash\n"%s"\n"%s"', parseUrl(url1).search, parseUrl(url2).search);
        return parseUrl(url1).search === parseUrl(url2).search;
      };

      class ZenzaVideoElement extends HTMLElement {
        static get template() {
          return `
            <style>
              .root {
                width: 100%; height: 100%;
                display: contents;
              }
              video {
                width: 100%;
                height: 100%;
              }
              .label {
                position: absolute;
                z-index: 100;
                top: 16px;
                right: 32px;
                padding: 0 4px;
                font-size: 14pt;
                color: #000;
                background: #888;
                border: 1px solid #888;
                font-family: 'Arial Black';
                pointer-events: none;
                mix-blend-mode: luminosity;
                transition: 0.2s opacity;
                opacity: 0.5;
              }

              .label:empty {
                opacity: 0 !important;
                transition: none;
              }

              .is-playing .label {
                opacity: 0;
              }

              :host([show-video-label="on"]) .root .label:not(:empty) {
                opacity: 1 !important;
              }

              .label.blink {
                transform: rotateX(360deg);
                transition: 0.4s transform;
              }

            </style>
            <div class="root">
              <video></video>
              <div class="label"></div>
            </div>
          `;
        }

        constructor() {
          super();

          this._src = '';
          this._hls = null;
          this._hlsConfig = {};
          this._videoCount = 0;
          this._id = `id:${idCounter++}`;
          this._bufferStats = [];

          this._playerMode = PLAYER_MODE.DEFAULT;
          this._eventWrapperMap = new Map();

          const shadow = this._shadow = this.attachShadow({mode: 'open'});
          shadow.innerHTML = this.constructor.template;

          const root = this._root = shadow.querySelector('.root');
          const video = this._video = root.querySelector('video');
          this._label = root.querySelector('.label');

          video.addEventListener('playing', () => {
            root.classList.add('is-playing');
            this.label = `${this.playerMode}: ${this._video.videoWidth}x${this._video.videoHeight}`;
          });

          video.addEventListener('pause', () => {
            root.classList.remove('is-playing');
          });

          this._throttledCurrentTime = throttle(sec => {
            this._isSeeking = false;
            this._video.currentTime = sec;
          }, 500);

          this._resetPlayingStatus();

          this._bridgeProps(video, [
            'autoplay',
            'buffered',
            'crossOrigin',
            'controls',
            'controlslist',
            'currentSrc',
            //'currentTime',
            'defaultMuted',
            'defaultPlaybackRate',
            'duration',
            'ended',
            'loop',
            'muted',
            'networkState',
            'paused',
            'playbackRate',
            'played',
            'playsinline',
            'poster',
            'preload',
            'readyState',
            'seekable',
            //'seeking',
            'videoHeight',
            'videoWidth',
            'volume',

            'tagName',

            'fastSeek',
            'getVideoPlaybackQuality',
            'pause',
            //'play',
            'unload',
            'requestPictureInPicture'
          ]);
        }

        play() {
          if (this._isStalledBy403) {
            return Promise.reject(new DOMException('SessionClosedError'));
          }
          return this._video.play().catch(e => {
            //if (this._isForbidden403) {
            //  return Promise.reject(new DOMException('SessionClosedError'));
            //}
            return Promise.reject(e);
          });
        }

        get shadow() {
          return this._shadow;
        }

        get drawableElement() {
          // 使用例
          // ctx.drawImage(video.drawableElement || video, 0, 0);
          return this._video;
        }

        get currentTime() {
          if (this._isSeeking) {
            return this._seekingTime;
          }
          return this._video.currentTime;
        }

        set currentTime(v) {
          if (this.playerMode === PLAYER_MODE.HLS_JS &&
            this._hlsConfig.autoStartLoad === false) {
            this._hls.startLoad(v);
            return;
          }

          this._seekingTime = v;
          if (this.isInBuffer(v)) {
            // シーク先がバッファ内にある時は即反映
            this._isSeeking = false;
            this._throttledCurrentTime.cancel();
            this._video.currentTime = v;
          } else {
            // シーク連打時のネットワークアクセス抑制
            this._isSeeking = true;
            this._throttledCurrentTime(v);
            this.dispatchEvent(new Event('seeking'));
          }
        }

        isInBuffer(sec) {
          if (sec < this.currentTime) { return true; }
          const range = this.buffered;
          if (!range || !range.length) {
            return false;
          }
          try {
            for (let i = 0, len = range.length; i < len; i++) {
              const start = range.start(i);
              const end   = range.end(i);
              if (start <= sec && end >= sec) {
                return true;
              }
            }
          } catch(e) {
            console.error(e);
          }
          return false;
        }

        get seeking() {
          return this._isSeeking || this._video.seeking;
        }

        get src() {
          return this._src;
        }

        set src(v) {
          this._videoCount++;
          this._resetPlayingStatus();
          if (v === '' || v === '//') {
            this._src = '';
            this._destroyHLSJS();
            this._video.src = '';
            this.playerMode = PLAYER_MODE.DEFAULT;
            return;
          }

          if (/\.m3u8(|\?.*?)$/.test(v)) {
            if (this._useNativeHLS) {
              this._src = v;
              this.playerMode = PLAYER_MODE.HLS_NATIVE;
              this._video.src = v;
              return;
            }
            const hls = this._initHLSJS(v);

            this._src = v;
            //hls.loadSource(v);
            //hls.attachMedia(this._video);
            this.playerMode = PLAYER_MODE.HLS_JS;
            return;
          }

          this._src = v;
          this.playerMode = PLAYER_MODE.DEFAULT;
          this._video.src = v;
        }

        canPlayType(type) {
          switch(type) {
            case 'application/x-mpegURL':
            case 'vnd.apple.mpegURL':
              return Hls.isSupported() ? 'maybe' : '';
            default:
              return this._video.canPlayType(type);
          }
        }

        get error() {
          return this._error || this._video.error;
        }

        load() {
          if (this.playerMode === PLAYER_MODE.HLS_JS) {
            return;
          }
          this._video.load();
        }

        disconnectedCallback() {
          this._destroyHLSJS();
          for (let [func, events] of this._eventWrapperMap.entries()) {
            for (let eventName of Object.keys(events)) {
              this.removeEventListener(eventName, func);
            }
          }
          this._eventWrapperMap.clear();
        }

        setAttribute(attr, value) {
          this._video.setAttribute(attr, value);
          super.setAttribute(attr, value);
        }

        removeAttribute(attr) {
          this._video.removeAttribute(attr);
          super.removeAttribute(attr);
        }

        getAttribute(attr) {
          return this._video.getAttribute(attr);
        }

        addEventListener(eventName, callback, ...options) {
          const map = this._eventWrapperMap.get(callback) || {};

          if (map[eventName]) {
            return;
          }

          const wrapper = (event, ...args) => {
            callback(overrideTarget(event, this), ...args);
          };

          map[eventName] = wrapper;
          this._eventWrapperMap.set(callback, map);
          super.addEventListener(eventName, wrapper, ...options);
          this._video.addEventListener(eventName, wrapper, ...options);
        }

        removeEventListener(eventName, callback) {
          super.removeEventListener(eventName, callback);
          this._video.removeEventListener(eventName, callback);

          const map = this._eventWrapperMap.get(callback);
          if (!map || !map[eventName]) {
            return;
          }

          super.removeEventListener(eventName, map[eventName]);
          this._video.removeEventListener(eventName, map[eventName]);

          delete map[eventName];
          if (Object.keys(map).length < 1) {
            this._eventWrapperMap.delete(callback);
          }
        }

        _bridgeProps(obj, props = []) {
          props.forEach(prop => {
            if (!(prop in obj)) {
              return;
            }
            if (typeof obj[prop] === 'function') {
              this[prop] = (...args) => {
                return obj[prop](...args);
              };
            } else {
              Object.defineProperty(this, prop, {
                get() { return obj[prop]; }, set(v) { obj[prop] = v; }
              });
            }
          });
        }

        _resetPlayingStatus() {
          this._error = null;
          this._isForbidden403 = false;
          this._isStalledBy403 = false;
          this._error429Count = 0;
          this._seekingTime = 0;
          this._isSeeking = false;
          this._isBufferCompleted = false;
          this._throttledCurrentTime.cancel();
          this._bufferStats = [];
        }

        get _useNativeHLS() {
          return !!this._video.canPlayType('application/x-mpegURL') &&
            this.getAttribute('use-native-hls') === 'no';
        }

        set playerMode(v) {
          this._playerMode = v;
          this.label = v;
          super.setAttribute('data-player-mode', v);
        }

        get playerMode() {
          return this._playerMode;
        }

        get label() {
          return this._label.textContent;
        }

        set label(v) {
          if (this._label.textContent === v) { return; }
          this._label.textContent = v;
        }

        get hlsConfig() {
          return this._hlsConfig;
        }

        set hlsConfig(config) {
          this._hlsConfig = config;
          if (this._hls) {
            const hls = this._hls;
            Object.keys(config).forEach(prop => {
              if (prop in hls.config) {
                hls.config[prop] = config[prop];
              }
            });
          }
        }

        get hls() {
          return this._hls;
        }

        _destroyHLSJS() {
          if (this._hls) {
            this._hls.stopLoad();
            this._hls.detachMedia();
            this._hls.destroy();
            if (this._fragmentLoader) {
              delete this._hlsConfig.fLoader;
              delete this._fragmentLoader;
            }
            this._hls = null;
          }
        }

        _initHLSJS(src) {
          this._destroyHLSJS();

          if (!this._hls) {
            //if (this.dataset.usecase !== 'capture') {
            //if (Config.get('enable_db_cache') && !window.Prototype) {
            //  Storage.gc();
            //}
              //setTimeout(() => {Storage.gc(); }, 30000);
            //}
            this._fragmentLoader = createFragmentLoader(Hls);
            this._hlsConfig.fLoader = this._fragmentLoader;
            const hls = new Hls(this._hlsConfig);
            this._hls = hls;

            this._hls.on(Hls.Events.MANIFEST_PARSED,
              this._onHLSJSManifestParsed.bind(this));
            this._hls.on(Hls.Events.LEVEL_LOADED,
              this._onHLSJSLevelLoaded.bind(this));
            this._hls.on(Hls.Events.LEVEL_SWITCHED,
              this._onHLSJSLevelSwitched.bind(this));
            this._hls.on(Hls.Events.ERROR,
              this._onHLSJSError.bind(this));
            this._hls.on(Hls.Events.FRAG_LOADED,
              this._onHLSJSFragLoaded.bind(this));
            // this._hls.on(Hls.Events.FRAG_BUFFERED,
            //   this._onHLSJSFragBuffered.bind(this));
            this._hls.on(Hls.Events.BUFFER_EOS,
              this._onHLSJSBufferEOS.bind(this));
            this.dispatchEvent(new CustomEvent('init-hls-js', {detail: {hls: hls}}));
            this._hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              this._hls.loadSource(src);
            });
            // overrideKeyloader(hls);
            this._hls.attachMedia(this._video);
          }
          return this._hls;
        }

        _onHLSJSManifestParsed(eventName, data) {
          //console.log('%cHls.Events.MANIFEST_PARSED', 'background: cyan;', this._src);
          this._manifest = data;
          this._levelData = [];
          if (this._fragmentLoader) {
            this._fragmentLoader.levels = data.levels;
          }
          this.dispatchEvent(new Event('loadedmetadata'));
          this.dispatchEvent(new Event('canplay'));
        }

        _onHLSJSLevelLoaded(eventName, data) {
          //console.log('%cHls.Events.LEVEL_LOADED', 'background: cyan;', this._src);//, data);
          this._levelData[data.level] = data.details;
          this._bufferStats.length = data.details.endSN || 0;
        }

        _onHLSJSLevelSwitched()  {
          const hls = this._hls;
          const level = hls.levels[hls.currentLevel];

          const labelText = `${this.playerMode}: ${this._video.videoWidth}x${this._video.videoHeight}`;
          if (this.label !== labelText) {
            this.label = labelText;
            this._blinkLabel();
          }

          if (hls.levels.length > 1 && level && typeof level.bitrate === 'number') {
            this._hls.config.abrEwmaDefaultEstimate =
              this.hlsConfig.abrEwmaDefaultEstimate = Math.round(level.bitrate * 0.8);

            this.dispatchEvent(new CustomEvent('levelswitched', {detail: {
              level: hls.currentLevel,
              width: this._video.videoWidth,
              height: this._video.videoHeight,
              bitrate: level.bitrate
            }}));
          }
        }

        _onHLSJSFragBuffered(eventName, data) {
          const { trequest, tfirst, tbuffered, total} = data.stats;
          const { duration, level, sn } = data.frag;
          const totalTime = tbuffered - trequest;
          const transferKbps = Math.round((total * 8) / ((tbuffered - trequest) - (tfirst - trequest)));
          const dataKbps = Math.round((total * 8) / duration);
          this._bufferStats[sn] = {totalTime, transferKbps, dataKbps, level, sn};
          // console.log('rate', {totalTime, transferKbps, dataKbps, level, sn});
        }

        _blinkLabel() {
          this._label.classList.add('blink');
          setTimeout(() => { this._label.classList.remove('blink'); }, 1000);
        }

        // @see https://github.com/video-dev/hls.js/blob/master/docs/API.md#fifth-step-error-handling
        _onHLSJSError(e, data) {
          let errorUrl = (data.context && data.context.url) ? data.context.url : '';
          errorUrl = (!errorUrl && data.frag && data.frag.url) ? data.frag.url : '';
          // 時間差で前の動画のエラーが飛んできたら無視
          //if (errorUrl && !compareHash(errorUrl, this.src)) {
          //  //return;
          //}

          if (data.fatal) {
            return this._onHLSJSFatalError(e, data);
          }

          console.info('%cHls.Events.ERROR: WARN', 'background: cyan;',
            this._id,
            data.type,
            // data,
            `isForbidden403: ${this._isForbidden403}, isStalledBy403: ${this._isStalledBy403}, isSeeking: ${this._isSeeking}`
          );

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: {
              if (this._isBufferCompleted) { return; }
              const code = data.response ? data.response.code : 0;

              if (code === 429) {
                // 短時間でアクセスしすぎると出る
                this._error429Count++;
                // TODO: インターバルを伸ばす？ (そしていつ戻す？)
                //this._hls.config.fragLoadingRetryDelay += 500;
              } else if (code === 403) {
                // 403になるとそのセッションは死ぬ
                console.warn('Forbidden 403: %s\n%s', this._id, this.src);
                this._isForbidden403 = true;
                //this._hls.stopLoad();
              }
            }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if ([Hls.ErrorDetails.BUFFER_STALLED_ERROR,
                   Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE
                  ].includes(data.details)) {

                // 403でバッファも尽きた時はどうしようもないのでエラー飛ばす
                if (this._isForbidden403) {
                  this._isStalledBy403 = true;
                  const event = new ErrorEvent('error');
                  this._error = {
                    code: HLS_ERROR_CODE.NETWORK,
                    message: `403 Forbidden, ${data.details}`
                  };
                  this.dispatchEvent(overrideTarget(event, this));
                } else {
                 // this.dispatchEvent(new Event('stalled'));
                }
              }
              break;
          }
          return;
        }

        _onHLSJSFatalError(e, data) {
          console.error('%cHls.Events.ERROR: FATAL', 'background: cyan;', this._id,  data);
          let code;
          // サンプルコードではここで自動リカバーしているが、
          // サーバーの障害でエラーが起きてる場合は追加攻撃になりかねないので、やめておく
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              code = HLS_ERROR_CODE.NETWORK;
              if (this._isBufferCompleted) { return; }
              //hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              code = HLS_ERROR_CODE.DECODE;
              //hls.recoverMediaError();
              break;
            default:
              code = HLS_ERROR_CODE.UNKNOWN;
              break;
          }

          const event = new ErrorEvent('error');
          this._error = {
            code: HLS_ERROR_CODE.UNKNOWN,
            message: data.details
          };
          this.dispatchEvent(overrideTarget(event, this));
        }

        _onHLSJSFragLoaded() {
        }

        _onHLSJSBufferEOS() {
          this._isBufferCompleted = true;
          this.dispatchEvent(new CustomEvent('buffercomplete', {detail:
            {src: this._src}
          }));
        }
      }

      if (window.customElements) {
        window.customElements.define('zenza-video', ZenzaVideoElement);
      }
      if (!Hls) {
        const s = document.createElement('script');
        s.onload = () => {
          Hls = window.Hls;
          console.info('hls.js loaded:', window.Hls.version);
        };
        s.src = `https://cdn.jsdelivr.net/npm/hls.js@${Config.get('hls_js_ver')}`;
        // console.info('load hls.js from', s.src);
        (document.head || document.documentElement).append(s);
      } else {
        console.info('hls.js ready:', window.Hls.version);
      }
      return ZenzaVideoElement;
    })({Hls: window.Hls, throttle});


    const initDebugElements = (config, {html, render}) => {
      if (!HTMLDialogElement || !window.customElements) {
        return;
      }

      class VideoDebugInput extends HTMLElement {
        static get observedAttributes() { return ['value']; }

        static get props() {
          return [
            {name: 'name', type: 'string'},
            {name: 'value', type: 'string'},
          ];
        }

        constructor() {
          super();

          this._props = {};
          this.constructor.props.forEach(({name, type}) => {
            const attr = this.getAttribute(name);
            switch (type) {
              case 'boolean':
                this._props[name] = attr === 'true';
                break;
              case 'number':
                if (!attr) { return; }
                this._props[name] = parseFloat(attr);
                break;
              default:
                this._props[name] = attr;
            }
          });

          this._shadow = this.attachShadow({mode: 'open'});
          render(this.html(this._props), this._shadow);

          this._input = this._shadow.querySelector('input');
          this._root = this._shadow.querySelector('.root, input');
          this._details = this._shadow.querySelector('.details');
          this._detailsText = this._shadow.querySelector('.detailsText');
          const details = (this.getAttribute('details') || '').trim();
          this._details.hidden = !details;
          if (details) {
            this._detailsText.innerHTML = details.replace(/\n/g, '<br>');
          }

          const text = (this.getAttribute('text') || '').trim();
          if (text) {
            this._root.querySelector('.labelText').textContent = text;
          }
        }

        html(props) {
          return html`
            <input name="${props.name}" value="${props.value}">
            `;
        }

        set defaultValue(v) {
          this._defaultValue = v;
          this.setAttribute('default-value', v);
          this._root.classList.toggle('is-changed', this.value !== this.defaultValue);
        }

        set value(v) {
          if (this._props.value === v) { return; }
          this._props.value = v;
          this._input.value = v;
          this.setAttribute('value', v);
          this._input.setAttribute('data-value', v);
          this._root.classList.toggle('is-changed', this.value !== this.defaultValue);
          this.dispatchEvent(new Event('change'));
        }

        get name() {
          return this._props.name || '';
        }

        get value() {
          return this._props.value;
        }

        get defaultValue() {
          return this._defaultValue;
        }

        reset() {
          this.value = this.defaultValue;
        }

        attributeChangedCallback(attrName, oldVal, newVal) {
          if (attrName === 'value' && oldVal !== newVal) {
            this.value = newVal;
          }
        }
      }

      class VideoDebugCheckbox extends VideoDebugInput {
        static get props() {
          return [
            {name: 'name', type: 'string'},
            {name: 'value', type: 'boolean'}
          ];
        }

        constructor() {
          super();

          this._input.checked = this._props.value;
          this._input.addEventListener('change', () => {
            this.value = this._input.checked;
          });
        }

        html(props) {
          return html`
            <style>
              .root {
                display: block;
                position: relative;
                white-space: nowrap;
                padding: 8px 8px 16px;
              }

              .labelText {
                display: inline-block;
                text-align: right;
                font-family: monospace;
                padding: 0 8px;
              }

              .is-changed .labelText {
                font-weight: bolder;
                color: blue;
              }

              input[type=checkbox] {
                transform: scale(2);
                margin-right: 8px;
              }

              label {
                min-width: 300px;
                padding: 8px;
                cursor: pointer;
              }

              label:hover {
              }

              .details {
                padding-left: 16px;
              }
              .summary {
                outline: 0
              }
              .detailsText {
                color: #666;
              }


            </style>
            <div class="root">
              <label>
              <input type="checkbox" name="${props.name}">
                <span class="labelText">${props.name}<content></content></span>
              </label>
              <slot></slot>
              <details class="details">
                <summary class="summary">詳細</summary>
                <div class="detailsText"></div>
              </details>

            </div>
            `;
        }

        set value(v) {
          v = typeof v === 'boolean' ? v : (v === 'true');
          if (this._props.value === v) { return; }
          this._props.value = v;
          this._input.checked = v;
          this.setAttribute('value', v);
          this._root.classList.toggle('is-changed', v !== this.defaultValue);
          this.dispatchEvent(new Event('change'));
        }

        get value() {
          return this._props.value;
        }
      }
      window.customElements.define('video-debug-checkbox', VideoDebugCheckbox);

      class VideoDebugSlider extends VideoDebugInput {
        static get props() {
          return [
            {name: 'name', type: 'string'},
            {name: 'value', type: 'number'},
            {name: 'min', type: 'number'},
            {name: 'max', type: 'number'},
            {name: 'step', type: 'number'}
          ];
        }

        constructor() {
          super();

          this._input.addEventListener('input', () => {
            this.value = this._input.value;
          });
        }

        html(props) {
          return html`
            <style>
              .root {
                display: block;
                position: relative;
                white-space: nowrap;
                padding: 0 8px 16px;
              }
              .labelText {
                display: inline-block;
                text-align: right;
                font-family: monospace;
                padding: 0 16px;
              }

              .is-changed .labelText {
                font-weight: bolder;
                color: blue;
              }

              input[type=range] {
                position: relative;
                -webkit-appearance: none;
                min-width: 400px;
                vertical-align: baseline;
              }

              input[type=range]:focus,
              input[type=range]:active {
                outline: none;
              }

              input[type=range]::after {
                content: attr(data-value);
                position: absolute;
                bottom: 20px;
                right: 4px;
                transform: scale(1.2);
              }

              input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                pointer-events: none;
                position: relative;
                border: none;
                width: 16px;
                height: 16px;
                display: block;
                background-color: #262626;
                border-radius: 50%;
                -webkit-border-radius: 50%;
              }
              input[type=range]:active::-webkit-slider-thumb {
                box-shadow: 0 0 4px #888;
              }

              label {
                display: inline-block;
                min-width: 300px;
                cursor: pointer;
              }

              label:hover {
              }

              .details {
                padding-left: 16px;
              }
              .summary {
                outline: 0
              }
              .detailsText {
                color: #666;
              }

            </style>
            <div class="root">
            <label>
              <input type="range"
                min="${props.min}"
                max="${props.max}"
                step="${props.step}"
                value="${props.value}"
              >
              <span class="labelText">${props.name}<content></content></span>

            </label>
            <details class="details">
              <summary class="summary">詳細</summary>
              <div class="detailsText"></div>
            </details>
            </div>`;
        }

        set value(v) {
          v = parseFloat(v);
          const diff = Math.abs(this._props.value - v);
          if (diff <= 0.01) { return; }
          this._props.value = v;
          this._input.value = v;
          this.setAttribute('value', v);
          this._input.setAttribute('data-value', v.toLocaleString());
          this._root.classList.toggle('is-changed', this.value !== this.defaultValue);
          this.dispatchEvent(new Event('change'));
        }

        get value() {
          return this._props.value;
        }

      }
      window.customElements.define('video-debug-slider', VideoDebugSlider);

      class VideoDebugDialog extends HTMLElement {
        static get observedAttributes() {
          return [
            'enable_db_cache',
            'cache_expire_time',
            'debug',
            'startLevel',
            'capLevelOnFPSDrop',
            'capLevelToPlayerSize',
            'maxBufferLength',
            'maxBufferSize',
            'maxMaxBufferLength',
            'minAutoBitrate',
            'abrEwmaFastVoD',
            'abrEwmaSlowVoD',
            'abrEwmaDefaultEstimate',
            'abrBandWidthFactor',
            'abrBandWidthUpFactor',
            'abrMaxWithRealBitrate'
          ];
        }

        constructor() {
          super();
          this._hlsConfig = {};
          this._elm = {};
        }

        set hlsConfig(v) {
          this._hlsConfig = v;
          Object.keys(v).forEach(key => {
            if (this._elm[key]) {
              this._elm[key].value = v[key];
            }
            //this.setAttribute(key, v[key]);
          });
        }

        get hlsConfig() {
          return this._hlsConfig;
        }

        reset(config) {
          if (!this._shadow) { return; }
          Object.keys(this._elm).forEach(key => {
            if (config && config[key]) {
              this._elm[key].defaultValue = config[key];
            }
            this._elm[key].reset();
          });
        }

        get isOpen() {
          if (!this._root) { return; }
          return !!this._root.open;
        }

        open() {
          if (!this._root) { return; }
          if (!this._root.open) {
            this._root.showModal();
          }
        }

        close() {
          if (!this._root) { return; }
          if (this._root.open) {
            this._root.close();
          }
        }

        toggle() {
          if (!this._root) { return; }
          if (this.isOpen) {
            this.close();
          } else {
            this.open();
          }
        }

        connectedCallback() {
          if (!this._shadow) {
            this._shadow = this.attachShadow({mode: 'open'});
            render(this.html(this._hlsConfig), this._shadow);
            this._root = this._shadow.querySelector('.root');

            Array.from(
              this._shadow.querySelectorAll(
                'video-debug-checkbox, video-debug-slider')).forEach(elm => {
                  this._elm[elm.name] = elm;
                  elm.defaultValue = this.hlsConfig[elm.name];
                  elm.value = this.hlsConfig[elm.name];

                  elm.addEventListener('change', e => {
                    //this.setAttribute(e.target.name, e.target.value);
                    this.dispatchEvent(
                      new CustomEvent('change',
                        {detail: {name: e.target.name, value: e.target.value}})
                    );
                  });

              });
            this._root.addEventListener('click', this._onClick.bind(this));
          }
        }

        setValue(key, value) {
          if (this._elm && this._elm[key]) {
            this._elm[key].value = value;
          }
        }

        getValue(key) {
          if (this._elm && this._elm[key]) {
            return this._elm[key].value;
          }
        }

        _onClick(e) {
          const target = e.target;
          if (target === this._root) {
            this.close();
            return;
          }
          const commandElement = target.closest('[data-command]');
          if (!commandElement) {
            return;
          }
          const command = commandElement.getAttribute('data-command');
          //const param   = commandElement.getAttribute('data-param');
          switch (command) {
            case 'toggle':
              this.toggle();
              break;
            case 'save': {
              const config = {};
              Object.keys(this._elm).forEach(key => {
                config[key] = this._elm[key].value;
              });
              this.dispatchEvent(
                new CustomEvent('save', {detail: {config}}));
            }
              break;
            case 'reset':
              this.dispatchEvent(new CustomEvent('reset'));
              break;
            case 'clear-cache':
              if (target.classList.contains('is-busy')) {
                break;
              }
              target.classList.add('is-busy');
              Storage.clear();
              setTimeout(() =>  target.classList.remove('is-busy'), 5000);
              break;
            default:
              return;
          }
          e.preventDefault();
          e.stopPropagation();
        }

        attributeChangedCallback(attrName, oldVal, newVal) {
          if (this._elm[attrName]) {
            this._elm[attrName].value = newVal;
          }
        }
        //adoptedCallback() {}

        html(/* config */) {
          return html`
          <style>
            .root {
              position: fixed;
              width: 640px;
              max-height: 80vh;
              /*max-height: calc(100vh - 32px);*/
              /*top: 100vh;*/
              z-index: 10000;
              overflow-x: hidden;
              overflow-y: auto;
              /*transform: translate(0, -32px);*/
              background: rgba(240, 240, 240, 0.95);
              color: #000;
              padding: 0;
              border: 0;
              border-radius: 4px;
              transition: 0.2s transform ease, 0.2s box-shadow ease, 0.2s opacity;
              user-select: none;
              opacity: 1;
              box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.8);
              /* mix-blend-mode: hard-light;*/
            }

            .root::backdrop {
              /*
              background:
                linear-gradient(to bottom, rgba(0, 0, 80, 0.5), rgba(0, 0, 0, 0.5));
                */
              background: rgba(0, 0, 0, 0.2);
            }

            a {
              outline: none;
            }

            .dialogInner {
              padding: 0 8px 8px;
            }

            .title {
              padding: 0 8px;
              text-shadow: 2px 2px 2px #ccc;
            }

            .description {
              padding: 0px 8px 8px;
            }

            .buttomContainer {
              text-align: center;
            }

            button[data-command] {
              width: 100px;
              margin: 8px;
              padding: 8px;
              cursor: pointer;
              white-space: nowrap;
            }

            button[data-command="clear-cache"] {
              width: auto;
            }
            button[data-command="clear-cache"]:active,
            button[data-command="clear-cache"].is-busy {
              cursor: wait;
              opacity: 0.5;
            }

            .video-debug-checkbox {
              display: inline-block;
            }

          </style>
          <dialog class="root">
            <div class="dialogInner">
            <h1 class="title">HLS 設定</h1>
            <p class="description">
            設定はリロード後に反映されます。
            詳しいドキュメントは
            <a href="https://github.com/video-dev/hls.js/blob/master/docs/API.md#fine-tuning" target="_blank">こちら</a>
            </p>
            <video-debug-slider
              name="maxBufferLength"
              text="最少バッファ量(秒)"
              details="
最低限バッファを確保する量 (秒数指定)
↓と比較して大きいほうが確保される
          "
              min="0" max="300" step="5"></video-debug-slider>

            <video-debug-slider
              name="maxBufferSize"
              text="最少バッファ量(byte)"
              details="
最低限バッファを確保する量 (バイト数指定)
↑と比較して大きいほうが確保される
          "
              min="0" max="1000000000" step="1000"></video-debug-slider>

            <video-debug-slider
              name="maxMaxBufferLength"
              text="最大バッファ量(秒)"
              details="
バッファを確保する量の上限 (秒数指定)。
あまり大きな値を入れてもブラウザの制限に引っかかるので効果なし。
"
              min="0" max="1200" step="5"></video-debug-slider>

            <video-debug-slider
              name="minAutoBitrate"
              text="下限ビットレート"
              details="
自動画質選択時のビットレート下限。
これより低いビットレートは選択されなくなる。
          "
              min="0" max="6000000" step="100000"></video-debug-slider>

            <video-debug-slider
              name="startLevel"
              details="
自動画質再生時に最初に選択される画質。-1 はオート。
0 からは画質の低い順
"
              min="-1" max="4" step="1"></video-debug-slider>

            <video-debug-slider
              name="abrEwmaDefaultEstimate"
              details="
自動画質再生時に最初に見積もる回線速度。
大きめの値を入れると最初から高画質が選択されやすくなる。
          "
              min="0" max="6000000" step="1000"></video-debug-slider>

            <video-debug-checkbox
              name="autoAbrEwmaDefaultEstimate"
              text="abrEwmaDefaultEstimate の値を自動で調整する"
            ></video-debug-checkbox>


            <video-debug-checkbox
              name="capLevelOnFPSDrop"
              text="フレームレートが落ちたら画質を下げる"
            ></video-debug-checkbox>

            <video-debug-checkbox
              name="capLevelToPlayerSize"
              text="プレイヤーの表示サイズで画質を制限する"
            ></video-debug-checkbox>

            <video-debug-checkbox
              name="show_video_label"
              text="再生中に動画情報を表示"
            ></video-debug-checkbox>

            <video-debug-checkbox
              name="enable_db_cache"
              text="IndexedDBに動画データをキャッシュする(実験中)"
              details="画質ごとにキャッシュが作られるので、画質設定は「自動」以外を推奨"
            >
              <button type="button" data-command="clear-cache">
                キャッシュのクリア
              </button>
            </video-debug-checkbox>

            <video-debug-checkbox
              name="debug"
            ></video-debug-checkbox>

            <div class="buttomContainer">
              <button type="button" data-command="save">設定の保存</button>
              <button type="button" data-command="reset">リセット</button>
              <button type="button" data-command="toggle">閉じる</button>
            </div>
            </div>
          </dialog>`;
        }
      }

      window.customElements.define('video-debug-dialog', VideoDebugDialog);
      return VideoDebugDialog;
    };

    const ZenzaDetector = (() => {
      let ZenzaWatch = null;
      let emitter;

      const initialize = () => {
        if (emitter) { return; }
        emitter = new Emitter();
        const onBeforeZenzaReady = () => {
          ZenzaWatch = window.ZenzaWatch;
          emitter.emitResolve('beforeReady', ZenzaWatch);
        };

        const onZenzaReady = () => {
          ZenzaWatch = window.ZenzaWatch;
          emitter.emitResolve('beforeReady', ZenzaWatch);
          emitter.emitResolve('afterReady', ZenzaWatch);
        };

        if (window.ZenzaWatch) {
          onBeforeZenzaReady();
          if (window.ZenzaWatch.ready) {
            return onZenzaReady();
          }
        }
        window.addEventListener('BeforeZenzaWatchInitialize', onBeforeZenzaReady, {once: true});
        window.addEventListener('ZenzaWatchInitialize', onZenzaReady, {once: true});
      };

      const detect = (timing = 'ready') => {
        initialize();
        if (timing === 'beforeready') {
          return emitter.promise('beforeReady');
        } else {
          return emitter.promise('afterReady');
        }
      };

      return { initialize, detect};
    })();

    const initDebug = ({hlsConfig, html, render, ZenzaWatch}) => {
      ZenzaWatch.emitter.promise('videoControBar.addonMenuReady').then(({container}) => {
        const div = html`<div class="command controlButton" data-command="toggleHLSDebug">
            <div class="controlButtonInner">hls</div>
          </div>`;
        ZenzaWatch.util.addStyle(`
          .controlButton[data-command=toggleHLSDebug] {
            font-family: Avenir;
          }`, {className: 'ZenzaHLS'});
        container.append(div.getTemplateElement().content);
      });
      ZenzaWatch.emitter.promise('videoContextMenu.addonMenuReady.list').then(({container}) => {
        const li = html`<li class="command" data-command="toggleHLSDebug">HLS設定</li>`;
        container.append(li.getTemplateElement().content);
      });

      ZenzaWatch.emitter.once('command-toggleHLSDebug', () => {
        initDebugElements(hlsConfig, {html, render});
        const d = document.createElement('video-debug-dialog');
        d.className = 'zen-family';
        d.hlsConfig = hlsConfig;
        d.addEventListener('change', e => {
          if (e.detail.name === 'show_video_label') {
            Config.set(e.detail.name, e.detail.value);
            if (primaryVideo) {
              primaryVideo.setAttribute('show-video-label',
                e.detail.value ? 'on' : 'off');
            }
          } else if (e.detail.name === 'autoAbrEwmaDefaultEstimate') {
            Config.set(e.detail.name, e.detail.value);
          }
        });
        d.addEventListener('save', e => {
          const config = e.detail.config;
          Object.keys(config).forEach(key => {
            if (config[key] !== Config.get(key)) {
              Config.set(key, config[key]);
            }
          });
          if (primaryVideo) {
            primaryVideo.hlsConfig = config;
          }
        });
        d.addEventListener('reset', () => {
          const config = Object.assign({}, DEFAULT_CONFIG);
          d.reset(config);
          if (primaryVideo) {
            primaryVideo.hlsConfig = config;
          }
        });
        Config.on('update-abrEwmaDefaultEstimate', value => {
          if (typeof value !== 'number' || isNaN(value)) { return; }
          d.setValue('abrEwmaDefaultEstimate', value);
        });

        ZenzaWatch.debug.hlsDebugDialog = d;
        document.body.append(d);
        d.open();

        ZenzaWatch.emitter.on('command-toggleHLSDebug', () => {
          ZenzaWatch.debug.hlsDebugDialog.toggle();
        });
      });
    };

    const init = () => {
      console.log('%cinit ZenzaWatch HLS', 'background: cyan');

      const hlsConfig = Object.assign({}, Config.raw);
      Config.on('update', (key, value) => {
        hlsConfig[key] = value;
      });

      let lastLevel = -1;
      const createVideoElement = usecase => {
        if (!window.customElements) {
          return document.createElement('video');
        }
        const video =  document.createElement('zenza-video');
        if (usecase === 'capture') {
          //return null;
          // 静止画キャプチャ用なのにどんどんバッファするのは無駄なので抑える
          video.setAttribute('data-usecase', 'capture');
          video.hlsConfig = {
            autoStartLoad: false,
            // maxBufferSize: 0,
            // maxBufferLength: 5,
            // maxMaxBufferLength: 5,
            manifestLoadingRetryDelay: 5000,
            levelLoadingRetryDelay: 5000,
            fragLoadingRetryDelay: 5000,
            fragLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 1,
            abrEwmaDefaultEstimate: ZenzaWatch.debug.hlsConfig.abrEwmaDefaultEstimate,
            startLevel: lastLevel
          };
          video.addEventListener('init-hls-js', ({detail: {hls}}) => {
            hls.autoLevelCapping = lastLevel;
          });
        } else {
          video.setAttribute('show-video-label', Config.get('show_video_label') ? 'on' : 'off');
          video.hlsConfig = hlsConfig;
          video.addEventListener('levelswitched', e => {
            const detail = e.detail;
            //const kbps = Math.round(detail.bitrate * 10 / 1024) / 10;
            //console.log('Hls.Events.LEVEL_SWITCHED level: %s, size: %sx%s, %sKbps',
            //  detail.level,
            //  detail.width,
            //  detail.height,
            //  kbps
            //);
            lastLevel = detail.level;
            if (Config.get('autoAbrEwmaDefaultEstimate')) {
              ZenzaWatch.debug.hlsConfig.abrEwmaDefaultEstimate =
                Math.round(detail.bitrate * 0.8);
            }
          });
          primaryVideo = video;
        }
        video.setAttribute('use-native-hls', Config.get('use_native_hls') ? 'yes' : 'no');
        return video;
      };

      window.ZenzaHLS = {
        createVideoElement
      };

      ZenzaDetector.detect('beforeready').then(ZenzaWatch => {
        ZenzaWatch.debug.isHLSSupported = true;

        ZenzaWatch.debug.hlsConfig = {};
        Object.keys(Config.raw).forEach(key => {
          Object.defineProperty(ZenzaWatch.debug.hlsConfig, key, {
            get() { return Config.get(key); },
            set(v) { Config.set(key, v); }
          });
        });

        ZenzaWatch.debug.createVideoElement = createVideoElement;
        return ZenzaWatch;
      }).then(ZenzaWatch => {

        Promise.all([
          dimport('https://unpkg.com/lit-html@1.1.2/lit-html.js?module')
        ]).then(([{html, render}]) => {
          initDebug({hlsConfig, html, render, ZenzaWatch});
        });
        console.timeEnd('ZenzaWatch HLS');
      });
    };


    init();
  };

  try {
    if (Hls) {
      console.log('hls.js@%s required', Hls.version);
      window.Hls = Hls;
    } else
    if (window && !window.Hls) {
      const hlsjs = document.createElement('script');
      hlsjs.id = 'HLSJS_Loader';
      hlsjs.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      hlsjs.onerror = e => {
        const div = document.createElement('div');
        div.innerHTML = `
          <h2>* ZenzaWatch HLS *</h2>
          <a href="${hlsjs.src}" target="_blank">${hlsjs.src}</a> の読み込みに失敗しました。<br>
          他のアドオン等でブロックされている可能性があります。`;
        div.onclick = () => {
          div.remove();
        };
        Object.assign(div.style, {
          position: 'fixed', zIndex: '100000',
          bottom: '32px', left: '32px', padding: '8px',
          background: 'rgba(153, 0, 0, 0.8)', color: '#fff', fontWeight: 'bold'
        });
        document.documentElement.append(div);
      };
      document.documentElement.append(hlsjs);
    }
  } catch (e) {
    console.warn('ZenzaHLS: ', e);
  }
  const script = document.createElement('script');
  script.id = 'ZenzaWatchHLSLoader';
  script.setAttribute('charset', 'UTF-8');
  script.append(`
    ${MODULES}
    (${monkey})('${PRODUCT}', ZenzaHLSmodules);
  `);
  document.documentElement.append(script);
});

