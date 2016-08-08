var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var NicoVideoApi = {};
var console;



// アロー関数はiOSで未サポートなので注意

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

        window.setTimeout(_.bind(function() {
          //try {
            this.emit.apply(this, args);
          //} catch (e) {
          //  console.log(e);
          //  throw e;
          //}
        }, this), 0);
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
        sharedNgLevel: 'MID',      // NG共有の強度 NONE, LOW, MID, HIGH
        enablePushState: true,     // ブラウザの履歴に乗せる
        enableHeatMap: true,
        enableCommentPreview: false,
        enableAutoMylistComment: true, // マイリストコメントに投稿者を入れる
        menuScale: 1.0,
        enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
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

        enableCommentPanel: true,
        enableCommentPanelAutoScroll: true,

        playlistLoop: false,

        baseFontFamily: '',
        baseChatScale: 1.0,
        baseFontBolder: true,

        allowOtherDomain: false, // 外部サイトでも実行するかどうか

        overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く

        speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
        speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す


        enableCommentLayoutWorker: true, // コメントの配置計算を一部マルチスレッド化(テスト中)


        commentLayerOpacity: 1.0, //
        textShadow: '1px 1px 0 #000', //

        overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
        enableGinzaSlayer: false, // まだ実験中
        lastPlayerId: '',
        playbackRate: 1.0,
        lastWatchId: 'sm9',
        message: '',


        KEY_CLOSE:      27,          // ESC
        KEY_RE_OPEN:    27 + 0x1000, // SHIFT + ESC
        KEY_HOME:       36 + 0x1000, // SHIFT + HOME

        KEY_SEEK_LEFT:  37 + 0x1000, // SHIFT + LEFT
        KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT

        KEY_VOL_UP:     38 + 0x1000, // SHIFT + UP
        KEY_VOL_DOWN:   40 + 0x1000, // SHIFT + DOWN

        KEY_INPUT_COMMENT:  67, // C
        KEY_FULLSCREEN:     70, // F
        KEY_MUTE:           77, // M
        KEY_TOGGLE_COMMENT: 86, // V

        KEY_DEFLIST_ADD:    84,          // T
        KEY_DEFLIST_REMOVE: 84 + 0x1000, // SHIFT + T

        KEY_TOGGLE_PLAY: 32, // SPACE

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
      };

      if (navigator &&
          navigator.userAgent &&
          navigator.userAgent.match(/(Android|iPad;|CriOS)/i)) {
        defaultConfig.overrideWatchLink       = true;
        defaultConfig.enableTogglePlayOnClick = true;
        defaultConfig.autoFullScreen          = true;
        defaultConfig.autoCloseFullScreen     = false;
        defaultConfig.volume = 1.0;
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

      return emitter;
    })();

    ZenzaWatch.config = Config;

    var dummyConsole = {
      log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop
    };
    console = Config.getValue('debug') ? window.console : dummyConsole;
    Config.on('update-debug', function(v) {
      console = v ? window.console : dummyConsole;
    });

    var PopupMessage = (function() {
      var __view__ = ZenzaWatch.util.hereDoc(function() {/*
        <div class="zenzaPopupMessage">
          <span>%MSG%</span>
        </div><br>
      */});

      var __css__ = ZenzaWatch.util.hereDoc(function() {/*
        .zenzaPopupMessage {
          z-index: 200000;
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
          z-index: 250000;
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
          {*transform: translate3d(0, -100px, 0);*}
          opacity: 0;
          max-height: 0;
          padding: 0px 8px;
          margin-bottom: 0px;
          box-shadow: 4px 4px 2px rgba(192, 192, 192, 0);
          transition:
            transform 1s linear,
            opacity       0.5s ease 0.5s,
            max-height    0.3s ease 1s,
            padding       0.3s ease 1s,
            margin-bottom 0.3s ease 1s,
            box-shadow    0.5s ease,
            background 5s ease;
        }

        .zenzaPopupMessage.notify {
          background: #0c0;
          color: #fff;
        }

        .zenzaPopupMessage.alert {
          background: #c00;
          color: #fff;
        }

        .ginzaSlayer #nicoplayerContainer {
          background: #888;
          border: 1px inset;
        }
        body.ginzaSlayer.content-fix.size_small.no_setting_panel.videoExplorer #playlist {
          position: fixed;
          right: 0;
          left: 400px;
          top: 0;
          min-width: auto;
        }

        {* できれば広告に干渉したくないけど仕方なく *}
        div[data-follow-container] {
          position: static !important;
        }

      */});

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

      return {
        notify: notify,
        alert: alert
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

    var videoIdReg = /^[a-z]{2}\d+$/;
    /**
     * 動画IDからサムネのURLを逆算する。
     * 実際はどのサーバーでもサムネ自体はあるっぽい。
     */
    var getThumbnailUrlByVideoId = function(videoId) {
      if (!videoIdReg.test(videoId)) {
        return null;
      }
      var fileId = parseInt(videoId.substr(2), 10);
      var num = (fileId % 4) + 1;
      var large = hasLargeThumbnail(videoId) ? '.L' : '';
      return '//tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
    };
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

    var __css__ = ZenzaWatch.util.hereDoc(function() {/*
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
        z-index: 200000;
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
        opacity: 0.9;
        box-shadow: 2px 2px 4px #fff;
        box-sizing: border-box;
        transition: opacity 0.3s ease;
        z-index: 150000;
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
      {* .zenzaPopupMenu ul li:last-child { border-bottom: none; } *}

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

    */});
    // 非ログイン状態のwatchページ用
    var __no_login_watch_css__ = ZenzaWatch.util.hereDoc(function() {/*
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

    */});


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

    var localStorageEmitter = (function() {
      var asyncEmitter = new AsyncEmitter();

      var onStorage = function(e) {
        var key = e.key;
        if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) { return; }

        key = key.replace('ZenzaWatch_', '');
        var oldValue = e.oldValue;
        var newValue = e.newValue;
        asyncEmitter.emit('change', key, newValue, oldValue);

        switch(key) {
          case 'message':
            console.log('%cmessage', 'background: cyan;', newValue);
            asyncEmitter.emit('message', JSON.parse(newValue));
            break;
          case 'ping':
            asyncEmitter.emit('ping');
            break;
        }
      };

      asyncEmitter.send = function(packet) {
        packet.__now = Date.now();
        window.console.log('send Packet', packet);
        Config.setValue('message', packet);
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
            asyncEmitter.emit('message', JSON.parse(data.message.value));
            break;
        }
      });

//      asyncEmitter.ping = function() {
//        asyncEmitter.send({id: 
//      };

      if (location.host === 'www.nicovideo.jp') {
        window.addEventListener('storage', onStorage);
      }

      return asyncEmitter;
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
        ZenzaWatch.util.callAsync(function() {
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
        ZenzaWatch.util.callAsync(function() {
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

    var getLang = function() {
      try {
        var h = document.getElementsByClassName('html')[0];
        return h.lang || 'ja-JP';
      } catch(e) {
        return 'ja-JP';
      }
    };
    ZenzaWatch.util.getLang = getLang;


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

    var ajax = function(params) {

      if (location.host !== 'www.nicovideo.jp') {
        return NicoVideoApi.ajax(params);
      }
      // マイページのjQueryが古くてDeferredの挙動が怪しいのでネイティブのPromiseで囲う
      return new Promise(function(resolve, reject) {
        $.ajax(params).then(function(result) {
          return resolve(result);
        }, function(err) {
          return reject(err);
        });
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
      return /^https?:\/\/www.nicovideo.jp\/watch\//.test(url);
    };
    ZenzaWatch.util.isGinzaWatchUrl = isGinzaWatchUrl;

    var isZenzaPlayableVideo = function() {
      try {
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

    var ShortcutKeyEmitter = (function(config) {
      var emitter = new AsyncEmitter();
      var isVerySlow = false;

      // コンソールでキーバインド変更
      //
      // 例: ENTERでコメント入力開始
      // ZenzaWatch.config.setValue('KEY_INPUT_COMMENT', 13);
      // SHIFTをつけたいときは 13 + 0x1000
      
      var map = {
        CLOSE: 0,
        RE_OPEN: 0,
        HOME: 0,
        SEEK_LEFT: 0,
        SEEK_RIGHT: 0,
        VOL_UP: 0,
        VOL_DOWN: 0,
        INPUT_COMMENT: 0,
        FULLSCREEN: 0,
        MUTE: 0,
        TOGGLE_COMMENT: 0,
        DEFLIST_ADD: 0,
        DEFLIST_REMOVE: 0,
        TOGGLE_PLAY: 0,
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
        PREV_VIDEO: 0
      };

      _.each(Object.keys(map), function(key) {
        map[key] = parseInt(config.getValue('KEY_' + key), 10);
      });

      var onKeyDown = function(e) {
        if (e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA') {
          return;
        }
        if (e.ctrlKey || e.altKey) {
          return;
        }
        var keyCode = e.keyCode + (e.shiftKey ? 0x1000 : 0);
        var key = '';
        var param = '';
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
          case map.SEEK_LEFT:
          case 37: // LEFT
            if (e.shiftKey || isVerySlow) { key = 'SEEK_BY'; param = isVerySlow ? -1 : -5; }
            break;
          case map.VOL_UP:
            key = 'VOL_UP';
            break;
          case map.SEEK_RIGHT:
          case 39: // RIGHT
            if (e.shiftKey || isVerySlow) { key = 'SEEK_BY'; param = isVerySlow ?  1 :  5; }
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
          default:
            //console.log('%conKeyDown: %s', 'background: yellow;', e.keyCode);
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
        if (e.ctrlKey || e.altKey) {
          return;
        }
        var key = '';
        var param = '';
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
      ZenzaWatch.emitter.on('DialogPlayerOpen',  _.bind(this.enable, this));
      ZenzaWatch.emitter.on('DialogPlayerClose', _.bind(this.disable, this));
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

      var onload = function() {
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
      }.bind(this);

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


//===END===
