// ==UserScript==
// @name           Mylist Filter
// @namespace      https://github.com/segabito/
// @description    視聴不可能な動画だけ表示して一括削除とかできるやつ
// @match          *://www.nicovideo.jp/my/mylist*
// @grant          none
// @author         名無しさん@匿名希望
// @version        0.0.1
// @run-at         document-body
// @license        public domain
// @noframes
// ==/UserScript==
/* eslint-disable */


(async (window) => {
const global = {
  PRODUCT: 'MylistFilter'
};
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
				const handler = new Handler(callback);
				handler.name = name;
				e = this._events.set(name, handler);
			} else {
				e.add(callback);
			}
			if (e.length > 10) {
				console.warn('listener count > 10', name, e, callback);
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
				this._promise = new Map;
			}
			const p = this._promise.get(name);
			if (p) {
				return callback ? p.addCallback(callback) : p;
			}
			this._promise.set(name, new PromiseHandler(callback));
			return this._promise.get(name);
		}
		emitResolve(name, ...args) {
			if (!this._promise) {
				this._promise = new Map;
			}
			if (!this._promise.has(name)) {
				this._promise.set(name, new PromiseHandler());
			}
			return this._promise.get(name).resolve(...args);
		}
		emitReject(name, ...args) {
			if (!this._promise) {
				this._promise = new Map;
			}
			if (!this._promise.has(name)) {
				this._promise.set(name, new PromiseHandler);
			}
			return this._promise.get(name).reject(...args);
		}
		resetPromise(name) {
			if (!this._promise) { return; }
			this._promise.delete(name);
		}
		hasPromise(name) {
			return this._promise && this._promise.has(name);
		}
		addEventListener(...args) { return this.on(...args); }
		removeEventListener(...args) { return this.off(...args);}
	}
	Emitter.totalCount = totalCount;
	Emitter.warnings = warnings;
	return {Emitter};
})();
	return {Handler, PromiseHandler, Emitter};
}
const {Handler, PromiseHandler, Emitter} = EmitterInitFunc();
const dimport = (() => {
	try { // google先生の真似
		return new Function('u', 'return import(u)');
	} catch(e) {
		const map = {};
		let count = 0;
		return url => {
			if (map[url]) {
				return map[url];
			}
			try {
				const now = Date.now();
				const callbackName = `dimport_${now}_${count++}`;
				const loader = `
					import * as module${now} from "${url}";
					console.log('%cdynamic import from "${url}"',
						'font-weight: bold; background: #333; color: #ff9; display: block; padding: 4px; width: 100%;');
					window.${callbackName}(module${now});
					`.trim();
				window.console.time(`"${url}" import time`);
				const p = new Promise((ok, ng) => {
					const s = document.createElement('script');
					s.type = 'module';
					s.onerror = ng;
					s.append(loader);
					s.dataset.import = url;
					window[callbackName] = module => {
						window.console.timeEnd(`"${url}" import time`);
						ok(module);
						delete window[callbackName];
					};
					document.head.append(s);
				});
				map[url] = p;
				return p;
			} catch (e) {
				console.warn(url, e);
				return Promise.reject(e);
			}
		};
	}
})();
const bounce = {
	origin: Symbol('origin'),
	idle(func, time) {
		let reqId = null;
		let lastArgs = null;
		let promise = new PromiseHandler();
		const [caller, canceller] =
			(time === undefined && self.requestIdleCallback) ?
				[self.requestIdleCallback, self.cancelIdleCallback] : [self.setTimeout, self.clearTimeout];
		const callback = () => {
			const lastResult = func(...lastArgs);
			promise.resolve({lastResult, lastArgs});
			reqId = lastArgs = null;
			promise = new PromiseHandler();
		};
		const result = (...args) => {
			if (reqId) {
				reqId = canceller(reqId);
			}
			lastArgs = args;
			reqId = caller(callback, time);
			return promise;
		};
		result[this.origin] = func;
		return result;
	},
	time(func, time = 0) {
		return this.idle(func, time);
	}
};
const throttle = (func, interval) => {
	let lastTime = 0;
	let timer;
	let promise = new PromiseHandler();
	const result = (...args) => {
		if (timer) {
			return promise;
		}
		const now = performance.now();
		const timeDiff = now - lastTime;
		timer = setTimeout(() => {
			lastTime = performance.now();
			timer = null;
			const lastResult = func(...args);
			promise.resolve({lastResult, lastArgs: args});
			promise = new PromiseHandler();
		}, Math.max(interval - timeDiff, 0));
		return promise;
	};
	result.cancel = () => {
		if (timer) {
			timer = clearTimeout(timer);
		}
		promise.resolve({lastResult: null, lastArgs: null});
		promise = new PromiseHandler();
	};
	return result;
};
throttle.time = (func, interval = 0) => throttle(func, interval);
throttle.raf = function(func) {
	let promise;
	let cancelled = false;
	let lastArgs = [];
	const callRaf = res => requestAnimationFrame(res);
	const onRaf = () => this.req = null;
	const onCall = () => {
		if (cancelled) {
			cancelled = false;
			return;
		}
		try { func(...lastArgs); } catch (e) { console.warn(e); }
		promise = null;
	};
	const result = (...args) => {
		lastArgs = args;
		if (promise) {
			return promise;
		}
		if (!this.req) {
			this.req = new Promise(callRaf).then(onRaf);
		}
		promise = this.req.then(onCall);
		return promise;
	};
	result.cancel = () => {
		cancelled = true;
		promise = null;
	};
	return result;
}.bind({req: null, count: 0, id: 0});
throttle.idle = func => {
	let id;
	const request = (self.requestIdleCallback || self.setTimeout);
	const cancel = (self.cancelIdleCallback || self.clearTimeout);
	const result = (...args) => {
		if (id) {
			return;
		}
		id = request(() => {
			id = null;
			func(...args);
		}, 0);
	};
	result.cancel = () => {
		if (id) {
			id = cancel(id);
		}
	};
	return result;
};
const css = (() => {
	const setPropsTask = [];
	const applySetProps = throttle.raf(
		() => {
		const tasks = setPropsTask.concat();
		setPropsTask.length = 0;
		for (const [element, prop, value] of tasks) {
			try {
				element.style.setProperty(prop, value);
			} catch (error) {
				console.warn('element.style.setProperty fail', {element, prop, value, error});
			}
		}
	});
	const css = {
		addStyle: (styles, option, document = window.document) => {
			const elm = Object.assign(document.createElement('style'), {
				type: 'text/css'
			}, typeof option === 'string' ? {id: option} : (option || {}));
			if (typeof option === 'string') {
				elm.id = option;
			} else if (option) {
				Object.assign(elm, option);
			}
			elm.classList.add(global.PRODUCT);
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
		setProps(...tasks) {
			setPropsTask.push(...tasks);
			return setPropsTask.length ? applySetProps() : Promise.resolve();
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
		escape:  value => CSS.escape  ? CSS.escape(value) : value.replace(/([\.#()[\]])/g, '\\$1'),
		number:  value => CSS.number  ? CSS.number(value) : value,
		s:       value => CSS.s       ? CSS.s(value) :  `${value}s`,
		ms:      value => CSS.ms      ? CSS.ms(value) : `${value}ms`,
		pt:      value => CSS.pt      ? CSS.pt(value) : `${value}pt`,
		px:      value => CSS.px      ? CSS.px(value) : `${value}px`,
		percent: value => CSS.percent ? CSS.percent(value) : `${value}%`,
		vh:      value => CSS.vh      ? CSS.vh(value) : `${value}vh`,
		vw:      value => CSS.vw      ? CSS.vw(value) : `${value}vw`,
		trans:   value => self.CSSStyleValue ? CSSStyleValue.parse('transform', value) : value,
		word:    value => self.CSSKeywordValue ? new CSSKeywordValue(value) : value,
		image:   value => self.CSSStyleValue ? CSSStyleValue.parse('background-image', value) : value,
	};
	return css;
})();
const cssUtil = css;
  const [lit] = await Promise.all([
    dimport('https://unpkg.com/lit-html?module')
  ]);
  const {html} = lit;
  const $ = self.jQuery;

  cssUtil.addStyle(`
    .ItemSelectMenuContainer-itemSelect {
      display: grid;
      grid-template-columns: 160px 1fr
    }

    .itemFilterContainer {
      display: grid;
      background: #f0f0f0;
      grid-template-rows: 1fr 1fr;
      grid-template-columns: auto 1fr;
      user-select: none;
    }

    .itemFilterContainer-title {
      grid-row: 1 / 3;
      grid-column: 1 / 2;
      display: flex;
      align-items: center;
      white-space: nowrap;
      padding: 8px;
    }

    .playableFilter {
      grid-row: 1;
      grid-column: 2;
      padding: 4px 8px;
    }

    .wordFilter {
      grid-row: 2;
      grid-column: 2;
      padding: 0 8px 4px;
    }

    .playableFilter, .wordFilter {
      display: inline-flex;
      align-items: center;
    }

    .playableFilter .caption, .wordFilter .caption {
      display: inline-block;
      margin-right: 8px;
    }

    .playableFilter input[type="radio"] {
      transform: scale(1.2);
      margin-right: 8px;
    }

    .playableFilter label {
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
    }

    .playableFilter input[checked] + span {
      background: linear-gradient(transparent 80%, #99ccff 0%);
    }

    .wordFilter input[type="text"] {
      padding: 4px;
    }
    .wordFilter input[type="button"] {
      padding: 4px;
      border: 1px solid #ccc;
    }
  `);

  const playableFilterTpl = props => {
    const playable = props.playable || '';
    return html`
      <div class="playableFilter">
        <span class="caption">状態</span>
        <label
          data-click-command="set-playable-filter"
          data-command-param=""
        >
          <input type="radio" name="playable-filter" value=""
           ?checked=${playable !== 'playable' && playable !== 'not-playable'}>
          <span>指定なし</span>
        </label>
        <label
          data-click-command="set-playable-filter"
          data-command-param="playable"
        >
          <input type="radio" name="playable-filter" value="playable"
           ?checked=${playable === 'playable'}>
          <span>視聴可能</span>
        </label>
        <label
          data-click-command="set-playable-filter"
          data-command-param="not-playable"
        >
          <input type="radio" name="playable-filter" value="not-playable"
          ?checked=${playable === 'not-playable'}>
          <span>視聴不可</span>
        </label>
      </div>`;
  };

  const wordFilterTpl = props => {
    return html`
    <div class="wordFilter">
      <input type="text" name="word-filter" class="wordFilterInput" placeholder="キーワード"
        value=${props.word || ''}>
        <input type="button" data-click-command="clear-word-filter"
title="・✗・" value=" ✗ ">
        <small>　タイトル・マイリストコメント検索</small>
    </div>`;
  };

  const resetForm = () => {
    [...document.querySelectorAll('.itemFilterContainer input[name="playable-filter"]')]
      .forEach(r => r.checked = r.hasAttribute('checked'));
    [...document.querySelectorAll('.wordFilterInput')]
    .forEach(r => r.value = r.getAttribute('value'));
  };

  const itemFilterContainer = Object.assign(document.createElement('div'), {
    className: 'itemFilterContainer'
  });

  const render = props => {
    if (!document.body.contains(itemFilterContainer)) {
      const parentNode = document.querySelector('.ItemSelectMenuContainer-itemSelect');
      if (parentNode) {
        parentNode.append(itemFilterContainer);
      }
    }

    lit.render(html`
      <div class="itemFilterContainer-title">絞り込み</div>
      ${playableFilterTpl(props)}
      ${wordFilterTpl(props)}
    `, itemFilterContainer);

    resetForm();
  };

  let override = false;
  const overrideFilter = () => {
    if (!window.MylistHelper || override) {
      return;
    }
    override = true;
    const self = window.MylistHelper.itemFilter;
    Object.defineProperty(self, 'wordFilterCallback', {
      get: () => {
        const word = self.word.trim();

        return word ?
          item => {
            return (
              (item.item_data.title || '')       .toLowerCase().indexOf(word) >= 0 ||
              (item.item_data.description || '') .toLowerCase().indexOf(word) >= 0 ||
              (item.description || '')           .toLowerCase().indexOf(word) >= 0
            );
          } :
          () => true
        ;
      }
    });
  };

  const parseProps = () => {
    if (!location.hash || location.length <= 2) { return {}; }
    return location.hash.substring(1).split('+').reduce((map, entry) => {
      const [key, val] = entry.split('=').map(e => decodeURIComponent(e));
      map[key] = val;
      return map;
    }, {});
  };

  const update = () => {
    overrideFilter();
    const props = parseProps();
    // console.log('update form', props);
    render(props);
  };

  const init = () => {
    const _update = bounce.time(update, 100);
    _update();
    $('.content').on('nicoPageChanged', _update);
  };

  $(() => init());
})(globalThis ? globalThis.window : window);

