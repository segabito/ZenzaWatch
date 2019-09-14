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

//@require ../packages/lib/src/infra/AntiPrototype-js.js
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
//@version
//@environment
//@require ../packages/lib/src/Emitter.js
//@require ../packages/lib/src/uQuery.js

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

