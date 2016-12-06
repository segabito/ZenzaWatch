const $ = require('jquery');
const _ = require('lodash');
const ZenzaWatch = {
  util:{},
  debug: {}
};
const util = {};
const Config = {};
const RelatedVideoList = function() {};
const AsyncEmitter = function() {};
const CONSTANT = {};
const MylistPocketDetector = {};
const IchibaLoader = {};

//===BEGIN===

  var VideoInfoPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoInfoPanel.prototype, AsyncEmitter.prototype);

  VideoInfoPanel.__css__ = (`
    .zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
      display: none;
      pointer-events: none;
      overflow: hidden;
    }

    .zenzaWatchVideoInfoPanel .tabs.activeTab {
      margin-top: 32px;
      box-sizing: border-box;
      position: relative;
      width: 100%;
      height: calc(100% - 32px);
      overflow-x: hidden;
      overflow-y: visible;
      text-align: left;
    }
    .zenzaWatchVideoInfoPanel .tabs.relatedVideoTab.activeTab {
      overflow: hidden;
    }

    .zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
      display: none !important;
      pointer-events: none;
      opacity: 0;
    }

    .zenzaWatchVideoInfoPanel .tabSelectContainer {
      position: absolute;
      display: flex;
      height: 32px;
      z-index: 100;
      width: 100%;
      white-space: nowrap;
    }

    .zenzaWatchVideoInfoPanel .tabSelect {
      flex: 1;
      box-sizing: border-box;
      display: inline-block;
      height: 32px;
      font-size: 12px;
      letter-spacing: 0;
      line-height: 32px;
      color: #666;
      background: #222;
      cursor: pointer;
      text-align: center;
      transition: text-shadow 0.2s ease, color 0.2s ease;
    }
    .zenzaWatchVideoInfoPanel .tabSelect.activeTab {
      font-size: 14px;
      letter-spacing: 0.1em;
      color: #ccc;
      background: #333;
      {*border-width: 1px 1px 0 1px;
      border-color: #888;
      border-style: outset;*}
    }

    .zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
      color: #fff;
      text-shadow: 0 0 4px #ff9;
      transition: none;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
      color: #fff;
      text-shadow: 0 0 4px #006;
      transition: none;
    }


    .zenzaWatchVideoInfoPanel .tabSelect:not(.activeTab):hover {
      background: #888;
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
      z-index: ${CONSTANT.BASE_Z_INDEX + 25000};
      background: #333;
      color: #ccc;
      overflow-x: hidden;
      overflow-y: hidden;
      transition: opacity 0.4s ease;
    }

    .zenzaWatchVideoInfoPanel.userVideo .channelVideo,
    .zenzaWatchVideoInfoPanel.channelVideo .userVideo
    {
      display: none !important;
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
        height: calc(100vh - 40px);
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
        height: calc(100vh - 40px);
        right: auto;
        bottom: auto;
        z-index: 1;
      }
    }


    .zenzaScreenMode_3D    .zenzaWatchVideoInfoPanel>*,
    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel>*,
    .fullScreen            .zenzaWatchVideoInfoPanel>* {
      display: none;
      pointer-events: none;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover>*,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover>*,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover>* {
      display: inherit;
      pointer-events: auto;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover .tabSelectContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover .tabSelectContainer,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
      display: flex;
    }


    .zenzaScreenMode_3D    .zenzaWatchVideoInfoPanel,
    .zenzaScreenMode_wide  .zenzaWatchVideoInfoPanel,
    .fullScreen            .zenzaWatchVideoInfoPanel {
      top: 20%;
      right: calc(32px - 320px);
      left: auto;
      width: 320px;
      height: 60%;
      background: none;
      opacity: 0;
      box-shadow: none;
      transition: opacity 0.4s ease, transform 0.4s ease 1s;
      will-change: opacity, transform, transform;
    }

    .zenzaScreenMode_3D   .mouseMoving  .zenzaWatchVideoInfoPanel,
    .zenzaScreenMode_wide .mouseMoving  .zenzaWatchVideoInfoPanel,
    .fullScreen           .mouseMoving  .zenzaWatchVideoInfoPanel {
      height: 60%;
      background: none;
      border: 1px solid #888;
      opacity: 0.5;
    }

    .zenzaScreenMode_3D   .zenzaWatchVideoInfoPanel:hover,
    .zenzaScreenMode_wide .zenzaWatchVideoInfoPanel:hover,
    .fullScreen           .zenzaWatchVideoInfoPanel:hover {
      /*right: 0;*/
      background: #333;
      box-shadow: 4px 4px 4px #000;
      border: none;
      opacity: 0.9;
      transform: translate3d(-288px, 0, 0);
      transition: opacity 0.4s ease, transform 0.4s ease 1s;
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
      vertical-align: middle;
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
      word-break: break-all;
      line-height: 1.5;
    }

    .zenzaWatchVideoInfoPanel .videoDescription:first-letter {
    }

    .zenzaWatchVideoInfoPanel .videoDescription a {
      display: inline-block;
      font-weight: bold;
      text-decoration: none;
      color: #ff9;
      padding: 2px;
    }
    .zenzaWatchVideoInfoPanel .videoDescription a:visited {
      color: #ffd;
    }

    .zenzaWatchVideoInfoPanel .videoDescription .watch {
      display: block;
      position: relative;
      line-height: 60px;
      box-sizing: border-box;
      padding: 4px 16px;;
      min-height: 60px;
      width: 240px;
      margin: 8px 10px;
      background: #444;
      border-radius: 4px;
    }
    .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #446;
    }

    .zenzaWatchVideoInfoPanel .videoDescription .mylistLink {
      white-space: nowrap;
      display: inline-block;
    }

    .zenzaWatchVideoInfoPanel:not(.is-pocketReady) .pocket-info {
      display: none !important;
    }
    .pocket-info {
      font-family: Menlo;
    }

    .videoTags li .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist,
    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo {
      display: inline-block;
      font-size: 16px;
      line-height: 20px;
      width: 24px;
      height: 22px;
      background: #666;
      color: #ccc !important;
      background: #666;
      text-decoration: none;
      border: 1px outset;
      transition: transform 0.2s ease;
      cursor: pointer;
    }
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
      display: none;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab .owner:hover .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .pocket-info,
    .zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .deflistAdd {
      display: inline-block;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend {
      position: absolute;
      bottom: 4px;
      left: 16px;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info {
      position: absolute;
      bottom: 4px;
      left: 48px;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
      position: absolute;
      bottom: 4px;
      left: 80px;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:hover,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:hover,
    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:hover,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:hover,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:hover {
      transform: scale(1.5);
    }
    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:active,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:active,
    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:active,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:active,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:active {
      transform: scale(1.2);
      border: 1px inset;
    }


    .zenzaWatchVideoInfoPanel .videoDescription .watch .videoThumbnail {
      position: absolute;
      right: 16px;
      height: 60px;
      pointer-events: none;
    }
    .zenzaWatchVideoInfoPanel .videoDescription:hover .watch .videoThumbnail {
      filter: none;
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
      line-height: 20px;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .nicodic {
      display: inline-block;
      margin-right: 4px;
      line-height: 20px;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .tagLink {
      text-decoration: none;
      color: #000;
    }

    .zenzaWatchVideoInfoPanel .videoTags li .tagLink:hover {
    }

    .zenzaWatchVideoInfoPanel .videoTags li .playlistAppend {
      display: inline-block;
      position: relative;
      left: auto;
      bottom: auto;
    }



    body:not(.fullScreen).zenzaScreenMode_small .zenzaWatchVideoInfoPanel {
      display: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
      width: calc(100% - 16px);
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect{
      background: #ccc;
      color: #888;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.activeTab{
      background: #ddd;
      color: black;
      border: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
      top: 230px;
      left: 0;
      width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
      height: calc(100vh - 296px);
      bottom: 48px;
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
      display: block;
      bottom: 48px;
      width: 364px;
      margin: 0 auto;
      padding: 8px;
      background: #ddd;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
      background: #ddd;
    }
         body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #ddf;
    }

    body:not(.fullScreen).zenzaScreenMode_3D     .backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .backComment .zenzaWatchVideoInfoPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .backComment .zenzaWatchVideoInfoPanel {
      opacity: 0.7;
    }

    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      body:not(.fullScreen).zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
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
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
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

    .zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
      box-sizing: border-box;
      position: relative;
      width: 100%;
      height: 100%;
      margin: 0;
    }

    .zenzaWatchVideoInfoPanel .videoListFrame,
    .zenzaWatchVideoInfoPanel .commentListFrame {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 0;
      background: #333;
    }

    .zenzaWatchVideoInfoPanel .nowLoading {
      display: none;
      opacity: 0;
      pointer-events: none;
    }
    .zenzaWatchVideoInfoPanel.initializing .nowLoading {
      display: block !important;
      opacity: 1 !important;
      color: #888;
    }
    .zenzaWatchVideoInfoPanel .nowLoading {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
    }
    .zenzaWatchVideoInfoPanel .kurukuru {
      position: absolute;
      display: inline-block;
      font-size: 96px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes loadingRolling {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(1800deg); }
    }
    .zenzaWatchVideoInfoPanel.initializing .kurukuruInner {
      display: inline-block;
      pointer-events: none;
      text-align: center;
      text-shadow: 0 0 4px #888;
      animation-name: loadingRolling;
      animation-iteration-count: infinite;
      animation-duration: 4s;
      animation-timing-function: linear;
    }
    .zenzaWatchVideoInfoPanel .nowLoading .loadingMessage {
      position: absolute;
      display: inline-block;
      font-family: Impact;
      font-size: 32px;
      text-align: center;
      top: calc(50% + 48px);
      left: 0;
      width: 100%;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar {
      background: #222;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-button {
      background: #666;
      display: none;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar {
      background: #f0f0f0;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoInfoTab::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #ccc;
    }


  `).trim();

  VideoInfoPanel.__tpl__ = (`
    <div class="zenzaWatchVideoInfoPanel show initializing">
      <div class="nowLoading">
        <div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
        <div class="loadingMessage">Loading...</div>
      </div>

      <div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-tab="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-tab="relatedVideoTab">関連動画</div></div>

      <div class="tabs videoInfoTab activeTab">
        <div class="zenzaWatchVideoInfoPanelInner">
          <div class="videoOwnerInfoContainer">
            <a class="ownerPageLink" target="_blank">
              <img class="ownerIcon loading"/>
            </a>
            <span class="owner">
              <span class="ownerName"></span>
              <a class="playlistSetUploadedVideo userVideo"
                data-command="playlistSetUploadedVideo"
                title="投稿動画一覧をプレイリストで開く">▶</a>
            </span>
          </div>
          <div class="publicStatus"></div>

          <div class="videoDescription">
          </div>

          <div class="ichibaContainer"></div>

          <div class="videoTagsContainer">
            <ul class="videoTags">
          </div>
        </div>
      </div>

      <div class="tabs relatedVideoTab">
        <div class="relatedVideoContainer"></div>
      </div>

    </div>
  `).trim();

  _.assign(VideoInfoPanel.prototype, {
    initialize: function(params) {
      this._videoTitlePanel = new VideoHeaderPanel(params);
      this._dialog = params.dialog;

      this._dialog.on('canplay', this._onVideoCanPlay.bind(this));

      this._videoTitlePanel.on('command', this._onCommand.bind(this));

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
      const view = this._view = $view[0];

      this._$ownerContainer = $view.find('.videoOwnerInfoContainer');
      var $icon = this._$ownerIcon = $view.find('.ownerIcon');
      this._$ownerName = $view.find('.ownerName');
      this._$ownerPageLink = $view.find('.ownerPageLink');

      this._$description = $view.find('.videoDescription');
      this._$description.on('click', this._onDescriptionClick.bind(this));

      this._$videoTags = $view.find('.videoTags');
      this._$publicStatus = $view.find('.publicStatus');

      this._ichibaContainer = view.querySelector('.ichibaContainer');

      this._ichibaItemView = new IchibaItemView(
        {parentNode: this._ichibaContainer});

      this._$tabSelect = $view.find('.tabSelect');
      $view.on('click', '.tabSelect', (e) => {
        var $target = $(e.target).closest('.tabSelect');
        var tabName = $target.attr('data-tab');
        this.selectTab(tabName);
      });

      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
        var $target = $(e.target);
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param') || '';
        if (command) {
          this._onCommand(command, param);
        }
      }).on('wheel', (e) => {
        e.stopPropagation();
      });
      $icon.on('load', () => { $icon.removeClass('loading'); });

      MylistPocketDetector.detect().then((pocket) => {
        this._pocket = pocket;
        $view.addClass('is-pocketReady');
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
        .toggleClass('community', this._videoInfo.isCommunityVideo())
        .toggleClass('mymemory',  this._videoInfo.isMymemory())
        .addClass(videoInfo.isChannel() ? 'channelVideo' : 'userVideo');

      this._ichibaItemView.clear();
      this._ichibaItemView.videoId = videoInfo.getVideoId();
    },
    /**
     * 説明文中のurlの自動リンク等の処理
     */
    _updateVideoDescription: function(html, isChannel) {
      if (!isChannel) {
        // urlの自動リンク処理
        // チャンネル動画は自前でリンク貼れるので何もしない

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
      }

      this._$description.html(html)
        .find('a').addClass('noHoverMenu').end()
        .find('a[href*="/mylist/"]').addClass('mylistLink')
        ;

      window.setTimeout(function() {
        this._$description.find('.watch').each(function(i, watchLink) {
          var $watchLink = $(watchLink);
          var videoId = $watchLink.text();
          var thumbnail = ZenzaWatch.util.getThumbnailUrlByVideoId(videoId);
          if (thumbnail) {
            var $img = $('<img class="videoThumbnail" />').attr('src', thumbnail);
            $watchLink.addClass('popupThumbnail').append($img);
          }
          var $playlistAppend =
            $('<a class="playlistAppend" title="プレイリストで開く">▶</a>')
              .attr('data-watch-id', videoId);
          var $deflistAdd =
            $('<a class="deflistAdd" title="とりあえずマイリスト">&#x271A;</a>')
              .attr('data-watch-id', videoId);
          var $pocketInfo =
            $('<a class="pocket-info" title="動画情報">？</a>')
              .attr('data-watch-id', videoId);
          $watchLink.append($playlistAppend);
          $watchLink.append($deflistAdd);
          $watchLink.append($pocketInfo);
        });
        this._$description.find('.mylistLink').each(function(i, mylistLink) {
          var $mylistLink = $(mylistLink);
          var mylistId = $mylistLink.text().split('/')[1];
          var $playlistAppend =
            $('<a class="playlistSetMylist" title="プレイリストで開く">▶</a>')
            .attr('data-mylist-id', mylistId)
            ;
          $mylistLink.append($playlistAppend);
        });
      }.bind(this), 0);
    },
    _onDescriptionClick: function(e) {
      if (e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey) return true;
      if (e.target.tagName !== 'A') return;

      var watchId;
      var $target = $(e.target), text = $target.text();
      var href = $target.attr('href') || '';
      if (href.match(/watch\/([a-z0-9]+)/)) {
        e.preventDefault();
        this.emit('command', 'open', RegExp.$1);
        //dialog.open(RegExp.$1);
      } else if (text.match(/^mylist\/(\d+)/)) {
        return;
      } else if ($target.hasClass('playlistAppend')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this.emit('command', 'playlistAppend', watchId);
        }
      } else if ($target.hasClass('deflistAdd')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this.emit('command', 'deflistAdd', watchId);
        }
      } else if ($target.hasClass('pocket-info')) {
        watchId = $target.attr('data-watch-id');
        e.preventDefault(); e.stopPropagation();
        if (watchId) {
          this._pocket.external.info(watchId);
        }
      } else if ($target.hasClass('playlistSetMylist')) {
        var mylistId = $target.attr('data-mylist-id');
        if (!isNaN(mylistId)) {
          e.preventDefault(); e.stopPropagation();
          this.emit('command', 'playlistSetMylist', mylistId);
        }
      } else if ($target.hasClass('seekTime')) {
        e.preventDefault(); e.stopPropagation();
        var data = $target.attr('data-seekTime').split(":");
        var sec = data[0] * 60 + parseInt(data[1], 10);
        this.emit('command', 'seek', sec);
        //dialog.setCurrentTime(sec);
      }
    },
    _onVideoCanPlay: function(watchId, videoInfo) {
      // 動画の再生を優先するため、比較的どうでもいい要素はこのタイミングで初期化するのがよい
      if (!this._relatedVideoList) {
        this._relatedVideoList = new RelatedVideoList({
          $container: this._$view.find('.relatedVideoContainer')
        });
        this._relatedVideoList.on('command', this._onCommand.bind(this));
      }
      var relatedVideo = videoInfo.getRelatedVideoItems();
      this._relatedVideoList.update(relatedVideo, watchId);
    },
    _onCommand: function(command, param) {
      //window.console.log('VideoInfoPanel.onCommand: ', command, param);
      switch (command) {
        case 'owner-video-search':
          this._onOwnerVideoSearch(param);
          break;
        case 'playlistSetUploadedVideo':
          var owner = this._videoInfo.getOwnerInfo();
          this.emit('command', 'playlistSetUploadedVideo', owner.id);
          break;
        default:
          this.emit('command', command, param);
        break;
      }
    },
    _onOwnerVideoSearch: function(word) {
      //if (!this._searchConfig) {
      //  this._searchConfig = Config.namespace('videoSearch');
      //}
      //const config = this._searchConfig;
      var option = {
        searchType: 'tag',
        order: 'd',
        sort: 'f',
        playlistSort: true,
        owner: true //config.getValue('ownerOnly')
      };

      //window.console.log('_onOwnerVideoSearch:', word, option);
      this.emit('command', 'playlistSetSearchVideo', {word, option});
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
    },
    selectTab: function(tabName) {
      var $view = this._$view;
      var $target = $view.find('.tabs.' + tabName + ', .tabSelect.' + tabName);
      if ($target.length < 1) { return; }
      $view.find('.activeTab').removeClass('activeTab');
      $target.addClass('activeTab');
    },
    blinkTab: function(tabName) {
      var $view = this._$view;
      var $target = $view.find('.tabs.' + tabName + ', .tabSelect.' + tabName);
      if ($target.length < 1) { return; }
      $target.addClass('blink');
      window.setTimeout(function() {
        $target.removeClass('blink');
      }, 50);
    },
    appendTab: function(tabName, title, content) {
      var $view = this._$view;
      var $select =
        $('<div class="tabSelect"/>')
          .addClass(tabName)
          .attr('data-tab', tabName)
          .text(title);
      var $body = $('<div class="tabs"/>')
          .addClass(tabName);
      if (content) {
        $body.append($(content));
      }

      $view.find('.tabSelectContainer').append($select);
      $view.append($body);

      return $body;
    },
    removeTab: function(tabName) {
      this._$view.find('.tabSelect.' + tabName).remove();
      this._$view.find('.tabs.' + tabName).detach();
    }
  });

  var VideoHeaderPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoHeaderPanel.prototype, AsyncEmitter.prototype);

  VideoHeaderPanel.__css__ = (`
    .zenzaWatchVideoHeaderPanel {
      position: fixed;
      width: 100%;
      z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
      box-sizing: border-box;
      padding: 8px;
      bottom: calc(100% + 8px);
      left: 0;
      background: #333;
      color: #ccc;
      text-align: left;
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
    .zenzaWatchVideoHeaderPanel.initializing>*{
      opacity: 0;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer {
      margin: 8px;
    }
    .zenzaWatchVideoHeaderPanel .publicStatus {
      color: #ccc;
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel,
    .fullScreen           .zenzaWatchVideoHeaderPanel {
      position: absolute; /* fixedだとFirefoxのバグでおかしくなる */
      top: 0px;
      bottom: auto;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      box-shadow: none;
    }

    body.zenzaScreenMode_sideView:not(.fullScreen)              .zenzaWatchVideoHeaderPanel {
      top: 0;
      left: 400px;
      width: calc(100vw - 400px);
      bottom: auto;
      background: #272727;
      opacity: 0.9;
      height: 40px;
    }
    /* ヘッダ追従 */
    body.zenzaScreenMode_sideView:not(.nofix):not(.fullScreen)  .zenzaWatchVideoHeaderPanel {
      top: 0;
    }
    /* ヘッダ固定 */
    body.zenzaScreenMode_sideView.nofix:not(.fullScreen)        .zenzaWatchVideoHeaderPanel {
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTitleContainer {
      margin: 0;
    }
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .publicStatus,
    body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel .videoTagsContainer
    {
      display: none;
    }

    .zenzaScreenMode_normal .loading .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_big    .loading .zenzaWatchVideoHeaderPanel.is-onscreen,
    .zenzaScreenMode_3D     .loading .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide   .loading .zenzaWatchVideoHeaderPanel,
    .fullScreen             .loading .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_3D     .mouseMoving .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide   .mouseMoving .zenzaWatchVideoHeaderPanel,
    .fullScreen             .mouseMoving .zenzaWatchVideoHeaderPanel {
      opacity: 0.6;
      transition: 0.4s opacity;
    }

    .zenzaScreenMode_3D   .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_wide .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .fullScreen           .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen:hover,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen:hover,
    .zenzaScreenMode_3D     .zenzaWatchVideoHeaderPanel:hover,
    .zenzaScreenMode_wide   .zenzaWatchVideoHeaderPanel:hover,
    .fullScreen             .zenzaWatchVideoHeaderPanel:hover {
      opacity: 1;
      transition: 0.5s opacity;
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel .videoTagsContainer {
      display: none;
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer,
    .zenzaScreenMode_3D   .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer,
    .zenzaScreenMode_wide .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer,
    .fullScreen           .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
      display: block;
    }

    .zenzaWatchVideoHeaderPanel.userVideo .channelVideo,
    .zenzaWatchVideoHeaderPanel.channelVideo .userVideo
    {
      display: none !important;
    }

    .zenzaWatchVideoHeaderPanel .videoTitle {
      font-size: 24px;
      color: #fff;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      display: block;
      cursor: pointer;
      padding: 2px 0;
    }
    .zenzaWatchVideoHeaderPanel .videoTitleContainer:hover {
      background: rgba(102, 102, 102, 0.6);
    }
    .zenzaWatchVideoHeaderPanel .videoTitle:hover {
    }
    .zenzaWatchVideoHeaderPanel .videoTitle::before {
      display: none;
      position: absolute;
      font-size: 12px;
      top: 0;
      left: 0;
      background: #333;
      border: 1px solid #888;
      padding: 2px 4px;
      pointer-events: none;
    }
    .zenzaWatchVideoHeaderPanel.mymemory:not(:hover) .videoTitle::before {
      content: 'マイメモリー';
      display: inline-block;
    }
    .zenzaWatchVideoHeaderPanel.community:not(:hover) .videoTitle::before {
      content: 'コミュニティ動画';
      display: inline-block;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer       .hoverLinkContainer {
      display: none;
      position: absolute;
    }
    .zenzaWatchVideoHeaderPanel .videoTitleContainer:hover .hoverLinkContainer {
      display: block;
      width: 100%;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .hoverLink {
      display: inline-block;
      box-sizing: border-box;
      min-width: 120px;
      font-size: 12px;
      text-align: center;
      background: #666;
      border: 1px solid #ccc;
      padding: 4px 8px;
      margin: 0 8px 8px;
      box-shadow: 4px 4px 4px #888;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .hoverLink a {
      display: inline-block;
      white-space: nowrap;
      color: #fff;
      width: 100%;
    }

    .zenzaWatchVideoHeaderPanel .videoTitleContainer .parentLinkBox,
    .zenzaWatchVideoHeaderPanel .videoTitleContainer .originalLinkBox {
      display: none;
    }
    .zenzaWatchVideoHeaderPanel.hasParent  .videoTitleContainer .parentLinkBox,
    .zenzaWatchVideoHeaderPanel.mymemory   .videoTitleContainer .originalLinkBox,
    .zenzaWatchVideoHeaderPanel.community  .videoTitleContainer .originalLinkBox {
      display: inline-block;
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
               /*margin-right: 8px;*/
               /*padding: 0 4px;*/
      line-height: 20px;
      {*border: 1px solid #888;
      border-radius: 4px;*}
    }

    .zenzaWatchVideoHeaderPanel .videoTags li .nicodic {
      display: inline-block;
      margin-right: 4px;
      line-height: 20px;
    }
    .zenzaWatchVideoHeaderPanel .videoTags li .tagLink {
      color: #fff;
      text-decoration: none;
    }
    .zenzaWatchVideoHeaderPanel .videoTags li .tagLink:hover {
      color: #ccf;
    }

    .videoTags li .playlistAppend {
      visibility: hidden;
    }

    .videoTags li:hover .playlistAppend {
      visibility: visible;
      transition: transform 0.2s ease;
    }

    .videoTags li:hover .playlistAppend:hover {
      transform: scale(1.5);
    }

    .videoTags li:hover .playlistAppend:active {
      transform: scale(1.4);
    }


    body:not(.fullScreen).zenzaScreenMode_3D     .backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_normal .backComment .zenzaWatchVideoHeaderPanel,
    body:not(.fullScreen).zenzaScreenMode_big    .backComment .zenzaWatchVideoHeaderPanel {
      opacity: 0.7;
    }

    @media screen and (min-width: 1432px)
    {
      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
        width: calc(100% - 16px);
      }
      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
        top: calc((100vw - 1024px) * 9 / 16 + 4px);
        width: calc(100vw - 1024px);
        height: calc(100vh - (100vw - 1024px) * 9 / 16 - 70px);
      }

      body:not(.fullScreen).zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
        width: calc(100vw - 1024px - 26px);
      }
    
      body.zenzaScreenMode_sideView:not(.fullScreen) .zenzaWatchVideoHeaderPanel {
        width: calc(100vw - (100vw - 1024px));
        left:  calc(100vw - 1024px);
      }
    }

  `);

  VideoHeaderPanel.__tpl__ = (`
    <div class="zenzaWatchVideoHeaderPanel show initializing" style="display: none;">
      <h2 class="videoTitleContainer">
        <span class="videoTitle"></span>
        <div class="hoverLinkContainer">
          <div class="hoverLink ginza">
            <a class="ginzaLink noHoverMenu" target="watchGinza">GINZAで視聴</a>
          </div>
          <div class="hoverLink uad">
            <a class="uadLink   noHoverMenu" target="_blank">ニコニ広告</a>
          </div>
          <div class="hoverLink hash">
            <a class="hashLink  noHoverMenu" target="_blank" title="twitter検索"></a>
          </div>
          <div class="hoverLink hash originalLinkBox">
            <a class="originalLink  noHoverMenu">元動画を開く</a>
          </div>
          <div class="hoverLink hash parentLinkBox">
            <a class="parentLink  noHoverMenu" target="_blank">親作品</a>
          </div>
        </div>
      </h2>
      <p class="publicStatus">
        <span class="postedAtOuter">
          <span class="userVideo">投稿日:</span>
          <span class="channelVideo">配信日:</span>
          <span class="postedAt"></span>
        </span>

        <span class="countOuter">
          <span class="column">再生:       <span class="count viewCount"></span></span>
          <span class="column">コメント:   <span class="count commentCount"></span></span>
          <span class="column">マイリスト: <span class="count mylistCount"></span></span>
        </span>
      </p>
      <div class="videoTagsContainer">
        <ul class="videoTags">
      </div>
    </div>
  `).trim();

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

      this._$videoTitle   = $view.find('.videoTitle');
      this._$ginzaLink    = $view.find('.ginzaLink');
      this._$uadLink      = $view.find('.uadLink');
      this._$hashLink     = $view.find('.hashLink');
      this._$originalLink = $view.find('.originalLink');
      this._$parentLink   = $view.find('.parentLink');
      this._$postedAt     = $view.find('.postedAt');

      this._$viewCount    = $view.find('.viewCount');
      this._$commentCount = $view.find('.commentCount');
      this._$mylistCount  = $view.find('.mylistCount');

      this._$tagList      = $view.find('.videoTags');

      var stopPropagation = function(e) { e.stopPropagation(); };
      this._$ginzaLink.on('click', stopPropagation);
      this._$hashLink.on('click', stopPropagation);
      this._$uadLink.on('click', stopPropagation);
      this._$parentLink.on('click', stopPropagation);
      this._$originalLink.on('click', (e) => {
        stopPropagation(e);
        e.preventDefault();
        var $target = $(e.target), videoId = $target.attr('data-video-id');
        if (videoId) {
          this.emit('command', 'open', videoId);
        }
      });

      this._$ginzaLink.on('mousedown', this._onGinzaLinkMouseDown.bind(this));

      this._searchForm = new VideoSearchForm({
        parentNode: $view[0]
      });
      this._searchForm.on('command', (command, param) => {
        this.emit('command', command, param);
      });

      $view.on('click', (e) => {
        e.stopPropagation();
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き

        var $target = $(e.target);
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param') || '';
        if (command) {
          this.emit('command', command, param);
        }
      }).on('wheel', (e) => {
        e.stopPropagation();
      });

      window.addEventListener('resize', _.debounce(this._onResize.bind(this), 500));
    },
    update: function(videoInfo) {
      this._videoInfo = videoInfo;

      const videoTitle = util.unescapeHtml(videoInfo.getTitle());
      this._$videoTitle.text(videoTitle).attr('title', videoTitle);
      this._$postedAt.text(videoInfo.getPostedAt());

      var watchId = videoInfo.getWatchId(), videoId = videoInfo.getVideoId();
      var link = '//nico.ms/' + watchId;
      this._$ginzaLink.attr('href', link);
      this._$ginzaLink.attr('data-ginzawatch', link);

      var uadLink = '//uad.nicovideo.jp/ads/?vid='  + watchId;
      this._$uadLink.attr('href', uadLink);

      var hashLink = 'https://twitter.com/hashtag/' + videoId + '?src=hash';
      this._$hashLink
        .text('#' + videoInfo.getVideoId())
        .attr('href', hashLink);

      this._$originalLink
        .attr('href', 'http://nico.ms/' + videoId)
        .attr('data-video-id',       videoId);

      this._$parentLink.attr('href', '//commons.nicovideo.jp/tree/' + videoId);

      var count = videoInfo.getCount();
      var addComma = function(m) {
        return m.toLocaleString ? m.toLocaleString() : m;
      };
      this._$viewCount    .text(addComma(count.view));
      this._$commentCount .text(addComma(count.comment));
      this._$mylistCount  .text(addComma(count.mylist));

      this._updateTags(videoInfo.getTagList());

      this._$view
        .removeClass('userVideo channelVideo initializing')
        .toggleClass('community', this._videoInfo.isCommunityVideo())
        .toggleClass('mymemory',  this._videoInfo.isMymemory())
        .toggleClass('hasParent', this._videoInfo.hasParentVideo())
        .addClass(videoInfo.isChannel() ? 'channelVideo' : 'userVideo')
        .css('display', '');

      window.setTimeout(() => { this._onResize(); }, 1000);
    },
    _updateTags: function(tagList) {
      var $container = this._$tagList.parent();
      var $tagList = this._$tagList.empty().detach();
      var createDicIcon = function(text, hasDic) {
        var $dic = $('<a target="_blank" class="nicodic"/>');
        $dic.attr('href', '//dic.nicovideo.jp/a/' + encodeURIComponent(text));
        var $icon = $('<img class="icon"/>');
        $icon.attr('src',
          hasDic ?
            '//live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
            '//live.nicovideo.jp/img/2012/watch/tag_icon003.png'
        );
        $dic.append($icon);
        return $dic;
      };
      var createLink = function(text) {
        var $link = $('<a class="tagLink" />');
        $link.attr('href', '//www.nicovideo.jp/tag/' + encodeURIComponent(text));
        // タグはエスケープされた物が来るので html() でつっこんでいいはずだが、
        // けっこういい加減なデータもあったりして信頼できないので安全を取って text() でいく
        text = ZenzaWatch.util.unescapeHtml(text);
        $link.text(text);
        return $link;
      };
      var createSearch = function(text) {
        var $search =
          $('<a class="playlistAppend" title="投稿者の動画を検索">▶</a>')
            .attr('data-command', 'owner-video-search')
            .attr('data-param', text);
        return $search;
      };
      $(tagList).each(function(i, tag) {
        var text = tag.tag;
        var $dic = createDicIcon(text, tag.dic);
        var $link = createLink(text);
        var $search = createSearch(text);
        var $tag = $('<li class="zenza-tag" />');
        $tag.append($dic);
        $tag.append($link);
        $tag.append($search);
        $tagList.append($tag);
      });
      $container.append($tagList);

      //http://ex.nicovideo.jp/game
      // なぜかここで勝手に変なタグが挿入されるため、後から除去する
      window.setTimeout(() => {
        $tagList.find('li:not(.zenza-tag), .zenza-tag a:not(.nicodic):not(.tagLink):not(.playlistAppend)').remove();
      }, 100);
    },
    _onGinzaLinkMouseDown: function() {
      this._dialog.pause();
      var currentTime = this._dialog.getCurrentTime();
      var href = this._$ginzaLink.attr('data-ginzawatch');
      this._$ginzaLink.attr('href', href + '?from=' + Math.floor(currentTime));
    },
    _onResize: function() {
      const view = this._$view[0];
      const rect = view.getBoundingClientRect();
      let isOnscreen = view.classList.contains('is-onscreen');
      const height = rect.bottom - rect.top;
      const top = isOnscreen ? (rect.top - height) : rect.top;
      //window.console.info('resize!', rect, isOnscreen, height, top);
      view.classList.toggle('is-onscreen', top < -12);
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




  class VideoSearchForm extends AsyncEmitter {
    constructor(...args) {
      super();
      this._config = Config.namespace('videoSearch');
      this._initDom(...args);
    }

    _initDom({parentNode}) {
      let tpl = document.getElementById('zenzaVideoSearchPanelTemplate');
      if (!tpl) {
        util.addStyle(VideoSearchForm.__css__);
        tpl = document.createElement('template');
        tpl.innerHTML = VideoSearchForm.__tpl__;
        tpl.id = 'zenzaVideoSearchPanelTemplate';
        document.body.appendChild(tpl);
      }
      const view = document.importNode(tpl.content, true);

      this._view   = view.querySelector('*');
      this._form   = view.querySelector('form');
      this._word   = view.querySelector('.searchWordInput');
      this._sort   = view.querySelector('.searchSortSelect');
      this._submit = view.querySelector('.searchSubmit');
      this._mode   = view.querySelector('.searchMode');
    
      this._form.addEventListener('submit', this._onSubmit.bind(this));

      const config = this._config;
      const form = this._form;

      form['ownerOnly'].checked = config.getValue('ownerOnly');
      form['mode'].value        = config.getValue('mode');
      form['word'].value        = config.getValue('word');
      form['sort'].value        = config.getValue('sort');

      this._view.addEventListener('click', this._onClick.bind(this));
      const updateFocus = this._updateFocus.bind(this);
      const updateFocusD =  _.debounce(updateFocus, 1000);
      const submit = _.debounce(this.submit.bind(this), 500);
      Array.prototype.forEach.call(view.querySelectorAll('input, select'), (item) => {
        item.addEventListener('focus', updateFocus);
        item.addEventListener('blur',  updateFocusD);
        if (item.type === 'checkbox' || item.type === 'radio') {
          item.addEventListener('change', () => {
            this._word.focus();
            config.setValue(item.name, item.checked);
            submit();
          });
        } else {
          item.addEventListener('change', () => {
            config.setValue(item.name, item.value);
            if (item.tagName === 'SELECT') { submit(); }
          });
        }
      });

      // やってみたけど微妙
      ZenzaWatch.emitter.on('searchVideo', ({word}) => { form['word'].value = word; });

      if (parentNode) {
        parentNode.appendChild(view);
      }

      ZenzaWatch.debug.searchForm = this;
    }

    _onClick(e) {
      const tagName = (e.target.tagName || '').toLowerCase();
      const target = e.target.classList.contains('command') ?
        e.target : e.target.closest('.command');

      //window.console.log('click!', tagName, e);
      if (!_.contains(['input', 'select'], tagName)) {
        this._word.focus();
      }

      if (!target) { return; }

      const command = target.getAttribute('data-command');
      if (!command) { return; }
      const type  = target.getAttribute('data-type') || 'string';
      let param   = target.getAttribute('data-param');
      e.stopPropagation();
      e.preventDefault();
      switch (type) {
        case 'json':
        case 'bool':
        case 'number':
          param = JSON.parse(param);
          break;
      }

      switch (command) {
        case 'clear':
          this._word.value = '';
          break;
        default:
          this.emit('command', command, param);
      }
    }

    _onSubmit(e) {
      this.submit();
      e.stopPropagation();
    }

    submit() {
      const word = (this._word.value || '').trim();
      if (!word) { return; }

      const form = this._form;
      const searchType = form.mode.value;
      const sortTmp = (this._sort.value || '').split(',');
      const sort = sortTmp[0];
      const order = sortTmp[1] || 'd';
      const ownerOnly = this._form.ownerOnly.checked;
      this.emit('command', 'playlistSetSearchVideo', {
        word,
        option: {
          searchType,
          sort,
          order,
          owner: ownerOnly,
          playlistSort: false
        }
      });
      //window.console.info('params', param);
    }

    _hasFocus() {
      return !!document.activeElement.closest('#zenzaVideoSearchPanel');
    }

    _updateFocus() {
      if (this._hasFocus()) {
        this._view.classList.add('is-active');
      } else {
        this._view.classList.remove('is-active');
      }
    }

  }

  VideoSearchForm.__css__ = (`
    .zenzaVideoSearchPanel {
      pointer-events: auto;
      position: absolute;
      top: 32px;
      right: 8px;
      padding: 0 8px
      width: 248px;
      z-index: 1000;
    }

    .zenzaVideoSearchPanel.is-active {
    }

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_3D    .zenzaVideoSearchPanel,
    .zenzaScreenMode_wide  .zenzaVideoSearchPanel,
    .fullScreen            .zenzaVideoSearchPanel {
      top: 64px;
    }

    body:not(.fullScreen).zenzaScreenMode_sideView .zenzaVideoSearchPanel {
      top: 80px;
      right: 32px;
    }
    .zenzaVideoSearchPanel.is-active {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel:not(.is-active) .focusOnly {
      display: none;
    }

    .zenzaVideoSearchPanel .searchInputHead {
      position: absolute;
      opacity: 0;
      pointer-events: none;
      padding: 4px;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .zenzaVideoSearchPanel .searchInputHead:hover,
    .zenzaVideoSearchPanel.is-active .searchInputHead {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel           .searchInputHead:hover,
    .zenzaVideoSearchPanel.is-active .searchInputHead {
      pointer-events: auto;
      opacity: 1;
      transform: translate3d(0, -100%, 0);
    }
      .zenzaVideoSearchPanel .searchMode {
        position: absolute;
        opacity: 0;
      }

      .zenzaVideoSearchPanel .searchModeLabel {
        cursor: pointer;
      }

     .zenzaVideoSearchPanel .searchModeLabel span {
        display: inline-block;
        padding: 4px 8px;
        color: #666;
        cursor: pointer;
        border-radius: 8px;
        border-color: transparent;
        border-style: solid;
        border-width: 1px;
        pointer-events: none;
      }
      .zenzaVideoSearchPanel .searchModeLabel:hover span {
        background: #888;
      }
      .zenzaVideoSearchPanel .searchModeLabel input:checked + span {
        color: #ccc;
        border-color: currentColor;
        cursor: default;
      }

    .zenzaVideoSearchPanel .searchWord {
      white-space: nowrap;
      padding: 4px;
    }

      .zenzaVideoSearchPanel .searchWordInput {
        width: 200px;
        margin: 0;
        height: 24px;
        line-height: 24px;
        background: transparent;
        font-size: 16px;
        padding: 0 4px;
        color: #ccc;
        border: 1px solid #ccc;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .zenzaVideoSearchPanel .searchWordInput:-webkit-autofill {
        background: transparent;
      }

      .mouseMoving .zenzaVideoSearchPanel:not(.is-active) .searchWordInput {
        opacity: 0.5;
      }

      .mouseMoving .zenzaVideoSearchPanel:not(.is-active) .searchWordInput:hover {
        opacity: 0.8;
      }

      .zenzaVideoSearchPanel.is-active .searchWordInput {
        opacity: 1 !important;
      }

      .zenzaVideoSearchPanel .searchSubmit {
        width: 34px;
        margin: 0;
        padding: 0;
        font-size: 14px;
        line-height: 24px;
        height: 24px;
        border: solid 1px #ccc;
        cursor: pointer;
        background: #888;
        pointer-events: none;
        opacity: 0;
        transform: translate3d(-100%, 0, 0);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .zenzaVideoSearchPanel.is-active .searchSubmit {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel.is-active .searchSubmit:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel.is-active .searchSubmit:active {
        transform: scale(1.2);
        border-style: inset;
      }

      .zenzaVideoSearchPanel .searchClear {
        display: inline-block;
        width: 28px;
        margin: 0;
        padding: 0;
        font-size: 16px;
        line-height: 24px;
        height: 24px;
        border: none;
        cursor: pointer;
        color: #ccc;
        background: transparent;
        pointer-events: none;
        opacity: 0;
        transform: translate3d(100%, 0, 0);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .zenzaVideoSearchPanel.is-active .searchClear {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel.is-active .searchClear:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel.is-active .searchClear:active {
        transform: scale(1.2);
      }


    .zenzaVideoSearchPanel .searchInputFoot {
      white-space: nowrap;
      position: absolute;
      padding: 4px 0;
      opacity: 0;
      padding: 4px;
      pointer-events: none;
      transition: transform 0.2s ease, opacity 0.2s ease;
      transform: translate3d(0, -100%, 0);
    }

    .zenzaVideoSearchPanel .searchInputFoot:hover,
    .zenzaVideoSearchPanel.is-active .searchInputFoot {
      pointer-events: auto;
      opacity: 1;
      background: rgba(50, 50, 50, 0.8);
      transform: translate3d(0, 0, 0);
    }

      .zenzaVideoSearchPanel .searchSortSelect,
      .zenzaVideoSearchPanel .searchSortSelect option{
        background: #333;
        color: #ccc;
      }

      .zenzaVideoSearchPanel .autoPauseLabel {
        cursor: pointer;
      }

      .zenzaVideoSearchPanel .autoPauseLabel input {

      }

      .zenzaVideoSearchPanel .autoPauseLabel input + span {
        display: inline-block;
        pointer-events: none;
      }

      .zenzaVideoSearchPanel .autoPauseLabel input:checked + span {
      }





  `).toString();

  VideoSearchForm.__tpl__ = (`
    <div class="zenzaVideoSearchPanel" id="zenzaVideoSearchPanel">
      <form action="javascript: void(0);">

        <div class="searchInputHead">
          <label class="searchModeLabel">
            <input type="radio" name="mode" class="searchMode" value="keyword">
            <span>キーワード</span>
          </label>

          <label class="searchModeLabel">
            <input type="radio" name="mode" class="searchMode" value="tag"
              id="zenzaVideoSearch-tag" checked="checked">
              <span>タグ</span>
          </label>
        </div>

        <div class="searchWord">
          <button class="searchClear command"
            type="button"
            data-command="clear"
            title="クリア">&#x2716;</button>
          <input
            type="text"
            value=""
            autocomplete="on"
            name="word"
            accesskey="e"
            placeholder="簡易検索(テスト中)"
            class="searchWordInput"
            maxlength="75"
            >
          <input
            type="submit"
            value="▶"
            name="post"
            class="searchSubmit"
            >
        </div>

        <div class="searchInputFoot focusOnly">
          <select name="sort" class="searchSortSelect">
            <option value="f">新しい順</option>
            <option value="h">人気順</option>
            <option value="n">最新コメント</option>
            <option value="r">コメント数</option>
            <option value="m">マイリスト数</option>
            <option value="l">長い順</option>
            <option value="l,a">短い順</option>
          </select>
          <label class="autoPauseLabel">
            <input type="checkbox" name="ownerOnly" checked="checked">
            <span>投稿者の動画のみ</span>
          </label>
        </div>

      </form>
    </div>
  `).toString();

  class BaseViewComponent extends AsyncEmitter {
    constructor({parentNode = null, name = '', template = '', css = ''}) {
      super();
      this._initDom({
        parentNode,
        name,
        template,
        css
      });
    }

    _initDom({parentNode, name, template, css}) {
      let tplId = 'Zenza' + name + 'Template';
      let tpl = document.getElementById(tplId);
      if (!tpl) {
        util.addStyle(css);
        tpl = document.createElement('template');
        tpl.innerHTML = template;
        tpl.id = tplId;
        document.body.appendChild(tpl);
      }
      const view = document.importNode(tpl.content, true);
      this._view = view.querySelector('*');

      this._view.addEventListener('click', this._onClick.bind(this));
      this.appendTo(parentNode);
    }


    _onClick(e) {
      const target = e.target.classList.contains('command') ?
        e.target : e.target.closest('.command');

      if (!target) { return; }

      const command = target.getAttribute('data-command');
      if (!command) { return; }
      const type  = target.getAttribute('data-type') || 'string';
      let param   = target.getAttribute('data-param');
      e.stopPropagation();
      e.preventDefault();
      switch (type) {
        case 'json':
        case 'bool':
        case 'number':
          param = JSON.parse(param);
          break;
      }

      this._onCommand(command, param);
    }

    appendTo(parentNode) {
      if (!parentNode) { return; }
      this._parentNode = parentNode;
      parentNode.appendChild(this._view);
    }

    _onCommand(command, param) {
      this.emit('command', command, param);
    }

    toggleClass(className, v) {
      (className || '').split(/ +/).forEach((c) => {
        this._view.classList.toggle(c, v);
      });
    }

    addClass(name)    { this.toggleClass(name, true); }
    removeClass(name) { this.toggleClass(name, false); }

  }

  class IchibaItemView extends BaseViewComponent {
    constructor({parentNode}) {
      super({
        parentNode,
        name:     'IchibaItemView',
        template: IchibaItemView.__tpl__,
        css:      IchibaItemView.__css__,
      });

      ZenzaWatch.debug.ichiba = this;
    }

    _initDom(...args) {
      //window.console.info('IchibaItemView#_initDom');
      super._initDom(...args);

      this._listContainer = this._view.querySelector('.ichibaItemListContainer');
    }

    _onCommand(command, param) {
      //window.console.info('IchibaItemView#_onCommand', command, param);
      switch(command) {
        case 'load':
          this.load(this._videoId);
          break;
        default:
          super._onCommand(command, param);
      }
    }

    load(videoId) {
      if (this._isLoading) { return; }
      videoId = videoId || this._videoId;
      this._isLoading = true;
      this.addClass('is-loading');
      //window.console.info('IchibaItemView#load!', videoId);
      return IchibaLoader.load(videoId)
        .then(this._onIchibaLoad.bind(this))
        .catch(this._onIchibaLoadFail.bind(this));
    }

    clear() {
      this.removeClass('is-loading');
      this.removeClass('is-success');
      this.removeClass('is-fail');
      this.removeClass('is-empty');
      this._listContainer.innerHTML = '';
    }

    _onIchibaLoad(data) {
      //window.console.info('IchibaItemView#onIchibaLoad', data);
      this.removeClass('is-loading');
      const div = document.createElement('div');
      div.innerHTML = data.main;

      Array.prototype.forEach.call(
        div.querySelectorAll('[id]'),
        (elm) => { elm.classList.add('ichiba-' + elm.id); elm.removeAttribute('id'); }
      );
      Array.prototype.forEach.call(
        div.querySelectorAll('[style]'),
        (elm) => { elm.removeAttribute('style'); }
      );
      const items = div.querySelectorAll('.ichiba_mainitem');

      if (!items || items.length < 1) {
        this.addClass('is-empty');
        this._listContainer.innerHTML = '<h2>貼られている商品はありません</h2>';
      } else {
        this._listContainer.innerHTML = div.innerHTML;
      }
      this.addClass('is-success');
      this._isLoading = false;
    }

    _onIchibaLoadFail() {
      this.removeClass('is-loading');
      this.addClass('is-fail');
      this._isLoading = false;
    }

    get videoId() {
      return this._videoId;
    }

    set videoId(v) {
      this._videoId = v;
    }
  }

  IchibaItemView.__tpl__ = (`
    <div class="ZenzaIchibaItemView">
      <div class="loadStart">
        <button class="loadStartButton command" data-command="load">ニコニコ市場の商品を見る</button>
      </div>
      <div class="ichibaLoadingView">
        <div class="loading-inner">
          <span class="spinner">&#8987;</span>
        </div>
      </div>
      <div class="ichibaItemListContainer"></div>
    </div>
    `).trim();

  IchibaItemView.__css__ = (`
    .ZenzaIchibaItemView {
      text-align: center;
      margin: 8px 8px 32px;
    }

      .ZenzaIchibaItemView .loadStartButton {
         font-size: 14px;
         padding: 8px 8px;
         cursor: pointer;
         border-radius: 0;
         margin: 0;
         background: #333;
         color: #ccc;
         border: solid 2px #ccc;
         outline: none;
         line-height: 20px;
         user-select: none;
         -webkit-user-select: none;
         -moz-user-select: none;
      }
      .ZenzaIchibaItemView .loadStartButton:hover {
        transform: translate(-4px,-4px);
        box-shadow: 4px 4px 4px #000;
        background: #666;
        transition:
          0.2s transform ease,
          0.2s box-shadow ease
          ;
      }

      .ZenzaIchibaItemView .loadStartButton:active {
        transform: none;
        box-shadow: none;
        transition: none;
      }
      .ZenzaIchibaItemView .loadStartButton:active::after {
        opacity: 0;
      }


      .ZenzaIchibaItemView .ichibaLoadingView,
      .ZenzaIchibaItemView .ichibaItemListContainer {
        display: none;
      }

    .ZenzaIchibaItemView.is-loading {
      cursor: wait;
      user-select: none;
    }
      .ZenzaIchibaItemView.is-loading * {
        pointer-events: none;
      }
      .ZenzaIchibaItemView.is-loading .ichibaLoadingView {
        display: block;
        font-size: 32px;
      }
      .ZenzaIchibaItemView.is-loading .loadStart,
      .ZenzaIchibaItemView.is-loading .ichibaItemListContainer {
        display: none;
      }

    .ZenzaIchibaItemView.is-success {
      background: #444;
      padding: 8px;
    }
      .ZenzaIchibaItemView.is-success .ichibaLoadingView,
      .ZenzaIchibaItemView.is-success .loadStart {
        display: none;
      }
      .ZenzaIchibaItemView.is-success .ichibaItemListContainer {
        display: block;
      }


    .ZenzaIchibaItemView.is-fail {
    }
      .ZenzaIchibaItemView.is-fail .ichibaLoadingView,
      .ZenzaIchibaItemView.is-fail .loadStartButton {
        display: none;
      }
      .ZenzaIchibaItemView.is-fail .ichibaItemListContainer {
        display: block;
      }


    .ZenzaIchibaItemView .ichibaItemListContainer {
      text-align: center;
    }
      .ZenzaIchibaItemView .ichibaItemListContainer .ichiba_mainitem {
        display: inline-table;
        width: 220px;
        margin: 8px;
        padding: 8px;
        word-break: break-all;
        border: 1px dotted #222;
      }
      .ZenzaIchibaItemView .price,
      .ZenzaIchibaItemView .buy,
      .ZenzaIchibaItemView .click {
        font-weight: bold;
        /*color: #fcc;*/
      }


    .ZenzaIchibaItemView a {
      display: inline-block;
      font-weight: bold;
      text-decoration: none;
      color: #ff9;
      padding: 2px;
    }
    .ZenzaIchibaItemView a:visited {
      color: #ffd;
    }


    .ZenzaIchibaItemView .rowJustify,
    .ZenzaIchibaItemView .noItem,
    .ichiba-ichibaMainLogo,
    .ichiba-ichibaMainHeader,
    .ichiba-ichibaMainFooter {
      display: none;
    }

    `).trim();

//===END===


