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
var VideoSession = function() {};
var CommentPanel = function() {};

//===BEGIN===

  var PlayerConfig = function() { this.initialize.apply(this, arguments); };
  _.assign(PlayerConfig.prototype, {
    initialize: function(params) {
      var config = this._config = params.config;
      this._mode = params.mode || '';
      if (!this._mode && ZenzaWatch.util.isGinzaWatchUrl()) {
        this._mode = 'ginza';
      }

      if (!this._mode) {
        _.each([
          'refreshValue',
          'getValue',
          'setValue',
          'setValueSilently',
          'setSessionValue',
          'on',
          'off'
        ], _.bind(function(func) {
          this[func] = _.bind(config[func], config);
        }, this));
      }
    },
    // 環境ごとに独立させたい要求が出てきたのでラップする
    _getNativeKey: function(key) {
      if (!this._mode) { return key; }
      switch (this._mode) {
        case 'ginza':
          if (_.contains(['autoPlay', 'screenMode'], key)) {
            return key + ':' + this._mode;
          }
          return key;
        default:
          return key;
      }
    },
    refreshValue: function(key) {
      key = this._getNativeKey(key);
      return this._config.refreshValue(key);
    },
    getValue: function(key, refresh) {
      key = this._getNativeKey(key);
      return this._config.getValue(key, refresh);
    },
    setValue: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setValue(key, value);
    },
    setValueSilently: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setValueSilently(key, value);
    },
    setSessionValue: function(key, value) {
      key = this._getNativeKey(key);
      return this._config.setSessionValue(key, value);
    },
    _wrapFunc: function(func) {
      return function(key, value) {
        key = key.replace(/:.*?$/, '');
        func(key, value);
      };
    },
    on: function(key, func) {
      if (key.match(/^update-(.*)$/)) {
        key = RegExp.$1;
        var nativeKey = this._getNativeKey(key);
        //if (key !== nativeKey) { window.console.log('config.on %s -> %s', key, nativeKey); }
        this._config.on('update-' + nativeKey, func);
      } else {
        this._config.on(key, this._wrapFunc(func));
      }
    },
    off: function(/*key, func*/) {
      throw new Error('not supported!');
    }
  });

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
      if (eventType === 'click' &&
          _.contains(['mylist_playlist', 'tag', 'search'], query.playlist_type) &&
          (query.group_id || query.order)) {
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
    createOptionsForReload: function(options) {
      options = options || {};
      delete this._options.economy;
      _.defaults(options, this._options);
      options.openNow = true;
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

  var NicoVideoPlayerDialogView = function() { this.initialize.apply(this, arguments); };
  NicoVideoPlayerDialogView.__css__ = ZenzaWatch.util.hereDoc(function() {/*

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
      display: none !important;
      pointer-events: none;
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
      {*transition:
        width: 0.4s ease-in, height: 0.4s ease-in 0.4s,
        right 0.4s ease-in, bottom 0.4s ease-in;*}
    }

    .zenzaScreenMode_big     .zenzaVideoPlayerDialog,
    .zenzaScreenMode_normal  .zenzaVideoPlayerDialog,
    .zenzaScreenMode_wide    .zenzaVideoPlayerDialog,
    .zenzaScreenMode_3D      .zenzaVideoPlayerDialog,
    .fullScreen              .zenzaVideoPlayerDialog
      {*transform: translatez(0);*}
    }

    .regularUser  .forPremium {
      display: none;
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
      {*transform: translateZ(0);*}
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
              {*transform: translateZ(0);*}
      background: #000;
      will-change: transform, opacity;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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
      transform: translateZ(0) perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
      opacity: 0.9;
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
      {*transform: translateZ(0);*}
      cursor: none;
      will-change: transform, opacity;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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

    .zenzaStoryBoardOpen.fullScreen           .showVideoControlBar .videoPlayer,
    .zenzaStoryBoardOpen.fullScreen           .showVideoControlBar .commentLayerFrame {
      padding-bottom: 50px;
    }

    .zenzaStoryBoardOpen.zenzaScreenMode_wide .showVideoControlBar .videoPlayer,
    .zenzaStoryBoardOpen.zenzaScreenMode_wide .showVideoControlBar .commentLayerFrame{
      padding-bottom: 80px;
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

    .popupMessageContainer {
      top: 50px;
      left: 50px;
      z-index: 25000;
      position: absolute;
      pointer-events: none;
      transform: translateZ(0);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
  */});

  NicoVideoPlayerDialogView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
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

  _.extend(NicoVideoPlayerDialogView.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayerDialogView.prototype, {
    initialize: function(params) {
      var dialog = this._dialog       = params.dialog;
      this._playerConfig = params.playerConfig;
      this._nicoVideoPlayer = params.nicoVideoPlayer;

      this._aspectRatio = 9 / 16;

      dialog.on('canPlay',           this._onVideoCanPlay.bind(this));
      dialog.on('error',             this._onVideoError.bind(this));
      dialog.on('play',              this._onVideoPlay.bind(this));
      dialog.on('playing',           this._onVideoPlaying.bind(this));
      dialog.on('pause',             this._onVideoPause.bind(this));
      dialog.on('stalled',           this._onVideoStalled.bind(this));
      dialog.on('abort',             this._onVideoAbort.bind(this));
      dialog.on('aspectRatioFix',    this._onVideoAspectRatioFix.bind(this));
      dialog.on('volumeChange',      this._onVolumeChange.bind(this));
      dialog.on('volumeChangeEnd',   this._onVolumeChangeEnd.bind(this));
      dialog.on('beginUpdate',       this._onBeginUpdate.bind(this));
      dialog.on('endUpdate',         this._onEndUpdate.bind(this));
      dialog.on('screenModeChange',  this._onScreenModeChange.bind(this));

      this._initializeDom();
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(NicoVideoPlayerDialogView.__css__);
      var $dialog = this._$dialog = $(NicoVideoPlayerDialogView.__tpl__);
      var onCommand = function(command, param) {
        this.emit('command', command, param);
      }.bind(this);
      var config = this._playerConfig;
      var dialog = this._dialog;

      var $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
      $container.on('click', function(e) {
        ZenzaWatch.emitter.emitAsync('hideHover');
        if (config.getValue('enableTogglePlayOnClick') && !$container.hasClass('menuOpen')) {
          onCommand('togglePlay');
        }
        e.preventDefault();
        e.stopPropagation();
        $container.removeClass('menuOpen');
      }.bind(this));

      this.setIsBackComment(config.getValue('backComment'));
      $container
        .toggleClass('showComment', config.getValue('showComment'))
        .toggleClass('mute', config.getValue('mute'))
        .toggleClass('loop', config.getValue('loop'))
        .toggleClass('regularUser', !ZenzaWatch.util.isPremium())
        .toggleClass('debug', config.getValue('debug'));

      // マウスを動かしてないのにmousemoveが飛んでくるのでねずみかます
      var lastX = 0, lastY = 0;
      var onMouseMove    = this._onMouseMove.bind(this);
      var onMouseMoveEnd = _.debounce(this._onMouseMoveEnd.bind(this), 1500);
      $container.on('mousemove', function(e) {
          if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
            return;
          }
          lastX = e.screenX;
          lastY = e.screenY;
          onMouseMove(e);
          onMouseMoveEnd(e);
        }.bind(this));
//        .on('mousedown', onMouseMove)
//        .on('mousedown', onMouseMoveEnd);

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

      this._commentInput.on('post', function(e, chat, cmd) {
        this.emit('postChat', e, chat, cmd);
      }.bind(this));

      var isPlaying = false;
      this._commentInput.on('focus', function(isAutoPause) {
        isPlaying = this._nicoVideoPlayer.isPlaying();
        if (isAutoPause) {
          this.emit('command', 'pause');
        }
      }.bind(this));
      this._commentInput.on('blur', function(isAutoPause) {
        if (isAutoPause && isPlaying && dialog.isOpen()) {
          this.emit('command', 'play');
        }
      }.bind(this));
      this._commentInput.on('esc', function() {
        this._escBlockExpiredAt = Date.now() + 1000 * 2;
      }.bind(this));

      this._settingPanel = new SettingPanel({
        $playerContainer: $container,
        playerConfig: config,
        player: this._dialog
      });
      this._settingPanel.on('command', onCommand);

      this._videoControlBar = new VideoControlBar({
        $playerContainer: $container,
        playerConfig: config,
        player: this._dialog
      });
      this._videoControlBar.on('command', onCommand);

      this._$errorMessageContainer = $container.find('.errorMessageContainer');

      this._initializeResponsive();

      ZenzaWatch.emitter.on('showMenu', function() { $container.addClass('menuOpen'); });
      ZenzaWatch.emitter.on('hideMenu', function() { $container.removeClass('menuOpen'); });
      $('body').append($dialog);
    },
    _initializeResponsive: function() {
      $(window).on('resize', _.debounce(_.bind(this._updateResponsive, this),  500));
    },
    _updateResponsive: function() {
      var $w = $(window);
      var $container = this._$playerContainer;
      var $bar    = $container.find('.videoControlBar');
      var $header = $container.find('.zenzaWatchVideoHeaderPanel');

      // 画面の縦幅にシークバー分の余裕がある時は常時表示
      var update = function() {
        var w = $w.innerWidth(), h = $w.innerHeight();
        var videoControlBarHeight = $bar.outerHeight();
        var vMargin = h - w * this._aspectRatio;
        //var hMargin = w - h / self._aspectRatio;

        $container
          .toggleClass('showVideoControlBar',
            vMargin >= videoControlBarHeight)
          .toggleClass('showVideoHeaderPanel',
            vMargin >= videoControlBarHeight + $header.outerHeight() * 2);
      }.bind(this);

      update();
    },
    _onMouseMove: function() {
      this._$playerContainer.addClass('mouseMoving');
    },
    _onMouseMoveEnd: function() {
      this._$playerContainer.removeClass('mouseMoving');
    },
    _onVideoCanPlay: function() {
      this._$playerContainer.removeClass('stalled loading');
    },
    _onVideoError: function() {
      this._$playerContainer
        .addClass('error')
        .removeClass('playing loading');
    },
    _onVideoPlay: function() {
      this._$playerContainer
        .addClass('playing')
        .removeClass('stalled loading error abort');
    },
    _onVideoPlaying: function() {
      this._$playerContainer
        .addClass('playing')
        .removeClass('stalled loading error abort');
    },
    _onVideoPause: function() {
      this._$playerContainer.removeClass('playing');
    },
    _onVideoStalled: function() {
      // stallは詰まっているだけでありplayingなので、removeClassしない
      this._$playerContainer.addClass('stalled');
    },
    _onVideoAbort: function() {
      this._$playerContainer
        .addClass('abort')
        .removeClass('playing loading');
    },
    _onVideoAspectRatioFix: function(ratio) {
      this._aspectRatio = ratio;
      this._updateResponsive();
    },
    _onVolumeChange: function(/*vol, mute*/) {
      this._$playerContainer.addClass('volumeChanging');
    },
    _onVolumeChangeEnd: function(/*vol, mute*/) {
      this._$playerContainer.removeClass('volumeChanging');
    },
    _onScreenModeChange: function(mode) {
      this.clearClass();
      var $container = this._$playerContainer.addClass('changeScreenMode');
      $('body, html').addClass('zenzaScreenMode_' + mode);
      window.setTimeout(function() {
        $container.removeClass('changeScreenMode');
      }, 1000);
    },
    _onBeginUpdate: function(type) {
      this._$playerContainer.addClass('is-updating-' + type);
    },
    _onEndUpdate: function(type) {
      this._$playerContainer.removeClass('is-updating-' + type);
    },
    show: function() {
      this._$dialog.addClass('show');
      if (!FullScreen.now()) {
        $('body').removeClass('fullScreen');
      }
      $('body, html').addClass('showNicoVideoPlayerDialog');
    },
    hide: function() {
      this._$dialog.removeClass('show');
      this._settingPanel.hide();
      $('body, html').removeClass('showNicoVideoPlayerDialog');
      this.clearClass();
    },
    clearClass: function() {
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
    resetVideoLoadingStatus: function() {
      this._$playerContainer
        .addClass('loading')
        .removeClass('playing stalled error abort');
    },
    _onClick: function() {
    },
    setNicoVideoPlayer: function(nicoVideoPlayer) {
      this._nicoVideoPlayer = nicoVideoPlayer;
    },
    setIsBackComment: function(v) {
      this._$playerContainer.toggleClass('backComment', !!v);
    },
    setThumbnail: function(thumbnail) {
      if (thumbnail) {
        this._$playerContainer.css('background-image', 'url(' + thumbnail + ')');
        //this._nicoVideoPlayer.setThumbnail(thumbnail);
      } else {
        this._$playerContainer.css('background-image', '');
      }
    },
    focusToCommentInput: function() {
      // 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
      ZenzaWatch.util.callAsync(function() { this._commentInput.focus(); }, this);
    },
    toggleSettingPanel: function() {
      this._settingPanel.toggle();
    },
    setErrorMessage: function(msg) {
      this._$errorMessageContainer.text(msg);
    },
    get$Container: function() {
      return this._$playerContainer;
    },
    addClass: function(name) {
      return this._$playerContainer.addClass(name);
    },
    removeClass: function(name) {
      return this._$playerContainer.removeClass(name);
    },
    toggleClass: function(name, v) {
      if (_.isBoolean(v)) {
        return this._$playerContainer.toggleClass(name, v);
      } else {
        return this._$playerContainer.toggleClass(name);
      }
    },
    hasClass: function(name) {
      return this._$playerContainer.hasClass(name);
    }
  });


  var NicoVideoPlayerDialog = function() { this.initialize.apply(this, arguments); };


  _.extend(NicoVideoPlayerDialog.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayerDialog.prototype, {
    initialize: function(params) {
      this._offScreenLayer = params.offScreenLayer;
      this._playerConfig = new PlayerConfig({config: params.playerConfig});

      this._keyEmitter = params.keyHandler || ShortcutKeyEmitter;

      this._playerConfig.on('update-screenMode', _.bind(this._updateScreenMode, this));
      this._initializeDom();

      this._keyEmitter.on('keyDown', this._onKeyDown.bind(this));
      this._keyEmitter.on('keyUp',   this._onKeyUp  .bind(this));

      this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));

      this._escBlockExpiredAt = -1;

      this._dynamicCss = new DynamicCss({playerConfig: this._playerConfig});
    },
    _initializeDom: function() {
      this._view = new NicoVideoPlayerDialogView({
        dialog: this,
        playerConfig: this._playerConfig,
        nicoVideoPlayer: this._nicoVideoPlayer
      });
      this._$playerContainer = this._view.get$Container();
      this._view.on('command', this._onCommand.bind(this));
      this._view.on('postChat', _.bind(function(e, chat, cmd) {
        this.addChat(chat, cmd).then(function() {
          e.resolve();
        }, function() {
          e.reject();
        });
      }, this));
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
        wordRegFilter: config.getValue('wordRegFilter'),
        wordRegFilterFlags: config.getValue('wordRegFilterFlags'),
        commandFilter: config.getValue('commandFilter'),
        userIdFilter:  config.getValue('userIdFilter')
      });
      this._view.setNicoVideoPlayer(nicoVideoPlayer);

      this._messageApiLoader = new MessageApiLoader();

      window.setTimeout(function() {
        this._videoInfoPanel = new VideoInfoPanel({
          dialog: this,
          player: nicoVideoPlayer,
          node: this._$playerContainer
        });
        this._videoInfoPanel.on('command', this._onCommand.bind(this));
        if (this._playerConfig.getValue('enableCommentPanel')) {
          this._initializeCommentPanel();
        }
      }.bind(this), 0);

      nicoVideoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
      nicoVideoPlayer.on('ended',          this._onVideoEnded.bind(this));
      nicoVideoPlayer.on('canPlay',        this._onVideoCanPlay.bind(this));
      nicoVideoPlayer.on('play',           this._onVideoPlay.bind(this));
      nicoVideoPlayer.on('pause',          this._onVideoPause.bind(this));
      nicoVideoPlayer.on('playing',        this._onVideoPlaying.bind(this));
      nicoVideoPlayer.on('stalled',        this._onVideoStalled.bind(this));
      nicoVideoPlayer.on('progress',       this._onVideoProgress.bind(this));
      nicoVideoPlayer.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
      nicoVideoPlayer.on('commentParsed',  this._onCommentParsed.bind(this));
      nicoVideoPlayer.on('commentChange',  this._onCommentChange.bind(this));
      nicoVideoPlayer.on('commentFilterChange', this._onCommentFilterChange.bind(this));

      nicoVideoPlayer.on('error', this._onVideoError.bind(this));
      nicoVideoPlayer.on('abort', this._onVideoAbort.bind(this));

      nicoVideoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
      nicoVideoPlayer.on('volumeChange', _.debounce(this._onVolumeChangeEnd.bind(this), 1500));

      return nicoVideoPlayer;
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
        case 'volumeUp':
          this._nicoVideoPlayer.volumeUp();
          break;
        case 'volumeDown':
          this._nicoVideoPlayer.volumeDown();
          break;
        case 'togglePlay':
          this.togglePlay();
          break;
        case 'pause':
          this.pause();
          break;
        case 'play':
          this.play();
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
        case 'deflistRemove':
          this._onDeflistRemove(param);
          break;
        case 'playlistAdd':
        case 'playlistAppend':
          this._onPlaylistAppend(param);
          break;
        case 'playlistInsert':
          this._onPlaylistInsert(param);
          break;
        case 'playlistSetMylist':
          this._onPlaylistSetMylist(param);
          break;
        case 'playlistSetUploadedVideo':
          this._onPlaylistSetUploadedVideo(param);
          break;
        case 'playlistSetSearchVideo':
          this._onPlaylistSetSearchVideo(param);
          break;
        case 'playNextVideo':
          this.playNextVideo();
          break;
        case 'playPreviousVideo':
          this.playPreviousVideo();
          break;
        case 'playlistShuffle':
          if (this._playlist) {
            this._playlist.shuffle();
          }
          break;
        case 'mylistAdd':
          this._onMylistAdd(param.mylistId, param.mylistName);
          break;
        case 'mylistRemove':
          this._onMylistRemove(param.mylistId, param.mylistName);
          break;
        case 'mylistWindow':
          ZenzaWatch.util.openMylistWindow(this._videoInfo.getWatchId());
          break;
        case 'settingPanel':
          this._view.toggleSettingPanel();
          break;
        case 'seek':
        case 'seekTo':
          this.setCurrentTime(param * 1);
          break;
        case 'seekBy':
          this.setCurrentTime(this.getCurrentTime() + param * 1);
          break;
        case 'addWordFilter':
          this._nicoVideoPlayer.addWordFilter(param);
          PopupMessage.notify('NGワード追加: ' + param);
          break;
        case 'setWordRegFilter':
        case 'setWordRegFilterFlags':
          this._nicoVideoPlayer.setWordRegFilter(param);
          PopupMessage.notify('NGワード正規表現更新');
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
          ZenzaWatch.util.openTweetWindow(this._videoInfo);
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
        case 'reload':
          this.reload({currentTime: this.getCurrentTime()});
          break;
        case 'openGinza':
          window.open('//www.nicovideo.jp/watch/' + this._watchId, 'watchGinza');
          break;
        case 'reloadComment':
          this.reloadComment();
          break;
        case 'playbackRate':
          if (ZenzaWatch.util.isPremium()) {
            this._playerConfig.setValue(command, param);
          }
          break;
        case 'shiftUp':
          if (!ZenzaWatch.util.isPremium()) { break; }
          {
            v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
            if (v < 2) { v += 0.25; } else { v = Math.min(10, v + 0.5); }
            this._playerConfig.setValue('playbackRate', v);
          }
          break;
        case 'shiftDown':
          if (!ZenzaWatch.util.isPremium()) { break; }
          {
            v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
            if (v > 2) { v -= 0.5; } else { v = Math.max(0.1, v - 0.25); }
            this._playerConfig.setValue('playbackRate', v);
          }
          break;
        case 'baseFontFamily':
        case 'baseChatScale':
        case 'enableFilter':
        case 'screenMode':
        case 'sharedNgLevel':
          this._playerConfig.setValue(command, param);
          break;
      }
    },
    _onKeyDown: function(name , e, param) {
      this._onKeyEvent(name, e, param);
    },
    _onKeyUp: function(name , e, param) {
      this._onKeyEvent(name, e, param);
    },
    _onKeyEvent: function(name , e, param) {
      if (!this._isOpen) {
        var lastWatchId = this._playerConfig.getValue('lastWatchId');
        if (name === 'RE_OPEN' && lastWatchId) {
          this.open(lastWatchId);
          e.preventDefault();
        }
        return;
      }
      switch (name) {
        case 'RE_OPEN':
          this.execCommand('reload');
          break;
        case 'PAUSE':
          this.pause();
          break;
        case 'SPACE':
        case 'TOGGLE_PLAY':
          this.togglePlay();
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
          this._view.focusToCommentInput();
          break;
        case 'DEFLIST':
          this._onDeflistAdd(param);
          break;
        case 'DEFLIST_REMOVE':
          this._onDeflistRemove(param);
          break;
        case 'VIEW_COMMENT':
          this.execCommand('toggleShowComment');
          break;
        case 'MUTE':
          this.execCommand('toggleMute');
          break;
        case 'VOL_UP':
          this.execCommand('volumeUp');
          break;
        case 'VOL_DOWN':
          this.execCommand('volumeDown');
          break;
        case 'SEEK_TO':
          this.execCommand('seekTo', param);
          break;
        case 'SEEK_BY':
          this.execCommand('seekBy', param);
          break;
        case 'NEXT_VIDEO':
          this.playNextVideo();
          break;
        case 'PREV_VIDEO':
          this.playPreviousVideo();
          break;
        case 'PLAYBACK_RATE':
          this.execCommand('playbackRate', param);
          break;
        case 'SHIFT_UP':
          this.execCommand('shiftUp');
          break;
        case 'SHIFT_DOWN':
          this.execCommand('shiftDown');
          break;
        case 'SCREEN_MODE':
          this.execCommand('screenMode', param);
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
          this._view.toggleClass('showComment', value);
          break;
        case 'loop':
          PopupMessage.notify('リピート再生: ' + (value ? 'ON' : 'OFF'));
          this._view.toggleClass('loop', value);
          break;
        case 'mute':
          PopupMessage.notify('ミュート: ' + (value ? 'ON' : 'OFF'));
          this._view.toggleClass('mute', value);
          break;
        case 'sharedNgLevel':
          PopupMessage.notify('NG共有: ' +
            {'HIGH': '強', 'MID': '中', 'LOW': '弱', 'NONE': 'なし'}[value]);
          break;
        case 'debug':
          this._view.toggleClass('debug', value);
          PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
          break;
        case 'enableFilter':
          PopupMessage.notify('NG設定: ' + (value ? 'ON' : 'OFF'));
          this._nicoVideoPlayer.setIsCommentFilterEnable(value);
          break;
        case 'wordFilter':
          this._nicoVideoPlayer.setWordFilterList(value);
          break;
        case 'setWordRegFilter':
          this._nicoVideoPlayer.setWordRegFilter(value);
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
      this._view.setIsBackComment(v);
    },
    _updateScreenMode: function(mode) {
      this.emit('screenModeChange', mode);
    },
    _clearClass: function() {
      this._view.clearClass();
    },
    _onClick: function() {
    },
    _onPlaylistAppend: function(watchId) {
      this._initializePlaylist();

      var onAppend = _.debounce(function() {
        this._videoInfoPanel.selectTab('playlist');
        this._playlist.scrollToWatchId(watchId);
      }.bind(this), 500);
      this._playlist.append(watchId).then(onAppend, onAppend);
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
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      var query = this._videoWatchOptions.getQuery();
      option.shuffle = parseInt(query.shuffle, 10) === 1;

      this._playlist.loadFromMylist(mylistId, option).then(function(result) {
        PopupMessage.notify(result.message);
        this._videoInfoPanel.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
      }.bind(this),
      function() {
        PopupMessage.alert('マイリストのロード失敗');
      }.bind(this));
    },
    _onPlaylistSetUploadedVideo: function(userId, option) {
      this._initializePlaylist();
      option = option || {watchId: this._watchId};
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      this._playlist.loadUploadedVideo(userId, option).then(function(result) {
        PopupMessage.notify(result.message);
        this._videoInfoPanel.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
      }.bind(this),
      function(err) {
        PopupMessage.alert(err.message || '投稿動画一覧のロード失敗');
      }.bind(this));

    },
    _onPlaylistSetSearchVideo: function(params) {
      this._initializePlaylist();

      var option = params.option || {};
      var word = params.word;
      option = option || {};
      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this._playlist.isEnable();

      var query = this._videoWatchOptions.getQuery();
      _.assign(option, query);

      //window.console.log('_onPlaylistSetSearchVideo:', word, option);
      this._playlist.loadSearchVideo(word, option).then(function(result) {
        PopupMessage.notify(result.message);
        this._videoInfoPanel.selectTab('playlist');
        this._playlist.insertCurrentVideo(this._videoInfo);
        ZenzaWatch.util.callAsync(function() {
          this._playlist.scrollToActiveItem();
        }, this, 1000);
      }.bind(this),
      function(err) {
        PopupMessage.alert(err.message || '検索失敗または該当無し: 「' + word + '」');
      }.bind(this));
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
    _onCommentPanelStatusUpdate: function() {
      var commentPanel = this._commentPanel;
      this._playerConfig.setValue(
        'enableCommentPanelAutoScroll', commentPanel.isAutoScroll());
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
    _onDeflistRemove: function(watchId) {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingDeflist')) { return; } //busy
      var removeClass = function() {
        $container.removeClass('updatingDeflist');
      };
      $container.addClass('updatingDeflist');
      var timer = window.setTimeout(removeClass, 10000);

      watchId = watchId || this._videoInfo.getWatchId();
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.removeDeflistItem(watchId)
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
    _onMylistRemove: function(groupId, mylistName) {
      var $container = this._$playerContainer;
      if ($container.hasClass('updatingMylist')) { return; } //busy

      var removeClass = function() {
        $container.removeClass('updatingMylist');
      };

      $container.addClass('updatingMylist');
      var timer = window.setTimeout(removeClass, 10000);

      var watchId = this._videoInfo.getWatchId();

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.removeMylistItem(watchId, groupId)
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
      ///this._commentPanel.setChatList(this.getChatList());
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
      this._view.show();
      this._updateScreenMode(this._playerConfig.getValue('screenMode'));
      this._isOpen = true;
    },
    hide: function() {
      this._isOpen = false;
      this._view.hide();
    },
    open: function(watchId, options) {
      if (!watchId) { return; }
      // 連打対策
      if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) { return; }

      this._updateLastPlayerId();
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
      
      this._view.resetVideoLoadingStatus();

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
      this._isFirstSeek = true;
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
      options = this._videoWatchOptions.createOptionsForReload(options);
      
      if (this._lastCurrentTime > 0) {
        options.currentTime = this._lastCurrentTime;
      }
      this.open(this._watchId, options);
    },
    getCurrentTime: function() {
      if (!this._nicoVideoPlayer) {
        return 0;
      }
      var ct = this._nicoVideoPlayer.getCurrentTime() * 1;
      if (!this._hasError && ct > 0) {
        this._lastCurrentTime = ct;
      }
      return this._lastCurrentTime;
    },
    setCurrentTime: function(sec) {
      if (!this._nicoVideoPlayer) {
        return;
      }
      if (ZenzaWatch.util.isPremium() ||
          this._isFirstSeek ||
          this.isInSeekableBuffer(sec)) {
        this._isFirstSeek = false;
        this._nicoVideoPlayer.setCurrentTime(sec);
        this._lastCurrentTime = this._nicoVideoPlayer.getCurrentTime();
      }
    },
    // 政治的な理由により一般会員はバッファ内しかシークできないようにする必要があるため、
    // 指定した秒がバッファ内かどうかを判定して返す
    isInSeekableBuffer: function(sec) {
      // プレミアム会員は常にどこでもシーク可能
      var range = this.getBufferedRange();
      for (var i = 0, len = range.length; i < len; i++) {
        try {
          var start = range.start(i);
          var end   = range.end(i);
          if (start <= sec && end >= sec) {
            return true;
          }
        } catch (e) {
        }
      }
      return false;
    },
    getId: function() {
      return this._id;
    },
    _updateLastPlayerId: function() {
      this._playerConfig.setValue('lastPlayerId', '');
      this._playerConfig.setValue('lastPlayerId', this.getId());
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

      var flvInfo   = videoInfo.flvInfo;
      var videoUrl  = flvInfo.url;

      this._flvInfo = flvInfo;
      this._threadId = flvInfo.thread_id;

      this._videoInfo = new VideoInfoModel(videoInfo);
      this._videoSession = new VideoSession({
        videoInfo: this._videoInfo,
        videoWatchOptions: this._videoWatchOptions
      });
      this._setThumbnail(videoInfo.thumbnail);

//      this._videoSession.create().then(function(videoUrl) {
//        this._nicoVideoPlayer.setVideo(videoUrl);
//        this._nicoVideoPlayer.setVideoInfo(this._videoInfo);
//      }.bind(this));
      this._nicoVideoPlayer.setVideo(videoUrl);
      this._nicoVideoPlayer.setVideoInfo(this._videoInfo);


      this.loadComment(flvInfo);

      this.emit('loadVideoInfo', this._videoInfo);
      if (this._videoInfoPanel) {
        this._videoInfoPanel.update(this._videoInfo);
      }

    },
    loadComment: function(flvInfo) {
      this._messageApiLoader.load(
        flvInfo.ms,
        flvInfo.thread_id,
        flvInfo.l,
        flvInfo.user_id,
        flvInfo.needs_key === '1',
        flvInfo.optional_thread_id,
        flvInfo.userkey
      ).then(
        _.bind(this._onCommentLoadSuccess, this, this._requestId),
        _.bind(this._onCommentLoadFail,    this, this._requestId)
      );
    },
    reloadComment: function() {
      this.loadComment(this._flvInfo, this._requestId);
    },
    _onVideoInfoLoaderFail: function(requestId, watchId, e) {
      window.console.timeEnd('VideoInfoLoader');
      if (this._requestId !== requestId) {
        return;
      }
      var message = e.message;
      this._setErrorMessage(message, watchId);
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
      this._view.setThumbnail(thumbnail);
    },
    _setErrorMessage: function(msg) {
      this._view.setErrorMessage(msg);
    },
    _onCommentLoadSuccess: function(requestId, result) {
      if (requestId !== this._requestId) {
        return;
      }
      PopupMessage.notify('コメント取得成功');
      var options = {
        replacement: this._videoInfo.getReplacementWords()
      };
      this._nicoVideoPlayer.closeCommentPlayer();
      this._nicoVideoPlayer.setComment(result.xml, options);
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
        this.setCurrentTime(currentTime);
      }
    },
    _onVideoCanPlay: function() {
      window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
      this._playerConfig.setValue('lastWatchId', this._watchId);


      if (this._videoWatchOptions.isPlaylistStartRequest()) {
        this._initializePlaylist();

        var option = this._videoWatchOptions.getMylistLoadOptions();
        var query = this._videoWatchOptions.getQuery();

        // 通常時はプレイリストの置き換え、
        // 連続再生中はプレイリストに追加で読み込む
        option.append = this.isPlaying() && this._playlist.isEnable();

        // //www.nicovideo.jp/watch/sm20353707 // プレイリスト開幕用動画
        option.shuffle = parseInt(query.shuffle, 10) === 1;
        console.log('playlist option:', option);

        if (query.playlist_type === 'mylist_playlist') {
          this._playlist.loadFromMylist(option.group_id, option);
        } else {
          var word = query.tag || query.keyword;
          option.searchType = query.tag ? 'tag' : '';
          _.assign(option, query);
          this._playlist.loadSearchVideo(word, option);
        }
        this._playlist.toggleEnable(true);
      } else if (PlaylistSession.isExist() && !this._playlist) {
        this._initializePlaylist();
        this._playlist.restoreFromSession();
      } else {
        this._initializePlaylist();
      }
      // チャンネル動画は、1本の動画がwatchId表記とvideoId表記で2本登録されてしまう。
      // そこでvideoId表記のほうを除去する
      this._playlist.insertCurrentVideo(this._videoInfo);
      if (this._videoInfo.getWatchId() !==this._videoInfo.getVideoId() &&
          this._videoInfo.getVideoId().indexOf('so') === 0) {
        this._playlist.removeItemByWatchId(this._videoInfo.getVideoId());
      }


      this.emitAsync('canPlay', this._watchId, this._videoInfo);

      if (this._playerConfig.getValue('autoPlay') && this._isOpen) {
        this.play();
      }
    },
    _onVideoPlay:    function() { this.emit('play'); },
    _onVideoPlaying: function() { this.emit('playing'); },
    _onVideoPause:   function() { this.emit('pause'); },
    _onVideoStalled: function() { this.emit('stalled'); },
    _onVideoProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onVideoError: function() {
      this._hasError = true;
      this.emit('error');
      // 10分以上たってエラーになるのはセッション切れ(nicohistoryの有効期限)
      // と思われるので開き直す
      if (Date.now() - this._lastOpenAt > 10 * 60 * 1000) {
        this.reload({ currentTime: this.getCurrentTime() });
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
      this.emit('abort');
    },
    _onVideoAspectRatioFix: function(ratio) {
      this.emit('aspectRatioFix', ratio);
    },
    _onVideoEnded: function() {
      // ループ再生中は飛んでこない
      this.emitAsync('ended');
      if (this.isPlaylistEnable() && this._playlist.hasNext()) {
        this.playNextVideo();
        return;
      } else if (this._playlist) {
        this._playlist.toggleEnable(false);
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
      this.emit('volumeChange', vol, mute);
    },
    _onVolumeChangeEnd: function(vol, mute) {
      this.emit('volumeChangeEnd', vol, mute);
    },
    close: function() {
      if (FullScreen.now()) {
        FullScreen.cancel();
      }
      this.hide();
      this._refresh();
      if (this._videoSession) { this._videoSession.close(); }
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
    _initializeCommentPanel: function() {
      if (this._commentPanel) { return; }
      var $container = this._videoInfoPanel.appendTab('comment', 'コメント');
      this._commentPanel = new CommentPanel({
        player: this,
        $container: $container,
        autoScroll: this._playerConfig.getValue('enableCommentPanelAutoScroll')
      });
      this._commentPanel.on('command', this._onCommand.bind(this));
      this._commentPanel.on('update', _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
      //this._videoInfoPanel.selectTab('comment');
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
    playPreviousVideo: function() {
      if (!this._playlist) { return; }
      var opt = this._videoWatchOptions.createOptionsForVideoChange();

      var prevId = this._playlist.selectPrevious();
      if (prevId) {
        this.open(prevId, opt);
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

      var timeout;
      var resolve, reject;
      window.console.time('コメント投稿');

      var _onSuccess = function(result) {
        window.console.timeEnd('コメント投稿');
        nicoChat.setIsUpdating(false);
        PopupMessage.notify('コメント投稿成功');
        $container.removeClass('postChat');

        this._threadInfo.blockNo = result.blockNo;
        window.clearTimeout(timeout);

        resolve(result);
      }.bind(this);

      var _onFailFinal = function(err) {
        err = err || {};

        window.console.log('_onFailFinal: ', err);
        window.clearTimeout(timeout);
        window.console.timeEnd('コメント投稿');

        nicoChat.setIsPostFail(true);
        nicoChat.setIsUpdating(false);
        PopupMessage.alert(err.message);
        $container.removeClass('postChat');
        if (err.blockNo && typeof err.blockNo === 'number') {
          this._threadInfo.blockNo = err.blockNo;
        }
        reject(err);
      }.bind(this);

      var _onTimeout = function() {
        PopupMessage.alert('コメント投稿失敗(timeout)');
        $container.removeClass('postChat');
        reject({});
      }.bind(this);

      var _retryPost = function() {
        window.clearTimeout(timeout);
        window.console.info('retry: コメント投稿');
        timeout = window.setTimeout(_onTimeout, 30000);

        return this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos).then(
          _onSuccess,
          _onFailFinal
        );
      }.bind(this);

      var _onTicketFail = function(err) {
        var flvInfo = this._flvInfo;
        this._messageApiLoader.load(
          flvInfo.ms,
          flvInfo.thread_id,
          flvInfo.l,
          flvInfo.user_id,
          flvInfo.needs_key === '1',
          flvInfo.optional_thread_id,
          flvInfo.userkey
        ).then(
          function(result) {
            window.console.log('ticket再取得 success');
            this._threadInfo = result.threadInfo;
            return _retryPost();
          }.bind(this),
          function(e) {
            window.console.log('ticket再取得 fail: ', e);
            _onFailFinal(err);
          }
        );
      }.bind(this);

      var _onFail1st = function(err) {
        err = err || {};

        var errorCode = parseInt(err.code, 10);
        window.console.log('_onFail1st: ', errorCode);

        if (err.blockNo && typeof err.blockNo === 'number') {
          this._threadInfo.blockNo = err.blockNo;
        }

        if (errorCode === 3) {
          return _onTicketFail(err);
        } else if (!_.contains([2, 4, 5], errorCode)) {
          return _onFailFinal(err);
        }

        return _retryPost();
      }.bind(this);

      timeout = window.setTimeout(_onTimeout, 30000);

      text = ZenzaWatch.util.escapeHtml(text);
      return new Promise(function(res, rej) {
        resolve = res;
        reject = rej;
        this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos).then(
          _onSuccess,
          _onFail1st
        );
      }.bind(this));
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

      will-change: transform, opacity;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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

    .menuItemContainer.onErrorMenu {
      position: absolute;
      left: 50%;
      top: 60%;
      transform: translate(-50%, 0);
      display: none;
      white-space: nowrap;

    }
    .error .menuItemContainer.onErrorMenu {
      display: block !important;
      opacity: 1 !important;
    }
    .error .menuItemContainer.onErrorMenu .menuButton {
      opacity: 0.8 !important;
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

    .menuItemContainer.onErrorMenu .menuButton {
      position: relative;
      display: inline-block;
      margin: 0 16px;
      padding: 8px;
      background: #888;
      color: #000;
      cursor: pointer;
      box-shadow: 4px 4px 0 #333;
      border: 2px outset;
      width: 100px;
      font-size: 14px;
      line-height: 16px;
    }
    .menuItemContainer.onErrorMenu .menuButton:active {
      background: #ccc;
      box-shadow: 4px 4px 0 #333, 0 0 8px #ccc;
    }
    .menuItemContainer.onErrorMenu .menuButton:active {
      transform: translate(4px, 4px);
      border: 2px inset;
      box-shadow: none;
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
      background: url("//uni.res.nimg.jp/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
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

      <div class="menuItemContainer onErrorMenu">
        <div class="menuButton openGinzaMenu" data-command="openGinza">
          <div class="menuButtonInner">GINZAで視聴</div>
        </div>

        <div class="menuButton reloadMenu" data-command="reload">
          <div class="menuButtonInner">リロード</div>
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
        .on('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); })
        .on('click',     this._onMenuButtonClick.bind(this))
        .on('mousedown', this._onMenuButtonMouseDown.bind(this));

      this._$deflistAdd       = $container.find('.deflistAdd');
      this._$mylistAddMenu    = $container.find('.mylistAddMenu');
      this._$mylistSelectMenu = $container.find('.mylistSelectMenu');
      this._$closeButton      = $container.find('.closeButton');
      this._$closeButton.on('mousedown',
        _.debounce(this.emit.bind(this, 'command', 'close'), 300));

      this._$ngSettingMenu       = $container.find('.ngSettingMenu');
      this._$ngSettingSelectMenu = $container.find('.ngSettingSelectMenu');

      this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));

      this._$mylistSelectMenu.on('wheel', function(e) {
        e.stopPropagation();
      });

      ZenzaWatch.emitter.on('hideHover', function() {
        this._hideMenu();
      }.bind(this));

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
      });
      $menu.on('mousedown', '.mylistIcon, .mylistLink', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target).closest('.mylistIcon, .mylistLink');
        var command    = $target.attr('data-command');
        var mylistId   = $target.attr('data-mylist-id');
        var mylistName = $target.attr('data-mylist-name');

        ZenzaWatch.util.callAsync(function() {
          self.toggleMylistMenu(false);
        }, this);

        if (command === 'open') {
          location.href = '//www.nicovideo.jp/my/mylist/#/' + mylistId;
        } else {
          var cmd = (e.shiftKey || e.which > 1) ? 'mylistRemove' : 'mylistAdd';
          self.emit('command', cmd, {mylistId: mylistId, mylistName: mylistName});
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
    _onMenuButtonMouseDown: function(e) {
      var $target = $(e.target).closest('.menuButton');
      var command = $target.attr('data-command');
      switch (command) {
        case 'deflistAdd':
          if (e.shiftKey) {
            this.emit('command', 'mylistWindow');
          } else {
            this.emit('command', e.which > 1 ? 'deflistRemove' : 'deflistAdd');
          }
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    _onMenuButtonClick: function(e) {
      e.preventDefault();
      e.stopPropagation();
      var $target = $(e.target).closest('.menuButton');
      var command = $target.attr('data-command');
      switch (command) {
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
        case 'openGinza':
        case 'reload':
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

    .zenzaPlayerContainer .commentLayerFrame {
      opacity: %COMMENT_LAYER_OPACITY%;
    }

  */});
  DynamicCss.prototype = {
    initialize: function(params) {
      var config = this._playerConfig = params.playerConfig;

      this._scale = 1.0;
      this._commentLayerOpacity = 1.0;

      var update = _.bind(this._update, this);
      config.on('update-menuScale', update);
      config.on('update-commentLayerOpacity', update);
      update();
    },
    _update: function() {
      var scale = parseFloat(this._playerConfig.getValue('menuScale'), 10);
      var commentLayerOpacity =
        parseFloat(this._playerConfig.getValue('commentLayerOpacity'), 10);

      if (this._scale === scale &&
          this._commentLayerOpacity === commentLayerOpacity) { return; }

      if (!this._style) {
        this._style = ZenzaWatch.util.addStyle('');
      }

      this._scale = scale;
      this._commentLayerOpacity = commentLayerOpacity;

      var tpl = DynamicCss.__css__
        .replace(/%SCALE%/g, scale)
        .replace(/%CONTROL_BAR_HEIGHT%/g,
          (VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) * scale +
          VideoControlBar.BASE_SEEKBAR_HEIGHT
          )
        .replace(/%COMMENT_LAYER_OPACITY%/g, commentLayerOpacity)
        ;
      this._style.innerHTML = tpl;
    }
  };












//===END===
//

