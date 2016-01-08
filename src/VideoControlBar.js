var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

//===BEGIN===


  var VideoControlBar = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoControlBar.prototype, AsyncEmitter.prototype);
  VideoControlBar.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .videoControlBar {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50%);
      transform: translate(0, -100%);
      width: 100vw;
      height: 40px;
      z-index: 150000;
      background: #000;
      transition: opacity 0.3s ease, transform 0.3s ease;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .changeScreenMode .videoControlBar {
      opacity: 0;
      transform: translate(0, 0);
      transition: none;
    }
    .zenzaScreenMode_small    .videoControlBar,
    .zenzaScreenMode_sideView .videoControlBar,
    .zenzaScreenMode_wide     .videoControlBar,
    .fullScreen               .videoControlBar {
      top: 100%;
      left: 0;
    }
    {* 縦長モニター *}
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .videoControlBar {
        left: calc(-50vw + 50%);
        top: calc(-50vh + 50% + 100vh - 60px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .videoControlBar {
        left: calc(-50vw + 50%);
        top: calc(-50vh + 50% + 100vh - 60px);
      }
    }




    .videoControlBar * {
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }

    .zenzaScreenMode_wide .videoControlBar,
    .fullScreen           .videoControlBar {
      opacity: 0;
      bottom: 0;
      background: none;
    }
    .zenzaScreenMode_wide .mouseMoving .videoControlBar,
    .fullScreen           .mouseMoving .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
    }

    .stalled .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
    }


    .zenzaScreenMode_wide .videoControlBar.dragging,
    .fullScreen           .videoControlBar.dragging,
    .zenzaScreenMode_wide .videoControlBar:hover,
    .fullScreen           .videoControlBar:hover {
      opacity: 1;
      background: rgba(0, 0, 0, 0.9);
    }

    .controlButton {
      position: absolute;
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      pointer-events: none;
      opacity: 0.8;
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
      border: 1px solid !000;
      background: #ffc;
      color: #000;
      text-shadow: none;
      white-space: nowrap;
      z-index: 100;
    }
    .controlButton:hover .tooltip {
      display: block;
      opacity: 1;
    }
    .videoControlBar:hover .controlButton {
      pointer-events: auto;
    }
    .mouseMoving .controlButton {
      background: rgba(0xcc, 0xcc, 0xcc, 0.5);
    }
    .mouseMoving  .controlButtonInner {
      word-break: normal;
    }

    .controlButton:hover {
      cursor: pointer;
      opacity: 1;
    }

    .settingPanelSwitch {
      right: 8px;
      top: 10px;
      color: #fff;
      font-size: 20px;
      line-height: 32px;
      transition: font-size 0.2s ease;
    }
    .settingPanelSwitch:hover {
      text-shadow: 0 0 8px #ff9;
    }
    .controlButton:active {
      font-size: 15px;
    }
    .settingPanelSwitch .tooltip {
      left: 0;
    }




    .togglePlay {
      position: absolute;
      left: 8px;
      top: 10px;
      font-size: 20px;
      width: 32px;
      height: 32px;
      line-height: 30px;
      box-sizing: border-box;
      cursor: pointer;
      color: #fff;
      text-align: center;
      pointer-events: none;
      transition: font-size 0.2s ease;
    }
    .togglePlay:active {
      font-size: 15px;
    }
    .stalled .togglePlay,
    .mouseMoving .togglePlay {
      opacity: 1;
    }
    .videoControlBar:hover .togglePlay {
      opacity: 1;
      pointer-events: auto;
    }

    .abort   .togglePlay,
    .error   .togglePlay,
    .loading .togglePlay {
      opacity: 0;
      pointer-events: none;
    }

    .togglePlay .pause,
    .playing .togglePlay .play {
      display: none;
    }

    .togglePlay .pause {
      transform: rotate(90deg);
    }

    .playing .togglePlay .pause {
      display: block;
    }

    .togglePlay:hover {
      text-shadow: 0 0 8px #ff9;
    }

    .zenzaScreenMode_wide .togglePlay,
    .fullScreen           .togglePlay {
      color: #fff;
    }

    .seekBarContainer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      cursor: pointer;
      z-index: 150;
    }

    .abort   .seekBarContainer,
    .loading .seekBarContainer,
    .error   .seekBarContainer {
      pointer-events: none;
      webkit-filter: grayscale();
      moz-filter: grayscale();
      filter: grayscale();
    }
    .abort   .seekBarContainer *,
    .loading .seekBarContainer *,
    .error   .seekBarContainer * {
      display: none;
    }

    .seekBar {
      position: relative;
      width: 100%;
      height: 10px;
      margin: px 0 2px;
      border-top:    1px solid #333;
      border-bottom: 1px solid #333;
      cursor: pointer;
    }

    .mouseMoving .seekBar {
      background-color: rgba(0, 0, 0, 0.5);
    }

    .seekBarContainer .seekBar * {
      pointer-events: none;
    }

    .bufferRange {
      position: absolute;
      height: 100%;
      top: 0px;
      box-shadow: 0 0 4px #888;
      mix-blend-mode: lighten;
      z-index: 100;
      background: #666;
    }

    .seekBar .pointer {
      position: absolute;
      top: 50%;
      width: 6px;
      height: 14px;
      background: #fff;
      border-radius: 4px;
      transform: translate(-50%, -50%);
      z-index: 200;
    }

    .videoControlBar .videoTime {
      position: absolute;
      display: inline-block;
      min-width: 96px;
      left: 64px;
      top: 10px;
      height: 32px;
      line-height: 32px;
      color: #fff;
      font-size: 10px;
      white-space: nowrap;
      background: #000;
      border-radius: 4px;
      text-align: center;
    }
    .videoControlBar .videoTime .currentTime,
    .videoControlBar .videoTime .duration {
      display: inline-block;
      color: #fff;
      text-align: center;
    }

    .videoControlBar.loading .videoTime {
      display: none;
    }

    .seekBar .tooltip {
      position: absolute;
      padding: 1px;
      bottom: 15px;
      left: 0;
      transform: translate(-50%, 0);
      white-space: nowrap;
      font-size: 10px;
      opacity: 0;
      border: 1px solid #000;
      background: #fff;
      color: #000;
    }

    .dragging .seekBar .tooltip,
    .seekBar:hover .tooltip {
      opacity: 0.8;
    }

  */});

  VideoControlBar.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoControlBar">
      <div class="controlButtonContainer left">
        <div class="togglePlay controlButton" data-command="togglePlay">
          <span class="play">▶</span>
          <span class="pause">&#12307;</span>
        </div>
      </div>

      <div class="videoTime">
        <span class="currentTime"></span> /
        <span class="duration"></span>
      </div>
      <div class="seekBarContainer">
        <div class="seekBar">
          <div class="tooltip"></div>
          <div class="pointer"></div>
          <div class="bufferRange"></div>
        </div>
      </div>

      <div class="settingPanelSwitch controlButton" data-command="settingPanel">
        <div class="controlButtonInner">&#x2699;</div>
        <div class="tooltip">設定</div>
      </div>

    </div>
  */});

  _.assign(VideoControlBar.prototype, {
    initialize: function(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      var player = this._player = params.player;

      player.on('open',          $.proxy(this._onPlayerOpen,  this));
      player.on('close',         $.proxy(this._onPlayerClose, this));
      player.on('loadVideoInfo', $.proxy(this._onLoadVideoInfo, this));

      this._initializeDom();
    },
    _initializeDom: function() {
      ZenzaWatch.util.addStyle(VideoControlBar.__css__);
      var $view = this._$view = $(VideoControlBar.__tpl__);
      var $container = this._$playerContainer;
      var self = this;

      this._$seekBarContainer = $view.find('.seekBarContainer');
      this._$seekBar          = $view.find('.seekBar');
      this._$seekBarPointer = $view.find('.pointer');
      this._$bufferRange    = $view.find('.bufferRange');
      this._$tooltip        = $view.find('.seekBar .tooltip');
      $container.on('click', function(e) {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover');
      });

      this._$seekBar.on('mousedown', $.proxy(this._onSeekBarMouseDown, this));
      this._$seekBar.on('mousemove', $.proxy(this._onSeekBarMouseMove, this));

      $view.find('.controlButton').on('click', function(e) {
        var $target = $(e.target).closest('.controlButton');
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        window.console.log('execCommand', command, param);
        self.emit('command', command, param);
        e.stopPropagation();
      });

      this._$currentTime = $view.find('.currentTime');
      this._$duration    = $view.find('.duration');

      $container.append($view);
      this._width = this._$seekBarContainer.innerWidth();
    },
    _onPlayerOpen: function() {
      this._startTimer();
      this.setCurrentTime(0);
      this.setBufferedRange(null);
    },
    _posToTime: function(pos) {
      var width = this._$seekBar.innerWidth();
      return this._duration * (pos / Math.max(width, 1));
    },
    _timeToPos: function(time) {
      return this._width * (time / Math.max(this._duration, 1));
    },
    _timeToPer: function(time) {
      return (time / Math.max(this._duration, 1)) * 100;
    },
    _onPlayerClose: function() {
      this._stopTimer();
    },
    _startTimer: function() {
      this._timer = window.setInterval($.proxy(this._onTimer, this), 500);
    },
    _stopTimer: function() {
      if (this._timer) {
        window.clearInterval(this._timer);
        this._timer = null;
      }
    },
    _onSeekBarMouseDown: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var left = e.offsetX;
      var sec = this._posToTime(left);
      this._player.setCurrentTime(sec);

      this._beginMouseDrag();
    },
    _onSeekBarMouseMove: function(e) {
      e.stopPropagation();
      var left = e.offsetX;
      var sec = this._posToTime(left);

      this._updateTooltip(sec, left);
    },
    _beginMouseDrag: function() {
      this._bindDragEvent();
      this._$view.addClass('dragging');
    },
    _endMouseDrag: function() {
      this._unbindDragEvent();
      this._$view.removeClass('dragging');
    },
    _onBodyMouseMove: function(e) {
      var offset = this._$seekBar.offset();
      var left = e.clientX - offset.left;
      var sec = this._posToTime(left);

      this._player.setCurrentTime(sec);
      this._updateTooltip(sec, left);
    },
    _updateTooltip: function(sec, left) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      this._$tooltip.text([m, s].join(':'));
      this._$tooltip.css('left', left);
    },
    _onBodyMouseUp: function() {
      this._endMouseDrag();
    },
    _onWindowBlur: function() {
      this._endMouseDrag();
    },
    _bindDragEvent: function() {
      $('body')
        .on('mousemove.ZenzaWatchSeekBar', $.proxy(this._onBodyMouseMove, this))
        .on('mouseup.ZenzaWatchSeekBar',   $.proxy(this._onBodyMouseUp, this));

      $(window).on('blur.ZenzaWatchSeekBar', $.proxy(this._onWindowBlur, this));
    },
    _unbindDragEvent: function() {
      $('body')
        .off('mousemove.ZenzaWatchSeekBar')
        .off('mouseup.ZenzaWatchSeekBar');
      $(window).off('blur.ZenzaWatchSeekBar');
    },
    _onTimer: function() {
      var player = this._player;
      var currentTime = player.getCurrentTime();
      this.setCurrentTime(currentTime);
      this.setBufferedRange(player.getBufferedRange(), currentTime);
    },
    _onLoadVideoInfo: function(videoInfo) {
      this.setDuration(videoInfo.getDuration());
    },
    setCurrentTime: function(sec) {

      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      this._$currentTime.text([m, s].join(':'));

      this._$seekBarPointer.css('left', Math.min(100, this._timeToPer(sec)) + '%');
    },
    setDuration: function(sec) {
      this._duration = sec;

      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      this._$duration.text([m, s].join(':'));
    },
    setBufferedRange: function(range, currentTime) {
      var $range = this._$bufferRange;
      if (!range || range.length < 1) {
        $range.css({left: 0, width: 0});
      }
      for (var i = 0, len = range.length; i < len; i++) {
        try {
          var start = range.start(i);
          var end   = range.end(i);
          var width = end - start;
          if (start <= currentTime && end >= currentTime) {
            $range.css({
              left: this._timeToPer(start) + '%',
              width: this._timeToPer(width) + '%'
            });
            break;
          }
        } catch (e) {
        }
      }
    }
  });


