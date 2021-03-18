import {textUtil} from '../../../lib/src/text/textUtil';
import {dll} from '../../../components/src/dll';
//===BEGIN===
// なんか汎用性を持たせようとして失敗してる奴
class VideoListItemView  {
  static get ITEM_HEIGHT() { return 100; }
  static get THUMBNAIL_WIDTH() { return 96; }
  static get THUMBNAIL_HEIGHT() { return 72; }
  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  static get CSS() { return `
  * {
    box-sizing: border-box;
  }

  .videoItem {
    position: relative;
    display: grid;
    width: 100%;
    height: 100%;
    overflow: hidden;
    grid-template-columns: ${this.THUMBNAIL_WIDTH}px 1fr;
    grid-template-rows: ${this.THUMBNAIL_HEIGHT}px 1fr;
    padding: 2px;
    transition:
      box-shadow 0.4s ease;
    contain: layout size paint;
    /*content-visibility: auto;*/
  }

  .is-updating .videoItem {
    transition: none !important;
  }

  .playlist .videoItem {
    cursor: move;
  }

  .playlist .videoItem.is-inview::before {
    content: attr(data-index);
    /*counter-increment: itemIndex;*/
    position: absolute;
    right: 8px;
    top: 80%;
    color: #666;
    font-family: Impact;
    font-size: 45px;
    pointer-events: none;
    z-index: 1;
    line-height: ${this.ITEM_HEIGHT}px;
    opacity: 0.6;

    transform: translate(0, -50%);
  }

  .videoItem.is-updating {
    opacity: 0.3;
    cursor: wait;
  }
  .videoItem.is-updating * {
    pointer-events: none;
  }

  .videoItem.is-dragging {
    pointer-events: none;
    box-shadow: 8px 8px 4px #000;
    background: #666;
    opacity: 0.8;
    transform: translate(var(--trans-x-pp), var(--trans-y-pp));
    transition:
      box-shadow 0.4s ease;
    z-index: 10000;
  }

  .videoItem.is-dropped {
    display: none;
  }

  .is-dragging * {
    cursor: move;
  }

  .is-dragging .videoItem.is-dragover {
    outline: 5px dashed #99f;
  }

  .is-dragging .videoItem.is-dragover * {
    opacity: 0.3;
  }

  .videoItem + .videoItem {
    border-top: 1px dotted var(--item-border-color);
    margin-top: 4px;
    outline-offset: -8px;
  }

  .videoItem.is-ng-rejected {
    display: none;
  }
  .videoItem.is-fav-favorited .postedAt::after {
    content: ' ★';
    color: #fea;
    text-shadow: 2px 2px 2px #000;
  }

  .thumbnailContainer {
    position: relative;
    transform: translate(0, 2px);
    margin: 0;
    /*background-color: black;*/
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }

  .thumbnailContainer a {
    display: inline-block;
    width:  100%;
    height: 100%;
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

    color: #fff;
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
  .is-pocketReady .videoItem:hover .pocket-info {
    display: inline-block !important;
  }

  .playlist .playlistAppend {
    display: none !important;
  }
  .playlistRemove {
    display: none;
  }
  .playlist .videoItem:not(.is-active):hover .playlistRemove {
    display: inline-block;
  }


  .playlist .videoItem:not(.is-active):hover .playlistRemove,
  .videoItem:hover .thumbnailContainer .playlistAppend,
  .videoItem:hover .thumbnailContainer .deflistAdd,
  .videoItem:hover .thumbnailContainer .pocket-info {
    display: inline-block;
    border: 1px outset;
  }

  .playlist .videoItem:not(.is-active):hover .playlistRemove:hover,
  .videoItem:hover .thumbnailContainer .playlistAppend:hover,
  .videoItem:hover .thumbnailContainer .deflistAdd:hover,
  .videoItem:hover .thumbnailContainer .pocket-info:hover {
    transform: scale(1.5);
    box-shadow: 2px 2px 2px #000;
  }

  .playlist .videoItem:not(.is-active):hover .playlistRemove:active,
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
    color: #ccc;
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
    height: 52px;
    overflow: hidden;
  }

  .videoLink {
    font-size: 14px;
    color: #ff9;
    transition: background 0.4s ease, color 0.4s ease;
  }
  .videoLink:visited {
    color: #ffd;
  }
  .videoLink:active {
    color: #fff;
    background: #663;
    transition: none;
  }


  .noVideoCounter .counter {
    display: none;
  }
  .counter {
    font-size: 12px;
    color: #ccc;
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

  .videoItem.is-active {
    border: none !important;
    background: #776;
  }

  @media screen and (min-width: 600px)
  {
    #listContainerInner {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }

    .videoItem {
      margin: 4px 8px 0;
      border-top: none !important;
      border-bottom: 1px dotted var(--item-border-color);
    }
  }
  `;
  }
  static build(item, index = 0) {
    const {html} = dll.lit;
    const {classMap} = dll.directives;

    const addComma = m => isNaN(m) ? '---' : (m.toLocaleString ? m.toLocaleString() : m);
    const {cache, timestamp, index: _index} = this.map.get(item) || {};
    if (cache && timestamp === item.timestamp && index === _index) {
      return cache;
    }
    const title = item.title;
    const count = item.count;
    const itemId = item.itemId;
    const watchId = item.watchId;
    const watchUrl = `https://www.nicovideo.jp/watch/${watchId}`;
    const cmap = ({
      'videoItem': true,
      [`watch${watchId}`]: true,
      [`item${itemId}`]: true,
      [item.isLazy     ? 'is-lazy-load' : 'is-inview'] : true,
      'is-active':        item.isActive,
      'is-updating':      item.isUpdating,
      'is-played':        item.isPlayed,
      'is-dragging':      item.isDragging,
      'is-dragover':      item.isDragover,
      'is-drropped':      item.isDropped,
      'is-favorite':      item.isFavorite,
      'is-not-resolved': !item.isPocketResolved
    });
    // const className = `videoItem watch${watchId} item${itemId}`;
    const thumbnailStyle = `background-image: url(${item.thumbnail})`;

    const result = html`
      <div class=${classMap(cmap)} data-index=${index + 1} data-item-id=${itemId} data-watch-id=${watchId}>
        ${item.isLazy ? '' : html`
          <span class="command playlistRemove" data-command="playlistRemove" data-param=${watchId} title="プレイリストから削除">×</span>
          <div class="thumbnailContainer" style=${thumbnailStyle} data-watch-id=${watchId} data-src=${item.thumbnail}>
            <a class="command" href=${watchUrl} data-command="select" data-param=${itemId}>
              <span class="duration">${textUtil.secToTime(item.duration)}</span>
            </a>
            <span class="command playlistAppend" data-command="playlistAppend" data-param=${watchId} title="プレイリストに追加">▶</span>
            <span class="command deflistAdd"  data-command="deflistAdd" data-param=${watchId} title="とりあえずマイリスト">&#x271A;</span>
            <span class="command pocket-info" data-command="pocket-info" data-param=${watchId} title="動画情報">？</span>
          </div>
          <div class="videoInfo">
            <div class="postedAt">${item.postedAt}</div>
            <div class="title">
              <a class="command videoLink"
                href=${watchUrl} data-command="select" data-param=${itemId} title=${title}>${title}</a>
            </div>
          </div>
          <div class="counter">
            <span class="count">再生: <span class="value viewCount">${addComma(count.view)}</span></span>
            <span class="count">コメ: <span class="value commentCount">${addComma(count.comment)}</span></span>
            <span class="count">マイ: <span class="value mylistCount">${addComma(count.mylist)}</span></span>
          </div>
        `}
      </div>`;
      this.map.set(item, {cache: result, timestamp: item.timestamp, index});
      return result;
  }
}
VideoListItemView.map = new WeakMap;



//===END===

export {VideoListItemView};