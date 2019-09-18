// ==UserScript==
// @name        ZenzaWatch 上級者用設定
// @namespace   https://github.com/segabito/
// @description1 ZenzaWatchの上級者向け設定。変更する時だけ有効にすればOK
// @include     *//www.nicovideo.jp/my/*
// @version     0.3.0
// @author      segabito macmoto
// @license     public domain
// @grant       none
// @noframes
// @require     https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js
// ==/UserScript==
/* eslint-disable */

((window) => { const self = window;
  const PRODUCT = 'ZenzaWatch';
  const monkey = async (PRODUCT) => {
    const _ = window._ ;
    const Array = window.PureArray || window.Array;
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
	static clone(dataStorage) {
		const options = {
			prefix:  dataStorage.prefix,
			storage: dataStorage.storage,
			ignoreExportKeys: dataStorage.options.ignoreExportKeys,
			readonly: dataStorage.readonly
		};
		return DataStorage.create(dataStorage.default, options);
	}
	constructor(defaultData, options = {}) {
		this.options = options;
		this.default = defaultData;
		this._data = Object.assign({}, defaultData);
		this.prefix = `${options.prefix || 'DATA'}_`;
		this.storage = options.storage || localStorage;
		this._ignoreExportKeys = options.ignoreExportKeys || [];
		this.readonly = options.readonly;
		this.silently = false;
		this._changed = new Map();
		this._onChange = bounce.time(this._onChange.bind(this));
		objUtil.bridge(this, new Emitter());
		this.restore().then(() => {
			this.props = this._makeProps(defaultData);
			this.emitResolve('restore');
		});
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
	async restore(storage) {
		storage = storage || this.storage;
		Object.keys(this.default).forEach(key => {
			const storageKey = this.getStorageKey(key);
			if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
				try {
					this._data[key] = JSON.parse(storage[storageKey]);
				} catch (e) {
					window.console.error('config parse error key:"%s" value:"%s" ', key, storage[storageKey], e);
				}
			} else {
				this._data[key] = this.default[key];
			}
		});
	}
	getNativeKey(key) {
		return key;
	}
	getStorageKey(key) {
		return `${this.prefix}${key}`;
	}
	async refresh(key, storage) {
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
	deleteValue(key) {
		key = this.getNativeKey(key);
		const storageKey = this.getStorageKey(key);
		this.storage.removeItem(storageKey);
		this._data[key] = this.default[key];
	}
	setValue(key, value) {
		const _key = key;
		key = this.getNativeKey(key);
		if (this._data[key] === value || arguments.length < 2) {
			return;
		}
		const storageKey = this.getStorageKey(key);
		const storage = this.storage;
		if (!this.readonly) {
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
		const _default = this.default;
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
		Object.keys(this.default)
			.filter(key => !this._ignoreExportKeys.includes(key)).forEach(key => {
				const storageKey = this.getStorageKey(key);
				try {
					if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
						delete storage[storageKey];
					}
					this._data[key] = this.default[key];
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
class KVSDataStorage extends DataStorage {
	constructor(defaultData, options = {}) {
		super(defaultData, options);
	}
	getStorageKey(key) {
		return key;
	}
	async restore(storage) {
		storage = storage || this.storage;
		const dbs = this.options.dbStorage.export();
		for (const key of Object.keys(dbs)) {
			const value = dbs[key];
			this.storage.set(key, value);
			this.dbStorage.deleteValue(key);
		}
		for (const key of Object.keys(this.default)) {
			const storageKey = key;
			const value = await this.storage.get(storageKey);
			if (value !== undefined) {
					this._data[key] = value;
			} else {
				this._data[key] = this.default[key];
			}
		}
	}
	async refresh(key, storage) {
		storage = storage || this.storage;
		key = this.getNativeKey(key);
		const storageKey = key;
		const value = await this.storage.get(storageKey);
		if (value !== undefined) {
			this._data[key] = value;
		}
		return this._data[key];
	}
	setValue(key, value) {
		const _key = key;
		key = this.getNativeKey(key);
		if (this._data[key] === value || arguments.length < 2 || value === undefined) {
			return;
		}
		const storageKey = key;
		const storage = this.storage;
		if (!this.readonly) {
			storage.set(storageKey, value);
		}
		this._data[key] = value;
		if (!this.silently) {
			this._changed.set(_key, value);
			this._onChange();
		}
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
	return DataStorage.create(
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
Config.clearConfig = () => Config.clear();
const NaviConfig = Config;
await Config.promise('restore');
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
				if (!('value' in elm)) {
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
const $ = uq;
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
    window.ZenzaAdvancedSettings = {
      config: Config
    };

    let panel;

    const __tpl__ = (`
      <span class="openZenzaAdvancedSettingPanel"><span></span>ZenzaWatch上級者設定</span>
    `).trim();

    const __css__ = (`
      .userDetail .openZenzaAdvancedSettingPanel {
        display: inline-block;
        position: absolute;
        top: 8px;
        right: 148px;
        padding: 2px 8px;
        text-align: center;
        background: #fff;
        border: #ccc solid 1px;
        color: #0033cc;
        cursor: pointer;
      }

      .userDetail .openZenzaAdvancedSettingPanel:active {
        background: #ccc;
      }

      .openZenzaAdvancedSettingPanel span {
        display: inline-block;
        width: 10px;
        height: 8px;
        background: url(https://nicovideo.cdn.nimg.jp/uni/img/zero_my/icons.png) no-repeat;
        background-position: -8px -141px;
      }


      .summer2017Area {
        display: none !important;
      }
    `).trim();



    class SettingPanel {
      constructor(...args) {
        this.initialize(...args);
      }
      initialize(params) {
        this._playerConfig     = params.playerConfig;
        this._$container       = params.$container;

        this._update$rawData = _.debounce(this._update$rawData.bind(this), 500);
        this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
      }
      _initializeDom() {
        if (this._$panel) { return; }
        const $container = this._$container;
        const config = this._playerConfig;

        cssUtil.addStyle(SettingPanel.__css__);
        $container.append(uq.html(SettingPanel.__tpl__));

        const $panel = this._$panel = $container.find('.zenzaAdvancedSettingPanel');
        this._$view =
          $container.find('.zenzaAdvancedSettingPanel');
        this._$view.on('click', e => e.stopPropagation());

        this._$rawData = $panel.find('.zenzaAdvancedSetting-rawData');
        this._$rawData.val(config.exportJson());
        this._$rawData.on('change', () => {
          let val = this._$rawData.val();
          let data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('設定データを直接書き換えしますか？')) {
            config.clear();
            config.import(data);
            location.reload();
          }

        });

        this._$playlistData = $panel.find('.zenzaAdvancedSetting-playlistData');
        this._$playlistData.val(JSON.stringify(window.ZenzaWatch.external.playlist.export(), null, 2));
        this._$playlistData.on('change', () => {
          let val = this._$playlistData.val();
          let data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('プレイリストデータを直接書き換えしますか？')) {
            window.ZenzaWatch.external.playlist.import(data);
            location.reload();
          }

        });

        const onInputItemChange = this._onInputItemChange.bind(this);
        const $check = $panel.find('input[type=checkbox]');
        $check.forEach(check => {
          const {settingName} = check.dataset;
          const val = !!config.props[settingName];
          check.checked = val;
          check.closest('.control').classList.toggle('checked', val);
        });
        $check.on('change', this._onToggleItemChange.bind(this));

        const $input = $panel.find('input[type=text], select, .textAreaInput');
        $input.forEach(input => {
          const {settingName} = input.dataset;
          const val = config.props[settingName];
          input.value = val;
        });
        $input.on('change', onInputItemChange);


        $panel.find('.zenzaAdvancedSetting-close').on('mousedown', e => {
          e.stopPropagation();
          this.hide();
        });

        $panel.toggleClass('debug', config.props.debug);
      }
      _onPlayerConfigUpdate(key, value) {
        switch (key) {
          case 'debug':
            this._$panel.toggleClass('debug', value);
            break;
          case 'wordRegFilter':
          case 'wordRegFilterFlags':
            this._$panel.find('.' + key + 'Input').val(value);
            break;
          case 'enableFullScreenOnDoubleClick':
          case 'autoCloseFullScreen':
          case 'continueNextPage':
            this._$panel
              .find('.' + key + 'Control').toggleClass('checked', value)
              .find('input[type=checkbox]').prop('checked', value);
            break;
        }
        this._update$rawData();
      }
      _update$rawData() {
        this._$rawData.val(this._playerConfig.exportJson());
      }
      _onToggleItemChange(e) {
        const {settingName} = e.target.dataset;
        const val = !!e.target.checked;

        this._playerConfig.props[settingName] = val;
        e.target.closest('.control').classList.toggle('checked', val);
      }
      _onInputItemChange(e) {
        const $target = $(e.target);
        const {settingName} = e.target.dataset;
        const val = e.target.value;

        window.setTimeout(() => $target.removeClass('update error'), 300);

        window.console.log('onInputItemChange', settingName, val);
        switch (settingName) {
          case 'wordRegFilter':
            try {
              const reg = new RegExp(val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
            break;
          case 'wordRegFilterFlags': {
            try {
              const reg = new RegExp(/./, val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
          }
            break;
          default:
            $target.addClass('update');
            break;
        }

        this._playerConfig.props[settingName] = val;
      }
      _beforeShow() {
        if (this._$playlistData) {
          this._$playlistData.val(
            JSON.stringify(window.ZenzaWatch.external.playlist.export(), null, 2)
          );
        }
      }
      toggle(v) {
        this._initializeDom();
        // window.ZenzaWatch.external.execCommand('close');
        this._$view.toggleClass('show', v);
        if (this._$view.hasClass('show')) { this._beforeShow(); }
      }
      show() {
        this.toggle(true);
      }
      hide() {
        this.toggle(false);
      }
    }


    SettingPanel.__css__ = (`
      .zenzaAdvancedSettingPanel {
        position: fixed;
        left: 50%;
        top: -100vh;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 200000;
        width: 90vw;
        height: 90vh;
        color: #000;
        background: rgba(192, 192, 192, 1);
        transition: top 0.4s ease;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        overflow: hidden;
      }
      .zenzaAdvancedSettingPanel.show {
        opacity: 1;
        top: 50%;
      }

      .zenzaAdvancedSettingPanel.show {
        border: 2px outset #fff;
        box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
        pointer-events: auto;
      }

      .zenzaAdvancedSettingPanel .settingPanelInner {
        box-sizing: border-box;
        margin: 8px;
        padding: 8px;
        overflow: auto;
        height: calc(100% - 86px);
        overscroll-behavior: contain;
        border: 1px inset;
      }
      .zenzaAdvancedSettingPanel .caption {
        background: #333;
        font-size: 20px;
        padding: 4px 8px;
        color: #fff;
      }

      .zenzaAdvancedSettingPanel .caption.sub {
        margin: 8px;
        font-size: 16px;
      }

      .zenzaAdvancedSettingPanel .example {
        display: inline-block;
        margin: 0 16px;
        font-family: sans-serif;
      }

      .zenzaAdvancedSettingPanel label {
        display: inline-block;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 4px 8px;
        cursor: pointer;
      }

      .zenzaAdvancedSettingPanel .control {
        border-radius: 4px;
        background: rgba(88, 88, 88, 0.3);
        padding: 8px;
        margin: 16px 4px;
      }

      .zenzaAdvancedSettingPanel .control:hover {
        background: rgba(88, 88, 128, 0.3);
      }

      .zenzaAdvancedSettingPanel button {
        font-size: 10pt;
        padding: 4px 8px;
        background: #888;
        border-radius: 4px;
        border: solid 1px;
        cursor: pointer;
      }

      .zenzaAdvancedSettingPanel input[type=checkbox] {
        transform: scale(2);
        margin-left: 8px;
        margin-right: 16px;
        cursor: pointer;
      }

      .zenzaAdvancedSettingPanel .control.checked {
      }

      .zenzaAdvancedSettingPanel input[type=text] {
        font-size: 24px;
        background: #ccc;
        color: #000;
        width: 90%;
        margin: 0 5%;
        padding: 8px;
        border-radius: 8px;
      }
      .zenzaAdvancedSettingPanel input[type=text].update {
        color: #003;
        background: #fff;
        box-shadow: 0 0 8px #ff9;
      }
      .zenzaAdvancedSettingPanel input[type=text].update:before {
        content: 'ok';
        position: absolute;
        left: 0;
        z-index: 100;
        color: blue;
      }

      .zenzaAdvancedSettingPanel input[type=text].error {
        color: #300;
        background: #f00;
      }

      .zenzaAdvancedSettingPanel select {
        font-size:24px;
        margin: 0 5%;
        border-radius: 8px;
       }

      .zenzaAdvancedSetting-close {
        position: absolute;
        width: 50%;
        left: 50%;
        bottom: 8px;
        transform: translate(-50%);
        z-index: 160000;
        padding: 8px 16px;
        cursor: pointer;
        box-sizing: border-box;
        text-align: center;
        line-height: 30px;
        font-size: 24px;
        border: outset 2px;
        box-shadow: 0 0 4px #000;
        transition:
          opacity 0.4s ease,
          transform 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease
            ;
        pointer-events: auto;
        transform-origin: center center;
      }

      .textAreaInput {
        width: 90%;
        height: 200px;
        margin: 0 5%;
        word-break: break-all;
        overflow: scroll;
      }

      .zenzaAdvancedSetting-rawData,
      .zenzaAdvancedSetting-playlistData {
        width: 90%;
        height: 300px;
        margin: 0 5%;
        word-break: break-all;
        overflow: scroll;
      }

      .zenzaAdvancedSetting-close:active {
        box-shadow: none;
        border: inset 2px;
        transform: scale(0.8);
      }

      .zenzaAdvancedSettingPanel:not(.debug) .debugOnly {
        display: none !important;
      }


      .example code {
        font-family: monospace;
        display: inline-block;
        margin: 4px;
        padding: 4px 8px;
        background: #333;
        color: #fe8;
        border-radius: 4px;
      }

    `).trim();

    const commands = (`
      <option value="">なし</option>
      <option value="togglePlay">再生/停止</option>
      <option value="fullScreen">フルスクリーン ON/OFF</option>
      <option value="toggle-mute">ミュート ON/OFF</option>
      <option value="toggle-showComment">コメント表示 ON/OFF</option>
      <option value="toggle-backComment">コメントの背面表示 ON/OFF</option>
      <option value="toggle-loop">ループ ON/OFF</option>
      <option value="toggle-enableFilter">NG設定 ON/OFF</option>
      <option value="screenShot">スクリーンショット</option>
      <option value="deflistAdd">とりあえずマイリスト</option>
      <option value="picture-in-picture">picture-in-picture</option>
    `).trim();

    SettingPanel.__tpl__ = (`
      <div class="zenzaAdvancedSettingPanel zen-family">
        <div class="settingPanelInner">
          <div class="enableFullScreenOnDoubleClickControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="enableFullScreenOnDoubleClick">
              画面ダブルクリックでフルスクリーン切り換え
            </label>
          </div>

          <div class="autoCloseFullScreenControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoCloseFullScreen">
              再生終了時に自動でフルスクリーン解除

            </label>
          </div>

          <div class="continueNextPageControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="continueNextPage">
              再生中にページを切り換えても続きから再開する
            </label>
          </div>

          <div class="enableDblclickClose control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="enableDblclickClose">
              背景のダブルクリックでプレイヤーを閉じる
            </label>
          </div>

          <div class="autoDisableDmc control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoDisableDmc">
              旧システムのほうが画質が良さそうな時は旧システムにする。(旧システム側が1280x720を超える時)
            </label>
          </div>

          <div class="autoZenTube control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoZenTube">
              自動ZenTube (ZenTubeから戻す時は動画を右クリックからリロード または 右下の「画」)
            </label>
          </div>

          <div class="enableSlotLayoutEmulation control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="commentLayer.enableSlotLayoutEmulation">
              Flash版のコメントスロット処理をエミュレーションする
            </label>
          </div>

          <div class="touch-tap2command control toggle">
            <label>
              2本指タッチ
              <select data-setting-name="touch.tap2command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap3command control toggle">
            <label>
              3本指タッチ
              <select data-setting-name="touch.tap3command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap3command control toggle">
            <label>
              4本指タッチ
              <select data-setting-name="touch.tap4command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap5command control toggle">
            <label>
              5本指タッチ
              <select data-setting-name="touch.tap5command">
                ${commands}
              </select>
            </label>
          </div>


          <p class="caption sub">NGワード正規表現</p>
          <span class="example">入力例: <code>([wWｗＷ]+$|^ん[？\?]$|洗った？$)</code> 文法エラーがある時は更新されません</span>
          <input type="text" class="textInput wordRegFilterInput"
            data-setting-name="wordRegFilter">

          <p class="caption sub">NGワード正規表現フラグ</p>
          <span class="example">入力例: <code>i</code></span>
          <input type="text" class="textInput wordRegFilterFlagsInput"
            data-setting-name="wordRegFilterFlags">

          <p class="caption sub">NG tag</p>
          <span class="example">連続再生中にこのタグのある動画があったらスキップ</span>
          <textarea class="videoTagFilter textAreaInput"
            data-setting-name="videoTagFilter"></textarea>

          <p class="caption sub">NG owner</p>
          <span class="example">連続再生中にこの投稿者IDがあったらスキップ。 チャンネルの場合はchをつける 数字の後に 入力例<code>2525 #コメント</code></span>
          <textarea class="videoOwnerFilter textAreaInput"
            data-setting-name="videoOwnerFilter"></textarea>

          <div class="debugControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="debug">
              デバッグモード
            </label>
          </div>

          <div class="debugOnly">
            <p class="caption sub">生データ(ZenzaWatch設定)</p>
            <span class="example">丸ごとコピペで保存/復元可能。 ここを消すと設定がリセットされます。</span>
            <textarea class="zenzaAdvancedSetting-rawData"></textarea>

            <p class="caption sub">生データ(プレイリスト)</p>
            <span class="example">丸ごとコピペで保存/復元可能。 編集は自己責任で</span>
            <textarea class="zenzaAdvancedSetting-playlistData"></textarea>

          </div>

        </div>
        <div class="zenzaAdvancedSetting-close">閉じる</div>
      </div>
    `).trim();



    const initializePanel = () => {
      Config.watch();
      panel = new SettingPanel({
        playerConfig: Config,
        $container: $('body')
      });
    };

    const initialize = () => {
      const $button = $(__tpl__);
      cssUtil.addStyle(__css__);

      $('.accountEdit').after($button);
      $button.on('click', e => {
        initializePanel();
        panel.toggle();
      });

    };

    initialize();
  };

  const loadGM = () => {
    const script = document.createElement('script');
    script.id = 'ZenzaWatchAdvancedSettingsLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.append(`(${monkey})('${PRODUCT}');`);
    document.body.append(script);
  };


const ZenzaDetector = (() => {
	const promise =
		(window.ZenzaWatch && window.ZenzaWatch.ready) ?
			Promise.resolve(window.ZenzaWatch) :
			new Promise(resolve => {
				[window, (document.body || document.documentElement)]
					.forEach(e => e.addEventListener('ZenzaWatchInitialize', () => {
						resolve(window.ZenzaWatch);
					}));
			});
	return {detect: () => promise};
})();
ZenzaDetector.detect().then(() => loadGM());


})(globalThis ? globalThis.window : window);
