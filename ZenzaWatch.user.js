// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    Ginzaに行かなくても動画を再生
// @match          http://www.nicovideo.jp/*
// @match          http://ext.nicovideo.jp/
// @match          http://ext.nicovideo.jp/thumb/*
// @match          http://api.ce.nicovideo.jp/api/v1/system.unixtime
// @match          http://blog.nicovideo.jp/*
// @match          http://ch.nicovideo.jp/*
// @match          http://com.nicovideo.jp/*
// @match          http://commons.nicovideo.jp/*
// @match          http://dic.nicovideo.jp/*
// @match          http://info.nicovideo.jp/*
// @match          http://search.nicovideo.jp/*
// @match          http://uad.nicovideo.jp/*
// @exclude        http://ads*.nicovideo.jp/*
// @exclude        http://www.upload.nicovideo.jp/*
// @exclude        http://ch.nicovideo.jp/tool/*
// @exclude        http://flapi.nicovideo.jp/*
// @exclude        http://dic.nicovideo.jp/p/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.11.1
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js
// ==/UserScript==


(function() {

var monkey = function() {
  var console = window.console;
  console.log('exec ZenzaWatch..');
  var $ = window.ZenzaJQuery || window.jQuery, _ = window._;
  var TOKEN = Math.random();
  console.log('jQuery version: ', $.fn.jquery);

    var ZenzaWatch = {
      debug: {},
      api: {},
      init: {},
      util: {
        hereDoc: function(func) { // えせヒアドキュメント
          return func.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\{\*/g, '/*').replace(/\*\}/g, '*/').trim();
        },
        callAsync: function(func, self, delay) {
          delay = delay || 0;
          if (self) {
            window.setTimeout(_.bind(func, self), delay);
          } else {
            window.setTimeout(func, delay);
          }
        }
      }
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {};
    }


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
        for (var i =0, len = e.length; i < len; i++) {
          try {
            e[i].apply(null, Array.prototype.slice.call(arguments, 1));
          } catch (ex) {
            console.log('%c' + name, 'background:red; color: white;', i, e[i], ex);
            throw ex;
          }
        }
      };

      AsyncEmitter.prototype.emitAsync = function() {
        if (!this._events) { this._events = {}; }
        var args = arguments;

        window.setTimeout(_.bind(function() {
          try {
            this.emit.apply(this, args);
          } catch (e) {
            console.log(e);
            throw e;
          }
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
        loop:         false,
        mute:         false,
        screenMode:   'normal',
        autoFullScreen: false,
        autoCloseFullScreen: true, // 再生終了時に自動でフルスクリーン解除するかどうか
        continueNextPage: true,   // 動画再生中にリロードやページ切り替えしたら続きから開き直す
        backComment: false,        // コメントの裏流し
        autoPauseCommentInput: true, // コメント入力時に自動停止する
        sharedNgLevel: 'MID',      // NG共有の強度 NONE, LOW, MID, HIGH
        enablePushState: true,     // ブラウザの履歴に乗せる
        enableHeatMap: true,
        enableCommentPreview: false,
        enableAutoMylistComment: true, // マイリストコメントに投稿者を入れる
        menuScale: 1.0,
        enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか

        forceEconomy: false,
        // NG設定
        enableFilter: true,
        wordFilter: '',
        userIdFilter: '',
        commandFilter: '',

        baseFontFamily: '',
        baseChatScale: 1.0,
        baseFontBolder: true,

        overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く

        speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
        speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す

        overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
        enableGinzaSlayer: false, // まだ実験中
        lastPlayerId: '',
        playbackRate: 1.0,
        message: ''
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
          this.emitAsync('update', key, value);
          this.emitAsync('update-' + key, value);
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
        </div>
      */});

      var __css__ = ZenzaWatch.util.hereDoc(function() {/*
        .zenzaPopupMessage {
          position: fixed;
          top: -50px;
          left: 10px;
          z-index: 200000;
          opacity: 0;
          white-space: nowrap;
          font-weight: bolder;
          padding: 8px 16px;
          transition:
            top 2s linear,
            opacity 3s ease,
            z-index 1s ease,
            box-shadow 1s ease,
            background 5s ease;
          pointer-events: none;
          background: #000;
        }

        .zenzaPopupMessage.show {
          z-index: 250000;
          top: 50px;
          opacity: 0.8;
          box-shadow: 4px 4px 2px #ccc;
          transition:
            top 0.5s linear,
            opacity 1s ease,
            z-index 1s ease,
            box-shadow 0.5s ease,
            background 0.5s ease;
         }

        .zenzaPopupMessage.notify.show {
          background: #0c0;
          color: #fff;
        }

        .zenzaPopupMessage.alert.show {
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
        window.setTimeout(function() { $msg.removeClass('show'); }, 3000);
        window.setTimeout(function() { $msg.remove(); }, 10000);
      };

      var undefined;
      var notify = function(msg) {
        if (msg === undefined) {
          msg = '不明なエラー';
          window.console.error('undefined message sent');
          window.console.trace();
        }
        console.log('%c%s', 'background: #080; color: #fff; padding: 8px;', msg);
        var $msg = $(__view__.replace('%MSG%', ZenzaWatch.util.escapeHtml(msg))).addClass('notify');
        show($msg);
      };

      var alert = function(msg) {
        if (msg === undefined) {
          msg = '不明なエラー';
          window.console.error('undefined message sent');
          window.console.trace();
        }
        console.log('%c%s', 'background: #800; color: #fff; padding: 8px;', msg);
        var $msg = $(__view__.replace('%MSG%', ZenzaWatch.util.escapeHtml(msg))).addClass('alert');
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

      PlayerSession.hasRecord = function() {
        var key = prefix + 'PlayingStatus';
        return storage.hasOwnProperty(key);
      };

      return PlayerSession;
    })(sessionStorage);

    var addStyle = function(styles, id) {
      var elm = document.createElement('style');
      window.setTimeout(function() {
        elm.type = 'text/css';
        if (id) { elm.id = id; }

        var text = styles.toString();
        text = document.createTextNode(text);
        elm.appendChild(text);
        var head = document.getElementsByTagName('head');
        head = head[0];
        head.appendChild(elm);
      }, 0);
      return elm;
    };

    ZenzaWatch.util.addStyle = addStyle;

    var parseQuery = function(query) {
      var result = {};
      _.each(query.split('&'), function(item) {
        var sp = item.split('=');
        var key = sp[0];
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
      return 'http://tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
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
        border-bottom: 1px dotted #ccc;
        float: inherit;
      }
      .zenzaPopupMenu ul li:last-child {
        border-bottom: none;
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
              event.origin !== 'http://ext.nicovideo.jp'
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
        }
        var url = originalUrl;
        if (!ZenzaWatch.util.isGinzaWatchUrl(originalUrl)) {
          url = location.href;
        }
        var state = {
          zenza: true,
          watchId: watchId,
          options: options,
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

      var initialize = function(_dialog) {
        initialize = _.noop;
        dialog = _dialog;
        if (!config.getValue('enablePushState')) {
          return;
        }

        originalUrl = location.href;
        
        dialog.on('open', onDialogOpen);
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


    var ShortcutKeyEmitter = (function() {
      var emitter = new AsyncEmitter();

      var initialize = function() {
        initialize = _.noop;
        $('body').on('keydown.zenzaWatch', onKeyDown);
        ZenzaWatch.emitter.on('keydown', onKeyDown);
      };

      var onKeyDown = function(e) {
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
          case 178:
          case 179:
            key = 'PAUSE';
            break;
          case 177:
            key = 'PREV';
            break;
          case 176:
            key = 'NEXT';
            break;
          case 27:
            key = 'ESC';
            break;
          case 37: // LEFT
            if (e.shiftKey) { key = 'SEEK'; param = -5; }
            break;
          case 38: // UP
            if (e.shiftKey) { key = 'VOL_UP'; }
            break;
          case 39: // RIGHT
            if (e.shiftKey) { key = 'SEEK'; param = 5;}
            break;
          case 40: // DOWN
            if (e.shiftKey) { key = 'VOL_DOWN'; }
            break;
          case 67: // C
            key = 'INPUT_COMMENT';
            break;
          case 70: // F
            key = 'FULL';
            break;
          case 77: // M
            key = 'MUTE';
            break;
          case 86: // V
            key = 'VIEW_COMMENT';
            break;
          case 84: //T
            key = 'DEFLIST';
            break;
          case 32:
            key = 'SPACE';
            break;
          default:
            //console.log('%conKeyDown: %s', 'background: yellow;', e.keyCode);
            break;
        }
        if (key) {
          emitter.emit('keyDown', key, e, param);
        }
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
        this._$meta
          .attr('content', //'width=' + window.screen.width + ',' +
            'initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0');
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
          if (!this._storage.hasOwnProperty(key)) {
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
          if (!this._storage.hasOwnProperty(key)) {
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


    var VideoInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/thumb_watch';
      var loaderFrame, loaderWindow;
      var videoInfoLoader = new AsyncEmitter();
      var cacheStorage = new CacheStorage(localStorage);

      var onMessage = function(data, type) {
        if (type !== 'videoInfoLoader') { return; }
        console.log('VideoInfoLoader.onMessage', data, type);
        var info = data.message;

        //console.log('%cvideoInfoLoader.onThumbWatchInfoLoad', 'background: lightgreen;', info);
        videoInfoLoader.emitAsync('load', info, 'THUMB_WATCH');
      };

      // jsの壁を越えてクロス†ドメイン通信するための 異世界の"門"(ゲート) を広げる
      // ログインなしで動画を視聴出来る禁呪を発動させるための魔方陣であるが、現在は封印されている。
      // "フォース" の力によって封印を解いた者だけが異世界の"門"をうんたらかんたら
      //
      // やってることはiframeごしに外部サイト用動画プレイヤーのAPIを叩いてるだけ
      // 原理的には、http://〜のサイトならどこでもZenzaWatchを起動できる。
      var initializeCrossDomainGate = function() {
        initializeCrossDomainGate = _.noop;

        console.log('%c initialize videoInfoLoader', 'background: lightgreen;');

        loaderFrame = document.createElement('iframe');
        loaderFrame.name  = 'videoInfoLoaderLoader';
        loaderFrame.className = 'xDomainLoaderFrame thumb';
        document.body.appendChild(loaderFrame);

        loaderWindow = loaderFrame.contentWindow;

        WindowMessageEmitter.addKnownSource(loaderWindow);
        WindowMessageEmitter.on('onMessage', onMessage);
      };

      var loadFromThumbWatch = function(watchId) {
        initializeCrossDomainGate();
        //http://ext.nicovideo.jp/thumb_watch/sm9?cb=onPlayerLoaded&eb=onPlayerError
        var url = [
          BASE_URL, '/',
          watchId,
          '?cb=onPlayerLoaded&eb=onPlayerError'].join('');

        console.log('getVideoInfo: ', url);

        loaderWindow.location.replace(url);
      };

      var parseWatchApiData = function(dom) {
        var $dom = $('<div>' + dom + '</div>');
        try {
          var watchApiData = JSON.parse($dom.find('#watchAPIDataContainer').text());
          var videoId = watchApiData.videoDetail.id;
          var hasLargeThumbnail = ZenzaWatch.util.hasLargeThumbnail(videoId);
          var flvInfo = ZenzaWatch.util.parseQuery(
              decodeURIComponent(watchApiData.flashvars.flvInfo)
            );
          var thumbnail =
            watchApiData.flashvars.thumbImage +
              (hasLargeThumbnail ? '.L' : '');
          var videoUrl = flvInfo.url;
          var isEco = /\d+\.\d+low$/.test(videoUrl);
          var isFlv = /\/smile\?v=/.test(videoUrl);
          var isMp4 = /\/smile\?m=/.test(videoUrl);
          var isSwf = /\/smile\?s=/.test(videoUrl);
          var csrfToken = watchApiData.flashvars.csrfToken;
          
          var playlist = JSON.parse($dom.find('#playlistDataContainer').text());
          var isPlayable = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);

          cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

          var result = {
            watchApiData: watchApiData,
            flvInfo: flvInfo,
            playlist: playlist,
            isPlayable: isPlayable,
            isMp4: isMp4,
            isFlv: isFlv,
            isSwf: isSwf,
            isEco: isEco,
            thumbnail: thumbnail,
            csrfToken: csrfToken
          };

          ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', watchApiData.flashvars.csrfToken);
          return result;

        } catch (e) {
          window.console.error('error: parseWatchApiData ', e);
          return null;
        }
      };

      var loadFromWatchApiData = function(watchId, options) {
        var url = '/watch/' + watchId;
        var query = [];
        if (options.economy === true) {
          query.push('eco=1');
        }
        var isApiMode = false;
        if (query.length > 0) {
          url += '?' + query.join('&');
        }

        console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);

        var isFallback = false;
        var onLoad = function(req) {
          var data = parseWatchApiData(req);
          ZenzaWatch.debug.watchApiData = data;

          if (!data) {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: '動画情報の取得に失敗(watchApi)'
            });
            return;
          }

          if (data.isFlv && !isFallback && options.economy !== true) {
            isFallback = true;

            url = url + '?eco=1';
            console.log('%cエコノミーにフォールバック(flv)', 'background: cyan; color: red;', url);
            window.setTimeout(function() {
              ajax({
                url: url,
                xhrFields: { withCredentials: true },
                //beforeSend: function(xhr) {
                //  xhr.setRequestHeader('Referer', 'http://www.nicovideo.jp');
                //},
                headers: {
//                  'Referer': 'http://www.nicovideo.jp/',
                  'X-Alt-Referer': 'http://www.nicovideo.jp/'
                }
              }).then(
                onLoad,
                function() {
                  videoInfoLoader.emitAsync('fail', watchId, {
                    message: '動画情報の取得に失敗(watchApi)'
                  });
                }
              );
            }, 1000);
          } else if (!data.isPlayable) {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: 'この動画はZenzaWatchで再生できません',
              info: data
            });
          } else if (data.isMp4) {
            videoInfoLoader.emitAsync('load', data, 'WATCH_API', watchId);
            ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId); // 外部連携用
          } else {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: 'この動画はZenzaWatchで再生できません',
              info: data
            });
          }
        };

        ajax({
          url: url,
          xhrFields: { withCredentials: true },
          // referrerによってplaylistの中身が変わるので無難な物にする
          //beforeSend: function(xhr) {
          //  xhr.setRequestHeader('Referer', 'http://www.nicovideo.jp');
          //},
          headers: {
//            'Referer': 'http://www.nicovideo.jp/',
            'X-Alt-Referer': 'http://www.nicovideo.jp/'
          }
        }).then(
          onLoad,
          function() {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: '動画情報の取得に失敗(watchApi)'
            });
          }
        );
      };

      var load = function(watchId, options) {
        if (isLogin()) {
          loadFromWatchApiData(watchId, options);
        } else {
          loadFromThumbWatch(watchId, options);
        }
      };

      _.assign(videoInfoLoader, {
        load: load
      });

      return videoInfoLoader;
    })();



    var ThumbInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/';
      var MESSAGE_ORIGIN = 'http://ext.nicovideo.jp/';
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
        var postedAt = (new Date(val('first_retrieve'))).toLocaleString();
        var tags = (function() {
          var result = [], t = xml.getElementsByTagName('tag');
          _.each(t, function(tag) {
            result.push(tag.innerHTML);
          });
          return result;
        })();

        var result = {
          status: 'ok',
          v:     watchId,
          id:    val('video_id'),
          title: val('title'),
          description:  val('description'),
          thumbnail:    val('thumbnail_url'),
          movieType:    val('movie_type'),
          lastResBody:  val('last_res_body'),
          duration:     duration,
          postedAt:     postedAt,
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
          type: 'thumbInfoApi',
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

    var VitaApiLoader = (function() {
      var BASE_URL = 'http://api.ce.nicovideo.jp/api/v1/system.unixtime';
      var MESSAGE_ORIGIN = 'http://api.ce.nicovideo.jp/';
      var gate = null;
      var cacheStorage;
      var STORAGE_PREFIX = 'vitaApi_';

      var initialize = function() {
        initialize = _.noop;
        cacheStorage = new CacheStorage(sessionStorage);
        gate = new CrossDomainGate({
          baseUrl: BASE_URL,
          origin: MESSAGE_ORIGIN,
          type: 'vitaApi',
          messager: WindowMessageEmitter
        });
      };

      var saveCache = function(videoInfoList) {
        _.each(videoInfoList, function(videoInfo) {
          var videoId = videoInfo.video.id;
          cacheStorage.setItem(STORAGE_PREFIX + videoId, videoInfo);
        });
      };
      var loadCache = function(watchIds) {
        var result = {};
        _.each(watchIds, function(watchId) {
          var videoInfo = cacheStorage.getItem(STORAGE_PREFIX + watchId);
          if (!videoInfo) { return; }
          result[watchId] = videoInfo;
        });
        return result;
      };

      var load = function(watchIds) {
        initialize();
        watchIds = _.isArray(watchIds) ? watchIds : [watchIds];

        var cacheList = {};
        var noChacheWatchIds = _.filter(watchIds, function(watchId) {
          var cache = cacheStorage.getItem(STORAGE_PREFIX + watchId);
          if (cache) {
            cacheList[watchId] = cache;
            return false;
          }
          return true;
        });

        return new Promise(function(resolve, reject) {
          if (watchIds.length < 1) {
            ZenzaWatch.util.callAsync(function() {
              resolve(cacheList);
            });
            return;
          }

          var url = '/nicoapi/v1/video.array?v=' +
            noChacheWatchIds.join(',') + '&__format=json';

          gate.ajax({
            url: url,
            dataType: 'json'
          }).then(function(json) {
            ZenzaWatch.debug.lastVitaApiResult = json;
            var status = json.nicovideo_video_response['@status'];
            if (status === 'ok') {
              var videoInfoList = json.nicovideo_video_response.video_info || [];
              videoInfoList = _.isArray(videoInfoList) ? videoInfoList : [videoInfoList];
              saveCache(videoInfoList);
              resolve(loadCache(watchIds));
            } else {
              reject({
                status: status,
                message: '取得失敗',
                resp: json
              });
            }
          });
        });
      };

      return {
        load: load
      };
    })();
    ZenzaWatch.api.VitaApiLoader = VitaApiLoader;


    var MessageApiLoader = (function() {
      var VERSION_OLD = '20061206';
      var VERSION     = '20090904';

      var MessageApiLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.assign(MessageApiLoader.prototype, {
        initialize: function() {
          this._threadKeys = {};
        },
        /**
         * 動画の長さに応じて取得するコメント数を変える
         * 本家よりちょっと盛ってる
         */
        getRequestCountByDuration: function(duration) {
          if (duration < 60)  { return 100;}
          if (duration < 240) { return 200;}
          if (duration < 300) { return 400;}
          return 1000;
        },
        getThreadKey: function(threadId) {
          // memo:
          // http://flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          var url =
            'http://flapi.nicovideo.jp/api/getthreadkey?thread=' + threadId +
            '&language_id=0';

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then(function(e) {
              var result = ZenzaWatch.util.parseQuery(e);
              self._threadKeys[threadId] = result;
              resolve(result);
            }, function(result) {
              //PopupMessage.alert('ThreadKeyの取得失敗 ' + threadId);
              reject({
                result: result,
                message: 'ThreadKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        getPostKey: function(threadId, blockNo) {
          // memo:
          // http://flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          var url =
            'http://flapi.nicovideo.jp/api/getpostkey?thread=' + threadId +
            '&block_no=' + blockNo +
            //'&version=1&yugi=' +
            '&language_id=0';

          console.log('getPostkey url: ', url);
          return new Promise(function(resolve, reject) {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then(function(e) {
              resolve(ZenzaWatch.util.parseQuery(e));
            }, function(result) {
              //PopupMessage.alert('ThreadKeyの取得失敗 ' + threadId);
              reject({
                result: result,
                message: 'PostKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        _createThreadXml:
          function(threadId, version, userId, threadKey, force184, duration, userKey) {
          var thread = document.createElement('thread');
          thread.setAttribute('thread', threadId);
          thread.setAttribute('version', version);
          if (duration) {
            var resCount = this.getRequestCountByDuration(duration);
            thread.setAttribute('fork', '1');
            thread.setAttribute('click_revision', '-1');
            thread.setAttribute('res_from', '-' + resCount);
          }
          if (typeof userId !== 'undefined') {
            thread.setAttribute('user_id', userId);
          }
          if (typeof threadKey !== 'undefined') {
            thread.setAttribute('threadkey', threadKey);
          }
          if (typeof force184 !== 'undefined') {
            thread.setAttribute('force_184', force184);
          }
          thread.setAttribute('scores', '1');
          thread.setAttribute('nicoru', '1');
          thread.setAttribute('with_global', '1');

          if (userKey) { thread.setAttribute('userkey', userKey); }
          return thread;
        },
        _createThreadLeavesXml:
          function(threadId, version, userId, threadKey, force184, duration, userKey) {
          var thread_leaves = document.createElement('thread_leaves');
          var resCount = this.getRequestCountByDuration(duration);
          var threadLeavesParam =
            ['0-', (Math.floor(duration / 60) + 1), ':100,', resCount].join('');
          thread_leaves.setAttribute('thread', threadId);
          if (typeof userId !== 'undefined') {
            thread_leaves.setAttribute('user_id', userId);
          }
          if (typeof threadKey !== 'undefined') {
            thread_leaves.setAttribute('threadkey', threadKey);
          }
          if (typeof force184 !== 'undefined') {
            thread_leaves.setAttribute('force_184', force184);
          }
          thread_leaves.setAttribute('scores', '1');
          thread_leaves.setAttribute('nicoru', '1');
          if (userKey) { thread_leaves.setAttribute('userkey', userKey); }

          thread_leaves.innerHTML = threadLeavesParam;

          return thread_leaves;
        },

        buildPacket: function(threadId, duration, userId, threadKey, force184, optionalThreadId, userKey)
        {
          var span = document.createElement('span');
          var packet = document.createElement('packet');

//          if (typeof optionalThreadId !== 'undefined') {
//            packet.appendChild(
//              this._createThreadXml(optionalThreadId, VERSION, userId, threadKey, force184)
//            );
//            packet.appendChild(
//              this._createThreadLeavesXml(optionalThreadId, VERSION, userId, threadKey, force184, duration)
//            );
//          }

          packet.appendChild(
            this._createThreadXml(threadId, VERSION_OLD, userId, threadKey, force184, duration)
          );
          packet.appendChild(
            this._createThreadXml(threadId, VERSION, userId, threadKey, force184, null, userKey)
          );
          packet.appendChild(
            this._createThreadLeavesXml(threadId, VERSION, userId, threadKey, force184, duration, userKey)
          );

          span.appendChild(packet);
          var packetXml = span.innerHTML;

          return packetXml;
        },
        _post: function(server, xml) {
          // マイページのjQueryが古いためかおかしな挙動をするのでPromiseで囲う
          var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
          return new Promise(function(resolve, reject) {
            ajax({
              url: server,
              data: xml,
              timeout: 60000,
              type: 'POST',
              contentType: isNmsg ? 'text/xml' : 'text/plain',
              dataType: 'xml',
    //          xhrFields: { withCredentials: true },
              crossDomain: true,
              cache: false
            }).then(function(result) {
              //console.log('post success: ', result);
              resolve(result);
            }, function(result) {
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
          // http://favstar.fm/users/koizuka/status/23032783744012288
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
          return new Promise(function(resolve, reject) {
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
        _load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId, userKey) {
          var packet, self = this;
          if (isNeedKey) {
            return this.getThreadKey(threadId).then(function(info) {
              console.log('threadkey: ', info);
              packet = self.buildPacket(
                threadId,
                duration,
                userId,
                info.threadkey,
                info.force_184,
                optionalThreadId
              );
              console.log('post xml...', server, packet);
              //get(server, threadId, duration, info.threadkey, info.force_184);
              return self._post(server, packet, threadId);
            });
          } else {
            packet = this.buildPacket(
              threadId,
              duration,
              userId,
              undefined, //  info.threadkey,
              undefined, //  info.force_184,
              optionalThreadId,
              userKey
            );
            console.log('post xml...', server, packet);
            return this._post(server, packet, threadId);
          }
        },
        load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId, userKey) {

          var timeKey = 'loadComment server: ' + server + ' thread: ' + threadId;
          window.console.time(timeKey);
          var self = this;

          return new Promise(function(resolve, reject) {
            self._load(
              server,
              threadId,
              duration,
              userId,
              isNeedKey,
              optionalThreadId,
              userKey
            ).then(
              function(result) {
                window.console.timeEnd(timeKey);
                ZenzaWatch.debug.lastMessageServerResult = result;

                var lastRes;
                var resultCode = null, thread, xml, ticket, lastRes = 0;
                try {
                  xml = result.documentElement;
                  var threads = xml.getElementsByTagName('thread');

                  thread = threads[0];
                  _.each(threads, function(t) {
                    var tk = t.getAttribute('ticket');
                    if (tk && tk !== '0') { ticket = tk; }
                    var lr = t.getAttribute('last_res');
                    if (!isNaN(lr)) { lastRes = Math.max(lastRes, lr); }
                  });

                  resultCode = thread.getAttribute('resultcode');
                } catch (e) {
                  console.error(e);
                }

                if (resultCode !== '0') {
                  reject({
                    message: 'コメント取得失敗' + resultCode
                  });
                  return;
                }

                var threadInfo = {
                  server:     server,
                  userId:     userId,
                  resultCode: thread.getAttribute('resultcode'),
                  thread:     thread.getAttribute('thread'),
                  serverTime: thread.getAttribute('server_time'),
                  lastRes:    lastRes,
                  blockNo:    Math.floor((lastRes + 1) / 100),
                  ticket:     ticket,
                  revision:   thread.getAttribute('revision')
                };

                if (self._threadKeys[threadId]) {
                  threadInfo.threadKey = self._threadKeys[threadId].threadkey;
                  threadInfo.force184  = self._threadKeys[threadId].force_184;
                }

                window.console.log('threadInfo: ', threadInfo);
                resolve({
                  resultCode: parseInt(resultCode, 10),
                  threadInfo: threadInfo,
                  xml: xml
                });
              },
              function(e) {
                window.console.timeEnd(timeKey);
                window.console.error('loadComment fail: ', e);
                reject({
                  message: 'コメントサーバーの通信失敗: ' + server
                });
              }
            );
          });
        },
        _postChat: function(threadInfo, postKey, text, cmd, vpos) {
          var self = this;
          var div = document.createElement('div');
          var chat = document.createElement('chat');
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
          return self._post(threadInfo.server, xml).then(function(result) {
            var status = null, chat_result, no = 0, blockNo = 0;
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
        postChat: function(threadInfo, text, cmd, vpos) {
          var self = this;
          return this.getPostKey(threadInfo.thread, threadInfo.blockNo)
            .then(function(result) {
            return self._postChat(threadInfo, result.postkey, text, cmd, vpos);
          });
        }
      });

      return MessageApiLoader;
    })();
    ZenzaWatch.api.MessageApiLoader = MessageApiLoader;

    var MylistApiLoader = (function() {
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
            cacheStorage = new CacheStorage(localStorage);
          }
          if (!token) {
            token = cacheStorage.getItem('csrfToken');
            if (token) { console.log('cached token exists', token); }
          }
        },
        getDeflistItems: function() {
          var url = 'http://www.nicovideo.jp/api/deflist/list';
          var cacheKey = 'deflistItems';

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); }, this);
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || !result.mylistitem) {
                reject({
                  result: result,
                  message: 'とりあえずマイリストの取得失敗(1)'
                });
                return;
              }

              var data = result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              resolve(data);
            }, function(err) {
              reject({
                result: err,
                message: 'とりあえずマイリストの取得失敗(2)'
              });
            });
          });
        },
        getMylistItems: function(groupId) {
          var url = 'http://www.nicovideo.jp/api/mylist/list?group_id=' + groupId;
          var cacheKey = 'mylistItems: ' + groupId;

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); }, this);
              return;
            }

            return ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || !result.mylistitem) {
                return reject({
                  result: result,
                  message: 'マイリストの取得失敗(1)'
                });
              }

              var data = result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              return resolve(data);
            }, function(err) {
              this.reject({
                result: err,
                message: 'マイリストの取得失敗(2)'
              });
            });
          });
        },
        getMylistList: function() {
          var url = 'http://www.nicovideo.jp/api/mylistgroup/list';
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
              var item = items[i], wid = item.item_data.watch_id;
              if (wid === watchId) {
                return Promise.resolve(item);
              }
            }
            return Promise.reject();
          });
        },
        removeDeflistItem: function(watchId) {
          return this.findDeflistItemByWatchId(watchId).then(function(item) {
            var url = 'http://www.nicovideo.jp/api/deflist/delete';
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
        _addDeflistItem: function(watchId, description, isRetry) {
          var url = 'http://www.nicovideo.jp/api/deflist/add';
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
              self.removeDeflistItem(watchId).then(function() {
                self._addDeflistItem(watchId, description, true).then(function(result) {
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
          var url = 'http://www.nicovideo.jp/api/mylist/add';
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
              ZenzaWatch.util.callAsync(function() {
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
        loaderFrame.src  = this._baseUrl;
        loaderFrame.className = 'xDomainLoaderFrame ' + this.type;
        document.body.appendChild(loaderFrame);

        this._loaderFrame = loaderFrame;
        this._loaderWindow = loaderFrame.contentWindow;
        this._messager.addKnownSource(this._loaderWindow);
      },
      _onMessage: function(data, type) {
        if (type !== this._type) { return; }
        var info      = data.message;
        var token     = info.token;
        var sessionId = info.sessionId;
        var status    = info.status;
        var command   = info.command || 'loadUrl';
        var session   = this._sessions[sessionId];

        if (status === 'initialized') {
          window.console.log(type + ' initialized');
          this._initializeStatus = 'done';
          this._sessions.initial.resolve();
          this.emitAsync('initialize', {status: 'ok'});
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
      configBridge: function(config) {
        var self = this;
        var keys = config.getKeys();
        self._config = config;

        return new Promise(function(resolve) {
          self._configBridgeResolve = resolve;
          self._postMessage({
            url: '',
            command: 'dumpConfig',
            keys: keys
          });
        });
      },
      _postMessage: function(message, needPromise) {
        var self = this;
        return new Promise(function(resolve, reject) {
          message.sessionId = self._type + '_' + Math.random();
          message.token = TOKEN;
          if (needPromise) {
            self._sessions[message.sessionId] = {
              resolve: resolve,
              reject: reject
            };
          }

          return self._initializeFrame().then(function() {
            try {
              self._loaderWindow.postMessage(
                JSON.stringify(message),
                self._origin
              );
            } catch (e) {
              console.log('%cException!', 'background: red;', e);
            }
          });
        });
      },
      _onDumpConfig: function(configData) {
        //window.console.log('_onDumpConfig', configData);
        var self = this;
        _.each(Object.keys(configData), function(key) {
          //window.console.log('config %s: %s', key, configData[key]);
          self._config.setValue(key, configData[key]);
        });

        this._config.on('update', function(key, value) {
          if (key === 'autoCloseFullScreen') { return; }

          self._postMessage({
            command: 'saveConfig',
            key: key,
            value: value
          });
        });
        self._configBridgeResolve();
      },
      pushHistory: function(path) {
        var self = this;
        var sessionId = self._type +'_' + Math.random();
        self._initializeFrame().then(function() {
          try {
            self._loaderWindow.postMessage(JSON.stringify({
              sessionId: sessionId,
              command: 'pushHistory',
              path: path
            }),
            self._origin);
          } catch (e) {
            console.log('%cException!', 'background: red;', e);
          }
        });
      },
    });

    if (location.host !== 'www.nicovideo.jp') {
      NicoVideoApi = new CrossDomainGate({
        baseUrl: 'http://www.nicovideo.jp/favicon.ico',
        origin: 'http://www.nicovideo.jp/',
        type: 'nicovideoApi',
        messager: WindowMessageEmitter
      });
    }




  /**
   * VideoPlayer + CommentPlayer = NicoVideoPlayer
   *
   * とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
   *
   */
  var NicoVideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.assign(NicoVideoPlayer.prototype, {
    initialize: function(params) {
      var conf = this._playerConfig = params.playerConfig;

      this._fullScreenNode = params.fullScreenNode;

      this._videoPlayer = new VideoPlayer({
        volume:       conf.getValue('volume'),
        loop:         conf.getValue('loop'),
        mute:         conf.getValue('mute'),
        autoPlay:     conf.getValue('autoPlay'),
        playbackRate: conf.getValue('playbackRate'),
        debug:        conf.getValue('debug')
      });

      this._commentPlayer = new NicoCommentPlayer({
        offScreenLayer: params.offScreenLayer,
        enableFilter:   params.enableFilter,
        wordFilter:  params.wordFilter,
        userIdFilter:   params.userIdFilter,
        commandFilter:  params.commandFilter,
        showComment:    conf.getValue('showComment'),
        debug:          conf.getValue('debug'),
        playbackRate:   conf.getValue('playbackRate'),
        sharedNgLevel:  conf.getValue('sharedNgLevel')
      });

      this._contextMenu = new VideoContextMenu({
        player: this,
        playerConfig: conf
      });

      if (params.node) {
        this.appendTo(params.node);
      }

      this._initializeEvents();

      this._beginTimer();

      var emitter = new AsyncEmitter();
      this.on        = _.bind(emitter.on,        emitter);
      this.emit      = _.bind(emitter.emit,      emitter);
      this.emitAsync = _.bind(emitter.emitAsync, emitter);

      ZenzaWatch.debug.nicoVideoPlayer = this;
    },
    _beginTimer: function() {
      this._stopTimer();
      this._videoWatchTimer =
        window.setInterval(
          _.bind(this._onTimer, this), 100);
    },
    _stopTimer: function() {
      if (!this._videoWatchTimer) { return; }
      window.clearInterval(this._videoWatchTimer);
      this._videoWatchTimer = null;
    },
    _initializeEvents: function() {
      this._videoPlayer.on('volumeChange', _.bind(this._onVolumeChange, this));
      this._videoPlayer.on('dblclick', _.bind(this.toggleFullScreen, this));
      this._videoPlayer.on('aspectRatioFix', _.bind(this._onAspectRatioFix, this));
      this._videoPlayer.on('play',    _.bind(this._onPlay, this));
      this._videoPlayer.on('playing', _.bind(this._onPlaying, this));
      this._videoPlayer.on('stalled', _.bind(this._onStalled, this));
      this._videoPlayer.on('progress', _.bind(this._onProgress, this));
      this._videoPlayer.on('pause',   _.bind(this._onPause, this));
      this._videoPlayer.on('ended', _.bind(this._onEnded, this));
      this._videoPlayer.on('loadedMetaData', _.bind(this._onLoadedMetaData, this));
      this._videoPlayer.on('canPlay', _.bind(this._onVideoCanPlay, this));
      this._videoPlayer.on('durationChange', _.bind(this._onDurationChange, this));

      // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
      this._videoPlayer.on('mouseWheel',
        _.throttle(_.bind(this._onMouseWheel, this), 50));

      this._videoPlayer.on('abort', _.bind(this._onAbort, this));
      this._videoPlayer.on('error', _.bind(this._onError, this));

      this._videoPlayer.on('click', _.bind(this._onClick, this));
      this._videoPlayer.on('contextMenu', _.bind(this._onContextMenu, this));

      this._commentPlayer.on('parsed', _.bind(this._onCommentParsed, this));
      this._commentPlayer.on('change', _.bind(this._onCommentChange, this));
      this._commentPlayer.on('filterChange', _.bind(this._onCommentFilterChange, this));
      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
    },
    _onVolumeChange: function(vol, mute) {
      this._playerConfig.setValue('volume', vol);
      this._playerConfig.setValue('mute', mute);
      this.emit('volumeChange', vol, mute);
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'loop':
          this._videoPlayer.setIsLoop(value);
          break;
        case 'playbackRate':
          this._videoPlayer.setPlaybackRate(value);
          this._commentPlayer.setPlaybackRate(value);
          break;
        case 'autoPlay':
          this._videoPlayer.setIsAutoPlay(value);
          break;
        case 'showComment':
          if (value) {
            this._commentPlayer.show();
          } else {
            this._commentPlayer.hide();
          }
          break;
        case 'mute':
          this._videoPlayer.setMute(value);
          break;
        case 'sharedNgLevel':
          this.setSharedNgLevel(value);
          break;
        case 'wordFilter':
          this.setWordFilterList(value);
          break;
        case 'userIdFilter':
          this.setUserIdFilterList(value);
          break;
        case 'commandFilter':
          this.setCommandFilterList(value);
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
    _onError: function() {
      this.emit('error');
    },
    _onAbort: function() {
      this.emit('abort');
    },
    _onClick: function() {
      this._contextMenu.hide();
    },
    _onContextMenu: function(e) {
      this._contextMenu.show(e.offsetX, e.offsetY);
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
      this._videoPlayer.setSrc(url);
      this._isEnded = false;
    },
    setThumbnail: function(url) {
      this._videoPlayer.setThumbnail(url);
    },
    play: function() {
      this._videoPlayer.play();
    },
    pause: function() {
      this._videoPlayer.pause();
    },
    togglePlay: function() {
      this._videoPlayer.togglePlay();
    },
    setPlaybackRate: function(playbackRate) {
      playbackRate = Math.max(0, Math.min(playbackRate, 10));
      this._videoPlayer.setPlaybackRate(playbackRate);
      this._commentPlayer.setPlaybackRate(playbackRate);
    },
    setCurrentTime: function(t) {
      this._videoPlayer.setCurrentTime(Math.max(0, t));
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
    setComment: function(xmlText) {
      this._commentPlayer.setComment(xmlText);
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
      this._videoPlayer.appendTo($node);
      this._commentPlayer.appendTo($node);
      this._contextMenu.appendTo($node);
    },
    close: function() {
      this._videoPlayer.close();
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
    }
  });

  var VideoInfoModel = function() { this.initialize.apply(this, arguments); };
  _.assign(VideoInfoModel.prototype, {
    initialize: function(info) {
      this._rawData = info;
      this._watchApiData = info.watchApiData;
      this._videoDetail  = info.watchApiData.videoDetail;
      this._flashvars    = info.watchApiData.flashvars;   // flashに渡す情報
      this._viewerInfo   = info.viewerInfo;               // 閲覧者(＝おまいら)の情報
      this._flvInfo      = info.flvInfo;
      this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画

      if (!ZenzaWatch.debug.videoInfo) { ZenzaWatch.debug.videoInfo = {}; }
      ZenzaWatch.debug.videoInfo[this.getWatchId()] = this;
    },
    getTitle: function() {
      return this._videoDetail.title_original || this._videoDetail.title;
    },
    getDescription: function() {
      return this._videoDetail.description || '';
    },
    /**
     * マイリスト等がリンクになっていない物
     */
    getDescriptionOriginal: function() {
      return this._videoDetail.description_original;
    },
    getPostedAt: function() {
      return this._videoDetail.postedAt;
    },
    getThumbnail: function() {
      return this._videoDetail.thumbnail;
    },
    /**
     * 大きいサムネがあればそっちを返す
     */
    getBetterThumbnail: function() {
      return this._rawData.thumbnail;
    },
    getVideoUrl: function() {
      return this._flvInfo.url;
    },
    isEconomy: function() {
      return this.getVideoUrl().match(/low$/) ? true : false;
    },
    getMessageServerInfo: function() {
      var f = this._flvInfo;
      return {
        url: f.ms,
        usl2: f.ms_sub,
        needsKey: f.needs_key === '1',
        threadId: f.thread_id,
        optionalThreadId: f.optional_thread_id,
        duration: parseInt(f.l, 10)
      };
    },
    getTagList: function() {
      return this._videoDetail.tagList;
    },
    getVideoId: function() { // sm12345
      return this._videoDetail.id;
    },
    getWatchId: function() { // sm12345だったりスレッドIDだったり
      return this._videoDetail.v;
    },
    getThreadId: function() { // watchIdと同一とは限らない
      return this._videoDetail.thread_id;
    },
    getVideoSize: function() {
      return {
        width:  this._videoDetail.width,
        height: this._videoDetail.height
      };
    },
    getDuration: function() {
      return this._videoDetail.length;
    },
    getCount: function() {
      var vd = this._videoDetail;
      return {
        comment: vd.commentCount,
        mylist: vd.mylistCount,
        view: vd.viewCount
      };
    },
    isChannel: function() {
      return !!this._videoDetail.channelId;
    },
    isMymemory: function() {
      return !!this._videoDetail.isMymemory;
    },
    isCommunityVideo: function() {
      return !!(!this.isChannel() && this._videoDetail.communityId);
    },
    hasParentVideo: function() {
      return !!(this._videoDetail.commons_tree_exists);
    },


    /**
     * 投稿者の情報
     * チャンネル動画かどうかで分岐
    */
    getOwnerInfo: function() {
      var ownerInfo;
      if (this.isChannel()) {
        var c = this._watchApiData.channelInfo || {};
        ownerInfo = {
          icon: c.icon_url || 'http://res.nimg.jp/img/user/thumb/blank.jpg',
          url: 'http://ch.nicovideo.jp/ch' + c.id,
          id: c.id,
          name: c.name,
          favorite: c.is_favorited === 1, // こっちは01で
          type: 'channel'
        };
      } else {
        // 退会しているユーザーだと空になっている
        var u = this._watchApiData.uploaderInfo || {};
        ownerInfo = {
          icon: u.icon_url || 'http://res.nimg.jp/img/user/thumb/blank.jpg',
          url:  u.id ? ('http://www.nicovideo.jp/user/' + u.id) : '#',
          id:   u.id || '',
          name: u.nickname || '(非公開ユーザー)',
          favorite: !!u.is_favorited, // こっちはbooleanという
          type: 'user'
        };
      }

      return ownerInfo;
    },
    getRelatedVideoItems: function() {
      return this._relatedVideo.playlist || [];
    }
  });


  var VideoContextMenu = function() { this.initialize.apply(this, arguments); };
  VideoContextMenu.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaPlayerContextMenu {
      position: fixed;
      background: #fff;
      overflow: visible;
      padding: 8px;
      border: 1px outset #333;
      opacity: 0.8;
      box-shadow: 2px 2px 4px #000;
      transition: opacity 0.3s ease;
      z-index: 150000;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .fullScreen .zenzaPlayerContextMenu {
      position: absolute;
    }

    .zenzaPlayerContextMenu:not(.show) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
    }

    .zenzaPlayerContextMenu ul {
      padding: 0;
    }

    .zenzaPlayerContextMenu ul li {
      position: relative;
      line-height: 120%;
      margin: 2px 8px;
      overflow-y: visible;
      white-space: nowrap;
      cursor: pointer;
      padding: 2px 8px;
      list-style-type: none;
      float: inherit;
    }
    .zenzaPlayerContextMenu ul li.selected {
    }
    .zenzaPlayerContextMenu ul li.selected:before {
      content: '✔';
      left: -10px;
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
      {*mix-blend-mode: luminosity;*}
    }
    .zenzaPlayerContextMenu .listInner {
    }
  */});

  VideoContextMenu.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaPlayerContextMenu">
      <div class="listInner">
        <ul>
          <li data-command="togglePlay">停止/再開</li>
          <li data-command="restart">先頭に戻る</li>
          <!--
          <li class="loop"        data-command="loop">リピート再生</li>
          <li class="showComment" data-command="showComment">コメントを表示</li>
          <li class="autoPlay"    data-command="autoPlay">自動再生</li>
          -->

          <hr class="separator">

          <li class="seek" data-command="seek" data-param="-10">10秒戻る</li>
          <li class="seek" data-command="seek" data-param="10" >10秒進む</li>
          <li class="seek" data-command="seek" data-param="-30">30秒戻る</li>
          <li class="seek" data-command="seek" data-param="30" >30秒進む</li>

          <hr class="separator">

          <li class="playbackRate" data-command="playbackRate" data-param="0.1">コマ送り(0.1x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="0.3">超スロー(0.3x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="0.5">スロー再生(0.5x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="1.0">標準速度</li>
          <li class="playbackRate" data-command="playbackRate" data-param="1.2">高速(1.2x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="1.4">高速(1.4x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="1.5">高速(1.5x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="2">倍速(2x)</li>
          <!--
          <li class="playbackRate" data-command="playbackRate" data-param="4">4倍速(4x)</li>
          <li class="playbackRate" data-command="playbackRate" data-param="10.0">最高速(10x)</li>
          -->
          <hr class="separator">
          <li class="debug"        data-command="debug">デバッグ</li>
          <li class="mymemory"     data-command="mymemory">コメントの保存</a></li>
        </ul>
      </div>
    </div>
  */});


  _.assign(VideoContextMenu.prototype, {
    initialize: function(params) {
      this._playerConfig = params.playerConfig;
      this._player = params.player;
      this._initializeDom(params);

      //this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
    },
    _initializeDom: function(params) {
      ZenzaWatch.util.addStyle(VideoContextMenu.__css__);
      var $view = this._$view = $(VideoContextMenu.__tpl__);
      $view.on('click', _.bind(this._onMouseDown, this));
    },
    _onMouseDown: function(e) {
      var target = e.target, $target = $(target.closest('li'));
      var command = $target.attr('data-command');
      var param = $target.attr('data-param');
      this.hide();
      e.preventDefault();
      e.stopPropagation();
      var player = this._player;
      var playerConfig = this._playerConfig;
      switch (command) {
        case 'togglePlay':
          player.togglePlay();
          break;
        case 'showComment':
        case 'loop':
        case 'autoPlay':
        case 'debug':
          this._playerConfig.setValue(command, !this._playerConfig.getValue(command));
          break;
        case 'restart':
          player.setCurrentTime(0);
          break;
        case 'seek':
          var ct = player.getCurrentTime();
          player.setCurrentTime(ct + parseInt(param, 10));
          break;
        case 'playbackRate':
          playerConfig.setValue('playbackRate', parseFloat(param, 10));
          break;
        case 'mymemory':
          this._createMymemory();
          break;
      }
    },
    _onBodyClick: function() {
      this.hide();
    },
    _onBeforeShow: function() {
      // チェックボックスなどを反映させるならココ
      var pr = this._playerConfig.getValue('playbackRate');
      this._$view.find('.selected').removeClass('selected');
      this._$view.find('.playbackRate').each(function(i, elm) {
        var $elm = $(elm);
        var p = parseFloat($elm.attr('data-param'), 10);
        if (p == pr) {
          $elm.addClass('selected');
        }
      });
      this._$view.find('.showComment')
        .toggleClass('selected', this._playerConfig.getValue('showComment'));
      this._$view.find('.loop')
        .toggleClass('selected', this._playerConfig.getValue('loop'));
      this._$view.find('.autoPlay')
        .toggleClass('selected', this._playerConfig.getValue('autoPlay'));
      this._$view.find('.debug')
        .toggleClass('selected', this._playerConfig.getValue('debug'));
    },
    appendTo: function($node) {
      this._$node = $node;
      $node.append(this._$view);
    },
    show: function(x, y) {
      $('body').on('click.ZenzaMenuOnBodyClick', _.bind(this._onBodyClick, this));
      var $view = this._$view, $window = $(window);

      this._onBeforeShow(x, y);

      $view.css({
        left: Math.max(0, Math.min(x, $window.innerWidth()  - $view.outerWidth())),
        top:  Math.max(0, Math.min(y, $window.innerHeight() - $view.outerHeight())),
      });
      this._$view.addClass('show');
    },
    hide: function() {
      $('body').off('click.ZenzaMenuOnBodyClick', this._onBodyClick);
      this._$view.css({top: '', left: ''}).removeClass('show');
    },
    _createMymemory: function() {
      var html = this._player.getMymemory();
      var videoInfo = this._player.getVideoInfo();
      var title =
        videoInfo.getWatchId() + ' - ' +
        videoInfo.getTitle(); // エスケープされてる
      var info = [
        '<div>',
          '<h2>', videoInfo.getTitle(), '</h2>',
          '<a href="http://www.nicovideo.jp/watch/', videoInfo.getWatchId(), '?from=', Math.floor(this._player.getCurrentTime()),'">元動画</a><br>',
          '作成環境: ', navigator.userAgent, '<br>',
          '作成日: ', (new Date).toLocaleString(), '<br>',
          '<button ',
          '  onclick="document.body.className = document.body.className !== \'debug\' ? \'debug\' : \'\';return false;">デバッグON/OFF </button>',
        '</div>'
      ].join('');
      html = html
        .replace(/<title>(.*?)<\/title>/, '<title>' + title + '</title>')
        .replace(/(<body.*?>)/, '$1' + info);

      var blob = new Blob([html], { 'type': 'text/html' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('download', title + '.html');
      a.setAttribute('target', '_blank');
      a.setAttribute('href', url);
      a.dispatchEvent(new CustomEvent('click'));
    }
  });


  /**
   *  Video要素をラップした物
   *  操作パネル等を自前で用意したいが、まだ手が回らない。
   *  中途半端にjQuery使っててきもい
   *
   *  いずれは同じインターフェースのflash版も作って、swf/flv等の再生もサポートしたい。
   */
  var VideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoPlayer.prototype, AsyncEmitter.prototype);
  _.assign(VideoPlayer.prototype, {
    initialize: function(params) {
      var volume =
        params.hasOwnProperty('volume') ? parseFloat(params.volume) : 0.5;
      var playbackRate = this._playbackRate =
        params.hasOwnProperty('playbackRate') ? parseFloat(params.playbackRate) : 1.0;

      var options = {
        autoPlay: !!params.autoPlay,
        autoBuffer: true,
        preload: 'auto',
        controls: !true,
        loop: !!params.loop,
        mute: !!params.mute
      };

      console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
      this._id = 'video' + Math.floor(Math.random() * 100000);
      this._$video = $('<video class="videoPlayer nico" preload="auto" />')
        .addClass(this._id)
        .attr(options);
      this._video = this._$video[0];

      
      //this._$subVideo =
      //  $('<video class="subVideoPlayer nico" style="position: fixed; left: -9999px; width: 1px; height: 1px;" preload="auto" volume="0" autoplay="false" controls="false"/>')
      //  .addClass(this._id);
      //this._subVideo = this._$subVideo[0];

      this._isPlaying = false;
      this._canPlay = false;

      this.setVolume(volume);
      this.setMute(params.mute);
      this.setPlaybackRate(playbackRate);

      this._initializeEvents();

      ZenzaWatch.debug.video = this._video;
    },
    _reset: function() {
      this._$video.removeClass('play pause abort error');
      this._isPlaying = false;
      this._canPlay = false;
    },
    _initializeEvents: function() {
      this._$video
        .on('canplay',        _.bind(this._onCanPlay, this))
        .on('canplaythrough', _.bind(this._onCanPlayThrough, this))
        .on('loadstart',      _.bind(this._onLoadStart, this))
        .on('loadeddata',     _.bind(this._onLoadedData, this))
        .on('loadedmetadata', _.bind(this._onLoadedMetaData, this))
        .on('ended',          _.bind(this._onEnded, this))
        .on('emptied',        _.bind(this._onEmptied, this))
        .on('stalled',        _.bind(this._onStalled, this))
        .on('suspend',        _.bind(this._onSuspend, this))
        .on('waiting',        _.bind(this._onWaiting, this))
        .on('progress',       _.bind(this._onProgress, this))
        .on('durationchange', _.bind(this._onDurationChange, this))
        .on('resize',         _.bind(this._onResize, this))
        .on('abort',          _.bind(this._onAbort, this))
        .on('error',          _.bind(this._onError, this))

        .on('pause',          _.bind(this._onPause, this))
        .on('play',           _.bind(this._onPlay, this))
        .on('playing',        _.bind(this._onPlaying, this))
        .on('seeking',        _.bind(this._onSeeking, this))
        .on('seeked',         _.bind(this._onSeeked, this))
        .on('volumechange',   _.bind(this._onVolumeChange, this))


        .on('click',          _.bind(this._onClick, this))
        .on('dblclick',       _.bind(this._onDoubleClick, this))
        .on('wheel',          _.bind(this._onMouseWheel, this))
        .on('contextmenu',    _.bind(this._onContextMenu, this))
        ;
    },
    _onCanPlay: function() {
      console.log('%c_onCanPlay:', 'background: cyan; color: blue;', arguments);

      this.setPlaybackRate(this.getPlaybackRate());
      // リピート時にも飛んでくるっぽいので初回だけにする
      if (!this._canPlay) {
        this._canPlay = true;
        this._$video.removeClass('loading');
        this.emit('canPlay');
        this.emit('aspectRatioFix',
          this._video.videoHeight / Math.max(1, this._video.videoWidth));

        //var subVideo = this._subVideo;
        //subVideo.play();
        //window.setTimeout(function() {
        //  subVideo.pause();
        //}, 500);
      }
    },
    _onCanPlayThrough: function() {
      console.log('%c_onCanPlayThrough:', 'background: cyan;', arguments);
      this.emit('canPlayThrough');
    },
    _onLoadStart: function() {
      console.log('%c_onLoadStart:', 'background: cyan;', arguments);
      this.emit('loadStart');
    },
    _onLoadedData: function() {
      console.log('%c_onLoadedData:', 'background: cyan;', arguments);
      this.emit('loadedData');
    },
    _onLoadedMetaData: function() {
      console.log('%c_onLoadedMetaData:', 'background: cyan;', arguments);
      this.emit('loadedMetaData');
    },
    _onEnded: function() {
      console.log('%c_onEnded:', 'background: cyan;', arguments);
      this.emit('ended');
    },
    _onEmptied: function() {
      console.log('%c_onEmptied:', 'background: cyan;', arguments);
      this.emit('emptied');
    },
    _onStalled: function() {
      console.log('%c_onStalled:', 'background: cyan;', arguments);
      this.emit('stalled');
    },
    _onSuspend: function() {
      ///console.log('%c_onSuspend:', 'background: cyan;', arguments);
      this.emit('suspend');
    },
    _onWaiting: function() {
      console.log('%c_onWaiting:', 'background: cyan;', arguments);
      this.emit('waiting');
    },
    _onProgress: function() {
      this.emit('progress', this._video.buffered, this._video.currentTime);
    },
    _onDurationChange: function() {
      console.log('%c_onDurationChange:', 'background: cyan;', arguments);
      this.emit('durationChange', this._video.duration);
    },
    _onResize: function() {
      console.log('%c_onResize:', 'background: cyan;', arguments);
      this.emit('resize');
    },
    _onAbort: function() {
      window.console.warn('%c_onAbort:', 'background: cyan; color: red;', arguments);
      this._$video.addClass('abort');
      this.emit('abort');
    },
    _onError: function() {
      window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
      this._$video.addClass('error');
      this._canPlay = false;
      this.emit('error');
    },
    _onPause: function() {
      console.log('%c_onPause:', 'background: cyan;', arguments);
      this._$video.removeClass('play');

      this._isPlaying = false;
      this.emit('pause');
    },
    _onPlay: function() {
      console.log('%c_onPlay:', 'background: cyan;', arguments);
      this._$video.addClass('play');
      this._isPlaying = true;

      //this._subVideo.pause();
      this.emit('play');
    },
    // ↓↑の違いがよくわかってない
    _onPlaying: function() {
      console.log('%c_onPlaying:', 'background: cyan;', arguments);
      this._isPlaying = true;
      this.emit('playing');
    },
    _onSeeking: function() {
      console.log('%c_onSeeking:', 'background: cyan;', arguments);
      this.emit('seeking', this._video.currentTime);
    },
    _onSeeked: function() {
      console.log('%c_onSeeked:', 'background: cyan;', arguments);

      // なぜかシークのたびにリセットされるので再設定 (Chromeだけ？)
      this.setPlaybackRate(this.getPlaybackRate());

      this.emit('seeked', this._video.currentTime);
    },
    _onVolumeChange: function() {
      console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
      this.emit('volumeChange', this.getVolume(), this.isMuted());
    },
    _onClick: function(e) {
      this.emit('click', e);
    },
    _onDoubleClick: function(e) {
      console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
      // Firefoxはここに関係なくプレイヤー自体がフルスクリーンになってしまう。
      // 手前に透明なレイヤーを被せるしかない？
      e.preventDefault();
      e.stopPropagation();
      this.emit('dblclick');
    },
    _onMouseWheel: function(e) {
      //console.log('%c_onMouseWheel:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      var delta = - parseInt(e.originalEvent.deltaY, 10);
      //window.console.log('wheel', e, delta);
      if (delta !== 0) {
        this.emit('mouseWheel', e, delta);
      }
    },
    _onContextMenu: function(e) {
      //console.log('%c_onContextMenu:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      this.emit('contextMenu', e);
    },
    canPlay: function() {
      return !!this._canPlay;
    },
    play: function() {
      this._video.play();
    },
    pause: function() {
      this._video.pause();
    },
    isPlaying: function() {
      return !!this._isPlaying;
    },
    setThumbnail: function(url) {
      console.log('%csetThumbnail: %s', 'background: cyan;', url);

      this._thumbnail = url;
      this._$video.attr('poster', url);
      //this.emit('setThumbnail', url);
    },
    setSrc: function(url) {
      console.log('%csetSc: %s', 'background: cyan;', url);

      this._reset();

      this._src = url;
      this._$video.attr('src', url);
      //this._$subVideo.attr('src', url);
      this._canPlay = false;
      //this.emit('setSrc', url);
      this._$video.addClass('loading');
    },
    setVolume: function(vol) {
      vol = Math.max(Math.min(1, vol), 0);
      //console.log('setVolume', vol);
      this._video.volume = vol;
    },
    getVolume: function() {
      return parseFloat(this._video.volume);
    },
    setMute: function(v) {
      v = !!v;
      if (this._video.muted !== v) {
        this._video.muted = v;
      }
    },
    isMuted: function() {
      return this._video.muted;
    },
    getCurrentTime: function() {
      if (!this._canPlay) { return 0; }
      return this._video.currentTime;
    },
    setCurrentTime: function(sec) {
      var cur = this._video.currentTime;
      if (cur !== sec) {
        this._video.currentTime = sec;
        this.emit('seek', this._video.currentTime);
      }
    },
    getDuration: function() {
      return this._video.duration;
    },
    togglePlay: function() {
      if (this._isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },
    getVpos: function() {
      return this._video.currentTime * 100;
    },
    setVpos: function(vpos) {
      this._video.currentTime = vpos / 100;
    },
    getIsLoop: function() {
      return !!this._video.loop;
    },
    setIsLoop: function(v) {
      this._video.loop = !!v;
    },
    setPlaybackRate: function(v) {
      console.log('setPlaybackRate', v);
      // たまにリセットされたり反映されなかったりする？
      this._playbackRate = v;
      var video = this._video;
      video.playbackRate = 1;
      window.setTimeout(function() { video.playbackRate = parseFloat(v); }, 100);
    },
    getPlaybackRate: function() {
      return this._playbackRate; //parseFloat(this._video.playbackRate) || 1.0;
    },
    getBufferedRange: function() {
      return this._video.buffered;
    },
    setIsAutoPlay: function(v) {
      this._video.autoplay = v;
    },
    getIsAutoPlay: function() {
      return this._video.autoPlay;
    },
    appendTo: function($node) {
      $node.append(this._$video);
      //$node.append(this._$subVideo);
      var videos = document.getElementsByClassName(this._id);
      this._video    = videos[0];

      //this._subVideo = videos[1];
      //this._subVideo.muted = true;
      //this._subVideo.volume = 0;
      //this._subVideo.autoplay = false;
    },
    close: function() {
      this._video.pause();

      this._video.removeAttribute('src');
      this._video.removeAttribute('poster');

      //this._subVideo.removeAttribute('src');
    }
  });





  var VideoControlBar = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoControlBar.prototype, AsyncEmitter.prototype);
  VideoControlBar.BASE_HEIGHT = 40;
  VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;

  VideoControlBar.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .videoControlBar {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50%);
      transform: translate(0, -100%);
      width: 100vw;
      height: %BASE_HEIGHT%px;
      z-index: 150000;
      background: #000;
      transition: opacity 0.3s ease, transform 0.3s ease;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .changeScreenMode .videoControlBar {
      opacity: 0;
      transform: translate(0, 0);
      transition: none;
    }
    .zenzaScreenMode_small    .videoControlBar,
    .zenzaScreenMode_sideView .videoControlBar,
    .zenzaScreenMode_wide     .videoControlBar,
    .fullScreen               .videoControlBar {
      top: 100%;
      left: 0;
      width: 100%; {* 100vwだと縦スクロールバーと被る *}
    }
    {* 縦長モニター *}
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
      position: absolute; {* firefoxのバグ対策 *}
      opacity: 0;
      bottom: 0;
      background: none;
    }

    .zenzaScreenMode_wide .volumeChanging .videoControlBar,
    .fullScreen           .volumeChanging .videoControlBar,
    .zenzaScreenMode_wide .mouseMoving    .videoControlBar,
    .fullScreen           .mouseMoving    .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
    }
    .zenzaScreenMode_wide .showVideoControlBar .videoControlBar,
    .fullScreen           .showVideoControlBar .videoControlBar {
      opacity: 1 !important;
      background: #000 !important;
    }

    .stalled .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
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
    .controlItemContainer.center {
      left: 50%;
      height: 40px;
      transform: translate(-50%, 0);
      background: #222;
      white-space: nowrap;
      overflow: visible;
    }
    .controlItemContainer.center .scalingUI {
      background: #333;
      transform-origin: top center;
    }

    .controlItemContainer.right {
      right: 0;
    }
    .mouseMoving .controlItemContainer.right {
    }
    .mouseMoving .controlItemContainer.right .controlButton{
      outline: solid 1px #333;
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
      {*border: 1px solid #ccc;
      border-radius: 8px;*}
    }
    .controlButton:hover {
      text-shadow: 0 0 8px #ff9;
      cursor: pointer;
      opacity: 1;
    }
    .abort   .playControl,
    .error   .playControl,
    .loading .playControl {
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
    .controlButton:hover .tooltip {
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


    .controlButtoncontainer {
      position: absolute;
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
      font-size: 20px;
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
    .playing .togglePlay .play {
      display: none;
    }

    .togglePlay>.pause {
      letter-spacing: -10px;
    }

    .playing .togglePlay .pause {
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

    {* 見えないマウス判定 *}
    .seekBarContainer .seekBarShadow {
      position: absolute;
      background: transparent;
      width: 100vw;
      height: 8px;
      top: -8px;
    }
    .seekBarContainer:hover .seekBarShadow {
      height: 24px;
      top: -24px;
    }

    .abort   .seekBarContainer,
    .loading .seekBarContainer,
    .error   .seekBarContainer {
      pointer-events: none;
      webkit-filter: grayscale();
      moz-filter: grayscale();
      filter: grayscale();
    }
    .abort   .seekBarContainer *,
    .loading .seekBarContainer *,
    .error   .seekBarContainer * {
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
      transition: height 0.2s ease, margin-top 0.2s ease;
    }

    .seekBar:hover {
      height: 15px;
      margin-top: -5px;
    }

    .mouseMoving .seekBar {
      background-color: rgba(0, 0, 0, 0.5);
    }

    .seekBarContainer .seekBar * {
      pointer-events: none;
    }

    .bufferRange {
      position: absolute;
      height: 100%;
      top: 0px;
      box-shadow: 0 0 4px #888;
      {*mix-blend-mode: lighten;*}
      z-index: 100;
      background: #663;
    }

    .noHeatMap .bufferRange {
      background: #666;
    }

    .seekBar .seekBarPointer {
      position: absolute;
      top: 50%;
      width: 6px;
      height: 100%;
      background: #ccc;
      border-radius: 2px;
      transform: translate(-50%, -50%);
      z-index: 200;
      transision: left 0.3s ease;
    }
    .dragging .seekBar .seekBarPointer {
      transision: none;
    }

    .videoControlBar .videoTime {
      display: inline-block;
      top: 0;
      padding: 0 16px;
      color: #fff;
      font-size: 10px;
      white-space: nowrap;
      background: rgba(33, 33, 33, 0.5);
      border-radius: 4px;
      text-align: center;
    }
    .videoControlBar .videoTime .currentTime,
    .videoControlBar .videoTime .duration {
      display: inline-block;
      color: #fff;
      text-align: center;
    }

    .videoControlBar.loading .videoTime {
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

    .loop .loopSwitch {
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

    .screenModeMenu:hover {
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
    .mute .videoControlBar .muteSwitch {
      color: #888;
    }
    .videoControlBar .muteSwitch:hover {
    }
    .videoControlBar .muteSwitch:active {
      font-size: 15px;
    }

    .zenzaPlayerContainer:not(.mute) .muteSwitch .mute-on,
                              .mute  .muteSwitch .mute-off {
      display: none;
    }

    .videoControlBar .volumeControl {
      display: inline-block;
      width: 80px;
      position: relative;
    }

    .videoControlBar .volumeControl .volumeControlInner {
      position: relative;
      box-sizing: border-box;
      width: 64px;
      height: 8px;
      border: 1px inset #888;
      border-radius: 4px;
      cursor: pointer;
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

    {*
      TODO:ボリュームバー上でのドラッグに対応したら表示
           現状はドラッグで調整できないので、表示しないほうがいい
    *}
    .videoControlBar .volumeControl .volumeBarPointer {
      position: absolute;
      top: 50%;
      width: 6px;
      height: 10px;
      background: #ccc;
      transform: translate(-50%, -50%);
      z-index: 200;
      pointer-events: none;
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

    .mute .videoControlBar .volumeControlInner {
      pointer-events: none;
    }
    .mute .videoControlBar .volumeControlInner >* {
      display: none;
    }




  */})
  .replace(/%BASE_HEIGHT%/g, VideoControlBar.BASE_HEIGHT);

  VideoControlBar.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoControlBar">

      <div class="seekBarContainer">
        <div class="seekBarShadow"></div>
        <div class="seekBar">
          <div class="seekBarPointer"></div>
          <div class="bufferRange"></div>
        </div>
      </div>

      <div class="controlItemContainer center">
        <div class="scalingUI">
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

          <div class="playbackRateMenu controlButton" data-command="playbackRateMenu">
            <div class="controlButtonInner">1x</div>
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

                <li class="playbackRate" data-rate="1.5"><span>1.5倍</span></li>
                <li class="playbackRate" data-rate="1.4"><span>1.4倍</span></li>
                <li class="playbackRate" data-rate="1.2"><span>1.2倍</span></li>
                <li class="playbackRate" data-rate="1.1"><span>1.1倍</span></li>


                <li class="playbackRate" data-rate="1.0"><span>標準速度(1.0x)</span></li>
                <li class="playbackRate" data-rate="0.8"><span>0.8倍</span></li>
                <li class="playbackRate" data-rate="0.5"><span>0.5倍</span></li>
                <li class="playbackRate" data-rate="0.3"><span>0.3倍</span></li>
                <li class="playbackRate" data-rate="0.1"><span>0.1倍</span></li>
              </ul>
            </div>
          </div>

          <div class="videoTime">
            <span class="currentTime"></span> /
            <span class="duration"></span>
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

        </div>
      </div>

      <div class="controlItemContainer right">
        <div class="scalingUI">
          <div class="screenModeMenu controlButton" data-command="screenModeMenu">
            <div class="tooltip">画面モード変更</div>
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
  */});

  _.assign(VideoControlBar.prototype, {
    initialize: function(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      var player = this._player = params.player;

      player.on('open',           _.bind(this._onPlayerOpen, this));
      player.on('canPlay',        _.bind(this._onPlayerCanPlay, this));
      player.on('durationChange', _.bind(this._onPlayerDurationChange, this));
      player.on('close',          _.bind(this._onPlayerClose, this));
      player.on('progress',       _.bind(this._onPlayerProgress, this));
      player.on('loadVideoInfo',  _.bind(this._onLoadVideoInfo, this));
      player.on('commentParsed',  _.bind(this._onCommentParsed, this));
      player.on('commentChange',  _.bind(this._onCommentChange, this));

      this._initializeDom();
      this._initializeScreenModeSelectMenu();
      this._initializePlaybackRateSelectMenu();
      this._initializeVolumeControl();


      // TODO: 飽きたら消す
      //this._lark = new Lark(params);
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(VideoControlBar.__css__);
      var $view = this._$view = $(VideoControlBar.__tpl__);
      var $container = this._$playerContainer;
      var config = this._playerConfig;
      var self = this;

      this._$seekBarContainer = $view.find('.seekBarContainer');
      this._$seekBar          = $view.find('.seekBar');
      this._$seekBarPointer = $view.find('.seekBarPointer');
      this._$bufferRange    = $view.find('.bufferRange');
      this._$tooltip        = $view.find('.seekBarContainer .tooltip');
      $view.on('click', function(e) {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover');
      });

      this._$seekBar.on('mousedown', _.bind(this._onSeekBarMouseDown, this));
      this._$seekBar.on('mousemove', _.bind(this._onSeekBarMouseMove, this));
      this._$seekBar.on('mousemove', _.debounce(_.bind(this._onSeekBarMouseMoveEnd, this), 1000));

      $view.find('.controlButton')
        .on('click', _.bind(this._onControlButton, this));

      this._$currentTime = $view.find('.currentTime');
      this._$duration    = $view.find('.duration');

      this._heatMap = new HeatMap({
        $container: this._$seekBarContainer.find('.seekBar')
      });
      var updateHeatMapVisibility = function(v) {
        self._$seekBarContainer.toggleClass('noHeatMap', !v);
      };
      updateHeatMapVisibility(this._playerConfig.getValue('enableHeatMap'));
      this._playerConfig.on('update-enableHeatMap', updateHeatMapVisibility);

      this._seekBarToolTip = new SeekBarToolTip({
        $container: this._$seekBarContainer
      });
      this._seekBarToolTip.on('command', function(command, param) {
        self.emit('command', command, param);
      });

      this._commentPreview = new CommentPreview({
        $container: this._$seekBarContainer
      });
      this._commentPreview.on('command', function(command, param) {
        self.emit('command', command, param);
      });
      var updateEnableCommentPreview = function(v) {
        self._$seekBarContainer.toggleClass('enablePreview', v);
        self._commentPreview.setIsEnable(v);
      };
      updateEnableCommentPreview(config.getValue('enableCommentPreview'));
      config.on('update-enableCommentPreview', updateEnableCommentPreview);

      this._$screenModeMenu       = $view.find('.screenModeMenu');
      this._$screenModeSelectMenu = $view.find('.screenModeSelectMenu');

      this._$playbackRateMenu       = $view.find('.playbackRateMenu');
      this._$playbackRateSelectMenu = $view.find('.playbackRateSelectMenu');

      ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        this._hideMenu();
        this._commentPreview.hide();
      }, this));

      $container.append($view);
      this._width = this._$seekBarContainer.innerWidth();
    },
    _initializeScreenModeSelectMenu: function() {
      var self = this;
      var $menu = this._$screenModeSelectMenu;

      $menu.on('click', 'span', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.screenMode'));
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
        var $target  = $(e.target.closest('.playbackRate'));
        var rate     = parseFloat($target.attr('data-rate'), 10);
        self.emit('command', 'playbackRate', rate);
      });

      var updatePlaybackRate = function(rate) {
        $label.text(rate + 'x');
        $menu.find('.selected').removeClass('selected');
        var fr = parseFloat(rate);
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
        var left = e.clientX - offset.left;
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
    _onControlButton: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $target = $(e.target.closest('.controlButton'));
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      switch (command) {
        case 'screenModeMenu':
          this.toggleScreenModeMenu();
          break;
        case 'playbackRateMenu':
          this.togglePlaybackRateMenu();
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
        'togglePlaybackRateMenu'
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
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
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
      this.resetBufferedRange();
    },
    _onPlayerCanPlay: function() {
      var duration = this._player.getDuration();
      this.setDuration(duration);

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
      this._timer = window.setInterval(_.bind(this._onTimer, this), 300);
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

      // TODO: 一般会員はバッファ内のみシーク
      this._player.setCurrentTime(sec);

      this._beginMouseDrag();
    },
    _onSeekBarMouseMove: function(e) {
      e.stopPropagation();
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

      this._player.setCurrentTime(sec);
      this._seekBarToolTip.update(sec, left);
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
      var player = this._player;
      var currentTime = player.getCurrentTime();
      this.setCurrentTime(currentTime);
    },
    _onLoadVideoInfo: function(videoInfo) {
      this.setDuration(videoInfo.getDuration());
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec) {
        this._currentTime = sec;

        var m = Math.floor(sec / 60);
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        var currentTimeText = [m, s].join(':');
        if (this._currentTimeText !== currentTimeText) {
          this._currentTimeText = currentTimeText;
          this._$currentTime.text(currentTimeText);
        }
        this._$seekBarPointer.css('left', Math.min(100, this._timeToPer(sec)) + '%');
      }
    },
    setDuration: function(sec) {
      if (sec !== this._duration) {
        this._duration = sec;

        if (sec === 0) {
          this._$duration.text('--:--');
        }
        var m = Math.floor(sec / 60);
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        this._$duration.text([m, s].join(':'));
        this.emit('durationChange');
      }
    },
    setBufferedRange: function(range, currentTime) {
      var $range = this._$bufferRange;
      if (!range || !range.length) {
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
              $range.css({
                left: this._timeToPer(start) + '%',
                width: this._timeToPer(width) + '%' //TODO: 100%を突き抜けないようにする
              });
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
      this._$bufferRange.css({left: 0, width: 0});
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
  _.extend(CommentPreviewView.prototype, AsyncEmitter.prototype);
  CommentPreviewView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaCommentPreview">
      <div class="zenzaCommentPreviewInner">
      </div>
    </div>
  */});
  CommentPreviewView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaCommentPreview {
      display: none;
      position: absolute;
      bottom: 10px;
      opacity: 0.8;
      max-height: 20vh;
      width: 350px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.2);
      color: #ccc;
      z-index: 100;
      overflow: hidden;
      border-bottom: 24px solid transparent;
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
      background: rgba(0, 0, 0, 0.8);
    }

    .seekBarContainer.enablePreview:hover .zenzaCommentPreview.show {
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
    .seekBarContainer .zenzaCommentPreview.show:hover .zenzaCommentPreviewInner {
    }

    .zenzaCommentPreviewInner .nicoChat {
      position: relative;
      display: block;
      width: 100%;
      padding: 2px 4px;
      cursor: pointer;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      border-top: 1px dotted transparent;
    }
    .zenzaCommentPreview:hover      .nicoChat + .nicoChat {
      border-top: 1px dotted #888;
    }
    .zenzaCommentPreviewInner:hover .nicoChat:nth-child(odd) {
      background: #111;
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

  */});
  _.assign(CommentPreviewView.prototype, {
    initialize: function(params) {
      var model = this._model = params.model;
      this._$container = params.$container;

      this._showing = false;
      this._initializeDom(this._$container);

      model.on('reset',  _.bind(this._onReset, this));
      model.on('update', _.bind(this._onUpdate, this));
      model.on('vpos',   _.bind(this._onVpos, this));

      var show = _.throttle(_.bind(this.show, this), 200);
      this.show = show;
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(CommentPreviewView.__css__);
      var $view = this._$view = $(CommentPreviewView.__tpl__);
      this._$inner = $view.find('.zenzaCommentPreviewInner');
      var self = this;

      $view.on('click', function(e) {
        e.stopPropagation();
        var $target = $(e.target);
        var command = $target.attr('data-command');
        var $nicoChat = $target.closest('.nicoChat');
        var no = parseInt($nicoChat.attr('data-nicochat-no'), 10);
        var nicoChat  = self._model.getItemByNo(no);
        //self.hide();

        if (command && nicoChat && !$view.hasClass('updating')) {
          $view.addClass('updating');
          window.setTimeout(function() { $view.removeClass('updating'); }, 3000);
          switch (command) {
            case 'addUserIdFilter':
              self.emit('command', command, nicoChat.getUserId());
              break;
            case 'addWordFilter':
              self.emit('command', command, nicoChat.getText());
              break;
            case 'addCommandFilter':
              self.emit('command', command, nicoChat.getCmd());
              break;
          }
          return;
        }
        var vpos = $nicoChat.attr('data-vpos');
        if (vpos !== undefined) {
          self.emit('command', 'seek', vpos / 100);
        }
      });
      $view.on('mousewheel', function(e) {
        e.stopPropagation();
      });
      $container.on('mouseleave', function() {
        self.hide();
      });

      this._html = '';

      $container.append($view);
    },
    _onUpdate: function() {
      if (this._isShowing) {
        this._updateView();
      } else {
        this._updated = true;
      }
    },
    _onVpos: function() {
      var $view = this._$view;
      var index = Math.max(0, this._model.getCurrentIndex());
      this._$nicoChat = this._$nicoChat || $view.find('.nicoChat:first-child');
      this._scrollTop = ///this._$nicoChat.length > 1 ?
        this._$nicoChat.outerHeight() * index; // : 0;
      //window.console.log('_onVpos', this._$nicoChat, this._$nicoChat.outerHeight, index);
    },
    _onReset: function() {
      this._html = '';
      this._$inner.html('');
      this._$nicoChat = null;
      this._scrollTop = 0;
    },
    _updateView: function() {
      var chatList = this._model.getChatList();
      if (chatList.length < 1) {
        this.hide();
        this._updated = false;
        this._html = '';
        return;
      }
      var vposToTime = function(vpos) {
        var sec = Math.floor(vpos / 100);
        var m = Math.floor(sec / 60);
        var s = (100 + (sec % 60)).toString().substr(1);
        return [m, s].join(':');
      };
      console.time('updateCommentPreviewView');
      var _html = ['<ul>'];
      $(chatList).each(function(i, chat) {
        var text = ZenzaWatch.util.escapeHtml(chat.getText());
        var date = (new Date(chat.getDate() * 1000)).toLocaleString();
        var vpos = chat.getVpos();
        var title = [
          chat.getNo(), ': 投稿日', date, '\nID:', chat.getUserId(), '\n',
          '', text, '\n'
        ].join('');
        var elm = [
          '<li class="nicoChat fork', chat.getFork(), '"', //title="', title, '" ',
              'data-vpos="', vpos, '" ',
              'data-nicochat-no="', chat.getNo(), '" ',
            '>',
              '<span class="vposTime">', vposToTime(vpos), ': </span>',
              '<span class="text" title="', title, '" ', 'style="color: ', chat.getColor(), ';', '" >',
                text,
              '</span>',
              '<span class="addFilter addUserIdFilter"  data-command="addUserIdFilter" title="NGユーザー">NGuser</span>',
              '<span class="addFilter addWordFilter"    data-command="addWordFilter" title="NGワード">NGword</span>',
          '</li>',
        ''].join('');
        _html.push(elm);
      });
      _html.push('</ul>');

      var html = _html.join('');
      if (this._html !== html) {
        this._html = html;
        this._$inner.html(html);
        this._$nicoChat = this._$inner.find('.nicoChat:first-child');
      }
      this._updated = false;
      console.timeEnd('updateCommentPreviewView');
    },
    _isEmpty: function() {
      return this._html === '';
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
      $view.css({left: left}).scrollTop(this._scrollTop).addClass('show');

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
  SeekBarToolTip.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .seekBarToolTip {
      position: absolute;
      display: inline-block;
      bottom: 10px;
      z-index: 300;
      position: absolute;
      padding: 1px;
      bottom: 10px;
      left: 0;
      white-space: nowrap;
      font-size: 10px;
      background: #000;
      z-index: 150;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .seekBarContainer:hover .seekBarToolTip {
      opacity: 1;
      pointer-events: none;
    }

    .seekBarToolTip .currentTime {
      display: inline-block;
      color: #fff;
      background: #666;
      text-align: center;
    }

    .seekBarToolTip .controlButton {
      width: 24px;
      height: 24px;
      line-height: 22px;
      font-size: 18px;
    }
    .seekBarToolTip .controlButton:active {
      font-size: 14px;
    }

    .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 0.5;
    }

    .enablePreview .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 1;
    }
  */});
  SeekBarToolTip.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="seekBarToolTip">
      <div class="seekBarToolTipInner">

        <div class="controlButton backwardSeek" data-command="seekBy" data-param="-5" title="5秒戻る">
          <div class="controlButtonInner">⇦</div>
        </div>

        <div class="currentTime"></div>
        <div class="controlButton enableCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
          <div class="menuButtonInner">💬</div>
        </div>

        <div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む">
          <div class="controlButtonInner">⇨</div>
        </div>

      </div>
    </div>
  */});
  _.assign(SeekBarToolTip .prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._initializeDom(params.$container);
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(SeekBarToolTip.__css__);
      var $view = this._$view = $(SeekBarToolTip.__tpl__);
      var self = this;

      this._$currentTime = $view.find('.currentTime');

      $view.on('click', function(e) {
        e.stopPropagation();
        var $target = $(e.target.closest('.controlButton'));
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        self.emit('command', command, param);
      });

      $container.append($view);
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
        this._$view.css('left', left);
      }
    }
  });







  var NicoTextParser = function() {};
  NicoTextParser._FONT_REG = {
    // TODO: wikiにあるテーブルを正規表現に落とし込む
    // MING_LIUは昔どこかで拾ったのだけど出典がわからない
    // wikiの記述だと\u2588はstrongではないっぽいけど、そうじゃないと辻褄が合わないCAがいくつかある。
    // wikiが間違いなのか、まだ知らない法則があるのか・・・？
    //
    GOTHIC: /[ｧ-ﾝﾞ･ﾟ]/,
    MINCHO: /([\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/,
    GULIM: /([\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6])/,
    MING_LIU: /([\uEF00-\uEF1F])/,
    GR: /<group>([^\x01-\x7E^\xA0]*?([ｧ-ﾝﾞ･ﾟ\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6\uEF00-\uEF1F\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])[^\x01-\x7E^\xA0]*?)<\/group>/g,
    STRONG_MINCHO: /([\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\u2588])/,
    // ドット絵系によく使われる文字. 綺麗に見せるためにエフェクトを変えたい
    BLOCK: /([\u2581-\u258F\u25E2-\u25E5]+)/g,
  };


// 画面レイアウトに影響ありそうなCSSをこっちにまとめる
  NicoTextParser.__css__ = ZenzaWatch.util.hereDoc(function() {/*
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.default {}
.gothic  {font-family: 'ＭＳ Ｐゴシック'; }
.mincho  {font-family: Simsun,            Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', monospace; }
.gulim   {font-family: Gulim,             Osaka-mono,              'ＭＳ ゴシック', monospace; }
.mingLiu {font-family: PmingLiu, mingLiu, Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', monospace; }
han_group { font-family: 'Arial'; }

.nicoChat {
  position: absolute;
  padding: 1px;

  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: pre;
  font-weight: bolder;
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
  {* フォント変化のあったグループの下にいるということは、
     半角文字に挟まれていないはずである。
   *}
    .gothic > .type2001 {
      font-family: 'ＭＳ Ｐゴシック';
    }
    .mincho > .type2001 {
      font-family: Simsun;
    }
    .gulim > .type2001 {
      font-family: Gulim;
    }
    .mingLiu > .type2001 {
      font-family: PmingLiu, mingLiu;
    }
  



  {*
    空白文字の幅をWindowsと同等にしたい。調査中
    等幅フォントを縮めることで環境差異のない幅を確保するという狙いだが・・・。
  *}

  .tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0; }
  .big    .tab_space { letter-spacing: 1.6241em; }
  .medium .tab_space { letter-spacing: 1.6252em; }
  .small  .tab_space { letter-spacing: 1.5375em; }


  .gothic > .type3000 {
    font-family: Osaka-mono, 'ＭＳ ゴシック', monospace;
    letter-spacing: -0.2943em;
  }


{*.type0020,*}
  .type00A0 {
    font-family: Osaka-mono, 'ＭＳ ゴシック', monospace;
    letter-spacing: -0.1805em;
  }


.backslash {
  font-family: Arial;
}


  */});

/**
 *  たぶんこんな感じ
 *  1. 全角文字(半角スペース<s>含む</s>含まない)でグループ化
 *  2. グループ内でフォント変化文字が1つある場合はグループ全体がそのフォント
 *  3. 二つ以上ある場合は、一番目がグループ内のベースフォント、
 *     二番目以降はそのフォントにチェンジ
 *  4. 最初のグループにフォントチェンジがあった場合は、
 *     グループ全体のベースフォントがグループ1の奴になる
 *
 *  Vista以降だともうちょっと複雑らしい
 */
  NicoTextParser.likeXP = function(text) {
    var htmlText =
      ZenzaWatch.util.escapeHtml(text)
        // 行末の半角スペース、全角スペース、タブの除去
        .replace(/([\x20|\u3000|\t])+([\n$])/g , '$2')
        // 半角文字グループ(改行以外)
        .replace(/([\x01-\x09\x0B-\x7E\xA0]+)/g, '<han_group>$1</han_group>')
        // 全角文字の連続をグループ化 要検証: \u2003は含む？
        .replace(/([^\x01-\x7E^\xA0]+)/g, '<group>$1</group>')
        .replace(/([\u0020]+)/g,   '<span class="han_space type0020">$1</span>')
        .replace(/([\u00A0]+)/g,   '<span class="han_space type00A0">$1</span>')
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
          .replace(/([\u2588]+)/g, '<span class="fill_space">$1</span>')
        // 非推奨空白文字。 とりあえず化けて出ないように
          .replace(/([\uE800\u2002-\u200A\u007F\u05C1\u0E3A\u3164]+)/g,
            '<span class="invisible_code">$1</span>')
        // 結合文字 前の文字と同じ幅になるらしい
        // http://www.nicovideo.jp/watch/1376820446 このへんで見かけた
          .replace(/(.)[\u0655]/g ,  '$1<span class="type0655">$1</span>')
        //http://www.nicovideo.jp/watch/1236260707 で見かける謎スペース。よくわからない
          .replace(/([\u115a]+)/g ,  '<span class="zen_space type115A">$1</span>')
        // 推奨空白文字
        // なんか前後の文字によって書体(幅)が変わるらしい。 隣接セレクタでどうにかなるか？
        //  .replace(/([\u2001]+)/g ,  '<span class="zen_space type2001">$1</span>')
        // 全角スペース
          .replace(/([\u3000]+)/g ,  '<span class="zen_space type3000">$1</span>')
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
      htmlText.replace(/(.)<group>([\u2001]+)(<\/group>)(.)/, '$1<group class="zen_space arial type2001">$2</group>$3');

      htmlText = htmlText.replace(/<group>/g, '<group class="' + strongFont + '">');



      return htmlText;
    };

ZenzaWatch.NicoTextParser = NicoTextParser;



  // 大百科より
  var SHARED_NG_LEVEL = {
    NONE: 'NONE',
    LOW:  'LOW',
    MID:  'MID',
    HIGH: 'HIGH'
  };
  var SHARED_NG_SCORE = {
    NONE: -99999,//Number.MIN_VALUE,
    LOW:  -10000,
    MID:   -5000,
    HIGH:  -1000
  };

  /**
   * コメント描画まわり。MVVMもどき
   * 追加(投稿)はまだサポートしてない。
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
        show: params.showComment
      });

      this._model.on('change'      , _.bind(this._onCommentChange, this));
      this._model.on('filterChange', _.bind(this._onFilterChange, this));
      this._model.on('parsed'      , _.bind(this._onCommentParsed, this));

      ZenzaWatch.debug.nicoCommentPlayer = this;
    },
    setComment: function(xml) {
      var parser = new DOMParser();
      if (typeof xml.getElementsByTagName === 'function') {
        this._model.setXml(xml);
      } else if (typeof xml === 'string') {
        xml = parser.parseFromString(xml, 'text/xml');
        this._model.setXml(xml);
      } else {
        PopupMessage.alert('コメントの読み込み失敗');
      }
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
    }
  });




  var NicoComment = function() { this.initialize.apply(this, arguments); };
  NicoComment.MAX_COMMENT = 5000;

  _.assign(NicoComment.prototype, {
    initialize: function(params) {
      this._currentTime = 0;
      var emitter = new AsyncEmitter();
      this.on        = _.bind(emitter.on,        emitter);
      this.emit      = _.bind(emitter.emit,      emitter);
      this.emitAsync = _.bind(emitter.emitAsync, emitter);


      params.nicoChatFilter = this._nicoChatFilter = new NicoChatFilter(params);
      this._nicoChatFilter.on('change', _.bind(this._onFilterChange, this));
      
      this._topGroup    = new NicoChatGroup(this, NicoChat.TYPE.TOP,    params);
      this._nakaGroup = new NicoChatGroup(this, NicoChat.TYPE.NAKA  , params);
      this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);

      var onChange = _.debounce(_.bind(this._onChange, this), 100);
      this._topGroup   .on('change', onChange);
      this._nakaGroup.on('change', onChange);
      this._bottomGroup.on('change', onChange);
      ZenzaWatch.emitter.on('updateOptionCss', onChange);
      //NicoChatViewModel.emitter.on('updateBaseChatScale', onChange);
    },
    setXml: function(xml) {
      window.console.time('コメントのパース処理');

      this._xml = xml;
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();

      var chats = xml.getElementsByTagName('chat');
      var top = [], bottom = [], naka = [];
      for (var i = 0, len = Math.min(chats.length, NicoComment.MAX_COMMENT); i < len; i++) {
        var chat = chats[i];
        if (!chat.firstChild) continue;

        var nicoChat = new NicoChat(chat);

        if (nicoChat.isDeleted()) { continue; }

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
      }
      this._topGroup   .addChatArray(top);
      this._nakaGroup.addChatArray(naka);
      this._bottomGroup.addChatArray(bottom);

      window.console.timeEnd('コメントのパース処理');
      console.log('chats: ', chats.length);
      console.log('top: ',    this._topGroup   .getNonFilteredMembers().length);
      console.log('naka: ',   this._nakaGroup  .getNonFilteredMembers().length);
      console.log('bottom: ', this._bottomGroup.getNonFilteredMembers().length);
      this.emit('parsed');
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
    var __offscreen_tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="utf-8">
    <title>CommentLayer</title>
    <style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
    <style type="text/css" id="optionCss">%OPTION_CSS%</style>
    <style type="text/css">

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
      */});

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
      document.body.appendChild(frame);
      frame.style.position = 'fixed';
      frame.style.top = '200vw';
      frame.style.left = '200vh';
      
      offScreenFrame = frame;

      var layer;
      frame.onload = function() {
        frame.onload = _.noop;

        console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
        createTextField();
        var doc = offScreenFrame.contentWindow.document;
        layer       = doc.getElementById('offScreenLayer');
        layoutStyle = doc.getElementById('layoutCss');
        optionStyle = doc.getElementById('optionCss');
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

      frame.srcdoc = __offscreen_tpl__
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');
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

      var scale = NicoChatViewModel.BASE_SCALE;
      NicoChatViewModel.emitter.on('updateBaseChatScale', function(v) { scale = v; });

      textField = {
        setText: function(text) {
          span.innerHTML = text;
        },
        setType: function(type) {
          span.className = 'nicoChat ' + type;
        },
        setFontSizePixel: function(pixel) {
          span.style.fontSize = pixel + 'px';
        },
        getOriginalWidth: function() {
          return span.offsetWidth;
        },
        getWidth: function() {
          return span.offsetWidth * scale;
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

      var emitter = new AsyncEmitter();
      this.on        = _.bind(emitter.on,        emitter);
      this.emit      = _.bind(emitter.emit,      emitter);
      this.emitAsync = _.bind(emitter.emitAsync, emitter);

      this._currentTime = 0;

      this._topGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
      this._nakaGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA  ), offScreen);
      this._bottomGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

      nicoComment.on('setXml', _.bind(this._onSetXml, this));
      nicoComment.on('clear',  _.bind(this._onClear,  this));
      nicoComment.on('change', _.bind(this._onChange,  this));
      nicoComment.on('currentTime', _.bind(this._onCurrentTime,   this));
    },
    _onSetXml: function() {
      this.emit('setXml');
    },
    _onClear: function() {
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();

      this.emit('clear');
    },
    _onCurrentTime: function(sec) {
      this._currentTime = sec;
      this.emit('currentTime', this._currentTime);
    },
    _onChange: function(e) {
      console.log('NicoCommentViewModel.onChange: ', e);
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
    }
});

  var NicoChatGroup = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoChatGroup.prototype, AsyncEmitter.prototype);
  _.assign(NicoChatGroup.prototype, {
    initialize: function(nicoComment, type, params) {
      this._nicoComment = nicoComment;
      this._type = type;

      this._nicoChatFilter = params.nicoChatFilter;
      this._nicoChatFilter.on('change', _.bind(this._onFilterChange, this));

      this.reset();
    },
    reset: function() {
      this._members = [];
      this._filteredMembers = [];
    },
    addChatArray: function(nicoChatArray) {
      var members = this._members;
      var newMembers = [];
      $(nicoChatArray).each(function(i, nicoChat) {
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

      // メンバーをvposでソートした物. 計算効率改善用
      this._vSortedMembers = [];

      nicoChatGroup.on('addChat',      _.bind(this._onAddChat,      this));
      nicoChatGroup.on('addChatArray', _.bind(this._onAddChatArray, this));
      nicoChatGroup.on('reset',        _.bind(this._onReset,        this));
      nicoChatGroup.on('change',       _.bind(this._onChange,        this));
      NicoChatViewModel.emitter.on('updateBaseChatScale', _.bind(this._onChange, this));

      this.addChatArray(nicoChatGroup.getMembers());
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
    addChatArray: function(nicoChatArray) {
      for (var i = 0, len = nicoChatArray.length; i < len; i++) {
        var nicoChat = nicoChatArray[i];
        var nc = new NicoChatViewModel(nicoChat, this._offScreen);
        this._members.push(nc);
      }
      this._groupCollision();
    },
    _groupCollision: function() {
      this._createVSortedMembers();
      var members = this._vSortedMembers;
      for (var i = 0, len = members.length; i < len; i++) {
        this.checkCollision(members[i]);
      }
    },
    addChat: function(nicoChat) {
      var timeKey = 'addChat:' + nicoChat.getText();
      window.console.time(timeKey);
      var nc = new NicoChatViewModel(nicoChat, this._offScreen);

      // 内部処理効率化の都合上、
      // 自身を追加する前に判定を行っておくこと
      this.checkCollision(nc);

      this._members.push(nc);
      this._createVSortedMembers();
      window.console.timeEnd(timeKey);
    },
    reset: function() {
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].reset();
      }

      this._members = [];
      this._vSortedMembers = [];
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
//      var endRight  = target.getEndRightTiming();
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
    _.each(Object.keys(options), function(v) {
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

      this._currentTime = 0;
    },
    initialize: function(chat) {
      this._id = 'chat' + NicoChat.id++;
      this._currentTime = 0;

      var text = this._text = chat.firstChild.nodeValue;
      var attr = chat.attributes;
      if (!attr) { this.reset(); return; }

      this._date = chat.getAttribute('date') || '000000000';
      this._cmd  = chat.getAttribute('mail') || '';
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
      // fork * 100000000を足してるのは苦し紛れの措置. いつか直す (本当に？)
      this._no =
        parseInt(chat.getAttribute('no') || '0', 10) + this._fork * 100000000;
      if (this._fork > 0 && text.match(/^[\/＠@]/)) {
        this._isInvisible = true;
      }

      if (this._deleted) { return; }

      var cmd = this._cmd;
      if (cmd.length > 0) {
        var pcmd = this._parseCmd(cmd);

        if (pcmd['COLOR']) {
          this._color = pcmd['COLOR'];
        }

        // TODO: 両方指定されてたらどっちが優先されるのかを検証
        if (pcmd['big']) {
          this._size = NicoChat.SIZE.BIG;
        } else if (pcmd['small']) {
          this._size = NicoChat.SIZE.SMALL;
        }

        if (pcmd['ue']) {
          this._type = NicoChat.TYPE.TOP;
        } else if (pcmd['shita']) {
          this._type = NicoChat.TYPE.BOTTOM;
        }

        if (pcmd['ender']) {
          this._isEnder = true;
        }
        if (pcmd['full']) {
          this._isFull = true;
        }
      }
    },
    _parseCmd: function(cmd) {
      var tmp = cmd.split(/ +/);
      var result = {};
      $(tmp).each(function(i, c) {
        if (NicoChat.COLORS[c]) {
          result['COLOR'] = NicoChat.COLORS[c];
        } else if (NicoChat._COLOR_MATCH.test(c)) {
          result['COLOR'] = c;
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
    getUserId: function() { return this._userId; },
    getVpos: function() { return this._vpos; },
    isDeleted: function() { return !!this._deleted; },
    getColor: function() { return this._color; },
    getSize: function() { return this._size; },
    getType: function() { return this._type; },
    getScore: function() { return this._score; },
    getNo: function() { return this._no; },
    getFork: function() { return this._fork; }
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
    TOP:    3,
    NAKA: 4,
    BOTTOM: 3
  };

  NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
  NicoChatViewModel.FONT_SIZE_PIXEL = {
    BIG:    39 + 0,
    MEDIUM: 24 + 0,
    SMALL:  15 + 0
  };

  NicoChatViewModel.LINE_HEIGHT = {
    BIG:    45,
    MEDIUM: 29, // TODO: MEDIUMに変える
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
      this._duration = NicoChatViewModel.DURATION.NAKA;

      // 固定されたコメントか、流れるコメントか
      this._isFixed = false;

      this._scale = NicoChatViewModel.BASE_SCALE;
      this._y = 0;

      this._setType(nicoChat.getType());

      // ここでbeginLeftTiming, endRightTimintが確定する
      this._setVpos(nicoChat.getVpos());

      this._setSize(nicoChat.getSize());

      // 文字を設定
      // この時点で字幕の大きさが確定するので、
      // Z座標・beginRightTiming, endLeftTimingまでが確定する
      this._setText(nicoChat.getText());

      if (this._isFixed) {
        this._setupFixedMode();
      } else {
        this._setupMarqueeMode();
      }

      // この時点で画面の縦幅を超えるようなコメントは縦幅に縮小しつつoverflow扱いにしてしまう
      // こんなことをしなくてもおそらく本家ではぴったり合うのだろうし苦し紛れだが、
      // 画面からはみ出すよりはマシだろうという判断
      if (this._height > NicoCommentViewModel.SCREEN.HEIGHT + 8) {
        this._isOverflow = true;
        this._y = 0;
        //this._y = (NicoCommentViewModel.SCREEN.HEIGHT - this._height) / 2;
        this._setScale(this._scale * NicoCommentViewModel.SCREEN.HEIGHT / this._height);
      }

      if (this._isOverflow || nicoChat.isInvisible()) {
        this.checkCollision = function() { return false; };
      }
    },
    _setType: function(type) {
      this._type = type;
      switch (type) {
        case NicoChat.TYPE.TOP:
          this._duration = NicoChatViewModel.DURATION.TOP;
          this._isFixed = true;
          break;
        case NicoChat.TYPE.BOTTOM:
          this._duration = NicoChatViewModel.DURATION.BOTTOM;
          this._isFixed = true;
          break;
        default:
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
    _setSize: function(size) {
      this._size = size;
      switch (size) {
        case NicoChat.SIZE.BIG:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.BIG;
          break;
        case NicoChat.SIZE.SMALL:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.SMALL;
          break;
        default:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.MEDIUM;
          break;
      }
    },
    // 実験中...
    _setText: function(text) {

      var htmlText = NicoTextParser.likeXP(text);
//      if (this._nicoChat.getNo() === 626) {
//        window.console.log(this._nicoChat);
//        window.ttt = text;
//        window.hhh = htmlText;
//      }

      this._htmlText = htmlText;
      this._text = text;

      var field = this._offScreen.getTextField();
      field.setText(htmlText);
      field.setFontSizePixel(this._fontSizePixel);
      field.setType(this._type);
      
      this._originalWidth  = field.getOriginalWidth();
      this._width          = this._originalWidth * this._scale;
      this._height         = this._originalHeight = this._calculateHeight();

      if (!this._isFixed) {
        var speed =
          this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / this._duration;
        this._endLeftTiming    = this._endRightTiming  - this._width / speed;
        this._beginRightTiming = this._beginLeftTiming + this._width / speed;
      } else {
        this._speed = 0;
        this._endLeftTiming    = this._endRightTiming;
        this._beginRightTiming = this._beginLeftTiming;
      }
    },
    /**
     * 高さ計算。 リサイズ後が怪しいというか多分間違ってる。
     */
    _calculateHeight: function() {
      // ブラウザから取得したouterHeightを使うより、職人の実測値のほうが信頼できる
      // http://tokeiyadiary.blog48.fc2.com/blog-entry-90.html
      // http://www37.atwiki.jp/commentart/pages/43.html#id_a759b2c2
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
      // 参考: http://ch.nicovideo.jp/meg_nakagami/blomaga/ar217381
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
      var overflowMargin = 5;
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
    isInView: function() {
      return this.isInViewBySecond(this.getCurrentTime());
    },
    isInViewBySecond: function(sec) {
      if (sec + 0.5 /* margin */ < this._beginLeftTiming) { return false; }
      if (sec > this._endRightTiming ) { return false; }
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
    // 左端が見えるようになるタイミング
    getBeginLeftTiming: function() {
      return this._beginLeftTiming;
    },
    // 右端が見えるようになるタイミング
    getBeginRightTiming: function() {
      return this._beginRightTiming;
    },
    // 左端が見えなくなるタイミング
    getEndLeftTiming: function() {
      return this._endLeftTiming;
    },
    // 右端が見えなくなるタイミング
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
    isMine: function()     { return this._nicoChat.isMine(); },
    isUpdating: function() { return this._nicoChat.isUpdating(); },
    isPostFail: function() { return this._nicoChat.isPostFail(); },
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

  NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;

  NicoCommentCss3PlayerView.__TPL__ = ZenzaWatch.util.hereDoc(function() {/*
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">


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


.commentLayerOuter {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 672px;
  padding: 0 64px;
  height: 385px;
  right: 0;
  bottom: 0;
  transform: translate(-50%, -50%);
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
}

.debug .commentLayer {
  border: 1px dotted #800;
}

.nicoChat {
  line-height: 1.235;
  opacity: 0;
  text-shadow:
     1px  1px 0 #000;
  transform-origin: 0% 0%;
  animation-timing-function: linear;
  {* will-change: transform;*}
  color: #fff;
}
.nicoChat.fixed {
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
  opacity: 0;
}

.nicoChat .han_space,
.nicoChat .zen_space {
  text-shadow: none;
  opacity: 0;
}

.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
  text-shadow: none;
  color: yellow;
  background: #fff;
  opacity: 0.3;
  mix-blend-mode: lighten;
}

.debug .nicoChat .tab_space {
  text-shadow: none;
  background: #ff0;
  opacity: 0.3;
}

.nicoChat .invisible_code {
  text-shadow: none;
  opacity: 0;
}

.nicoChat .zero_space {
  text-shadow: none;
  opacity: 0;
}

.debug .nicoChat .zero_space {
  display: inline;
  position: absolute;
}

.nicoChat .fill_space {
  text-shadow: none;
  background: currentColor;
}

.nicoChat .block_space {
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

.nicoChat.updating {
  border: 1px dotted;
}

.nicoChat.fork1 {
  text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
}
.nicoChat.ue.fork1,
.nicoChat.shita.fork1 {
  display: inline-block;
  text-shadow: 0 0 3px #080 !important;
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
  content: '❀'; {* 砂時計にしたい *}
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

.stalled .nicoChat,
.paused  .nicoChat {
  animation-play-state: paused !important;
}

</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body style="background: transparent !important;">
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>

  */});

  _.assign(NicoCommentCss3PlayerView.prototype, {
    initialize: function(params) {
      this._viewModel = params.viewModel;

      this._viewModel.on('setXml', _.bind(this._onSetXml, this));
      this._viewModel.on('currentTime', _.bind(this._onCurrentTime, this));

      this._lastCurrentTime = 0;
      this._isShow = true;

      this._aspectRatio = 9 / 16;

      this._inViewTable = {};
      this._playbackRate = params.playbackRate || 1.0;

      this._isStalled = undefined;
      this._isPaused  = undefined;

      this._retryGetIframeCount = 0;

      console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

      this._initializeView(params, 0);

      var _refresh = _.bind(this.refresh, this);
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
      $(document).on('visibilitychange', function() {
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
      var iframe = this._getIframe();

      iframe.className = 'commentLayerFrame';

      var html =
        NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '')
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');


      var self = this;
      iframe.onload = function() {
        var win, doc;
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
            self._initializeView(params, retryCount + 1);
          } else {
            PopupMessage.alert('コメントレイヤーの生成に失敗');
          }
          return;
        }

        self._layoutStyle = doc.getElementById('layoutCss');
        self._optionStyle = doc.getElementById('optionCss');
        self._style       = doc.getElementById('nicoChatAnimationDefinition');
        var commentLayer  = self._commentLayer = doc.getElementById('commentLayer');

        // Config直接参照してるのは手抜き
        doc.body.className = Config.getValue('debug') ? 'debug' : '';
        Config.on('update-debug', function(val) {
          doc.body.className = val ? 'debug' : '';
        });
        // 手抜きその2
        self._optionStyle.innerHTML = NicoComment.offScreenLayer.getOptionCss();
        ZenzaWatch.emitter.on('updateOptionCss', function(newCss) {
          self._optionStyle.innerHTML = newCss;
        });

        var onResize = function() {
          var w = win.innerWidth, h = win.innerHeight;
          // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
          var aspectRatio = Math.max(self._aspectRatio, 9 / 16);
          var targetHeight = Math.min(h, w * aspectRatio);
          commentLayer.style.transform = 'scale(' + targetHeight / 385 + ')';
        };
        win.addEventListener('resize', onResize);

        ZenzaWatch.debug.getInViewElements = function() {
          return doc.getElementsByClassName('nicoChat');
        };

        var lastW = win.innerWidth, lastH = win.innerHeight;
        var timer = window.setInterval(function() {
          var w = win.innerWidth, h = win.innerHeight;
          if (lastW !== w || lastH !== h) {
            lastW = w;
            lastH = h;
            onResize();
          }
        }, 3000);

        if (self._isPaused) {
          self.pause();
        }

        //ZenzaWatch.util.callAsync(self._adjust, this, 1000);
        window.console.timeEnd('initialize NicoCommentCss3PlayerView');
      };

      iframe.srcdoc = html;
      this._view = iframe;
      ZenzaWatch.debug.commentLayer = iframe;
      if (this._$node) {
        this._$node.append(this._view);
      }
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
    _onResize: function(e) {
      this._adjust(e);
    },
    // リサイズイベントを発動させる
    _adjust: function() {
      if (!this._view) {
        return;
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
      this._adjust();
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
        if (v) { this._addClass('stalled'); }
        else   { this._removeClass('stalled'); }
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
        var fragment = document.createDocumentFragment();
        while (dom.length > 0) { fragment.appendChild(dom.shift()); }
        this._commentLayer.appendChild(fragment);
        this._style.innerHTML += css.join('');
        this._gcInviewElements();
      }
    },
    /**
     * 表示された要素を古い順に除去していく
     * 本家は単純なFIFOではなく、画面からいなくなった要素から除去→FIFOの順番だと思うが、
     * そこを再現するメリットもないと思うので手抜きしてFIFOしていく
     */
    _gcInviewElements: function() {
      if (!this._commentLayer || !this._style) { return; }

      var max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;

      var commentLayer = this._commentLayer;
      var inViewElements = commentLayer.getElementsByClassName('nicoChat');
      for (var i = inViewElements.length - max - 1; i >= 0; i--) {
        inViewElements[i].remove();
      }
    },

    buildHtml: function(currentTime) {
      currentTime = currentTime || this._viewModel.getCurrentTime();
      window.console.time('buildHtml');

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NAKA  ),
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
      if (fork > 0) {
        className.push('fork' + fork);
      }


      if (chat.isPostFail()) {
        className.push('fail');
      }

      span.className = className.join(' ');
      span.id = chat.getId();
      span.innerHTML = chat.getHtmlText();
      span.setAttribute('data-meta', chat.toString());
      return span;
    },
    _buildChatHtml: function(chat , type /*, currentTime */) {
      var size = chat.getSize();
      var className = ['nicoChat',type, size];
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
      if (fork > 0) {
        className.push('fork' + fork);
      }


      var result = [
        '<span id="', chat.getId(), '" class="', className.join(' '), '">',
          chat.getHtmlText(),
        '</span>'
      ];
      return result.join('');
    },
    _buildChatCss: function(chat, type, currentTime) {
      var result;
      var scaleCss;
      var id = chat.getId();
      var playbackRate = this._playbackRate;
      var duration = chat.getDuration() / playbackRate;
      var scale = chat.getScale();
      var beginL = chat.getBeginLeftTiming();
      var screenWidth     = NicoCommentViewModel.SCREEN.WIDTH;
      var screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
      var width = chat.getWidth();
//      var height = chat.getHeight();
      var ypos = chat.getYpos();
      var color = chat.getColor();
      var colorCss = color ? ('color: ' + color + ';\n') : '';
      var fontSizePx = chat.getFontSizePixel();
      //var lineHeight = chat.getLineHeight();
      var speed = chat.getSpeed();
      var delay = (beginL - currentTime) / playbackRate;
      // 本家は「古いコメントほど薄くなる」という仕様だが、特に再現するメリットもなさそうなので
      var opacity = 1; //chat.isOverflow() ? 0.8 : 1;
      //var zid = parseInt(id.substr('4'), 10);
      //var zIndex = 10000 - (zid % 5000);
      var zIndex = beginL * 1000 + chat.getFork() * 1000000;

      if (type === NicoChat.TYPE.NAKA  ) {
        // 4:3ベースに計算されたタイミングを16:9に補正する
        // scale無指定だとChromeでフォントがぼけるので1.0の時も指定だけする
        // TODO: 環境によって重くなるようだったらオプションにする
        scaleCss = (scale === 1.0) ? 'scale(1)' : (' scale(' + scale + ')');
        var outerScreenWidth = screenWidthFull * 1.1;
        var screenDiff = outerScreenWidth - screenWidth;
        var leftPos = screenWidth + screenDiff / 2;
        var durationDiff = screenDiff / speed / playbackRate;
        duration += durationDiff;
        delay -= (durationDiff * 0.5);

        result = ['',
          ' @keyframes idou', id, ' {\n',
          '    0%  {opacity: ', opacity, '; transform: translate3d(0, 0, 0) ', scaleCss, ';}\n',
          '  100%  {opacity: ', opacity, '; transform: translate3d(', - (outerScreenWidth + width), 'px, 0, 0) ', scaleCss, ';}\n',
          ' }\n',
          '',
          ' #', id, ' {\n',
          '  z-index: ', zIndex , ';\n',
          '  top:', ypos, 'px;\n',
          '  left:', leftPos, 'px;\n',
          colorCss,
          '  font-size:', fontSizePx, 'px;\n',
//          '  line-height:',  lineHeight, 'px;\n',
          '  animation-name: idou', id, ';\n',
          '  animation-duration: ', duration, 's;\n',
          '  animation-delay: ', delay, 's;\n',
          ' }\n',
          '\n\n'];
      } else {
        scaleCss =
          scale === 1.0 ?
            ' transform: translate3d(-50%, 0, 0) scale(1);' :
            (' transform: translate3d(-50%, 0, 0) scale(' + scale + ');');

        result = ['',
          ' #', id, ' {\n',
          '  z-index: ', zIndex, ';\n',
          '  top:', ypos, 'px;\n',
          '  left: 50% ;\n',
          colorCss,
          '  font-size:', fontSizePx,  'px;\n',
//          '  line-height:', lineHeight,  'px;\n',
          '  width:', width, 'px;\n',
//          '  height:', height, 'px;\n',
          scaleCss,
//          '  animation-name: fixed', id, ';\n',
          '  animation-name: fixed;\n',
          '  animation-duration: ', duration / 0.95, 's;\n',
          '  animation-delay: ', delay, 's;\n',
          ' }\n',
          '\n\n'];
      }

      return result.join('') + '\n';
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
      //var $view = $(this._view);
      //$view.css({width: 1}).offset();
      this._$node = $node;
      $node.append(this._view);

      // リサイズイベントを発動させる。 バッドノウハウ的
      //ZenzaWatch.util.callAsync(this._adjust, this, 1000);
    },
    /**
     * toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
     * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
     * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
     */
    toString: function() {
      return this.buildHtml(0)
        .replace('<html', '<html class="saved"');
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

      this._enable = typeof params.enable === 'boolean' ? params.enable : true;

      this._wordReg  = null;
      this._userIdReg   = null;
      this._commandReg  = null;

      this._onChange = _.debounce(_.bind(this._onChange, this), 50);
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
      this._wordFilterList.push(text.trim());
      this._wordFilterList = _.uniq(this._wordFilterList);
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
      $(list).each(function(i, text) { tmp.push(text.trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._wordReg = null;
        this._wordFilterList = tmp;
        this._onChange();
      }
    },
    getWordFilterList: function() {
      return this._wordFilterList;
    },

    addUserIdFilter: function(text) {
      var before = this._userIdFilterList.join('\n');
      this._userIdFilterList.push(text);
      this._userIdFilterList = _.uniq(this._userIdFilterList);
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
      $(list).each(function(i, text) { tmp.push(text.trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._userIdReg = null;
        this._userIdFilterList = tmp;
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
      $(list).each(function(i, text) { tmp.push(text.trim()); });
      tmp = _.compact(tmp);
      var after = tmp.join('\n');

      if (before !== after) {
        this._commandReg = null;
        this._commandFilterList = tmp;
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
      var commentReg  = this._wordReg;
      var userIdReg   = this._userIdReg;
      var commandReg  = this._commandReg;

      if (Config.getValue('debug')) {
        return function(nicoChat) {
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

          if (commentReg && commentReg.test(nicoChat.getText())) {
            window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
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
        if (nicoChat.getScore() <= threthold) { return false; }

        if (commentReg && commentReg.test(nicoChat.getText()))   { return false; }

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
      $(filterList).each(function(i, filter) {
        r.push(ZenzaWatch.util.escapeRegs(filter));
      });
      return new RegExp('(' + r.join('|') + ')', 'i');
    },
    _buildFilterPerfectMatchinghReg: function(filterList) {
      if (filterList.length < 1) { return null; }
      var r = [];
      $(filterList).each(function(i, filter) {
        r.push(ZenzaWatch.util.escapeRegs(filter));
      });
      return new RegExp('^(' + r.join('|') + ')$');
    },
     _onChange: function() {
      console.log('NicoChatFilter.onChange');
      this.emit('change');
    }
  });




  var VideoListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListModel.prototype, AsyncEmitter.prototype);
  _.assign(VideoListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._maxItems = params.maxItems || 100;
    },
    setItem: function(listData) {
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      //this._videoListView.setItem(items);
      this.emit('update', this._items);
    },
    insertItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }
      itemList.reverse();
      this._items = this._items.concat(itemList);

      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }
      this._items.splice(this._maxItems);
      this.emit('update', this._items);
    },
    appendItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      this._items = this._items.concat(itemList);

      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }
      this._items.splice(this._maxItems);
      this.emit('update', this._items);
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    _onDeflistAdd: function(watchId) {
      if (this._videoListView.isUpdatingDeflist()) { return; }

      var videoListView = this._videoListView;
      var unlock = function() {
        videoListView.setIsUpdatingDeflist(false, watchId);
      };

      videoListView.setIsUpdatingDeflist(true, watchId);

      var timer = window.setTimeout(unlock, 10000);

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addDeflistItem(watchId)
        .then(function(result) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message);
      }, function(err) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message);
      });
    }
  });
 
/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var VideoListView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  VideoListView.__css__ = ZenzaWatch.util.hereDoc(function() {/*

  */});

  VideoListView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">
</style>
<style id="listItemStyle">%CSS%</style>
<body>
<div id="listContainer">
</div>
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>

  */});

  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  _.assign(VideoListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder;
      this._itemCss     = params.itemCss;
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._itemViews = [];
      this._maxItems = params.max || 100;

      this._initializeView(params, 0);
    },
    _initializeView: function(params, retryCount) {
      var html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);

      var iframe = this._getIframe();
      iframe.className = 'videoListFrame';

      var onLoad = _.bind(this._onIframeLoad, this);
      var onResize = _.bind(this._onResize, this);
      var onScroll = _.bind(this._onScroll, this);
      var self = this;

      iframe.onload = function() {
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
            self._initializeView(params, retryCount + 1);
          }
          return;
        }

        self._view = iframe;

        win.addEventListener('resize', function() {
          var w = win.innerWidth, h = win.innerHeight;
          onResize(w, h);
        });
        win.addEventListener('scroll', function() {
          onScroll(doc.body.scrollTop, doc.body.scrollLeft);
        });

        onLoad(win);
      };

      this._$container.append(iframe);
      iframe.srcdoc = html;
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
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      this._$window = $(w);
      var $body = this._$body = $(doc.body);
      var $list = this._$list = $(doc.getElementById('listContainer'));
      if (this._html) {
        $list.html(this._html);
      }
      $body.on('click', _.bind(this._onClick, this));
      $body.on('keydown', function(e) {
        ZenzaWatch.emitter.emit('keydown', e);
      });
    },
    _onClick: function(e) {
      e.stopPropagation();
      var $target = $(e.target).closest('.command');
      if ($target.length > 0) {
        e.stopPropagation();
        e.preventDefault();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        switch (command) {
          case 'deflistAdd':
            this.emit('deflistAdd', param);
            break;
          case 'playlistAdd':
            this.emit('playlistAdd', param);
            break;
          case 'scrollToTop':
            this.scrollTop(0, 300);
            break;
          default:
            this.emit('command', command, param);
        }
      }
    },
    _onResize: function(width, height) {
      //window.console.log('resize videoList', width, height);
    },
    _onScroll: function(top, left) {
      //window.console.log('scroll videoList', top, left);
    },
    _updateView: function() {
      if (!this._$list) {
        return;
      }
      //var scrollTop = this.scrollTop();
      //var before = this._$list.innerHeight();
      this.addClass('updating');
      this.scrollTop(0);
      ZenzaWatch.util.callAsync(function() {
        this._$list.html(this._html);
      }, this, 0);

      ZenzaWatch.util.callAsync(function() {
       // var after  = this._$list.innerHeight();
       // var diff = after - before;
       // // なるべく元のスクロール位置を維持
       // if (diff > 0) {
       //   this.scrollTop(Math.max(0, scrollTop + diff));
       // } else {
       //   this.scrollTop(0);
       // }
        this.removeClass('updating');
        this.emit('update');
      }, this, 100);
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      _.each(itemList, _.bind(function(item) {
        this._itemViews.unshift(new this._ItemBuilder({item: item}));
      }, this));
      this._html = this._itemViews.join('');
      this._updateView();
    },
    insertItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }
      itemList.reverse();
      _.each(itemList, _.bind(function(item) {
        this._itemViews.unshift(
          //this._ItemBuilder.build(item)
          new this._ItemBuilder({item: item})
        );
      }, this));

      this._itemViews =
        _.uniq(this._itemViews, false, function(item) { return item.getWatchId(); });
      //this._itemViews = _.uniq(this._itemViews, 'watchId');
      this._itemViews.splice(this._maxItems);
      this._html = this._itemViews.join('');
      this._updateView();
    },
    appendItem: function(itemList) {
      itemList = typeof itemList.length === 'number' ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      _.each(itemList, _.bind(function(item) {
        this._itemViews.push(
          this._ItemBuilder.build(item)
        );
      }, this));

      this._itemViews =
        _.uniq(this._itemViews, false, function(item) { return item.getWatchId(); });
      //this._itemViews = _.uniq(this._itemViews, 'watchId');
      this._itemViews.splice(this._maxItems);
      this._html = this._itemViews.join('');
      this._updateView();
    },
    isUpdatingDeflist: function() {
      if (!this._$body) { return false; }
      return this._$body.hasClass('updatingDeflist');
    },
    setIsUpdatingDeflist: function(v, watchId) {
      this.toggleClass('updatingDeflist', v);
      if (v) {
        this._$body.find('.videoItem.watch' + watchId).addClass('updatingDeflist');
      } else {
        this._$body.find('.videoItem').removeClass('updatingDeflist');
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
      if (!this._$window) { return 0; }
      if (typeof v === 'number') {
        this._$window.scrollTop(v);
      } else {
        return this._$window.scrollTop();
      }
    },
    scrollToItem: function(watchId) {
      var $target = this._$body.find('.watch' + watchId);
      if ($target.length < 1) { return; }
      var top = $target.offset().top;
      this.scrollTop(top);
    }
  });

  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);
  VideoListItemView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    * {
      box-sizing: border-box;
    }

    body {
      background: #333;
    }

    .scrollToTop {
      position: fixed;
      width: 32px;
      height: 32px;
      right: 8px;
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

    body.updatingDeflist {
    }


    .videoItem {
      position: relative;
      display: inline-block;
      width: 100%;
      min-height: 88px;
      overflow: hidden;
    }

    .updatingDeflist .videoItem.updatingDeflist {
      opacity: 0.5;
      cursor: wait;
    }


    .videoItem + .videoItem {
      border-top: 1px dotted #888;
      margin-top: 16px;
      outline-offset: 8px;
    }

    .videoItem .thumbnailContainer {
      position: absolute;
      top: 0;
      left: 0;
      width:  96px;
      height: 72px;
      margin: 8px 0;
    }
    .videoItem .thumbnailContainer .thumbnail {
      width:  96px;
      height: 72px;
    }

    .videoItem .thumbnailContainer .deflistAdd {
      position: absolute;
      display: none;
      right: 0;
      bottom: 0;
      color: #fff;
      background: #666;
      width: 24px;
      height: 20px;
      line-height: 18px;
      font-size: 14px;
      box-sizing: border-box;
      text-align: center;

      color: #fff;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .videoItem:hover .thumbnailContainer .deflistAdd {
      display: inline-block;
      border: 1px outset;
    }
    .videoItem:hover .thumbnailContainer .deflistAdd:hover {
      transform: scale(1.5);
      box-shadow: 2px 2px 2px #000;
    }

    .videoItem:hover .thumbnailContainer .deflistAdd:active {
      transform: scale(0.9);
      border: 1px inset;
    }

    .videoItem.updatingDeflist .thumbnailContainer .deflistAdd {
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
      top: 0;
      margin-left: 104px;
    }

    .videoItem .postedAt {
      font-size: 12px;
      color: #ccc;
    }

    .videoItem .videoLink {
      font-size: 14px;
      color: #ff9;
    }
    .videoItem .videoLink:visited {
      color: #ffd;
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

  */});

  VideoListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoItem %className% watch%watchId%" data-watch-id="%watchId%">
      <div class="thumbnailContainer">
        <a href="//www.nicovideo.jp/watch/%watchId%" class="command" data-command="open" data-param="%watchId%">
          <img class="thumbnail" data-src="%thumbnail%" src="%thumbnail%">
          <span class="duration">%duration%</span>
          <!--<span class="command playlistAdd" data-command="playlistAdd" data-param="%watchId%" title="プレイリストに追加">&#x271A;</span>-->
          <span class="command deflistAdd" data-command="deflistAdd" data-param="%watchId%" title="とりあえずマイリスト">&#x271A;</span>
        </a>
      </div>
      <div class="videoInfo">
        <div class="postedAt">%postedAt%</div>
        <div class="title">
          <a href="//www.nicovideo.jp/watch/%watchId%" class="command videoLink" data-command="open" data-param="%watchId%">
            %videoTitle%
          </a>
        </div>
        <div class="counter">
          <span class="count">再生: <span class="value">%viewCount%</span></span>
          <span class="count">コメ: <span class="value">%commentCount%</span></span>
          <span class="count">マイ: <span class="value">%mylistCount%</span></span>
        </div>
      </div>
    </div>
  */});

  _.assign(VideoListItemView.prototype, {
    initialize: function(params) {
      this.watchId = params.watchId;
      this._item = params.item;
    },
    build: function() {
      var tpl = VideoListItemView.__tpl__;
      var item = this._item;

      var count = item.getCount();
      tpl = tpl
        .replace(/%watchId%/g,    item.getWatchId())
        .replace(/%postedAt%/g,   item.getPostedAt())
        .replace(/%videoTitle%/g, item.getTitle())
        .replace(/%thumbnail%/g,  item.getThumbnail())
        .replace(/%duration%/g,   this._secToTime(item.getDuration()))
        .replace(/%viewCount%/g,     this._addComma(count.view))
        .replace(/%commentCount%/g,  this._addComma(count.comment))
        .replace(/%mylistCount%/g,   this._addComma(count.mylist))
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
      return m.toLocaleString ? m.toLocaleString() : m;
    }
  });

  var VideoListItem = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItem.prototype, AsyncEmitter.prototype);
  _.assign(VideoListItem.prototype, {
    initialize: function(rawWata) {
      this._rawData = rawWata;
    },
    _getData: function(key, defValue) {
      return this._rawData.hasOwnProperty(key) ?
        this._rawData[key] : defValue;
    },
    getTitle: function() {
      return this._getData('title', '');
    },
    getDuration: function() {
      return parseInt(this._getData('length_seconds', '0'), 10);
    },
    getWatchId: function() {
      return this._getData('id', '');
    },
    getCount: function() {
      return {
        comment: parseInt(this._rawData.num_res,        10),
        mylist:  parseInt(this._rawData.mylist_counter, 10),
        view:    parseInt(this._rawData.view_counter,   10)
      };
    },
    getThumbnail: function() {
      return this._rawData.thumbnail_url;
    },
    getBetterThumbnail: function() {
      var watchId = this.getWatchId();
      var hasLargeThumbnail = ZenzaWatch.util.hasLargeThumbnail(watchId);
      return this._rawData.thumbnail + (hasLargeThumbnail ? '.L' : '');
    },
    getPostedAt: function() {
      var fr = this._rawData.first_retrieve;
      return fr.replace(/-/g, '/');
    }
  });

  var RelatedVideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(RelatedVideoList.prototype, AsyncEmitter.prototype);
  _.assign(RelatedVideoList.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._isUniq = true;
      this._items = [];
      this._maxItems = 100;
    },
    _initializeView: function() {
      this._videoListView = new VideoListView({
        $container: this._$container,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });

      this._videoListView.on('command', _.bind(this._onCommand, this));
      this._videoListView.on('deflistAdd', _.bind(this._onDeflistAdd, this));

      this._videoListView.on('update', _.bind(function() {
        this._videoListView.scrollToItem(this._watchId);
      }, this));

    },
    update: function(listData, watchId) {
      if (!this._videoListView) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._videoListView.insertItem(items);
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    _onDeflistAdd: function(watchId) {
      if (this._videoListView.isUpdatingDeflist()) { return; }

      var videoListView = this._videoListView;
      var unlock = function() {
        videoListView.setIsUpdatingDeflist(false, watchId);
      };

      videoListView.setIsUpdatingDeflist(true, watchId);

      var timer = window.setTimeout(unlock, 10000);

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addDeflistItem(watchId)
        .then(function(result) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message);
      }, function(err) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message);
      });
    }
   });

  var PlayListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(PlayListModel.prototype, VideoListModel.prototype);
  _.assign(PlayListModel.prototype, {
    initialize: function() {
    },
    initializeView: function() {
      this._videoListView = new VideoListView({
        $container: this._$container,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._videoListView.on('command', _.bind(function(command, param) {
        this.emit('command', command, param);
      }, this));

      this._videoListView.on('deflistAdd', _.bind(this._onDeflistAdd, this));

      this._videoListView.on('update', _.bind(function() {
        this._videoListView.scrollToItem(this._watchId);
      }, this));
    },
    isActive: function() {
      return this._isActive;
    },
    shuffle: function() {
    },
    insertNext: function(watchId) {
    },
    append: function(watchId) {
    },
    goToNext: function() {
    }
    
  });





  var NicoVideoPlayerDialog = function() { this.initialize.apply(this, arguments); };
  NicoVideoPlayerDialog.__css__ = ZenzaWatch.util.hereDoc(function() {/*

    {*
      プレイヤーが動いてる間、裏の余計な物のマウスイベントを無効化
      多少軽量化が期待できる？
    *}
    body.showNicoVideoPlayerDialog.zenzaScreenMode_big>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_normal>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_wide>.container,
    body.showNicoVideoPlayerDialog.zenzaScreenMode_3D>.container {
      pointer-events: none;
    }
    body.showNicoVideoPlayerDialog .ads {
      display: none;
    }

    {* 大百科の奴 *}
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
      z-index: 100000;
      transition:
        width: 0.4s ease-in, height: 0.4s ease-in 0.4s,
        right 0.4s ease-in, bottom 0.4s ease-in;
    }
    .zenzaVideoPlayerDialog.show {
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
      z-index: 100001;
      box-shadow: 4px 4px 4px #000;
      transition: top 0.4s ease-in, left 0.4s ease-in;
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
      {* overflow: hidden; *}
      background: #000;
      width: 672px;
      height: 385px;
      {*transform: translateZ(0);*}
      transition: width 0.4s ease-in 0.4s, height 0.4s ease-in;
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center center;
    }
    .zenzaPlayerContainer.loading {
      cursor: wait;
    }
    .zenzaPlayerContainer:not(.loading):not(.error) {
      background-image: none !important;
      background: #000 !important;
    }
    .zenzaPlayerContainer.loading .videoPlayer,
    .zenzaPlayerContainer.loading .commentLayerFrame,
    .zenzaPlayerContainer.error .videoPlayer,
    .zenzaPlayerContainer.error .commentLayerFrame {
      display: none;
    }



    .zenzaScreenMode_3D       .zenzaPlayerContainer,
    .zenzaScreenMode_sideView .zenzaPlayerContainer,
    .zenzaScreenMode_small    .zenzaPlayerContainer,
    .fullScreen               .zenzaPlayerContainer {
      transition: none !important;
    }

    .fullScreen .zenzaPlayerContainer {
      transform: translateZ(0);
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
      cursor: none;
      transform: translateZ(0);
      background: #000;
    }

    .zenzaPlayerContainer .videoPlayer.loading {
      cursor: wait;
    }
    .mouseMoving .videoPlayer {
      cursor: auto;
    }


    .zenzaScreenMode_3D .zenzaPlayerContainer .videoPlayer {
      transform: perspective(600px) rotateX(10deg);
      height: 100%;
    }

    .zenzaScreenMode_3D .zenzaPlayerContainer .commentLayerFrame {
      transform: perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
      opacity: 1;
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
      transition: opacity 1s ease, height 0.4s ease;
      pointer-events: none;
      transform: translateZ(0);
      cursor: none;
    }
    .zenzaScreenMode_3D       .zenzaPlayerContainer .commentLayerFrame,
    .zenzaScreenMode_sideView .zenzaPlayerContainer .commentLayerFrame,
    .zenzaScreenMode_small    .zenzaPlayerContainer .commentLayerFrame,
    .fullScreen .zenzaPlayerContainer .commentLayerFrame {
      transition: none !important;
    }

    .zenzaScreenMode_small  .zenzaPlayerContainer.backComment .commentLayerFrame,
    .zenzaScreenMode_normal .zenzaPlayerContainer.backComment .commentLayerFrame,
    .zenzaScreenMode_big    .zenzaPlayerContainer.backComment .commentLayerFrame {
      top:  calc(-50vh + 50%);
      left: calc(-50vw + 50%);
      width:  100vw;
      height: calc(100vh - 40px);
      right: auto;
      bottom: auto;
      z-index: 1;
    }
    .zenzaScreenMode_small  .zenzaPlayerContainer.backComment .commentLayerFrame {
      top:  0;
      left: 0;
      width:  100vw;
      height: 100vh;
      right: auto;
      bottom: auto;
      z-index: 1;
    }

    .mouseMoving .commentLayerFrame {
      {* height: calc(100% - 50px); *}
      cursor: auto;
    }



    {*    .zenzaScreenMode_wide .videoPlayer,
    .zenzaScreenMode_wide .commentLayerFrame,*}
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

    .zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame,
    .fullScreen           .showVideoControlBar .videoPlayer,
    .fullScreen           .showVideoControlBar .commentLayerFrame {
      top:  0 !important;
      left: 0 !important;
      width:  100% !important;
      height: calc(100% - 40px) !important;
      right:  0 !important;
      bottom: 40px !important;
      border: 0 !important;
      z-index: 100 !important;
    }

    .zenzaScreenMode_wide .showComment.backComment .videoPlayer,
    .fullScreen           .showComment.backComment .videoPlayer
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

    .showComment.backComment .videoPlayer {
      opacity: 0.90;
    }

    .showComment.backComment .videoPlayer:hover {
      opacity: 1;
    }


    .fullScreen.zenzaScreenMode_3D .zenzaPlayerContainer .videoPlayer {
      transform: perspective(700px) rotateX(10deg);
      margin-top: -5%;
    }

    body.zenzaScreenMode_sideView {
      margin-left: 424px;
      margin-top: 76px;

      width: auto;
    }
    body.zenzaScreenMode_sideView.nofix:not(.fullScreen) {
      margin-top: 40px;
    }
    body.zenzaScreenMode_sideView #siteHeader {
    }
    body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
      margin-left: 400px;
      {*z-index: 110000;*}
      width: auto;
      top: 40px;
    }
    body.zenzaScreenMode_sideView:not(.nofix) #siteHeader #siteHeaderInner {
      width: auto;
    }

    body.zenzaScreenMode_normal,
    body.zenzaScreenMode_big,
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
      width: 400px;
      height: 225px;
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
    .zenzaScreenMode_big .zenzaPlayerContainer .videoPlayer {
      {* width: 95.31%; left: 2.34%; *}
    }

    .zenzaScreenMode_big .zenzaPlayerContainer {
      width: 896px;
      height: 480px;
    }

    .zenzaScreenMode_wide .zenzaPlayerContainer {
      left: 0;
      width: 100vw;
      height: 100vh;
      box-shadow: none;
    }

    .zenzaScreenMode_small .videoPlayer,
    .zenzaScreenMode_wide  .videoPlayer {
      left: 0;
      width: 100%;
    }

    .zenzaScreenMode_wide  .backComment .videoPlayer {
      left: 25%;
      top:  25%;
      width:  50%;
      height: 50%;
      z-index: 102;
    }

    {* 右パネル分の幅がある時は右パネルを出す *}
    @media screen and (min-width: 992px) {
      .zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
        padding-right: 320px;
        background: none;
      }
    }

    @media screen and (min-width: 1216px) {
      .zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
        padding-right: 320px;
        background: none;
      }
    }

    {* 縦長モニター *}
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


    {* 960x540 *}
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

    {* 1152x648 *}
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


    {* 1280x720 *}
    @media screen and
      (min-width: 1664px) and (min-height: 900px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1280px * 1.05);
        height: 720px;
      }
    }

    {* 1920x1080 *}
    @media screen and
      (min-width: 2336px) and (min-height: 1200px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1920px * 1.05);
        height: 1080px;
      }
    }


    .loadingMessageContainer {
      display: none;
      pointer-events: none;
    }
    .zenzaPlayerContainer.loading .loadingMessageContainer {
      display: inline-block;
      position: absolute;
      z-index: 110000;
      right: 8px;
      bottom: 8px;
      font-size: 24px;
      color: #ccc;
      text-shadow: 0 0 8px #003;
      font-family: serif;
      letter-spacing: 2px;
      {*animation-name: loadingVideo;*}
      {*background: rgba(0, 0, 0, 0.5);*}
    }

    @keyframes spin {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(-1800deg); }
    }

    .zenzaPlayerContainer.loading .loadingMessageContainer::before,
    .zenzaPlayerContainer.loading .loadingMessageContainer::after {
      display: inline-block;
      text-align: center;
      content: '\00272A';
      font-size: 18px;
      line-height: 24px;
      animation-name: spin;
      animation-iteration-count: infinite;
      animation-duration: 5s;
      animation-timing-function: linear;
    }
    .zenzaPlayerContainer.loading .loadingMessageContainer::after {
      animation-direction: reverse;
    }


    .errorMessageContainer {
      display: none;
      pointer-events: none;
    }
    .zenzaPlayerContainer.error .errorMessageContainer {
      display: inline-block;
      position: absolute;
      z-index: 110000;
      top: 50%;
      left: 50%;
      padding: 8px 16px;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      font-size: 24px;
      box-shadow: 8px 8px 4px rgba(128, 0, 0, 0.8);
      white-space: nowrap;
    }

  */});

  NicoVideoPlayerDialog.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaVideoPlayerDialog">
      <div class="zenzaVideoPlayerDialogInner">
        <div class="menuContainer"></div>
        <div class="zenzaPlayerContainer">

          <div class="popupMessageContainer"></div>
          <div class="errorMessageContainer"></div>
          <div class="loadingMessageContainer">動画読込中</div>
        </div>
      </div>
    </div>
  */});

  _.extend(NicoVideoPlayerDialog.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayerDialog.prototype, {
    initialize: function(params) {
      this._offScreenLayer = params.offScreenLayer;
      this._playerConfig = params.playerConfig;
      this._keyEmitter = params.keyHandler || ShortcutKeyEmitter;

      this._playerConfig.on('update-screenMode', _.bind(this._updateScreenMode, this));
      this._initializeDom(params);

      this._keyEmitter.on('keyDown', _.bind(this._onKeyDown, this));

      this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));

      this._aspectRatio = 9 / 16;

      this._escBlockExpiredAt = -1;

      this._dynamicCss = new DynamicCss({playerConfig: params.playerConfig});
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(NicoVideoPlayerDialog.__css__);
      var $dialog = this._$dialog = $(NicoVideoPlayerDialog.__tpl__);

      this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
      this._$playerContainer.on('click', _.bind(function(e) {
        ZenzaWatch.emitter.emitAsync('hideHover');
        if (this._playerConfig.getValue('enableTogglePlayOnClick')) {
          this.togglePlay();
        }
        e.preventDefault();
        e.stopPropagation();
      }, this));

      this.setIsBackComment(this._playerConfig.getValue('backComment'));
      this._$playerContainer.toggleClass('showComment',
        this._playerConfig.getValue('showComment'));
      this._$playerContainer.toggleClass('mute',
        this._playerConfig.getValue('mute'));
      this._$playerContainer.toggleClass('loop',
        this._playerConfig.getValue('loop'));
      this._$playerContainer.toggleClass('debug',
        this._playerConfig.getValue('debug'));


      // マウスを動かしてないのにmousemoveが飛んでくるのでねずみかます
      var lastX = 0, lastY = 0;
      var onMouseMove    = _.bind(this._onMouseMove, this);
      var onMouseMoveEnd = _.debounce(_.bind(this._onMouseMoveEnd, this), 1500);
      this._$playerContainer.on('mousemove', _.bind(function(e) {
          if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
            return;
          }
          lastX = e.screenX;
          lastY = e.screenY;
          onMouseMove(e);
          onMouseMoveEnd(e);
        }, this))
      .on('mouseown', onMouseMove)
      .on('mouseown', onMouseMoveEnd);

      $dialog.on('click', _.bind(this._onClick, this));

      this._hoverMenu = new VideoHoverMenu({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig
      });
      this._hoverMenu.on('command', _.bind(this._onCommand, this));

      this._commentInput = new CommentInputPanel({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig
      });
      this._commentInput.on('post', _.bind(function(e, chat, cmd) {
        this.addChat(chat, cmd).then(function() {
          e.resolve();
        }, function() {
          e.reject();
        });
      }, this));

      var isPlaying = false;
      this._commentInput.on('focus', _.bind(function(isAutoPause) {
        isPlaying = this._nicoVideoPlayer.isPlaying();
        if (isAutoPause) {
          this.pause();
        }
      }, this));
      this._commentInput.on('blur', _.bind(function(isAutoPause) {
        if (isAutoPause && isPlaying && this._isOpen) {
          this.play();
        }
      }, this));
      this._commentInput.on('esc', _.bind(function() {
        this._escBlockExpiredAt = Date.now() + 1000 * 2;
      }, this));

      this._settingPanel = new SettingPanel({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig,
        player: this
      });
      this._settingPanel.on('command', _.bind(this._onCommand, this));

      this._videoControlBar = new VideoControlBar({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig,
        player: this
      });
      this._videoControlBar.on('command', _.bind(this._onCommand, this));

      this._$errorMessageContainer = this._$playerContainer.find('.errorMessageContainer');

      this._initializeResponsive();
      $('body').append($dialog);
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
        volume:        config.getValue('volume'),
        loop:          config.getValue('loop'),
        enableFilter:  config.getValue('enableFilter'),
        wordFilter:    config.getValue('wordFilter'),
        commandFilter: config.getValue('commandFilter'),
        userIdFilter:  config.getValue('userIdFilter')
      });

      this._messageApiLoader = new MessageApiLoader();

      window.setTimeout(_.bind(function() {
        this._videoInfoPanel = new VideoInfoPanel({
          dialog: this,
          player: nicoVideoPlayer,
          node: this._$playerContainer
        });
        this._videoInfoPanel.on('command', _.bind(this._onCommand, this));
      }, this), 0);

      nicoVideoPlayer.on('loadedMetaData', _.bind(this._onLoadedMetaData, this));
      nicoVideoPlayer.on('ended',          _.bind(this._onVideoEnded,     this));
      nicoVideoPlayer.on('canPlay',        _.bind(this._onVideoCanPlay,   this));
      nicoVideoPlayer.on('play',           _.bind(this._onVideoPlay,           this));
      nicoVideoPlayer.on('pause',          _.bind(this._onVideoPause,          this));
      nicoVideoPlayer.on('playing',        _.bind(this._onVideoPlaying,        this));
      nicoVideoPlayer.on('stalled',        _.bind(this._onVideoStalled,        this));
      nicoVideoPlayer.on('progress',       _.bind(this._onVideoProgress,       this));
      nicoVideoPlayer.on('aspectRatioFix', _.bind(this._onVideoAspectRatioFix, this));
      nicoVideoPlayer.on('commentParsed',  _.bind(this._onCommentParsed, this));
      nicoVideoPlayer.on('commentChange',  _.bind(this._onCommentChange, this));
      nicoVideoPlayer.on('commentFilterChange', _.bind(this._onCommentFilterChange, this));

      nicoVideoPlayer.on('error', _.bind(this._onVideoError, this));
      nicoVideoPlayer.on('abort', _.bind(this._onVideoAbort, this));

      nicoVideoPlayer.on('volumeChange',
        _.bind(this._onVolumeChange, this));
      nicoVideoPlayer.on('volumeChange',
        _.debounce(_.bind(this._onVolumeChangeEnd, this), 1500));

      return nicoVideoPlayer;
    },
    _initializeResponsive: function() {
      $(window).on('resize', _.debounce(_.bind(this._updateResponsive, this),  500));
    },
    _updateResponsive: function() {
      var $w = $(window);
      var self = this;
      var $container = self._$playerContainer;
      var $bar    = $container.find('.videoControlBar');
      var $header = $container.find('.zenzaWatchVideoHeaderPanel');

      // 画面の縦幅にシークバー分の余裕がある時は常時表示
      var update = function() {
        var w = $w.innerWidth(), h = $w.innerHeight();
        var videoControlBarHeight = $bar.outerHeight();
        var vMargin = h - w * self._aspectRatio;
        //var hMargin = w - h / self._aspectRatio;

        $container
          .toggleClass('showVideoControlBar',
            vMargin >= videoControlBarHeight)
          .toggleClass('showVideoHeaderPanel',
            vMargin >= videoControlBarHeight + $header.outerHeight() * 2);
      };

      update();
    },
    execCommand: function(command, param) {
      this._onCommand(command, param);
    },
    _onCommand: function(command, param) {
      var v;
      console.log('command: %s param: %s', command, param, typeof param);
      switch(command) {
        case 'volume':
          this.setVolume(param);
          break;
        case 'togglePlay':
            this.togglePlay();
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
          this._nicoVideoPlayer.toggleFullScreen();
          break;
        case 'deflistAdd':
          this._onDeflistAdd();
          break;
        case 'mylistAdd':
          this._onMylistAdd(param.mylistId, param.mylistName);
          break;
        case 'mylistWindow':
          ZenzaWatch.util.openMylistWindow(this._videoInfo.getWatchId());
          break;
        case 'settingPanel':
          this._settingPanel.toggle();
          break;
        case 'seek':
          this.setCurrentTime(param * 1);
          break;
        case 'seekBy':
          this.setCurrentTime(this.getCurrentTime() + param * 1);
          break;
        case 'addWordFilter':
          this._nicoVideoPlayer.addWordFilter(param);
          PopupMessage.notify('NGワード追加: ' + param);
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
        case 'setIsCommentFilterEnable':
          this._nicoVideoPlayer.setIsCommentFilterEnable(param);
          break;
        case 'tweet':
          this.openTweetWindow(this._videoInfo);
          break;
        case 'open':
          this.open(param);
          break;
        case 'close':
          this.close(param);
          break;
        case 'baseFontFamily':
        case 'baseChatScale':
        case 'enableFilter':
        case 'playbackRate':
        case 'screenMode':
        case 'sharedNgLevel':
          this._playerConfig.setValue(command, param);
          break;
      }
    },
    _onKeyDown: function(name , e, param) {
      if (!this._isOpen) {
        return;
      }
      var v;
      switch (name) {
        case 'SPACE':
        case 'PAUSE':
          this._nicoVideoPlayer.togglePlay();
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
          // 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
          ZenzaWatch.util.callAsync(function() { this._commentInput.focus(); }, this);
          break;
        case 'DEFLIST':
          this._onDeflistAdd();
          break;
        case 'VIEW_COMMENT':
          v = this._playerConfig.getValue('showComment');
          this._playerConfig.setValue('showComment', !v);
          break;
        case 'MUTE':
          v = this._playerConfig.getValue('mute');
          this._playerConfig.setValue('mute', !v);
          break;
        case 'VOL_UP':
          this._nicoVideoPlayer.volumeUp();
          break;
        case 'VOL_DOWN':
          this._nicoVideoPlayer.volumeDown();
          break;
        case 'SEEK':
          var c = this._nicoVideoPlayer.getCurrentTime();
          this._nicoVideoPlayer.setCurrentTime(c + param);
          break;
      }
      var screenMode = this._playerConfig.getValue('screenMode');
      if (!_.contains(['small', 'sideView'], screenMode)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'backComment':
          this.setIsBackComment(value);
          break;
        case 'showComment':
          PopupMessage.notify('コメント表示: ' + (value ? 'ON' : 'OFF'));
          this._$playerContainer.toggleClass('showComment', value);
          break;
        case 'loop':
          PopupMessage.notify('リピート再生: ' + (value ? 'ON' : 'OFF'));
          this._$playerContainer.toggleClass('loop', value);
          break;
        case 'mute':
          PopupMessage.notify('ミュート: ' + (value ? 'ON' : 'OFF'));
          this._$playerContainer.toggleClass('mute', value);
          break;
        case 'sharedNgLevel':
          PopupMessage.notify('NG共有: ' +
            {'HIGH': '強', 'MID': '中', 'LOW': '弱', 'NONE': 'なし'}[value]);
          break;
        case 'debug':
          this._$playerContainer.toggleClass('debug', value);
          PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
          break;
        case 'enableFilter':
          PopupMessage.notify('NG設定: ' + (value ? 'ON' : 'OFF'));
          this._nicoVideoPlayer.setIsCommentFilterEnable(value);
          break;
        case 'wordFilter':
          this._nicoVideoPlayer.setWordFilterList(value);
          break;
        case 'userIdFilter':
          this._nicoVideoPlayer.setUserIdFilterList(value);
          break;
        case 'commandFilter':
          this._nicoVideoPlayer.setCommandFilterList(value);
          break;
      }
    },
    setIsBackComment: function(v) {
      this._$playerContainer.toggleClass('backComment', !!v);
    },
    _onMouseMove: function() {
      this._$playerContainer.addClass('mouseMoving');
    },
    _onMouseMoveEnd: function() {
      this._$playerContainer.removeClass('mouseMoving');
    },
    _updateScreenMode: function(mode) {
      this._clearClass();
      var $container = this._$playerContainer.addClass('changeScreenMode');
      $('body, html').addClass('zenzaScreenMode_' + mode);
      window.setTimeout(function() {
        $container.removeClass('changeScreenMode');
      }, 1000);
    },
    _clearClass: function() {
      var modes = [
        'zenzaScreenMode_3D',
        'zenzaScreenMode_small',
        'zenzaScreenMode_sideView',
        'zenzaScreenMode_normal',
        'zenzaScreenMode_big',
        'zenzaScreenMode_wide',
      ].join(' ');
      $('body, html').removeClass(modes);
    },
    _onClick: function() {
    },
    _onDeflistAdd: function() {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingDeflist')) { return; } //busy

      var removeClass = function() {
        $container.removeClass('updatingDeflist');
      };

      $container.addClass('updatingDeflist');
      var timer = window.setTimeout(removeClass, 10000);

      var owner = this._videoInfo.getOwnerInfo();
      var watchId = this._videoInfo.getWatchId();
      var description =
        this._playerConfig.getValue('enableAutoMylistComment') ? ('投稿者: ' + owner.name) : '';
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addDeflistItem(watchId, description)
        .then(function(result) {
        window.clearTimeout(timer);
        timer = window.setTimeout(removeClass, 2000);
        PopupMessage.notify(result.message);
      }, function(err) {
        window.clearTimeout(timer);
        timer = window.setTimeout(removeClass, 2000);
        PopupMessage.alert(err.message);
      });
    },
    _onMylistAdd: function(groupId, mylistName) {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingMylist')) { return; } //busy

      var removeClass = function() {
        $container.removeClass('updatingMylist');
      };

      $container.addClass('updatingMylist');
      var timer = window.setTimeout(removeClass, 10000);

      var owner = this._videoInfo.getOwnerInfo();
      var watchId = this._videoInfo.getWatchId();
      var description =
        this._playerConfig.getValue('enableAutoMylistComment') ? ('投稿者: ' + owner.name) : '';
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addMylistItem(watchId, groupId, description)
        .then(function(result) {
        window.clearTimeout(timer);
        timer = window.setTimeout(removeClass, 2000);
        PopupMessage.notify(result.message + ': ' + mylistName);
      }, function(err) {
        window.clearTimeout(timer);
        timer = window.setTimeout(removeClass, 2000);
        PopupMessage.alert(err.message + ': ' + mylistName);
      });
    },
    _onCommentParsed: function() {
      this.emit('commentParsed');
      ZenzaWatch.emitter.emit('commentParsed');
    },
    _onCommentChange: function() {
      this.emit('commentChange');
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
    show: function() {
      this._$dialog.addClass('show');
      if (!FullScreen.now()) {
        $('body').removeClass('fullScreen');
      }
      $('body, html').addClass('showNicoVideoPlayerDialog');
      this._updateScreenMode(this._playerConfig.getValue('screenMode'));
      this._isOpen = true;
    },
    hide: function() {
      this._$dialog.removeClass('show');
      this._settingPanel.hide();
      $('body, html').removeClass('showNicoVideoPlayerDialog');
      this._clearClass();
      this._isOpen = false;
    },
    open: function(watchId, options) {
      if (!watchId) { return; }
      // 連打対策
      if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) { return; }

      window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);

      var nicoVideoPlayer = this._nicoVideoPlayer;
      if (!nicoVideoPlayer) {
        nicoVideoPlayer = this._initializeNicoVideoPlayer();
      } else {
        this._setThumbnail();
        nicoVideoPlayer.close();
        this._videoInfoPanel.clear();
      }

      this._$playerContainer.addClass('loading');
      this._$playerContainer.removeClass('playing stalled error abort');


      this._videoWatchOptions = options = options || {};

      this._playerConfig.setValue('lastPlayerId', this.getId());

      // watchIdからサムネイルを逆算できる時は最速でセットする
      var thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(watchId);
      if (thumbnail) {
        this._setThumbnail(thumbnail);
      }

      this._isCommentReady = false;
      this._watchId = watchId;
      this._requestId = Math.random();
      this._lastCurrentTime = 0;
      this._lastOpenAt = Date.now();
      this._hasError = false;
      window.console.time('VideoInfoLoader');

      this._bindLoaderEvents();
      VideoInfoLoader.load(watchId, options);

      this.show(options);
      if (this._playerConfig.getValue('autoFullScreen') && !ZenzaWatch.util.fullScreen.now()) {
        nicoVideoPlayer.requestFullScreen();
      }
      this.emit('open', watchId, options);
      ZenzaWatch.emitter.emitAsync('DialogPlayerOpen', watchId, options);
    },
    isOpen: function() {
      return this._isOpen;
    },
    reload: function(options) {
      //window.console.log('reload!');
      options = options || {};
      _.defaults(options, this._videoWatchOptions);
      
      if (this._lastCurrentTime > 0) {
        options.currentTime = this._lastCurrentTime;
      }
      this.open(this._watchId, options);
    },
    getCurrentTime: function() {
      if (!this._nicoVideoPlayer) {
        return 0;
      }
      if (!this._hasError) {
        this._lastCurrentTime = this._nicoVideoPlayer.getCurrentTime();
      }
      return this._lastCurrentTime;
    },
    setCurrentTime: function(sec) {
      if (!this._nicoVideoPlayer) {
        return;
      }
      this._nicoVideoPlayer.setCurrentTime(sec);
    },
    getId: function() {
      return this._id;
    },
    /**
     *  ロード時のイベントを貼り直す
     */
    _bindLoaderEvents: function() {
      if (this._onVideoInfoLoaderLoad_proxy) {
        VideoInfoLoader.off('load', this._onVideoInfoLoaderLoad_proxy);
        VideoInfoLoader.off('fail', this._onVideoInfoLoaderFail_proxy);
      }
      this._onVideoInfoLoaderLoad_proxy = _.bind(this._onVideoInfoLoaderLoad, this, this._requestId);
      this._onVideoInfoLoaderFail_proxy = _.bind(this._onVideoInfoLoaderFail, this, this._requestId);
      VideoInfoLoader.on('load', this._onVideoInfoLoaderLoad_proxy);
      VideoInfoLoader.on('fail', this._onVideoInfoLoaderFail_proxy);
    },
    _onVideoInfoLoaderLoad: function(requestId, videoInfo, type, watchId) {
      window.console.timeEnd('VideoInfoLoader');
      console.log('VideoInfoLoader.load!', requestId, watchId, type, videoInfo);
      if (this._requestId !== requestId) {
        return;
      }

      if (type !== 'WATCH_API') {
        this._setThumbnail(videoInfo.thumbImage);
        this._nicoVideoPlayer.setVideo(videoInfo.url);
        this._videoInfo = {};

        this._threadId = videoInfo.thread_id;

        this._messageApiLoader.load(
          videoInfo.ms,
          videoInfo.thread_id,
          videoInfo.l,
          videoInfo.user_id,
          videoInfo.needs_key === '1',
          videoInfo.optional_thread_id
        ).then(
          _.bind(this._onCommentLoadSuccess, this, requestId),
          _.bind(this._onCommentLoadFail, this, requestId)
        );

        this._$playerContainer.addClass('noVideoInfoPanel');

      } else {
        var flvInfo   = videoInfo.flvInfo;
        var videoUrl  = flvInfo.url;

        this._videoInfo = new VideoInfoModel(videoInfo);
        this._setThumbnail(videoInfo.thumbnail);
        this._nicoVideoPlayer.setVideo(videoUrl);
        this._nicoVideoPlayer.setVideoInfo(this._videoInfo);

        this._threadId = flvInfo.thread_id;

        this._messageApiLoader.load(
          flvInfo.ms,
          flvInfo.thread_id,
          flvInfo.l,
          flvInfo.user_id,
          flvInfo.needs_key === '1',
          flvInfo.optional_thread_id,
          flvInfo.userkey
        ).then(
          _.bind(this._onCommentLoadSuccess, this, requestId),
          _.bind(this._onCommentLoadFail, this, requestId)
        );

        this.emit('loadVideoInfo', this._videoInfo);
        if (this._videoInfoPanel) {
          this._videoInfoPanel.update(this._videoInfo);
        }
      }

      ZenzaWatch.emitter.emitAsync('loadVideoInfo', videoInfo, type);
    },
    _onVideoInfoLoaderFail: function(requestId, watchId, e) {
      window.console.timeEnd('VideoInfoLoader');
      if (this._requestId !== requestId) {
        return;
      }
      var message = e.message;
      this._setErrorMessage(message);
      this._hasError = true;
      if (e.info) {
        this._videoInfo = new VideoInfoModel(e.info);
        var thumbnail = this._videoInfo.getBetterThumbnail();
        this._setThumbnail(thumbnail);
      }
      if (e.info && this._videoInfoPanel) {
        this._videoInfoPanel.update(this._videoInfo);
      }
      this._$playerContainer.removeClass('loading').addClass('error');
      ZenzaWatch.emitter.emitAsync('loadVideoInfoFail');
    },
    _setThumbnail: function(thumbnail) {
      if (thumbnail) {
        this._$playerContainer.css('background-image', 'url(' + thumbnail + ')');
        //this._nicoVideoPlayer.setThumbnail(thumbnail);
      } else {
        this._$playerContainer.css('background-image', '');
      }
    },
    _setErrorMessage: function(msg) {
      this._$errorMessageContainer.text(msg);
    },
    _onCommentLoadSuccess: function(requestId, result) {
      if (requestId !== this._requestId) {
        return;
      }
      PopupMessage.notify('コメント取得成功');
      this._nicoVideoPlayer.setComment(result.xml);
      this._threadInfo = result.threadInfo;
      this._isCommentReady = true;
      this.emit('commentReady', result);
    },
    _onCommentLoadFail: function(requestId, e) {
      if (requestId !== this._requestId) {
        return;
      }
      PopupMessage.alert(e.message);
    },
    _onLoadedMetaData: function() {
      // パラメータで開始秒数が指定されていたらそこにシーク
      if (this._videoWatchOptions.currentTime) {
        this._nicoVideoPlayer.setCurrentTime(this._videoWatchOptions.currentTime);
      }
    },
    _onVideoCanPlay: function() {
      window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
      this._$playerContainer.removeClass('stalled loading');
      this.emitAsync('canPlay', this._watchId, this._videoInfo);

      if (this._playerConfig.getValue('autoPlay')) {
        this.play();
      }
    },
    _onVideoPlay: function() {
      this._$playerContainer.addClass('playing');
      this._$playerContainer.removeClass('stalled loading error abort');
      this.emit('play');
    },
    _onVideoPlaying: function() {
      this._$playerContainer.addClass('playing');
      this._$playerContainer.removeClass('stalled loading error abort');
      this.emit('playing');
    },
    _onVideoPause: function() {
      this._$playerContainer.removeClass('playing');
      this.emit('pause');
    },
    _onVideoStalled: function() {
      // stallは詰まっているだけでありplayingなので、removeClassしない
      this._$playerContainer.addClass('stalled');
      this.emit('stalled');
    },
    _onVideoProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onVideoError: function() {
      this._hasError = true;
      this._$playerContainer.addClass('error');
      this._$playerContainer.removeClass('playing loading');
      this.emit('error');
      // 10分以上たってエラーになるのはセッション切れ(nicohistoryの有効期限)
      // と思われるので開き直す
      if (Date.now() - this._lastOpenAt > 10 * 60 * 1000) {
        this.reload();
      } else {
        if (this._videoInfo &&
            (!this._videoWatchOptions.economy && !this._videoInfo.isEconomy())
          ) {
          this._setErrorMessage('動画の再生に失敗しました。エコノミー回線に接続します。');
          ZenzaWatch.util.callAsync(function() {
            this.reload({economy: true});
          }, this, 3000);
        } else {
          this._setErrorMessage('動画の再生に失敗しました。');
        }
      }
    },
    _onVideoAbort: function() {
      this._$playerContainer.addClass('abort');
      this._$playerContainer.removeClass('playing loading');
      this.emit('abort');
    },
    _onVideoAspectRatioFix: function(ratio) {
      this._aspectRatio = ratio;
      this._updateResponsive();
      this.emit('aspectRatioFix', ratio);
    },
    _onVideoEnded: function() {
      // ループ再生中は飛んでこない
      this.emit('ended');
      var isAutoCloseFullScreen =
        this._videoWatchOptions.hasOwnProperty('autoCloseFullScreen') ?
          this._videoWatchOptions.autoCloseFullScreen :
          this._playerConfig.getValue('autoCloseFullScreen');
      if (FullScreen.now() && isAutoCloseFullScreen) {
        FullScreen.cancel();
      }
      ZenzaWatch.emitter.emitAsync('videoEnded');

    },
    _onVolumeChange: function(vol, mute) {
      this._$playerContainer.addClass('volumeChanging');
      this.emit('volumeChange', vol, mute);
    },
    _onVolumeChangeEnd: function(vol, mute) {
      this._$playerContainer.removeClass('volumeChanging');
      this.emit('volumeChangeEnd', vol, mute);
    },
    close: function() {
      if (FullScreen.now()) {
        FullScreen.cancel();
      }
      this.hide();
      this._refresh();
      this.emit('close');
      ZenzaWatch.emitter.emitAsync('DialogPlayerClose');
    },
    _refresh: function() {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.close();
      }
      if (this._onVideoInfoLoaderLoad_proxy) {
        VideoInfoLoader.off('load', this._onVideoInfoLoaderLoad_proxy);
        this._onVideoInfoLoaderLoad_proxy = null;
      }
    },
    play: function() {
      if (!this._hasError && this._nicoVideoPlayer) {
        this._nicoVideoPlayer.play();
      }
    },
    pause: function() {
      if (!this._hasError && this._nicoVideoPlayer) {
        this._nicoVideoPlayer.pause();
      }
    },
    isPlaying: function() {
      if (!this._hasError && this._nicoVideoPlayer) {
        return this._nicoVideoPlayer.isPlaying();
      }
      return false;
    },
    togglePlay: function() {
      if (!this._hasError && this._nicoVideoPlayer) {
        this._nicoVideoPlayer.togglePlay();
      }
    },
     setVolume: function(v) {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.setVolume(v);
      }
    },
    addChat: function(text, cmd, vpos, options) {
      var $container = this._$playerContainer;
      if (!this._nicoVideoPlayer ||
          !this._messageApiLoader ||
          $container.hasClass('postChat') ||
          this._isCommentReady !== true) {
        return Promise.reject();
      }

      if (this._threadInfo.force184 !== '1') {
        cmd = '184 ' + cmd;
      }
      options = options || {};
      options.mine = '1';
      options.updating = '1';
      vpos = vpos || this._nicoVideoPlayer.getVpos();
      var nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);

      $container.addClass('postChat');

      var self = this;
      window.console.time('コメント投稿');
      var _onSuccess = function(result) {
        window.console.timeEnd('コメント投稿');
        nicoChat.setIsUpdating(false);
        PopupMessage.notify('コメント投稿成功');
        $container.removeClass('postChat');

        self._threadInfo.blockNo = result.blockNo;
        window.clearTimeout(timeout);
      };
      var _onFail = function(err) {
        window.console.timeEnd('コメント投稿');

        nicoChat.setIsPostFail(true);
        nicoChat.setIsUpdating(false);
        PopupMessage.alert(err.message);
        $container.removeClass('postChat');
        if (err.blockNo && typeof err.blockNo === 'number') {
          self._threadInfo.blockNo = err.blockNo;
        }
        window.clearTimeout(timeout);
      };

      var _onTimeout = function() {
        PopupMessage.alert('コメント投稿失敗(timeout)');
        $container.removeClass('postChat');
      };

      var timeout = window.setTimeout(_onTimeout, 30000);

      text = ZenzaWatch.util.escapeHtml(text);
      return this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos).then(
        _onSuccess,
        _onFail
      );
    },
    getDuration: function() {
      // 動画がプレイ可能≒メタデータパース済みの時はそちらの方が信頼できる
      if (this._nicoVideoPlayer.canPlay()) {
        return this._nicoVideoPlayer.getDuration();
      } else {
        return this._videoInfo.getDuration();
      }
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


      var session = {
        playing: true,
        watchId: this._watchId,
        url: location.href,
        currentTime: this._nicoVideoPlayer.getCurrentTime()
      };

      var options = this._videoWatchOptions || {};
      _.each(Object.keys(options), function(key) {
        session[key] = session.hasOwnProperty(key) ? session[key] : options[key];
      });

      return session;
    },
    getMymemory: function() {
      return this._nicoVideoPlayer.getMymemory();
    },
    openTweetWindow: function(videoInfo) {
      // TODO: どこかutil的な関数に追い出す
      var watchId = videoInfo.getWatchId();
      var nicomsUrl = 'http://nico.ms/' + watchId;
      var watchUrl = 'http://www.nicovideo.jp/watch/' + watchId;

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
    }
  });

  var VideoHoverMenu = function() { this.initialize.apply(this, arguments); };
  VideoHoverMenu.__css__ = ZenzaWatch.util.hereDoc(function() {/*

    {* マイページはなぜかhtmlにoverflow-y: scroll が指定されているので打ち消す *}
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
      z-index: 130000;
      {*border: 1px solid #ccc;*}
      overflow: visible;
    }

    .menuItemContainer.rightTop {
      width: 160px;
      height: 40px;
      right: 0px;
      {*border: 1px solid #ccc;*}
      top: 0;
      perspective: 150px;
      perspective-origin: center;
    }

    .menuItemContainer.rightTop .scalingUI {
      transform-origin: right top;
    }

    .updatingDeflist .menuItemContainer.rightTop,
    .updatingMylist  .menuItemContainer.rightTop {
      cursor: wait;
      opacity: 1 !important;
    }
    .updatingDeflist .menuItemContainer.rightTop>*,
    .updatingMylist .menuItemContainer.rightTop>* {
      pointer-events: none;
    }

    .menuItemContainer.leftBottom {
      width: 120px;
      height: 32px;
      left: 8px;
      bottom: 8px;
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


    .menuButton {
      position: absolute;
      opacity: 0;
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease, transform 0.2s ease, background 0.4s ease;
      box-sizing: border-box;
      text-align: center;
      {*pointer-events: none;*}

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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

    .rightTop .menuButton .tooltip {
      top: auto;
      bottom: -24px;
      right: 16px;
      left: auto;
    }
    .rightBottom .menuButton .tooltip {
      right: 16px;
      left: auto;
    }

    .menuItemContainer:hover .menuButton {
      pointer-events: auto;
    }

    .mouseMoving .menuButton {
      opacity: 0.8;
      background: rgba(0xcc, 0xcc, 0xcc, 0.5);
      border: 1px solid #888;
    }
    .mouseMoving .menuButton .menuButtonInner {
      opacity: 0.8;
      word-break: normal;
    }

    .menuButton:hover {
      cursor: pointer;
      opacity: 1;
    }

    .showCommentSwitch {
      left: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 24px;
      text-decoration: line-through;
    }
    .showCommentSwitch:hover {
      box-shadow: 4px 4px 0 #000;
    }
    .showCommentSwitch:active {
      box-shadow: none;
      margin-left: 4px;
      margin-top:  4px;
    }
    .showComment .showCommentSwitch:hover {
    }
    .showComment .showCommentSwitch {
      background:#888;
      color: #fff;
      text-shadow: 0 0 6px orange;
      text-decoration: none;
    }

    .menuItemContainer .muteSwitch {
      left: 0;
      bottom: 40px;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 18px;
      background:#888;
    }
    menuItemContainer .muteSwitch:hover {
      box-shadow: 4px 4px 0 #000;
    }
    menuItemContainer .muteSwitch:active {
      box-shadow: none;
      margin-left: 4px;
      margin-top:  4px;
    }

    .zenzaPlayerContainer:not(.mute) .muteSwitch .mute-on,
                              .mute  .muteSwitch .mute-off {
      display: none;
    }

    .commentLayerOrderSwitch {
      display: none;
      left: 40px;
      width:  32px;
      height: 32px;
    }
    .showComment .commentLayerOrderSwitch {
      display: block;
    }

    .commentLayerOrderSwitch:hover {
    }

    .commentLayerOrderSwitch .layer {
      display: none;
      position: absolute;
      width: 24px;
      height: 24px;
      line-height: 24px;
      font-size: 16px;
      border: 1px solid #888;
      color:  #ccc;
      text-shadow: 1px 1px 0 #888, -1px -1px 0 #000;
      transition: margin-left 0.2s ease, margin-top 0.2s ease;
    }
    .commentLayerOrderSwitch:hover .layer {
      display: block;
    }

    .commentLayerOrderSwitch .comment {
      background: #666;
    }
    .commentLayerOrderSwitch .video {
      background: #333;
    }

                 .commentLayerOrderSwitch .comment,
    .backComment .commentLayerOrderSwitch .video {
      margin-left: 0px;
      margin-top:  0px;
      z-index: 2;
      opacity: 0.8;
    }

    .backComment .commentLayerOrderSwitch .comment,
                 .commentLayerOrderSwitch .video {
      margin-left: 8px;
      margin-top: 8px;
      z-index: 1;
    }

    .ngSettingMenu {
      display: none;
      left: 80px;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #ccc;
      line-height: 30px;
      font-size: 18px;
    }
    .showComment .ngSettingMenu {
      display: block;
    }
    .ngSettingMenu:hover {
      background: #888;
      {*font-size: 120%;*}
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
      left: 32px; {*128px;*}
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

    .ngSettingSelectMenu.enableFilter .sharedNgLevelSelect {
      display: block;
    }


    .menuItemContainer .mylistButton {
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #000;
      border-radius: 4px;
      line-height: 30px;
      font-size: 21px;
      white-space: nowrap;
    }
    .mouseMoving .mylistButton {
      text-shadow: 1px 1px 2px #888;
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
      box-shadow: 2px 4px 2px #000;
      background: #888;
      text-shadow: 0px 0px 2px #66f;
    }
    .menuItemContainer .mylistButton:active {
      box-shadow: none;
      margin-left: 2px;
      margin-top:  4px;
    }

    @keyframes spinX {
      0%   { transform: rotateX(0deg); }
      100% { transform: rotateX(1800deg); }
    }
    @keyframes spinY {
      0%   { transform: rotateY(0deg); }
      100% { transform: rotateY(1800deg); }
    }

    .updatingDeflist .mylistButton.deflistAdd {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset !important;
      box-shadow: none !important;
      margin-left: 2px !important;
      margin-top:  4px !important;
      background: #888 !important;
      animation-name: spinX;
      animation-iteration-count: infinite;
      animation-duration: 6s;
      animation-timing-function: linear;
    }
    .updatingDeflist .mylistButton.deflistAdd .tooltip {
      display: none;
    }

    .mylistButton.mylistAddMenu.show,
    .updatingMylist  .mylistButton.mylistAddMenu {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset #000 !important;
      box-shadow: none !important;
    }
    .mylistButton.mylistAddMenu.show{
      background: #888 !important;
    }
    .updatingMylist  .mylistButton.mylistAddMenu {
      background: #888 !important;
      animation-name: spinX;
      animation-iteration-count: infinite;
      animation-duration: 6s;
      animation-timing-function: linear;
    }

    .mylistSelectMenu {
      top: 36px;
      right: 40px;
      padding: 8px 0;
    }
    .mylistSelectMenu .mylistSelectMenuInner {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 60vh;
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

    .mylistSelectMenu .listInner {
    }

    .mylistSelectMenu .mylistIcon {
      display: inline-block;
      width: 18px;
      height: 14px;
      margin: -4px 4px 0 0;
      vertical-align: middle;
      margin-right: 15px;
      background: url("http://uni.res.nimg.jp/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
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
      text-derocation: none !important;
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
      border: 1px solid #000;
      border-radius: 4px;
      line-height: 30px;
      font-size: 24px;
      white-space: nowrap;
    }
    .mouseMoving .zenzaTweetButton {
      text-shadow: 1px 1px 2px #88c;
    }
    .zenzaTweetButton:hover {
      text-shadow: 1px 1px 2px #88c;
      background: #1da1f2;
      color: #fff;
    }
    .zenzaTweetButton:active {
      transform: scale(0.8);
    }

    .closeButton {
      position: absolute;
      cursor: pointer;
      width: 32px;
      height: 32px;
      box-sizing: border-box;
      text-align: center;
      line-height: 30px;
      font-size: 24px;
      top: 0;
      right: 0;
      z-index: 160000;
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

    .mouseMoving .closeButton,
    .closeButton:hover {
      opacity: 1;
      background: #000;
    }
    .closeButton:hover {
      background: #333;
      box-shadow: 4px 4px 4px #000;
    }
    .closeButton:active {
      transform: scale(0.5);
    }



  */});

  VideoHoverMenu.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
      <div class="menuItemContainer rightTop">
        <div class="scalingUI">
          <div class="menuButton zenzaTweetButton" data-command="tweet">
            <div class="tooltip">ツイート</div>
            <div class="menuButtonInner">t</div>
          </div>
          <div class="menuButton mylistButton mylistAddMenu" data-command="mylistMenu">
            <div class="tooltip">マイリスト登録</div>
            <div class="menuButtonInner">My</div>
          </div>

          <div class="mylistSelectMenu zenzaPopupMenu">
            <div class="triangle"></div>
            <div class="mylistSelectMenuInner">
            </div>
          </div>

          <div class="menuButton mylistButton deflistAdd" data-command="deflistAdd">
            <div class="tooltip">とりあえずマイリスト(T)</div>
            <div class="menuButtonInner">&#x271A;</div>
          </div>

          <div class="menuButton closeButton" data-command="close">
            <div class="menuButtonInner">×</div>
          </div>

        </div>
      </div>

      <div class="menuItemContainer leftBottom">
        <div class="scalingUI">
          <div class="showCommentSwitch menuButton" data-command="toggleShowComment">
            <div class="tooltip">コメント表示ON/OFF(V)</div>
            <div class="menuButtonInner">💬</div>
          </div>

          <div class="commentLayerOrderSwitch menuButton" data-command="toggleBackComment">
            <div class="tooltip">コメントの表示順</div>
            <div class="layer comment">C</div>
            <div class="layer video">V</div>
          </div>

          <div class="ngSettingMenu menuButton" data-command="ngSettingMenu">
            <div class="tooltip">NG設定</div>
            <div class="menuButtonInner">NG</div>

              <div class="ngSettingSelectMenu zenzaPopupMenu">
                <div class="triangle"></div>
                <p class="caption">NG設定</p>
                <ul>
                  <li class="setIsCommentFilterEnable filter-on"
                    data-command="setIsCommentFilterEnable" data-param="true"><span>ON</span></li>
                  <li class="setIsCommentFilterEnable filter-off"
                    data-command="setIsCommentFilterEnable" data-param="false"><span>OFF</span></li>
                </ul>
                <p class="caption sharedNgLevelSelect">NG共有設定</p>
                <ul class="sharedNgLevelSelect">
                  <li class="sharedNgLevel high"  data-command="sharedNgLevel" data-level="HIGH"><span>強</span></li>
                  <li class="sharedNgLevel mid"   data-command="sharedNgLevel" data-level="MID"><span>中</span></li>
                  <li class="sharedNgLevel low"   data-command="sharedNgLevel" data-level="LOW"><span>弱</span></li>
                  <li class="sharedNgLevel none"  data-command="sharedNgLevel" data-level="NONE"><span>なし</span></li>
                </ul>
              </div>

          </div>
        </div>
      </div>

    </div>
  */});

  _.extend(VideoHoverMenu.prototype, AsyncEmitter.prototype);
  _.assign(VideoHoverMenu.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;
      this._videoInfo        = params.videoInfo;

      this._initializeDom();
      this._initializeNgSettingMenu();
      this._initializeSnsMenu();

      ZenzaWatch.util.callAsync(this._initializeMylistSelectMenu, this);
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(VideoHoverMenu.__css__);
      this._$playerContainer.append(VideoHoverMenu.__tpl__);

      var $container = this._$playerContainer;
      $container.find('.menuButton')
        .on('click', _.bind(this._onMenuButtonClick, this));

      this._$deflistAdd       = $container.find('.deflistAdd');
      this._$mylistAddMenu    = $container.find('.mylistAddMenu');
      this._$mylistSelectMenu = $container.find('.mylistSelectMenu');
      this._$closeButton      = $container.find('.closeButton');
      this._$closeButton.on('mousedown',
        _.debounce(_.bind(this.emit, this, 'command', 'close'), 300));

      this._$ngSettingMenu       = $container.find('.ngSettingMenu');
      this._$ngSettingSelectMenu = $container.find('.ngSettingSelectMenu');

      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));

      this._$mylistSelectMenu.on('wheel', function(e) {
        e.stopPropagation();
      });

      ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        this._hideMenu();
      }, this));

    },
    _initializeMylistSelectMenu: function() {
      var self = this;
      self._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      self._mylistApiLoader.getMylistList().then(function(mylistList) {
        self._mylistList = mylistList;
        self._initializeMylistSelectMenuDom();
      });
    },
    _initializeMylistSelectMenuDom: function() {
      var self = this;
      var $menu = this._$mylistSelectMenu, $ul = $('<ul/>');
      $(this._mylistList).each(function(i, mylist) {
        var $li = $('<li/>').addClass('folder' + mylist.icon_id);
        var $icon = $('<span class="mylistIcon"/>').attr({
            'data-mylist-id': mylist.id,
            'data-mylist-name': mylist.name,
            'data-command': 'open',
            title: mylist.name + 'を開く'
          });
        var $link = $('<a class="mylistLink name"/>')
          .html(mylist.name)
          .attr({
            href: '//www.nicovideo.jp/my/mylist/#/' + mylist.id,
            'data-mylist-id': mylist.id,
            'data-mylist-name': mylist.name,
            'data-command': 'add'
          });

        $li.append($icon);
        $li.append($link);
        $ul.append($li);
      });

      $menu.find('.mylistSelectMenuInner').append($ul);
      $menu.on('click', '.mylistIcon, .mylistLink', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.mylistIcon, .mylistLink'));
        var command    = $target.attr('data-command');
        var mylistId   = $target.attr('data-mylist-id');
        var mylistName = $target.attr('data-mylist-name');

        self.toggleMylistMenu(false);

        if (command === 'open') {
          location.href = '//www.nicovideo.jp/my/mylist/#/' + mylistId;
        } else {
          self.emit('command', 'mylistAdd', {mylistId: mylistId, mylistName: mylistName});
        }
      });

    },
    _initializeSnsMenu: function() {
      this._$zenzaTweetButton = this._$playerContainer.find('.zenzaTweetButton');
    },
    _initializeNgSettingMenu: function() {
      var self = this;
      var config = this._playerConfig;
      var $menu = this._$ngSettingSelectMenu;

      $menu.on('click', 'li', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.sharedNgLevel, .setIsCommentFilterEnable'));
        var command  = $target.attr('data-command');
        if (command === 'sharedNgLevel') {
          var level = $target.attr('data-level');
          self.emit('command', command, level);
        } else {
          var param = JSON.parse($target.attr('data-param'));
          self.emit('command', command, param);
        }
      });

      var updateEnableFilter = function(v) {
        //window.console.log('updateEnableFilter', v, typeof v);
        $menu.find('.setIsCommentFilterEnable.selected').removeClass('selected');
        if (v) {
          $menu.find('.setIsCommentFilterEnable.filter-on') .addClass('selected');
        } else {
          $menu.find('.setIsCommentFilterEnable.filter-off').addClass('selected');
        }
        $menu.toggleClass('enableFilter', v);
      };
      updateEnableFilter(config.getValue('enableFilter'));
      config.on('update-enableFilter', updateEnableFilter);

      var updateNgLevel = function(level) {
        $menu.find('.sharedNgLevel.selected').removeClass('selected');
        $menu.find('.sharedNgLevel').each(function(i, item) {
          var $item = $(item);
          if (level === $item.attr('data-level')) {
            $item.addClass('selected');
          }
        });
      };

      updateNgLevel(config.getValue('sharedNgLevel'));
      config.on('update-sharedNgLevel', updateNgLevel);
    },
    _onMenuButtonClick: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $target = $(e.target.closest('.menuButton'));
      var command = $target.attr('data-command');
      switch (command) {
        case 'deflistAdd':
          if (e.shiftKey) {
            this.emit('command', 'mylistWindow');
          } else {
            this.emit('command', 'deflistAdd');
          }
          break;
        case 'mylistMenu':
          if (e.shiftKey) {
            this.emit('command', 'mylistWindow');
          } else {
            this.toggleMylistMenu();
            e.stopPropagation();
          }
          break;
        case 'screenModeMenu':
          this.toggleScreenModeMenu();
          e.stopPropagation();
          break;
        case 'playbackRateMenu':
          this.togglePlaybackRateMenu();
          e.stopPropagation();
          break;
        case 'ngSettingMenu':
          this.toggleNgSettingMenu();
          e.stopPropagation();
          break;
        case 'settingPanel':
          this.emit('command', 'settingPanel');
          e.stopPropagation();
          break;
        case 'tweet':
        case 'close':
        case 'fullScreen':
        case 'toggleMute':
        case 'toggleComment':
        case 'toggleBackComment':
        case 'toggleShowComment':
          this.emit('command', command);
          break;
       }
    },
    _onPlayerConfigUpdate: function(key, value) {
    },
    _hideMenu: function() {
      var self = this;
      $([
        'toggleMylistMenu',
        'toggleScreenModeMenu',
        'togglePlaybackRateMenu',
        'toggleNgSettingMenu'
      ]).each(function(i, func) {
        if (typeof self[func] === 'function') {
          (self[func])(false);
        }
      });
    },
    toggleMylistMenu: function(v) {
      var $btn  = this._$mylistAddMenu;
      var $menu = this._$mylistSelectMenu;
      this._toggleMenu('mylist', $btn, $menu, v);
    },
    toggleNgSettingMenu: function(v) {
      var $btn  = this._$ngSettingMenu;
      var $menu = this._$ngSettingSelectMenu;
      this._toggleMenu('ngSetting', $btn, $menu, v);
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
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
        return true;
      }
      return false;
    }
   });


  var DynamicCss = function() { this.initialize.apply(this, arguments); };
  DynamicCss.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .scalingUI {
      transform: scale(%SCALE%);
    }
    .videoControlBar {
      height: %CONTROL_BAR_HEIGHT%px !important;
    }
  */});
  DynamicCss.prototype = {
    initialize: function(params) {
      var config = this._playerConfig = params.playerConfig;

      this._scale = 1.0;

      var update = _.bind(this._update, this);
      config.on('update-menuScale', update);
      update();
    },
    _update: function() {
      var scale = parseFloat(this._playerConfig.getValue('menuScale'), 10);
      if (this._scale === scale) { return; }
      if (!this._style) {
        this._style = ZenzaWatch.util.addStyle('');
      }
      this._scale = scale;
      var tpl = DynamicCss.__css__
        .replace(/%SCALE%/g, scale)
        .replace(/%CONTROL_BAR_HEIGHT%/g,
          (VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) * scale +
          VideoControlBar.BASE_SEEKBAR_HEIGHT
          );
      this._style.innerHTML = tpl;
    }
  };














  var CommentInputPanel = function() { this.initialize.apply(this, arguments); };
  CommentInputPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .commentInputPanel {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh - 60px - 70px);
      left: calc(-50vw + 50% + 50vw - 100px);
      box-sizing: border-box;

      width: 200px;
      height: 50px;
      z-index: 140000;
      overflow: visible;
    }
    .zenzaPlayerContainer.mymemory .commentInputPanel,
    .zenzaPlayerContainer.loading  .commentInputPanel,
    .zenzaPlayerContainer.error    .commentInputPanel {
      display: none;
    }

    .commentInputPanel.active {
      left: calc(-50vw + 50% + 50vw - 250px);
      width: 500px;
      z-index: 200000;
    }
    .zenzaScreenMode_wide .commentInputPanel,
    .fullScreen           .commentInputPanel {
      position: absolute !important; {* fixedだとFirefoxのバグで消える *}
      top:  auto !important;
      bottom: 70px !important;
      left: calc(-50vw + 50% + 50vw - 100px) !important;
    }
    .zenzaScreenMode_wide .commentInputPanel.active,
    .fullScreen           .commentInputPanel.active {
      left: calc(-50vw + 50% + 50vw - 250px) !important;
    }

    {* 縦長モニター *}
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .commentInputPanel {
        top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .commentInputPanel {
        top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);
      }
    }


    .commentInputPanel>* {
      pointer-events: none;
    }

    .commentInputPanel.active>*,
    .commentInputPanel:hover>* {
      pointer-events: auto;
    }

    .mouseMoving .commentInputOuter {
      border: 1px solid #888;
      box-sizing: border-box;
      border-radius: 8px;
      opacity: 0.5;
    }
    .commentInputPanel.active .commentInputOuter,
    .commentInputPanel:hover  .commentInputOuter {
      border: none;
      opacity: 1;
    }

    .commentInput {
      width: 100%;
      height: 30px;
      font-size: 24px;
      background: transparent;
      border: none;
      opacity: 0;
      transition: opacity 0.3s ease, box-shadow 0.4s ease;
      text-align: center;
      line-height: 26px;
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
      height: 30px;
      font-size: 24px;
      top: 0;
      left: 0;
      border: none;
      border-radius: 8px;
      z-index: -1;
      opacity: 0;
      transition: left 0.2s ease, opacity 0.2s ease;
      text-align: center;
      line-height: 26px;
    }
    .commentInputPanel.active .commandInput {
      left: -108px;
      z-index: 1;
      opacity: 0.9;
      pointer-evnets: auto;
      box-shadow: 0 0 8px #fff;
    }

    .commentSubmit {
      position: absolute;
      width: 100px;
      height: 30px;
      font-size: 24px;
      top: 0;
      right: 0;
      border: none;
      border-radius: 8px;
      z-index: -1;
      opacity: 0;
      transition: right 0.2s ease, opacity 0.2s ease;
      line-height: 26px;
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

  */});

  CommentInputPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
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
  */});

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
  SettingPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaSettingPanelShadow1,
    .zenzaSettingPanelShadow2,
    .zenzaSettingPanel {
      position: absolute;
      left: 50%;
      top: -100vh;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 170000;
      width: 500px;
      height: 300px;
      color: #fff;
      transition: top 0.4s ease;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      overflow-y: hidden;
    }
    .zenzaSettingPanelShadow1.show,
    .zenzaSettingPanelShadow2.show,
    .zenzaSettingPanel.show {
      opacity: 1;
      top: 50%;
      overflow-y: scroll;
      overflow-x: hidden;
    }

    .zenzaScreenMode_sideView .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_sideView .zenzaSettingPanel.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_small    .zenzaSettingPanel.show {
      position: fixed;
    }
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow1.show  {
      display: none;
    }
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow2.show {
      background: #006;
      opacity: 0.8;
    }

    .zenzaSettingPanel.show {
      border: 2px outset #fff;
      box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
    }
    .zenzaSettingPanelShadow1,
    .zenzaSettingPanelShadow2 {
      width:  492px;
      height: 292px;
    }

    {* mix-blend-mode使ってみたかっただけ。 飽きたら消す。 *}
    .zenzaSettingPanelShadow1.show {
      background: #88c;
      mix-blend-mode: difference;
    }
    .zenzaSettingPanelShadow2.show {
      background: #000;
      opacity: 0.5;
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

  */});
  SettingPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <!-- mix-blend-mode を使ってみたかっただけのためのレイヤーx2 飽きたら消す -->
    <div class="zenzaSettingPanelShadow1"></div>
    <div class="zenzaSettingPanelShadow2"></div>
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
          </label>
        </div>

        <div class="enableHeatMapControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableHeatMap">
            コメントの盛り上がりをシークバーに表示
          </label>
        </div>

        <div class="forceEconomyControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="forceEconomy">
            常にエコノミー回線で視聴する
          </label>
        </div>

        <div class="overrideGinzaControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="overrideGinza">
            動画視聴ページでもGINZAのかわりに起動する
          </label>
        </div>

        <div class="overrideWatchLinkControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="overrideWatchLink">
            [Zen]ボタンなしでZenzaWatchを開く(リロード後に反映)
          </label>
        </div>


        <div class="enableAutoMylistCommentControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableAutoMylistComment">
            マイリストコメントに投稿者名を入れる
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
          <span class="info">入力例: 「'遊ゴシック', 'メイリオ', '戦国TURB'」</span>
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
        </div>

        <p class="caption">NG設定</p>
        <div class="filterEditContainer">
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
        <p class="caption">開発中・テスト関係の項目</p>
        <div class="debugControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="debug">
            デバッグ
          </label>
        </div>
        -->


      </div>
    </div>
  */});
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
        if (_.contains(['wordFilter', 'userIdFilter', 'commandFilter'], key)) {
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
        case 'debug':
          this._$panel
            .find('.' + key + 'Control').toggleClass('checked', value)
            .find('input[type=checkbox]').prop('checked', value);
          break;
      }
    },
    _onToggleItemChange: function(e) {
      var $target = $(e.target);
      var settingName = $target.attr('data-setting-name');
      var val = !!$target.prop('checked');

      this._playerConfig.setValue(settingName, val);
      $target.closest('.control').toggleClass('checked', val);
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



  var VideoInfoPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoInfoPanel.prototype, AsyncEmitter.prototype);

  VideoInfoPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
      display: none;
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
      font-size: 14px;
      padding: 0 8px;
      letter-spacing: 0.2em;
      line-height: 32px;
      color: #666;
      background: #222;
      cursor: pointer;
      text-align: center;
    }
    .zenzaWatchVideoInfoPanel .tabSelect.activeTab {
      color: #ccc;
      background: #333;
      {*border-width: 1px 1px 0 1px;
      border-color: #888;
      border-style: outset;*}
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

    .mouseMoving .zenzaWatchVideoInfoPanel>*,
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
      z-index: 120000;
      background: #333;
      color: #ccc;
      overflow-x: hidden;
      overflow-y: hidden;
      transition: opacity 0.4s ease;
    }

    .zenzaWatchVideoInfoPanel.userVideo .channelVideo,
    .zenzaWatchVideoInfoPanel.channelVideo .userVideo
    {
      display: none;
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
      .zenzaScreenMode_normal .zenzaPlayerContainer.backComment .commentLayerFrame {
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

      .zenzaScreenMode_big .zenzaPlayerContainer.backComment .commentLayerFrame {
        top:  calc(-50vh + 50%);
        left: calc(-50vw + 50% + 160px);
        width:  100vw;
        height: calc(100vh - 40px);
        right: auto;
        bottom: auto;
        z-index: 1;
      }
    }



    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel>*,
    .fullScreen            .zenzaWatchVideoInfoPanel>* {
      display: none;
      pointer-events: none;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover>*,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover>* {
      display: inherit;
      pointer-events: auto;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover .tabSelectContainer,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
      display: flex;
    }


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
      transition: opacity 0.4s ease, right 0.4s ease 1s;
    }

    .zenzaScreenMode_wide .mouseMoving  .zenzaWatchVideoInfoPanel,
    .fullScreen           .mouseMoving  .zenzaWatchVideoInfoPanel {
      height: 60%;
      background: none;
      border: 1px solid #888;
      opacity: 0.5;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover {
      right: 0;
      background: #333;
      box-shadow: 4px 4px 4px #000;
      border: none;
      opacity: 0.9;
      transition: opacity 0.4s ease, right 0.4s ease 1s;
    }

    .zenzaWatchVideoInfoPanel .owner {
      white-space: nowrap;
      display: inline-block;
    }

    .zenzaWatchVideoInfoPanel .ownerIcon {
      width: 96px;
      height: 96px;
      border: none;
      margin-right: 8px;
      box-shadow: 2px 2px 2px #666;
      transition: opacity 1s ease;
    }
    .zenzaWatchVideoInfoPanel .ownerIcon.loading {
      opacity: 0;
    }

    .zenzaWatchVideoInfoPanel .ownerName {
      display: inline-block;
      font-size: 18px;
    }

    .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
      padding: 8px;
    }

    .zenzaWatchVideoInfoPanel .favorite .ownerName:after {
      content: '★';
      color: yellow;
      text-shadow: 1px 1px 1px red, -1px -1px 1px orange;
    }

    .zenzaWatchVideoInfoPanel .videoDescription {
      padding: 8px 8px 64px;
      margin: 4px 0px;
      word-break: break-all;
      line-height: 1.5;
    }

    .zenzaWatchVideoInfoPanel .videoDescription:first-letter {
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
      width: 240px;
      margin: 8px 10px;
      background: #444;
      border-radius: 4px;
    }
    .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #446;
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
      margin: 8px 0;
      padding: 8px;
      line-height: 150%;
      text-align; center;
      color: #333;
    }
    .zenzaWatchVideoInfoPanel .publicStatus .column {
      display: inline-block;
      white-space: nowrap;
    }
    .zenzaWatchVideoInfoPanel .publicStatus .count {
      font-weight: bold;
    }

    .zenzaWatchVideoInfoPanel .publicStatus .postedAtOuter {
      display: block;
    }
    .zenzaWatchVideoInfoPanel .publicStatus .postedAt {
      font-weight: bolder;
    }

    .zenzaWatchVideoInfoPanel .videoTags {
      padding: 0;
    }
    .zenzaWatchVideoInfoPanel .videoTags li {
      list-style-type: none;
      display: inline-block;
      margin-right: 4px;
      padding: 4px;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .nicodic {
      display: inline-block;
      margin-right: 4px;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .tagLink {
      text-decoration: none;
      color: #000;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .tagLink:hover {
    }



    body:not(.fullScreen).zenzaScreenMode_3D    .zenzaWatchVideoInfoPanel,
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
      width: 400px;
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

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
      background: #ddd;
      box-shadow: 2px 2px 2px #999;
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
      background: #ddd;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
      background: #ddd;
    }
         body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #ddf;
    }

    body:not(.fullScreen).zenzaScreenMode_3D     .backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .backComment .zenzaWatchVideoInfoPanel {
      opacity: 0.7;
    }

    {* 縦長モニター *}
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: 240px;
        z-index: 120000;
      }
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        position: fixed;
        box-sizing: border-box;
        width: 150px;
        float: left;
        text-align: center;
      }
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .owner {
        white-space: inherit;
        display: inline-block;
      }
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .ownerIcon {
        margin-right: none;
      }

      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoDescription {
        margin-left: 150px;
      }

      .zenzaScreenMode_normal .zenzaPlayerContainer.backComment .commentLayerFrame {
        top:  calc(-50vh + 50% + 120px);
        left: calc(-50vw + 50%);
        width:  100vw;
        height: 100vh;
        right: auto;
        bottom: auto;
        z-index: 1;
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
        height: 240px;
        z-index: 120000;
      }

      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        position: fixed;
        box-sizing: border-box;
        width: 150px;
        float: left;
        text-align: center;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .owner {
        white-space: inherit;
        display: inline-block;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .ownerIcon {
        margin-right: none;
      }

      body:not(.fullScreen).zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoDescription {
        margin-left: 150px;
      }
      .zenzaScreenMode_big .zenzaPlayerContainer.backComment .commentLayerFrame {
        top:  calc(-50vh + 50% + 120px);
        left: calc(-50vw + 50%);
        width:  100vw;
        height: 100vh;
        right: auto;
        bottom: auto;
        z-index: 1;
      }
    }

    .zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
      box-sizing: border-box;
      position: relative;
      width: 100%;
      height: 100%;
      margin: 0;
    }

    .zenzaWatchVideoInfoPanel .videoListFrame {
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
  */});

  VideoInfoPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaWatchVideoInfoPanel show initializing">
      <div class="nowLoading">
        <div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
        <div class="loadingMessage">Loading...</div>
      </div>


      <div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-tab="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-tab="relatedVideoTab">関連動画</div></div>

      <div class="tabs videoInfoTab activeTab">
        <div class="zenzaWatchVideoInfoPanelInner">
          <div class="videoOwnerInfoContainer">
            <a class="ownerPageLink" target="_blank">
              <img class="ownerIcon loading"/>
            </a>
            <span class="owner">
              <span class="ownerName"></span>
            </span>
          </div>
          <div class="publicStatus"></div>

          <div class="videoDescription">
          </div>

          <div class="videoTagsContainer">
            <ul class="videoTags">
          </div>
        </div>
      </div>

      <div class="tabs relatedVideoTab">
        <div class="relatedVideoContainer"></div>
      </div>

    </div>
  */});

  _.assign(VideoInfoPanel.prototype, {
    initialize: function(params) {
      this._videoTitlePanel = new VideoHeaderPanel(params);
      this._dialog = params.dialog;

      this._dialog.on('canplay', _.bind(this._onVideoCanPlay, this));

      this._videoTitlePanel.on('command', _.bind(function(command, param) {
        this.emit('command', command, param);
      }, this));

      if (params.node) {
        this.appendTo(params.node);
      }
    },
    _initializeDom: function() {
      if (this._isInitialized) {
        return;
      }
      this._isInitialized = true;

      ZenzaWatch.util.addStyle(VideoInfoPanel.__css__);
      var $view = this._$view = $(VideoInfoPanel.__tpl__);

      this._$ownerContainer = $view.find('.videoOwnerInfoContainer');
      var $icon = this._$ownerIcon = $view.find('.ownerIcon');
      this._$ownerName = $view.find('.ownerName');
      this._$ownerPageLink = $view.find('.ownerPageLink');

      this._$description = $view.find('.videoDescription');
      this._$description.on('click', _.bind(this._onDescriptionClick, this));

      this._$videoTags = $view.find('.videoTags');
      this._$publicStatus = $view.find('.publicStatus');

      this._$tabSelect = $view.find('.tabSelect');
      $view.on('click', '.tabSelect', _.bind(function(e) {
        var $target = $(e.target.closest('.tabSelect'));
        var tabName = $target.attr('data-tab');
        this.selectTab(tabName);
      }, this));

      this._$view.on('click', function(e) {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
      }).on('wheel', function(e) {
        e.stopPropagation();
      });
      $icon.on('load', function() {
        $icon.removeClass('loading');
      });
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;
      this._videoTitlePanel.update(videoInfo);

      var owner = videoInfo.getOwnerInfo();
      this._$ownerIcon.attr('src', owner.icon);
      this._$ownerPageLink.attr('href', owner.url);
      this._$ownerName.text(owner.name);
      this._$ownerContainer.toggleClass('favorite', owner.favorite);

      this._$publicStatus.html(this._videoTitlePanel.getPublicStatusDom());
      this._$videoTags.html(this._videoTitlePanel.getVideoTagsDom());

      this._updateVideoDescription(videoInfo.getDescription(), videoInfo.isChannel());

      this._$view
        .removeClass('userVideo channelVideo initializing')
        .toggleClass('community', this._videoInfo.isCommunityVideo())
        .toggleClass('mymemory',  this._videoInfo.isMymemory())
        .addClass(videoInfo.isChannel() ? 'channelVideo' : 'userVideo');
    },
    /**
     * 説明文中のurlの自動リンク等の処理
     */
    _updateVideoDescription: function(html, isChannel) {
      if (isChannel) {
        // チャンネル動画は自前でリンク貼ってるので何もしない
        this._$description.html(html);
        return;
      }

      var linkmatch = /<a.*?<\/a>/, links = [], n;
      html = html.split('<br />').join(' <br /> ');
      while ((n = linkmatch.exec(html)) !== null) {
        links.push(n);
        html = html.replace(n, ' <!----> ');
      }

      html = html.replace(/\((https?:\/\/[\x21-\x3b\x3d-\x7e]+)\)/gi, '( $1 )');
      html = html.replace(/(https?:\/\/[\x21-\x3b\x3d-\x7e]+)/gi, '<a href="$1" target="_blank" class="otherSite">$1</a>');
      for (var i = 0, len = links.length; i < len; i++) {
        html = html.replace(' <!----> ', links[i]);
      }

      html = html.split(' <br /> ').join('<br />');

      this._$description.html(html).find('a').addClass('noHoverMenu');

      ZenzaWatch.util.callAsync(function() {
        this._$description.find('.watch').each(function(i, watchLink) {
          var $watchLink = $(watchLink);
          var videoId = $watchLink.text();
          var thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(videoId);
          if (thumbnail) {
            var $img = $('<img class="videoThumbnail" />').attr('src', thumbnail);
            $watchLink.addClass('popupThumbnail').append($img);
          }
        });
      }, this);
    },
    _onDescriptionClick: function(e) {
      if (e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) return true;
      if (e.target.tagName !== 'A') return;
      var dialog = this._dialog;

      var $target = $(e.target), text = $target.text();
      if ($target.attr('href').match(/watch\/([a-z0-9]+)/)) {
        e.preventDefault();
        this.emit('command', 'open', RegExp.$1);
        //dialog.open(RegExp.$1);
      } else
       if (text.match(/^mylist\/(\d+)/)) {
        return;
      } else
      if ($target.hasClass('seekTime')) {
        e.preventDefault(); e.stopPropagation();
        var data = $target.attr('data-seekTime').split(":");
        var sec = data[0] * 60 + parseInt(data[1], 10);
        this.emit('command', 'seek', sec);
        //dialog.setCurrentTime(sec);
      }
    },
    _onVideoCanPlay: function(watchId, videoInfo) {
      // 動画の再生を優先するため、比較的どうでもいい要素はこのタイミングで初期化するのがよい
      if (!this._relatedVideoList) {
        this._relatedVideoList = new RelatedVideoList({
          $container: this._$view.find('.relatedVideoContainer')
        });
        this._relatedVideoList.on('command', _.bind(this._onCommand, this));
      }
      var relatedVideo = videoInfo.getRelatedVideoItems();
      this._relatedVideoList.update(relatedVideo, watchId);
    },
    _onCommand: function(command, param) {
      this.emit('command', command, param);
    },
    appendTo: function(node) {
      var $node = $(node);
      this._initializeDom();
      $node.append(this._$view);
      this._videoTitlePanel.appendTo($node);
    },
    hide: function() {
      this._videoTitlePanel.hide();
    },
    close: function() {
      this._videoTitlePanel.close();
    },
    clear: function() {
      this._videoTitlePanel.clear();
      this._$view.addClass('initializing');
      this._$ownerIcon.addClass('loading');
      this._$description.empty();
    },
    selectTab: function(tabName) {
      var $view = this._$view;
      var $target = $view.find('.tabs.' + tabName + ', .tabSelect.' + tabName);
      if ($target.length < 1) { return; }
      $view.find('.activeTab').removeClass('activeTab');
      $target.addClass('activeTab');
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

      return $body;
    },
    removeTab: function(tabName) {
      this._$view.find('.tabSelect.' + tabName).remove();
      this._$view.find('.tabs.' + tabName).detach();
    }
  });

  var VideoHeaderPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoHeaderPanel.prototype, AsyncEmitter.prototype);

  VideoHeaderPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaWatchVideoHeaderPanel {
      position: fixed;
      width: 100%;
      z-index: 120000;
      box-sizing: border-box;
      padding: 8px;
      bottom: calc(100% + 8px);
      left: 0;
      background: #333;
      color: #ccc;
      text-align: left;
      box-shadow: 4px 4px 4px #000;
      transition: opacity 0.4s ease;
    }

    .zenzaWatchVideoHeaderPanel>* {
      pointer-events: none;
    }

    .mouseMoving .zenzaWatchVideoHeaderPanel>*,
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
      color: #ccc;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel,
    .fullScreen           .zenzaWatchVideoHeaderPanel {
      position: absolute; {* fixedだとFirefoxのバグでおかしくなる *}
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
    {* ヘッダ追従 *}
    body.zenzaScreenMode_sideView:not(.nofix):not(.fullScreen)  .zenzaWatchVideoHeaderPanel {
      top: 0;
    }
    {* ヘッダ固定 *}
    body.zenzaScreenMode_sideView.nofix:not(.fullScreen)        .zenzaWatchVideoHeaderPanel {
      {*
      position: -webkit-sticky;
      position: -moz-sticky;
      position: absolute;
      top: 36px;
      *}
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTitleContainer {
      margin: 0;
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .publicStatus,
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTagsContainer
    {
      display: none;
    }

    .zenzaScreenMode_wide .mouseMoving .zenzaWatchVideoHeaderPanel,
    .fullScreen           .mouseMoving .zenzaWatchVideoHeaderPanel {
      opacity: 0.5;
    }

    .zenzaScreenMode_wide .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .fullScreen           .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel:hover,
    .fullScreen           .zenzaWatchVideoHeaderPanel:hover {
      opacity: 1;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel .videoTagsContainer {
      display: none;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
      display: block;
    }

    .zenzaWatchVideoHeaderPanel.userVideo .channelVideo,
    .zenzaWatchVideoHeaderPanel.channelVideo .userVideo
    {
      display: none;
    }

    .zenzaWatchVideoHeaderPanel .videoTitle {
      font-size: 24px;
      color: #fff;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      display: block;
      cursor: pointer;
    }
    .zenzaWatchVideoHeaderPanel .videoTitleContainer:hover {
      background: #666;
    }
    .zenzaWatchVideoHeaderPanel .videoTitle:hover {
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
    .zenzaWatchVideoHeaderPanel.mymemory:not(:hover) .videoTitle::before {
      content: 'マイメモリー';
      display: inline-block;
    }
    .zenzaWatchVideoHeaderPanel.community:not(:hover) .videoTitle::before {
      content: 'コミュニティ動画';
      display: inline-block;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer       .hoverLinkContainer {
      display: none;
      position: absolute;
    }
    .zenzaWatchVideoHeaderPanel .videoTitleContainer:hover .hoverLinkContainer {
      display: block;
      width: 100%;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .hoverLink {
      display: inline-block;
      box-sizing: border-box;
      min-width: 120px;
      font-size: 12px;
      text-align: center;
      background: #666;
      border: 1px solid #ccc;
      padding: 4px 8px;
      margin: 0 8px 8px;
      box-shadow: 4px 4px 4px #888;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .hoverLink a {
      display: inline-block;
      white-space: nowrap;
      color: #fff;
      width: 100%;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .parentLinkBox,
    .zenzaWatchVideoHeaderPanel .videoTitleContainer .originalLinkBox {
      display: none;
    }
    .zenzaWatchVideoHeaderPanel.hasParent  .videoTitleContainer .parentLinkBox,
    .zenzaWatchVideoHeaderPanel.mymemory   .videoTitleContainer .originalLinkBox,
    .zenzaWatchVideoHeaderPanel.community  .videoTitleContainer .originalLinkBox {
      display: inline-block;
    }

    .videoTitleLink {
      text-decoration: none;
    }
    .videoTitleLink:hover {
    }

    .zenzaWatchVideoHeaderPanel .postedAtOuter {
      margin-right: 24px;
    }
    .zenzaWatchVideoHeaderPanel .postedAt {
      font-weight: bold
    }

    .zenzaWatchVideoHeaderPanel .countOuter .column {
      display: inline-block;
      white-space: nowrap;
    }
    .zenzaWatchVideoHeaderPanel .count {
      font-weight: bolder;
    }

    .zenzaWatchVideoHeaderPanel .videoTagsContainer {
      padding: 8px 0 0;
    }

    .zenzaWatchVideoHeaderPanel .videoTags {
      padding: 0;
      margin: 0;
    }

    .zenzaWatchVideoHeaderPanel .videoTags li {
      list-style-type: none;
      display: inline-block;
      margin-right: 8px;
      padding: 0;
    }

    .zenzaWatchVideoHeaderPanel .videoTags li .nicodic {
      display: inline-block;
      margin-right: 4px;
    }
    .zenzaWatchVideoHeaderPanel .videoTags li .tagLink {
      color: #fff;
      text-decoration: none;
    }
    .zenzaWatchVideoHeaderPanel .videoTags li .tagLink:hover {
      color: #ccf;
    }

    body:not(.fullScreen).zenzaScreenMode_3D     .backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .backComment .zenzaWatchVideoHeaderPanel {
      opacity: 0.7;
    }

  */});

  VideoHeaderPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaWatchVideoHeaderPanel show initializing" style="display: none;">
      <h2 class="videoTitleContainer">
        <span class="videoTitle"></span>
        <div class="hoverLinkContainer">
          <div class="hoverLink ginza">
            <a class="ginzaLink noHoverMenu" target="_blank">GINZAで視聴</a>
          </div>
          <div class="hoverLink uad">
            <a class="uadLink   noHoverMenu" target="_blank">ニコニ広告</a>
          </div>
          <div class="hoverLink hash">
            <a class="hashLink  noHoverMenu" target="_blank" title="twitter検索"></a>
          </div>
          <div class="hoverLink hash originalLinkBox">
            <a class="originalLink  noHoverMenu">元動画を開く</a>
          </div>
          <div class="hoverLink hash parentLinkBox">
            <a class="parentLink  noHoverMenu" target="_blank">親作品</a>
          </div>
        </div>
      </h2>
      <p class="publicStatus">
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
      </p>
      <div class="videoTagsContainer">
        <ul class="videoTags">
      </div>
    </div>
  */});

  _.assign(VideoHeaderPanel.prototype, {
    initialize: function(params) {
      this._dialog = params.dialog;
    },
    _initializeDom: function() {
      if (this._isInitialized) {
        return;
      }
      this._isInitialized = true;
      ZenzaWatch.util.addStyle(VideoHeaderPanel.__css__);
      var $view = this._$view = $(VideoHeaderPanel.__tpl__);

      this._$videoTitle   = $view.find('.videoTitle');
      this._$ginzaLink    = $view.find('.ginzaLink');
      this._$uadLink      = $view.find('.uadLink');
      this._$hashLink     = $view.find('.hashLink');
      this._$originalLink = $view.find('.originalLink');
      this._$parentLink   = $view.find('.parentLink');
      this._$postedAt     = $view.find('.postedAt');

      this._$viewCount    = $view.find('.viewCount');
      this._$commentCount = $view.find('.commentCount');
      this._$mylistCount  = $view.find('.mylistCount');

      this._$tagList      = $view.find('.videoTags');

      var stopPropagation = function(e) { e.stopPropagation(); };
      this._$tagList.on('click', stopPropagation);
      this._$ginzaLink.on('click', stopPropagation);
      this._$hashLink.on('click', stopPropagation);
      this._$uadLink.on('click', stopPropagation);
      this._$parentLink.on('click', stopPropagation);
      this._$originalLink.on('click', _.bind(function(e) {
        stopPropagation(e);
        e.preventDefault();
        var $target = $(e.target), videoId = $target.attr('data-video-id');
        if (videoId) {
          this.emit('command', 'open', videoId);
        }
      }, this));

      this._$ginzaLink.on('mousedown', _.bind(this._onGinzaLinkMouseDown, this));
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;

      this._$videoTitle.html(videoInfo.getTitle()).attr('title', videoInfo.getTitle());
      this._$postedAt.text(videoInfo.getPostedAt());

      var watchId = videoInfo.getWatchId(), videoId = videoInfo.getVideoId();
      var link = '//nico.ms/' + watchId;
      this._$ginzaLink.attr('href', link);
      this._$ginzaLink.attr('data-ginzawatch', link);

      var uadLink = '//uad.nicovideo.jp/ads/?vid='  + watchId;
      this._$uadLink.attr('href', uadLink);

      var hashLink = 'https://twitter.com/hashtag/' + videoId + '?src=hash';
      this._$hashLink
        .text('#' + videoInfo.getVideoId())
        .attr('href', hashLink);

      this._$originalLink
        .attr('href', '//nico.ms/' + videoId)
        .attr('data-video-id',       videoId);

      this._$parentLink.attr('href', '//commons.nicovideo.jp/tree/' + videoId);

      var count = videoInfo.getCount();
      var addComma = function(m) {
        return m.toLocaleString ? m.toLocaleString() : m;
      };
      this._$viewCount    .text(addComma(count.view));
      this._$commentCount .text(addComma(count.comment));
      this._$mylistCount  .text(addComma(count.mylist));

      this._updateTags(videoInfo.getTagList());

      this._$view
        .removeClass('userVideo channelVideo initializing')
        .toggleClass('community', this._videoInfo.isCommunityVideo())
        .toggleClass('mymemory',  this._videoInfo.isMymemory())
        .toggleClass('hasParent', this._videoInfo.hasParentVideo())
        .addClass(videoInfo.isChannel() ? 'channelVideo' : 'userVideo')
        .css('display', '');
    },
    _updateTags: function(tagList) {
      var $container = this._$tagList.parent();
      var $tagList = this._$tagList.empty().detach();
      var createDicIcon = function(text, hasDic) {
        var $dic = $('<a target="_blank" class="nicodic"/>');
        $dic.attr('href', 'http://dic.nicovideo.jp/a/' + encodeURIComponent(text));
        var $icon = $('<img class="icon"/>');
        $icon.attr('src',
          hasDic ?
            'http://live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
            'http://live.nicovideo.jp/img/2012/watch/tag_icon003.png'
        );
        $dic.append($icon);
        return $dic;
      };
      var createLink = function(text) {
        var $link = $('<a class="tagLink" />');
        $link.attr('href', 'http://www.nicovideo.jp/tag/' + encodeURIComponent(text));
        $link.html(text);
        return $link;
      };
      $(tagList).each(function(i, tag) {
        var text = tag.tag;
        var $dic = createDicIcon(text, tag.dic);
        var $link = createLink(text);
        var $tag = $('<li class="zenza-tag" />');
        $tag.append($dic);
        $tag.append($link);
        $tagList.append($tag);
      });
      $container.append($tagList);
      ZenzaWatch.util.callAsync(function() {
        $tagList.find('li:not(.zenza-tag), .zenza-tag a:not(.nicodic):not(.tagLink)').remove();
      }, 100);
    },
    _onGinzaLinkMouseDown: function() {
      this._dialog.pause();
      var currentTime = this._dialog.getCurrentTime();
      var href = this._$ginzaLink.attr('data-ginzawatch');
      this._$ginzaLink.attr('href', href + '?from=' + Math.floor(currentTime));
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
      this._$postedAt.text('------');
      this._$viewCount.text('---');
      this._$commentCount.text('---');
      this._$mylistCount.text('---');
      this._$tagList.empty();
    },
    getPublicStatusDom: function() {
      return this._$view.find('.publicStatus').html();
    },
    getVideoTagsDom: function() {
      return this._$tagList.html();
    }
  });













  var initializeGinzaSlayer =
  (function() {
    // なにかの実験場
    //
    //

    var ProxyExternalContent = function() { this._initialize.apply(this, arguments); };
    _.extend(ProxyExternalContent.prototype, AsyncEmitter.prototype);
    _.assign(ProxyExternalContent.prototype, {
      _initialize: function($originalContent, externalInterface) {
        this._$originalContent = $originalContent;
        var i, len;

        var JS2SWF = externalInterface.JS2SWF;

        var createJS2SWF = function(name) {
          return function() {
            window.console.log('%cJS -> SWF: ', 'background: lightgreen; ', name, arguments);
            return $originalContent[name].apply($originalContent, arguments.length > 0 ? arguments : []);
          };
        };

        for (i = 0, len = JS2SWF.length; i < len; i++) {
          var name = JS2SWF[i];
          //window.console.log('crete JS2SWF: %s', name);
          this[name] = createJS2SWF(name);
        }
      }
    });

    var ProxyConnector = function() { this._initialize.apply(this, arguments); };
    _.extend(ProxyConnector.prototype, AsyncEmitter.prototype);
    _.assign(ProxyConnector.prototype, {
      _initialize: function(originConnector, externalInterface) {
        this._originConnector = originConnector;
        var i, len;
        var SWF2JS = externalInterface.SWF2JS;

        var createSWF2JS = function(name) {
          return function() {
            window.console.log('%cSWF -> JS: ', 'background: cyan; ', name, arguments);
            //originConnector[name].apply(originConnector, arguments.length > 0 ? arguments : []);
          };
        };

        for (i = 0, len = SWF2JS.length; i < len; i++) {
          var name = SWF2JS[i];
          //window.console.log('crete SWF2JS: %s', name);
          this[name] = createSWF2JS(name);
        }

      },
      setStartupLogTimestamp: function() {
      }
    });


    var swf2js, js2swf;
    var replaceConnector = function(target, externalInterface) {
      var connectorInstance = target.getInstance();
      var $externalPlayer  = connectorInstance.getExternalNicoplayer();
      connectorInstance._externalNicoplayer_org = connectorInstance._externalContent;
      js2swf = connectorInstance._externalNicoplayer =
        new ProxyExternalContent($externalPlayer, externalInterface);

      connectorInstance.startJS_org = connectorInstance.startJS;
      connectorInstance.startJS = function(connector) {
        this._connector_org = connector;
        swf2js = new ProxyConnector(connector, externalInterface);
        this.startJS_org(swf2js);
      };
      swf2js = new ProxyConnector(null, externalInterface);
    };



    var initializeGinzaSlayer = function(dialog, watchId) {
      var target = window.PlayerApp.ns.player.Nicoplayer;
      var externalInterface = window.PlayerApp.ns.player.NicoplayerExternalInterface;
      replaceConnector(target, externalInterface);

      $('#external_nicoplayer').remove();

      dialog.on('canPlay', function() {
        swf2js.onVideoInitialized(true);
      });
      dialog.on('commentParsed', function() {
        swf2js.onCommentListInitialized(true);
        //swf2js.onCommentListUpdated(TODO: 変換して渡す);
      });
      dialog.on('ended', function() {
        swf2js.onVideoEnded(false);
      });

      js2swf.ext_getPlayheadTime = function() {
        return dialog.getCurrentTime();
      };
      js2swf.externalChangeVideo = function(videoInfo) {
        window.console.log('externalChangeVideo');
        dialog.open(videoInfo.v, {
          economy: Config.getValue('forceEconomy')
        });
      };
      js2swf.ext_getTotalTime = function() {
        return dialog._nicoVideoPlayer.getDuration();
      };

      dialog.open(watchId, {
        economy: Config.getValue('forceEconomy')
      });
      $('#nicoplayerContainer').append($('.zenzaVideoPlayerDialog').detach());
    };

    var initialize = function(dialog) {
      $('.notify_update_flash_player').remove();
      $('body').addClass('ginzaSlayer');


      var watchId = getWatchId();
      if (Config.getValue('enableGinzaSlayer')) {
        initializeGinzaSlayer(dialog, watchId);
      } else {
        dialog.open(watchId, {
          economy: Config.getValue('forceEconomy')
        });
        $('#external_nicoplayer').remove();
      }

    };

    return initialize;
  })();


    var initialize = function() {
      window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
      initialize = _.noop;
      ZenzaWatch.util.addStyle(__css__);


      var isGinza = ZenzaWatch.util.isGinzaWatchUrl();
      if (!ZenzaWatch.util.isLogin()) {
        return;
      }

      if (!ZenzaWatch.util.isPremium() && !Config.getValue('forceEnable')) {
        return;
      }

      var hoverMenu = new HoverMenu({playerConfig: Config});
      
      window.console.time('createOffscreenLayer');
      NicoComment.offScreenLayer.get(Config).then(function(offScreenLayer) {
        window.console.timeEnd('createOffscreenLayer');
        // コメントの位置計算用のレイヤーが必要
        // スマートじゃないので改善したい

        var dialog;

        // watchページか？
        if (isGinza) {
          if (ZenzaWatch.util.isLogin()) {
            dialog = initializeDialogPlayer(Config, offScreenLayer);
            if (!ZenzaWatch.util.hasFlashPlayer() ||
                (Config.getValue('overrideGinza') && ZenzaWatch.util.isZenzaPlayableVideo()) ||
                Config.getValue('enableGinzaSlayer')
                ) {
              initializeGinzaSlayer(dialog, Config);
            }
          } else {
          // 非ログイン画面用プレイヤーをセットアップ
            initializeNoLoginWatchPagePlayer(Config, offScreenLayer);
            //var dialog = initializeDialogPlayer(Config, offScreenLayer);
            //dialog.open(getWatchId())
          }
        } else {
          dialog = initializeDialogPlayer(Config, offScreenLayer);
        }

        ZenzaWatch.debug.dialog = dialog;

        localStorageEmitter.on('message', function(packet) {
          if (packet.type !== 'openVideo') { return; }
          if (dialog.getId() !== Config.getValue('lastPlayerId', true)) { return; }
          dialog.open(packet.watchId, {
            economy: Config.getValue('forceEconomy'),
            autoCloseFullScreen: false
          });
        });

        WatchPageState.initialize(dialog);

        if (dialog) { hoverMenu.setPlayer(dialog); }
        initializeMobile(dialog, Config);
        initializeExternal(dialog, Config);

        if (isGinza) {
          return;
        }

        window.addEventListener('beforeunload', function() {
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
          dialog.open(lastSession.watchId, lastSession);
        }

        WindowMessageEmitter.on('onMessage', function(data, type) {
          var watchId = data.message.watchId;
          if (watchId && data.message.command === 'open') {
            //window.console.log('onMessage!: ', data.message.watchId, type);
            dialog.open(data.message.watchId, {
              economy: Config.getValue('forceEconomy')
            });
          } else if (watchId && data.message.command === 'send') {
            localStorageEmitter.send({
              type: 'openVideo',
              watchId: watchId
            });
          }
        });
        
      });

      window.ZenzaWatch.ready = true;
      ZenzaWatch.emitter.emitAsync('ready');
      $('body').trigger('ZenzaWatchReady', window.ZenzaWatch);
    };



    // 非ログイン状態のwatchページ用のプレイヤー生成
    var initializeNoLoginWatchPagePlayer = function(conf, offScreenLayer) {
      ZenzaWatch.util.addStyle(__no_login_watch_css__);
      var nicoVideoPlayer = new NicoVideoPlayer({
        offScreenLayer: offScreenLayer,
        node: '.logout-video-thumb-box',
        volume:       conf.getValue('volume'),
        loop:         conf.getValue('loop'),
        playerConfig: conf
      });

      VideoInfoLoader.on('load', function(videoInfo, type) {
        window.console.timeEnd('VideoInfoLoader');
        console.log('VideoInfoLoader.load!', videoInfo, type);

        nicoVideoPlayer.setThumbnail(videoInfo.thumbImage);
        nicoVideoPlayer.setVideo(videoInfo.url);

        window.console.time('loadComment');
        var messageApiLoader = new MessageApiLoader();
        messageApiLoader.load(videoInfo.ms, videoInfo.thread_id, videoInfo.l).then(
          function(result) {
            window.console.timeEnd('loadComment');
            nicoVideoPlayer.setComment(result.xml);
          },
          function() {
            PopupMessage.alert('コメントの取得失敗 ' + videoInfo.ms);
          }
        );
      });

      window.console.time('VideoInfoLoader');
      VideoInfoLoader.load(getWatchId());
    };

    var initializeDialogPlayer = function(conf, offScreenLayer) {
      var dialog = initializeDialog(conf, offScreenLayer);
      return dialog;
    };

    var initializeMobile = function(dialog, config) {
      ZenzaWatch.util.viewPort = new ViewPort({});
    };

    var initializeExternal = function(dialog, config) {
      var command = function(command, param) {
        dialog.execCommand(command, param);
      };
      var open = function(watchId, params) {
        dialog.open(watchId, params);
      };
      ZenzaWatch.external = {
        execCommand: command,
        open: open
      };
    };

    var HoverMenu = function() { this.initialize.apply(this, arguments);};
    //_.extend(HoverMenu.prototype, AsyncEmitter.prototype);
    _.assign(HoverMenu.prototype, {
      initialize: function(param) {
        this._playerConfig = param.playerConfig;

        var $view = $([
        '<div class="zenzaWatchHoverMenu scalingUI">',
          '<span>Zen</span>',
        '</div>'].join(''));
        this._$view = $view;

        $view.on('click', _.bind(this._onClick, this));
        ZenzaWatch.emitter.on('hideHover', function() {
          $view.removeClass('show');
        });

        var $body = $('body')
          .on('mouseover', 'a[href*="/watch/"],a[href*="nico.ms/"]', _.bind(this._onHover, this))
          .on('mouseover', 'a[href*="/watch/"],a[href*="nico.ms/"]', _.debounce(_.bind(this._onHoverEnd, this), 500))
          .on('mouseout',  'a[href*="/watch/"],a[href*="nico.ms/"]', _.bind(this._onMouseout, this))
          .on('click', function() { $view.removeClass('show'); });

        if (this._playerConfig.getValue('overrideWatchLink')) {
          this._overrideGinzaLink();
        } else {
          $body.append($view);
        }
      },
      setPlayer: function(player) {
        this._player = player;
        if (this._selectedWatchId) {
          ZenzaWatch.util.callAsync(function() {
            player.open(this._selectedWatchId, this._playerOption);
          }, this, 1000);
        }
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
        var watchId = this._watchId;

        if (e.shiftKey) {
          // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
          this._send(watchId);
        } else {
          this._open(watchId);
        }
      },
      _open: function(watchId) {
        this._playerOption = {
          economy: this._playerConfig.getValue('forceEconomy')
        };

        if (this._player) {
          this._player.open(watchId, this._playerOption);
        } else {
          this._selectedWatchId = watchId;
        }
      },
      _send: function(watchId) {
        localStorageEmitter.send({
          type: 'openVideo',
          watchId: watchId
        });
      },
      _overrideGinzaLink: function() {
        $('body').on('click', 'a[href*="watch/"]', _.bind(function(e) {
          if (e.target !== this._hoverElement) { return; }

          var $target = $(e.target).closest('a');
          var href = $target.attr('data-href') || $target.attr('href');
          var watchId = ZenzaWatch.util.getWatchId(href);

          if ($target.hasClass('noHoverMenu')) { return; }
          if (!watchId.match(/^[a-z0-9]+$/)) { return; }
          if (watchId.indexOf('lv') === 0) { return; }

          e.preventDefault();

          $('.zenzaWatching').removeClass('zenzaWatching');
          $target.addClass('.zenzaWatching');

          if (e.shiftKey) {
            // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
            this._send(watchId);
          } else {
            this._open(watchId);
          }

          ZenzaWatch.util.callAsync(function() {
            ZenzaWatch.emitter.emit('hideHover');
          }, this, 1500);

        }, this));
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
          NicoVideoApi.ajax({url: 'http://www.nicovideo.jp/'})
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
        });
      }
    }



};


  var xmlHttpRequest = function(options) {
    try {
      //window.console.log('xmlHttpRequest bridge: ', options.url, options);
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

  var postMessage = function(type, message, token) {
//    var origin  = 'http://' + location.host.replace(/^.*?\./, 'www.');
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

  var loadUrl = function(data, type, token) {
    var timeoutTimer = null, isTimeout = false;

    if (!data.url) { return; }

    var options = data.options || {};
    var sessionId = data.sessionId;
    xmlHttpRequest({
      url:     data.url,
      method:  options.method || options.type || 'GET',
      data:    options.data,
      headers: options.headers || [],
      xhrFields: options.xhrFields,
      onload: function(resp) {

        if (isTimeout) { return; }
        else { window.clearTimeout(timeoutTimer); }

        try {
          postMessage(type, {
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
      postMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrl',
        url: data.url
      });
    }, 30000);
  };


   // クロスドメインでのvideoInfoLoader情報の通信用
   // こっちは廃止予定
  var exApi = function() {
    if (window.name.indexOf('videoInfoLoaderLoader') < 0 ) { return; }
    console.log('%cexec exApi', 'background: lightgreen;');

    var body  = document.documentElement.textContent;
    var tmp = body.split('var player = new Nicovideo.MiniPlayer(video,')[1];
    tmp = tmp.split(", '', '');")[0];

    var videoInfo = {};
    var parseReg = /'(.*?)': * '(.*?)'/;
    tmp.split(/\n/).forEach(function(line) {
      if(parseReg.test(line)) {
        var key = RegExp.$1;
        var val = decodeURIComponent(RegExp.$2);
        console.log('%cvideoInfo.%s = %s', 'color: #008;', key, val);
        videoInfo[key] = val;
      }
    });

    // HTML5ではmp4以外再生できないのでフォールバック
    var eco = videoInfo.movie_type === 'mp4' ? '' : '&eco=1';
    
    if (!videoInfo.thumbPlayKey) {
      console.log('%cthumbPlayKey not found', 'background: red;');
    }
    var url = 'http://ext.nicovideo.jp/thumb_watch?v=' + videoInfo.v + '&k=' + videoInfo.thumbPlayKey + eco;
    xmlHttpRequest({
      url: url,
      onload: function(req) {
        var result = parseQuery(req.responseText);
        result.thumbImage = videoInfo.thumbImage || '';
        postMessage('videoInfoLoader', result);
      }
    });
  };



  var thumbInfoApi = function() {
    if (window.name.indexOf('thumbInfoLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var type = 'thumbInfoApi';
    var token = null;

    window.addEventListener('message', function(event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      var command = data.command;

      if (!token) { token = data.token; }

      if (data.token !== token) { return; }


      if (!data.url) { return; }
      var sessionId = data.sessionId;
      xmlHttpRequest({
        url: data.url,
        onload: function(resp) {

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

          try {
            postMessage(type, {
              sessionId: sessionId,
              status: 'ok',
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
        postMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          url: data.url
        });
      }, 30000);

    });

    try {
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };

  var vitaApi = function() {
    if (window.name.indexOf('vitaApiLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var type = 'vitaApi';
    var token = null;

    window.addEventListener('message', function(event) {
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      var command = data.command;

      if (!token) { token = data.token; }
      if (data.token !== token) { return; }

      if (!data.url) { return; }

      var sessionId = data.sessionId;
      xmlHttpRequest({
        url: data.url,
        onload: function(resp) {

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

          try {
            postMessage(type, {
              sessionId: sessionId,
              status: 'ok',
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
        postMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          token: token,
          url: data.url
        });
      }, 30000);

    });

    try {
      postMessage(type, { token: token, status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };


  var nicovideoApi = function() {
    if (window.name.indexOf('nicovideoApiLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var type = 'nicovideoApi';
    var token = null;

    var originalUrl = location.href;
    var pushHistory = function(path) {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, null, path);
      window.setTimeout(function() {
        window.history.replaceState(null, null, originalUrl);
      }, 3000);
    };

    var PREFIX = 'ZenzaWatch_';
    var dumpConfig = function(data) {
      if (!data.keys) { return; }
      var prefix = PREFIX;
      var config = {};
      var sessionId = data.sessionId;

      data.keys.forEach(function(key) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey)) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
            //window.console.log('dump config: %s = %s', key, config[key]);
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });

      try {
        postMessage(type, {
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
      //window.console.log('nicovideoApiLoaderWindow.onMessage', event.origin, event.data);
      var data = JSON.parse(event.data), command = data.command;

      // このタイミングで割り込まれたらどうにもならないが、やらないよりはマシだろう
      if (!token) { token = data.token; }

      if (data.token !== token) {
        window.console.log('invalid token: ', data.token, token, command);
        return;
      }

      switch (command) {
        case 'loadUrl':
          loadUrl(data, type, token);
          break;
        case 'dumpConfig':
          dumpConfig(data);
          break;
        case 'saveConfig':
          saveConfig(data);
          break;
        case 'pushHistory':
          pushHistory(data.path);
          break;
      }
    });

    var onStorage = function(e) {
      var key = e.key;
      if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) { return; }

      key = key.replace('ZenzaWatch_', '');
      var oldValue = e.oldValue;
      var newValue = e.newValue;
      //asyncEmitter.emit('change', key, newValue, oldValue);
      if (oldValue === newValue) { return; }

      postMessage(type, {
        command: 'configSync',
        token: token,
        key:   key,
        value: newValue
      });

      switch(key) {
        case 'message':
          console.log('%cmessage', 'background: cyan;', newValue);
          postMessage(type, { command: 'message', value: newValue });
          break;
      }
    };

    window.addEventListener('storage', onStorage);


    try {
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };

  var blogPartsApi = function() {
    var watchId = location.href.split('/').reverse()[0];

    var initialize = function() {
      var button = document.createElement('button');
      button.innerHTML = '<span>Zen</span>';
      button.style.position = 'fixed';
      button.style.left = 0;
      button.style.top = 0;
      button.style.zIndex = 100000;
      button.style.lineHeight = '24px';
      button.style.padding = '4px 4px';
      button.style.cursor = 'pointer';
      button.style.fontWeight = 'bolder';
      document.body.appendChild(button);
      button.onclick = function(e) {
        window.console.log('click!', watchId);
        postMessage('blogParts', {
          command: e.shiftKey ? 'send' : 'open',
          watchId: watchId
        });
      };
    };
    initialize();
  };

  var host = window.location.host || '';
  if (location.href === 'http://www.nicovideo.jp/favicon.ico' &&
      window.name === 'nicovideoApiLoader') {
    nicovideoApi();
  } else if (location.href ==='http://api.ce.nicovideo.jp/api/v1/system.unixtime' &&
      window.name === 'vitaApiLoader') {
    vitaApi();
  } else if (host === 'ext.nicovideo.jp' && location.pathname.indexOf('/thumb/') === 0) {
    blogPartsApi();
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('thumbInfoLoader') >= 0) {
    thumbInfoApi();
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    exApi();
  } else if (window === top) {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    // 効果はいまいち・・・
    var iframe;
    for (var i = 0; i < 3; i++) {
      iframe = document.createElement('iframe');
      iframe.className = 'reservedFrame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.srcdoc = '<html></html>';
      document.body.appendChild(iframe);
    }


    var loadGm = function() {
      var script = document.createElement('script');
      script.id = 'ZenzaWatchLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.appendChild(document.createTextNode( '(' + monkey + ')();' ));
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
      _.each(t, function(v) { ver.push((v * 1 + 100000).toString().substr(1)); });
      return ver.join('') * 1;
    };

    var loadJq = function() {
      window.console.log('JQVer: ', getJQVer());
      window.console.info('load jQuery from cdn...');

      return new Promise(function (resolve, reject) {
        var $j = window.jQuery || null;
        var $$ = window.$ || null;
        var script = document.createElement('script');
        script.id = 'jQueryLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
        document.body.appendChild(script);
        var count = 0;

        var tm = window.setInterval(function() {
          count++;

          if (getJQVer() >= MIN_JQ)  {
            window.clearInterval(tm);
            window.ZenzaJQuery = window.jQuery;
            if ($j) { window.jQuery = $j; }
            if ($$) { window.$      = $$; }
            resolve();
          }

          if (count >= 100) {
            window.clearInterval(tm);
            window.console.error('load jQuery timeout');
            reject();
          }

        }, 300);
      });
    };

    if (getJQVer() >= MIN_JQ) {
      loadGm();
    } else {
      loadJq().then(loadGm);
    }
  }
})();
