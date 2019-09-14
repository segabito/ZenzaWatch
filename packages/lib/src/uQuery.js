

// Arrayを継承したjQuery劣化版
//
// walkから全要素に適用できる
// $('div').find('.thumbnail').walk.src = '';
// $('.message').walk.textContent = 'hello';
// $('span').walk.style.color = 'blue';

import {Emitter} from './Emitter';
//===BEGIN===
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
      // 他の要素の子孫じゃないやつを返す
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
      // window.console.log({eventName, callback, options}, this.concat());
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
      // console.warn('unknown type q', q);/
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
//===END===
const $ = uQuery;
export {uQuery, $, uq};
