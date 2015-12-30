// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    Ginzaに行かなくても動画を再生
// @match          http://www.nicovideo.jp/*
// @match          http://ext.nicovideo.jp/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.4.3
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js
// ==/UserScript==

(function() {

var monkey = function() {
  var console = window.console;
  console.log('exec ZenzaWatch..');
    var $ = window.jQuery, _ = window._;

    var ZenzaWatch = {
      debug: {},
      api: {},
      init: {},
      util: {
        hereDoc: function(func) { // えせヒアドキュメント
          return func.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\{\*/g, '/*').replace(/\*\}/g, '*/');
        },
        callAsync: function(func, self) {
          if (self) {
            window.setTimeout($.proxy(func, self), 0);
          } else {
            window.setTimeout(func, 0);
          }
        }
      }
    };

    window.ZenzaWatch = ZenzaWatch;


    var AsyncEmitter = (function() {

      function AsyncEmitter() {
        this._events = {};
      }

      AsyncEmitter.prototype.on = function(name, callback) {
        name = name.toLowerCase();
        if (!this._events[name]) {
          this._events[name] = [];
        }
        this._events[name].push(callback);
      };

      AsyncEmitter.prototype.off = function(name, func) {
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
        if (name) {
          this._events[name] = [];
        } else {
          this._events = {};
        }
      };

      AsyncEmitter.prototype.emit = function(name) {
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
        var args = arguments;

        window.setTimeout($.proxy(function() {
          try {
            this.emit.apply(this, args);
          } catch (e) {
            console.log(e);
            throw e;
          }
        }, this), 0);
      };

      return AsyncEmitter;
    })();

    ZenzaWatch.emitter = new AsyncEmitter();

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

      // 直接変更する時はコンソールで
      // ZenzaWatch.config.setValue('hogehoge' fugafuga);
      var defaultConfig = {
        debug: false,
        volume:       0.1,
        forceEnable:  false,
        showComment:  true,
        autoPlay:     true,
        loop:         false,
        mute:         false,
        screenMode:   'normal',
        autoCloseFullScreen: true, // 再生終了時に自動でフルスクリーン解除するかどうか
        continueNextPage: false,   // 動画再生中にリロードやページ切り替えしたら続きから開き直す
        backComment: false,        // コメントの裏流し
        lastPlayerId: '',
        playbackRate: 1.0,
        message: ''
      };
      var config = {};

      for (var key in defaultConfig) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey)) {
          try {
            config[key] = JSON.parse(localStorage[storageKey]);
          } catch (e) {
            window.console.error('config parse error: ', e);
            config[key] = defaultConfig[key];
          }
        } else {
          config[key] = defaultConfig[key];
        }
      }

      /**
       * ローカルの設定値をlocalStorageから読み直す
       * 他のウィンドウで書き換えられる可能性のある物を読む前に使う
       */
      emitter.refreshValue = function(key) {
        var storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey)) {
          try {
            config[key] = JSON.parse(localStorage[storageKey]);
          } catch (e) {
            window.console.error('config parse error: ', e);
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
        if (config[key] !== value) {
          var storageKey = prefix + key;
          localStorage[storageKey] = JSON.stringify(value);
          config[key] = value;

          console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
          this.emitAsync('update', key, value);
          this.emitAsync('update-' + key, value);
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

      var notify = function(msg) {
        console.log('%c%s', 'background: #080; color: #fff; padding: 8px;', msg);
        var $msg = $(__view__.replace('%MSG%', msg)).addClass('notify');
        show($msg);
      };

      var alert = function(msg) {
        console.log('%c%s', 'background: #800; color: #fff; padding: 8px;', msg);
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
          session = JSON.parse(storage[key]);
          storage.removeItem(key);
        } catch (e) {
          window.console.error('PlayserSession restore fail: ', e);
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
      query.split('&').forEach(function(item) {
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

        var onMessage = function(event) {
          if (event.origin.indexOf('nicovideo.jp') < 0) return;
          if (event.origin === 'http://ads.nicovideo.jp') return;
          try {
            var data = JSON.parse(event.data);
            if (data.id !== 'NicoCommentLayer') { return; }

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

        if (key === 'message') {
          console.log('%cmessage', 'background: cyan;', newValue);
          asyncEmitter.emit('message', JSON.parse(newValue));
        }
      };

      asyncEmitter.send = function(packet) {
        packet.__now = Date.now();
        window.console.log('send Packet', packet);
        Config.setValue('message', packet);
      };

      window.addEventListener('storage', onStorage);

      return asyncEmitter;
    })();

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

    var ajax = function(params) {
      // マイページのjQueryが古くてDeferredの挙動が怪しいのでネイティブのPromiseで囲う
      return new Promise(function(resolve, reject) {
        $.ajax(params).then(function(result) {
          return resolve(result);
        }, function(err) {
          return reject(err);
        });
      });
    };
    ZenzaWatch.util.ajax = ajax;

    var ShortcutKeyEmitter = (function() {
      var emitter = new AsyncEmitter();

      var initialize = function() {
        initialize = _.noop;
        $('body').on('keydown.zenzaWatch', onKeyDown);
      };

      var onKeyDown = function(e) {
        if (e.target.tagName === 'SELECT' ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA') {
          return;
        }
        var target = e.target;
        var key = '';
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
          case 70: // F
            key = 'FULL';
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
          emitter.emit('keyDown', key, target);
        }
      };

      initialize();
      return emitter;
    })(Config);
  ZenzaWatch.util.ShortcutKeyEmitter = ShortcutKeyEmitter;



    var VideoInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/thumb_watch';
      var loaderFrame, loaderWindow;
      var videoInfoLoader = new AsyncEmitter();

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
          
          var playlist = JSON.parse($dom.find('#playlistDataContainer').text());
          var isPlayable = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);

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
            csrfToken: watchApiData.flashvars.csrfToken
          };
          ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', watchApiData.flashvars.csrfToken);
          return result;

        } catch (e) {
          window.console.error('error: parseWatchApiData ', e);
          return null;
        }
      };

      var loadFromWatchApiData = function(watchId) {
        var url = '/watch/' + watchId;
        console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);

        var isFallback = false;
        var onLoad = function(req) {
          var data = parseWatchApiData(req);
          ZenzaWatch.debug.watchApiData = data;

          if (!data) {
            PopupMessage.alert('動画情報の取得に失敗(watchApi)');
            return;
          }

          if (data.isFlv && !isFallback) {
            isFallback = true;

            url = url + '?eco=1';
            console.log('%cエコノミーにフォールバック(flv)', 'background: cyan; color: red;', url);
            window.setTimeout(function() {
              $.ajax({
                url: url,
                xhrFields: { withCredentials: true }
              }).then(
                onLoad,
                function() { PopupMessage.alert('動画情報の取得に失敗(watchApi)'); }
              );
            }, 1000);
          } else if (!data.isPlayable) {
            PopupMessage.alert('この動画は再生できません');
          } else if (data.isMp4) {
            videoInfoLoader.emitAsync('load', data, 'WATCH_API', watchId);
            ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId); // 外部連携用
          } else {
            PopupMessage.alert('この動画は再生できません');
          }
        };

        $.ajax({
          url: url,
          xhrFields: { withCredentials: true }
        }).then(
          onLoad,
          function() { PopupMessage.alert('動画情報の取得に失敗(watchApi)'); }
        );
      };

      var load = function(watchId) {
        if (isLogin() && isSameOrigin()) {
          loadFromWatchApiData(watchId);
        } else {
          loadFromThumbWatch(watchId);
        }
      };

      _.assign(videoInfoLoader, {
        load: load
      });

      return videoInfoLoader;
    })();

    var MessageApiLoader = (function() {
      var VERSION_OLD = '20061206';
      var VERSION     = '20090904';

      var MessageApiLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.assign(MessageApiLoader.prototype, {
        initialize: function() {
        },
        /**
         * 動画の長さに応じて取得するコメント数を変える
         * 本家よりちょっと盛ってる
         */
        getRequestCountByDuration: function(duration) {
          if (duration < 60)  { return 150;}
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

          return new Promise(function(resolve, reject) {
            $.ajax({
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
                message: 'ThreadKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        _createThreadXml: function(threadId, version, userId, threadKey, force184) {
          var thread = document.createElement('thread');
          thread.setAttribute('thread', threadId);
          thread.setAttribute('version', version);
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

          return thread;
        },
        _createThreadLeavesXml:
          function(threadId, version, userId, threadKey, force184, duration) {
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

          thread_leaves.innerHTML = threadLeavesParam;

          return thread_leaves;
        },

        buildPacket: function(threadId, duration, userId, threadKey, force184, optionalThreadId)
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

          if (duration < 60) {
            packet.appendChild(
              this._createThreadXml(threadId, VERSION_OLD, userId, threadKey, force184)
            );
          } else {
            packet.appendChild(
              this._createThreadXml(threadId, VERSION, userId, threadKey, force184)
            );
            packet.appendChild(
              this._createThreadLeavesXml(threadId, VERSION, userId, threadKey, force184, duration)
            );
          }

          span.appendChild(packet);
          var packetXml = span.innerHTML;

          return packetXml;
        },
        _post: function(server, xml) {
          // マイページのjQueryが古いためかおかしな挙動をするのでPromiseで囲う
          var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
          return new Promise(function(resolve, reject) {
            $.ajax({
              url: server,
              data: xml,
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
                message: 'コメントの取得失敗' + server
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
            $.ajax({
              url: url,
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
        _load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId) {
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
            var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
            if (isNmsg) {
              console.log('load from nmsg.nicovideo.jp...');
              return this._get(server, threadId, duration);
            } else {
              // nmsg.nicovideo.jpもできればこっちでやりたい。 うまく取れないので調査中。
              packet = this.buildPacket(
                threadId,
                duration,
                userId
              );
              console.log('post xml...', server, packet);
              return this._post(server, packet, threadId);
            }
          }
        },
        load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId) {

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
              optionalThreadId
            ).then(
              function(result) {
                window.console.timeEnd(timeKey);
                ZenzaWatch.debug.lastMessageServerResult = result;

                var resultCode = null;
                try {
                  var thread = result.documentElement.getElementsByTagName('thread')[0];
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

                resolve({
                  resultCode: parseInt(resultCode, 10),
                  xml: result.documentElement
                });
              },
              function(e) {
                window.console.timeEnd(timeKey);
                window.console.error('loadComment fail: ', e);
                reject({
                  message: 'コメント通信失敗'
                });
              }
            );
          });
        }
      });

      return MessageApiLoader;
    })();
    ZenzaWatch.api.MessageApiLoader = MessageApiLoader;

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
          for (var v in this._storage) {
            if (v.indexOf(PREFIX) === 0) {
              window.console.log('remove item', v, this._storage[v]);
              this._storage.removeItem(v);
            }
          }
        }
      });

      return CacheStorage;
    })();
    ZenzaWatch.api.CacheStorage = CacheStorage;
    ZenzaWatch.debug.localCache = new CacheStorage(localStorage);

//    var _MemoryStorage = {
//      setItem: function(key, value) {
//        this[key] = value;
//      },
//      removeItem: function(key) {
//        delete this[key];
//      }
//    };


    var MylistApiLoader = (function() {
      var CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
      var TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
//      var LONG_EXPIRE_TIME  = 90 * 24 * 60 * 60 * 1000;
      var token = '';
      var cacheStorage = null;

      var ajax = ZenzaWatch.util.ajax;

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
              timeout: 30000,
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
              timeout: 30000,
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
              timeout: 30000,
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
            timeout: 30000,
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
            timeout: 30000,
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
        showComment:    conf.getValue('showComment'),
        debug:          conf.getValue('debug'),
        playbackRate:   conf.getValue('playbackRate')
      });

      this._controlPanel = new VideoControlPanel({
        player: this,
        panelNode: params.panelNode,
        playerConfig: conf
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
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      ZenzaWatch.debug.nicoVideoPlayer = this;
    },
    _beginTimer: function() {
      this._stopTimer();
      this._videoWatchTimer =
        window.setInterval(
          $.proxy(this._onTimer, this), 100);
    },
    _stopTimer: function() {
      if (!this._videoWatchTimer) { return; }
      window.clearInterval(this._videoWatchTimer);
      this._videoWatchTimer = null;
    },
    _initializeEvents: function() {
      this._videoPlayer.on('volumeChange', $.proxy(this._onVolumeChange, this));
      this._videoPlayer.on('dblclick', $.proxy(this.toggleFullScreen, this));
      this._videoPlayer.on('aspectRatioFix', $.proxy(this._onAspectRatioFix, this));
      this._videoPlayer.on('play',  $.proxy(this._onPlay, this));
      this._videoPlayer.on('pause', $.proxy(this._onPause, this));
      this._videoPlayer.on('ended', $.proxy(this._onEnded, this));
      this._videoPlayer.on('loadedMetaData', $.proxy(this._onLoadedMetaData, this));
      this._videoPlayer.on('canPlay', $.proxy(this._onVideoCanPlay, this));

      // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
      this._videoPlayer.on('mouseWheel',
        _.throttle($.proxy(this._onMouseWheel, this), 50));

      this._videoPlayer.on('abort', $.proxy(this._onAbort, this));
      this._videoPlayer.on('error', $.proxy(this._onError, this));

      this._videoPlayer.on('click', $.proxy(this._onClick, this));
      this._videoPlayer.on('contextMenu', $.proxy(this._onContextMenu, this));

      this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));
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
      }
    },
    _onMouseWheel: function(e, delta) {
      var v = this._videoPlayer.getVolume();
      var r;

      // 下げる時は「うわ音でけぇ」
      // 上げる時は「ちょっと上げようかな」
      // なので下げる速度のほうが速い
      if (delta > 0) { // up
        v = Math.max(v, 0.01);
        r = (v < 0.05) ? 1.3 : 1.1;
        this._videoPlayer.setVolume(v * r);
      } else {         // down
        this._videoPlayer.setVolume(v / 1.2);
      }
//      this._playerConfig.setValue('volume', this._videoPlayer.getVolume());
    },
    _onTimer: function() {
      var currentTime = this._videoPlayer.getCurrentTime();
      this._commentPlayer.setCurrentTime(currentTime);
    },
    _onAspectRatioFix: function(ratio) {
      this._commentPlayer.setAspectRatio(ratio);
    },
    _onLoadedMetaData: function() {
      this.emit('loadedMetaData');
    },
    _onVideoCanPlay: function() {
      this.emit('canPlay');
    },
    _onPlay: function() {
      this._isPlaying = true;
    },
    _onPause: function() {
      this._isPlaying = false;
    },
    _onEnded: function() {
      this._isPlaying = false;
      this._isEnded = true;
      if (FullScreen.now() && this._playerConfig.getValue('autoCloseFullScreen')) {
        FullScreen.cancel();
      }
      this.emit('ended');
    },
    _onError: function() {
    },
    _onAbort: function() {
    },
    _onClick: function() {
      this._contextMenu.hide();
    },
    _onContextMenu: function(e) {
      this._contextMenu.show(e.offsetX, e.offsetY);
    },
    setVideo: function(url) {
      this._videoPlayer.setSrc(url);
      this._controlPanel.show();
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
    getCurrentTime: function() {
      return this._videoPlayer.getCurrentTime();
    },
    getVpos: function() {
      return Math.floor(this._videoPlayer.getCurrentTime() * 100);
    },
    setComment: function(xmlText) {
      this._commentPlayer.setComment(xmlText);
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
      this._controlPanel.hide();
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
    isPlaying: function() {
      return !!this._isPlaying;
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._commentPlayer) {
        return;
      }
      var nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
      console.log('addChat:', text, cmd, vpos, options, nicoChat);
      return nicoChat;
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
      this._flvInfo = info.flvInfo;

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
    }
  });

  var VideoControlPanel = function() { this.initialize.apply(this, arguments); };
  VideoControlPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaControlPanel {
      position: fixed;
      display: none;
      z-index: 200000;
      left: 0;
      bottom: 0;
      background: #333;
      border: 2px soid;
      padding: 4px;
      box-shadow: 0 0 4px;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    {*
    .zenzaControlPanel.show {
      display: block
    }
    *}

    .zenzaControlPanel .control {
      display: inline-block;
      border: 1px solid;
      border-radius: 4px;
      background: #888;
    }

    .zenzaControlPanel .playbackRate,
    .zenzaControlPanel .screenMode {
      font-size: 16px;
      background: #888;
    }

    .zenzaControlPanel button {
      font-size: 10pt;
      padding: 4px 8px;
      background: #888;
      border-radius: 4px;
      border: solid 1px;
      cursor: pointer;
    }

    .zenzaControlPanel label {
      padding: 4px 8px;
      cursor: pointer;
    }

    .zenzaControlPanel input[type=checkbox] {
      position: fixed;
      left: -9999px;
    }

    .zenzaControlPanel .control.checked {
      color: #cc9;
    }

  */});

  VideoControlPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaControlPanel">
      <!--
      <div class="playbackRateControl control">
        再生速度
        <select class="playbackRate">
          <option value="1.0" selected>標準(1.0)</option>
          <option value="0.1">0.1倍</option>
          <option value="0.3">0.3倍</option>
          <option value="0.5">0.5倍</option>
          <option value="0.8">0.8倍</option>
          <option value="1.0">1.0倍</option>
          <option value="1.1">1.1倍</option>
          <option value="1.2">1.2倍</option>
          <option value="1.4">1.4倍</option>
          <option value="1.5">1.5倍</option>
          <option value="2.0">2.0倍</option>
          <option value="3.0">3.0倍</option>
          <option value="4.0">4.0倍</option>
          <option value="5.0">5.0倍</option>
          <option value="10.0">10倍</option>
        </select>
      </div>
      <div class="screenModeControl control">
        画面サイズ
        <select class="screenMode">
          <option value="3D">3D</option>
          <option value="small">小画面</option>
          <option value="sideView">横表示</option>
          <option value="normal" selected>標準</option>
          <option value="big">大画面</option>
          <option value="wide">ワイド</option>
       </select>
      </div>
      -->
      <!--
      <div class="fullScreenControl control toggle">
        <button class="fullScreen">
          フルスクリーン
        </button>
      </div>
      -->
        <!--<div class="muteControl control toggle">
        <label>
          ミュート
          <input type="checkbox" class="checkbox" data-setting-name="mute">
        </label>
      </div>-->
      <!--
      <div class="loopControl control toggle">
        <label>
          リピート
          <input type="checkbox" class="checkbox" data-setting-name="loop">
        </label>
      </div>
      -->
      <!--
      <div class="autoPlayControl control toggle">
        <label>
          自動再生
          <input type="checkbox" class="checkbox" data-setting-name="autoPlay">
        </label>
      </div>
      -->
      <!--
      <div class="showCommentControl control toggle">
        <label>
          コメント
          <input type="checkbox" class="checkbox" data-setting-name="showComment">
        </label>
      </div>
      -->
      <!--
      <div class="debugControl control toggle">
        <label>
          デバッグ
          <input type="checkbox" class="checkbox" data-setting-name="debug">
        </label>
      </div>
      -->
     </div>
  */});


  _.assign(VideoControlPanel.prototype, {
    initialize: function(params) {
      this._playerConfig = params.playerConfig;
      this._player = params.player;
      this._initializeDom();

      this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));
    },
    _initializeDom: function() {
      var conf = this._playerConfig;
      ZenzaWatch.util.addStyle(VideoControlPanel.__css__);

      var $panel = this._$panel = $(VideoControlPanel.__tpl__);

      $panel.on('click', function(e) {
        e.stopPropagation();
      });

      this._$playbackRate = $panel.find('.playbackRate');
      this._$playbackRate.on('change', $.proxy(this._onPlaybackRateChange, this));
      this._$playbackRate.val(conf.getValue('playbackRate'));

      this._$screenMode = $panel.find('.screenMode');
      this._$screenMode.on('change', $.proxy(this._onScreenModeChange, this));
      this._$screenMode.val(conf.getValue('screenMode'));

      this._$fullScreenButton = $panel.find('.fullScreen');
      this._$fullScreenButton.on('click', $.proxy(this._onFullScreenClick, this));

      var $check = $panel.find('input[type=checkbox]');
      $check.each(function(i, check) {
        var $c = $(check);
        var settingName = $c.attr('data-setting-name');
        var val = conf.getValue(settingName);
        $c.prop('checked', conf.getValue(settingName));
        $c.closest('.control').toggleClass('checked', val);
      });
      $check.on('change', $.proxy(this._onToggleItemChange, this));

      $('body').append($panel);
    },
    _onPlaybackRateChange: function() {
      var val = this._$playbackRate.val();
      this._playerConfig.setValue('playbackRate', val);
    },
    _onScreenModeChange: function() {
      var val = this._$screenMode.val();
      this._playerConfig.setValue('screenMode', val);
    },
    _onFullScreenClick: function(e) {
      e.stopPropagation();
      this._player.requestFullScreen();
    },
    _onToggleItemChange: function(e) {
      var $target = $(e.target);
      var settingName = $target.attr('data-setting-name');
      var val = !!$target.prop('checked');

      this._playerConfig.setValue(settingName, val);
      $target.closest('.control').toggleClass('checked', val);
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'mute':
        case 'loop':
        case 'autoPlay':
        case 'showComment':
        case 'debug':
          this._$panel
            .find('.' + key + 'Control').toggleClass('checked', value)
            .find('input[type=checkbox]').prop('checked', value);
          break;
        case 'playbackRate':
          this._$playbackRate.val(value);
          break;
        case 'screenMode':
          this._$screenMode.val(value);
          break;
      }
    },
    show: function() {
      this._$panel.addClass('show');
    },
    hide: function() {
      this._$panel.removeClass('show');
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
          <li class="loop"        data-command="loop">リピート再生</li>
          <li class="showComment" data-command="showComment">コメントを表示</li>
          <li class="autoPlay"    data-command="autoPlay">自動再生</li>

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
        </ul>
      </div>
    </div>
  */});


  _.assign(VideoContextMenu.prototype, {
    initialize: function(params) {
      this._playerConfig = params.playerConfig;
      this._player = params.player;
      this._initializeDom(params);

      //this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));
    },
    _initializeDom: function(params) {
      ZenzaWatch.util.addStyle(VideoContextMenu.__css__);
      var $view = this._$view = $(VideoContextMenu.__tpl__);
      $view.on('click', $.proxy(this._onMouseDown, this));
    },
    _onMouseDown: function(e) {
      var target = e.target, $target = $(target);
      var command = $target.attr('data-command');
      var param = $target.attr('data-param');
      this.hide();
      e.preventDefault();
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
      $('body').on('click.ZenzaMenuOnBodyClick', $.proxy(this._onBodyClick, this));
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
        controls: true,
        loop: !!params.loop,
        mute: !!params.mute
      };

      console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
      this._$video = $('<video class="videoPlayer nico"/>').attr(options);
      this._video = this._$video[0];

      this._isPlaying = false;
      this._canPlay = false;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this.setVolume(volume);
      this.setMute(params.mute);
      this.setPlaybackRate(playbackRate);

      this._initializeEvents();

      ZenzaWatch.debug.video = this._video;
    },
    _reset: function() {
      this._$video.removeClass('play pause abort error');
      this._isPlaying = false;
    },
    _initializeEvents: function() {
      this._$video
        .on('canplay',        $.proxy(this._onCanPlay, this))
        .on('canplaythrough', $.proxy(this._onCanPlayThrough, this))
        .on('loadstart',      $.proxy(this._onLoadStart, this))
        .on('loadeddata',     $.proxy(this._onLoadedData, this))
        .on('loadedmetadata', $.proxy(this._onLoadedMetaData, this))
        .on('ended',          $.proxy(this._onEnded, this))
        .on('emptied',        $.proxy(this._onEmptied, this))
        .on('stalled',        $.proxy(this._onStalled, this))
        .on('waiting',        $.proxy(this._onWaiting, this))
        .on('progress',       $.proxy(this._onProgress, this))
        .on('durationchange', $.proxy(this._onDurationChange, this))
        .on('resize',         $.proxy(this._onResize, this))
        .on('abort',          $.proxy(this._onAbort, this))
        .on('error',          $.proxy(this._onError, this))

        .on('pause',          $.proxy(this._onPause, this))
        .on('play',           $.proxy(this._onPlay, this))
        .on('playing',        $.proxy(this._onPlaying, this))
        .on('seeking',        $.proxy(this._onSeeking, this))
        .on('seeked',         $.proxy(this._onSeeked, this))
        .on('volumechange',   $.proxy(this._onVolumeChange, this))


        .on('click',          $.proxy(this._onClick, this))
        .on('dblclick',       $.proxy(this._onDoubleClick, this))
        .on('mousewheel',     $.proxy(this._onMouseWheel, this))
        .on('contextmenu',    $.proxy(this._onContextMenu, this))
        ;
    },
    _onCanPlay: function() {
      console.log('%c_onCanPlay:', 'background: cyan; color: blue;', arguments);

      this.setPlaybackRate(this.getPlaybackRate());
      this._canPlay = true;
      this._$video.removeClass('loading');
      this.emit('canPlay');
      this.emit('aspectRatioFix',
        this._video.videoHeight / Math.max(1, this._video.videoWidth));
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
    _onWaiting: function() {
      console.log('%c_onWaiting:', 'background: cyan;', arguments);
      this.emit('waiting');
    },
    _onProgress: function() {
      //console.log('%c_onProgress:', 'background: cyan;', arguments);
      this.emit('progress');
    },
    _onDurationChange: function() {
      console.log('%c_onDurationChange:', 'background: cyan;', arguments);
      this.emit('durationChange');
    },
    _onResize: function() {
      console.log('%c_onResize:', 'background: cyan;', arguments);
      this.emit('resize');
    },
    _onAbort: function() {
      console.log('%c_onAbort:', 'background: cyan; color: red;', arguments);
      this._$video.addClass('abort');
      this.emit('abort');
    },
    _onError: function() {
      console.log('%c_onError:', 'background: cyan; color: red;', arguments);
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
      var delta = parseInt(e.originalEvent.wheelDelta, 10);
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
    setIsAutoPlay: function(v) {
      this._video.autoplay = v;
    },
    getIsAutoPlay: function() {
      return this._video.autoPlay;
    },
    appendTo: function($node) {
      $node.append(this._$video);
      this._video = document.getElementsByTagName('video')[0];
    },
    close: function() {
      this._video.pause();

      this._video.removeAttribute('src');
      this._video.removeAttribute('poster');
    }
  });



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
  _.assign(NicoCommentPlayer.prototype, {
    initialize: function(params) {
      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);
      
      this._offScreen = params.offScreenLayer;

      this._model     = new NicoComment(params);
      this._viewModel = new NicoCommentViewModel(this._model, params.offScreenLayer);
      this._view      = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel,
        playbackRate: params.playbackRate,
        show: params.showComment
      });

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

      var thread = xml.getElementsByTagName('thread')[0];
      var lastRes = parseInt(thread.getAttribute('last_res'));
      this._theradInfo = {
        resultCode: thread.getAttribute('resultcode'),
        thread:     thread.getAttribute('thread'),
        serverTime: thread.getAttribute('server_time'),
        lastRes:    lastRes,
        blockNo:    Math.floor(lastRes+1),
        ticket:     thread.getAttribute('ticket'),
        revision:   thread.getAttribute('revision')
      };

    },
    getCss3PlayerHtml: function() {
      console.log('createCss3PlayerHtml...');

      if (this._view) {
        return this._view.toString();
      }

      this._view = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel
      });
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
    getThreadInfo: function() {
      return this._threadInfo || {};
    },
    toString: function() {
      return this._viewModel.toString();
    }
  });




  var NicoComment = function() { this.initialize.apply(this, arguments); };
  NicoComment.MAX_COMMENT = 5000;

  _.assign(NicoComment.prototype, {
    initialize: function() {
      this._currentTime = 0;
      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._topGroup    = new NicoChatGroup(this, NicoChat.TYPE.TOP);
      this._normalGroup = new NicoChatGroup(this, NicoChat.TYPE.NORMAL);
      this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM);
    },
    setXml: function(xml) {
      window.console.time('NicoComment.setXml');

      this._xml = xml;
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();

      var chats = xml.getElementsByTagName('chat');

      for (var i = 0, len = Math.min(chats.length, NicoComment.MAX_COMMENT); i < len; i++) {
        var chat = chats[i];
        if (!chat.firstChild) continue;

        var nicoChat = new NicoChat(chat);

        if (nicoChat.isDeleted()) { continue; }

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
            group = this._normalGroup;
            break;
        }
        group.addChat(nicoChat, group);
      }

      window.console.timeEnd('NicoComment.setXml');
      console.log('chats: ', chats.length);
      console.log('top: ',    this._topGroup   .getMembers().length);
      console.log('normal: ', this._normalGroup.getMembers().length);
      console.log('bottom: ', this._bottomGroup.getMembers().length);
      this.emit('setXml');
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
          group = this._normalGroup;
          break;
      }
      group.addChat(nicoChat, group);
      this.emit('addChat');
    },
    /**
     * コメントの内容が変化した通知
     * NG設定、フィルタ反映時など
     */
    onChange: function(e) {
      this.emit('change', {
        nicoComment: this,
        group: e.group,
        chat: e.chat
      });
    },
    clear: function() {
      this._xml = '';
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();
      this.emit('clear');
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;

      this._topGroup   .setCurrentTime(sec);
      this._normalGroup.setCurrentTime(sec);
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
          return this._normalGroup;
      }
    }
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
    <style type="text/css">
      .mincho  {font-family:  Simsun, monospace; }
      .gulim   {font-family:  Gulim,  monospace; }
      .mingLiu {font-family:  mingLiu,monospace; }

      .ue .mincho  , .shita .mincho {font-family:  Simsun, monospace; }
      .ue .gulim   , .shita .gulim  {font-family:  Gulim,  monospace; }
      .ue .mingLiu , .shita .mingLiu{font-family:  mingLiu,monospace; }

      .nicoChat.big {
        line-height: 48px;
      }
      .nicoChat.big.noScale {
        line-height: 45px;
      }

      .backslash {
        font-family: Arial;
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

      .nicoChat .zen_space {
        {*font-family: monospace;*}
      }
    </style>
    <body style="pointer-events: none;" >
    <div id="offScreenLayer"
      style="
        width: 4096px;
        height: 385px;
        overflow: visible;
        background: #fff;

        font-family: 'ＭＳ Ｐゴシック';
        letter-spacing: 1px;
        margin: 2px 1px 1px 1px;
        white-space: nowrap;
        font-weight: bolder;

    "></div>
    </body></html>
      */});

    var emitter = new AsyncEmitter();
    var offScreenFrame;
    var offScreenLayer;
    var textField;

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
        layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');

        offScreenLayer = {
          getTextField: function() {
            return textField;
          },
          appendChild: function(elm) {
            layer.appendChild(elm);
          },
          removeChild: function(elm) {
            layer.removeChild(elm);
          }
        };

        emitter.emit('create', offScreenLayer);
        emitter.clear();
        $d.resolve(offScreenLayer);
      };

      frame.srcdoc = __offscreen_tpl__;
    };

    var getLayer = function(callback) {
      var $d = new $.Deferred();
      callback = callback || _.noop;
      if (offScreenLayer) {
        window.setTimeout(function() {
          callback(offScreenLayer);
        }, 0);
        $d.resolve(offScreenLayer);
        return;
      }
      emitter.on('create', callback);

      initialize($d);
      return $d.promise();
    };

    var createTextField = function() {
      var layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
      if (!layer) {
        return false;
      }

      var span = document.createElement('span');
      span.style.position   = 'absolute';
      span.style.fontWeight = 'bolder';
      span.style.whiteSpace = 'nowrap';

      textField = {
        setText: function(text) {
          span.innerHTML = text;
        },
        setType: function(type) {
          span.className = type;
        },
        setFontSizePixel: function(pixel) {
          span.style.fontSize = pixel + 'px';
        },
        getWidth: function() {
          return span.offsetWidth;
        }
      };

      layer.appendChild(span);
  
      return span;
    };

    return {
      get: getLayer
    };
  })();



  var NicoCommentViewModel = function() { this.initialize.apply(this, arguments); };

  // この数字はレイアウト計算上の仮想領域の物であり、実際に表示するサイズはview依存
  NicoCommentViewModel.SCREEN = {
    WIDTH:      512 + 32,
    WIDTH_FULL: 640 + 32,
    HEIGHT:     384 +  1
  };

  _.assign(NicoCommentViewModel.prototype, {
    initialize: function(nicoComment, offScreen) {
      this._nicoComment = nicoComment;
      this._offScreen   = offScreen;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._currentTime = 0;

      this._topGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
      this._normalGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NORMAL), offScreen);
      this._bottomGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

      nicoComment.on('setXml', $.proxy(this._onSetXml, this));
      nicoComment.on('clear',  $.proxy(this._onClear,  this));
      nicoComment.on('change', $.proxy(this._onChange,  this));
      nicoComment.on('currentTime', $.proxy(this._onCurrentTime,   this));
    },
    _onSetXml: function() {
      this.emit('setXml');
    },
    _onClear: function() {
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();

      this.emit('clear');
    },
    _onCurrentTime: function(sec) {
      this._currentTime = sec;
      this.emit('currentTime', this._currentTime);
    },
    _onChange: function() {
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    toString: function() {
      var result = [];

      result.push(['<comment ',
        '>'
      ].join(''));

      result.push(this._normalGroup.toString());
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
          return this._normalGroup;
      }
    }
});

  var NicoChatGroup = function() { this.initialize.apply(this, arguments); };

  _.assign(NicoChatGroup.prototype, {
    initialize: function(nicoComment, type) {
      this._nicoComment = nicoComment;
      this._type = type;

      // TODO: mixin
      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this.reset();
    },
    reset: function() {
      this._members = [];
    },
    addChatArray: function(nicoChatArray) {
      var members = this._members;
      $(nicoChatArray).each(function(i, nicoChat) {
        members.push(nicoChat);
        nicoChat.setGroup(this);
      });
      this.emit('addChatArray', nicoChatArray);
    },
    addChat: function(nicoChat) {
      this._members.push(nicoChat);
      this.emit('addChat', nicoChat);
    },
    getType: function() {
      return this._type;
    },
    getMembers: function() {
      return this._members;
    },
    getFilteredMembers: function() {
      // TODO: NG, deleted 判定
      return this._members;
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    onChange: function(e) {
      this.emit('change', {
        chat: e,
        group: this
      });
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].setCurrentTime(sec);
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

      nicoChatGroup.on('addChat',      $.proxy(this._onAddChat,      this));
      nicoChatGroup.on('addChatArray', $.proxy(this._onAddChatArray, this));
      nicoChatGroup.on('reset',        $.proxy(this._onReset,        this));
      nicoChatGroup.on('change',       $.proxy(this._onChange,        this));

      this.addChatArray(nicoChatGroup.getFilteredMembers());
    },
    _onAddChatArray: function(nicoChatArray) {
      this.addChatArray(nicoChatArray);
    },
    _onAddChat: function(nicoChat) {
      this.addChatArray([nicoChat]);
    },
    _onReset: function() {
      this.reset();
    },
    _onChange: function(e) {
      this.reset();
      this.addChatArray(e.group.getFilteredMembers());
    },
    addChatArray: function(nicoChatArray) {
      for (var i = 0, len = nicoChatArray.length; i < len; i++) {
        var nicoChat = nicoChatArray[i];
        var nc = new NicoChatViewModel(nicoChat, this._offScreen);
        this.checkCollision(nc);
        this._members.push(nc);
      }
      this._createVSortedMembers();
    },
    addChat: function(nicoChat) {
      var nc = new NicoChatViewModel(nicoChat, this._offScreen);
      this.checkCollision(nc);
      this._members.push(nc);

      this._createVSortedMembers();
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
      // 判定はidの若い奴優先なのか左にある奴優先なのかいまいちわかってない
      // 後者だとコメントアートに割り込み出来てしまうから前者？
      var m = this._vSortedMembers;//this._members;
      var o;
      for (var i = 0, len = m.length; i < len; i++) {
        o = m[i];

        //自分自身との判定はスキップする
        if (o === target) { continue; }

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
          // 文字列比較なので桁上がりのタイミングで狂うじゃないですかーやだー
          // レアケースだからって放置するんですかー
          return a.getId() < b.getId() ? -1 : 1;
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
      //var maxDuration = NicoChatViewModel.DURATION.NORMAL;

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
    dom.innerText = text;
    dom.setAttribute('mail', cmd);
    dom.setAttribute('vpos', vpos);
    for (var v in options) {
      dom.setAttribute(v, options[v]);
    }
    return new NicoChat(dom);
  };

  NicoChat.id = 1000000;

  NicoChat.SIZE = {
    BIG: 'big',
    MEDIUM: 'medium',
    SMALL: 'small'
  };
  NicoChat.TYPE = {
    TOP:    'ue',
    NORMAL: 'normal',
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
      this._type = NicoChat.TYPE.NORMAL;
      this._isMine = false;

      this._currentTime = 0;
    },
    initialize: function(chat) {
      this._id = 'chat' + NicoChat.id++;
      this._currentTime = 0;

      this._text = chat.firstChild.nodeValue;
      var attr = chat.attributes;
      if (!attr) { this.reset(); return; }

      this._date = chat.getAttribute('date') || '000000000';
      this._cmd  = chat.getAttribute('mail') || '';
      this._isPremium = (chat.getAttribute('premium') === '1');
      this._userId = chat.getAttribute('user_id');
      this._vpos = parseInt(chat.getAttribute('vpos'));
      this._deleted = chat.getAttribute('deleted') === '1';
      this._color = '#FFF';
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NORMAL;
      this._duration = NicoChatViewModel.DURATION.NORMAL;
      this._isMine = chat.getAttribute('mine') === '1';

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
        this._group.onChange({
          chat: this
        });
      }
    },
    getId: function() { return this._id; },
    getText: function() { return this._text; },
    setText: function(v) { this._text = v; this.onChange(); },
    getDate: function() { return this._date; },
    getCmd: function() { return this._cmd; },
    isPremium: function() { return !!this._isPremium; },
    isEnder: function() { return !!this._isEnder; },
    isFull: function() { return !!this._isFull; },
    isMine: function() { return !!this._isMine; },
    getUserId: function() { return this._userId; },
    getVpos: function() { return this._vpos; },
    isDeleted: function() { return !!this._deleted; },
    getColor: function() { return this._color; },
    getSize: function() { return this._size; },
    getType: function() { return this._type; }
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
  // ここの値はレイアウト計算上の仮想領域の物であり、実際の表示はviewに依存
  NicoChatViewModel.DURATION = {
    TOP:    3,
    NORMAL: 4,
    BOTTOM: 3
  };

  NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
  NicoChatViewModel.FONT_SIZE_PIXEL = {
    BIG:    39 + 0,
    NORMAL: 24 + 0,
    SMALL:  15 + 0
  };

  NicoChatViewModel.LINE_HEIGHT = {
    BIG:    45,
    NORMAL: 29,
    SMALL:  18
  };

  NicoChatViewModel.CHAT_MARGIN = 5;
  
  NicoChatViewModel._FONT_REG = {
    // [^ -~｡-ﾟ]* は半角以外の文字の連続
    MINCHO: /([^ -~｡-ﾟ]*[ˊˋ⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛▁▂▃▄▅▆▇█▉▊▋▌▍▎▏◢◣◤◥〡〢〣〤〥〦〧〨〩ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄﹉﹊﹋﹌﹍﹎﹏﹐﹑﹒﹔﹕﹖﹗﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫▓]+[^ -~｡-ﾟ]*)/g,
    GULIM: /([^ -~｡-ﾟ]*[㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㉿ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵￦⊙ㅂㅑㅜㆁ▒ㅅㅒㅡㆍㄱㅇㅓㅣㆎㄴㅏㅕㅤ♡ㅁㅐㅗㅿ♥]+[^ -~｡-ﾟ]*)/g,
    MING_LIU: /([^ -~｡-ﾟ]*[]+[^ -~｡-ﾟ]*)/g
  };

  _.assign(NicoChatViewModel.prototype, {
    initialize: function(nicoChat, offScreen) {
      this._nicoChat = nicoChat;
      this._offScreen = offScreen;

      // 画面からはみ出したかどうか(段幕時)
      this._isOverflow = false;
      // 表示時間
      this._duration = NicoChatViewModel.DURATION.NORMAL;

      // 固定されたコメントか、流れるコメントか
      this._isFixed = false;

      this._scale = 1.0;
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
      if (this._height > NicoCommentViewModel.SCREEN.HEIGHT + 10) {
        this._isOverflow = true;
        //this._y = (NicoCommentViewModel.SCREEN.HEIGHT - this._height) / 2;
        this._setScale(this._scale * NicoCommentViewModel.SCREEN.HEIGHT / this._height);
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
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.NORMAL;
          break;
      }
    },
    _setText: function(text) {
      var han_replace = function(m) {
        var bar = '________________________________________';
        return ['<span class="han_space">', bar.substr(0, m.length), '</span>'].join('');
      };
      var zen_replace = function(m) {
        var bar = '＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃';
        return ['<span class="zen_space">', bar.substr(0, m.length), '</span>'].join('');
      };
      var zen_replace2 = function(m) {
        var bar = '、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、';
        return ['<span class="zen_space">', bar.substr(0, m.length), '</span>'].join('');
      };

      var htmlText =
        text
          .replace(/( |　|\t)+([\n$])/g , '$1')
          .replace(/( |\xA0){1,30}/g , han_replace)
          .replace(/[\t]/g , '<span class="tab_space">&nbsp;</span>');

      // 特殊文字と、その前後の全角文字のフォントが変わるらしい
      htmlText =
        htmlText
          .replace(NicoChatViewModel._FONT_REG.MINCHO,   '<span class="mincho">$1</span>')
          .replace(NicoChatViewModel._FONT_REG.GULIM,    '<span class="gulim">$1</span>')
          .replace(NicoChatViewModel._FONT_REG.MING_LIU, '<span class="mingLiu">$1</span>')
//          .replace(/ /g , '<span class="zen_space">＃</span>')
          .replace(/[ ]{1,20}/g ,  zen_replace)
//          .replace(/　/g , '<span class="zen_space">、</span>');
          .replace(/[　]{1,20}/g , zen_replace2);

      // 最初の一文字目が特殊文字だった場合は全体のフォントが変わるらしい
      var firstLetter = text.charAt(0);
      if (firstLetter.match(NicoChatViewModel._FONT_REG.MINCHO)) {
        htmlText = '<span class="mincho">'  + htmlText + '</span>';
      } else if (firstLetter.match(NicoChatViewModel._FONT_REG.GULIM)) {
        htmlText = '<span class="gulim">'   + htmlText + '</span>';
      } else if (firstLetter.match(NicoChatViewModel._FONT_REG.MING_LIU)) {
        htmlText = '<span class="mingLiu">' + htmlText + '</span>';
      }
      htmlText = htmlText
        .replace(/[\r\n]+$/g, '')
        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
        .replace(/[\n]/g, '<br>')
        .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>') // バックスラッシュ
        .replace(/(\x0323|\x200b|\x2029|\x202a|\x200c)+/g , '<span class="zero_space">[0]</span>')
        ;

      this._htmlText = htmlText;
      this._text = text;

      var field = this._offScreen.getTextField();
      field.setText(htmlText);
      field.setFontSizePixel(this._fontSizePixel);
      field.setType(this._type);
      
      this._width  = this._originalWidth  = field.getWidth();
      this._height = this._originalHeight = this._calculateHeight();

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

      var margin     = NicoChatViewModel.CHAT_MARGIN;
      var lineHeight = NicoChatViewModel.LINE_HEIGHT.NORMAL; // 29
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

      if (!this._isFixed) {
        // 流れるコメント
        // 中の数字は職人の実測値
        switch (size) {
          case NicoChat.SIZE.BIG:
            lineHeight = lc <= 2 ? lineHeight : 24;
            margin     = lc <= 2 ? margin : 3;
            //return ((lc <= 2) ? (45 * lc + 5) : (24 * lc + 3)) - 1;
            break;
          default:
            lineHeight = lc <= 4 ? lineHeight : 15;
            margin     = lc <= 4 ? margin : 3;
            //return ((lc <= 4) ? (29 * lc + 5) : (15 * lc + 3)) - 1;
            break;
          case NicoChat.SIZE.SMALL:
            lineHeight = lc <= 6 ? lineHeight : 10;
            margin     = lc <= 6 ? margin : 3;
            //return ((lc <= 6) ? (18 * lc + 5) : (10 * lc + 3)) - 1;
            break;
        }
      } else if (this._scale === 0.5) {
        switch (size) {
          case NicoChat.SIZE.BIG: // 16行 = (24 * 16 + 3 - 1) = 386
            lineHeight = 24;
            margin     = 3;
            //return (24 * lc + 3) - 1;
            break;
          default:
            lineHeight = 15;
            margin     = 3;
            //return (15 * lc + 3) - 1;
            break;
          case NicoChat.SIZE.SMALL:
            lineHeight = 10;
            margin     = 3;
            //return (10 * lc + 3) - 1;
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
      return lineHeight * lc + margin - 1;
    },

    /**
     *  位置固定モードにする(ueかshita)
     */
    _setupFixedMode: function() {
      var isScaled = false;
      var nicoChat = this._nicoChat;
      var screenWidth =
        nicoChat.isFull() ?
          NicoCommentViewModel.SCREEN.WIDTH_FULL :
          NicoCommentViewModel.SCREEN.WIDTH;
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      //メモ
      //█　　　　　　　　　　　　　　　　　　　　　　　　　　　█
      // メモ
      // "        "

      // 改行リサイズ
      // 参考: http://ch.nicovideo.jp/meg_nakagami/blomaga/ar217381
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (this._height > screenHeight / 3) {
        this._setScale(this._scale * 0.5);
        isScaled = true;
      }
      
      // TODO: この判定は改行リサイズより前？後？を検証
      var isOverflowWidth = this._width > screenWidth;

      // 横幅リサイズ
      // 画面幅よりデカい場合の調整
      if (isOverflowWidth) {
        if (isScaled && !nicoChat.isEnder()) {
          // なんかこれバグってね？と思った方は正しい。
          // 元々は本家のバグなのだが、いまさら修正出来ない。
          // なので、コメント描画の再現としては正しい…らしい。
          //
          // そのバグを発動しなくするためのコマンドがender
          this._setScale(screenWidth / this._width);
        } else {
          this._setScale(this._scale * (screenWidth  / this._width));
        }
      }

      // BOTTOMの時だけy座標を画面の下端に合わせる
      // 内部的には0 originで表示の際に下から詰むだけでもいいような気がしてきた。
      if (this._type === NicoChat.TYPE.BOTTOM) {
        var margin = 1; //NicoChatViewModel.CHAT_MARGIN;
        var outerHeight = this._height + margin;
        this._y = screenHeight - outerHeight;
      }

    },

    /**
     *  流れる文字のモード
     */
    _setupMarqueeMode: function() {
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (this._height > screenHeight / 3) {
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
      if (this.isOverflow() || target.isOverflow()) { return false; }

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
      var yMax = NicoCommentViewModel.SCREEN.HEIGHT - this._height; //lineHeight;

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
        if (y < 0) {
          this._isOverflow = true;
        }
      }

      this._y = this._isOverflow ? Math.floor(Math.random() * yMax) : y;
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
      return true;
    },
    isOverflow: function() {
      return this._isOverflow;
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
        userId:   this._nicoChat.getUserId(),
        date:     this._nicoChat.getDate(),
        deleted:  this._nicoChat.isDeleted(),
        cmd:      this._nicoChat.getCmd(),
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
<style type="text/css">

.mincho  {font-family: Simsun, monospace; }
.gulim   {font-family: Gulim,  monospace; }
.mingLiu {font-family: mingLiu,monospace; }

.ue .mincho  , .shita .mincho {font-family: Simsun, monospace; }
.ue .gulim   , .shita .gulim  {font-family: Gulim,  monospace; }
.ue .mingLiu , .shita .mingLiu{font-family: mingLiu,monospace; }

.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }

 .backslash {
   font-family: Arial;
 }


body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

{* 稀に変な広告が紛れ込む *}
iframe {
  display: none !important;
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
  position: absolute;
  opacity: 0;
  text-shadow:
  {*-1px -1px 0 #ccc, *}
     1px  1px 0 #000;

  font-family: 'ＭＳ Ｐゴシック';
  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: nowrap;
  font-weight: bolder;

{*line-height: 123.5%;*}
  padding: 0;

  transform-origin: 0% 0%;
  animation-timing-function: linear;
}

.nicoChat.black {
  text-shadow: -1px -1px 0 #888, 1px  1px 0 #888;
}

.nicoChat.big {
  line-height: 48px;
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


.nicoChat.overflow {
  {*mix-blend-mode: overlay;*}
}


.nicoChat.ue,
.nicoChat.shita {
  display: inline-block;
  text-shadow: 0 0 3px #000; {* 全部こっちにしたいが重いので *}
  {*text-align: center;*}
}
.nicoChat.ue.black,
.nicoChat.shita.black {
  text-shadow: 0 0 3px #fff; {* 全部こっちにしたいが重いので *}
}

.nicoChat .han_space,
.nicoChat .zen_space {
  opacity: 0;
  {*font-family: monospace;*}
}

.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
  color: yellow;
  opacity: 0.3;
}

.nicoChat .zero_space {
  display: none;
}
.debug .nicoChat .zero_space {
  display: inline;
  position: absolute;
}



.nicoChat .zero_space {
  display: none;
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
<body>
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>

  */});

  _.assign(NicoCommentCss3PlayerView.prototype, {
    initialize: function(params) {
      this._viewModel = params.viewModel;

      this._viewModel.on('setXml', $.proxy(this._onSetXml, this));
      this._viewModel.on('currentTime', $.proxy(this._onCurrentTime, this));

      this._lastCurrentTime = 0;
      this._isShow = true;

      this._aspectRatio = 9 / 16;

      this._inViewTable = {};
      this._playbackRate = params.playbackRate || 1.0;

      this._isStalled = undefined;
      this._isPaused  = undefined;

      console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

      this._initializeView(params);

      // Firefoxでフルスクリーン切り替えするとコメントの描画が止まる問題の暫定対処
      // ここに書いてるのは手抜き
      if (ZenzaWatch.util.isFirefox()) {
        ZenzaWatch.emitter.on('fullScreenStatusChange',
          _.debounce($.proxy(function() {
            this.refresh();
          }, this), 3000)
        );
      }

      ZenzaWatch.debug.css3Player = this;
    },
    _initializeView: function(params) {

      window.console.time('initialize NicoCommentCss3PlayerView');
      this._style = null;
      this._commentLayer = null;
      this._view = null;
      var iframe;
      var reserved = document.getElementsByClassName('commentLayerFrameReserve');
      if (reserved && reserved.length > 0) {
        iframe = reserved[0];
        document.body.removeChild(iframe);
        iframe.style.position = '';
        iframe.style.left = '';
      } else {
        iframe = document.createElement('iframe');
      }
      iframe.className = 'commentLayerFrame';

      var html =
        NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '');


      var self = this;
      iframe.onload = function() {
        var win = iframe.contentWindow;
        var doc = iframe.contentWindow.document;

        self._style        = doc.getElementById('nicoChatAnimationDefinition');
        var commentLayer = self._commentLayer = doc.getElementById('commentLayer');

        // Config直接参照してるのは手抜き
        doc.body.className = Config.getValue('debug') ? 'debug' : '';
        Config.on('update-debug', function(val) {
          doc.body.className = val ? 'debug' : '';
        });

        win.addEventListener('resize', function() {
          var w = win.innerWidth, h = win.innerHeight;
          // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
          var aspectRatio = Math.max(self._aspectRatio, 9 / 16);
          var targetHeight = Math.min(h, w * aspectRatio);
          commentLayer.style.transform = 'scale(' + targetHeight / 385 + ')';
        });
        //win.addEventListener('resize', _.debounce($.proxy(self._onResizeEnd, self), 500);
        //
        ZenzaWatch.debug.getInViewElements = function() {
          return doc.getElementsByClassName('nicoChat');
        };

        if (self._isPaused) {
          self.pause();
        }

        window.console.timeEnd('initialize NicoCommentCss3PlayerView');
      };

      iframe.srcdoc = html;
      this._view = iframe;
      ZenzaWatch.debug.commentLayer = iframe;

      if (!params.show) { this.hide(); }
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
      if (!this._commentLayer || !this._style || !this._isShow) { return; }

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NORMAL),
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

      var ct = this._currentTime;
      for (i = 0, len = inView.length; i < len; i++) {
        var nicoChat = inView[i];
        var domId = nicoChat.getId();
        if (this._inViewTable[domId]) {
          continue;
        }
        // 新規に表示状態になったchatがあればdom生成
        this._inViewTable[domId] = nicoChat;
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
        this._viewModel.getGroup(NicoChat.TYPE.NORMAL),
        this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
        this._viewModel.getGroup(NicoChat.TYPE.TOP)
      ];

      var css = [], html = [];
      for(var i = 0; i < groups.length; i++) {
        var group = groups[i];
        html.push(this._buildGroupHtml(group, currentTime));
        css .push(this._buildGroupCss(group, currentTime));
      }

      var tpl = NicoCommentCss3PlayerView.__TPL__;

      tpl = tpl.replace('%CSS%', css.join(''));
      tpl = tpl.replace('%MSG%', html.join(''));

      window.console.timeEnd('buildHtml');
      return tpl;
    },

    _buildGroupHtml: function(group/*, currentTime*/) {
      var m = group.getMembers();
      var type = group.getType();
      var result = [];
      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
        result.push(this._buildChatHtml(chat, type /*, currentTime */));
      }
      return result.join('\n');
    },
    _buildGroupCss: function(group, currentTime) {
      var m = group.getMembers();
      var type = group.getType();
      var result = [];
      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
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
      //if (chat.isMine()) { className.push('mine'); }

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
      //if (chat.isMine()) { className.push('mine'); }

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
      var fontSizePx = chat.getFontSizePixel();
      //var lineHeight = chat.getLineHeight();
      var speed = chat.getSpeed();
      var delay = (beginL - currentTime) / playbackRate;
      // 本家は「古いコメントほど薄くなる」という仕様だが、特に再現するメリットもなさそうなので
      var opacity = chat.isOverflow() ? 0.8 : 1;
      //var zid = parseInt(id.substr('4'), 10);
      //var zIndex = 10000 - (zid % 5000);
      var zIndex = beginL * 1000;

      if (type === NicoChat.TYPE.NORMAL) {
        // 4:3ベースに計算されたタイミングを16:9に補正する
        scaleCss = (scale === 1.0) ? '' : (' scale(' + scale + ')');
        var outerScreenWidth = screenWidthFull * 1.05;
        var screenDiff = outerScreenWidth - screenWidth;
        var leftPos = screenWidth + screenDiff / 2;
        var durationDiff = screenDiff / speed / playbackRate;
        duration += durationDiff;
        delay -= (durationDiff * 0.5);

        result = ['',
          ' @keyframes idou', id, ' {\n',
          '    0%  {opacity: ', opacity, '; transform: translate(0px, 0px) ', scaleCss, ';}\n',
          '  100%  {opacity: ', opacity, '; transform: translate(', - (outerScreenWidth + width), 'px, 0px) ', scaleCss, ';}\n',
          ' }\n',
          '',
          ' #', id, ' {\n',
          '  z-index: ', zIndex , ';\n',
          '  top:', ypos, 'px;\n',
          '  left:', leftPos, 'px;\n',
          '  color:', color,';\n',
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
            ' transform: translate(-50%, 0);' :
            (' transform: translate(-50%, 0) scale(' + scale + ');');

        //var left = ((screenWidth - width) / 2);
        result = ['',
          ' @keyframes fixed', id, ' {\n',
          '    0% {opacity: ', opacity, ';}\n',
          '  100% {opacity: ', 0.5, ';}\n',
          ' }\n',
          '',
          ' #', id, ' {\n',
          '  z-index: ', zIndex, ';\n',
          '  top:', ypos, 'px;\n',
          '  left: 50% ;\n',
          '  color:',  color, ';\n',
          '  font-size:', fontSizePx,  'px;\n',
//          '  line-height:', lineHeight,  'px;\n',
          '  width:', width, 'px;\n',
//          '  height:', height, 'px;\n',
          scaleCss,
          '  animation-name: fixed', id, ';\n',
          '  animation-duration: ', duration, 's;\n',
          '  animation-delay: ', delay, 's;\n',
          ' }\n',
          '\n\n'];
      }

      return result.join('') + '\n';
    },
    show: function() {
      if (!this._isShow) {
        this.refresh();
      }
      console.log('show!');
      this._isShow = true;
    },
    hide: function() {
      this.clear();
      this._isShow = false;
    },
    appendTo: function($node) {
      //var $view = $(this._view);
      //$view.css({width: 1}).offset();
      $node.append(this._view);

      // リサイズイベントを発動させる。 バッドノウハウ的
      //window.setTimeout(function() { $view.css({width: ''}); }, 1000);
    },
    /**
     * toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
     * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
     * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
     */
    toString: function() {
      return this.buildHtml(0);
    }
  });




  var NicoVideoPlayerDialog = function() { this.initialize.apply(this, arguments); };
 NicoVideoPlayerDialog.__css__ = ZenzaWatch.util.hereDoc(function() {/*

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
      transition: width 0.3s ease-in 0.4s, height 0.3s ease-in;
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
      opacity: 0.8;
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

    .zenzaScreenMode_small  .zenzaPlayerContainer.backComment .commentLayerFrame,
    .zenzaScreenMode_normal .zenzaPlayerContainer.backComment .commentLayerFrame,
    .zenzaScreenMode_big    .zenzaPlayerContainer.backComment .commentLayerFrame {
      top:  calc(-50vh + 50%);
      left: calc(-50vw + 50%);
      width:  100vw;
      height: 100vh;
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

    {* 面白いけど、ちょっとないわー *}
    {*
    .zenzaScreenMode_sideView  .zenzaPlayerContainer.backComment .commentLayerFrame {
      top:   0;
      left:  400px;
      width: calc(100vw - 400px);
      height: 100vh;
      right: auto;
      bottom: auto;
      z-index: 1;
    }
    *}

    .mouseMoving .commentLayerFrame {
      {* height: calc(100% - 50px); *}
      cursor: auto;
    }


    .closeButton {
      position: absolute;
      cursor: pointer;
      width: 32px;
      height: 32px;
      box-sizing: border-box;
      text-align: center;
      line-height: 32px;
      top: 0;
      right: 0;
      z-index: 160000;
      margin: 0 0 40px 40px;
      opacity: 0;
      color: #ccc;
      border: solid 1px;
      transition: opacity 0.4s ease;
      pointer-events: auto;
    }

    .mouseMoving .closeButton,
    .closeButton:hover {
      opacity: 1;
      background: #000;
    }


    .fullScreen .videoPlayer,
    .fullScreen .commentLayerFrame {
      top:  0 !important;
      left: 0 !important;
      width:  100% !important;
      height: 100% !important;
      right:  0 !important;
      bottom: 0 !important;
      border: 0 !important;
      z-index: 100 !important;
    }

    .fullScreen .showComment.backComment .videoPlayer
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
      opacity: 0.8;
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




  */});

  NicoVideoPlayerDialog.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaVideoPlayerDialog">
      <div class="zenzaVideoPlayerDialogInner">
        <div class="menuContainer"></div>
        <div class="zenzaPlayerContainer">
          <div class="closeButton">×</div>

          <div class="popupMessageContainer"></div>
        </div>
      </div>
    </div>
  */});

  _.assign(NicoVideoPlayerDialog.prototype, {
    initialize: function(params) {
      this._offScreenLayer = params.offScreenLayer;
      this._playerConfig = params.playerConfig;
      this._keyEmitter = params.keyHandler || ShortcutKeyEmitter;

      this._playerConfig.on('update-screenMode', $.proxy(this._updateScreenMode, this));
      this._initializeDom(params);

      this._keyEmitter.on('keyDown', $.proxy(this._onKeyDown, this));

      this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
      this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(NicoVideoPlayerDialog.__css__);
      var $dialog = this._$dialog = $(NicoVideoPlayerDialog.__tpl__);

      this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
      this._$playerContainer.on('click', function(e) {
        ZenzaWatch.emitter.emitAsync('hideHover');
        e.preventDefault();
        e.stopPropagation();
      });

      this.setIsBackComment(this._playerConfig.getValue('backComment'));
      this._$playerContainer.toggleClass('showComment',
        this._playerConfig.getValue('showComment'));
      this._$playerContainer.toggleClass('mute',
        this._playerConfig.getValue('mute'));
      this._$playerContainer.toggleClass('loop',
        this._playerConfig.getValue('loop'));


      // マウスを動かしてないのにmousemoveが飛んでくるのでねずみかます
      var lastX = 0, lastY = 0;
      var onMouseMove    = $.proxy(this._onMouseMove, this);
      var onMouseMoveEnd = _.debounce($.proxy(this._onMouseMoveEnd, this), 1500);
      this._$playerContainer.on('mousemove', $.proxy(function(e) {
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

      $dialog.on('click', $.proxy(this._onClick, this));
      $dialog.find('.closeButton')
        .on('click', $.proxy(this._onCloseButtonClick, this));

      this._hoverMenu = new VideoHoverMenu({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig
      });
      this._hoverMenu.on('volume', $.proxy(function(vol) {
        this.setVolume(vol);
      }, this));
      this._hoverMenu.on('fullScreen', $.proxy(function() {
        this._nicoVideoPlayer.toggleFullScreen();
      }, this));
      this._hoverMenu.on('deflistAdd', $.proxy(this._onDeflistAdd, this));
      this._hoverMenu.on('mylistAdd',  $.proxy(this._onMylistAdd, this));
      this._hoverMenu.on('mylistWindow',  $.proxy(function() {
        window.open(
         '//www.nicovideo.jp/mylist_add/video/' + this._videoInfo.getWatchId(),
         'mylist_add',
         'width=450, height=340, menubar=no, scrollbars=no');
      },this));


      $('body').append($dialog);
    },
    _onKeyDown: function(name /*, target */) {
      if (!this._isOpen) {
        return;
      }
      switch (name) {
        case 'SPACE':
        case 'PAUSE':
          this._nicoVideoPlayer.togglePlay();
          break;
        case 'ESC':
          if (!FullScreen.now()) {
            this.close();
          }
          break;
        case 'FULL':
          this._nicoVideoPlayer.requestFullScreen();
          break;
        case 'DEFLIST':
          this._onDeflistAdd();
          break;
        case 'VIEW_COMMENT':
          var v = this._playerConfig.getValue('showComment');
          this._playerConfig.setValue('showComment', !v);
          break;
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
        case 'debug':
          PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
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
      $('body').addClass('zenzaScreenMode_' + mode);
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
      $('body').removeClass(modes);
    },
    _onClick: function() {
    },
    _onCloseButtonClick: function() {
      if (FullScreen.now()) {
        FullScreen.cancel();
      } else {
        this.close();
      }
    },
    _onDeflistAdd: function() {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingDeflist')) { return; } //busy

      var removeClass = function() {
        $container.removeClass('updatingDeflist');
      };

      $container.addClass('updatingDeflist');
      var timer = window.setTimeout(function() {
        $container.removeClass('updatingDeflist');
      }, 10000);

      var owner = this._videoInfo.getOwnerInfo();
      var watchId = this._videoInfo.getWatchId();
      var description = '投稿者: ' + owner.name;
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
      var description = '投稿者: ' + owner.name;
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
    show: function() {
      this._$dialog.addClass('show');
      if (!FullScreen.now()) {
        $('body').removeClass('fullScreen');
      }
      $('body').addClass('showNicoVideoPlayerDialog');
      this._updateScreenMode(this._playerConfig.getValue('screenMode'));
      this._isOpen = true;
    },
    hide: function() {
      this._$dialog.removeClass('show');
      $('body').removeClass('showNicoVideoPlayerDialog');
      this._clearClass();
      this._isOpen = false;
    },
    open: function(watchId, options) {
      window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);

      var nicoVideoPlayer = this._nicoVideoPlayer;
      if (!nicoVideoPlayer) {
        this._nicoVideoPlayer = nicoVideoPlayer = new NicoVideoPlayer({
          offScreenLayer: this._offScreenLayer,
          node: this._$playerContainer,
          volume: Config.getValue('volume'),
          loop: Config.getValue('loop'),
          playerConfig: Config
        });

        this._messageApiLoader = new MessageApiLoader();

        window.setTimeout($.proxy(function() {
          this._videoInfoPanel = new VideoInfoPanel({
            dialog: this,
            player: nicoVideoPlayer,
            node: this._$playerContainer
          });
        }, this), 0);

        nicoVideoPlayer.on('loadedMetaData', $.proxy(this._onLoadedMetaData, this));
        nicoVideoPlayer.on('ended',          $.proxy(this._onVideoEnded,     this));
        nicoVideoPlayer.on('canPlay',        $.proxy(this._onVideoCanPlay,   this));

        nicoVideoPlayer.on('volumeChange',
          $.proxy(this._onVolumeChange, this));
        nicoVideoPlayer.on('volumeChange',
          _.debounce($.proxy(this._onVolumeChangeEnd, this), 1500));
      } else {
        nicoVideoPlayer.close();
        this._videoInfoPanel.clear();
      }

      this._bindLoaderEvents();

      this._videoWatchOptions = options || {};

      this._playerConfig.setValue('lastPlayerId', this.getId());

      // watchIdからサムネイルを逆算できる時は最速でセットする
      var thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(watchId);
      if (thumbnail) {
        nicoVideoPlayer.setThumbnail(thumbnail);
      }

      this._watchId = watchId;
      window.console.time('VideoInfoLoader');
      VideoInfoLoader.load(watchId);

      this.show(options);
      ZenzaWatch.emitter.emitAsync('DialogPlayerOpen');
    },
    getCurrentTime: function() {
      if (!this._nicoVideoPlayer) {
        return 0;
      }
      return this._nicoVideoPlayer.getCurrentTime();
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
      }
      this._onVideoInfoLoaderLoad_proxy = $.proxy(this._onVideoInfoLoaderLoad, this);
      VideoInfoLoader.on('load', this._onVideoInfoLoaderLoad_proxy);
    },
    _onVideoInfoLoaderLoad: function(videoInfo, type, watchId) {
      window.console.timeEnd('VideoInfoLoader');
      console.log('VideoInfoLoader.load!', watchId, type, videoInfo);

      if (type !== 'WATCH_API') {
        this._nicoVideoPlayer.setThumbnail(videoInfo.thumbImage);
        this._nicoVideoPlayer.setVideo(videoInfo.url);

        this._threadId = videoInfo.thread_id;

        this._messageApiLoader.load(
          videoInfo.ms,
          videoInfo.thread_id,
          videoInfo.l,
          videoInfo.user_id,
          videoInfo.needs_key === '1',
          videoInfo.optional_thread_id
        ).then(
          $.proxy(this._onCommentLoadSuccess, this, watchId),
          $.proxy(this._onCommentLoadFail, this, watchId)
        );

        this._$playerContainer.addClass('noVideoInfoPanel');

      } else {
        if (this._watchId !== watchId) {
          return;
        }
        var flvInfo   = videoInfo.flvInfo;
        var videoUrl  = flvInfo.url;

        this._videoInfo = new VideoInfoModel(videoInfo);
        this._nicoVideoPlayer.setThumbnail(videoInfo.thumbnail);
        this._nicoVideoPlayer.setVideo(videoUrl);

        this._threadId = flvInfo.thread_id;

        
        this._messageApiLoader.load(
          flvInfo.ms,
          flvInfo.thread_id,
          flvInfo.l,
          flvInfo.user_id,
          flvInfo.needs_key === '1',
          flvInfo.optional_thread_id
        ).then(
          $.proxy(this._onCommentLoadSuccess, this, watchId),
          $.proxy(this._onCommentLoadFail, this, watchId)
        );

        if (this._videoInfoPanel) {
          this._videoInfoPanel.update(this._videoInfo);
        }
      }
      ZenzaWatch.emitter.emitAsync('loadVideoInfo', videoInfo, type);
    },
    _onCommentLoadSuccess: function(watchId, result) {
      if (watchId !== this._watchId) {
        return;
      }
      PopupMessage.notify('コメント取得成功');
      this._nicoVideoPlayer.setComment(result.xml);
    },
    _onCommentLoadFail: function(e) {
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
    },
    _onVideoEnded: function() {
      // ループ再生中は飛んでこない
      this.emit('ended');
      ZenzaWatch.emitter.emitAsync('videoEnded');
    },
    _onVolumeChange: function(vol, mute) {
      this.emit('volumeChange', vol, mute);
      this._$playerContainer.addClass('volumeChanging');
    },
    _onVolumeChangeEnd: function(vol, mute) {
      this.emit('volumeChangeEnd', vol, mute);
      this._$playerContainer.removeClass('volumeChanging');
    },
    close: function() {
      this.hide();
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.close();
      }
      if (this._onVideoInfoLoaderLoad_proxy) {
        VideoInfoLoader.off('load', this._onVideoInfoLoaderLoad_proxy);
        this._onVideoInfoLoaderLoad_proxy = null;
      }
      ZenzaWatch.emitter.emitAsync('DialogPlayerClose');
    },
    play: function() {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.play();
      }
    },
    pause: function() {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.pause();
      }
    },
    setVolume: function(v) {
      if (this._nicoVideoPlayer) {
        this._nicoVideoPlayer.setVolume(v);
      }
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._nicoVideoPlayer) {
        return;
      }

      options = options || {};
      options.mine = '1';
      vpos = vpos || this._nicoVideoPlayer.getVpos();
      var nicoChat = this._nicoVideoPlayer.addChat('通信中...', cmd, vpos, options);
      var onSuccess = function() {
        nicoChat.setText(text);
        PopupMessage.notify('コメントの投稿成功');
      };

      window.setTimeout(onSuccess, 1500);
    },
    getPlayingStatus: function() {
      if (!this._nicoVideoPlayer || !this._nicoVideoPlayer.isPlaying()) {
        return {};
      }
      return {
        playing: true,
        watchId: this._watchId,
        url: location.href,
        currentTime: this._nicoVideoPlayer.getCurrentTime()
      };
    }
  });

  var VideoHoverMenu = function() { this.initialize.apply(this, arguments); };
  VideoHoverMenu.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .menuItemContainer {
      box-sizing: border-box;
      position: absolute;
      z-index: 130000;
      {*border: 1px solid #ccc;*}
      overflow: visible;
    }

    .menuItemContainer.rightTop {
      width: 72px;
      height: 40px;
      right: 40px;
      {*border: 1px solid #ccc;*}
      top: 0;
    }

    .updatingDeflist .menuItemContainer.rightTop,
    .updatingMylist .menuItemContainer.rightTop {
      cursor: wait;
      opacity: 1 !important;
    }
    .updatingDeflist .menuItemContainer.rightTop>*,
    .updatingMylist .menuItemContainer.rightTop>* {
      pointer-events: none;
    }

    .menuItemContainer.leftBottom {
      width: 72px;
      height: 112px;
      left: 8px;
      bottom: 64px;
    }

    .menuItemContainer.rightBottom {
      width: 120px;
      height: 32px;
      right:  0;
      bottom: 0px;
    }


    .menuButton {
      position: absolute;
      opacity: 0;
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
      box-sizing: border-box;
      text-align: center;
      pointer-events: none;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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
    }

    .menuButton:hover {
      cursor: pointer;
      opacity: 1;
    }

    .showCommentSwitch {
      left: 0;
      bottom: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 18px;
    }
    .showCommentSwitch:hover {
      font-size: 120%;
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
    }

    .loopSwitch {
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
    .loopSwitch:hover {
      box-shadow: 4px 4px 0 #000;
    }
    .loopSwitch:active {
      box-shadow: none;
      margin-left: 4px;
      margin-top:  4px;
    }

    .loop .loopSwitch {
      background:#888;
      color: #fff;
      text-shadow: 0 0 6px orange;
    }

    .muteSwitch {
      left: 0;
      bottom: 80px;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 18px;
      background:#888;
    }
    .muteSwitch:hover {
      box-shadow: 4px 4px 0 #000;
    }
    .muteSwitch:active {
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
      bottom: 0;
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


    .menuItemContainer .volumeControl {
      position: absolute;
      left: 40px;
      bottom: 40px;
      width: 32px;
      height: 72px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.4s ease;
      pointer-events: none;
    }
    .menuItemContainer:hover .volumeControl {
      pointer-events: auto;
    }
    .volumeControl:hover {
      pointer-events: auto;
      background: rgba(0x33, 0x33, 0x33, 0.8);
      opacity: 1;
    }

    .mute .volumeControl {
      border: 1px solid #600;
      background: none !important;
      pointer-events: none !important;
    }
    .mute .volumeControl>* {
      display: none;
    }

    .volumeChanging  .menuItemContainer .volumeControl,
    .mouseMoving     .menuItemContainer .volumeControl {
      opacity: 0.5;
      border: 1px solid #888;
    }


    .volumeControl .volumeControlInner {
      position: relative;
      box-sizing: border-box;
      width: 16px;
      height: 64px;
      border: 1px solid #888;
      margin: 4px 8px;
      cursor: pointer;
    }

    .volumeControl .volumeControlInner .slideBar {
      position: absolute;
      width: 100%;
      height: 50%;
      left: 0;
      bottom: 0;
      background: rgba(255,255,255, 0.8);
      pointer-events: none;
      mix-blend-mode: difference;
    }


    .fullScreenSwitch {
      right: 0;
      bottom: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 32px;
      font-size: 24px;
    }
    .fullScreenSwitch .menuButtonInner {
      position: absolute;
      font-size: 10px;
      width: 16px;
      height: 16px;
      right: 1px;
      bottom: 8px;
    }
    .fullScreen .fullScreenSwitch .menuButtonInner {
      top: -6px;
      left: 0;
      right: auto;
      bottom: auto;
    }

             .fullScreen  .fullScreenSwitch .menuButtonInner .toFull,
    body:not(.fullScreen) .fullScreenSwitch .menuButtonInner .returnFull {
      display: none;
    }

    .mouseMoving .fullScreenSwitch {
      text-shadow: -1px -1px 2px #888,1px 1px 2px #888;
    }

    .fullScreenSwitch:hover {
      background: #888;
      box-shadow: 4px 4px 0 #000;
    }
    .fullScreenSwitch:active {
      box-shadow: none;
      margin-left: 4px;
      margin-top:  4px;
    }
    .fullScreen .fullScreenSwitch:hover {
    }
    .fullScreen .fullScreenSwitch {
      font-size: 16px;
    }


    .screenModeMenu {
      right: 80px;
      bottom: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 24px;
      margin-left: -4px;
      margin-top:  -4px;
    }
    .mouseMoving .playbackRateMenu,
    .mouseMoving .screenModeMenu {
      text-shadow: 0px 0px 2px #ccf;
    }
    .playbackRateMenu:hover,
    .screenModeMenu:hover {
      box-shadow: 4px 4px 0 #000;
      background: #888;
      text-shadow: 0px 0px 2px #66f;
    }
    .playbackRateMenu.show,
    .screenModeMenu.show {
      opacity: 1;
      border: 1px inset #000;
      background: #888;
      box-shadow: none;
      margin-left: 0;
      margin-top:  0;
    }
    .playbackRateMenu:active,
    .screenModeMenu:active {
      box-shadow: none;
      margin-left: 0px;
      margin-top:  0px;
    }


    .fullScreen .screenModeMenu {
      display: none;
    }

    .screenModeSelectMenu {
      position: absolute;
      right: 20px;
      bottom: 40px;
      width: 140px;
      box-sizng: border-box;
      background: #333;
      color: #fff;
      border: 1px solid #ccc;
      opacity: 0.9;
      transition: opacity 0.3s ease;
      z-index: 150000;
      padding: 2px 4px;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .screenModeSelectMenu:not(.show) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
      pointer-events: none;
    }
    .fullScreen .screenModeSelectMenu {
      display: none;
    }

    .screenModeSelectMenu p {
      padding: 2px 4px;
      text-align: center;
      margin: 0;
      font-weight: bolder;
      background: #666;
      color: #fff;
    }

    .screenModeSelectMenu .triangle {
      transform: rotate(-45deg);
      position: absolute;
      bottom: -8.5px;
      right: 68px;
      width: 16px;
      height: 16px;
      border: 1px solid #ccc;
      border-width: 0 0 1px 1px;
      background: #333;
      box-sizing: border-box;
    }
    .screenModeSelectMenu li {
      list-style-type: none;
      display: inline-block;
      text-align: center;
    }
    .screenModeSelectMenu li span {
      border: 1px solid #ccc;
      width: 50px;
      display: inline-block;
      margin: 2px 8px;
      padding: 4px 0;
      box-sizing: border-box;
      cursor: pointer;
    }
    .screenModeSelectMenu li span:hover {
      background: #663;
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

    .playbackRateMenu {
      right: 40px;
      bottom: 0;
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #fff;
      line-height: 30px;
      font-size: 14px;
      margin-left: -4px;
      margin-top:  -4px;
    }
    .playbackRateSelectMenu {
      position: absolute;
      right: 40px;
      bottom: 40px;
      width: 140px;
      box-sizng: border-box;
      background: #333;
      color: #fff;
      border: 1px solid #ccc;
      opacity: 0.9;
      transition: opacity 0.3s ease;
      z-index: 150000;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .playbackRateSelectMenu p {
      padding: 2px 4px;
      text-align: center;
      margin: 0;
      font-weight: bolder;
      background: #666;
      color: #fff;
    }
    .playbackRateSelectMenu ul {
      margin: 2px 8px;
    }
    .playbackRateSelectMenu:not(.show) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
      pointer-events: none;
    }
    .zenzaScreenMode_sideView .playbackRateSelectMenu,
    .zenzaScreenMode_small    .playbackRateSelectMenu {
      left: 368px;
      top: 48px;
      right: auto;
      bottom: auto;
    }

    .fullScreen .screenModeSelectMenu {
      display: none;
    }

    .playbackRateSelectMenu .triangle {
      transform: rotate(-45deg);
      position: absolute;
      bottom: -9px;
      right: 8px;
      width: 16px;
      height: 16px;
      border: 1px solid #ccc;
      border-width: 0 0 1px 1px;
      background: #333;
      box-sizing: border-box;
    }
    .zenzaScreenMode_sideView .playbackRateSelectMenu .triangle,
    .zenzaScreenMode_small    .playbackRateSelectMenu .triangle {
      transform: rotate(45deg);
      top: 154px;
      left: -8px;
      bottom: auto;
      right: auto;
    }

    .playbackRateSelectMenu li {
      position: relative;
      padding: 3px 4px;
      cursor: pointer;
      list-style-type: none;
      border-bottom: 1px dotted #888;
    }
    .playbackRateSelectMenu li:hover {
      background: #663;
    }
    .playbackRateSelectMenu li.selected {
      font-weight: bolder;
    }
    .playbackRateSelectMenu li span {
      margin-left: 8px;
      display: inline-block;
    }
    .playbackRateSelectMenu ul li.selected span:before {
      content: '✔';
      left: 0;
      position: absolute;
    }


    .mylistButton {
      width:  32px;
      height: 32px;
      color: #000;
      border: 1px solid #000;
      border-radius: 4px;
      line-height: 30px;
      font-size: 21px;
    }
    .mouseMoving .mylistButton {
      text-shadow: 1px 1px 2px #888;
    }

    .mylistButton.mylistAddMenu {
      left: 0;
      top: 0;
    }
    .mylistButton.deflistAdd {
      left: 40px;
      top: 0;
    }

    .mylistButton:hover {
      box-shadow: 2px 4px 2px #000;
      background: #888;
      text-shadow: 0px 0px 2px #66f;
    }
    .mylistButton:active {
      box-shadow: none;
      margin-left: 2px;
      margin-top:  4px;
    }

    .updatingDeflist .mylistButton.deflistAdd {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset !important;
      box-shadow: none !important;
      margin-left: 2px !important;
      margin-top:  4px !important;
      background: #888 !important;
    }

    .mylistButton.mylistAddMenu.show,
    .updatingMylist  .mylistButton.mylistAddMenu {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset #000 !important;
      box-shadow: none !important;
      background: #888 !important;
    }

    .mylistSelectMenu {
      position: absolute;
      top: 38px;
      right: 32px;
      background: #333;
      overflow: visible;
      padding: 8px 0;
      border: 1px solid #ccc;
      opacity: 0.9;
      box-shadow: 2px 2px 4px #fff;
      transition: opacity 0.3s ease;
      z-index: 150000;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    .mylistSelectMenu .triangle {
      transform: rotate(135deg);
      position: absolute;
      top: -8.5px;
      right: 55px;
      width: 16px;
      height: 16px;
      border: 1px solid #ccc;
      border-width: 0 0 1px 1px;
      background: #333;
      box-sizing: border-box;
    }

    .mylistSelectMenu:not(.show) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
      pointer-events: none;
    }

    .mylistSelectMenu ul {
      padding: 0;
    }

    .mylistSelectMenu ul li {
      position: relative;
      line-height: 120%;
      margin: 2px 4px;
      overflow-y: visible;
      white-space: nowrap;
      cursor: pointer;
      padding: 2px 8px;
      list-style-type: none;
      float: inherit;
    }
    .mylistSelectMenu ul li:hover {
      background: #663;
    }
    .mylistSelectMenu ul li.separator {
      border: 1px outset;
      height: 2px;
      width: 90%;
    }
    .mylistSelectMenu.show {
      opacity: 0.8;
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


  */});

  VideoHoverMenu.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="menuItemContainer rightTop">
      <div class="menuButton mylistButton mylistAddMenu" data-command="mylistMenu" title="マイリスト">
        <div class="menuButtonInner">My</div>
      </div>
      <div class="menuButton mylistButton deflistAdd" data-command="deflistAdd" title="とりあえずマイリスト">
        <div class="menuButtonInner">&#9547;</div>
      </div>
    </div>
    <div class="mylistSelectMenu">
      <div class="triangle"></div>
    </div>

    <div class="menuItemContainer leftBottom">
      <div class="loopSwitch menuButton" data-command="loop" title="リピート">
        <div class="menuButtonInner">&#x27F3;</div>
      </div>

      <div class="muteSwitch menuButton" data-command="mute" title="ミュート">
        <div class="menuButtonInner mute-off">&#x1F50A;</div>
        <div class="menuButtonInner mute-on">&#x1F507;</div>
      </div>

      <div class="volumeControl">
        <div class="volumeControlInner">
          <div class="slideBar"></div>
        </div>
      </div>

      <div class="showCommentSwitch menuButton" data-command="showComment" title="コメントの表示ON/OFF">
        <div class="menuButtonInner">C</div>
      </div>

      <div class="commentLayerOrderSwitch menuButton" data-command="backComment" title="コメントの表示順">
        <div class="layer comment">C</div>
        <div class="layer video">V</div>
      </div>
    </div>
    <div class="menuItemContainer rightBottom">
      <div class="fullScreenSwitch menuButton" data-command="fullScreen" title="フルスクリーン">
        <div class="menuButtonInner">
          <span class="toFull">&#9698;</span>
          <span class="returnFull">&#9700;</span>
        </div>
      </div>
      <div class="screenModeMenu menuButton" data-command="screenModeMenu" title="画面モード">
        <div class="menuButtonInner">&#9114;</div>
      </div>
      <div class="playbackRateMenu menuButton" data-command="playbackRateMenu" title="再生速度">
        <div class="menuButtonInner">1x</div>
      </div>
    </div>
    <div class="screenModeSelectMenu">
      <div class="triangle"></div>
      <p>画面モード</p>
      <ul>
        <li class="screenMode mode3D"   data-command="screenMode" data-screen-mode="3D"><span>3D</span></li>
        <li class="screenMode sideView" data-command="screenMode" data-screen-mode="sideView"><span>横</span></li>
        <li class="screenMode small"    data-command="screenMode" data-screen-mode="small"><span>小</span></li>
        <li class="screenMode normal"   data-command="screenMode" data-screen-mode="normal"><span>中</span></li>
        <li class="screenMode big"      data-command="screenMode" data-screen-mode="big"><span>大</span></li>
        <li class="screenMode wide"     data-command="screenMode" data-screen-mode="wide"><span>WIDE</span></li>
      </ul>
    </div>
    <div class="playbackRateSelectMenu">
      <div class="triangle"></div>
      <p>再生速度</p>
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
  
  */});

  _.assign(VideoHoverMenu.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;
      this._videoInfo        = params.videoInfo;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._initializeDom();
      this._initializeScreenModeSelectMenu();
      this._initializePlaybackRateSelectMenu();

      ZenzaWatch.util.callAsync(this._initializeMylistSelectMenu, this);
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(VideoHoverMenu.__css__);
      this._$playerContainer.append(VideoHoverMenu.__tpl__);

      var $container = this._$playerContainer;
      $container.find('.menuButton')
        .on('click', $.proxy(this._onMenuButtonClick, this));

      this._$deflistAdd       = $container.find('.deflistAdd');
      this._$mylistAddMenu    = $container.find('.mylistAddMenu');
      this._$mylistSelectMenu = $container.find('.mylistSelectMenu');

      this._$screenModeMenu       = $container.find('.screenModeMenu');
      this._$screenModeSelectMenu = $container.find('.screenModeSelectMenu');

      this._$playbackRateMenu       = $container.find('.playbackRateMenu');
      this._$playbackRateSelectMenu = $container.find('.playbackRateSelectMenu');

      this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));
      this._initializeVolumeCotrol();

      ZenzaWatch.emitter.on('hideHover', $.proxy(function() {
        this._hideMenu(false);
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

      $menu.append($ul);
      $menu.on('click', '.mylistIcon, .mylistLink', function(e) {
        e.preventDefault();
        var $target  = $(e.target.closest('.mylistIcon, .mylistLink'));
        var command    = $target.attr('data-command');
        var mylistId   = $target.attr('data-mylist-id');
        var mylistName = $target.attr('data-mylist-name');

        self.toggleMylistMenu(false);

        if (command === 'open') {
          location.href = '//www.nicovideo.jp/my/mylist/#/' + mylistId;
        } else {
          self.emit('mylistAdd', mylistId, mylistName);
        }
      });

    },
    _initializeScreenModeSelectMenu: function() {
      var self = this;
      var $menu = this._$screenModeSelectMenu;

      $menu.on('click', 'span', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.screenMode'));
        var mode     = $target.attr('data-screen-mode');

        self._playerConfig.setValue('screenMode', mode);
        //self.toggleScreenModeMenu(false);
      });

    },
    _initializePlaybackRateSelectMenu: function() {
      var self = this;
      var config = this._playerConfig;
      var $btn  = this._$playbackRateMenu;
      var $menu = this._$playbackRateSelectMenu;

      $menu.on('click', '.playbackRate', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.playbackRate'));
        var rate     = parseFloat($target.attr('data-rate'), 10);

        self._playerConfig.setValue('playbackRate', rate);
        //self.toggleScreenModeMenu(false);
      });

      var updatePlaybackRate = function(rate) {
        $btn.text(rate + 'x');
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
    _initializeVolumeCotrol: function() {
      var $container = this._$playerContainer.find('.volumeControl');
      var $bar = this._$playerContainer.find('.volumeControl .slideBar');

      this._setVolumeBar = function(v) {
        var per = Math.round(v * 100);
        $bar.css({ height: per + '%'});
        $container.attr('title', '音量 (' + per + '%)');
      };

      var $inner = this._$playerContainer.find('.volumeControlInner');
      $inner.on('mousedown', $.proxy(function(e) {
        var height = $inner.outerHeight();
        var y = (height - e.offsetY);
        var vol = y / height;

        this.emit('volume', vol);

        e.preventDefault();
        e.stopPropagation();
      }, this));

      this._setVolumeBar(this._playerConfig.getValue('volume'));
    },
    _onMenuButtonClick: function(e) {
      e.preventDefault();
      //e.stopPropagation();

      var $target = $(e.target.closest('.menuButton'));
      var command = $target.attr('data-command');
      switch (command) {
        case 'close':
          this._onCloseButtonClick();
          break;
        case 'fullScreen':
          this.emit('fullScreen');
          break;
        case 'deflistAdd':
          if (e.shiftKey) {
            this.emit('mylistWindow');
          } else {
            this.emit('deflistAdd');
          }
          break;
        case 'mylistMenu':
          if (e.shiftKey) {
            this.emit('mylistWindow');
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
        case 'mylistAdd':
          this.emit('mylistAdd', $target.attr('data-mylist-id'));
          break;
        case 'loop':
        case 'mute':
        case 'backComment':
        case 'showComment':
          this._playerConfig.setValue(command, !this._playerConfig.getValue(command));
          break;
       }
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'volume':
          this._setVolumeBar(value);
          break;
      }
    },
    _hideMenu: function() {
      this.toggleMylistMenu(false);
      this.toggleScreenModeMenu(false);
      this.togglePlaybackRateMenu(false);
    },
    toggleMylistMenu: function(v) {
      var $body = $('body');
      var $btn  = this._$mylistAddMenu.toggleClass('show', v);
      var $menu = this._$mylistSelectMenu.toggleClass('show', v);
      $body.off('click.ZenzaWatchMylistMenu');

      var onBodyClick = function() {
        $btn.removeClass('show');
        $menu.removeClass('show');
        $body.off('click.ZenzaWatchMylistMenu');
      };
      if ($menu.hasClass('show')) {
        this.toggleScreenModeMenu(false);
        this.togglePlaybackRateMenu(false);
        $body.on('click.ZenzaWatchMylistMenu', onBodyClick);
      }
    },
    toggleScreenModeMenu: function(v) {
      var $body = $('body');
      var $btn  = this._$screenModeMenu.toggleClass('show', v);
      var $menu = this._$screenModeSelectMenu.toggleClass('show', v);
      $body.off('click.ZenzaWatchScreenModeMenu');

      var onBodyClick = function() {
        $btn.removeClass('show');
        $menu.removeClass('show');
        $body.off('click.ZenzaWatchScreenModeMenu');
      };
      if ($menu.hasClass('show')) {
        this.toggleMylistMenu(false);
        this.togglePlaybackRateMenu(false);
        $body.on('click.ZenzaWatchScreenModeMenu', onBodyClick);
      }
    },
    togglePlaybackRateMenu: function(v) {
      var $body = $('body');
      var $btn  = this._$playbackRateMenu.toggleClass('show', v);
      var $menu = this._$playbackRateSelectMenu.toggleClass('show', v);
      $body.off('click.ZenzaWatchPlaybackRateMenu');

      var onBodyClick = function() {
        $btn.removeClass('show');
        $menu.removeClass('show');
        $body.off('click.ZenzaWatchPlaybackRateMenu');
      };
      if ($menu.hasClass('show')) {
        this.toggleMylistMenu(false);
        this.toggleScreenModeMenu(false);
        $body.on('click.ZenzaWatchPlaybackRateMenu', onBodyClick);
      }
    }
   });



  var VideoInfoPanel = function() { this.initialize.apply(this, arguments); };
  VideoInfoPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaWatchVideoInfoPanel .tabs {
      display: none;
    }
    .zenzaWatchVideoInfoPanel .activeTab {
      display: inherit;
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
      overflow-y: visible;
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
        height: 100vh;
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
        height: 100vh;
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

    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel,
    .fullScreen            .zenzaWatchVideoInfoPanel {
      top: 10%;
      right: calc(32px - 320px);
      left: auto;
      width: 320px;
      height: 80%;
      background: none;
      opacity: 0;
      box-shadow: none;
      transition: opacity 0.4s ease, right 0.4s ease 1s;
    }

    .zenzaScreenMode_wide .mouseMoving  .zenzaWatchVideoInfoPanel,
    .fullScreen           .mouseMoving  .zenzaWatchVideoInfoPanel {
      height: 80%;
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
      transition: opacity 0.4s ease, right 0.4s ease;
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
      line-height: 150%;
      word-break: break-all;
    }

    .zenzaWatchVideoInfoPanel .videoDescription:first-letter {
    }

    .zenzaWatchVideoInfoPanel .videoDescription a {
      display: inline-block;
      font-weight: bold;
      text-decoration: none;
      color: #ff9;
    }
    .zenzaWatchVideoInfoPanel .videoDescription a:visited {
      color: #ffc;
    }

    .zenzaWatchVideoInfoPanel .videoDescription .watch .videoThumbnail {
      position: absolute;
      width: 160px;
      height: 120px;
      right: 4px;
      margin-top: -60px;
      opacity: 0;
      z-index: 100;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .zenzaWatchVideoInfoPanel .videoDescription .watch:hover .videoThumbnail {
      opacity: 1;
      box-shadow: 4px 4px 0 #000;
      transition: opacity 0.3s ease 0.4s;
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

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
      top: 230px;
      left: 0;
      width: 400px;
      height: calc(100vh - 230px);
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
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
      display: block;
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
      margin: 0 0 64px;
      padding: 8px;
      background: #ddd;
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

  */});

  VideoInfoPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaWatchVideoInfoPanel show initializing">
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
    </div>
  */});

  _.assign(VideoInfoPanel.prototype, {
    initialize: function(params) {
      this._videoTitlePanel = new VideoHeaderPanel(params);
      this._dialog = params.dialog;

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
      this._$description.on('click', $.proxy(this._onDescriptionClick, this));

      this._$videoTags = $view.find('.videoTags');
      this._$publicStatus = $view.find('.publicStatus');

      this._$view.on('click', function(e) {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
      }).on('mousewheel', function(e) {
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
        dialog.open(RegExp.$1);
      } else
       if (text.match(/^mylist\/(\d+)/)) {
        return;
      } else
      if ($target.hasClass('seekTime')) {
        e.preventDefault(); e.stopPropagation();
        var data = $target.attr('data-seekTime').split(":");
        var sec = data[0] * 60 + parseInt(data[1], 10);
        dialog.setCurrentTime(sec);
      }
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
    }
  });

  var VideoHeaderPanel = function() { this.initialize.apply(this, arguments); };
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

    .zenzaWatchVideoHeaderPanel h2 {
      margin: 8px;
    }
    .zenzaWatchVideoHeaderPanel .publicStatus {
      color: #ccc;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel
    {
      top: 0px;
      bottom: auto;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      box-shadow: none;
    }

    .fullScreen .zenzaWatchVideoHeaderPanel {
      top: 0;
      bottom: auto;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      box-shadow: none;
    }


    .zenzaScreenMode_wide .mouseMoving .zenzaWatchVideoHeaderPanel,
    .fullScreen           .mouseMoving .zenzaWatchVideoHeaderPanel {
      opacity: 0.5;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel:hover,
    .fullScreen           .zenzaWatchVideoHeaderPanel:hover {
      opacity: 1;
    }

    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .fullScreen .zenzaWatchVideoHeaderPanel .videoTagsContainer {
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
      color: white;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      display: block;
    }
    .zenzaWatchVideoHeaderPanel h2:hover {
      background: #666;
    }
    .zenzaWatchVideoHeaderPanel h2 {
      max-width: calc(100vw - 200px);
    }
     .zenzaWatchVideoHeaderPanel .videoTitle:hover {
      text-decoration: underline;
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
    <div class="zenzaWatchVideoHeaderPanel show initializing">
      <h2><a class="ginzaLink noHoverMenu" target="_blank">
        <span class="videoTitle"></span></a>
      </h2>
      <p class="publicStatus">
        <span class="postedAtOuter">
          <span class="userVideo">投稿日:</span>
          <span class="channelVideo">配信日:</span>
          <span class="postedAt"></span>
        </span>

        <span class="countOuter">
          <span class="column">再生数:     <span class="count viewCount"></span></span>
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

      this._$videoTitle = $view.find('.videoTitle');
      this._$ginzaLink = $view.find('.ginzaLink');
      this._$postedAt = $view.find('.postedAt');

      this._$viewCount    = $view.find('.viewCount');
      this._$commentCount = $view.find('.commentCount');
      this._$mylistCount  = $view.find('.mylistCount');

      this._$tagList      = $view.find('.videoTags');

      this._$tagList.on('click', function(e) {
        e.stopPropagation();
      });
      this._$ginzaLink.on('click', function(e) {
        e.stopPropagation();
      });
      this._$ginzaLink.on('mousedown', $.proxy(this._onGinzaLinkMouseDown, this));
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;

      this._$videoTitle.html(videoInfo.getTitle()).attr('title', videoInfo.getTitle());
      this._$postedAt.text(videoInfo.getPostedAt());

      var link = 'http://www.nicovideo.jp/watch/' + videoInfo.getWatchId();
      this._$ginzaLink.attr('href', link);
      this._$ginzaLink.attr('data-ginzawatch', link);

      // TODO: カンマつける
      var count = videoInfo.getCount();
      this._$viewCount    .text(count.view);
      this._$commentCount .text(count.comment);
      this._$mylistCount  .text(count.mylist);

      this._updateTags(videoInfo.getTagList());

      this._$view
        .removeClass('userVideo channelVideo initializing')
        .addClass(videoInfo.isChannel() ? 'channelVideo' : 'userVideo');
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
        var $tag = $('<li class="tag" />');
        $tag.append($dic);
        $tag.append($link);
        $tagList.append($tag);
      });
      $container.append($tagList);
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





    var initialize = function() {
      console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
      initialize = _.noop;
      ZenzaWatch.util.addStyle(__css__);

      if (!ZenzaWatch.util.isPremium() && !Config.getValue('forceEnable')) {
        return;
      }

      window.console.time('createOffscreenLayer');
      NicoComment.offScreenLayer.get().then(function(offScreenLayer) {
        window.console.timeEnd('createOffscreenLayer');
        // コメントの位置計算用のレイヤーが必要
        // スマートじゃないので改善したい

        var dialog;

        // watchページか？
        if (location.href.match('\/www.nicovideo.jp\/watch\/')) {
          if (ZenzaWatch.util.isLogin()) {
            dialog = initializeDialogPlayer(Config, offScreenLayer);
            if (!ZenzaWatch.util.hasFlashPlayer()) {
              initializeGinzaSlayer(dialog);
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
          Config.setSessionValue('autoCloseFullScreen', false);
          dialog.open(packet.watchId);
        });

        if (location.href.match('\/www.nicovideo.jp\/watch\/')) {
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
      });

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
      initializeHoverMenu(dialog);

      return dialog;
    };

    var initializeGinzaSlayer = function(dialog) {
      $('.notify_update_flash_player').remove();

      dialog.open(getWatchId());
    };


    var initializeHoverMenu = function(dialog) {
      var $menu = $([
      '<div class="zenzaWatchHoverMenu">',
        '<span>Zen</span>',
      '</div>'].join(''));

      var hoverElement = null;

      var onHover = function(e) {
        hoverElement = e.target;
      };

      var onMouseout = function(e) {
        if (e.target === hoverElement) {
          hoverElement = null;
        }
      };

      var onHoverEnd = function(e) {
        if (e.target !== hoverElement) { return; }
        var $target = $(e.target).closest('a');
        var href = $target.attr('data-href') || $target.attr('href');
        var watchId = ZenzaWatch.util.getWatchId(href);
        var offset = $target.offset();
//        var bottom = offset.top  + $target.outerHeight();
//        var right  = offset.left + $target.outerWidth();

        if ($target.hasClass('noHoverMenu')) { return; }
        if (!watchId.match(/^[a-z0-9]+$/)) { return; }
        if (href.indexOf('live.nicovideo.jp') >= 0) { return; }
        $('.zenzaWatching').removeClass('zenzaWatching');
        $target.addClass('.zenzaWatching');
        $menu
          .attr({
            'data-watch-id': watchId
          })
          .css({
            top:  offset.top, //  - $menu.outerHeight(),
            left: offset.left - $menu.outerWidth()  / 2
          })
          .addClass('show');
      };

      var onMenuClick = function(e) {
        var $target = $(e.target);
        var watchId = $target.closest('.zenzaWatchHoverMenu').attr('data-watch-id');
        console.log('open: ', watchId);

        if (e.shiftKey) {
          // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
          localStorageEmitter.send({
            type: 'openVideo',
            watchId: watchId
          });
        } else {

          Config.refreshValue('autoCloseFullScreen');
          dialog.open(watchId);

        }
      };

      $menu.on('click', onMenuClick);

      ZenzaWatch.emitter.on('hideHover', function() {
        $menu.removeClass('show');
      });

      $('body')
        .on('mouseover', 'a[href*="watch/"]', onHover)
        .on('mouseover', 'a[href*="watch/"]', _.debounce(onHoverEnd, 500))
        .on('mouseout',  'a[href*="watch/"]', onMouseout)
        .on('click', function() { $menu.removeClass('show'); })
        .append($menu);
    };

    var initializeDialog = function(conf, offScreenLayer) {
      console.log('initializeDialog');
      var dialog = new NicoVideoPlayerDialog({
        offScreenLayer: offScreenLayer,
        playerConfig: conf
      });

      return dialog;
    };


    if (window.name !== 'commentLayerFrame') {
      initialize();
    }


};


  var xmlHttpRequest = function(options) {
    try {
      var req = new XMLHttpRequest();
      var method = options.method || 'GET';
      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (typeof options.onload === "function") options.onload(req);
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

  var postMessage = function(type, message) {
//    var origin  = 'http://' + location.host.replace(/^.*?\./, 'www.');
    var origin = document.referrer;
    try {
      parent.postMessage(JSON.stringify({
          id: 'NicoCommentLayer',
          type: type, // '',
          body: {
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

   // クロスドメインでのvideoInfoLoader情報の通信用
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


  var host = window.location.host || '';
  if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    exApi();
  } else {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    var iframe = document.createElement('iframe');
    iframe.className = 'commentLayerFrameReserve';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    var script = document.createElement('script');
    script.id = 'ZenzaWatchLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.appendChild(document.createTextNode( '(' + monkey + ')();' ));
    document.body.appendChild(script);
  }
})();
