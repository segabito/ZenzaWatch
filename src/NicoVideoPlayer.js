var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var FullScreen = {};
var NicoCommentPlayer = function() {};
var AsyncEmitter = function() {};
const CONSTANT = {};
class VideoCaptureUtil {}
const Config = {};
const util = {};
class BaseViewComponent {}

//===BEGIN===


  /**
   * VideoPlayer + CommentPlayer = NicoVideoPlayer
   *
   * とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
   *
   */
  var NicoVideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoVideoPlayer.prototype, AsyncEmitter.prototype);
  _.assign(NicoVideoPlayer.prototype, {
    initialize: function(params) {
      var conf = this._playerConfig = params.playerConfig;

      this._fullScreenNode = params.fullScreenNode;
      this._playerState = params.playerState;

      const playbackRate = conf.getValue('playbackRate');

      const onCommand = (command, param) => { this.emit('command', command, param); };
      this._videoPlayer = new VideoPlayer({
        volume:       conf.getValue('volume'),
        loop:         conf.getValue('loop'),
        mute:         conf.getValue('mute'),
        autoPlay:     conf.getValue('autoPlay'),
        playbackRate,
        debug:        conf.getValue('debug')
      });
      this._videoPlayer.on('command', onCommand);

      this._commentPlayer = new NicoCommentPlayer({
        offScreenLayer: params.offScreenLayer,
        enableFilter:   params.enableFilter,
        wordFilter:         params.wordFilter,
        wordRegFilter:      params.wordRegFilter,
        wordRegFilterFlags: params.wordRegFilterFlags,
        userIdFilter:   params.userIdFilter,
        commandFilter:  params.commandFilter,
        showComment:    conf.getValue('showComment'),
        debug:          conf.getValue('debug'),
        playbackRate,
        sharedNgLevel:  conf.getValue('sharedNgLevel')
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
    _beginTimer: function() {
      this._stopTimer();
      this._videoWatchTimer =
        window.setInterval(this._onTimer.bind(this), 100);
    },
    _stopTimer: function() {
      if (!this._videoWatchTimer) { return; }
      window.clearInterval(this._videoWatchTimer);
      this._videoWatchTimer = null;
    },
    _initializeEvents: function() {
      this._videoPlayer.on('volumeChange', _.bind(this._onVolumeChange, this));
      this._videoPlayer.on('dblclick', _.bind(this._onDblClick, this));
      this._videoPlayer.on('aspectRatioFix', _.bind(this._onAspectRatioFix, this));
      this._videoPlayer.on('play',    _.bind(this._onPlay, this));
      this._videoPlayer.on('playing', _.bind(this._onPlaying, this));
      this._videoPlayer.on('stalled', _.bind(this._onStalled, this));
      this._videoPlayer.on('progress', _.bind(this._onProgress, this));
      this._videoPlayer.on('pause',   _.bind(this._onPause, this));
      this._videoPlayer.on('ended', _.bind(this._onEnded, this));
      this._videoPlayer.on('loadedMetaData', _.bind(this._onLoadedMetaData, this));
      this._videoPlayer.on('canPlay', _.bind(this._onVideoCanPlay, this));
      this._videoPlayer.on('durationChange', _.bind(this._onDurationChange, this));

      // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
      this._videoPlayer.on('mouseWheel',
        _.throttle(this._onMouseWheel.bind(this), 50));

      this._videoPlayer.on('abort', this._onAbort.bind(this));
      this._videoPlayer.on('error', this._onError.bind(this));

      this._videoPlayer.on('click', this._onClick.bind(this));
      this._videoPlayer.on('contextMenu', this._onContextMenu.bind(this));

      this._commentPlayer.on('parsed', this._onCommentParsed.bind(this));
      this._commentPlayer.on('change', this._onCommentChange.bind(this));
      this._commentPlayer.on('filterChange', this._onCommentFilterChange.bind(this));
      //this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
      this._playerState.on('change', this._onPlayerStateChange.bind(this));
    },
    _onVolumeChange: function(vol, mute) {
      this._playerConfig.setValue('volume', vol);
      this._playerConfig.setValue('mute', mute);
      this.emit('volumeChange', vol, mute);
    },
    _onPlayerStateChange: function(key, value) {
      switch (key) {
        case 'isLoop':
          this._videoPlayer.setIsLoop(value);
          break;
        case 'playbackRate':
          //if (!ZenzaWatch.util.isPremium()) { value = Math.min(1, value); }
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
    _onMouseWheel: function(e, delta) {
      // 下げる時は「うわ音でけぇ」
      // 上げる時は「ちょっと上げようかな」
      // なので下げる速度のほうが速い
      if (delta > 0) { // up
        this.volumeUp();
      } else {         // down
        this.volumeDown();
      }
    },
    volumeUp: function() {
      var v = Math.max(0.01, this._videoPlayer.getVolume());
      var r = (v < 0.05) ? 1.3 : 1.1;
      this._videoPlayer.setVolume(v * r);
    },
    volumeDown: function() {
      var v = this._videoPlayer.getVolume();
      this._videoPlayer.setVolume(v / 1.2);
    },
    _onTimer: function() {
      var currentTime = this._videoPlayer.getCurrentTime();
      this._commentPlayer.setCurrentTime(currentTime);
    },
    _onAspectRatioFix: function(ratio) {
      this._commentPlayer.setAspectRatio(ratio);
      this.emit('aspectRatioFix', ratio);
    },
    _onLoadedMetaData: function() {
      this.emit('loadedMetaData');
    },
    _onVideoCanPlay: function() {
      this.emit('canPlay');
    },
    _onDurationChange: function(duration) {
      this.emit('durationChange', duration);
    },
    _onPlay: function() {
      this._isPlaying = true;
      this.emit('play');
    },
    _onPlaying: function() {
      this._isPlaying = true;
      this.emit('playing');
    },
    _onPause: function() {
      this._isPlaying = false;
      this.emit('pause');
    },
    _onStalled: function() {
      this.emit('stalled');
    },
    _onProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onEnded: function() {
      this._isPlaying = false;
      this._isEnded = true;
      this.emit('ended');
    },
    _onError: function(e) {
      this.emit('error', e);
    },
    _onAbort: function() {
      this.emit('abort');
    },
    _onClick: function() {
      this._contextMenu.hide();
    },
    _onDblClick: function() {
      if (this._playerConfig.getValue('enableFullScreenOnDoubleClick')) {
        this.toggleFullScreen();
      }
    },
    _onContextMenu: function(e) {
      // コンテキストメニューが出ていないときだけ出す
      // すでに出ているときはブラウザネイティブのメニュー
      if (!this._contextMenu.isOpen) {
        e.stopPropagation();
        e.preventDefault();
        this._contextMenu.show(e.offsetX, e.offsetY);
      }
    },
    _onCommentParsed: function() {
      this.emit('commentParsed');
    },
    _onCommentChange: function() {
      this.emit('commentChange');
    },
    _onCommentFilterChange: function(nicoChatFilter) {
      this.emit('commentFilterChange', nicoChatFilter);
    },
    setVideo: function(url) {
      this._videoPlayer.setSrc(url);
      this._isEnded = false;
    },
    setThumbnail: function(url) {
      this._videoPlayer.setThumbnail(url);
    },
    play: function() {
      return this._videoPlayer.play();
    },
    pause: function() {
      this._videoPlayer.pause();
      return Promise.resolve();
    },
    togglePlay: function() {
      return this._videoPlayer.togglePlay();
    },
    setPlaybackRate: function(playbackRate) {
      //if (!ZenzaWatch.util.isPremium()) { playbackRate = Math.min(1, playbackRate); }
      playbackRate = Math.max(0, Math.min(playbackRate, 10));
      this._videoPlayer.setPlaybackRate(playbackRate);
      this._commentPlayer.setPlaybackRate(playbackRate);
    },
    setCurrentTime: function(t) {
      this._videoPlayer.setCurrentTime(Math.max(0, t));
    },
    getDuration: function() {
      return this._videoPlayer.getDuration();
    },
    getCurrentTime: function() {
      return this._videoPlayer.getCurrentTime();
    },
    getVpos: function() {
      return Math.floor(this._videoPlayer.getCurrentTime() * 100);
    },
    setComment: function(xmlText, options) {
      this._commentPlayer.setComment(xmlText, options);
    },
    getChatList: function() {
      return this._commentPlayer.getChatList();
    },
    getNonFilteredChatList: function() {
      return this._commentPlayer.getNonFilteredChatList();
    },
    setVolume: function(v) {
      this._videoPlayer.setVolume(v);
    },
    appendTo: function(node) {
      var $node = typeof node === 'string' ? $(node) : node;
      this._$parentNode = node;
      this._videoPlayer.appendTo($node[0]);
      this._commentPlayer.appendTo($node);
    },
    close: function() {
      this._videoPlayer.close();
      this._commentPlayer.close();
    },
    closeCommentPlayer: function() {
      this._commentPlayer.close();
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
    canPlay: function() {
      return this._videoPlayer.canPlay();
    },
    isPlaying: function() {
      return !!this._isPlaying;
    },
    getBufferedRange: function() {
      return this._videoPlayer.getBufferedRange();
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._commentPlayer) {
        return;
      }
      var nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
      console.log('addChat:', text, cmd, vpos, options, nicoChat);
      return nicoChat;
    },
    setIsCommentFilterEnable: function(v) {
      this._commentPlayer.setIsFilterEnable(v);
    },
    isCommentFilterEnable: function() {
      return this._commentPlayer.isFilterEnable();
    },
    setSharedNgLevel: function(level) {
      this._commentPlayer.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._commentPlayer.getSharedNgLevel();
    },

    addWordFilter: function(text) {
      this._commentPlayer.addWordFilter(text);
    },
    setWordFilterList: function(list) {
      this._commentPlayer.setWordFilterList(list);
    },
    getWordFilterList: function() {
      return this._commentPlayer.getWordFilterList();
    },

    addUserIdFilter: function(text) {
      this._commentPlayer.addUserIdFilter(text);
    },
    setUserIdFilterList: function(list) {
      this._commentPlayer.setUserIdFilterList(list);
    },
    getUserIdFilterList: function() {
      return this._commentPlayer.getUserIdFilterList();
    },

    getCommandFilterList: function() {
      return this._commentPlayer.getCommandFilterList();
    },
    addCommandFilter: function(text) {
      this._commentPlayer.addCommandFilter(text);
    },
    setCommandFilterList: function(list) {
      this._commentPlayer.setCommandFilterList(list);
    },
    setVideoInfo: function(info) {
      this._videoInfo = info;
    },
    getVideoInfo: function() {
      return this._videoInfo;
    },
    getMymemory: function() {
      return this._commentPlayer.getMymemory();
    },
    getScreenShot: function() {
      window.console.time('screenShot');

      const fileName = this._getSaveFileName();
      const video = this._videoPlayer.getVideoElement();

      return VideoCaptureUtil.videoToCanvas(video).then(({canvas}) => {
        VideoCaptureUtil.saveToFile(canvas, fileName);
        window.console.timeEnd('screenShot');
      });
    },
    getScreenShotWithComment: function() {
      window.console.time('screenShotWithComment');

      const fileName = this._getSaveFileName({suffix: 'C'});
      const video = this._videoPlayer.getVideoElement();
      const html = this._commentPlayer.getCurrentScreenHtml();

      //return VideoCaptureUtil.htmlToCanvas({html, video}).then(({canvas}) => {
      //  VideoCaptureUtil.saveToFile(canvas, fileName);
      //  window.console.timeEnd('screenShotWithComment');
      //});
      return VideoCaptureUtil.nicoVideoToCanvas({video, html}).then(({canvas}) => {
        VideoCaptureUtil.saveToFile(canvas, fileName);
        window.console.timeEnd('screenShotWithComment');
      });
    },
    _getSaveFileName: function({suffix = ''} = {}) {
      const title = this._videoInfo.getTitle();
      const watchId = this._videoInfo.getWatchId();
      const currentTime = this._videoPlayer.getCurrentTime();
      const min = Math.floor(currentTime / 60);
      const sec = (currentTime % 60 + 100).toString().substr(1, 6);
      const time = `${min}_${sec}`;
      const prefix = Config.getValue('screenshot.prefix') || '';

      return `${prefix}${title} - ${watchId}@${time}${suffix}.png`;
    },
    isCorsReady: function() {
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
      this._bound.onBodyMouseUp   = this._onBodyMouseUp.bind(this);
      this._bound.onRepeat = this._onRepeat.bind(this);
      this._view.addEventListener('mousedown', onMouseDown);
      this._view.addEventListener('contextMenu', (e) => {
        e.preventDefault(); e.stopPropagation();
      });
     }

    _onClick(e) {
      if (e.type !== 'mousedown') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      super._onClick(e);
    }

    _onMouseDown(e) {
      if (e.target && e.target.getAttribute('data-repeat') === 'on') {
        e.stopPropagation();
        this._onClick(e);
        this._beginRepeat(e);
      } else {
        this.hide();
        this._onClick(e);
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
      this.isRepeating = false;
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
      this._onClick(this._repeatEvent);
    }

    show(x, y) {
      document.body.addEventListener('click', this._bound.onBodyClick);
      const view = this._view;

      this._onBeforeShow(x, y);

      view.style.left =
        Math.max(0, Math.min(x, window.innerWidth  - view.offsetWidth)) + 'px';
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
      z-index: 150000;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
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
      margin: 2px 6px;
      overflow-y: visible;
      white-space: nowrap;
      cursor: pointer;
      padding: 2px 10px;
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
            data-param="2.0" data-type="number" data-repeat="on">
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
          <li class="command debug"
            data-command="toggle-debug">デバッグ</li>
          <li class="command screenShot"
            data-command="screenShot">スクリーンショットの保存</a></li>
          <li class="command mymemory"
            data-command="saveMymemory">コメントの保存</a></li>
        </ul>
      </div>
    </div>
  `).trim();





  /**
   *  Video要素をラップした物
   *  操作パネル等を自前で用意したいが、まだ手が回らない。
   *
   *  いずれは同じインターフェースのflash版も作って、swf/flv等の再生もサポートしたい。
   */
  var VideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoPlayer.prototype, AsyncEmitter.prototype);
  _.assign(VideoPlayer.prototype, {
    initialize: function(params) {
      //console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
      this._id = 'video' + Math.floor(Math.random() * 100000);
      this._resetVideo(params);
    },
    _reset: function() {
      this.removeClass('is-play is-pause is-abort is-error');
      this._isPlaying = false;
      this._canPlay = false;
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      var video = this._video;
      _.each(className.split(/[ ]+/), function(name) {
        video.classList.toggle(name, v);
      });
    },
    _resetVideo: function(params) {
      params = params || {};
      if (this._video) {
        params.autoPlay = this._video.autoplay;
        params.loop     = this._video.loop;
        params.mute     = this._video.muted;
        params.volume   = this._video.volume;
        params.playbackRate = this._video.playbackRate;
        this._video.remove();
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

      const video = document.createElement('video');
      util.$(video)
        .addClass(`videoPlayer nico ${this._id}`)
        .attr(options);
      this._video = video;
      this._video.controls = false;
      this._video.autoplay = !!params.autoPlay;
      this._video.loop     = !!params.loop;

      this._isPlaying = false;
      this._canPlay = false;

      this.setVolume(volume);
      this.setMute(params.mute);
      this.setPlaybackRate(playbackRate);

      this._initializeEvents();

      ZenzaWatch.debug.video = this._video;
      Object.assign(ZenzaWatch.external, {getVideoElement: () => { return this._video; }});

    },
    _initializeEvents: function() {
      util.$(this._video)
        .on('canplay',        this._onCanPlay        .bind(this))
        .on('canplaythrough', this._onCanPlayThrough .bind(this))
        .on('loadstart',      this._onLoadStart      .bind(this))
        .on('loadeddata',     this._onLoadedData     .bind(this))
        .on('loadedmetadata', this._onLoadedMetaData .bind(this))
        .on('ended',          this._onEnded          .bind(this))
        .on('emptied',        this._onEmptied        .bind(this))
        .on('stalled',        this._onStalled        .bind(this))
        .on('suspend',        this._onSuspend        .bind(this))
        .on('waiting',        this._onWaiting        .bind(this))
        .on('progress',       this._onProgress       .bind(this))
        .on('durationchange', this._onDurationChange .bind(this))
        .on('resize',         this._onResize         .bind(this))
        .on('abort',          this._onAbort          .bind(this))
        .on('error',          this._onError          .bind(this))
                                                            
        .on('pause',          this._onPause          .bind(this))
        .on('play',           this._onPlay           .bind(this))
        .on('playing',        this._onPlaying        .bind(this))
        .on('seeking',        this._onSeeking        .bind(this))
        .on('seeked',         this._onSeeked         .bind(this))
        .on('volumechange',   this._onVolumeChange   .bind(this))
                                                            
                                                            
        .on('click',          this._onClick          .bind(this))
        .on('dblclick',       this._onDoubleClick    .bind(this))
        .on('wheel',          this._onMouseWheel     .bind(this))
        .on('contextmenu',    this._onContextMenu    .bind(this))
        ;
    },
    _onCanPlay: function() {
      console.log('%c_onCanPlay:', 'background: cyan; color: blue;', arguments);

      this.setPlaybackRate(this.getPlaybackRate());
      // リピート時にも飛んでくるっぽいので初回だけにする
      if (!this._canPlay) {
        this._canPlay = true;
        this._video.classList.remove('is-loading');
        this.emit('canPlay');
        this.emit('aspectRatioFix',
          this._video.videoHeight / Math.max(1, this._video.videoWidth));
      }
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
    _onSuspend: function() {
      console.log('%c_onSuspend:', 'background: cyan;', arguments);
      this.emit('suspend');
    },
    _onWaiting: function() {
      console.log('%c_onWaiting:', 'background: cyan;', arguments);
      this.emit('waiting');
    },
    _onProgress: function() {
      //console.log('%c_onProgress:', 'background: cyan;', arguments);
      this.emit('progress', this._video.buffered, this._video.currentTime);
    },
    _onDurationChange: function() {
      console.log('%c_onDurationChange:', 'background: cyan;', arguments);
      this.emit('durationChange', this._video.duration);
    },
    _onResize: function() {
      console.log('%c_onResize:', 'background: cyan;', arguments);
      this.emit('resize');
    },
    _onAbort: function() {
      window.console.warn('%c_onAbort:', 'background: cyan; color: red;', arguments);
      this._isPlaying = false;
      this.addClass('is-abort');
      this.emit('abort');
    },
    _onError: function(e) {
      if (this._video.getAttribute('src') === CONSTANT.BLANK_VIDEO_URL) { return; }
      window.console.error('error src', this._video.src);
      window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
      this.addClass('is-error');
      this._canPlay = false;
      this.emit('error', {
        code: e.target.error.code,
        target: e.target
      });
    },
    _onPause: function() {
      console.log('%c_onPause:', 'background: cyan;', arguments);
      this.removeClass('is-play');

      this._isPlaying = false;
      this.emit('pause');
    },
    _onPlay: function() {
      console.log('%c_onPlay:', 'background: cyan;', arguments);
      this.addClass('is-play');
      this._isPlaying = true;

      //this._subVideo.pause();
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
      console.log('%c_onMouseWheel:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      const delta = - parseInt(e.deltaY, 10);
      //window.console.log('wheel', e, delta);
      if (delta !== 0) {
        this.emit('mouseWheel', e, delta);
      }
    },
    _onContextMenu: function(e) {
      //console.log('%c_onContextMenu:', 'background: cyan;', e);
      //e.preventDefault();
      //e.stopPropagation();
      this.emit('contextMenu', e);
    },
    canPlay: function() {
      return !!this._canPlay;
    },
    play: function() {
      const p = this._video.play();
      // video.play()がPromiseを返すかどうかはブラウザによって異なるっぽい。。。
      if (p instanceof (Promise)) {
        return p.then(() => {
          this._isPlaying = true;
        });
      }
      this._isPlaying = true;
      return Promise.resolve();
    },
    pause: function() {
      this._video.pause();
      this._isPlaying = false;
      return Promise.resolve();
    },
    isPlaying: function() {
      return !!this._isPlaying && !!this._canPlay;
    },
    setThumbnail: function(url) {
      console.log('%csetThumbnail: %s', 'background: cyan;', url);

      this._thumbnail = url;
      this._video.poster = url;
      //this.emit('setThumbnail', url);
    },
    setSrc: function(url) {
      console.log('%csetSc: %s', 'background: cyan;', url);

      this._reset();

      if (url.indexOf('dmc.nico') >= 0) {
        this._video.crossOrigin = 'use-credentials';
      } else if (this._video.crossOrigin) {
        this._video.crossOrigin = null;
      }

      this._src = url;
      this._video.src = url;
      //this._$subVideo.attr('src', url);
      this._isPlaying = false;
      this._canPlay = false;
      //this.emit('setSrc', url);
      this.addClass('is-loading');
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
    getDuration: function() {
      return this._video.duration;
    },
    togglePlay: function() {
      if (this.isPlaying()) {
        return this.pause();
      } else {
        return this.play();
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
      //if (!ZenzaWatch.util.isPremium()) { v = Math.min(1, v); }
      // たまにリセットされたり反映されなかったりする？
      this._playbackRate = v;
      var video = this._video;
      video.playbackRate = 1;
      window.setTimeout(function() { video.playbackRate = parseFloat(v); }, 100);
      
    },
    getPlaybackRate: function() {
      return this._playbackRate; //parseFloat(this._video.playbackRate) || 1.0;
    },
    getBufferedRange: function() {
      return this._video.buffered;
    },
    setIsAutoPlay: function(v) {
      this._video.autoplay = v;
    },
    getIsAutoPlay: function() {
      return this._video.autoPlay;
    },
    appendTo: function(node) {
      node.appendChild(this._video);
    },
    close: function() {
      this._video.pause();

      this._video.removeAttribute('src');
      this._video.removeAttribute('poster');

      // removeAttribute('src')では動画がクリアされず、
      // 空文字を指定しても base hrefと連結されて
      // http://www.nicovideo.jpへのアクセスが発生する. どないしろと.
      this._video.src = CONSTANT.BLANK_VIDEO_URL;
      //window.console.info('src', this._video.src, this._video.getAttribute('src'));

      //this._subVideo.removeAttribute('src');
    },
    /**
     * 画面キャプチャを取る。
     * CORSの制限があるので保存できない。
     */
    getScreenShot: function() {
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
      context.drawImage(video, 0, 0);
      return canvas;
    },
    isCorsReady: function() {
      return this._video.crossOrigin === 'use-credentials';
    },
    getVideoElement: function() {
      return this._video;
    }
  });



//===END===

