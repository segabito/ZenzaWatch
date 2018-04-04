// import * as $ from 'jquery';
// import * as _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {
  broadcastEmitter,
  Config,
  PlayerSession,
  PlaylistSession,
  util,
  WatchPageHistory,
  WindowMessageEmitter
} from './util';
import {NicoComment} from './CommentPlayer';
import {NicoVideoPlayerDialog} from './NicoVideoPlayerDialog';
import {initializeGinzaSlayer} from './GinzaSlayer';
import {CONSTANT} from './constant';
import {CustomElements} from './parts/CustomElements';

const START_PAGE_QUERY = 'hoge=fuga';

//===BEGIN===
const {initialize} = (() => {
  // GINZAを置き換えるべきか？の判定
  let isOverrideGinza = function () {
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

  let replaceRedirectLinks = function () {
    $('a[href*="www.flog.jp/j.php/http://"]').each(function (i, a) {
      let $a = $(a), href = $a.attr('href');
      let replaced = href.replace(/^.*https?:/, '');
      $a.attr('href', replaced);
    });

    $('a[href*="rd.nicovideo.jp/cc/"]').each(function (i, a) {
      let $a = $(a), href = $a.attr('href');
      if (href.match(/cc_video_id=([a-z0-9+]+)/)) {
        let watchId = RegExp.$1;
        if (watchId.indexOf('lv') === 0) {
          return;
        }
        let replaced = '//www.nicovideo.jp/watch/' + watchId;
        $a.attr('href', replaced);
      }
    });


    // マイリストページの連続再生ボタン横に「シャッフル再生」を追加する
    if (window.Nico && window.Nico.onReady) {
      window.Nico.onReady(function () {
        let addShufflePlaylistLink = _.throttle(_.debounce(function () {
          if ($('.zenzaPlaylistShuffleStart').length > 0) {
            return;
          }
          let $a = $('a[href*="playlist_type=mylist"]:first,a[href*="playlist_type=deflist"]:first');
          if ($a.length < 1) {
            return false;
          }
          let a = $a[0];
          let search = (a.search || '').substr(1);
          let css = {
            'display': 'inline-block',
            'padding': '8px 6px'
          };
          let $shuffle = $(a).clone().text('シャッフル再生');
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
      (function () {
        let $autoPlay = $('.autoPlay');
        let $target = $autoPlay.find('a');
        let search = (location.search || '').substr(1);
        let href = $target.attr('href') + '&' + search;
        $target.attr('href', href);
        let $shuffle = $autoPlay.clone();
        let a = $target[0];
        $shuffle.find('a').attr({
          'href': '/watch/1483135673' + a.search + '&shuffle=1'
        }).text('シャッフル再生');
        $autoPlay.after($shuffle);

        // ニコニ広告枠のリンクを置き換える
        window.setTimeout(() => {
          Array.from(document.querySelectorAll('.nicoadVideoItem')).forEach(item => {
            const pointLink = item.querySelector('.count .value a');
            if (!pointLink) {
              return;
            }

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
      $('#sec_current a.item').closest('li').each(function (i, li) {
        let $li = $(li), $img = $li.find('img');
        let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
        let $a = $li.find('a');
        if (thumbnail.match(/smile\?i=([0-9]+)/)) {
          let watchId = 'so' + RegExp.$1;
          $a.attr('href', '//www.nicovideo.jp/watch/' + watchId);
        }
      });
      $('.playerNavContainer .video img').each(function (i, img) {
        let $img = $(img);
        let $video = $img.closest('.video');
        if ($video.length < 1) {
          return;
        }
        let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
        if (thumbnail.match(/smile\?i=([0-9]+)/)) {
          let watchId = 'so' + RegExp.$1;
          let $a = $('<a class="more zen" rel="noopener" target="_blank">watch</a>')
            .css('right', '128px')
            .attr('href', '//www.nicovideo.jp/watch/' + watchId);

          $video.find('.more').after($a);
        }
      });
    }


    if (location.host === 'search.nicovideo.jp') {
      const removeClick = function () {
        $('a.click').removeClass('click');
      };
      removeClick();
      $('#row-results').on('DOMNodeInserted.zenzawatch', removeClick);
    }
  };

  let initialize = function () {
    window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
    initialize = _.noop;


    const query = util.parseQuery(START_PAGE_QUERY);

    let isGinza = util.isGinzaWatchUrl() &&
      (!!document.getElementById('watchAPIDataContainer') ||
        !!document.getElementById('js-initial-watch-data'));

    replaceRedirectLinks();

    let hoverMenu = new HoverMenu({playerConfig: Config});
    ZenzaWatch.debug.hoverMenu = hoverMenu;

    window.console.time('createOffscreenLayer');
    NicoComment.offScreenLayer.get(Config).then(function (offScreenLayer) {
      window.console.timeEnd('createOffscreenLayer');
      // コメントの位置計算用のレイヤーが必要
      // スマートじゃないので改善したい

      let dialog;

      // watchページか？
      if (isGinza) {
        dialog = initializeDialogPlayer(Config, offScreenLayer);
        if (isOverrideGinza()) {
          initializeGinzaSlayer(dialog, query);
        }
        if (window.name === 'watchGinza') {
          window.name = '';
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

        if (type !== 'openVideo') {
          return;
        }
        if (!isLast) {
          return;
        }

        console.log('recieve packet: ', packet);
        dialog.open(packet.watchId, {
          autoCloseFullScreen: false,
          query: packet.query,
          eventType: packet.eventType
        });
      });

      dialog.on('close', () => {
        broadcastEmitter.notifyClose();
      });

      WatchPageHistory.initialize(dialog);

      if (dialog) {
        hoverMenu.setPlayer(dialog);
      }
      initializeExternal(dialog, Config, hoverMenu);

      if (isGinza) {
        return;
      }

      window.addEventListener('beforeunload', () => {
        if (!dialog.isOpen()) {
          return;
        }
        PlayerSession.save(dialog.getPlayingStatus());
        dialog.close();
      });

      let lastSession = PlayerSession.restore();
      let screenMode = Config.getValue('screenMode');
      if (
        lastSession.playing &&
        (screenMode === 'small' ||
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

      WindowMessageEmitter.on('onMessage', (data/*, type*/) => {
        let watchId = data.message.watchId;
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
    CustomElements.initialize();
    ZenzaWatch.emitter.emitAsync('ready');
    util.dispatchCustomEvent(
      document.body, 'ZenzaWatchInitialize', window.ZenzaWatch);
    // こっちは過去の互換用
    $('body').trigger('ZenzaWatchReady', window.ZenzaWatch);
  };


  let initializeDialogPlayer = function (conf, offScreenLayer) {
    return initializeDialog(conf, offScreenLayer);
  };


  let initializeExternal = function (dialog/*, config*/) {
    const command = (command, param) => {
      dialog.execCommand(command, param);
    };

    const open = (watchId, params) => {
      dialog.open(watchId, params);
    };

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

  const HoverMenu = function () {
    this.initialize.apply(this, arguments);
  };
  _.assign(HoverMenu.prototype, {
    initialize: function (param) {
      this._playerConfig = param.playerConfig;

      let $view = $([
        '<div class="zenzaWatchHoverMenu scalingUI">',
        '<span>Zen</span>',
        '</div>'].join(''));
      this._$view = $view;

      $view.on('click', this._onClick.bind(this));
      ZenzaWatch.emitter.on('hideHover', () => {
        $view.removeClass('show');
      });

      let $body = $('body')
        .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
          this._onHover.bind(this))
        .on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
          _.debounce(this._onHoverEnd.bind(this), 500))
        .on('mouseout', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
          this._onMouseout.bind(this))
        .on('click', () => {
          $view.removeClass('show');
        });

      if (!util.isGinzaWatchUrl() &&
        this._playerConfig.getValue('overrideWatchLink')) {
        this._overrideGinzaLink();
      } else {
        $body.append($view);
      }
    },
    setPlayer: function (player) {
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
    _getPlayer: function () {
      return new Promise((resolve) => {
        if (this._player) {
          return resolve(this._player);
        }
        this._playerResolve = resolve;
      });
    },
    _onHover: function (e) {
      this._hoverElement = e.target;
    },
    _onMouseout: function (e) {
      if (this._hoverElement === e.target) {
        this._hoverElement = null;
      }
    },
    _onHoverEnd: function (e) {
      if (this._hoverElement !== e.target) {
        return;
      }
      let $target = $(e.target).closest('a');
      let href = $target.attr('data-href') || $target.attr('href');
      let watchId = util.getWatchId(href);
      let offset = $target.offset();
      let host = $target[0].hostname;
      if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') {
        return;
      }
      this._query = util.parseQuery(($target[0].search || '').substr(1));


      if ($target.hasClass('noHoverMenu')) {
        return;
      }
      if (!watchId.match(/^[a-z0-9]+$/)) {
        return;
      }
      if (watchId.indexOf('lv') === 0) {
        return;
      }

      $('.zenzaWatching').removeClass('zenzaWatching');
      $target.addClass('.zenzaWatching');

      this._watchId = watchId;

      this._$view.css({
        top: offset.top,
        left: offset.left - this._$view.outerWidth() / 2
      }).addClass('show');
    },
    _onClick: function (e) {
      const watchId = this._watchId;
      if (e.ctrlKey) {
        return;
      }

      if (e.shiftKey) {
        // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
        this._send(watchId);
      } else {
        this._open(watchId);
      }
    },
    open: function (watchId, params) {
      this._open(watchId, params);
    },
    _open: function (watchId, params) {
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
    send: function (watchId, params) {
      this._send(watchId, params);
    },
    _send: function (watchId, params) {
      this._getPlayer().then(() => {
        ZenzaWatch.external.send(
          watchId,
          Object.assign({query: this._query}, params)
        );
      });
    },
    _overrideGinzaLink: function () {
      $('body').on('click', 'a[href*="watch/"]', (e) => {
        if (e.ctrlKey) {
          return;
        }
        if (e.target !== this._hoverElement) {
          return;
        }

        let $target = $(e.target).closest('a');
        let href = $target.attr('data-href') || $target.attr('href');
        let watchId = util.getWatchId(href);
        let host = $target[0].hostname;
        if (host !== 'www.nicovideo.jp' && host !== 'nico.ms') {
          return;
        }
        this._query = util.parseQuery(($target[0].search || '').substr(1));

        if ($target.hasClass('noHoverMenu')) {
          return;
        }
        if (!watchId.match(/^[a-z0-9]+$/)) {
          return;
        }
        if (watchId.indexOf('lv') === 0) {
          return;
        }

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

  let initializeDialog = function (conf, offScreenLayer) {
    console.log('initializeDialog');
    return new NicoVideoPlayerDialog({
      offScreenLayer: offScreenLayer,
      playerConfig: conf
    });
  };

  return {initialize};
})();


//===END===

export {
  initialize
};