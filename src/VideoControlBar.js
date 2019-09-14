// import * as _ from 'lodash';
import {ZenzaWatch, global} from './ZenzaWatchIndex';
import {CONSTANT} from './constant';
import {SeekBarThumbnail, Storyboard} from './StoryBoard';
import {util, BaseViewComponent} from './util';
import {Emitter} from './baselib';
import {bounce} from '../packages/lib/src/infra/bounce';
import {HeatMapWorker} from '../packages/zenza/src/heatMap/HeatMapWorker';
import {WatchInfoCacheDb} from '../packages/lib/src/nico/WatchInfoCacheDb';
import {TextLabel} from '../packages/lib/src/ui/TextLabel';
import {cssUtil} from '../packages/lib/src/css/css';
import {RequestAnimationFrame} from '../packages/lib/src/infra/RequestAnimationFrame';

//===BEGIN===

  class VideoControlBar extends Emitter {
    constructor(...args) {
      super();
      this.initialize(...args);
    }
    initialize(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      this._playerState         = params.playerState;
      this._currentTimeGetter   = params.currentTimeGetter;
      const player = this._player = params.player;

      player.on('open',           this._onPlayerOpen.bind(this));
      player.on('canPlay',        this._onPlayerCanPlay.bind(this));
      player.on('durationChange', this._onPlayerDurationChange.bind(this));
      player.on('close',          this._onPlayerClose.bind(this));
      player.on('progress',       this._onPlayerProgress.bind(this));
      player.on('loadVideoInfo',  this._onLoadVideoInfo.bind(this));
      player.on('commentParsed',  _.debounce(this._onCommentParsed.bind(this), 500));
      player.on('commentChange',  _.debounce(this._onCommentChange.bind(this), 100));

      this._isWheelSeeking = false;
      this._initializeDom();
      this._initializePlaybackRateSelectMenu();
      this._initializeVolumeControl();
      this._initializeVideoServerTypeSelectMenu();
      this._isFirstVideoInitialized = false;

      global.debug.videoControlBar = this;
    }
    _initializeDom() {
      const $view = this._$view = util.$.html(VideoControlBar.__tpl__);
      const $container = this._$playerContainer;
      const config = this._playerConfig;
      this._view = $view[0];

      const mq = $view.mapQuery({
        _seekBarContainer: '.seekBarContainer',
        _seekBar: '.seekBar',
        _currentTime: '.currentTime',
        _duration: '.duration',
        _playbackRateMenu: '.playbackRateMenu',
        _playbackRateSelectMenu: '.playbackRateSelectMenu',
        _videoServerTypeMenu: '.videoServerTypeMenu',
        _videoServerTypeSelectMenu: '.videoServerTypeSelectMenu',
        _resumePointer: 'zenza-seekbar-label',
        _bufferRange: '.bufferRange',
        _seekRange: '.seekRange',
        _seekBarPointer: '.seekBarPointer'
      });
      Object.assign(this, mq.e, {_currentTime: 0});
      Object.assign(this, mq.$);
      util.$(this._seekRange).on('input', this._onSeekRangeInput.bind(this));

      this._pointer = new SmoothSeekBarPointer({
        pointer: this._seekBarPointer,
        playerState: this._playerState
      });
      const timeStyle = {
        widthPx: 44,
        heightPx: 18,
        fontFamily: '\'Yu Gothic\', \'YuGothic\', \'Courier New\', Osaka-mono, \'ＭＳ ゴシック\', monospace',
        fontWeight: '',
        fontSizePx: 12,
        color: '#fff'
      };
      TextLabel.create({
        container: $view.find('.currentTimeLabel')[0],
        name: 'currentTimeLabel',
        text: '00:00',
        style: timeStyle
      }).then(label => this.currentTimeLabel = label);
      TextLabel.create({
        container: $view.find('.durationLabel')[0],
        name: 'durationLabel',
        text: '00:00',
        style: timeStyle
      }).then(label => this.durationLabel = label);

      this._$seekBar
        .on('mousedown', this._onSeekBarMouseDown.bind(this))
        .on('mousemove', this._onSeekBarMouseMove.bind(this));

      $view
        .on('click', this._onClick.bind(this))
        .on('command', this._onCommandEvent.bind(this));

      HeatMapWorker.init({container: this._seekBar}).then(hm => this._heatMap = hm);
      const updateHeatMapVisibility =
        v => this._$seekBarContainer.toggleClass('noHeatMap', !v);
      updateHeatMapVisibility(this._playerConfig.props.enableHeatMap);
      this._playerConfig.onkey('enableHeatMap', updateHeatMapVisibility);
      global.emitter.on('heatMapUpdate', heatMap => {
        WatchInfoCacheDb.put(this._player.watchId, {heatMap});
      });

      this._storyboard = new Storyboard({
        playerConfig: config,
        player: this._player,
        container: $view[0]
      });

      this._seekBarToolTip = new SeekBarToolTip({
        $container: this._$seekBarContainer,
        storyboard: this._storyboard
      });

      this._commentPreview = new CommentPreview({
        $container: this._$seekBarContainer
      });
      const updateEnableCommentPreview = v => {
        this._$seekBarContainer.toggleClass('enableCommentPreview', v);
        this._commentPreview.mode = v ? 'list' : 'hover';
      };

      updateEnableCommentPreview(config.props.enableCommentPreview);
      config.onkey('enableCommentPreview', updateEnableCommentPreview);

      const watchElement = $container[0].closest('#zenzaVideoPlayerDialog');
      this._wheelSeeker = new WheelSeeker({
        parentNode: $view[0],
        watchElement
      });

      watchElement.addEventListener('mousedown', e => {
        if (['A', 'INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          return;
        }
        if (e.buttons !== 3 && !(e.button === 0 && e.shiftKey)) {
          return;
        }
        if (e.buttons === 3) {
          watchElement.addEventListener('contextmenu', e => {
            window.console.log('contextmenu', e);
            e.preventDefault();
            e.stopPropagation();
          }, {once: true, capture: true});
        }
        this._onSeekBarMouseDown(e);
      });

      global.emitter.on('hideHover', () => {
        this._hideMenu();
        this._commentPreview.hide();
      });

      $container.append($view);
      this._width = window.innerWidth;
    }
    _initializePlaybackRateSelectMenu() {
      const config = this._playerConfig;
      const $btn  = this._$playbackRateMenu;
      const [label] = $btn.find('.controlButtonInner');
      const $menu = this._$playbackRateSelectMenu;
      const $rates = $menu.find('.playbackRate');

      const updatePlaybackRate = rate => {
        label.textContent = `x${rate}`;
        $menu.find('.selected').removeClass('selected');
        let fr = Math.floor( parseFloat(rate, 10) * 100) / 100;
        $rates.forEach(item => {
          let r = parseFloat(item.dataset.param, 10);
          if (fr === r) {
            item.classList.add('selected');
          }
        });
        this._pointer.playbackRate = rate;
      };

      updatePlaybackRate(config.props.playbackRate);
      config.onkey('playbackRate', updatePlaybackRate);
    }
    _initializeVolumeControl() {
      const $vol = this._$view.find('zenza-range-bar input[type="range"]');
      const [vol] = $vol;

      const setVolumeBar = this._setVolumeBar = v => (vol.view || vol).value = v;
      $vol.on('input', e => util.dispatchCommand(e.target, 'volume', e.target.value));
      setVolumeBar(this._playerConfig.props.volume);
      this._playerConfig.onkey('volume', setVolumeBar);
    }
    _initializeVideoServerTypeSelectMenu() {
      const config = this._playerConfig;
      const $button = this._$videoServerTypeMenu;
      const $select  = this._$videoServerTypeSelectMenu;
      const $current = $select.find('.currentVideoQuality');

      const updateSmileVideoQuality = value => {
        const $dq = $select.find('.smileVideoQuality');
        $dq.removeClass('selected');
        $select.find('.select-smile-' + (value === 'eco' ? 'economy' : 'default')).addClass('selected');
      };

      const updateDmcVideoQuality = value => {
        const $dq = $select.find('.dmcVideoQuality');
        $dq.removeClass('selected');
        $select.find('.select-dmc-' + value).addClass('selected');
      };

      const onVideoServerType = (type, videoSessionInfo) => {
        $button.removeClass('is-smile-playing is-dmc-playing')
          .addClass(`is-${type === 'dmc' ? 'dmc' : 'smile'}-playing`);
        $select.find('.serverType').removeClass('selected');
        $select.find(`.select-server-${type === 'dmc' ? 'dmc' : 'smile'}`).addClass('selected');
        $current.text(type !== 'dmc' ? '----' : videoSessionInfo.videoFormat.replace(/^.*h264_/, ''));
      };

      updateSmileVideoQuality(config.props.smileVideoQuality);
      updateDmcVideoQuality(config.props.dmcVideoQuality);
      config.onkey('forceEconomy',    updateSmileVideoQuality);
      config.onkey('dmcVideoQuality', updateDmcVideoQuality);

      this._player.on('videoServerType', onVideoServerType);
    }
    _onCommandEvent(e) {
      const command = e.detail.command;
      switch (command) {
        case 'toggleStoryboard':
          this._storyboard.toggle();
          break;
        case 'wheelSeek-start':
          window.console.log('start-seek-start');
          this._isWheelSeeking = true;
          this._wheelSeeker.currentTime = this._player.currentTime;
          this._view.classList.add('is-wheelSeeking');
          break;
        case 'wheelSeek-end':
          window.console.log('start-seek-end');
          this._isWheelSeeking = false;
          this._view.classList.remove('is-wheelSeeking');
          break;
        case 'wheelSeek':
          this._onWheelSeek(e.detail.param);
          break;
        default:
          return;
      }
      e.stopPropagation();
    }
    _onClick(e) {
      e.preventDefault();

      const target = e.target.closest('[data-command]');
      if (!target) {
        return;
      }
      let {command, param, type} = target.dataset;
      if (param && (type === 'bool' || type === 'json')) {
        param = JSON.parse(param);
      }
      switch (command) {
        case 'toggleStoryboard':
          this._storyboard.toggle();
          break;
        default:
          util.dispatchCommand(target, command, param);
          break;
       }
      e.stopPropagation();
    }
    _posToTime(pos) {
      const width = this._innerWidth = this._innerWidth || window.innerWidth;
      return this._duration * (pos / Math.max(width, 1));
    }
    _timeToPos(time) {
      return this._width * (time / Math.max(this._duration, 1));
    }
    _timeToPer(time) {
      return (time / Math.max(this._duration, 1)) * 100;
    }
    _onPlayerOpen() {
      this._startTimer();
      this.duration = 0;
      this.currentTime = 0;
      this._heatMap && this._heatMap.reset();
      this._storyboard.reset();
      this.resetBufferedRange();
    }
    _onPlayerCanPlay(watchId, videoInfo) {
      const duration = this._player.duration;
      this.duration = duration;
      this._storyboard.onVideoCanPlay(watchId, videoInfo);

      this._heatMap && (this._heatMap.duration = duration);
    }
    _onCommentParsed() {
      this._chatList = this._player.chatList;
      this._heatMap && (this._heatMap.chatList = this._chatList);
      this._commentPreview.chatList = this._chatList;
    }
    _onCommentChange() {
      this._chatList = this._player.chatList;
      this._heatMap && (this._heatMap.chatList = this._chatList);
      this._commentPreview.chatList = this._chatList;
    }
    _onPlayerDurationChange() {
      this._pointer.duration = this._playerState.videoInfo.duration;
      this._wheelSeeker.duration = this._playerState.videoInfo.duration;
      this._heatMap && (this._heatMap.chatList = this._chatList);
    }
    _onPlayerClose() {
      this._stopTimer();
    }
    _onPlayerProgress(range, currentTime) {
      this.setBufferedRange(range, currentTime);
    }
    _startTimer() {
      this._timerCount = 0;
      this._raf = this._raf || new RequestAnimationFrame(this._onTimer.bind(this));
      this._raf.enable();
    }
    _stopTimer() {
      this._raf && this._raf.disable();
    }
    _onSeekRangeInput(e) {
      const sec = e.target.value * 1;
      const left = sec / (e.target.max * 1) * this._width;
      util.dispatchCommand(e.target, 'seek', sec);
      this._seekBarToolTip.update(sec, left);
      this._storyboard.setCurrentTime(sec, true);
    }
    _onSeekBarMouseDown(e) {
      // e.preventDefault();
      e.stopPropagation();
      this._beginMouseDrag(e);
    }
    _onSeekBarMouseMove(e) {
      if (!this._isDragging) {
        e.stopPropagation();
      }
      let left = e.offsetX;
      let sec = this._posToTime(left);
      this._seekBarMouseX = left;

      this._commentPreview.currentTime = sec;
      this._commentPreview.update(left);

      this._seekBarToolTip.update(sec, left);
    }
    _onWheelSeek(sec) {
      if (!this._isWheelSeeking) {
        return;
      }
      sec = sec * 1;
      const dur = this._duration;
      const left = sec / dur * window.innerWidth;
      this._seekBarMouseX = left;

      this._commentPreview.currentTime = sec;
      this._commentPreview.update(left);

      this._seekBarToolTip.update(sec, left);
      this._storyboard.setCurrentTime(sec, true);
    }
    _beginMouseDrag() {
      this._bindDragEvent();
      this._$view.addClass('is-dragging');
      this._isDragging = true;
    }
    _endMouseDrag() {
      this._unbindDragEvent();
      this._$view.removeClass('is-dragging');
      this._isDragging = false;
    }
    _onBodyMouseUp(e) {
      if ((e.button === 0 && e.shiftKey)) {
        return;
      }
      this._endMouseDrag();
    }
    _onWindowBlur() {
      this._endMouseDrag();
    }
    _bindDragEvent() {
      util.$('body')
        .on('mouseup.ZenzaWatchSeekBar', this._onBodyMouseUp.bind(this));

      util.$(window).on('blur.ZenzaWatchSeekBar', this._onWindowBlur.bind(this), {once: true});
    }
    _unbindDragEvent() {
      util.$('body')
        .off('mouseup.ZenzaWatchSeekBar');
      util.$(window).off('blur.ZenzaWatchSeekBar');
    }
    _onTimer() {
      this._timerCount++;

      const player = this._player;
      const currentTime = this._isWheelSeeking ?
        this._wheelSeeker.currentTime : player.currentTime;
      if (this._timerCount % 6 === 0) {
        this.currentTime = currentTime;
      }
      this._storyboard.currentTime = currentTime;
    }
    _onLoadVideoInfo(videoInfo) {
      this.duration = videoInfo.duration;

      if (!this._isFirstVideoInitialized) {
        this._isFirstVideoInitialized = true;
        const handler = (command, param) => this.emit('command', command, param);

        global.emitter.emitAsync('videoControBar.addonMenuReady',
          this._$view[0].querySelector('.controlItemContainer.left .scalingUI'), handler
        );
        global.emitter.emitAsync('seekBar.addonMenuReady',
          this._$view[0].querySelector('.seekBar'), handler
        );
      }

      this._resumePointer.setAttribute('duration', videoInfo.duration);
      this._resumePointer.setAttribute('time', videoInfo.initialPlaybackTime);
    }
    get currentTime() {
      return this._currentTime;
    }
    setCurrentTime(sec) {
      this.currentTime = sec;
    }
    set currentTime(sec) {
      if (this._currentTime === sec) { return; }
      this._currentTime = sec;

      const currentTimeText = util.secToTime(sec);
      if (this._currentTimeText !== currentTimeText) {
        this._currentTimeText = currentTimeText;
        this.currentTimeLabel && (this.currentTimeLabel.text = currentTimeText);
      }
      this._pointer.currentTime = sec;
    }
    get duration() {
      return this._duration;
    }
    set duration(sec) {
      if (sec === this._duration) { return; }
      this._duration = sec;
      this._pointer.currentTime = -1;
      this._pointer.duration = sec;
      this._wheelSeeker.duration = sec;
      this._seekRange.max = sec;

      if (sec === 0 || isNaN(sec)) {
        this.durationLabel && (this.durationLabel.text = '--:--');
      } else {
        this.durationLabel && (this.durationLabel.text = util.secToTime(sec));
      }
      this.emit('durationChange');
    }
    setBufferedRange(range, currentTime) {
      const bufferRange = this._bufferRange;
      if (!range || !range.length || !this._duration) {
        return;
      }
      for (let i = 0, len = range.length; i < len; i++) {
        try {
          const start = range.start(i);
          const end   = range.end(i);
          const width = end - start;
          if (start <= currentTime && end >= currentTime) {
            if (this._bufferStart !== start ||
                this._bufferEnd   !== end) {
              const perLeft = (this._timeToPer(start) - 1);
              const scaleX = (this._timeToPer(width) + 2) / 100;
              bufferRange.style.setProperty('--buffer-range-left', cssUtil.percent(perLeft));
              bufferRange.style.setProperty('--buffer-range-scale', scaleX);
              this._bufferStart = start;
              this._bufferEnd   = end;
            }
            break;
          }
        } catch (e) {}
      }
    }
    resetBufferedRange() {
      this._bufferStart = 0;
      this._bufferEnd = 0;
      this._bufferRange.style.setProperty('--buffer-range-scale', 0);
    }
    _hideMenu() {
      document.body.focus();
    }
  }

  VideoControlBar.BASE_HEIGHT = CONSTANT.CONTROL_BAR_HEIGHT;
  VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;

util.addStyle(`
  .videoControlBar {
    position: fixed;
    bottom: 0;
    left: 0;
    transform: translate3d(0, 0, 0);
    width: 100vw;
    height: var(--zenza-control-bar-height, ${VideoControlBar.BASE_HEIGHT}px);
    z-index: 150000;
    background: #000;
    transition: opacity 0.3s ease, transform 0.3s ease;
    user-select: none;
    contain: layout;
  }

  .videoControlBar * {
    box-sizing: border-box;
    user-select: none;
  }

  .videoControlBar.is-wheelSeeking {
    pointer-events: none;
  }


  .controlItemContainer {
    position: absolute;
    top: 10px;
    height: 40px;
    z-index: 200;
  }

  .controlItemContainer:hover,
  .controlItemContainer:focus-within,
  .videoControlBar.is-menuOpen .controlItemContainer {
    z-index: 260;
  }

  .controlItemContainer.left {
    left: 0;
    height: 40px;
    white-space: nowrap;
    overflow: visible;
    transition: transform 0.2s ease, left 0.2s ease;
  }
  .controlItemContainer.left .scalingUI {
    padding: 0 8px 0;
  }
  .controlItemContainer.left .scalingUI:empty {
    display: none;
  }
  .controlItemContainer.left .scalingUI>* {
    background: #222;
    display: inline-block;
  }

  .controlItemContainer.center {
    left: 50%;
    height: 40px;
    transform: translate(-50%, 0);
    background:
      linear-gradient(to bottom,
      transparent, transparent 4px, #222 0, #222 30px, transparent 0, transparent);
    white-space: nowrap;
    overflow: visible;
    transition: transform 0.2s ease, left 0.2s ease;
  }

  .controlItemContainer.center .scalingUI {
    transform-origin: top center;
  }
  .controlItemContainer.center .scalingUI > div{
    display: flex;
    align-items: center;
    height: 32px;
  }

  .controlItemContainer.right {
    right: 0;
  }

  .is-mouseMoving .controlItemContainer.right .controlButton{
    background: #333;
  }
  .controlItemContainer.right .scalingUI {
    transform-origin: top right;
  }

  .controlButton {
    position: relative;
    display: inline-block;
    transition: opacity 0.4s ease;
    font-size: 20px;
    width: 32px;
    height: 32px;
    line-height: 30px;
    box-sizing: border-box;
    text-align: center;
    cursor: pointer;
    color: #fff;
    opacity: 0.8;
    min-width: 32px;
    vertical-align: middle;
    outline: none;
  }
  .controlButton:hover {
    cursor: pointer;
    opacity: 1;
  }
  .controlButton:active .controlButtonInner {
    transform: translate(0, 2px);
  }

  .is-abort   .playControl,
  .is-error   .playControl,
  .is-loading .playControl {
    opacity: 0.4 !important;
    pointer-events: none;
  }


  .controlButton .tooltip {
    display: none;
    pointer-events: none;
    position: absolute;
    left: 16px;
    top: -30px;
    transform:  translate(-50%, 0);
    font-size: 12px;
    line-height: 16px;
    padding: 2px 4px;
    border: 1px solid #000;
    background: #ffc;
    color: #000;
    text-shadow: none;
    white-space: nowrap;
    z-index: 100;
    opacity: 0.8;
  }
  .is-mouseMoving .controlButton:hover .tooltip {
    display: block;
    opacity: 1;
  }
  .videoControlBar:hover .controlButton {
    opacity: 1;
    pointer-events: auto;
  }

  .videoControlBar .controlButton:focus-within {
    pointer-events: none;
  }
  .videoControlBar .controlButton:focus-within .zenzaPopupMenu,
  .videoControlBar .controlButton              .zenzaPopupMenu:hover {
    pointer-events: auto;
    visibility: visible;
    opacity: 0.99;
    pointer-events: auto;
    transition: opacity 0.3s;
  }
  .videoControlBar .controlButton:focus-within .tooltip {
    display: none;
  }

  .settingPanelSwitch {
    width: 32px;
  }
  .settingPanelSwitch:hover {
    text-shadow: 0 0 8px #ff9;
  }
  .settingPanelSwitch .tooltip {
    left: 0;
  }
  .videoControlBar .zenzaSubMenu {
    left: 50%;
    transform: translate(-50%, 0);
    bottom: 44px;
    white-space: nowrap;
  }

  .videoControlBar .triangle {
    transform: translate(-50%, 0) rotate(-45deg);
    bottom: -8.5px;
    left: 50%;
  }

  .videoControlBar .zenzaSubMenu::after {
    content: '';
    position: absolute;
    display: block;
    width: 110%;
    height: 16px;
    left: -5%;
  }

  .controlButtonInner {
    display: inline-block;
  }


  .seekTop {
    left: 0px;
    width: 32px;
    transform: scale(1.1);
  }

  .togglePlay {
    width: 36px;
    transition: transform 0.2s ease;
    transform: scale(1.1);
  }
  .togglePlay:active {
    transform: scale(0.75);
  }

  .togglePlay .play,
  .togglePlay .pause {
    display: inline-block;
    position: absolute;
    top: 50%;
    left: 50%;
    transition: transform 0.1s linear, opacity 0.1s linear;
    user-select: none;
    pointer-events: none;
  }
  .togglePlay .play {
    width: 100%;
    height: 100%;
    transform: scale(1.2) translate(-50%, -50%) translate(10%, 10%);
  }
  .is-playing .togglePlay .play {
    opacity: 0;
  }
  .togglePlay>.pause {
    width: 24px;
    height: 16px;
    background-image: linear-gradient(
      to right,
      transparent 0, transparent 12.5%,
      currentColor 0, currentColor 43.75%,
      transparent 0, transparent 56.25%,
      currentColor 0, currentColor 87.5%,
      transparent 0);
    opacity: 0;
    transform: scaleX(0);
  }
  .is-playing .togglePlay>.pause {
    opacity: 1;
    transform: translate(-50%, -50%);
  }

  .seekBarContainer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    cursor: pointer;
    z-index: 250;
  }
  /* 見えないマウス判定 */
  .seekBarContainer .seekBarShadow {
    position: absolute;
    background: transparent;
    opacity: 0;
    width: 100vw;
    height: 8px;
    top: -8px;
  }
  .is-mouseMoving .seekBarContainer:hover .seekBarShadow {
    height: 48px;
    top: -48px;
  }

  .is-abort   .seekBarContainer,
  .is-loading .seekBarContainer,
  .is-error   .seekBarContainer {
    pointer-events: none;
  }
  .is-abort   .seekBarContainer *,
  .is-error   .seekBarContainer * {
    display: none;
  }

  .seekBar {
    position: relative;
    width: 100%;
    height: 10px;
    margin: 2px 0 2px;
    border-top:    1px solid #333;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: height 0.2s ease 1s, margin-top 0.2s ease 1s;
  }

  .seekBar:hover {
    height: 24px;
    /* このmargin-topは見えないマウスオーバー判定を含む */
    margin-top: -14px;
    transition: none;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .seekBarContainer .seekBar * {
    pointer-events: none;
  }

  .bufferRange {
    position: absolute;
    --buffer-range-left: 0;
    --buffer-range-scale: 0;
    width: 100%;
    height: 110%;
    left: 0px;
    top: 0px;
    box-shadow: 0 0 6px #ff9 inset, 0 0 4px #ff9;
    z-index: 190;
    background: #ff9;
    transform-origin: left;
    transform:
      translateX(var(--buffer-range-left))
      scaleX(var(--buffer-range-scale));
    transition: transform 0.2s;
    mix-blend-mode: overlay;
    will-change: transform, opacity;
    opacity: 0.6;
  }

  .is-youTube .bufferRange {
    width: 100% !important;
    height: 110% !important;
    background: #f99;
    transition: transform 0.5s ease 1s;
    transform: translate3d(0, 0, 0) scaleX(1) !important;
  }

  .seekBarPointer {
    --width-pp: 12px;
    --trans-x-pp: 0;
    position: absolute;
    display: inline-block;
    top: 50%;
    left: 0;
    width: var(--width-pp);
    background: rgba(255, 255, 255, 0.7);
    height: calc(100% + 2px);
    z-index: 200;
    box-shadow: 0 0 4px #ffc inset;
    pointer-events: none;
    transform: translate(calc(var(--trans-x-pp) - var(--width-pp) / 2), -50%);
    will-change: transform;
    mix-blend-mode: lighten;
  }

  .is-loading .seekBarPointer {
    display: none !important;
  }

  .is-dragging .seekBarPointer.is-notSmooth {
    transition: none;
  }
  .is-dragging .seekBarPointer::after,
  .is-wheelSeeking .seekBarPointer::after {
    content: '';
    position: absolute;
    width: 36px;
    height: 36px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 100%;
    box-shadow: 0 0 8px #ffc inset, 0 0 8px #ffc;
    pointer-events: none;
  }

  .seekBarContainer .seekBar .seekRange {
    -webkit-appearance: none;
    position: absolute;
    width: 100vw;
    height: 100%;
    cursor: pointer;
    opacity: 0;
    pointer-events: auto;
  }
  .seekRange::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 10px;
    width: 2px;
  }
  .seekRange::-moz-range-thumb {
    height: 10px;
    width: 2px;
  }

  .videoControlBar .videoTime {
    display: inline-flex;
    top: 0;
    padding: 0;
    width: 96px;
    height: 18px;
    line-height: 18px;
    contain: strict;
    color: #fff;
    font-size: 12px;
    white-space: nowrap;
    vertical-align: middle;
    background: rgba(33, 33, 33, 0.5);
    border: 0;
    pointer-events: none;
    user-select: none;
  }

  .videoControlBar .videoTime .currentTimeLabel,
  .videoControlBar .videoTime .currentTime,
  .videoControlBar .videoTime .duration {
    position: relative;
    display: inline-block;
    color: #fff;
    text-align: center;
    background: inherit;
    border: 0;
    width: 44px;
    font-family: 'Yu Gothic', 'YuGothic', 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace;
  }
  .videoControlBar.is-loading .videoTime {
    display: none;
  }

  .seekBarContainer .tooltip {
    position: absolute;
    padding: 1px;
    bottom: 12px;
    left: 0;
    transform: translate(-50%, 0);
    white-space: nowrap;
    font-size: 10px;
    opacity: 0;
    border: 1px solid #000;
    background: #fff;
    color: #000;
    z-index: 150;
  }

  .is-dragging .seekBarContainer .tooltip,
  .seekBarContainer:hover .tooltip {
    opacity: 0.8;
  }

  .resumePointer {
    position: absolute;
    mix-blend-mode: color-dodge;
    top: 0;
    z-index: 200;
  }

  .zenzaHeatMap {
    position: absolute;
    pointer-events: none;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0 0;
    will-change: transform;
    opacity: 0.5;
    z-index: 110;
  }
  .noHeatMap .zenzaHeatMap {
    display: none;
  }

  .loopSwitch {
    width:  32px;
    height: 32px;
    line-height: 30px;
    font-size: 20px;
    color: #888;
  }
  .loopSwitch:active {
    font-size: 15px;
  }

  .is-loop .loopSwitch {
    color: var(--enabled-button-color);
  }
  .loopSwitch .controlButtonInner {
    font-family: STIXGeneral;
  }

  .playbackRateMenu {
    bottom: 0;
    width: auto;
    min-width: 40px;
    height:    32px;
    line-height: 30px;
    font-size: 18px;
    white-space: nowrap;
    margin-right: 0;
  }


  .playbackRateSelectMenu {
    width: 180px;
    text-align: left;
    line-height: 20px;
    font-size: 18px !important;
  }

  .playbackRateSelectMenu ul {
    margin: 2px 8px;
  }

  .playbackRateSelectMenu li {
    padding: 3px 4px;
  }

  .screenModeMenu {
    width:  32px;
    height: 32px;
    line-height: 30px;
    font-size: 20px;
  }
  .screenModeMenu:active {
    font-size: 15px;
  }


  .screenModeMenu:focus-within {
    background: #888;
  }
  .screenModeMenu:focus-within .tooltip {
    display: none;
  }

  .screenModeMenu:active {
    font-size: 10px;
  }

  .screenModeSelectMenu {
    width: 148px;
    padding: 2px 4px;
    font-size: 12px;
    line-height: 15px;
  }

  .screenModeSelectMenu ul {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .screenModeSelectMenu ul li {
    display: inline-block;
    text-align: center;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .screenModeSelectMenu ul li span {
    border: 1px solid #ccc;
    width: 50px;
    margin: 2px 8px;
    padding: 4px 0;
  }

  body[data-screen-mode="3D"]       .screenModeSelectMenu li.mode3D span,
  body[data-screen-mode="sideView"] .screenModeSelectMenu li.sideView span,
  body[data-screen-mode="small"]    .screenModeSelectMenu li.small span,
  body[data-screen-mode="normal"]   .screenModeSelectMenu li.normal span,
  body[data-screen-mode="big"]      .screenModeSelectMenu li.big span,
  body[data-screen-mode="wide"]     .screenModeSelectMenu li.wide span {
    color: #ff9;
    border-color: #ff0;
  }

  .fullscreenControlBarModeMenu {
    display: none;
  }
  .fullscreenControlBarModeMenu .controlButtonInner {
    filter: grayscale(100%);
  }
  .fullscreenControlBarModeMenu:focus-within .controlButtonInner,
  .fullscreenControlBarModeMenu:hover .controlButtonInner {
    filter: grayscale(50%);
  }


           .is-fullscreen  .fullscreenSwitch .controlButtonInner .toFull,
  body:not(.is-fullscreen) .fullscreenSwitch .controlButtonInner .returnFull {
    display: none;
  }

  .videoControlBar .muteSwitch {
    margin-right: 0;
  }
  .videoControlBar .muteSwitch:active {
    font-size: 15px;
  }

  .zenzaPlayerContainer:not(.is-mute) .muteSwitch .mute-on,
                            .is-mute  .muteSwitch .mute-off {
    display: none;
  }

  .videoControlBar .volumeControl {
    display: inline-block;
  }
  .videoControlBar .volumeRange {
    width: 64px;
    height: 8px;
    position: relative;
    vertical-align: middle;
    --back-color: #333;
    --fore-color: #ccc;
  }
  .is-mute .videoControlBar .volumeRange  {
    --fore-color: var(--back-color);
    pointer-events: none;
  }

  .prevVideo.playControl,
  .nextVideo.playControl {
    display: none;
  }
  .is-playlistEnable .prevVideo.playControl,
  .is-playlistEnable .nextVideo.playControl {
    display: inline-block;
  }

  .prevVideo,
  .nextVideo {
    font-size: 23px;
  }
  .prevVideo .controlButtonInner {
    transform: scaleX(-1);
  }

  .toggleStoryboard {
    visibility: hidden;
    pointer-events: none;
  }
  .storyboardAvailable .toggleStoryboard {
    visibility: visible;
    pointer-events: auto;
  }
  .zenzaStoryboardOpen .storyboardAvailable .toggleStoryboard {
    color: var(--enabled-button-color);
  }

  .toggleStoryboard .controlButtonInner {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 50%;
    left: 50%;
    border-radius: 75% 16%;
    border: 1px solid;
    transform: translate(-50%, -50%) rotate(45deg);
    pointer-events: none;
    background:
      radial-gradient(
        currentColor,
        currentColor 6px,
        transparent 0
      );
  }
  .toggleStoryboard:active .controlButtonInner {
    transform: translate(-50%, -50%) scaleY(0.1) rotate(45deg);
  }

  .toggleStoryboard:active {
    transform: scale(0.75);
  }

  .videoServerTypeMenu {
    bottom: 0;
    min-width: 40px;
    height:    32px;
    line-height: 30px;
    font-size: 16px;
    white-space: nowrap;
  }
  .videoServerTypeMenu.is-dmc-playing  {
    text-shadow:
      0px 0px 8px var(--enabled-button-color),
      0px 0px 6px var(--enabled-button-color),
      0px 0px 4px var(--enabled-button-color),
      0px 0px 2px var(--enabled-button-color);
  }
  .is-mouseMoving .videoServerTypeMenu.is-dmc-playing {
    background: #336;
  }
  .is-youTube .videoServerTypeMenu {
    text-shadow:
      0px 0px 8px #fc9, 0px 0px 6px #fc9, 0px 0px 4px #fc9, 0px 0px 2px #fc9 !important;
  }
  .is-youTube .videoServerTypeMenu:not(.forYouTube),
  .videoServerTypeMenu.forYouTube {
    display: none;
  }
  .is-youTube .videoServerTypeMenu.forYouTube {
    display: inline-block;
  }


  .videoServerTypeMenu:active {
    font-size: 13px;
  }
  .videoServerTypeMenu:focus-within {
    background: #888;
  }
  .videoServerTypeMenu:focus-within .tooltip {
    display: none;
  }

  .videoServerTypeSelectMenu  {
    bottom: 44px;
    left: 50%;
    transform: translate(-50%, 0);
    width: 180px;
    text-align: left;
    line-height: 20px;
    font-size: 16px !important;
    text-shadow: none !important;
    cursor: default;
  }

  .videoServerTypeSelectMenu ul {
    margin: 2px 8px;
  }

  .videoServerTypeSelectMenu li {
    padding: 3px 4px;
  }

  .videoServerTypeSelectMenu li.selected {
    pointer-events: none;
    text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
  }

  .videoServerTypeSelectMenu .smileVideoQuality,
  .videoServerTypeSelectMenu .dmcVideoQuality {
    font-size: 80%;
    padding-left: 28px;
  }

  .videoServerTypeSelectMenu .currentVideoQuality {
    color: #ccf;
    font-size: 80%;
    text-align: center;
  }

  .videoServerTypeSelectMenu .dmcVideoQuality.selected     span:before,
  .videoServerTypeSelectMenu .smileVideoQuality.selected   span:before {
    left: 22px;
    font-size: 80%;
  }

  .videoServerTypeSelectMenu .currentVideoQuality.selected   span:before {
    display: none;
  }

  /* dmcを使用不能の時はdmc選択とdmc画質選択を薄く */
  .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc,
  .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality,
  .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
    opacity: 0.4;
    pointer-events: none;
    text-shadow: none !important;
  }
  .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
    display: none;
  }
  .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc span:before,
  .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality       span:before{
    display: none !important;
  }
  .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType {
    pointer-events: none;
  }


  /* dmcを使用している時はsmileの画質選択を薄く */
  .is-dmc-playing .smileVideoQuality {
    display: none;
   }

  /* dmcを選択していない状態ではdmcの画質選択を隠す */
  .is-smile-playing .currentVideoQuality,
  .is-smile-playing .dmcVideoQuality {
    display: none;
  }



  @media screen and (max-width: 768px) {
    .controlItemContainer.center {
      left: 0%;
      transform: translate(0, 0);
    }
  }

  .ZenzaWatchVer {
    display: none;
  }
  .ZenzaWatchVer[data-env="DEV"] {
    display: inline-block;
    color: #999;
    position: absolute;
    right: 0;
    background: transparent !important;
    transform: translate(100%, 0);
    font-size: 12px;
    line-height: 32px;
    pointer-events: none;
  }

  .progressWave {
    display: none;
  }
  .is-stalled .progressWave,
  .is-loading .progressWave {
    display: inline-block;
    position: absolute;
    left: 0;
    top: 1px;
    z-index: 400;
    width: 40%;
    height: calc(100% - 2px);
    background: linear-gradient(
      to right,
      rgba(0,0,0,0),
      ${util.toRgba('#ffffcc', 0.3)},
      rgba(0,0,0)
    );
    mix-blend-mode: lighten;
    animation-name: progressWave;
    animation-iteration-count: infinite;
    animation-duration: 4s;
    animation-timing-function: linear;
    animation-delay: -1s;
  }
  @keyframes progressWave {
    0%   { transform: translate3d(-100%, 0, 0) translate3d(-5vw, 0, 0); }
    100% { transform: translate3d(100%, 0, 0) translate3d(150vw, 0, 0); }
  }
  .is-seeking .progressWave {
    display: none;
  }


`, {className: 'videoControlBar'});
util.addStyle(`
  .videoControlBar {
    width: 100% !important; /* 100vwだと縦スクロールバーと被る */
  }
`, {className: 'screenMode for-popup videoControlBar', disabled: true});
util.addStyle(`
  body .videoControlBar {
    position: absolute !important; /* firefoxのバグ対策 */
    opacity: 0;
    background: none;
  }

  .volumeChanging .videoControlBar,
  .is-mouseMoving .videoControlBar {
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.5);
  }
  .showVideoControlBar .videoControlBar {
    opacity: 1 !important;
    background: #000 !important;
  }

  .videoControlBar.is-dragging,
  .videoControlBar:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.9);
  }

  .fullscreenControlBarModeMenu {
    display: inline-block;
  }

  .fullscreenControlBarModeSelectMenu {
    padding: 2px 4px;
    font-size: 12px;
    line-height: 15px;
    font-size: 16px !important;
    text-shadow: none !important;
  }

  .fullscreenControlBarModeSelectMenu ul {
    margin: 2px 8px;
  }

  .fullscreenControlBarModeSelectMenu li {
    padding: 3px 4px;
  }

  .videoServerTypeSelectMenu li.selected {
    pointer-events: none;
    text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
  }

  .fullscreenControlBarModeMenu li:focus-within,
  body[data-fullscreen-control-bar-mode="auto"] .fullscreenControlBarModeMenu [data-param="auto"],
  body[data-fullscreen-control-bar-mode="always-show"] .fullscreenControlBarModeMenu [data-param="always-show"],
  body[data-fullscreen-control-bar-mode="always-hide"] .fullscreenControlBarModeMenu [data-param="always-hide"] {
    color: #ff9;
    outline: none;
  }

`, {className: 'screenMode for-full videoControlBar', disabled: true});
util.addStyle(`
  .screenModeSelectMenu {
    display: none;
  }

  .controlItemContainer.left {
    top: auto;
    transform-origin: top left;
  }
  .seekBarContainer {
    top: auto;
    bottom: 0;
    z-index: 300;
  }
  .seekBarContainer:hover .seekBarShadow {
    height: 14px;
    top: -12px;
  }
  .seekBar {
    margin-top: 0px;
    margin-bottom: -14px;
    height: 24px;
    transition: none;
  }
  .screenModeMenu {
    display: none;
  }
  .controlItemContainer.center {
    top: auto;
  }
  .zenzaStoryboardOpen .controlItemContainer.center {
    background: transparent;
  }
  .zenzaStoryboardOpen .controlItemContainer.center .scalingUI {
    background: rgba(32, 32, 32, 0.5);
  }
  .zenzaStoryboardOpen .controlItemContainer.center .scalingUI:hover {
    background: rgba(32, 32, 32, 0.8);
  }
  .controlItemContainer.right {
    top: auto;
  }

`, {className: 'screenMode for-screen-full videoControlBar', disabled: true});

  VideoControlBar.__tpl__ = (`
    <div class="videoControlBar" data-command="nop">

      <div class="seekBarContainer">
        <div class="seekBarShadow"></div>
        <div class="seekBar">
          <div class="seekBarPointer"></div>
          <div class="bufferRange"></div>
          <div class="progressWave"></div>
          <input type="range" class="seekRange" min="0" step="any">
          <canvas width="200" height="10" class="heatMap zenzaHeatMap"></canvas>
        </div>
        <zenza-seekbar-label class="resumePointer" data-command="seekTo" data-text="ここまで見た">
        </zenza-seekbar-label>
      </div>

      <div class="controlItemContainer left">
        <div class="scalingUI">
          <div class="ZenzaWatchVer" data-env="${ZenzaWatch.env}">ver ${ZenzaWatch.version}${ZenzaWatch.env === 'DEV' ? '(Dev)' : ''}</div>
        </div>
      </div>
      <div class="controlItemContainer center">
        <div class="scalingUI">
          <div class="seekBarContainer-mainControl">
            <div class="prevVideo controlButton playControl" data-command="playPreviousVideo" data-param="0">
              <div class="controlButtonInner">&#x27A0;</div>
              <div class="tooltip">前の動画</div>
            </div>

            <div class="toggleStoryboard controlButton playControl forPremium" data-command="toggleStoryboard">
              <div class="controlButtonInner"></div>
              <div class="tooltip">シーンサーチ</div>
            </div>

            <div class="loopSwitch controlButton playControl" data-command="toggle-loop">
              <div class="controlButtonInner">&#8635;</div>
              <div class="tooltip">リピート</div>
            </div>

            <div class="seekTop controlButton playControl" data-command="seek" data-param="0">
              <div class="controlButtonInner">&#8676;</div>
              <div class="tooltip">先頭</div>
            </div>

            <div class="togglePlay controlButton playControl" data-command="togglePlay">
              <span class="pause"></span>
              <span class="play">▶</span>
            </div>

            <div class="playbackRateMenu controlButton" tabindex="-1" data-has-submenu="1">
              <div class="controlButtonInner">x1</div>
              <div class="tooltip">再生速度</div>
              <div class="playbackRateSelectMenu zenzaPopupMenu zenzaSubMenu">
                <div class="triangle"></div>
                <p class="caption">再生速度</p>
                <ul>
                  <li class="playbackRate" data-command="playbackRate" data-param="10"><span>10倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="5"  ><span>5倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="4"  ><span>4倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="3"  ><span>3倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="2"  ><span>2倍</span></li>

                  <li class="playbackRate" data-command="playbackRate" data-param="1.75"><span>1.75倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="1.5"><span>1.5倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="1.25"><span>1.25倍</span></li>

                  <li class="playbackRate" data-command="playbackRate" data-param="1.0"><span>標準速度(x1)</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="0.75"><span>0.75倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="0.5"><span>0.5倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="0.25"><span>0.25倍</span></li>
                  <li class="playbackRate" data-command="playbackRate" data-param="0.1"><span>0.1倍</span></li>
                </ul>
              </div>
            </div>

            <div class="videoTime">
              <span class="currentTimeLabel"></span>/<span class="durationLabel"></span>
            </div>

            <div class="muteSwitch controlButton" data-command="toggle-mute">
              <div class="tooltip">ミュート(M)</div>
              <div class="menuButtonInner mute-off">&#x1F50A;</div>
              <div class="menuButtonInner mute-on">&#x1F507;</div>
            </div>

            <div class="volumeControl">
              <zenza-range-bar><input class="volumeRange" type="range" value="0.5" min="0.01" max="1" step="any"></zenza-range-bar>
            </div>

            <div class="nextVideo controlButton playControl" data-command="playNextVideo" data-param="0">
              <div class="controlButtonInner">&#x27A0;</div>
              <div class="tooltip">次の動画</div>
            </div>

          </div>
        </div>
      </div>

      <div class="controlItemContainer right">

        <div class="scalingUI">

          <div class="videoServerTypeMenu controlButton forYouTube" data-command="reload" title="ZenTube解除">
            <div class="controlButtonInner">画</div>
          </div>
          <div class="videoServerTypeMenu controlButton" tabindex="-1" data-has-submenu="1">
            <div class="controlButtonInner">画</div>

            <div class="tooltip">動画サーバー・画質</div>
            <div class="videoServerTypeSelectMenu zenzaPopupMenu zenzaSubMenu">
              <div class="triangle"></div>
              <p class="caption">動画サーバー・画質</p>
              <ul>

                <li class="serverType select-server-dmc" data-command="update-videoServerType" data-param="dmc">
                  <span>新システムを使用</span>
                  <p class="currentVideoQuality"></p>
                </li>


                <li class="dmcVideoQuality selected select-dmc-auto" data-command="update-dmcVideoQuality" data-param="auto"><span>自動(auto)</span></li>
                <li class="dmcVideoQuality selected select-dmc-veryhigh" data-command="update-dmcVideoQuality" data-param="veryhigh"><span>超(1080) 優先</span></li>
                <li class="dmcVideoQuality selected select-dmc-high" data-command="update-dmcVideoQuality" data-param="high"><span>高(720) 優先</span></li>
                <li class="dmcVideoQuality selected select-dmc-mid"  data-command="update-dmcVideoQuality" data-param="mid"><span>中(480-540)</span></li>
                <li class="dmcVideoQuality selected select-dmc-low"  data-command="update-dmcVideoQuality" data-param="low"><span>低(360)</span></li>

                <li class="serverType select-server-smile" data-command="update-videoServerType" data-param="smile">
                  <span>旧システムを使用</span>
                </li>
                <li class="smileVideoQuality select-smile-default" data-command="update-forceEconomy" data-param="false" data-type="bool"><span>自動</span></li>
                <li class="smileVideoQuality select-smile-economy" data-command="update-forceEconomy" data-param="true"  data-type="bool"><span>エコノミー固定</span></li>
             </ul>
            </div>
          </div>

          <div class="screenModeMenu controlButton" tabindex="-1" data-has-submenu="1">
            <div class="tooltip">画面サイズ・モード変更</div>
            <div class="controlButtonInner">&#9114;</div>
            <div class="screenModeSelectMenu zenzaPopupMenu zenzaSubMenu">
              <div class="triangle"></div>
              <p class="caption">画面モード</p>
              <ul>
                <li class="screenMode mode3D"   data-command="screenMode" data-param="3D"><span>3D</span></li>
                <li class="screenMode small"    data-command="screenMode" data-param="small"><span>小</span></li>
                <li class="screenMode sideView" data-command="screenMode" data-param="sideView"><span>横</span></li>
                <li class="screenMode normal"   data-command="screenMode" data-param="normal"><span>中</span></li>
                <li class="screenMode wide"     data-command="screenMode" data-param="wide"><span>WIDE</span></li>
                <li class="screenMode big"      data-command="screenMode" data-param="big"><span>大</span></li>
              </ul>
            </div>
          </div>

          <div class="fullscreenControlBarModeMenu controlButton" tabindex="-1" data-has-submenu="1">
            <div class="tooltip">ツールバーの表示</div>
            <div class="controlButtonInner">&#128204;</div>
            <div class="fullscreenControlBarModeSelectMenu zenzaPopupMenu zenzaSubMenu">
              <div class="triangle"></div>
              <p class="caption">ツールバーの表示</p>
              <ul>
                <li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-show"><span>常に固定</span></li>
                <li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-hide"><span>常に隠す</span></li>
                <li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="auto"><span>画面サイズ自動</span></li>
              </ul>
            </div>
          </div>

          <div class="fullscreenSwitch controlButton" data-command="fullscreen">
            <div class="tooltip">フルスクリーン(F)</div>
            <div class="controlButtonInner">
              <!-- TODO: YouTubeと同じにする -->
              <span class="toFull">&#8690;</span>
              <span class="returnFull">&#8689;</span>
            </div>
          </div>

          <div class="settingPanelSwitch controlButton" data-command="settingPanel">
            <div class="controlButtonInner">&#x2699;</div>
            <div class="tooltip">設定</div>
          </div>

        </div>
      </div>

    </div>
  `).trim();

//@require HeatMapWorker

  class CommentPreviewModel extends Emitter {
    reset() {
      this._chatReady = false;
      this._vpos = -1;
      this.emit('reset');
    }
    set chatList(chatList) {
      const list = chatList
        .top
        .concat(chatList.naka, chatList.bottom)
        .sort((a, b) => a.vpos - b.vpos);

      this._chatList = list;
      this._chatReady = true;
      this.update();
    }
    get chatList() {
      return this._chatList || [];
    }
    set currentTime(sec) {
      this.vpos = sec * 100;
    }
    set vpos(vpos) {
      if (this._vpos !== vpos) {
        this._vpos = vpos;
        this.emit('vpos', vpos);
      }
    }
    get currentIndex() {
      if (this._vpos < 0 || !this._chatReady) {
        return -1;
      }
      return this.getVposIndex(this._vpos);
    }
    getVposIndex(vpos) {
      const list = this._chatList;
      if (!list) { return -1; }
      for (let i = list.length - 1; i >= 0; i--) {
        const chat = list[i], cv = chat.vpos;
        if (cv <= vpos - 400) {
          return i + 1;
        }
      }
      return -1;
    }
    get currentChatList() {
      if (this._vpos < 0 || !this._chatReady) {
        return [];
      }
      return this.getItemByVpos(this._vpos);
    }
    getItemByVpos(vpos) {
      const list = this._chatList;
      const result = [];
      for (let i = 0, len = list.length; i < len; i++) {
        const chat = list[i], cv = chat.vpos, diff = vpos - cv;
        if (diff >= -100 && diff <= 400) {
          result.push(chat);
        }
      }
      return result;
    }
    getItemByUniqNo(uniqNo) {
      return this._chatList.find(chat => chat.uniqNo === uniqNo);
    }
    update() {
      this.emit('update');
    }
  }

  class CommentPreviewView {
    constructor(params) {
      const model = this._model = params.model;
      this._$parent = params.$container;

      this._inviewTable = new Map;
      this._chatList = [];
      this._initializeDom(this._$parent);

      model.on('reset',  this._onReset.bind(this));
      model.on('update', _.debounce(this._onUpdate.bind(this), 10));
      model.on('vpos', this._onVpos.bind(this));

      this._mode = 'hover';

      this._left = 0;
      this.update = _.throttle(this.update.bind(this), 200);
      this.applyView = bounce.raf(this.applyView.bind(this));
    }
    _initializeDom($parent) {
      cssUtil.registerProps(
        {name: '--buffer-range-left', syntax: '<percentage>', initialValue: '0%',inherits: false},
        {name: '--buffer-range-scale', syntax: '<number>', initialValue: 0, inherits: false},
      );
      const $view = util.$.html(CommentPreviewView.__tpl__);
      const view = this._view = $view[0];
      this._list = view.querySelector('.listContainer');
      $view.on('click', this._onClick.bind(this))
        .on('wheel', e => e.stopPropagation(), {passive: true})
        .on('scroll',
        _.throttle(this._onScroll.bind(this), 50, {trailing: false}), {passive: true});

      $parent.append($view);
    }
    set mode(v) {
      if (v === 'list') {
        util.StyleSwitcher.update({
          on: '.commentPreview.list', off: '.commentPreview.hover'});
      } else {
        util.StyleSwitcher.update({
          on: '.commentPreview.hover', off: '.commentPreview.list'});
      }
      this._mode = v;
    }
    _onClick(e) {
      e.stopPropagation();
      const target = e.target.closest('[data-command]');
      const view = this._view;
      const command = target ? target.dataset.command : '';
      const nicoChatElement = e.target.closest('.nicoChat');
      const uniqNo = parseInt(nicoChatElement.dataset.nicochatUniqNo, 10);
      const nicoChat  = this._model.getItemByUniqNo(uniqNo);

      if (command && nicoChat) {
        view.classList.add('is-updating');

        window.setTimeout(() => view.classList.remove('is-updating'), 3000);

        switch (command) {
          case 'addUserIdFilter':
            util.dispatchCommand(e.target, command, nicoChat.userId);
            break;
          case 'addWordFilter':
            util.dispatchCommand(e.target, command, nicoChat.text);
            break;
          case 'addCommandFilter':
            util.dispatchCommand(e.target, command, nicoChat.cmd);
            break;
        }
        return;
      }
      const vpos = nicoChatElement.dataset.vpos;
      if (vpos !== undefined) {
        util.dispatchCommand(e.target, 'seek', vpos / 100);
      }
    }
    _onUpdate() {
      this.updateList();
    }
    _onVpos(vpos) {
      const itemHeight = CommentPreviewView.ITEM_HEIGHT;
      const index = this._currentStartIndex = Math.max(0, this._model.currentIndex);
      this._currentEndIndex = Math.max(0, this._model.getVposIndex(vpos + 400));
      this._scrollTop = itemHeight * index;
      this._currentTime = vpos / 100;
      this._refreshInviewElements(this._scrollTop);
    }
    _onResize() {
      this._refreshInviewElements();
    }
    _onScroll() {
      this._scrollTop = -1;
      this._refreshInviewElements();
    }
    _onReset() {
      this._list.textContent = '';
      this._inviewTable.clear();
      this._scrollTop = 0;
      this._newListElements = null;
      this._chatList = [];
    }
    updateList() {
      const chatList = this._chatList = this._model.chatList;
      if (!chatList.length) {
        this._isListUpdated = false;
        return;
      }

      const itemHeight = CommentPreviewView.ITEM_HEIGHT;

      this._list.style.height = `${(chatList.length + 2) * itemHeight}px`;
      this._isListUpdated = false;
    }
    _refreshInviewElements(scrollTop) {
      if (!this._view) { return; }
      const itemHeight = CommentPreviewView.ITEM_HEIGHT;

      scrollTop = _.isNumber(scrollTop) ? scrollTop : this._view.scrollTop;

      const viewHeight = CommentPreviewView.MAX_HEIGHT;
      const viewBottom = scrollTop + viewHeight;
      const chatList = this._chatList;
      if (!chatList || chatList.length < 1) { return; }
      const startIndex =
        this._mode === 'list' ?
          Math.max(0, Math.floor(scrollTop / itemHeight) - 5) :
          this._currentStartIndex;
          const endIndex   =
        this._mode === 'list' ?
          Math.min(chatList.length, Math.floor(viewBottom / itemHeight) + 5) :
          Math.min(this._currentEndIndex, this._currentStartIndex + 15);

      const newItems = [], inviewTable = this._inviewTable;
      for (let i = startIndex; i < endIndex; i++) {
        const chat = chatList[i];
        if (inviewTable.has(i) || !chat) { continue; }
        const listItem = CommentPreviewChatItem.create(chat, i);
        newItems.push(listItem);
        inviewTable.set(i, listItem);
      }

      if (newItems.length < 1) { return; }

      for (const i of inviewTable.keys()) {
        if (i >= startIndex && i <= endIndex) { continue; }
        inviewTable.get(i).remove();
        inviewTable.delete(i);
      }

      this._newListElements = this._newListElements || document.createDocumentFragment();
      this._newListElements.append(...newItems);

      this.applyView();
    }
    get isEmpty() {
      return this._chatList.length < 1;
    }
    update(left) {
      if (this._isListUpdated) {
        this.updateList();
      }
      if (this.isEmpty) {
        return;
      }
      const width = this._mode === 'list' ?
        CommentPreviewView.WIDTH : CommentPreviewView.HOVER_WIDTH;
      const containerWidth = window.innerWidth;

      left = Math.min(Math.max(0, left - CommentPreviewView.WIDTH / 2), containerWidth - width);
      this._left = left;
      this.applyView();
    }
    applyView() {
      const view = this._view;
      const vs = view.style;
      vs.setProperty('--current-time', cssUtil.s(this._currentTime));
      vs.setProperty('--scroll-top', cssUtil.px(this._scrollTop));
      vs.setProperty('--trans-x-pp', cssUtil.px(this._left));
      if (this._newListElements && this._newListElements.childElementCount) {
        this._list.append(this._newListElements);
      }
      if (this._scrollTop > 0 && this._mode === 'list') {
        this._view.scrollTop = this._scrollTop;
        this._scrollTop = -1;
      }

    }
    hide() {
    }
  }


  class CommentPreviewChatItem {
    static get html() {
      return `
       <li class="nicoChat">
         <span class="vposTime"></span>
         <span class="text"></span>
         <span class="addFilter addUserIdFilter"
           data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
         <span class="addFilter addWordFilter"
           data-command="addWordFilter" title="NGワード">NGword</span>
       </li>
      `.trim();
    }

    static get template() {
      if (!this._template) {
        const t = document.createElement('template');
        t.id = `${this.name}_${Date.now()}`;
        t.innerHTML = this.html;
        const content = t.content;
        this._template = {
          clone: () => document.importNode(t.content, true),
          chat: content.querySelector('.nicoChat'),
          time: content.querySelector('.vposTime'),
          text: t.content.querySelector('.text')
        };
      }
      return this._template;
    }

    /**
     * @param {NicoChatViewModel} chat
     */
    static create(chat, idx) {
      const itemHeight = CommentPreviewView.ITEM_HEIGHT;
      const text = chat.text;
      const date = (new Date(chat.date * 1000)).toLocaleString();
      const vpos = chat.vpos;
      const no = chat.no;
      const uniqNo = chat.uniqNo;
      const oe = idx % 2 === 0 ? 'even' : 'odd';
      const title = `${no} : 投稿日 ${date}\nID:${chat.userId}\n${text}\n`;
      const color = chat.color || '#fff';
      const shadow = color === '#fff' ? '' : `text-shadow: 0 0 1px ${color};`;

      const vposToTime = vpos => util.secToTime(Math.floor(vpos / 100));
      const t = this.template;
      t.chat.className = `nicoChat fork${chat.fork} ${oe}`;
      t.chat.id = `commentPreviewItem${idx}`;
      t.chat.dataset.vpos = vpos;
      t.chat.dataset.nicochatUniqNo = uniqNo;
      t.time.textContent = `${vposToTime(vpos)}: `;
      t.text.title = title;
      t.text.style = shadow;
      t.text.textContent = text;
      t.chat.style.cssText = `
        top: ${idx * itemHeight}px;
        --duration: ${chat.duration}s;
        --vpos-time: ${chat.vpos / 100}s;
      `;
      return t.clone().firstElementChild;
    }
  }

CommentPreviewView.MAX_HEIGHT = 200;
CommentPreviewView.WIDTH = 350;
CommentPreviewView.HOVER_WIDTH = 180;
CommentPreviewView.ITEM_HEIGHT = 20;
CommentPreviewView.__tpl__ = (`
  <div class="zenzaCommentPreview">
    <div class="listContainer"></div>
  </div>
  `).trim();

util.addStyle(`
  .zenzaCommentPreview {
    display: none;
    position: absolute;
    bottom: 16px;
    opacity: 0.8;
    max-height: ${CommentPreviewView.MAX_HEIGHT}px;
    width: ${CommentPreviewView.WIDTH}px;
    box-sizing: border-box;
    color: #ccc;
    overflow: hidden;
    transform: translate(var(--trans-x-pp), 0);
    transition: --trans-x-pp 0.2s;
    will-change: transform;
  }
  .zenzaCommentPreview * {
    box-sizing: border-box;
  }
  .is-wheelSeeking .zenzaCommentPreview,
  .seekBarContainer:hover .zenzaCommentPreview {
    display: block;
  }

`, {className: 'commentPreview'});

util.addStyle(`
  .zenzaCommentPreview {
    border-bottom: 24px solid transparent;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    overflow: auto;
  }
  .zenzaCommentPreview:hover {
    background: black;
  }
  .zenzaCommentPreview.is-updating {
    transition: opacity 0.2s ease;
    opacity: 0.3;
    cursor: wait;
  }
  .zenzaCommentPreview.is-updating * {
    pointer-evnets: none;
  }
  .listContainer {
    bottom: auto;
    padding: 4px;
    pointer-events: none;
  }
  .zenzaCommentPreview:hover .listContainer {
    pointer-events: auto;
  }
  .listContainer .nicoChat {
    position: absolute;
    left: 0;
    display: block;
    width: 100%;
    height: ${CommentPreviewView.ITEM_HEIGHT}px;
    padding: 2px 4px;
    cursor: pointer;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    animation-duration: var(--duration);
    animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
    animation-name: preview-text-inview;
    animation-timing-function: linear;
    animation-play-state: paused !important;
  }
  @keyframes preview-text-inview {
    0% {
      color: #ffc;
    }
    100% {
      color: #ffc;
    }
  }

  .listContainer:hover .nicoChat.odd {
    background: #333;
  }
  .listContainer .nicoChat.fork1 .vposTime {
    color: #6f6;
  }
  .listContainer .nicoChat.fork2 .vposTime {
    color: #66f;
  }

  .listContainer .nicoChat .no,
  .listContainer .nicoChat .date,
  .listContainer .nicoChat .userId {
    display: none;
  }

  .listContainer .nicoChat:hover .no,
  .listContainer .nicoChat:hover .date,
  .listContainer .nicoChat:hover .userId {
    display: inline-block;
    white-space: nowrap;
  }

  .listContainer .nicoChat .text {
    color: inherit !important;
  }
  .listContainer .nicoChat:hover .text {
    color: #fff !important;
  }

  .listContainer .nicoChat .text:hover {
    text-decoration: underline;
  }

  .listContainer .nicoChat .addFilter {
    display: none;
    position: absolute;
    font-size: 10px;
    color: #fff;
    background: #666;
    cursor: pointer;
    top: 0;
  }

  .listContainer .nicoChat:hover .addFilter {
    display: inline-block;
    border: 1px solid #ccc;
    box-shadow: 2px 2px 2px #333;
  }

  .listContainer .nicoChat .addFilter.addUserIdFilter {
    right: 8px;
    width: 48px;
  }
  .listContainer .nicoChat .addFilter.addWordFilter {
    right: 64px;
    width: 48px;
  }
  .listContainer .nicoChat .addFilter:active {
    transform: translateY(2px);
  }

  .zenzaScreenMode_sideView .zenzaCommentPreview,
  .zenzaScreenMode_small .zenzaCommentPreview {
    background: rgba(0, 0, 0, 0.9);
  }
`, {className: 'commentPreview list'});

util.addStyle(`
  .zenzaCommentPreview {
    bottom: 24px;
    box-sizing: border-box;
    height: 140px;
    z-index: 160;
    transition: none;
    color: #fff;
    opacity: 0.6;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    contain: layout style size paint;
    filter: drop-shadow(0 0 1px #000);
  }
  .listContainer {
    bottom: auto;
    width: 100%;
    height: 100% !important;
    margin: auto;
    border: none;
    contain: layout style size paint;
  }
  .listContainer .nicoChat {
    display: block;
    top: auto !important;
    font-size: 16px;
    line-height: 18px;
    height: 18px;
    white-space: nowrap;
  }
  .listContainer .nicoChat:nth-child(n + 8) {
    transform: translateY(-144px);
  }
  .listContainer .nicoChat:nth-child(n + 16) {
    transform: translateY(-288px);
  }
  .listContainer .nicoChat .text {
    display: inline-block;
    text-shadow: 1px 1px 1px #fff;

    transform: translateX(260px);
    visibility: hidden;
    will-change: transform;
    animation-duration: var(--duration);
    animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
    animation-play-state: paused !important;
    animation-name: preview-text-moving;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  .listContainer .nicoChat .vposTime,
  .listContainer .nicoChat .addFilter {
    display: none !important;
  }

  @keyframes preview-text-moving {
    0% {
      visibility: visible;
    }
    100% {
      visibility: hidden;
      transform: translateX(85px) translateX(-100%);
    }
  }

`, {className: 'commentPreview hover', disabled: true});


  class CommentPreview {
    constructor(params) {
      this._model = new CommentPreviewModel({});
      this._view = new CommentPreviewView({
        model:      this._model,
        $container: params.$container
      });

      this.reset();
    }
    reset() {
      this._model.reset();
      this._view.hide();
    }
    set chatList(chatList) {
      this._model.chatList = chatList;
    }
    set currentTime(sec) {
      this._model.currentTime = sec;
    }
    update(left) {
      this._view.update(left);
    }
    hide() {
    }
    set mode(v) {
      if (v === this._mode) { return; }
      this._mode = v;
      this._view.mode = v;
    }
    get mode() {
      return this._mode;
    }
  }

  class SeekBarToolTip {
    constructor(params) {
      this._$container = params.$container;
      this._storyboard = params.storyboard;
      this._initializeDom(params.$container);

      this._boundOnRepeat = this._onRepeat.bind(this);
      this._boundOnMouseUp = this._onMouseUp.bind(this);
    }
    _initializeDom($container) {
      util.addStyle(SeekBarToolTip.__css__);
      const $view = this._$view = util.$.html(SeekBarToolTip.__tpl__);

      this._currentTime = $view.find('.currentTime')[0];
      TextLabel.create({
        container: this._currentTime,
        name: 'currentTimeLabel',
        text: '00:00',
        style: {
          widthPx: 50,
          heightPx: 16,
          fontFamily: 'monospace',
          fontWeight: '',
          fontSizePx: 12,
          color: '#ccc'
        }
      }).then(label => this.currentTimeLabel = label);

      $view
        .on('mousedown',this._onMouseDown.bind(this))
        .on('click', e => { e.stopPropagation(); e.preventDefault(); });

      this._seekBarThumbnail = new SeekBarThumbnail({
        storyboard: this._storyboard,
        container: $view.find('.seekBarThumbnailContainer')[0]
      });

      $container.append($view);
    }
    _onMouseDown(e) {
      e.stopPropagation();
      const target = e.target.closest('[data-command]');
      if (!target) {
        return;
      }
      const {command, param, repeat} = target.dataset;
      if (!command) { return; }

      util.dispatchCommand(e.target, command, param);
      if (repeat === 'on') {
        this._beginRepeat(command, param);
      }
    }
    _onMouseUp(e) {
      e.preventDefault();
      this._endRepeat();
    }
    _beginRepeat(command, param) {
      this._repeatCommand = command;
      this._repeatParam   = param;

      util.$('body')
        .on('mouseup.zenzaSeekbarToolTip', this._boundOnMouseUp);
      this._$view
        .on('mouseleave', this._boundOnMouseUp)
        .on('mouseup', this._boundOnMouseUp);
      if (this._repeatTimer) {
        window.clearInterval(this._repeatTimer);
      }
      this._repeatTimer = window.setInterval(this._boundOnRepeat, 200);
      this._isRepeating = true;
    }
    _endRepeat() {
      this._isRepeating = false;
      if (this._repeatTimer) {
        window.clearInterval(this._repeatTimer);
        this._repeatTimer = null;
      }
      util.$('body').off('mouseup.zenzaSeekbarToolTip');
      this._$view.off('mouseleave').off('mouseup');
    }
    _onRepeat() {
      if (!this._isRepeating) {
        this._endRepeat();
        return;
      }
      util.dispatchCommand(this._$view[0], this._repeatCommand, this._repeatParam);
    }
    update(sec, left) {
      const timeText = util.secToTime(sec);
      if (this._timeText === timeText) { return; }
      this._timeText = timeText;
      this.currentTimeLabel && (this.currentTimeLabel.text = timeText);
      const w  = this.offsetWidth = this.offsetWidth || this._$view[0].offsetWidth;
      const vw = window.innerWidth;
      left = Math.max(0, Math.min(left - w / 2, vw - w));
      this._$view[0].style.setProperty('--trans-x-pp', cssUtil.px(left));
      this._seekBarThumbnail.currentTime = sec;
    }
  }


  SeekBarToolTip.__css__ = (`
    .seekBarToolTip {
      position: absolute;
      display: inline-block;
      visibility: hidden;
      z-index: 300;
      position: absolute;
      box-sizing: border-box;
      bottom: 24px;
      left: 0;
      width: 180px;
      white-space: nowrap;
      font-size: 10px;
      background: rgba(0, 0, 0, 0.3);
      z-index: 150;
      opacity: 0;
      border: 1px solid #666;
      border-radius: 8px;
      padding: 8px 4px 0;
      transform: translate3d(var(--trans-x-pp), 0, 10px);
      transition: --trans-x-pp 0.1s, opacity 0.2s ease 0.5s;
      pointer-events: none;
    }

    .is-wheelSeeking .seekBarToolTip,
    .is-dragging .seekBarToolTip,
    .seekBarContainer:hover  .seekBarToolTip {
      opacity: 1;
      visibility: visible;
    }

    .seekBarToolTipInner {
      padding-bottom: 10px;
      pointer-events: auto;
      display: flex;
      text-align: center;
      vertical-aligm: middle;
      width: 100%;
    }
    .is-wheelSeeking .seekBarToolTipInner,
    .is-dragging .seekBarToolTipInner {
      pointer-events: none;
    }

    .seekBarToolTipInner>* {
      flex: 1;
    }

    .seekBarToolTip .currentTime {
      display: inline-block;
      height: 16px;
      margin: 4px 0;
    }

    .seekBarToolTip .controlButton {
      display: inline-block;
      width: 40px;
      height: 28px;
      line-height: 22px;
      font-size: 20px;
      border-radius: 50%;
      margin: 0;
      cursor: pointer;
    }

    .seekBarToolTip .controlButton * {
      cursor: pointer;
    }

    .seekBarToolTip .controlButton:hover {
      text-shadow: 0 0 8px #fe9;
      box-shdow: 0 0 8px #fe9;
    }

    .seekBarToolTip .controlButton:active {
      font-size: 16px;
    }

    .seekBarToolTip .controlButton.toggleCommentPreview {
      opacity: 0.5;
    }

    .enableCommentPreview .seekBarToolTip .controlButton.toggleCommentPreview {
      opacity: 1;
      background: rgba(0,0,0,0.01);
    }

    .is-fullscreen .seekBarToolTip {
      bottom: 10px;
    }
  `).trim();

  SeekBarToolTip.__tpl__ = (`
    <div class="seekBarToolTip">
      <div class="seekBarThumbnailContainer"></div>
      <div class="seekBarToolTipInner">
        <div class="seekBarToolTipButtonContainer">
          <div class="controlButton backwardSeek" data-command="seekBy" data-param="-5" title="5秒戻る" data-repeat="on">
            <div class="controlButtonInner">⇦</div>
          </div>

          <div class="currentTime"></div>

          <div class="controlButton toggleCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
            <div class="menuButtonInner">💬</div>
          </div>


          <div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む" data-repeat="on">
            <div class="controlButtonInner">⇨</div>
          </div>
        </div>
      </div>
    </div>
  `).trim();


  class SmoothSeekBarPointer {
    constructor(params) {
      this._pointer = params.pointer;
      this._currentTime = 0;
      this._duration = 1;
      this._playbackRate = 1;
      this._isSmoothMode = true;
      this._isPausing = true;
      this._isSeeking = false;
      this._isStalled = false;
      if (!this._pointer.animate && !('registerProperty' in CSS)) {
        this._isSmoothMode = false;
      }
      this._pointer.classList.toggle('is-notSmooth', !this._isSmoothMode);
      params.playerState.onkey('isPausing', v => this.isPausing = v);
      params.playerState.onkey('isSeeking', v => this.isSeeking = v);
      params.playerState.onkey('isStalled', v => this.isStalled = v);
     }
    get currentTime() {
      return this._currentTime;
    }
    set currentTime(v) {
      if (!this._isSmoothMode) {
        const per = Math.min(100, this._timeToPer(v));
        this._pointer.style.setProperty('--trans-x-pp', cssUtil.vw(per));
        // this._pointer.style.transform = `translate3d(${per}vw, 0, 0) translate3d(-50%, -50%, 0)`;
        return;
      }
      if (document.hidden) { return; }
      if (this._currentTime === v) {
        if (this.isPlaying) {
          this._animation.currentTime = v;
          this.isStalled = true;
          return;
        }
      } else {
        if (this.isStalled) {
          this.isStalled = false;
        }
      }
      this._currentTime = v;

      // 誤差が一定以上になったときのみ補正する
      // videoのcurrentTimeは秒. Animation APIのcurrentTimeはミリ秒
      if (this._animation &&
        Math.abs(v * 1000 - this._animation.currentTime) > 300) {
        this._animation.currentTime = v * 1000;
      }
    }
    _timeToPer(time) {
      return (time / Math.max(this._duration, 1)) * 100;
    }
    set duration(v) {
      if (this._duration === v) { return; }
      this._duration = v;
      this.refresh();
    }
    set playbackRate(v) {
      if (this._playbackRate === v) { return; }
      this._playbackRate = v;
      if (!this._animation) { return; }
      this._animation.playbackRate = v;
    }
    get isPausing() {
      return this._isPausing;
    }
    set isPausing(v) {
      if (this._isPausing === v) { return; }
      this._isPausing = v;
      this._updatePlaying();
    }
    get isSeeking() {
      return this._isSeeking;
    }
    set isSeeking(v) {
      if (this._isSeeking === v) { return; }
      this._isSeeking = v;
      this._updatePlaying();
    }
    get isStalled() {
      return this._isStalled;
    }
    set isStalled(v) {
      if (this._isStalled === v) { return; }
      this._isStalled = v;
      this._updatePlaying();
    }
    get isPlaying() {
      return !this.isPausing && !this.isStalled && !this.isSeeking;
    }
    _updatePlaying() {
      if (!this._animation) { return; }
      if (this.isPlaying) {
        this._animation.play();
      } else {
        this._animation.pause();
      }
    }
    refresh() {
      if (!this._isSmoothMode) { return; }
      if (this._animation) {
        this._animation.finish();
      }
      this._animation = this._pointer.animate([
        {'--trans-x-pp': 0},
        {'--trans-x-pp': cssUtil.vw(100)}
      ], {duration: this._duration * 1000, fill: 'backwards'});
      this._animation.currentTime = this._currentTime * 1000;
      this._animation.playbackRate = this._playbackRate;
      if (this.isPlaying) {
        this._animation.play();
      } else {
        this._animation.pause();
      }
    }
  }


  class WheelSeeker extends BaseViewComponent {
    static get template() {
      return `
        <div class="root" style="display: none;">
        </div>
      `;
    }

    constructor(params) {
      super({
        parentNode: params.parentNode,
        name: 'WheelSeeker',
        template: '<div class="WheelSeeker"></div>',
        shadow: WheelSeeker.template
      });
      Object.assign(this._props, {
        watchElement: params.watchElement,
        isActive: false,
        pos: 0,
        ax: 0,
        lastWheelTime: 0,
        duration: 1
      });
      this._bound.onWheel = _.throttle(this.onWheel.bind(this), 50);
      this._bound.onMouseUp = this.onMouseUp.bind(this);
      this._bound.dispatchSeek =this.dispatchSeek.bind(this);

      this._props.watchElement.addEventListener(
        'wheel', this._bound.onWheel, {passive: false});
    }

    _initDom(...args) {
      super._initDom(...args);

      this._elm = Object.assign({}, this._elm, {
        root: this._shadow || this._view,
        // pointer: (this._shadow || this._view).querySelector('.pointer')
      });
      this._shadow.addEventListener('contextmenu', e => {
        e.stopPropagation();
        e.preventDefault();
      });
    }

    enable() {
      document.addEventListener(
        'mouseup', this._bound.onMouseUp, {capture: true, once: true});
      this.refresh();
      this.dispatchCommand('wheelSeek-start');
      this._elm.root.style.display = '';
      this._props.isActive = true;
      this._props.ax = 0;
      this._props.lastWheelTime = performance.now();
    }

    disable() {
      document.removeEventListener('mouseup', this._bound.onMouseUp);
      this.dispatchCommand('wheelSeek-end');
      this.dispatchCommand('seek', this.currentTime);
      this._props.isActive = false;
      setTimeout(() => {
        this._elm.root.style.display = 'none';
      }, 300);
    }

    onWheel(e) {
      let {buttons, deltaY} = e;

      if (!deltaY) { return; }
      deltaY = Math.abs(deltaY) >= 100 ? deltaY / 50 : deltaY;
      if (this.isActive) {
        e.preventDefault();
        e.stopPropagation();
        if (!buttons && !e.shiftKey) {
          return this.disable();
        }
        let pos = this._props.pos;
        let ax = this._props.ax;
        const deltaReversed = ax * deltaY < 0 ;//lastDelta * deltaY < 0;
        const now = performance.now();
        const seconds = ((now - this._props.lastWheelTime) / 1000);
        this._props.lastWheelTime = now;
        if (deltaReversed) {
          ax = deltaY > 0 ? 0.5 : -0.5;
        } else {
          ax =
            ax *
            Math.pow(1.15, Math.abs(deltaY)) * // speedup
            Math.pow(0.8, Math.floor(seconds/0.1)) // speeddown
          ;
          ax = Math.min(20, Math.abs(ax)) * (ax > 0 ? 1: -1);
          pos += ax; // / 100;
        }
        pos = Math.min(100, Math.max(0, pos));

        this._props.ax = ax;
        this.pos = pos;
        this._bound.dispatchSeek();
      } else if (buttons || e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this.enable();
        this._props.ax = deltaY > 0 ? 0.5 : -0.5;
      }
    }

    onMouseUp(e) {
      if (!this.isActive) { return; }
      e.preventDefault();
      e.stopPropagation();
      this.disable();
    }

    dispatchSeek() {
      this.dispatchCommand('wheelSeek', this.currentTime);
    }

    refresh() {
      // this._elm.pointer.style.transform = `translateX(${this._props.pos}%)`;
    }

    get isActive() {
      return this._props.isActive;
    }
    get duration() {
      return this._props.duration;
    }
    set duration(v) {
      this._props.duration = v;
    }
    get pos() {
      return this._props.pos;
    }
    set pos(v) {
      this._props.pos = v;
      if (this.isActive) {
        this.refresh();
      }
    }
    get currentTime() {
      return this.duration * this.pos / 100;
    }
    set currentTime(v) {
      this.pos = v / this.duration * 100;
    }
  }

//===END===

export {
  VideoControlBar,
  HeatMapWorker,
  CommentPreviewModel,
  CommentPreviewView,
  CommentPreview,
  SeekBarToolTip
};

