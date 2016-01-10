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
      width: 100%; {* 100vwだと縦スクロールバーと被る *}
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
    .zenzaScreenMode_wide .showVideoControlBar .videoControlBar,
    .fullScreen           .showVideoControlBar .videoControlBar {
      opacity: 1 !important;
      background: #000 !important;
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

    .controlItemContainer {
      position: absolute;
      top: 10px;
      height: 40px;
      z-index: 200;
    }
    .controlItemContainer.center {
      left: 50%;
      height: 40px;
      transform: translate(-50%, 0);
      background: #222;
    }

    .controlItemContainer.right {
      right: 0;
    }


    .controlButton {
      position: relative;
      display: inline-block;
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      pointer-events: none;
      color: #fff;
      opacity: 0.8;
      margin-right: 8px;
      {*border: 1px solid #ccc;
      border-radius: 8px;*}
    }
    .controlButton:hover {
      text-shadow: 0 0 8px #ff9;
      cursor: pointer;
      opacity: 1;
    }
    .abort   .playControl,
    .error   .playControl,
    .loading .playControl {
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
      border: 1px solid !000;
      background: #ffc;
      color: #000;
      text-shadow: none;
      white-space: nowrap;
      z-index: 100;
      opacity: 0.8;
    }
    .controlButton:hover .tooltip {
      display: block;
      opacity: 1;
    }
    .videoControlBar:hover .controlButton {
      opacity: 1;
      pointer-events: auto;
    }

    .settingPanelSwitch {
      font-size: 20px;
      line-height: 30px;
      width: 32px;
      height: 32px;
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


    .controlButtoncontainer {
      position: absolute;
    }


    .seekTop {
      left: 0px;
      font-size: 23px;
      width: 32px;
      height: 32px;
      margin-top: -2px;
      line-height: 30px;
    }
    .seekTop .controlButtonInner{
    }
    .seekTop:active {
      font-size: 18px;
    }

    .togglePlay {
      font-size: 20px;
      width: 32px;
      height: 32px;
      line-height: 30px;
      box-sizing: border-box;
      transition: font-size 0.2s ease;
    }
    .togglePlay:active {
      font-size: 15px;
    }

    .togglePlay .pause,
    .playing .togglePlay .play {
      display: none;
    }

    .togglePlay>.pause {
      letter-spacing: -10px;
    }

    .playing .togglePlay .pause {
      display: block;
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
      background: #663;
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
      display: inline-block;
      top: 0;
      padding: 0 8px;
      height: 32px;
      line-height: 32px;
      color: #fff;
      font-size: 10px;
      white-space: nowrap;
      background: rgba(33, 33, 33, 0.5);
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

    .zenzaHeatMap {
      position: absolute;
      pointer-events: none;
      top: 2px; left: 0;
      width: 100%;
      height: 6px;
      transform-origin: 0 0 0;
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
    }
    .loopSwitch:active {
      font-size: 15px;
    }

    .loop .loopSwitch {
      text-shadow: 0px 0px 2px #9cf;
      color: #9cf;
    }

    .playbackRateMenu {
      bottom: 0;
      width:  32px;
      height: 32px;
      line-height: 30px;
      font-size: 14px;
      white-space: nowrap;
    }

    .playbackRateMenu:active {
      font-size: 10px;
    }
    .playbackRateMenu.show {
      background: #888;
    }


    .playbackRateSelectMenu  {
      bottom: 48px;
      left: 28px;
    }

    .playbackRateSelectMenu ul {
      margin: 2px 8px;
    }

    .playbackRateSelectMenu .triangle {
      transform: rotate(-45deg);
      bottom: -9px;
      right: 8px;
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

    .screenModeMenu:hover {
    }

    .screenModeMenu.show {
      background: #888;
    }

    .screenModeMenu:active {
      font-size: 10px;
    }


    .fullScreen .screenModeMenu {
      display: none;
    }

    .screenModeSelectMenu {
      right: 30px;
      bottom: 48px;
      width: 148px;
      padding: 2px 4px;
    }

    .changeScreenMode .screenModeSelectMenu,
    .fullScreen       .screenModeSelectMenu {
      display: none;
    }

    .screenModeSelectMenu .triangle {
      transform: rotate(-45deg);
      bottom: -8.5px;
      right: 66px;
    }

    .screenModeSelectMenu ul li {
      display: inline-block;
      text-align: center;
      border-bottom: none;
      margin: 0;
      padding: 0;
    }
    .screenModeSelectMenu ul li span {
      border: 1px solid #ccc;
      width: 50px;
      margin: 2px 8px;
      padding: 4px 0;
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


    .fullScreenSwitch {
      width:  32px;
      height: 32px;
      line-height: 30px;
      font-size: 20px;
    }
    .fullScreenSwitch:active {
      font-size: 15px;
    }

             .fullScreen  .fullScreenSwitch .controlButtonInner .toFull,
    body:not(.fullScreen) .fullScreenSwitch .controlButtonInner .returnFull {
      display: none;
    }


  */});

  VideoControlBar.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoControlBar">

      <div class="seekBarContainer">
        <div class="seekBar">
          <div class="tooltip"></div>
          <div class="pointer"></div>
          <div class="bufferRange"></div>
        </div>
      </div>

      <div class="controlItemContainer center">
        <div class="loopSwitch controlButton playControl" data-command="toggleLoop">
          <div class="controlButtonInner">&#8635;</div>
          <div class="tooltip">リピート</div>
        </div>

         <div class="seekTop controlButton playControl" data-command="seek" data-param="0">
          <div class="controlButtonInner">&#8676;<!-- &#x23EE; --><!--&#9475;&#9666;&#9666;--></div>
          <div class="tooltip">先頭</div>
        </div>

        <div class="togglePlay controlButton playControl" data-command="togglePlay">
          <span class="play">▶</span>
          <span class="pause">&#10073; &#10073;<!--&#x2590;&#x2590;--><!-- &#x23F8; --> <!--&#12307; --></span>
          <div class="tooltip">
            <span class="play">再生</span>
            <span class="pause">一時停止</span>
          </div>
        </div>

        <div class="playbackRateMenu controlButton" data-command="playbackRateMenu">
          <div class="controlButtonInner">1x</div>
          <div class="tooltip">再生速度</div>
        </div>

        <div class="videoTime">
          <span class="currentTime"></span> /
          <span class="duration"></span>
        </div>

        <div class="playbackRateSelectMenu zenzaPopupMenu">
          <div class="triangle"></div>
          <p class="caption">再生速度</p>
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

      </div>

      <div class="controlItemContainer right">
        <div class="screenModeSelectMenu zenzaPopupMenu">
          <div class="triangle"></div>
          <p class="caption">画面モード</p>
          <ul>
            <li class="screenMode mode3D"   data-command="screenMode" data-screen-mode="3D"><span>3D</span></li>
            <li class="screenMode small"    data-command="screenMode" data-screen-mode="small"><span>小</span></li>
            <li class="screenMode sideView" data-command="screenMode" data-screen-mode="sideView"><span>横</span></li>
            <li class="screenMode normal"   data-command="screenMode" data-screen-mode="normal"><span>中</span></li>
            <li class="screenMode wide"     data-command="screenMode" data-screen-mode="wide"><span>WIDE</span></li>
            <li class="screenMode big"      data-command="screenMode" data-screen-mode="big"><span>大</span></li>
          </ul>
        </div>

        <div class="screenModeMenu controlButton" data-command="screenModeMenu">
          <div class="tooltip">画面モード変更</div>
          <div class="controlButtonInner">&#9114;</div>
        </div>

        <div class="fullScreenSwitch controlButton" data-command="fullScreen">
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
  */});

  _.assign(VideoControlBar.prototype, {
    initialize: function(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      var player = this._player = params.player;

      player.on('open',           $.proxy(this._onPlayerOpen, this));
      player.on('canPlay',        $.proxy(this._onPlayerCanPlay, this));
      player.on('durationChange', $.proxy(this._onPlayerDurationChange, this));
      player.on('close',          $.proxy(this._onPlayerClose, this));
      player.on('progress',       $.proxy(this._onPlayerProgress, this));
      player.on('loadVideoInfo',  $.proxy(this._onLoadVideoInfo, this));
      player.on('commentParsed',  $.proxy(this._onCommentParsed, this));

      this._initializeDom();
      this._initializeScreenModeSelectMenu();
      this._initializePlaybackRateSelectMenu();
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

      $view.find('.controlButton')
        .on('click', $.proxy(this._onControlButton, this));

      this._$currentTime = $view.find('.currentTime');
      this._$duration    = $view.find('.duration');

      this._heatMap = new HeatMap({
        $container: this._$seekBarContainer.find('.seekBar')
      });
      var updateHeatMapVisibility = function(v) {
        self._$seekBarContainer.toggleClass('noHeatMap', !v);
      };
      updateHeatMapVisibility(this._playerConfig.getValue('enableHeatMap'));
      this._playerConfig.on('update-enableHeatMap', updateHeatMapVisibility);

      this._$screenModeMenu       = $view.find('.screenModeMenu');
      this._$screenModeSelectMenu = $view.find('.screenModeSelectMenu');

      this._$playbackRateMenu       = $view.find('.playbackRateMenu');
      this._$playbackRateSelectMenu = $view.find('.playbackRateSelectMenu');

      ZenzaWatch.emitter.on('hideHover', $.proxy(function() {
        this._hideMenu();
      }, this));

      $container.append($view);
      this._width = this._$seekBarContainer.innerWidth();
    },
    _initializeScreenModeSelectMenu: function() {
      var self = this;
      var $menu = this._$screenModeSelectMenu;

      $menu.on('click', 'span', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.screenMode'));
        var mode     = $target.attr('data-screen-mode');

        self.emit('command', 'screenMode', mode);
      });

    },
    _initializePlaybackRateSelectMenu: function() {
      var self = this;
      var config = this._playerConfig;
      var $btn  = this._$playbackRateMenu;
      var $label = $btn.find('.controlButtonInner');
      var $menu = this._$playbackRateSelectMenu;

      $menu.on('click', '.playbackRate', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target.closest('.playbackRate'));
        var rate     = parseFloat($target.attr('data-rate'), 10);
        self.emit('command', 'playbackRate', rate);
      });

      var updatePlaybackRate = function(rate) {
        $label.text(rate + 'x');
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
      var $container = this._$view.find('.volumeControl');
      var $tooltip = $container.find('.tooltip');
      var $bar = this._$playerContainer.find('.volumeControl .slideBar');

      this._setVolumeBar = function(v) {
        var per = Math.round(v * 100);
        $bar.css({ height: per + '%'});
        $tooltip.text('音量 (' + per + '%)');
      };

      var $inner = this._$playerContainer.find('.volumeControlInner');
      $inner.on('mousedown', $.proxy(function(e) {
        var height = $inner.outerHeight();
        var y = (height - e.offsetY);
        var vol = y / height;

        this.emit('command', 'volume', vol);

        e.preventDefault();
        e.stopPropagation();
      }, this));

      this._setVolumeBar(this._playerConfig.getValue('volume'));
    },
    _onControlButton: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $target = $(e.target.closest('.controlButton'));
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      switch (command) {
        case 'screenModeMenu':
          this.toggleScreenModeMenu();
          break;
        case 'playbackRateMenu':
          this.togglePlaybackRateMenu();
          break;
        default:
          this.emit('command', command, param);
          break;
       }
    },
    _hideMenu: function() {
      var self = this;
      $([
        'toggleScreenModeMenu',
        'togglePlaybackRateMenu'
      ]).each(function(i, func) {
        (self[func])(false);
      });
    },
    togglePlaybackRateMenu: function(v) {
      var $btn  = this._$playbackRateMenu;
      var $menu = this._$playbackRateSelectMenu;
      this._toggleMenu('playbackRate', $btn, $menu, v);
    },
    toggleScreenModeMenu: function(v) {
      var $btn  = this._$screenModeMenu;
      var $menu = this._$screenModeSelectMenu;
      this._toggleMenu('screenMode', $btn, $menu, v);
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
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
      }
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
    _onPlayerOpen: function() {
      this._startTimer();
      this.setDuration(0);
      this.setCurrentTime(0);
      this._heatMap.reset();
      this.resetBufferedRange();
    },
    _onPlayerCanPlay: function() {
      var duration = this._player.getDuration();
      this.setDuration(duration);

      this._heatMap.setDuration(duration);
    },
    _onCommentParsed: function() {
      this._heatMap.setChatList(this._player.getAllChat());
    },
    _onPlayerDurationChange: function() {
      // TODO: 動画のメタデータ解析後に動画長情報が変わることがあるので、
      // そこで情報を更新する
    },
    _onPlayerClose: function() {
      this._stopTimer();
    },
    _onPlayerProgress: function(range, currentTime) {
      this.setBufferedRange(range, currentTime);
    },
    _startTimer: function() {
      this._timer = window.setInterval($.proxy(this._onTimer, this), 100);
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

      // TODO: 一般会員はバッファ内のみシーク
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
    },
    _onLoadVideoInfo: function(videoInfo) {
      this.setDuration(videoInfo.getDuration());
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec) {
        this._currentTime = sec;

        var m = Math.floor(sec / 60);
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        var currentTimeText = [m, s].join(':');
        if (this._currentTimeText !== currentTimeText) {
          this._currentTimeText = currentTimeText;
          this._$currentTime.text(currentTimeText);
        }
        this._$seekBarPointer.css('left', Math.min(100, this._timeToPer(sec)) + '%');
      }
    },
    setDuration: function(sec) {
      if (sec !== this._duration) {
        this._duration = sec;

        if (sec === 0) {
          this._$duration.text('--:--');
        }
        var m = Math.floor(sec / 60);
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        this._$duration.text([m, s].join(':'));
        this.emit('durationChange');
      }
    },
    setBufferedRange: function(range, currentTime) {
      var $range = this._$bufferRange;
      if (!range || !range.length) {
        return;
      }
      for (var i = 0, len = range.length; i < len; i++) {
        try {
          var start = range.start(i);
          var end   = range.end(i);
          var width = end - start;
          if (start <= currentTime && end >= currentTime) {
            if (this._bufferStart !== start ||
                this._bufferEnd   !== end) {
              $range.css({
                left: this._timeToPer(start) + '%',
                width: this._timeToPer(width) + '%' //TODO: 100%を突き抜けないようにする
              });
              this._bufferStart = start;
              this._bufferEnd   = end;
            }
            break;
          }
        } catch (e) {
        }
      }
    },
    resetBufferedRange: function() {
      this._buffferStart = 0;
      this._buffferEnd = 0;
      this._$bufferRange.css({left: 0, width: 0});
    }
  });

  var HeatMapModel = function() { this.initialize.apply(this, arguments); };
  HeatMapModel.RESOLUTION = 100;
  _.extend(HeatMapModel.prototype, AsyncEmitter.prototype);
  _.assign(HeatMapModel.prototype, {
    initialize: function(params) {
      this._resolution = params.resolution || HeatMapModel.RESOLUTION;
      this.reset();
    },
    reset: function() {
      this._duration = -1;
      this._chatReady = false;
      this._isUpdated = false;
      this.emit('reset');
    },
    setDuration: function(duration) {
      this._duration = duration;
      this.update();
    },
    setChatList: function(comment) {
      this._chat = comment;
      this._chatReady = true;
      this.update();
    },
    update: function() {
      if (this._duration < 0 || !this._chatReady || this._isUpdated) {
        return;
      }
      var map = this._getHeatMap();
      this.emitAsync('update', map);
      this._isUpdated = true;
    },
    _getHeatMap: function() {
      var chatList =
        this._chat.top.concat(
          this._chat.top,
          this._chat.normal,
          this._chat.bottom
        );
      var duration = this._duration;
      var map = new Array(Math.max(Math.min(this._resolution, Math.floor(duration)), 1));
      var i = map.length;
      while(i > 0) map[--i] = 0;

      var ratio = duration > map.length ? (map.length / duration) : 1;

      for (i = chatList.length - 1; i >= 0; i--) {
        var nicoChat = chatList[i];
        var pos = nicoChat.getVpos();
        var mpos = Math.min(Math.floor(pos * ratio / 100), map.length -1);
        map[mpos]++;
      }

      return map;
    }
  });

  var HeatMapView = function() { this.initialize.apply(this, arguments); };
  HeatMapView.prototype = {
    _canvas:  null,
    _palette: null,
    _width: 100,
    _height: 12,
    initialize: function(params) {
      this._model  = params.model;
      this._$container = params.$container;
      this._width  = params.width || 100;
      this._height = params.height || 10;

      this._model.on('update', $.proxy(this._onUpdate, this));
      this._model.on('reset',  $.proxy(this._onReset, this));
    },
    _initializePalette: function() {
      this._palette = [];
      // NicoHeatMaoより控え目な配色にしたい
      for (var c = 0; c < 256; c++) {
        var
          r = Math.floor((c > 127) ? (c / 2 + 128) : 0),
          g = Math.floor((c > 127) ? (255 - (c - 128) * 2) : (c * 2)),
          b = Math.floor((c > 127) ? 0 : (255  - c * 2));
        this._palette.push('rgb(' + r + ', ' + g + ', ' + b + ')');
      }
    },
    _initializeCanvas: function() {
      this._canvas           = document.createElement('canvas');
      this._canvas.className = 'zenzaHeatMap';
      this._canvas.width     = this._width;
      this._canvas.height    = this._height;

      this._$container.append(this._canvas);

      this._context = this._canvas.getContext('2d');

      this.reset();
    },
    _onUpdate: function(map) {
      this.update(map);
    },
    _onReset: function() {
      this.reset();
    },
    reset: function() {
      if (this._context) {
        this._context.fillStyle = this._palette[0];
        this._context.beginPath();
        this._context.fillRect(0, 0, this._width, this._height);
      }
    },
    update: function(map) {
      if (!this._isInitialized) {
        this._isInitialized = true;
        this._initializePalette();
        this._initializeCanvas();
        this.reset();
      }
      //window.console.time('update HeatMap');

      // 一番コメント密度が高い所を100%として相対的な比率にする
      // 赤い所が常にピークになってわかりやすいが、
      // コメントが一カ所に密集している場合はそれ以外が薄くなってしまうのが欠点
      var max = 0, i;
      // -4 してるのは、末尾にコメントがやたら集中してる事があるのを集計対象外にするため (ニコニ広告に付いてたコメントの名残？)
      for (i = Math.max(map.length - 4, 0); i >= 0; i--) max = Math.max(map[i], max);

      if (max > 0) {
        var rate = 255 / max;
        for (i = map.length - 1; i >= 0; i--) {
          map[i] = Math.min(255, Math.floor(map[i] * rate));
        }
      } else {
        //window.console.timeEnd('update HeatMap');
        return;
      }

      var
        scale = map.length >= this._width ? 1 : (this._width / Math.max(map.length, 1)),
        blockWidth = (this._width / map.length) * scale,
        context = this._context;

      for (i = map.length - 1; i >= 0; i--) {
        context.fillStyle = this._palette[parseInt(map[i], 10)] || this._palette[0];
        context.beginPath();
        context.fillRect(i * scale, 0, blockWidth, this._height);
      }
      //window.console.timeEnd('update HeatMap');
    }
  };

  var HeatMap = function() { this.initialize.apply(this, arguments); };
  //_.extend(HeatMap.prototype, AsyncEmitter.prototype);
  _.assign(HeatMap.prototype, {
    initialize: function(params) {
      this._model = new HeatMapModel({
      });
      this._view = new HeatMapView({
        model: this._model,
        $container: params.$container
      });
      this.reset();
    },
    reset: function() {
      this._model.reset();
    },
    setDuration: function(duration) {
      this._model.setDuration(duration);
    },
    setChatList: function(chatList) {
      this._model.setChatList(chatList);
    }
  });


