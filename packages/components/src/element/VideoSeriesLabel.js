import {BaseCommandElement} from './BaseCommandElement.js';
// import {util} from '../util/util.js';
// console.info('BaseCommandElement', BaseCommandElement);
const dll = {};
//===BEGIN===


const {VideoSeriesProps, VideoSeriesLabel} = (() => {
  const ITEM_HEIGHT = 100;
  const THUMBNAIL_WIDTH = 120;
  const DEFAULT_THUMBNAIL = 'https://nicovideo.cdn.nimg.jp/web/img/series/no_thumbnail.png';

  const VideoSeriesProps = {
    id: 0,
    title: '',
    thumbnailUrl: DEFAULT_THUMBNAIL,
    createdAt: '',
    updatedAt: ''
  };

  const VideoSeriesAttributes = Object.keys(VideoSeriesProps).map(prop => BaseCommandElement.toAttributeName(prop));

  class VideoSeriesLabel extends BaseCommandElement {
    static get propTypes() {
      return VideoSeriesProps;
    }

    static get defaultProps() {
      return VideoSeriesProps;
    }

    static get observedAttributes() {
      return VideoSeriesAttributes;
    }

    static async getTemplate(state = {}, props = {}, events = {}) {
      const {html} = dll.list || await this.importLit();
      if (!props.id) {
        return html``;
      }

      const title = props.title || `series/${props.id}`;
      const url = `https://www.nicovideo.jp/series/${props.id}`;
      const thumbnail = props.thumbnailUrl? props.thumbnailUrl : DEFAULT_THUMBNAIL;

      return html`
    <div id="root" @click=${events.onClick}>
    <style>
      * {
        box-sizing: border-box;
      }

      #root {
        box-sizing: border-box;
        user-select: none;
        cursor: pointer;
        color: #ccc;
      }

      .seriesInfo {
        position: relative;
        display: grid;
        width: 100%;
        height: ${ITEM_HEIGHT}px;
        overflow: hidden;
        grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
        contain: layout size;
        padding: 8px;
        border: 1px;
        transition: transform 0.2s, box-shadow 0.2s;
        background-color: #666;
        border-radius: 4px;
      }

      #root .seriesInfo {
        transform: translate(0, -4px);
        box-shadow: 0 4px 0 #333;
      }

      #root:active .seriesInfo {
        transition: none;
        transform: none;
        box-shadow: none;
        color: #fff;
        text-shadow: 0 0 6px #fff;
      }

      .thumbnailContainer {
        position: relative;
        background-color: black;
        height: ${ITEM_HEIGHT - 8}px;
      }

      .thumbnail {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: sepia(100%);
      }
      #root:hover .thumbnail {
        filter: none;
      }

      .info {
        height: 100%;
        padding: 4px 8px;
        display: flex;
      }

      .info p {
        font-size: 12px;
        margin: 0;
      }

      .title {
        line-height: 20px;
        overflow: hidden;
        word-break: break-all;
      }

      .seriesLink {
        font-size: 14px;
        color: var(--list-video-link-color, #ff9);
        transition: background 0.4s ease, color 0.4s ease;
      }

      .seriesLink:hover {
        text-decoration: underline;
      }

      .seriesLink:visited {
        color: var(--list-video-link-visited-color, #ffd);
      }
      .seriesLink:active {
        color: var(--list-video-link-active-color, #fff);
        transition: none;
      }

      .playButton {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(1.5);
        width: 32px;
        height: 24px;
        border-radius: 8px;
        text-align: center;
        background: rgba(0, 0, 0, 0.8);
        box-shadow: 0 0 4px #ccc;
        transition: transform 0.2s ease, box-shadow 0.2s, text-shadow 0.2s, font-size 0.2s;
        font-size: 22px;
        line-height: 25px;
      }

      #root:hover .playButton {
        transform: translate(-50%, -50%) scale(2.0);
      }
      #root:active .playButton {
        transform: translate(-50%, -50%) scale(3.0, 1.2);
      }

      </style>
      <div class="seriesInfo" data-command="playlistSetSeries" data-param="${props.id}" title="このシリーズを見る">
        <div class="thumbnailContainer">
          <img src="${thumbnail}" class="thumbnail" loading="lazy">
          <div class="playButton">▶</div>
        </div>
        <div class="info">
          <div class="title">
            <p>動画シリーズ</p>
            <a class="seriesLink" href="${url}" data-command="open-window" data-param="${url}">${title}</a>
          </div>
        </div>
      </div>
   </div>`;
    }

    onCommand(e) {
      if (e.detail.command === 'open-window') {
        window.open(e.detail.param);
      }
    }

  }

  if (window.customElements) {
    customElements.get('zenza-video-series-label') || window.customElements.define('zenza-video-series-label', VideoSeriesLabel);
  }


  return {
    VideoSeriesProps, VideoSeriesLabel
  };
})();


//===END===

export {VideoSeriesProps, VideoSeriesLabel};