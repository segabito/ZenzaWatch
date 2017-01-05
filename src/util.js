const $ = require('jquery');
const _ = require('lodash');
const ZenzaWatch = {
  util:{},
  debug: {}
};
const NicoVideoApi = {};
const CONSTANT = {};
const util = {};
const PRODUCT = 'ZenzaWatch';
class CrossDomainGate {}

//===BEGIN===

    var AsyncEmitter = (function() {

      function AsyncEmitter() {
      }

      AsyncEmitter.prototype.on = function(name, callback) {
        if (!this._events) { this._events = {}; }
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
          //  throw ex;
          //}
        }
      };

      AsyncEmitter.prototype.emitAsync = function() {
        if (!this._events) { this._events = {}; }
        var args = arguments;

        window.setTimeout(() => {
          //try {
            this.emit.apply(this, args);
          //} catch (e) {
          //  console.log(e);
          //  throw e;
          //}
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
            $('body').addClass('fullScreen');
          } else {
            $('body').removeClass('fullScreen');
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
        enableAutoMylistComment: true, // マイリストコメントに投稿者を入れる
        menuScale: 1.0,
        enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
        enableDblclickClose: true, //
        enableFullScreenOnDoubleClick: true,
        enableStoryBoard: true, // シークバーサムネイル関連
        enableStoryBoardBar: false, // シーンサーチ

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

        commentLayerOpacity: 1.0, //
        'commentLayer.textShadowType': '', // フォントの修飾タイプ

        overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
        enableGinzaSlayer: false, // まだ実験中
        lastPlayerId: '',
        playbackRate: 1.0,
        lastWatchId: 'sm9',
        message: '',

        enableVideoSession: true,
        enableDmc: true, // 新サーバーを使うかどうか
        autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
        dmcVideoQuality: 'auto',   // 優先する画質 high, mid, low


        'videoSearch.ownerOnly': true,
        'videoSearch.mode': 'tag',
        'videoSearch.order': 'desc',
        'videoSearch.sort': 'f',
        'videoSearch.word': '',

        'uaa.enable': true,

        'screenshot.prefix': '',

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
      }

      var config = {};
      var noEmit = false;

      _.each(Object.keys(defaultConfig), function(key) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey)) {
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
        if (localStorage.hasOwnProperty(storageKey)) {
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
            localStorage.setItem(storageKey, JSON.stringify(value));
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
            localStorage.setItem(storageKey, JSON.stringify(value));
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
          if (_.contains(['message', 'lastPlayerId', 'lastWatchId', 'debug'], key)) { return; }
          var storageKey = prefix + key;
          if (localStorage.hasOwnProperty(storageKey) &&
              defaultConfig[key] !== emitter.getValue(key)) {
            result[key] = emitter.getValue(key);
          }
        });
        return result;
      };

      emitter.importConfig = function(data) {
        noEmit = true;
        _.each(Object.keys(data), function(key) {
          if (_.contains(['message', 'lastPlayerId', 'lastWatchId', 'debug'], key)) { return; }
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
          if (_.contains(['message', 'lastPlayerId', 'lastWatchId', 'debug'], key)) { return; }
          var storageKey = prefix + key;
          try {
            if (localStorage.hasOwnProperty(storageKey)) {
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

    var parseQuery = function(query) {
      var result = {};
      _.each(query.split('&'), function(item) {
        var sp = item.split('=');
        var key = decodeURIComponent(sp[0]);
        var val = decodeURIComponent(sp.slice(1).join('='));
        result[key] = val;
      });
      return result;
    };

    ZenzaWatch.util.parseQuery = parseQuery;


    var hasLargeThumbnail = function(videoId) { // return true;
      // 大サムネが存在する最初の動画ID。 ソースはちゆ12歳
      // ※この数字以降でもごく稀に例外はある。
      var threthold = 16371888;
      var cid = videoId.substr(0, 2);
      if (cid !== 'sm') { return false; }

      var fid = videoId.substr(2) * 1;
      if (fid < threthold) { return false; }

      return true;
    };

    ZenzaWatch.util.hasLargeThumbnail = hasLargeThumbnail;

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
        const large = hasLargeThumbnail(videoId) ? '.L' : '';
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


    `;
    // 非ログイン状態のwatchページ用
    var __no_login_watch_css__ = `
      body .logout-video-thumb-box {
        width: 672px;
        height: 386px;
        margin-left: -6px;
      }

      .commentLayerFrame {
        position: absolute;
        top: 0;
        left: 0;
        width: 672px;
        height: 386px;
        z-index: 10000;
        border: 0;
        transition: opacity 1s ease, top 0.4s ease;
        pointer-events: none;

        transform: translateZ(0);
      }

      .logout-video-thumb-box:hover .commentLayerFrame {
        top: -50px;
      }

      .login-box {
        z-index: 10001;
        opacity: 0 !important;
        background-color: rgba(255, 255, 255, 0.8) !important;
        transition: opacity 1s ease;
      }

      .login-box:hover {
        opacity: 1 !important;
        transition: opacity 0.3s ease;
      }

      .videoPlayer {
        position: fixed;
        right: 100px;
        bottom: calc(50% - 100px);
        width: 320px;
        height: 200px;
      }

      .logout-video-thumb-box .videoPlayer {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        background: #000;
      }

    `;


    var WindowMessageEmitter = (function() {
      var asyncEmitter = new AsyncEmitter();
      var knownSource = [];

        var onMessage = function(event) {
          if (_.indexOf(knownSource, event.source) < 0 &&
              event.origin !== location.protocol + '//ext.nicovideo.jp'
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
      broadcastChannel = null; //まだ実験中

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
        });
        isOpen = true;
      };

      var onVideoInfoLoad = function(videoInfo) {
        if (!videoInfo.getWatchId) { return; }
        var watchId = videoInfo.getWatchId();
        var title =
           'nicovideo: ' + videoInfo.getTitle() + ' - ' + videoInfo.getOwnerInfo().name;
        if (location.host !== 'www.nicovideo.jp') {
          if (ZenzaWatch.api.nicovideoLoader) {
            ZenzaWatch.api.nicovideoLoader.pushHistory('/watch/' + watchId, title);
          }
          return;
        }
        var url = originalUrl, originalTitle = document.title;
        if (!ZenzaWatch.util.isGinzaWatchUrl(originalUrl)) {
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
          if (ZenzaWatch.util.isGinzaWatchUrl(originalUrl)) {
            return;
          }
          window.history.replaceState(null, null, url);
        }, 1000);
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
      // TODO: どこかutil的な関数に追い出す
      var watchId = videoInfo.getWatchId();
      var nicomsUrl = 'http://nico.ms/' + watchId;
      var watchUrl = location.protocol + '//www.nicovideo.jp/watch/' + watchId;

      var sec = videoInfo.getDuration();
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      var dur = ['(', m, ':', s, ')'].join('');
      var nicoch = videoInfo.isChannel() ? ',+nicoch' : '';
      var url =
        'https://twitter.com/intent/tweet?' +
        'url='       + encodeURIComponent(nicomsUrl) +
        '&text='     + encodeURIComponent(videoInfo.getTitle() + dur) +
        '&hashtags=' + encodeURIComponent(videoInfo.getVideoId() + nicoch) +
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
        var watchApiData = JSON.parse($('#watchAPIDataContainer').text());
        var flvInfo = ZenzaWatch.util.parseQuery(
            decodeURIComponent(watchApiData.flashvars.flvInfo)
          );
        var videoUrl = flvInfo.url;
        var isSwf = /\/smile\?s=/.test(videoUrl);
        var isRtmp = /^rtmpe?:/.test(videoUrl);
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
          position: 'fixd',
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

    // いずれjQueryを捨てるためのミニマム代用
    // 再発明を目的とするものではないし、積極的に使うものでもない
    util.$ = (() => {

      const toCamel = p => {
        return p.replace(/-./g, s => { return s.charAt(1).toUpperCase(); });
      };

      class $wrapper {
        constructor(elements) {
          elements = elements || [];
          if (elements instanceof(NodeList)) {
            elements = Array.from(elements);
          }
          this._elements = elements;

          this._eventListener = {};
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
          let result = [];

          this.forEach(elm => {
            Array.from(elm.querySelectorAll(query)).forEach(e => {
              result.push(e);
            });
          });

          return new $wrapper(result);
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
          const listener = this._eventListener[eventName] || [];
          listener.push(callback);
          this._eventListener[eventName] = listener;

          this.forEach(e => {
            e.addEventListener(eventName, callback, options);
          });
          return this;
        }

        off(eventName, callback, options) {
          if (typeof callback !== 'function') {
            this.forEach((e) => {
              const listener = this._eventListener[eventName] || [];
              listener.forEach(ls => {
                e.removeEventListener(eventName, ls);
              });
            });
          } else {
            this.forEach((e) => {
              e.removeEventListener(eventName, callback, options);
            });
          }
          return this;
        }

        _setAttribute(key, val) {
          this.forEach(e => { e.setAttribute(key, val); });
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
          (e.altKey   ? 0x100000 : 0) +
          (e.ctrlKey  ? 0x10000  : 0) +
          (e.shiftKey ? 0x1000   : 0);
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
          case 222 + 0x1000: // Shift + 2 ???
            // なぜかMacChrome+JISキーではShift+2で222が飛んでくる。不明。
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
        let param = '';
        switch (e.keyCode) {
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
        window.jQuery('body').on('MylistPocketReady', function() {
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
        (`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
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


//===END===
    // 参考
    // https://developer.mozilla.org/ja/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
    ZenzaWatch.util.htmlToSvg = function(html, width = 682, height = 384) {
      const data =
        (`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
          <foreignObject width='100%' height='100%'>${html}</foreignObject>
        </svg>`).trim();
      const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
      return {svg, data};
    };

    ZenzaWatch.util.htmlToCanvas = function(html, width = 640, height = 360) {

      const imageW = height * 16 / 9;
      const imageH = imageW * 9 / 16;
      const {svg, data} = util.htmlToSvg(html);

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
          window.console.info('img size', img.width, img.height);
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

    ZenzaWatch.util.nicoVideoCapture = function({video, html, minHeight = 720}) {
      let scale = 1;
      let width  =
        Math.max(video.videoWidth, video.videoHeight * 16 / 9);
      let height = video.videoHeight;
      // 動画の解像度が低いときは、可能な範囲で整数倍に拡大する
      if (minHeight < 720) {
        scale  = Math.floor(720 / height);
        width  *= scale;
        height *= scale;
      }
      const vc = document.createElement('canvas');
      const ct = vc.getContext('2d');
      vc.width = width;
      vc.height = height;

      ct.fillStyle = 'rgb(0, 0, 0)';
      ct.fillRect(0, 0, width, height);
      ct.drawImage(
        video,
        (width  - video.videoWidth  * scale) / 2,
        (height - video.videoHeight * scale) / 2,
        video.videoWidth  * scale,
        video.videoHeight * scale
      );

      return util.htmlToCanvas(html, width, height).then(({canvas, img}) => {
        ct.drawImage(canvas, 0, 0, width, height);
        return Promise.resolve({canvas: vc, img, commentCanvas: canvas});
      });
    };



ZenzaWatch.util.htmlToCanvas(
  ZenzaWatch.debug.commentLayer.contentWindow.document.querySelector('html').outerHTML)
  .then((canvas) => {
    document.body.appendChild(canvas);
  });

ZenzaWatch.util.toWellFormedHtml(ZenzaWatch.debug.commentLayer.contentWindow.document.querySelector('html').outerHTML);

ZenzaWatch.util.htmlToCanvas(ZenzaWatch.debug.commentLayer.contentWindow.document.querySelector('html').outerHTML.replace('<html ', '<html xmlns="http://www.w3.org/1999/xhtml" ').replace(/<meta.*?>/g, ''))
  .then((canvas) => {
    document.body.appendChild(canvas);
  }, (err) => { console.error('!', err); });
