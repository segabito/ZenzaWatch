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
var broadcastEmitter = {};
var PopupMessage = {};
var VideoInfoLoader = {};
var WatchPageState = {};
var WindowMessageEmitter = {};
var NicoVideoApi = {};
var PlaylistSession = {};

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

            var $a = $('a[href*="playlist_type=mylist_playlist"]:first');
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
            'href': '/watch/1470321133' + a.search + '&shuffle=1'
          }).text('シャッフル再生');
          $autoPlay.after($shuffle);
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
            var $a = $('<a class="more zen" target="_blank">watch</a>')
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
      ZenzaWatch.util.addStyle(__css__);


      var isGinza = ZenzaWatch.util.isGinzaWatchUrl() && !!(document.getElementById('watchAPIDataContainer'));
      if (!ZenzaWatch.util.isLogin()) {
        return;
      }

      //if (!ZenzaWatch.util.isPremium() && !Config.getValue('forceEnable')) {
      //  return;
      //}

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

      ZenzaWatch.external = {
        execCommand: command,
        sendCommand: sendCommand,
        sendOrExecCommand: sendOrExecCommand,
        open: open,
        send: send,
        sendOrOpen,
        deflistAdd,
        playlist: {
          add: playlistAdd,
          insert: playlistInsert,
          import: importPlaylist,
          export: exportPlaylist
        }
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
        ZenzaWatch.emitter.on('hideHover', () => {
          $view.removeClass('show');
        });

        var $body = $('body')
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"]', _.bind(this._onHover, this))
          .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"]', _.debounce(_.bind(this._onHoverEnd, this), 500))
          .on('mouseout',  'a[href*="watch/"],a[href*="nico.ms/"]', _.bind(this._onMouseout, this))
          .on('click', function() { $view.removeClass('show'); });

        if (!ZenzaWatch.util.isGinzaWatchUrl() &&
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

