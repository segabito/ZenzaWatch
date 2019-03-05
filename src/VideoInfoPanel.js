import * as $ from 'jquery';
import * as _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {CONSTANT} from './constant';
import {util, Config, MylistPocketDetector, Sleep} from './util';
import {IchibaLoader} from './loader/api';
import {UaaLoader} from './loader/api';
import {RecommendAPILoader} from './loader/api';
import {RelatedVideoList} from './VideoList';
import {TagListView} from './TagListView';
import {BaseViewComponent} from './util';
import {Emitter} from './baselib';
import {WindowResizeObserver} from './baselib';
const MylistPocketDetector = {
  detect: () => { return Promise.resolve(); }
};

//===BEGIN===

class VideoInfoPanel extends Emitter {
  constructor(params) {
    super();
    this._videoHeaderPanel = new VideoHeaderPanel(params);
    this._dialog = params.dialog;
    this._config = Config;
    this._currentTimeGetter = params.currentTimeGetter;

    this._dialog.on('canplay', this._onVideoCanPlay.bind(this));
    this._dialog.on('videoCount', this._onVideoCountUpdate.bind(this));

    // this._videoHeaderPanel.on('command', this._onCommand.bind(this));

    if (params.node) {
      this.appendTo(params.node);
    }
  }
}

util.addStyle(`
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
      overscroll-behavior: contain;
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
      user-select: none;
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
    }

    .zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
      color: #fff;
      text-shadow: 0 0 4px #ff9;
      transition: none;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel.is-notFullscreen .tabSelect.blink:not(.activeTab) {
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

    .is-mouseMoving .zenzaWatchVideoInfoPanel>*,
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
    
    .zenzaWatchVideoInfoPanel .ownerPageLink {
      display: block;
      margin: 0 auto 8px;
      width: 104px;
    }

    .zenzaWatchVideoInfoPanel .ownerIcon {
      width: 96px;
      height: 96px;
      border: none;
      border-radius: 4px;
      transition: opacity 1s ease;
      vertical-align: middle;
    }
    .zenzaWatchVideoInfoPanel .ownerIcon.is-loading {
      opacity: 0;
    }

    .zenzaWatchVideoInfoPanel .ownerName {
      font-size: 20px;
      word-break: break-all;
    }

    .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
      padding: 16px;
      display: table;
      width: 100%;
    }

    .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>*{
      display: block;
      vertical-align: middle;
      text-align: center;
    }

    .zenzaWatchVideoInfoPanel .videoDescription {
      padding: 8px 8px 8px;
      margin: 4px 0px;
      word-break: break-all;
      line-height: 1.5;
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
      width: 272px;
      margin: 8px 10px;
      background: #444;
      border-radius: 4px;
    }
    .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #446;
    }

    .zenzaWatchVideoInfoPanel .videoDescription span[style],
    .zenzaWatchVideoInfoPanel .videoDescription font[color] {
      text-shadow: 1px 1px var(--base-description-color, #888);
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

    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
    .zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist,
    .zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
    .zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo {
      display: inline-block;
      font-size: 16px;
      line-height: 20px;
      width: 24px;
      height: 24px;
      background: #666;
      color: #ccc !important;
      background: #666;
      text-decoration: none;
      border: 1px outset;
      cursor: pointer;
      text-align: center;
      user-select: none;
      margin-left: 8px;
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
      position: relative;
      margin: 8px 0;
      padding: 8px;
      line-height: 150%;
      text-align; center;
      color: #333;
    }

    .zenzaWatchVideoInfoPanel .videoMetaInfoContainer {
      display: inline-block;
      padding: 0 8px;
    }

    .zenzaScreenMode_normal .is-backComment .zenzaWatchVideoInfoPanel,
    .zenzaScreenMode_big    .is-backComment .zenzaWatchVideoInfoPanel {
      opacity: 0.7;
    }


    .zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
      box-sizing: border-box;
      position: relative;
      width: 100%;
      height: 100%;
      margin: 0;
      user-select: none;
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

    ${CONSTANT.SCROLLBAR_CSS}

    .zenzaWatchVideoInfoPanel .zenzaWatchVideoInfoPanelInner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
      .zenzaWatchVideoInfoPanelContent {
        flex: 1;
      }

    .zenzaTubeButton {
      display: inline-block;
      padding: 4px 8px;
      cursor: pointer;
      background: #666;
      color: #ccc;
      border-radius: 4px;
      border: 1px outset;
      margin: 0 8px;
    }
    .zenzaTubeButton:hover {
      box-shadow: 0 0 8px #fff, 0 0 4px #ccc;
    }
      .zenzaTubeButton span {
        pointer-events: none;
        display: inline-block;
        background: #ccc;
        color: #333;
        border-radius: 4px;
      }
      .zenzaTubeButton:hover span {
        background: #f33;
        color: #ccc;
      }
    .zenzaTubeButton:active {
      box-shadow:  0 0 2px #ccc, 0 0 4px #000 inset;
      border: 1px inset;
    }

    .zenzaWatchVideoInfoPanel .relatedInfoMenuContainer {
      text-align: left;
    }

  `, {className: 'videoInfoPanel'});

util.addStyle(`
  .is-open .zenzaWatchVideoInfoPanel>* {
    display: none;
    pointer-events: none;
  }
  .zenzaWatchVideoInfoPanel:hover>* {
    display: inherit;
    pointer-events: auto;
  }
  .zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
    display: flex;
  }

  .zenzaWatchVideoInfoPanel {
    top: 20%;
    right: calc(32px - 320px);
    left: auto;
    width: 320px;
    height: 60%;
    background: none;
    opacity: 0;
    box-shadow: none;
    transition: opacity 0.4s ease, transform 0.4s ease 1s;
    will-change: opacity, transform;
  }

  .is-mouseMoving  .zenzaWatchVideoInfoPanel {
    height: 60%;
    background: none;
    border: 1px solid #888;
    opacity: 0.5;
  }

  .zenzaWatchVideoInfoPanel.is-slideOpen,
  .zenzaWatchVideoInfoPanel:hover {
    background: #333;
    box-shadow: 4px 4px 4px #000;
    border: none;
    opacity: 0.9;
    transform: translate3d(-288px, 0, 0);
    transition: opacity 0.4s ease, transform 0.4s ease 1s;
  }

`, {className: 'screenMode for-full videoInfoPanel'});

util.addStyle(`
    .zenzaScreenMode_small .zenzaWatchVideoInfoPanel {
      display: none;
    }

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
      width: calc(100% - 16px);
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect {
      background: #ccc;
      color: #888;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.activeTab {
      background: #ddd;
      color: black;
      border: none;
    }

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
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

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .publicStatus {
      display: block;
      text-align: center;
    }

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a {
      color: #006699;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a:visited {
      color: #666666;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
      display: block;
      bottom: 48px;
      width: 364px;
      margin: 0 auto;
      padding: 8px;
      background: #ccc;
    }

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
      background: #ddd;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
      background: #ddf;
    }
    
    .zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar {
      background: #f0f0f0;
    }

    .zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #ccc;
    }
`, {className: 'screenMode for-popup videoInfoPanel'});

util.addStyle(`
  .is-open .zenzaWatchVideoInfoPanel {
    display: none;
    left: calc(100%);
    top: 0;
  }

  @media screen {
    @media (min-width: 992px) {
      .zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
      }
    }
  
    @media (min-width: 1216px) {
      .zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
        display: inherit;
      }
    }
  
    /* 縦長モニター */
    @media
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
      }
  
      .zenzaScreenMode_normal .ZenzaIchibaItemView {
        margin: 8px 8px 96px;
      }
  
      .zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        display: table;
      }
      .zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
        display: table-cell;
        text-align: left;
      }
      .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel {
        width: 100% !important;
      }
    }
  
    @media
      (max-width: 1215px) and (min-height: 700px) {
      .zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
        display: inherit;
        top: 100%;
        left: 0;
        width: 100%;
        height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
        z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
      }
  
      .zenzaScreenMode_big .ZenzaIchibaItemView {
        margin: 8px 8px 96px;
      }
  
      .zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
        display: table;
      }
      .zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
        display: table-cell;
        text-align: left;
      }
      
      .zenzaScreenMode_big .zenzaWatchVideoHeaderPanel {
        width: 100% !important;
      }
    }
  }

`, {className: 'screenMode for-dialog videoInfoPanel'});

util.addStyle(`
  .zenzaWatchVideoInfoPanel .comment {
    padding-left: 0;
  }
`, {className: 'domain slack-com', disabled: true})

VideoInfoPanel.__tpl__ = (`
    <div class="zenzaWatchVideoInfoPanel show initializing">
      <div class="nowLoading">
        <div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
        <div class="loadingMessage">Loading...</div>
      </div>

      <div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-command="selectTab" data-param="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-command="selectTab" data-param="relatedVideoTab">関連動画</div></div>

      <div class="tabs videoInfoTab activeTab">
        <div class="zenzaWatchVideoInfoPanelInner">
          <div class="zenzaWatchVideoInfoPanelContent">
            <div class="videoOwnerInfoContainer">
              <a class="ownerPageLink" rel="noopener" target="_blank">
                <img class="ownerIcon loading"/>
              </a>
              <span class="owner">
                <span class="ownerName"></span>
                <zenza-playlist-append class="playlistSetUploadedVideo userVideo"
                  data-command="ownerVideo"
                  title="投稿動画一覧をプレイリストで開く">▶</zenza-playlist-append>
              </span>
            </div>
            <div class="publicStatus">
              <div class="videoMetaInfoContainer"></div>
              <div class="relatedInfoMenuContainer"></div>
            </div>
            <div class="videoDescription"></div>
          </div>
          <div class="zenzaWatchVideoInfoPanelFoot">
            <div class="uaaContainer"></div>

            <div class="ichibaContainer"></div>

            <div class="videoTagsContainer sideTab"></div>
          </div>
        </div>
      </div>

      <div class="tabs relatedVideoTab">
        <div class="relatedVideoContainer"></div>
      </div>

    </div>
  `).trim();

_.assign(VideoInfoPanel.prototype, {
  _initializeDom: function () {
    if (this._isInitialized) {
      return;
    }
    this._isInitialized = true;

    // util.addStyle(VideoInfoPanel.__css__);
    let $view = this._$view = $(VideoInfoPanel.__tpl__);
    const view = this._view = $view[0];

    let $icon = this._$ownerIcon = $view.find('.ownerIcon');
    this._$ownerName = $view.find('.ownerName');
    this._$ownerPageLink = $view.find('.ownerPageLink');

    this._description = view.querySelector('.videoDescription');

    this._tagListView = new TagListView({
      parentNode: view.querySelector('.videoTagsContainer')
    });

    this._relatedInfoMenu = new RelatedInfoMenu({
      parentNode: view.querySelector('.relatedInfoMenuContainer')
    });

    this._videoMetaInfo = new VideoMetaInfo({
      parentNode: view.querySelector('.videoMetaInfoContainer')
    });

    this._uaaContainer = view.querySelector('.uaaContainer');
    this._uaaView = new UaaView(
      {parentNode: this._uaaContainer});

    this._ichibaContainer = view.querySelector('.ichibaContainer');
    this._ichibaItemView = new IchibaItemView(
      {parentNode: this._ichibaContainer});

    view.addEventListener('mousemove', e => e.stopPropagation());
    view.addEventListener('command', this._onCommandEvent.bind(this));
    view.addEventListener('click', this._onClick.bind(this));
    view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
    $icon.on('load', () => $icon.removeClass('is-loading'));

    view.classList.add(util.fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
    ZenzaWatch.emitter.on('fullscreenStatusChange', isFull => {
      view.classList.toggle('is-fullscreen', isFull);
      view.classList.toggle('is-notFullscreen', !isFull);
    });

    view.addEventListener('touchenter', () => view.classList.add('is-slideOpen'), {passive: true});
    ZenzaWatch.emitter.on('hideHover', () => view.classList.remove('is-slideOpen'));
    MylistPocketDetector.detect().then(pocket => {
      this._pocket = pocket;
      view.classList.add('is-pocketReady');
    });
    if (window.customElements) {
      VideoItemObserver.observe({container: this._description});
    }
  },
  update: function (videoInfo) {
    this._videoInfo = videoInfo;
    this._videoHeaderPanel.update(videoInfo);

    let owner = videoInfo.owner;
    this._$ownerIcon.attr('src', owner.icon);
    this._$ownerPageLink.attr('href', owner.url);
    this._$ownerName.text(owner.name);

    this._videoMetaInfo.update(videoInfo);
    this._tagListView.update({
      tagList: videoInfo.tagList,
      watchId: videoInfo.watchId,
      videoId: videoInfo.videoId,
      token: videoInfo.csrfToken,
      watchAuthKey: videoInfo.watchAuthKey
    });

    this._updateVideoDescription(videoInfo.description, videoInfo.isChannel);

    this._$view
      .removeClass('userVideo channelVideo initializing')
      .toggleClass('is-community', this._videoInfo.isCommunityVideo)
      .toggleClass('is-mymemory', this._videoInfo.isMymemory)
      .addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo');

    this._ichibaItemView.clear();
    this._ichibaItemView.videoId = videoInfo.videoId;

    this._uaaView.clear();
    this._uaaView.update(videoInfo);

    this._relatedInfoMenu.update(videoInfo);

  },
  /**
   * 説明文中のurlの自動リンク等の処理
   */
  _updateVideoDescription: function (html) {
    this._description.textContent = '';
    this._zenTubeUrl = null;
    const watchLink = watchLink => {
      let videoId = watchLink.textContent.replace('watch/', '');

      if (
        !/^(sm|nm|so|)[0-9]+$/.test(videoId) ||
        !['www.nicovideo.jp'].includes(watchLink.hostname) || !watchLink.pathname.startsWith('/watch/')) {
        return;
      }
      watchLink.classList.add('noHoverMenu');
      Object.assign(watchLink.dataset, {command: 'open', param: videoId});

      if (!window.customElements) {
        let $watchLink = util.$(watchLink);
        let thumbnail = util.getThumbnailUrlByVideoId(videoId);
        if (thumbnail) {
          let $img = util.$('<img class="videoThumbnail">').attr('src', thumbnail);
          $watchLink.append($img);
        }
        let buttons = util.$(`<zenza-playlist-append
          class="playlistAppend clickable-item" title="プレイリストで開く"
          data-command="playlistAppend" data-param="${videoId}"
        >▶</zenza-playlist-append><div
          class="deflistAdd" title="とりあえずマイリスト"
          data-command="deflistAdd" data-param="${videoId}"
        >&#x271A;</div
        ><div class="pocket-info" title="動画情報"
          data-command="pocket-info" data-param="${videoId}"
        >？</div>`);
        $watchLink.append(buttons);
      } else {
        let vitem = document.createElement('zenza-video-item');
        vitem.dataset.videoId = videoId;
        watchLink.insertAdjacentElement('afterend', vitem);
        watchLink.classList.remove('watch');
        // vitem.append(watchLink);
      }
    };
    const seekTime = seek => {
      let [min, sec] = (seek.dataset.seektime || '0:0').split(':');
      Object.assign(seek.dataset, {command: 'seek', type: 'number', param: min * 60 + sec * 1});
    };
    const mylistLink = link => {
      link.classList.add('mylistLink');
      let mylistId = link.textContent.split('/')[1];
      let button = util.$(`<zenza-mylist-link data-mylist-id="${mylistId}">
          ${link.outerHTML}
          <zenza-playlist-append
            class="playlistSetMylist clickable-item" title="プレイリストで開く"
            data-command="playlistSetMylist" data-param="${mylistId}"
          >▶</zenza-playlist-append>
        </zenza-mylist-link>`)[0];
      link.replaceWith(button);
    };
    const youtube = link => {
      const btn = document.createElement('zentube-button');
      if (!this._zenTubeUrl) {
        this._zenTubeUrl = link.href;
      }
      btn.className = 'zenzaTubeButton';
      btn.innerHTML = '▷Zen<span>Tube</span>';
      btn.title = 'ZenzaWatchで開く(実験中)';
      btn.setAttribute('accesskey', 'z');
      btn.setAttribute('data-command', 'setVideo');
      btn.setAttribute('data-param', link.href);
      link.parentNode.insertBefore(btn, link);
    };

    Promise.resolve().then(() => {
      const description = util.createDom(html);
      Array.from(description.querySelectorAll('a')).forEach(a => {
        a.classList.add('noHoverMenu');
        let href = a.href;
        if (a.classList.contains('watch')) {
          watchLink(a);
        } else if (a.classList.contains('seekTime')) {
          seekTime(a);
        } else if (/^mylist\//.test(a.textContent)) {
          mylistLink(a);
        } else if (/^https?:\/\/((www\.|)youtube\.com\/watch|youtu\.be)/.test(href)) {
          youtube(a);
        }
      });
      this._description.append(description);
    });
  },
  _onVideoCanPlay: function (watchId, videoInfo, options) {
    // 動画の再生を優先するため、比較的どうでもいい要素はこのタイミングで初期化するのがよい
    if (!this._relatedVideoList) {
      this._relatedVideoList = new RelatedVideoList({
        container: this._$view.find('.relatedVideoContainer')[0]
      });
      this._relatedVideoList.on('command', this._onCommand.bind(this));
    }

    if (this._config.getValue('autoZenTube') && this._zenTubeUrl && !options.isAutoZenTubeDisabled()) {
      window.setTimeout(() => {
        window.console.info('%cAuto ZenTube', this._zenTubeUrl);
        this.emit('command', 'setVideo', this._zenTubeUrl);
      }, 100);
    }
    let relatedVideo = [VideoListItem.createByVideoInfoModel(videoInfo).serialize()];
    RecommendAPILoader.load({videoId: videoInfo.videoId}).then(data => {
      const items = data.items || [];
      (items || []).forEach(item => {
        if (item.contentType !== 'video') {
          return;
        }
        let content = item.content;
        relatedVideo.push({
          _format: 'recommendApi',
          _data: item,
          id: item.id,
          title: content.title,
          length_seconds: content.duration,
          num_res: content.count.comment,
          mylist_counter: content.count.mylist,
          view_counter: content.count.view,
          thumbnail_url: content.thumbnail.url,
          first_retrieve: content.registeredAt,
          has_data: true,
          is_translated: false
        });
      });
      this._relatedVideoList.update(relatedVideo, watchId);
    });

  },
  _onVideoCountUpdate: function (...args) {
    if (!this._videoHeaderPanel) {
      return;
    }
    this._videoMetaInfo.updateVideoCount(...args);
    this._videoHeaderPanel.updateVideoCount(...args);
  },
  _onClick: function(e) {
      e.stopPropagation();
      if (
        (e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey)) {
        return true;
      }
      let target = e.target.closest('[data-command]');
      if (!target) {
        ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
        return;
      }
      let command = target.dataset.command;
      let param   = target.dataset.param;
      let type    = target.dataset.type;
      if (param && (type === 'bool' || type === 'json')) {
        param = JSON.parse(param);
      }
      e.preventDefault();

      util.dispatchCommand(e.target, command, param);
  },
  _onCommand: function (command, param) {
    switch (command) {
      default:
        util.dispatchCommand(this._view, command, param);
        break;
    }
  },
  _onCommandEvent: function(e) {
    const {command, param} = e.detail;
    switch (command) {
      case 'pocket-info':
        this._pocket.external.info(param);
        break;
      case 'ownerVideo':
        util.dispatchCommand(this._view, 'playlistSetUploadedVideo', this._videoInfo.owner.id);
        break;
      default:
        return;
    }
    e.stopPropagation();
  },
  appendTo: function (node) {
    let $node = $(node);
    this._initializeDom();
    $node.append(this._$view);
    this._videoHeaderPanel.appendTo($node);
  },
  hide: function () {
    this._videoHeaderPanel.hide();
  },
  close: function () {
    this._videoHeaderPanel.close();
  },
  clear: function () {
    this._videoHeaderPanel.clear();
    this._$view.addClass('initializing');
    this._$ownerIcon.addClass('is-loading');
    this._description.textContent = '';
  },
  selectTab: function (tabName) {
    let $view = this._$view;
    let $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
    this._activeTabName = tabName;
    $view.find('.activeTab').removeClass('activeTab');
    $target.addClass('activeTab');
  },
  blinkTab: function (tabName) {
    let $view = this._$view;
    let $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
    if (!$target.length) {
      return;
    }
    $target.addClass('blink');
    window.setTimeout(() => {
      $target.removeClass('blink');
    }, 50);
  },
  appendTab: function (tabName, title, content) {
    let $view = this._$view;
    let $select =
      $('<div class="tabSelect"/>')
        .addClass(tabName)
        .attr('data-command', 'selectTab')
        .attr('data-param', tabName)
        .text(title);
    let $body = $('<div class="tabs"/>')
      .addClass(tabName);
    if (content) {
      $body.append($(content));
    }

    $view.find('.tabSelectContainer').append($select);
    $view.append($body);

    if (this._activeTabName === tabName) {
      $select.addClass('activeTab');
      $body.addClass('activeTab');
    }
    return $body;
  }
});

class VideoHeaderPanel extends Emitter {
  constructor(params) {
    super();
    this._currentTimeGetter = params.currentTimeGetter;
  }
}
util.addStyle(`
  .zenzaScreenMode_small .zenzaWatchVideoHeaderPanel {
    display: none;
  }
  .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
    top: 0;
    left: 400px;
    width: calc(100vw - 400px);
    bottom: auto;
    background: #272727;
    opacity: 0.9;
    height: 40px;
  }
  /* ヘッダ追従 */
  body.zenzaScreenMode_sideView:not(.nofix)  .zenzaWatchVideoHeaderPanel {
    top: 0;
  }
  /* ヘッダ固定 */
  .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTitleContainer {
    margin: 0;
  }
  .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .publicStatus,
  .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTagsContainer {
    display: none;
  }

  @media screen and (min-width: 1432px)
  {
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
      width: calc(100% - 16px);
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
      top: calc((100vw - 1024px) * 9 / 16 + 4px);
      width: calc(100vw - 1024px);
      height: calc(100vh - (100vw - 1024px) * 9 / 16 - 70px);
    }

    .zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
      width: calc(100vw - 1024px - 26px);
    }
  
    .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
      width: calc(100vw - (100vw - 1024px));
      left:  calc(100vw - 1024px);
    }
  }

`, {className: 'screenMode for-popup videoHeaderPanel', disabled: true});

util.addStyle(`
  body .is-open .zenzaWatchVideoHeaderPanel {
    width: calc(100% + ${CONSTANT.RIGHT_PANEL_WIDTH}px);
  }
    .zenzaWatchVideoHeaderPanel.is-onscreen {
      top: 0px;
      bottom: auto;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      box-shadow: none;
    }

    .is-loading .zenzaWatchVideoHeaderPanel.is-onscreen {
      opacity: 0.6;
      transition: 0.4s opacity;
    }

    .zenzaWatchVideoHeaderPanel.is-onscreen:hover {
      opacity: 1;
      transition: 0.5s opacity;
    }

    .zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer {
      display: none;
      width: calc(100% - 240px);
    }

    .zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer {
      display: block;
    }
    .zenzaWatchVideoHeaderPanel.is-onscreen .videoTitleContainer {
      width: calc(100% - 180px);
    }

`, {className: 'screenMode for-dialog videoHeaderPanel', disabled: true});

util.addStyle(`
  .is-open .zenzaWatchVideoHeaderPanel {
    position: absolute; /* fixedだとFirefoxのバグでおかしくなる */
    top: 0px;
    bottom: auto;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    box-shadow: none;
  }

  .is-open.is-loading .zenzaWatchVideoHeaderPanel,
  .is-open.is-mouseMoving .zenzaWatchVideoHeaderPanel {
    opacity: 0.6;
    transition: 0.4s opacity;
  }

  .is-open .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
  .is-open .zenzaWatchVideoHeaderPanel:hover {
    opacity: 1;
    transition: 0.5s opacity;
  }

  .is-open .videoTagsContainer {
    display: none;
    width: calc(100% - 240px);
  }

  .is-open .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
    display: block;
  }
  
  .is-open .zenzaWatchVideoHeaderPanel .videoTitleContainer {
    width: calc(100% - 180px);
  }

`, {className: 'screenMode for-full videoHeaderPanel', disabled: true});

VideoHeaderPanel.__css__ = (`
    .zenzaWatchVideoHeaderPanel {
      position: absolute;
      width: calc(100%);
      z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
      box-sizing: border-box;
      padding: 8px 8px 0;
      bottom: calc(100% + 8px);
      left: 0;
      background: #333;
      color: #ccc;
      text-align: left;
      box-shadow: 4px 4px 4px #000;
      transition: opacity 0.4s ease;
    }
    .zenzaWatchVideoHeaderPanel.is-onscreen {
      width: 100% !important;
    }
    .zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel,
    .zenzaWatchVideoHeaderPanel.is-fullscreen {
      z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
    }

    .zenzaWatchVideoHeaderPanel>* {
      pointer-events: none;
    }

    .is-mouseMoving .zenzaWatchVideoHeaderPanel>*,
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
      position: relative;
      color: #ccc;
    }

    .zenzaWatchVideoHeaderPanel .videoTitle {
      font-size: 24px;
      color: #fff;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      display: block;
      padding: 2px 0;
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
    .zenzaWatchVideoHeaderPanel.is-mymemory:not(:hover) .videoTitle::before {
      content: 'マイメモリー';
      display: inline-block;
    }
    .zenzaWatchVideoHeaderPanel.is-community:not(:hover) .videoTitle::before {
      content: 'コミュニティ動画';
      display: inline-block;
    }

    .videoMetaInfoContainer {
      display: inline-block;
    }

    .zenzaScreenMode_normal .is-backComment .zenzaWatchVideoHeaderPanel,
    .zenzaScreenMode_big    .is-backComment .zenzaWatchVideoHeaderPanel {
      opacity: 0.7;
    }

    .zenzaWatchVideoHeaderPanel .relatedInfoMenuContainer {
      display: inline-block;
      position: absolute;
      top: 0;
      margin: 0 16px;
      z-index: 1000;
    }

    .zenzaWatchVideoHeaderPanel:focus-within,
    .zenzaWatchVideoHeaderPanel.is-relatedMenuOpen {
      z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
    }
  `);

VideoHeaderPanel.__tpl__ = (`
    <div class="zenzaWatchVideoHeaderPanel show initializing" style="display: none;">
      <h2 class="videoTitleContainer">
        <span class="videoTitle"></span>
      </h2>
      <p class="publicStatus">
        <span class="videoMetaInfoContainer"></span>
        <span class="relatedInfoMenuContainer"></span>
      </p>
      <div class="videoTagsContainer videoHeader">
      </div>
    </div>
  `).trim();

_.assign(VideoHeaderPanel.prototype, {
  _initializeDom: function () {
    if (this._isInitialized) {
      return;
    }
    this._isInitialized = true;
    util.addStyle(VideoHeaderPanel.__css__);
    let $view = this._$view = $(VideoHeaderPanel.__tpl__);
    let view = $view[0];

    this._$videoTitle = $view.find('.videoTitle');
    this._searchForm = new VideoSearchForm({
      parentNode: view
    });

    view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});

    this._tagListView = new TagListView({
      parentNode: view.querySelector('.videoTagsContainer')
    });

    this._relatedInfoMenu = new RelatedInfoMenu({
      parentNode: view.querySelector('.relatedInfoMenuContainer'),
      isHeader: true
    });
    this._relatedInfoMenu.on('open', () => $view.addClass('is-relatedMenuOpen'));
    this._relatedInfoMenu.on('close', () => $view.removeClass('is-relatedMenuOpen'));

    this._videoMetaInfo = new VideoMetaInfo({
      parentNode: view.querySelector('.videoMetaInfoContainer'),
    });

    view.classList.add(util.fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
    ZenzaWatch.emitter.on('fullScreenStatusChange', isFull => {
      view.classList.toggle('is-fullscreen', isFull);
      view.classList.toggle('is-notFullscreen', !isFull);
    });

    window.addEventListener('resize', _.debounce(this._onResize.bind(this), 500));
  },
  update: function (videoInfo) {
    this._videoInfo = videoInfo;

    const videoTitle = util.unescapeHtml(videoInfo.title);
    this._$videoTitle.text(videoTitle).attr('title', videoTitle);

    let watchId = videoInfo.watchId;
    this._videoMetaInfo.update(videoInfo);

    this._tagListView.update({
      tagList: videoInfo.tagList,
      watchId,
      videoId: videoInfo.videoId,
      token: videoInfo.csrfToken,
      watchAuthKey: videoInfo.watchAuthKey
    });

    this._relatedInfoMenu.update(videoInfo);

    this._$view
      .removeClass('userVideo channelVideo initializing')
      .toggleClass('is-community', this._videoInfo.isCommunityVideo)
      .toggleClass('is-mymemory', this._videoInfo.isMymemory)
      .toggleClass('has-Parent', this._videoInfo.hasParentVideo)
      .addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo')
      .css('display', '');

    window.setTimeout(() => this._onResize(), 1000);
  },
  updateVideoCount: function (...args) {
    this._videoMetaInfo.updateVideoCount(...args);
  },
  _onResize: function () {
    const view = this._$view[0];
    const rect = view.getBoundingClientRect();
    let isOnscreen = view.classList.contains('is-onscreen');
    const height = rect.bottom - rect.top;
    const top = isOnscreen ? (rect.top - height) : rect.top;
    view.classList.toggle('is-onscreen', top < -32);
  },
  appendTo: function ($node) {
    this._initializeDom();
    $node.append(this._$view);
  },
  hide: function () {
    if (!this._$view) {
      return;
    }
    this._$view.removeClass('show');
  },
  close: function () {
  },
  clear: function () {
    if (!this._$view) {
      return;
    }
    this._$view.addClass('initializing');

    this._$videoTitle.text('------');
  },
  getPublicStatusDom: function () {
    return this._$view.find('.publicStatus').html();
  }
});


class VideoSearchForm extends Emitter {
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

    this._view = view.querySelector('*');
    this._form = view.querySelector('form');
    this._word = view.querySelector('.searchWordInput');
    this._sort = view.querySelector('.searchSortSelect');
    // this._submit = view.querySelector('.searchSubmit');
    this._mode = view.querySelector('.searchMode') || 'tag';

    this._form.addEventListener('submit', this._onSubmit.bind(this));

    const config = this._config;
    const form = this._form;

    form['ownerOnly'].checked = config.getValue('ownerOnly');
    let confMode = config.getValue('mode');
    if (typeof confMode === 'string' && ['tag', 'keyword'].includes(confMode)) {
      form['mode'].value = confMode;
    } else if (typeof confMode === 'boolean') {
      form['mode'].value = confMode ? 'tag' : 'keyword';
    } else {
      form['mode'].value = 'tag';
    }
    form['word'].value = config.getValue('word');
    form['sort'].value = config.getValue('sort');

    this._view.addEventListener('click', this._onClick.bind(this));
    const submit = _.debounce(this.submit.bind(this), 500);
    Array.from(view.querySelectorAll('input, select')).forEach(item => {
      if (item.type === 'checkbox') {
        item.addEventListener('change', () => {
          this._word.focus();
          config.setValue(item.name, item.checked);
          submit();
        });
      } else if (item.type === 'radio') {
        item.addEventListener('change', () => {
          this._word.focus();
          config.setValue(item.name, this._form[item.name].value);
          submit();
        });
      } else {
        item.addEventListener('change', () => {
          config.setValue(item.name, item.value);
          if (item.tagName === 'SELECT') {
            submit();
          }
        });
      }
    });

    ZenzaWatch.emitter.on('searchVideo', ({word}) => {
      form['word'].value = word;
    });

    if (parentNode) {
      parentNode.appendChild(view);
    }

    ZenzaWatch.debug.searchForm = this;
  }

  _onClick(e) {
    e.stopPropagation();
    const tagName = (e.target.tagName || '').toLowerCase();
    const target = e.target.closest('.command');

    if (!['input', 'select'].includes(tagName)) {
      this._word.focus();
    }

    if (!target) {
      return;
    }

    const command = target.dataset.command;
    if (!command) {
      return;
    }
    e.preventDefault();
    const type = target.getAttribute('data-type') || 'string';
    let param = target.getAttribute('data-param');
    if (type !== 'string') { param = JSON.parse(param); }

    switch (command) {
      case 'clear':
        this._word.value = '';
        break;
      default:
        util.dispatchCommand(e.target, command, param);
    }
  }

  _onSubmit(e) {
    this.submit();
    e.stopPropagation();
  }

  submit() {
    const word = this.word;
    if (!word) {
      return;
    }

    util.dispatchCommand(this._view, 'playlistSetSearchVideo', {
      word,
      option: {
        searchType: this.searchType,
        sort: this.sort,
        order: this.order,
        owner: this.isOwnerOnly,
        playlistSort: this.isPlaylistSort
      }
    });
  }

  _hasFocus() {
    return !!document.activeElement.closest('#zenzaVideoSearchPanel');
  }

  _updateFocus() {
  }

  get word() {
    return (this._word.value || '').trim();
  }

  get searchType() {
    return this._form.mode.value;
  }

  get sort() {
    const sortTmp = (this._sort.value || '').split(',');
    const playlistSort = sortTmp[0] === 'playlist';
    return playlistSort ? 'f' : sortTmp[0];
  }

  get order() {
    const sortTmp = (this._sort.value || '').split(',');
    return sortTmp[1] || 'd';
  }

  get isPlaylistSort() {
    const sortTmp = (this._sort.value || '').split(',');
    return sortTmp[0] === 'playlist';
  }

  get isOwnerOnly() {
    return this._form['ownerOnly'].checked;
  }
}

util.addStyle(`
  .is-open .zenzaWatchVideoHeaderPanel .zenzaVideoSearchPanel {
    top: 120px;
    right: 32px;
  }
`, {className: 'screenMode for-popup videoSearchPanel', disabled: true});

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

    .zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_big    .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
    .zenzaScreenMode_3D    .zenzaVideoSearchPanel,
    .zenzaScreenMode_wide  .zenzaVideoSearchPanel,
    .zenzaWatchVideoHeaderPanel.is-fullscreen .zenzaVideoSearchPanel {
      top: 64px;
    }

    .zenzaVideoSearchPanel:focus-within {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel:not(:focus-within) .focusOnly {
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
    .zenzaVideoSearchPanel:focus-within .searchInputHead {
      background: rgba(50, 50, 50, 0.8);
    }

    .zenzaVideoSearchPanel           .searchInputHead:hover,
    .zenzaVideoSearchPanel:focus-within .searchInputHead {
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

      .is-mouseMoving .zenzaVideoSearchPanel:not(:focus-within) .searchWordInput {
        opacity: 0.5;
      }

      .is-mouseMoving .zenzaVideoSearchPanel:not(:focus-within) .searchWordInput:hover {
        opacity: 0.8;
      }

      .zenzaVideoSearchPanel:focus-within .searchWordInput {
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

      .zenzaVideoSearchPanel:focus-within .searchSubmit {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel:focus-within .searchSubmit:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel:focus-within .searchSubmit:active {
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

      .zenzaVideoSearchPanel:focus-within .searchClear {
        pointer-events: auto;
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .zenzaVideoSearchPanel:focus-within .searchClear:hover {
        transform: scale(1.5);
      }

      .zenzaVideoSearchPanel:focus-within .searchClear:active {
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
    .zenzaVideoSearchPanel:focus-within .searchInputFoot {
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

      .zenzaVideoSearchPanel .autoPauseLabel input + span {
        display: inline-block;
        pointer-events: none;
      }

  `).trim();

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
            <option value="playlist">自動(連続再生用)</option>
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


class IchibaItemView extends BaseViewComponent {
  constructor({parentNode}) {
    super({
      parentNode,
      name: 'IchibaItemView',
      template: IchibaItemView.__tpl__,
      css: IchibaItemView.__css__,
    });

    ZenzaWatch.debug.ichiba = this;
  }

  _initDom(...args) {
    super._initDom(...args);

    this._listContainer =
      this._view.querySelector('.ichibaItemListContainer .ichibaItemListInner');
    this._listContainerDetails =
      this._view.querySelector('.ichibaItemListContainer .ichibaItemListDetails');
  }

  _onCommand(command, param) {
    switch (command) {
      case 'load':
        this.load(this._videoId);
        break;
      default:
        super._onCommand(command, param);
    }
  }

  load(videoId) {
    if (this._isLoading) {
      return;
    }
    videoId = videoId || this._videoId;
    this._isLoading = true;
    this.addClass('is-loading');
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
    this.removeClass('is-loading');
    const div = document.createElement('div');
    div.innerHTML = data.main;

    Array.from(div.querySelectorAll('[id]')).forEach(elm => {
      elm.classList.add(`ichiba-${elm.id}`);
      elm.removeAttribute('id');
    });
    Array.from(div.querySelectorAll('[style]'))
      .forEach(elm => elm.removeAttribute('style'));

    const items = div.querySelectorAll('.ichiba_mainitem');

    if (!items || items.length < 1) {
      this.addClass('is-empty');
      this._listContainer.innerHTML = '<h2>貼られている商品はありません</h2>';
    } else {
      this._listContainer.innerHTML = div.innerHTML;
    }
    this.addClass('is-success');

    this._listContainerDetails.setAttribute('open', 'open');

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
        <div class="loadStartButton command" data-command="load">ニコニコ市場</div>
      </div>
      <div class="ichibaLoadingView">
        <div class="loading-inner">
          <span class="spinner">&#8987;</span>
        </div>
      </div>
      <div class="ichibaItemListContainer">
        <details class="ichibaItemListDetails">
          <summary class="ichibaItemSummary loadStartButton">ニコニコ市場</summary>
          <div class="ichibaItemListInner"></div>
        </details>
      </div>
    </div>
    `).trim();

util.addStyle(`
  .ZenzaIchibaItemView .loadStartButton {
    color: #000;
  }
`, {className: 'screenMode for-popup ichiba', disabled: true});

IchibaItemView.__css__ = (`
    .ZenzaIchibaItemView {
      text-align: center;
      margin: 8px 8px 32px;
      color: #ccc;
    }

      .ZenzaIchibaItemView .loadStartButton {
         font-size: 24px;
         padding: 8px 8px;
         margin: 8px;
         background: inherit;
         color: inherit;
         border: 1px solid #ccc;
         outline: none;
         line-height: 20px;
         border-radius: 8px;
         cursor: pointer;
         user-select: none;
      }

      .ZenzaIchibaItemView .loadStartButton:active::after {
        opacity: 0;
      }
      
      .ZenzaIchibaItemView .loadStartButton:active {
        transform: translate(0, 2px);
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
      background: none;
    }
      .ZenzaIchibaItemView.is-success .ichibaLoadingView,
      .ZenzaIchibaItemView.is-success .loadStart {
        display: none;
      }
      .ZenzaIchibaItemView.is-success .ichibaItemListContainer {
        display: block;
      }
      .ZenzaIchibaItemView.is-success details[open] {
        border: 1px solid #666;
        border-radius: 4px;
        padding: 0px;
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
      .ZenzaIchibaItemView .ichibaItemListContainer .ichiba-ichiba_mainpiaitem,
      .ZenzaIchibaItemView .ichibaItemListContainer .ichiba_mainitem {
        display: inline-table;
        width: 220px;
        margin: 8px;
        padding: 8px;
        word-break: break-all;
        text-shadow: 1px 1px 0 #000;
        background: #666;
        border-radius: 4px;
      }
      .ZenzaIchibaItemView .price,
      .ZenzaIchibaItemView .buy,
      .ZenzaIchibaItemView .click {
        font-weight: bold;
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


// typoじゃなくてブロック回避のため名前を変えてる
class UaaView extends BaseViewComponent {
  constructor({parentNode}) {
    super({
      parentNode,
      name: 'UaaView',
      template: UaaView.__tpl__,
      shadow: UaaView._shadow_,
      css: UaaView.__css__
    });

    this._state = {
      isUpdating: false,
      isExist: false,
      isSpeaking: false
    };

    this._config = Config.namespace('uaa');

    this._bound.load = this.load.bind(this);
    this._bound.update = this.update.bind(this);
  }

  _initDom(...args) {
    super._initDom(...args);
    ZenzaWatch.debug.uaa = this;

    if (!this._shadow) {
      return;
    } // ShadowDOM使えなかったらバイバイ
    const shadow = this._shadow || this._view;
    this._elm.body = shadow.querySelector('.UaaDetailBody');
  }

  update(videoInfo) {
    if (!this._shadow || !this._config.getValue('enable')) {
      return;
    }
    if (!this._elm.body) {
      return;
    }

    if (this._state.isUpdating) {
      return;
    }
    this.setState({isUpdating: true});
    this._props.videoInfo = videoInfo;
    this._props.videoId = videoInfo.videoId;

    window.setTimeout(() => {
      this.load(videoInfo);
    }, 5000);
  }

  load(videoInfo) {
    const videoId = videoInfo.videoId;

    return UaaLoader.load(videoId, {limit: 50})
      .then(this._onLoad.bind(this, videoId))
      .catch(this._onFail.bind(this, videoId));
  }

  clear() {
    this.setState({isUpdating: false, isExist: false, isSpeaking: false});
    if (!this._elm.body) {
      return;
    }
    this._elm.body.innerHTML = '';
  }

  _onLoad(videoId, result) {
    if (this._props.videoId !== videoId) {
      return;
    }
    this.setState({isUpdating: false});
    const data = result ? result.data : null;
    if (!data || data.sponsors.length < 1) {
      return;
    }

    const df = document.createDocumentFragment();
    const div = document.createElement('div');
    div.className = 'screenshots';
    let idx = 0, screenshots = 0;
    data.sponsors.forEach(u => {
      if (!u.auxiliary.bgVideoPosition || idx >= 4) {
        return;
      }
      u.added = true;
      div.append(this._createItem(u, idx++));
      screenshots++;
    });
    div.setAttribute('data-screenshot-count', screenshots);
    df.append(div);

    data.sponsors.forEach(u => {
      if (!u.auxiliary.bgVideoPosition || u.added) {
        return;
      }
      u.added = true;
      df.append(this._createItem(u, idx++));
    });
    data.sponsors.forEach(u => {
      if (u.added) {
        return;
      }
      u.added = true;
      df.append(this._createItem(u, idx++));
    });

    this._elm.body.innerHTML = '';
    this._elm.body.appendChild(df);

    this.setState({isExist: true});
  }

  _createItem(data, idx) {
    const df = document.createElement('div');
    const contact = document.createElement('span');
    contact.textContent = data.advertiserName;
    contact.className = 'contact';
    df.className = 'item';
    const aux = data.auxiliary;
    const bgkeyframe = aux.bgVideoPosition || 0;
    if (data.message) {
      data.title = data.message;
    }

    df.setAttribute('data-index', idx);
    if (bgkeyframe && idx < 4) {
      const sec = parseFloat(bgkeyframe);
      df.setAttribute('data-time', util.secToTime(sec));
      df.classList.add('clickable', 'command', 'other');
      Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
      contact.setAttribute('title', `${data.message}(${util.secToTime(sec)})`);

      this._props.videoInfo.getCurrentVideo()
        .then(url => util.videoCapture(url, sec))
        .then(screenshot => {
        const cv = document.createElement('canvas');
        const ct = cv.getContext('2d');
        cv.width = screenshot.width;
        cv.height = screenshot.height;

        cv.className = 'screenshot command clickable';
        Object.assign(cv.dataset, { command: 'seek', type: 'number', param: sec });
        ct.fillStyle = 'rgb(32, 32, 32)';
        ct.fillRect(0, 0, cv.width, cv.height);
        ct.drawImage(screenshot, 0, 0);
        df.classList.add('has-screenshot');
        df.classList.remove('clickable', 'other');

        df.appendChild(cv);
      }).catch(() => {});
    } else if (bgkeyframe) {
      const sec = parseFloat(bgkeyframe);
      df.classList.add('clickable', 'command', 'other');
      Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
      contact.setAttribute('title', `${data.message}(${util.secToTime(sec)})`);
    } else {
      df.classList.add('other');
    }
    df.appendChild(contact);
    return df;
  }

  _onFail(videoId) {
    if (this._props.videoId !== videoId) {
      return;
    }
    this.setState({isUpdating: false});
  }

  _onCommand(command, param) {
    switch (command) {
      default:
        super._onCommand(command, param);
    }
  }

}

UaaView._shadow_ = (`
    <style>
      .UaaDetails,
      .UaaDetails * {
        box-sizing: border-box;
        user-select: none;
      }

      .UaaDetails .clickable {
        cursor: pointer;
      }

        .UaaDetails .clickable:active {
          transform: translate(0, 2px);
          box-shadow: none;
        }

      .UaaDetails {
        opacity: 0;
        pointer-events: none;
        max-height: 0;
        margin: 0 8px 0;
        color: #ccc;
        overflow: hidden;
        text-align: center;
        word-break: break-all;
      }
        .UaaDetails.is-Exist {
          display: block;
          pointer-events: auto;
          max-height: 800px;
          margin: 8px;
          padding: 8px 4px;
          opacity: 1;
          transition: opacity 0.4s linear 0.4s, max-height 1s ease-in, margin 0.4s ease-in;
        }
        .UaaDetails.is-Exist[open] {
          border: 1px solid #666;
          border-radius: 4px;
          overflow: auto;
        }

      .UaaDetails .uaaSummary {
        height: 38px;
        margin: 4px 4px 8px;
        color: inherit;
        outline: none;
        border: 1px solid #ccc;
        letter-spacing: 12px;
        line-height: 38px;
        font-size: 24px;
        text-align: center;
        cursor: pointer;
        border-radius: 8px;
      }

      .UaaDetails .uaaDetailBody {
        margin: auto;
      }

      .UaaDetails .item {
        display: inline;
        width: inherit;
        margin: 0 4px 0 0;
      }

        .UaaDetails .item.has-screenshot {
          position: relative;
          display:inline-block;
          margin: 4px;
        }
        .UaaDetails .item.has-screenshot::after {
          content: attr(data-time);
          position: absolute;
          right: 0;
          bottom: 0;
          padding: 2px 4px;
          background: #000;
          color: #ccc;
          font-size: 12px;
          line-height: 14px;
        }
        .UaaDetails .item.has-screenshot:hover::after {
          opacity: 0;
        }

      .UaaDetails .contact {
        display: inline-block;
        color: #fff;
        font-weight: bold;
        font-size: 16px;
        text-align: center;
        user-select: none;
        word-break: break-all;
      }

        .UaaDetails .item.has-screenshot .contact {
          position: absolute;
          text-align: center;
          width: 100%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #fff;
          text-shadow: 1px 1px 1px #000;
          text-stroke: 1px #000;
          -webkit-text-stroke: 1px #000;
          pointer-events: none;
          font-size: 16px;
        }
       .UaaDetails .item.has-screenshot:hover .contact {
          display: none;
        }

        .UaaDetails .item.other {
          display: inline-block;
          border: none;
          width: inherit;
          margin: 0;
          padding: 2px 4px;
          line-height: normal;
          min-height: inherit;
          text-align: left;
        }
          
          .UaaDetails .item.is-speaking {
            text-decoration: underline;
          }
          .UaaDetails .item.has-screenshot.is-speaking {
            outline: none;
            transition: transform 0.2s ease;
            transform: scale(1.2);
            z-index: 1000;
          }
          .UaaDetails .item .contact {
            display: inline;
            padding: 2px 4px;
            width: auto;
            font-size: 12px;
            text-stroke: 0;
            color: inherit; /*#ccc;*/
            outline-offset: -2px;
          }

        .UaaDetails .item.other.clickable {
          display: inline-block;
          padding: 2px 4px;
          margin: 0 4px;
        }
        .UaaDetails .item.other.clickable .contact {
          display: inline-block;
          color: #ffc;
        }
        .UaaDetails .item.other.clickable .contact::after {
          content: attr(title);
          color: #ccc;
          font-weight: normal;
          margin: 0 4px;
        }


      .UaaDetails .screenshot {
        display: block;
        width: 128px;
        margin: 0;
        vertical-align: middle;
        cursor: pointer;
      }

      .screenshots[data-screenshot-count="1"] .screenshot {
        width: 192px;
      }

      .zenzaScreenMode_sideView .is-notFullscreen .UaaDetails {
        color: #000;
      }
      :host-context(.zenzaScreenMode_sideView .is-notFullscreen) .UaaDetails {
        color: #000;
      }

    </style>
    <details class="root UaaDetails">
      <summary class="uaaSummary clickable">提供</summary>
      <div class="UaaDetailBody"></div>
    </details>
  `).trim();

UaaView.__tpl__ = ('<div class="uaaView"></div>').trim();

UaaView.__css__ = (`
    uaaView {
      display: none;
    }
    uaaView.is-Exist {
     display: block;
    }
  `).trim();


class RelatedInfoMenu extends BaseViewComponent {
  constructor({parentNode, isHeader}) {
    super({
      parentNode,
      name: 'RelatedInfoMenu',
      template: '<div class="RelatedInfoMenu" tabindex="-1"></div>',
      shadow: RelatedInfoMenu._shadow_,
      css: RelatedInfoMenu.__css__
    });

    this._state = {};

    this._bound.update = this.update.bind(this);
    this._bound._onBodyClick = _.debounce(this._onBodyClick.bind(this), 0);
    this.setState({isHeader});

  }

  _initDom(...args) {
    super._initDom(...args);

    this._view.classList.toggle('is-Edge', /edge/i.test(navigator.userAgent));
    const shadow = this._shadow || this._view;
    this._elm.body = shadow.querySelector('.RelatedInfoMenuBody');
    this._elm.summary = shadow.querySelector('summary');
    shadow.addEventListener('click', e => {
      e.stopPropagation();
    });
    this._elm.summary.addEventListener('click', _.debounce(() => {
      if (shadow.open) {
        document.body.addEventListener('mouseup', this._bound._onBodyClick, {once: true});
        this.emit('open');
      }
    }, 100));

    this._ginzaLink = shadow.querySelector('.ginzaLink');
    this._originalLink = shadow.querySelector('.originalLink');
    this._twitterLink = shadow.querySelector('.twitterHashLink');
    this._parentVideoLink = shadow.querySelector('.parentVideoLink');
  }

  _onBodyClick() {
    const shadow = this._shadow || this._view;
    shadow.open = false;
    document.body.removeEventListener('mouseup', this._bound._onBodyClick);
    this.emit('close');
  }

  update(videoInfo) {
    const shadow = this._shadow || this._view;
    shadow.open = false;

    this._currentWatchId = videoInfo.watchId;
    this._currentVideoId = videoInfo.videoId;
    this.setState({
      isParentVideoExist: videoInfo.hasParentVideo,
      isCommunity: videoInfo.isCommunityVideo,
      isMymemory: videoInfo.isMymemory
    });

    const vid = this._currentVideoId;
    const wid = this._currentWatchId;
    this._ginzaLink.setAttribute('href', `//www.nicovideo.jp/watch/${wid}`);
    this._originalLink.setAttribute('href', `//www.nicovideo.jp/watch/${vid}`);
    this._twitterLink.setAttribute('href', `https://twitter.com/hashtag/${vid}`);
    this._parentVideoLink.setAttribute('href', `//commons.nicovideo.jp/tree/${vid}`);
    this.emit('close');
  }

  _onCommand(command, param) {
    let url;
    const shadow = this._shadow || this._view;
    shadow.open = false;

    switch (command) {
      case 'watch-ginza':
        window.open(this._ginzaLink.href, 'watchGinza');
        super._onCommand('pause');
        break;
      case 'open-uad':
        url = `//nicoad.nicovideo.jp/video/publish/${this._currentWatchId}?frontend_id=6&frontend_version=0&zenza_watch`;
        window.open(url, '', 'width=428, height=600, toolbar=no, scrollbars=1');
        break;
      case 'open-twitter-hash':
        window.open(this._twitterLink.href);
        break;
      case 'open-parent-video':
        window.open(this._parentVideoLink.href);
        break;
      case 'copy-video-watch-url':
        super._onCommand(command, param);
        super._onCommand('notify', 'コピーしました');
        break;
      case 'open-original-video':
        super._onCommand('openNow', this._currentVideoId);
        break;
      default:
        super._onCommand(command, param);
    }
    this.emit('close');
  }


}

RelatedInfoMenu._css_ = ('').trim();

RelatedInfoMenu._shadow_ = (`
    <style>
      .RelatedInfoMenu,
      .RelatedInfoMenu * {
        box-sizing: border-box;
        user-select: none;
      }

      .RelatedInfoMenu {
        display: inline-block;
        padding: 8px;
        font-size: 16px;
        cursor: pointer;
      }

      .RelatedInfoMenu summary {
        display: inline-block;
        background: transparent;
        color: #333;
        padding: 4px 8px;
        border-radius: 4px;
        outline: none;
        border: 1px solid #ccc;
      }

      .RelatedInfoMenu ul {
        list-style-type: none;
        padding-left: 32px;
      }

      .RelatedInfoMenu li {
        padding: 4px;
      }

      .RelatedInfoMenu li > .command {
        display: inline-block;
        text-decoration: none;
        color: #ccc;
      }

      .RelatedInfoMenu li > .command:hover {
        text-decoration: underline;
      }

      .RelatedInfoMenu li > .command:hover::before {
        content: '▷';
        position: absolute;
        transform: translate(-100%, 0);
      }


        .RelatedInfoMenu .originalLinkMenu,
        .RelatedInfoMenu .parentVideoMenu {
          display: none;
        }

        .RelatedInfoMenu.is-Community        .originalLinkMenu,
        .RelatedInfoMenu.is-Mymemory         .originalLinkMenu,
        .RelatedInfoMenu.is-ParentVideoExist .parentVideoMenu {
          display: block;
        }


      .zenzaScreenMode_sideView .is-fullscreen .RelatedInfoMenu summary{
        background: #888;
      }

      :host-context(.zenzaScreenMode_sideView .is-fullscreen) .RelatedInfoMenu summary {
        background: #888;
      }

      /* :host-contextで分けたいけどFirefox対応のため */
      .RelatedInfoMenu.is-Header {
        font-size: 13px;
        padding: 0 8px;
      }
      .RelatedInfoMenu.is-Header summary {
        background: #666;
        color: #ccc;
        padding: 0 8px;
        border: none;
      }
      .RelatedInfoMenu.is-Header[open] {
        background: rgba(80, 80, 80, 0.9);
      }
      .RelatedInfoMenu.is-Header ul {
        font-size: 16px;
        line-height: 20px;
      }

      :host-context(.zenzaWatchVideoInfoPanel) .RelatedInfoMenu li > .command {
        color: #222;
      }

      .zenzaWatchVideoInfoPanel .RelatedInfoMenu li > .command {
        color: #222;
      }

        /* for Edge */
        .is-Edge .RelatedInfoMenuBody {
          display: none;
          color: #ccc;
          background: rgba(80, 80, 80, 0.9);
        }
        .RelatedInfoMenu[open] .RelatedInfoMenuBody,
        .RelatedInfoMenu:focus .RelatedInfoMenuBody,
        .RelatedInfoMenuBody:hover {
          display: block;
        }
    </style>
    <details class="root RelatedInfoMenu">
      <summary class="RelatedInfoMenuSummary clickable">関連メニュー</summary>
      <div class="RelatedInfoMenuBody">
        <ul>
          <li class="ginzaMenu">
            <a class="ginzaLink command"
              rel="noopener" data-command="watch-ginza">公式プレイヤーで開く</a>
          </li>
          <li class="uadMenu">
            <span class="uadLink command"
              rel="noopener" data-command="open-uad">ニコニ広告で宣伝</span>
          </li>
          <li class="twitterHashMenu">
            <a class="twitterHashLink command"
              rel="noopener" data-command="open-twitter-hash">twitterの反応を見る</a>
          </li>
          <li class="originalLinkMenu">
            <a class="originalLink command"
              rel="noopener" data-command="open-original-video">元動画を開く</a>
          </li>
          <li class="parentVideoMenu">
            <a class="parentVideoLink command"
              rel="noopener" data-command="open-parent-video">親作品・コンテンツツリー</a>
          </li>
          <li class="copyVideoWatchUrlMenu">
            <span class="copyVideoWatchUrlLink command"
              rel="noopener" data-command="copy-video-watch-url">動画URLをコピー</span>
          </li>
        </ul>
      </div>
    </details>
  `).trim();

class VideoMetaInfo extends BaseViewComponent {
  constructor({parentNode}) {
    super({
      parentNode,
      name: 'VideoMetaInfo',
      template: '<div class="VideoMetaInfo"></div>',
      shadow: VideoMetaInfo._shadow_,
      css: VideoMetaInfo.__css__
    });

    this._state = {};

    this._bound.update = this.update.bind(this);
  }

  _initDom(...args) {
    super._initDom(...args);

    const shadow = this._shadow || this._view;
    this._elm = Object.assign({}, this._elm, {
      postedAt: shadow.querySelector('.postedAt'),
      body: shadow.querySelector('.videoMetaInfo'),
      viewCount: shadow.querySelector('.viewCount'),
      commentCount: shadow.querySelector('.commentCount'),
      mylistCount: shadow.querySelector('.mylistCount')
    });
  }

  update(videoInfo) {
    this._elm.postedAt.textContent = videoInfo.postedAt;
    const count = videoInfo.count;
    this.updateVideoCount(count);
  }

  updateVideoCount({comment, view, mylist}) {
    let addComma = m => {
      return m.toLocaleString ? m.toLocaleString() : m;
    };
    if (typeof comment === 'number') {
      this._elm.commentCount.textContent = addComma(comment);
    }
    if (typeof view === 'number') {
      this._elm.viewCount.textContent = addComma(view);
    }
    if (typeof mylist === 'number') {
      this._elm.mylistCount.textContent = addComma(mylist);
    }
  }
}

VideoMetaInfo._css_ = ('').trim();

VideoMetaInfo._shadow_ = (`
    <style>
      .VideoMetaInfo .postedAtOuter {
        display: inline-block;
        margin-right: 24px;
      }
      .VideoMetaInfo .postedAt {
        font-weight: bold
      }

      .VideoMetaInfo .countOuter {
        white-space: nowrap;
      }

      .VideoMetaInfo .countOuter .column {
        display: inline-block;
        white-space: nowrap;
      }

      .VideoMetaInfo .count {
        font-weight: bolder;
      }

      .userVideo .channelVideo,
      .channelVideo .userVideo
      {
        display: none !important;
      }

      :host-context(.userVideo) .channelVideo,
      :host-context(.channelVideo) .userVideo
      {
        display: none !important;
      }

    </style>
    <div class="VideoMetaInfo root">
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
    </div>
  `);

//===END===

export {
  VideoInfoPanel,
  VideoHeaderPanel,
  VideoSearchForm,
  IchibaItemView,
  UaaView,
  RelatedInfoMenu,
  VideoMetaInfo
};
