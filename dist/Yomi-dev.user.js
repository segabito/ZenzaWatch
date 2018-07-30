// ==UserScript==
// @name           Yomi
// @namespace      https://github.com/segabito/
// @description    niconico comic reader
// @match          *://seiga.nicovideo.jp/watch/*
// @grant          none
// @author         segabito
// @version        0.0.1
// ==/UserScript==


(function (window) {
  const PRODUCT = 'Yomi';
  const monkey = (PRODUCT) => {
    let console = window.console;
    let $ = window.jQuery;
    let html, render;

    var VER = '0.0.1';
    const ENV = 'DEV';

    //@environment

    window.console.log(`%c${PRODUCT}@${ENV} v${VER}`, 'font-size: 200%;');


// 登録した順番は保証されない
class Handler { //extends Array {
  constructor(...args) {
    this._list = new Array(...args);
    //super(...args);
    // if (this._list.length > 1) { this.reverse(); }
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
    _.pull(this._list, member);
    return this;
  }

  clear() {
    this._list.length = 0;
    return this;
  }

  get isEmpty() {
    return this._list.length < 1;
  }
}


const {Emitter} = (() => {
  class Emitter {

    on(name, callback) {
      if (!this._events) {
        Emitter.totalCount++;
        this._events = {};
      }

      name = name.toLowerCase();
      let e = this._events[name];
      if (!e) {
        e = this._events[name] = new Handler(callback);
      } else {
        e.add(callback);
      }
      if (e.length > 10) {
        Emitter.warnings.push(this);
      }
      return this;
    }

    off(name, callback) {
      if (!this._events) {
        return;
      }

      name = name.toLowerCase();
      const e = this._events[name];

      if (!this._events[name]) {
        return;
      } else if (!callback) {
        delete this._events[name];
      } else {
        e.remove(callback);

        if (e.isEmpty) {
          delete this._events[name];
        }
      }

      if (Object.keys(this._events).length < 1) {
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
        delete this._events[name];
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
      const e = this._events[name];

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

      setTimeout(() => {
        this.emit(...args);
      }, 0);
      return this;
    }
  }

  Emitter.totalCount = 0;
  Emitter.warnings = [];

  return {
    Emitter
  };
})();



const Config = (() => {
  const prefix = `${PRODUCT}_`;
  const emitter = new Emitter();

  // 古いprototype.jsが使われているページの対処
  if (window.Prototype && Array.prototype.toJSON) {
    let _json_stringify = JSON.stringify;
    JSON.stringify = value => {
      let toj = Array.prototype.toJSON;
      delete Array.prototype.toJSON;
      let r = _json_stringify(value);
      Array.prototype.toJSON = toj;
      return r;
    };
  }

  // 直接変更する時はコンソールで
  // ZenzaWatch.config.setValue('hogehoge' fugafuga);
  const DEFAULT_CONFIG = {
    debug: false,
    volume: 0.3,
    forceEnable: false,
    showComment: true,
    autoPlay: true,
    'autoPlay:ginza': true,
    loop: false,
    mute: false,
    screenMode: 'normal',
    'screenMode:ginza': 'normal',
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


    // forceEconomy: false,
    // NG設定
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

    allowOtherDomain: false, // 外部サイトでも実行するかどうか

    overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く

    speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
    speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す


    // enableCommentLayoutWorker: true, // コメントの配置計算を一部マルチスレッド化(テスト中)

    enableSingleton: false,

    // 無料期間の過ぎた動画と同じのがdアニメにあったら、
    // コメントはそのままに映像だけ持ってくる (当然ながらdアニメ加入は必要)
    loadLinkedChannelVideo: false,

    commentLayerOpacity: 1.0, //
    'commentLayer.textShadowType': '', // フォントの修飾タイプ
    'commentLayer.enableSlotLayoutEmulation': false,

    overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
    enableGinzaSlayer: false, // まだ実験中
    lastPlayerId: '',
    playbackRate: 1.0,
    lastWatchId: 'sm9',
    message: '',

    enableVideoSession: true,
    videoServerType: 'dmc',
    // enableDmc: true, // 新サーバーを使うかどうか
    autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
    dmcVideoQuality: 'auto',   // 優先する画質 auto, veryhigh, high, mid, low
    smileVideoQuality: 'default', // default eco
    useWellKnownPort: false,
    'video.hls.enable': true,
    'video.hls.segmentDuration': 5000,

    enableNicosJumpVideo: true, // @ジャンプを有効にするかどうか
    'videoSearch.ownerOnly': true,
    'videoSearch.mode': 'tag',
    'videoSearch.order': 'desc',
    'videoSearch.sort': 'playlist',
    'videoSearch.word': '',

    'uaa.enable': true,

    'screenshot.prefix': '',

    'search.limit': 300, // 検索する最大件数(最大1600) 100件ごとにAPIを叩くので多くするほど遅くなる

    //タッチパネルがある場合は null ない場合は undefined になるらしい
    //うちのデスクトップは無いのに null だが…
    'touch.enable': window.ontouchstart !== undefined,
    'touch.tap2command': '',
    'touch.tap3command': 'toggle-mute',
    'touch.tap4command': 'toggle-showComment',
    'touch.tap5command': 'screenShot',

    autoZenTube: false,
    bestZenTube: false,

    KEY_CLOSE: 27,          // ESC
    KEY_RE_OPEN: 27 + 0x1000, // SHIFT + ESC
    KEY_HOME: 36 + 0x1000, // SHIFT + HOME

    KEY_SEEK_LEFT: 37 + 0x1000, // SHIFT + LEFT
    KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
    KEY_SEEK_LEFT2: 99999999, // カスタマイズ用
    KEY_SEEK_RIGHT2: 99999999, //
    // 1/60秒戻る・進む  1コマに移動したいが動画のフレームレートを取得できないため
    KEY_SEEK_PREV_FRAME: 188, // ,
    KEY_SEEK_NEXT_FRAME: 190, // .

    KEY_VOL_UP: 38 + 0x1000, // SHIFT + UP
    KEY_VOL_DOWN: 40 + 0x1000, // SHIFT + DOWN

    KEY_INPUT_COMMENT: 67, // C
    KEY_FULLSCREEN: 70, // F
    KEY_MUTE: 77, // M
    KEY_TOGGLE_COMMENT: 86, // V

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

  const config = {};
  let noEmit = false;

  Object.keys(DEFAULT_CONFIG).forEach(key => {
    let storageKey = prefix + key;
    if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
      try {
        config[key] = JSON.parse(localStorage.getItem(storageKey));
      } catch (e) {
        window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
        config[key] = DEFAULT_CONFIG[key];
      }
    } else {
      config[key] = DEFAULT_CONFIG[key];
    }
  });

  /**
   * ローカルの設定値をlocalStorageから読み直す
   * 他のウィンドウで書き換えられる可能性のある物を読む前に使う
   */
  emitter.refreshValue = (key) => { //function (key) {
    let storageKey = prefix + key;
    if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
      try {
        config[key] = JSON.parse(localStorage.getItem(storageKey));
      } catch (e) {
        window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
      }
    }
  };

  emitter.getValue = (key, refresh) => {
    if (refresh) {
      emitter.refreshValue(key);
    }
    return config[key];
  };

  emitter.setValue = function (key, value) {
    if (config[key] !== value && arguments.length >= 2) {
      let storageKey = prefix + key;
      if (location.host === 'www.nicovideo.jp') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
          window.console.error(e);
        }
      }
      config[key] = value;

      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
      if (!noEmit) {
        this.emitAsync('update', key, value);
        this.emitAsync('update-' + key, value);
      }
    }
  };

  /**
   * イベントを投げないで設定変更だけする
   * @deprecated
   * @param {string} key
   * @param value
   */
  emitter.setValueSilently = function (key, value) {
    if (config[key] !== value && arguments.length >= 2) {
      let storageKey = prefix + key;
      if (location.host === 'www.nicovideo.jp') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
          window.console.error(e);
        }
      }
      config[key] = value;

      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
    }
  };

  /**
   * @deprecated
   * localStorageに保存しないで、ページをリロードするまでの間だけ書き換え
   */
  emitter.setSessionValue = (key, value) => {
    if (config[key] !== value) {
      config[key] = value;
      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
      this.emitAsync('update', key, value);
      this.emitAsync('update-' + key, value);
    }
  };

  emitter.exportConfig = () => {
    let result = {};
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      let storageKey = prefix + key;
      if ((localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) &&
        DEFAULT_CONFIG[key] !== emitter.getValue(key)) {
        result[key] = emitter.getValue(key);
      }
    });
    return result;
  };

  emitter.importConfig = (data) => {
    noEmit = true;
    Object.keys(data).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      window.console.log('import config: %s=%s', key, data[key]);
      try {
        emitter.setValue(key, data[key]);
      } catch (e) {
      }
    });
    noEmit = false;
  };

  emitter.clearConfig = () => {
    noEmit = true;
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      let storageKey = prefix + key;
      try {
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          localStorage.removeItem(storageKey);
        }
        config[key] = DEFAULT_CONFIG[key];
      } catch (e) {
      }
    });
    noEmit = false;
  };

  emitter.getKeys = () => {
    return Object.keys(DEFAULT_CONFIG);
  };

  emitter.namespace = name => {
    return {
      getValue: (key) => {
        return emitter.getValue(name + '.' + key);
      },
      setValue: (key, value) => {
        emitter.setValue(name + '.' + key, value);
      },
      on: (key, func) => {
        if (key === 'update') {
          emitter.on('update', (key, value) => {
            const pre = name + '.';
            if (key.startsWith(pre)) {
              func(key.replace(pre, ''), value);
            }
          });
        } else {
          key = key.replace(/^update-/, '');
          emitter.on('update-' + name + '.' + key, func);
        }
      }
    };
  };

  return emitter;
})();

    const Yomi = {
      version: VER,
      env: ENV,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {},
      modules: {Emitter, Handler},
      config: Config,
      emitter: new Emitter(),
      state: {}
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.Yomi = Yomi;
    } else {
      window.Yomi = {};
    }
    const debug = Yomi.debug;
    const emitter = Yomi.emitter;
    const util = Yomi.util;
    const addStyle = function (styles, id) {
      let elm = document.createElement('style');
      elm.type = 'text/css';
      if (id) {
        elm.id = id;
      }

      let text = styles.toString();
      text = document.createTextNode(text);
      elm.appendChild(text);
      let head = document.getElementsByTagName('head');
      head = head[0];
      head.appendChild(elm);
      return elm;
    };
    addStyle(`
      .page.active ~ .page {
        /*visibility: hidden;*/
        opacity: 0;
      }
      .content_list .pages .image_container .page {
       /* overflow: visible !important;*/
      }

      .stream_comment {
        opacity: 0 !important;
        visibility: hidden !important;
        left: 0 !important;
        /*top: 0 !important;*/
        height: 24px !important;
        overflow: visible !important; 
        z-index: 1;
      }
      .stream_comment[data-shuriken] {
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      .page .hoge:nth-child(3) {
        border: 1px solid blue;
      }
      
    `);

const ResizeWatchDog = (() => {
  const optionMap = new WeakMap();
  const jsonMap = new WeakMap();
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const rect = entry.contentRect;
      const target = entry.target;
      const options = optionMap.get(target) || {};
      const prefix = options.prefix || 'content';
      const {width, height, top, left} = rect;
      const resultJson = JSON.stringify(rect);
      if (jsonMap.get(target) === resultJson) {
        return;
      }
      jsonMap.set(target, resultJson);
      if (options.once) {
        observer.unobserve(target);
      }

      requestIdleCallback(() => {
        target.style.setProperty(
          `--${prefix}-width`, `${width}`);
        target.style.setProperty(
          `--${prefix}-height`, `${height}`);
        //
        target.style.setProperty(
          `--${prefix}-top`, `${top}`);
        target.style.setProperty(
          `--${prefix}-left`, `${left}`);

      });
    }
  });
  const watch = (target, options = {}) => {
    optionMap.set(target, options);
    observer.observe(target);
  };
  const unwatch = (target) => {
    optionMap.delete(target);
    observer.unobserve(target);
  };
  return {watch, unwatch};
})();

const ScrollWatchDog = (() => {
  const optionMap = new WeakMap();

  const onScroll = e => {
    const options = optionMap.get(e.target) || {};
    const prefix = options.prefix || 'scroll';
    const target =
      options.target ||
      (e.target instanceof Document ? e.target.documentElement : e.target);
    const top = target.scrollTop;
    const left = target.scrollLeft;

    requestIdleCallback(() => {
      target.style.setProperty(`--${prefix}-top`, top);
      target.style.setProperty(`--${prefix}-left`, left);
      target.dataset.scrollTop = top;
      target.dataset.scrollLeft = left;
    });
  };

  const watch = (target, options = {}) => {
    optionMap.set(target instanceof Window ? target.document : target, options);
    target.addEventListener('scroll', onScroll, {passive: true, once: !!options.once});
    onScroll({target});
  };
  const unwatch = element => {
    optionMap.delete(element);
    element.removeEventListener('scroll', onScroll);
  };

  return {watch, unwatch};
})();





class ShadowDancer extends HTMLElement {

  static get observeOptions() {
    return {

    };
  }
  constructor() {
    super();

    this.state = {};
    this.prop = {
      tagName: this.tagName.toLowerCase()
    };

    let target = this.getAttribute('target') && document.querySelector(this.getAttribute('target'));
    if (target) {
      this.attachLight(target);
    }
    this._mutationCallback = this._mutationCallback.bind(this);
  }

  html(state, prop) {
    return html`<slot></slot>`;
  }

  render() {
    //this.innerHTML = this.html(this.state, this.prop);
    render(this.html(this.state, this.prop), this);
  }

  attachLight(element) {
    element = typeof element === 'string' ? document.querySelector(element) : element;
    if (!element || element === this.light) {
      return;
    }
    if (this.light) {
      this.dettachLight();
    }
    this.light = element;
    this.shadow = element.attachShadow({mode: 'open'});
    this.shadow.append(this);
    // this.style.width = `${element.offsetWidth}px`;
    // this.style.height = `${element.offsetHeight}px`;

    this.startObserve();
  }

  _mutationCallback(records) {
    for (let record of records) {
      // console.log('record:', record.type, record.target, record.addedNodes, record.removedNodes);
    }
  }

  startObserve() {
    const options = this.constructor.observeOptions;
    if (!Object.keys(options).length) { return; }
    this._banken = this._banken || new MutationObserver(this._mutationCallback);
    this._banken.disconnect();
    this._banken.observe(this.light, this.constructor.observeOptions);
  }

  stopObserve() {
    if (!this._banken) { return; }
    this._banken.unwatch(this.light);
  }

  dettachLight() {
    if (!this.light) { return; }
    const slot = document.createElement('slot');
    this.replaceWith(slot);
    this.light = null;
    this.shadow = null;
    this._banken.disconnect();
  }

  connectedCallback() {
    this.render();
  }
}

window.customElements.define('shadow-element', ShadowDancer);


class YomiPage extends ShadowDancer {

  static get observeOptions() {
    return {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    };
  }

  constructor() {
    super();
    this.prop.active;
  }

  html(state, prop) {
    return html`
      <style>
      
        /*:host-context(.page.active ~ .page) .root {
          visibility: hidden !important;
        }*/
/*        :host-context(body:not([data-scroll-top="0"]) .active) .root {*/
        :host-context(.page.active) .root {
          position: fixed;
          /*width: calc(100vw - 64px);*/
          min-width: calc(var(--page-width) * 1px);
          height: calc(100vh - 64px);
          top: 48px;
          /*left: 32px;*/
          background: rgba(33, 33, 33, 0.9);
          border-radius: 8px;
          color: #ccc;
          /*outline: 4px solid red;*/
        }
        /*
        :host-context([data-scroll-top="0"] .page.active) .root {
          position: relative;
        }*/
        
        :host-context(.page) .root .inner {
          position: absolute;
          display: flex;
          left: 50%;
          top: 50%;
          --scale: calc((var(--content-height) - 48) / var(--page-height));
          transform: 
            translate(-50%, -50%)
            scale(var(--scale));
          box-shadow: 4px 4px 4px rgba(88, 88, 88, 0.9);
          overflow: hidden;
        }
        /*
        :host-context([data-scroll-top="0"] .page.active) .root .inner {
          position: relative;
          transform: none;
          box-shadow: none;
        }
        */
        
        /*::slotted(.stream_comment) {
          background: rgba(66, 0, 0, 0.5);
        }*/
        /*
        ::slotted(.stream_comment:nth-child(2) ~ .stream_comment) {
          animation-play-state: paused;
          color: yellow;
        }
        */
        /*
        ::slotted(.stream_comment + .stream_comment + .stream_comment) {
          animation-play-state: paused;
          color: orange;
        }
        */
        ::slotted(canvas.balloon) {
          /*top: 0 !important;
          left: 0 !important;*/
          transform: translate(-100%, -50%);
        }
        /*
        ::slotted(canvas.balloon:nth-child(2)) {
          top: 0 !important;
        }*/
        
      </style>
      <div class="root">
        <div class="inner">
        <slot></slot>
        </div>
      </div>
    `;
  }

  attachLight(element) {
    super.attachLight(element);
    this.prop.active = element.classList.contains('active');
    this._root = this.querySelector('.root');
    ResizeWatchDog.watch(this._root);
  }

  _onNodeAdded(elements) {

  }

  _onAttributeChanged(attr, value) {
    switch (attr) {
      case 'class':
        this.prop.active = attr.indexOf('active') >= 0;
        break;
    }
  }
}

window.customElements.define('yomi-page', YomiPage);


class Shuriken extends ShadowDancer {
  constructor() {
    super();
  }

  html(state, prop) {
    return html`
      <style>
        @keyframes move {
          0% {
              /*transform: translate(${prop.left}, 0);*/
              visibility: visible;
              transform: translate(calc(var(--content-width, 650) * 1px), 0);
          }
          100% {
              transform: translate(-100%, 0);
          }
        }
        ${prop.tagName} {
            position: absolute;
            left: 0;
            /*top: ${prop.top}px;*/
            display: inline-block;
            user-select: none;
            pointer-events: none;
            visiblity: hidden;
            font-size: 24px;
            line-height: 24px;
            color: #8f8;
            text-shadow: 
              -2px -2px 1px #000,
               2px -2px 1px #000,
              -2px  2px 1px #000,
               2px  2px 1px #000
                ;
            white-space: nowrap;
            transform: translate(calc(var(--content-width, 650) * 1px), 0);
            animation: move 4s linear;
            animation-fill-mode: forwards;
            /*animation-delay: ${prop.delay}s;*/
            z-index: 1000;
        }
        :host-context(.page .stream_comment) * {
          background: rgba(0, 0, 0, 0.5);
        }
        :host-context(
            .stream_comment + 
            .stream_comment + 
            .stream_comment
            ) ${prop.tagName} {
          animation-play-state: paused;
          color: red;
        }
      </style>
      <span class="shuriken root">${prop.text}</span>
    `;
  }

  attachLight(element) {
    this.prop.left = element.style.left;
    this.prop.top = element.style.top;//parseFloat((element.style.top || '').replace(/[^0-9]/g,''));
    this.prop.text = element.textContent;
    this.prop.delay = Math.max(parseInt(element.style.left) / 650 * 2 - 2, 0);
    // this.prop.t
    // this._root = this.querySelector('.root');
    setTimeout(() => {
      super.attachLight(element);
      element.dataset.shuriken = '1';
      // console.log(element.outerHTML);
      this.addEventListener('animationend', e => {
        setTimeout(() => {
          // element.remove();
          // this.textContent = '';
          // this.shadow.removeChild(this);
          // this.remove();
        }, 1000);
        // debugger;
      }, {once: true});
    }, this.prop.delay * 1000);
    // debugger;
    // console.log(this.prop, this.outerHTML);
  }
}
window.customElements.define('yomi-shuriken', Shuriken);

  const initialize = () => {
    let m = new WeakMap();
    let o = new MutationObserver(records => {
      for (let record of records) {
        Array.from(record.addedNodes).forEach(n => {
          if (!n.classList || !n.classList.contains('stream_comment')) { return; }
          requestIdleCallback(() => {
            m.set(n, Date.now());
            const s = document.createElement('yomi-shuriken');
            s.attachLight(n);
          });
        });
        Array.from(record.removedNodes).forEach(n => {
          let past = Date.now() - m.get(n);
          let className = n.className;
        });
      }
    });
    ScrollWatchDog.watch(window, {prefix: 'window-scroll'});
    o.observe(document.querySelector('#page_contents'), {childList: true, subtree: true});
    Array.from(document.querySelectorAll('.content_list .page[data-page-index] .note')).forEach(elm => {
      ResizeWatchDog.watch(elm, {prefix: 'page', once: true});
      const shadow = document.createElement('yomi-page');
      shadow.attachLight(elm);
    });
  };


   return Promise.all([
     import('https://cdn.jsdelivr.net/npm/lit-html@0.9.0/lit-html.min.js')
   ]).then(([lit]) => {
     window.console.log('import ', lit);
     html = lit.html;
     render = lit.render;
     initialize();
   });

}; // end of monkey



if (window !== window.top) {
  return;
}

const loadGm = () => {
  let script = document.createElement('script');
  script.id = `${PRODUCT}Loader`;
  script.setAttribute('type', 'module');
  script.setAttribute('charset', 'UTF-8');
  script.appendChild(document.createTextNode(`(${monkey})('${PRODUCT}');`));
  document.body.appendChild(script);
};

loadGm();

})(window.unsafeWindow || window);
