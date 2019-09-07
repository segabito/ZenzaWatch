// ==UserScript==
// @name           uQuery
// @namespace      https://github.com/
// @description    コンソールのデバッグ補助ツール(開発者用)
// @match          *://*/*
// @grant          none
// @author         guest
// @version        0.0.1
// @run-at         document-start
// @license        public domain
// @noframes
// ==/UserScript==
/* eslint-disable */

const AntiPrototypeJs = function() {
	if (this.promise || !window.Prototype || window.PureArray) {
		return this.promise || Promise.resolve(window.PureArray || window.Array);
	}
	const f = document.createElement('iframe');
	f.srcdoc = '<html><title>ここだけ時間が10年遅れてるスレ</title></html>';
	Object.assign(f.style, { position: 'absolute', left: '-100vw', top: '-100vh' });
	return this.promise = new Promise(res => {
		f.onload = res;
		document.documentElement.append(f);
	}).then(() => {
		window.PureArray = f.contentWindow.Array;
		delete window.Array.prototype.toJSON;
		delete window.Array.prototype.toJSON;
		delete window.String.prototype.toJSON;
		f.remove();
		return Promise.resolve(window.PureArray);
	});
}.bind({promise: null});
AntiPrototypeJs().then(() => {
// Promise.resolve().then(() => {
  const PRODUCT = 'uQuery';
  const util = {};
  const Array = window.PureArray || window.Array;
  let $;
  let gname = window.localStorage['uu-global-name'] || 'uu';
  gname = window[gname] ? '$uu' : gname;
  // const console = {};
  // for (const k of Object.keys(window.console)) {
  //   if (typeof window.console[k] !== 'function') {continue;}
  //   console[k] = window.console[k].bind(window.console);
  // }
  // console.log = window.console.log.bind(window.console, '%c[LOG]', 'background: cyan');
var VER = '0.0.1';
const ENV = 'DEV';

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
		each: (arr, callback) => Array.from(arr).forEach((a, i) => callback.apply(a, [i, a])),
		proxy: (func, ...args) => func.bind(...args),
		fn: {
		}
	});
	return uQuery;
})();
const uq = uQuery;

  // eslint-disable-next-line no-undef
  $ = util.$ = uQuery; uQuery.fn.uQuery = VER;

  const docFunc = (text, func) => {
    func = func || (() => {});
    if (typeof func !== 'function') {
      func = Object.assign(() => {}, func);
    }
    text = text
      .trim()
      .split(/\n/)
      .map(line => line.replace(/^[\s]*?>/g, ' '))
      .join('\n');
    func.toString = () => text;
    return func;
  };

  util.nodeWalk = (node, filter = NodeFilter.SHOW_ELEMENT) => {
    const walker = document.createTreeWalker(
      node,
      filter,
      null, false);
    let nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  };
  util.groupLog = (list, template = {}) => {
    if (!list.forEach) {
      list = Array.from(list);
    }
    console.groupCollapsed(template.title || '');
    list.forEach(item => {
      console.log(...(template.callback ? template.callback(item) : [item]));
    });
    console.groupEnd();
  };

  util.groupDump = (obj, template = {}) => {
    console.groupCollapsed(template.title || '');
    Object.keys(obj).forEach(key => {
      const item = obj[key];
      console.log(...(template.callback ? template.callback(key, item) : [key, ': ', item]));
    });
    console.groupEnd();
  };

  util.escapeRegs = text => {
    const match = /[\\^$.*+?()[\]{}|]/g;
    return text.replace(match, '\\$&');
  };

  util.propFunc = (func, {self, callback, ownKeys} = {}) => {
    callback = callback || func;
    self = self || null;
    const handler = {
      get: function (target, prop) { return callback.apply(self, [prop]); }
    };
    if (ownKeys) {
      handler.ownKeys = function(target) {
        return ownKeys();
      };
    }
    return new Proxy(func, handler);
  };


  Object.assign(util.$.$Array.prototype, {
    nodeWalk: function (filter = NodeFilter.SHOW_ELEMENT) {
      const target = this.independency;
      return [...new Set(target.map(elm => util.nodeWalk(elm, filter)).flat())];
    },
    dump: function () {
      const callback = elm => [
        '%c%s%c%s%c%s',
        'color: #909;', elm.tagName || elm.nodeName,
        'color: #009;', elm.id ? `#${elm.id}` : '',
        'color: #900;', elm.className ? ('.' + Array.from(elm.classList).join('.')) : '',
        '\n',
        elm
      ];
      if (this.length <= 3) {
         this.forEach(elm => console.log(...callback(elm)));
      }
      util.groupLog(this, {title: `${this.length} Elements`, callback});
      return this;
    }
  });

  Object.defineProperties(util.$.$Array.prototype, {
    a: {
      get: function() {
        return util.propFunc(function(name = '') {
          return this.query(`[${name}]`);
        },  {
          self: this,
        });
      }
    },
    i: {
      get: function() {
        return util.propFunc(function(name = '') {
          name = name.toString().trim();
          if (!name) {

            return (this.query('[id]'));
          }
          let result = this.query(`#${name}`);
          if (result.length) {
            return new this.constructor(result);
          }
          return (this.query(`[id*="${name}" i]`));
        }, {
          self: this,
          // ownKeys: function() { return UniqNames.id; }
        });
      }
    },
    q: {
      get: function() {
        return util.propFunc(function(query = '') {
          query = query.toString().trim();
          return this.query(query);
        }, {self: this});
      }
    },
    v: {
      get: function() {
        return util.propFunc(function(name = '') {
          if (!name.toString()) {
            return this.query('*');
          }
          return this.query(`[class*="${name}" i], [id*="${name}" i], ${name}`);
        },  {
          self: this,
          // ownKeys: function() { return UniqNames.vprops; }
        });
      }
    },
    t: {
      get: function() {
        return util.propFunc(function(name = '') {
          name = name.toString().toUpperCase();
          return this.query('*').filter(elm => elm.tagName === name);
        }, {
          self: this,
          // ownKeys: function() { return UniqNames.tag; }
        });
      }
    },
    tx: {
      get: function() {
        return util.propFunc(function(text = '') {
          const textNodes =
            this.nodeWalk(NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT);
          const reg = new RegExp(`${util.escapeRegs(text.toString())}`, 'i');
          return util.$(textNodes.filter(node => reg.test(node.textContent)));
        }, {self: this});
      }
    }
  });

  const $doc = util.$(document.documentElement);
  const uu = docFunc(`
  ${gname}\`hoge\`
    id、class名、タグ名にhogeを含む$Arrayを返す。 大小文字の区別なし。
    とりあえず名前が曖昧なやつをざっくり探す時に。
    `,
  (q, ...args) => {
    const isTL = $.isTL(q, ...args);
    const query = isTL ? String.raw(q, ...args) : q;
    if (typeof query === 'string') {
      if (isTL && query.startsWith('<')) {
        return $(q, ...args);
      } else if (/[\.[]#<>:()+~]/.test(query)) {
        return $doc.find(q, ...args);
      } else {
        return $doc.v(query);
      }
    } else {
      return util.$(q);
    }
  });

  const noop = () => {/*          ( ˘ω˘ ) ｽﾔｧ…          */};
  const con = (...args) => /* 呼んだ？ */ console.log(...args);
  const evlog = e => /*   ＜●＞ ＜●＞   */
    console.log('%cevent: %s', 'font-weight: bold;', e.type || 'unknown', e);

  Object.assign(uu, {
    profile: docFunc(`計測系のやつ`, {
      timer:
        docFunc(`
        /**
         * console.profile をタイマー実効するやつ
         * @param {number} msec プロファイルを取る時間
         * @param {number} delay 開始までの時間
         * @param {string?} title
         */`,
        (msec = 10000, delay = 3000, title = null) => {
        console.log(`${delay}ms 後から ${msec}ms 間プロファイル開始`);
        title = title || `${new Date().toLocaleString()}`;
        setTimeout(() => console.profile(title), delay);
        setTimeout(() => console.profileEnd(title), msec + delay);
      }),
      func:
        docFunc(`
        /**
         * パフォーマンス計測用に関数をラップするやつ
         * @param {function} func
         * @param {object?} thisObj
         * @param {string?} title
         * @returns {function}
         */`,
        (func, thisObj = null, title = null) => {
          if (thisObj) {
            func = func.bind(thisObj);
          }
          title = title || `profile: ${func.name || 'function'}`;
          return (...args) => {
            console.profile(title);
            const result = func(...args);
            console.profileEnd(title);
            return result;
          };
        })
    }),
    watch: docFunc(`監視系のやつ`, {
      event:
      docFunc(`
        /**
        * element の eventName をウォッチしてコンソールに吐くやつ.
        * 解除は eventOff
        * @param {Element} element
        * @param {string} eventName
        */`,
        (element, eventName) => uu(element).on(eventName, evlog)),
      eventEnd: (element, eventName) => uu(element).off(eventName, evlog),
    }),
    dump: docFunc(`cookie や localStorage の中身ダンプしてくれるやつ`, {
      cookie() {
        const result = {};
        const cookies = document.cookie.split(';').sort();
        cookies.forEach(cookie => {
          const [key, val] = cookie.split('=').map(k => k.trim());
          result[decodeURIComponent(key)] = decodeURIComponent(val);
        });
        console.table(result);
        return result;
      },
      localStorage() {
        const result = {};
        for (const key of Object.keys(localStorage).sort()) {
          try {
            result[key] = JSON.parse(localStorage[key]);
          } catch(e) {
            result[key] = localStorage[key];
          }
        }
        console.table(result);
        return result;
      },
      sessionStorage() {
        const result = {};
        for (const key of Object.keys(sessionStorage).sort()) {
          try {
            result[key] = JSON.parse(sessionStorage[key]);
          } catch(e) {
            result[key] = sessionStorage[key];
          }
        }
        console.table(result);
        return result;
      },
    }),
    $: util.$,
    d: $doc,
    a: util.propFunc(function(...args) { return $doc.a(...args); }),
    i: util.propFunc(function(...args) { return $doc.i(...args); }),
    q: util.propFunc(function(...args) { return $doc.q(...args); }),
    v: util.propFunc(function(...args) { return $doc.v(...args); }),
    t: util.propFunc(function(...args) { return $doc.t(...args); }),
    tx: util.propFunc(function(...args) { return $doc.tx(...args); }),
    noop,
    con,
  });


  window[gname] = uu;

/* eslint-disable no-irregular-whitespace */

  console.log(`%c
  　　 _,,....,,_　 ＿人人人人人人人人人人人人人人人＿
  -''":::::::::::::｀''＞　　　${PRODUCT}していってね！！！　　　＜
  ヽ:::::::::::::::::::::￣^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^Ｙ^￣
  　|::::::;ノ´￣＼:::::::::::＼_,. -‐ｧ　　　　　＿_　　 _____　　 ＿_____
  　|::::ﾉ　　　ヽ､ヽr-r'"´　　（.__　　　　,´　_,, '-´￣￣｀-ゝ 、_ イ、
  _,.!イ_　　_,.ﾍｰｧ'二ﾊ二ヽ､へ,_7　　　'r ´　　　　　　　　　　ヽ、ﾝ、
  ::::::rｰ''7ｺ-‐'"´　 　 ;　 ',　｀ヽ/｀7　,'＝=─-　　　 　 -─=＝',　i
  r-'ｧ'"´/　 /!　ﾊ 　ハ　 !　　iヾ_ﾉ　i　ｲ　iゝ、ｲ人レ／_ルヽｲ i　|
  !イ´ ,' |　/__,.!/　V　､!__ﾊ　 ,'　,ゝ　ﾚﾘｲi (ﾋ_] 　　 　ﾋ_ﾝ ).| .|、i .||
  \`! 　!/ﾚi'　(ﾋ_] 　　 　ﾋ_ﾝ ﾚ'i　ﾉ　　　!Y!""　 ,＿__, 　 "" 「 !ﾉ i　|
  ,'　 ﾉ 　 !'"　 　 ,＿__,　 "' i .ﾚ'　　　　L.',.　 　ヽ _ﾝ　　　　L」 ﾉ| .|
  　（　　,ﾊ　　　　ヽ _ﾝ　 　人! 　　　　 | ||ヽ、　　　　　　 ,ｲ| ||ｲ| /
  ,.ﾍ,）､　　）＞,､ _____,　,.イ　 ハ　　　　レ ル｀ ー--─ ´ルﾚ　ﾚ´         v${VER}
  `,
  `
    font-size: 8px;
    font-family:
      'Mona','IPAMonaPGothic',
      'IPA モナー Pゴシック','MS PGothic AA',
      'MS PGothic','ＭＳ Ｐゴシック',sans-serif;
  `);

// window.util = uu;
// eslint-disable-next-line no-undef
if (!window.uQuery) { window.uQuery = uQuery; }

});

