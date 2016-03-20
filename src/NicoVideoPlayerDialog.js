var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var FullScreen = {};
var VideoInfoLoader = {};
var PopupMessage = {};
var ShortcutKeyEmitter = {};
var PlaylistSession = {};
var NicoVideoPlayer = function() {};
var MessageApiLoader = function() {};
var AsyncEmitter = function() {};
var VideoControlBar = function() {};
var VideoInfoPanel = function() {};
var VideoInfoModel = function() {};
var CommentInputPanel = function() {};
var SettingPanel = function() {};
var Playlist = function() {};

//===BEGIN===
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
      //window.console.log('isPlaylistStartRequest', eventType, query);
      if (eventType === 'click' &&
          query.playlist_type === 'mylist_playlist' &&
          query.group_id) {
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
    getCurrentTime: function() {
      return _.isNumber(this._options.currentTime) ?
        parseFloat(this._options.currentTime, 10) : 0;
    },
    createOptionsForVideoChange: function(options) {
      options = options || {};
      delete this._options.economy;
      _.defaults(options, this._options);
      options.openNow = true;
      options.currentTime = 0;
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
      font-size: 13px;
      text-align: left;
      box-sizing: border-box;
      transition:
        width: 0.4s ease-in, height: 0.4s ease-in 0.4s,
        right 0.4s ease-in, bottom 0.4s ease-in;
    }

    .zenzaVideoPlayerDialog * {
      box-sizing: border-box;
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
    }

    .zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .fullScreen           .showVideoControlBar .videoPlayer {
      z-index: 100 !important;
    }
    .zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame,
    .fullScreen           .showVideoControlBar .commentLayerFrame {
      z-index: 101 !important;
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
      var onCommand = _.bind(this._onCommand, this);
      var config = this._playerConfig;

      var $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
      $container.on('click', _.bind(function(e) {
        ZenzaWatch.emitter.emitAsync('hideHover');
        if (config.getValue('enableTogglePlayOnClick') && !$container.hasClass('menuOpen')) {
          this.togglePlay();
        }
        e.preventDefault();
        e.stopPropagation();
        $container.removeClass('menuOpen');
      }, this));

      this.setIsBackComment(config.getValue('backComment'));
      $container.toggleClass('showComment', config.getValue('showComment'));
      $container.toggleClass('mute', config.getValue('mute'));
      $container.toggleClass('loop', config.getValue('loop'));
      $container.toggleClass('debug', config.getValue('debug'));

      // マウスを動かしてないのにmousemoveが飛んでくるのでねずみかます
      var lastX = 0, lastY = 0;
      var onMouseMove    = _.bind(this._onMouseMove, this);
      var onMouseMoveEnd = _.debounce(_.bind(this._onMouseMoveEnd, this), 1500);
      $container.on('mousemove', _.bind(function(e) {
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
        $playerContainer: $container,
        playerConfig: config
      });
      this._hoverMenu.on('command', onCommand);

      this._commentInput = new CommentInputPanel({
        $playerContainer: $container,
        playerConfig: config
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
        $playerContainer: $container,
        playerConfig: config,
        player: this
      });
      this._settingPanel.on('command', onCommand);

      this._videoControlBar = new VideoControlBar({
        $playerContainer: $container,
        playerConfig: config,
        player: this
      });
      this._videoControlBar.on('command', onCommand);

      this._$errorMessageContainer = $container.find('.errorMessageContainer');

      this._initializeResponsive();

      ZenzaWatch.emitter.on('showMenu', function() { $container.addClass('menuOpen'); });
      ZenzaWatch.emitter.on('hideMenu', function() { $container.removeClass('menuOpen'); });
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
          this._onDeflistAdd(param);
          break;
        case 'playlistAdd':
          this._onPlaylistAdd(param);
          break;
        case 'playlistInsert':
          this._onPlaylistInsert(param);
          break;
        case 'playlistSetMylist':
          this._onPlaylistSetMylist(param);
          break;
        case 'playNextVideo':
          this.playNextVideo();
          break;
        case 'playlistShuffle':
          if (this._playlist) {
            this._playlist.shuffle();
          }
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
        case 'openNow':
          this.open(param, {openNow: true});
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
          this._onDeflistAdd(param);
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
    _onPlaylistAdd: function(watchId) {
      window.console.log('playlistAdd: ', watchId);
      this._initializePlaylist();
      this._playlist.append(watchId);
    },
    _onPlaylistInsert: function(watchId) {
      this._initializePlaylist();
      this._playlist.insert(watchId);
    },
    _onPlaylistSetMylist: function(mylistId, option) {
      this._initializePlaylist();
      option = option || {watchId: this._watchId};
      // デフォルトで古い順にする
      option.sort = isNaN(option.sort) ? 7 : option.sort;
      this._playlist.loadFromMylist(mylistId, option).then((result) => {
        PopupMessage.notify(result.message);
        this._videoInfoPanel.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
      }, () => {
        PopupMessage.alert('マイリストのロード失敗');
      });
    },
    _onPlaylistStatusUpdate: function() {
      var playlist = this._playlist;
      this._playerConfig.setValue('playlistLoop', playlist.isLoop());
      this._$playerContainer.toggleClass('playlistEnable', playlist.isEnable());
      if (playlist.isEnable()) {
        this._playerConfig.setValue('loop', false);
      }
      this._videoInfoPanel.blinkTab('playlist');
    },
    _onDeflistAdd: function(watchId) {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingDeflist')) { return; } //busy

      var removeClass = function() {
        $container.removeClass('updatingDeflist');
      };

      $container.addClass('updatingDeflist');
      var timer = window.setTimeout(removeClass, 10000);

      var owner = this._videoInfo.getOwnerInfo();

      watchId = watchId || this._videoInfo.getWatchId();
      var description =
        (watchId === this._watchId && this._playerConfig.getValue('enableAutoMylistComment')) ? ('投稿者: ' + owner.name) : '';
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

      this._playerConfig.setValue('lastPlayerId', this.getId());
      this._requestId = 'play-' + Math.random();
      this._videoWatchOptions = options =new VideoWatchOptions(watchId, options, this._playerConfig);

      if (!options.isPlaylistStartRequest() &&
          this.isPlaying() && this.isPlaylistEnable() && !options.isOpenNow()) {
        this._onPlaylistInsert(watchId);
        return;
      }

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


      // watchIdからサムネイルを逆算できる時は最速でセットする
      var thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(watchId);
      if (thumbnail) {
        this._setThumbnail(thumbnail);
      }

      this._isCommentReady = false;
      this._watchId = watchId;
      this._lastCurrentTime = 0;
      this._lastOpenAt = Date.now();
      this._hasError = false;
      window.console.time('VideoInfoLoader');

      this._bindLoaderEvents();
      VideoInfoLoader.load(watchId, options.getVideoLoadOptions());

      this.show();
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
      options = this._videoWatchOptions.createOptionsForVideoChange(options);
      
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

      if (e.info && e.info.isPlayable === false && this.isPlaylistEnable()) {
        ZenzaWatch.util.callAsync(this.playNextVideo, this, 3000);
      }
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
      var currentTime = this._videoWatchOptions.getCurrentTime();
      if (currentTime > 0) {
        this._nicoVideoPlayer.setCurrentTime(currentTime);
      }
    },
    _onVideoCanPlay: function() {
      window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
      this._$playerContainer.removeClass('stalled loading');

      if (this._videoWatchOptions.isPlaylistStartRequest()) {
        this._initializePlaylist();

        var opt = this._videoWatchOptions.getMylistLoadOptions();
        this._playlist.loadFromMylist(opt.group_id, opt);
        this._playlist.toggleEnable(true);
      } else if (PlaylistSession.isExist() && !this._playlist) {
        this._initializePlaylist();
        this._playlist.restoreFromSession();
      } else {
        this._initializePlaylist();
      }
      this._playlist.insertCurrentVideo(this._videoInfo);

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
            (!this._videoWatchOptions.isEconomy() && !this._videoInfo.isEconomy())
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
      this.emitAsync('ended');
      if (this.isPlaylistEnable() && this._playlist.hasNext()) {
        this.playNextVideo();
        return;
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
    _initializePlaylist: function() {
      if (this._playlist) { return; }
      var $container = this._videoInfoPanel.appendTab('playlist', 'プレイリスト');
      this._playlist = new Playlist({
        loader: ZenzaWatch.api.ThumbInfoLoader,
        $container: $container,
        loop: this._playerConfig.getValue('playlistLoop')
      });
      this._playlist.on('command', _.bind(this._onCommand, this));
      this._playlist.on('update', _.debounce(_.bind(this._onPlaylistStatusUpdate, this), 100));
    },
    isPlaylistEnable: function() {
      return this._playlist && this._playlist.isEnable();
    },
    playNextVideo: function() {
      if (!this._playlist) { return; }
      var opt = this._videoWatchOptions.createOptionsForVideoChange();

      var nextId = this._playlist.selectNext();
      if (nextId) {
        this.open(nextId, opt);
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

      var options = this._videoWatchOptions.createOptionsForSession();
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
        var $target  = $(e.target).closest('.mylistIcon, .mylistLink');
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
        var $target  = $(e.target).closest('.sharedNgLevel, .setIsCommentFilterEnable');
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

      var $target = $(e.target).closest('.menuButton');
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
        ZenzaWatch.emitter.emitAsync('hideMenu');
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
        ZenzaWatch.emitter.emitAsync('showMenu');
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












//===END===
//

