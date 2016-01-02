var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var FullScreen = {};
var VideoInfoLoader = {};
var PopupMessage = {};
var AsyncEmitter = function() {};

//===BEGIN===


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

      this._commentInput = new CommentInputPanel({
        $playerContainer: this._$playerContainer,
        playerConfig: this._playerConfig
      });
      this._commentInput.on('post', $.proxy(function(e, chat, cmd) {
        this.addChat(chat, cmd).then(function() {
          e.resolve();
        }, function() {
          e.reject();
        });
      }, this));

      var isPlaying = false;
      this._commentInput.on('focus', $.proxy(function(isAutoPause) {
        isPlaying = this._nicoVideoPlayer.isPlaying();
        if (isAutoPause) {
          this._nicoVideoPlayer.pause();
        }
      }, this));
      this._commentInput.on('blur', $.proxy(function(isAutoPause) {
        if (isAutoPause && isPlaying) {
          this._nicoVideoPlayer.play();
        }
      }, this));


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
        case 'INPUT_COMMENT':
          // 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
          ZenzaWatch.util.callAsync(function() { this._commentInput.focus(); }, this);
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

      this._isCommentReady = false;
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
      this._threadInfo = result.threadInfo;
      this._isCommentReady = true;
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
      var $container = this._$playerContainer;
      if (!this._nicoVideoPlayer ||
          !this._messageApiLoader ||
          $container.hasClass('postChat') ||
          this._isCommentReady !== true) {
        return Promise.reject();
      }

      options = options || {};
      options.mine = '1';
      options.updating = '1';
      vpos = vpos || this._nicoVideoPlayer.getVpos();
      var nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);

      $container.addClass('postChat');

      var _onSuccess = function() {
        nicoChat.setIsUpdating(false);
        PopupMessage.notify('コメント投稿成功');
        $container.removeClass('postChat');
        window.clearTimeout(timeout);
      };
      var _onFail = function() {
        nicoChat.setIsUpdating(false);
        PopupMessage.alert('コメント投稿失敗(1)');
        $container.removeClass('postChat');
        window.clearTimeout(timeout);
      };

      var _onTimeout = function() {
        PopupMessage.alert('コメント投稿失敗(2)');
        $container.removeClass('postChat');
      };

      var timeout = window.setTimeout(_onTimeout, 30000);

      return this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos).then(
        _onSuccess,
        _onFail
      );
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
      word-break: normal;
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
    .screenModeSelectMenu ul {
      padding: 0;
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
      padding: 0;
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
    .mylistSelectMenu .mylistSelectMenuInner {
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 70vh;
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
      <div class="mylistSelectMenuInner">
      </div>
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
        <li class="screenMode small"    data-command="screenMode" data-screen-mode="small"><span>小</span></li>
        <li class="screenMode sideView" data-command="screenMode" data-screen-mode="sideView"><span>横</span></li>
        <li class="screenMode normal"   data-command="screenMode" data-screen-mode="normal"><span>中</span></li>
        <li class="screenMode wide"     data-command="screenMode" data-screen-mode="wide"><span>WIDE</span></li>
        <li class="screenMode big"      data-command="screenMode" data-screen-mode="big"><span>大</span></li>
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

      this._$mylistSelectMenu.on('mousewheel', function(e) {
        e.stopPropagation();
      });

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

      $menu.find('.mylistSelectMenuInner').append($ul);
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

  var CommentInputPanel = function() { this.initialize.apply(this, arguments); };
  CommentInputPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .commentInputPanel {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh - 60px - 40px);
      left: calc(-50vw + 50% + 50vw - 100px);
      box-sizing: border-box;

      width: 200px;
      height: 50px;
      z-index: 160000;
      overflow: visible;
    }
    .commentInputPanel.active {
      left: calc(-50vw + 50% + 50vw - 250px);
      width: 500px;
    }
    .zenzaScreenMode_wide .commentInputPanel,
    .fullScreen           .commentInputPanel {
      position: fixed !important;
      top:  auto !important;
      bottom: 40px !important;
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
        top: calc(-50vh + 50% + 100vh - 60px - 40px - 60px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .commentInputPanel {
        top: calc(-50vh + 50% + 100vh - 60px - 40px - 60px);
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

    .commentInputPanel:hover .autoPauseLabel,
    .commentInputPanel.active .autoPauseLabel {
      position: absolute;
      top: 36px;
      display: block;
      text-shadow: 0 0 8px #ccc;
      background: #336;
      z-index: 100;
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
      </div>
      </form>
      <label class="autoPauseLabel">
        <input type="checkbox" class="autoPause" checked="checked">
        入力時に一時停止
      </label>
    </div>
  */});

  _.assign(CommentInputPanel.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);
      this.emitPromise = $.proxy(emitter.emitPromise, emitter);

      this._initializeDom();

      this._playerConfig.on('update-autoPauseCommentInput',
        $.proxy(this._onAutoPauseCommentInputChange, this));
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
      var preventEsc = function(e) {
        if (e.keyCode === 27) { // ESC
          e.preventDefault();
          e.stopPropagation();
          $input.blur();
        }
      };

      $input
        .on('focus', $.proxy(this._onFocus, this))
        .on('blur', _.debounce($.proxy(this._onBlur, this), 500))
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
      this._$form.on('submit', $.proxy(this._onSubmit, this));
      this._$commentSubmit.on('click', $.proxy(this._onSubmitButtonClick, this));
    },
    _onFocus: function() {
      this._$view.addClass('active');
      this.emit('focus', this.isAutoPause());
    },
    _onBlur: function() {
      if (this._$commandInput.is(':focus') ||
          this._$commentInput.is(':focus')) {
        return;
      }
      this._$view.removeClass('active');
      this.emit('blur', this.isAutoPause());
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
      this._$commentInput.val('').blur();
      this._$commandInput.blur();

      var $view = this._$view.addClass('updating');
      this.emitPromise('post', chat, cmd).then(function() {
        $view.removeClass('updating');
      }, function() {
        // TODO: 失敗時はなんかフィードバックさせる？
        $view.removeClass('updating');
      });
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



