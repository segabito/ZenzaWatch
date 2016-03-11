var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var __css__ = '';
var PlayerSession = {};
var Config = {};
var NicoComment = {};
var localStorageEmitter = {};
var PopupMessage = {};
var VideoInfoLoader = {};
var WatchPageState = {};
var WindowMessageEmitter = {};
var NicoVideoApi = {};

var MessageApiLoader = function() {};
var NicoVideoPlayer = function() {};
var NicoVideoPlayerDialog = function() {};
var AsyncEmitter = function() {};

//===BEGIN===
    // GINZAを置き換えるべきか？の判定
    var isOverrideGinza = function() {
      // GINZAで視聴のリンクできた場合はfalse
      if (window.name === 'watchGinza') {
        return false;
      }
      // FlashPlayerが入ってない場合はtrue
      if (!ZenzaWatch.util.hasFlashPlayer()) {
        return true;
      }
      // GINZAの代わりに起動する設定、かつZenzaで再生可能な動画はtrue
      // nmmやrtmpeの動画だとfalseになる
      if (Config.getValue('overrideGinza') && ZenzaWatch.util.isZenzaPlayableVideo()) {
        return true;
      }
      // ギンザスレイヤー＝サン 放置してる
      //if (Config.getValue('enableGinzaSlayer')) {
      //  return true;
      //}
      return false;
    };

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
            if (isOverrideGinza()) {
              initializeGinzaSlayer(dialog, Config);
            }
            if (window.name === 'watchGinza') { window.name = ''; }

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
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"]', _.bind(this._onHover, this))
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"]', _.debounce(_.bind(this._onHoverEnd, this), 500))
          .on('mouseout',  'a[href*="watch/"],a[href*="nico.ms/"]', _.bind(this._onMouseout, this))
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
        var host = $target[0].hostname;
        if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') { return; }
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
          var host = $target[0].hostname;
          if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') { return; }

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
        }, function() {
          window.console.log('ZenzaWatch Bridge disabled');
        });
      }
    }

