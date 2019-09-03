import * as $ from 'jquery';
import * as _ from 'lodash';
import {global} from './ZenzaWatchIndex';
import {CONSTANT} from './constant';
import {PlaybackPosition, VideoInfoLoader, NVWatchCaller} from './loader/api';
import {Fullscreen, ShortcutKeyEmitter, util} from './util';
import {NicoVideoPlayer} from './NicoVideoPlayer';
import {VideoFilter, VideoInfoModel} from './VideoInfo';
import {CommentInputPanel} from './CommentInputPanel';
import {CommentPanel} from './CommentPanel';
import {VideoControlBar} from './VideoControlBar';
import {VideoInfoPanel} from './VideoInfoPanel';
import {SettingPanel} from './SettingPanel';
import {Playlist, PlaylistSession} from './VideoList';
import {VideoSession} from './VideoSession';
import {Emitter} from './baselib';
import {ThreadLoader} from './loader/ThreadLoader';
import {sleep} from '../packages/lib/src/infra/sleep';
import {VideoSessionWorker} from '../packages/lib/src/nico/VideoSessionWorker';
import {PlayerState} from './State';
import {ClassListWrapper} from '../packages/lib/src/dom/ClassListMapper';
import {objUtil} from '../packages/lib/src/infra/objUtil';
import {reg} from '../packages/lib/src/text/reg';
import {bounce} from '../packages/lib/src/infra/bounce';
import {MylistApiLoader} from '../packages/lib/src/nico/MylistApiLoader';
import {ThumbInfoLoader} from '../packages/lib/src/nico/ThumbInfoLoader';
import {WatchInfoCacheDb} from '../packages/lib/src/nico/WatchInfoCacheDb';
import {css} from '../packages/lib/src/css/css';

//===BEGIN===
//@require ClassListWrapper

class PlayerConfig {
  static getInstance(config) {
    if (!PlayerConfig.instance) {
      PlayerConfig.instance = this.wrapKey(config);
    }
    return PlayerConfig.instance;
  }
  static wrapKey(config, mode = '') {
    if (!mode && util.isGinzaWatchUrl()) {
      mode = 'ginza';
    } else if (location && location.host.indexOf('.nicovideo.jp') < 0) {
      mode = 'others';
    }
    if (!mode) { return config; }
    config.getNativeKey = key => {
      switch(mode) {
        case 'ginza':
          if (['autoPlay', 'screenMode'].includes(key)) {
            return `${key}:${mode}`;
          }
        break;
        case 'others':
          if (['autoPlay', 'screenMode', 'overrideWatchLink'].includes(key)) {
            return `${key}:${mode}`;
          }
        break;
      }
      return key;
    };
    return config;
  }
}

class VideoWatchOptions {
  constructor(watchId, options, config) {
    this._watchId = watchId;
    this._options = options || {};
    this._config = config;
  }
  get rawData() {
    return this._options;
  }
  get eventType() {
    return this._options.eventType || '';
  }
  get query() {
    return this._options.query || {};
  }
  get videoLoadOptions() {
    let options = {
      economy: this.isEconomySelected
    };
    return options;
  }
  get mylistLoadOptions() {
    let options = {};
    let query = this.query;
    if (query.mylist_sort) {
      options.sort = query.mylist_sort;
    }
    options.group_id = query.group_id;
    options.watchId = this._watchId;
    return options;
  }
  get isPlaylistStartRequest() {
    let eventType = this.eventType;
    let query = this.query;
    if (eventType !== 'click' || query.continuous !== '1') {
      return false;
    }
    if (['mylist', 'deflist', 'tag', 'search'].includes(query.playlist_type) &&
      (query.group_id || query.order)) {
      return true;
    }
    return false;
  }
  hasKey(key) {
    return _.has(this._options, key);
  }
  get isOpenNow() {
    return this._options.openNow === true;
  }
  get isEconomySelected() {
    return _.isBoolean(this._options.economy) ?
      this._options.economy : this._config.getValue('smileVideoQuality') === 'eco';
  }
  get isAutoCloseFullScreen() {
    return !!this._options.autoCloseFullScreen;
  }
  get isReload() {
    return this._options.reloadCount > 0;
  }
  get videoServerType() {
    return this._options.videoServerType;
  }
  get isAutoZenTubeDisabled() {
    return !!this._options.isAutoZenTubeDisabled;
  }
  get reloadCount() {
    return this._options.reloadCount;
  }
  get currentTime() {
    return _.isNumber(this._options.currentTime) ?
      parseFloat(this._options.currentTime, 10) : 0;
  }
  createForVideoChange(options) {
    options = options || {};
    delete this._options.economy;
    _.defaults(options, this._options);
    options.openNow = true;
    delete options.videoServerType;
    options.isAutoZenTubeDisabled = false;
    options.currentTime = 0;
    options.reloadCount = 0;
    options.query = {};
    return options;
  }
  createForReload(options) {
    options = options || {};
    delete this._options.economy;
    options.isAutoZenTubeDisabled = typeof options.isAutoZenTubeDisabled === 'boolean' ?
      options.isAutoZenTubeDisabled : true;
    _.defaults(options, this._options);
    options.openNow = true;
    options.reloadCount = options.reloadCount ? (options.reloadCount + 1) : 1;
    options.query = {};
    return options;
  }
  createForSession(options) {
    options = options || {};
    _.defaults(options, this._options);
    options.query = {};
    return options;
  }
}


class NicoVideoPlayerDialogView extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  initialize(params) {
    const dialog = this._dialog = params.dialog;
    this._playerConfig = params.playerConfig;
    this._nicoVideoPlayer = params.nicoVideoPlayer;
    this._state = params.playerState;
    this._currentTimeGetter = params.currentTimeGetter;

    this._aspectRatio = 9 / 16;

    dialog.on('canPlay', this._onVideoCanPlay.bind(this));
    dialog.on('videoCount', this._onVideoCount.bind(this));
    dialog.on('error', this._onVideoError.bind(this));
    dialog.on('play', this._onVideoPlay.bind(this));
    dialog.on('playing', this._onVideoPlaying.bind(this));
    dialog.on('pause', this._onVideoPause.bind(this));
    dialog.on('stalled', this._onVideoStalled.bind(this));
    dialog.on('abort', this._onVideoAbort.bind(this));
    dialog.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
    dialog.on('volumeChange', this._onVolumeChange.bind(this));
    dialog.on('volumeChangeEnd', this._onVolumeChangeEnd.bind(this));
    dialog.on('beforeVideoOpen', this._onBeforeVideoOpen.bind(this));
    dialog.on('loadVideoInfoFail', this._onVideoInfoFail.bind(this));
    dialog.on('videoServerType', this._onVideoServerType.bind(this));


    this._initializeDom();
    this._state.on('update', this._onPlayerStateUpdate.bind(this));
    this._state.onkey('videoInfo', this._onVideoInfoLoad.bind(this));
  }
  async _initializeDom() {
    util.addStyle(NicoVideoPlayerDialogView.__css__);
    const $dialog = this._$dialog = util.$.html(NicoVideoPlayerDialogView.__tpl__.trim());
    const onCommand = this._onCommand.bind(this);
    const config = this._playerConfig;
    const state = this._state;
    this._$body = util.$('body, html');

    const $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
    const container = $container[0];
    const classList = this._classList = new ClassListWrapper(container);

    container.addEventListener('click', e => {
      global.emitter.emitAsync('hideHover');
      if (
        e.target.classList.contains('touchWrapper') &&
        config.getValue('enableTogglePlayOnClick') &&
        !classList.contains('menuOpen')) {
        onCommand('togglePlay');
      }
      e.preventDefault();
      e.stopPropagation();
      classList.remove('menuOpen');
    });
    container.addEventListener('command', e=> {
      e.stopPropagation();
      e.preventDefault();
      this._onCommand(e.detail.command, e.detail.param);
    });
    container.addEventListener('focusin', e => {
      let target = (e.path && e.path.length) ? e.path[0] : e.target;
      if (target.dataset.hasSubmenu) {
        classList.add('menuOpen');
      }
    });

    this._applyState();

    // マウスを動かしてないのにmousemoveが飛んできたらスルー
    let lastX = 0, lastY = 0;
    let onMouseMove = this._onMouseMove.bind(this);
    let onMouseMoveEnd = _.debounce(this._onMouseMoveEnd.bind(this), 400);
    container.addEventListener('mousemove', _.throttle(e => {
      if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
        return;
      }
      lastX = e.screenX;
      lastY = e.screenY;
      onMouseMove(e);
      onMouseMoveEnd(e);
    }, 100));

    $dialog
      .on('dblclick', e => {
        if (!e.target || e.target.id !== 'zenzaVideoPlayerDialog') {
          return;
        }
        if (config.getValue('enableDblclickClose')) {
          this.emit('command', 'close');
        }
      })
      .toggleClass('is-guest', !util.isLogin());

    this._hoverMenu = new VideoHoverMenu({
      playerContainer: container,
      playerState: state
    });

    this._commentInput = new CommentInputPanel({
      $playerContainer: $container,
      playerConfig: config
    });

    this._commentInput.on('post', (e, chat, cmd) =>
      this.emit('postChat', e, chat, cmd));

    let hasPlaying = false;
    this._commentInput.on('focus', isAutoPause => {
      hasPlaying = state.isPlaying;
      if (isAutoPause) {
        this.emit('command', 'pause');
      }
    });
    this._commentInput.on('blur', isAutoPause => {
      if (isAutoPause && hasPlaying && state.isOpen) {
        this.emit('command', 'play');
      }
    });
    this._commentInput.on('esc', () => this._escBlockExpiredAt = Date.now() + 1000 * 2);

    this._settingPanel = new SettingPanel({
      $playerContainer: $container,
      playerConfig: config,
      player: this._dialog
    });
    this._settingPanel.on('command', onCommand);

    await sleep.idle();
    this._videoControlBar = new VideoControlBar({
      $playerContainer: $container,
      playerConfig: config,
      player: this._dialog,
      playerState: this._state
    });
    this._videoControlBar.on('command', onCommand);

    this._$errorMessageContainer = $container.find('.errorMessageContainer');

    await sleep.idle();
    this._initializeVideoInfoPanel();
    this._initializeResponsive();

    this.selectTab(this._state.currentTab);

    document.documentElement.addEventListener('paste', this._onPaste.bind(this));

    global.emitter.on('showMenu', () => this.addClass('menuOpen'));
    global.emitter.on('hideMenu', () => this.removeClass('menuOpen'));
    global.emitter.on('fullscreenStatusChange', () => this._applyScreenMode(true));
    document.body.append($dialog[0]);
    this.emitResolve('dom-ready');
  }
  _initializeVideoInfoPanel() {
    if (this._videoInfoPanel) {
      return this._videoInfoPanel;
    }
    this._videoInfoPanel = new VideoInfoPanel({
      dialog: this,
      node: this._$playerContainer,
      currentTimeGetter: this._currentTimeGetter
    });
    this._videoInfoPanel.on('command', this._onCommand.bind(this));
    return this._videoInfoPanel;
  }
  _onCommand(command, param) {
    switch (command) {
      case 'settingPanel':
        this.toggleSettingPanel();
        break;
      case 'toggle-flipH':
        this.toggleClass('is-flipH');
        break;
      case 'toggle-flipV':
        this.toggleClass('is-flipV');
        break;
      default:
        this.emit('command', command, param);
    }
  }
  async _onPaste(e) {
    const isZen = !!e.target.closest('.zenzaVideoPlayerDialog');
    window.console.log('onPaste', e.target, isZen);
    if (!isZen && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      return;
    }
    let text;
    try { text = await navigator.clipboard.readText(); } catch(e) { window.console.warn(e); }
    if (!text) {
      return;
    }

    text = text.trim();
    const isOpen = this._state.isOpen;
    const watchIdReg = /((nm|sm|so)\d+)/.exec(text);
    if (watchIdReg) {
      return this._onCommand('open', watchIdReg[1]);
    }
    if (!isOpen) {
      return;
    }
    const youtubeReg = /^https?:\/\/((www\.|)youtube\.com\/watch|youtu\.be)/.exec(text);
    if (youtubeReg) {
      return this._onCommand('setVideo', text);
    }
    const seekReg = /^(\d+):(\d+)$/.exec(text);
    if (seekReg) {
      return this._onCommand('seek', seekReg[1] * 60 + seekReg[2] * 1);
    }
    const mylistReg = /mylist(\/#\/|\/)(\d+)/.exec(text);
    if (mylistReg) {
      return this._onCommand('playlistSetMylist', mylistReg[2]);
    }
    const ownerReg = /user\/(\d+)/.exec(text);
    if (ownerReg) {
      return this._onCommand('playlistSetUploadedVideo', ownerReg[1]);
    }
  }
  _initializeResponsive() {
    window.addEventListener('resize', _.debounce(this._updateResponsive.bind(this), 500));
    this._varMapper = new VariablesMapper({config: this._playerConfig});
    this._varMapper.on('update', () => this._updateResponsive());
  }
  _updateResponsive() {
    if (!this._state.isOpen) {
      return;
    }
    let $container = this._$playerContainer;
    let $header = $container.find('.zenzaWatchVideoHeaderPanel');
    let config = this._playerConfig;

    // 画面の縦幅にシークバー分の余裕がある時は常時表示
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const vMargin = h - w * this._aspectRatio;

      const controlBarMode = config.getValue('fullscreenControlBarMode');
      if (controlBarMode === 'always-hide') {
        this.toggleClass('showVideoControlBar', false);
        return;
      }
      let videoControlBarHeight = this._varMapper.videoControlBarHeight;
      let showVideoHeaderPanel = vMargin >= videoControlBarHeight + $header[0].offsetHeight * 2;
      let showVideoControlBar;
      switch (controlBarMode) {
        case 'always-show':
          showVideoControlBar = true;
          break;
        case 'auto':
        default:
          showVideoControlBar = vMargin >= videoControlBarHeight;
      }
      this.toggleClass('showVideoControlBar', showVideoControlBar);
      this.toggleClass('showVideoHeaderPanel', showVideoHeaderPanel);
    };

    update();
  }
  _onMouseMove() {
    if (this._isMouseMoving) {
      return;
    }
    this.addClass('is-mouseMoving');
    this._isMouseMoving = true;
  }
  _onMouseMoveEnd() {
    if (!this._isMouseMoving) {
      return;
    }
    this.removeClass('is-mouseMoving');
    this._isMouseMoving = false;
  }
  _onVideoCanPlay(watchId, videoInfo, options) {
    this.emit('canPlay', watchId, videoInfo, options);
  }
  _onVideoCount({comment, view, mylist} = {}) {
    this.emit('videoCount', {comment, view, mylist});
  }
  _onVideoError(e) {
    this.emit('error', e);
  }
  _onBeforeVideoOpen() {
    this._setThumbnail();
  }
  _onVideoInfoLoad(videoInfo) {
    this._videoInfoPanel.update(videoInfo);
  }
  _onVideoInfoFail(videoInfo) {
    if (videoInfo) {
      this._videoInfoPanel.update(videoInfo);
    }
  }
  _onVideoServerType(type, sessionInfo) {
    this.toggleClass('is-dmcPlaying', type === 'dmc');
    this.emit('videoServerType', type, sessionInfo);
  }
  _onVideoPlay() {
  }
  _onVideoPlaying() {
  }
  _onVideoPause() {
  }
  _onVideoStalled() {
  }
  _onVideoAbort() {
  }
  _onVideoAspectRatioFix(ratio) {
    this._aspectRatio = ratio;
    this._updateResponsive();
  }
  _onVolumeChange(/*vol, mute*/) {
    this.addClass('volumeChanging');
  }
  _onVolumeChangeEnd(/*vol, mute*/) {
    this.removeClass('volumeChanging');
  }
  _onScreenModeChange() {
    this._applyScreenMode();
  }
  _getStateClassNameTable() {
    // TODO: テーブルなくても対応できるようにcss名を整理
    return this._classNameTable = this._classNameTable || objUtil.toMap({
      isAbort: 'is-abort',
      isBackComment: 'is-backComment',
      isShowComment: 'is-showComment',
      isDebug: 'is-debug',
      isDmcAvailable: 'is-dmcAvailable',
      isDmcPlaying: 'is-dmcPlaying',
      isError: 'is-error',
      isLoading: 'is-loading',
      isMute: 'is-mute',
      isLoop: 'is-loop',
      isOpen: 'is-open',
      isPlaying: 'is-playing',
      isSeeking: 'is-seeking',
      isPausing: 'is-pausing',
//      isStalled: 'is-stalled',
      isChanging: 'is-changing',
      isUpdatingDeflist: 'is-updatingDeflist',
      isUpdatingMylist: 'is-updatingMylist',
      isPlaylistEnable: 'is-playlistEnable',
      isCommentPosting: 'is-commentPosting',
      isRegularUser: 'is-regularUser',
      isWaybackMode: 'is-waybackMode',
      isNotPlayed: 'is-notPlayed',
      isYouTube: 'is-youTube'
    });
  }
  _onPlayerStateChange(changedState) {
    for (const key of changedState.keys()) {
      this._onPlayerStateUpdate(key, changedState.get(key));
    }
  }
  _onPlayerStateUpdate(key, value) {
    switch (key) {
      case 'thumbnail':
        return this._setThumbnail(value);
      case 'screenMode':
      case 'isOpen':
        if (this._state.isOpen) {
          this.show();
          this._onScreenModeChange();
        } else {
          this.hide();
        }
        return;
      case 'errorMessage':
        return this._$errorMessageContainer[0].textContent = value;
      case 'currentTab':
        return this.selectTab(value);
    }
    const table = this._getStateClassNameTable();
    const className = table.get(key);
    if (className) {
      this.toggleClass(className, !!value);
    }
  }
  _applyState() {
    const table = this._getStateClassNameTable();
    const state = this._state;
    for (const [key, className] of table) {
      this._classList.toggle(className, state[key]);
    }

    if (this._state.isOpen) {
      this._applyScreenMode();
    }
  }
  _getScreenModeClassNameTable() {
    return [
      'zenzaScreenMode_3D',
      'zenzaScreenMode_small',
      'zenzaScreenMode_sideView',
      'zenzaScreenMode_normal',
      'zenzaScreenMode_big',
      'zenzaScreenMode_wide'
    ];
  }
  _applyScreenMode(force = false) {
    const screenMode = `zenzaScreenMode_${this._state.screenMode}`;
    if (!force && this._lastScreenMode === screenMode) { return; }
    this._lastScreenMode = screenMode;
    const body = this._$body;
    const modes = this._getScreenModeClassNameTable();
    const isFull = util.fullscreen.now();
    Object.assign(document.body.dataset, {
      screenMode: this._state.screenMode,
      fullscreen: isFull ? 'yes' : 'no'
    });
    modes.forEach(m => body.toggleClass(m, m === screenMode && !isFull));
    this._updateScreenModeStyle();
  }
  _updateScreenModeStyle() {
    if (!this._state.isOpen) {
      util.StyleSwitcher.update({off: 'style.screenMode'});
      return;
    }
    if (Fullscreen.now()) {
      util.StyleSwitcher.update({
        on: 'style.screenMode.for-full, style.screenMode.for-screen-full',
        off: 'style.screenMode:not(.for-full):not(.for-screen-full), link[href*="watch.css"]'
      });
      return;
    }
    let on, off;
    switch (this._state.screenMode) {
      case '3D':
      case 'wide':
        on = 'style.screenMode.for-full, style.screenMode.for-window-full';
        off = 'style.screenMode:not(.for-full):not(.for-window-full), link[href*="watch.css"]';
        break;
      default:
      case 'normal':
      case 'big':
        on = 'style.screenMode.for-dialog, style.screenMode.for-big, style.screenMode.for-normal, link[href*="watch.css"]';
        off = 'style.screenMode:not(.for-dialog):not(.for-big):not(.for-normal)';
        break;
      case 'small':
      case 'sideView':
        on = 'style.screenMode.for-popup, style.screenMode.for-sideView, .style.screenMode.for-small, link[href*="watch.css"]';
        off = 'style.screenMode:not(.for-popup):not(.for-sideView):not(.for-small)';
        break;
    }
    util.StyleSwitcher.update({on, off});
  }
  show() {
    this._$dialog.addClass('is-open');
    if (!Fullscreen.now()) {
      document.body.classList.remove('fullscreen');
    }
    this._$body.addClass('showNicoVideoPlayerDialog');
    util.StyleSwitcher.update({on: 'style.zenza-open'});
    this._updateScreenModeStyle();
  }
  hide() {
    this._$dialog.removeClass('is-open');
    this._settingPanel.hide();
    this._$body.removeClass('showNicoVideoPlayerDialog');
    util.StyleSwitcher.update({off: 'style.zenza-open, style.screenMode', on: 'link[href*="watch.css"]'});
    this._clearClass();
  }
  _clearClass() {
    const modes = this._getScreenModeClassNameTable().join(' ');
    this._lastScreenMode = '';
    this._$body.removeClass(modes);
  }
  _setThumbnail(thumbnail) {
    if (thumbnail) {
      this.css('background-image', `url(${thumbnail})`);
    } else {
      // base hrefのせいで変なurlを参照してしまうので適当な黒画像にする
      this.css('background-image', `url(${CONSTANT.BLANK_PNG})`);
    }
  }
  focusToCommentInput() {
    // 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
    window.setTimeout(() => this._commentInput.focus(), 0);
  }
  toggleSettingPanel() {
    this._settingPanel.toggle();
  }
  get$Container() {
    return this._$playerContainer;
  }
  css(key, val) {
    this._$playerContainer.css(key, val);
  }
  addClass(name) {
    const cls = name.split(/\s+/).filter(cn => !this._classList.contains(cn));
    if (!cls.length) { return; }
    return this._classList.add(...cls);
  }
  removeClass(name) {
    const cls = name.split(/\s+/).filter(cn => this._classList.contains(cn));
    if (!cls.length) { return; }
    return this._classList.remove(...cls);
  }
  toggleClass(name, v) {
    if (typeof v === 'boolean') {
      return v ? this.addClass(name) : this.removeClass(name);
    }
    name.split(/\s+/).forEach(n => this._classList.toggle(n));
  }
  hasClass(name) {
    const container = this._$playerContainer[0];
    return container.classList.contains(name);
  }
  appendTab(name, title) {
    return this._videoInfoPanel.appendTab(name, title);
  }
  selectTab(name) {
    this._playerConfig.setValue('videoInfoPanelTab', name);
    this._videoInfoPanel.selectTab(name);
    global.emitter.emit('tabChange', name);
  }
  execCommand(command, param) {
    this.emit('command', command, param);
  }
  blinkTab(name) {
    this._videoInfoPanel.blinkTab(name);
  }
  clearPanel() {
    this._videoInfoPanel.clear();
  }
}

util.addStyle(`
  #zenzaVideoPlayerDialog {
    touch-action: manipulation; /* for Safari */
    touch-action: none;
  }
  #zenzaVideoPlayerDialog::before {
    display: none;
  }

  .zenzaPlayerContainer {
    left: 0 !important;
    top:  0 !important;
    width:  100vw !important;
    height: 100vh !important;
    contain: size layout;
  }

  .videoPlayer,
  .commentLayerFrame,
  .resizeObserver {
    top:  0 !important;
    left: 0 !important;
    width:  100vw !important;
    height: 100% !important;
    right:  0 !important;
    border: 0 !important;
    z-index: 100 !important;
    contain: layout style size paint;
    will-change: transform,opacity;
  }
  .resizeObserver {
    z-index: -1;
    opacity: 0;
    pointer-events: none;
  }

  .is-open .videoPlayer>* {
    cursor: none;
  }

  .showVideoControlBar {
    --padding-bottom: ${VideoControlBar.BASE_HEIGHT}px;
    --padding-bottom: var(--zenza-control-bar-height);
  }
  .zenzaStoryboardOpen .showVideoControlBar {
    --padding-bottom: calc(var(--zenza-control-bar-height) + 80px);
  }
  .zenzaStoryboardOpen.is-fullscreen .showVideoControlBar {
    --padding-bottom: calc(var(--zenza-control-bar-height) + 50px);
  }

  .showVideoControlBar .videoPlayer,
  .showVideoControlBar .commentLayerFrame,
  .showVideoControlBar .resizeObserver {
    height: calc(100% - var(--padding-bottom)) !important;
  }

  .showVideoControlBar .videoPlayer {
    z-index: 100 !important;
  }

  .showVideoControlBar .commentLayerFrame {
    z-index: 101 !important;
  }

  .is-showComment.is-backComment .videoPlayer
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

  body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
    transform: perspective(700px) rotateX(10deg);
    margin-top: -5%;
  }

  .zenzaPlayerContainer {
    left: 0;
    width: 100vw;
    height: 100vh;
    box-shadow: none;
  }

  .is-backComment .videoPlayer {
    left: 25%;
    top:  25%;
    width:  50%;
    height: 50%;
    z-index: 102;
  }

  body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
    transform: perspective(600px) rotateX(10deg);
    height: 100%;
  }

  body[data-screen-mode="3D"] .zenzaPlayerContainer .commentLayerFrame {
    transform: translateZ(0) perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
    opacity: 0.9;
    height: 100%;
    margin-left: 20%;
  }

`, {className: 'screenMode for-full', disabled: true});


util.addStyle(`
  body #zenzaVideoPlayerDialog {
    contain: style size;
  }

  #zenzaVideoPlayerDialog::before {
    display: none;
  }

  body.zenzaScreenMode_sideView {
    --sideView-left-margin: ${CONSTANT.SIDE_PLAYER_WIDTH + 24}px;
    --sideView-top-margin: 76px;
    margin-left: var(--sideView-left-margin);
    margin-top: var(--sideView-top-margin);

    width: auto;
  }

  body.zenzaScreenMode_sideView.nofix {
    --sideView-top-margin: 40px;
  }
  body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
    width: auto;
  }
  body.zenzaScreenMode_sideView:not(.nofix) #siteHeader #siteHeaderInner {
    width: auto;
  }

 .zenzaScreenMode_sideView .zenzaVideoPlayerDialog.is-open,
 .zenzaScreenMode_small .zenzaVideoPlayerDialog.is-open {
    display: block;
    top: 0; left: 0; right: 100%; bottom: 100%;
  }

  .zenzaScreenMode_sideView .zenzaPlayerContainer,
  .zenzaScreenMode_small .zenzaPlayerContainer {
    width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
    height: ${CONSTANT.SIDE_PLAYER_HEIGHT}px;
  }

  .is-open .zenzaVideoPlayerDialog {
    contain: layout style size;
  }

  .zenzaVideoPlayerDialogInner {
    top: 0;
    left: 0;
    transform: none;
  }


  @media screen and (min-width: 1432px)
  {
    body.zenzaScreenMode_sideView {
      --sideView-left-margin: calc(100vw - 1024px);
    }
    body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
      width: calc(100vw - (100vw - 1024px));
    }
    .zenzaScreenMode_sideView .zenzaPlayerContainer {
      width: calc(100vw - 1024px);
      height: calc((100vw - 1024px) * 9 / 16);
    }
  }
`, {className: 'screenMode for-popup', disabled: true});

util.addStyle(`
body.zenzaScreenMode_sideView,
body.zenzaScreenMode_small {
  border-bottom: 40px solid;
  margin-top: 0;
}
`, {className: 'domain slack-com', disabled: true});

util.addStyle(`

  .zenzaScreenMode_normal .zenzaPlayerContainer .videoPlayer {
    left: 2.38%;
    width: 95.23%;
  }
  .zenzaScreenMode_big .zenzaPlayerContainer {
    width: ${CONSTANT.BIG_PLAYER_WIDTH}px;
    height: ${CONSTANT.BIG_PLAYER_HEIGHT}px;
  }


`, {className: 'screenMode for-dialog', disabled: true});

util.addStyle(`
  .zenzaScreenMode_3D,
  .zenzaScreenMode_normal,
  .zenzaScreenMode_big,
  .zenzaScreenMode_wide
  {
    overflow-x: hidden !important;
    overflow-y: hidden !important;
    overflow: hidden !important;
  }

  /*
    プレイヤーが動いてる間、裏の余計な物のマウスイベントを無効化
    多少軽量化が期待できる？
  */
  body.zenzaScreenMode_big >*:not(.zen-family) *,
  body.zenzaScreenMode_normal >*:not(.zen-family) *,
  body.zenzaScreenMode_wide >*:not(.zen-family) *,
  body.zenzaScreenMode_3D >*:not(.zen-family) * {
    pointer-events: none;
    user-select: none;
    animation-play-state: paused !important;
    contain: style layout paint;
  }

  body.zenzaScreenMode_3D >:not(.zen-family),
  body.zenzaScreenMode_wide >:not(.zen-family),
  body.is-fullscreen >:not(.zen-family) {
    visibility: hidden;
    pointer-events: none;
    user-select: none;
  }

  body.zenzaScreenMode_big .ZenButton,
  body.zenzaScreenMode_normal .ZenButton,
  body.zenzaScreenMode_wide .ZenButton,
  body.zenzaScreenMode_3D  .ZenButton {
    display: none;
  }

  .ads, .banner, iframe[name^="ads"] {
    visibility: hidden !important;
    pointer-events: none;
  }

  .VideoThumbnailComment {
    display: none !important;
  }

  /* 大百科の奴 */
  #scrollUp {
    display: none !important;
  }

  .SeriesDetailContainer-backgroundInner {
    background-image: none !important;
    filter: none !important;
  }
  .Hidariue-image {
    visibility: hidden !important;
  }
`, {className: 'zenza-open', disabled: true});

NicoVideoPlayerDialogView.__css__ = `

  .zenzaVideoPlayerDialog {
    display: none;
    position: fixed;
    /*background: rgba(0, 0, 0, 0.8);*/
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: ${CONSTANT.BASE_Z_INDEX};
    font-size: 13px;
    text-align: left;
    box-sizing: border-box;
    contain: size style layout;
  }

  .zenzaVideoPlayerDialog::before {
    content: ' ';
    background: rgba(0, 0, 0, 0.8);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    will-change: transform;
  }

  .is-regularUser  .forPremium {
    display: none !important;
  }

  .forDmc {
    display: none;
  }

  .is-dmcPlaying .forDmc {
    display: inherit;
  }

  .zenzaVideoPlayerDialog * {
    box-sizing: border-box;
  }

  .zenzaVideoPlayerDialog.is-open {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .zenzaVideoPlayerDialog li {
    text-align: left;
  }

  .zenzaVideoPlayerDialogInner {
    background: #000;
    box-sizing: border-box;
    z-index: ${CONSTANT.BASE_Z_INDEX + 1};
    box-shadow: 4px 4px 4px #000;
  }

  .zenzaPlayerContainer {
    position: relative;
    background: #000;
    width: 672px;
    height: 384px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center center;
  }
  .zenzaPlayerContainer.is-loading {
    cursor: wait;
  }
  .zenzaPlayerContainer:not(.is-loading):not(.is-error) {
    background-image: none !important;
    background: #000 !important;
  }
  .zenzaPlayerContainer.is-loading .videoPlayer,
  .zenzaPlayerContainer.is-loading .commentLayerFrame,
  .zenzaPlayerContainer.is-error .videoPlayer,
  .zenzaPlayerContainer.is-error .commentLayerFrame {
    display: none;
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
    background: #000;
    will-change: transform, opacity;
    user-select: none;
  }

  .is-mouseMoving .videoPlayer>* {
    cursor: auto;
  }

  .is-loading .videoPlayer>* {
    cursor: wait;
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
    pointer-events: none;
    cursor: none;
    user-select: none;
    opacity: var(--zenza-comment-layer-opacity);
  }

  .zenzaPlayerContainer.is-backComment .commentLayerFrame {
    position: fixed;
    top:  0;
    left: 0;
    width:  100vw;
    height: calc(100vh - 40px);
    right: auto;
    bottom: auto;
    z-index: 1;
  }

  .is-showComment.is-backComment .videoPlayer {
    opacity: 0.90;
  }

  .is-showComment.is-backComment .videoPlayer:hover {
    opacity: 1;
  }

  .loadingMessageContainer {
    display: none;
    pointer-events: none;
  }
  .zenzaPlayerContainer.is-loading .loadingMessageContainer {
    display: inline-block;
    position: absolute;
    z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
    right: 8px;
    bottom: 8px;
    font-size: 24px;
    color: var(--base-fore-color);
    text-shadow: 0 0 8px #003;
    font-family: serif;
    letter-spacing: 2px;
  }

  @keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(-1800deg); }
  }

  .zenzaPlayerContainer.is-loading .loadingMessageContainer::before,
  .zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
    display: inline-block;
    text-align: center;
    content: '${'\\00272A'}';
    font-size: 18px;
    line-height: 24px;
    animation-name: spin;
    animation-iteration-count: infinite;
    animation-duration: 5s;
    animation-timing-function: linear;
  }
  .zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
    animation-direction: reverse;
  }

  .errorMessageContainer {
    display: none;
    pointer-events: none;
    user-select: none;
  }

  .zenzaPlayerContainer.is-error .errorMessageContainer {
    display: inline-block;
    position: absolute;
    z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
    top: 50%;
    left: 50%;
    padding: 8px 16px;
    transform: translate(-50%, -50%);
    background: rgba(255, 0, 0, 0.9);
    font-size: 24px;
    box-shadow: 8px 8px 4px rgba(128, 0, 0, 0.8);
    white-space: nowrap;
  }
  .errorMessageContainer:empty {
    display: none !important;
  }

  .popupMessageContainer {
    top: 50px;
    left: 50px;
    z-index: 25000;
    position: absolute;
    pointer-events: none;
    transform: translateZ(0);
    user-select: none;
  }


  @media screen {
    /* 右パネル分の幅がある時は右パネルを出す */
    @media (min-width: 992px) {
      .zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
        padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
        background: none;
      }
    }

    @media (min-width: 1216px) {
      .zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
        padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
        background: none;
      }
    }

    /* 縦長モニター */
    @media
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
        padding-bottom: 240px;
        background: none;
      }
    }

    @media
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
        padding-bottom: 240px;
        background: none;
      }
    }

    /* 960x540 */
    @media
      (min-width: 1328px) and (max-width: 1663px) and
      (min-height: 700px) and (min-height: 899px)
    {
      .zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(960px * 1.05);
        height: 540px;
      }
    }

    /* 1152x648 */
    @media
      (min-width: 1530px) and (min-height: 900px)
    {
      .zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1152px * 1.05);
        height: 648px;
      }
    }

    /* 1280x720 */
    @media
      (min-width: 1664px) and (min-height: 900px)
    {
      .zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1280px * 1.05);
        height: 720px;
      }
    }

    /* 1920x1080 */
    @media
      (min-width: 2336px) and (min-height: 1200px)
    {
      .zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(1920px * 1.05);
        height: 1080px;
      }
    }

    /* 2560x1440 */
    @media
      (min-width: 2976px) and (min-height: 1660px)
    {
      .zenzaScreenMode_big .zenzaPlayerContainer {
        width: calc(2560px * 1.05);
        height: 1440px;
      }
    }
  }

  `.trim();

NicoVideoPlayerDialogView.__tpl__ = (`
    <div id="zenzaVideoPlayerDialog" class="zenzaVideoPlayerDialog zen-family">
      <div class="zenzaVideoPlayerDialogInner">
        <div class="menuContainer"></div>
        <div class="zenzaPlayerContainer">

          <div class="popupMessageContainer"></div>
          <div class="errorMessageContainer"></div>
          <div class="loadingMessageContainer">動画読込中</div>
        </div>
      </div>
    </div>
  `).trim();
/**
 * TODO: 分割 まにあわなくなっても知らんぞー
 */
class NicoVideoPlayerDialog extends Emitter {
  constructor(params) {
    super();
    this.initialize(params);
  }
  initialize(params) {
    // this._offScreenLayer = params.offScreenLayer;
    this._playerConfig = params.config;
    this._state = params.state;

    this._keyEmitter = params.keyHandler || ShortcutKeyEmitter.create(
      params.config,
      document.body,
      global.emitter
    );

    this._initializeDom();

    this._keyEmitter.on('keyDown', this._onKeyDown.bind(this));
    this._keyEmitter.on('keyUp', this._onKeyUp.bind(this));

    this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
    this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));

    this._escBlockExpiredAt = -1;

    this._videoFilter = new VideoFilter(
      this._playerConfig.getValue('videoOwnerFilter'),
      this._playerConfig.getValue('videoTagFilter')
    );

    this._savePlaybackPosition =
      _.throttle(this._savePlaybackPosition.bind(this), 1000, {trailing: false});
  }
  async _initializeDom() {
    this._view = new NicoVideoPlayerDialogView({
      dialog: this,
      playerConfig: this._playerConfig,
      nicoVideoPlayer: this._nicoVideoPlayer,
      playerState: this._state,
      currentTimeGetter: () => this.currentTime
    });
    await this._view.promise('dom-ready');

    this._initializeCommentPanel();

    this._$playerContainer = this._view.get$Container();
    this._view.on('command', this._onCommand.bind(this));
    this._view.on('postChat', (e, chat, cmd) => {
      this.addChat(chat, cmd)
        .then(() => e.resolve())
        .catch(() => e.reject());
    });
  }
  _initializeNicoVideoPlayer() {
    if (this._nicoVideoPlayer) {
      return this._nicoVideoPlayer;
    }
    const config = this._playerConfig;
    const nicoVideoPlayer = this._nicoVideoPlayer = new NicoVideoPlayer({
      node: this._$playerContainer,
      playerConfig: config,
      playerState: this._state,
      volume: config.props.volume,
      loop: config.props.loop,
      enableFilter: config.props.enableFilter,
      wordFilter: config.props.wordFilter,
      wordRegFilter: config.props.wordRegFilter,
      wordRegFilterFlags: config.props.wordRegFilterFlags,
      commandFilter: config.props.commandFilter,
      userIdFilter: config.props.userIdFilter
    });

    this._messageApiLoader = new ThreadLoader();

    nicoVideoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
    nicoVideoPlayer.on('ended', this._onVideoEnded.bind(this));
    nicoVideoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
    nicoVideoPlayer.on('play', this._onVideoPlay.bind(this));
    nicoVideoPlayer.on('pause', this._onVideoPause.bind(this));
    nicoVideoPlayer.on('playing', this._onVideoPlaying.bind(this));
    nicoVideoPlayer.on('seeking', this._onVideoSeeking.bind(this));
    nicoVideoPlayer.on('seeked', this._onVideoSeeked.bind(this));
    nicoVideoPlayer.on('stalled', this._onVideoStalled.bind(this));
    nicoVideoPlayer.on('waiting', this._onVideoStalled.bind(this));
    nicoVideoPlayer.on('timeupdate', this._onVideoTimeUpdate.bind(this));
    nicoVideoPlayer.on('progress', this._onVideoProgress.bind(this));
    nicoVideoPlayer.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
    nicoVideoPlayer.on('commentParsed', this._onCommentParsed.bind(this));
    nicoVideoPlayer.on('commentChange', this._onCommentChange.bind(this));
    nicoVideoPlayer.on('commentFilterChange', this._onCommentFilterChange.bind(this));
    nicoVideoPlayer.on('videoPlayerTypeChange', this._onVideoPlayerTypeChange.bind(this));

    nicoVideoPlayer.on('error', this._onVideoError.bind(this));
    nicoVideoPlayer.on('abort', this._onVideoAbort.bind(this));

    nicoVideoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
    nicoVideoPlayer.on('volumeChange', _.debounce(this._onVolumeChangeEnd.bind(this), 1500));
    nicoVideoPlayer.on('command', this._onCommand.bind(this));

    return nicoVideoPlayer;
  }
  execCommand(command, param) {
    return this._onCommand(command, param);
  }
  _onCommand(command, param) {
    let v;
    switch (command) {
      case 'volume':
        this.volume = param;
        break;
      case 'volumeBy':
        this.volume = this._nicoVideoPlayer.volume * param;
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
      case 'fullscreen':
      case 'toggle-fullscreen':
        this._nicoVideoPlayer.toggleFullScreen();
        break;
      case 'deflistAdd':
        return this._onDeflistAdd(param);
      case 'deflistRemove':
        return this._onDeflistRemove(param);
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
      case 'playlistSetSeries':
        this._onPlaylistSetSeriesVideo(param);
      break;
      case 'playNextVideo':
        this.playNextVideo();
        break;
      case 'playPreviousVideo':
        this.playPreviousVideo();
        break;
      case 'shufflePlaylist':
          this._playlist.shuffle();
        break;
      case 'togglePlaylist':
          this._playlist.toggleEnable();
        break;
      case 'mylistAdd':
        return this._onMylistAdd(param.mylistId, param.mylistName);
      case 'mylistRemove':
        return this._onMylistRemove(param.mylistId, param.mylistName);
      case 'mylistWindow':
        util.openMylistWindow(this._videoInfo.watchId);
        break;
      case 'seek':
      case 'seekTo':
        this.currentTime=param * 1;
        break;
      case 'seekBy':
        this.currentTime=this.currentTime + param * 1;
        break;
      case 'seekPrevFrame':
      case 'seekNextFrame':
        this.execCommand('pause');
        this.execCommand('seekBy', command === 'seekNextFrame' ? 1/60 : -1/60);
        break;
      case 'seekRelativePercent': {
        let dur = this._videoInfo.duration;
        let mv = Math.abs(param.movePerX) > 10 ?
          (param.movePerX / 2) : (param.movePerX / 8);
        let pos = this.currentTime + (mv * dur / 100);
        this.currentTime=Math.min(Math.max(0, pos), dur);
        break;
      }
      case 'seekToResumePoint':
        this.currentTime=this._videoInfo.initialPlaybackTime;
        break;
      case 'addWordFilter':
        this._nicoVideoPlayer.filter.addWordFilter(param);
        break;
      case 'setWordRegFilter':
      case 'setWordRegFilterFlags':
        this._nicoVideoPlayer.filter.setWordRegFilter(param);
        break;
      case 'addUserIdFilter':
        this._nicoVideoPlayer.filter.addUserIdFilter(param);
        break;
      case 'addCommandFilter':
        this._nicoVideoPlayer.filter.addCommandFilter(param);
        break;
      case 'setWordFilterList':
        this._nicoVideoPlayer.filter.wordFilterList = param;
        break;
      case 'setUserIdFilterList':
        this._nicoVideoPlayer.filter.userIdFilterList = param;
        break;
      case 'setCommandFilterList':
        this._nicoVideoPlayer.filter.commandFilterList = param;
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
        this.reload({currentTime: this.currentTime});
        break;
      case 'openGinza':
        window.open('//www.nicovideo.jp/watch/' + this._watchId, 'watchGinza');
        break;
      case 'reloadComment':
        this.reloadComment(param);
        break;
      case 'playbackRate':
        this._playerConfig.setValue(command, param);
        break;
      case 'shiftUp': {
        v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
        if (v < 2) {
          v += 0.25;
        } else {
          v = Math.min(10, v + 0.5);
        }
        this._playerConfig.setValue('playbackRate', v);
      }
        break;
      case 'shiftDown': {
        v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
        if (v > 2) {
          v -= 0.5;
        } else {
          v = Math.max(0.1, v - 0.25);
        }
        this._playerConfig.setValue('playbackRate', v);
      }
        break;
      case 'screenShot':
        if (this._state.isYouTube) {
          util.capTube({
            title: this._videoInfo.title,
            videoId: this._videoInfo.videoId,
            author: this._videoInfo.owner.name
          });
          return;
        }
        this._nicoVideoPlayer.getScreenShot();
        break;
      case 'screenShotWithComment':
        if (this._state.isYouTube) {
          return;
        }
        this._nicoVideoPlayer.getScreenShotWithComment();
        break;
      case 'nextVideo':
        this._nextVideo = param;
        break;
      case 'nicosSeek':
        this._onNicosSeek(param);
        break;
      case 'fastSeek':
        this._nicoVideoPlayer.fastSeek(param);
        break;
      case 'setVideo':
        this.setVideo(param);
        break;
      case 'selectTab':
        this._state.currentTab = param;
        break;
      case 'update-smileVideoQuality':
        this._playerConfig.setValue('videoServerType', 'smile');
        this._playerConfig.setValue('smileVideoQuality', param);
        this.reload({videoServerType: 'smile', economy: param === 'eco'});
        break;
      case 'update-dmcVideoQuality':
        this._playerConfig.setValue('videoServerType', 'dmc');
        this._playerConfig.setValue('dmcVideoQuality', param);
        this.reload({videoServerType: 'dmc'});
        break;
      case 'update-videoServerType':
        this._playerConfig.setValue('videoServerType', param);
        this.reload({videoServerType: param === 'dmc' ? 'dmc' : 'smile'});
        break;
      case 'update-commentLanguage':
        command = command.replace(/^update-/, '');
        if (this._playerConfig.getValue(command) === param) {
          break;
        }
        this._playerConfig.setValue(command, param);
        this.reloadComment(param);
        break;
      case 'saveMymemory':
        util.saveMymemory(this, this._state.videoInfo);
        break;
      default:
        this.emit('command', command, param);
    }
  }
  _onKeyDown(name, e, param) {
    this._onKeyEvent(name, e, param);
  }
  _onKeyUp(name, e, param) {
    this._onKeyEvent(name, e, param);
  }
  _onKeyEvent(name, e, param) {
    if (!this._state.isOpen) {
      let lastWatchId = this._playerConfig.getValue('lastWatchId');
      if (name === 'RE_OPEN' && lastWatchId) {
        this.open(lastWatchId);
        e.preventDefault();
      }
      return;
    }
    const TABLE = {
      'RE_OPEN': 'reload',
      'PAUSE': 'pause',
      'TOGGLE_PLAY': 'togglePlay',
      'SPACE': 'togglePlay',
      'FULL': 'toggle-fullscreen',
      'TOGGLE_PLAYLIST': 'togglePlaylist',
      'DEFLIST': 'deflistAdd',
      'DEFLIST_REMOVE': 'deflistRemove',
      'VIEW_COMMENT': 'toggle-showComment',
      'TOGGLE_LOOP': 'toggle-loop',
      'MUTE': 'toggle-mute',
      'VOL_UP': 'volumeUp',
      'VOL_DOWN': 'volumeDown',
      'SEEK_TO': 'seekTo',
      'SEEK_BY': 'seekBy',
      'SEEK_PREV_FRAME': 'seekPrevFrame',
      'SEEK_NEXT_FRAME': 'seekNextFrame',
      'NEXT_VIDEO': 'playNextVideo',
      'PREV_VIDEO': 'playPreviousVideo',
      'PLAYBACK_RATE': 'playbackRate',
      'SHIFT_UP': 'shiftUp',
      'SHIFT_DOWN': 'shiftDown',
      'SCREEN_MODE': 'screenMode',
      'SCREEN_SHOT': 'screenShot',
      'SCREEN_SHOT_WITH_COMMENT': 'screenShotWithComment'
    };
    switch (name) {
      case 'ESC':
        // ESCキーは連打にならないようブロック期間を設ける
        if (Date.now() < this._escBlockExpiredAt) {
          window.console.log('block ESC');
          break;
        }
        this._escBlockExpiredAt = Date.now() + 1000 * 2;
        if (!Fullscreen.now()) {
          this.close();
        }
        break;
      case 'INPUT_COMMENT':
        this._view.focusToCommentInput();
        break;
      default:
        if (!TABLE[name]) { return; }
        this.execCommand(TABLE[name], param);
    }
    let screenMode = this._playerConfig.getValue('screenMode');
    if (['small', 'sideView'].includes(screenMode) && ['TOGGLE_PLAY'].includes(name)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  }
  _onPlayerConfigUpdate(key, value) {
    if (!this._nicoVideoPlayer) { return; }
    switch (key) {
      case 'enableFilter':
        this._nicoVideoPlayer.filter.isEnable = value;
        break;
      case 'wordFilter':
        this._nicoVideoPlayer.filter.wordFilterList = value;
        break;
      case 'userIdFilter':
        this._nicoVideoPlayer.filter.userIdFilterList = value;
        break;
      case 'commandFilter':
        this._nicoVideoPlayer.filter.commandFilterList = value;
        break;
    }
  }
  _updateScreenMode(mode) {
    this.emit('screenModeChange', mode);
  }
  _onPlaylistAppend(watchId) {
    this._initializePlaylist();
    this._playlist.append(watchId);
  }
  _onPlaylistInsert(watchId) {
    this._initializePlaylist();
    this._playlist.insert(watchId);
  }
  _onPlaylistSetMylist(mylistId, option) {
    this._initializePlaylist();

    option = Object.assign({watchId: this._watchId}, option || {});
    // デフォルトで古い順にする
    option.sort = isNaN(option.sort) ? 7 : option.sort;
    // 通常時はプレイリストの置き換え、
    // 連続再生中はプレイリストに追加で読み込む
    option.insert = this._playlist.isEnable;

    let query = this._videoWatchOptions.query;
    option.shuffle = parseInt(query.shuffle, 10) === 1;

    this._playlist.loadFromMylist(mylistId, option).then(result => {
        this.execCommand('notify', result.message);
        this._state.currentTab = 'playlist';
        this._playlist.insertCurrentVideo(this._videoInfo);
      },
      () => this.execCommand('alert', 'マイリストのロード失敗'));
  }
  _onPlaylistSetUploadedVideo(userId, option) {
    this._initializePlaylist();
    option = Object.assign({watchId: this._watchId}, option || {});
    // 通常時はプレイリストの置き換え、
    // 連続再生中はプレイリストに追加で読み込む
    option.insert = this._playlist.isEnable;

    this._playlist.loadUploadedVideo(userId, option).then(result => {
        this.execCommand('notify', result.message);
        this._state.currentTab = 'playlist';
        this._playlist.insertCurrentVideo(this._videoInfo);
      },
      err => this.execCommand('alert', err.message || '投稿動画一覧のロード失敗'));
  }
  _onPlaylistSetSearchVideo(params) {
    this._initializePlaylist();

    let option = Object.assign({watchId: this._watchId}, params.option || {});
    let word = params.word;
    // 通常時はプレイリストの置き換え、
    // 連続再生中はプレイリストに追加で読み込む
    option.insert = this._playlist.isEnable;

    if (option.owner) {
      let ownerId = parseInt(this._videoInfo.owner.id, 10);
      if (this._videoInfo.isChannel) {
        option.channelId = ownerId;
      } else {
        option.userId = ownerId;
      }
    }
    delete option.owner;

    let query = this._videoWatchOptions.query;
    option = Object.assign(option, query);

    this._state.currentTab = 'playlist';
    this._playlist.loadSearchVideo(word, option).then(result => {
        this.execCommand('notify', result.message);
        this._playlist.insertCurrentVideo(this._videoInfo);
        global.emitter.emitAsync('searchVideo', {word, option});
        window.setTimeout(() => this._playlist.scrollToActiveItem(), 1000);
      },
      err => {
        this.execCommand('alert', err.message || '検索失敗または該当無し: 「' + word + '」');
      });
  }
  _onPlaylistSetSeriesVideo(id, option = {}) {
    this._initializePlaylist();

    option = Object.assign({watchId: this._watchId}, option || {});
    option.insert = this._playlist.isEnable;
    this._state.currentTab = 'playlist';
    this._playlist.loadSeriesList(id, option).then(result => {
      this.execCommand('notify', result.message);
      this._playlist.insertCurrentVideo(this._videoInfo);
      window.setTimeout(() => this._playlist.scrollToActiveItem(), 1000);
    },
    err => this.execCommand('alert', err.message || `シリーズリストの取得に失敗: series/${id}`));
  }
  _onPlaylistStatusUpdate() {
    let playlist = this._playlist;
    this._playerConfig.setValue('playlistLoop', playlist.isLoop);
    this._state.isPlaylistEnable = playlist.isEnable;
    if (playlist.isEnable) {
      this._playerConfig.setValue('loop', false);
    }
    this._view.blinkTab('playlist');
  }
  _onCommentPanelStatusUpdate() {
    let commentPanel = this._commentPanel;
    this._playerConfig.setValue(
      'enableCommentPanelAutoScroll', commentPanel.isAutoScroll());
  }
  _onDeflistAdd(watchId) {
    if (this._state.isUpdatingDeflist || !util.isLogin()) {
      return;
    }
    const unlock = () => this._state.isUpdatingDeflist = false;
    this._state.isUpdatingDeflist = true;
    let timer = window.setTimeout(unlock, 10000);

    watchId = watchId || this._videoInfo.watchId;
    let description;
    if (!this._mylistApiLoader) {
      this._mylistApiLoader = MylistApiLoader;
    }
    const {enableAutoMylistComment} = this._playerConfig.props;
    (() => {
      if (watchId === this._watchId || !enableAutoMylistComment) {
        return Promise.resolve(this._videoInfo);
      }
      return ThumbInfoLoader.load(watchId);
    })().then(info => {
      const originalVideoId = info.originalVideoId ?
        `元動画: ${info.originalVideoId}` : '';
      description = enableAutoMylistComment ?
          `投稿者: ${info.owner.name} ${info.owner.linkId} ${originalVideoId}` : '';
    }).then(() => this._mylistApiLoader.addDeflistItem(watchId, description))
      .then(result => this.execCommand('notify', result.message))
      .catch(err => this.execCommand('alert', err.message ? err.message : 'とりあえずマイリストに登録失敗'))
      .then(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 2000);
    });
  }
  _onDeflistRemove(watchId) {
    if (this._state.isUpdatingDeflist || !util.isLogin()) {
      return;
    }
    const unlock = () => this._state.isUpdatingDeflist = false;
    this._state.isUpdatingDeflist = true;
    let timer = window.setTimeout(unlock, 10000);

    watchId = watchId || this._videoInfo.watchId;
    if (!this._mylistApiLoader) {
      this._mylistApiLoader = MylistApiLoader;
    }

    this._mylistApiLoader.removeDeflistItem(watchId)
      .then(result => this.execCommand('notify', result.message))
      .catch(err => this.execCommand('alert', err.message))
      .then(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
      });
  }
  _onMylistAdd(groupId, mylistName) {
    if (this._state.isUpdatingMylist || !util.isLogin()) {
      return;
    }

    const unlock = () => this._state.isUpdatingMylist = false;

    this._state.isUpdatingMylist = true;
    let timer = window.setTimeout(unlock, 10000);

    const owner = this._videoInfo.owner;
    const originalVideoId = this._videoInfo.originalVideoId ?
      `元動画: ${this._videoInfo.originalVideoId}` : '';
    const watchId = this._videoInfo.watchId;
    const description =
      this._playerConfig.getValue('enableAutoMylistComment') ?
        `投稿者: ${owner.name} ${owner.linkId} ${originalVideoId}` : '';
    if (!this._mylistApiLoader) {
      this._mylistApiLoader = MylistApiLoader;
    }

    this._mylistApiLoader.addMylistItem(watchId, groupId, description)
      .then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
      .catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
      .then(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
      });
  }
  _onMylistRemove(groupId, mylistName) {
    if (this._state.isUpdatingMylist || !util.isLogin()) {
      return;
    }

    const unlock = () => this._state.isUpdatingMylist = false;

    this._state.isUpdatingMylist = true;
    let timer = window.setTimeout(unlock, 10000);

    let watchId = this._videoInfo.watchId;

    if (!this._mylistApiLoader) {
      this._mylistApiLoader = MylistApiLoader;
    }

    this._mylistApiLoader.removeMylistItem(watchId, groupId)
      .then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
      .catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
      .then(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
      });
  }
  _onCommentParsed() {
    const lang = this._playerConfig.getValue('commentLanguage');
    this.emit('commentParsed', lang, this._threadInfo);
    global.emitter.emit('commentParsed');
  }
  _onCommentChange() {
    const lang = this._playerConfig.getValue('commentLanguage');
    this.emit('commentChange', lang, this._threadInfo);
    global.emitter.emit('commentChange');
  }
  _onCommentFilterChange(filter) {
    let config = this._playerConfig;
    config.setValue('enableFilter', filter.isEnable);
    config.setValue('wordFilter', filter.wordFilterList);
    config.setValue('userIdFilter', filter.userIdFilterList);
    config.setValue('commandFilter', filter.commandFilterList);
    this.emit('commentFilterChange', filter);
  }
  _onVideoPlayerTypeChange(type = '') {
    switch (type.toLowerCase()) {
      case 'youtube':
        this._state.setState({isYouTube: true});
        break;
      default:
        this._state.setState({isYouTube: false});
    }
  }
  _onNicosSeek(time) {
    const ct = this.currentTime;
    window.console.info('nicosSeek!', time);
    if (this.isPlaylistEnable) {
      // 連続再生中は後方へのシークのみ有効にする
      if (ct < time) {
        this.execCommand('fastSeek', time);
      }
    } else {
      this.execCommand('fastSeek', time);
    }
  }
  show() {
    this._state.isOpen = true;
  }
  hide() {
    this._state.isOpen = false;
  }
  open(watchId, options) {
    if (!watchId) {
      return;
    }
    // 連打対策
    if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) {
      return;
    }

    this.refreshLastPlayerId();
    this._requestId = 'play-' + Math.random();
    this._videoWatchOptions = options = new VideoWatchOptions(watchId, options, this._playerConfig);

    if (!options.isPlaylistStartRequest &&
      this.isPlaying && this.isPlaylistEnable && !options.isOpenNow) {
      this._onPlaylistInsert(watchId);
      return;
    }

    window.console.log('%copen video: ', 'color: blue;', watchId);
    window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);

    let nicoVideoPlayer = this._nicoVideoPlayer;
    if (!nicoVideoPlayer) {
      nicoVideoPlayer = this._initializeNicoVideoPlayer();
    } else {
      if (this._videoInfo) {
        this._savePlaybackPosition(this._videoInfo.contextWatchId, this.currentTime);
      }
      nicoVideoPlayer.close();
      this._view.clearPanel();
      this.emit('beforeVideoOpen');
      if (this._videoSession) {
        this._videoSession.close();
      }
    }

    this._state.resetVideoLoadingStatus();

    // watchIdからサムネイルを逆算できる時は最速でセットする
    const thumbnail = util.getThumbnailUrlByVideoId(watchId);
    this._state.thumbnail = thumbnail;

    this._state.isCommentReady = false;
    this._watchId = watchId;
    this._lastCurrentTime = 0;
    this._lastOpenAt = Date.now();
    this._state.isError = false;

    VideoInfoLoader.load(watchId, options.videoLoadOptions).then(
      this._onVideoInfoLoaderLoad.bind(this, this._requestId)).catch(
      this._onVideoInfoLoaderFail.bind(this, this._requestId)
    );

    this.show();
    if (this._playerConfig.getValue('autoFullScreen') && !util.fullscreen.now()) {
      nicoVideoPlayer.requestFullScreen();
    }
    this.emit('open', watchId, options);
    global.emitter.emitAsync('DialogPlayerOpen', watchId, options);
  }
  get isOpen() {
    return this._state.isOpen;
  }
  reload(options) {
    options = this._videoWatchOptions.createForReload(options);

    if (this._lastCurrentTime > 0) {
      options.currentTime = this._lastCurrentTime;
    }
    this.open(this._watchId, options);
  }
  get currentTime() {
    if (!this._nicoVideoPlayer) {
      return 0;
    }
    let ct = this._nicoVideoPlayer.currentTime * 1;
    if (!this._state.isError && ct > 0) {
      this._lastCurrentTime = ct;
    }
    return this._lastCurrentTime;
  }
  set currentTime(sec) {
    if (!this._nicoVideoPlayer) {
      return;
    }
    sec = Math.max(0, sec);
    this._nicoVideoPlayer.currentTime=sec;
    this._lastCurrentTime = sec;
  }
  get id() { return this._id;}
  get isLastOpenedPlayer() {
    return this.getId() === this._playerConfig.getValue('lastPlayerId', true);
  }
  refreshLastPlayerId() {
    if (this.isLastOpenedPlayer) {
      return;
    }
    this._playerConfig.setValue('lastPlayerId', '');
    this._playerConfig.setValue('lastPlayerId', this.getId());
  }
  async _onVideoInfoLoaderLoad(requestId, videoInfoData) {
    console.log('VideoInfoLoader.load!', requestId, this._watchId, videoInfoData);
    if (this._requestId !== requestId) {
      return;
    }
    const videoInfo = this._videoInfo = new VideoInfoModel(videoInfoData);
    this._watchId = videoInfo.watchId;
    WatchInfoCacheDb.put(this._watchId, {videoInfo});
    let serverType = 'dmc';
    if (!videoInfo.isDmcAvailable) {
      serverType = 'smile';
    } else if (videoInfo.isDmcOnly) {
      serverType = 'dmc';
    } else if (['dmc', 'smile'].includes(this._videoWatchOptions.videoServerType)) {
      serverType = this._videoWatchOptions.videoServerType;
    } else if (this._playerConfig.getValue('videoServerType') === 'smile') {
      serverType = 'smile';
    } else {
      const disableDmc =
        this._playerConfig.getValue('autoDisableDmc') &&
        this._videoWatchOptions.videoServerType !== 'smile' &&
        videoInfo.maybeBetterQualityServerType === 'smile';
      serverType = disableDmc ? 'smile' : 'dmc';
    }

    this._state.setState({
      isDmcAvailable: videoInfo.isDmcAvailable,
      isCommunity: videoInfo.isCommunityVideo,
      isMymemory: videoInfo.isMymemory,
      isChannel: videoInfo.isChannel
    });

    const isHLSRequired = videoInfo.dmcInfo && videoInfo.dmcInfo.isHLSRequired;
    const isHLSSupported = !!global.debug.isHLSSupported ||
    document.createElement('video').canPlayType('application/x-mpegURL') !== '';
    const useHLS = isHLSSupported && (isHLSRequired || !this._playerConfig.getValue('video.hls.enableOnlyRequired'));
//    this._videoSession = VideoSession.createInstance({
      this._videoSession = await VideoSessionWorker.create({
      videoInfo,
      videoQuality: this._playerConfig.getValue('dmcVideoQuality'),
      serverType,
      isPlayingCallback: () => this.isPlaying,
      useWellKnownPort: this._playerConfig.getValue('useWellKnownPort'),
      useHLS
    });

    if (this._videoFilter.isNgVideo(videoInfo)) {
      return this._onVideoFilterMatch();
    }

    if (this._videoSession.isDmc) {
      NVWatchCaller.call(videoInfo.dmcInfo.trackingId)
        .then(() => this._videoSession.connect())
        .then(sessionInfo => {
          this.setVideo(sessionInfo.url);
          videoInfo.setCurrentVideo(sessionInfo.url);
          this.emit('videoServerType', 'dmc', sessionInfo, videoInfo);
        })
        .catch(this._onVideoSessionFail.bind(this));
    } else {
      if (this._playerConfig.getValue('enableVideoSession')) {
        this._videoSession.connect();
      }
      videoInfo.setCurrentVideo(videoInfo.videoUrl);
      this.setVideo(videoInfo.videoUrl);
      this.emit('videoServerType', 'smile', {}, videoInfo);
    }
    this._state.videoInfo = videoInfo;
    this._state.isDmcPlaying = this._videoSession.isDmc;

    this.loadComment(videoInfo.msgInfo);

    this.emit('loadVideoInfo', videoInfo);

    if (Fullscreen.now() || this._playerConfig.getValue('screenMode') === 'wide') {
      this.execCommand('notifyHtml',
        '<img src="' + videoInfo.thumbnail + '" style="width: 96px;">' +
        util.escapeToZenkaku(videoInfo.title)
      );
    }
  }
  setVideo(url) {
    this._state.setState({
      isYouTube: url.indexOf('youtube') >= 0,
      currentSrc: url
    });
  }
  loadComment(msgInfo) {
    msgInfo.language = this._playerConfig.getValue('commentLanguage');
    this._messageApiLoader.load(msgInfo).then(
      this._onCommentLoadSuccess.bind(this, this._requestId),
      this._onCommentLoadFail.bind(this, this._requestId)
    );
  }
  reloadComment(param = {}) {
    const msgInfo = this._videoInfo.msgInfo;
    if (typeof param.when === 'number') {
      msgInfo.when = param.when;
    }
    this.loadComment(msgInfo);
  }
  _onVideoInfoLoaderFail(requestId, e) {
    const watchId = e.watchId;
    window.console.error('_onVideoInfoLoaderFail', watchId, e);
    if (this._requestId !== requestId) {
      return;
    }
    this._setErrorMessage(e.message || '通信エラー', watchId);
    this._state.isError = true;
    if (e.info) {
      this._videoInfo = new VideoInfoModel(e.info);
      this._state.videoInfo = this._videoInfo;
      this.emit('loadVideoInfoFail', this._videoInfo);
    } else {
      this.emit('loadVideoInfoFail');
    }
    global.emitter.emitAsync('loadVideoInfoFail', e);

    if (!this.isPlaylistEnable) {
      return;
    }
    if (e.reason === 'forbidden' || e.info.isPlayable === false) {
      window.setTimeout(() => this.playNextVideo(), 3000);
    }
  }
  _onVideoSessionFail(result) {
    window.console.error('dmc fail', result);
    this._setErrorMessage(
      `動画の読み込みに失敗しました(dmc.nico) ${result && result.message || ''}`, this._watchId);
    this._state.setState({isError: true, isLoading: false});
    if (this.isPlaylistEnable) {
      window.setTimeout(() => this.playNextVideo(), 3000);
    }
  }
  _onVideoPlayStartFail(err) {
    window.console.error('動画再生開始に失敗', err);
    if (!(err instanceof DOMException)) { //
      return;
    }

    console.warn('play() request was rejected code: %s. message: %s', err.code, err.message);
    const message = err.message;
    switch (message) {
      case 'SessionClosedError':
        // TODO: DMCのセッション切れなら自動リロード
        // if (this._videoSession.isDeleted && !this._videoSession.isAbnormallyClosed) {
        //   window.console.info('%cリロードしたら直るかも', 'background: yellow');
        //
        // }
        if (this._playserState.isError) { break; }
        this._setErrorMessage('動画の再生開始に失敗しました', this._watchId);
        this._state.setVideoErrorOccurred();
        break;

      case 'AbortError': // 再生開始を待っている間に動画変更などで中断された等
      case 'NotAllowedError': // 自動再生のブロック
      default:
        break;
    }

    this.emit('loadVideoPlayStartFail');
    global.emitter.emitAsync('loadVideoPlayStartFail');
  }
  _onVideoFilterMatch() {
    window.console.error('ng video', this._watchId);
    this._setErrorMessage('再生除外対象の動画または投稿者です');
    this._state.isError = true;
    this.emit('error');
    if (this.isPlaylistEnable) {
      window.setTimeout(() => this.playNextVideo(), 3000);
    }
  }
  _setErrorMessage(msg) {
    this._state.errorMessage = msg;
  }
  _onCommentLoadSuccess(requestId, result) {
    if (requestId !== this._requestId) {
      return;
    }
    let options = {
      replacement: this._videoInfo.replacementWords,
      duration: this._videoInfo.duration,
      mainThreadId: result.threadInfo.threadId,
      format: result.format
    };
    this._nicoVideoPlayer.closeCommentPlayer();
    this._threadInfo = result.threadInfo;
    this._nicoVideoPlayer.setComment(result.body, options);

    WatchInfoCacheDb.put(this._watchId, {threadInfo: result.threadInfo});
    this._state.isCommentReady = true;
    this._state.isWaybackMode = result.threadInfo.isWaybackMode;
    this.emit('commentReady', result, this._threadInfo);
    this.emit('videoCount', {comment: result.threadInfo.totalResCount});
  }
  _onCommentLoadFail(requestId, e) {
    if (requestId !== this._requestId) {
      return;
    }
    this.execCommand('alert', e.message);
  }
  _onLoadedMetaData() {
    // YouTubeは動画指定時にパラメータで開始位置を渡すので不要
    if (this._state.isYouTube) {
      return;
    }

    // パラメータで開始秒数が指定されていたらそこにシーク
    let currentTime = this._videoWatchOptions.currentTime;
    if (currentTime > 0) {
      this.currentTime=currentTime;
    }
  }
  _onVideoCanPlay() {
    if (!this._state.isLoading) {
      return;
    }
    window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
    this._playerConfig.setValue('lastWatchId', this._watchId);
    WatchInfoCacheDb.put(this._watchId, {watchCount: 1});

    if (this._videoWatchOptions.isPlaylistStartRequest) {
      this._initializePlaylist();

      let option = this._videoWatchOptions.mylistLoadOptions;
      let query = this._videoWatchOptions.query;

      // 通常時はプレイリストの置き換え、
      // 連続再生中はプレイリストに追加で読み込む
      option.append = this.isPlaying && this._playlist.isEnable;

      // //www.nicovideo.jp/watch/sm20353707 // プレイリスト開幕用動画
      option.shuffle = parseInt(query.shuffle, 10) === 1;
      console.log('playlist option:', option);

      if (query.playlist_type === 'mylist') {
        this._playlist.loadFromMylist(option.group_id, option);
      } else if (query.playlist_type === 'deflist') {
        this._playlist.loadFromMylist('deflist', option);
      } else if (query.playlist_type === 'tag' || query.playlist_type === 'search') {
        let word = query.tag || query.keyword;
        option.searchType = query.tag ? 'tag' : '';
        option = Object.assign(option, query);
        this._playlist.loadSearchVideo(word, option, this._playerConfig.getValue('search.limit'));
      }
      this._playlist.toggleEnable(true);
    } else if (PlaylistSession.isExist() && !this._playlist) {
      this._initializePlaylist();
      this._playlist.restoreFromSession();
    } else {
      this._initializePlaylist();
    }
    // チャンネル動画は、1本の動画がwatchId表記とvideoId表記で2本登録されてしまう。
    // そこでwatchId表記のほうを除去する
    this._playlist.insertCurrentVideo(this._videoInfo);
    if (this._videoInfo.watchId !== this._videoInfo.videoId &&
      this._videoInfo.videoId.indexOf('so') === 0) {
      this._playlist.removeItemByWatchId(this._videoInfo.watchId);
    }

    this._state.setVideoCanPlay();
    this.emitAsync('canPlay', this._watchId, this._videoInfo, this._videoWatchOptions);

    // プレイリストによって開かれた時は、自動再生設定に関係なく再生する
    if (this._videoWatchOptions.eventType === 'playlist' && this.isOpen) {
      this.play();
    }
    if (this._nextVideo) {
      const nextVideo = this._nextVideo;
      this._nextVideo = null;
      if (!this._playlist) {
        return;
      }
      if (!this._playerConfig.getValue('enableNicosJumpVideo')) {
        return;
      }
      const nv = this._playlist.findByWatchId(nextVideo);
      if (nv && nv.isPlayed()) {
        return;
      } // 既にリストにあって再生済みなら追加しない(無限ループ対策)
      this.execCommand('notify', '@ジャンプ: ' + nextVideo);
      this.execCommand('playlistInsert', nextVideo);
    }

  }
  _onVideoPlay() {
    this._state.setPlaying();
    this.emit('play');
  }
  _onVideoPlaying() {
    this._state.setPlaying();
    this.emit('playing');
  }
  _onVideoSeeking() {
    this._state.isSeeking = true;
    this.emit('seeking');
  }
  _onVideoSeeked() {
    this._state.isSeeking = false;
    this.emit('seeked');
  }
  _onVideoPause() {
    this._savePlaybackPosition(this._videoInfo.contextWatchId, this.currentTime);
    this.emit('pause');
  }
  _onVideoStalled() {
    this._state.isStalled = true;
    this.emit('stalled');
  }
  _onVideoTimeUpdate() {
    this._state.isStalled = false;
  }
  _onVideoProgress(range, currentTime) {
    this.emit('progress', range, currentTime);
  }
  async _onVideoError(e) {
    this._state.setVideoErrorOccurred();
    if (e.type === 'youtube') {
      return this._onYouTubeVideoError(e);
    }
    if (!this._videoInfo) {
      this._setErrorMessage('動画の再生に失敗しました。');
      return;
    }

    const retry = params => {
      setTimeout(() => {
        if (!this.isOpen) {
          return;
        }
        this.reload(params);
      }, 3000);
    };

    const sessionState = await this._videoSession.getState();
    const {isDmc, isDeleted, isAbnormallyClosed} = sessionState;
    const videoWatchOptions = this._videoWatchOptions;
    const code = (e && e.target && e.target.error && e.target.error.code) || 0;
    window.console.error('VideoError!', code, e, (e.target && e.target.error), {isDeleted, isAbnormallyClosed});

    if (this._state.isPausing && isDeleted) {
      this._setErrorMessage(`停止中に動画のセッションが切断されました。(code:${code})`);
    } else if (Date.now() - this._lastOpenAt > 3 * 60 * 1000 && isDeleted && !isAbnormallyClosed) {

      if (videoWatchOptions.reloadCount < 5) {
        retry();
      } else {
        this._setErrorMessage('動画のセッションが切断されました。');
      }
    } else if (!isDmc && this._videoInfo.isDmcAvailable) {
      this._setErrorMessage('SMILE動画の再生に失敗しました。DMC動画に接続します。');
      retry({economy: false, videoServerType: 'dmc'});
    } else if (!isDmc && (!this._videoWatchOptions.isEconomySelected && !this._videoInfo.isEconomy)) {
      this._setErrorMessage('動画の再生に失敗しました。エコノミー動画に接続します。');
      retry({economy: true, videoServerType: 'smile'});
    } else {
      this._setErrorMessage('動画の再生に失敗しました。');
    }

    this.emit('error', e, code);
  }
  _onYouTubeVideoError(e) {
    window.console.error('onYouTubeVideoError!', e);
    this._setErrorMessage(e.description);
    this.emit('error', e);
    if (e.fallback) {
      setTimeout(() => this.reload({isAutoZenTubeDisabled: true}), 3000);
    }
  }
  _onVideoAbort() {
    this.emit('abort');
  }
  _onVideoAspectRatioFix(ratio) {
    this.emit('aspectRatioFix', ratio);
  }
  _onVideoEnded() {
    // ループ再生中は飛んでこない
    this.emitAsync('ended');
    this._state.setVideoEnded();
    this._savePlaybackPosition(this._videoInfo.contextWatchId, 0);
    if (this.isPlaylistEnable && this._playlist.hasNext) {
      this.playNextVideo({eventType: 'playlist'});
      return;
    } else if (this._playlist) {
      this._playlist.toggleEnable(false);
    }

    let isAutoCloseFullScreen =
      this._videoWatchOptions.hasKey('autoCloseFullScreen') ?
        this._videoWatchOptions.isAutoCloseFullScreen :
        this._playerConfig.getValue('autoCloseFullScreen');
    if (Fullscreen.now() && isAutoCloseFullScreen) {
      Fullscreen.cancel();
    }
    global.emitter.emitAsync('videoEnded');
  }
  _onVolumeChange(vol, mute) {
    this.emit('volumeChange', vol, mute);
  }
  _onVolumeChangeEnd(vol, mute) {
    this.emit('volumeChangeEnd', vol, mute);
  }
  _savePlaybackPosition(contextWatchId, ct) {
    if (!util.isLogin()) {
      return;
    }
    const vi = this._videoInfo;
    if (!vi) {
      return;
    }
    const dr = this.getDuration();
    console.info('%csave PlaybackPosition:', 'background: cyan', ct, dr, vi.csrfToken);
    if (vi.contextWatchId !== contextWatchId) {
      return;
    }
    if (Math.abs(ct - dr) < 3) {
      return;
    }
    if (dr < 120) {
      return;
    } // 短い動画は記録しない
    PlaybackPosition.record(
      contextWatchId,
      ct,
      vi.csrfToken
    ).catch(e => {
      window.console.warn('save playback fail', e);
    });
  }
  close() {
    if (this.isPlaying) {
      this._savePlaybackPosition(this._watchId, this.currentTime);
    }
    WatchInfoCacheDb.put(this._watchId, {currentTime: this.currentTime});
    if (Fullscreen.now()) {
      Fullscreen.cancel();
    }
    this.pause();
    this.hide();
    this._refresh();
    this.emit('close');
    global.emitter.emitAsync('DialogPlayerClose');
  }
  _refresh() {
    if (this._nicoVideoPlayer) {
      this._nicoVideoPlayer.close();
    }
    if (this._videoSession) {
      this._videoSession.close();
    }
  }
  _initializePlaylist() {
    if (this._playlist) {
      return;
    }
    let $container = this._view.appendTab('playlist', 'プレイリスト');
    this._playlist = new Playlist({
      loader: ThumbInfoLoader,
      container: $container[0],
      loop: this._playerConfig.getValue('playlistLoop')
    });
    this._playlist.on('command', this._onCommand.bind(this));
    this._playlist.on('update', _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
  }
  _initializeCommentPanel() {
    if (this._commentPanel) {
      return;
    }
    let $container = this._view.appendTab('comment', 'コメント');
    this._commentPanel = new CommentPanel({
      player: this,
      $container: $container,
      autoScroll: this._playerConfig.getValue('enableCommentPanelAutoScroll'),
      language: this._playerConfig.getValue('commentLanguage')
    });
    this._commentPanel.on('command', this._onCommand.bind(this));
    this._commentPanel.on('update', _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
  }
  get isPlaylistEnable() {
    return this._playlist && this._playlist.isEnable;
  }
  playNextVideo(options) {
    if (!this._playlist || !this.isOpen) {
      return;
    }
    let opt = this._videoWatchOptions.createForVideoChange(options);

    let nextId = this._playlist.selectNext();
    if (nextId) {
      this.open(nextId, opt);
    }
  }
  playPreviousVideo(options) {
    if (!this._playlist || !this.isOpen) {
      return;
    }
    let opt = this._videoWatchOptions.createForVideoChange(options);

    let prevId = this._playlist.selectPrevious();
    if (prevId) {
      this.open(prevId, opt);
    }
  }
  play() {
    if (!this._state.isError && this._nicoVideoPlayer) {
      this._nicoVideoPlayer.play().catch((e) => {
        this._onVideoPlayStartFail(e);
      });
    }
  }
  pause() {
    if (!this._state.isError && this._nicoVideoPlayer) {
      this._nicoVideoPlayer.pause();
      this._state.setPausing();
    }
  }
  get isPlaying() {
    return this._state.isPlaying;
  }
  togglePlay() {
    if (!this._state.isError && this._nicoVideoPlayer) {
      if (this.isPlaying) {
        this.pause();
        return;
      }

      this._nicoVideoPlayer.togglePlay().catch((e) => {
        this._onVideoPlayStartFail(e);
      });
    }
  }
  set volume(v) {
    if (this._nicoVideoPlayer) {
      this._nicoVideoPlayer.volume = v;
    }
  }
  get volume() {
    return this._playerConfig.props.volume;
  }
  async addChat(text, cmd, vpos = null, options = {}) {
    if (!this._nicoVideoPlayer ||
      !this._messageApiLoader ||
      !this._state.isCommentReady ||
      this._state.isCommentPosting) {
      return Promise.reject();
    }
    if (!util.isLogin()) {
      return Promise.reject();
    }
    const threadId = this._threadInfo.threadId * 1;
    // force184のスレッドに184コマンドをつけてしまうとエラー. 同じなんだから無視すりゃいいだろが
    if (this._threadInfo.force184 !== '1') {
      cmd = cmd ? ('184 ' + cmd) : '184';
    }
    Object.assign(options, {isMine: true, isUpdating: true, thead: threadId});
    vpos = (!isNaN(vpos) && typeof vpos === 'number') ? vpos : this._nicoVideoPlayer.vpos;
    const nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);

    this._state.isCommentPosting = true;

    const lang = this._playerConfig.props.commentLanguage;
    window.console.time('コメント投稿');

    const onSuccess = result => {
      window.console.timeEnd('コメント投稿');
      nicoChat.isUpdating = false;
      nicoChat.no = result.no;
      this.execCommand('notify', 'コメント投稿成功');
      this._state.isCommentPosting = false;

      this._threadInfo.blockNo = result.blockNo;
      WatchInfoCacheDb.put(this._watchId, {comment: {text, cmd, vpos, options}});
      return Promise.resolve(result);
    };

    const onFail = err => {
      err = err || {};
      window.console.log('_onFail: ', err);
      window.console.timeEnd('コメント投稿');
      nicoChat.isPostFail = true;
      nicoChat.isUpdating = false;
      this.execCommand('alert', err.message);
      this._state.isCommentPosting = false;
      if (err.blockNo && typeof err.blockNo === 'number') {
        this._threadInfo.blockNo = err.blockNo;
      }
      return Promise.reject(err);
    };

    const msgInfo = this._videoInfo.msgInfo;
    return this._messageApiLoader.postChat(msgInfo, text, cmd, vpos, lang)
      .then(onSuccess).catch(onFail);
  }
  get duration() {
    if (!this._videoInfo) {
      return 0;
    }
    return this._videoInfo.duration;
  }
  get bufferedRange() {return this._nicoVideoPlayer.bufferedRange;}
  get nonFilteredChatList() {return this._nicoVideoPlayer.nonFilteredChatList;}
  get chatList() {return this._nicoVideoPlayer.chatList;}
  get playingStatus() {
    if (!this._nicoVideoPlayer || !this._nicoVideoPlayer.isPlaying) {
      return {};
    }

    const session = {
      playing: true,
      watchId: this._watchId,
      url: location.href,
      currentTime: this._nicoVideoPlayer.currentTime
    };

    const options = this._videoWatchOptions.createForSession();
    Object.keys(options).forEach(key => {
      session[key] = session.hasOwnProperty(key) ? session[key] : options[key];
    });

    return session;
  }
  get watchId() {
    return this._watchId;
  }
  getId() { return this.id; }
  getDuration() { return this.duration; }
  getBufferedRange() { return this.bufferedRange; }
  getNonFilteredChatList() { return this.nonFilteredChatList;}
  getChatList() { return this.chatList; }
  getPlayingStatus() { return this.playingStatus; }
  getMymemory() {
    return this._nicoVideoPlayer.getMymemory();
  }
}

class VideoHoverMenu {
  constructor(...args) {
    this.initialize(...args);
  }
  initialize(params) {
    this._container = params.playerContainer;
    this._state = params.playerState;

    this._bound = {};
    this._bound.emitClose =
      _.debounce(() => util.dispatchCommand(this._container, 'close'), 300);

    this._initializeDom();
  }
  async _initializeDom() {
    const container = this._container;
    util.$.html(VideoHoverMenu.__tpl__).appendTo(container);
    this._view = container.querySelector('.hoverMenuContainer');

    const $mc = util.$(container.querySelectorAll('.menuItemContainer'));
    $mc.on('contextmenu',
      e => { e.preventDefault(); e.stopPropagation(); });
    $mc.on('click', this._onClick.bind(this));
    $mc.on('mousedown', this._onMouseDown.bind(this));

    global.emitter.on('hideHover', this._hideMenu.bind(this));
    this._initializeNgSettingMenu();
    await this._initializeMylistSelectMenu();
  }
  async _initializeMylistSelectMenu() {
    if (!util.isLogin()) {
      return;
    }
    this._mylistApiLoader = MylistApiLoader;
    this._mylistList = await this._mylistApiLoader.getMylistList();
    this._initializeMylistSelectMenuDom();
  }
  _initializeMylistSelectMenuDom(mylistList) {
    if (!util.isLogin()) {
      return;
    }
    mylistList = mylistList || this._mylistList;
    const menu = this._container.querySelector('.mylistSelectMenu');
    menu.addEventListener('wheel', e => e.stopPropagation(), {passive: true});

    const ul = document.createElement('ul');
    mylistList.forEach(mylist => {
      const li = document.createElement('li');
      li.className = `folder${mylist.icon_id}`;

      const icon = document.createElement('span');
      icon.className = 'mylistIcon command';
      Object.assign(icon.dataset, {
        mylistId: mylist.id,
        mylistName: mylist.name,
        command: 'mylistOpen'
      });
      icon.title = mylist.name + 'を開く';

      const link = document.createElement('a');
      link.className = 'mylistLink name command';
      link.textContent = mylist.name;
      link.href = `https://www.nicovideo.jp/my/mylist/#/${mylist.id}`;
      Object.assign(link.dataset, {
        mylistId: mylist.id,
        mylistName: mylist.name,
        command: 'mylistAdd'
      });

      li.append(icon, link);
      ul.append(li);
    });

    menu.querySelector('.mylistSelectMenuInner').append(ul);
  }
  _initializeNgSettingMenu() {
    const state = this._state;
    const menu = this._container.querySelector('.ngSettingSelectMenu');

    const enableFilterItems = Array.from(menu.querySelectorAll('.update-enableFilter'));
    const updateEnableFilter = v => {
      enableFilterItems.forEach(item => {
        const p = JSON.parse(item.getAttribute('data-param'));
        item.classList.toggle('selected', v === p);
      });
      menu.classList.toggle('is-enableFilter', v);
    };
    updateEnableFilter(state.isEnableFilter);
    state.onkey('isEnableFilter', updateEnableFilter);

    const sharedNgItems = Array.from(menu.querySelectorAll('.sharedNgLevel'));
    const updateNgLevel = level => {
      sharedNgItems.forEach(item => {
        item.classList.toggle('selected', level === item.getAttribute('data-param'));
      });
    };
    updateNgLevel(state.sharedNgLevel);
    state.onkey('sharedNgLevel', updateNgLevel);
  }
  _onMouseDown(e) {
    e.stopPropagation();
    const target = e.target.closest('[data-command]');
    if (!target) {
      return;
    }
    let command = target.dataset.command;
    switch (command) {
      case 'deflistAdd':
        if (e.shiftKey) {
          command = 'mylistWindow';
        } else {
          command = e.which > 1 ? 'deflistRemove' : 'deflistAdd';
        }
        util.dispatchCommand(target, command);
        break;
      case 'mylistAdd': {
        command = (e.shiftKey || e.which > 1) ? 'mylistRemove' : 'mylistAdd';
        let mylistId = target.dataset.mylistId;
        let mylistName = target.dataset.mylistName;
        this._hideMenu();
        util.dispatchCommand(target, command, {mylistId, mylistName});
        break;
      }
      case 'mylistOpen': {
        let mylistId = target.dataset.mylistId;
        location.href = `https://www.nicovideo.jp/my/mylist/#/${mylistId}`;
        break;
      }
      case 'close':
        this._bound.emitClose();
        break;
      default:
        return;
    }
  }
  _onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target.closest('[data-command]');
    if (!target) {
      return;
    }
    let {command, type, param} = target.dataset;

    switch (type) {
      case 'json':
      case 'bool':
      case 'number':
        param = JSON.parse(param);
        break;
    }

    switch (command) {
      case 'deflistAdd':
      case 'mylistAdd':
      case 'mylistOpen':
      case 'close':
        this._hideMenu();
        break;
      case 'mylistMenu':
        if (e.shiftKey) {
          util.dispatchCommand(target, 'mylistWindow');
        }
        break;
      case 'nop':
        break;
      default:
        this._hideMenu();
        util.dispatchCommand(target, command, param);
        break;
    }
  }
  _hideMenu() {
    if (!this._view.contains(document.activeElement)) {
      return;
    }
    window.setTimeout(() => document.body.focus(), 0);
  }
}

  util.addStyle(`
    .menuItemContainer {
      box-sizing: border-box;
      position: absolute;
      z-index: ${CONSTANT.BASE_Z_INDEX + 40000};
      overflow: visible;

      will-change: transform, opacity;
      user-select: none;
    }
      .menuItemContainer .menuButton {
        width: 32px;
        height:32px;
        font-size: 24px;
        background: #888;
        color: #000;
        border: 1px solid #666;
        border-radius: 4px;
        line-height: 30px;
        white-space: nowrap;
        text-align: center;
        cursor: pointer;
        outline: none;
      }
      .menuItemContainer:hover .menuButton {
        pointer-events: auto;
      }

      .menuItemContainer.rightTop {
        width: 200px;
        height: 40px;
        right: 0px;
        top: 0;
        perspective: 150px;
        perspective-origin: center;
      }

      .menuItemContainer.rightTop .scalingUI {
        transform-origin: right top;
      }


      .is-updatingDeflist .menuItemContainer.rightTop,
      .is-updatingMylist  .menuItemContainer.rightTop {
        cursor: wait;
        opacity: 1 !important;
      }
      .is-updatingDeflist .menuItemContainer.rightTop>*,
      .is-updatingMylist  .menuItemContainer.rightTop>* {
        pointer-events: none;
      }

    .menuItemContainer.leftTop {
      width: auto;
      height: auto;
      left: 32px;
      top: 32px;
      display: none;
    }

      .is-debug .menuItemContainer.leftTop {
        display: inline-block !important;
        opacity: 1 !important;
        transition: none !important;
        transform: translateZ(0);
        max-width: 200px;
      }

    .menuItemContainer.leftBottom {
      width: 120px;
      height: 32px;
      left: 8px;
      bottom: 48px;
      transform-origin: left bottom;
    }
    .menuItemContainer.rightBottom {
      width: 120px;
      height: 80px;
      right:  0;
      bottom: 8px;
    }

    .menuItemContainer.onErrorMenu {
      position: absolute;
      left: 50%;
      top: 60%;
      transform: translate(-50%, 0);
      display: none;
      white-space: nowrap;
    }
      .is-error .onErrorMenu {
        display: block !important;
        opacity: 1 !important;
      }

      .is-youTube .onErrorMenu .for-nicovideo,
                  .onErrorMenu .for-ZenTube {
        display: none;
      }
      .is-youTube.is-error .onErrorMenu .for-ZenTube {
        display: inline-block;
      }

      .onErrorMenu .menuButton {
        position: relative;
        display: inline-block !important;
        margin: 0 16px;
        padding: 8px;
        background: #888;
        color: #000;
        opacity: 1;
        cursor: pointer;
        border-radius: 0;
        box-shadow: 4px 4px 0 #333;
        border: 2px outset;
        width: 100px;
        font-size: 14px;
        line-height: 16px;
      }
      .menuItemContainer.onErrorMenu .menuButton:active {
        background: var(--base-fore-color);
        border: 2px inset;
      }
      .menuItemContainer.onErrorMenu .playNextVideo {
        display: none !important;
      }
      .is-playlistEnable .menuItemContainer.onErrorMenu .playNextVideo {
        display: inline-block !important;
      }


    .menuButton {
      position: absolute;
      opacity: 0;
      transition:
        opacity 0.4s ease,
        box-shadow 0.2s ease,
        background 0.4s ease;
      box-sizing: border-box;
      text-align: center;
      text-shadow: none;
      user-select: none;
      will-change: transform;
    }
      .menuButton:focus-within,
      .menuButton:hover {
        box-shadow: 0 2px 0 #000;
        cursor: pointer;
        opacity: 1;
        background: #888;
        color: #000;
      }
      .menuButton:active {
        transform: translate(0, 2px);
        box-shadow: 0 0 0 #000;
        transition: none;
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
      .menuButton:avtive .tooltip {
        display: none;
      }


      .menuButton:active .zenzaPopupMenu {
        transform: translate(0, -2px);
        transition: none;
      }
      .hoverMenuContainer .menuButton:focus-within {
        pointer-events: none;
      }
      .hoverMenuContainer .menuButton:focus-within .zenzaPopupMenu,
      .hoverMenuContainer .menuButton              .zenzaPopupMenu:hover {
        pointer-events: auto;
        visibility: visible;
        opacity: 0.99;
        pointer-events: auto;
        transition: opacity 0.3s;
      }


      .rightTop .menuButton .tooltip {
        top: auto;
        bottom: -24px;
        right: -16px;
        left: auto;
      }
      .rightBottom .menuButton .tooltip {
        right: 16px;
        left: auto;
      }

      .is-mouseMoving .menuButton {
        opacity: 0.8;
        background: rgba(80, 80, 80, 0.5);
        border: 1px solid #888;
        transition:
          box-shadow 0.2s ease,
          background 0.4s ease;
      }
      .is-mouseMoving .menuButton .menuButtonInner {
        opacity: 0.8;
        word-break: normal;
        transition:
          box-shadow 0.2s ease,
          background 0.4s ease;
       }


    .showCommentSwitch {
      left: 0;
      width:  32px;
      height: 32px;
      background:#888;
      color: #000;
      border: 1px solid #666;
      line-height: 30px;
      filter: grayscale(100%);
      border-radius: 4px;
    }
      .is-showComment .showCommentSwitch {
        color: #fff;
        filter: none;
        text-decoration: none;
      }
      .showCommentSwitch .menuButtonInner {
        text-decoration: line-through;
      }
      .is-showComment .showCommentSwitch .menuButtonInner {
        text-decoration: none;
      }


    .ngSettingMenu {
      display: none;
      left: 80px;
    }
      .is-showComment .ngSettingMenu {
        display: block;
      }
      .ngSettingMenu .menuButtonInner {
        font-size: 18px;
      }

    .ngSettingSelectMenu {
      white-space: nowrap;
      bottom: 0px;
      left: 32px;
      font-size: 18px;
    }
      .ngSettingMenu:active .ngSettingSelectMenu {
        transition: none;
      }
      .ngSettingSelectMenu .triangle {
        transform: rotate(45deg);
        left: -8px;
        bottom: 3px;
      }
      .ngSettingSelectMenu .sharedNgLevelSelect {
        display: none;
      }

      .ngSettingSelectMenu.is-enableFilter .sharedNgLevelSelect {
        display: block;
      }


    .menuItemContainer .mylistButton {
      font-size: 21px;
    }

    .mylistButton.mylistAddMenu {
      left: 40px;
      top: 0;
    }
    .mylistButton.deflistAdd {
      left: 80px;
      top: 0;
    }

    @keyframes spinX {
      0%   { transform: rotateX(0deg); }
      100% { transform: rotateX(1800deg); }
    }
    @keyframes spinY {
      0%   { transform: rotateY(0deg); }
      100% { transform: rotateY(1800deg); }
    }

    .is-updatingDeflist .mylistButton.deflistAdd {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset !important;
      box-shadow: none !important;
      background: #888 !important;
      color: #000 !important;
      animation-name: spinX;
      animation-iteration-count: infinite;
      animation-duration: 6s;
      animation-timing-function: linear;
    }
    .is-updatingDeflist .mylistButton.deflistAdd .tooltip {
      display: none;
    }

    .mylistButton.mylistAddMenu:focus-within,
    .is-updatingMylist  .mylistButton.mylistAddMenu {
      pointer-events: none;
      opacity: 1 !important;
      border: 1px inset #000 !important;
      color: #000 !important;
      box-shadow: none !important;
    }
    .mylistButton.mylistAddMenu:focus-within {
      background: #888 !important;
    }
    .is-updatingMylist  .mylistButton.mylistAddMenu {
      background: #888 !important;
      color: #000 !important;
      animation-name: spinX;
      animation-iteration-count: infinite;
      animation-duration: 6s;
      animation-timing-function: linear;
    }

    .mylistSelectMenu {
      top: 36px;
      right: -48px;
      padding: 8px 0;
      font-size: 13px;
      backface-visibility: hidden;
    }
    .is-updatingMylist .mylistSelectMenu {
      display: none;
    }
      .mylistSelectMenu .mylistSelectMenuInner {
        overflow-y: auto;
        overflow-x: hidden;
        max-height: 50vh;
        overscroll-behavior: contain;
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

      .mylistSelectMenu .mylistIcon {
        display: inline-block;
        width: 18px;
        height: 14px;
        margin: -4px 4px 0 0;
        vertical-align: middle;
        margin-right: 15px;
        background: url("//nicovideo.cdn.nimg.jp/uni/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
        transform: scale(1.5);
        transform-origin: 0 0 0;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
        cursor: pointer;
      }
      .mylistSelectMenu .mylistIcon:hover {
        background-color: #ff9;
        transform: scale(2);
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

      .zenzaTweetButton:hover {
        text-shadow: 1px 1px 2px #88c;
        background: #1da1f2;
        color: #fff;
      }

    .menuItemContainer .menuButton.closeButton {
      position: absolute;
      font-size: 20px;
      top: 0;
      right: 0;
      z-index: ${CONSTANT.BASE_Z_INDEX + 60000};
      margin: 0 0 40px 40px;
      color: #ccc;
      border: solid 1px #888;
      border-radius: 0;
      transition:
        opacity 0.4s ease,
        transform 0.2s ease,
        background 0.2s ease,
        box-shadow 0.2s ease
          ;
      pointer-events: auto;
      transform-origin: center center;
    }

    .is-mouseMoving .closeButton,
    .closeButton:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.8);
    }
    .closeButton:hover {
      background: rgba(33, 33, 33, 0.9);
      box-shadow: 4px 4px 4px #000;
    }
    .closeButton:active {
      transform: scale(0.5);
    }

    .menuItemContainer .toggleDebugButton {
      position: relative;
      display: inline-block;
      opacity: 1 !important;
      padding: 8px 16px;
      color: #000;
      box-shadow: none;
      font-size: 21px;
      border: 1px solid black;
      background: rgba(192, 192, 192, 0.8);
      width: auto;
      height: auto;
    }

    .togglePlayMenu {
      display: none;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(1.5);
      width: 80px;
      height: 45px;
      font-size: 35px;
      line-height: 45px;
      border-radius: 8px;
      text-align: center;
      color: var(--base-fore-color);
      z-index: ${CONSTANT.BASE_Z_INDEX + 10};
      background: rgba(0, 0, 0, 0.8);
      transition: transform 0.2s ease, box-shadow 0.2s, text-shadow 0.2s, font-size 0.2s;
      box-shadow: 0 0 2px rgba(255, 255, 192, 0.8);
      cursor: pointer;
    }

    .togglePlayMenu:hover {
      transform: translate(-50%, -50%) scale(1.6);
      text-shadow: 0 0 4px #888;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
    }

    .togglePlayMenu:active {
      transform: translate(-50%, -50%) scale(2.0, 1.2);
      font-size: 30px;
      box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.8);
      text-shadow: none;
      transition: transform 0.1s ease;
    }

    .is-notPlayed .togglePlayMenu {
      display: block;
    }

    .is-playing .togglePlayMenu,
    .is-error   .togglePlayMenu,
    .is-loading .togglePlayMenu {
      display: none;
    }


  `, {className: 'videoHoverMenu'});
util.addStyle(`
  .menuItemContainer.leftBottom {
    bottom: 64px;
  }
  .menuItemContainer.leftBottom .scalingUI {
    transform-origin: left bottom;
  }
  .menuItemContainer.leftBottom .scalingUI {
    height: 64px;
  }
  .menuItemContainer.rightBottom {
    bottom: 64px;
  }
  .ngSettingSelectMenu {
    bottom: 0px;
  }
  `, {className: 'videoHoverMenu screenMode for-full'});

VideoHoverMenu.__tpl__ = (`
    <div class="hoverMenuContainer">
      <div class="menuItemContainer leftTop">
          <div class="menuButton toggleDebugButton" data-command="toggle-debug">
            <div class="menuButtonInner">debug mode</div>
          </div>
      </div>

      <div class="menuItemContainer rightTop">
        <div class="scalingUI">
          <div class="menuButton zenzaTweetButton" data-command="tweet">
            <div class="tooltip">ツイート</div>
            <div class="menuButtonInner">t</div>
          </div>
          <div class="menuButton mylistButton mylistAddMenu forMember"
            data-command="nop" tabindex="-1" data-has-submenu="1">
            <div class="tooltip">マイリスト登録</div>
            <div class="menuButtonInner">My</div>
            <div class="mylistSelectMenu selectMenu zenzaPopupMenu forMember">
              <div class="triangle"></div>
              <div class="mylistSelectMenuInner">
              </div>
            </div>
          </div>


          <div class="menuButton mylistButton deflistAdd forMember" data-command="deflistAdd">
            <div class="tooltip">とりあえずマイリスト(T)</div>
            <div class="menuButtonInner">&#x271A;</div>
          </div>

          <div class="menuButton closeButton" data-command="close">
            <div class="menuButtonInner">&#x2716;</div>
          </div>

        </div>
      </div>

      <div class="menuItemContainer leftBottom">
        <div class="scalingUI">
          <div class="showCommentSwitch menuButton" data-command="toggle-showComment">
            <div class="tooltip">コメント表示ON/OFF(V)</div>
            <div class="menuButtonInner">💬</div>
          </div>

          <div class="ngSettingMenu menuButton" data-command="nop"
            data-has-submenu="1" tabindex="-1">
            <div class="tooltip">NG設定</div>
            <div class="menuButtonInner">NG</div>

              <div class="ngSettingSelectMenu selectMenu zenzaPopupMenu">
                <div class="triangle"></div>
                <p class="caption">NG設定</p>
                <ul>
                  <li class="update-enableFilter"
                    data-command="update-enableFilter"
                    data-param="true"  data-type="bool"><span>ON</span></li>
                  <li class="update-enableFilter"
                    data-command="update-enableFilter"
                    data-param="false" data-type="bool"><span>OFF</span></li>
                </ul>
                <p class="caption sharedNgLevelSelect">NG共有設定</p>
                <ul class="sharedNgLevelSelect">
                  <li class="sharedNgLevel max"
                    data-command="update-sharedNgLevel"
                    data-param="MAX"><span>最強</span></li>
                  <li class="sharedNgLevel high"
                    data-command="update-sharedNgLevel"
                    data-param="HIGH"><span>強</span></li>
                  <li class="sharedNgLevel mid"
                    data-command="update-sharedNgLevel"
                    data-param="MID"><span>中</span></li>
                  <li class="sharedNgLevel low"
                    data-command="update-sharedNgLevel"
                    data-param="LOW"><span>弱</span></li>
                  <li class="sharedNgLevel none"
                    data-command="update-sharedNgLevel"
                    data-param="NONE"><span>なし</span></li>
                </ul>
              </div>

          </div>
        </div>
      </div>

      <div class="menuItemContainer onErrorMenu">
        <div class="menuButton openGinzaMenu" data-command="openGinza">
          <div class="menuButtonInner">GINZAで視聴</div>
        </div>

        <div class="menuButton reloadMenu for-nicovideo" data-command="reload">
          <div class="menuButtonInner for-nicovideo">リロード</div>
          <div class="menuButtonInner for-ZenTube">ZenTube解除</div>
        </div>

        <div class="menuButton playNextVideo" data-command="playNextVideo">
          <div class="menuButtonInner">次の動画</div>
        </div>
      </div>

      <div class="togglePlayMenu menuItemContainer center" data-command="togglePlay">
        ▶
      </div>

    </div>
  `).trim();


class VariablesMapper {
  get nextState() {
    const {menuScale, commentLayerOpacity, fullscreenControlBarMode} = this.config.props;
    return {menuScale, commentLayerOpacity, fullscreenControlBarMode};
  }

  get videoControlBarHeight() {
    return(
      (VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) *
        this.state.menuScale + VideoControlBar.BASE_SEEKBAR_HEIGHT);
  }

  constructor({config, element}){
    this.config = config;
    css.registerProps(
      {name: '--zenza-ui-scale',              syntax: '<number>', initialValue: 1,  inherits: true},
      {name: '--zenza-control-bar-height',    syntax: '<length>', initialValue: '48px', inherits: true},
      {name: '--zenza-comment-layer-opacity', syntax: '<number>', initialValue: 1,  inherits: true}
    );

    this.state = {
      menuScale: 0,
      commentLayerOpacity: 0,
      fullscreenControlBarMode: 'auto'
    };

    this.element = element || document.body;
    this.emitter = new Emitter();

    const update = _.debounce(this.update.bind(this), 500);
    Object.keys(this.state).forEach(key =>
      config.onkey(key, () => update(key)));
    update();
  }

  on(...args) {
    this.emitter.on(...args);
  }

  shouldUpdate(state, nextState) {
    return Object.keys(state).some(key => state[key] !== nextState[key]);
  }

  setVar(key, value) { this.element.style.setProperty(key, value); }

  update() {
    const state = this.state;
    const nextState = this.nextState;

    if (!this.shouldUpdate(state, nextState)) {
      return;
    }

    const {menuScale, commentLayerOpacity, fullscreenControlBarMode} = nextState;

    this.state = nextState;
    Object.assign(this.element.dataset, {fullscreenControlBarMode});
    if (state.scale !== menuScale) {
      this.setVar('--zenza-ui-scale', menuScale);
      this.setVar('--zenza-control-bar-height', css.px(this.videoControlBarHeight));
    }
    if (state.commentLayerOpacity !== commentLayerOpacity) {
      this.setVar('--zenza-comment-layer-opacity', commentLayerOpacity);
    }
    this.emitter.emit('update', nextState);
  }

}

//===END===

export {
  PlayerConfig,
  VideoWatchOptions,
  PlayerState,
  NicoVideoPlayerDialog,
  NicoVideoPlayerDialogView,
  VideoHoverMenu,
  VariablesMapper
};
