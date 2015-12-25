var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var FullScreen = {};

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
      overflow: hidden;
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
      width: 100vw;
      height: calc(100vh - 100px);
      box-shadow: none;
    }


    .zenzaScreenMode_wide .zenzaPlayerContainer {
      left: 0;
      width: 100vw;
      height: calc(100vh - 100px);
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

    {* 1280x720 *}
    @media screen and
      (min-width: 1664px) and (min-height: 900px)
    {
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1280px * 1.05);
        height: 720px;
      }
      body:not(.fullScreen).zenzaScreenMode_big .zenzaPlayerContainer .videoPlayer {
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

    .menuItemContainer.leftBottom {
      width: 72px;
      height: 112px;
      left: 8px;
      bottom: 64px;
    }

    .zenzaScreenMode_sideView .menuItemContainer.leftBottom {
      position: absolute;
    }

    .menuItemContainer.rightBottom {
      width: 32px;
      height: 32px;
      right:  0;
      bottom: 0px;
    }

    .zenzaScreenMode_sideView .menuItemContainer.rightBottom {
      position: absolute;
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
      left: 0;
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

  */});

  VideoHoverMenu.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
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

    </div>
  */});

  _.assign(VideoHoverMenu.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._initializeDom();
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(VideoHoverMenu.__css__);
      this._$playerContainer.append(VideoHoverMenu.__tpl__);

      var $container = this._$playerContainer;
      $container.find('.menuButton')
        .on('click', $.proxy(this._onMenuButtonClick, this));

      this._playerConfig.on('update', $.proxy(this._onPlayerConfigUpdate, this));
      this._initializeVolumeCotrol();
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
      top: -50px;
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



