import { BaseCommandElement } from './BaseCommandElement.js';
import {textUtil} from '../../../lib/src/text/textUtil';
// import {util} from '../util/util.js';
// console.info('BaseCommandElement', BaseCommandElement);
const dll = {};
//===BEGIN===



const {VideoItemElement, VideoItemProps} = (() => {
  const ITEM_HEIGHT = 100;
  const THUMBNAIL_WIDTH = 96;
  const THUMBNAIL_HEIGHT = 72;
  const BLANK_THUMBNAIL = 'https://nicovideo.cdn.nimg.jp/web/img/series/no_thumbnail.png';

  const VideoItemProps = {
    watchId: '',
    videoId: '',
    threadId: '',
    title: '',
    duration: 0,
    commentCount: 0,
    mylistCount: 0,
    viewCount: 0,
    thumbnail: BLANK_THUMBNAIL,
    postedAt: '',

    description: '',
    mylistComment: '',
    isChannel: false,
    isMymemory: false,
    ownerId: 0,
    ownerName: '',

    thumbInfo: {},
    hasInview: false,
    lazyload: false
  };
  const VideoItemAttributes = Object.keys(VideoItemProps).map(prop => BaseCommandElement.toAttributeName(prop));

  class VideoItemElement extends BaseCommandElement {

    static get propTypes() {
      return VideoItemProps;
    }

    static get defaultProps() {
      return VideoItemProps;
    }

    static get observedAttributes() {
      return VideoItemAttributes;
    }

    static get defaultState() {
      return {
        isActive: false,
        isPlayed: false
      };
    }

    static async getTemplate(state = {}, props = {}, events = {}) {
      const {html} = dll.list || await this.importLit();

      const watchId = props.watchId;
      const watchUrl = `https://www.nicovideo.jp/watch/${props.watchId}`;
      const title = props.title ? html`<span title="${props.title}">${props.title}<span>` : props.watchId;
      const duration = props.duration ? html`<span class="duration">${textUtil.secToTime(props.duration)}</span>` : '';
      const postedAt = props.postedAt ? `${textUtil.dateToString(new Date(props.postedAt))}` : '';
      const thumbnail = props.lazyload ? BLANK_THUMBNAIL : props.thumbnail;
      const counter =  (props.viewCount || props.commentCount || props.mylistCount) ? html`
        <div class="counter">
          <span class="count">再生: <span class="value viewCount">${props.viewCount}</span></span>
          <span class="count">コメ: <span class="value commentCount">${props.commentCount}</span></span>
          <span class="count">マイ: <span class="value mylistCount">${props.mylistCount}</span></span>
        </div>
        ` : '';
        const classes = [];
        props.isChannel && classes.push('is-channel');

      return html`
    <div id="root" @click=${events.onClick} class="${classes.join(' ')}">
    <style>
      * {
        box-sizing: border-box;
      }

      #root {
        background-color: var(--list-bg-color, #666);
        box-sizing: border-box;
        user-select: none;
      }

      .videoItem {
        position: relative;
        display: grid;
        width: 100%;
        height: ${ITEM_HEIGHT}px;
        overflow: hidden;
        grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
        grid-template-rows: ${THUMBNAIL_HEIGHT}px 1fr;
        padding: 2px;
        contain: layout size;
      }

      .thumbnailContainer {
        position: relative;
        /*transform: translate(0, 2px);*/
        margin: 0;
        background-color: black;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .thumbnail {
        position: absolute;
        top: 0;
        left: 0;
        width: 96px;
        height: 72px;
        object-fit: contain;
      }

      .thumbnailContainer a {
        display: inline-block;
        width:  96px;
        height: 72px;
        transition: box-shaow 0.4s ease, transform 0.4s ease;
      }

      .thumbnailContainer a:active {
        box-shadow: 0 0 8px #f99;
        transform: translate(0, 4px);
        transition: none;
      }

      .thumbnailContainer .playlistAppend,
      .playlistRemove,
      .thumbnailContainer .deflistAdd,
      .thumbnailContainer .pocket-info {
        position: absolute;
        display: none;
        color: #fff;
        background: #666;
        width: 24px;
        height: 20px;
        line-height: 18px;
        font-size: 14px;
        box-sizing: border-box;
        text-align: center;
        font-weight: bolder;

        cursor: pointer;
      }
      .thumbnailContainer .playlistAppend {
        left: 0;
        bottom: 0;
      }
      .playlistRemove {
        right: 8px;
        top: 0;
      }
      .thumbnailContainer .deflistAdd {
        right: 0;
        bottom: 0;
      }
      .thumbnailContainer .pocket-info {
        display: none !important;
        right: 24px;
        bottom: 0;
      }
      :host-context(.is-pocketReady) .videoItem:hover .pocket-info {
        display: inline-block !important;
      }

      .videoItem:hover .thumbnailContainer .playlistAppend,
      .videoItem:hover .thumbnailContainer .deflistAdd,
      .videoItem:hover .thumbnailContainer .pocket-info {
        display: inline-block;
        border: 1px outset;
      }

      .videoItem:hover .thumbnailContainer .playlistAppend:hover,
      .videoItem:hover .thumbnailContainer .deflistAdd:hover,
      .videoItem:hover .thumbnailContainer .pocket-info:hover {
        transform: scale(1.5);
        box-shadow: 2px 2px 2px #000;
      }

      .videoItem:hover .thumbnailContainer .playlistAppend:active,
      .videoItem:hover .thumbnailContainer .deflistAdd:active,
      .videoItem:hover .thumbnailContainer .pocket-info:active {
        transform: scale(1.3);
        border: 1px inset;
        transition: none;
      }

      .videoItem.is-updating .thumbnailContainer .deflistAdd {
        transform: scale(1.0) !important;
        border: 1px inset !important;
        pointer-events: none;
      }

      .thumbnailContainer .duration {
        position: absolute;
        right: 0;
        bottom: 0;
        background: #000;
        font-size: 12px;
        color: #fff;
      }

      .videoItem:hover .thumbnailContainer .duration {
        display: none;
      }

      .videoInfo {
        height: 100%;
        padding-left: 4px;
      }

      .postedAt {
        font-size: 12px;
        color: var(--list-text-color, #ccc);
      }
      .is-played .postedAt::after {
        content: ' ●';
        font-size: 10px;
      }

      .counter {
        position: absolute;
        top: 80px;
        width: 100%;
        text-align: center;
      }

      .title {
        line-height: 20px;
        height: 40px;
        overflow: hidden;
      }
      .is-channel .title::before {
        content: '[CH]';
        display: inline;
        font-size: 12px;
        background: #888;
        color: #ccc;
        padding: 0 2px;
        margin: 0;
      }

      .videoLink {
        font-size: 14px;
        color: var(--list-video-link-color, #ff9);
        transition: background 0.4s ease, color 0.4s ease;
      }
      .videoLink:visited {
        color: var(--list-video-link-visited-color, #ffd);
      }
      .videoLink:active {
        color: var(--list-video-link-active-color, #fff);
        transition: none;
      }

      .noVideoCounter .counter {
        display: none;
      }
      .counter {
        font-size: 12px;
        color: var(--list-text-color, #ccc);
      }
      .counter .value {
        font-weight: bolder;
      }
      .counter .count {
        white-space: nowrap;
      }
      .counter .count + .count {
        margin-left: 8px;
      }


      </style>
      <div class="videoItem">
        <span class="playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
        <div class="thumbnailContainer">
          <a class="command" data-command="open" data-param="${watchId}" href="${watchUrl}">
            <img src="${thumbnail}" class="thumbnail" loading="lazy">
            ${duration}
          </a>
          <span class="playlistAppend" data-command="playlistAppend" data-param="${watchId}" title="プレイリストに追加">▶</span>
          <span class="deflistAdd"  data-command="deflistAdd" data-param="${watchId}" title="とりあえずマイリスト">&#x271A;</span>
          <span class="pocket-info" data-command="pocket-info" data-param="${watchId}" title="動画情報">？</span>
        </div>
        <div class="videoInfo">
          <div class="postedAt">${postedAt}</div>
          <div class="title">
            <a class="videoLink" data-command="open" data-param="${watchId}" href="${watchUrl}">${title}</a>
          </div>
        </div>
        ${counter}
     </div>
   </div>`;
    }

    _applyThumbInfo(thumbInfo) {
      const data = thumbInfo.data || thumbInfo; // legacy 互換のため
      const thumbnail = this.props.thumbnail.match(/smile\?i=/) ?
        this.props.thumbnail : data.thumbnail;
      const isChannel = data.v.startsWith('so') || data.owner.type === 'channel';
      const watchId = isChannel ? data.id : data.v;
      Object.assign(this.dataset, {
        watchId,
        videoId: data.id,
        title: data.title,
        duration: data.duration,
        commentCount: data.commentCount,
        mylistCount: data.mylistCount,
        viewCount: data.viewCount,
        thumbnail,
        postedAt: data.postedAt,
        ownerId: data.owner.id,
        ownerName: data.owner.name,
        ownerIcon: data.owner.icon,
        owerUrl: data.owner.url,
        isChannel
      });
      this.dispatchEvent(new CustomEvent('thumb-info', {detail: {props: this.props}, bubbles: true, composed: true}));
    }

    attributeChangedCallback(attr, oldValue, newValue) {
      if (attr === 'data-lazyload') {
        this.props.lazyload = newValue !== 'false';
        return this.requestRender(true);
      }
      if (attr !== 'data-thumb-info') {
        return super.attributeChangedCallback(attr, oldValue, newValue);
      }
      const info = JSON.parse(newValue);
      if (!info || info.status !== 'ok') {
        return;
      }
      this._applyThumbInfo(info);
    }
  }

  return {VideoItemElement, VideoItemProps};
})();


//===END===

export { VideoItemElement, VideoItemProps };
