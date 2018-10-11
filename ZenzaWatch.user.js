// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    ニコニコ動画の速くて軽い動画プレイヤー
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
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.upload.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        1.14.34
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.1/fetch.js
// ==/UserScript==


(function(window) {
const PRODUCT = 'ZenzaWatch';
// 公式プレイヤーがurlを書き換えてしまうので読み込んでおく
const START_PAGE_QUERY = (location.search ? location.search.substring(1) : '');
const monkey = function(PRODUCT, START_PAGE_QUERY) {
  var console = window.console;
  var $ = window.ZenzaJQuery || window.jQuery, _ = window._;
  var TOKEN = 'r:' + (Math.random());
  START_PAGE_QUERY = unescape(START_PAGE_QUERY);
  var VER = '1.14.34';

  console.log(`exec ${PRODUCT} v${VER}...`);
  console.log('jQuery version: ', $.fn.jquery);

    var ZenzaWatch = {
      version: VER,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {
        hereDoc: function(func) { // えせヒアドキュメント
          return func.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\{\*/g, '/*').replace(/\*\}/g, '*/').trim();
        },
        callAsync: function(func, self, delay) {
          delay = delay || 0;
          if (self) {
            func = func.bind(self);
          }
          window.setTimeout(func, delay);
        },
        callOnIdle: function(func, self) {
          if (self) {
            func = func.bind(self);
          }
          if (window.requestIdleCallback) {
            window.requestIdleCallback(func);
          } else {
            window.setTimeout(func, 0);
          }
        }
      }
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {};
    }

    const util = ZenzaWatch.util;
    
  const CONSTANT = {
    BASE_Z_INDEX: 100000,

    CONTROL_BAR_HEIGHT: 40,

    SIDE_PLAYER_WIDTH: 400,
    SIDE_PLAYER_HEIGHT: 225,

    BIG_PLAYER_WIDTH: 896,
    BIG_PLAYER_HEIGHT: 480,

    RIGHT_PANEL_WIDTH: 320,
    BOTTOM_PANEL_HEIGHT: 240,

    // video.src クリア用。
    // 空文字だとbase hrefと連結されて https://www.nicovideo.jp が参照されるという残念な理由で // を指定している
    BLANK_VIDEO_URL : '//',

    MEDIA_ERROR: {
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE:  3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4
    }

  };





    var AsyncEmitter = (function() {

      function AsyncEmitter() {
      }

      AsyncEmitter.prototype.on = function(name, callback) {
        if (!this._events) { this._events = {}; }
        //if (typeof callback !== 'function') { debugger; }
        name = name.toLowerCase();
        if (!this._events[name]) {
          this._events[name] = [];
        }
        this._events[name].push(callback);
      };

      AsyncEmitter.prototype.off = function(name, func) {
        if (!this._events) { this._events = {}; }
        if (!func) {
          this._events[name] = [];
          return;
        }

        if (!this._events[name]) {
          this._events[name] = [];
        }
        _.pull(this._events[name], func);
      };

      AsyncEmitter.prototype.clear = function(name) {
        if (!this._events) { this._events = {}; }
        if (name) {
          this._events[name] = [];
        } else {
          this._events = {};
        }
      };

      AsyncEmitter.prototype.emit = function(name) {
        if (!this._events) { this._events = {}; }
        name = name.toLowerCase();
        if (!this._events.hasOwnProperty(name)) { return; }
        var e = this._events[name];
        var arg = Array.prototype.slice.call(arguments, 1);
        for (var i =0, len = e.length; i < len; i++) {
          // TODO: debug=trueの時だけcatch
          //try {
            e[i].apply(null, arg); //Array.prototype.slice.call(arguments, 1));
          //} catch (ex) {
          //  console.log('%c' + name, 'background:red; color: white;', i, e[i], ex);
          //  debugger;
          ////  throw ex;
          //}
        }
      };

      AsyncEmitter.prototype.emitAsync = function(...args) {
        if (!this._events) { this._events = {}; }

        window.setTimeout(() => {
          this.emit(...args);
        }, 0);
      };

      AsyncEmitter.prototype.emitPromise = function(name) {
        if (!this._events) { this._events = {}; }
        var args = Array.prototype.slice.call(arguments, 1);
        var self = this;
        return new Promise(function(resolve, reject) {
          var e = {
            resolve: resolve,
            reject: reject
          };
          args.unshift(e);
          args.unshift(name);
          self.emit.apply(self, args);
        });
      };

      return AsyncEmitter;
    })();

    ZenzaWatch.lib.AsyncEmitter = AsyncEmitter;

    window.ZenzaWatch.emitter = ZenzaWatch.emitter = new AsyncEmitter();

    var FullScreen = {
      now: function() {
        if (document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen) {
          return true;
        }
        return false;
      },
      request: function(target) {
        this._handleEvents();
        var elm = typeof target === 'string' ? document.getElementById(target) : target;
        if (!elm) { return; }
        if (elm.requestFullScreen) {
          elm.requestFullScreen();
        } else if (elm.webkitRequestFullScreen) {
          elm.webkitRequestFullScreen();
        } else if (elm.mozRequestFullScreen) {
          elm.mozRequestFullScreen();
        }
        //$('body').addClass('fullScreen');
      },
      cancel: function() {
        if (!this.now()) { return; }

        if (document.cancelFullScreen) {
          document.cancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        }
        //$('body').removeClass('fullScreen');
      },
      _handleEvents: function() {
        this._handleEvnets = _.noop;
        var self = this;
        var handle = function() {
          var isFullScreen = self.now();
          if (isFullScreen) {
            document.body.classList.add('fullScreen');
          } else {
            document.body.classList.remove('fullScreen');
          }
          ZenzaWatch.emitter.emit('fullScreenStatusChange', isFullScreen);
        };
        document.addEventListener('webkitfullscreenchange', handle, false);
        document.addEventListener('mozfullscreenchange', handle, false);
        document.addEventListener('MSFullscreenChange', handle, false);
        document.addEventListener('fullscreenchange', handle, false);
      }
    };

    ZenzaWatch.util.fullScreen = FullScreen;

    var Config = (function() {
      var prefix = 'ZenzaWatch_';
      var emitter = new AsyncEmitter();

      // 参考: https://github.com/mozilla/jschannel/pull/18
      // マイページなど古いprototype.jsが使われているせいで、
      // 標準のJSON.stringifyがバグってる。
      // 勘弁して欲しい…。
      if (window.Prototype && Array.prototype.toJSON) {
        var _json_stringify = JSON.stringify;
        JSON.stringify = function(value) {
          var toj = Array.prototype.toJSON;
          delete Array.prototype.toJSON;
          var r = _json_stringify(value);
          Array.prototype.toJSON = toj;
          return r;
        };
      }

      // 直接変更する時はコンソールで
      // ZenzaWatch.config.setValue('hogehoge' fugafuga);
      var defaultConfig = {
        debug: false,
        volume:       0.3,
        forceEnable:  false,
        showComment:  true,
        autoPlay:     true,
        'autoPlay:ginza':  true,
        loop:         false,
        mute:         false,
        screenMode:   'normal',
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
        enableAutoMylistComment: !true, // マイリストコメントに投稿者を入れる
        menuScale: 1.0,
        enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
        enableDblclickClose: true, //
        enableFullScreenOnDoubleClick: true,
        enableStoryboard: true, // シークバーサムネイル関連
        enableStoryboardBar: false, // シーンサーチ
        videoInfoPanelTab: 'videoInfoTab',

        forceEconomy: false,
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

        playlistLoop: false,
        commentLanguage: 'ja_JP',

        baseFontFamily: '',
        baseChatScale: 1.0,
        baseFontBolder: true,

        allowOtherDomain: false, // 外部サイトでも実行するかどうか

        overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く

        speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
        speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す


        enableCommentLayoutWorker: true, // コメントの配置計算を一部マルチスレッド化(テスト中)

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
        enableDmc: true, // 新サーバーを使うかどうか
        autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
        dmcVideoQuality: 'auto',   // 優先する画質 auto, veryhigh, high, mid, low

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

        KEY_CLOSE:      27,          // ESC
        KEY_RE_OPEN:    27 + 0x1000, // SHIFT + ESC
        KEY_HOME:       36 + 0x1000, // SHIFT + HOME

        KEY_SEEK_LEFT:  37 + 0x1000, // SHIFT + LEFT
        KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
        KEY_SEEK_LEFT2:  99999999, // カスタマイズ用
        KEY_SEEK_RIGHT2: 99999999, //

        KEY_VOL_UP:     38 + 0x1000, // SHIFT + UP
        KEY_VOL_DOWN:   40 + 0x1000, // SHIFT + DOWN

        KEY_INPUT_COMMENT:  67, // C
        KEY_FULLSCREEN:     70, // F
        KEY_MUTE:           77, // M
        KEY_TOGGLE_COMMENT: 86, // V

        KEY_DEFLIST_ADD:    84,          // T
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
        KEY_SHIFT_UP:   190 + 0x1000, // >

        KEY_NEXT_VIDEO: 74, // J
        KEY_PREV_VIDEO: 75, // K

        KEY_SCREEN_SHOT: 83, // S
        KEY_SCREEN_SHOT_WITH_COMMENT: 83 + 0x1000, // SHIFT + S
      };

      if (navigator &&
          navigator.userAgent &&
          navigator.userAgent.match(/(Android|iPad;|CriOS)/i)) {
        defaultConfig.overrideWatchLink       = true;
        defaultConfig.enableTogglePlayOnClick = true;
        defaultConfig.autoFullScreen          = true;
        defaultConfig.autoCloseFullScreen     = false;
        defaultConfig.volume                  = 1.0;
        defaultConfig.enableVideoSession      = true;
        defaultConfig['uaa.enable'] = false;
      }

      var config = {};
      var noEmit = false;

      _.each(Object.keys(defaultConfig), function(key) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
            config[key] = defaultConfig[key];
          }
        } else {
          config[key] = defaultConfig[key];
        }
      });

      /**
       * ローカルの設定値をlocalStorageから読み直す
       * 他のウィンドウで書き換えられる可能性のある物を読む前に使う
       */
      emitter.refreshValue = function(key) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      };

      emitter.getValue = function(key, refresh) {
        if (refresh) {
          emitter.refreshValue(key);
        }
        return config[key];
      };

      emitter.setValue = function(key, value) {
        if (config[key] !== value && arguments.length >= 2) {
          var storageKey = prefix + key;
          if (location.host === 'www.nicovideo.jp') {
            try {
              localStorage.setItem(storageKey, JSON.stringify(value));
            } catch (e) { window.console.error(e); }
          }
          config[key] = value;

          console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
          if (!noEmit) {
            this.emitAsync('update', key, value);
            this.emitAsync('update-' + key, value);
          }
        }
      };

      // イベントを投げないで設定変更だけする
      emitter.setValueSilently = function(key, value) {
        if (config[key] !== value && arguments.length >= 2) {
          var storageKey = prefix + key;
          if (location.host === 'www.nicovideo.jp') {
            try {
              localStorage.setItem(storageKey, JSON.stringify(value));
            } catch (e) { window.console.error(e); }
          }
          config[key] = value;

          console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
        }
      };


      /**
       * localStorageに保存しないで、ページをリロードするまでの間だけ書き換え
       */
      emitter.setSessionValue = function(key, value) {
        if (config[key] !== value) {
          config[key] = value;
          console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
          this.emitAsync('update', key, value);
          this.emitAsync('update-' + key, value);
         }
      };


      emitter.exportConfig = function() {
        var result = {};
        _.each(Object.keys(defaultConfig), function(key) {
          if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) { return; }
          var storageKey = prefix + key;
          if ((localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) &&
              defaultConfig[key] !== emitter.getValue(key)) {
            result[key] = emitter.getValue(key);
          }
        });
        return result;
      };

      emitter.importConfig = function(data) {
        noEmit = true;
        _.each(Object.keys(data), function(key) {
          if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) { return; }
          window.console.log('import config: %s=%s', key, data[key]);
          try {
            emitter.setValue(key, data[key]);
          } catch (e) {}
        });
        noEmit = false;
      };

      emitter.clearConfig = function() {
        noEmit = true;
        _.each(Object.keys(defaultConfig), function(key) {
          if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) { return; }
          var storageKey = prefix + key;
          try {
            if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
              localStorage.removeItem(storageKey);
            }
            config[key] = defaultConfig[key];
          } catch (e) {}
        });
        noEmit = false;
      };

      emitter.getKeys = function() {
        return Object.keys(defaultConfig);
      };

      emitter.namespace = function(name) {
        return {
          getValue: (key) => { return emitter.getValue(name + '.'+ key); },
          setValue: (key, value) => { emitter.setValue(name + '.'+ key, value); },
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

    ZenzaWatch.config = Config;

    const dummyConsole = {
      log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop, info: _.noop, warn: _.noop
    };
    console = Config.getValue('debug') ? window.console : dummyConsole;
    Config.on('update-debug', function(v) {
      console = v ? window.console : dummyConsole;
    });

    var PopupMessage = (function() {
      var __view__ = `
        <div class="zenzaPopupMessage">
          <span>%MSG%</span>
        </div><br>
      `.trim();

      var __css__ = `
        .zenzaPopupMessage {
          z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
          opacity: 0;
          display: inline-block;
          white-space: nowrap;
          font-weight: bolder;
          transform: translate3d(0, -100px, 0);
          overflow-y: hidden;
          box-sizing: border-box;
          min-width: 150px;
          text-align: center;
          box-shadow: 4px 4px 2px #ccc;
          transition:
            transform 2s linear,
            opacity 2s ease,
            z-index 1s ease,
            box-shadow 1s ease,
            background 5s ease;

          pointer-events: none;
          background: #000;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
        }

        .zenzaPopupMessage.show {
          transform: translate3d(0, 0, 0);
          opacity: 0.8;
          max-height: 200px;
          margin-bottom: 16px;
          padding: 8px 16px;
          box-shadow: 4px 4px 2px #ccc;
          transition:
            transform 0.5s linear,
            opacity 1s ease,
            box-shadow 0.5s ease,
            background 0.5s ease;
         }

        .zenzaPopupMessage.show.removing {
          transform: perspective(300px) rotateX(90deg);
          opacity: 0;
          max-height: 0;
          padding: 0px 8px;
          margin-bottom: 0px;
          box-shadow: 4px 4px 2px rgba(192, 192, 192, 0);
          background: rgba(255,255,255, 0.5);
          transition:
            transform     0.3s ease,
            opacity       0.5s ease 0.5s,
            max-height    0.3s ease 1s,
            padding       0.3s ease 1s,
            margin-bottom 0.3s ease 1s,
            box-shadow    0.5s ease,
            background    0.3s ease;
        }

        .zenzaPopupMessage.notify {
          background: #0c0;
          color: #fff;
        }

        .zenzaPopupMessage.alert {
          background: #c00;
          color: #fff;
        }

        .zenzaPopupMessage.debug {
          background: #333;
          color: #fff;
        }

        /* できれば広告に干渉したくないけど仕方なく */
        div[data-follow-container] {
          position: static !important;
        }

      `;

      var initialize = function() {
        initialize = _.noop;
        addStyle(__css__);
      };

      var show = function($msg) {
        initialize();
        var $target = $('.popupMessageContainer');
        if ($target.length < 1) {
          $target = $('body');
        }

        $target.append($msg);

        window.setTimeout(function() { $msg.addClass('show'); }, 100);
        window.setTimeout(function() { $msg.addClass('removing'); }, 3000);
        window.setTimeout(function() { $msg.remove(); }, 8000);
      };

      var undefined;
      var notify = function(msg, allowHtml) {
        if (msg === undefined) {
          msg = '不明なエラー';
          window.console.error('undefined message sent');
          window.console.trace();
        }
        console.log('%c%s', 'background: #080; color: #fff; padding: 8px;', msg);
        if (allowHtml !== true) {
          msg = ZenzaWatch.util.escapeHtml(msg);
        }
        var $msg = $(__view__.replace('%MSG%', msg)).addClass('notify');
        show($msg);
      };

      var alert = function(msg, allowHtml) {
        if (msg === undefined) {
          msg = '不明なエラー';
          window.console.error('undefined message sent');
          window.console.trace();
        }
        console.log('%c%s', 'background: #800; color: #fff; padding: 8px;', msg);
        if (allowHtml !== true) {
          msg = ZenzaWatch.util.escapeHtml(msg);
        }
        var $msg = $(__view__.replace('%MSG%', msg)).addClass('alert');
        show($msg);
      };

      var debug = function(msg, allowHtml) {
        if (msg === undefined) {
          msg = '不明なエラー';
          window.console.info('undefined message sent');
          window.console.trace();
        }
        window.console.log('%c%s', 'background: #333; color: #fff; padding: 8px;', msg);
        if (allowHtml !== true) {
          msg = ZenzaWatch.util.escapeHtml(msg);
        }
        var $msg = $(__view__.replace('%MSG%', msg)).addClass('debug');
        show($msg);
      };


      return {
        notify: notify,
        alert: alert,
        debug: debug
      };
    })();

    var PlayerSession = (function(storage) {
      var prefix = 'ZenzaWatch_';
      var PlayerSession = {};

      PlayerSession.save = function(playingStatus) {
        var key = prefix + 'PlayingStatus';
        storage[key] = JSON.stringify(playingStatus);
      };

      PlayerSession.restore = function() {
        var key = prefix + 'PlayingStatus';
        var session = {};
        try {
          var data = storage[key];
          if (!data) { return session; }
          session = JSON.parse(storage[key]);
          storage.removeItem(key);
        } catch (e) {
          window.console.error('PlayserSession restore fail: ', key, e);
        }
        console.log('lastSession', session);
        return session;
      };

      PlayerSession.clear = function() {
        var key = prefix + 'PlayingStatus';
        storage.removeItem(key);
      };

      PlayerSession.hasRecord = function() {
        var key = prefix + 'PlayingStatus';
        return storage.hasOwnProperty(key);
      };

      return PlayerSession;
    })(sessionStorage);
    //ZenzaWatch.debug.PlayerSession = PlayerSession;

    var addStyle = function(styles, id) {
      var elm = document.createElement('style');
      //window.setTimeout(function() {
        elm.type = 'text/css';
        if (id) { elm.id = id; }

        var text = styles.toString();
        text = document.createTextNode(text);
        elm.appendChild(text);
        var head = document.getElementsByTagName('head');
        head = head[0];
        head.appendChild(elm);
      //}, 0);
      return elm;
    };

    ZenzaWatch.util.addStyle = addStyle;

    util.parseQuery = function(query = '') {
      const result = {};
      query.split('&').forEach(item => {
        const sp = item.split('=');
        const key = decodeURIComponent(sp[0]);
        const val = decodeURIComponent(sp.slice(1).join('='));
        result[key] = val;
      });
      return result;
    };

    util.hasLargeThumbnail = function(videoId) { // return true;
      // 大サムネが存在する最初の動画ID。 ソースはちゆ12歳
      // ※この数字以降でもごく稀に例外はある。
      const threthold = 16371888;
      const cid = videoId.substr(0, 2);
      if (cid !== 'sm') { return false; }

      const fid = videoId.substr(2) * 1;
      if (fid < threthold) { return false; }

      return true;
    };

    // DMCよりも画質が良さそうか？を返す。
    // ビットレートは取得できないので動画長と解像度で返すしかない
    util.isBetterThanDmcMayBe = (width, height, duration /*, dmcVideos*/) => {
      // dmcInfoのvideosをパースして判別するのがいいのでは？と思っていたけど
      // 1080pの仕様がうまい具合にはまったので、何もしないことにした
      if (width > 1280 || height > 720) {
        return true;
      } else if (duration <  16 * 60) {
        // プリセットに存在しない解像度なら再エンコードされていない可能性が高い？
        if (//![1280, 960, 854, 640, 480].includes(width) ||
            ![ 720, 540, 480, 360].includes(height)) {
          return true;
        }
      } else if (duration >= 16 * 60 && duration <= 30 * 60 + 59) {
        if (height > 540) {
          return true;
        }
        if (//![960, 854, 640, 480].includes(width) ||
            ![540, 480, 360, 384, 486].includes(height)) {
          return true;
        }
      } else if (duration >= 31 * 60) {
        return false; // このくらいの長さになってくると解像度だけでは判断できないので保留
      }
      return false;
    };

    /**
     * 動画IDからサムネのURLを逆算する。
     * 実際はどのサーバーでもサムネ自体はあるっぽい。
     */
    var getThumbnailUrlByVideoId = (() => {
      const videoIdReg = /^[a-z]{2}\d+$/;
      return function(videoId) {
        if (!videoIdReg.test(videoId)) {
          return null;
        }
        const fileId = parseInt(videoId.substr(2), 10);
        const num = (fileId % 4) + 1;
        const large = util.hasLargeThumbnail(videoId) ? '.L' : '';
        return '//tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
      };
    })();
    ZenzaWatch.util.getThumbnailUrlByVideoId = getThumbnailUrlByVideoId;


    var getSubColor = function(color) {
      var result = ['#'];
      $(color.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/)).each(
        function(i, cl) {
          if (i) {
            result.push((parseInt(cl, 16) + 384).toString(16).substr(1));
          }
        }
      );
      return result.join('');
    };
    ZenzaWatch.util.getSubColor = getSubColor;

    var __css__ = `
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

      .zenzaWatchHoverMenu {
        display: none;
        opacity: 0.8;
        position: absolute;
        background: #eee;
        z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
        cursor: pointer;
        border: outset 1px;
        font-size: 8pt;
        width: 32px;
        height: 26px;
        padding: 0;
        line-height: 26px;
        font-weight: bold;
        text-align: center;
        transition: box-shadow 0.2s ease, opacity 0.4s ease, padding 0.2s ease;
        box-shadow: 2px 2px 3px #000;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
      }
      .zenzaWatchHoverMenu:hover {
        box-shadow: 4px 4px 5px #000;
        font-weibht: bolder;
        opacity: 1;
      }
      .zenzaWatchHoverMenu:active {
        box-shadow: none;
        margin-left: 4px;
        margin-right: 4px;
        border: inset 1px;
        box-shadow: 0px 0px 8px #000;
      }

      .zenzaWatchHoverMenu.show {
        display: block;
      }

      .zenzaPopupMenu {
        position: absolute;
        background: #333;
        color: #fff;
        overflow: visible;
        border: 1px solid #ccc;
        padding: 0;
        opacity: 0.99;
        box-shadow: 2px 2px 4px #fff;
        box-sizing: border-box;
        transition: opacity 0.3s ease;
        z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
      }

      .zenzaPopupMenu:not(.show) {
        left: -9999px;
        top: -9999px;
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
        border-top: 1px dotted #ccc;
      }
      /* .zenzaPopupMenu ul li:last-child { border-bottom: none; } */

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

    `;

    var WindowMessageEmitter = (function() {
      var asyncEmitter = new AsyncEmitter();
      var knownSource = [];

        var onMessage = function(event) {
          if (_.indexOf(knownSource, event.source) < 0 &&
              event.origin !== 'http://ext.nicovideo.jp' &&
              event.origin !== 'https://ext.nicovideo.jp'
              ) { return; }
          try {
            var data = JSON.parse(event.data);

            if (data.id !== 'ZenzaWatch') { return; }

            asyncEmitter.emit('onMessage', data.body, data.type);
          } catch (e) {
            console.log(
              '%cNicoCommentLayer.Error: window.onMessage  - ',
              'color: red; background: yellow',
              e,
              event
            );
            console.log('%corigin: ', 'background: yellow;', event.origin);
            console.log('%cdata: ',   'background: yellow;', event.data);
            console.trace();
          }
        };

        asyncEmitter.addKnownSource = function(win) {
          knownSource.push(win);
        };

        window.addEventListener('message', onMessage);

      return asyncEmitter;
    })();

    var broadcastEmitter = (function() {
      const broadcastEmitter = new AsyncEmitter();
      var broadcastChannel =
        (window.BroadcastChannel && location.host === 'www.nicovideo.jp') ?
          (new window.BroadcastChannel('ZenzaWatch')) : null;

      var pingResolve = null, pingReject = null;

      var onStorage = function(e) {
        var key = e.key;
        if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) { return; }

        key = key.replace('ZenzaWatch_', '');
        var oldValue = e.oldValue;
        var newValue = e.newValue;
        broadcastEmitter.emit('change', key, newValue, oldValue);

        switch(key) {
          case 'message':
            const packet = JSON.parse(newValue);
            if (packet.type === 'pong' && pingResolve) {
              pingReject = null;
              return pingResolve(packet);
            }
            console.log('%cmessage', 'background: cyan;', newValue);
            broadcastEmitter.emit('message', packet);
            break;
        }
      };

      var onBroadcastMessage = function(e) {
        const packet = e.data;
        if (packet.type === 'pong' && pingResolve) {
          pingReject = null;
          return pingResolve(packet);
        }
        console.log('%cmessage', 'background: cyan;', packet);
        broadcastEmitter.emit('message', packet);
      };

      broadcastEmitter.send = function(packet) {
        if (broadcastChannel) {
          broadcastChannel.postMessage(packet);
        } else {
          packet.__now = Date.now();
          console.log('send Packet', packet);
          Config.setValue('message', packet);
        }
      };

      WindowMessageEmitter.on('onMessage', function(data, type) {
        if (type !== 'nicovideoApi') { return; }
        switch (data.message.command) {
          case 'configSync':
            //window.console.log('configSync: ', data.message.key, data.message.value);
            Config.setValueSilently(data.message.key, data.message.value);
            break;
          case 'message':
            if (!data.message.value) { return; }
            const packet = JSON.parse(data.message.value);
            if (packet.type === 'pong' && pingResolve) {
              pingReject = null;
              return pingResolve(packet);
            }
            broadcastEmitter.emit('message', packet);
            break;
        }
      });

      broadcastEmitter.pong = function(playerId) {
        broadcastEmitter.send({id: playerId, type: 'pong'});
      };

      broadcastEmitter.ping = function() {
        const TIMEOUT = broadcastChannel ? 500 : 500;
        return new Promise(function(resolve, reject) {
          pingResolve = resolve;
          pingReject = reject;
          broadcastEmitter.send({type: 'ping'});
          window.setTimeout(function() {
            if (pingReject) {
              pingReject('timeout');
            }
            pingReject = pingResolve = null;
          }, TIMEOUT);
        });
      };

      broadcastEmitter.sendOpen = (watchId, params) => {
        broadcastEmitter.send(Object.assign({
          type: 'openVideo',
          watchId: watchId,
          eventType: 'click'
        }, params));
      };

      broadcastEmitter.notifyClose = function() {
        broadcastEmitter.send({type: 'notifyClose'});
      };

      if (ZenzaWatch.debug) {
        ZenzaWatch.debug.ping = () => {
          window.console.time('ping');
          return broadcastEmitter.ping().then((result) => {
            window.console.timeEnd('ping');
            window.console.info('ping result: ok', result);
          }, (result) => {
            window.console.timeEnd('ping');
            window.console.error('ping result: ', result);
          });
        };
      }

      if (location.host === 'www.nicovideo.jp') {
        if (broadcastChannel) {
          broadcastChannel.addEventListener('message', onBroadcastMessage);
        }
        window.addEventListener('storage', onStorage);
      }

      return broadcastEmitter;
    })();

    /**
     *  pushStateを使ってブラウザバックの履歴に載せようと思ったけど、
     *  あらゆるページに寄生するシステムの都合上断念。
     *  とりあえず既読リンクの色が変わるようにだけする
     */
    var WatchPageState = (function(config) {
      var isOpen = false;
      var originalUrl;
      var dialog;

      var onDialogOpen = function(watchId, options) {
        if (location.host !== 'www.nicovideo.jp') {
          if (ZenzaWatch.api.nicovideoLoader) {
            ZenzaWatch.api.nicovideoLoader.pushHistory('/watch/' + watchId);
          }
          return;
        }
        var url = originalUrl;
        if (!ZenzaWatch.util.isGinzaWatchUrl(originalUrl)) {
          url = location.href;
        }
        var state = {
          zenza: true,
          watchId: watchId,
          options: options.getRawData(),
          originalUrl: url
        };
        window.history.replaceState(
          state,
          null,
          '/watch/' + watchId // + '#' + originalUrl
        );

        // 一瞬だけGinzaのurlに変更して戻すことで、ブラウザの履歴に載せる
        // とりあえずChromeでは動いたけどすべてのブラウザでいけるのかは不明
        window.setTimeout(() => {
          if (ZenzaWatch.util.isGinzaWatchUrl(originalUrl)) {
            return;
          }
          window.history.replaceState(null, null, url);
        }, 0);
        isOpen = true;
      };

      var onVideoInfoLoad = function(videoInfo) {
        if (!videoInfo.watchId) { return; }
        var watchId = videoInfo.watchId;
        var title =
           'nicovideo: ' + videoInfo.title + ' - ' + videoInfo.ownerInfo.name;
        if (location.host !== 'www.nicovideo.jp') {
          if (ZenzaWatch.api.nicovideoLoader) {
            ZenzaWatch.api.nicovideoLoader.pushHistory('/watch/' + watchId, title);
          }
          return;
        }
        var url = originalUrl, originalTitle = document.title;
        if (!util.isGinzaWatchUrl(originalUrl)) {
          url = location.href;
        }

        var state = {};
        window.history.replaceState(
          state,
          null,
          '/watch/' + watchId // + '#' + originalUrl
        );
        document.title = title;

        // 一瞬だけGinzaのurlに変更して戻すことで、ブラウザの履歴に載せる
        // とりあえずChromeでは動いたけどすべてのブラウザでいけるのかは不明
        window.setTimeout(() => {
          document.title = originalTitle;
          if (util.isGinzaWatchUrl(originalUrl)) {
            return;
          }
          window.history.replaceState(null, null, url);
        }, 3000);
       };

      var initialize = function(_dialog) {
        initialize = _.noop;
        dialog = _dialog;
        if (!config.getValue('enablePushState')) {
          return;
        }

        originalUrl = location.href;
        
        dialog.on('open', onDialogOpen);
        dialog.on('loadVideoInfo', _.debounce(onVideoInfoLoad, 0));
        //dialog.on('close', onDialogClose);
      };

      return {
        initialize: initialize
      };
    })(Config);

    var getWatchId = function(url) {
      /\/?watch\/([a-z0-9]+)/.test(url || location.pathname);
      return RegExp.$1;
    };
    ZenzaWatch.util.getWatchId = getWatchId;

    var isPremium = function() {
      var h = document.getElementById('siteHeaderNotification');
      return h && h.className === 'siteHeaderPremium';
    };
    ZenzaWatch.util.isPremium = isPremium;

    var isLogin = function() {
      return document.getElementsByClassName('siteHeaderLogin').length < 1;
    };
    ZenzaWatch.util.isLogin = isLogin;

    var getPageLanguage = function() {
      try {
        var h = document.getElementsByClassName('html')[0];
        return h.lang || 'ja-JP';
      } catch(e) {
        return 'ja-JP';
      }
    };
    ZenzaWatch.util.getPageLanguage = getPageLanguage;

    var isSameOrigin = function() {
      return location.host === 'www.nicovideo.jp';
    };
    ZenzaWatch.util.isSameOrigin = isSameOrigin;

    var hasFlashPlayer = function() {
      return !!navigator.mimeTypes['application/x-shockwave-flash'];
    };
    ZenzaWatch.util.hasFlashPlayer = hasFlashPlayer;

    var isFirefox = function() {
      return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
    };
    ZenzaWatch.util.isFirefox = isFirefox;

    var isWebkit = function() {
      return navigator.userAgent.toLowerCase().indexOf('webkit') >= 0;
    };
    ZenzaWatch.util.isWebkit = isWebkit;

    var escapeHtml = function(text) {
      var map = {
        '&':    '&amp;',
        '\x27': '&#39;',
        '"':   '&quot;',
        '<':    '&lt;',
        '>':    '&gt;'
      };
      return text.replace(/[&"'<>]/g, function(char) {
        return map[char];
      });
    };
    ZenzaWatch.util.escapeHtml = escapeHtml;

    var unescapeHtml = function(text) {
      var map = {
        '&amp;'  : '&' ,
        '&#39;'  : '\x27',
        '&quot;' : '"',
        '&lt;'   : '<',
        '&gt;'   : '>'
      };
      return text.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, function(char) {
        return map[char];
      });
    };
    ZenzaWatch.util.unescapeHtml = unescapeHtml;


    // 基本的に動画タイトルはエスケープされている。
    // だが、なんかたまにいいかげんなデータがあるし、本当に信用できるか？
    // そこで、全角に置き換えてごますんだ！
    var escapeToZenkaku = function(text) {
      var map = {
        '&':    '＆',
        '\'': '’',
        '"':   '”',
        '<':    '＜',
        '>':    '＞'
      };
      return text.replace(/["'<>]/g, function(char) {
        return map[char];
      });
    };
    ZenzaWatch.util.escapeToZenkaku = escapeToZenkaku;


    var escapeRegs = function(text) {
      var map = {
        '\\': '\\\\',
        '*':  '\\*',
        '+':  '\\+',
        '.':  '\\.',
        '?':  '\\?',
        '{':  '\\{',
        '}':  '\\}',
        '(':  '\\(',
        ')':  '\\)',
        '[':  '\\[',
        ']':  '\\]',
        '^':  '\\^',
        '$':  '\\$',
        '-':  '\\-',
        '|':  '\\|',
        '/':  '\\/',
      };
      return text.replace(/[\\\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/]/g, function(char) {
        return map[char];
      });
    };
    ZenzaWatch.util.escapeRegs = escapeRegs;

    util.dateToString = (date) => {
      if (typeof date === 'string') {
        const origDate = date;
        date = date.replace(/\//g, '-');
        // 時差とか考慮してない
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

      let [yy, mm, dd, h, m, s] =
        ([
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
          date.getSeconds()
        ]).map(n => { return n < 10 ? `0${n}` : n; });
      return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
    };

    var copyToClipBoard = ZenzaWatch.util.copyToClipBoard = function(text) {
      var clip = document.createElement('input');
      clip.type           = 'text';
      clip.style.position = 'fixed';
      clip.style.left     = '-9999px';
      clip.value          = text;

	    document.body.appendChild(clip);
    	clip.select();
	    document.execCommand('copy');

      window.setTimeout(function() { clip.remove(); }, 0);
    };

    ZenzaWatch.util.isValidJson = function(data) {
      try {
        JSON.parse(data);
        return true;
      } catch (e) {
        return false;
      }
    };

    const addTemplate = ZenzaWatch.util.addTemplate = function(tpl, id) {
      if (!id) {
        id = PRODUCT + '-template-' + addTemplate._id++;
      }
      const template = document.createElement('template');
      template.id = id;
      template.innerHTML = tpl;
      document.body.appendChild(template);
      return {template, id};
    };
    addTemplate._id = 0;

    ZenzaWatch.util.openTweetWindow = function(videoInfo) {
      var watchId = videoInfo.watchId;
      var nicomsUrl = 'https://nico.ms/' + watchId;
      var watchUrl = location.protocol + '//www.nicovideo.jp/watch/' + watchId;

      var sec = videoInfo.duration;
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      var dur = ['(', m, ':', s, ')'].join('');
      var nicoch = videoInfo.isChannel ? ',+nicoch' : '';
      var url =
        'https://twitter.com/intent/tweet?' +
        'url='       + encodeURIComponent(nicomsUrl) +
        '&text='     + encodeURIComponent(videoInfo.title + dur) +
        '&hashtags=' + encodeURIComponent(videoInfo.videoId + nicoch) +
        '&original_referer=' + encodeURIComponent(watchUrl) +
        '';
      window.open(url, '_blank', 'width=550, height=480, left=100, top50, personalbar=0, toolbar=0, scrollbars=1, sizable=1', 0);
    };

    ZenzaWatch.util.fetch = function(url, params) {
      if (location.host !== 'www.nicovideo.jp') {
        return NicoVideoApi.fetch(url, params);
      }
      return window.fetch(url, params);
    };

    if (!location.host.match(/\.nicovideo\.jp$/)) {
      ZenzaWatch.util.fetch = function() {};
    }

    var ajax = function(params) {
      if (location.host !== 'www.nicovideo.jp') {
        return NicoVideoApi.ajax(params);
      }
      // マイページのjQueryが古くてDeferredの挙動が怪しいのでネイティブのPromiseで囲う
      return new Promise((resolve, reject) => {
        $.ajax(params).then(
          (result) => { return resolve(result); },
          (err)    => { return reject(err); }
        );
      });
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      ZenzaWatch.util.ajax = ajax;
    }

    var openMylistWindow = function(watchId) {
      window.open(
       '//www.nicovideo.jp/mylist_add/video/' + watchId,
       'nicomylistadd',
       'width=500, height=400, menubar=no, scrollbars=no');
    };
    ZenzaWatch.util.openMylistWindow = openMylistWindow;

    var isGinzaWatchUrl = function(url) {
      url = url || location.href;
      return /^https?:\/\/www\.nicovideo\.jp\/watch\//.test(url);
    };
    ZenzaWatch.util.isGinzaWatchUrl = isGinzaWatchUrl;

    ZenzaWatch.util.getPlayerVer = function() {
      if (!!document.getElementById('js-initial-watch-data')) {
        return 'html5';
      }
      if (!!document.getElementById('watchAPIDataContainer')) {
        return 'flash';
      }
      return 'unknown';
    };

    var isZenzaPlayableVideo = function() {
      try {
        // HTML5版プレイヤーなら再生できるはず
        if (util.getPlayerVer() === 'html5') {
          return true;
        }
        const watchApiData = JSON.parse($('#watchAPIDataContainer').text());
        const flvInfo = util.parseQuery(
            decodeURIComponent(watchApiData.flashvars.flvInfo)
          );
        const dmcInfo = JSON.parse(
            decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
          );
        const videoUrl  = flvInfo.url ? flvInfo.url : '';
        const isDmc = dmcInfo && dmcInfo.time;
        if (isDmc) { return true; }
        const isSwf = /\/smile\?s=/.test(videoUrl);
        const isRtmp = (videoUrl.indexOf('rtmp') === 0);
        return (isSwf || isRtmp) ? false : true;
       } catch (e) {
        return false;
      }
    };
    ZenzaWatch.util.isZenzaPlayableVideo = isZenzaPlayableVideo;

    ZenzaWatch.util.createDrawCallFunc = function(func) {
      var requestAnimationFrame =
        (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame).bind(window);
      if (!requestAnimationFrame) { return func; }

      var lastCalled = 0, arg, requestId = 0;
      var isBusy = function() {
        return Date.now() - lastCalled < 1000;
      };

      var onFrame = function() {
        func.apply(null, arg);
        requestId = lastCalled = 0;
      };

      return function() {
        if (isBusy()) { return; }
        if (requestId) { cancelAnimationFrame(requestId); requestId = 0; }
        lastCalled = Date.now();
        arg = arguments;
        requestId = requestAnimationFrame(onFrame);
      };
    };

    ZenzaWatch.util.waitForInitialize = function() {
      return new Promise((resolve) => {
        if (ZenzaWatch.ready) {
          return resolve();
        }
        ZenzaWatch.emitter.on('ready', () => {
          Promise.resolve();
        });
      });
    };

    ZenzaWatch.util.secToTime = function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    };

    ZenzaWatch.util.videoCapture = function(src, sec) {
      return new Promise((resolve, reject) => {
        let resolved = false;
        const v = document.createElement('video');
        const css = {
          width: '64px',
          height: '36px',
          position: 'fixed',
          left: '-100px',
          top: '-100px'
        };
        Object.keys(css).forEach(key => {
          v.style[key] = css[key];
        });

        v.addEventListener('loadedmetadata', () => {
          v.currentTime = sec;
        });
        v.addEventListener('error', (err) => {
          v.remove();
          return reject(err);
        });

        const onSeeked = () => {
          if (resolved) { return; }
          const c = document.createElement('canvas');
          c.width  = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0);
          v.remove();

          resolved = true;
          return resolve(c);
        };

        v.addEventListener('seeked', onSeeked);

        document.body.appendChild(v);
        v.volume = 0;
        v.autoplay = false;
        v.controls = false;
        v.src = src;
        v.currentTime = sec;
      });
    };

    util.capTube = function({title, videoId, author}) {
      const iframe = document.querySelector(
        '#ZenzaWatchVideoPlayerContainer iframe[title^=YouTube]');
      if (!iframe) { return; }
      const command = 'capture';
      iframe.contentWindow.postMessage(
        JSON.stringify({command, title, videoId, author}),
        'https://www.youtube.com'
      );
    };

    util.saveMymemory = function(player, videoInfo) {
      let html = player.getMymemory();
      const title =
        videoInfo.watchId + ' - ' +
        videoInfo.title; // エスケープされてる
      const info = (`
        <div>
          <h2>${videoInfo.title}</h2>
          <a href="//www.nicovideo.jp/watch/${videoInfo.watchId}?from=${Math.floor(player.getCurrentTime())}">元動画</a><br>
          作成環境: ${navigator.userAgent}<br>
          作成日: ${(new Date()).toLocaleString()}<br>
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
      a.setAttribute('target', '_blank');
      a.setAttribute('href', url);
      a.setAttribute('rel', 'noopener');
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => { a.remove(); }, 1000);
    };

    util.speak = (() => {
      let speaking = false;
      let msg = null;
      //let initialized = false;
      let resolve = null, reject = null;

      let initialize = () => {
        // Chromeは使い回しできるけどFirefoxはできないっぽい?
        //if (initialized) { return; }
        //initialized = true;

        msg = new window.SpeechSynthesisUtterance();

        msg.onend   = () => {
          speaking = false;
          if (resolve) { resolve(msg.text); }
          resolve = reject = null;
        };

        msg.onerror = () => {
          speaking = false;
          if (reject) { reject(msg.text); }
          resolve = reject = null;
        };

      };

      return function(text, option = {}) {
        if (!window.speechSynthesis) { return; }
        initialize();

        if (option.volume) { msg.volume = option.volume; }
        if (option.rate)   { msg.rate   = option.rate; }
        if (option.lang)   { msg.lang   = option.lang; }
        if (option.pitch)  { msg.pitch  = option.pitch; }
        if (option.rate)   { msg.rate   = option.rate; }

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          if (reject) {
            reject(new Error('cancel'));
          }
          resolve = reject = null;
        }

        msg.text = text;

        return new Promise((res, rej) => {
          resolve = res;
          reject = rej;
          window.speechSynthesis.speak(msg);
        });
      };
    })();

    util.createDom = function(template) {
      const tpl = document.createElement('template');
      tpl.innerHTML = template;
      return document.importNode(tpl.content, true).querySelector('*');
    };

    util.dispatchCustomEvent = function(elm, name, detail) {
      const ev = new CustomEvent(name, {
        detail
      });
      elm.dispatchEvent(ev);
    };

    util.getNicoHistory = function() {
      return window.unescape(document.cookie.replace(/^.*(nicohistory[^;+]).*?/, ''));
    };

    util.watchResize = function(target, callback) {
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
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        position: 'absolute',
        pointerEvents: 'none',
        border: 0,
        //transform: 'translate3d(0, 0, 0)',
        opacity: 0
      });
      target.appendChild(iframe);
      iframe.contentWindow.addEventListener('resize', () => {
        callback();
      });
    };



    // いずれjQueryを捨てるためのミニマム代用
    // 車輪の再発明をするわけではないし、積極的に使うものでもない
    util.$ = (() => {

      const eventListener = {};
      const toCamel = p => {
        return p.replace(/-./g, s => { return s.charAt(1).toUpperCase(); });
      };

      class $wrapper {
        constructor(elements) {
          elements = elements || [];
          if (elements instanceof(NodeList)) {
            elements = Array.from(elements);
          }
          this._elements = _.uniq(elements);
        }

        forEach(callback) {
          return this._elements.forEach(callback);
        }

        some(callback) {
          return this._elements.some(callback);
        }

        get length() {
          return this._elements.length;
        }

        find(query) {
          const result = [];
          this.forEach(elm => {
            Array.from(elm.querySelectorAll(query)).forEach(e => {
              result.push(e);
            });
          });

          return new $wrapper(_.uniq(result));
        }

        closest(query) {
          if (this.hasClass(query)) {
            return this;
          }
          let result;
          this.some(elm => {
            const e = elm.closest(query);
            if (e) {
              result = e;
              return true;
            }
          });
          if (result) {
            return new $wrapper(result);
          }
          return null;
        }

        toggleClass(className, v) {
          this.forEach(elm => {
            className.trim().split(/[ ]+/).forEach(c => {
              elm.classList.toggle(c, v);
            });
          });
          return this;
        }

        addClass(className) {
          return this.toggleClass(className, true);
        }

        removeClass(className) {
          return this.toggleClass(className, false);
        }

        hasClass(className) {
          return this.some(e => {
            return className.split(/[ ]+/).some(cn => {
              return e.classList.contains(cn);
            });
          });
        }

        _css(key, val) {
          const camelKey = toCamel(key);
          if (/(width|height|top|left)$/i.test(camelKey) && isNaN(val)) {
            val += 'px';
          }
          this.forEach(e => {
            e.style[camelKey] = val;
          });
          return this;
        }

        css(key, val) {
          if (typeof key === 'string') {
            return this._css(key, val);
          }
          Object.keys(key).forEach(k => {
            return this._css(k, key[k]);
          });
          return this;
        }

        on(eventName, callback, options) {
          if (typeof callback !== 'function') { return; }
          const listener = eventListener[eventName] || [];
          listener.push(callback);
          eventListener[eventName] = listener;

          eventName = eventName.split('.')[0];
          this.forEach(e => {
            e.addEventListener(eventName, callback, options);
          });
          return this;
        }

        off(eventName, callback, options) {
          if (typeof callback !== 'function') {
            this.forEach((e) => {
              const listener = eventListener[eventName] || [];

              eventName = eventName.split('.')[0];
              listener.forEach(ls => {
                e.removeEventListener(eventName, ls);
              });
            });
          } else {
            eventName = eventName.split('.')[0];
            this.forEach((e) => {
              e.removeEventListener(eventName, callback, options);
            });
          }
          return this;
        }

        _setAttribute(key, val) {
          if (val === null || val === '' || val === undefined) {
            this.forEach(e => { e.removeAttribute(key); });
          } else {
            this.forEach(e => { e.setAttribute(key, val); });
          }
          return this;
        }

        setAttribute(key, val) {
          if (typeof key === 'string') {
            return this._setAttribute(key, val);
          }
          Object.keys(key).forEach(k => { this._setAttribute(k, key[k]); });
          return this;
        }

        attr(key, val) {
          if (arguments.length >= 2 || _.isObject(key)) {
            return this.setAttribute(key, val);
          } else {
            let result = null;
            this.some(e => {
              if (e.hasAttribute(key)) {
                result = e.getAttribute(key);
                return true;
              }
            });
            return result;
          }
        }
        
        append(elm) {
          if (this._elements.length < 1) { return; }
          let node = this._elements[0];
          if (elm instanceof($wrapper) || elm.forEach) {
            elm.forEach(e => { node.appendChild(e); });
          } else if (elm instanceof(NodeList)) {
            elm = Array.from(elm);
            elm.forEach(e => { node.appendChild(e); });
          } else if (elm instanceof(Node)) {
            node.appendChild(elm);
          }
        }

        appendChild(...args) { this.append(...args); }
      }

      const createDom = util.createdom;

      const $ = function(q) {
        if (q instanceof($wrapper)) {
          return q;
        } else if (q instanceof(Node)) {
          return new $wrapper([q]);
        } else if (q instanceof(NodeList)) {
          return new $wrapper(Array.from(q));
        } else if (typeof q === 'string') {
          if (q.startsWith('<')) {
            return new $wrapper(Array.from(createDom(q).querySelectorAll('*')));
          } else {
            return new $wrapper(Array.from(document.querySelectorAll(q)));
          }
        }
      };

      ZenzaWatch.debug.eventListener = eventListener;

      return $;
    })();

    var ShortcutKeyEmitter = (function(config) {
      let emitter = new AsyncEmitter();
      let isVerySlow = false;

      // コンソールでキーバインド変更
      //
      // 例: ENTERでコメント入力開始
      // ZenzaWatch.config.setValue('KEY_INPUT_COMMENT', 13);
      // SHIFTをつけたいときは 13 + 0x1000
      
      let map = {
        CLOSE: 0,
        RE_OPEN: 0,
        HOME: 0,
        SEEK_LEFT: 0,
        SEEK_RIGHT: 0,
        SEEK_LEFT2: 0,
        SEEK_RIGHT2: 0,
        VOL_UP: 0,
        VOL_DOWN: 0,
        INPUT_COMMENT: 0,
        FULLSCREEN: 0,
        MUTE: 0,
        TOGGLE_COMMENT: 0,
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
        map[key] = parseInt(config.getValue('KEY_' + key), 10);
      });

      //window.console.log('keymap', map);

      let onKeyDown = function(e) {
        if (e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA') {
          return;
        }

        let keyCode = e.keyCode +
          (e.metaKey  ? 0x1000000 : 0) +
          (e.altKey   ? 0x100000  : 0) +
          (e.ctrlKey  ? 0x10000   : 0) +
          (e.shiftKey ? 0x1000    : 0);
        let key = '';
        let param = '';
        switch (keyCode) {
          case 178: case 179:
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
            key = 'SEEK_TO'; param = 0;
            break;
          case map.SEEK_LEFT2:
            key = 'SEEK_BY'; param = isVerySlow ? -0.5 : -5;
            break;
          case map.SEEK_LEFT:
          case 37: // LEFT
            if (e.shiftKey || isVerySlow) { key = 'SEEK_BY'; param = isVerySlow ? -0.5 : -5; }
            break;

          case map.VOL_UP:
            key = 'VOL_UP';
            break;
          case map.SEEK_RIGHT2:
            key = 'SEEK_BY'; param = isVerySlow ?  0.5 :  5;
            break;
          case map.SEEK_RIGHT:
          case 39: // RIGHT
            if (e.shiftKey || isVerySlow) { key = 'SEEK_BY'; param = isVerySlow ?  0.5 :  5; }
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
            key = 'SCREEN_MODE'; param = 'small';
            break;
          case map.SCREEN_MODE_2:
            key = 'SCREEN_MODE'; param = 'sideView';
            break;
          case map.SCREEN_MODE_3:
            key = 'SCREEN_MODE'; param = '3D';
            break;
          case map.SCREEN_MODE_4:
            key = 'SCREEN_MODE'; param = 'normal';
            break;
          case map.SCREEN_MODE_5:
            key = 'SCREEN_MODE'; param = 'big';
            break;
          case map.SCREEN_MODE_6:
            key = 'SCREEN_MODE'; param = 'wide';
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
            //window.console.log('%conKeyDown: %s', 'background: yellow;', keyCode);
            break;
        }
        if (key) {
          emitter.emit('keyDown', key, e, param);
        }
      };

      var onKeyUp = function(e) {
        if (e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA') {
          return;
        }

        let key = '';
        let keyCode = e.keyCode +
          (e.metaKey  ? 0x1000000 : 0) +
          (e.altKey   ? 0x100000  : 0) +
          (e.ctrlKey  ? 0x10000   : 0) +
          (e.shiftKey ? 0x1000    : 0);
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

      var initialize = function() {
        initialize = _.noop;
        $('body')
          .on('keydown.zenzaWatch', onKeyDown)
          .on('keyup.zenzaWatch',   onKeyUp);
        ZenzaWatch.emitter.on('keydown', onKeyDown);
        ZenzaWatch.emitter.on('keyup',   onKeyUp);
      };

      ZenzaWatch.emitter.on('ready', initialize);
      return emitter;
    })(Config);
  ZenzaWatch.util.ShortcutKeyEmitter = ShortcutKeyEmitter;

  var AppendStyle = function() { this.initialize.apply(this, arguments); };
  _.assign(AppendStyle.prototype, {
    initialzie: function(params) {
      var css = this._css = params.css;
      this.updateParams(params.params);
      if (!params.appendLater) {
        this._style = ZenzaWatch.util.adStyle(css);
      }
    },
    updateParams: function(params) {
      var css = this._css;
      _.each(Object.keys(params), function(key) {
        var reg = new RegExp('%' + key + '%', 'g');
        css = css.replace(reg, params[key]);
      });
      this._css = css;
      this.refresh();
    },
    refresh: function() {
      if (!this._style) {
        this._style = ZenzaWatch.util.adStyle(this._css);
      } else {
        this._style.innerHTML = this._css;
      }
    }
  });

  var ViewPort = function() { this.initialize.apply(this, arguments); };
  _.assign(ViewPort.prototype, {
    initialize: function() {
      var $meta = $('meta[name=viewport]');
      if ($meta.length < 1) {
        $meta = $('<' + 'meta name="viewport"/>');
        $('head').append($meta);
      } else {
        this._defaultContent = $meta.attr('content');
      }
      this._$meta = $meta;
      this._enable = false;
      this.update();
      //$(window).on('resize', _.debounce(_.bind(this._onResize, this), 1000));
      ZenzaWatch.emitter.on('DialogPlayerOpen',  this.enable.bind(this));
      ZenzaWatch.emitter.on('DialogPlayerClose', this.disable.bind(this));
    },
    _onResize: function() {
      this.update();
    },
    update: function() {
      if (this._enable) {
        if (false && _.isNumber(window.devicePixelRatio)) {
          this._$meta
            .attr('content',
              'width=' + window.innerWidth * window.devicePixelRatio + ',' +
              //'width=' + 1280 + ',' +
              'initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0');
        } else {
          this._$meta
            .attr('content',
              'initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0');
        }
        return;
      }
      if (this._defaultContent) {
        this._$meta.attr('content', this._defaultContent);
        return;
      }
      this._$meta.attr('content', '');
    },
    enable: function() {
      if (!this._enable) {
        this._enable = true;
        this.update();
      }
    },
    disable: function() {
      if (this._enable) {
        this._enable = false;
        this.update();
      }
    }
  });

  var RequestAnimationFrame = function(callback, frameSkip) {
    this.initialize(callback, frameSkip);
  };
  _.assign(RequestAnimationFrame.prototype, {
    initialize: function(callback, frameSkip) {
      this.requestAnimationFrame =
        (window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame).bind(window);
      this.cancelAnimationFrame =
        (window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.webkitCancelAnimationFrame).bind(window);

      this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
      this._frameCount = 0;
      this._callback = callback;
      this._enable = false;
      this._onFrame = this._onFrame.bind(this);
    },
    _onFrame: function() {
      if (this._enable) {
        this._frameCount++;
        try {
          if (this._frameCount % (this._frameSkip + 1) === 0) {
            this._callback();
          }
        } catch (e) {
          console.log('%cException!', 'background: red;', e);
        }

        if (this.requestAnimationFrame) {
          this._requestId = this.requestAnimationFrame(this._onFrame);
        } else {
          this._requestId = window.setTimeout(this._onFrame, 100);
        }
      }
    },
    enable: function() {
      if (this._enable) { return; }
      this._enable = true;

      if (this.requestAnimationFrame) {
        this._requestId = this.requestAnimationFrame(this._onFrame);
      } else {
        this._requestId = window.setTimeout(this._onFrame, 100);
      }
    },
    disable: function() {
      this._enable = false;

      if (!this._requestId) { return; }
      if (this.cancelAnimationFrame) {
        this.cancelAnimationFrame(this._requestId);
      } else {
        window.clearTimeout(this._requestId);
      }
      this._requestId = null;
    }
  });
  ZenzaWatch.util.RequestAnimationFrame = RequestAnimationFrame;


  var FrameLayer = function() { this.initialize.apply(this, arguments); };
  FrameLayer.createReservedFrame = function() {
    var iframe = document.createElement('iframe');
    iframe.className = 'reservedFrame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.srcdocType = typeof iframe.srcdoc;
    iframe.srcdoc = '<html></html>';
    document.body.appendChild(iframe);
  };

  _.extend(FrameLayer.prototype, AsyncEmitter.prototype);
  _.assign(FrameLayer.prototype, {
    initialize: function(params) {
      this._$container  = params.$container;
      this._retryGetIframeCount = 0;

      this._initializeView(params, 0);
    },
    _initializeView: function(params, retryCount) {

      var iframe = this._getIframe();
      iframe.className = params.className || '';

      var onload = () => {
        var win, doc;
        iframe.onload = null;
        try {
          win = iframe.contentWindow;
          doc = iframe.contentWindow.document;
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
      };

      var html = this._html = params.html;
      this._$container.append(iframe);
      if (iframe.srcdocType === 'string') {
        iframe.onload = onload;
        iframe.srcdoc = html;
      } else {
        // MS IE/Edge用
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
        window.setTimeout(onload, 0);
      }
    },
    _getIframe: function() {
      var reserved = document.getElementsByClassName('reservedFrame');
      var iframe;
      if (reserved && reserved.length > 0) {
        iframe = reserved[0];
        document.body.removeChild(iframe);
        iframe.style.position = '';
        iframe.style.left = '';
      } else {
        iframe = document.createElement('iframe');
      }

      try {
        iframe.srcdocType = iframe.srcdocType || typeof iframe.srcdoc;
        iframe.srcdoc = '<html></html>';
      } catch (e) {
        // 行儀の悪い広告にiframeを乗っ取られた？
        window.console.error('Error: ', e);
        this._retryGetIframeCount++;
        if (this._retryGetIframeCount < 5) {
          return this._getIframe();
        }
      }
      return iframe;
    }
  });

  const MylistPocketDetector = (function() {
    let isReady = false;
    let pocket = null;
    const emitter = new AsyncEmitter();

    const initialize = function() {
      const onPocketReady = () => {
        isReady = true;
        pocket = window.MylistPocket;

        emitter.emit('ready', pocket);
      };

      if (window.MylistPocket && window.MylistPocket.isReady) {
        onPocketReady();
      } else {
        window.jQuery('body').on('MylistPocketReady', () => {
        //document.body.addEventListener('MylistPocketInitialized', () => {
          onPocketReady();
        });
      }
    };

    const detect = function() {
      return new Promise(res => {
        if (isReady) {
          return res(pocket);
        }
        emitter.on('ready', () => {
          res(pocket);
        });
      });
    };

    initialize();
    return {
      detect: detect
    };

  })();


  const VideoCaptureUtil = (function() {
    const crossDomainGates = {};

    const initializeByServer = function(server, fileId) {
      if (crossDomainGates[server]) {
        return crossDomainGates[server];
      }

      const baseUrl = '//' + server + '/smile?i=' + fileId;

      crossDomainGates[server] = new CrossDomainGate({
        baseUrl: baseUrl,
        origin: location.protocol + '//' + server + '/',
        type: 'storyboard_' + server.split('.')[0].replace(/-/g, '_'),
        messager: WindowMessageEmitter
      });

      return crossDomainGates[server];
    };

    const _toCanvas = function(v, width, height) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(v, 0, 0, width, height);
      return canvas;
    };

    const isCORSReadySrc = function(src) {
      if (src.indexOf('dmc.nico') >= 0) {
        return true;
      }
      return false;
    };

    const videoToCanvas = function(video) {
      const src = video.src;
      const sec = video.currentTime;
      const a = document.createElement('a');
      a.href = src;
      const server = a.host;
      const search = a.search;

      if (isCORSReadySrc(src)) {
        return Promise.resolve({canvas: _toCanvas(video, video.videoWidth, video.videoHeight)});
      }

      return new Promise((resolve, reject) => {
        if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
          return reject({status: 'fail', message: 'invalid url', url: src});
        }
        const fileId = RegExp.$2;

        const gate = initializeByServer(server, fileId);

        gate.videoCapture(src, sec).then(dataUrl => {
          //window.console.info('video capture success ', dataUrl.length);

          const bin = atob(dataUrl.split(',')[1]);
          const buf = new Uint8Array(bin.length);
          for (let i = 0, len = buf.length; i < len; i++) {
            buf[i] = bin.charCodeAt(i);
          }
          const blob = new Blob([buf.buffer], {type: 'image/png'});
          const url = window.URL.createObjectURL(blob);
          console.info('createObjectUrl', url.length);

          const img = new Image();

          img.onload = () => {
            resolve({canvas: _toCanvas(img, video.videoWidth, video.videoHeight)});
            window.setTimeout(() => { window.URL.revokeObjectURL(url); }, 10000);
          };

          img.onerror = (err) => {
            reject(err);
            window.setTimeout(() => { window.URL.revokeObjectURL(url); }, 10000);
          };

          img.src = url;
          //img.style.border = '2px dotted orange'; document.body.appendChild(img);
        });
      });
    };

    // 参考
    // https://developer.mozilla.org/ja/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
    const htmlToSvg = function(html, width = 682, height = 384) {
      const data =
        (`<svg xmlns='https://www.w3.org/2000/svg' width='${width}' height='${height}'>
          <foreignObject width='100%' height='100%'>${html}</foreignObject>
        </svg>`).trim();
      const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
      return {svg, data};
    };

    const htmlToCanvas = function(html, width = 640, height = 360) {

      const imageW = height * 16 / 9;
      const imageH = imageW * 9 / 16;
      const {svg, data} = htmlToSvg(html);

      const url = window.URL.createObjectURL(svg);
      if (!url) {
        return Promise.reject(new Error('convert svg fail'));
      }
      const img = new Image();
      img.width  = 682;
      img.height = 384;
      const canvas = document.createElement('canvas');

      const context = canvas.getContext('2d');
      canvas.width  = width;
      canvas.height = height;

      return new Promise((resolve, reject) => {
        img.onload = () => {
          context.drawImage(
            img,
            (width  - imageW) / 2,
            (height - imageH) / 2,
            imageW,
            imageH);
          resolve({canvas, img});
          //window.console.info('img size', img.width, img.height);
          window.URL.revokeObjectURL(url);
        };
        img.onerror = (e) => {
          window.console.error('img.onerror', e, data);
          reject(e);
          window.URL.revokeObjectURL(url);
        };

        img.src = url;
      });
    };

    const nicoVideoToCanvas = function({video, html, minHeight = 1080}) {
      let scale = 1;
      let width  =
        Math.max(video.videoWidth, video.videoHeight * 16 / 9);
      let height = video.videoHeight;
      // 動画の解像度が低いときは、可能な範囲で整数倍に拡大する
      if (height < minHeight) {
        scale  = Math.floor(minHeight / height);
        width  *= scale;
        height *= scale;
      }

      const canvas = document.createElement('canvas');
      const ct = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = height;

      return videoToCanvas(video).then(({canvas, img}) => {

        //canvas.style.border = '2px solid red'; document.body.appendChild(canvas);
        ct.fillStyle = 'rgb(0, 0, 0)';
        ct.fillRect(0, 0, width, height);

        ct.drawImage(
          canvas,
          (width  - video.videoWidth  * scale) / 2,
          (height - video.videoHeight * scale) / 2,
          video.videoWidth  * scale,
          video.videoHeight * scale
        );

        return htmlToCanvas(html, width, height);
      }).then(({canvas, img}) => {

        //canvas.style.border = '2px solid green'; document.body.appendChild(canvas);

        ct.drawImage(canvas, 0, 0, width, height);

        return Promise.resolve({canvas, img});
      }).then(() => {
        return Promise.resolve({canvas});
      });
    };


    const saveToFile = function(canvas, fileName = 'sample.png') {
      const dataUrl = canvas.toDataURL('image/png');
      const bin = atob(dataUrl.split(',')[1]);
      const buf = new Uint8Array(bin.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = bin.charCodeAt(i);
      }
      const blob = new Blob([buf.buffer], {type: 'image/png'});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      window.console.info('download fileName: ', fileName);
      a.setAttribute('download', fileName);
      a.setAttribute('target', '_blank');
      a.setAttribute('href', url);
      a.setAttribute('rel', 'noopener');
      document.body.appendChild(a);
      a.click();
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 2000);
      window.console.timeEnd('screenShot');
    };

    return {
      videoToCanvas,
      htmlToCanvas,
      nicoVideoToCanvas,
      saveToFile
    };
  })();

  class BaseViewComponent extends AsyncEmitter {
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

    _initDom({parentNode, name, template, css = '', shadow = ''}) {
      let tplId = `${PRODUCT}${name}Template`;
      let tpl = document.getElementById(tplId);
      if (!tpl) {
        if (css) { util.addStyle(css, `${name}Style`); }
        tpl = document.createElement('template');
        tpl.innerHTML = template;
        tpl.id = tplId;
        document.body.appendChild(tpl);
      }
      const onClick = this._bound.onClick = this._onClick.bind(this);

      const view = document.importNode(tpl.content, true);
      this._view = view.querySelector('*') || document.createDocumentFragment();
      if (this._view) {
        this._view.addEventListener('click', onClick);
      }
      this.appendTo(parentNode);

      if (shadow) {
        this._attachShadow({host: this._view, name, shadow});
        if (!this._isDummyShadow) {
          this._shadow.addEventListener('click', onClick);
        }
      }
    }

    _attachShadow ({host, shadow, name, mode = 'open'}) {
      let tplId = `${PRODUCT}${name}Shadow`;
      let tpl = document.getElementById(tplId);
      if (!tpl) {
        tpl = document.createElement('template');
        tpl.innerHTML = shadow;
        tpl.id = tplId;
        document.body.appendChild(tpl);
      }

      if (!host.attachShadow && !host.createShadowRoot) {
        return this._fallbackNoneShadowDom({host, tpl, name});
      }

      const root = host.attachShadow ?
        host.attachShadow({mode}) : host.createShadowRoot();
      const node = document.importNode(tpl.content, true);
      root.appendChild(node);
      this._shadowRoot = root;
      this._shadow = root.querySelector('.root');
      this._isDummyShadow = false;
    }

    _fallbackNoneShadowDom({host, tpl, name}) {
      const node = document.importNode(tpl.content, true);
      const style = node.querySelector('style');
      style.remove();
      util.addStyle(style.innerHTML, `${name}Shadow`);
      host.appendChild(node);
      this._shadow = this._shadowRoot = host.querySelector('.root');
      this._isDummyShadow = true;
    }

    setState(key, val) {
      if (typeof key === 'string') {
        this._setState(key, val);
      }
      Object.keys(key).forEach(k => {
        this._setState(k, key[k]);
      });
    }

    _setState(key, val) {
      if (this._state[key] !== val) {
        this._state[key] = val;
        if (/^is(.*)$/.test(key))  {
          this.toggleClass(`is-${RegExp.$1}`, !!val);
        }
        this.emit('update', {key, val});
      }
    }

    _onClick(e) {
      const target = e.target.classList.contains('command') ?
        e.target : e.target.closest('.command');

      if (!target) { return; }

      const command = target.getAttribute('data-command');
      if (!command) { return; }
      const type  = target.getAttribute('data-type') || 'string';
      let param   = target.getAttribute('data-param');
      e.stopPropagation();
      e.preventDefault();
      switch (type) {
        case 'json':
        case 'bool':
        case 'number':
          param = JSON.parse(param);
          break;
      }

      this._onCommand(command, param);
    }

    appendTo(parentNode) {
      if (!parentNode) { return; }
      this._parentNode = parentNode;
      parentNode.appendChild(this._view);
    }

    _onCommand(command, param) {
      this.emit('command', command, param);
    }

    toggleClass(className, v) {
      (className || '').split(/ +/).forEach((c) => {
        this._view.classList.toggle(c, v);
        if (this._shadow) {
          this._shadow.classList.toggle(c, this._view.classList.contains(c));
        }
      });
    }

    addClass(name)    { this.toggleClass(name, true); }
    removeClass(name) { this.toggleClass(name, false); }
  }


    var CacheStorage = (function() {
      var PREFIX = 'ZenzaWatch_cache_';

      function CacheStorage() {
        this.initialize.apply(this, arguments);
      }

      _.assign(CacheStorage.prototype, {
        initialize: function(storage) {
          this._storage = storage;
        },
        setItem: function(key, data, expireTime) {
          key = PREFIX + key;
          var expiredAt =
            typeof expireTime === 'number' ? (Date.now() + expireTime) : '';
          console.log('%ccacheStorage.setItem', 'background: cyan;', key, typeof data, data);
          this._storage[key] = JSON.stringify({
            data: data,
            type: typeof data,
            expiredAt: expiredAt
          });
        },
        getItem: function(key) {
          key = PREFIX + key;
          if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
            return null;
          }
          var item = null, data = null;
          try {
            item = JSON.parse(this._storage[key]);
            if (item.type === 'string') {
              data = item.data;
            } else if (typeof item.data === 'string') {
              data = JSON.parse(item.data);
            } else {
              data = item.data;
            }
          } catch(e) {
            window.console.error('CacheStorage json parse error:', e);
            window.console.log(this._storage[key]);
            this._storage.removeItem(key);
            return null;
          }

          if (item.expiredAt === '' || item.expiredAt > Date.now()) {
            return data;
          }
          return null;
        },
        removeItem: function(key) {
          key = PREFIX + key;
          if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
            return null;
          }

          this._storage.removeItem(key);
        },
        clear: function() {
          var storage = this._storage;
          _.each(Object.keys(storage), function(v) {
            if (v.indexOf(PREFIX) === 0) {
              window.console.log('remove item', v, storage[v]);
              storage.removeItem(v);
            }
          });
        }
      });

      return CacheStorage;
    })();
    ZenzaWatch.api.CacheStorage = CacheStorage;
    ZenzaWatch.debug.localCache = new CacheStorage(localStorage);


    const VideoInfoLoader = (function() {
      const cacheStorage = new CacheStorage(sessionStorage);

     //JSON.parse(decodeURIComponent(JSON.parse($('#watchAPIDataContainer').text()).flashvars.dmcInfo))
      const parseFromGinza = function(dom) {
        try {
          let watchApiData = JSON.parse(dom.querySelector('#watchAPIDataContainer').textContent);
          let videoId = watchApiData.videoDetail.id;
          let hasLargeThumbnail = ZenzaWatch.util.hasLargeThumbnail(videoId);
          let flvInfo = util.parseQuery(
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
          let watchAuthKey  = watchApiData.flashvars.watchAuthKey;
          let seekToken     = watchApiData.flashvars.seek_token;
          let msgInfo = {
            server:   flvInfo.ms,
            threadId: flvInfo.thread_id,
            duration: flvInfo.l,
            userId:   flvInfo.user_id,
            isNeedKey: flvInfo.needs_key === '1',
            optionalThreadId: flvInfo.optional_thread_id,
            userKey:  flvInfo.userkey,
            hasOwnerThread: !!watchApiData.videoDetail.has_owner_thread,
            when: null
          };

          let playlist =
            JSON.parse(dom.querySelector('#playlistDataContainer').textContent);
          const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
          const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));

          cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

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

          ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
          return result;

        } catch (e) {
          window.console.error('error: parseFromGinza ', e);
          return null;
        }
      };

      const parseFromHtml5Watch = function(dom) {
        const watchDataContainer = dom.querySelector('#js-initial-watch-data');
        const data = JSON.parse(watchDataContainer.getAttribute('data-api-data'));
        const env  = JSON.parse(watchDataContainer.getAttribute('data-environment'));

        const videoId = data.video.id;
        const hasLargeThumbnail = util.hasLargeThumbnail(videoId);
        const flvInfo = data.video.smileInfo || {};
        const dmcInfo = data.video.dmcInfo || {};
        const thumbnail = data.video.thumbnailURL + (hasLargeThumbnail ? '.L' : '');
        const videoUrl  = flvInfo.url ? flvInfo.url : '';
        const isEco = /\d+\.\d+low$/.test(videoUrl);
        const isFlv = /\/smile\?v=/.test(videoUrl);
        const isMp4 = /\/smile\?m=/.test(videoUrl);
        const isSwf = /\/smile\?s=/.test(videoUrl);
        const isDmc = !!dmcInfo && !!dmcInfo.session_api;
        const isChannel = !!data.channel;
        const isCommunity = !!data.community;
        const csrfToken     = data.context.csrfToken;
        const watchAuthKey  = data.context.watchAuthKey;
        const playlistToken = env.playlistToken;
        const context = data.context;
        const linkedChannelVideo =
          (context.linkedChannelVideos || []).find(ch => {
          return !!ch.isChannelMember;
        });
        const isNeedPayment = context.isNeedPayment;
        const msgInfo = {
          server:   data.thread.serverUrl,
          threadId: data.thread.ids.community || data.thread.ids.default,
          //threadId: data.thread.ids.default,
          duration: data.video.duration,
          userId:   data.viewer.id,
          isNeedKey: (isChannel || isCommunity), // ??? flvInfo.needs_key === '1',
          optionalThreadId: '',
            //data.thread.ids.community ? data.thread.ids.default : '', //data.thread.ids.nicos,
            //data.thread.ids.nicos,
          userKey: data.context.userkey,
          hasOwnerThread: data.thread.hasOwnerThread,
          when: null
        };

        const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
        const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));

        cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

        const playlist = {playlist: []};
        (data.playlist.items || []).forEach(item => {
          if (!item.hasData) { return; }
          playlist.playlist.push({
              _format:       'html5playlist',
              _data:          item,
              id:             item.id,
              title:          item.title,
              length_seconds: item.lengthSeconds,
              num_res:        item.numRes,
              mylist_counter: item.mylistCounter,
              view_counter:   item.viewCounter,
              thumbnail_url:  item.thumbnailURL,
              first_retrieve: item.firstRetrieve,
              has_data:       true,
              is_translated: false
          });
        });

        const tagList = [];
        data.tags.forEach(t => {
          tagList.push({
            _data: t,
            id: t.id,
            tag: t.name,
            dic: t.isDictionaryExists,
            lock:       t.isLocked, // 形式が統一されてない悲しみを吸収
            owner_lock: t.isLocked ? 1 : 0,
            lck:        t.isLocked ? '1' : '0',
            cat: t.isCategory
          });
        });
        let channelInfo = null, channelId = null;
        if (data.channel) {
          channelInfo = {
            icon_url:     data.channel.iconURL || '',
            id:           data.channel.id,
            name:         data.channel.name,
            is_favorited: data.channel.isFavorited ? 1 : 0
          };
          channelId = channelInfo.id;
        }
        let uploaderInfo = null;
        if (data.owner) {
          uploaderInfo = {
            icon_url:        data.owner.iconURL,
            id:              data.owner.id,
            nickname:        data.owner.nickname,
            is_favorited:    data.owner.isFavorited,
            isMyVideoPublic: data.owner.isUserMyVideoPublic
          };
        }

        const watchApiData = {
          videoDetail: {
            v:  data.context.watchId,
            id: data.video.id,
            title:                data.video.title,
            title_original:       data.video.originalTitle,
            description:          data.video.description,
            description_original: data.video.originalDescription,
            postedAt:             data.video.postedDateTime,
            thumbnail:            data.video.thumbnailURL,
            length:               data.video.duration,

            commons_tree_exists:  !!data.video.isCommonsTreeExists,

            width:  data.video.width,
            height: data.video.height,

            isChannel:   data.channel && data.channel.id,
            isMymemory:  data.context.isMyMemory, // 大文字小文字注意
            communityId: data.community ? data.community.id : null,
            channelId,

            commentCount: data.thread.commentCount,
            mylistCount:  data.video.mylistCount,
            viewCount:    data.video.viewCount,

            tagList
          },
          viewerInfo: { id: data.viewer.id },
          channelInfo,
          uploaderInfo
        };

        let ngFilters = null;
        if (data.video && data.video.dmcInfo && data.video.dmcInfo.thread && data.video.dmcInfo.thread) {
          if (data.video.dmcInfo.thread.channel_ng_words && data.video.dmcInfo.thread.channel_ng_words.length) {
            ngFilters = data.video.dmcInfo.thread.channel_ng_words.length;
          } else if (data.video.dmcInfo.thread.owner_ng_words && data.video.dmcInfo.thread.owner_ng_words.length) {
            ngFilters = data.video.dmcInfo.thread.owner_ng_words.length;
          }
        }
        if (data.context && data.context.ownerNGList && data.context.ownerNGList.length) {
          ngFilters = data.context.ownerNGList;
        }
        if (ngFilters) {
          const ngtmp = [];
          ngFilters.forEach((ng) => {
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

          isNeedPayment,
          linkedChannelVideo,
          resumeInfo: {
            initialPlaybackType:     data.context.initialPlaybackType || '',
            initialPlaybackPosition: data.context.initialPlaybackPosition || 0
          }
        };

        ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
        return result;
      };


      const parseWatchApiData = function(src) {
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

        const url = `//www.nicovideo.jp/watch/${videoId}`;
        window.console.info('%cloadLinkedChannelVideoInfo', 'background: cyan', linkedChannelVideo);
        return new Promise(r => {
            setTimeout(() => { r(); }, 1000);
          }).then(() => {
            return util.fetch(url, {credentials: 'include'});
          })
          .then(res => { return res.text(); })
          .then(html => {
            const dom = document.createElement('div');
            dom.innerHTML = html;
            const data = parseFromHtml5Watch(dom);
            //window.console.info('linkedChannelData', data);
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
        ZenzaWatch.debug.watchApiData = data;
        if (!data) {
          return Promise.reject({
            reason: 'network',
            message: '通信エラー。動画情報の取得に失敗しました。(watch api)'
          });
        }

        if (data.reject) {
          return Promise.reject(data);
        }

        if (data.isFlv && !data.isEco) {
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

        ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId);
        return Promise.resolve(data);
      };

      const createSleep = function(sleepTime) {
        return new Promise(resolve => {
          window.setTimeout(() => { return resolve(); }, sleepTime);
        });
      };

      const loadPromise = function(watchId, options, isRetry = false) {
        let url = `${location.protocol}//www.nicovideo.jp/watch/${watchId}`;
        console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);
        const query = [];
        if (options.economy === true) {
          query.push('eco=1');
        }
        if (query.length > 0) {
          url += '?' + query.join('&');
        }

        return util.fetch(url, {credentials: 'include'})
          .then(res => { return res.text(); })
          .catch(() => {
            return Promise.reject({reason: 'network', message: '通信エラー(network)'});
          })
          .then(onLoadPromise.bind(this, watchId, options, isRetry))
          .catch(err => {
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
        load: function(watchId, options) {
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



    var ThumbInfoLoader = (function() {
      var BASE_URL = location.protocol + '//ext.nicovideo.jp/';
      var MESSAGE_ORIGIN = location.protocol + '//ext.nicovideo.jp/';
      var gate = null;
      var cacheStorage;

      var parseXml = function(xmlText) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(xmlText, 'text/xml');
        var val = function(name) {
          var elms = xml.getElementsByTagName(name);
          if (elms.length < 1) {
            return null;
          }
          return elms[0].innerHTML;
        };

        var resp = xml.getElementsByTagName('nicovideo_thumb_response');
        if (resp.length < 1 || resp[0].getAttribute('status') !== 'ok') {
          return {
            status: 'fail',
            code: val('code'),
            message: val('description')
          };
        }

        var duration = (function() {
          var tmp = val('length').split(':');
          return parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
        })();
        var watchId = val('watch_url').split('/').reverse()[0];
        var postedAt = util.dateToString(new Date(val('first_retrieve')));
        var tags = (function() {
          var result = [], t = xml.getElementsByTagName('tag');
          _.each(t, function(tag) {
            result.push(tag.innerHTML);
          });
          return result;
        })();

        let videoId = val('video_id');
        let isChannel = videoId.substring(0, 2) === 'so';

        var result = {
          status: 'ok',
          _format: 'thumbInfo',
          v:     isChannel ? videoId : watchId,
          id:    videoId,
          isChannel,
          title: val('title'),
          description:  val('description'),
          thumbnail:    val('thumbnail_url'),
          movieType:    val('movie_type'),
          lastResBody:  val('last_res_body'),
          duration,
          postedAt,
          mylistCount:  parseInt(val('mylist_counter'), 10),
          viewCount:    parseInt(val('view_counter'), 10),
          commentCount: parseInt(val('comment_num'), 10),
          tagList: tags
        };
        var userId = val('user_id');
        if (userId !== null) {
          result.owner = {
            type: 'user',
            id: userId,
            name: val('user_nickname') || '(非公開ユーザー)',
            url:  userId ? ('//www.nicovideo.jp/user/' + userId) : '#',
            icon: val('user_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
          };
        }
        var channelId  = val('ch_id');
        if (channelId !== null) {
          result.owner = {
            type: 'channel',
            id: channelId,
            name: val('ch_name') || '(非公開ユーザー)',
            url: '//ch.nicovideo.jp/ch' + channelId,
            icon: val('ch_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
          };
        }
        console.log('thumbinfo: ', watchId, result);

        cacheStorage.setItem('thumbInfo_' + result.v, result);

        return result;
      };

      var initialize = function() {
        initialize = _.noop;
        cacheStorage = new CacheStorage(sessionStorage);
        gate = new CrossDomainGate({
          baseUrl: BASE_URL,
          origin: MESSAGE_ORIGIN,
          type: 'thumbInfo',
          messager: WindowMessageEmitter
        });
      };

      var load = function(watchId) {
        initialize();

        return new Promise(function(resolve, reject) {
          var cache = cacheStorage.getItem('thumbInfo_' + watchId);
          if (cache) {
            console.log('cache exist: ', watchId);
            ZenzaWatch.util.callAsync(function() { resolve(cache); });
            return;
          }

          gate.load(BASE_URL + 'api/getthumbinfo/' + watchId).then(function(result) {
            result = parseXml(result);
            if (result.status === 'ok') {
              resolve(result);
            } else {
              reject(result);
            }
          });
        });
      };

      return {
        load: load
      };
    })();
    ZenzaWatch.api.ThumbInfoLoader = ThumbInfoLoader;
// ZenzaWatch.api.ThumbInfoLoader.load('sm9').then(function() {console.log(true, arguments); }, function() { console.log(false, arguments)});


    var MessageApiLoader = (function() {
      var VERSION_OLD = '20061206';
      var VERSION     = '20090904';

      const LANG_CODE = {
        'en_us': 1,
        'zh_tw': 2
      };

      var MessageApiLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.assign(MessageApiLoader.prototype, {
        initialize: function() {
          this._threadKeys = {};
          this._waybackKeys = {};
        },
        /**
         * 動画の長さに応じて取得するコメント数を変える
         * 本家よりちょっと盛ってる
         */
        getRequestCountByDuration: function(duration) {
          if (duration < 60)  { return 100; }
          if (duration < 240) { return 200; }
          if (duration < 300) { return 400; }
          return 1000;
        },
        getThreadKey: function(threadId, language) {
          // memo:
          // //flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          var url =
            '//flapi.nicovideo.jp/api/getthreadkey?thread=' + threadId;
          const langCode = this.getLangCode(language);
          if (langCode) { url += `&language_id=${langCode}`; }

          return new Promise((resolve, reject) => {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then((e) => {
              var result = util.parseQuery(e);
              this._threadKeys[threadId] = result;
              resolve(result);
            }, (result) => {
              reject({
                result: result,
                message: 'ThreadKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        getWaybackKey: function(threadId, language) {
          let url =
            '//flapi.nicovideo.jp/api/getwaybackkey?thread=' + threadId;
          const langCode = this.getLangCode(language);
          if (langCode) { url += `&language_id=${langCode}`; }
          return new Promise((resolve, reject) => {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then((e) => {
              let result = util.parseQuery(e);
              this._waybackKeys[threadId] = result;
              resolve(result);
            }, (result) => {
              reject({
                result: result,
                message: 'WaybackKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        getLangCode: function(language) {
          language = language.replace('-', '_').toLowerCase();
          if (LANG_CODE[language]) {
            return LANG_CODE[language];
          }
          return 0;
        },
        getPostKey: function(threadId, blockNo, language) {
          // memo:
          // //flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          //flapi.nicovideo.jp/api/getpostkey/?device=1&thread=1111&version=1&version_sub=2&block_no=0&yugi=
          var url =
            '//flapi.nicovideo.jp/api/getpostkey?device=1&thread=' + threadId +
            '&block_no=' + blockNo +
            '&version=1&version_sub=2&yugi=' +
  //          '&language_id=0';
            '';
          //const langCode = this.getLangCode(language);
          //if (langCode) { url += `&language_id=${langCode}`; }

          console.log('getPostkey url: ', url);
          return new Promise((resolve, reject) => {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then((e) => {
              resolve(ZenzaWatch.util.parseQuery(e));
            }, (result) => {
              //PopupMessage.alert('ThreadKeyの取得失敗 ' + threadId);
              reject({
                result: result,
                message: 'PostKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        _createThreadXml:
          function(params) { //msgInfo, version, threadKey, force184, duration, userKey) {
          const threadId         =
            params.isOptional ? params.msgInfo.optionalThreadId : params.msgInfo.threadId;
          const duration         = params.msgInfo.duration;
          const userId           = params.msgInfo.userId;
          const userKey          = params.msgInfo.userKey;
          const threadKey        = params.threadKey;
          const force184         = params.force184;
          const version          = params.version;
          const when             = params.msgInfo.when;
          const waybackKey       = params.waybackKey;

          const thread = document.createElement('thread');
          thread.setAttribute('thread', threadId);
          thread.setAttribute('version', version);
          if (params.useUserKey) {
            thread.setAttribute('userkey', userKey);
          }
          if (params.useDuration) {
            //const resCount = this.getRequestCountByDuration(duration);
            thread.setAttribute('click_revision', '-1');
            thread.setAttribute('res_from', '-1000');
            thread.setAttribute('fork', '1');
          }
          //if (params.msgInfo.hasOwnerThread && !params.isOptional) {
          //}
          if (typeof userId !== 'undefined') {
            thread.setAttribute('user_id', userId);
          }
          if (params.useThreadKey && typeof threadKey !== 'undefined') {
            thread.setAttribute('threadkey', threadKey);
          }
          if (params.useThreadKey && typeof force184 !== 'undefined') {
            thread.setAttribute('force_184', force184);
          }
          if (waybackKey) {
            thread.setAttribute('waybackkey', waybackKey);
          }
          if (when) {
            thread.setAttribute('when', when);
          }
          thread.setAttribute('scores', '1');
          thread.setAttribute('nicoru', '1');
          thread.setAttribute('with_global', '1');

          const langCode = this.getLangCode(params.msgInfo.language);
          if (langCode) { thread.setAttribute('language', langCode); }

          return thread;
        },
        _createThreadLeavesXml:
          //function(threadId, version, userId, threadKey, force184, duration, userKey) {
          function(params) {//msgInfo, version, threadKey, force184, userKey) {
          const threadId         =
            params.isOptional ? params.msgInfo.optionalThreadId : params.msgInfo.threadId;
          const duration         = params.msgInfo.duration;
          const userId           = params.msgInfo.userId;
          const userKey          = params.msgInfo.userKey;
          const threadKey        = params.threadKey;
          const force184         = params.force184;
          const when             = params.msgInfo.when;
          const waybackKey       = params.waybackKey;

          const thread_leaves = document.createElement('thread_leaves');
          const resCount = this.getRequestCountByDuration(duration);
          const threadLeavesParam =
            ['0-', (Math.floor(duration / 60) + 1), ':100,', resCount].join('');
          thread_leaves.setAttribute('thread', threadId);
          if (params.useUserKey) {
            thread_leaves.setAttribute('userkey', userKey);
          }
          if (typeof userId !== 'undefined') {
            thread_leaves.setAttribute('user_id', userId);
          }
          if (typeof threadKey !== 'undefined') {
            thread_leaves.setAttribute('threadkey', threadKey);
          }
          if (typeof force184 !== 'undefined') {
            thread_leaves.setAttribute('force_184', force184);
          }
          if (waybackKey) {
            thread_leaves.setAttribute('waybackkey', waybackKey);
          }
          if (when) {
            thread_leaves.setAttribute('when', when);
          }
          thread_leaves.setAttribute('scores', '1');
          thread_leaves.setAttribute('nicoru', '1');

          const langCode = this.getLangCode(params.msgInfo.language);
          if (langCode) { thread_leaves.setAttribute('language', langCode); }

          thread_leaves.innerHTML = threadLeavesParam;

          return thread_leaves;
        },

        buildPacket: function(msgInfo, threadKey, force184, waybackKey)
        {

          const span   = document.createElement('span');
          const packet = document.createElement('packet');

          // リクエスト用のxml生成なのだが闇が深い
          // 不要なところにdurationやuserKeyを渡すとコメントが取得できなくなったりする
          // 不要なら無視してくれればいいのに
          // 本当よくわからないので困る
          if (msgInfo.optionalThreadId) {
            packet.appendChild(
              this._createThreadXml({
                msgInfo: msgInfo,
                version: VERSION,
                useDuration: false,
                useUserKey: true,
                useThreadKey: false,
                isOptional: true,
                waybackKey
              })
            );
            packet.appendChild(
              this._createThreadLeavesXml({
                msgInfo: msgInfo,
                version: VERSION,
                useUserKey: true,
                useThreadKey: false,
                isOptional: true,
                waybackKey
               })
            );
          } else {
            // forkを取得するには必要っぽい
            packet.appendChild(
              this._createThreadXml({
                msgInfo: msgInfo,
                version: VERSION_OLD,
                threadKey: threadKey,
                force184: force184,
                useDuration: true,
                useThreadKey: false,
                useUserKey: false,
                waybackKey
              })
            );
          }
            packet.appendChild(
            this._createThreadXml({
              msgInfo: msgInfo,
              version: VERSION,
              threadKey: threadKey,
              force184: force184,
              useDuration: false,
              useThreadKey: true,
              useUserKey: false,
              waybackKey
            })
          );
          packet.appendChild(
            this._createThreadLeavesXml({
              msgInfo: msgInfo,
              version: VERSION,
              threadKey: threadKey,
              force184: force184,
              useThreadKey: true,
              useUserKey: false,
              waybackKey
             })
          );
          

          span.appendChild(packet);
          var packetXml = span.innerHTML;

          return packetXml;
        },
        _post: function(server, xml) {
          // マイページのjQueryが古いためかおかしな挙動をするのでPromiseで囲う
          return new Promise((resolve, reject) => {
            ajax({
              url: server,
              data: xml,
              timeout: 60000,
              type: 'POST',
              contentType: 'text/plain',
              dataType: 'xml',
              crossDomain: true,
              cache: false
            }).then((result) => {
              //console.log('post success: ', result);
              resolve(result);
            }, (result) => {
              //console.log('post fail: ', result);
              reject({
                result: result,
                message: 'コメントの通信失敗 server: ' + server
              });
            });
          });
        },
        _get: function(server, threadId, duration, threadKey, force184) {
          // nmsg.nicovideo.jpでググったら出てきた。
          // https://favstar.fm/users/koizuka/status/23032783744012288
          // xmlじゃなくてもいいのかよ!

          var resCount = this.getRequestCountByDuration(duration);

          var url = server +
            'thread?version=' + VERSION +
            '&thread=' + threadId +
            '&scores=1' +
            '&res_from=-' + resCount;
          if (threadKey) {
            url += '&threadkey=' + threadKey;
          }
          if (force184) {
            url += '&force_184=' + force184;
          }

          console.log('%cthread url:', 'background: cyan;', url);
          return new Promise((resolve, reject) => {
            ajax({
              url: url,
              timeout: 60000,
              crossDomain: true,
              cache: false
            }).then(function(result) {
              //console.log('post success: ', result);
              resolve(result);
            }, function(result) {
              //console.log('post fail: ', result);
              reject({
                result: result,
                message: 'コメントの取得失敗' + server
              });
            });
          });
        },
        _load: function(msgInfo) {
          let packet, threadKey, waybackKey, force184;

          const loadThreadKey = () => {
            if (!msgInfo.isNeedKey) { return Promise.resolve(); }
            return this.getThreadKey(msgInfo.threadId, msgInfo.language).then(info => {
              console.log('threadKey: ', info);
              threadKey = info.threadkey;
              force184  = info.force_184;
            });
          };
          const loadWaybackKey = () => {
            if (!msgInfo.when) { return Promise.resolve(); }
            return this.getWaybackKey(msgInfo.threadId, msgInfo.language).then(info => {
              window.console.log('waybackKey: ', info);
              waybackKey = info.waybackkey;
            });
          };

          return loadThreadKey().then(loadWaybackKey).then(() => {
            //console.log('build', msgInfo, threadKey, force184, waybackKey);
            packet = this.buildPacket(msgInfo, threadKey, force184, waybackKey);

            console.log('post xml...', msgInfo.server, packet);
            return this._post(msgInfo.server, packet, msgInfo.threadId);
          });

        },
        load: function(msgInfo) {
          const server           = msgInfo.server;
          const threadId         = msgInfo.threadId;
          const userId           = msgInfo.userId;

          const timeKey = `loadComment server: ${server} thread: ${threadId}`;
          window.console.time(timeKey);

          var resolve, reject;
          const onSuccess = (result) => {
            window.console.timeEnd(timeKey);
            ZenzaWatch.debug.lastMessageServerResult = result;

            var thread, xml, ticket, lastRes = 0;
            var resultCodes = [], resultCode = null;
            try {
              xml = result.documentElement;
              var threads = xml.getElementsByTagName('thread');

              thread = threads[0];
              
              _.each(threads, function(t) {
                var tid = t.getAttribute('thread');
                if (parseInt(tid, 10) === parseInt(threadId, 10)) {
                  thread = t;
                  return false;
                }
              });
              // どのthreadを参照すればいいのか仕様がわからない。
              // しかたないので総当たり
              _.each(threads, function(t) {

                var rc = t.getAttribute('resultcode');
                if (rc.length) {
                  resultCodes.push(parseInt(rc, 10));
                }

                var tid = t.getAttribute('thread');
                //window.console.log(t, t.outerHTML);
                if (parseInt(tid, 10) === parseInt(threadId, 10)) {
                  thread = t;
                  const tk = thread.getAttribute('ticket');
                  if (tk && tk !== '0') { ticket = tk; }
                }
              });

               //const tk = thread.getAttribute('ticket');
              //if (tk && tk !== '0') { ticket = tk; }
              const lr = thread.getAttribute('last_res');
              if (!isNaN(lr)) { lastRes = Math.max(lastRes, lr); }

              //resultCode = thread.getAttribute('resultcode');
              resultCode = (resultCodes.sort())[0];
            } catch (e) {
              console.error(e);
            }

            //if (resultCode !== '0' && (!chats || chats.length < 1)) {
            console.log('resultCodes: ', resultCodes);
            if (resultCode !== 0) {
              reject({
                message: `コメント取得失敗[${resultCodes.join(', ')}]`
              });
              return;
            }

            var threadInfo = {
              server:     server,
              userId:     userId,
              resultCode: resultCode,
              threadId:   threadId,
              thread:     thread.getAttribute('thread'),
              serverTime: thread.getAttribute('server_time'),
              lastRes:    lastRes,
              blockNo:    Math.floor((lastRes * 1 + 1) / 100),
              ticket:     ticket,
              revision:   thread.getAttribute('revision'),
              when:       msgInfo.when,
              isWaybackMode: !!msgInfo.when
            };

            if (this._threadKeys[threadId]) {
              threadInfo.threadKey = this._threadKeys[threadId].threadkey;
              threadInfo.force184  = this._threadKeys[threadId].force_184;
            }

            console.log('threadInfo: ', threadInfo);
            resolve({
              resultCode: resultCode,
              threadInfo: threadInfo,
              xml: xml
            });
          };

          const onFailFinally = (e) => {
            window.console.timeEnd(timeKey);
            window.console.error('loadComment fail: ', e);
            reject({
              message: 'コメントサーバーの通信失敗: ' + server
            });
          };

          const onFail1st = (e) => {
            window.console.timeEnd(timeKey);
            window.console.error('loadComment fail: ', e);
            PopupMessage.alert('コメントの取得失敗: 3秒後にリトライ');

            window.setTimeout(() => {
              this._load(msgInfo).then(onSuccess, onFailFinally);
            }, 3000);
          };


          return new Promise((res, rej) => {
            resolve = res;
            reject  = rej;
            this._load(msgInfo).then(onSuccess, onFail1st);
          });
        },
        _postChat: function(threadInfo, postKey, text, cmd, vpos) {
          const div = document.createElement('div');
          const chat = document.createElement('chat');
          chat.setAttribute('premium', ZenzaWatch.util.isPremium() ? '1' : '0');
          chat.setAttribute('postkey', postKey);
          chat.setAttribute('user_id', threadInfo.userId);
          chat.setAttribute('ticket',  threadInfo.ticket);
          chat.setAttribute('thread',  threadInfo.thread);
          chat.setAttribute('mail',    cmd);
          chat.setAttribute('vpos',    vpos);
          chat.innerHTML = text;
          div.appendChild(chat);
          var xml = div.innerHTML;

          window.console.log('post xml: ', xml);
          return this._post(threadInfo.server, xml).then((result) => {
            var status = null, chat_result, no = 0, blockNo = 0, xml;
            try {
              xml = result.documentElement;
              chat_result = xml.getElementsByTagName('chat_result')[0];
              status = chat_result.getAttribute('status');
              no = parseInt(chat_result.getAttribute('no'), 10);
              blockNo = Math.floor((no + 1) / 100);
            } catch (e) {
              console.error(e);
            }

            if (status !== '0') {
              return Promise.reject({
                status: 'fail',
                no: no,
                blockNo: blockNo,
                code: status,
                message: 'コメント投稿失敗 status: ' + status + ' server: ' + threadInfo.server
              });
            }

            return Promise.resolve({
              status: 'ok',
              no: no,
              blockNo: blockNo,
              code: status,
              message: 'コメント投稿成功'
            });
          });
        },
        postChat: function(threadInfo, text, cmd, vpos, language) {
          return this.getPostKey(threadInfo.threadId, threadInfo.blockNo, language)
            .then((result) => {
            return this._postChat(threadInfo, result.postkey, text, cmd, vpos);
          });
        }
      });

      return MessageApiLoader;
    })();
    ZenzaWatch.api.MessageApiLoader = MessageApiLoader;

    var MylistApiLoader = (function() {
      // マイリスト/とりあえずマイリストの取得APIには
      // www.nicovideo.jp配下とflapi.nicovideo.jp配下の２種類がある
      // 他人のマイリストを取得するにはflapi、マイリストの編集にはwwwのapiが必要
      // データのフォーマットが微妙に異なるのでめんどくさい
      //
      // おかげでソート処理が悲しいことに
      //
      var CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
      var TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
      var token = '';
      var cacheStorage = null;

      function MylistApiLoader() {
        this.initialize.apply(this, arguments);
      }

      ZenzaWatch.emitter.on('csrfTokenUpdate', function(t) {
        token = t;
        if (cacheStorage) {
          cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
        }
      });

      _.assign(MylistApiLoader.prototype, {
        initialize: function() {
          if (!cacheStorage) {
            cacheStorage = new CacheStorage(sessionStorage);
          }
          if (!token) {
            token = cacheStorage.getItem('csrfToken');
            if (token) { console.log('cached token exists', token); }
          }
        },
        setCsrfToken: function(t) {
          token = t;
          if (cacheStorage) {
            cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
          }
        },
        getDeflistItems: function(options) {
          options = options || {};
          var url = '//www.nicovideo.jp/api/deflist/list';
          //var url = 'http://flapi.nicovideo.jp/api/watch/deflistvideo';
          var cacheKey = 'deflistItems';
          var sortItem = this.sortItem;
          options = options || {};

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() {
                if (options.sort) { cacheData = sortItem(cacheData, options.sort, 'www'); }
                resolve(cacheData);
              }, this);
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
                reject({
                  result: result,
                  message: 'とりあえずマイリストの取得失敗(1)'
                });
                return;
              }

              var data = result.list || result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              if (options.sort) { data = sortItem(data, options.sort, 'www'); }
              resolve(data);
            }, function(err) {
              reject({
                result: err,
                message: 'とりあえずマイリストの取得失敗(2)'
              });
            });
          });
        },
        getMylistItems: function(groupId, options) {
          options = options || {};
          if (groupId === 'deflist') { return this.getDeflistItems(options); }
          // flapiじゃないと自分のマイリストしか取れないことが発覚
          var url = '//flapi.nicovideo.jp/api/watch/mylistvideo?id=' + groupId;
          var cacheKey = 'mylistItems: ' + groupId;
          var sortItem = this.sortItem;

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() {
                if (options.sort) { cacheData = sortItem(cacheData, options.sort, 'flapi'); }
                resolve(cacheData);
              }, this);
              return;
            }

            return ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
                return reject({
                  result: result,
                  message: 'マイリストの取得失敗(1)'
                });
              }

              var data = result.list || result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              if (options.sort) { data = sortItem(data, options.sort, 'flapi'); }
              return resolve(data);
            }, function(err) {
              this.reject({
                result: err,
                message: 'マイリストの取得失敗(2)'
              });
            });
          });
        },
        sortItem: function(items, sortId, format) {
          // wwwの時とflapiの時で微妙にフォーマットが違うのでめんどくさい
          // 自分以外のマイリストが開けるのはflapiだけの模様
          // 編集時にはitem_idが必要なのだが、それはwwwのほうにしか入ってない
          // flapiに統一したい
          sortId = parseInt(sortId, 10);

          var sortKey = ([
            'create_time',    'create_time',
            'mylist_comment', 'mylist_comment', // format = wwwの時はdescription
            'title',          'title',
            'first_retrieve', 'first_retrieve',
            'view_counter',   'view_counter',
            'thread_update_time', 'thread_update_time',
            'num_res',        'num_res',
            'mylist_counter', 'mylist_counter',
            'length_seconds', 'length_seconds'
          ])[sortId];

          if (format === 'www' && sortKey === 'mylist_comment') {
            sortKey = 'description';
          }
          if (format === 'www' && sortKey === 'thread_update_time') {
            sortKey = 'update_time';
          }

          var order;
          switch (sortKey) {
            // 偶数がascで奇数がdescかと思ったら特に統一されてなかった
            case 'first_retrieve':
            case 'thread_update_time':
            case 'update_time':
              order = (sortId % 2 === 1) ? 'asc' : 'desc';
              break;
            // 数値系は偶数がdesc
            case 'num_res':
            case 'mylist_counter':
            case 'view_counter':
            case 'length_seconds':
              order = (sortId % 2 === 1) ? 'asc' : 'desc';
              break;
            default:
              order = (sortId % 2 === 0) ? 'asc' : 'desc';
          }

          //window.console.log('sortKey?', sortId, sortKey, order);
          if (!sortKey) { return items; }

          var getKeyFunc = (function(sortKey, format) {
            switch (sortKey) {
              case 'create_time':
              case 'description':
              case 'mylist_comment':
              case 'update_time':
                return function(item) { return item[sortKey]; };
              case 'num_res':
              case 'mylist_counter':
              case 'view_counter':
              case 'length_seconds':
                if (format === 'flapi') {
                  return function(item) { return item[sortKey] * 1; };
                } else {
                  return function(item) { return item.item_data[sortKey] * 1; };
                }
                break;
              default:
                if (format === 'flapi') {
                  return function(item) { return item[sortKey]; };
                } else {
                  return function(item) { return item.item_data[sortKey]; };
                }
            }
          })(sortKey, format);

          var compareFunc = (function(order, getKey) {
            switch (order) {
              // sortKeyが同一だった場合は動画IDでソートする
              // 銀魂など、一部公式チャンネル動画向けの対応
              case 'asc':
                return function(a, b) {
                  var ak = getKey(a), bk = getKey(b);
                  if (ak !== bk) { return ak > bk ? 1 : -1; }
                  //else { return a.item_data.watch_id > b.item_data.watch_id ? 1 : -1; }
                  else { return a.id > b.id ? 1 : -1; }
                };
              case 'desc':
                return function(a, b) {
                  var ak = getKey(a), bk = getKey(b);
                  if (ak !== bk) { return (ak < bk) ? 1 : -1; }
                  else { return a.id < b.id ? 1 : -1; }
                };
            }
          })(order, getKeyFunc);

          //window.console.log('before sort', items[0], items, order, sortKey, compareFunc);
          items.sort(compareFunc);
          //window.console.log('after sort', items[0], items);
          return items;
        },
        getMylistList: function() {
          var url = '//www.nicovideo.jp/api/mylistgroup/list';
          var cacheKey = 'mylistList';

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); });
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
              }).then(function(result) {
                if (result.status !== 'ok' || !result.mylistgroup) {
                  return reject({
                    result: result,
                    message: 'マイリスト一覧の取得失敗(1)'
                  });
                }

                var data = result.mylistgroup;
                cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
                return resolve(data);
              }, function(err) {
                return reject({
                  result: err,
                  message: 'マイリスト一覧の取得失敗(2)'
                });
              });
          });
        },
        findDeflistItemByWatchId: function(watchId) {
          return this.getDeflistItems().then(function(items) {
            for (var i = 0, len = items.length; i < len; i++) {
              var item = items[i], wid = item.id || item.item_data.watch_id;
              if (wid === watchId) {
                return Promise.resolve(item);
              }
            }
            return Promise.reject();
          });
        },
        findMylistItemByWatchId: function(watchId, groupId) {
          return this._getMylistItemsFromWapi(groupId).then(function(items) {
            for (var i = 0, len = items.length; i < len; i++) {
              var item = items[i], wid = item.id || item.item_data.watch_id;
              if (wid === watchId) {
                return Promise.resolve(item);
              }
            }
            return Promise.reject();
          });
        },
        _getMylistItemsFromWapi: function(groupId) {
          // めんどくさいが、マイリスト取得APIは2種類ある
          // こっちは自分のマイリストだけを取る奴。 編集にはこっちが必要。
          var url = '//www.nicovideo.jp/api/mylist/list?group_id=' + groupId;
          return ajax({
            url: url,
            timeout: 60000,
            cache: false,
            dataType: 'json',
            xhrFields: { withCredentials: true }
          }).then(function(result) {
            if (result.status === 'ok' && result.mylistitem) {
              return Promise.resolve(result.mylistitem);
            }
            return Promise.reject();
          });
        },
        removeDeflistItem: function(watchId) {
          return this.findDeflistItemByWatchId(watchId).then(function(item) {
            var url = '//www.nicovideo.jp/api/deflist/delete';
            var data = 'id_list[0][]=' + item.item_id + '&token=' + token;
            var cacheKey = 'deflistItems';
            var req = {
              url: url,
              method: 'POST',
              data: data,
              dataType: 'json',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

            return ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                ZenzaWatch.emitter.emitAsync('deflistRemove', watchId);
                return Promise.resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリストから削除'
                });
              }

              return Promise.reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });

            }, function(err) {
              return Promise.reject({
                result: err,
                message: 'とりあえずマイリストから削除失敗(2)'
              });
            });

          }, function(err) {
            return Promise.reject({
              status: 'fail',
              result: err,
              message: '動画が見つかりません'
            });
          });
        },
        removeMylistItem: function(watchId, groupId) {
          return this.findMylistItemByWatchId(watchId, groupId).then(function(item) {
            var url = '//www.nicovideo.jp/api/mylist/delete';
            window.console.log('delete item:', item);
            var data = 'id_list[0][]=' + item.item_id + '&token=' + token + '&group_id=' + groupId;
            var cacheKey = 'mylistItems: ' + groupId;
            var req = {
              url: url,
              method: 'POST',
              data: data,
              dataType: 'json',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

            return ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                ZenzaWatch.emitter.emitAsync('mylistRemove', watchId, groupId);
                return Promise.resolve({
                  status: 'ok',
                  result: result,
                  message: 'マイリストから削除'
                });
              }

              return Promise.reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });

            }, function(err) {
              return Promise.reject({
                result: err,
                message: 'マイリストから削除失敗(2)'
              });
            });

          }, function(err) {
            window.console.error(err);
            return Promise.reject({
              status: 'fail',
              result: err,
              message: '動画が見つかりません'
            });
          });
         },
        _addDeflistItem: function(watchId, description, isRetry) {
          var url = '//www.nicovideo.jp/api/deflist/add';
          var data = 'item_id=' + watchId + '&token=' + token;
          if (description) {
            data += '&description='+ encodeURIComponent(description);
          }
          var cacheKey = 'deflistItems';

          var req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            timeout: 60000,
            xhrFields: { withCredentials: true },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          };

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                ZenzaWatch.emitter.emitAsync('deflistAdd', watchId, description);
                return resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリスト登録'
                });
              }

              if (!result.status || !result.error) {
                return reject({
                  status: 'fail',
                  result: result,
                  message: 'とりあえずマイリスト登録失敗(100)'
                });
              }

              if (result.error.code !== 'EXIST' || isRetry) {
                return reject({
                  status: 'fail',
                  result: result,
                  code: result.error.code,
                  message: result.error.description
                });
              }

              /**
               すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
               例えば、とりマイの300番目に登録済みだった場合に「登録済みです」と言われても探すのがダルいし、
               他の動画を追加していけば、そのうち押し出されて消えてしまう。
               なので、重複時にエラーを出すのではなく、「消してから追加」することによって先頭に持ってくる。
              */
              return self.removeDeflistItem(watchId).then(function() {
                return self._addDeflistItem(watchId, description, true).then(function(result) {
                  resolve({
                    status: 'ok',
                    result: result,
                    message: 'とりあえずマイリストの先頭に移動'
                  });
                });
              }, function(err) {
                reject({
                  status: 'fail',
                  result: err.result,
                  code:   err.code,
                  message: 'とりあえずマイリスト登録失敗(101)'
                });
              });

            }, function(err) {
              reject({
                status: 'fail',
                result: err,
                message: 'とりあえずマイリスト登録失敗(200)'
              });
            });
          });
        },
        addDeflistItem: function(watchId, description) {
          return this._addDeflistItem(watchId, description, false);
        },
        addMylistItem: function(watchId, groupId, description) {
          var url = '//www.nicovideo.jp/api/mylist/add';
          var data = 'item_id=' + watchId + '&token=' + token + '&group_id=' + groupId;
          if (description) {
            data += '&description='+ encodeURIComponent(description);
          }
          var cacheKey = 'mylistItems: ' + groupId;

          var req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            timeout: 60000,
            xhrFields: { withCredentials: true },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          };

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                // マイリストに登録したらとりあえずマイリストから除去(=移動)
                self.removeDeflistItem(watchId).then(_.noop, _.noop);
                return resolve({
                  status: 'ok',
                  result: result,
                  message: 'マイリスト登録'
                });
              }

              if (!result.status || !result.error) {
                return reject({
                  status: 'fail',
                  result: result,
                  message: 'マイリスト登録失敗(100)'
                });
              }

              // マイリストの場合は重複があっても「追加して削除」しない。
              // とりまいと違って押し出されることがないし、
              // シリーズ物が勝手に入れ替わっても困るため

              ZenzaWatch.emitter.emitAsync('mylistAdd', watchId, groupId, description);
              return reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });
            }, function(err) {
              reject({
                status: 'fail',
                result: err,
                message: 'マイリスト登録失敗(200)'
              });
            });
          });
        }
      });

      return MylistApiLoader;
    })();
    ZenzaWatch.api.MylistApiLoader = MylistApiLoader;
    ZenzaWatch.init.mylistApiLoader = new MylistApiLoader();
//    window.mmm = ZenzaWatch.init.mylistApiLoader;
//
    var UploadedVideoApiLoader = (function() {
      var CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
      var cacheStorage = null;

      function UploadedVideoApiLoader() {
        this.initialize.apply(this, arguments);
      }
      _.assign(UploadedVideoApiLoader.prototype, {
        initialize: function() {
          if (!cacheStorage) {
            cacheStorage = new CacheStorage(sessionStorage);
          }
        },
        getUploadedVideos: function(userId, options) {
          var url = '//flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=' + userId;
          var cacheKey = 'uploadedvideo: ' + userId;

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() {
                resolve(cacheData);
              }, this);
              return;
            }

            return ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || !result.list) {
                return reject({
                  result: result,
                  message: result.message
                });
              }

              var data = result.list;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              return resolve(data);
            }, function(err) {
              this.reject({
                result: err,
                message: '動画一覧の取得失敗(2)'
              });
            });
          });
        },
      });
      return UploadedVideoApiLoader;
    })();
    ZenzaWatch.api.UploadedVideoApiLoader = UploadedVideoApiLoader;
    ZenzaWatch.init.UploadedVideoApiLoader = new UploadedVideoApiLoader();
//    window.uuu = ZenzaWatch.init.mylistApiLoader;


    var CrossDomainGate = function() { this.initialize.apply(this, arguments); };
    _.extend(CrossDomainGate.prototype, AsyncEmitter.prototype);
    _.assign(CrossDomainGate.prototype, {
      initialize: function(params) {
        this._baseUrl  = params.baseUrl;
        this._origin   = params.origin || location.href;
        this._type     = params.type;
        this._messager = params.messager || WindowMessageEmitter;

        this._loaderFrame = null;
        this._sessions = {};
        this._initializeStatus = '';
      },
      _initializeFrame: function() {
        var self = this;
        switch (this._initializeStatus) {
          case 'done':
            return new Promise(function(resolve) {
              util.callAsync(function() {
                resolve();
              });
            });
          case 'initializing':
            return new Promise(function(resolve, reject) {
              self.on('initialize', function(e) {
                if (e.status === 'ok') { resolve(); } else { reject(e); }
              });
            });
          case '':
            this._initializeStatus = 'initializing';
            var initialPromise = new Promise(function(resolve, reject) {
              self._sessions.initial = {
                promise: initialPromise,
                resolve: resolve,
                reject: reject
              };
              window.setTimeout(function() {
                if (self._initializeStatus !== 'done') {
                  var rej = {
                    status: 'fail',
                    message: 'CrossDomainGate初期化タイムアウト (' + self._type + ')'
                  };
                  reject(rej);
                  self.emit('initialize', rej);
                }
              }, 60 * 1000);
              self._initializeCrossDomainGate();

            });
          return initialPromise;
        }
      },
      _initializeCrossDomainGate: function() {
        this._initializeCrossDomainGate = _.noop;
        this._messager.on('onMessage', _.bind(this._onMessage, this));

        console.log('%c initialize ' + this._type, 'background: lightgreen;');

        var loaderFrame = document.createElement('iframe');
        loaderFrame.name = this._type + 'Loader';
        //loaderFrame.src  = this._baseUrl;
        loaderFrame.className = 'xDomainLoaderFrame ' + this._type;
        document.body.appendChild(loaderFrame);

        this._loaderFrame = loaderFrame;
        this._loaderWindow = loaderFrame.contentWindow;
        this._messager.addKnownSource(this._loaderWindow);
        this._loaderWindow.location.replace(this._baseUrl + '#' + TOKEN);
      },
      _onMessage: function(data, type) {
        if (type !== this._type) {
          //window.console.info('invalid type', type, this._type, data);
          return;
        }
        var info      = data.message;
        var token     = info.token;
        var sessionId = info.sessionId;
        var status    = info.status;
        var command   = info.command || 'loadUrl';
        var session   = this._sessions[sessionId];

        if (status === 'initialized') {
          //window.console.log(type + ' initialized');
          this._initializeStatus = 'done';
          this._sessions.initial.resolve();
          this.emitAsync('initialize', {status: 'ok'});
          this._postMessage({command: 'ok'});
          return;
        }

        if (token !== TOKEN) {
          window.console.log('invalid token:', token, TOKEN);
          return;
        }

        switch (command) {
          case 'dumpConfig':
            this._onDumpConfig(info.body);
            break;

          default:
            if (!session) { return; }
            if (status === 'ok') { session.resolve(info.body); }
            else { session.reject({ message: status }); }
            session = null;
            delete this._sessions[sessionId];
            break;
        }
      },
      load: function(url, options) {
        return this._postMessage({
          command: 'loadUrl',
          url: url,
          options: options
        }, true);
      },
      ajax: function(options) {
        var url = options.url;
        return this.load(url, options).then(function(result) {
          //window.console.log('xDomain ajax result', result);
          ZenzaWatch.debug.lastCrossDomainAjaxResult = result;
          try {
            var dataType = (options.dataType || '').toLowerCase();
            switch (dataType) {
              case 'json':
                var json = JSON.parse(result);
                return Promise.resolve(json);
              case 'xml':
                var parser = new DOMParser();
                var xml = parser.parseFromString(result, 'text/xml');
                return Promise.resolve(xml);
            }
            return Promise.resolve(result);
          } catch (e) {
            return Promise.reject({
              status: 'fail',
              message: 'パース失敗',
              error: e
            });
          }
        });
      },
      videoCapture: function(src, sec) {
        return this._postMessage({
          command: 'videoCapture',
          src,
          sec
        }, true);
      },
      _fetch: function(url, options) {
        return this._postMessage({
          command: 'fetch',
          url: url,
          options: options
        }, true);
      },
      fetch: function(url, options) {
        return this._fetch(url, options).then((text) => {
          ZenzaWatch.debug.lastCrossDomainFetchResult = text;
          return Promise.resolve({
            text: () => {
              return new Promise(res => { return res(text); });
            },
            json: () => {
              return new Promise(res => { return res(JSON.parse(text)); });
            },
            xml: () => {
              return new Promise(res => {
                const parser = new DOMParser();
                return res(parser.parseFromString(text, 'text/xml'));
              });
            }
          });
        });
      },
      configBridge: function(config) {
        var self = this;
        var keys = config.getKeys();
        self._config = config;

        return new Promise(function(resolve, reject) {
          self._configBridgeResolve = resolve;
          self._configBridgeReject  = reject;
          self._postMessage({
            url: '',
            command: 'dumpConfig',
            keys: keys
          });
        });
      },
      _postMessage: function(message, needPromise) {
        return new Promise((resolve, reject) => {
          message.sessionId = this._type + '_' + Math.random();
          message.token = TOKEN;
          if (needPromise) {
            this._sessions[message.sessionId] = {
              resolve: resolve,
              reject: reject
            };
          }

          return this._initializeFrame().then(() => {
            try {
              this._loaderWindow.postMessage(
                JSON.stringify(message),
                this._origin
              );
            } catch (e) {
              console.log('%cException!', 'background: red;', e);
            }
          });
        });
      },
      _onDumpConfig: function(configData) {
        //window.console.log('_onDumpConfig', configData);
        _.each(Object.keys(configData), (key) => {
          //window.console.log('config %s: %s', key, configData[key]);
          this._config.setValue(key, configData[key]);
        });

        if (!location.host.match(/^[a-z0-9]*.nicovideo.jp$/) &&
            !this._config.getValue('allowOtherDomain')) {
          window.console.log('allowOtherDomain', this._config.getValue('allowOtherDomain'));
          this._configBridgeReject();
          return;
        }
        this._config.on('update', (key, value) => {
          if (key === 'autoCloseFullScreen') { return; }

          this._postMessage({
            command: 'saveConfig',
            key: key,
            value: value
          });
        });
        this._configBridgeResolve();
      },
      pushHistory: function(path, title) {
        const sessionId = this._type +'_' + Math.random();
        this._initializeFrame().then(() => {
          try {
            this._loaderWindow.postMessage(JSON.stringify({
              sessionId: sessionId,
              command: 'pushHistory',
              path: path,
              title: title || ''
            }),
            this._origin);
          } catch (e) {
            console.log('%cException!', 'background: red;', e);
          }
        });
      },
    });

    if (location.host !== 'www.nicovideo.jp') {
      NicoVideoApi = new CrossDomainGate({
        baseUrl: location.protocol + '//www.nicovideo.jp/favicon.ico',
        origin: location.protocol + '//www.nicovideo.jp/',
        type: 'nicovideoApi',
        messager: WindowMessageEmitter
      });
    }


    const IchibaLoader = (() => {

      let callbackId = 0;

      const load = (watchId) => {
        return new Promise((resolve, reject) => {
          const country = 'ja-jp';
          const api = 'https://ichiba.nicovideo.jp/embed/zero/show_ichiba';
          const sc = document.createElement('script');

          let timeoutTimer = null;

          const funcName = (() => {
            const funcName = `zenza_callback_${callbackId++}`;

            window[funcName] = (ichibaData) => {
              //window.console.info(ichibaData);
              window.clearTimeout(timeoutTimer);
              timeoutTimer = null;
              sc.remove();
              delete window[funcName];

              resolve(ichibaData);
            };

            return funcName;
          })();

          timeoutTimer = window.setTimeout(() => {
            sc.remove();
            delete window[funcName];
            if (timeoutTimer) { reject(new Error('ichiba timeout')); }
          }, 30000);

          const url = `${api}?v=${watchId}&country=${country}&ch=&is_adult=1&rev=20120220&callback=${funcName}`;
          sc.src = url;
          document.body.appendChild(sc);
        });
      };

      return {
        load
      };
    })();


    const PlaybackPosition = (function() {
      const record = (watchId, playbackPosition, csrfToken) => {
        const url = 'https://flapi.nicovideo.jp/api/record_current_playback_position';
        const body =
          `watch_id=${watchId}&playback_position=${playbackPosition}&csrf_token=${csrfToken}`;
        return util.fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body
        });
      };

      return {
        record
      };
    })();

    // typoじゃなくて変なブロッカーと干渉しないために名前を変えている
    const UaaLoader = (() => {

      const load = (videoId, {limit = 50} = {}) => {
        const url = `https://api.nicoad.nicovideo.jp/v1/contents/video/${videoId}/thanks?limit=${limit}`;
        return util
          .fetch(url, {credentials: 'include'})
          .then(res => { return res.json(); });
      };

      return {
        load
      };
    })();



//
  class DmcInfo {
    constructor(rawData) {
      this._rawData = rawData;
      this._session = rawData.session_api;
    }

    get apiUrl() {
      return this._session.urls[0].url;
    }

    get audios() {
      return this._session.audios;
    }

    get videos() {
      return this._session.videos;
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
      return this._session.protocols;
    }

    get contentKeyTimeout() {
      return this._session.content_key_timeout;
    }

    get priority() {
      return this._session.priority;
    }

    get authTypes() {
      return this._session.authTypes;
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
 }

  class VideoFilter {
    constructor(ngOwner, ngTag) {
      this.ngOwner = ngOwner;
      this.ngTag   = ngTag;
    }

    get ngOwner() {
      return this._ngOwner || [];
    }

    set ngOwner(owner) {
      owner = _.isArray(owner) ? owner : owner.toString().split(/[\r\n]/);
      var list = [];
      _.each(owner, function(o) {
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
      if (isNg) { return true; }

      let owner = videoInfo.ownerInfo;
      let ownerId = isChannel ? ('ch' + owner.id) : owner.id;
      if (ownerId && this.ngOwner.includes(ownerId)) {
        isNg = true;
      }

      return isNg;
    }
  }

  class VideoInfoModel {
    constructor(info) {
      this._rawData = info;
      this._watchApiData = info.watchApiData;
      this._videoDetail  = info.watchApiData.videoDetail;
      this._flashvars    = info.watchApiData.flashvars;   // flashに渡す情報
      this._viewerInfo   = info.viewerInfo;               // 閲覧者(＝おまいら)の情報
      this._flvInfo      = info.flvInfo;
      this._msgInfo      = info.msgInfo;
      this._dmcInfo      = (info.dmcInfo && info.dmcInfo.session_api) ? new DmcInfo(info.dmcInfo) : null;
      this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画
      this._playlistToken = info.playlistToken;
      this._watchAuthKey = info.watchAuthKey;
      this._seekToken    = info.seekToken;
      this._resumeInfo   = info.resumeInfo || {};

      this._isDmcDisable = false;
      this._currentVideoPromise = [];

      if (!ZenzaWatch.debug.videoInfo) { ZenzaWatch.debug.videoInfo = {}; }
      ZenzaWatch.debug.videoInfo[this.getWatchId()] = this;
    }

  get title() {
    return this._videoDetail.title_original || this._videoDetail.title;
  }

  get description() {
    return this._videoDetail.description || '';
  }

  /**
   * マイリスト等がリンクになっていない物
   */
  get descriptionOriginal() {
    return this._videoDetail.description_original;
  }

  get postedAt() {
    return this._videoDetail.postedAt;
  }

  get thumbnail() {
    return this._videoDetail.thumbnail;
  }

  /**
   * 大きいサムネがあればそっちを返す
   */
  get betterThumbnail() {
    return this._rawData.thumbnail;
  }

  get videoUrl() {
    return this._flvInfo.url;
  }

  get storyboardUrl() {
    let url = this._flvInfo.url;
    if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
      return null;
    }
    return url;
  }

  /**
   * @return Promise
   */
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

  getWatchId() { // sm12345だったりスレッドIDだったり
    return this.watchId;
  }

  get watchId() {
    if (this.videoId.substring(0, 2) === 'so') {
      return this.videoId;
    }
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
      width:  this._videoDetail.width,
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
    return this.isDmcOnly || (this._rawData.isDmc && !this._isDmcDisable);
  }

  get dmcInfo() {
    return this._dmcInfo;
  }

  get msgInfo() {
    return this._msgInfo;
  }

  get isDmcDisable() {
    return this.isDmcOnly && this._isDmcDisable;
  }

  set isDmcDisable(v) {
    this._isDmcDisable = v;
  }

  get isDmcOnly() {
    return !!this._rawData.isDmcOnly;
  }

  get hasDmcStoryboard() {
    return this._dmcInfo && this._dmcInfo.hasStoryboard;
  }

  get dmcStoryboardInfo() {
    return !!this._dmcInfo ? this._dmcInfo.storyboardInfo : null;
  }

  /**
   * 投稿者の情報
   * チャンネル動画かどうかで分岐
  */
  get ownerInfo() {
    var ownerInfo;
    if (this.isChannel) {
      var c = this._watchApiData.channelInfo || {};
      ownerInfo = {
        icon: c.icon_url || '//res.nimg.jp/img/user/thumb/blank.jpg',
        url: 'https://ch.nicovideo.jp/ch' + c.id,
        id: c.id,
        name: c.name,
        favorite: c.is_favorited === 1, // こっちは01で
        type: 'channel'
      };
    } else {
      // 退会しているユーザーだと空になっている
      var u = this._watchApiData.uploaderInfo || {};
      var f = this._flashvars || {};
      ownerInfo = {
        icon: u.icon_url || '//res.nimg.jp/img/user/thumb/blank.jpg',
        url:  u.id ? ('//www.nicovideo.jp/user/' + u.id) : '#',
        id:   u.id || f.videoUserId || '',
        name: u.nickname || '(非公開ユーザー)',
        favorite: !!u.is_favorited, // こっちはbooleanという
        type: 'user',
        isMyVideoPublic: !!u.is_user_myvideo_public
      };
    }

    return ownerInfo;
  }

  get relatedVideoItems() {
    return this._relatedVideo.playlist || [];
  }

  get replacementWords() {
    if (!this._flvInfo.ng_up) { return null; }
    return ZenzaWatch.util.parseQuery(
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
    if (!this._resumeInfo || !this._resumeInfo.initialPlaybackPosition) { return 0; }
    return parseFloat(this._resumeInfo.initialPlaybackPosition, 10);
  }

  get csrfToken() {
    return this._rawData.csrfToken || '';
  }

  get extension() {
    if (this.isDmc) { return 'mp4'; }
    const url = this.videoUrl;
    if (url.match(/smile\?m=/)) { return 'mp4'; }
    if (url.match(/smile\?v=/)) { return 'flv'; }
    if (url.match(/smile\?s=/)) { return 'swf'; }
    return 'unknown';
  }
  }




  const {NicoSearchApiV2Query, NicoSearchApiV2Loader} =
    (function() {
      // 参考: https://site.nicovideo.jp/search-api-docs/search.html
      // https://ch.nicovideo.jp/nico-lab/blomaga/ar930955
      const BASE_URL       = `${location.protocol}//api.search.nicovideo.jp/api/v2/`;
      const API_BASE_URL   = `${BASE_URL}/video/contents/search`;
      const MESSAGE_ORIGIN = `${location.protocol}//api.search.nicovideo.jp/`;
      const SORT = {
        f: 'startTime',
        v: 'viewCounter',
        r: 'commentCounter',
        m: 'mylistCounter',
        l: 'lengthSeconds',
        n: 'lastCommentTime',
        // v1からの推測で見つけたけどドキュメントにはのってないやつ
        h: '_hotMylistCounter',           // 人気が高い順
        '_hot':   '_hotMylistCounter',    // 人気が高い順(↑と同じだけど互換用に残ってる)
        '_popular': '_popular',            // 並び順指定なしらしい
      };

      // 公式検索の日時指定パラメータ -1h -24h -1w -1m
      const F_RANGE = {
        U_1H:   4,
        U_24H:  1,
        U_1W:   2,
        U_30D: 3
      };

      // 公式検索の動画長指定パラメータ -5min 20min-
      const L_RANGE = {
        U_5MIN: 1,
        O_20MIN: 2
      };


      let gate;

      // なぜかv2はCORSがついてないのでCrossDomainGateの力を借りる
      let initializeCrossDomainGate = function() {
        initializeCrossDomainGate = function() {};
        gate = new CrossDomainGate({
          baseUrl: BASE_URL,
          origin: MESSAGE_ORIGIN,
          type: 'searchApi',
          messager: WindowMessageEmitter
        });
      };

      /**
       * 公式検索ページのqueryパラメータをv2用に変換するやつ＋α
       */
      class NicoSearchApiV2Query {

        constructor(word, params = {}) {
          if (word.searchWord) {
            this._initialize(word.searchWord, word);
          } else {
            this._initialize(word, params);
          }
        }

        get q()       { return this._q; }
        get targets() { return this._targets; }
        get sort()    { return this._sort; }
        get order()   { return this._order; }
        get limit()   { return this._limit; }
        get offset()  { return this._offset; }
        get fields()  { return this._fields; }
        get context() { return this._context; }

        get hotField() { return this._hotField; }
        get hotFrom() { return this._hotFrom; }
        get hotTo() { return this._hotTo; }

        _initialize(word, params) {
          if (params._now) { this.now = params._now; }
          const sortTable = SORT;
          this._filters = [];
          this._q       = word || params.searchWord || 'ZenzaWatch';
          this._targets =
            params.searchType === 'tag' ?
              ['tagsExact'] : ['tagsExact', 'title', 'description'];
          this._sort  =
            (params.order === 'd' ? '-' : '+') +
            (params.sort && sortTable[params.sort] ?
              sortTable[params.sort] : 'lastCommentTime');
          this._order   = params.order === 'd' ? 'desc' : 'asc';
          this._limit   = 100;
          this._offset  = Math.min(
            params.page ? Math.max(parseInt(params.page, 10) - 1, 0) * 25 : 0,
            1600
          );
          this._fields = [
            'contentId', 'title', 'description', 'tags', 'categoryTags',
            'viewCounter', 'commentCounter', 'mylistCounter', 'lengthSeconds',
            'startTime', 'thumbnailUrl',
            // 公式ドキュメントからは消えてるけど指定できた
            'lengthSeconds', 'lastResBody'
          ];
          this._context = 'ZenzaWatch';

          const n = new Date(), now = this.now;
          if (/^._hot/.test(this.sort)) {
            // 人気が高い順ソート
            (() => {
              this._hotField = 'mylistCounter';
              this._hotFrom = new Date(now - 1 * 24 * 60 * 60 * 1000);
              this._hotTo   = n;

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
            this._filters.push({type: 'equal', field: 'userId',    value: params.userId * 1});
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
              to:   params.utimeTo   ? params.utimeTo   * 1 : now
            }));
          }
          if (params.dateFrom || params.dateTo) {
            this._filters.push(this._buildStartTimeRangeFilter({
              from: params.dateFrom ? (new Date(params.dateFrom)).getTime() : 0,
              to:   params.dateTo   ? (new Date(params.dateTo  )).getTime() : now
            }));
          }
          // 公式検索ページの日付指定
          const dateReg = /^\d{4}-\d{2}-\d{2}$/;
          if (dateReg.test(params.start) && dateReg.test(params.end)) {
            this._filters.push(this._buildStartTimeRangeFilter({
              from: (new Date(params.start)).getTime(),
              to:   (new Date(params.end  )).getTime()
            }));
          }
        }

        get stringfiedFilters() {
          if (this._filters.length < 1) { return ''; }
          const result = [];
          const TIMEFIELDS = ['startTime'];
          this._filters.forEach((filter) => {
            let isTimeField = TIMEFIELDS.includes(filter.field);
            if (!filter) { return; }

            if (filter.type === 'equal') {
              result.push(`filters[${filter.field}][0]=${filter.value}`);
            } else if (filter.type === 'range') {
              let from = isTimeField ?  this._formatDate(filter.from) : filter.from;
              if (filter.from) {
                result.push(`filters[${filter.field}][gte]=${from}`);
              }
              if (filter.to) {
                let to = isTimeField ?  this._formatDate(filter.to) : filter.to;
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
          if (from !== undefined) { range.from = from; }
          if (to   !== undefined) { range.to = to; }
          return range;
        }

        _buildLengthSecondsRangeFilter({from, to}) {
          const range = {field: 'lengthSeconds', type: 'range'};
          if (from !== undefined && to !== undefined) {
            [from, to] = [from, to].sort(); // from < to になるように
          }
          if (from !== undefined) { range.from = from; }
          if (to   !== undefined) { range.to = to; }
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
          switch(range) {
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
          result.push('fields='  + this.fields.join(','));

          result.push('_sort='    + encodeURIComponent(this.sort));
          result.push('_limit='   + this.limit);
          result.push('_offset='  + this.offset);
          result.push('_context=' + this.context);

          if (this.sort === '-_hot') {
            result.push('hotField=' + this.hotField);
            result.push('hotFrom='  + this.hotFrom);
            result.push('hotTo='    + this.hotTo);
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

      NicoSearchApiV2Query.SORT    = SORT;
      NicoSearchApiV2Query.F_RANGE = F_RANGE;
      NicoSearchApiV2Query.L_RANGE = L_RANGE;


      class NicoSearchApiV2Loader {
        static search(word, params) {
          initializeCrossDomainGate();
          const query = new NicoSearchApiV2Query(word, params);
          const url = API_BASE_URL + '?' + query.toString();

          return gate.fetch(url).then((result) => {
            return result.text();
          }).then((result) => {
            result = NicoSearchApiV2Loader.parseResult(result);
            if (typeof result !== 'number' && result.status === 'ok') {
              return Promise.resolve(result);
            } else {
              let description;
              switch (result) {
                default:  description = 'UNKNOWN ERROR'; break;
                case 400: description = 'INVALID QUERY'; break;
                case 500: description = 'INTERNAL SERVER ERROR';   break;
                case 503: description = 'MAINTENANCE';   break;
              }
              return Promise.reject({
                status: 'fail',
                description
              });
            }
          });
        }

        /**
         * 100件以上検索する用
         */
        static searchMore(word, params, maxLimit = 300) {

          const ONCE_LIMIT = 100; // 一回で取れる件数
          const PER_PAGE = 25; // 検索ページで1ページあたりに表示される件数
          const MAX_PAGE = 64; // 25 * 64 = 1600

          // 短い間隔で叩くと弾かれるらしい？のでスリープを入れる
          const createSleep = function(ms) {
            return () => {
              return new Promise(res => {
                console.log('search sleep: %sms', ms);
                window.setTimeout(() => { return res(); }, ms);
              });
            };
          };

          const createSearchNext = function(word, params, page) {
            return () => {
              console.log('searchNext: "%s"', word, page, params);
              return NicoSearchApiV2Loader.search(word, Object.assign(params, {page}));
            };
          };

          return NicoSearchApiV2Loader.search(word, params).then(result => {

            const currentPage = params.page ? parseInt(params.page, 10) : 1;
            const currentOffset = (currentPage - 1) * PER_PAGE;

            if (result.count <= ONCE_LIMIT) {
              return result;
            }

            const searchCount = Math.min(
              Math.ceil((result.count - currentOffset) / PER_PAGE) - 1,
              Math.ceil((maxLimit - ONCE_LIMIT) / ONCE_LIMIT)
            );

            const promises = [];

            for (let i = 1; i <= searchCount; i++) {
              promises.push(createSleep(Math.min(300 * i, 2000)));

              let nextPage = currentPage + i * (ONCE_LIMIT / PER_PAGE);
              promises.push(createSearchNext(word, params, nextPage));
              if (nextPage >= MAX_PAGE) { break; }
            }

            // TODO: 途中で失敗したらそこまででもいいので返す？
            return promises.reduce((prev, current) => {
              return prev.then(current).then(res => {
                if (res && res.list && res.list.length) {
                  result.list = result.list.concat(res.list);
                }
                return result;
              });
            }, Promise.resolve());

          });
        }

        static _jsonParse(result) {
          try {
            return JSON.parse(result);
          } catch(e) {
            window.console.error('JSON parse error', e);
            return null;
          }
        }

        static parseResult(jsonText) {
          const data = NicoSearchApiV2Loader._jsonParse(jsonText);
          if (!data) { return 0; }
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
            } else
            if (item.thumbnailUrl.indexOf('.M') < 0 &&
                item.contentId.indexOf('sm') === 0) {
              let _id = parseInt(item.contentId.substring(2), 10);
              if (_id >= midThumbnailThreshold) {
                item.is_middle_thumbnail = true;
              }
            }
            const dt = util.dateToString(new Date(item.startTime));

            result.list.push({
              id:                item.contentId,
              type:              0, // 0 = VIDEO,
              length:            item.lengthSeconds ?
                                 Math.floor(item.lengthSeconds / 60) + ':' +
                                 (item.lengthSeconds % 60 + 100).toString().substring(1) : '',
              mylist_counter:    item.mylistCounter,
              view_counter:      item.viewCounter,
              num_res:           item.commentCounter,
              first_retrieve:    dt,
              create_time:       dt,
              thumbnail_url:     item.thumbnailUrl,
              title:             item.title,
              description_short: description.substring(0, 150),
              description_full:  description,
              length_seconds:    item.lengthSeconds,
              //last_res_body:     item.lastResBody,
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
    return this._fetch(url, { credentials: 'include' });
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

    const options =  {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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



    const SmileStoryboardInfoLoader = (function() {
      var reject = function(err) {
        return new Promise(function(res, rej) {
          window.setTimeout(function() { rej(err); }, 0);
        });
      };

      var parseStoryboard = function($storyboard, url) {
        var storyboardId = $storyboard.attr('id') || '1';
        return {
          id:       storyboardId,
          url:      url.replace('sb=1', 'sb=' + storyboardId),
          thumbnail:{
            width:    $storyboard.find('thumbnail_width').text(),
            height:   $storyboard.find('thumbnail_height').text(),
            number:   $storyboard.find('thumbnail_number').text(),
            interval: $storyboard.find('thumbnail_interval').text()
          },
          board: {
            rows:   $storyboard.find('board_rows').text(),
            cols:   $storyboard.find('board_cols').text(),
            number: $storyboard.find('board_number').text()
          }
        };
      };

      var parseXml = function(xml, url) {
        var $xml = $(xml), $storyboard = $xml.find('storyboard');

        if ($storyboard.length < 1) {
          return null;
        }

        var info = {
          format: 'smile',
          status:   'ok',
          message:  '成功',
          url:      url,
          movieId:  $xml.find('movie').attr('id'),
          duration: $xml.find('duration').text(),
          storyboard: []
        };

        for (var i = 0, len = $storyboard.length; i < len; i++) {
          var sbInfo = parseStoryboard($($storyboard[i]), url);
          info.storyboard.push(sbInfo);
        }
        info.storyboard.sort(function(a, b) {
          var idA = parseInt(a.id.substr(1), 10), idB = parseInt(b.id.substr(1), 10);
          return (idA < idB) ? 1 : -1;
        });
        return info;
      };


      var load = function(videoFileUrl) {
        var a = document.createElement('a');
        a.href = videoFileUrl;
        var server = a.host;
        var search = a.search;

        if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
          return reject({status: 'fail', message: 'invalid url', url: videoFileUrl});
        }

        var fileType = RegExp.$1;
        var fileId   = RegExp.$2;
        var key      = RegExp.$3;

        if (fileType !== 'm') {
          return reject({status: 'fail', message: 'unknown file type', url: videoFileUrl});
        }

        return new Promise(function(resolve, reject) {
          var url = '//' + server + '/smile?m=' + fileId + '.' + key + '&sb=1';

          util.fetch(url, {credentials: 'include'})
            .then(res => { return res.text(); })
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

      return {
        load
      };
    })();
    ZenzaWatch.api.SmileStoryboardInfoLoader = SmileStoryboardInfoLoader;

    const DmcStoryboardInfoLoader = (() => {
      const parseStoryboard = function(sb) {
        const result = {
          id: 0,
          urls: [],
          quality: sb.quality,
          thumbnail:{
            width:    sb.thumbnail_width,
            height:   sb.thumbnail_height,
            number:   null,
            interval: sb.interval
          },
          board: {
            rows:   sb.rows,
            cols:   sb.columns,
            number: sb.images.length
          }
        };
        sb.images.forEach(image => {
          result.urls.push(image.uri);
        });

        return result;
      };


      const parseMeta = function(meta) {
        const result =  {
          format: 'dmc',
          status: meta.meta.message,
          url: null,
          movieId: null,
          storyboard: []
        };

        meta.data.storyboards.forEach(sb => {
          result.storyboard.unshift(parseStoryboard(sb));
        });

        // 画質の良い順にソート
        result.storyboard.sort((a, b) => {
          if(a.quality < b.quality) { return  1; }
          if(a.quality > b.quality) { return -1; }
          return 0;
        });

        return result;
      };


      const load = function(url) {
        return util.fetch(url, {credentials: 'include'})
          .then(res => { return res.json(); })
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
    ZenzaWatch.api.DmcStoryboardInfoLoader = DmcStoryboardInfoLoader;

    const StoryboardInfoLoader = (() => {
      return {
        load: function(url) {
          if (url.match(/dmc\.nico/)) {
            return DmcStoryboardInfoLoader.load(url);
          } else {
            return SmileStoryboardInfoLoader.load(url);
          }
        }
      };
    })();
    ZenzaWatch.api.StoryboardInfoLoader = StoryboardInfoLoader;

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
        }).then(res => {
          return res.json();
        }).catch(err => {
          window.console.error('create dmc session fail', err);
          return Promise.reject('create dmc session fail');
        });
      }

      _createRequestString(info) {
        if (!info) { info = this._info; }

        // 階層が深くて目が疲れた
        const request = {
          session:  {
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

        //window.console.log('storyboard session request', JSON.stringify(request, null, ' '));
        return JSON.stringify(request);
      }
    }


const {YouTubeWrapper} = (() => {

  const STATE_PLAYING = 1;

  class YouTubeWrapper extends AsyncEmitter {
    constructor({parentNode, autoplay = true, volume = 0.3, playbackRate = 1, loop = false}) {
      super();
      this._isInitialized = false;
      this._parentNode = parentNode;
      this._autoplay = autoplay;
      this._volume = volume;
      this._playbackRate = playbackRate;
      this._loop = loop;

      this._isSeeking = false;
      this._seekTime = 0;

      this._onSeekEnd = _.debounce(this._onSeekEnd.bind(this), 500);
    }

    setSrc(url, startSeconds = 0) {
      this._src = url;
      this._videoId = this._parseVideoId(url);
      this._canPlay = false;
      this._isSeeking = false;
      this._seekTime = 0;
      const player = this._player;
      const isFirst = !!player ? false : true;
      if (isFirst && !url) {
        return Promise.resolve();
      }
      if (isFirst) {
        return this._initPlayer(this._videoId, startSeconds).then(({player}) => {
          // YouTube APIにはプレイリストのループしか存在しないため、
          // プレイリストにも同じ動画を入れる
          // player.loadPlaylist({list: [this._videoId]});
        });
      }

      if (!url) {
        player.stopVideo();
        return Promise.resolve();
      }

      player.loadVideoById({
        videoId: this._videoId,
        startSeconds: startSeconds
      });
      player.loadPlaylist({list: [this._videoId]});
      return Promise.resolve();
    }

    set src(v) {
      this.setSrc(v);
    }

    get src() {
      return this._src;
    }

    _parseVideoId(url) {
      let videoId = (() => {
        const a = document.createElement('a');
        a.href = url;
        if (a.hostname === 'youtu.be') {
          return a.pathname.substring(1);
        } else {
          const query = util.parseQuery(a.search.substring(1));
          return query.v;
        }
      })();
      if (!videoId) { return videoId; }

      // 自動リンクでURLの前後につきそうな文字列を除去
      // たぶんYouTubeのVideoIdには使われない奴
      return videoId.replace(/[\?\[\]\(\)"'@]/g, '');
    }

    _initPlayer(videoId, startSeconds = 0) {
      if (this._player) {
        return Promise.resolve({player: this._player});
      }

      let resolved = false;
      return this._initYT().then((YT) => {
        return new Promise(resolve => {
          this._player = new YT.Player(
            this._parentNode, {
              videoId,
              events: {
                onReady: () => {
                  if (!resolved) {
                    resolved = true;
                    resolve({player: this._player});
                  }
                  this._onPlayerReady();
                },
                onStateChange: this._onPlayerStateChange.bind(this),
                onPlaybackQualityChange: e => {
                  window.console.info('video quality: ', e.data);
                }
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
                showInfo: 1,
              }
          });
        });
      });
    }

    _initYT() {
      if (window.YT) { return Promise.resolve(window.YT); }

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
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      });
    }

    _onPlayerReady() {
      this.emitAsync('loadedMetaData');
      this.emitAsync('canplay');
    }

    _onPlayerStateChange(e) {
      const state = e.data;
      const YT = window.YT;
      switch(state) {
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
            this.emitAsync('loadedMetaData');
            this.emit('canplay');
          }
          this.emit('play');
          this.emit('playing');
          break;
        case YT.PlayerState.PAUSED:
          this.emit('pause');
          break;
        case YT.PlayerState.BUFFERING:
          //this.emit('stalled');
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

    _onSeekEnd() {
      this._isSeeking = false;
      this._player.seekTo(this._seekTime);
    }

    set currentTime(v) {
      this._isSeeking = true;
      this._seekTime = Math.max(0, Math.min(v, this.duration));
      this._onSeekEnd();
    }

    get currentTime() {
      const now = performance.now();
      if (this._isSeeking) {
        this._lastTime = now;
        return this._seekTime;
      }
      const state = this._player.getPlayerState();
      const currentTime = this._player.getCurrentTime();

      if (state !== STATE_PLAYING || this._lastCurrentTime !== currentTime) {
        this._lastCurrentTime = currentTime;
        this._lastTime = now;
        return currentTime;
      }

      // 本家watchページ上ではなぜかgetCurrentTimeの精度が落ちるため、
      // status===PLAYINGにもかかわらずcurrentTimeが進んでいない時は、wrapper側で補完する。
      // 精度が落ちると断続的なstalled判定になりコメントがカクカクする
      const timeDiff = (now - this._lastTime) * this.playbackRate / 1000000;
      this._lastCurrentTime = Math.min(currentTime, this.duration);
      return currentTime + timeDiff;
    }

    get duration() {
      return this._player.getDuration();
    }

    set mute(v) {
      if (v) {
        this._player.mute();
      } else {
        this._player.unMute();
      }
      this._mute = !!v;
    }

    get mute() {
      return this._player.mute;
    }

    set volume(v) {
      if (this._volume !== v) {
        this._volume = v;
        this._player.setVolume(v * 100);
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
        //this.emit('changePlaybackRate');
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

    // 互換のためのダミー実装
    get videoWidth() { return 1280; }
    get videoHeight() { return 720; }
    getAttribute(k) { return this[k]; }
    removeAttribute() {}
  }

  return {YouTubeWrapper};
})();

ZenzaWatch.debug.YouTubeWrapper = YouTubeWrapper;

  


  /**
   * VideoPlayer + CommentPlayer = NicoVideoPlayer
   *
   * とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
   *
   */
  var NicoVideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoVideoPlayer.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayer.prototype, {
    initialize: function(params) {
      var conf = this._playerConfig = params.playerConfig;

      this._fullScreenNode = params.fullScreenNode;
      this._playerState = params.playerState;

      const playbackRate = conf.getValue('playbackRate');

      const onCommand = (command, param) => { this.emit('command', command, param); };
      this._videoPlayer = new VideoPlayer({
        volume:       conf.getValue('volume'),
        loop:         conf.getValue('loop'),
        mute:         conf.getValue('mute'),
        autoPlay:     conf.getValue('autoPlay'),
        playbackRate,
        debug:        conf.getValue('debug')
      });
      this._videoPlayer.on('command', onCommand);

      this._commentPlayer = new NicoCommentPlayer({
        offScreenLayer: params.offScreenLayer,
        enableFilter:   params.enableFilter,
        wordFilter:         params.wordFilter,
        wordRegFilter:      params.wordRegFilter,
        wordRegFilterFlags: params.wordRegFilterFlags,
        userIdFilter:   params.userIdFilter,
        commandFilter:  params.commandFilter,
        showComment:    conf.getValue('showComment'),
        debug:          conf.getValue('debug'),
        playbackRate,
        sharedNgLevel:  conf.getValue('sharedNgLevel')
      });
      this._commentPlayer.on('command', onCommand);

      this._contextMenu = new ContextMenu({
        parentNode: params.node.length ? params.node[0] : params.node,
        playerState: this._playerState
      });
      this._contextMenu.on('command', onCommand);

      if (params.node) {
        this.appendTo(params.node);
      }

      this._initializeEvents();

      this._beginTimer();

      ZenzaWatch.debug.nicoVideoPlayer = this;
    },
    _beginTimer: function() {
      this._stopTimer();
      this._videoWatchTimer =
        window.setInterval(this._onTimer.bind(this), 100);
    },
    _stopTimer: function() {
      if (!this._videoWatchTimer) { return; }
      window.clearInterval(this._videoWatchTimer);
      this._videoWatchTimer = null;
    },
    _initializeEvents: function() {
      this._videoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
      this._videoPlayer.on('dblclick', this._onDblClick.bind(this));
      this._videoPlayer.on('aspectRatioFix', this._onAspectRatioFix.bind(this));
      this._videoPlayer.on('play',    this._onPlay.bind(this));
      this._videoPlayer.on('playing', this._onPlaying.bind(this));
      this._videoPlayer.on('stalled', this._onStalled.bind(this));
      this._videoPlayer.on('progress', this._onProgress.bind(this));
      this._videoPlayer.on('pause',   this._onPause.bind(this));
      this._videoPlayer.on('ended', this._onEnded.bind(this));
      this._videoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
      this._videoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
      this._videoPlayer.on('durationChange', this._onDurationChange.bind(this));
      this._videoPlayer.on('playerTypeChange', this._onPlayerTypeChange.bind(this));

      // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
      this._videoPlayer.on('mouseWheel',
        _.throttle(this._onMouseWheel.bind(this), 50));

      this._videoPlayer.on('abort', this._onAbort.bind(this));
      this._videoPlayer.on('error', this._onError.bind(this));

      this._videoPlayer.on('click', this._onClick.bind(this));
      this._videoPlayer.on('contextMenu', this._onContextMenu.bind(this));

      this._commentPlayer.on('parsed', this._onCommentParsed.bind(this));
      this._commentPlayer.on('change', this._onCommentChange.bind(this));
      this._commentPlayer.on('filterChange', this._onCommentFilterChange.bind(this));
      //this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
      this._playerState.on('change', this._onPlayerStateChange.bind(this));
    },
    _onVolumeChange: function(vol, mute) {
      this._playerConfig.setValue('volume', vol);
      this._playerConfig.setValue('mute', mute);
      this.emit('volumeChange', vol, mute);
    },
    _onPlayerStateChange: function(key, value) {
      switch (key) {
        case 'isLoop':
          this._videoPlayer.setIsLoop(value);
          break;
        case 'playbackRate':
          this._videoPlayer.setPlaybackRate(value);
          this._commentPlayer.setPlaybackRate(value);
          break;
        case 'isAutoPlay':
          this._videoPlayer.setIsAutoPlay(value);
          break;
        case 'isCommentVisible':
          if (value) {
            this._commentPlayer.show();
          } else {
            this._commentPlayer.hide();
          }
          break;
        case 'isMute':
          this._videoPlayer.setMute(value);
          break;
        case 'sharedNgLevel':
          this.setSharedNgLevel(value);
          break;
      }
    },
    _onMouseWheel: function(e, delta) {
      // 下げる時は「うわ音でけぇ」
      // 上げる時は「ちょっと上げようかな」
      // なので下げる速度のほうが速い
      if (delta > 0) { // up
        this.volumeUp();
      } else {         // down
        this.volumeDown();
      }
    },
    volumeUp: function() {
      var v = Math.max(0.01, this._videoPlayer.getVolume());
      var r = (v < 0.05) ? 1.3 : 1.1;
      this._videoPlayer.setVolume(v * r);
    },
    volumeDown: function() {
      var v = this._videoPlayer.getVolume();
      this._videoPlayer.setVolume(v / 1.2);
    },
    _onTimer: function() {
      var currentTime = this._videoPlayer.getCurrentTime();
      this._commentPlayer.setCurrentTime(currentTime);
    },
    _onAspectRatioFix: function(ratio) {
      this._commentPlayer.setAspectRatio(ratio);
      this.emit('aspectRatioFix', ratio);
    },
    _onLoadedMetaData: function() {
      this.emit('loadedMetaData');
    },
    _onVideoCanPlay: function() {
      this.emit('canPlay');
    },
    _onDurationChange: function(duration) {
      this.emit('durationChange', duration);
    },
    _onPlayerTypeChange: function(type) {
      this.emit('videoPlayerTypeChange', type);
    },
    _onPlay: function() {
      this._isPlaying = true;
      this.emit('play');
    },
    _onPlaying: function() {
      this._isPlaying = true;
      this.emit('playing');
    },
    _onPause: function() {
      this._isPlaying = false;
      this.emit('pause');
    },
    _onStalled: function() {
      this.emit('stalled');
    },
    _onProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onEnded: function() {
      this._isPlaying = false;
      this._isEnded = true;
      this.emit('ended');
    },
    _onError: function(e) {
      this.emit('error', e);
    },
    _onAbort: function() {
      this.emit('abort');
    },
    _onClick: function() {
      this._contextMenu.hide();
    },
    _onDblClick: function() {
      if (this._playerConfig.getValue('enableFullScreenOnDoubleClick')) {
        this.toggleFullScreen();
      }
    },
    _onContextMenu: function(e) {
      if (!this._contextMenu.isOpen) {
        e.stopPropagation();
        e.preventDefault();
        this._contextMenu.show(e.offsetX, e.offsetY);
      }
    },
    _onCommentParsed: function() {
      this.emit('commentParsed');
    },
    _onCommentChange: function() {
      this.emit('commentChange');
    },
    _onCommentFilterChange: function(nicoChatFilter) {
      this.emit('commentFilterChange', nicoChatFilter);
    },
    setVideo: function(url) {
      let e = { src: url, url: null, promise: null };
      // デバッグ用
      ZenzaWatch.emitter.emit('beforeSetVideo', e);
      if (e.url) { url = e.url; }
      if (e.promise) {
        return e.promise.then(url => {
          this._videoPlayer.setSrc(url);
          this._isEnded = false;
        });
      }
      this._videoPlayer.setSrc(url);
      this._isEnded = false;
    },
    setThumbnail: function(url) {
      this._videoPlayer.setThumbnail(url);
    },
    play: function() {
      return this._videoPlayer.play();
    },
    pause: function() {
      this._videoPlayer.pause();
      return Promise.resolve();
    },
    togglePlay: function() {
      return this._videoPlayer.togglePlay();
    },
    setPlaybackRate: function(playbackRate) {
      //if (!ZenzaWatch.util.isPremium()) { playbackRate = Math.min(1, playbackRate); }
      playbackRate = Math.max(0, Math.min(playbackRate, 10));
      this._videoPlayer.setPlaybackRate(playbackRate);
      this._commentPlayer.setPlaybackRate(playbackRate);
    },
    setCurrentTime: function(t) {
      this._videoPlayer.setCurrentTime(Math.max(0, t));
    },
    fastSeek: function(t) {
      this._videoPlayer.fastSeek(Math.max(0, t));
    },
    getDuration: function() {
      return this._videoPlayer.getDuration();
    },
    getCurrentTime: function() {
      return this._videoPlayer.getCurrentTime();
    },
    getVpos: function() {
      return Math.floor(this._videoPlayer.getCurrentTime() * 100);
    },
    setComment: function(xmlText, options) {
      this._commentPlayer.setComment(xmlText, options);
    },
    getChatList: function() {
      return this._commentPlayer.getChatList();
    },
    getNonFilteredChatList: function() {
      return this._commentPlayer.getNonFilteredChatList();
    },
    setVolume: function(v) {
      this._videoPlayer.setVolume(v);
    },
    appendTo: function(node) {
      var $node = typeof node === 'string' ? $(node) : node;
      this._$parentNode = node;
      this._videoPlayer.appendTo($node[0]);
      this._commentPlayer.appendTo($node);
    },
    close: function() {
      this._videoPlayer.close();
      this._commentPlayer.close();
    },
    closeCommentPlayer: function() {
      this._commentPlayer.close();
    },
    toggleFullScreen: function() {
      if (FullScreen.now()) {
        FullScreen.cancel();
      } else {
        this.requestFullScreen();
      }
    },
    requestFullScreen: function() {
      FullScreen.request(this._fullScreenNode || this._$parentNode[0]);
    },
    canPlay: function() {
      return this._videoPlayer.canPlay();
    },
    isPlaying: function() {
      return !!this._isPlaying;
    },
    getBufferedRange: function() {
      return this._videoPlayer.getBufferedRange();
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._commentPlayer) {
        return;
      }
      var nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
      console.log('addChat:', text, cmd, vpos, options, nicoChat);
      return nicoChat;
    },
    setIsCommentFilterEnable: function(v) {
      this._commentPlayer.setIsFilterEnable(v);
    },
    isCommentFilterEnable: function() {
      return this._commentPlayer.isFilterEnable();
    },
    setSharedNgLevel: function(level) {
      this._commentPlayer.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._commentPlayer.getSharedNgLevel();
    },

    addWordFilter: function(text) {
      this._commentPlayer.addWordFilter(text);
    },
    setWordFilterList: function(list) {
      this._commentPlayer.setWordFilterList(list);
    },
    getWordFilterList: function() {
      return this._commentPlayer.getWordFilterList();
    },

    addUserIdFilter: function(text) {
      this._commentPlayer.addUserIdFilter(text);
    },
    setUserIdFilterList: function(list) {
      this._commentPlayer.setUserIdFilterList(list);
    },
    getUserIdFilterList: function() {
      return this._commentPlayer.getUserIdFilterList();
    },

    getCommandFilterList: function() {
      return this._commentPlayer.getCommandFilterList();
    },
    addCommandFilter: function(text) {
      this._commentPlayer.addCommandFilter(text);
    },
    setCommandFilterList: function(list) {
      this._commentPlayer.setCommandFilterList(list);
    },
    setVideoInfo: function(info) {
      this._videoInfo = info;
    },
    getVideoInfo: function() {
      return this._videoInfo;
    },
    getMymemory: function() {
      return this._commentPlayer.getMymemory();
    },
    getScreenShot: function() {
      window.console.time('screenShot');

      const fileName = this._getSaveFileName();
      const video = this._videoPlayer.getVideoElement();

      return VideoCaptureUtil.videoToCanvas(video).then(({canvas}) => {
        VideoCaptureUtil.saveToFile(canvas, fileName);
        window.console.timeEnd('screenShot');
      });
    },
    getScreenShotWithComment: function() {
      window.console.time('screenShotWithComment');

      const fileName = this._getSaveFileName({suffix: 'C'});
      const video = this._videoPlayer.getVideoElement();
      const html = this._commentPlayer.getCurrentScreenHtml();

      //return VideoCaptureUtil.htmlToCanvas({html, video}).then(({canvas}) => {
      //  VideoCaptureUtil.saveToFile(canvas, fileName);
      //  window.console.timeEnd('screenShotWithComment');
      //});
      return VideoCaptureUtil.nicoVideoToCanvas({video, html}).then(({canvas}) => {
        VideoCaptureUtil.saveToFile(canvas, fileName);
        window.console.timeEnd('screenShotWithComment');
      });
    },
    _getSaveFileName: function({suffix = ''} = {}) {
      const title = this._videoInfo.title;
      const watchId = this._videoInfo.watchId;
      const currentTime = this._videoPlayer.getCurrentTime();
      const min = Math.floor(currentTime / 60);
      const sec = (currentTime % 60 + 100).toString().substr(1, 6);
      const time = `${min}_${sec}`;
      const prefix = Config.getValue('screenshot.prefix') || '';

      return `${prefix}${title} - ${watchId}@${time}${suffix}.png`;
    },
    isCorsReady: function() {
      return this._videoPlayer && this._videoPlayer.isCorsReady();
    }
  });


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
      ZenzaWatch.debug.contextMenu = this;
      const onMouseDown = this._bound.onMouseDown = this._onMouseDown.bind(this);
      this._bound.onBodyMouseUp   = this._onBodyMouseUp.bind(this);
      this._bound.onRepeat = this._onRepeat.bind(this);
      this._view.addEventListener('mousedown', onMouseDown);
      this._isFirstShow = true;
      this._view.addEventListener('contextmenu', (e) => {
        setTimeout(() => { this.hide(); }, 100);
        e.preventDefault(); e.stopPropagation();
      });
    }

    //_onCommand(command, param) {
    //   super._onCommand(command, param);
    //}

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
      } else
      if (e.target && e.target.getAttribute('data-repeat') === 'on') {

        e.stopPropagation();
        this._onClick(e);
        this._beginRepeat(e);
      } else {
        e.stopPropagation();
        this._onClick(e);
        setTimeout(() => { this.hide(); }, 100);
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
      this.isRepeating = false;
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
        Math.max(0, Math.min(x, window.innerWidth  - view.offsetWidth)) + 'px';
      view.style.top =
        Math.max(0, Math.min(y + 20, window.innerHeight - view.offsetHeight)) + 'px';
      this.setState({isOpen: true});
      ZenzaWatch.emitter.emitAsync('showMenu');
    }

    hide() {
      document.body.removeEventListener('click', this._bound.onBodyClick);
      util.$(this._view).css({left: '', top: ''});
      this._endRepeat();
      this.setState({isOpen: false});
      ZenzaWatch.emitter.emitAsync('hideMenu');
    }

    get isOpen() {
      return this._state.isOpen;
    }

    _onBeforeShow() {
      // チェックボックスなどを反映させるならココ
      const pr = parseFloat(this._playerState.playbackRate, 10);
      const view = util.$(this._view);
      view.find('.selected').removeClass('selected');
      view.find('.playbackRate').forEach(elm => {
        const p = parseFloat(elm.getAttribute('data-param'), 10);
        if (Math.abs(p - pr) < 0.01) {
          elm.classList.add('selected');
        }
      });
      view.find('.debug')
        .toggleClass('selected', this._playerState.isDebug);
      if (this._isFirstShow) {
        this._isFirstShow = false;
        const handler = (command, param) => {
          this.emit('command', command, param);
        };
        ZenzaWatch.emitter.emitAsync('videoContextMenu.addonMenuReady',
          view.find('.empty-area-top'), handler
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
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .zenzaPlayerContextMenu.is-Open {
      opacity: 0.5;
    }
    .zenzaPlayerContextMenu.is-Open:hover {
      opacity: 1;
    }
    .fullScreen .zenzaPlayerContextMenu {
      position: absolute;
    }

    .zenzaPlayerContextMenu:not(.is-Open) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
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
    .zenzaPlayerContextMenu ul li.selected {
    }
    .is-loop           .zenzaPlayerContextMenu li.toggleLoop:before,
    .is-playlistEnable .zenzaPlayerContextMenu li.togglePlaylist:before,
    .is-showComment    .zenzaPlayerContextMenu li.toggleShowComment:before,
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
          <li class="command toggleLoop"        data-command="toggleLoop">リピート</li>
          <li class="command togglePlaylist"    data-command="togglePlaylist">連続再生</li>
          <li class="command toggleShowComment" data-command="toggleShowComment">コメントを表示</li>

          <hr class="separator">
          <li class="command"
            data-command="reload">動画のリロード</li>
          <li class="command"
            data-command="copy-video-watch-url">動画URLをコピー</li>
          <li class="command debug"
            data-command="toggle-debug">デバッグ</li>
          <li class="command mymemory"
            data-command="saveMymemory">コメントの保存</a></li>
        </ul>
      </div>
    </div>
  `).trim();





  /**
   *  Video要素をラップした物
   *
   */
  //_.extend(VideoPlayer.prototype, AsyncEmitter.prototype);
  class VideoPlayer extends AsyncEmitter {
    constructor(params) {
      super();
      this._initialize(params);
    }

    _initialize (params) {
      //console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
      this._id = 'video' + Math.floor(Math.random() * 100000);
      this._resetVideo(params);

      util.addStyle(VideoPlayer.__css__);
    }

    _reset () {
      this.removeClass('is-play is-pause is-abort is-error');
      this._isPlaying = false;
      this._canPlay = false;
    }

    addClass (className) {
      this.toggleClass(className, true);
    }

    removeClass (className) {
      this.toggleClass(className, false);
    }

    toggleClass (className, v) {
      var body = this._body;
      className.split(/[ ]+/).forEach(name => {
        body.classList.toggle(name, v);
      });
    }

    _resetVideo (params) {
      params = params || {};
      if (this._videoElement) {
        params.autoplay = this._videoElement.autoplay;
        params.loop     = this._videoElement.loop;
        params.mute     = this._videoElement.muted;
        params.volume   = this._videoElement.volume;
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

      const video = document.createElement('video');
      const body = document.createElement('div');
      util.$(body)
        .addClass(`videoPlayer nico ${this._id}`);
      util.$(video)
        .addClass(`videoPlayer-video`)
        .attr(options);
      body.id = 'ZenzaWatchVideoPlayerContainer';
      this._body = body;
      body.appendChild(video);

      this._video = video;
      video.controlslist = 'nodownload';
      video.controls = false;
      video.autoplay = !!params.autoPlay;
      video.loop     = !!params.loop;
      this._videoElement = video;

      this._isPlaying = false;
      this._canPlay = false;

      this.setVolume(volume);
      this.setMute(params.mute);
      this.setPlaybackRate(playbackRate);

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

      ZenzaWatch.debug.video = this._video;
      Object.assign(ZenzaWatch.external, {getVideoElement: () => { return this._video; }});
    }

    _initializeEvents () {
      util.$(this._video)
        .on('canplay',        this._onCanPlay        .bind(this))
        .on('canplaythrough', this._onCanPlayThrough .bind(this))
        .on('loadstart',      this._onLoadStart      .bind(this))
        .on('loadeddata',     this._onLoadedData     .bind(this))
        .on('loadedmetadata', this._onLoadedMetaData .bind(this))
        .on('ended',          this._onEnded          .bind(this))
        .on('emptied',        this._onEmptied        .bind(this))
        .on('stalled',        this._onStalled        .bind(this))
        .on('suspend',        this._onSuspend        .bind(this))
        .on('waiting',        this._onWaiting        .bind(this))
        .on('progress',       this._onProgress       .bind(this))
        .on('durationchange', this._onDurationChange .bind(this))
        .on('resize',         this._onResize         .bind(this))
        .on('abort',          this._onAbort          .bind(this))
        .on('error',          this._onError          .bind(this))

        .on('pause',          this._onPause          .bind(this))
        .on('play',           this._onPlay           .bind(this))
        .on('playing',        this._onPlaying        .bind(this))
        .on('seeking',        this._onSeeking        .bind(this))
        .on('seeked',         this._onSeeked         .bind(this))
        .on('volumechange',   this._onVolumeChange   .bind(this))
        .on('contextmenu',    this._onContextMenu    .bind(this))
        .on('click',          this._onClick          .bind(this))
        ;

      const touch = util.$(this._touchWrapper.body);
      touch
        .on('click',       this._onClick      .bind(this))
        .on('dblclick',    this._onDoubleClick.bind(this))
        .on('contextmenu', this._onContextMenu    .bind(this))
        .on('wheel',       this._onMouseWheel .bind(this))
      ;
    }

    _onCanPlay () {
      console.log('%c_onCanPlay:', 'background: cyan; color: blue;', arguments);

      this.setPlaybackRate(this.getPlaybackRate());
      // リピート時にも飛んでくるっぽいので初回だけにする
      if (!this._canPlay) {
        this._canPlay = true;
        this.removeClass('is-loading');
        this.emit('canPlay');
        this.emit('aspectRatioFix',
          this._video.videoHeight / Math.max(1, this._video.videoWidth));
      }
    }

    _onCanPlayThrough () {
      console.log('%c_onCanPlayThrough:', 'background: cyan;', arguments);
      this.emit('canPlayThrough');
    }

    _onLoadStart () {
      console.log('%c_onLoadStart:', 'background: cyan;', arguments);
      this.emit('loadStart');
    }

    _onLoadedData () {
      console.log('%c_onLoadedData:', 'background: cyan;', arguments);
      this.emit('loadedData');
    }

    _onLoadedMetaData () {
      console.log('%c_onLoadedMetaData:', 'background: cyan;', arguments);
      this.emit('loadedMetaData');
    }

    _onEnded () {
      console.log('%c_onEnded:', 'background: cyan;', arguments);
      this.emit('ended');
    }

    _onEmptied () {
      console.log('%c_onEmptied:', 'background: cyan;', arguments);
      this.emit('emptied');
    }

    _onStalled () {
      console.log('%c_onStalled:', 'background: cyan;', arguments);
      this.emit('stalled');
    }

    _onSuspend () {
      console.log('%c_onSuspend:', 'background: cyan;', arguments);
      this.emit('suspend');
    }

    _onWaiting () {
      console.log('%c_onWaiting:', 'background: cyan;', arguments);
      this.emit('waiting');
    }

    _onProgress () {
      //console.log('%c_onProgress:', 'background: cyan;', arguments);
      this.emit('progress', this._video.buffered, this._video.currentTime);
    }

    _onDurationChange () {
      console.log('%c_onDurationChange:', 'background: cyan;', arguments);
      this.emit('durationChange', this._video.duration);
    }

    _onResize () {
      console.log('%c_onResize:', 'background: cyan;', arguments);
      this.emit('resize');
    }

    _onAbort () {
      if (this._isYouTube) { return; } // TODO: YouTube側のエラーハンドリング
      window.console.warn('%c_onAbort:', 'background: cyan; color: red;');
      this._isPlaying = false;
      this.addClass('is-abort');
      this.emit('abort');
    }

    _onError (e) {
      if (this._isYouTube) { return; } // TODO: YouTube側のエラーハンドリング
      if (this._videoElement.getAttribute('src') === CONSTANT.BLANK_VIDEO_URL) { return; }
      window.console.error('error src', this._video.src);
      window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
      this.addClass('is-error');
      this._canPlay = false;
      this.emit('error', {
        code: e.target.error.code,
        target: e.target
      });
    }

    _onPause () {
      console.log('%c_onPause:', 'background: cyan;', arguments);
      //this.removeClass('is-play');

      this._isPlaying = false;
      this.emit('pause');
    }

    _onPlay () {
      console.log('%c_onPlay:', 'background: cyan;', arguments);
      this.addClass('is-play');
      this._isPlaying = true;

      this.emit('play');
    }

    // ↓↑の違いがよくわかってない
    _onPlaying () {
      console.log('%c_onPlaying:', 'background: cyan;', arguments);
      this._isPlaying = true;
      this.emit('playing');
    }

    _onSeeking () {
      console.log('%c_onSeeking:', 'background: cyan;', arguments);
      this.emit('seeking', this._video.currentTime);
    }

    _onSeeked () {
      console.log('%c_onSeeked:', 'background: cyan;', arguments);

      // なぜかシークのたびにリセットされるので再設定 (Chromeだけ？)
      this.setPlaybackRate(this.getPlaybackRate());

      this.emit('seeked', this._video.currentTime);
    }

    _onVolumeChange () {
      console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
      this.emit('volumeChange', this.getVolume(), this.isMuted());
    }

    _onClick (e) {
      this.emit('click', e);
    }

    _onDoubleClick (e) {
      console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
      e.preventDefault();
      e.stopPropagation();
      this.emit('dblclick');
    }

    _onMouseWheel (e) {
      console.log('%c_onMouseWheel:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      const delta = - parseInt(e.deltaY, 10);
      if (delta !== 0) {
        this.emit('mouseWheel', e, delta);
      }
    }

    _onContextMenu (e) {
      this.emit('contextMenu', e);
    }

    canPlay () {
      return !!this._canPlay;
    }

    play () {
      const p = this._video.play();
      // video.play()がPromiseを返すかどうかはブラウザによって異なるっぽい。。。
      if (p instanceof (Promise)) {
        return p.then(() => {
          this._isPlaying = true;
        });
      }
      this._isPlaying = true;
      return Promise.resolve();
    }

    pause () {
      this._video.pause();
      this._isPlaying = false;
      return Promise.resolve();
    }

    isPlaying () {
      return !!this._isPlaying && !!this._canPlay;
    }

    setThumbnail (url) {
      console.log('%csetThumbnail: %s', 'background: cyan;', url);

      this._thumbnail = url;
      this._video.poster = url;
      //this.emit('setThumbnail', url);
    }

    setSrc (url) {
      console.log('%csetSc: %s', 'background: cyan;', url);

      this._reset();

      this._src = url;
      this._isPlaying = false;
      this._canPlay = false;
      this.addClass('is-loading');

       if (/(youtube\.com|youtu\.be)/.test(url)) {
        const currentTime = this._currentVideo.currentTime;
        this._initYouTube().then(() => {
          // 通常使用では(video|YouTube) -> YouTubeへの遷移しか存在しないので
          // 逆方向の想定は色々端折っている
          return this._videoYouTube.setSrc(url, currentTime);
        }).then(() => {
          this._changePlayer('YouTube');
        });
        return;
      }

      this._changePlayer('normal');
      if (url.indexOf('dmc.nico') >= 0) {
        this._video.crossOrigin = 'use-credentials';
      } else if (this._video.crossOrigin) {
        this._video.crossOrigin = null;
      }

      this._video.src = url;
      
   }

    get _isYouTube() {
      return this._videoYouTube && this._currentVideo === this._videoYouTube;
    }

    _initYouTube() {
      if (this._videoYouTube) {
        return Promise.resolve(this._videoYouTube);
      }
      const yt = this._videoYouTube = new YouTubeWrapper({
        parentNode: this._body.appendChild(document.createElement('div')),
        volume: this._volume,
        autoplay: this._videoElement.autoplay
      });
      yt.on('canplay',        this._onCanPlay.bind(this));
      yt.on('loadedmetadata', this._onLoadedMetaData.bind(this));
      yt.on('ended',          this._onEnded  .bind(this));
      yt.on('stalled',        this._onStalled.bind(this));
      yt.on('pause',          this._onPause  .bind(this));
      yt.on('play',           this._onPlay   .bind(this));
      yt.on('volumechange',   this._onVolumeChange.bind(this));

      ZenzaWatch.debug.youtube = yt;
      return Promise.resolve(this._videoYouTube);
    }

    _changePlayer(type) {
      switch(type.toLowerCase()) {
        case 'youtube':
          if (this._currentVideo !== this._videoYouTube) {
            const yt = this._videoYouTube;
            this.addClass('is-youtube');
            yt.autoplay     = this._currentVideo.autoplay;
            yt.loop         = this._currentVideo.loop;
            yt.muted        = this._currentVideo.muted;
            yt.volume       = this._currentVideo.volume;
            yt.playbackRate = this._currentVideo.playbackRate;
            this._currentVideo = yt;
            this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
            this.emit('playerTypeChange', 'youtube');
          }
          break;
        default:
          if (this._currentVideo === this._videoYouTube) {
            this.removeClass('is-youtube');
            this._videoElement.loop   = this._currentVideo.loop;
            this._videoElement.muted  = this._currentVideo.muted;
            this._videoElement.volume = this._currentVideo.volume;
            this._videoElement.playbackRate = this._currentVideo.playbackRate;
            this._currentVideo = this._videoElement;
            this._videoYouTube.src = '';
            this.emit('playerTypeChange', 'normal');
          }
          break;
      }
    }

    setVolume (vol) {
      vol = Math.max(Math.min(1, vol), 0);
      this._video.volume = vol;
    }

    getVolume () {
      return parseFloat(this._video.volume);
    }

    setMute (v) {
      v = !!v;
      if (this._video.muted !== v) {
        this._video.muted = v;
      }
    }

    isMuted () {
      return this._video.muted;
    }

    getCurrentTime () {
      if (!this._canPlay) { return 0; }
      return this._video.currentTime;
    }

    setCurrentTime (sec) {
      var cur = this._video.currentTime;
      if (cur !== sec) {
        this._video.currentTime = sec;
        this.emit('seek', this._video.currentTime);
      }
    }

    /**
     * fastSeekが使えたら使う。 現状Firefoxのみ？
     * - currentTimeによるシーク 位置は正確だが遅い
     * - fastSeekによるシーク キーフレームにしか飛べないが速い(FLashに近い)
     * なので、smile動画のループはこっちを使ったほうが再現度が高くなりそう
     */
    fastSeek(sec) {
      if (typeof this._video.fastSeek !== 'function' || this._isYouTube) {
        return this.setCurrentTime(sec);
      }
      // dmc動画はキーフレーム間隔が1秒とか意味不明な仕様なのでcurrentTimeでいい
      if (this._src.indexOf('dmc.nico') >= 0) {
        return this.setCurrentTime(sec);
      }
      this._video.fastSeek(sec);
      this.emit('seek', this._video.currentTime);
    }

    getDuration () {
      return this._video.duration;
    }

    togglePlay () {
      if (this.isPlaying()) {
        return this.pause();
      } else {
        return this.play();
      }
    }

    getVpos () {
      return this._video.currentTime * 100;
    }

    setVpos (vpos) {
      this._video.currentTime = vpos / 100;
    }

    getIsLoop () {
      return !!this._video.loop;
    }

    setIsLoop (v) {
      this._video.loop = !!v;
    }

    setPlaybackRate (v) {
      console.log('setPlaybackRate', v);
      //if (!ZenzaWatch.util.isPremium()) { v = Math.min(1, v); }
      // たまにリセットされたり反映されなかったりする？
      this._playbackRate = v;
      var video = this._video;
      video.playbackRate = 1;
      window.setTimeout(function() { video.playbackRate = parseFloat(v); }, 100);
    }

    getPlaybackRate () {
      return this._playbackRate;
    }

    getBufferedRange () {
      return this._video.buffered;
    }

    setIsAutoPlay (v) {
      this._video.autoplay = v;
    }

    getIsAutoPlay () {
      return this._video.autoPlay;
    }

    appendTo (node) {
      node.appendChild(this._body);
    }

    close () {
      this._video.pause();

      this._video.removeAttribute('src');
      this._video.removeAttribute('poster');

      // removeAttribute('src')では動画がクリアされず、
      // 空文字を指定しても base hrefと連結されて
      // https://www.nicovideo.jpへのアクセスが発生する. どないしろと.
      this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
      //window.console.info('src', this._video.src, this._video.getAttribute('src'));
      if (this._videoYouTube) {
        this._videoYouTube.src = '';
      }
    }
    /**
     * 画面キャプチャを取る。
     * CORSの制限があるので保存できない。
     */
    getScreenShot () {
      if (!this.isCorsReady()) {
        return null;
      }
      const video = this._video;
      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0);
      return canvas;
    }

    isCorsReady () {
      return this._video.crossOrigin === 'use-credentials';
    }

    getVideoElement () {
      return this._videoElement;
    }

    get _video() {
      return this._currentVideo;
    }

    set _video(v) {
      this._currentVideo = v;
    }
  }

  VideoPlayer.__css__ = `
    .videoPlayer iframe,
    .videoPlayer video {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
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

    .videoPlayer.is-youtube video {
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


  class TouchWrapper extends AsyncEmitter {
    constructor({parentElement}) {
      super();
      this._parentElement = parentElement;

      this._config = ZenzaWatch.config.namespace('touch');
      this._isTouching = false;
      this._maxCount = 0;
      this._currentTouches = [];

      this._debouncedOnSwipe2Y = _.debounce(this._onSwipe2Y.bind(this), 400);
      this._debouncedOnSwipe3X = _.debounce(this._onSwipe3X.bind(this), 400);
      this.initializeDom();
    }

    initializeDom() {
      let body = this._body = document.createElement('div');
      body.className = 'touchWrapper';

      body.addEventListener('click', this._onClick.bind(this));

      body.addEventListener('touchstart',  this._onTouchStart .bind(this));
      body.addEventListener('touchmove',   this._onTouchMove  .bind(this));
      body.addEventListener('touchend',    this._onTouchEnd   .bind(this));
      body.addEventListener('touchcancel', this._onTouchCancel.bind(this));

      this._onTouchMoveThrottled =
        _.throttle(this._onTouchMoveThrottled.bind(this), 200);

      if (this._parentElement) {
        this._parentElement.appendChild(body);
      }
      ZenzaWatch.debug.touchWrapper = this;
    }

    get body() {
      return this._body;
    }

    _onMousedown(e) {
      //window.console.log('onmousedown', e, e.button);
      //if (e.button !== 0) {
      //  this._body.style.display = 'none';
      //  window.setTimeout(() => { this._body.style.display = 'block'; }, 400);
      //}
    }

    _onClick(e) {
      //const count = Math.max(this._lastTap, this._maxCount);
      //window.console.info('click', this._maxCount, this._lastTap, count);

      this._lastTap = 0;
    }

    _onTouchStart(e) {
      let identifiers =
        this._currentTouches.map(touch => { return touch.identifier; });
      if (e.changedTouches.length > 1) {
        e.preventDefault();
      }

      Array.from(e.changedTouches).forEach(touch => {
        if (identifiers.includes(touch.identifier)) { return; }
        this._currentTouches.push(touch);
      });

      this._maxCount = Math.max(this._maxCount, this.touchCount);
      this._startCenter = this._getCenter(e);
      this._lastCenter = this._getCenter(e);
      this._startAt = Date.now();
      this._isMoved = false;
    }

    _onTouchMove(e) {
      if (e.targetTouches.length > 1) {
        e.preventDefault();
      }
      this._onTouchMoveThrottled(e);
    }

    _onTouchMoveThrottled(e) {
      if (!e.targetTouches) { return; }
      if (e.targetTouches.length > 1) {
        e.preventDefault();
      }
      let startPoint   = this._startCenter;
      let lastPoint    = this._lastCenter;
      let currentPoint = this._getCenter(e);

      if (!startPoint || !currentPoint) { return; }
      let width  = this._body.offsetWidth;
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
      this._startAt = Date.now();
    }

    _onSwipe3X(diff) {
      this._execCommand(diff.perX < 0 ? 'playNextVideo' : 'playPreviousVideo');
      this._startCenter = this._lastCenter;
      this._startAt = Date.now();
    }

    _execCommand(command, param) {
      if (!this._config.getValue('enable')) { return; }
      if (!command) { return; }
      this.emit('command', command, param);
    }

    _onTouchEnd(e) {
      if (!e.changedTouches) { return; }
      let identifiers =
        Array.from(e.changedTouches).map(touch => { return touch.identifier; });
      let currentTouches = [];

      currentTouches = this._currentTouches.filter(touch => {
        return !identifiers.includes(touch.identifier);
      });

      this._currentTouches = currentTouches;

      //touchstartは複数タッチでも一回にまとまって飛んでくるが、
      //touchendは指の数だけ飛んでくるっぽい？
      //window.console.log('onTouchEnd', this._isMoved, e.changedTouches.length, this._maxCount, this.touchCount);
      if (!this._isMoved && this.touchCount === 0) {
        const config = this._config;
        this._lastTap = this._maxCount;
        window.console.info('touchEnd', this._maxCount, this._isMoved);
        switch (this._maxCount) {
          case 2:
            this._execCommand(config.getValue('tap2command'));
            //window.setTimeout(() => {
            //  this._execCommand(config.getValue('tap2command'));
            //}, 0);
            break;
          case 3:
            this._execCommand(config.getValue('tap3command'));
            break;
          case 4:
            this._execCommand(config.getValue('tap4command'));
            break;
          case 5:
            this._execCommand(config.getValue('tap5command'));
            break;
        }
        this._maxCount = 0;
        this._isMoved = false;
      }

    }

    _onTouchCancel(e) {
      if (!e.changedTouches) { return; }
      let identifiers =
        Array.from(e.changedTouches).map(touch => { return touch.identifier; });
      let currentTouches = [];

      window.console.log('onTouchCancel', this._isMoved, e.changedTouches.length);
      currentTouches = this._currentTouches.filter(touch => {
        return !identifiers.includes(touch.identifier);
      });

      this._currentTouches = currentTouches;
    }

    get touchCount() {
      return this._currentTouches.length;
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






  var StoryboardModel = function() { this.initialize.apply(this, arguments); };
  _.extend(StoryboardModel.prototype, AsyncEmitter.prototype);

  _.assign(StoryboardModel.prototype,{
      initialize: function(params) {
        this._isAvailable = false;
      },
      _createBlankData: function(info) {
        info = info || {};
        _.assign(info, {
          format: 'smile',
          status: 'fail',
          duration: 1,
          url: '',
          storyboard: [{
            id: 1,
            url: '',
            thumbnail: {
              width: 1,
              height: 1,
              number: 1,
              interval: 1
            },
            board: {
              rows: 1,
              cols: 1,
              number: 1
            }
          }]
        });
        return info;
      },

      update: function(info, duration) {
        if (!info || info.status !== 'ok') {
          this._info = this._createBlankData();
          this._isAvailable = false;
        } else {
          this._info = info;
          this._isAvailable = true;
        }

        if (this.isDmc()) { // dmcはdurationを返してくれないので仕方なく
          info.duration = duration;
          info.storyboard.forEach(board => {
            board.thumbnail.number =
              Math.floor(duration * 1000 / board.thumbnail.interval);
          });
        }

        this.emitAsync('update');
      },

      reset: function() {
        this._isAvailable = false;
        this.emitAsync('reset');
      },

      unload: function() {
        this._isAvailable = false;
        this.emitAsync('unload');
      },

      isAvailable: function() {
        return !!this._isAvailable;
      },

      hasSubStoryboard: function() {
        return this._info.storyboard.length > 1;
      },

      getStatus:   function() { return this._info.status; },
      getMessage:  function() { return this._info.message; },
      getDuration: function() { return parseInt(this._info.duration, 10); },

      isDmc: function() { return this._info.format === 'dmc'; },
      getUrl: function(i) {
        if (!this.isDmc()) {
          return this._info.storyboard[i || 0].url;
        } else {
          return this._info.storyboard[i || 0].urls[0];
        }
      },
      getWidth:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.width, 10); },
      getHeight:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.height, 10); },
      getInterval:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.interval, 10); },
      getCount: function(i) {
        return Math.max(
          Math.ceil(this.getDuration() / Math.max(0.01, this.getInterval())),
          parseInt(this._info.storyboard[i || 0].thumbnail.number, 10)
        );
      },
      getRows: function(i) { return parseInt(this._info.storyboard[i || 0].board.rows, 10); },
      getCols: function(i) { return parseInt(this._info.storyboard[i || 0].board.cols, 10); },
      getPageCount: function(i) { return parseInt(this._info.storyboard[i || 0].board.number, 10); },
      getTotalRows: function(i) {
        return Math.ceil(this.getCount(i) / this.getCols(i));
      },

      getPageWidth:    function(i) { return this.getWidth(i)  * this.getCols(i); },
      getPageHeight:   function(i) { return this.getHeight(i) * this.getRows(i); },
      getCountPerPage: function(i) { return this.getRows(i)   * this.getCols(i); },

      /**
       *  nページ目のURLを返す。 ゼロオリジン
       */
      getPageUrl: function(page, storyboardIndex) {
        if (!this.isDmc()) {
          page = Math.max(0, Math.min(this.getPageCount(storyboardIndex) - 1, page));
          return this.getUrl(storyboardIndex) + '&board=' + (page + 1);
        } else {
          return this._info.storyboard[storyboardIndex || 0].urls[page];
        }
      },

      /**
       * msに相当するサムネは何番目か？を返す
       */
      getIndex: function(ms, storyboardIndex) {
        // msec -> sec
        var v = Math.floor(ms / 1000);
        v = Math.max(0, Math.min(this.getDuration(), v));

        // サムネの総数 ÷ 秒数
        // Math.maxはゼロ除算対策
        var n = this.getCount(storyboardIndex) / Math.max(1, this.getDuration());

        return parseInt(Math.floor(v * n), 10);
      },

      /**
       * Indexのサムネイルは何番目のページにあるか？を返す
       */
      getPageIndex: function(thumbnailIndex, storyboardIndex) {
        var perPage   = this.getCountPerPage(storyboardIndex);
        var pageIndex = parseInt(thumbnailIndex / perPage, 10);
        return Math.max(0, Math.min(this.getPageCount(storyboardIndex), pageIndex));
      },

      /**
       *  msに相当するサムネは何ページの何番目にあるか？を返す
       */
      getThumbnailPosition: function(ms, storyboardIndex) {
        var thumbnailIndex = this.getIndex(ms, storyboardIndex);
        var pageIndex      = this.getPageIndex(thumbnailIndex);

        var mod = thumbnailIndex % this.getCountPerPage(storyboardIndex);
        var row = Math.floor(mod / Math.max(1, this.getCols()));
        var col = mod % this.getRows(storyboardIndex);

        return {
          page: pageIndex,
          index: thumbnailIndex,
          row: row,
          col: col
        };
      },

      /**
       * nページ目のx, y座標をmsに変換して返す
       */
      getPointMs: function(x, y, page, storyboardIndex) {
        var width  = Math.max(1, this.getWidth(storyboardIndex));
        var height = Math.max(1, this.getHeight(storyboardIndex));
        var row = Math.floor(y / height);
        var col = Math.floor(x / width);
        var mod = x % width;


        // 何番目のサムネに相当するか？
        var point =
          page * this.getCountPerPage(storyboardIndex) +
          row  * this.getCols(storyboardIndex)         +
          col +
          (mod / width) // 小数点以下は、n番目の左端から何%あたりか
          ;

        // 全体の何%あたり？
        var percent = point / Math.max(1, this.getCount(storyboardIndex));
        percent = Math.max(0, Math.min(100, percent));

        // msは㍉秒単位なので1000倍
        return Math.floor(this.getDuration() * percent * 1000);
      },

      /**
       * msは何ページ目に当たるか？を返す
       */
      getmsPage: function(ms, storyboardIndex) {
        var index = this._storyboard.getIndex(ms, storyboardIndex);
        var page  = this._storyboard.getPageIndex(index, storyboardIndex);

        return page;
      },

      /**
       * nページ目のCols, Rowsがsubではどこになるかを返す
       */
      getPointPageColAndRowForSub: function(page, row, col) {
        var mainPageCount = this.getCountPerPage();
        var subPageCount  = this.getCountPerPage(1);
        var mainCols = this.getCols();
        var subCols = this.getCols(1);

        var mainIndex = mainPageCount * page + mainCols * row + col;
        var subOffset = mainIndex % subPageCount;

        var subPage = Math.floor(mainIndex / subPageCount);
        var subRow = Math.floor(subOffset / subCols);
        var subCol = subOffset % subCols;

        return {
          page: subPage,
          row: subRow,
          col: subCol
        };
      }

    });


    var SeekBarThumbnail = function() { this.initialize.apply(this, arguments); };
    SeekBarThumbnail.BASE_WIDTH  = 160;
    SeekBarThumbnail.BASE_HEIGHT =  90;

    SeekBarThumbnail.__tpl__ = (`
      <div class="zenzaSeekThumbnail">
        <div class="zenzaSeekThumbnail-image"></div>
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

      .seekBarContainer:not(.enableCommentPreview) .zenzaSeekThumbnail.show {
        display: block;
        width: 180px;
        height: 100px;
        margin: auto;
        overflow: hidden;
        box-sizing: border-box;
        border: 1px solid #666;
        border-width: 1px 1px 0 1px;
        background: rgba(0, 0, 0, 0.8);
        padding: 8px 4px;
        border-radius: 8px 8px 0 0;
        z-index: 100;
      }

      .zenzaSeekThumbnail-image {
        background: none repeat scroll 0 0 #999;
        border: 0;
        margin: auto;
        transform-origin: center top;
        transition: background-position 0.1s steps(1, start) 0;
        /*animation-timing-function: steps(1, start);*/
      }

    `).trim();

    _.extend(SeekBarThumbnail.prototype, AsyncEmitter.prototype);
    _.assign(SeekBarThumbnail.prototype, {
      initialize: function(params) {
        this._model      = params.model;
        this._$container = params.$container;
        this._scale      = _.isNumber(params.scale) ? params.scale : 1.0;

        this._preloadImages =
          _.debounce(this._preloadImages.bind(this), 60 * 1000 * 5);
        this._model.on('reset',  this._onModelReset.bind(this));
        this._model.on('update', this._onModelUpdate.bind(this));

        ZenzaWatch.debug.seekBarThumbnail = this;
      },
      _onModelUpdate: function() {
        if (!this._model.isAvailable()) {
          this._isAvailable = false;
          this.hide();
          return;
        }
        this.initializeView();

        var model = this._model;
        this._isAvailable = true;
        var width  = this._colWidth  = Math.max(1, model.getWidth());
        var height = this._rowHeight = Math.max(1, model.getHeight());
        var scale = Math.min(
          SeekBarThumbnail.BASE_WIDTH  / width,
          SeekBarThumbnail.BASE_HEIGHT / height
        );

        var css = {
          width:  this._colWidth  * this._scale,
          height: this._rowHeight * this._scale,
          opacity: '',
          'background-size':
            (model.getCols() * this._colWidth  * this._scale) + 'px ' +
            (model.getRows() * this._rowHeight * this._scale) + 'px'
        };
        if (scale > 1.0) {
          css.transform = 'scale(' + scale + ')';
        } else {
          css.transform = '';
        }

        this._$image.css(css);
        //this._$view.css('height', this._rowHeight * this + 4);

        this._preloadImages();
        this.show();
      },
      _onModelReset: function() {
        this.hide();
        this._imageUrl = '';
        if (this._$image) { this._$image.css('background-image', ''); }
      },
      _preloadImages: function() {
        // セッションの有効期限が切れる前に全部の画像をロードしてキャッシュに収めておく
        // やっておかないと、しばらく放置した時に読み込めない
        var model = this._model;
        if (!model.isAvailable()) {
          return;
        }
        var pages = model.getPageCount();
        var div = document.createElement('div');
        for (var i = 0; i < pages; i++) {
          var url = model.getPageUrl(i);
          var img = document.createElement('img');
          img.src = url;
          div.appendChild(img);
        }

        this._$preloadImageContainer.html(div.innerHTML);
      },
      show: function() {
        if (!this._$view) { return; }
        this._$view.addClass('show');
        this.emit('visible', true);
      },
      hide: function() {
        if (!this._$view) { return; }
        this._$view.removeClass('show');
        this.emit('visible', false);
      },
      initializeView: function() {
        this.initializeView = _.noop;

        if (!SeekBarThumbnail.styleAdded) {
          ZenzaWatch.util.addStyle(SeekBarThumbnail.__css__);
          SeekBarThumbnail.styleAdded = true;
        }
        var $view = this._$view = $(SeekBarThumbnail.__tpl__);
        this._$image = $view.find('.zenzaSeekThumbnail-image');

        this._$preloadImageContainer =
          $('<div class="preloadImageContaienr" style="display: none !important;"></div>');
        $('body').append(this._$preloadImageContainer);

        if (this._$container) {
          this._$container.append($view);
        }
      },
      setCurrentTime: function(sec) {
        if (!this._isAvailable || !this._model.isAvailable() || !this._$image) { return; }

        var ms = Math.floor(sec * 1000);
        var model = this._model;
        var pos = model.getThumbnailPosition(ms, 0);
        var url = model.getPageUrl(pos.page);
        var x = pos.col * this._colWidth  * -1 * this._scale;
        var y = pos.row * this._rowHeight * -1 * this._scale;
        var css = {};
        var updated = false;

        if (this._imageUrl !== url) {
          css.backgroundImage = 'url(' + url + ')';
          this._imageUrl = url;
          updated = true;
        }
        if (this._imageX !== x || this._imageY !== y) {
          css.backgroundPosition = x + 'px ' + y + 'px';
          this._imageX = x;
          this._imageY = y;
          updated = true;
        }

        if (updated) {
          this._updateImageCss(css);
        }
      },
      _updateImageCss: function(css) {
        this._$image.css(css);
      }
    });

    var Storyboard = function() { this.initialize.apply(this, arguments); };
    _.extend(Storyboard.prototype, AsyncEmitter.prototype);
    _.assign(Storyboard.prototype, {
      initialize: function(params) {

        //this._player = params.player;
        this._playerConfig  = params.playerConfig;
        this._$container    = params.$container;
        this._loader        = params.loader || ZenzaWatch.api.StoryboardInfoLoader;


        this._initializeStoryboard();
        ZenzaWatch.debug.storyboard = this;
      },

      _initializeStoryboard: function() {
        this._initializeStoryboard = _.noop;

        if (!this._model) {
          this._model = new StoryboardModel({});
        }
        if (!this._view) {
          this._view = new StoryboardView({
            model: this._model,
            $container: this._$container,
            enable: this._playerConfig.getValue('enableStoryboardBar')
          });
          this._view.on('select', (ms) => { this.emit('command', 'seek', ms / 1000); });
          this._view.on('command', (command, param) => { this.emit('command', command, param); });
        }
      },
      reset: function() {
        this._$container.removeClass('storyboardAvailable');
        this._model.reset();
      },

      onVideoCanPlay: function(watchId, videoInfo) {
        if (!util.isPremium()) { return; }
        if (!this._playerConfig.getValue('enableStoryboard')) { return; }

        this._watchId = watchId;

        this._getStoryboardUrl(videoInfo).then(url => {
          if (this._watchId !== watchId) { return Promise.reject('video changed'); }
          if (!url) { return Promise.reject('getStoryboardUrl failure'); }

          this._initializeStoryboard();
          return ZenzaWatch.api.StoryboardInfoLoader.load(url);
        }).then(
          this._onStoryboardInfoLoad.bind(this, watchId, videoInfo.duration)
        ).catch(
          this._onStoryboardInfoLoadFail.bind(this, watchId)
        );
      },
      _getStoryboardUrl: function(videoInfo) {
        let url;
        if (!videoInfo.hasDmcStoryboard) {
          url = videoInfo.storyboardUrl;
          return url ? Promise.resolve(url) : Promise.reject('smile storyboard api not exist');
        }

        const info = videoInfo.dmcStoryboardInfo;
        return (new StoryboardSession(info)).create().then(result => {
          if (result && result.data && result.data.session && result.data.session.content_uri) {
            return result.data.session.content_uri;
          } else {
            return Promise.reject('dmc storyboard api not exist');
          }
        });
      },
      _onStoryboardInfoLoad: function(watchId, duration, info) {
        //window.console.log('onStoryboardInfoLoad', watchId, info);
        if (watchId !== this._watchId) { return; } // video changed
        this._model.update(info, duration);
        this._$container.toggleClass('storyboardAvailable', this._model.isAvailable());
      },
      _onStoryboardInfoLoadFail: function(watchId, err) {
        //window.console.log('onStoryboardInfoFail', watchId, err);
        if (watchId !== this._watchId) { return; } // video changed
        this._model.update(null);
        this._$container.removeClass('storyboardAvailable');
      },

      getSeekBarThumbnail: function(params) {
        if (this._seekBarThumbnail) {
          return this._seekBarThumbnail;
        }
        this._seekBarThumbnail = new SeekBarThumbnail({
          model: this._model,
          $container: params.$container
        });
        return this._seekBarThumbnail;
      },

      setCurrentTime: function(sec, forceUpdate) {
        if (this._view && this._model.isAvailable()) {
          this._view.setCurrentTime(sec, forceUpdate);
        }
      },

      _onStoryboardSelect: function(ms) {
        this._emit('command', 'seek', ms / 100);
      },

      toggle: function() {
        if (this._view) {
          this._view.toggle();
          this._playerConfig.setValue('enableStoryboardBar', this._view.isEnable());
        }
      }
    });


    var StoryboardBlock = function() { this.initialize.apply(this, arguments); };
    _.assign(StoryboardBlock.prototype, {
      initialize: function(option) {
        var height = option.boardHeight;

        this._backgroundPosition = '0 -' + height * option.row + 'px';
        this._src = option.src;
        this._page = option.page;
        this._isLoaded = true;

        var $view = $('<div class="board"/>')
          .css({
            width: option.pageWidth,
            height: height,
            'background-image': 'url(' + this._src + ')',
            'background-position': this._backgroundPosition,
            //'background-size': '',
          })
          .attr({
            'data-src': option.src,
            'data-page': option.page,
            'data-top': height * option.row + height / 2,
            'data-backgroundPosition': this._backgroundPosition
          })
          .append(option.$inner);

        this._isLoaded = true;
        $view.css('background-image', 'url(' + option.src + ')');

        this._$view = $view;
       },
       loadImage: function() {},
       getPage: function() { return this._page; },
       getView: function() { return this._$view; }
    });

    var StoryboardBlockBorder = function(width, height, cols) {
      this.initialize(width, height, cols);
    };
    _.assign(StoryboardBlockBorder.prototype, {
      initialize: function(width, height, cols) {
        var $border = $(_.repeat('<div class="border"/>', cols)).css({
          width: width,
          height: height
        });
        var $div = $('<div />');
        $div.append($border);
        this._$view = $div;
      },
      getView: function() {
        return this._$view.clone();
      }
    });

    var StoryboardBlockList = function() { this.initialize.apply(this, arguments); };
    _.assign(StoryboardBlockList.prototype, {
      initialize: function(storyboard) {
        if (storyboard) {
          this.create(storyboard);
        }
      },
      create: function(storyboard) {
        var pages      = storyboard.getPageCount();
        var pageWidth  = storyboard.getPageWidth();
        var width      = storyboard.getWidth();
        var height     = storyboard.getHeight();
        var rows       = storyboard.getRows();
        var cols       = storyboard.getCols();

        var totalRows = storyboard.getTotalRows();
        var rowCnt = 0;
        this._$innerBorder =
          new StoryboardBlockBorder(width, height, cols);
        var $view = $('<div class="boardList"/>')
          .css({
            width: storyboard.getCount() * width,
            height: height
          });
        this._$view = $view;
        this._blocks = [];

        for (var i = 0; i < pages; i++) {
          var src = storyboard.getPageUrl(i);
          for (var j = 0; j < rows; j++) {
            var option = {
              width: width,
              pageWidth: pageWidth,
              boardHeight: height,
              page: i,
              row: j,
              src: src
            };
            this.appendBlock(option);
            rowCnt++;
            if (rowCnt >= totalRows) {
              break;
            }
          }
        }

      },
      appendBlock: function(option) {
        option.$inner = this._$innerBorder.getView();
        var block = new StoryboardBlock(option);
        this._blocks.push(block);
        this._$view.append(block.getView());
      },
      loadImage: function(pageNumber) { },
      clear: function() {
        this._$view.remove();
      },
      getView: function() {
         return this._$view;
      }
    });


    var StoryboardView = function() { this.initialize.apply(this, arguments); }
    _.extend(StoryboardView.prototype, AsyncEmitter.prototype);

    _.assign(StoryboardView.prototype, {
      initialize: function(params) {
        console.log('%c initialize StoryboardView', 'background: lightgreen;');
        this._$container = params.$container;

        var sb  = this._model = params.model;

        this._isHover = false;
        this._currentUrl = '';
        this._lastPage = -1;
        this._lastMs = -1;
        this._lastGetMs = -1;
        this._scrollLeft = 0;
        this._isEnable = _.isBoolean(params.enable) ? params.enable : true;

        sb.on('update', this._onStoryboardUpdate.bind(this));
        sb.on('reset',  this._onStoryboardReset .bind(this));

        var frame = this._requestAnimationFrame = new util.RequestAnimationFrame(
          this._onRequestAnimationFrame.bind(this), 1
        );

        // TODO: グローバルのイベントフックじゃなくてちゃんと処理しましょう
        ZenzaWatch.emitter.on('DialogPlayerClose', function() {
          frame.disable();
        });

      },
      enable: function() {
        this._isEnable = true;
        if (this._$view && this._model.isAvailable()) {
          this.open();
        }
      },
      open: function() {
        if (!this._$view) { return; }
        this._$view.addClass('show');
        this._$body.addClass('zenzaStoryboardOpen');
        this._$container.addClass('zenzaStoryboardOpen');
        this._requestAnimationFrame.enable();
      },
      close: function() {
        if (!this._$view) { return; }
        this._$view.removeClass('show');
        this._$body.removeClass('zenzaStoryboardOpen');
        this._$container.removeClass('zenzaStoryboardOpen');
        this._requestAnimationFrame.disable();
      },
      disable: function() {
        this._isEnable = false;
        if (this._$view) {
          this.close();
        }
      },
      toggle: function(v) {
        if (typeof v === 'boolean') {
          if (v) { this.enable(); }
          else   { this.disable(); }
          return;
        }
        if (this._isEnable) {
          this.disable();
        } else {
          this.enable();
        }
      },
      isEnable: function() {
        return !!this._isEnable;
      },
      _initializeStoryboard: function() {
        this._initializeStoryboard = _.noop;
        window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');

        this._$body = $('body');

        ZenzaWatch.util.addStyle(StoryboardView.__css__);
        var $view = this._$view = $(StoryboardView.__tpl__);

        var $inner = this._$inner = $view.find('.storyboardInner');
        this._$failMessage   = $view.find('.failMessage');
        this._$cursorTime    = $view.find('.cursorTime');
        this._$pointer       = $view.find('.storyboardPointer');
        this._inner = $inner[0];

        $view
          .toggleClass('webkit', ZenzaWatch.util.isWebkit())
          .on('click',     '.board',   this._onBoardClick.bind(this))
          .on('mousemove', '.board',   this._onBoardMouseMove.bind(this))
          .on('mousemove', '.board', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
          .on('wheel',            this._onMouseWheel   .bind(this))
          .on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));


        var hoverOutTimer;
        var onHoverOutTimer = () => { this._isHover = false; };

        var onHoverIn  = () => {
          if (hoverOutTimer) { window.clearTimeout(hoverOutTimer); }
          this._isHover = true;
        };

        var onHoverOut = () => {
          if (hoverOutTimer) { window.clearTimeout(hoverOutTimer); }
          hoverOutTimer = window.setTimeout(onHoverOutTimer, 1000);
        };

        $inner
          .hover(onHoverIn, onHoverOut)
          .on('touchstart',  this._onTouchStart.bind(this))
        //  .on('touchend',    this._onTouchEnd  .bind(this))
          .on('touchmove',   this._onTouchMove .bind(this));
        this._bouncedOnToucheMoveEnd = _.debounce(this._onTouchMoveEnd.bind(this), 2000);

        this._$container.append($view);
        document.body.addEventListener('touchend', () => { this._isHover = false; }, {passive: true});

        this._innerWidth = window.innerWidth;
        window.addEventListener('resize', _.throttle(() => {
          this._innerWidth = window.innerWidth;
        }, 500));
      },
      _onBoardClick: function(e) {
        var $board = $(e.target).closest('.board'), offset = $board.offset();
        var y = $board.attr('data-top') * 1;
        var x = e.pageX - offset.left;
        var page = $board.attr('data-page');
        var ms = this._model.getPointMs(x, y, page);
        if (isNaN(ms)) { return; }

        var $view = this._$view;
        $view.addClass('clicked');
        window.setTimeout(function() { $view.removeClass('clicked'); }, 1000);
        this._$cursorTime.css({
          transform: 'translate(-999px, 0)'
        });

        this.emit('select', ms);
      },
      _onCommandClick: function(e) {
        var $command = $(e).closest('.command');
        var command = $command.attr('data-command');
        var param = $command.attr('data-param');
        if (!command) { return; }
        e.stopPropagation();
        e.preventDefault();
        this.emit('command', command, param);
      },
      _onBoardMouseMove: function(e) {
        var $board = $(e.target).closest('.board'), offset = $board.offset();
        var y = $board.attr('data-top') * 1;
        var x = e.pageX - offset.left;
        var page = $board.attr('data-page');
        var ms = this._model.getPointMs(x, y, page);
        if (isNaN(ms)) { return; }
        var sec = Math.floor(ms / 1000);

        var time = Math.floor(sec / 60) + ':' + ((sec % 60) + 100).toString().substr(1);
        this._$cursorTime.text(time).css({
          transform: `translate(${e.pageX}px, 0) translate(-50%, 0)`
        });

        this._isHover = true;
        this._isMouseMoving = true;
      },
      _onBoardMouseMoveEnd: function(e) {
        this._isMouseMoving = false;
      },
      _onMouseWheel: function(e) {
        // 縦ホイールで左右スクロールできるようにする
        e.stopPropagation();
        var deltaX = parseInt(e.originalEvent.deltaX, 10);
        var delta  = parseInt(e.originalEvent.deltaY, 10);
        if (Math.abs(deltaX) > Math.abs(delta)) {
          // 横ホイールがある環境ならなにもしない
          return;
        }
        e.preventDefault();
        this._isHover = true;
        this._isMouseMoving = true;
        var left = this.scrollLeft();
        this.scrollLeft(left + delta * 5, true);
      },
      _onMouseWheelEnd: function(e, delta) {
        this._isMouseMoving = false;
      },
      _onTouchStart: function(e) {
        this._isHover = true;
        this._isMouseMoving = true;
        e.stopPropagation();
      },
      _onTouchEnd: function(e) {
        //this._isHover = false;
        //this._isMouseMoving = false;
        //e.stopPropagation();
      },
      _onTouchMove: function(e) {
        e.stopPropagation();
        this._isHover = true;
        this._isMouseMoving = true;
        this._isTouchMoving = true;
        this._bouncedOnToucheMoveEnd();
      },
      _onTouchMoveEnd: function() {
        this._isTouchMoving = false;
        this._isMouseMoving = false;
      },
      _onTouchCancel: function(e) {
      },
      update: function() {
        this._isHover = false;
        this._timerCount = 0;
        this._scrollLeft = 0;

        this._initializeStoryboard();

        this.close();
        this._$view.removeClass('success fail');
        if (this._model.getStatus() === 'ok') {
          this._updateSuccess();
        } else {
          this._updateFail();
        }
      },
      scrollLeft: function(left, forceUpdate) {
        const inner = this._inner;
        if (!inner) { return 0; }

        if (left === undefined) {
          return inner.scrollLeft;
        } else if (left === 0 || Math.abs(this._scrollLeft - left) >= 1) {
          if (left === 0 || forceUpdate) {
            inner.scrollLeft = left;
            this._scrollLeftChanged = false;
          } else {
            var sl = inner.scrollLeft;
            this._scrollLeft = (left + sl) / 2;
            this._scrollLeftChanged = true;
          }
        }
      },
      scrollToNext: function() {
        this.scrollLeft(this._model.getWidth());
      },
      scrollToPrev: function() {
        this.scrollLeft(-this._model.getWidth());
      },
      _updateSuccess: function() {
        var url = this._model.getUrl();
        var $view = this._$view;
        $view
          .css('transform', 'translate3d(0px, -'+ this._model.getHeight() +'px, 0)')
          .addClass('success');

        if (this._currentUrl !== url) {
          // 前と同じurl == 同じ動画なら再作成する必要なし
          this._currentUrl = url;
          // 20ms前後かかってるけどもっと軽くできるはず・・・
          window.console.time('createStoryboardDOM');
          this._updateSuccessDom();
          window.console.timeEnd('createStoryboardDOM');
        }

        if (this._isEnable) {
          $view.addClass('opening show');
          this.scrollLeft(0);
          this.open();
          window.setTimeout(function() { $view.removeClass('opening'); }, 1000);
        }

      },
      _updateSuccessDom: function() {
        var list = new StoryboardBlockList(this._model);
        this._storyboardBlockList = list;
        this._$pointer.css({
          width:  this._model.getWidth(),
          height: this._model.getHeight(),
        });
        this._$inner.empty().append(list.getView()).append(this._$pointer);
      },
      _updateFail: function() {
        this._$view.removeClass('success').addClass('fail');
      },
      clear: function() {
        if (this._$view) {
          this._$inner.empty();
        }
      },
      _onRequestAnimationFrame: function() {
        if (!this._model.isAvailable()) { return; }
        if (!this._$view) { return; }

        if (this._scrollLeftChanged && !this._isHover) {
          this._$inner.scrollLeft(this._scrollLeft);
          this._scrollLeftChanged = false;
        }
        if (this._pointerLeftChanged) {
          this._$pointer.css('transform',
            `translate(${this._pointerLeft}px, 0) translate(-50%, 0)`
          );
          this._pointerLeftChanged = false;
        }
      },
      setCurrentTime: function(sec, forceUpdate) {
        if (!this._model.isAvailable()) { return; }
        if (!this._$view) { return; }
        if (this._lastCurrentTime === sec) { return; }

        this._lastCurrentTime = sec;
        var ms = sec * 1000;
        var storyboard = this._model;
        var duration = Math.max(1, storyboard.getDuration());
        var per = ms / (duration * 1000);
        var width = storyboard.getWidth();
        var boardWidth = storyboard.getCount() * width;
        var targetLeft = boardWidth * per;

        if (this._pointerLeft !== targetLeft) {
          this._pointerLeft = targetLeft;
          this._pointerLeftChanged = true;
          //this._$pointer.css('left', targetLeft);
        }

        if (forceUpdate) {
          this.scrollLeft(targetLeft - this._innerWidth * per, true);
        } else {
          if (this._isHover) { return; }
          this.scrollLeft(targetLeft - this._innerWidth * per);
        }
      },
      _onScroll: function() {
      },
      _onDisableButtonClick: function(e) {
        e.preventDefault();
        e.stopPropagation();

        var $button = this._$disableButton;
        $button.addClass('clicked');
        window.setTimeout(function() {
          $button.removeClass('clicked');
        }, 1000);

        this.emit('disableStoryboard');
      },
      _onStoryboardUpdate: function() {
        this.update();
      },
      _onStoryboardReset:  function() {
        if (!this._$view) { return; }
        this.close();
        this._$view.removeClass('show fail');
      }
    });

    
    StoryboardView.__tpl__ = [
        '<div id="storyboardContainer" class="storyboardContainer">',
          '<div class="storyboardHeader">',
            '<div class="cursorTime"></div>',
          '</div>',

          '<div class="storyboardInner">',
            '<div class="storyboardPointer"></div>',
          '</div>',
          '<div class="failMessage">',
          '</div>',
        '</div>',
        '',
      ''].join('');


    StoryboardView.__css__ = (`
      .storyboardContainer {
        position: fixed;
        top: calc(100vh + 500px);
        opacity: 0;
        left: 0;
        right: 0;
        width: 100%;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        background-color: rgba(50, 50, 50, 0.5);
        z-index: 9005;
        overflow: hidden;
        box-shadow: 0 -2px 2px #666;
        pointer-events: none;
        transform: translateZ(0);
        display: none;
        contain: layout paint;
      }

      .storyboardContainer.success {
        display: block;
        transition:
          bottom 0.5s ease-in-out,
          top 0.5s ease-in-out,
          transform 0.5s ease-in-out;
      }

      .storyboardContainer * {
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
      }

      .dragging .storyboardContainer,
      .storyboardContainer.show {
        top: 0px;
        z-index: 50;
        opacity: 1;
        pointer-events: auto;
      }

      .dragging .storyboardContainer {
        pointer-events: none;
      }


      .fullScreen  .dragging .storyboardContainer,
      .fullScreen            .storyboardContainer.show{
        top: calc(100% - 10px);
      }

      .storyboardContainer .storyboardInner {
        display: none;
        position: relative;
        text-align: center;
        overflow: hidden;
        white-space: nowrap;
        background: #222;
        margin: 0;
      }

      .storyboardContainer.webkit .storyboardInner,
      .storyboardContainer .storyboardInner:hover {
        overflow-x: auto;
      }
      /*.storyboardContainer .storyboardInner::-moz-scrollbar,*/
      .storyboardContainer .storyboardInner::-webkit-scrollbar {
        width: 6px;
        height: 6px;
        background: rgba(0, 0, 0, 0);
      }

      /*.storyboardContainer .storyboardInner::-moz-scrollbar-thumb,*/
      .storyboardContainer .storyboardInner::-webkit-scrollbar-thumb {
        border-radius: 6px;
        background: #f8f;
      }

      /*.storyboardContainer .storyboardInner::-moz-scrollbar-button,*/
      .storyboardContainer .storyboardInner::-webkit-scrollbar-button {
        display: none;
      }

      .storyboardContainer.success .storyboardInner {
        display: block;
      }

      .storyboardContainer .storyboardInner .boardList {
        overflow: hidden;
      }

      .storyboardContainer .boardList .board {
        display: inline-block;
        cursor: pointer;
        background-color: #101010;
      }

      .storyboardContainer.clicked .storyboardInner * {
        opacity: 0.3;
        pointer-events: none;
      }

      .storyboardContainer.opening .storyboardInner .boardList .board {
        pointer-events: none;
      }

      .storyboardContainer .boardList .board.loadFail {
        background-color: #c99;
      }

      .storyboardContainer .boardList .board > div {
        white-space: nowrap;
      }
      .storyboardContainer .boardList .board .border {
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        border-style: solid;
        border-color: #000 #333 #000 #999;
        border-width: 0     2px    0  2px;
        display: inline-block;
        pointer-events: none;
      }

      .storyboardContainer .storyboardHeader {
        position: relative;
        width: 100%;
      }

      .storyboardContainer .cursorTime {
        display: none;
        position: absolute;
        bottom: -30px;
        left: 0;
        font-size: 10pt;
        border: 1px solid #000;
        z-index: 9010;
        background: #ffc;
        pointer-events: none;
      }
      .storyboardContainer:hover .cursorTime {
        display: block;
      }

      .storyboardContainer.clicked .cursorTime,
      .storyboardContainer.opening .cursorTime {
        display: none;
      }


      .storyboardPointer {
        position: absolute;
        top: 0;
        z-index: 100;
        pointer-events: none;
        transform: translate(-50%, 0);
        box-shadow: 0 0 4px #333;
        background: #ff9;
        opacity: 0.5;
      }

      .storyboardContainer:hover .storyboardPointer {
        box-shadow: 0 0 8px #ccc;
        transition: transform 0.4s ease-out;
      }

    `).trim();





  var VideoControlBar = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoControlBar.prototype, AsyncEmitter.prototype);
  VideoControlBar.BASE_HEIGHT = CONSTANT.CONTROL_BAR_HEIGHT;
  VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;

  VideoControlBar.__css__ = (`
    .videoControlBar {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50%);
      transform: translate3d(0, -100%, 0);
      width: 100vw;
      height: ${VideoControlBar.BASE_HEIGHT}px;
      z-index: 150000;
      background: #000;
      transition: opacity 0.3s ease, transform 0.3s ease;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      content: layout;
    }
    .changeScreenMode .videoControlBar {
      opacity: 0;
      transform: translate3d(0, 0, 0);
      transition: none;
    }
    .zenzaScreenMode_small    .videoControlBar,
    .zenzaScreenMode_sideView .videoControlBar,
    .zenzaScreenMode_wide     .videoControlBar,
    .fullScreen               .videoControlBar {
      top: 100%;
      left: 0;
      width: 100%; /* 100vwだと縦スクロールバーと被る */
    }
    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .videoControlBar {
        left: calc(-50vw + 50%);
        top: calc(-50vh + 50% + 100vh - 60px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .videoControlBar {
        left: calc(-50vw + 50%);
        top: calc(-50vh + 50% + 100vh - 60px);
      }
    }




    .videoControlBar * {
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    .zenzaScreenMode_wide .videoControlBar,
    .fullScreen           .videoControlBar {
      position: absolute; /* firefoxのバグ対策 */
      opacity: 0;
      bottom: 0;
      background: none;
    }

    .zenzaScreenMode_wide .volumeChanging .videoControlBar,
    .fullScreen           .volumeChanging .videoControlBar,
    .zenzaScreenMode_wide .is-mouseMoving    .videoControlBar,
    .fullScreen           .is-mouseMoving    .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
    }
    .zenzaScreenMode_wide .showVideoControlBar .videoControlBar,
    .fullScreen           .showVideoControlBar .videoControlBar {
      opacity: 1 !important;
      background: #000 !important;
    }


    .zenzaScreenMode_wide .videoControlBar.dragging,
    .fullScreen           .videoControlBar.dragging,
    .zenzaScreenMode_wide .videoControlBar:hover,
    .fullScreen           .videoControlBar:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.9);
    }

    .controlItemContainer {
      position: absolute;
      top: 10px;
      height: 40px;
      z-index: 200;
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
    .controlItemContainer.left .scalingUI:empty{
      display: none;
    }
    .is-mouseMoving .controlItemContainer.left .scalingUI>* {
      background: #222;
    }
    .fullScreen .controlItemContainer.left {
      top: auto;
    }


    .controlItemContainer.center {
      left: 50%;
      height: 40px;
      transform: translate(-50%, 0);
      background: #222;
      white-space: nowrap;
      overflow: visible;
      transition: transform 0.2s ease, left 0.2s ease;
    }
    .fullScreen .controlItemContainer.center {
      top: auto;
    }
    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center {
      background: transparent;
    }



    .controlItemContainer.center .scalingUI {
      background: #222;
      transform-origin: top center;
    }

    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center .scalingUI {
      background: rgba(32, 32, 32, 0.5);
    }
    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center .scalingUI:hover {
      background: rgba(32, 32, 32, 0.8);
    }

    .controlItemContainer.right {
      right: 0;
    }
    .fullScreen .controlItemContainer.right {
      top: auto;
    }

    .is-mouseMoving .controlItemContainer.right {
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
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      color: #fff;
      opacity: 0.8;
      margin-right: 8px;
      vertical-align: middle;
    }
    .controlButton:hover {
      text-shadow: 0 0 8px #ff9;
      cursor: pointer;
      opacity: 1;
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
      border: 1px solid !000;
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

    .settingPanelSwitch {
      font-size: 20px;
      line-height: 30px;
      width: 32px;
      height: 32px;
      transition: font-size 0.2s ease;
    }
    .settingPanelSwitch:hover {
      text-shadow: 0 0 8px #ff9;
    }
    .controlButton:active {
      font-size: 15px;
    }
    .settingPanelSwitch .tooltip {
      left: 0;
    }


    .controlButtonInner {
      display: inline-block;
    }


    .seekTop {
      left: 0px;
      font-size: 23px;
      width: 32px;
      height: 32px;
      margin-top: -2px;
      line-height: 30px;
    }
    .seekTop .controlButtonInner{
    }
    .seekTop:active {
      font-size: 18px;
    }

    .togglePlay {
      font-size: 22px;
      width: 32px;
      height: 32px;
      line-height: 30px;
      box-sizing: border-box;
      transition: font-size 0.2s ease;
    }
    .togglePlay:active {
      font-size: 15px;
    }

    .togglePlay .pause,
    .is-playing .togglePlay .play {
      display: none;
    }

    .togglePlay>.pause {
      letter-spacing: -10px;
    }

    .is-playing .togglePlay .pause {
      display: block;
    }

    .seekBarContainer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      cursor: pointer;
      z-index: 150;
    }
    .fullScreen .seekBarContainer {
      top: auto;
      bottom: 0;
      z-index: 300;
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

    .fullScreen .seekBarContainer:hover .seekBarShadow {
      height: 14px;
      top: -12px;
    }

    .is-abort   .seekBarContainer,
    .is-loading .seekBarContainer,
    .is-error   .seekBarContainer {
      pointer-events: none;
      webkit-filter: grayscale();
      moz-filter: grayscale();
      filter: grayscale();
    }
    .is-abort   .seekBarContainer *,
    .is-loading .seekBarContainer *,
    .is-error   .seekBarContainer * {
      display: none;
    }

    .seekBar {
      position: relative;
      width: 100%;
      height: 10px;
      margin: px 0 2px;
      border-top:    1px solid #333;
      border-bottom: 1px solid #333;
      cursor: pointer;
      transition: height 0.2s ease 1s, margin-top 0.2s ease 1s;
    }

    .seekBar:hover {
      height: 24px;
      margin-top: -14px;
      transition: none;
    }

    .fullScreen .seekBar {
      margin-top: 0px;
      margin-bottom: -14px;
      height: 24px;
      transition: none;
    }


    .is-mouseMoving .seekBar {
      background-color: rgba(0, 0, 0, 0.5);
    }

    .seekBarContainer .seekBar * {
      pointer-events: none;
    }

    .bufferRange {
      position: absolute;
      width: 100%;
      height: 110%;
      left: 0px;
      top: 0px;
      box-shadow: 0 0 6px #ff9 inset, 0 0 4px #ff9;
      border-radius: 4px;
      z-index: 100;
      background: #663;
      transform-origin: left;
      transform: translate3d(0, 0, 0) scaleX(0);
      transition: transform 0.2s;
    }

    .is-youTube .bufferRange {
      width: 100% !important;
      height: 110% !important;
      box-shadow: 0 0 6px #f96 inset, 0 0 4px #ff9;
      transition: transform 0.8s ease 0.4s;
      transform: translate3d(0, 0, 0) scaleX(1) !important;
    }

    .zenzaStoryboardOpen .bufferRange {
      background: #ff9;
      mix-blend-mode: lighten;
      opacity: 0.5;
    }

    .noHeatMap .bufferRange {
      background: #666;
    }


    .seekBar .seekBarPointer {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 200;
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      transform-origin: left middle;
      transition: none;
    }

      .seekBar .seekBarPointerCore {
        position: absolute;
        top: 50%;
        width: 12px;
        height: 140%;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 2px;
        transform: translate3d(-50%, -50%, 0);
        box-shadow: 0 0 4px #ffc, 0 0 8px #ff9, 0 0 4px #ffc inset;
      }

    .is-loading  .seekBar .seekBarPointer,
    .dragging .seekBar .seekBarPointer {
      transition: none;
    }

    .videoControlBar .videoTime {
      display: inline-block;
      top: 0;
      padding: 0;
      color: #fff;
      font-size: 12px;
      white-space: nowrap;
      background: rgba(33, 33, 33, 0.5);
      border: 0;
      border-radius: 4px;
      pointer-events: none;
      user-select: none;
    }
    .videoControlBar .videoTime .currentTime,
    .videoControlBar .videoTime .duration {
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

    .dragging .seekBarContainer .tooltip,
    .seekBarContainer:hover .tooltip {
      opacity: 0.8;
    }

    .zenzaHeatMap {
      position: absolute;
      pointer-events: none;
      top: 2px; left: 0;
      width: 100%;
      height: calc(100% - 2px);
      transform-origin: 0 0 0;
      transform: translateZ(0);
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
      text-shadow: 0px 0px 2px #9cf;
      color: #9cf;
    }

    .playbackRateMenu {
      bottom: 0;
      min-width: 40px;
      height:    32px;
      line-height: 30px;
      font-size: 18px;
      white-space: nowrap;
      margin-right: 0;
    }

    .playbackRateMenu:active {
      font-size: 13px;
    }
    .playbackRateMenu.show {
      background: #888;
    }
    .playbackRateMenu.show .tooltip {
      display: none;
    }


    .playbackRateSelectMenu  {
      bottom: 44px;
      left: 50%;
      transform: translate(-50%, 0);
      width: 180px;
      text-align: left;
      line-height: 20px;
      font-size: 18px !important;
    }

    .playbackRateSelectMenu ul {
      margin: 2px 8px;
    }

    .playbackRateSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -9px;
      left: 50%;
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


    .screenModeMenu.show {
      background: #888;
    }
    .screenModeMenu.show .tooltip {
      display: none;
    }

    .screenModeMenu:active {
      font-size: 10px;
    }


    .fullScreen .screenModeMenu {
      display: none;
    }

    .screenModeSelectMenu {
      left: 50%;
      transform: translate(-50%, 0);
      bottom: 44px;
      width: 148px;
      padding: 2px 4px;
      font-size: 12px;
      line-height: 15px;
    }

    .changeScreenMode .screenModeSelectMenu,
    .fullScreen       .screenModeSelectMenu {
      display: none;
    }

    .screenModeSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -8.5px;
      left: 50%;
    }

    .screenModeSelectMenu ul li {
      display: inline-block;
      text-align: center;
      border-bottom: none;
      margin: 0;
      padding: 0;
    }
    .screenModeSelectMenu ul li span {
      border: 1px solid #ccc;
      width: 50px;
      margin: 2px 8px;
      padding: 4px 0;
    }

    .zenzaScreenMode_3D       .screenModeSelectMenu li.mode3D span,
    .zenzaScreenMode_sideView .screenModeSelectMenu li.sideView span,
    .zenzaScreenMode_small    .screenModeSelectMenu li.small span,
    .zenzaScreenMode_normal   .screenModeSelectMenu li.normal span,
    .zenzaScreenMode_big      .screenModeSelectMenu li.big span,
    .zenzaScreenMode_wide     .screenModeSelectMenu li.wide span {
      color: #ff9;
      border-color: #ff0;
    }


    .fullScreenSwitch {
      width:  32px;
      height: 32px;
      line-height: 30px;
      font-size: 20px;
    }
    .fullScreenSwitch:active {
      font-size: 15px;
    }

             .fullScreen  .fullScreenSwitch .controlButtonInner .toFull,
    body:not(.fullScreen) .fullScreenSwitch .controlButtonInner .returnFull {
      display: none;
    }


    .videoControlBar .muteSwitch {
      height: 32px;
      line-height: 30px;
      font-size: 20px;
      margin-right: 0;
    }
    .is-mute .videoControlBar .muteSwitch {
      color: #888;
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
      width: 80px;
      position: relative;
      vertical-align: middle;
    }

    .videoControlBar .volumeControl .volumeControlInner {
      position: relative;
      box-sizing: border-box;
      width: 64px;
      height: 8px;
      border: 1px solid #888;
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
    }

    .videoControlBar .volumeControl .volumeControlInner .slideBar {
      position: absolute;
      width: 50%;
      height: 100%;
      left: 0;
      bottom: 0;
      background: #ccc;
      pointer-events: none;

    }

    .videoControlBar .volumeControl .volumeBarPointer {
      display: none;
               /*
      position: absolute;
      top: 50%;
      width: 6px;
      height: 10px;
      background: #ccc;
      transform: translate(-50%, -50%);
      z-index: 200;
      pointer-events: none;
      */
    }

    .videoControlBar .volumeControl .tooltip {
      display: none;
      pointer-events: none;
      position: absolute;
      left: 6px;
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
    }
    .videoControlBar .volumeControl:hover .tooltip {
      display: block;
    }

    .is-mute .videoControlBar .volumeControlInner {
      pointer-events: none;
    }
    .is-mute .videoControlBar .volumeControlInner >* {
      display: none;
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
      width: 32px;
      height: 32px;
      margin-top: -2px;
      line-height: 30px;
    }
    .prevVideo .controlButtonInner {
      transform: scaleX(-1);
    }

    .prevVideo:active {
      font-size: 18px;
    }

    .toggleStoryboard {
      visibility: hidden;
      font-size: 13px;
      /*width: 32px;*/
      height: 32px;
      margin-top: -2px;
      line-height: 36px;
      pointer-events: none;
    }
    .storyboardAvailable .toggleStoryboard {
      visibility: visible;
      pointer-events: auto;
    }
    .zenzaStoryboardOpen .storyboardAvailable .toggleStoryboard {
      text-shadow: 0px 0px 2px #9cf;
      color: #9cf;
    }

    .toggleStoryboard .controlButtonInner {
      transform: scaleX(-1);
    }

    .toggleStoryboard:active {
      font-size: 10px;
    }



    .videoServerTypeMenu {
      bottom: 0;
      min-width: 40px;
      height:    32px;
      line-height: 30px;
      font-size: 16px;
      white-space: nowrap;
    }
    .is-dmcAvailable .videoServerTypeMenu  {
      text-shadow:
        0px 0px 8px #9cf, 0px 0px 6px #9cf, 0px 0px 4px #9cf, 0px 0px 2px #9cf;
    }
    .is-mouseMoving.is-dmcPlaying .videoServerTypeMenu  {
      background: #336;
    }
    .is-youTube .videoServerTypeMenu {
      text-shadow:
        0px 0px 8px #fc9, 0px 0px 6px #fc9, 0px 0px 4px #fc9, 0px 0px 2px #fc9 !important;
      pointer-events: none !important;
    }


    .videoServerTypeMenu:active {
      font-size: 13px;
    }
    .videoServerTypeMenu.show {
      background: #888;
    }
    .videoServerTypeMenu.show .tooltip {
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

    .videoServerTypeSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -9px;
      left: 50%;
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
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-dmc,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
      opacity: 0.4;
      pointer-events: none;
      text-shadow: none !important;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
      display: none;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-dmc span:before,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality       span:before{
      display: none !important;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType {
      pointer-events: none;
    }


    /* dmcを使用している時はsmileの画質選択を薄く */
    .zenzaPlayerContainer.is-dmcPlaying .smileVideoQuality {
      opacity: 0.4;
      pointer-events: none;
    }

    /* dmcを選択していない状態ではdmcの画質選択を隠す */
    .videoServerTypeSelectMenu:not(.is-dmcEnable) .currentVideoQuality,
    .videoServerTypeSelectMenu:not(.is-dmcEnable) .dmcVideoQuality {
      display: none;
    }



    @media screen and (max-width: 864px) {
      .controlItemContainer.center {
        left: 0%;
        transform: translate(0, 0);
      }
    }

  `).trim();

  VideoControlBar.__tpl__ = (`
    <div class="videoControlBar">

      <div class="seekBarContainer">
        <div class="seekBarShadow"></div>
        <div class="seekBar">
          <div class="seekBarPointer">
            <div class="seekBarPointerCore"></div>
          </div>
          <div class="bufferRange"></div>
        </div>
      </div>

      <div class="controlItemContainer left">
        <div class="scalingUI"></div>
      </div>
      <div class="controlItemContainer center">
        <div class="scalingUI">
          <div class="toggleStoryboard controlButton playControl forPremium" data-command="toggleStoryboard">
            <div class="controlButtonInner">&lt;●&gt;</div>
            <div class="tooltip">シーンサーチ</div>
          </div>

          <div class="loopSwitch controlButton playControl" data-command="toggleLoop">
            <div class="controlButtonInner">&#8635;</div>
            <div class="tooltip">リピート</div>
          </div>

           <div class="seekTop controlButton playControl" data-command="seek" data-param="0">
            <div class="controlButtonInner">&#8676;<!-- &#x23EE; --><!--&#9475;&#9666;&#9666;--></div>
            <div class="tooltip">先頭</div>
          </div>

          <div class="togglePlay controlButton playControl" data-command="togglePlay">
            <span class="play">▶</span>
            <span class="pause">&#10073; &#10073;<!--&#x2590;&#x2590;--><!-- &#x23F8; --> <!--&#12307; --></span>
            <div class="tooltip">
              <span class="play">再生</span>
              <span class="pause">一時停止</span>
            </div>
          </div>

          <div class="playbackRateMenu controlButton " data-command="playbackRateMenu">
            <div class="controlButtonInner">x1</div>
            <div class="tooltip">再生速度</div>
            <div class="playbackRateSelectMenu zenzaPopupMenu">
              <div class="triangle"></div>
              <p class="caption">再生速度</p>
              <ul>
                <li class="playbackRate" data-rate="10" ><span>10倍</span></li>
                <li class="playbackRate" data-rate="5"  ><span>5倍</span></li>
                <li class="playbackRate" data-rate="4"  ><span>4倍</span></li>
                <li class="playbackRate" data-rate="3"  ><span>3倍</span></li>
                <li class="playbackRate" data-rate="2"  ><span>2倍</span></li>

                <li class="playbackRate" data-rate="1.75"><span>1.75倍</span></li>
                <li class="playbackRate" data-rate="1.5"><span>1.5倍</span></li>
                <li class="playbackRate" data-rate="1.25"><span>1.25倍</span></li>

                <li class="playbackRate" data-rate="1.0"><span>標準速度(x1)</span></li>
                <li class="playbackRate" data-rate="0.75"><span>0.75倍</span></li>
                <li class="playbackRate" data-rate="0.5"><span>0.5倍</span></li>
                <li class="playbackRate" data-rate="0.25"><span>0.25倍</span></li>
                <li class="playbackRate" data-rate="0.1"><span>0.1倍</span></li>
              </ul>
            </div>
          </div>

          <div class="videoTime">
            <input type="text" class="currentTime" value="00:00">/<input type="text" class="duration" value="00:00">
          </div>

          <div class="muteSwitch controlButton" data-command="toggleMute">
            <div class="tooltip">ミュート(M)</div>
            <div class="menuButtonInner mute-off">&#x1F50A;</div>
            <div class="menuButtonInner mute-on">&#x1F507;</div>
          </div>

          <div class="volumeControl">
            <div class="tooltip">音量調整</div>
            <div class="volumeControlInner">
              <div class="slideBar"></div>
              <div class="volumeBarPointer"></div>
            </div>
          </div>

           <div class="prevVideo controlButton playControl" data-command="playPreviousVideo" data-param="0">
            <div class="controlButtonInner">&#x27A0;</div>
            <div class="tooltip">前の動画</div>
          </div>

           <div class="nextVideo controlButton playControl" data-command="playNextVideo" data-param="0">
            <div class="controlButtonInner">&#x27A0;</div>
            <div class="tooltip">次の動画</div>
          </div>


        </div>
      </div>

      <div class="controlItemContainer right">

        <div class="scalingUI">

          <div class="videoServerTypeMenu controlButton" data-command="videoServerTypeMenu">
            <div class="controlButtonInner">画</div>
            <div class="tooltip">動画サーバー・画質</div>
            <div class="videoServerTypeSelectMenu zenzaPopupMenu">
              <div class="triangle"></div>
              <p class="caption">動画サーバー・画質</p>
              <ul>

                <li class="serverType select-dmc   exec-command" data-command="update-enableDmc" data-param="true"  data-type="bool">
                  <span>新システムを使用</span>
                  <p class="currentVideoQuality"></p>
                </li>


                <li class="dmcVideoQuality selected exec-command select-auto" data-command="update-dmcVideoQuality" data-param="auto"><span>自動(auto)</span></li>
                <li class="dmcVideoQuality selected exec-command select-veryhigh" data-command="update-dmcVideoQuality" data-param="veryhigh"><span>超(1080) 優先</span></li>
                <li class="dmcVideoQuality selected exec-command select-high" data-command="update-dmcVideoQuality" data-param="high"><span>高(720) 優先</span></li>
                <li class="dmcVideoQuality selected exec-command select-mid"  data-command="update-dmcVideoQuality" data-param="mid"><span>中(480-540)</span></li>
                <li class="dmcVideoQuality selected exec-command select-low"  data-command="update-dmcVideoQuality" data-param="low"><span>低(360)</span></li>

                <li class="serverType select-smile exec-command" data-command="update-enableDmc" data-param="false" data-type="bool"><span>旧システムを使用</span></li>
                <li class="smileVideoQuality select-default exec-command" data-command="update-forceEconomy" data-param="false" data-type="bool"><span>自動</span></li>
                <li class="smileVideoQuality select-economy exec-command" data-command="update-forceEconomy" data-param="true"  data-type="bool"><span>エコノミー固定</span></li>
             </ul>
            </div>
          </div>

          <div class="screenModeMenu controlButton" data-command="screenModeMenu">
            <div class="tooltip">画面サイズ・モード変更</div>
            <div class="controlButtonInner">&#9114;</div>
            <div class="screenModeSelectMenu zenzaPopupMenu">
              <div class="triangle"></div>
              <p class="caption">画面モード</p>
              <ul>
                <li class="screenMode mode3D"   data-command="screenMode" data-screen-mode="3D"><span>3D</span></li>
                <li class="screenMode small"    data-command="screenMode" data-screen-mode="small"><span>小</span></li>
                <li class="screenMode sideView" data-command="screenMode" data-screen-mode="sideView"><span>横</span></li>
                <li class="screenMode normal"   data-command="screenMode" data-screen-mode="normal"><span>中</span></li>
                <li class="screenMode wide"     data-command="screenMode" data-screen-mode="wide"><span>WIDE</span></li>
                <li class="screenMode big"      data-command="screenMode" data-screen-mode="big"><span>大</span></li>
              </ul>
            </div>
          </div>

          <div class="fullScreenSwitch controlButton" data-command="fullScreen">
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

  _.assign(VideoControlBar.prototype, {
    initialize: function(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      var player = this._player = params.player;

      player.on('open',           this._onPlayerOpen.bind(this));
      player.on('canPlay',        this._onPlayerCanPlay.bind(this));
      player.on('durationChange', this._onPlayerDurationChange.bind(this));
      player.on('close',          this._onPlayerClose.bind(this));
      player.on('progress',       this._onPlayerProgress.bind(this));
      player.on('loadVideoInfo',  this._onLoadVideoInfo.bind(this));
      player.on('commentParsed',  _.debounce(this._onCommentParsed.bind(this), 500));
      player.on('commentChange',  _.debounce(this._onCommentChange.bind(this), 100));

      this._initializeDom();
      this._initializeScreenModeSelectMenu();
      this._initializePlaybackRateSelectMenu();
      this._initializeVolumeControl();
      this._initializeVideoServerTypeSelectMenu();
      this._isFirstVideoInitialized = false;

      ZenzaWatch.debug.videoControlBar = this;
    },
    _initializeDom: function() {
      util.addStyle(VideoControlBar.__css__);
      var $view = this._$view = $(VideoControlBar.__tpl__);
      var $container = this._$playerContainer;
      var config = this._playerConfig;
      var onCommand = (command, param) => { this.emit('command', command, param); };

      this._$seekBarContainer = $view.find('.seekBarContainer');
      this._$seekBar          = $view.find('.seekBar');
      this._$seekBarPointer = $view.find('.seekBarPointer');
      this._$bufferRange    = $view.find('.bufferRange');
      this._$tooltip        = $view.find('.seekBarContainer .tooltip');
      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover');
      });

      this._$seekBar
        .on('mousedown', this._onSeekBarMouseDown.bind(this))
        .on('mousemove', this._onSeekBarMouseMove.bind(this))
        .on('mousemove', _.debounce(this._onSeekBarMouseMoveEnd.bind(this), 1000));

      $view.find('.controlButton')
        .on('click', this._onControlButton.bind(this));

      this._$currentTime = $view.find('.currentTime');
      this._$duration    = $view.find('.duration');

      this._heatMap = new HeatMap({
        $container: this._$seekBarContainer.find('.seekBar')
      });
      var updateHeatMapVisibility = (v) => {
        this._$seekBarContainer.toggleClass('noHeatMap', !v);
      };
      updateHeatMapVisibility(this._playerConfig.getValue('enableHeatMap'));
      this._playerConfig.on('update-enableHeatMap', updateHeatMapVisibility);

      this._storyboard = new Storyboard({
        playerConfig: config,
        player: this._player,
        $container: $view
      });

      this._storyboard.on('command', onCommand);

      this._seekBarToolTip = new SeekBarToolTip({
        $container: this._$seekBarContainer,
        storyboard: this._storyboard
      });
      this._seekBarToolTip.on('command', onCommand);

      this._commentPreview = new CommentPreview({
        $container: this._$seekBarContainer
      });
      this._commentPreview.on('command', onCommand);
      var updateEnableCommentPreview = (v) => {
        this._$seekBarContainer.toggleClass('enableCommentPreview', v);
        this._commentPreview.setIsEnable(v);
      };

      updateEnableCommentPreview(config.getValue('enableCommentPreview'));
      config.on('update-enableCommentPreview', updateEnableCommentPreview);

      this._$screenModeMenu       = $view.find('.screenModeMenu');
      this._$screenModeSelectMenu = $view.find('.screenModeSelectMenu');

      this._$playbackRateMenu       = $view.find('.playbackRateMenu');
      this._$playbackRateSelectMenu = $view.find('.playbackRateSelectMenu');

      this._$videoServerTypeMenu       = $view.find('.videoServerTypeMenu');
      this._$videoServerTypeSelectMenu = $view.find('.videoServerTypeSelectMenu');


      ZenzaWatch.emitter.on('hideHover', () => {
        this._hideMenu();
        this._commentPreview.hide();
      });

      $container.append($view);
      this._width = this._$seekBarContainer.innerWidth();
    },
    _initializeScreenModeSelectMenu: function() {
      var self = this;
      var $menu = this._$screenModeSelectMenu;

      $menu.on('click', 'span', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target).closest('.screenMode');
        var mode     = $target.attr('data-screen-mode');

        self.emit('command', 'screenMode', mode);
      });

    },
    _initializePlaybackRateSelectMenu: function() {
      var self = this;
      var config = this._playerConfig;
      var $btn  = this._$playbackRateMenu;
      var $label = $btn.find('.controlButtonInner');
      var $menu = this._$playbackRateSelectMenu;

      $menu.on('click', '.playbackRate', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target).closest('.playbackRate');
        var rate     = parseFloat($target.attr('data-rate'), 10);
        self.emit('command', 'playbackRate', rate);
      });

      var updatePlaybackRate = function(rate) {
        $label.text('x' + rate);
        $menu.find('.selected').removeClass('selected');
        var fr = Math.floor( parseFloat(rate, 10) * 100) / 100;
        $menu.find('.playbackRate').each(function(i, item) {
          var $item = $(item);
          var r = parseFloat($item.attr('data-rate'), 10);
          if (fr === r) {
            $item.addClass('selected');
          }
        });
      };

      updatePlaybackRate(config.getValue('playbackRate'));
      config.on('update-playbackRate', updatePlaybackRate);
    },
    _initializeVolumeControl: function() {
      var $container = this._$view.find('.volumeControl');
      var $tooltip = $container.find('.tooltip');
      var $bar     = $container.find('.slideBar');
      var $pointer = $container.find('.volumeBarPointer');
      var $body    = $('body');
      var $window  = $(window);
      var config   = this._playerConfig;
      var self = this;

      var setVolumeBar = this._setVolumeBar = function(v) {
        var per = Math.round(v * 100);
        $bar.css({ width: per + '%'});
        $pointer.css({ left: per + '%'});
        $tooltip.text('音量 (' + per + '%)');
      };

      var $inner = $container.find('.volumeControlInner');
      var posToVol = function(x) {
        var width = $inner.outerWidth();
        var vol = x / width;
        return Math.max(0, Math.min(vol, 1.0));
      };

      var onBodyMouseMove = function(e) {
        var offset = $inner.offset();
        var scale = Math.max(0.1, parseFloat(config.getValue('menuScale'), 10));
        var left = (e.clientX - offset.left) / scale;
        var vol = posToVol(left);

        self.emit('command', 'volume', vol);
      };

      var bindDragEvent = function() {
        $body
          .on('mousemove.ZenzaWatchVolumeBar', onBodyMouseMove)
          .on('mouseup.ZenzaWatchVolumeBar',   onBodyMouseUp);
        $window.on('blur.ZenzaWatchVolumeBar', onWindowBlur);
      };
      var unbindDragEvent = function() {
        $body
          .off('mousemove.ZenzaWatchVolumeBar')
          .off('mouseup.ZenzaWatchVolumeBar');
        $window.off('blur.ZenzaWatchVolumeBar');
      };
      var beginMouseDrag = function() {
        bindDragEvent();
        $container.addClass('dragging');
      };
      var endMouseDrag = function() {
        unbindDragEvent();
        $container.removeClass('dragging');
      };
      var onBodyMouseUp = function() {
        endMouseDrag();
      };
      var onWindowBlur = function() {
        endMouseDrag();
      };

      var onVolumeBarMouseDown = function(e) {
        e.preventDefault();
        e.stopPropagation();

        var vol = posToVol(e.offsetX);
        self.emit('command', 'volume', vol);

        beginMouseDrag();
      };
      $inner.on('mousedown', onVolumeBarMouseDown);

      setVolumeBar(this._playerConfig.getValue('volume'));
      this._playerConfig.on('update-volume', setVolumeBar);
    },
    _initializeVideoServerTypeSelectMenu: function() {
      const config = this._playerConfig;
      //const $btn   = this._$videoServerTypeMenu;
      //const $label = $btn.find('.controlButtonInner');
      const $menu  = this._$videoServerTypeSelectMenu;
      const $current = $menu.find('.currentVideoQuality');

      $menu.on('click', '.exec-command', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const $target  = $(e.target).closest('.exec-command');
        const command  = $target.attr('data-command');
        if (!command) { return; }
        var   param    = $target.attr('data-param');
        const type     = $target.attr('data-type');
        if (param && type === 'bool') {
          param = JSON.parse(param);
        }
        this.toggleVideoServerTypeMenu(false);
        //$menu.removeClass('show');
        this.emit('command', command, param);
      });

      const updateEnableDmc = function(value) {
        $menu.toggleClass('is-dmcEnable', value);
        const $d = $menu.find('.serverType');
        $d.removeClass('selected');
        $menu.find('.select-' + (value ? 'dmc' : 'smile')).addClass('selected');
      };

      const updateForceEconomy = function(value) {
        const $dq = $menu.find('.smileVideoQuality');
        $dq.removeClass('selected');
        $menu.find('.select-' + (value ? 'economy' : 'default')).addClass('selected');
      };

      const updateDmcVideoQuality = function(value) {
        const $dq = $menu.find('.dmcVideoQuality');
        $dq.removeClass('selected');
        $menu.find('.select-' + value).addClass('selected');
      };

      const onVideoServerType = function(type, videoSessionInfo) {
        if (type !== 'dmc') {
          if (config.getValue('autoDisableDmc')) {
            $current.text('----');
          } else {
            $current.text('----');
          }
          return;
        }
        $current.text(videoSessionInfo.videoFormat.replace(/^.*h264_/, ''));
      };

      updateEnableDmc(      config.getValue('enableDmc'));
      updateForceEconomy(   config.getValue('forceEconomy'));
      updateDmcVideoQuality(config.getValue('dmcVideoQuality'));
      config.on('update-enableDmc',       updateEnableDmc);
      config.on('update-forceEconomy',    updateForceEconomy);
      config.on('update-dmcVideoQuality', updateDmcVideoQuality);

      this._player.on('videoServerType', onVideoServerType);
    },
    _onControlButton: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $target = $(e.target).closest('.controlButton');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      var type    = $target.attr('data-type');
      if (param && (type === 'bool' || type === 'json')) {
        param = JSON.parse(param);
      }
      switch (command) {
        case 'screenModeMenu':
          this.toggleScreenModeMenu();
          break;
        case 'playbackRateMenu':
          this.togglePlaybackRateMenu();
          break;
        case 'toggleStoryboard':
          this._storyboard.toggle();
          break;
        case 'videoServerTypeMenu':
          this.toggleVideoServerTypeMenu();
          break;
        default:
          this.emit('command', command, param);
          break;
       }
    },
    _hideMenu: function() {
      var self = this;
      $([
        'toggleScreenModeMenu',
        'togglePlaybackRateMenu',
        'toggleVideoServerTypeMenu'
      ]).each(function(i, func) {
        (self[func])(false);
      });
    },
    togglePlaybackRateMenu: function(v) {
      var $btn  = this._$playbackRateMenu;
      var $menu = this._$playbackRateSelectMenu;
      this._toggleMenu('playbackRate', $btn, $menu, v);
    },
    toggleScreenModeMenu: function(v) {
      var $btn  = this._$screenModeMenu;
      var $menu = this._$screenModeSelectMenu;
      this._toggleMenu('screenMode', $btn, $menu, v);
    },
    toggleVideoServerTypeMenu: function(v) {
      var $btn  = this._$videoServerTypeMenu;
      var $menu = this._$videoServerTypeSelectMenu;
      this._toggleMenu('screenMode', $btn, $menu, v);
    },
    _toggleMenu: function(name, $btn, $menu, v) {
      var $body = $('body');
      var eventName = 'click.ZenzaWatch_' + name + 'Menu';

      $body.off(eventName);
      $btn .toggleClass('show', v);
      $menu.toggleClass('show', v);

      var onBodyClick = function() {
        $btn.removeClass('show');
        $menu.removeClass('show');
        $body.off(eventName);
        ZenzaWatch.emitter.emitAsync('hideMenu');
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
        ZenzaWatch.emitter.emitAsync('showMenu');
      }
    },
    _posToTime: function(pos) {
      var width = this._$seekBar.innerWidth();
      return this._duration * (pos / Math.max(width, 1));
    },
    _timeToPos: function(time) {
      return this._width * (time / Math.max(this._duration, 1));
    },
    _timeToPer: function(time) {
      return (time / Math.max(this._duration, 1)) * 100;
    },
    _onPlayerOpen: function() {
      this._startTimer();
      this.setDuration(0);
      this.setCurrentTime(0);
      this._heatMap.reset();
      this._storyboard.reset();
      this.resetBufferedRange();
    },
    _onPlayerCanPlay: function(watchId, videoInfo) {
      var duration = this._player.getDuration();
      this.setDuration(duration);
      this._storyboard.onVideoCanPlay(watchId, videoInfo);

      this._heatMap.setDuration(duration);
    },
    _onCommentParsed: function() {
      this._chatList = this._player.getChatList();
      this._heatMap.setChatList(this._chatList);
      this._commentPreview.setChatList(this._chatList);
    },
    _onCommentChange: function() {
      this._chatList = this._player.getChatList();
      this._heatMap.setChatList(this._chatList);
      this._commentPreview.setChatList(this._chatList);
    },
    _onPlayerDurationChange: function() {
      // TODO: 動画のメタデータ解析後に動画長情報が変わることがあるので、
      // そこで情報を更新する
    },
    _onPlayerClose: function() {
      this._stopTimer();
    },
    _onPlayerProgress: function(range, currentTime) {
      this.setBufferedRange(range, currentTime);
    },
    _startTimer: function() {
      this._timerCount = 0;
      this._timer = window.setInterval(this._onTimer.bind(this), 10);
    },
    _stopTimer: function() {
      if (this._timer) {
        window.clearInterval(this._timer);
        this._timer = null;
      }
    },
    _onSeekBarMouseDown: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var left = e.offsetX;
      var sec = this._posToTime(left);

      this.emit('command', 'seek', sec);

      this._beginMouseDrag();
    },
    _onSeekBarMouseMove: function(e) {
      if (!this._$view.hasClass('dragging')) {
        e.stopPropagation();
      }
      var left = e.offsetX;
      var sec = this._posToTime(left);
      this._seekBarMouseX = left;

      this._commentPreview.setCurrentTime(sec);
      this._commentPreview.show(left);

      this._seekBarToolTip.update(sec, left);
    },
    _onSeekBarMouseMoveEnd: function(e) {
    },
    _beginMouseDrag: function() {
      this._bindDragEvent();
      this._$view.addClass('dragging');
    },
    _endMouseDrag: function() {
      this._unbindDragEvent();
      this._$view.removeClass('dragging');
    },
    _onBodyMouseMove: function(e) {
      var offset = this._$seekBar.offset();
      var left = e.clientX - offset.left;
      var sec = this._posToTime(left);

      this.emit('command', 'seek', sec);
      this._seekBarToolTip.update(sec, left);
      this._storyboard.setCurrentTime(sec, true);
    },
    _onBodyMouseUp: function() {
      this._endMouseDrag();
    },
    _onWindowBlur: function() {
      this._endMouseDrag();
    },
    _bindDragEvent: function() {
      $('body')
        .on('mousemove.ZenzaWatchSeekBar', _.bind(this._onBodyMouseMove, this))
        .on('mouseup.ZenzaWatchSeekBar',   _.bind(this._onBodyMouseUp, this));

      $(window).on('blur.ZenzaWatchSeekBar', _.bind(this._onWindowBlur, this));
    },
    _unbindDragEvent: function() {
      $('body')
        .off('mousemove.ZenzaWatchSeekBar')
        .off('mouseup.ZenzaWatchSeekBar');
      $(window).off('blur.ZenzaWatchSeekBar');
    },
    _onTimer: function() {
      this._timerCount++;
      var player = this._player;
      var currentTime = player.getCurrentTime();
      if (this._timerCount % 15 === 0) {
        this.setCurrentTime(currentTime);
      }
      this._storyboard.setCurrentTime(currentTime);
    },
    _onLoadVideoInfo: function(videoInfo) {
      this.setDuration(videoInfo.duration);

      if (!this._isFirstVideoInitialized) {
        this._isFirstVideoInitialized = true;
        const handler = (command, param) => {
          this.emit('command', command, param);
        };

        ZenzaWatch.emitter.emitAsync('videoControBar.addonMenuReady',
          this._$view[0].querySelector('.controlItemContainer.left .scalingUI'), handler
        );
        ZenzaWatch.emitter.emitAsync('seekBar.addonMenuReady',
          this._$view[0].querySelector('.seekBar'), handler
        );
      }
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec) {
        this._currentTime = sec;

        var m = Math.floor(sec / 60);
        m = m < 10 ? ('0' + m) : m;
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        var currentTimeText = [m, s].join(':');
        if (this._currentTimeText !== currentTimeText) {
          this._currentTimeText = currentTimeText;
          this._$currentTime[0].value = currentTimeText;
        }
        const per = Math.min(100, this._timeToPer(sec));
        this._$seekBarPointer[0].style.transform = `translate3d(${per}%, 0, 0)`;
      }
    },
    setDuration: function(sec) {
      if (sec !== this._duration) {
        this._duration = sec;

        if (sec === 0 || isNaN(sec)) {
          this._$duration[0].value = '--:--';
        }
        var m = Math.floor(sec / 60);
        m = m < 10 ? ('0' + m) : m;
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        this._$duration[0].value = [m, s].join(':');
        this.emit('durationChange');
      }
    },
    setBufferedRange: function(range, currentTime) {
      var $range = this._$bufferRange;
      if (!range || !range.length || !this._duration) {
        return;
      }
      for (var i = 0, len = range.length; i < len; i++) {
        try {
          var start = range.start(i);
          var end   = range.end(i);
          var width = end - start;
          if (start <= currentTime && end >= currentTime) {
            if (this._bufferStart !== start ||
                this._bufferEnd   !== end) {
              const perLeft = (this._timeToPer(start) - 1);
              const scaleX = (this._timeToPer(width) + 2) / 100;
              $range.css('transform', `translate3d(${perLeft}%, 0, 0) scaleX(${scaleX})`);
              this._bufferStart = start;
              this._bufferEnd   = end;
            }
            break;
          }
        } catch (e) {
        }
      }
    },
    resetBufferedRange: function() {
      this._buffferStart = 0;
      this._buffferEnd = 0;
      this._$bufferRange.css({transform: 'scaleX(0)'});
    }
  });

  var HeatMapModel = function() { this.initialize.apply(this, arguments); };
  HeatMapModel.RESOLUTION = 100;
  _.extend(HeatMapModel.prototype, AsyncEmitter.prototype);
  _.assign(HeatMapModel.prototype, {
    initialize: function(params) {
      this._resolution = params.resolution || HeatMapModel.RESOLUTION;
      this.reset();
    },
    reset: function() {
      this._duration = -1;
      this._chatReady = false;
      //this._isUpdated = false;
      this.emit('reset');
    },
    setDuration: function(duration) {
      if (this._duration !== duration) {
        this._duration = duration;
        this.update();
      }
    },
    setChatList: function(comment) {
      this._chat = comment;
      this._chatReady = true;
      this.update();
    },
    update: function() {
      if (this._duration < 0 || !this._chatReady /* || this._isUpdated */) {
        return;
      }
      var map = this._getHeatMap();
      this.emitAsync('update', map);
      ZenzaWatch.emitter.emit('heatMapUpdate', {map, duration: this._duration});
      // 無駄な処理を避けるため同じ動画では2回作らないようにしようかと思ったけど、
      // CoreMのマシンでも数ミリ秒程度なので気にしない事にした。
      // Firefoxはもうちょっとかかるかも
      //this._isUpdated = true;
    },
    _getHeatMap: function() {
      //console.time('update HeatMapModel');
      var chatList =
        this._chat.top.concat(this._chat.naka, this._chat.bottom);
      var duration = this._duration;
      if (!duration) { return; }
      var map = new Array(Math.max(Math.min(this._resolution, Math.floor(duration)), 1));
      var i = map.length;
      while(i > 0) map[--i] = 0;

      var ratio = duration > map.length ? (map.length / duration) : 1;

      for (i = chatList.length - 1; i >= 0; i--) {
        var nicoChat = chatList[i];
        var pos = nicoChat.getVpos();
        var mpos = Math.min(Math.floor(pos * ratio / 100), map.length -1);
        map[mpos]++;
      }

      //console.timeEnd('update HeatMapModel');
      return map;
    }
  });

  var HeatMapView = function() { this.initialize.apply(this, arguments); };
  _.assign(HeatMapView.prototype, {
    _canvas:  null,
    _palette: null,
    _width: 100,
    _height: 12,
    initialize: function(params) {
      this._model  = params.model;
      this._$container = params.$container;
      this._width  = params.width || 100;
      this._height = params.height || 10;

      this._model.on('update', _.bind(this._onUpdate, this));
      this._model.on('reset',  _.bind(this._onReset, this));
    },
    _initializePalette: function() {
      this._palette = [];
      // NicoHeatMaoより控え目な配色にしたい
      for (var c = 0; c < 256; c++) {
        var
          r = Math.floor((c > 127) ? (c / 2 + 128) : 0),
          g = Math.floor((c > 127) ? (255 - (c - 128) * 2) : (c * 2)),
          b = Math.floor((c > 127) ? 0 : (255  - c * 2));
        this._palette.push('rgb(' + r + ', ' + g + ', ' + b + ')');
      }
    },
    _initializeCanvas: function() {
      this._canvas           = document.createElement('canvas');
      this._canvas.className = 'zenzaHeatMap';
      this._canvas.width     = this._width;
      this._canvas.height    = this._height;

      this._$container.append(this._canvas);

      this._context = this._canvas.getContext('2d');

      this.reset();
    },
    _onUpdate: function(map) {
      this.update(map);
    },
    _onReset: function() {
      this.reset();
    },
    reset: function() {
      if (this._context) {
        this._context.fillStyle = this._palette[0];
        this._context.beginPath();
        this._context.fillRect(0, 0, this._width, this._height);
      }
    },
    update: function(map) {
      if (!this._isInitialized) {
        this._isInitialized = true;
        this._initializePalette();
        this._initializeCanvas();
        this.reset();
      }
      console.time('update HeatMap');

      // 一番コメント密度が高い所を100%として相対的な比率にする
      // 赤い所が常にピークになってわかりやすいが、
      // コメントが一カ所に密集している場合はそれ以外が薄くなってしまうのが欠点
      var max = 0, i;
      // -4 してるのは、末尾にコメントがやたら集中してる事があるのを集計対象外にするため (ニコニ広告に付いてたコメントの名残？)
      for (i = Math.max(map.length - 4, 0); i >= 0; i--) max = Math.max(map[i], max);

      if (max > 0) {
        var rate = 255 / max;
        for (i = map.length - 1; i >= 0; i--) {
          map[i] = Math.min(255, Math.floor(map[i] * rate));
        }
      } else {
        console.timeEnd('update HeatMap');
        return;
      }

      var
        scale = map.length >= this._width ? 1 : (this._width / Math.max(map.length, 1)),
        blockWidth = (this._width / map.length) * scale,
        context = this._context;

      for (i = map.length - 1; i >= 0; i--) {
        context.fillStyle = this._palette[parseInt(map[i], 10)] || this._palette[0];
        context.beginPath();
        context.fillRect(i * scale, 0, blockWidth, this._height);
      }
      console.timeEnd('update HeatMap');
    }
  });

  var HeatMap = function() { this.initialize.apply(this, arguments); };
  //_.extend(HeatMap.prototype, AsyncEmitter.prototype);
  _.assign(HeatMap.prototype, {
    initialize: function(params) {
      this._model = new HeatMapModel({
      });
      this._view = new HeatMapView({
        model: this._model,
        $container: params.$container
      });
      this.reset();
    },
    reset: function() {
      this._model.reset();
    },
    setDuration: function(duration) {
      this._model.setDuration(duration);
    },
    setChatList: function(chatList) {
      this._model.setChatList(chatList);
    }
  });


  var CommentPreviewModel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPreviewModel.prototype, AsyncEmitter.prototype);
  _.assign(CommentPreviewModel.prototype, {
    initialize: function() {
    },
    reset: function() {
      this._chatReady = false;
      this._vpos = -1;
      this.emit('reset');
    },
    setChatList: function(chatList) {
      var list = chatList.top.concat(chatList.naka, chatList.bottom);
      list.sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        return av - bv;
      });

      this._chatList = list;
      this._chatReady = true;
      this.update();
    },
    getChatList: function() {
      return this._chatList || [];
    },
    setCurrentTime: function(sec) {
      this.setVpos(sec * 100);
    },
    setVpos: function(vpos) {
      if (this._vpos !== vpos) {
        this._vpos = vpos;
        this.emit('vpos');
      }
    },
    getCurrentIndex: function() {
      if (this._vpos < 0 || !this._chatReady) {
        return -1;
      }
      return this.getVposIndex(this._vpos);
    },
    getVposIndex: function(vpos) {
      var list = this._chatList;
      for (var i = list.length - 1; i >= 0; i--) {
        var chat = list[i], cv = chat.getVpos();
        if (cv <= vpos - 400) {
          return i + 1;
        }
      }
      return -1;
    },
    getCurrentChatList: function() {
      if (this._vpos < 0 || !this._chatReady) {
        return [];
      }
      return this.getItemByVpos(this._vpos);
    },
    getItemByVpos: function(vpos) {
      var list = this._chatList;
      var result = [];
      for (var i = 0, len = list.length; i < len; i++) {
        var chat = list[i], cv = chat.getVpos(), diff = vpos - cv;
        if (diff >= -100 && diff <= 400) {
          result.push(chat);
        }
      }
      return result;
    },
    getItemByNo: function(no) {
      var list = this._chatList;
      for (var i = 0, len = list.length; i < len; i++) {
        var nicoChat = list[i];
        if (nicoChat.getNo() === no) {
          return nicoChat;
        }
      }
      return null;
    },
    update: function() {
      this.emit('update');
    }
  });

  var CommentPreviewView = function() { this.initialize.apply(this, arguments); };
  CommentPreviewView.MAX_HEIGHT = '200px';
  CommentPreviewView.ITEM_HEIGHT = 20;
  _.extend(CommentPreviewView.prototype, AsyncEmitter.prototype);
  CommentPreviewView.__tpl__ = (`
    <div class="zenzaCommentPreview">
      <div class="zenzaCommentPreviewInner">
      </div>
    </div>
  `).trim();

  CommentPreviewView.__css__ = `
    .zenzaCommentPreview {
      display: none;
      position: absolute;
      bottom: 16px;
      opacity: 0.8;
      max-height: ${CommentPreviewView.MAX_HEIGHT};
      width: 350px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.4);
      color: #ccc;
      z-index: 100;
      overflow: hidden;
      /*box-shadow: 0 0 4px #666;*/
      border-bottom: 24px solid transparent;
      transform: translate3d(0, 0, 0);
      transition: transform 0.2s;
    }

    .zenzaCommentPreview::-webkit-scrollbar {
      background: #222;
    }

    .zenzaCommentPreview::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    .zenzaCommentPreview::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }


    .zenzaCommentPreview.updating {
      transition: opacity 0.2s ease;
      opacity: 0.3;
      cursor: wait;
    }
    .zenzaCommentPreview.updating *{
      pointer-evnets: none;
    }


    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaCommentPreview,
    body:not(.fullScreen).zenzaScreenMode_small .zenzaCommentPreview {
      background: rgba(0, 0, 0, 0.9);
    }

    .seekBarContainer.enableCommentPreview:hover .zenzaCommentPreview.show {
      display: block;
    }
    .zenzaCommentPreview.show:hover {
      background: black;
      overflow: auto;
    }

    .zenzaCommentPreview * {
      box-sizing: border-box;
    }

    .zenzaCommentPreviewInner {
      padding: 4px;
      pointer-events: none;
    }
    .zenzaCommentPreview:hover .zenzaCommentPreviewInner {
      pointer-events: auto;
    }

    .zenzaCommentPreviewInner .nicoChat {
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
                /*border-top: 1px dotted transparent;*/
    }
    .zenzaCommentPreview:hover      .nicoChat + .nicoChat {
      /*border-top: 1px dotted #888;*/
    }
    .zenzaCommentPreviewInner:hover .nicoChat.odd {
      background: #333;
    }
    .zenzaCommentPreviewInner .nicoChat.fork1 .vposTime{
      color: #6f6;
    }
    .zenzaCommentPreviewInner .nicoChat.fork2 .vposTime{
      color: #66f;
    }



    .zenzaCommentPreviewInner .nicoChat .no,
    .zenzaCommentPreviewInner .nicoChat .date,
    .zenzaCommentPreviewInner .nicoChat .userId {
      display: none;
    }

    .zenzaCommentPreviewInner .nicoChat:hover .no,
    .zenzaCommentPreviewInner .nicoChat:hover .date,
    .zenzaCommentPreviewInner .nicoChat:hover .userId {
      display: inline-block;
      white-space: nowrap;
    }

    .zenzaCommentPreviewInner .nicoChat .vposTime {
    }
    .zenzaCommentPreviewInner .nicoChat:hover .text {
      color: #fff !important;
    }
    .zenzaCommentPreviewInner       .nicoChat .text:hover {
      text-decoration: underline;
    }

    .zenzaCommentPreviewInner .nicoChat .addFilter {
      display: none;
      position: absolute;
      font-size: 10px;
      color: #fff;
      background: #666;
      cursor: pointer;
      top: 0;
    }

    .zenzaCommentPreviewInner .nicoChat:hover .addFilter {
      display: inline-block;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 2px #333;
    }

    .zenzaCommentPreviewInner .nicoChat .addFilter.addUserIdFilter {
      right: 8px;
      width: 48px;
    }
    .zenzaCommentPreviewInner .nicoChat .addFilter.addWordFilter {
      right: 64px;
      width: 48px;
    }

  `;

  _.assign(CommentPreviewView.prototype, {
    initialize: function(params) {
      var model = this._model = params.model;
      this._$container = params.$container;

      this._showing = false;
      this._inviewTable = {};
      this._$newItems = '';
      this._chatList = [];
      this._initializeDom(this._$container);

      model.on('reset',  this._onReset.bind(this));
      model.on('update', _.debounce(this._onUpdate.bind(this), 10));
      model.on('vpos',   _.throttle(this._onVpos  .bind(this), 100));

      this.show = _.throttle(_.bind(this.show, this), 200);
      //this._applyView = ZenzaWatch.util.createDrawCallFunc(this._applyView.bind(this));
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(CommentPreviewView.__css__);
      var $view = this._$view = $(CommentPreviewView.__tpl__);
      this._$inner = $view.find('.zenzaCommentPreviewInner');

      $view
        .on('click', this._onClick.bind(this))
        .on('mousewheel', function(e) { e.stopPropagation(); })
        .on('scroll', _.throttle(this._onScroll.bind(this), 50, {trailing: false}));
      //  .on('resize', _.throttle(this._onResize.bind(this), 50));

      $container.on('mouseleave', this.hide.bind(this));
      $container.append($view);
    },
    _onClick: function(e) {
      e.stopPropagation();
      var $view = this._$view;
      var $target = $(e.target);
      var command = $target.attr('data-command');
      var $nicoChat = $target.closest('.nicoChat');
      var no = parseInt($nicoChat.attr('data-nicochat-no'), 10);
      var nicoChat  = this._model.getItemByNo(no);

      if (command && nicoChat && !$view.hasClass('updating')) {
        $view.addClass('updating');

        window.setTimeout(function() { $view.removeClass('updating'); }, 3000);

        switch (command) {
          case 'addUserIdFilter':
            this.emit('command', command, nicoChat.getUserId());
            break;
          case 'addWordFilter':
            this.emit('command', command, nicoChat.getText());
            break;
          case 'addCommandFilter':
            this.emit('command', command, nicoChat.getCmd());
            break;
        }
        return;
      }
      var vpos = $nicoChat.attr('data-vpos');
      if (vpos !== undefined) {
        this.emit('command', 'seek', vpos / 100);
      }
    },
    _onUpdate: function() {
      if (this._isShowing) {
        this._updateView();
      } else {
        this._updated = true;
      }
    },
    _onVpos: function() {
      var index = Math.max(0, this._model.getCurrentIndex());
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;
      this._inviewIndex = index;
      this._scrollTop = itemHeight * index;
      this._refreshInviewElements(this._scrollTop);
    },
    _onResize: function() {
      this._refreshInviewElements();
    },
    _onScroll: function() {
      this._scrollTop = -1;
      this._refreshInviewElements();
    },
    _onReset: function() {
      this._$inner.html('');
      this._inviewTable = {};
      this._inviewIndex = 0;
      this._scrollTop = 0;
      this._$newItems = null;
      this._chatList = [];
    },
    _updateView: function() {
      var chatList = this._chatList = this._model.getChatList();
      if (chatList.length < 1) {
        this.hide();
        this._updated = false;
        return;
      }

      window.console.time('updateCommentPreviewView');
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;

      this._$inner.css({
        height:
        (chatList.length + 2) * itemHeight
        //`calc(${chatList.length * itemHeight}px + ${CommentPreviewView.MAX_HEIGHT})`
      });
      this._updated = false;
      window.console.timeEnd('updateCommentPreviewView');
    },
    _createDom: function(chat, idx) {
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;
      var text = ZenzaWatch.util.escapeHtml(chat.getText());
      var date = (new Date(chat.getDate() * 1000)).toLocaleString();
      var vpos = chat.getVpos();
      var no = chat.getNo();
      var oe = idx % 2 === 0 ? 'even' : 'odd';
      var title = `${no} : 投稿日 ${date}\nID:${chat.getUserId()}\n${text}\n`;
      var color = chat.getColor() || '#fff';
      var shadow = color === '#fff' ? '' : `text-shadow: 0 0 1px ${color};`;

      var vposToTime = function(vpos) {
        var sec = Math.floor(vpos / 100);
        var m = Math.floor(sec / 60);
        var s = (100 + (sec % 60)).toString().substr(1);
        return [m, s].join(':');
      };

      return `<li class="nicoChat fork${chat.getFork()} ${oe}"
            id="commentPreviewItem${idx}"
            data-vpos="${vpos}"
            data-nicochat-no="${no}"
            style="top: ${idx * itemHeight}px;"
            >
            <span class="vposTime">${vposToTime(vpos)}: </span>
            <span class="text" title="${title}" style="${shadow}">
            ${text}
            </span>
            <span class="addFilter addUserIdFilter"
              data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
            <span class="addFilter addWordFilter"
              data-command="addWordFilter" title="NGワード">NGword</span>
        </li>`;
    },
    _refreshInviewElements: function(scrollTop, startIndex, endIndex) {
      if (!this._$inner) { return; }
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;

      var $view = this._$view;
      scrollTop = _.isNumber(scrollTop) ? scrollTop : $view.scrollTop();

      var viewHeight = $view.innerHeight();
      var viewBottom = scrollTop + viewHeight;
      var chatList = this._chatList;
      if (!chatList || chatList.length < 1) { return; }
      startIndex =
        _.isNumber(startIndex) ? startIndex : Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
      endIndex   =
        _.isNumber(endIndex) ? endIndex : Math.min(chatList.length, Math.floor(viewBottom / itemHeight) + 5);
      var i;
      //window.console.log(`index ${startIndex} 〜 ${endIndex}`);

      var newItems = [], inviewTable = this._inviewTable;
      var create = this._createDom;
      for (i = startIndex; i < endIndex; i++) {
        var chat = chatList[i];
        if (inviewTable[i] || !chat) { continue; }
        newItems.push(create(chat, i));
        inviewTable[i] = true;
      }

      if (newItems.length < 1) { return; }

      _.each(Object.keys(inviewTable), function(i) {
        if (i >= startIndex && i <= endIndex) { return; }
        var item = document.getElementById('commentPreviewItem' + i);
        if (item) { item.remove(); }
        else { window.console.log('not found ', 'commentPreviewItem' + i);}
        delete inviewTable[i];
      });


      var $newItems = $(newItems.join(''));
      if (this._$newItems) {
        this._$newItems.append($newItems);
      } else {
        this._$newItems = $newItems;
      }

      this._applyView();
    },
    _isEmpty: function() {
      return this._chatList.length < 1;
    },
    show: function(left) {
      this._isShowing = true;
      if (this._updated) {
        this._updateView();
      }
      if (this._isEmpty()) {
        return;
      }
      var $view = this._$view, width = $view.outerWidth();
      var containerWidth = this._$container.innerWidth();

      left = Math.min(Math.max(0, left - width / 2), containerWidth - width);
      this._left = left;
      this._applyView();
    },
    _applyView: function() {
      var $view = this._$view;
      if (!$view.hasClass('show')) { $view.addClass('show'); }
      if (this._$newItems) {
        this._$inner.append(this._$newItems);
        this._$newItems = null;
      }
      if (this._scrollTop > 0) {
        $view.scrollTop(this._scrollTop);
        this._scrollTop = -1;
      }

      $view
        .css({
        'transform': 'translate3d(' + this._left + 'px, 0, 0)'
      });
    },
    hide: function() {
      this._isShowing = false;
      this._$view.removeClass('show');
    }
  });

  var CommentPreview = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPreview.prototype, AsyncEmitter.prototype);
  _.assign(CommentPreview .prototype, {
    initialize: function(param) {
      this._model = new CommentPreviewModel({
      });
      this._view = new CommentPreviewView({
        model:      this._model,
        $container: param.$container
      });
      var self = this;
      this._view.on('command', function(command, param) {
        self.emit('command', command, param);
      });

      this.reset();
    },
    reset: function() {
      this._left = 0;
      this._model.reset();
      this._view.hide();
    },
    setChatList: function(chatList) {
      this._model.setChatList(chatList);
    },
    setCurrentTime: function(sec) {
      this._model.setCurrentTime(sec);
    },
    show: function(left) {
      this._left = left;
      this._isShow = true;
      if (this._isEnable) {
        this._view.show(left);
      }
    },
    hide: function() {
      this._isShow = false;
      this._view.hide();
    },
    setIsEnable: function(v) {
      if (v !== this._isEnable) {
        this._isEnable = v;
        if (v && this._isShow) {
          this.show(this._left);
        }
      }
    }
  });

  var SeekBarToolTip = function() { this.initialize.apply(this, arguments); };
  _.extend(SeekBarToolTip.prototype, AsyncEmitter.prototype);
  SeekBarToolTip.__css__ = (`
    .seekBarToolTip {
      position: absolute;
      display: inline-block;
      z-index: 300;
      position: absolute;
      box-sizing: border-box;
      bottom: 16px;
      left: 0;
      width: 180px;
      white-space: nowrap;
      font-size: 10px;
      background: rgba(0, 0, 0, 0.8);
      z-index: 150;
      opacity: 0;
      border: 1px solid #666;
      border-radius: 8px;
      padding: 4px 4px 10px 4px;
      transform: translate3d(0, 0, 0);
      transition: transform 0.1s steps(1, start) 0, opacity 0.2s ease 0.5s;
      pointer-events: none;
    }

    .fullScreen .seekBarToolTip {
      bottom: 10px;
    }

    .dragging                .seekBarToolTip {
      opacity: 1;
      pointer-events: none;
    }

    .seekBarContainer:hover  .seekBarToolTip {
      opacity: 1;
      pointer-events: auto;
    }

    .fullScreen .seekBarContainer:not(:hover) .seekBarToolTip {
      left: -100vw !important;
    }

    .seekBarToolTip .seekBarToolTipInner {
      font-size: 0 !important;
    }

    .seekBarToolTip .seekBarToolTipButtonContainer {
      text-align: center;
      width: 100%;
    }

    .seekBarToolTip .seekBarToolTipButtonContainer>* {
      flex: 1;
    }

    .seekBarToolTip .currentTime {
      display: inline-block;
      height: 16px;
      margin: 4px 0;
      padding: 0 8px;
      color: #ccc;
      text-align: center;
      font-size: 12px;
      line-height: 16px;
      text-shadow: 0 0 4px #fff, 0 0 8px #fc9;
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

    .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 0.5;
    }

    .enableCommentPreview .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 1;
      background: rgba(0,0,0,0.01);
    }

    .seekBarToolTip .seekBarThumbnailContainer {
      pointer-events: none;
      position: absolute;
      top: 0; left: 50%;
      transform: translate(-50%, -100%);
    }
    .seekBarContainer:not(.enableCommentPreview) .seekBarToolTip.storyboard {
      border-top: none;
      border-radius: 0 0 8px 8px;
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
          
          <div class="controlButton enableCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
            <div class="menuButtonInner">💬</div>
          </div>
          

          <div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む" data-repeat="on">
            <div class="controlButtonInner">⇨</div>
          </div>
        </div>
      </div>
    </div>
  `).trim();

  _.assign(SeekBarToolTip .prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._storyboard = params.storyboard;
      this._initializeDom(params.$container);

      //this.update = ZenzaWatch.util.createDrawCallFunc(this.update.bind(this));

      this._boundOnRepeat = this._onRepeat.bind(this);
      this._boundOnMouseUp = this._onMouseUp.bind(this);
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(SeekBarToolTip.__css__);
      var $view = this._$view = $(SeekBarToolTip.__tpl__);

      this._$currentTime = $view.find('.currentTime');

      $view
        .on('mousedown',this._onMouseDown.bind(this))
        .on('click', function(e) { e.stopPropagation(); e.preventDefault(); });

      this._seekBarThumbnail = this._storyboard.getSeekBarThumbnail({
        $container: $view.find('.seekBarThumbnailContainer')
      });
      this._seekBarThumbnail.on('visible', v => {
        $view.toggleClass('storyboard', v);
      });

      $container.append($view);
    },
    _onMouseDown: function(e) {
      e.stopPropagation();
      var $target = $(e.target).closest('.controlButton');
      var command = $target.attr('data-command');
      if (!command) { return; }

      var param   = $target.attr('data-param');
      var repeat  = $target.attr('data-repeat') === 'on';

      this.emit('command', command, param);
      if (repeat) {
        this._beginRepeat(command, param);
      }
    },
    _onMouseUp: function(e) {
      e.preventDefault();
      this._endRepeat();
    },
    _beginRepeat(command, param) {
      this._repeatCommand = command;
      this._repeatParam   = param;

      $('body').on('mouseup.zenzaSeekbarToolTip', this._boundOnMouseUp);
      this._$view.on('mouseleave mouseup', this._boundOnMouseUp);

      this._repeatTimer = window.setInterval(this._boundOnRepeat, 200);
      this._isRepeating = true;
    },
    _endRepeat: function() {
      this.isRepeating = false;
      if (this._repeatTimer) {
        window.clearInterval(this._repeatTimer);
        this._repeatTimer = null;
      }
      $('body').off('mouseup.zenzaSeekbarToolTip');
      this._$view.off('mouseleave mouseup');
    },
    _onRepeat: function() {
      if (!this._isRepeating) {
        this._endRepeat();
        return;
      }
      this.emit('command', this._repeatCommand, this._repeatParam);
    },
    update: function(sec, left) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      var timeText = [m, s].join(':');
      if (this._timeText !== timeText) {
        this._timeText = timeText;
        this._$currentTime.text(timeText);
        var w  = this._$view.outerWidth();
        var vw = this._$container.innerWidth();
        left = Math.max(0, Math.min(left - w / 2, vw - w));
        this._$view.css({
          'transform': 'translate3d(' + left + 'px, 0, 0)'
        });
      }
      this._seekBarThumbnail.setCurrentTime(sec);
    }
  });







  var NicoTextParser = function() {};
  NicoTextParser._FONT_REG = {
    // TODO: wikiにあるテーブルを正規表現に落とし込む
    // MING_LIUは昔どこかで拾ったのだけど出典がわからない
    // wikiの記述だと\u2588はstrongではないっぽいけど、そうじゃないと辻褄が合わないCAがいくつかある。
    // wikiが間違いなのか、まだ知らない法則があるのか・・・？
    //
//    GOTHIC: /[ｧ-ﾝﾞ･ﾟ]/,
    GOTHIC: /[\uFF67-\uFF9D\uFF9E\uFF65\uFF9F]/,
    MINCHO: /([\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/,
    GULIM: /([\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6])/,
    MING_LIU: /([\uEF00-\uEF1F])/,
    GR: /<group>([^\x01-\x7E^\xA0]*?([\uFF67-\uFF9D\uFF9E\uFF65\uFF9F\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6\uEF00-\uEF1F\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])[^\x01-\x7E^\xA0]*?)<\/group>/g,
    STRONG_MINCHO: /([\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\u2588])/,
    // ドット絵系によく使われる文字. 綺麗に見せるためにエフェクトを変えたい
    BLOCK: /([\u2581-\u258F\u25E2-\u25E5■]+)/g,
  };


// 画面レイアウトに影響ありそうなCSSをこっちにまとめる
  NicoTextParser.__css__ = (`
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.default {}
.gothic  {font-family: 'ＭＳ Ｐゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo'; }
.mincho  {font-family: Simsun,            Osaka-mono, "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', 'Hiragino Mincho ProN', monospace; }
.gulim   {font-family: Gulim,             Osaka-mono, "Osaka−等幅",              'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace; }
.mingLiu {font-family: PmingLiu, mingLiu, MingLiU, Osaka-mono, "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace; }
han_group { font-family: 'Arial'; }


/* 参考: https://www65.atwiki.jp/commentart2/pages/16.html */
.cmd-gothic {font-family: "游ゴシック", "Yu Gothic", 'YuGothic', "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
.cmd-mincho {font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, Osaka-mono, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;}
/*.cmd-defont {font-family: "ＭＳ Ｐゴシック", "MS PGothic", 'Yu Gothic', 'YuGothic', "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }*/
.cmd-defont {font-family: 'Yu Gothic', 'YuGothic', "ＭＳ ゴシック", "MS Gothic", "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }
/*.cmd-defont {font-family: monospace, "ＭＳ ゴシック", "MS Gothic", 'Yu Gothic', 'YuGothic', "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, Menlo; }*/

.cmd-gothic, .cmd-mincho, .cmd-defont { letter-spacing: 0; /*font-feature-settings: "tnum";*/ }

.nicoChat {
  position: absolute;
  padding: 1px;

  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: nowrap;
  font-weight: bolder;
  font-kerning: none;
}

.nicoChat.cmd-gothic, .nicoChat.cmd-mincho, .nicoChat.cmd-defont {
  padding: 0;
  margin: 1px;
}

  .nicoChat.big {
    line-height: 47.5px;
  }
    .nicoChat.big.noScale {
      line-height: 45px;
    }

  .nicoChat.medium {
    line-height: 30px;
  }
    .nicoChat.medium.noScale {
      line-height: 29px;
    }

  .nicoChat.small {
    line-height: 20px;
  }
    .nicoChat.small.noScale {
      line-height: 18px;
    }

  .nicoChat .zero_space {
  }
    .nicoChat .zen_space.type115A {
    }

  .type2001 {
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

.big    .type3000 > spacer { width: 40px; }
.medium .type3000 > spacer { width: 25px; }
.small  .type3000 > spacer { width: 16px; }

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
.medium .mesh_space { width: 25px; }
.small  .mesh_space { width: 16px; }

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
.mincho .invisible_code {
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

  `).trim();

/**
 *  たぶんこんな感じ
 *  1. 全角文字(半角スペース含まない)でグループ化
 *  2. グループ内でフォント変化文字が1つある場合はグループ全体がそのフォント
 *  3. 二つ以上ある場合は、一番目がグループ内のベースフォント、
 *     二番目以降はそのフォントにチェンジ
 *  4. 最初のグループにフォントチェンジがあった場合は、
 *     グループ全体のベースフォントがグループ1の奴になる
 *
 *  Vista以降だともうちょっと複雑らしい
 *
 *
 *  もし新規でニコニコ動画のようなシステムを作るのであれば、こんな複雑怪奇な物を実装する必要はない。
 *  ならどうしてやっているのかといえば、過去のコメントアートを再現したいからである。
 */
  NicoTextParser.likeXP = function(text) {
    var S = '<spacer> </spacer>';
    var htmlText =
      ZenzaWatch.util.escapeHtml(text)
        // 行末の半角スペース、全角スペース、タブの除去
        //.replace(/([\x20|\u3000|\t])+([\n$])/g , '$2')
        // 半角文字グループ(改行以外)
        .replace(/([\x01-\x09\x0B-\x7E\xA0]+)/g, '<han_group>$1</han_group>')
        // 全角文字の連続をグループ化 要検証: \u2003は含む？
        .replace(/([^\x01-\x7E^\xA0]+)/g, '<group>$1</group>')
        .replace(/([\u0020]+)/g, // '<span class="han_space type0020">$1</span>')

          function(g) { return '<span class="han_space type0020">'+ _.repeat(S, g.length) + '</span>'; } )
          //'<span class="han_space type0020">$1</span>')
        .replace(/([\u00A0]+)/g, //  '<span class="han_space type00A0">$1</span>')
          function(g) { return '<span class="han_space type00A0">'+ _.repeat(S, g.length) + '</span>'; } )
        .replace(/(\t+)/g ,      '<span class="tab_space">$1</span>')
        .replace(/[\t]/g ,      '^');

      var hasFontChanged = false, strongFont = 'gothic';
      // フォント変化処理  XPをベースにしたい
      // CA職人のマイメモリーでもない限りフォント変化文字にマッチすること自体がレアなので、
      // 一文字ずつ走査してもさほど問題ないはず
      htmlText =
        htmlText.replace(NicoTextParser._FONT_REG.GR, function(all, group, firstChar) {
          hasFontChanged = true;
          var baseFont = '';
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

          var tmp = [], closer = [], currentFont = baseFont;
          for (var i = 0, len = group.length; i < len; i++) {
            var c = group.charAt(i);
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

          var result = [
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
            function(g) { return '<span class="fill_space">'+
              //_.repeat('■', g.length) + '</span>';
              _.repeat('ｉ', g.length) + '</span>';
            } )
          .replace(/([\u2592])/g, '<span class="mesh_space">$1$1</span>')
        // 非推奨空白文字。 とりあえず化けて出ないように
          .replace(/([\uE800\u2002-\u200A\u007F\u05C1\u0E3A\u3164]+)/g,
            //'<span class="invisible_code">$1</span>')
            function(g) {
              var e = window.escape(g);
              return '<span class="invisible_code" data-code="' + e + '">' + g + '</span>';
            })
        // 結合文字 前の文字と同じ幅になるらしい
        // https://www.nicovideo.jp/watch/1376820446 このへんで見かけた
          .replace(/(.)[\u0655]/g ,  '$1<span class="type0655">$1</span>')
        // https://www.nicovideo.jp/watch/1236260707 で見かける謎スペース。よくわからない
          .replace(/([\u115a]+)/g ,  '<span class="zen_space type115A">$1</span>')
        // 推奨空白文字
        // なんか前後の文字によって書体(幅)が変わるらしい。 隣接セレクタでどうにかなるか？
        //  .replace(/([\u2001]+)/g ,  '<span class="zen_space type2001">$1</span>')
        // 全角スペース
          .replace(/([\u3000]+)/g , //'<span class="zen_space type3000">$1</span>')
            function(g) { return '<span class="zen_space type3000">'+ _.repeat(S, g.length) + '</span>'; } )
        // バックスラッシュ
          .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>')
        // ゼロ幅文字. ゼロ幅だけどdisplay: none; にすると狂う
          .replace(/([\u0323\u2029\u202a\u200b\u200c]+)/g ,
            '<span class="zero_space">$1</span>')
        // &emsp;
          .replace(/([\u2003]+)/g, '<span class="em_space">$1</span>')
          .replace(/[\r\n]+$/g, '')
  //        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
          .replace(/[\n]/g, '<br>')
          ;

//      if (hasFontChanged) {
//        if (htmlText.match(/^<group class="(mincho|gulim|mingLiu)"/)) {
//          var baseFont = RegExp.$1;
//          htmlText = htmlText.replace(/<group>/g, '<group class="' + baseFont + '">');
//        }
//      }
    // \u2001だけのグループ＝全角文字に隣接してない ≒ 半角に挟まれている
      htmlText = htmlText.replace(/(.)<group>([\u2001]+)<\/group>(.)/, '$1<group class="zen_space arial type2001">$2</group>$3');

      htmlText = htmlText.replace(/<group>/g, '<group class="' + strongFont + '">');



      return htmlText;
    };

  NicoTextParser.likeHTML5 = function(text) {
    var htmlText =
      ZenzaWatch.util.escapeHtml(text)
      .replace(/([\x20\xA0]+)/g, (g) => { return '<span class="html5_space">' +
          '_'.repeat(g.length) + '</span>';
      })
      .replace(/([\u2000\u2002]+)/g, (g) => { return '<span class="html5_space half">' +
          '_'.repeat(g.length) + '</span>';
      })
      .replace(/([\u3000\u2001\u2003]+)/g,
        (g) => {
          return '<span class="html5_zen_space">全</span>'.repeat(g.length);
        })
      .replace(/[\u200B-\u200F]+/g, (g) => {
          return '<span class="html5_zero_width"></span>'.repeat(g.length);
        })
      .replace(/([\t]+)/g,
        (g) => { return '<span class="html5_tab_space">'+
          '□'.repeat(g.length * 2) + '</span>';
        })
      .replace(NicoTextParser._FONT_REG.BLOCK, '<span class="html5_block_space">$1</span>')
//      .replace(/([\u2588])/g,'<span class="html5_fill_space u2588">$1</span>')
      .replace(/([\u2588]+)/g,
        (g) => { return '<span class="html5_fill_space u2588">'+
          String.fromCharCode(0x2588).repeat(g.length) + '</span>';
        })
      .replace(/[\r\n]+$/g, '')
      .replace(/[\n]/g, '<br>')
    ;

    return htmlText;
   };

ZenzaWatch.NicoTextParser = NicoTextParser;



  // 大百科より
  var SHARED_NG_LEVEL = {
    NONE: 'NONE',
    LOW:  'LOW',
    MID:  'MID',
    HIGH: 'HIGH',
    MAX:  'MAX'
  };
  var SHARED_NG_SCORE = {
    NONE: -99999,//Number.MIN_VALUE,
    LOW:  -10000,
    MID:   -5000,
    HIGH:  -1000,
    MAX:      -1
  };

  /**
   * コメント描画まわり。MVVMもどき
   *
   * Model
   *  コメントのデータ構造
   *
   * ViowModel
   *  コメントの表示位置・タイミング等を計算する担当。
   *  この実装ではあらかじめ全て計算してしまう。
   *  停止した時間の中で一生懸命ナイフを並べるDIOのような存在
   *
   * View
   *  そして時は動きだす・・・。
   *  ViewModelが算出した結果を基に実際の描画を担当する。
   *  あらかじめ全て計算済みなので、静的なHTMLを吐き出す事もできる。
   *  将来的にはChromecastのようなデバイスに描画したりすることも。
   *
   *  コメントを静的なCSS3アニメーションとして保存
   *  console.log(ZenzaWatch.debug.css3Player.toString())*
   */
  var NicoCommentPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoCommentPlayer.prototype, AsyncEmitter.prototype);

  _.assign(NicoCommentPlayer.prototype, {
    initialize: function(params) {
      this._offScreen = params.offScreenLayer;

      this._model     = new NicoComment(params);
      this._viewModel = new NicoCommentViewModel(this._model, params.offScreenLayer);
      this._view      = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel,
        playbackRate: params.playbackRate,
        show: params.showComment,
        opacity: _.isNumber(params.commentOpacity) ? params.commentOpacity : 1.0
      });

      var onCommentChange = _.throttle(this._onCommentChange.bind(this), 1000);
      this._model.on('change'      , onCommentChange);
      this._model.on('filterChange', this._onFilterChange.bind(this));
      this._model.on('parsed'      , this._onCommentParsed.bind(this));
      this._model.on('command'     , this._onCommand.bind(this));
      ZenzaWatch.emitter.on('commentLayoutChange', onCommentChange);

      ZenzaWatch.debug.nicoCommentPlayer = this;
    },
    setComment: function(xml, options) {
      var parser = new DOMParser();
      if (typeof xml.getElementsByTagName === 'function') {
        this._model.setXml(xml, options);
      } else if (typeof xml === 'string') {
        xml = parser.parseFromString(xml, 'text/xml');
        this._model.setXml(xml, options);
      } else {
        PopupMessage.alert('コメントの読み込み失敗');
      }
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    _onCommentChange: function(e) {
      console.log('onCommentChange', e);
      if (this._view) {
        ZenzaWatch.util.callAsync(function() {
          this._view.refresh();
        }, this);
      }
      this.emit('change');
    },
    _onFilterChange: function(nicoChatFilter) {
      this.emit('filterChange', nicoChatFilter);
    },
    _onCommentParsed: function() {
      this.emit('parsed');
    },
    getMymemory: function() {
      if (!this._view) {
        this._view = new NicoCommentCss3PlayerView({
          viewModel: this._viewModel
        });
      }
      return this._view.toString();
    },
    setCurrentTime: function(sec) {
      this._model.setCurrentTime(sec);
    },
    setVpos: function(vpos) {
      this._model.setCurrentTime(vpos / 100);
    },
    getCurrentTime: function() {
      return this._model.getCurrentTime();
    },
    getVpos: function() {
      return this._model.getCurrentTime() * 100;
    },
    setVisibility: function(v) {
      if (v) {
        this._view.show();
      } else {
        this._view.hide();
      }
    },
    addChat: function(text, cmd, vpos, options) {
      if (typeof vpos !== 'number') {
        vpos = this.getVpos();
      }
      var nicoChat = NicoChat.create(text, cmd, vpos, options);
      this._model.addChat(nicoChat);

      return nicoChat;
    },
    setPlaybackRate: function(playbackRate) {
      if (this._view && this._view.setPlaybackRate) {
        this._view.setPlaybackRate(playbackRate);
      }
    },
    setAspectRatio: function(ratio) {
      this._view.setAspectRatio(ratio);
    },
    appendTo: function($node) {
      this._view.appendTo($node);
    },
    show: function() {
      this._view.show();
    },
    hide: function() {
      this._view.hide();
    },
    close: function() {
      this._model.clear();
      if (this._view) { this._view.clear(); }
    },
    setSharedNgLevel: function(level) {
      this._model.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._model.getSharedNgLevel();
    },
    setIsFilterEnable: function(v) {
      this._model.setIsFilterEnable(v);
    },
    isFilterEnable: function() {
      return this._model.isFilterEnable();
    },
    addWordFilter: function(text) {
      this._model.addWordFilter(text);
    },
    setWordFilterList: function(list) {
      this._model.setWordFilterList(list);
    },
    getWordFilterList: function() {
      return this._model.getWordFilterList();
    },
    setWordRegFilter: function(list) {
      this._model.setWordRegFilter(list);
    },
    addUserIdFilter: function(text) {
      this._model.addUserIdFilter(text);
    },
    setUserIdFilterList: function(list) {
      this._model.setUserIdFilterList(list);
    },
    getUserIdFilterList: function() {
      return this._model.getUserIdFilterList();
    },
    addCommandFilter: function(text) {
      this._model.addCommandFilter(text);
    },
    setCommandFilterList: function(list) {
      this._model.setCommandFilterList(list);
    },
    getCommandFilterList: function() {
      return this._model.getCommandFilterList();
    },
    getChatList: function() {
      return this._model.getChatList();
    },
    /**
     * NGフィルタなどのかかってない全chatを返す
     */
    getNonfilteredChatList: function() {
      return this._model.getNonfilteredChatList();
    },
    toString: function() {
      return this._viewModel.toString();
    },
    getCurrentScreenHtml: function() {
      return this._view.getCurrentScreenHtml();
    }
  });




  var NicoComment = function() { this.initialize.apply(this, arguments); };
  NicoComment.MAX_COMMENT = 5000;

  _.extend(NicoComment.prototype, AsyncEmitter.prototype);
  _.assign(NicoComment.prototype, {
    initialize: function(params) {
      this._currentTime = 0;

      params.nicoChatFilter = this._nicoChatFilter = new NicoChatFilter(params);
      this._nicoChatFilter.on('change', this._onFilterChange.bind(this));
      
      this._topGroup    = new NicoChatGroup(this, NicoChat.TYPE.TOP,    params);
      this._nakaGroup   = new NicoChatGroup(this, NicoChat.TYPE.NAKA  , params);
      this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);

      this._nicoScripter = new NicoScripter();
      this._nicoScripter.on('command', (command, param) => {
        this.emit('command', command, param);
      });

      var onChange = _.debounce(this._onChange.bind(this), 100);
      this._topGroup   .on('change', onChange);
      this._nakaGroup  .on('change', onChange);
      this._bottomGroup.on('change', onChange);
      ZenzaWatch.emitter.on('updateOptionCss', onChange);
      //NicoChatViewModel.emitter.on('updateBaseChatScale', onChange);
    },
    setXml: function(xml, options) {
      window.console.time('コメントのパース処理');

      this._options = options || {};

      this._xml = xml;
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();
      const duration = this._duration =
        parseInt(options.duration || 0x7FFFFF);
      var nicoScripter = this._nicoScripter;
      var nicoChats = [];

      nicoScripter.reset();
      var chats = xml.getElementsByTagName('chat');
      var top = [], bottom = [], naka = [];
      for (var i = 0, len = Math.min(chats.length, NicoComment.MAX_COMMENT); i < len; i++) {
        var chat = chats[i];
        if (!chat.firstChild) { continue; }

        var nicoChat = new NicoChat(chat, duration);
        if (nicoChat.isDeleted()) { continue; }

        if (nicoChat.isNicoScript()) {
          nicoScripter.add(nicoChat);
        }

        nicoChats.push(nicoChat);
      }

      if (_.isObject(options.replacement) && _.size(options.replacement) > 0) {
        window.console.time('コメント置換フィルタ適用');
        this._wordReplacer = this._compileWordReplacer(options.replacement);
        this._preProcessWordReplacement(nicoChats, this._wordReplacer);
        window.console.timeEnd('コメント置換フィルタ適用');
      } else {
        this._wordReplacer = null;
      }

      if (nicoScripter.isExist) {
        window.console.time('ニコスクリプト適用');
        nicoScripter.apply(nicoChats);
        window.console.timeEnd('ニコスクリプト適用');
        const nextVideo = nicoScripter.getNextVideo();
        window.console.info('nextVideo', nextVideo);
        if (nextVideo) {
          this.emitAsync('command', 'nextVideo', nextVideo);
        }
      }

      nicoChats.forEach(nicoChat => {
        var type = nicoChat.getType();
        var group;
        switch (type) {
          case NicoChat.TYPE.TOP:
            group = top;
            break;
          case NicoChat.TYPE.BOTTOM:
            group = bottom;
            break;
          default:
            group = naka;
            break;
        }
        group.push(nicoChat);
      });

      this._topGroup   .addChatArray(top);
      this._nakaGroup  .addChatArray(naka);
      this._bottomGroup.addChatArray(bottom);

      window.console.timeEnd('コメントのパース処理');
      console.log('chats: ', chats.length);
      console.log('top: ',    this._topGroup   .getNonFilteredMembers().length);
      console.log('naka: ',   this._nakaGroup  .getNonFilteredMembers().length);
      console.log('bottom: ', this._bottomGroup.getNonFilteredMembers().length);
      this.emit('parsed');
    },

    /**
     * コメント置換器となる関数を生成
     * なにがやりたかったのやら
     */
    _compileWordReplacer(replacement) {
      var func  = function (text) { return text; };

      var makeFullReplacement = function(f, src, dest) {
        return function(text) {
          return f(text.indexOf(src) >= 0 ? dest : text);
        };
      };

      var makeRegReplacement = function(f, src, dest) {
        var reg = new RegExp(ZenzaWatch.util.escapeRegs(src), 'g');
        return function(text) {
          return f(text.replace(reg, dest));
        };
      };

      _.each(Object.keys(replacement), function(key) {
        if (!key) { return; }
        var val = replacement[key];
        window.console.log('コメント置換フィルタ: "%s" => "%s"', key, val);

        if (key.charAt(0) === '*') {
          func = makeFullReplacement(func, key.substr(1), val);
        } else {
          func = makeRegReplacement(func, key, val);
        }
      });

      return func;
    },
    /**
     * 投稿者が設定したコメント置換フィルタを適用する
     */
    _preProcessWordReplacement(group, replacementFunc) {
      group.forEach(nicoChat => {
        var text = nicoChat.getText();
        var newText = replacementFunc(text);
        if (text !== newText) {
          nicoChat.setText(newText);
        }
      });
    },
    getChatList: function() {
      return {
        top:    this._topGroup   .getMembers(),
        naka:   this._nakaGroup  .getMembers(),
        bottom: this._bottomGroup.getMembers()
      };
    },
    getNonFilteredChatList: function() {
      return {
        top:    this._topGroup   .getNonFilteredMembers(),
        naka:   this._nakaGroup  .getNonFilteredMembers(),
        bottom: this._bottomGroup.getNonFilteredMembers()
      };
    },
    addChat: function(nicoChat) {
      if (nicoChat.isDeleted()) { return; }
      var type = nicoChat.getType();
      if (this._wordReplacer) {
        nicoChat.setText(this._wordReplacer(nicoChat.getText()));
      }

      if (this._nicoScripter.isExist) {
        window.console.time('ニコスクリプト適用');
        this._nicoScripter.apply([nicoChat]);
        window.console.timeEnd('ニコスクリプト適用');
      }

      var group;
      switch (type) {
        case NicoChat.TYPE.TOP:
          group = this._topGroup;
          break;
        case NicoChat.TYPE.BOTTOM:
          group = this._bottomGroup;
          break;
        default:
          group = this._nakaGroup;
          break;
      }

      group.addChat(nicoChat, group);
      this.emit('addChat');
    },
    /**
     * コメントの内容が変化した通知
     * NG設定、フィルタ反映時など
     */
    _onChange: function(e) {
      console.log('NicoComment.onChange: ', e);
      e = e || {};
      var ev = {
        nicoComment: this,
        group: e.group,
        chat: e.chat
      };
      this.emit('change', ev);
    },
    _onFilterChange: function() {
      this.emit('filterChange', this._nicoChatFilter);
    },
    clear: function() {
      this._xml = '';
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();
      this.emit('clear');
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;

      this._topGroup   .setCurrentTime(sec);
      this._nakaGroup.setCurrentTime(sec);
      this._bottomGroup.setCurrentTime(sec);

      this._nicoScripter.currentTime = sec;

      this.emit('currentTime', sec);
    },
    seek: function(time) {
      this.setCurrentTime(time);
    },
    setVpos: function(vpos) {
      this.setCurrentTime(vpos / 100);
    },
    getGroup: function(type) {
      switch (type) {
        case NicoChat.TYPE.TOP:
          return this._topGroup;
        case NicoChat.TYPE.BOTTOM:
          return this._bottomGroup;
        default:
          return this._nakaGroup;
      }
    },
    setSharedNgLevel: function(level) {
      this._nicoChatFilter.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._nicoChatFilter.getSharedNgLevel();
    },
    setIsFilterEnable: function(v) {
      this._nicoChatFilter.setEnable(v);
    },
    isFilterEnable: function() {
      return this._nicoChatFilter.isEnable();
    },
    addWordFilter: function(text) {
      this._nicoChatFilter.addWordFilter(text);
    },
    setWordFilterList: function(list) {
      this._nicoChatFilter.setWordFilterList(list);
    },
    getWordFilterList: function() {
      return this._nicoChatFilter.getWordFilterList();
    },
    setWordRegFilter: function(list) {
      this._nicoChatFilter.setWordRegFilter(list);
    },
    addUserIdFilter: function(text) {
      this._nicoChatFilter.addUserIdFilter(text);
    },
    setUserIdFilterList: function(list) {
      this._nicoChatFilter.setUserIdFilterList(list);
    },
    getUserIdFilterList: function() {
      return this._nicoChatFilter.getUserIdFilterList();
    },
    addCommandFilter: function(text) {
      this._nicoChatFilter.addCommandFilter(text);
    },
    setCommandFilterList: function(list) {
      this._nicoChatFilter.setCommandFilterList(list);
    },
    getCommandFilterList: function() {
      return this._nicoChatFilter.getCommandFilterList();
    },
  });

  // フォントサイズ計算用の非表示レイヤーを取得
  // 変なCSSの影響を受けないように、DOM的に隔離されたiframe内で計算する。
  NicoComment.offScreenLayer = (function() {
    var __offscreen_tpl__ = (`
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
        height: 385px;
        overflow: visible;
        background: #fff;

        white-space: pre;

    "></div>
    </body></html>
      `).trim();

    var emitter = new AsyncEmitter();
    var offScreenFrame;
    var offScreenLayer;
    var textField;
    var layoutStyle;
    var optionStyle;
    var config;

    var initializeOptionCss = function(optionStyle) {
      var update = function() {
        var tmp = [];
        var baseFont = config.getValue('baseFontFamily');
        var inner = optionStyle.innerHTML;
        if (baseFont) {
          baseFont = baseFont.replace(/[;{}\*\/]/g, '');
          tmp.push(
            [
              '.gothic    {font-family: %BASEFONT%; }\n',
              'han_group {font-family: %BASEFONT%, Arial; }'
            ].join('').replace(/%BASEFONT%/g, baseFont)
          );
        }
        var bolder = config.getValue('baseFontBolder');
        if (!bolder) {
          tmp.push('.nicoChat { font-weight: normal !important; }');
        }
        var newCss = tmp.join('\n');
        if (inner !== newCss) {
          optionStyle.innerHTML = newCss;
          ZenzaWatch.emitter.emit('updateOptionCss', newCss);
        }
      };
      update();
      config.on('update-baseFontFamily', update);
      config.on('update-baseFontBolder', update);
    };

    var initialize = function($d) {
      initialize = _.noop;
      var frame = document.createElement('iframe');
      frame.className = 'offScreenLayer';
      frame.setAttribute('sandbox', 'allow-same-origin');
      document.body.appendChild(frame);
      frame.style.position = 'fixed';
      frame.style.top = '200vw';
      frame.style.left = '200vh';
      
      offScreenFrame = frame;

      var layer;
      var onload = function() {
        frame.onload = _.noop;

        console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
        createTextField();
        var getElements = function() {
          var doc = offScreenFrame.contentWindow.document;
          layer       = doc.getElementById('offScreenLayer');
          layoutStyle = doc.getElementById('layoutCss');
          optionStyle = doc.getElementById('optionCss');
        };

        var resolve = function() {
          initializeOptionCss(optionStyle);
          offScreenLayer = {
            getTextField: function() {
              return textField;
            },
            appendChild: function(elm) {
              layer.appendChild(elm);
            },
            removeChild: function(elm) {
              layer.removeChild(elm);
            },
            getOptionCss: function() {
              return optionStyle.innerHTML;
            }
          };

          emitter.emit('create', offScreenLayer);
          emitter.clear();
          $d.resolve(offScreenLayer);
        };

        getElements();
        resolve();
      };

      var html = __offscreen_tpl__
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');
      if (typeof frame.srcdoc === 'string') {
        frame.onload = onload;
        frame.srcdoc = html;
      } else {
        // MS IE/Edge用
        frame.contentWindow.document.open();
        frame.contentWindow.document.write(html);
        frame.contentWindow.document.close();
        window.setTimeout(onload, 0);
      }
    };

    var getLayer = function(_config) {
      config = _config;
      var $d = new $.Deferred();
      if (offScreenLayer) {
        $d.resolve(offScreenLayer);
        return;
      }

      initialize($d);
      return $d.promise();
    };

    var createTextField = function() {
      var layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
      if (!layer) {
        return false;
      }

      var span = document.createElement('span');
      span.className  = 'nicoChat';
      Object.assign(span.style, {
        'display': 'inline-block',
        'content': 'layout'
      });
      var scale = NicoChatViewModel.BASE_SCALE;
      NicoChatViewModel.emitter.on('updateBaseChatScale', function(v) { scale = v; });

      textField = {
        setText: function(text) {
          span.innerHTML = text;
        },
        setType: function(type, size, fontCommand) {
          span.className = 'nicoChat ' + type + ' ' + size + ' ' + fontCommand;
        },
        setFontSizePixel: function(pixel) {
          span.style.fontSize = pixel + 'px';
        },
        getOriginalWidth: function() {
          return span.offsetWidth;
        },
        getWidth: function() {
          return span.offsetWidth * scale;
        },
        getOriginalHeight: function() {
          return span.offsetHeight;
        },
        getHeight: function() {
          return span.offsetHeight * scale;
        }
      };

      layer.appendChild(span);
  
      return span;
    };

    return {
      get: getLayer,
      getOptionCss: function() { return optionStyle.innerHTML; }
    };
  })();



  var NicoCommentViewModel = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoCommentViewModel.prototype, AsyncEmitter.prototype);

  // この数字はレイアウト計算上の仮想領域の物であり、実際に表示するサイズはview依存
  NicoCommentViewModel.SCREEN = {
    WIDTH_INNER:      512,
    WIDTH_FULL_INNER: 640,
    WIDTH:      512 + 32,
    WIDTH_FULL: 640 + 32,
    HEIGHT:     384 +  1
  };

  _.assign(NicoCommentViewModel.prototype, {
    initialize: function(nicoComment, offScreen) {
      this._nicoComment = nicoComment;
      this._offScreen   = offScreen;

      this._currentTime = 0;
      this._lastUpdate = 0;

      this._topGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
      this._nakaGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA), offScreen);
      this._bottomGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

      let config = Config.namespace('commentLayer');
      if (config.getValue('enableSlotLayoutEmulation')) {
        this._slotLayoutWorker = SlotLayoutWorker.create();
      }
      if (this._slotLayoutWorker) {
        this._slotLayoutWorker.addEventListener('message',
          this._onSlotLayoutWorkerComplete.bind(this));
        this._updateSlotLayout = _.debounce(this._updateSlotLayout.bind(this), 100);
      }

      nicoComment.on('setXml',      this._onSetXml       .bind(this));
      nicoComment.on('clear',       this._onClear        .bind(this));
      nicoComment.on('change',      this._onChange       .bind(this));
      nicoComment.on('parsed',      this._onCommentParsed.bind(this));
      nicoComment.on('currentTime', this._onCurrentTime  .bind(this));
    },
    _onSetXml: function() {
      this.emit('setXml');
    },
    _onClear: function() {
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();

      this._lastUpdate = Date.now();
      this.emit('clear');
    },
    _onCurrentTime: function(sec) {
      this._currentTime = sec;
      this.emit('currentTime', this._currentTime);
    },
    _onChange: function(e) {
      this._lastUpdate = Date.now();
      this._updateSlotLayout();
      console.log('NicoCommentViewModel.onChange: ', e);
    },
    _onCommentParsed: function() {
      this._lastUpdate = Date.now();
      this._updateSlotLayout();
    },
    _updateSlotLayout: function() {
      if (!this._slotLayoutWorker) { return; }

      window.console.time('SlotLayoutWorker call');
      this._slotLayoutWorker.postMessage({
        lastUpdate: this._lastUpdate,
        top:    this._topGroup.getBulkSlotData(),
        naka:   this._nakaGroup.getBulkSlotData(),
        bottom: this._bottomGroup.getBulkSlotData()
      });
    },
    _onSlotLayoutWorkerComplete: function(e) {
      // Workerが処理してる間にスレッドが変更された。
      if (e.data.lastUpdate !== this._lastUpdate) {
        window.console.warn('slotLayoutWorker changed',
          this._lastUpdate, e.data.lastUpdate);
        return;
      }
      //window.console.log('SlotLayoutWorker result', e.data);
      this._topGroup   .setBulkSlotData(e.data.top);
      this._nakaGroup  .setBulkSlotData(e.data.naka);
      this._bottomGroup.setBulkSlotData(e.data.bottom);
      window.console.timeEnd('SlotLayoutWorker call');
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    toString: function() {
      var result = [];

      result.push(['<comment ',
        '>'
      ].join(''));

      result.push(this._nakaGroup.toString());
      result.push(this._topGroup.toString());
      result.push(this._bottomGroup.toString());

      result.push('</comment>');
      return result.join('\n');
    },
    getGroup: function(type) {
      switch (type) {
        case NicoChat.TYPE.TOP:
          return this._topGroup;
        case NicoChat.TYPE.BOTTOM:
          return this._bottomGroup;
        default:
          return this._nakaGroup;
      }
    },
    getBulkLayoutData: function() {
      return {
        top:    this._topGroup.getBulkLayoutData(),
        naka:   this._nakaGroup.getBulkLayoutData(),
        bottom: this._bottomGroup.getBulkLayoutData()
      };
    },
    setBulkLayoutData: function(data) {
      this._topGroup   .setBulkLayoutData(data.top);
      this._nakaGroup  .setBulkLayoutData(data.naka);
      this._bottomGroup.setBulkLayoutData(data.bottom);
    }
});

  var NicoChatGroup = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoChatGroup.prototype, AsyncEmitter.prototype);
  _.assign(NicoChatGroup.prototype, {
    initialize: function(nicoComment, type, params) {
      this._nicoComment = nicoComment;
      this._type = type;

      this._nicoChatFilter = params.nicoChatFilter;
      this._nicoChatFilter.on('change', this._onFilterChange.bind(this));

      this.reset();
    },
    reset: function() {
      this._members = [];
      this._filteredMembers = [];
    },
    addChatArray: function(nicoChatArray) {
      var members = this._members;
      var newMembers = [];
      _.each(nicoChatArray, function(nicoChat) {
        newMembers.push(nicoChat);
        members.push(nicoChat);
        nicoChat.setGroup(this);
      });

      newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
      if (newMembers.length > 0) {
        this._filteredMembers = this._filteredMembers.concat(newMembers);
        this.emit('addChatArray', newMembers);
      }
    },
    addChat: function(nicoChat) {
      this._members.push(nicoChat);
      nicoChat.setGroup(this);

      if (this._nicoChatFilter.isSafe(nicoChat)) {
        this._filteredMembers.push(nicoChat);
        this.emit('addChat', nicoChat);
      }
    },
    getType: function() {
      return this._type;
    },
    getMembers: function() {
      if (this._filteredMembers.length > 0) {
        return this._filteredMembers;
      }
      var members = this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
      return members;
    },
    getNonFilteredMembers: function() {
      return this._members;
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    onChange: function(e) {
      console.log('NicoChatGroup.onChange: ', e);
      this._filteredMembers = [];
      this.emit('change', {
        chat: e,
        group: this
      });
    },
    _onFilterChange: function() {
      this._filteredMembers = [];
      this.onChange(null);
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].setCurrentTime(sec);
      }
    },
    setSharedNgLevel: function(level) {
      if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
        this._sharedNgLevel = level;
        this.onChange(null, this);
      }
    }
  });

  var NicoChatGroupViewModel = function() { this.initialize.apply(this, arguments); };

  _.assign(NicoChatGroupViewModel.prototype, {
    initialize: function(nicoChatGroup, offScreen) {
      this._nicoChatGroup = nicoChatGroup;
      this._offScreen = offScreen;
      this._members = [];
      this._lastUpdate = 0;

      // メンバーをvposでソートした物. 計算効率改善用
      this._vSortedMembers = [];

      this._initWorker();

      nicoChatGroup.on('addChat',      this._onAddChat.bind(this));
      nicoChatGroup.on('addChatArray', this._onAddChatArray.bind(this));
      nicoChatGroup.on('reset',        this._onReset.bind(this));
      nicoChatGroup.on('change',       this._onChange.bind(this));
      NicoChatViewModel.emitter.on('updateBaseChatScale', this._onChange.bind(this));

      this.addChatArray(nicoChatGroup.getMembers());
    },
    _initWorker: function() {
      if (this._layoutWorker) {
        this._layoutWorker.removeEventListener('message', this._boundOnCommentLayoutWorkerComplete);
      }
      this._layoutWorker = CommentLayoutWorker.getInstance();

      this._boundOnCommentLayoutWorkerComplete =
        this._boundOnCommentLayoutWorkerComplete || this._onCommentLayoutWorkerComplete.bind(this);

      if (this._layoutWorker) {
        this._layoutWorker.addEventListener('message', this._boundOnCommentLayoutWorkerComplete);
      }
    },
    _onAddChatArray: function(nicoChatArray) {
      this.addChatArray(nicoChatArray);
    },
    _onAddChat: function(nicoChat) {
      this.addChat(nicoChat);
    },
    _onReset: function() {
      this.reset();
    },
    _onChange: function(e) {
      console.log('NicoChatGroupViewModel.onChange: ', e);
      window.console.time('_onChange');
      this.reset();
      this.addChatArray(this._nicoChatGroup.getMembers());
      window.console.timeEnd('_onChange');
    },
    _onCommentLayoutWorkerComplete: function(e) {
      //window.console.info('_onCommentLayoutWorkerComplete', e.data.type, e.data.result);
      // 自分用のデータじゃない
      if (e.data.requestId !== this._workerRequestId) {
        return;
      }
      // Workerが処理してる間にスレッドが変更された。
      if (e.data.lastUpdate !== this._lastUpdate) {
        window.console.warn('group changed', this._lastUpdate, e.data.lastUpdate);
        return;
      }
      this.setBulkLayoutData(e.data.result);
    },
    _execCommentLayoutWorker: function() {
      if (this._members.length < 1) { return; }
      var type = this._members[0].getType();
      this._workerRequestId = type + ':' + Math.random();

      console.log('request worker: ', type);
      this._layoutWorker.postMessage({
        type: type,
        members: this.getBulkLayoutData(),
        lastUpdate: this._lastUpdate,
        requestId: this._workerRequestId
      });
    },
    addChatArray: function(nicoChatArray) {
      for (var i = 0, len = nicoChatArray.length; i < len; i++) {
        var nicoChat = nicoChatArray[i];
        var nc = new NicoChatViewModel(nicoChat, this._offScreen);
        this._members.push(nc);
      }

      if (this._members.length < 1) { return; }

      this._lastUpdate = Date.now();

      if (this._layoutWorker) {
        this._execCommentLayoutWorker();
      } else {
        this._groupCollision();
      }
    },
    _groupCollision: function() {
      this._createVSortedMembers();
      var members = this._vSortedMembers;
      for (var i = 0, len = members.length; i < len; i++) {
        var o = members[i];
        this.checkCollision(o);
        o.setIsLayouted(true);
      }
    },
    addChat: function(nicoChat) {
      var timeKey = 'addChat:' + nicoChat.getText();
      window.console.time(timeKey);
      var nc = new NicoChatViewModel(nicoChat, this._offScreen);

      this._lastUpdate = Date.now();

      // 内部処理効率化の都合上、
      // 自身を追加する前に判定を行っておくこと
      this.checkCollision(nc);
      nc.setIsLayouted(true);

      this._members.push(nc);

      if (this._layoutWorker) {
        this._execCommentLayoutWorker();
      } else {
        this._createVSortedMembers();
      }
      window.console.timeEnd(timeKey);
    },
    reset: function() {
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].reset();
      }

      this._members = [];
      this._vSortedMembers = [];
      this._lastUpdate = Date.now();
    },
    getCurrentTime: function() {
      return this._nicoChatGroup.getCurrentTime();
    },
    getType: function() {
      return this._nicoChatGroup.getType();
    },
    checkCollision: function(target) {
      if (target.isInvisible()) { return; }

      var m = this._vSortedMembers;//this._members;
      var o;
      var beginLeft = target.getBeginLeftTiming();
      for (var i = 0, len = m.length; i < len; i++) {
        o = m[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o === target) { return; }

        if (beginLeft > o.getEndRightTiming())  { continue; }


        if (o.checkCollision(target)) {
          target.moveToNextLine(o);

          // ずらした後は再度全チェックするのを忘れずに(再帰)
          if (!target.isOverflow()) {
            this.checkCollision(target);
            return;
          }
        }
      }
    },
    getBulkLayoutData: function() {
      this._createVSortedMembers();
      var m = this._vSortedMembers;
      var result = [];
      for (var i = 0, len = m.length; i < len; i++) {
        result.push(m[i].getBulkLayoutData());
      }
      return result;
    },
    setBulkLayoutData: function(data) {
      var m = this._vSortedMembers;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].setBulkLayoutData(data[i]);
      }
    },
    getBulkSlotData: function() {
      this._createVSortedMembers();
      var m = this._vSortedMembers;
      var result = [];
      for (var i = 0, len = m.length; i < len; i++) {
        var o = m[i];
        result.push({
          id: o.getId(),
          slot: o.getSlot(),
          fork: o.getFork(),
          no: o.getNo(),
          vpos: o.getVpos(),
          begin: o.getInviewTiming(),
          end: o.getEndRightTiming(),
          invisible: o.isInvisible()
        });
      }
      return result;
    },
    setBulkSlotData: function(data) {
      var m = this._vSortedMembers;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].setSlot(data[i].slot);
      }
    },
    /**
     * vposでソートされたメンバーを生成. 計算効率改善用
     */
    _createVSortedMembers: function() {
      this._vSortedMembers = this._members.concat().sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) {
          return av - bv;
        } else {
          return a.getNo() < b.getNo() ? -1 : 1;
        }
      });
      return this._vSortedMembers;
    },

    getMembers: function() {
      return this._members;
    },

    /**
     * 現時点で表示状態のメンバーのみを返す
     */
    getInViewMembers: function() {
      return this.getInViewMembersBySecond(this.getCurrentTime());
    },

    /**
     * secの時点で表示状態のメンバーのみを返す
     */
    getInViewMembersBySecond: function(sec) {
      // TODO: もっと効率化
      //var maxDuration = NicoChatViewModel.DURATION.NAKA;

      var result = [], m = this._vSortedMembers, len = m.length;
      for (var i = 0; i < len; i++) {
        var chat = m[i]; //, s = m.getBeginLeftTiming();
        //if (sec - s > maxDuration) { break; }
        if (chat.isInViewBySecond(sec)) {
          result.push(chat);
        }
      }
      //console.log('inViewMembers.length: ', result.length, sec);
      return result;
    },
    getInViewMembersByVpos: function(vpos) {
      if (!this._hasLayout) { this._layout(); }
      return this.getInViewMembersBySecond(vpos / 100);
    },
    toString: function() {
      var result = [], m = this._members, len = m.length;

      result.push(['\t<group ',
        'type="',   this._nicoChatGroup.getType(), '" ',
        'length="', m.length, '" ',
        '>'
      ].join(''));

      for (var i = 0; i < len; i++) {
        result.push(m[i].toString());
      }

      result.push('\t</group>');
      return result.join('\n');
    }
  });




  /**
   * コメントの最小単位
   *
   */
  var NicoChat = function() { this.initialize.apply(this, arguments); };
  NicoChat.create = function(text, cmd, vpos, options) {
    var dom = document.createElement('chat');
    dom.appendChild(document.createTextNode(text));

    dom.setAttribute('mail', cmd || '');
    dom.setAttribute('vpos', vpos);
    _.each(Object.keys(options), (v) => {
      dom.setAttribute(v, options[v]);
    });
    //console.log('NicoChat.create', dom);
    return new NicoChat(dom);
  };

  NicoChat.id = 1000000;

  NicoChat.SIZE = {
    BIG:    'big',
    MEDIUM: 'medium',
    SMALL:  'small'
  };
  NicoChat.TYPE = {
    TOP:    'ue',
    NAKA:   'naka',
    BOTTOM: 'shita'
  };

  NicoChat._CMD_DURATION = /(@|＠)([0-9\.]+)/;
  NicoChat._CMD_REPLACE = /(ue|shita|sita|big|small|ender|full|[ ])/g;
  NicoChat._COLOR_MATCH = /(#[0-9a-f]+)/i;
  NicoChat._COLOR_NAME_MATCH = /([a-z]+)/i;
  NicoChat.COLORS = {
    'red'    : '#FF0000',
    'pink'   : '#FF8080',
    'orange' : '#FFC000',
    'yellow' : '#FFFF00',
    'green'  : '#00FF00',
    'cyan'   : '#00FFFF',
    'blue'   : '#0000FF',
    'purple' : '#C000FF',
    'black'  : '#000000',

    'white2'         : '#CCCC99',
    'niconicowhite'  : '#CCCC99',
    'red2'           : '#CC0033',
    'truered'        : '#CC0033',
    'pink2'          : '#FF33CC',
    'orange2'        : '#FF6600',
    'passionorange'  : '#FF6600',
    'yellow2'        : '#999900',
    'madyellow'      : '#999900',
    'green2'         : '#00CC66',
    'elementalgreen' : '#00CC66',
    'cyan2'          : '#00CCCC',
    'blue2'          : '#3399FF',
    'marineblue'     : '#3399FF',
    'purple2'        : '#6633CC',
    'nobleviolet'    : '#6633CC',
    'black2'         : '#666666'
  };

  _.assign(NicoChat.prototype, {
    reset: function() {
      this._text = '';
      this._date = '000000000';
      this._cmd =  '';
      this._isPremium = false;
      this._userId = '';
      this._vpos = 0;
      this._deleted = '';
      this._color = '#FFF';
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NAKA  ;
      this._isMine = false;
      this._score = 0;
      this._no = 0;
      this._fork = 0;
      this._isInvisible = false;
      this._isReverse = false;
      this._isPatissier = false;
      this._fontCommand = '';
      this._commentVer  = '';

      this._currentTime = 0;
      this._hasDurationSet = false;
    },
    initialize: function(chat, videoDuration = 0x7FFFFF) {
      this._id = 'chat' + NicoChat.id++;
      this._currentTime = 0;

      var text = this._text = chat.firstChild.nodeValue;
      var attr = chat.attributes;
      if (!attr) { this.reset(); return; }

      this._date = parseInt(chat.getAttribute('date'), 10) || Math.floor(Date.now() / 1000);
      //if (this._date >= 1483196400) { // 2017/01/01
      //  this._commentVer = 'html5';
      //} else {
      //  this._commentVer = 'flash';
      //}
      this._cmd = chat.getAttribute('mail') || '';
      this._isPremium = (chat.getAttribute('premium') === '1');
      this._userId = chat.getAttribute('user_id');
      this._vpos = parseInt(chat.getAttribute('vpos'));
      this._deleted = chat.getAttribute('deleted') === '1';
      this._color = null;
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NAKA  ;
      this._duration = NicoChatViewModel.DURATION.NAKA;
      this._isMine = chat.getAttribute('mine') === '1';
      this._isUpdating = chat.getAttribute('updating') === '1';
      this._score = parseInt(chat.getAttribute('score') || '0', 10);
      this._fork = parseInt(chat.getAttribute('fork') || '0', 10);
      this._leaf = parseInt(chat.getAttribute('leaf') || '-1', 10);
      // fork * 100000000を足してるのは苦し紛れの措置. いつか直す (本当に？)
      this._no =
        parseInt(chat.getAttribute('no') || '0', 10) + this._fork * 100000000;
      if (this._fork > 0 && text.match(/^[\/＠@]/)) {
        this._isNicoScript = true;
        this._isInvisible = true;
      }

      if (this._deleted) { return; }

      var cmd = this._cmd;
      if (cmd.length > 0) {
        var pcmd = this._parseCmd(cmd, this._fork > 0);

        if (pcmd.COLOR) {
          this._color = pcmd.COLOR;
          this._hasColorCommand = true;
        }

        // TODO: 両方指定されてたらどっちが優先されるのかを検証
        if (pcmd.big) {
          this._size = NicoChat.SIZE.BIG;
          this._hasSizeCommand = true;
        } else if (pcmd.small) {
          this._size = NicoChat.SIZE.SMALL;
          this._hasSizeCommand = true;
        }

        if (pcmd.ue) {
          this._type = NicoChat.TYPE.TOP;
          this._duration = NicoChatViewModel.DURATION.TOP;
          this._hasTypeCommand = true;
        } else if (pcmd.shita) {
          this._type = NicoChat.TYPE.BOTTOM;
          this._duration = NicoChatViewModel.DURATION.BOTTOM;
          this._hasTypeCommand = true;
        }

        if (pcmd.ender) {
          this._isEnder = true;
        }
        if (pcmd.full) {
          this._isFull = true;
        }
        if (pcmd.pattisier) {
          this._isPatissier = true;
        }

        if (pcmd.duration) {
          this._hasDurationSet = true;
          this._duration = Math.max(0.01, parseFloat(pcmd.duration, 10));
        }

        if (pcmd.mincho) {
          this._fontCommand = 'mincho';
          this._commentVer = 'html5';
        } else if (pcmd.gothic) {
          this._fontCommand = 'gothic';
          this._commentVer = 'html5';
        } else if (pcmd.defont) {
          this._fontCommand = 'defont';
          this._commentVer = 'html5';
        }

      }

      //if (this._type !== NicoChat.TYPE.NAKA) {
      //  this._duration = Math.max(0.1, this._duration - 0.1);
      //}

      // durationを超える位置にあるコメントを詰める vposはセンチ秒なので気をつけ
      const maxv =
        this._isNicoScript ?
        Math.min(this._vpos, videoDuration * 100) :
        Math.min(this._vpos, (1 + videoDuration - this._duration) * 100);
      const minv = Math.max(maxv, 0);
      this._vpos = minv;
    },
    _parseCmd: function(cmd, isFork) {
      var tmp = cmd.toLowerCase().split(/[\x20|\u3000|\t|\u2003]+/);
      var result = {};
      tmp.forEach(c => {
        if (NicoChat.COLORS[c]) {
          result.COLOR = NicoChat.COLORS[c];
        } else if (NicoChat._COLOR_MATCH.test(c)) {
          result.COLOR = c;
        } else if (isFork && NicoChat._CMD_DURATION.test(c)) {
          result.duration = RegExp.$2;
        } else {
          result[c] = true;
        }
      });
      return result;
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    setGroup: function(group) {
      this._group = group;
    },
    onChange: function() {
      if (this._group) {
        console.log('NicoChat.onChange: ', this, this._group);
        this._group.onChange({
          chat: this
        });
      }
    },
    setIsUpdating: function(v) {
      if (this._isUpdating !== v) {
        this._isUpdating = !!v;
        if (!v) { this.onChange(); }
      }
    },
    setIsPostFail: function(v) {
      this._isPostFail = v;
    },
    isPostFail: function() {
      return !!this._isPostFail;
    },
    getId: function() { return this._id; },
    getText: function() { return this._text; },
    setText: function(v) { this._text = v; },
    getDate: function() { return this._date; },
    getCmd: function() { return this._cmd; },
    isPremium: function() { return !!this._isPremium; },
    isEnder: function() { return !!this._isEnder; },
    isFull: function() { return !!this._isFull; },
    isMine: function() { return !!this._isMine; },
    isUpdating: function() { return !!this._isUpdating; },
    isInvisible: function() { return this._isInvisible; },
    isNicoScript: function() { return this._isNicoScript; },
    isPatissier: function() { return this._isPatissier; },
    hasColorCommand: function() { return !!this._hasColorCommand; },
    hasSizeCommand: function()  { return !!this._hasSizeCommand; },
    hasTypeCommand: function()  { return !!this._hasTypeCommand; },
    getDuration: function() { return this._duration; },
    hasDurationSet: function() { return !!this._hasDurationSet; },
    setDuration: function(v) { this._duration = v; this._hasDurationSet = true; },
    getUserId: function() { return this._userId; },
    getVpos: function() { return this._vpos; },
    getBeginTime: function() { return this.getVpos() / 100; },
    isDeleted: function() { return !!this._deleted; },
    getColor: function() { return this._color; },
    setColor: function(v) { this._color = v; },
    getSize: function() { return this._size; },
    setSize: function(v) { this._size = v; },
    getType: function() { return this._type; },
    setType: function(v) { this._type = v; },
    getScore: function() { return this._score; },
    getNo: function() { return this._no; },
    getLeaf: function() { return this._leaf; },
    getFork: function() { return this._fork; },
    isReverse: function() { return this._isReverse; },
    setIsReverse: function(v) { this._isReverse = !!v; },
    getFontCommand: function() { return this._fontCommand; },
    getCommentVer: function() { return this._commentVer; }
  });


  /**
   * 個別のコメントの表示位置・タイミング計算
   * コメントアート互換は大体こいつにかかっている
   *
   * コメントのサイズ計算まわりが意味不明なコードだらけだが、
   * 仕様書にもない本家のバグを再現しようとするとこうなるので仕方ない。
   * (しかも、これでも全然足りない)
   * 互換性にこだわらないのであれば7割くらいが不要。
   */
  var NicoChatViewModel = function() { this.initialize.apply(this, arguments); };
  NicoChatViewModel.emitter = new AsyncEmitter();

  // ここの値はレイアウト計算上の仮想領域の物であり、実際の表示はviewに依存
  NicoChatViewModel.DURATION = {
    TOP:    3 - 0.1,
    NAKA:   4,
    BOTTOM: 3 - 0.1
  };

  NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
  NicoChatViewModel.FONT_SIZE_PIXEL = {
    BIG:    39 + 0,
    MEDIUM: 24 + 0,
    SMALL:  15 + 0
  };
  NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 = {
    BIG:    40.1,
    MEDIUM: 27.8,
    SMALL:  18.8
  };

  NicoChatViewModel.LINE_HEIGHT = {
    BIG:    45,
    MEDIUM: 29,
    SMALL:  18
  };

  NicoChatViewModel.CHAT_MARGIN = 5;

  NicoChatViewModel.BASE_SCALE = parseFloat(Config.getValue('baseChatScale'), 10);
  Config.on('update-baseChatScale', function(scale) {
    if (isNaN(scale)) { return; }
    scale = parseFloat(scale, 10);
    NicoChatViewModel.BASE_SCALE = scale;
    NicoChatViewModel.emitter.emit('updateBaseChatScale', scale);
  });
  
  _.assign(NicoChatViewModel.prototype, {
    initialize: function(nicoChat, offScreen) {
      this._nicoChat = nicoChat;
      this._offScreen = offScreen;
      this._trace = [];

      // 画面からはみ出したかどうか(段幕時)
      this._isOverflow = false;
      // 表示時間
      this._duration = nicoChat.getDuration(); //NicoChatViewModel.DURATION.NAKA;

      // 固定されたコメントか、流れるコメントか
      this._isFixed = false;

      this._scale = NicoChatViewModel.BASE_SCALE;
      this._y = 0;
      this._slot = -1;

      this._setType(nicoChat.getType());

      // ここでbeginLeftTiming, endRightTimingが確定する
      this._setVpos(nicoChat.getVpos());

      this._setSize(nicoChat.getSize(), nicoChat.getCommentVer());


      this._isLayouted = false;

      // 文字を設定
      // この時点で字幕の大きさが確定するので、
      // Z座標・beginRightTiming, endLeftTimingまでが確定する
      this._setText(nicoChat.getText());

      if (this._isFixed) {
        this._setupFixedMode();
      } else {
        this._setupMarqueeMode();
      }

      const commentVer = this.getCommentVer();
      const overflowMargin = commentVer === 'html5' ? 0 : 8;
      if (this._height > NicoCommentViewModel.SCREEN.HEIGHT + overflowMargin) {
        this._isOverflow = true;
        if (commentVer !== 'html5') {
      // この時点で画面の縦幅を超えるようなコメントは縦幅に縮小しつつoverflow扱いにしてしまう
      // こんなことをしなくてもおそらく本家ではぴったり合うのだろうし苦し紛れだが、
      // 画面からはみ出すよりはマシだろうという判断
          this._y = 0;
          this._setScale(this._scale * NicoCommentViewModel.SCREEN.HEIGHT / this._height);
        } else {
          switch (this._type) {
            case NicoChat.TYPE.TOP:
              this._y = 0;
              break;
            case NicoChat.TYPE.BOTTOM:
              this._y = NicoCommentViewModel.SCREEN.HEIGHT - this._height * this._scale;
              break;
            default:
              this._y = (NicoCommentViewModel.SCREEN.HEIGHT - this._height * this._scale) / 2;
              break;
          }
        }
      }

      if (this._isOverflow || nicoChat.isInvisible()) {
        this.checkCollision = function() { return false; };
      }
    },
    _setType: function(type) {
      this._type = type;
      switch (type) {
        case NicoChat.TYPE.TOP:
      //    this._duration = NicoChatViewModel.DURATION.TOP;
          this._isFixed = true;
          break;
        case NicoChat.TYPE.BOTTOM:
      //    this._duration = NicoChatViewModel.DURATION.BOTTOM;
          this._isFixed = true;
          break;
      }
    },
    _setVpos: function(vpos) {
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
    },
    _setSize: function(size, ver) {
      this._size = size;
      switch (size) {
        case NicoChat.SIZE.BIG:
          this._fontSizePixel = ver !== 'html5' ?
            NicoChatViewModel.FONT_SIZE_PIXEL.BIG :
            NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5.BIG;
          break;
        case NicoChat.SIZE.SMALL:
          this._fontSizePixel = ver !== 'html5' ?
            NicoChatViewModel.FONT_SIZE_PIXEL.SMALL :
            NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5.SMALL;
          break;
        default:
          this._fontSizePixel = ver !== 'html5' ?
            NicoChatViewModel.FONT_SIZE_PIXEL.MEDIUM :
            NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5.MEDIUM;
          break;
      }
    },
    // 実験中...
    _setText: function(text) {

      const fontCommand = this.getFontCommand();
      const commentVer  = this.getCommentVer();
      let htmlText =
        commentVer === 'html5' ?
          NicoTextParser.likeHTML5(text) :
          NicoTextParser.likeXP(text);

      this._htmlText = htmlText;
      this._text = text;

      let field = this._offScreen.getTextField();
      field.setText(htmlText);
      field.setFontSizePixel(this._fontSizePixel);
      field.setType(this._type, this._size, fontCommand);
      
      this._originalWidth  = field.getOriginalWidth();
      this._width          = this._originalWidth * this._scale;
      this._originalHeight = field.getOriginalHeight();
      this._height         = this._calculateHeight();

      // Chrome59で起こる謎の現象。一度ローカル変数に落とすと直る
      // w を使わずにspwを計算するとNaNになる。謎
      let w = this._width;
      let speed;
      if (!this._isFixed) { // 流れるコメント (naka)
        speed =
          this._speed = (w + NicoCommentViewModel.SCREEN.WIDTH) / this._duration;
        let spw = w / speed;
        this._endLeftTiming    = this._endRightTiming  - spw;
        this._beginRightTiming = this._beginLeftTiming + spw;
      } else { // ue shita などの固定コメント
        this._speed = 0;
        this._endLeftTiming    = this._endRightTiming;
        this._beginRightTiming = this._beginLeftTiming;
      }

      //if (isNaN(this._beginRightTiming)) { debugger; } // Chrome59の謎解明用
    },
    /**
     * 高さ計算。 リサイズ後が怪しいというか多分間違ってる。
     */
    _calculateHeight: function() {
      // ブラウザから取得したouterHeightを使うより、職人の実測値のほうが信頼できる
      // http://tokeiyadiary.blog48.fc2.com/blog-entry-90.html
      // https://www37.atwiki.jp/commentart/pages/43.html#id_a759b2c2
      var lc = this._htmlText.split('<br>').length;
      //if (this._nicoChat.getNo() === 427) { window.nnn = this._nicoChat; debugger; }

      var margin     = NicoChatViewModel.CHAT_MARGIN;
      var lineHeight = NicoChatViewModel.LINE_HEIGHT.MEDIUM; // 29
      var size       = this._size;
      switch (size) {
        case NicoChat.SIZE.BIG:
          lineHeight = NicoChatViewModel.LINE_HEIGHT.BIG;    // 45
          break;
        default:
          break;
        case NicoChat.SIZE.SMALL:
          lineHeight = NicoChatViewModel.LINE_HEIGHT.SMALL;  // 18
          break;
      }

      if (this._scale === 0.5) {
        switch (size) {
          case NicoChat.SIZE.BIG: // 16行 = (24 * 16 + 3) = 387
            lineHeight = 24;
            margin     = 3;
            //return (24 * lc + 3);
            break;
          default:
            lineHeight = 15;
            margin     = 3;
            //return (15 * lc + 3);
            break;
          case NicoChat.SIZE.SMALL:
            lineHeight = 10;
            margin     = 3;
            //return (10 * lc + 3);
            break;
        }
      } else if (this._scale !== 1.0) {
        if (this.getCommentVer() === 'html5') {
          margin = 0;
          return this._originalHeight * this._scale + margin;
        } else {
          /**
           *  上の実測に合うようなCSSを書ければ色々解決する。今後の課題
           */
          //  45 -> 24   39 + 6
          //  29 -> 15   24 + 5
          //  18 -> 10   15 + 3
          lineHeight = Math.floor((lineHeight + Math.ceil(lineHeight / 15)) * this._scale);
          margin     = Math.round(margin * this._scale);
          //margin = 5;
          //switch (size) {
          //  case NicoChat.SIZE.BIG:   lineHeight = 48; break;
          //  default:                  lineHeight = 30; break;
          //  case NicoChat.SIZE.SMALL: lineHeight = 20; break;
          //}
          //this._lineHeight = lineHeight;
          //return Math.ceil((lineHeight * lc + margin) * this._scale) - 1;
        }
      }

      this._lineHeight = lineHeight;
      return lineHeight * lc + margin;
    },

    /**
     *  位置固定モードにする(ueかshita)
     */
    _setupFixedMode: function() {
      var isScaled = false;
      var nicoChat = this._nicoChat;
      var screenWidth =
        nicoChat.isFull() ?
          NicoCommentViewModel.SCREEN.WIDTH_FULL_INNER :
          NicoCommentViewModel.SCREEN.WIDTH_INNER;
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      var isEnder = nicoChat.isEnder();
      //メモ
      //█　　　　　　　　　　　　　　　　　　　　　　　　　　　█
      // メモ
      // "        "

      var originalScale = this._scale;
      // 改行リサイズ
      // 参考: https://ch.nicovideo.jp/meg_nakagami/blomaga/ar217381
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (!isEnder && this._height > screenHeight / 3) {
        this._setScale(this._scale * 0.5);
        isScaled = true;
      }
      
      // TODO: この判定は改行リサイズより前？後？を検証
      var isOverflowWidth = this._width > screenWidth;

      // 臨界幅リサイズ
      // 画面幅よりデカい場合の調整
      if (isOverflowWidth) {
        if (isScaled && !isEnder) {
          // なんかこれバグってね？と思った方は正しい。
          // 元々は本家のバグなのだが、いまさら修正出来ない。
          // なので、コメント描画の再現としては正しい…らしい。
          //
          // そのバグを発動しなくするためのコマンドがender
          this._setScale(originalScale * (screenWidth / this._width));
        } else {
          this._setScale(this._scale   * (screenWidth / this._width));
        }
      }

      // BOTTOMの時だけy座標を画面の下端に合わせる
      // 内部的には0 originで表示の際に下から詰むだけでもいいような気がしてきた。
      if (this._type === NicoChat.TYPE.BOTTOM) {
        //var margin = 1; //NicoChatViewModel.CHAT_MARGIN;
        //var outerHeight = this._height + margin;
        this._y = screenHeight - this._height;
      }

    },

    /**
     *  流れる文字のモード
     */
    _setupMarqueeMode: function() {
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (!this._nicoChat.isEnder() && this._height > screenHeight / 3) {
        this._setScale(this._scale * 0.5);
        var speed =
          this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / this._duration;
        this._endLeftTiming    = this._endRightTiming  - this._width / speed;
        this._beginRightTiming = this._beginLeftTiming + this._width / speed;
      }
    },

    _setScale: function(scale) {
      this._scale = scale;
      this._width = (this._originalWidth * scale);
      this._height = this._calculateHeight(); // 再計算
    },


    /**
     * コメント同士の衝突を判定
     *
     * @param {NicoChatViewModel} o
     * @return boolean
     */
    checkCollision: function(target) {
      // 一度はみ出した文字は当たり判定を持たない
      if (this.isOverflow() || target.isOverflow() || target.isInvisible()) { return false; }

      if (this.getFork() !== target.getFork()) { return false; }

      // Y座標が合わないなら絶対衝突しない
      var targetY = target.getYpos();
      var selfY   = this.getYpos();
      if (targetY + target.getHeight() < selfY ||
          targetY > selfY + this.getHeight()) {
        return false;
      }

      // ターゲットと自分、どっちが右でどっちが左か？の判定
      var rt, lt;
      if (this.getBeginLeftTiming() <= target.getBeginLeftTiming()) {
        lt = this;
        rt = target;
      } else {
        lt = target;
        rt = this;
      }

      if (this._isFixed) {

        // 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
        // > か >= で挙動が変わるCAがあったりして正解がわからない
        if (lt.getEndRightTiming() > rt.getBeginLeftTiming()) {
          return true;
        }

      } else {

        // 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
        if (lt.getBeginRightTiming() >= rt.getBeginLeftTiming()) {
          return true;
        }

        // 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
        if (lt.getEndRightTiming() >= rt.getEndLeftTiming()) {
          return true;
        }

      }

      return false;
    },

    getBulkLayoutData: function() {
      return {
        id:          this.getId(),
        fork:        this.getFork(),
        type:        this.getType(),
        isOverflow:  this.isOverflow(),
        isInvisible: this.isInvisible(),
        isFixed:     this._isFixed,
        ypos:        this.getYpos(),
        slot:        this.getSlot(),
        height:      this.getHeight(),
        beginLeft:   this.getBeginLeftTiming(),
        beginRight:  this.getBeginRightTiming(),
        endLeft:     this.getEndLeftTiming(),
        endRight:    this.getEndRightTiming()
      };
    },
    setBulkLayoutData: function(data) {
      this._isOverflow = data.isOverflow;
      this._y = data.ypos;
      this._isLayouted = true;
    },

    /**
     * (衝突判定に引っかかったので)自分自身を一段ずらす.
     *
     * @param NicoChatViewModel others 示談相手
     */
    moveToNextLine: function(others) {
      var margin = 1; //NicoChatViewModel.CHAT_MARGIN;
      var othersHeight = others.getHeight() + margin;
      // 本来はちょっとでもオーバーしたらランダムすべきだが、
      // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
      // コメントアートの再現という点では有効な妥協案
      var overflowMargin = 10;
      var rnd =  Math.max(0, NicoCommentViewModel.SCREEN.HEIGHT - this._height);
      var yMax = NicoCommentViewModel.SCREEN.HEIGHT - this._height + overflowMargin;
      var yMin = 0 - overflowMargin;

      var type = this._nicoChat.getType();
      var y = this._y;

      if (type !== NicoChat.TYPE.BOTTOM) {
        y += othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (y > yMax) {
          this._isOverflow = true;
        }
      } else {
        y -= othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (y < yMin) {
          this._isOverflow = true;
        }
      }

      this._y = this._isOverflow ? Math.floor(Math.random() * rnd) : y;
    },

    reset: function() {
    },

    getId: function() {
      return this._nicoChat.getId();
    },
    getText: function() {
      return this._text;
    },
    getHtmlText: function() {
      return this._htmlText;
    },
    setIsLayouted: function(v) {
      this._isLayouted = v;
    },
    isInView: function() {
      return this.isInViewBySecond(this.getCurrentTime());
    },
    isInViewBySecond: function(sec) {
      if (!this._isLayouted || sec + 1 /* margin */ < this._beginLeftTiming) { return false; }
      if (sec > this._endRightTiming ) { return false; }
      //if (!this.isNicoScript() && this.isInvisible()) { return false; }
      if (this.isInvisible()) { return false; }
      return true;
    },
    isOverflow: function() {
      return this._isOverflow;
    },
    isInvisible: function() {
      return this._nicoChat.isInvisible();
    },
    getWidth: function() {
      return this._width;
    },
    getHeight: function() {
      return this._height;
    },
    getDuration: function() {
      return this._duration;
    },
    getSpeed: function() {
      return this._speed;
    },
    getInviewTiming: function() {
      return this._beginLeftTiming;
    },
    // 左端が見えるようになるタイミング(4:3規準)
    getBeginLeftTiming: function() {
      return this._beginLeftTiming;
    },
    // 右端が見えるようになるタイミング(4:3規準)
    getBeginRightTiming: function() {
      return this._beginRightTiming;
    },
    // 左端が見えなくなるタイミング(4:3規準)
    getEndLeftTiming: function() {
      return this._endLeftTiming;
    },
    // 右端が見えなくなるタイミング(4:3規準)
    getEndRightTiming: function() {
      return this._endRightTiming;
    },
    getVpos: function() {
      return this._nicoChat.getVpos();
    },
    getXpos: function() {
      return this.getXposBySecond(this.getCurrentTime());
    },
    getYpos: function() {
      return this._y;
    },
    getSlot: function() {
      return this._slot;
    },
    setSlot: function(v) {
      this._slot = v;
    },
    getColor: function() {
      return this._nicoChat.getColor();
    },
    getSize: function() {
      return this._nicoChat.getSize();
    },
    getType: function() {
      return this._nicoChat.getType();
    },
    getScale: function() {
      return this._scale;
    },
    getFontSizePixel: function() {
      return this._fontSizePixel;
    },
    getLineHeight: function() {
      return this._lineHeight;
    },
    getNo: function() { return this._nicoChat.getNo(); },
    getFork: function() { return this._nicoChat.getFork(); },
    /**
     * second時の左端座標を返す
     */
    getXposBySecond: function(sec) {
      if (this._isFixed) {
        return (NicoCommentViewModel.SCREEN.WIDTH - this._width) / 2;
      } else {
        var diff = sec - this._beginLeftTiming;
        return NicoCommentViewModel.SCREEN.WIDTH + diff * this._speed;
      }
    },
    getXposByVpos: function(vpos) {
      return this.getXposBySecond(vpos / 100);
    },
    getCurrentTime: function() {
      return this._nicoChat.getCurrentTime();
    },
    isFull: function() {
      return this._nicoChat.isFull();
    },
    isNicoScript: function() { return this._nicoChat.isNicoScript(); },
    isMine: function()     { return this._nicoChat.isMine(); },
    isUpdating: function() { return this._nicoChat.isUpdating(); },
    isPostFail: function() { return this._nicoChat.isPostFail(); },
    isReverse: function() { return this._nicoChat.isReverse(); },
    getFontCommand: function() { return this._nicoChat.getFontCommand(); },
    getCommentVer: function() { return this._nicoChat.getCommentVer(); },
    toString: function() { // debug用
      // コンソールから
      // ZenzaWatch.debug.getInViewElements()
      // 叩いた時にmeta中に出る奴
      var chat = JSON.stringify({
        width:    this.getWidth(),
        height:   this.getHeight(),
        scale:    this.getScale(),
        fontSize: this.getFontSizePixel(),
        vpos:     this.getVpos(),
        xpos:     this.getXpos(),
        ypos:     this.getYpos(),
        slot:     this.getSlot(),
        type:     this.getType(),
        begin:    this.getBeginLeftTiming(),
        end:      this.getEndRightTiming(),
        speed:    this.getSpeed(),
        color:    this.getColor(),
        size:     this.getSize(),
        duration: this.getDuration(),
        inView:   this.isInView(),

        ender:    this._nicoChat.isEnder(),
        full:     this._nicoChat.isFull(),
        no:       this._nicoChat.getNo(),
        score:    this._nicoChat.getScore(),
        userId:   this._nicoChat.getUserId(),
        date:     this._nicoChat.getDate(),
        deleted:  this._nicoChat.isDeleted(),
        cmd:      this._nicoChat.getCmd(),
        fork:     this._nicoChat.getFork(),
        ver:      this._nicoChat.getCommentVer(),
        text:     this.getText()
      });
      return chat;
    }
  });


//==================================================
//==================================================
//==================================================
  /**
   * ニコニコ動画のコメントをCSS3アニメーションだけで再現出来るよ
   * という一発ネタのつもりだったのだが意外とポテンシャルが高かった。
   *
   * DOM的に隔離されたiframeの領域内で描画する
   */
  var NicoCommentCss3PlayerView = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoCommentCss3PlayerView.prototype, AsyncEmitter.prototype);

  NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;

  NicoCommentCss3PlayerView.__TPL__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">

body.in-capture .commentLayerOuter {
  overflow: hidden;
  width: 682px;
  height: 384px;
  padding: 0 69px;
}
body.in-capture .commentLayer {
  transform: none !important;
}

.saved body {
  pointer-events: auto;
}

.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }

@keyframes fixed {
   0% {opacity: 1;}
  95% {opacity: 1;}
 100% {opacity: 0.5;}
}

@keyframes showhide {
   0% { display: block;}
  99% { display: block;}
 100% { display: none; }
}

@keyframes dokaben {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(90deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(0deg);
  }
  90% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 0) perspective(200px) rotateX(90deg);
  }
}

.commentLayerOuter {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 672px;
  padding: 0 64px;
  height: 385px;
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
  height: 385px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  content: layout;
}

.debug .commentLayer {
  outline: 1px dotted #800;
}

.nicoChat {
  line-height: 1.235;
  opacity: 0;
  text-shadow: 1px 1px 0px #000;
  transform-origin: 0% 0%;
  animation-timing-function: linear;
  will-change: transform, opacity;
  color: #fff;
}

.shadow-type2 .nicoChat {
  text-shadow:
     1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px -1px 0px rgba(0, 0, 0, 0.5),
     1px -1px 0px rgba(0, 0, 0, 0.5);
}

.shadow-type3 .nicoChat {
  text-shadow:
     1px  1px 1px rgba(  0,   0,   0, 0.8),
     0px  0px 2px rgba(  0,   0,   0, 0.8),
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
    1px  1px 0px rgba(150, 50, 0, 1),
   -1px  1px 0px rgba(150, 50, 0, 1),
   -1px -1px 0px rgba(150, 50, 0, 1),
    1px -1px 0px rgba(150, 50, 0, 1) !important;
  transform-origin: center bottom;
  animation-timing-function: steps(10);
  perspective-origin: center bottom;
}
/* redコメントを推奨カラーに */
/*
.shadow-dokaben .nicoChat.ue[data-meta*="#FF0000"],
.shadow-dokaben .nicoChat.shita[data-meta*="#FF0000"] {
  color: rgb(200, 80, 0) !important;
}
*/

.shadow-dokaben .nicoChat.ue *,
.shadow-dokaben .nicoChat.shita * {
  font-family: 'dokaben_ver2_1' !important;
}
.shadow-dokaben .nicoChat {
  text-shadow:
     1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px -1px 0px rgba(0, 0, 0, 0.5),
     1px -1px 0px rgba(0, 0, 0, 0.5);
}


.nicoChat.ue,
.nicoChat.shita {
  animation-name: fixed;
}

.nicoChat.black {
  text-shadow: -1px -1px 0 #888, 1px  1px 0 #888;
}

.nicoChat.overflow {
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
  /*outline: 2px solid;
  outline-offset: -1px;*/
  /*box-shadow: 0 4px, 0 -4px;*/
}

.nicoChat .mesh_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
}

.nicoChat .block_space, .nicoChat .html5_block_space {
  text-shadow: none;
  /*-webkit-text-stroke: 5px;
  text-stroke: 5px;
  font-weight: 900;*/
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

.nicoChat.updating {
  border: 1px dotted;
}

.nicoChat.fork1 {
  text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
  -webkit-text-stroke: none;
}
.nicoChat.ue.fork1,
.nicoChat.shita.fork1 {
  display: inline-block;
  text-shadow: 0 0 3px #080 !important;
  -webkit-text-stroke: none;
}

.nicoChat.fork2 {
  outline: dotted 1px #000088;
}

.nicoChat.blink {
  border: 1px solid #f00;
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
  color: #ff9;
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
  color: #ff9;
  font-size: 80%;
  opacity: 0.8;
  color: #ccc;
}

.debug .nicoChat {
  border: 1px outset;
}

spacer {
  visibility: hidden;
}
.debug spacer {
  visibility: visible;
  outline: 3px dotted orange;
}

.is-stalled .nicoChat,
.paused  .nicoChat {
  animation-play-state: paused !important;
}

</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body style="background-color: transparent !important;background: transparent !important;">
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>

  `).trim();

  _.assign(NicoCommentCss3PlayerView.prototype, {
    initialize: function(params) {
      this._viewModel = params.viewModel;

      this._viewModel.on('setXml', _.bind(this._onSetXml, this));
      this._viewModel.on('currentTime', _.bind(this._onCurrentTime, this));

      this._lastCurrentTime = 0;
      this._isShow = true;

      this._aspectRatio = 9 / 16;

      this._inViewTable = {};
      this._inSlotTable = {};
      this._playbackRate = params.playbackRate || 1.0;

      this._isStalled = undefined;
      this._isPaused  = undefined;

      this._retryGetIframeCount = 0;

      console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

      this._initializeView(params, 0);

      this._config = Config.namespace('commentLayer');

      var _refresh = this.refresh.bind(this);
      // Firefoxでフルスクリーン切り替えするとコメントの描画が止まる問題の暫定対処
      // ここに書いてるのは手抜き
      if (ZenzaWatch.util.isFirefox()) {
        ZenzaWatch.emitter.on('fullScreenStatusChange',
          _.debounce(_refresh, 3000)
        );
      }


      // ウィンドウが非表示の時にブラウザが描画をサボっているので、
      // 表示になったタイミングで粛正する
      //$(window).on('focus', _refresh);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          _refresh();
        }
      });
      ZenzaWatch.debug.css3Player = this;

    },
    _initializeView: function(params, retryCount) {
      if (retryCount === 0) {
        window.console.time('initialize NicoCommentCss3PlayerView');
      }
      this._style = null;
      this._commentLayer = null;
      this._view = null;
      let iframe = this._getIframe();
      iframe.setAttribute('sandbox', 'allow-same-origin');

      iframe.className = 'commentLayerFrame';

      let html =
        NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '')
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');


      const onload = () => {
        let win, doc;
        iframe.onload = null;
        try {
          win = iframe.contentWindow;
          doc = iframe.contentWindow.document;
        } catch (e) {
          window.console.error(e);
          window.console.log('変な広告に乗っ取られました');
          iframe.remove();
          this._view = null;
          ZenzaWatch.debug.commentLayer = null;
          if (retryCount < 3) {
            this._initializeView(params, retryCount + 1);
          } else {
            PopupMessage.alert('コメントレイヤーの生成に失敗');
          }
          return;
        }

        this._window = win;
        this._document = doc;
        this._layoutStyle = doc.getElementById('layoutCss');
        this._optionStyle = doc.getElementById('optionCss');
        this._style       = doc.getElementById('nicoChatAnimationDefinition');
        const commentLayer  = this._commentLayer = doc.getElementById('commentLayer');

        // Config直接参照してるのは手抜き
        doc.body.className = Config.getValue('debug') ? 'debug' : '';
        Config.on('update-debug', (val) => {
          doc.body.className = val ? 'debug' : '';
        });
        // 手抜きその2
        this._optionStyle.innerHTML = NicoComment.offScreenLayer.getOptionCss();
        ZenzaWatch.emitter.on('updateOptionCss', (newCss) => {
          this._optionStyle.innerHTML = newCss;
        });

        ZenzaWatch.debug.getInViewElements = () => {
          return doc.getElementsByClassName('nicoChat');
        };

        const onResize = () => {
          const w = win.innerWidth, h = win.innerHeight;
          // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
          const aspectRatio = Math.max(this._aspectRatio, 9 / 16);
          const targetHeight = Math.min(h, w * aspectRatio);
          //commentLayer.style.transform = 'scale3d(' + targetHeight / 385 + ', 1, 1)';
          const scale = targetHeight / 385;
          commentLayer.style.transform =
            'scale3d(' + scale + ',' + scale + ', 1)';
        };

        const chkSizeInit = () => {
          const h = win.innerHeight;
          if (!h) {
            window.setTimeout(chkSizeInit, 500);
          } else {
            util.watchResize(iframe.parentElement, _.throttle(onResize, 100));
            this._onResize = onResize;
            onResize();
          }
        };
        ZenzaWatch.emitter.on('fullScreenStatusChange', _.debounce(onResize, 2000));
        document.addEventListener('visibilitychange', _.debounce(() => {
          if (!document.hidden) {
            onResize();
          }
        }, 500));
        window.setTimeout(chkSizeInit, 100);

        if (this._isPaused) {
          this.pause();
        }

        const updateTextShadow = (type) => {
          const types = [ 'shadow-type2', 'shadow-type3', 'shadow-stroke', 'shadow-dokaben' ];
          types.forEach(t => { doc.body.classList.toggle(t, t === type); });
        };
        updateTextShadow(this._config.getValue('textShadowType'));
        this._config.on('update-textShadowType', _.debounce(updateTextShadow, 100));

        ZenzaWatch.debug.nicoVideoCapture = () => {
          const html = this.getCurrentScreenHtml();
          const video = document.querySelector('video.nico');

          return VideoCaptureUtil.nicoVideoToCanvas({video, html})
            .then(({canvas, img}) => {
              canvas.style.border = '2px solid blue';
              canvas.className = 'debugCapture';
              canvas.addEventListener('click', () => {
                VideoCaptureUtil.saveToFile(canvas, 'sample.png');
              });
              document.body.appendChild(canvas);
              window.console.log('ok', canvas);
              return Promise.resolve({canvas, img});
            }, (err) => {
              sessionStorage.lastCaptureErrorSrc = html;
              window.console.error('!', err);
              return Promise.reject(err);
            });
        };

        ZenzaWatch.debug.svgTest = () => {
          const svg = this.getCurrentScreenSvg();
          const blob = new Blob([svg], { 'type': 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.setAttribute('download', 'test.svg');
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
          a.setAttribute('href', url);
          document.body.appendChild(a);
          a.click();
          window.setTimeout(() => { a.remove(); }, 1000);
        };

        window.console.timeEnd('initialize NicoCommentCss3PlayerView');
      };

      this._view = iframe;
      if (this._$node) {
        this._$node.append(iframe);
      }

      if (iframe.srcdocType === 'string') {
        iframe.onload = onload;
        iframe.srcdoc = html;
      } else {
        // MS IE/Edge用
        if (!this._$node) {
          this._msEdge = true;
          // ここに直接書いてるのは掟破り。 動かないよりはマシということで・・・
          $('.zenzaPlayerContainer').append(iframe);
        }
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
        window.setTimeout(onload, 0);
      }

      ZenzaWatch.debug.commentLayer = iframe;
      if (!params.show) { this.hide(); }
    },
    _getIframe: function() {
      var reserved = document.getElementsByClassName('reservedFrame');
      var iframe;
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
        // 行儀の悪い広告にiframeを乗っ取られた？
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
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    // リサイズイベントを発動させる
    _adjust: function() {
      if (!this._view) {
        return;
      }
      if (typeof this._onResize === 'function') {
        return this._onResize();
      }
      var $view = $(this._view);
      $view.css({ width: $view.outerWidth() + 1, height: $view.outerHeight() + 1 }).offset();
      window.setTimeout(function() {
        $view.css({width: '', height: ''});
      }, 0);
    },
    getView: function() {
      return this._view;
    },
    setPlaybackRate: function(playbackRate) {
      this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
      this.refresh();
    },
    setAspectRatio: function(ratio) {
      this._aspectRatio = ratio;
      this._adjust();
    },
    _onSetXml: function() {
      this.clear();
    },
    _onCurrentTime: function(sec) {
      var REFRESH_THRESHOLD = 1;
      this._lastCurrentTime = this._currentTime;
      this._currentTime = sec;

      if (this._lastCurrentTime === this._currentTime) {
        // pauseでもないのにcurrentTimeの更新が途絶えたらロードが詰まった扱い
        if (!this._isPaused) {
          this._setStall(true);
        }
      } else
      if (this._currentTime < this._lastCurrentTime ||
        Math.abs(this._currentTime - this._lastCurrentTime) > REFRESH_THRESHOLD) {
        // 後方へのシーク、または 境界値以上の前方シーク時は全体を再描画
        this.refresh();
      } else {
        this._setStall(false);
        this._updateInviewElements();
      }
    },
    _addClass: function(name) {
      if (!this._commentLayer) { return; }
      var cn = this._commentLayer.className.split(/ +/);
      if (_.indexOf(cn, name) >= 0) { return; }

      cn.push(name);
      this._commentLayer.className = cn.join(' ');
    },
    _removeClass: function(name) {
      if (!this._commentLayer) { return; }
      var cn = this._commentLayer.className.split(/ +/);
      if (_.indexOf(cn, name) < 0) { return; }

      _.pull(cn, name);
      this._commentLayer.className = cn.join(' ');
    },
    _setStall: function(v) {
      if (this._commentLayer) {
        if (v) { this._addClass('is-stalled'); }
        else   { this._removeClass('is-stalled'); }
      }
      this._isStalled = v;
    },
    pause: function() {
      if (this._commentLayer) {
        this._addClass('paused');
      }
      this._isPaused = true;
    },
    play: function() {
      if (this._commentLayer) {
        this._removeClass('paused');
      }
      this._isPaused = false;
    },
    clear: function() {
      if (this._commentLayer) {
        this._commentLayer.innerHTML = '';
      }
      if (this._style) {
        this._style.innerHTML = '';
      }

      this._inViewTable = {};
      this._inSlotTable = {};
    },
    refresh: function() {
      this.clear();
      this._updateInviewElements();
    },
    _updateInviewElements: function() {
      if (!this._commentLayer || !this._style || !this._isShow || document.hidden) { return; }

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NAKA  ),
        this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
        this._viewModel.getGroup(NicoChat.TYPE.TOP)
      ];

      var css = [], inView = [], dom = [];
      var i, len;
      // 表示状態にあるchatを集める
      for(i = 0, len = groups.length; i < len; i++) {
        var group = groups[i];
        inView = inView.concat(group.getInViewMembers());
      }

      var nicoChat;
      var ct = this._currentTime;
      var newView = [];
      for (i = 0, len = inView.length; i < len; i++) {
        nicoChat = inView[i];
        var domId = nicoChat.getId();
        if (this._inViewTable[domId]) {
          continue;
        }
        this._inViewTable[domId] = nicoChat;
        this._inSlotTable[domId] = nicoChat;
        newView.push(nicoChat);
      }

      if (newView.length > 1) {
        newView.sort(function(a, b) {
          var av = a.getVpos(), bv = b.getVpos();
          if (av !== bv) { return av - bv; }
          else { return a.getNo() < b.getNo() ? -1 : 1; }
        });
      }

      for (i = 0, len = newView.length; i < len; i++) {
        nicoChat = newView[i];
        var type = nicoChat.getType();
        var size = nicoChat.getSize();
        dom.push(this._buildChatDom(nicoChat, type, size));
        css.push(this._buildChatCss(nicoChat, type, ct));
      }

      // DOMへの追加
      if (css.length > 0) {
        var inSlotTable = this._inSlotTable, currentTime = this._currentTime;
        var outViewIds = [];
        var margin = 1;
        Object.keys(inSlotTable).forEach(key => {
          var chat = inSlotTable[key];
          if (currentTime - margin < chat.getEndRightTiming()) { return; }
          delete inSlotTable[key];
          outViewIds.push(key);
        });
        this._updateDom(dom, css, outViewIds);
      }
    },
    _updateDom: function(dom, css, outViewIds) {
      var fragment = document.createDocumentFragment();
      while (dom.length > 0) { fragment.appendChild(dom.shift()); }
      this._commentLayer.appendChild(fragment);
      this._style.innerHTML += css.join('');
      this._removeOutviewElements(outViewIds);
      this._gcInviewElements();
    },
    /*
     * アニメーションが終わっているはずの要素を除去
     */
    _removeOutviewElements: function(outViewIds) {
      var doc = this._document;
      if (!doc) { return; }
      outViewIds.forEach(id => {
        var elm = doc.getElementById(id);
        if (!elm) { return; }
        elm.remove();
      });
    },
    /*
     * 古い順に要素を除去していく
     */
    _gcInviewElements: function(outViewIds) {
      if (!this._commentLayer || !this._style) { return; }

      var max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;

      var commentLayer = this._commentLayer;
      var i, inViewElements;
      //inViewElements = commentLayer.getElementsByClassName('nicoChat');
      inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork0'));
      for (i = inViewElements.length - max - 1; i >= 0; i--) {
        inViewElements[i].remove();
      }
      inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork1'));
      for (i = inViewElements.length - max - 1; i >= 0; i--) {
        inViewElements[i].remove();
      }
    },

    buildHtml: function(currentTime) {
      currentTime = currentTime || this._viewModel.getCurrentTime();
      window.console.time('buildHtml');

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NAKA),
        this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
        this._viewModel.getGroup(NicoChat.TYPE.TOP)
      ];

      var members = [];
      for(var i = 0; i < groups.length; i++) {
        var group = groups[i];
        members = members.concat(group.getMembers());
      }

      members.sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) { return av - bv; }
        else { return a.getNo() < b.getNo() ? -1 : 1; }
      });

      var css = [], html = [];
      html.push(this._buildGroupHtml(members, currentTime));
      css .push(this._buildGroupCss(members, currentTime));

      var tpl = NicoCommentCss3PlayerView.__TPL__
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', NicoComment.offScreenLayer.getOptionCss());

      tpl = tpl.replace('%CSS%', css.join(''));
      tpl = tpl.replace('%MSG%', html.join(''));

      window.console.timeEnd('buildHtml');
      return tpl;
    },
    _buildGroupHtml: function(m) {
      var result = [];

      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
        var type = chat.getType();
        result.push(this._buildChatHtml(chat, type /*, currentTime */));
      }
      return result.join('\n');
    },
    _buildGroupCss: function(m, currentTime) {
      var result = [];

      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
        var type = chat.getType();
        result.push(this._buildChatCss(chat, type, currentTime));
      }
      return result.join('\n');
    },
    _buildChatDom: function(chat , type, size) {
      var span = document.createElement('span');
      var className = ['nicoChat',type, size];
      var scale = chat.getScale();
      if (chat.getColor() === '#000000') {
        className.push('black');
      }

      // 泥臭い
      if (scale === 0.5) {
        className.push('half');
      } else if (scale === 1.0) {
        className.push('noScale');
      } else if (scale > 1.0) {
        className.push('largeScale');
      }

      if (chat.isOverflow()) {
        className.push('overflow');
      }
      if (chat.isMine()) {
        className.push('mine');
      }
      if (chat.isUpdating()) {
        className.push('updating');
      }
      var fork = chat.getFork();
      className.push('fork' + fork);


      if (chat.isPostFail()) {
        className.push('fail');
      }

      const fontCommand = chat.getFontCommand();
      if (fontCommand) {
        className.push('cmd-' + fontCommand);
      }

      //className.push('ver-' + chat.getCommentVer());

      span.className = className.join(' ');
      span.id = chat.getId();
      if (!chat.isInvisible()) { span.innerHTML = chat.getHtmlText(); }
      span.setAttribute('data-meta', chat.toString());
      return span;
    },
    _buildChatHtml: function(chat , type /*, currentTime */) {
      var size = chat.getSize();
      var className = ['nicoChat', type, size];
      var scale = chat.getScale();
      if (chat.getColor() === '#000000') {
        className.push('black');
      }

      if (scale === 0.5) {
        className.push('half');
      } else if (scale === 1.0) {
        className.push('noScale');
      } if (scale > 1.0) {
        className.push('largeScale');
      }

       if (chat.isOverflow()) {
        className.push('overflow');
      }
      if (chat.isMine()) {
        className.push('mine');
      }
      if (chat.isUpdating()) {
        className.push('updating');
      }
      var fork = chat.getFork();
      className.push('fork' + fork);

      const fontCommand = chat.getFontCommand();
      if (fontCommand) {
        className.push('cmd-' + fontCommand);
      }

      //className.push('ver-' + chat.getCommentVer());

      var htmlText = '';
      if (!chat.isInvisible()) { htmlText = chat.getHtmlText(); }
      var result =
        `<span id="${chat.getId()}" class="${className.join(' ')}">${htmlText}</span>`;
      return result;
    },
    _buildChatCss: function(chat, type, currentTime) {
      let result;
      let scaleCss;
      let id = chat.getId();
      let playbackRate = this._playbackRate;
      let duration = chat.getDuration() / playbackRate;
      let scale = chat.getScale();
      let beginL = chat.getBeginLeftTiming();
      let screenWidth     = NicoCommentViewModel.SCREEN.WIDTH;
      let screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
      let screenHeight    = NicoCommentViewModel.SCREEN.HEIGHT;
      let width = chat.getWidth();
      let height = chat.getHeight();
      let ypos = chat.getYpos();
      let color = chat.getColor();
      let colorCss = color ? `color: ${color};` : '';
      let fontSizePx = chat.getFontSizePixel();
      let speed = chat.getSpeed();
      let delay = (beginL - currentTime) / playbackRate;
      let slot = chat.getSlot();
      let zIndex =
        (slot >= 0) ?
        (slot   * 1000 + chat.getFork() * 1000000 + 1) :
        (beginL * 1000 + chat.getFork() * 1000000);
      let commentVer = chat.getCommentVer();

      if (type === NicoChat.TYPE.NAKA) {
        // 4:3ベースに計算されたタイミングを16:9に補正する
        // scale無指定だとChromeでフォントがぼけるので1.0の時も指定だけする
        // TODO: 環境によって重くなるようだったらオプションにする
        scaleCss =
          (scale === 1.0) ? 'scale3d(1, 1, 1)' : `scale3d(${scale}, ${scale}, 1)`;
        const outerScreenWidth = screenWidthFull * 1.1;
        const screenDiff = outerScreenWidth - screenWidth;
        const leftPos = screenWidth + screenDiff / 2;
        const durationDiff = screenDiff / speed / playbackRate;
        duration += durationDiff;
        delay -= (durationDiff * 0.5);
        // 逆再生
        const reverse = chat.isReverse() ? 'animation-direction: reverse;' : '';

        result = `
@keyframes idou${id} {
  0%   { opacity: 1; transform: translate3d(0, 0, 0) ${scaleCss}; }
  100% { opacity: 1; transform: translate3d(-${outerScreenWidth + width}px, 0, 0) ${scaleCss}; }
}

#${id} {
   z-index: ${zIndex};
   top: ${ypos}px;
   left: ${leftPos}px;
   ${colorCss}
   font-size: ${fontSizePx}px;
   animation-name: idou${id};
   animation-duration: ${duration}s;
   animation-delay: ${delay}s;
   ${reverse}
}
`;

        if (commentVer === 'html5' && height >= screenHeight) {
          result += `
@keyframes idou${id}n {
  0%   {
    opacity: 1;
    transform:
      translate3d(0, 0, 0) ${scaleCss} translate(0, -50%);
  }
  100% {
    opacity: 1;
    transform:
      translate3d(-${outerScreenWidth + width}px, 0, 0) ${scaleCss} translate(0, -50%);
  }
}

#${id} { top: 50%; animation-name: idou${id}n; }
`;
        }

      } else {
        let top;
        let transY;
        if (commentVer === 'html5' && height >= screenHeight) {
          top    = `${type === NicoChat.TYPE.BOTTOM ?  100 : 0}%`;
          transY = `${type === NicoChat.TYPE.BOTTOM ? -100 : 0}%`;
        } else {
          top = ypos + 'px';
          transY = '0';
        }
        scaleCss =
          scale === 1.0 ?
            `transform: scale3d(1, 1, 1) translate3d(-50%, ${transY}, 0);` :
            `transform: scale3d(${scale}, ${scale}, 1) translate3d(-50%, ${transY}, 0);`;

        result = `
#${id} {
   z-index: ${zIndex};
   top: ${top};
   left: 50%;
   ${colorCss}
   font-size: ${fontSizePx}px;
   ${scaleCss}
   animation-duration: ${duration / 0.95}s;
   animation-delay: ${delay}s;
}

@keyframes dokaben${id} {
  0% {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale3d(${scale}, ${scale}, 1);
  }
  50% {
    transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg)  scale3d(${scale}, ${scale}, 1);
  }
  90% {
    transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg)  scale3d(${scale}, ${scale}, 1);
  }
  100% {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale3d(${scale}, ${scale}, 1);
  }
}

.shadow-dokaben #${id} {
  animation-name: dokaben${id} !important;
}
`;

            /*line-height: ${//lineHeight}px;*/
            /*width:', ${//width}, 'px;*/
            /*height:', ${//height}, 'px;*/
      }
      return '\n'+ result.trim() + '\n';
    },
    show: function() {
      if (!this._isShow) {
        this._isShow = true;
        this.refresh();
      }
      console.log('show!');
    },
    hide: function() {
      this.clear();
      this._isShow = false;
    },
    appendTo: function($node) {
      if (this._msEdge) { return; } // MS IE/Edge...
      //var $view = $(this._view);
      //$view.css({width: 1}).offset();
      this._$node = $node;
      $node.append(this._view);
    },
    /**
     * toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
     * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
     * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
     */
    toString: function() {
      return this.buildHtml(0)
        .replace('<html', '<html class="saved"');
    },

    getCurrentScreenHtml: function() {
      const win = this._window;
      if (!win) { return null; }
      this.refresh();
      let body = win.document.body;
      body.classList.add('in-capture');
      let html = win.document.querySelector('html').outerHTML;
      body.classList.remove('in-capture');
      html = html
        .replace('<html ', '<html xmlns="https://www.w3.org/1999/xhtml" ')
        .replace(/<meta.*?>/g, '')
        .replace(/data-meta=".*?"/g, '')
//        .replace(/<(\/?)(span|group)/g, '<$1text')
//        .replace(/<(\/?)(div|body)/g, '<$1g')
        .replace(/<br>/g, '<br/>');
      return html;
    },

    getCurrentScreenSvg: function() {
      const win = this._window;
      if (!win) { return null; }

      this.refresh();
      let body = win.document.body;
      body.classList.add('in-capture');
      let style = win.document.querySelector('style').innerHTML;
        /*<?xml version="1.0" standalone="no"?>
        <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"
          "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">*/
/*(`<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${w}"
  height="${h}"
  viewbox="0 0 ${w} ${h}"
  version="1.1">
`);*/

      const w = 682, h = 382;
      const head =
(`<svg
  xmlns="https://www.w3.org/2000/svg"
  version="1.1">
`);
      const defs = (`
<defs>
  <style type="text/css" id="layoutCss"><![CDATA[
    ${style}

    .nicoChat {
      animation-play-state: paused !important;
    }
  ]]>
  </style>
</defs>
`).trim();

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

  });



  //if (!_.trim) { _.trim = function(str) { return str.trim(); }; }

  var NicoChatFilter = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoChatFilter.prototype, AsyncEmitter.prototype);
  _.assign(NicoChatFilter.prototype, {
    initialize: function(params) {

      this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;

      this._wordFilterList    = [];
      this._userIdFilterList  = [];
      this._commandFilterList = [];
      this.setWordFilterList   (params.wordFilter    || '');
      this.setUserIdFilterList (params.userIdFilter  || '');
      this.setCommandFilterList(params.commandFilter || '');

      this._enable = typeof params.enableFilter === 'boolean' ? params.enableFilter : true;

      this._wordReg     = null;
      this._wordRegReg  = null;
      this._userIdReg   = null;
      this._commandReg  = null;

      this._onChange = _.debounce(_.bind(this._onChange, this), 50);

      if (params.wordRegFilter) {
        this.setWordRegFilter(params.wordRegFilter, params.wordRegFilterFlags);
      }
    },
    setEnable: function(v) {
      v = !!v;
      if (this._enable !== v) {
        this._enable = v;
        this._onChange();
      }
    },
    isEnable: function() {
      return this._enable;
    },
    addWordFilter: function(text) {
      var before = this._wordFilterList.join('\n');
      this._wordFilterList.push((text || '').trim());
      this._wordFilterList = _.uniq(this._wordFilterList);
      if (!ZenzaWatch.util.isPremium()) { this._wordFilterList.splice(20); }
      var after = this._wordFilterList.join('\n');
      if (before !== after) {
        this._wordReg = null;
        this._onChange();
      }
    },
    setWordFilterList: function(list) {
      list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

      var before = this._wordFilterList.join('\n');
      var tmp = [];
      _.each(list, function(text) { tmp.push((text || '').trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._wordReg = null;
        this._wordFilterList = tmp;
        if (!ZenzaWatch.util.isPremium()) { this._wordFilterList.splice(20); }
        this._onChange();
      }
    },
    getWordFilterList: function() {
      return this._wordFilterList;
    },
    setWordRegFilter: function(source, flags) {
      if (this._wordRegReg) {
        if (this._wordRegReg.source === source && this._flags === flags) { return; }
      }
      try {
        this._wordRegReg = new RegExp(source, flags);
      } catch(e) {
        window.console.error(e);
        return;
      }
      this._onChange();
    },
    addUserIdFilter: function(text) {
      var before = this._userIdFilterList.join('\n');
      this._userIdFilterList.push(text);
      this._userIdFilterList = _.uniq(this._userIdFilterList);
      if (!ZenzaWatch.util.isPremium()) { this._userIdFilterList.splice(10); }
      var after = this._userIdFilterList.join('\n');
      if (before !== after) {
        this._userIdReg = null;
        this._onChange();
      }
    },
    setUserIdFilterList: function(list) {
      list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

      var before = this._userIdFilterList.join('\n');
      var tmp = [];
      _.each(list, function(text) { tmp.push((text || '').trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._userIdReg = null;
        this._userIdFilterList = tmp;
        if (!ZenzaWatch.util.isPremium()) { this._userIdFilterList.splice(10); }
        this._onChange();
      }
    },
    getUserIdFilterList: function() {
      return this._userIdFilterList;
    },

    addCommandFilter: function(text) {
      var before = this._commandFilterList.join('\n');
      this._commandFilterList.push(text);
      this._commandFilterList = _.uniq(this._commandFilterList);
      if (!ZenzaWatch.util.isPremium()) { this._commandFilterList.splice(10); }
      var after = this._commandFilterList.join('\n');
      if (before !== after) {
        this._commandReg = null;
        this._onChange();
      }
    },
    setCommandFilterList: function(list) {
      list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

      var before = this._commandFilterList.join('\n');
      var tmp = [];
      _.each(list, function(text) { tmp.push((text || '').trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._commandReg = null;
        this._commandFilterList = tmp;
        if (!ZenzaWatch.util.isPremium()) { this._commandFilterList.splice(10); }
        this._onChange();
      }
    },
    getCommandFilterList: function() {
      return this._commandFilterList;
    },

    setSharedNgLevel: function(level) {
      if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
        this._sharedNgLevel = level;
        this._onChange();
      }
    },
    getSharedNgLevel: function() {
      return this._sharedNgLevel;
    },
    getFilterFunc: function() {
      if (!this._enable) {
        return function() { return true; };
      }
      var threthold = SHARED_NG_SCORE[this._sharedNgLevel];

      // NG設定の数×コメント数だけループを回すのはアホらしいので、
      // 連結した一個の正規表現を生成する
      if (!this._wordReg) {
        this._wordReg = this._buildFilterReg(this._wordFilterList);
      }
      if (!this._userIdReg) {
        this._userIdReg = this._buildFilterPerfectMatchinghReg(this._userIdFilterList);
      }
      if (!this._commandReg) {
        this._commandReg = this._buildFilterReg(this._commandFilterList);
      }
      var wordReg    = this._wordReg;
      var wordRegReg = this._wordRegReg;
      var userIdReg  = this._userIdReg;
      var commandReg = this._commandReg;

      if (Config.getValue('debug')) {
        return function(nicoChat) {
          if (nicoChat.getFork() > 0) { return true; }
          var score = nicoChat.getScore();
          if (score <= threthold) {
            window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
              score,
              threthold,
              nicoChat.getType(),
              nicoChat.getVpos() / 100,
              nicoChat.getText()
            );
            return false;
          }

          if (wordReg && wordReg.test(nicoChat.getText())) {
            window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
              RegExp.$1,
              nicoChat.getType(),
              nicoChat.getVpos() / 100,
              nicoChat.getText()
            );
            return false;
          }

          if (wordRegReg && wordRegReg.test(nicoChat.getText())) {
            window.console.log(
              '%cNGワード(正規表現): "%s" %s %s秒 %s',
              'background: yellow;',
              RegExp.$1,
              nicoChat.getType(),
              nicoChat.getVpos() / 100,
              nicoChat.getText()
            );
            return false;
          }

          if (userIdReg && userIdReg.test(nicoChat.getUserId())) {
            window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
              RegExp.$1,
              nicoChat.getType(),
              nicoChat.getVpos() / 100,
              nicoChat.getUserId(),
              nicoChat.getText()
            );
            return false;
          }

          if (commandReg && commandReg.test(nicoChat.getCmd())) {
            window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
              RegExp.$1,
              nicoChat.getType(),
              nicoChat.getVpos() / 100,
              nicoChat.getCmd(),
              nicoChat.getText()
            );
            return false;
          }


          return true;
        };
      }

      return function(nicoChat) {
        if (nicoChat.getFork() > 0) { return true; }

        if (nicoChat.getScore() <= threthold) { return false; }

        if (wordReg    && wordReg.test(nicoChat.getText()))      { return false; }

        if (wordRegReg && wordRegReg.test(nicoChat.getText()))   { return false; }

        if (userIdReg  && userIdReg .test(nicoChat.getUserId())) { return false; }

        if (commandReg && commandReg.test(nicoChat.getCmd()))    { return false; }

        return true;
      };
    },
    applyFilter: function(nicoChatArray) {
      var before = nicoChatArray.length;
      if (before < 1) {
        return nicoChatArray;
      }
      var timeKey = 'applyNgFilter: ' + nicoChatArray[0].getType();
      window.console.time(timeKey);
      var result = _.filter(nicoChatArray, this.getFilterFunc());
      var after = result.length;
      window.console.timeEnd(timeKey);
      window.console.log('NG判定結果: %s/%s', after, before);
      return result;
    },
    isSafe: function(nicoChat) {
      return (this.getFilterFunc())(nicoChat);
    },
    _buildFilterReg: function(filterList) {
      if (filterList.length < 1) { return null; }
      var r = [];
      const escapeRegs = ZenzaWatch.util.escapeRegs;
      filterList.forEach((filter) => {
        if (!filter) { return; }
        r.push(escapeRegs(filter));
      });
      return new RegExp('(' + r.join('|') + ')', 'i');
    },
    _buildFilterPerfectMatchinghReg: function(filterList) {
      if (filterList.length < 1) { return null; }
      var r = [];
      const escapeRegs = ZenzaWatch.util.escapeRegs;
      filterList.forEach((filter) => {
        if (!filter) { return; }
        r.push(escapeRegs(filter));
      });
      return new RegExp('^(' + r.join('|') + ')$');
    },
     _onChange: function() {
      console.log('NicoChatFilter.onChange');
      this.emit('change');
    }
  });



var CommentLayoutWorker = (function(config, NicoChat, NicoCommentViewModel) {
  var func = function(self) {

    // 暫定設置
    var NicoChat = {
      TYPE: {
        TOP:    'ue',
        NAKA:   'naka',
        BOTTOM: 'shita'
      }
    };

    var NicoCommentViewModel = {
      SCREEN: {
        WIDTH_INNER:      512,
        WIDTH_FULL_INNER: 640,
        WIDTH:      512 + 32,
        WIDTH_FULL: 640 + 32,
        HEIGHT:     384 +  1
      }
    };


    var isConflict = function(target, others) {
      // 一度はみ出した文字は当たり判定を持たない
      if (target.isOverflow || others.isOverflow || others.isInvisible) { return false; }

      if (target.fork !== others.fork) { return false; }

      // Y座標が合わないなら絶対衝突しない
      var othersY = others.ypos;
      var targetY = target.ypos;
      if (othersY + others.height < targetY ||
          othersY > targetY + target.height) {
        return false;
      }

      // ターゲットと自分、どっちが右でどっちが左か？の判定
      var rt, lt;
      if (target.beginLeft <= others.beginLeft) {
        lt = target;
        rt = others;
      } else {
        lt = others;
        rt = target;
      }

      if (target.isFixed) {

        // 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
        // > か >= で挙動が変わるCAがあったりして正解がわからない
        if (lt.endRight > rt.beginLeft) {
          return true;
        }

      } else {

        // 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
        if (lt.beginRight >= rt.beginLeft) {
          return true;
        }

        // 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
        if (lt.endRight >= rt.endLeft) {
          return true;
        }

      }

      return false;
    };

    var moveToNextLine = function(target, others) {
      var margin = 1;
      var othersHeight = others.height + margin;
      // 本来はちょっとでもオーバーしたらランダムすべきだが、
      // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
      // コメントアートの再現という点では有効な妥協案
      var overflowMargin = 10;
      var rnd =  Math.max(0, NicoCommentViewModel.SCREEN.HEIGHT - target.height);
      var yMax = NicoCommentViewModel.SCREEN.HEIGHT - target.height + overflowMargin;
      //var rnd =  Math.max(0, 385 - target.height);
      //var yMax = 385 - target.height + overflowMargin;
      var yMin = 0 - overflowMargin;

      var type = target.type;
      var ypos = target.ypos;

      if (type !== NicoChat.TYPE.BOTTOM) {
        ypos += othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos > yMax) {
          target.isOverflow = true;
        }
      } else {
        ypos -= othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos < yMin) {
          target.isOverflow = true;
        }
      }

      target.ypos = target.isOverflow ? Math.floor(Math.random() * rnd) : ypos;

      return target;
    };


    /**
     * 最初に衝突が起こりうるindexを返す。
     * 処理効率化のための物
     */
    var findCollisionStartIndex = function(target, members) {
      var o;
      var tl = target.beginLeft;
      var tr = target.endRight;
      var fork = target.fork;
      for (var i = 0, len = members.length; i < len; i++) {
        o = members[i];
        var ol = o.beginLeft;
        var or = o.endRight;

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return -1; }

        if (fork !== o.fork || o.invisible || o.isOverflow) { continue; }

        if (tl <= or && tr >= ol) { return i; }
      }

      return -1;
    };

    var _checkCollision = function(target, members, collisionStartIndex) {
      var o;
      const beginLeft = target.beginLeft;
      for (var i = collisionStartIndex, len = members.length; i < len; i++) {
        o = members[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return target; }

        if (beginLeft > o.endRight)  { continue; }

        if (isConflict(target, o)) {
          target = moveToNextLine(target, o);

          // ずらした後は再度全チェックするのを忘れずに(再帰)
          if (!target.isOverflow) {
            return _checkCollision(target, members, collisionStartIndex);
          }
        }
      }
      return target;
    };

    var checkCollision = function(target, members) {
      if (target.isInvisible) { return target; }

      var collisionStartIndex = findCollisionStartIndex(target, members);

      if (collisionStartIndex < 0) { return target; }
    
      return _checkCollision(target, members, collisionStartIndex);
    };


    /**
     * findCollisionStartIndexの効率化を適用する前の物
     */
    var checkCollision_old = function(target, members) {
      if (target.isInvisible) { return target; }

      var o;
      var beginLeft = target.beginLeft;
      for (var i = 0, len = members.length; i < len; i++) {
        o = members[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return target; }

        if (beginLeft > o.endRight)  { continue; }


        if (isConflict(target, o)) {
          target = moveToNextLine(target, o);

          // ずらした後は再度全チェックするのを忘れずに(再帰)
          if (!target.isOverflow) {
            return checkCollision(target, members);
          }
        }
      }
      return target;
    };

    var groupCollision = function(members) {
      for (var i = 0, len = members.length; i < len; i++) {
        members[i] = checkCollision(members[i], members);
      }
      return members;
    };

    self.onmessage = function(e) {
      const data = {};
      //console.log('CommentLayoutWorker.onmessage', e.data.type, e.data.members);
      console.time('CommentLayoutWorker: ' + e.data.type);
      data.result = groupCollision(e.data.members);
      console.timeEnd('CommentLayoutWorker: ' + e.data.type);

      data.lastUpdate = e.data.lastUpdate;
      data.type = e.data.type;
      data.requestId = e.data.requestId;
      self.postMessage(data);
      //self.close();
    };

  };

  var instance = null;
  return {
    _func: func,
    create: function() {
      if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
        return null;
      }
      return util.createWebWorker(func);
    },
    getInstance: function() {
      if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
        return null;
      }
      if (!instance) {
        instance = util.createWebWorker(func);
      }
      return instance;
    }
  };
})(Config, NicoChat, NicoCommentViewModel);

ZenzaWatch.util.createWebWorker = function(func) {
  var src = func.toString().replace(/^function.*?\{/, '').replace(/}$/, '');

  var blob = new Blob([src], {type: 'text\/javascript'});
  var url = URL.createObjectURL(blob);

  //window.console.log('WebWorker src:', src);

  return new Worker(url);
};

ZenzaWatch.util.isWebWorkerAvailable = function() {
  return !!(window.Blob && window.Worker && window.URL);
};






var SlotLayoutWorker = (function() {
  var func = function(self) {

    // 暫定設置
    var SLOT_COUNT = 40;

    /**
     * スロット≒Z座標をよしなに割り当てる。
     * デザパタ的にいうならFlyweightパターンの亜種。
     * ゲームプログラミングではよくあるやつ。
     */
    var SlotEntry = function() { this.initialize.apply(this, arguments); };
    SlotEntry.prototype = {
      initialize: function(slotCount) {
        this._slotCount = slotCount || SLOT_COUNT;
        this._slot = [];
        this._itemTable = {};

        this._p = 1;
      },
      _findIdle: function(sec) {
        var count = this._slotCount, slot = this._slot, table = this._itemTable;
        for (var i = 0; i < count; i++) {
          if (!slot[i]) {
            //console.log('empty found! idx=%s, sec=%s slot=%s', i, sec, JSON.stringify(slot));
            slot[i] = this._p++;
            return i;
          }

          var item = table[i];
          if (sec < item.begin || sec > item.end) {
            //console.log('idle found! idx=%s, sec=%s ', i, sec, JSON.stringify(slot), JSON.stringify(item));
            slot[i] = this._p++;
            return i;
          }
        }
        return -1;
      },
      _findOldest: function() {
        var idx = 0, slot = this._slot, min = slot[0];
        for (var i = 1, len = this._slot.length; i < len; i++) {
          if (slot[i] < min) {
            min = slot[i];
            idx = i;
          }
        }
        return idx;
      },
      find: function(item, sec) {
        // まずは空いてるスロットを小さい順に探す
        var slot = this._findIdle(sec);
        // なかったら、一番古いやつから奪い取る
        if (slot < 0) { slot = this._findOldest(); }
        this._itemTable[slot] = item;
        return slot;
      }
    };

    var sortByBeginTime = function(data) {
      data = data.concat().sort(function(a, b) {
        var av = a.begin, bv = b.begin;
        if (av !== bv) {
          return av - bv;
        } else {
          return a.no < b.no ? -1 : 1;
        }
      });
      return data;
    };

    var execute = function(e) {
      var data = [];
      data = data.concat(e.data.top);
      data = data.concat(e.data.naka);
      data = data.concat(e.data.bottom);
      data = sortByBeginTime(data);

      var slotEntries = [new SlotEntry(), new SlotEntry(), new SlotEntry()];

      for (var i = 0, len = data.length; i < len; i++) {
        var o = data[i];
        if (o.invisible) { continue; }
        var sec = o.begin;
        var fork = o.fork % 3;
        o.slot = slotEntries[fork].find(o, sec);
      }
      return data;
    };

    self.onmessage = function(e) {
      //console.log('SlotLayout', e.data);
      console.time('SlotLayoutWorker');

      var result = execute(e);

      console.timeEnd('SlotLayoutWorker');

      result.lastUpdate = e.data.lastUpdate;
      //console.log('SlotLayoutResult', result);
      self.postMessage(e.data);
    };

  };

  return {
    _func: func,
    create: function() {
      if (!ZenzaWatch.util.isWebWorkerAvailable()) {
        return null;
      }
      return ZenzaWatch.util.createWebWorker(func);
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
      // 構文はいったん無視して、対応できる命令だけ拾っていく。
      // ニワン語のフル実装は夢
      let type, params;
      let result = [];
      for (let i = 0, len = lines.length; i < len; i++) {
        let text = lines[i];
        const id = NicoScriptParser.parseId;
        if (text.match(/^\/?replace\((.*?)\)/)) {
          type = 'REPLACE';
          params = NicoScriptParser.parseReplace(RegExp.$1);
          result.push({id, type, params});
        } else if (text.match(/^\/?commentColor\s*=\s*0x([0-9a-f]{6})/i)) {
          result.push({id, type: 'COLOR', params: {color: '#' + RegExp.$1}});
        } else if (text.match(/^\/?seek\((.*?)\)/i)) {
          params = NicoScriptParser.parseSeek(RegExp.$1);
          result.push({id, type: 'SEEK', params});
        }
      }
      return result;
    }


    static parseParams(str) {
      // 雑なパース
      let result = {}, v = '', lastC = '', key, isStr = false, quot = '';
      for (let i = 0, len = str.length; i < len; i++) {
        let c = str.charAt(i);
        switch (c) {
          case ':':
            key = v.trim();
            v = '';
            break;
          case ',':
            if (isStr) { v += c; }
            else {
              if (key !== '' && v !== '') { result[key] = v.trim(); }
              key = v = '';
            }
            break;
          case ' ':
            if (v !== '') { v+= c; }
            break;
          case "'": case '"':
            if (v !== '') {
              if (quot !== c) {
                v += c;
              } else if (isStr) {
                if (lastC === '\\') { v += c; }
                else {
                  if (quot === '"') {
                    // ダブルクォートの時だけエスケープがあるらしい
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
      if (key !== '' && v !== '') { result[key] = v.trim(); }

      return result;
    }

    static parseNicosParams(str) {
     // 雑なパース
      let result = [], v = '', lastC = '', quot = '';
      for (let i = 0, len = str.length; i < len; i++) {
        let c = str.charAt(i);
        switch (c) {
          case ' ': case '　':
            if (quot) {
              v+= c;
            } else {
              if (v !== '') {
                result.push(v);
                v = quot = '';
              }
            }
            break;
          case "'": case '"':
            if (v !== '') {
              if (quot !== c) {
                v += c;
              } else {
                if (lastC === '\\') { v += c; }
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
          case "「":
            if (v !== '') {
              v += c;
            } else {
              quot = c;
            }
            break;
          case "」":
            if (v !== '') {
              if (quot !== "「") {
                v += c;
              } else {
                if (lastC === '\\') { v += c; }
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
      if (v !== '') { result.push(v.trim()); }

      return result;
    }

    static parseNicos(text) {
      text = text.trim();
      let text1 = (text || '').split(/[ 　:：]+/)[0];
      let params;
      let type;
      switch (text1) {
        case '@デフォルト': case '＠デフォルト':
          type = 'DEFAULT';
          break;
        case '@逆': case '＠逆':
          type = 'REVERSE';
          params = NicoScriptParser.parse逆(text);
          break;
        case '@ジャンプ': case '＠ジャンプ':
          params = NicoScriptParser.parseジャンプ(text);
          type = params.type;
          break;
        case '@ジャンプマーカー': case '＠ジャンプマーカー':
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
            if (isStr) { v += c; }
            else {
              result.push(v.trim());
              v = '';
            }
            break;
          case ' ':
            if (v !== '') { v += c; }
            break;
          case "'": case '"':
            if (isStr) {
              if (quot === c) {
                if (lastC !== '\\') { isStr = false; }
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
      if (v !== '') { result.push(v.trim()); }

      return result;
    }


    static parseReplace(str) {
      let result = NicoScriptParser.parseParams(str);

      if (!result) { return null; }
      return {
        src:     result.src,
        dest:    result.dest || '',
        fill:    result.fill   === 'true' ? true : false,
        target:  result.target || 'user',
        partial: result.partial === 'false' ? false: true
      };
    }


    static parseSeek(str) {
      let result = NicoScriptParser.parseParams(str);
      if (!result) { return null; }
      return {
        time: result.vpos
      };
    }



    static parse置換(str) {
      let tmp = NicoScriptParser.parseNicosParams(str);
      //＠置換 キーワード 置換後 置換範囲 投コメ 一致条件
      //＠置換 "И"       "██" 単       投コメ

      // 投稿者コメントを含めるかどうか
      let target = 'user';
      if (tmp[4] === '含む') {
        target = 'owner user';
      } else if (tmp[4] === '投コメ') {
        target = 'owner';
      }
      return {
        src:  tmp[1],
        dest: tmp[2] || '',
        fill:    tmp[3] === '全'       ? true : false,          //全体を置き換えるかどうか
        target, //(tmp[4] === '含む' || tmp[4] === '投コメ')     ? 'owner user' : 'user',
        partial: tmp[5] === '完全一致' ? false : true           // 完全一致のみを見るかどうか
      };
    }


    static parse逆(str) {
      let tmp = NicoScriptParser.parseNicosParams(str);
      //var tmp = str.split(/[ 　]+/);
      //＠逆　投コメ
      let target = (tmp[1] || '').trim();
      //＠置換キーワード置換後置換範囲投コメ一致条件
      return {
        target: (target === 'コメ' || target === '投コメ') ? target : '全',
      };
    }


    static parseジャンプ(str) {
      //＠ジャンプ ジャンプ先 メッセージ 再生開始位置 戻り秒数 戻りメッセージ
      let tmp = NicoScriptParser.parseNicosParams(str);
      let target = tmp[1] || '';
      let type = 'JUMP';
      let time = 0;
      if (/^#(\d+):(\d+)$/.test(target)) {
        type = 'SEEK';
        time = RegExp.$1 * 60 + RegExp.$2 * 1;
      } else if (/^#(\d+):(\d+\.\d+)$/.test(target)) {
        type = 'SEEK';
        time = RegExp.$1 * 60 + RegExp.$2 * 1;
      } else if (/^(#|＃)(.+)/.test(target)) {
        type = 'SEEK_MARKER';
        time = RegExp.$2;
      }
      return {target, type, time};
    }


    static parseジャンプマーカー(str) {
      let tmp = NicoScriptParser.parseNicosParams(str);
      let name = tmp[0].split(/[:： 　]/)[1];
      return {name};
    }

  }


  class NicoScripter extends AsyncEmitter {
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

    get isExist() {
      return this._list.length > 0;
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
      if (this._hasSort) { return; }
      const list = this._list.concat().sort((a, b) => {
        const av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) {
          return av - bv;
        } else {
          return a.getNo() < b.getNo() ? -1 : 1;
        }
      });
      this._list = list;
      this._hasSort = true;
    }

    _updateInviewEvents() {
      const ct = this._currentTime;
      this._eventScript.forEach(({p, nicos}) => {
        const beginTime = nicos.getVpos() / 100;
        const endTime   = beginTime + nicos.getDuration();
        if (beginTime > ct || endTime < ct) {
          delete this._inviewEvents[p.id];
          return;
        }
        if (this._inviewEvents[p.id]) { return; }
        this._inviewEvents[p.id] = true;
        let diff = nicos.getVpos() / 100 - ct;
        diff = Math.min(1, Math.abs(diff)) * (diff / Math.abs(diff));
        switch (p.type) {
          case 'SEEK':
            this.emit('command', 'nicosSeek', Math.max(0, p.params.time * 1 + diff));
            break;
          case 'SEEK_MARKER':
            let time = this._marker[p.params.time] || 0;
            this.emit('command', 'nicosSeek', Math.max(0, time + diff));
            break;
        }
      });
    }

    apply(group) {
      this._sort();
      const assigned = {};

      // どうせ全動画の1%も使われていないので
      // 最適化もへったくれもない
      const eventFunc = {
        'JUMP': (p, nicos) => {
          console.log('@ジャンプ: ', p, nicos);
          const target = p.params.target;
          if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
            this._nextVideo = target;
          }
        },
        'SEEK': (p, nicos) => {
          if (assigned[p.id]) { return; }
          assigned[p.id] = true;
          this._eventScript.push({p, nicos});
        },
        'SEEK_MARKER': (p, nicos) => {
          if (assigned[p.id]) { return; }
          assigned[p.id] = true;

          console.log('SEEK_MARKER: ', p, nicos);
          this._eventScript.push({p, nicos});
        },
        'MARKER': (p, nicos) => {
          console.log('@ジャンプマーカー: ', p, nicos);
          this._marker[p.params.name] = nicos.getVpos() / 100;
        }
      };

      const applyFunc = {
        'DEFAULT': function(nicoChat, nicos) {
          let nicosColor = nicos.getColor();
          let hasColor = nicoChat.hasColorCommand();
          if (nicosColor && !hasColor) { nicoChat.setColor(nicosColor); }

          let nicosSize = nicos.getSize();
          let hasSize = nicoChat.hasSizeCommand();
          if (nicosSize && !hasSize) { nicoChat.setSize(nicosSize); }

          let nicosType = nicos.getType();
          let hasType = nicoChat.hasTypeCommand();
          if (nicosType && !hasType) { nicoChat.setType(nicosType); }

        },
        'COLOR': function(nicoChat, nicos, params) {
          let hasColor = nicoChat.hasColorCommand();
          if (!hasColor) { nicoChat.setColor(params.color); }
        },
        'REVERSE': function(nicoChat, nicos, params) {
          if (params.target === '全') {
            nicoChat.setIsReverse(true);
          } else if (params.target === '投コメ') {
            if (nicoChat.getFork() > 0)   { nicoChat.setIsReverse(true); }
          } else if (params.target === 'コメ') {
            if (nicoChat.getFork() === 0) { nicoChat.setIsReverse(true); }
          }
        },
        'REPLACE': function(nicoChat, nicos, params) {
          if (!params) { return; }
          if (nicoChat.getFork() > 0 && (params.target || '').indexOf('owner') < 0) { return; }
          if (nicoChat.getFork() < 1 && params.target === 'owner') { return; }

          let isMatch = false;
          let text = nicoChat.getText();

          if (params.partial === true) {
            isMatch = text.indexOf(params.src) >= 0;
          } else {
            isMatch = text === params.src;
          }
          if (!isMatch) { return; }
          
          if (params.fill === true) {
            text = params.dest;
          } else {
            let reg = new RegExp(util.escapeRegs(params.src), 'g');
            text = text.replace(reg, params.dest.replace(/\$/g, '\\$'));
          }
          nicoChat.setText(text);

          let nicosColor = nicos.getColor();
          let hasColor = nicoChat.hasColorCommand();
          if (nicosColor && !hasColor) { nicoChat.setColor(nicosColor); }

          let nicosSize = nicos.getSize();
          let hasSize = nicoChat.hasSizeCommand();
          if (nicosSize && !hasSize) { nicoChat.setSize(nicosSize); }

          let nicosType = nicos.getType();
          let hasType = nicoChat.hasTypeCommand();
          if (nicosType && !hasType) { nicoChat.setType(nicosType); }

        },
        'PIPE': function(nicoChat, nicos, lines) {
          lines.forEach(line => {
            let type = line.type;
            let f = applyFunc[type];
            if (f) {
              f(nicoChat, nicos, line.params);
            }
          });
        }
      };



      this._list.forEach((nicos) => {
        let p = NicoScriptParser.parseNicos(nicos.getText());
        if (!p) { return; }
        if (!nicos.hasDurationSet()) { nicos.setDuration(99999); }
        
        let ev = eventFunc[p.type];
        if (ev) {
          return ev(p, nicos);
        }
        else if (p.type === 'PIPE') {
          p.params.forEach(line => {
            let type = line.type;
            let ev = eventFunc[type];
            if (ev) { return ev(line, nicos); }
          });
        }


        let func = applyFunc[p.type];
        if (!func) { return; }

        let beginTime = nicos.getBeginTime();
        let endTime   = beginTime + nicos.getDuration();

        (group.getMembers ? group.getMembers : group).forEach((nicoChat) => {
          if (nicoChat.isNicoScript()) { return; }
          let ct = nicoChat.getBeginTime();

          if (beginTime > ct || endTime < ct) { return; }

          func(nicoChat, nicos, p.params);
        });
      });
    }
  }




  var CommentListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListModel.prototype, AsyncEmitter.prototype);
  _.assign(CommentListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._positions = [];
      this._maxItems = params.maxItems || 100;
      this._currentSortKey = 'vpos';
      this._isDesc = false;
      this._currentTime = 0;
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
    },
    clear: function() {
      this._items = [];
      this._positions = [];
      this._currentTime = 0;
      this.emit('update', [], true);
    },
    setChatList: function(chatList) {
      chatList = chatList.top.concat(chatList.naka, chatList.bottom);
      var items = [];
      var positions = [];
      for (var i = 0, len = chatList.length; i < len; i++) {
        items.push(new CommentListItem(chatList[i]));
        positions.push(parseFloat(chatList[i].getVpos(), 10) / 100);
      }
      this._items = items;
      this._positions = positions.sort(function(a, b) { return a - b; });
      this._currentTime = 0;

      //window.console.log(this._positions);
      this.sort();
      this.emit('update', this._items, true);

    },
    removeItemByIndex: function(index) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      this._items = _.reject(this._items, function(item) { return item === target; });
    },
    getLength: function() {
      return this._items.length;
    },
    _getItemByIndex: function(index) {
      var item = this._items[index];
      return item;
    },
    indexOf: function(item) {
      return _.indexOf(this._items, item);
    },
    getItemByIndex: function(index) {
      var item = this._getItemByIndex(index);
      if (!item) { return null; }
      if (!item.hasBind) {
        item.hasBind = true;
        item.on('update', this._onItemUpdate.bind(this, item));
      }
      return item;
    },
    findByItemId: function(itemId) {
      itemId = parseInt(itemId, 10);
      return _.find(this._items, (item) => {
        if (item.getItemId() === itemId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', this._onItemUpdate.bind(this, item));
          }
          return true;
        }
      });
    },
    removeItem: function(item) {
      var beforeLen = this._items.length;
      _.pull(this._items, item);
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    _onItemUpdate: function(item, key, value) {
      this.emit('itemUpdate', item, key, value);
    },
    sortBy: function(key, isDesc) {
      var table = {
        vpos: 'getVpos',
        date: 'getDate',
        text: 'getText',
        user: 'getUserId',
      };
      var func = table[key];
      if (!func) { return; }
      this._items = _.sortBy(this._items, function(item) { return item[func](); });
      if (isDesc) {
        this._items.reverse();
      }
      this._currentSortKey = key;
      this._isDesc = isDesc;
      this.onUpdate();
    },
    sort: function() {
      this.sortBy(this._currentSortKey, this._isDesc);
    },
    getCurrentSortKey: function() {
      return this._currentSortKey;
    },
    onUpdate: function() {
      this.emitAsync('update', this._items);
    },
    getInViewIndex: function(sec) {
      return Math.max(0, _.sortedLastIndex(this._positions, sec + 1) - 1);
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec && _.isNumber(sec)) {
        this._currentTime = sec;
        if (this._currentSortKey === 'vpos') {
          this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
        }// else { window.console.log('sort: ', this._currentSortKey); }
      }
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var CommentListView = function() { this.initialize.apply(this, arguments); };
  CommentListView.ITEM_HEIGHT = 40;

  _.extend(CommentListView.prototype, AsyncEmitter.prototype);
  CommentListView.__css__ = '';

  CommentListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  body.scrolling #listContainerInner *{
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
  }

</style>
<style id="listItemStyle">%CSS%</style>
<body>
  <div class="itemDetailContainer">
    <div class="resNo"></div>
    <div class="vpos"></div>
    <div class="time command" data-command="reloadComment"></div>
    <div class="userId"></div>
    <div class="cmd"></div>
    <div class="text"></div>
    <div class="command close" data-command="hideItemDetail">O K</div>
  </div>
  <div id="listContainer">
    <div class="listMenu">
      <span class="menuButton itemDetailRequest" data-command="itemDetailRequest">?</span>

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

  _.extend(CommentListView.prototype, AsyncEmitter.prototype);
  _.assign(CommentListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder || CommentListItemView;
      this._itemCss     = params.itemCss || CommentListItemView.__css__;
      this._className   = params.className || 'commentList';
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._cache = {};
      this._maxItems = 100000;
      this._scrollTop = 0;

      this._model = params.model;
      if (this._model) {
        this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 500));
      }

      this.scrollTop = ZenzaWatch.util.createDrawCallFunc(this.scrollTop.bind(this));
      this._initializeView(params, 0);
    },
    _initializeView: function(params) {
      var html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
      this._frame = new FrameLayer({
        $container: params.$container,
        html: html,
        className: 'commentListFrame'
      });
      this._frame.on('load', this._onIframeLoad.bind(this));
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      var $win  = this._$window = $(w);
      var body = this._body = doc.body;
      var $body = this._$body = $(body);
      if (this._className) {
        body.classList.add(this._className);
      }
      this._$container = $body.find('#listContainer');
      var $list = this._$list = $(doc.getElementById('listContainerInner'));
      if (this._html) {
        $list.html(this._html);
        this._$items = this._$body.find('.commentListItem');
      }
      this._$menu = $body.find('.listMenu');

      this._$itemDetail = $body.find('.itemDetailContainer');

      $body
        .on('click',     this._onClick    .bind(this))
        .on('dblclick',  this._onDblClick .bind(this))
//        .on('mousemove', _.debounce(this._onMouseMove.bind(this), 100))
        .on('keydown', function(e) { ZenzaWatch.emitter.emit('keydown', e); })
        .on('keyup', function(e)   { ZenzaWatch.emitter.emit('keyup', e); });

      this._$menu.on('click', this._onMenuClick.bind(this));
      this._$itemDetail.on('click', this._onItemDetailClick.bind(this));

      this._$container
        .on('mouseover', this._onMouseOver.bind(this))
        .on('mouseleave', this._onMouseOut .bind(this));
      //  .on('scroll', this._onScroll.bind(this))
      //  .on('scroll', _.debounce(this._onScrollEnd.bind(this), 500));
      this._$container[0].addEventListener('scroll',
        this._onScroll.bind(this), {passive: true});
      this._debouncedOnScrollEnd = _.debounce(this._onScrollEnd.bind(this), 500);

      $win
        .on('resize', this._onResize.bind(this));

      this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
      this._appendNewItems = ZenzaWatch.util.createDrawCallFunc(this._appendNewItems.bind(this));

      this._debouncedOnItemClick = _.debounce(this._onItemClick.bind(this), 300);
      this._$begin = $('<span class="begin"/>');
      this._$end   = $('<span class="end"/>');
      ZenzaWatch.debug.$commentList = $list;
    },
    _onModelUpdate: function(itemList, replaceAll) {
      window.console.time('update commentlistView');
      this.addClass('updating');
      itemList = _.isArray(itemList) ? itemList: [itemList];
      var itemViews = [], Builder = this._ItemBuilder;
      this._lastEndPoint = null;
      this._isActive = false;
      this._$items = null;

      if (replaceAll) {
        this._scrollTop = 0;
      }

      itemList.forEach((item, i) => {
        itemViews.push(new Builder({item: item, index: i, height: CommentListView.ITEM_HEIGHT}));
      });

      this._itemViews = itemViews;
      this._inviewItemList = {};
      this._$newItems = null;

      window.setTimeout(() => {
        if (this._$list) {
          this._$list.html('');
          this._$list.css({'height': CommentListView.ITEM_HEIGHT * itemViews.length + 100});
          this._$items = this._$body.find('.commentListItem');
          this._$menu.removeClass('show');
          this._refreshInviewElements();
          this.hideItemDetail();
        }
      }, 0);

      window.setTimeout(() => {
        this.removeClass('updating');
        this.emit('update');
      }, 100);


      window.console.timeEnd('update commentlistView');
    },
    _onClick: function(e) {
      e.stopPropagation();
      ZenzaWatch.emitter.emitAsync('hideHover');
      var $item = $(e.target).closest('.commentListItem');
      if ($item.length > 0) { return this._debouncedOnItemClick($item); }
    },
    _onItemClick: function($item) {
      //var offset = $item.offset();
      this._$menu
        .css('top', $item.attr('data-top') + 'px')
        .attr('data-item-id', $item.attr('data-item-id'))
        .addClass('show');
    },
    _onMenuClick: function(e) {
      var $target = $(e.target).closest('.menuButton');
      this._$menu.removeClass('show');
      if ($target.length < 1) { return; }
      var itemId = $target.closest('.listMenu').attr('data-item-id');
      if ($target.length < 1) { return; }
      if (!itemId) { return; }

      var command = $target.attr('data-command');

      if (command === 'addUserIdFilter' || command === 'addWordFilter') {
        this._$list.find('.item' + itemId).hide();
      }

      this.emit('command', command, null, itemId);
    },
    _onItemDetailClick: function(e) {
      let $target = $(e.target).closest('.command');
      if ($target.length < 1) { return; }
      let itemId = this._$itemDetail.attr('data-item-id');
      if (!itemId) { return; }
      let command = $target.attr('data-command');
      let param   = $target.attr('data-param');
      if (command === 'hideItemDetail') { return this.hideItemDetail(); }
      if (command === 'reloadComment') { this.hideItemDetail(); }
      this.emit('command', command, param, itemId);
    },
    _onDblClick: function(e) {
      e.stopPropagation();
      var $item = $(e.target).closest('.commentListItem');
      if ($item.length < 0) { return; }
      e.preventDefault();

      var itemId = $item.attr('data-item-id');
      this.emit('command', 'select', null, itemId);
    },
    _onMouseMove: function() {
    },
    _onMouseOver: function() {
      //window.console.info('Active!');
      this._isActive = true;
      this.addClass('active');
    },
    _onMouseOut: function() {
      //window.console.info('Blur!');
      this._isActive = false;
      this.removeClass('active');
    },
    _onResize: function() {
      this._refreshInviewElements();
    },
    _onScroll: function() {
      if (!this.hasClass('scrolling')) { this.addClass('scrolling'); }
      this._refreshInviewElements();
      this._debouncedOnScrollEnd();
    },
    _onScrollEnd: function() {
      this.removeClass('scrolling');
    },
    _refreshInviewElements: function() {
      if (!this._$list) { return; }
      var itemHeight = CommentListView.ITEM_HEIGHT;
      var $win = this._$window;
      var $container = this._$container;
      var scrollTop   = $container.scrollTop();
      var innerHeight = $win.innerHeight();
      if (innerHeight > window.innerHeight) { return; }
      var windowBottom = scrollTop + innerHeight;
      var itemViews = this._itemViews;
      var startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
      var endIndex   = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
      var i;

      var newItems = [], inviewItemList = this._inviewItemList;
      for (i = startIndex; i < endIndex; i++) {
        if (inviewItemList[i] || !itemViews[i]) { continue; }
        newItems.push(itemViews[i].toString());
        inviewItemList[i] = itemViews[i].getDomId();
      }

      if (newItems.length < 1) { return; }

      // 見えないitemを除去。 見えない場所なのでrequestAnimationFrame不要
      var doc = this._document;
      _.each(Object.keys(inviewItemList), function(i) {
        if (i >= startIndex && i <= endIndex) { return; }
        //$list.find('#' + inviewItemList[i]).remove();
        doc.getElementById(inviewItemList[i]).remove();
        delete inviewItemList[i];
      });

      this._inviewItemList = inviewItemList;


      var $newItems = $(newItems.join(''));
      if (this._$newItems) {
        this._$newItems.append($newItems);
      } else {
        this._$newItems = $newItems;
      }

      this._appendNewItems();
    },
    _appendNewItems: function() {
      if (this._$newItems) {
        this._$list.append(this._$newItems);
      }
      this._$newItems = null;
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      if (!this._body) { return; }
      this._body.classList.toggle(className, v);
    },
    hasClass: function(className) {
      return this._body.classList.contains(className);
    },
    find: function(query) {
      return this._document.querySelectorAll(query);
    },
    scrollTop: function(v) {
      if (!this._$window) { return 0; }

      if (typeof v === 'number') {
        this._scrollTop = v;
        //this._$container.scrollTop(v);
        this._$container[0].scrollTop = v;
      } else {
        this._scrollTop = this._$container[0].scrollTop;
        return this._scrollTop;
      }
    },
    scrollToItem: function(itemId) {
      if (!this._$body) { return; }
      if (_.isFunction(itemId.getItemId)) { itemId = itemId.getItemId(); }
      var $target = this._$body.find('.item' + itemId);
      if ($target.length < 1) { return; }
      var top = $target.offset().top;
      this.scrollTop(top);
    },
    setCurrentPoint: function(idx) {
      if (!this._$window || !this._itemViews) { return; }
      var innerHeight = this._$window.innerHeight();
      var itemViews = this._itemViews;
      var len  = itemViews.length;
      var view = itemViews[idx];
      if (len < 1 || !view) { return; }

      if (!this._isActive) {
        var itemHeight = CommentListView.ITEM_HEIGHT;
        var top = view.getTop();
        this.scrollTop(Math.max(0, top - innerHeight + itemHeight));
      }
    },
    showItemDetail: function(item) {
      let $d = this._$itemDetail;
      $d.attr('data-item-id', item.getItemId());
      //window.console.log('showItemDetail', item);
      $d.find('.resNo')  .text(item.getNo()).end()
        .find('.vpos')   .text(item.getTimePos()).end()
        .find('.time')   .text(item.getFormattedDate()).end()
        .find('.userId') .text(item.getUserId()).end()
        .find('.cmd')    .text(item.getCmd()).end()
        .find('.text')   .text(item.getText()).end()
        .addClass('show');
      ZenzaWatch.debug.$itemDetail = $d;
    },
    hideItemDetail: function() {
      this._$itemDetail.removeClass('show');
    }
  });

  // なんか汎用性を持たせようとして失敗してる奴
  var CommentListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListItemView.prototype, AsyncEmitter.prototype);

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  CommentListItemView.__css__ = (`
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

    #listContainer::-webkit-scrollbar {
      background: #222;
    }

    #listContainer::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    #listContainer::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }


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
      color: #fff;
      background: #666;
      cursor: pointer;
      top: 0;
      text-align: center;
    }

    .listMenu  .menuButton:hover {
      border: 1px solid #ccc;
      box-shadow: 2px 2px 2px #333;
    }

    .listMenu  .menuButton:active {
      box-shadow: none;
      transform: translate(4px, 4px);
    }

    .listMenu .itemDetailRequest {
      right: 176px;
      width: auto;
      padding: 0 4px;
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

    .itemDetailContainer {
      position: fixed;
      display: block;
      top: 50%;
      left: 50%;
      line-height: normal;
      min-width: 280px;
      max-height: 100%;
      overflow-h: auto;
      font-size: 14px;
      transform: translate(-50%, -50%);
      opacity: 0;
      pointer-events: none;
      z-index: 100;
      border: 2px solid #fc9;
      background-color: rgba(255, 255, 232, 0.9);
      box-shadow: 4px 4px 0 rgba(99, 99, 66, 0.8);
      transition: 0.2s opacity;
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
    }

    .active .commentListItem {
      pointer-events: auto;
    }

    .commentListItem * {
      cursor: default;
    }

    .commentListItem.odd {
      background: #333;
    }

    .commentListItem.updating {
      opacity: 0.5;
      cursor: wait;
    }

    .commentListItem .info {
      display: block;
      width: 100%;
      font-size: 14px;
      height: 20px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #888;
      margin: 0;
      padding: 0 4px;
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
      padding: 0 4px;
      font-family: arial, 'Menlo';
    }

    .active .commentListItem:hover {
      overflow-x: hidden;
      overflow-y: visible;
      z-index: 60;
      height: auto;
      box-shadow: 2px 2px 2px #000, 2px -2px 2px #000;
    }

    .active .commentListItem:hover .text {
      white-space: normal;
      word-break: break-all;
      /*overflow-x: hidden;
      overflow-y: visible;*/
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


    .commentListItem + .commentListItem {
    }


    .begin ~ .commentListItem .text {
      color: #ffe;
      font-weight: bolder;
    }

    .end ~ .commentListItem .text {
      color: #ccc;
      font-weight: normal;
    }


    .commentListItem.active {
      outline: dashed 2px #ff8;
      outline-offset: 4px;
    }


  `).trim();

  CommentListItemView.__tpl__ = (`
    <div id="item%itemId%" class="commentListItem no%no% item%itemId% %updating% fork%fork% %odd-even%"
      data-item-id="%itemId%"
      data-no="%no%" data-vpos"%vpos%"
        style="top: %top%px;" data-top="%top%"
data-title="%no%: %date% ID:%userId%
  %text%"
      >
      <p class="info">
        <span class="timepos">%timepos%</span>&nbsp;&nbsp;<span class="date">%date%</span>
      </p>
      <p class="text" style="%shadow%">%trimText%</p>
    </div>
  `).trim();

  _.assign(CommentListItemView.prototype, {
    initialize: function(params) {
      this._item   = params.item;
      this._index  = params.index;
      this._height = params.height;

      this._id = CommentListItemView.counter++;
    },
    build: function() {
      var tpl = CommentListItemView.__tpl__;
      var item = this._item;

      var text = item.getEscapedText();
      var trimText = text.trim();

      tpl = tpl
        .replace(/%domId%/g,    'item' + this._id)
        .replace(/%no%/g,       item.getNo())
        .replace(/%vpos%/g,     item.getVpos())
        .replace(/%fork%/g,     item.getFork())
        .replace(/%timepos%/g,  item.getTimePos())
        .replace(/%itemId%/g,   item.getItemId())
        .replace(/%userId%/g,   item.getUserId())
        .replace(/%date%/g,     item.getFormattedDate())
        .replace(/%text%/g,     text)
        .replace(/%trimText%/g, trimText)
        .replace(/%odd-even%/g, (this._index % 2 === 0) ? 'even' : 'odd')
        .replace(/%top%/g,      this._index * this._height)
        ;
      var color = item.getColor();
      if (color) {
        tpl = tpl.replace('%shadow%', 'text-shadow: 0px 0px 2px ' + color + ';');
      } else {
        tpl = tpl.replace('%shadow%', '');
      }
      return tpl;
    },
    getItemId: function() {
      return this._item.getItemId();
    },
    getDomId: function() {
      return 'item' + this._item.getItemId();
    },
    getTop: function() {
      return this._index * this._height;
    },
    toString: function() {
      return this.build();
    }
  });

  var CommentListItem = function() { this.initialize.apply(this, arguments); };
  CommentListItem._itemId = 0;

  _.extend(CommentListItem.prototype, AsyncEmitter.prototype);
  _.assign(CommentListItem.prototype, {
    initialize: function(nicoChat) {
      this._nicoChat = nicoChat;
      this._itemId = CommentListItem._itemId++;
      this._vpos = nicoChat.getVpos();
      this._text = nicoChat.getText();
      this._escapedText = ZenzaWatch.util.escapeHtml(this._text);
      this._userId = nicoChat.getUserId();
      this._date = nicoChat.getDate();
      this._fork = nicoChat.getFork();
      this._no = nicoChat.getNo();
      this._color = nicoChat.getColor();

      var dt = new Date(this._date * 1000);
      this._formattedDate =
        dt.getFullYear() + '/' +
        ('0' + (dt.getMonth() + 1)).slice(-2) + '/' +
        ('0' + dt.getDate())       .slice(-2) + ' ' +
        ('0' + dt.getHours())      .slice(-2) + ':' +
        ('0' + dt.getMinutes())    .slice(-2);

      var sec = this._vpos / 100;
      var m = (Math.floor(sec / 60) + 100).toString().substr(1);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      this._timePos = m + ':' + s;
    },
    getItemId: function() {
      return this._itemId;
    },
    getVpos: function() {
      return this._vpos;
    },
    getTimePos: function() {
      return this._timePos;
    },
    getCmd: function() {
      return this._nicoChat.getCmd();
    },
    getText: function() {
      return this._text;
    },
    getEscapedText: function() {
      return this._escapedText;
    },
    getUserId: function() {
      return this._userId;
    },
    getColor: function() {
      return this._color;
    },
    getDate: function() {
      return this._date;
    },
    getTime: function() {
      return this._date * 1000;
    },
    getFormattedDate: function() {
      return this._formattedDate;
    },
    getFork: function() {
      return this._fork;
    },
    getNo: function() {
      return this._no;
    }
  });

  var CommentList = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentList.prototype, AsyncEmitter.prototype);
  _.assign(CommentList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._model = new CommentListModel({
        uniq: true,
        maxItem: 100
      });

      this._initializeView();
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new CommentListView({
        $container: this._$container,
        model: this._model,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      this._view.on('command', this._onCommand.bind(this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new CommentListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._view.insertItem(items);
    },
    _onCommand: function(command, param, itemId) {
      this.emit('command', command, param, itemId);
    }
  });


  var CommentPanelView = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPanelView.prototype, AsyncEmitter.prototype);
  CommentPanelView.__css__ = (`
    :root {
      --zenza-comment-panel-header-height: 64px;
    }

    .commentPanel-container {
      height: 100%;
      overflow: hidden;
    }

    .commentPanel-header {
      height: var(--zenza-comment-panel-header-height);
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .commentPanel-menu-button {
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
  `).trim();

  CommentPanelView.__tpl__ = (`
    <div class="commentPanel-container">
      <div class="commentPanel-header">
        <lavel class="commentPanel-menu-button autoScroll commentPanel-command"
          data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</lavel>

        <div class="commentPanel-command commentPanel-menu-toggle" data-command="toggleMenu">
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

  _.assign(CommentPanelView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._commentPanel = params.commentPanel;


      ZenzaWatch.util.addStyle(CommentPanelView.__css__);
      var $view = this._$view = $(CommentPanelView.__tpl__);
      this._$container.append($view);

      var $menu = this._$menu = this._$view.find('.commentPanel-menu');

      ZenzaWatch.debug.commentPanelView = this;

      var listView = this._listView = new CommentListView({
        $container: this._$view.find('.commentPanel-frame'),
        model: this._model,
        className: 'commentList',
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      listView.on('command', this._onCommand.bind(this));

      this._timeMachineView = new TimeMachineView({
        parentNode: document.querySelector('.timeMachineContainer')});
      this._timeMachineView.on('command', this._onCommand.bind(this));

      this._commentPanel.on('threadInfo',
        _.debounce(this._onThreadInfo.bind(this), 100));
      this._commentPanel.on('update',
        _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
      this._commentPanel.on('itemDetailResp',
        _.debounce((item) => { listView.showItemDetail(item); }, 100));
      this._onCommentPanelStatusUpdate();

      this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));

      this._$view.on('click', '.commentPanel-command', this._onCommentListCommandClick.bind(this));


      ZenzaWatch.emitter.on('hideHover', () => { $menu.removeClass('show'); });

    },
    toggleClass: function(className, v) {
      this._view.toggleClass(className, v);
      this._$view.toggleClass(className, v);
    },
    _onModelCurrentTimeUpdate: function(sec, viewIndex) {
      if (!this._$view || !this._$view.is(':visible')) { return; }

      this._lastCurrentTime = sec;
      this._listView.setCurrentPoint(viewIndex);
    },
    _onCommand: function(command, param, itemId) {
      switch (command) {
        default:
          this.emit('command', command, param, itemId);
          break;
      }
    },
    _onCommentListCommandClick: function(e) {
      var $target = $(e.target).closest('.commentPanel-command');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      e.stopPropagation();
      if (!command) { return; }

      var $view = this._$view;
      var setUpdating = function() {
        $view.addClass('updating');
        window.setTimeout(function() {
          $view.removeClass('updating');
        }, 1000);
      };

      switch (command) {
        case 'toggleMenu':
          e.stopPropagation();
          e.preventDefault();
          this._$menu.addClass('show');
          return;
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
      ZenzaWatch.emitter.emitAsync('hideHover');
    },
    _onThreadInfo(threadInfo) {
      this._timeMachineView.update(threadInfo);
    },
    _onCommentPanelStatusUpdate: function() {
      let commentPanel = this._commentPanel;
      const $view = this._$view
        .toggleClass('autoScroll', commentPanel.isAutoScroll());

      //let threadInfo = commentPanel.getThreadInfo();
      //if (threadInfo) {
      //  this._timeMachineView.update(threadInfo);
      //}
      const langClass = 'lang-' + commentPanel.getLanguage();
      if (!$view.hasClass(langClass)) {
        $view.removeClass('lang-ja_JP lang-en_US lang-zh_TW').addClass(langClass);
      }
    }
  });


  var CommentPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPanel.prototype, AsyncEmitter.prototype);
  _.assign(CommentPanel.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;
      var player = this._player = params.player;

      this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;

      this._model = new CommentListModel({});
      this._language = params.language || 'ja_JP';

      player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
      player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
      player.on('commentReady',  _.debounce(this._onCommentReady.bind(this), 500));
      player.on('open',  this._onPlayerOpen.bind(this));
      player.on('close', this._onPlayerClose.bind(this));

      ZenzaWatch.debug.commentPanel = this;
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new CommentPanelView({
        $container: this._$container,
        model: this._model,
        commentPanel: this,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      this._view.on('command', this._onCommand.bind(this));
    },
    startTimer: function() {
      this.stopTimer();
      this._timer = window.setInterval(this._onTimer.bind(this), 200);
    },
    stopTimer: function() {
      if (this._timer) {
        window.clearInterval(this._timer);
        this._timer = null;
      }
    },
    _onTimer: function() {
      if (this._autoScroll) {
        this.setCurrentTime(this._player.getCurrentTime());
      }
    },
    _onCommand: function(command, param, itemId) {
      //window.console.log('CommentPanel.onCommand: ', command, param, itemId);
      var item;
      if (itemId) {
        item = this._model.findByItemId(itemId);
      }
      switch (command) {
        case 'toggleScroll':
          this.toggleScroll();
          break;
        case 'sortBy':
          var tmp = param.split(':');
          this.sortBy(tmp[0], tmp[1] === 'desc');
          break;
        case 'select':
          var vpos = item.getVpos();
          this.emit('command', 'seek', vpos / 100);
          // TODO: コメント強調
          break;
        case 'clipBoard':
          ZenzaWatch.util.copyToClipBoard(item.getText());
          this.emit('command', 'notify', 'クリップボードにコピーしました');
          break;
        case 'addUserIdFilter':
          this._model.removeItem(item);
          this.emit('command', command, item.getUserId());
          break;
        case 'addWordFilter':
          this._model.removeItem(item);
          this.emit('command', command, item.getText());
          break;
        case 'reloadComment':
          if (item) {
            param = {};
            let dt = new Date(item.getTime());
            this.emit('command', 'notify', item.getFormattedDate() + '頃のログ');
            //window.console.log('when!', dt.getTime(), item);
            param.when = Math.floor(dt.getTime() / 1000);
          }
          this.emit('command', command, param);
          
          break;
        case 'itemDetailRequest':
          if (item) {
            this.emit('itemDetailResp', item);
          }
          break;
        default:
          this.emit('command', command, param);
      }
    },
    _onCommentParsed: function(language) {
      this.setLanguage(language);
      this._initializeView();
      this.setChatList(this._player.getChatList());
      this.startTimer();
    },
    _onCommentChange: function(language) {
      this.setLanguage(language);
      this._initializeView();
      this.setChatList(this._player.getChatList());
    },
    _onCommentReady: function(result, threadInfo) {
      this._threadInfo = threadInfo;
      this.emit('threadInfo', threadInfo);
    },
    _onPlayerOpen: function() {
      this._model.clear();
    },
    _onPlayerClose: function() {
      this._model.clear();
      this.stopTimer();
    },
    setChatList: function(chatList) {
      if (!this._model) { return; }
      this._model.setChatList(chatList);
    },
    isAutoScroll: function() {
      return this._autoScroll;
    },
    getLanguage: function() {
      return this._language || 'ja_JP';
    },
    getThreadInfo: function() {
      return this._threadInfo;
    },
    setLanguage: function(lang) {
      if (lang !== this._language) {
        this._language = lang;
        this.emit('update');
      }
    },
    toggleScroll: function(v) {
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
    },
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      if (key !== 'vpos') {
        this.toggleScroll(false);
      }
    },
    setCurrentTime: function(sec) {
      if (!this._view) {
        return;
      }
      if (!this._autoScroll) {
        return;
      }
      this._model.setCurrentTime(sec);
    }
  });

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

      ZenzaWatch.debug.timeMachineView = this;

      window.setInterval(this._bound._onTimer, 3 * 1000);
    }

    _initDom(...args) {
      super._initDom(...args);

      const v = this._shadow || this._view;
      Object.assign(this._elm, {
        time:   v.querySelector('.dateTime'),
        back:   v.querySelector('.backToTheFuture'),
        input:  v.querySelector('.dateTimeInput'),
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
      //window.console.info('TimeMachineView update', threadInfo);
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
      if (isNaN(this._currentTimestamp)) { return; }
      this._elm.time.textContent = this._currentTime = this._toDate(this._currentTimestamp);
    }

    openSelect() {
      const input = this._elm.input;
      const now = this._toTDate(Date.now());
      input.setAttribute('max', now);
      input.setAttribute('value', this._toTDate(this._currentTimestamp));
      input.setAttribute('min', this._toTDate(this._videoPostTime));
      this.setState({isSelecting: true});
      window.setTimeout(() => { input.focus(); }, 0);
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
      if (this._state.isWaybackMode) { return; }
      let now = Date.now();
      let str = this._toDate(now);

      if (this._currentTime === str) { return; }
      this._currentTimestamp = now;
      this._updateTimestamp();
    }

    _padTime(time) {
      let pad = (v) => { return (v * 1 + 100).toString().substr(1); };
      let dt   = new Date(time);
      return {
        yyyy: dt.getFullYear(),
        mm:   pad(dt.getMonth() + 1),
        dd:   pad(dt.getDate()),
        h:    pad(dt.getHours()),
        m:    pad(dt.getMinutes()),
        s:    pad(dt.getSeconds())
      };
    }

    _toDate(time) {
      let {yyyy, mm, dd, h, m} =  this._padTime(time);
      return `${yyyy}/${mm}/${dd} ${h}:${m}`;
    }

    _toTDate(time) {
      let {yyyy, mm, dd, h, m, s} =  this._padTime(time);
      return `${yyyy}-${mm}-${dd}T${h}:${m}:${s}`;
    }

    _onSubmit() {
      const val = this._elm.input.value;
      if (!val || !/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(|:\d\d)$/.test(val)) { return; }
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

  TimeMachineView.__tpl__ = (`<div class="TimeMachineView"></div>`).trim();




  var VideoListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListModel.prototype, AsyncEmitter.prototype);
  _.assign(VideoListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._maxItems = params.maxItems || 100;

      this._boundOnItemUpdate = this._onItemUpdate.bind(this);
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }

      this.emit('update', this._items, true);
    },
    clear: function() {
      this.setItem([]);
    },
    insertItem: function(itemList, index) {
      //window.console.log('insertItem', itemList, index);
      itemList = _.isArray(itemList) ? itemList : [itemList];
      if (itemList.length < 1) { return; }
      index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));

      Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));

      if (this._isUniq) {
        _.each(itemList, (i) => { this.removeSameWatchId(i); });
      }

      this._items.splice(this._maxItems);
      this.emit('update', this._items);

      return this.indexOf(itemList[0]);
    },
    appendItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      this._items = this._items.concat(itemList);

      if (this._isUniq) {
        _.each(itemList, (i) => { this.removeSameWatchId(i); });
      }

      while (this._items.length > this._maxItems) { this._items.shift(); }
      this.emit('update', this._items);

      return this._items.length - 1;
    },
    updateItem: function(index, videoInfo) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      target.updateByVideoInfo(videoInfo);
    },
    removeItemByIndex: function(index) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      this._items = _.reject(this._items, function(item) { return item === target; });
    },
    removePlayedItem: function() {
      var beforeLen = this._items.length;
      this._items =
        _.reject(this._items, function(item) { return !item.isActive() && item.isPlayed(); });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    resetPlayedItemFlag: function() {
      _.each(this._items, function(item) {
        if (item.isPlayed()) {
          item.setIsPlayed(false);
        }
      });
      this.onUpdate();
    },
    removeNonActiveItem: function() {
      var beforeLen = this._items.length;
      this._items = _.reject(this._items, function(item) { return !item.isActive(); });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    shuffle: function() {
      this._items = _.shuffle(this._items);
      this.emit('update', this._items);
    },
    getLength: function() {
      return this._items.length;
    },
    _getItemByIndex: function(index) {
      var item = this._items[index];
      return item;
    },
    indexOf: function(item) {
      return _.indexOf(this._items, item);
    },
    getItemByIndex: function(index) {
      var item = this._getItemByIndex(index);
      if (!item) { return null; }
      if (!item.hasBind) {
        item.hasBind = true;
        item.on('update', this._boundOnItemUpdate);
      }
      return item;
    },
    findByItemId: function(itemId) {
      itemId = parseInt(itemId, 10);
      return _.find(this._items, (item) => {
        if (item.getItemId() === itemId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', this._boundOnItemUpdate);
          }
          return true;
        }
      });
    },
    findByWatchId: function(watchId) {
      watchId = watchId + '';
      return _.find(this._items, (item) => {
        if (item.getWatchId() === watchId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', this._boundOnItemUpdate);
          }
          return true;
        }
      });
    },
    findActiveItem: function() {
      return _.find(this._items, (item) => {
        return item.isActive();
      });
    },
    removeItem: function(item) {
      var beforeLen = this._items.length;
      _.pull(this._items, item);
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    /**
     * パラメータで指定されたitemと同じwatchIdのitemを削除
     */
    removeSameWatchId: function(item) {
      const watchId = item.getWatchId();
      const beforeLen = this._items.length;
      _.remove(this._items, i => {
        return item !== i && i.getWatchId() === watchId;
      });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    uniq: function(item) {
      this._items.forEach((i) => {
        if (i === item) { return; }
        this.removeSameWatchId(i);
      });
    },
    _onItemUpdate: function(item, key, value) {
      this.emit('itemUpdate', item, key, value);
    },
    getTotalDuration: function() {
      return _.reduce(this._items, function(result, item) {
        return result + item.getDuration();
      }, 0);
    },
    serialize: function() {
      return _.reduce(this._items, function(result, item) {
        result.push(item.serialize());
        return result;
      }, []);
    },
    unserialize: function(itemDataList) {
      var items = [];
      _.each(itemDataList, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      this.setItem(items);
    },
    sortBy: function(key, isDesc) {
      var table = {
        watchId:  'getWatchId',
        duration: 'getDuration',
        title:    'getSortTitle',
        comment:  'getCommentCount',
        mylist:   'getMylistCount',
        view:     'getViewCount',
        postedAt: 'getPostedAt',
      };
      var func = table[key];
      //window.console.log('sortBy', key, func, isDesc);
      if (!func) { return; }
      this._items = _.sortBy(this._items, function(item) { return item[func](); });
      if (isDesc) {
        this._items.reverse();
      }
      this.onUpdate();
    },
    onUpdate: function() {
      this.emitAsync('update', this._items);
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var VideoListView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  VideoListView.__css__ = '';

  VideoListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
    min-height: 100%;
  }

  body.drag-over>* {
    opacity: 0.5;
    pointer-events: none;
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
    overflow-y: auto;
  }

  #listContainerInner {
    scroll-behavior: smooth;
  }


</style>
<style id="listItemStyle">%CSS%</style>
<body>
<div id="listContainer">
  <div id="listContainerInner"></div>
</div>
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>

  `).trim();

  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  _.assign(VideoListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder || VideoListItemView;
      this._itemCss     = params.itemCss || VideoListItemView.__css__;
      this._className   = params.className || 'videoList';
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._htmlCache = {};
      this._maxItems = params.max || 100;
      this._dragdrop = _.isBoolean(params.dragdrop) ? params.dragdrop : false;
      this._dropfile = _.isBoolean(params.dropfile) ? params.dropfile : false;

      this._model = params.model;
      if (this._model) {
        this._model.on('update',     _.debounce(this._onModelUpdate.bind(this), 100));
        this._model.on('itemUpdate', this._onModelItemUpdate.bind(this));
      }
      
      this._isLazyLoadImage = window.IntersectionObserver ? true : false;
      this._hasLazyLoad = {};

      this._initializeView(params);
    },
    _initializeView: function(params) {
      var html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
      this._frame = new FrameLayer({
        $container: params.$container,
        html: html,
        className: 'videoListFrame'
      });
      this._frame.on('load', this._onIframeLoad.bind(this));
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      var $win = this._$window = $(w);
      var $body = this._$body = $(doc.body);
      if (this._className) {
        $body.addClass(this._className);
      }

      this._$container = $body.find('#listContainer');
      var $list = this._$list = $(doc.getElementById('listContainerInner'));
      if (this._html) {
        $list.html(this._html);
        this._setInviewObserver();
      }
      $body.on('click', this._onClick.bind(this));
      $body.on('dblclick', this._onDblclick.bind(this));
      $body.on('keydown', function(e) {
        ZenzaWatch.emitter.emit('keydown', e);
      });
      $body.on('keyup', function(e) {
        ZenzaWatch.emitter.emit('keyup', e);
      });

      if (this._dragdrop) {
        $body.on('mousedown', this._onBodyMouseDown.bind(this));
      }

      if (this._dropfile) {
        $body
          .on('dragover',  this._onBodyDragOverFile .bind(this))
          .on('dragenter', this._onBodyDragEnterFile.bind(this))
          .on('dragleave', this._onBodyDragLeaveFile.bind(this))
          .on('drop',      this._onBodyDropFile     .bind(this));
      }

      MylistPocketDetector.detect().then((pocket) => {
        this._pocket = pocket;
        $body.addClass('is-pocketReady');
      });
    },
    _onBodyMouseDown: function(e) {
      var $item = $(e.target).closest('.videoItem');
      if ($item.length < 1) { return; }
      if ($(e.target).closest('.command').length > 0) { return; }
      this._$dragging = $item;
      this._dragOffset = {
        x: e.pageX,
        y: e.pageY,
        st: this.scrollTop()
      };
      this._$dragTarget = null;
      this._$body.find('.dragover').removeClass('dragover');
      this._bindDragStartEvents();
    },
    _bindDragStartEvents: function() {
      this._$body
        .on('mousemove.drag',  this._onBodyMouseMove .bind(this))
        .on('mouseup.drag',    this._onBodyMouseUp   .bind(this))
        .on('blur.drag',       this._onBodyBlur      .bind(this))
        .on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
    },
    _unbindDragStartEvents: function() {
      this._$body
        .off('mousemove.drag')
        .off('mouseup.drag')
        .off('blur.drag')
        .off('mouseleave.drag');
    },
    _onBodyMouseMove: function(e) {
      if (!this._$dragging) { return; }
      var l = e.pageX - this._dragOffset.x;
      var r = e.pageY - this._dragOffset.y + (this.scrollTop() - this._dragOffset.st);
      var translate = ['translate(', l, 'px, ', r, 'px)'].join('');

      if (l * l + r * r < 100) { return; }

      this._$body.addClass('dragging');
      this._$dragging
        .addClass('dragging')
        .css('transform', translate);

      this._$body.find('.dragover').removeClass('dragover');
      var $target = $(e.target).closest('.videoItem');
      if ($target.length < 1) { return; }
      this._$dragTarget = $target.addClass('dragover');
    },
    _onBodyMouseUp: function(e) {
      this._unbindDragStartEvents();

      var $dragging = this._$dragging;
      this._endBodyMouseDragging();
      if (!$dragging) { return; }

      var $target = $(e.target).closest('.videoItem');
      if ($target.length < 1) { $target = this._$dragTarget; }
      if (!$target || $target.length < 1) { return; }
      var srcId = $dragging.attr('data-item-id'), destId = $target.attr('data-item-id');
      if (srcId === destId) { return; }

      $dragging.css({opacity: 0});
      this.emit('moveItem', srcId, destId);
    },
    _onBodyBlur: function() {
      this._endBodyMouseDragging();
    },
    _onBodyMouseLeave: function() {
      this._endBodyMouseDragging();
    },
    _endBodyMouseDragging: function() {
      this._unbindDragStartEvents();
      this._$body.removeClass('dragging');

      this._$dragTarget = null;
      this._$body.find('.dragover').removeClass('dragover');
      if (this._$dragging) {
        this._$dragging.removeClass('dragging').css('transform', '');
      }
      this._$dragging = null;
    },
    _onBodyDragOverFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.addClass('drag-over');
    },
    _onBodyDragEnterFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.addClass('drag-over');
    },
    _onBodyDragLeaveFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.removeClass('drag-over');
    },
    _onBodyDropFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$body.removeClass('drag-over');

      var file = e.originalEvent.dataTransfer.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('filedrop', ev.target.result, file.name);
      };

      fileReader.readAsText(file);
    },
    _onModelUpdate: function(itemList, replaceAll) {
      window.console.time('update playlistView');
      this.addClass('updating');
      itemList = _.isArray(itemList) ? itemList: [itemList];
      var itemViews = [], Builder = this._ItemBuilder;

      if (replaceAll) { this._htmlCache = {}; }

      itemList.forEach((item) => {
        var id = item.getItemId();
        if (this._htmlCache[id]) {
          //window.console.log('from cache');
          itemViews.push(this._htmlCache[id]);
        } else {
          var isLazy = this._isLazyLoadImage && !this._hasLazyLoad[item.getWatchId()];
          var tpl = this._htmlCache[id] = (new Builder({
            item: item,
            isLazyLoadImage: isLazy
          })).toString();
          itemViews.push(tpl);
        }
      });

      this._html = itemViews.join('');

      window.setTimeout(() => {
        if (this._$list) { this._$list.html(this._html); }
        this._setInviewObserver();
      }, 0);

      window.setTimeout(() => {
        this.removeClass('updating');
        this.emit('update');
      }, 100);
      window.console.timeEnd('update playlistView');
    },
    _setInviewObserver: function() {
      if (!this._isLazyLoadImage || !this._document) { return; }
      if (this._intersectionObserver) {
        this._intersectionObserver.disconnect();
      }
      var onInview;
      if (!this._onImageInview_bind) {
        this._onImageInview_bind = this._onImageInview.bind(this);
      }
      onInview = this._onImageInview_bind;
      var observer = this._intersectionObserver = new window.IntersectionObserver(onInview);
      var images = this._document.querySelectorAll('img.lazy-load');
      for (var i = 0, len = images.length; i < len; i++) {
        observer.observe(images[i]);
      }
    },
    _onImageInview: function(entries) {
      var observer = this._intersectionObserver;
      for (var i = 0, len = entries.length; i < len; i++) {
        var entry = entries[i];
        var image = entry.target;
        var $image = $(image);
        var src = $image.attr('data-src');
        var watchId = $image.attr('data-watch-id');
        var itemId = $image.attr('data-item-id');
        $image.removeClass('lazy-load');
        observer.unobserve(image);

        if (!src) { continue; }
        $image.attr('src', src);
        if (watchId) { this._hasLazyLoad[watchId] = true; }
        if (itemId) { this._htmlCache[itemId] = null; }
      }
    },
    _onModelItemUpdate: function(item, key, value) {
      //window.console.log('_onModelItemUpdate', item, item.getItemId(), item.getTitle(), key, value);
      if (!this._$body) { return; }
      var itemId = item.getItemId();
      var $item = this._$body.find('.videoItem.item' + itemId);

      this._htmlCache[itemId] = (new this._ItemBuilder({item: item})).toString();
      if (key === 'active') {
        this._$body.find('.videoItem.active').removeClass('active');

        $item.toggleClass('active', value);
        //if (value) { this.scrollToItem(itemId); }

      } else if (key === 'updating' || key === 'played') {
        $item.toggleClass(key, value);
      } else {
        var $newItem = $(this._htmlCache[itemId]);
        $item.before($newItem);
        $item.remove();
      }
    },
    _onClick: function(e) {
      e.stopPropagation();
      ZenzaWatch.emitter.emitAsync('hideHover');
      var $target = $(e.target).closest('.command');
      var $item = $(e.target).closest('.videoItem');
      if ($target.length > 0) {
        e.stopPropagation();
        e.preventDefault();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        var itemId  = $item.attr('data-item-id');
        switch (command) {
          case 'deflistAdd':
            this.emit('deflistAdd', param, itemId);
            break;
          case 'playlistAppend':
            this.emit('playlistAppend', param, itemId);
            break;
          case 'pocket-info':
            window.setTimeout(() => { this._pocket.external.info(param); }, 100);
            break;
          case 'scrollToTop':
            this.scrollTop(0, 300);
            break;
          case 'playlistRemove':
            $item.remove();
            this.emit('command', command, param, itemId);
            break;
          default:
            this.emit('command', command, param, itemId);
        }
      }
    },
    _onDblclick: function(e) {
      var $target = $(e.target).closest('.command');
      var command = $target.attr('data-command');
      if (!command) {
        this.emit('dblclick', e);
      } else {
        e.stopPropagation();
      }
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      if (!this._$body) { return; }
      this._$body.toggleClass(className, v);
    },
    scrollTop: function(v) {
      if (!this._$container) { return 0; }
      if (typeof v === 'number') {
        this._$container.scrollTop(v);
      } else {
        return this._$container.scrollTop();
      }
    },
    scrollToItem: function(itemId) {
      if (!this._$body) { return; }
      if (_.isFunction(itemId.getItemId)) { itemId = itemId.getItemId(); }
      var $target = this._$body.find('.item' + itemId);
      if ($target.length < 1) { return; }
      var top = Math.max(0, $target.offset().top - 8 + this.scrollTop());
      this.scrollTop(top);
    }
  });

  // なんか汎用性を持たせようとして失敗してる奴
  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);

  VideoListItemView.ITEM_HEIGHT = 100;
  VideoListItemView.THUMBNAIL_WIDTH  = 96;
  VideoListItemView.THUMBNAIL_HEIGHT = 72;

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  VideoListItemView.__css__ = (`
    * {
      box-sizing: border-box;
    }

    body {
      background: #333;
      overflow-x: hidden;
      counter-reset: video;
    }

    #listContainer::-webkit-scrollbar {
      background: #222;
    }

    #listContainer::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    #listContainer::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }

    .scrollToTop {
      position: fixed;
      width: 32px;
      height: 32px;
      right: 32px;
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

    .scrollToTop:hover {
      opacity: 0.9;
      box-shadow: 0 0 8px #fff;
    }

    .videoItem {
      position: relative;
      display: inline-block;
      width: 100%;
      height: ${VideoListItemView.ITEM_HEIGHT}px;
      overflow: hidden;
      transition:
        transform 0.4s ease, box-shadow 0.4s ease,
        margin-left 0.4s ease, margin-top 0.4s ease;
    }

    .playlist .videoItem {
      cursor: move;
    }


    .playlist .videoItem::before {
        content: counter(video);
        counter-increment: video;
        position: absolute;
        right: 8px;
        top: 80%;
        color: #666;
        font-family: Impact;
        font-size: 45px;
        pointer-events: none;
        z-index: 1;
        line-height: ${VideoListItemView.ITEM_HEIGHT}px;
        opacity: 0.6;

        transform: translate(0, -50%);
    }

    .videoItem.updating {
      opacity: 0.5;
      cursor: wait;
    }

    .videoItem.dragging {
      pointer-events: none;
      box-shadow: 8px 8px 4px #000;
      background: #666;
      opacity: 0.8;
      transition:
        box-shadow 0.4s ease,
        margin-left 0.4s ease, margin-top 0.4s ease;
      z-index: 10000;
    }

    body.dragging * {
      cursor: move;
    }

    body.dragging .videoItem.dragover {
      outline: 5px dashed #99f;
    }

    body.dragging .videoItem.dragover * {
      opacity: 0.3;
    }

    body:not(.is-pocketReady) .pocket-info {
      display: none !important;
    }


    .videoItem + .videoItem {
      border-top: 1px dotted #888;
      margin-top: 4px;
      outline-offset: -8px;
    }

    .separator + .videoItem {
      border-top: 1px dotted #333;
    }

    .videoItem .thumbnailContainer {
      position: absolute;
      top: 0;
      left: 0;
      width:  ${VideoListItemView.THUMBNAIL_WIDTH}px;
      height: ${VideoListItemView.THUMBNAIL_HEIGHT}px;
      margin: 4px 4px 0;
    }

    .videoItem .thumbnailContainer .thumbnail {
      transition: box-shaow 0.4s ease, outline 0.4s ease, transform 0.4s ease;
      width:  ${VideoListItemView.THUMBNAIL_WIDTH}px;
      height: ${VideoListItemView.THUMBNAIL_HEIGHT}px;
    }

    .videoItem .thumbnailContainer .thumbnail:active {
      box-shadow: 0 0 8px #f99;
      transform: translate(0, 4px);
      transition: none;
    }


    .videoItem .thumbnailContainer .playlistAppend,
    .videoItem .playlistRemove,
    .videoItem .thumbnailContainer .deflistAdd,
    .videoItem .thumbnailContainer .pocket-info {
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
      transition: transform 0.2s;
    }
    .videoItem .thumbnailContainer .playlistAppend {
      left: 0;
      bottom: 0;
    }
    .videoItem .playlistRemove {
      right: 8px;
      top: 0;
    }
    .videoItem .thumbnailContainer .deflistAdd {
      right: 0;
      bottom: 0;
    }
    .videoItem .thumbnailContainer .pocket-info {
      right: 24px;
      bottom: 0;
    }
    .playlist .videoItem .playlistAppend {
      display: none !important;
    }
    .videoItem .playlistRemove {
      display: none;
    }
    .playlist .videoItem:not(.active):hover .playlistRemove {
      display: inline-block;
    }


    .playlist .videoItem:not(.active):hover .playlistRemove,
    .videoItem:hover .thumbnailContainer .playlistAppend,
    .videoItem:hover .thumbnailContainer .deflistAdd,
    .videoItem:hover .thumbnailContainer .pocket-info {
      display: inline-block;
      border: 1px outset;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:hover,
    .videoItem:hover .thumbnailContainer .playlistAppend:hover,
    .videoItem:hover .thumbnailContainer .deflistAdd:hover,
    .videoItem:hover .thumbnailContainer .pocket-info:hover {
      transform: scale(1.5);
      box-shadow: 2px 2px 2px #000;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:active,
    .videoItem:hover .thumbnailContainer .playlistAppend:active,
    .videoItem:hover .thumbnailContainer .deflistAdd:active,
    .videoItem:hover .thumbnailContainer .pocket-info:active {
      transform: scale(1.3);
      border: 1px inset;
      transition: none;
    }

    .videoItem.updating .thumbnailContainer .deflistAdd {
      transform: scale(1.0) !important;
      border: 1px inset !important;
      pointer-events: none;
    }

    .videoItem .thumbnailContainer .duration {
      position: absolute;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      font-size: 12px;
      color: #fff;
    }
    .videoItem:hover .thumbnailContainer .duration {
      display: none;
    }

    .videoItem .videoInfo {
      posigion: absolute;
      top: 0;
      margin-left: 104px;
      height: 100%;
    }

    .videoItem .postedAt {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem.played .postedAt::after {
      content: ' ●';
      font-size: 10px;
    }

    .videoItem .counter {
      position: absolute;
      top: 80px;
      width: 100%;
      text-align: center;
    }

    .videoItem .title {
      height: 52px;
      overflow: hidden;
    }

    .videoItem .videoLink {
      font-size: 14px;
      color: #ff9;
      transition: background 0.4s ease, color 0.4s ease;
    }
    .videoItem .videoLink:visited {
      color: #ffd;
    }

    .videoItem .videoLink:active {
      color: #fff;
      background: #663;
      transition: none;
    }


    .videoItem.noVideoCounter .counter {
      display: none;
    }
    .videoItem .counter {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem .counter .value {
      font-weight: bolder;
    }
    .videoItem .counter .count {
      white-space: nowrap;
    }
    .videoItem .counter .count + .count {
      margin-left: 8px;
    }

    .videoItem.active {
      /*outline: dashed 2px #ff8;
      outline-offset: 4px;*/
      border: none !important;
      background: #776;
    }

    @keyframes dropbox {
        0% {  }
        5% {  opacity: 0.8; }
       99% { box-shadow: 8px 8px 8px #000;
             transform: translate(0, 500px); opacity: 0.5; }
      100% { opacity: 0; }
    }

    .videoItem.deleting {
      pointer-events: none;
      animation-name: dropbox;
      animation-iteration-count: 1;
      animation-timing-function: ease-in;
      animation-duration: 0.5s;
      animation-fill-mode: forwards;
    }

    @media screen and (min-width: 600px)
    {
      #listContainerInner {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }

      .videoItem {
        margin: 0 8px;
        border-top: none !important;
        border-bottom: 1px dotted #888;
      }
    }

  `).trim();

  VideoListItemView.__tpl__ = (`
    <div class="videoItem %className% watch%watchId% item%itemId% %active% %updating% %played%"
      data-item-id="%itemId%"
      data-watch-id="%watchId%">
      <span class="command playlistRemove" data-command="playlistRemove" data-param="%watchId%" title="プレイリストから削除">×</span>
      <div class="thumbnailContainer">
        <a href="//www.nicovideo.jp/watch/%watchId%" class="command" data-command="select" data-param="%itemId%">
          <img class="thumbnail %isLazy%" %src%="%thumbnail%" data-watch-id="%watchId%" data-item-id="%itemId%">
          <span class="duration">%duration%</span>
          <span class="command playlistAppend" data-command="playlistAppend" data-param="%watchId%" title="プレイリストに追加">▶</span>
          <span class="command deflistAdd" data-command="deflistAdd" data-param="%watchId%" title="とりあえずマイリスト">&#x271A;</span>
          <span class="command pocket-info" data-command="pocket-info" data-param="%watchId%" title="動画情報">？</span>
        </a>
      </div>
      <div class="videoInfo">
        <div class="postedAt">%postedAt%</div>
        <div class="title">
          <a href="//www.nicovideo.jp/watch/%watchId%" class="command videoLink" data-command="select" data-param="%itemId%" title="%videoTitle%">
            %videoTitle%
          </a>
        </div>
      </div>
      <div class="counter">
        <span class="count">再生: <span class="value">%viewCount%</span></span>
        <span class="count">コメ: <span class="value">%commentCount%</span></span>
        <span class="count">マイ: <span class="value">%mylistCount%</span></span>
      </div>
   </div>
  `).trim();

  _.assign(VideoListItemView.prototype, {
    initialize: function(params) {
      this.watchId = params.watchId;
      this._item = params.item;
      this._isLazy = _.isBoolean(params.isLazyLoadImage) ? params.isLazyLoadImage : false;
    },
    build: function() {
      var tpl = VideoListItemView.__tpl__;
      var item = this._item;

      // 動画タイトルはあらかじめエスケープされている。
      // ・・・のだが、データのいいかげんさから見て、
      // 本当に全部やってあるの？って信用できない。(古い動画は特にいいかげん)
      // なので念のためescapeしておく。過剰エスケープになっても気にしない
      var title = util.escapeToZenkaku(item.getTitle());
      var esc = util.escapeHtml;

      var count = item.getCount();
      //window.console.log('item', item, item.getThumbnail());
      tpl = tpl
        .replace(/%active%/g,     item.isActive() ? 'active' : '')
        .replace(/%played%/g,     item.isPlayed() ? 'played' : '')
        .replace(/%updating%/g,   item.isUpdating() ? 'updating' : '')
        .replace(/%watchId%/g,    esc(item.getWatchId()))
        .replace(/%itemId%/g,     parseInt(item.getItemId(), 10))
        .replace(/%postedAt%/g,   esc(item.getPostedAt()))
        .replace(/%videoTitle%/g, title)
        .replace(/%thumbnail%/g,  esc(item.getThumbnail() || ''))
        .replace(/%duration%/g,   this._secToTime(item.getDuration()))
        .replace(/%viewCount%/g,    this._addComma(count.view))
        .replace(/%commentCount%/g, this._addComma(count.comment))
        .replace(/%mylistCount%/g,  this._addComma(count.mylist))
        .replace(/%isLazy%/g,  this._isLazy ? 'lazy-load' : '')
        .replace(/%src%/g,  this._isLazy ? 'data-src' : 'src')
        .replace(/%className%/g, '')
        ;
      return tpl;
    },
    getWatchId: function() {
      return this._item.getWatchId();
    },
    toString: function() {
      return this.build();
    },
    _secToTime: function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    },
    _addComma: function(m) {
      if (isNaN(m)) { return '---'; }
      return m.toLocaleString ? m.toLocaleString() : ZenzaWatch.util.escapeHtml(m);
    }
  });

  var VideoListItem = function() { this.initialize.apply(this, arguments); };
  VideoListItem._itemId = 0;
  VideoListItem.createByThumbInfo = function(info) {
    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.id,
      title:          info.title,
      length_seconds: info.duration,
      num_res:        info.commentCount,
      mylist_counter: info.mylistCount,
      view_counter:   info.viewCount,
      thumbnail_url:  info.thumbnail,
      first_retrieve: info.postedAt,

      tags:           info.tagList,
      movieType:      info.movieType,
      owner:          info.owner,
      lastResBody:    info.lastResBody
    });
  };

  VideoListItem.createBlankInfo = function(id) {
    var postedAt = '0000/00/00 00:00:00';
    if (!isNaN(id)) {
      postedAt = util.dateToString(new Date(id * 1000));
    }
    return new VideoListItem({
      _format:        'blank',
      id:             id,
      title:          id + '(動画情報不明)',
      length_seconds: 0,
      num_res:        0,
      mylist_counter: 0,
      view_counter:   0,
      thumbnail_url:  '//uni.res.nimg.jp/img/user/thumb/blank_s.jpg',
      first_retrieve: postedAt,
    });
  };

  VideoListItem.createByMylistItem = function(item) {
    if (item.item_data) {
      var item_data = item.item_data || {};
      return new VideoListItem({
        _format:        'mylistItemOldApi',
        id:             item_data.watch_id,
        title:          item_data.title,
        length_seconds: item_data.length_seconds,
        num_res:        item_data.num_res,
        mylist_counter: item_data.mylist_counter,
        view_counter:   item_data.view_counter,
        thumbnail_url:  item_data.thumbnail_url,
        first_retrieve: util.dateToString(new Date(item_data.first_retrieve * 1000)),

        videoId:        item_data.video_id,
        lastResBody:    item_data.last_res_body,
        mylistItemId:   item.item_id,
        item_type:      item.item_type
      });
    }

    // APIレスポンスの統一されてなさよ・・・
    if (!item.length_seconds && _.isString(item.length)) {
      var tmp = item.length.split(':');
      item.length_seconds = tmp[0] * 60 + tmp[1] * 1;
    }
    return new VideoListItem({
      _format:        'mylistItemRiapi',
      id:             item.id,
      title:          item.title,
      length_seconds: item.length_seconds,
      num_res:        item.num_res,
      mylist_counter: item.mylist_counter,
      view_counter:   item.view_counter,
      thumbnail_url:  item.thumbnail_url,
      first_retrieve: item.first_retrieve,

      lastResBody:    item.last_res_body,
    });
  };

  VideoListItem.createByVideoInfoModel = function(info) {
    var count = info.count;

    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.watchId,
      title:          info.title,
      length_seconds: info.duration,
      num_res:        count.comment,
      mylist_counter: count.mylist,
      view_counter:   count.view,
      thumbnail_url:  info.thumbnail,
      first_retrieve: info.postedAt,

      owner:          info.ownerInfo
    });
  };


  _.extend(VideoListItem.prototype, AsyncEmitter.prototype);
  _.assign(VideoListItem.prototype, {
    initialize: function(rawData) {
      this._rawData = rawData;
      this._itemId = VideoListItem._itemId++;
      this._isActive = false;
      this._isUpdating = false;
      this._isPlayed = !!rawData.played;
      rawData.first_retrieve = util.dateToString(rawData.first_retrieve);

      this._sortTitle = this.getTitle()
        .replace(/([0-9]{1,9})/g, (m) => { return '0'.repeat(10 - m.length) + m; })
        .replace(/([０-９]{1,9})/g, (m) => { return '０'.repeat(10 - m.length) + m; });
    },
    _getData: function(key, defValue) {
      return this._rawData.hasOwnProperty(key) ?
        this._rawData[key] : defValue;
    },
    getItemId: function() {
      return this._itemId;
    },
    getWatchId: function() {
      return (this._getData('id', '') || '').toString();
    },
    getTitle: function() {
      return this._getData('title', '');
    },
    getSortTitle: function() {
      return this._sortTitle;
    },
    getDuration: function() {
      return parseInt(this._getData('length_seconds', '0'), 10);
    },
    getCount: function() {
      return {
        comment: parseInt(this._rawData.num_res,        10),
        mylist:  parseInt(this._rawData.mylist_counter, 10),
        view:    parseInt(this._rawData.view_counter,   10)
      };
    },
    getCommentCount: function() { return parseInt(this._rawData.num_res,        10); },
    getMylistCount:  function() { return parseInt(this._rawData.mylist_counter, 10); },
    getViewCount:    function() { return parseInt(this._rawData.view_counter,   10); },
    getThumbnail: function() {
      return this._rawData.thumbnail_url;
    },
    getBetterThumbnail: function() {
      var watchId = this.getWatchId();
      var hasLargeThumbnail = util.hasLargeThumbnail(watchId);
      return this._rawData.thumbnail + (hasLargeThumbnail ? '.L' : '');
    },
    getPostedAt: function() {
      return this._rawData.first_retrieve;
    },
    isActive: function() {
      return this._isActive;
    },
    setIsActive: function(v) {
      v = !!v;
      if (this._isActive !== v) {
        this._isActive = v;
        this.emit('update', this, 'active', v);
      }
    },
    isUpdating: function() {
      return this._isUpdating;
    },
    setIsUpdating: function(v) {
      v = !!v;
      if (this._isUpdating !== v) {
        this._isUpdating = v;
        this.emit('update', this, 'updating', v);
      }
    },
    isPlayed: function() {
      return this._isPlayed;
    },
    setIsPlayed: function(v) {
      v = !!v;
      if (this._isPlayed !== v) {
        this._isPlayed = v;
        this.emit('update', this, 'played', v);
      }
    },
    isBlankData: function() {
      return this._rawData._format === 'blank';
    },
    serialize: function() {
      return {
        active:         this._isActive,
        played:         this._isPlayed,
        id:             this._rawData.id,
        title:          this._rawData.title,
        length_seconds: this._rawData.length_seconds,
        num_res:        this._rawData.num_res,
        mylist_counter: this._rawData.mylist_counter,
        view_counter:   this._rawData.view_counter,
        thumbnail_url:  this._rawData.thumbnail_url,
        first_retrieve: this._rawData.first_retrieve,
      };
    },
    updateByVideoInfo: function(videoInfo) {
      const before = JSON.stringify(this.serialize());
      const rawData = this._rawData;
      const count = videoInfo.count;
      rawData.first_retrieve = util.dateToString(videoInfo.postedAt);

      rawData.num_res        = count.comment;
      rawData.mylist_counter = count.mylist;
      rawData.view_counter   = count.view;

      rawData.thumbnail_url = videoInfo.thumbnail;

      if (JSON.stringify(this.serialize()) !== before) {
        this.emit('update', this);
      }
    }
  });

  var VideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoList.prototype, AsyncEmitter.prototype);
  _.assign(VideoList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._model = new VideoListModel({
        uniq: true,
        maxItem: 100
      });

      this._initializeView();
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new VideoListView({
        $container: this._$container,
        model: this._model,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });

      this._view.on('command',        this._onCommand     .bind(this));
      this._view.on('deflistAdd',     this._onDeflistAdd  .bind(this));
      this._view.on('playlistAppend', this._onPlaylistAdd .bind(this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._view.insertItem(items);
    },
    _onCommand: function(command, param) {
      if (command === 'select') {
        var item = this._model.findByItemId(param);
        var watchId = item.getWatchId();
        this.emit('command', 'open', watchId);
        return;
      }
      this.emit('command', command, param);
    },
    _onPlaylistAdd: function(watchId , itemId) {
      this.emit('command', 'playlistAppend', watchId);
      if (this._isUpdatingPlaylist) { return; }
      var item = this._model.findByItemId(itemId);

      const unlock = () => {
        item.setIsUpdating(false);
        this._isUpdatingPlaylist = false;
      };

      item.setIsUpdating(true);
      this._isUpdatingPlaylist = true;

      window.setTimeout(unlock, 1000);
    },
    _onDeflistAdd: function(watchId , itemId) {
      if (this._isUpdatingDeflist) { return; }
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      var item = this._model.findByItemId(itemId);

      const unlock = () => {
        item.setIsUpdating(false);
        this._isUpdatingDeflist = false;
      };

      item.setIsUpdating(true);
      this._isUpdatingDeflist = true;

      var timer = window.setTimeout(unlock, 10000);

      var onSuccess = this._onDeflistAddSuccess.bind(this, timer, unlock);
      var onFail    = this._onDeflistAddFail   .bind(this, timer, unlock);
      return this._thumbInfoLoader.load(watchId).then((info) => {
        var description = '投稿者: ' + info.owner.name;
        return this._mylistApiLoader.addDeflistItem(watchId, description)
          .then(onSuccess, onFail);
      }, () => {
        return this._mylistApiLoader.addDeflistItem(watchId)
          .then(onSuccess, onFail);
      });
    },
    _onDeflistAddSuccess: function(timer, unlock, result) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 500);
      this.emit('command', 'notify', result.message);
    },
    _onDeflistAddFail: function(timer, unlock, err) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 2000);
      this.emit('command', 'alert', err.message);
    }
  });

  var RelatedVideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(RelatedVideoList.prototype, VideoList.prototype);
  _.assign(RelatedVideoList.prototype, {
    update: function(listData, watchId) {
      //window.console.log('RelatedVideoList: ', listData, watchId);
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      listData.forEach(itemData => {
        if (!itemData.has_data) { return; }
        if (!itemData.id) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      //window.console.log('insertItem: ', items);
      this._model.insertItem(items);
      this._view.scrollTop(0);
    },
  });


  var PlaylistModel = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistModel.prototype, VideoListModel.prototype);
  _.assign(PlaylistModel.prototype, {
    initialize: function() {
      this._maxItems = 10000;
      this._items = [];
      this._isUniq = true;

      this._boundOnItemUpdate = this._onItemUpdate.bind(this);
    },
  });

  var PlaylistView = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistView.prototype, AsyncEmitter.prototype);
  PlaylistView.__css__ = (`

    .is-playlistEnable .tabSelect.playlist::after {
      content: '▶';
      color: #fff;
      text-shadow: 0 0 8px orange;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .is-playlistEnable .tabSelect.playlist::after  {
      text-shadow: 0 0 8px #336;
    }

    .playlist-container {
      height: 100%;
      overflow: hidden;
    }

    .playlist-header {
      height: 32px;
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .playlist-menu-button {
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 4px;
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
      /*display: block;*/
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
        <lavel class="playlist-menu-button toggleEnable playlist-command"
          data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</lavel>
        <lavel class="playlist-menu-button toggleLoop playlist-command"
          data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</lavel>

        <div class="playlist-count playlist-command" data-command="toggleMenu">
          <span class="playlist-index"></span> / <span class="playlist-length"></span>
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

  _.assign(PlaylistView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._playlist = params.playlist;


      ZenzaWatch.util.addStyle(PlaylistView.__css__);
      var $view = this._$view = $(PlaylistView.__tpl__);
      this._$container.append($view);

      this._$index  = $view.find('.playlist-index');
      this._$length = $view.find('.playlist-length');
      var $menu     = this._$menu = this._$view.find('.playlist-menu');
      var $fileDrop = this._$fileDrop = $view.find('.playlist-file-drop');
      var $fileSelect = this._$fileSelect = $view.find('.playlist-import-file-select');

      ZenzaWatch.debug.playlistView = this._$view;

      var listView = this._listView = new VideoListView({
        $container: this._$view.find('.playlist-frame'),
        model: this._model,
        className: 'playlist',
        dragdrop: true,
        dropfile: true,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      listView.on('command',    this._onCommand.bind(this));
      listView.on('deflistAdd', this._onDeflistAdd.bind(this));
      listView.on('moveItem', (src, dest) => { this.emit('moveItem', src, dest); });
      listView.on('filedrop', (data) => { this.emit('command', 'importFile', data); });
      listView.on('dblclick', this._onListDblclick.bind(this));

      this._playlist.on('update',
        _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));

      this._$view.on('click', '.playlist-command', this._onPlaylistCommandClick.bind(this));
      ZenzaWatch.emitter.on('hideHover', function() {
        $menu.removeClass('show');
        $fileDrop.removeClass('show');
      });

      $('.zenzaVideoPlayerDialog')
        .on('dragover',  this._onDragOverFile .bind(this))
        .on('dragenter', this._onDragEnterFile.bind(this))
        .on('dragleave', this._onDragLeaveFile.bind(this))
        .on('drop',      this._onDropFile.bind(this));

      $fileSelect.on('change', this._onImportFileSelect.bind(this));

      _.each([
        'addClass',
        'removeClass',
        'scrollTop',
        'scrollToItem',
      ], (func) => {
        this[func] = listView[func].bind(listView);
      });
    },
    toggleClass: function(className, v) {
      this._view.toggleClass(className, v);
      this._$view.toggleClass(className, v);
    },
    _onCommand: function(command, param, itemId) {
      switch (command) {
        default:
          this.emit('command', command, param, itemId);
          break;
      }
    },
    _onDeflistAdd: function(watchId, itemId) {
      this.emit('deflistAdd', watchId, itemId);
    },
    _onPlaylistCommandClick: function(e) {
      var $target = $(e.target).closest('.playlist-command');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      e.stopPropagation();
      if (!command) { return; }
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
          var $view = this._$view;
          $view.addClass('shuffle');
          window.setTimeout(() => { this._$view.removeClass('shuffle'); }, 1000);
          this.emit('command', command, param);
          break;
        default:
          this.emit('command', command, param);
      }
      ZenzaWatch.emitter.emitAsync('hideHover');
    },
    _onPlaylistStatusUpdate: function() {
      var playlist = this._playlist;
      this._$view
        .toggleClass('enable', playlist.isEnable())
        .toggleClass('loop',   playlist.isLoop())
        ;
      this._$index.text(playlist.getIndex() + 1);
      this._$length.text(playlist.getLength());
    },
    _onDragOverFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.addClass('drag-over');
    },
    _onDragEnterFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.addClass('drag-over');
    },
    _onDragLeaveFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.removeClass('drag-over');
    },
    _onDropFile: function(e) {
      e.preventDefault(); e.stopPropagation();
      this._$fileDrop.removeClass('show drag-over');

      var file = e.originalEvent.dataTransfer.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('command', 'importFile', ev.target.result);
      };

      fileReader.readAsText(file);
    },
    _onImportFileSelect: function(e) {
      e.preventDefault();

      var file = e.originalEvent.target.files[0];
      if (!/\.playlist\.json$/.test(file.name)) { return; }

      var fileReader = new FileReader();
      fileReader.onload = (ev) => {
        window.console.log('file data: ', ev.target.result);
        this.emit('command', 'importFile', ev.target.result);
      };

      fileReader.readAsText(file);

    },
    _onListDblclick: function(e) {
      e.stopPropagation();
      this.emit('command', 'scrollToActiveItem');
    }
  });

  var PlaylistSession = (function(storage) {
    var KEY = 'ZenzaWatchPlaylist';
    
    return {
      isExist: function() {
        var data = storage.getItem(KEY);
        if (!data) { return false; }
        try {
          JSON.parse(data);
          return true;
        } catch(e) {
          return false;
        }
      },
      save: function(data) {
        storage.setItem(KEY, JSON.stringify(data));
      },
      restore: function() {
        var data = storage.getItem(KEY);
        if (!data) { return null; }
        try {
          return JSON.parse(data);
        } catch(e) {
          return null;
        }
      }
    };
  })(sessionStorage);

  var Playlist = function() { this.initialize.apply(this, arguments); };
  _.extend(Playlist.prototype, VideoList.prototype);
  _.assign(Playlist.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._index = -1;
      this._isEnable = false;
      this._isLoop = params.loop;

      this._model = new PlaylistModel({});

      ZenzaWatch.debug.playlist = this;
      this.on('update', _.debounce(() => {
        var data = this.serialize();
        PlaylistSession.save(data);
      }, 3000));
    },
    serialize: function() {
      return {
        items: this._model.serialize(),
        index: this._index,
        enable: this._isEnable,
        loop: this._isLoop
      };
    },
    unserialize: function(data) {
      if (!data) { return; }
      this._initializeView();
      console.log('unserialize: ', data);
      this._model.unserialize(data.items);
      this._isEnable = data.enable;
      this._isLoop   = data.loop;
      this.emit('update');
      this.setIndex(data.index);
    },
    restoreFromSession: function() {
      this.unserialize(PlaylistSession.restore());
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new PlaylistView({
        $container: this._$container,
        model: this._model,
        playlist: this,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._view.on('command',    this._onCommand.bind(this));
      this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
      this._view.on('moveItem',   this._onMoveItem.bind(this));
    },
    _onCommand: function(command, param, itemId) {
      var item;
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
        case 'sortBy':
          var tmp = param.split(':');
          this.sortBy(tmp[0], tmp[1] === 'desc');
          break;
        case 'clear':
          this._setItemData([]);
          break;
        case 'select':
          item = this._model.findByItemId(itemId);
          this.setIndex(this._model.indexOf(item));
          this.emit('command', 'openNow', item.getWatchId());
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
          this.scrollToActiveItem();
          break;
        default:
          this.emit('command', command, param);
      }
    },
    _onExportFileCommand: function() {
      var dt = new Date();
      var title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます', 
        util.dateToString(dt) + 'のプレイリスト');
      if (!title) { return; }

      var data = JSON.stringify(this.serialize());

      var blob = new Blob([data], { 'type': 'text/html' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('download', title + '.playlist.json');
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
      a.setAttribute('href', url);
      document.body.appendChild(a);
      a.click();
      window.setTimeout(function() { a.remove(); }, 1000);
    },
    _onImportFileCommand: function(fileData) {
      if (!ZenzaWatch.util.isValidJson(fileData)) { return; }

      //this.emit('command', 'openNow', 'sm20353707');
      this.emit('command', 'pause');
      this.emit('command', 'notify', 'プレイリストを復元');
      this.unserialize(JSON.parse(fileData));

      ZenzaWatch.util.callAsync(function() {
        var index = Math.max(0, fileData.index || 0);
        var item = this._model.getItemByIndex(index);
        if (item) {
          this.setIndex(index, true);
          this.emit('command', 'openNow', item.getWatchId());
        }
      }, this, 2000);
    },
    _onMoveItem: function(srcItemId, destItemId) {
      var srcItem  = this._model.findByItemId(srcItemId);
      var destItem = this._model.findByItemId(destItemId);
      if (!srcItem || !destItem) { return; }
      var destIndex = this._model.indexOf(destItem);
      this._model.removeItem(srcItem);
      this._model.insertItem(srcItem, destIndex);
      this._refreshIndex();
    },
    _setItemData: function(listData) {
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      //window.console.log('_setItemData', listData);
      this._model.setItem(items);
      this.setIndex(items.length > 0 ? 0 : -1);
    },
    _replaceAll: function(videoListItems, options) {
      options = options || {};
      this._model.setItem(videoListItems);
      var item = this._model.findByWatchId(options.watchId);
      if (item) {
        item.setIsActive(true);
        item.setIsPlayed(true);
        this._activeItem = item;
        setTimeout(() => { this._view.scrollToItem(item); }, 1000);
      }
      this.setIndex(this._model.indexOf(item));
    },
    _appendAll: function(videoListItems, options) {
      options = options || {};
      this._model.appendItem(videoListItems);
      var item = this._model.findByWatchId(options.watchId);
      if (item) {
        item.setIsActive(true);
        item.setIsPlayed(true);
        this._refreshIndex(false);
      }
      setTimeout(() => { this._view.scrollToItem(videoListItems[0]); }, 1000);
    },
    loadFromMylist: function(mylistId, options) {
      this._initializeView();

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      window.console.time('loadMylist: ' + mylistId);

      return this._mylistApiLoader
        .getMylistItems(mylistId, options).then((items) => {
          window.console.timeEnd('loadMylist: ' + mylistId);
          var videoListItems = [];
          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            // マイリストはitem_typeがint
            // とりまいはitem_typeがstringっていうね
            if (item.id === null) { return; } // ごく稀にある？idが抹消されたレコード
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url && item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          //window.console.log('videoListItems!!', videoListItems);

          if (videoListItems.length < 1) {
            return Promise.reject({
              status: 'fail',
              message: 'マイリストの取得に失敗しました'
            });
          }
          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
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
    },
    loadUploadedVideo: function(userId, options) {
      this._initializeView();

      if (!this._uploadedVideoApiLoader) {
        this._uploadedVideoApiLoader = new ZenzaWatch.api.UploadedVideoApiLoader();
      }

      window.console.time('loadUploadedVideos' + userId);

      return this._uploadedVideoApiLoader
        .getUploadedVideos(userId, options).then((items) => {
          window.console.timeEnd('loadUploadedVideos' + userId);
          var videoListItems = [];

          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          if (videoListItems.length < 1) {
            return Promise.reject({});
          }

          // 投稿動画一覧は新しい順に渡されるので、プレイリストではreverse＝古い順にする
          videoListItems.reverse();
          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }
          //window.console.log('videoListItems!!', videoListItems);

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
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
    },
    loadSearchVideo: function(word, options, limit = 300) {
      this._initializeView();

      if (!this._searchApiLoader) {
        //this._nicoSearchApiLoader = ZenzaWatch.init.nicoSearchApiLoader;
        this._nicoSearchApiLoader = NicoSearchApiV2Loader;
      }

      window.console.time('loadSearchVideos' + word);
      options = options || {};

      return this._nicoSearchApiLoader
        .searchMore(word, options, limit).then((result) => {
          window.console.timeEnd('loadSearchVideos' + word);
          var items = result.list || [];
          var videoListItems = [];

          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          items.forEach((item) => {
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });

          if (videoListItems.length < 1) {
            return Promise.reject({});
          }

          if (options.playlistSort) {
            // 連続再生のために結果を古い順に並べる
            // 検索対象のソート順とは別
            videoListItems = _.sortBy(
              videoListItems,
              (item) => { return item.getPostedAt(); }
            );
            //videoListItems.reverse();
          }

          if (options.shuffle) {
            videoListItems = _.shuffle(videoListItems);
          }
          //window.console.log('videoListItems!!', videoListItems);

          if (!options.append) {
            this._replaceAll(videoListItems, options);
          } else {
            this._appendAll(videoListItems, options);
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
    },
    insert: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) {
        return Promise.resolve();
      }

      var model = this._model;
      var index = this._index;
      return this._thumbInfoLoader.load(watchId).then((info) => {
        // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        // チャンネル動画はsoXXXXに統一したいのでvideoIdを使う. バッドノウハウ
        info.id = info.isChannel ? info.id : watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        this.emit('command', 'notifyHtml',
          '次に再生: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    insertCurrentVideo: function(videoInfo) {
      this._initializeView();

      if (this._activeItem &&
          !this._activeItem.isBlankData() &&
          this._activeItem.getWatchId() === videoInfo.watchId) {
        this._activeItem.updateByVideoInfo(videoInfo);
        this._activeItem.setIsPlayed(true);
        this.scrollToActiveItem();
        return;
      }

      var currentItem = this._model.findByWatchId(videoInfo.watchId);
      if (currentItem && !currentItem.isBlankData()) {
        currentItem.updateByVideoInfo(videoInfo);
        currentItem.setIsPlayed(true);
        this.setIndex(this._model.indexOf(currentItem));
        this.scrollToActiveItem();
        return;
      }

      var item = VideoListItem.createByVideoInfoModel(videoInfo);
      item.setIsPlayed(true);
      if (this._activeItem) { this._activeItem.setIsActive(false); }
      this._model.insertItem(item, this._index + 1);
      this._activeItem = this._model.findByItemId(item.getItemId());
      this._refreshIndex(true);
    },
    removeItemByWatchId: function(watchId) {
      var item = this._model.findByWatchId(watchId);
      if (!item || item.isActive()) { return; }
      this._model.removeItem(item);
      this._refreshIndex(true);
    },
    append: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) { 
        return Promise.resolve();
      }

      var model = this._model;
      return this._thumbInfoLoader.load(watchId).then((info) => {
         // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        info.id = watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.appendItem(item);
        this._refreshIndex();
        this.emit('update');
        this.emit('command', 'notifyHtml',
          'リストの末尾に追加: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.appendItem(item);
        this._refreshIndex(true);
        this._refreshIndex();

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    getIndex: function() {
      return this._activeItem ? this._index : -1;
    },
    setIndex: function(v, force) {
      v = parseInt(v, 10);
      //window.console.log('setIndex: %s -> %s', this._index, v);
      if (this._index !== v || force) {
        this._index = v;
        //window.console.log('before active', this._activeItem);
        if (this._activeItem) {
          this._activeItem.setIsActive(false);
        }
        this._activeItem = this._model.getItemByIndex(v);
        if (this._activeItem) {
          this._activeItem.setIsActive(true);
        }
        //window.console.log('after active', this._activeItem);
        this.emit('update');
      }
    },
    _refreshIndex: function(scrollToActive) {
      this.setIndex(this._model.indexOf(this._activeItem), true);
      if (scrollToActive) {
        setTimeout(() => {
          this.scrollToActiveItem();
        }, 1000);
      }
    },
    _setIndexByItemId: function(itemId) {
      var item = this._model.findByItemId(itemId);
      if (item) {
        this._setIndexByItem(item);
      }
    },
    _setIndexByItem: function(item) {
      var index = this._model.indexOf(item);
      if (index >= 0) {
        this.setIndex(index);
      }
    },
    getLength: function() {
      return this._model.getLength();
    },
    hasNext: function() {
      var len = this._model.getLength();
      return len > 0 && (this.isLoop() || this._index < len - 1);
    },
    isEnable: function() {
      return this._isEnable;
    },
    isLoop: function() {
      return this._isLoop;
    },
    toggleEnable: function(v) {
      if (!_.isBoolean(v)) {
        this._isEnable = !this._isEnable;
        this.emit('update');
        return;
      }

      if (this._isEnable !== v) {
        this._isEnable = v;
        this.emit('update');
      }
    },
    toggleLoop: function() {
      this._isLoop = !this._isLoop;
      this.emit('update');
    },
    shuffle: function() {
      this._model.shuffle();
      if (this._activeItem) {
        this._model.removeItem(this._activeItem);
        this._model.insertItem(this._activeItem, 0);
        this.setIndex(0);
      } else {
        this.setIndex(-1);
      }
      this._view.scrollTop(0);
    },
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    removePlayedItem: function() {
      this._model.removePlayedItem();
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    removeNonActiveItem: function() {
      this._model.removeNonActiveItem();
      this._refreshIndex(true);
      this.toggleEnable(false);
    },
    selectNext: function() {
      if (!this.hasNext()) { return null; }
      var index = this.getIndex();
      var len = this.getLength();
      if (len < 1) { return null; }

      //window.console.log('selectNext', index, len);
      if (index < -1) {
        this.setIndex(0);
      } else if (index + 1 < len) {
        this.setIndex(index + 1);
      } else if (this.isLoop()) {
        this.setIndex((index + 1) % len);
      }
      return this._activeItem ? this._activeItem.getWatchId() : null;
    },
    selectPrevious: function() {
      var index = this.getIndex();
      var len = this.getLength();
      if (len < 1) { return null; }

      if (index < -1) {
        this.setIndex(0);
      } else if (index > 0) {
        this.setIndex(index - 1);
      } else if (this.isLoop()) {
        this.setIndex((index + len - 1) % len);
      } else {
        return null;
      }

      return this._activeItem ? this._activeItem.getWatchId() : null;
    },
    scrollToActiveItem: function() {
      if (this._activeItem) {
        this._view.scrollToItem(this._activeItem);
      }
    },
    scrollToWatchId: function(watchId) {
      var item = this._model.findByWatchId(watchId);
      if (item) {
        this._view.scrollToItem(item);
      }
    },
    findByWatchId: function(watchId) {
      return this._model.findByWatchId(watchId);
    }
  });



const VideoSession = (function() {
  //const http = require('http');
  //const fetch = require('node-fetch');

  const SMILE_HEART_BEAT_INTERVAL_MS  = 10 * 60 * 1000; // 10min
  const DMC_HEART_BEAT_INTERVAL_MS    = 30 * 1000;      // 30sec

  const CHECK_PAUSE_INTERVAL      = 30 * 1000;
  const SESSION_CLOSE_PAUSE_COUNT = 10;
  const SESSION_CLOSE_FAIL_COUNT  = 3;
  const SESSION_CLOSE_TIME_MS     = 12 * 60 * 1000; // 12min

  const VIDEO_QUALITY = {
    auto: /.*/,
    veryhigh: /_(1080p)$/,
    high: /_(720p)$/,
    mid:  /_(540p|480p)$/,
    low:  /_(360p)$/
  };

  class DmcPostData {
    constructor(dmcInfo, videoQuality) {
      this._dmcInfo = dmcInfo;
      this._videoQuality = videoQuality || 'auto';
    }

    toString() {
      let dmcInfo = this._dmcInfo;

      let videos = [];

      let reg = VIDEO_QUALITY[this._videoQuality] || VIDEO_QUALITY.auto;
      dmcInfo.videos.forEach(format => {
        if (reg.test(format))  { videos.push(format); }
      });
      dmcInfo.videos.forEach( format => {
        if (!reg.test(format)) { videos.push(format); }
      });

      let audios = [];
      dmcInfo.audios.forEach(format => {
        audios.push(format);
      });

      let request = {
        session: {
          client_info: {
            player_id: dmcInfo.playerId
          },
          content_auth: {
            auth_type: 'ht2',
            content_key_timeout: 600 * 1000,
            service_id: 'nicovideo',
            service_user_id: dmcInfo.serviceUserId,
            //max_content_count: 10,
          },
          content_id: dmcInfo.contentId,
          content_src_id_sets: [
            {content_src_ids: [
                {src_id_to_mux: {
                  audio_src_ids: audios,
                  video_src_ids: videos
                }}
              ]
            }
          ],
          content_type: 'movie',
          content_uri: '',
          keep_method: {
            heartbeat: {lifetime: dmcInfo.heartBeatLifeTimeMs}
          },
          priority: dmcInfo.priority,
          protocol: {
            name: 'http',
            parameters: {
              http_parameters: {
                //method: 'GET',
                parameters: {
                  http_output_download_parameters: {
                    use_ssl: 'no',
                    use_well_known_port: 'no',
  //                  file_extension: 'mp4'
                  }
                }
              }
            }
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
  }

  class VideoSession {

    static createInstance(params) {
      if (params.serverType === 'dmc') {
        return new DmcSession(params);
      } else {
        return new SmileSession(params);
      }
    }

    constructor(params) {
      this._videoInfo = params.videoInfo;
      this._videoWatchOptions = params.videoWatchOptions;

      this._isPlaying = params.isPlayingCallback || (() => {});
      this._pauseCount = 0;
      this._failCount  = 0;
      this._lastResponse = '';
      this._videoQuality = params.videoQuality || 'auto';
      this._videoSessionInfo = {};
      this._isDeleted = false;

      this._heartBeatTimer = null;

      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail    = this._onHeartBeatFail.bind(this);
    }

    connect() {
      this._createdAt = Date.now();
      return this._createSession(this._videoInfo);
    }

    enableHeartBeat() {
      this.disableHeartBeat();
      this._heartBeatTimer =
        setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
      this._pauseCheckTimer =
        setInterval(this._onPauseCheckInterval.bind(this), CHECK_PAUSE_INTERVAL);
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
      if (this._pauseCheckTimer) {
        clearInterval(this._pauseCheckTimer);
      }
      this._heartBeatTimer = this._pauseCheckTimer = null;
    }

    _onHeartBeatInterval() {
      if (this._isClosed) { return; }
      this._heartBeat();
    }

    _onHeartBeatSuccess(result) {
      console.log('HeartBeat success');
    }

    _onHeartBeatFail() {
      PopupMessage.debug('HeartBeat fail');
      this._failCount++;
      if (this._failCount >= SESSION_CLOSE_FAIL_COUNT) {
        this.close();
      }
    }

    _onPauseCheckInterval() {
      if (this._isClosed) { return; }
      let isPlaying = this._isPlaying();
      //window.console.log('isPlaying?', isPlaying, this._pauseCount);
      if (!isPlaying) {
        this._pauseCount++;
      } else {
        this._pauseCount = 0;
      }
      //PopupMessage.debug('pause: ' + this._pauseCount);

      // 一定時間停止が続いた and 生成から一定時間経過している場合は破棄
      if (this._pauseCount             >= SESSION_CLOSE_PAUSE_COUNT &&
          Date.now() - this._createdAt >= SESSION_CLOSE_TIME_MS) {
        //PopupMessage.debug('VideoSession closed.');
        this.close();
      }
    }

    close() {
      //PopupMessage.debug('session close');
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
  }

  class DmcSession extends VideoSession {
    constructor(params) {
      super(params);

      this._serverType = 'dmc';
      this._heartBeatInterval = DMC_HEART_BEAT_INTERVAL_MS;
      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail    = this._onHeartBeatFail.bind(this);
    }

    _createSession(videoInfo) {
      let dmcInfo = videoInfo.dmcInfo;
      console.time('create DMC session');
      return new Promise((resolve, reject) => {
        let url = `${dmcInfo.apiUrl}?_format=json`;

        console.log('dmc post', url); //'\n', (new DmcPostData(dmcInfo)).toString());

        util.fetch(url, {
          method: 'post',
          timeout: 10000,
          dataType: 'text',
          body: (new DmcPostData(dmcInfo, this._videoQuality)).toString()
        }).then(res => { return res.json(); })
          .then(json => {
            //console.log('\n\ncreate api result', JSON.stringify(json, null, 2));
            //const json = JSON.parse(result);
            const data = json.data || {}, session = data.session || {};
            let url = session.content_uri;
            let sessionId = session.id;
            let content_src_id_sets = session.content_src_id_sets;
            let videoFormat =
              content_src_id_sets[0].content_src_ids[0].src_id_to_mux.video_src_ids[0];
            let audioFormat =
              content_src_id_sets[0].content_src_ids[0].src_id_to_mux.audio_src_ids[0];

            this._heartBeatUrl =
              `${dmcInfo.apiUrl}/${sessionId}?_format=json&_method=PUT`;
            this._deleteSessionUrl =
              `${dmcInfo.apiUrl}/${sessionId}?_format=json&_method=DELETE`;

            this._lastResponse = data;
            this._videoSessionInfo = {
              type: 'dmc',
              url: url,
              sessionId: sessionId,
              videoFormat: videoFormat,
              audioFormat: audioFormat,
              heartBeatUrl: this._heartBeatUrl,
              deleteSessionUrl: this._deleteSessionUrl,
              lastResponse: json
            };
            //console.info('session info: ', this._videoSessionInfo);
            this.enableHeartBeat();
            console.timeEnd('create DMC session');
            resolve(this._videoSessionInfo);
          }).catch(err => {
            console.error('create api fail', err);
            reject(err);
          });
      });
    }

    _heartBeat() {
      let url = this._videoSessionInfo.heartBeatUrl;
      console.log('HeartBeat', url);
      util.fetch(url, {
        method: 'post',
        dataType: 'text',
        timeout: 10000,
        body: JSON.stringify(this._lastResponse)
      }).then(res => { return res.json(); })
        .then(this._onHeartBeatSuccess)
        .catch(this._onHeartBeatFail);
    }

    _deleteSession() {
      if (this._isDeleted) { return Promise.resolve(); }
      this._isDeleted = true;
      let url = this._videoSessionInfo.deleteSessionUrl;
      return util.fetch(url, {
        method: 'post',
        dataType: 'text',
        timeout: 10000,
        body: JSON.stringify(this._lastResponse)
      }).then(res => res.text())
        .then(() => { console.log('delete success'); })
        .catch(err => { console.error('delete fail', err); });
    }

    _onHeartBeatSuccess(result) {
      console.log('heartbeat success: ', result.meta);
      let json = result;
      this._lastResponse = json.data;
    }
  }

  class SmileSession extends VideoSession {
    constructor(params) {
      super(params);
      this._serverType = 'smile';
      this._heartBeatInterval = SMILE_HEART_BEAT_INTERVAL_MS;
      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail    = this._onHeartBeatFail.bind(this);
    }

    _createSession(videoInfo) {
      this.enableHeartBeat();
      return new Promise((resolve) => {
        let videoUrl = videoInfo.videoUrl;
        return resolve(videoUrl);
      });
    }

    _heartBeat() {
      let url = this._videoInfo.watchUrl;
      let query = [
        'mode=normal',
        'playlist_token=' + this._videoInfo.playlistToken,
        'continue_watching=1'
      ];
      if (this._videoInfo.isEconomy) { query.push('eco=1'); }

      if (query.length > 0) { url += '?' + query.join('&'); }
      window.console.info('heartBeat url', url);

      util.fetch(url, {
        timeout: 10000,
        credentials: 'include'
      }).then(res => { return res.json(); })
      .then(this._onHeartBeatSuccess)
      .catch(this._onHeartBeatFail);
    }

    _deleteSession() {
      if (this._isDeleted) { return Promise.resolve(); }
      this._isDeleted = true;
      return Promise.resolve();
    }

    _onHeartBeatSuccess(result) {
      //console.log('HeartBeatSuccess');
      this._lastResponse = result;
      //console.info('heartBeat result', result);
      if (result.status !== 'ok') { return this._onHeartBeatFail(); }
      if (result && result.flashvars && result.flashvars.watchAuthKey) {
        this._videoInfo.watchAuthKey = result.flashvars.watchAuthKey;
      }
    }

  }

  return VideoSession;
})();



  var PlayerConfig = function() { this.initialize.apply(this, arguments); };
  _.assign(PlayerConfig.prototype, {
    initialize: function(params) {
      var config = this._config = params.config;
      this._mode = params.mode || '';
      if (!this._mode && ZenzaWatch.util.isGinzaWatchUrl()) {
        this._mode = 'ginza';
      }

      if (!this._mode) {
        _.each([
          'refreshValue',
          'getValue',
          'setValue',
          'setValueSilently',
          'setSessionValue',
          'on',
          'off'
        ], (func) => {
          //this[func] = _.bind(config[func], config);
          this[func] = config[func].bind(config);
        });
      }
    },
    // 環境ごとに独立させたい要求が出てきたのでラップする
    _getNativeKey: function(key) {
      if (!this._mode) { return key; }
      switch (this._mode) {
        case 'ginza':
          if (['autoPlay', 'screenMode'].includes(key)) {
            return key + ':' + this._mode;
          }
          return key;
        default:
          return key;
      }
    },
    refreshValue: function(key) {
      key = this._getNativeKey(key);
      return this._config.refreshValue(key);
    },
    getValue: function(key, refresh) {
      key = this._getNativeKey(key);
      return this._config.getValue(key, refresh);
    },
    setValue: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setValue(key, value);
    },
    setValueSilently: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setValueSilently(key, value);
    },
    setSessionValue: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setSessionValue(key, value);
    },
    _wrapFunc: function(func) {
      return function(key, value) {
        key = key.replace(/:.*?$/, '');
        func(key, value);
      };
    },
    on: function(key, func) {
      if (key.match(/^update-(.*)$/)) {
        key = RegExp.$1;
        var nativeKey = this._getNativeKey(key);
        //if (key !== nativeKey) { window.console.log('config.on %s -> %s', key, nativeKey); }
        this._config.on('update-' + nativeKey, func);
      } else {
        this._config.on(key, this._wrapFunc(func));
      }
    },
    off: function(/*key, func*/) {
      throw new Error('not supported!');
    }
  });

  var VideoWatchOptions = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoWatchOptions.prototype, AsyncEmitter.prototype);
  _.assign(VideoWatchOptions.prototype, {
    initialize: function(watchId, options, config) {
      this._watchId = watchId;
      this._options = options || {};
      this._config  = config;
    },
    getRawData: function() {
      // window.console.trace();
      return this._options;
    },
    getEventType: function() {
      return this._options.eventType || '';
    },
    getQuery: function() {
      return this._options.query || {};
    },
    getVideoLoadOptions: function() {
      var options = {
        economy: this.isEconomy()
      };
      return options;
    },
    getMylistLoadOptions: function() {
      var options = {};
      var query = this.getQuery();
      if (query.mylist_sort) { options.sort = query.mylist_sort; }
      options.group_id = query.group_id;
      options.watchId = this._watchId;
      return options;
    },
    isPlaylistStartRequest: function() {
      var eventType = this.getEventType();
      var query = this.getQuery();
      if (eventType === 'click' &&
          query.continuous === '1' &&
          ['mylist', 'deflist', 'tag', 'search'].includes(query.playlist_type) &&
          (query.group_id || query.order)) {
        return true;
      }
      return false;
    },
    hasKey: function(key) {
      return _.has(this._options, key);
    },
    isOpenNow: function() {
      return this._options.openNow === true;
    },
    isEconomy: function() {
      return _.isBoolean(this._options.economy) ?
        this._options.economy : this._config.getValue('forceEconomy');
    },
    isAutoCloseFullScreen: function() {
      return !!this._options.autoCloseFullScreen;
    },
    isReload: function() {
      return this._options.isReload === true;
    },
    getCurrentTime: function() {
      return _.isNumber(this._options.currentTime) ?
        parseFloat(this._options.currentTime, 10) : 0;
    },
    createOptionsForVideoChange: function(options) {
      options = options || {};
      delete this._options.economy;
      _.defaults(options, this._options);
      options.openNow = true;
      options.isReload = false;
      options.currentTime = 0;
      options.query = {};
      return options;
    },
    createOptionsForReload: function(options) {
      options = options || {};
      delete this._options.economy;
      _.defaults(options, this._options);
      options.openNow = true;
      options.isReload = true;
      options.query = {};
      return options;
    },
    createOptionsForSession: function(options) {
      options = options || {};
      _.defaults(options, this._options);
      options.query = {};
      return options;
    }
  });

  class BaseState extends AsyncEmitter {
    constructor() {
      super();

      this._name = '';
      this._state = {};
      this._props = {};
    }

    _defineProperty() {
      Object.keys(this._state).forEach(key => {
        Object.defineProperty(
          this,
          key, {
            get: () => { return this._state[key]; },
            set: (v) => { this._setState(key, v); }
          });
      });
    }

    setState(key, val) {
      if (_.isString(key)) {
        return this._setState(key, val);
      }
      Object.keys(key).forEach(k => {
        this._setState(k, key[k]);
      });
    }

    _setState(key, val) {
      if (!this._state.hasOwnProperty(key)) {
        window.console.warn('%cUnknown property %s = %s', 'background: yellow;', key, val);
        console.trace();
      }
      if (this._state[key] === val) { return; }
      this._state[key] = val;
      this.emit('change', key, val);
      this.emit(`update-${key}`, val);
    }
  }

  class PlayerState extends BaseState {
    constructor(player, config) {
      super();

      this._name = 'Player';
      this._state = {
        isAbort:   false,
        isAutoPlay: config.getValue('autoPlay'),
        isBackComment:    config.getValue('backComment'),
        isChanging: false,
        isChannel: false,
        isCommentVisible: config.getValue('showComment'),
        isCommentReady: false,
        isCommentPosting: false,
        isCommunity: false,
        isWaybackMode: false,
        isDebug:   config.getValue('debug'),
        isDmcAvailable: false,
        isDmcPlaying:   false,
        isError:   false,
        isLoading: false,
        isLoop:    config.getValue('loop'),
        isMute:    config.getValue('mute'),
        isMymemory: false,
        isOpen:    false,
        isPausing: false,
        isPlaylistEnable: false,
        isPlaying: false,
        isRegularUser: !util.isPremium(),
        isStalled: false,
        isUpdatingDeflist: false,
        isUpdatingMylist: false,
        isNotPlayed: true,
        isYouTube: false,

        isEnableFilter: config.getValue('enableFilter'),
        sharedNgLevel: config.getValue('sharedNgLevel'),

        screenMode: config.getValue('screenMode'),
        playbackRate: config.getValue('playbackRate')
      };

      this._defineProperty();

      this.getCurrentTime = () => { player.getCurrentTime(); };
    }

    resetVideoLoadingStatus() {
      this.setState({
        isLoading: true,
        isPlaying: false,
        isStalled: false,
        isError: false,
        isAbort: false,
        isMymemory: false,
        isCommunity: false,
        isChannel: false
      });
    }

    setVideoCanPlay() {
      this.setState({
        isStalled: false, isLoading: false, isPausing: false, isNotPlayed: true, isError: false});
    }

    setPlaying() {
      this.setState({isPlaying: true, isPausing: false, isLoading: false, isNotPlayed: false, isError: false});
    }

    setPausing() {
      this.setState({isPlaying: false, isPausing: true});
    }

    setVideoEnded() {
      this.setState({isPlaying: false, isPausing: false});
    }

    setVideoErrorOccurred() {
      this.setState({isError: true, isPlaying: false, isLoading: false});
    }
  }

  var NicoVideoPlayerDialogView = function() { this.initialize.apply(this, arguments); };
  NicoVideoPlayerDialogView.__css__ = `

    /*
      プレイヤーが動いてる間、裏の余計な物のマウスイベントを無効化
      多少軽量化が期待できる？
    */
    body.showNicoVideoPlayerDialog.zenzaScreenMode_big>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_normal>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_wide>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_3D>.container {
      pointer-events: none;
    }
    body.showNicoVideoPlayerDialog.zenzaScreenMode_big>.container *,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_normal>.container *,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_wide>.container *,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_3D>.container  *{
      animation-play-state: paused !important;
    }

    body.showNicoVideoPlayerDialog .ads {
      display: none !important;
      pointer-events: none;
      animation-play-state: paused !important;
    }

    /* 大百科の奴 */
    body.showNicoVideoPlayerDialog #scrollUp {
      display: none !important;
    }

    .changeScreenMode {
      pointer-events: none;
    }

    .zenzaVideoPlayerDialog {
      display: none;
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: ${CONSTANT.BASE_Z_INDEX};
      font-size: 13px;
      text-align: left;
      box-sizing: border-box;
      /*transition:
        width: 0.4s ease-in, height: 0.4s ease-in 0.4s,
        right 0.4s ease-in, bottom 0.4s ease-in;*/
      contain: layout;
    }

    .zenzaScreenMode_big     .zenzaVideoPlayerDialog,
    .zenzaScreenMode_normal  .zenzaVideoPlayerDialog,
    .zenzaScreenMode_wide    .zenzaVideoPlayerDialog,
    .zenzaScreenMode_3D      .zenzaVideoPlayerDialog,
    .fullScreen              .zenzaVideoPlayerDialog {
      /*transform: translatez(0);*/
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
      display: block;
    }

    .zenzaVideoPlayerDialog li {
      text-align: left;
    }

    .zenzaScreenMode_3D       .zenzaVideoPlayerDialog,
    .zenzaScreenMode_sideView .zenzaVideoPlayerDialog,
    .zenzaScreenMode_small    .zenzaVideoPlayerDialog,
    .fullScreen .zenzaVideoPlayerDialog {
      transition: none !important;
    }

    .zenzaVideoPlayerDialogInner {
      position: fixed;
      top:  50%;
      left: 50%;
      background: #000;
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      z-index: ${CONSTANT.BASE_Z_INDEX + 1};
      box-shadow: 4px 4px 4px #000;
      /*transition: none; top 0.4s ease-in, left 0.4s ease-in;*/
    }
    .zenzaScreenMode_3D       .zenzaVideoPlayerDialogInner,
    .zenzaScreenMode_sideView .zenzaVideoPlayerDialogInner,
    .zenzaScreenMode_small    .zenzaVideoPlayerDialogInner,
    .fullScreen .zenzaVideoPlayerDialogInner {
      transition: none !important;
    }

    .noVideoInfoPanel .zenzaVideoPlayerDialogInner {
      padding-right: 0 !important;
      padding-bottom: 0 !important;
    }

    .zenzaPlayerContainer {
      position: relative;
      /* overflow: hidden; */
      background: #000;
      width: 672px;
      height: 384px;
              /*transition: width 0.4s ease-in 0.4s, height 0.4s ease-in;*/
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



    .zenzaScreenMode_3D       .zenzaPlayerContainer,
    .zenzaScreenMode_sideView .zenzaPlayerContainer,
    .zenzaScreenMode_small    .zenzaPlayerContainer,
    .fullScreen               .zenzaPlayerContainer {
      transition: none !important;
    }

    .fullScreen .zenzaPlayerContainer {
      /*transform: translateZ(0);*/
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
      -webkit-user-select: none;
      -moz-user-select: none;
      contain: paint;
    }

    .zenzaScreenMode_3D   .zenzaPlayerContainer:not(.is-mouseMoving) .videoPlayer>*,
    .zenzaScreenMode_wide .zenzaPlayerContainer:not(.is-mouseMoving) .videoPlayer>*,
    .fullScreen           .zenzaPlayerContainer:not(.is-mouseMoving) .videoPlayer>* {
      cursor: none;
    }

    .zenzaPlayerContainer.is-loading .videoPlayer>* {
      cursor: wait;
    }

    .is-mouseMoving .videoPlayer>* {
      cursor: auto;
    }


    .zenzaScreenMode_3D .zenzaPlayerContainer .videoPlayer {
      transform: perspective(600px) rotateX(10deg);
      height: 100%;
    }

    .zenzaScreenMode_3D .zenzaPlayerContainer .commentLayerFrame {
      transform: translateZ(0) perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
      opacity: 0.9;
      height: 100%;
      margin-left: 20%;
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
      transition: opacity 1s ease; /*, height 0.4s ease;*/
      pointer-events: none;
      /*transform: translateZ(0);*/
      cursor: none;
      will-change: transform, opacity;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      contain: paint;
    }
    .zenzaScreenMode_3D       .zenzaPlayerContainer .commentLayerFrame,
    .zenzaScreenMode_sideView .zenzaPlayerContainer .commentLayerFrame,
    .zenzaScreenMode_small    .zenzaPlayerContainer .commentLayerFrame,
    .fullScreen .zenzaPlayerContainer .commentLayerFrame {
      transition: none !important;
    }

    .zenzaScreenMode_small  .zenzaPlayerContainer.is-backComment .commentLayerFrame,
    .zenzaScreenMode_normal .zenzaPlayerContainer.is-backComment .commentLayerFrame,
    .zenzaScreenMode_big    .zenzaPlayerContainer.is-backComment .commentLayerFrame {
      top:  calc(-50vh + 50%);
      left: calc(-50vw + 50%);
      width:  100vw;
      height: calc(100vh - 40px);
      right: auto;
      bottom: auto;
      z-index: 1;
    }
    .zenzaScreenMode_small  .zenzaPlayerContainer.is-backComment .commentLayerFrame {
      top:  0;
      left: 0;
      width:  100vw;
      height: 100vh;
      right: auto;
      bottom: auto;
      z-index: 1;
    }

    .is-mouseMoving .commentLayerFrame {
      /* height: calc(100% - 50px); */
      cursor: auto;
    }



    .fullScreen           .videoPlayer,
    .fullScreen           .commentLayerFrame {
      top:  0 !important;
      left: 0 !important;
      width:  100% !important;
      height: 100% !important;
      right:  0 !important;
      bottom: 0 !important;
      border: 0 !important;
      z-index: 100 !important;
    }

    .zenzaScreenMode_3D   .showVideoControlBar .videoPlayer,
    .zenzaScreenMode_3D   .showVideoControlBar .commentLayerFrame,
    .zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame,
    .fullScreen           .showVideoControlBar .videoPlayer,
    .fullScreen           .showVideoControlBar .commentLayerFrame {
      top:  0 !important;
      left: 0 !important;
      width:  100% !important;
      height: calc(100% - ${CONSTANT.CONTROL_BAR_HEIGHT}px) !important;
      right:  0 !important;
      bottom: ${CONSTANT.CONTROL_BAR_HEIGHT}px !important;
      border: 0 !important;
    }

    .zenzaStoryboardOpen.fullScreen           .showVideoControlBar .videoPlayer,
    .zenzaStoryboardOpen.fullScreen           .showVideoControlBar .commentLayerFrame {
      padding-bottom: 50px;
    }

    .zenzaStoryboardOpen.zenzaScreenMode_3D .showVideoControlBar .videoPlayer,
    .zenzaStoryboardOpen.zenzaScreenMode_3D .showVideoControlBar .commentLayerFrame,
    .zenzaStoryboardOpen.zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .zenzaStoryboardOpen.zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame{
      padding-bottom: 80px;
    }

    .zenzaScreenMode_3D   .showVideoControlBar .videoPlayer,
    .zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .fullScreen           .showVideoControlBar .videoPlayer {
      z-index: 100 !important;
    }
    .zenzaScreenMode_3D   .showVideoControlBar .commentLayerFrame,
    .zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame,
    .fullScreen           .showVideoControlBar .commentLayerFrame {
      z-index: 101 !important;
    }


    .zenzaScreenMode_3D   .is-showComment.is-backComment .videoPlayer,
    .zenzaScreenMode_wide .is-showComment.is-backComment .videoPlayer,
    .fullScreen           .is-showComment.is-backComment .videoPlayer
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


    .fullScreen .zenzaPlayerContainer {
      left: 0 !important;
      top:  0 !important;
      width:  100vw !important;
      height: 100vh !important;
    }

    .is-showComment.is-backComment .videoPlayer {
      opacity: 0.90;
    }

    .is-showComment.is-backComment .videoPlayer:hover {
      opacity: 1;
    }


    .fullScreen.zenzaScreenMode_3D .zenzaPlayerContainer .videoPlayer {
      transform: perspective(700px) rotateX(10deg);
      margin-top: -5%;
    }

    body.zenzaScreenMode_sideView {
      margin-left: ${CONSTANT.SIDE_PLAYER_WIDTH + 24}px;
      margin-top: 76px;

      width: auto;
    }
    body.zenzaScreenMode_sideView.nofix:not(.fullScreen) {
      margin-top: 40px;
    }
    body.zenzaScreenMode_sideView #siteHeader {
    }
    body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
      margin-left: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
      width: auto;
      top: 40px;
    }
    body.zenzaScreenMode_sideView:not(.nofix) #siteHeader #siteHeaderInner {
      width: auto;
    }

    body.zenzaScreenMode_normal,
    body.zenzaScreenMode_big,
    body.zenzaScreenMode_3D,
    body.zenzaScreenMode_wide {
      overflow: hidden !important;
    }

    .zenzaScreenMode_small .zenzaVideoPlayerDialog,
    .zenzaScreenMode_sideView .zenzaVideoPlayerDialog {
      position: fixed;
      top: 0; left: 0; right: 100%; bottom: 100%;
    }

    .zenzaScreenMode_small .zenzaPlayerContainer,
    .zenzaScreenMode_sideView .zenzaPlayerContainer {
      width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
      height: ${CONSTANT.SIDE_PLAYER_HEIGHT}px;
    }

    .zenzaScreenMode_small .zenzaVideoPlayerDialogInner,
    .zenzaScreenMode_sideView .zenzaVideoPlayerDialogInner {
      top: 0;
      left: 0;
      transform: none;
    }
    .zenzaScreenMode_small .zenzaVideoPlayerDialogInner:hover {
    }



    body:not(.fullScreen).zenzaScreenMode_normal .zenzaPlayerContainer .videoPlayer {
      left: 2.38%;
      width: 95.23%;
    }

    .zenzaScreenMode_big .zenzaPlayerContainer {
      width: ${CONSTANT.BIG_PLAYER_WIDTH}px;
      height: ${CONSTANT.BIG_PLAYER_HEIGHT}px;
    }

    .zenzaScreenMode_3D   .zenzaPlayerContainer,
    .zenzaScreenMode_wide .zenzaPlayerContainer {
      left: 0;
      width: 100vw;
      height: 100vh;
      box-shadow: none;
    }

    .zenzaScreenMode_small .videoPlayer,
    .zenzaScreenMode_3D    .videoPlayer,
    .zenzaScreenMode_wide  .videoPlayer {
      left: 0;
      width: 100%;
    }

    .zenzaScreenMode_wide  .is-backComment .videoPlayer {
      left: 25%;
      top:  25%;
      width:  50%;
      height: 50%;
      z-index: 102;
    }

    /* 右パネル分の幅がある時は右パネルを出す */
    @media screen and (min-width: 992px) {
      .zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
        padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
        background: none;
      }
    }

    @media screen and (min-width: 1216px) {
      .zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
        padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
        background: none;
      }
    }

    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
        padding-bottom: 240px;
        top: calc(50% + 60px);
        background: none;
      }
    }

    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
        padding-bottom: 240px;
        top: calc(50% + 60px);
        background: none;
      }
    }


    /* 960x540 */
    @media
      screen and
      (min-width: 1328px) and (max-width: 1663px) and
      (min-height: 700px) and (min-height: 899px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(960px * 1.05);
        height: 540px;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer .videoPlayer {
      }
    }

    /* 1152x648 */
    @media screen and
      (min-width: 1530px) and (min-height: 900px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1152px * 1.05);
        height: 648px;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer .videoPlayer {
      }
    }

    /* 1280x720 */
    @media screen and
      (min-width: 1664px) and (min-height: 900px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1280px * 1.05);
        height: 720px;
      }
    }

    /* 1920x1080 */
    @media screen and
      (min-width: 2336px) and (min-height: 1200px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1920px * 1.05);
        height: 1080px;
      }
    }

    /* 2560x1440 */
    @media screen and
      (min-width: 2976px) and (min-height: 1660px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(2560px * 1.05);
        height: 1440px;
      }
    }

    @media screen and (min-width: 1432px)
    {
      body.zenzaScreenMode_sideView {
        margin-left: calc(100vw - 1024px);
      }
      body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
        width: calc(100vw - (100vw - 1024px));
        margin-left: calc(100vw - 1024px);
      }
      .zenzaScreenMode_sideView .zenzaPlayerContainer {
        width: calc(100vw - 1024px);
        height: calc((100vw - 1024px) * 9 / 16);
      }
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
      color: #ccc;
      text-shadow: 0 0 8px #003;
      font-family: serif;
      letter-spacing: 2px;
      /*animation-name: loadingVideo;*/
      /*background: rgba(0, 0, 0, 0.5);*/
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

    .popupMessageContainer {
      top: 50px;
      left: 50px;
      z-index: 25000;
      position: absolute;
      pointer-events: none;
      transform: translateZ(0);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }


  `;

  NicoVideoPlayerDialogView.__tpl__ = (`
    <div id="zenzaVideoPlayerDialog" class="zenzaVideoPlayerDialog">
      <div class="zenzaVideoPlayerDialogInner">
        <div class="menuContainer"></div>
        <div class="zenzaPlayerContainer">

          <div class="popupMessageContainer"></div>
          <div class="errorMessageContainer"></div>
          <div class="loadingMessageContainer">動画読込中</div>
        </div>
      </div>
    </div>
  `).trim();

  _.extend(NicoVideoPlayerDialogView.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayerDialogView.prototype, {
    initialize: function(params) {
      const dialog = this._dialog = params.dialog;
      this._playerConfig = params.playerConfig;
      this._nicoVideoPlayer = params.nicoVideoPlayer;
      this._playerState = params.playerState;
      this._currentTimeGetter = params.currentTimeGetter;

      this._aspectRatio = 9 / 16;

      dialog.on('canPlay',           this._onVideoCanPlay.bind(this));
      dialog.on('videoCount',        this._onVideoCount.bind(this));
      dialog.on('error',             this._onVideoError.bind(this));
      dialog.on('play',              this._onVideoPlay.bind(this));
      dialog.on('playing',           this._onVideoPlaying.bind(this));
      dialog.on('pause',             this._onVideoPause.bind(this));
      dialog.on('stalled',           this._onVideoStalled.bind(this));
      dialog.on('abort',             this._onVideoAbort.bind(this));
      dialog.on('aspectRatioFix',    this._onVideoAspectRatioFix.bind(this));
      dialog.on('volumeChange',      this._onVolumeChange.bind(this));
      dialog.on('volumeChangeEnd',   this._onVolumeChangeEnd.bind(this));
      dialog.on('beforeVideoOpen',   this._onBeforeVideoOpen.bind(this));
      dialog.on('loadVideoInfo',     this._onVideoInfoLoad.bind(this));
      dialog.on('loadVideoInfoFail', this._onVideoInfoFail.bind(this));
      dialog.on('videoServerType',   this._onVideoServerType.bind(this));

      this._initializeDom();
      this._playerState.on('change', this._onPlayerStateChange.bind(this));
    },
    _initializeDom: function() {
      util.addStyle(NicoVideoPlayerDialogView.__css__);
      const $dialog = this._$dialog = $(NicoVideoPlayerDialogView.__tpl__);
      const onCommand = this._onCommand.bind(this);
      const config = this._playerConfig;
      const dialog = this._dialog;

      const $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
      const container = $container[0];

      $container.on('click', (e) => {
        ZenzaWatch.emitter.emitAsync('hideHover');
        if (config.getValue('enableTogglePlayOnClick') && !$container.hasClass('menuOpen')) {
          onCommand('togglePlay');
        }
        e.preventDefault();
        e.stopPropagation();
        $container.removeClass('menuOpen');
      });

      this._applyState();

      // マウスを動かしてないのにmousemoveが飛んでくるのでねずみかます
      let lastX = 0, lastY = 0;
      let onMouseMove    = this._onMouseMove.bind(this);
      let onMouseMoveEnd = _.debounce(this._onMouseMoveEnd.bind(this), 400);
      $container.on('mousemove', (e) => {
        if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
          return;
        }
        lastX = e.screenX;
        lastY = e.screenY;
        onMouseMove(e);
        onMouseMoveEnd(e);
      });

      $dialog
        .on('click', this._onClick.bind(this))
        .on('dblclick', (e) => {
          if (!e.target || e.target.id !== 'zenzaVideoPlayerDialog') { return; }
          if (config.getValue('enableDblclickClose')) {
            this.emit('command', 'close');
          }
        });

      this._hoverMenu = new VideoHoverMenu({
        playerContainer: container,
        playerState: this._playerState
      });
      this._hoverMenu.on('command', onCommand);

      this._commentInput = new CommentInputPanel({
        $playerContainer: $container,
        playerConfig: config
      });

      this._commentInput.on('post', (e, chat, cmd) => {
        this.emit('postChat', e, chat, cmd);
      });

      let isPlaying = false;
      this._commentInput.on('focus', (isAutoPause) => {
        isPlaying = this._nicoVideoPlayer.isPlaying();
        if (isAutoPause) {
          this.emit('command', 'pause');
        }
      });
      this._commentInput.on('blur', (isAutoPause) => {
        if (isAutoPause && isPlaying && dialog.isOpen()) {
          this.emit('command', 'play');
        }
      });
      this._commentInput.on('esc', () => {
        this._escBlockExpiredAt = Date.now() + 1000 * 2;
      });

      this._settingPanel = new SettingPanel({
        $playerContainer: $container,
        playerConfig: config,
        player: this._dialog
      });
      this._settingPanel.on('command', onCommand);

      this._videoControlBar = new VideoControlBar({
        $playerContainer: $container,
        playerConfig: config,
        player: this._dialog
      });
      this._videoControlBar.on('command', onCommand);

      this._$errorMessageContainer = $container.find('.errorMessageContainer');

      this._initializeVideoInfoPanel();
      this._initializeResponsive();

      this.selectTab(this._playerConfig.getValue('videoInfoPanelTab'));

      ZenzaWatch.emitter.on('showMenu', () => { $container.addClass('menuOpen'); });
      ZenzaWatch.emitter.on('hideMenu', () => { $container.removeClass('menuOpen'); });
      document.body.appendChild($dialog[0]);
    },
    _initializeVideoInfoPanel: function() {
      if (this._videoInfoPanel) { return this._videoInfoPanel; }
      this._videoInfoPanel = new VideoInfoPanel({
        dialog: this,
        node: this._$playerContainer,
        currentTimeGetter: this._currentTimeGetter
      });
      this._videoInfoPanel.on('command', this._onCommand.bind(this));
      return this._videoInfoPanel;
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    _initializeResponsive: function() {
      window.addEventListener('resize', _.debounce(this._updateResponsive.bind(this),  500));
    },
    _updateResponsive: function() {
      var $container = this._$playerContainer;
      var $bar    = $container.find('.videoControlBar');
      var $header = $container.find('.zenzaWatchVideoHeaderPanel');

      // 画面の縦幅にシークバー分の余裕がある時は常時表示
      const update = () => {
        const w = window.innerWidth, h = window.innerHeight;
        const videoControlBarHeight = $bar.outerHeight();
        const vMargin = h - w * this._aspectRatio;

        this.toggleClass('showVideoControlBar', vMargin >= videoControlBarHeight);
        this.toggleClass('showVideoHeaderPanel',
            vMargin >= videoControlBarHeight + $header.outerHeight() * 2);
      };

      update();
    },
    _onMouseMove: function() {
      if (this._isMouseMoving) { return; }
      this.addClass('is-mouseMoving');
      this._isMouseMoving = true;
    },
    _onMouseMoveEnd: function() {
      if (!this._isMouseMoving) { return; }
      this.removeClass('is-mouseMoving');
      this._isMouseMoving = false;
    },
    _onVideoCanPlay: function(watchId, videoInfo, options) {
      this.emit('canPlay', watchId, videoInfo, options);
    },
    _onVideoCount: function({comment, view, mylist} = {}) {
      this.emit('videoCount', {comment, view, mylist});
    },
    _onVideoError: function(e) {
      this.emit('error', e);
    },
    _onBeforeVideoOpen: function() {
      this.setThumbnail();
    },
    _onVideoInfoLoad: function(videoInfo) {
      this._videoInfoPanel.update(videoInfo);
    },
    _onVideoInfoFail: function(videoInfo) {
      if (videoInfo) {
        this._videoInfoPanel.update(videoInfo);
      }
    },
    _onVideoServerType: function(type, sessionInfo) {
      this.toggleClass('is-dmcPlaying', type === 'dmc');
      this.emit('videoServerType', type, sessionInfo);
    },
    _onVideoPlay: function() {},
    _onVideoPlaying: function() {},
    _onVideoPause: function() {},
    _onVideoStalled: function() {},
    _onVideoAbort: function() {},
    _onVideoAspectRatioFix: function(ratio) {
      this._aspectRatio = ratio;
      this._updateResponsive();
    },
    _onVolumeChange: function(/*vol, mute*/) {
      this.addClass('volumeChanging');
    },
    _onVolumeChangeEnd: function(/*vol, mute*/) {
      this.removeClass('volumeChanging');
    },
    _onScreenModeChange: function() {
      this.addClass('changeScreenMode');
      this._applyScreenMode();
      window.setTimeout(() => { this.removeClass('changeScreenMode'); }, 1000);
    },
    _getStateClassNameTable: function() {
      return { // TODO: テーブルなくても対応できるようにcss名を整理
        isAbort:   'is-abort',
        isBackComment: 'is-backComment',
        isCommentVisible: 'is-showComment',
        isDebug:   'is-debug',
        isDmcAvailable: 'is-dmcAvailable',
        isDmcPlaying:   'is-dmcPlaying',
        isError:   'is-error',
        isLoading: 'is-loading',
        isMute:    'is-mute',
        isLoop:    'is-loop',
        isOpen:    'is-open',
        isPlaying: 'is-playing',
        isPausing: 'is-pausing',
        isStalled: 'is-stalled',
        isChanging: 'is-changing',
        isUpdatingDeflist: 'is-updatingDeflist',
        isUpdatingMylist:  'is-updatingMylist',
        isPlaylistEnable:  'is-playlistEnable',
        isCommentPosting:  'is-commentPosting',
        isRegularUser: 'is-regularUser',
        isWaybackMode: 'is-waybackMode',
        isNotPlayed: 'is-notPlayed',
        isYouTube: 'is-youTube',
      };
    },
    _onPlayerStateChange: function(key, value) {
      const table = this._getStateClassNameTable();
      const className = table[key];
      if (className) { this.toggleClass(className, !!value); }
      switch(key) {
        case 'screenMode':
        case 'isOpen':
          if (this._playerState.isOpen) { this._onScreenModeChange(); }
          break;
      }
    },
    _applyState: function() {
      const table = this._getStateClassNameTable();
      const container = this._$playerContainer[0];
      const state = this._playerState;
      Object.keys(table).forEach(key => {
        const className = table[key];
        if (!className) { return; }
        container.classList.toggle(className, state[key]);
      });

      if (this._playerState.isOpen) { this._applyScreenMode(); }
    },
    _getScreenModeClassNameTable: function() {
      return [
        'zenzaScreenMode_3D',
        'zenzaScreenMode_small',
        'zenzaScreenMode_sideView',
        'zenzaScreenMode_normal',
        'zenzaScreenMode_big',
        'zenzaScreenMode_wide'
      ];
    },
    _applyScreenMode: function() {
      const screenMode = `zenzaScreenMode_${this._playerState.screenMode}`;
      const body = util.$('body, html');
      const modes = this._getScreenModeClassNameTable();
      modes.forEach(m => { body.toggleClass(m, m === screenMode); });
    },
    show: function() {
      this._$dialog.addClass('is-open');
      if (!FullScreen.now()) {
        document.body.classList.remove('fullScreen');
      }
      util.$('body, html').addClass('showNicoVideoPlayerDialog');
    },
    hide: function() {
      this._$dialog.removeClass('is-open');
      this._settingPanel.hide();
      util.$('body, html').removeClass('showNicoVideoPlayerDialog');
      this.clearClass();
    },
    clearClass: function() {
      const modes = this._getScreenModeClassNameTable().join(' ');
      util.$('body, html').removeClass(modes);
    },
    _onClick: function() {
    },
    setNicoVideoPlayer: function(nicoVideoPlayer) {
      this._nicoVideoPlayer = nicoVideoPlayer;
    },
    setThumbnail: function(thumbnail) {
      if (thumbnail) {
        this.css('background-image', `url(${thumbnail})`);
      } else {
        // base hrefのせいで変なurlを参照してしまうので適当な黒画像にする
        const blank = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABBAEAcCBlCwAAAABJRU5ErkJggg==';
        this.css('background-image', `url(${blank})`);
      }
    },
    focusToCommentInput: function() {
      // 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
      window.setTimeout(() => { this._commentInput.focus(); }, 0);
    },
    toggleSettingPanel: function() {
      this._settingPanel.toggle();
    },
    setErrorMessage: function(msg) {
      this._$errorMessageContainer.text(msg);
    },
    get$Container: function() {
      return this._$playerContainer;
    },
    css: function(key, val) {
      util.$(this._$playerContainer[0]).css(key, val);
    },
    addClass: function(name) {
      return this.toggleClass(name, true);
    },
    removeClass: function(name) {
      return this.toggleClass(name, false);
    },
    toggleClass: function(name, v) {
      const container = this._$playerContainer[0];
      name.split(/[ ]+/).forEach(n => {
        if (_.isBoolean(v)) {
          container.classList.toggle(n, v);
        } else {
          container.classList.toggle(n);
        }
      });
    },
    hasClass: function(name) {
      const container = this._$playerContainer[0];
      return container.classList.contains(name);
    },
    appendTab: function(name, title) {
      return this._videoInfoPanel.appendTab(name, title);
    },
    selectTab: function(name) {
      this._playerConfig.setValue('videoInfoPanelTab', name);
      this._videoInfoPanel.selectTab(name);
    },
    execCommand: function(command, param) {
      this.emit('command', command, param);
    },
    blinkTab: function(name) {
      this._videoInfoPanel.blinkTab(name);
    },
    clearPanel: function() {
      this._videoInfoPanel.clear();
    }
  });


  /**
   * TODO: 分割 まにあわなくなっても知らんぞー
   */
  var NicoVideoPlayerDialog = function() { this.initialize.apply(this, arguments); };

  _.extend(NicoVideoPlayerDialog.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayerDialog.prototype, {
    initialize: function(params) {
      this._offScreenLayer = params.offScreenLayer;
      this._playerConfig = new PlayerConfig({config: params.playerConfig});
      this._playerState = new PlayerState(this, this._playerConfig);

      this._keyEmitter = params.keyHandler || ShortcutKeyEmitter;

      this._initializeDom();

      this._keyEmitter.on('keyDown', this._onKeyDown.bind(this));
      this._keyEmitter.on('keyUp',   this._onKeyUp  .bind(this));

      this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
      this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));

      this._escBlockExpiredAt = -1;

      this._videoFilter = new VideoFilter(
        this._playerConfig.getValue('videoOwnerFilter'),
        this._playerConfig.getValue('videoTagFilter')
      );

      this._savePlaybackPosition =
        _.throttle(this._savePlaybackPosition.bind(this), 1000, {trailing: false});
      this._dynamicCss = new DynamicCss({playerConfig: this._playerConfig});
    },
    _initializeDom: function() {
      this._view = new NicoVideoPlayerDialogView({
        dialog: this,
        playerConfig: this._playerConfig,
        nicoVideoPlayer: this._nicoVideoPlayer,
        playerState: this._playerState,
        currentTimeGetter: () => { return this.getCurrentTime(); }
      });
      if (this._playerConfig.getValue('enableCommentPanel')) {
        this._initializeCommentPanel();
      }

      this._$playerContainer = this._view.get$Container();
      this._view.on('command', this._onCommand.bind(this));
      this._view.on('postChat', (e, chat, cmd) => {
        this.addChat(chat, cmd).then(
          () => { e.resolve(); },
          () => { e.reject(); }
        );
      });
    },
    _initializeNicoVideoPlayer: function() {
      if (this._nicoVideoPlayer) {
        return this._nicoVideoPlayer();
      }
      var config = this._playerConfig;
      var nicoVideoPlayer = this._nicoVideoPlayer = new NicoVideoPlayer({
        offScreenLayer: this._offScreenLayer,
        node:           this._$playerContainer,
        playerConfig:  config,
        playerState:   this._playerState,
        volume:        config.getValue('volume'),
        loop:          config.getValue('loop'),
        enableFilter:  config.getValue('enableFilter'),
        wordFilter:    config.getValue('wordFilter'),
        wordRegFilter: config.getValue('wordRegFilter'),
        wordRegFilterFlags: config.getValue('wordRegFilterFlags'),
        commandFilter: config.getValue('commandFilter'),
        userIdFilter:  config.getValue('userIdFilter')
      });
      this._view.setNicoVideoPlayer(nicoVideoPlayer);

      this._messageApiLoader = new MessageApiLoader();

      nicoVideoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
      nicoVideoPlayer.on('ended',          this._onVideoEnded.bind(this));
      nicoVideoPlayer.on('canPlay',        this._onVideoCanPlay.bind(this));
      nicoVideoPlayer.on('play',           this._onVideoPlay.bind(this));
      nicoVideoPlayer.on('pause',          this._onVideoPause.bind(this));
      nicoVideoPlayer.on('playing',        this._onVideoPlaying.bind(this));
      nicoVideoPlayer.on('stalled',        this._onVideoStalled.bind(this));
      nicoVideoPlayer.on('progress',       this._onVideoProgress.bind(this));
      nicoVideoPlayer.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
      nicoVideoPlayer.on('commentParsed',  this._onCommentParsed.bind(this));
      nicoVideoPlayer.on('commentChange',  this._onCommentChange.bind(this));
      nicoVideoPlayer.on('commentFilterChange', this._onCommentFilterChange.bind(this));
      nicoVideoPlayer.on('videoPlayerTypeChange', this._onVideoPlayerTypeChange.bind(this));

      nicoVideoPlayer.on('error', this._onVideoError.bind(this));
      nicoVideoPlayer.on('abort', this._onVideoAbort.bind(this));

      nicoVideoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
      nicoVideoPlayer.on('volumeChange', _.debounce(this._onVolumeChangeEnd.bind(this), 1500));
      nicoVideoPlayer.on('command', this._onCommand.bind(this));

      return nicoVideoPlayer;
    },
    execCommand: function(command, param) {
      return this._onCommand(command, param);
    },
    _onCommand: function(command, param) {
      // なんかdispatcher的なのに分離したい
      var v;
      console.log('command: %s param: %s', command, param, typeof param);
      switch(command) {
        case 'notifyHtml':
          PopupMessage.notify(param, true);
          break;
        case 'notify':
          PopupMessage.notify(param);
          break;
        case 'alert':
          PopupMessage.alert(param);
          break;
        case 'alertHtml':
          PopupMessage.alert(param, true);
          break;
        case 'volume':
          this.setVolume(param);
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
        case 'toggleComment':
        case 'toggleShowComment':
          v = this._playerConfig.getValue('showComment');
          this._playerConfig.setValue('showComment', !v);
          break;
        case 'toggleBackComment':
          v = this._playerConfig.getValue('backComment');
          this._playerConfig.setValue('backComment', !v);
          break;
        case 'toggleConfig':
          v = this._playerConfig.getValue(param);
          this._playerConfig.setValue(param, !v);
          break;
        case 'toggleMute':
          v = this._playerConfig.getValue('mute');
          this._playerConfig.setValue('mute', !v);
          break;
        case 'toggleLoop':
          v = this._playerConfig.getValue('loop');
          this._playerConfig.setValue('loop', !v);
          break;
        case 'fullScreen':
        case 'toggle-fullScreen':
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
        case 'playNextVideo':
          this.playNextVideo();
          break;
        case 'playPreviousVideo':
          this.playPreviousVideo();
          break;
        case 'playlistShuffle':
          if (this._playlist) {
            this._playlist.shuffle();
          }
          break;
        case 'togglePlaylist': case 'playlistToggle': //TODO: こういうのをどっちかに統一
          if (this._playlist) {
            this._playlist.toggleEnable();
          }
          break;
        case 'mylistAdd':
          return this._onMylistAdd(param.mylistId, param.mylistName);
        case 'mylistRemove':
          return this._onMylistRemove(param.mylistId, param.mylistName);
        case 'mylistWindow':
          util.openMylistWindow(this._videoInfo.watchId);
          break;
        case 'settingPanel':
          this._view.toggleSettingPanel();
          break;
        case 'seek':
        case 'seekTo':
          this.setCurrentTime(param * 1);
          break;
        case 'seekBy':
          this.setCurrentTime(this.getCurrentTime() + param * 1);
          break;
        case 'seekRelativePercent':
          let dur = this._videoInfo.duration;
          //let st = param.perStartX;
          let mv = Math.abs(param.movePerX) > 10 ?
            (param.movePerX / 2) : (param.movePerX / 8);
          let pos = this.getCurrentTime() + (mv * dur / 100);
          //let pos = (st + mv) * dur / 100);
          this.setCurrentTime(Math.min(Math.max(0, pos), dur));
          break;
        case 'addWordFilter':
          this._nicoVideoPlayer.addWordFilter(param);
          PopupMessage.notify('NGワード追加: ' + param);
          break;
        case 'setWordRegFilter':
        case 'setWordRegFilterFlags':
          this._nicoVideoPlayer.setWordRegFilter(param);
          PopupMessage.notify('NGワード正規表現更新');
          break;
        case 'addUserIdFilter':
          this._nicoVideoPlayer.addUserIdFilter(param);
          PopupMessage.notify('NGID追加: ' + param);
          break;
        case 'addCommandFilter':
          this._nicoVideoPlayer.addCommandFilter(param);
          PopupMessage.notify('NGコマンド追加: ' + param);
          break;
        case 'setWordFilterList':
          this._nicoVideoPlayer.setWordFilterList(param);
          PopupMessage.notify('NGワード更新');
          break;
        case 'setUserIdFilterList':
          this._nicoVideoPlayer.setUserIdFilterList(param);
          PopupMessage.notify('NGID更新');
          break;
        case 'setCommandFilterList':
          this._nicoVideoPlayer.setCommandFilterList(param);
          PopupMessage.notify('NGコマンド更新');
          break;
        case 'tweet':
          ZenzaWatch.util.openTweetWindow(this._videoInfo);
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
          this.reload({currentTime: this.getCurrentTime()});
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
        case 'shiftUp':
          {
            v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
            if (v < 2) { v += 0.25; } else { v = Math.min(10, v + 0.5); }
            this._playerConfig.setValue('playbackRate', v);
          }
          break;
        case 'shiftDown':
          {
            v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
            if (v > 2) { v -= 0.5; } else { v = Math.max(0.1, v - 0.25); }
            this._playerConfig.setValue('playbackRate', v);
          }
          break;
        case 'screenShot':
          if (this._playerState.isYouTube) {
            util.capTube({
              title: this._videoInfo.title,
              videoId: this._videoInfo.videoId,
              author: this._videoInfo.ownerInfo.name
            });
            return;
          }
          this._nicoVideoPlayer.getScreenShot();
          break;
        case 'screenShotWithComment':
          if (this._playerState.isYouTube) { return; }
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
        case 'saveMymemory':
          util.saveMymemory(this, this._videoInfo);
          break;
        case 'setVideo':
          this.setVideo(param);
          break;
        case 'selectTab':
          this._view.selectTab(param);
          break;
        case 'copy-video-watch-url':
          util.copyToClipBoard(this._videoInfo.watchUrl);
          break;
        case 'update-forceEconomy':
        case 'update-enableDmc':
        case 'update-dmcVideoQuality':
          command = command.replace(/^update-/, '');
          if (this._playerConfig.getValue(command) === param) { break; }
          this._playerConfig.setValue(command, param);
          this.reload();
          break;
        case 'update-commentLanguage':
          command = command.replace(/^update-/, '');
          if (this._playerConfig.getValue(command) === param) { break; }
          this._playerConfig.setValue(command, param);
          this.reloadComment(param);
          break;
        case 'toggle-comment': // その日の気分で実装するからこうなるんやで
        case 'toggle-showComment':
        case 'toggle-backComment':
        case 'toggle-mute':
        case 'toggle-loop':
        case 'toggle-debug':
        case 'toggle-enableFilter':
        case 'toggle-enableNicosJumpVideo':
          command = command.replace(/^toggle-/, '');
          this._playerConfig.setValue(command, !this._playerConfig.getValue(command));
          break;
        case 'baseFontFamily':
        case 'baseChatScale':
        case 'enableFilter':  case 'update-enableFilter':
        case 'screenMode':    case 'update-screenMode':
        case 'sharedNgLevel': case 'update-sharedNgLevel':
          command = command.replace(/^update-/, '');
          if (this._playerConfig.getValue(command) === param) { break; }
          this._playerConfig.setValue(command, param);
          break;
        default:
          this.emit('command', command, param);
          ZenzaWatch.emitter.emit(`command-${command}`, param);
      }
    },
    _onKeyDown: function(name , e, param) {
      this._onKeyEvent(name, e, param);
    },
    _onKeyUp: function(name , e, param) {
      this._onKeyEvent(name, e, param);
    },
    _onKeyEvent: function(name , e, param) {
      if (!this._playerState.isOpen) {
        var lastWatchId = this._playerConfig.getValue('lastWatchId');
        if (name === 'RE_OPEN' && lastWatchId) {
          this.open(lastWatchId);
          e.preventDefault();
        }
        return;
      }
      switch (name) {
        case 'RE_OPEN':
          this.execCommand('reload');
          break;
        case 'PAUSE':
          this.pause();
          break;
        case 'SPACE':
        case 'TOGGLE_PLAY':
          this.togglePlay();
          break;
        case 'TOGGLE_PLAYLIST':
          this.execCommand('playlistToggle');
          break;
        case 'ESC':
          // ESCキーは連打にならないようブロック期間を設ける
          if (Date.now() < this._escBlockExpiredAt) {
            window.console.log('block ESC');
            break;
          }
          this._escBlockExpiredAt = Date.now() + 1000 * 2;
          if (!FullScreen.now()) {
            this.close();
          }
          break;
        case 'FULL':
          this._nicoVideoPlayer.requestFullScreen();
          break;
        case 'INPUT_COMMENT':
          this._view.focusToCommentInput();
          break;
        case 'DEFLIST':
          this._onDeflistAdd(param);
          break;
        case 'DEFLIST_REMOVE':
          this._onDeflistRemove(param);
          break;
        case 'VIEW_COMMENT':
          this.execCommand('toggleShowComment');
          break;
        case 'MUTE':
          this.execCommand('toggleMute');
          break;
        case 'VOL_UP':
          this.execCommand('volumeUp');
          break;
        case 'VOL_DOWN':
          this.execCommand('volumeDown');
          break;
        case 'SEEK_TO':
          this.execCommand('seekTo', param);
          break;
        case 'SEEK_BY':
          this.execCommand('seekBy', param);
          break;
        case 'NEXT_VIDEO':
          this.playNextVideo();
          break;
        case 'PREV_VIDEO':
          this.playPreviousVideo();
          break;
        case 'PLAYBACK_RATE':
          this.execCommand('playbackRate', param);
          break;
        case 'SHIFT_UP':
          this.execCommand('shiftUp');
          break;
        case 'SHIFT_DOWN':
          this.execCommand('shiftDown');
          break;
        case 'SCREEN_MODE':
          this.execCommand('screenMode', param);
          break;
        case 'SCREEN_SHOT':
          this.execCommand('screenShot');
          break;
        case 'SCREEN_SHOT_WITH_COMMENT':
          this.execCommand('screenShotWithComment');
          break;
      }
      var screenMode = this._playerConfig.getValue('screenMode');
      if (!['small', 'sideView'].includes(screenMode)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'autoPlay':
          this._playerState.isAutoPlay = !!value;
          break;
        case 'backComment':
          this._playerState.isBackComment = !!value;
          break;
        case 'showComment':
          this._playerState.isCommentVisible = !!value;
          break;
        case 'loop':
          this._playerState.isLoop = !!value;
          break;
        case 'mute':
          this._playerState.isMute = !!value;
          break;
        case 'sharedNgLevel':
          this._playerState.sharedNgLevel = value;
          //PopupMessage.notify('NG共有: ' +
          //  {'HIGH': '強', 'MID': '中', 'LOW': '弱', 'NONE': 'なし'}[value]);
          break;
        case 'debug':
          this._playerState.isDebug = !!value;
          PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
          break;
        case 'enableFilter':
          //PopupMessage.notify('NG設定: ' + (value ? 'ON' : 'OFF'));
          this._playerState.isEnableFilter = value;
          this._nicoVideoPlayer.setIsCommentFilterEnable(value);
          break;
        case 'wordFilter':
          this._nicoVideoPlayer.setWordFilterList(value);
          break;
        case 'setWordRegFilter':
          this._nicoVideoPlayer.setWordRegFilter(value);
          break;
        case 'userIdFilter':
          this._nicoVideoPlayer.setUserIdFilterList(value);
          break;
        case 'commandFilter':
          this._nicoVideoPlayer.setCommandFilterList(value);
          break;
        case 'screenMode':
          this._playerState.screenMode = value;
          break;
        case 'playbackRate':
          this._playerState.playbackRate = value;
          break;
      }
    },
    _updateScreenMode: function(mode) {
      this.emit('screenModeChange', mode);
    },
    _clearClass: function() {
      this._view.clearClass();
    },
    _onClick: function() {
    },
    _onPlaylistAppend: function(watchId) {
      this._initializePlaylist();
      if (!this._playlist) { return; }

      var onAppend = _.debounce(() => {
        this._playlist.scrollToWatchId(watchId);
      }, 500);
      this._playlist.append(watchId).then(onAppend, onAppend);
    },
    _onPlaylistInsert: function(watchId) {
      this._initializePlaylist();
      if (!this._playlist) { return; }

      this._playlist.insert(watchId);
    },
    _onPlaylistSetMylist: function(mylistId, option) {
      this._initializePlaylist();
      if (!this._playlist) { return; }

      option = option || {watchId: this._watchId};
      // デフォルトで古い順にする
      option.sort = isNaN(option.sort) ? 7 : option.sort;
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      var query = this._videoWatchOptions.getQuery();
      option.shuffle = parseInt(query.shuffle, 10) === 1;

      this._playlist.loadFromMylist(mylistId, option).then((result) => {
        this.execCommand('notify', result.message);
        this._view.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
      },
      () => {
        this.execCommand('alert', 'マイリストのロード失敗');
      });
    },
    _onPlaylistSetUploadedVideo: function(userId, option) {
      this._initializePlaylist();
      option = option || {watchId: this._watchId};
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      this._playlist.loadUploadedVideo(userId, option).then((result) => {
        this.execCommand('notify', result.message);
        this._view.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
      },
      (err) => {
        this.execCommand('alert', err.message || '投稿動画一覧のロード失敗');
      });
    },
    _onPlaylistSetSearchVideo: function(params) {
      this._initializePlaylist();

      var option = params.option || {};
      var word = params.word;
      option = option || {};
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      if (option.owner) {
        var ownerId = parseInt(this._videoInfo.ownerInfo.id, 10);
        if (this._videoInfo.isChannel) {
          option.channelId = ownerId;
        } else {
          option.userId = ownerId;
        }
      }
      delete option.owner;

      var query = this._videoWatchOptions.getQuery();
      Object.assign(option, query);

      //window.console.log('_onPlaylistSetSearchVideo:', word, option);
      this._view.selectTab('playlist');
      this._playlist.loadSearchVideo(word, option).then((result) => {
        this.execCommand('notify', result.message);
        this._playlist.insertCurrentVideo(this._videoInfo);
        ZenzaWatch.emitter.emitAsync('searchVideo', {word, option});
        window.setTimeout(() => { this._playlist.scrollToActiveItem(); }, 1000);
      },
      (err) => {
        this.execCommand('alert', err.message || '検索失敗または該当無し: 「' + word + '」');
      });
    },
    _onPlaylistStatusUpdate: function() {
      var playlist = this._playlist;
      this._playerConfig.setValue('playlistLoop', playlist.isLoop());
      this._playerState.isPlaylistEnable = playlist.isEnable();
      if (playlist.isEnable()) {
        this._playerConfig.setValue('loop', false);
      }
      this._view.blinkTab('playlist');
    },
    _onCommentPanelStatusUpdate: function() {
      var commentPanel = this._commentPanel;
      this._playerConfig.setValue(
        'enableCommentPanelAutoScroll', commentPanel.isAutoScroll());
    },
    _onDeflistAdd: function(watchId) {
      if (this._playerState.isUpdatingDeflist) { return; } //busy

      const unlock = () => {
        this._playerState.isUpdatingDeflist = false;
      };

      this._playerState.isUpdatingDeflist = true;
      let timer = window.setTimeout(unlock, 10000);

      const owner = this._videoInfo.ownerInfo;

      watchId = watchId || this._videoInfo.watchId;
      const description =
        (watchId === this._watchId && this._playerConfig.getValue('enableAutoMylistComment')) ? ('投稿者: ' + owner.name) : '';
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addDeflistItem(watchId, description)
        .then(result => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message);
      }, err => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message);
      });
    },
    _onDeflistRemove: function(watchId) {
      if (this._playerState.isUpdatingDeflist) { return; } //busy
      const unlock = () => {
        this._playerState.isUpdatingDeflist = false;
      };
      this._playerState.isUpdatingDeflist = true;

      let timer = window.setTimeout(unlock, 10000);

      watchId = watchId || this._videoInfo.watchId;
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.removeDeflistItem(watchId)
        .then(result => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message);
      }, err => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message);
      });
    },
    _onMylistAdd: function(groupId, mylistName) {
      if (this._playerState.isUpdatingMylist) { return; } //busy

      const unlock = () => {
        this._playerState.isUpdatingMylist = false;
      };

      this._playerState.isUpdatingMylist = true;
      let timer = window.setTimeout(unlock, 10000);

      const owner = this._videoInfo.ownerInfo;
      const watchId = this._videoInfo.watchId;
      const description =
        this._playerConfig.getValue('enableAutoMylistComment') ? ('投稿者: ' + owner.name) : '';
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addMylistItem(watchId, groupId, description)
        .then(result => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message + ': ' + mylistName);
      }, err => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message + ': ' + mylistName);
      });
    },
    _onMylistRemove: function(groupId, mylistName) {
      if (this._playerState.isUpdatingMylist) { return; } //busy

      const unlock = () => {
        this._playerState.isUpdatingMylist = false;
      };

      this._playerState.isUpdatingMylist = true;
      var timer = window.setTimeout(unlock, 10000);

      var watchId = this._videoInfo.watchId;

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.removeMylistItem(watchId, groupId)
        .then(result => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message + ': ' + mylistName);
      }, err => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message + ': ' + mylistName);
      });
    },
    _onCommentParsed: function() {
      const lang = this._playerConfig.getValue('commentLanguage');
      this.emit('commentParsed', lang, this._threadInfo);
      ZenzaWatch.emitter.emit('commentParsed');
    },
    _onCommentChange: function() {
      const lang = this._playerConfig.getValue('commentLanguage');
      this.emit('commentChange', lang, this._threadInfo);
      ZenzaWatch.emitter.emit('commentChange');
    },
    _onCommentFilterChange: function(filter) {
      var config = this._playerConfig;
      config.setValue('enableFilter',  filter.isEnable());
      config.setValue('wordFilter',    filter.getWordFilterList());
      config.setValue('userIdFilter',  filter.getUserIdFilterList());
      config.setValue('commandFilter', filter.getCommandFilterList());
      this.emit('commentFilterChange', filter);
    },
    _onVideoPlayerTypeChange: function(type = '') {
      switch(type.toLowerCase()) {
        case 'youtube':
          this._playerState.setState({isYouTube: true});
          break;
        default:
          this._playerState.setState({isYouTube: false});
      }
    },
    _onNicosSeek: function(time) {
      const ct = this.getCurrentTime();
      window.console.info('nicosSeek!', time);
      if (this.isPlaylistEnable()) {
        // 連続再生中は後方へのシークのみ有効にする
        if (ct < time) { this.execCommand('fastSeek', time); }
      } else {
        this.execCommand('fastSeek', time);
      }
    },
    show: function() {
      this._view.show();
      this._updateScreenMode(this._playerConfig.getValue('screenMode'));
      this._playerState.isOpen = true;
    },
    hide: function() {
      this._playerState.isOpen = false;
      this._view.hide();
    },
    open: function(watchId, options) {
      if (!watchId) { return; }
      // 連打対策
      if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) { return; }

      this.refreshLastPlayerId();
      this._requestId = 'play-' + Math.random();
      this._videoWatchOptions = options =new VideoWatchOptions(watchId, options, this._playerConfig);

      if (!options.isPlaylistStartRequest() &&
          this.isPlaying() && this.isPlaylistEnable() && !options.isOpenNow()) {
        this._onPlaylistInsert(watchId);
        return;
      }

      window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);

      let nicoVideoPlayer = this._nicoVideoPlayer;
      if (!nicoVideoPlayer) {
        nicoVideoPlayer = this._initializeNicoVideoPlayer();
      } else {
        this._savePlaybackPosition(this._watchId, this.getCurrentTime());
        nicoVideoPlayer.close();
        this._view.clearPanel();
        this.emit('beforeVideoOpen');
        if (this._videoSession) { this._videoSession.close(); }
      }
      
      this._playerState.resetVideoLoadingStatus();

      // watchIdからサムネイルを逆算できる時は最速でセットする
      const thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(watchId);
      if (thumbnail) {
        this._view.setThumbnail(thumbnail);
      }

      this._playerState.isCommentReady = false;
      this._watchId = watchId;
      this._lastCurrentTime = 0;
      this._lastOpenAt = Date.now();
      this._playerState.isError = false;

      VideoInfoLoader.load(watchId, options.getVideoLoadOptions()).then(
        this._onVideoInfoLoaderLoad.bind(this, this._requestId),
        this._onVideoInfoLoaderFail.bind(this, this._requestId)
      );

      this.show();
      if (this._playerConfig.getValue('autoFullScreen') && !ZenzaWatch.util.fullScreen.now()) {
        nicoVideoPlayer.requestFullScreen();
      }
      this.emit('open', watchId, options);
      ZenzaWatch.emitter.emitAsync('DialogPlayerOpen', watchId, options);
    },
    isOpen: function() {
      return this._playerState.isOpen;
    },
    reload: function(options) {
      options = this._videoWatchOptions.createOptionsForReload(options);
      
      if (this._lastCurrentTime > 0) {
        options.currentTime = this._lastCurrentTime;
      }
      this.open(this._watchId, options);
    },
    getCurrentTime: function() {
      if (!this._nicoVideoPlayer) {
        return 0;
      }
      var ct = this._nicoVideoPlayer.getCurrentTime() * 1;
      if (!this._playerState.isError && ct > 0) {
        this._lastCurrentTime = ct;
      }
      return this._lastCurrentTime;
    },
    setCurrentTime: function(sec) {
      if (!this._nicoVideoPlayer) {
        return;
      }
      if (!!'一般会員でもシークできるようになった'
          /*ZenzaWatch.util.isPremium() ||
          this.isInSeekableBuffer(sec)*/) {
        this._nicoVideoPlayer.setCurrentTime(sec);
        this._lastCurrentTime = sec;
        //this._lastCurrentTime = this._nicoVideoPlayer.getCurrentTime();
      }
    },
    isInSeekableBuffer: function() {
      return true;
    },
    getId: function() {
      return this._id;
    },
    isLastOpenedPlayer: function() {
      return this.getId() === this._playerConfig.getValue('lastPlayerId', true);
    },
    refreshLastPlayerId: function() {
      if (this.isLastOpenedPlayer()) { return; }
      this._playerConfig.setValue('lastPlayerId', '');
      this._playerConfig.setValue('lastPlayerId', this.getId());
    },
    _onVideoInfoLoaderLoad: function(requestId, videoInfoData, type, watchId) {
      console.log('VideoInfoLoader.load!', requestId, watchId, type, videoInfoData);
      if (this._requestId !== requestId) {
        return;
      }
      const videoInfo = this._videoInfo = new VideoInfoModel(videoInfoData);

      const autoDisableDmc =
        !videoInfo.isDmcOnly &&
        this._playerConfig.getValue('autoDisableDmc') &&
        !videoInfo.isEconomy &&
        util.isBetterThanDmcMayBe(
          videoInfo.width,
          videoInfo.height,
          videoInfo.duration
        );
      videoInfo.isDmcDisable = autoDisableDmc;

      this._playerState.setState({
        isDmcAvailable: videoInfo.isDmc,
        isCommunity: videoInfo.isCommunityVideo,
        isMymemory: videoInfo.isMymemory,
        isChannel: videoInfo.isChannel
      });

      const createSession = () => {
        this._videoSession = VideoSession.createInstance({
          videoInfo,
          videoWatchOptions: this._videoWatchOptions,
          videoQuality: this._playerConfig.getValue('dmcVideoQuality'),
          serverType: videoInfo.isDmc ? 'dmc' : 'old',
          isPlayingCallback: this.isPlaying.bind(this)
        });
      };
      createSession();
      this._setThumbnail(videoInfo.betterThumbnail);

      if (this._videoFilter.isNgVideo(videoInfo)) {
        return this._onVideoFilterMatch();
      }

      const loadSmilevideo = () => {
        if (this._playerConfig.getValue('enableVideoSession')) {
          this._videoSession.connect();
        }
        videoInfo.setCurrentVideo(videoInfo.videoUrl);
        this._playerState.isDmcPlaying = false;
        this.setVideo(videoInfo.videoUrl);
        this.emit('videoServerType', 'smile', {});
      };

      if (!autoDisableDmc &&
        this._playerConfig.getValue('enableDmc') && videoInfo.isDmc) {
        this._videoSession.connect().then(
          (sessionInfo) => {
            this.setVideo(sessionInfo.url);
            this._videoSessionInfo = sessionInfo;
            videoInfo.setCurrentVideo(sessionInfo.url);
            this._playerState.isDmcPlaying = true;
            this.emit('videoServerType', 'dmc', sessionInfo);
          },
          this._onVideoSessionFail.bind(this)
        );
      } else {
        loadSmilevideo();
      }
      this._nicoVideoPlayer.setVideoInfo(videoInfo);

      this.loadComment(videoInfo.msgInfo);

      this.emit('loadVideoInfo', videoInfo);

      if (FullScreen.now() || this._playerConfig.getValue('screenMode') === 'wide') {
        this.execCommand('notifyHtml',
          '<img src="' + videoInfo.thumbnail + '" style="width: 96px;">' +
          // タイトルは原則エスケープされてるけど信用してない
          util.escapeToZenkaku(videoInfo.title)
        );
      }
    },
    setVideo: function(url) {
      this._nicoVideoPlayer.setVideo(url);
    },
    loadComment: function(msgInfo) {
      msgInfo.language = this._playerConfig.getValue('commentLanguage');
      this._messageApiLoader.load(msgInfo).then(
        this._onCommentLoadSuccess.bind(this, this._requestId),
        this._onCommentLoadFail   .bind(this, this._requestId)
      );
    },
    reloadComment: function(param = {}) {
      const msgInfo = this._videoInfo.msgInfo;
      if (typeof param.when === 'number') {
        msgInfo.when = param.when;
      }
      this.loadComment(msgInfo);
    },
    _onVideoInfoLoaderFail: function(requestId, e) {
      const watchId = e.watchId;
      window.console.error('_onVideoInfoLoaderFail', watchId, e);
      if (this._requestId !== requestId) {
        return;
      }
      this._setErrorMessage(e.message || '通信エラー', watchId);
      this._playerState.isError = true;
      if (e.info) {
        this._videoInfo = new VideoInfoModel(e.info);
        this._setThumbnail(this._videoInfo.betterThumbnail);
        this.emit('loadVideoInfoFail', this._videoInfo);
      } else {
        this.emit('loadVideoInfoFail');
      }
      ZenzaWatch.emitter.emitAsync('loadVideoInfoFail', e);

      if (!this.isPlaylistEnable()) { return; }
      if (e.reason === 'forbidden' || e.info.isPlayable === false) {
        window.setTimeout(() => { this.playNextVideo(); }, 3000);
      }
    },
    _onVideoSessionFail: function(result) {
      window.console.error('dmc fail', result);
      this._setErrorMessage('動画の読み込みに失敗しました(dmc.nico)', this._watchId);
      this._playerState.setState({isError: true, isLoading: false});
      if (this.isPlaylistEnable()) {
        window.setTimeout(() => { this.playNextVideo(); }, 3000);
      }
    },
    _onVideoPlayStartFail: function(err) {
      window.console.error('動画再生開始に失敗', err);
      this._setErrorMessage('動画の再生開始に失敗しました', this._watchId);
      this._playerState.isError = true;

      this.emit('loadVideoInfoFail');
      ZenzaWatch.emitter.emitAsync('loadVideoInfoFail');

      // TODO: DMCのセッション切れなら自動リロード
      if (this._videoSession.isDmc && this._videoSession.isDeleted) {
        window.console.info('%cリロードしたら直るかも', 'background: yellow');
      }
    },
    _onVideoFilterMatch: function() {
      window.console.error('ng video', this._watchId);
      this._setErrorMessage('再生除外対象の動画または投稿者です');
      this._playerState.isError = true;
      this.emit('error');
      if (this.isPlaylistEnable()) {
        window.setTimeout(() => { this.playNextVideo(); }, 3000);
      }
    },
    _setThumbnail: function(thumbnail) {
      this._view.setThumbnail(thumbnail);
    },
    _setErrorMessage: function(msg) {
      this._view.setErrorMessage(msg);
    },
    _onCommentLoadSuccess: function(requestId, result) {
      if (requestId !== this._requestId) {
        return;
      }
      let options = {
        replacement: this._videoInfo.replacementWords,
        duration: this._videoInfo.duration
      };
      this._nicoVideoPlayer.closeCommentPlayer();
      this._threadInfo = result.threadInfo;
      this._nicoVideoPlayer.setComment(result.xml, options);

      this._playerState.isCommentReady = true;
      this._playerState.isWaybackMode = result.threadInfo.isWaybackMode;
      this.emit('commentReady', result, this._threadInfo);
      this.emit('videoCount', {comment: parseInt(result.threadInfo.lastRes, 10)});
    },
    _onCommentLoadFail: function(requestId, e) {
      if (requestId !== this._requestId) {
        return;
      }
      PopupMessage.alert(e.message);
    },
    _onLoadedMetaData: function() {
      // YouTubeは動画指定時にパラメータで開始位置を渡すので不要
      if (this._playerState.isYouTube) { return; }

      // パラメータで開始秒数が指定されていたらそこにシーク
      var currentTime = this._videoWatchOptions.getCurrentTime();
      if (currentTime > 0) {
        this.setCurrentTime(currentTime);
      }
    },
    _onVideoCanPlay: function() {
      if (this._playerState.isYouTube) { return; }
      window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
      this._playerConfig.setValue('lastWatchId', this._watchId);

      if (this._videoWatchOptions.isPlaylistStartRequest()) {
        this._initializePlaylist();

        var option = this._videoWatchOptions.getMylistLoadOptions();
        var query = this._videoWatchOptions.getQuery();

        // 通常時はプレイリストの置き換え、
        // 連続再生中はプレイリストに追加で読み込む
        option.append = this.isPlaying() && this._playlist.isEnable();

        // //www.nicovideo.jp/watch/sm20353707 // プレイリスト開幕用動画
        option.shuffle = parseInt(query.shuffle, 10) === 1;
        console.log('playlist option:', option);

        if (query.playlist_type === 'mylist') {
          this._playlist.loadFromMylist(option.group_id, option);
        } else if (query.playlist_type === 'deflist') {
          this._playlist.loadFromMylist('deflist', option);
        } else if (query.playlist_type === 'tag' || query.playlist_type === 'search'){
          var word = query.tag || query.keyword;
          option.searchType = query.tag ? 'tag' : '';
          _.assign(option, query);
          this._playlist.loadSearchVideo(word, option, this._playerConfig.getValue('search.limit'));
        }
        this._playlist.toggleEnable(true);
      } else if (PlaylistSession.isExist() && !this._playlist) {
        this._initializePlaylist();
        this._playlist.restoreFromSession();
      } else {
        this._initializePlaylist();
      }
      // チャンネル動画は、1本の動画がwatchId表記とvideoId表記で2本登録されてしまう。
      // そこでwatchId表記のほうを除去する
      this._playlist.insertCurrentVideo(this._videoInfo);
      if (this._videoInfo.watchId !==this._videoInfo.videoId &&
          this._videoInfo.videoId.indexOf('so') === 0) {
        this._playlist.removeItemByWatchId(this._videoInfo.watchId);
      }


      this._playerState.setVideoCanPlay();
      this.emitAsync('canPlay', this._watchId, this._videoInfo, this._videoWatchOptions);

      // プレイリストによって開かれた時は、自動再生設定に関係なく再生する
      if (this._videoWatchOptions.getEventType() === 'playlist' && this.isOpen()) {
        this.play();
      }
      if (this._nextVideo) {
        const nextVideo = this._nextVideo;
        this._nextVideo = null;
        if (!this._playlist) { return; }
        if (!this._playerConfig.getValue('enableNicosJumpVideo')) { return; }
        const nv = this._playlist.findByWatchId(nextVideo);
        if (nv && nv.isPlayed()) { return; } // 既にリストにあって再生済みなら追加しない(無限ループ対策)
        this.execCommand('notify', '@ジャンプ: ' + nextVideo);
        this.execCommand('playlistInsert', nextVideo);
      }

    },
    _onVideoPlay:    function() {
      this._playerState.setPlaying();
      this.emit('play');
    },
    _onVideoPlaying: function() {
      this.emit('playing');
    },
    _onVideoPause:   function() {
      this._savePlaybackPosition(this._watchId, this.getCurrentTime());
      this.emit('pause');
    },
    _onVideoStalled: function() {
      this._playerState.isStalled = true;
      this._savePlaybackPosition(this._watchId, this.getCurrentTime());
      this.emit('stalled');
    },
    _onVideoProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onVideoError: function(e) {
      this._playerState.setVideoErrorOccurred();

      this.emit('error', e);
      const isDmc = this._playerConfig.getValue('enableDmc') && this._videoInfo.isDmc;
      const code = (e && e.target && e.target.error && e.target.error.code) || 0;
      window.console.error('VideoError!', code, e);

      if (this._playerState.isPausing) {
        //this.reload();
        this._setErrorMessage(`停止中に動画のセッションが切れました。(code:${code})`);
        return;
      }

      // 10分以上たってエラーになるのはセッション切れ(nicohistoryの有効期限)
      // と思われるので開き直す
      if (Date.now() - this._lastOpenAt > 10 * 60 * 1000) {
        this.reload({ currentTime: this.getCurrentTime() });
      } else {
        if (this._videoInfo && !isDmc &&
            (!this._videoWatchOptions.isEconomy() && !this._videoInfo.isEconomy)
          ) {
          this._setErrorMessage('動画の再生に失敗しました。エコノミー回線に接続します。');
          setTimeout(() => {
            if (!this.isOpen()) { return; }
            this.reload({economy: true});
          }, 3000);
        } else {
          this._setErrorMessage('動画の再生に失敗しました。');
        }
      }
    },
    _onVideoAbort: function() {
      this.emit('abort');
    },
    _onVideoAspectRatioFix: function(ratio) {
      this.emit('aspectRatioFix', ratio);
    },
    _onVideoEnded: function() {
      // ループ再生中は飛んでこない
      this.emitAsync('ended');
      this._playerState.setVideoEnded();
      this._savePlaybackPosition(this._watchId, 0);
      if (this.isPlaylistEnable() && this._playlist.hasNext()) {
        this.playNextVideo({eventType: 'playlist'});
        return;
      } else if (this._playlist) {
        this._playlist.toggleEnable(false);
      }

      var isAutoCloseFullScreen =
        this._videoWatchOptions.hasKey('autoCloseFullScreen') ?
          this._videoWatchOptions.isAutoCloseFullScreen() :
          this._playerConfig.getValue('autoCloseFullScreen');
      if (FullScreen.now() && isAutoCloseFullScreen) {
        FullScreen.cancel();
      }
      ZenzaWatch.emitter.emitAsync('videoEnded');
    },
    _onVolumeChange: function(vol, mute) {
      this.emit('volumeChange', vol, mute);
    },
    _onVolumeChangeEnd: function(vol, mute) {
      this.emit('volumeChangeEnd', vol, mute);
    },
    _savePlaybackPosition: function(watchId, ct) {
      const vi = this._videoInfo;
      if (!vi) { return; }
      const dr = this.getDuration();
      console.info('%csave PlaybackPosition:', 'background: cyan', ct, dr, vi.csrfToken);
      if (vi.getWatchId() !== watchId) { return; }
      if (Math.abs(ct - dr) < 3) { return; }
      if (dr < 120) { return; } // 短い動画は記録しない
      PlaybackPosition.record(
        watchId,
        ct,
        vi.csrfToken
      ).catch((e) => { window.console.warn('save playback fail', e); });
    },
    close: function() {
      if (this.isPlaying()) {
        this._savePlaybackPosition(this._watchId, this.getCurrentTime());
      }
      if (FullScreen.now()) {
        FullScreen.cancel();
      }
      this.pause();
      this.hide();
      this._refresh();
      this.emit('close');
      ZenzaWatch.emitter.emitAsync('DialogPlayerClose');
    },
    _refresh: function() {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.close();
      }
      if (this._videoSession) { this._videoSession.close(); }
    },
    _initializePlaylist: function() {
      if (this._playlist) { return; }
      //if (!this._videoInfoPanel) { return; }
      var $container = this._view.appendTab('playlist', 'プレイリスト');
      this._playlist = new Playlist({
        loader: ZenzaWatch.api.ThumbInfoLoader,
        $container: $container,
        loop: this._playerConfig.getValue('playlistLoop')
      });
      this._playlist.on('command', this._onCommand.bind(this));
      this._playlist.on('update', _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
    },
    _initializeCommentPanel: function() {
      if (this._commentPanel) { return; }
      var $container = this._view.appendTab('comment', 'コメント');
      this._commentPanel = new CommentPanel({
        player: this,
        $container: $container,
        autoScroll: this._playerConfig.getValue('enableCommentPanelAutoScroll'),
        language: this._playerConfig.getValue('commentLanguage')
      });
      this._commentPanel.on('command', this._onCommand.bind(this));
      this._commentPanel.on('update', _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
    },
    isPlaylistEnable: function() {
      return this._playlist && this._playlist.isEnable();
    },
    playNextVideo: function(options) {
      if (!this._playlist || !this.isOpen()) { return; }
      var opt = this._videoWatchOptions.createOptionsForVideoChange(options);

      var nextId = this._playlist.selectNext();
      if (nextId) {
        this.open(nextId, opt);
      }
    },
    playPreviousVideo: function(options) {
      if (!this._playlist || !this.isOpen()) { return; }
      var opt = this._videoWatchOptions.createOptionsForVideoChange(options);

      var prevId = this._playlist.selectPrevious();
      if (prevId) {
        this.open(prevId, opt);
      }
    },
    play: function() {
      if (!this._playerState.isError && this._nicoVideoPlayer) {
        this._nicoVideoPlayer.play().catch((e) => {
          this._onVideoPlayStartFail(e);
        });
      }
    },
    pause: function() {
      if (!this._playerState.isError && this._nicoVideoPlayer) {
        this._nicoVideoPlayer.pause();
        this._playerState.setPausing();
      }
    },
    isPlaying: function() {
      return this._playerState.isPlaying;
    },
    togglePlay: function() {
      if (!this._playerState.isError && this._nicoVideoPlayer) {
        if (this.isPlaying()) {
          this.pause();
          return;
        }

        this._nicoVideoPlayer.togglePlay().catch((e) => {
          this._onVideoPlayStartFail(e);
        });
      }
    },
    setVolume: function(v) {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.setVolume(v);
      }
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._nicoVideoPlayer ||
          !this._messageApiLoader ||
          !this._playerState.isCommentReady ||
          this._playerState.isCommentPosting) {
        return Promise.reject();
      }

      if (this._threadInfo.force184 !== '1') {
        cmd = '184 ' + cmd;
      }
      options = options || {};
      options.mine = '1';
      options.updating = '1';
      vpos = vpos || this._nicoVideoPlayer.getVpos();
      const nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);

      this._playerState.isCommentPosting = true;

      let timeout;
      let resolve, reject;
      const lang = this._playerConfig.getValue('commentLanguage');
      window.console.time('コメント投稿');

      const _onSuccess = (result) => {
        window.console.timeEnd('コメント投稿');
        nicoChat.setIsUpdating(false);
        PopupMessage.notify('コメント投稿成功');
        this._playerState.isCommentPosting = false;

        this._threadInfo.blockNo = result.blockNo;
        window.clearTimeout(timeout);

        resolve(result);
      };

      const _onFailFinal = (err) => {
        err = err || {};

        window.console.log('_onFailFinal: ', err);
        window.clearTimeout(timeout);
        window.console.timeEnd('コメント投稿');

        nicoChat.setIsPostFail(true);
        nicoChat.setIsUpdating(false);
        PopupMessage.alert(err.message);
        this._playerState.isCommentPosting = false;
        if (err.blockNo && typeof err.blockNo === 'number') {
          this._threadInfo.blockNo = err.blockNo;
        }
        reject(err);
      };

      const _onTimeout = () => {
        PopupMessage.alert('コメント投稿失敗(timeout)');
        this._playerState.isCommentPosting = false;
        reject({});
      };

      const _retryPost = () => {
        window.clearTimeout(timeout);
        window.console.info('retry: コメント投稿');
        timeout = window.setTimeout(_onTimeout, 30000);

        return this._messageApiLoader
          .postChat(this._threadInfo, text, cmd, vpos, lang).then(
          _onSuccess,
          _onFailFinal
        );
      };

      const _onTicketFail = (err) => {
        this._messageApiLoader.load(this._videoInfo.msgInfo).then(
          (result) => {
            window.console.log('ticket再取得 success');
            this._threadInfo = result.threadInfo;
            return _retryPost();
          },
          (e) => {
            window.console.log('ticket再取得 fail: ', e);
            _onFailFinal(err);
          }
        );
      };

      const _onFail1st = (err) => {
        err = err || {};

        const errorCode = parseInt(err.code, 10);
        window.console.log('_onFail1st: ', errorCode);

        if (err.blockNo && typeof err.blockNo === 'number') {
          this._threadInfo.blockNo = err.blockNo;
        }

        if (errorCode === 3) {
          return _onTicketFail(err);
        } else if (![2, 4, 5].includes(errorCode)) {
          return _onFailFinal(err);
        }

        return _retryPost();
      };

      timeout = window.setTimeout(_onTimeout, 30000);

      text = ZenzaWatch.util.escapeHtml(text);
      return new Promise((res, rej) => {
        resolve = res;
        reject = rej;
        this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos, lang).then(
          _onSuccess,
          _onFail1st
        );
      });
    },
    getDuration: function() {
      if (!this._videoInfo) { return 0; }
      return this._videoInfo.duration;
    },
    getBufferedRange: function() {
      return this._nicoVideoPlayer.getBufferedRange();
    },
    getNonFilteredChatList: function() {
      return this._nicoVideoPlayer.getNonFilteredChatList();
    },
    getChatList: function() {
      return this._nicoVideoPlayer.getChatList();
    },
    getPlayingStatus: function() {
      if (!this._nicoVideoPlayer || !this._nicoVideoPlayer.isPlaying()) {
        return {};
      }

      const session = {
        playing: true,
        watchId: this._watchId,
        url: location.href,
        currentTime: this._nicoVideoPlayer.getCurrentTime()
      };

      const options = this._videoWatchOptions.createOptionsForSession();
      Object.keys(options).forEach(key => {
        session[key] = session.hasOwnProperty(key) ? session[key] : options[key];
      });

      return session;
    },
    getMymemory: function() {
      return this._nicoVideoPlayer.getMymemory();
    }
  });

  var VideoHoverMenu = function() { this.initialize.apply(this, arguments); };
  VideoHoverMenu.__css__ = (`

    /* マイページはなぜかhtmlにoverflow-y: scroll が指定されているので打ち消す */
    html.showNicoVideoPlayerDialog.zenzaScreenMode_3D,
    html.showNicoVideoPlayerDialog.zenzaScreenMode_normal,
    html.showNicoVideoPlayerDialog.zenzaScreenMode_big,
    html.showNicoVideoPlayerDialog.zenzaScreenMode_wide
    {
      overflow-x: hidden !important;
      overflow-y: hidden !important;
      overflow: hidden !important;
    }

    .menuItemContainer {
      box-sizing: border-box;
      position: absolute;
      z-index: ${CONSTANT.BASE_Z_INDEX + 40000};
      overflow: visible;

      will-change: transform, opacity;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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
      .zenzaScreenMode_wide .menuItemContainer.leftBottom,
      .fullScreen           .menuItemContainer.leftBottom {
        bottom: 64px;
      }
      .menuItemContainer.leftBottom .scalingUI {
        transform-origin: left bottom;
      }
      .zenzaScreenMode_wide .menuItemContainer.leftBottom .scalingUI,
      .fullScreen           .menuItemContainer.leftBottom .scalingUI {
        height: 64px;
      }

    .menuItemContainer.rightBottom {
      width: 120px;
      height: 80px;
      right:  0;
      bottom: 8px;
    }

      .zenzaScreenMode_wide .menuItemContainer.rightBottom,
      .fullScreen           .menuItemContainer.rightBottom {
        bottom: 64px;
      }


    .menuItemContainer.onErrorMenu {
      position: absolute;
      left: 50%;
      top: 60%;
      transform: translate(-50%, 0);
      display: none;
      white-space: nowrap;
    }
      .is-error .menuItemContainer.onErrorMenu {
        display: block !important;
        opacity: 1 !important;
      }
      .is-error .menuItemContainer.onErrorMenu .menuButton {
        opacity: 0.8 !important;
      }

      .menuItemContainer.onErrorMenu .menuButton {
        position: relative;
        display: inline-block !important;
        margin: 0 16px;
        padding: 8px;
        background: #888;
        color: #000;
        cursor: pointer;
        box-shadow: 4px 4px 0 #333;
        border: 2px outset;
        width: 100px;
        font-size: 14px;
        line-height: 16px;
      }
      .menuItemContainer.onErrorMenu .menuButton:active {
        background: #ccc;
        transform: translate(4px, 4px);
        border: 2px inset;
        box-shadow: none;
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
        transform 0.2s linear,
        box-shadow 0.2s ease,
        background 0.4s ease;
      box-sizing: border-box;
      text-align: center;
      text-shadow: none;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
      .menuButton:hover {
        box-shadow: 0 0 4px #000;
        cursor: pointer;
        opacity: 1;
      }
      .menuButton:active {
        transform: translate(4px, 4px);
        box-shadow: 0 0 0 #000;
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

      .menuButton .selectMenu {
        transition: transform 0.2s linear;
        transform: translate( 4px,  4px);
      }
      .menuButton:active .selectMenu {
        transform: translate(-4px, -4px);
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
          transform 0.2s linear,
          box-shadow 0.2s ease,
          background 0.4s ease;
      }
      .is-mouseMoving .menuButton .menuButtonInner {
        opacity: 0.8;
        word-break: normal;
        transition:
          transform 0.2s linear,
          box-shadow 0.2s ease,
          background 0.4s ease;
       }


    .showCommentSwitch {
      left: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #666;
      line-height: 30px;
      font-size: 24px;
      text-decoration: line-through;
      border-radius: 4px;
    }
      .is-showComment .showCommentSwitch {
        background:#888;
        color: #fff;
        text-shadow: 0 0 6px orange;
        text-decoration: none;
      }

    .ngSettingMenu {
      display: none;
      left: 80px;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #666;
      line-height: 30px;
      font-size: 18px;
      border-radius: 4px;
    }
      .is-showComment .ngSettingMenu {
        display: block;
      }
      .ngSettingMenu:hover {
        background: #888;
        /*font-size: 120%;*/
        box-shadow: 4px 4px 0 #000;
        text-shadow: 0px 0px 2px #ccf;
      }
      .ngSettingMenu.show,
      .ngSettingMenu:active {
        opacity: 1;
        background: #888;
        border: 1px solid #ccc;
        box-shadow: none;
        margin-left: 4px;
        margin-top:  4px;
      }

    .ngSettingSelectMenu {
      white-space: nowrap;
      bottom: 0px;
      left: 32px;
    }
      .ngSettingSelectMenu .triangle {
        transform: rotate(45deg);
        left: -8px;
        bottom: 3px;
      }
      .zenzaScreenMode_wide .ngSettingSelectMenu,
      .fullScreen           .ngSettingSelectMenu {
        bottom: 0px;
      }

      .ngSettingSelectMenu .sharedNgLevelSelect {
        display: none;
      }

      .ngSettingSelectMenu.is-enableFilter .sharedNgLevelSelect {
        display: block;
      }


    .menuItemContainer .mylistButton {
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #666;
      border-radius: 4px;
      line-height: 30px;
      font-size: 21px;
      white-space: nowrap;
    }
    .is-mouseMoving .mylistButton {
      /*text-shadow: 1px 1px 2px #888;*/
    }

    .mylistButton.mylistAddMenu {
      left: 40px;
      top: 0;
    }
    .mylistButton.deflistAdd {
      left: 80px;
      top: 0;
    }

    .menuItemContainer .mylistButton:hover {
      background: #888;
      color: #000;
      text-shadow: 0px 0px 2px #66f;
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

    .mylistButton.mylistAddMenu.show,
    .is-updatingMylist  .mylistButton.mylistAddMenu {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset #000 !important;
      color: #000 !important;
      box-shadow: none !important;
    }
    .mylistButton.mylistAddMenu.show{
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
      right: 72px;
      padding: 8px 0;
    }
      .mylistSelectMenu .mylistSelectMenuInner {
        overflow-y: auto;
        overflow-x: hidden;
        max-height: 50vh;
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
        background: url("//uni.res.nimg.jp/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
        transform: scale(1.5); -webkit-transform: scale(1.5);
        transform-origin: 0 0 0; -webkit-transform-origin: 0 0 0;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
        -webkit-transition: -webkit-transform 0.1s ease, box-shadow 0.1s ease;
        cursor: pointer;
      }
      .mylistSelectMenu .mylistIcon:hover {
        background-color: #ff9;
        transform: scale(2); -webkit-transform: scale(2);
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

    .menuItemContainer .zenzaTweetButton {
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #666;
      border-radius: 4px;
      line-height: 30px;
      font-size: 24px;
      white-space: nowrap;
    }
      .is-mouseMoving .zenzaTweetButton {
        /*text-shadow: 1px 1px 2px #88c;*/
      }
      .zenzaTweetButton:hover {
        text-shadow: 1px 1px 2px #88c;
        background: #1da1f2;
        color: #fff;
      }
      /*.zenzaTweetButton:active {
        transform: scale(0.8);
      }*/


    .closeButton {
      position: absolute;
      cursor: pointer;
      width: 32px;
      height: 32px;
      box-sizing: border-box;
      text-align: center;
      line-height: 30px;
      font-size: 20px;
      top: 0;
      right: 0;
      z-index: ${CONSTANT.BASE_Z_INDEX + 60000};
      margin: 0 0 40px 40px;
      opacity: 0;
      color: #ccc;
      border: solid 1px #888;
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
      line-height: 30px;
      font-size: 21px;
      white-space: nowrap;
      cursor: pointer;
      border: 1px solid black;
      background: rgba(192, 192, 192, 0.8);
    }

    .is-filterEnable {
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
      color: #ccc;
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


  `).trim();

  VideoHoverMenu.__tpl__ = (`
    <div class="hoverMenuContainer">
      <div class="menuItemContainer leftTop">
          <div class="command menuButton toggleDebugButton" data-command="toggle-debug">
            <div class="menuButtonInner">debug mode</div>
          </div>
      </div>

      <div class="menuItemContainer rightTop">
        <div class="scalingUI">
          <div class="command menuButton zenzaTweetButton" data-command="tweet">
            <div class="tooltip">ツイート</div>
            <div class="menuButtonInner">t</div>
          </div>
          <div class="command menuButton mylistButton mylistAddMenu" data-command="mylistMenu">
            <div class="tooltip">マイリスト登録</div>
            <div class="menuButtonInner">My</div>
          </div>

          <div class="mylistSelectMenu selectMenu zenzaPopupMenu">
            <div class="triangle"></div>
            <div class="mylistSelectMenuInner">
            </div>
          </div>

          <div class="command menuButton mylistButton deflistAdd" data-command="deflistAdd">
            <div class="tooltip">とりあえずマイリスト(T)</div>
            <div class="menuButtonInner">&#x271A;</div>
          </div>

          <div class="command menuButton closeButton" data-command="close">
            <div class="menuButtonInner">&#x2716;</div>
          </div>

        </div>
      </div>

      <div class="menuItemContainer leftBottom">
        <div class="scalingUI">
          <div class="command showCommentSwitch menuButton" data-command="toggle-showComment">
            <div class="tooltip">コメント表示ON/OFF(V)</div>
            <div class="menuButtonInner">💬</div>
          </div>

          <div class="command ngSettingMenu menuButton" data-command="ngSettingMenu">
            <div class="tooltip">NG設定</div>
            <div class="menuButtonInner">NG</div>

              <div class="ngSettingSelectMenu selectMenu zenzaPopupMenu">
                <div class="triangle"></div>
                <p class="caption">NG設定</p>
                <ul>
                  <li class="command update-enableFilter"
                    data-command="update-enableFilter"
                    data-param="true"  data-type="bool"><span>ON</span></li>
                  <li class="command update-enableFilter"
                    data-command="update-enableFilter"
                    data-param="false" data-type="bool"><span>OFF</span></li>
                </ul>
                <p class="caption sharedNgLevelSelect">NG共有設定</p>
                <ul class="sharedNgLevelSelect">
                  <li class="command sharedNgLevel max"
                    data-command="update-sharedNgLevel"
                    data-param="MAX"><span>最強</span></li>
                  <li class="command sharedNgLevel high"
                    data-command="update-sharedNgLevel"
                    data-param="HIGH"><span>強</span></li>
                  <li class="command sharedNgLevel mid"
                    data-command="update-sharedNgLevel"
                    data-param="MID"><span>中</span></li>
                  <li class="command sharedNgLevel low"
                    data-command="update-sharedNgLevel"
                    data-param="LOW"><span>弱</span></li>
                  <li class="command sharedNgLevel none"
                    data-command="update-sharedNgLevel"
                    data-param="NONE"><span>なし</span></li>
                </ul>
              </div>

          </div>
        </div>
      </div>

      <div class="menuItemContainer onErrorMenu">
        <div class="command menuButton openGinzaMenu" data-command="openGinza">
          <div class="menuButtonInner">GINZAで視聴</div>
        </div>

        <div class="command menuButton reloadMenu" data-command="reload">
          <div class="menuButtonInner">リロード</div>
        </div>

        <div class="command menuButton playNextVideo" data-command="playNextVideo">
          <div class="menuButtonInner">次の動画</div>
        </div>
      </div>

      <div class="command togglePlayMenu menuItemContainer center" data-command="togglePlay">
        ▶
      </div>

    </div>
  `).trim();

  _.extend(VideoHoverMenu.prototype, AsyncEmitter.prototype);
  _.assign(VideoHoverMenu.prototype, {
    initialize: function(params) {
      this._container        = params.playerContainer;
      this._playerState      = params.playerState;

      this._bound = {};
      this._bound.onBodyClick = this._onBodyClick.bind(this);
      this._bound.emitClose =
        _.debounce(() => { this.emit('command', 'close'); }, 300);

      this._initializeDom();
      this._initializeNgSettingMenu();

      window.setTimeout(this._initializeMylistSelectMenu.bind(this), 0);
    },
    _initializeDom: function() {
      util.addStyle(VideoHoverMenu.__css__);

      let container = this._container;
      container.appendChild(util.createDom(VideoHoverMenu.__tpl__));

      let menuContainer = util.$(container.querySelectorAll('.menuItemContainer'));
      menuContainer.on('contextmenu',
        e => { e.preventDefault(); e.stopPropagation(); });
      menuContainer.on('click',     this._onClick.bind(this));
      menuContainer.on('mousedown', this._onMouseDown.bind(this));

      ZenzaWatch.emitter.on('hideHover', this._hideMenu.bind(this));
    },
    _initializeMylistSelectMenu: function() {
      this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      this._mylistApiLoader.getMylistList().then(mylistList => {
        this._mylistList = mylistList;
        this._initializeMylistSelectMenuDom();
      });
    },
    _initializeMylistSelectMenuDom: function(mylistList) {
      mylistList = mylistList || this._mylistList;
      let menu = this._container.querySelector('.mylistSelectMenu');
      menu.addEventListener('wheel', e => { e.stopPropagation(); }, {passive: true});

      let ul = document.createElement('ul');
      mylistList.forEach(mylist => {
        let li = document.createElement('li');
        li.className = `folder${mylist.icon_id}`;

        let icon = document.createElement('span');
        icon.className = 'mylistIcon command';
        util.$(icon).attr({
          'data-mylist-id':   mylist.id,
          'data-mylist-name': mylist.name,
          'data-command': 'mylistOpen',
          title: mylist.name + 'を開く'
        });

        let link = document.createElement('a');
        link.className = 'mylistLink name command';
        link.textContent = mylist.name;
        util.$(link).attr({
          href: `//www.nicovideo.jp/my/mylist/#/${mylist.id}`,
          'data-mylist-id': mylist.id,
          'data-mylist-name': mylist.name,
          'data-command': 'mylistAdd'
        });

        li.appendChild(icon);
        li.appendChild(link);
        ul.appendChild(li);
      });

      this._container.querySelector('.mylistSelectMenuInner').appendChild(ul);
    },
    _initializeNgSettingMenu: function() {
      let state = this._playerState;
      let menu = this._container.querySelector('.ngSettingSelectMenu');

      let enableFilterItems = Array.from(menu.querySelectorAll('.update-enableFilter'));
      const updateEnableFilter = (v) => {
        enableFilterItems.forEach(item => {
          const p = JSON.parse(item.getAttribute('data-param'));
          item.classList.toggle('selected', v === p);
        });
        menu.classList.toggle('is-enableFilter', v);
      };
      updateEnableFilter(state.isEnableFilter);
      state.on('update-isEnableFilter', updateEnableFilter);

      let sharedNgItems = Array.from(menu.querySelectorAll('.sharedNgLevel'));
      const updateNgLevel = (level) => {
        sharedNgItems.forEach(item => {
          item.classList.toggle('selected', level === item.getAttribute('data-param'));
        });
      };
      updateNgLevel(state.sharedNgLevel);
      state.on('update-sharedNgLevel', updateNgLevel);
    },
    _onMouseDown: function(e) {
      e.preventDefault();
      e.stopPropagation();
      const target =
        e.target.classList.contains('command') ?  e.target : e.target.closest('.command');
      if (!target) { return; }
      let command = target.getAttribute('data-command');
      switch (command) {
        case 'deflistAdd':
          if (e.shiftKey) {
            command = 'mylistWindow';
          } else {
            command = e.which > 1 ? 'deflistRemove' : 'deflistAdd';
          }
          this.emit('command', command);
          break;
        case 'mylistAdd': {
          command = (e.shiftKey || e.which > 1) ? 'mylistRemove' : 'mylistAdd';
          let mylistId   = target.getAttribute('data-mylist-id');
          let mylistName = target.getAttribute('data-mylist-name');
          this._hideMenu();
          this.emit('command', command, {mylistId: mylistId, mylistName: mylistName});
          break;
        }
        case 'mylistOpen': {
          let mylistId   = target.getAttribute('data-mylist-id');
          location.href = `//www.nicovideo.jp/my/mylist/#/${mylistId}`;
          break;
        }
        case 'close':
          this._bound.emitClose();
          break;
        default:
          return;
      }
    },
    _onClick: function(e) {
      e.preventDefault();
      e.stopPropagation();
      const target =
        e.target.classList.contains('command') ?  e.target : e.target.closest('.command');
      if (!target) { return; }
      const command = target.getAttribute('data-command');

      const type  = target.getAttribute('data-type') || 'string';
      let param   = target.getAttribute('data-param');
      switch (type) {
        case 'json':
        case 'bool':
        case 'number':
          param = JSON.parse(param);
          break;
      }

      switch (command) {
        case 'deflistAdd': case 'mylistAdd': case 'mylistOpen': case 'close':
          this._hideMenu();
          break;
        case 'mylistMenu':
          if (e.shiftKey) {
            this.emit('command', 'mylistWindow');
          } else {
            this.toggleMylistMenu();
          }
          break;
        case 'ngSettingMenu':
          this.toggleNgSettingMenu();
          break;
        default:
          this._hideMenu();
          this.emit('command', command, param);
          break;
       }
    },
    _hideMenu: function() {
      window.setTimeout(() => {
        this.toggleMylistMenu(false);
        this.toggleNgSettingMenu(false);
      }, 0);
    },
    toggleMylistMenu: function(v) {
      this._toggleMenu('mylistAddMenu mylistSelectMenu', v);
    },
    toggleNgSettingMenu: function(v) {
      this._toggleMenu('ngSettingMenu ngSettingSelectMenu', v);
    },
    _toggleMenu: function(name, v) {
      const body = this._body || util.$('body');
      this._body = body;
      
      body.off('click', this._bound.onBodyClick);

      util.$('.selectMenu, .menuButton').forEach(item => {
        if (util.$(item).hasClass(name)) {
          util.$(item).toggleClass('show', v);
          v = util.$(item).hasClass('show');
        } else {
          item.classList.remove('show');
        }
      });

      if (v) {
        body.on('click', this._bound.onBodyClick);
        ZenzaWatch.emitter.emitAsync('showMenu');
      }
      return !!v;
    },
    _onBodyClick: function() {
      this._hideMenu();
      ZenzaWatch.emitter.emitAsync('hideMenu');
    }
  });


  var DynamicCss = function() { this.initialize.apply(this, arguments); };
  DynamicCss.__css__ = `
    .scalingUI {
      transform: scale(%SCALE%);
    }
    .videoControlBar {
      height: %CONTROL_BAR_HEIGHT%px !important;
    }

    .zenzaPlayerContainer .commentLayerFrame {
      opacity: %COMMENT_LAYER_OPACITY%;
    }

  `;
  DynamicCss.prototype = {
    initialize: function(params) {
      var config = this._playerConfig = params.playerConfig;

      this._scale = 1.0;
      this._commentLayerOpacity = 1.0;

      var update = _.debounce(this._update.bind(this), 1000);
      config.on('update-menuScale', update);
      config.on('update-commentLayerOpacity', update);
      update();
    },
    _update: function() {
      var scale = parseFloat(this._playerConfig.getValue('menuScale'), 10);
      var commentLayerOpacity =
        parseFloat(this._playerConfig.getValue('commentLayerOpacity'), 10);

      if (this._scale === scale &&
          this._commentLayerOpacity === commentLayerOpacity) { return; }

      if (!this._style) {
        this._style = util.addStyle('');
      }

      this._scale = scale;
      this._commentLayerOpacity = commentLayerOpacity;

      var tpl = DynamicCss.__css__
        .replace(/%SCALE%/g, scale)
        .replace(/%CONTROL_BAR_HEIGHT%/g,
          (VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) * scale +
          VideoControlBar.BASE_SEEKBAR_HEIGHT
          )
        .replace(/%COMMENT_LAYER_OPACITY%/g, commentLayerOpacity)
        //.replace(/%HEADER_OFFSET%/g, headerOffset * -1)
        ;
      //window.console.log(tpl);
      this._style.innerHTML = tpl;
    }
  };













  var CommentInputPanel = function() { this.initialize.apply(this, arguments); };
  CommentInputPanel.__css__ = (`
    .commentInputPanel {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50% + 50vw);
      box-sizing: border-box;

      width: 200px;
      height: 50px;
      z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
      transform: translate(-50%, -170px);
      overflow: visible;
    }
    .zenzaPlayerContainer.is-notPlayed .commentInputPanel,
    .zenzaPlayerContainer.is-waybackMode .commentInputPanel,
    .zenzaPlayerContainer.is-mymemory .commentInputPanel,
    .zenzaPlayerContainer.is-loading  .commentInputPanel,
    .zenzaPlayerContainer.is-error    .commentInputPanel {
      display: none;
    }

    .commentInputPanel.active {
      left: calc(-50vw + 50% + 50vw);
      width: 500px;
      z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
    }
    .zenzaScreenMode_wide .commentInputPanel,
    .fullScreen           .commentInputPanel {
      position: absolute !important; /* fixedだとFirefoxのバグで消える */
      top:  auto !important;
      bottom: 120px !important;
      transform: translate(-50%, 0);
      /*left: calc(-50vw + 50% + 50vw) !important;*/
      left: 50%;
    }
    .zenzaScreenMode_wide .commentInputPanel.active,
    .fullScreen           .commentInputPanel.active {
      /*left: calc(-50vw + 50% + 50vw) !important;*/
    }

    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .commentInputPanel {
        /*top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);*/
        transform: translate(-50%, -230px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .commentInputPanel {
        /*top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);*/
        transform: translate(-50%, -230px);
      }
    }


    .commentInputPanel>* {
      pointer-events: none;
    }
    
    .commentInputPanel input {
      font-size: 18px;
    }

    .commentInputPanel.active>*,
    .commentInputPanel:hover>* {
      pointer-events: auto;
    }

    .is-mouseMoving .commentInputOuter {
      border: 1px solid #888;
      box-sizing: border-box;
      border-radius: 8px;
      opacity: 0.5;
    }
    .is-mouseMoving:not(.active) .commentInputOuter {
      box-shadow: 0 0 8px #fe9, 0 0 4px #fe9 inset;
    }

    .commentInputPanel.active .commentInputOuter,
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
    .commentInputPanel.active .commentInput {
      opacity: 0.9 !important;
    }
    .commentInputPanel.active .commentInput,
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

    .commentInputPanel.active .autoPauseLabel {
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
    .commentInputPanel.active .commandInput {
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
    .commentInputPanel.active .commentSubmit {
      right: -108px;
      z-index: 1;
      opacity: 0.9;
      box-shadow: 0 0 8px #fff;
    }
    .commentInputPanel.active .commentSubmit:active {
      color: #000;
      background: #fff;
      box-shadow: 0 0 16px #ccf;
    }

    .commentInputPanel .recButton {
      display: none;
      position: absolute;
      top: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      border-radius: 100%;
      cursor: pointer;
      background: #666;
    }

    .commentInputPanel.active.availableRecognizer .recButton {
      display: block;
    }
    .commentInputPanel .recButton.rec {
      background: red;
    }

  `).trim();

  CommentInputPanel.__tpl__ = (`
    <div class="commentInputPanel">
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
            autocomplete="on"
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

  _.extend(CommentInputPanel.prototype, AsyncEmitter.prototype);
  _.assign(CommentInputPanel.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;


      this._recognizer = new ZenzaWatch.util.Recognizer();

      this._initializeDom();

      this._playerConfig.on('update-autoPauseCommentInput',
        _.bind(this._onAutoPauseCommentInputChange, this));
    },
    _initializeDom: function() {
      var $container = this._$playerContainer;
      var config = this._playerConfig;

      ZenzaWatch.util.addStyle(CommentInputPanel.__css__);
      $container.append(CommentInputPanel.__tpl__);

      var $view = this._$view = $container.find('.commentInputPanel');
      var $input = this._$input = $view.find('.commandInput, .commentInput');
      this._$form = $container.find('form');
      var $autoPause = this._$autoPause = $container.find('.autoPause');
      this._$commandInput = $container.find('.commandInput');
      var $cmt = this._$commentInput = $container.find('.commentInput');
      this._$commentSubmit = $container.find('.commentSubmit');
      var preventEsc = _.bind(function(e) {
        if (e.keyCode === 27) { // ESC
          e.preventDefault();
          e.stopPropagation();
          this.emit('esc');
          $input.blur();
        }
      }, this);

      var $rec = this._$recButton = $view.find('.recButton');
      $rec.on('click', _.bind(function() {
        $rec.toggleClass('rec');
        this._recognizerEnabled = $rec.hasClass('rec');
        if (this._recognizerEnabled && !this._recognizer.isEnable()) {
          this._recognizer.enable();
          this._recognizer.on('result', _.bind(this._onRecognizerResult, this));
        }
        if (this._recognizerEnabled) {
          this._recognizer.start();
        } else {
          this._recognizer.stop();
        }
        $input.focus();
      }, this));

      $input
        .on('focus', _.bind(this._onFocus, this))
        .on('blur', _.debounce(_.bind(this._onBlur, this), 500))
        .on('keydown', preventEsc)
        .on('keyup', preventEsc);

      $autoPause.prop('checked', config.getValue('autoPauseCommentInput'));
      this._$autoPause.on('change', function() {
        config.setValue('autoPauseCommentInput', !!$autoPause.prop('checked'));
        $cmt.focus();
      });
      this._$view.find('label').on('click', function(e) {
        e.stopPropagation();
      });
      this._$form.on('submit', _.bind(this._onSubmit, this));
      this._$commentSubmit.on('click', _.bind(this._onSubmitButtonClick, this));
      $view.on('click', function(e) {
        e.stopPropagation();
      });
      $view.toggleClass('availableRecognizer', this._recognizer.isAvailable());
    },
    _onFocus: function() {
      this._$view.addClass('active');
      if (!this._hasFocus) {
        this.emit('focus', this.isAutoPause());
      }
      this._hasFocus = true;
    },
    _onBlur: function() {
      if (this._$commandInput.is(':focus') ||
          this._$commentInput.is(':focus')) {
        return;
      }
      this._$view.removeClass('active');
      this.emit('blur', this.isAutoPause());

      this._hasFocus = false;
    },
    _onSubmit: function() {
      this.submit();
    },
    _onSubmitButtonClick: function() {
      this._$form.submit();
    },
    _onAutoPauseCommentInputChange: function(val) {
      this._$autoPause.prop('checked', !!val);
    },
    submit: function() {
      var chat = this._$commentInput.val().trim();
      var cmd = this._$commandInput.val().trim();
      if (chat.length < 1) {
        return;
      }

      ZenzaWatch.util.callAsync(function() {
        this._$commentInput.val('').blur();
        this._$commandInput.blur();

        var $view = this._$view.addClass('updating');
        this.emitPromise('post', chat, cmd).then(function() {
          $view.removeClass('updating');
        }, function() {
          // TODO: 失敗時はなんかフィードバックさせる？
          $view.removeClass('updating');
        });
      }, this);
    },
    isAutoPause: function() {
      return !!this._$autoPause.prop('checked');
    },
    focus: function() {
      this._$commentInput.focus();
      this._onFocus();
    },
    blur: function() {
      this._$commandInput.blur();
      this._$commentInput.blur();
      this._onBlur();
    },
    _onRecognizerResult: function(text) {
      window.console.log('_onRecognizerResult: ', text);
      if(!this._hasFocus) { return; }
      var $inp = this._$commentInput;
      $inp.val($inp.val() + text);
    }
  });


  var Recognizer = function() { this.initialize.apply(this, arguments); };
  _.extend(Recognizer.prototype, AsyncEmitter.prototype);
  _.assign(Recognizer.prototype, {
    initialize: function() {
      this._enable = false;
      this._recording = false;
    },
    enable: function() {
      if (!this.isAvailable()) { return false;}
      if (this._recognition) { return true; }
      var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      var rec = this._recognition = new Rec();
      rec.lang = ZenzaWatch.util.getLang();
      rec.maxAlternatives = 1;
      rec.continuous = true;
      rec.addEventListener('result', _.bind(this._onResult, this));
      this._enable = true;
      return true;
    },
    disable: function() {
      this._enable = false;
      return false;
    },
    isEnable: function() {
      return this._enable;
    },
    isAvailable: function() {
      return (window.SpeechRecognition || window.webkitSpeechRecognition) ? true : false;
    },
    isRecording: function() {
      return this._recording;
    },
    start: function() {
      if (!this.isAvailable()) { return false; }
      this.enable();
      this._recording = true;
      this._recognition.start();
    },
    stop: function() {
      if (!this._recognition) { return; }
      this._recording = false;
      this._recognition.stop();
    },
    _onResult: function(e) {
      if (!this._enable) { return; }
      var results = e.results;
      var text = '';
      for (var i = 0, len = results.length; i < len; i++) {
        var result = results.item(i);
        if(result.final === true || result.isFinal === true){
          text = result.item(0).transcript;
        }
      }
      this.emit('result', text);
    }
  });

  ZenzaWatch.util.Recognizer = Recognizer;


  var SettingPanel = function() { this.initialize.apply(this, arguments); };
  SettingPanel.__css__ = (`
    .zenzaSettingPanel {
      position: absolute;
      left: 50%;
      top: -100vh;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 170000;
      width: 500px;
      height: 400px;
      color: #fff;
      transition: top 0.4s ease;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      overflow-y: hidden;
    }
    .zenzaSettingPanel.show {
      opacity: 1;
      top: 50%;
      overflow-y: scroll;
      overflow-x: hidden;
      background: rgba(0, 0, 0, 0.8);
    }

    .zenzaScreenMode_sideView .zenzaSettingPanel.show,
    .zenzaScreenMode_small    .zenzaSettingPanel.show {
      position: fixed;
    }

    .zenzaSettingPanel.show {
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

    .zenzaSettingPanel .control.checked {
    }


    .zenzaSettingPanel .filterEditContainer {
      color: #fff;
      margin-bottom: 32px;
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
    <div class="zenzaSettingPanel">
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

        <div class="overrideWatchLinkControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableCommentPanel">
            右パネルにコメント一覧を表示
          </label>
        </div>

        <div class="UaaEnableControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="uaa.enable">
            ニコニ広告の情報を取得する(対応ブラウザのみ)
          </label>
        </div>

        <div class="backCommentControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="backComment">
            コメントを動画の後ろに流す
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
            旧システムのほうが画質が良さそうな時は旧システムを使う
          </label>
        </div>

        <div class="enableVideoSession control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableVideoSession">
            20分を超える動画の再生安定化テストを有効にする
          </label>
        </div>

        <div class="enableNicosJumpVideo control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableNicosJumpVideo"
            data-command="toggle-enableNicosJumpVideo">
            ＠ジャンプで指定された動画をプレイリストに入れる
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

        <p class="caption">フォントの設定</p>
        <div class="fontEdit">

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


        </div>

        <p class="caption">NG設定</p>
        <div class="filterEditContainer">
          <span class="info">
            １行ごとに入力。プレミアム会員に上限はありませんが、増やしすぎると重くなります。
          </span>
          <p>NGワード (一般会員は20まで)</p>
          <textarea
            class="filterEdit wordFilterEdit"
            data-command="setWordFilterList"></textarea>
          <p>NGコマンド (一般会員は10まで)</p>
          <textarea
            class="filterEdit commandFilterEdit"
            data-command="setCommandFilterList"></textarea>
          <p>NGユーザー (一般会員は10まで)</p>
          <textarea
            class="filterEdit userIdFilterEdit"
            data-command="setUserIdFilterList"></textarea>
        </div>

        <!--
        <p class="caption">一発ネタ系(飽きたら消します)</p>
        <div class="speakLarkControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="speakLark">
            コメントの読み上げ(対応ブラウザのみ)
          </label>
        </div>
        <div class="speakLarkVolumeControl control toggle">
          <label>
            <select class="speakLarkVolume" data-setting-name="speakLarkVolume">
              <option value="1.0" selected>100%</option>
              <option value="0.9" selected>90%</option>
              <option value="0.8" selected>80%</option>
              <option value="0.7" selected>70%</option>
              <option value="0.6" selected>60%</option>
              <option value="0.5" selected>50%</option>
              <option value="0.4" selected>40%</option>
              <option value="0.3" selected>30%</option>
              <option value="0.2" selected>20%</option>
              <option value="0.1" selected>10%</option>
            </select>
            読み上げの音量
          </label>
        </div>
        -->

        <!--
        <p class="caption">開発中・テスト中の項目</p>
        <div class="debugControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="debug">
            デバッグ
          </label>
        </div>
        -->


      </div>
    </div>
  `).trim();
  _.extend(SettingPanel.prototype, AsyncEmitter.prototype);

  _.assign(SettingPanel.prototype, {
    initialize: function(params) {
      this._playerConfig     = params.playerConfig;
      this._$playerContainer = params.$playerContainer;
      this._player           = params.player;

      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
      this._initializeDom();
      this._initializeCommentFilterEdit();
    },
    _initializeDom: function() {
      var $container = this._$playerContainer;
      var config = this._playerConfig;

      ZenzaWatch.util.addStyle(SettingPanel.__css__);
      $container.append(SettingPanel.__tpl__);

      var $panel = this._$panel = $container.find('.zenzaSettingPanel');
      this._$view =
        $container.find('.zenzaSettingPanel, .zenzaSettingPanelShadow1, .zenzaSettingPanelShadow2');
      this._$view.on('click', function(e) {
        e.stopPropagation();
      });
      this._$view.on('wheel', function(e) {
        e.stopPropagation();
      });

      var $check = $panel.find('input[type=checkbox]');
      $check.each(function(i, check) {
        var $c = $(check);
        var settingName = $c.attr('data-setting-name');
        var val = config.getValue(settingName);
        $c.prop('checked', val);
        $c.closest('.control').toggleClass('checked', val);
      });
      $check.on('change', _.bind(this._onToggleItemChange, this));

      const $radio = $panel.find('input[type=radio]');
      $radio.each((i, check) => {
        const $c = $(check);
        const settingName = $c.attr('data-setting-name');
        const val = config.getValue(settingName);
        $c.prop('checked', val === $c.val());
        //$c.closest('.control').toggleClass('checked', val);
      });
      $radio.on('change', this._onRadioItemChange.bind(this));

      var $text = $panel.find('input[type=text]');
      $text.each(function(i, text) {
        var $t = $(text);
        var settingName = $t.attr('data-setting-name');
        var val = config.getValue(settingName);
        $t.val(val);
      });
      $text.on('change', _.bind(this._onInputItemChange, this));

      var $select = $panel.find('select');
      $select.each(function(i, select) {
        var $s = $(select);
        var settingName = $s.attr('data-setting-name');
        var val = config.getValue(settingName);
        $s.val(val);
      });
      $select.on('change', _.bind(this._onInputItemChange, this));


      ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        this.hide();
      }, this));

    },
    _initializeCommentFilterEdit: function() {
      var self = this;
      var config = this._playerConfig;
      var $view = this._$view;
      var $edit          = $view.find('.filterEdit');
      var $wordFilter    = $view.find('.wordFilterEdit');
      var $userIdFilter  = $view.find('.userIdFilterEdit');
      var $commandFilter = $view.find('.commandFilterEdit');
      var map = {
        wordFilter:    $wordFilter,
        userIdFilter:  $userIdFilter,
        commandFilter: $commandFilter
      };

      $edit.on('change', function(e) {
        var $target = $(e.target);
        var command = $target.attr('data-command');
        var value   = $target.val();
        self.emit('command', command, value);
      });

      _.each(Object.keys(map), function(v) {
        var value = config.getValue(v) || [];
        value = _.isArray(value) ? value.join('\n') : value;
        map[v].val(value);
      });

      var onConfigUpdate = function(key, value) {
        if (['wordFilter', 'userIdFilter', 'commandFilter'].includes(key)) {
          map[key].val(value.join('\n'));
        }
      };
      config.on('update', onConfigUpdate);
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'mute':
        case 'loop':
        case 'autoPlay':
        case 'enableHeatMap':
        case 'showComment':
        case 'autoFullScreen':
        case 'enableStoryboard':
        case 'enableCommentPanel':
        case 'debug':
          this._$panel
            .find('.' + key + 'Control').toggleClass('checked', value)
            .find('input[type=checkbox]').prop('checked', value);
          break;
      }
    },
    _onToggleItemChange: function(e) {
      let $target = $(e.target);
      let settingName = $target.attr('data-setting-name');
      let val = !!$target.prop('checked');

      this._playerConfig.setValue(settingName, val);
      $target.closest('.control').toggleClass('checked', val);
    },
    _onRadioItemChange: function(e) {
      const $target = $(e.target);
      const settingName = $target.attr('data-setting-name');
      const checked = !!$target.prop('checked');
      if (!checked) { return; }
      this._playerConfig.setValue(settingName, $target.val());
    },
    _onInputItemChange: function(e) {
      var $target = $(e.target);
      var settingName = $target.attr('data-setting-name');
      var val = $target.val();

      this._playerConfig.setValue(settingName, val);
    },
    toggle: function(v) {
      var eventName = 'click.ZenzaSettingPanel';
      var $container = this._$playerContainer.off(eventName);
      var $body = $('body').off(eventName);
      var $view = this._$view.toggleClass('show', v);

      var onBodyClick = function() {
        $view.removeClass('show');
        $container.off(eventName);
        $body.off(eventName);
      };

      if ($view.hasClass('show')) {
        $container.on(eventName, onBodyClick);
        $body.on(eventName, onBodyClick);
      }
    },
    show: function() {
      this.toggle(true);
    },
    hide: function() {
      this.toggle(false);
    }
  });



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
        case 'removeTag':
          let elm = this._elm.videoTags.querySelector(`.tagItem[data-tag-id="${param}"]`);
          if (!elm) { return; }
          elm.classList.add('is-Removing');
          let data = JSON.parse(elm.getAttribute('data-tag'));
          this._removeTag(param, data.tag);
          break;
        default:
          this.emit('command', command, param);
          break;
      }
    }

    update({tagList = [], watchId = null, videoId = null, token = null, watchAuthKey = null}) {
      if (watchId) { this._watchId = watchId; }
      if (videoId) { this._videoId = videoId; }
      if (token) { this._token = token; }
      if (watchAuthKey) { this._watchAuthKey = watchAuthKey; }

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

      return Promise.all([addTag(), wait3s]).then((results) => {
        let result = results[0];
        if (watchId !== this._watchId) { return; } // 待ってる間に動画が変わったぽい
        if (result && result.tags) { this._update(result.tags); }
        this.setState({ isInputing: false, isUpdating: false, isEditing: false });

        if (result.error_msg) { this.emit('command', 'alert', result.error_msg); }
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
        if (watchId !== this._watchId) { return; } // 待ってる間に動画が変わったぽい
        if (result && result.tags) { this._update(result.tags); }
        this.setState({ isUpdating: false });

        if (result.error_msg) { this.emit('command', 'alert', result.error_msg); }
      });
    }

    _refreshTag() {
      this.setState({isUpdating: true});
      const watchId = this._watchId;
      const wait1s = this._makeWait(1000);
      const load = () => { return this._tagEditApi.load(this._videoId); };

      return Promise.all([load(), wait1s]).then((results) => {
        let result = results[0];
        if (watchId !== this._watchId) { return; } // 待ってる間に動画が変わったぽい
        this._update(result.tags);
        this.setState({isUpdating: false, isInputing: false, isEditing: false});
      });
    }

    _makeWait(ms) {
      return new Promise(resolve => { setTimeout(() => { resolve(ms); }, ms); });
    }

    _createDicIcon(text, hasDic) {
      let href= `//dic.nicovideo.jp/a/${encodeURIComponent(text)}`;
      // TODO: 本家がHTML5に完全移行したらこのアイコンも消えるかもしれないので代替を探す
      let src = hasDic ?
        '//live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
        '//live.nicovideo.jp/img/2012/watch/tag_icon003.png';
      let icon = `<img class="dicIcon" src="${src}">`;
      return `<a target="_blank" class="nicodic" href="${href}">${icon}</a>`;
    }

    _createDeleteButton(id) {
      return `<span target="_blank" class="deleteButton command" title="削除" data-command="removeTag" data-param="${id}">ー</span>`;
    }

    _createLink(text) {
      let href = `//www.nicovideo.jp/tag/${encodeURIComponent(text)}`;
      // タグはエスケープされた物が来るのでそのままでつっこんでいいはずだが、
      // 古いのはけっこういい加減なデータもあったりして信頼できない
      text = util.escapeToZenkaku(util.unescapeHtml(text));
      return `<a class="tagLink" href="${href}">${text}</a>`;
    }

    _createSearch(text) {
      let title = 'タグ検索';
      let command = 'tag-search';
      let param = util.escapeHtml(text);
      return (`<a class="playlistAppend command" title="${title}" data-command="${command}" data-param="${param}">▶</a>`);
    }

    _createTag(tag) {
      let text = tag.tag;
      let dic  = this._createDicIcon(text, !!tag.dic);
      let del  = this._createDeleteButton(tag.id);
      let link = this._createLink(text);
      let search = this._createSearch(text);
      let data = util.escapeHtml(JSON.stringify(tag));
      // APIごとに形式が統一されてなくてひどい
      let className = (tag.lock || tag.owner_lock === 1 || tag.lck === '1') ? 'tagItem is-Locked' : 'tagItem';
      className = (tag.cat) ? `${className} is-Category` : className;
      return `<li class="${className}" data-tag="${data}" data-tag-id="${tag.id}">${dic}${del}${link}${search}</li>`;
    }

    _onTagInputKeyDown(e) {
      if (this._state.isUpdating) {
        e.preventDefault(); e.stopPropagation();
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
        display: inline-block;
        min-width: 40px;
        cursor: pointer;
        user-select: none;
        transition: 0.2s transform, 0.2s box-shadow, 0.2s background;
        text-align: center;
      }

      .TagListView .button:hover {
        background: #666;
        /*box-shadow: 0 2px 2px #333;
        transform: translate(0, -2px);*/
      }

      .TagListView .button:active {
        transition: none;
        /*transform: translate(0, 0);*/
        box-shadow: 0 0 2px #000 inset;
      }
      .TagListView .button .icon {
        display: inline-block;
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

      .TagListView .tagItem {
        position: relative;
        list-style-type: none;
        display: inline-block;
        margin-right: 2px;
        /*padding: 0 4px 0;*/
        line-height: 20px;
        max-width: 50vw;
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
        transition: 0.2s transform, 0.4s background;
        text-shadow: none;
        transform: scale(1.3);
        line-height: 20px;
        text-align: center;
        opacity: 0.8;
      }

      .TagListView.is-Editing .deleteButton:hover {
        transform: rotate(0) scale(1.3);
        background: #f00;
        opacity: 1;
      }

      .TagListView.is-Editing .deleteButton:active {
        transform: rotate(360deg) scale(1.3);
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
        transition: transform 0.2s ease;
        cursor: pointer;
        text-align: center;
        user-select: none;
        visibility: hidden;
        margin-right: -2px;
      }

      .tagItem:hover .playlistAppend {
        visibility: visible;
        transition: transform 0.2s ease;
      }

      .tagItem:hover .playlistAppend:hover {
        transform: scale(1.5);
      }

      .tagItem:hover .playlistAppend:active {
        transform: scale(1.4);
      }

      .tagItem.is-Removing {
        transform-origin: right !important;
        /*transform: translate(0, 150vh) rotate(-120deg) !important;*/
        transform: translate(0, 150vh) !important;
        opacity: 0 !important;
        max-width: 0px !important;
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

      .is-Editing .tagItem.is-Locked .tagLink {
        outline: 1px dashed #888;
        outline-offset: 2px;
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
        transform: translate(0, -4px);
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
        transform: translate(0, 6px);
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
        transform: rotate(30deg);
        transition: transform 0.2s ease;
      }

      .TagListView .button.tagRefresh:active .icon {
        transform: rotate(-330deg);
        transition: none;
      }

      .TagListView .toggleInput {
        transform: translate(0, 6px);
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




  var VideoInfoPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoInfoPanel.prototype, AsyncEmitter.prototype);

  VideoInfoPanel.__css__ = (`
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
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
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

    body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .zenzaWatchVideoInfoPanel
    {
      display: none;
      left: calc(100%);
      top: 0;
    }

    @media screen and (min-width: 992px) {
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
      }
      .zenzaScreenMode_normal .zenzaPlayerContainer.is-backComment .commentLayerFrame {
        top:  calc(-50vh + 50%);
        left: calc(-50vw + 50% + 160px);
        width:  100vw;
        height: calc(100vh - 40px);
        right: auto;
        bottom: auto;
        z-index: 1;
      }

     }

    @media screen and (min-width: 1216px) {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
        display: inherit;
      }

      .zenzaScreenMode_big .zenzaPlayerContainer.is-backComment .commentLayerFrame {
        top:  calc(-50vh + 50%);
        left: calc(-50vw + 50% + 160px);
        width:  100vw;
        height: calc(100vh - 40px);
        right: auto;
        bottom: auto;
        z-index: 1;
      }
    }


    .zenzaScreenMode_3D    .zenzaWatchVideoInfoPanel>*,
    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel>*,
    .fullScreen            .zenzaWatchVideoInfoPanel>* {
      display: none;
      pointer-events: none;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover>*,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover>*,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover>* {
      display: inherit;
      pointer-events: auto;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover .tabSelectContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover .tabSelectContainer,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
      display: flex;
    }


    .zenzaScreenMode_3D    .zenzaWatchVideoInfoPanel,
    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel,
    .fullScreen            .zenzaWatchVideoInfoPanel {
      top: 20%;
      right: calc(32px - 320px);
      left: auto;
      width: 320px;
      height: 60%;
      background: none;
      opacity: 0;
      box-shadow: none;
      transition: opacity 0.4s ease, transform 0.4s ease 1s;
      will-change: opacity, transform, transform;
    }

    .zenzaScreenMode_3D   .is-mouseMoving  .zenzaWatchVideoInfoPanel,
    .zenzaScreenMode_wide .is-mouseMoving  .zenzaWatchVideoInfoPanel,
    .fullScreen           .is-mouseMoving  .zenzaWatchVideoInfoPanel {
      height: 60%;
      background: none;
      border: 1px solid #888;
      opacity: 0.5;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel.is-slideOpen,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel.is-slideOpen,
    .fullScreen           .zenzaWatchVideoInfoPanel.is-slideOpen,
    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover {
      /*right: 0;*/
      background: #333;
      box-shadow: 4px 4px 4px #000;
      border: none;
      opacity: 0.9;
      transform: translate3d(-288px, 0, 0);
      transition: opacity 0.4s ease, transform 0.4s ease 1s;
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
      /*margin-right: 8px;*/
      /*box-shadow: 2px 2px 2px #666;*/
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
      /*width: calc(100% - 16px);*/
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
      transition: transform 0.2s ease;
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
    }

    body:not(.fullScreen).zenzaScreenMode_small .zenzaWatchVideoInfoPanel {
      display: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
      width: calc(100% - 16px);
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect{
      background: #ccc;
      color: #888;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.activeTab{
      background: #ddd;
      color: black;
      border: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
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

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .publicStatus {
      display: block;
      text-align: center;
    }


    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a {
      color: #006699;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a:visited {
      color: #666666;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
      display: block;
      bottom: 48px;
      width: 364px;
      margin: 0 auto;
      padding: 8px;
      background: #ccc;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
      background: #ddd;
    }
         body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #ddf;
    }

    body:not(.fullScreen).zenzaScreenMode_3D     .is-backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .is-backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .is-backComment .zenzaWatchVideoInfoPanel {
      opacity: 0.7;
    }

    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
      }

      .zenzaScreenMode_normal .zenzaPlayerContainer.is-backComment .commentLayerFrame {
        top:  calc(-50vh + 50% + 120px);
        left: calc(-50vw + 50%);
        width:  100vw;
        height: 100vh;
        right: auto;
        bottom: auto;
        z-index: 1;
      }

      body:not(.fullScreen).zenzaScreenMode_normal .ZenzaIchibaItemView {
        margin: 8px 8px 96px;
      }

      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        display: table;
      }
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
        display: table-cell;
        text-align: left;
      }
    }

    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
      }

      .zenzaScreenMode_big .zenzaPlayerContainer.is-backComment .commentLayerFrame {
        top:  calc(-50vh + 50% + 120px);
        left: calc(-50vw + 50%);
        width:  100vw;
        height: 100vh;
        right: auto;
        bottom: auto;
        z-index: 1;
      }

      body:not(.fullScreen).zenzaScreenMode_big .ZenzaIchibaItemView {
        margin: 8px 8px 96px;
      }

      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        display: table;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
        display: table-cell;
        text-align: left;
      }
    }

    .zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
      box-sizing: border-box;
      position: relative;
      width: 100%;
      height: 100%;
      margin: 0;
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
      animation-timing-function: linear;
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

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar {
      background: #222;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar {
      background: #f0f0f0;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #ccc;
    }


    .zenzaWatchVideoInfoPanel .zenzaWatchVideoInfoPanelInner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
      .zenzaWatchVideoInfoPanelContent {
        flex: 1;
      }

    .zenzaWatchVideoInfoPanel .resumePlay {
      display: none;
      width: calc(100% - 16px);
      font-size: 14px;
      padding: 8px 4px;
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid #666;
      margin: 0 8px 8px;
      background: transparent;
      color: inherit;
      outline: none;
      line-height: 20px;
      user-select: none;
      text-align: center;
      -webkit-user-select: none;
      -moz-user-select: none;
      -webkit-appearance: inherit;
      -moz-appearance: inherit;
      -ms-appearance: inherit;
    }
    .zenzaWatchVideoInfoPanel .resumePlay.is-resumePlayable {
      display: block;
    }
    .zenzaWatchVideoInfoPanel .resumePlay:hover {
      transform: translate(0, -4px);
      box-shadow: 0 4px 2px #000;
      transition:
        0.2s transform ease,
        0.2s box-shadow ease
        ;
    }

    .zenzaWatchVideoInfoPanel .resumePlay:active {
      transform: translate(0, 4px);
      box-shadow: none;
      transition: none;
    }

    .zenzaWatchVideoInfoPanel .resumeThumbnailContainer {
      display: inline-block;
      vertical-align: middle;
      width: 128px;
      min-height: 72px;
      background: #333;
      pointer-events: none;
    }

    .zenzaWatchVideoInfoPanel .resumeThumbnail {
      max-width: 128px;
      max-height: 96px;
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

  `).trim();

  VideoInfoPanel.__tpl__ = (`
    <div class="zenzaWatchVideoInfoPanel show initializing">
      <div class="nowLoading">
        <div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
        <div class="loadingMessage">Loading...</div>
      </div>

      <div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-tab="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-tab="relatedVideoTab">関連動画</div></div>

      <div class="tabs videoInfoTab activeTab">
        <div class="zenzaWatchVideoInfoPanelInner">
          <div class="zenzaWatchVideoInfoPanelContent">
            <div class="videoOwnerInfoContainer">
              <a class="ownerPageLink" rel="noopener" target="_blank">
                <img class="ownerIcon loading"/>
              </a>
              <span class="owner">
                <span class="ownerName"></span>
                <a class="playlistSetUploadedVideo userVideo"
                  data-command="playlistSetUploadedVideo"
                  title="投稿動画一覧をプレイリストで開く">▶</a>
              </span>
            </div>
            <div class="publicStatus">
              <div class="videoMetaInfoContainer"></div>
              <div class="relatedInfoMenuContainer"></div>
            </div>
            <div class="videoDescription"></div>
            <div class="resumePlay" data-command="seek" data-param="0" type="button">
              続きから再生 (<span class="resumePlayPoint">00:00</span>)
              <div class="resumeThumbnailContainer"></div>
            </div>
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

  _.assign(VideoInfoPanel.prototype, {
    initialize: function(params) {
      this._videoHeaderPanel = new VideoHeaderPanel(params);
      this._dialog = params.dialog;
      this._config = Config;
      this._currentTimeGetter = params.currentTimeGetter;

      this._dialog.on('canplay', this._onVideoCanPlay.bind(this));
      this._dialog.on('videoCount', this._onVideoCountUpdate.bind(this));

      this._videoHeaderPanel.on('command', this._onCommand.bind(this));

      if (params.node) {
        this.appendTo(params.node);
      }

    },
    _initializeDom: function() {
      if (this._isInitialized) {
        return;
      }
      this._isInitialized = true;

      util.addStyle(VideoInfoPanel.__css__);
      var $view = this._$view = $(VideoInfoPanel.__tpl__);
      const view = this._view = $view[0];
      let onCommand = this._onCommand.bind(this);

      this._$ownerContainer = $view.find('.videoOwnerInfoContainer');
      var $icon = this._$ownerIcon = $view.find('.ownerIcon');
      this._$ownerName = $view.find('.ownerName');
      this._$ownerPageLink = $view.find('.ownerPageLink');

      this._$description = $view.find('.videoDescription');
      this._$description.on('click', this._onDescriptionClick.bind(this));

      this._tagListView = new TagListView({
        parentNode: view.querySelector('.videoTagsContainer')
      });
      this._tagListView.on('command', onCommand);

      this._relatedInfoMenu = new RelatedInfoMenu({
        parentNode: view.querySelector('.relatedInfoMenuContainer')
      });
      this._relatedInfoMenu.on('command', onCommand);

      this._videoMetaInfo = new VideoMetaInfo({
        parentNode: view.querySelector('.videoMetaInfoContainer')
      });

      this._uaaContainer = view.querySelector('.uaaContainer');
      this._uaaView = new UaaView(
        {parentNode: this._uaaContainer});
      this._uaaView.on('command', onCommand);

      this._ichibaContainer = view.querySelector('.ichibaContainer');
      this._ichibaItemView = new IchibaItemView(
        {parentNode: this._ichibaContainer});

      this._resumePlayButton = view.querySelector('.resumePlay');
      this._resumePlayPoint  = view.querySelector('.resumePlayPoint');
      this._resumePlayButton.addEventListener('click', () => {
        this._onCommand(
          'command', 'seek', this._resumePlayButton.getAttribute('data-param'));
      });

      this._$tabSelect = $view.find('.tabSelect');
      $view.on('click', '.tabSelect', (e) => {
        var $target = $(e.target).closest('.tabSelect');
        var tabName = $target.attr('data-tab');
        this._onCommand('selectTab', tabName);
      });

      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
        var $target = $(e.target);
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param') || '';
        if (command) {
          this._onCommand(command, param);
        }
      }).on('wheel', (e) => {
        e.stopPropagation();
      });
      $icon.on('load', () => { $icon.removeClass('is-loading'); });

      $view.on('touchenter', () => {
        $view.addClass('is-slideOpen');
      });
      ZenzaWatch.emitter.on('hideHover', () => {
        $view.removeClass('is-slideOpen');
      });
      MylistPocketDetector.detect().then((pocket) => {
        this._pocket = pocket;
        $view.addClass('is-pocketReady');
      });
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;
      this._videoHeaderPanel.update(videoInfo);

      var owner = videoInfo.ownerInfo;
      this._$ownerIcon.attr('src', owner.icon);
      this._$ownerPageLink.attr('href', owner.url);
      this._$ownerName.text(owner.name);
      this._$ownerContainer.toggleClass('favorite', owner.favorite);

      this._videoMetaInfo.update(videoInfo);
      this._tagListView.update({
        tagList: videoInfo.tagList,
        watchId: videoInfo.watchId,
        videoId: videoInfo.videoId,
        token: videoInfo.csrfToken,
        watchAuthKey: videoInfo.watchAuthKey
      });

      this._updateVideoDescription(videoInfo.description, videoInfo.isChannel);

      this._$view
        .removeClass('userVideo channelVideo initializing')
        .toggleClass('is-community', this._videoInfo.isCommunityVideo)
        .toggleClass('is-mymemory',  this._videoInfo.isMymemory)
        .addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo');

      this._ichibaItemView.clear();
      this._ichibaItemView.videoId = videoInfo.videoId;

      this._uaaView.clear();
      this._uaaView.update(videoInfo);

      this._relatedInfoMenu.update(videoInfo);

      this._updateResumePoint(videoInfo);
    },
    _updateResumePoint(videoInfo) {
      const pt = videoInfo.initialPlaybackTime;
      this._resumePlayPoint.textContent = util.secToTime(pt);
      this._resumePlayButton.classList.toggle('is-resumePlayable', pt > 0);
      this._resumePlayButton.setAttribute('data-param', pt);

      const thumbnailContainer = this._resumeThumbnailContainer =
        this._resumeThumbnailContainer ||
        this._resumePlayButton.querySelector('.resumeThumbnailContainer');
      thumbnailContainer.innerHTML = '';

      if (pt > 0) {
        videoInfo.getCurrentVideo().then(url => {
          return util.videoCapture(url, pt);
        }).then(canvas => {
          canvas.className = 'resumeThumbnail';
          thumbnailContainer.appendChild(canvas);
        });
      }
    },
    /**
     * 説明文中のurlの自動リンク等の処理
     */
    _updateVideoDescription: function(html, isChannel) {
      if (!isChannel) {
        // urlの自動リンク処理
        // チャンネル動画は自前でリンク貼れるので何もしない

        var linkmatch = /<a.*?<\/a>/, links = [], n;
        html = html.split('<br />').join(' <br /> ');
        while ((n = linkmatch.exec(html)) !== null) {
          links.push(n);
          html = html.replace(n, ' <!----> ');
        }

        html = html.replace(/\((https?:\/\/[\x21-\x3b\x3d-\x7e]+)\)/gi, '( $1 )');
        html = html.replace(/(https?:\/\/[\x21-\x3b\x3d-\x7e]+)/gi, '<a href="$1" rel="noopener" target="_blank" class="otherSite">$1</a>');
        for (var i = 0, len = links.length; i < len; i++) {
          html = html.replace(' <!----> ', links[i]);
        }

        html = html.split(' <br /> ').join('<br />');
      }

      this._$description.html(html)
        .find('a').addClass('noHoverMenu').end()
        .find('a[href*="/mylist/"]').addClass('mylistLink')
        ;
      this._zenTubeUrl = null;

      window.setTimeout(() => {
        this._$description.find('.watch').each((i, watchLink) => {
          var $watchLink = $(watchLink);
          var videoId = $watchLink.text().replace('watch/', '');
          if (!/^(sm|so|nm)/.test(videoId)) { return; }
          var thumbnail = util.getThumbnailUrlByVideoId(videoId);
          if (thumbnail) {
            var $img = $('<img class="videoThumbnail" />').attr('src', thumbnail);
            $watchLink.addClass('popupThumbnail').append($img);
          }
          var $playlistAppend =
            $('<a class="playlistAppend" title="プレイリストで開く">▶</a>')
              .attr('data-watch-id', videoId);
          var $deflistAdd =
            $('<a class="deflistAdd" title="とりあえずマイリスト">&#x271A;</a>')
              .attr('data-watch-id', videoId);
          var $pocketInfo =
            $('<a class="pocket-info" title="動画情報">？</a>')
              .attr('data-watch-id', videoId);
          $watchLink.append($playlistAppend);
          $watchLink.append($deflistAdd);
          $watchLink.append($pocketInfo);
        });
        this._$description.find('.mylistLink').each((i, mylistLink) => {
          var $mylistLink = $(mylistLink);
          var mylistId = $mylistLink.text().split('/')[1];
          var $playlistAppend =
            $('<a class="playlistSetMylist" title="プレイリストで開く">▶</a>')
            .attr('data-mylist-id', mylistId)
            ;
          $mylistLink.append($playlistAppend);
        });
        this._$description.find('a[href*="youtube.com/watch"], a[href*="youtu.be"]').each((i, link) => {
          const btn = document.createElement('div');
          if (!this._zenTubeUrl) {
            this._zenTubeUrl = link.href;
          }
          btn.className = 'zenzaTubeButton';
          btn.innerHTML = '▷Zen<span>Tube</span>';
          btn.title = 'ZenzaWatchで開く(実験中)';
          btn.setAttribute('accesskey', 'z');
          btn.setAttribute('data-command', 'setVideo');
          btn.setAttribute('data-param', link.href);
          link.parentNode.insertBefore(btn, link);
        });
      }, 0);
    },
    _onDescriptionClick: function(e) {
      if (e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) return true;
      if (e.target.tagName !== 'A') return;

      var watchId;
      var $target = $(e.target), text = $target.text();
      var href = $target.attr('href') || '';
      if (href.match(/watch\/([a-z0-9]+)/)) {
        e.preventDefault();
        this.emit('command', 'open', RegExp.$1);
        //dialog.open(RegExp.$1);
      } else if (text.match(/^mylist\/(\d+)/)) {
        return;
      } else if ($target.hasClass('playlistAppend')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this.emit('command', 'playlistAppend', watchId);
        }
      } else if ($target.hasClass('deflistAdd')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this.emit('command', 'deflistAdd', watchId);
        }
      } else if ($target.hasClass('pocket-info')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this._pocket.external.info(watchId);
        }
      } else if ($target.hasClass('playlistSetMylist')) {
        var mylistId = $target.attr('data-mylist-id');
        if (!isNaN(mylistId)) {
          e.preventDefault(); e.stopPropagation();
          this.emit('command', 'playlistSetMylist', mylistId);
        }
      } else if ($target.hasClass('seekTime')) {
        e.preventDefault(); e.stopPropagation();
        var data = $target.attr('data-seekTime').split(":");
        var sec = data[0] * 60 + parseInt(data[1], 10);
        this.emit('command', 'seek', sec);
      }
    },
    _onVideoCanPlay: function(watchId, videoInfo, options) {
      // 動画の再生を優先するため、比較的どうでもいい要素はこのタイミングで初期化するのがよい
      if (!this._relatedVideoList) {
        this._relatedVideoList = new RelatedVideoList({
          $container: this._$view.find('.relatedVideoContainer')
        });
        this._relatedVideoList.on('command', this._onCommand.bind(this));
      }

      if (this._config.getValue('autoZenTube') && this._zenTubeUrl && !options.isReload()) {
        window.setTimeout(() => {
          window.console.info('%cAuto ZenTube', this._zenTubeUrl);
          this.emit('command', 'setVideo', this._zenTubeUrl);
        }, 100);
      }
      var relatedVideo = videoInfo.relatedVideoItems;
      this._relatedVideoList.update(relatedVideo, watchId);
    },
    _onVideoCountUpdate: function(...args) {
      if (!this._videoHeaderPanel) { return; }
      this._videoMetaInfo.updateVideoCount(...args);
      this._videoHeaderPanel.updateVideoCount(...args);
    },
    _onCommand: function(command, param) {
      switch (command) {
        case 'tag-search':
          this._onTagSearch(param);
          break;
        case 'playlistSetUploadedVideo':
          var owner = this._videoInfo.ownerInfo;
          this.emit('command', 'playlistSetUploadedVideo', owner.id);
          break;
        default:
          this.emit('command', command, param);
        break;
      }
    },
    _onTagSearch: function(word) {
      const config = Config.namespace('videoSearch');

      let option = {
        searchType: 'tag',
        order: config.getValue('order'),
        sort:  config.getValue('sort') || 'playlist',
        owner: config.getValue('ownerOnly')
      };

      if (option.sort === 'playlist') {
        option.sort = 'f';
        option.playlistSort = true;
      }

      this.emit('command', 'playlistSetSearchVideo', {word, option});
    },
    appendTo: function(node) {
      var $node = $(node);
      this._initializeDom();
      $node.append(this._$view);
      this._videoHeaderPanel.appendTo($node);
    },
    hide: function() {
      this._videoHeaderPanel.hide();
    },
    close: function() {
      this._videoHeaderPanel.close();
    },
    clear: function() {
      this._videoHeaderPanel.clear();
      this._$view.addClass('initializing');
      this._$ownerIcon.addClass('is-loading');
      this._$description.empty();
    },
    selectTab: function(tabName) {
      var $view = this._$view;
      var $target = $view.find('.tabs.' + tabName + ', .tabSelect.' + tabName);
      this._activeTabName = tabName;
      $view.find('.activeTab').removeClass('activeTab');
      $target.addClass('activeTab');
    },
    blinkTab: function(tabName) {
      var $view = this._$view;
      var $target = $view.find('.tabs.' + tabName + ', .tabSelect.' + tabName);
      if ($target.length < 1) { return; }
      $target.addClass('blink');
      window.setTimeout(function() {
        $target.removeClass('blink');
      }, 50);
    },
    appendTab: function(tabName, title, content) {
      var $view = this._$view;
      var $select =
        $('<div class="tabSelect"/>')
          .addClass(tabName)
          .attr('data-tab', tabName)
          .text(title);
      var $body = $('<div class="tabs"/>')
          .addClass(tabName);
      if (content) {
        $body.append($(content));
      }

      $view.find('.tabSelectContainer').append($select);
      $view.append($body);

      if (this._activeTabName === tabName) {
        $select.addClass('activeTab');
        $body.addClass('activeTab');
      }
      return $body;
    },
    removeTab: function(tabName) {
      this._$view.find('.tabSelect.' + tabName).remove();
      this._$view.find('.tabs.' + tabName).detach();
    }
  });

  var VideoHeaderPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoHeaderPanel.prototype, AsyncEmitter.prototype);

  VideoHeaderPanel.__css__ = (`
    .zenzaWatchVideoHeaderPanel {
      position: fixed;
      width: 100%;
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
    }
    body.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel,
    body.fullScreen .zenzaWatchVideoHeaderPanel {
      z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
    }

    .zenzaWatchVideoHeaderPanel>* {
      pointer-events: none;
    }

    .is-mouseMoving .zenzaWatchVideoHeaderPanel>*,
                 .zenzaWatchVideoHeaderPanel:hover>* {
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

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel,
    .fullScreen           .zenzaWatchVideoHeaderPanel {
      position: absolute; /* fixedだとFirefoxのバグでおかしくなる */
      top: 0px;
      bottom: auto;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      box-shadow: none;
    }

    body.zenzaScreenMode_sideView:not(.fullScreen)              .zenzaWatchVideoHeaderPanel {
      top: 0;
      left: 400px;
      width: calc(100vw - 400px);
      bottom: auto;
      background: #272727;
      opacity: 0.9;
      height: 40px;
    }
    /* ヘッダ追従 */
    body.zenzaScreenMode_sideView:not(.nofix):not(.fullScreen)  .zenzaWatchVideoHeaderPanel {
      top: 0;
    }
    /* ヘッダ固定 */
    body.zenzaScreenMode_sideView.nofix:not(.fullScreen)        .zenzaWatchVideoHeaderPanel {
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTitleContainer {
      margin: 0;
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .publicStatus,
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTagsContainer
    {
      display: none;
    }

    .zenzaScreenMode_normal .is-loading .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_big    .is-loading .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_3D     .is-loading .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide   .is-loading .zenzaWatchVideoHeaderPanel,
    .fullScreen             .is-loading .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_3D     .is-mouseMoving .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide   .is-mouseMoving .zenzaWatchVideoHeaderPanel,
    .fullScreen             .is-mouseMoving .zenzaWatchVideoHeaderPanel {
      opacity: 0.6;
      transition: 0.4s opacity;
    }

    .zenzaScreenMode_3D   .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .fullScreen           .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen:hover,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen:hover,
    .zenzaScreenMode_3D     .zenzaWatchVideoHeaderPanel:hover,
    .zenzaScreenMode_wide   .zenzaWatchVideoHeaderPanel:hover,
    .fullScreen             .zenzaWatchVideoHeaderPanel:hover {
      opacity: 1;
      transition: 0.5s opacity;
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel .videoTagsContainer {
      display: none;
      width: calc(100% - 240px);
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
      display: block;
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
    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .videoTitleContainer,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .videoTitleContainer,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel .videoTitleContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel .videoTitleContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel .videoTitleContainer {
      width: calc(100% - 180px);
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

    body:not(.fullScreen).zenzaScreenMode_3D     .is-backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .is-backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .is-backComment .zenzaWatchVideoHeaderPanel {
      opacity: 0.7;
    }

    @media screen and (min-width: 1432px)
    {
      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
        width: calc(100% - 16px);
      }
      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
        top: calc((100vw - 1024px) * 9 / 16 + 4px);
        width: calc(100vw - 1024px);
        height: calc(100vh - (100vw - 1024px) * 9 / 16 - 70px);
      }

      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
        width: calc(100vw - 1024px - 26px);
      }
    
      body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel {
        width: calc(100vw - (100vw - 1024px));
        left:  calc(100vw - 1024px);
      }
    }


    .zenzaWatchVideoHeaderPanel .relatedInfoMenuContainer {
      display: inline-block;
      position: absolute;
      top: 0;
      margin: 0 16px;
      z-index: 1000;
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
    </div>
  `).trim();

  _.assign(VideoHeaderPanel.prototype, {
    initialize: function(params) {
      this._currentTimeGetter = params.currentTimeGetter;
    },
    _initializeDom: function() {
      if (this._isInitialized) {
        return;
      }
      this._isInitialized = true;
      util.addStyle(VideoHeaderPanel.__css__);
      let $view = this._$view = $(VideoHeaderPanel.__tpl__);
      let view = $view[0];
      let onCommand = this._onCommand.bind(this);

      this._$videoTitle = $view.find('.videoTitle');
      this._searchForm = new VideoSearchForm({
        parentNode: view
      });
      this._searchForm.on('command', onCommand);

      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き

        var $target = $(e.target);
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param') || '';
        if (command) {
          this.emit('command', command, param);
        }
      }).on('wheel', (e) => {
        e.stopPropagation();
      });

      this._tagListView = new TagListView({
        parentNode: view.querySelector('.videoTagsContainer')
      });
      this._tagListView.on('command', onCommand);

      this._relatedInfoMenu = new RelatedInfoMenu({
        parentNode: view.querySelector('.relatedInfoMenuContainer'),
        isHeader: true
      });
      this._relatedInfoMenu.on('command', onCommand);

      this._videoMetaInfo = new VideoMetaInfo({
        parentNode: view.querySelector('.videoMetaInfoContainer'),
      });

      window.addEventListener('resize', _.debounce(this._onResize.bind(this), 500));
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;

      const videoTitle = util.unescapeHtml(videoInfo.title);
      this._$videoTitle.text(videoTitle).attr('title', videoTitle);

      var watchId = videoInfo.watchId;
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
        .toggleClass('is-mymemory',  this._videoInfo.isMymemory)
        .toggleClass('has-Parent', this._videoInfo.hasParentVideo)
        .addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo')
        .css('display', '');

      window.setTimeout(() => { this._onResize(); }, 1000);
    },
    updateVideoCount: function(...args) {
      this._videoMetaInfo.updateVideoCount(...args);
    },
    _onResize: function() {
      const view = this._$view[0];
      const rect = view.getBoundingClientRect();
      let isOnscreen = view.classList.contains('is-onscreen');
      const height = rect.bottom - rect.top;
      const top = isOnscreen ? (rect.top - height) : rect.top;
      view.classList.toggle('is-onscreen', top < -32);
    },
    appendTo: function($node) {
      this._initializeDom();
      $node.append(this._$view);
    },
    hide: function() {
      if (!this._$view) { return; }
      this._$view.removeClass('show');
    },
    close: function() {
    },
    clear: function() {
      if (!this._$view) { return; }
      this._$view.addClass('initializing');

      this._$videoTitle.text('------');
    },
    getPublicStatusDom: function() {
      return this._$view.find('.publicStatus').html();
    },
    getVideoTagsDom: function() {
      return this._$tagList.html();
    },
    _onCommand: function(command, param) {
      switch (command, param) {
        default:
          this.emit('command', command, param);
          break;
      }
    }
  });




  class VideoSearchForm extends AsyncEmitter {
    constructor(...args) {
      super();
      this._config = Config.namespace('videoSearch');
      this._initDom(...args);
    }

    _initDom({parentNode}) {
      let tpl = document.getElementById('zenzaVideoSearchPanelTemplate');
      if (!tpl) {
        util.addStyle(VideoSearchForm.__css__);
        tpl = document.createElement('template');
        tpl.innerHTML = VideoSearchForm.__tpl__;
        tpl.id = 'zenzaVideoSearchPanelTemplate';
        document.body.appendChild(tpl);
      }
      const view = document.importNode(tpl.content, true);

      this._view   = view.querySelector('*');
      this._form   = view.querySelector('form');
      this._word   = view.querySelector('.searchWordInput');
      this._sort   = view.querySelector('.searchSortSelect');
      this._submit = view.querySelector('.searchSubmit');
      this._mode   = view.querySelector('.searchMode') || 'tag';
    
      this._form.addEventListener('submit', this._onSubmit.bind(this));

      const config = this._config;
      const form = this._form;

      form['ownerOnly'].checked = config.getValue('ownerOnly');
      let confMode = config.getValue('mode');
      if (typeof confMode === 'string' && ['tag', 'keyword'].includes(confMode)) {
        form['mode'].value = confMode;
      } else if (typeof confMode === 'boolean') {
        form['mode'].value = confMode ? 'tag' : 'keyword';
      } else {
        form['mode'].value = 'tag';
      }
      form['word'].value        = config.getValue('word');
      form['sort'].value        = config.getValue('sort');

      this._view.addEventListener('click', this._onClick.bind(this));
      const updateFocus = this._updateFocus.bind(this);
      const updateFocusD =  _.debounce(updateFocus, 1000);
      const submit = _.debounce(this.submit.bind(this), 500);
      Array.prototype.forEach.call(view.querySelectorAll('input, select'), (item) => {
        item.addEventListener('focus', updateFocus);
        item.addEventListener('blur',  updateFocusD);
        if (item.type === 'checkbox') {
          item.addEventListener('change', () => {
            this._word.focus();
            config.setValue(item.name, item.checked);
            submit();
          });
        } else if (item.type === 'radio') {
          item.addEventListener('change', () => {
            this._word.focus();
            config.setValue(item.name, this._form[item.name].value);
            submit();
          });
        } else {
          item.addEventListener('change', () => {
            config.setValue(item.name, item.value);
            if (item.tagName === 'SELECT') { submit(); }
          });
        }
      });

      ZenzaWatch.emitter.on('searchVideo',
        ({word}) => { form['word'].value = word; }
      );

      if (parentNode) {
        parentNode.appendChild(view);
      }

      ZenzaWatch.debug.searchForm = this;
    }

    _onClick(e) {
      const tagName = (e.target.tagName || '').toLowerCase();
      const target = e.target.classList.contains('command') ?
        e.target : e.target.closest('.command');

      if (!['input', 'select'].includes(tagName)) {
        this._word.focus();
      }

      if (!target) { return; }

      const command = target.getAttribute('data-command');
      if (!command) { return; }
      const type  = target.getAttribute('data-type') || 'string';
      let param   = target.getAttribute('data-param');
      e.stopPropagation();
      e.preventDefault();
      switch (type) {
        case 'json':
        case 'bool':
        case 'number':
          param = JSON.parse(param);
          break;
      }

      switch (command) {
        case 'clear':
          this._word.value = '';
          break;
        default:
          this.emit('command', command, param);
      }
    }

    _onSubmit(e) {
      this.submit();
      e.stopPropagation();
    }

    submit() {
      const word = this.word;
      if (!word) { return; }

      this.emit('command', 'playlistSetSearchVideo', {
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
      if (this._hasFocus()) {
        this._view.classList.add('is-active');
      } else {
        this._view.classList.remove('is-active');
      }
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

    .zenzaVideoSearchPanel.is-active {
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_3D    .zenzaVideoSearchPanel,
    .zenzaScreenMode_wide  .zenzaVideoSearchPanel,
    .fullScreen            .zenzaVideoSearchPanel {
      top: 64px;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaVideoSearchPanel {
      top: 80px;
      right: 32px;
    }
    .zenzaVideoSearchPanel.is-active {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel:not(.is-active) .focusOnly {
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
    .zenzaVideoSearchPanel.is-active .searchInputHead {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel           .searchInputHead:hover,
    .zenzaVideoSearchPanel.is-active .searchInputHead {
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
      }

      .zenzaVideoSearchPanel .searchWordInput:-webkit-autofill {
        background: transparent;
      }

      .is-mouseMoving .zenzaVideoSearchPanel:not(.is-active) .searchWordInput {
        opacity: 0.5;
      }

      .is-mouseMoving .zenzaVideoSearchPanel:not(.is-active) .searchWordInput:hover {
        opacity: 0.8;
      }

      .zenzaVideoSearchPanel.is-active .searchWordInput {
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

      .zenzaVideoSearchPanel.is-active .searchSubmit {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel.is-active .searchSubmit:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel.is-active .searchSubmit:active {
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

      .zenzaVideoSearchPanel.is-active .searchClear {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel.is-active .searchClear:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel.is-active .searchClear:active {
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
    .zenzaVideoSearchPanel.is-active .searchInputFoot {
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

      .zenzaVideoSearchPanel .autoPauseLabel input {

      }

      .zenzaVideoSearchPanel .autoPauseLabel input + span {
        display: inline-block;
        pointer-events: none;
      }

      .zenzaVideoSearchPanel .autoPauseLabel input:checked + span {
      }





  `).toString();

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
        name:     'IchibaItemView',
        template: IchibaItemView.__tpl__,
        css:      IchibaItemView.__css__,
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
      switch(command) {
        case 'load':
          this.load(this._videoId);
          break;
        default:
          super._onCommand(command, param);
      }
    }

    load(videoId) {
      if (this._isLoading) { return; }
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

      Array.prototype.forEach.call(
        div.querySelectorAll('[id]'),
        (elm) => { elm.classList.add('ichiba-' + elm.id); elm.removeAttribute('id'); }
      );
      Array.prototype.forEach.call(
        div.querySelectorAll('[style]'),
        (elm) => { elm.removeAttribute('style'); }
      );
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

  IchibaItemView.__css__ = (`
    .ZenzaIchibaItemView {
      text-align: center;
      margin: 8px 8px 32px;
      color: #ccc;
    }

      .ZenzaIchibaItemView .loadStartButton {
         /*width: 200px;*/
         font-size: 24px;
         padding: 8px 8px;
         margin: 8px;
         background: inherit;
         color: inherit;
         border: 1px solid #ccc;
         /*border: none;*/
         outline: none;
         line-height: 20px;
         /*text-shadow: 1px 1px #000;*/
         border-radius: 8px;
         cursor: pointer;
         user-select: none;
         -webkit-user-select: none;
         -moz-user-select: none;
      }
      .ZenzaIchibaItemView .loadStartButton:hover {
        transform: translate(0, -4px);
        box-shadow: 0 4px 4px #000;
        transition:
          0.2s transform ease,
          0.2s box-shadow ease
          ;
      }

      .ZenzaIchibaItemView .loadStartButton:active {
        transform: none;
        box-shadow: none;
        transition: none;
      }
      .ZenzaIchibaItemView .loadStartButton:active::after {
        opacity: 0;
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


    .ZenzaIchibaItemView.is-fail {
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
        /*color: #fcc;*/
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


    body.zenzaScreenMode_sideView .ZenzaIchibaItemView .loadStartButton {
      color: #000;
    }

    body.fullScreen.zenzaScreenMode_sideView  .ZenzaIchibaItemView .loadStartButton {
      color: inherit;
    }


    `).trim();


  // typoじゃなくてブロック回避のため名前を変えてる
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

      this._bound.load   = this.load.bind(this);
      this._bound.update = this.update.bind(this);
    }

    _initDom(...args) {
      super._initDom(...args);
      ZenzaWatch.debug.uaa = this;

      if (!this._shadow) { return; } // ShadowDOM使えなかったらバイバイ
      const shadow = this._shadow || this._view;
      this._elm.body = shadow.querySelector('.UaaDetailBody');
    }

    update(videoInfo) {
      if (!this._shadow || !this._config.getValue('enable')) { return; }
      if (!this._elm.body) { return; }

      if (this._state.isUpdating) { return; }
      this.setState({isUpdating: true});
      this._props.videoInfo = videoInfo;
      this._props.videoId   = videoInfo.videoId;

      window.setTimeout(() => { this.load(videoInfo); }, 5000);
    }

    load(videoInfo) {
      const videoId = videoInfo.videoId;

      return UaaLoader.load(videoId, {limit: 50})
        .then(this._onLoad.bind(this, videoId))
        .catch(this._onFail.bind(this, videoId));
    }

    clear() {
      this.setState({isUpdating: false, isExist: false, isSpeaking: false});
      if (!this._elm.body) { return; }
      this._elm.body.innerHTML = '';
    }

    _onLoad(videoId, result) {
      if (this._props.videoId !== videoId) { return; }
      this.setState({isUpdating: false});
      const data = result ? result.data : null;
      if (!data || data.sponsors.length < 1) { return; }

      const df = document.createDocumentFragment();
      const div = document.createElement('div');
      div.className = 'screenshots';
      let idx = 0, screenshots = 0;
      data.sponsors.forEach(u => {
        if (!u.auxiliary.bgVideoPosition || idx >= 4) { return; }
        u.added = true;
        div.append(this._createItem(u, idx++));
        screenshots++;
      });
      div.setAttribute('data-screenshot-count', screenshots);
      df.append(div);

      data.sponsors.forEach(u => {
        if (!u.auxiliary.bgVideoPosition || u.added) { return; }
        u.added = true;
        df.append(this._createItem(u, idx++));
      });
      data.sponsors.forEach(u => {
        if (u.added) { return; }
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
        const cv = document.createElement('canvas');
        const ct = cv.getContext('2d');
        cv.className = 'screenshot command clickable';
        cv.setAttribute('data-command', 'seek');
        cv.setAttribute('data-type', 'number');
        cv.setAttribute('data-param', sec);
        df.setAttribute('data-time', util.secToTime(sec));
        cv.width = 128;
        cv.height = 72;

        ct.fillStyle = 'rgb(32, 32, 32)';
        ct.fillRect(0, 0, cv.width, cv.height);
        df.appendChild(cv);
        df.classList.add('has-screenshot');

        this._props.videoInfo.getCurrentVideo().then(url=> {
          return util.videoCapture(url, sec);
        }).then(screenshot => {
          cv.width = screenshot.width;
          cv.height = screenshot.height;
          ct.drawImage(screenshot, 0, 0);
        });
      } else if (bgkeyframe) {
        const sec = parseFloat(bgkeyframe);
        df.classList.add('clickable');
        df.classList.add('command');
        df.classList.add('other');
        df.setAttribute('data-command', 'seek');
        df.setAttribute('data-type', 'number');
        df.setAttribute('data-param', sec);
        contact.setAttribute('title', `${data.message}(${util.secToTime(sec)})`);
      } else {
        df.classList.add('other');
      }
      df.appendChild(contact);
      return df;
    }

    _onFail(videoId) {
      if (this._props.videoId !== videoId) { return; }
      this.setState({isUpdating: false});
    }

    _onCommand(command, param) {
      switch(command) {
        case 'speak':
          this.speak();
          break;
        default:
          super._onCommand(command, param);
      }
    }

    speak() {
      const items = Array.from(this._shadow.querySelectorAll('.item'));
      const volume = 0.5;
      const speakEnd = () => {
        return util.speak('が、応援しています', {volume, pitch: 1.5, rate: 1.5}).then(() => {
          this.setState({isSpeaking: true});
        });
      };

      let index = 0;
      const speakNext = () => {
        const item = items[index];
        if (!item) { return speakEnd(); }

        index++;
        const sama = '様';

        const params = {
          volume,
          pitch: 1.5, //Math.random() * 2,
          rate:  1.5  //Math.random() * 0.8 + 0.8
        };

        item.classList.add('is-speaking');
        return util.speak(`「${item.textContent}」${sama}`, params).then(() => {
          item.classList.remove('is-speaking');
          return speakNext();
        });
      };

      this.setState({isSpeaking: true});
      util.speak('この動画は、', {volume, pitch: 1.5, rate: 1.5}).then(() => {
        return speakNext();
      }).catch(() => {
        Array.from(this._shadow.querySelectorAll('.is-speaking')).forEach(s => {
          s.classList.remove('is-speaking');
        });
      });
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
        transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
      }
        .UaaDetails .clickable:hover {
          transform: translate(0, -4px);
          box-shadow: 0 4px 4px #000;
        }
        .UaaDetails .clickable:active {
          transition: none;
          transform: translate(0, 0);
          box-shadow: none;
        }

      .UaaDetails {
        opacity: 0;
        pointer-events: none;
        max-height: 0;
        margin: 0 8px 0px;
        color: #ccc;
        overflow: hidden;
        /*width: 208px;*/
        text-align: center;
        word-break: break-all;
      }
        .UaaDetails.is-Exist {
          display: block;
          pointer-events: auto;
          max-height: 800px;
          margin: 8px;
          padding: 8px 4px;
          opacity: 1;
          transition: opacity 0.4s linear 0.4s, max-height 1s ease-in, margin 0.4s ease-in;
        }
        .UaaDetails.is-Exist[open] {
          border: 1px solid #666;
          border-radius: 4px;
          overflow: auto;
        }

      .UaaDetails .uaaSummary {
        /*width: 200px;*/
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


        .UaaDetails .item:not(.has-screenshot):hover {
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
          pading: 2px 4px;
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
          text-stroke: #000 1px;
          -webkit-text-stroke: #000 1px;
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

      .UaaDetails .speak {
        display: block;
        width: 64px;
        margin: auto;
        cursor: pointer;
        font-size: 16px;
        line-height: 28px;
        border: 1px solid #666;
        background: transparent;
        outline: none;
        color: #ccc;
        border-radius: 16px;
      }

      body.zenzaScreenMode_sideView .UaaDetails {
        color: #000;
      }
      :host-context(body.zenzaScreenMode_sideView) .UaaDetails {
        color: #000;
      }

      body.fullScreen.zenzaScreenMode_sideView .UaaDetails {
        color: inherit;
      }
      :host-context(body.fullScreen.zenzaScreenMode_sideView) .UaaDetails {
        color: inherit;
      }

    </style>
    <details class="root UaaDetails">
      <summary class="uaaSummary clickable">提供</summary>
      <div class="UaaDetailBody"></div>
      <button class="speak command clickable" data-command="speak">&#x1F50A;</button>
    </details>
  `).trim();

  UaaView.__tpl__ = (`<div class="uaaView"></div>`).trim();

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
        template: '<div class="RelatedInfoMenu"></div>',
        shadow: RelatedInfoMenu._shadow_,
        css: RelatedInfoMenu.__css__
      });

      this._state = {
      };

      this._bound.update = this.update.bind(this);
      this._bound._onBodyClick = _.debounce(this._onBodyClick.bind(this), 0);
      this.setState({isHeader});

    }

    _initDom(...args) {
      super._initDom(...args);

      const shadow = this._shadow || this._view;
      this._elm.body = shadow.querySelector('.RelatedInfoMenuBody');
      this._elm.summary = shadow.querySelector('summary');
      this._elm.summary.addEventListener('click', _.debounce(() => {
        if (shadow.open) {
          document.body.addEventListener('mouseup', this._bound._onBodyClick);
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
    }

    update(videoInfo) {
      const shadow = this._shadow || this._view;
      shadow.open = false;

      this._currentWatchId = videoInfo.watchId;
      this._currentVideoId = videoInfo.videoId;
      this.setState({
        'isParentVideoExist': videoInfo.hasParentVideo,
        'isCommunity': videoInfo.isCommunityVideo,
        'isMymemory': videoInfo.isMymemory
      });

      this._ginzaLink.setAttribute('href', `//${location.host}/watch/${this._currentWatchId}`);
      this._originalLink.setAttribute('href', `//${location.host}/watch/${this._currentVideoId}`);
      this._twitterLink.setAttribute('href', `https://twitter.com/hashtag/${this._currentVideoId}`);
      this._parentVideoLink.setAttribute('href', `//commons.nicovideo.jp/tree/${this._currentVideoId}`);
    }

    _onCommand(command, param) {
      let url;
      const shadow = this._shadow || this._view;
      shadow.open = false;

      switch(command) {
        case 'watch-ginza':
          url = `//www.nicovideo.jp/watch/${this._currentWatchId}`;
          window.open(url, 'watchGinza');
          super._onCommand('pause');
          break;
        case 'open-uad':
          url = `//uad.nicovideo.jp/ads/?vid=${this._currentWatchId}`;
          window.open(url, '', 'width=428, height=600, toolbar=no, scrollbars=1');
          break;
        case 'open-twitter-hash':
          url = `https://twitter.com/hashtag/${this._currentVideoId}`;
          window.open(url);
          break;
        case 'open-parent-video':
          url = `//commons.nicovideo.jp/tree/${this._currentVideoId}`;
          window.open(url);
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
    }


  }

  RelatedInfoMenu._css_ = (``).trim();

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

      .RelatedInfoMenuBody {
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


      .RelatedInfoMenu[open] {
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


      body.fullScreen.zenzaScreenMode_sideView .RelatedInfoMenu summary{
        background: #888;
      }

      :host-context(body.fullScreen.zenzaScreenMode_sideView) .RelatedInfoMenu summary {
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

    </style>
    <details class="root RelatedInfoMenu">
      <summary class="RelatedInfoMenuSummary clickable">関連メニュー</summary>
      <div class="RelatedInfoMenuBody">
        <ul>
          <li class="ginzaMenu">
            <a class="ginzaLink command"
              rel="noopener" data-command="watch-ginza">GINZAで視聴</a>
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
        postedAt:     shadow.querySelector('.postedAt'),
        body:         shadow.querySelector('.videoMetaInfo'),
        viewCount:    shadow.querySelector('.viewCount'),
        commentCount: shadow.querySelector('.commentCount'),
        mylistCount:  shadow.querySelector('.mylistCount')
      });
    }

    update(videoInfo) {
      this._elm.postedAt.textContent = videoInfo.postedAt;
      const count = videoInfo.count;
      this.updateVideoCount(count);
    }

    updateVideoCount({comment, view, mylist}) {
      let addComma = m => { return m.toLocaleString ? m.toLocaleString() : m; };
      if (typeof comment === 'number') {
        this._elm.commentCount.textContent = addComma(comment);
      }
      if (typeof view    === 'number') {
        this._elm.viewCount   .textContent = addComma(view);
      }
      if (typeof mylist  === 'number') {
        this._elm.mylistCount .textContent = addComma(mylist);
      }
    }
  }
  VideoMetaInfo._css_ = (``).trim();

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


  var initializeGinzaSlayer =
  (function() {
    var initializeFlash = function(dialog, query) {
      $('.notify_update_flash_player').remove();

      const watchId = getWatchId();
      const options = {};
      if (!isNaN(query.from)) { options.currentTime = parseFloat(query.from, 10); }

      dialog.open(watchId, options);
      $('#external_nicoplayer').remove();
    };

    const initializeHtml5 = function(dialog, query) {
      const watchId = getWatchId();
      const options = {};
      if (!isNaN(query.from)) { options.currentTime = parseFloat(query.from, 10); }

      v = document.querySelector('#MainVideoPlayer video');
      if (v) {
        v.pause();
        //if (v.currentTime > 0) { options.currentTime = v.currentTime; }
      }
      dialog.open(watchId, options);
    };


    return !!(document.getElementById('watchAPIDataContainer')) ? initializeFlash : initializeHtml5;
  })();


    // GINZAを置き換えるべきか？の判定
    var isOverrideGinza = function() {
      // GINZAで視聴のリンクできた場合はfalse
      if (window.name === 'watchGinza') {
        return false;
      }
      // GINZAの代わりに起動する設定、かつZenzaで再生可能な動画はtrue
      // nmmやrtmpeの動画だとfalseになる
      if (Config.getValue('overrideGinza') && util.isZenzaPlayableVideo()) {
        return true;
      }

      return false;
    };

    var replaceRedirectLinks = function() {
      $('a[href*="www.flog.jp/j.php/http://"]').each(function (i, a) {
        var $a = $(a), href = $a.attr('href');
        var replaced = href.replace(/^.*https?:/, '');
        $a.attr('href', replaced);
      });

      $('a[href*="rd.nicovideo.jp/cc/"]').each(function (i, a) {
        var $a = $(a), href = $a.attr('href');
        if (href.match(/cc_video_id=([a-z0-9+]+)/)) {
          var watchId = RegExp.$1;
          if (watchId.indexOf('lv') === 0) { return; }
          var replaced = '//www.nicovideo.jp/watch/' + watchId;
          $a.attr('href', replaced);
        }
      });


      // マイリストページの連続再生ボタン横に「シャッフル再生」を追加する
      if (window.Nico && window.Nico.onReady) {
        window.Nico.onReady(function() {
          var addShufflePlaylistLink = _.throttle(_.debounce(function() {
            if ($('.zenzaPlaylistShuffleStart').length > 0) {
              return;
            }
            var $a = $('a[href*="playlist_type=mylist"]:first,a[href*="playlist_type=deflist"]:first');
            if ($a.length < 1) { return false; }
            var a = $a[0];
            var search = (a.search || '').substr(1);
            //var query = ZenzaWatch.util.parseQuery(search);
            //window.console.log(a, query);
            var css = {
              'display': 'inline-block',
              'padding': '8px 6px'
            };
            var $shuffle = $(a).clone().text('シャッフル再生');
            $shuffle.addClass('zenzaPlaylistShuffleStart').attr(
              'href', '//www.nicovideo.jp/watch/1470321133?' +
              search + '&shuffle=1'
            ).css(css);

            $a.css(css).after($shuffle);
            return true;
          }, 100), 1000);
          if (!addShufflePlaylistLink()) {
            // マイページのほうはボタンが遅延生成されるためやっかい
            if (location.pathname.indexOf('/my/mylist') === 0) {
              $('#myContBody').on('DOMNodeInserted.zenzawatch', addShufflePlaylistLink);
            }
          }
        });
      }

      if (location.host === 'www.nicovideo.jp' &&
          (location.pathname.indexOf('/search/') === 0 || location.pathname.indexOf('/tag/') === 0)) {
        (function() {
          var $autoPlay = $('.autoPlay');
          var $target = $autoPlay.find('a');
          var search = (location.search || '').substr(1);
          var href = $target.attr('href') + '&' + search;
          $target.attr('href', href);
          var $shuffle = $autoPlay.clone();
          var a = $target[0];
          $shuffle.find('a').attr({
            'href': '/watch/1483135673' + a.search + '&shuffle=1'
          }).text('シャッフル再生');
          $autoPlay.after($shuffle);

          // ニコニ広告枠のリンクを置き換える
          window.setTimeout(() => {
            Array.from(document.querySelectorAll('.nicoadVideoItem')).forEach(item => {
              const pointLink = item.querySelector('.count .value a');
              if (!pointLink) { return; }

              // 動画idはここから取るしかなさそう
              const a = document.createElement('a');
              a.href = pointLink;
              const videoId = a.pathname.replace(/^.*\//, '');
              Array.from(item.querySelectorAll('a[data-link]')).forEach(link => {
                link.href = `//www.nicovideo.jp/watch/${videoId}`;
              });
            });
          }, 3000);
        })();
      }

      if (location.host === 'ch.nicovideo.jp') {
        $('#sec_current a.item').closest('li').each(function(i, li)  {
          var $li = $(li), $img = $li.find('img');
          var thumbnail = $img.attr('src') ||$img.attr('data-original') || '';
          var $a = $li.find('a');
          if (thumbnail.match(/smile\?i=([0-9]+)/)) {
            var watchId = 'so' + RegExp.$1;
            $a.attr('href', '//www.nicovideo.jp/watch/' + watchId);
          }
        });
        $('.playerNavContainer .video img').each(function(i, img) {
          var $img = $(img);
          var $video = $img.closest('.video');
          if ($video.length < 1) { return; }
          var thumbnail = $img.attr('src') ||$img.attr('data-original') || '';
          if (thumbnail.match(/smile\?i=([0-9]+)/)) {
            var watchId = 'so' + RegExp.$1;
            var $a = $('<a class="more zen" rel="noopener" target="_blank">watch</a>')
              .css('right', '128px')
              .attr('href', '//www.nicovideo.jp/watch/' + watchId);

            $video.find('.more').after($a);
          }
        });
      }


      if (location.host === 'search.nicovideo.jp') {
        const removeClick = function() {$('a.click').removeClass('click');};
        removeClick();
        $('#row-results').on('DOMNodeInserted.zenzawatch', removeClick);
      }
    };

    var initialize = function() {
      window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
      initialize = _.noop;
      util.addStyle(__css__);

      const query = util.parseQuery(START_PAGE_QUERY);

      var isGinza = util.isGinzaWatchUrl() &&
        (!!document.getElementById('watchAPIDataContainer') ||
         !!document.getElementById('js-initial-watch-data'));
      if (!util.isLogin()) {
        return;
      }

      replaceRedirectLinks();

      var hoverMenu = new HoverMenu({playerConfig: Config});
      ZenzaWatch.debug.hoverMenu = hoverMenu;

      window.console.time('createOffscreenLayer');
      NicoComment.offScreenLayer.get(Config).then(function(offScreenLayer) {
        window.console.timeEnd('createOffscreenLayer');
        // コメントの位置計算用のレイヤーが必要
        // スマートじゃないので改善したい

        var dialog;

        // watchページか？
        if (isGinza) {
          if (util.isLogin()) {
            dialog = initializeDialogPlayer(Config, offScreenLayer);
            if (isOverrideGinza()) {
              initializeGinzaSlayer(dialog, query);
            }
            if (window.name === 'watchGinza') { window.name = ''; }

          }
        } else {
          dialog = initializeDialogPlayer(Config, offScreenLayer);
        }

        ZenzaWatch.debug.dialog = dialog;

        broadcastEmitter.on('message', (packet) => {
          const isLast = dialog.isLastOpenedPlayer();
          const isOpen = dialog.isOpen();
          const type = packet.type;
          if (type === 'ping' && isLast && isOpen) {
            window.console.info('pong!');
            broadcastEmitter.pong(dialog.getId());
            return;
          } else if (type === 'notifyClose' && isOpen) {
            dialog.refreshLastPlayerId();
            return;
          } else if (type === 'sendCommand' && isLast && isOpen) {
            dialog.execCommand(packet.command, packet.params);
          }

          if (type !== 'openVideo') { return; }
          if (!isLast) { return; }

          window.console.log('recieve packet: ', packet);
          dialog.open(packet.watchId, {
            autoCloseFullScreen: false,
            query: packet.query,
            eventType: packet.eventType
          });
        });

        dialog.on('close', () => {
          broadcastEmitter.notifyClose();
        });

        WatchPageState.initialize(dialog);

        if (dialog) { hoverMenu.setPlayer(dialog); }
        initializeMobile(dialog, Config);
        initializeExternal(dialog, Config, hoverMenu);

        if (isGinza) {
          return;
        }

        window.addEventListener('beforeunload', () => {
          if (!dialog.isOpen()) { return; }
          PlayerSession.save(dialog.getPlayingStatus());
          dialog.close();
        });

        var lastSession = PlayerSession.restore();
        var screenMode = Config.getValue('screenMode');
        if (
          lastSession.playing &&
          (screenMode === 'small'    ||
           screenMode === 'sideView' ||
           location.href === lastSession.url ||
           Config.getValue('continueNextPage')
           )
        ) {
          lastSession.eventType = 'session';
          dialog.open(lastSession.watchId, lastSession);
        } else {
          PlayerSession.clear();
        }

        WindowMessageEmitter.on('onMessage', (data, type) => {
          var watchId = data.message.watchId;
          if (watchId && data.message.command === 'open') {
            //window.console.log('onMessage!: ', data.message.watchId, type);
            dialog.open(data.message.watchId, {
              economy: Config.getValue('forceEconomy')
            });
          } else if (watchId && data.message.command === 'send') {
            broadcastEmitter.send({
              type: 'openVideo',
              watchId: watchId
            });
          }
        });
        
      });

      window.ZenzaWatch.ready = true;
      ZenzaWatch.emitter.emitAsync('ready');
      util.dispatchCustomEvent(
        document.body, 'ZenzaWatchInitialize', window.ZenzaWatch);
      // こっちは過去の互換用
      $('body').trigger('ZenzaWatchReady', window.ZenzaWatch);
    };


    var initializeDialogPlayer = function(conf, offScreenLayer) {
      return initializeDialog(conf, offScreenLayer);
    };

    var initializeMobile = function(dialog, config) {
      ZenzaWatch.util.viewPort = new ViewPort({});
    };

    var initializeExternal = function(dialog, config) {
      const command = (command, param) => {
        dialog.execCommand(command, param);
      };

      const open = (watchId, params) => { dialog.open(watchId, params); };

      // 最後にZenzaWatchを開いたタブに送る
      const send = (watchId, params) => {
        broadcastEmitter.sendOpen(watchId, params);
      };

      // 最後にZenzaWatchを開いたタブに送る
      // なかったら同じタブで開く. 一見万能だが、pingを投げる都合上ワンテンポ遅れる。
      const sendOrOpen = (watchId, params) => {
        if (dialog.isLastOpenedPlayer()) {
          open(watchId, params);
        } else {
          broadcastEmitter.ping().then(() => {
            send(watchId, params);
          }, () => {
            open(watchId, params);
          });
        }
      };

      const importPlaylist = data => {
        PlaylistSession.save(data);
      };

      const exportPlaylist = () => {
        return PlaylistSession.restore() || {};
      };

      const sendCommand = (command, params) => {
        broadcastEmitter.send(
          ({type: 'sendCommand', command: command, params: params})
        );
      };

      const sendOrExecCommand = (command, params) => {
        broadcastEmitter.ping().then(() => {
          sendCommand(command, params);
        }, () => {
          dialog.execCommand(command, params);
        });
      };

      const playlistAdd = (watchId) => {
        sendOrExecCommand('playlistAdd', watchId);
      };

      const playlistInsert = (watchId) => {
        sendOrExecCommand('playlistInsert', watchId);
      };

      const deflistAdd = ({watchId, description, token}) => {
        const mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
        if (token) {
          mylistApiLoader.setCsrfToken(token);
        }
        return mylistApiLoader.addDeflistItem(watchId, description);
      };

      const deflistRemove = ({watchId, token}) => {
        const mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
        if (token) {
          mylistApiLoader.setCsrfToken(token);
        }
        return mylistApiLoader.removeDeflistItem(watchId);
      };


      Object.assign(ZenzaWatch.external, {
        execCommand: command,
        sendCommand: sendCommand,
        sendOrExecCommand: sendOrExecCommand,
        open: open,
        send: send,
        sendOrOpen,
        deflistAdd,
        deflistRemove,
        playlist: {
          add: playlistAdd,
          insert: playlistInsert,
          import: importPlaylist,
          export: exportPlaylist
        }
      });
    };

    var HoverMenu = function() { this.initialize.apply(this, arguments);};
    _.assign(HoverMenu.prototype, {
      initialize: function(param) {
        this._playerConfig = param.playerConfig;

        var $view = $([
        '<div class="zenzaWatchHoverMenu scalingUI">',
          '<span>Zen</span>',
        '</div>'].join(''));
        this._$view = $view;

        $view.on('click', this._onClick.bind(this));
        ZenzaWatch.emitter.on('hideHover', () => {
          $view.removeClass('show');
        });

        var $body = $('body')
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
            this._onHover.bind(this))
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
            _.debounce(this._onHoverEnd.bind(this), 500))
          .on('mouseout',  'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
            this._onMouseout.bind(this))
          .on('click', () => { $view.removeClass('show'); });

        if (!util.isGinzaWatchUrl() &&
            this._playerConfig.getValue('overrideWatchLink')) {
          this._overrideGinzaLink();
        } else {
          $body.append($view);
        }
      },
      setPlayer: function(player) {
        this._player = player;
        //if (this._selectedWatchId) {
        //  window.setTimeout(() => {
        //    player.open(this._selectedWatchId, this._playerOption);
        //  }, this, 1000);
        //}
        if (this._playerResolve) {
          this._playerResolve(player);
        }
      },
      _getPlayer: function() {
        return new Promise((resolve) => {
          if (this._player) {
            return resolve(this._player);
          }
          this._playerResolve = resolve;
        });
      },
      _onHover: function(e) {
        this._hoverElement = e.target;
      },
      _onMouseout: function(e) {
        if (this._hoverElement === e.target) {
          this._hoverElement = null;
        }
      },
      _onHoverEnd: function(e) {
        if (this._hoverElement !== e.target) { return; }
        var $target = $(e.target).closest('a');
        var href = $target.attr('data-href') || $target.attr('href');
        var watchId = ZenzaWatch.util.getWatchId(href);
        var offset = $target.offset();
        var host = $target[0].hostname;
        if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') { return; }
        this._query = ZenzaWatch.util.parseQuery(($target[0].search || '').substr(1));


        if ($target.hasClass('noHoverMenu')) { return; }
        if (!watchId.match(/^[a-z0-9]+$/)) { return; }
        if (watchId.indexOf('lv') === 0) { return; }

        $('.zenzaWatching').removeClass('zenzaWatching');
        $target.addClass('.zenzaWatching');

        this._watchId = watchId;
        
        this._$view.css({
          top:  offset.top,
          left: offset.left - this._$view.outerWidth()  / 2
        }).addClass('show');
      },
      _onClick: function(e) {
        const watchId = this._watchId;
        if (e.ctrlKey) { return; }

        if (e.shiftKey) {
          // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
          this._send(watchId);
        } else {
          this._open(watchId);
        }
      },
      open: function(watchId, params) {
        this._open(watchId, params);
      },
      _open: function(watchId, params) {
        this._playerOption = Object.assign({
          economy: this._playerConfig.getValue('forceEconomy'),
          query: this._query,
          eventType: 'click'
        }, params);

        this._getPlayer().then((player) => {
          let isSingleton = this._playerConfig.getValue('enableSingleton');
          if (isSingleton) {
            ZenzaWatch.external.sendOrOpen(watchId, this._playerOption);
          } else {
            player.open(watchId, this._playerOption);
          }
        });

        //if (this._player) {
        //  this._player.open(watchId, this._playerOption);
        //} else {
        //  this._selectedWatchId = watchId;
        //}
      },
      send: function(watchId, params) {
        this._send(watchId, params);
      },
      _send: function(watchId, params) {
        this._getPlayer().then(() => {
          ZenzaWatch.external.send(
            watchId,
            Object.assign({query: this._query }, params)
          );
        });
      },
      _overrideGinzaLink: function() {
        $('body').on('click', 'a[href*="watch/"]', (e) => {
          if (e.ctrlKey) { return; }
          if (e.target !== this._hoverElement) { return; }

          var $target = $(e.target).closest('a');
          var href = $target.attr('data-href') || $target.attr('href');
          var watchId = ZenzaWatch.util.getWatchId(href);
          var host = $target[0].hostname;
          if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') { return; }
          this._query = ZenzaWatch.util.parseQuery(($target[0].search || '').substr(1));

          if ($target.hasClass('noHoverMenu')) { return; }
          if (!watchId.match(/^[a-z0-9]+$/)) { return; }
          if (watchId.indexOf('lv') === 0) { return; }

          e.preventDefault();

          //$('.zenzaWatching').removeClass('zenzaWatching');
          //$target.addClass('.zenzaWatching');

          if (e.shiftKey) {
            // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
            this._send(watchId);
          } else {
            this._open(watchId);
          }

          window.setTimeout(() => {
            ZenzaWatch.emitter.emit('hideHover');
          }, 1500);

        });
      }
    });

    var initializeDialog = function(conf, offScreenLayer) {
      console.log('initializeDialog');
      var dialog = new NicoVideoPlayerDialog({
        offScreenLayer: offScreenLayer,
        playerConfig: conf
      });

      return dialog;
    };


    if (window.name !== 'commentLayerFrame') {
      if (location.host === 'www.nicovideo.jp') {
        initialize();
      } else {
        NicoVideoApi.configBridge(Config).then(function() {
          window.console.log('%cZenzaWatch Bridge: %s', 'background: lightgreen;', location.host);
          if (document.getElementById('siteHeaderNotification')) {
            initialize();
            return;
          }
          NicoVideoApi.ajax({url: '//www.nicovideo.jp/'})
            .then(function(result) {
              var $dom = $('<div>' + result + '</div>');
              var isLogin = $dom.find('#siteHeaderLogin').length < 1;
              var isPremium =
                $dom.find('#siteHeaderNotification').hasClass('siteHeaderPremium');
              window.console.log('isLogin: %s isPremium: %s', isLogin, isPremium);
              ZenzaWatch.util.isLogin   = function() { return isLogin; };
              ZenzaWatch.util.isPremium = function() { return isPremium;  };
              initialize();
            });
        }, function() {
          window.console.log('ZenzaWatch Bridge disabled');
        });
      }
    }



};

  let loadLodash = function() {
    if (window._) {
      return Promise.resolve();
    }
    console.info('load lodash from cdn...');

    return new Promise((resolve, reject) => {
      let script = document.createElement('script');
      script.id = 'lodashLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js';
      document.body.appendChild(script);
      let count = 0;

      let tm = setInterval(() => {
        count++;

        if (window._)  {
          clearInterval(tm);
          resolve();
          return;
        }

        if (count >= 100) {
          clearInterval(tm);
          console.error('load lodash timeout');
          reject();
        }

      }, 300);
    });
  };



  var xmlHttp = function(options) {
    try {
      //window.console.log('xmlHttp bridge: ', options.url, options);
      var req = new XMLHttpRequest();
      var method = options.method || options.type || 'GET';
      var xhrFields = options.xhrFields || {};

      if (xhrFields.withCredentials === true) {
        req.withCredentials = true;
      }

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (typeof options.onload === 'function') options.onload(req);
        }
      };
      req.open(method, options.url, true);

      if (options.headers) {
        for (var h in options.headers) {
          req.setRequestHeader(h, options.headers[h]);
        }
      }

      req.send(options.data || null);
    } catch (e) {
      window.console.error(e);
    }
  };

  var parentPostMessage = function(type, message, token) {
    var origin = document.referrer;
    try {
      parent.postMessage(JSON.stringify({
          id: 'ZenzaWatch',
          type: type, // '',
          body: {
            token: token,
            url: location.href,
            message: message
          }
        }),
        origin);
    } catch (e) {
      alert(e);
      console.log('err', e);
    }
  };

  var parseQuery = function(query) {
    var result = {};
    query.split('&').forEach(function(item) {
      var sp = item.split('=');
      var key = sp[0];
      var val = decodeURIComponent(sp.slice(1).join('='));
      result[key] = val;
    });
    return result;
  };

  const parseUrl = (url) => {
    const a = document.createElement('a');
    a.href = url;
    return a;
  };

  var loadUrl = function(data, type, token) {
    var timeoutTimer = null, isTimeout = false;

    if (!data.url) { return; }

    var options = data.options || {};
    var sessionId = data.sessionId;
    xmlHttp({
      url:     data.url,
      method:  options.method || options.type || 'GET',
      data:    options.data,
      headers: options.headers || [],
      xhrFields: options.xhrFields,
      onload: function(resp) {

        if (isTimeout) { return; }
        else { window.clearTimeout(timeoutTimer); }

        try {
          parentPostMessage(type, {
            sessionId: sessionId,
            status: 'ok',
            token: token,
            command: data.command,
            url: data.url,
            body: resp.responseText
          });
        } catch (e) {
          console.log(
            '%cError: parent.postMessage - ',
            'color: red; background: yellow',
            e, event.origin, event.data);
        }
      }
    });

    timeoutTimer = window.setTimeout(function() {
      isTimeout = true;
      parentPostMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrl',
        url: data.url
      });
    }, 30000);
  };

  const loadUrlByFetch = function(data, type, token) {
    let timeoutTimer = null, isTimeout = false;

    const url     = data.url;
    const options = data.options;
    const sessionId = data.sessionId;

    fetch(url, options).then((resp) => {
      return resp.text();
    }).then(text => {
      if (isTimeout) { return; }
      else { window.clearTimeout(timeoutTimer); }
      try {
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'ok',
          token: token,
          command: data.command,
          url: data.url,
          body: text
        });
      } catch (e) {
        console.log(
          '%cError: parent.postMessage - ',
          'color: red; background: yellow',
          e, event.origin, event.data);
      }
    });

    timeoutTimer = window.setTimeout(() => {
      isTimeout = true;
      parentPostMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrlByFetch',
        url: data.url
      });
    }, 30000);
  };

  const HOST_REG = /^[a-z0-9]*\.nicovideo\.jp$/;

  var thumbInfoApi = function() {
    if (window.name.indexOf('thumbInfoLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    var type = 'thumbInfo';
    var token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    window.addEventListener('message', function(event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) { return; }
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      //var command = data.command;

      if (data.token !== token) { return; }


      if (!data.url) { return; }
      var sessionId = data.sessionId;
      xmlHttp({
        url: data.url,
        onload: function(resp) {

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

          try {
            parentPostMessage(type, {
              sessionId: sessionId,
              status: 'ok',
              token: token,
              url: data.url,
              body: resp.responseText
            });
          } catch (e) {
            console.log(
              '%cError: parent.postMessage - ',
              'color: red; background: yellow',
              e, event.origin, event.data);
          }
        }
      });

      timeoutTimer = window.setTimeout(function() {
        isTimeout = true;
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          url: data.url
        });
      }, 30000);

    });

    try {
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };

  var nicovideoApi = function() {
    if (window.name.indexOf('nicovideoApiLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    let parentHost = parseUrl(document.referrer).hostname;
    window.console.log('parentHost', parentHost);
    if (!HOST_REG.test(parentHost) &&
        localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
      window.console.log('disable bridge');
      return;
    }
    window.console.log('enable bridge');


    let isOk = false;
    var type = 'nicovideoApi';
    var token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    var originalUrl = location.href;
    var pushHistory = function(path) {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, null, path);
    };

    var PREFIX = 'ZenzaWatch_';
    var dumpConfig = function(data) {
      if (!data.keys) { return; }
      var prefix = PREFIX;
      var config = {};
      var sessionId = data.sessionId;

      data.keys.forEach((key) => {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
            //window.console.log('dump config: %s = %s', key, config[key]);
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });

      try {
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'ok',
          token: token,
          command: data.command,
          body: config
        });
      } catch (e) {
        console.log(
          '%cError: parent.postMessage - ',
          'color: red; background: yellow',
          e, event.origin, event.data);
      }
    };

    var saveConfig = function(data) {
      if (!data.key) { return; }
      var prefix = PREFIX;
      var storageKey = prefix + data.key;
      //window.console.log('bridge save config: %s = %s', storageKey, data.value);
      localStorage.setItem(storageKey, JSON.stringify(data.value));
    };

    window.addEventListener('message', function(event) {
      //window.console.log('nicovideoApiLoaderWindow.onMessage origin="%s"', event.origin, event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) { return; }
      var data = JSON.parse(event.data), command = data.command;

      if (data.token !== token) {
        window.console.log('invalid token: ', data.token, token, command);
        return;
      }

      switch (command) {
        case 'ok':
          window.console.info('initialize ok!');
          isOk = true;
          break;
        case 'loadUrl':
          loadUrl(data, type, token);
          break;
        case 'fetch':
          loadUrlByFetch(data, type, token);
          break;
        case 'dumpConfig':
          dumpConfig(data);
          break;
        case 'saveConfig':
          saveConfig(data);
          break;
        case 'pushHistory':
          pushHistory(data.path, data.title);
          break;
      }
    });

    var onStorage = function(e) {
      var key = e.key || '';
      if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) { return; }

      key = key.replace('ZenzaWatch_', '');
      var oldValue = e.oldValue;
      var newValue = e.newValue;
      //asyncEmitter.emit('change', key, newValue, oldValue);
      if (oldValue === newValue) { return; }
      if (!isOk) { return; }

      parentPostMessage(type, {
        command: 'configSync',
        token: token,
        key:   key,
        value: newValue
      });

      switch(key) {
        case 'message':
          //console.log('%cmessage', 'background: cyan;', newValue);
          parentPostMessage(type, { command: 'message', value: newValue, token: token });
          break;
      }
    };


    var onBroadcastMessage = function(e) {
      const packet = e.data;
      //window.console.log('%cmessage', 'background: cyan;', packet);
      if (!isOk) { return; }

      parentPostMessage(type, { command: 'message', value: JSON.stringify(packet), token: token});
    };

    var broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel('ZenzaWatch')) : null;
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);
    


    try {
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };



  var smileApi = function() {
    if (window.name.indexOf('storyboard') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    const videoCapture = function(src, sec) {
      return new Promise((resolve, reject) => {
        //console.log('videoCapture', src, sec);
        let resolved = false;
        const v = document.createElement('video');

        v.addEventListener('loadedmetadata', () => {
          v.currentTime = sec;
        });
        v.addEventListener('error', (err) => {
          v.remove();
          return reject(err);
        });

        const onSeeked = () => {
          if (resolved) { return; }
          const c = document.createElement('canvas');
          c.width  = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0);
          v.remove();

          resolved = true;
          return resolve(c);
        };

        v.addEventListener('seeked', onSeeked);

        document.body.appendChild(v);
        v.volume = 0;
        v.autoplay = false;
        v.controls = false;
        v.src = src;
        v.currentTime = sec;
      });
    };

    window.addEventListener('message', function(event) {
      const data = JSON.parse(event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) { return; }

      if (data.token !== token) { return; }

      const command = data.command;
      const sessionId = data.sessionId;
      switch (command) {
        case 'videoCapture':
          videoCapture(data.src, data.sec).then(canvas => {
            const dataUrl = canvas.toDataURL('image/png');
            //console.info('video capture success', dataUrl.length);
            parentPostMessage(type, {
              sessionId,
              status: 'ok',
              token,
              command,
              body: dataUrl
            });
          });
          break;
      }
    });

    try {
      //window.console.log('%cpost initialized:', 'font-weight: bolder;', type);
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }

  };

  const searchApi = function() {
    if (window.name.indexOf('search') < 0 ) { return; }
    console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    window.addEventListener('message', (event) => {
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) { return; }
      const data = JSON.parse(event.data);

      if (data.token !== token) { return; }

      if (!data.url) { return; }

      loadUrlByFetch(data, type, token);
    });

    try {
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };



  if (window.ZenzaWatch) { return; }
  let document = window.document;
  let host = window.location.host || '';
  let href = (location.href || '').replace(/#.*$/, '');
  let prot = location.protocol;
  if (href === prot + '//www.nicovideo.jp/favicon.ico' &&
      window.name === 'nicovideoApiLoader') {
    loadLodash().then(nicovideoApi);
  } else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
    loadLodash().then(smileApi);
  } else if (host === 'api.search.nicovideo.jp' && window.name.startsWith('searchApiLoader')) {
    loadLodash().then(searchApi);
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('thumbInfoLoader') >= 0) {
    loadLodash().then(thumbInfoApi);
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    loadLodash().then(exApi);
  } else if (window === window.top) {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    // 効果はいまいち・・・
    var iframe;
    for (var i = 0; i < 3; i++) {
      iframe = document.createElement('iframe');
      iframe.className = 'reservedFrame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.srcdocType = typeof iframe.srcdoc;
      iframe.srcdoc = '<html></html>';
      document.body.appendChild(iframe);
    }


    var loadGm = function() {
      let script = document.createElement('script');
      script.id = 'ZenzaWatchLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.appendChild(
        document.createTextNode(`(${monkey})('${PRODUCT}', '${escape(START_PAGE_QUERY)}');` ));
      document.body.appendChild(script);
    };

    var MIN_JQ = 10000600000;
    var getJQVer = function() {
      if (!window.jQuery) {
        return 0;
      }
      var ver = [];
      var t = window.jQuery.fn.jquery.split('.');
      while(t.length < 3) { t.push(0); }
      t.forEach((v) => { ver.push((v * 1 + 100000).toString().substr(1)); });
      return ver.join('') * 1;
    };

    var loadJq = function() {
      console.log('JQVer: ', getJQVer());
      console.info('load jQuery from cdn...');

      return new Promise((resolve, reject) => {
        var $j = window.jQuery || null;
        var $$ = window.$ || null;
        var script = document.createElement('script');
        script.id = 'jQueryLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
        document.body.appendChild(script);
        var count = 0;

        var tm = setInterval(() => {
          count++;

          if (getJQVer() >= MIN_JQ)  {
            clearInterval(tm);
            window.ZenzaJQuery = window.jQuery;
            if ($j) { window.jQuery = $j; }
            if ($$) { window.$      = $$; }
            resolve();
            return;
          }

          if (count >= 100) {
            clearInterval(tm);
            console.error('load jQuery timeout');
            reject();
          }

        }, 300);
      });
    };

    loadLodash().then(() => {
      if (getJQVer() >= MIN_JQ) {
        loadGm();
      } else {
        loadJq().then(loadGm);
      }
    });
  }
})(window.unsafeWindow || window);
