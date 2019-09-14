// ==UserScript==
// @name           ZenzaWatch DEV版
// @namespace      https://github.com/segabito/
// @description    ZenzaWatchの開発 先行バージョン
// @match          *://www.nicovideo.jp/*
// @match          *://ext.nicovideo.jp/
// @match          *://ext.nicovideo.jp/#*
// @match          *://blog.nicovideo.jp/*
// @match          *://ch.nicovideo.jp/*
// @match          *://com.nicovideo.jp/*
// @match          *://commons.nicovideo.jp/*
// @match          *://dic.nicovideo.jp/*
// @match          *://ex.nicovideo.jp/*
// @match          *://info.nicovideo.jp/*
// @match          *://search.nicovideo.jp/*
// @match          *://uad.nicovideo.jp/*
// @match          *://api.search.nicovideo.jp/*
// @match          *://*.nicovideo.jp/smile*
// @match          *://site.nicovideo.jp/*
// @match          *://anime.nicovideo.jp/*
// @match          https://www.upload.nicovideo.jp/garage/*
// @match          https://www.google.co.jp/search*
// @match          https://www.google.com/search*
// @match          https://*.bing.com/search*
// @match          https://feedly.com/*
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @exclude        *://ext.nicovideo.jp/thumb/*
// @exclude        *://ext.nicovideo.jp/thumb_channel/*
// @grant          none
// @author         segabito
// @version        2.4.14
// @run-at         document-body
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js
// ==/UserScript==
/* eslint-disable */
const AntiPrototypeJs = function() {
	if (this.promise || !window.Prototype || window.PureArray) {
		return this.promise || Promise.resolve(window.PureArray || window.Array);
	}
	if (document.getElementsByClassName.toString().indexOf('B,A') >= 0) {
		console.info('%cI don\'t like prototype.js 1.5.x', 'font-family: "Arial Black";');
		delete document.getElementsByClassName;
	}
	const f = document.createElement('iframe');
	f.srcdoc = '<html><title>ここだけ時間が10年遅れてるスレ</title></html>';
	f.id = 'prototype';
	f.loading = 'eager';
	Object.assign(f.style, { position: 'absolute', left: '-100vw', top: '-100vh' });
	return this.promise = new Promise(res => {
		f.onload = res;
		document.documentElement.append(f);
	}).then(() => {
		window.PureArray = f.contentWindow.Array;
		delete window.Array.prototype.toJSON;
		delete window.String.prototype.toJSON;
		f.remove();
		return Promise.resolve(window.PureArray);
	}).catch(err => console.error(err));
}.bind({promise: null});
AntiPrototypeJs();
(() => {
  try {
    if (window.top === window) {
      window.ZenzaLib = { _ };
      console.log('@require', JSON.stringify({lodash: _.VERSION}));
    }
  } catch(e) {
    window.top === window && console.warn('@require failed!', location, e);
  }
})();

(function (window) {
  const self = window;
  'use strict';
  const PRODUCT = 'ZenzaWatch';
// 公式プレイヤーがurlを書き換えてしまうので読み込んでおく
  const START_PAGE_QUERY = (location.search ? location.search.substring(1) : '');
  const monkey = (PRODUCT, START_PAGE_QUERY) /*** (｀・ω・´)9m ***/ => {
    const Array = window.PureArray ? window.PureArray : window.Array;
    let console = window.console;
    let $ = window.ZenzaJQuery || window.jQuery, _ = window.ZenzaLib ? window.ZenzaLib._ : window._;
    let TOKEN = 'r:' + (Math.random());
    let CONFIG = null;
    const dll = {};
    const util = {};
    let {workerUtil, IndexedDbStorage, Handler, PromiseHandler, Emitter, parseThumbInfo, WatchInfoCacheDb, StoryboardCacheDb, VideoSessionWorker} = window.ZenzaLib;
    START_PAGE_QUERY = encodeURIComponent(START_PAGE_QUERY);
    var VER = '2.4.14';
    const ENV = 'DEV';


    console.log(
      `%c${PRODUCT}@${ENV} v${VER}`,
      'font-family: Chalkduster; font-size: 200%; background: #039393; color: #ffc; padding: 8px; text-shadow: 2px 2px #888;',
      '(ﾟ∀ﾟ) ｾﾞﾝｻﾞ!'
    );

const StorageWriter = (() => {
	const func = function(self) {
		self.onmessage = ({command, params}) => {
			const {obj, replacer, space} = params;
			return JSON.stringify(obj, replacer || null, space || 0);
		};
	};
	let worker;
	const prototypePollution = window.Prototype && Array.prototype.hasOwnProperty('toJSON');
	const toJson = async (obj, replacer = null, space = 0) => {
		if (!prototypePollution || obj === null || ['string', 'number', 'boolean'].includes(typeof obj)) {
			return JSON.stringify(obj, replacer, space);
		}
		worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'ToJsonWorker'});
		return worker.post({command: 'toJson', params: {obj, replacer, space}});
	};
	const writer = Symbol('StorageWriter');
	const setItem = (storage, key, value) => {
		if (!prototypePollution || value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
			storage.setItem(key, JSON.stringify(value));
		} else {
			toJson(value).then(json => storage.setItem(key, json));
		}
	};
	localStorage[writer] = (key, value) => setItem(localStorage, key, value);
	sessionStorage[writer] = (key, value) => setItem(sessionStorage, key, value);
	return { writer, toJson };
})();
const objUtil = (() => {
	const isObject = e => e !== null && e instanceof Object;
	return {
		bridge: (self, target, keys = null) => {
			(keys || Object.getOwnPropertyNames(target.constructor.prototype))
				.filter(key => typeof target[key] === 'function')
				.forEach(key => self[key] = target[key].bind(target));
		},
		isObject,
		toMap: (obj, mapper = Map) => {
			if (obj instanceof mapper) {
				return obj;
			}
			const map = new mapper();
			for(const key of Object.keys(obj)) {
				map.set(key, obj[key]);
			}
			return map;
		},
		mapToObj: map => {
			if (!(map instanceof Map)) {
				return map;
			}
			const obj = {};
			for (const [key, val] of map) {
				obj[key] = val;
			}
			return obj;
		}
	};
})();
const Observable = (() => {
	const observableSymbol = Symbol.observable || Symbol('observable');
	const nop = Handler.nop;
	class Subscription {
		constructor({observable, subscriber, unsubscribe, closed}) {
			this.callbacks = {unsubscribe, closed};
			this.observable = observable;
			const next = subscriber.next.bind(subscriber);
			subscriber.next = args => {
				if (this.closed || (this._filterFunc && !this._filterFunc(args))) {
					return;
				}
				return this._mapFunc ? next(this._mapFunc(args)) : next(args);
			};
			this._closed = false;
		}
		subscribe(subscriber, onError, onCompleted) {
			return this.observable.subscribe(subscriber, onError, onCompleted)
				.filter(this._filterFunc)
				.map(this._mapFunc);
		}
		unsubscribe() {
			this._closed = true;
			if (this.callbacks.unsubscribe) {
				this.callbacks.unsubscribe();
			}
			return this;
		}
		dispose() {
			return this.unsubscribe();
		}
		filter(func) {
			const _func = this._filterFunc;
			this._filterFunc = _func ? func : arg => func(_func(arg));
			return this;
		}
		map(func) {
			const _func = this._mapFunc;
			this._mapFunc = _func ? func : arg => func(_func(arg));
			return this;
		}
		get closed() {
			if (this.callbacks.closed) {
				return this._closed || this.callbacks.closed();
			} else {
				return this._closed;
			}
		}
	}
	class Subscriber {
		static create(onNext = null, onError = null, onCompleted = null) {
			if (typeof onNext === 'function') {
				return new this({
					next: onNext,
					error: onError,
					complete: onCompleted
				});
			}
			return new this(onNext || {});
		}
		constructor({start, next, error, complete} = {start:nop, next:nop, error:nop, complete:nop}) {
			this.callbacks = {start, next, error, complete};
		}
		start(arg) {this.callbacks.start(arg);}
		next(arg) {this.callbacks.next(arg);}
		error(arg) {this.callbacks.error(arg);}
		complete(arg) {this.callbacks.complete(arg);}
		get closed() {
			return this._callbacks.closed ? this._callbacks.closed() : false;
		}
	}
	Subscriber.nop = {start: nop, next: nop, error: nop, complete: nop, closed: nop};
	const eleMap = new WeakMap();
	class Observable {
		static of(...args) {
			return new this(o => {
				for (const arg of args) {
					o.next(arg);
				}
				o.complete();
				return () => {};
			});
		}
		static from(arg) {
			if (arg[Symbol.iterator]) {
				return this.of(...arg);
			} else if (arg[Observable.observavle]) {
				return arg[Observable.observavle]();
			}
		}
		static fromEvent(element, eventName) {
			const em = eleMap.get(element) || {};
			if (em && em[eventName]) {
				return em[eventName];
			}
			eleMap.set(element, em);
			return em[eventName] = new this(o => {
				const onUpdate = e => o.next(e);
				element.addEventListener(eventName, onUpdate, {passive: true});
				return () => element.removeEventListener(eventName, onUpdate);
			});
		}
		static interval(ms) {
			return new this(function(o) {
				const timer = setInterval(() => o.next(this.i++), ms);
				return () => clearInterval(timer);
			}.bind({i: 0}));
		}
		constructor(subscriberFunction) {
			this._subscriberFunction = subscriberFunction;
			this._completed = false;
			this._cancelled = false;
			this._handlers = new Handler();
		}
		_initSubscriber() {
			if (this._subscriber) {
				return;
			}
			const handlers = this._handlers;
			this._completed = this._cancelled = false;
			return this._subscriber = new Subscriber({
				start: arg => handlers.execMethod('start', arg),
				next: arg => handlers.execMethod('next', arg),
				error: arg => handlers.execMethod('error', arg),
				complete: arg => {
					if (this._nextObservable) {
						this._nextObservable.subscribe(this._subscriber);
						this._nextObservable = this._nextObservable._nextObservable;
					} else {
						this._completed = true;
						handlers.execMethod('complete', arg);
					}
				},
				closed: () => this.closed
			});
		}
		get closed() {
			return this._completed || this._cancelled;
		}
		filter(func) {
			return this.subscribe().filter(func);
		}
		map(func) {
			return this.subscribe().map(func);
		}
		concat(arg) {
			const observable = Observable.from(arg);
			if (this._nextObservable) {
				this._nextObservable.concat(observable);
			} else {
				this._nextObservable = observable;
			}
			return this;
		}
		forEach(callback) {
			let p = new PromiseHandler();
			callback(p);
			return this.subscribe({
				next: arg => {
					p.resolve(arg);
					p = new PromiseHandler();
					callback(p);
				},
				error: arg => {
					p.reject(arg);
					p = new PromiseHandler();
					callback(p);
			}});
		}
		onStart(arg) { this._subscriber.start(arg); }
		onNext(arg) { this._subscriber.next(arg); }
		onError(arg) { this._subscriber.error(arg); }
		onComplete(arg) { this._subscriber.complete(arg);}
		disconnect() {
			if (!this._disconnectFunction) {
				return;
			}
			this._closed = true;
			this._disconnectFunction();
			delete this._disconnectFunction;
			this._subscriber;
			this._handlers.clear();
		}
		[observableSymbol]() {
			return this;
		}
		subscribe(onNext = null, onError = null, onCompleted = null) {
			this._initSubscriber();
			const isNop = [onNext, onError, onCompleted].every(f => f === null);
			const subscriber = Subscriber.create(onNext, onError, onCompleted);
			return this._subscribe({subscriber, isNop});
		}
		_subscribe({subscriber, isNop}) {
			if (!isNop && !this._disconnectFunction) {
				this._disconnectFunction = this._subscriberFunction(this._subscriber);
			}
			!isNop && this._handlers.add(subscriber);
			return new Subscription({
				observable: this,
				subscriber,
				unsubscribe: () => {
					if (isNop) { return; }
					this._handlers.remove(subscriber);
					if (this._handlers.isEmpty) {
						this.disconnect();
					}
				},
				closed: () => this.closed
			});
		}
	}
	Observable.observavle = observableSymbol;
	return Observable;
})();
const WindowResizeObserver = Observable.fromEvent(window, 'resize')
	.map(o => { return {width: window.innerWidth, height: window.innerHeight}; });
const bounce = {
	origin: Symbol('origin'),
	raf(func) {
		let reqId = null;
		let lastArgs = null;
		const callback = () => {
			func(...lastArgs);
			reqId = lastArgs = null;
		};
		const result =  (...args) => {
			if (reqId) {
				cancelAnimationFrame(reqId);
			}
			lastArgs = args;
			reqId = requestAnimationFrame(callback);
		};
		result[this.origin] = func;
		return result;
	},
	idle(func, time) {
		let reqId = null;
		let lastArgs = null;
		const [caller, canceller] =
			(time === undefined && window.requestIdleCallback) ?
			[window.requestIdleCallback, window.cancelIdleCallback] : [window.setTimeout, window.clearTimeout];
		const callback = () => {
			reqId = null;
			func(...lastArgs);
			lastArgs = null;
		};
		const result = (...args) => {
			if (reqId) {
				reqId = canceller(reqId);
			}
			lastArgs = args;
			reqId = caller(callback, time);
		};
		result[this.origin] = func;
		return result;
	},
	time(func, time = 0) {
		return this.idle(func, time);
	}
};
class DataStorage {
	static create(defaultData, options = {}) {
		return new DataStorage(defaultData, options);
	}
	constructor(defaultData, options = {}) {
		this._default = defaultData;
		this._data = Object.assign({}, defaultData);
		this.prefix = `${options.prefix || 'DATA'}_`;
		this.storage = options.storage || localStorage;
		this._ignoreExportKeys = options.ignoreExportKeys || [];
		this.readonly = options.readonly;
		this.silently = false;
		this._changed = new Map();
		this._onChange = bounce.time(this._onChange.bind(this));
		objUtil.bridge(this, new Emitter());
		this.restore();
		this.props = this._makeProps(defaultData);
		this.logger = (self || window).console;
		this.consoleSubscriber = {
			next: (v, ...args) => this.logger.log('next', v, ...args),
			error: (e, ...args) => this.logger.warn('error', e, ...args),
			complete: (c, ...args) => this.logger.log('complete', c, ...args)
		};
	}
	_makeProps(defaultData = {}, namespace = '') {
		namespace = namespace ? `${namespace}.` : '';
		const self = this;
		const def = {};
		const props = {};
		Object.keys(defaultData).sort()
			.filter(key => key.includes(namespace))
			.forEach(key => {
				const k = key.slice(namespace.length);
				if (k.includes('.')) {
					const ns = k.slice(0, k.indexOf('.'));
					props[ns] = this._makeProps(defaultData, `${namespace}${ns}`);
				}
				def[k] = {
					enumerable: !this._ignoreExportKeys.includes(key),
					get() { return self.getValue(key); },
					set(v) { self.setValue(key, v); }
				};
		});
		Object.defineProperties(props, def);
		return props;
	}
	_onChange() {
		const changed = this._changed;
		this.emit('change', changed);
		for (const [key, val] of changed) {
			this.emitAsync('update', key, val);
			this.emitAsync(`update-${key}`, val);
		}
		this._changed.clear();
	}
	onkey(key, callback) {
		this.on(`update-${key}`, callback);
	}
	offkey(key, callback) {
		this.off(`update-${key}`, callback);
	}
	restore(storage) {
		storage = storage || this.storage;
		Object.keys(this._default).forEach(key => {
			const storageKey = this.getStorageKey(key);
			if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
				try {
					this._data[key] = JSON.parse(storage[storageKey]);
				} catch (e) {
					window.console.error('config parse error key:"%s" value:"%s" ', key, storage[storageKey], e);
				}
			} else {
				this._data[key] = this._default[key];
			}
		});
	}
	getNativeKey(key) {
		return key;
	}
	getStorageKey(key) {
		return `${this.prefix}${key}`;
	}
	refresh(key, storage) {
		storage = storage || this.storage;
		key = this.getNativeKey(key);
		const storageKey = this.getStorageKey(key);
		if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
			try {
				this._data[key] = JSON.parse(storage[storageKey]);
			} catch (e) {
				window.console.error('config parse error key:"%s" value:"%s" ', key, storage[storageKey], e);
			}
		}
		return this._data[key];
	}
	getValue(key, refresh) {
		if (refresh) {
			return this.refresh(key);
		}
		key = this.getNativeKey(key);
		return this._data[key];
	}
	setValue(key, value) {
		const _key = key;
		key = this.getNativeKey(key);
		if (this._data[key] === value || arguments.length < 2) {
			return;
		}
		const storageKey = this.getStorageKey(key);
		const storage = this.storage;
		if (!this.readonly && storage[StorageWriter.writer]) {
			storage[StorageWriter.writer](storageKey, value);
		} else if (!this.readonly) {
			try {
				storage[storageKey] = JSON.stringify(value);
			} catch (e) {
				window.console.error(e);
			}
		}
		this._data[key] = value;
		if (!this.silently) {
			this._changed.set(_key, value);
			this._onChange();
		}
	}
	setValueSilently(key, value) {
		const isSilent = this.silently;
		this.silently = true;
		this.setValue(key, value);
		this.silently = isSilent;
	}
	export(isAll = false) {
		const result = {};
		const _default = this._default;
		Object.keys(this.props)
			.filter(key => isAll || (_default[key] !== this._data[key]))
			.forEach(key => result[key] = this.getValue(key));
		return result;
	}
	exportJson() {
		return JSON.stringify(this.export(), null, 2);
	}
	import(data) {
		Object.keys(this.props)
			.forEach(key => {
				console.log('import data: %s=%s', key, data[key]);
				this.setValueSilently(key, data[key]);
		});
	}
	importJson(json) {
		this.import(JSON.parse(json));
	}
	getKeys() {
		return Object.keys(this.props);
	}
	clear() {
		this.silently = true;
		const storage = this.storage;
		Object.keys(this._default)
			.filter(key => !this._ignoreExportKeys.includes(key)).forEach(key => {
				const storageKey = this.getStorageKey(key);
				try {
					if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
						delete storage[storageKey];
					}
					this._data[key] = this._default[key];
				} catch (e) {}
		});
		this.silently = false;
	}
	namespace(name) {
		const namespace = name ? `${name}.` : '';
		const origin = Symbol(`${namespace}`);
		const result = {
			getValue: key => this.getValue(`${namespace}${key}`),
			setValue: (key, value) => this.setValue(`${namespace}${key}`, value),
			on: (key, func) => {
				if (key === 'update') {
					const onUpdate = (key, value) => {
						if (key.startsWith(namespace)) {
							func(key.slice(namespace.length + 1), value);
						}
					};
					onUpdate[origin] = func;
					this.on('update', onUpdate);
					return result;
				}
				return this.onkey(`${namespace}${key}`, func);
			},
			off: (key, func) => {
				if (key === 'update') {
					func = func[origin] || func;
					this.off('update', func);
					return result;
				}
				return this.offkey(`${namespace}${key}`, func);
			},
			onkey: (key, func) => {
				this.on(`update-${namespace}${key}`, func);
				return result;
			},
			offkey: (key, func) => {
				this.off(`update-${namespace}${key}`, func);
				return result;
			},
			props: this.props[name],
			refresh: () => this.refresh(),
			subscribe: subscriber => {
				return this.subscribe(subscriber)
					.filter(changed => changed.keys().some(k => k.startsWith(namespace)))
					.map(changed => {
						const result = new Map;
						for (const k of changed.keys()) {
							k.startsWith(namespace) && result.set(k, changed.get(k));
						}
						return result;
					});
			}
		};
		return result;
	}
	subscribe(subscriber) {
		subscriber = subscriber || this.consoleSubscriber;
		const observable = new Observable(o => {
			const onChange = changed => o.next(changed);
			this.on('change', onChange);
			return () => this.off('change', onChange);
		});
		return observable.subscribe(subscriber);
	}
	watch() {
		if (this.consoleSubscription) { return; }
		return this.consoleSubscription = this.subscribe();
	}
	unwatch() {
		this.consoleSubscription && this.consoleSubscription.unsubscribe();
		this.consoleSubscription = null;
	}
}
const Config = (() => {
	const DEFAULT_CONFIG = {
		debug: false,
		volume: 0.3,
		forceEnable: false,
		showComment: true,
		autoPlay: true,
		'autoPlay:ginza': true,
		'autoPlay:others': true,
		loop: false,
		mute: false,
		screenMode: 'normal',
		'screenMode:ginza': 'normal',
		'screenMode:others': 'normal',
		autoFullScreen: false,
		autoCloseFullScreen: true, // 再生終了時に自動でフルスクリーン解除するかどうか
		continueNextPage: false,   // 動画再生中にリロードやページ切り替えしたら続きから開き直す
		backComment: false,        // コメントの裏流し
		autoPauseCommentInput: true, // コメント入力時に自動停止する
		sharedNgLevel: 'MID',      // NG共有の強度 NONE, LOW, MID, HIGH, MAX
		enablePushState: true,     // ブラウザの履歴に乗せる
		enableHeatMap: true,
		enableCommentPreview: false,
		enableAutoMylistComment: false, // マイリストコメントに投稿者を入れる
		menuScale: 1.0,
		enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
		enableDblclickClose: true, //
		enableFullScreenOnDoubleClick: true,
		enableStoryboard: true, // シークバーサムネイル関連
		enableStoryboardBar: false, // シーンサーチ
		videoInfoPanelTab: 'videoInfoTab',
		fullscreenControlBarMode: 'auto', // 'always-show' 'always-hide'
		enableFilter: true,
		wordFilter: '',
		wordRegFilter: '',
		wordRegFilterFlags: 'i',
		userIdFilter: '',
		commandFilter: '',
		videoTagFilter: '',
		videoOwnerFilter: '',
		enableCommentPanel: true,
		enableCommentPanelAutoScroll: true,
		commentSpeedRate: 1.0,
		autoCommentSpeedRate: false,
		playlistLoop: false,
		commentLanguage: 'ja_JP',
		baseFontFamily: '',
		baseChatScale: 1.0,
		baseFontBolder: true,
		cssFontWeight: 'bold',
		allowOtherDomain: true,
		overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く
		'overrideWatchLink:others': false, // すべての動画リンクをZenzaWatchで開く
		speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
		speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す
		enableSingleton: false,
		loadLinkedChannelVideo: false,
		commentLayerOpacity: 1.0, //
		'commentLayer.textShadowType': '', // フォントの修飾タイプ
		'commentLayer.enableSlotLayoutEmulation': false,
		'commentLayer.ownerCommentShadowColor': '#008800', // 投稿者コメントの影の色
		overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
		enableGinzaSlayer: false, // まだ実験中
		lastPlayerId: '',
		playbackRate: 1.0,
		lastWatchId: 'sm9',
		message: '',
		enableVideoSession: true,
		videoServerType: 'dmc',
		autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
		dmcVideoQuality: 'auto',   // 優先する画質 auto, veryhigh, high, mid, low
		smileVideoQuality: 'default', // default eco
		useWellKnownPort: false, // この機能なくなったぽい (常時true相当になった)
		'video.hls.enable': true,
		'video.hls.segmentDuration': 6000,
		'video.hls.enableOnlyRequired': true, // hlsが必須の動画だけ有効化する
		enableNicosJumpVideo: true, // @ジャンプを有効にするかどうか
		'videoSearch.ownerOnly': true,
		'videoSearch.mode': 'tag',
		'videoSearch.order': 'desc',
		'videoSearch.sort': 'playlist',
		'videoSearch.word': '',
		'uaa.enable': true,
		'screenshot.prefix': '', // スクリーンショットのファイル名の先頭につける文字
		'search.limit': 300, // 検索する最大件数(最大1600) 100件ごとにAPIを叩くので多くするほど遅くなる
		'touch.enable': window.ontouchstart !== undefined,
		'touch.tap2command': '',
		'touch.tap3command': 'toggle-mute',
		'touch.tap4command': 'toggle-showComment',
		'touch.tap5command': 'screenShot',
		'navi.favorite': [],
		'navi.playlistButtonMode': 'insert',
		'navi.ownerFilter': false,
		'navi.lastSearchQuery': '',
		autoZenTube: false,
		bestZenTube: false,
		KEY_CLOSE: 27,          // ESC
		KEY_RE_OPEN: 27 + 0x1000, // SHIFT + ESC
		KEY_HOME: 36 + 0x1000, // SHIFT + HOME
		KEY_SEEK_LEFT: 37 + 0x1000, // SHIFT + LEFT
		KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
		KEY_SEEK_LEFT2: 99999999, // カスタマイズ用
		KEY_SEEK_RIGHT2: 99999999, //
		KEY_SEEK_PREV_FRAME: 188, // ,
		KEY_SEEK_NEXT_FRAME: 190, // .
		KEY_VOL_UP: 38 + 0x1000, // SHIFT + UP
		KEY_VOL_DOWN: 40 + 0x1000, // SHIFT + DOWN
		KEY_INPUT_COMMENT: 67, // C
		KEY_FULLSCREEN: 70, // F
		KEY_MUTE: 77, // M
		KEY_TOGGLE_COMMENT: 86, // V
		KEY_TOGGLE_LOOP: 82, // R 76, // L
		KEY_DEFLIST_ADD: 84,          // T
		KEY_DEFLIST_REMOVE: 84 + 0x1000, // SHIFT + T
		KEY_TOGGLE_PLAY: 32, // SPACE
		KEY_TOGGLE_PLAYLIST: 80, // P
		KEY_SCREEN_MODE_1: 49 + 0x1000, // SHIFT + 1
		KEY_SCREEN_MODE_2: 50 + 0x1000, // SHIFT + 2
		KEY_SCREEN_MODE_3: 51 + 0x1000, // SHIFT + 3
		KEY_SCREEN_MODE_4: 52 + 0x1000, // SHIFT + 4
		KEY_SCREEN_MODE_5: 53 + 0x1000, // SHIFT + 5
		KEY_SCREEN_MODE_6: 54 + 0x1000, // SHIFT + 6
		KEY_SHIFT_RESET: 49, // 1
		KEY_SHIFT_DOWN: 188 + 0x1000, // <
		KEY_SHIFT_UP: 190 + 0x1000, // >
		KEY_NEXT_VIDEO: 74, // J
		KEY_PREV_VIDEO: 75, // K
		KEY_SCREEN_SHOT: 83, // S
		KEY_SCREEN_SHOT_WITH_COMMENT: 83 + 0x1000, // SHIFT + S
	};
	if (navigator &&
		navigator.userAgent &&
		navigator.userAgent.match(/(Android|iPad;|CriOS)/i)) {
		DEFAULT_CONFIG.overrideWatchLink = true;
		DEFAULT_CONFIG.enableTogglePlayOnClick = true;
		DEFAULT_CONFIG.autoFullScreen = true;
		DEFAULT_CONFIG.autoCloseFullScreen = false;
		DEFAULT_CONFIG.volume = 1.0;
		DEFAULT_CONFIG.enableVideoSession = true;
		DEFAULT_CONFIG['uaa.enable'] = false;
	}
	return new DataStorage(
		DEFAULT_CONFIG,
		{
			prefix: PRODUCT,
			ignoreExportKeys: ['message', 'lastPlayerId', 'lastWatchId', 'debug'],
			readonly: !location || location.host !== 'www.nicovideo.jp',
			storage: localStorage
		}
	);
})();
Config.exportConfig = () => Config.export();
Config.importConfig = v => Config.import(v);
const NaviConfig = Config;
const uQuery = (() => {
	const endMap = new WeakMap();
	const elementEventsMap = new WeakMap();
	const HAS_CSSTOM = (window.CSS && CSS.number) ? true : false;
	const toCamel = p => p.replace(/-./g, s => s.charAt(1).toUpperCase());
	const emitter = new Emitter();
	const undef = Symbol('undef');
	const waitForDom = resolve => {
		if (['interactive', 'complete'].includes(document.readyState)) {
			return resolve();
		}
		document.addEventListener('DOMContentLoaded', resolve, {once: true});
	};
	const waitForComplete = resolve => {
		if (['complete'].includes(document.readyState)) {
			return resolve();
		}
		window.addEventListener('load', resolve, {once: true});
	};
	const isTagLiteral = (t,...args) =>
		Array.isArray(t) &&
		Array.isArray(t.raw) &&
		t.length === t.raw.length &&
		args.length === t.length - 1;
	const templateMap = new WeakMap();
	const createDom = (template, ...args) => {
		const isTL = isTagLiteral(template, ...args);
		if (isTL && templateMap.has(template)) {
			const tpl = templateMap.get(template);
			return document.importNode(tpl.content, true);
		}
		const tpl = document.createElement('template');
		tpl.innerHTML = isTL ? String.raw(template, ...args) : template;
		isTL && templateMap.set(template, tpl);
		return document.importNode(tpl.content, true);
	};
	const walkingHandler = {
		set: function (target, prop, value) {
			for (const elm of target) {
				elm[prop] = value;
			}
			return true;
		},
		get: function (target, prop) {
			const isFunc = target.some(elm => typeof elm[prop] === 'function');
			if (!isFunc) {
				const isObj = target.some(elm => elm[prop] instanceof Object);
				let result = target.map(elm => typeof elm[prop] === 'function' ? elm[prop].bind(elm) : elm[prop]);
				return isObj ? result.walk : result;
			}
			return (...args) => {
				let result = target.map((elm, index) => {
					try {
						return (typeof elm[prop] === 'function' ?
							elm[prop].apply(elm, args) : elm[prop]) || elm;
					} catch (error) {
						console.warn('Exception: ', {target, prop, index, error});
					}
				});
				const isObj = result.some(r => r instanceof Object);
				return isObj ? result.walk : result;
			};
		}
	};
	const isHTMLElement = elm => {
		return (elm instanceof HTMLElement) ||
			(elm.ownerDocument && elm instanceof elm.ownerDocument.defaultView.HTMLElement);
	};
	const isNode = elm => {
		return (elm instanceof Node) ||
			(elm.ownerDocument && elm instanceof elm.ownerDocument.defaultView.Node);
	};
	const isDocument = d => {
		return (d instanceof Document) || (d && d[Symbol.toStringTag] === 'HTMLDocument') ||
			(d.documentElement && d instanceof d.documentElement.ownerDocument.defaultView.Node);
	};
	const isEventTarget = e => {
		return (e instanceof EventTarget) ||
			(e[Symbol.toStringTag] === 'EventTarget') ||
			(e.addEventListener && e.removeEventListener && e.dispatchEvent);
	};
	const isHTMLCollection = e => {
		return e instanceof HTMLCollection || (e && e[Symbol.toStringTag] === 'HTMLCollection');
	};
	const isNodeList = e => {
		return e instanceof NodeList || (e && e[Symbol.toStringTag] === 'NodeList');
	};
	class $Array extends Array {
		get [Symbol.toStringTag]() {
			return '$Array';
		}
		get na() /* 先頭の要素にアクセス */ {
			return this[0];
		}
		get nz() /* 末尾の要素にアクセス */ {
			return this[this.length - 1];
		}
		get walk() /* 全要素のメソッド・プロパティにアクセス */ {
			const p = this._walker || new Proxy(this, walkingHandler);
			this._walker = p;
			return p;
		}
		get array() {
			return [...this];
		}
		toArray() {
			return this.array;
		}
		constructor(...args) {
			super();
			const elm = args.length > 1 ? args : args[0];
			if (isHTMLCollection(elm) || isNodeList(elm)) {
				for (const e of elm) {
					super.push(e);
				}
			} else if (typeof elm === 'number') {
				this.length = elm;
			} else {
				this[0] = elm;
			}
		}
		get htmls() {
			return this.filter(isHTMLElement);
		}
		*getHtmls() {
			for (const elm of this) {
				if (isHTMLElement(elm)) { yield elm; }
			}
		}
		get firstElement() {
			for (const elm of this) {
				if (isHTMLElement(elm)) { return elm; }
			}
			return null;
		}
		get nodes() {
			return this.filter(isNode);
		}
		*getNodes() {
			for (const n of this) {
				if (isNode(n)) { yield n; }
			}
		}
		get firstNode() {
			for (const n of this) {
				if (isNode(n)) { return n; }
			}
			return null;
		}
		get independency() {
			const nodes = this.nodes;
			if (nodes.length <= 1) {
				return nodes;
			}
			return this.filter(elm => nodes.every(e => e === elm || !e.contains(elm)));
		}
		get uniq() {
			return this.constructor.from([...new Set(this)]);
		}
		clone() {
			return this.constructor.from(this.independency.filter(e => e.cloneNode).map(e => e.cloneNode(true)));
		}
		find(query) {
			if (typeof query !== 'string') {
				return super.find(query);
			}
			return this.query(query);
		}
		query(query) {
			const found = this
				.independency
				.filter(elm => elm.querySelectorAll)
				.map(elm => $Array.from(elm.querySelectorAll(query)))
				.flat();
			endMap.set(found, this);
			return found;
		}
		mapQuery(map) {
			const $tmp = this
				.independency
				.filter(elm => elm.querySelectorAll);
			const result = [], e = [], $ = {};
			for (const key of Object.keys(map)) {
				const query = map[key];
				const found = $tmp.map(elm => $Array.from(elm.querySelectorAll(query))).flat();
				result[key] = key.match(/^_?\$/) ? found : found[0];
				$[key.replace(/^(_?)/, '$1$')] = found;
				e[key.replace(/^(_?)\$/, '$1')] = found[0];
			}
			return {result, $, e};
		}
		end() {
			return endMap.has(this) ? endMap.get(this) : this;
		}
		each(callback) {
			this.htmls.forEach((elm, index) => callback.apply(elm, [index, elm]));
		}
		closest(selector) {
			const result = this.query(elm => elm.closest(selector));
			return result ? this.constructor.from(result) : null;
		}
		parent() {
			const found = this
				.independency
				.filter(e => e.parentNode).map(e => e.parentNode);
			return found;
		}
		parents(selector) {
			let h = selector ? this.parent().closest(selector) : this.parent();
			const found = [h];
			while (h.length) {
				h = selector ? h.parent().closest(selector) : h.parent();
				found.push(h);
			}
			return $Array.from(h.flat());
		}
		toggleClass(className, v) {
			if (typeof v === 'boolean') {
				return v ? this.addClass(className) : this.removeClass(className);
			}
			const classes = className.trim().split(/\s+/);
			const htmls = this.getHtmls();
			for (const elm of htmls) {
				for (const c of classes) {
					elm.classList.toggle(c, v);
				}
			}
			return this;
		}
		addClass(className) {
			const names = className.split(/\s+/);
			const htmls = this.getHtmls();
			for (const elm of htmls) {
				elm.classList.add(...names);
			}
			return this;
		}
		removeClass(className) {
			const names = className.split(/\s+/);
			const htmls = this.getHtmls();
			for (const elm of htmls) {
				elm.classList.remove(...names);
			}
			return this;
		}
		hasClass(className) {
			const names = className.trim().split(/[\s]+/);
			const htmls = this.htmls;
			return names.every(
				name => htmls.every(elm => elm.classList.contains(name)));
		}
		_css(key, val) {
			const htmls = this.getHtmls();
			if (HAS_CSSTOM) {
				if (/(width|height|top|left)$/i.test(key) && /^[0-9+.]+$/.test(val)) {
					val = CSS.px(val);
				}
				try {
					for (const e of htmls) {
						if (val === '') { e.attributeStyleMap.delete(key); }
						else { e.attributeStyleMap.set(key, val); }
					}
				} catch (e) {
					window.console.warn('invalid style prop', key, val, e);
				}
			return this;
			}
			const camelKey = toCamel(key);
			if (/(width|height|top|left)$/i.test(key) && /^[0-9+.]+$/.test(val)) {
				val = `${val}px`;
			}
			for (const e of htmls) {
				e.style[camelKey] = val;
			}
			return this;
		}
		css(key, val) {
			if (typeof key === 'string') {
				return this._css(key, val);
			}
			for (const k of Object.keys(key)) {
				this._css(k, key[k]);
			}
			return this;
		}
		on(eventName, callback, options) {
			if (typeof callback !== 'function') {
				return this;
			}
			eventName = eventName.trim();
			const elementEventName = eventName.split('.')[0];
			for (const e of this.filter(isEventTarget)) {
				const elementEvents = elementEventsMap.get(e) || {};
				const listeners = elementEvents[eventName] = elementEvents[eventName] || [];
				if (!listeners.includes(callback)) {
					listeners.push(callback);
				}
				elementEventsMap.set(e, elementEvents);
				e.addEventListener(elementEventName, callback, options);
			}
			return this;
		}
		click(...args) {
			if (args.length) {
				const f = this.firstElement;
				f && f.click();
				return this;
			}
			const callback = args.find(a => typeof a === 'function');
			const data = args[0] !== callback ? args[0] : null;
			return this.on('click', e => {
				data && (e.data = e.data || {}) && Object.assign(e.data, data);
				callback(e);
			});
		}
		dblclick(...args) {
			const callback = args.find(a => typeof a === 'function');
			const data = args[0] !== callback ? args[0] : null;
			return this.on('dblclick', e => {
				data && (e.data = e.data || {}) && Object.assign(e.data, data);
				callback(e);
			});
		}
		off(eventName, callback) {
			if (!eventName) {
				for (const e of this.filter(isEventTarget)) {
					const elementEvents = elementEventsMap.get(e) || {};
					for (const eventName of Object.keys(elementEvents)) {
						this.off(eventName);
					}
					elementEventsMap.delete(e);
				}
				return this;
			}
			eventName = eventName.trim();
			const [elementEventName, eventKey] = eventName.split('.');
			if (!callback) {
				for (const e of this.filter(isEventTarget)) {
					const elementEvents = elementEventsMap.get(e) || {};
					for (let cb of (elementEvents[eventName] || [])) {
						e.removeEventListener(elementEventName, cb);
					}
					delete elementEvents[eventName];
					for (const key of Object.keys(elementEvents)) {
						if ((!eventKey && key.startsWith(`${elementEventName}.`)) || (!elementEventName && key.endsWith(`.${eventKey}`))
						) {
							this.off(key);
						}
					}
				}
				return this;
			}
			for (const e of this.filter(isEventTarget)) {
				const elementEvents = elementEventsMap.get(e) || {};
				elementEvents[eventName] = (elementEvents[eventName] || []).find(cb => {
					return cb !== callback;
				});
				let found = Object.keys(elementEvents).find(key => {
					const listeners = elementEvents[key] || [];
					if (key.startsWith(`${elementEventName}.`) && listeners.includes(callback)) {
						return true;
					}
				});
				if (found) { continue; }
				e.removeEventListener(elementEventName, callback);
			}
			return this;
		}
		_setAttribute(key, val = undef) {
			const htmls = this.getHtmls();
			if (val === null || val === '' || val === undef) {
				for (const e of htmls) {
					e.removeAttribute(key);
				}
			} else {
				for (const e of htmls) {
					e.setAttribute(key, val);
				}
			}
			return this;
		}
		setAttribute(key, val = undef) {
			if (typeof key === 'string') {
				return this._setAttribute(key, val);
			}
			for (const k of Object.keys(key)) {
				this._setAttribute(k, key[k]);
			}
			return this;
		}
		attr(key, val = undef) {
			if (val !== undef || typeof key === 'object') {
				return this.setAttribute(key, val);
			}
			const found = this.find(e => e.hasAttribute && e.hasAttribute(key));
			return found ? found.getAttribute(key) : null;
		}
		data(key, val = undef) {
			if (typeof key === 'object') {
				for (const k of Object.keys(key)) {
					this.data(k, JSON.stringify(key[k]));
				}
				return this;
			}
			key = `data-${key.toLowerCase()}`;
			if (val !== undef) {
				return this.setAttribute(key, JSON.stringify(val));
			}
			const found = this.find(e => e.hasAttribute && e.hasAttribute(key));
			const attr = found.getAttribute(key);
			try {
				return JSON.parse(attr);
			} catch (e) {
				return attr;
			}
		}
		prop(key, val = undef) {
			if (typeof key === 'object') {
				for (const k of Object.keys(key)) {
					this.prop(k, key[k]);
				}
				return this;
			} else if (val !== undef) {
				for (const elm of this) {
					elm[key] = val;
				}
				return this;
			} else {
				const found = this.find(e => e.hasOwnProperty(key));
				return found ? found[key] : null;
			}
		}
		val(v = undef) {
			const htmls = this.getHtmls();
			for (const elm of htmls) {
				if (!elm.hasAttribute('value')) {
					continue;
				}
				if (v === undef) {
					return elm.value;
				} else {
					elm.value = v;
				}
			}
			return v === undef ? '' : this;
		}
		hasFocus() {
			return this.some(e => e === document.activeElement);
		}
		focus() {
			const fe = this.firstElement;
			if (fe) {
				fe.focus();
			}
			return this;
		}
		blur() {
			const htmls = this.getHtmls();
			for (const elm of htmls) {
				if (elm === document.activeElement) {
					elm.blur();
				}
			}
			return this;
		}
		insert(where, ...args) {
			const fn = this.firstNode;
			if (!fn) {
				return this;
			}
			if (args.every(a => typeof a === 'string' || isNode(a))) {
				fn[where](...args);
			} else {
				const $d = uQuery(...args);
				if ($d instanceof $Array) {
					fn[where](...$d.filter(a => typeof a === 'string' || isNode(a)));
				}
			}
			return this;
		}
		append(...args) {
			return this.insert('append', ...args);
		}
		appendChild(...args) {
			return this.append(...args);
		}
		prepend(...args) {
			return this.insert('prepend', ...args);
		}
		after(...args) {
			return this.insert('after', ...args);
		}
		before(...args) {
			return this.insert('before', ...args);
		}
		text(text = undef) {
			const fn = this.firstNode;
			if (text !== undef) {
				fn && (fn.textContent = text);
			} else {
				return this.htmls.find(e => e.textContent) || '';
			}
			return this;
		}
		appendTo(target) {
			if (typeof target === 'string') {
				const e = document.querySelector(target);
				e && e.append(...this.nodes);
			} else {
				target.append(...this.nodes);
			}
			return this;
		}
		prependTo(target) {
			if (typeof target === 'string') {
				const e = document.querySelector(target);
				e && e.prepend(...this.nodes);
			} else {
				target.prepend(...this.nodes);
			}
			return this;
		}
		remove() {
			for (const elm of this) { elm.remove && elm.remove(); }
			return this;
		}
		show() {
			for (const elm of this) { elm.hidden = false; }
			return this;
		}
		hide() {
			for (const elm of this) { elm.hidden = true; }
			return this;
		}
		shadow(...args) {
			const elm = this.firstElement;
			if (!elm) {
				return this;
			}
			if (args.length === 0) {
				elm.shadowRoot || elm.attachShadow({mode: 'open'});
				return $Array(elm.shadowRoot);
			}
			const $d = uQuery(...args);
			if ($d instanceof $Array) {
				elm.shadowRoot || elm.attachShadow({mode: 'open'});
				$d.appendTo(elm.shadowRoot);
				return $d;
			}
			return this;
		}
	}
	const uQuery = (q, ...args) => {
		const isTL = isTagLiteral(q, ...args);
		if (isTL || typeof q === 'string') {
			const query = isTL ? String.raw(q, ...args) : q;
			return query.startsWith('<') ?
				new $Array(createDom(q, ...args).children) :
				new $Array(document.querySelectorAll(query));
		} else if (q instanceof Window) {
			return $Array.from(q.document);
		} else if (q instanceof $Array) {
			return q.concat();
		} else if (q[Symbol.iterator]) {
			return $Array.from(q);
		} else if (isDocument(q)) {
			return $Array.from(q.documentElement);
		} else {
			return new $Array(q);
		}
	};
	Object.assign(uQuery, {
		$Array,
		createDom,
		html: (...args) => new $Array(createDom(...args).children),
		isTL: isTagLiteral,
		ready: (func = () => {}) => emitter.promise('domReady', waitForDom).then(() => func()),
		complete: (func = () => {}) => emitter.promise('domComplete', waitForComplete).then(() => func()),
		each: (arr, callback) => Array.from(arr).forEach((a, i) => callback.apply(a, [i, a])),
		proxy: (func, ...args) => func.bind(...args),
		fn: {
		}
	});
	return uQuery;
})();
const uq = uQuery;

    const ZenzaWatch = {
      version: VER,
      env: ENV,
      debug: {},
      api: {},
      init: {},
      lib: { $: window.ZenzaLib.$ || $, _ },
      external: {},
      util,
      modules: {Emitter, Handler},
      config: Config,
      emitter: new Emitter(),
      state: {},
      dll
    };

    const Navi = {
      version: VER,
      env: ENV,
      debug: {},
      config: NaviConfig,
      emitter: new Emitter(),
      state: {}
    };
    delete window.ZenzaLib;

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
      window.Navi = Navi;
    } else {
      window.ZenzaWatch = {config: ZenzaWatch.config};
      window.Navi = {config: Navi.config};
    }
    window.ZenzaWatch.emitter = ZenzaWatch.emitter = new Emitter();
    const debug = ZenzaWatch.debug;
    const emitter = ZenzaWatch.emitter;

    // const modules = ZenzaWatch.modules;
const CONSTANT = {
	BASE_Z_INDEX: 100000,
	CONTROL_BAR_HEIGHT: 40,
	SIDE_PLAYER_WIDTH: 400,
	SIDE_PLAYER_HEIGHT: 225,
	BIG_PLAYER_WIDTH: 896,
	BIG_PLAYER_HEIGHT: 480,
	RIGHT_PANEL_WIDTH: 320,
	BOTTOM_PANEL_HEIGHT: 240,
	BLANK_VIDEO_URL: '//',
	BLANK_PNG: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABBAEAcCBlCwAAAABJRU5ErkJggg==',
	MEDIA_ERROR: {
		MEDIA_ERR_ABORTED: 1,
		MEDIA_ERR_NETWORK: 2,
		MEDIA_ERR_DECODE: 3,
		MEDIA_ERR_SRC_NOT_SUPPORTED: 4
	}
};
CONSTANT.BASE_CSS_VARS = (() => {
	const vars = {
		'base-bg-color': '#333',
		'base-fore-color': '#ccc',
		'light-text-color': '#fff',
		'scrollbar-bg-color': '#222',
		'scrollbar-thumb-color': '#666',
		'item-border-color': '#888',
		'hatsune-color': '#039393',
		'enabled-button-color': '#9cf'
	};
	const dt = new Date().toISOString();
		vars['scrollbar-thumb-color'] = vars['hatsune-color'];
	return '#zenzaVideoPlayerDialog, .zenzaRoot {\n' +
			Object.keys(vars).map(key => `--${key}:${vars[key]};`).join('\n') +
	'\n}';
})();
CONSTANT.COMMON_CSS = `
	${CONSTANT.BASE_CSS_VARS}
	.xDomainLoaderFrame {
		border: 0;
		position: fixed;
		top: -999px;
		left: -999px;
		width: 1px;
		height: 1px;
		border: 0;
		contain: paint;
	}
	.ZenButton {
		display: none;
		opacity: 0.8;
		position: absolute;
		z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
		cursor: pointer;
		font-size: 8pt;
		width: 32px;
		height: 26px;
		padding: 0;
		line-height: 26px;
		font-weight: bold;
		text-align: center;
		transition: box-shadow 0.2s ease, opacity 0.4s ease;
		user-select: none;
		transform: translate(-50%, -50%);
		contain: layout style;
	}
	.ZenButton:hover {
		opacity: 1;
	}
		.ZenButtonInner {
			background: #eee;
			color: #000;
			border: outset 1px;
			box-shadow: 2px 2px rgba(0, 0, 0, 0.8);
		}
		.ZenButton:active .ZenButtonInner {
			border: inset 1px;
			transition: translate(2px, 2px);
			box-shadow: 0 0 rgba(0, 0, 0, 0.8);
		}
	.ZenButton.show {
		display: inline-block;
	}
	.zenzaPopupMenu {
		display: block;
		position: absolute;
		background: var(--base-bg-color);
		color: #fff;
		overflow: visible;
		border: 1px solid var(--base-fore-color);
		padding: 0;
		opacity: 0.99;
		box-sizing: border-box;
		transition: opacity 0.3s ease;
		z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
		user-select: none;
	}
	.zenzaPopupMenu:not(.show) {
		transition: none;
		visibility: hidden;
		opacity: 0;
		pointer-events: none;
	}
	.zenzaPopupMenu ul {
		padding: 0;
	}
	.zenzaPopupMenu ul li {
		position: relative;
		margin: 2px 4px;
		white-space: nowrap;
		cursor: pointer;
		padding: 2px 8px;
		list-style-type: none;
		float: inherit;
	}
	.zenzaPopupMenu ul li + li {
		border-top: 1px dotted var(--item-border-color);
	}
	.zenzaPopupMenu li.selected {
		font-weight: bolder;
	}
	.zenzaPopupMenu ul li:hover {
		background: #663;
	}
	.zenzaPopupMenu ul li.separator {
		border: 1px outset;
		height: 2px;
		width: 90%;
	}
	.zenzaPopupMenu li span {
		box-sizing: border-box;
		margin-left: 8px;
		display: inline-block;
		cursor: pointer;
	}
	.zenzaPopupMenu ul li.selected span:before {
		content: '✔';
		left: 0;
		position: absolute;
	}
	.zenzaPopupMenu.show {
		opacity: 0.8;
	}
	.zenzaPopupMenu .caption {
		padding: 2px 4px;
		text-align: center;
		margin: 0;
		font-weight: bolder;
		background: #666;
		color: #fff;
	}
	.zenzaPopupMenu .triangle {
		position: absolute;
		width: 16px;
		height: 16px;
		border: 1px solid #ccc;
		border-width: 0 0 1px 1px;
		background: #333;
		box-sizing: border-box;
	}
	body.showNicoVideoPlayerDialog #external_nicoplayer {
		transform: translate(-9999px, 0);
	}
	#ZenzaWatchVideoPlayerContainer .atsumori-root {
		position: absolute;
		z-index: 10;
	}
	#zenzaVideoPlayerDialog.is-guest .forMember {
		display: none;
	}
	#zenzaVideoPlayerDialog .forGuest {
		display: none;
	}
	#zenzaVideoPlayerDialog.is-guest .forGuest {
		display: inherit;
	}
	.scalingUI {
		transform: scale(var(--zenza-ui-scale));
	}
`.trim();
CONSTANT.SCROLLBAR_CSS = `
	.videoInfoTab::-webkit-scrollbar,
	#listContainer::-webkit-scrollbar,
	.zenzaCommentPreview::-webkit-scrollbar,
	.mylistSelectMenuInner::-webkit-scrollbar {
		background: var(--scrollbar-bg-color);
		width: 16px;
	}
	.videoInfoTab::-webkit-scrollbar-thumb,
	#listContainer::-webkit-scrollbar-thumb,
	.zenzaCommentPreview::-webkit-scrollbar-thumb,
	.mylistSelectMenuInner::-webkit-scrollbar-thumb {
		border-radius: 0;
		background: var(--scrollbar-thumb-color);
		will-change: transform;
	}
	.videoInfoTab::-webkit-scrollbar-button,
	#listContainer::-webkit-scrollbar-button,
	.zenzaCommentPreview::-webkit-scrollbar-button,
	.mylistSelectMenuInner::-webkit-scrollbar-button {
		display: none;
	}
`.trim();
const NICORU = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAGh0lEQVRIS3VWeWxUxxn/zbxjvWuvvV4vXp9g43OddTB2EYEWnEuKgl3USqRHIpRIbVS7KapUmSbUIUpBBIjdtGpKHan9p0IkkQhNGtlUFaWFkGIi4WJq8BqMbQ4fuz7WV3bt3fdmXjWza8uozZOe3ryZb77fd/zm+4bgfx8VgCmmczN21HocoefiLFYfnI3VzBtBu5jP0HKWcjJtvbpiuzgd9Z6emL/076Sa1b0raska/WJMATBgp6/MM9o+MjO1y7QWV0W2Fmly/MVdY3VOJU4UZ607Ozhd0AJ8FgCgAOAALCG0AiC+4uUObXOT13mvYyQcFuv8t3sL2PbKdJrr0qnTpkj5xRizJubivHtgge87OSoU0mK3G6HFDc1R49p7SUMFgLUCIIRYul59yKENHQxGomj/fr6xd0e2lu3RAUIBzgEujUqYQhNbJ6fjOHlp0mj5YEzLSXUgapQcXoj3vZH0hAkpGTcbrWvKtA90BCMRs6ullO7akkW5YWEuwqSzKTpBio0mHQfiJgfnFuw2CqJSnL06wxva7vCc1FR1dqmyOcZ7hCdq0oOnfcXu6/0j4Sl0tpTyhq3rqBU3cerSFE6cC8KhEzzzqAs/3ZUPm41iaGwJv+oag6YAlBLs/2Yh8nId6Oqe5I3td2ixex1GwpuqgL8HJECZp7xzcPp2Q9v38o2WbxVq3OQyQ8c+foDXz0zIUHxnSzr++KMyONNVdPfPY/ubA6uJvnm8GlXr7TJ07Z+MGfs/HNPKPOVdg9O3G0luxpO104vXegw+y4MnNlNvlgZmchBQvNM5iv0fjktFP9jpwm9eKkFaqoqrtxaw5Y0AqrwU/SGOW21+lBc4pFwobCDnlWtco5nU49xcR/y5/rduTNw48O7eAuMnjfkaMxgoIbAsgl93jqIlCfByvQvvvPgwQE2+gt4xhoG2alQU2mEaFlSd4nedY8a+k6OaP9d/lFRkl1y+NTm07eqRKlZX5lRYjIOKXFoEh8/cx5sfB6VljZuceH9fuQzRlf55bFsTov63q+FbnwSwUfQMLrKvtfYrFdkl3cSl50fn4mP28RM1Vm6WTpgJECJYaOHcf+Zxvm8WCgX8hWnYs9UDTSeYmInj054wrCS7dte54XbqYJxBUalYt/Je6RW6l0SSra+X6PjrgWo4UxVwJgASfCeEgHHhDaAKMnMLMjvCAvGKheSXi7EFUAVYjDA8e7QP/xqKyyNjPVVpw6c/98ORokpuCwCx73zfPL4YXJTeVBWmoqE2CwolmF00cerzEJbiDAYDvrvNg5I8OxiDXI8um9j99g2cH4iBKMQTYda0I/RejZXt0gmXIbJkDg59dA+//CQkvXnpGxno+GEZUlIohsdjKPnZ9VWanjtQjqc3uWEaDKpGMDkXt7xNvUJ3lJS6vZfvhEPbAm3VrHK9Q3mIRV2jaPkgQdOWZz04+nwxVBvFg4llbGntQ1Ya0B/kuPB6Ber9GassGrgfZb79fUqp29tNavK9b/WOhQ6c+nGR8fzjXs2McZlU4cHac9D8pAut3y6CQ1cwMrWMHYcCyEkDhsMc/2ytwOPVSQAbxfsXQsYLv7+r1eR7jxKfZ0NtYPp+z/YSjf+ttZqmrcnDkT/fx8EziRCJx5+nSQovxS0MTsqWIZ9//KICTzyaATALX8Y4njnSxy8PGdTnWV8nS4XPm9oZCEUaTu/baOzZ6dWMZROaQvH5wByO/WUcMcPEcpzDYFx6JkB0lUBXKSrzHHhtdyHysjQQjeKjS1PGc+8Oaz5valcgFGmUAFl6ViVR5gLTSwz9xx/hvo3p1Fw2ZagiMY54XNQmskpfsUcCEQJ7CpHGKDYFgeEFXvXqTeqxK7CYyzcTnxlYLddFmY6mu7PRDkUhZuD4I7Rsg1NW1ITF4lxQIHk+Em1EeJM4BtBUDN5b5L5Xb3LGLLUo09F8dza6tlzLNseK3eqhkbB5UFh4/rVyo97v0hSdyNhaPEHdxAG0QETDUQhY3MLFG3PGU8duy35a7FYPj4TNhxqO3LPSMjdmak3jC0bHMgNe3uniL9bnsMoCB013UKqpiTZmmNxaiHI+MBrlf7oYVP7w2RxNUYC8dK15eNb4vy1zBUQ2/dw03edKZe2BENuV4AnBC485UZpjk393gjGcuiIuA4mS4vMqZ+ciSsvEl/GvbPqrlFtpoWLisQ1abYxbe649MJ8AsAmAvLYAWAJwfXOBesGmkNNX7hlfeW35LyB037N9NspNAAAAAElFTkSuQmCC';
const global = {
  emitter, debug,
  external: ZenzaWatch.external, PRODUCT, TOKEN, CONSTANT,
  notify: msg => ZenzaWatch.external.execCommand('notify', msg),
  alert: msg => ZenzaWatch.external.execCommand('alert', msg),
  config: Config,
  api: ZenzaWatch.api
};
const reg = (() => {
	const $ = Symbol('$');
	const undef = Symbol.for('undefined');
	const MAX_RESULT = 30;
	const smap = new WeakMap();
	const self = {};
	const reg = function(regex = undef, str = undef) {
		const {results, last} = smap.has(this) ?
			smap.get(this) : {results: [], last: {result: null}};
		smap.set(this, {results, last});
		if (regex === undef) {
			return last ? last.result : null;
		}
		const regstr = regex.toString();
		if (str !== undef) {
			const found = results.find(r => regstr === r.regstr && str === r.str);
			return found ? found.result : reg(regex).exec(str);
		}
		return {
			exec(str) {
				const result = regex.exec(str);
				Array.isArray(result) && result.forEach((r, i) => result['$' + i] = r);
				Object.assign(last, {str, regstr, result});
				results.push(last);
				results.length > MAX_RESULT && results.shift();
				this[$] = str[$] = regex[$] = result;
				return result;
			},
			test(str) { return !!this.exec(str); }
		};
	};
	const scope = (scopeObj = {}) => reg.bind(scopeObj);
	return Object.assign(reg.bind(self), {$, scope});
})();
util.reg = reg;
const PopupMessage = (() => {
	const __css__ = `
		.zenzaPopupMessage {
			--notify-color: #0c0;
			--alert-color: #c00;
			--shadow-color: #ccc;
			z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
			opacity: 0;
			display: block;
			min-width: 150px;
			margin-bottom: 8px;
			padding: 8px 16px;
			white-space: nowrap;
			font-weight: bolder;
			overflow-y: hidden;
			text-align: center;
			color: rgba(255, 255, 255, 0.8);
			box-shadow: 2px 2px 0 var(--shadow-color, #ccc);
			border-radius: 4px;
			pointer-events: none;
			user-select: none;
			animation: zenza-popup-message-animation 5s;
			animation-fill-mode: forwards;
		}
		.zenzaPopupMessage.notify {
			background: var(--notify-color, #0c0);
		}
		.zenzaPopupMessage.alert {
			background: var(--alert-color, #0c0);
		}
		.zenzaPopupMessage.debug {
			background: #333;
		}
		/* できれば広告に干渉したくないけど仕方なく */
		div[data-follow-container] {
			position: static !important;
		}
		@keyframes zenza-popup-message-animation {
			0%  { transform: translate3d(0, -100px, 0); opacity: 0; }
			10% { transform: translate3d(0, 0, 0); }
			20% { opacity: 0.8; }
			80% { opacity: 0.8; }
			90% { opacity: 0; }
		}
	`;
	let initialized = false;
	const initialize = () => {
		if (initialized) { return; }
		initialized = true;
		css.addStyle(__css__);
	};
	const create = (msg, className, allowHtml = false) => {
		const d = document.createElement('div');
		d.className = `zenzaPopupMessage ${className}`;
		allowHtml ? (d.innerHTML = msg) : (d.textContent = msg);
		d.addEventListener('animationend', () => d.remove(), {once: true});
		return d;
	};
	const show = msg => {
		initialize();
		const target = document.querySelector('.popupMessageContainer');
		(target || document.body).prepend(msg);
	};
	const nt = (msg, allowHtml, type, consoleStyle) => {
		if (msg === undefined) {
			msg = '不明なエラー';
			window.console.error('undefined message sent');
			window.console.trace();
		}
		console.log('%c%s', consoleStyle, msg);
		show(create(msg, type, allowHtml));
	};
	const notify = (msg, allowHtml = false) =>
		nt(msg, allowHtml, 'notify', 'background: #080; color: #fff; padding: 8px;');
	const alert = (msg, allowHtml = false) =>
		nt(msg, allowHtml, 'alert', 'background: #800; color: #fff; padding: 8px;');
	const debug = (msg, allowHtml = false) =>
		nt(msg, allowHtml, 'debug', 'background: #333; color: #fff; padding: 8px;');
	return {notify, alert, debug};
})();
const AsyncEmitter = (() => {
	const emitter = function () {
	};
	emitter.prototype.on = Emitter.prototype.on;
	emitter.prototype.once = Emitter.prototype.once;
	emitter.prototype.off = Emitter.prototype.off;
	emitter.prototype.clear = Emitter.prototype.clear;
	emitter.prototype.emit = Emitter.prototype.emit;
	emitter.prototype.emitAsync = Emitter.prototype.emitAsync;
	return emitter;
})();
(ZenzaWatch ? ZenzaWatch.lib : {}).AsyncEmitter = AsyncEmitter;
const Fullscreen = {
	now() {
		if (document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen) {
			return true;
		}
		return false;
	},
	get() {
		return document.fullScreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null;
	},
	request(target) {
		this._handleEvents();
		const elm = typeof target === 'string' ? document.getElementById(target) : target;
		if (!elm) {
			return;
		}
		if (elm.requestFullScreen) {
			elm.requestFullScreen();
		} else if (elm.webkitRequestFullScreen) {
			elm.webkitRequestFullScreen();
		} else if (elm.mozRequestFullScreen) {
			elm.mozRequestFullScreen();
		}
	},
	cancel() {
		if (!this.now()) {
			return;
		}
		if (document.cancelFullScreen) {
			document.cancelFullScreen();
		} else if (document.webkitCancelFullScreen) {
			document.webkitCancelFullScreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		}
	},
	_handleEvents() {
		this._handleEvnets = _.noop;
		const handle = () => {
			const isFull = this.now();
			document.body.classList.toggle('is-fullscreen', isFull);
			global.emitter.emit('fullscreenStatusChange', isFull);
		};
		document.addEventListener('webkitfullscreenchange', handle, false);
		document.addEventListener('mozfullscreenchange', handle, false);
		document.addEventListener('MSFullscreenChange', handle, false);
		document.addEventListener('fullscreenchange', handle, false);
	}
};
util.fullscreen = Fullscreen;
const dummyConsole = {};
window.console.timeLog || (window.console.timeLog = () => {});
for (const k of Object.keys(window.console)) {
	if (typeof window.console[k] !== 'function') {continue;}
	dummyConsole[k] = _.noop;
}
['assert', 'error', 'warn'].forEach(k =>
	dummyConsole[k] = window.console[k].bind(window.console));
console = Config.getValue('debug') ? window.console : dummyConsole;
Config.onkey('debug', v => console = v ? window.console : dummyConsole);
const css = {
	addStyle: (styles, option, document = window.document) => {
		const elm = document.createElement('style');
		elm.type = 'text/css';
		if (typeof option === 'string') {
			elm.id = option;
		} else if (option) {
			Object.assign(elm, option);
		}
		elm.classList.add(PRODUCT);
		elm.append(styles.toString());
		(document.head || document.body || document.documentElement).append(elm);
		elm.disabled = option && option.disabled;
		elm.dataset.switch = elm.disabled ? 'off' : 'on';
		return elm;
	},
	registerProps(...args) {
		if (!CSS || !('registerProperty' in CSS)) {
			return;
		}
		for (const definition of args) {
			try {
				(definition.window || window).CSS.registerProperty(definition);
			} catch (err) { console.warn('CSS.registerProperty fail', definition, err); }
		}
	},
	setProps(element, ...args) {
		for (const {prop, value} of args) {
			try {
				element.style.setProperty(prop, value);
			} catch (err) { console.warn('element.style.setProperty fail', {prop, value}, element, err); }
		}
	},
	addModule: async function(func, options = {}) {
		if (!CSS || !('paintWorklet' in CSS) || this.set.has(func)) {
			return;
		}
		this.set.add(func);
		const src =
		`(${func.toString()})(
			this,
			registerPaint,
			${JSON.stringify(options.config || {}, null, 2)}
			);`;
		const blob = new Blob([src], {type: 'text/javascript'});
		const url = URL.createObjectURL(blob);
		await CSS.paintWorklet.addModule(url).then(() => URL.revokeObjectURL(url));
		return true;
	}.bind({set: new WeakSet}),
	number:  value => CSS.number  ? CSS.number(value) : value,
	s:       value => CSS.s       ? CSS.s(value) :  `${value}s`,
	ms:      value => CSS.ms      ? CSS.ms(value) : `${value}ms`,
	pt:      value => CSS.pt      ? CSS.pt(value) : `${value}pt`,
	px:      value => CSS.px      ? CSS.px(value) : `${value}px`,
	percent: value => CSS.percent ? CSS.percent(value) : `${value}%`,
	vh:      value => CSS.vh      ? CSS.vh(value) : `${value}vh`,
	vw:      value => CSS.vw      ? CSS.vw(value) : `${value}vw`,
};
const cssUtil = css;
Object.assign(util, css);
const textUtil = {
	secToTime: sec => {
		return [
			Math.floor(sec / 60).toString().padStart(2, '0'),
			(Math.floor(sec) % 60).toString().padStart(2, '0')
		].join(':');
	},
	parseQuery: (query = '') => {
		query = query.startsWith('?') ? query.substr(1) : query;
		const result = {};
		query.split('&').forEach(item => {
			const sp = item.split('=');
			const key = decodeURIComponent(sp[0]);
			const val = decodeURIComponent(sp.slice(1).join('='));
			result[key] = val;
		});
		return result;
	},
	parseUrl: url => {
		url = url || 'https://unknown.example.com/';
		const a = document.createElement('a');
		a.href = url;
		return a;
	},
	decodeBase64: str => {
		try {
			return decodeURIComponent(
				escape(atob(
					str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=')
				)));
		} catch(e) {
			return '';
		}
	},
	encodeBase64: str => {
		try {
			return btoa(unescape(encodeURIComponent(str)));
		} catch(e) {
			return '';
		}
	},
	escapeHtml: text => {
		const map = {
			'&': '&amp;',
			'\x27': '&#39;',
			'"': '&quot;',
			'<': '&lt;',
			'>': '&gt;'
		};
		return text.replace(/[&"'<>]/g, char => map[char]);
	},
	unescapeHtml: text => {
		const map = {
			'&amp;': '&',
			'&#39;': '\x27',
			'&quot;': '"',
			'&lt;': '<',
			'&gt;': '>'
		};
		return text.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, char => map[char]);
	},
	escapeToZenkaku: text => {
		const map = {
			'&': '＆',
			'\'': '’',
			'"': '”',
			'<': '＜',
			'>': '＞'
		};
		return text.replace(/["'<>]/g, char => map[char]);
	},
	escapeRegs: text => {
		const match = /[\\^$.*+?()[\]{}|]/g;
		return text.replace(match, '\\$&');
	},
	convertKansuEi: text => {
		let match = /[〇一二三四五六七八九零壱弐惨伍]/g;
		let map = {
			'〇': '0', '零': '0',
			'一': '1', '壱': '1',
			'二': '2', '弐': '2',
			'三': '3', '惨': '3',
			'四': '4',
			'五': '5', '伍': '5',
			'六': '6',
			'七': '7',
			'八': '8',
			'九': '9',
		};
		text = text.replace(match, char => map[char]);
		text = text.replace(/([1-9]?)[十拾]([0-9]?)/g, (n, a, b) => (a && b) ? `${a}${b}` : (a ? a * 10 : 10 + b * 1));
		return text;
	},
	dateToString: date => {
		if (typeof date === 'string') {
			const origDate = date;
			date = date.replace(/\//g, '-');
			const m = /^(\d+-\d+-\d+) (\d+):(\d+):(\d+)/.exec(date);
			if (m) {
				date = new Date(m[1]);
				date.setHours(m[2]);
				date.setMinutes(m[3]);
				date.setSeconds(m[4]);
			} else {
				const t = Date.parse(date);
				if (isNaN(t)) {
					return origDate;
				}
				date = new Date(t);
			}
		} else if (typeof date === 'number') {
			date = new Date(date);
		}
		if (!date || isNaN(date.getTime())) {
			return '1970/01/01 00:00:00';
		}
		const [yy, mm, dd, h, m, s] = [
				date.getFullYear(),
				date.getMonth() + 1,
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds()
			].map(n => n.toString().padStart(2, '0'));
		return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
	},
	isValidJson: data => {
		try {
			JSON.parse(data);
			return true;
		} catch (e) {
			return false;
		}
	},
	toRgba: (c, alpha = 1) =>
		`rgba(${parseInt(c.substr(1, 2), 16)}, ${parseInt(c.substr(3, 2), 16)}, ${parseInt(c.substr(5, 2), 16)}, ${alpha})`,
	snakeToCamel: snake => snake.replace(/-./g, s => s.charAt(1).toUpperCase()),
	camelToSnake: (camel, separator = '_') => camel.replace(/([A-Z])/g, s =>  separator + s.toLowerCase())
};
Object.assign(util, textUtil);
const nicoUtil = {
	parseWatchQuery: query => {
		try {
			const result = textUtil.parseQuery(query);
			const playlist = JSON.parse(textUtil.decodeBase64(result.playlist));
			if (playlist.searchQuery) {
				const sq = playlist.searchQuery;
				if (sq.type === 'tag') {
					result.playlist_type = 'tag';
					result.tag = sq.query;
				} else {
					result.playlist_type = 'search';
					result.keyword = sq.query;
				}
				let [order, sort] = (sq.sort || '+f').split('');
				result.order = order === '-' ? 'a' : 'd';
				result.sort = sort;
				if (sq.fRange) { result.f_range = sq.fRange; }
				if (sq.lRange) { result.l_range = sq.lRange; }
			} else if (playlist.mylistId) {
				result.playlist_type = 'mylist';
				result.group_id = playlist.mylistId;
				result.order =
					document.querySelector('select[name="sort"]') ?
						document.querySelector('select[name="sort"]').value : '1';
			} else if (playlist.id && playlist.id.includes('temporary_mylist')) {
				result.playlist_type = 'deflist';
				result.group_id = 'deflist';
				result.order =
					document.querySelector('select[name="sort"]') ?
						document.querySelector('select[name="sort"]').value : '1';
			}
			return result;
		} catch(e) {
			return {};
		}
	},
	hasLargeThumbnail: videoId => {
		const threthold = 16371888;
		const cid = videoId.substr(0, 2);
		const fid = videoId.substr(2) * 1;
		if (cid === 'nm') { return false; }
		if (cid !== 'sm' && fid < 35000000) { return false; }
		if (fid < threthold) {
			return false;
		}
		return true;
	},
	getThumbnailUrlByVideoId: videoId => {
		const videoIdReg = /^[a-z]{2}\d+$/;
		if (!videoIdReg.test(videoId)) {
			return null;
		}
		const fileId = parseInt(videoId.substr(2), 10);
		const large = nicoUtil.hasLargeThumbnail(videoId) ? '.L' : '';
		return fileId >= 35374758 ? // このIDから先は新サーバー(おそらく)
			`https://nicovideo.cdn.nimg.jp/thumbnails/${fileId}/${fileId}.L` :
			`https://tn.smilevideo.jp/smile?i=${fileId}.${large}`;
	},
	getWatchId: url => {
		let m;
		if (url && url.indexOf('nico.ms') >= 0) {
			m = /\/\/nico\.ms\/([a-z0-9]+)/.exec(url);
		} else {
			m = /\/?watch\/([a-z0-9]+)/.exec(url || location.pathname);
		}
		return m ? m[1] : null;
	},
	isPremium: () => {
		const h = document.getElementById('siteHeaderNotification');
		return h && h.classList.contains('siteHeaderPremium');
	},
	isLogin: () => document.getElementsByClassName('siteHeaderLogin').length < 1,
	getPageLanguage: () => {
		try {
			let h = document.getElementsByClassName('html')[0];
			return h.lang || 'ja-JP';
		} catch (e) {
			return 'ja-JP';
		}
	},
	openMylistWindow: watchId => {
		window.open(
			`//www.nicovideo.jp/mylist_add/video/${watchId}`,
			'nicomylistadd',
			'width=500, height=400, menubar=no, scrollbars=no');
	},
	openTweetWindow: ({watchId, duration, isChannel, title, videoId}) => {
		const nicomsUrl = `https://nico.ms/${watchId}`;
		const watchUrl = `https://www.nicovideo.jp/watch/${watchId}`;
		title = `${title}(${textUtil.secToTime(duration)})`.replace(/@/g, '@ ');
		const nicoch = isChannel ? ',+nicoch' : '';
		const url =
			'https://twitter.com/intent/tweet?' +
			'url=' + encodeURIComponent(nicomsUrl) +
			'&text=' + encodeURIComponent(title) +
			'&hashtags=' + encodeURIComponent(videoId + nicoch) +
			'&original_referer=' + encodeURIComponent(watchUrl) +
			'';
		window.open(url, '_blank', 'width=550, height=480, left=100, top50, personalbar=0, toolbar=0, scrollbars=1, sizable=1', 0);
	},
	isGinzaWatchUrl: url => /^https?:\/\/www\.nicovideo\.jp\/watch\//.test(url || location.href),
	getPlayerVer: () => {
		if (document.getElementById('js-initial-watch-data')) {
			return 'html5';
		}
		if (document.getElementById('watchAPIDataContainer')) {
			return 'flash';
		}
		return 'unknown';
	},
	isZenzaPlayableVideo: () => {
		try {
			if (nicoUtil.getPlayerVer() === 'html5') {
				return true;
			}
			const watchApiData = JSON.parse(document.querySelector('#watchAPIDataContainer').textContent);
			const flvInfo = textUtil.parseQuery(
				decodeURIComponent(watchApiData.flashvars.flvInfo)
			);
			const dmcInfo = JSON.parse(
				decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
			);
			const videoUrl = flvInfo.url ? flvInfo.url : '';
			const isDmc = dmcInfo && dmcInfo.time;
			if (isDmc) {
				return true;
			}
			const isSwf = /\/smile\?s=/.test(videoUrl);
			const isRtmp = (videoUrl.indexOf('rtmp') === 0);
			return (isSwf || isRtmp) ? false : true;
		} catch (e) {
			return false;
		}
	},
	getNicoHistory: window.decodeURIComponent(document.cookie.replace(/^.*(nicohistory[^;+]).*?/, ''))
};
Object.assign(util, nicoUtil);
const messageUtil = {};
const WindowMessageEmitter = messageUtil.WindowMessageEmitter = ((safeOrigins = []) => {
	const emitter = new Emitter();
	const knownSource = [];
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
				const command = global.config.props.enableSingleton ?
					(command === 'send' ? 'open' : 'send') : message.command;
				if (command === 'send') {
					global.external.sendOrExecCommand('open', message.params.watchId);
				} else {
					global.external.execCommand('open', message.params.watchId);
				}
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
	const channel =
		(window.BroadcastChannel && location.host === 'www.nicovideo.jp') ?
			(new window.BroadcastChannel(PRODUCT)) : null;
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
	bcast.sendExecCommand = body =>
		bcast.sendMessagePromise({command: 'sendExecCommand', params: body});
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
	bcast.sendMessagePromise = (body, timeout = 60000) => {
		const sessionId = `sendMessage-${PRODUCT}-${Math.random()}`;
		let timer = null;
		return bcast.promise(sessionId, async (resolve, reject) => {
			const result = bcast.sendMessage(body, sessionId);
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
Object.assign(util, messageUtil);
const PlayerSession = {
	session: {},
	init(storage) {
		this.storage = storage;
		return this;
	},
	save(playingStatus) {
		this.storage[this.KEY] = JSON.stringify(playingStatus);
	},
	restore() {
		let ss = {};
		try {
			const data = this.storage[this.KEY];
			if (!data) {return ss;}
			ss = JSON.parse(this.storage[this.KEY]);
			this.storage.removeItem(this.KEY);
		} catch (e) {
			window.console.error('PlayserSession restore fail: ', this.KEY, e);
		}
		console.log('lastSession', ss);
		return ss;
	},
	clear() { this.storage.removeItem(this.KEY); },
	hasRecord() { return this.storage.hasOwnProperty(this.KEY); }
};
PlayerSession.KEY = `ZenzaWatch_PlayingStatus`;
const WatchPageHistory = (() => {
	if (!window || !window.location) {
		return {
			initialize: () => {},
			pushHistory: () => {},
			pushHistoryAgency: () => {}
		};
	}
	let originalUrl = window && window.location && window.location.href;
	let originalTitle = window && window.document && window.document.title;
	let isOpen = false;
	let dialog, watchId, path, title;
	const restore = () => {
		history.replaceState(null, null, originalUrl);
		document.title = (isOpen ? '📺' : '') + originalTitle.replace(/^📺/, '');
		bouncedRestore.cancel();
	};
	const bouncedRestore = _.debounce(restore, 30000);
	const pushHistory = (path, title) => {
		if (nicoUtil.isGinzaWatchUrl(originalUrl)) {
			originalUrl = location.href;
			originalTitle = document.title;
		}
		history.replaceState(null, null, path);
		document.title = (isOpen ? '📺' : '') + title.replace(/^📺/, '');
		bouncedRestore();
	};
	const onVideoInfoLoad = _.debounce(({watchId, title, owner: {name}}) => {
		if (!watchId || !isOpen) {
			return;
		}
		title = `${title} by ${name} - ${PRODUCT}`;
		path = `/watch/${watchId}`;
		if (location.host === 'www.nicovideo.jp') {
			return pushHistory(path, title);
		}
		if (NicoVideoApi && NicoVideoApi.pushHistory) {
			return NicoVideoApi.pushHistory(path, title);
		}
	});
	const onDialogOpen = () => isOpen = true;
	const onDialogClose = () => {
		isOpen = false;
		watchId = title = path = null;
		history.replaceState(null, null, originalUrl);
		document.title = originalTitle;
	};
	const initialize = _dialog => {
		if (dialog) {
			return;
		}
		dialog = _dialog;
		if (location.host === 'www.nicovideo.jp') {
			dialog.on('close', onDialogClose);
		}
		dialog.on('open', onDialogOpen);
		dialog.on('loadVideoInfo', onVideoInfoLoad);
		if (location.host !== 'www.nicovideo.jp') { return; }
		window.addEventListener('beforeunload', restore, {passive: true});
		window.addEventListener('error', restore, {passive: true});
		window.addEventListener('unhandledrejection', restore, {passive: true});
	};
	const pushHistoryAgency = async (path, title) => {
		if (!navigator || !navigator.locks) {
			pushHistory(path, title);
			bouncedRestore.cancel();
			await new Promise(r => setTimeout(r, 3000));
			return restore();
		}
		let lastTitle = document.title;
		let lastUrl = location.href;
		await navigator.locks.request('pushHistoryAgency', {ifAvailable: true}, async lock => {
			if (!lock) {
				return;
			}
			history.replaceState(null, title, path);
			await new Promise(r => setTimeout(r, 3000));
			history.replaceState(null, lastTitle, lastUrl);
			await new Promise(r => setTimeout(r, 10000));
		});
	};
	return {
		initialize,
		pushHistory,
		pushHistoryAgency
	};
})();
const env = {
	hasFlashPlayer() {
		return !!navigator.mimeTypes['application/x-shockwave-flash'];
	},
	isEdgePC() {
		return navigator.userAgent.toLowerCase().includes('edge');
	},
	isFirefox() {
		return navigator.userAgent.toLowerCase().includes('firefox');
	},
	isWebkit() {
		return !this.isEdgePC() && navigator.userAgent.toLowerCase().includes('webkit');
	},
	isChrome() {
		return !this.isEdgePC() && navigator.userAgent.toLowerCase().includes('chrome');
	}
};
Object.assign(util, env);
const Clipboard = {
	copyText: text => {
		if (navigator.clipboard) { // httpsじゃないと動かない
			return navigator.clipboard.writeText(text);
		}
		let clip = document.createElement('input');
		clip.type = 'text';
		clip.style.position = 'fixed';
		clip.style.left = '-9999px';
		clip.value = text;
		const node = Fullscreen.element || document.body;
		node.appendChild(clip);
		clip.select();
		document.execCommand('copy');
		window.setTimeout(() => clip.remove(), 0);
	}
};
util.copyToClipBoard = Clipboard.copyText;
const netUtil = {
	ajax: params => {
		if (location.host !== 'www.nicovideo.jp') {
			return NicoVideoApi.ajax(params);
		}
		return $.ajax(params);
	},
	abortableFetch: (url, params) => {
		params = params || {};
		const racers = [];
		let timer;
		const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
		if (timeout > 0) {
			racers.push(new Promise((resolve, reject) =>
				timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
			);
		}
		const controller = window.AbortController ? (new AbortController()) : null;
		if (controller) {
			params.signal = controller.signal;
		}
		racers.push(fetch(url, params));
		return Promise.race(racers)
			.catch(err => {
				if (err.name === 'timeout') {
					if (controller) {
						controller.abort();
					}
				}
				return Promise.reject(err.message || err);
			}).finally(() => timer = null);
	},
	fetch(url, params) {
		if (location.host !== 'www.nicovideo.jp') {
			return NicoVideoApi.fetch(url, params);
		}
		return this.abortableFetch(url, params);
	},
	jsonp: (() => {
		let callbackId = 0;
		const getFuncName = () => `JsonpCallback${callbackId++}`;
		let cw = null;
		const getFrame = () => {
			if (cw) { return cw; }
			return new Promise(resolve => {
				const iframe = document.createElement('iframe');
				iframe.srcdoc = `
					<html><head></head></html>
				`.trim();
				iframe.sandbox = 'allow-same-origin allow-scripts';
				Object.assign(iframe.style, {
					width: '32px', height: '32px', position: 'fixed', left: '-100vw', top: '-100vh',
					pointerEvents: 'none', overflow: 'hidden'
				});
				iframe.onload = () => {
					cw = iframe.contentWindow;
					resolve(cw);
				};
				(document.body || document.documentElement).append(iframe);
			});
		};
		const createFunc = async (url, funcName) => {
			let timeoutTimer = null;
			const win = await getFrame();
			const doc = win.document;
			const script = doc.createElement('script');
			return new Promise((resolve, reject) => {
				win[funcName] = result => {
					win.clearTimeout(timeoutTimer);
					timeoutTimer = null;
					script.remove();
					delete win[funcName];
					resolve(result);
				};
				timeoutTimer = win.setTimeout(() => {
					script.remove();
					delete win[funcName];
					if (timeoutTimer) {
						reject(new Error(`jsonp timeout ${url}`));
					}
				}, 30000);
				script.src = url;
				doc.head.append(script);
			});
		};
		return (url, funcName) => {
			if (!funcName) {
				funcName = getFuncName();
			}
			url = `${url}${url.includes('?') ? '&' : '?'}callback=${funcName}`;
			return createFunc(url, funcName);
		};
	})()
};
Object.assign(util, netUtil);
const VideoCaptureUtil = (() => {
	const crossDomainGates = {};
	const initializeByServer = (server, fileId) => {
		if (crossDomainGates[server]) {
			return crossDomainGates[server];
		}
		const baseUrl = `https://${server}/smile?i=${fileId}`;
		crossDomainGates[server] = new CrossDomainGate({
			baseUrl,
			origin: `https://${server}/`,
			type: 'storyboard_' + server.split('.')[0].replace(/-/g, '_')
		});
		return crossDomainGates[server];
	};
	const _toCanvas = (v, width, height) => {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = width;
		canvas.height = height;
		context.drawImage(v.drawableElement || v, 0, 0, width, height);
		return canvas;
	};
	const isCORSReadySrc = src => {
		if (src.indexOf('dmc.nico') >= 0) {
			return true;
		}
		return false;
	};
	const videoToCanvas = video => {
		const src = video.src;
		const sec = video.currentTime;
		const a = document.createElement('a');
		a.href = src;
		const server = a.host;
		const search = a.search;
		if (isCORSReadySrc(src)) {
			return Promise.resolve({canvas: _toCanvas(video, video.videoWidth, video.videoHeight)});
		}
		return new Promise(async (resolve, reject) => {
			if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
				return reject({status: 'fail', message: 'invalid url', url: src});
			}
			const fileId = RegExp.$2;
			const gate = initializeByServer(server, fileId);
			const dataUrl = gate.videoCapture(src, sec);//.then(dataUrl => {
			const bin = atob(dataUrl.split(',')[1]);
			const buf = new Uint8Array(bin.length);
			for (let i = 0, len = buf.length; i < len; i++) {
				buf[i] = bin.charCodeAt(i);
			}
			const blob = new Blob([buf.buffer], {type: 'image/png'});
			const url = URL.createObjectURL(blob);
			console.info('createObjectUrl', url.length);
			const img = new Image();
			img.src = url;
			img.decode()
				.then(() => resolve({canvas: _toCanvas(img, video.videoWidth, video.videoHeight)}))
				.catch(err => reject(err))
				.finally(() => window.setTimeout(() => URL.revokeObjectURL(url), 10000));
		});
	};
	const htmlToSvg = (html, width = 682, height = 384) => {
		const data =
			(`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
					<foreignObject width='100%' height='100%'>${html}</foreignObject>
				</svg>`).trim();
		const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
		return {svg, data};
	};
	const htmlToCanvas = (html, width = 640, height = 360) => {
		const imageW = height * 16 / 9;
		const imageH = imageW * 9 / 16;
		const {svg, data} = htmlToSvg(html);
		const url = window.URL.createObjectURL(svg);
		if (!url) {
			return Promise.reject(new Error('convert svg fail'));
		}
		const img = new Image();
		img.width = 682;
		img.height = 384;
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.width = width;
		canvas.height = height;
		img.src = url;
		img.decode().then(() => {
			context.drawImage(
				img,
				(width - imageW) / 2,
				(height - imageH) / 2,
				imageW,
				imageH);
		}).catch(e => {
			throw new Error('img decode error', e);
		}).finally(() => window.URL.revokeObjectURL(url));
		return {canvas, img};
	};
	const nicoVideoToCanvas = async ({video, html, minHeight = 1080}) => {
		let scale = 1;
		let width =
			Math.max(video.videoWidth, video.videoHeight * 16 / 9);
		let height = video.videoHeight;
		if (height < minHeight) {
			scale = Math.floor(minHeight / height);
			width *= scale;
			height *= scale;
		}
		const canvas = document.createElement('canvas');
		const ct = canvas.getContext('2d', {alpha: false});
		canvas.width = width;
		canvas.height = height;
		const {canvas: videoCanvas} = await videoToCanvas(video);//.then(({canvas}) => {
		ct.fillStyle = 'rgb(0, 0, 0)';
		ct.fillRect(0, 0, width, height);
		ct.drawImage(
			videoCanvas,
			(width - video.videoWidth * scale) / 2,
			(height - video.videoHeight * scale) / 2,
			video.videoWidth * scale,
			video.videoHeight * scale
		);
		const {canvas: htmlCanvas, img} = await htmlToCanvas(html, width, height);
		ct.drawImage(htmlCanvas, 0, 0, width, height);
		return {canvas, img};
	};
	const saveToFile = (canvas, fileName = 'sample.png') => {
		const dataUrl = canvas.toDataURL('image/png');
		const bin = atob(dataUrl.split(',')[1]);
		const buf = new Uint8Array(bin.length);
		for (let i = 0, len = buf.length; i < len; i++) {
			buf[i] = bin.charCodeAt(i);
		}
		const blob = new Blob([buf.buffer], {type: 'image/png'});
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		window.console.info('download fileName: ', fileName);
		a.setAttribute('download', fileName);
		a.setAttribute('href', url);
		a.setAttribute('rel', 'noopener');
		document.body.append(a);
		a.click();
		window.setTimeout(() => {
			a.remove();
			URL.revokeObjectURL(url);
		}, 2000);
	};
	return {
		videoToCanvas,
		htmlToCanvas,
		nicoVideoToCanvas,
		saveToFile
	};
})();
VideoCaptureUtil.capture = function(src, sec) {
	const func = () => {
		return new Promise((resolve, reject) => {
			const v = createVideoElement('capture');
			if (!v) {
				return reject();
			}
			Object.assign(v.style, {
				width: '64px',
				height: '36px',
				position: 'fixed',
				left: '-100px',
				top: '-100px'
			});
			v.volume = 0;
			v.autoplay = false;
			v.controls = false;
			v.addEventListener('loadedmetadata', () => v.currentTime = sec, {once: true});
			v.addEventListener('error', err => { v.remove(); reject(err); }, {once: true});
			const onSeeked = () => {
				const c = document.createElement('canvas');
				c.width = v.videoWidth;
				c.height = v.videoHeight;
				const ctx = c.getContext('2d');
				ctx.drawImage(v.drawableElement || v, 0, 0);
				v.remove();
				return resolve(c);
			};
			v.addEventListener('seeked', onSeeked, {once: true});
			setTimeout(() => {v.remove();reject();}, 30000);
			document.body.append(v);
			v.src = src;
			v.currentTime = sec;
		});
	};
	let wait = (this.lastSrc === src && this.wait) ? this.wait : sleep(1000);
	this.lastSrc = src;
	let waitTime = 1000;
	waitTime += src.indexOf('dmc.nico') >= 0 ? 2000 : 0;
	waitTime += src.indexOf('.m3u8')    >= 0 ? 2000 : 0;
	let resolve, reject;
	this.wait = new Promise((...args) => [resolve, reject] = args)
		.then(() => sleep(waitTime)).catch(() => sleep(waitTime * 2));
	return wait.then(func)
		.then(r => { resolve(r); return r; })
		.catch(e => { reject(e); return e; });
}.bind({});
VideoCaptureUtil.capTube = ({title, videoId, author}) => {
	const iframe = document.querySelector(
		'#ZenzaWatchVideoPlayerContainer iframe[title^=YouTube]');
	if (!iframe) {
		return;
	}
	const command = 'capture';
	iframe.contentWindow.postMessage(
		JSON.stringify({command, title, videoId, author}),
		'https://www.youtube.com'
	);
};
util.videoCapture = VideoCaptureUtil.capture;
util.capTube = VideoCaptureUtil.capTube;
util.saveMymemory = function(player, videoInfo) {
	let html = player.getMymemory();
	const title =
		videoInfo.watchId + ' - ' +
		videoInfo.title; // エスケープされてる
	const info = (`
				<div>
					<h2>${videoInfo.title}</h2>
					<a href="//www.nicovideo.jp/watch/${videoInfo.watchId}?from=${Math.floor(player.currentTime)}">元動画</a><br>
					作成環境: ${navigator.userAgent}<br>
					作成日: ${(new Date()).toLocaleString()}<br>
					ZenzaWatch: ver${ZenzaWatch.version} (${ZenzaWatch.env})<br>
					<button
						onclick="document.body.classList.toggle('debug');return false;">
						デバッグON/OFF
					</button>
				</div>
			`).trim();
	html = html
		.replace(/<title>(.*?)<\/title>/, '<title>' + title + '</title>')
		.replace(/(<body.*?>)/, '$1' + info);
	const blob = new Blob([html], {'type': 'text/html'});
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.setAttribute('download', title + '.html');
	a.setAttribute('href', url);
	a.setAttribute('rel', 'noopener');
	document.body.append(a);
	a.click();
	window.setTimeout(() => a.remove(), 1000);
};
class speech {
	static async speak(text, option = {}) {
		if (!window.speechSynthesis) {
			return Promise.resolve();
		}
		const msg = new window.SpeechSynthesisUtterance();
		['lang', 'pitch', 'rate', 'voice', 'volume'].forEach(prop => {
			option.hasOwnProperty(prop) && (msg[prop] = option[prop]);
		});
		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel();
		} else {
			await this.promise;
		}
		return this.promise = new Promise(res => {
			msg.addEventListener('end', res, {once: true});
			msg.addEventListener('error', res, {once: true});
			msg.text = text;
			window.speechSynthesis.speak(msg);
		});
	}
	static voices(lang) {
		if (!window.speechSynthesis) {
			return [];
		}
		this._voices = this._voices || window.speechSynthesis.getVoices();
		return lang ? this._voices.filter(v => v.lang === lang) : this._voices;
	}
}
speech.promise = Promise.resolve();
util.speak = speech.speak;
const watchResize = (target, callback) => {
	if (window.ResizeObserver) {
		const ro = new window.ResizeObserver(entries => {
			for (let entry of entries) {
				if (entry.target === target) {
					callback();
					return;
				}
			}
		});
		ro.observe(target);
		return;
	}
	const iframe = document.createElement('iframe');
	iframe.loading = 'eager';
	iframe.className = 'resizeObserver';
	Object.assign(iframe.style, {
		width: '100%',
		height: '100%',
		position: 'absolute',
		pointerEvents: 'none',
		border: 0,
		opacity: 0
	});
	target.parentElement.append(iframe);
	iframe.contentWindow.addEventListener('resize', () => {
		callback();
	});
};
util.watchResize = watchResize;
util.sortedLastIndex = (arr, value) => {
	let head = 0;
	let tail = arr.length;
	while (head < tail) {
		let p = Math.floor((head + tail) / 2);
		let v = arr[p];
		if (v <= value) {
			head = p + 1;
		} else {
			tail = p;
		}
	}
	return tail;
};
const createVideoElement = (...args) => {
	if (window.ZenzaHLS && window.ZenzaHLS.createVideoElement) {
		return window.ZenzaHLS.createVideoElement(...args);
	} else
	if (ZenzaWatch.debug.createVideoElement) {
		return ZenzaWatch.debug.createVideoElement(...args);
	}
	return document.createElement('video');
};
util.createVideoElement = createVideoElement;
const domEvent = {
	dispatchCustomEvent(elm, name, detail = {}, options = {}) {
		const ev = new CustomEvent(name, Object.assign({detail}, options));
		elm.dispatchEvent(ev);
	},
	dispatchCommand(element, command, param, originalEvent = null) {
		return element.dispatchEvent(new CustomEvent('command',
			{detail: {command, param, originalEvent}, bubbles: true, composed: true}
		));
	},
	bindCommandDispatcher(element, command) {
		element.addEventListener(command, e => {
			const target = e.target.closest('[data-command]');
			if (!target) {
				global.emitter.emitAsync('hideHover');
				return;
			}
			let [command, param, type] = target.dataset;
			if (['number', 'boolean', 'json'].includes(type)) {
				param = JSON.parse(param);
			}
			e.preventDefault();
			return this.dispatchCommand(element, command, param, e);
		});
	}
};
Object.assign(util, domEvent);
const defineElement = (name, classDefinition) => {
	if (!window.customElements) {
		return false;
	}
	if (customElements.get(name)) {
		return true;
	}
	customElements.define(name, classDefinition);
	return true;
};
util.defineElement = defineElement;
util.$ = uQuery;
util.createDom = util.$.html;
util.isTL = util.$.isTL;
class ShortcutKeyEmitter {
	static create(config, element, externalEmitter) {
		const emitter = new Emitter();
		let isVerySlow = false;
		const map = {
			CLOSE: 0,
			RE_OPEN: 0,
			HOME: 0,
			SEEK_LEFT: 0,
			SEEK_RIGHT: 0,
			SEEK_LEFT2: 0,
			SEEK_RIGHT2: 0,
			SEEK_PREV_FRAME: 0,
			SEEK_NEXT_FRAME: 0,
			VOL_UP: 0,
			VOL_DOWN: 0,
			INPUT_COMMENT: 0,
			FULLSCREEN: 0,
			MUTE: 0,
			TOGGLE_COMMENT: 0,
			TOGGLE_LOOP: 0,
			DEFLIST_ADD: 0,
			DEFLIST_REMOVE: 0,
			TOGGLE_PLAY: 0,
			TOGGLE_PLAYLIST: 0,
			SCREEN_MODE_1: 0,
			SCREEN_MODE_2: 0,
			SCREEN_MODE_3: 0,
			SCREEN_MODE_4: 0,
			SCREEN_MODE_5: 0,
			SCREEN_MODE_6: 0,
			SHIFT_RESET: 0,
			SHIFT_DOWN: 0,
			SHIFT_UP: 0,
			NEXT_VIDEO: 0,
			PREV_VIDEO: 0,
			SCREEN_SHOT: 0,
			SCREEN_SHOT_WITH_COMMENT: 0
		};
		Object.keys(map).forEach(key => {
			map[key] = parseInt(config.props[`KEY_${key}`], 10);
		});
		const onKeyDown = e => {
			if (e.target.tagName === 'SELECT' ||
				e.target.tagName === 'INPUT' ||
				e.target.tagName === 'TEXTAREA') {
				return;
			}
			const keyCode = e.keyCode +
				(e.metaKey ? 0x1000000 : 0) +
				(e.altKey ? 0x100000 : 0) +
				(e.ctrlKey ? 0x10000 : 0) +
				(e.shiftKey ? 0x1000 : 0);
			let key = '';
			let param = '';
			switch (keyCode) {
				case 178:
				case 179:
					key = 'TOGGLE_PLAY';
					break;
				case 177:
					key = 'PREV_VIDEO';
					break;
				case 176:
					key = 'NEXT_VIDEO';
					break;
				case map.CLOSE:
					key = 'ESC';
					break;
				case map.RE_OPEN:
					key = 'RE_OPEN';
					break;
				case map.HOME:
					key = 'SEEK_TO';
					param = 0;
					break;
				case map.SEEK_LEFT2:
					key = 'SEEK_BY';
					param = isVerySlow ? -0.5 : -5;
					break;
				case map.SEEK_LEFT:
				case 37: // LEFT
					if (e.shiftKey || isVerySlow) {
						key = 'SEEK_BY';
						param = isVerySlow ? -0.5 : -5;
					}
					break;
				case map.VOL_UP:
					key = 'VOL_UP';
					break;
				case map.SEEK_RIGHT2:
					key = 'SEEK_BY';
					param = isVerySlow ? 0.5 : 5;
					break;
				case map.SEEK_RIGHT:
				case 39: // RIGHT
					if (e.shiftKey || isVerySlow) {
						key = 'SEEK_BY';
						param = isVerySlow ? 0.5 : 5;
					}
					break;
				case map.SEEK_PREV_FRAME:
					key = 'SEEK_PREV_FRAME';
					break;
				case map.SEEK_NEXT_FRAME:
					key = 'SEEK_NEXT_FRAME';
					break;
				case map.VOL_DOWN:
					key = 'VOL_DOWN';
					break;
				case map.INPUT_COMMENT:
					key = 'INPUT_COMMENT';
					break;
				case map.FULLSCREEN:
					key = 'FULL';
					break;
				case map.MUTE:
					key = 'MUTE';
					break;
				case map.TOGGLE_COMMENT:
					key = 'VIEW_COMMENT';
					break;
				case map.TOGGLE_LOOP:
					key = 'TOGGLE_LOOP';
					break;
				case map.DEFLIST_ADD:
					key = 'DEFLIST';
					break;
				case map.DEFLIST_REMOVE:
					key = 'DEFLIST_REMOVE';
					break;
				case map.TOGGLE_PLAY:
					key = 'TOGGLE_PLAY';
					break;
				case map.TOGGLE_PLAYLIST:
					key = 'TOGGLE_PLAYLIST';
					break;
				case map.SHIFT_RESET:
					key = 'PLAYBACK_RATE';
					isVerySlow = true;
					param = 0.1;
					break;
				case map.SCREEN_MODE_1:
					key = 'SCREEN_MODE';
					param = 'small';
					break;
				case map.SCREEN_MODE_2:
					key = 'SCREEN_MODE';
					param = 'sideView';
					break;
				case map.SCREEN_MODE_3:
					key = 'SCREEN_MODE';
					param = '3D';
					break;
				case map.SCREEN_MODE_4:
					key = 'SCREEN_MODE';
					param = 'normal';
					break;
				case map.SCREEN_MODE_5:
					key = 'SCREEN_MODE';
					param = 'big';
					break;
				case map.SCREEN_MODE_6:
					key = 'SCREEN_MODE';
					param = 'wide';
					break;
				case map.NEXT_VIDEO:
					key = 'NEXT_VIDEO';
					break;
				case map.PREV_VIDEO:
					key = 'PREV_VIDEO';
					break;
				case map.SHIFT_DOWN:
					key = 'SHIFT_DOWN';
					break;
				case map.SHIFT_UP:
					key = 'SHIFT_UP';
					break;
				case map.SCREEN_SHOT:
					key = 'SCREEN_SHOT';
					break;
				case map.SCREEN_SHOT_WITH_COMMENT:
					key = 'SCREEN_SHOT_WITH_COMMENT';
					break;
				default:
					break;
			}
			if (key) {
				emitter.emit('keyDown', key, e, param);
			}
		};
		const onKeyUp = e => {
			if (e.target.tagName === 'SELECT' ||
				e.target.tagName === 'INPUT' ||
				e.target.tagName === 'TEXTAREA') {
				return;
			}
			let key = '';
			const keyCode = e.keyCode +
				(e.metaKey ? 0x1000000 : 0) +
				(e.altKey ? 0x100000 : 0) +
				(e.ctrlKey ? 0x10000 : 0) +
				(e.shiftKey ? 0x1000 : 0);
			let param = '';
			switch (keyCode) {
				case map.SHIFT_RESET:
					key = 'PLAYBACK_RATE';
					isVerySlow = false;
					param = 1;
					break;
			}
			if (key) {
				emitter.emit('keyUp', key, e, param);
			}
		};
		(async () => {
			await externalEmitter.promise('init');
			element = element || document.body || document.documentElement;
			element.addEventListener('keydown', onKeyDown);
			element.addEventListener('keyup', onKeyUp);
			externalEmitter.on('keydown', onKeyDown);
			externalEmitter.on('keyup', onKeyUp);
		})();
		return emitter;
	}
}
class RequestAnimationFrame {
	constructor(callback, frameSkip) {
		this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
		this._frameCount = 0;
		this._callback = callback;
		this._enable = false;
		this._onFrame = this._onFrame.bind(this);
		this._isOnce = false;
	}
	_onFrame() {
		if (!this._enable) { return; }
		this._frameCount++;
		if (this._frameCount % (this._frameSkip + 1) === 0) {
			this._callback();
		}
		if (this._isOnce) {
			return this.disable();
		}
		this._requestId = requestAnimationFrame(this._onFrame);
	}
	enable() {
		if (this._enable) {
			return;
		}
		this._enable = true;
		this._requestId = requestAnimationFrame(this._onFrame);
	}
	disable() {
		this._enable = false;
		this._isOnce = false;
		if (!this._requestId) {
			return;
		}
		cancelAnimationFrame(this._requestId);
		this._requestId = null;
	}
	execOnce() {
		if (this._enable) {
			return;
		}
		this._isOnce = true;
		this.enable();
	}
}
util.RequestAnimationFrame = RequestAnimationFrame;
class FrameLayer extends Emitter {
	constructor(params) {
		super();
		this._container = params.container;
		this._retryGetIframeCount = 0;
		this._initializeView(params, 0);
	}
	_initializeView(params, retryCount) {
		const iframe = this._getIframe();
		iframe.className = params.className || '';
		iframe.loading = 'eager';
		const onload = () => {
			let win;
			iframe.onload = null;
			try {
				win = iframe.contentWindow;
			} catch (e) {
				window.console.error(e);
				window.console.log('変な広告に乗っ取られました');
				iframe.remove();
				if (retryCount < 3) {
					this._initializeView(params, retryCount + 1);
				}
				return;
			}
			this.emit('load', win);
			this.emitResolve('GetReady!', win);
		};
		const html = this._html = params.html;
		this._container.append(iframe);
		if (iframe.srcdocType === 'string') {
			iframe.onload = onload;
			iframe.srcdoc = html;
		} else {
			const d = iframe.contentWindow.document;
			d.open();
			d.write(html);
			d.close();
			window.setTimeout(onload, 0);
		}
	}
	_getIframe() {
		let reserved = document.getElementsByClassName('reservedFrame');
		let iframe;
		if (reserved && reserved.length > 0) {
			iframe = reserved[0];
			iframe.remove();
			iframe.style.position = '';
			iframe.style.left = '';
		} else {
			iframe = document.createElement('iframe');
			iframe.loading = 'eager';
		}
		try {
			iframe.srcdocType = iframe.srcdocType || typeof iframe.srcdoc;
			iframe.srcdoc = '<html></html>';
		} catch (e) {
			window.console.error('Error: ', e);
			this._retryGetIframeCount++;
			if (this._retryGetIframeCount < 5) {
				return this._getIframe();
			}
		}
		return iframe;
	}
}
const MylistPocketDetector = (() => {
	const promise =
	(window.MylistPocket && window.MylistPocket.isReady) ?
		Promise.resolve(window.MylistPocket) :
		new Promise(resolve => {
			[window, (document.body || document.documentElement)]
				.forEach(e => e.addEventListener('MylistPocketInitialized', () => {
					resolve(window.MylistPocket);
				}, {once: true}));
		});
	return {detect: () => promise};
})();
class BaseViewComponent extends Emitter {
	constructor({parentNode = null, name = '', template = '', shadow = '', css = ''}) {
		super();
		this._params = {parentNode, name, template, shadow, css};
		this._bound = {};
		this._state = {};
		this._props = {};
		this._elm = {};
		this._initDom({
			parentNode,
			name,
			template,
			shadow,
			css
		});
	}
	_initDom(params) {
		const {parentNode, name, template, css: style, shadow} = params;
		let tplId = `${PRODUCT}${name}Template`;
		let tpl = BaseViewComponent[tplId];
		if (!tpl) {
			if (style) {
				css.addStyle(style, `${name}Style`);
			}
			tpl = document.createElement('template');
			tpl.innerHTML = template;
			tpl.id = tplId;
			BaseViewComponent[tplId] = tpl;
		}
		const onClick = this._bound.onClick = this._onClick.bind(this);
		const view = document.importNode(tpl.content, true);
		this._view = view.querySelector('*') || document.createDocumentFragment();
		this._view.addEventListener('click', onClick);
		this.appendTo(parentNode);
		if (shadow) {
			this._attachShadow({host: this._view, name, shadow});
			if (!this._isDummyShadow) {
				this._shadow.addEventListener('click', onClick);
			}
		}
	}
	_attachShadow({host, shadow, name, mode = 'open'}) {
		let tplId = `${PRODUCT}${name}Shadow`;
		let tpl = BaseViewComponent[tplId];
		if (!tpl) {
			tpl = document.createElement('template');
			tpl.innerHTML = shadow;
			tpl.id = tplId;
			BaseViewComponent[tplId] = tpl;
		}
		if (!host.attachShadow && !host.createShadowRoot) {
			return this._fallbackNoneShadowDom({host, tpl, name});
		}
		const root = host.attachShadow ?
			host.attachShadow({mode}) : host.createShadowRoot();
		const node = document.importNode(tpl.content, true);
		root.append(node);
		this._shadowRoot = root;
		this._shadow = root.querySelector('.root');
		this._isDummyShadow = false;
	}
	_fallbackNoneShadowDom({host, tpl, name}) {
		const node = document.importNode(tpl.content, true);
		const style = node.querySelector('style');
		style.remove();
		css.addStyle(style.innerHTML, `${name}Shadow`);
		host.append(node);
		this._shadow = this._shadowRoot = host.querySelector('.root');
		this._isDummyShadow = true;
	}
	setState(key, val) {
		if (typeof key === 'string') {
			return this._setState(key, val);
		}
		for (const k of Object.keys(key)) {
			this._setState(k, key[k]);
		}
	}
	_setState(key, val) {
		let m;
		if (this._state[key] !== val) {
			this._state[key] = val;
			if ((m = (/^is(.*)$/.exec(key))) !== null) {
				this.toggleClass(`is-${m[1]}`, !!val);
			}
			this.emit('update', {key, val});
		}
	}
	_onClick(e) {
		const target = e.target.closest('[data-command]');
		if (!target) {
			return;
		}
		let {command, type = 'string', param} = target.dataset;
		e.stopPropagation();
		e.preventDefault();
		if (type !== 'string') { param = JSON.parse(param); }
		this._onCommand(command, param);
	}
	appendTo(parentNode) {
		if (!parentNode) {
			return;
		}
		this._parentNode = parentNode;
		parentNode.appendChild(this._view);
	}
	_onCommand(command, param) {
		this.dispatchCommand(command, param);
	}
	dispatchCommand(command, param) {
		this._view.dispatchEvent(new CustomEvent('command',
			{detail: {command, param}, bubbles: true, composed: true}
		));
	}
	toggleClass(className, v) {
		(className || '').split(/\s+/).forEach(c => {
			this._view.classList.toggle(c, v);
			if (this._shadow) {
				this._shadow.classList.toggle(c, this._view.classList.contains(c));
			}
		});
	}
	addClass(name) {
		this.toggleClass(name, true);
	}
	removeClass(name) {
		this.toggleClass(name, false);
	}
}
class StyleSwitcher {
	static update({on, off, document = window.document}) {
		if (on) {
			Array.from(document.head.querySelectorAll(on))
				.forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
		}
		if (off) {
			Array.from(document.head.querySelectorAll(off))
				.forEach(s => { s.disabled = true;  s.dataset.switch = 'off'; });
		}
	}
	static addClass(selector, ...classNames) {
		classNames.forEach(name => {
			Array.from(document.head.querySelectorAll(`${selector}.${name}`))
				.forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
		});
	}
	static removeClass(selector, ...classNames) {
		classNames.forEach(name => {
			Array.from(document.head.querySelectorAll(`${selector}.${name}`))
				.forEach(s => { s.disabled = true; s.dataset.switch = 'off'; });
		});
	}
	static toggleClass(selector, className, v) {
		Array.from(document.head.querySelectorAll(`${selector}.${className}`))
			.forEach(s => { s.disabled = v === undefined ? !s.disabled : !v; s.dataset.switch = s.disabled ? 'off' : 'on'; });
	}
}
util.StyleSwitcher = StyleSwitcher;
const dimport = Object.assign(url => {
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
	window.console.time(`"${url}" import time`);
	const p = new Promise(res => {
		const s = document.createElement('script');
		s.type = 'module';
		s.append(document.createTextNode(loader));
		s.dataset.import = url;
		window[callbackName] = module => {
			window.console.timeEnd(`"${url}" import time`);
			res(module);
			delete window[callbackName];
		};
		document.head.append(s);
	});
	dimport.map[url] = p;
	return p;
}, {map: {}});
util.dimport = dimport;
const VideoItemObserver = (() => {
	let intersectionObserver;
	const mutationMap = new WeakMap();
	const onItemInview = async (item, watchId) => {
		const result = await ThumbInfoLoader.load(watchId).catch(() => null);
		item.classList.remove('is-fetch-current');
		if (!result || result.status === 'fail' || result.code === 'DELETED') {
			if (result && result.code !== 'COMMUNITY') {
			}
			item.classList.add('is-fetch-failed', (result) ? result.code : 'is-no-data');
		} else {
			item.dataset.thumbInfo = JSON.stringify(result);
		}
	};
	const initIntersectionObserver = onItemInview => {
		if (intersectionObserver) {
			return intersectionObserver;
		}
		const _onInview = item => {
			item.classList.add('is-fetch-current');
			onItemInview(item, item.dataset.videoId);
		};
		intersectionObserver = new window.IntersectionObserver(entries => {
			entries.filter(entry => entry.isIntersecting).forEach(entry => {
				const item = entry.target;
				intersectionObserver.unobserve(item);
				_onInview(item);
			});
		}, { rootMargin: '200px' });
		return intersectionObserver;
	};
	const initMutationObserver = ({query, container}) => {
		let mutationObserver = mutationMap.get(container);
		if (mutationObserver) {
			return mutationObserver;
		}
		const update = () => {
			const items = (container || document).querySelectorAll(query);
			if (!items || items.length < 1) { return; }
			if (!items || items.length < 1) { return; }
			for (const item of items) {
				if (item.classList.contains('is-fetch-ignore')) { continue; }
				item.classList.add('is-fetch-wait');
				intersectionObserver.observe(item);
			}
		};
		const onUpdate = _.throttle(update, 1000);
		mutationObserver = new MutationObserver(mutations => {
			const isAdded = mutations.find(
				mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
			if (isAdded) { onUpdate(); }
		});
		mutationObserver.observe(
			container,
			{childList: true, characterData: false, attributes: false, subtree: true}
		);
		mutationMap.set(container, mutationObserver);
		return mutationObserver;
	};
	const observe = ({query, container} = {}) => {
		if (!window.IntersectionObserver || !window.MutationObserver) {
			return;
		}
		if (!container) {
			return;
		}
		query = query || 'zenza-video-item';
		initIntersectionObserver(onItemInview);
		initMutationObserver({query, container});
	};
	const unobserve = ({container}) => {
		let mutationObserver = mutationMap.get(container);
		if (!mutationObserver) {
			return;
		}
		mutationObserver.disconnect();
		mutationMap.delete(container);
	};
	return {observe, unobserve};
})();
util.VideoItemObserver = VideoItemObserver;
const ItemDataConverter = {
	makeSortText: text => {
		return textUtil.convertKansuEi(text)
			.replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
	},
	fromFlapiMylistItem: (data) => {
		const isChannel = data.id.startsWith('so');
		const isMymemory = /^[0-9]+$/.test(data.id);
		const thumbnail =
			data.is_middle_thumbnail ?
				`${data.thumbnail_url}.M` : data.thumbnail_url;
		return {
			watchId: data.id,
			videoId: data.id,
			title: data.title,
			duration: data.length_seconds * 1,
			commentCount: data.num_res * 1,
			mylistCount: data.mylist_counter * 1,
			viewCount: data.view_counter * 1,
			thumbnail,
			postedAt: new Date(data.first_retrieve.replace(/-/g, '/')).toISOString(),
			createdAt: new Date(data.create_time * 1000).toISOString(),
			updatedAt: new Date(data.thread_update_time.replace(/-/g, '/')).toISOString(),
			isChannel,
			isMymemory,
			mylistComment: data.mylist_comment || '',
			_sortTitle: ItemDataConverter.makeSortText(data.title),
		};
	},
	fromDeflistItem: (item) => {
		const data = item.item_data;
		const isChannel = data.video_id.startsWith('so');
		const isMymemory = !isChannel && /^[0-9]+$/.test(data.watch_id);
		return {
			watchId: isChannel ? data.video_id : data.watch_id,
			videoId: data.video_id,
			title: data.title,
			duration: data.length_seconds * 1,
			commentCount: data.num_res * 1,
			mylistCount: data.mylist_counter * 1,
			viewCount: data.view_counter * 1,
			thumbnail: data.thumbnail_url,
			postedAt: new Date(data.first_retrieve * 1000).toISOString(),
			createdAt: new Date(item.create_time * 1000).toISOString(),
			updatedAt: new Date(data.update_time * 1000).toISOString(),
			isChannel,
			isMymemory,
			mylistComment: item.description || '',
			_sortTitle: ItemDataConverter.makeSortText(data.title),
		};
	},
	fromUploadedVideo: data => {
		const isChannel = data.id.startsWith('so');
		const isMymemory = /^[0-9]+$/.test(data.id);
		const thumbnail =
			data.is_middle_thumbnail ?
				`${data.thumbnail_url}.M` : data.thumbnail_url;
		const [min, sec] = data.length.split(':');
		const postedAt = new Date(data.first_retrieve.replace(/-/g, '/')).toISOString();
		return {
			watchId: data.id,
			videoId: data.id,
			title: data.title,
			duration: min * 60 + sec * 1,
			commentCount: data.num_res * 1,
			mylistCount: data.mylist_counter * 1,
			viewCount: data.view_counter * 1,
			thumbnail,
			postedAt,
			createdAt: postedAt,
			updatedAt: postedAt,
			_sortTitle: ItemDataConverter.makeSortText(data.title),
		};
	},
	fromSearchApiV2: data => {
		const isChannel = data.id.startsWith('so');
		const isMymemory = /^[0-9]+$/.test(data.id);
		const thumbnail =
			data.is_middle_thumbnail ?
				`${data.thumbnail_url}.M` : data.thumbnail_url;
		const postedAt = new Date(data.first_retrieve.replace(/-/g, '/')).toISOString();
		return {
			watchId: data.id,
			videoId: data.id,
			title: data.title,
			duration: data.length_seconds,
			commentCount: data.num_res * 1,
			mylistCount: data.mylist_counter * 1,
			viewCount: data.view_counter * 1,
			thumbnail,
			postedAt,
			createdAt: postedAt,
			updatedAt: postedAt,
			isChannel,
			isMymemory,
			_sortTitle: ItemDataConverter.makeSortText(data.title),
		};
	}
};
class NicoQuery {
	static parse(query) {
		if (query instanceof NicoQuery) {
			return query;
		}
		const [type, vars] = query.split('/');
		let [id, p] = (vars || '').split('?');
		id = decodeURIComponent(id || '');
		const params = textUtil.parseQuery(p || '');
		Object.keyf(params).forEach(key => {
			params[key] = JSON.parse(params[key]);
		});
		return {
			type,
			id,
			params
		};
	}
	static build(type, id, params) {
		const p = Object.keys(params)
		.sort()
		.filter(key => !!params[key] && key !== 'title')
		.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(key))}`);
		if (params.title) {
			p.push(`title=${encodeURIComponent(params.title)}`);
		}
		return `${type}/${encodeURIComponent(id)}?${p.join('&')}`;
	}
	static async fetch(query) {
		if (typeof query === 'string') {
			query = new NicoQuery(query);
		}
		const {type, id, params} = query;
		const _req = {
			query: query.toString(),
			type,
			id,
			params,
		};
		let result;
		switch (type) {
			case 'mylist':
				_req.url = `https://flapi.nicovideo.jp/api/watch/mylistvideo?id=${id}`;
				break;
			case 'user':
				_req.url = `https://flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=${id}`;
				break;
			case 'mymylist':
				_req.url = `https://www.nicovideo.jp/api/mylist/list?group_id=${id}`;
				break;
			case 'deflist':
				_req.url = 'https://www.nicovideo.jp/api/deflist/list';
				break;
			case 'nicorepo':
				_req.url = 'https://www.nicovideo.jp/api/nicorepo/timeline/my/all?attribute_filter=upload&object_filter=video&client_app=pc_myrepo';
				break;
			case 'mylistlist':
				return Object.assign(
					await MylistApiLoader.getMylistList(),
					{_req}
				);
			case 'series':
				return Object.assign(
					await RecommendAPILoader.loadSeries(id, {}),
					{_req}
				);
			case 'ranking':
				return Object.assign(
					await NicoRssLoader.loadRanking({genre: id || 'all'}),
					{_req}
				);
			case 'channel':
				_req.url = `https://ch.nicovideo.jp/${id}/video?rss=2.0`;
				return Object.assign(
					await NicoRssLoader.load(_req.url),
					{_req}
				);
			case 'tag':
			case 'search':
				return Object.assign(
					await NicoSearchApiV2Loader.searchMore(id, query.searchParams),
					{_req}
				);
			default:
					throw new Error('unknown query: ' + query);
		}
		result = await netUtil.fetch(_req.url, {credentials: 'include'})
			.then(res => res.json());
		return Object.assign(result, {_req});
	}
	constructor(arg) {
		if (typeof arg === 'string') {
			arg = NicoQuery.parse(arg);
		}
		const {type, id, params} = arg;
		this.type = type;
		this.id = id || '';
		this.params = Object.assign({}, params || {});
	}
	toString() {
		const {type, id, params} = this;
		return NicoQuery.build(type, id, params);
	}
	get title() {
		if(this.params.title) {
			return this.params.title;
		}
		const {type, id} = this;
		switch(type) {
			case 'tag':
				return `タグ検索 「${this.searchWord}」`;
			case 'search':
				return `キーワード検索 「${this.searchWord}」`;
			case 'user':
				return `投稿動画一覧 user/${id}`;
			case 'deflist':
				return 'とりあえずマイリスト';
			case 'nicorepo':
				return 'ニコレポ新着動画';
			case 'mylist':
			case 'mymylist':
				return `マイリスト mylist/${id}`;
			case 'series':
				return `シリーズ series/${id}`;
			case 'ranking':
				return `ランキング ranking/${id || 'all'}`;
			case '':
				return `チャンネル動画 channel/${id}`;
			default:
				return '';
		}
	}
	set title(v) {
		this.params.title = v;
	}
	get baseString() {
		return NicoQuery.build(this.type, this.id, this.baseParams);
	}
	get string() {
		return this.toString();
	}
	get baseParams() {
		const params = Object.assign({}, this.params);
		delete params.title;
		return params;
	}
	get isSearch() {
		return this.type === 'search' || this.type === 'tag';
	}
	get isSearchReady() {
		return this.isSearch && this.searchWord;
	}
	get searchWord() {
		return (this.id || '').trim();
	}
	get isOwnerFilterEnable() {
		return this.params.ownerFilter || this.params.userId || this.params.chanelId;
	}
	set isOwnerFilterEnable(v) {
		this.params.userId = this.params.chanelId = null;
		if (v) {
			this.params.ownerFilter = true;
		} else {
			this.params.ownerFilter = false;
		}
	}
	get searchParams() {
		const {type, params} = this;
		return {
			searchType: type,
			order: (params.sort || '').charAt(0) === '-' ? 'd' : 'a',
			sort: (params.sort || '').substring(1),
			userId: this.isOwnerFilterEnable && params.userId || null,
			channelId: this.isOwnerFilterEnable && params.channelId || null,
			dateFrom: params.start || null,
			dateTo: params.end || null,
			commentCount: params.commentCount || null,
			f_range: params.fRange || null,
			l_range: params.lRange || null
		};
	}
	nearlyEquals(query) {
		if (typeof query === 'string') {
			query = new NicoQuery(query);
		}
		return this.baseString === query.baseString;
	}
	equals(query) {
		if (typeof query === 'string') {
			query = new NicoQuery(query);
		}
		return this.toString() === query.toString();
	}
}
util.NicoQuery = NicoQuery;
const sleep = Object.assign(function(time = 0) {
		return new Promise(res => setTimeout(res, time));
	},{
	idle: (() => {
		if (window.requestIdleCallback) {
			return () => new Promise(res => requestIdleCallback(res));
		}
		return () => new Promise(res => setTimeout(res, 0));
	}),
	raf: () => new Promise(res => requestAnimationFrame(res)),
	promise: () => Promise.resolve()
});
util.sleep = sleep;
// already required
util.bounce = bounce;
ZenzaWatch.lib.$ = uQuery;
workerUtil.env({netUtil, global});
const initCssProps = () => {
	const LEN = '<length>';
	const TM = '<time>';
	const LP = '<length-percentage>';
	const CL = '<color>';
	const NUM = '<number>';
	const SEC1 = cssUtil.s(1);
	const PX0 = cssUtil.px(0);
	const TP = 'transparent';
	const inherits = true;
	cssUtil.registerProps(
		{name: '--zenza-ui-scale',
			syntax: NUM, initialValue: 1,  inherits},
		{name: '--zenza-control-bar-height',
			syntax: LEN, initialValue: cssUtil.px(48), inherits},
		{name: '--zenza-comment-layer-opacity',
			syntax: NUM, initialValue: 1,  inherits},
		{name: '--zenza-comment-panel-header-height',
			syntax: LEN, initialValue: cssUtil.px(64), inherits},
		{name: '--sideView-left-margin',
			syntax: LP, initialValue: cssUtil.px(CONSTANT.SIDE_PLAYER_WIDTH + 24), inherits},
		{name: '--sideView-top-margin',
			syntax: LP, initialValue: cssUtil.px(76), inherits},
		{name: '--current-time',
			syntax: TM,  initialValue: SEC1, inherits},
		{name: '--scroll-top',
			syntax: LEN, initialValue: PX0,  inherits},
		{name: '--vpos-time',
			syntax: TM,  initialValue: SEC1, inherits},
		{name: '--duration',
			syntax: TM,  initialValue: cssUtil.s(4), inherits},
		{name: '--playback-rate',
			syntax: NUM, initialValue: 1, inherits},
		{name: '--trans-x-pp',
			syntax: LP, initialValue: PX0, inherits: false},
		{name: '--trans-y-pp',
			syntax: LP, initialValue: PX0, inherits: false},
		{name: '--width-pp',
			syntax: LP, initialValue: PX0, inherits},
		{name: '--height-pp',
			syntax: LP, initialValue: PX0, inherits},
		{name: '--base-bg-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--base-fore-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--light-text-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--scrollbar-bg-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--scrollbar-thumb-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--item-border-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--hatsune-color',
			syntax: CL, initialValue: TP, inherits},
		{name: '--enabled-button-color',
			syntax: CL, initialValue: TP, inherits}
	);
};
initCssProps();
class BaseCommandElement extends HTMLElement {
	static toAttributeName(camel) {
		return 'data-' + camel.replace(/([A-Z])/g, s =>  '-' + s.toLowerCase());
	}
	static toPropName(snake) {
		return snake.replace(/^data-/, '').replace(/(-.)/g, s =>  s.charAt(1).toUpperCase());
	}
	static async importLit() {
		if (dll.lit) {
			return dll.lit;
		}
		dll.lit = await util.dimport('https://unpkg.com/lit-html?module');
		return dll.lit;
	}
	static get observedAttributes() {
		return [];
	}
	static get propTypes() {
		return {};
	}
	static get defaultProps() {
		return {};
	}
	static get defaultState() {
		return {};
	}
	static async getTemplate(state = {}, props = {}, events = {}) {
		let {html} = dll.lit || await this.importLit();
		return html`<div id="root" data-state="${JSON.stringify(state)}"
			data-props="${JSON.stringify(props)}" @click=${events.onClick}></div>`;
	}
	constructor() {
		super();
		this._isConnected = false;
		this.props = Object.assign({}, this.constructor.defaultProps, this._initialProps);
		this.state = Object.assign({}, this.constructor.defaultState);
		this._boundOnUIEvent = this.onUIEvent.bind(this);
		this._boundOnCommand = this.onCommand.bind(this);
		this.events = {
			onClick: this._boundOnUIEvent
		};
		this._idleRenderCallback = async () => {
			this._idleCallbackId = null;
			return await this.render();
		};
	}
	get _initialProps() {
		const props = {};
		for (let key of Object.keys(this.constructor.propTypes)) {
			if (!this.dataset[key]) { continue; }
			const type = typeof this.constructor.propTypes[key];
			props[key] = type !== 'string' ? JSON.parse(this.dataset[key]) : this.dataset[key];
		}
		return props;
	}
	async render() {
		if (!this._isConnected) {
			return;
		}
		let {render} = dll.lit || await this.constructor.importLit();
		if (!this._shadow) {
			this._shadow = this.attachShadow({mode: 'open'});
		}
		render(await this.constructor.getTemplate(this.state, this.props, this.events), this._shadow);
		if (!this._root) {
			const root = this._shadow.querySelector('#root');
			if (!root) {
				return;
			}
			this._root = root;
			this._root.addEventListener('command', this._boundOnCommand);
		}
	}
	requestRender(isImmediate = false) {
		if (this._idleCallbackId) {
			clearTimeout(this._idleCallbackId);
		}
		if (isImmediate) {
			this._idleRenderCallback();
		} else {
			this._idleCallbackId = setTimeout(this._idleRenderCallback, 0);
		}
	}
	async connectedCallback() {
		this._isConnected = true;
		await this.render();
	}
	async disconnectedCallback() {
		this._isConnected = false;
		if (this._root) {
			this._root.removeEventListener('click', this._boundOnUIEvent);
			this._root.removeEventListener('command', this._boundOnCommand);
			this._root = null;
		}
		let {render} = dll.lit || await this.constructor.importLit();
		render('', this._shadow);
		this._shadow = null;
	}
	attributeChangedCallback(attr, oldValue, newValue) {
		attr = attr.startsWith('data-') ? this.constructor.toPropName(attr) : attr;
		const type = typeof this.constructor.propTypes[attr];
		if (type !== 'string') {
			newValue = JSON.parse(newValue);
		}
		if (this.props[attr] === newValue) {
			return;
		}
		this.props[attr] = newValue;
		this.requestRender();
	}
	setProp(prop, value) {
		this.setAttribute(prop, value);
	}
	setState(key, value) {
		if (this._setState(key, value)) {
			this.requestRender();
			return true;
		}
		return false;
	}
	_setState(key, value) {
		if (typeof key !== 'string') { return this._setStates(key); }
		if (!this.state.hasOwnProperty(key)) { return false; }
		if (this.state[key] === value) { return false; }
		this.state[key] = value;
		return true;
	}
	_setStates(states) {
		return Object.keys(states).filter(key => this._setState(key, states[key])).length > 0;
	}
	onUIEvent(e) {
		let target = e.target.closest('[data-command]');
		if (!target) {
			return;
		}
		let {command, param, type} = target.dataset;
		if (['number', 'boolean', 'json'].includes(type)) {
			param = JSON.parse(param);
		}
		e.preventDefault();
		e.stopPropagation();
		return this.dispatchCommand(command, param, e, target);
	}
	dispatchCommand(command, param, originalEvent = null, target = null) {
		(target || this).dispatchEvent(new CustomEvent('command', {detail: {command, param, originalEvent}, bubbles: true, composed: true}));
	}
	onCommand(e) {
	}
	get propset() {
		return Object.assign({}, this.props);
	}
	set propset(props) {
		const keys = Object.keys(props).filter(key => this.props.hasOwnProperty(key));
		const changed = keys.filter(key => {
			if (this.props[key] === props[key]) {
				return false;
			}
			this.props[key] = props[key];
			return true;
		}).length > 0;
		if (changed) {
			this.requestRender();
		}
	}
}
const {VideoItemElement, VideoItemProps} = (() => {
	const ITEM_HEIGHT = 100;
	const THUMBNAIL_WIDTH = 96;
	const THUMBNAIL_HEIGHT = 72;
	const BLANK_THUMBNAIL = 'https://nicovideo.cdn.nimg.jp/web/img/series/no_thumbnail.png';
	const VideoItemProps = {
		watchId: '',
		videoId: '',
		threadId: '',
		title: '',
		duration: 0,
		commentCount: 0,
		mylistCount: 0,
		viewCount: 0,
		thumbnail: BLANK_THUMBNAIL,
		postedAt: '',
		description: '',
		mylistComment: '',
		isChannel: false,
		isMymemory: false,
		ownerId: 0,
		ownerName: '',
		thumbInfo: {},
		hasInview: false,
		lazyload: false
	};
	const VideoItemAttributes = Object.keys(VideoItemProps).map(prop => BaseCommandElement.toAttributeName(prop));
	class VideoItemElement extends BaseCommandElement {
		static get propTypes() {
			return VideoItemProps;
		}
		static get defaultProps() {
			return VideoItemProps;
		}
		static get observedAttributes() {
			return VideoItemAttributes;
		}
		static get defaultState() {
			return {
				isActive: false,
				isPlayed: false
			};
		}
		static async getTemplate(state = {}, props = {}, events = {}) {
			const {html} = dll.list || await this.importLit();
			const watchId = props.watchId;
			const watchUrl = `https://www.nicovideo.jp/watch/${props.watchId}`;
			const title = props.title ? html`<span title="${props.title}">${props.title}<span>` : props.watchId;
			const duration = props.duration ? html`<span class="duration">${textUtil.secToTime(props.duration)}</span>` : '';
			const postedAt = props.postedAt ? `${textUtil.dateToString(new Date(props.postedAt))}` : '';
			const thumbnail = props.lazyload ? BLANK_THUMBNAIL : props.thumbnail;
			const counter =  (props.viewCount || props.commentCount || props.mylistCount) ? html`
				<div class="counter">
					<span class="count">再生: <span class="value viewCount">${props.viewCount}</span></span>
					<span class="count">コメ: <span class="value commentCount">${props.commentCount}</span></span>
					<span class="count">マイ: <span class="value mylistCount">${props.mylistCount}</span></span>
				</div>
				` : '';
				const classes = [];
				props.isChannel && classes.push('is-channel');
			return html`
		<div id="root" @click=${events.onClick} class="${classes.join(' ')}">
		<style>
			* {
				box-sizing: border-box;
			}
			#root {
				background-color: var(--list-bg-color, #666);
				box-sizing: border-box;
				user-select: none;
			}
			.videoItem {
				position: relative;
				display: grid;
				width: 100%;
				height: ${ITEM_HEIGHT}px;
				overflow: hidden;
				grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
				grid-template-rows: ${THUMBNAIL_HEIGHT}px 1fr;
				padding: 2px;
				contain: layout size;
			}
			.thumbnailContainer {
				position: relative;
				/*transform: translate(0, 2px);*/
				margin: 0;
				background-color: black;
				background-size: contain;
				background-repeat: no-repeat;
				background-position: center;
			}
			.thumbnail {
				position: absolute;
				top: 0;
				left: 0;
				width: 96px;
				height: 72px;
				object-fit: contain;
			}
			.thumbnailContainer a {
				display: inline-block;
				width:  96px;
				height: 72px;
				transition: box-shaow 0.4s ease, transform 0.4s ease;
			}
			.thumbnailContainer a:active {
				box-shadow: 0 0 8px #f99;
				transform: translate(0, 4px);
				transition: none;
			}
			.thumbnailContainer .playlistAppend,
			.playlistRemove,
			.thumbnailContainer .deflistAdd,
			.thumbnailContainer .pocket-info {
				position: absolute;
				display: none;
				color: #fff;
				background: #666;
				width: 24px;
				height: 20px;
				line-height: 18px;
				font-size: 14px;
				box-sizing: border-box;
				text-align: center;
				font-weight: bolder;
				cursor: pointer;
			}
			.thumbnailContainer .playlistAppend {
				left: 0;
				bottom: 0;
			}
			.playlistRemove {
				right: 8px;
				top: 0;
			}
			.thumbnailContainer .deflistAdd {
				right: 0;
				bottom: 0;
			}
			.thumbnailContainer .pocket-info {
				display: none !important;
				right: 24px;
				bottom: 0;
			}
			:host-context(.is-pocketReady) .videoItem:hover .pocket-info {
				display: inline-block !important;
			}
			.videoItem:hover .thumbnailContainer .playlistAppend,
			.videoItem:hover .thumbnailContainer .deflistAdd,
			.videoItem:hover .thumbnailContainer .pocket-info {
				display: inline-block;
				border: 1px outset;
			}
			.videoItem:hover .thumbnailContainer .playlistAppend:hover,
			.videoItem:hover .thumbnailContainer .deflistAdd:hover,
			.videoItem:hover .thumbnailContainer .pocket-info:hover {
				transform: scale(1.5);
				box-shadow: 2px 2px 2px #000;
			}
			.videoItem:hover .thumbnailContainer .playlistAppend:active,
			.videoItem:hover .thumbnailContainer .deflistAdd:active,
			.videoItem:hover .thumbnailContainer .pocket-info:active {
				transform: scale(1.3);
				border: 1px inset;
				transition: none;
			}
			.videoItem.is-updating .thumbnailContainer .deflistAdd {
				transform: scale(1.0) !important;
				border: 1px inset !important;
				pointer-events: none;
			}
			.thumbnailContainer .duration {
				position: absolute;
				right: 0;
				bottom: 0;
				background: #000;
				font-size: 12px;
				color: #fff;
			}
			.videoItem:hover .thumbnailContainer .duration {
				display: none;
			}
			.videoInfo {
				height: 100%;
				padding-left: 4px;
			}
			.postedAt {
				font-size: 12px;
				color: var(--list-text-color, #ccc);
			}
			.is-played .postedAt::after {
				content: ' ●';
				font-size: 10px;
			}
			.counter {
				position: absolute;
				top: 80px;
				width: 100%;
				text-align: center;
			}
			.title {
				line-height: 20px;
				height: 40px;
				overflow: hidden;
			}
			.is-channel .title::before {
				content: '[CH]';
				display: inline;
				font-size: 12px;
				background: #888;
				color: #ccc;
				padding: 0 2px;
				margin: 0;
			}
			.videoLink {
				font-size: 14px;
				color: var(--list-video-link-color, #ff9);
				transition: background 0.4s ease, color 0.4s ease;
			}
			.videoLink:visited {
				color: var(--list-video-link-visited-color, #ffd);
			}
			.videoLink:active {
				color: var(--list-video-link-active-color, #fff);
				transition: none;
			}
			.noVideoCounter .counter {
				display: none;
			}
			.counter {
				font-size: 12px;
				color: var(--list-text-color, #ccc);
			}
			.counter .value {
				font-weight: bolder;
			}
			.counter .count {
				white-space: nowrap;
			}
			.counter .count + .count {
				margin-left: 8px;
			}
			</style>
			<div class="videoItem">
				<span class="playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
				<div class="thumbnailContainer">
					<a class="command" data-command="open" data-param="${watchId}" href="${watchUrl}">
						<img src="${thumbnail}" class="thumbnail" loading="lazy">
						${duration}
					</a>
					<span class="playlistAppend" data-command="playlistAppend" data-param="${watchId}" title="プレイリストに追加">▶</span>
					<span class="deflistAdd"  data-command="deflistAdd" data-param="${watchId}" title="とりあえずマイリスト">&#x271A;</span>
					<span class="pocket-info" data-command="pocket-info" data-param="${watchId}" title="動画情報">？</span>
				</div>
				<div class="videoInfo">
					<div class="postedAt">${postedAt}</div>
					<div class="title">
						<a class="videoLink" data-command="open" data-param="${watchId}" href="${watchUrl}">${title}</a>
					</div>
				</div>
				${counter}
		</div>
	</div>`;
		}
		_applyThumbInfo(thumbInfo) {
			const data = thumbInfo.data || thumbInfo; // legacy 互換のため
			const thumbnail = this.props.thumbnail.match(/smile\?i=/) ?
				this.props.thumbnail : data.thumbnail;
			const isChannel = data.v.startsWith('so') || data.owner.type === 'channel';
			const watchId = isChannel ? data.id : data.v;
			Object.assign(this.dataset, {
				watchId,
				videoId: data.id,
				title: data.title,
				duration: data.duration,
				commentCount: data.commentCount,
				mylistCount: data.mylistCount,
				viewCount: data.viewCount,
				thumbnail,
				postedAt: data.postedAt,
				ownerId: data.owner.id,
				ownerName: data.owner.name,
				ownerIcon: data.owner.icon,
				owerUrl: data.owner.url,
				isChannel
			});
			this.dispatchEvent(new CustomEvent('thumb-info', {detail: {props: this.props}, bubbles: true, composed: true}));
		}
		attributeChangedCallback(attr, oldValue, newValue) {
			if (attr === 'data-lazyload') {
				this.props.lazyload = newValue !== 'false';
				return this.requestRender(true);
			}
			if (attr !== 'data-thumb-info') {
				return super.attributeChangedCallback(attr, oldValue, newValue);
			}
			const info = JSON.parse(newValue);
			if (!info || info.status !== 'ok') {
				return;
			}
			this._applyThumbInfo(info);
		}
	}
	return {VideoItemElement, VideoItemProps};
})();
const {VideoSeriesProps, VideoSeriesLabel} = (() => {
	const ITEM_HEIGHT = 100;
	const THUMBNAIL_WIDTH = 120;
	const DEFAULT_THUMBNAIL = 'https://nicovideo.cdn.nimg.jp/web/img/series/no_thumbnail.png';
	const VideoSeriesProps = {
		id: 0,
		title: '',
		thumbnailUrl: DEFAULT_THUMBNAIL,
		createdAt: '',
		updatedAt: ''
	};
	const VideoSeriesAttributes = Object.keys(VideoSeriesProps).map(prop => BaseCommandElement.toAttributeName(prop));
	class VideoSeriesLabel extends BaseCommandElement {
		static get propTypes() {
			return VideoSeriesProps;
		}
		static get defaultProps() {
			return VideoSeriesProps;
		}
		static get observedAttributes() {
			return VideoSeriesAttributes;
		}
		static async getTemplate(state = {}, props = {}, events = {}) {
			const {html} = dll.list || await this.importLit();
			if (!props.id) {
				return html``;
			}
			const title = props.title || `series/${props.id}`;
			const url = `https://www.nicovideo.jp/series/${props.id}`;
			const thumbnail = props.thumbnailUrl? props.thumbnailUrl : DEFAULT_THUMBNAIL;
			return html`
		<div id="root" @click=${events.onClick}>
		<style>
			* {
				box-sizing: border-box;
			}
			#root {
				box-sizing: border-box;
				user-select: none;
				cursor: pointer;
				color: #ccc;
			}
			.seriesInfo {
				position: relative;
				display: grid;
				width: 100%;
				height: ${ITEM_HEIGHT}px;
				overflow: hidden;
				grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
				contain: layout size;
				padding: 8px;
				border: 1px;
				transition: transform 0.2s, box-shadow 0.2s;
				background-color: #666;
				border-radius: 4px;
			}
			#root .seriesInfo {
				transform: translate(0, -4px);
				box-shadow: 0 4px 0 #333;
			}
			#root:active .seriesInfo {
				transition: none;
				transform: none;
				box-shadow: none;
				color: #fff;
				text-shadow: 0 0 6px #fff;
			}
			.thumbnailContainer {
				position: relative;
				background-color: black;
				height: ${ITEM_HEIGHT - 16}px;
			}
			.thumbnail {
				position: absolute;
				top: 0;
				left: 0;
				width: ${THUMBNAIL_WIDTH}px;
				height: ${ITEM_HEIGHT - 16}px;
				object-fit: cover;
				filter: sepia(100%);
			}
			#root:hover .thumbnail {
				filter: none;
			}
			.info {
				height: 100%;
				padding: 4px 8px;
				display: flex;
			}
			.info p {
				font-size: 12px;
				margin: 0;
			}
			.title {
				line-height: 20px;
				overflow: hidden;
				word-break: break-all;
			}
			.seriesLink {
				font-size: 14px;
				color: var(--list-video-link-color, #ff9);
				transition: background 0.4s ease, color 0.4s ease;
			}
			.seriesLink:hover {
				text-decoration: underline;
			}
			.seriesLink:visited {
				color: var(--list-video-link-visited-color, #ffd);
			}
			.seriesLink:active {
				color: var(--list-video-link-active-color, #fff);
				transition: none;
			}
			.playButton {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) scale(1.5);
				width: 32px;
				height: 24px;
				border-radius: 8px;
				text-align: center;
				background: rgba(0, 0, 0, 0.8);
				box-shadow: 0 0 4px #ccc;
				transition: transform 0.2s ease, box-shadow 0.2s, text-shadow 0.2s, font-size 0.2s;
				font-size: 22px;
				line-height: 25px;
			}
			#root:hover .playButton {
				transform: translate(-50%, -50%) scale(2.0);
			}
			#root:active .playButton {
				transform: translate(-50%, -50%) scale(3.0, 1.2);
			}
			</style>
			<div class="seriesInfo" data-command="playlistSetSeries" data-param="${props.id}" title="このシリーズを見る">
				<div class="thumbnailContainer">
					<img src="${thumbnail}" class="thumbnail" loading="lazy">
					<div class="playButton">▶</div>
				</div>
				<div class="info">
					<div class="title">
						<p>動画シリーズ</p>
						<a class="seriesLink" href="${url}" data-command="open-window" data-param="${url}">${title}</a>
					</div>
				</div>
			</div>
	</div>`;
		}
		onCommand(e) {
			if (e.detail.command === 'open-window') {
				window.open(e.detail.param);
			}
		}
	}
	if (window.customElements) {
		customElements.get('zenza-video-series-label') || window.customElements.define('zenza-video-series-label', VideoSeriesLabel);
	}
	return {
		VideoSeriesProps, VideoSeriesLabel
	};
})();
if (window.customElements && !customElements.get('no-web-component')) {
	window.customElements.define('no-web-component', class extends HTMLElement {
		constructor() {
			super();
			this.hidden = true;
			this.attachShadow({mode: 'open'});
		}
	});
}
class RangeBarElement extends HTMLElement {
	getTemplate() {
		return uq.html`
			<div id="root">
			<style>
				* {
					box-sizing: border-box;
					user-select: none;
					--back-color: #333;
					--fore-color: #ccc;
					--width: 64px;
					--height: 8px;
					--range-percent: 0%;
				}
				#root {
					width: var(--width);
					height: 100%;
					display: flex;
					align-items: center;
				}
				input, .meter {
					width: var(--width);
					height: var(--height);
				}
				input {
					-webkit-appearance: none;
					pointer-events: auto;
					opacity: 0;
					outline: none;
					cursor: pointer;
				}
				input::-webkit-slider-thumb {
					-webkit-appearance: none;
					height: var(--height);
					width: 2px;
				}
				input::-moz-range-thumb {
					height: var(--height);
					width: 2px;
				}
				.meter {
					position: absolute;
					display: inline-block;
					vertical-align: middle;
					background-color: var(--back-color);
					background:
						linear-gradient(to right,
							var(--fore-color), var(--fore-color) var(--range-percent),
							var(--back-color) 0, var(--back-color)
						);
					contain: style layout size;
					pointer-events: none;
				}
				.tooltip {
					display: none;
					pointer-events: none;
					position: absolute;
					left: 50%;
					top: -24px;
					transform: translateX(-50%);
					font-size: 12px;
					line-height: 16px;
					padding: 2px 4px;
					border: 1px solid #000;
					background: #ffc;
					color: black;
					text-shadow: none;
					white-space: nowrap;
					z-index: 100;
				}
				.tooltip:empty { display: none !mportant; }
				#root:active .tooltip { display: inline-block; }
			</style>
			<div class="meter"><div class="tooltip"></div></div>
		</div>`;
	}
	constructor() {
		super();
		this.update = bounce.raf(this.update.bind(this));
		this._value = this.getAttribute('value') || '';
	}
	connectedCallback() {
		if (this._rangeInput) {
			return;
		}
		const range = this.querySelector('input[type=range]');
		if (range) {
			this.rangeInput = range;
		}
	}
	onChange() {
		this.update();
		domEvent.dispatchCustomEvent(this, 'input', {value: this.value}, {bubbles: true, composed: true});
	}
	update() {
		if (!this.rangeInput) { return; }
		const range = this.rangeInput;
		const min   = range.min * 1;
		const max   = range.max * 1;
		const value = range.value * 1;
		if (this.lastValue === value) {
			return;
		}
		this.lastValue = value;
		const per = value / Math.abs(max - min) * 100;
		this.meter.style.setProperty('--range-percent', cssUtil.percent(per));
		this.tooltip.textContent = `${Math.round(per)}%`;
	}
	initShadow() {
		if (this.shadowRoot) {
			return;
		}
		this.attachShadow({mode: 'open'});
		const $tpl = this.$tpl = this.getTemplate();
		$tpl.appendTo(this.shadowRoot);
		this.meter = $tpl.find('.meter')[0];
		this.tooltip = $tpl.find('.tooltip')[0];
	}
	get rangeInput() {
		return this._rangeInput;
	}
	set rangeInput(range) {
		this._rangeInput = range;
		range.view = this;
		this._value && (range.value = this._value);
		this.initShadow();
		this.meter.after(range);
		this.update();
		uq(range).on('input', this.onChange.bind(this));
	}
	get value() {
		return this.rangeInput ? this.rangeInput.value : this._value;
	}
	set value(v) {
		this._value = v;
		if (this.rangeInput) {
			this.rangeInput.value = v;
			this.update();
		}
	}
}
cssUtil.registerProps(
	{name: '--range-percent', syntax: '<percentage>', initialValue: '0%', inherits: true}
);
if (window.customElements) {
	customElements.get('zenza-range-bar') || window.customElements.define('zenza-range-bar', RangeBarElement);
}
const components = (() => {
	if (window.customElements) {
		customElements.get('zenza-video-item') || customElements.define('zenza-video-item', VideoItemElement);
	}
	return {
		BaseCommandElement,
		VideoItemElement,
		VideoSeriesLabel,
		RangeBarElement
	};
})();
class BaseState extends Emitter {
	constructor() {
		super();
		this._name = '';
		this._state = {};
		this._props = {};
		this._changed = new Map;
		this._boundOnChange = bounce.time(this._onChange.bind(this));
	}
	_defineProperty() {
		Object.keys(this._state).forEach(key => {
			Object.defineProperty(
				this,
				key, {
					get: () => this._state[key],
					set: v => this._setState(key, v)
				});
		});
	}
	onkey(key, func) {return this.on(`update-${key}`, func);}
	offkey(key, func) {return this.off(`update-${key}`, func);}
	_onChange() {
		const changed = this._changed;
		this.emit('change', changed, changed.size);
		if (!changed.size) {
			return;
		}
		for (const [key, val] of changed) {
			this.emit('update', key, val);
			this.emit(`update-${key}`, val);
		}
		this._changed.clear();
	}
	setState(key, val) {
		if (typeof key === 'string') {
			return this._setState(key, val);
		}
		for (const k of (key instanceof Map ? key : Object.keys(key))) {
			this._setState(k, key[k]);
		}
	}
	_setState(key, val) {
		if (!this._state.hasOwnProperty(key)) {
			window.console.warn('%cUnknown property %s = %s', 'background: yellow;', key, val);
			console.trace();
		}
		if (this._state[key] === val) {
			return;
		}
		this._state[key] = val;
		this._changed.set(key, val);
		this._boundOnChange();
	}
}
class PlayerState extends BaseState {
	static getInstance(config) {
		if (!PlayerState.instance) {
			PlayerState.instance = new PlayerState(config);
		}
		return PlayerState.instance;
	}
	constructor(config) {
		super();
		this._name = 'Player';
		this._state = {
			isAbort: false,
			isBackComment: config.props.backComment,
			isChanging: false,
			isChannel: false,
			isShowComment: config.props.showComment,
			isCommentReady: false,
			isCommentPosting: false,
			isCommunity: false,
			isWaybackMode: false,
			isDebug: config.props.debug,
			isDmcAvailable: false,
			isDmcPlaying: false,
			isError: false,
			isLoading: false,
			isLoop: config.props.loop,
			isMute: config.props.mute,
			isMymemory: false,
			isOpen: false,
			isPausing: true,
			isPlaylistEnable: false,
			isPlaying: false,
			isSeeking: false,
			isRegularUser: !nicoUtil.isPremium(),
			isStalled: false,
			isUpdatingDeflist: false,
			isUpdatingMylist: false,
			isNotPlayed: true,
			isYouTube: false,
			isEnableFilter: config.props.enableFilter,
			sharedNgLevel: config.props.sharedNgLevel,
			currentSrc: '',
			currentTab: config.props.videoInfoPanelTab,
			errorMessage: '',
			screenMode: config.props.screenMode,
			playbackRate: config.props.playbackRate,
			thumbnail: '',
			videoCount: {},
			videoSession: {}
		};
		this._defineProperty();
	}
	set videoInfo(videoInfo) {
		if (this._videoInfo) {
			this._videoInfo.update(videoInfo);
		} else {
			this._videoInfo = videoInfo;
		}
		global.debug.videoInfo = videoInfo;
		this.videoCount = videoInfo.count;
		this.thumbnail = videoInfo.betterThumbnail;
		this.emit('update-videoInfo', videoInfo);
	}
	get videoInfo() {
		return this._videoInfo;
	}
	set chatList(chatList) {
		this._chatList = chatList;
		this.emit('update-chatList', this._chatList);
	}
	get chatList() {
		return this._chatList;
	}
	resetVideoLoadingStatus() {
		this.setState({
			isLoading: true,
			isPlaying: false,
			isPausing: true,
			isSeeking: false,
			isStalled: false,
			isError: false,
			isAbort: false,
			isMymemory: false,
			isCommunity: false,
			isChannel: false,
			currentSrc: CONSTANT.BLANK_VIDEO_URL
		});
	}
	setVideoCanPlay() {
		this.setState({
			isStalled: false, isLoading: false, isPausing: true, isNotPlayed: true, isError: false, isSeeking: false
		});
	}
	setPlaying() {
		this.setState({
			isPlaying: true,
			isPausing: false,
			isLoading: false,
			isNotPlayed: false,
			isError: false,
			isStalled: false
		});
	}
	setPausing() {
		this.setState({isPlaying: false, isPausing: true});
	}
	setVideoEnded() {
		this.setState({isPlaying: false, isPausing: true, isSeeking: false});
	}
	setVideoErrorOccurred() {
		this.setState({isError: true, isPlaying: false, isPausing: true, isLoading: false, isSeeking: false});
	}
}
const CacheStorage = (() => {
	const PREFIX = `${PRODUCT}_cache_`;
	class CacheStorage {
		constructor(storage) {
			this._storage = storage;
			this.gc = _.debounce(this.gc.bind(this), 100);
		}
		gc(now = NaN) {
			const storage = this._storage;
			now = isNaN(now) ? Date.now() : now;
			Object.keys(storage).forEach(key => {
				if (key.indexOf(PREFIX) === 0) {
					let item;
					try {
						item = JSON.parse(this._storage[key]);
					} catch(e) {
						storage.removeItem(key);
					}
					if (item.expiredAt === '' || item.expiredAt > now) {
						return;
					}
					storage.removeItem(key);
				}
			});
		}
		setItem(key, data, expireTime) {
			key = PREFIX + key;
			const expiredAt =
				typeof expireTime === 'number' ? (Date.now() + expireTime) : '';
			const cacheData = {
				data: data,
				type: typeof data,
				expiredAt: expiredAt
			};
			try {
				this._storage[key] = JSON.stringify(cacheData);
				this.gc();
			} catch (e) {
				if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
					this.gc(0);
				}
			}
		}
		getItem(key) {
			key = PREFIX + key;
			if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
				return null;
			}
			let item = null;
			try {
				item = JSON.parse(this._storage[key]);
			} catch(e) {
				this._storage.removeItem(key);
				return null;
			}
			if (item.expiredAt === '' || item.expiredAt > Date.now()) {
				return item.data;
			}
			return null;
		}
		removeItem(key) {
			key = PREFIX + key;
			if (this._storage.hasOwnProperty(key) || this._storage[key] !== undefined) {
				this._storage.removeItem(key);
			}
		}
		clear() {
			const storage = this._storage;
			Object.keys(storage).forEach(v => {
				if (v.indexOf(PREFIX) === 0) {
					storage.removeItem(v);
				}
			});
		}
	}
	return CacheStorage;
})();
const VideoInfoLoader = (function () {
	const cacheStorage = new CacheStorage(sessionStorage);
	const parseFromGinza = function (dom) {
		try {
			let watchApiData = JSON.parse(dom.querySelector('#watchAPIDataContainer').textContent);
			let videoId = watchApiData.videoDetail.id;
			let hasLargeThumbnail = nicoUtil.hasLargeThumbnail(videoId);
			let flvInfo = textUtil.parseQuery(
				decodeURIComponent(watchApiData.flashvars.flvInfo)
			);
			let dmcInfo = JSON.parse(
				decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
			);
			let thumbnail =
				watchApiData.flashvars.thumbImage +
				(hasLargeThumbnail ? '.L' : '');
			let videoUrl = flvInfo.url ? flvInfo.url : '';
			let isEco = /\d+\.\d+low$/.test(videoUrl);
			let isFlv = /\/smile\?v=/.test(videoUrl);
			let isMp4 = /\/smile\?m=/.test(videoUrl);
			let isSwf = /\/smile\?s=/.test(videoUrl);
			let isDmc = watchApiData.flashvars.isDmc === 1 && dmcInfo.session_api;
			let csrfToken = watchApiData.flashvars.csrfToken;
			let playlistToken = watchApiData.playlistToken;
			let watchAuthKey = watchApiData.flashvars.watchAuthKey;
			let seekToken = watchApiData.flashvars.seek_token;
			let threads = [];
			let msgInfo = {
				server: flvInfo.ms,
				threadId: flvInfo.thread_id * 1,
				duration: flvInfo.l,
				userId: flvInfo.user_id,
				isNeedKey: flvInfo.needs_key === '1',
				optionalThreadId: flvInfo.optional_thread_id,
				defaultThread: {id: flvInfo.thread_id * 1},
				optionalThreads: [],
				layers: [],
				threads,
				userKey: flvInfo.userkey,
				hasOwnerThread: !!watchApiData.videoDetail.has_owner_thread,
				when: null
			};
			if (msgInfo.hasOwnerThread) {
				threads.push({
					id: flvInfo.thread_id * 1,
					isThreadkeyRequired: flvInfo.needs_key === '1',
					isDefaultPostTarget: false,
					fork: 1,
					isActive: true,
					label: 'owner'
				});
			}
			threads.push({
				id: flvInfo.thread_id * 1,
				isThreadkeyRequired: flvInfo.needs_key === '1',
				isDefaultPostTarget: true,
				isActive: true,
				label: flvInfo.needs_key === '1' ? 'community' : 'default'
			});
			let playlist =
				JSON.parse(dom.querySelector('#playlistDataContainer').textContent);
			const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
			const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));
			cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);
			dmcInfo.quality = {
				audios: (dmcInfo.session_api || {audios: []}).audios.map(id => {return {id, available: true, bitrate: 64000};}),
				videos: (dmcInfo.session_api || {videos: []}).videos.reverse()
				.map((id, level_index) => { return {
					id,
					available: true,
					level_index,
					bitrate: parseInt(id.replace(/^.*_(\d+)kbps.*/, '$1')) * 1000
				};})
				.reverse()
			};
			let result = {
				_format: 'watchApi',
				watchApiData,
				flvInfo,
				dmcInfo,
				msgInfo,
				playlist,
				isDmcOnly: isPlayable && !isPlayableSmile,
				isPlayable,
				isMp4,
				isFlv,
				isSwf,
				isEco,
				isDmc,
				thumbnail,
				csrfToken,
				playlistToken,
				watchAuthKey,
				seekToken
			};
			emitter.emitAsync('csrfTokenUpdate', csrfToken);
			return result;
		} catch (e) {
			window.console.error('error: parseFromGinza ', e);
			return null;
		}
	};
	const parseFromHtml5Watch = function (dom) {
		const watchDataContainer = dom.querySelector('#js-initial-watch-data');
		const data = JSON.parse(watchDataContainer.getAttribute('data-api-data'));
		const env = JSON.parse(watchDataContainer.getAttribute('data-environment'));
		const videoId = data.video.id;
		const hasLargeThumbnail = nicoUtil.hasLargeThumbnail(videoId);
		const flvInfo = data.video.smileInfo || {};
		const dmcInfo = data.video.dmcInfo || {};
		const thumbnail = data.video.thumbnailURL + (hasLargeThumbnail ? '.L' : '');
		const videoUrl = flvInfo.url ? flvInfo.url : '';
		const isEco = /\d+\.\d+low$/.test(videoUrl);
		const isFlv = /\/smile\?v=/.test(videoUrl);
		const isMp4 = /\/smile\?m=/.test(videoUrl);
		const isSwf = /\/smile\?s=/.test(videoUrl);
		const isDmc = !!dmcInfo && !!dmcInfo.session_api;
		const csrfToken = data.context.csrfToken;
		const watchAuthKey = data.context.watchAuthKey;
		const playlistToken = env.playlistToken;
		const context = data.context;
		const commentComposite = data.commentComposite;
		const threads = commentComposite.threads.map(t => Object.assign({}, t));
		const layers  = commentComposite.layers.map(t => Object.assign({}, t));
		layers.forEach(layer => {
			layer.threadIds.forEach(({id, fork}) => {
				threads.forEach(thread => {
					if (thread.id === id && fork === 0) {
						thread.layer = layer;
					}
				});
			});
		});
		const linkedChannelVideo =
			(context.linkedChannelVideos || []).find(ch => {
				return !!ch.isChannelMember;
			});
		const isNeedPayment = context.isNeedPayment;
		const defaultThread = threads.find(t => t.isDefaultPostTarget);
		const msgInfo = {
			server: data.thread.serverUrl,
			threadId: defaultThread ? defaultThread.id : (data.thread.ids.community || data.thread.ids.default),
			duration: data.video.duration,
			userId: data.viewer.id,
			isNeedKey: threads.findIndex(t => t.isThreadkeyRequired) >= 0, // (isChannel || isCommunity)
			optionalThreadId: '',
			defaultThread,
			optionalThreads: threads.filter(t => t.id !== defaultThread.id) || [],
			threads,
			userKey: data.context.userkey,
			hasOwnerThread: data.thread.hasOwnerThread,
			when: null
		};
		const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
		const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));
		cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);
		const playlist = {playlist: []};
		const tagList = [];
		data.tags.forEach(t => {
			tagList.push({
				_data: t,
				id: t.id,
				tag: t.name,
				dic: t.isDictionaryExists,
				lock: t.isLocked, // 形式が統一されてない悲しみを吸収
				owner_lock: t.isLocked ? 1 : 0,
				lck: t.isLocked ? '1' : '0',
				cat: t.isCategory
			});
		});
		let channelInfo = null, channelId = null;
		if (data.channel) {
			channelInfo = {
				icon_url: data.channel.iconURL || '',
				id: data.channel.id,
				name: data.channel.name,
				is_favorited: data.channel.isFavorited ? 1 : 0
			};
			channelId = channelInfo.id;
		}
		let uploaderInfo = null;
		if (data.owner) {
			uploaderInfo = {
				icon_url: data.owner.iconURL,
				id: data.owner.id,
				nickname: data.owner.nickname,
				is_favorited: data.owner.isFavorited,
				isMyVideoPublic: data.owner.isUserMyVideoPublic
			};
		}
		const watchApiData = {
			videoDetail: {
				v: data.context.watchId,
				id: data.video.id,
				title: data.video.title,
				title_original: data.video.originalTitle,
				description: data.video.description,
				description_original: data.video.originalDescription,
				postedAt: data.video.postedDateTime,
				thumbnail: data.video.thumbnailURL,
				length: data.video.duration,
				commons_tree_exists: !!data.video.isCommonsTreeExists,
				width: data.video.width,
				height: data.video.height,
				isChannel: data.channel && data.channel.id,
				isMymemory: data.context.isMyMemory, // 大文字小文字注意
				communityId: data.community ? data.community.id : null,
				channelId,
				commentCount: data.thread.commentCount,
				mylistCount: data.video.mylistCount,
				viewCount: data.video.viewCount,
				tagList,
			},
			viewerInfo: {id: data.viewer.id},
			channelInfo,
			uploaderInfo
		};
		let ngFilters = null;
		if (data.video && data.video.dmcInfo && data.video.dmcInfo.thread && data.video.dmcInfo.thread) {
			if (data.video.dmcInfo.thread.channel_ng_words && data.video.dmcInfo.thread.channel_ng_words.length) {
				ngFilters = data.video.dmcInfo.thread.channel_ng_words;
			} else if (data.video.dmcInfo.thread.owner_ng_words && data.video.dmcInfo.thread.owner_ng_words.length) {
				ngFilters = data.video.dmcInfo.thread.owner_ng_words;
			}
		}
		if (data.context && data.context.ownerNGList && data.context.ownerNGList.length) {
			ngFilters = data.context.ownerNGList;
		}
		if (ngFilters && ngFilters.length) {
			const ngtmp = [];
			ngFilters.forEach(ng => {
				if (!ng.source || !ng.destination) { return; }
				ngtmp.push(
					encodeURIComponent(ng.source) + '=' + encodeURIComponent(ng.destination));
			});
			flvInfo.ng_up = ngtmp.join('&');
		}
		const result = {
			_format: 'html5watchApi',
			_data: data,
			watchApiData,
			flvInfo,
			dmcInfo,
			msgInfo,
			playlist,
			isDmcOnly: isPlayable && !isPlayableSmile,
			isPlayable,
			isMp4,
			isFlv,
			isSwf,
			isEco,
			isDmc,
			thumbnail,
			csrfToken,
			watchAuthKey,
			playlistToken,
			series: data.series,
			isNeedPayment,
			linkedChannelVideo,
			resumeInfo: {
				initialPlaybackType: data.context.initialPlaybackType || '',
				initialPlaybackPosition: data.context.initialPlaybackPosition || 0
			}
		};
		emitter.emitAsync('csrfTokenUpdate', csrfToken);
		return result;
	};
	const parseWatchApiData = function (src) {
		const dom = document.createElement('div');
		dom.innerHTML = src;
		if (dom.querySelector('#watchAPIDataContainer')) {
			return parseFromGinza(dom);
		} else if (dom.querySelector('#js-initial-watch-data')) {
			return parseFromHtml5Watch(dom);
		} else if (dom.querySelector('#PAGEBODY .mb16p4 .font12')) {
			return {
				reject: true,
				reason: 'forbidden',
				message: dom.querySelector('#PAGEBODY .mb16p4 .font12').textContent,
			};
		} else {
			return null;
		}
	};
	const loadLinkedChannelVideoInfo = (originalData) => {
		const linkedChannelVideo = originalData.linkedChannelVideo;
		const originalVideoId = originalData.watchApiData.videoDetail.id;
		const videoId = linkedChannelVideo.linkedVideoId;
		originalData.linkedChannelData = null;
		if (originalVideoId === videoId) {
			return Promise.reject();
		}
		const url = `https://www.nicovideo.jp/watch/${videoId}`;
		window.console.info('%cloadLinkedChannelVideoInfo', 'background: cyan', linkedChannelVideo);
		return new Promise(r => {
			setTimeout(r, 1000);
		}).then(() => netUtil.fetch(url, {credentials: 'include'}))
			.then(res => res.text())
			.then(html => {
				const dom = document.createElement('div');
				dom.innerHTML = html;
				const data = parseFromHtml5Watch(dom);
				originalData.dmcInfo = data.dmcInfo;
				originalData.isDmcOnly = data.isDmcOnly;
				originalData.isPlayable = data.isPlayable;
				originalData.isMp4 = data.isMp4;
				originalData.isFlv = data.isFlv;
				originalData.isSwf = data.isSwf;
				originalData.isEco = data.isEco;
				originalData.isDmc = data.isDmc;
				return originalData;
			})
			.catch(() => {
				return Promise.reject({reason: 'network', message: '通信エラー(loadLinkedChannelVideoInfo)'});
			});
	};
	const onLoadPromise = (watchId, options, isRetry, resp) => {
		const data = parseWatchApiData(resp);
		debug.watchApiData = data;
		if (!data) {
			return Promise.reject({
				reason: 'network',
				message: '通信エラー。動画情報の取得に失敗しました。(watch api)'
			});
		}
		if (data.reject) {
			return Promise.reject(data);
		}
		if (!data.isDmc && (data.isFlv && !data.isEco)) {
			return Promise.reject({
				reason: 'flv',
				info: data,
				message: 'この動画はZenzaWatchで再生できません(flv)'
			});
		}
		if (
			!data.isPlayable &&
			data.isNeedPayment &&
			data.linkedChannelVideo &&
			Config.getValue('loadLinkedChannelVideo')) {
			return loadLinkedChannelVideoInfo(data);
		}
		if (!data.isPlayable) {
			return Promise.reject({
				reason: 'not supported',
				info: data,
				message: 'この動画はZenzaWatchで再生できません'
			});
		}
		emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId);
		return Promise.resolve(data);
	};
	const createSleep = function (sleepTime) {
		return new Promise(resolve => setTimeout(resolve, sleepTime));
	};
	const loadPromise = function (watchId, options, isRetry = false) {
		let url = `https://www.nicovideo.jp/watch/${watchId}`;
		console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);
		const query = [];
		if (options.economy === true) {
			query.push('eco=1');
		}
		if (query.length > 0) {
			url += '?' + query.join('&');
		}
		return netUtil.fetch(url, {credentials: 'include'})
			.then(res => res.text())
			.catch(() => Promise.reject({reason: 'network', message: '通信エラー(network)'}))
			.then(onLoadPromise.bind(this, watchId, options, isRetry))
			.catch(err => {
				window.console.error('err', {err, isRetry, url, query});
				if (isRetry) {
					return Promise.reject({
						watchId,
						message: err.message || '動画情報の取得に失敗したか、未対応の形式です',
						type: 'watchapi'
					});
				}
				if (err.reason === 'forbidden') {
					return Promise.reject(err);
				} else if (err.reason === 'network') {
					return createSleep(5000).then(() => {
						window.console.warn('network error & retry');
						return loadPromise(watchId, options, true);
					});
				} else if (err.reason === 'flv' && !options.economy) {
					options.economy = true;
					window.console.log(
						'%cエコノミーにフォールバック(flv)',
						'background: cyan; color: red;');
					return createSleep(500).then(() => {
						return loadPromise(watchId, options, true);
					});
				} else {
					window.console.info('watch api fail', err);
					return Promise.reject({
						watchId,
						message: err.message || '動画情報の取得に失敗',
						info: err.info
					});
				}
			});
	};
	return {
		load: function (watchId, options) {
			const timeKey = `watchAPI:${watchId}`;
			window.console.time(timeKey);
			return loadPromise(watchId, options).then(
				(result) => {
					window.console.timeEnd(timeKey);
					return result;
				},
				(err) => {
					err.watchId = watchId;
					window.console.timeEnd(timeKey);
					return Promise.reject(err);
				}
			);
		}
	};
})();
const ThumbInfoLoader = (() => {
	const BASE_URL = 'https://ext.nicovideo.jp/';
	const MESSAGE_ORIGIN = 'https://ext.nicovideo.jp/';
	let gate = null;
	const initGate = () => {
		if (gate) { return gate; }
		gate = new CrossDomainGate({
			baseUrl: BASE_URL,
			origin: MESSAGE_ORIGIN,
			type: 'thumbInfo'
		});
	};
	const load = async watchId =>  {
		initGate();
		const thumbInfo = await gate.fetch(`${BASE_URL}api/getthumbinfo/${watchId}`,
				{_format: 'text', expireTime: 24 * 60 * 60 * 1000})
				.catch(e => { return {status: 'fail', message: e.message || `gate.fetch('${watchId}') failed` }; });
		if (thumbInfo.status !== 'ok') {
			return Promise.reject(thumbInfo);
		}
		return thumbInfo;
	};
	return {initGate, load};
})();
const MylistApiLoader = (() => {
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
			}
		}
		async getDeflistItems(options = {}) {
			const url = 'https://www.nicovideo.jp/api/deflist/list';
			const cacheKey = 'deflistItems';
			const sortItem = this.sortItem;
			let cacheData = cacheStorage.getItem(cacheKey);
			if (cacheData) {
				if (options.sort) {
					cacheData = sortItem(cacheData, options.sort, 'www');
				}
				return cacheData;
			}
			const result = await netUtil.fetch(url, {credentials: 'include'}).then(r => r.json())
					.catch(e => { throw new Error('とりあえずマイリストの取得失敗(2)', e); });
			if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
				throw new Error('とりあえずマイリストの取得失敗(1)', result);
			}
			let data = result.list || result.mylistitem;
			cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
			if (options.sort) {
				data = sortItem(data, options.sort, 'www');
			}
			return data;
		}
		async getMylistItems(groupId, options = {}) {
			if (groupId === 'deflist') {
				return this.getDeflistItems(options);
			}
			const url = `https://flapi.nicovideo.jp/api/watch/mylistvideo?id=${groupId}`;
			const cacheKey = `mylistItems: ${groupId}`;
			const sortItem = this.sortItem;
			const cacheData = cacheStorage.getItem(cacheKey);
			if (cacheData) {
				return options.sort ? sortItem(cacheData, options.sort, 'flapi') : cacheData;
			}
			const result = await netUtil.fetch(url, {credentials: 'include'})
				.then(r => r.json())
				.catch(e => { throw new Error('マイリストの取得失敗(2)', e); });
			if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
				throw new Error('マイリストの取得失敗(1)', result);
			}
			let data = result.list || result.mylistitem;
			data.id = groupId;
			cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
			if (options.sort) {
				data = sortItem(data, options.sort, 'flapi');
			}
			return data;
		}
		sortItem(items, sortId, format) {
			sortId = parseInt(sortId, 10);
			let sortKey = ([
				'create_time', 'create_time',
				'mylist_comment', 'mylist_comment', // format = wwwの時はdescription
				'title', 'title',
				'first_retrieve', 'first_retrieve',
				'view_counter', 'view_counter',
				'thread_update_time', 'thread_update_time',
				'num_res', 'num_res',
				'mylist_counter', 'mylist_counter',
				'length_seconds', 'length_seconds'
			])[sortId];
			if (format === 'www' && sortKey === 'mylist_comment') {
				sortKey = 'description';
			}
			if (format === 'www' && sortKey === 'thread_update_time') {
				sortKey = 'update_time';
			}
			let order;
			switch (sortKey) {
				case 'first_retrieve':
				case 'thread_update_time':
				case 'update_time':
					order = (sortId % 2 === 1) ? 'asc' : 'desc';
					break;
				case 'num_res':
				case 'mylist_counter':
				case 'view_counter':
				case 'length_seconds':
					order = (sortId % 2 === 1) ? 'asc' : 'desc';
					break;
				default:
					order = (sortId % 2 === 0) ? 'asc' : 'desc';
			}
			if (!sortKey) {
				return items;
			}
			let getKeyFunc = (function (sortKey, format) {
				switch (sortKey) {
					case 'create_time':
					case 'description':
					case 'mylist_comment':
					case 'update_time':
						return item => item[sortKey];
					case 'num_res':
					case 'mylist_counter':
					case 'view_counter':
					case 'length_seconds':
						if (format === 'flapi') {
							return item => item[sortKey] * 1;
						} else {
							return item => item.item_data[sortKey] * 1;
						}
					default:
						if (format === 'flapi') {
							return item => item[sortKey];
						} else {
							return item => item.item_data[sortKey];
						}
				}
			})(sortKey, format);
			let compareFunc = (function (order, getKey) {
				switch (order) {
					case 'asc':
						return function (a, b) {
							let ak = getKey(a), bk = getKey(b);
							if (ak !== bk) {
								return ak > bk ? 1 : -1;
							}
							else {
								return a.id > b.id ? 1 : -1;
							}
						};
					case 'desc':
						return function (a, b) {
							let ak = getKey(a), bk = getKey(b);
							if (ak !== bk) {
								return (ak < bk) ? 1 : -1;
							}
							else {
								return a.id < b.id ? 1 : -1;
							}
						};
				}
			})(order, getKeyFunc);
			items.sort(compareFunc);
			return items;
		}
		async getMylistList() {
			const url = 'https://www.nicovideo.jp/api/mylistgroup/list';
			const cacheKey = 'mylistList';
			const cacheData = cacheStorage.getItem(cacheKey);
			if (cacheData) {
				console.log('cache exists: ', cacheKey, cacheData);
				return cacheData;
			}
			const result = await netUtil.fetch(url, {credentials: 'include'})
					.then(r => r.json())
					.catch(e => { throw new Error('マイリスト一覧の取得失敗(2)', e); });
			if (result.status !== 'ok' || !result.mylistgroup) {
				throw new Error(`マイリスト一覧の取得失敗(1) ${result.status}${result.message}`, result);
			}
			const data = result.mylistgroup;
			cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
			return data;
		}
		async findDeflistItemByWatchId(watchId) {
			const items = await this.getDeflistItems().catch(() => []);
			for (let i = 0, len = items.length; i < len; i++) {
				let item = items[i], wid = item.id || item.item_data.watch_id;
				if (wid === watchId) {
					return item;
				}
			}
			return Promise.reject();
		}
		async findMylistItemByWatchId(watchId, groupId) {
			const items = await this._getMylistItemsFromWapi(groupId).catch(() => []);
			for (let i = 0, len = items.length; i < len; i++) {
				let item = items[i], wid = item.id || item.item_data.watch_id;
				if (wid === watchId) {
					return item;
				}
			}
			return Promise.reject();
		}
		async _getMylistItemsFromWapi(groupId) {
			const url = `https://www.nicovideo.jp/api/mylist/list?group_id=${groupId}}`;
			const result = await netUtil.fetch(url, {credentials: 'include'})
				.then(r => r.json())
				.catch(e => { throw new Error('マイリスト取得失敗(2)', e); });
			if (!result || result.status !== 'ok' && !result.mylistitem) {
				window.console.info('getMylistItems fail', result);
				throw new Error('マイリスト取得失敗(1)', result);
			}
			return result.mylistitem;
		}
		async removeDeflistItem(watchId) {
			const item = await this.findDeflistItemByWatchId(watchId).catch(() => {
				throw new Error('動画が見つかりません');
			});
			const url = 'https://www.nicovideo.jp/api/deflist/delete';
			const body = `id_list[0][]=${item.item_id}&token=${token}`;
			const cacheKey = 'deflistItems';
			const req = {
				method: 'POST',
				body,
				headers: {'Content-Type': 'application/x-www-form-urlencoded'},
				credentials: 'include'
			};
			const result = await netUtil.fetch(url, req)
				.then(r => r.json()).catch(e => e || {});
			if (result && result.status && result.status === 'ok') {
				cacheStorage.removeItem(cacheKey);
				emitter.emitAsync('deflistRemove', watchId);
				return {
					status: 'ok',
					result: result,
					message: 'とりあえずマイリストから削除'
				};
			}
			throw new Error(result.error.description, {
				status: 'fail', result, code: result.error.code
			});
		}
		async removeMylistItem(watchId, groupId) {
			const item = await this.findMylistItemByWatchId(watchId, groupId).catch(result => {
					throw new Error('動画が見つかりません', {result, status: 'fail'});
				});
			const url = 'https://www.nicovideo.jp/api/mylist/delete';
			window.console.log('delete item:', item);
			const body = 'id_list[0][]=' + item.item_id + '&token=' + token + '&group_id=' + groupId;
			const cacheKey = `mylistItems: ${groupId}`;
			const result = await netUtil.fetch(url, {
				method: 'POST',
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
				credentials: 'include'
			}).then(r => r.json())
				.catch(result => {
					throw new Error('マイリストから削除失敗(2)', {result, status: 'fail'});
				});
			if (result.status && result.status === 'ok') {
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
		async _addDeflistItem(watchId, description, isRetry) {
			let url = 'https://www.nicovideo.jp/api/deflist/add';
			let body = `item_id=${watchId}&token=${token}`;
			if (description) {
				body += `&description=${encodeURIComponent(description)}`;
			}
			let cacheKey = 'deflistItems';
			const result = await netUtil.fetch(url, {
				method: 'POST',
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
				credentials: 'include'
			}).then(r => r.json())
				.catch(err => {
						throw new Error('とりあえずマイリスト登録失敗(200)', {
							status: 'fail',
							result: err
						});
					});
			if (result.status && result.status === 'ok') {
				cacheStorage.removeItem(cacheKey);
				emitter.emitAsync('deflistAdd', watchId, description);
				return {
					status: 'ok',
					result,
					message: 'とりあえずマイリスト登録'
				};
			}
			if (!result.status || !result.error) {
				throw new Error('とりあえずマイリスト登録失敗(100)', {
					status: 'fail',
					result,
				});
			}
			if (result.error.code !== 'EXIST' || isRetry) {
				throw new Error(result.error.description, {
					status: 'fail',
					result,
					code: result.error.code,
					message: result.error.description
				});
			}
			await self.removeDeflistItem(watchId).catch(err => {
					throw new Error('とりあえずマイリスト登録失敗(101)', {
						status: 'fail',
						result: err.result,
						code: err.code
					});
				});
			const added = await self._addDeflistItem(watchId, description, true);
			return {
				status: 'ok',
				result: added,
				message: 'とりあえずマイリストの先頭に移動'
			};
		}
		addDeflistItem(watchId, description) {
			return this._addDeflistItem(watchId, description, false);
		}
		async addMylistItem(watchId, groupId, description) {
			const url = 'https://www.nicovideo.jp/api/mylist/add';
			let body = 'item_id=' + watchId + '&token=' + token + '&group_id=' + groupId;
			if (description) {
				body += '&description=' + encodeURIComponent(description);
			}
			const cacheKey = `mylistItems: ${groupId}`;
			const result = await netUtil.fetch(url, {
				method: 'POST',
				body,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
				credentials: 'include'
			}).then(r => r.json())
				.catch(err => {
					throw new Error('マイリスト登録失敗(200)', {
						status: 'fail',
						result: err
					});
				});
			if (result.status && result.status === 'ok') {
				cacheStorage.removeItem(cacheKey);
				this.removeDeflistItem(watchId).catch(() => {});
				return {status: 'ok', result, message: 'マイリスト登録'};
			}
			if (!result.status || !result.error) {
				throw new Error('マイリスト登録失敗(100)', {status: 'fail', result});
			}
			emitter.emitAsync('mylistAdd', watchId, groupId, description);
			throw new Error(result.error.description, {
				status: 'fail', result, code: result.error.code
			});
		}
	}
	return new MylistApiLoader();
})();
const NicoRssLoader = (() => {
	const parseItem = item => {
		const id = item.querySelector('link').textContent.replace(/^.+\//, '');
		let watchId = id;
		const guid = item.querySelector('guid').textContent;
		const desc = new DOMParser().parseFromString(item.querySelector('description').textContent, 'text/html');
		const [min, sec] = desc.querySelector('.nico-info-length').textContent.split(':');
		const dt = guid.match(/,([\d]+-[\d]+-[\d]+):/)[1];
		const tm = desc.querySelector('.nico-info-date').textContent.replace(/[：]/g, ':').match(/([\d]+:[\d]+:[\d]+)/)[0];
		const date = new Date(`${dt} ${tm}`);
		const thumbnail_url = desc.querySelector('.nico-thumbnail img').src;
		const vm = thumbnail_url.match(/(\d+)\.(\d+)/);
		if (vm && /^\d+$/.test(id)) {
			watchId = `so${vm[1]}`;
		}
		const result = {
			_format: 'nicorss',
			id: watchId,
			uniq_id: id,
			title: item.querySelector('title').textContent,
			length_seconds: min * 60 + sec * 1,
			thumbnail_url,
			first_retrieve: textUtil.dateToString(date),
			description: desc.querySelector('.nico-description').textContent
		};
		if (desc.querySelector('.nico-info-total-res')) {
			Object.assign(result, {
				num_res: parseInt(desc.querySelector('.nico-info-total-res').textContent.replace(/,/g, ''), 10),
				mylist_counter: parseInt(desc.querySelector('.nico-info-total-mylist').textContent.replace(/,/g, ''), 10),
				view_counter: parseInt(desc.querySelector('.nico-info-total-view').textContent.replace(/,/g, ''), 10)
			});
		}
		return result;
	};
	const load = async (url) => {
		const rssText = await netUtil.fetch(url).then(r => r.text());
		const xml = new DOMParser().parseFromString(rssText, 'application/xml');
		const items = Array.from(xml.querySelectorAll('item')).map(i => parseItem(i));
		return items;
	};
	const loadRanking = ({genre = 'all', term = 'hour', tag = ''}) => {
	const url = `https://www.nicovideo.jp/ranking/genre/${genre}?term=${term}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}&rss=2.0`;
	return load(url);
	};
	return {
		load,
		loadRanking
	};
})();
const MatrixRankingLoader = {
	load: async () => {
		const htmlText = await netUtil.fetch(
			'https://www.nicovideo.jp/ranking', {cledentials: 'include'}
			).then(r => r.text());
		const doc = new DOMParser().parseFromString(htmlText, 'text/html');
		return JSON.parse(doc.getElementById('MatrixRanking-app').dataset.app);
	}
};
const IchibaLoader = {
	load: watchId => {
		const api = 'https://ichiba.nicovideo.jp/embed/zero/show_ichiba';
		const country = 'ja-jp';
		const url = `${api}?v=${watchId}&country=${country}&ch=&is_adult=1&rev=20120220`;
		return netUtil.jsonp(url);
	}
};
const CommonsTreeLoader = {
	load: contentId => {
		const api = 'https://api.commons.nicovideo.jp/tree/summary/get';
		const url = `${api}?id=${contentId}&limit=200`;
		return netUtil.jsonp(url);
	}
};
const UploadedVideoApiLoader = (() => {
	let loader = null;
	class UploadedVideoApiLoader {
		async load(userId) {
			const url = `https://flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=${userId}`;
			const result = await netUtil.fetch(url, {credentials: 'include'})
				.then(r => r.json())
				.catch(e => { throw new Error('動画一覧の取得失敗(2)', e); });
			if (result.status !== 'ok' || !result.list) {
				throw new Error(`動画一覧の取得失敗(1) ${result && result.message}`, result);
			}
			return result.list;
		}
	}
	return {
		load: userId => {
			loader = loader || new UploadedVideoApiLoader();
			return loader.load(userId);
		},
		getUploadedVideos: userId => {
			loader = loader || new UploadedVideoApiLoader();
			return loader.load(userId);
		}
	};
})();
const UaaLoader = {
	load: (videoId, {limit = 50} = {}) => {
		const url = `https://api.nicoad.nicovideo.jp/v1/contents/video/${videoId}/thanks?limit=${limit}`;
		return netUtil.fetch(url, {credentials: 'include'}).then(res => res.json());
	}
};
const RecommendAPILoader = (() => {
	const load = ({videoId, recipe}) => {
		recipe = recipe || {id: 'video_playlist_common', videoId};
		recipe = textUtil.encodeBase64(JSON.stringify(recipe));
		const url = `https://nvapi.nicovideo.jp/v1/recommend?recipe=${encodeURIComponent(recipe)}&site=nicovideo&_frontendId=6&_frontendVersion=0`;
		return netUtil
			.fetch(url, {credentials: 'include'})
			.then(res => res.json())
			.then(res => {
				if (!res.meta || res.meta.status !== 200) {
					window.console.warn('load recommend fail', res);
					throw new Error('load recommend fail');
				}
				return res.data;
			});
	};
	return {
		load,
		loadSeries: (seriesId, options = {}) => {
			const recipe = {
				id: 'video_watch_playlist_series',
				seriesId,
				frontendId: 6,
				seriesTitle: options.title || `series/${seriesId}`
			};
			return load({recipe});
		}
	};
})();
const NVWatchCaller = (() => {
	const FRONT_ID = '6';
	const FRONT_VER = '0';
	const call = trackingId => {
		const url = `https://nvapi.nicovideo.jp/v1/2ab0cbaa/watch?t=${encodeURIComponent(trackingId)}`;//&_frontendId=${FRONT_ID}`;
		return netUtil
			.fetch(url, {
				mode: 'cors',
				credentials: 'include',
				timeout: 5000,
				headers: {
					'X-Frontend-Id': FRONT_ID,
					'X-Frontend-Version': FRONT_VER
				}
			})
			.catch(e => {
				console.warn('nvlog fail', e);
			});
	};
	return {call};
})();
const PlaybackPosition = {
	record: (watchId, playbackPosition, csrfToken) => {
		const url = 'https://flapi.nicovideo.jp/api/record_current_playback_position';
		const body =
			`watch_id=${watchId}&playback_position=${playbackPosition}&csrf_token=${csrfToken}`;
		return netUtil.fetch(url, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body
		});
	}
};
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
let NicoVideoApi = {};
if (location.host !== 'www.nicovideo.jp') {
	class NVGate extends CrossDomainGate {
		_onCommand({command, status, params, value}, sessionId = null) {
			switch (command) {
				case 'configSync':
						this._config.props[params.key] = params.value;
					break;
				default:
					return super._onCommand({command, status, params, value}, sessionId);
			}
		}
	}
		NicoVideoApi = new NVGate({
			baseUrl: 'https://www.nicovideo.jp/robots.txt',
			origin: 'https://www.nicovideo.jp/',
			type: 'nicovideoApi',
			suffix: location.href
		});
}
if (ZenzaWatch && ZenzaWatch.api) {
	Object.assign(ZenzaWatch.api, {
		VideoInfoLoader,
		ThumbInfoLoader,
		MylistApiLoader,
		UploadedVideoApiLoader,
		CacheStorage,
		IchibaLoader,
		UaaLoader,
		PlaybackPosition,
		NicoVideoApi,
		RecommendAPILoader,
		NVWatchCaller,
		CommonsTreeLoader,
		NicoRssLoader,
		MatrixRankingLoader
	});
	ZenzaWatch.init.mylistApiLoader = MylistApiLoader;
	ZenzaWatch.init.UploadedVideoApiLoader = UploadedVideoApiLoader;
}
class DmcInfo {
	constructor(rawData) {
		this._rawData = rawData;
		this._session = rawData.session_api;
	}
	get apiUrl() {
		return this._session.urls[0].url;
	}
	get urls() {
		return this._session.urls;
	}
	get audios() {
		return this._session.audios;
	}
	get videos() {
		return this._session.videos;
	}
	get quality() {
		return this._rawData.quality;
	}
	get signature() {
		return this._session.signature;
	}
	get token() {
		return this._session.token;
	}
	get serviceUserId() {
		return this._session.service_user_id;
	}
	get contentId() {
		return this._session.content_id;
	}
	get playerId() {
		return this._session.player_id;
	}
	get recipeId() {
		return this._session.recipe_id;
	}
	get heartBeatLifeTimeMs() {
		return this._session.heartbeat_lifetime;
	}
	get protocols() {
		return this._session.protocols || [];
	}
	get isHLSRequired() {
		return !this.protocols.includes('http');
	}
	get contentKeyTimeout() {
		return this._session.content_key_timeout;
	}
	get priority() {
		return this._session.priority;
	}
	get authTypes() {
		return this._session.auth_types;
	}
	get videoFormatList() {
		return (this.videos || []).concat();
	}
	get hasStoryboard() {
		return !!this._rawData.storyboard_session_api;
	}
	get storyboardInfo() {
		return this._rawData.storyboard_session_api;
	}
	get transferPreset() {
		return (this._session.transfer_presets || [''])[0] || '';
	}
	get heartbeatLifeTime() {
		return this._session.heartbeat_lifetime || 120 * 1000;
	}
	get importVersion() {
		return this._rawData.import_version || 0;
	}
	get trackingId() {
		return this._rawData.tracking_id || '';
	}
	get encryption() {
		return this._rawData.encryption || null;
	}
	getData() {
		const data = {};
		for (const prop of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (typeof this[prop] === 'function') { continue; }
			data[prop] = this[prop];
		}
		return data;
	}
	toJSON() {
		return JSON.stringify(this.getData());
	}
}
class VideoFilter {
	constructor(ngOwner, ngTag) {
		this.ngOwner = ngOwner;
		this.ngTag = ngTag;
	}
	get ngOwner() {
		return this._ngOwner || [];
	}
	set ngOwner(owner) {
		owner = _.isArray(owner) ? owner : owner.toString().split(/[\r\n]/);
		let list = [];
		owner.forEach(o => {
			list.push(o.replace(/#.*$/, '').trim());
		});
		this._ngOwner = list;
	}
	get ngTag() {
		return this._ngTag || [];
	}
	set ngTag(tag) {
		tag = Array.isArray(tag) ? tag : tag.toString().split(/[\r\n]/);
		const list = [];
		tag.forEach(t => {
			list.push(t.toLowerCase().trim());
		});
		this._ngTag = list;
	}
	isNgVideo(videoInfo) {
		let isNg = false;
		let isChannel = videoInfo.isChannel;
		let ngTag = this.ngTag;
		videoInfo.tagList.forEach(tag => {
			let text = (tag.tag || '').toLowerCase();
			if (ngTag.includes(text)) {
				isNg = true;
			}
		});
		if (isNg) {
			return true;
		}
		let owner = videoInfo.owner;
		let ownerId = isChannel ? ('ch' + owner.id) : owner.id;
		if (ownerId && this.ngOwner.includes(ownerId)) {
			isNg = true;
		}
		return isNg;
	}
}
class VideoInfoModel {
	constructor(videoInfoData) {
		this._update(videoInfoData);
		this._currentVideoPromise = [];
	}
	update(videoInfoModel) {
		this._update(videoInfoModel._rawData);
		return true;
	}
	_update(info) {
		this._rawData = info;
		this._watchApiData = info.watchApiData;
		this._videoDetail = info.watchApiData.videoDetail;
		this._flashvars = info.watchApiData.flashvars;   // flashに渡す情報
		this._viewerInfo = info.viewerInfo;               // 閲覧者(＝おまいら)の情報
		this._flvInfo = info.flvInfo;
		this._msgInfo = info.msgInfo;
		this._dmcInfo = (info.dmcInfo && info.dmcInfo.session_api) ? new DmcInfo(info.dmcInfo) : null;
		this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画
		this._playlistToken = info.playlistToken;
		this._watchAuthKey = info.watchAuthKey;
		this._seekToken = info.seekToken;
		this._resumeInfo = info.resumeInfo || {};
		return true;
	}
	get title() {
		return this._videoDetail.title_original || this._videoDetail.title;
	}
	get description() {
		return this._videoDetail.description || '';
	}
	get descriptionOriginal() {
		return this._videoDetail.description_original;
	}
	get postedAt() {
		return this._videoDetail.postedAt;
	}
	get thumbnail() {
		return this._videoDetail.thumbnail;
	}
	get betterThumbnail() {
		return this._rawData.thumbnail;
	}
	get videoUrl() {
		return (this._flvInfo.url || '');//.replace(/^http:/, '');
	}
	get storyboardUrl() {
		let url = this._flvInfo.url;
		if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
			return null;
		}
		return url;
	}
	getCurrentVideo() {
		if (this._currentVideo) {
			return Promise.resolve(this._currentVideo);
		}
		return new Promise((resolve, reject) => {
			this._currentVideoPromise.push({resolve, reject});
		});
	}
	setCurrentVideo(v) {
		this._currentVideo = v;
		this._currentVideoPromise.forEach(p => {
			p.resolve(this._currentVideo);
		});
	}
	get isEconomy() {
		return this.videoUrl.match(/low$/) ? true : false;
	}
	get tagList() {
		return this._videoDetail.tagList;
	}
	getVideoId() { // sm12345
		return this.videoId;
	}
	get videoId() {
		return this._videoDetail.id;
	}
	get originalVideoId() {
		return (this.isMymemory || this.isCommunityVideo) ? this.videoId : '';
	}
	getWatchId() { // sm12345だったりスレッドIDだったり
		return this.watchId;
	}
	get watchId() {
		if (this.videoId.substring(0, 2) === 'so') {
			return this.videoId;
		}
		return this._videoDetail.v;
	}
	get contextWatchId() {
		return this._videoDetail.v;
	}
	get watchUrl() {
		return `https://www.nicovideo.jp/watch/${this.watchId}`;
	}
	get threadId() { // watchIdと同一とは限らない
		return this._videoDetail.thread_id;
	}
	get videoSize() {
		return {
			width: this._videoDetail.width,
			height: this._videoDetail.height
		};
	}
	get duration() {
		return this._videoDetail.length;
	}
	get count() {
		const vd = this._videoDetail;
		return {
			comment: vd.commentCount,
			mylist: vd.mylistCount,
			view: vd.viewCount
		};
	}
	get isChannel() {
		return !!this._videoDetail.channelId;
	}
	get isMymemory() {
		return !!this._videoDetail.isMymemory;
	}
	get isCommunityVideo() {
		return !!(!this.isChannel && this._videoDetail.communityId);
	}
	get hasParentVideo() {
		return !!(this._videoDetail.commons_tree_exists);
	}
	get isDmc() {
		return this.isDmcOnly || (this._rawData.isDmc);
	}
	get isDmcAvailable() {
		return this._rawData.isDmc;
	}
	get dmcInfo() {
		return this._dmcInfo;
	}
	get msgInfo() {
		return this._msgInfo;
	}
	get isDmcOnly() {
		return !!this._rawData.isDmcOnly || !this.videoUrl;
	}
	get hasDmcStoryboard() {
		return this._dmcInfo && this._dmcInfo.hasStoryboard;
	}
	get dmcStoryboardInfo() {
		return !!this._dmcInfo ? this._dmcInfo.storyboardInfo : null;
	}
	get owner() {
		let ownerInfo;
		if (this.isChannel) {
			let c = this._watchApiData.channelInfo || {};
			ownerInfo = {
				icon: c.icon_url || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg',
				url: `https://ch.nicovideo.jp/ch${c.id}`,
				id: c.id,
				linkId: c.id ? `ch${c.id}` : '',
				name: c.name,
				favorite: c.is_favorited === 1, // こっちは01で
				type: 'channel'
			};
		} else {
			let u = this._watchApiData.uploaderInfo || {};
			let f = this._flashvars || {};
			ownerInfo = {
				icon: u.icon_url || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg',
				url: u.id ? `//www.nicovideo.jp/user/${u.id}` : '#',
				id: u.id || f.videoUserId || '',
				linkId: u.id ? `user/${u.id}` : '',
				name: u.nickname || '(非公開ユーザー)',
				favorite: !!u.is_favorited, // こっちはbooleanという
				type: 'user',
				isMyVideoPublic: !!u.is_user_myvideo_public
			};
		}
		return ownerInfo;
	}
	get series() {
		if (!this._rawData.series || !this._rawData.series.id) {
			return null;
		}
		const series = this._rawData.series;
		const thumbnailUrl = series.thumbnailUrl || this.betterThumbnail;
		return Object.assign({}, series, {thumbnailUrl});
	}
	get relatedVideoItems() {
		return this._relatedVideo.playlist || [];
	}
	get replacementWords() {
		if (!this._flvInfo.ng_up || this._flvInfo.ng_up === '') {
			return null;
		}
		return util.parseQuery(
			this._flvInfo.ng_up || ''
		);
	}
	get playlistToken() {
		return this._playlistToken;
	}
	set playlistToken(v) {
		this._playlistToken = v;
	}
	get watchAuthKey() {
		return this._watchAuthKey;
	}
	set watchAuthKey(v) {
		this._watchAuthKey = v;
	}
	get seekToken() {
		return this._seekToken;
	}
	get width() {
		return parseInt(this._videoDetail.width, 10);
	}
	get height() {
		return parseInt(this._videoDetail.height, 10);
	}
	get initialPlaybackTime() {
		if (!this._resumeInfo || !this._resumeInfo.initialPlaybackPosition) {
			return 0;
		}
		return parseFloat(this._resumeInfo.initialPlaybackPosition, 10);
	}
	get csrfToken() {
		return this._rawData.csrfToken || '';
	}
	get extension() {
		if (this.isDmc) {
			return 'mp4';
		}
		const url = this.videoUrl;
		if (url.match(/smile\?m=/)) {
			return 'mp4';
		}
		if (url.match(/smile\?v=/)) {
			return 'flv';
		}
		if (url.match(/smile\?s=/)) {
			return 'swf';
		}
		return 'unknown';
	}
	get community() {
		return this._rawData.community || null;
	}
	get maybeBetterQualityServerType() {
		if (this.isDmcOnly) {
			return 'dmc';
		}
		if (this.isEconomy) {
			return 'dmc';
		}
		let dmcInfo = this.dmcInfo;
		if (!dmcInfo) {
			return 'smile';
		}
		if (/smile\?[sv]=/.test(this.videoUrl)) {
			return 'dmc';
		}
		let smileWidth = this.width;
		let smileHeight = this.height;
		let dmcVideos = dmcInfo.videos;
		let importVersion = dmcInfo.importVersion;
		if (isNaN(smileWidth) || isNaN(smileHeight)) {
			return 'dmc';
		}
		if (smileWidth > 1280 || smileHeight > 720) {
			return 'smile';
		}
		if (smileHeight < 360) {
			return 'smile';
		}
		const highestDmc = Math.max(...dmcVideos.map(v => {
			return (/_([0-9]+)p$/.exec(v)[1] || '') * 1;
		}));
		if (highestDmc >= 720) {
			return 'dmc';
		}
		if (smileHeight === 486 || smileHeight === 384) {
			return 'smile';
		}
		if (highestDmc >= smileHeight) {
			return 'dmc';
		}
		return 'dmc';
	}
	getData() {
		const data = {};
		for (const prop of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (typeof this[prop] === 'function') { continue; }
			data[prop] = this[prop];
		}
		return data;
	}
}
const {NicoSearchApiV2Query, NicoSearchApiV2Loader} =
	(function () {
		const BASE_URL = 'https://api.search.nicovideo.jp/api/v2/';
		const API_BASE_URL = `${BASE_URL}/video/contents/search`;
		const MESSAGE_ORIGIN = 'https://api.search.nicovideo.jp/';
		const SORT = {
			f: 'startTime',
			v: 'viewCounter',
			r: 'commentCounter',
			m: 'mylistCounter',
			l: 'lengthSeconds',
			n: 'lastCommentTime',
			h: '_hotMylistCounter',           // 人気が高い順
			'_hot': '_hotMylistCounter',    // 人気が高い順(↑と同じだけど互換用に残ってる)
			'_popular': '_popular',            // 並び順指定なしらしい
		};
		const F_RANGE = {
			U_1H: 4,
			U_24H: 1,
			U_1W: 2,
			U_30D: 3
		};
		const L_RANGE = {
			U_5MIN: 1,
			O_20MIN: 2
		};
		let gate;
		let initializeCrossDomainGate = function () {
			initializeCrossDomainGate = function () {
			};
			gate = new CrossDomainGate({
				baseUrl: BASE_URL,
				origin: MESSAGE_ORIGIN,
				type: 'searchApi',
				messager: WindowMessageEmitter
			});
		};
		class NicoSearchApiV2Query {
			constructor(word, params = {}) {
				if (word.searchWord) {
					this._initialize(word.searchWord, word);
				} else {
					this._initialize(word, params);
				}
			}
			get q() {
				return this._q;
			}
			get targets() {
				return this._targets;
			}
			get sort() {
				return this._sort;
			}
			get order() {
				return this._order;
			}
			get limit() {
				return this._limit;
			}
			get offset() {
				return this._offset;
			}
			get fields() {
				return this._fields;
			}
			get context() {
				return this._context;
			}
			get hotField() {
				return this._hotField;
			}
			get hotFrom() {
				return this._hotFrom;
			}
			get hotTo() {
				return this._hotTo;
			}
			_initialize(word, params) {
				if (params._now) {
					this.now = params._now;
				}
				const sortTable = SORT;
				this._filters = [];
				this._q = word || params.searchWord || 'ZenzaWatch';
				this._targets =
					params.searchType === 'tag' ?
						['tagsExact'] : ['tagsExact', 'title', 'description'];
				this._sort =
					(params.order === 'd' ? '-' : '+') +
					(params.sort && sortTable[params.sort] ?
						sortTable[params.sort] : 'lastCommentTime');
				this._order = params.order === 'd' ? 'desc' : 'asc';
				this._limit = 100;
				this._offset = Math.min(
					params.page ? Math.max(parseInt(params.page, 10) - 1, 0) * 25 : 0,
					1600
				);
				this._fields = [
					'contentId', 'title', 'description', 'tags', 'categoryTags',
					'viewCounter', 'commentCounter', 'mylistCounter', 'lengthSeconds',
					'startTime', 'thumbnailUrl'
				];
				this._context = 'ZenzaWatch';
				const n = new Date(), now = this.now;
				if (/^._hot/.test(this.sort)) {
					(() => {
						this._hotField = 'mylistCounter';
						this._hotFrom = new Date(now - 1 * 24 * 60 * 60 * 1000);
						this._hotTo = n;
						this._sort = '-_hotMylistCounter';
					})();
				}
				if (params.f_range &&
					[F_RANGE.U_1H, F_RANGE.U_24H, F_RANGE.U_1W, F_RANGE.U_30D]
						.includes(params.f_range * 1)) {
					this._filters.push(this._buildFRangeFilter(params.f_range * 1));
				}
				if (params.l_range &&
					[L_RANGE.U_5MIN, L_RANGE.O_20MIN].includes(params.l_range * 1)) {
					this._filters.push(this._buildLRangeFilter(params.l_range * 1));
				}
				if (params.userId && (params.userId + '').match(/^\d+$/)) {
					this._filters.push({type: 'equal', field: 'userId', value: params.userId * 1});
				}
				if (params.channelId && (params.channelId + '').match(/^\d+$/)) {
					this._filters.push({type: 'equal', field: 'channelId', value: params.channelId * 1});
				}
				if (params.commentCount && (params.commentCount + '').match(/^[0-9]+$/)) {
					this._filters.push({
						type: 'range',
						field: 'commentCounter',
						from: params.commentCount * 1
					});
				}
				if (params.utimeFrom || params.utimeTo) {
					this._filters.push(this._buildStartTimeRangeFilter({
						from: params.utimeFrom ? params.utimeFrom * 1 : 0,
						to: params.utimeTo ? params.utimeTo * 1 : now
					}));
				}
				if (params.dateFrom || params.dateTo) {
					this._filters.push(this._buildStartTimeRangeFilter({
						from: params.dateFrom ? (new Date(params.dateFrom)).getTime() : 0,
						to: params.dateTo ? (new Date(params.dateTo)).getTime() : now
					}));
				}
				const dateReg = /^\d{4}-\d{2}-\d{2}$/;
				if (dateReg.test(params.start) && dateReg.test(params.end)) {
					this._filters.push(this._buildStartTimeRangeFilter({
						from: (new Date(params.start)).getTime(),
						to: (new Date(params.end)).getTime()
					}));
				}
			}
			get stringfiedFilters() {
				if (this._filters.length < 1) {
					return '';
				}
				const result = [];
				const TIMEFIELDS = ['startTime'];
				this._filters.forEach((filter) => {
					let isTimeField = TIMEFIELDS.includes(filter.field);
					if (!filter) {
						return;
					}
					if (filter.type === 'equal') {
						result.push(`filters[${filter.field}][0]=${filter.value}`);
					} else if (filter.type === 'range') {
						let from = isTimeField ? this._formatDate(filter.from) : filter.from;
						if (filter.from) {
							result.push(`filters[${filter.field}][gte]=${from}`);
						}
						if (filter.to) {
							let to = isTimeField ? this._formatDate(filter.to) : filter.to;
							result.push(`filters[${filter.field}][lte]=${to}`);
						}
					}
				});
				return result.join('&');
			}
			get filters() {
				return this._filters;
			}
			_formatDate(time) {
				const dt = new Date(time);
				return dt.toISOString().replace(/\.\d*Z/, '') + '%2b00:00'; // '%2b00:00'
			}
			_buildStartTimeRangeFilter({from = 0, to}) {
				const range = {field: 'startTime', type: 'range'};
				if (from !== undefined && to !== undefined) {
					[from, to] = [from, to].sort(); // from < to になるように
				}
				if (from !== undefined) {
					range.from = from;
				}
				if (to !== undefined) {
					range.to = to;
				}
				return range;
			}
			_buildLengthSecondsRangeFilter({from, to}) {
				const range = {field: 'lengthSeconds', type: 'range'};
				if (from !== undefined && to !== undefined) {
					[from, to] = [from, to].sort(); // from < to になるように
				}
				if (from !== undefined) {
					range.from = from;
				}
				if (to !== undefined) {
					range.to = to;
				}
				return range;
			}
			_buildFRangeFilter(range) {
				const now = this.now;
				switch (range * 1) {
					case F_RANGE.U_1H:
						return this._buildStartTimeRangeFilter({
							from: now - 1000 * 60 * 60,
							to: now
						});
					case F_RANGE.U_24H:
						return this._buildStartTimeRangeFilter({
							from: now - 1000 * 60 * 60 * 24,
							to: now
						});
					case F_RANGE.U_1W:
						return this._buildStartTimeRangeFilter({
							from: now - 1000 * 60 * 60 * 24 * 7,
							to: now
						});
					case F_RANGE.U_30D:
						return this._buildStartTimeRangeFilter({
							from: now - 1000 * 60 * 60 * 24 * 30,
							to: now
						});
					default:
						return null;
				}
			}
			_buildLRangeFilter(range) {
				switch (range) {
					case L_RANGE.U_5MIN:
						return this._buildLengthSecondsRangeFilter({
							from: 0,
							to: 60 * 5
						});
					case L_RANGE.O_20MIN:
						return this._buildLengthSecondsRangeFilter({
							from: 60 * 20
						});
				}
			}
			toString() {
				const result = [];
				result.push('q=' + encodeURIComponent(this._q));
				result.push('targets=' + this.targets.join(','));
				result.push('fields=' + this.fields.join(','));
				result.push('_sort=' + encodeURIComponent(this.sort));
				result.push('_limit=' + this.limit);
				result.push('_offset=' + this.offset);
				result.push('_context=' + this.context);
				if (this.sort === '-_hot') {
					result.push('hotField=' + this.hotField);
					result.push('hotFrom=' + this.hotFrom);
					result.push('hotTo=' + this.hotTo);
				}
				const filters = this.stringfiedFilters;
				if (filters) {
					result.push(filters);
				}
				return result.join('&');
			}
			set now(v) {
				this._now = v;
			}
			get now() {
				return this._now || Date.now();
			}
		}
		NicoSearchApiV2Query.SORT = SORT;
		NicoSearchApiV2Query.F_RANGE = F_RANGE;
		NicoSearchApiV2Query.L_RANGE = L_RANGE;
		class NicoSearchApiV2Loader {
			static async search(word, params) {
				initializeCrossDomainGate();
				const query = new NicoSearchApiV2Query(word, params);
				const url = API_BASE_URL + '?' + query.toString();
				return gate.fetch(url).then(res => res.text()).then(result => {
					result = NicoSearchApiV2Loader.parseResult(result);
					if (typeof result !== 'number' && result.status === 'ok') {
						return Promise.resolve(Object.assign(result, {word, params}));
					} else {
						let description;
						switch (result) {
							default:
								description = 'UNKNOWN ERROR';
								break;
							case 400:
								description = 'INVALID QUERY';
								break;
							case 500:
								description = 'INTERNAL SERVER ERROR';
								break;
							case 503:
								description = 'MAINTENANCE';
								break;
						}
						return Promise.reject({
							status: 'fail',
							description
						});
					}
				});
			}
			static async searchMore(word, params, maxLimit = 300) {
				const ONCE_LIMIT = 100; // 一回で取れる件数
				const PER_PAGE = 25; // 検索ページで1ページあたりに表示される件数
				const MAX_PAGE = 64; // 25 * 64 = 1600
				const result = await NicoSearchApiV2Loader.search(word, params);
				const currentPage = params.page ? parseInt(params.page, 10) : 1;
				const currentOffset = (currentPage - 1) * PER_PAGE;
				if (result.count <= ONCE_LIMIT) {
					return result;
				}
				const searchCount = Math.min(
					Math.ceil((result.count - currentOffset) / PER_PAGE) - 1,
					Math.ceil((maxLimit - ONCE_LIMIT) / ONCE_LIMIT)
				);
				for (let i = 1; i <= searchCount; i++) {
					await sleep(300 * i);
					let page = currentPage + i * (ONCE_LIMIT / PER_PAGE);
					console.log('searchNext: "%s"', word, page, params);
					let res = await NicoSearchApiV2Loader.search(word, Object.assign(params, {page}));
					if (res && res.list && res.list.length) {
						result.list = result.list.concat(res.list);
					} else {
						break;
					}
				}
				return Object.assign(result, {word, params});
			}
			static _jsonParse(result) {
				try {
					return JSON.parse(result);
				} catch (e) {
					window.console.error('JSON parse error', e);
					return null;
				}
			}
			static parseResult(jsonText) {
				const data = NicoSearchApiV2Loader._jsonParse(jsonText);
				if (!data) {
					return 0;
				}
				const status = data.meta.status;
				const result = {
					status: status === 200 ? 'ok' : 'fail',
					count: data.meta.totalCount,
					list: []
				};
				if (status !== 200) {
					return status;
				}
				const midThumbnailThreshold = 23608629; // .Mのついた最小ID?
				data.data.forEach(item => {
					let description = item.description ? item.description.replace(/<.*?>/g, '') : '';
					if (item.thumbnailUrl.indexOf('.M') >= 0) {
						item.thumbnail_url = item.thumbnail_url.replace(/\.M$/, '');
						item.is_middle_thumbnail = true;
					} else if (item.thumbnailUrl.indexOf('.M') < 0 &&
						item.contentId.indexOf('sm') === 0) {
						let _id = parseInt(item.contentId.substring(2), 10);
						if (_id >= midThumbnailThreshold) {
							item.is_middle_thumbnail = true;
						}
					}
					const dt = textUtil.dateToString(new Date(item.startTime));
					result.list.push({
						id: item.contentId,
						type: 0, // 0 = VIDEO,
						length: item.lengthSeconds ?
							Math.floor(item.lengthSeconds / 60) + ':' +
							(item.lengthSeconds % 60 + 100).toString().substring(1) : '',
						mylist_counter: item.mylistCounter,
						view_counter: item.viewCounter,
						num_res: item.commentCounter,
						first_retrieve: dt,
						create_time: dt,
						thumbnail_url: item.thumbnailUrl,
						title: item.title,
						description_short: description.substring(0, 150),
						description_full: description,
						length_seconds: item.lengthSeconds,
						is_middle_thumbnail: item.is_middle_thumbnail
					});
				});
				return result;
			}
		}
		return {NicoSearchApiV2Query, NicoSearchApiV2Loader};
	})();
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
Object.assign(ZenzaWatch.api, {NicoSearchApiV2Loader});
// global.api.StoryboardCacheDb = StoryboardCacheDb;
WatchInfoCacheDb.api(NicoVideoApi);
StoryboardCacheDb.api(NicoVideoApi);

const SmileStoryboardInfoLoader = (()=> {
	let parseStoryboard = ($storyboard, url) => {
		let id = $storyboard.attr('id') || '1';
		return {
			id,
			url: url.replace('sb=1', `sb=${id}`),
			thumbnail: {
				width: $storyboard.find('thumbnail_width').text(),
				height: $storyboard.find('thumbnail_height').text(),
				number: $storyboard.find('thumbnail_number').text(),
				interval: $storyboard.find('thumbnail_interval').text()
			},
			board: {
				rows: $storyboard.find('board_rows').text(),
				cols: $storyboard.find('board_cols').text(),
				number: $storyboard.find('board_number').text()
			}
		};
	};
	let parseXml = (xml, url) => {
		let $xml = util.$.html(xml), $storyboard = $xml.find('storyboard');
		if ($storyboard.length < 1) {
			return null;
		}
		let info = {
			format: 'smile',
			status: 'ok',
			message: '成功',
			url,
			movieId: $xml.find('movie').attr('id'),
			duration: $xml.find('duration').text(),
			storyboard: []
		};
		for (let i = 0, len = $storyboard.length; i < len; i++) {
			let sbInfo = parseStoryboard(util.$($storyboard[i]), url);
			info.storyboard.push(sbInfo);
		}
		info.storyboard.sort((a, b) => {
			let idA = parseInt(a.id.substr(1), 10), idB = parseInt(b.id.substr(1), 10);
			return (idA < idB) ? 1 : -1;
		});
		return info;
	};
	let load = videoFileUrl => {
		let a = document.createElement('a');
		a.href = videoFileUrl;
		let server = a.host;
		let search = a.search;
		if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
			return Promise.reject({status: 'fail', message: 'invalid url', url: videoFileUrl});
		}
		let fileType = RegExp.$1;
		let fileId = RegExp.$2;
		let key = RegExp.$3;
		if (fileType !== 'm') {
			return Promise.reject({status: 'fail', message: 'unknown file type', url: videoFileUrl});
		}
		return new Promise((resolve, reject) => {
			let url = '//' + server + '/smile?m=' + fileId + '.' + key + '&sb=1';
			util.fetch(url, {credentials: 'include'})
				.then(res => res.text())
				.then(result => {
					const info = parseXml(result, url);
					if (info) {
						resolve(info);
					} else {
						reject({
							status: 'fail',
							message: 'storyboard not exist (1)',
							result: result,
							url: url
						});
					}
				}).catch(err => {
				reject({
					status: 'fail',
					message: 'storyboard not exist (2)',
					result: err,
					url: url
				});
			});
		});
	};
	return {load};
})();
const StoryboardInfoLoader = {
	load: videoInfo => {
		if (!videoInfo.hasDmcStoryboard) {
			const url = videoInfo.storyboardUrl;
			return url ?
				StoryboardInfoLoader.load(url) :
				Promise.reject('smile storyboard api not exist');
		}
		const watchId = videoInfo.watchId;
		const info = videoInfo.dmcStoryboardInfo;
		const duration = videoInfo.duration;
		return VideoSessionWorker.storyboard(watchId, info, duration);
	}
};
// ZenzaWatch.api.DmcStoryboardInfoLoader = DmcStoryboardInfoLoader;
ZenzaWatch.api.StoryboardInfoLoader = StoryboardInfoLoader;

const {ThreadLoader} = (() => {
	const VERSION_OLD = '20061206';
	const VERSION     = '20090904';
	const FRONT_ID = '6';
	const FRONT_VER = '0';
	const LANG_CODE = {
		'en_us': 1,
		'zh_tw': 2
	};
	class ThreadLoader {
		constructor() {
			this._threadKeys = {};
		}
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
			const leafContent = `0-${Math.floor(msgInfo.duration / 60) + 1}:100,${resCount},nicoru:100`;
			const language = this.getLangCode(msgInfo.language);
			msgInfo.threads.forEach(thread => {
				if (!thread.isActive) { return; }
				const t = {
					thread: thread.id.toString(),
					user_id: msgInfo.userId > 0 ? msgInfo.userId.toString() : '', // 0の時は空文字
					language,
					nicoru: 3,
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
		getNicoruKey(threadId, langCode = 0, options = {}) {
			const url =
				`https://nvapi.nicovideo.jp/v1/nicorukey?language=${langCode}&threadId=${threadId}`;
			console.log('getNicorukey url: ', url);
			const headers = options.cookie ? {Cookie: options.cookie} : {};
			Object.assign(headers, {
				'X-Frontend-Id': FRONT_ID,
				});
			return netUtil.fetch(url, {
				headers,
				credentials: 'include'
			}).then(res => res.json())
				.then(js => {
					if (js.meta.status === 200) {
						return js.data;
					}
					return Promise.reject({status: js.meta.status});
				}).catch(result => {
				return Promise.reject({
					result,
					message: `NicoruKeyの取得失敗 ${threadId}`
				});
			});
		}
		async nicoru(msgInfo, chat) {
			const threadInfo = msgInfo.threadInfo;
			const language = this.getLangCode(msgInfo.language);
			const {nicorukey} = await this.getNicoruKey(chat.threadId, language);
			const server = threadInfo.server.replace('/api/', '/api.json/');
			const body = JSON.stringify({nicoru:{
				content: chat.text,
				fork: chat.fork || 0,
				id: chat.no.toString(),
				language,
				nicorukey,
				postdate: `${chat.date}.${chat.dateUsec}`,
				premium: nicoUtil.isPremium() ? 1 : 0,
				thread: chat.threadId.toString(),
				user_id: msgInfo.userId.toString()
			}});
			const result = await this._post(server, body);
			const [{nicoru_result: {status}}] = result;
			if (status === 4) {
				return Promise.reject({status, message: 'ニコり済みだった'});
			} else if (status !== 0) {
				return Promise.reject({status, message: `ニコれなかった＞＜ (status:${status})`});
			}
			return result;
		}
	}
	return {ThreadLoader: new ThreadLoader};
})();

const {YouTubeWrapper} = (() => {
	const STATE_PLAYING = 1;
	class YouTubeWrapper extends Emitter {
		constructor({parentNode, autoplay = true, volume = 0.3, playbackRate = 1, loop = false}) {
			super();
			this._isInitialized = false;
			this._parentNode = parentNode;
			this._autoplay = autoplay;
			this._volume = volume;
			this._playbackRate = playbackRate;
			this._loop = loop;
			this._startDiff = 0;
			this._isSeeking = false;
			this._seekTime = 0;
			this._onSeekEnd = _.debounce(this._onSeekEnd.bind(this), 500);
		}
		async setSrc(url, startSeconds = 0) {
			this._src = url;
			this._videoId = this._parseVideoId(url);
			this._canPlay = false;
			this._isSeeking = false;
			this._seekTime = 0;
			const player = this._player;
			const isFirst = !!player ? false : true;
			const urlParams = this._parseUrlParams(url);
			this._startDiff = /[0-9]+s/.test(urlParams.t) ? parseInt(urlParams.t) : 0;
			startSeconds += this._startDiff;
			if (isFirst && !url) {
				return Promise.resolve();
			}
			if (isFirst) {
				return this._initPlayer(this._videoId, startSeconds);//.then(({player}) => {
			}
			if (!url) {
				player.stopVideo();
				return;
			}
			player.loadVideoById({
				videoId: this._videoId,
				startSeconds: startSeconds
			});
			player.loadPlaylist({list: [this._videoId]});
		}
		set src(v) {
			this.setSrc(v);
		}
		get src() {
			return this._src;
		}
		_parseVideoId(url) {
			const videoId = (() => {
				const a = textUtil.parseUrl(url);
				if (a.hostname === 'youtu.be') {
					return a.pathname.substring(1);
				} else {
					return textUtil.parseQuery(a.search).v;
				}
			})();
			if (!videoId) {
				return videoId;
			}
			return videoId
				.replace(/[?[\]()"'@]/g, '')
				.replace(/<[a-z0-9]*>/, '');
		}
		_parseUrlParams(url) {
			const a = textUtil.parseUrl(url);
			return a.search.startsWith('?') ? textUtil.parseQuery(a.search) : {};
		}
		async _initPlayer(videoId, startSeconds = 0) {
			if (this._player) {
				return {player: this._player};
			}
			const YT = await this._initYT();
			const {player} = await new Promise(resolve => {
				this._player = new YT.Player(
					this._parentNode, {
						videoId,
						events: {
							onReady: () => resolve({player: this._player}),
							onStateChange: this._onPlayerStateChange.bind(this),
							onPlaybackQualityChange: e => window.console.info('video quality: ', e.data),
							onError: e => this.emit('error', e)
						},
						playerVars: {
							autoplay: this.autoplay ? 0 : 1,
							volume: this._volume * 100,
							start: startSeconds,
							fs: 0,
							loop: 0,
							controls: 1,
							disablekb: 1,
							modestbranding: 0,
							playsinline: 1,
							rel: 0,
							showInfo: 1
						}
					});
			});
			this._onPlayerReady();
		}
		async _initYT() {
			if (window.YT) {
				return window.YT;
			}
			return new Promise(resolve => {
				if (window.onYouTubeIframeAPIReady) {
					window.onYouTubeIframeAPIReady_ = window.onYouTubeIframeAPIReady;
				}
				window.onYouTubeIframeAPIReady = () => {
					if (window.onYouTubeIframeAPIReady_) {
						window.onYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady_;
					}
					resolve(window.YT);
				};
				const tag = document.createElement('script');
				tag.src = 'https://www.youtube.com/iframe_api';
				document.head.append(tag);
			});
		}
		_onPlayerReady() {
			this.emitAsync('loadedMetaData');
		}
		_onPlayerStateChange(e) {
			const state = e.data;
			this.playerState = state;
			const YT = window.YT;
			switch (state) {
				case YT.PlayerState.ENDED:
					if (this._loop) {
						this.currentTime = 0;
						this.play();
					} else {
						this.emit('ended');
					}
					break;
				case YT.PlayerState.PLAYING:
					if (!this._canPlay) {
						this._canPlay = true;
						this.muted = this._muted;
						this.emit('loadedmetadata');
						this.emit('canplay');
					}
					this.emit('play');
					this.emit('playing');
					if (this._isSeeking) {
						this.emit('seeked');
					}
					break;
				case YT.PlayerState.PAUSED:
					this.emit('pause');
					break;
				case YT.PlayerState.BUFFERING:
					break;
				case YT.PlayerState.CUED:
					break;
			}
		}
		play() {
			this._player.playVideo();
			return Promise.resolve(); // 互換のため
		}
		pause() {
			this._player.pauseVideo();
		}
		get isPaused() {
			return window.YT ?
				this.playerState !== window.YT.PlayerState.PLAYING : true;
		}
		selectBestQuality() {
			const levels = this._player.getAvailableQualityLevels();
			const best = levels[0];
			this._player.pauseVideo();
			this._player.setPlaybackQuality(best);
			this._player.playVideo();
		}
		_onSeekEnd() {
			this._isSeeking = false;
			this._player.seekTo(this._seekTime + this._startDiff);
		}
		set currentTime(v) {
			this._isSeeking = true;
			this._seekTime = Math.max(0, Math.min(v, this.duration));
			this._onSeekEnd();
			this.emit('seeking');
		}
		get currentTime() {
			const now = performance.now();
			if (this._isSeeking) {
				this._lastTime = now;
				return this._seekTime;
			}
			const state = this._player.getPlayerState();
			const currentTime = this._player.getCurrentTime() + this._startDiff;
			if (state !== STATE_PLAYING || this._lastCurrentTime !== currentTime) {
				this._lastCurrentTime = currentTime;
				this._lastTime = now;
				return currentTime;
			}
			const timeDiff = (now - this._lastTime) * this.playbackRate / 1000000;
			this._lastCurrentTime = Math.min(currentTime, this.duration);
			return currentTime + timeDiff;
		}
		get duration() {
			return this._player.getDuration() - this._startDiff;
		}
		set muted(v) {
			if (v) {
				this._player.mute();
			} else {
				this._player.unMute();
			}
			this._muted = !!v;
		}
		get muted() {
			return this._player.isMuted();
		}
		set volume(v) {
			if (this._volume !== v) {
				this._volume = v;
				this._player.volume = v * 100;
				this.emit('volumeChange', v);
			}
		}
		get volume() {
			return this._volume;
		}
		set playbackRate(v) {
			if (this._playbackRate !== v) {
				this._playbackRate = v;
				this._player.setPlaybackRate(v);
			}
		}
		get playbackRate() {
			return this._playbackRate;
		}
		set loop(v) {
			if (this._loop !== v) {
				this._loop = v;
				this._player.setLoop(v);
			}
		}
		get loop() {
			return this._loop;
		}
		get _state() {
			return this._player.getPlayerState();
		}
		get playing() {
			return this._state === 1;
		}
		get videoWidth() {
			return 1280;
		}
		get videoHeight() {
			return 720;
		}
		getAttribute(k) {
			return this[k];
		}
		removeAttribute() {
		}
	}
	return {YouTubeWrapper};
})();
global.debug.YouTubeWrapper = YouTubeWrapper;

class NicoVideoPlayer extends Emitter {
	constructor(params) {
		super();
		this.initialize(params);
	}
	initialize(params) {
		let conf = this._playerConfig = params.playerConfig;
		this._fullscreenNode = params.fullscreenNode;
		this._state = params.playerState;
		this._state.onkey('videoInfo', this.setVideoInfo.bind(this));
		const playbackRate = conf.props.playbackRate;
		const onCommand = (command, param) => this.emit('command', command, param);
		this._videoPlayer = new VideoPlayer({
			volume: conf.props.volume,
			loop: conf.props.loop,
			mute: conf.props.mute,
			autoPlay: conf.props.autoPlay,
			playbackRate,
			debug: conf.props.debug
		});
		this._videoPlayer.on('command', onCommand);
		this._commentPlayer = new NicoCommentPlayer({
			enableFilter: params.enableFilter,
			wordFilter: params.wordFilter,
			wordRegFilter: params.wordRegFilter,
			wordRegFilterFlags: params.wordRegFilterFlags,
			userIdFilter: params.userIdFilter,
			commandFilter: params.commandFilter,
			showComment: conf.props.showComment,
			debug: conf.props.debug,
			playbackRate,
			sharedNgLevel: conf.props.sharedNgLevel
		});
		this._commentPlayer.on('command', onCommand);
		this._contextMenu = new ContextMenu({
			parentNode: params.node.length ? params.node[0] : params.node,
			playerState: this._state
		});
		this._contextMenu.on('command', onCommand);
		if (params.node) {
			this.appendTo(params.node);
		}
		this._initializeEvents();
		this._beginTimer();
		global.debug.nicoVideoPlayer = this;
	}
	_beginTimer() {
		this._stopTimer();
		this._videoWatchTimer =
			window.setInterval(this._onTimer.bind(this), 100);
	}
	_stopTimer() {
		if (!this._videoWatchTimer) {
			return;
		}
		window.clearInterval(this._videoWatchTimer);
		this._videoWatchTimer = null;
	}
	_initializeEvents() {
		const eventBridge = function(...args) {
			this.emit(...args);
		};
		this._videoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
		this._videoPlayer.on('dblclick', this._onDblClick.bind(this));
		this._videoPlayer.on('aspectRatioFix', this._onAspectRatioFix.bind(this));
		this._videoPlayer.on('play', this._onPlay.bind(this));
		this._videoPlayer.on('playing', this._onPlaying.bind(this));
		this._videoPlayer.on('seeking', this._onSeeking.bind(this));
		this._videoPlayer.on('seeked', this._onSeeked.bind(this));
		this._videoPlayer.on('stalled', eventBridge.bind(this, 'stalled'));
		this._videoPlayer.on('timeupdate', eventBridge.bind(this, 'timeupdate'));
		this._videoPlayer.on('waiting', eventBridge.bind(this, 'waiting'));
		this._videoPlayer.on('progress', eventBridge.bind(this, 'progress'));
		this._videoPlayer.on('pause', this._onPause.bind(this));
		this._videoPlayer.on('ended', this._onEnded.bind(this));
		this._videoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
		this._videoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
		this._videoPlayer.on('durationChange', eventBridge.bind(this, 'durationChange'));
		this._videoPlayer.on('playerTypeChange', eventBridge.bind(this, 'videoPlayerTypeChange'));
		this._videoPlayer.on('buffercomplete', eventBridge.bind(this, 'buffercomplete'));
		this._videoPlayer.on('mouseWheel',
			_.throttle(this._onMouseWheel.bind(this), 50));
		this._videoPlayer.on('abort', eventBridge.bind(this, 'abort'));
		this._videoPlayer.on('error', eventBridge.bind(this, 'error'));
		this._videoPlayer.on('click', this._onClick.bind(this));
		this._videoPlayer.on('contextMenu', this._onContextMenu.bind(this));
		this._commentPlayer.on('parsed', eventBridge.bind(this, 'commentParsed'));
		this._commentPlayer.on('change', eventBridge.bind(this, 'commentChange'));
		this._commentPlayer.on('filterChange', eventBridge.bind(this, 'commentFilterChange'));
		this._state.on('update', this._onPlayerStateUpdate.bind(this));
	}
	_onVolumeChange(vol, mute) {
		this._playerConfig.props.volume = vol;
		this._playerConfig.props.mute = mute;
		this.emit('volumeChange', vol, mute);
	}
	_onPlayerStateUpdate(key, value) {
		switch (key) {
			case 'isLoop':
				this._videoPlayer.isLoop=value;
				break;
			case 'playbackRate':
				this._videoPlayer.playbackRate=value;
				this._commentPlayer.playbackRate=value;
				break;
			case 'isAutoPlay':
				this._videoPlayer.isAutoPlay=value;
				break;
			case 'isShowComment':
				if (value) {
					this._commentPlayer.show();
				} else {
					this._commentPlayer.hide();
				}
				break;
			case 'isMute':
				this._videoPlayer.muted = value;
				break;
			case 'sharedNgLevel':
				this.filter.sharedNgLevel = value;
				break;
			case 'currentSrc':
				this.setVideo(value);
				break;
		}
	}
	_onMouseWheel(e, delta) {
		if (delta > 0) { // up
			this.volumeUp();
		} else {         // down
			this.volumeDown();
		}
	}
	volumeUp() {
		const v = Math.max(0.01, this._videoPlayer.volume);
		const r = v < 0.05 ? 1.3 : 1.1;
		this._videoPlayer.volume = Math.max(0, v * r);
	}
	volumeDown() {
		const v = this._videoPlayer.volume;
		const r = 1 / 1.2;
		this._videoPlayer.volume =  v * r;
	}
	_onTimer() {
		this._commentPlayer.currentTime = this._videoPlayer.currentTime;
	}
	_onAspectRatioFix(ratio) {
		this._commentPlayer.setAspectRatio(ratio);
		this.emit('aspectRatioFix', ratio);
	}
	_onLoadedMetaData() {
		this.emit('loadedMetaData');
	}
	_onVideoCanPlay() {
		this.emit('canPlay');
		if (this.autoplay && !this.paused) {
			this._video.play().catch(err => {
				if (err instanceof DOMException) {
					if (err.code === 35 /* NotAllowedError */) {
						this.dispatchEvent(new CustomEvent('autoplay-rejected'));
					}
				}
			});
		}
	}
	_onPlay() {
		this._isPlaying = true;
		this.emit('play');
	}
	_onPlaying() {
		this._isPlaying = true;
		this.emit('playing');
	}
	_onSeeking() {
		this._isSeeking = true;
		this.emit('seeking');
	}
	_onSeeked() {
		this._isSeeking = false;
		this.emit('seeked');
	}
	_onPause() {
		this._isPlaying = false;
		this.emit('pause');
	}
	_onEnded() {
		this._isPlaying = false;
		this._isEnded = true;
		this.emit('ended');
	}
	_onClick() {
		this._contextMenu.hide();
	}
	_onDblClick() {
		if (this._playerConfig.props.enableFullScreenOnDoubleClick) {
			this.toggleFullScreen();
		}
	}
	_onContextMenu(e) {
		if (!this._contextMenu.isOpen) {
			e.stopPropagation();
			e.preventDefault();
			this._contextMenu.show(e.clientX, e.clientY);
		}
	}
	setVideo(url) {
		let e = {src: url, url: null, promise: null};
		global.emitter.emit('beforeSetVideo', e);
		if (e.url) {
			url = e.url;
		}
		if (e.promise) {
			return e.promise.then(url => {
				this._videoPlayer.setSrc(url);
				this._isEnded = false;
			});
		}
		this._videoPlayer.setSrc(url);
		this._isEnded = false;
		this._isSeeking = false;
	}
	setThumbnail(url) {
		this._videoPlayer.thumbnail = url;
	}
	play() {
		return this._videoPlayer.play();
	}
	pause() {
		this._videoPlayer.pause();
		return Promise.resolve();
	}
	togglePlay() {
		return this._videoPlayer.togglePlay();
	}
	setPlaybackRate(playbackRate) {
		playbackRate = Math.max(0, Math.min(playbackRate, 10));
		this._videoPlayer.playbackRate = playbackRate;
		this._commentPlayer.setPlaybackRate(playbackRate);
	}
	fastSeek(t) {this._videoPlayer.fastSeek(Math.max(0, t));}
	set currentTime(t) {this._videoPlayer.currentTime = Math.max(0, t);}
	get currentTime() { return this._videoPlayer.currentTime;}
	get vpos() { return this.currentTime * 100; }
	get duration() {return this._videoPlayer.duration;}
	get chatList() {return this._commentPlayer.chatList;}
	get nonFilteredChatList() {return this._commentPlayer.nonFilteredChatList;}
	appendTo(node) {
		node = util.$(node)[0];
		this._parentNode = node;
		this._videoPlayer.appendTo(node);
		this._commentPlayer.appendTo(node);
	}
	close() {
		this._videoPlayer.close();
		this._commentPlayer.close();
	}
	closeCommentPlayer() {
		this._commentPlayer.close();
	}
	toggleFullScreen() {
		if (Fullscreen.now()) {
			Fullscreen.cancel();
		} else {
			this.requestFullScreen();
		}
	}
	requestFullScreen() {
		Fullscreen.request(this._fullscreenNode || this._parentNode);
	}
	canPlay() {
		return this._videoPlayer.canPlay();
	}
	get isPlaying() {
		return !!this._isPlaying;
	}
	get isPaused() {
		return this._videoPlayer.paused;
	}
	get isSeeking() {
		return !!this._isSeeking;
	}
	get bufferedRange() {return this._videoPlayer.bufferedRange;}
	addChat(text, cmd, vpos, options) {
		if (!this._commentPlayer) {
			return;
		}
		const nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
		console.log('addChat:', text, cmd, vpos, options, nicoChat);
		return nicoChat;
	}
	get filter() {return this._commentPlayer.filter;}
	get videoInfo() {return this._videoInfo;}
	set videoInfo(info) {this._videoInfo = info;}
	getMymemory() {return this._commentPlayer.getMymemory();}
	getScreenShot() {
		window.console.time('screenShot');
		const fileName = this._getSaveFileName();
		const video = this._videoPlayer.videoElement;
		return VideoCaptureUtil.videoToCanvas(video).then(({canvas}) => {
			VideoCaptureUtil.saveToFile(canvas, fileName);
			window.console.timeEnd('screenShot');
		});
	}
	getScreenShotWithComment() {
		window.console.time('screenShotWithComment');
		const fileName = this._getSaveFileName({suffix: 'C'});
		const video = this._videoPlayer.videoElement;
		const html = this._commentPlayer.getCurrentScreenHtml();
		return VideoCaptureUtil.nicoVideoToCanvas({video, html}).then(({canvas}) => {
			VideoCaptureUtil.saveToFile(canvas, fileName);
			window.console.timeEnd('screenShotWithComment');
		});
	}
	_getSaveFileName({suffix = ''} = {}) {
		const title = this._videoInfo.title;
		const watchId = this._videoInfo.watchId;
		const currentTime = this._videoPlayer.currentTime;
		const time = util.secToTime(currentTime).replace(':', '_');
		const prefix = Config.props['screenshot.prefix'] || '';
		return `${prefix}${title} - ${watchId}@${time}${suffix}.png`;
	}
	get isCorsReady() {return this._videoPlayer && this._videoPlayer.isCorsReady;}
	get volume() { return this._videoPlayer.volume;}
	set volume(v) {this._videoPlayer.volume = v;}
	getDuration() {return this._videoPlayer.duration;}
	getChatList() {return this._commentPlayer.chatList;}
	getVpos() {return Math.floor(this._videoPlayer.currentTime * 100);}
	setComment(xmlText, options) {this._commentPlayer.setComment(xmlText, options);}
	getNonFilteredChatList() {return this._commentPlayer.nonFilteredChatList;}
	getBufferedRange() {return this._videoPlayer.bufferedRange;}
	setVideoInfo(v) { this.videoInfo = v; }
	getVideoInfo() { return this.videoInfo; }
}
class ContextMenu extends BaseViewComponent {
	constructor({parentNode, playerState}) {
		super({
			parentNode,
			name: 'VideoContextMenu',
			template: ContextMenu.__tpl__,
			css: ContextMenu.__css__
		});
		this._playerState = playerState;
		this._state = {
			isOpen: false
		};
		this._bound.onBodyClick = this.hide.bind(this);
	}
	_initDom(...args) {
		super._initDom(...args);
		global.debug.contextMenu = this;
		const onMouseDown = this._bound.onMouseDown = this._onMouseDown.bind(this);
		this._bound.onBodyMouseUp = this._onBodyMouseUp.bind(this);
		this._bound.onRepeat = this._onRepeat.bind(this);
		this._view.classList.toggle('is-pictureInPictureEnabled', document.pictureInPictureEnabled);
		this._view.addEventListener('mousedown', onMouseDown);
		this._isFirstShow = true;
		this._view.addEventListener('contextmenu', (e) => {
			setTimeout(() => {
				this.hide();
			}, 100);
			e.preventDefault();
			e.stopPropagation();
		});
	}
	_onClick(e) {
		if (e && e.button !== 0) {
			return;
		}
		if (e.type !== 'mousedown') {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		e.stopPropagation();
		super._onClick(e);
	}
	_onMouseDown(e) {
		if (e.target && e.target.getAttribute('data-is-no-close') === 'true') {
			e.stopPropagation();
			this._onClick(e);
		} else if (e.target && e.target.getAttribute('data-repeat') === 'on') {
			e.stopPropagation();
			this._onClick(e);
			this._beginRepeat(e);
		} else {
			e.stopPropagation();
			this._onClick(e);
			setTimeout(() => {
				this.hide();
			}, 100);
		}
	}
	_onBodyMouseUp() {
		this._endRepeat();
	}
	_beginRepeat(e) {
		this._repeatEvent = e;
		document.body.addEventListener('mouseup', this._bound.onBodyMouseUp);
		this._repeatTimer = window.setInterval(this._bound.onRepeat, 200);
		this._isRepeating = true;
	}
	_endRepeat() {
		this._repeatEvent = null;
		if (this._repeatTimer) {
			window.clearInterval(this._repeatTimer);
			this._repeatTimer = null;
		}
		document.body.removeEventListener('mouseup', this._bound.onBodyMouseUp);
	}
	_onRepeat() {
		if (!this._isRepeating) {
			this._endRepeat();
			return;
		}
		if (this._repeatEvent) {
			this._onClick(this._repeatEvent);
		}
	}
	show(x, y) {
		document.body.addEventListener('click', this._bound.onBodyClick);
		const view = this._view;
		this._onBeforeShow(x, y);
		view.style.left =
			cssUtil.px(Math.max(0, Math.min(x, window.innerWidth - view.offsetWidth)));
		view.style.top =
			cssUtil.px(Math.max(0, Math.min(y + 20, window.innerHeight - view.offsetHeight)));
		this.setState({isOpen: true});
		global.emitter.emitAsync('showMenu');
	}
	hide() {
		document.body.removeEventListener('click', this._bound.onBodyClick);
		util.$(this._view).css({left: '', top: ''});
		this._endRepeat();
		this.setState({isOpen: false});
		global.emitter.emitAsync('hideMenu');
	}
	get isOpen() {
		return this._state.isOpen;
	}
	_onBeforeShow() {
		const pr = parseFloat(this._playerState.playbackRate, 10);
		const view = util.$(this._view);
		view.find('.selected').removeClass('selected');
		view.find('.playbackRate').forEach(elm => {
			const p = parseFloat(elm.getAttribute('data-param'), 10);
			if (Math.abs(p - pr) < 0.01) {
				elm.classList.add('selected');
			}
		});
		view.find('[data-config]').forEach(menu => {
			const name = menu.dataset.config;
			menu.classList.toggle('selected', !!global.config.props[name]);
		});
		view.find('.seekToResumePoint')
			.css('display', this._playerState.videoInfo.initialPlaybackTime > 0 ? '' : 'none');
		if (this._isFirstShow) {
			this._isFirstShow = false;
			const handler = (command, param) => {
				this.emit('command', command, param);
			};
			global.emitter.emitAsync('videoContextMenu.addonMenuReady',
				view.find('.empty-area-top'), handler
			);
			global.emitter.emitAsync('videoContextMenu.addonMenuReady.list',
				view.find('.listInner ul'), handler
			);
		}
	}
}
ContextMenu.__css__ = (`
		.zenzaPlayerContextMenu {
			position: fixed;
			background: rgba(255, 255, 255, 0.8);
			overflow: visible;
			padding: 8px;
			border: 1px outset #333;
			box-shadow: 2px 2px 4px #000;
			transition: opacity 0.3s ease;
			min-width: 200px;
			z-index: 150000;
			user-select: none;
			color: #000;
		}
		.zenzaPlayerContextMenu.is-Open {
			display: block;
			opacity: 0.5;
		}
		.zenzaPlayerContextMenu.is-Open:hover {
			opacity: 1;
		}
		.is-fullscreen .zenzaPlayerContextMenu {
			position: absolute;
		}
		.zenzaPlayerContextMenu:not(.is-Open) {
			display: none;
			/*left: -9999px;
			top: -9999px;
			opacity: 0;*/
		}
		.zenzaPlayerContextMenu ul {
			padding: 0;
			margin: 0;
		}
		.zenzaPlayerContextMenu ul li {
			position: relative;
			line-height: 120%;
			margin: 2px;
			overflow-y: visible;
			white-space: nowrap;
			cursor: pointer;
			padding: 2px 14px;
			list-style-type: none;
			float: inherit;
		}
		.is-playlistEnable .zenzaPlayerContextMenu li.togglePlaylist:before,
		.is-flipV          .zenzaPlayerContextMenu li.toggle-flipV:before,
		.is-flipH          .zenzaPlayerContextMenu li.toggle-flipH:before,
		.zenzaPlayerContextMenu ul                 li.selected:before {
			content: '✔';
			left: -10px;
			color: #000 !important;
			position: absolute;
		}
		.zenzaPlayerContextMenu ul li:hover {
			background: #336;
			color: #fff;
		}
		.zenzaPlayerContextMenu ul li.separator {
			border: 1px outset;
			height: 2px;
			width: 90%;
		}
		.zenzaPlayerContextMenu.show {
			opacity: 0.8;
		}
		.zenzaPlayerContextMenu .listInner {
		}
		.zenzaPlayerContextMenu .controlButtonContainer {
			position: absolute;
			bottom: 100%;
			left: 50%;
			width: 110%;
			transform: translate(-50%, 0);
			white-space: nowrap;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex {
			display: flex;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton {
			flex: 1;
			height: 48px;
			font-size: 24px;
			line-height: 46px;
			border: 1px solid;
			border-radius: 4px;
			color: #333;
			background: rgba(192, 192, 192, 0.95);
			cursor: pointer;
			transition: transform 0.1s, box-shadow 0.1s;
			box-shadow: 0 0 0;
			opacity: 1;
			margin: auto;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.screenShot {
			flex: 1;
			font-size: 24px;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.playbackRate {
			flex: 2;
			font-size: 14px;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate010,
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate100,
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate200 {
			flex: 3;
			font-size: 24px;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek5s {
			flex: 2;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek15s {
			flex: 3;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:hover {
			transform: translate(0px, -4px);
			box-shadow: 0px 4px 2px #666;
		}
		.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:active {
			transform: none;
			box-shadow: 0 0 0;
			border: 1px inset;
		}
		[data-command="picture-in-picture"] {
			display: none;
		}
		.is-pictureInPictureEnabled [data-command="picture-in-picture"] {
			display: block;
		}
	`).trim();
ContextMenu.__tpl__ = (`
		<div class="zenzaPlayerContextMenu">
			<div class="controlButtonContainer">
				<div class="controlButtonContainerFlex">
					<div class="controlButton command screenShot" data-command="screenShot"
						data-param="0.1" data-type="number" data-is-no-close="true">
						&#128247;<div class="tooltip">スクリーンショット</div>
					</div>
					<div class="empty-area-top" style="flex:4;" data-is-no-close="true"></div>
				</div>
				<div class="controlButtonContainerFlex">
					<div class="controlButton command rate010 playbackRate" data-command="playbackRate"
						data-param="0.1" data-type="number" data-repeat="on">
						&#128034;<div class="tooltip">コマ送り(0.1倍)</div>
					</div>
					<div class="controlButton command rate050 playbackRate" data-command="playbackRate"
						data-param="0.5" data-type="number" data-repeat="on">
						<div class="tooltip">0.5倍速</div>
					</div>
					<div class="controlButton command rate075 playbackRate" data-command="playbackRate"
						data-param="0.75" data-type="number" data-repeat="on">
						<div class="tooltip">0.75倍速</div>
					</div>
					<div class="controlButton command rate100 playbackRate" data-command="playbackRate"
						data-param="1.0" data-type="number" data-repeat="on">
						&#9655;<div class="tooltip">標準速</div>
					</div>
					<div class="controlButton command rate125 playbackRate" data-command="playbackRate"
						data-param="1.25" data-type="number" data-repeat="on">
						<div class="tooltip">1.25倍速</div>
					</div>
					<div class="controlButton command rate150 playbackRate" data-command="playbackRate"
						data-param="1.5" data-type="number" data-repeat="on">
						<div class="tooltip">1.5倍速</div>
					</div>
					<div class="controlButton command rate200 playbackRate" data-command="playbackRate"
						data-param="2.0" data-type="number" data-repeat="on">
						&#128007;<div class="tooltip">2倍速</div>
					</div>
				</div>
				<div class="controlButtonContainerFlex seekToResumePoint">
					<div class="controlButton command"
					data-command="seekToResumePoint"
					>▼ここまで見た
						<div class="tooltip">レジューム位置にジャンプ</div>
					</div>
				</div>
				<div class="controlButtonContainerFlex">
					<div class="controlButton command seek5s"
						data-command="seekBy" data-param="-5" data-type="number" data-repeat="on"
						>⇦
							<div class="tooltip">5秒戻る</div>
					</div>
					<div class="controlButton command seek15s"
						data-command="seekBy" data-param="-15" data-type="number" data-repeat="on"
						>⇦
							<div class="tooltip">15秒戻る</div>
					</div>
					<div class="controlButton command seek15s"
						data-command="seekBy" data-param="15" data-type="number" data-repeat="on"
						>⇨
							<div class="tooltip">15秒進む</div>
					</div>
					<div class="controlButton command seek5s"
						data-command="seekBy" data-param="5" data-type="number" data-repeat="on"
						>⇨
							<div class="tooltip">5秒進む</div>
					</div>
				</div>
			</div>
			<div class="listInner">
				<ul>
					<li class="command" data-command="togglePlay">停止/再開</li>
					<li class="command" data-command="seekTo" data-param="0">先頭に戻る</li>
					<hr class="separator">
					<li class="command toggleLoop"        data-config="loop" data-command="toggle-loop">リピート</li>
					<li class="command togglePlaylist"    data-command="togglePlaylist">連続再生</li>
					<li class="command toggleShowComment" data-config="showComment" data-command="toggle-showComment">コメントを表示</li>
					<li class="command" data-command="picture-in-picture">P in P</li>
					<hr class="separator">
					<li class="command forPremium toggle-flipH" data-command="toggle-flipH">左右反転</li>
					<li class="command toggle-flipV"            data-command="toggle-flipV">上下反転</li>
					<hr class="separator">
					<li class="command"
						data-command="reload">動画のリロード</li>
					<li class="command"
						data-command="copy-video-watch-url">動画URLをコピー</li>
					<li class="command debug" data-config="debug"
						data-command="toggle-debug">デバッグ</li>
					<li class="command mymemory"
						data-command="saveMymemory">コメントの保存</li>
				</ul>
			</div>
		</div>
	`).trim();
class VideoPlayer extends Emitter {
	constructor(params) {
		super();
		this._initialize(params);
	}
	_initialize(params) {
		this._id = 'video' + Math.floor(Math.random() * 100000);
		this._resetVideo(params);
		util.addStyle(VideoPlayer.__css__);
	}
	_reset() {
		this.removeClass('is-play is-pause is-abort is-error');
		this._isPlaying = false;
		this._canPlay = false;
	}
	addClass(className) {
		this._body.classList.add(...className.split(/\s/));
	}
	removeClass(className) {
		this._body.classList.remove(...className.split(/\s/));
	}
	toggleClass(className, v) {
		const body = this._body;
		className.split(/[ ]+/).forEach(name => {
			body.classList.toggle(name, v);
		});
	}
	_resetVideo(params) {
		params = params || {};
		if (this._videoElement) {
			params.autoplay = this._videoElement.autoplay;
			params.loop = this._videoElement.loop;
			params.mute = this._videoElement.muted;
			params.volume = this._videoElement.volume;
			params.playbackRate = this._videoElement.playbackRate;
			this._videoElement.remove();
		}
		const options = {
			autobuffer: true,
			preload: 'auto',
			mute: !!params.mute,
			'playsinline': true,
			'webkit-playsinline': true
		};
		const volume =
			params.hasOwnProperty('volume') ? parseFloat(params.volume) : 0.5;
		const playbackRate = this._playbackRate =
			params.hasOwnProperty('playbackRate') ? parseFloat(params.playbackRate) : 1.0;
		const video = util.createVideoElement();
		const body = document.createElement('div');
		util.$(body)
			.addClass(`videoPlayer nico ${this._id}`);
		util.$(video)
			.addClass('videoPlayer-video')
			.attr(options);
		body.id = 'ZenzaWatchVideoPlayerContainer';
		this._body = body;
		body.append(video);
		video.pause();
		this._video = video;
		this._video.className = 'zenzaWatchVideoElement';
		video.controlslist = 'nodownload';
		video.controls = false;
		video.autoplay = !!params.autoPlay;
		video.loop = !!params.loop;
		this._videoElement = video;
		this._isPlaying = false;
		this._canPlay = false;
		this.volume = volume;
		this.muted = params.mute;
		this.playbackRate=playbackRate;
		this._touchWrapper = new TouchWrapper({
			parentElement: body
		});
		this._touchWrapper.on('command', (command, param) => {
			if (command === 'contextMenu') {
				this._emit('contextMenu', param);
				return;
			}
			this.emit('command', command, param);
		});
		this._initializeEvents();
		global.debug.video = this._video;
		Object.assign(global.external, {getVideoElement: () => this._video});
	}
	_initializeEvents() {
		const eventBridge = function(name, ...args) {
			console.log('%c_on-%s:', 'background: cyan;', name, ...args);
			this.emit(name, ...args);
		};
		util.$(this._video)
			.on('canplay', this._onCanPlay.bind(this))
			.on('canplaythrough', eventBridge.bind(this, 'canplaythrough'))
			.on('loadstart', eventBridge.bind(this, 'loadstart'))
			.on('loadeddata', eventBridge.bind(this, 'loadeddata'))
			.on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'))
			.on('ended', eventBridge.bind(this, 'ended'))
			.on('emptied', eventBridge.bind(this, 'emptied'))
			.on('suspend', eventBridge.bind(this, 'suspend'))
			.on('waiting', eventBridge.bind(this, 'waiting'))
			.on('progress', this._onProgress.bind(this))
			.on('durationchange', this._onDurationChange.bind(this))
			.on('abort', this._onAbort.bind(this))
			.on('error', this._onError.bind(this))
			.on('buffercomplete', eventBridge.bind(this, 'buffercomplete'))
			.on('pause', this._onPause.bind(this))
			.on('play', this._onPlay.bind(this))
			.on('playing', this._onPlaying.bind(this))
			.on('seeking', this._onSeeking.bind(this))
			.on('seeked', this._onSeeked.bind(this))
			.on('volumechange', this._onVolumeChange.bind(this))
			.on('contextmenu', eventBridge.bind(this, 'contextmenu'))
			.on('click', eventBridge.bind(this, 'click'))
		;
		const touch = util.$(this._touchWrapper.body);
		touch
			.on('click', eventBridge.bind(this, 'click'))
			.on('dblclick', this._onDoubleClick.bind(this))
			.on('contextmenu', eventBridge.bind(this, 'contextmenu'))
			.on('wheel', this._onMouseWheel.bind(this), {passive: true})
		;
	}
	_onCanPlay(...args) {
		console.log('%c_onCanPlay:', 'background: cyan; color: blue;', ...args);
		this.playbackRate= this.playbackRate;
		if (!this._canPlay) {
			this._canPlay = true;
			this.removeClass('is-loading');
			this.emit('canPlay', ...args);
			if (this._video.videoHeight < 1) {
				this._isAspectRatioFixed = false;
			} else {
				this._isAspectRatioFixed = true;
				this.emit('aspectRatioFix',
					this._video.videoHeight / Math.max(1, this._video.videoWidth));
			}
			if (this._isYouTube && Config.props.bestZenTube) {
				this._videoYouTube.selectBestQuality();
			}
		}
	}
	_onProgress() {
		this.emit('progress', this._video.buffered, this._video.currentTime);
	}
	_onDurationChange() {
		console.log('%c_onDurationChange:', 'background: cyan;', arguments);
		this.emit('durationChange', this._video.duration);
	}
	_onAbort() {
		if (this._isYouTube) {
			return;
		} // TODO: YouTube側のエラーハンドリング
		this._isPlaying = false;
		this.addClass('is-abort');
		this.emit('abort');
	}
	_onError(e) {
		if (this._isYouTube) {
			return;
		}
		if (this._videoElement.src === CONSTANT.BLANK_VIDEO_URL ||
			!this._videoElement.src ||
			this._videoElement.src.match(/^https?:$/) ||
			this._videoElement.src === '//'
		) {
			return;
		}
		window.console.error('error src', this._video.src);
		window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
		this.addClass('is-error');
		this._canPlay = false;
		this.emit('error', {
			code: (e && e.target && e.target.error && e.target.error.code) || 0,
			target: e.target || this._video,
			type: 'normal'
		});
	}
	_onYouTubeError(e) {
		window.console.error('error src', this._video.src);
		window.console.error('%c_onError:', 'background: cyan; color: red;', e);
		this.addClass('is-error');
		this._canPlay = false;
		let fallback = false;
		const code = e.data;
		const description = (() => {
			switch (code) {
				case 2:
					return 'YouTube Error: パラメータエラー (2 invalid parameter)';
				case 5:
					return 'YouTube Error: HTML5 関連エラー (5 HTML5 error)';
				case 100:
					fallback = true;
					return 'YouTube Error: 動画が見つからないか、非公開 (100 video not found)';
				case 101:
				case 150:
					fallback = true;
					return `YouTube Error: 外部での再生禁止 (${code} forbidden)`;
				default:
					return `YouTube Error: (code${code})`;
			}
		})();
		this.emit('error', {
			code,
			description,
			fallback,
			target: this._videoElement,
			type: 'youtube'
		});
	}
	_onPause() {
		console.log('%c_onPause:', 'background: cyan;', arguments);
		this._isPlaying = false;
		this.emit('pause');
	}
	_onPlay() {
		console.log('%c_onPlay:', 'background: cyan;', arguments);
		this.addClass('is-play');
		this._isPlaying = true;
		this.emit('play');
	}
	_onPlaying() {
		console.log('%c_onPlaying:', 'background: cyan;', arguments);
		this._isPlaying = true;
		if (!this._isAspectRatioFixed) {
			this._isAspectRatioFixed = true;
			this.emit('aspectRatioFix',
				this._video.videoHeight / Math.max(1, this._video.videoWidth));
		}
		this.emit('playing');
	}
	_onSeeking() {
		console.log('%c_onSeeking:', 'background: cyan;', arguments);
		this.emit('seeking', this._video.currentTime);
	}
	_onSeeked() {
		console.log('%c_onSeeked:', 'background: cyan;', arguments);
		this.emit('seeked', this._video.currentTime);
	}
	_onVolumeChange() {
		console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
		this.emit('volumeChange', this.volume, this.muted);
	}
	_onDoubleClick(e) {
		console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
		e.preventDefault();
		e.stopPropagation();
		this.emit('dblclick');
	}
	_onMouseWheel(e) {
		if (e.buttons || e.shiftKey) {
			return;
		}
		console.log('%c_onMouseWheel:', 'background: cyan;', e);
		e.stopPropagation();
		const delta = -parseInt(e.deltaY, 10);
		if (delta !== 0) {
			this.emit('mouseWheel', e, delta);
		}
	}
	_onStalled(e) {
		this.emit('stalled', e);
		this._video.addEventListener('timeupdate', () => this.emit('timeupdate'), {once: true});
	}
	canPlay() {
		return !!this._canPlay;
	}
	async play() {
		if (this._currentVideo.currentTime === this.duration) {
			this.currentTime = 0;
		}
		const p = await this._video.play();
		this._isPlaying = true;
		return p;
	}
	pause() {
		this._video.pause();
		this._isPlaying = false;
		return Promise.resolve();
	}
	get isPlaying() {
		return !!this._isPlaying && !!this._canPlay;
	}
	get isPaused() {
		return this._video.paused;
	}
	set thumbnail(url) {
		console.log('%csetThumbnail: %s', 'background: cyan;', url);
		this._thumbnail = url;
		this._video.poster = url;
	}
	get thumbnail() {
		return this._thumbnail;
	}
	set src(url) {
		console.log('%csetSc: %s', 'background: cyan;', url);
		this._reset();
		this._src = url;
		this._isPlaying = false;
		this._canPlay = false;
		this._isAspectRatioFixed = false;
		this.addClass('is-loading');
		if (/(youtube\.com|youtu\.be)/.test(url)) {
			const currentTime = this._currentVideo.currentTime;
			this._initYouTube().then(() => {
				return this._videoYouTube.setSrc(url, currentTime);
			}).then(() => {
				this._changePlayer('YouTube');
			});
			return;
		}
		this._changePlayer('normal');
		if (url.indexOf('dmc.nico') >= 0 && location.host.indexOf('.nicovideo.jp') >= 0) {
			this._video.crossOrigin = 'use-credentials';
		} else if (this._video.crossOrigin) {
			this._video.crossOrigin = null;
		}
		this._video.src = url;
	}
	get src() {return this._src;}
	get _isYouTube() {return this._videoYouTube && this._currentVideo === this._videoYouTube;}
	_initYouTube() {
		if (this._videoYouTube) {
			return Promise.resolve(this._videoYouTube);
		}
		const yt = this._videoYouTube = new YouTubeWrapper({
			parentNode: this._body.appendChild(document.createElement('div')),
			volume: this._volume,
			autoplay: this._videoElement.autoplay
		});
		const eventBridge = function(...args) {
			this.emit(...args);
		};
		yt.on('canplay', this._onCanPlay.bind(this));
		yt.on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'));
		yt.on('ended', eventBridge.bind(this, 'ended'));
		yt.on('stalled', eventBridge.bind(this, 'stalled'));
		yt.on('pause', this._onPause.bind(this));
		yt.on('play', this._onPlay.bind(this));
		yt.on('playing', this._onPlaying.bind(this));
		yt.on('seeking', this._onSeeking.bind(this));
		yt.on('seeked', this._onSeeked.bind(this));
		yt.on('volumechange', this._onVolumeChange.bind(this));
		yt.on('error', this._onYouTubeError.bind(this));
		global.debug.youtube = yt;
		return Promise.resolve(this._videoYouTube);
	}
	_changePlayer(type) {
		switch (type.toLowerCase()) {
			case 'youtube':
				if (this._currentVideo !== this._videoYouTube) {
					const yt = this._videoYouTube;
					this.addClass('is-youtube');
					yt.autoplay = this._currentVideo.autoplay;
					yt.loop = this._currentVideo.loop;
					yt.muted = this._currentVideo.muted;
					yt.volume = this._currentVideo.volume;
					yt.playbackRate = this._currentVideo.playbackRate;
					this._currentVideo = yt;
					this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
					this.emit('playerTypeChange', 'youtube');
				}
				break;
			default:
				if (this._currentVideo === this._videoYouTube) {
					this.removeClass('is-youtube');
					this._videoElement.loop = this._currentVideo.loop;
					this._videoElement.muted = this._currentVideo.muted;
					this._videoElement.volume = this._currentVideo.volume;
					this._videoElement.playbackRate = this._currentVideo.playbackRate;
					this._currentVideo = this._videoElement;
					this._videoYouTube.src = '';
					this.emit('playerTypeChange', 'normal');
				}
				break;
		}
	}
	set volume(vol) {
		vol = Math.max(Math.min(1, vol), 0);
		this._video.volume = vol;
	}
	get volume() {return Math.max(0, this._video.volume);}
	set muted(v) {
		v = !!v;
		if (this._video.muted !== v) {
			this._video.muted = v;
		}
	}
	get muted() {return this._video.muted;}
	get currentTime() {
		if (!this._canPlay) {
			return 0;
		}
		return this._video.currentTime;
	}
	set currentTime(sec) {
		const cur = this._video.currentTime;
		if (cur !== sec) {
			this._video.currentTime = sec;
			this.emit('seek', this._video.currentTime);
		}
	}
	fastSeek(sec) {
		if (typeof this._video.fastSeek !== 'function' || this._isYouTube) {
			return this.currentTime=sec;
		}
		if (this._src.indexOf('dmc.nico') >= 0) {
			return this.currentTime = sec;
		}
		this._video.fastSeek(sec);
		this.emit('seek', this._video.currentTime);
	}
	get duration() {return this._video.duration;}
	togglePlay() {
		if (this.isPlaying) {
			return this.pause();
		} else {
			return this.play();
		}
	}
	get vpos() {return this._video.currentTime * 100;}
	set vpos(vpos) {this._video.currentTime = vpos / 100;}
	get isLoop() {return !!this._video.loop;}
	set isLoop(v) {this._video.loop = !!v; }
	set playbackRate(v) {
		console.log('setPlaybackRate', v);
		this._playbackRate = v;
		let video = this._video;
		video.playbackRate = 1;
		window.setTimeout(() => video.playbackRate = parseFloat(v), 100);
	}
	get playbackRate() {return this._playbackRate;}
	get bufferedRange() {return this._video.buffered;}
	set isAutoPlay(v) {this._video.autoplay = v;}
	get isAutoPlay() {return this._video.autoPlay;}
	setSrc(url) { this.src = url;}
	setVolume(v) { this.volume = v; }
	getVolume() { return this.volume; }
	setMute(v) { this.muted = v;}
	isMuted() { return this.muted; }
	getDuration() { return this.duration; }
	getVpos() { return this.vpos; }
	setVpos(v) { this.vpos = v; }
	getIsLoop() {return this.isLoop;}
	setIsLoop(v) {this.isLoop = !!v; }
	setPlaybackRate(v) { this.playbackRate = v; }
	getPlaybackRate() { return this.playbackRate; }
	getBufferedRange() { return this.bufferedRange; }
	setIsAutoPlay(v) {this.isAutoplay = v;}
	getIsAutoPlay() {return this.isAutoPlay;}
	appendTo(node) {node.append(this._body);}
	close() {
		this._video.pause();
		this._video.removeAttribute('src');
		this._video.removeAttribute('poster');
		this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
		if (this._videoYouTube) {
			this._videoYouTube.src = '';
		}
	}
	getScreenShot() {
		if (!this.isCorsReady) {
			return null;
		}
		const video = this._video;
		const width = video.videoWidth;
		const height = video.videoHeight;
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		context.drawImage(video.drawableElement || video, 0, 0);
		return canvas;
	}
	get isCorsReady() {return this._video.crossOrigin === 'use-credentials';}
	get videoElement() {return this._videoElement;}
	get _video() {return this._currentVideo;}
	set _video(v) {this._currentVideo = v;}
}
VideoPlayer.__css__ = `
		.videoPlayer iframe,
		.videoPlayer .zenzaWatchVideoElement {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			z-index: 5;
		}
		.zenzaWatchVideoElement {
			display: block;
			transition: transform 0.4s ease;
		}
		.is-flipH .zenzaWatchVideoElement {
			transform: perspective(400px) rotateY(180deg);
		}
		.is-flipV .zenzaWatchVideoElement {
			transform: perspective(400px) rotateX(180deg);
		}
		.is-flipV.is-flipH .zenzaWatchVideoElement {
			transform: perspective(400px) rotateX(180deg) rotateY(180deg);
		}
		/* iOSだとvideo上でマウスイベントが発生しないのでカバーを掛ける */
		.touchWrapper {
			display: block;
			position: absolute;
			opacity: 0;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			z-index: 10;
			touch-action: none;
		}
		/* YouTubeのプレイヤーを触れる用にするための隙間 */
		.is-youtube .touchWrapper {
			width:  calc(100% - 100px);
			height: calc(100% - 150px);
		}
		.is-loading .touchWrapper,
		.is-error .touchWrapper {
			display: none !important;
		}
		.videoPlayer.is-youtube .zenzaWatchVideoElement {
			display: none;
		}
		.videoPlayer iframe {
			display: none;
		}
		.videoPlayer.is-youtube iframe {
			display: block;
			border: 1px dotted;
		}
	`.trim();
class TouchWrapper extends Emitter {
	constructor({parentElement}) {
		super();
		this._parentElement = parentElement;
		this._config = global.config.namespace('touch');
		this._isTouching = false;
		this._maxCount = 0;
		this._currentPointers = [];
		this._debouncedOnSwipe2Y = _.debounce(this._onSwipe2Y.bind(this), 400);
		this._debouncedOnSwipe3X = _.debounce(this._onSwipe3X.bind(this), 400);
		this.initializeDom();
	}
	initializeDom() {
		let body = this._body = document.createElement('div');
		body.className = 'touchWrapper';
		body.addEventListener('click', this._onClick.bind(this));
		body.addEventListener('touchstart', this._onTouchStart.bind(this), {passive: true});
		body.addEventListener('touchmove', this._onTouchMove.bind(this), {passive: true});
		body.addEventListener('touchend', this._onTouchEnd.bind(this), {passive: true});
		body.addEventListener('touchcancel', this._onTouchCancel.bind(this), {passive: true});
		this._onTouchMoveThrottled =
			_.throttle(this._onTouchMoveThrottled.bind(this), 200);
		if (this._parentElement) {
			this._parentElement.appendChild(body);
		}
		global.debug.touchWrapper = this;
	}
	get body() {
		return this._body;
	}
	_onClick() {
		this._lastTap = 0;
	}
	_onTouchStart(e) {
		let identifiers =
			this._currentPointers.map(touch => {
				return touch.identifier;
			});
		if (e.changedTouches.length > 1) {
			e.preventDefault();
		}
		[...e.changedTouches].forEach(touch => {
			if (identifiers.includes(touch.identifier)) {
				return;
			}
			this._currentPointers.push(touch);
		});
		this._maxCount = Math.max(this._maxCount, this.touchCount);
		this._startCenter = this._getCenter(e);
		this._lastCenter = this._getCenter(e);
		this._isMoved = false;
	}
	_onTouchMove(e) {
		if (e.targetTouches.length > 1) {
			e.preventDefault();
		}
		this._onTouchMoveThrottled(e);
	}
	_onTouchMoveThrottled(e) {
		if (!e.targetTouches) {
			return;
		}
		if (e.targetTouches.length > 1) {
			e.preventDefault();
		}
		let startPoint = this._startCenter;
		let lastPoint = this._lastCenter;
		let currentPoint = this._getCenter(e);
		if (!startPoint || !currentPoint) {
			return;
		}
		let width = this._body.offsetWidth;
		let height = this._body.offsetHeight;
		let diff = {
			count: this.touchCount,
			startX: startPoint.x,
			startY: startPoint.y,
			currentX: currentPoint.x,
			currentY: currentPoint.y,
			moveX: currentPoint.x - lastPoint.x,
			moveY: currentPoint.y - lastPoint.y,
			x: currentPoint.x - startPoint.x,
			y: currentPoint.y - startPoint.y,
		};
		diff.perX = diff.x / width * 100;
		diff.perY = diff.y / height * 100;
		diff.perStartX = diff.startX / width * 100;
		diff.perStartY = diff.startY / height * 100;
		diff.movePerX = diff.moveX / width * 100;
		diff.movePerY = diff.moveY / height * 100;
		if (Math.abs(diff.perX) > 2 || Math.abs(diff.perY) > 1) {
			this._isMoved = true;
		}
		if (diff.count === 2) {
			if (Math.abs(diff.movePerX) >= 0.5) {
				this._execCommand('seekRelativePercent', diff);
			}
			if (Math.abs(diff.perY) >= 20) {
				this._debouncedOnSwipe2Y(diff);
			}
		}
		if (diff.count === 3) {
			if (Math.abs(diff.perX) >= 20) {
				this._debouncedOnSwipe3X(diff);
			}
		}
		this._lastCenter = currentPoint;
		return diff;
	}
	_onSwipe2Y(diff) {
		this._execCommand(diff.perY < 0 ? 'shiftUp' : 'shiftDown');
		this._startCenter = this._lastCenter;
	}
	_onSwipe3X(diff) {
		this._execCommand(diff.perX < 0 ? 'playNextVideo' : 'playPreviousVideo');
		this._startCenter = this._lastCenter;
	}
	_execCommand(command, param) {
		if (!this._config.props.enable) {
			return;
		}
		if (!command) {
			return;
		}
		this.emit('command', command, param);
	}
	_onTouchEnd(e) {
		if (!e.changedTouches) {
			return;
		}
		let identifiers =
			Array.from(e.changedTouches).map(touch => {
				return touch.identifier;
			});
		let currentTouches = [];
		currentTouches = this._currentPointers.filter(touch => {
			return !identifiers.includes(touch.identifier);
		});
		this._currentPointers = currentTouches;
		if (!this._isMoved && this.touchCount === 0) {
			const config = this._config;
			this._lastTap = this._maxCount;
			window.console.info('touchEnd', this._maxCount, this._isMoved);
			switch (this._maxCount) {
				case 2:
					this._execCommand(config.props.tap2command);
					break;
				case 3:
					this._execCommand(config.props.tap3command);
					break;
				case 4:
					this._execCommand(config.props.tap4command);
					break;
				case 5:
					this._execCommand(config.props.tap5command);
					break;
			}
			this._maxCount = 0;
			this._isMoved = false;
		}
	}
	_onTouchCancel(e) {
		if (!e.changedTouches) {
			return;
		}
		let identifiers =
			Array.from(e.changedTouches).map(touch => {
				return touch.identifier;
			});
		let currentTouches = [];
		window.console.log('onTouchCancel', this._isMoved, e.changedTouches.length);
		currentTouches = this._currentPointers.filter(touch => {
			return !identifiers.includes(touch.identifier);
		});
		this._currentPointers = currentTouches;
	}
	get touchCount() {
		return this._currentPointers.length;
	}
	_getCenter(e) {
		let x = 0, y = 0;
		Array.from(e.touches).forEach(t => {
			x += t.pageX;
			y += t.pageY;
		});
		return {x: x / e.touches.length, y: y / e.touches.length};
	}
}

class StoryboardInfoModel extends Emitter {
	static get blankData() {
		return {
			format: 'dmc',
			status: 'fail',
			duration: 1,
			storyboard: [{
				id: 1,
				urls: ['https://example.com'],
				thumbnail: {
					width: 160,
					height: 90,
					number: 1,
					interval: 1000
				},
				board: {
					rows: 1,
					cols: 1,
					number: 1
				}
			}]
		};
	}
	constructor(rawData) {
		super();
		this.update(rawData);
	}
	update(rawData) {
		if (!rawData || rawData.status !== 'ok') {
			this._rawData = this.constructor.blankData;
		} else {
			this._rawData = rawData;
		}
		this.primary = this._rawData.storyboard[0];
		this.emit('update', this);
		return this;
	}
	reset() {
		this._rawData = this.constructor.blankData;
		this.emit('reset');
	}
	get rawData() {
		return this._rawData || this.constructor.blankData;
	}
	get isAvailable() {return this._rawData.status === 'ok';}
	get hasSubStoryboard() { return false; }
	get status() {return this._rawData.status;}
	get message() {return this._rawData.message;}
	get duration() {return this._rawData.duration * 1;}
	get isDmc() {return this._rawData.format === 'dmc';}
	get url() {
		return this.isDmc ? this.primary.urls[0] : this.primary.url;
	}
	get imageUrls() {
		return [...Array(this.pageCount)].map((a, i) => this.getPageUrl(i));
	}
	get cellWidth() { return this.primary.thumbnail.width * 1; }
	get cellHeight() { return this.primary.thumbnail.height * 1; }
	get cellIntervalMs() { return this.primary.thumbnail.interval * 1; }
	get cellCount() {
		return Math.max(
			Math.ceil(this.duration / Math.max(0.01, this.cellIntervalMs)),
			this.primary.thumbnail.number * 1
		);
	}
	get rows() { return this.primary.board.rows * 1; }
	get cols() { return this.primary.board.cols * 1; }
	get pageCount() { return this.primary.board.number * 1; }
	get totalRows() { return Math.ceil(this.cellCount / this.cols); }
	get pageWidth() { return this.cellWidth * this.cols; }
	get pageHeight() { return this.cellHeight * this.rows; }
	get countPerPage() { return this.rows * this.cols; }
}
class StoryboardView extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	initialize(params) {
		console.log('%c initialize StoryboardView', 'background: lightgreen;');
		this._container = params.container;
		const sb = this._model = params.model;
		this.isHover = false;
		this._currentUrl = '';
		this._lastPage = -1;
		this._lastMs = -1;
		this._lastGetMs = -1;
		this._scrollLeft = 0;
		this._isEnable = _.isBoolean(params.enable) ? params.enable : true;
		sb.on('update', this._onStoryboardUpdate.bind(this));
		sb.on('reset', this._onStoryboardReset.bind(this));
		const frame = this._requestAnimationFrame = new RequestAnimationFrame(
			this._onRequestAnimationFrame.bind(this), 3
		);
		global.emitter.on('DialogPlayerClose', () => frame.disable());
	}
	enable() {
		this._isEnable = true;
		if (this._view && this._model.isAvailable) {
			this.open();
		}
	}
	open() {
		if (!this._view) {
			return;
		}
		this._view.classList.add('is-open');
		this._body.classList.add('zenzaStoryboardOpen');
		this._container.classList.add('zenzaStoryboardOpen');
		this._requestAnimationFrame.enable();
	}
	close() {
		if (!this._view) {
			return;
		}
		this._view.classList.remove('is-open');
		this._body.classList.remove('zenzaStoryboardOpen');
		this._container.classList.remove('zenzaStoryboardOpen');
		this._requestAnimationFrame.disable();
	}
	disable() {
		this._isEnable = false;
		this.close();
	}
	toggle(v) {
		if (typeof v === 'boolean') {
			this._isEnable = !v;
		}
		if (this._isEnable) {
			this.disable();
		} else {
			this.enable();
		}
	}
	get isEnable() {
		return !!this._isEnable;
	}
	_initializeStoryboard() {
		if (this._body) { return; }
		window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');
		this._body = document.body;
		css.addStyle(StoryboardView.__css__);
		const view = this._view = uq.html(StoryboardView.__tpl__)[0];
		const inner = this._inner = view.querySelector('.storyboardInner');
		this._bone = view.querySelector('.storyboardInner-bone');
		this._failMessage = view.querySelector('.failMessage');
		this._cursorTime = view.querySelector('.cursorTime');
		this._pointer = view.querySelector('.storyboardPointer');
		this._inner = inner;
		TextLabel.create({
			container: this._cursorTime,
			name: 'cursorTimeLabel',
			text: '00:00',
			style: {
				widthPx: 54,
				heightPx: 29,
				fontFamily: 'monospace',
				fontWeight: '',
				fontSizePx: 13.3,
				color: '#000'
			}
		}).then(label => this.cursorTimeLabel = label);
		uq(inner)
			.on('click', this._onBoardClick.bind(this))
			.on('mousemove', this._onBoardMouseMove.bind(this))
			.on('mousemove', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
			.on('wheel', this._onMouseWheel.bind(this))
			.on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));
		const onHoverIn = () => this.isHover = true;
		const onHoverOut = () => this.isHover = false;
		uq(inner)
			.on('mouseenter', onHoverIn)
			.on('mouseleave',  _.debounce(onHoverOut, 1000))
			.on('touchstart', this._onTouchStart.bind(this))
			.on('touchmove', this._onTouchMove.bind(this));
		this._bouncedOnToucheMoveEnd = _.debounce(this._onTouchMoveEnd.bind(this), 2000);
		this._container.append(view);
		view.closest('.zen-root')
			.addEventListener('touchend', () => this.isHover = false, {passive: true});
		this._innerWidth = window.innerWidth;
		window.addEventListener('resize',
			_.throttle(() => {
				const width = this._innerWidth = window.innerWidth;
				if (this.canvas) {
					this.canvas.resize({width, height: this._model.cellHeight});
				}
			}, 500), {passive: true});
	}
	_onBoardClick(e) {
		const model = this._model;
		const innerWidth = model.cellCount * model.cellWidth;
		const x = e.clientX + this._scrollLeft;
		const duration = model.duration;
		const sec = x / innerWidth * duration;
		const view = this._view;
		this._cursorTime.style.setProperty('--trans-x-pp', cssUtil.px(-1000));
		domEvent.dispatchCommand(view, 'seekTo', sec);
	}
	_onBoardMouseMove(e) {
		const model = this._model;
		const innerWidth = model.cellCount * model.cellWidth;
		const x = e.clientX + this._scrollLeft;
		const duration = model.duration;
		const sec = x / innerWidth * duration;
		const time = textUtil.secToTime(sec);
		if (this.cursorTimeLabel && this.cursorTimeLabel.text !== time) {
			this.cursorTimeLabel.text = time;
		}
		this._cursorTime.style.setProperty('--trans-x-pp', cssUtil.px(e.x));
		this.isHover = true;
		this._isMouseMoving = true;
	}
	_onBoardMouseMoveEnd(e) {
		this._isMouseMoving = false;
	}
	_onMouseWheel(e) {
		e.stopPropagation();
		const deltaX = parseInt(e.deltaX, 10);
		const delta = parseInt(e.deltaY, 10);
		if (Math.abs(deltaX) > Math.abs(delta)) {
			return;
		}
		e.preventDefault();
		this.isHover = true;
		this._isMouseMoving = true;
		const left = this.scrollLeft();
		this.scrollLeft(left + delta * 5, true);
	}
	_onMouseWheelEnd(e) {
		this._isMouseMoving = false;
	}
	_onTouchStart(e) {
		this.isHover = true;
		this._isMouseMoving = true;
		e.stopPropagation();
	}
	_onTouchEnd(e) {
	}
	_onTouchMove(e) {
		e.stopPropagation();
		this.isHover = true;
		this._isMouseMoving = true;
		this._isTouchMoving = true;
		this._bouncedOnToucheMoveEnd();
	}
	_onTouchMoveEnd() {
		this._isTouchMoving = false;
		this._isMouseMoving = false;
	}
	_onTouchCancel(e) {
	}
	update() {
		this.isHover = false;
		this._timerCount = 0;
		this._scrollLeft = 0;
		this._initializeStoryboard(this._model);
		this.close();
		this._view.classList.remove('is-success', 'is-fail');
		if (this._model.status === 'ok') {
			this._updateSuccess();
		} else {
			this._updateFail();
		}
	}
	scrollLeft(left, forceUpdate) {
		const inner = this._inner;
		if (!inner) {
			return 0;
		}
		if (forceUpdate) {
			this._requestAnimationFrame.execOnce();
		}
		if (left === undefined) {
			return this._scrollLeft;
		} else {
			if (Math.abs(this._scrollLeft - left) < 1) {
				return;
			}
			this.isEnable && this.canvas && (this.canvas.scrollLeft = left);
			this._scrollLeft = left;
			this._scrollLeftChanged = true;
		}
	}
	_updateSuccess() {
		const view = this._view;
		view.classList.add('is-success');
		window.console.time('createStoryboardDOM');
		this._updateSuccessDom();
		window.console.timeEnd('createStoryboardDOM');
		if (this._isEnable) {
			view.classList.add('opening', 'is-open');
			this.scrollLeft(0);
			this.open();
			window.setTimeout(() => view.classList.remove('opening'), 1000);
		}
	}
	_updateSuccessDom() {
		const model = this._model;
		const infoRawData = model.rawData;
		if (!this.canvas) {
			StoryboardWorker.createBoard({
				container: this._view.querySelector('.storyboardCanvasContainer'),
				canvas: this._view.querySelector('.storyboardCanvas'),
				info: infoRawData,
				name: 'StoryboardCanvasView'
			}).then(v => {
				this.canvas = v;
				this.canvas.resize({width: this._innerWidth, height: model.cellHeight});
			});
		} else {
			this.canvas.setInfo(infoRawData);
			this.canvas.resize({width: this._innerWidth, height: model.cellHeight});
		}
		this._bone.style.setProperty('--width-pp',  cssUtil.px(model.cellCount * model.cellWidth));
		this._bone.style.setProperty('--height-pp', cssUtil.px(model.cellHeight));
		this._inner.style.height = cssUtil.px(model.cellHeight + 8);
		this._pointer.style.setProperty('--width-pp', cssUtil.px(model.cellWidth));
		this._pointer.style.setProperty('--height-pp', cssUtil.px(model.cellHeight));
	}
	_updateFail() {
		this._view.classList.remove('is-uccess');
		this._view.classList.add('is-fail');
	}
	clear() {
	}
	_onRequestAnimationFrame() {
		if (!this._view || !this._model.isAvailable) {
			return;
		}
		if (this._scrollLeftChanged) {
			this._inner.scrollLeft = this._scrollLeft;
			this._scrollLeftChanged = false;
			this._pointerLeftChanged = true;
		}
		if (this._pointerLeftChanged) {
			this._pointer.style.setProperty('--trans-x-pp', cssUtil.px(this._pointerLeft - this._scrollLeft));
			this._pointerLeftChanged = false;
		}
	}
	setCurrentTime(sec, forceUpdate) {
		const model = this._model;
		if (!this._view || !model.isAvailable) {
			return;
		}
		if (this._currentTime === sec) {
			return;
		}
		this._currentTime = sec;
		const ms = sec * 1000;
		const duration = Math.max(1, model.duration);
		const per = ms / (duration * 1000);
		const width = model.cellWidth;
		const totalWidth = model.cellCount * width;
		const targetLeft = totalWidth * per;
		if (this._pointerLeft !== targetLeft) {
			this._pointerLeft = targetLeft;
			this._pointerLeftChanged = true;
		}
		if (forceUpdate) {
			this.scrollLeft(targetLeft - this._innerWidth * per, true);
		} else {
			if (this.isHover) {
				return;
			}
			this.scrollLeft(targetLeft - this._innerWidth * per);
		}
	}
	get currentTime() {
		return this._currentTime;
	}
	set currentTime(sec) {
		this.setCurrentTime(sec);
	}
	_onScroll() {
	}
	_onStoryboardUpdate() {
		this.update();
	}
	_onStoryboardReset() {
		if (!this._view) {
			return;
		}
		this.close();
		this._view.classList.remove('is-open', 'is-fail');
	}
}
StoryboardView.__tpl__ = `
	<div id="storyboardContainer" class="storyboardContainer">
		<div class="cursorTime"></div>
		<div class="storyboardCanvasContainer"><canvas class="storyboardCanvas" height="90"></canvas></div>
		<div class="storyboardPointer"></div>
		<div class="storyboardInner"><div class="storyboardInner-bone"></div></div>
		<div class="failMessage"></div>
	</div>
	`.trim();
StoryboardView.__css__ = (`
	.storyboardContainer {
		position: absolute;
		top: 0;
		opacity: 0;
		visibility: hidden;
		left: 0;
		right: 0;
		width: 100vw;
		box-sizing: border-box;
		border-top: 2px solid #ccc;
		background: #222;
		z-index: 9005;
		overflow: hidden;
		pointer-events: none;
		will-change: tranform;
		display: none;
		contain: layout paint style;
		user-select: none;
		transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out, visibility 0.2s;
	}
	.storyboardContainer.opening {
		pointer-events: none !important;
	}
	.storyboardContainer.is-success {
		display: block;
		opacity: 0;
	}
	.storyboardContainer * {
		box-sizing: border-box;
	}
	.is-wheelSeeking .storyboardContainer.is-success,
	.is-dragging .storyboardContainer.is-success,
	.storyboardContainer.is-success.is-open {
		z-index: 50;
		opacity: 1;
		transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
		visibility: visible;
		pointer-events: auto;
		transform: translate3d(0, -100%, 0) translateY(10px);
	}
	.is-wheelSeeking .storyboardContainer,
	.is-dragging     .storyboardContainer {
		pointer-events: none;
	}
	.is-fullscreen .is-wheelSeeking .storyboardContainer,
	.is-fullscreen .is-dragging     .storyboardContainer,
	.is-fullscreen                  .storyboardContainer.is-open {
		position: fixed;
		top: calc(100% - 10px);
	}
	.storyboardCanvasContainer {
		position: absolute;
		pointer-events: none;
		width: 100vw;
		z-index: 90;
		contain: layout size style;
	}
	.storyboardCanvas {
		width: 100%;
		height: 100%;
	}
	.storyboardContainer .storyboardInner {
		display: none;
		overflow: hidden;
		background: rgba(32, 32, 32, 0.5);
		margin: 0;
		contain: strict;
		width: 100vw;
		will-change: transform;
		overscroll-behavior: contain;
		padding-bottom: 8px;
	}
	.storyboardContainer.is-success .storyboardInner {
		display: block;
	}
	.storyboardInner-bone {
		contain: strict;
		pointer-events: none;
		width:  var(--width-pp);
		height: var(--height-pp);
		visibility: hidden;
	}
	.storyboardContainer .cursorTime {
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 9010;
		background: #ffc;
		pointer-events: none;
		padding: 0;
		transform: translate3d(var(--trans-x-pp), 30px, 0) translate(-50%, -100%);
	}
	.storyboardContainer:hover .cursorTime {
		transition: --trans-x-pp 0.1s ease-out;
		display: block;
	}
	.storyboardContainer:active  .cursorTime,
	.storyboardContainer.opening .cursorTime {
		display: none;
	}
	.storyboardPointer {
		position: absolute;
		top: 0;
		z-index: 100;
		pointer-events: none;
		--width-pp: 160px;
		--height-pp: 90px;
		--trans-x-pp: -100%;
		width: var(--width-pp);
		height: var(--height-pp);
		transform: translate3d(calc( var(--trans-x-pp) - var(--width-pp) / 2), 0, 0);
		transition: --trans-x-pp 0.1s linear;
		background: #ff9;
		opacity: 0.5;
	}
	.storyboardContainer:hover .storyboardPointer {
		transition: --trans-x-pp 0.4s ease-out;
	}
		`).trim();
class SeekBarThumbnail {
	constructor(params) {
		this._container = params.container;
		this._scale = _.isNumber(params.scale) ? params.scale : 1.0;
		this._currentTime = 0;
		params.storyboard.on('reset', this._onStoryboardReset.bind(this));
		params.storyboard.on('update', this._onStoryboardUpdate.bind(this));
		global.debug.seekBarThumbnail = this;
	}
	_onStoryboardUpdate(model) {
		this._model = model;
		if (!model.isAvailable) {
			this.isAvailable = false;
			this.hide();
			return;
		}
		this.thumbnail ? this.thumbnail.setInfo(model.rawData) : this.initializeView(model);
		this.isAvailable = true;
		this.show();
	}
	_onStoryboardReset() {
		this.hide();
	}
	get isVisible() {
		return this._view ? this._view.classList.contains('is-visible') : false;
	}
	show() {
		if (!this._view) {
			return;
		}
		this._view.classList.add('is-visible');
	}
	hide() {
		if (!this._view) {
			return;
		}
		this._view.classList.remove('is-visible');
	}
	initializeView(model) {
		this.initializeView = _.noop;
		if (!SeekBarThumbnail.styleAdded) {
			css.addStyle(SeekBarThumbnail.__css__);
			SeekBarThumbnail.styleAdded = true;
		}
		const view = this._view = uQuery.html(SeekBarThumbnail.__tpl__)[0];
		StoryboardWorker.createThumbnail({
			container: view.querySelector('.zenzaSeekThumbnail-image'),
			canvas: view.querySelector('.zenzaSeekThumbnail-thumbnail'),
			info: model.rawData,
			name: 'StoryboardThumbnail'
		}).then(thumbnail => {
			this.thumbnail = thumbnail;
			thumbnail.currentTime = this._currentTime;
		});
		if (this._container) {
			this._container.append(view);
		}
	}
	set currentTime(sec) {
		this._currentTime = sec;
		if (!this.isAvailable || !this.thumbnail) {
			return;
		}
		this.thumbnail.currentTime = sec;
	}
}
SeekBarThumbnail.BASE_WIDTH = 160;
SeekBarThumbnail.BASE_HEIGHT = 90;
SeekBarThumbnail.__tpl__ = (`
	<div class="zenzaSeekThumbnail">
		<div class="zenzaSeekThumbnail-image"><canvas width="320" height="180" class="zenzaSeekThumbnail-thumbnail"></canvas></div>
	</div>
`).trim();
SeekBarThumbnail.__css__ = (`
	.is-error .zenzaSeekThumbnail,
	.is-loading .zenzaSeekThumbnail {
		display: none !important;
	}
	.zenzaSeekThumbnail {
		display: none;
		pointer-events: none;
	}
	.zenzaSeekThumbnail-image {
		width: 160px;
		height: 90px;
		opacity: 0.8;
		margin: auto;
		background: #999;
	}
	.zenzaSeekThumbnail-thumbnail {
		width: 100%;
		height: 100%;
	}
	.enableCommentPreview .zenzaSeekThumbnail {
		width: 100%;
		height: 100%;
		display: none !important;
	}
	.zenzaSeekThumbnail.is-visible {
		display: block;
		overflow: hidden;
		box-sizing: border-box;
		background: rgba(0, 0, 0, 0.3);
		margin: 0 auto 4px;
		z-index: 100;
	}
	/*.zenzaSeekThumbnail-image {
		background: none repeat scroll 0 0 #999;
		border: 0;
		margin: auto;
		transform-origin: center top;
		transition: background-position 0.1s steps(1, start) 0;
		opacity: 0.8;
	}*/
`).trim();
const StoryboardWorker = (() => {
	const func = function(self) {
		const SCROLL_BAR_WIDTH = 8;
		const BLANK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVQoU2NkYGD4z4AHMI4MBQCFZAgB+jxHYAAAAABJRU5ErkJggg==';
		let BLANK_IMG;
		const items = {};
		const getCanvas = (width, height) => {
			if (self.OffscreenCanvas) {
				return new OffscreenCanvas(width, height);
			}
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			return canvas;
		};
		const a2d = (arrayBuffer, type = 'image/jpeg') => {
			return new Promise((ok, ng) => {
				const reader = new FileReader();
				reader.onload = () => ok(reader.result);
				reader.onerror = ng;
				reader.readAsDataURL(new Blob([arrayBuffer], {type}));
			});
		};
		const loadImage = async src => {
			try {
				if (self.createImageBitmap) {
					return createImageBitmap(
						src instanceof ArrayBuffer ?
							new Blob([src], {type: 'image/jpeg'}) :
							(await fetch(src).then(r => r.blob()))
						);
				} else {
					const img = new Image();
					img.src = src instanceof ArrayBuffer ? (await a2d(src)) : src;
					await img.decode();
					return img;
				}
			} catch(e) {
				console.warn('load image fail', e);
				return BLANK_IMG;
			}
		};
		loadImage(BLANK_SRC).then(img => BLANK_IMG = img);
		const ImageCacheMap = new class {
			constructor() {
				this.map = new Map();
			}
			async get(src) {
				let cache = this.map.get(src);
				if (!cache) {
					cache = {
						ref: 0,
						image: await loadImage(src)
					};
				}
				cache.ref++;
				cache.updated = Date.now();
				this.map.set(src, cache);
				this.gc();
				return cache.image;
			}
			release(src) {
				const cache = this.map.get(src);
				if (!cache) {
					return;
				}
				cache.ref--;
				if (cache.ref <= 0) {
					cache.image.close && cache.image.close();
					this.map.delete(src);
				}
			}
			async gc() {
				const MAX = 8;
				const map = this.map;
				if (map.size < MAX) {
					return;
				}
				const sorted = [...map].sort((a, b) => a[1].updated - b[1].updated);
				while (map.size >= MAX) {
					const [src] = sorted.shift();
					const cache = map.get(src);
					cache && cache.image && cache.image.close && cache.image.close();
					map.delete(src);
				}
			}
		};
		class StoryboardInfoModel {
			static get blankData() {
				return {
					format: 'dmc',
					status: 'fail',
					duration: 1,
					storyboard: [{
						id: 1,
						urls: ['https://example.com'],
						thumbnail: {
							width: 160,
							height: 90,
							number: 1,
							interval: 1000
						},
						board: {
							rows: 1,
							cols: 1,
							number: 1
						}
					}]
				};
			}
			constructor(rawData) {
				this.update(rawData);
			}
			update(rawData) {
				if (!rawData || rawData.status !== 'ok') {
					this._rawData = this.constructor.blankData;
				} else {
					this._rawData = rawData;
				}
				this.primary = this._rawData.storyboard[0];
				return this;
			}
			get rawData() {
				return this._rawData || this.constructor.blankData;
			}
			get isAvailable() {return this._rawData.status === 'ok';}
			get hasSubStoryboard() { return false; }
			get status() {return this._rawData.status;}
			get message() {return this._rawData.message;}
			get duration() {return this._rawData.duration * 1;}
			get isDmc() {return this._rawData.format === 'dmc';}
			get url() {
				return this.isDmc ? this.primary.urls[0] : this.primary.url;
			}
			get imageUrls() {
				return [...Array(this.pageCount)].map((a, i) => this.getPageUrl(i));
			}
			get cellWidth() { return this.primary.thumbnail.width * 1; }
			get cellHeight() { return this.primary.thumbnail.height * 1; }
			get cellIntervalMs() { return this.primary.thumbnail.interval * 1; }
			get cellCount() {
				return Math.max(
					Math.ceil(this.duration / Math.max(0.01, this.cellIntervalMs)),
					this.primary.thumbnail.number * 1
				);
			}
			get rows() { return this.primary.board.rows * 1; }
			get cols() { return this.primary.board.cols * 1; }
			get pageCount() { return this.primary.board.number * 1; }
			get totalRows() { return Math.ceil(this.cellCount / this.cols); }
			get pageWidth() { return this.cellWidth * this.cols; }
			get pageHeight() { return this.cellHeight * this.rows; }
			get countPerPage() { return this.rows * this.cols; }
			getPageUrl(page) {
				if (!this.isDmc) {
					page = Math.max(0, Math.min(this.pageCount - 1, page));
					return `${this.url}&board=${page + 1}`;
				} else {
					return this.primary.urls[page];
				}
			}
			getIndex(ms) {
				let v = Math.floor(ms / 1000);
				v = Math.max(0, Math.min(this.duration, v));
				const n = this.cellCount / Math.max(1, this.duration);
				return parseInt(Math.floor(v * n), 10);
			}
			getPageIndex(thumbnailIndex) {
				const perPage = this.countPerPage;
				const pageIndex = parseInt(thumbnailIndex / perPage, 10);
				return Math.max(0, Math.min(this.pageCount, pageIndex));
			}
			getThumbnailPosition(ms) {
				const index = this.getIndex(ms);
				const page = this.getPageIndex(index);
				const mod = index % this.countPerPage;
				const row = Math.floor(mod / Math.max(1, this.cols));
				const col = mod % this.rows;
				return {
					page,
					url: this.getPageUrl(page),
					index,
					row,
					col
				};
			}
		}
		class BoardView {
			constructor({canvas, info, name}) {
				this.canvas = canvas;
				this.name = name;
				this._currentTime = -1;
				this._scrollLeft = 0;
				this._info = null;
				this.lastPos = {};
				this.ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
				this.bufferCanvas = getCanvas(canvas.width, canvas.height);
				this.bufferCtx = this.bufferCanvas.getContext('2d', {alpha: false, desynchronized: true});
				this.images = ImageCacheMap;
				this.totalWidth = 0;
				this.isReady = false;
				this.boards = [];
				this.cls();
				info && this.setInfo(info);
			}
			get info() { return this._info; }
			set info(infoRawData) { this.setInfo(infoRawData); }
			async setInfo(infoRawData) {
				this.isReady = false;
				this.info ? this._info.update(infoRawData) : (this._info = new StoryboardInfoModel(infoRawData));
				const info = this.info;
				if (!info.isAvailable) {
					return this.cls();
				}
				const cols = info.cols;
				const rows = info.rows;
				const pageWidth  = info.pageWidth;
				const boardWidth = pageWidth * rows;
				const cellWidth  = info.cellWidth;
				const cellHeight = info.cellHeight;
				this.height = cellHeight;
				this.totalWidth = info.cellCount * info.cellWidth;
				this.boards = (await Promise.all(this._info.imageUrls.map(async (url, idx) => {
					const image = await this.images.get(url);
					const boards = [];
					for (let row = 0; row < rows; row++) {
						const canvas = getCanvas(pageWidth, cellHeight);
						const ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
						ctx.beginPath();
						const sy = row * cellHeight;
						ctx.drawImage(image,
							0, sy, pageWidth, cellHeight,
							0,  0, pageWidth, cellHeight
						);
						ctx.strokeStyle = 'rgb(128, 128, 128)';
						ctx.shadowColor = 'rgb(192, 192, 192)';
						ctx.shadowOffsetX = -1;
						for (let col = 0; col < cols; col++) {
							const x = col * cellWidth;
							ctx.strokeRect(x, 1, cellWidth - 1 , cellHeight + 2);
						}
						boards.push({
							image: canvas, //.transferToImageBitmap(), // ImageBitmapじゃないほうが速い？気のせい？
							left:  idx * boardWidth + row * pageWidth,
							right: idx * boardWidth + row * pageWidth + pageWidth,
							width: pageWidth
						});
					}
					this.images.release(url);
					return boards;
				}))).flat();
				this.height = info.cellHeight;
				this._currentTime = -1;
				this.cls();
				this.isReady = true;
			}
			get scrollLeft() {
				return this._scrollLeft;
			}
			set scrollLeft(left) {
				if (!this.info || !this.info.isAvailable || !this.isReady) {
					return;
				}
				const width =  this.width;
				const height = this.height;
				const totalWidth = this.totalWidth;
				left = Math.max(-width / 2, Math.min(totalWidth - width / 2, left));
				const right = left + width;
				const isOutrange = (left < 0 || left > totalWidth - width);
				const bctx = this.bufferCtx;
				bctx.beginPath();
				if (isOutrange) {
					bctx.fillStyle = 'rgb(32, 32, 32)';
					bctx.fillRect(0, 0, width, height);
				}
				for (const board of this.boards) {
					if (
						(left <= board.left  && board.left <= right) ||
						(left <= board.right && board.right <= right) ||
						(board.left <= left  && right <= board.right)
					) {
						const dx = board.left - left;
						bctx.drawImage(board.image,
							0,  0, board.width, height,
							dx, 0, board.width, height
						);
					}
				}
				const scrollBarLength = width / totalWidth * width;
				if (scrollBarLength < width) {
					const scrollBarLeft = left / totalWidth * width;
					bctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
					bctx.fillRect(scrollBarLeft, height - SCROLL_BAR_WIDTH, scrollBarLength, SCROLL_BAR_WIDTH);
				}
				if (this.bufferCanvas.transferToImageBitmap && this.canvas.transferFromImageBitmap) {
					this.canvas.transferFromImageBitmap(this.bufferCanvas.transferToImageBitmap());
				} else {
					this.ctx.beginPath();
					this.ctx.drawImage(this.bufferCanvas,
						0, 0, width, height,
						0, 0, width, height
					);
					this.ctx.commit && this.ctx.commit();
				}
			}
			cls() {
				this.bufferCtx.clearRect(0, 0, this.width, this.height);
				this.ctx.clearRect(0, 0, this.width, this.height);
			}
			get currentTime() {
				const center = this._scrollLeft + this.width / 2;
				return this.duration * (center / this.totalWidth);
			}
			set currentTime(time) { this.setCurrentTime(time); }
			get width() {return this.canvas.width;}
			get height() {return this.canvas.height;}
			set width(width) {
				this.canvas.width = width;
				this.bufferCanvas.width = width;
			}
			set height(height) {
				this.canvas.height = height;
				this.bufferCanvas.height = height;
			}
			async setCurrentTime(time) {
				const r = time / Math.max(this.info.duration, 1);
				const left = this.totalWidth * r - this.width / 2;
				this.scrollLeft = left;
			}
			resize({width, height}) {
				width && (this.width = width);
				height && (this.height = height);
				this.cls();
			}
		}
		class ThumbnailView {
			constructor({canvas, info, name}) {
				this.canvas = canvas;
				this.name = name;
				this._currentTime = -1;
				this._info = new StoryboardInfoModel(info);
				this.lastPos = {};
				this.ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
				this.images = ImageCacheMap;
				this.cls();
			}
			get info() { return this._info; }
			set info(info) {
				this.info && this.info.imageUrls.forEach(url => this.images.release(url));
				this._info.update(info);
				this._currentTime = -1;
				this.cls();
			}
			cls() {
				this.ctx.clearRect(0, 0, this.width, this.height);
			}
			get currentTime() { return this.currentTime; }
			set currentTime(time) { this.setCurrentTime(time); }
			get width() {return this.canvas.width;}
			get height() {return this.canvas.height;}
			set width(width) {this.canvas.width = width;}
			set height(height) {this.canvas.height = height;}
			async setCurrentTime(time) {
				time > this.info.duration && (time = this.info.duration);
				time < 0 && (time = 0);
				if (this._currentTime === time) {
					return;
				}
				const pos = this.info.getThumbnailPosition(time * 1000);
				if (Object.keys(pos).every(key => pos[key] === this.lastPos[key])) { return; }
				this.lastPos = pos;
				this._currentTime = time;
				const {url, row, col} = pos;
				const width = this.info.cellWidth;
				const height = this.info.cellHeight;
				const image = await this.images.get(url);
				const imageLeft = col * width;
				const imageTop = row * height;
				const scale = Math.min(this.width / width, this.height / height);
				this.cls();
				this.ctx.drawImage(
					image,
					imageLeft, imageTop, width, height,
					(this.width  - width * scale) / 2,
					(this.height - height * scale) / 2,
					width * scale, height * scale
				);
			}
			resize({width, height}) {
				this.width = width;
				this.height = height;
				this.cls();
			}
			dispose() {
				this.info && this.info.imageUrls.forEach(url => this.images.release(url));
				this.info = null;
			}
		}
		const getId = function() {return `Storyboard-${this.id++}`;}.bind({id: 0});
		const createView = ({canvas, info, name}, type = 'thumbnail') => {
			const id = getId();
			const view = type === 'thumbnail' ?
				new ThumbnailView({canvas, info, name}) :
				new BoardView({canvas, info, name});
			items[id] = view;
			return {status: 'ok', id};
		};
		const info = ({id, info}) => {
			const item = items[id];
			if (!item) { throw new Error(`unknown id:${id}`); }
			item.info = info;
			return {status: 'ok'};
		};
		const currentTime = ({id, currentTime}) => {
			const item = items[id];
			if (!item) { throw new Error(`unknown id:${id}`); }
			item.setCurrentTime(currentTime);
			return {status: 'ok'};
		};
		const scrollLeft = ({id, scrollLeft}) => {
			const item = items[id];
			if (!item) { throw new Error(`unknown id:${id}`); }
			item.scrollLeft = scrollLeft;
			return {status: 'ok'};
		};
		const resize = (params) => {
			const item = items[params.id];
			if (!item) { throw new Error(`unknown id:${params.id}`); }
			item.resize(params);
			return {status: 'ok'};
		};
		const cls = (params) => {
			const item = items[params.id];
			if (!item) { throw new Error(`unknown id:${params.id}`); }
			item.cls();
			return {status: 'ok'};
		};
		const dispose = ({id}) => {
			const item = items[id];
			if (!item) { return; }
			item.dispose();
			delete items[id];
			return {status: 'ok'};
		};
		self.onmessage = async ({command, params}) => {
			switch (command) {
				case 'createThumbnail':
					return createView(params, 'thumbnail');
				case 'createBoard':
					return createView(params, 'board');
				case 'info':
					return info(params);
				case 'currentTime':
					return currentTime(params);
				case 'scrollLeft':
					return scrollLeft(params);
				case 'resize':
					return resize(params);
				case 'cls':
					return cls(params);
				case 'dispose':
					return dispose(params);
			}
		};
	};
	const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;
	const NAME = 'StoryboardWorker';
	let worker;
	const initWorker = async () => {
		if (worker) { return worker; }
		if (!isOffscreenCanvasAvailable) {
			if (!worker) {
				worker = {
					name: NAME,
					onmessage: () => {},
					post: ({command, params}) => worker.onmessage({command, params})
				};
				func(worker);
			}
		} else {
			worker = worker || workerUtil.createCrossMessageWorker(func, {name: NAME});
		}
		return worker;
	};
	const createView = async ({container, canvas, info, ratio, name, style}, type = 'thumbnail') => {
		style = style || {};
		ratio = ratio || window.devicePixelRatio || 1;
		name = name || 'Storyboard';
		if (!canvas) {
			canvas = document.createElement('canvas');
			Object.assign(canvas.style, {
				width: '100%',
				height: '100%'
			});
			container && container.append(canvas);
			style.widthPx &&  (canvas.width = Math.max(style.widthPx));
			style.heightPx && (canvas.height = Math.max(style.heightPx));
		}
		canvas.dataset.name = name;
		const worker = await initWorker();
		const layer = isOffscreenCanvasAvailable ? canvas.transferControlToOffscreen() : canvas;
		const init = await worker.post(
			{command:
				type === 'thumbnail' ? 'createThumbnail' : 'createBoard',
				params: {canvas: layer, info, style, name}},
			{transfer: [layer]}
		);
		const id = init.id;
		let currentTime = -1, scrollLeft = -1;
		const result = {
			container,
			canvas,
			setInfo(info) {
				currentTime = -1;
				scrollLeft = -1;
				return worker.post({command: 'info', params: {id, info}});
			},
			resize({width, height}) {
				scrollLeft = -1;
				return worker.post({command: 'resize', params: {id, width, height}});
			},
			get scrollLeft() {
				return scrollLeft;
			},
			set scrollLeft(left) {
				if (scrollLeft === left) { return; }
				scrollLeft = left;
				worker.post({command: 'scrollLeft', params: {id, scrollLeft}});
			},
			get currentTime() {
				return currentTime;
			},
			set currentTime(time) {
				if (currentTime === time) { return; }
				currentTime = time;
				worker.post({command: 'currentTime', params: {id, currentTime}});
			},
			dispose() {
				worker.post({command: 'dispose', params: {id}});
			}
		};
		return result;
	};
	return {
		initWorker,
		createThumbnail: args => createView(args, 'thumbnail'),
		createBoard:     args => createView(args, 'board')
	};
})();
class Storyboard extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	initialize(params) {
		this._playerConfig = params.playerConfig;
		this._container = params.container;
		this._loader = params.loader || StoryboardInfoLoader;
		this._model = new StoryboardInfoModel({});
		global.debug.storyboard = this;
	}
	_initializeStoryboard() {
		this._initializeStoryboard = _.noop;
		if (!this._view) {
			this._view = new StoryboardView({
				model: this._model,
				container: this._container,
				enable: this._playerConfig.props.enableStoryboardBar
			});
		}
		this.emitResolve('dom-ready');
	}
	reset() {
		if (!this._model) { return; }
		this._container.classList.remove('storyboardAvailable');
		this._model.reset();
		this.emit('reset', this._model);
	}
	onVideoCanPlay(watchId, videoInfo) {
		if (!nicoUtil.isPremium()) {
			return;
		}
		if (!this._playerConfig.props.enableStoryboard) {
			return;
		}
		this._watchId = watchId;
		const resuestId = this._requestId =  Math.random();
		StoryboardInfoLoader.load(videoInfo)
			.then(async (info) => {
				await this.promise('dom-ready');
				return info;
			})
			.then(this._onStoryboardInfoLoad.bind(this, resuestId))
			.catch(this._onStoryboardInfoLoadFail.bind(this, resuestId));
		this._initializeStoryboard();
	}
	_onStoryboardInfoLoad(resuestId, rawData) {
		if (resuestId !== this._requestId) {return;} // video changed
		this._model.update(rawData);
		this.emit('update', this._model);
		this._container.classList.toggle('storyboardAvailable', this._model.isAvailable);
	}
	_onStoryboardInfoLoadFail(resuestId, err) {
		console.warn('onStoryboardInfoFail',this._watchId, err);
		if (resuestId !== this._requestId) {return;} // video changed
		this._model.update(null);
		this.emit('update', this._model);
		this._container.classList.remove('storyboardAvailable');
	}
	setCurrentTime(sec, forceUpdate) {
		if (this._view && this._model.isAvailable) {
			this._view.setCurrentTime(sec, forceUpdate);
		}
	}
	set currentTime(sec) {
		this.setCurrentTime(sec);
	}
	toggle() {
		if (!this._view) { return; }
		this._view.toggle();
		this._playerConfig.props.enableStoryboardBar = this._view.isEnable;
	}
}

	class VideoControlBar extends Emitter {
		constructor(...args) {
			super();
			this.initialize(...args);
		}
		initialize(params) {
			this._playerConfig        = params.playerConfig;
			this._$playerContainer    = params.$playerContainer;
			this._playerState         = params.playerState;
			this._currentTimeGetter   = params.currentTimeGetter;
			const player = this._player = params.player;
			player.on('open',           this._onPlayerOpen.bind(this));
			player.on('canPlay',        this._onPlayerCanPlay.bind(this));
			player.on('durationChange', this._onPlayerDurationChange.bind(this));
			player.on('close',          this._onPlayerClose.bind(this));
			player.on('progress',       this._onPlayerProgress.bind(this));
			player.on('loadVideoInfo',  this._onLoadVideoInfo.bind(this));
			player.on('commentParsed',  _.debounce(this._onCommentParsed.bind(this), 500));
			player.on('commentChange',  _.debounce(this._onCommentChange.bind(this), 100));
			this._isWheelSeeking = false;
			this._initializeDom();
			this._initializePlaybackRateSelectMenu();
			this._initializeVolumeControl();
			this._initializeVideoServerTypeSelectMenu();
			this._isFirstVideoInitialized = false;
			global.debug.videoControlBar = this;
		}
		_initializeDom() {
			const $view = this._$view = util.$.html(VideoControlBar.__tpl__);
			const $container = this._$playerContainer;
			const config = this._playerConfig;
			this._view = $view[0];
			const mq = $view.mapQuery({
				_seekBarContainer: '.seekBarContainer',
				_seekBar: '.seekBar',
				_currentTime: '.currentTime',
				_duration: '.duration',
				_playbackRateMenu: '.playbackRateMenu',
				_playbackRateSelectMenu: '.playbackRateSelectMenu',
				_videoServerTypeMenu: '.videoServerTypeMenu',
				_videoServerTypeSelectMenu: '.videoServerTypeSelectMenu',
				_resumePointer: 'zenza-seekbar-label',
				_bufferRange: '.bufferRange',
				_seekRange: '.seekRange',
				_seekBarPointer: '.seekBarPointer'
			});
			Object.assign(this, mq.e, {_currentTime: 0});
			Object.assign(this, mq.$);
			util.$(this._seekRange).on('input', this._onSeekRangeInput.bind(this));
			this._pointer = new SmoothSeekBarPointer({
				pointer: this._seekBarPointer,
				playerState: this._playerState
			});
			const timeStyle = {
				widthPx: 44,
				heightPx: 18,
				fontFamily: '\'Yu Gothic\', \'YuGothic\', \'Courier New\', Osaka-mono, \'ＭＳ ゴシック\', monospace',
				fontWeight: '',
				fontSizePx: 12,
				color: '#fff'
			};
			TextLabel.create({
				container: $view.find('.currentTimeLabel')[0],
				name: 'currentTimeLabel',
				text: '00:00',
				style: timeStyle
			}).then(label => this.currentTimeLabel = label);
			TextLabel.create({
				container: $view.find('.durationLabel')[0],
				name: 'durationLabel',
				text: '00:00',
				style: timeStyle
			}).then(label => this.durationLabel = label);
			this._$seekBar
				.on('mousedown', this._onSeekBarMouseDown.bind(this))
				.on('mousemove', this._onSeekBarMouseMove.bind(this));
			$view
				.on('click', this._onClick.bind(this))
				.on('command', this._onCommandEvent.bind(this));
			HeatMapWorker.init({container: this._seekBar}).then(hm => this._heatMap = hm);
			const updateHeatMapVisibility =
				v => this._$seekBarContainer.toggleClass('noHeatMap', !v);
			updateHeatMapVisibility(this._playerConfig.props.enableHeatMap);
			this._playerConfig.onkey('enableHeatMap', updateHeatMapVisibility);
			global.emitter.on('heatMapUpdate', heatMap => {
				WatchInfoCacheDb.put(this._player.watchId, {heatMap});
			});
			this._storyboard = new Storyboard({
				playerConfig: config,
				player: this._player,
				container: $view[0]
			});
			this._seekBarToolTip = new SeekBarToolTip({
				$container: this._$seekBarContainer,
				storyboard: this._storyboard
			});
			this._commentPreview = new CommentPreview({
				$container: this._$seekBarContainer
			});
			const updateEnableCommentPreview = v => {
				this._$seekBarContainer.toggleClass('enableCommentPreview', v);
				this._commentPreview.mode = v ? 'list' : 'hover';
			};
			updateEnableCommentPreview(config.props.enableCommentPreview);
			config.onkey('enableCommentPreview', updateEnableCommentPreview);
			const watchElement = $container[0].closest('#zenzaVideoPlayerDialog');
			this._wheelSeeker = new WheelSeeker({
				parentNode: $view[0],
				watchElement
			});
			watchElement.addEventListener('mousedown', e => {
				if (['A', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
					return;
				}
				if (e.buttons !== 3 && !(e.button === 0 && e.shiftKey)) {
					return;
				}
				if (e.buttons === 3) {
					watchElement.addEventListener('contextmenu', e => {
						window.console.log('contextmenu', e);
						e.preventDefault();
						e.stopPropagation();
					}, {once: true, capture: true});
				}
				this._onSeekBarMouseDown(e);
			});
			global.emitter.on('hideHover', () => {
				this._hideMenu();
				this._commentPreview.hide();
			});
			$container.append($view);
			this._width = window.innerWidth;
		}
		_initializePlaybackRateSelectMenu() {
			const config = this._playerConfig;
			const $btn  = this._$playbackRateMenu;
			const [label] = $btn.find('.controlButtonInner');
			const $menu = this._$playbackRateSelectMenu;
			const $rates = $menu.find('.playbackRate');
			const updatePlaybackRate = rate => {
				label.textContent = `x${rate}`;
				$menu.find('.selected').removeClass('selected');
				let fr = Math.floor( parseFloat(rate, 10) * 100) / 100;
				$rates.forEach(item => {
					let r = parseFloat(item.dataset.param, 10);
					if (fr === r) {
						item.classList.add('selected');
					}
				});
				this._pointer.playbackRate = rate;
			};
			updatePlaybackRate(config.props.playbackRate);
			config.onkey('playbackRate', updatePlaybackRate);
		}
		_initializeVolumeControl() {
			const $vol = this._$view.find('zenza-range-bar input[type="range"]');
			const [vol] = $vol;
			const setVolumeBar = this._setVolumeBar = v => (vol.view || vol).value = v;
			$vol.on('input', e => util.dispatchCommand(e.target, 'volume', e.target.value));
			setVolumeBar(this._playerConfig.props.volume);
			this._playerConfig.onkey('volume', setVolumeBar);
		}
		_initializeVideoServerTypeSelectMenu() {
			const config = this._playerConfig;
			const $button = this._$videoServerTypeMenu;
			const $select  = this._$videoServerTypeSelectMenu;
			const $current = $select.find('.currentVideoQuality');
			const updateSmileVideoQuality = value => {
				const $dq = $select.find('.smileVideoQuality');
				$dq.removeClass('selected');
				$select.find('.select-smile-' + (value === 'eco' ? 'economy' : 'default')).addClass('selected');
			};
			const updateDmcVideoQuality = value => {
				const $dq = $select.find('.dmcVideoQuality');
				$dq.removeClass('selected');
				$select.find('.select-dmc-' + value).addClass('selected');
			};
			const onVideoServerType = (type, videoSessionInfo) => {
				$button.removeClass('is-smile-playing is-dmc-playing')
					.addClass(`is-${type === 'dmc' ? 'dmc' : 'smile'}-playing`);
				$select.find('.serverType').removeClass('selected');
				$select.find(`.select-server-${type === 'dmc' ? 'dmc' : 'smile'}`).addClass('selected');
				$current.text(type !== 'dmc' ? '----' : videoSessionInfo.videoFormat.replace(/^.*h264_/, ''));
			};
			updateSmileVideoQuality(config.props.smileVideoQuality);
			updateDmcVideoQuality(config.props.dmcVideoQuality);
			config.onkey('forceEconomy',    updateSmileVideoQuality);
			config.onkey('dmcVideoQuality', updateDmcVideoQuality);
			this._player.on('videoServerType', onVideoServerType);
		}
		_onCommandEvent(e) {
			const command = e.detail.command;
			switch (command) {
				case 'toggleStoryboard':
					this._storyboard.toggle();
					break;
				case 'wheelSeek-start':
					window.console.log('start-seek-start');
					this._isWheelSeeking = true;
					this._wheelSeeker.currentTime = this._player.currentTime;
					this._view.classList.add('is-wheelSeeking');
					break;
				case 'wheelSeek-end':
					window.console.log('start-seek-end');
					this._isWheelSeeking = false;
					this._view.classList.remove('is-wheelSeeking');
					break;
				case 'wheelSeek':
					this._onWheelSeek(e.detail.param);
					break;
				default:
					return;
			}
			e.stopPropagation();
		}
		_onClick(e) {
			e.preventDefault();
			const target = e.target.closest('[data-command]');
			if (!target) {
				return;
			}
			let {command, param, type} = target.dataset;
			if (param && (type === 'bool' || type === 'json')) {
				param = JSON.parse(param);
			}
			switch (command) {
				case 'toggleStoryboard':
					this._storyboard.toggle();
					break;
				default:
					util.dispatchCommand(target, command, param);
					break;
			}
			e.stopPropagation();
		}
		_posToTime(pos) {
			const width = this._innerWidth = this._innerWidth || window.innerWidth;
			return this._duration * (pos / Math.max(width, 1));
		}
		_timeToPos(time) {
			return this._width * (time / Math.max(this._duration, 1));
		}
		_timeToPer(time) {
			return (time / Math.max(this._duration, 1)) * 100;
		}
		_onPlayerOpen() {
			this._startTimer();
			this.duration = 0;
			this.currentTime = 0;
			this._heatMap && this._heatMap.reset();
			this._storyboard.reset();
			this.resetBufferedRange();
		}
		_onPlayerCanPlay(watchId, videoInfo) {
			const duration = this._player.duration;
			this.duration = duration;
			this._storyboard.onVideoCanPlay(watchId, videoInfo);
			this._heatMap && (this._heatMap.duration = duration);
		}
		_onCommentParsed() {
			this._chatList = this._player.chatList;
			this._heatMap && (this._heatMap.chatList = this._chatList);
			this._commentPreview.chatList = this._chatList;
		}
		_onCommentChange() {
			this._chatList = this._player.chatList;
			this._heatMap && (this._heatMap.chatList = this._chatList);
			this._commentPreview.chatList = this._chatList;
		}
		_onPlayerDurationChange() {
			this._pointer.duration = this._playerState.videoInfo.duration;
			this._wheelSeeker.duration = this._playerState.videoInfo.duration;
			this._heatMap && (this._heatMap.chatList = this._chatList);
		}
		_onPlayerClose() {
			this._stopTimer();
		}
		_onPlayerProgress(range, currentTime) {
			this.setBufferedRange(range, currentTime);
		}
		_startTimer() {
			this._timerCount = 0;
			this._raf = this._raf || new RequestAnimationFrame(this._onTimer.bind(this));
			this._raf.enable();
		}
		_stopTimer() {
			this._raf && this._raf.disable();
		}
		_onSeekRangeInput(e) {
			const sec = e.target.value * 1;
			const left = sec / (e.target.max * 1) * this._width;
			util.dispatchCommand(e.target, 'seek', sec);
			this._seekBarToolTip.update(sec, left);
			this._storyboard.setCurrentTime(sec, true);
		}
		_onSeekBarMouseDown(e) {
			e.stopPropagation();
			this._beginMouseDrag(e);
		}
		_onSeekBarMouseMove(e) {
			if (!this._isDragging) {
				e.stopPropagation();
			}
			let left = e.offsetX;
			let sec = this._posToTime(left);
			this._seekBarMouseX = left;
			this._commentPreview.currentTime = sec;
			this._commentPreview.update(left);
			this._seekBarToolTip.update(sec, left);
		}
		_onWheelSeek(sec) {
			if (!this._isWheelSeeking) {
				return;
			}
			sec = sec * 1;
			const dur = this._duration;
			const left = sec / dur * window.innerWidth;
			this._seekBarMouseX = left;
			this._commentPreview.currentTime = sec;
			this._commentPreview.update(left);
			this._seekBarToolTip.update(sec, left);
			this._storyboard.setCurrentTime(sec, true);
		}
		_beginMouseDrag() {
			this._bindDragEvent();
			this._$view.addClass('is-dragging');
			this._isDragging = true;
		}
		_endMouseDrag() {
			this._unbindDragEvent();
			this._$view.removeClass('is-dragging');
			this._isDragging = false;
		}
		_onBodyMouseUp(e) {
			if ((e.button === 0 && e.shiftKey)) {
				return;
			}
			this._endMouseDrag();
		}
		_onWindowBlur() {
			this._endMouseDrag();
		}
		_bindDragEvent() {
			util.$('body')
				.on('mouseup.ZenzaWatchSeekBar', this._onBodyMouseUp.bind(this));
			util.$(window).on('blur.ZenzaWatchSeekBar', this._onWindowBlur.bind(this), {once: true});
		}
		_unbindDragEvent() {
			util.$('body')
				.off('mouseup.ZenzaWatchSeekBar');
			util.$(window).off('blur.ZenzaWatchSeekBar');
		}
		_onTimer() {
			this._timerCount++;
			const player = this._player;
			const currentTime = this._isWheelSeeking ?
				this._wheelSeeker.currentTime : player.currentTime;
			if (this._timerCount % 6 === 0) {
				this.currentTime = currentTime;
			}
			this._storyboard.currentTime = currentTime;
		}
		_onLoadVideoInfo(videoInfo) {
			this.duration = videoInfo.duration;
			if (!this._isFirstVideoInitialized) {
				this._isFirstVideoInitialized = true;
				const handler = (command, param) => this.emit('command', command, param);
				global.emitter.emitAsync('videoControBar.addonMenuReady',
					this._$view[0].querySelector('.controlItemContainer.left .scalingUI'), handler
				);
				global.emitter.emitAsync('seekBar.addonMenuReady',
					this._$view[0].querySelector('.seekBar'), handler
				);
			}
			this._resumePointer.setAttribute('duration', videoInfo.duration);
			this._resumePointer.setAttribute('time', videoInfo.initialPlaybackTime);
		}
		get currentTime() {
			return this._currentTime;
		}
		setCurrentTime(sec) {
			this.currentTime = sec;
		}
		set currentTime(sec) {
			if (this._currentTime === sec) { return; }
			this._currentTime = sec;
			const currentTimeText = util.secToTime(sec);
			if (this._currentTimeText !== currentTimeText) {
				this._currentTimeText = currentTimeText;
				this.currentTimeLabel && (this.currentTimeLabel.text = currentTimeText);
			}
			this._pointer.currentTime = sec;
		}
		get duration() {
			return this._duration;
		}
		set duration(sec) {
			if (sec === this._duration) { return; }
			this._duration = sec;
			this._pointer.currentTime = -1;
			this._pointer.duration = sec;
			this._wheelSeeker.duration = sec;
			this._seekRange.max = sec;
			if (sec === 0 || isNaN(sec)) {
				this.durationLabel && (this.durationLabel.text = '--:--');
			} else {
				this.durationLabel && (this.durationLabel.text = util.secToTime(sec));
			}
			this.emit('durationChange');
		}
		setBufferedRange(range, currentTime) {
			const bufferRange = this._bufferRange;
			if (!range || !range.length || !this._duration) {
				return;
			}
			for (let i = 0, len = range.length; i < len; i++) {
				try {
					const start = range.start(i);
					const end   = range.end(i);
					const width = end - start;
					if (start <= currentTime && end >= currentTime) {
						if (this._bufferStart !== start ||
								this._bufferEnd   !== end) {
							const perLeft = (this._timeToPer(start) - 1);
							const scaleX = (this._timeToPer(width) + 2) / 100;
							bufferRange.style.setProperty('--buffer-range-left', cssUtil.percent(perLeft));
							bufferRange.style.setProperty('--buffer-range-scale', scaleX);
							this._bufferStart = start;
							this._bufferEnd   = end;
						}
						break;
					}
				} catch (e) {}
			}
		}
		resetBufferedRange() {
			this._bufferStart = 0;
			this._bufferEnd = 0;
			this._bufferRange.style.setProperty('--buffer-range-scale', 0);
		}
		_hideMenu() {
			document.body.focus();
		}
	}
	VideoControlBar.BASE_HEIGHT = CONSTANT.CONTROL_BAR_HEIGHT;
	VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;
util.addStyle(`
	.videoControlBar {
		position: fixed;
		bottom: 0;
		left: 0;
		transform: translate3d(0, 0, 0);
		width: 100vw;
		height: var(--zenza-control-bar-height, ${VideoControlBar.BASE_HEIGHT}px);
		z-index: 150000;
		background: #000;
		transition: opacity 0.3s ease, transform 0.3s ease;
		user-select: none;
		contain: layout;
	}
	.videoControlBar * {
		box-sizing: border-box;
		user-select: none;
	}
	.videoControlBar.is-wheelSeeking {
		pointer-events: none;
	}
	.controlItemContainer {
		position: absolute;
		top: 10px;
		height: 40px;
		z-index: 200;
	}
	.controlItemContainer:hover,
	.controlItemContainer:focus-within,
	.videoControlBar.is-menuOpen .controlItemContainer {
		z-index: 260;
	}
	.controlItemContainer.left {
		left: 0;
		height: 40px;
		white-space: nowrap;
		overflow: visible;
		transition: transform 0.2s ease, left 0.2s ease;
	}
	.controlItemContainer.left .scalingUI {
		padding: 0 8px 0;
	}
	.controlItemContainer.left .scalingUI:empty {
		display: none;
	}
	.controlItemContainer.left .scalingUI>* {
		background: #222;
		display: inline-block;
	}
	.controlItemContainer.center {
		left: 50%;
		height: 40px;
		transform: translate(-50%, 0);
		background:
			linear-gradient(to bottom,
			transparent, transparent 4px, #222 0, #222 30px, transparent 0, transparent);
		white-space: nowrap;
		overflow: visible;
		transition: transform 0.2s ease, left 0.2s ease;
	}
	.controlItemContainer.center .scalingUI {
		transform-origin: top center;
	}
	.controlItemContainer.center .scalingUI > div{
		display: flex;
		align-items: center;
		height: 32px;
	}
	.controlItemContainer.right {
		right: 0;
	}
	.is-mouseMoving .controlItemContainer.right .controlButton{
		background: #333;
	}
	.controlItemContainer.right .scalingUI {
		transform-origin: top right;
	}
	.controlButton {
		position: relative;
		display: inline-block;
		transition: opacity 0.4s ease;
		font-size: 20px;
		width: 32px;
		height: 32px;
		line-height: 30px;
		box-sizing: border-box;
		text-align: center;
		cursor: pointer;
		color: #fff;
		opacity: 0.8;
		min-width: 32px;
		vertical-align: middle;
		outline: none;
	}
	.controlButton:hover {
		cursor: pointer;
		opacity: 1;
	}
	.controlButton:active .controlButtonInner {
		transform: translate(0, 2px);
	}
	.is-abort   .playControl,
	.is-error   .playControl,
	.is-loading .playControl {
		opacity: 0.4 !important;
		pointer-events: none;
	}
	.controlButton .tooltip {
		display: none;
		pointer-events: none;
		position: absolute;
		left: 16px;
		top: -30px;
		transform:  translate(-50%, 0);
		font-size: 12px;
		line-height: 16px;
		padding: 2px 4px;
		border: 1px solid #000;
		background: #ffc;
		color: #000;
		text-shadow: none;
		white-space: nowrap;
		z-index: 100;
		opacity: 0.8;
	}
	.is-mouseMoving .controlButton:hover .tooltip {
		display: block;
		opacity: 1;
	}
	.videoControlBar:hover .controlButton {
		opacity: 1;
		pointer-events: auto;
	}
	.videoControlBar .controlButton:focus-within {
		pointer-events: none;
	}
	.videoControlBar .controlButton:focus-within .zenzaPopupMenu,
	.videoControlBar .controlButton              .zenzaPopupMenu:hover {
		pointer-events: auto;
		visibility: visible;
		opacity: 0.99;
		pointer-events: auto;
		transition: opacity 0.3s;
	}
	.videoControlBar .controlButton:focus-within .tooltip {
		display: none;
	}
	.settingPanelSwitch {
		width: 32px;
	}
	.settingPanelSwitch:hover {
		text-shadow: 0 0 8px #ff9;
	}
	.settingPanelSwitch .tooltip {
		left: 0;
	}
	.videoControlBar .zenzaSubMenu {
		left: 50%;
		transform: translate(-50%, 0);
		bottom: 44px;
		white-space: nowrap;
	}
	.videoControlBar .triangle {
		transform: translate(-50%, 0) rotate(-45deg);
		bottom: -8.5px;
		left: 50%;
	}
	.videoControlBar .zenzaSubMenu::after {
		content: '';
		position: absolute;
		display: block;
		width: 110%;
		height: 16px;
		left: -5%;
	}
	.controlButtonInner {
		display: inline-block;
	}
	.seekTop {
		left: 0px;
		width: 32px;
		transform: scale(1.1);
	}
	.togglePlay {
		width: 36px;
		transition: transform 0.2s ease;
		transform: scale(1.1);
	}
	.togglePlay:active {
		transform: scale(0.75);
	}
	.togglePlay .play,
	.togglePlay .pause {
		display: inline-block;
		position: absolute;
		top: 50%;
		left: 50%;
		transition: transform 0.1s linear, opacity 0.1s linear;
		user-select: none;
		pointer-events: none;
	}
	.togglePlay .play {
		width: 100%;
		height: 100%;
		transform: scale(1.2) translate(-50%, -50%) translate(10%, 10%);
	}
	.is-playing .togglePlay .play {
		opacity: 0;
	}
	.togglePlay>.pause {
		width: 24px;
		height: 16px;
		background-image: linear-gradient(
			to right,
			transparent 0, transparent 12.5%,
			currentColor 0, currentColor 43.75%,
			transparent 0, transparent 56.25%,
			currentColor 0, currentColor 87.5%,
			transparent 0);
		opacity: 0;
		transform: scaleX(0);
	}
	.is-playing .togglePlay>.pause {
		opacity: 1;
		transform: translate(-50%, -50%);
	}
	.seekBarContainer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		cursor: pointer;
		z-index: 250;
	}
	/* 見えないマウス判定 */
	.seekBarContainer .seekBarShadow {
		position: absolute;
		background: transparent;
		opacity: 0;
		width: 100vw;
		height: 8px;
		top: -8px;
	}
	.is-mouseMoving .seekBarContainer:hover .seekBarShadow {
		height: 48px;
		top: -48px;
	}
	.is-abort   .seekBarContainer,
	.is-loading .seekBarContainer,
	.is-error   .seekBarContainer {
		pointer-events: none;
	}
	.is-abort   .seekBarContainer *,
	.is-error   .seekBarContainer * {
		display: none;
	}
	.seekBar {
		position: relative;
		width: 100%;
		height: 10px;
		margin: 2px 0 2px;
		border-top:    1px solid #333;
		border-bottom: 1px solid #333;
		cursor: pointer;
		transition: height 0.2s ease 1s, margin-top 0.2s ease 1s;
	}
	.seekBar:hover {
		height: 24px;
		/* このmargin-topは見えないマウスオーバー判定を含む */
		margin-top: -14px;
		transition: none;
		background-color: rgba(0, 0, 0, 0.5);
	}
	.seekBarContainer .seekBar * {
		pointer-events: none;
	}
	.bufferRange {
		position: absolute;
		--buffer-range-left: 0;
		--buffer-range-scale: 0;
		width: 100%;
		height: 110%;
		left: 0px;
		top: 0px;
		box-shadow: 0 0 6px #ff9 inset, 0 0 4px #ff9;
		z-index: 190;
		background: #ff9;
		transform-origin: left;
		transform:
			translateX(var(--buffer-range-left))
			scaleX(var(--buffer-range-scale));
		transition: transform 0.2s;
		mix-blend-mode: overlay;
		will-change: transform, opacity;
		opacity: 0.6;
	}
	.is-youTube .bufferRange {
		width: 100% !important;
		height: 110% !important;
		background: #f99;
		transition: transform 0.5s ease 1s;
		transform: translate3d(0, 0, 0) scaleX(1) !important;
	}
	.seekBarPointer {
		--width-pp: 12px;
		--trans-x-pp: 0;
		position: absolute;
		display: inline-block;
		top: 50%;
		left: 0;
		width: var(--width-pp);
		background: rgba(255, 255, 255, 0.7);
		height: calc(100% + 2px);
		z-index: 200;
		box-shadow: 0 0 4px #ffc inset;
		pointer-events: none;
		transform: translate(calc(var(--trans-x-pp) - var(--width-pp) / 2), -50%);
		will-change: transform;
		mix-blend-mode: lighten;
	}
	.is-loading .seekBarPointer {
		display: none !important;
	}
	.is-dragging .seekBarPointer.is-notSmooth {
		transition: none;
	}
	.is-dragging .seekBarPointer::after,
	.is-wheelSeeking .seekBarPointer::after {
		content: '';
		position: absolute;
		width: 36px;
		height: 36px;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		border-radius: 100%;
		box-shadow: 0 0 8px #ffc inset, 0 0 8px #ffc;
		pointer-events: none;
	}
	.seekBarContainer .seekBar .seekRange {
		-webkit-appearance: none;
		position: absolute;
		width: 100vw;
		height: 100%;
		cursor: pointer;
		opacity: 0;
		pointer-events: auto;
	}
	.seekRange::-webkit-slider-thumb {
		-webkit-appearance: none;
		height: 10px;
		width: 2px;
	}
	.seekRange::-moz-range-thumb {
		height: 10px;
		width: 2px;
	}
	.videoControlBar .videoTime {
		display: inline-flex;
		top: 0;
		padding: 0;
		width: 96px;
		height: 18px;
		line-height: 18px;
		contain: strict;
		color: #fff;
		font-size: 12px;
		white-space: nowrap;
		vertical-align: middle;
		background: rgba(33, 33, 33, 0.5);
		border: 0;
		pointer-events: none;
		user-select: none;
	}
	.videoControlBar .videoTime .currentTimeLabel,
	.videoControlBar .videoTime .currentTime,
	.videoControlBar .videoTime .duration {
		position: relative;
		display: inline-block;
		color: #fff;
		text-align: center;
		background: inherit;
		border: 0;
		width: 44px;
		font-family: 'Yu Gothic', 'YuGothic', 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace;
	}
	.videoControlBar.is-loading .videoTime {
		display: none;
	}
	.seekBarContainer .tooltip {
		position: absolute;
		padding: 1px;
		bottom: 12px;
		left: 0;
		transform: translate(-50%, 0);
		white-space: nowrap;
		font-size: 10px;
		opacity: 0;
		border: 1px solid #000;
		background: #fff;
		color: #000;
		z-index: 150;
	}
	.is-dragging .seekBarContainer .tooltip,
	.seekBarContainer:hover .tooltip {
		opacity: 0.8;
	}
	.resumePointer {
		position: absolute;
		mix-blend-mode: color-dodge;
		top: 0;
		z-index: 200;
	}
	.zenzaHeatMap {
		position: absolute;
		pointer-events: none;
		top: 0; left: 0;
		width: 100%;
		height: 100%;
		transform-origin: 0 0 0;
		will-change: transform;
		opacity: 0.5;
		z-index: 110;
	}
	.noHeatMap .zenzaHeatMap {
		display: none;
	}
	.loopSwitch {
		width:  32px;
		height: 32px;
		line-height: 30px;
		font-size: 20px;
		color: #888;
	}
	.loopSwitch:active {
		font-size: 15px;
	}
	.is-loop .loopSwitch {
		color: var(--enabled-button-color);
	}
	.loopSwitch .controlButtonInner {
		font-family: STIXGeneral;
	}
	.playbackRateMenu {
		bottom: 0;
		width: auto;
		min-width: 40px;
		height:    32px;
		line-height: 30px;
		font-size: 18px;
		white-space: nowrap;
		margin-right: 0;
	}
	.playbackRateSelectMenu {
		width: 180px;
		text-align: left;
		line-height: 20px;
		font-size: 18px !important;
	}
	.playbackRateSelectMenu ul {
		margin: 2px 8px;
	}
	.playbackRateSelectMenu li {
		padding: 3px 4px;
	}
	.screenModeMenu {
		width:  32px;
		height: 32px;
		line-height: 30px;
		font-size: 20px;
	}
	.screenModeMenu:active {
		font-size: 15px;
	}
	.screenModeMenu:focus-within {
		background: #888;
	}
	.screenModeMenu:focus-within .tooltip {
		display: none;
	}
	.screenModeMenu:active {
		font-size: 10px;
	}
	.screenModeSelectMenu {
		width: 148px;
		padding: 2px 4px;
		font-size: 12px;
		line-height: 15px;
	}
	.screenModeSelectMenu ul {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.screenModeSelectMenu ul li {
		display: inline-block;
		text-align: center;
		border: none !important;
		margin: 0 !important;
		padding: 0 !important;
	}
	.screenModeSelectMenu ul li span {
		border: 1px solid #ccc;
		width: 50px;
		margin: 2px 8px;
		padding: 4px 0;
	}
	body[data-screen-mode="3D"]       .screenModeSelectMenu li.mode3D span,
	body[data-screen-mode="sideView"] .screenModeSelectMenu li.sideView span,
	body[data-screen-mode="small"]    .screenModeSelectMenu li.small span,
	body[data-screen-mode="normal"]   .screenModeSelectMenu li.normal span,
	body[data-screen-mode="big"]      .screenModeSelectMenu li.big span,
	body[data-screen-mode="wide"]     .screenModeSelectMenu li.wide span {
		color: #ff9;
		border-color: #ff0;
	}
	.fullscreenControlBarModeMenu {
		display: none;
	}
	.fullscreenControlBarModeMenu .controlButtonInner {
		filter: grayscale(100%);
	}
	.fullscreenControlBarModeMenu:focus-within .controlButtonInner,
	.fullscreenControlBarModeMenu:hover .controlButtonInner {
		filter: grayscale(50%);
	}
					.is-fullscreen  .fullscreenSwitch .controlButtonInner .toFull,
	body:not(.is-fullscreen) .fullscreenSwitch .controlButtonInner .returnFull {
		display: none;
	}
	.videoControlBar .muteSwitch {
		margin-right: 0;
	}
	.videoControlBar .muteSwitch:active {
		font-size: 15px;
	}
	.zenzaPlayerContainer:not(.is-mute) .muteSwitch .mute-on,
														.is-mute  .muteSwitch .mute-off {
		display: none;
	}
	.videoControlBar .volumeControl {
		display: inline-block;
	}
	.videoControlBar .volumeRange {
		width: 64px;
		height: 8px;
		position: relative;
		vertical-align: middle;
		--back-color: #333;
		--fore-color: #ccc;
	}
	.is-mute .videoControlBar .volumeRange  {
		--fore-color: var(--back-color);
		pointer-events: none;
	}
	.prevVideo.playControl,
	.nextVideo.playControl {
		display: none;
	}
	.is-playlistEnable .prevVideo.playControl,
	.is-playlistEnable .nextVideo.playControl {
		display: inline-block;
	}
	.prevVideo,
	.nextVideo {
		font-size: 23px;
	}
	.prevVideo .controlButtonInner {
		transform: scaleX(-1);
	}
	.toggleStoryboard {
		visibility: hidden;
		pointer-events: none;
	}
	.storyboardAvailable .toggleStoryboard {
		visibility: visible;
		pointer-events: auto;
	}
	.zenzaStoryboardOpen .storyboardAvailable .toggleStoryboard {
		color: var(--enabled-button-color);
	}
	.toggleStoryboard .controlButtonInner {
		position: absolute;
		width: 20px;
		height: 20px;
		top: 50%;
		left: 50%;
		border-radius: 75% 16%;
		border: 1px solid;
		transform: translate(-50%, -50%) rotate(45deg);
		pointer-events: none;
		background:
			radial-gradient(
				currentColor,
				currentColor 6px,
				transparent 0
			);
	}
	.toggleStoryboard:active .controlButtonInner {
		transform: translate(-50%, -50%) scaleY(0.1) rotate(45deg);
	}
	.toggleStoryboard:active {
		transform: scale(0.75);
	}
	.videoServerTypeMenu {
		bottom: 0;
		min-width: 40px;
		height:    32px;
		line-height: 30px;
		font-size: 16px;
		white-space: nowrap;
	}
	.videoServerTypeMenu.is-dmc-playing  {
		text-shadow:
			0px 0px 8px var(--enabled-button-color),
			0px 0px 6px var(--enabled-button-color),
			0px 0px 4px var(--enabled-button-color),
			0px 0px 2px var(--enabled-button-color);
	}
	.is-mouseMoving .videoServerTypeMenu.is-dmc-playing {
		background: #336;
	}
	.is-youTube .videoServerTypeMenu {
		text-shadow:
			0px 0px 8px #fc9, 0px 0px 6px #fc9, 0px 0px 4px #fc9, 0px 0px 2px #fc9 !important;
	}
	.is-youTube .videoServerTypeMenu:not(.forYouTube),
	.videoServerTypeMenu.forYouTube {
		display: none;
	}
	.is-youTube .videoServerTypeMenu.forYouTube {
		display: inline-block;
	}
	.videoServerTypeMenu:active {
		font-size: 13px;
	}
	.videoServerTypeMenu:focus-within {
		background: #888;
	}
	.videoServerTypeMenu:focus-within .tooltip {
		display: none;
	}
	.videoServerTypeSelectMenu  {
		bottom: 44px;
		left: 50%;
		transform: translate(-50%, 0);
		width: 180px;
		text-align: left;
		line-height: 20px;
		font-size: 16px !important;
		text-shadow: none !important;
		cursor: default;
	}
	.videoServerTypeSelectMenu ul {
		margin: 2px 8px;
	}
	.videoServerTypeSelectMenu li {
		padding: 3px 4px;
	}
	.videoServerTypeSelectMenu li.selected {
		pointer-events: none;
		text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
	}
	.videoServerTypeSelectMenu .smileVideoQuality,
	.videoServerTypeSelectMenu .dmcVideoQuality {
		font-size: 80%;
		padding-left: 28px;
	}
	.videoServerTypeSelectMenu .currentVideoQuality {
		color: #ccf;
		font-size: 80%;
		text-align: center;
	}
	.videoServerTypeSelectMenu .dmcVideoQuality.selected     span:before,
	.videoServerTypeSelectMenu .smileVideoQuality.selected   span:before {
		left: 22px;
		font-size: 80%;
	}
	.videoServerTypeSelectMenu .currentVideoQuality.selected   span:before {
		display: none;
	}
	/* dmcを使用不能の時はdmc選択とdmc画質選択を薄く */
	.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc,
	.zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality,
	.zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
		opacity: 0.4;
		pointer-events: none;
		text-shadow: none !important;
	}
	.zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
		display: none;
	}
	.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc span:before,
	.zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality       span:before{
		display: none !important;
	}
	.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType {
		pointer-events: none;
	}
	/* dmcを使用している時はsmileの画質選択を薄く */
	.is-dmc-playing .smileVideoQuality {
		display: none;
	}
	/* dmcを選択していない状態ではdmcの画質選択を隠す */
	.is-smile-playing .currentVideoQuality,
	.is-smile-playing .dmcVideoQuality {
		display: none;
	}
	@media screen and (max-width: 768px) {
		.controlItemContainer.center {
			left: 0%;
			transform: translate(0, 0);
		}
	}
	.ZenzaWatchVer {
		display: none;
	}
	.ZenzaWatchVer[data-env="DEV"] {
		display: inline-block;
		color: #999;
		position: absolute;
		right: 0;
		background: transparent !important;
		transform: translate(100%, 0);
		font-size: 12px;
		line-height: 32px;
		pointer-events: none;
	}
	.progressWave {
		display: none;
	}
	.is-stalled .progressWave,
	.is-loading .progressWave {
		display: inline-block;
		position: absolute;
		left: 0;
		top: 1px;
		z-index: 400;
		width: 40%;
		height: calc(100% - 2px);
		background: linear-gradient(
			to right,
			rgba(0,0,0,0),
			${util.toRgba('#ffffcc', 0.3)},
			rgba(0,0,0)
		);
		mix-blend-mode: lighten;
		animation-name: progressWave;
		animation-iteration-count: infinite;
		animation-duration: 4s;
		animation-timing-function: linear;
		animation-delay: -1s;
	}
	@keyframes progressWave {
		0%   { transform: translate3d(-100%, 0, 0) translate3d(-5vw, 0, 0); }
		100% { transform: translate3d(100%, 0, 0) translate3d(150vw, 0, 0); }
	}
	.is-seeking .progressWave {
		display: none;
	}
`, {className: 'videoControlBar'});
util.addStyle(`
	.videoControlBar {
		width: 100% !important; /* 100vwだと縦スクロールバーと被る */
	}
`, {className: 'screenMode for-popup videoControlBar', disabled: true});
util.addStyle(`
	body .videoControlBar {
		position: absolute !important; /* firefoxのバグ対策 */
		opacity: 0;
		background: none;
	}
	.volumeChanging .videoControlBar,
	.is-mouseMoving .videoControlBar {
		opacity: 0.7;
		background: rgba(0, 0, 0, 0.5);
	}
	.showVideoControlBar .videoControlBar {
		opacity: 1 !important;
		background: #000 !important;
	}
	.videoControlBar.is-dragging,
	.videoControlBar:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.9);
	}
	.fullscreenControlBarModeMenu {
		display: inline-block;
	}
	.fullscreenControlBarModeSelectMenu {
		padding: 2px 4px;
		font-size: 12px;
		line-height: 15px;
		font-size: 16px !important;
		text-shadow: none !important;
	}
	.fullscreenControlBarModeSelectMenu ul {
		margin: 2px 8px;
	}
	.fullscreenControlBarModeSelectMenu li {
		padding: 3px 4px;
	}
	.videoServerTypeSelectMenu li.selected {
		pointer-events: none;
		text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
	}
	.fullscreenControlBarModeMenu li:focus-within,
	body[data-fullscreen-control-bar-mode="auto"] .fullscreenControlBarModeMenu [data-param="auto"],
	body[data-fullscreen-control-bar-mode="always-show"] .fullscreenControlBarModeMenu [data-param="always-show"],
	body[data-fullscreen-control-bar-mode="always-hide"] .fullscreenControlBarModeMenu [data-param="always-hide"] {
		color: #ff9;
		outline: none;
	}
`, {className: 'screenMode for-full videoControlBar', disabled: true});
util.addStyle(`
	.screenModeSelectMenu {
		display: none;
	}
	.controlItemContainer.left {
		top: auto;
		transform-origin: top left;
	}
	.seekBarContainer {
		top: auto;
		bottom: 0;
		z-index: 300;
	}
	.seekBarContainer:hover .seekBarShadow {
		height: 14px;
		top: -12px;
	}
	.seekBar {
		margin-top: 0px;
		margin-bottom: -14px;
		height: 24px;
		transition: none;
	}
	.screenModeMenu {
		display: none;
	}
	.controlItemContainer.center {
		top: auto;
	}
	.zenzaStoryboardOpen .controlItemContainer.center {
		background: transparent;
	}
	.zenzaStoryboardOpen .controlItemContainer.center .scalingUI {
		background: rgba(32, 32, 32, 0.5);
	}
	.zenzaStoryboardOpen .controlItemContainer.center .scalingUI:hover {
		background: rgba(32, 32, 32, 0.8);
	}
	.controlItemContainer.right {
		top: auto;
	}
`, {className: 'screenMode for-screen-full videoControlBar', disabled: true});
	VideoControlBar.__tpl__ = (`
		<div class="videoControlBar" data-command="nop">
			<div class="seekBarContainer">
				<div class="seekBarShadow"></div>
				<div class="seekBar">
					<div class="seekBarPointer"></div>
					<div class="bufferRange"></div>
					<div class="progressWave"></div>
					<input type="range" class="seekRange" min="0" step="any">
					<canvas width="200" height="10" class="heatMap zenzaHeatMap"></canvas>
				</div>
				<zenza-seekbar-label class="resumePointer" data-command="seekTo" data-text="ここまで見た">
				</zenza-seekbar-label>
			</div>
			<div class="controlItemContainer left">
				<div class="scalingUI">
					<div class="ZenzaWatchVer" data-env="${ZenzaWatch.env}">ver ${ZenzaWatch.version}${ZenzaWatch.env === 'DEV' ? '(Dev)' : ''}</div>
				</div>
			</div>
			<div class="controlItemContainer center">
				<div class="scalingUI">
					<div class="seekBarContainer-mainControl">
						<div class="prevVideo controlButton playControl" data-command="playPreviousVideo" data-param="0">
							<div class="controlButtonInner">&#x27A0;</div>
							<div class="tooltip">前の動画</div>
						</div>
						<div class="toggleStoryboard controlButton playControl forPremium" data-command="toggleStoryboard">
							<div class="controlButtonInner"></div>
							<div class="tooltip">シーンサーチ</div>
						</div>
						<div class="loopSwitch controlButton playControl" data-command="toggle-loop">
							<div class="controlButtonInner">&#8635;</div>
							<div class="tooltip">リピート</div>
						</div>
						<div class="seekTop controlButton playControl" data-command="seek" data-param="0">
							<div class="controlButtonInner">&#8676;</div>
							<div class="tooltip">先頭</div>
						</div>
						<div class="togglePlay controlButton playControl" data-command="togglePlay">
							<span class="pause"></span>
							<span class="play">▶</span>
						</div>
						<div class="playbackRateMenu controlButton" tabindex="-1" data-has-submenu="1">
							<div class="controlButtonInner">x1</div>
							<div class="tooltip">再生速度</div>
							<div class="playbackRateSelectMenu zenzaPopupMenu zenzaSubMenu">
								<div class="triangle"></div>
								<p class="caption">再生速度</p>
								<ul>
									<li class="playbackRate" data-command="playbackRate" data-param="10"><span>10倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="5"  ><span>5倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="4"  ><span>4倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="3"  ><span>3倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="2"  ><span>2倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="1.75"><span>1.75倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="1.5"><span>1.5倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="1.25"><span>1.25倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="1.0"><span>標準速度(x1)</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="0.75"><span>0.75倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="0.5"><span>0.5倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="0.25"><span>0.25倍</span></li>
									<li class="playbackRate" data-command="playbackRate" data-param="0.1"><span>0.1倍</span></li>
								</ul>
							</div>
						</div>
						<div class="videoTime">
							<span class="currentTimeLabel"></span>/<span class="durationLabel"></span>
						</div>
						<div class="muteSwitch controlButton" data-command="toggle-mute">
							<div class="tooltip">ミュート(M)</div>
							<div class="menuButtonInner mute-off">&#x1F50A;</div>
							<div class="menuButtonInner mute-on">&#x1F507;</div>
						</div>
						<div class="volumeControl">
							<zenza-range-bar><input class="volumeRange" type="range" value="0.5" min="0.01" max="1" step="any"></zenza-range-bar>
						</div>
						<div class="nextVideo controlButton playControl" data-command="playNextVideo" data-param="0">
							<div class="controlButtonInner">&#x27A0;</div>
							<div class="tooltip">次の動画</div>
						</div>
					</div>
				</div>
			</div>
			<div class="controlItemContainer right">
				<div class="scalingUI">
					<div class="videoServerTypeMenu controlButton forYouTube" data-command="reload" title="ZenTube解除">
						<div class="controlButtonInner">画</div>
					</div>
					<div class="videoServerTypeMenu controlButton" tabindex="-1" data-has-submenu="1">
						<div class="controlButtonInner">画</div>
						<div class="tooltip">動画サーバー・画質</div>
						<div class="videoServerTypeSelectMenu zenzaPopupMenu zenzaSubMenu">
							<div class="triangle"></div>
							<p class="caption">動画サーバー・画質</p>
							<ul>
								<li class="serverType select-server-dmc" data-command="update-videoServerType" data-param="dmc">
									<span>新システムを使用</span>
									<p class="currentVideoQuality"></p>
								</li>
								<li class="dmcVideoQuality selected select-dmc-auto" data-command="update-dmcVideoQuality" data-param="auto"><span>自動(auto)</span></li>
								<li class="dmcVideoQuality selected select-dmc-veryhigh" data-command="update-dmcVideoQuality" data-param="veryhigh"><span>超(1080) 優先</span></li>
								<li class="dmcVideoQuality selected select-dmc-high" data-command="update-dmcVideoQuality" data-param="high"><span>高(720) 優先</span></li>
								<li class="dmcVideoQuality selected select-dmc-mid"  data-command="update-dmcVideoQuality" data-param="mid"><span>中(480-540)</span></li>
								<li class="dmcVideoQuality selected select-dmc-low"  data-command="update-dmcVideoQuality" data-param="low"><span>低(360)</span></li>
								<li class="serverType select-server-smile" data-command="update-videoServerType" data-param="smile">
									<span>旧システムを使用</span>
								</li>
								<li class="smileVideoQuality select-smile-default" data-command="update-forceEconomy" data-param="false" data-type="bool"><span>自動</span></li>
								<li class="smileVideoQuality select-smile-economy" data-command="update-forceEconomy" data-param="true"  data-type="bool"><span>エコノミー固定</span></li>
						</ul>
						</div>
					</div>
					<div class="screenModeMenu controlButton" tabindex="-1" data-has-submenu="1">
						<div class="tooltip">画面サイズ・モード変更</div>
						<div class="controlButtonInner">&#9114;</div>
						<div class="screenModeSelectMenu zenzaPopupMenu zenzaSubMenu">
							<div class="triangle"></div>
							<p class="caption">画面モード</p>
							<ul>
								<li class="screenMode mode3D"   data-command="screenMode" data-param="3D"><span>3D</span></li>
								<li class="screenMode small"    data-command="screenMode" data-param="small"><span>小</span></li>
								<li class="screenMode sideView" data-command="screenMode" data-param="sideView"><span>横</span></li>
								<li class="screenMode normal"   data-command="screenMode" data-param="normal"><span>中</span></li>
								<li class="screenMode wide"     data-command="screenMode" data-param="wide"><span>WIDE</span></li>
								<li class="screenMode big"      data-command="screenMode" data-param="big"><span>大</span></li>
							</ul>
						</div>
					</div>
					<div class="fullscreenControlBarModeMenu controlButton" tabindex="-1" data-has-submenu="1">
						<div class="tooltip">ツールバーの表示</div>
						<div class="controlButtonInner">&#128204;</div>
						<div class="fullscreenControlBarModeSelectMenu zenzaPopupMenu zenzaSubMenu">
							<div class="triangle"></div>
							<p class="caption">ツールバーの表示</p>
							<ul>
								<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-show"><span>常に固定</span></li>
								<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-hide"><span>常に隠す</span></li>
								<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="auto"><span>画面サイズ自動</span></li>
							</ul>
						</div>
					</div>
					<div class="fullscreenSwitch controlButton" data-command="fullscreen">
						<div class="tooltip">フルスクリーン(F)</div>
						<div class="controlButtonInner">
							<!-- TODO: YouTubeと同じにする -->
							<span class="toFull">&#8690;</span>
							<span class="returnFull">&#8689;</span>
						</div>
					</div>
					<div class="settingPanelSwitch controlButton" data-command="settingPanel">
						<div class="controlButtonInner">&#x2699;</div>
						<div class="tooltip">設定</div>
					</div>
				</div>
			</div>
		</div>
	`).trim();
function HeatMapInitFunc(self) {
class HeatMapModel {
	constructor(params) {
		this.resolution = params.resolution || HeatMapModel.RESOLUTION;
		this.reset();
	}
	reset() {
		this._duration = -1;
		this._chatReady = false;
		this.map = [];
	}
	set duration(duration) {
		if (this._duration === duration) { return; }
		this._duration = duration;
		this.update();
	}
	get duration() {
		return this._duration;
	}
	set chatList(comment) {
		this._chat = comment;
		this._chatReady = true;
		this.update();
	}
	update() {
		if (this._duration < 0 || !this._chatReady) {
			return false;
		}
		const map = this.map = this.getHeatMap();
		return !!map.length;
	}
	getHeatMap() {
		const chatList =
			this._chat.top.concat(this._chat.naka, this._chat.bottom);
		const duration = this._duration;
		if (duration < 1) { return []; }
		const map = new Array(Math.max(Math.min(this.resolution, Math.floor(duration)), 1));
		const length = map.length;
		let i = length;
		while(i > 0) map[--i] = 0;
		const ratio = duration > map.length ? (map.length / duration) : 1;
		for (i = chatList.length - 1; i >= 0; i--) {
			let nicoChat = chatList[i];
			let pos = nicoChat.vpos;
			let mpos = Math.min(Math.floor(pos * ratio / 100), map.length -1);
			map[mpos]++;
		}
		map.length = length;
		return map;
	}
}
HeatMapModel.RESOLUTION = 200;
class HeatMapView {
	constructor(params) {
		this.model  = params.model;
		this.container = params.container;
		this.canvas = params.canvas;
	}
	initializePalette() {
		this._palette = [];
		for (let c = 0; c < 256; c++) {
			const
				r = Math.floor((c > 127) ? (c / 2 + 128) : 0),
				g = Math.floor((c > 127) ? (255 - (c - 128) * 2) : (c * 2)),
				b = Math.floor((c > 127) ? 0 : (255  - c * 2));
			this._palette.push(`rgb(${r}, ${g}, ${b})`);
		}
	}
	initializeCanvas() {
		if (!this.canvas) {
			this.canvas = this.container.querySelector('canvas.heatMap');
		}
		this.context = this.canvas.getContext('2d', {alpha: false, desynchronized: true});
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.reset();
	}
	reset() {
		if (!this.context) { return; }
		this.context.fillStyle = this._palette[0];
		this.context.beginPath();
		this.context.fillRect(0, 0, this.width, this.height);
	}
	async toDataURL() {
		if (!this.canvas) {
			return '';
		}
		const type = 'image/png';
		const canvas = this.canvas;
		try {
			return canvas.toDataURL(type);
		} catch(e) {
			const blob = await new Promise(res => {
				if (canvas.convertToBlob) {
					return res(canvas.convertToBlob({type}));
				}
				this.canvas.toBlob(res, type);
			}).catch(e => null);
			if (!blob) {
				return '';
			}
			return new Promise((ok, ng) => {
				const reader = new FileReader();
				reader.onload = () => { ok(reader.result); };
				reader.onerror = e => ng(e);
				reader.readAsDataURL(blob);
			}).catch(e => '');
		}
	}
	update(map) {
		if (!this._isInitialized) {
			this._isInitialized = true;
			this.initializePalette();
			this.initializeCanvas();
			this.reset();
		}
		map = map || this.model.map;
		if (!map.length) { return false; }
		console.time('draw HeatMap');
		let max = 0, i;
		for (i = Math.max(map.length - 4, 0); i >= 0; i--) max = Math.max(map[i], max);
		if (max > 0) {
			let rate = 255 / max;
			for (i = map.length - 1; i >= 0; i--) {
				map[i] = Math.min(255, Math.floor(map[i] * rate));
			}
		} else {
			console.timeEnd('draw HeatMap');
			return false;
		}
		const
			scale = map.length >= this.width ? 1 : (this.width / Math.max(map.length, 1)),
			blockWidth = (this.width / map.length) * scale,
			context = this.context;
		for (i = map.length - 1; i >= 0; i--) {
			context.fillStyle = this._palette[parseInt(map[i], 10)] || this._palette[0];
			context.beginPath();
			context.fillRect(i * scale, 0, blockWidth, this.height);
		}
		console.timeEnd('draw HeatMap');
		context.commit && context.commit();
		return true;
	}
}
class HeatMap {
	constructor(params) {
		this.model = new HeatMapModel({});
		this.view = new HeatMapView({
			model: this.model,
			container: params.container,
			canvas: params.canvas
		});
		this.reset();
	}
	reset() {
		this.model.reset();
		this.view.reset();
	}
	set duration(duration) {
		if (this.model.duration === duration) { return; }
		this.model.duration = duration;
		this.view.update() && this.toDataURL().then(dataURL => {
			self.emit('heatMapUpdate', {map: this.map, duration: this.duration, dataURL});
		});
	}
	get duration() {
		return this.model.duration;
	}
	set chatList(chatList) {
		this.model.chatList = chatList;
		this.view.update() && this.toDataURL().then(dataURL => {
			self.emit('heatMapUpdate', {map: this.map, duration: this.duration, dataURL});
		});
	}
	get canvas() {
		return this.view.canvas || {};
	}
	get map() {
		return this.model.map;
	}
	async toDataURL() {
		return this.view.toDataURL();
	}
}
	return HeatMap;
} // end of HeatMapInitFunc
const HeatMapWorker = (() => {
	const _func = function(self) {
		const HeatMap = HeatMapInitFunc(self);
		let heatMap;
		const init = ({canvas}) => heatMap = new HeatMap({canvas});
		const update = ({chatList}) => heatMap.chatList = chatList;
		const duration = ({duration}) => heatMap.duration = duration;
		const reset = () => heatMap.reset();
		self.onmessage = async ({command, params}) => {
			let result = {status: 'ok'};
			switch (command) {
				case 'init':
					init(params);
					break;
				case 'update':
					update(params);
					break;
				case 'duration':
					duration(params);
					break;
				case 'reset':
					reset(params);
					break;
				case 'getData':
					result.dataURL  = await heatMap.toDataURL();
					result.map      = heatMap.map;
					result.duration = heatMap.duration;
					break;
			}
			return result;
		};
	};
	const func = `
	function(self) {
		${HeatMapInitFunc.toString()};
		(${_func.toString()})(self);
	}
	`;
	const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;
	let worker;
	const init = async ({container, width, height}) => {
		if (!isOffscreenCanvasAvailable) {
			const HeatMap = HeatMapInitFunc({
				emit: (...args) => global.emitter.emit(...args)
			});
			return new HeatMap({container, width, height});
		}
		worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'HeatMapWorker'});
		const canvas = container.querySelector('canvas.heatMap');
		const layer = canvas.transferControlToOffscreen();
		await worker.post({command: 'init', params: {canvas: layer}}, {transfer: [layer]});
		let _chatList, _duration;
		return {
			canvas,
			update(chatList) {
				chatList = {
					top:    chatList.top.map(c => { return {...c.props, ...{group: null}}; }),
					naka:   chatList.naka.map(c => { return {...c.props, ...{group: null}}; }),
					bottom: chatList.bottom.map(c => { return {...c.props, ...{group: null}}; })
				};
				return worker.post({command: 'update', params: {chatList}});
			},
			get duration() { return _duration; },
			set duration(d) {
				_duration = d;
				worker.post({command: 'duration', params: {duration: d}}); },
			reset: () => worker.post({command: 'reset', params: {}}),
			get chatList() {return _chatList;},
			set chatList(chatList) { this.update(_chatList = chatList); }
		};
	};
	return {init};
})();
const HeatMap = HeatMapInitFunc({
	emit: (...args) => global.emitter.emit(...args)
});
	class CommentPreviewModel extends Emitter {
		reset() {
			this._chatReady = false;
			this._vpos = -1;
			this.emit('reset');
		}
		set chatList(chatList) {
			const list = chatList
				.top
				.concat(chatList.naka, chatList.bottom)
				.sort((a, b) => a.vpos - b.vpos);
			this._chatList = list;
			this._chatReady = true;
			this.update();
		}
		get chatList() {
			return this._chatList || [];
		}
		set currentTime(sec) {
			this.vpos = sec * 100;
		}
		set vpos(vpos) {
			if (this._vpos !== vpos) {
				this._vpos = vpos;
				this.emit('vpos', vpos);
			}
		}
		get currentIndex() {
			if (this._vpos < 0 || !this._chatReady) {
				return -1;
			}
			return this.getVposIndex(this._vpos);
		}
		getVposIndex(vpos) {
			const list = this._chatList;
			if (!list) { return -1; }
			for (let i = list.length - 1; i >= 0; i--) {
				const chat = list[i], cv = chat.vpos;
				if (cv <= vpos - 400) {
					return i + 1;
				}
			}
			return -1;
		}
		get currentChatList() {
			if (this._vpos < 0 || !this._chatReady) {
				return [];
			}
			return this.getItemByVpos(this._vpos);
		}
		getItemByVpos(vpos) {
			const list = this._chatList;
			const result = [];
			for (let i = 0, len = list.length; i < len; i++) {
				const chat = list[i], cv = chat.vpos, diff = vpos - cv;
				if (diff >= -100 && diff <= 400) {
					result.push(chat);
				}
			}
			return result;
		}
		getItemByUniqNo(uniqNo) {
			return this._chatList.find(chat => chat.uniqNo === uniqNo);
		}
		update() {
			this.emit('update');
		}
	}
	class CommentPreviewView {
		constructor(params) {
			const model = this._model = params.model;
			this._$parent = params.$container;
			this._inviewTable = new Map;
			this._chatList = [];
			this._initializeDom(this._$parent);
			model.on('reset',  this._onReset.bind(this));
			model.on('update', _.debounce(this._onUpdate.bind(this), 10));
			model.on('vpos', this._onVpos.bind(this));
			this._mode = 'hover';
			this._left = 0;
			this.update = _.throttle(this.update.bind(this), 200);
			this.applyView = bounce.raf(this.applyView.bind(this));
		}
		_initializeDom($parent) {
			cssUtil.registerProps(
				{name: '--buffer-range-left', syntax: '<percentage>', initialValue: '0%',inherits: false},
				{name: '--buffer-range-scale', syntax: '<number>', initialValue: 0, inherits: false},
			);
			const $view = util.$.html(CommentPreviewView.__tpl__);
			const view = this._view = $view[0];
			this._list = view.querySelector('.listContainer');
			$view.on('click', this._onClick.bind(this))
				.on('wheel', e => e.stopPropagation(), {passive: true})
				.on('scroll',
				_.throttle(this._onScroll.bind(this), 50, {trailing: false}), {passive: true});
			$parent.append($view);
		}
		set mode(v) {
			if (v === 'list') {
				util.StyleSwitcher.update({
					on: '.commentPreview.list', off: '.commentPreview.hover'});
			} else {
				util.StyleSwitcher.update({
					on: '.commentPreview.hover', off: '.commentPreview.list'});
			}
			this._mode = v;
		}
		_onClick(e) {
			e.stopPropagation();
			const target = e.target.closest('[data-command]');
			const view = this._view;
			const command = target ? target.dataset.command : '';
			const nicoChatElement = e.target.closest('.nicoChat');
			const uniqNo = parseInt(nicoChatElement.dataset.nicochatUniqNo, 10);
			const nicoChat  = this._model.getItemByUniqNo(uniqNo);
			if (command && nicoChat) {
				view.classList.add('is-updating');
				window.setTimeout(() => view.classList.remove('is-updating'), 3000);
				switch (command) {
					case 'addUserIdFilter':
						util.dispatchCommand(e.target, command, nicoChat.userId);
						break;
					case 'addWordFilter':
						util.dispatchCommand(e.target, command, nicoChat.text);
						break;
					case 'addCommandFilter':
						util.dispatchCommand(e.target, command, nicoChat.cmd);
						break;
				}
				return;
			}
			const vpos = nicoChatElement.dataset.vpos;
			if (vpos !== undefined) {
				util.dispatchCommand(e.target, 'seek', vpos / 100);
			}
		}
		_onUpdate() {
			this.updateList();
		}
		_onVpos(vpos) {
			const itemHeight = CommentPreviewView.ITEM_HEIGHT;
			const index = this._currentStartIndex = Math.max(0, this._model.currentIndex);
			this._currentEndIndex = Math.max(0, this._model.getVposIndex(vpos + 400));
			this._scrollTop = itemHeight * index;
			this._currentTime = vpos / 100;
			this._refreshInviewElements(this._scrollTop);
		}
		_onResize() {
			this._refreshInviewElements();
		}
		_onScroll() {
			this._scrollTop = -1;
			this._refreshInviewElements();
		}
		_onReset() {
			this._list.textContent = '';
			this._inviewTable.clear();
			this._scrollTop = 0;
			this._newListElements = null;
			this._chatList = [];
		}
		updateList() {
			const chatList = this._chatList = this._model.chatList;
			if (!chatList.length) {
				this._isListUpdated = false;
				return;
			}
			const itemHeight = CommentPreviewView.ITEM_HEIGHT;
			this._list.style.height = `${(chatList.length + 2) * itemHeight}px`;
			this._isListUpdated = false;
		}
		_refreshInviewElements(scrollTop) {
			if (!this._view) { return; }
			const itemHeight = CommentPreviewView.ITEM_HEIGHT;
			scrollTop = _.isNumber(scrollTop) ? scrollTop : this._view.scrollTop;
			const viewHeight = CommentPreviewView.MAX_HEIGHT;
			const viewBottom = scrollTop + viewHeight;
			const chatList = this._chatList;
			if (!chatList || chatList.length < 1) { return; }
			const startIndex =
				this._mode === 'list' ?
					Math.max(0, Math.floor(scrollTop / itemHeight) - 5) :
					this._currentStartIndex;
					const endIndex   =
				this._mode === 'list' ?
					Math.min(chatList.length, Math.floor(viewBottom / itemHeight) + 5) :
					Math.min(this._currentEndIndex, this._currentStartIndex + 15);
			const newItems = [], inviewTable = this._inviewTable;
			for (let i = startIndex; i < endIndex; i++) {
				const chat = chatList[i];
				if (inviewTable.has(i) || !chat) { continue; }
				const listItem = CommentPreviewChatItem.create(chat, i);
				newItems.push(listItem);
				inviewTable.set(i, listItem);
			}
			if (newItems.length < 1) { return; }
			for (const i of inviewTable.keys()) {
				if (i >= startIndex && i <= endIndex) { continue; }
				inviewTable.get(i).remove();
				inviewTable.delete(i);
			}
			this._newListElements = this._newListElements || document.createDocumentFragment();
			this._newListElements.append(...newItems);
			this.applyView();
		}
		get isEmpty() {
			return this._chatList.length < 1;
		}
		update(left) {
			if (this._isListUpdated) {
				this.updateList();
			}
			if (this.isEmpty) {
				return;
			}
			const width = this._mode === 'list' ?
				CommentPreviewView.WIDTH : CommentPreviewView.HOVER_WIDTH;
			const containerWidth = window.innerWidth;
			left = Math.min(Math.max(0, left - CommentPreviewView.WIDTH / 2), containerWidth - width);
			this._left = left;
			this.applyView();
		}
		applyView() {
			const view = this._view;
			const vs = view.style;
			vs.setProperty('--current-time', cssUtil.s(this._currentTime));
			vs.setProperty('--scroll-top', cssUtil.px(this._scrollTop));
			vs.setProperty('--trans-x-pp', cssUtil.px(this._left));
			if (this._newListElements && this._newListElements.childElementCount) {
				this._list.append(this._newListElements);
			}
			if (this._scrollTop > 0 && this._mode === 'list') {
				this._view.scrollTop = this._scrollTop;
				this._scrollTop = -1;
			}
		}
		hide() {
		}
	}
	class CommentPreviewChatItem {
		static get html() {
			return `
			<li class="nicoChat">
				<span class="vposTime"></span>
				<span class="text"></span>
				<span class="addFilter addUserIdFilter"
					data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
				<span class="addFilter addWordFilter"
					data-command="addWordFilter" title="NGワード">NGword</span>
			</li>
			`.trim();
		}
		static get template() {
			if (!this._template) {
				const t = document.createElement('template');
				t.id = `${this.name}_${Date.now()}`;
				t.innerHTML = this.html;
				const content = t.content;
				this._template = {
					clone: () => document.importNode(t.content, true),
					chat: content.querySelector('.nicoChat'),
					time: content.querySelector('.vposTime'),
					text: t.content.querySelector('.text')
				};
			}
			return this._template;
		}
		static create(chat, idx) {
			const itemHeight = CommentPreviewView.ITEM_HEIGHT;
			const text = chat.text;
			const date = (new Date(chat.date * 1000)).toLocaleString();
			const vpos = chat.vpos;
			const no = chat.no;
			const uniqNo = chat.uniqNo;
			const oe = idx % 2 === 0 ? 'even' : 'odd';
			const title = `${no} : 投稿日 ${date}\nID:${chat.userId}\n${text}\n`;
			const color = chat.color || '#fff';
			const shadow = color === '#fff' ? '' : `text-shadow: 0 0 1px ${color};`;
			const vposToTime = vpos => util.secToTime(Math.floor(vpos / 100));
			const t = this.template;
			t.chat.className = `nicoChat fork${chat.fork} ${oe}`;
			t.chat.id = `commentPreviewItem${idx}`;
			t.chat.dataset.vpos = vpos;
			t.chat.dataset.nicochatUniqNo = uniqNo;
			t.time.textContent = `${vposToTime(vpos)}: `;
			t.text.title = title;
			t.text.style = shadow;
			t.text.textContent = text;
			t.chat.style.cssText = `
				top: ${idx * itemHeight}px;
				--duration: ${chat.duration}s;
				--vpos-time: ${chat.vpos / 100}s;
			`;
			return t.clone().firstElementChild;
		}
	}
CommentPreviewView.MAX_HEIGHT = 200;
CommentPreviewView.WIDTH = 350;
CommentPreviewView.HOVER_WIDTH = 180;
CommentPreviewView.ITEM_HEIGHT = 20;
CommentPreviewView.__tpl__ = (`
	<div class="zenzaCommentPreview">
		<div class="listContainer"></div>
	</div>
	`).trim();
util.addStyle(`
	.zenzaCommentPreview {
		display: none;
		position: absolute;
		bottom: 16px;
		opacity: 0.8;
		max-height: ${CommentPreviewView.MAX_HEIGHT}px;
		width: ${CommentPreviewView.WIDTH}px;
		box-sizing: border-box;
		color: #ccc;
		overflow: hidden;
		transform: translate(var(--trans-x-pp), 0);
		transition: --trans-x-pp 0.2s;
		will-change: transform;
	}
	.zenzaCommentPreview * {
		box-sizing: border-box;
	}
	.is-wheelSeeking .zenzaCommentPreview,
	.seekBarContainer:hover .zenzaCommentPreview {
		display: block;
	}
`, {className: 'commentPreview'});
util.addStyle(`
	.zenzaCommentPreview {
		border-bottom: 24px solid transparent;
		background: rgba(0, 0, 0, 0.4);
		z-index: 100;
		overflow: auto;
	}
	.zenzaCommentPreview:hover {
		background: black;
	}
	.zenzaCommentPreview.is-updating {
		transition: opacity 0.2s ease;
		opacity: 0.3;
		cursor: wait;
	}
	.zenzaCommentPreview.is-updating * {
		pointer-evnets: none;
	}
	.listContainer {
		bottom: auto;
		padding: 4px;
		pointer-events: none;
	}
	.zenzaCommentPreview:hover .listContainer {
		pointer-events: auto;
	}
	.listContainer .nicoChat {
		position: absolute;
		left: 0;
		display: block;
		width: 100%;
		height: ${CommentPreviewView.ITEM_HEIGHT}px;
		padding: 2px 4px;
		cursor: pointer;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		animation-duration: var(--duration);
		animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
		animation-name: preview-text-inview;
		animation-timing-function: linear;
		animation-play-state: paused !important;
	}
	@keyframes preview-text-inview {
		0% {
			color: #ffc;
		}
		100% {
			color: #ffc;
		}
	}
	.listContainer:hover .nicoChat.odd {
		background: #333;
	}
	.listContainer .nicoChat.fork1 .vposTime {
		color: #6f6;
	}
	.listContainer .nicoChat.fork2 .vposTime {
		color: #66f;
	}
	.listContainer .nicoChat .no,
	.listContainer .nicoChat .date,
	.listContainer .nicoChat .userId {
		display: none;
	}
	.listContainer .nicoChat:hover .no,
	.listContainer .nicoChat:hover .date,
	.listContainer .nicoChat:hover .userId {
		display: inline-block;
		white-space: nowrap;
	}
	.listContainer .nicoChat .text {
		color: inherit !important;
	}
	.listContainer .nicoChat:hover .text {
		color: #fff !important;
	}
	.listContainer .nicoChat .text:hover {
		text-decoration: underline;
	}
	.listContainer .nicoChat .addFilter {
		display: none;
		position: absolute;
		font-size: 10px;
		color: #fff;
		background: #666;
		cursor: pointer;
		top: 0;
	}
	.listContainer .nicoChat:hover .addFilter {
		display: inline-block;
		border: 1px solid #ccc;
		box-shadow: 2px 2px 2px #333;
	}
	.listContainer .nicoChat .addFilter.addUserIdFilter {
		right: 8px;
		width: 48px;
	}
	.listContainer .nicoChat .addFilter.addWordFilter {
		right: 64px;
		width: 48px;
	}
	.listContainer .nicoChat .addFilter:active {
		transform: translateY(2px);
	}
	.zenzaScreenMode_sideView .zenzaCommentPreview,
	.zenzaScreenMode_small .zenzaCommentPreview {
		background: rgba(0, 0, 0, 0.9);
	}
`, {className: 'commentPreview list'});
util.addStyle(`
	.zenzaCommentPreview {
		bottom: 24px;
		box-sizing: border-box;
		height: 140px;
		z-index: 160;
		transition: none;
		color: #fff;
		opacity: 0.6;
		overflow: hidden;
		pointer-events: none;
		user-select: none;
		contain: layout style size paint;
		filter: drop-shadow(0 0 1px #000);
	}
	.listContainer {
		bottom: auto;
		width: 100%;
		height: 100% !important;
		margin: auto;
		border: none;
		contain: layout style size paint;
	}
	.listContainer .nicoChat {
		display: block;
		top: auto !important;
		font-size: 16px;
		line-height: 18px;
		height: 18px;
		white-space: nowrap;
	}
	.listContainer .nicoChat:nth-child(n + 8) {
		transform: translateY(-144px);
	}
	.listContainer .nicoChat:nth-child(n + 16) {
		transform: translateY(-288px);
	}
	.listContainer .nicoChat .text {
		display: inline-block;
		text-shadow: 1px 1px 1px #fff;
		transform: translateX(260px);
		visibility: hidden;
		will-change: transform;
		animation-duration: var(--duration);
		animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
		animation-play-state: paused !important;
		animation-name: preview-text-moving;
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
	.listContainer .nicoChat .vposTime,
	.listContainer .nicoChat .addFilter {
		display: none !important;
	}
	@keyframes preview-text-moving {
		0% {
			visibility: visible;
		}
		100% {
			visibility: hidden;
			transform: translateX(85px) translateX(-100%);
		}
	}
`, {className: 'commentPreview hover', disabled: true});
	class CommentPreview {
		constructor(params) {
			this._model = new CommentPreviewModel({});
			this._view = new CommentPreviewView({
				model:      this._model,
				$container: params.$container
			});
			this.reset();
		}
		reset() {
			this._model.reset();
			this._view.hide();
		}
		set chatList(chatList) {
			this._model.chatList = chatList;
		}
		set currentTime(sec) {
			this._model.currentTime = sec;
		}
		update(left) {
			this._view.update(left);
		}
		hide() {
		}
		set mode(v) {
			if (v === this._mode) { return; }
			this._mode = v;
			this._view.mode = v;
		}
		get mode() {
			return this._mode;
		}
	}
	class SeekBarToolTip {
		constructor(params) {
			this._$container = params.$container;
			this._storyboard = params.storyboard;
			this._initializeDom(params.$container);
			this._boundOnRepeat = this._onRepeat.bind(this);
			this._boundOnMouseUp = this._onMouseUp.bind(this);
		}
		_initializeDom($container) {
			util.addStyle(SeekBarToolTip.__css__);
			const $view = this._$view = util.$.html(SeekBarToolTip.__tpl__);
			this._currentTime = $view.find('.currentTime')[0];
			TextLabel.create({
				container: this._currentTime,
				name: 'currentTimeLabel',
				text: '00:00',
				style: {
					widthPx: 50,
					heightPx: 16,
					fontFamily: 'monospace',
					fontWeight: '',
					fontSizePx: 12,
					color: '#ccc'
				}
			}).then(label => this.currentTimeLabel = label);
			$view
				.on('mousedown',this._onMouseDown.bind(this))
				.on('click', e => { e.stopPropagation(); e.preventDefault(); });
			this._seekBarThumbnail = new SeekBarThumbnail({
				storyboard: this._storyboard,
				container: $view.find('.seekBarThumbnailContainer')[0]
			});
			$container.append($view);
		}
		_onMouseDown(e) {
			e.stopPropagation();
			const target = e.target.closest('[data-command]');
			if (!target) {
				return;
			}
			const {command, param, repeat} = target.dataset;
			if (!command) { return; }
			util.dispatchCommand(e.target, command, param);
			if (repeat === 'on') {
				this._beginRepeat(command, param);
			}
		}
		_onMouseUp(e) {
			e.preventDefault();
			this._endRepeat();
		}
		_beginRepeat(command, param) {
			this._repeatCommand = command;
			this._repeatParam   = param;
			util.$('body')
				.on('mouseup.zenzaSeekbarToolTip', this._boundOnMouseUp);
			this._$view
				.on('mouseleave', this._boundOnMouseUp)
				.on('mouseup', this._boundOnMouseUp);
			if (this._repeatTimer) {
				window.clearInterval(this._repeatTimer);
			}
			this._repeatTimer = window.setInterval(this._boundOnRepeat, 200);
			this._isRepeating = true;
		}
		_endRepeat() {
			this._isRepeating = false;
			if (this._repeatTimer) {
				window.clearInterval(this._repeatTimer);
				this._repeatTimer = null;
			}
			util.$('body').off('mouseup.zenzaSeekbarToolTip');
			this._$view.off('mouseleave').off('mouseup');
		}
		_onRepeat() {
			if (!this._isRepeating) {
				this._endRepeat();
				return;
			}
			util.dispatchCommand(this._$view[0], this._repeatCommand, this._repeatParam);
		}
		update(sec, left) {
			const timeText = util.secToTime(sec);
			if (this._timeText === timeText) { return; }
			this._timeText = timeText;
			this.currentTimeLabel && (this.currentTimeLabel.text = timeText);
			const w  = this.offsetWidth = this.offsetWidth || this._$view[0].offsetWidth;
			const vw = window.innerWidth;
			left = Math.max(0, Math.min(left - w / 2, vw - w));
			this._$view[0].style.setProperty('--trans-x-pp', cssUtil.px(left));
			this._seekBarThumbnail.currentTime = sec;
		}
	}
	SeekBarToolTip.__css__ = (`
		.seekBarToolTip {
			position: absolute;
			display: inline-block;
			visibility: hidden;
			z-index: 300;
			position: absolute;
			box-sizing: border-box;
			bottom: 24px;
			left: 0;
			width: 180px;
			white-space: nowrap;
			font-size: 10px;
			background: rgba(0, 0, 0, 0.3);
			z-index: 150;
			opacity: 0;
			border: 1px solid #666;
			border-radius: 8px;
			padding: 8px 4px 0;
			transform: translate3d(var(--trans-x-pp), 0, 10px);
			transition: --trans-x-pp 0.1s, opacity 0.2s ease 0.5s;
			pointer-events: none;
		}
		.is-wheelSeeking .seekBarToolTip,
		.is-dragging .seekBarToolTip,
		.seekBarContainer:hover  .seekBarToolTip {
			opacity: 1;
			visibility: visible;
		}
		.seekBarToolTipInner {
			padding-bottom: 10px;
			pointer-events: auto;
			display: flex;
			text-align: center;
			vertical-aligm: middle;
			width: 100%;
		}
		.is-wheelSeeking .seekBarToolTipInner,
		.is-dragging .seekBarToolTipInner {
			pointer-events: none;
		}
		.seekBarToolTipInner>* {
			flex: 1;
		}
		.seekBarToolTip .currentTime {
			display: inline-block;
			height: 16px;
			margin: 4px 0;
		}
		.seekBarToolTip .controlButton {
			display: inline-block;
			width: 40px;
			height: 28px;
			line-height: 22px;
			font-size: 20px;
			border-radius: 50%;
			margin: 0;
			cursor: pointer;
		}
		.seekBarToolTip .controlButton * {
			cursor: pointer;
		}
		.seekBarToolTip .controlButton:hover {
			text-shadow: 0 0 8px #fe9;
			box-shdow: 0 0 8px #fe9;
		}
		.seekBarToolTip .controlButton:active {
			font-size: 16px;
		}
		.seekBarToolTip .controlButton.toggleCommentPreview {
			opacity: 0.5;
		}
		.enableCommentPreview .seekBarToolTip .controlButton.toggleCommentPreview {
			opacity: 1;
			background: rgba(0,0,0,0.01);
		}
		.is-fullscreen .seekBarToolTip {
			bottom: 10px;
		}
	`).trim();
	SeekBarToolTip.__tpl__ = (`
		<div class="seekBarToolTip">
			<div class="seekBarThumbnailContainer"></div>
			<div class="seekBarToolTipInner">
				<div class="seekBarToolTipButtonContainer">
					<div class="controlButton backwardSeek" data-command="seekBy" data-param="-5" title="5秒戻る" data-repeat="on">
						<div class="controlButtonInner">⇦</div>
					</div>
					<div class="currentTime"></div>
					<div class="controlButton toggleCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
						<div class="menuButtonInner">💬</div>
					</div>
					<div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む" data-repeat="on">
						<div class="controlButtonInner">⇨</div>
					</div>
				</div>
			</div>
		</div>
	`).trim();
	class SmoothSeekBarPointer {
		constructor(params) {
			this._pointer = params.pointer;
			this._currentTime = 0;
			this._duration = 1;
			this._playbackRate = 1;
			this._isSmoothMode = true;
			this._isPausing = true;
			this._isSeeking = false;
			this._isStalled = false;
			if (!this._pointer.animate && !('registerProperty' in CSS)) {
				this._isSmoothMode = false;
			}
			this._pointer.classList.toggle('is-notSmooth', !this._isSmoothMode);
			params.playerState.onkey('isPausing', v => this.isPausing = v);
			params.playerState.onkey('isSeeking', v => this.isSeeking = v);
			params.playerState.onkey('isStalled', v => this.isStalled = v);
		}
		get currentTime() {
			return this._currentTime;
		}
		set currentTime(v) {
			if (!this._isSmoothMode) {
				const per = Math.min(100, this._timeToPer(v));
				this._pointer.style.setProperty('--trans-x-pp', cssUtil.vw(per));
				return;
			}
			if (document.hidden) { return; }
			if (this._currentTime === v) {
				if (this.isPlaying) {
					this._animation.currentTime = v;
					this.isStalled = true;
					return;
				}
			} else {
				if (this.isStalled) {
					this.isStalled = false;
				}
			}
			this._currentTime = v;
			if (this._animation &&
				Math.abs(v * 1000 - this._animation.currentTime) > 300) {
				this._animation.currentTime = v * 1000;
			}
		}
		_timeToPer(time) {
			return (time / Math.max(this._duration, 1)) * 100;
		}
		set duration(v) {
			if (this._duration === v) { return; }
			this._duration = v;
			this.refresh();
		}
		set playbackRate(v) {
			if (this._playbackRate === v) { return; }
			this._playbackRate = v;
			if (!this._animation) { return; }
			this._animation.playbackRate = v;
		}
		get isPausing() {
			return this._isPausing;
		}
		set isPausing(v) {
			if (this._isPausing === v) { return; }
			this._isPausing = v;
			this._updatePlaying();
		}
		get isSeeking() {
			return this._isSeeking;
		}
		set isSeeking(v) {
			if (this._isSeeking === v) { return; }
			this._isSeeking = v;
			this._updatePlaying();
		}
		get isStalled() {
			return this._isStalled;
		}
		set isStalled(v) {
			if (this._isStalled === v) { return; }
			this._isStalled = v;
			this._updatePlaying();
		}
		get isPlaying() {
			return !this.isPausing && !this.isStalled && !this.isSeeking;
		}
		_updatePlaying() {
			if (!this._animation) { return; }
			if (this.isPlaying) {
				this._animation.play();
			} else {
				this._animation.pause();
			}
		}
		refresh() {
			if (!this._isSmoothMode) { return; }
			if (this._animation) {
				this._animation.finish();
			}
			this._animation = this._pointer.animate([
				{'--trans-x-pp': 0},
				{'--trans-x-pp': cssUtil.vw(100)}
			], {duration: this._duration * 1000, fill: 'backwards'});
			this._animation.currentTime = this._currentTime * 1000;
			this._animation.playbackRate = this._playbackRate;
			if (this.isPlaying) {
				this._animation.play();
			} else {
				this._animation.pause();
			}
		}
	}
	class WheelSeeker extends BaseViewComponent {
		static get template() {
			return `
				<div class="root" style="display: none;">
				</div>
			`;
		}
		constructor(params) {
			super({
				parentNode: params.parentNode,
				name: 'WheelSeeker',
				template: '<div class="WheelSeeker"></div>',
				shadow: WheelSeeker.template
			});
			Object.assign(this._props, {
				watchElement: params.watchElement,
				isActive: false,
				pos: 0,
				ax: 0,
				lastWheelTime: 0,
				duration: 1
			});
			this._bound.onWheel = _.throttle(this.onWheel.bind(this), 50);
			this._bound.onMouseUp = this.onMouseUp.bind(this);
			this._bound.dispatchSeek =this.dispatchSeek.bind(this);
			this._props.watchElement.addEventListener(
				'wheel', this._bound.onWheel, {passive: false});
		}
		_initDom(...args) {
			super._initDom(...args);
			this._elm = Object.assign({}, this._elm, {
				root: this._shadow || this._view,
			});
			this._shadow.addEventListener('contextmenu', e => {
				e.stopPropagation();
				e.preventDefault();
			});
		}
		enable() {
			document.addEventListener(
				'mouseup', this._bound.onMouseUp, {capture: true, once: true});
			this.refresh();
			this.dispatchCommand('wheelSeek-start');
			this._elm.root.style.display = '';
			this._props.isActive = true;
			this._props.ax = 0;
			this._props.lastWheelTime = performance.now();
		}
		disable() {
			document.removeEventListener('mouseup', this._bound.onMouseUp);
			this.dispatchCommand('wheelSeek-end');
			this.dispatchCommand('seek', this.currentTime);
			this._props.isActive = false;
			setTimeout(() => {
				this._elm.root.style.display = 'none';
			}, 300);
		}
		onWheel(e) {
			let {buttons, deltaY} = e;
			if (!deltaY) { return; }
			deltaY = Math.abs(deltaY) >= 100 ? deltaY / 50 : deltaY;
			if (this.isActive) {
				e.preventDefault();
				e.stopPropagation();
				if (!buttons && !e.shiftKey) {
					return this.disable();
				}
				let pos = this._props.pos;
				let ax = this._props.ax;
				const deltaReversed = ax * deltaY < 0 ;//lastDelta * deltaY < 0;
				const now = performance.now();
				const seconds = ((now - this._props.lastWheelTime) / 1000);
				this._props.lastWheelTime = now;
				if (deltaReversed) {
					ax = deltaY > 0 ? 0.5 : -0.5;
				} else {
					ax =
						ax *
						Math.pow(1.15, Math.abs(deltaY)) * // speedup
						Math.pow(0.8, Math.floor(seconds/0.1)) // speeddown
					;
					ax = Math.min(20, Math.abs(ax)) * (ax > 0 ? 1: -1);
					pos += ax; // / 100;
				}
				pos = Math.min(100, Math.max(0, pos));
				this._props.ax = ax;
				this.pos = pos;
				this._bound.dispatchSeek();
			} else if (buttons || e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				this.enable();
				this._props.ax = deltaY > 0 ? 0.5 : -0.5;
			}
		}
		onMouseUp(e) {
			if (!this.isActive) { return; }
			e.preventDefault();
			e.stopPropagation();
			this.disable();
		}
		dispatchSeek() {
			this.dispatchCommand('wheelSeek', this.currentTime);
		}
		refresh() {
		}
		get isActive() {
			return this._props.isActive;
		}
		get duration() {
			return this._props.duration;
		}
		set duration(v) {
			this._props.duration = v;
		}
		get pos() {
			return this._props.pos;
		}
		set pos(v) {
			this._props.pos = v;
			if (this.isActive) {
				this.refresh();
			}
		}
		get currentTime() {
			return this.duration * this.pos / 100;
		}
		set currentTime(v) {
			this.pos = v / this.duration * 100;
		}
	}

function NicoTextParserInitFunc() {
class NicoTextParser {}
NicoTextParser._FONT_REG = {
	/* eslint-disable */
	GOTHIC: /[\uFF67-\uFF9D\uFF9E\uFF65\uFF9F]/,
	MINCHO: /([\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/,
	GULIM: /([\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6])/,
	MING_LIU: /([\uEF00-\uEF1F])/,
	GR: /<group>([^\x01-\x7E^\xA0]*?([\uFF67-\uFF9D\uFF9E\uFF65\uFF9F\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6\uEF00-\uEF1F\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])[^\x01-\x7E^\xA0]*?)<\/group>/g,
	STRONG_MINCHO: /([\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\u2588])/,
	BLOCK: /([\u2581-\u258F\u25E2-\u25E5■]+)/g,
	/* eslint-enable */
};
NicoTextParser.__css__ = (`
body {
	marign: 0;
	padding: 0;
	overflow: hidden;
	pointer-events: none;
	user-select: none;
}
.default {}
.gothic  {font-family: 'ＭＳ Ｐゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo'; }
.mincho  {font-family: Simsun,            "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', 'Hiragino Mincho ProN'; }
.gulim   {font-family: Gulim,             Osaka-mono, "Osaka−等幅",              'ＭＳ ゴシック', 'モトヤLシーダ3等幅'; }
.mingLiu {font-family: PmingLiu, mingLiu, MingLiU, Osaka-mono, "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅'; }
han_group { font-family: 'Arial'; }
/* 参考: https://www65.atwiki.jp/commentart2/pages/16.html */
.cmd-gothic {
	font-weight: 400;
	font-family: "游ゴシック", "Yu Gothic", 'YuGothic', Simsun, "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
.cmd-mincho {
	font-weight: 400;
	font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;
}
.cmd-defont {
	font-family: arial, "ＭＳ Ｐゴシック", "MS PGothic", "MSPGothic", "ヒラギノ角ゴ", "ヒラギノ角ゴシック", "Hiragino Sans", "IPAMonaPGothic", sans-serif, monospace, Menlo;
}
.nicoChat {
	position: absolute;
	letter-spacing: 1px;
	padding: 2px 0 2px;
	margin: 0;
	white-space: nowrap;
	/*font-weight: 600;
	-webkit-font-smoothing: none;
	font-smooth: never;*/
	/* text-rendering: optimizeSpeed; */
	/*font-kerning: none;*/
}
	.nicoChat.big {
		line-height: 45px;
	}
		.nicoChat.big.html5 {
			line-height: ${47.5 -1}px;
		}
		.nicoChat.big.is-lineResized {
			line-height: ${48}px;
		}
	.nicoChat.medium {
		line-height: 29px;
	}
		.nicoChat.medium.html5 {
			line-height: ${(384 - 4) / 13}px;
		}
		.nicoChat.medium.is-lineResized {
			line-height: ${(384 - 4) * 2 / 25 -0.4}px;
		}
	.nicoChat.small {
		line-height: 18px;
	}
		.nicoChat.small.html5 {
			line-height: ${(384 - 4) / 21}px;
		}
		.nicoChat.small.is-lineResized {
			line-height: ${(384 - 4) * 2 / 38}px;
		}
	.arial.type2001 {
		font-family: Arial;
	}
	/* フォント変化のあったグループの下にいるということは、
			半角文字に挟まれていないはずである。
		*/
		.gothic > .type2001 {
			font-family: 'ＭＳ Ｐゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo';
		}
		.mincho > .type2001 {
			font-family: Simsun,            Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace
		}
		.gulim > .type2001 {
			font-family: Gulim,             Osaka-mono,              'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace;
		}
		.mingLiu > .type2001 {
			font-family: PmingLiu, mingLiu, Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace;
		}
/*
.tab_space { opacity: 0; }
.big    .tab_space > spacer { width:  86.55875px;  }
.medium .tab_space > spacer { width:  53.4px;  }
.small  .tab_space > spacer { width:  32.0625px;  }
*/
.tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0 !important; }
.big    .tab_space { letter-spacing: 1.6241em; }
.medium .tab_space { letter-spacing: 1.6252em; }
.small  .tab_space { letter-spacing: 1.5375em; }
.big    .type0020 > spacer { width: 11.8359375px; }
.medium .type0020 > spacer { width: 7.668px; }
.small  .type0020 > spacer { width: 5px; }
/*
.big    .type3000 > spacer { width: 40px; }
.medium .type3000 > spacer { width: 25px; }
.small  .type3000 > spacer { width: 17px; }
*/
/*
.type3000 > spacer::after { content: ' '; }
.mincho > .type3000 > spacer::after, .gulim > .type3000 > spacer::after, .mincho > .type3000 > spacer::after {
	content: '全';
}
*/
.big    .gothic > .type3000 > spacer { width: 26.8984375px; }
.medium .gothic > .type3000 > spacer { width: 16.9375px; }
.small  .gothic > .type3000 > spacer { width: 10.9609375px; }
.big    .type00A0 > spacer { width: 11.8359375px; }
.medium .type00A0 > spacer { width: 7.668px; }
.small  .type00A0 > spacer { width: 5px; }
spacer { display: inline-block; overflow: hidden; margin: 0; padding: 0; height: 8px; vertical-align: middle;}
.mesh_space {
	display: inline-block; overflow: hidden; margin: 0; padding: 0; letter-spacing: 0;
	vertical-align: middle; font-weight: normal;
	white-space: nowrap;
}
.big    .mesh_space { width: 40px; }
.medium .mesh_space { width: 26px; }
.small  .mesh_space { width: 18px; }
/*
.fill_space {
	display: inline-block; overflow: hidden; margin: 0; padding: 0; letter-spacing: 0;
						vertical-align: bottom; font-weight: normal;
	white-space: nowrap;
}
.big    .fill_space { width: 40px; height: 40px; }
.medium .fill_space { width: 25px; height: 25px; }
.small  .fill_space { width: 16px; height: 16px; }
*/
.backslash {
	font-family: Arial;
}
/* Mac Chrome バグ対策？ 空白文字がなぜか詰まる これでダメならspacer作戦 */
.invisible_code {
	font-family: gulim;
}
.block_space {
	font-family: Simsun, 'IPAMonaGothic', Gulim, PmingLiu;
}
.html5_tab_space, .html5_space, .html5_zen_space { opacity: 0; }
/*
.nicoChat.small .html5_zen_space > spacer { width: 25.6px; }
								.html5_zen_space > spacer { width: 25.6px; margin: 0; }
.nicoChat.big   .html5_zen_space > spacer { width: 25.6px; }
*/
.html5_zero_width { display: none; }
.no-height {
	line-height: 0 !important;
	opacity: 0;
	display: block;
	visibility: hidden;
	}
/* .line53 {
		display: inline-block;
		line-height: 32px;
	}
	.line100 {
		display: inline-block;
		line-height: 23.5px;
	}*/
	/*.line70 {
		display: inline-block;
		line-height: 27px;
	}*/
	`).trim();
NicoTextParser.likeXP = text => {
	let S = '<spacer> </spacer>';
	let ZS = '<spacer>全</spacer>';
	let htmlText =
		util.escapeHtml(text)
			.replace(/([\x01-\x09\x0B-\x7E\xA0]+)/g, '<han_group>$1</han_group>') // eslint-disable-line
			.replace(/([^\x01-\x7E^\xA0]+)/g, '<group>$1</group>') // eslint-disable-line
			.replace(/([\u0020]+)/g, // '<span class="han_space type0020">$1</span>')
				g => `<span class="han_space type0020">${S.repeat(g.length)}</span>`)
			.replace(/([\u00A0]+)/g, //  '<span class="han_space type00A0">$1</span>')
				g => `<span class="han_space type00A0">${S.repeat(g.length)}</span>`)
			.replace(/(\t+)/g, '<span class="tab_space">$1</span>')
			.replace(/[\t]/g, '^');
	let /* hasFontChanged = false, */ strongFont = 'gothic';
	htmlText =
		htmlText.replace(NicoTextParser._FONT_REG.GR, (all, group, firstChar) => {
			let baseFont = '';
			if (firstChar.match(NicoTextParser._FONT_REG.GOTHIC)) {
				baseFont = 'gothic';
			} else if (firstChar.match(NicoTextParser._FONT_REG.MINCHO)) {
				baseFont = 'mincho';
				if (firstChar.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
					strongFont = 'mincho';
				}
			} else if (firstChar.match(NicoTextParser._FONT_REG.GULIM)) {
				strongFont = baseFont = 'gulim';
			} else {
				strongFont = baseFont = 'mingLiu';
			}
			let tmp = [], closer = [], currentFont = baseFont;
			for (let i = 0, len = group.length; i < len; i++) {
				let c = group.charAt(i);
				if (currentFont !== 'gothic' && c.match(NicoTextParser._FONT_REG.GOTHIC)) {
					tmp.push('<span class="gothic">');
					closer.push('</span>');
					currentFont = 'gothic';
				} else if (currentFont !== 'mincho' && c.match(NicoTextParser._FONT_REG.MINCHO)) {
					tmp.push('<span class="mincho">');
					closer.push('</span>');
					currentFont = 'mincho';
					if (c.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
						strongFont = baseFont = 'mincho';
					}
				} else if (currentFont !== 'gulim' && c.match(NicoTextParser._FONT_REG.GULIM)) {
					tmp.push('<span class="gulim">');
					closer.push('</span>');
					currentFont = strongFont = baseFont = 'gulim';
				} else if (currentFont !== 'mingLiu' && c.match(NicoTextParser._FONT_REG.MING_LIU)) {
					tmp.push('<span class="mingLiu">');
					closer.push('</span>');
					currentFont = strongFont = baseFont = 'mingLiu';
				}
				tmp.push(c);
			}
			let result = [
				'<group class="', baseFont, ' fontChanged">',
				tmp.join(''),
				closer.join(''),
				'</group>'
			].join('');
			return result;
		});
	htmlText =
		htmlText
			.replace(NicoTextParser._FONT_REG.BLOCK, '<span class="block_space">$1</span>')
			.replace(/([\u2588]+)/g, //'<span class="fill_space">$1</span>')
				g => `<span class="fill_space">${'田'.repeat(g.length)}</span>`)
			.replace(/([\u2592])/g, '<span class="mesh_space">$1$1</span>')
			.replace(/([\uE800\u2002-\u200A\u007F\u05C1\u0E3A\u3164]+)/g,
				g => `<span class="invisible_code" data-code="${escape(g)}">${g}</span>`)
			.replace(/(.)[\u0655]/g, '$1<span class="type0655">$1</span>')
			.replace(/([\u115a]+)/g, '<span class="zen_space type115A">$1</span>')
			.replace(/([\u3000]+)/g, //'<span class="zen_space type3000">$1</span>')
				g => `<span class="zen_space type3000">${ZS.repeat(g.length)}</span>`)
			.replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>')
			.replace(/([\u0323\u2029\u202a\u200b\u200c]+)/g, '<span class="zero_space">$1</span>')
			.replace(/([\u2003]+)/g, '<span class="em_space">$1</span>')
			.replace(/\r\n/g, '\n').replace(/([^\n])[\n]$/, '$1') //.replace(/^[\r\n]/, '')
			.replace(/[\n]/g, '<br>')
	;
	htmlText = htmlText.replace(/(.)<group>([\u2001]+)<\/group>(.)/, '$1<group class="zen_space arial type2001">$2</group>$3');
	htmlText = htmlText.replace(/<group>/g, `<group class="${strongFont}">`);
	return htmlText;
};
NicoTextParser.likeHTML5 = text => {
	let htmlText =
		util.escapeHtml(text)
			.replace(/([\x20\xA0]+)/g, g => {
				return `<span class="html5_space" data-text="${encodeURIComponent(g)}">${'&nbsp;'.repeat(g.length)}</span>`;
			})
			.replace(/([\u2000\u2002]+)/g, g => {
				return `<span class="html5_space half" data-text="${encodeURIComponent(g)}">${g}</span>`;
			})
			.replace(/([\u3000\u2001\u2003]+)/g, g => {
				return `<span class="html5_zen_space" data-text="${encodeURIComponent(g)}">${'全'.repeat(g.length)}</span>`;
			})
			.replace(/[\u200B-\u200F]+/g, g => {
				return `<span class="html5_zero_width" data-text="${encodeURIComponent(g)}">${g}</span>`;
			})
			.replace(/([\t]+)/g, g => {
				return '<span class="html5_tab_space">' +
					'丁'.repeat(g.length * 2) + '</span>';
			})
			.replace(NicoTextParser._FONT_REG.BLOCK, '<span class="html5_block_space">$1</span>')
			.replace(/([\u2588]+)/g, g => {
				return '<span class="html5_fill_space u2588">' + //g + '</span>';
						'田'.repeat(g.length) + '</span>';
			})
			.replace(/[\n]/g, '<br>')
	;
	let sp = htmlText.split('<br>');
	if (sp.length >= 101) {
		htmlText = `<span class="line101">${sp.slice(0, 101).join('<br>')}</span><span class="no-height">${sp.slice(101).join('<br>')}</span>`;
	} else if (sp.length >= 70) {
		htmlText = `<span class="line70">${sp.slice(0, 70).join('<br>')}</span><span class="no-height">${sp.slice(70).join('<br>')}</span>`;
	} else if (sp.length >= 53) {
		htmlText = `<span class="line53">${sp.slice(0,53).join('<br>')}</span><span class="no-height">${sp.slice(53).join('<br>')}</span>`;
	}
	return htmlText;
};
return NicoTextParser;
}
const NicoTextParser = NicoTextParserInitFunc();
ZenzaWatch.NicoTextParser = NicoTextParser;
class CommentLayer {
}
CommentLayer.SCREEN = {
	WIDTH_INNER: 512,
	WIDTH_FULL_INNER: 640,
	WIDTH_FULL_INNER_HTML5: 684,
	WIDTH: 512 + 32,
	WIDTH_FULL: 640 + 32,
	OUTER_WIDTH_FULL: (640 + 32) * 1.1,
	HEIGHT: 384
};
CommentLayer.MAX_COMMENT = 10000;
function NicoChatInitFunc() {
class NicoChat {
	static createBlank(options = {}) {
		return Object.assign({
			text: '',
			date: '000000000',
			cmd: '',
			premium: false,
			user_id: '0',
			vpos: 0,
			deleted: '',
			color: '#FFFFFF',
			size: NicoChat.SIZE.MEDIUM,
			type: NicoChat.TYPE.NAKA,
			score: 0,
			no: 0,
			fork: 0,
			isInvisible: false,
			isReverse: false,
			isPatissier: false,
			fontCommand: '',
			commentVer: 'flash',
			currentTime: 0,
			hasDurationSet: false,
			isMine: false,
			isUpdating: false,
			isCA: false,
			thread: 0,
			nicoru: 0,
			opacity: 1
		}, options);
	}
	static create(data, options = {}) {
		return new NicoChat(NicoChat.createBlank(data), options);
	}
	static createFromChatElement(elm, options = {}) {
		const data = {
			text: elm.textContent,
			date: parseInt(elm.getAttribute('date'), 10) || Math.floor(Date.now() / 1000),
			cmd: elm.getAttribute('mail') || '',
			isPremium: elm.getAttribute('premium') === '1',
			userId: elm.getAttribute('user_id'),
			vpos: parseInt(elm.getAttribute('vpos'), 10),
			deleted: elm.getAttribute('deleted') === '1',
			isMine: elm.getAttribute('mine') === '1',
			isUpdating: elm.getAttribute('updating') === '1',
			score: parseInt(elm.getAttribute('score') || '0', 10),
			fork: parseInt(elm.getAttribute('fork') || '0', 10),
			leaf: parseInt(elm.getAttribute('leaf') || '-1', 10),
			no: parseInt(elm.getAttribute('no') || '0', 10),
			thread: parseInt(elm.getAttribute('thread'), 10)
		};
		return new NicoChat(data, options);
	}
	static parseCmd(command, isFork = false, props = {}) {
		const tmp = command.toLowerCase().split(/[\x20\xA0\u3000\t\u2003\s]+/);
		const cmd = {};
		for (const c of tmp) {
			if (NicoChat.COLORS[c]) {
				cmd.COLOR = NicoChat.COLORS[c];
			} else if (NicoChat._COLOR_MATCH.test(c)) {
				cmd.COLOR = c;
			} else if (isFork && NicoChat._CMD_DURATION.test(c)) {
				cmd.duration = RegExp.$1;
			} else {
				cmd[c] = true;
			}
		}
		if (cmd.COLOR) {
			props.color = cmd.COLOR;
			props.hasColorCommand = true;
		}
		if (cmd.big) {
			props.size = NicoChat.SIZE.BIG;
			props.hasSizeCommand = true;
		} else if (cmd.small) {
			props.size = NicoChat.SIZE.SMALL;
			props.hasSizeCommand = true;
		}
		if (cmd.ue) {
			props.type = NicoChat.TYPE.TOP;
			props.duration = NicoChat.DURATION.TOP;
			props.hasTypeCommand = true;
		} else if (cmd.shita) {
			props.type = NicoChat.TYPE.BOTTOM;
			props.duration = NicoChat.DURATION.BOTTOM;
			props.hasTypeCommand = true;
		}
		if (cmd.ender) {
			props.isEnder = true;
		}
		if (cmd.full) {
			props.isFull = true;
		}
		if (cmd.pattisier) {
			props.isPatissier = true;
		}
		if (cmd.ca) {
			props.isCA = true;
		}
		if (cmd.duration) {
			props.hasDurationSet = true;
			props.duration = Math.max(0.01, parseFloat(cmd.duration, 10));
		}
		if (cmd.mincho) {
			props.fontCommand = 'mincho';
			props.commentVer = 'html5';
		} else if (cmd.gothic) {
			props.fontCommand = 'gothic';
			props.commentVer = 'html5';
		} else if (cmd.defont) {
			props.fontCommand = 'defont';
			props.commentVer = 'html5';
		}
		if (cmd._live) {
			props.opacity *= 0.5;
		}
		return props;
	}
	static SORT_FUNCTION(a, b) {
		const av = a.vpos, bv = b.vpos;
		if (av !== bv) {
			return av - bv;
		} else {
			return a.uniqNo < b.uniqNo ? -1 : 1;
		}
	}
	constructor(data, options = {}) {
		options = Object.assign({videoDuration: 0x7FFFFF, mainThreadId: 0, format: ''}, options);
		const props = this.props = {};
		props.id = `chat${NicoChat.id++}`;
		props.currentTime = 0;
		Object.assign(props, data);
		if (options.format === 'bulk') {
			return;
		}
		props.userId = data.user_id;
		props.fork = data.fork * 1;
		props.thread = data.thread * 1;
		props.isPremium = data.premium ? '1' : '0';
		props.isSubThread = (options.mainThreadId && props.thread !== options.mainThreadId);
		props.layerId = typeof data.layerId === 'number' ?
			data.layerId : (/* this.props.thread * 10 + */ props.fork * 1);
		props.uniqNo =
			(data.no                 %   10000) +
			(data.fork               *  100000) +
			((data.thread % 1000000) * 1000000);
		props.color = null;
		props.size = NicoChat.SIZE.MEDIUM;
		props.type = NicoChat.TYPE.NAKA;
		props.duration = NicoChat.DURATION.NAKA;
		props.commentVer = 'flash';
		props.nicoru = data.nicoru || 0;
		props.valhalla = data.valhalla;
		props.lastNicoruDate = data.last_nicoru_date || null;
		props.opacity = 1;
		props.time3d = 0;
		props.time3dp = 0;
		const text = props.text;
		if (props.fork > 0 && text.match(/^[/＠@]/)) {
			props.isNicoScript = true;
			props.isInvisible = true;
		}
		if (props.deleted) {
			return;
		}
		const cmd = props.cmd;
		if (cmd.length > 0 && cmd.trim() !== '184') {
			NicoChat.parseCmd(cmd, props.fork > 0, props);
		}
		const maxv =
			props.isNicoScript ?
				Math.min(props.vpos, options.videoDuration * 100) :
				Math.min(props.vpos, (1 + options.videoDuration - props.duration) * 100);
		const minv = Math.max(maxv, 0);
		props.vpos = minv;
	}
	reset () {
		Object.assign(this.props, {
			text: '',
			date: '000000000',
			cmd: '',
			isPremium: false,
			userId: '',
			vpos: 0,
			deleted: '',
			color: '#FFFFFF',
			size: NicoChat.SIZE.MEDIUM,
			type: NicoChat.TYPE.NAKA,
			isMine: false,
			score: 0,
			no: 0,
			fork: 0,
			isInvisible: false,
			isReverse: false,
			isPatissier: false,
			fontCommand: '',
			commentVer: 'flash',
			nicoru: 0,
			currentTime: 0,
			hasDurationSet: false
		});
	}
	onChange () {
		if (this.props.group) {
			this.props.group.onChange({chat: this});
		}
	}
	set currentTime(sec) { this.props.currentTime = sec;}
	get currentTime() { return this.props.currentTime;}
	set group(group) {this.props.group = group;}
	get group() { return this.props.group;}
	get isUpdating() { return !!this.props.isUpdating; }
	set isUpdating(v) {
		if (this.props.isUpdating !== v) {
			this.props.isUpdating = !!v;
			if (!v) {
				this.onChange();
			}
		}
	}
	set isPostFail(v) {this.props.isPostFail = v;}
	get isPostFail() {return !!this.props.isPostFail;}
	get id() {return this.props.id;}
	get text() {return this.props.text;}
	set text(v) {
		this.props.text = v;
		this.props.htmlText = null;
	}
	get htmlText() {return this.props.htmlText || '';}
	set htmlText(v) { this.props.htmlText = v; }
	get date() {return this.props.date;}
	get dateUsec() {return this.props.date_usec;}
	get lastNicoruDate() {return this.props.lastNicoruDate;}
	get cmd() {return this.props.cmd;}
	get isPremium() {return !!this.props.isPremium;}
	get isEnder() {return !!this.props.isEnder;}
	get isFull() {return !!this.props.isFull;}
	get isMine() {return !!this.props.isMine;}
	get isInvisible() {return this.props.isInvisible;}
	get isNicoScript() {return this.props.isNicoScript;}
	get isPatissier() {return this.props.isPatissier;}
	get isSubThread() {return this.props.isSubThread;}
	get hasColorCommand() {return !!this.props.hasColorCommand;}
	get hasSizeCommand() {return !!this.props.hasSizeCommand;}
	get hasTypeCommand() {return !!this.props.hasTypeCommand;}
	get duration() {return this.props.duration;}
	get hasDurationSet() {return !!this.props.hasDurationSet;}
	set duration(v) {
		this.props.duration = v;
		this.props.hasDurationSet = true;
	}
	get userId() {return this.props.userId;}
	get vpos() {return this.props.vpos;}
	get beginTime() {return this.vpos / 100;}
	get isDeleted() {return !!this.props.deleted;}
	get color() {return this.props.color;}
	set color(v) {this.props.color = v;}
	get size() {return this.props.size;}
	set size(v) {this.props.size = v;}
	get type() {return this.props.type;}
	set type(v) {this.props.type = v;}
	get score() {return this.props.score;}
	get no() {return this.props.no;}
	set no(no) {
		const props = this.props;
		props.no = no;
		props.uniqNo =
			(no     %  100000) +
			(props.fork   *  1000000) +
			(props.thread * 10000000);
	}
	get uniqNo() {return this.props.uniqNo;}
	get layerId() {return this.props.layerId;}
	get leaf() {return this.props.leaf;}
	get fork() {return this.props.fork;}
	get isReverse() {return this.props.isReverse;}
	set isReverse(v) {this.props.isReverse = !!v;}
	get fontCommand() {return this.props.fontCommand;}
	get commentVer() {return this.props.commentVer;}
	get threadId() {return this.props.thread;}
	get nicoru() {return this.props.nicoru;}
	set nicoru(v) {this.props.nicoru = v;}
	get nicotta() { return !!this.props.nicotta;}
	set nicotta(v) { this.props.nicotta = v;
	}
	get opacity() {return this.props.opacity;}
	get valhalla() {return this.props.valhalla || 0; }
}
NicoChat.id = 1000000;
NicoChat.SIZE = {
	BIG: 'big',
	MEDIUM: 'medium',
	SMALL: 'small'
};
NicoChat.TYPE = {
	TOP: 'ue',
	NAKA: 'naka',
	BOTTOM: 'shita'
};
NicoChat.DURATION = {
	TOP: 3 - 0.1,
	NAKA: 4,
	BOTTOM: 3 - 0.1
};
NicoChat._CMD_DURATION = /[@＠]([0-9.]+)/;
NicoChat._CMD_REPLACE = /(ue|shita|sita|big|small|ender|full|[ ])/g;
NicoChat._COLOR_MATCH = /(#[0-9a-f]+)/i;
NicoChat._COLOR_NAME_MATCH = /([a-z]+)/i;
NicoChat.COLORS = {
	'red': '#FF0000',
	'pink': '#FF8080',
	'orange': '#FFC000',
	'yellow': '#FFFF00',
	'green': '#00FF00',
	'cyan': '#00FFFF',
	'blue': '#0000FF',
	'purple': '#C000FF',
	'black': '#000000',
	'white2': '#CCCC99',
	'niconicowhite': '#CCCC99',
	'red2': '#CC0033',
	'truered': '#CC0033',
	'pink2': '#FF33CC',
	'orange2': '#FF6600',
	'passionorange': '#FF6600',
	'yellow2': '#999900',
	'madyellow': '#999900',
	'green2': '#00CC66',
	'elementalgreen': '#00CC66',
	'cyan2': '#00CCCC',
	'blue2': '#3399FF',
	'marineblue': '#3399FF',
	'purple2': '#6633CC',
	'nobleviolet': '#6633CC',
	'black2': '#666666'
};
	return NicoChat;
} // worker用
const NicoChat = NicoChatInitFunc();
class NicoChatViewModel {
	static create(nicoChat, offScreen) {
		if (nicoChat.commentVer === 'html5') {
			return new HTML5NicoChatViewModel(nicoChat, offScreen);
		}
		return new FlashNicoChatViewModel(nicoChat, offScreen);
	}
	constructor(nicoChat, offScreen) {
		this._speedRate = NicoChatViewModel.SPEED_RATE;
		this.initialize(nicoChat, offScreen);
		if (this._height >= CommentLayer.SCREEN.HEIGHT - this._fontSizePixel / 2) {
			this._isOverflow = true;
		}
		let cssLineHeight = this._cssLineHeight;
		this._cssScaleY = cssLineHeight / Math.floor(cssLineHeight);
		this._cssLineHeight = Math.floor(cssLineHeight);
		if (this._isOverflow || nicoChat.isInvisible) {
			this.checkCollision = () => {
				return false;
			};
		}
	}
	initialize(nicoChat, offScreen) {
		this._nicoChat = nicoChat;
		this._offScreen = offScreen;
		this._isOverflow = false;
		this._duration = nicoChat.duration;
		this._isFixed = false;
		this._scale = NicoChatViewModel.BASE_SCALE;
		this._cssLineHeight = 29;
		this._cssScaleY = 1;
		this._y = 0;
		this._slot = -1;
		this.setType(nicoChat.type);
		this.setVpos(nicoChat.vpos);
		this.setSize(nicoChat.size, nicoChat.commentVer);
		this._isLayouted = false;
		this.setText(nicoChat.text, nicoChat.htmlText);
		if (this._isFixed) {
			this._setupFixedMode();
		} else {
			this._setupMarqueeMode();
		}
	}
	setType(type) {
		this._type = type;
		switch(type) {
			case NicoChat.TYPE.TOP:
				this._isFixed = true;
				break;
			case NicoChat.TYPE.BOTTOM:
				this._isFixed = true;
				break;
		}
	}
	setVpos(vpos) {
		switch (this._type) {
			case NicoChat.TYPE.TOP:
				this._beginLeftTiming = vpos / 100;
				break;
			case NicoChat.TYPE.BOTTOM:
				this._beginLeftTiming = vpos / 100;
				break;
			default:
				this._beginLeftTiming = vpos / 100 - 1;
				break;
		}
		this._endRightTiming = this._beginLeftTiming + this._duration;
	}
	setSize(size) {
		this._size = size;
		const SIZE_PIXEL = this._nicoChat.commentVer === 'html5' ?
			NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 : NicoChatViewModel.FONT_SIZE_PIXEL;
		switch (size) {
			case NicoChat.SIZE.BIG:
				this._fontSizePixel = SIZE_PIXEL.BIG;
				break;
			case NicoChat.SIZE.SMALL:
				this._fontSizePixel = SIZE_PIXEL.SMALL;
				break;
			default:
				this._fontSizePixel = SIZE_PIXEL.MEDIUM;
				break;
		}
	}
	setText(text, parsedHtmlText = '') {
		const fontCommand = this.fontCommand;
		const commentVer = this.commentVer;
		const htmlText = parsedHtmlText ||
			(commentVer === 'html5' ? NicoTextParser.likeHTML5(text) : NicoTextParser.likeXP(text));
		this._htmlText = htmlText;
		this._text = text;
		const field = this._offScreen.getTextField();
		field.setText(htmlText);
		field.setFontSizePixel(this._fontSizePixel);
		field.setType(this._type, this._size, fontCommand, this.commentVer);
		this._originalWidth = field.getOriginalWidth();
		this._width = this._originalWidth * this._scale;
		this._originalHeight = field.getOriginalHeight();
		this._height = this._calculateHeight({});
		const w = this._width;
		const duration = this._duration / this._speedRate;
		if (!this._isFixed) { // 流れるコメント (naka)
			const speed =
				this._speed = (w + CommentLayer.SCREEN.WIDTH) / duration;
			const spw = w / speed;
			this._endLeftTiming = this._endRightTiming - spw;
			this._beginRightTiming = this._beginLeftTiming + spw;
		} else { // ue shita などの固定コメント
			this._speed = 0;
			this._endLeftTiming = this._endRightTiming;
			this._beginRightTiming = this._beginLeftTiming;
		}
	}
	recalcBeginEndTiming(speedRate = 1) {
		const width = this._width;
		const duration = this._duration / speedRate;
		this._endRightTiming = this._beginLeftTiming + duration;
		this._speedRate = speedRate;
		if (isNaN(width)) {
			return;
		}
		if (!this._isFixed) {
			const speed =
				this._speed = (width + CommentLayer.SCREEN.WIDTH) / duration;
			const spw = width / speed;
			this._endLeftTiming = this._endRightTiming - spw;
			this._beginRightTiming = this._beginLeftTiming + spw;
		} else {
			this._speed = 0;
			this._endLeftTiming = this._endRightTiming;
			this._beginRightTiming = this._beginLeftTiming;
		}
	}
	_calcLineHeight({size, scale = 1}) {
		const SIZE = NicoChat.SIZE;
		const MARGIN = 5;
		let lineHeight;
		if (scale >= 0.75) {
			switch (size) {
				case SIZE.BIG:
					lineHeight = (50 - MARGIN * scale) * NicoChatViewModel.BASE_SCALE;
					break;
				case SIZE.SMALL:
					lineHeight = (23 - MARGIN * scale) * NicoChatViewModel.BASE_SCALE;
					break;
				default:
					lineHeight = (34 - MARGIN * scale) * NicoChatViewModel.BASE_SCALE;
					break;
			}
		} else {
			switch (size) {
				case SIZE.BIG:
					lineHeight = (387 - MARGIN * scale * 0.5) / 16 * NicoChatViewModel.BASE_SCALE;
					break;
				case SIZE.SMALL:
					lineHeight = (383 - MARGIN * scale * 0.5) / 38 * NicoChatViewModel.BASE_SCALE;
					break;
				default:
					lineHeight = (378 - MARGIN * scale * 0.5) / 25 * NicoChatViewModel.BASE_SCALE;
			}
		}
		return lineHeight;
	}
	_calcDoubleResizedLineHeight({lc = 1, cssScale, size = NicoChat.SIZE.BIG}) {
		const MARGIN = 5;
		if (size !== NicoChat.SIZE.BIG) {
			return (size === NicoChat.SIZE.MEDIUM ? 24 : 13) + MARGIN;
		}
		// @see https://www37.atwiki.jp/commentart/pages/20.html
		cssScale = typeof cssScale === 'number' ? cssScale : this.cssScale;
		let lineHeight;
		if (lc <= 9) {
			lineHeight = ((392 / cssScale) - MARGIN) / lc -1;
		} else if (lc <= 10) {
			lineHeight = ((384 / cssScale) - MARGIN) / lc -1;
		} else if (lc <= 11) {
			lineHeight = ((389 / cssScale) - MARGIN) / lc -1;
		} else if (lc <= 12) {
			lineHeight = ((388 / cssScale) - MARGIN) / lc -1;
		} else if (lc <= 13) {
			lineHeight = ((381 / cssScale) - MARGIN) / lc -1;
		} else {
			lineHeight = ((381 / cssScale) - MARGIN) / 14;
		}
		return lineHeight;
	}
	_calculateHeight ({scale = 1, lc = 0, size, isEnder, isDoubleResized}) {
		lc = lc || this.lineCount;
		isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder;
		isDoubleResized = typeof isDoubleResized === 'boolean' ? isDoubleResized : this.isDoubleResized;
		size = size || this._size;
		const MARGIN = 5;
		const TABLE_HEIGHT = 385;
		let lineHeight;
		if (isDoubleResized) {
			this._cssLineHeight = this._calcDoubleResizedLineHeight({lc, size});
			return (((this._cssLineHeight - MARGIN) * lc) * scale * 0.5  + MARGIN -1) * NicoChatViewModel.BASE_SCALE;
		}
		let height;
		lineHeight = this._calcLineHeight({lc, size, scale});
		this._cssLineHeight = lineHeight;
		height = (lineHeight * lc + MARGIN) * scale;
		if (lc === 1) {
			this._isLineResized = false;
			return height - 1;
		}
		if (isEnder || height < TABLE_HEIGHT / 3) {
			this._isLineResized = false;
			return height - 1;
		}
		this._isLineResized = true;
		lineHeight = this._calcLineHeight({lc, size, scale: scale * 0.5});
		this._cssLineHeight = lineHeight * 2 -1;
		return (lineHeight * lc + MARGIN) * scale - 1;
	}
	_setupFixedMode() {
		const nicoChat = this._nicoChat;
		const SCREEN = CommentLayer.SCREEN;
		let ver = nicoChat.commentVer;
		let fullWidth = ver === 'html5' ? SCREEN.WIDTH_FULL_INNER_HTML5 : SCREEN.WIDTH_FULL_INNER;
		let screenWidth =
			nicoChat.isFull ? fullWidth : SCREEN.WIDTH_INNER;
		let screenHeight = CommentLayer.SCREEN.HEIGHT;
		let width = this._width;
		if (this._isLineResized) {
			width = ver === 'html5' ? Math.floor(width * 0.5 - 8) : (width * 0.5 + 4 * 0.5);
		}
		let isOverflowWidth = width > screenWidth;
		if (isOverflowWidth) {
			if (this._isLineResized) {
				screenWidth *= 2;
				this._isDoubleResized = true;
			}
			this._setScale(screenWidth / width);
		} else {
			this._setScale(1);
		}
		if (this._type === NicoChat.TYPE.BOTTOM) {
			this._y = screenHeight - this._height;
		}
	}
	_setupMarqueeMode () {
		if (this._isLineResized) {
			let duration = this._duration / this._speedRate;
			this._setScale(this._scale);
			let speed =
				this._speed = (this._width + CommentLayer.SCREEN.WIDTH) / duration;
			this._endLeftTiming = this._endRightTiming - this._width / speed;
			this._beginRightTiming = this._beginLeftTiming + this._width / speed;
		}
	}
	_setScale (scale) {
		this._scale = scale;
		let lsscale = scale * (this._isLineResized ? 0.5 : 1);
		this._height = this._calculateHeight({isDoubleResized: this.isDoubleResized}) * scale;
		this._width = this._originalWidth * lsscale;
	}
	get bulkLayoutData () {
		return {
			id: this.id,
			fork: this.fork,
			type: this.type,
			isOverflow: this._isOverflow,
			isInvisible: this.isInvisible,
			isFixed: this.isFixed,
			ypos: this.ypos,
			slot: this.slot,
			height: this.height,
			beginLeft: this.beginLeftTiming,
			beginRight: this.beginRightTiming,
			endLeft: this.endLeftTiming,
			endRight: this.endRightTiming,
			layerId: this.layerId
		};
	}
	set bulkLayoutData(data) {
		this.isOverflow = data.isOverflow;
		this._y = data.ypos;
		this._isLayouted = true;
	}
	reset () {}
	get lineCount() {
		return (this._htmlText || '').split('<br>').length;
	}
	get id() {return this._nicoChat.id;}
	get text() {return this._text;}
	get htmlText() {return this._htmlText; }
	set isLayouted(v) {this._isLayouted = v;}
	get isInView() {return this.isInViewBySecond(this.currentTime);}
	isInViewBySecond(sec) {
		if (!this._isLayouted || sec + 1 /* margin */ < this._beginLeftTiming) {
			return false;
		}
		if (sec > this._endRightTiming) {
			return false;
		}
		if (this.isInvisible) {
			return false;
		}
		return true;
	}
	get isOverflow() {return this._isOverflow;}
	set isOverflow(v) {this._isOverflow = v;}
	get isInvisible() {return this._nicoChat.isInvisible;}
	get width() {return this._width;}
	get height() {return this._height;}
	get duration() {return this._duration / this._speedRate;}
	get speed() {return this._speed;}
	get inviewTiming() {return this._beginLeftTiming;}
	get beginLeftTiming() {return this._beginLeftTiming;}
	get beginRightTiming() {return this._beginRightTiming;}
	get endLeftTiming() {return this._endLeftTiming; }
	get endRightTiming() {return this._endRightTiming;}
	get vpos() {return this._nicoChat.vpos;}
	get xpos() {return this.getXposBySecond(this.currentTime);}
	get ypos() {return this._y;}
	set ypos(v) { this._y = v;}
	get slot() {return this._slot;}
	set slot(v) {this._slot = v;}
	get color() {return this._nicoChat.color;}
	get size() {return this._nicoChat.size;}
	get type() {return this._nicoChat.type;}
	get cssScale() {return this._scale * (this._isLineResized ? 0.5 : 1);}
	get fontSizePixel() {return this._fontSizePixel;}
	get lineHeight() {return this._cssLineHeight;}
	get isLineResized() {return this._isLineResized;}
	get isDoubleResized() {return this._isDoubleResized;}
	get no() {return this._nicoChat.no;}
	get uniqNo() {return this._nicoChat.uniqNo;}
	get layerId() {return this._nicoChat.layerId;}
	get fork() {return this._nicoChat.fork;}
	get nicoru() { return this._nicoChat.nicoru; }
	get nicotta() { return this._nicoChat.nicotta; }
	getXposBySecond(sec) {
		if (this._isFixed) {
			return (CommentLayer.SCREEN.WIDTH - this._width) / 2;
		} else {
			let diff = sec - this._beginLeftTiming;
			return CommentLayer.SCREEN.WIDTH + diff * this._speed;
		}
	}
	getXposByVpos(vpos) {
		return this.getXposBySecond(vpos / 100);
	}
	get currentTime() {return this._nicoChat.currentTime;}
	get isFull() {return this._nicoChat.isFull;}
	get isFixed() { return this._isFixed; }
	get isNicoScript() {return this._nicoChat.isNicoScript;}
	get isMine() {return this._nicoChat.isMine;}
	get isUpdating() {return this._nicoChat.isUpdating;}
	get isPostFail() {return this._nicoChat.isPostFail;}
	get isReverse() {return this._nicoChat.isReverse;}
	get isSubThread() {return this._nicoChat.isSubThread;}
	get fontCommand() {return this._nicoChat.fontCommand;}
	get commentVer() {return this._nicoChat.commentVer;}
	get cssScaleY() {return this.cssScale * this._cssScaleY;}
	get meta() { // debug用
		return JSON.stringify({
			width: this.width,
			height: this.height,
			scale: this.cssScale,
			cmd: this._nicoChat.cmd,
			fontSize: this.fontSizePixel,
			vpos: this.vpos,
			xpos: this.xpos,
			ypos: this.ypos,
			slot: this.slot,
			type: this.type,
			begin: this.beginLeftTiming,
			end: this.endRightTiming,
			speed: this.speed,
			color: this.color,
			size: this.size,
			duration: this.duration,
			opacity: this.opacity,
			ender: this._nicoChat.isEnder,
			full: this._nicoChat.isFull,
			no: this._nicoChat.no,
			uniqNo: this._nicoChat.uniqNo,
			score: this._nicoChat.score,
			userId: this._nicoChat.userId,
			date: this._nicoChat.date,
			fork: this._nicoChat.fork,
			layerId: this._nicoChat.layerId,
			ver: this._nicoChat.commentVer,
			lc: this.lineCount,
			ls: this.isLineResized,
			thread: this._nicoChat.threadId,
			isSub: this._nicoChat.isSubThread,
			text: this.text
		});
	}
	checkCollision(target) {
		if (this.isOverflow || target.isOverflow || target.isInvisible) {
			return false;
		}
		if (this.layerId !== target.layerId) {
			return false;
		}
		const targetY = target.ypos;
		const selfY = this.ypos;
		if (targetY + target.height < selfY ||
			targetY > selfY + this.height) {
			return false;
		}
		let rt, lt;
		if (this.beginLeftTiming <= target.beginLeftTiming) {
			lt = this;
			rt = target;
		} else {
			lt = target;
			rt = this;
		}
		if (this.isFixed) {
			if (lt.endRightTiming > rt.beginLeftTiming) {
				return true;
			}
		} else {
			if (lt.beginRightTiming >= rt.beginLeftTiming) {
				return true;
			}
			if (lt.endRightTiming >= rt.endLeftTiming) {
				return true;
			}
		}
		return false;
	}
	moveToNextLine(others) {
		let margin = 1; //NicoChatViewModel.CHAT_MARGIN;
		let othersHeight = others.height + margin;
		let overflowMargin = 10;
		let rnd = Math.max(0, CommentLayer.SCREEN.HEIGHT - this.height);
		let yMax = CommentLayer.SCREEN.HEIGHT - this.height + overflowMargin;
		let yMin = 0 - overflowMargin;
		let type = this.type;
		let ypos = this.ypos;
		if (type !== NicoChat.TYPE.BOTTOM) {
			ypos += othersHeight;
			if (ypos > yMax) {
				this.isOverflow = true;
			}
		} else {
			ypos -= othersHeight;
			if (ypos < yMin) {
				this.isOverflow = true;
			}
		}
		this.ypos = this.isOverflow ? Math.floor(Math.random() * rnd) : ypos;
	}
	get time3d() {return this._nicoChat.time3d;}
	get time3dp() {return this._nicoChat.time3dp;}
	get opacity() {return this._nicoChat.opacity;}
}
NicoChatViewModel.emitter = new Emitter();
NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
NicoChatViewModel.FONT_SIZE_PIXEL = {
	BIG: 39, // 39
	MEDIUM: 24,
	SMALL: 16 //15
};
NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 = {
	BIG: 40 - 1,      // 684 / 17 > x > 684 / 18
	MEDIUM: 27 -1,   // 684 / 25 > x > 684 / 26
	SMALL: 18.4 -1     // 684 / 37 > x > 684 / 38
};
NicoChatViewModel.LINE_HEIGHT = {
	BIG: 45,
	MEDIUM: 29,
	SMALL: 18
};
NicoChatViewModel.CHAT_MARGIN = 5;
NicoChatViewModel.BASE_SCALE = parseFloat(Config.props.baseChatScale, 10);
Config.onkey('baseChatScale', scale => {
	if (isNaN(scale)) {
		return;
	}
	scale = parseFloat(scale, 10);
	NicoChatViewModel.BASE_SCALE = scale;
	NicoChatViewModel.emitter.emit('updateBaseChatScale', scale);
});
NicoChatViewModel.SPEED_RATE = 1.0;
class FlashNicoChatViewModel extends NicoChatViewModel {}
class HTML5NicoChatViewModel extends NicoChatViewModel {
	_calculateHeight ({scale = 1, lc = 0, size, isEnder/*, isDoubleResized*/}) {
		lc = lc || this.lineCount;
		isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder;
		size = size || this._size;
		const SIZE = NicoChat.SIZE;
		const MARGIN = 4;
		const SCREEN_HEIGHT = CommentLayer.SCREEN.HEIGHT;
		const INNER_HEIGHT = SCREEN_HEIGHT - MARGIN;
		const TABLE_HEIGHT = 360 - MARGIN;
		const RATIO = INNER_HEIGHT / TABLE_HEIGHT;
		scale *= RATIO;
		this._isLineResized = false;
		let lineHeight;
		let height;
			// @see https://ch.nicovideo.jp/883797/blomaga/ar1149544
		switch (size) {
			case SIZE.BIG:
				lineHeight = 47;
				break;
			case SIZE.SMALL:
				lineHeight = 22;
				break;
			default:
				lineHeight = 32;
				break;
		}
		this._cssLineHeight = lineHeight;
		if (lc === 1) {
			return (lineHeight * scale - 1) * NicoChatViewModel.BASE_SCALE;
		}
		switch (size) {
			case SIZE.BIG:
				lineHeight = TABLE_HEIGHT / (8 * (TABLE_HEIGHT / 340));
				break;
			case SIZE.SMALL:
				lineHeight = TABLE_HEIGHT / (21 * (TABLE_HEIGHT / 354));
				break;
			default:
				lineHeight = TABLE_HEIGHT / (13 * (TABLE_HEIGHT / 357));
				break;
		}
		height = (lineHeight * lc + MARGIN) * scale * NicoChatViewModel.BASE_SCALE;
		if (isEnder || height < TABLE_HEIGHT / 3) {
			this._cssLineHeight = lineHeight;
			return height - 1;
		}
		this._isLineResized = true;
		switch (size) {
			case SIZE.BIG:
				lineHeight = TABLE_HEIGHT / 16;
				break;
			case SIZE.SMALL:
				lineHeight = TABLE_HEIGHT / 38;
				break;
			default:
				lineHeight = TABLE_HEIGHT / (25 * (TABLE_HEIGHT / 351));
		}
		this._cssLineHeight = lineHeight * 2;
		return ((lineHeight * lc + MARGIN) * scale - 1) * NicoChatViewModel.BASE_SCALE;
	}
	_setScale_ (scale) {
		this._scale = scale;
		this._height = this._calculateHeight({}) * scale;
		this._width = this._originalWidth * scale * (this._isLineResized ? 0.5 : 1);
	}
	getCssScaleY() {
		return this.cssScale;
	}
}
class NicoChatCss3View {
	static buildChatDom (chat, type, size, cssText, document = window.document) {
		const span = document.createElement('span');
		const ver = chat.commentVer;
		const className = ['nicoChat', type, size];
		if (ver === 'html5') {
			className.push(ver);
		}
		if (chat.color === '#000000') {
			className.push('black');
		}
		if (chat.isDoubleResized) {
			className.push('is-doubleResized');
		} else if (chat.isLineResized) {
			className.push('is-lineResized');
		}
		if (chat.isOverflow) {
			className.push('overflow');
		}
		if (chat.isMine) {
			className.push('mine');
		}
		if (chat.isUpdating) {
			className.push('updating');
		}
		if (chat.nicotta) {
			className.push('nicotta');
		}
		let fork = chat.fork;
		className.push(`fork${fork}`);
		if (chat.isPostFail) {
			className.push('fail');
		}
		const fontCommand = chat.fontCommand;
		if (fontCommand) {
			className.push(`cmd-${fontCommand}`);
		}
		span.className = className.join(' ');
		span.id = chat.id;
		span.dataset.meta = chat.meta;
		if (!chat.isInvisible) {
			const {inline, keyframes} = cssText || {};
			if (inline) {
				span.style.cssText = inline;
			}
			span.innerHTML = chat.htmlText;
			if (keyframes) {
				const style = document.createElement('style');
				style.append(keyframes);
				span.append(style);
			}
		}
		return span;
	}
	static buildStyleElement (cssText, document = window.document) {
		const elm = document.createElement('style');
		elm.type = 'text/css';
		elm.append(cssText);
		return elm;
	}
	static buildChatHtml (chat, type, cssText, document = window.document) {
		const result = NicoChatCss3View.buildChatDom(chat, type, chat.size, cssText, document);
		result.removeAttribute('data-meta');
		return result.outerHTML;
	}
	static buildChatCss (chat, type, currentTime = 0, playbackRate = 1) {
		return type === NicoChat.TYPE.NAKA ?
			NicoChatCss3View._buildNakaCss(chat, type, currentTime, playbackRate) :
			NicoChatCss3View._buildFixedCss(chat, type, currentTime, playbackRate);
	}
	static _buildNakaCss(chat, type, currentTime, playbackRate) {
		let id = chat.id;
		let commentVer = chat.commentVer;
		let duration = chat.duration / playbackRate;
		let scale = chat.cssScale;
		let scaleY = chat.cssScaleY;
		let beginL = chat.beginLeftTiming;
		let screenWidth = CommentLayer.SCREEN.WIDTH;
		let screenHeight = CommentLayer.SCREEN.HEIGHT;
		let height = chat.height;
		let ypos = chat.ypos;
		let isSub = chat.isSubThread;
		let color = chat.color;
		let colorCss = color ? `color: ${color};` : '';
		let fontSizePx = chat.fontSizePixel;
		let lineHeightCss = '';
		if (commentVer !== 'html5') {
			lineHeightCss = `line-height: ${Math.floor(chat.lineHeight)}px;`;
		}
		let speed = chat.speed;
		let delay = (beginL - currentTime) / playbackRate;
		let slot = chat.slot;
		let zIndex =
			(slot >= 0) ?
				(slot * 1000 + chat.fork * 1000000 + 1) :
				(1000 + beginL * 1000 + chat.fork * 1000000);
		zIndex = isSub ? zIndex: zIndex * 2;
		const opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';
		const outerScreenWidth = CommentLayer.SCREEN.OUTER_WIDTH_FULL;
		const screenDiff = outerScreenWidth - screenWidth;
		const leftPos = screenWidth + screenDiff / 2;
		const durationDiff = screenDiff / speed / playbackRate;
		duration += durationDiff;
		delay -= (durationDiff * 0.5);
		const reverse = chat.isReverse ? 'animation-direction: reverse;' : '';
		let isAlignMiddle = false;
		if ((commentVer === 'html5' && (height >= screenHeight - fontSizePx / 2 || chat.isOverflow)) ||
			(commentVer !== 'html5' && height >= screenHeight - fontSizePx / 2 && height < screenHeight + fontSizePx)
		) {
				isAlignMiddle = true;
		}
		const top = isAlignMiddle ? '50%' : `${ypos}px`;
		const isScaled = scale !== 1.0 || scaleY !== 1.0;
		const inline = `
			--chat-trans-x: -${outerScreenWidth + chat.width * scale}px;
			${isAlignMiddle ? '--chat-trans-y: -50%' : ''};
			${isScaled ?
				`--chat-scale-x: ${scale};--chat-scale-y: ${scaleY};` : ''}
			display: inline-block;
			position: absolute;
			will-change: transform;
			contain: layout style paint;
			line-height: 1.235;
			z-index: ${zIndex};
			top: ${top};
			left: ${leftPos}px;
			${colorCss}
			${lineHeightCss}
			${opacity}
			font-size: ${fontSizePx}px;
			animation-name: ${(isAlignMiddle || isScaled) ? 'idou-props-scale' : 'idou-props'};
			animation-duration: ${duration}s;
			animation-delay: ${delay}s;
			${reverse}
			transform:
				translateX(0)
				${isScaled ? 'scale(var(--chat-scale-x), var(--chat-scale-y))' : ''}
				${isAlignMiddle ? 'translateY(var(--chat-trans-y))' : ''}
				;
		`;
		return {inline, keyframes: ''};
	}
	static _buildFixedCss(chat, type, currentTime, playbackRate) {
		let scaleCss;
		let commentVer = chat.commentVer;
		let duration = chat.duration / playbackRate;
		let scale = chat.cssScale;// * (chat.isLineResized ? 0.5 : 1);
		let scaleY = chat.cssScaleY;
		let beginL = chat.beginLeftTiming;
		let screenHeight = CommentLayer.SCREEN.HEIGHT;
		let height = chat.height;
		let ypos = chat.ypos;
		let isSub = chat.isSubThread;
		let color = chat.color;
		let colorCss = color ? `color: ${color};` : '';
		let fontSizePx = chat.fontSizePixel;
		let lineHeightCss = '';
		if (commentVer !== 'html5') {
			lineHeightCss = `line-height: ${Math.floor(chat.lineHeight)}px;`;
		}
		let delay = (beginL - currentTime) / playbackRate;
		let slot = chat.slot;
		let zIndex =
			(slot >= 0) ?
				(slot * 1000 + chat.fork * 1000000 + 1) :
				(1000 + beginL * 1000 + chat.fork * 1000000);
		zIndex = isSub ? zIndex: zIndex * 2;
		let time3d = '0';//`${delay * 10}px`; //${chat.time3dp * 100}px`;
		let opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';
		let top;
		let transY;
		if ((commentVer === 'html5' && height >= screenHeight - fontSizePx / 2 /*|| chat.isOverflow*/) ||
				(commentVer !== 'html5' && height >= screenHeight * 0.7)) {
			top = `${type === NicoChat.TYPE.BOTTOM ? 100 : 0}%`;
			transY = `${type === NicoChat.TYPE.BOTTOM ? -100 : 0}%`;
		} else {
			top = ypos + 'px';
			transY = '0';
		}
		scaleCss =
			scale === 1.0 ?
				`transform: scale3d(1, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});` :
				`transform: scale3d(${scale}, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});`;
		const inline = `
			z-index: ${zIndex};
			top: ${top};
			left: 50%;
			${colorCss}
			${lineHeightCss}
			${opacity}
			font-size: ${fontSizePx}px;
			${scaleCss}
			animation-duration: ${duration / 0.95}s;
			animation-delay: ${delay}s;
			--dokaben-scale: ${scale};
		`.trim();
		return {inline};
	}
}
class NicoChatFilter extends Emitter {
	constructor(params) {
		super();
		this._sharedNgLevel = params.sharedNgLevel || NicoChatFilter.SHARED_NG_LEVEL.MID;
		this._wordFilterList = [];
		this._userIdFilterList = [];
		this._commandFilterList = [];
		this.wordFilterList = params.wordFilter || '';
		this.userIdFilterList = params.userIdFilter || '';
		this.commandFilterList = params.commandFilter || '';
		this._enable = typeof params.enableFilter === 'boolean' ? params.enableFilter : true;
		this._wordReg = null;
		this._wordRegReg = null;
		this._userIdReg = null;
		this._commandReg = null;
		this._onChange = _.debounce(this._onChange.bind(this), 50);
		if (params.wordRegFilter) {
			this.setWordRegFilter(params.wordRegFilter, params.wordRegFilterFlags);
		}
	}
	set isEnable(v) {
		v = !!v;
		if (this._enable !== v) {
			this._enable = v;
			this._onChange();
		}
	}
	get isEnable() {
		return this._enable;
	}
	addWordFilter(text) {
		let before = this._wordFilterList.join('\n');
		this._wordFilterList.push((text || '').trim());
		this._wordFilterList = [...new Set(this._wordFilterList)];
		let after = this._wordFilterList.join('\n');
		if (before !== after) {
			this._wordReg = null;
			this._onChange();
		}
	}
	set wordFilterList(list) {
		list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];
		let before = this._wordFilterList.join('\n');
		let tmp = [];
		list.forEach(text => {
			if (!text) { return; }
			tmp.push(text.trim());
		});
		tmp = _.compact(tmp);
		let after = tmp.join('\n');
		if (before !== after) {
			this._wordReg = null;
			this._wordFilterList = tmp;
			this._onChange();
		}
	}
	get wordFilterList() {
		return this._wordFilterList;
	}
	setWordRegFilter(source, flags) {
		if (this._wordRegReg) {
			if (this._wordRegReg.source === source && this._flags === flags) {
				return;
			}
		}
		try {
			this._wordRegReg = new RegExp(source, flags);
		} catch (e) {
			window.console.error(e);
			return;
		}
		this._onChange();
	}
	addUserIdFilter(text) {
		const before = this._userIdFilterList.join('\n');
		this._userIdFilterList.push(text);
		this._userIdFilterList = [...new Set(this._userIdFilterList)];
		const after = this._userIdFilterList.join('\n');
		if (before !== after) {
			this._userIdReg = null;
			this._onChange();
		}
	}
	set userIdFilterList(list) {
		list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];
		let before = this._userIdFilterList.join('\n');
		let tmp = [];
		list.forEach(text => {
			if (!text) { return; }
			tmp.push(text.trim());
		});
		tmp = _.compact(tmp);
		let after = tmp.join('\n');
		if (before !== after) {
			this._userIdReg = null;
			this._userIdFilterList = tmp;
			this._onChange();
		}
	}
	get userIdFilterList() {
		return this._userIdFilterList;
	}
	addCommandFilter(text) {
		let before = this._commandFilterList.join('\n');
		this._commandFilterList.push(text);
		this._commandFilterList = [...new Set(this._commandFilterList)];
		let after = this._commandFilterList.join('\n');
		if (before !== after) {
			this._commandReg = null;
			this._onChange();
		}
	}
	set commandFilterList(list) {
		list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];
		let before = this._commandFilterList.join('\n');
		let tmp = [];
		list.forEach(text => {
			if (!text) { return; }
			tmp.push(text.trim());
		});
		tmp = _.compact(tmp);
		let after = tmp.join('\n');
		if (before !== after) {
			this._commandReg = null;
			this._commandFilterList = tmp;
			this._onChange();
		}
	}
	get commandFilterList() {
		return this._commandFilterList;
	}
	set sharedNgLevel(level) {
		if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
			this._sharedNgLevel = level;
			this._onChange();
		}
	}
	get sharedNgLevel() {
		return this._sharedNgLevel;
	}
	getFilterFunc() {
		if (!this._enable) {
			return () => true;
		}
		const threthold = NicoChatFilter.SHARED_NG_SCORE[this._sharedNgLevel];
		if (!this._wordReg) {
			this._wordReg = this._buildFilterReg(this._wordFilterList);
		}
		const umatch = this._userIdFilterList.length ? this._userIdFilterList : null;
		if (!this._commandReg) {
			this._commandReg = this._buildFilterReg(this._commandFilterList);
		}
		const wordReg = this._wordReg;
		const wordRegReg = this._wordRegReg;
		const commandReg = this._commandReg;
		if (Config.getValue('debug')) {
			return nicoChat => {
				if (nicoChat.fork > 0) {
					return true;
				}
				const score = nicoChat.score;
				if (score <= threthold) {
					window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
						score,
						threthold,
						nicoChat.type,
						nicoChat.vpos / 100,
						nicoChat.text
					);
					return false;
				}
				let m;
				wordReg && (m = wordReg.exec(nicoChat.text));
				if (m) {
					window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
						m[1],
						nicoChat.type,
						nicoChat.vpos / 100,
						nicoChat.text
					);
					return false;
				}
				wordRegReg && (m = wordRegReg.exec(nicoChat.text));
				if (m) {
					window.console.log(
						'%cNGワード(正規表現): "%s" %s %s秒 %s',
						'background: yellow;',
						m[1],
						nicoChat.type,
						nicoChat.vpos / 100,
						nicoChat.text
					);
					return false;
				}
				if (umatch && umatch.includes(nicoChat.userId)) {
					window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
						nicoChat.userId,
						nicoChat.type,
						nicoChat.vpos / 100,
						nicoChat.userId,
						nicoChat.text
					);
					return false;
				}
				commandReg && (m = commandReg.test(nicoChat.cmd));
				if (m) {
					window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
						m[1],
						nicoChat.type,
						nicoChat.vpos / 100,
						nicoChat.cmd,
						nicoChat.text
					);
					return false;
				}
				return true;
			};
		}
		return nicoChat => {
			if (nicoChat.fork > 0) {
				return true;
			}
			const text = nicoChat.text;
			return !(
				(nicoChat.score <= threthold) ||
				(wordReg && wordReg.test(text)) ||
				(wordRegReg && wordRegReg.test(text)) ||
				(umatch && umatch.includes(nicoChat.userId)) ||
				(commandReg && commandReg.test(nicoChat.cmd))
				);
		};
	}
	applyFilter(nicoChatArray) {
		let before = nicoChatArray.length;
		if (before < 1) {
			return nicoChatArray;
		}
		let timeKey = 'applyNgFilter: ' + nicoChatArray[0].type;
		window.console.time(timeKey);
		let filterFunc = this.getFilterFunc();
		let result = nicoChatArray.filter(filterFunc);
		window.console.timeEnd(timeKey);
		window.console.log('NG判定結果: %s/%s', result.length, before);
		return result;
	}
	isSafe(nicoChat) {
		return (this.getFilterFunc())(nicoChat);
	}
	_buildFilterReg(filterList) {
		if (filterList.length < 1) {
			return null;
		}
		const escapeRegs = textUtil.escapeRegs;
		let r = filterList.filter(f => f).map(f => escapeRegs(f));
		return new RegExp('(' + r.join('|') + ')', 'i');
	}
	_buildFilterPerfectMatchinghReg(filterList) {
		if (filterList.length < 1) {
			return null;
		}
		const escapeRegs = textUtil.escapeRegs;
		let r = filterList.filter(f => f).map(f => escapeRegs(f));
		return new RegExp('^(' + r.join('|') + ')$');
	}
	_onChange() {
		console.log('NicoChatFilter.onChange');
		this.emit('change');
	}
}
NicoChatFilter.SHARED_NG_LEVEL = {
	NONE: 'NONE',
	LOW: 'LOW',
	MID: 'MID',
	HIGH: 'HIGH',
	MAX: 'MAX'
};
NicoChatFilter.SHARED_NG_SCORE = {
	NONE: -99999,//Number.MIN_VALUE,
	LOW: -10000,
	MID: -5000,
	HIGH: -1000,
	MAX: -1
};
class NicoCommentPlayer extends Emitter {
	constructor(params) {
		super();
		this._model = new NicoComment(params);
		this._viewModel = new NicoCommentViewModel(this._model);
		this._view = new NicoCommentCss3PlayerView({
			viewModel: this._viewModel,
			playbackRate: params.playbackRate,
			show: params.showComment,
			opacity: _.isNumber(params.commentOpacity) ? params.commentOpacity : 1.0
		});
		const onCommentChange = _.throttle(this._onCommentChange.bind(this), 1000);
		this._model.on('change', onCommentChange);
		this._model.on('filterChange', this._onFilterChange.bind(this));
		this._model.on('parsed', this._onCommentParsed.bind(this));
		this._model.on('command', this._onCommand.bind(this));
		global.emitter.on('commentLayoutChange', onCommentChange);
		global.debug.nicoCommentPlayer = this;
		this.emitResolve('GetReady!');
	}
	setComment(data, options) {
		if (typeof data === 'string') {
			if (options.format === 'json') {
				this._model.setData(JSON.parse(data), options);
			} else {
				this._model.setXml(new DOMParser().parseFromString(data, 'text/xml'), options);
			}
		} else if (typeof data.getElementsByTagName === 'function') {
			this._model.setXml(data, options);
		} else {
			this._model.setData(data, options);
		}
	}
	_onCommand(command, param) {
		this.emit('command', command, param);
	}
	_onCommentChange(e) {
		console.log('onCommentChange', e);
		if (this._view) {
			setTimeout(() => this._view.refresh(), 0);
		}
		this.emit('change');
	}
	_onFilterChange(nicoChatFilter) {
		this.emit('filterChange', nicoChatFilter);
	}
	_onCommentParsed() {
		this.emit('parsed');
	}
	getMymemory() {
		if (!this._view) {
			this._view = new NicoCommentCss3PlayerView({
				viewModel: this._viewModel
			});
		}
		return this._view.export();
	}
	set currentTime(sec) {this._model.currentTime=sec;}
	get currentTime() {return this._model.currentTime;}
	set vpos(vpos) {this._model.currentTime=vpos / 100;}
	get vpos() {return this._model.currentTime * 100;}
	setVisibility(v) {
		if (v) {
			this._view.show();
		} else {
			this._view.hide();
		}
	}
	addChat(text, cmd, vpos, options) {
		if (typeof vpos !== 'number') {
			vpos = this.vpos;
		}
		const nicoChat = NicoChat.create(Object.assign({text, cmd, vpos}, options));
		this._model.addChat(nicoChat);
		return nicoChat;
	}
	set playbackRate(v) {
		if (this._view) {
			this._view.playbackRate = v;
		}
	}
	get playbackRate() {
		if (this._view) { return this._view.playbackRate; }
		return 1;
	}
	setAspectRatio(ratio) {
		this._view.setAspectRatio(ratio);
	}
	appendTo(node) {
		this._view.appendTo(node);
	}
	show() {
		this._view.show();
	}
	hide() {
		this._view.hide();
	}
	close() {
		this._model.clear();
		if (this._view) {
			this._view.clear();
		}
	}
	get filter() {return this._model.filter;}
	get chatList() {return this._model.chatList;}
	get nonfilteredChatList() {return this._model.nonfilteredChatList;}
	export() {
		return this._viewModel.export();
	}
	getCurrentScreenHtml() {
		return this._view.getCurrentScreenHtml();
	}
}
const {MAX_COMMENT} = CommentLayer;
class NicoComment extends Emitter {
	static getMaxCommentsByDuration(duration = 6 * 60 * 60 * 1000) {
		if (duration < 64) { return 100; }
		if (duration < 300) { return 250; }
		if (duration < 600) { return 500; }
		return 1000;
	}
	constructor(params) {
		super();
		this._currentTime = 0;
		params.nicoChatFilter = this._nicoChatFilter = new NicoChatFilter(params);
		this._nicoChatFilter.on('change', this._onFilterChange.bind(this));
		NicoComment.offscreenLayer.get().then(async offscreen => {
			params.offScreen = offscreen;
			this.topGroup = new NicoChatGroup(this, NicoChat.TYPE.TOP, params);
			this.nakaGroup = new NicoChatGroup(this, NicoChat.TYPE.NAKA, params);
			this.bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);
			this.nicoScripter = new NicoScripter();
			this.nicoScripter.on('command', (command, param) => this.emit('command', command, param));
			const onChange = _.debounce(this._onChange.bind(this), 100);
			this.topGroup.on('change', onChange);
			this.nakaGroup.on('change', onChange);
			this.bottomGroup.on('change', onChange);
			global.emitter.on('updateOptionCss', onChange);
			await sleep.idle();
			this.emitResolve('GetReady!');
		});
	}
	setXml(xml, options) {
		const chatsData = Array.from(xml.getElementsByTagName('chat')).filter(chat => chat.firstChild);
		return this.setChats(chatsData, options);
	}
	async setData(data, options) {
		await this.promise('GetReady!');
		const chatsData = data.filter(d => d.chat).map(d =>
			Object.assign({text: d.chat.content || '', cmd: d.chat.mail || ''}, d.chat));
		return this.setChats(chatsData, options);
	}
	async setChats(chatsData, options = {}) {
		this._options = options;
		window.console.time('コメントのパース処理');
		const nicoScripter = this.nicoScripter;
		if (!options.append) {
			this.topGroup.reset();
			this.nakaGroup.reset();
			this.bottomGroup.reset();
			nicoScripter.reset();
		}
		const videoDuration = this._duration = parseInt(options.duration || 0x7FFFFF);
		const maxCommentsByDuration = this.constructor.getMaxCommentsByDuration(videoDuration);
		const mainThreadId = options.mainThreadId || 0;
		let nicoChats = [];
		const top = [], bottom = [], naka = [];
		const create = options.format !== 'xml' ? NicoChat.create : NicoChat.createFromChatElement;
		for (let i = 0, len = Math.min(chatsData.length, MAX_COMMENT); i < len; i++) {
			const chat = chatsData[i];
			const nicoChat = create(chat, {videoDuration, mainThreadId});
			if (nicoChat.isDeleted) {
				continue;
			}
			if (nicoChat.isNicoScript) {
				nicoScripter.add(nicoChat);
			}
			nicoChats.push(nicoChat);
		}
		nicoChats = []
			.concat(...
				nicoChats.filter(c => (c.isPatissier || c.isCA) && c.fork < 1 && c.isSubThread)
					.splice(maxCommentsByDuration))
			.concat(...
				nicoChats.filter(c => (c.isPatissier || c.isCA) && c.fork < 1 && !c.isSubThread)
					.splice(maxCommentsByDuration))
			.concat(...nicoChats.filter(c => !(c.isPatissier || c.isCA) || c.fork > 0));
			window.console.timeLog('コメントのパース処理', 'NicoChat created');
		if (_.isObject(options.replacement) && _.size(options.replacement) > 0) {
			window.console.time('コメント置換フィルタ適用');
			this._wordReplacer = this.buildWordReplacer(options.replacement);
			this._preProcessWordReplacement(nicoChats, this._wordReplacer);
			window.console.timeEnd('コメント置換フィルタ適用');
		} else {
			this._wordReplacer = null;
		}
		if (options.append) {
			nicoChats = nicoChats.filter(chat => {
				return !this.topGroup.includes(chat) && !this.nakaGroup.includes(chat) && !this.bottomGroup.includes(chat);
			});
		}
		let minTime = Date.now();
		let maxTime = 0;
		for (const c of nicoChats) {
			minTime = Math.min(minTime, c.date);
			maxTime = Math.max(maxTime, c.date);
		}
		const timeDepth = maxTime - minTime;
		for (const c of nicoChats) {
			c.time3d = c.date - minTime;
			c.time3dp = c.time3d / timeDepth;
		}
		if (!nicoScripter.isEmpty) {
			window.console.time('ニコスクリプト適用');
			nicoScripter.apply(nicoChats);
			window.console.timeEnd('ニコスクリプト適用');
			const nextVideo = nicoScripter.getNextVideo();
			window.console.info('nextVideo', nextVideo);
			if (nextVideo) {
				this.emitAsync('command', 'nextVideo', nextVideo);
			}
		}
		const TYPE = NicoChat.TYPE;
		for (const nicoChat of nicoChats) {
			switch(nicoChat.type) {
				case TYPE.TOP:
					top.push(nicoChat);
					break;
				case TYPE.BOTTOM:
					bottom.push(nicoChat);
					break;
				default:
					naka.push(nicoChat);
					break;
			}
		}
		this.topGroup.addChatArray(top);
		this.nakaGroup.addChatArray(naka);
		this.bottomGroup.addChatArray(bottom);
		window.console.timeEnd('コメントのパース処理');
		console.log('chats: ', chatsData.length);
		console.log('top: ', this.topGroup.nonFilteredMembers.length);
		console.log('naka: ', this.nakaGroup.nonFilteredMembers.length);
		console.log('bottom: ', this.bottomGroup.nonFilteredMembers.length);
		this.emit('parsed');
	}
	buildWordReplacer(replacement) {
		let func = text => text;
		const makeFullReplacement = (f, src, dest) => {
			return text => f(text.indexOf(src) >= 0 ? dest : text);
		};
		const makeRegReplacement = (f, src, dest) => {
			const reg = new RegExp(textUtil.escapeRegs(src), 'g');
			return text => f(text.replace(reg, dest));
		};
		for (const key of Object.keys(replacement)) {
			if (!key) {
				continue;
			}
			const val = replacement[key];
			window.console.log('コメント置換フィルタ: "%s" => "%s"', key, val);
			if (key.charAt(0) === '*') {
				func = makeFullReplacement(func, key.substr(1), val);
			} else {
				func = makeRegReplacement(func, key, val);
			}
		}
		return func;
	}
	_preProcessWordReplacement(group, replacementFunc) {
		for (const nicoChat of group) {
			const text = nicoChat.text;
			const newText = replacementFunc(text);
			if (text !== newText) {
				nicoChat.text = newText;
			}
		}
	}
	get chatList() {
		return {
			top: this.topGroup.members,
			naka: this.nakaGroup.members,
			bottom: this.bottomGroup.members
		};
	}
	get nonFilteredChatList() {
		return {
			top: this.topGroup.nonFilteredMembers,
			naka: this.nakaGroup.nonFilteredMembers,
			bottom: this.bottomGroup.nonFilteredMembers
		};
	}
	addChat(nicoChat) {
		if (nicoChat.isDeleted) {
			return;
		}
		const type = nicoChat.type;
		if (this._wordReplacer) {
			nicoChat.text = this._wordReplacer(nicoChat.text);
		}
		if (!this.nicoScripter.isEmpty) {
			window.console.time('ニコスクリプト適用');
			this.nicoScripter.apply([nicoChat]);
			window.console.timeEnd('ニコスクリプト適用');
		}
		let group;
		switch (type) {
			case NicoChat.TYPE.TOP:
				group = this.topGroup;
				break;
			case NicoChat.TYPE.BOTTOM:
				group = this.bottomGroup;
				break;
			default:
				group = this.nakaGroup;
				break;
		}
		group.addChat(nicoChat, group);
		this.emit('addChat');
	}
	_onChange(e) {
		console.log('NicoComment.onChange: ', e);
		e = e || {};
		const ev = {
			nicoComment: this,
			group: e.group,
			chat: e.chat
		};
		this.emit('change', ev);
	}
	_onFilterChange() {
		this.emit('filterChange', this._nicoChatFilter);
	}
	clear() {
		this._xml = '';
		this.topGroup.reset();
		this.nakaGroup.reset();
		this.bottomGroup.reset();
		this.emit('clear');
	}
	get currentTime() {
		return this._currentTime;
	}
	set currentTime(sec) {
		this._currentTime = sec;
		this.topGroup.currentTime = sec;
		this.nakaGroup.currentTime = sec;
		this.bottomGroup.currentTime = sec;
		this.nicoScripter.currentTime = sec;
		this.emit('currentTime', sec);
	}
	seek(time) { this.currentTime = time; }
	set vpos(vpos) { this.currentTime = vpos / 100; }
	getGroup(type) {
		switch (type) {
			case NicoChat.TYPE.TOP:
				return this.topGroup;
			case NicoChat.TYPE.BOTTOM:
				return this.bottomGroup;
			default:
				return this.nakaGroup;
		}
	}
	get filter() {return this._nicoChatFilter;}
}
const OffscreenLayer = config => {
	const __offscreen_tpl__ = (`
		<!DOCTYPE html>
		<html lang="ja">
		<head>
		<meta charset="utf-8">
		<title>CommentLayer</title>
		<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
		<style type="text/css" id="optionCss">%OPTION_CSS%</style>
		<style type="text/css">
			.nicoChat { visibility: hidden; }
		</style>
		<body>
		<div id="offScreenLayer"
			style="
				width: 4096px;
				height: 384px;
				overflow: visible;
				background: #fff;
				white-space: pre;
		"></div>
		</body></html>
			`).trim();
	const emt = new Emitter();
	let offScreenFrame;
	let offScreenLayer;
	let textField;
	let optionStyle;
	const initializeOptionCss = optionStyle => {
		const update = () => {
			const tmp = [];
			let baseFont = config.props.baseFontFamily;
			const inner = optionStyle.innerHTML;
			if (baseFont) {
				baseFont = baseFont.replace(/[;{}*/]/g, '');
				tmp.push(
					[
						'.gothic    {font-family: %BASEFONT%; }\n',
						'han_group {font-family: %BASEFONT%, Arial; }'
					].join('').replace(/%BASEFONT%/g, baseFont)
				);
			}
			tmp.push(`.nicoChat { font-weight: ${config.props.baseFontBolder ? config.props.cssFontWeight : 'normal'} !important; }`);
			const newCss = tmp.join('\n');
			if (inner !== newCss) {
				optionStyle.innerHTML = newCss;
				global.emitter.emit('updateOptionCss', newCss);
			}
		};
		update();
		config.onkey('baseFontFamily', update);
		config.onkey('baseFontBolder', update);
	};
	const initialize = () => {
		if (offScreenFrame) {
			return;
		}
		window.console.time('createOffscreenLayer');
		const frame = document.createElement('iframe');
		offScreenFrame = frame;
		frame.loading = 'eager';
		frame.className = 'offScreenLayer';
		frame.setAttribute('sandbox', 'allow-same-origin');
		frame.style.position = 'fixed';
		frame.style.top = '200vw';
		frame.style.left = '200vh';
		(document.body || document.documentElement).append(frame);
		let layer;
		const onload = () => {
			frame.onload = null;
			if (util.isChrome()) { frame.removeAttribute('srcdoc'); }
			console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
			createTextField();
			let doc = offScreenFrame.contentWindow.document;
			layer = doc.getElementById('offScreenLayer');
			optionStyle = doc.getElementById('optionCss');
			initializeOptionCss(optionStyle);
			offScreenLayer = {
				getTextField: () => textField,
				appendChild: elm => {
					layer.append(elm);
				},
				removeChild: elm => {
					layer.removeChild(elm);
				},
				get optionCss() { return optionStyle.innerHTML;}
			};
			window.console.timeEnd('createOffscreenLayer');
			emt.emitResolve('GetReady!', offScreenLayer);
		};
		const html = __offscreen_tpl__
			.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
			.replace('%OPTION_CSS%', '');
		if (typeof frame.srcdoc === 'string') {
			frame.onload = onload;
			frame.srcdoc = html;
		} else {
			const fcd = frame.contentWindow.document;
			fcd.open();
			fcd.write(html);
			fcd.close();
			window.setTimeout(onload, 0);
		}
	};
	const getLayer = _config => {
		config = _config || config;
		initialize();
		return emt.promise('GetReady!');
	};
	const createTextField = () => {
		const layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
		const span = document.createElement('span');
		span.className = 'nicoChat';
		let scale = config.props.baseChatScale; //NicoChatViewModel.BASE_SCALE;
		config.onkey('baseChatScale', v => scale = v);
		textField = {
			setText: text => {
				span.innerHTML = text;
			},
			setType: (type, size, fontCommand, ver) => {
				fontCommand = fontCommand ? `cmd-${fontCommand}` : '';
				span.className = `nicoChat ${type} ${size} ${fontCommand} ${ver}`;
			},
			setFontSizePixel: pixel => {
				span.style.fontSize = `${pixel}px`;
			},
			getOriginalWidth: () => span.offsetWidth,
			getWidth: () => span.offsetWidth * scale,
			getOriginalHeight: () => span.offsetHeight,
			getHeight: () => span.offsetHeight * scale
		};
		layer.append(span);
		return span;
	};
	return {
		get: getLayer,
		get optionCss() { return optionStyle.innerHTML; }
	};
};
NicoComment.offscreenLayer = OffscreenLayer(Config);
class NicoCommentViewModel extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	async initialize(nicoComment) {
		const offScreen = this._offScreen = await NicoComment.offscreenLayer.get();
		this._currentTime = 0;
		this._lastUpdate = 0;
		this._topGroup =
			new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
		this._nakaGroup =
			new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA), offScreen);
		this._bottomGroup =
			new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);
		const config = Config.namespace('commentLayer');
		if (config.props.enableSlotLayoutEmulation) {
			this._slotLayoutWorker = SlotLayoutWorker.create();
			this._updateSlotLayout = _.debounce(this._updateSlotLayout.bind(this), 100);
		}
		nicoComment.on('setData', this._onSetData.bind(this));
		nicoComment.on('clear', this._onClear.bind(this));
		nicoComment.on('change', this._onChange.bind(this));
		nicoComment.on('parsed', this._onCommentParsed.bind(this));
		nicoComment.on('currentTime', this._onCurrentTime.bind(this));
	}
	_onSetData() {
		this.emit('setData');
	}
	_onClear() {
		this._topGroup.reset();
		this._nakaGroup.reset();
		this._bottomGroup.reset();
		this._lastUpdate = Date.now();
		this.emit('clear');
	}
	_onCurrentTime(sec) {
		this._currentTime = sec;
		this.emit('currentTime', this._currentTime);
	}
	_onChange(e) {
		this._lastUpdate = Date.now();
		this._updateSlotLayout();
		console.log('NicoCommentViewModel.onChange: ', e);
	}
	_onCommentParsed() {
		this._lastUpdate = Date.now();
		this._updateSlotLayout();
	}
	async _updateSlotLayout() {
		if (!this._slotLayoutWorker) {
			return;
		}
		window.console.time('SlotLayoutWorker call');
		const result = await this._slotLayoutWorker.post({
			command: 'layout',
			params: {
				lastUpdate: this._lastUpdate,
				top: this._topGroup.bulkSlotData,
				naka: this._nakaGroup.bulkSlotData,
				bottom: this._bottomGroup.bulkSlotData
			}
		});
		if (result.lastUpdate !== this._lastUpdate) {
			return console.warn('slotLayoutWorker changed', this._lastUpdate, result.lastUpdate);
		}
		this._topGroup.bulkSlotData = result.top;
		this._nakaGroup.bulkSlotData = result.naka;
		this._bottomGroup.bulkSlotData = result.bottom;
		window.console.timeEnd('SlotLayoutWorker call');
	}
	get currentTime() {return this._currentTime;}
	export() {
		const result = [];
		result.push(['<comment ',
			'>'
		].join(''));
		result.push(this._nakaGroup.export());
		result.push(this._topGroup.export());
		result.push(this._bottomGroup.export());
		result.push('</comment>');
		return result.join('\n');
	}
	getGroup(type) {
		switch (type) {
			case NicoChat.TYPE.TOP:
				return this._topGroup;
			case NicoChat.TYPE.BOTTOM:
				return this._bottomGroup;
			default:
				return this._nakaGroup;
		}
	}
	get bulkLayoutData() {
		return {
			top: this._topGroup.bulkLayoutData,
			naka: this._nakaGroup.bulkLayoutData,
			bottom: this._bottomGroup.bulkLayoutData
		};
	}
	set bulkLayoutData(data) {
		this._topGroup.bulkLayoutData = data.top;
		this._nakaGroup.bulkLayoutData = data.naka;
		this._bottomGroup.bulkLayoutData = data.bottom;
	}
}
class NicoChatGroup extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	initialize(nicoComment, type, params) {
		this._type = type;
		this._nicoChatFilter = params.nicoChatFilter;
		this._nicoChatFilter.on('change', this._onFilterChange.bind(this));
		this.reset();
	}
	reset() {
		this._members = [];
		this._filteredMembers = [];
	}
	addChatArray(nicoChatArray) {
		let members = this._members;
		let newMembers = [];
		for (const nicoChat of nicoChatArray) {
			newMembers.push(nicoChat);
			members.push(nicoChat);
			nicoChat.group = this;
		}
		newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
		if (newMembers.length > 0) {
			this._filteredMembers = this._filteredMembers.concat(newMembers);
			this.emit('addChatArray', newMembers);
		}
	}
	addChat(nicoChat) {
		this._members.push(nicoChat);
		nicoChat.group = this;
		if (this._nicoChatFilter.isSafe(nicoChat)) {
			this._filteredMembers.push(nicoChat);
			this.emit('addChat', nicoChat);
		}
	}
	get type() {return this._type;}
	get members() {
		if (this._filteredMembers.length > 0) {
			return this._filteredMembers;
		}
		return this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
	}
	get nonFilteredMembers() { return this._members; }
	onChange(e) {
		console.log('NicoChatGroup.onChange: ', e);
		this._filteredMembers = [];
		this.emit('change', {
			chat: e,
			group: this
		});
	}
	_onFilterChange() {
		this._filteredMembers = [];
		this.onChange(null);
	}
	get currentTime() {return this._currentTime;}
	set currentTime(sec) {
		this._currentTime = sec;
		let m = this._members;
		for (let i = 0, len = m.length; i < len; i++) {
			m[i].currentTime = sec;
		}
	}
	setSharedNgLevel(level) {
		if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
			this._sharedNgLevel = level;
			this.onChange(null);
		}
	}
	includes(nicoChat) {
		const uno = nicoChat.uniqNo;
		return this._members.find(m => m.uniqNo === uno);
	}
}
class NicoChatGroupViewModel {
	constructor(...args) {
		this.initialize(...args);
	}
	initialize(nicoChatGroup, offScreen) {
		this._nicoChatGroup = nicoChatGroup;
		this._offScreen = offScreen;
		this._members = [];
		this._lastUpdate = 0;
		this._vSortedMembers = [];
		this._initWorker();
		nicoChatGroup.on('addChat', this._onAddChat.bind(this));
		nicoChatGroup.on('addChatArray', this._onAddChatArray.bind(this));
		nicoChatGroup.on('reset', this._onReset.bind(this));
		nicoChatGroup.on('change', this._onChange.bind(this));
		NicoChatViewModel.emitter.on('updateBaseChatScale', this._onChange.bind(this));
		NicoChatViewModel.emitter.on('updateCommentSpeedRate', this._onCommentSpeedRateUpdate.bind(this));
		this.addChatArray(nicoChatGroup.members);
	}
	_initWorker() {
		this._layoutWorker = CommentLayoutWorker.getInstance();
	}
	_onAddChatArray(nicoChatArray) {
		this.addChatArray(nicoChatArray);
	}
	_onAddChat(nicoChat) {
		this.addChat(nicoChat);
	}
	_onReset() {
		this.reset();
	}
	_onChange(e) {
		console.log('NicoChatGroupViewModel.onChange: ', e);
		window.console.time('_onChange');
		this.reset();
		this.addChatArray(this._nicoChatGroup.members);
		window.console.timeEnd('_onChange');
	}
	async _execCommentLayoutWorker() {
		if (this._members.length < 1) {
			return;
		}
		const type = this._members[0].type;
		const result = await this._layoutWorker.post({
			command: 'layout',
			params: {
				type,
				members: this.bulkLayoutData,
				lastUpdate: this._lastUpdate,
			}
		});
		if (result.lastUpdate !== this._lastUpdate) {
			console.warn('group changed', this._lastUpdate, result.lastUpdate);
			return;
		}
		this.bulkLayoutData = result.members;
	}
	async addChatArray(nicoChatArray) {
		for (let i = 0, len = nicoChatArray.length; i < len; i++) {
			const nicoChat = nicoChatArray[i];
			const nc = NicoChatViewModel.create(nicoChat, this._offScreen);
			this._members.push(nc);
			if (i % 100 === 99) {
				await new Promise(r => setTimeout(r, 10));
			}
		}
		if (this._members.length < 1) {
			return;
		}
		this._lastUpdate = Date.now();
		this._execCommentLayoutWorker();
	}
	_onCommentSpeedRateUpdate() {
		this.changeSpeed(NicoChatViewModel.SPEED_RATE);
	}
	changeSpeed(speedRate = 1) {
		for (const member of this._members) {
			member.recalcBeginEndTiming(speedRate);
		}
		this._execCommentLayoutWorker();
	}
	_groupCollision() {
		this._createVSortedMembers();
		let members = this._vSortedMembers;
		for (let i = 0, len = members.length; i < len; i++) {
			let o = members[i];
			this.checkCollision(o);
			o.isLayouted = true;
		}
	}
	addChat(nicoChat) {
		let timeKey = 'addChat:' + nicoChat.text;
		window.console.time(timeKey);
		let nc = NicoChatViewModel.create(nicoChat, this._offScreen);
		this._lastUpdate = Date.now();
		this.checkCollision(nc);
		nc.isLayouted =true;
		this._members.push(nc);
		this._execCommentLayoutWorker();
		window.console.timeEnd(timeKey);
	}
	reset() {
		let m = this._members;
		for (let i = 0, len = m.length; i < len; i++) {
			m[i].reset();
		}
		this._members = [];
		this._vSortedMembers = [];
		this._lastUpdate = Date.now();
	}
	get currentTime() {return this._nicoChatGroup.currentTime;}
	get type() {return this._nicoChatGroup.type;}
	checkCollision(target) {
		if (target.isInvisible) {
			return;
		}
		const m = this._vSortedMembers;
		const beginLeft = target.beginLeftTiming;
		for (let i = 0, len = m.length; i < len; i++) {
			const o = m[i];
			if (o === target) {
				return;
			}
			if (beginLeft > o.endRightTiming) {
				continue;
			}
			if (o.checkCollision(target)) {
				target.moveToNextLine(o);
				if (!target.isOverflow) {
					this.checkCollision(target);
					return;
				}
			}
		}
	}
	get bulkLayoutData() {
		this._createVSortedMembers();
		const m = this._vSortedMembers;
		const result = [];
		for (let i = 0, len = m.length; i < len; i++) {
			result.push(m[i].bulkLayoutData);
		}
		return result;
	}
	set bulkLayoutData(data) {
		const m = this._vSortedMembers;
		for (let i = 0, len = m.length; i < len; i++) {
			m[i].bulkLayoutData = data[i];
		}
	}
	get bulkSlotData() {
		this._createVSortedMembers();
		let m = this._vSortedMembers;
		let result = [];
		for (let i = 0, len = m.length; i < len; i++) {
			let o = m[i];
			result.push({
				id: o.id,
				slot: o.slot,
				fork: o.fork,
				no: o.no,
				vpos: o.vpos,
				begin: o.inviewTiming,
				end: o.endRightTiming,
				invisible: o.isInvisible
			});
		}
		return result;
	}
	set bulkSlotData(data) {
		let m = this._vSortedMembers;
		for (let i = 0, len = m.length; i < len; i++) {
			m[i].slot = data[i].slot;
		}
	}
	_createVSortedMembers() {
		this._vSortedMembers = this._members.concat().sort(NicoChat.SORT_FUNCTION);
		return this._vSortedMembers;
	}
	get members() {return this._members;}
	get inViewMembers() {return this.getInViewMembersBySecond(this.currentTime);}
	getInViewMembersBySecond(sec) {
		let result = [], m = this._vSortedMembers, len = m.length;
		for (let i = 0; i < len; i++) {
			let chat = m[i]; //, s = m.getBeginLeftTiming();
			if (chat.isInViewBySecond(sec)) {
				result.push(chat);
			}
		}
		return result;
	}
	getInViewMembersByVpos(vpos) {
		if (!this._hasLayout) {
			this._layout();
		}
		return this.getInViewMembersBySecond(vpos / 100);
	}
	export() {
		let result = [], m = this._members, len = m.length;
		result.push(['\t<group ',
			'type="', this._nicoChatGroup.type, '" ',
			'length="', m.length, '" ',
			'>'
		].join(''));
		for (let i = 0; i < len; i++) {
			result.push(m[i].export());
		}
		result.push('\t</group>');
		return result.join('\n');
	}
	getCurrentTime() {return this.currentTime;}
	getType() {return this.type;}
}
const updateSpeedRate = () => {
	let rate = Config.props.commentSpeedRate * 1;
	if (Config.props.autoCommentSpeedRate) {
		rate = rate / Math.max(Config.props.playbackRate, 1);
	}
	if (rate !== NicoChatViewModel.SPEED_RATE) {
		NicoChatViewModel.SPEED_RATE = rate;
		NicoChatViewModel.emitter.emit('updateCommentSpeedRate', rate);
	}
};
Config.onkey('commentSpeedRate', updateSpeedRate);
Config.onkey('autoCommentSpeedRate', updateSpeedRate);
Config.onkey('playbackRate', updateSpeedRate);
updateSpeedRate();
class NicoCommentCss3PlayerView extends Emitter {
	constructor(params) {
		super();
		this._viewModel = params.viewModel;
		this._viewModel.on('setData', this._onSetData.bind(this));
		this._viewModel.on('currentTime', this._onCurrentTime.bind(this));
		this._lastCurrentTime = 0;
		this._isShow = true;
		this._aspectRatio = 9 / 16;
		this._inViewTable = new Map();
		this._inSlotTable = new Map();
		this._domTable = new Map();
		this._playbackRate = params.playbackRate || 1.0;
		this._isPaused = undefined;
		this._retryGetIframeCount = 0;
		console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);
		this._initializeView(params, 0);
		this._config = Config.namespace('commentLayer');
		this._updateDom = bounce.raf(this._updateDom.bind(this));
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				this.refresh();
				this.onResize();
			}
		});
		global.debug.css3Player = this;
	}
	_initializeView (params, retryCount) {
		if (retryCount === 0) {
			window.console.time('initialize NicoCommentCss3PlayerView');
		}
		this._style = null;
		this.commentLayer = null;
		this._view = null;
		const iframe = this._getIframe();
		iframe.loading = 'eager';
		iframe.setAttribute('sandbox', 'allow-same-origin');
		iframe.className = 'commentLayerFrame';
		const html =
			NicoCommentCss3PlayerView.__TPL__
				.replace('%CSS%', '').replace('%MSG%', '')
				.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
				.replace('%OPTION_CSS%', '');
		const onload = () => {
			let win, doc;
			iframe.onload = null;
			if (env.isChrome()) {iframe.removeAttribute('srcdoc');}
			try {
				win = iframe.contentWindow;
				doc = iframe.contentWindow.document;
			} catch (e) {
				window.console.error(e);
				window.console.log('変な広告に乗っ取られました');
				iframe.remove();
				this._view = null;
				global.debug.commentLayer = null;
				if (retryCount < 3) {
					this._initializeView(params, retryCount + 1);
				} else {
					PopupMessage.alert('コメントレイヤーの生成に失敗');
				}
				return;
			}
			cssUtil.registerProps(
				{name: '--dokaben-scale', syntax: '<number>', initialValue: 1, inherits: true, window: win},
				{name: '--chat-trans-x', syntax: '<length-percentage>', initialValue: '0px',  inherits: false, window: win},
				{name: '--chat-trans-y', syntax: '<length-percentage>', initialValue: '-50%', inherits: false, window: win},
				{name: '--chat-scale-x', syntax: '<number>', initialValue: 1, inherits: false, window: win},
				{name: '--chat-scale-y', syntax: '<number>', initialValue: 1, inherits: false, window: win},
				{name: '--layer-scale',  syntax: '<number>', initialValue: 1, inherits: false, window: win}
			);
			this.window = win;
			this.document = doc;
			this.fragment = doc.createDocumentFragment();
			this._gcFragment = doc.createElement('div');
			this._gcFragment.hidden = true;
			this._optionStyle = doc.getElementById('optionCss');
			this._style = doc.getElementById('nicoChatAnimationDefinition');
			this._keyframesContainer = doc.getElementById('keyframesContainer');
			const commentLayer = this.commentLayer = doc.getElementById('commentLayer');
			const subLayer = this.subLayer = doc.createElement('div');
			subLayer.className = 'subLayer';
			commentLayer.append(subLayer);
			doc.body.classList.toggle('debug', Config.props.debug);
			Config.onkey('debug', v => doc.body.classList.toggle('debug', v));
			NicoComment.offscreenLayer.get().then(layer => { this._optionStyle.innerHTML = layer.optionCss; });
			global.emitter.on('updateOptionCss', newCss => {
				this._optionStyle.innerHTML = newCss;
			});
			global.debug.getInViewElements = () => doc.getElementsByClassName('nicoChat');
			const onResize = () => {
				const w = win.innerWidth, h = win.innerHeight;
				if (!w || !h) { return; }
				const aspectRatio = Math.max(this._aspectRatio, 9 / 16);
				const targetHeight = Math.min(h, w * aspectRatio);
				const scale = targetHeight / 384;
				commentLayer.style.setProperty('--layer-scale', scale);
			};
			const chkSizeInit = () => {
				const h = win.innerHeight;
				if (!h) {
					window.setTimeout(chkSizeInit, 500);
				} else {
					watchResize(iframe, _.throttle(onResize, 100));
					this.onResize = onResize;
					onResize();
				}
			};
			global.emitter.on('fullscreenStatusChange', _.debounce(onResize, 2000));
			window.setTimeout(chkSizeInit, 100);
			if (this._isPaused) {
				this.pause();
			}
			const updateTextShadow = type => {
				const types = ['shadow-type2', 'shadow-type3', 'shadow-stroke', 'shadow-dokaben'];
				types.forEach(t => doc.body.classList.toggle(t, t === type));
			};
			updateTextShadow(this._config.getValue('textShadowType'));
			this._config.onkey('textShadowType', _.debounce(updateTextShadow, 100));
			window.console.timeEnd('initialize NicoCommentCss3PlayerView');
		};
		this._view = iframe;
		if (this._node) {
			this._node.append(iframe);
		}
		if (iframe.srcdocType === 'string') {
			iframe.onload = onload;
			iframe.srcdoc = html;
		} else {
			if (!this._node) {
				this._msEdge = true;
				document.querySelector('.zenzaPlayerContainer').append(iframe);
			}
			const icd = iframe.contentWindow.document;
			icd.open();
			icd.write(html);
			icd.close();
			window.setTimeout(onload, 0);
		}
		global.debug.commentLayer = iframe;
		if (!params.show) {
			this.hide();
		}
	}
	_getIframe () {
		let reserved = document.getElementsByClassName('reservedFrame');
		let iframe;
		if (reserved && reserved.length > 0) {
			iframe = reserved[0];
			document.body.removeChild(iframe);
			iframe.style.position = '';
			iframe.style.left = '';
		} else {
			iframe = document.createElement('iframe');
		}
		try {
			iframe.srcdocType = iframe.srcdocType || (typeof iframe.srcdoc);
			iframe.srcdoc = '<html></html>';
		} catch (e) {
			this._retryGetIframeCount++;
			window.console.error('Error: ', e);
			if (this._retryGetIframeCount < 5) {
				window.console.log('変な広告に乗っ取られたのでリトライ', this._retryGetIframeCount);
				return this._getIframe();
			} else {
				PopupMessage.alert('コメントレイヤーの生成に失敗しました');
			}
		}
		return iframe;
	}
	_onCommand (command, param) {
		this.emit('command', command, param);
	}
	_adjust () {
		if (!this._view) {
			return;
		}
		if (typeof this.onResize === 'function') {
			return this.onResize();
		}
	}
	getView () {
		return this._view;
	}
	set playbackRate (playbackRate) {
		this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
		if (!Config.props.autoCommentSpeedRate || this._playbackRate <= 1) {
			this.refresh();
		}
	}
	get playbackRate() { return this._playbackRate; }
	setAspectRatio (ratio) {
		this._aspectRatio = ratio;
		this._adjust();
	}
	_onSetData () {
		this.clear();
	}
	_onCurrentTime (sec) {
		let REFRESH_THRESHOLD = 1;
		this._lastCurrentTime = this._currentTime;
		this._currentTime = sec;
		if (this._lastCurrentTime === this._currentTime) {
			if (!this._isPaused) {
				this._setStall(true);
			}
		} else if (this._currentTime < this._lastCurrentTime ||
			Math.abs(this._currentTime - this._lastCurrentTime) > REFRESH_THRESHOLD) {
			this.refresh();
		} else {
			this._setStall(false);
			this._updateInviewElements();
		}
	}
	_addClass (name) {
		if (!this.commentLayer) {
			return;
		}
		this.commentLayer.classList.add(name);
	}
	_removeClass (name) {
		if (!this.commentLayer) {
			return;
		}
		this.commentLayer.classList.remove(name);
	}
	_setStall (v) {
		if (v) {
			this._addClass('is-stalled');
		} else {
			this._removeClass('is-stalled');
		}
	}
	pause () {
		if (this.commentLayer) {
			this._addClass('paused');
		}
		this._isPaused = true;
	}
	play () {
		if (this.commentLayer) {
			this._removeClass('paused');
		}
		this._isPaused = false;
	}
	clear () {
		if (this.commentLayer) {
			this.commentLayer.textContent = '';
			this.subLayer.textContent = '';
			this.commentLayer.append(this.subLayer);
			this._gcFragment.textContent = '';
			this._keyframesContainer.textContent = '';
			this.fragment.textContent = '';
		}
		if (this._style) {
			this._style.textContent = '';
		}
		this._inViewTable.clear();
		this._inSlotTable.clear();
		this._domTable.clear();
	}
	refresh () {
		this.clear();
		this._updateInviewElements();
	}
	_updateInviewElements () {
		if (!this.commentLayer || !this._style || !this._isShow || document.hidden) {
			return;
		}
		const vm = this._viewModel;
		const inView = [
			vm.getGroup(NicoChat.TYPE.NAKA).inViewMembers,
			vm.getGroup(NicoChat.TYPE.BOTTOM).inViewMembers,
			vm.getGroup(NicoChat.TYPE.TOP).inViewMembers
		].flat();
		const css = [], dom = [], subDom = [];
		const ct = this._currentTime;
		const newView = [];
		for (let i = 0, len = inView.length; i < len; i++) {
			const nicoChat = inView[i];
			const domId = nicoChat.id;
			if (this._inViewTable.has(domId)) {
				continue;
			}
			this._inViewTable.set(domId, nicoChat);
			this._inSlotTable.set(domId, nicoChat);
			newView.push(nicoChat);
		}
		if (newView.length > 1) {
			newView.sort(NicoChat.SORT_FUNCTION);
		}
		for (let i = 0, len = newView.length; i < len; i++) {
			const nicoChat = newView[i];
			const type = nicoChat.type;
			const size = nicoChat.size;
			const cssText = NicoChatCss3View.buildChatCss(nicoChat, type, ct, this._playbackRate);
			const element = NicoChatCss3View.buildChatDom(nicoChat, type, size, cssText, this.document);
			this._domTable.set(nicoChat.id, element);
			(nicoChat.isSubThread ? subDom : dom).push(element);
		}
		if (newView.length > 0) {
			const inSlotTable = this._inSlotTable, currentTime = this._currentTime;
			const outViewIds = [];
			const margin = 2 / NicoChatViewModel.SPEED_RATE;
			for (const key of inSlotTable.keys()) {
				const chat = inSlotTable.get(key);
				if (currentTime - margin < chat.endRightTiming) {
					continue;
				}
				inSlotTable.delete(key);
				outViewIds.push(key);
			}
			this._updateDom(dom, subDom, css, outViewIds);
		}
	}
	_updateDom(dom, subDom, css, outViewIds) {
		const fragment = this.fragment;
		if (dom.length) {
			fragment.append(...dom);
			this.commentLayer.append(fragment);
		}
		if (subDom.length) {
			fragment.append(...subDom);
			this.subLayer.append(fragment);
		}
		this._removeOutviewElements(outViewIds);
		this._gcInviewElements();
	}
	/*
	* アニメーションが終わっているはずの要素を除去
	*/
	_removeOutviewElements(outViewIds) {
		if (!this.document || !outViewIds.length) {
			return;
		}
		const dt = this._domTable;
		const elements = [];
		for (const id of outViewIds) {
			const elm = dt.get(id);
			elm && (elements.push(elm));
		}
		if (elements.length < 1) { return; }
		const fragment = this.fragment;
		fragment.append(...elements);
		this._gcFragment.append(fragment);
	}
	/*
	* 古い順に要素を除去していく
	*/
	_gcInviewElements (/*outViewIds*/) {
		if (!this.commentLayer || !this._style) {
			return;
		}
		const max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;
		const commentLayer = this.commentLayer;
		let inViewElements;
		const elements = [];
		inViewElements = this.window.Array.from(commentLayer.querySelectorAll('.nicoChat.fork0'));
		for (let i = inViewElements.length - max - 1; i >= 0; i--) {
			elements.push(inViewElements[i]);
		}
		if (elements.length < 1) { return; }
		const fragment = this.fragment;
		fragment.append(...elements);
		this._gcFragment.append(fragment);
	}
	buildHtml (currentTime) {
		window.console.time('buildHtml');
		const vm = this._viewModel;
		currentTime = currentTime || vm.currentTime;
		const members = [
			vm.getGroup(NicoChat.TYPE.NAKA).members,
			vm.getGroup(NicoChat.TYPE.BOTTOM).members,
			vm.getGroup(NicoChat.TYPE.TOP).members
		].flat();
		members.sort(NicoChat.SORT_FUNCTION);
		const html = [];
		html.push(this._buildGroupHtml(members, currentTime));
		const tpl = NicoCommentCss3PlayerView.__TPL__
			.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
			.replace('%OPTION_CSS%', NicoComment.offscreenLayer.optionCss)
			.replace('%CSS%', '')
			.replace('%MSG%', html.join(''));
		window.console.timeEnd('buildHtml');
		return tpl;
	}
	_buildGroupHtml (m, currentTime = 0) {
		const result = [];
		for (let i = 0, len = m.length; i < len; i++) {
			let chat = m[i];
			let type = chat.type;
			let cssText = NicoChatCss3View.buildChatCss(chat, type, currentTime);
			let element = NicoChatCss3View.buildChatHtml(chat, type, cssText, this.document);
			result.push(element);
		}
		return result.join('\n');
	}
	_buildGroupCss (m, currentTime) {
		let result = [];
		for (let i = 0, len = m.length; i < len; i++) {
			let chat = m[i];
			let type = chat.type;
			result.push(NicoChatCss3View.buildChatCss(chat, type, currentTime));
		}
		return result.join('\n');
	}
	show () {
		if (!this._isShow) {
			this._isShow = true;
			this.refresh();
		}
		console.log('show!');
	}
	hide () {
		this.clear();
		this._isShow = false;
	}
	appendTo (node) {
		if (this._msEdge) {
			return;
		} // MS IE/Edge...
		this._node = node;
		node.append(this._view);
	}
	export () {
		return this.buildHtml(0)
			.replace('<html', '<html class="saved"');
	}
	getCurrentScreenHtml () {
		const win = this.window;
		if (!win) {
			return null;
		}
		this.refresh();
		const body = win.document.body;
		body.classList.add('in-capture');
		let html = win.document.querySelector('html').outerHTML;
		body.classList.remove('in-capture');
		html = html
			.replace('<html ', '<html xmlns="http://www.w3.org/1999/xhtml" ')
			.replace(/<meta.*?>/g, '')
			.replace(/data-meta=".*?"/g, '')
			.replace(/<br>/g, '<br/>');
		return html;
	}
	getCurrentScreenSvg () {
		const win = this.window;
		if (!win) {
			return null;
		}
		this.refresh();
		let body = win.document.body;
		body.classList.add('in-capture');
		let style = win.document.querySelector('style').innerHTML;
		const w = 682, h = 382;
		const head =
			(`<svg
	xmlns="http://www.w3.org/2000/svg"
	version="1.1">
`);
		const defs = `
<defs>
	<style type="text/css" id="layoutCss"><![CDATA[
		${style}
		.nicoChat {
			animation-play-state: paused !important;
		}
	]]>
	</style>
</defs>
`.trim();
		const textList = [];
		Array.from(win.document.querySelectorAll('.nicoChat')).forEach(chat => {
			let j = JSON.parse(chat.getAttribute('data-meta'));
			chat.removeAttribute('data-meta');
			chat.setAttribute('y', j.ypos);
			let c = chat.outerHTML;
			c = c.replace(/<span/g, '<text');
			c = c.replace(/<\/span>$/g, '</text>');
			c = c.replace(/<(\/?)(span|group|han_group|zen_group|spacer)/g, '<$1tspan');
			c = c.replace(/<br>/g, '<br/>');
			textList.push(c);
		});
		const view =
			(`
<g fill="#00ff00">
	${textList.join('\n\t')}
</g>
`);
		const foot =
			(`
<g style="background-color: #333; overflow: hidden; width: ${w}; height: ${h}; padding: 0 69px;" class="shadow-dokaben in-capture paused">
	<g class="commentLayerOuter" width="682" height="384">
		<g class="commentLayer is-stalled" id="commentLayer" width="544" height="384">
		</g>
	</g>
</g>
</svg> `).trim();
		return `${head}${defs}${view}${foot}`;
	}
}
NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;
/* eslint-disable */
NicoCommentCss3PlayerView.__TPL__ = ((Config) => {
	let ownerShadowColor = Config.getValue('commentLayer.ownerCommentShadowColor');
	ownerShadowColor = ownerShadowColor.replace(/([^a-z^0-9^#])/ig, '');
	let textShadowColor = '#000';
	let textShadowColor2 = '#fff';
	let textShadowGray = '#888';
	return (`
<!DOCTYPE html>
<html lang="ja"
style="background-color: unset !important; background: none !important;"
>
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">
body {
	pointer-events: none;
	user-select: none;
}
body.in-capture .commentLayerOuter {
	overflow: hidden;
	width: 682px;
	height: 384px;
	padding: 0 69px;
}
body.in-capture .commentLayer {
	transform: none !important;
}
.mode-3d .commentLayer {
	perspective: 50px;
}
.saved body {
	pointer-events: auto;
}
.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }
@keyframes fixed {
	0% { opacity: 1; visibility: visible; }
	95% { opacity: 1; }
100% { opacity: 0; visibility: hidden;}
}
@keyframes show-hide {
0% { visibility: visible; opacity: 1; }
/* Chrome 73のバグ？対策 hidden が適用されない */
95% { visibility: visible; opacity: 1; }
100% { visibility: hidden; opacity: 0; }
/*100% { visibility: hidden; }*/
}
@keyframes dokaben {
	0% {
		visibility: visible;
		transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale(var(--dokaben-scale));
	}
	50% {
		transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg) scale(var(--dokaben-scale));
	}
	90% {
		transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg) scale(var(--dokaben-scale));
	}
	100% {
		visibility: hidden;
		transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale(var(--dokaben-scale));
	}
}
@keyframes idou-var {
	0%   {
		visibility: visible;
		transform: var(--transform-start);
	}
	100% {
		transform: var(--transform-end);
	}
}
@keyframes idou-props {
	0%   {
		visibility: visible;
		transform: translateX(0);
	}
	100% {
		visibility: hidden;
		transform: translateX(var(--chat-trans-x));
	}
}
@keyframes idou-props-scale {
	0%   {
		visibility: visible;
		transform:
			translateX(0)
			scale(var(--chat-scale-x), var(--chat-scale-y))
			translateY(-50%);
	}
	100% {
		visibility: hidden;
		transform:
			translateX(var(--chat-trans-x))
			scale(var(--chat-scale-x), var(--chat-scale-y))
			translateY(-50%);
	}
}
.commentLayerOuter {
	position: fixed;
	top: 50%;
	left: 50%;
	width: 672px;
	padding: 0 64px;
	height: 384px;
	right: 0;
	bottom: 0;
	transform: translate3d(-50%, -50%, 0);
	box-sizing: border-box;
}
.saved .commentLayerOuter {
	background: #333;
}
.commentLayer {
	position: relative;
	width: 544px;
	height: 384px;
	margin: 0;
	padding: 0;
	box-sizing: border-box;
	contain: layout style size;
	transform: scale(var(--layer-scale));
}
.subLayer {
	position: absolute;
	width: 100%;
	height: 100%;
	opacity: 0.7;
	contain: layout style size;
}
.debug .commentLayer {
	outline: 1px solid green;
	transform: none !important;
}
.nicoChat {
	line-height: 1.235;
	visibility: hidden;
	text-shadow: 1px 1px 0 ${textShadowColor};
	transform-origin: 0 0;
	animation-timing-function: linear;
	animation-fill-mode: forwards;
	will-change: transform, opacity;
	contain: layout style paint;
	color: #fff;
	/*-webkit-font-smoothing: initial;
	font-smooth: auto;
	text-rendering: optimizeSpeed;
	font-kerning: none;*/
}
.shadow-type2 .nicoChat {
	text-shadow:
		1px  1px 0 rgba(0, 0, 0, 0.5),
		-1px  1px 0 rgba(0, 0, 0, 0.5),
		-1px -1px 0 rgba(0, 0, 0, 0.5),
		1px -1px 0 rgba(0, 0, 0, 0.5);
}
.shadow-type3 .nicoChat {
	text-shadow:
		1px  1px 1px rgba(  0,   0,   0, 0.8),
		0  0 2px rgba(  0,   0,   0, 0.8),
		-1px -1px 1px rgba(128, 128, 128, 0.8);
}
.shadow-stroke .nicoChat {
	text-shadow: none;
	-webkit-text-stroke: 1px rgba(0, 0, 0, 0.7);
	text-stroke:         1px rgba(0, 0, 0, 0.7);
}
/*「RGBは大体　文字200、80、0　縁150,50,0　くらい」らしい*/
.shadow-dokaben .nicoChat.ue,
.shadow-dokaben .nicoChat.shita {
	color: rgb(200, 80, 0);
	font-family: 'dokaben_ver2_1' !important;
	font-weight: bolder;
	animation-name: dokaben !important;
	text-shadow:
		1px  1px 0 rgba(150, 50, 0, 1),
	-1px  1px 0 rgba(150, 50, 0, 1),
	-1px -1px 0 rgba(150, 50, 0, 1),
		1px -1px 0 rgba(150, 50, 0, 1) !important;
	transform-origin: center bottom;
	animation-timing-function: steps(10);
	perspective-origin: center bottom;
}
.shadow-dokaben .nicoChat.ue *,
.shadow-dokaben .nicoChat.shita * {
	font-family: 'dokaben_ver2_1' !important;
}
.shadow-dokaben .nicoChat {
	text-shadow:
		1px  1px 0 rgba(0, 0, 0, 0.5),
		-1px  1px 0 rgba(0, 0, 0, 0.5),
		-1px -1px 0 rgba(0, 0, 0, 0.5),
		1px -1px 0 rgba(0, 0, 0, 0.5);
}
.nicoChat.ue, .nicoChat.shita {
	animation-name: fixed;
	visibility: hidden;
}
.nicoChat.ue.html5, .nicoChat.shita.html5 {
	animation-name: show-hide;
	animation-timing-function: steps(20, jump-none);
}
.nicoChat.black, .nicoChat.black.fork1 {
	text-shadow:
	-1px -1px 0 ${textShadowGray},
	1px  1px 0 ${textShadowGray};
}
.nicoChat.ue,
.nicoChat.shita {
	display: inline-block;
	text-shadow: 0 0 3px #000;
}
.nicoChat.ue.black,
.nicoChat.shita.black {
	text-shadow: 0 0 3px #fff;
}
.nicoChat .type0655,
.nicoChat .zero_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
	opacity: 0;
}
.nicoChat .han_space,
.nicoChat .zen_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
	opacity: 0;
}
.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
	color: yellow;
	background: #fff;
	opacity: 0.3;
}
.debug .nicoChat .tab_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
	background: #ff0;
	opacity: 0.3;
}
.nicoChat .invisible_code {
	text-shadow: none;
	-webkit-text-stroke: unset;
	opacity: 0;
}
.nicoChat .zero_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
	opacity: 0;
}
.debug .nicoChat .zero_space {
	display: inline;
	position: absolute;
}
.debug .html5_zen_space {
	color: #888;
	opacity: 0.5;
}
.nicoChat .fill_space, .nicoChat .html5_fill_space {
	text-shadow: none;
	-webkit-text-stroke: unset !important;
	text-stroke: unset !important;
	background: currentColor;
}
.nicoChat .mesh_space {
	text-shadow: none;
	-webkit-text-stroke: unset;
}
.nicoChat .block_space, .nicoChat .html5_block_space {
	text-shadow: none;
}
.debug .nicoChat.ue {
	text-decoration: overline;
}
.debug .nicoChat.shita {
	text-decoration: underline;
}
.nicoChat.mine {
	border: 1px solid yellow;
}
.nicoChat.nicotta {
	border: 1px solid orange;
}
.nicoChat.updating {
	border: 1px dotted;
}
.nicoChat.fork1 {
	text-shadow:
	1px 1px 0 ${ownerShadowColor},
	-1px -1px 0 ${ownerShadowColor};
	-webkit-text-stroke: unset;
}
.nicoChat.ue.fork1,
.nicoChat.shita.fork1 {
	display: inline-block;
	text-shadow: 0 0 3px ${ownerShadowColor};
	-webkit-text-stroke: unset;
}
.nicoChat.fork2 {
	outline: dotted 1px #000088;
}
.nicoChat.blink {
	border: 1px solid #f00;
}
.nicoChat.subThread {
	filter: opacity(0.7);
}
@keyframes spin {
	0%   { transform: rotate(0deg); }
	100% { transform: rotate(3600deg); }
}
.nicoChat.updating::before {
	content: '❀';
	opacity: 0.8;
	color: #f99;
	display: inline-block;
	text-align: center;
	animation-name: spin;
	animation-iteration-count: infinite;
	animation-duration: 10s;
}
.nicoChat.updating::after {
	content: ' 通信中...';
	font-size: 50%;
	opacity: 0.8;
	color: #ccc;
}
.nicoChat.updating::after {
	animation-direction: alternate;
}
.nicoChat.fail {
	border: 1px dotted red;
	text-decoration: line-through;
}
.nicoChat.fail:after {
	content: ' 投稿失敗...';
	text-decoration: none;
	font-size: 80%;
	opacity: 0.8;
	color: #ccc;
}
.debug .nicoChat {
	outline: 1px outset;
}
spacer {
	visibility: hidden;
}
.debug spacer {
	visibility: visible;
	outline: 3px dotted orange;
}
.is-stalled *,
.paused *{
	animation-play-state: paused !important;
}
</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body style="background-color: unset !important; background: none !important;">
<div hidden="true" id="keyframesContainer"></div>
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>
	`).trim();
})(Config);
Object.assign(global.debug, {
	NicoChat,
	NicoChatViewModel
});

const CommentLayoutWorker = (config => {
	const func = function(self) {
		const TYPE = {
			TOP: 'ue',
			NAKA: 'naka',
			BOTTOM: 'shita'
		};
		const SCREEN = {
			WIDTH_INNER: 512,
			WIDTH_FULL_INNER: 640,
			WIDTH: 512 + 32,
			WIDTH_FULL: 640 + 32,
			HEIGHT: 384
		};
		const isConflict = (target, others) => {
			if (target.isOverflow || others.isOverflow || others.isInvisible) {
				return false;
			}
			if (target.layerId !== others.layerId) {
				return false;
			}
			const othersY = others.ypos;
			const targetY = target.ypos;
			if (othersY + others.height < targetY ||
				othersY > targetY + target.height) {
				return false;
			}
			let rt, lt;
			if (target.beginLeft <= others.beginLeft) {
				lt = target;
				rt = others;
			} else {
				lt = others;
				rt = target;
			}
			if (target.isFixed) {
				if (lt.endRight > rt.beginLeft) {
					return true;
				}
			} else {
				if (lt.beginRight >= rt.beginLeft) {
					return true;
				}
				if (lt.endRight >= rt.endLeft) {
					return true;
				}
			}
			return false;
		};
		const moveToNextLine = (self, others) => {
			const margin = 1;
			const othersHeight = others.height + margin;
			const overflowMargin = 10;
			const rnd = Math.max(0, SCREEN.HEIGHT - self.height);
			const yMax = SCREEN.HEIGHT - self.height + overflowMargin;
			const yMin = 0 - overflowMargin;
			const type = self.type;
			let ypos = self.ypos;
			if (type !== TYPE.BOTTOM) {
				ypos += othersHeight;
				if (ypos > yMax) {
					self.isOverflow = true;
				}
			} else {
				ypos -= othersHeight;
				if (ypos < yMin) {
					self.isOverflow = true;
				}
			}
			self.ypos = self.isOverflow ? Math.floor(Math.random() * rnd) : ypos;
			return self;
		};
		const findCollisionStartIndex = (target, members) => {
			const tl = target.beginLeft;
			const tr = target.endRight;
			const fork = target.fork;
			for (let i = 0, len = members.length; i < len; i++) {
				const o = members[i];
				const ol = o.beginLeft;
				const or = o.endRight;
				if (o.id === target.id) {
					return -1;
				}
				if (fork !== o.fork || o.invisible || o.isOverflow) {
					continue;
				}
				if (tl <= or && tr >= ol) {
					return i;
				}
			}
			return -1;
		};
		const _checkCollision = (target, members, collisionStartIndex) => {
			const beginLeft = target.beginLeft;
			for (let i = collisionStartIndex, len = members.length; i < len; i++) {
				const o = members[i];
				if (o.id === target.id) {
					return target;
				}
				if (beginLeft > o.endRight) {
					continue;
				}
				if (isConflict(target, o)) {
					target = moveToNextLine(target, o);
					if (!target.isOverflow) {
						return _checkCollision(target, members, collisionStartIndex);
					}
				}
			}
			return target;
		};
		const checkCollision = (target, members) => {
			if (target.isInvisible) {
				return target;
			}
			const collisionStartIndex = findCollisionStartIndex(target, members);
			if (collisionStartIndex < 0) {
				return target;
			}
			return _checkCollision(target, members, collisionStartIndex);
		};
		const groupCollision = members => {
			for (let i = 0, len = members.length; i < len; i++) {
				checkCollision(members[i], members);
			}
			return members;
		};
		self.onmessage = ({command, params}) => {
			const {type, members, lastUpdate} = params;
			console.time('CommentLayoutWorker: ' + type);
			groupCollision(members);
			console.timeEnd('CommentLayoutWorker: ' + type);
			return {type, members, lastUpdate};
		};
	};
	let instance = null;
	return {
		_func: func,
		create: () => workerUtil.createCrossMessageWorker(func, {name: 'CommentLayoutWorker'}),
		getInstance() {
			if (!instance) {
				instance = this.create();
			}
			return instance;
		}
	};
})(Config);

const SlotLayoutWorker = (() => {
	const func = function (self) {
		const SLOT_COUNT = 40;
		class SlotEntry {
			constructor(slotCount) {
				this.slotCount = slotCount || SLOT_COUNT;
				this.slot = [];
				this.itemTable = {};
				this.p = 1;
			}
			findIdle(sec) {
				const {count, slot, table} = this;
				for (let i = 0; i < count; i++) {
					if (!slot[i]) {
						slot[i] = this.p++;
						return i;
					}
					let item = table[i];
					if (sec < item.begin || sec > item.end) {
						slot[i] = this.p++;
						return i;
					}
				}
				return -1;
			}
			get mostOld() {
				let idx = 0, slot = this.slot, min = slot[0];
				for (let i = 1, len = this.slot.length; i < len; i++) {
					if (slot[i] < min) {
						min = slot[i];
						idx = i;
					}
				}
				return idx;
			}
			find(item, sec) {
				let slot = this.findIdle(sec);
				if (slot < 0) {
					slot = this.mostOld;
				}
				this.itemTable[slot] = item;
				return slot;
			}
		}
		const sortByBeginTime = data => {
			data = data.concat().sort((a, b) => {
				const av = a.begin, bv = b.begin;
				if (av !== bv) {
					return av - bv;
				} else {
					return a.no < b.no ? -1 : 1;
				}
			});
			return data;
		};
		const execute = ({top, naka, bottom}) => {
			const data = sortByBeginTime([top, naka, bottom].flat());
			const slotEntries = [new SlotEntry(), new SlotEntry(), new SlotEntry()];
			for (let i = 0, len = data.length; i < len; i++) {
				const o = data[i];
				if (o.invisible) {
					continue;
				}
				const sec = o.begin;
				const fork = o.fork % 3;
				o.slot = slotEntries[fork].find(o, sec);
			}
			return data;
		};
		self.onmessage = ({command, params}) => {
			console.time('SlotLayoutWorker');
			const result = execute(params);
			console.timeEnd('SlotLayoutWorker');
			result.lastUpdate = params.lastUpdate;
			return result;
		};
	};
	return {
		_func: func,
		create: function () {
			if (!workerUtil.isAvailable) {
				return null;
			}
			return workerUtil.createCrossMessageWorker(func, {name: 'SlotLayoutWorker'});
		}
	};
})();

class NicoScriptParser {
	static get parseId() {
		if (!NicoScriptParser._count) {
			NicoScriptParser._count = 1;
		}
		return NicoScriptParser._count++;
	}
	static parseNiwango(lines) {
		let type, params, m;
		const result = [];
		for (let i = 0, len = lines.length; i < len; i++) {
			const text = lines[i];
			const id = NicoScriptParser.parseId;
			if ((m = /^\/?replace\((.*?)\)/.exec(text)) !== null) {
				type = 'REPLACE';
				params = NicoScriptParser.parseReplace(m[1]);
				result.push({id, type, params});
			} else if ((m = /^\/?commentColor\s*=\s*0x([0-9a-f]{6})/i.exec(text)) !== null) {
				result.push({id, type: 'COLOR', params: {color: '#' + m[1]}});
			} else if ((m = /^\/?seek\((.*?)\)/i.exec(text)) !== null) {
				params = NicoScriptParser.parseSeek(m[1]);
				result.push({id, type: 'SEEK', params});
			}
		}
		return result;
	}
	static parseParams(str) {
		let result = {}, v = '', lastC = '', key, isStr = false, quot = '';
		for (let i = 0, len = str.length; i < len; i++) {
			let c = str.charAt(i);
			switch (c) {
				case ':':
					key = v.trim();
					v = '';
					break;
				case ',':
					if (isStr) {
						v += c;
					}
					else {
						if (key !== '' && v !== '') {
							result[key] = v.trim();
						}
						key = v = '';
					}
					break;
				case ' ':
					if (v !== '') {
						v += c;
					}
					break;
				case '\'':
				case '"':
					if (v !== '') {
						if (quot !== c) {
							v += c;
						} else if (isStr) {
							if (lastC === '\\') {
								v += c;
							}
							else {
								if (quot === '"') {
									v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
								}
								result[key] = v;
								key = v = '';
								isStr = false;
							}
						} else {
							window.console.error('parse fail?', isStr, lastC, str);
							return null;
						}
					} else {
						quot = c;
						isStr = true;
					}
					break;
				default:
					v += c;
			}
			lastC = c;
		}
		if (key !== '' && v !== '') {
			result[key] = v.trim();
		}
		return result;
	}
	static parseNicosParams(str) {
		let result = [], v = '', lastC = '', quot = '';
		for (let i = 0, len = str.length; i < len; i++) {
			let c = str.charAt(i);
			switch (c) {
				case ' ':
				case '　':
					if (quot) {
						v += c;
					} else {
						if (v !== '') {
							result.push(v);
							v = quot = '';
						}
					}
					break;
				case '\'':
				case '"':
					if (v !== '') {
						if (quot !== c) {
							v += c;
						} else {
							if (lastC === '\\') {
								v += c;
							}
							else {
								v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
								result.push(v);
								v = quot = '';
							}
						}
					} else {
						quot = c;
					}
					break;
				case '「':
					if (v !== '') {
						v += c;
					} else {
						quot = c;
					}
					break;
				case '」':
					if (v !== '') {
						if (quot !== '「') {
							v += c;
						} else {
							if (lastC === '\\') {
								v += c;
							}
							else {
								result.push(v);
								v = quot = '';
							}
						}
					} else {
						v += c;
					}
					break;
				default:
					v += c;
			}
			lastC = c;
		}
		if (v !== '') {
			result.push(v.trim());
		}
		return result;
	}
	static parseNicos(text) {
		text = text.trim();
		const text1 = (text || '').split(/[ 　:：]+/)[0]; // eslint-disable-line
		let params;
		let type;
		switch (text1) {
			case '@デフォルト':
			case '＠デフォルト':
				type = 'DEFAULT';
				break;
			case '@逆':
			case '＠逆':
				type = 'REVERSE';
				params = NicoScriptParser.parse逆(text);
				break;
			case '@ジャンプ':
			case '＠ジャンプ':
				params = NicoScriptParser.parseジャンプ(text);
				type = params.type;
				break;
			case '@ジャンプマーカー':
			case '＠ジャンプマーカー':
				type = 'MARKER'; //@ジャンプマーカー：ループ
				params = NicoScriptParser.parseジャンプマーカー(text);
				break;
			default:
				if (text.indexOf('@置換') === 0 || text.indexOf('＠置換') === 0) {
					type = 'REPLACE';
					params = NicoScriptParser.parse置換(text);
				} else {
					type = 'PIPE';
					let lines = NicoScriptParser.splitLines(text);
					params = NicoScriptParser.parseNiwango(lines);
				}
		}
		const id = NicoScriptParser.parseId;
		return {id, type, params};
	}
	static splitLines(str) {
		let result = [], v = '', lastC = '', isStr = false, quot = '';
		for (let i = 0, len = str.length; i < len; i++) {
			let c = str.charAt(i);
			switch (c) {
				case ';':
					if (isStr) {
						v += c;
					}
					else {
						result.push(v.trim());
						v = '';
					}
					break;
				case ' ':
					if (v !== '') {
						v += c;
					}
					break;
				case '\'':
				case '"':
					if (isStr) {
						if (quot === c) {
							if (lastC !== '\\') {
								isStr = false;
							}
						}
						v += c;
					} else {
						quot = c;
						isStr = true;
						v += c;
					}
					break;
				default:
					v += c;
			}
			lastC = c;
		}
		if (v !== '') {
			result.push(v.trim());
		}
		return result;
	}
	static parseReplace(str) {
		const result = NicoScriptParser.parseParams(str);
		if (!result) {
			return null;
		}
		return {
			src: result.src,
			dest: result.dest || '',
			fill: result.fill === 'true' ? true : false,
			target: result.target || 'user',
			partial: result.partial === 'false' ? false : true
		};
	}
	static parseSeek(str) {
		const result = NicoScriptParser.parseParams(str);
		if (!result) {
			return null;
		}
		return {
			time: result.vpos
		};
	}
	static parse置換(str) {
		const tmp = NicoScriptParser.parseNicosParams(str);
		let target = 'user'; // '投コメ'
		if (tmp[4] === '含む' || tmp[4] === '全') { // マニュアルにはないが '全' もあるらしい
			target = 'owner user';
		} else if (tmp[4] === '投コメ') {
			target = 'owner';
		}
		return {
			src: tmp[1],
			dest: tmp[2] || '',
			fill: tmp[3] === '全' ? true : false,          //全体を置き換えるかどうか
			target, //(tmp[4] === '含む' || tmp[4] === '投コメ')     ? 'owner user' : 'user',
			partial: tmp[5] === '完全一致' ? false : true           // 完全一致のみを見るかどうか
		};
	}
	static parse逆(str) {
		const tmp = NicoScriptParser.parseNicosParams(str);
		/* eslint-disable */
		/* eslint-enable */
		const target = (tmp[1] || '').trim();
		return {
			target: (target === 'コメ' || target === '投コメ') ? target : '全',
		};
	}
	static parseジャンプ(str) {
		const tmp = NicoScriptParser.parseNicosParams(str);
		const target = tmp[1] || '';
		let type = 'JUMP';
		let time = 0;
		let m;
		if ((m = /^#(\d+):(\d+)$/.exec(target)) !== null) {
			type = 'SEEK';
			time = m[1] * 60 + m[2] * 1;
		} else if ((m = /^#(\d+):(\d+\.\d+)$/.exec(target)) !== null) {
			type = 'SEEK';
			time = m[1] * 60 + m[2] * 1;
		} else if ((m = /^(#|＃)(.+)/.exec(target)) !== null) {
			type = 'SEEK_MARKER';
			time = m[2];
		}
		return {target, type, time};
	}
	static parseジャンプマーカー(str) {
		const tmp = NicoScriptParser.parseNicosParams(str);
		const name = tmp[0].split(/[:： 　]/)[1]; // eslint-disable-line
		return {name};
	}
}
class NicoScripter extends Emitter {
	constructor() {
		super();
		this.reset();
	}
	reset() {
		this._hasSort = false;
		this._list = [];
		this._eventScript = [];
		this._nextVideo = null;
		this._marker = {};
		this._inviewEvents = {};
		this._currentTime = 0;
		this._eventId = 0;
	}
	add(nicoChat) {
		this._hasSort = false;
		this._list.push(nicoChat);
	}
	get isEmpty() {
		return this._list.length === 0;
	}
	getNextVideo() {
		return this._nextVideo || '';
	}
	getEventScript() {
		return this._eventScript || [];
	}
	get currentTime() {
		return this._currentTime;
	}
	set currentTime(v) {
		this._currentTime = v;
		if (this._eventScript.length > 0) {
			this._updateInviewEvents();
		}
	}
	_sort() {
		if (this._hasSort) {
			return;
		}
		const list = this._list.concat().sort((a, b) => {
			const av = a.vpos, bv = b.vpos;
			if (av !== bv) {
				return av - bv;
			} else {
				return a.no < b.no ? -1 : 1;
			}
		});
		this._list = list;
		this._hasSort = true;
	}
	_updateInviewEvents() {
		const ct = this._currentTime;
		this._eventScript.forEach(({p, nicos}) => {
			const beginTime = nicos.vpos / 100;
			const endTime = beginTime + nicos.duration;
			if (beginTime > ct || endTime < ct) {
				delete this._inviewEvents[p.id];
				return;
			}
			if (this._inviewEvents[p.id]) {
				return;
			}
			this._inviewEvents[p.id] = true;
			let diff = nicos.vpos / 100 - ct;
			diff = Math.min(1, Math.abs(diff)) * (diff / Math.abs(diff));
			switch (p.type) {
				case 'SEEK':
					this.emit('command', 'nicosSeek', Math.max(0, p.params.time * 1 + diff));
					break;
				case 'SEEK_MARKER': {
					let time = this._marker[p.params.time] || 0;
					this.emit('command', 'nicosSeek', Math.max(0, time + diff));
					break;
				}
			}
		});
	}
	apply(group) {
		this._sort();
		const assigned = {};
		const eventFunc = {
			'JUMP': (p, nicos) => {
				console.log('@ジャンプ: ', p, nicos);
				const target = p.params.target;
				if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
					this._nextVideo = target;
				}
			},
			'SEEK': (p, nicos) => {
				if (assigned[p.id]) {
					return;
				}
				assigned[p.id] = true;
				this._eventScript.push({p, nicos});
			},
			'SEEK_MARKER': (p, nicos) => {
				if (assigned[p.id]) {
					return;
				}
				assigned[p.id] = true;
				console.log('SEEK_MARKER: ', p, nicos);
				this._eventScript.push({p, nicos});
			},
			'MARKER': (p, nicos) => {
				console.log('@ジャンプマーカー: ', p, nicos);
				this._marker[p.params.name] = nicos.vpos / 100;
			}
		};
		const applyFunc = {
			DEFAULT(nicoChat, nicos) {
				const nicosColor = nicos.color;
				const hasColor = nicoChat.hasColorCommand;
				if (nicosColor && !hasColor) {
					nicoChat.color = nicosColor;
				}
				const nicosSize = nicos.size;
				const hasSize = nicoChat.hasSizeCommand;
				if (nicosSize && !hasSize) {
					nicoChat.size = nicosSize;
				}
				const nicosType = nicos.type;
				const hasType = nicoChat.hasTypeCommand;
				if (nicosType && !hasType) {
					nicoChat.type = nicosType;
				}
			},
			COLOR(nicoChat, nicos, params) {
				const hasColor = nicoChat.hasColorCommand;
				if (!hasColor) {
					nicoChat.color = params.color;
				}
			},
			REVERSE(nicoChat, nicos, params) {
				if (params.target === '全') {
					nicoChat.isReverse = true;
				} else if (params.target === '投コメ') {
					if (nicoChat.fork > 0) {
						nicoChat.isReverse = true;
					}
				} else if (params.target === 'コメ') {
					if (nicoChat.fork === 0) {
						nicoChat.isReverse = true;
					}
				}
			},
			REPLACE(nicoChat, nicos, params) {
				if (!params) {
					return;
				}
				if (nicoChat.fork > 0 && (params.target || '').indexOf('owner') < 0) {
					return;
				}
				if (nicoChat.fork < 1 && params.target === 'owner') {
					return;
				}
				let isMatch = false;
				let text = nicoChat.text;
				if (params.partial === true) {
					isMatch = text.indexOf(params.src) >= 0;
				} else {
					isMatch = text === params.src;
				}
				if (!isMatch) {
					return;
				}
				if (params.fill === true) {
					text = params.dest;
				} else {// ＠置換 "~" "\n" 単 全
					const reg = new RegExp(textUtil.escapeRegs(params.src), 'g');
					text = text.replace(reg, params.dest);
				}
				nicoChat.text = text;
				const nicosColor = nicos.clor;
				const hasColor = nicoChat.hasColorCommand;
				if (nicosColor && !hasColor) {
					nicoChat.color = nicosColor;
				}
				const nicosSize = nicos.size;
				const hasSize = nicoChat.hasSizeCommand;
				if (nicosSize && !hasSize) {
					nicoChat.size = nicosSize;
				}
				const nicosType = nicos.type;
				const hasType = nicoChat.hasTypeCommand;
				if (nicosType && !hasType) {
					nicoChat.type = nicosType;
				}
			},
			PIPE(nicoChat, nicos, lines) {
				lines.forEach(line => {
					const type = line.type;
					const f = applyFunc[type];
					if (f) {
						f(nicoChat, nicos, line.params);
					}
				});
			}
		};
		this._list.forEach(nicos => {
			const p = NicoScriptParser.parseNicos(nicos.text);
			if (!p) {
				return;
			}
			if (!nicos.hasDurationSet) {
				nicos.duration = 99999;
			}
			const ev = eventFunc[p.type];
			if (ev) {
				return ev(p, nicos);
			}
			else if (p.type === 'PIPE') {
				p.params.forEach(line => {
					const type = line.type;
					const ev = eventFunc[type];
					if (ev) {
						return ev(line, nicos);
					}
				});
			}
			const func = applyFunc[p.type];
			if (!func) {
				return;
			}
			const beginTime = nicos.beginTime;
			const endTime = beginTime + nicos.duration;
			(group.members ? group.members : group).forEach(nicoChat => {
				if (nicoChat.isNicoScript) {
					return;
				}
				const ct = nicoChat.beginTime;
				if (beginTime > ct || endTime < ct) {
					return;
				}
				func(nicoChat, nicos, p.params);
			});
		});
	}
}

class CommentListModel extends Emitter {
	constructor(params) {
		super();
		this._isUniq = params.uniq;
		this._items = [];
		this._positions = [];
		this._maxItems = params.maxItems || 100;
		this._currentSortKey = 'vpos';
		this._isDesc = false;
		this._currentTime = 0;
	}
	setItem(itemList) {
		this._items = Array.isArray(itemList) ? itemList : [itemList];
	}
	clear() {
		this._items = [];
		this._positions = [];
		this._currentTime = 0;
		this.emit('update', [], true);
	}
	setChatList(chatList) {
		chatList = chatList.top.concat(chatList.naka, chatList.bottom);
		let items = [];
		let positions = [];
		for (let i = 0, len = chatList.length; i < len; i++) {
			items.push(new CommentListItem(chatList[i]));
			positions.push(parseFloat(chatList[i].vpos, 10) / 100);
		}
		this._items = items;
		this._positions = positions.sort((a, b) => a - b);
		this._currentTime = 0;
		this.sort();
		this.emit('update', this._items, true);
	}
	removeItemByIndex(index) {
		let target = this._getItemByIndex(index);
		if (!target) {
			return;
		}
		this._items = _.reject(this._items, item => item === target);
	}
	getLength() {
		return this._items.length;
	}
	_getItemByIndex(index) {
		let item = this._items[index];
		return item;
	}
	indexOf(item) {
		return (this._items || []).indexOf(item);
	}
	getItemByIndex(index) {
		let item = this._getItemByIndex(index);
		if (!item) {
			return null;
		}
		return item;
	}
	findByItemId(itemId) {
		itemId = parseInt(itemId, 10);
		return this._items.find(item => item.itemId === itemId);
	}
	removeItem(item) {
		let beforeLen = this._items.length;
		_.pull(this._items, item);
		let afterLen = this._items.length;
		if (beforeLen !== afterLen) {
			this.emit('update', this._items);
		}
	}
	_onItemUpdate(item, key, value) {
		this.emit('itemUpdate', item, key, value);
	}
	sortBy(key, isDesc) {
		const table = {
			vpos: 'vpos',
			date: 'date',
			text: 'text',
			user: 'userId',
			nicoru: 'nicoru'
		};
		let func = table[key];
		if (!func) {
			return;
		}
		this._items = _.sortBy(this._items, item => item[func]);
		if (isDesc) {
			this._items.reverse();
		}
		this._currentSortKey = key;
		this._isDesc = isDesc;
		this.onUpdate(true);
	}
	sort() {
		this.sortBy(this._currentSortKey, this._isDesc);
	}
	getCurrentSortKey() {
		return this._currentSortKey;
	}
	onUpdate(replaceAll = false) {
		this.emitAsync('update', this._items, replaceAll);
	}
	getInViewIndex(sec) {
		return Math.max(0, _.sortedLastIndex(this._positions, sec + 1) - 1);
	}
	set currentTime(sec) {
		if (this._currentTime !== sec && typeof sec === 'number') {
			this._currentTime = sec;
			if (this._currentSortKey === 'vpos') {
				this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
			}
		}
	}
	get currentTime() {return this._currentTime;}
}
class CommentListView extends Emitter {
	constructor(params) {
		super();
		this._ItemView = CommentListItemView;
		this._itemCss = CommentListItemView.CSS;
		this._className = params.className || 'commentList';
		this._retryGetIframeCount = 0;
		this._cache = {};
		this._maxItems = 100000;
		this._inviewItemList = new Map;
		this._scrollTop = 0;
		this._model = params.model;
		if (this._model) {
			this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 500));
		}
		this.scrollTop = bounce.raf(this.scrollTop.bind(this));
		this._initializeView(params, 0);
	}
	async _initializeView(params) {
		const html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
		const frame = new FrameLayer({
			container: params.container,
			html,
			className: 'commentListFrame'
		});
		this._onIframeLoad(await frame.promise('GetReady!'));
	}
	_onIframeLoad(w) {
		const doc = this._document = w.document;
		this._window = w;
		const body = this._body = doc.body;
		const $body = this._$body = uq(body);
		if (this._className) {
			body.classList.add(this._className);
		}
		this._container = doc.querySelector('#listContainer');
		this._list = doc.getElementById('listContainerInner');
		if (this._html) {
			this._list.innerHTML = this._html;
		}
		this._$menu = $body.find('.listMenu');
		this._$itemDetail = $body.find('.itemDetailContainer');
		$body
			.on('click', this._onClick.bind(this))
			.on('dblclick', this._onDblClick.bind(this))
			.on('keydown', e => global.emitter.emit('keydown', e))
			.on('keyup', e => global.emitter.emit('keyup', e))
			.toggleClass('is-guest', !nicoUtil.isLogin())
			.toggleClass('is-premium', nicoUtil.isPremium());
		this._$menu.on('click', this._onMenuClick.bind(this));
		this._$itemDetail.on('click', this._onItemDetailClick.bind(this));
		this._container.addEventListener('mouseover', this._onMouseOver.bind(this));
		this._container.addEventListener('mouseleave', this._onMouseOut.bind(this));
		this._container.addEventListener('wheel', this._onWheel.bind(this), {passive: true});
		this._container.addEventListener('scroll', this._onScroll.bind(this), {passive: true});
		this._debouncedOnScrollEnd = _.debounce(this._onScrollEnd.bind(this), 500);
		w.addEventListener('resize', this._onResize.bind(this));
		this._innerHeight = w.innerHeight;
		this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
		this._appendNewItems = bounce.raf(this._appendNewItems.bind(this));
		cssUtil.registerProps(
			{name: '--current-time', syntax: '<time>', initialValue: cssUtil.s(0), inherits: true, window: w},
			{name: '--duration', syntax: '<time>', initialValue: cssUtil.s(4), inherits: true, window: w},
			{name: '--scroll-top',   syntax: '<number>', initialValue: 0, inherits: true, window: w},
			{name: '--time-scroll-top',   syntax: '<number>', initialValue: 0, inherits: true, window: w},
			{name: '--inner-height', syntax: '<number>', initialValue: 0, inherits: true, window: w},
			{name: '--list-height', syntax: '<number>', initialValue: 0, inherits: true, window: w},
			{name: '--height-pp', syntax: '<length>', initialValue: cssUtil.px(0), inherits: true, window: w},
			{name: '--trans-y-pp', syntax: '<length>', initialValue: cssUtil.px(0), inherits: true, window: w},
			{name: '--vpos-time', syntax: '<time>', initialValue: cssUtil.s(0), inherits: true, window: w}
		);
		body.style.setProperty('--inner-height', this._innerHeight);
		this._debouncedOnItemClick = _.debounce(this._onItemClick.bind(this), 300);
		global.debug.$commentList = uq(this._list);
		global.debug.getCommentPanelItems = () =>
			Array.from(doc.querySelectorAll('.commentListItem'));
	}
	_onModelUpdate(itemList, replaceAll) {
		window.console.time('update commentlistView');
		this.addClass('updating');
		itemList = Array.isArray(itemList) ? itemList : [itemList];
		this.isActive = false;
		if (replaceAll) {
			this._scrollTop = 0;
		}
		const itemViews = itemList.map((item, i) =>
			new this._ItemView({item: item, index: i, height: CommentListView.ITEM_HEIGHT})
		);
		this._itemViews = itemViews;
		window.setTimeout(() => {
			if (!this._list) { return; }
			this._list.textContent = '';
			this._body.style.setProperty('--list-height',
					Math.max(CommentListView.ITEM_HEIGHT * itemViews.length + 100,
					this._innerHeight)
				);
			this._inviewItemList.clear();
			this._$menu.removeClass('show');
			this._refreshInviewElements();
			this.hideItemDetail();
		}, 0);
		window.setTimeout(() => {
			this.removeClass('updating');
			this.emit('update');
		}, 100);
		window.console.timeEnd('update commentlistView');
	}
	_onClick(e) {
		e.stopPropagation();
		global.emitter.emitAsync('hideHover');
		const item = e.target.closest('.commentListItem');
		if (item) {
			return this._debouncedOnItemClick(e, item);
		}
	}
	_onItemClick(e, item) {
		if (e.target.closest('.nicoru-icon')) {
			item.classList.add('nicotta');
			item.dataset.nicoru = item.dataset.nicoru ? (item.dataset.nicoru * 1 + 1) : 1;
			this.emit('command', 'nicoru', item, item.dataset.itemId);
			return;
		}
		this._$menu
			.css('transform', `translate(0, ${item.dataset.top}px)`)
			.attr('data-item-id', item.dataset.itemId)
			.addClass('show');
	}
	_onMenuClick(e) {
		const target = e.target.closest('.menuButton');
		this._$menu.removeClass('show');
		if (!target) {
			return;
		}
		const {itemId} = e.target.closest('.listMenu').dataset;
		if (!itemId) {
			return;
		}
		const {command} = target.dataset;
		if (command === 'addUserIdFilter' || command === 'addWordFilter') {
			Array.from(this._list.querySelectorAll(`.item${itemId}`))
				.forEach(e => e.remove());
		}
		this.emit('command', command, null, itemId);
	}
	_onItemDetailClick(e) {
		const target = e.target.closest('.command');
		if (!target) {
			return;
		}
		const itemId = this._$itemDetail.attr('data-item-id');
		if (!itemId) {
			return;
		}
		const {command, param} = target.dataset;
		if (command === 'hideItemDetail') {
			return this.hideItemDetail();
		}
		if (command === 'reloadComment') {
			this.hideItemDetail();
		}
		this.emit('command', command, param, itemId);
	}
	_onDblClick(e) {
		e.stopPropagation();
		const item = e.target.closest('.commentListItem');
		if (!item) {
			return;
		}
		e.preventDefault();
		const itemId = item.dataset.itemId;
		this.emit('command', 'select', null, itemId);
	}
	_onMouseMove() {
		this.isActive = true;
		this.addClass('is-active');
	}
	_onMouseOver() {
		this.isActive = true;
		this.addClass('is-active');
	}
	_onWheel() {
		this.isActive = true;
		this.addClass('is-active');
	}
	_onMouseOut() {
		this.isActive = false;
		this.removeClass('is-active');
	}
	_onResize() {
		this._innerHeight = this._window.innerHeight;
		this._body.style.setProperty('--inner-height', this._innerHeight);
		this._refreshInviewElements();
	}
	_onScroll() {
		if (!this.hasClass('is-scrolling')) {
			this.addClass('is-scrolling');
		}
		this._refreshInviewElements();
		this._debouncedOnScrollEnd();
	}
	_onScrollEnd() {
		this.removeClass('is-scrolling');
	}
	_refreshInviewElements() {
		if (!this._list) {
			return;
		}
		const itemHeight = CommentListView.ITEM_HEIGHT;
		const scrollTop = this._container.scrollTop;
		const innerHeight = this._innerHeight;
		const windowBottom = scrollTop + innerHeight;
		const itemViews = this._itemViews;
		const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
		const endIndex = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
		const newItems = [], inviewItemList = this._inviewItemList;
		for (let i = startIndex; i < endIndex; i++) {
			if (inviewItemList.has(i) || !itemViews[i]) {
				continue;
			}
			newItems.push(itemViews[i]);
			inviewItemList.set(i, itemViews[i]);
		}
		if (!newItems.length) {
			return;
		}
		for (const i of inviewItemList.keys()) {
			if (i >= startIndex && i <= endIndex) {
				continue;
			}
			inviewItemList.get(i).remove();
			inviewItemList.delete(i);
		}
		this._newItems = this._newItems ? this._newItems.concat(newItems) : newItems;
		this._appendNewItems();
	}
	_appendNewItems() {
		if (this._newItems) {
			const f = this._appendFragment = this._appendFragment || document.createDocumentFragment();
			f.append(...this._newItems.map(i => i.viewElement));
			this._list.append(f);
		}
		this._newItems = null;
	}
	_updatePerspective() {
		const keys = Object.keys(this._inviewItemList);
		let avr = 0;
		if (!this._inviewItemList.size) {
			avr = 50;
		} else {
			let min = 0xffff;
			let max = -0xffff;
			keys.forEach(key => {
				let item = this._inviewItemList.get(key);
				min = Math.min(min, item.time3dp);
				max = Math.max(max, item.time3dp);
				avr += item.time3dp;
			});
			avr = avr / keys.length * 100 + 50; //max * 100; //(min + max) / 2 + 10; //50 + avr / keys.length;
		}
		this._list.style.transform = `translateZ(-${avr}px)`;
	}
	addClass(className) {
		this.toggleClass(className, true);
	}
	removeClass(className) {
		this.toggleClass(className, false);
	}
	toggleClass(className, v) {
		if (!this._body) {
			return;
		}
		this._body.classList.toggle(className, v);
	}
	hasClass(className) {
		return this._body.classList.contains(className);
	}
	find(query) {
		return this._document.querySelectorAll(query);
	}
	scrollTop(v) {
		if (!this._window) {
			return 0;
		}
		if (typeof v === 'number') {
			this._scrollTop = v;
			this._container.scrollTop = v;
			this._body.style.setProperty('--scroll-top', v);
		} else {
			this._scrollTop = this._container.scrollTop;
			this._body.style.setProperty('--scroll-top', this._scrollTop);
			return this._scrollTop;
		}
	}
	setCurrentPoint(sec, idx) {
		if (!this._window || !this._itemViews) {
			return;
		}
		const innerHeight = this._innerHeight;
		const itemViews = this._itemViews;
		const len = itemViews.length;
		const view = itemViews[idx];
		if (len < 1 || !view) {
			return;
		}
		const itemHeight = CommentListView.ITEM_HEIGHT;
		const top = Math.max(0, view.top - innerHeight + itemHeight);
		this._body.style.setProperty('--time-scroll-top', top);
		if (!this.isActive) {
				this.scrollTop(top);
		}
		requestAnimationFrame(() => {
			this._body.style.setProperty('--current-time', css.s(sec));
		});
	}
	showItemDetail(item) {
		const $d = this._$itemDetail;
		$d.attr('data-item-id', item.itemId);
		$d.find('.resNo').text(item.no).end()
			.find('.vpos').text(item.timePos).end()
			.find('.time').text(item.formattedDate).end()
			.find('.userId').text(item.userId).end()
			.find('.cmd').text(item.cmd).end()
			.find('.text').text(item.text).end()
			.addClass('show');
		global.debug.$itemDetail = $d;
	}
	hideItemDetail() {
		this._$itemDetail.removeClass('show');
	}
}
CommentListView.ITEM_HEIGHT = 40;
CommentListView.__css__ = '';
CommentListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
	${CONSTANT.BASE_CSS_VARS}
	body {
		user-select: none;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
	body .is-debug {
		perspective: 100px;
		perspective-origin: left top;
		transition: perspective 0.2s ease;
	}
	body.is-scrolling #listContainerInner *{
		pointer-events: none;
	}
	#listContainer {
		position: absolute;
		top: -1px;
		left:0;
		margin: 0;
		padding: 0;
		width: 100vw;
		height: 100vh;
		overflow: auto;
		overscroll-behavior: contain;
		will-change: transform;
		scrollbar-width: 16px;
	}
	#listContainerInner {
		height: calc(var(--list-height) * 1px);
		min-height: calc(100vh + 100px);
	}
	.is-debug #listContainerInner {
		transform-style: preserve-3d;
		transform: translateZ(-50px);
		transition: transform 0.2s;
	}
	#listContainerInner:empty::after {
		content: 'コメントは空です';
		color: #666;
		display: inline-block;
		text-align: center;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	.is-guest .forMember {
		display: none !important;
	}
	.itemDetailContainer {
		position: fixed;
		display: block;
		top: 50%;
		left: 50%;
		line-height: normal;
		min-width: 280px;
		max-height: 100%;
		overflow-y: scroll;
		overscroll-behavior: contain;
		font-size: 14px;
		transform: translate(-50%, -50%);
		opacity: 0;
		pointer-events: none;
		z-index: 100;
		border: 2px solid #fc9;
		background-color: rgba(255, 255, 232, 0.9);
		box-shadow: 4px 4px 0 rgba(99, 99, 66, 0.8);
		transition: opacity 0.2s;
	}
	.itemDetailContainer.show {
		opacity: 1;
		pointer-events: auto;
	}
	.itemDetailContainer>* {
	}
	.itemDetailContainer * {
		word-break: break-all;
	}
	.itemDetailContainer .reloadComment {
		display: inline-block;
		padding: 0 4px;
		cursor: pointer;
		transform: scale(1.4);
		transition: transform 0.1s;
	}
	.itemDetailContainer .reloadComment:hover {
		transform: scale(1.8);
	}
	.itemDetailContainer .reloadComment:active {
		transform: scale(1.2);
		transition: none;
	}
	.itemDetailContainer .resNo,
	.itemDetailContainer .vpos,
	.itemDetailContainer .time,
	.itemDetailContainer .userId,
	.itemDetailContainer .cmd {
		font-size: 12px;
	}
	.itemDetailContainer .time {
		cursor: pointer;
		color: #339;
	}
	.itemDetailContainer .time:hover {
		text-decoration: underline;
	}
	.itemDetailContainer .time:hover:after {
		position: absolute;
		content: '${'\\00231A'} 過去ログ';
		right: 16px;
		text-decoration: none;
		transform: scale(1.4);
	}
	.itemDetailContainer .resNo:before,
	.itemDetailContainer .vpos:before,
	.itemDetailContainer .time:before,
	.itemDetailContainer .userId:before,
	.itemDetailContainer .cmd:before {
		display: inline-block;
		min-width: 50px;
	}
	.itemDetailContainer .resNo:before {
		content: 'no';
	}
	.itemDetailContainer .vpos:before {
		content: 'pos';
	}
	.itemDetailContainer .time:before {
		content: 'date';
	}
	.itemDetailContainer .userId:before {
		content: 'user';
	}
	.itemDetailContainer .cmd:before {
		content: 'cmd';
	}
	.itemDetailContainer .text {
		border: 1px inset #ccc;
		padding: 8px;
		margin: 4px 8px;
	}
	.itemDetailContainer .close {
		border: 2px solid #666;
		width: 50%;
		cursor: pointer;
		text-align: center;
		margin: auto;
		user-select: none;
	}
	.timeBar {
		position: fixed;
		visibility: hidden;
		z-index: 100;
		right: 0;
		top: 1px;
		width: 14px;
		--height-pp: calc( 1px * var(--inner-height) * var(--inner-height) / var(--list-height) );
		--trans-y-pp: calc( 1px * var(--inner-height) * var(--time-scroll-top) / var(--list-height) - 2px);
		height: var(--height-pp);
		min-height: 16px;
		max-height: 100vh;
		transform: translateY(var(--trans-y-pp));
		transition: transform 0.2s;
		pointer-events: none;
		will-change: transform;
		border: 1px solid #e12885;/*#FC6c6c;*/
	}
	.timeBar::after {
		width: calc(100% + 6px);
		height: calc(100% + 6px);
		left: -3px;
		top: -3px;
		content: '';
		position: absolute;
		border: 2px solid #2b2b2b;
		outline: 2px solid #2b2b2b;
		outline-offset: -5px;
		box-sizing: border-box;
	}
	body:hover .timeBar {
		visibility: visible;
	}
</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
	<div class="itemDetailContainer">
		<div class="resNo"></div>
		<div class="vpos"></div>
		<div class="time command" data-command="reloadComment"></div>
		<div class="userId"></div>
		<div class="cmd"></div>
		<div class="text"></div>
		<div class="command close" data-command="hideItemDetail">O K</div>
	</div>
	<div class="timeBar"></div>
	<div id="listContainer">
		<div class="listMenu">
			<span class="menuButton itemDetailRequest"
				data-command="itemDetailRequest" title="詳細">？</span>
			<span class="menuButton clipBoard"        data-command="clipBoard" title="クリップボードにコピー">copy</span>
			<span class="menuButton addUserIdFilter"  data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
			<span class="menuButton addWordFilter"    data-command="addWordFilter" title="NGワード">NGword</span>
		</div>
		<div id="listContainerInner"></div>
	</div>
</body>
</html>
	`).trim();
const CommentListItemView = (() => {
	const CSS = (`
			* {
				box-sizing: border-box;
			}
			body {
				background: #000;
				margin: 0;
				padding: 0;
				overflow: hidden;
				line-height: 0;
			}
			${CONSTANT.SCROLLBAR_CSS}
			.listMenu {
				position: absolute;
				display: block;
			}
			.listMenu.show {
				display: block;
				width: 100%;
				left: 0;
				z-index: 100;
			}
			.listMenu  .menuButton {
				display: inline-block;
				position: absolute;
				font-size: 13px;
				line-height: 20px;
				border: 1px solid #666;
				color: #fff;
				background: #666;
				cursor: pointer;
				top: 0;
				text-align: center;
			}
			.listMenu .menuButton:hover {
				border: 1px solid #ccc;
				box-shadow: 2px 2px 2px #333;
			}
			.listMenu .menuButton:active {
				box-shadow: none;
				transform: translate(0, 1px);
			}
			.listMenu .itemDetailRequest {
				right: 176px;
				width: auto;
				padding: 0 8px;
			}
			.listMenu .clipBoard {
				right: 120px;
				width: 48px;
			}
			.listMenu .addWordFilter {
				right: 64px;
				width: 48px;
			}
			.listMenu .addUserIdFilter {
				right: 8px;
				width: 48px;
			}
			.commentListItem {
				position: absolute;
				display: inline-block;
				width: 100%;
				height: 40px;
				line-height: 20px;
				font-size: 20px;
				white-space: nowrap;
				margin: 0;
				padding: 0;
				background: #222;
				z-index: 50;
				contain: layout style paint;
			}
			.is-active .commentListItem {
				pointer-events: auto;
			}
			.commentListItem * {
				cursor: default;
			}
			.commentListItem.odd {
				background: #333;
			}
			.commentListItem[data-nicoru] {
				background: #332;
			}
			.commentListItem.odd[data-nicoru] {
				background: #443;
			}
			.commentListItem[data-nicoru]:hover::before {
				position: absolute;
				content: attr(data-nicoru);
				color: #ccc;
				font-size: 12px;
				left: 80px;
				/* font-family: cursive; */
			}
			.commentListItem .nicoru-icon {
				position: absolute;
				pointer-events: none;
				display: inline-block;
				cursor: pointer;
				visibility: hidden;
				transition: transform 0.2s linear, filter 0.2s;
				transform-origin: center;
				left: 50px;
				top: -2px;
				width: 24px;
				height: 24px;
				contain: strict;
			}
			.commentListItem:hover .nicoru-icon {
				visibility: visible;
			}
			.is-premium .commentListItem:hover .nicoru-icon {
				pointer-events: auto;
			}
			.commentListItem.nicotta .nicoru-icon {
				visibility: visible;
				transform: rotate(270deg);
				filter: drop-shadow(0px 0px 6px gold);
				pointer-events: none;
			}
			.commentListItem.updating {
				opacity: 0.5;
				cursor: wait;
			}
			.commentListItem .info {
				display: flex;
				justify-content: space-between;
				width: 100%;
				font-size: 14px;
				height: 20px;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				color: #888;
				margin: 0;
				padding: 0 8px 0;
			}
			.commentListItem[data-valhalla="1"] .info {
				color: #f88;
			}
			.commentListItem .timepos {
				display: inline-block;
				width: 100px;
			}
			.commentListItem .text {
				display: block;
				font-size: 16px;
				height: 20px;
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
				color: #ccc;
				margin: 0;
				padding: 0 8px;
				font-family: '游ゴシック', 'Yu Gothic', 'YuGothic', arial, 'Menlo';
				font-feature-settings: "palt" 1;
			}
			.commentListItem[data-valhalla="1"] .text {
				color: red;
				font-weight: bold;
			}
			.is-active .commentListItem:hover {
				overflow-x: hidden;
				overflow-y: visible;
				z-index: 60;
				height: auto;
				box-shadow: 2px 2px 2px #000, 2px -2px 2px #000;
			}
			.is-active .commentListItem:hover .text {
				white-space: normal;
				word-break: break-all;
				height: auto;
			}
			.commentListItem.fork1 .timepos {
				text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
			}
			.commentListItem.fork2 .timepos {
				text-shadow: 1px 1px 0 #880000, -1px -1px 0 #880000 !important;
			}
			.commentListItem.fork2 .text,
			.commentListItem.fork1 .text {
				font-weight: bolder;
			}
			.begin ~ .commentListItem .text {
				color: #ffe;
				font-weight: bolder;
			}
			.end ~ .commentListItem .text {
				color: #ccc;
				font-weight: normal;
			}
			.commentListItem.subThread {
				opacity: 0.6;
			}
			.commentListItem.is-active {
				outline: dashed 2px #ff8;
				outline-offset: 4px;
			}
			.font-gothic .text {font-family: "游ゴシック", "Yu Gothic", 'YuGothic', "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
			.font-mincho .text {font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, Osaka-mono, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;}
			.font-defont .text {font-family: 'Yu Gothic', 'YuGothic', "ＭＳ ゴシック", "MS Gothic", "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }
			.commentListItem .progress-negi {
				position: absolute;
				width: 2px;
				height: 100%;
				bottom: 0;
				right: 0;
				pointer-events: none;
				background: #888;
				will-change: transform;
				transition: transform var(--duration) linear;
				animation-duration: var(--duration);
				animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
				animation-name: negi-moving;
				animation-timing-function: linear;
				animation-fill-mode: forwards;
				animation-play-state: paused !important;
				contain: paint layout style size;
			}
			@keyframes negi-moving {
				0% { background: #ebe194;}
				50% { background: #fff; }
				80% { background: #fff; }
				100% { background: #039393; }
			}
		`).trim();
	const TPL = (`
			<div class="commentListItem" style="position: absolute;">
				<img src="${NICORU}" class="nicoru-icon" data-command="nicoru" title="Nicorü">
				<p class="info">
					<span class="timepos"></span>&nbsp;&nbsp;<span class="date"></span>
				</p>
				<p class="text"></p>
				<span class="progress-negi" style="position: absolute; will-change: transform; contain: paint layout style size;"></span>
			</div>
		`).trim();
	let counter = 0;
	let template;
	class CommentListItemView {
		static get template() {
			if (!template) {
				const t = document.createElement('template');
				t.id = 'CommentListItemView-template' + Date.now();
				t.innerHTML = TPL;
				document.body.append(t);
				template = {
					t,
					clone: () => {
						return document.importNode(t.content, true).firstChild;
					},
					commentListItem: t.content.querySelector('.commentListItem'),
					timepos: t.content.querySelector('.timepos'),
					date: t.content.querySelector('.date'),
					text: t.content.querySelector('.text')
				};
			}
			return template;
		}
		constructor(params) {
			this.initialize(params);
		}
		initialize(params) {
			this._item = params.item;
			this._index = params.index;
			this._height = params.height;
			this._id = counter++;
		}
		build() {
			const template = this.constructor.template;
			const {commentListItem, timepos, date, text} = template;
			const item = this._item;
			const oden = (this._index % 2 === 0) ? 'even' : 'odd';
			const time3dp = Math.round(this._item.time3dp * 100);
			const formattedDate = item.formattedDate;
			commentListItem.id = this.domId;
			const font = item.fontCommand || 'default';
			commentListItem.className =
				`commentListItem no${item.no} item${this._id} ${oden} fork${item.fork} font-${font} ${item.isSubThread ? 'subThread' : ''}`;
			commentListItem.classList.toggle('nicotta', item.nicotta);
			commentListItem.style.cssText = `
					top: ${this.top}px;
					--duration: ${item.duration}s;
					--vpos-time: ${item.vpos / 100}s;
				`;
			Object.assign(commentListItem.dataset, {
				itemId: item.itemId,
				no: item.no,
				uniqNo: item.uniqNo,
				vpos: item.vpos,
				top: this.top,
				thread: item.threadId,
				title: `${item.no}: ${formattedDate} ID:${item.userId}\n${item.text}`,
				time3dp,
				valhalla: item.valhalla,
			});
			item.nicoru > 0 ?
				(commentListItem.dataset.nicoru = item.nicoru) :
				(delete commentListItem.dataset.nicoru);
			timepos.textContent = item.timePos;
			date.textContent = formattedDate;
			text.textContent = item.text.trim();
			const color = item.color;
			text.style.textShadow = color ? `0px 0px 2px ${color}` : '';
			this._view = template.clone();
		}
		get viewElement() {
			if (!this._view) {
				this.build();
			}
			return this._view;
		}
		get itemId() {
			return this._item.itemId;
		}
		get domId() {
			return `item${this._item.itemId}`;
		}
		get top() {
			return this._index * this._height;
		}
		remove() {
			if (!this._view) {
				return;
			}
			this._view.remove();
		}
		toString() {
			return this.viewElement.outerHTML;
		}
		get time3dp() {
			return this._item.time3dp;
		}
		get time3d() {
			return this._item.time3d;
		}
		get nicotta() {
			return this._item.nicotta;
		}
		set nicotta(v) {
			this._item.nicotta = v;
			this._view.classList.toggle('nicotta', v);
		}
		get nicoru() {
			return this._item.nicoru;
		}
		set nicoru(v) {
			this._item.nicoru = v;
			v > 0 ?
				(this._view.dataset.nicoru = v) : (delete this._view.dataset.nicoru);
		}
	}
	CommentListItemView.TPL = TPL;
	CommentListItemView.CSS = CSS;
	return CommentListItemView;
})();
class CommentListItem {
	constructor(nicoChat) {
		this.nicoChat = nicoChat;
		this._itemId = CommentListItem._itemId++;
		this._vpos = nicoChat.vpos;
		this._text = nicoChat.text;
		this._escapedText = textUtil.escapeHtml(this._text);
		this._userId = nicoChat.userId;
		this._date = nicoChat.date;
		this._fork = nicoChat.fork;
		this._no = nicoChat.no;
		this._color = nicoChat.color;
		this._fontCommand = nicoChat.fontCommand;
		this._isSubThread = nicoChat.isSubThread;
		this._formattedDate = textUtil.dateToString(this._date * 1000);
		this._timePos = textUtil.secToTime(this._vpos / 100);
	}
	get itemId() {return this._itemId;}
	get vpos() {return this._vpos;}
	get timePos() {return this._timePos;}
	get cmd() {return this.nicoChat.cmd;}
	get text() {return this._text;}
	get escapedText() {return this._escapedText;}
	get userId() {return this._userId;}
	get color() {return this._color;}
	get date() {return this._date;}
	get time() {return this._date * 1000;}
	get formattedDate() {return this._formattedDate;}
	get fork() {return this._fork;}
	get no() {return this._no;}
	get uniqNo() {return this.nicoChat.uniqNo;}
	get fontCommand() {return this._fontCommand;}
	get isSubThread() {return this._isSubThread;}
	get threadId() {return this.nicoChat.threadId;}
	get time3d() {return this.nicoChat.time3d;}
	get time3dp() {return this.nicoChat.time3dp;}
	get nicoru() {return this.nicoChat.nicoru;}
	set nicoru(v) { this.nicoChat.nicoru = v;}
	get duration() {return this.nicoChat.duration;}
	get valhalla() {return this.nicoChat.valhalla;}
	get nicotta() { return this.nicoChat.nicotta;}
	set nicotta(v) { this.nicoChat.nicotta = v; }
}
CommentListItem._itemId = 0;
class CommentPanelView extends Emitter {
	constructor(params) {
		super();
		this._$container = params.$container;
		this._model = params.model;
		this._commentPanel = params.commentPanel;
		css.addStyle(CommentPanelView.__css__);
		let $view = this._$view = uq.html(CommentPanelView.__tpl__);
		this._$container.append($view);
		const $menu = this._$menu = this._$view.find('.commentPanel-menu');
		global.debug.commentPanelView = this;
		let listView = this._listView = new CommentListView({
			container: this._$view.find('.commentPanel-frame')[0],
			model: this._model,
			className: 'commentList',
			builder: CommentListItemView,
			itemCss: CommentListItemView.__css__
		});
		listView.on('command', this._onCommand.bind(this));
		this._timeMachineView = new TimeMachineView({
			parentNode: document.querySelector('.timeMachineContainer')
		});
		this._timeMachineView.on('command', this._onCommand.bind(this));
		this._commentPanel.on('threadInfo',
			_.debounce(this._onThreadInfo.bind(this), 100));
		this._commentPanel.on('update',
			_.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
		this._commentPanel.on('itemDetailResp',
			_.debounce(item => listView.showItemDetail(item), 100));
		this._onCommentPanelStatusUpdate();
		this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));
		this._$view.on('click', this._onCommentListCommandClick.bind(this));
		global.emitter.on('hideHover', () => $menu.removeClass('show'));
	}
	toggleClass(className, v) {
		this._view.toggleClass(className, v);
		this._$view.toggleClass(className, v);
	}
	_onModelCurrentTimeUpdate(sec, viewIndex) {
		if (!this._$view){ //} || !this._$view.is(':visible')) {
			return;
		}
		this._lastCurrentTime = sec;
		this._listView.setCurrentPoint(sec, viewIndex);
	}
	_onCommand(command, param, itemId) {
		switch (command) {
			case 'nicoru':
				param.nicotta = true;
				this.emit('command', command, param, itemId);
				break;
			default:
				this.emit('command', command, param, itemId);
				break;
		}
	}
	_onCommentListCommandClick(e) {
		const target = e.target.closest('[data-command]');
		if (!target) { return; }
		const {command, param} = target.dataset;
		e.stopPropagation();
		if (!command) {
			return;
		}
		const $view = this._$view;
		const setUpdating = () => {
			document.activeElement.blur();
			$view.addClass('updating');
			window.setTimeout(() => $view.removeClass('updating'), 1000);
		};
		switch (command) {
			case 'sortBy':
				setUpdating();
				this.emit('command', command, param);
				break;
			case 'reloadComment':
				setUpdating();
				this.emit('command', command, param);
				break;
			default:
				this.emit('command', command, param);
		}
		global.emitter.emitAsync('hideHover');
	}
	_onThreadInfo(threadInfo) {
		this._timeMachineView.update(threadInfo);
	}
	_onCommentPanelStatusUpdate() {
		const commentPanel = this._commentPanel;
		const $view = this._$view
			.toggleClass('autoScroll', commentPanel.isAutoScroll);
		const langClass = `lang-${commentPanel.getLanguage()}`;
		if (!$view.hasClass(langClass)) {
			$view.removeClass('lang-ja_JP lang-en_US lang-zh_TW').addClass(langClass);
		}
	}
}
CommentPanelView.__css__ = `
		:root {
			--zenza-comment-panel-header-height: 64px;
		}
		.commentPanel-container {
			height: 100%;
			overflow: hidden;
			user-select: none;
		}
		.commentPanel-header {
			height: var(--zenza-comment-panel-header-height);
			border-bottom: 1px solid #000;
			background: #333;
			color: #ccc;
		}
		.commentPanel-menu-button {
			display: inline-block;
			cursor: pointer;
			border: 1px solid #333;
			padding: 0px 4px;
			margin: 0 4px;
			background: #666;
			font-size: 16px;
			line-height: 28px;
			white-space: nowrap;
		}
		.commentPanel-menu-button:hover {
			border: 1px outset;
		}
		.commentPanel-menu-button:active {
			border: 1px inset;
		}
		.commentPanel-menu-button .commentPanel-menu-icon {
			font-size: 24px;
			line-height: 28px;
		}
		.commentPanel-container.autoScroll .autoScroll {
			text-shadow: 0 0 6px #f99;
			color: #ff9;
		}
		.commentPanel-frame {
			height: calc(100% - var(--zenza-comment-panel-header-height));
			transition: opacity 0.3s;
		}
		.updating .commentPanel-frame,
		.shuffle .commentPanel-frame {
			opacity: 0;
		}
		.commentPanel-menu-toggle {
			position: absolute;
			right: 8px;
			display: inline-block;
			font-size: 14px;
			line-height: 32px;
			cursor: pointer;
			outline: none;
		}
		.commentPanel-menu-toggle:focus-within {
			pointer-events: none;
		}
		.commentPanel-menu-toggle:focus-within .zenzaPopupMenu {
			pointer-events: auto;
			visibility: visible;
			opacity: 0.99;
			pointer-events: auto;
			transition: opacity 0.3s;
		}
		.commentPanel-menu {
			position: absolute;
			right: 0px;
			top: 24px;
			min-width: 150px;
		}
		.commentPanel-menu li {
			line-height: 20px;
		}
		.commentPanel-container.lang-ja_JP .commentPanel-command[data-param=ja_JP],
		.commentPanel-container.lang-en_US .commentPanel-command[data-param=en_US],
		.commentPanel-container.lang-zh_TW .commentPanel-command[data-param=zh_TW] {
			font-weight: bolder;
			color: #ff9;
		}
	`.trim();
CommentPanelView.__tpl__ = (`
		<div class="commentPanel-container">
			<div class="commentPanel-header">
				<label class="commentPanel-menu-button autoScroll commentPanel-command"
					data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</label>
				<div class="commentPanel-command commentPanel-menu-toggle" tabindex="-1">
					▼ メニュー
					<div class="zenzaPopupMenu commentPanel-menu">
						<div class="listInner">
						<ul>
							<li class="commentPanel-command" data-command="sortBy" data-param="vpos">
								コメント位置順に並べる
							</li>
							<li class="commentPanel-command" data-command="sortBy" data-param="date:desc">
								コメントの新しい順に並べる
							</li>
							<li class="commentPanel-command" data-command="sortBy" data-param="nicoru:desc">
								ニコる数で並べる
							</li>
							<hr class="separator">
							<li class="commentPanel-command" data-command="update-commentLanguage" data-param="ja_JP">
								日本語
							</li>
							<li class="commentPanel-command" data-command="update-commentLanguage" data-param="en_US">
								English
							</li>
							<li class="commentPanel-command" data-command="update-commentLanguage" data-param="zh_TW">
								中文
							</li>
						</ul>
						</div>
					</div>
				</div>
			<div class="timeMachineContainer"></div>
			</div>
			<div class="commentPanel-frame"></div>
		</div>
	`).trim();
class CommentPanel extends Emitter {
	constructor(params) {
		super();
		this._thumbInfoLoader = params.loader || global.api.ThumbInfoLoader;
		this._$container = params.$container;
		const player = this._player = params.player;
		this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;
		this._model = new CommentListModel({});
		this._language = params.language || 'ja_JP';
		player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
		player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
		player.on('commentReady', _.debounce(this._onCommentReady.bind(this), 500));
		player.on('open', this._onPlayerOpen.bind(this));
		player.on('close', this._onPlayerClose.bind(this));
		global.debug.commentPanel = this;
	}
	_initializeView() {
		if (this._view) {
			return;
		}
		this._view = new CommentPanelView({
			$container: this._$container,
			model: this._model,
			commentPanel: this,
			builder: CommentListItemView,
			itemCss: CommentListItemView.__css__
		});
		this._view.on('command', this._onCommand.bind(this));
	}
	startTimer() {
		this.stopTimer();
		this._timer = window.setInterval(this._onTimer.bind(this), 200);
	}
	stopTimer() {
		if (this._timer) {
			window.clearInterval(this._timer);
			this._timer = null;
		}
	}
	_onTimer() {
		if (this._autoScroll) {
			this.currentTime=this._player.currentTime;
		}
	}
	_onCommand(command, param, itemId) {
		let item;
		if (itemId) {
			item = this._model.findByItemId(itemId);
		}
		switch (command) {
			case 'toggleScroll':
				this.toggleScroll();
				break;
			case 'sortBy': {
				const tmp = param.split(':');
				this.sortBy(tmp[0], tmp[1] === 'desc');
				break;}
			case 'select':{
				const vpos = item.vpos;
				this.emit('command', 'seek', vpos / 100);
				break;}
			case 'clipBoard':
				Clipboard.copyText(item.text);
				this.emit('command', 'notify', 'クリップボードにコピーしました');
				break;
			case 'addUserIdFilter':
				this._model.removeItem(item);
				this.emit('command', command, item.userId);
				break;
			case 'addWordFilter':
				this._model.removeItem(item);
				this.emit('command', command, item.text);
				break;
			case 'reloadComment':
				if (item) {
					param = {};
					const dt = new Date(item.time);
					this.emit('command', 'notify', item.formattedDate + '頃のログ');
					param.when = Math.floor(dt.getTime() / 1000);
				}
				this.emit('command', command, param);
				break;
			case 'itemDetailRequest':
				if (item) {
					this.emit('itemDetailResp', item);
				}
				break;
			case 'nicoru':
				item.nicotta = true;
				item.nicoru += 1;
				this.emit('command', command, item.nicoChat);
				break;
			default:
				this.emit('command', command, param);
		}
	}
	_onCommentParsed(language) {
		this.setLanguage(language);
		this._initializeView();
		this.setChatList(this._player.chatList);
		this.startTimer();
	}
	_onCommentChange(language) {
		this.setLanguage(language);
		this._initializeView();
		this.setChatList(this._player.chatList);
	}
	_onCommentReady(result, threadInfo) {
		this._threadInfo = threadInfo;
		this.emit('threadInfo', threadInfo);
	}
	_onPlayerOpen() {
		this._model.clear();
	}
	_onPlayerClose() {
		this._model.clear();
		this.stopTimer();
	}
	setChatList(chatList) {
		if (!this._model) {
			return;
		}
		this._model.setChatList(chatList);
	}
	get isAutoScroll() {
		return this._autoScroll;
	}
	getLanguage() {
		return this._language || 'ja_JP';
	}
	getThreadInfo() {
		return this._threadInfo;
	}
	setLanguage(lang) {
		if (lang !== this._language) {
			this._language = lang;
			this.emit('update');
		}
	}
	toggleScroll(v) {
		if (!_.isBoolean(v)) {
			this._autoScroll = !this._autoScroll;
			if (this._autoScroll) {
				this._model.sortBy('vpos');
			}
			this.emit('update');
			return;
		}
		if (this._autoScroll !== v) {
			this._autoScroll = v;
			if (this._autoScroll) {
				this._model.sortBy('vpos');
			}
			this.emit('update');
		}
	}
	sortBy(key, isDesc) {
		this._model.sortBy(key, isDesc);
		if (key !== 'vpos') {
			this.toggleScroll(false);
		}
	}
	set currentTime(sec) {
		if (!this._view || !this._autoScroll || this._player.currentTab !== 'comment') {
			return;
		}
		this._model.currentTime = sec;
	}
	get currentTime() {
		return this._model.currentTime;
	}
}
class TimeMachineView extends BaseViewComponent {
	constructor({parentNode}) {
		super({
			parentNode,
			name: 'TimeMachineView',
			template: '<div class="TimeMachineView"></div>',
			shadow: TimeMachineView._shadow_,
			css: ''
		});
		this._bound._onTimer = this._onTimer.bind(this);
		this._state = {
			isWaybackMode: false,
			isSelecting: false,
		};
		this._currentTimestamp = Date.now();
		global.debug.timeMachineView = this;
		window.setInterval(this._bound._onTimer, 3 * 1000);
	}
	_initDom(...args) {
		super._initDom(...args);
		const v = this._shadow || this._view;
		Object.assign(this._elm, {
			time: v.querySelector('.dateTime'),
			back: v.querySelector('.backToTheFuture'),
			input: v.querySelector('.dateTimeInput'),
			submit: v.querySelector('.dateTimeSubmit'),
			cancel: v.querySelector('.dateTimeCancel')
		});
		this._updateTimestamp();
		this._elm.time.addEventListener('click', this._toggle.bind(this));
		this._elm.back.addEventListener('mousedown', _.debounce(this._onBack.bind(this), 300));
		this._elm.submit.addEventListener('click', this._onSubmit.bind(this));
		this._elm.cancel.addEventListener('click', this._onCancel.bind(this));
	}
	update(threadInfo) {
		this._videoPostTime = threadInfo.threadId * 1000;
		const isWaybackMode = threadInfo.isWaybackMode;
		this.setState({isWaybackMode, isSelecting: false});
		if (isWaybackMode) {
			this._currentTimestamp = threadInfo.when * 1000;
		} else {
			this._currentTimestamp = Date.now();
		}
		this._updateTimestamp();
	}
	_updateTimestamp() {
		if (isNaN(this._currentTimestamp)) {
			return;
		}
		this._elm.time.textContent = this._currentTime = this._toDate(this._currentTimestamp);
	}
	openSelect() {
		const input = this._elm.input;
		const now = this._toTDate(Date.now());
		input.setAttribute('max', now);
		input.setAttribute('value', this._toTDate(this._currentTimestamp));
		input.setAttribute('min', this._toTDate(this._videoPostTime));
		this.setState({isSelecting: true});
		window.setTimeout(() => {
			input.focus();
		}, 0);
	}
	closeSelect() {
		this.setState({isSelecting: false});
	}
	_toggle() {
		if (this._state.isSelecting) {
			this.closeSelect();
		} else {
			this.openSelect();
		}
	}
	_onTimer() {
		if (this._state.isWaybackMode) {
			return;
		}
		let now = Date.now();
		let str = this._toDate(now);
		if (this._currentTime === str) {
			return;
		}
		this._currentTimestamp = now;
		this._updateTimestamp();
	}
	_padTime(time) {
		let pad = v => {
			return v.toString().padStart(2, '0');
		};
		let dt = new Date(time);
		return {
			yyyy: dt.getFullYear(),
			mm: pad(dt.getMonth() + 1),
			dd: pad(dt.getDate()),
			h: pad(dt.getHours()),
			m: pad(dt.getMinutes()),
			s: pad(dt.getSeconds())
		};
	}
	_toDate(time) {
		let {yyyy, mm, dd, h, m} = this._padTime(time);
		return `${yyyy}/${mm}/${dd} ${h}:${m}`;
	}
	_toTDate(time) {
		let {yyyy, mm, dd, h, m, s} = this._padTime(time);
		return `${yyyy}-${mm}-${dd}T${h}:${m}:${s}`;
	}
	_onSubmit() {
		const val = this._elm.input.value;
		if (!val || !/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(|:\d\d)$/.test(val)) {
			return;
		}
		const dt = new Date(val);
		const when =
			Math.floor(Math.max(dt.getTime(), this._videoPostTime) / 1000);
		this.emit('command', 'reloadComment', {when});
		this.closeSelect();
	}
	_onCancel() {
		this.closeSelect();
	}
	_onBack() {
		this.setState({isWaybackMode: false});
		this.closeSelect();
		this.emit('command', 'reloadComment', {when: 0});
	}
}
TimeMachineView._shadow_ = (`
		<style>
			.dateTime {
				display: inline-block;
				margin: auto 4px 4px;
				padding: 0 4px;
				border: 1px solid;
				background: #888;
				color: #000;
				font-size: 20px;
				line-height: 24px;
				font-family: monospace;
				cursor: pointer;
			}
			.is-WaybackMode .dateTime {
				background: #000;
				color: #888;
				box-shadow: 0 0 4px #ccc, 0 0 4px #ccc inset;
			}
			.reloadButton {
				display: inline-block;
				line-height: 24px;
				font-size: 16px;
				margin: auto 4px;
				cursor: pointer;
				user-select: none;
				transition: transform 0.1s;
			}
			.is-WaybackMode .reloadButton {
				display: none;
			}
				.reloadButton .icon {
					display: inline-block;
					transform: rotate(90deg) scale(1.3);
					transition: transform 1s, color 0.2s, text-shadow 0.2s;
					text-shadow: none;
					font-family: 'STIXGeneral';
					margin-right: 8px;
				}
				.reloadButton:hover {
					text-decoration: underline;
				}
				.reloadButton:active {
					color: #888;
					cursor: wait;
				}
				.reloadButton:active .icon {
					text-decoration: none;
					transform: rotate(-270deg) scale(2);
					transition: none;
					color: #ff0;
					text-shadow: 0 0 4px #ff8;
				}
			.backToTheFuture {
				display: none;
				line-height: 24px;
				font-size: 16px;
				margin: auto 4px;
				cursor: pointer;
				transition: transform 0.1s;
				user-select: none;
			}
			.backToTheFuture:hover {
				text-shadow: 0 0 8px #ffc;
				transform: translate(0, -2px);
			}
			.backToTheFuture:active {
				text-shadow: none;
				transform: translate(0px, -1000px);
			}
			.is-WaybackMode .backToTheFuture {
				display: inline-block;
			}
			.inputContainer {
				display: none;
				position: absolute;
				top: 32px;
				left: 4px;
				background: #333;
				box-shadow: 0 0 4px #fff;
			}
			.is-Selecting .inputContainer {
				display: block;
			}
				.dateTimeInput {
					display: block;
					font-size: 16px;
					min-width: 256px;
				}
				.submitContainer {
					text-align: right;
				}
					.dateTimeSubmit, .dateTimeCancel {
						display: inline-block;
						min-width: 50px;
						cursor: pointer;
						padding: 4px 8px;
						margin: 4px;
						border: 1px solid #888;
						text-align: center;
						transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
						user-select: none;
					}
					.dateTimeSubmit:hover, .dateTimeCancel:hover {
						background: #666;
						transform: translate(0, -2px);
						box-shadow: 0 4px 2px #000;
					}
					.dateTimeSubmit:active, .dateTimeCancel:active {
						background: #333;
						transform: translate(0, 0);
						box-shadow: 0 0 2px #000 inset;
					}
					.dateTimeSubmit {
					}
					.dateTimeCancel {
					}
		</style>
		<div class="root TimeMachine">
			<div class="dateTime" title="TimeMachine">0000/00/00 00:00</div>
			<div class="reloadButton command" data-command="reloadComment" data-param="0" title="コメントのリロード"><span class="icon">&#8635;</span>リロード</div>
			<div class="backToTheFuture" title="Back To The Future">&#11152; Back</div>
			<div class="inputContainer">
				<input type="datetime-local" class="dateTimeInput">
				<div class="submitContainer">
				<div class="dateTimeSubmit">G&nbsp;&nbsp;O</div>
				<div class="dateTimeCancel">Cancel</div>
				</div>
			</div>
		</div>
	`).trim();
TimeMachineView.__tpl__ = ('<div class="TimeMachineView"></div>').trim();

class VideoListModel extends Emitter {
	constructor(params) {
		super();
		this._boundSet = new WeakSet();
		this.initialize(params);
	}
	initialize(params) {
		this._isUniq = params.uniq;
		this._items = [];
		this._maxItems = params.maxItems || 100;
		this._boundOnItemUpdate = this._onItemUpdate.bind(this);
	}
	setItem(itemList) {
		itemList = Array.isArray(itemList) ? itemList : [itemList];
		this._items = itemList;
		if (this._isUniq) {
			this._items =
				_.uniq(this._items, false, item => {
					return item.uniqId;
				});
		}
		this.emit('update', this._items, true);
	}
	clear() {
		this.setItem([]);
	}
	insertItem(itemList, index) {
		itemList = Array.isArray(itemList) ? itemList : [itemList];
		if (itemList.length < 1) {
			return;
		}
		index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));
		Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));
		if (this._isUniq) {
			itemList.forEach(i => this.removeSameWatchId(i));
		}
		this._items.splice(this._maxItems);
		this.emit('update', this._items);
		return this.indexOf(itemList[0]);
	}
	appendItem(itemList) {
		itemList = Array.isArray(itemList) ? itemList : [itemList];
		if (itemList.length < 1) {
			return;
		}
		this._items = this._items.concat(itemList);
		if (this._isUniq) {
			itemList.forEach(i => this.removeSameWatchId(i));
		}
		while (this._items.length > this._maxItems) {
			this._items.shift();
		}
		this.emit('update', this._items);
		return this._items.length - 1;
	}
	removeItemByIndex(index) {
		const item = this._getItemByIndex(index);
		if (!item) {
			return;
		}
		this._items = this._items.filter(i => {
			return i !== item;
		});
	}
	removePlayedItem() {
		const beforeLen = this._items.length;
		this._items = this._items.filter(item => {
			return item.isActive || !item.isPlayed;
		});
		const afterLen = this._items.length;
		if (beforeLen !== afterLen) {
			this.emit('update', this._items);
		}
	}
	resetPlayedItemFlag() {
		this._items.forEach(item => {
			if (item.isPlayed) {
				item.isPlayed = false;
			}
		});
		this.onUpdate();
	}
	removeNonActiveItem() {
		const beforeLen = this._items.length;
		this._items = this._items.filter(item => {
			return item.isActive;
		});
		const afterLen = this._items.length;
		if (beforeLen !== afterLen) {
			this.emit('update', this._items);
		}
	}
	shuffle() {
		this._items = _.shuffle(this._items);
		this.emit('update', this._items);
	}
	_getItemByIndex(index) {
		return this._items[index];
	}
	indexOf(item) {
		if (!item || !item.itemId) { return -1; }
		return this._items.findIndex(i => i.itemId === item.itemId);
	}
	getItemByIndex(index) {
		const item = this._getItemByIndex(index);
		if (!item) {
			return null;
		}
		if (!this._boundSet.has(item)) {
			this._boundSet.add(item);
			item.on('update', this._boundOnItemUpdate);
		}
		return item;
	}
	findByItemId(itemId) {
		itemId = parseInt(itemId, 10);
		const item = this._items.find(item => {
			return item.itemId === itemId;
		});
		if (item && !this._boundSet.has(item)) {
			this._boundSet.add(item);
			item.on('update', this._boundOnItemUpdate);
		}
		return item;
	}
	findByWatchId(watchId) {
		watchId = watchId + '';
		const item = this._items.find(item => {
			return item.watchId === watchId;
		});
		if (item && !this._boundSet.has(item)) {
			this._boundSet.add(item);
			item.on('update', this._boundOnItemUpdate);
		}
		return item;
	}
	removeItem(item) {
		const beforeLen = this._items.length;
		_.pull(this._items, item);
		item.off('update', this._boundOnItemUpdate);
		this._boundSet.delete(item);
		const afterLen = this._items.length;
		if (beforeLen !== afterLen) {
			this.emit('item-remove', item);
		}
	}
	removeSameWatchId(item) {
		const watchId = item.watchId;
		const uniqId = item.uniqId;
		const beforeLen = this._items.length;
		_.remove(this._items, i => {
			return item !== i && (i.watchId === watchId || i.uniqId === uniqId);
		});
		const afterLen = this._items.length;
		if (beforeLen !== afterLen) {
			this.emit('update', this._items);
		}
	}
	uniq(item) {
		this._items.forEach((i) => {
			if (i === item) {
				return;
			}
			this.removeSameWatchId(i);
		});
	}
	_onItemUpdate(item, key, value) {
		this.emit('item-update', item, key, value);
	}
	serialize() {
		return this._items.map(item => item.serialize());
	}
	unserialize(itemDataList) {
		const items = [];
		itemDataList.forEach(itemData => {
			items.push(new VideoListItem(itemData));
		});
		this.setItem(items);
	}
	sortBy(key, isDesc) {
		const table = {
			watchId: 'watchId',
			duration: 'duration',
			title: 'sortTitle',
			comment: 'commentCount',
			mylist: 'mylistCount',
			view: 'viewCount',
			postedAt: 'postedAt',
		};
		const func = table[key];
		if (!func) {
			return;
		}
		this._items = _.sortBy(this._items, item => item[func]);
		if (isDesc) {
			this._items.reverse();
		}
		this.onUpdate();
	}
	onUpdate() {
		this.emitAsync('update', this._items);
	}
	get length() {
		return this._items.length;
	}
	get activeIndex() {
		return this._items.findIndex(i => i.isActive);
	}
	get totalDuration() {
		let total = 0;
		this._items.forEach(item => {
			total += item.duration;
		});
		return total;
	}
}
const VideoListItemView = (() => {
	const ITEM_HEIGHT = 100;
	const THUMBNAIL_WIDTH = 96;
	const THUMBNAIL_HEIGHT = 72;
	const CSS = (`
			* {
				box-sizing: border-box;
			}
			.videoItem {
				position: relative;
				display: grid;
				width: 100%;
				height: 100%;
				overflow: hidden;
				grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
				grid-template-rows: ${THUMBNAIL_HEIGHT}px 1fr;
				padding: 2px;
				transition:
					transform 0.4s ease, box-shadow 0.4s ease;
				contain: layout size paint;
			}
			.playlist .videoItem {
				cursor: move;
			}
			.playlist .videoItem::before {
				content: counter(itemIndex);
				counter-increment: itemIndex;
				position: absolute;
				right: 8px;
				top: 80%;
				color: #666;
				font-family: Impact;
				font-size: 45px;
				pointer-events: none;
				z-index: 1;
				line-height: ${ITEM_HEIGHT}px;
				opacity: 0.6;
				transform: translate(0, -50%);
			}
			.videoItem.is-updating {
				opacity: 0.5;
				cursor: wait;
			}
			.videoItem.dragging {
				pointer-events: none;
				box-shadow: 8px 8px 4px #000;
				background: #666;
				opacity: 0.8;
				transition:
					box-shadow 0.4s ease;
				z-index: 10000;
			}
			.dragging * {
				cursor: move;
			}
			.dragging .videoItem.dragover {
				outline: 5px dashed #99f;
			}
			.dragging .videoItem.dragover * {
				opacity: 0.3;
			}
			.videoItem + .videoItem {
				border-top: 1px dotted var(--item-border-color);
				margin-top: 4px;
				outline-offset: -8px;
			}
			.videoItem.is-ng-rejected {
				display: none;
			}
			.videoItem.is-fav-favorited .postedAt::after {
				content: ' ★';
				color: #fea;
				text-shadow: 2px 2px 2px #000;
			}
			.thumbnailContainer {
				position: relative;
				transform: translate(0, 2px);
				margin: 0;
				background-color: black;
				background-size: contain;
				background-repeat: no-repeat;
				background-position: center;
			}
			.thumbnailContainer a {
				display: inline-block;
				width:  100%;
				height: 100%;
				transition: box-shaow 0.4s ease, transform 0.4s ease;
			}
			.thumbnailContainer a:active {
				box-shadow: 0 0 8px #f99;
				transform: translate(0, 4px);
				transition: none;
			}
			.thumbnailContainer .playlistAppend,
			.playlistRemove,
			.thumbnailContainer .deflistAdd,
			.thumbnailContainer .pocket-info {
				position: absolute;
				display: none;
				color: #fff;
				background: #666;
				width: 24px;
				height: 20px;
				line-height: 18px;
				font-size: 14px;
				box-sizing: border-box;
				text-align: center;
				font-weight: bolder;
				color: #fff;
				cursor: pointer;
			}
			.thumbnailContainer .playlistAppend {
				left: 0;
				bottom: 0;
			}
			.playlistRemove {
				right: 8px;
				top: 0;
			}
			.thumbnailContainer .deflistAdd {
				right: 0;
				bottom: 0;
			}
			.thumbnailContainer .pocket-info {
				display: none !important;
				right: 24px;
				bottom: 0;
			}
			.is-pocketReady .videoItem:hover .pocket-info {
				display: inline-block !important;
			}
			.playlist .playlistAppend {
				display: none !important;
			}
			.playlistRemove {
				display: none;
			}
			.playlist .videoItem:not(.is-active):hover .playlistRemove {
				display: inline-block;
			}
			.playlist .videoItem:not(.is-active):hover .playlistRemove,
			.videoItem:hover .thumbnailContainer .playlistAppend,
			.videoItem:hover .thumbnailContainer .deflistAdd,
			.videoItem:hover .thumbnailContainer .pocket-info {
				display: inline-block;
				border: 1px outset;
			}
			.playlist .videoItem:not(.is-active):hover .playlistRemove:hover,
			.videoItem:hover .thumbnailContainer .playlistAppend:hover,
			.videoItem:hover .thumbnailContainer .deflistAdd:hover,
			.videoItem:hover .thumbnailContainer .pocket-info:hover {
				transform: scale(1.5);
				box-shadow: 2px 2px 2px #000;
			}
			.playlist .videoItem:not(.is-active):hover .playlistRemove:active,
			.videoItem:hover .thumbnailContainer .playlistAppend:active,
			.videoItem:hover .thumbnailContainer .deflistAdd:active,
			.videoItem:hover .thumbnailContainer .pocket-info:active {
				transform: scale(1.3);
				border: 1px inset;
				transition: none;
			}
			.videoItem.is-updating .thumbnailContainer .deflistAdd {
				transform: scale(1.0) !important;
				border: 1px inset !important;
				pointer-events: none;
			}
			.thumbnailContainer .duration {
				position: absolute;
				right: 0;
				bottom: 0;
				background: #000;
				font-size: 12px;
				color: #fff;
			}
			.videoItem:hover .thumbnailContainer .duration {
				display: none;
			}
			.videoInfo {
				height: 100%;
				padding-left: 4px;
			}
			.postedAt {
				font-size: 12px;
				color: #ccc;
			}
			.is-played .postedAt::after {
				content: ' ●';
				font-size: 10px;
			}
			.counter {
				position: absolute;
				top: 80px;
				width: 100%;
				text-align: center;
			}
			.title {
				height: 52px;
				overflow: hidden;
			}
			.videoLink {
				font-size: 14px;
				color: #ff9;
				transition: background 0.4s ease, color 0.4s ease;
			}
			.videoLink:visited {
				color: #ffd;
			}
			.videoLink:active {
				color: #fff;
				background: #663;
				transition: none;
			}
			.noVideoCounter .counter {
				display: none;
			}
			.counter {
				font-size: 12px;
				color: #ccc;
			}
			.counter .value {
				font-weight: bolder;
			}
			.counter .count {
				white-space: nowrap;
			}
			.counter .count + .count {
				margin-left: 8px;
			}
			.videoItem.is-active {
				border: none !important;
				background: #776;
			}
			@media screen and (min-width: 600px)
			{
				#listContainerInner {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
				}
				.videoItem {
					margin: 4px 8px 0;
					border-top: none !important;
					border-bottom: 1px dotted var(--item-border-color);
				}
			}
		`).trim();
	const TPL = (`
			<div class="videoItem">
				<span class="command playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
				<div class="thumbnailContainer">
					<a class="command" data-command="select">
						<span class="duration"></span>
					</a>
					<span class="command playlistAppend" data-command="playlistAppend" title="プレイリストに追加">▶</span>
					<span class="command deflistAdd"  data-command="deflistAdd"  title="とりあえずマイリスト">&#x271A;</span>
					<span class="command pocket-info" data-command="pocket-info"  title="動画情報">？</span>
				</div>
				<div class="videoInfo">
					<div class="postedAt"></div>
					<div class="title">
						<a class="command videoLink" data-command="select"></a>
					</div>
				</div>
				<div class="counter">
					<span class="count">再生: <span class="value viewCount"></span></span>
					<span class="count">コメ: <span class="value commentCount"></span></span>
					<span class="count">マイ: <span class="value mylistCount"></span></span>
				</div>
		</div>
		`).trim();
	let counter = 0;
	let template;
	class VideoListItemView {
		static get template() {
			if (!template) {
				const t = document.createElement('template');
				t.id = `VideoListItemView-template${Date.now()}`;
				t.innerHTML = TPL;
				const tc = t.content;
				template = {
					t,
					clone: () => document.importNode(t.content, true).firstChild,
					videoItem: tc.querySelector('.videoItem'),
					duration: tc.querySelector('.duration'),
					thumbnail: tc.querySelector('.thumbnailContainer'),
					thumbnailLink: tc.querySelector('.thumbnailContainer>a'),
					videoLink: tc.querySelector('.videoLink'),
					postedAt: tc.querySelector('.postedAt'),
					viewCount: tc.querySelector('.viewCount'),
					commentCount: tc.querySelector('.commentCount'),
					mylistCount: tc.querySelector('.mylistCount'),
					playlistAppend: tc.querySelector('.playlistAppend'),
					playlistRemove: tc.querySelector('.playlistRemove'),
					deflistAdd: tc.querySelector('.deflistAdd'),
					pocketInfo: tc.querySelector('.pocket-info')
				};
			}
			return template;
		}
		constructor(item) {
			this.initialize(item);
		}
		initialize(item) {
			this._item = item.item;
			this._isLazy = typeof item.enableLazyLoadImage === 'boolean' ?
				item.enableLazyLoadImage : false;
			this._id = counter++;
		}
		build() {
			const template = this.constructor.template;
			const {videoItem, duration, thumbnail, thumbnailLink, videoLink, postedAt, viewCount, commentCount, mylistCount, playlistAppend, playlistRemove, deflistAdd, pocketInfo} = template;
			const item = this._item;
			const {title, count, itemId, watchId} = item;
			const watchUrl = `//www.nicovideo.jp/watch/${watchId}`;
			videoItem.className = `videoItem watch${watchId} item${itemId} ${item.isActive ? 'is-active' : ''} ${item.isUpdating ? 'is-updating' : ''} ${item.isPlayed ? 'is-played' : ''}`;
			Object.assign(videoItem.dataset, { itemId, watchId });
			thumbnail.classList.toggle('lazy-load', this._isLazy);
			if (this._isLazy) {
				thumbnail.style.backgroundColor = '#666';
				thumbnail.style.backgroundImage = 'none';
			} else {
				thumbnail.style.backgroundImage = `url(${item.thumbnail})`;
			}
			Object.assign(thumbnail.dataset, { watchId, src: item.thumbnail });
			thumbnailLink.href = watchUrl;
			thumbnailLink.dataset.param = itemId;
			videoLink.href = watchUrl;
			videoLink.dataset.param = itemId;
			videoLink.title = title;
			videoLink.textContent = title;
			duration.textContent = util.secToTime(item.duration);
			postedAt.textContent = item.postedAt;
			viewCount.textContent = this._addComma(count.view);
			commentCount.textContent = this._addComma(count.comment);
			mylistCount.textContent = this._addComma(count.mylist);
			playlistAppend.dataset.param = watchId;
			playlistRemove.dataset.param = watchId;
			deflistAdd.dataset.param = watchId;
			pocketInfo.dataset.param = watchId;
			this._view = template.clone();
		}
		rebuild(item) {
			this._isLazy = false;
			this._item = item;
			const lastView = this._view;
			if (!lastView) {
				return this.build();
			}
			this.build();
			if (lastView.parentNode) {
				lastView.parentNode.replaceChild(this.getViewElement(), lastView);
			}
		}
		get watchId() {
			return this._item.watchId;
		}
		getViewElement() {
			if (!this._view) {
				this.build();
			}
			return this._view;
		}
		remove() {
			if (!this._view) {
				return;
			}
			this._view.remove();
		}
		toString() {
			return this.getView().outerHTML;
		}
		_addComma(m) {
			if (isNaN(m)) {
				return '---';
			}
			return m.toLocaleString ? m.toLocaleString() : util.escapeHtml(m);
		}
		addClass(className) {
			this.toggleClass(className, true);
		}
		removeClass(className) {
			this.toggleClass(className, false);
		}
		toggleClass(className, v) {
			if (!this._view) {
				this.build();
			}
			this._view.classList.toggle(className, v);
		}
	}
	VideoListItemView.CSS = CSS;
	VideoListItemView.TPL = TPL;
	return VideoListItemView;
})();
class VideoListView extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	get hasFocus() {
		return this._hasFocus;
	}
	initialize(params) {
		this._ItemView = params.itemView || VideoListItemView;
		this._itemCss = params.itemCss || VideoListItemView.CSS;
		this._className = params.className || 'videoList';
		this._container = params.container;
		this._retryGetIframeCount = 0;
		this._itemViewCache = new WeakMap();
		this._maxItems = params.max || 100;
		this._dragdrop = typeof params.dragdrop === 'boolean' ? params.dragdrop : false;
		this._dropfile = typeof params.dropfile === 'boolean' ? params.dropfile : false;
		this._enablePocketWatch = params.enablePocketWatch;
		this._hasFocus = false;
		this._model = params.model;
		if (this._model) {
			this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 100));
			this._model.on('item-update', this._onModelItemUpdate.bind(this));
			this._model.on('item-remove', this._onModelItemRemove.bind(this));
		}
		this._enableLazyLoadImage = window.IntersectionObserver ? true : false;
		this._initializeView(params);
	}
	_initializeView(params) {
		let html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
		this._frame = new FrameLayer({
			container: params.container,
			html: html,
			className: 'videoListFrame'
		});
		this._frame.on('load', this._onIframeLoad.bind(this));
	}
	_onIframeLoad(w) {
		const doc = this._document = w.document;
		const $body = this._$body = util.$(doc.body);
		if (this._className) {
			doc.body.classList.add(this._className);
		}
		cssUtil.registerProps(
			{name: '--list-length',  syntax: '<integer>', initialValue: 1, inherits: true, window: w},
			{name: '--active-index', syntax: '<integer>', initialValue: 1, inherits: true, window: w},
			{name: '--progress', syntax: '<length-percentage>', initialValue: cssUtil.px(0), inherits: true, window: w},
		);
		const container = this._container = doc.querySelector('#listContainer');
		const list = this._list = doc.getElementById('listContainerInner');
		if (this._documentFragment instanceof Node) {
			list.append(this._documentFragment);
			this._setInviewObserver();
			this._documentFragment = null;
		}
		$body.on('click', this._onClick.bind(this))
			.on('keydown', e => ZenzaWatch.emitter.emit('keydown', e))
			.on('keyup', e => ZenzaWatch.emitter.emit('keyup', e));
		w.addEventListener('focus', () => this._hasFocus = true);
		w.addEventListener('blur', () => this._hasFocus = false);
		this._updateCSSVars();
		if (this._dragdrop) {
			$body.on('mousedown', this._onBodyMouseDown.bind(this), {passive: true});
		}
		const onScroll = () => {
		if (!container.classList.contains('is-scrolling')) {
			container.classList.add('is-scrolling');
		}
		onScrollEnd();
		};
		const onScrollEnd = _.debounce(() => {
		if (container.classList.contains('is-scrolling')) {
			container.classList.remove('is-scrolling');
		}
		}, 500);
		container.addEventListener('scroll', onScroll, {passive: true});
		if (this._dropfile) {
			$body
				.on('dragover', this._onBodyDragOverFile.bind(this))
				.on('dragenter', this._onBodyDragEnterFile.bind(this))
				.on('dragleave', this._onBodyDragLeaveFile.bind(this))
				.on('drop', this._onBodyDropFile.bind(this));
		}
		MylistPocketDetector.detect().then(pocket => {
			this._pocket = pocket;
			$body.addClass('is-pocketReady');
			if (pocket.external.observe && this._enablePocketWatch) {
				pocket.external.observe({
					query: 'a.videoLink',
					container: list,
					closest: '.videoItem'
				});
			}
		});
	}
	_onBodyMouseDown(e) {
		let item = e.target.closest('.videoItem');
		if (!item) {
			return;
		}
		if (e.target.closest('[data-command]')) {
			return;
		}
		this._dragging = item;
		this._dragOffset = {
			x: e.pageX,
			y: e.pageY,
			st: this.scrollTop()
		};
		this._dragTarget = null;
		this._$body.find('.dragover').removeClass('dragover');
		this._bindDragStartEvents();
	}
	_bindDragStartEvents() {
		this._$body
			.on('mousemove.drag', this._onBodyMouseMove.bind(this))
			.on('mouseup.drag', this._onBodyMouseUp.bind(this))
			.on('blur.drag', this._onBodyBlur.bind(this))
			.on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
	}
	_unbindDragStartEvents() {
		this._$body
			.off('mousemove.drag')
			.off('mouseup.drag')
			.off('blur.drag')
			.off('mouseleave.drag');
	}
	_onBodyMouseMove(e) {
		if (!this._dragging) {
			return;
		}
		let x = e.pageX - this._dragOffset.x;
		let y = e.pageY - this._dragOffset.y + (this.scrollTop() - this._dragOffset.st);
		let translate = `translate(${x}px, ${y}px)`;
		if (x * x + y * y < 100) {
			return;
		}
		this._$body.addClass('dragging');
		util.$(this._dragging)
			.addClass('dragging')
			.css('transform', translate);
		this._$body.find('.dragover').removeClass('dragover');
		let target = e.target.closest('.videoItem');
		if (!target) {
			return;
		}
		target.classList.add('dragover');
		this._dragTarget = target;
	}
	_onBodyMouseUp(e) {
		this._unbindDragStartEvents();
		let dragging = this._dragging;
		this._endBodyMouseDragging();
		if (!dragging) {
			return;
		}
		let target = e.target.closest('.videoItem') || this._dragTarget;
		if (!target) {
			return;
		}
		let srcId = dragging.dataset.itemId, destId = target.dataset.itemId;
		if (srcId === destId) {
			return;
		}
		dragging.style.opacity = '0';
		target.style.opacity = '0';
		this.emit('moveItem', srcId, destId);
	}
	_onBodyBlur() {
		this._endBodyMouseDragging();
	}
	_onBodyMouseLeave() {
		this._endBodyMouseDragging();
	}
	_endBodyMouseDragging() {
		this._unbindDragStartEvents();
		this._$body.removeClass('dragging');
		this._dragTarget = null;
		this._$body.find('.dragover').removeClass('dragover');
		if (this._dragging) {
			util.$(this._dragging).removeClass('dragging').css('transform', '');
		}
		this._dragging = null;
	}
	_onBodyDragOverFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$body.addClass('drag-over');
	}
	_onBodyDragEnterFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$body.addClass('drag-over');
	}
	_onBodyDragLeaveFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$body.removeClass('drag-over');
	}
	_onBodyDropFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$body.removeClass('drag-over');
		let file = e.originalEvent.dataTransfer.files[0];
		if (!/\.playlist\.json$/.test(file.name)) {
			return;
		}
		let fileReader = new FileReader();
		fileReader.onload = ev => {
			window.console.log('file data: ', ev.target.result);
			this.emit('filedrop', ev.target.result, file.name);
		};
		fileReader.readAsText(file);
	}
	_onModelUpdate(itemList, replaceAll) {
		const timeLabel = `update playlistView  replaceAll=${!!replaceAll}`;
		window.console.time(timeLabel);
		this.addClass('is-updating');
		itemList = Array.isArray(itemList) ? itemList : [itemList];
		const itemViews = [];
		for (const item of itemList) {
			let id = item.itemId;
			if (this._itemViewCache.has(id)) {
				itemViews.push(this._itemViewCache.get(item));
			} else {
				const isLazy = this._enableLazyLoadImage;
				const itemView = new this._ItemView({item, enableLazyLoadImage: isLazy});
				this._itemViewCache.set(item, itemView);
				itemViews.push(itemView);
			}
		}
		this._updateCSSVars();
		this._itemViews = itemViews;
		if (itemViews.length < 1) {
			this.removeClass('is-updating');
			window.console.timeEnd(timeLabel);
			return;
		}
		window.setTimeout(() => {
			const f = document.createDocumentFragment();
			f.append(...itemViews.map(i => i.getViewElement()));
			if (this._list) {
				this._list.textContent = '';
				this._list.appendChild(f);
				this._documentFragment = null;
				this._setInviewObserver();
			} else {
				this._documentFragment = f;
			}
			this.removeClass('is-updating');
			this.emit('update');
		}, 0);
		window.console.timeEnd(timeLabel);
	}
	_onModelItemRemove(item) {
		const itemView = this._itemViewCache.get(item);
		if (!itemView) {
			return;
		}
		this._updateCSSVars();
		itemView.remove();
		this._itemViewCache.delete(item);
	}
	_setInviewObserver() {
		if (!this._enableLazyLoadImage || !this._document) {
			return;
		}
		if (this._intersectionObserver) {
			this._intersectionObserver.disconnect();
		}
		let images = [...this._document.querySelectorAll('.lazy-load')];
		if (!images.length) { return; }
		let onInview = this._onImageInview_bind || this._onImageInview.bind(this);
		let observer = this._intersectionObserver = new window.IntersectionObserver(onInview);
		images.forEach(img => observer.observe(img));
	}
	_onImageInview(entries) {
		const observer = this._intersectionObserver;
		entries.filter(entry => entry.isIntersecting).forEach(entry => {
			const thumbnail = entry.target;
			const src = thumbnail.dataset.src;
			thumbnail.classList.remove('lazy-load');
			observer.unobserve(thumbnail);
			if (!src) {
				return;
			}
			thumbnail.style.backgroundImage = `url(${src})`;
		});
	}
	_onModelItemUpdate(item, key, value) {
		if (!this._$body) {
			return;
		}
		const itemId = item.itemId;
		const itemView = this._itemViewCache.get(item);
		if (!itemView) {
			const newItemView = new this._ItemView({item});
			this._itemViewCache.set(item, newItemView);
			const itemViewElement = this._document.querySelector(`.videoItem.item${itemId}`);
			this._list.insertBefore(
				newItemView.getViewElement(), itemViewElement);
			if (itemViewElement) {
				this._document.body.removeChild(itemViewElement);
			}
			return;
		}
		if (['active', 'updating', 'played'].includes(key)) {
			itemView.toggleClass(`is-${key}`, value);
			if (key === 'active' && value) {
				this._updateCSSVars();
				if (!this._hasFocus) {
					this.scrollToItem(itemId);
				}
			}
		} else {
			itemView.rebuild(item);
		}
	}
	_updateCSSVars() {
		if (this._document) {
			const body = this._document.body;
			body.style.setProperty('--list-length', cssUtil.number(this._model.length));
			body.style.setProperty('--active-index', cssUtil.number(this._model.activeIndex));
		}
	}
	_onClick(e) {
		e.stopPropagation();
		ZenzaWatch.emitter.emitAsync('hideHover');
		let target = e.target.closest('.command');
		let item = e.target.closest('.videoItem');
		if (!target) {
			return;
		}
		e.stopPropagation();
		e.preventDefault();
		let {command, param} = target.dataset;
		let {itemId} = item ? item.dataset : {};
		switch (command) {
			case 'deflistAdd':
				this.emit('deflistAdd', param, itemId);
				break;
			case 'playlistAppend':
				this.emit('playlistAppend', param, itemId);
				break;
			case 'pocket-info':
				window.setTimeout(() => this._pocket.external.info(param), 100);
				break;
			case 'scrollToTop':
				this.scrollTop(0, 300);
				break;
			case 'playlistRemove':
				item.remove();
				this.emit('command', command, param, itemId);
				break;
			default:
				this.emit('command', command, param, itemId);
		}
	}
	addClass(className) {
		this.toggleClass(className, true);
	}
	removeClass(className) {
		this.toggleClass(className, false);
	}
	toggleClass(className, v) {
		if (!this._$body) {
			return;
		}
		this._$body.toggleClass(className, v);
	}
	scrollTop(v) {
		if (!this._container) {
			return 0;
		}
		if (typeof v === 'number') {
			this._container.scrollTop = v;
		} else {
			return this._container.scrollTop;
		}
	}
	scrollToItem(itemId) {
		if (!this._$body) {
			return;
		}
		if (typeof itemId === 'object') {
			itemId = itemId.itemId;
		}
		let $target = this._$body.find(`.item${itemId}`);
		if (!$target.length) {
			return;
		}
		$target[0].scrollIntoView({block: 'start', behavior: 'instant'});
	}
}
VideoListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">
	${CONSTANT.BASE_CSS_VARS}
	${CONSTANT.SCROLLBAR_CSS}
	body {
		user-select: none;
		background: #333;
		overflow: hidden;
	}
	.drag-over>* {
		opacity: 0.5;
		pointer-events: none;
	}
	.is-updating #listContainer {
		pointer-events: none;
		opacity: 0.5;
		transition: none;
	}
	#listContainer {
		position: absolute;
		top: 0;
		left:0;
		margin: 0;
		padding: 0;
		width: 100vw;
		height: 100vh;
		overflow-x: hidden;
		overflow-y: scroll;
		overscroll-behavior: contain;
		transition: 0.2s opacity;
		counter-reset: itemIndex;
		will-change: transform;
	}
	#listContainerInner {
		display: grid;
		grid-auto-rows: 100px;
	}
	.is-scrolling #listContainerInner {
		pointer-events: none;
		animation-play-state: paused !important;
	}
	.scrollToTop, .scrollToActive {
		position: fixed;
		width: 32px;
		height: 32px;
		right: 48px;
		bottom: 8px;
		font-size: 24px;
		line-height: 32px;
		text-align: center;
		z-index: 100;
		background: #ccc;
		color: #000;
		border-radius: 100%;
		cursor: pointer;
		opacity: 0.3;
		transition: opacity 0.4s ease;
	}
	.scrollToActive {
		--progress: calc(var(--active-index) / var(--list-length) * 100%);
		display: none;
		top: var(--progress);
		border-radius: 0;
		bottom: auto;
		right: 0;
		transform: translateY(calc(var(--progress) * -1%));
		background: none;
		opacity: 0.5;
		color: #f99;
	}
	.playlist .scrollToActive {
		display: block;
	}
	.playlist .scrollToActive:hover {
		background: #ccc;
	}
	.scrollToTop:hover {
		opacity: 0.9;
		box-shadow: 0 0 8px #fff;
	}
</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
<div id="listContainer">
	<div id="listContainerInner"></div>
</div>
<div class="scrollToActive command" title="いまここ" data-command="scrollToActiveItem">&#9658;</div>
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>
	`).trim();
class VideoListItem extends Emitter {
	static createByThumbInfo(info) {
		return new this({
			_format: 'thumbInfo',
			id: info.id,
			title: info.title,
			length_seconds: info.duration,
			num_res: info.commentCount,
			mylist_counter: info.mylistCount,
			view_counter: info.viewCount,
			thumbnail_url: info.thumbnail,
			first_retrieve: info.postedAt,
			tags: info.tagList,
			movieType: info.movieType,
			owner: info.owner,
			lastResBody: info.lastResBody
		});
	}
	static createBlankInfo(id) {
		let postedAt = '0000/00/00 00:00:00';
		if (!isNaN(id)) {
			postedAt = util.dateToString(new Date(id * 1000));
		}
		return new this({
			_format: 'blank',
			id: id,
			title: id + '(動画情報不明)',
			length_seconds: 0,
			num_res: 0,
			mylist_counter: 0,
			view_counter: 0,
			thumbnail_url: 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank_s.jpg',
			first_retrieve: postedAt,
		});
	}
	static createByMylistItem(item) {
		if (item.item_data) {
			const item_data = item.item_data || {};
			return new VideoListItem({
				_format: 'mylistItemOldApi',
				id: item_data.watch_id,
				uniq_id: item_data.watch_id,
				title: item_data.title,
				length_seconds: item_data.length_seconds,
				num_res: item_data.num_res,
				mylist_counter: item_data.mylist_counter,
				view_counter: item_data.view_counter,
				thumbnail_url: item_data.thumbnail_url,
				first_retrieve: util.dateToString(new Date(item_data.first_retrieve * 1000)),
				videoId: item_data.video_id,
				lastResBody: item_data.last_res_body,
				mylistItemId: item.item_id,
				item_type: item.item_type
			});
		}
		if (!item.length_seconds && typeof item.length === 'string') {
			const [min, sec] = item.length.split(':');
			item.length_seconds = min * 60 + sec * 1;
		}
		return new VideoListItem({
			_format: 'mylistItemRiapi',
			id: item.id,
			uniq_id: item.id,
			title: item.title,
			length_seconds: item.length_seconds,
			num_res: item.num_res,
			mylist_counter: item.mylist_counter,
			view_counter: item.view_counter,
			thumbnail_url: item.thumbnail_url,
			first_retrieve: item.first_retrieve,
			lastResBody: item.last_res_body
		});
	}
	static createByVideoInfoModel(info) {
		const count = info.count;
		return new VideoListItem({
			_format: 'videoInfo',
			id: info.watchId,
			uniq_id: info.contextWatchId,
			title: info.title,
			length_seconds: info.duration,
			num_res: count.comment,
			mylist_counter: count.mylist,
			view_counter: count.view,
			thumbnail_url: info.thumbnail,
			first_retrieve: info.postedAt,
			owner: info.owner
		});
	}
	constructor(rawData) {
		super();
		this._rawData = rawData;
		this._itemId = VideoListItem._itemId++;
		this.state = {
			isActive: false,
			lastActivated: rawData.last_activated || 0,
			isUpdating: false,
			isPlayed: !!rawData.played
		};
		this._uniq_id = rawData.uniqId || this.watchId;
		rawData.first_retrieve = util.dateToString(rawData.first_retrieve);
		this._sortTitle = util.convertKansuEi(this.title)
			.replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
	}
	equals(item) {
		return this.uniqId === item.uniqId;
	}
	_getData(key, defValue) {
		return this._rawData.hasOwnProperty(key) ?
			this._rawData[key] : defValue;
	}
	get uniqId() {
		return this._uniq_id;
	}
	get itemId() {
		return this._itemId;
	}
	get watchId() {
		return (this._getData('id', '') || '').toString();
	}
	get title() {
		return this._getData('title', '');
	}
	get sortTitle() {
		return this._sortTitle;
	}
	get duration() {
		return parseInt(this._getData('length_seconds', '0'), 10);
	}
	get count() {
		return {
			comment: parseInt(this._rawData.num_res, 10),
			mylist: parseInt(this._rawData.mylist_counter, 10),
			view: parseInt(this._rawData.view_counter, 10)
		};
	}
	get thumbnail() {
		return this._rawData.thumbnail_url;
	}
	get postedAt() {
		return this._rawData.first_retrieve;
	}
	get commentCount() {
		return this.count.comment;
	}
	get mylistCount() {
		return this.count.mylist;
	}
	get viewCount() {
		return this.count.view;
	}
	get isActive() {
		return this.state.isActive;
	}
	set isActive(v) {
		v = !!v;
		if (this.isActive !== v) {
			this.state.isActive = v;
			if (v) {
				this.state.lastActivated = Date.now();
			}
			this.emit('update', this, 'active', v);
		}
	}
	get isUpdating() {
		return this.state.isUpdating;
	}
	set isUpdating(v) {
		v = !!v;
		if (this.isUpdating !== v) {
			this.state.isUpdating = v;
			this.emit('update', this, 'updating', v);
		}
	}
	get isPlayed() {
		return this.state.isPlayed;
	}
	set isPlayed(v) {
		v = !!v;
		if (this.isPlayed !== v) {
			this.state.isPlayed = v;
			this.emit('update', this, 'played', v);
		}
	}
	get isBlankData() {
		return this._rawData._format === 'blank';
	}
	serialize() {
		return {
			active: this.isActive,
			last_activated: this.state.lastActivated || 0,
			played: this.isPlayed,
			uniq_id: this._uniq_id,
			id: this._rawData.id,
			title: this._rawData.title,
			length_seconds: this._rawData.length_seconds,
			num_res: this._rawData.num_res,
			mylist_counter: this._rawData.mylist_counter,
			view_counter: this._rawData.view_counter,
			thumbnail_url: this._rawData.thumbnail_url,
			first_retrieve: this._rawData.first_retrieve,
		};
	}
	updateByVideoInfo(videoInfo) {
		const before = JSON.stringify(this.serialize());
		const rawData = this._rawData;
		const count = videoInfo.count;
		rawData.first_retrieve = util.dateToString(videoInfo.postedAt);
		rawData.num_res = count.comment;
		rawData.mylist_counter = count.mylist;
		rawData.view_counter = count.view;
		rawData.thumbnail_url = videoInfo.thumbnail;
		if (JSON.stringify(this.serialize()) !== before) {
			this.emit('update', this);
		}
	}
}
VideoListItem._itemId = 0;
class VideoList extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	initialize(params) {
		this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
		this._container = params.container;
		this._model = new VideoListModel({
			uniq: true,
			maxItem: 100
		});
		this._initializeView();
	}
	_initializeView() {
		if (this._view) {
			return;
		}
		this._view = new VideoListView({
			container: this._container,
			model: this._model,
			enablePocketWatch: true
		});
		this._view.on('command', this._onCommand.bind(this));
		this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
		this._view.on('playlistAppend', this._onPlaylistAppend.bind(this));
	}
	update(listData, watchId) {
		if (!this._view) {
			this._initializeView();
		}
		this._watchId = watchId;
		const items = listData.filter(itemData => itemData.has_data)
			.map(itemData => new VideoListItem(itemData));
		if (items.length < 1) {
			return;
		}
		this._view.insertItem(items);
	}
	_onCommand(command, param) {
		if (command === 'select') {
			const item = this._model.findByItemId(param);
			const watchId = item.watchId;
			this.emit('command', 'open', watchId);
			return;
		}
		this.emit('command', command, param);
	}
	_onPlaylistAppend(watchId, itemId) {
		this.emit('command', 'playlistAppend', watchId);
		if (this._isUpdatingPlaylist) {
			return;
		}
		let item = this._model.findByItemId(itemId);
		const unlock = () => {
			item.isUpdating = false;
			this._isUpdatingPlaylist = false;
		};
		item.isUpdating = true;
		this._isUpdatingPlaylist = true;
		window.setTimeout(unlock, 1000);
	}
	_onDeflistAdd(watchId, itemId) {
		if (this._isUpdatingDeflist) {
			return;
		}
		let item = this._model.findByItemId(itemId);
		const unlock = () => {
			item.isUpdating = false;
			this._isUpdatingDeflist = false;
		};
		item.isUpdating = true;
		this._isUpdatingDeflist = true;
		window.setTimeout(unlock, 1000);
		this.emit('command', 'deflistAdd', watchId);
	}
}
class RelatedVideoList extends VideoList {
	update(listData, watchId) {
		if (!this._view) {
			this._initializeView();
		}
		this._watchId = watchId;
		let items = [];
		listData.forEach(itemData => {
			if (!itemData.id) {
				return;
			}
			items.push(new VideoListItem(itemData));
		});
		if (!items.length) {
			return;
		}
		this._model.insertItem(items);
		this._view.scrollTop(0);
	}
}
class PlaylistModel extends VideoListModel {
	initialize() {
		this._maxItems = 10000;
		this._items = [];
		this._isUniq = true;
		this._boundOnItemUpdate = this._onItemUpdate.bind(this);
	}
}
class PlaylistView extends Emitter {
	constructor(...args) {
		super(...args);
		this.initialize(...args);
	}
	initialize(params) {
		this._container = params.container;
		this._model = params.model;
		this._playlist = params.playlist;
		util.addStyle(PlaylistView.__css__);
		let $view = this._$view = util.$.html(PlaylistView.__tpl__);
		this._container.append($view[0]);
		const mq = $view.mapQuery({
			_index: '.playlist-index', _length: '.playlist-length',
			_menu: '.playlist-menu', _fileDrop: '.playlist-file-drop',
			_fileSelect: '.playlist-import-file-select',
			_playlistFrame: '.playlist-frame'
		});
		Object.assign(this, mq.e);
		Object.assign(this, mq.$);
		global.debug.playlistView = this._$view;
		let listView = this._listView = new VideoListView({
			container: this._playlistFrame,
			model: this._model,
			className: 'playlist',
			dragdrop: true,
			dropfile: true,
			enablePocketWatch: false
		});
		listView.on('command', this._onCommand.bind(this));
		listView.on('deflistAdd', this._onDeflistAdd.bind(this));
		listView.on('moveItem', (src, dest) => this.emit('moveItem', src, dest));
		listView.on('filedrop', data => this.emit('command', 'importFile', data));
		this._playlist.on('update',
			_.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
		this._$view.on('click', this._onPlaylistCommandClick.bind(this));
		ZenzaWatch.emitter.on('hideHover', () => {
			this._$menu.removeClass('show');
			this._$fileDrop.removeClass('show');
		});
		util.$('.zenzaVideoPlayerDialog')
			.on('dragover', this._onDragOverFile.bind(this))
			.on('dragenter', this._onDragEnterFile.bind(this))
			.on('dragleave', this._onDragLeaveFile.bind(this))
			.on('drop', this._onDropFile.bind(this));
		this._$fileSelect.on('change', this._onImportFileSelect.bind(this));
		['addClass',
			'removeClass',
			'scrollTop',
			'scrollToItem',
		].forEach(func => this[func] = listView[func].bind(listView));
	}
	toggleClass(className, v) {
		this._view.toggleClass(className, v);
		this._$view.toggleClass(className, v);
	}
	_onCommand(command, param, itemId) {
		switch (command) {
			default:
				this.emit('command', command, param, itemId);
				break;
		}
	}
	_onDeflistAdd(watchId, itemId) {
		this.emit('deflistAdd', watchId, itemId);
	}
	_onPlaylistCommandClick(e) {
		let target = e.target.closest('.playlist-command');
		if (!target) {
			return;
		}
		let {command, param} = target.dataset;
		e.stopPropagation();
		if (!command) {
			return;
		}
		switch (command) {
			case 'importFileMenu':
				this._$menu.removeClass('show');
				this._$fileDrop.addClass('show');
				return;
			case 'toggleMenu':
				e.stopPropagation();
				e.preventDefault();
				this._$menu.addClass('show');
				return;
			case 'shuffle':
			case 'sortBy':
				this._$view.addClass('shuffle');
				window.setTimeout(() => this._$view.removeClass('shuffle'), 1000);
				this.emit('command', command, param);
				break;
			default:
				this.emit('command', command, param);
		}
		ZenzaWatch.emitter.emitAsync('hideHover');
	}
	_onPlaylistStatusUpdate() {
		const playlist = this._playlist;
		this._$view
			.toggleClass('enable', playlist.isEnable)
			.toggleClass('loop', playlist.isLoop)
		;
		this._index.textContent = playlist.getIndex() + 1;
		this._length.textContent = playlist.length;
	}
	_onDragOverFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$fileDrop.addClass('drag-over');
	}
	_onDragEnterFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$fileDrop.addClass('drag-over');
	}
	_onDragLeaveFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$fileDrop.removeClass('drag-over');
	}
	_onDropFile(e) {
		e.preventDefault();
		e.stopPropagation();
		this._$fileDrop.removeClass('show drag-over');
		const file = e.originalEvent.dataTransfer.files[0];
		if (!/\.playlist\.json$/.test(file.name)) {
			return;
		}
		const fileReader = new FileReader();
		fileReader.onload = ev => {
			window.console.log('file data: ', ev.target.result);
			this.emit('command', 'importFile', ev.target.result);
		};
		fileReader.readAsText(file);
	}
	_onImportFileSelect(e) {
		e.preventDefault();
		const file = e.originalEvent.target.files[0];
		if (!/\.playlist\.json$/.test(file.name)) {
			return;
		}
		const fileReader = new FileReader();
		fileReader.onload = ev => {
			window.console.log('file data: ', ev.target.result);
			this.emit('command', 'importFile', ev.target.result);
		};
		fileReader.readAsText(file);
	}
	get hasFocus() {
		return this._listView.hasFocus;
	}
}
PlaylistView.__css__ = (`
		.is-playlistEnable .tabSelect.playlist::after {
			content: '▶';
			color: #fff;
			text-shadow: 0 0 8px orange;
		}
		.zenzaScreenMode_sideView .is-playlistEnable .is-notFullscreen .tabSelect.playlist::after  {
			text-shadow: 0 0 8px #336;
		}
		.playlist-container {
			height: 100%;
			overflow: hidden;
			user-select: none;
		}
		.playlist-header {
			height: 32px;
			border-bottom: 1px solid #000;
			background: #333;
			color: #ccc;
			user-select: none;
		}
		.playlist-menu-button {
			display: inline-block;
			cursor: pointer;
			border: 1px solid #333;
			padding: 0px 4px;
			margin: 0 0 0 4px;
			background: #666;
			font-size: 16px;
			line-height: 28px;
			white-space: nowrap;
		}
		.playlist-menu-button:hover {
			border: 1px outset;
		}
		.playlist-menu-button:active {
			border: 1px inset;
		}
		.playlist-menu-button .playlist-menu-icon {
			font-size: 24px;
			line-height: 28px;
		}
		.playlist-container.enable .toggleEnable,
		.playlist-container.loop   .toggleLoop {
			text-shadow: 0 0 6px #f99;
			color: #ff9;
		}
		.playlist-container .toggleLoop icon {
			font-family: STIXGeneral;
		}
		.playlist-container .shuffle {
			font-size: 14px;
		}
		.playlist-container .shuffle::after {
			content: '(´・ω・｀)';
		}
		.playlist-container .shuffle:hover::after {
			content: '(｀・ω・´)';
		}
		.playlist-frame {
			height: calc(100% - 32px);
			transition: opacity 0.3s;
		}
		.shuffle .playlist-frame {
			opacity: 0;
		}
		.playlist-count {
			position: absolute;
			top: 0;
			right: 8px;
			display: inline-block;
			font-size: 14px;
			line-height: 32px;
			cursor: pointer;
		}
		.playlist-count:before {
			content: '▼';
		}
		.playlist-count:hover {
			text-decoration: underline;
		}
		.playlist-menu {
			position: absolute;
			right: 0px;
			top: 24px;
			min-width: 150px;
			background: #333 !important;
		}
		.playlist-menu li {
			line-height: 20px;
			border: none !important;
		}
		.playlist-menu .separator {
			border: 1px inset;
			border-radius: 3px;
			margin: 8px 8px;
		}
		.playlist-file-drop {
			display: none;
			position: absolute;
			width: 94%;
			height: 94%;
			top: 3%;
			left: 3%;
			background: #000;
			color: #ccc;
			opacity: 0.8;
			border: 2px solid #ccc;
			box-shadow: 0 0 4px #fff;
			padding: 16px;
			z-index: 100;
		}
		.playlist-file-drop.show {
			opacity: 0.98 !important;
		}
		.playlist-file-drop.drag-over {
			box-shadow: 0 0 8px #fe9;
			background: #030;
		}
		.playlist-file-drop * {
			pointer-events: none;
		}
		.playlist-file-drop-inner {
			padding: 8px;
			height: 100%;
			border: 1px dotted #888;
		}
		.playlist-import-file-select {
			position: absolute;
			text-indent: -9999px;
			width: 100%;
			height: 20px;
			opacity: 0;
			cursor: pointer;
		}
	`).trim();
PlaylistView.__tpl__ = (`
		<div class="playlist-container">
			<div class="playlist-header">
				<label class="playlist-menu-button toggleEnable playlist-command"
					data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</label>
				<label class="playlist-menu-button toggleLoop playlist-command"
					data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</label>
				<div class="playlist-count playlist-command" data-command="toggleMenu">
					<span class="playlist-index">---</span> / <span class="playlist-length">---</span>
					<div class="zenzaPopupMenu playlist-menu">
						<div class="listInner">
						<ul>
							<li class="playlist-command" data-command="shuffle">
								シャッフル
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="postedAt">
								古い順に並べる
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="view:desc">
								再生の多い順に並べる
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="comment:desc">
								コメントの多い順に並べる
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="title">
								タイトル順に並べる
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="duration:desc">
								動画の長い順に並べる
							</li>
							<li class="playlist-command" data-command="sortBy" data-param="duration">
								動画の短い順に並べる
							</li>
							<hr class="separator">
							<li class="playlist-command" data-command="exportFile">ファイルに保存 &#x1F4BE;</li>
							<li class="playlist-command" data-command="importFileMenu">
								<input type="file" class="playlist-import-file-select" accept=".json">
								ファイルから読み込む
							</li>
							<hr class="separator">
							<li class="playlist-command" data-command="resetPlayedItemFlag">すべて未視聴にする</li>
							<li class="playlist-command" data-command="removePlayedItem">視聴済み動画を消す ●</li>
							<li class="playlist-command" data-command="removeNonActiveItem">リストの消去 ×</li>
						</ul>
						</div>
					</div>
				</div>
			</div>
			<div class="playlist-frame"></div>
			<div class="playlist-file-drop">
				<div class="playlist-file-drop-inner">
					ファイルをここにドロップ
				</div>
			</div>
		</div>
	`).trim();
const PlaylistSession = (storage => {
	const KEY = 'ZenzaWatchPlaylist';
	let lastJson = '';
	return {
		isExist() {
			let data = storage.getItem(KEY);
			if (!data) {
				return false;
			}
			try {
				JSON.parse(data);
				return true;
			} catch (e) {
				return false;
			}
		},
		save(data) {
			const json = JSON.stringify(data);
			if (lastJson === json) { return; }
			lastJson = json;
			try {
				storage.setItem(KEY, json);
			} catch(e) {
				window.console.error(e);
				if (e.name === 'QuotaExceededError' ||
					e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
					storage.clear();
					storage.setItem(KEY, json);
				}
			}
		},
		restore() {
			let data = storage.getItem(KEY);
			if (!data) {
				return null;
			}
			try {
				lastJson = data;
				return JSON.parse(data);
			} catch (e) {
				return null;
			}
		}
	};
})(sessionStorage);
class Playlist extends VideoList {
	initialize(params) {
		this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
		this._container = params.container;
		this._index = -1;
		this._isEnable = false;
		this._isLoop = params.loop;
		this._model = new PlaylistModel({});
		ZenzaWatch.debug.playlist = this;
		this.on('update', _.debounce(() => PlaylistSession.save(this.serialize()), 3000));
		ZenzaWatch.emitter.on('tabChange', tab => {
			if (tab === 'playlist') {
				this.scrollToActiveItem();
			}
		});
	}
	serialize() {
		return {
			items: this._model.serialize(),
			index: this._index,
			enable: this._isEnable,
			loop: this._isLoop
		};
	}
	unserialize(data) {
		if (!data) {
			return;
		}
		this._initializeView();
		console.log('unserialize: ', data);
		this._model.unserialize(data.items);
		this._isEnable = data.enable;
		this._isLoop = data.loop;
		this.emit('update');
		this.setIndex(data.index);
	}
	restoreFromSession() {
		this.unserialize(PlaylistSession.restore());
	}
	_initializeView() {
		if (this._view) {
			return;
		}
		this._view = new PlaylistView({
			container: this._container,
			model: this._model,
			playlist: this
		});
		this._view.on('command', this._onCommand.bind(this));
		this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
		this._view.on('moveItem', this._onMoveItem.bind(this));
	}
	_onCommand(command, param, itemId) {
		let item;
		switch (command) {
			case 'toggleEnable':
				this.toggleEnable();
				break;
			case 'toggleLoop':
				this.toggleLoop();
				break;
			case 'shuffle':
				this.shuffle();
				break;
			case 'sortBy': {
				let [key, order] = param.split(':');
				this.sortBy(key, order === 'desc');
				break;
			}
			case 'clear':
				this._setItemData([]);
				break;
			case 'select':
				item = this._model.findByItemId(itemId);
				this.setIndex(this._model.indexOf(item));
				this.emit('command', 'openNow', item.watchId);
				break;
			case 'playlistRemove':
				item = this._model.findByItemId(itemId);
				this._model.removeItem(item);
				this._refreshIndex();
				this.emit('update');
				break;
			case 'removePlayedItem':
				this.removePlayedItem();
				break;
			case 'resetPlayedItemFlag':
				this._model.resetPlayedItemFlag();
				break;
			case 'removeNonActiveItem':
				this.removeNonActiveItem();
				break;
			case 'exportFile':
				this._onExportFileCommand();
				break;
			case 'importFile':
				this._onImportFileCommand(param);
				break;
			case 'scrollToActiveItem':
				this.scrollToActiveItem(true);
				break;
			default:
				this.emit('command', command, param);
		}
	}
	_onExportFileCommand() {
		let dt = new Date();
		let title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます',
			util.dateToString(dt) + 'のプレイリスト');
		if (!title) {
			return;
		}
		let data = JSON.stringify(this.serialize(), null, 2);
		let blob = new Blob([data], {'type': 'text/html'});
		let url = window.URL.createObjectURL(blob);
		let a = document.createElement('a');
		Object.assign(a, {
			download: title + '.playlist.json',
			rel: 'noopener',
			href: url
		});
		document.body.append(a);
		a.click();
		setTimeout(() => a.remove(), 1000);
	}
	_onImportFileCommand(fileData) {
		if (!util.isValidJson(fileData)) {
			return;
		}
		this.emit('command', 'pause');
		this.emit('command', 'notify', 'プレイリストを復元');
		this.unserialize(JSON.parse(fileData));
		window.setTimeout(() => {
			let index = Math.max(0, fileData.index || 0);
			let item = this._model.getItemByIndex(index);
			if (item) {
				this.setIndex(index, true);
				this.emit('command', 'openNow', item.watchId);
			}
		}, 2000);
	}
	_onMoveItem(srcItemId, destItemId) {
		let srcItem = this._model.findByItemId(srcItemId);
		let destItem = this._model.findByItemId(destItemId);
		if (!srcItem || !destItem) {
			return;
		}
		let destIndex = this._model.indexOf(destItem);
		this._model.removeItem(srcItem);
		this._model.insertItem(srcItem, destIndex);
		this._refreshIndex();
	}
	_setItemData(listData) {
		const items = listData.map(itemData => new VideoListItem(itemData));
		this._model.setItem(items);
		this.setIndex(items.length > 0 ? 0 : -1);
	}
	_replaceAll(videoListItems, options) {
		options = options || {};
		this._model.setItem(videoListItems);
		const item = this._model.findByWatchId(options.watchId);
		if (item) {
			item.isActive = true;
			item.isPlayed = true;
			this._activeItem = item;
			setTimeout(() => this._view.scrollToItem(item), 1000);
		}
		this.setIndex(this._model.indexOf(item));
	}
	_appendAll(videoListItems, options) {
		options = options || {};
		this._model.appendItem(videoListItems);
		const item = this._model.findByWatchId(options.watchId);
		if (item) {
			item.isActive = true;
			item.isPlayed = true;
			this._refreshIndex(false);
		}
		setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
	}
	_insertAll(videoListItems, options) {
		options = options || {};
		this._model.insertItem(
			videoListItems, //.filter(item => item.watchId !== this._activeItem.watchId),
			this.getIndex() + 1);
		const item = this._model.findByWatchId(options.watchId);
		if (item) {
			item.isActive = true;
			item.isPlayed = true;
			this._refreshIndex(false);
		}
		setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
	}
	replaceItems(videoListItemsRawData, options) {
		const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
		return this._replaceAll(items, options);
	}
	appendItems(videoListItemsRawData, options) {
		const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
		return this._appendAll(items, options);
	}
	insertItems(videoListItemsRawData, options) {
		const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
		return this._insertAll(items, options);
	}
	loadFromMylist(mylistId, options) {
		this._initializeView();
		if (!this._mylistApiLoader) {
			this._mylistApiLoader = ZenzaWatch.api.MylistApiLoader;
		}
		window.console.time('loadMylist: ' + mylistId);
		return this._mylistApiLoader
			.getMylistItems(mylistId, options).then(items => {
				window.console.timeEnd('loadMylist: ' + mylistId);
				let videoListItems = items.filter(item => {
					if (item.id === null) {
						return;
					} // ごく稀にある？idが抹消されたレコード
					if (item.item_data) {
						if (parseInt(item.item_type, 10) !== 0) {
							return;
						} // not video
						if (parseInt(item.item_data.deleted, 10) !== 0) {
							return;
						} // 削除動画を除外
					} else {
						if (item.thumbnail_url && item.thumbnail_url.indexOf('video_deleted') >= 0) {
							return;
						}
					}
					return true;
				}).map(item => VideoListItem.createByMylistItem(item));
				if (videoListItems.length < 1) {
					return Promise.reject({
						status: 'fail',
						message: 'マイリストの取得に失敗しました'
					});
				}
				if (options.shuffle) {
					videoListItems = _.shuffle(videoListItems);
				}
				if (options.insert) {
					this._insertAll(videoListItems, options);
				} else if (options.append) {
					this._appendAll(videoListItems, options);
				} else {
					this._replaceAll(videoListItems, options);
				}
				this.emit('update');
				return Promise.resolve({
					status: 'ok',
					message:
						options.append ?
							'マイリストの内容をプレイリストに追加しました' :
							'マイリストの内容をプレイリストに読み込みしました'
				});
			});
	}
	loadUploadedVideo(userId, options) {
		this._initializeView();
		if (!this._uploadedVideoApiLoader) {
			this._uploadedVideoApiLoader = UploadedVideoApiLoader;
		}
		window.console.time('loadUploadedVideos' + userId);
		return this._uploadedVideoApiLoader
			.load(userId, options).then(items => {
				window.console.timeEnd('loadUploadedVideos' + userId);
				let videoListItems = items.map(item => VideoListItem.createByMylistItem(item));
				if (videoListItems.length < 1) {
					return Promise.reject({});
				}
				videoListItems.reverse();
				if (options.shuffle) {
					videoListItems = _.shuffle(videoListItems);
				}
				if (options.insert) {
					this._insertAll(videoListItems, options);
				} else if (options.append) {
					this._appendAll(videoListItems, options);
				} else {
					this._replaceAll(videoListItems, options);
				}
				this.emit('update');
				return Promise.resolve({
					status: 'ok',
					message:
						options.append ?
							'投稿動画一覧をプレイリストに追加しました' :
							'投稿動画一覧をプレイリストに読み込みしました'
				});
			});
	}
	loadSearchVideo(word, options, limit = 300) {
		this._initializeView();
		if (!this._searchApiLoader) {
			this._nicoSearchApiLoader = NicoSearchApiV2Loader;
		}
		window.console.time('loadSearchVideos' + word);
		options = options || {};
		return this._nicoSearchApiLoader
			.searchMore(word, options, limit).then(result => {
				window.console.timeEnd('loadSearchVideos' + word);
				let items = result.list || [];
				let videoListItems = items
					.filter(item => {
						return (item.item_data &&
							parseInt(item.item_data.deleted, 10) === 0) ||
							(item.thumbnail_url || '').indexOf('video_deleted') < 0;
					}).map(item => VideoListItem.createByMylistItem(item));
				if (videoListItems.length < 1) {
					return Promise.reject({});
				}
				if (options.playlistSort) {
					videoListItems = _.sortBy(
						videoListItems, item =>  item.postedAt + item.sortTitle);
				}
				if (options.shuffle) {
					videoListItems = _.shuffle(videoListItems);
				}
				if (options.insert) {
					this._insertAll(videoListItems, options);
				} else if (options.append) {
					this._appendAll(videoListItems, options);
				} else {
					this._replaceAll(videoListItems, options);
				}
				this.emit('update');
				return Promise.resolve({
					status: 'ok',
					message:
						options.append ?
							'検索結果をプレイリストに追加しました' :
							'検索結果をプレイリストに読み込みしました'
				});
			});
	}
	async loadSeriesList(seriesId, options = {}) {
		this._initializeView();
		const data = await RecommendAPILoader.loadSeries(seriesId, options);
		const videoItems = [];
		(data.items || []).forEach(item => {
			if (item.contentType !== 'video') {
				return;
			}
			const content = item.content;
			videoItems.push(new VideoListItem({
				_format: 'recommendApi',
				_data: item,
				id: item.id,
				uniq_id: item.id,
				title: content.title,
				length_seconds: content.duration,
				num_res: content.count.comment,
				mylist_counter: content.count.mylist,
				view_counter: content.count.view,
				thumbnail_url: content.thumbnail.url,
				first_retrieve: content.registeredAt,
				has_data: true,
				is_translated: false
			}));
		});
		if (options.insert) {
			this._insertAll(videoItems, options);
		} else if (options.append) {
			this._appendAll(videoItems, options);
		} else {
			this._replaceAll(videoItems, options);
		}
		this.emit('update');
		return {
			status: 'ok',
			message:
				options.append ? '動画シリーズをプレイリストに追加しました' : '動画シリーズをプレイリストに読み込みしました'
		};
	}
	insert(watchId) {
		this._initializeView();
		if (this._activeItem && this._activeItem.watchId === watchId) {
			return Promise.resolve();
		}
		const model = this._model;
		const index = this._index;
		return this._thumbInfoLoader.load(watchId).then(info => {
			info.id = info.isChannel ? info.id : watchId;
			const item = VideoListItem.createByThumbInfo(info);
			model.insertItem(item, index + 1);
			this._refreshIndex(true);
			this.emit('update');
			this.emit('command', 'notifyHtml',
				`次に再生: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
			);
		}).catch(result => {
			const item = VideoListItem.createBlankInfo(watchId);
			model.insertItem(item, index + 1);
			this._refreshIndex(true);
			this.emit('update');
			window.console.error(result);
			this.emit('command', 'alert', `動画情報の取得に失敗: ${watchId}`);
		});
	}
	insertCurrentVideo(videoInfo) {
		this._initializeView();
		if (this._activeItem &&
			!this._activeItem.isBlankData &&
			this._activeItem.watchId === videoInfo.watchId) {
			this._activeItem.updateByVideoInfo(videoInfo);
			this._activeItem.isPlayed = true;
			this.scrollToActiveItem();
			return;
		}
		let currentItem = this._model.findByWatchId(videoInfo.watchId);
		if (currentItem && !currentItem.isBlankData) {
			currentItem.updateByVideoInfo(videoInfo);
			currentItem.isPlayed = true;
			this.setIndex(this._model.indexOf(currentItem));
			this.scrollToActiveItem();
			return;
		}
		const item = VideoListItem.createByVideoInfoModel(videoInfo);
		item.isPlayed = true;
		if (this._activeItem) {
			this._activeItem.isActive = false;
		}
		this._model.insertItem(item, this._index + 1);
		this._activeItem = this._model.findByItemId(item.itemId);
		this._refreshIndex(true);
	}
	removeItemByWatchId(watchId) {
		const item = this._model.findByWatchId(watchId);
		if (!item || item.isActive) {
			return;
		}
		this._model.removeItem(item);
		this._refreshIndex(true);
	}
	append(watchId) {
		this._initializeView();
		if (this._activeItem && this._activeItem.watchId === watchId) {
			return Promise.resolve();
		}
		const model = this._model;
		return this._thumbInfoLoader.load(watchId).then(info => {
			info.id = watchId;
			const item = VideoListItem.createByThumbInfo(info);
			model.appendItem(item);
			this._refreshIndex();
			this.emit('update');
			this.emit('command', 'notifyHtml',
				`リストの末尾に追加: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
			);
		}).catch(result => {
			const item = VideoListItem.createBlankInfo(watchId);
			model.appendItem(item);
			this._refreshIndex(true);
			this._refreshIndex();
			window.console.error(result);
			this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
		});
	}
	getIndex() {
		return this._activeItem ? this._index : -1;
	}
	setIndex(v, force) {
		v = parseInt(v, 10);
		if (this._index !== v || force) {
			this._index = v;
			if (this._activeItem) {
				this._activeItem.isActive = false;
			}
			this._activeItem = this._model.getItemByIndex(v);
			if (this._activeItem) {
				this._activeItem.isActive = true;
			}
			this.emit('update');
		}
	}
	_refreshIndex(scrollToActive) {
		this.setIndex(this._model.indexOf(this._activeItem), true);
		if (scrollToActive) {
			setTimeout(() => this.scrollToActiveItem(true), 1000);
		}
	}
	_setIndexByItemId(itemId) {
		const item = this._model.findByItemId(itemId);
		if (item) {
			this._setIndexByItem(item);
		}
	}
	_setIndexByItem(item) {
		const index = this._model.indexOf(item);
		if (index >= 0) {
			this.setIndex(index);
		}
	}
	toggleEnable(v) {
		if (!_.isBoolean(v)) {
			this._isEnable = !this._isEnable;
			this.emit('update');
			return;
		}
		if (this._isEnable !== v) {
			this._isEnable = v;
			this.emit('update');
		}
	}
	toggleLoop() {
		this._isLoop = !this._isLoop;
		this.emit('update');
	}
	shuffle() {
		this._model.shuffle();
		if (this._activeItem) {
			this._model.removeItem(this._activeItem);
			this._model.insertItem(this._activeItem, 0);
			this.setIndex(0);
		} else {
			this.setIndex(-1);
		}
		this._view.scrollTop(0);
	}
	sortBy(key, isDesc) {
		this._model.sortBy(key, isDesc);
		this._refreshIndex(true);
		setTimeout(() => {
			this._view.scrollToItem(this._activeItem);
		}, 1000);
	}
	removePlayedItem() {
		this._model.removePlayedItem();
		this._refreshIndex(true);
		setTimeout(() => {
			this._view.scrollToItem(this._activeItem);
		}, 1000);
	}
	removeNonActiveItem() {
		this._model.removeNonActiveItem();
		this._refreshIndex(true);
		this.toggleEnable(false);
	}
	selectNext() {
		if (!this.hasNext) {
			return null;
		}
		let index = this.getIndex();
		let len = this.length;
		if (len < 1) {
			return null;
		}
		if (index < -1) {
			this.setIndex(0);
		} else if (index + 1 < len) {
			this.setIndex(index + 1);
		} else if (this.isLoop) {
			this.setIndex((index + 1) % len);
		}
		return this._activeItem ? this._activeItem.watchId : null;
	}
	selectPrevious() {
		let index = this.getIndex();
		let len = this.length;
		if (len < 1) {
			return null;
		}
		if (index < -1) {
			this.setIndex(0);
		} else if (index > 0) {
			this.setIndex(index - 1);
		} else if (this.isLoop) {
			this.setIndex((index + len - 1) % len);
		} else {
			return null;
		}
		return this._activeItem ? this._activeItem.watchId : null;
	}
	scrollToActiveItem(force) {
		if (this._activeItem && (force || !this._view.hasFocus)) {
			this._view.scrollToItem(this._activeItem, force);
		}
	}
	scrollToWatchId(watchId) {
		const item = this._model.findByWatchId(watchId);
		if (item) {
			this._view.scrollToItem(item);
		}
	}
	findByWatchId(watchId) {
		return this._model.findByWatchId(watchId);
	}
	get isEnable() {
		return this._isEnable;
	}
	get isLoop() {
		return this._isLoop;
	}
	get length() {
		return this._model.length;
	}
	get hasNext() {
		const len = this.length;
		return len > 0 && (this.isLoop || this._index < len - 1);
	}
}

class ClassListWrapper {
	constructor(element) {
		this._element = element;
		this._next = Array.from(element.classList).sort();
		this._last = this._next;
		this.apply = bounce.raf(this.apply.bind(this));
	}
	add(...names) {
		this._next.push(...names.filter(name => !this._next.includes(name)));
		this.apply();
		return true;
	}
	remove(...names) {
		this._next = this._next.filter(name => !names.includes(name));
		this.apply();
		return false;
	}
	contains(name) {
		return this._next.includes(name);
	}
	toggle(name, v) {
		if (v !== undefined) {
			v = !!v;
		} else {
			v = !this.contains(name);
		}
		return v ? this.add(name) : this.remove(name);
	}
	apply() {
		const last = this._last.join(',');
		const next = this._next.sort().join(',');
		if (next === last) { return; }
		const added   = this._next.filter(name => !this._last.includes(name));
		const removed = this._last.filter(name => !this._next.includes(name));
		if (added.length)   { this._element.classList.add(...added); }
		if (removed.length) { this._element.classList.remove(...removed); }
		this._next = Array.from(this._element.classList).sort();
		this._last = this._next.concat();
		return this;
	}
}
class PlayerConfig {
	static getInstance(config) {
		if (!PlayerConfig.instance) {
			PlayerConfig.instance = this.wrapKey(config);
		}
		return PlayerConfig.instance;
	}
	static wrapKey(config, mode = '') {
		if (!mode && util.isGinzaWatchUrl()) {
			mode = 'ginza';
		} else if (location && location.host.indexOf('.nicovideo.jp') < 0) {
			mode = 'others';
		}
		if (!mode) { return config; }
		config.getNativeKey = key => {
			switch(mode) {
				case 'ginza':
					if (['autoPlay', 'screenMode'].includes(key)) {
						return `${key}:${mode}`;
					}
				break;
				case 'others':
					if (['autoPlay', 'screenMode', 'overrideWatchLink'].includes(key)) {
						return `${key}:${mode}`;
					}
				break;
			}
			return key;
		};
		return config;
	}
}
class VideoWatchOptions {
	constructor(watchId, options, config) {
		this._watchId = watchId;
		this._options = options || {};
		this._config = config;
	}
	get rawData() {
		return this._options;
	}
	get eventType() {
		return this._options.eventType || '';
	}
	get query() {
		return this._options.query || {};
	}
	get videoLoadOptions() {
		let options = {
			economy: this.isEconomySelected
		};
		return options;
	}
	get mylistLoadOptions() {
		let options = {};
		let query = this.query;
		if (query.mylist_sort) {
			options.sort = query.mylist_sort;
		}
		options.group_id = query.group_id;
		options.watchId = this._watchId;
		return options;
	}
	get isPlaylistStartRequest() {
		let eventType = this.eventType;
		let query = this.query;
		if (eventType !== 'click' || query.continuous !== '1') {
			return false;
		}
		if (['mylist', 'deflist', 'tag', 'search'].includes(query.playlist_type) &&
			(query.group_id || query.order)) {
			return true;
		}
		return false;
	}
	hasKey(key) {
		return _.has(this._options, key);
	}
	get isOpenNow() {
		return this._options.openNow === true;
	}
	get isEconomySelected() {
		return _.isBoolean(this._options.economy) ?
			this._options.economy : this._config.getValue('smileVideoQuality') === 'eco';
	}
	get isAutoCloseFullScreen() {
		return !!this._options.autoCloseFullScreen;
	}
	get isReload() {
		return this._options.reloadCount > 0;
	}
	get videoServerType() {
		return this._options.videoServerType;
	}
	get isAutoZenTubeDisabled() {
		return !!this._options.isAutoZenTubeDisabled;
	}
	get reloadCount() {
		return this._options.reloadCount;
	}
	get currentTime() {
		return _.isNumber(this._options.currentTime) ?
			parseFloat(this._options.currentTime, 10) : 0;
	}
	createForVideoChange(options) {
		options = options || {};
		delete this._options.economy;
		_.defaults(options, this._options);
		options.openNow = true;
		delete options.videoServerType;
		options.isAutoZenTubeDisabled = false;
		options.currentTime = 0;
		options.reloadCount = 0;
		options.query = {};
		return options;
	}
	createForReload(options) {
		options = options || {};
		delete this._options.economy;
		options.isAutoZenTubeDisabled = typeof options.isAutoZenTubeDisabled === 'boolean' ?
			options.isAutoZenTubeDisabled : true;
		_.defaults(options, this._options);
		options.openNow = true;
		options.reloadCount = options.reloadCount ? (options.reloadCount + 1) : 1;
		options.query = {};
		return options;
	}
	createForSession(options) {
		options = options || {};
		_.defaults(options, this._options);
		options.query = {};
		return options;
	}
}
class NicoVideoPlayerDialogView extends Emitter {
	constructor(...args) {
		super();
		this.initialize(...args);
	}
	initialize(params) {
		const dialog = this._dialog = params.dialog;
		this._playerConfig = params.playerConfig;
		this._nicoVideoPlayer = params.nicoVideoPlayer;
		this._state = params.playerState;
		this._currentTimeGetter = params.currentTimeGetter;
		this._aspectRatio = 9 / 16;
		dialog.on('canPlay', this._onVideoCanPlay.bind(this));
		dialog.on('videoCount', this._onVideoCount.bind(this));
		dialog.on('error', this._onVideoError.bind(this));
		dialog.on('play', this._onVideoPlay.bind(this));
		dialog.on('playing', this._onVideoPlaying.bind(this));
		dialog.on('pause', this._onVideoPause.bind(this));
		dialog.on('stalled', this._onVideoStalled.bind(this));
		dialog.on('abort', this._onVideoAbort.bind(this));
		dialog.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
		dialog.on('volumeChange', this._onVolumeChange.bind(this));
		dialog.on('volumeChangeEnd', this._onVolumeChangeEnd.bind(this));
		dialog.on('beforeVideoOpen', this._onBeforeVideoOpen.bind(this));
		dialog.on('loadVideoInfoFail', this._onVideoInfoFail.bind(this));
		dialog.on('videoServerType', this._onVideoServerType.bind(this));
		this._initializeDom();
		this._state.on('update', this._onPlayerStateUpdate.bind(this));
		this._state.onkey('videoInfo', this._onVideoInfoLoad.bind(this));
	}
	async _initializeDom() {
		util.addStyle(NicoVideoPlayerDialogView.__css__);
		const $dialog = this._$dialog = util.$.html(NicoVideoPlayerDialogView.__tpl__.trim());
		const onCommand = this._onCommand.bind(this);
		const config = this._playerConfig;
		const state = this._state;
		this._$body = util.$('body, html');
		const $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
		const container = $container[0];
		const classList = this._classList = new ClassListWrapper(container);
		container.addEventListener('click', e => {
			global.emitter.emitAsync('hideHover');
			if (
				e.target.classList.contains('touchWrapper') &&
				config.getValue('enableTogglePlayOnClick') &&
				!classList.contains('menuOpen')) {
				onCommand('togglePlay');
			}
			e.preventDefault();
			e.stopPropagation();
			classList.remove('menuOpen');
		});
		container.addEventListener('command', e=> {
			e.stopPropagation();
			e.preventDefault();
			this._onCommand(e.detail.command, e.detail.param);
		});
		container.addEventListener('focusin', e => {
			let target = (e.path && e.path.length) ? e.path[0] : e.target;
			if (target.dataset.hasSubmenu) {
				classList.add('menuOpen');
			}
		});
		this._applyState();
		let lastX = 0, lastY = 0;
		let onMouseMove = this._onMouseMove.bind(this);
		let onMouseMoveEnd = _.debounce(this._onMouseMoveEnd.bind(this), 400);
		container.addEventListener('mousemove', _.throttle(e => {
			if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
				return;
			}
			lastX = e.screenX;
			lastY = e.screenY;
			onMouseMove(e);
			onMouseMoveEnd(e);
		}, 100));
		$dialog
			.on('dblclick', e => {
				if (!e.target || e.target.id !== 'zenzaVideoPlayerDialog') {
					return;
				}
				if (config.getValue('enableDblclickClose')) {
					this.emit('command', 'close');
				}
			})
			.toggleClass('is-guest', !util.isLogin());
		this._hoverMenu = new VideoHoverMenu({
			playerContainer: container,
			playerState: state
		});
		this._commentInput = new CommentInputPanel({
			$playerContainer: $container,
			playerConfig: config
		});
		this._commentInput.on('post', (e, chat, cmd) =>
			this.emit('postChat', e, chat, cmd));
		let hasPlaying = false;
		this._commentInput.on('focus', isAutoPause => {
			hasPlaying = state.isPlaying;
			if (isAutoPause) {
				this.emit('command', 'pause');
			}
		});
		this._commentInput.on('blur', isAutoPause => {
			if (isAutoPause && hasPlaying && state.isOpen) {
				this.emit('command', 'play');
			}
		});
		this._commentInput.on('esc', () => this._escBlockExpiredAt = Date.now() + 1000 * 2);
		this._settingPanel = new SettingPanel({
			$playerContainer: $container,
			playerConfig: config,
			player: this._dialog
		});
		this._settingPanel.on('command', onCommand);
		await sleep.idle();
		this._videoControlBar = new VideoControlBar({
			$playerContainer: $container,
			playerConfig: config,
			player: this._dialog,
			playerState: this._state,
			currentTimeGetter: this._currentTimeGetter
		});
		this._videoControlBar.on('command', onCommand);
		this._$errorMessageContainer = $container.find('.errorMessageContainer');
		await sleep.idle();
		this._initializeVideoInfoPanel();
		this._initializeResponsive();
		this.selectTab(this._state.currentTab);
		document.documentElement.addEventListener('paste', this._onPaste.bind(this));
		global.emitter.on('showMenu', () => this.addClass('menuOpen'));
		global.emitter.on('hideMenu', () => this.removeClass('menuOpen'));
		global.emitter.on('fullscreenStatusChange', () => this._applyScreenMode(true));
		document.body.append($dialog[0]);
		this.emitResolve('dom-ready');
	}
	_initializeVideoInfoPanel() {
		if (this._videoInfoPanel) {
			return this._videoInfoPanel;
		}
		this._videoInfoPanel = new VideoInfoPanel({
			dialog: this,
			node: this._$playerContainer
		});
		this._videoInfoPanel.on('command', this._onCommand.bind(this));
		return this._videoInfoPanel;
	}
	_onCommand(command, param) {
		switch (command) {
			case 'settingPanel':
				this.toggleSettingPanel();
				break;
			case 'toggle-flipH':
				this.toggleClass('is-flipH');
				break;
			case 'toggle-flipV':
				this.toggleClass('is-flipV');
				break;
			default:
				this.emit('command', command, param);
		}
	}
	async _onPaste(e) {
		const isZen = !!e.target.closest('.zenzaVideoPlayerDialog');
		window.console.log('onPaste', e.target, isZen);
		if (!isZen && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
			return;
		}
		let text;
		try { text = await navigator.clipboard.readText(); } catch(e) { window.console.warn(e); }
		if (!text) {
			return;
		}
		text = text.trim();
		const isOpen = this._state.isOpen;
		const watchIdReg = /((nm|sm|so)\d+)/.exec(text);
		if (watchIdReg) {
			return this._onCommand('open', watchIdReg[1]);
		}
		if (!isOpen) {
			return;
		}
		const youtubeReg = /^https?:\/\/((www\.|)youtube\.com\/watch|youtu\.be)/.exec(text);
		if (youtubeReg) {
			return this._onCommand('setVideo', text);
		}
		const seekReg = /^(\d+):(\d+)$/.exec(text);
		if (seekReg) {
			return this._onCommand('seek', seekReg[1] * 60 + seekReg[2] * 1);
		}
		const mylistReg = /mylist(\/#\/|\/)(\d+)/.exec(text);
		if (mylistReg) {
			return this._onCommand('playlistSetMylist', mylistReg[2]);
		}
		const ownerReg = /user\/(\d+)/.exec(text);
		if (ownerReg) {
			return this._onCommand('playlistSetUploadedVideo', ownerReg[1]);
		}
	}
	_initializeResponsive() {
		window.addEventListener('resize', _.debounce(this._updateResponsive.bind(this), 500));
		this._varMapper = new VariablesMapper({config: this._playerConfig});
		this._varMapper.on('update', () => this._updateResponsive());
	}
	_updateResponsive() {
		if (!this._state.isOpen) {
			return;
		}
		let $container = this._$playerContainer;
		let $header = $container.find('.zenzaWatchVideoHeaderPanel');
		let config = this._playerConfig;
		const update = () => {
			const w = window.innerWidth, h = window.innerHeight;
			const vMargin = h - w * this._aspectRatio;
			const controlBarMode = config.getValue('fullscreenControlBarMode');
			if (controlBarMode === 'always-hide') {
				this.toggleClass('showVideoControlBar', false);
				return;
			}
			let videoControlBarHeight = this._varMapper.videoControlBarHeight;
			let showVideoHeaderPanel = vMargin >= videoControlBarHeight + $header[0].offsetHeight * 2;
			let showVideoControlBar;
			switch (controlBarMode) {
				case 'always-show':
					showVideoControlBar = true;
					break;
				case 'auto':
				default:
					showVideoControlBar = vMargin >= videoControlBarHeight;
			}
			this.toggleClass('showVideoControlBar', showVideoControlBar);
			this.toggleClass('showVideoHeaderPanel', showVideoHeaderPanel);
		};
		update();
	}
	_onMouseMove() {
		if (this._isMouseMoving) {
			return;
		}
		this.addClass('is-mouseMoving');
		this._isMouseMoving = true;
	}
	_onMouseMoveEnd() {
		if (!this._isMouseMoving) {
			return;
		}
		this.removeClass('is-mouseMoving');
		this._isMouseMoving = false;
	}
	_onVideoCanPlay(watchId, videoInfo, options) {
		this.emit('canPlay', watchId, videoInfo, options);
	}
	_onVideoCount({comment, view, mylist} = {}) {
		this.emit('videoCount', {comment, view, mylist});
	}
	_onVideoError(e) {
		this.emit('error', e);
	}
	_onBeforeVideoOpen() {
		this._setThumbnail();
	}
	_onVideoInfoLoad(videoInfo) {
		this._videoInfoPanel.update(videoInfo);
	}
	_onVideoInfoFail(videoInfo) {
		if (videoInfo) {
			this._videoInfoPanel.update(videoInfo);
		}
	}
	_onVideoServerType(type, sessionInfo) {
		this.toggleClass('is-dmcPlaying', type === 'dmc');
		this.emit('videoServerType', type, sessionInfo);
	}
	_onVideoPlay() {
	}
	_onVideoPlaying() {
	}
	_onVideoPause() {
	}
	_onVideoStalled() {
	}
	_onVideoAbort() {
	}
	_onVideoAspectRatioFix(ratio) {
		this._aspectRatio = ratio;
		this._updateResponsive();
	}
	_onVolumeChange(/*vol, mute*/) {
		this.addClass('volumeChanging');
	}
	_onVolumeChangeEnd(/*vol, mute*/) {
		this.removeClass('volumeChanging');
	}
	_onScreenModeChange() {
		this._applyScreenMode();
	}
	_getStateClassNameTable() {
		return this._classNameTable = this._classNameTable || objUtil.toMap({
			isAbort: 'is-abort',
			isBackComment: 'is-backComment',
			isShowComment: 'is-showComment',
			isDebug: 'is-debug',
			isDmcAvailable: 'is-dmcAvailable',
			isDmcPlaying: 'is-dmcPlaying',
			isError: 'is-error',
			isLoading: 'is-loading',
			isMute: 'is-mute',
			isLoop: 'is-loop',
			isOpen: 'is-open',
			isPlaying: 'is-playing',
			isSeeking: 'is-seeking',
			isPausing: 'is-pausing',
			isChanging: 'is-changing',
			isUpdatingDeflist: 'is-updatingDeflist',
			isUpdatingMylist: 'is-updatingMylist',
			isPlaylistEnable: 'is-playlistEnable',
			isCommentPosting: 'is-commentPosting',
			isRegularUser: 'is-regularUser',
			isWaybackMode: 'is-waybackMode',
			isNotPlayed: 'is-notPlayed',
			isYouTube: 'is-youTube'
		});
	}
	_onPlayerStateChange(changedState) {
		for (const key of changedState.keys()) {
			this._onPlayerStateUpdate(key, changedState.get(key));
		}
	}
	_onPlayerStateUpdate(key, value) {
		switch (key) {
			case 'thumbnail':
				return this._setThumbnail(value);
			case 'screenMode':
			case 'isOpen':
				if (this._state.isOpen) {
					this.show();
					this._onScreenModeChange();
				} else {
					this.hide();
				}
				return;
			case 'errorMessage':
				return this._$errorMessageContainer[0].textContent = value;
			case 'currentTab':
				return this.selectTab(value);
		}
		const table = this._getStateClassNameTable();
		const className = table.get(key);
		if (className) {
			this.toggleClass(className, !!value);
		}
	}
	_applyState() {
		const table = this._getStateClassNameTable();
		const state = this._state;
		for (const [key, className] of table) {
			this._classList.toggle(className, state[key]);
		}
		if (this._state.isOpen) {
			this._applyScreenMode();
		}
	}
	_getScreenModeClassNameTable() {
		return [
			'zenzaScreenMode_3D',
			'zenzaScreenMode_small',
			'zenzaScreenMode_sideView',
			'zenzaScreenMode_normal',
			'zenzaScreenMode_big',
			'zenzaScreenMode_wide'
		];
	}
	_applyScreenMode(force = false) {
		const screenMode = `zenzaScreenMode_${this._state.screenMode}`;
		if (!force && this._lastScreenMode === screenMode) { return; }
		this._lastScreenMode = screenMode;
		const body = this._$body;
		const modes = this._getScreenModeClassNameTable();
		const isFull = util.fullscreen.now();
		Object.assign(document.body.dataset, {
			screenMode: this._state.screenMode,
			fullscreen: isFull ? 'yes' : 'no'
		});
		modes.forEach(m => body.toggleClass(m, m === screenMode && !isFull));
		this._updateScreenModeStyle();
	}
	_updateScreenModeStyle() {
		if (!this._state.isOpen) {
			util.StyleSwitcher.update({off: 'style.screenMode'});
			return;
		}
		if (Fullscreen.now()) {
			util.StyleSwitcher.update({
				on: 'style.screenMode.for-full, style.screenMode.for-screen-full',
				off: 'style.screenMode:not(.for-full):not(.for-screen-full), link[href*="watch.css"]'
			});
			return;
		}
		let on, off;
		switch (this._state.screenMode) {
			case '3D':
			case 'wide':
				on = 'style.screenMode.for-full, style.screenMode.for-window-full';
				off = 'style.screenMode:not(.for-full):not(.for-window-full), link[href*="watch.css"]';
				break;
			default:
			case 'normal':
			case 'big':
				on = 'style.screenMode.for-dialog, style.screenMode.for-big, style.screenMode.for-normal, link[href*="watch.css"]';
				off = 'style.screenMode:not(.for-dialog):not(.for-big):not(.for-normal)';
				break;
			case 'small':
			case 'sideView':
				on = 'style.screenMode.for-popup, style.screenMode.for-sideView, .style.screenMode.for-small, link[href*="watch.css"]';
				off = 'style.screenMode:not(.for-popup):not(.for-sideView):not(.for-small)';
				break;
		}
		util.StyleSwitcher.update({on, off});
	}
	show() {
		this._$dialog.addClass('is-open');
		if (!Fullscreen.now()) {
			document.body.classList.remove('fullscreen');
		}
		this._$body.addClass('showNicoVideoPlayerDialog');
		util.StyleSwitcher.update({on: 'style.zenza-open'});
		this._updateScreenModeStyle();
	}
	hide() {
		this._$dialog.removeClass('is-open');
		this._settingPanel.hide();
		this._$body.removeClass('showNicoVideoPlayerDialog');
		util.StyleSwitcher.update({off: 'style.zenza-open, style.screenMode', on: 'link[href*="watch.css"]'});
		this._clearClass();
	}
	_clearClass() {
		const modes = this._getScreenModeClassNameTable().join(' ');
		this._lastScreenMode = '';
		this._$body.removeClass(modes);
	}
	_setThumbnail(thumbnail) {
		if (thumbnail) {
			this.css('background-image', `url(${thumbnail})`);
		} else {
			this.css('background-image', `url(${CONSTANT.BLANK_PNG})`);
		}
	}
	focusToCommentInput() {
		window.setTimeout(() => this._commentInput.focus(), 0);
	}
	toggleSettingPanel() {
		this._settingPanel.toggle();
	}
	get$Container() {
		return this._$playerContainer;
	}
	css(key, val) {
		this._$playerContainer.css(key, val);
	}
	addClass(name) {
		const cls = name.split(/\s+/).filter(cn => !this._classList.contains(cn));
		if (!cls.length) { return; }
		return this._classList.add(...cls);
	}
	removeClass(name) {
		const cls = name.split(/\s+/).filter(cn => this._classList.contains(cn));
		if (!cls.length) { return; }
		return this._classList.remove(...cls);
	}
	toggleClass(name, v) {
		if (typeof v === 'boolean') {
			return v ? this.addClass(name) : this.removeClass(name);
		}
		name.split(/\s+/).forEach(n => this._classList.toggle(n));
	}
	hasClass(name) {
		const container = this._$playerContainer[0];
		return container.classList.contains(name);
	}
	appendTab(name, title) {
		return this._videoInfoPanel.appendTab(name, title);
	}
	selectTab(name) {
		this._playerConfig.props.videoInfoPanelTab = name;
		this._state.currentTab = name;
		this._videoInfoPanel.selectTab(name);
		global.emitter.emit('tabChange', name);
	}
	execCommand(command, param) {
		this.emit('command', command, param);
	}
	blinkTab(name) {
		this._videoInfoPanel.blinkTab(name);
	}
	clearPanel() {
		this._videoInfoPanel.clear();
	}
}
util.addStyle(`
	#zenzaVideoPlayerDialog {
		touch-action: manipulation; /* for Safari */
		touch-action: none;
	}
	#zenzaVideoPlayerDialog::before {
		display: none;
	}
	.zenzaPlayerContainer {
		left: 0 !important;
		top:  0 !important;
		width:  100vw !important;
		height: 100vh !important;
		contain: size layout;
	}
	.videoPlayer,
	.commentLayerFrame,
	.resizeObserver {
		top:  0 !important;
		left: 0 !important;
		width:  100vw !important;
		height: 100% !important;
		right:  0 !important;
		border: 0 !important;
		z-index: 100 !important;
		contain: layout style size paint;
		will-change: transform,opacity;
	}
	.resizeObserver {
		z-index: -1;
		opacity: 0;
		pointer-events: none;
	}
	.is-open .videoPlayer>* {
		cursor: none;
	}
	.showVideoControlBar {
		--padding-bottom: ${VideoControlBar.BASE_HEIGHT}px;
		--padding-bottom: var(--zenza-control-bar-height);
	}
	.zenzaStoryboardOpen .showVideoControlBar {
		--padding-bottom: calc(var(--zenza-control-bar-height) + 80px);
	}
	.zenzaStoryboardOpen.is-fullscreen .showVideoControlBar {
		--padding-bottom: calc(var(--zenza-control-bar-height) + 50px);
	}
	.showVideoControlBar .videoPlayer,
	.showVideoControlBar .commentLayerFrame,
	.showVideoControlBar .resizeObserver {
		height: calc(100% - var(--padding-bottom)) !important;
	}
	.showVideoControlBar .videoPlayer {
		z-index: 100 !important;
	}
	.showVideoControlBar .commentLayerFrame {
		z-index: 101 !important;
	}
	.is-showComment.is-backComment .videoPlayer
	{
		top:  25% !important;
		left: 25% !important;
		width:  50% !important;
		height: 50% !important;
		right:  0 !important;
		bottom: 0 !important;
		border: 0 !important;
		z-index: 102 !important;
	}
	body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
		transform: perspective(700px) rotateX(10deg);
		margin-top: -5%;
	}
	.zenzaPlayerContainer {
		left: 0;
		width: 100vw;
		height: 100vh;
		box-shadow: none;
	}
	.is-backComment .videoPlayer {
		left: 25%;
		top:  25%;
		width:  50%;
		height: 50%;
		z-index: 102;
	}
	body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
		transform: perspective(600px) rotateX(10deg);
		height: 100%;
	}
	body[data-screen-mode="3D"] .zenzaPlayerContainer .commentLayerFrame {
		transform: translateZ(0) perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
		opacity: 0.9;
		height: 100%;
		margin-left: 20%;
	}
`, {className: 'screenMode for-full', disabled: true});
util.addStyle(`
	body #zenzaVideoPlayerDialog {
		contain: style size;
	}
	#zenzaVideoPlayerDialog::before {
		display: none;
	}
	body.zenzaScreenMode_sideView {
		--sideView-left-margin: ${CONSTANT.SIDE_PLAYER_WIDTH + 24}px;
		--sideView-top-margin: 76px;
		margin-left: var(--sideView-left-margin);
		margin-top: var(--sideView-top-margin);
		width: auto;
	}
	body.zenzaScreenMode_sideView.nofix {
		--sideView-top-margin: 40px;
	}
	body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
		width: auto;
	}
	body.zenzaScreenMode_sideView:not(.nofix) #siteHeader #siteHeaderInner {
		width: auto;
	}
.zenzaScreenMode_sideView .zenzaVideoPlayerDialog.is-open,
.zenzaScreenMode_small .zenzaVideoPlayerDialog.is-open {
		display: block;
		top: 0; left: 0; right: 100%; bottom: 100%;
	}
	.zenzaScreenMode_sideView .zenzaPlayerContainer,
	.zenzaScreenMode_small .zenzaPlayerContainer {
		width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
		height: ${CONSTANT.SIDE_PLAYER_HEIGHT}px;
	}
	.is-open .zenzaVideoPlayerDialog {
		contain: layout style size;
	}
	.zenzaVideoPlayerDialogInner {
		top: 0;
		left: 0;
		transform: none;
	}
	@media screen and (min-width: 1432px)
	{
		body.zenzaScreenMode_sideView {
			--sideView-left-margin: calc(100vw - 1024px);
		}
		body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
			width: calc(100vw - (100vw - 1024px));
		}
		.zenzaScreenMode_sideView .zenzaPlayerContainer {
			width: calc(100vw - 1024px);
			height: calc((100vw - 1024px) * 9 / 16);
		}
	}
`, {className: 'screenMode for-popup', disabled: true});
util.addStyle(`
body.zenzaScreenMode_sideView,
body.zenzaScreenMode_small {
	border-bottom: 40px solid;
	margin-top: 0;
}
`, {className: 'domain slack-com', disabled: true});
util.addStyle(`
	.zenzaScreenMode_normal .zenzaPlayerContainer .videoPlayer {
		left: 2.38%;
		width: 95.23%;
	}
	.zenzaScreenMode_big .zenzaPlayerContainer {
		width: ${CONSTANT.BIG_PLAYER_WIDTH}px;
		height: ${CONSTANT.BIG_PLAYER_HEIGHT}px;
	}
`, {className: 'screenMode for-dialog', disabled: true});
util.addStyle(`
	.zenzaScreenMode_3D,
	.zenzaScreenMode_normal,
	.zenzaScreenMode_big,
	.zenzaScreenMode_wide
	{
		overflow-x: hidden !important;
		overflow-y: hidden !important;
		overflow: hidden !important;
	}
	/*
		プレイヤーが動いてる間、裏の余計な物のマウスイベントを無効化
		多少軽量化が期待できる？
	*/
	body.zenzaScreenMode_big >*:not(.zen-family) *,
	body.zenzaScreenMode_normal >*:not(.zen-family) *,
	body.zenzaScreenMode_wide >*:not(.zen-family) *,
	body.zenzaScreenMode_3D >*:not(.zen-family) * {
		pointer-events: none;
		user-select: none;
		animation-play-state: paused !important;
		contain: style layout paint;
	}
	body.zenzaScreenMode_3D >:not(.zen-family),
	body.zenzaScreenMode_wide >:not(.zen-family),
	body.is-fullscreen >:not(.zen-family) {
		visibility: hidden;
		pointer-events: none;
		user-select: none;
	}
	body.zenzaScreenMode_big .ZenButton,
	body.zenzaScreenMode_normal .ZenButton,
	body.zenzaScreenMode_wide .ZenButton,
	body.zenzaScreenMode_3D  .ZenButton {
		display: none;
	}
	.ads, .banner, iframe[name^="ads"] {
		visibility: hidden !important;
		pointer-events: none;
	}
	.VideoThumbnailComment {
		display: none !important;
	}
	/* 大百科の奴 */
	#scrollUp {
		display: none !important;
	}
	.SeriesDetailContainer-backgroundInner {
		background-image: none !important;
		filter: none !important;
	}
	.Hidariue-image {
		visibility: hidden !important;
	}
`, {className: 'zenza-open', disabled: true});
NicoVideoPlayerDialogView.__css__ = `
	.zenzaVideoPlayerDialog {
		display: none;
		position: fixed;
		/*background: rgba(0, 0, 0, 0.8);*/
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: ${CONSTANT.BASE_Z_INDEX};
		font-size: 13px;
		text-align: left;
		box-sizing: border-box;
		contain: size style layout;
	}
	.zenzaVideoPlayerDialog::before {
		content: ' ';
		background: rgba(0, 0, 0, 0.8);
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		will-change: transform;
	}
	.is-regularUser  .forPremium {
		display: none !important;
	}
	.forDmc {
		display: none;
	}
	.is-dmcPlaying .forDmc {
		display: inherit;
	}
	.zenzaVideoPlayerDialog * {
		box-sizing: border-box;
	}
	.zenzaVideoPlayerDialog.is-open {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.zenzaVideoPlayerDialog li {
		text-align: left;
	}
	.zenzaVideoPlayerDialogInner {
		background: #000;
		box-sizing: border-box;
		z-index: ${CONSTANT.BASE_Z_INDEX + 1};
		box-shadow: 4px 4px 4px #000;
	}
	.zenzaPlayerContainer {
		position: relative;
		background: #000;
		width: 672px;
		height: 384px;
		background-size: cover;
		background-repeat: no-repeat;
		background-position: center center;
	}
	.zenzaPlayerContainer.is-loading {
		cursor: wait;
	}
	.zenzaPlayerContainer:not(.is-loading):not(.is-error) {
		background-image: none !important;
		background: #000 !important;
	}
	.zenzaPlayerContainer.is-loading .videoPlayer,
	.zenzaPlayerContainer.is-loading .commentLayerFrame,
	.zenzaPlayerContainer.is-error .videoPlayer,
	.zenzaPlayerContainer.is-error .commentLayerFrame {
		display: none;
	}
	.zenzaPlayerContainer .videoPlayer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		right: 0;
		bottom: 0;
		height: 100%;
		border: 0;
		z-index: 100;
		background: #000;
		will-change: transform, opacity;
		user-select: none;
	}
	.is-mouseMoving .videoPlayer>* {
		cursor: auto;
	}
	.is-loading .videoPlayer>* {
		cursor: wait;
	}
	.zenzaPlayerContainer .commentLayerFrame {
		position: absolute;
		border: 0;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 100%;
		z-index: 101;
		pointer-events: none;
		cursor: none;
		user-select: none;
		opacity: var(--zenza-comment-layer-opacity);
	}
	.zenzaPlayerContainer.is-backComment .commentLayerFrame {
		position: fixed;
		top:  0;
		left: 0;
		width:  100vw;
		height: calc(100vh - 40px);
		right: auto;
		bottom: auto;
		z-index: 1;
	}
	.is-showComment.is-backComment .videoPlayer {
		opacity: 0.90;
	}
	.is-showComment.is-backComment .videoPlayer:hover {
		opacity: 1;
	}
	.loadingMessageContainer {
		display: none;
		pointer-events: none;
	}
	.zenzaPlayerContainer.is-loading .loadingMessageContainer {
		display: inline-block;
		position: absolute;
		z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
		right: 8px;
		bottom: 8px;
		font-size: 24px;
		color: var(--base-fore-color);
		text-shadow: 0 0 8px #003;
		font-family: serif;
		letter-spacing: 2px;
	}
	@keyframes spin {
		0%   { transform: rotate(0deg); }
		100% { transform: rotate(-1800deg); }
	}
	.zenzaPlayerContainer.is-loading .loadingMessageContainer::before,
	.zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
		display: inline-block;
		text-align: center;
		content: '${'\\00272A'}';
		font-size: 18px;
		line-height: 24px;
		animation-name: spin;
		animation-iteration-count: infinite;
		animation-duration: 5s;
		animation-timing-function: linear;
	}
	.zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
		animation-direction: reverse;
	}
	.errorMessageContainer {
		display: none;
		pointer-events: none;
		user-select: none;
	}
	.zenzaPlayerContainer.is-error .errorMessageContainer {
		display: inline-block;
		position: absolute;
		z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
		top: 50%;
		left: 50%;
		padding: 8px 16px;
		transform: translate(-50%, -50%);
		background: rgba(255, 0, 0, 0.9);
		font-size: 24px;
		box-shadow: 8px 8px 4px rgba(128, 0, 0, 0.8);
		white-space: nowrap;
	}
	.errorMessageContainer:empty {
		display: none !important;
	}
	.popupMessageContainer {
		top: 50px;
		left: 50px;
		z-index: 25000;
		position: absolute;
		pointer-events: none;
		transform: translateZ(0);
		user-select: none;
	}
	@media screen {
		/* 右パネル分の幅がある時は右パネルを出す */
		@media (min-width: 992px) {
			.zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
				padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
				background: none;
			}
		}
		@media (min-width: 1216px) {
			.zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
				padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
				background: none;
			}
		}
		/* 縦長モニター */
		@media
			(max-width: 991px) and (min-height: 700px)
		{
			.zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
				padding-bottom: 240px;
				background: none;
			}
		}
		@media
			(max-width: 1215px) and (min-height: 700px)
		{
			.zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
				padding-bottom: 240px;
				background: none;
			}
		}
		/* 960x540 */
		@media
			(min-width: 1328px) and (max-width: 1663px) and
			(min-height: 700px) and (min-height: 899px)
		{
			.zenzaScreenMode_big .zenzaPlayerContainer {
				width: calc(960px * 1.05);
				height: 540px;
			}
		}
		/* 1152x648 */
		@media
			(min-width: 1530px) and (min-height: 900px)
		{
			.zenzaScreenMode_big .zenzaPlayerContainer {
				width: calc(1152px * 1.05);
				height: 648px;
			}
		}
		/* 1280x720 */
		@media
			(min-width: 1664px) and (min-height: 900px)
		{
			.zenzaScreenMode_big .zenzaPlayerContainer {
				width: calc(1280px * 1.05);
				height: 720px;
			}
		}
		/* 1920x1080 */
		@media
			(min-width: 2336px) and (min-height: 1200px)
		{
			.zenzaScreenMode_big .zenzaPlayerContainer {
				width: calc(1920px * 1.05);
				height: 1080px;
			}
		}
		/* 2560x1440 */
		@media
			(min-width: 2976px) and (min-height: 1660px)
		{
			.zenzaScreenMode_big .zenzaPlayerContainer {
				width: calc(2560px * 1.05);
				height: 1440px;
			}
		}
	}
	`.trim();
NicoVideoPlayerDialogView.__tpl__ = (`
<!--
-->
		<div id="zenzaVideoPlayerDialog" class="zenzaVideoPlayerDialog zen-family zen-root">
			<div class="zenzaVideoPlayerDialogInner">
				<div class="menuContainer"></div>
				<div class="zenzaPlayerContainer">
					<div class="popupMessageContainer"></div>
					<div class="errorMessageContainer"></div>
					<div class="loadingMessageContainer">動画読込中</div>
				</div>
			</div>
		</div>
<!--
-->
	`).trim();
class NicoVideoPlayerDialog extends Emitter {
	constructor(params) {
		super();
		this.initialize(params);
	}
	initialize(params) {
		this._playerConfig = params.config;
		this._state = params.state;
		this._keyEmitter = params.keyHandler || ShortcutKeyEmitter.create(
			params.config,
			document.body,
			global.emitter
		);
		this._initializeDom();
		this._keyEmitter.on('keyDown', this._onKeyDown.bind(this));
		this._keyEmitter.on('keyUp', this._onKeyUp.bind(this));
		this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
		this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
		this._escBlockExpiredAt = -1;
		this._videoFilter = new VideoFilter(
			this._playerConfig.getValue('videoOwnerFilter'),
			this._playerConfig.getValue('videoTagFilter')
		);
		this._savePlaybackPosition =
			_.throttle(this._savePlaybackPosition.bind(this), 1000, {trailing: false});
	}
	async _initializeDom() {
		this._view = new NicoVideoPlayerDialogView({
			dialog: this,
			playerConfig: this._playerConfig,
			nicoVideoPlayer: this._nicoVideoPlayer,
			playerState: this._state,
			currentTimeGetter: () => this.currentTime
		});
		await this._view.promise('dom-ready');
		this._initializeCommentPanel();
		this._$playerContainer = this._view.get$Container();
		this._view.on('command', this._onCommand.bind(this));
		this._view.on('postChat', (e, chat, cmd) => {
			this.addChat(chat, cmd)
				.then(() => e.resolve())
				.catch(() => e.reject());
		});
	}
	async _initializeNicoVideoPlayer() {
		if (this._nicoVideoPlayer) {
			return this._nicoVideoPlayer;
		}
		await this._view.promise('dom-ready');
		const config = this._playerConfig;
		const nicoVideoPlayer = this._nicoVideoPlayer = new NicoVideoPlayer({
			node: this._$playerContainer,
			playerConfig: config,
			playerState: this._state,
			volume: Math.max(config.props.volume, 0),
			loop: config.props.loop,
			enableFilter: config.props.enableFilter,
			wordFilter: config.props.wordFilter,
			wordRegFilter: config.props.wordRegFilter,
			wordRegFilterFlags: config.props.wordRegFilterFlags,
			commandFilter: config.props.commandFilter,
			userIdFilter: config.props.userIdFilter
		});
		this.threadLoader = ThreadLoader;
		nicoVideoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
		nicoVideoPlayer.on('ended', this._onVideoEnded.bind(this));
		nicoVideoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
		nicoVideoPlayer.on('play', this._onVideoPlay.bind(this));
		nicoVideoPlayer.on('pause', this._onVideoPause.bind(this));
		nicoVideoPlayer.on('playing', this._onVideoPlaying.bind(this));
		nicoVideoPlayer.on('seeking', this._onVideoSeeking.bind(this));
		nicoVideoPlayer.on('seeked', this._onVideoSeeked.bind(this));
		nicoVideoPlayer.on('stalled', this._onVideoStalled.bind(this));
		nicoVideoPlayer.on('waiting', this._onVideoStalled.bind(this));
		nicoVideoPlayer.on('timeupdate', this._onVideoTimeUpdate.bind(this));
		nicoVideoPlayer.on('progress', this._onVideoProgress.bind(this));
		nicoVideoPlayer.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
		nicoVideoPlayer.on('commentParsed', this._onCommentParsed.bind(this));
		nicoVideoPlayer.on('commentChange', this._onCommentChange.bind(this));
		nicoVideoPlayer.on('commentFilterChange', this._onCommentFilterChange.bind(this));
		nicoVideoPlayer.on('videoPlayerTypeChange', this._onVideoPlayerTypeChange.bind(this));
		nicoVideoPlayer.on('error', this._onVideoError.bind(this));
		nicoVideoPlayer.on('abort', this._onVideoAbort.bind(this));
		nicoVideoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
		nicoVideoPlayer.on('volumeChange', _.debounce(this._onVolumeChangeEnd.bind(this), 1500));
		nicoVideoPlayer.on('command', this._onCommand.bind(this));
		return nicoVideoPlayer;
	}
	execCommand(command, param) {
		return this._onCommand(command, param);
	}
	_onCommand(command, param) {
		let v;
		switch (command) {
			case 'volume':
				this.volume = param;
				break;
			case 'volumeBy':
				this.volume = this._nicoVideoPlayer.volume * param;
				break;
			case 'volumeUp':
				this._nicoVideoPlayer.volumeUp();
				break;
			case 'volumeDown':
				this._nicoVideoPlayer.volumeDown();
				break;
			case 'togglePlay':
				this.togglePlay();
				break;
			case 'pause':
				this.pause();
				break;
			case 'play':
				this.play();
				break;
			case 'fullscreen':
			case 'toggle-fullscreen':
				this._nicoVideoPlayer.toggleFullScreen();
				break;
			case 'deflistAdd':
				return this._onDeflistAdd(param);
			case 'deflistRemove':
				return this._onDeflistRemove(param);
			case 'playlistAdd':
			case 'playlistAppend':
				this._onPlaylistAppend(param);
				break;
			case 'playlistInsert':
				this._onPlaylistInsert(param);
				break;
			case 'playlistSetMylist':
				this._onPlaylistSetMylist(param);
				break;
			case 'playlistSetUploadedVideo':
				this._onPlaylistSetUploadedVideo(param);
				break;
			case 'playlistSetSearchVideo':
				this._onPlaylistSetSearchVideo(param);
				break;
			case 'playlistSetSeries':
				this._onPlaylistSetSeriesVideo(param);
			break;
			case 'playNextVideo':
				this.playNextVideo();
				break;
			case 'playPreviousVideo':
				this.playPreviousVideo();
				break;
			case 'shufflePlaylist':
					this._playlist.shuffle();
				break;
			case 'togglePlaylist':
					this._playlist.toggleEnable();
				break;
			case 'mylistAdd':
				return this._onMylistAdd(param.mylistId, param.mylistName);
			case 'mylistRemove':
				return this._onMylistRemove(param.mylistId, param.mylistName);
			case 'mylistWindow':
				util.openMylistWindow(this._videoInfo.watchId);
				break;
			case 'seek':
			case 'seekTo':
				this.currentTime=param * 1;
				break;
			case 'seekBy':
				this.currentTime=this.currentTime + param * 1;
				break;
			case 'seekPrevFrame':
			case 'seekNextFrame':
				this.execCommand('pause');
				this.execCommand('seekBy', command === 'seekNextFrame' ? 1/60 : -1/60);
				break;
			case 'seekRelativePercent': {
				let dur = this._videoInfo.duration;
				let mv = Math.abs(param.movePerX) > 10 ?
					(param.movePerX / 2) : (param.movePerX / 8);
				let pos = this.currentTime + (mv * dur / 100);
				this.currentTime=Math.min(Math.max(0, pos), dur);
				break;
			}
			case 'seekToResumePoint':
				this.currentTime=this._videoInfo.initialPlaybackTime;
				break;
			case 'addWordFilter':
				this._nicoVideoPlayer.filter.addWordFilter(param);
				break;
			case 'setWordRegFilter':
			case 'setWordRegFilterFlags':
				this._nicoVideoPlayer.filter.setWordRegFilter(param);
				break;
			case 'addUserIdFilter':
				this._nicoVideoPlayer.filter.addUserIdFilter(param);
				break;
			case 'addCommandFilter':
				this._nicoVideoPlayer.filter.addCommandFilter(param);
				break;
			case 'setWordFilterList':
				this._nicoVideoPlayer.filter.wordFilterList = param;
				break;
			case 'setUserIdFilterList':
				this._nicoVideoPlayer.filter.userIdFilterList = param;
				break;
			case 'setCommandFilterList':
				this._nicoVideoPlayer.filter.commandFilterList = param;
				break;
			case 'openNow':
				this.open(param, {openNow: true});
				break;
			case 'open':
				this.open(param);
				break;
			case 'close':
				this.close(param);
				break;
			case 'reload':
				this.reload({currentTime: this.currentTime});
				break;
			case 'openGinza':
				window.open('//www.nicovideo.jp/watch/' + this._watchId, 'watchGinza');
				break;
			case 'reloadComment':
				this.reloadComment(param);
				break;
			case 'playbackRate':
				this._playerConfig.setValue(command, param);
				break;
			case 'shiftUp': {
				v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
				if (v < 2) {
					v += 0.25;
				} else {
					v = Math.min(10, v + 0.5);
				}
				this._playerConfig.setValue('playbackRate', v);
			}
				break;
			case 'shiftDown': {
				v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
				if (v > 2) {
					v -= 0.5;
				} else {
					v = Math.max(0.1, v - 0.25);
				}
				this._playerConfig.setValue('playbackRate', v);
			}
				break;
			case 'screenShot':
				if (this._state.isYouTube) {
					util.capTube({
						title: this._videoInfo.title,
						videoId: this._videoInfo.videoId,
						author: this._videoInfo.owner.name
					});
					return;
				}
				this._nicoVideoPlayer.getScreenShot();
				break;
			case 'screenShotWithComment':
				if (this._state.isYouTube) {
					return;
				}
				this._nicoVideoPlayer.getScreenShotWithComment();
				break;
			case 'nextVideo':
				this._nextVideo = param;
				break;
			case 'nicosSeek':
				this._onNicosSeek(param);
				break;
			case 'fastSeek':
				this._nicoVideoPlayer.fastSeek(param);
				break;
			case 'setVideo':
				this.setVideo(param);
				break;
			case 'selectTab':
				this._state.currentTab = param;
				break;
			case 'nicoru':
				this.threadLoader.nicoru(this._videoInfo.msgInfo, param).catch(e => {
					this.execCommand('alert', e.message || 'ニコれなかった＞＜');
				});
				break;
			case 'update-smileVideoQuality':
				this._playerConfig.setValue('videoServerType', 'smile');
				this._playerConfig.setValue('smileVideoQuality', param);
				this.reload({videoServerType: 'smile', economy: param === 'eco'});
				break;
			case 'update-dmcVideoQuality':
				this._playerConfig.setValue('videoServerType', 'dmc');
				this._playerConfig.setValue('dmcVideoQuality', param);
				this.reload({videoServerType: 'dmc'});
				break;
			case 'update-videoServerType':
				this._playerConfig.setValue('videoServerType', param);
				this.reload({videoServerType: param === 'dmc' ? 'dmc' : 'smile'});
				break;
			case 'update-commentLanguage':
				command = command.replace(/^update-/, '');
				if (this._playerConfig.getValue(command) === param) {
					break;
				}
				this._playerConfig.setValue(command, param);
				this.reloadComment(param);
				break;
			case 'saveMymemory':
				util.saveMymemory(this, this._state.videoInfo);
				break;
			default:
				this.emit('command', command, param);
		}
	}
	_onKeyDown(name, e, param) {
		this._onKeyEvent(name, e, param);
	}
	_onKeyUp(name, e, param) {
		this._onKeyEvent(name, e, param);
	}
	_onKeyEvent(name, e, param) {
		if (!this._state.isOpen) {
			let lastWatchId = this._playerConfig.getValue('lastWatchId');
			if (name === 'RE_OPEN' && lastWatchId) {
				this.open(lastWatchId);
				e.preventDefault();
			}
			return;
		}
		const TABLE = {
			'RE_OPEN': 'reload',
			'PAUSE': 'pause',
			'TOGGLE_PLAY': 'togglePlay',
			'SPACE': 'togglePlay',
			'FULL': 'toggle-fullscreen',
			'TOGGLE_PLAYLIST': 'togglePlaylist',
			'DEFLIST': 'deflistAdd',
			'DEFLIST_REMOVE': 'deflistRemove',
			'VIEW_COMMENT': 'toggle-showComment',
			'TOGGLE_LOOP': 'toggle-loop',
			'MUTE': 'toggle-mute',
			'VOL_UP': 'volumeUp',
			'VOL_DOWN': 'volumeDown',
			'SEEK_TO': 'seekTo',
			'SEEK_BY': 'seekBy',
			'SEEK_PREV_FRAME': 'seekPrevFrame',
			'SEEK_NEXT_FRAME': 'seekNextFrame',
			'NEXT_VIDEO': 'playNextVideo',
			'PREV_VIDEO': 'playPreviousVideo',
			'PLAYBACK_RATE': 'playbackRate',
			'SHIFT_UP': 'shiftUp',
			'SHIFT_DOWN': 'shiftDown',
			'SCREEN_MODE': 'screenMode',
			'SCREEN_SHOT': 'screenShot',
			'SCREEN_SHOT_WITH_COMMENT': 'screenShotWithComment'
		};
		switch (name) {
			case 'ESC':
				if (Date.now() < this._escBlockExpiredAt) {
					window.console.log('block ESC');
					break;
				}
				this._escBlockExpiredAt = Date.now() + 1000 * 2;
				if (!Fullscreen.now()) {
					this.close();
				}
				break;
			case 'INPUT_COMMENT':
				this._view.focusToCommentInput();
				break;
			default:
				if (!TABLE[name]) { return; }
				this.execCommand(TABLE[name], param);
		}
		let screenMode = this._playerConfig.getValue('screenMode');
		if (['small', 'sideView'].includes(screenMode) && ['TOGGLE_PLAY'].includes(name)) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
	}
	_onPlayerConfigUpdate(key, value) {
		if (!this._nicoVideoPlayer) { return; }
		switch (key) {
			case 'enableFilter':
				this._nicoVideoPlayer.filter.isEnable = value;
				break;
			case 'wordFilter':
				this._nicoVideoPlayer.filter.wordFilterList = value;
				break;
			case 'userIdFilter':
				this._nicoVideoPlayer.filter.userIdFilterList = value;
				break;
			case 'commandFilter':
				this._nicoVideoPlayer.filter.commandFilterList = value;
				break;
		}
	}
	_updateScreenMode(mode) {
		this.emit('screenModeChange', mode);
	}
	_onPlaylistAppend(watchId) {
		this._initializePlaylist();
		this._playlist.append(watchId);
	}
	_onPlaylistInsert(watchId) {
		this._initializePlaylist();
		this._playlist.insert(watchId);
	}
	_onPlaylistSetMylist(mylistId, option) {
		this._initializePlaylist();
		option = Object.assign({watchId: this._watchId}, option || {});
		option.sort = isNaN(option.sort) ? 7 : option.sort;
		option.insert = this._playlist.isEnable;
		let query = this._videoWatchOptions.query;
		option.shuffle = parseInt(query.shuffle, 10) === 1;
		this._playlist.loadFromMylist(mylistId, option).then(result => {
				this.execCommand('notify', result.message);
				this._state.currentTab = 'playlist';
				this._playlist.insertCurrentVideo(this._videoInfo);
			},
			() => this.execCommand('alert', 'マイリストのロード失敗'));
	}
	_onPlaylistSetUploadedVideo(userId, option) {
		this._initializePlaylist();
		option = Object.assign({watchId: this._watchId}, option || {});
		option.insert = this._playlist.isEnable;
		this._playlist.loadUploadedVideo(userId, option).then(result => {
				this.execCommand('notify', result.message);
				this._state.currentTab = 'playlist';
				this._playlist.insertCurrentVideo(this._videoInfo);
			},
			err => this.execCommand('alert', err.message || '投稿動画一覧のロード失敗'));
	}
	_onPlaylistSetSearchVideo(params) {
		this._initializePlaylist();
		let option = Object.assign({watchId: this._watchId}, params.option || {});
		let word = params.word;
		option.insert = this._playlist.isEnable;
		if (option.owner) {
			let ownerId = parseInt(this._videoInfo.owner.id, 10);
			if (this._videoInfo.isChannel) {
				option.channelId = ownerId;
			} else {
				option.userId = ownerId;
			}
		}
		delete option.owner;
		let query = this._videoWatchOptions.query;
		option = Object.assign(option, query);
		this._state.currentTab = 'playlist';
		this._playlist.loadSearchVideo(word, option).then(result => {
				this.execCommand('notify', result.message);
				this._playlist.insertCurrentVideo(this._videoInfo);
				global.emitter.emitAsync('searchVideo', {word, option});
				window.setTimeout(() => this._playlist.scrollToActiveItem(), 1000);
			},
			err => {
				this.execCommand('alert', err.message || '検索失敗または該当無し: 「' + word + '」');
			});
	}
	_onPlaylistSetSeriesVideo(id, option = {}) {
		this._initializePlaylist();
		option = Object.assign({watchId: this._watchId}, option || {});
		option.insert = this._playlist.isEnable;
		this._state.currentTab = 'playlist';
		this._playlist.loadSeriesList(id, option).then(result => {
			this.execCommand('notify', result.message);
			this._playlist.insertCurrentVideo(this._videoInfo);
			window.setTimeout(() => this._playlist.scrollToActiveItem(), 1000);
		},
		err => this.execCommand('alert', err.message || `シリーズリストの取得に失敗: series/${id}`));
	}
	_onPlaylistStatusUpdate() {
		let playlist = this._playlist;
		this._playerConfig.setValue('playlistLoop', playlist.isLoop);
		this._state.isPlaylistEnable = playlist.isEnable;
		if (playlist.isEnable) {
			this._playerConfig.setValue('loop', false);
		}
		this._view.blinkTab('playlist');
	}
	_onCommentPanelStatusUpdate() {
		let commentPanel = this._commentPanel;
		this._playerConfig.setValue(
			'enableCommentPanelAutoScroll', commentPanel.isAutoScroll);
	}
	_onDeflistAdd(watchId) {
		if (this._state.isUpdatingDeflist || !util.isLogin()) {
			return;
		}
		const unlock = () => this._state.isUpdatingDeflist = false;
		this._state.isUpdatingDeflist = true;
		let timer = window.setTimeout(unlock, 10000);
		watchId = watchId || this._videoInfo.watchId;
		let description;
		if (!this._mylistApiLoader) {
			this._mylistApiLoader = MylistApiLoader;
		}
		const {enableAutoMylistComment} = this._playerConfig.props;
		(() => {
			if (watchId === this._watchId || !enableAutoMylistComment) {
				return Promise.resolve(this._videoInfo);
			}
			return ThumbInfoLoader.load(watchId);
		})().then(info => {
			const originalVideoId = info.originalVideoId ?
				`元動画: ${info.originalVideoId}` : '';
			description = enableAutoMylistComment ?
					`投稿者: ${info.owner.name} ${info.owner.linkId} ${originalVideoId}` : '';
		}).then(() => this._mylistApiLoader.addDeflistItem(watchId, description))
			.then(result => this.execCommand('notify', result.message))
			.catch(err => this.execCommand('alert', err.message ? err.message : 'とりあえずマイリストに登録失敗'))
			.then(() => {
			window.clearTimeout(timer);
			timer = window.setTimeout(unlock, 2000);
		});
	}
	_onDeflistRemove(watchId) {
		if (this._state.isUpdatingDeflist || !util.isLogin()) {
			return;
		}
		const unlock = () => this._state.isUpdatingDeflist = false;
		this._state.isUpdatingDeflist = true;
		let timer = window.setTimeout(unlock, 10000);
		watchId = watchId || this._videoInfo.watchId;
		if (!this._mylistApiLoader) {
			this._mylistApiLoader = MylistApiLoader;
		}
		this._mylistApiLoader.removeDeflistItem(watchId)
			.then(result => this.execCommand('notify', result.message))
			.catch(err => this.execCommand('alert', err.message))
			.then(() => {
				window.clearTimeout(timer);
				timer = window.setTimeout(unlock, 2000);
			});
	}
	_onMylistAdd(groupId, mylistName) {
		if (this._state.isUpdatingMylist || !util.isLogin()) {
			return;
		}
		const unlock = () => this._state.isUpdatingMylist = false;
		this._state.isUpdatingMylist = true;
		let timer = window.setTimeout(unlock, 10000);
		const owner = this._videoInfo.owner;
		const originalVideoId = this._videoInfo.originalVideoId ?
			`元動画: ${this._videoInfo.originalVideoId}` : '';
		const watchId = this._videoInfo.watchId;
		const description =
			this._playerConfig.getValue('enableAutoMylistComment') ?
				`投稿者: ${owner.name} ${owner.linkId} ${originalVideoId}` : '';
		if (!this._mylistApiLoader) {
			this._mylistApiLoader = MylistApiLoader;
		}
		this._mylistApiLoader.addMylistItem(watchId, groupId, description)
			.then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
			.catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
			.then(() => {
				window.clearTimeout(timer);
				timer = window.setTimeout(unlock, 2000);
			});
	}
	_onMylistRemove(groupId, mylistName) {
		if (this._state.isUpdatingMylist || !util.isLogin()) {
			return;
		}
		const unlock = () => this._state.isUpdatingMylist = false;
		this._state.isUpdatingMylist = true;
		let timer = window.setTimeout(unlock, 10000);
		let watchId = this._videoInfo.watchId;
		if (!this._mylistApiLoader) {
			this._mylistApiLoader = MylistApiLoader;
		}
		this._mylistApiLoader.removeMylistItem(watchId, groupId)
			.then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
			.catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
			.then(() => {
				window.clearTimeout(timer);
				timer = window.setTimeout(unlock, 2000);
			});
	}
	_onCommentParsed() {
		const lang = this._playerConfig.getValue('commentLanguage');
		this.emit('commentParsed', lang, this._threadInfo);
		global.emitter.emit('commentParsed');
	}
	_onCommentChange() {
		const lang = this._playerConfig.getValue('commentLanguage');
		this.emit('commentChange', lang, this._threadInfo);
		global.emitter.emit('commentChange');
	}
	_onCommentFilterChange(filter) {
		let config = this._playerConfig;
		config.setValue('enableFilter', filter.isEnable);
		config.setValue('wordFilter', filter.wordFilterList);
		config.setValue('userIdFilter', filter.userIdFilterList);
		config.setValue('commandFilter', filter.commandFilterList);
		this.emit('commentFilterChange', filter);
	}
	_onVideoPlayerTypeChange(type = '') {
		switch (type.toLowerCase()) {
			case 'youtube':
				this._state.setState({isYouTube: true});
				break;
			default:
				this._state.setState({isYouTube: false});
		}
	}
	_onNicosSeek(time) {
		const ct = this.currentTime;
		window.console.info('nicosSeek!', time);
		if (this.isPlaylistEnable) {
			if (ct < time) {
				this.execCommand('fastSeek', time);
			}
		} else {
			this.execCommand('fastSeek', time);
		}
	}
	show() {
		this._state.isOpen = true;
	}
	hide() {
		this._state.isOpen = false;
	}
	async open(watchId, options) {
		if (!watchId) {
			return;
		}
		if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) {
			return;
		}
		this.refreshLastPlayerId();
		this._requestId = 'play-' + Math.random();
		this._videoWatchOptions = options = new VideoWatchOptions(watchId, options, this._playerConfig);
		if (!options.isPlaylistStartRequest &&
			this.isPlaying && this.isPlaylistEnable && !options.isOpenNow) {
			this._onPlaylistInsert(watchId);
			return;
		}
		window.console.log('%copen video: ', 'color: blue;', watchId);
		window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);
		let nicoVideoPlayer = this._nicoVideoPlayer;
		if (!nicoVideoPlayer) {
			nicoVideoPlayer = await this._initializeNicoVideoPlayer();
		} else {
			if (this._videoInfo) {
				this._savePlaybackPosition(this._videoInfo.contextWatchId, this.currentTime);
			}
			nicoVideoPlayer.close();
			this._view.clearPanel();
			this.emit('beforeVideoOpen');
			if (this._videoSession) {
				this._videoSession.close();
			}
		}
		this._state.resetVideoLoadingStatus();
		const thumbnail = util.getThumbnailUrlByVideoId(watchId);
		this._state.thumbnail = thumbnail;
		this._state.isCommentReady = false;
		this._watchId = watchId;
		this._lastCurrentTime = 0;
		this._lastOpenAt = Date.now();
		this._state.isError = false;
		VideoInfoLoader.load(watchId, options.videoLoadOptions).then(
			this._onVideoInfoLoaderLoad.bind(this, this._requestId)).catch(
			this._onVideoInfoLoaderFail.bind(this, this._requestId)
		);
		this.show();
		if (this._playerConfig.getValue('autoFullScreen') && !util.fullscreen.now()) {
			nicoVideoPlayer.requestFullScreen();
		}
		this.emit('open', watchId, options);
		global.emitter.emitAsync('DialogPlayerOpen', watchId, options);
	}
	get isOpen() {
		return this._state.isOpen;
	}
	reload(options) {
		options = this._videoWatchOptions.createForReload(options);
		if (this._lastCurrentTime > 0) {
			options.currentTime = this._lastCurrentTime;
		}
		this.open(this._watchId, options);
	}
	get currentTime() {
		if (!this._nicoVideoPlayer) {
			return 0;
		}
		let ct = this._nicoVideoPlayer.currentTime * 1;
		if (!this._state.isError && ct > 0) {
			this._lastCurrentTime = ct;
		}
		return this._lastCurrentTime;
	}
	set currentTime(sec) {
		if (!this._nicoVideoPlayer) {
			return;
		}
		sec = Math.max(0, sec);
		this._nicoVideoPlayer.currentTime=sec;
		this._lastCurrentTime = sec;
	}
	get id() { return this._id;}
	get isLastOpenedPlayer() {
		return this.getId() === this._playerConfig.getValue('lastPlayerId', true);
	}
	refreshLastPlayerId() {
		if (this.isLastOpenedPlayer) {
			return;
		}
		this._playerConfig.setValue('lastPlayerId', '');
		this._playerConfig.setValue('lastPlayerId', this.getId());
	}
	async _onVideoInfoLoaderLoad(requestId, videoInfoData) {
		console.log('VideoInfoLoader.load!', requestId, this._watchId, videoInfoData);
		if (this._requestId !== requestId) {
			return;
		}
		const videoInfo = this._videoInfo = new VideoInfoModel(videoInfoData);
		this._watchId = videoInfo.watchId;
		WatchInfoCacheDb.put(this._watchId, {videoInfo});
		let serverType = 'dmc';
		if (!videoInfo.isDmcAvailable) {
			serverType = 'smile';
		} else if (videoInfo.isDmcOnly) {
			serverType = 'dmc';
		} else if (['dmc', 'smile'].includes(this._videoWatchOptions.videoServerType)) {
			serverType = this._videoWatchOptions.videoServerType;
		} else if (this._playerConfig.getValue('videoServerType') === 'smile') {
			serverType = 'smile';
		} else {
			const disableDmc =
				this._playerConfig.getValue('autoDisableDmc') &&
				this._videoWatchOptions.videoServerType !== 'smile' &&
				videoInfo.maybeBetterQualityServerType === 'smile';
			serverType = disableDmc ? 'smile' : 'dmc';
		}
		this._state.setState({
			isDmcAvailable: videoInfo.isDmcAvailable,
			isCommunity: videoInfo.isCommunityVideo,
			isMymemory: videoInfo.isMymemory,
			isChannel: videoInfo.isChannel
		});
		const isHLSRequired = videoInfo.dmcInfo && videoInfo.dmcInfo.isHLSRequired;
		const isHLSSupported = !!global.debug.isHLSSupported ||
		document.createElement('video').canPlayType('application/x-mpegURL') !== '';
		const useHLS = isHLSSupported && (isHLSRequired || !this._playerConfig.getValue('video.hls.enableOnlyRequired'));
			this._videoSession = await VideoSessionWorker.create({
			videoInfo,
			videoQuality: this._playerConfig.getValue('dmcVideoQuality'),
			serverType,
			isPlayingCallback: () => this.isPlaying,
			useWellKnownPort: this._playerConfig.getValue('useWellKnownPort'),
			useHLS
		});
		if (this._videoFilter.isNgVideo(videoInfo)) {
			return this._onVideoFilterMatch();
		}
		if (this._videoSession.isDmc) {
			NVWatchCaller.call(videoInfo.dmcInfo.trackingId)
				.then(() => this._videoSession.connect())
				.then(sessionInfo => {
					this.setVideo(sessionInfo.url);
					videoInfo.setCurrentVideo(sessionInfo.url);
					this.emit('videoServerType', 'dmc', sessionInfo, videoInfo);
				})
				.catch(this._onVideoSessionFail.bind(this));
		} else {
			if (this._playerConfig.getValue('enableVideoSession')) {
				this._videoSession.connect();
			}
			videoInfo.setCurrentVideo(videoInfo.videoUrl);
			this.setVideo(videoInfo.videoUrl);
			this.emit('videoServerType', 'smile', {}, videoInfo);
		}
		this._state.videoInfo = videoInfo;
		this._state.isDmcPlaying = this._videoSession.isDmc;
		this.loadComment(videoInfo.msgInfo);
		this.emit('loadVideoInfo', videoInfo);
		if (Fullscreen.now() || this._playerConfig.getValue('screenMode') === 'wide') {
			this.execCommand('notifyHtml',
				'<img src="' + videoInfo.thumbnail + '" style="width: 96px;">' +
				util.escapeToZenkaku(videoInfo.title)
			);
		}
	}
	setVideo(url) {
		this._state.setState({
			isYouTube: url.indexOf('youtube') >= 0,
			currentSrc: url
		});
	}
	loadComment(msgInfo) {
		msgInfo.language = this._playerConfig.getValue('commentLanguage');
		this.threadLoader.load(msgInfo).then(
			this._onCommentLoadSuccess.bind(this, this._requestId),
			this._onCommentLoadFail.bind(this, this._requestId)
		);
	}
	reloadComment(param = {}) {
		const msgInfo = this._videoInfo.msgInfo;
		if (typeof param.when === 'number') {
			msgInfo.when = param.when;
		}
		this.loadComment(msgInfo);
	}
	_onVideoInfoLoaderFail(requestId, e) {
		const watchId = e.watchId;
		window.console.error('_onVideoInfoLoaderFail', watchId, e);
		if (this._requestId !== requestId) {
			return;
		}
		this._setErrorMessage(e.message || '通信エラー', watchId);
		this._state.isError = true;
		if (e.info) {
			this._videoInfo = new VideoInfoModel(e.info);
			this._state.videoInfo = this._videoInfo;
			this.emit('loadVideoInfoFail', this._videoInfo);
		} else {
			this.emit('loadVideoInfoFail');
		}
		global.emitter.emitAsync('loadVideoInfoFail', e);
		if (!this.isPlaylistEnable) {
			return;
		}
		if (e.reason === 'forbidden' || e.info.isPlayable === false) {
			window.setTimeout(() => this.playNextVideo(), 3000);
		}
	}
	_onVideoSessionFail(result) {
		window.console.error('dmc fail', result);
		this._setErrorMessage(
			`動画の読み込みに失敗しました(dmc.nico) ${result && result.message || ''}`, this._watchId);
		this._state.setState({isError: true, isLoading: false});
		if (this.isPlaylistEnable) {
			window.setTimeout(() => this.playNextVideo(), 3000);
		}
	}
	_onVideoPlayStartFail(err) {
		window.console.error('動画再生開始に失敗', err);
		if (!(err instanceof DOMException)) { //
			return;
		}
		console.warn('play() request was rejected code: %s. message: %s', err.code, err.message);
		const message = err.message;
		switch (message) {
			case 'SessionClosedError':
				if (this._playserState.isError) { break; }
				this._setErrorMessage('動画の再生開始に失敗しました', this._watchId);
				this._state.setVideoErrorOccurred();
				break;
			case 'AbortError': // 再生開始を待っている間に動画変更などで中断された等
			case 'NotAllowedError': // 自動再生のブロック
			default:
				break;
		}
		this.emit('loadVideoPlayStartFail');
		global.emitter.emitAsync('loadVideoPlayStartFail');
	}
	_onVideoFilterMatch() {
		window.console.error('ng video', this._watchId);
		this._setErrorMessage('再生除外対象の動画または投稿者です');
		this._state.isError = true;
		this.emit('error');
		if (this.isPlaylistEnable) {
			window.setTimeout(() => this.playNextVideo(), 3000);
		}
	}
	_setErrorMessage(msg) {
		this._state.errorMessage = msg;
	}
	_onCommentLoadSuccess(requestId, result) {
		if (requestId !== this._requestId) {
			return;
		}
		let options = {
			replacement: this._videoInfo.replacementWords,
			duration: this._videoInfo.duration,
			mainThreadId: result.threadInfo.threadId,
			format: result.format
		};
		this._nicoVideoPlayer.closeCommentPlayer();
		this._threadInfo = result.threadInfo;
		this._nicoVideoPlayer.setComment(result.body, options);
		WatchInfoCacheDb.put(this._watchId, {threadInfo: result.threadInfo});
		this._state.isCommentReady = true;
		this._state.isWaybackMode = result.threadInfo.isWaybackMode;
		this.emit('commentReady', result, this._threadInfo);
		this.emit('videoCount', {comment: result.threadInfo.totalResCount});
	}
	_onCommentLoadFail(requestId, e) {
		if (requestId !== this._requestId) {
			return;
		}
		this.execCommand('alert', e.message);
	}
	_onLoadedMetaData() {
		if (this._state.isYouTube) {
			return;
		}
		let currentTime = this._videoWatchOptions.currentTime;
		if (currentTime > 0) {
			this.currentTime=currentTime;
		}
	}
	_onVideoCanPlay() {
		if (!this._state.isLoading) {
			return;
		}
		window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
		this._playerConfig.setValue('lastWatchId', this._watchId);
		WatchInfoCacheDb.put(this._watchId, {watchCount: 1});
		if (this._videoWatchOptions.isPlaylistStartRequest) {
			this._initializePlaylist();
			let option = this._videoWatchOptions.mylistLoadOptions;
			let query = this._videoWatchOptions.query;
			option.append = this.isPlaying && this._playlist.isEnable;
			option.shuffle = parseInt(query.shuffle, 10) === 1;
			console.log('playlist option:', option);
			if (query.playlist_type === 'mylist') {
				this._playlist.loadFromMylist(option.group_id, option);
			} else if (query.playlist_type === 'deflist') {
				this._playlist.loadFromMylist('deflist', option);
			} else if (query.playlist_type === 'tag' || query.playlist_type === 'search') {
				let word = query.tag || query.keyword;
				option.searchType = query.tag ? 'tag' : '';
				option = Object.assign(option, query);
				this._playlist.loadSearchVideo(word, option, this._playerConfig.getValue('search.limit'));
			}
			this._playlist.toggleEnable(true);
		} else if (PlaylistSession.isExist() && !this._playlist) {
			this._initializePlaylist();
			this._playlist.restoreFromSession();
		} else {
			this._initializePlaylist();
		}
		this._playlist.insertCurrentVideo(this._videoInfo);
		if (this._videoInfo.watchId !== this._videoInfo.videoId &&
			this._videoInfo.videoId.indexOf('so') === 0) {
			this._playlist.removeItemByWatchId(this._videoInfo.watchId);
		}
		this._state.setVideoCanPlay();
		this.emitAsync('canPlay', this._watchId, this._videoInfo, this._videoWatchOptions);
		if (this._videoWatchOptions.eventType === 'playlist' && this.isOpen) {
			this.play();
		}
		if (this._nextVideo) {
			const nextVideo = this._nextVideo;
			this._nextVideo = null;
			if (!this._playlist) {
				return;
			}
			if (!this._playerConfig.getValue('enableNicosJumpVideo')) {
				return;
			}
			const nv = this._playlist.findByWatchId(nextVideo);
			if (nv && nv.isPlayed()) {
				return;
			} // 既にリストにあって再生済みなら追加しない(無限ループ対策)
			this.execCommand('notify', '@ジャンプ: ' + nextVideo);
			this.execCommand('playlistInsert', nextVideo);
		}
	}
	_onVideoPlay() {
		this._state.setPlaying();
		this.emit('play');
	}
	_onVideoPlaying() {
		this._state.setPlaying();
		this.emit('playing');
	}
	_onVideoSeeking() {
		this._state.isSeeking = true;
		this.emit('seeking');
	}
	_onVideoSeeked() {
		this._state.isSeeking = false;
		this.emit('seeked');
	}
	_onVideoPause() {
		this._state.setPausing();
		this._savePlaybackPosition(this._videoInfo.contextWatchId, this.currentTime);
		this.emit('pause');
	}
	_onVideoStalled() {
		this._state.isStalled = true;
		this.emit('stalled');
	}
	_onVideoTimeUpdate() {
		this._state.isStalled = false;
	}
	_onVideoProgress(range, currentTime) {
		this.emit('progress', range, currentTime);
	}
	async _onVideoError(e) {
		this._state.setVideoErrorOccurred();
		if (e.type === 'youtube') {
			return this._onYouTubeVideoError(e);
		}
		if (!this._videoInfo) {
			this._setErrorMessage('動画の再生に失敗しました。');
			return;
		}
		const retry = params => {
			setTimeout(() => {
				if (!this.isOpen) {
					return;
				}
				this.reload(params);
			}, 3000);
		};
		const sessionState = await this._videoSession.getState();
		const {isDmc, isDeleted, isAbnormallyClosed} = sessionState;
		const videoWatchOptions = this._videoWatchOptions;
		const code = (e && e.target && e.target.error && e.target.error.code) || 0;
		window.console.error('VideoError!', code, e, (e.target && e.target.error), {isDeleted, isAbnormallyClosed});
		if (Date.now() - this._lastOpenAt > 3 * 60 * 1000 && isDeleted && !isAbnormallyClosed) {
			if (videoWatchOptions.reloadCount < 5) {
				retry();
			} else {
				this._setErrorMessage('動画のセッションが切断されました。');
			}
		} else if (!isDmc && this._videoInfo.isDmcAvailable) {
			this._setErrorMessage('SMILE動画の再生に失敗しました。DMC動画に接続します。');
			retry({economy: false, videoServerType: 'dmc'});
		} else if (!isDmc && (!this._videoWatchOptions.isEconomySelected && !this._videoInfo.isEconomy)) {
			this._setErrorMessage('動画の再生に失敗しました。エコノミー動画に接続します。');
			retry({economy: true, videoServerType: 'smile'});
		} else {
			this._setErrorMessage('動画の再生に失敗しました。');
		}
		this.emit('error', e, code);
	}
	_onYouTubeVideoError(e) {
		window.console.error('onYouTubeVideoError!', e);
		this._setErrorMessage(e.description);
		this.emit('error', e);
		if (e.fallback) {
			setTimeout(() => this.reload({isAutoZenTubeDisabled: true}), 3000);
		}
	}
	_onVideoAbort() {
		this.emit('abort');
	}
	_onVideoAspectRatioFix(ratio) {
		this.emit('aspectRatioFix', ratio);
	}
	_onVideoEnded() {
		this.emitAsync('ended');
		this._state.setVideoEnded();
		this._savePlaybackPosition(this._videoInfo.contextWatchId, 0);
		if (this.isPlaylistEnable && this._playlist.hasNext) {
			this.playNextVideo({eventType: 'playlist'});
			return;
		} else if (this._playlist) {
			this._playlist.toggleEnable(false);
		}
		let isAutoCloseFullScreen =
			this._videoWatchOptions.hasKey('autoCloseFullScreen') ?
				this._videoWatchOptions.isAutoCloseFullScreen :
				this._playerConfig.getValue('autoCloseFullScreen');
		if (Fullscreen.now() && isAutoCloseFullScreen) {
			Fullscreen.cancel();
		}
		global.emitter.emitAsync('videoEnded');
	}
	_onVolumeChange(vol, mute) {
		this.emit('volumeChange', vol, mute);
	}
	_onVolumeChangeEnd(vol, mute) {
		this.emit('volumeChangeEnd', vol, mute);
	}
	_savePlaybackPosition(contextWatchId, ct) {
		if (!util.isLogin()) {
			return;
		}
		const vi = this._videoInfo;
		if (!vi) {
			return;
		}
		const dr = this.duration;
		console.info('%csave PlaybackPosition:', 'background: cyan', ct, dr, vi.csrfToken);
		if (vi.contextWatchId !== contextWatchId) {
			return;
		}
		if (Math.abs(ct - dr) < 3) {
			return;
		}
		if (dr < 120) {
			return;
		} // 短い動画は記録しない
		PlaybackPosition.record(
			contextWatchId,
			ct,
			vi.csrfToken
		).catch(e => {
			window.console.warn('save playback fail', e);
		});
	}
	close() {
		if (this.isPlaying) {
			this._savePlaybackPosition(this._watchId, this.currentTime);
		}
		WatchInfoCacheDb.put(this._watchId, {currentTime: this.currentTime});
		if (Fullscreen.now()) {
			Fullscreen.cancel();
		}
		this.pause();
		this.hide();
		this._refresh();
		this.emit('close');
		global.emitter.emitAsync('DialogPlayerClose');
	}
	_refresh() {
		if (this._nicoVideoPlayer) {
			this._nicoVideoPlayer.close();
		}
		if (this._videoSession) {
			this._videoSession.close();
		}
	}
	_initializePlaylist() {
		if (this._playlist) {
			return;
		}
		let $container = this._view.appendTab('playlist', 'プレイリスト');
		this._playlist = new Playlist({
			loader: ThumbInfoLoader,
			container: $container[0],
			loop: this._playerConfig.getValue('playlistLoop')
		});
		this._playlist.on('command', this._onCommand.bind(this));
		this._playlist.on('update', _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
	}
	_initializeCommentPanel() {
		if (this._commentPanel) {
			return;
		}
		const $container = this._view.appendTab('comment', 'コメント');
		this._commentPanel = new CommentPanel({
			player: this,
			$container: $container,
			autoScroll: this._playerConfig.getValue('enableCommentPanelAutoScroll'),
			language: this._playerConfig.getValue('commentLanguage')
		});
		this._commentPanel.on('command', this._onCommand.bind(this));
		this._commentPanel.on('update', _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
	}
	get isPlaylistEnable() {
		return this._playlist && this._playlist.isEnable;
	}
	playNextVideo(options) {
		if (!this._playlist || !this.isOpen) {
			return;
		}
		let opt = this._videoWatchOptions.createForVideoChange(options);
		let nextId = this._playlist.selectNext();
		if (nextId) {
			this.open(nextId, opt);
		}
	}
	playPreviousVideo(options) {
		if (!this._playlist || !this.isOpen) {
			return;
		}
		let opt = this._videoWatchOptions.createForVideoChange(options);
		let prevId = this._playlist.selectPrevious();
		if (prevId) {
			this.open(prevId, opt);
		}
	}
	play() {
		if (!this._state.isError && this._nicoVideoPlayer) {
			this._nicoVideoPlayer.play().catch((e) => {
				this._onVideoPlayStartFail(e);
			});
		}
	}
	pause() {
		if (!this._state.isError && this._nicoVideoPlayer) {
			this._nicoVideoPlayer.pause();
			this._state.setPausing();
		}
	}
	get isPlaying() {
		return this._state.isPlaying;
	}
	get isPaused() {
		return this._nicoVideoPlayer ? this._nicoVideoPlayer.isPaused : true;
	}
	togglePlay() {
		if (!this._state.isError && this._nicoVideoPlayer) {
			if (this.isPlaying) {
				this.pause();
				return;
			}
			this._nicoVideoPlayer.togglePlay().catch((e) => {
				this._onVideoPlayStartFail(e);
			});
		}
	}
	set volume(v) {
		if (this._nicoVideoPlayer) {
			this._nicoVideoPlayer.volume = v;
		}
	}
	get volume() {
		return this._playerConfig.props.volume;
	}
	async addChat(text, cmd, vpos = null, options = {}) {
		if (!this._nicoVideoPlayer ||
			!this.threadLoader ||
			!this._state.isCommentReady ||
			this._state.isCommentPosting) {
			return Promise.reject();
		}
		if (!util.isLogin()) {
			return Promise.reject();
		}
		const threadId = this._threadInfo.threadId * 1;
		if (this._threadInfo.force184 !== '1') {
			cmd = cmd ? ('184 ' + cmd) : '184';
		}
		Object.assign(options, {isMine: true, isUpdating: true, thead: threadId});
		vpos = (!isNaN(vpos) && typeof vpos === 'number') ? vpos : this._nicoVideoPlayer.vpos;
		const nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);
		this._state.isCommentPosting = true;
		const lang = this._playerConfig.props.commentLanguage;
		window.console.time('コメント投稿');
		const onSuccess = result => {
			window.console.timeEnd('コメント投稿');
			nicoChat.isUpdating = false;
			nicoChat.no = result.no;
			this.execCommand('notify', 'コメント投稿成功');
			this._state.isCommentPosting = false;
			this._threadInfo.blockNo = result.blockNo;
			WatchInfoCacheDb.put(this._watchId, {comment: {text, cmd, vpos, options}});
			return Promise.resolve(result);
		};
		const onFail = err => {
			err = err || {};
			window.console.log('_onFail: ', err);
			window.console.timeEnd('コメント投稿');
			nicoChat.isPostFail = true;
			nicoChat.isUpdating = false;
			this.execCommand('alert', err.message);
			this._state.isCommentPosting = false;
			if (err.blockNo && typeof err.blockNo === 'number') {
				this._threadInfo.blockNo = err.blockNo;
			}
			return Promise.reject(err);
		};
		const msgInfo = this._videoInfo.msgInfo;
		return this.threadLoader.postChat(msgInfo, text, cmd, vpos, lang)
			.then(onSuccess).catch(onFail);
	}
	get duration() {
		if (!this._videoInfo) {
			return 0;
		}
		return this._videoInfo.duration;
	}
	get bufferedRange() {return this._nicoVideoPlayer.bufferedRange;}
	get nonFilteredChatList() {return this._nicoVideoPlayer.nonFilteredChatList;}
	get chatList() {return this._nicoVideoPlayer.chatList;}
	get playingStatus() {
		if (!this._nicoVideoPlayer || !this._nicoVideoPlayer.isPlaying) {
			return {};
		}
		const session = {
			playing: true,
			watchId: this._watchId,
			url: location.href,
			currentTime: this._nicoVideoPlayer.currentTime
		};
		const options = this._videoWatchOptions.createForSession();
		Object.keys(options).forEach(key => {
			session[key] = session.hasOwnProperty(key) ? session[key] : options[key];
		});
		return session;
	}
	get watchId() {
		return this._watchId;
	}
	get currentTab() {
		return this._state.currentTab;
	}
	getId() { return this.id; }
	getDuration() { return this.duration; }
	getBufferedRange() { return this.bufferedRange; }
	getNonFilteredChatList() { return this.nonFilteredChatList;}
	getChatList() { return this.chatList; }
	getPlayingStatus() { return this.playingStatus; }
	getMymemory() {
		return this._nicoVideoPlayer.getMymemory();
	}
}
class VideoHoverMenu {
	constructor(...args) {
		this.initialize(...args);
	}
	initialize(params) {
		this._container = params.playerContainer;
		this._state = params.playerState;
		this._bound = {};
		this._bound.emitClose =
			_.debounce(() => util.dispatchCommand(this._container, 'close'), 300);
		this._initializeDom();
	}
	async _initializeDom() {
		const container = this._container;
		util.$.html(VideoHoverMenu.__tpl__).appendTo(container);
		this._view = container.querySelector('.hoverMenuContainer');
		const $mc = util.$(container.querySelectorAll('.menuItemContainer'));
		$mc.on('contextmenu',
			e => { e.preventDefault(); e.stopPropagation(); });
		$mc.on('click', this._onClick.bind(this));
		$mc.on('mousedown', this._onMouseDown.bind(this));
		global.emitter.on('hideHover', this._hideMenu.bind(this));
		this._initializeNgSettingMenu();
		await this._initializeMylistSelectMenu();
	}
	async _initializeMylistSelectMenu() {
		if (!util.isLogin()) {
			return;
		}
		this._mylistApiLoader = MylistApiLoader;
		this._mylistList = await this._mylistApiLoader.getMylistList();
		this._initializeMylistSelectMenuDom();
	}
	_initializeMylistSelectMenuDom(mylistList) {
		if (!util.isLogin()) {
			return;
		}
		mylistList = mylistList || this._mylistList;
		const menu = this._container.querySelector('.mylistSelectMenu');
		menu.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
		const ul = document.createElement('ul');
		mylistList.forEach(mylist => {
			const li = document.createElement('li');
			li.className = `folder${mylist.icon_id}`;
			const icon = document.createElement('span');
			icon.className = 'mylistIcon command';
			Object.assign(icon.dataset, {
				mylistId: mylist.id,
				mylistName: mylist.name,
				command: 'mylistOpen'
			});
			icon.title = mylist.name + 'を開く';
			const link = document.createElement('a');
			link.className = 'mylistLink name command';
			link.textContent = mylist.name;
			link.href = `https://www.nicovideo.jp/my/mylist/#/${mylist.id}`;
			Object.assign(link.dataset, {
				mylistId: mylist.id,
				mylistName: mylist.name,
				command: 'mylistAdd'
			});
			li.append(icon, link);
			ul.append(li);
		});
		menu.querySelector('.mylistSelectMenuInner').append(ul);
	}
	_initializeNgSettingMenu() {
		const state = this._state;
		const menu = this._container.querySelector('.ngSettingSelectMenu');
		const enableFilterItems = Array.from(menu.querySelectorAll('.update-enableFilter'));
		const updateEnableFilter = v => {
			enableFilterItems.forEach(item => {
				const p = JSON.parse(item.dataset.param);
				item.classList.toggle('selected', v === p);
			});
			menu.classList.toggle('is-enableFilter', v);
		};
		updateEnableFilter(state.isEnableFilter);
		state.onkey('isEnableFilter', updateEnableFilter);
		const sharedNgItems = Array.from(menu.querySelectorAll('.sharedNgLevel'));
		const updateNgLevel = level => {
			sharedNgItems.forEach(item => {
				item.classList.toggle('selected', level === item.getAttribute('data-param'));
			});
		};
		updateNgLevel(state.sharedNgLevel);
		state.onkey('sharedNgLevel', updateNgLevel);
	}
	_onMouseDown(e) {
		e.stopPropagation();
		const target = e.target.closest('[data-command]');
		if (!target) {
			return;
		}
		let command = target.dataset.command;
		switch (command) {
			case 'deflistAdd':
				if (e.shiftKey) {
					command = 'mylistWindow';
				} else {
					command = e.which > 1 ? 'deflistRemove' : 'deflistAdd';
				}
				util.dispatchCommand(target, command);
				break;
			case 'mylistAdd': {
				command = (e.shiftKey || e.which > 1) ? 'mylistRemove' : 'mylistAdd';
				const {mylistId, mylistName} = target.dataset;
				this._hideMenu();
				util.dispatchCommand(target, command, {mylistId, mylistName});
				break;
			}
			case 'mylistOpen': {
				const mylistId = target.dataset.mylistId;
				location.href = `https://www.nicovideo.jp/my/mylist/#/${mylistId}`;
				break;
			}
			case 'close':
				this._bound.emitClose();
				break;
			default:
				return;
		}
	}
	_onClick(e) {
		e.preventDefault();
		e.stopPropagation();
		const target = e.target.closest('[data-command]');
		if (!target) {
			return;
		}
		let {command, type, param} = target.dataset;
		switch (type) {
			case 'json':
			case 'bool':
			case 'number':
				param = JSON.parse(param);
				break;
		}
		switch (command) {
			case 'deflistAdd':
			case 'mylistAdd':
			case 'mylistOpen':
			case 'close':
				this._hideMenu();
				break;
			case 'mylistMenu':
				if (e.shiftKey) {
					util.dispatchCommand(target, 'mylistWindow');
				}
				break;
			case 'nop':
				break;
			default:
				this._hideMenu();
				util.dispatchCommand(target, command, param);
				break;
		}
	}
	_hideMenu() {
		if (!this._view.contains(document.activeElement)) {
			return;
		}
		window.setTimeout(() => document.body.focus(), 0);
	}
}
	util.addStyle(`
		.menuItemContainer {
			box-sizing: border-box;
			position: absolute;
			z-index: ${CONSTANT.BASE_Z_INDEX + 40000};
			overflow: visible;
			will-change: transform, opacity;
			user-select: none;
		}
			.menuItemContainer .menuButton {
				width: 32px;
				height:32px;
				font-size: 24px;
				background: #888;
				color: #000;
				border: 1px solid #666;
				border-radius: 4px;
				line-height: 30px;
				white-space: nowrap;
				text-align: center;
				cursor: pointer;
				outline: none;
			}
			.menuItemContainer:hover .menuButton {
				pointer-events: auto;
			}
			.menuItemContainer.rightTop {
				width: 200px;
				height: 40px;
				right: 0px;
				top: 0;
				perspective: 150px;
				perspective-origin: center;
			}
			.menuItemContainer.rightTop .scalingUI {
				transform-origin: right top;
			}
			.is-updatingDeflist .menuItemContainer.rightTop,
			.is-updatingMylist  .menuItemContainer.rightTop {
				cursor: wait;
				opacity: 1 !important;
			}
			.is-updatingDeflist .menuItemContainer.rightTop>*,
			.is-updatingMylist  .menuItemContainer.rightTop>* {
				pointer-events: none;
			}
		.menuItemContainer.leftTop {
			width: auto;
			height: auto;
			left: 32px;
			top: 32px;
			display: none;
		}
			.is-debug .menuItemContainer.leftTop {
				display: inline-block !important;
				opacity: 1 !important;
				transition: none !important;
				transform: translateZ(0);
				max-width: 200px;
			}
		.menuItemContainer.leftBottom {
			width: 120px;
			height: 32px;
			left: 8px;
			bottom: 48px;
			transform-origin: left bottom;
		}
		.menuItemContainer.rightBottom {
			width: 120px;
			height: 80px;
			right:  0;
			bottom: 8px;
		}
		.menuItemContainer.onErrorMenu {
			position: absolute;
			left: 50%;
			top: 60%;
			transform: translate(-50%, 0);
			display: none;
			white-space: nowrap;
		}
			.is-error .onErrorMenu {
				display: block !important;
				opacity: 1 !important;
			}
			.is-youTube .onErrorMenu .for-nicovideo,
									.onErrorMenu .for-ZenTube {
				display: none;
			}
			.is-youTube.is-error .onErrorMenu .for-ZenTube {
				display: inline-block;
			}
			.onErrorMenu .menuButton {
				position: relative;
				display: inline-block !important;
				margin: 0 16px;
				padding: 8px;
				background: #888;
				color: #000;
				opacity: 1;
				cursor: pointer;
				border-radius: 0;
				box-shadow: 4px 4px 0 #333;
				border: 2px outset;
				width: 100px;
				font-size: 14px;
				line-height: 16px;
			}
			.menuItemContainer.onErrorMenu .menuButton:active {
				background: var(--base-fore-color);
				border: 2px inset;
			}
			.menuItemContainer.onErrorMenu .playNextVideo {
				display: none !important;
			}
			.is-playlistEnable .menuItemContainer.onErrorMenu .playNextVideo {
				display: inline-block !important;
			}
		.menuButton {
			position: absolute;
			opacity: 0;
			transition:
				opacity 0.4s ease,
				box-shadow 0.2s ease,
				background 0.4s ease;
			box-sizing: border-box;
			text-align: center;
			text-shadow: none;
			user-select: none;
			will-change: transform;
		}
			.menuButton:focus-within,
			.menuButton:hover {
				box-shadow: 0 2px 0 #000;
				cursor: pointer;
				opacity: 1;
				background: #888;
				color: #000;
			}
			.menuButton:active {
				transform: translate(0, 2px);
				box-shadow: 0 0 0 #000;
				transition: none;
			}
			.menuButton .tooltip {
				display: none;
				pointer-events: none;
				position: absolute;
				left: 16px;
				top: -24px;
				font-size: 12px;
				line-height: 16px;
				padding: 2px 4px;
				border: 1px solid !000;
				background: #ffc;
				color: black;
				box-shadow: 2px 2px 2px #fff;
				text-shadow: none;
				white-space: nowrap;
				z-index: 100;
				opacity: 0.8;
			}
			.menuButton:hover .tooltip {
				display: block;
			}
			.menuButton:avtive .tooltip {
				display: none;
			}
			.menuButton:active .zenzaPopupMenu {
				transform: translate(0, -2px);
				transition: none;
			}
			.hoverMenuContainer .menuButton:focus-within {
				pointer-events: none;
			}
			.hoverMenuContainer .menuButton:focus-within .zenzaPopupMenu,
			.hoverMenuContainer .menuButton              .zenzaPopupMenu:hover {
				pointer-events: auto;
				visibility: visible;
				opacity: 0.99;
				pointer-events: auto;
				transition: opacity 0.3s;
			}
			.rightTop .menuButton .tooltip {
				top: auto;
				bottom: -24px;
				right: -16px;
				left: auto;
			}
			.rightBottom .menuButton .tooltip {
				right: 16px;
				left: auto;
			}
			.is-mouseMoving .menuButton {
				opacity: 0.8;
				background: rgba(80, 80, 80, 0.5);
				border: 1px solid #888;
				transition:
					box-shadow 0.2s ease,
					background 0.4s ease;
			}
			.is-mouseMoving .menuButton .menuButtonInner {
				opacity: 0.8;
				word-break: normal;
				transition:
					box-shadow 0.2s ease,
					background 0.4s ease;
			}
		.showCommentSwitch {
			left: 0;
			width:  32px;
			height: 32px;
			background:#888;
			color: #000;
			border: 1px solid #666;
			line-height: 30px;
			filter: grayscale(100%);
			border-radius: 4px;
		}
			.is-showComment .showCommentSwitch {
				color: #fff;
				filter: none;
				text-decoration: none;
			}
			.showCommentSwitch .menuButtonInner {
				text-decoration: line-through;
			}
			.is-showComment .showCommentSwitch .menuButtonInner {
				text-decoration: none;
			}
		.ngSettingMenu {
			display: none;
			left: 80px;
		}
			.is-showComment .ngSettingMenu {
				display: block;
			}
			.ngSettingMenu .menuButtonInner {
				font-size: 18px;
			}
		.ngSettingSelectMenu {
			white-space: nowrap;
			bottom: 0px;
			left: 32px;
			font-size: 18px;
		}
			.ngSettingMenu:active .ngSettingSelectMenu {
				transition: none;
			}
			.ngSettingSelectMenu .triangle {
				transform: rotate(45deg);
				left: -8px;
				bottom: 3px;
			}
			.ngSettingSelectMenu .sharedNgLevelSelect {
				display: none;
			}
			.ngSettingSelectMenu.is-enableFilter .sharedNgLevelSelect {
				display: block;
			}
		.menuItemContainer .mylistButton {
			font-size: 21px;
		}
		.mylistButton.mylistAddMenu {
			left: 40px;
			top: 0;
		}
		.mylistButton.deflistAdd {
			left: 80px;
			top: 0;
		}
		@keyframes spinX {
			0%   { transform: rotateX(0deg); }
			100% { transform: rotateX(1800deg); }
		}
		@keyframes spinY {
			0%   { transform: rotateY(0deg); }
			100% { transform: rotateY(1800deg); }
		}
		.is-updatingDeflist .mylistButton.deflistAdd {
			pointer-events: none;
			opacity: 1 !important;
			border: 1px inset !important;
			box-shadow: none !important;
			background: #888 !important;
			color: #000 !important;
			animation-name: spinX;
			animation-iteration-count: infinite;
			animation-duration: 6s;
			animation-timing-function: linear;
		}
		.is-updatingDeflist .mylistButton.deflistAdd .tooltip {
			display: none;
		}
		.mylistButton.mylistAddMenu:focus-within,
		.is-updatingMylist  .mylistButton.mylistAddMenu {
			pointer-events: none;
			opacity: 1 !important;
			border: 1px inset #000 !important;
			color: #000 !important;
			box-shadow: none !important;
		}
		.mylistButton.mylistAddMenu:focus-within {
			background: #888 !important;
		}
		.is-updatingMylist  .mylistButton.mylistAddMenu {
			background: #888 !important;
			color: #000 !important;
			animation-name: spinX;
			animation-iteration-count: infinite;
			animation-duration: 6s;
			animation-timing-function: linear;
		}
		.mylistSelectMenu {
			top: 36px;
			right: -48px;
			padding: 8px 0;
			font-size: 13px;
			backface-visibility: hidden;
		}
		.is-updatingMylist .mylistSelectMenu {
			display: none;
		}
			.mylistSelectMenu .mylistSelectMenuInner {
				overflow-y: auto;
				overflow-x: hidden;
				max-height: 50vh;
				overscroll-behavior: contain;
			}
			.mylistSelectMenu .triangle {
				transform: rotate(135deg);
				top: -8.5px;
				right: 55px;
			}
			.mylistSelectMenu ul li {
				line-height: 120%;
				overflow-y: visible;
				border-bottom: none;
			}
			.mylistSelectMenu .mylistIcon {
				display: inline-block;
				width: 18px;
				height: 14px;
				margin: -4px 4px 0 0;
				vertical-align: middle;
				margin-right: 15px;
				background: url("//nicovideo.cdn.nimg.jp/uni/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
				transform: scale(1.5);
				transform-origin: 0 0 0;
				transition: transform 0.1s ease, box-shadow 0.1s ease;
				cursor: pointer;
			}
			.mylistSelectMenu .mylistIcon:hover {
				background-color: #ff9;
				transform: scale(2);
			}
			.mylistSelectMenu .mylistIcon:hover::after {
				background: #fff;
				z-index: 100;
				opacity: 1;
			}
			.mylistSelectMenu .deflist .mylistIcon { background-position: 0 -253px;}
			.mylistSelectMenu .folder1 .mylistIcon { background-position: 0 -23px;}
			.mylistSelectMenu .folder2 .mylistIcon { background-position: 0 -46px;}
			.mylistSelectMenu .folder3 .mylistIcon { background-position: 0 -69px;}
			.mylistSelectMenu .folder4 .mylistIcon { background-position: 0 -92px;}
			.mylistSelectMenu .folder5 .mylistIcon { background-position: 0 -115px;}
			.mylistSelectMenu .folder6 .mylistIcon { background-position: 0 -138px;}
			.mylistSelectMenu .folder7 .mylistIcon { background-position: 0 -161px;}
			.mylistSelectMenu .folder8 .mylistIcon { background-position: 0 -184px;}
			.mylistSelectMenu .folder9 .mylistIcon { background-position: 0 -207px;}
			.mylistSelectMenu .name {
				display: inline-block;
				width: calc(100% - 20px);
				vertical-align: middle;
				font-size: 110%;
				color: #fff;
				text-decoration: none !important;
			}
			.mylistSelectMenu .name:hover {
				color: #fff;
			}
			.mylistSelectMenu .name::after {
				content: ' に登録';
				font-size: 75%;
				color: #333;
			}
			.mylistSelectMenu li:hover .name::after {
				color: #fff;
			}
			.zenzaTweetButton:hover {
				text-shadow: 1px 1px 2px #88c;
				background: #1da1f2;
				color: #fff;
			}
		.menuItemContainer .menuButton.closeButton {
			position: absolute;
			font-size: 20px;
			top: 0;
			right: 0;
			z-index: ${CONSTANT.BASE_Z_INDEX + 60000};
			margin: 0 0 40px 40px;
			color: #ccc;
			border: solid 1px #888;
			border-radius: 0;
			transition:
				opacity 0.4s ease,
				transform 0.2s ease,
				background 0.2s ease,
				box-shadow 0.2s ease
					;
			pointer-events: auto;
			transform-origin: center center;
		}
		.is-mouseMoving .closeButton,
		.closeButton:hover {
			opacity: 1;
			background: rgba(0, 0, 0, 0.8);
		}
		.closeButton:hover {
			background: rgba(33, 33, 33, 0.9);
			box-shadow: 4px 4px 4px #000;
		}
		.closeButton:active {
			transform: scale(0.5);
		}
		.menuItemContainer .toggleDebugButton {
			position: relative;
			display: inline-block;
			opacity: 1 !important;
			padding: 8px 16px;
			color: #000;
			box-shadow: none;
			font-size: 21px;
			border: 1px solid black;
			background: rgba(192, 192, 192, 0.8);
			width: auto;
			height: auto;
		}
		.togglePlayMenu {
			display: none;
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) scale(1.5);
			width: 80px;
			height: 45px;
			font-size: 35px;
			line-height: 45px;
			border-radius: 8px;
			text-align: center;
			color: var(--base-fore-color);
			z-index: ${CONSTANT.BASE_Z_INDEX + 10};
			background: rgba(0, 0, 0, 0.8);
			transition: transform 0.2s ease, box-shadow 0.2s, text-shadow 0.2s, font-size 0.2s;
			box-shadow: 0 0 2px rgba(255, 255, 192, 0.8);
			cursor: pointer;
		}
		.togglePlayMenu:hover {
			transform: translate(-50%, -50%) scale(1.6);
			text-shadow: 0 0 4px #888;
			box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
		}
		.togglePlayMenu:active {
			transform: translate(-50%, -50%) scale(2.0, 1.2);
			font-size: 30px;
			box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.8);
			text-shadow: none;
			transition: transform 0.1s ease;
		}
		.is-notPlayed .togglePlayMenu {
			display: block;
		}
		.is-playing .togglePlayMenu,
		.is-error   .togglePlayMenu,
		.is-loading .togglePlayMenu {
			display: none;
		}
	`, {className: 'videoHoverMenu'});
util.addStyle(`
	.menuItemContainer.leftBottom {
		bottom: 64px;
	}
	.menuItemContainer.leftBottom .scalingUI {
		transform-origin: left bottom;
	}
	.menuItemContainer.leftBottom .scalingUI {
		height: 64px;
	}
	.menuItemContainer.rightBottom {
		bottom: 64px;
	}
	.ngSettingSelectMenu {
		bottom: 0px;
	}
	`, {className: 'videoHoverMenu screenMode for-full'});
VideoHoverMenu.__tpl__ = (`
		<div class="hoverMenuContainer">
			<div class="menuItemContainer leftTop">
					<div class="menuButton toggleDebugButton" data-command="toggle-debug">
						<div class="menuButtonInner">debug mode</div>
					</div>
			</div>
			<div class="menuItemContainer rightTop">
				<div class="scalingUI">
					<div class="menuButton zenzaTweetButton" data-command="tweet">
						<div class="tooltip">ツイート</div>
						<div class="menuButtonInner">t</div>
					</div>
					<div class="menuButton mylistButton mylistAddMenu forMember"
						data-command="nop" tabindex="-1" data-has-submenu="1">
						<div class="tooltip">マイリスト登録</div>
						<div class="menuButtonInner">My</div>
						<div class="mylistSelectMenu selectMenu zenzaPopupMenu forMember">
							<div class="triangle"></div>
							<div class="mylistSelectMenuInner">
							</div>
						</div>
					</div>
					<div class="menuButton mylistButton deflistAdd forMember" data-command="deflistAdd">
						<div class="tooltip">とりあえずマイリスト(T)</div>
						<div class="menuButtonInner">&#x271A;</div>
					</div>
					<div class="menuButton closeButton" data-command="close">
						<div class="menuButtonInner">&#x2716;</div>
					</div>
				</div>
			</div>
			<div class="menuItemContainer leftBottom">
				<div class="scalingUI">
					<div class="showCommentSwitch menuButton" data-command="toggle-showComment">
						<div class="tooltip">コメント表示ON/OFF(V)</div>
						<div class="menuButtonInner">💬</div>
					</div>
					<div class="ngSettingMenu menuButton" data-command="nop"
						data-has-submenu="1" tabindex="-1">
						<div class="tooltip">NG設定</div>
						<div class="menuButtonInner">NG</div>
							<div class="ngSettingSelectMenu selectMenu zenzaPopupMenu">
								<div class="triangle"></div>
								<p class="caption">NG設定</p>
								<ul>
									<li class="update-enableFilter"
										data-command="update-enableFilter"
										data-param="true"  data-type="bool"><span>ON</span></li>
									<li class="update-enableFilter"
										data-command="update-enableFilter"
										data-param="false" data-type="bool"><span>OFF</span></li>
								</ul>
								<p class="caption sharedNgLevelSelect">NG共有設定</p>
								<ul class="sharedNgLevelSelect">
									<li class="sharedNgLevel max"
										data-command="update-sharedNgLevel"
										data-param="MAX"><span>最強</span></li>
									<li class="sharedNgLevel high"
										data-command="update-sharedNgLevel"
										data-param="HIGH"><span>強</span></li>
									<li class="sharedNgLevel mid"
										data-command="update-sharedNgLevel"
										data-param="MID"><span>中</span></li>
									<li class="sharedNgLevel low"
										data-command="update-sharedNgLevel"
										data-param="LOW"><span>弱</span></li>
									<li class="sharedNgLevel none"
										data-command="update-sharedNgLevel"
										data-param="NONE"><span>なし</span></li>
								</ul>
							</div>
					</div>
				</div>
			</div>
			<div class="menuItemContainer onErrorMenu">
				<div class="menuButton openGinzaMenu" data-command="openGinza">
					<div class="menuButtonInner">GINZAで視聴</div>
				</div>
				<div class="menuButton reloadMenu for-nicovideo" data-command="reload">
					<div class="menuButtonInner for-nicovideo">リロード</div>
					<div class="menuButtonInner for-ZenTube">ZenTube解除</div>
				</div>
				<div class="menuButton playNextVideo" data-command="playNextVideo">
					<div class="menuButtonInner">次の動画</div>
				</div>
			</div>
			<div class="togglePlayMenu menuItemContainer center" data-command="togglePlay">
				▶
			</div>
		</div>
	`).trim();
class VariablesMapper {
	get nextState() {
		const {menuScale, commentLayerOpacity, fullscreenControlBarMode} = this.config.props;
		return {menuScale, commentLayerOpacity, fullscreenControlBarMode};
	}
	get videoControlBarHeight() {
		return(
			(VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) *
				this.state.menuScale + VideoControlBar.BASE_SEEKBAR_HEIGHT);
	}
	constructor({config, element}){
		this.config = config;
		this.state = {
			menuScale: 0,
			commentLayerOpacity: 0,
			fullscreenControlBarMode: 'auto'
		};
		this.element = element || document.body;
		this.emitter = new Emitter();
		const update = _.debounce(this.update.bind(this), 500);
		Object.keys(this.state).forEach(key =>
			config.onkey(key, () => update(key)));
		update();
	}
	on(...args) {
		this.emitter.on(...args);
	}
	shouldUpdate(state, nextState) {
		return Object.keys(state).some(key => state[key] !== nextState[key]);
	}
	setVar(key, value) { this.element.style.setProperty(key, value); }
	update() {
		const state = this.state;
		const nextState = this.nextState;
		if (!this.shouldUpdate(state, nextState)) {
			return;
		}
		const {menuScale, commentLayerOpacity, fullscreenControlBarMode} = nextState;
		this.state = nextState;
		Object.assign(this.element.dataset, {fullscreenControlBarMode});
		if (state.scale !== menuScale) {
			this.setVar('--zenza-ui-scale', menuScale);
			this.setVar('--zenza-control-bar-height', css.px(this.videoControlBarHeight));
		}
		if (state.commentLayerOpacity !== commentLayerOpacity) {
			this.setVar('--zenza-comment-layer-opacity', commentLayerOpacity);
		}
		this.emitter.emit('update', nextState);
	}
}

const RootDispatcher = (() => {
	let config;
	let player;
	let playerState;
	class RootDispatcher {
		static initialize(dialog) {
			player = dialog;
			playerState = ZenzaWatch.state.player;
			config = PlayerConfig.getInstance(config);
			config.on('update', RootDispatcher.onConfigUpdate);
			player.on('command', RootDispatcher.execCommand);
		}
		static execCommand(command, params) {
			let result = {status: 'ok'};
			switch(command) {
				case 'notifyHtml':
					PopupMessage.notify(params, true);
					break;
				case 'notify':
					PopupMessage.notify(params);
					break;
				case 'alert':
					PopupMessage.alert(params);
					break;
				case 'alertHtml':
					PopupMessage.alert(params, true);
					break;
				case 'copy-video-watch-url':
					Clipboard.copyText(playerState.videoInfo.watchUrl);
					break;
				case 'tweet':
					nicoUtil.openTweetWindow(playerState.videoInfo);
					break;
				case 'toggleConfig': {
					config.props[params] = !config.props[params];
					break;
				}
				case 'picture-in-picture':
					document.querySelector('.zenzaWatchVideoElement').requestPictureInPicture();
					break;
				case 'toggle-comment':
				case 'toggle-showComment':
				case 'toggle-backComment':
				case 'toggle-mute':
				case 'toggle-loop':
				case 'toggle-debug':
				case 'toggle-enableFilter':
				case 'toggle-enableNicosJumpVideo':
				case 'toggle-useWellKnownPort':
				case 'toggle-bestZenTube':
				case 'toggle-autoCommentSpeedRate':
				case 'toggle-video.hls.enableOnlyRequired':
					command = command.replace(/^toggle-/, '');
					config.props[command] = !config.props[command];
					break;
				case 'baseFontFamily':
				case 'baseChatScale':
				case 'enableFilter':
				case 'update-enableFilter':
				case 'screenMode':
				case 'update-screenMode':
				case 'update-sharedNgLevel':
				case 'update-commentSpeedRate':
				case 'update-fullscreenControlBarMode':
					command = command.replace(/^update-/, '');
					if (config.props[command] === params) {
						break;
					}
					config.props[command] = params;
					break;
				case 'nop':
					break;
				case 'echo':
					window.console.log('%cECHO', 'font-weight: bold;', {params});
					PopupMessage.notify(`ECHO: 「${typeof params === 'string' ? params : JSON.stringify(params)}」`);
					break;
				default:
					ZenzaWatch.emitter.emit(`command-${command}`, command, params);
					window.dispatchEvent(new CustomEvent(`${PRODUCT}-command`, {detail: {command, params, param: params}}));
			}
			return result;
		}
		static onConfigUpdate(key, value) {
			switch (key) {
				case 'enableFilter':
					playerState.isEnableFilter = value;
					break;
				case 'backComment':
					playerState.isBackComment = !!value;
					break;
				case 'showComment':
					playerState.isShowComment = !!value;
					break;
				case 'loop':
					playerState.isLoop = !!value;
					break;
				case 'mute':
					playerState.isMute = !!value;
					break;
				case 'debug':
					playerState.isDebug = !!value;
					PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
					break;
				case 'sharedNgLevel':
				case 'screenMode':
				case 'playbackRate':
					playerState[key] = value;
					break;
			}
		}
	}
	return RootDispatcher;
})();

class CommentInputPanel extends Emitter {
	constructor(params) {
		super();
		this._$playerContainer = params.$playerContainer;
		this.config = params.playerConfig;
		this._initializeDom();
		this.config.onkey('autoPauseCommentInput', this._onAutoPauseCommentInputChange.bind(this));
	}
	_initializeDom() {
		let $container = this._$playerContainer;
		let config = this.config;
		css.addStyle(CommentInputPanel.__css__);
		$container.append(uq.html(CommentInputPanel.__tpl__));
		let $view = this._$view = $container.find('.commentInputPanel');
		let $input = this._$input = $view.find('.commandInput, .commentInput');
		this._$form = $container.find('form');
		let $autoPause = this._$autoPause = $container.find('.autoPause');
		this._$commandInput = $container.find('.commandInput');
		let $cmt = this._$commentInput = $container.find('.commentInput');
		this._$commentSubmit = $container.find('.commentSubmit');
		let preventEsc = e => {
			if (e.keyCode === 27) { // ESC
				e.preventDefault();
				e.stopPropagation();
				this.emit('esc');
				e.target.blur();
			}
		};
		$input
			.on('focus', this._onFocus.bind(this))
			.on('blur', _.debounce(this._onBlur.bind(this), 500))
			.on('keydown', preventEsc)
			.on('keyup', preventEsc);
		$autoPause.prop('checked', config.props.autoPauseCommentInput);
		this._$autoPause.on('change', () => {
			config.props.autoPauseCommentInput = !!$autoPause.prop('checked');
			$cmt.focus();
		});
		this._$view.find('label').on('click', e => e.stopPropagation());
		this._$form.on('submit', this._onSubmit.bind(this));
		this._$commentSubmit.on('click', this._onSubmitButtonClick.bind(this));
		$view.on('click', e => e.stopPropagation()).on('paste', e => e.stopPropagation());
	}
	_onFocus() {
		if (!this._hasFocus) {
			this.emit('focus', this.isAutoPause);
		}
		this._hasFocus = true;
	}
	_onBlur() {
		if (this._$commandInput.hasFocus() || this._$commentInput.hasFocus()) {
			return;
		}
		this.emit('blur', this.isAutoPause);
		this._hasFocus = false;
	}
	_onSubmit() {
		this.submit();
	}
	_onSubmitButtonClick() {
		this.submit();
	}
	_onAutoPauseCommentInputChange(val) {
		this._$autoPause.prop('checked', !!val);
	}
	submit() {
		let chat = this._$commentInput.val().trim();
		let cmd = this._$commandInput.val().trim();
		if (!chat.length) {
			return;
		}
		setTimeout(() => {
			this._$commentInput.val('').blur();
			this._$commandInput.blur();
			let $view = this._$view.addClass('updating');
			(new Promise((resolve, reject) => this.emit('post', {resolve, reject}, chat, cmd)))
				.then(() => $view.removeClass('updating'))
				.catch(() => $view.removeClass('updating'));
		}, 0);
	}
	get isAutoPause() {
		return this.config.props.autoPauseCommentInput;
	}
	focus() {
		this._$commentInput.focus();
		this._onFocus();
	}
	blur() {
		this._$commandInput.blur();
		this._$commentInput.blur();
		this._onBlur();
	}
}
CommentInputPanel.__css__ = (`
	.commentInputPanel {
		position: fixed;
		top:  calc(-50vh + 50% + 100vh);
		left: 50vw;
		box-sizing: border-box;
		width: 200px;
		height: 50px;
		z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
		transform: translate(-50%, -170px);
		overflow: visible;
	}
	.is-notPlayed .commentInputPanel,
	.is-waybackMode .commentInputPanel,
	.is-mymemory .commentInputPanel,
	.is-loading  .commentInputPanel,
	.is-error    .commentInputPanel {
		display: none;
	}
	.commentInputPanel:focus-within {
		width: 500px;
		z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
	}
	.zenzaScreenMode_wide .commentInputPanel,
	.is-fullscreen           .commentInputPanel {
		position: absolute !important; /* fixedだとFirefoxのバグで消える */
		top:  auto !important;
		bottom: 120px !important;
		transform: translate(-50%, 0);
		left: 50%;
	}
	.commentInputPanel>* {
		pointer-events: none;
	}
	.commentInputPanel input {
		font-size: 18px;
	}
	.commentInputPanel:focus-within>*,
	.commentInputPanel:hover>* {
		pointer-events: auto;
	}
	.is-mouseMoving .commentInputOuter {
		border: 1px solid #888;
		box-sizing: border-box;
		border-radius: 8px;
		opacity: 0.5;
	}
	.is-mouseMoving:not(:focus-within) .commentInputOuter {
		box-shadow: 0 0 8px #fe9, 0 0 4px #fe9 inset;
	}
	.commentInputPanel:focus-within .commentInputOuter,
	.commentInputPanel:hover  .commentInputOuter {
		border: none;
		opacity: 1;
	}
	.commentInput {
		width: 100%;
		height: 30px !important;
		font-size: 24px;
		background: transparent;
		border: none;
		opacity: 0;
		transition: opacity 0.3s ease, box-shadow 0.4s ease;
		text-align: center;
		line-height: 26px !important;
		padding-right: 32px !important;
		margin-bottom: 0 !important;
	}
	.commentInputPanel:hover  .commentInput {
		opacity: 0.5;
	}
	.commentInputPanel:focus-within .commentInput {
		opacity: 0.9 !important;
	}
	.commentInputPanel:focus-within .commentInput,
	.commentInputPanel:hover  .commentInput {
		box-sizing: border-box;
		border: 1px solid #888;
		border-radius: 8px;
		background: #fff;
		box-shadow: 0 0 8px #fff;
	}
	.commentInputPanel .autoPauseLabel {
		display: none;
	}
	.commentInputPanel:focus-within .autoPauseLabel {
		position: absolute;
		top: 36px;
		left: 50%;
		transform: translate(-50%, 0);
		display: block;
		background: #336;
		z-index: 100;
		color: #ccc;
		padding: 0 8px;
	}
	.commandInput {
		position: absolute;
		width: 100px;
		height: 30px !important;
		font-size: 24px;
		top: 0;
		left: 0;
		border-radius: 8px;
		z-index: -1;
		opacity: 0;
		transition: left 0.2s ease, opacity 0.2s ease;
		text-align: center;
		line-height: 26px !important;
		padding: 0 !important;
		margin-bottom: 0 !important;
	}
	.commentInputPanel:focus-within .commandInput {
		left: -108px;
		z-index: 1;
		opacity: 0.9;
		border: none;
		pointer-evnets: auto;
		box-shadow: 0 0 8px #fff;
		padding: 0;
	}
	.commentSubmit {
		position: absolute;
		width: 100px !important;
		height: 30px !important;
		font-size: 24px;
		top: 0;
		right: 0;
		border: none;
		border-radius: 8px;
		z-index: -1;
		opacity: 0;
		transition: right 0.2s ease, opacity 0.2s ease;
		line-height: 26px;
		letter-spacing: 0.2em;
	}
	.commentInputPanel:focus-within .commentSubmit {
		right: -108px;
		z-index: 1;
		opacity: 0.9;
		box-shadow: 0 0 8px #fff;
	}
	.commentInputPanel:focus-within .commentSubmit:active {
		color: #000;
		background: #fff;
		box-shadow: 0 0 16px #ccf;
	}
`).trim();
CommentInputPanel.__tpl__ = (`
	<div class="commentInputPanel forMember" autocomplete="new-password">
		<form action="javascript: void(0);">
			<div class="commentInputOuter">
				<input
					type="text"
					value=""
					autocomplete="on"
					name="mail"
					placeholder="コマンド"
					class="commandInput"
					maxlength="30"
				>
				<input
					type="text"
					value=""
					autocomplete="off"
					name="chat"
					accesskey="c"
					placeholder="コメント入力(C)"
					class="commentInput"
					maxlength="75"
					>
				<input
					type="submit"
					value="送信"
					name="post"
					class="commentSubmit"
					>
				<div class="recButton" title="音声入力">
				</div>
		</div>
		</form>
		<label class="autoPauseLabel">
			<input type="checkbox" class="autoPause" checked="checked">
			入力時に一時停止
		</label>
	</div>
`).trim();

class SettingPanel extends Emitter{
	constructor(params) {
		super();
		this._params = params;
		this._initialized = false;
	}
	initialize () {
		if (this._initialized) {
			return;
		}
		const params = this._params;
		this._playerConfig = params.playerConfig;
		this._$playerContainer = params.$playerContainer;
		this._player = params.player;
		this._playerConfig.on('change', this._onPlayerConfigChange.bind(this));
		this._initializeDom();
		this._initializeCommentFilterEdit();
		this.sync();
		this._initialized = true;
	}
	_initializeDom () {
		const $container = this._$playerContainer;
		css.addStyle(SettingPanel.__css__);
		const $view = this._$view = uq.html(SettingPanel.__tpl__);
		$view.appendTo($container[0]);
		this.elm = $view.mapQuery({
			$check: 'input[type=checkbox]',
			$radio: 'input[type=radio]',
			$text: 'input[type=text], select',
			$filterEdit: '.filterEdit',
			wordFilter: '.wordFilterEdit',
			userIdFilter: '.userIdFilterEdit',
			commandFilter: '.commandFilterEdit'
		}).result;
		$view.on('click', e => e.stopPropagation())
			.on('wheel', e => e.stopPropagation(), {passive: true})
			.on('paste', e => e.stopPropagation());
		const {$check, $radio, $text} = this.elm;
		$check.on('change', this._onToggleItemChange.bind(this));
		$radio.on('change', this._onRadioItemChange.bind(this));
		$text.on('change', this._onInputItemChange.bind(this));
	}
	_initializeCommentFilterEdit() {
		this.elm.$filterEdit.on('change', e =>
			this.emit('command', e.target.dataset.command, e.target.value));
	}
	sync() {
		const config = this._playerConfig;
		const {wordFilter, userIdFilter, commandFilter, $check, $radio, $text} = this.elm;
		const filterMap = {wordFilter, userIdFilter, commandFilter};
		Object.keys(filterMap).forEach(v => {
			let value = config.props[v] || [];
			value = Array.isArray(value) ? value.join('\n') : value;
			filterMap[v].value = value;
		});
		for (const check of $check) {
			const settingName = check.dataset.settingName;
			const val = config.props[settingName];
			check.checked = val;
			(check.closest('.control') || check).classList.toggle('checked', val);
		}
		for (const check of $radio) {
			const settingName = check.dataset.settingName;
			const val = config.props[settingName];
			check.checked = val === check.value;
		}
		for (const elm of $text) {
			const settingName = elm.dataset.settingName;
			const val = config.props[settingName];
			elm.value = val;
		}
	}
	_onPlayerConfigChange(changed) {
		const keys = [
			'wordFilter', 'userIdFilter', 'commandFilter',
			'loop','autoPlay','enableHeatMap',
			'autoFullScreen','enableStoryboard',
			'loadLinkedChannelVideo'];
		if ([...changed.keys()].some(key => keys.includes(key))) {
			this.sync();
		}
	}
	_onToggleItemChange(e) {
		const name = e.target.dataset.settingName;
		const val = !!e.target.checked;
		this._playerConfig.props[name] = val;
		e.target.closest('.control').classList.toggle('checked', val);
	}
	_onRadioItemChange(e) {
		const name = e.target.dataset.settingName;
		const checked = !!e.target.checked;
		if (!checked) {
			return;
		}
		this._playerConfig.props[name] = e.target.value;
	}
	_onInputItemChange(e) {
		const name = e.target.dataset.settingName;
		const val = e.target.value;
		this._playerConfig.props[name] = val;
	}
	toggle(v) {
		if (v !== false) {
			this.initialize();
		} else if (!this._initialized) {
			return;
		}
		const view = this._$view[0];
		if (typeof v !== 'boolean') {
			v = !view.contains(document.activeElement);
		}
		v ? view.focus() : view.blur();
		if (v) {
			this.sync();
		}
	}
	show () {
		this.toggle(true);
	}
	hide () {
		this.toggle(false);
	}
}
SettingPanel.__css__ = (`
	.zenzaSettingPanel {
		display: block;
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -100vh);
		z-index: 170000;
		color: #fff;
		transition: transform 0.4s ease;
		will-change: transform;
		pointer-events: none;
		user-select: none;
		overflow-y: hidden;
		outline: none;
		contain: strict;
	}
	.zenzaSettingPanel:not(:focus-within) >* {
		display: none;
	}
	.zenzaSettingPanel:focus-within {
		width: 500px;
		height: 400px;
		opacity: 1;
		pointer-events: auto;
		transform: translate(-50%, -50%);
		overflow-y: scroll;
		overflow-x: hidden;
		overscroll-behavior: contain;
		background: rgba(0, 0, 0, 0.8);
	}
	.zenzaSettingPanel:focus-within::-webkit-scrollbar {
		width: 16px;
		background: var(--scrollbar-bg-color);
	}
	.zenzaSettingPanel:focus-within::-webkit-scrollbar-thumb {
		background: var(--scrollbar-thumb-color);
	}
	.zenzaScreenMode_sideView .zenzaSettingPanel:focus-within,
	.zenzaScreenMode_small    .zenzaSettingPanel:focus-within {
		position: fixed;
	}
	.zenzaSettingPanel:focus-within {
		border: 2px outset #fff;
		box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
		pointer-events: auto;
	}
	.zenzaSettingPanel .settingPanelInner {
		box-sizing: border-box;
		margin: 16px;
		overflow: visible;
	}
	.zenzaSettingPanel .caption {
		background: #333;
		font-size: 20px;
		padding: 4px 2px;
		color: #fff;
	}
	.zenzaSettingPanel label {
		display: inline-block;
		box-sizing: border-box;
		width: 100%;
		padding: 4px 8px;
		cursor: pointer;
	}
	.zenzaSettingPanel .control {
		border-radius: 4px;
		background: rgba(88, 88, 88, 0.3);
		padding: 8px;
		margin: 16px 4px;
	}
	.zenzaSettingPanel .control:hover {
		border-color: #ff9;
	}
	.zenzaSettingPanel button {
		font-size: 10pt;
		padding: 4px 8px;
		background: #888;
		border-radius: 4px;
		border: solid 1px;
		cursor: pointer;
	}
	.zenzaSettingPanel input[type=checkbox] {
		transform: scale(2);
		margin-left: 8px;
		margin-right: 16px;
	}
	.zenzaSettingPanel .filterEditContainer {
		color: #fff;
		margin-bottom: 32px;
	}
	.zenzaSettingPanel .filterEditContainer.forGuest {
		padding: 8px;
	}
	.zenzaSettingPanel .filterEditContainer p {
		color: #fff;
		font-size: 120%;
	}
	.zenzaSettingPanel .filterEditContainer .info {
		color: #ccc;
		font-size: 90%;
		display: inline-block;
		margin: 8px 0;
	}
	.zenzaSettingPanel .filterEdit {
		background: #000;
		color: #ccc;
		width: 90%;
		margin: 0 5%;
		min-height: 150px;
		white-space: pre;
	}
	.zenzaSettingPanel .fontEdit .info {
		color: #ccc;
		font-size: 90%;
		display: inline-block;
		margin: 8px 0;
	}
	.zenzaSettingPanel .fontEdit p {
		color: #fff;
		font-size: 120%;
	}
	.zenzaSettingPanel input[type=text] {
		font-size: 24px;
		background: #000;
		color: #ccc;
		width: 90%;
		margin: 0 5%;
		border-radius: 8px;
	}
	.zenzaSettingPanel select {
		font-size:24px;
		background: #000;
		color: #ccc;
		margin: 0 5%;
		border-radius: 8px;
		}
	`).trim();
SettingPanel.__tpl__ = (`
	<div class="zenzaSettingPanel" tabindex="0">
		<div class="settingPanelInner">
			<p class="caption">プレイヤーの設定</p>
			<div class="autoPlayControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="autoPlay">
					自動で再生する
				</label>
			</div>
			<div class="enableTogglePlayOnClickControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableTogglePlayOnClick">
					画面クリックで再生/一時停止
				</label>
			</div>
			<div class="autoFullScreenControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="autoFullScreen">
					自動でフルスクリーンにする
					<small>(singletonモードでは使えません)</small>
				</label>
			</div>
			<div class="enableSingleton control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableSingleton">
					ZenzaWatchを起動してるタブがあればそちらで開く<br>
					<smal>(singletonモード)</small>
				</label>
			</div>
			<div class="enableHeatMapControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableHeatMap">
					コメントの盛り上がりをシークバーに表示
				</label>
			</div>
			<div class="overrideGinzaControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="overrideGinza">
					動画視聴ページでも公式プレイヤーの代わりに起動する
				</label>
			</div>
			<div class="overrideWatchLinkControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="overrideWatchLink">
					[Zen]ボタンなしでZenzaWatchを開く(リロード後に反映)
				</label>
			</div>
			<div class="overrideWatchLinkControl control toggle forPremium">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableStoryboard">
					シークバーにサムネイルを表示 (重いかも)
				</label>
			</div>
			<div class="UaaEnableControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="uaa.enable">
					ニコニ広告の情報を取得する(対応ブラウザのみ)
				</label>
			</div>
			<div class="enableAutoMylistCommentControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableAutoMylistComment">
					マイリストコメントに投稿者名を入れる
				</label>
			</div>
			<div class="autoDisableDmc control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="autoDisableDmc">
					旧システムのほうが画質が良さそうな時は旧システムを使う<br>
					<small>たまに誤爆することがあります (回転情報の含まれる動画など)</small>
				</label>
			</div>
			<div class="enableNicosJumpVideo control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="enableNicosJumpVideo"
					data-command="toggle-enableNicosJumpVideo">
					＠ジャンプで指定された動画をプレイリストに入れる
				</label>
			</div>
			<div class="enableOnlyRequired control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="video.hls.enableOnlyRequired"
					data-command="toggle-video.hls.enableOnlyRequired">
					HLSが必須の動画だけHLSを使用する (※ HLSが重い環境用)
				</label>
			</div>
			<div class="touchEnable control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="touch.enable"
					data-command="toggle-touchEnable">
					タッチパネルのジェスチャを有効にする
					<smal>(2本指左右シーク・上下で速度変更/3本指で動画切替)</small>
				</label>
			</div>
			<div class="bestZenTube control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="bestZenTube"
					data-command="toggle-bestZenTube">
						ZenTube使用時に最高画質をリクエストする (※ 機能してないかも)
				</label>
			</div>
			<div class="loadLinkedChannelVideoControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="loadLinkedChannelVideo">
					無料期間の切れた動画はdアニメの映像を流す<br>
					<small>(当然ながらdアニメニコニコチャンネル加入が必要)</small>
				</label>
			</div>
			<div class="menuScaleControl control toggle">
				<label>
					<select class="menuScale" data-setting-name="menuScale">
							<option value="0.8">0.8倍</option>
							<option value="1" selected>標準</option>
							<option value="1.2">1.2倍</option>
							<option value="1.5">1.5倍</option>
							<option value="2.0">2倍</option>
					</select>
					ボタンの大きさ(倍率)
					<small>※ 一部レイアウトが崩れます</small>
				</label>
			</div>
			<p class="caption">コメント・フォントの設定</p>
			<div class="fontEdit">
				<div class="autoCommentSpeedRate control toggle">
					<label>
						<input type="checkbox" class="checkbox" data-setting-name="autoCommentSpeedRate">
						倍速再生でもコメントは速くしない<br>
							<small>※ コメントのレイアウトが一部崩れます</small>
					</label>
				</div>
				<div class="commentSpeedRate control toggle">
					<label>
						<select class="commentSpeedRate" data-setting-name="commentSpeedRate">
								<option value="0.5">0.5倍</option>
								<option value="0.8">0.8倍</option>
								<option value="1" selected>標準</option>
								<option value="1.2">1.2倍</option>
								<option value="1.5">1.5倍</option>
								<option value="2.0"2倍</option>
						</select>
						コメントの速度(倍率)<br>
							<small>※ コメントのレイアウトが一部崩れます</small>
					</label>
				</div>
				<div class="baseFontBolderControl control toggle">
					<label>
						<input type="checkbox" class="checkbox" data-setting-name="baseFontBolder">
						フォントを太くする
					</label>
				</div>
				<p>フォント名</p>
				<span class="info">入力例: 「'游ゴシック', 'メイリオ', '戦国TURB'」</span>
				<input type="text" class="textInput"
					data-setting-name="baseFontFamily">
				<p>投稿者コメントの影の色</p>
				<span class="info">※ リロード後に反映</span>
				<input type="text" class="textInput" pattern="(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|^[a-zA-Z]+$)"
					data-setting-name="commentLayer.ownerCommentShadowColor">
				<div class="baseChatScaleControl control toggle">
					<label>
					<select class="baseChatScale" data-setting-name="baseChatScale">
						<option value="0.5">0.5</option>
						<option value="0.6">0.6</option>
						<option value="0.7">0.7</option>
						<option value="0.8">0.8</option>
						<option value="0.9">0.9</option>
						<option value="1"  selected>1.0</option>
						<option value="1.1">1.1</option>
						<option value="1.2">1.2</option>
						<option value="1.3">1.3</option>
						<option value="1.4">1.4</option>
						<option value="1.5">1.5</option>
						<option value="1.6">1.6</option>
						<option value="1.7">1.7</option>
						<option value="1.8">1.8</option>
						<option value="1.9">1.9</option>
						<option value="2.0">2.0</option>
					</select>
					フォントサイズ(倍率)
					</label>
				</div>
				<div class="commentLayerOpacityControl control">
					<label>
					<select class="commentLayerOpacity" data-setting-name="commentLayerOpacity">
						<option value="0.1">90%</option>
						<option value="0.2">80%</option>
						<option value="0.3">70%</option>
						<option value="0.4">60%</option>
						<option value="0.5">50%</option>
						<option value="0.6">40%</option>
						<option value="0.7">30%</option>
						<option value="0.8">20%</option>
						<option value="0.9">10%</option>
						<option value="1" selected>0%</option>
					</select>
					コメントの透明度
					</label>
				</div>
				<div class="commentLayer-textShadowType control">
					<p>コメントの影</p>
					<label>
						<input type="radio"
							name="textShadowType"
							data-setting-name="commentLayer.textShadowType"
							value="">
							標準 (軽い)
					</label>
					<label>
						<input type="radio"
							name="textShadowType"
							data-setting-name="commentLayer.textShadowType"
							value="shadow-type2">
							縁取り
					</label>
					<label>
						<input type="radio"
							name="textShadowType"
							data-setting-name="commentLayer.textShadowType"
							value="shadow-type3">
						ぼかし (重い)
					</label>
					<label>
						<input type="radio"
							name="textShadowType"
							data-setting-name="commentLayer.textShadowType"
							value="shadow-stroke">
							縁取り2 (対応ブラウザのみ。やや重い)
					</label>
					<label>
						<input type="radio"
							name="textShadowType"
							data-setting-name="commentLayer.textShadowType"
							value="shadow-dokaben">
							ドカベン <s>(飽きたら消します)</s>
					</label>
				</div>
			<div class="backCommentControl control toggle">
				<label>
					<input type="checkbox" class="checkbox" data-setting-name="backComment">
					コメントを動画の後ろに流す
				</label>
			</div>
			</div>
			<p class="caption">NG設定</p>
			<div class="filterEditContainer forGuest">
				設定の変更はログイン中のみ可能です。<br>
				非ログインでも、設定済みの内容は反映されます。
			</div>
			<div class="filterEditContainer forMember">
				<span class="info">
					１行ごとに入力。上限はありませんが、増やしすぎると重くなります。
				</span>
				<p>NGワード</p>
				<textarea
					class="filterEdit wordFilterEdit"
					data-command="setWordFilterList"></textarea>
				<p>NGコマンド</p>
				<textarea
					class="filterEdit commandFilterEdit"
					data-command="setCommandFilterList"></textarea>
				<p>NGユーザー</p>
				<textarea
					class="filterEdit userIdFilterEdit"
					data-command="setUserIdFilterList"></textarea>
			</div>
		</div>
	</div>
	`).trim();

class TagListView extends BaseViewComponent {
	constructor({parentNode}) {
		super({
			parentNode,
			name: 'TagListView',
			template: '<div class="TagListView"></div>',
			shadow: TagListView.__shadow__,
			css: TagListView.__css__
		});
		this._state = {
			isInputing: false,
			isUpdating: false,
			isEditing: false
		};
		this._tagEditApi = new TagEditApi();
	}
	_initDom(...args) {
		super._initDom(...args);
		const v = this._shadow || this._view;
		Object.assign(this._elm, {
			videoTags: v.querySelector('.videoTags'),
			videoTagsInner: v.querySelector('.videoTagsInner'),
			tagInput: v.querySelector('.tagInputText'),
			form: v.querySelector('form')
		});
		this._elm.tagInput.addEventListener('keydown', this._onTagInputKeyDown.bind(this));
		this._elm.form.addEventListener('submit', this._onTagInputSubmit.bind(this));
		v.addEventListener('keydown', e => {
			if (this._state.isInputing) {
				e.stopPropagation();
			}
		});
		v.addEventListener('click', e => e.stopPropagation());
		ZenzaWatch.emitter.on('hideHover', () => {
			if (this._state.isEditing) {
				this._endEdit();
			}
		});
	}
	_onCommand(command, param) {
		switch (command) {
			case 'refresh':
				this._refreshTag();
				break;
			case 'toggleEdit':
				if (this._state.isEditing) {
					this._endEdit();
				} else {
					this._beginEdit();
				}
				break;
			case 'toggleInput':
				if (this._state.isInputing) {
					this._endInput();
				} else {
					this._beginInput();
				}
				break;
			case 'beginInput':
				this._beginInput();
				break;
			case 'endInput':
				this._endInput();
				break;
			case 'addTag':
				this._addTag(param);
				break;
			case 'removeTag': {
				let elm = this._elm.videoTags.querySelector(`.tagItem[data-tag-id="${param}"]`);
				if (!elm) {
					return;
				}
				elm.classList.add('is-Removing');
				let data = JSON.parse(elm.getAttribute('data-tag'));
				this._removeTag(param, data.tag);
				break;
			}
			case 'tag-search':
				this._onTagSearch(param);
				break;
			default:
				super._onCommand(command, param);
				break;
		}
	}
	_onTagSearch(word) {
		const config = Config.namespace('videoSearch');
		let option = {
			searchType: config.getValue('mode'),
			order: config.getValue('order'),
			sort: config.getValue('sort') || 'playlist',
			owner: config.getValue('ownerOnly')
		};
		if (option.sort === 'playlist') {
			option.sort = 'f';
			option.playlistSort = true;
		}
		super._onCommand('playlistSetSearchVideo', {word, option});
	}
	update({tagList = [], watchId = null, videoId = null, token = null, watchAuthKey = null}) {
		if (watchId) {
			this._watchId = watchId;
		}
		if (videoId) {
			this._videoId = videoId;
		}
		if (token) {
			this._token = token;
		}
		if (watchAuthKey) {
			this._watchAuthKey = watchAuthKey;
		}
		this.setState({
			isInputing: false,
			isUpdating: false,
			isEditing: false,
			isEmpty: false
		});
		this._update(tagList);
		this._boundOnBodyClick = this._onBodyClick.bind(this);
	}
	_onClick(e) {
		if (this._state.isInputing || this._state.isEditing) {
			e.stopPropagation();
		}
		super._onClick(e);
	}
	_update(tagList = []) {
		let tags = [];
		tagList.forEach(tag => {
			tags.push(this._createTag(tag));
		});
		tags.push(this._createToggleInput());
		this.setState({isEmpty: tagList.length < 1});
		this._elm.videoTagsInner.innerHTML = tags.join('');
	}
	_createToggleInput() {
		return (`
				<div
					class="button command toggleInput"
					data-command="toggleInput"
					data-tooltip="タグ追加">
					<span class="icon">&#8853;</span>
				</div>`).trim();
	}
	_onApiResult(watchId, result) {
		if (watchId !== this._watchId) {
			return; // 通信してる間に動画変わったぽい
		}
		const err = result.error_msg;
		if (err) {
			this.emit('command', 'alert', err);
		}
		this.update(result.tags);
	}
	_addTag(tag) {
		this.setState({isUpdating: true});
		const wait3s = this._makeWait(3000);
		const watchId = this._watchId;
		const videoId = this._videoId;
		const csrfToken = this._token;
		const watchAuthKey = this._watchAuthKey;
		const addTag = () => {
			return this._tagEditApi.add({
				videoId,
				tag,
				csrfToken,
				watchAuthKey
			});
		};
		return Promise.all([addTag(), wait3s]).then(results => {
			let result = results[0];
			if (watchId !== this._watchId) {
				return;
			} // 待ってる間に動画が変わったぽい
			if (result && result.tags) {
				this._update(result.tags);
			}
			this.setState({isInputing: false, isUpdating: false, isEditing: false});
			if (result.error_msg) {
				this.emit('command', 'alert', result.error_msg);
			}
		});
	}
	_removeTag(tagId, tag = '') {
		this.setState({isUpdating: true});
		const wait3s = this._makeWait(3000);
		const watchId = this._watchId;
		const videoId = this._videoId;
		const csrfToken = this._token;
		const watchAuthKey = this._watchAuthKey;
		const removeTag = () => {
			return this._tagEditApi.remove({
				videoId,
				tag,
				id: tagId,
				csrfToken,
				watchAuthKey
			});
		};
		return Promise.all([removeTag(), wait3s]).then((results) => {
			let result = results[0];
			if (watchId !== this._watchId) {
				return;
			} // 待ってる間に動画が変わったぽい
			if (result && result.tags) {
				this._update(result.tags);
			}
			this.setState({isUpdating: false});
			if (result.error_msg) {
				this.emit('command', 'alert', result.error_msg);
			}
		});
	}
	_refreshTag() {
		this.setState({isUpdating: true});
		const watchId = this._watchId;
		const wait1s = this._makeWait(1000);
		const load = () => {
			return this._tagEditApi.load(this._videoId);
		};
		return Promise.all([load(), wait1s]).then((results) => {
			let result = results[0];
			if (watchId !== this._watchId) {
				return;
			} // 待ってる間に動画が変わったぽい
			this._update(result.tags);
			this.setState({isUpdating: false, isInputing: false, isEditing: false});
		});
	}
	_makeWait(ms) {
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(ms);
			}, ms);
		});
	}
	_createDicIcon(text, hasDic) {
		let href = `https://dic.nicovideo.jp/a/${encodeURIComponent(text)}`;
		let src = hasDic ?
			'https://live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
			'https://live.nicovideo.jp/img/2012/watch/tag_icon003.png' ;
		let icon = `<img class="dicIcon" src="${src}">`;
		let hasNicodic = hasDic ? 1 : 0;
		return (
			`<zenza-tag-item-menu
				class="tagItemMenu"
				data-text="${encodeURIComponent(text)}"
				data-has-nicodic="${hasNicodic}"
			><a target="_blank" class="nicodic" href="${href}">${icon}</a></zenza-tag-item-menu>`
		);
	}
	_createDeleteButton(id) {
		return `<span target="_blank" class="deleteButton command" title="削除" data-command="removeTag" data-param="${id}">ー</span>`;
	}
	_createLink(text) {
		let href = `//www.nicovideo.jp/tag/${encodeURIComponent(text)}`;
		text = textUtil.escapeToZenkaku(textUtil.unescapeHtml(text));
		return `<a class="tagLink" href="${href}">${text}</a>`;
	}
	_createSearch(text) {
		let title = 'プレイリストに追加';
		let command = 'tag-search';
		let param = textUtil.escapeHtml(text);
		return (`<zenza-playlist-append class="playlistAppend" title="${title}" data-command="${command}" data-param="${param}">▶</zenza-playlist-append>`);
	}
	_createTag(tag) {
		let text = tag.tag;
		let dic = this._createDicIcon(text, !!tag.dic);
		let del = this._createDeleteButton(tag.id);
		let link = this._createLink(text);
		let search = this._createSearch(text);
		let data = textUtil.escapeHtml(JSON.stringify(tag));
		let className = (tag.lock || tag.owner_lock === 1 || tag.lck === '1') ? 'tagItem is-Locked' : 'tagItem';
		className = (tag.cat) ? `${className} is-Category` : className;
		return `<li class="${className}" data-tag="${data}" data-tag-id="${tag.id}">${dic}${del}${link}${search}</li>`;
	}
	_onTagInputKeyDown(e) {
		if (this._state.isUpdating) {
			e.preventDefault();
			e.stopPropagation();
		}
		switch (e.keyCode) {
			case 27: // ESC
				e.preventDefault();
				e.stopPropagation();
				this._endInput();
				break;
		}
	}
	_onTagInputSubmit(e) {
		if (this._state.isUpdating) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		let val = (this._elm.tagInput.value || '').trim();
		if (!val) {
			this._endInput();
			return;
		}
		this._onCommand('addTag', val);
		this._elm.tagInput.value = '';
	}
	_onBodyClick() {
		this._endInput();
		this._endEdit();
	}
	_beginEdit() {
		this.setState({isEditing: true});
		document.body.addEventListener('click', this._boundOnBodyClick);
	}
	_endEdit() {
		document.body.removeEventListener('click', this._boundOnBodyClick);
		this.setState({isEditing: false});
	}
	_beginInput() {
		this.setState({isInputing: true});
		document.body.addEventListener('click', this._boundOnBodyClick);
		this._elm.tagInput.value = '';
		window.setTimeout(() => {
			this._elm.tagInput.focus();
		}, 100);
	}
	_endInput() {
		this._elm.tagInput.blur();
		document.body.removeEventListener('click', this._boundOnBodyClick);
		this.setState({isInputing: false});
	}
}
TagListView.__shadow__ = (`
		<style>
			:host-context(.videoTagsContainer.sideTab) .tagLink {
				color: #000 !important;
				text-decoration: none;
			}
			.TagListView {
				position: relative;
				user-select: none;
			}
			.TagListView.is-Updating {
				cursor: wait;
			}
			:host-context(.videoTagsContainer.sideTab) .TagListView.is-Updating {
				overflow: hidden;
			}
			.TagListView.is-Updating:after {
				content: '${'\\0023F3'}';
				position: absolute;
				top: 50%;
				left: 50%;
				text-align: center;
				transform: translate(-50%, -50%);
				z-index: 10001;
				color: #fe9;
				font-size: 24px;
				letter-spacing: 3px;
				text-shadow: 0 0 4px #000;
				pointer-events: none;
			}
			.TagListView.is-Updating:before {
				content: ' ';
				background: rgba(0, 0, 0, 0.6);
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 100%;
				height: 100%;
				padding: 8px;
				z-index: 10000;
				box-shadow: 0 0 8px #000;
				border-radius: 8px;
				pointer-events: none;
			}
			.TagListView.is-Updating * {
				pointer-events: none;
			}
			*[data-tooltip] {
				position: relative;
			}
			.TagListView .button {
				position: relative;
				display: inline-block;
				min-width: 40px;
				min-height: 24px;
				cursor: pointer;
				user-select: none;
				transition: 0.2s transform, 0.2s box-shadow, 0.2s background;
				text-align: center;
			}
			.TagListView .button:hover {
				background: #666;
			}
			.TagListView .button:active {
				transition: none;
				box-shadow: 0 0 2px #000 inset;
			}
			.TagListView .button .icon {
				position: absolute;
				display: inline-block;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
			}
			.TagListView *[data-tooltip]:hover:after {
				content: attr(data-tooltip);
				position: absolute;
				left: 50%;
				bottom: 100%;
				transform: translate(-50%, 0) scale(0.9);
				pointer-events: none;
				background: rgba(192, 192, 192, 0.9);
				box-shadow: 0 0 4px #000;
				color: black;
				font-size: 12px;
				margin: 0;
				padding: 2px 4px;
				white-space: nowrap;
				z-index: 10000;
				letter-spacing: 2px;
			}
			.videoTags {
				display: inline-block;
				padding: 0;
			}
			.videoTagsInner {
				display: flex;
				flex-wrap: wrap;
				padding: 0 8px;
			}
			.TagListView .tagItem {
				position: relative;
				list-style-type: none;
				display: inline-flex;
				margin-right: 2px;
				line-height: 20px;
				max-width: 50vw;
				align-items: center;
			}
			.TagListView .tagItem:first-child {
				margin-left: 100px;
			}
			.tagLink {
				color: #fff;
				text-decoration: none;
				user-select: none;
				display: inline-block;
				border: 1px solid rgba(0, 0, 0, 0);
			}
			.TagListView .nicodic {
				display: inline-block;
				margin-right: 4px;
				line-height: 20px;
				cursor: pointer;
				vertical-align: middle;
			}
			.TagListView.is-Editing .tagItemMenu,
			.TagListView.is-Editing .nicodic,
			.TagListView:not(.is-Editing) .deleteButton {
				display: none !important;
			}
			.TagListView .deleteButton {
				display: inline-block;
				margin: 0px;
				line-height: 20px;
				width: 20px;
				height: 20px;
				font-size: 16px;
				background: #f66;
				color: #fff;
				cursor: pointer;
				border-radius: 100%;
				transition: transform 0.2s, background 0.4s;
				text-shadow: none;
				transform: scale(1.2);
				text-align: center;
				opacity: 0.8;
			}
			.TagListView.is-Editing .deleteButton:hover {
				transform: rotate(0) scale(1.2);
				background: #f00;
				opacity: 1;
			}
			.TagListView.is-Editing .deleteButton:active {
				transform: rotate(360deg) scale(1.2);
				transition: none;
				background: #888;
			}
			.TagListView.is-Editing .is-Locked .deleteButton {
				visibility: hidden;
			}
			.TagListView .is-Removing .deleteButton {
				background: #666;
			}
			.tagItem .playlistAppend {
				display: inline-block;
				position: relative;
				left: auto;
				bottom: auto;
			}
			.TagListView .tagItem .playlistAppend {
				display: inline-block;
				font-size: 16px;
				line-height: 24px;
				width: 24px;
				height: 24px;
				bottom: 4px;
				background: #666;
				color: #ccc;
				text-decoration: none;
				border: 1px outset;
				cursor: pointer;
				text-align: center;
				user-select: none;
				visibility: hidden;
				margin-right: -2px;
			}
			.tagItem:hover .playlistAppend {
				visibility: visible;
			}
			.tagItem:hover .playlistAppend:hover {
				transform: scale(1.5);
			}
			.tagItem:hover .playlistAppend:active {
				transform: scale(1.4);
			}
			.tagItem.is-Removing {
				transform-origin: right !important;
				transform: translate(0, 150vh) !important;
				opacity: 0 !important;
				max-width: 0 !important;
				transition:
					transform 2s ease 0.2s,
					opacity 1.5s linear 0.2s,
					max-width 0.5s ease 1.5s
				!important;
				pointer-events: none;
				overflow: hidden !important;
				white-space: nowrap;
			}
			.is-Editing .playlistAppend {
				visibility: hidden !important;
			}
			.is-Editing .tagLink {
				pointer-events: none;
			}
			.is-Editing .dicIcon {
				display: none;
			}
			.tagItem:not(.is-Locked) {
				transition: transform 0.2s, text-shadow 0.2s;
			}
			.is-Editing .tagItem.is-Locked {
				position: relative;
				cursor: not-allowed;
			}
			.is-Editing .tagItem.is-Locked *{
				pointer-events: none;
			}
			.is-Editing .tagItem.is-Locked:hover:after {
				content: '${'\\01F6AB'} ロックタグ';
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				color: #ff9;
				white-space: nowrap;
				background: rgba(0, 0, 0, 0.6);
			}
			.is-Editing .tagItem:nth-child(11).is-Locked:hover:after {
				content: '${'\\01F6AB'} ロックマン';
			}
			.is-Editing .tagItem:not(.is-Locked) {
				text-shadow: 0 4px 4px rgba(0, 0, 0, 0.8);
			}
			.is-Editing .tagItem.is-Category * {
				color: #ff9;
			}
			.is-Editing .tagItem.is-Category.is-Locked:hover:after {
				content: '${'\\01F6AB'} カテゴリタグ';
			}
			.tagInputContainer {
				display: none;
				padding: 4px 8px;
				background: #666;
				z-index: 5000;
				box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.8);
				font-size: 16px;
			}
			:host-context(.videoTagsContainer.sideTab)     .tagInputContainer {
				position: absolute;
				background: #999;
			}
			.tagInputContainer .tagInputText {
				width: 200px;
				font-size: 20px;
			}
			.tagInputContainer .submit {
				font-size: 20px;
			}
			.is-Inputing .tagInputContainer {
				display: inline-block;
			}
			.is-Updating .tagInputContainer {
				pointer-events: none;
			}
				.tagInput {
					border: 1px solid;
				}
				.tagInput:active {
					box-shadow: 0 0 4px #fe9;
				}
				.submit, .cancel {
					background: #666;
					color: #ccc;
					cursor: pointer;
					border: 1px solid;
					text-align: center;
				}
			.TagListView .tagEditContainer {
				position: absolute;
				left: 0;
				top: 0;
				z-index: 1000;
				display: inline-block;
			}
			.TagListView.is-Empty .tagEditContainer {
				position: relative;
			}
			.TagListView:hover .tagEditContainer {
				display: inline-block;
			}
			.TagListView.is-Updating .tagEditContainer * {
				pointer-events: none;
			}
			.TagListView .tagEditContainer .button,
			.TagListView .videoTags .button {
				border-radius: 16px;
				font-size: 24px;
				line-height: 24px;
				margin: 0;
			}
			.TagListView.is-Editing .button.toggleEdit,
			.TagListView .button.toggleEdit:hover {
				background: #c66;
			}
			.TagListView .button.tagRefresh .icon {
				transform: translate(-50%, -50%) rotate(90deg);
				transition: transform 0.2s ease;
				font-family: STIXGeneral;
			}
			.TagListView .button.tagRefresh:active .icon {
				transform: translate(-50%, -50%) rotate(-330deg);
				transition: none;
			}
			.TagListView.is-Inputing .button.toggleInput {
				display: none;
			}
			.TagListView  .button.toggleInput:hover {
				background: #66c;
			}
			.tagEditContainer form {
				display: inline;
			}
		</style>
		<div class="root TagListView">
			<div class="tagEditContainer">
				<div
					class="button command toggleEdit"
					data-command="toggleEdit"
					data-tooltip="タグ編集">
					<span class="icon">&#9999;</span>
				</div>
				<div class="button command tagRefresh"
					data-command="refresh"
					data-tooltip="リロード">
					<span class="icon">&#8635;</span>
				</div>
			</div>
			<div class="videoTags">
				<span class="videoTagsInner"></span>
				<div class="tagInputContainer">
					<form action="javascript: void">
						<input type="text" name="tagText" class="tagInputText">
						<button class="submit button">O K</button>
					</form>
				</div>
			</div>
		</div>
	`).trim();
TagListView.__css__ = (`
		/* Firefox用 ShaowDOMサポートしたら不要 */
		.videoTagsContainer.sideTab .is-Updating {
			overflow: hidden;
		}
		.videoTagsContainer.sideTab a {
			color: #000 !important;
			text-decoration: none !important;
		}
		.videoTagsContainer.videoHeader a {
			color: #fff !important;
			text-decoration: none !important;
		}
		.videoTagsContainer.sideTab .tagInputContainer {
			position: absolute;
		}
	`).trim();
class TagItemMenu extends HTMLElement {
	static template({text}) {
		let host = location.host;
		return `
			<style>
				.root {
					display: inline-block;
					--icon-size: 16px;
					margin-right: 4px;
					outline: none;
				}
				.icon {
					position: relative;
					display: inline-block;
					vertical-align: middle;
					box-sizing: border-box;
					width: var(--icon-size);
					height: var(--icon-size);
					margin: 0;
					padding: 0;
					font-size: var(--icon-size);
					line-height: calc(var(--icon-size));
					text-align: center;
					cursor: pointer;
				}
				.nicodic, .toggle {
					background: #888;
					color: #ccc;
					box-shadow: 0.1em 0.1em 0 #333;
				}
				.has-nicodic .nicodic,.has-nicodic .toggle {
					background: #900;
				}
				.toggle::after {
					content: '？';
					position: absolute;
					width: var(--icon-size);
					left: 0;
					font-size: 0.8em;
					font-weight: bolder;
				}
				.menu {
					display: none;
					position: fixed;
					background-clip: content-box;
					border-style: solid;
					border-width: 16px 0 16px 0;
					border-color: transparent;
					padding: 0;
					z-index: 100;
					transform: translateY(-30px);
				}
				:host-context(.zenzaWatchVideoInfoPanelFoot) .menu {
					position: absolute;
					bottom: 0;
					transform: translateY(8x);
				}
				.root .menu:hover,
				.root:focus-within .menu {
					display: inline-block;
				}
				li {
					list-style-type: none;
					padding: 2px 8px 2px 20px;
					background: rgba(80, 80, 80, 0.95);
				}
				li a {
					display: inline-block;
					white-space: nowrap;
					text-decoration: none;
					color: #ccc;
				}
				li a:hover {
					text-decoration: underline;
				}
			</style>
			<div class="root" tabindex="-1">
				<div class="icon toggle"></div>
				<ul class="menu">
					<li>
						<a href="//dic.nicovideo.jp/a/${text}"
							${host !== 'dic.nicovideo.jp' ? 'target="_blank"' : ''}>
							大百科を見る
						</a>
					</li>
					<li>
						<a href="//ch.nicovideo.jp/search/${text}?type=video&mode=t"
							${host !== 'ch.nicovideo.jp' ? 'target="_blank"' : ''}>
							チャンネル検索
						</a>
					</li>
					<li>
						<a href="https://www.google.co.jp/search?q=${text}%20site:www.nicovideo.jp&num=100&tbm=vid"
							${host !== 'www.google.co.jp' ? 'target="_blank"' : ''}>
							Googleで検索
						</a>
					</li>
					<li>
						<a href="https://www.bing.com/videos/search?q=${text}%20site:www.nicovideo.jp&qft=+filterui:msite-nicovideo.jp"
							${host !== 'www.bing.com' ? 'target="_blank"' : ''}>Bingで検索
						</a>
					</li>
					<li>
						<a href="https://www.google.co.jp/search?q=${text}%20site:www.nicovideo.jp/series&num=100"
							${host !== 'www.google.co.jp' ? 'target="_blank"' : ''}>
							シリーズ検索
						</a>
					</li>
				</ul>
			</div>
		`;
	}
	constructor() {
		super();
		this.hasNicodic = parseInt(this.dataset.hasNicodic) !== 0;
		this.text = textUtil.escapeToZenkaku(this.dataset.text);
		const shadow = this._shadow = this.attachShadow({mode: 'open'});
		shadow.innerHTML = this.constructor.template({text: this.text});
		shadow.querySelector('.root').classList.toggle('has-nicodic', this.hasNicodic);
	}
}
if (window.customElements) {
	window.customElements.define('zenza-tag-item-menu', TagItemMenu);
}

class VideoInfoPanel extends Emitter {
	constructor(params) {
		super();
		this._videoHeaderPanel = new VideoHeaderPanel(params);
		this._dialog = params.dialog;
		this._config = Config;
		this._dialog.on('canplay', this._onVideoCanPlay.bind(this));
		this._dialog.on('videoCount', this._onVideoCountUpdate.bind(this));
		if (params.node) {
			this.appendTo(params.node);
		}
	}
	_initializeDom() {
		if (this._isInitialized) {
			return;
		}
		this._isInitialized = true;
		const $view = this._$view = uq.html(VideoInfoPanel.__tpl__);
		const view = this._view = $view[0];
		const $icon = this._$ownerIcon = $view.find('.ownerIcon');
		this._$ownerName = $view.find('.ownerName');
		this._$ownerPageLink = $view.find('.ownerPageLink');
		this._description = view.querySelector('.videoDescription');
		this._seriesList = view.querySelector('.seriesList');
		this._tagListView = new TagListView({
			parentNode: view.querySelector('.videoTagsContainer')
		});
		this._relatedInfoMenu = new RelatedInfoMenu({
			parentNode: view.querySelector('.relatedInfoMenuContainer')
		});
		this._videoMetaInfo = new VideoMetaInfo({
			parentNode: view.querySelector('.videoMetaInfoContainer')
		});
		this._uaaContainer = view.querySelector('.uaaContainer');
		this._uaaView = new UaaView(
			{parentNode: this._uaaContainer});
		this._ichibaContainer = view.querySelector('.ichibaContainer');
		this._ichibaItemView = new IchibaItemView(
			{parentNode: this._ichibaContainer});
		view.addEventListener('mousemove', e => e.stopPropagation());
		view.addEventListener('command', this._onCommandEvent.bind(this));
		view.addEventListener('click', this._onClick.bind(this));
		view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
		$icon.on('load', () => $icon.removeClass('is-loading'));
		view.classList.add(Fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
		global.emitter.on('fullscreenStatusChange', isFull => {
			view.classList.toggle('is-fullscreen', isFull);
			view.classList.toggle('is-notFullscreen', !isFull);
		});
		view.addEventListener('touchenter', () => view.classList.add('is-slideOpen'), {passive: true});
		global.emitter.on('hideHover', () => view.classList.remove('is-slideOpen'));
		css.registerProps(
			{name: '--base-description-color', syntax: '<color>', initialValue: '#888', inherits: true}
		);
		MylistPocketDetector.detect().then(pocket => {
			this._pocket = pocket;
			view.classList.add('is-pocketReady');
		});
		if (window.customElements) {
			VideoItemObserver.observe({container: this._description});
		}
	}
	update(videoInfo) {
		this._videoInfo = videoInfo;
		this._videoHeaderPanel.update(videoInfo);
		const owner = videoInfo.owner;
		this._$ownerIcon.attr('src', owner.icon);
		this._$ownerPageLink.attr('href', owner.url);
		this._$ownerName.text(owner.name);
		this._videoMetaInfo.update(videoInfo);
		this._tagListView.update({
			tagList: videoInfo.tagList,
			watchId: videoInfo.watchId,
			videoId: videoInfo.videoId,
			token: videoInfo.csrfToken,
			watchAuthKey: videoInfo.watchAuthKey
		});
		this._seriesList.textContent = '';
		if (videoInfo.series) {
			const label = document.createElement('zenza-video-series-label');
			Object.assign(label.dataset, videoInfo.series);
			this._seriesList.append(label);
		}
		this._updateVideoDescription(videoInfo.description, videoInfo.isChannel);
		this._$view
			.removeClass('userVideo channelVideo initializing')
			.toggleClass('is-community', this._videoInfo.isCommunityVideo)
			.toggleClass('is-mymemory', this._videoInfo.isMymemory)
			.addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo');
		this._ichibaItemView.clear();
		this._ichibaItemView.videoId = videoInfo.videoId;
		this._uaaView.clear();
		this._uaaView.update(videoInfo);
		this._relatedInfoMenu.update(videoInfo);
	}
	async _updateVideoDescription(html) {
		this._description.textContent = '';
		this._zenTubeUrl = null;
		const watchLink = watchLink => {
			let videoId = watchLink.textContent.replace('watch/', '');
			if (
				!/^(sm|nm|so|)[0-9]+$/.test(videoId) ||
				!['www.nicovideo.jp'].includes(watchLink.hostname) || !watchLink.pathname.startsWith('/watch/')) {
				return;
			}
			watchLink.classList.add('noHoverMenu');
			Object.assign(watchLink.dataset, {command: 'open', param: videoId});
			if (!window.customElements) {
				const $watchLink = uq(watchLink);
				const thumbnail = nicoUtil.getThumbnailUrlByVideoId(videoId);
				if (thumbnail) {
					const $img = uq('<img class="videoThumbnail">').attr('src', thumbnail);
					$watchLink.append($img);
				}
				const buttons = uq(`<zenza-playlist-append
					class="playlistAppend clickable-item" title="プレイリストで開く"
					data-command="playlistAppend" data-param="${videoId}"
				>▶</zenza-playlist-append><div
					class="deflistAdd" title="とりあえずマイリスト"
					data-command="deflistAdd" data-param="${videoId}"
				>&#x271A;</div
				><div class="pocket-info" title="動画情報"
					data-command="pocket-info" data-param="${videoId}"
				>？</div>`);
				$watchLink.append(buttons);
			} else {
				const vitem = document.createElement('zenza-video-item');
				vitem.dataset.videoId = videoId;
				watchLink.insertAdjacentElement('afterend', vitem);
				watchLink.classList.remove('watch');
			}
		};
		const seekTime = seek => {
			const [min, sec] = (seek.dataset.seektime || '0:0').split(':');
			Object.assign(seek.dataset, {command: 'seek', type: 'number', param: min * 60 + sec * 1});
		};
		const mylistLink = link => {
			link.classList.add('mylistLink');
			const mylistId = link.textContent.split('/')[1];
			const button = uq(`<zenza-mylist-link data-mylist-id="${mylistId}">
					${link.outerHTML}
					<zenza-playlist-append
						class="playlistSetMylist clickable-item" title="プレイリストで開く"
						data-command="playlistSetMylist" data-param="${mylistId}"
					>▶</zenza-playlist-append>
				</zenza-mylist-link>`)[0];
			link.replaceWith(button);
		};
		const youtube = link => {
			const btn = uq(`<zentube-button
				class="zenzaTubeButton"
				title="ZenzaWatchで開く(実験中)"
				accesskey="z"
				data-command="setVideo;"
				>▷Zen<span>Tube</span></zentube-button>`)[0];
			Object.assign(btn.dataset, {
				command: 'setVideo',
				param: link.href
			});
			link.parentNode.insertBefore(btn, link);
		};
		await sleep.promise();
		const $description = uq(`<zenza-video-description>${html}</zenza-video-description>`);
		for (const a of $description.query('a')) {
			a.classList.add('noHoverMenu');
			let href = a.href;
			if (a.classList.contains('watch')) {
				watchLink(a);
			} else if (a.classList.contains('seekTime')) {
				seekTime(a);
			} else if (/^mylist\//.test(a.textContent)) {
				mylistLink(a);
			} else if (/^https?:\/\/((www\.|)youtube\.com\/watch|youtu\.be)/.test(href)) {
				youtube(a);
			}
		}
		for (const e of
			$description.query('[style*="color: #000000;"],[style*="color: black;"]')
		) {
			e.dataset.originalCss = e.cssText;
			e.style.color = '#FFF';
		}
		for (const e of $description.query('span')) {
			e.classList.add('videoDescription-font');
		}
		this._description.append($description[0]);
	}
	_onVideoCanPlay(watchId, videoInfo, options) {
		if (!this._relatedVideoList) {
			this._relatedVideoList = new RelatedVideoList({
				container: this._$view.find('.relatedVideoContainer')[0]
			});
			this._relatedVideoList.on('command', this._onCommand.bind(this));
		}
		if (this._config.props.autoZenTube && this._zenTubeUrl && !options.isAutoZenTubeDisabled) {
			window.setTimeout(() => {
				window.console.info('%cAuto ZenTube', this._zenTubeUrl);
				this.emit('command', 'setVideo', this._zenTubeUrl);
			}, 100);
		}
		const relatedVideo = [VideoListItem.createByVideoInfoModel(videoInfo).serialize()];
		RecommendAPILoader.load({videoId: videoInfo.videoId}).then(data => {
			const items = data.items || [];
			(items || []).forEach(item => {
				if (item.contentType !== 'video') {
					return;
				}
				const content = item.content;
				relatedVideo.push({
					_format: 'recommendApi',
					_data: item,
					id: item.id,
					title: content.title,
					length_seconds: content.duration,
					num_res: content.count.comment,
					mylist_counter: content.count.mylist,
					view_counter: content.count.view,
					thumbnail_url: content.thumbnail.url,
					first_retrieve: content.registeredAt,
					has_data: true,
					is_translated: false
				});
			});
			this._relatedVideoList.update(relatedVideo, watchId);
		});
	}
	_onVideoCountUpdate(...args) {
		if (!this._videoHeaderPanel) {
			return;
		}
		this._videoMetaInfo.updateVideoCount(...args);
		this._videoHeaderPanel.updateVideoCount(...args);
	}
	_onClick(e) {
		e.stopPropagation();
		if (
			(e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey)) {
			return true;
		}
		const target = e.target.closest('[data-command]');
		if (!target) {
			global.emitter.emitAsync('hideHover'); // 手抜き
			return;
		}
		let {command, param, type} = target.dataset;
		if (param && (type === 'bool' || type === 'json')) {
			param = JSON.parse(param);
		}
		e.preventDefault();
		domEvent.dispatchCommand(e.target, command, param);
	}
	_onCommand(command, param) {
		switch (command) {
			default:
				domEvent.dispatchCommand(this._view, command, param);
				break;
		}
	}
	_onCommandEvent(e) {
		const {command, param} = e.detail;
		switch (command) {
			case 'pocket-info':
				this._pocket.external.info(param);
				break;
			case 'ownerVideo':
				domEvent.dispatchCommand(this._view, 'playlistSetUploadedVideo', this._videoInfo.owner.id);
				break;
			default:
				return;
		}
		e.stopPropagation();
	}
	appendTo(node) {
		this._initializeDom();
		this._$view.appendTo(node);
		this._videoHeaderPanel.appendTo(node);
	}
	hide() {
		this._videoHeaderPanel.hide();
	}
	close() {
		this._videoHeaderPanel.close();
	}
	clear() {
		this._videoHeaderPanel.clear();
		this._$view.addClass('initializing');
		this._$ownerIcon.addClass('is-loading');
		this._description.textContent = '';
	}
	selectTab(tabName) {
		const $view = this._$view;
		const $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
		this._activeTabName = tabName;
		$view.find('.activeTab').removeClass('activeTab');
		$target.addClass('activeTab');
	}
	blinkTab(tabName) {
		const $view = this._$view;
		const $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
		if (!$target.length) {
			return;
		}
		$target.addClass('blink');
		window.setTimeout(() => $target.removeClass('blink'), 50);
	}
	appendTab(tabName, title, content) {
		const $view = this._$view;
		const $select =
			uq('<div class="tabSelect"/>')
				.addClass(tabName)
				.attr('data-command', 'selectTab')
				.attr('data-param', tabName)
				.text(title);
		const $body = uq('<div class="tabs"/>').addClass(tabName);
		if (content) {
			$body.append(content);
		}
		$view.find('.tabSelectContainer').append($select);
		$view.append($body);
		if (this._activeTabName === tabName) {
			$select.addClass('activeTab');
			$body.addClass('activeTab');
		}
		return $body;
	}
}
css.addStyle(`
	.zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
		display: none;
		pointer-events: none;
		overflow: hidden;
	}
	.zenzaWatchVideoInfoPanel .tabs.activeTab {
		margin-top: 32px;
		box-sizing: border-box;
		position: relative;
		width: 100%;
		height: calc(100% - 32px);
		overflow-x: hidden;
		overflow-y: visible;
		overscroll-behavior: contain;
		text-align: left;
	}
	.zenzaWatchVideoInfoPanel .tabs.relatedVideoTab.activeTab {
		overflow: hidden;
	}
	.zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
		display: none !important;
		pointer-events: none;
		opacity: 0;
	}
	.zenzaWatchVideoInfoPanel .tabSelectContainer {
		position: absolute;
		display: flex;
		height: 32px;
		z-index: 100;
		width: 100%;
		white-space: nowrap;
		user-select: none;
	}
	.zenzaWatchVideoInfoPanel .tabSelect {
		flex: 1;
		box-sizing: border-box;
		display: inline-block;
		height: 32px;
		font-size: 12px;
		letter-spacing: 0;
		line-height: 32px;
		color: #666;
		background: #222;
		cursor: pointer;
		text-align: center;
		transition: text-shadow 0.2s ease, color 0.2s ease;
	}
	.zenzaWatchVideoInfoPanel .tabSelect.activeTab {
		font-size: 14px;
		letter-spacing: 0.1em;
		color: #ccc;
		background: #333;
	}
	.zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
		color: #fff;
		text-shadow: 0 0 4px #ff9;
		transition: none;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel.is-notFullscreen .tabSelect.blink:not(.activeTab) {
		color: #fff;
		text-shadow: 0 0 4px #006;
		transition: none;
	}
	.zenzaWatchVideoInfoPanel .tabSelect:not(.activeTab):hover {
		background: #888;
	}
	.zenzaWatchVideoInfoPanel.initializing {
	}
	.zenzaWatchVideoInfoPanel>* {
		transition: opacity 0.4s ease;
		pointer-events: none;
	}
	.is-mouseMoving .zenzaWatchVideoInfoPanel>*,
								.zenzaWatchVideoInfoPanel:hover>* {
		pointer-events: auto;
	}
	.zenzaWatchVideoInfoPanel.initializing>* {
		opacity: 0;
		color: #333;
		transition: none;
	}
	.zenzaWatchVideoInfoPanel {
		position: absolute;
		top: 0;
		width: 320px;
		height: 100%;
		box-sizing: border-box;
		z-index: ${CONSTANT.BASE_Z_INDEX + 25000};
		background: #333;
		color: #ccc;
		overflow-x: hidden;
		overflow-y: hidden;
		transition: opacity 0.4s ease;
	}
	.zenzaWatchVideoInfoPanel .ownerPageLink {
		display: block;
		margin: 0 auto 8px;
		width: 104px;
	}
	.zenzaWatchVideoInfoPanel .ownerIcon {
		width: 96px;
		height: 96px;
		border: none;
		border-radius: 4px;
		transition: opacity 1s ease;
		vertical-align: middle;
	}
	.zenzaWatchVideoInfoPanel .ownerIcon.is-loading {
		opacity: 0;
	}
	.zenzaWatchVideoInfoPanel .ownerName {
		font-size: 20px;
		word-break: break-all;
	}
	.zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
		padding: 16px;
		display: table;
		width: 100%;
	}
	.zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>*{
		display: block;
		vertical-align: middle;
		text-align: center;
	}
	.zenzaWatchVideoInfoPanel .videoDescription {
		padding: 8px 8px 8px;
		margin: 4px 0px;
		word-break: break-all;
		line-height: 1.5;
	}
	.zenzaWatchVideoInfoPanel .videoDescription a {
		display: inline-block;
		font-weight: bold;
		text-decoration: none;
		color: #ff9;
		padding: 2px;
	}
	.zenzaWatchVideoInfoPanel .videoDescription a:visited {
		color: #ffd;
	}
	.zenzaWatchVideoInfoPanel .videoDescription .watch {
		display: block;
		position: relative;
		line-height: 60px;
		box-sizing: border-box;
		padding: 4px 16px;;
		min-height: 60px;
		width: 272px;
		margin: 8px 10px;
		background: #444;
		border-radius: 4px;
	}
	.zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
		background: #446;
	}
	.videoDescription-font {
		text-shadow: 1px 1px var(--base-description-color, #888);
	}
	.zenzaWatchVideoInfoPanel .videoDescription .mylistLink {
		white-space: nowrap;
		display: inline-block;
	}
	.zenzaWatchVideoInfoPanel:not(.is-pocketReady) .pocket-info {
		display: none !important;
	}
	.pocket-info {
		font-family: Menlo;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
	.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist,
	.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo {
		display: inline-block;
		font-size: 16px;
		line-height: 20px;
		width: 24px;
		height: 24px;
		background: #666;
		color: #ccc !important;
		background: #666;
		text-decoration: none;
		border: 1px outset;
		cursor: pointer;
		text-align: center;
		user-select: none;
		margin-left: 8px;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
	.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
	.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
		display: none;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .owner:hover .playlistAppend,
	.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .playlistAppend,
	.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .pocket-info,
	.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .deflistAdd {
		display: inline-block;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend {
		position: absolute;
		bottom: 4px;
		left: 16px;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info {
		position: absolute;
		bottom: 4px;
		left: 48px;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
		position: absolute;
		bottom: 4px;
		left: 80px;
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:hover,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:hover,
	.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:hover,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:hover,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:hover {
		transform: scale(1.5);
	}
	.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:active,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:active,
	.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:active,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:active,
	.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:active {
		transform: scale(1.2);
		border: 1px inset;
	}
	.zenzaWatchVideoInfoPanel .videoDescription .watch .videoThumbnail {
		position: absolute;
		right: 16px;
		height: 60px;
		pointer-events: none;
	}
	.zenzaWatchVideoInfoPanel .videoDescription:hover .watch .videoThumbnail {
		filter: none;
	}
	.zenzaWatchVideoInfoPanel .publicStatus,
	.zenzaWatchVideoInfoPanel .videoTagsContainer {
		display: none;
	}
	.zenzaWatchVideoInfoPanel .publicStatus {
		display: none;
		position: relative;
		margin: 8px 0;
		padding: 8px;
		line-height: 150%;
		text-align; center;
		color: #333;
	}
	.zenzaWatchVideoInfoPanel .videoMetaInfoContainer {
		display: inline-block;
		padding: 0 8px;
	}
	.zenzaScreenMode_normal .is-backComment .zenzaWatchVideoInfoPanel,
	.zenzaScreenMode_big    .is-backComment .zenzaWatchVideoInfoPanel {
		opacity: 0.7;
	}
	.zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
		box-sizing: border-box;
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		user-select: none;
	}
	.zenzaWatchVideoInfoPanel .videoListFrame,
	.zenzaWatchVideoInfoPanel .commentListFrame {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		border: 0;
		background: #333;
	}
	.zenzaWatchVideoInfoPanel .nowLoading {
		display: none;
		opacity: 0;
		pointer-events: none;
	}
	.zenzaWatchVideoInfoPanel.initializing .nowLoading {
		display: block !important;
		opacity: 1 !important;
		color: #888;
	}
	.zenzaWatchVideoInfoPanel .nowLoading {
		position: absolute;
		top: 0; left: 0;
		width: 100%; height: 100%;
	}
	.zenzaWatchVideoInfoPanel .kurukuru {
		position: absolute;
		display: inline-block;
		font-size: 96px;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
	}
	@keyframes loadingRolling {
		0%   { transform: rotate(0deg); }
		100% { transform: rotate(1800deg); }
	}
	.zenzaWatchVideoInfoPanel.initializing .kurukuruInner {
		display: inline-block;
		pointer-events: none;
		text-align: center;
		text-shadow: 0 0 4px #888;
		animation-name: loadingRolling;
		animation-iteration-count: infinite;
		animation-duration: 4s;
	}
	.zenzaWatchVideoInfoPanel .nowLoading .loadingMessage {
		position: absolute;
		display: inline-block;
		font-family: Impact;
		font-size: 32px;
		text-align: center;
		top: calc(50% + 48px);
		left: 0;
		width: 100%;
	}
	${CONSTANT.SCROLLBAR_CSS}
	.zenzaWatchVideoInfoPanel .zenzaWatchVideoInfoPanelInner {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
		.zenzaWatchVideoInfoPanelContent {
			flex: 1;
		}
	.zenzaTubeButton {
		display: inline-block;
		padding: 4px 8px;
		cursor: pointer;
		background: #666;
		color: #ccc;
		border-radius: 4px;
		border: 1px outset;
		margin: 0 8px;
	}
	.zenzaTubeButton:hover {
		box-shadow: 0 0 8px #fff, 0 0 4px #ccc;
	}
		.zenzaTubeButton span {
			pointer-events: none;
			display: inline-block;
			background: #ccc;
			color: #333;
			border-radius: 4px;
		}
		.zenzaTubeButton:hover span {
			background: #f33;
			color: #ccc;
		}
	.zenzaTubeButton:active {
		box-shadow:  0 0 2px #ccc, 0 0 4px #000 inset;
		border: 1px inset;
	}
	.zenzaWatchVideoInfoPanel .relatedInfoMenuContainer {
		text-align: left;
	}
	.zenzaWatchVideoInfoPanel .seriesList {
		padding: 0 8px;
	}
	`, {className: 'videoInfoPanel'});
css.addStyle(`
	.is-open .zenzaWatchVideoInfoPanel>* {
		display: none;
		pointer-events: none;
	}
	.zenzaWatchVideoInfoPanel:hover>* {
		display: inherit;
		pointer-events: auto;
	}
	.zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
		display: flex;
	}
	.zenzaWatchVideoInfoPanel {
		top: 20%;
		right: calc(32px - 320px);
		left: auto;
		width: 320px;
		height: 60%;
		border: 1px solid transparent;
		background: none;
		opacity: 0;
		box-shadow: none;
		transition: opacity 0.4s ease, transform 0.4s ease 1s;
		will-change: opacity, transform;
	}
	.is-mouseMoving  .zenzaWatchVideoInfoPanel {
		border: 1px solid #888;
		opacity: 0.5;
	}
	.zenzaWatchVideoInfoPanel.is-slideOpen,
	.zenzaWatchVideoInfoPanel:hover {
		background: #333;
		box-shadow: 4px 4px 4px #000;
		border: none;
		opacity: 0.9;
		transform: translate3d(-288px, 0, 0);
		transition: opacity 0.4s ease, transform 0.4s ease 1s;
	}
`, {className: 'screenMode for-full videoInfoPanel'});
css.addStyle(`
	.zenzaScreenMode_small .zenzaWatchVideoInfoPanel {
		display: none;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
		width: calc(100% - 16px);
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect {
		background: #ccc;
		color: #888;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.activeTab {
		background: #ddd;
		color: black;
		border: none;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
		top: 230px;
		left: 0;
		width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
		height: calc(100vh - 296px);
		bottom: 48px;
		padding: 8px;
		box-shadow: none;
		background: #f0f0f0;
		color: #000;
		border: 1px solid #333;
		margin: 4px 2px;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .publicStatus {
		display: block;
		text-align: center;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a {
		color: #006699;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a:visited {
		color: #666666;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
		display: block;
		bottom: 48px;
		width: 364px;
		margin: 0 auto;
		padding: 8px;
		background: #ccc;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
		background: #ddd;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
		background: #ddf;
	}
	.zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar {
		background: #f0f0f0;
	}
	.zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar-thumb {
		border-radius: 0;
		background: #ccc;
	}
`, {className: 'screenMode for-popup videoInfoPanel'});
uq.ready().then(() => {
	if (document.body.classList.contains('MatrixRanking-body')) {
		css.addStyle(`
			body.zenzaScreenMode_sideView.MatrixRanking-body .RankingRowRank {
				line-height: 48px;
				height: 48px;
				pointer-events: none;
				user-select: none;
			}
			body.zenzaScreenMode_sideView.MatrixRanking-body .RankingRowRank {
				position: sticky;
				left: calc(var(--sideView-left-margin) - 8px);
				z-index: 100;
				transform: none;
				padding-right: 16px;
				width: 64px;
				overflow: visible;
				text-align: right;
				mix-blend-mode: difference;
				text-shadow:
					1px  1px 0 #fff,
					1px -1px 0 #fff,
					-1px  1px 0 #fff,
					-1px -1px 0 #fff;
			}
			body.zenzaScreenMode_sideView.MatrixRanking-body .BaseLayout-block {
				width: ${1024 + 64 * 2}px;
			}
			.RankingMainContainer-decorateChunk+.RankingMainContainer-decorateChunk,
			.RankingMainContainer-decorateChunk>*+* {
				margin-top: 0;
			}
			body.zenzaScreenMode_sideView .RankingMainContainer {
				width: ${1024}px;
			}
			body.zenzaScreenMode_sideView.MatrixRanking-body .RankingMatrixVideosRow {
				width: ${1024 + 64}px;
				margin-left: ${-64}px;
			}
				.RankingGenreListContainer-categoryHelp {
					position: static;
				}
				.RankingMatrixNicoadsRow>*+*,
				.RankingMatrixVideosRow>:nth-child(n+3) {
					margin-left: 13px;
				}
				.RankingBaseItem {
					width: 160px;
					height: 196px;
				}
					body.zenzaScreenMode_sideView .RankingBaseItem .Card-link {
						grid-template-rows: 90px auto;
					}
					.VideoItem.RankingBaseItem .VideoThumbnail {
						border-radius: 3px 3px 0 0;
					}
					[data-nicoad-grade] .Thumbnail.VideoThumbnail .Thumbnail-image {
						margin: 3px;
						background-size: calc(100% + 6px);
					}
					[data-nicoad-grade] .Thumbnail.VideoThumbnail:after {
						width: 40px;
						height: 40px;
						background-size: 80px 80px;
					}
					.Thumbnail.VideoThumbnail .VideoLength {
						bottom: 3px;
						right: 3px;
					}
					.VideoThumbnailComment {
						transform: scale(0.8333);
					}
					.RankingBaseItem-meta {
						position: static;
						padding: 0 4px 8px;
					}
					.VideoItem.RankingBaseItem .VideoItem-metaCount>.VideoMetaCount {
						white-space: nowrap;
					}
			.RankingMainContainer .ToTopButton {
				transform: translateX(calc(100vw / 2 - 100% - 36px));
				user-select: none;
			}
		`, {className: 'screenMode for-sideView MatrixRanking', disabled: true});
		}
});
css.addStyle(`
	.is-open .zenzaWatchVideoInfoPanel {
		display: none;
		left: calc(100%);
		top: 0;
	}
	@media screen {
		@media (min-width: 992px) {
			.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
				display: inherit;
			}
		}
		@media (min-width: 1216px) {
			.zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
				display: inherit;
			}
		}
		/* 縦長モニター */
		@media
			(max-width: 991px) and (min-height: 700px)
		{
			.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
				display: inherit;
				top: 100%;
				left: 0;
				width: 100%;
				height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
				z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
			}
			.zenzaScreenMode_normal .ZenzaIchibaItemView {
				margin: 8px 8px 96px;
			}
			.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
				display: table;
			}
			.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
				display: table-cell;
				text-align: left;
			}
			.zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel {
				width: 100% !important;
			}
		}
		@media
			(max-width: 1215px) and (min-height: 700px) {
			.zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
				display: inherit;
				top: 100%;
				left: 0;
				width: 100%;
				height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
				z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
			}
			.zenzaScreenMode_big .ZenzaIchibaItemView {
				margin: 8px 8px 96px;
			}
			.zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
				display: table;
			}
			.zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
				display: table-cell;
				text-align: left;
			}
			.zenzaScreenMode_big .zenzaWatchVideoHeaderPanel {
				width: 100% !important;
			}
		}
	}
`, {className: 'screenMode for-dialog videoInfoPanel'});
css.addStyle(`
	.zenzaWatchVideoInfoPanel .comment {
		padding-left: 0;
	}
`, {className: 'domain slack-com', disabled: true});
VideoInfoPanel.__tpl__ = (`
		<div class="zenzaWatchVideoInfoPanel show initializing">
			<div class="nowLoading">
				<div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
				<div class="loadingMessage">Loading...</div>
			</div>
			<div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-command="selectTab" data-param="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-command="selectTab" data-param="relatedVideoTab">関連動画</div></div>
			<div class="tabs videoInfoTab activeTab">
				<div class="zenzaWatchVideoInfoPanelInner">
					<div class="zenzaWatchVideoInfoPanelContent">
						<div class="videoOwnerInfoContainer">
							<a class="ownerPageLink" rel="noopener" target="_blank">
								<img class="ownerIcon loading"/>
							</a>
							<span class="owner">
								<span class="ownerName"></span>
								<zenza-playlist-append class="playlistSetUploadedVideo userVideo"
									data-command="ownerVideo"
									title="投稿動画一覧をプレイリストで開く">▶</zenza-playlist-append>
							</span>
						</div>
						<div class="publicStatus">
							<div class="videoMetaInfoContainer"></div>
							<div class="relatedInfoMenuContainer"></div>
						</div>
						<div class="seriesList"></div>
						<div class="videoDescription"></div>
					</div>
					<div class="zenzaWatchVideoInfoPanelFoot">
						<div class="uaaContainer"></div>
						<div class="ichibaContainer"></div>
						<div class="videoTagsContainer sideTab"></div>
					</div>
				</div>
			</div>
			<div class="tabs relatedVideoTab">
				<div class="relatedVideoContainer"></div>
			</div>
		</div>
	`).trim();
class VideoHeaderPanel extends Emitter {
	constructor(params) {
		super();
	}
	_initializeDom() {
		if (this._isInitialized) {
			return;
		}
		this._isInitialized = true;
		css.addStyle(VideoHeaderPanel.__css__);
		const $view = this._$view = uq.html(VideoHeaderPanel.__tpl__);
		const view = $view[0];
		this._videoTitle = $view.find('.videoTitle')[0];
		this._searchForm = new VideoSearchForm({
			parentNode: view
		});
		$view.on('wheel', e => e.stopPropagation(), {passive: true});
		this._seriesCover = view.querySelector('.series-thumbnail');
		this._tagListView = new TagListView({
			parentNode: view.querySelector('.videoTagsContainer')
		});
		this._relatedInfoMenu = new RelatedInfoMenu({
			parentNode: view.querySelector('.relatedInfoMenuContainer'),
			isHeader: true
		});
		this._relatedInfoMenu.on('open', () => $view.addClass('is-relatedMenuOpen'));
		this._relatedInfoMenu.on('close', () => $view.removeClass('is-relatedMenuOpen'));
		this._videoMetaInfo = new VideoMetaInfo({
			parentNode: view.querySelector('.videoMetaInfoContainer'),
		});
		view.classList.add(Fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
		global.emitter.on('fullScreenStatusChange', isFull => {
			view.classList.toggle('is-fullscreen', isFull);
			view.classList.toggle('is-notFullscreen', !isFull);
		});
		window.addEventListener('resize', _.debounce(this._onResize.bind(this), 500));
	}
	update(videoInfo) {
		this._videoInfo = videoInfo;
		this._videoTitle.title =  this._videoTitle.textContent = videoInfo.title;
		const watchId = videoInfo.watchId;
		this._videoMetaInfo.update(videoInfo);
		this._tagListView.update({
			tagList: videoInfo.tagList,
			watchId,
			videoId: videoInfo.videoId,
			token: videoInfo.csrfToken,
			watchAuthKey: videoInfo.watchAuthKey
		});
		this._relatedInfoMenu.update(videoInfo);
		this._$view
			.removeClass('userVideo channelVideo initializing')
			.toggleClass('is-community', this._videoInfo.isCommunityVideo)
			.toggleClass('is-mymemory', this._videoInfo.isMymemory)
			.toggleClass('has-Parent', this._videoInfo.hasParentVideo)
			.addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo')
			.css('display', '');
		if (videoInfo.series && videoInfo.series.thumbnailUrl) {
			this._seriesCover.style.backgroundImage = `url("${videoInfo.series.thumbnailUrl}")`;
		} else {
			this._seriesCover.removeAttribute('style');
		}
		window.setTimeout(() => this._onResize(), 1000);
	}
	updateVideoCount(...args) {
		this._videoMetaInfo.updateVideoCount(...args);
	}
	_onResize() {
		const view = this._$view[0];
		const rect = view.getBoundingClientRect();
		const isOnscreen = view.classList.contains('is-onscreen');
		const height = rect.bottom - rect.top;
		const top = isOnscreen ? (rect.top - height) : rect.top;
		view.classList.toggle('is-onscreen', top < -32);
	}
	appendTo(node) {
		this._initializeDom();
		this._$view.appendTo(node);
	}
	hide() {
		if (!this._$view) {
			return;
		}
		this._$view.removeClass('show');
	}
	close() {
	}
	clear() {
		if (!this._$view) {
			return;
		}
		this._$view.addClass('initializing');
		this._videoTitle.textContent = '';
	}
	getPublicStatusDom() {
		return this._$view.find('.publicStatus').html();
	}
}
css.addStyle(`
	.zenzaScreenMode_small .zenzaWatchVideoHeaderPanel {
		display: none;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
		top: 0;
		left: 400px;
		width: calc(100vw - 400px);
		bottom: auto;
		background: #272727;
		opacity: 0.9;
		height: 40px;
	}
	/* ヘッダ追従 */
	body.zenzaScreenMode_sideView:not(.nofix)  .zenzaWatchVideoHeaderPanel {
		top: 0;
	}
	/* ヘッダ固定 */
	.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTitleContainer {
		margin: 0;
	}
	.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .publicStatus,
	.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTagsContainer {
		display: none;
	}
	@media screen and (min-width: 1432px)
	{
		.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
			width: calc(100% - 16px);
		}
		.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
			top: calc((100vw - 1024px) * 9 / 16 + 4px);
			width: calc(100vw - 1024px);
			height: calc(100vh - (100vw - 1024px) * 9 / 16 - 70px);
		}
		.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
			width: calc(100vw - 1024px - 26px);
		}
		.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
			width: calc(100vw - (100vw - 1024px));
			left:  calc(100vw - 1024px);
		}
	}
`, {className: 'screenMode for-popup videoHeaderPanel', disabled: true});
css.addStyle(`
	body .is-open .zenzaWatchVideoHeaderPanel {
		width: calc(100% + ${CONSTANT.RIGHT_PANEL_WIDTH}px);
	}
		.zenzaWatchVideoHeaderPanel.is-onscreen {
			top: 0px;
			bottom: auto;
			background: rgba(0, 0, 0, 0.5);
			opacity: 0;
			box-shadow: none;
		}
		.is-loading .zenzaWatchVideoHeaderPanel.is-onscreen {
			opacity: 0.6;
			transition: 0.4s opacity;
		}
		.zenzaWatchVideoHeaderPanel.is-onscreen:hover {
			opacity: 1;
			transition: 0.5s opacity;
		}
		.zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer {
			display: none;
			width: calc(100% - 240px);
		}
		.zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer {
			display: block;
		}
		.zenzaWatchVideoHeaderPanel.is-onscreen .videoTitleContainer {
			width: calc(100% - 180px);
		}
		.zenzaWatchVideoInfoPanelFoot {
			background: #222;
		}
`, {className: 'screenMode for-dialog videoHeaderPanel', disabled: true});
css.addStyle(`
	.is-open .zenzaWatchVideoHeaderPanel {
		position: absolute; /* fixedだとFirefoxのバグでおかしくなる */
		top: 0px;
		bottom: auto;
		background: rgba(0, 0, 0, 0.5);
		opacity: 0;
		box-shadow: none;
	}
	.is-loading .zenzaWatchVideoHeaderPanel,
	.is-mouseMoving .zenzaWatchVideoHeaderPanel {
		opacity: 0.6;
		transition: 0.4s opacity;
	}
	.is-open .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
	.is-open .zenzaWatchVideoHeaderPanel:hover {
		opacity: 1;
		transition: 0.5s opacity;
	}
	.is-open .videoTagsContainer {
		display: none;
		width: calc(100% - 240px);
	}
	.is-open .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
		display: block;
	}
	.is-open .zenzaWatchVideoHeaderPanel .videoTitleContainer {
		width: calc(100% - 180px);
	}
`, {className: 'screenMode for-full videoHeaderPanel', disabled: true});
VideoHeaderPanel.__css__ = (`
		.zenzaWatchVideoHeaderPanel {
			position: absolute;
			width: calc(100%);
			z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
			box-sizing: border-box;
			padding: 8px 8px 0;
			bottom: calc(100% + 8px);
			left: 0;
			background: #333;
			color: #ccc;
			text-align: left;
			box-shadow: 4px 4px 4px #000;
			transition: opacity 0.4s ease;
			will-change: transform;
		}
		.zenzaWatchVideoHeaderPanel.is-onscreen {
			width: 100% !important;
		}
		.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel,
		.zenzaWatchVideoHeaderPanel.is-fullscreen {
			z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
		}
		.zenzaWatchVideoHeaderPanel {
			pointer-events: none;
		}
		.is-mouseMoving .zenzaWatchVideoHeaderPanel,
										.zenzaWatchVideoHeaderPanel:hover {
			pointer-events: auto;
		}
		.zenzaWatchVideoHeaderPanel.initializing {
			display: none;
		}
		.zenzaWatchVideoHeaderPanel.initializing>*{
			opacity: 0;
		}
		.zenzaWatchVideoHeaderPanel .videoTitleContainer {
			margin: 8px;
		}
		.zenzaWatchVideoHeaderPanel .publicStatus {
			position: relative;
			color: #ccc;
		}
		.zenzaWatchVideoHeaderPanel .videoTitle {
			font-size: 24px;
			color: #fff;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow: hidden;
			display: block;
			padding: 2px 0;
		}
		.zenzaWatchVideoHeaderPanel .videoTitle::before {
			display: none;
			position: absolute;
			font-size: 12px;
			top: 0;
			left: 0;
			background: #333;
			border: 1px solid #888;
			padding: 2px 4px;
			pointer-events: none;
		}
		.zenzaWatchVideoHeaderPanel.is-mymemory:not(:hover) .videoTitle::before {
			content: 'マイメモリー';
			display: inline-block;
		}
		.zenzaWatchVideoHeaderPanel.is-community:not(:hover) .videoTitle::before {
			content: 'コミュニティ動画';
			display: inline-block;
		}
		.videoMetaInfoContainer {
			display: inline-block;
		}
		.zenzaScreenMode_normal .is-backComment .zenzaWatchVideoHeaderPanel,
		.zenzaScreenMode_big    .is-backComment .zenzaWatchVideoHeaderPanel {
			opacity: 0.7;
		}
		.zenzaWatchVideoHeaderPanel .relatedInfoMenuContainer {
			display: inline-block;
			position: absolute;
			top: 0;
			margin: 0 16px;
			z-index: 1000;
		}
		.zenzaWatchVideoHeaderPanel:focus-within,
		.zenzaWatchVideoHeaderPanel.is-relatedMenuOpen {
			z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
		}
		.zenzaWatchVideoHeaderPanel .series-thumbnail-cover {
			position: absolute;
			top: 0px;
			right: 0px;
			width: 50%;
			height: 100%;
			display: inline-block;
			overflow: hidden;
			contain: strict;
			pointer-events: none;
			user-select: none;
		}
		.zenzaWatchVideoHeaderPanel .series-thumbnail[style] {
			width: 100%;
			height: 100%;
			box-sizing: border-box;
			/*filter: sepia(50%) blur(4px);*/
			background-size: cover;
			background-position: center center;
			background-repeat: no-repeat;
			will-change: transform;
			-webkit-mask-image:
				linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%);
			mask-image:
				linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%);
		}
	`);
VideoHeaderPanel.__tpl__ = (`
		<div class="zenzaWatchVideoHeaderPanel show initializing" style="display: none;">
			<h2 class="videoTitleContainer">
				<span class="videoTitle"></span>
			</h2>
			<p class="publicStatus">
				<span class="videoMetaInfoContainer"></span>
				<span class="relatedInfoMenuContainer"></span>
			</p>
			<div class="videoTagsContainer videoHeader">
			</div>
			<div class="series-thumbnail-cover"><div class="series-thumbnail"></div></div>
		</div>
	`).trim();
class VideoSearchForm extends Emitter {
	constructor(...args) {
		super();
		this._config = Config.namespace('videoSearch');
		this._initDom(...args);
	}
	_initDom({parentNode}) {
		let tpl = document.getElementById('zenzaVideoSearchPanelTemplate');
		if (!tpl) {
			css.addStyle(VideoSearchForm.__css__);
			tpl = document.createElement('template');
			tpl.innerHTML = VideoSearchForm.__tpl__;
			tpl.id = 'zenzaVideoSearchPanelTemplate';
			document.body.appendChild(tpl);
		}
		const view = document.importNode(tpl.content, true);
		this._view = view.querySelector('*');
		this._form = view.querySelector('form');
		this._word = view.querySelector('.searchWordInput');
		this._sort = view.querySelector('.searchSortSelect');
		this._mode = view.querySelector('.searchMode') || 'tag';
		this._form.addEventListener('submit', this._onSubmit.bind(this));
		const config = this._config;
		const form = this._form;
		form['ownerOnly'].checked = config.props.ownerOnly;
		let confMode = config.props.mode;
		if (typeof confMode === 'string' && ['tag', 'keyword'].includes(confMode)) {
			form['mode'].value = confMode;
		} else if (typeof confMode === 'boolean') {
			form['mode'].value = confMode ? 'tag' : 'keyword';
		} else {
			form['mode'].value = 'tag';
		}
		form['word'].value = config.props.word;
		form['sort'].value = config.props.sort;
		this._view.addEventListener('click', this._onClick.bind(this));
		view.addEventListener('paste', e => e.stopPropagation());
		const submit = _.debounce(this.submit.bind(this), 500);
		Array.from(view.querySelectorAll('input, select')).forEach(item => {
			if (item.type === 'checkbox') {
				item.addEventListener('change', () => {
					this._word.focus();
					config.props[item.name] = item.checked;
					submit();
				});
			} else if (item.type === 'radio') {
				item.addEventListener('change', () => {
					this._word.focus();
					config.props[item.name] = this._form[item.name].value;
					submit();
				});
			} else {
				item.addEventListener('change', () => {
					config.props[item.name] = item.value;
					if (item.tagName === 'SELECT') {
						submit();
					}
				});
			}
		});
		global.emitter.on('searchVideo', ({word}) => {
			form['word'].value = word;
		});
		if (parentNode) {
			parentNode.appendChild(view);
		}
		global.debug.searchForm = this;
	}
	_onClick(e) {
		e.stopPropagation();
		const tagName = (e.target.tagName || '').toLowerCase();
		const target = e.target.closest('.command');
		if (!['input', 'select'].includes(tagName)) {
			this._word.focus();
		}
		if (!target) {
			return;
		}
		const command = target.dataset.command;
		if (!command) {
			return;
		}
		e.preventDefault();
		const type = target.getAttribute('data-type') || 'string';
		let param = target.getAttribute('data-param');
		if (type !== 'string') { param = JSON.parse(param); }
		switch (command) {
			case 'clear':
				this._word.value = '';
				break;
			default:
				domEvent.dispatchCommand(e.target, command, param);
		}
	}
	_onSubmit(e) {
		this.submit();
		e.stopPropagation();
	}
	submit() {
		const word = this.word;
		if (!word) {
			return;
		}
		domEvent.dispatchCommand(this._view, 'playlistSetSearchVideo', {
			word,
			option: {
				searchType: this.searchType,
				sort: this.sort,
				order: this.order,
				owner: this.isOwnerOnly,
				playlistSort: this.isPlaylistSort
			}
		});
	}
	_hasFocus() {
		return !!document.activeElement.closest('#zenzaVideoSearchPanel');
	}
	_updateFocus() {
	}
	get word() {
		return (this._word.value || '').trim();
	}
	get searchType() {
		return this._form.mode.value;
	}
	get sort() {
		const sortTmp = (this._sort.value || '').split(',');
		const playlistSort = sortTmp[0] === 'playlist';
		return playlistSort ? 'f' : sortTmp[0];
	}
	get order() {
		const sortTmp = (this._sort.value || '').split(',');
		return sortTmp[1] || 'd';
	}
	get isPlaylistSort() {
		const sortTmp = (this._sort.value || '').split(',');
		return sortTmp[0] === 'playlist';
	}
	get isOwnerOnly() {
		return this._form['ownerOnly'].checked;
	}
}
css.addStyle(`
	.is-open .zenzaWatchVideoHeaderPanel .zenzaVideoSearchPanel {
		top: 120px;
		right: 32px;
	}
`, {className: 'screenMode for-popup videoSearchPanel', disabled: true});
VideoSearchForm.__css__ = (`
		.zenzaVideoSearchPanel {
			pointer-events: auto;
			position: absolute;
			top: 32px;
			right: 8px;
			padding: 0 8px
			width: 248px;
			z-index: 1000;
		}
		.zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
		.zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
		.zenzaScreenMode_3D    .zenzaVideoSearchPanel,
		.zenzaScreenMode_wide  .zenzaVideoSearchPanel,
		.zenzaWatchVideoHeaderPanel.is-fullscreen .zenzaVideoSearchPanel {
			top: 64px;
		}
		.zenzaVideoSearchPanel:focus-within {
			background: rgba(50, 50, 50, 0.8);
		}
		.zenzaVideoSearchPanel:not(:focus-within) .focusOnly {
			display: none;
		}
		.zenzaVideoSearchPanel .searchInputHead {
			position: absolute;
			opacity: 0;
			pointer-events: none;
			padding: 4px;
			transition: transform 0.2s ease, opacity 0.2s ease;
		}
		.zenzaVideoSearchPanel .searchInputHead:hover,
		.zenzaVideoSearchPanel:focus-within .searchInputHead {
			background: rgba(50, 50, 50, 0.8);
		}
		.zenzaVideoSearchPanel           .searchInputHead:hover,
		.zenzaVideoSearchPanel:focus-within .searchInputHead {
			pointer-events: auto;
			opacity: 1;
			transform: translate3d(0, -100%, 0);
		}
			.zenzaVideoSearchPanel .searchMode {
				position: absolute;
				opacity: 0;
			}
			.zenzaVideoSearchPanel .searchModeLabel {
				cursor: pointer;
			}
		.zenzaVideoSearchPanel .searchModeLabel span {
				display: inline-block;
				padding: 4px 8px;
				color: #666;
				cursor: pointer;
				border-radius: 8px;
				border-color: transparent;
				border-style: solid;
				border-width: 1px;
				pointer-events: none;
			}
			.zenzaVideoSearchPanel .searchModeLabel:hover span {
				background: #888;
			}
			.zenzaVideoSearchPanel .searchModeLabel input:checked + span {
				color: #ccc;
				border-color: currentColor;
				cursor: default;
			}
		.zenzaVideoSearchPanel .searchWord {
			white-space: nowrap;
			padding: 4px;
		}
			.zenzaVideoSearchPanel .searchWordInput {
				width: 200px;
				margin: 0;
				height: 24px;
				line-height: 24px;
				background: transparent;
				font-size: 16px;
				padding: 0 4px;
				color: #ccc;
				border: 1px solid #ccc;
				opacity: 0;
				transition: opacity 0.2s ease;
				will-change: opacity;
			}
			.zenzaVideoSearchPanel .searchWordInput:-webkit-autofill {
				background: transparent;
			}
			.is-mouseMoving .searchWordInput {
				opacity: 0.5;
			}
			.is-mouseMoving .searchWordInput:hover {
				opacity: 0.8;
			}
			.zenzaVideoSearchPanel:focus-within .searchWordInput {
				opacity: 1 !important;
			}
			.zenzaVideoSearchPanel .searchSubmit {
				width: 34px;
				margin: 0;
				padding: 0;
				font-size: 14px;
				line-height: 24px;
				height: 24px;
				border: solid 1px #ccc;
				cursor: pointer;
				background: #888;
				pointer-events: none;
				opacity: 0;
				transform: translate3d(-100%, 0, 0);
				transition: opacity 0.2s ease, transform 0.2s ease;
			}
			.zenzaVideoSearchPanel:focus-within .searchSubmit {
				pointer-events: auto;
				opacity: 1;
				transform: translate3d(0, 0, 0);
			}
			.zenzaVideoSearchPanel:focus-within .searchSubmit:hover {
				transform: scale(1.5);
			}
			.zenzaVideoSearchPanel:focus-within .searchSubmit:active {
				transform: scale(1.2);
				border-style: inset;
			}
			.zenzaVideoSearchPanel .searchClear {
				display: inline-block;
				width: 28px;
				margin: 0;
				padding: 0;
				font-size: 16px;
				line-height: 24px;
				height: 24px;
				border: none;
				cursor: pointer;
				color: #ccc;
				background: transparent;
				pointer-events: none;
				opacity: 0;
				transform: translate3d(100%, 0, 0);
				transition: opacity 0.2s ease, transform 0.2s ease;
			}
			.zenzaVideoSearchPanel:focus-within .searchClear {
				pointer-events: auto;
				opacity: 1;
				transform: translate3d(0, 0, 0);
			}
			.zenzaVideoSearchPanel:focus-within .searchClear:hover {
				transform: scale(1.5);
			}
			.zenzaVideoSearchPanel:focus-within .searchClear:active {
				transform: scale(1.2);
			}
		.zenzaVideoSearchPanel .searchInputFoot {
			white-space: nowrap;
			position: absolute;
			padding: 4px 0;
			opacity: 0;
			padding: 4px;
			pointer-events: none;
			transition: transform 0.2s ease, opacity 0.2s ease;
			transform: translate3d(0, -100%, 0);
		}
		.zenzaVideoSearchPanel .searchInputFoot:hover,
		.zenzaVideoSearchPanel:focus-within .searchInputFoot {
			pointer-events: auto;
			opacity: 1;
			background: rgba(50, 50, 50, 0.8);
			transform: translate3d(0, 0, 0);
		}
			.zenzaVideoSearchPanel .searchSortSelect,
			.zenzaVideoSearchPanel .searchSortSelect option{
				background: #333;
				color: #ccc;
			}
			.zenzaVideoSearchPanel .autoPauseLabel {
				cursor: pointer;
			}
			.zenzaVideoSearchPanel .autoPauseLabel input + span {
				display: inline-block;
				pointer-events: none;
			}
	`).trim();
VideoSearchForm.__tpl__ = (`
		<div class="zenzaVideoSearchPanel" id="zenzaVideoSearchPanel">
			<form action="javascript: void(0);">
				<div class="searchInputHead">
					<label class="searchModeLabel">
						<input type="radio" name="mode" class="searchMode" value="keyword">
						<span>キーワード</span>
					</label>
					<label class="searchModeLabel">
						<input type="radio" name="mode" class="searchMode" value="tag"
							id="zenzaVideoSearch-tag" checked="checked">
							<span>タグ</span>
					</label>
				</div>
				<div class="searchWord">
					<button class="searchClear command"
						type="button"
						data-command="clear"
						title="クリア">&#x2716;</button>
					<input
						type="text"
						value=""
						autocomplete="on"
						name="word"
						accesskey="e"
						placeholder="簡易検索(テスト中)"
						class="searchWordInput"
						maxlength="75"
						>
					<input
						type="submit"
						value="▶"
						name="post"
						class="searchSubmit"
						>
				</div>
				<div class="searchInputFoot focusOnly">
					<select name="sort" class="searchSortSelect">
						<option value="playlist">自動(連続再生用)</option>
						<option value="f">新しい順</option>
						<option value="h">人気順</option>
						<option value="n">最新コメント</option>
						<option value="r">コメント数</option>
						<option value="m">マイリスト数</option>
						<option value="l">長い順</option>
						<option value="l,a">短い順</option>
					</select>
					<label class="autoPauseLabel">
						<input type="checkbox" name="ownerOnly" checked="checked">
						<span>投稿者の動画のみ</span>
					</label>
				</div>
			</form>
		</div>
	`).toString();
class IchibaItemView extends BaseViewComponent {
	constructor({parentNode}) {
		super({
			parentNode,
			name: 'IchibaItemView',
			template: IchibaItemView.__tpl__,
			css: IchibaItemView.__css__,
		});
		ZenzaWatch.debug.ichiba = this;
	}
	_initDom(...args) {
		super._initDom(...args);
		this._listContainer =
			this._view.querySelector('.ichibaItemListContainer .ichibaItemListInner');
		this._listContainerDetails =
			this._view.querySelector('.ichibaItemListContainer .ichibaItemListDetails');
	}
	_onCommand(command, param) {
		switch (command) {
			case 'load':
				this.load(this._videoId);
				break;
			default:
				super._onCommand(command, param);
		}
	}
	load(videoId) {
		if (this._isLoading) {
			return;
		}
		videoId = videoId || this._videoId;
		this._isLoading = true;
		this.addClass('is-loading');
		return IchibaLoader.load(videoId)
			.then(this._onIchibaLoad.bind(this))
			.catch(this._onIchibaLoadFail.bind(this));
	}
	clear() {
		this.removeClass('is-loading');
		this.removeClass('is-success');
		this.removeClass('is-fail');
		this.removeClass('is-empty');
		this._listContainer.innerHTML = '';
	}
	_onIchibaLoad(data) {
		this.removeClass('is-loading');
		const div = document.createElement('div');
		div.innerHTML = data.main;
		Array.from(div.querySelectorAll('[id]')).forEach(elm => {
			elm.classList.add(`ichiba-${elm.id}`);
			elm.removeAttribute('id');
		});
		Array.from(div.querySelectorAll('[style]'))
			.forEach(elm => elm.removeAttribute('style'));
		const items = div.querySelectorAll('.ichiba_mainitem');
		if (!items || items.length < 1) {
			this.addClass('is-empty');
			this._listContainer.innerHTML = '<h2>貼られている商品はありません</h2>';
		} else {
			this._listContainer.innerHTML = div.innerHTML;
		}
		this.addClass('is-success');
		this._listContainerDetails.setAttribute('open', 'open');
		this._isLoading = false;
	}
	_onIchibaLoadFail() {
		this.removeClass('is-loading');
		this.addClass('is-fail');
		this._isLoading = false;
	}
	get videoId() {
		return this._videoId;
	}
	set videoId(v) {
		this._videoId = v;
	}
}
IchibaItemView.__tpl__ = (`
		<div class="ZenzaIchibaItemView">
			<div class="loadStart">
				<div class="loadStartButton command" data-command="load">ニコニコ市場</div>
			</div>
			<div class="ichibaLoadingView">
				<div class="loading-inner">
					<span class="spinner">&#8987;</span>
				</div>
			</div>
			<div class="ichibaItemListContainer">
				<details class="ichibaItemListDetails">
					<summary class="ichibaItemSummary loadStartButton">ニコニコ市場</summary>
					<div class="ichibaItemListInner"></div>
				</details>
			</div>
		</div>
		`).trim();
css.addStyle(`
	.ZenzaIchibaItemView .loadStartButton {
		color: #000;
	}
`, {className: 'screenMode for-popup ichiba', disabled: true});
IchibaItemView.__css__ = (`
		.ZenzaIchibaItemView {
			text-align: center;
			margin: 4px 8px 8px;
			color: #ccc;
		}
			.ZenzaIchibaItemView .loadStartButton {
				font-size: 24px;
				padding: 8px 8px;
				margin: 8px;
				background: inherit;
				color: inherit;
				border: 1px solid #ccc;
				outline: none;
				line-height: 20px;
				border-radius: 8px;
				cursor: pointer;
				user-select: none;
			}
			.ZenzaIchibaItemView .loadStartButton:active::after {
				opacity: 0;
			}
			.ZenzaIchibaItemView .loadStartButton:active {
				transform: translate(0, 2px);
			}
			.ZenzaIchibaItemView .ichibaLoadingView,
			.ZenzaIchibaItemView .ichibaItemListContainer {
				display: none;
			}
		.ZenzaIchibaItemView.is-loading {
			cursor: wait;
			user-select: none;
		}
			.ZenzaIchibaItemView.is-loading * {
				pointer-events: none;
			}
			.ZenzaIchibaItemView.is-loading .ichibaLoadingView {
				display: block;
				font-size: 32px;
			}
			.ZenzaIchibaItemView.is-loading .loadStart,
			.ZenzaIchibaItemView.is-loading .ichibaItemListContainer {
				display: none;
			}
		.ZenzaIchibaItemView.is-success {
			background: none;
		}
			.ZenzaIchibaItemView.is-success .ichibaLoadingView,
			.ZenzaIchibaItemView.is-success .loadStart {
				display: none;
			}
			.ZenzaIchibaItemView.is-success .ichibaItemListContainer {
				display: block;
			}
			.ZenzaIchibaItemView.is-success details[open] {
				border: 1px solid #666;
				border-radius: 4px;
				padding: 0px;
			}
			.ZenzaIchibaItemView.is-fail .ichibaLoadingView,
			.ZenzaIchibaItemView.is-fail .loadStartButton {
				display: none;
			}
			.ZenzaIchibaItemView.is-fail .ichibaItemListContainer {
				display: block;
			}
		.ZenzaIchibaItemView .ichibaItemListContainer {
			text-align: center;
		}
			.ZenzaIchibaItemView .ichibaItemListContainer .ichiba-ichiba_mainpiaitem,
			.ZenzaIchibaItemView .ichibaItemListContainer .ichiba_mainitem {
				display: inline-table;
				width: 220px;
				margin: 8px;
				padding: 8px;
				word-break: break-all;
				text-shadow: 1px 1px 0 #000;
				background: #666;
				border-radius: 4px;
			}
			.ZenzaIchibaItemView .price,
			.ZenzaIchibaItemView .buy,
			.ZenzaIchibaItemView .click {
				font-weight: bold;
			}
		.ZenzaIchibaItemView a {
			display: inline-block;
			font-weight: bold;
			text-decoration: none;
			color: #ff9;
			padding: 2px;
		}
		.ZenzaIchibaItemView a:visited {
			color: #ffd;
		}
		.ZenzaIchibaItemView .rowJustify,
		.ZenzaIchibaItemView .noItem,
		.ichiba-ichibaMainLogo,
		.ichiba-ichibaMainHeader,
		.ichiba-ichibaMainFooter {
			display: none;
		}
		`).trim();
class UaaView extends BaseViewComponent {
	constructor({parentNode}) {
		super({
			parentNode,
			name: 'UaaView',
			template: UaaView.__tpl__,
			shadow: UaaView._shadow_,
			css: UaaView.__css__
		});
		this._state = {
			isUpdating: false,
			isExist: false,
			isSpeaking: false
		};
		this._config = Config.namespace('uaa');
		this._bound.load = this.load.bind(this);
		this._bound.update = this.update.bind(this);
	}
	_initDom(...args) {
		super._initDom(...args);
		ZenzaWatch.debug.uaa = this;
		if (!this._shadow) {
			return;
		} // ShadowDOM使えなかったらバイバイ
		const shadow = this._shadow || this._view;
		this._elm.body = shadow.querySelector('.UaaDetailBody');
	}
	update(videoInfo) {
		if (!this._shadow || !this._config.props.enable) {
			return;
		}
		if (!this._elm.body) {
			return;
		}
		if (this._state.isUpdating) {
			return;
		}
		this.setState({isUpdating: true});
		this._props.videoInfo = videoInfo;
		this._props.videoId = videoInfo.videoId;
		window.setTimeout(() => {
			this.load(videoInfo);
		}, 5000);
	}
	load(videoInfo) {
		const videoId = videoInfo.videoId;
		return UaaLoader.load(videoId, {limit: 50})
			.then(this._onLoad.bind(this, videoId))
			.catch(this._onFail.bind(this, videoId));
	}
	clear() {
		this.setState({isUpdating: false, isExist: false, isSpeaking: false});
		if (!this._elm.body) {
			return;
		}
		this._elm.body.innerHTML = '';
	}
	_onLoad(videoId, result) {
		if (this._props.videoId !== videoId) {
			return;
		}
		this.setState({isUpdating: false});
		const data = result ? result.data : null;
		if (!data || data.sponsors.length < 1) {
			return;
		}
		const df = document.createDocumentFragment();
		const div = document.createElement('div');
		div.className = 'screenshots';
		let idx = 0, screenshots = 0;
		data.sponsors.forEach(u => {
			if (!u.auxiliary.bgVideoPosition || idx >= 4) {
				return;
			}
			u.added = true;
			div.append(this._createItem(u, idx++));
			screenshots++;
		});
		div.setAttribute('data-screenshot-count', screenshots);
		df.append(div);
		data.sponsors.forEach(u => {
			if (!u.auxiliary.bgVideoPosition || u.added) {
				return;
			}
			u.added = true;
			df.append(this._createItem(u, idx++));
		});
		data.sponsors.forEach(u => {
			if (u.added) {
				return;
			}
			u.added = true;
			df.append(this._createItem(u, idx++));
		});
		this._elm.body.innerHTML = '';
		this._elm.body.appendChild(df);
		this.setState({isExist: true});
	}
	_createItem(data, idx) {
		const df = document.createElement('div');
		const contact = document.createElement('span');
		contact.textContent = data.advertiserName;
		contact.className = 'contact';
		df.className = 'item';
		const aux = data.auxiliary;
		const bgkeyframe = aux.bgVideoPosition || 0;
		if (data.message) {
			data.title = data.message;
		}
		df.setAttribute('data-index', idx);
		if (bgkeyframe && idx < 4) {
			const sec = parseFloat(bgkeyframe);
			df.setAttribute('data-time', textUtil.secToTime(sec));
			df.classList.add('clickable', 'command', 'other');
			Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
			contact.setAttribute('title', `${data.message}(${textUtil.secToTime(sec)})`);
			this._props.videoInfo.getCurrentVideo()
				.then(url => VideoCaptureUtil.capture(url, sec))
				.then(screenshot => {
				const cv = document.createElement('canvas');
				const ct = cv.getContext('2d');
				cv.width = screenshot.width;
				cv.height = screenshot.height;
				cv.className = 'screenshot command clickable';
				Object.assign(cv.dataset, { command: 'seek', type: 'number', param: sec });
				ct.fillStyle = 'rgb(32, 32, 32)';
				ct.fillRect(0, 0, cv.width, cv.height);
				ct.drawImage(screenshot, 0, 0);
				df.classList.add('has-screenshot');
				df.classList.remove('clickable', 'other');
				df.appendChild(cv);
			}).catch(() => {});
		} else if (bgkeyframe) {
			const sec = parseFloat(bgkeyframe);
			df.classList.add('clickable', 'command', 'other');
			Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
			contact.setAttribute('title', `${data.message}(${textUtil.secToTime(sec)})`);
		} else {
			df.classList.add('other');
		}
		df.appendChild(contact);
		return df;
	}
	_onFail(videoId) {
		if (this._props.videoId !== videoId) {
			return;
		}
		this.setState({isUpdating: false});
	}
	_onCommand(command, param) {
		switch (command) {
			default:
				super._onCommand(command, param);
		}
	}
}
UaaView._shadow_ = (`
		<style>
			.UaaDetails,
			.UaaDetails * {
				box-sizing: border-box;
				user-select: none;
			}
			.UaaDetails .clickable {
				cursor: pointer;
			}
				.UaaDetails .clickable:active {
					transform: translate(0, 2px);
					box-shadow: none;
				}
			.UaaDetails {
				opacity: 0;
				pointer-events: none;
				max-height: 0;
				margin: 0 8px 0;
				color: #ccc;
				overflow: hidden;
				text-align: center;
				word-break: break-all;
			}
				.UaaDetails.is-Exist {
					display: block;
					pointer-events: auto;
					max-height: 800px;
					padding: 4px;
					opacity: 1;
					transition: opacity 0.4s linear 0.4s, max-height 1s ease-in, margin 0.4s ease-in;
				}
				.UaaDetails.is-Exist[open] {
					border: 1px solid #666;
					border-radius: 4px;
					overflow: auto;
				}
			.UaaDetails .uaaSummary {
				height: 38px;
				margin: 4px 4px 8px;
				color: inherit;
				outline: none;
				border: 1px solid #ccc;
				letter-spacing: 12px;
				line-height: 38px;
				font-size: 24px;
				text-align: center;
				cursor: pointer;
				border-radius: 8px;
			}
			.UaaDetails .uaaDetailBody {
				margin: auto;
			}
			.UaaDetails .item {
				display: inline;
				width: inherit;
				margin: 0 4px 0 0;
			}
				.UaaDetails .item.has-screenshot {
					position: relative;
					display:inline-block;
					margin: 4px;
				}
				.UaaDetails .item.has-screenshot::after {
					content: attr(data-time);
					position: absolute;
					right: 0;
					bottom: 0;
					padding: 2px 4px;
					background: #000;
					color: #ccc;
					font-size: 12px;
					line-height: 14px;
				}
				.UaaDetails .item.has-screenshot:hover::after {
					opacity: 0;
				}
			.UaaDetails .contact {
				display: inline-block;
				color: #fff;
				font-weight: bold;
				font-size: 16px;
				text-align: center;
				user-select: none;
				word-break: break-all;
			}
				.UaaDetails .item.has-screenshot .contact {
					position: absolute;
					text-align: center;
					width: 100%;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					color: #fff;
					text-shadow: 1px 1px 1px #000;
					text-stroke: 1px #000;
					-webkit-text-stroke: 1px #000;
					pointer-events: none;
					font-size: 16px;
				}
			.UaaDetails .item.has-screenshot:hover .contact {
					display: none;
				}
				.UaaDetails .item.other {
					display: inline-block;
					border: none;
					width: inherit;
					margin: 0;
					padding: 2px 4px;
					line-height: normal;
					min-height: inherit;
					text-align: left;
				}
					.UaaDetails .item.is-speaking {
						text-decoration: underline;
					}
					.UaaDetails .item.has-screenshot.is-speaking {
						outline: none;
						transition: transform 0.2s ease;
						transform: scale(1.2);
						z-index: 1000;
					}
					.UaaDetails .item .contact {
						display: inline;
						padding: 2px 4px;
						width: auto;
						font-size: 12px;
						text-stroke: 0;
						color: inherit; /*#ccc;*/
						outline-offset: -2px;
					}
				.UaaDetails .item.other.clickable {
					display: inline-block;
					padding: 2px 4px;
					margin: 0 4px;
				}
				.UaaDetails .item.other.clickable .contact {
					display: inline-block;
					color: #ffc;
				}
				.UaaDetails .item.other.clickable .contact::after {
					content: attr(title);
					color: #ccc;
					font-weight: normal;
					margin: 0 4px;
				}
			.UaaDetails .screenshot {
				display: block;
				width: 128px;
				margin: 0;
				vertical-align: middle;
				cursor: pointer;
			}
			.screenshots[data-screenshot-count="1"] .screenshot {
				width: 192px;
			}
			.zenzaScreenMode_sideView .is-notFullscreen .UaaDetails {
				color: #000;
			}
			:host-context(.zenzaScreenMode_sideView .is-notFullscreen) .UaaDetails {
				color: #000;
			}
		</style>
		<details class="root UaaDetails">
			<summary class="uaaSummary clickable">提供</summary>
			<div class="UaaDetailBody"></div>
		</details>
	`).trim();
UaaView.__tpl__ = ('<div class="uaaView"></div>').trim();
UaaView.__css__ = (`
		uaaView {
			display: none;
		}
		uaaView.is-Exist {
		display: block;
		}
	`).trim();
class RelatedInfoMenu extends BaseViewComponent {
	constructor({parentNode, isHeader}) {
		super({
			parentNode,
			name: 'RelatedInfoMenu',
			template: '<div class="RelatedInfoMenu" tabindex="-1"></div>',
			shadow: RelatedInfoMenu._shadow_,
			css: RelatedInfoMenu.__css__
		});
		this._state = {};
		this._bound.update = this.update.bind(this);
		this._bound._onBodyClick = _.debounce(this._onBodyClick.bind(this), 0);
		this.setState({isHeader});
	}
	_initDom(...args) {
		super._initDom(...args);
		this._view.classList.toggle('is-Edge', /edge/i.test(navigator.userAgent));
		const shadow = this._shadow || this._view;
		this._elm.body = shadow.querySelector('.RelatedInfoMenuBody');
		this._elm.summary = shadow.querySelector('summary');
		shadow.addEventListener('click', e => {
			e.stopPropagation();
		});
		this._elm.summary.addEventListener('click', _.debounce(() => {
			if (shadow.open) {
				document.body.addEventListener('mouseup', this._bound._onBodyClick, {once: true});
				this.emit('open');
			}
		}, 100));
		this._ginzaLink = shadow.querySelector('.ginzaLink');
		this._originalLink = shadow.querySelector('.originalLink');
		this._twitterLink = shadow.querySelector('.twitterHashLink');
		this._parentVideoLink = shadow.querySelector('.parentVideoLink');
	}
	_onBodyClick() {
		const shadow = this._shadow || this._view;
		shadow.open = false;
		document.body.removeEventListener('mouseup', this._bound._onBodyClick);
		this.emit('close');
	}
	update(videoInfo) {
		const shadow = this._shadow || this._view;
		shadow.open = false;
		this._currentWatchId = videoInfo.watchId;
		this._currentVideoId = videoInfo.videoId;
		this.setState({
			isParentVideoExist: videoInfo.hasParentVideo,
			isCommunity: videoInfo.isCommunityVideo,
			isMymemory: videoInfo.isMymemory
		});
		const vid = this._currentVideoId;
		const wid = this._currentWatchId;
		this._ginzaLink.setAttribute('href', `//www.nicovideo.jp/watch/${wid}`);
		this._originalLink.setAttribute('href', `//www.nicovideo.jp/watch/${vid}`);
		this._twitterLink.setAttribute('href', `https://twitter.com/hashtag/${vid}`);
		this._parentVideoLink.setAttribute('href', `//commons.nicovideo.jp/tree/${vid}`);
		this.emit('close');
	}
	_onCommand(command, param) {
		let url;
		const shadow = this._shadow || this._view;
		shadow.open = false;
		switch (command) {
			case 'watch-ginza':
				window.open(this._ginzaLink.href, 'watchGinza');
				super._onCommand('pause');
				break;
			case 'open-uad':
				url = `//nicoad.nicovideo.jp/video/publish/${this._currentWatchId}?frontend_id=6&frontend_version=0&zenza_watch`;
				window.open(url, '', 'width=428, height=600, toolbar=no, scrollbars=1');
				break;
			case 'open-twitter-hash':
				window.open(this._twitterLink.href);
				break;
			case 'open-parent-video':
				window.open(this._parentVideoLink.href);
				break;
			case 'copy-video-watch-url':
				super._onCommand(command, param);
				super._onCommand('notify', 'コピーしました');
				break;
			case 'open-original-video':
				super._onCommand('openNow', this._currentVideoId);
				break;
			default:
				super._onCommand(command, param);
		}
		this.emit('close');
	}
}
RelatedInfoMenu._css_ = ('').trim();
RelatedInfoMenu._shadow_ = (`
		<style>
			.RelatedInfoMenu,
			.RelatedInfoMenu * {
				box-sizing: border-box;
				user-select: none;
			}
			.RelatedInfoMenu {
				display: inline-block;
				padding: 8px;
				font-size: 16px;
				cursor: pointer;
			}
			.RelatedInfoMenu summary {
				display: inline-block;
				background: transparent;
				color: #333;
				padding: 4px 8px;
				border-radius: 4px;
				outline: none;
				border: 1px solid #ccc;
			}
			.RelatedInfoMenu ul {
				list-style-type: none;
				padding-left: 32px;
			}
			.RelatedInfoMenu li {
				padding: 4px;
			}
			.RelatedInfoMenu li > .command {
				display: inline-block;
				text-decoration: none;
				color: #ccc;
			}
			.RelatedInfoMenu li > .command:hover {
				text-decoration: underline;
			}
			.RelatedInfoMenu li > .command:hover::before {
				content: '▷';
				position: absolute;
				transform: translate(-100%, 0);
			}
				.RelatedInfoMenu .originalLinkMenu,
				.RelatedInfoMenu .parentVideoMenu {
					display: none;
				}
				.RelatedInfoMenu.is-Community        .originalLinkMenu,
				.RelatedInfoMenu.is-Mymemory         .originalLinkMenu,
				.RelatedInfoMenu.is-ParentVideoExist .parentVideoMenu {
					display: block;
				}
			.zenzaScreenMode_sideView .is-fullscreen .RelatedInfoMenu summary{
				background: #888;
			}
			:host-context(.zenzaScreenMode_sideView .is-fullscreen) .RelatedInfoMenu summary {
				background: #888;
			}
			/* :host-contextで分けたいけどFirefox対応のため */
			.RelatedInfoMenu.is-Header {
				font-size: 13px;
				padding: 0 8px;
			}
			.RelatedInfoMenu.is-Header summary {
				background: #666;
				color: #ccc;
				padding: 0 8px;
				border: none;
			}
			.RelatedInfoMenu.is-Header[open] {
				background: rgba(80, 80, 80, 0.9);
			}
			.RelatedInfoMenu.is-Header ul {
				font-size: 16px;
				line-height: 20px;
			}
			:host-context(.zenzaWatchVideoInfoPanel) .RelatedInfoMenu li > .command {
				color: #222;
			}
			.zenzaWatchVideoInfoPanel .RelatedInfoMenu li > .command {
				color: #222;
			}
				/* for Edge */
				.is-Edge .RelatedInfoMenuBody {
					display: none;
					color: #ccc;
					background: rgba(80, 80, 80, 0.9);
				}
				.RelatedInfoMenu[open] .RelatedInfoMenuBody,
				.RelatedInfoMenu:focus .RelatedInfoMenuBody,
				.RelatedInfoMenuBody:hover {
					display: block;
				}
		</style>
		<details class="root RelatedInfoMenu">
			<summary class="RelatedInfoMenuSummary clickable">関連メニュー</summary>
			<div class="RelatedInfoMenuBody">
				<ul>
					<li class="ginzaMenu">
						<a class="ginzaLink command"
							rel="noopener" data-command="watch-ginza">公式プレイヤーで開く</a>
					</li>
					<li class="uadMenu">
						<span class="uadLink command"
							rel="noopener" data-command="open-uad">ニコニ広告で宣伝</span>
					</li>
					<li class="twitterHashMenu">
						<a class="twitterHashLink command"
							rel="noopener" data-command="open-twitter-hash">twitterの反応を見る</a>
					</li>
					<li class="originalLinkMenu">
						<a class="originalLink command"
							rel="noopener" data-command="open-original-video">元動画を開く</a>
					</li>
					<li class="parentVideoMenu">
						<a class="parentVideoLink command"
							rel="noopener" data-command="open-parent-video">親作品・コンテンツツリー</a>
					</li>
					<li class="copyVideoWatchUrlMenu">
						<span class="copyVideoWatchUrlLink command"
							rel="noopener" data-command="copy-video-watch-url">動画URLをコピー</span>
					</li>
				</ul>
			</div>
		</details>
	`).trim();
class VideoMetaInfo extends BaseViewComponent {
	constructor({parentNode}) {
		super({
			parentNode,
			name: 'VideoMetaInfo',
			template: '<div class="VideoMetaInfo"></div>',
			shadow: VideoMetaInfo._shadow_,
			css: VideoMetaInfo.__css__
		});
		this._state = {};
		this._bound.update = this.update.bind(this);
	}
	_initDom(...args) {
		super._initDom(...args);
		const shadow = this._shadow || this._view;
		this._elm = Object.assign({}, this._elm, {
			postedAt: shadow.querySelector('.postedAt'),
			body: shadow.querySelector('.videoMetaInfo'),
			viewCount: shadow.querySelector('.viewCount'),
			commentCount: shadow.querySelector('.commentCount'),
			mylistCount: shadow.querySelector('.mylistCount')
		});
	}
	update(videoInfo) {
		this._elm.postedAt.textContent = videoInfo.postedAt;
		const count = videoInfo.count;
		this.updateVideoCount(count);
	}
	updateVideoCount({comment, view, mylist}) {
		const addComma = m => m.toLocaleString ? m.toLocaleString() : m;
		if (typeof comment === 'number') {
			this._elm.commentCount.textContent = addComma(comment);
		}
		if (typeof view === 'number') {
			this._elm.viewCount.textContent = addComma(view);
		}
		if (typeof mylist === 'number') {
			this._elm.mylistCount.textContent = addComma(mylist);
		}
	}
}
VideoMetaInfo._css_ = ('').trim();
VideoMetaInfo._shadow_ = (`
		<style>
			.VideoMetaInfo .postedAtOuter {
				display: inline-block;
				margin-right: 24px;
			}
			.VideoMetaInfo .postedAt {
				font-weight: bold
			}
			.VideoMetaInfo .countOuter {
				white-space: nowrap;
			}
			.VideoMetaInfo .countOuter .column {
				display: inline-block;
				white-space: nowrap;
			}
			.VideoMetaInfo .count {
				font-weight: bolder;
			}
			.userVideo .channelVideo,
			.channelVideo .userVideo
			{
				display: none !important;
			}
			:host-context(.userVideo) .channelVideo,
			:host-context(.channelVideo) .userVideo
			{
				display: none !important;
			}
		</style>
		<div class="VideoMetaInfo root">
			<span class="postedAtOuter">
				<span class="userVideo">投稿日:</span>
				<span class="channelVideo">配信日:</span>
				<span class="postedAt"></span>
			</span>
			<span class="countOuter">
				<span class="column">再生:       <span class="count viewCount"></span></span>
				<span class="column">コメント:   <span class="count commentCount"></span></span>
				<span class="column">マイリスト: <span class="count mylistCount"></span></span>
			</span>
		</div>
	`);

const initializeGinzaSlayer = (dialog, query) => {
	uq('.notify_update_flash_playerm, #external_nicoplayer').remove();
	const watchId = nicoUtil.getWatchId();
	const options = {};
	if (!isNaN(query.from)) {
		options.currentTime = parseFloat(query.from, 10);
	}
	const v = document.querySelector('#MainVideoPlayer video');
	v && v.pause();
	dialog.open(watchId, options);
};

const {initialize} = (() => {
class HoverMenu {
	constructor(param) {
		this.initialize(param);
	}
	initialize(param) {
		this._playerConfig = param.playerConfig;
		const $view = this._$view = uq(
			'<zen-button class="ZenButton"><div class="ZenButtonInner scalingUI">Zen</div></zen-button>'
		);
		if (!nicoUtil.isGinzaWatchUrl() &&
			this._playerConfig.props.overrideWatchLink &&
			location && location.host.endsWith('.nicovideo.jp')) {
			this._overrideWatchLink();
		} else {
			this._onHoverEnd = _.debounce(this._onHoverEnd.bind(this), 500);
			$view.on('click', this._onClick.bind(this));
			ZenzaWatch.emitter.on('hideHover', () => $view.removeClass('show'));
			uq('body')
				.on('mouseover', this._onHover.bind(this))
				.on('mouseover', this._onHoverEnd)
				.on('mouseout', this._onMouseout.bind(this))
				.append($view);
		}
	}
	setPlayer(player) {
		this._player = player;
		if (this._playerResolve) {
			this._playerResolve(player);
		}
	}
	_getPlayer() {
		if (this._player) {
			return Promise.resolve(this._player);
		}
		if (!this._playerPromise) {
			this._playerPromise = new Promise(resolve => {
				this._playerResolve = resolve;
			});
		}
		return this._playerPromise;
	}
	_closest(target) {
		return target.closest('a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link');
	}
	_onHover (e) {
		const target = this._closest(e.target);
		if (target) {
			this._hoverElement = target;
		}
	}
	_onMouseout (e) {
		if (this._hoverElement === this._closest(e.target)) {
			this._hoverElement = null;
		}
	}
	_onHoverEnd (e) {
		if (!this._hoverElement) { return; }
		const target = this._closest(e.target);
		if (this._hoverElement !== target) {
			return;
		}
		if (!target || target.classList.contains('noHoverMenu')) {
			return;
		}
		let href = target.dataset.href || target.href;
		let watchId = nicoUtil.getWatchId(href);
		let host = target.hostname;
		if (!['www.nicovideo.jp', 'sp.nicovideo.jp', 'nico.ms'].includes(host)) {
			return;
		}
		this._query = nicoUtil.parseWatchQuery((target.search || '').substr(1));
		if (!watchId || !watchId.match(/^[a-z0-9]+$/)) {
			return;
		}
		if (watchId.startsWith('lv')) {
			return;
		}
		this._watchId = watchId;
		const offset = target.getBoundingClientRect();
		this._$view.css({
			top: offset.top + window.pageYOffset,
			left: offset.left + window.pageXOffset
		}).addClass('show');
		document.body.addEventListener('click', () => this._$view.removeClass('show'), {once: true});
	}
	_onClick (e) {
		const watchId = this._watchId;
		if (e.ctrlKey) {
			return;
		}
		if (e.shiftKey) {
			this._send(watchId);
		} else {
			this._open(watchId);
		}
	}
	open (watchId, params) {
		this._open(watchId, params);
	}
	async _open (watchId, params) {
		this._playerOption = Object.assign({
			economy: this._playerConfig.getValue('forceEconomy'),
			query: this._query,
			eventType: 'click'
		}, params);
		const player = await this._getPlayer();
		if (this._playerConfig.getValue('enableSingleton')) {
			ZenzaWatch.external.sendOrOpen(watchId, this._playerOption);
		} else {
			player.open(watchId, this._playerOption);
		}
	}
	send (watchId, params) {
		this._send(watchId, params);
	}
	async _send (watchId, params) {
		await this._getPlayer();
		ZenzaWatch.external.send(watchId, Object.assign({query: this._query}, params));
	}
	_overrideWatchLink () {
		uq('body').on('click', e => {
			if (e.ctrlKey) {
				return;
			}
			const target = this._closest(e.target);
			if (!target || target.classList.contains('noHoverMenu')) {
				return;
			}
			let href = target.dataset.href || target.href;
			let watchId = nicoUtil.getWatchId(href);
			let host = target.hostname;
			if (!['www.nicovideo.jp', 'sp.nicovideo.jp', 'nico.ms'].includes(host)) {
				return;
			}
			this._query = nicoUtil.parseWatchQuery((target.search || '').substr(1));
			if (!watchId || !watchId.match(/^[a-z0-9]+$/)) {
				return;
			}
			if (watchId.startsWith('lv')) {
				return;
			}
			e.preventDefault();
			if (e.shiftKey) {
				this._send(watchId);
			} else {
				this._open(watchId);
			}
			window.setTimeout(() => ZenzaWatch.emitter.emit('hideHover'), 1500);
		});
	}
}
	const isOverrideGinza = () => {
		if (window.name === 'watchGinza') {
			return false;
		}
		if (Config.props.overrideGinza && nicoUtil.isZenzaPlayableVideo()) {
			return true;
		}
		return false;
	};
	const initWorker = () => {
		if (!location.host.endsWith('.nicovideo.jp')) { return; }
		CommentLayoutWorker.getInstance();
		ThumbInfoLoader.load('sm9');
		window.console.time('init Workers');
		return Promise.all([
			StoryboardWorker.initWorker(),
			VideoSessionWorker.initWorker(),
			StoryboardCacheDb.initWorker(),
			WatchInfoCacheDb.initWorker()
		]).then(() => window.console.timeEnd('init Workers'));
	};
const replaceRedirectLinks = async () => {
	await uq.ready();
	uq('a[href*="www.flog.jp/j.php/http://"]').forEach(a => {
		a.href = a.href.replace(/^.*https?:/, '');
	});
	uq('a[href*="rd.nicovideo.jp/cc/"]').forEach(a => {
		const href = a.href;
		const m = /cc_video_id=([a-z0-9+]+)/.exec(href);
		if (m) {
			const watchId = m[1];
			if (!watchId.startsWith('lv')) {
				a.href = `//www.nicovideo.jp/watch/${watchId}`;
			}
		}
	});
	if (window.Nico && window.Nico.onReady) {
		window.Nico.onReady(() => {
			let shuffleButton;
			let query = 'a[href*="continuous=1"]';
			let addShufflePlaylistLink = _.debounce(() => {
				if (shuffleButton) {
					return;
				}
				let $a = uq(query);
				if (!$a.length) {
					return false;
				}
				let a = $a[0];
				let search = (a.search || '').substr(1);
				let css = {
					'display': 'inline-block',
					'padding': '8px 6px'
				};
				let $shuffle = uq.html(a.outerHTML).text('シャッフル再生')
					.addClass('zenzaPlaylistShuffleStart')
					.attr('href', `//www.nicovideo.jp/watch/1470321133?${search}&shuffle=1`)
					.css(css);
				$a.css(css).after($shuffle);
				shuffleButton = $shuffle;
				return true;
			}, 100);
			addShufflePlaylistLink();
			const container = uq('#myContBody, #SYS_box_mylist_header')[0];
			if (!container) { return; }
			new MutationObserver(records => {
				for (let rec of records) {
					let changed = [].concat(Array.from(rec.addedNodes),Array.from(rec.removedNodes));
					if (changed.some(i => i.querySelector && i.querySelector(query))) {
						shuffleButton = null;
						addShufflePlaylistLink();
						return;
					}
				}
			}).observe(container, {childList: true});
		});
	}
	if (location.host === 'www.nicovideo.jp' &&
		(location.pathname.indexOf('/search/') === 0 || location.pathname.indexOf('/tag/') === 0)) {
		let $autoPlay = uq('.autoPlay');
		let $target = $autoPlay.find('a');
		let search = (location.search || '').substr(1);
		let href = $target.attr('href') + '&' + search;
		$target.attr('href', href);
		let $shuffle = $autoPlay.clone();
		let a = $target[0];
		$shuffle.find('a').attr({
			'href': '/watch/1483135673' + a.search + '&shuffle=1'
		}).text('シャッフル再生');
		$autoPlay.after($shuffle);
		window.setTimeout(() => {
			uq('.nicoadVideoItem').forEach(item => {
				const pointLink = item.querySelector('.count .value a');
				if (!pointLink) {
					return;
				}
				const {pathname} = textUtil.parseUrl(pointLink);
				const videoId = pathname.replace(/^.*\//, '');
				uq(item)
					.find('a[data-link]').attr('href', `//www.nicovideo.jp/watch/${videoId}`);
			});
		}, 3000);
	}
	if (location.host === 'ch.nicovideo.jp') {
		uq('#sec_current a.item').closest('li').forEach(li => {
			let $li = uq(li), $img = $li.find('img');
			let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
			let $a = $li.find('a');
			let m = /smile\?i=([0-9]+)/.exec(thumbnail);
			if (m) {
				$a[0].href = `//www.nicovideo.jp/watch/so${m[1]}`;
			}
		});
		uq('.playerNavContainer .video img').forEach(img => {
			let video = img.closest('.video');
			if (!video) {
				return;
			}
			let thumbnail = img.src || img.dataset.original || '';
			let m = /smile\?i=([0-9]+)/.exec(thumbnail);
			if (m) {
				let $a =
				uq('<a class="more zen" rel="noopener" target="_blank">watch</a>')
						.css('right', '128px')
						.attr('href', `//www.nicovideo.jp/watch/so${m[1]}`);
				uq(video).find('.more').after($a);
			}
		});
	}
};
	const initialize = async function (){
		window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
		util.dispatchCustomEvent(
			document.body, 'BeforeZenzaWatchInitialize', window.ZenzaWatch, {bubbles: true, composed: true});
		util.addStyle(CONSTANT.COMMON_CSS, {className: 'common'});
		initializeBySite();
		replaceRedirectLinks();
		const query = util.parseQuery(START_PAGE_QUERY);
		await util.$.ready(); // DOMContentLoaded
		const isWatch = util.isGinzaWatchUrl() &&
			(!!document.getElementById('watchAPIDataContainer') ||
				!!document.getElementById('js-initial-watch-data'));
		const hoverMenu = global.debug.hoverMenu = new HoverMenu({playerConfig: Config});
		await Promise.all([NicoComment.offscreenLayer.get(Config), initWorker()]);
		const dialog = initializeDialogPlayer(Config);
		hoverMenu.setPlayer(dialog);
		if (isWatch) {
			if (isOverrideGinza()) {
				initializeGinzaSlayer(dialog, query);
			}
			if (window.name === 'watchGinza') {
				window.name = '';
			}
		}
		initializeMessage(dialog);
		WatchPageHistory.initialize(dialog);
		initializeExternal(dialog, Config, hoverMenu);
		if (!isWatch) {
			initializeLastSession(dialog);
		}
		CustomElements.initialize();
		window.ZenzaWatch.ready = true;
		global.emitter.emitAsync('ready');
		global.emitter.emitResolve('init');
		util.dispatchCustomEvent(
			document.body, 'ZenzaWatchInitialize', window.ZenzaWatch, {bubbles: true, composed: true});
	};
	const initializeMessage = player => {
		const config = Config;
		const bcast = BroadcastEmitter;
		const onBroadcastMessage = (cmd, type, sessionId) => {
			const isLast = player.isLastOpenedPlayer;
			const isOpen = player.isOpen;
			const {command, params, requestId, now} = cmd;
			let result;
			const localNow = Date.now();
			if (command === 'hello') {
				window.console.log(
					'%cHELLO! \ntime: %s (%smsec)\nmessage: %s \nfrom: %s\nurl: %s\n', 'font-weight: bold;',
					new Date(params.now).toLocaleString(), localNow - now,
					params.message, params.from, params.url,
					{command, isLast, isOpen});
					result = {status: 'ok'};
			} else if (command  === 'sendExecCommand' &&
					(params.command === 'echo' || (isLast && isOpen))) {
				result = player.execCommand(params.command, params.params);
			} else if (command === 'ping' && (params.force || (isLast && isOpen))) {
				window.console.info('pong!');
				result = {status: 'ok'};
			} else if (command === 'pong') {
				result = bcast.emitResolve('ping', params);
			} else if (command  === 'notifyClose' && isOpen) {
				result = player.refreshLastPlayerId();
				return;
			} else if (command ==='pushHistory') {
				const {path, title} = params;
				WatchPageHistory.pushHistoryAgency(path, title);
			} else if (command === 'openVideo' && isLast) {
				const {watchId, query, eventType} = params;
				player.open(watchId, {autoCloseFullScreen: false, query, eventType});
			} else if (command === 'messageResult') {
				if (bcast.hasPromise(params.sessionId)) {
					params.status === 'ok' ?
						bcast.emitResolve(params.sessionId, params) :
						bcast.emitReject(params.sessionId, params);
				}
				return;
			} else {
				return;
			}
			result = result || {status: 'ok'};
			Object.assign(result, {
				playerId: player.getId(),
				title: document.title,
				url: location.href,
				windowId: bcast.windowId,
				sessionId,
				isLast,
				isOpen,
				requestId,
				now: localNow,
				time: localNow - now
			});
			bcast.sendMessage({command: 'messageResult', params: result});
	};
		const onWindowMessage = (cmd, type, sessionId) => {
			const {command, params} = cmd;
			const watchId = cmd.watchId || params.watchId; // 互換のため冗長
			if (watchId && command === 'open') {
				if (config.props.enableSingleton) {
					global.external.sendOrOpen(watchId);
				} else {
					player.open(watchId, {economy: Config.props.forceEconomy});
				}
			} else if (watchId && command === 'send') {
				BroadcastEmitter.sendExecCommand({command: 'openVideo', params: watchId});
			}
		};
		BroadcastEmitter.on('message', (message, type, sessionId) => {
			return type === 'broadcast' ?
				onBroadcastMessage(message, type, sessionId) :
				onWindowMessage(message, type, sessionId);
		});
		player.on('close', () => BroadcastEmitter.notifyClose());
	};
	const initializeExternal = dialog => {
		const command = (command, param) => dialog.execCommand(command, param);
		const open = (watchId, params) => dialog.open(watchId, params);
		const send = (watchId, params) => BroadcastEmitter.sendOpen(watchId, params);
		const sendOrOpen = (watchId, params) => {
			if (dialog.isLastOpenedPlayer) {
				open(watchId, params);
			} else {
				return BroadcastEmitter
					.ping()
					.then(() => send(watchId, params), () => open(watchId, params));
			}
		};
		const importPlaylist = data => PlaylistSession.save(data);
		const exportPlaylist = () => PlaylistSession.restore() || {};
		const sendExecCommand = (command, params) => BroadcastEmitter.sendExecCommand({command, params});
		const sendOrExecCommand = (command, params) => {
			return BroadcastEmitter.ping()
				.then(() => sendExecCommand(command, params),
							() => dialog.execCommand(command, params));
		};
		const playlistAdd = watchId => sendOrExecCommand('playlistAdd', watchId);
		const insertPlaylist = watchId => sendOrExecCommand('playlistInsert', watchId);
		const deflistAdd = ({watchId, description, token}) => {
			const mylistApiLoader = ZenzaWatch.api.MylistApiLoader;
			if (token) {
				mylistApiLoader.setCsrfToken(token);
			}
			return mylistApiLoader.addDeflistItem(watchId, description);
		};
		const deflistRemove = ({watchId, token}) => {
			const mylistApiLoader = ZenzaWatch.api.MylistApiLoader;
			if (token) {
				mylistApiLoader.setCsrfToken(token);
			}
			return mylistApiLoader.removeDeflistItem(watchId);
		};
		const echo = (msg = 'こんにちはこんにちは！') => sendExecCommand('echo', msg);
		Object.assign(ZenzaWatch.external, {
			execCommand: command,
			sendExecCommand,
			sendOrExecCommand,
			open,
			send,
			sendOrOpen,
			deflistAdd,
			deflistRemove,
			hello: BroadcastEmitter.hello,
			ping: BroadcastEmitter.ping,
			echo,
			playlist: {
				add: playlistAdd,
				insert: insertPlaylist,
				import: importPlaylist,
				export: exportPlaylist
			}
		});
		Object.assign(ZenzaWatch.debug, {
			dialog,
			getFrameBodies: () => {
				return Array.from(document.querySelectorAll('.zenzaPlayerContainer iframe')).map(f => f.contentWindow.document.body);
			}
		});
		if (ZenzaWatch !== window.ZenzaWatch) {
			window.ZenzaWatch.external = {
				open,
				sendOrOpen,
				sendOrExecCommand,
				hello: BroadcastEmitter.hello,
				ping: BroadcastEmitter.ping,
				echo,
				playlist: {
					add: playlistAdd,
					insert: insertPlaylist
				}
			};
		}
	};
	const initializeLastSession = dialog => {
		window.addEventListener('beforeunload', () => {
			if (!dialog.isOpen) {
				return;
			}
			PlayerSession.save(dialog.playingStatus);
			dialog.close();
		}, {passive: true});
		PlayerSession.init(sessionStorage);
		let lastSession = PlayerSession.restore();
		let screenMode = Config.props.screenMode;
		if (
			lastSession.playing &&
			(screenMode === 'small' ||
				screenMode === 'sideView' ||
				location.href === lastSession.url ||
				Config.props.continueNextPage
			)
		) {
			lastSession.eventType = 'session';
			dialog.open(lastSession.watchId, lastSession);
		} else {
			PlayerSession.clear();
		}
	};
	const initializeBySite = () => {
		const hostClass = location.host
			.replace(/^.*\.slack\.com$/, 'slack.com')
			.replace(/\./g, '-');
		document.body.dataset.domain = hostClass;
		util.StyleSwitcher.update({on: `style.domain.${hostClass}`});
	};
	const initializeDialogPlayer = (config, offScreenLayer) => {
		console.log('initializeDialog');
		config = PlayerConfig.getInstance(config);
		const state = PlayerState.getInstance(config);
		ZenzaWatch.state.player = state;
		const dialog = new NicoVideoPlayerDialog({
			offScreenLayer,
			config,
			state
		});
		RootDispatcher.initialize(dialog);
		return dialog;
	};
	return {initialize};
})();

const CustomElements = {};
CustomElements.initialize = (() => {
	if (!window.customElements) {
		return;
	}
	class PlaylistAppend extends HTMLElement {
		static get observedAttributes() { return []; }
		static template() {
			return `
				<style>
				* {
					box-sizing: border-box;
					user-select: none;
				}
				:host {
					background: none !important;
					border: none !important;
				}
				.playlistAppend {
					display: inline-block;
					font-size: 16px;
					line-height: 22px;
					width: 24px;
					height: 24px;
					background: #666;
					color: #ccc;
					text-decoration: none;
					border: 1px outset;
					border-radius: 3px;
					cursor: pointer;
					text-align: center;
				}
				.playlistAppend:active {
					border: 1px inset;
				}
				.label {
					text-shadow: 1px 1px #333;
					display: inline-block;
				}
				:host-context(.videoList) .playlistAppend {
					width: 24px;
					height: 20px;
					line-height: 18px;
					border-radius: unset;
				}
				:host-context(.videoOwnerInfoContainer) {
				}
			</style>
			<div class="playlistAppend">
				<div class="label">▶</div></div>
			`;
		}
		constructor() {
			super();
			const shadow = this._shadow = this.attachShadow({mode: 'open'});
			shadow.innerHTML = this.constructor.template();
		}
		disconnectedCallback() {
			this._shadow.textContent = '';
		}
	}
	window.customElements.define('zenza-playlist-append', PlaylistAppend);
	class SeekbarLabel extends HTMLElement {
		static get observedAttributes() { return [
			'time', 'duration', 'text'
		]; }
		static template() {
			return `
				<style>
*, *::after, *::before {
	box-sizing: border-box;
	user-select: none;
	--color: #fea;
	--bg-color: rgba(0, 0, 0, 0.7);
	--pointer-color: rgba(255, 128, 128, 0.6);
}
:host(.owner-comment) * {
	--color: #efa;
	--pointer-color: rgba(128, 255, 128, 0.6);
}
.root * {
	pointer-events: none;
}
.root {
	position: absolute;
	width: 16px;
	height: 16px;
	top: calc(100% - 2px);
	left: 50%;
	color: var(--color);
	border-style: solid;
	border-width: 8px;
	border-color:
		var(--pointer-color)
		transparent
		transparent
		transparent;
}
.label {
	display: inline-block;
	visibility: hidden;
	position: absolute;
	left: -8px;
	bottom: 8px;
	white-space: nowrap;
	padding: 2px 4px;
	background: rgba(0, 0, 0, 0.8);
	border-radius: 4px;
	border-color: var(--pointer-color);
	border-style: solid;
	opacity: 0.5;
}
.root:hover .label {
	visibility: visible;
}
			</style>
			<div class="root">
				<span class="label"></span>
			</div>
			`;
		}
		constructor() {
			super();
			const shadow = this._shadow = this.attachShadow({mode: 'open'});
			shadow.innerHTML = this.constructor.template();
			this._root = shadow.querySelector('.root');
			this._label = shadow.querySelector('.label');
			this._updatePos = _.debounce(this._updatePos.bind(this), 100);
			this.props = {
				time: -1,
				duration: 1,
				text: this.getAttribute('text') || this.getAttribute('data-text')
			};
			this._label.textContent = this.props.text;
		}
		_updateTime(t) {
			this.props.time = isNaN(t) ? -1 : t;
			this._updatePos();
		}
		_updateDuration(d) {
			this.props.duration = isNaN(d) ? 1 : d;
			this._updatePos();
		}
		_updatePos() {
			const per = this.props.time / Math.max(this.props.duration, 1) * 100;
			this.hidden = per <= 0;
			this.setAttribute('data-param', this.props.time);
			this._root.style.transform = `translate(${per}vw, 0) translateX(-50%)`;
			this._label.style.transform = `translate(-${per}%, 0)`;
		}
		_clear() {
			this._root.classList.toggle('has-screenshot', false);
			this.props.time = -1;
			this.props.duration = 1;
			this.hidden = true;
		}
		hide() {
			this.hidden = true;
		}
		attributeChangedCallback(attr, oldValue, newValue) {
			switch (attr) {
				case 'time':
					this._updateTime(parseFloat(newValue));
					break;
				case 'duration':
					this._updateDuration(parseFloat(newValue));
					break;
				case 'text':
					this._label.textContent = newValue;
					break;
			}
		}
	}
	window.customElements.define('zenza-seekbar-label', SeekbarLabel);
});

const TextLabel = (() => {
	const func = function(self) {
		const items = {};
		const getId = function() {return `id-${this.id++}`;}.bind({id: 0});
		const create = async ({canvas, style}) => {
			const id = getId();
			const ctx = canvas.getContext('2d', {
				desynchronized: true,
			});
			items[id] = {
				canvas, style, ctx, text: ''
			};
			return setStyle({id, style});
		};
		const setStyle = ({id, style, name}) => {
			const item = items[id];
			if (!item) { throw new Error('unknown id', id); }
			name = name || 'label';
			const {canvas, ctx} = item;
			item.text = '';
			style.widthPx && (canvas.width = style.widthPx * style.ratio);
			style.heightPx && (canvas.height = style.heightPx * style.ratio);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			return {id, text: ''};
		};
		const drawText = ({id, text}) => {
			const item = items[id];
			if (!item) { throw new Error('unknown id', id); }
			const {canvas, ctx, style} = item;
			if (item.text === text) {
				return;
			}
			ctx.beginPath();
			ctx.font = `${style.fontWeight || ''} ${style.fontSizePx ? `${style.fontSizePx * style.ratio}px` : ''} ${style.fontFamily || ''}`.trim();
			const measured = ctx.measureText(text);
			let {width, height} = measured;
			height = (height || style.fontSizePx) * style.ratio;
			const left = (canvas.width - width) / 2;
			const top = canvas.height - (canvas.height - height) / 2;
			ctx.fillStyle = style.color;
			ctx.textAlign = style.textAlign;
			ctx.textBaseline = 'bottom';
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillText(text, left, top);
			ctx.commit && ctx.commit();
			return {id, text};
		};
		const dispose = ({id}) => {
			delete items[id];
		};
		self.onmessage = async ({command, params}) => {
			switch (command) {
				case 'create':
					return create(params);
				case 'style':
					return setStyle(params);
				case 'drawText':
					return drawText(params);
				case 'dispose':
					return dispose(params);
			}
		};
	};
	const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;
	const getContainerStyle = ({container, canvas, ratio}) => {
		let style = window.getComputedStyle(container || document.body);
		ratio = ratio || window.devicePixelRatio;
		const width = (container.offsetWidth || canvas.width) * ratio;
		const height = (container.offsetHeight || canvas.height) * ratio;
		if (!width || !height) {
			style = window.getComputedStyle(document.body);
		}
		return {
			width,
			height,
			font: style.font,
			fontFamily: style.fontFamily,
			fontWeight: style.fontWeight,
			fontSizePx: style.fontSize.replace(/[a-z]/g, '') * 1,
			color: style.color,
			backgroundColor: style.backgroundColor,
			textAlign: style.textAlign,
			ratio
		};
	};
	const NAME = 'TextLabelWorker';
	let worker;
	const create = async ({container, canvas, ratio, name, style, text}) => {
		style = style || {};
		ratio = Math.max(ratio || window.devicePixelRatio || 2, 2);
		style.ratio = style.ratio || ratio;
		name = name || 'label';
		if (!canvas) {
			canvas = document.createElement('canvas');
			Object.assign(canvas.style, {
				width: `${style.widthPx}px` || '100%',
				height: `${style.heightPx}px` || '100%',
				backgroundColor: style.backgroundColor || ''
			});
			container && container.append(canvas);
			style.widthPx &&  (canvas.width = Math.max(style.widthPx * ratio));
			style.heightPx && (canvas.height = Math.max(style.heightPx * ratio));
		}
		canvas.dataset.name = name;
		const containerStyle = getContainerStyle({container, canvas, ratio});
		style.fontFamily = style.fontFamily || containerStyle.fontFamily;
		style.fontWeight = style.fontWeight || containerStyle.fontWeight;
		style.color      = style.color      || containerStyle.color;
		if (!isOffscreenCanvasAvailable) {
			if (!worker) {
				worker = {
					name: NAME,
					onmessage: () => {},
					post: ({command, params}) => worker.onmessage({command, params})
				};
				func(worker);
			}
		} else {
			worker = worker || workerUtil.createCrossMessageWorker(func, {name: NAME});
		}
		const layer = isOffscreenCanvasAvailable ? canvas.transferControlToOffscreen() : canvas;
		const init = await worker.post(
			{command: 'create', params: {canvas: layer, style, name}},
			{transfer: [layer]}
		);
		const id = init.id;
		const result = {
			container,
			canvas,
			style() {
				init.text = '';
				const style = getContainerStyle({container, canvas});
				return worker.post({command: 'style', params: {id, style, name}});
			},
			async drawText(text) {
				if (init.text === text) {
					return;
				}
				const result = await worker.post({command: 'drawText', params: {id, text}});
				init.text = result.text;
			},
			get text() { return init.text; },
			set text(t) { this.drawText(t); },
			dispose: () => worker.post({command: 'dispose', params: {id}})
		};
		text && (result.text = text);
		return result;
	};
	return {create};
})();
ZenzaWatch.modules.TextLabel = TextLabel;

    if (window.name === 'commentLayerFrame') {
      return;
    }

    if (location.host === 'www.nicovideo.jp') {
      return initialize();
    }

    uq.ready().then(() => NicoVideoApi.configBridge(Config)).then(() => {
      window.console.log('%cZenzaWatch Bridge: %s', 'background: lightgreen;', location.host);
      if (document.getElementById('siteHeaderNotification')) {
        return initialize();
      }
      NicoVideoApi.fetch('https://www.nicovideo.jp/',{credentials: 'include'})
        .then(r => r.text())
        .then(result => {
          const $dom = util.$(`<div>${result}</div>`);
          const isLogin = $dom.find('.siteHeaderLogin, #siteHeaderLogin').length < 1;
          const isPremium =
            $dom.find('#siteHeaderNotification').hasClass('siteHeaderPremium');
          window.console.log('isLogin: %s isPremium: %s', isLogin, isPremium);
          nicoUtil.isLogin = () => isLogin;
          nicoUtil.isPremium = util.isPremium = () => isPremium;
          initialize();
        });
    }, err => window.console.log('ZenzaWatch Bridge disabled', err));


  }; // end of monkey
(() => {
function EmitterInitFunc() {
class Handler { //extends Array {
	constructor(...args) {
		this._list = args;
	}
	get length() {
		return this._list.length;
	}
	exec(...args) {
		if (!this._list.length) {
			return;
		} else if (this._list.length === 1) {
			this._list[0](...args);
			return;
		}
		for (let i = this._list.length - 1; i >= 0; i--) {
			this._list[i](...args);
		}
	}
	execMethod(name, ...args) {
		if (!this._list.length) {
			return;
		} else if (this._list.length === 1) {
			this._list[0][name](...args);
			return;
		}
		for (let i = this._list.length - 1; i >= 0; i--) {
			this._list[i][name](...args);
		}
	}
	add(member) {
		if (this._list.includes(member)) {
			return this;
		}
		this._list.unshift(member);
		return this;
	}
	remove(member) {
		this._list = this._list.filter(m => m !== member);
		return this;
	}
	clear() {
		this._list.length = 0;
		return this;
	}
	get isEmpty() {
		return this._list.length < 1;
	}
	*[Symbol.iterator]() {
		const list = this._list || [];
		for (const member of list) {
			yield member;
		}
	}
	next() {
		return this[Symbol.iterator]();
	}
}
Handler.nop = () => {/*     ( ˘ω˘ ) スヤァ    */};
const PromiseHandler = (() => {
	const id = function() { return `Promise${this.id++}`; }.bind({id: 0});
	class PromiseHandler extends Promise {
		constructor(callback = () => {}) {
			const key = new Object({id: id(), callback, status: 'pending'});
			const cb = function(res, rej) {
				const resolve = (...args) => { this.status = 'resolved'; this.value = args; res(...args); };
				const reject  = (...args) => { this.status = 'rejected'; this.value = args; rej(...args); };
				if (this.result) {
					return this.result.then(resolve, reject);
				}
				Object.assign(this, {resolve, reject});
				return callback(resolve, reject);
			}.bind(key);
			super(cb);
			this.resolve = this.resolve.bind(this);
			this.reject = this.reject.bind(this);
			this.key = key;
		}
		resolve(...args) {
			if (this.key.resolve) {
				this.key.resolve(...args);
			} else {
				this.key.result = Promise.resolve(...args);
			}
			return this;
		}
		reject(...args) {
			if (this.key.reject) {
				this.key.reject(...args);
			} else {
				this.key.result = Promise.reject(...args);
			}
			return this;
		}
		addCallback(callback) {
			Promise.resolve().then(() => callback(this.resolve, this.reject));
			return this;
		}
	}
	return PromiseHandler;
})();
const {Emitter} = (() => {
	let totalCount = 0;
	let warnings = [];
	class Emitter {
		on(name, callback) {
			if (!this._events) {
				Emitter.totalCount++;
				this._events = new Map();
			}
			name = name.toLowerCase();
			let e = this._events.get(name);
			if (!e) {
				e = this._events.set(name, new Handler(callback));
			} else {
				e.add(callback);
			}
			if (e.length > 10) {
				!Emitter.warnings.includes(this) && Emitter.warnings.push(this);
			}
			return this;
		}
		off(name, callback) {
			if (!this._events) {
				return;
			}
			name = name.toLowerCase();
			const e = this._events.get(name);
			if (!this._events.has(name)) {
				return;
			} else if (!callback) {
				this._events.delete(name);
			} else {
				e.remove(callback);
				if (e.isEmpty) {
					this._events.delete(name);
				}
			}
			if (this._events.size < 1) {
				delete this._events;
			}
			return this;
		}
		once(name, func) {
			const wrapper = (...args) => {
				func(...args);
				this.off(name, wrapper);
				wrapper._original = null;
			};
			wrapper._original = func;
			return this.on(name, wrapper);
		}
		clear(name) {
			if (!this._events) {
				return;
			}
			if (name) {
				this._events.delete(name);
			} else {
				delete this._events;
				Emitter.totalCount--;
			}
			return this;
		}
		emit(name, ...args) {
			if (!this._events) {
				return;
			}
			name = name.toLowerCase();
			const e = this._events.get(name);
			if (!e) {
				return;
			}
			e.exec(...args);
			return this;
		}
		emitAsync(...args) {
			if (!this._events) {
				return;
			}
			setTimeout(() => this.emit(...args), 0);
			return this;
		}
		promise(name, callback) {
			if (!this._promise) {
				this._promise = {};
			}
			const p = this._promise[name];
			if (p) {
				return callback ? p.addCallback(callback) : p;
			}
			return this._promise[name] = new PromiseHandler(callback);
		}
		emitResolve(name, ...args) {
			if (!this._promise) {
				this._promise = {};
			}
			if (!this._promise[name]) {
				this._promise[name] = new PromiseHandler();
			}
			this._promise[name].resolve(...args);
		}
		emitReject(name, ...args) {
			if (!this._promise) {
				this._promise = {};
			}
			if (!this._promise[name]) {
				this._promise[name] = new PromiseHandler();
			}
			this._promise[name].reject(...args);
		}
		resetPromise(name) {
			if (!this._promise) { return; }
			delete this._promise[name];
		}
		hasPromise(name) {
			return this._promise && !!this._promise[name];
		}
	}
	Emitter.totalCount = totalCount;
	Emitter.warnings = warnings;
	return {Emitter};
})();
	return {Handler, PromiseHandler, Emitter};
}
const {Handler, PromiseHandler, Emitter} = EmitterInitFunc();
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
			try {
				let result;
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
			};
			self.post = post.bind({sessionId: 0}, this.port || self);
			self.emit = emit.bind({}, self);
			self.notify = notify.bind({}, self);
			self.alert = alert.bind({}, self);
			self.ping = ping.bind({}, self);
			return self;
		};
		bindFunc(self);
		self.xFetch = async (url, options = {}) => {
			options = {...options, ...{signal: null}}; // remove AbortController
			if (url.startsWith(location.origin)) {
				return fetch(url, options);
			}
			const result = await self.post({command: 'fetch', params: {url, options}});
			const {buffer, init, headers} = result;
			const _headers = new Headers();
			(headers || []).forEach(a => _headers.append(...a));
			const _init = {
				status: init.status,
				statusText: init.statusText || '',
				headers: _headers
			};
			return new Response(buffer, _init);
		};
	};
	const workerUtil = {
		isAvailable,
		js: (q, ...args) => {
			const strargs = args.map(a => typeof a === 'string' ? a : a.toString);
			return String.raw(q, ...strargs);
		},
		env: params => {
			({config, TOKEN, PRODUCT, netUtil, CONSTANT, global} =
				Object.assign({config, TOKEN, PRODUCT, netUtil, CONSTANT, global}, params));
			if (global) { ({config, TOKEN, PRODUCT, CONSTANT} = global); }
		},
		create: function(func, options = {}) {
			let cache = this.urlMap.get(func);
			const name = options.name || 'Worker';
			if (!cache) {
				const src = `
				const PID = '${window && window.name || 'self'}:${location.href}:${name}:${Date.now().toString(16).toUpperCase()}';
				console.log('%cinit %s %s', 'font-weight: bold;', self.name || '', '${PRODUCT}', location.origin);
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
								break;
						case 'emit':
							global && global.emitter.emitAsync(params.eventName, params.data);
							break;
						case 'fetch':
							result = await (netUtil || window).fetch(params.url,
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
				.catch(result => console.warn('FAIL', result));
			return self;
		}.bind({
			sessionId: 0,
			promises: {}
		})
	};
	return workerUtil;
})();
const IndexedDbStorage = (() => {
	const workerFunc = function(self) {
		const db = {};
		const controller = {
			async init({name, ver, stores}) {
				if (db[name]) {
					return Promise.resolve(db[name]);
				}
				return new Promise((resolve, reject) => {
					const req = indexedDB.open(name, ver);
					req.onupgradeneeded = e => {
						const _db = e.target.result;
						for (const meta of stores) {
							if(_db.objectStoreNames.contains(meta.name)) {
								_db.deleteObjectStore(meta.name);
							}
							const store = _db.createObjectStore(meta.name, meta.definition);
							const indexes = meta.indexes || [];
							for (const idx of indexes) {
								store.createIndex(idx.name, idx.keyPath, idx.params);
							}
							store.transaction.oncomplete = () => {
								console.log('store.transaction.complete', JSON.stringify({name, ver, store: meta}));
							};
						}
					};
					req.onsuccess = e => {
						db[name] = e.target.result;
						resolve(db[name]);
					};
					req.onerror = reject;
				});
			},
			close({name}) {
				if (!db[name]) {
					return;
				}
				db[name].close();
				db[name] = null;
			},
			async getStore({name, storeName, mode = 'readonly'}) {
				const db = await this.init({name});
				return new Promise(async (resolve, reject) => {
					const tx = db.transaction(storeName, mode);
					tx.onerror = reject;
					return resolve({
						store: tx.objectStore(storeName),
						transaction: tx
					});
				});
			},
			async put({name, storeName, data}) {
				const {store, transaction} = await this.getStore({name, storeName, mode: 'readwrite'});
				return new Promise((resolve, reject) => {
					const req = store.put(data);
					req.onsuccess = e => {
						transaction.commit && transaction.commit();
						resolve(e.target.result);
					};
					req.onerror = reject;
				});
			},
			async get({name, storeName, data: {key, index, timeout}}) {
				const {store} = await this.getStore({name, storeName});
				return new Promise((resolve, reject) => {
					const req =
						index ?
							store.index(index).get(key) : store.get(key);
					req.onsuccess = e => resolve(e.target.result);
					req.onerror = reject;
					if (timeout) {
						setTimeout(() => {
							reject(`timeout: key${key}`);
						}, timeout);
					}
				});
			},
			async updateTime({name, storeName, data: {key, index, timeout}}) {
				const record = await this.get({name, storeName, data: {key, index, timeout}});
				if (!record) {
					return null;
				}
				record.updatedAt = Date.now();
				this.put({name, storeName, data: record});
				return record;
			},
			async delete({name, storeName, data: {key, index}}) {
				const {store, transaction} = await this.getStore({name, storeName, mode: 'readwrite'});
				return new Promise((resolve, reject) => {
					let remove = 0;
					let range = IDBKeyRange.only(key);
					let req =
						index ?
							store.index(index).openCursor(range) : store.openCursor(range);
					req.onsuccess = e =>  {
						const result = e.target.result;
						if (!result) {
							transaction.commit && transaction.commit();
							return resolve(remove > 0);
						}
						result.delete();
						remove++;
						result.continue();
					};
					req.onerror = reject;
				});
			},
			async clear({name, storeName}) {
				const {store} = await this.getStore({name, storeName, mode: 'readwrite'});
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
			},
			async gc({name, storeName, data: {expireTime, index}}) {
				index = index || 'updatedAt';
				const {store, transaction} = await this.getStore({name, storeName, mode: 'readwrite'});
				const now = Date.now(), ptime = performance.now();
				const expiresAt = (index !== 'expiresAt') ? (now - expireTime) : now;
				const expireDateTime = new Date(expiresAt).toLocaleString();
				const timekey = `GC [DELETE FROM ${name}.${storeName} WHERE ${index} < '${expireDateTime}'] `;
				console.time(timekey);
				let count = 0;
				return new Promise((resolve, reject) => {
					const range = IDBKeyRange.upperBound(expiresAt);
					const idx = store.index(index);
					const req = idx.openCursor(range);
					req.onsuccess = e => {
						const cursor = e.target.result;
						if (cursor) {
							count++;
							cursor.delete();
							return cursor.continue();
						}
						console.timeEnd(timekey);
						resolve({status: 'ok', count, time: performance.now() - ptime});
						count && console.log('deleted %s records.', count);
					};
					req.onerror = reject;
				}).catch(e => {
					console.error('gc fail', {name, storeName, data: {expireTime, index}, timekey}, e);
					store.clear();
				});
			}
		};
		self.onmessage = async ({command, params}) => {
			try {
			switch (command) {
				case 'init':
					await controller[command](params);
					return 'ok';
				case 'put':
					return controller.put(params);
				case 'updateTime':
				case 'get':
					return controller[command](params);
				default:
					return controller[command](params) || 'ok';
				}
			} catch (err) {
				console.warn('command failed: ', {command, params});
				throw err;
			}
		};
		return controller;
	};
	const workers = new Map;
	const open = async ({name, ver, stores}, func) => {
		let worker;
		if (func) {
			let _func = workerFunc;
			if (func) {
				_func = `
				(() => {
				const controller = (${workerFunc.toString()})(self);
				(${func.toString()})(self)
				})
				`;
			}
			worker = workers.get(func) || workerUtil.createCrossMessageWorker(_func, {name: `IndexedDb[${name}]`});
			workers.set(func, worker);
		} else {
			worker = workers.get(workerFunc) || workerUtil.createCrossMessageWorker(workerFunc, {name: 'IndexedDb'});
			workers.set(workerFunc, worker);
		}
		worker.post({command: 'init', params: {name, ver, stores}});
		const post = (command, data, storeName, transfer) => {
			const params = {data, name, storeName, transfer};
			return worker.post({command, params}, transfer);
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
	};
	return {open};
})();
const WatchInfoCacheDb = (() => {
	const WATCH_INFO = {
		name: 'watch-info',
		ver: 2,
		stores: [
			{
				name: 'cache',
				indexes: [
					{name: 'videoId',    keyPath: 'videoId',    params: {unique: false}},
					{name: 'threadId',   keyPath: 'threadId',   params: {unique: false}},
					{name: 'ownerId',    keyPath: 'ownerId',    params: {unique: false}},
					{name: 'watchCount', keyPath: 'watchCount', params: {unique: false}},
					{name: 'postedAt',   keyPath: 'postedAt',   params: {unique: false}},
					{name: 'updatedAt',  keyPath: 'updatedAt',  params: {unique: false}},
				],
				definition: {keyPath: 'watchId', autoIncrement: false}
			}
		]
	};
	let db, instance, NicoVideoApi;
	const initWorker = async () => {
		if (db) { return db; }
		if (location.host === 'www.nicovideo.jp') {
			db = db || await IndexedDbStorage.open(WATCH_INFO);
		} else {
			db = db || await NicoVideoApi.bridgeDb(WATCH_INFO);
		}
		return db;
	};
	const open = async () => {
		if (instance) { return instance; }
		await initWorker();
		const cacheDb = db['cache'];
		return instance = {
			async put(watchId, options = {}) {
				const videoInfo = options.videoInfo || null;
				const videoInfoRawData = (videoInfo && videoInfo.getData) ? videoInfo.getData() : videoInfo;
				const cache = await this.get(watchId) || {};
				const now = Date.now();
				const videoId = videoInfo ? videoInfo.videoId : watchId;
				const postedAt = videoInfo ? new Date(videoInfo.postedAt).getTime() : 0;
				const threadId = videoInfo ? (videoInfo.threadId * 1) : 0;
				const updatedAt = Date.now();
				const resume = cache.resume || [];
				const watchCount = (cache.watchCount || 0) + (options.watchCount === 1 ? 1 : 0);
				typeof options.currentTime === 'number' && options.currentTime > 0 &&
					(resume.unshift({now, time: options.currentTime}));
				resume.length = Math.min(10, resume.length);
				const ownerId = videoInfo && videoInfo.owner.id ?
					`${videoInfo.isChannel? 'ch' : 'user/'}${videoInfo.owner.id}` : '';
				const comment = cache.comment || [];
				options.comment && (comment.push(comment));
				const record = {
					watchId,
					videoId:  (cache.videoId  ? cache.videoId  : videoId) || '',
					threadId: (cache.threadId ? cache.threadId : threadId) || '',
					ownerId:  (ownerId ? ownerId : cache.ownerId) || '',
					watchCount,
					postedAt: cache && cache.postedAt ? cache.postedAt : postedAt,
					updatedAt,
					videoInfo: videoInfoRawData ? videoInfoRawData : cache.videoInfo,
					threadInfo: (options.threadInfo ? options.threadInfo : cache.threadInfo) || 0,
					comment,
					resume,
					heatMap:    (options.heatMap    ? options.heatMap    : cache.heatMap) || null,
					config:     (options.config     ? options.config     : cache.config) || ''
				};
				cacheDb.put(record);
				return record;
			},
			get(watchId) { return cacheDb.updateTime({key: watchId}); },
			delete(watchId) { return cacheDb.delete({key: watchId}); },
			close() { return cacheDb.close(); },
			gc(expireTime) { return cacheDb.gc(expireTime); }
		};
	};
	const put = (watchId, options = {}) => open().then(db => db.put(watchId, options));
	const get = watchId => open().then(db => db.get(watchId));
	const del = watchId => open().then(db => db.delete(watchId));
	const close = () => open().then(db => db.close());
	const gc = (expireTime) => open().then(db => db.gc(expireTime));
	const api = api => NicoVideoApi = api;
	return {initWorker, open, put, get, delete: del, close, gc, api};
})();
function parseThumbInfo(xmlText) {
	if (typeof xmlText !== 'string' || xmlText.status === 'ok') {
		return xmlText;
	}
	const parser = new DOMParser();
	const xml = parser.parseFromString(xmlText, 'text/xml');
	const val = name => {
		const elms = xml.getElementsByTagName(name);
		if (elms.length < 1) {
			return null;
		}
		return elms[0].textContent;
	};
	const dateToString = dateString => {
		const date = new Date(dateString);
		const [yy, mm, dd, h, m, s] = [
				date.getFullYear(),
				date.getMonth() + 1,
				date.getDate(),
				date.getHours(),
				date.getMinutes(),
				date.getSeconds()
			].map(n => n.toString().padStart(2, '0'));
		return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
	};
	const resp = xml.getElementsByTagName('nicovideo_thumb_response');
	if (resp.length < 1 || resp[0].getAttribute('status') !== 'ok') {
		return {
			status: 'fail',
			code: val('code'),
			message: val('description')
		};
	}
	const [min, sec] = val('length').split(':');
	const duration = min * 60 + sec * 1;
	const watchId = val('watch_url').split('/').reverse()[0];
	const postedAt = dateToString(new Date(val('first_retrieve')));
	const tags = [...xml.getElementsByTagName('tag')].map(tag => {
			return {
				text: tag.textContent,
				category: tag.hasAttribute('category'),
				lock: tag.hasAttribute('lock')
			};
		});
	const videoId = val('video_id');
	const isChannel = videoId.substring(0, 2) === 'so';
	const result = {
		status: 'ok',
		_format: 'thumbInfo',
		v: isChannel ? videoId : watchId,
		id: videoId,
		videoId,
		watchId: isChannel ? videoId : watchId,
		originalVideoId: (!isChannel && watchId !== videoId) ? videoId : '',
		isChannel,
		title: val('title'),
		description: val('description'),
		thumbnail: val('thumbnail_url').replace(/^http:/, 'https:'),
		movieType: val('movie_type'),
		lastResBody: val('last_res_body'),
		duration,
		postedAt,
		mylistCount: parseInt(val('mylist_counter'), 10),
		viewCount: parseInt(val('view_counter'), 10),
		commentCount: parseInt(val('comment_num'), 10),
		tagList: tags
	};
	const userId = val('user_id');
	if (userId !== null && userId !== '') {
		result.owner = {
			type: 'user',
			id: userId,
			linkId: userId ? `user/${userId}` : '',
			name: val('user_nickname') || '(非公開ユーザー)',
			url: userId ? ('https://www.nicovideo.jp/user/' + userId) : '#',
			icon: val('user_icon_url') || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg'
		};
	}
	const channelId = val('ch_id');
	if (channelId !== null && channelId !== '') {
		result.owner = {
			type: 'channel',
			id: channelId,
			linkId: channelId ? `ch${channelId}` : '',
			name: val('ch_name') || '(非公開チャンネル)',
			url: 'https://ch.nicovideo.jp/ch' + channelId,
			icon: val('ch_icon_url') || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg'
		};
	}
	return result;
}
const StoryboardCacheDb = (() => {
	const WATCH_INFO = {
		name: 'storyboard',
		ver: 2,
		stores: [
			{
				name: 'cache',
				indexes: [
					{name: 'updatedAt',  keyPath: 'updatedAt',  params: {unique: false}},
				],
				definition: {keyPath: 'watchId', autoIncrement: false}
			}
		]
	};
	let db, instance, NicoVideoApi;
	const initWorker = async () => {
		if (db) { return db; }
		if (location.host === 'www.nicovideo.jp') {
			db = db || await IndexedDbStorage.open(WATCH_INFO);
		} else {
			db = db || await NicoVideoApi.bridgeDb(WATCH_INFO);
		}
		return db;
	};
	const open = async () => {
		if (instance) { return instance; }
		await initWorker();
		const cacheDb = db['cache'];
		instance = {
			async put(watchId, sbInfo = {}) {
				if (sbInfo.status !== 'ok') {
					console.warn('invalid sbInfo', watchId, sbInfo);
					return;
				}
				const record = {
					watchId,
					updatedAt: Date.now(),
					sbInfo
				};
				cacheDb.put(record);
				return record;
			},
			async get(watchId) {
				const record = await cacheDb.updateTime({key: watchId});
				if (!record) { return null; }
				return record.sbInfo;
			},
			delete(watchId) { return cacheDb.delete({key: watchId}); },
			close() { return cacheDb.close(); },
			gc(expireTime) { return cacheDb.gc(expireTime); }
		};
		instance.gc(7 * 24 * 60 * 60 * 1000);
		return instance;
	};
	const put = (watchId, sbInfo = {}) => open().then(db => db.put(watchId, sbInfo));
	const get = watchId => open().then(db => db.get(watchId));
	const del = watchId => open().then(db => db.delete(watchId));
	const close = () => open().then(db => db.close());
	const gc = (expireTime = 24 * 60 * 60 * 1000) => open().then(db => db.gc(expireTime));
	const api = api => NicoVideoApi = api;
	return {initWorker, open, put, get, delete: del, close, gc, db, api};
})();
const VideoSessionWorker = (() => {
	const func = function(self) {
		const SMILE_HEART_BEAT_INTERVAL_MS = 10 * 60 * 1000; // 10min
		const DMC_HEART_BEAT_INTERVAL_MS = 30 * 1000;      // 30sec
		const SESSION_CLOSE_FAIL_COUNT = 3;
		const VIDEO_QUALITY = {
			auto: /.*/,
			veryhigh: /_(1080p)$/,
			high: /_(720p)$/,
			mid: /_(540p|480p)$/,
			low: /_(360p)$/
		};
		const util = {
			fetch(url, params = {}) {
				if (!location.origin.endsWith('.nicovideo.jp')) {
					return self.xFetch(url, params);
				}
				const racers = [];
				let timer;
				const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
				if (timeout > 0) {
					racers.push(new Promise((resolve, reject) =>
						timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
					);
				}
				const controller = AbortController ? (new AbortController()) : null;
				if (controller) {
					params.signal = controller.signal;
				}
				racers.push(fetch(url, params));
				return Promise.race(racers).catch(err => {
					if (err.name === 'timeout') {
						console.warn('request timeout', url, params);
						if (controller) {
							controller.abort();
						}
					}
					return Promise.reject(err.message || err);
				}).finally(() => timer = null);
			}
		};
		class DmcPostData {
			constructor(dmcInfo, videoQuality, {useHLS = true, useSSL = false}) {
				this._dmcInfo = dmcInfo;
				this._videoQuality = videoQuality || 'auto';
				this._useHLS = useHLS;
				this._useSSL = useSSL;
				this._useWellKnownPort = true;
			}
			toString() {
				let dmcInfo = this._dmcInfo;
				let videos = [];
				let availableVideos =
					dmcInfo.quality.videos.filter(v => v.available)
						.sort((a, b) => b.level_index - a.level_index);
				let reg = VIDEO_QUALITY[this._videoQuality] || VIDEO_QUALITY.auto;
				if (reg === VIDEO_QUALITY.auto) {
					videos = availableVideos.map(v => v.id);
				} else {
					availableVideos.forEach(format => {
						if (reg.test(format.id)) {
							videos.push(format.id);
						}
					});
					if (videos.length < 1) {
						videos[0] = availableVideos[0].id;
					}
				}
				let audios = [dmcInfo.audios[0]];
				let contentSrcIdSets =
					(this._useHLS && reg === VIDEO_QUALITY.auto) ?
						this._buildAbrContentSrcIdSets(videos, audios) :
						this._buildContentSrcIdSets(videos, audios);
				let http_parameters = {};
				let parameters = {
					use_ssl: this._useSSL ? 'yes' : 'no',
					use_well_known_port: this._useWellKnownPort ? 'yes' : 'no',
					transfer_preset: dmcInfo.transferPreset
				};
				if (this._useHLS) {
					parameters.segment_duration = 6000;//Config.getValue('video.hls.segmentDuration');
					if (dmcInfo.encryption){
						parameters.encryption = dmcInfo.encryption;
					}
				} else if (!dmcInfo.protocols.includes('http')) {
					throw new Error('HLSに未対応');
				}
				http_parameters.parameters = this._useHLS ?
					{hls_parameters: parameters} :
					{http_output_download_parameters: parameters};
				const request = {
					session: {
						client_info: {
							player_id: dmcInfo.playerId
						},
						content_auth: {
							auth_type: dmcInfo.authTypes[this._useHLS ? 'hls' : 'http'] || 'ht2',
							content_key_timeout: 600 * 1000,
							service_id: 'nicovideo',
							service_user_id: dmcInfo.serviceUserId,
						},
						content_id: dmcInfo.contentId,
						content_src_id_sets: contentSrcIdSets,
						content_type: 'movie',
						content_uri: '',
						keep_method: {
							heartbeat: {lifetime: dmcInfo.heartBeatLifeTimeMs}
						},
						priority: dmcInfo.priority,
						protocol: {
							name: 'http',
							parameters: {http_parameters}
						},
						recipe_id: dmcInfo.recipeId,
						session_operation_auth: {
							session_operation_auth_by_signature: {
								signature: dmcInfo.signature,
								token: dmcInfo.token
							}
						},
						timing_constraint: 'unlimited'
					}
				};
				return JSON.stringify(request, null, 2);
			}
			_buildContentSrcIdSets(videos, audios) {
				return [
					{
						content_src_ids: [
							{
								src_id_to_mux: {
									audio_src_ids: audios,
									video_src_ids: videos
								}
							}
						]
					}
				];
			}
			_buildAbrContentSrcIdSets(videos, audios) {
				const v = videos.concat();
				const contentSrcIds = [];
				while (v.length > 0) {
					contentSrcIds.push({
						src_id_to_mux: {
							audio_src_ids: [audios[0]],
							video_src_ids: v.concat()
						}
					});
					v.shift();
				}
				return [{content_src_ids: contentSrcIds}];
			}
		}
		class VideoSession {
			static create(params) {
				if (params.serverType === 'dmc') {
					return new DmcSession(params);
				} else {
					return new SmileSession(params);
				}
			}
			constructor(params) {
				this._videoInfo = params.videoInfo;
				this._dmcInfo = params.dmcInfo;
				this._isPlaying = () => true;
				this._pauseCount = 0;
				this._failCount = 0;
				this._lastResponse = '';
				this._videoQuality = params.videoQuality || 'auto';
				this._videoSessionInfo = {};
				this._isDeleted = false;
				this._isAbnormallyClosed = false;
				this._heartBeatTimer = null;
				this._useSSL = !!params.useSSL;
				this._useWellKnownPort = true;
				this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
				this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
			}
			connect() {
				this._createdAt = Date.now();
				return this._createSession(this._videoInfo, this._dmcInfo);
			}
			enableHeartBeat() {
				this.disableHeartBeat();
				this._heartBeatTimer =
					setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
			}
			changeHeartBeatInterval(interval) {
				if (this._heartBeatTimer) {
					clearInterval(this._heartBeatTimer);
				}
				this._heartBeatInterval = interval;
				this._heartBeatTimer =
					setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
			}
			disableHeartBeat() {
				if (this._heartBeatTimer) {
					clearInterval(this._heartBeatTimer);
				}
				this._heartBeatTimer = null;
			}
			_onHeartBeatInterval() {
				if (this._isClosed) {
					return;
				}
				this._heartBeat();
			}
			_onHeartBeatSuccess() {}
			_onHeartBeatFail() {
				this._failCount++;
				if (this._failCount >= SESSION_CLOSE_FAIL_COUNT) {
					this._isAbnormallyClosed = true;
					this.close();
				}
			}
			close() {
				this._isClosed = true;
				this.disableHeartBeat();
				return this._deleteSession();
			}
			get isDeleted() {
				return !!this._isDeleted;
			}
			get isDmc() {
				return this._serverType === 'dmc';
			}
			get isAbnormallyClosed() {
				return this._isAbnormallyClosed;
			}
		}
		class DmcSession extends VideoSession {
			constructor(params) {
				super(params);
				this._serverType = 'dmc';
				this._heartBeatInterval = DMC_HEART_BEAT_INTERVAL_MS;
				this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
				this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
				this._useHLS = typeof params.useHLS === 'boolean' ? params.useHLS : true;
				this._lastUpdate = Date.now();
				this._heartbeatLifeTime = this._heartbeatInterval;
			}
			_createSession(videoInfo, dmcInfo) {
				console.time('create DMC session');
				const baseUrl = (dmcInfo.urls.find(url => url.is_well_known_port === this._useWellKnownPort) || dmcInfo.urls[0]).url;
				return new Promise((resolve, reject) => {
					const url = `${baseUrl}?_format=json`;
					this._heartbeatLifeTime = dmcInfo.heartbeatLifeTime;
					const postData = new DmcPostData(dmcInfo, this._videoQuality, {
						useHLS: this.useHLS,
						useSSL: url.startsWith('https://'),
						useWellKnownPort: true
					});
					util.fetch(url, {
						method: 'post',
						timeout: 10000,
						dataType: 'text',
						body: postData.toString()
					}).then(res => res.json())
						.then(json => {
							const data = json.data || {}, session = data.session || {};
							let sessionId = session.id;
							let content_src_id_sets = session.content_src_id_sets;
							let videoFormat =
								content_src_id_sets[0].content_src_ids[0].src_id_to_mux.video_src_ids[0];
							let audioFormat =
								content_src_id_sets[0].content_src_ids[0].src_id_to_mux.audio_src_ids[0];
							this._heartBeatUrl =
								`${baseUrl}/${sessionId}?_format=json&_method=PUT`;
							this._deleteSessionUrl =
								`${baseUrl}/${sessionId}?_format=json&_method=DELETE`;
							this._lastResponse = data;
							this._lastUpdate = Date.now();
							this._videoSessionInfo = {
								type: 'dmc',
								url: session.content_uri,
								sessionId,
								videoFormat,
								audioFormat,
								heartBeatUrl: this._heartBeatUrl,
								deleteSessionUrl: this._deleteSessionUrl,
								lastResponse: json
							};
							this.enableHeartBeat();
							console.timeEnd('create DMC session');
							resolve(this._videoSessionInfo);
						}).catch(err => {
						console.error('create api fail', err);
						reject(err.message || err);
					});
				});
			}
			get useHLS() {
				return this._useHLS &&
					this._dmcInfo.protocols.includes('hls');
			}
			_heartBeat() {
				let url = this._videoSessionInfo.heartBeatUrl;
				util.fetch(url, {
					method: 'post',
					dataType: 'text',
					timeout: 10000,
					body: JSON.stringify(this._lastResponse)
				}).then(res => res.json())
					.then(this._onHeartBeatSuccess)
					.catch(this._onHeartBeatFail);
			}
			_deleteSession() {
				if (this._isDeleted) {
					return Promise.resolve();
				}
				this._isDeleted = true;
				let url = this._videoSessionInfo.deleteSessionUrl;
				return new Promise(res => setTimeout(res, 3000)).then(() => {
					return util.fetch(url, {
						method: 'post',
						dataType: 'text',
						timeout: 10000,
						body: JSON.stringify(this._lastResponse)
					});
				}).catch(err => console.error('delete fail', err));
			}
			_onHeartBeatSuccess(result) {
				let json = result;
				this._lastResponse = json.data;
				this._lastUpdate = Date.now();
			}
			get isDeleted() {
				return !!this._isDeleted || (Date.now() - this._lastUpdate) > this._heartbeatLifeTime * 1.2;
			}
		}
		class SmileSession extends VideoSession {
			constructor(params) {
				super(params);
				this._serverType = 'smile';
				this._heartBeatInterval = SMILE_HEART_BEAT_INTERVAL_MS;
				this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
				this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
				this._lastUpdate = Date.now();
			}
			_createSession(videoInfo) {
				this.enableHeartBeat();
				return Promise.resolve(videoInfo.videoUrl);
			}
			_heartBeat() {
				let url = this._videoInfo.watchUrl;
				let query = [
					'mode=pc_html5',
					'playlist_token=' + this._videoInfo.playlistToken,
					'continue_watching=1',
					'watch_harmful=2'
				];
				if (this._videoInfo.isEconomy) {
					query.push(this._videoInfo.isEconomy ? 'eco=1' : 'eco=0');
				}
				if (query.length > 0) {
					url += '?' + query.join('&');
				}
				util.fetch(url, {
					timeout: 10000,
					credentials: 'include'
				}).then(res => res.json())
					.then(this._onHeartBeatSuccess)
					.catch(this._onHeartBeatFail);
			}
			_deleteSession() {
				if (this._isDeleted) {
					return Promise.resolve();
				}
				this._isDeleted = true;
				return Promise.resolve();
			}
			_onHeartBeatSuccess(result) {
				this._lastResponse = result;
				if (result.status !== 'ok') {
					return this._onHeartBeatFail();
				}
				this._lastUpdate = Date.now();
				if (result && result.flashvars && result.flashvars.watchAuthKey) {
					this._videoInfo.watchAuthKey = result.flashvars.watchAuthKey;
				}
			}
			get isDeleted() {
				return this._isDeleted || (Date.now() - this._lastUpdate > 10 * 60 * 1000);
			}
		}
		const DmcStoryboardInfoLoader = (() => {
			const parseStoryboard = sb => {
				const result = {
					id: 0,
					urls: [],
					quality: sb.quality,
					thumbnail: {
						width: sb.thumbnail_width,
						height: sb.thumbnail_height,
						number: null,
						interval: sb.interval
					},
					board: {
						rows: sb.rows,
						cols: sb.columns,
						number: sb.images.length
					}
				};
				sb.images.forEach(image => result.urls.push(image.uri));
				return result;
			};
			const parseMeta = meta => {
				const result = {
					format: 'dmc',
					status: meta.meta.message,
					url: null,
					movieId: null,
					storyboard: []
				};
				meta.data.storyboards.forEach(sb => {
					result.storyboard.unshift(parseStoryboard(sb));
				});
				result.storyboard.sort((a, b) => {
					if (a.quality < b.quality) {
						return 1;
					}
					if (a.quality > b.quality) {
						return -1;
					}
					return 0;
				});
				return result;
			};
			const load = url => {
				return util.fetch(url, {credentials: 'include'}).then(res => res.json())
					.then(info => {
						if (!info.meta || !info.meta.message || info.meta.message !== 'ok') {
							return Promise.reject('storyboard request fail');
						}
						return parseMeta(info);
					});
			};
			return {
				load,
				_parseMeta: parseMeta,
				_parseStoryboard: parseStoryboard
			};
		})();
		class StoryboardSession {
			constructor(info) {
				this._info = info;
				this._url = info.urls[0].url;
			}
			create() {
				const url = `${this._url}?_format=json`;
				const body = this._createRequestString(this._info);
				return util.fetch(url, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json'
					},
					body
				}).then(res => res.json()).catch(err => {
					console.error('create dmc session fail', err);
					return Promise.reject('create dmc session fail');
				});
			}
			_createRequestString(info) {
				if (!info) {
					info = this._info;
				}
				const request = {
					session: {
						client_info: {
							player_id: info.player_id
						},
						content_auth: {
							auth_type: info.auth_types.storyboard,
							content_key_timeout: info.content_key_timeout,
							service_id: 'nicovideo',
							service_user_id: info.service_user_id
						},
						content_id: info.content_id,
						content_src_id_sets: [{
							content_src_ids: []
						}],
						content_type: 'video',
						content_uri: '',
						keep_method: {
							heartbeat: {
								lifetime: info.heartbeat_lifetime
							}
						},
						priority: info.priority,
						protocol: {
							name: 'http',
							parameters: {
								http_parameters: {
									parameters: {
										storyboard_download_parameters: {
											use_well_known_port: info.urls[0].is_well_known_port ? 'yes' : 'no',
											use_ssl: info.urls[0].is_ssl ? 'yes' : 'no'
										}
									}
								}
							}
						},
						recipe_id: info.recipe_id,
						session_operation_auth: {
							session_operation_auth_by_signature: {
								signature: info.signature,
								token: info.token
							}
						},
						timing_constraint: 'unlimited'
					}
				};
				(info.videos || []).forEach(video => {
					request.session.content_src_id_sets[0].content_src_ids.push(video);
				});
				return JSON.stringify(request);
			}
		}
		const SESSION_ID = Symbol('SESSION_ID');
		const getSessionId = function() { return `session_${this.id++}`; }.bind({id: 0});
		let current = null;
		const create = async ({videoInfo, dmcInfo, videoQuality, serverType, useHLS}) => {
			if (current) {
				current.close();
				current = null;
			}
			current = await VideoSession.create({
				videoInfo, dmcInfo, videoQuality, serverType, useHLS});
			const sessionId = getSessionId();
			current[SESSION_ID] = sessionId;
			return {
				isDmc: current.isDmc,
				sessionId
			};
		};
		const connect = async () => {
			return current.connect();
		};
		const getState = () => {
			if (!current) {
				return {};
			}
			return {
				isDmc: current.isDmc,
				isDeleted: current.isDeleted,
				isAbnormallyClosed: current.isAbnormallyClosed,
				sessionId: current[SESSION_ID]
			};
		};
		const close = () => {
			current && current.close();
			current = null;
		};
		const storyboard = async ({info, duration}) => {
			const result = await new StoryboardSession(info).create();
			if (!result || !result.data || !result.data.session || !result.data.session.content_uri) {
				return Promise.reject('DMC storyboard api not exist');
			}
			const uri = result.data.session.content_uri;
			const sbInfo = await DmcStoryboardInfoLoader.load(uri);
			for (let board of sbInfo.storyboard) {
				board.thumbnail.number = Math.floor(duration * 1000 / board.thumbnail.interval);
				board.urls = await Promise.all(
					board.urls.map(url => fetch(url).then(r => r.arrayBuffer()).catch(() => url)
				));
				break; // 二番目以降は低画質
			}
			sbInfo.duration = duration;
			return sbInfo;
		};
		self.onmessage = async ({command, params}) => {
			switch (command) {
				case 'create':
					return create(params);
				case 'connect':
					return await connect();
				case 'getState':
					return getState();
				case 'close':
					return close();
				case 'storyboard':
					return await storyboard(params);
			}
		};
	};
	let worker;
	const initWorker = () => {
		if (worker) { return worker; }
		worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'VideoSessionWorker'});
	};
	const create = async ({videoInfo, videoQuality, serverType, useHLS}) => {
		await initWorker();
		const params = {
			videoInfo: videoInfo.getData(),
			dmcInfo: videoInfo.dmcInfo ? videoInfo.dmcInfo.getData() : null,
			videoQuality,
			serverType,
			useHLS
		};
		const result = await worker.post({command: 'create', params});
		const sessionId = result.sessionId;
		return Object.assign(result, {
			connect: () => worker.post({command: 'connect', params: {sessionId}}),
			getState: () => worker.post({command: 'getState', params: {sessionId}}),
			close: () => worker.post({command: 'close', params: {sessionId}})
		});
	};
	const storyboard = async (watchId, sbSessionInfo, duration) => {
		const cache = await StoryboardCacheDb.get(watchId);
		if (cache) {
			return cache;
		}
		worker = worker || workerUtil.createCrossMessageWorker(func);
		const params = {info: sbSessionInfo, duration};
		const sbInfo = await worker.post({command: 'storyboard', params});
		sbInfo.watchId = watchId;
		StoryboardCacheDb.put(watchId, sbInfo);
		return sbInfo;
	};
	return {initWorker, create, storyboard};
})();

  window.ZenzaLib = Object.assign(window.ZenzaLib || {}, {
    workerUtil,
    IndexedDbStorage, WatchInfoCacheDb,
    Handler, PromiseHandler, Emitter, EmitterInitFunc,
    parseThumbInfo, StoryboardCacheDb, VideoSessionWorker
  });
})();

const GateAPI = (() => {
	const {Handler, PromiseHandler, Emitter, EmitterInitFunc, workerUtil, parseThumbInfo} = window.ZenzaLib || {};
const gate = () => {
	const post = function(body, {type, token, sessionId, origin} = {}) {
		sessionId = sessionId || '';
		origin = origin || '';
		this.origin = origin = origin || this.origin || document.referrer;
		this.token = token = token || this.token;
		this.type = type = type || this.type;
		if (!this.channel) {
			this.channel = new MessageChannel;
		}
		const url = location.href;
		const id = PRODUCT;
		try {
			const msg = {id, type, token, url, sessionId, body};
			if (!this.port) {
				msg.body = {command: 'initialized', params: msg.body};
				parent.postMessage(msg, origin, [this.channel.port2]);
				this.port = this.channel.port1;
				this.port.start();
			} else {
				this.port.postMessage(msg);
			}
		} catch (e) {
			console.error('%cError: parent.postMessage - ', 'color: red; background: yellow', e);
		}
		return this.port;
	}.bind({channel: null, port: null, origin: null, token: null, type: null});
	const parseUrl = url => {
		url = url || 'https://unknown.example.com/';
		const a = document.createElement('a');
		a.href = url;
		return a;
	};
	const isNicoServiceHost = url => {
		const host = parseUrl(url).hostname;
		return /(^[a-z0-9.-]*\.nicovideo\.jp$|^[a-z0-9.-]*\.nico(|:[0-9]+)$)/.test(host);
	};
	const isWhiteHost = url => {
		const u = parseUrl(url);
		const host = u.hostname;
		if (['account.nicovideo.jp', 'point.nicovideo.jp'].includes(host)) {
			return false;
		}
		if (isNicoServiceHost(url)) {
			return true;
		}
		if (['localhost', '127.0.0.1'].includes(host)) { return true; }
		if (localStorage.ZenzaWatch_whiteHost) {
			if (localStorage.ZenzaWatch_whiteHost.split(',').includes(host)) {
				return true;
			}
		}
		if (u.protocol !== 'https:') { return false; }
		return [
			'google.com',
			'www.google.com',
			'www.google.co.jp',
			'www.bing.com',
			'twitter.com',
			'friends.nico',
			'feedly.com',
			'www.youtube.com',
		].includes(host) || host.endsWith('.slack.com');
	};
	const uFetch = params => {
		const {url, options}= params;
		if (!isWhiteHost(url) || !isNicoServiceHost(url)) {
			return Promise.reject({status: 'fail', message: 'network error'});
		}
		const racers = [];
		let timer;
		const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
		if (timeout > 0) {
			racers.push(new Promise((resolve, reject) =>
				timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
			);
		}
		const controller = AbortController ? (new AbortController()) : null;
		if (controller) {
			params.signal = controller.signal;
		}
		racers.push(fetch(url, options));
		return Promise.race(racers)
			.catch(err => {
			let message = 'uFetch fail';
			if (err && err.name === 'timeout') {
				if (controller) {
					console.warn('request timeout');
					controller.abort();
				}
				message = 'timeout';
			}
			return Promise.reject({status: 'fail', message});
		}).finally(() => { timer && clearTimeout(timer); });
	};
	const xFetch = (params, sessionId = null) => {
		const command = 'fetch';
		return uFetch(params).then(async resp => {
			const buffer = await resp.arrayBuffer();
			const init = ['type', 'url', 'redirected', 'status', 'ok', 'statusText']
					.reduce((map, key) => {map[key] = resp[key]; return map;}, {});
			const headers = [...resp.headers.entries()];
			return Promise.resolve({buffer, init, headers});
		}).then(({buffer, init, headers}) => {
			const result = {status: 'ok', command, params: {buffer, init, headers}};
			post(result, {sessionId});
			return result;
		}).catch(({status, message}) => {
			post({status, message, command}, {sessionId});
		});
	};
	const init = ({prefix, type}) => {
		if (!window.name.startsWith(prefix)) {
			throw new Error(`unknown name "${window.name}"`);
		}
		const PID = `${window && window.name || 'self'}:${location.host}:${name}:${Date.now().toString(16).toUpperCase()}`;
		type = type || window.name.replace(new RegExp(`/(${PRODUCT}|)Loader$/`), '');
		const origin = document.referrer || window.name.split('#')[1];
		console.log('%cCrossDomainPort: host:%s window:%s', 'background: lightgreen;', location.host, window.name.split('#')[0]);
		if (!isWhiteHost(origin)) {
			throw new Error(`disable bridge "${origin}"`);
		}
		const TOKEN = location.hash ? location.hash.substring(1) : null;
		window.history.replaceState(null, null, location.pathname);
		const port = post({status: 'ok', command: 'initialized'}, {type, token: TOKEN, origin});
		workerUtil && workerUtil.env({TOKEN, PRODUCT});
		return {port, TOKEN, origin, type, PID};
	};
	return {post, parseUrl, isNicoServiceHost, isWhiteHost, uFetch, xFetch, init};
};
	const {post, parseUrl, xFetch, uFetch, init} = gate();
	const {IndexedDbStorage} = window.ZenzaLib;
const ThumbInfoCacheDb = (() => {
	const THUMB_INFO = {
		name: 'thumb-info',
		ver: 1,
		stores: [
			{
				name: 'cache',
				indexes: [
					{name: 'postedAt', keyPath: 'postedAt', params: {unique: false}},
					{name: 'updatedAt', keyPath: 'updatedAt', params: {unique: false}}
				],
				definition: {keyPath: 'watchId', autoIncrement: false}
			}
		]
	};
	let db;
	const open = async () => {
		db = db || await IndexedDbStorage.open(THUMB_INFO);
		const cacheDb = db['cache'];
		cacheDb.gc(90 * 24 * 60 * 60 * 1000);
		return {
			put: (xml, thumbInfo = null) => {
				thumbInfo = thumbInfo || parseThumbInfo(xml);
				if (thumbInfo.status !== 'ok') {
					return;
				}
				const watchId = thumbInfo.v;
				const videoId = thumbInfo.id;
				const postedAt = new Date(thumbInfo.postedAt).getTime();
				const updatedAt = Date.now();
				const record = {
					watchId,
					videoId,
					postedAt,
					updatedAt,
					xml,
					thumbInfo
				};
				cacheDb.put(record);
				return {watchId, updatedAt};
			},
			get: watchId => cacheDb.updateTime({key: watchId}),
			delete: watchId => cacheDb.delete({key: watchId}),
			close: () => cacheDb.close()
		};
	};
	return {open};
})();
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
			if (cache && cache.thumbInfo.status === 'ok' && cache.updatedAt > expiresAt) {
				return post({status: 'ok', command, params: cache.thumbInfo}, {sessionId});
			}
			delete params.options.credentials;
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
		console.log('enable bridge', origin);
		let isOk = false;
		const pushHistory = ({path, title = ''}) => {
			window.history.replaceState(null, title, path);
			if (broadcastChannel) {
				broadcastChannel.postMessage({body: {
					command: 'message', params: {command: 'pushHistory', params: {path, title}}
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
			const {command} = params;
			if (command === 'open') {
				const {name, ver, stores} = params.params;
				const db = dbMap[name] || await IndexedDbStorage.open({name, ver, stores});
				dbMap[name] = db;
				return post({status: 'ok', command: 'bridge-db-result', params: {name, ver}}, {sessionId});
			}
			const {name, storeName, transfer, data} = params.params;
			const {key, index, timeout, expireTime} = data;
			const db = dbMap[name][storeName];
			let result = 'ok';
			switch(command) {
				case 'close':
					await db.close();
					break;
				case 'put':
					await db.put(data, transfer);
					break;
				case 'get':
					result = await db.get({key, index, timeout});
					break;
				case 'updateTime':
					result = await db.updateTime({key, index, timeout});
					break;
				case 'delete':
					await db.delete({key, index, timeout});
					break;
				case 'gc':
					await db.gc(expireTime, index);
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
				post({command, params: {dataUrl}}, {sessionId});
			});
		});
	};
	const search = () => {
		const {port, TOKEN} = init({prefix: `searchApi${PRODUCT}Loader`, type: 'searchApi'});
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

const boot = async (monkey, PRODUCT, START_PAGE_QUERY) => {
	if (window.ZenzaWatch) {
		return;
	}
	const document = window.document;
	const host = window.location.host || '';
	const name = window.name || '';
	const href = (location.href || '').replace(/#.*$/, '');
	if (href === 'https://www.nicovideo.jp/robots.txt' &&
		name.startsWith(`nicovideoApi${PRODUCT}Loader`)) {
		GateAPI.nicovideo();
	} else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
		GateAPI.smile();
	} else if (host === 'api.search.nicovideo.jp' && name.startsWith(`searchApi${PRODUCT}Loader`)) {
		GateAPI.search();
	} else if (host === 'ext.nicovideo.jp' && name.startsWith(`thumbInfo${PRODUCT}Loader`)) {
		GateAPI.thumbInfo();
	} else if (host === 'ext.nicovideo.jp' && name.startsWith(`videoInfo${PRODUCT}Loader`)) {
		GateAPI.exApi();
	} else if (window === window.top) {
		await AntiPrototypeJs();
		if (window.ZenzaLib) {
			window.ZenzaJQuery = window.ZenzaLib.$;
			const script = document.createElement('script');
			script.id = `${PRODUCT}Loader`;
			script.setAttribute('type', 'text/javascript');
			script.setAttribute('charset', 'UTF-8');
			script.append(
				`(${monkey})('${PRODUCT}', '${encodeURIComponent(START_PAGE_QUERY)}');`);
			document.head.append(script);
		}
(() => { // 古いページで使われているがパフォーマンス的にちょっとアレなのでリプレースする
	if (window !== top || location.host !== 'www.nicovideo.jp') {
		return;
	}
	const override = () => {
		const LazyImage = window.Nico && window.Nico.LazyImage;
		if (!LazyImage) { return; }
		const isInitialized = !!LazyImage.pageObserver;
		console.log('override Nico.LazyImage...');
		if (isInitialized) {
			clearInterval(LazyImage.pageObserver);
		}
		Object.assign(LazyImage, {
			waitings: {
				get length() { return 0; },
				push(v) { return v; },
				splice() { return []; }
			},
			initialize() {
				this._setPageObserver();
			},
			reset() {
			},
			enqueue() {
				if (!this.intersectionObserver) {
					this.initialize();
				}
				const items = document.querySelectorAll(`.${this.className}:not(.is-loading)`);
				for (const item of items) {
					item.classList.add('is-loading');
					this.intersectionObserver.observe(item);
				}
			},
			_loadImage(item) {
				if (!(item instanceof HTMLElement)) {
					throw new Error('無視していいエラー'); // override前のメソッドから呼ばれたので例外を投げて強制ストップ
				}
				const src = item.getAttribute(this.attrName);
				item.classList.remove(this.className, 'is-loading');
				if (src && item.getAttribute(this.adjustAttrName)) {
					this._adjustSizeAndLoad(item, src);
				} else {
					item.setAttribute('src', src);
				}
				item.setAttribute(this.attrName, '');
				item.addEventListener('error', e => {
					console.warn('error', e.target);
					(e.target || item)
						.dispatchEvent(
							new CustomEvent(this.errorEventName,
								{detail: {src}, bubbles: true, composed: true}));
				});
			},
			_adjustSizeAndLoad(item, src) {
				const img = document.createElement('img');
				img.addEventListener('load', () => {
					let itemWidth = item.offsetWidth;
					let itemHeight = item.offsetHeight;
					const imageWidth = img.width;
					const imageHeight = img.height;
					if (imageWidth >= imageHeight) {
						itemHeight = itemHeight / imageWidth * imageHeight;
					} else {
						itemWidth = itemWidth / imageHeight * imageWidth;
					}
					requestAnimationFrame(() => {
						Object.assign(item.style, {
							width: `${itemWidth}px`,
							height: `${itemHeight}px`
						});
						item.setAttribute('src', src);
					});
				}, {once: true});
				img.src = src;
			},
			_setPageObserver() {
				this.intersectionObserver && this.intersectionObserver.disconnect();
				const intersectionObserver = this.intersectionObserver = new IntersectionObserver(entries => {
					const inviews =
						entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
						for (const item of inviews) {
							intersectionObserver.unobserve(item);
							this._loadImage(item);
						}
				}, { rootMargin: `${this.margin}px`});
				this.mutationObserver && this.mutationObserver.disconnect();
				const mutationObserver = this.mutationObserver = new MutationObserver(mutations => {
					const isAdded = mutations.find(
						mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
					if (isAdded) { this.enqueue(); }
				});
				mutationObserver.observe(
					document.body,
					{childList: true, characterData: false, attributes: false, subtree: true}
				);
				this.enqueue();
			},
			_getBottomLoadingThreshold() {
				return Number.MAX_SAFE_INTEGER;
			},
			_sortWaitings() {
			}
		});
		if (isInitialized) {
			LazyImage.initialize();
		}
	};
	if (window.Nico && window.Nico.LazyImage && IntersectionObserver && MutationObserver) {
		override();
	} else if (IntersectionObserver && MutationObserver) {
		window.addEventListener('DOMContentLoaded', override, {once: true, bubbles: true});
	}
})();
	}
};
  boot(monkey, PRODUCT, START_PAGE_QUERY);

})(globalThis ? globalThis.window : window);
