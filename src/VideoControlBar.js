var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};
var Storyboard = function() {};
var CONSTANT = {};

//===BEGIN===


  var VideoControlBar = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoControlBar.prototype, AsyncEmitter.prototype);
  VideoControlBar.BASE_HEIGHT = CONSTANT.CONTROL_BAR_HEIGHT;
  VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;

  VideoControlBar.__css__ = (`
    .videoControlBar {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50%);
      transform: translate3d(0, -100%, 0);
      width: 100vw;
      height: ${VideoControlBar.BASE_HEIGHT}px;
      z-index: 150000;
      background: #000;
      transition: opacity 0.3s ease, transform 0.3s ease;

      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      content: layout;
    }
    .changeScreenMode .videoControlBar {
      opacity: 0;
      transform: translate3d(0, 0, 0);
      transition: none;
    }
    .zenzaScreenMode_small    .videoControlBar,
    .zenzaScreenMode_sideView .videoControlBar,
    .zenzaScreenMode_wide     .videoControlBar,
    .fullScreen               .videoControlBar {
      top: 100%;
      left: 0;
      width: 100%; /* 100vwだと縦スクロールバーと被る */
    }
    /* 縦長モニター */
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
      position: absolute; /* firefoxのバグ対策 */
      opacity: 0;
      bottom: 0;
      background: none;
    }

    .zenzaScreenMode_wide .volumeChanging .videoControlBar,
    .fullScreen           .volumeChanging .videoControlBar,
    .zenzaScreenMode_wide .is-mouseMoving    .videoControlBar,
    .fullScreen           .is-mouseMoving    .videoControlBar {
      opacity: 0.7;
      background: rgba(0, 0, 0, 0.5);
    }
    .zenzaScreenMode_wide .showVideoControlBar .videoControlBar,
    .fullScreen           .showVideoControlBar .videoControlBar {
      opacity: 1 !important;
      background: #000 !important;
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
      white-space: nowrap;
      overflow: visible;
      transition: transform 0.2s ease, left 0.2s ease;
    }
    .fullScreen .controlItemContainer.center {
      top: auto;
    }
    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center {
      background: transparent;
    }



    .controlItemContainer.center .scalingUI {
      background: #222;
      transform-origin: top center;
    }

    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center .scalingUI {
      background: rgba(32, 32, 32, 0.5);
    }
    .fullScreen.zenzaStoryboardOpen .controlItemContainer.center .scalingUI:hover {
      background: rgba(32, 32, 32, 0.8);
    }

    .controlItemContainer.right {
      right: 0;
    }
    .fullScreen .controlItemContainer.right {
      top: auto;
    }

    .is-mouseMoving .controlItemContainer.right {
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
      transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      color: #fff;
      opacity: 0.8;
      margin-right: 8px;
      vertical-align: middle;
    }
    .controlButton:hover {
      text-shadow: 0 0 8px #ff9;
      cursor: pointer;
      opacity: 1;
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
      border: 1px solid !000;
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


    .controlButtonInner {
      display: inline-block;
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
    .is-playing .togglePlay .play {
      display: none;
    }

    .togglePlay>.pause {
      letter-spacing: -10px;
    }

    .is-playing .togglePlay .pause {
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
    .fullScreen .seekBarContainer {
      top: auto;
      bottom: 0;
      z-index: 300;
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

    .fullScreen .seekBarContainer:hover .seekBarShadow {
      height: 14px;
      top: -12px;
    }

    .is-abort   .seekBarContainer,
    .is-loading .seekBarContainer,
    .is-error   .seekBarContainer {
      pointer-events: none;
      webkit-filter: grayscale();
      moz-filter: grayscale();
      filter: grayscale();
    }
    .is-abort   .seekBarContainer *,
    .is-loading .seekBarContainer *,
    .is-error   .seekBarContainer * {
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
      transition: height 0.2s ease 1s, margin-top 0.2s ease 1s;
    }

    .seekBar:hover {
      height: 24px;
      margin-top: -14px;
      transition: none;
    }

    .fullScreen .seekBar {
      margin-top: 0px;
      margin-bottom: -14px;
      height: 24px;
      transition: none;
    }


    .is-mouseMoving .seekBar {
      background-color: rgba(0, 0, 0, 0.5);
    }

    .seekBarContainer .seekBar * {
      pointer-events: none;
    }

    .bufferRange {
      position: absolute;
      width: 100%;
      height: 110%;
      left: 0px;
      top: 0px;
      box-shadow: 0 0 6px #ff9 inset, 0 0 4px #ff9;
      border-radius: 4px;
      z-index: 100;
      background: #663;
      transform-origin: left;
      transform: translate3d(0, 0, 0) scaleX(0);
      transition: transform 0.2s;
    }

    .is-youTube .bufferRange {
      width: 100% !important;
      height: 110% !important;
      box-shadow: 0 0 6px #f96 inset, 0 0 4px #ff9;
      transition: transform 0.8s ease 0.4s;
      transform: translate3d(0, 0, 0) scaleX(1) !important;
    }

    .zenzaStoryboardOpen .bufferRange {
      background: #ff9;
      mix-blend-mode: lighten;
      opacity: 0.5;
    }

    .noHeatMap .bufferRange {
      background: #666;
    }


    .seekBar .seekBarPointer {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 200;
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      transform-origin: left middle;
      transition: none;
    }

      .seekBar .seekBarPointerCore {
        position: absolute;
        top: 50%;
        width: 12px;
        height: 140%;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 2px;
        transform: translate3d(-50%, -50%, 0);
        box-shadow: 0 0 4px #ffc, 0 0 8px #ff9, 0 0 4px #ffc inset;
      }

    .is-loading  .seekBar .seekBarPointer,
    .dragging .seekBar .seekBarPointer {
      transition: none;
    }

    .videoControlBar .videoTime {
      display: inline-block;
      top: 0;
      padding: 0 16px;
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

    .dragging .seekBarContainer .tooltip,
    .seekBarContainer:hover .tooltip {
      opacity: 0.8;
    }

    .zenzaHeatMap {
      position: absolute;
      pointer-events: none;
      top: 2px; left: 0;
      width: 100%;
      height: calc(100% - 2px);
      transform-origin: 0 0 0;
      transform: translateZ(0);
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
      text-shadow: 0px 0px 2px #9cf;
      color: #9cf;
    }

    .playbackRateMenu {
      bottom: 0;
      min-width: 40px;
      height:    32px;
      line-height: 30px;
      font-size: 18px;
      white-space: nowrap;
    }

    .playbackRateMenu:active {
      font-size: 13px;
    }
    .playbackRateMenu.show {
      background: #888;
    }
    .playbackRateMenu.show .tooltip {
      display: none;
    }


    .playbackRateSelectMenu  {
      bottom: 44px;
      left: 50%;
      transform: translate(-50%, 0);
      width: 180px;
      text-align: left;
      line-height: 20px;
      font-size: 18px !important;
    }

    .playbackRateSelectMenu ul {
      margin: 2px 8px;
    }

    .playbackRateSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -9px;
      left: 50%;
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


    .screenModeMenu.show {
      background: #888;
    }
    .screenModeMenu.show .tooltip {
      display: none;
    }

    .screenModeMenu:active {
      font-size: 10px;
    }


    .fullScreen .screenModeMenu {
      display: none;
    }

    .screenModeSelectMenu {
      left: 50%;
      transform: translate(-50%, 0);
      bottom: 44px;
      width: 148px;
      padding: 2px 4px;
      font-size: 12px;
      line-height: 15px;
    }

    .changeScreenMode .screenModeSelectMenu,
    .fullScreen       .screenModeSelectMenu {
      display: none;
    }

    .screenModeSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -8.5px;
      left: 50%;
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


    .videoControlBar .muteSwitch {
      height: 32px;
      line-height: 30px;
      font-size: 20px;
      margin-right: 0;
    }
    .is-mute .videoControlBar .muteSwitch {
      color: #888;
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
      width: 80px;
      position: relative;
      vertical-align: middle;
    }

    .videoControlBar .volumeControl .volumeControlInner {
      position: relative;
      box-sizing: border-box;
      width: 64px;
      height: 8px;
      border: 1px solid #888;
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
    }

    .videoControlBar .volumeControl .volumeControlInner .slideBar {
      position: absolute;
      width: 50%;
      height: 100%;
      left: 0;
      bottom: 0;
      background: #ccc;
      pointer-events: none;

    }

    .videoControlBar .volumeControl .volumeBarPointer {
      display: none;
               /*
      position: absolute;
      top: 50%;
      width: 6px;
      height: 10px;
      background: #ccc;
      transform: translate(-50%, -50%);
      z-index: 200;
      pointer-events: none;
      */
    }

    .videoControlBar .volumeControl .tooltip {
      display: none;
      pointer-events: none;
      position: absolute;
      left: 6px;
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
    }
    .videoControlBar .volumeControl:hover .tooltip {
      display: block;
    }

    .is-mute .videoControlBar .volumeControlInner {
      pointer-events: none;
    }
    .is-mute .videoControlBar .volumeControlInner >* {
      display: none;
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
      width: 32px;
      height: 32px;
      margin-top: -2px;
      line-height: 30px;
    }
    .prevVideo .controlButtonInner {
      transform: scaleX(-1);
    }

    .prevVideo:active {
      font-size: 18px;
    }

    .toggleStoryboard {
      visibility: hidden;
      font-size: 13px;
      /*width: 32px;*/
      height: 32px;
      margin-top: -2px;
      line-height: 36px;
      pointer-events: none;
    }
    .storyboardAvailable .toggleStoryboard {
      visibility: visible;
      pointer-events: auto;
    }
    .zenzaStoryboardOpen .storyboardAvailable .toggleStoryboard {
      text-shadow: 0px 0px 2px #9cf;
      color: #9cf;
    }

    .toggleStoryboard .controlButtonInner {
      transform: scaleX(-1);
    }

    .toggleStoryboard:active {
      font-size: 10px;
    }



    .videoServerTypeMenu {
      bottom: 0;
      min-width: 40px;
      height:    32px;
      line-height: 30px;
      font-size: 16px;
      white-space: nowrap;
    }
    .is-dmcAvailable .videoServerTypeMenu  {
      text-shadow:
        0px 0px 8px #9cf, 0px 0px 6px #9cf, 0px 0px 4px #9cf, 0px 0px 2px #9cf;
    }
    .is-mouseMoving.is-dmcPlaying .videoServerTypeMenu  {
      background: #336;
    }
    .is-youTube .videoServerTypeMenu {
      text-shadow:
        0px 0px 8px #fc9, 0px 0px 6px #fc9, 0px 0px 4px #fc9, 0px 0px 2px #fc9 !important;
      pointer-events: none !important;
    }


    .videoServerTypeMenu:active {
      font-size: 13px;
    }
    .videoServerTypeMenu.show {
      background: #888;
    }
    .videoServerTypeMenu.show .tooltip {
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

    .videoServerTypeSelectMenu .triangle {
      transform: translate(-50%, 0) rotate(-45deg);
      bottom: -9px;
      left: 50%;
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
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-dmc,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
      opacity: 0.4;
      pointer-events: none;
      text-shadow: none !important;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
      display: none;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-dmc span:before,
    .zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality       span:before{
      display: none !important;
    }
    .zenzaPlayerContainer:not(.is-dmcAvailable) .serverType {
      pointer-events: none;
    }


    /* dmcを使用している時はsmileの画質選択を薄く */
    .zenzaPlayerContainer.is-dmcPlaying .smileVideoQuality {
      opacity: 0.4;
      pointer-events: none;
    }

    /* dmcを選択していない状態ではdmcの画質選択を隠す */
    .videoServerTypeSelectMenu:not(.is-dmcEnable) .currentVideoQuality,
    .videoServerTypeSelectMenu:not(.is-dmcEnable) .dmcVideoQuality {
      display: none;
    }



    @media screen and (max-width: 864px) {
      .controlItemContainer.center {
        left: 0%;
        transform: translate(0, 0);
      }
    }

  `).trim();

  VideoControlBar.__tpl__ = (`
    <div class="videoControlBar">

      <div class="seekBarContainer">
        <div class="seekBarShadow"></div>
        <div class="seekBar">
          <div class="seekBarPointer">
            <div class="seekBarPointerCore"></div>
          </div>
          <div class="bufferRange"></div>
        </div>
      </div>

      <div class="controlItemContainer center">
        <div class="scalingUI">
          <div class="toggleStoryboard controlButton playControl forPremium" data-command="toggleStoryboard">
            <div class="controlButtonInner">＜●＞</div>
            <div class="tooltip">シーンサーチ</div>
          </div>

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

          <div class="playbackRateMenu controlButton " data-command="playbackRateMenu">
            <div class="controlButtonInner">x1</div>
            <div class="tooltip">再生速度</div>
            <div class="playbackRateSelectMenu zenzaPopupMenu">
              <div class="triangle"></div>
              <p class="caption">再生速度</p>
              <ul>
                <li class="playbackRate" data-rate="10" ><span>10倍</span></li>
                <li class="playbackRate" data-rate="5"  ><span>5倍</span></li>
                <li class="playbackRate" data-rate="4"  ><span>4倍</span></li>
                <li class="playbackRate" data-rate="3"  ><span>3倍</span></li>
                <li class="playbackRate" data-rate="2"  ><span>2倍</span></li>

                <li class="playbackRate" data-rate="1.75"><span>1.75倍</span></li>
                <li class="playbackRate" data-rate="1.5"><span>1.5倍</span></li>
                <li class="playbackRate" data-rate="1.25"><span>1.25倍</span></li>

                <li class="playbackRate" data-rate="1.0"><span>標準速度(x1)</span></li>
                <li class="playbackRate" data-rate="0.75"><span>0.75倍</span></li>
                <li class="playbackRate" data-rate="0.5"><span>0.5倍</span></li>
                <li class="playbackRate" data-rate="0.25"><span>0.25倍</span></li>
                <li class="playbackRate" data-rate="0.1"><span>0.1倍</span></li>
              </ul>
            </div>
          </div>

          <div class="videoTime">
            <span class="currentTime"></span> /
            <span class="duration"></span>
          </div>

          <div class="muteSwitch controlButton" data-command="toggleMute">
            <div class="tooltip">ミュート(M)</div>
            <div class="menuButtonInner mute-off">&#x1F50A;</div>
            <div class="menuButtonInner mute-on">&#x1F507;</div>
          </div>

          <div class="volumeControl">
            <div class="tooltip">音量調整</div>
            <div class="volumeControlInner">
              <div class="slideBar"></div>
              <div class="volumeBarPointer"></div>
            </div>
          </div>

           <div class="prevVideo controlButton playControl" data-command="playPreviousVideo" data-param="0">
            <div class="controlButtonInner">&#x27A0;</div>
            <div class="tooltip">前の動画</div>
          </div>

           <div class="nextVideo controlButton playControl" data-command="playNextVideo" data-param="0">
            <div class="controlButtonInner">&#x27A0;</div>
            <div class="tooltip">次の動画</div>
          </div>


        </div>
      </div>

      <div class="controlItemContainer right">

        <div class="scalingUI">

          <div class="videoServerTypeMenu controlButton" data-command="videoServerTypeMenu">
            <div class="controlButtonInner">画</div>
            <div class="tooltip">動画サーバー・画質</div>
            <div class="videoServerTypeSelectMenu zenzaPopupMenu">
              <div class="triangle"></div>
              <p class="caption">動画サーバー・画質</p>
              <ul>

                <li class="serverType select-dmc   exec-command" data-command="update-enableDmc" data-param="true"  data-type="bool">
                  <span>新システムを使用</span>
                  <p class="currentVideoQuality"></p>
                </li>


                <li class="dmcVideoQuality selected exec-command select-auto" data-command="update-dmcVideoQuality" data-param="auto"><span>自動(auto)</span></li>
                <li class="dmcVideoQuality selected exec-command select-veryhigh" data-command="update-dmcVideoQuality" data-param="veryhigh"><span>超(1080) 優先</span></li>
                <li class="dmcVideoQuality selected exec-command select-high" data-command="update-dmcVideoQuality" data-param="high"><span>高(720) 優先</span></li>
                <li class="dmcVideoQuality selected exec-command select-mid"  data-command="update-dmcVideoQuality" data-param="mid"><span>中(480-540)</span></li>
                <li class="dmcVideoQuality selected exec-command select-low"  data-command="update-dmcVideoQuality" data-param="low"><span>低(360)</span></li>

                <li class="serverType select-smile exec-command" data-command="update-enableDmc" data-param="false" data-type="bool"><span>旧システムを使用</span></li>
                <li class="smileVideoQuality select-default exec-command" data-command="update-forceEconomy" data-param="false" data-type="bool"><span>自動</span></li>
                <li class="smileVideoQuality select-economy exec-command" data-command="update-forceEconomy" data-param="true"  data-type="bool"><span>エコノミー固定</span></li>
             </ul>
            </div>
          </div>

          <div class="screenModeMenu controlButton" data-command="screenModeMenu">
            <div class="tooltip">画面サイズ・モード変更</div>
            <div class="controlButtonInner">&#9114;</div>
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

    </div>
  `).trim();

  _.assign(VideoControlBar.prototype, {
    initialize: function(params) {
      this._playerConfig        = params.playerConfig;
      this._$playerContainer    = params.$playerContainer;
      var player = this._player = params.player;

      player.on('open',           this._onPlayerOpen.bind(this));
      player.on('canPlay',        this._onPlayerCanPlay.bind(this));
      player.on('durationChange', this._onPlayerDurationChange.bind(this));
      player.on('close',          this._onPlayerClose.bind(this));
      player.on('progress',       this._onPlayerProgress.bind(this));
      player.on('loadVideoInfo',  this._onLoadVideoInfo.bind(this));
      player.on('commentParsed',  _.debounce(this._onCommentParsed.bind(this), 500));
      player.on('commentChange',  _.debounce(this._onCommentChange.bind(this), 100));

      this._initializeDom();
      this._initializeScreenModeSelectMenu();
      this._initializePlaybackRateSelectMenu();
      this._initializeVolumeControl();
      this._initializeVideoServerTypeSelectMenu();

      ZenzaWatch.debug.videoControlBar = this;
    },
    _initializeDom: function() {
      util.addStyle(VideoControlBar.__css__);
      var $view = this._$view = $(VideoControlBar.__tpl__);
      var $container = this._$playerContainer;
      var config = this._playerConfig;
      var onCommand = (command, param) => { this.emit('command', command, param); };

      this._$seekBarContainer = $view.find('.seekBarContainer');
      this._$seekBar          = $view.find('.seekBar');
      this._$seekBarPointer = $view.find('.seekBarPointer');
      this._$bufferRange    = $view.find('.bufferRange');
      this._$tooltip        = $view.find('.seekBarContainer .tooltip');
      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover');
      });

      this._$seekBar
        .on('mousedown', this._onSeekBarMouseDown.bind(this))
        .on('mousemove', this._onSeekBarMouseMove.bind(this))
        .on('mousemove', _.debounce(this._onSeekBarMouseMoveEnd.bind(this), 1000));

      $view.find('.controlButton')
        .on('click', this._onControlButton.bind(this));

      this._$currentTime = $view.find('.currentTime');
      this._$duration    = $view.find('.duration');

      this._heatMap = new HeatMap({
        $container: this._$seekBarContainer.find('.seekBar')
      });
      var updateHeatMapVisibility = (v) => {
        this._$seekBarContainer.toggleClass('noHeatMap', !v);
      };
      updateHeatMapVisibility(this._playerConfig.getValue('enableHeatMap'));
      this._playerConfig.on('update-enableHeatMap', updateHeatMapVisibility);

      this._storyboard = new Storyboard({
        playerConfig: config,
        player: this._player,
        $container: $view
      });

      this._storyboard.on('command', onCommand);

      this._seekBarToolTip = new SeekBarToolTip({
        $container: this._$seekBarContainer,
        storyboard: this._storyboard
      });
      this._seekBarToolTip.on('command', onCommand);


      this._commentPreview = new CommentPreview({
        $container: this._$seekBarContainer
      });
      this._commentPreview.on('command', onCommand);
      var updateEnableCommentPreview = (v) => {
        this._$seekBarContainer.toggleClass('enableCommentPreview', v);
        this._commentPreview.setIsEnable(v);
      };

      updateEnableCommentPreview(config.getValue('enableCommentPreview'));
      config.on('update-enableCommentPreview', updateEnableCommentPreview);

      this._$screenModeMenu       = $view.find('.screenModeMenu');
      this._$screenModeSelectMenu = $view.find('.screenModeSelectMenu');

      this._$playbackRateMenu       = $view.find('.playbackRateMenu');
      this._$playbackRateSelectMenu = $view.find('.playbackRateSelectMenu');

      this._$videoServerTypeMenu       = $view.find('.videoServerTypeMenu');
      this._$videoServerTypeSelectMenu = $view.find('.videoServerTypeSelectMenu');

      ZenzaWatch.emitter.on('hideHover', () => {
        this._hideMenu();
        this._commentPreview.hide();
      });

      $container.append($view);
      this._width = this._$seekBarContainer.innerWidth();
    },
    _initializeScreenModeSelectMenu: function() {
      var self = this;
      var $menu = this._$screenModeSelectMenu;

      $menu.on('click', 'span', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $target  = $(e.target).closest('.screenMode');
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
        var $target  = $(e.target).closest('.playbackRate');
        var rate     = parseFloat($target.attr('data-rate'), 10);
        self.emit('command', 'playbackRate', rate);
      });

      var updatePlaybackRate = function(rate) {
        $label.text('x' + rate);
        $menu.find('.selected').removeClass('selected');
        var fr = Math.floor( parseFloat(rate, 10) * 100) / 100;
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
    _initializeVolumeControl: function() {
      var $container = this._$view.find('.volumeControl');
      var $tooltip = $container.find('.tooltip');
      var $bar     = $container.find('.slideBar');
      var $pointer = $container.find('.volumeBarPointer');
      var $body    = $('body');
      var $window  = $(window);
      var config   = this._playerConfig;
      var self = this;

      var setVolumeBar = this._setVolumeBar = function(v) {
        var per = Math.round(v * 100);
        $bar.css({ width: per + '%'});
        $pointer.css({ left: per + '%'});
        $tooltip.text('音量 (' + per + '%)');
      };

      var $inner = $container.find('.volumeControlInner');
      var posToVol = function(x) {
        var width = $inner.outerWidth();
        var vol = x / width;
        return Math.max(0, Math.min(vol, 1.0));
      };

      var onBodyMouseMove = function(e) {
        var offset = $inner.offset();
        var scale = Math.max(0.1, parseFloat(config.getValue('menuScale'), 10));
        var left = (e.clientX - offset.left) / scale;
        var vol = posToVol(left);

        self.emit('command', 'volume', vol);
      };

      var bindDragEvent = function() {
        $body
          .on('mousemove.ZenzaWatchVolumeBar', onBodyMouseMove)
          .on('mouseup.ZenzaWatchVolumeBar',   onBodyMouseUp);
        $window.on('blur.ZenzaWatchVolumeBar', onWindowBlur);
      };
      var unbindDragEvent = function() {
        $body
          .off('mousemove.ZenzaWatchVolumeBar')
          .off('mouseup.ZenzaWatchVolumeBar');
        $window.off('blur.ZenzaWatchVolumeBar');
      };
      var beginMouseDrag = function() {
        bindDragEvent();
        $container.addClass('dragging');
      };
      var endMouseDrag = function() {
        unbindDragEvent();
        $container.removeClass('dragging');
      };
      var onBodyMouseUp = function() {
        endMouseDrag();
      };
      var onWindowBlur = function() {
        endMouseDrag();
      };

      var onVolumeBarMouseDown = function(e) {
        e.preventDefault();
        e.stopPropagation();

        var vol = posToVol(e.offsetX);
        self.emit('command', 'volume', vol);

        beginMouseDrag();
      };
      $inner.on('mousedown', onVolumeBarMouseDown);

      setVolumeBar(this._playerConfig.getValue('volume'));
      this._playerConfig.on('update-volume', setVolumeBar);
    },
    _initializeVideoServerTypeSelectMenu: function() {
      const config = this._playerConfig;
      //const $btn   = this._$videoServerTypeMenu;
      //const $label = $btn.find('.controlButtonInner');
      const $menu  = this._$videoServerTypeSelectMenu;
      const $current = $menu.find('.currentVideoQuality');

      $menu.on('click', '.exec-command', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const $target  = $(e.target).closest('.exec-command');
        const command  = $target.attr('data-command');
        if (!command) { return; }
        var   param    = $target.attr('data-param');
        const type     = $target.attr('data-type');
        if (param && type === 'bool') {
          param = JSON.parse(param);
        }
        this.toggleVideoServerTypeMenu(false);
        //$menu.removeClass('show');
        this.emit('command', command, param);
      });

      const updateEnableDmc = function(value) {
        $menu.toggleClass('is-dmcEnable', value);
        const $d = $menu.find('.serverType');
        $d.removeClass('selected');
        $menu.find('.select-' + (value ? 'dmc' : 'smile')).addClass('selected');
      };

      const updateForceEconomy = function(value) {
        const $dq = $menu.find('.smileVideoQuality');
        $dq.removeClass('selected');
        $menu.find('.select-' + (value ? 'economy' : 'default')).addClass('selected');
      };

      const updateDmcVideoQuality = function(value) {
        const $dq = $menu.find('.dmcVideoQuality');
        $dq.removeClass('selected');
        $menu.find('.select-' + value).addClass('selected');
      };

      const onVideoServerType = function(type, videoSessionInfo) {
        if (type !== 'dmc') {
          if (config.getValue('autoDisableDmc')) {
            $current.text('----');
          } else {
            $current.text('----');
          }
          return;
        }
        $current.text(videoSessionInfo.videoFormat.replace(/^.*h264_/, ''));
      };

      updateEnableDmc(      config.getValue('enableDmc'));
      updateForceEconomy(   config.getValue('forceEconomy'));
      updateDmcVideoQuality(config.getValue('dmcVideoQuality'));
      config.on('update-enableDmc',       updateEnableDmc);
      config.on('update-forceEconomy',    updateForceEconomy);
      config.on('update-dmcVideoQuality', updateDmcVideoQuality);

      this._player.on('videoServerType', onVideoServerType);
    },
    _onControlButton: function(e) {
      e.preventDefault();
      e.stopPropagation();

      var $target = $(e.target).closest('.controlButton');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      var type    = $target.attr('data-type');
      if (param && (type === 'bool' || type === 'json')) {
        param = JSON.parse(param);
      }
      switch (command) {
        case 'screenModeMenu':
          this.toggleScreenModeMenu();
          break;
        case 'playbackRateMenu':
          this.togglePlaybackRateMenu();
          break;
        case 'toggleStoryboard':
          this._storyboard.toggle();
          break;
        case 'videoServerTypeMenu':
          this.toggleVideoServerTypeMenu();
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
        'togglePlaybackRateMenu',
        'toggleVideoServerTypeMenu'
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
    toggleVideoServerTypeMenu: function(v) {
      var $btn  = this._$videoServerTypeMenu;
      var $menu = this._$videoServerTypeSelectMenu;
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
        ZenzaWatch.emitter.emitAsync('hideMenu');
      };
      if ($menu.hasClass('show')) {
        this._hideMenu();
        $btn .addClass('show');
        $menu.addClass('show');
        $body.on(eventName, onBodyClick);
        ZenzaWatch.emitter.emitAsync('showMenu');
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
      this._storyboard.reset();
      this.resetBufferedRange();
    },
    _onPlayerCanPlay: function(watchId, videoInfo) {
      var duration = this._player.getDuration();
      this.setDuration(duration);
      this._storyboard.onVideoCanPlay(watchId, videoInfo);

      this._heatMap.setDuration(duration);
    },
    _onCommentParsed: function() {
      this._chatList = this._player.getChatList();
      this._heatMap.setChatList(this._chatList);
      this._commentPreview.setChatList(this._chatList);
    },
    _onCommentChange: function() {
      this._chatList = this._player.getChatList();
      this._heatMap.setChatList(this._chatList);
      this._commentPreview.setChatList(this._chatList);
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
      this._timerCount = 0;
      this._timer = window.setInterval(this._onTimer.bind(this), 10);
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

      this.emit('command', 'seek', sec);

      this._beginMouseDrag();
    },
    _onSeekBarMouseMove: function(e) {
      if (!this._$view.hasClass('dragging')) {
        e.stopPropagation();
      }
      var left = e.offsetX;
      var sec = this._posToTime(left);
      this._seekBarMouseX = left;

      this._commentPreview.setCurrentTime(sec);
      this._commentPreview.show(left);

      this._seekBarToolTip.update(sec, left);
    },
    _onSeekBarMouseMoveEnd: function(e) {
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

      this.emit('command', 'seek', sec);
      this._seekBarToolTip.update(sec, left);
      this._storyboard.setCurrentTime(sec, true);
    },
    _onBodyMouseUp: function() {
      this._endMouseDrag();
    },
    _onWindowBlur: function() {
      this._endMouseDrag();
    },
    _bindDragEvent: function() {
      $('body')
        .on('mousemove.ZenzaWatchSeekBar', _.bind(this._onBodyMouseMove, this))
        .on('mouseup.ZenzaWatchSeekBar',   _.bind(this._onBodyMouseUp, this));

      $(window).on('blur.ZenzaWatchSeekBar', _.bind(this._onWindowBlur, this));
    },
    _unbindDragEvent: function() {
      $('body')
        .off('mousemove.ZenzaWatchSeekBar')
        .off('mouseup.ZenzaWatchSeekBar');
      $(window).off('blur.ZenzaWatchSeekBar');
    },
    _onTimer: function() {
      this._timerCount++;
      var player = this._player;
      var currentTime = player.getCurrentTime();
      if (this._timerCount % 15 === 0) {
        this.setCurrentTime(currentTime);
      }
      this._storyboard.setCurrentTime(currentTime);
    },
    _onLoadVideoInfo: function(videoInfo) {
      this.setDuration(videoInfo.duration);
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec) {
        this._currentTime = sec;

        var m = Math.floor(sec / 60);
        m = m < 10 ? ('0' + m) : m;
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        var currentTimeText = [m, s].join(':');
        if (this._currentTimeText !== currentTimeText) {
          this._currentTimeText = currentTimeText;
          this._$currentTime.text(currentTimeText);
        }
        const per = Math.min(100, this._timeToPer(sec));
        this._$seekBarPointer[0].style.transform = `translate3d(${per}%, 0, 0)`;
      }
    },
    setDuration: function(sec) {
      if (sec !== this._duration) {
        this._duration = sec;

        if (sec === 0) {
          this._$duration.text('--:--');
        }
        var m = Math.floor(sec / 60);
        m = m < 10 ? ('0' + m) : m;
        var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
        this._$duration.text([m, s].join(':'));
        this.emit('durationChange');
      }
    },
    setBufferedRange: function(range, currentTime) {
      var $range = this._$bufferRange;
      if (!range || !range.length || !this._duration) {
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
              const perLeft = (this._timeToPer(start) - 1);
              const scaleX = (this._timeToPer(width) + 2) / 100;
              $range.css('transform', `translate3d(${perLeft}%, 0, 0) scaleX(${scaleX})`);
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
      this._$bufferRange.css({transform: 'scaleX(0)'});
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
      //this._isUpdated = false;
      this.emit('reset');
    },
    setDuration: function(duration) {
      if (this._duration !== duration) {
        this._duration = duration;
        this.update();
      }
    },
    setChatList: function(comment) {
      this._chat = comment;
      this._chatReady = true;
      this.update();
    },
    update: function() {
      if (this._duration < 0 || !this._chatReady /* || this._isUpdated */) {
        return;
      }
      var map = this._getHeatMap();
      this.emitAsync('update', map);
      ZenzaWatch.emitter.emit('heatMapUpdate', {map, duration: this._duration});
      // 無駄な処理を避けるため同じ動画では2回作らないようにしようかと思ったけど、
      // CoreMのマシンでも数ミリ秒程度なので気にしない事にした。
      // Firefoxはもうちょっとかかるかも
      //this._isUpdated = true;
    },
    _getHeatMap: function() {
      //console.time('update HeatMapModel');
      var chatList =
        this._chat.top.concat(this._chat.naka, this._chat.bottom);
      var duration = this._duration;
      if (!duration) { return; }
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

      //console.timeEnd('update HeatMapModel');
      return map;
    }
  });

  var HeatMapView = function() { this.initialize.apply(this, arguments); };
  _.assign(HeatMapView.prototype, {
    _canvas:  null,
    _palette: null,
    _width: 100,
    _height: 12,
    initialize: function(params) {
      this._model  = params.model;
      this._$container = params.$container;
      this._width  = params.width || 100;
      this._height = params.height || 10;

      this._model.on('update', _.bind(this._onUpdate, this));
      this._model.on('reset',  _.bind(this._onReset, this));
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
      console.time('update HeatMap');

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
        console.timeEnd('update HeatMap');
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
      console.timeEnd('update HeatMap');
    }
  });

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


  var CommentPreviewModel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPreviewModel.prototype, AsyncEmitter.prototype);
  _.assign(CommentPreviewModel.prototype, {
    initialize: function() {
    },
    reset: function() {
      this._chatReady = false;
      this._vpos = -1;
      this.emit('reset');
    },
    setChatList: function(chatList) {
      var list = chatList.top.concat(chatList.naka, chatList.bottom);
      list.sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        return av - bv;
      });

      this._chatList = list;
      this._chatReady = true;
      this.update();
    },
    getChatList: function() {
      return this._chatList || [];
    },
    setCurrentTime: function(sec) {
      this.setVpos(sec * 100);
    },
    setVpos: function(vpos) {
      if (this._vpos !== vpos) {
        this._vpos = vpos;
        this.emit('vpos');
      }
    },
    getCurrentIndex: function() {
      if (this._vpos < 0 || !this._chatReady) {
        return -1;
      }
      return this.getVposIndex(this._vpos);
    },
    getVposIndex: function(vpos) {
      var list = this._chatList;
      for (var i = list.length - 1; i >= 0; i--) {
        var chat = list[i], cv = chat.getVpos();
        if (cv <= vpos - 400) {
          return i + 1;
        }
      }
      return -1;
    },
    getCurrentChatList: function() {
      if (this._vpos < 0 || !this._chatReady) {
        return [];
      }
      return this.getItemByVpos(this._vpos);
    },
    getItemByVpos: function(vpos) {
      var list = this._chatList;
      var result = [];
      for (var i = 0, len = list.length; i < len; i++) {
        var chat = list[i], cv = chat.getVpos(), diff = vpos - cv;
        if (diff >= -100 && diff <= 400) {
          result.push(chat);
        }
      }
      return result;
    },
    getItemByNo: function(no) {
      var list = this._chatList;
      for (var i = 0, len = list.length; i < len; i++) {
        var nicoChat = list[i];
        if (nicoChat.getNo() === no) {
          return nicoChat;
        }
      }
      return null;
    },
    update: function() {
      this.emit('update');
    }
  });

  var CommentPreviewView = function() { this.initialize.apply(this, arguments); };
  CommentPreviewView.MAX_HEIGHT = '200px';
  CommentPreviewView.ITEM_HEIGHT = 20;
  _.extend(CommentPreviewView.prototype, AsyncEmitter.prototype);
  CommentPreviewView.__tpl__ = (`
    <div class="zenzaCommentPreview">
      <div class="zenzaCommentPreviewInner">
      </div>
    </div>
  `).trim();

  CommentPreviewView.__css__ = `
    .zenzaCommentPreview {
      display: none;
      position: absolute;
      bottom: 16px;
      opacity: 0.8;
      max-height: ${CommentPreviewView.MAX_HEIGHT};
      width: 350px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.4);
      color: #ccc;
      z-index: 100;
      overflow: hidden;
      /*box-shadow: 0 0 4px #666;*/
      border-bottom: 24px solid transparent;
      transform: translate3d(0, 0, 0);
      transition: transform 0.2s;
    }

    .zenzaCommentPreview::-webkit-scrollbar {
      background: #222;
    }

    .zenzaCommentPreview::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    .zenzaCommentPreview::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }


    .zenzaCommentPreview.updating {
      transition: opacity 0.2s ease;
      opacity: 0.3;
      cursor: wait;
    }
    .zenzaCommentPreview.updating *{
      pointer-evnets: none;
    }


    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaCommentPreview,
    body:not(.fullScreen).zenzaScreenMode_small .zenzaCommentPreview {
      background: rgba(0, 0, 0, 0.9);
    }

    .seekBarContainer.enableCommentPreview:hover .zenzaCommentPreview.show {
      display: block;
    }
    .zenzaCommentPreview.show:hover {
      background: black;
      overflow: auto;
    }

    .zenzaCommentPreview * {
      box-sizing: border-box;
    }

    .zenzaCommentPreviewInner {
      padding: 4px;
      pointer-events: none;
    }
    .zenzaCommentPreview:hover .zenzaCommentPreviewInner {
      pointer-events: auto;
    }

    .zenzaCommentPreviewInner .nicoChat {
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
                /*border-top: 1px dotted transparent;*/
    }
    .zenzaCommentPreview:hover      .nicoChat + .nicoChat {
      /*border-top: 1px dotted #888;*/
    }
    .zenzaCommentPreviewInner:hover .nicoChat.odd {
      background: #333;
    }
    .zenzaCommentPreviewInner .nicoChat.fork1 .vposTime{
      color: #6f6;
    }
    .zenzaCommentPreviewInner .nicoChat.fork2 .vposTime{
      color: #66f;
    }



    .zenzaCommentPreviewInner .nicoChat .no,
    .zenzaCommentPreviewInner .nicoChat .date,
    .zenzaCommentPreviewInner .nicoChat .userId {
      display: none;
    }

    .zenzaCommentPreviewInner .nicoChat:hover .no,
    .zenzaCommentPreviewInner .nicoChat:hover .date,
    .zenzaCommentPreviewInner .nicoChat:hover .userId {
      display: inline-block;
      white-space: nowrap;
    }

    .zenzaCommentPreviewInner .nicoChat .vposTime {
    }
    .zenzaCommentPreviewInner .nicoChat:hover .text {
      color: #fff !important;
    }
    .zenzaCommentPreviewInner       .nicoChat .text:hover {
      text-decoration: underline;
    }

    .zenzaCommentPreviewInner .nicoChat .addFilter {
      display: none;
      position: absolute;
      font-size: 10px;
      color: #fff;
      background: #666;
      cursor: pointer;
      top: 0;
    }

    .zenzaCommentPreviewInner .nicoChat:hover .addFilter {
      display: inline-block;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 2px #333;
    }

    .zenzaCommentPreviewInner .nicoChat .addFilter.addUserIdFilter {
      right: 8px;
      width: 48px;
    }
    .zenzaCommentPreviewInner .nicoChat .addFilter.addWordFilter {
      right: 64px;
      width: 48px;
    }

  `;

  _.assign(CommentPreviewView.prototype, {
    initialize: function(params) {
      var model = this._model = params.model;
      this._$container = params.$container;

      this._showing = false;
      this._inviewTable = {};
      this._$newItems = '';
      this._chatList = [];
      this._initializeDom(this._$container);

      model.on('reset',  this._onReset.bind(this));
      model.on('update', _.debounce(this._onUpdate.bind(this), 10));
      model.on('vpos',   _.throttle(this._onVpos  .bind(this), 100));

      this.show = _.throttle(_.bind(this.show, this), 200);
      //this._applyView = ZenzaWatch.util.createDrawCallFunc(this._applyView.bind(this));
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(CommentPreviewView.__css__);
      var $view = this._$view = $(CommentPreviewView.__tpl__);
      this._$inner = $view.find('.zenzaCommentPreviewInner');

      $view
        .on('click', this._onClick.bind(this))
        .on('mousewheel', function(e) { e.stopPropagation(); })
        .on('scroll', _.throttle(this._onScroll.bind(this), 50, {trailing: false}));
      //  .on('resize', _.throttle(this._onResize.bind(this), 50));

      $container.on('mouseleave', this.hide.bind(this));
      $container.append($view);
    },
    _onClick: function(e) {
      e.stopPropagation();
      var $view = this._$view;
      var $target = $(e.target);
      var command = $target.attr('data-command');
      var $nicoChat = $target.closest('.nicoChat');
      var no = parseInt($nicoChat.attr('data-nicochat-no'), 10);
      var nicoChat  = this._model.getItemByNo(no);

      if (command && nicoChat && !$view.hasClass('updating')) {
        $view.addClass('updating');

        window.setTimeout(function() { $view.removeClass('updating'); }, 3000);

        switch (command) {
          case 'addUserIdFilter':
            this.emit('command', command, nicoChat.getUserId());
            break;
          case 'addWordFilter':
            this.emit('command', command, nicoChat.getText());
            break;
          case 'addCommandFilter':
            this.emit('command', command, nicoChat.getCmd());
            break;
        }
        return;
      }
      var vpos = $nicoChat.attr('data-vpos');
      if (vpos !== undefined) {
        this.emit('command', 'seek', vpos / 100);
      }
    },
    _onUpdate: function() {
      if (this._isShowing) {
        this._updateView();
      } else {
        this._updated = true;
      }
    },
    _onVpos: function() {
      var index = Math.max(0, this._model.getCurrentIndex());
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;
      this._inviewIndex = index;
      this._scrollTop = itemHeight * index;
      this._refreshInviewElements(this._scrollTop);
    },
    _onResize: function() {
      this._refreshInviewElements();
    },
    _onScroll: function() {
      this._scrollTop = -1;
      this._refreshInviewElements();
    },
    _onReset: function() {
      this._$inner.html('');
      this._inviewTable = {};
      this._inviewIndex = 0;
      this._scrollTop = 0;
      this._$newItems = null;
      this._chatList = [];
    },
    _updateView: function() {
      var chatList = this._chatList = this._model.getChatList();
      if (chatList.length < 1) {
        this.hide();
        this._updated = false;
        return;
      }

      window.console.time('updateCommentPreviewView');
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;

      this._$inner.css({
        height:
        (chatList.length + 2) * itemHeight
        //`calc(${chatList.length * itemHeight}px + ${CommentPreviewView.MAX_HEIGHT})`
      });
      this._updated = false;
      window.console.timeEnd('updateCommentPreviewView');
    },
    _createDom: function(chat, idx) {
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;
      var text = ZenzaWatch.util.escapeHtml(chat.getText());
      var date = (new Date(chat.getDate() * 1000)).toLocaleString();
      var vpos = chat.getVpos();
      var no = chat.getNo();
      var oe = idx % 2 === 0 ? 'even' : 'odd';
      var title = `${no} : 投稿日 ${date}\nID:${chat.getUserId()}\n${text}\n`;
      var color = chat.getColor() || '#fff';
      var shadow = color === '#fff' ? '' : `text-shadow: 0 0 1px ${color};`;

      var vposToTime = function(vpos) {
        var sec = Math.floor(vpos / 100);
        var m = Math.floor(sec / 60);
        var s = (100 + (sec % 60)).toString().substr(1);
        return [m, s].join(':');
      };

      return `<li class="nicoChat fork${chat.getFork()} ${oe}"
            id="commentPreviewItem${idx}"
            data-vpos="${vpos}"
            data-nicochat-no="${no}"
            style="top: ${idx * itemHeight}px;"
            >
            <span class="vposTime">${vposToTime(vpos)}: </span>
            <span class="text" title="${title}" style="${shadow}">
            ${text}
            </span>
            <span class="addFilter addUserIdFilter"
              data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
            <span class="addFilter addWordFilter"
              data-command="addWordFilter" title="NGワード">NGword</span>
        </li>`;
    },
    _refreshInviewElements: function(scrollTop, startIndex, endIndex) {
      if (!this._$inner) { return; }
      var itemHeight = CommentPreviewView.ITEM_HEIGHT;

      var $view = this._$view;
      scrollTop = _.isNumber(scrollTop) ? scrollTop : $view.scrollTop();

      var viewHeight = $view.innerHeight();
      var viewBottom = scrollTop + viewHeight;
      var chatList = this._chatList;
      if (!chatList || chatList.length < 1) { return; }
      startIndex =
        _.isNumber(startIndex) ? startIndex : Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
      endIndex   =
        _.isNumber(endIndex) ? endIndex : Math.min(chatList.length, Math.floor(viewBottom / itemHeight) + 5);
      var i;
      //window.console.log(`index ${startIndex} 〜 ${endIndex}`);

      var newItems = [], inviewTable = this._inviewTable;
      var create = this._createDom;
      for (i = startIndex; i < endIndex; i++) {
        var chat = chatList[i];
        if (inviewTable[i] || !chat) { continue; }
        newItems.push(create(chat, i));
        inviewTable[i] = true;
      }

      if (newItems.length < 1) { return; }

      _.each(Object.keys(inviewTable), function(i) {
        if (i >= startIndex && i <= endIndex) { return; }
        var item = document.getElementById('commentPreviewItem' + i);
        if (item) { item.remove(); }
        else { window.console.log('not found ', 'commentPreviewItem' + i);}
        delete inviewTable[i];
      });


      var $newItems = $(newItems.join(''));
      if (this._$newItems) {
        this._$newItems.append($newItems);
      } else {
        this._$newItems = $newItems;
      }

      this._applyView();
    },
    _isEmpty: function() {
      return this._chatList.length < 1;
    },
    show: function(left) {
      this._isShowing = true;
      if (this._updated) {
        this._updateView();
      }
      if (this._isEmpty()) {
        return;
      }
      var $view = this._$view, width = $view.outerWidth();
      var containerWidth = this._$container.innerWidth();

      left = Math.min(Math.max(0, left - width / 2), containerWidth - width);
      this._left = left;
      this._applyView();
    },
    _applyView: function() {
      var $view = this._$view;
      if (!$view.hasClass('show')) { $view.addClass('show'); }
      if (this._$newItems) {
        this._$inner.append(this._$newItems);
        this._$newItems = null;
      }
      if (this._scrollTop > 0) {
        $view.scrollTop(this._scrollTop);
        this._scrollTop = -1;
      }

      $view
        .css({
        'transform': 'translate3d(' + this._left + 'px, 0, 0)'
      });
    },
    hide: function() {
      this._isShowing = false;
      this._$view.removeClass('show');
    }
  });

  var CommentPreview = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPreview.prototype, AsyncEmitter.prototype);
  _.assign(CommentPreview .prototype, {
    initialize: function(param) {
      this._model = new CommentPreviewModel({
      });
      this._view = new CommentPreviewView({
        model:      this._model,
        $container: param.$container
      });
      var self = this;
      this._view.on('command', function(command, param) {
        self.emit('command', command, param);
      });

      this.reset();
    },
    reset: function() {
      this._left = 0;
      this._model.reset();
      this._view.hide();
    },
    setChatList: function(chatList) {
      this._model.setChatList(chatList);
    },
    setCurrentTime: function(sec) {
      this._model.setCurrentTime(sec);
    },
    show: function(left) {
      this._left = left;
      this._isShow = true;
      if (this._isEnable) {
        this._view.show(left);
      }
    },
    hide: function() {
      this._isShow = false;
      this._view.hide();
    },
    setIsEnable: function(v) {
      if (v !== this._isEnable) {
        this._isEnable = v;
        if (v && this._isShow) {
          this.show(this._left);
        }
      }
    }
  });

  var SeekBarToolTip = function() { this.initialize.apply(this, arguments); };
  _.extend(SeekBarToolTip.prototype, AsyncEmitter.prototype);
  SeekBarToolTip.__css__ = (`
    .seekBarToolTip {
      position: absolute;
      display: inline-block;
      z-index: 300;
      position: absolute;
      box-sizing: border-box;
      bottom: 16px;
      left: 0;
      width: 180px;
      white-space: nowrap;
      font-size: 10px;
      background: rgba(0, 0, 0, 0.8);
      z-index: 150;
      opacity: 0;
      border: 1px solid #666;
      border-radius: 8px;
      padding: 4px 4px 10px 4px;
      transform: translate3d(0, 0, 0);
      transition: transform 0.1s steps(1, start) 0, opacity 0.2s ease 0.5s;
      pointer-events: none;
    }

    .fullScreen .seekBarToolTip {
      bottom: 10px;
    }

    .dragging                .seekBarToolTip {
      opacity: 1;
      pointer-events: none;
    }

    .seekBarContainer:hover  .seekBarToolTip {
      opacity: 1;
      pointer-events: auto;
    }

    .fullScreen .seekBarContainer:not(:hover) .seekBarToolTip {
      left: -100vw !important;
    }

    .seekBarToolTip .seekBarToolTipInner {
      font-size: 0 !important;
    }

    .seekBarToolTip .seekBarToolTipButtonContainer {
      text-align: center;
      width: 100%;
    }

    .seekBarToolTip .seekBarToolTipButtonContainer>* {
      flex: 1;
    }

    .seekBarToolTip .currentTime {
      display: inline-block;
      height: 16px;
      margin: 4px 0;
      padding: 0 8px;
      color: #ccc;
      text-align: center;
      font-size: 12px;
      line-height: 16px;
      text-shadow: 0 0 4px #fff, 0 0 8px #fc9;
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

    .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 0.5;
    }

    .enableCommentPreview .seekBarToolTip .controlButton.enableCommentPreview {
      opacity: 1;
      background: rgba(0,0,0,0.01);
    }

    .seekBarToolTip .seekBarThumbnailContainer {
      pointer-events: none;
      position: absolute;
      top: 0; left: 50%;
      transform: translate(-50%, -100%);
    }
    .seekBarContainer:not(.enableCommentPreview) .seekBarToolTip.storyboard {
      border-top: none;
      border-radius: 0 0 8px 8px;
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
          
          <div class="controlButton enableCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
            <div class="menuButtonInner">💬</div>
          </div>
          

          <div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む" data-repeat="on">
            <div class="controlButtonInner">⇨</div>
          </div>
        </div>
      </div>
    </div>
  `).trim();

  _.assign(SeekBarToolTip .prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._storyboard = params.storyboard;
      this._initializeDom(params.$container);

      //this.update = ZenzaWatch.util.createDrawCallFunc(this.update.bind(this));

      this._boundOnRepeat = this._onRepeat.bind(this);
      this._boundOnMouseUp = this._onMouseUp.bind(this);
    },
    _initializeDom: function($container) {
      ZenzaWatch.util.addStyle(SeekBarToolTip.__css__);
      var $view = this._$view = $(SeekBarToolTip.__tpl__);

      this._$currentTime = $view.find('.currentTime');

      $view
        .on('mousedown',this._onMouseDown.bind(this))
        .on('click', function(e) { e.stopPropagation(); e.preventDefault(); });

      this._seekBarThumbnail = this._storyboard.getSeekBarThumbnail({
        $container: $view.find('.seekBarThumbnailContainer')
      });
      this._seekBarThumbnail.on('visible', v => {
        $view.toggleClass('storyboard', v);
      });

      $container.append($view);
    },
    _onMouseDown: function(e) {
      e.stopPropagation();
      var $target = $(e.target).closest('.controlButton');
      var command = $target.attr('data-command');
      if (!command) { return; }

      var param   = $target.attr('data-param');
      var repeat  = $target.attr('data-repeat') === 'on';

      this.emit('command', command, param);
      if (repeat) {
        this._beginRepeat(command, param);
      }
    },
    _onMouseUp: function(e) {
      e.preventDefault();
      this._endRepeat();
    },
    _beginRepeat(command, param) {
      this._repeatCommand = command;
      this._repeatParam   = param;

      $('body').on('mouseup.zenzaSeekbarToolTip', this._boundOnMouseUp);
      this._$view.on('mouseleave mouseup', this._boundOnMouseUp);

      this._repeatTimer = window.setInterval(this._boundOnRepeat, 200);
      this._isRepeating = true;
    },
    _endRepeat: function() {
      this.isRepeating = false;
      if (this._repeatTimer) {
        window.clearInterval(this._repeatTimer);
        this._repeatTimer = null;
      }
      $('body').off('mouseup.zenzaSeekbarToolTip');
      this._$view.off('mouseleave mouseup');
    },
    _onRepeat: function() {
      if (!this._isRepeating) {
        this._endRepeat();
        return;
      }
      this.emit('command', this._repeatCommand, this._repeatParam);
    },
    update: function(sec, left) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      var timeText = [m, s].join(':');
      if (this._timeText !== timeText) {
        this._timeText = timeText;
        this._$currentTime.text(timeText);
        var w  = this._$view.outerWidth();
        var vw = this._$container.innerWidth();
        left = Math.max(0, Math.min(left - w / 2, vw - w));
        this._$view.css({
          'transform': 'translate3d(' + left + 'px, 0, 0)'
        });
      }
      this._seekBarThumbnail.setCurrentTime(sec);
    }
  });





//===END===
  var Lark = function() { this.initialize.apply(this, arguments); };
  _.extend(Lark.prototype, AsyncEmitter.prototype);
  _.assign(Lark.prototype, {
    initialize: function(params) {
      this._player = params.player;
      this._playerConfig = params.playerConfig;
      this._volume =
        parseFloat(params.volume || this._playerConfig.getValue('speakLarkVolume'), 10);
      this._lang = params.lang || ZenzaWatch.util.getPageLanguage();
      this._enabled = false;
      this._timer = null;
      this._timeoutTimer = null;
      this._kidoku = [];

      this._player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
      this._playerConfig.on('update-speakLark', _.bind(function(v) {
        if (v) { this.enable(); } else { this.disable(); }
      }, this));
      this._playerConfig.on('update-speakLarkVolume', _.bind(function(v) {
        this._volume = Math.max(0, Math.min(1.0, parseFloat(v, 10)));
        if (!this._msg) { return; }
        this._msg.volume = this._volume;
      }, this));

      ZenzaWatch.debug.lark = this;

      this._bind = {
        _onTimeout: _.debounce(_.bind(this._onTimeout, this), 6000)
      };
    },
    _initApi: function() {
      if (this._msg) { return true; }
      if (!window.SpeechSynthesisUtterance) { return false; }
      this._msg = new window.SpeechSynthesisUtterance();
      this._msg.lang = this._lang;
      this._msg.volume = this._volume;
      this._msg.onend   = _.bind(this._onSpeakEnd, this);
      this._msg.onerror = _.bind(this._onSpeakErr, this);
      return true;
    },
    _onCommentParsed: function() {
      //window.console.log('%conCommentParsed:', 'background: #f88;');
      this._speaking = false;
      if (this._playerConfig.getValue('speakLark')) {
        this.enable();
      }
    },
    speak: function(text, option) {
      if (!this._msg) { return; }
      //if (window.speechSynthesis.speaking) { return; }
      if (this._speaking) { return; }
      if (option.volume) { this._msg.volume = option.volume; }
      if (option.rate)   { this._msg.rate   = option.rate; }

      if (window.speechSynthesis.speaking) {
        console.log('speak cancel: ', this._msg.text);
        window.speechSynthesis.cancel();
      }
      text = this._replaceWWW(text);
      this._msg.text = text;
      this._msg.pitch = Math.random() * 2;
      this._speaking = true;
      //console.log('%cspeak: "%s"', 'background: #f88;', text, this._msg);
      this._lastSpeakAt = Date.now();
      this._bind._onTimeout();

      window.speechSynthesis.speak(this._msg);
    },
    _onSpeakEnd: function() {
      if (!window.speechSynthesis.speaking) {
        this._speaking = false;
      }
      this._onTimer();
    },
    _onSpeakErr: function(e) {
      window.console.log('speak error: ', e, this._msg.text);
      this._speaking = false;
      this._onTimer();
    },
    _onTimeout: function() {
      if (window.speechSynthesis.speaking) {
        var past = Date.now() - this._lastSpeakAt;
        console.log('speak timeout: ', past, this._msg.text);
      }
      this._speaking = false;
    },
    enable: function() {
      if (!this._initApi()) { return; }

      this._kidoku = [];
      this._enabled = true;
      var chatList = this._player.getChatList();
      this._chatList = chatList.top.concat(chatList.naka, chatList.bottom);
      window.speechSynthesis.cancel();
      if (this._timer) {
        window.clearInterval(this._timer);
      }
      this._timer = window.setInterval(this._onTimer.bind(this), 300);
    },
    disable: function() {
      this._enabled = false;
      this._speaking = false;
      this._chatList = [];
      if (this._timer) {
        window.clearInterval(this._timer);
        this._timer = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    _onTimer: function() {
      if (!this._player.isPlaying()) { return; }
      if (this._speaking) { return; }
      var one = this._selectOne();
      if (!one) { return; }
      this.speak(one.text, {rate: one.rate});
    },
    _getInviewChat: function() {
      var player = this._player;
      var vpos = player.getCurrentTime() * 100;
      var result = [];
      var chatList = this._chatList;
      for (var i = 0, len = chatList.length; i < len; i++) {
        var chat = chatList[i];
        var vp = chat.getVpos();
        if (chat.isInvisible()) { continue; }
        if (vp - vpos > -250 && vp - vpos < 150) {
          result.push(chat);
        }
      }
      return result;
    },
    _selectOne: function() {
      var inviewChat = this._getInviewChat();
      var sample = _.shuffle(_.difference(inviewChat, this._kidoku));
      if (sample.length < 1) { return null; }
      var chat = sample[0];
      var text = chat.getText();

      // コメントが多い時は早口
      var count = Math.max(1, Math.min(inviewChat.length, 40));
      this._kidoku.unshift(chat);
      this._kidoku.splice(5);
      return {
        text: text,
        rate: 0.5 + Math.max(0, Math.min(4, count / 15))
      };
    },
    _replaceWWW: function(text) {
      text = text.trim();

      text = text.replace(/([~〜～])/g, 'ー');
      text = text.replace(/([\(（].*?[）\)])/g, 'ー'); // ほとんど顔文字なので

      text = text.replace(/([wWＷｗ])+$/i, function(m) {
        return 'わら'.repeat(Math.min(3, m.length));
      });

      text = text.replace(/([8８])+$/i, function(m) {
        return 'ぱち'.repeat(Math.min(3, m.length));
      });

      return text;
    }
  });
  
  ZenzaWatch.debug.Lark = Lark;





