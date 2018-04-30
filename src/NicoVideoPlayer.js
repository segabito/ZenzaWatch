import _ from 'lodash';
import $ from 'jQuery';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {NicoCommentPlayer} from './CommentPlayer';
import {util, Config, FullScreen, VideoCaptureUtil, BaseViewComponent} from './util';
import {YouTubeWrapper} from './YouTubeWrapper';
import {CONSTANT} from './constant';
import {Emitter} from './baselib';

//===BEGIN===


/**
 * VideoPlayer + CommentPlayer = NicoVideoPlayer
 *
 * とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
 *
 */
class NicoVideoPlayer extends Emitter {
  constructor(params) {
    super();
    this.initialize(params);
  }
}
_.assign(NicoVideoPlayer.prototype, {
  initialize: function (params) {
    let conf = this._playerConfig = params.playerConfig;

    this._fullScreenNode = params.fullScreenNode;
    this._playerState = params.playerState;

    const playbackRate = conf.getValue('playbackRate');

    const onCommand = (command, param) => {
      this.emit('command', command, param);
    };
    this._videoPlayer = new VideoPlayer({
      volume: conf.getValue('volume'),
      loop: conf.getValue('loop'),
      mute: conf.getValue('mute'),
      autoPlay: conf.getValue('autoPlay'),
      playbackRate,
      debug: conf.getValue('debug')
    });
    this._videoPlayer.on('command', onCommand);

    this._commentPlayer = new NicoCommentPlayer({
      offScreenLayer: params.offScreenLayer,
      enableFilter: params.enableFilter,
      wordFilter: params.wordFilter,
      wordRegFilter: params.wordRegFilter,
      wordRegFilterFlags: params.wordRegFilterFlags,
      userIdFilter: params.userIdFilter,
      commandFilter: params.commandFilter,
      showComment: conf.getValue('showComment'),
      debug: conf.getValue('debug'),
      playbackRate,
      sharedNgLevel: conf.getValue('sharedNgLevel')
    });
    this._commentPlayer.on('command', onCommand);

    this._contextMenu = new ContextMenu({
      parentNode: params.node.length ? params.node[0] : params.node,
      playerState: this._playerState
    });
    this._contextMenu.on('command', onCommand);

    if (params.node) {
      this.appendTo(params.node);
    }

    this._initializeEvents();

    this._beginTimer();

    ZenzaWatch.debug.nicoVideoPlayer = this;
  },
  _beginTimer: function () {
    this._stopTimer();
    this._videoWatchTimer =
      window.setInterval(this._onTimer.bind(this), 100);
  },
  _stopTimer: function () {
    if (!this._videoWatchTimer) {
      return;
    }
    window.clearInterval(this._videoWatchTimer);
    this._videoWatchTimer = null;
  },
  _initializeEvents: function () {
    const eventBridge = function(...args) {
      this.emit(...args);
    };
    this._videoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
    this._videoPlayer.on('dblclick', this._onDblClick.bind(this));
    this._videoPlayer.on('aspectRatioFix', this._onAspectRatioFix.bind(this));
    this._videoPlayer.on('play', this._onPlay.bind(this));
    this._videoPlayer.on('playing', this._onPlaying.bind(this));
    this._videoPlayer.on('stalled', eventBridge.bind(this, 'stalled'));
    this._videoPlayer.on('progress', eventBridge.bind(this, 'progress'));
    this._videoPlayer.on('pause', this._onPause.bind(this));
    this._videoPlayer.on('ended', this._onEnded.bind(this));
    this._videoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
    this._videoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
    this._videoPlayer.on('durationChange', eventBridge.bind(this, 'durationChange'));
    this._videoPlayer.on('playerTypeChange', eventBridge.bind(this, 'videoPlayerTypeChange'));
    this._videoPlayer.on('buffercomplete', eventBridge.bind(this, 'buffercomplete'));

    // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
    this._videoPlayer.on('mouseWheel',
      _.throttle(this._onMouseWheel.bind(this), 50));

    this._videoPlayer.on('abort', eventBridge.bind(this, 'abort'));
    this._videoPlayer.on('error', eventBridge.bind(this, 'error'));

    this._videoPlayer.on('click', this._onClick.bind(this));
    this._videoPlayer.on('contextMenu', this._onContextMenu.bind(this));
    this._commentPlayer.on('parsed', eventBridge.bind(this, 'commentParsed'));
    this._commentPlayer.on('change', eventBridge.bind(this, 'commentChange'));
    this._commentPlayer.on('filterChange', eventBridge.bind(this, 'commentFilterChange'));
    this._playerState.on('change', this._onPlayerStateChange.bind(this));
  },
  _onVolumeChange: function (vol, mute) {
    this._playerConfig.setValue('volume', vol);
    this._playerConfig.setValue('mute', mute);
    this.emit('volumeChange', vol, mute);
  },
  _onPlayerStateChange: function (key, value) {
    switch (key) {
      case 'isLoop':
        this._videoPlayer.setIsLoop(value);
        break;
      case 'playbackRate':
        this._videoPlayer.setPlaybackRate(value);
        this._commentPlayer.setPlaybackRate(value);
        break;
      case 'isAutoPlay':
        this._videoPlayer.setIsAutoPlay(value);
        break;
      case 'isCommentVisible':
        if (value) {
          this._commentPlayer.show();
        } else {
          this._commentPlayer.hide();
        }
        break;
      case 'isMute':
        this._videoPlayer.setMute(value);
        break;
      case 'sharedNgLevel':
        this.setSharedNgLevel(value);
        break;
    }
  },
  _onMouseWheel: function (e, delta) {
    // 下げる時は「うわ音でけぇ」
    // 上げる時は「ちょっと上げようかな」
    // なので下げる速度のほうが速い
    if (delta > 0) { // up
      this.volumeUp();
    } else {         // down
      this.volumeDown();
    }
  },
  volumeUp: function () {
    let v = Math.max(0.01, this._videoPlayer.getVolume());
    let r = (v < 0.05) ? 1.3 : 1.1;
    this._videoPlayer.setVolume(v * r);
  },
  volumeDown: function () {
    let v = this._videoPlayer.getVolume();
    this._videoPlayer.setVolume(v / 1.2);
  },
  _onTimer: function () {
    let currentTime = this._videoPlayer.getCurrentTime();
    this._commentPlayer.setCurrentTime(currentTime);
  },
  _onAspectRatioFix: function (ratio) {
    this._commentPlayer.setAspectRatio(ratio);
    this.emit('aspectRatioFix', ratio);
  },
  _onLoadedMetaData: function () {
    this.emit('loadedMetaData');
  },
          }
        }
      });
    }
  },
  _onPlay: function () {
    this._isPlaying = true;
    this.emit('play');
  },
  _onPlaying: function () {
    this._isPlaying = true;
    this.emit('playing');
  },
  _onSeeking: function () {
    this._isSeeking = true;
    this.emit('seeking');
  },
  _onSeeked: function () {
    this._isSeeking = false;
    this.emit('seeked');
  },
  _onPause: function () {
    this._isPlaying = false;
    this.emit('pause');
  },
  _onEnded: function () {
    this._isPlaying = false;
    this._isEnded = true;
    this.emit('ended');
  },
  _onClick: function () {
    this._contextMenu.hide();
  },
  _onDblClick: function () {
    if (this._playerConfig.getValue('enableFullScreenOnDoubleClick')) {
      this.toggleFullScreen();
    }
  },
  _onContextMenu: function (e) {
    if (!this._contextMenu.isOpen) {
      e.stopPropagation();
      e.preventDefault();
      this._contextMenu.show(e.offsetX, e.offsetY);
    }
  },
  setVideo: function (url) {
    let e = {src: url, url: null, promise: null};
    // デバッグ用
    ZenzaWatch.emitter.emit('beforeSetVideo', e);
    if (e.url) {
      url = e.url;
    }
    if (e.promise) {
      return e.promise.then(url => {
        this._videoPlayer.setSrc(url);
        this._isEnded = false;
      });
    }
    this._videoPlayer.setSrc(url);
    this._isEnded = false;
    this._isSeeking = false;
  },
  setThumbnail: function (url) {
    this._videoPlayer.setThumbnail(url);
  },
  play: function () {
    return this._videoPlayer.play();
  },
  pause: function () {
    this._videoPlayer.pause();
    return Promise.resolve();
  },
  togglePlay: function () {
    return this._videoPlayer.togglePlay();
  },
  setPlaybackRate: function (playbackRate) {
    //if (!ZenzaWatch.util.isPremium()) { playbackRate = Math.min(1, playbackRate); }
    playbackRate = Math.max(0, Math.min(playbackRate, 10));
    this._videoPlayer.setPlaybackRate(playbackRate);
    this._commentPlayer.setPlaybackRate(playbackRate);
  },
  setCurrentTime: function (t) {
    this._videoPlayer.setCurrentTime(Math.max(0, t));
  },
  fastSeek: function (t) {
    this._videoPlayer.fastSeek(Math.max(0, t));
  },
  getDuration: function () {
    return this._videoPlayer.getDuration();
  },
  getCurrentTime: function () {
    return this._videoPlayer.getCurrentTime();
  },
  getVpos: function () {
    return Math.floor(this._videoPlayer.getCurrentTime() * 100);
  },
  setComment: function (xmlText, options) {
    this._commentPlayer.setComment(xmlText, options);
  },
  getChatList: function () {
    return this._commentPlayer.getChatList();
  },
  getNonFilteredChatList: function () {
    return this._commentPlayer.getNonFilteredChatList();
  },
  setVolume: function (v) {
    this._videoPlayer.setVolume(v);
  },
  appendTo: function (node) {
    let $node = typeof node === 'string' ? $(node) : node;
    this._$parentNode = node;
    this._videoPlayer.appendTo($node[0]);
    this._commentPlayer.appendTo($node);
  },
  close: function () {
    this._videoPlayer.close();
    this._commentPlayer.close();
  },
  closeCommentPlayer: function () {
    this._commentPlayer.close();
  },
  toggleFullScreen: function () {
    if (FullScreen.now()) {
      FullScreen.cancel();
    } else {
      this.requestFullScreen();
    }
  },
  requestFullScreen: function () {
    FullScreen.request(this._fullScreenNode || this._$parentNode[0]);
  },
  canPlay: function () {
    return this._videoPlayer.canPlay();
  },
  isPlaying: function () {
    return !!this._isPlaying;
  },
  isSeeking: function () {
    return !!this._isSeeking;
  },
  getBufferedRange: function () {
    return this._videoPlayer.getBufferedRange();
  },
  addChat: function (text, cmd, vpos, options) {
    if (!this._commentPlayer) {
      return;
    }
    let nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
    console.log('addChat:', text, cmd, vpos, options, nicoChat);
    return nicoChat;
  },
  setIsCommentFilterEnable: function (v) {
    this._commentPlayer.setIsFilterEnable(v);
  },
  isCommentFilterEnable: function () {
    return this._commentPlayer.isFilterEnable();
  },
  setSharedNgLevel: function (level) {
    this._commentPlayer.setSharedNgLevel(level);
  },
  getSharedNgLevel: function () {
    return this._commentPlayer.getSharedNgLevel();
  },

  addWordFilter: function (text) {
    this._commentPlayer.addWordFilter(text);
  },
  setWordFilterList: function (list) {
    this._commentPlayer.setWordFilterList(list);
  },
  getWordFilterList: function () {
    return this._commentPlayer.getWordFilterList();
  },

  addUserIdFilter: function (text) {
    this._commentPlayer.addUserIdFilter(text);
  },
  setUserIdFilterList: function (list) {
    this._commentPlayer.setUserIdFilterList(list);
  },
  getUserIdFilterList: function () {
    return this._commentPlayer.getUserIdFilterList();
  },

  getCommandFilterList: function () {
    return this._commentPlayer.getCommandFilterList();
  },
  addCommandFilter: function (text) {
    this._commentPlayer.addCommandFilter(text);
  },
  setCommandFilterList: function (list) {
    this._commentPlayer.setCommandFilterList(list);
  },
  setVideoInfo: function (info) {
    this._videoInfo = info;
  },
  getVideoInfo: function () {
    return this._videoInfo;
  },
  getMymemory: function () {
    return this._commentPlayer.getMymemory();
  },
  getScreenShot: function () {
    window.console.time('screenShot');

    const fileName = this._getSaveFileName();
    const video = this._videoPlayer.getVideoElement();

    return VideoCaptureUtil.videoToCanvas(video).then(({canvas}) => {
      VideoCaptureUtil.saveToFile(canvas, fileName);
      window.console.timeEnd('screenShot');
    });
  },
  getScreenShotWithComment: function () {
    window.console.time('screenShotWithComment');

    const fileName = this._getSaveFileName({suffix: 'C'});
    const video = this._videoPlayer.getVideoElement();
    const html = this._commentPlayer.getCurrentScreenHtml();

    return VideoCaptureUtil.nicoVideoToCanvas({video, html}).then(({canvas}) => {
      VideoCaptureUtil.saveToFile(canvas, fileName);
      window.console.timeEnd('screenShotWithComment');
    });
  },
  _getSaveFileName: function ({suffix = ''} = {}) {
    const title = this._videoInfo.title;
    const watchId = this._videoInfo.watchId;
    const currentTime = this._videoPlayer.getCurrentTime();
    const time = util.secToTime(currentTime).replace(':', '_');
    const prefix = Config.getValue('screenshot.prefix') || '';

    return `${prefix}${title} - ${watchId}@${time}${suffix}.png`;
  },
  isCorsReady: function () {
    return this._videoPlayer && this._videoPlayer.isCorsReady();
  }
});


class ContextMenu extends BaseViewComponent {
  constructor({parentNode, playerState}) {
    super({
      parentNode,
      name: 'VideoContextMenu',
      template: ContextMenu.__tpl__,
      css: ContextMenu.__css__
    });
    this._playerState = playerState;
    this._state = {
      isOpen: false
    };

    this._bound.onBodyClick = this.hide.bind(this);
  }

  _initDom(...args) {
    super._initDom(...args);
    ZenzaWatch.debug.contextMenu = this;
    const onMouseDown = this._bound.onMouseDown = this._onMouseDown.bind(this);
    this._bound.onBodyMouseUp = this._onBodyMouseUp.bind(this);
    this._bound.onRepeat = this._onRepeat.bind(this);
    this._view.addEventListener('mousedown', onMouseDown);
    this._isFirstShow = true;
    this._view.addEventListener('contextmenu', (e) => {
      setTimeout(() => {
        this.hide();
      }, 100);
      e.preventDefault();
      e.stopPropagation();
    });
  }

  _onClick(e) {
    if (e && e.button !== 0) {
      return;
    }

    if (e.type !== 'mousedown') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    super._onClick(e);
  }

  _onMouseDown(e) {
    if (e.target && e.target.getAttribute('data-is-no-close') === 'true') {
      e.stopPropagation();
      this._onClick(e);
    } else if (e.target && e.target.getAttribute('data-repeat') === 'on') {

      e.stopPropagation();
      this._onClick(e);
      this._beginRepeat(e);
    } else {
      e.stopPropagation();
      this._onClick(e);
      setTimeout(() => {
        this.hide();
      }, 100);
    }
  }

  _onBodyMouseUp() {
    this._endRepeat();
  }

  _beginRepeat(e) {
    this._repeatEvent = e;
    document.body.addEventListener('mouseup', this._bound.onBodyMouseUp);

    this._repeatTimer = window.setInterval(this._bound.onRepeat, 200);
    this._isRepeating = true;
  }

  _endRepeat() {
    this._repeatEvent = null;
    // this._isRepeating = false;
    if (this._repeatTimer) {
      window.clearInterval(this._repeatTimer);
      this._repeatTimer = null;
    }
    document.body.removeEventListener('mouseup', this._bound.onBodyMouseUp);
  }

  _onRepeat() {
    if (!this._isRepeating) {
      this._endRepeat();
      return;
    }
    if (this._repeatEvent) {
      this._onClick(this._repeatEvent);
    }
  }

  show(x, y) {
    document.body.addEventListener('click', this._bound.onBodyClick);
    const view = this._view;

    this._onBeforeShow(x, y);

    view.style.left =
      Math.max(0, Math.min(x, window.innerWidth - view.offsetWidth)) + 'px';
    view.style.top =
      Math.max(0, Math.min(y + 20, window.innerHeight - view.offsetHeight)) + 'px';
    this.setState({isOpen: true});
    ZenzaWatch.emitter.emitAsync('showMenu');
  }

  hide() {
    document.body.removeEventListener('click', this._bound.onBodyClick);
    util.$(this._view).css({left: '', top: ''});
    this._endRepeat();
    this.setState({isOpen: false});
    ZenzaWatch.emitter.emitAsync('hideMenu');
  }

  get isOpen() {
    return this._state.isOpen;
  }

  _onBeforeShow() {
    // チェックボックスなどを反映させるならココ
    const pr = parseFloat(this._playerState.playbackRate, 10);
    const view = util.$(this._view);
    view.find('.selected').removeClass('selected');
    view.find('.playbackRate').forEach(elm => {
      const p = parseFloat(elm.getAttribute('data-param'), 10);
      if (Math.abs(p - pr) < 0.01) {
        elm.classList.add('selected');
      }
    });
    view.find('.debug')
      .toggleClass('selected', this._playerState.isDebug);
    if (this._isFirstShow) {
      this._isFirstShow = false;
      const handler = (command, param) => {
        this.emit('command', command, param);
      };
      ZenzaWatch.emitter.emitAsync('videoContextMenu.addonMenuReady',
        view.find('.empty-area-top'), handler
      );
      ZenzaWatch.emitter.emitAsync('videoContextMenu.addonMenuReady.list',
        view.find('.listInner ul'), handler
      );
    }
  }
}

ContextMenu.__css__ = (`
    .zenzaPlayerContextMenu {
      position: fixed;
      background: rgba(255, 255, 255, 0.8);
      overflow: visible;
      padding: 8px;
      border: 1px outset #333;
      box-shadow: 2px 2px 4px #000;
      transition: opacity 0.3s ease;
      min-width: 200px;
      z-index: 150000;
      user-select: none;
    }
    .zenzaPlayerContextMenu.is-Open {
      opacity: 0.5;
    }
    .zenzaPlayerContextMenu.is-Open:hover {
      opacity: 1;
    }
    .fullScreen .zenzaPlayerContextMenu {
      position: absolute;
    }

    .zenzaPlayerContextMenu:not(.is-Open) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
    }

    .zenzaPlayerContextMenu ul {
      padding: 0;
      margin: 0;
    }

    .zenzaPlayerContextMenu ul li {
      position: relative;
      line-height: 120%;
      margin: 2px;
      overflow-y: visible;
      white-space: nowrap;
      cursor: pointer;
      padding: 2px 14px;
      list-style-type: none;
      float: inherit;
    }
    .zenzaPlayerContextMenu ul li.selected {
    }
    .is-loop           .zenzaPlayerContextMenu li.toggleLoop:before,
    .is-playlistEnable .zenzaPlayerContextMenu li.togglePlaylist:before,
    .is-showComment    .zenzaPlayerContextMenu li.toggleShowComment:before,
    .zenzaPlayerContextMenu ul                 li.selected:before {
      content: '✔';
      left: -10px;
      color: #000 !important;
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
    }
    .zenzaPlayerContextMenu .listInner {
    }

    .zenzaPlayerContextMenu .controlButtonContainer {
      position: absolute;
      bottom: 100%;
      left: 50%;
      width: 110%;
      transform: translate(-50%, 0);
      white-space: nowrap;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex {
      display: flex;
    }

    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton {
      flex: 1;
      height: 48px;
      font-size: 24px;
      line-height: 46px;
      border: 1px solid;
      border-radius: 4px;
      color: #333;
      background: rgba(192, 192, 192, 0.95);
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
      box-shadow: 0 0 0;
      opacity: 1;
      margin: auto;
    }

    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.screenShot {
      flex: 1;
      font-size: 24px;
    }

    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.playbackRate {
      flex: 2;
      font-size: 14px;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate010,
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate100,
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate200 {
      flex: 3;
      font-size: 24px;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek5s {
      flex: 2;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek15s {
      flex: 3;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:hover {
      transform: translate(0px, -4px);
      box-shadow: 0px 4px 2px #666;
    }
    .zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:active {
      transform: none;
      box-shadow: 0 0 0;
      border: 1px inset;
    }

  `).trim();

ContextMenu.__tpl__ = (`
    <div class="zenzaPlayerContextMenu">
      <div class="controlButtonContainer">
        <div class="controlButtonContainerFlex">
          <div class="controlButton command screenShot" data-command="screenShot"
            data-param="0.1" data-type="number" data-is-no-close="true">
            &#128247;<div class="tooltip">スクリーンショット</div>
          </div>
          <div class="empty-area-top" style="flex:4;" data-is-no-close="true"></div>
        </div>
        <div class="controlButtonContainerFlex">
          <div class="controlButton command rate010 playbackRate" data-command="playbackRate"
            data-param="0.1" data-type="number" data-repeat="on">
            &#128034;<div class="tooltip">コマ送り(0.1倍)</div>
          </div>
          <div class="controlButton command rate050 playbackRate" data-command="playbackRate"
            data-param="0.5" data-type="number" data-repeat="on">
            <div class="tooltip">0.5倍速</div>
          </div>
          <div class="controlButton command rate075 playbackRate" data-command="playbackRate"
            data-param="0.75" data-type="number" data-repeat="on">
            <div class="tooltip">0.75倍速</div>
          </div>

          <div class="controlButton command rate100 playbackRate" data-command="playbackRate"
            data-param="1.0" data-type="number" data-repeat="on">
            &#9655;<div class="tooltip">標準速</div>
          </div>

          <div class="controlButton command rate125 playbackRate" data-command="playbackRate"
            data-param="1.25" data-type="number" data-repeat="on">
            <div class="tooltip">1.25倍速</div>
          </div>
          <div class="controlButton command rate150 playbackRate" data-command="playbackRate"
            data-param="1.5" data-type="number" data-repeat="on">
            <div class="tooltip">1.5倍速</div>
          </div>
          <div class="controlButton command rate200 playbackRate" data-command="playbackRate"
            data-param="2.0" data-type="number" data-repeat="on">
            &#128007;<div class="tooltip">2倍速</div>
          </div>
        </div>
        <div class="controlButtonContainerFlex">
          <div class="controlButton command seek5s"
            data-command="seekBy" data-param="-5" data-type="number" data-repeat="on"
            >⇦
              <div class="tooltip">5秒戻る</div>
          </div>
          <div class="controlButton command seek15s"
            data-command="seekBy" data-param="-15" data-type="number" data-repeat="on"
            >⇦
              <div class="tooltip">15秒戻る</div>
          </div>
          <div class="controlButton command seek15s"
            data-command="seekBy" data-param="15" data-type="number" data-repeat="on"
            >⇨
              <div class="tooltip">15秒進む</div>
          </div>
          <div class="controlButton command seek5s"
            data-command="seekBy" data-param="5" data-type="number" data-repeat="on"
            >⇨
              <div class="tooltip">5秒進む</div>
          </div>
        </div>
      </div>
      <div class="listInner">
        <ul>
          <li class="command" data-command="togglePlay">停止/再開</li>
          <li class="command" data-command="seekTo" data-param="0">先頭に戻る</li>
          <hr class="separator">
          <li class="command toggleLoop"        data-command="toggleLoop">リピート</li>
          <li class="command togglePlaylist"    data-command="togglePlaylist">連続再生</li>
          <li class="command toggleShowComment" data-command="toggleShowComment">コメントを表示</li>

          <hr class="separator">
          <li class="command"
            data-command="reload">動画のリロード</li>
          <li class="command"
            data-command="copy-video-watch-url">動画URLをコピー</li>
          <li class="command debug"
            data-command="toggle-debug">デバッグ</li>
          <li class="command mymemory"
            data-command="saveMymemory">コメントの保存</a></li>
        </ul>
      </div>
    </div>
  `).trim();


/**
 *  Video要素をラップした物
 *
 */
class VideoPlayer extends Emitter {
  constructor(params) {
    super();
    this._initialize(params);
  }

  _initialize(params) {
    //console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
    this._id = 'video' + Math.floor(Math.random() * 100000);
    this._resetVideo(params);

    util.addStyle(VideoPlayer.__css__);
  }

  _reset() {
    this.removeClass('is-play is-pause is-abort is-error');
    this._isPlaying = false;
    this._canPlay = false;
  }

  addClass(className) {
    this.toggleClass(className, true);
  }

  removeClass(className) {
    this.toggleClass(className, false);
  }

  toggleClass(className, v) {
    const body = this._body;
    className.split(/[ ]+/).forEach(name => {
      body.classList.toggle(name, v);
    });
  }

  _resetVideo(params) {
    params = params || {};
    if (this._videoElement) {
      params.autoplay = this._videoElement.autoplay;
      params.loop = this._videoElement.loop;
      params.mute = this._videoElement.muted;
      params.volume = this._videoElement.volume;
      params.playbackRate = this._videoElement.playbackRate;
      this._videoElement.remove();
    }

    const options = {
      autobuffer: true,
      preload: 'auto',
      mute: !!params.mute,
      'playsinline': true,
      'webkit-playsinline': true
    };

    const volume =
      params.hasOwnProperty('volume') ? parseFloat(params.volume) : 0.5;
    const playbackRate = this._playbackRate =
      params.hasOwnProperty('playbackRate') ? parseFloat(params.playbackRate) : 1.0;

    const video = util.createVideoElement();
    const body = document.createElement('div');
    util.$(body)
      .addClass(`videoPlayer nico ${this._id}`);
    util.$(video)
      .addClass('videoPlayer-video')
      .attr(options);
    body.id = 'ZenzaWatchVideoPlayerContainer';
    this._body = body;
    body.appendChild(video);

    this._video = video;
    this._video.className = 'zenzaWatchVideoElement';
    video.controlslist = 'nodownload';
    video.controls = false;
    video.autoplay = !!params.autoPlay;
    video.loop = !!params.loop;
    this._videoElement = video;

    this._isPlaying = false;
    this._canPlay = false;

    this.setVolume(volume);
    this.setMute(params.mute);
    this.setPlaybackRate(playbackRate);

    this._touchWrapper = new TouchWrapper({
      parentElement: body
    });
    this._touchWrapper.on('command', (command, param) => {
      if (command === 'contextMenu') {
        this._emit('contextMenu', param);
        return;
      }
      this.emit('command', command, param);
    });

    this._initializeEvents();

    ZenzaWatch.debug.video = this._video;
    Object.assign(ZenzaWatch.external, {
      getVideoElement: () => {
        return this._video;
      }
    });
  }

  _initializeEvents() {
    const eventBridge = function(name, ...args) {
      console.log('%c_on-%s:', 'background: cyan;', name, ...args);
      this.emit(name, ...args);
    };

    util.$(this._video)
      .on('canplay', this._onCanPlay.bind(this))
      .on('canplaythrough', eventBridge.bind(this, 'canplaythrough'))
      .on('loadstart', eventBridge.bind(this, 'loadstart'))
      .on('loadeddata', eventBridge.bind(this, 'loadeddata'))
      .on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'))
      .on('ended', eventBridge.bind(this, 'ended'))
      .on('emptied', eventBridge.bind(this, 'emptied'))
      .on('stalled', eventBridge.bind(this, 'stalled'))
      .on('suspend', eventBridge.bind(this, 'suspend'))
      .on('waiting', eventBridge.bind(this, 'waiting'))
      .on('progress', this._onProgress.bind(this))
      .on('durationchange', this._onDurationChange.bind(this))
      .on('abort', this._onAbort.bind(this))
      .on('error', this._onError.bind(this))
      .on('buffercomplete', eventBridge.bind(this, 'buffercomplete'))

      .on('pause', this._onPause.bind(this))
      .on('play', this._onPlay.bind(this))
      .on('playing', this._onPlaying.bind(this))
      .on('seeking', this._onSeeking.bind(this))
      .on('seeked', this._onSeeked.bind(this))
      .on('volumechange', this._onVolumeChange.bind(this))
      .on('contextmenu', eventBridge.bind(this, 'contextmenu'))
      .on('click', eventBridge.bind(this, 'click'))
    ;

    const touch = util.$(this._touchWrapper.body);
    touch
      .on('click', eventBridge.bind(this, 'click'))
      .on('dblclick', this._onDoubleClick.bind(this))
      .on('contextmenu', eventBridge.bind(this, 'contextmenu'))
      .on('wheel', this._onMouseWheel.bind(this))
    ;
  }

  _onCanPlay(...args) {
    console.log('%c_onCanPlay:', 'background: cyan; color: blue;', ...args);

    this.setPlaybackRate(this.getPlaybackRate());
    // リピート時にも飛んでくるっぽいので初回だけにする
    if (!this._canPlay) {
      this._canPlay = true;
      this.removeClass('is-loading');
      this.emit('canPlay', ...args);
      if (this._video.videoHeight < 1) {
        this._isAspectRatioFixed = false;
      } else {
        this._isAspectRatioFixed = true;
        this.emit('aspectRatioFix',
          this._video.videoHeight / Math.max(1, this._video.videoWidth));
      }
    }
  }

  _onProgress() {
    //console.log('%c_onProgress:', 'background: cyan;', arguments);
    this.emit('progress', this._video.buffered, this._video.currentTime);
  }

  _onDurationChange() {
    console.log('%c_onDurationChange:', 'background: cyan;', arguments);
    this.emit('durationChange', this._video.duration);
  }

  _onAbort() {
    if (this._isYouTube) {
      return;
    } // TODO: YouTube側のエラーハンドリング
    console.warn('%c_onAbort:', 'background: cyan; color: red;');
    this._isPlaying = false;
    this.addClass('is-abort');
    this.emit('abort');
  }

  _onError(e) {
    if (this._isYouTube) {
      return;
    }
    if (this._videoElement.src === CONSTANT.BLANK_VIDEO_URL || !this._videoElement.src || this._videoElement.src.match(/^https?:$/)) {
      return;
    }
    window.console.error('error src', this._video.src);
    window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
    this.addClass('is-error');
    this._canPlay = false;
    this.emit('error', {
      code: (e && e.target && e.target.error && e.target.error.code) || 0,
      target: e.target || this._video,
      type: 'normal'
    });
  }

  _onYouTubeError(e) {
    window.console.error('error src', this._video.src);
    window.console.error('%c_onError:', 'background: cyan; color: red;', e);
    this.addClass('is-error');
    this._canPlay = false;

    const code = e.data;
    const description = (() => {
      switch (code) {
        case 2:
          return 'YouTube Error: パラメータエラー (2 invalid parameter)';
        case 5:
          return 'YouTube Error: HTML5 関連エラー (5 HTML5 error)';
        case 100:
          return 'YouTube Error: 動画が見つからないか、非公開 (100 video not found)';
        case 101:
        case 150:
          return `YouTube Error: 外部での再生禁止 (${code} forbidden)`;
        default:
          return `YouTube Error: (code${code})`;
      }
    })();

    this.emit('error', {
      code,
      description,
      target: this._videoElement,
      type: 'youtube'
    });
  }

  _onPause() {
    console.log('%c_onPause:', 'background: cyan;', arguments);
    //this.removeClass('is-play');

    this._isPlaying = false;
    this.emit('pause');
  }

  _onPlay() {
    console.log('%c_onPlay:', 'background: cyan;', arguments);
    this.addClass('is-play');
    this._isPlaying = true;
    this.emit('play');
  }

  _onPlaying() {
    console.log('%c_onPlaying:', 'background: cyan;', arguments);
    this._isPlaying = true;

    if (!this._isAspectRatioFixed) {
      this._isAspectRatioFixed = true;
      this.emit('aspectRatioFix',
        this._video.videoHeight / Math.max(1, this._video.videoWidth));
    }

    this.emit('playing');
  }

  _onSeeking() {
    console.log('%c_onSeeking:', 'background: cyan;', arguments);
    this.emit('seeking', this._video.currentTime);
  }

  _onSeeked() {
    console.log('%c_onSeeked:', 'background: cyan;', arguments);

    // なぜかシークのたびにリセットされるので再設定 (Chromeだけ？)
    this.setPlaybackRate(this.getPlaybackRate());

    this.emit('seeked', this._video.currentTime);
  }

  _onVolumeChange() {
    console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
    this.emit('volumeChange', this.getVolume(), this.isMuted());
  }

  _onDoubleClick(e) {
    console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
    e.preventDefault();
    e.stopPropagation();
    this.emit('dblclick');
  }

  _onMouseWheel(e) {
    console.log('%c_onMouseWheel:', 'background: cyan;', e);
    e.preventDefault();
    e.stopPropagation();
    const delta = -parseInt(e.deltaY, 10);
    if (delta !== 0) {
      this.emit('mouseWheel', e, delta);
    }
  }

  canPlay() {
    return !!this._canPlay;
  }

  play() {
    if (this._currentVideo.currentTime === this.getDuration()) {
      this.setCurrentTime(0);
    }
    const p = this._video.play();
    // video.play()がPromiseを返すかどうかはブラウザによって異なるっぽい。。。
    if (p instanceof (Promise)) {
      return p.then(() => {
        this._isPlaying = true;
      });
    }
    this._isPlaying = true;
    return Promise.resolve();
  }

  pause() {
    this._video.pause();
    this._isPlaying = false;
    return Promise.resolve();
  }

  isPlaying() {
    return !!this._isPlaying && !!this._canPlay;
  }

  setThumbnail(url) {
    console.log('%csetThumbnail: %s', 'background: cyan;', url);

    this._thumbnail = url;
    this._video.poster = url;
    //this.emit('setThumbnail', url);
  }

  setSrc(url) {
    console.log('%csetSc: %s', 'background: cyan;', url);

    this._reset();

    this._src = url;
    this._isPlaying = false;
    this._canPlay = false;
    this._isAspectRatioFixed = false;
    this.addClass('is-loading');

    if (/(youtube\.com|youtu\.be)/.test(url)) {
      const currentTime = this._currentVideo.currentTime;
      this._initYouTube().then(() => {
        // 通常使用では(video|YouTube) -> YouTubeへの遷移しか存在しないので
        // 逆方向の想定は色々端折っている
        return this._videoYouTube.setSrc(url, currentTime);
      }).then(() => {
        this._changePlayer('YouTube');
      });
      return;
    }

    this._changePlayer('normal');
    if (url.indexOf('dmc.nico') >= 0) {
      this._video.crossOrigin = 'use-credentials';
    } else if (this._video.crossOrigin) {
      this._video.crossOrigin = null;
    }

    this._video.src = url;

  }

  get _isYouTube() {
    return this._videoYouTube && this._currentVideo === this._videoYouTube;
  }

  _initYouTube() {
    if (this._videoYouTube) {
      return Promise.resolve(this._videoYouTube);
    }
    const yt = this._videoYouTube = new YouTubeWrapper({
      parentNode: this._body.appendChild(document.createElement('div')),
      volume: this._volume,
      autoplay: this._videoElement.autoplay
    });
    const eventBridge = function(...args) {
      this.emit(...args);
    };

    yt.on('canplay', this._onCanPlay.bind(this));
    yt.on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'));
    yt.on('ended', eventBridge.bind(this, 'ended'));
    yt.on('stalled', eventBridge.bind(this, 'stalled'));
    yt.on('pause', this._onPause.bind(this));
    yt.on('play', this._onPlay.bind(this));
    yt.on('playing', this._onPlaying.bind(this));

    yt.on('seeking', this._onSeeking.bind(this));
    yt.on('seeked', this._onSeeked.bind(this));
    yt.on('volumechange', this._onVolumeChange.bind(this));
    yt.on('error', this._onYouTubeError.bind(this));

    ZenzaWatch.debug.youtube = yt;
    return Promise.resolve(this._videoYouTube);
  }

  _changePlayer(type) {
    switch (type.toLowerCase()) {
      case 'youtube':
        if (this._currentVideo !== this._videoYouTube) {
          const yt = this._videoYouTube;
          this.addClass('is-youtube');
          yt.autoplay = this._currentVideo.autoplay;
          yt.loop = this._currentVideo.loop;
          yt.muted = this._currentVideo.muted;
          yt.volume = this._currentVideo.volume;
          yt.playbackRate = this._currentVideo.playbackRate;
          this._currentVideo = yt;
          this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
          this.emit('playerTypeChange', 'youtube');
        }
        break;
      default:
        if (this._currentVideo === this._videoYouTube) {
          this.removeClass('is-youtube');
          this._videoElement.loop = this._currentVideo.loop;
          this._videoElement.muted = this._currentVideo.muted;
          this._videoElement.volume = this._currentVideo.volume;
          this._videoElement.playbackRate = this._currentVideo.playbackRate;
          this._currentVideo = this._videoElement;
          this._videoYouTube.src = '';
          this.emit('playerTypeChange', 'normal');
        }
        break;
    }
  }

  setVolume(vol) {
    vol = Math.max(Math.min(1, vol), 0);
    this._video.volume = vol;
  }

  getVolume() {
    return parseFloat(this._video.volume);
  }

  setMute(v) {
    v = !!v;
    if (this._video.muted !== v) {
      this._video.muted = v;
    }
  }

  isMuted() {
    return this._video.muted;
  }

  getCurrentTime() {
    if (!this._canPlay) {
      return 0;
    }
    return this._video.currentTime;
  }

  setCurrentTime(sec) {
    let cur = this._video.currentTime;
    if (cur !== sec) {
      this._video.currentTime = sec;
      this.emit('seek', this._video.currentTime);
    }
  }

  /**
   * fastSeekが使えたら使う。 現状Firefoxのみ？
   * - currentTimeによるシーク 位置は正確だが遅い
   * - fastSeekによるシーク キーフレームにしか飛べないが速い(FLashに近い)
   * なので、smile動画のループはこっちを使ったほうが再現度が高くなりそう
   */
  fastSeek(sec) {
    if (typeof this._video.fastSeek !== 'function' || this._isYouTube) {
      return this.setCurrentTime(sec);
    }
    // dmc動画はキーフレーム間隔が1秒とか意味不明な仕様なのでcurrentTimeでいい
    if (this._src.indexOf('dmc.nico') >= 0) {
      return this.setCurrentTime(sec);
    }
    this._video.fastSeek(sec);
    this.emit('seek', this._video.currentTime);
  }

  getDuration() {
    return this._video.duration;
  }

  togglePlay() {
    if (this.isPlaying()) {
      return this.pause();
    } else {
      return this.play();
    }
  }

  getVpos() {
    return this._video.currentTime * 100;
  }

  setVpos(vpos) {
    this._video.currentTime = vpos / 100;
  }

  getIsLoop() {
    return !!this._video.loop;
  }

  setIsLoop(v) {
    this._video.loop = !!v;
  }

  setPlaybackRate(v) {
    console.log('setPlaybackRate', v);
    //if (!ZenzaWatch.util.isPremium()) { v = Math.min(1, v); }
    // たまにリセットされたり反映されなかったりする？
    this._playbackRate = v;
    let video = this._video;
    video.playbackRate = 1;
    window.setTimeout(function () {
      video.playbackRate = parseFloat(v);
    }, 100);
  }

  getPlaybackRate() {
    return this._playbackRate;
  }

  getBufferedRange() {
    return this._video.buffered;
  }

  setIsAutoPlay(v) {
    this._video.autoplay = v;
  }

  getIsAutoPlay() {
    return this._video.autoPlay;
  }

  appendTo(node) {
    node.appendChild(this._body);
  }

  close() {
    this._video.pause();

    this._video.removeAttribute('src');
    this._video.removeAttribute('poster');

    // removeAttribute('src')では動画がクリアされず、
    // 空文字を指定しても base hrefと連結されて
    // http://www.nicovideo.jpへのアクセスが発生する. どないしろと.
    this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
    //window.console.info('src', this._video.src, this._video.getAttribute('src'));
    if (this._videoYouTube) {
      this._videoYouTube.src = '';
    }
  }

  /**
   * 画面キャプチャを取る。
   * CORSの制限があるので保存できない。
   */
  getScreenShot() {
    if (!this.isCorsReady()) {
      return null;
    }
    const video = this._video;
    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(video.drawableElement || video, 0, 0);
    return canvas;
  }

  isCorsReady() {
    return this._video.crossOrigin === 'use-credentials';
  }

  getVideoElement() {
    return this._videoElement;
  }

  get _video() {
    return this._currentVideo;
  }

  set _video(v) {
    this._currentVideo = v;
  }
}

VideoPlayer.__css__ = `
    .videoPlayer iframe,
    .videoPlayer .zenzaWatchVideoElement {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      z-index: 5;
    }

    /* iOSだとvideo上でマウスイベントが発生しないのでカバーを掛ける */
    .touchWrapper {
      display: block;
      position: absolute;
      opacity: 0;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
    }
    /* YouTubeのプレイヤーを触れる用にするための隙間 */
    .is-youtube .touchWrapper {
      width:  calc(100% - 100px);
      height: calc(100% - 150px);
    }

    .is-loading .touchWrapper,
    .is-error .touchWrapper {
      display: none !important;
    }

    .videoPlayer.is-youtube .zenzaWatchVideoElement {
      display: none;
    }

    .videoPlayer iframe {
      display: none;
    }

    .videoPlayer.is-youtube iframe {
      display: block;
      border: 1px dotted;
    }


  `.trim();


class TouchWrapper extends Emitter {
  constructor({parentElement}) {
    super();
    this._parentElement = parentElement;

    this._config = ZenzaWatch.config.namespace('touch');
    this._isTouching = false;
    this._maxCount = 0;
    this._currentTouches = [];

    this._debouncedOnSwipe2Y = _.debounce(this._onSwipe2Y.bind(this), 400);
    this._debouncedOnSwipe3X = _.debounce(this._onSwipe3X.bind(this), 400);
    this.initializeDom();
  }

  initializeDom() {
    let body = this._body = document.createElement('div');
    body.className = 'touchWrapper';

    body.addEventListener('click', this._onClick.bind(this));

    body.addEventListener('touchstart', this._onTouchStart.bind(this), {passive: true});
    body.addEventListener('touchmove', this._onTouchMove.bind(this));
    body.addEventListener('touchend', this._onTouchEnd.bind(this), {passive: true});
    body.addEventListener('touchcancel', this._onTouchCancel.bind(this), {passive: true});

    this._onTouchMoveThrottled =
      _.throttle(this._onTouchMoveThrottled.bind(this), 200);

    if (this._parentElement) {
      this._parentElement.appendChild(body);
    }
    ZenzaWatch.debug.touchWrapper = this;
  }

  get body() {
    return this._body;
  }

  _onClick() {
    this._lastTap = 0;
  }

  _onTouchStart(e) {
    let identifiers =
      this._currentTouches.map(touch => {
        return touch.identifier;
      });
    if (e.changedTouches.length > 1) {
      e.preventDefault();
    }

    Array.from(e.changedTouches).forEach(touch => {
      if (identifiers.includes(touch.identifier)) {
        return;
      }
      this._currentTouches.push(touch);
    });

    this._maxCount = Math.max(this._maxCount, this.touchCount);
    this._startCenter = this._getCenter(e);
    this._lastCenter = this._getCenter(e);
    this._isMoved = false;
  }

  _onTouchMove(e) {
    if (e.targetTouches.length > 1) {
      e.preventDefault();
    }
    this._onTouchMoveThrottled(e);
  }

  _onTouchMoveThrottled(e) {
    if (!e.targetTouches) {
      return;
    }
    if (e.targetTouches.length > 1) {
      e.preventDefault();
    }
    let startPoint = this._startCenter;
    let lastPoint = this._lastCenter;
    let currentPoint = this._getCenter(e);

    if (!startPoint || !currentPoint) {
      return;
    }
    let width = this._body.offsetWidth;
    let height = this._body.offsetHeight;
    let diff = {
      count: this.touchCount,
      startX: startPoint.x,
      startY: startPoint.y,
      currentX: currentPoint.x,
      currentY: currentPoint.y,
      moveX: currentPoint.x - lastPoint.x,
      moveY: currentPoint.y - lastPoint.y,
      x: currentPoint.x - startPoint.x,
      y: currentPoint.y - startPoint.y,
    };

    diff.perX = diff.x / width * 100;
    diff.perY = diff.y / height * 100;
    diff.perStartX = diff.startX / width * 100;
    diff.perStartY = diff.startY / height * 100;
    diff.movePerX = diff.moveX / width * 100;
    diff.movePerY = diff.moveY / height * 100;


    if (Math.abs(diff.perX) > 2 || Math.abs(diff.perY) > 1) {
      this._isMoved = true;
    }

    if (diff.count === 2) {
      if (Math.abs(diff.movePerX) >= 0.5) {
        this._execCommand('seekRelativePercent', diff);
      }
      if (Math.abs(diff.perY) >= 20) {
        this._debouncedOnSwipe2Y(diff);
      }
    }

    if (diff.count === 3) {
      if (Math.abs(diff.perX) >= 20) {
        this._debouncedOnSwipe3X(diff);
      }
    }

    this._lastCenter = currentPoint;
    return diff;
  }

  _onSwipe2Y(diff) {
    this._execCommand(diff.perY < 0 ? 'shiftUp' : 'shiftDown');
    this._startCenter = this._lastCenter;
  }

  _onSwipe3X(diff) {
    this._execCommand(diff.perX < 0 ? 'playNextVideo' : 'playPreviousVideo');
    this._startCenter = this._lastCenter;
  }

  _execCommand(command, param) {
    if (!this._config.getValue('enable')) {
      return;
    }
    if (!command) {
      return;
    }
    this.emit('command', command, param);
  }

  _onTouchEnd(e) {
    if (!e.changedTouches) {
      return;
    }
    let identifiers =
      Array.from(e.changedTouches).map(touch => {
        return touch.identifier;
      });
    let currentTouches = [];

    currentTouches = this._currentTouches.filter(touch => {
      return !identifiers.includes(touch.identifier);
    });

    this._currentTouches = currentTouches;

    //touchstartは複数タッチでも一回にまとまって飛んでくるが、
    //touchendは指の数だけ飛んでくるっぽい？
    //window.console.log('onTouchEnd', this._isMoved, e.changedTouches.length, this._maxCount, this.touchCount);
    if (!this._isMoved && this.touchCount === 0) {
      const config = this._config;
      this._lastTap = this._maxCount;
      window.console.info('touchEnd', this._maxCount, this._isMoved);
      switch (this._maxCount) {
        case 2:
          this._execCommand(config.getValue('tap2command'));
          break;
        case 3:
          this._execCommand(config.getValue('tap3command'));
          break;
        case 4:
          this._execCommand(config.getValue('tap4command'));
          break;
        case 5:
          this._execCommand(config.getValue('tap5command'));
          break;
      }
      this._maxCount = 0;
      this._isMoved = false;
    }

  }

  _onTouchCancel(e) {
    if (!e.changedTouches) {
      return;
    }
    let identifiers =
      Array.from(e.changedTouches).map(touch => {
        return touch.identifier;
      });
    let currentTouches = [];

    window.console.log('onTouchCancel', this._isMoved, e.changedTouches.length);
    currentTouches = this._currentTouches.filter(touch => {
      return !identifiers.includes(touch.identifier);
    });

    this._currentTouches = currentTouches;
  }

  get touchCount() {
    return this._currentTouches.length;
  }

  _getCenter(e) {
    let x = 0, y = 0;
    Array.from(e.touches).forEach(t => {
      x += t.pageX;
      y += t.pageY;
    });
    return {x: x / e.touches.length, y: y / e.touches.length};
  }
}


//===END===

export {
  NicoVideoPlayer,
  ContextMenu,
  VideoPlayer
};
