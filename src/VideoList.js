import {ZenzaWatch} from './ZenzaWatchIndex';
import {util, FrameLayer} from './util';
import {CONSTANT} from './constant';
import {NicoSearchApiV2Loader} from './loader/VideoSearch';
import {Emitter} from './baselib';

const MylistPocketDetector = {
  detect: () => { return Promise.resolve(); }
};

//===BEGIN===

class VideoListModel extends Emitter {
  constructor(params) {
    super();
    this._boundSet = new WeakSet();
    this.initialize(params);
  }

  initialize(params) {
    this._isUniq = params.uniq;
    this._items = [];
    this._maxItems = params.maxItems || 100;

    this._boundOnItemUpdate = this._onItemUpdate.bind(this);
  }
  setItem(itemList) {
    itemList = Array.isArray(itemList) ? itemList : [itemList];

    this._items = itemList;
    if (this._isUniq) {
      this._items =
        _.uniq(this._items, false, item => {
          return item.uniqId;
        });
    }

    this.emit('update', this._items, true);
  }

  clear() {
    this.setItem([]);
  }

  insertItem(itemList, index) {
    //window.console.log('insertItem', itemList, index);
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    if (itemList.length < 1) {
      return;
    }
    index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));

    Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));

    if (this._isUniq) {
      itemList.forEach(i => this.removeSameWatchId(i));
    }

    this._items.splice(this._maxItems);
    this.emit('update', this._items);

    return this.indexOf(itemList[0]);
  }

  appendItem(itemList) {
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    if (itemList.length < 1) {
      return;
    }

    this._items = this._items.concat(itemList);

    if (this._isUniq) {
      itemList.forEach(i => this.removeSameWatchId(i));
    }

    while (this._items.length > this._maxItems) {
      this._items.shift();
    }
    this.emit('update', this._items);

    return this._items.length - 1;
  }

  removeItemByIndex(index) {
    const item = this._getItemByIndex(index);
    if (!item) {
      return;
    }
    this._items = this._items.filter(i => {
      return i !== item;
    });
  }

  removePlayedItem() {
    const beforeLen = this._items.length;
    this._items = this._items.filter(item => {
      return item.isActive || !item.isPlayed;
    });
    const afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('update', this._items);
    }
  }

  resetPlayedItemFlag() {
    this._items.forEach(item => {
      if (item.isPlayed) {
        item.isPlayed = false;
      }
    });
    this.onUpdate();
  }

  removeNonActiveItem() {
    const beforeLen = this._items.length;
    this._items = this._items.filter(item => {
      return item.isActive;
    });
    const afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('update', this._items);
    }
  }

  shuffle() {
    this._items = _.shuffle(this._items);
    this.emit('update', this._items);
  }

  _getItemByIndex(index) {
    return this._items[index];
  }

  indexOf(item) {
    if (!item || !item.itemId) { return -1; }
    return this._items.findIndex(i => i.itemId === item.itemId);
  }

  getItemByIndex(index) {
    const item = this._getItemByIndex(index);
    if (!item) {
      return null;
    }
    if (!this._boundSet.has(item)) {
      this._boundSet.add(item);
      item.on('update', this._boundOnItemUpdate);
    }
    return item;
  }

  findByItemId(itemId) {
    itemId = parseInt(itemId, 10);
    const item = this._items.find(item => {
      return item.itemId === itemId;
    });
    if (item && !this._boundSet.has(item)) {
      this._boundSet.add(item);
      item.on('update', this._boundOnItemUpdate);
    }
    return item;
  }

  findByWatchId(watchId) {
    watchId = watchId + '';
    const item = this._items.find(item => {
      return item.watchId === watchId;
    });
    if (item && !this._boundSet.has(item)) {
      this._boundSet.add(item);
      item.on('update', this._boundOnItemUpdate);
    }
    return item;
  }

  removeItem(item) {
    const beforeLen = this._items.length;
    _.pull(this._items, item);
    item.off('update', this._boundOnItemUpdate);
    this._boundSet.delete(item);
    const afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('item-remove', item);
    }
  }

  /**
   * パラメータで指定されたitemと同じwatchIdのitemを削除
   */
  removeSameWatchId(item) {
    const watchId = item.watchId;
    const uniqId = item.uniqId;
    const beforeLen = this._items.length;
    _.remove(this._items, i => {
      return item !== i && (i.watchId === watchId || i.uniqId === uniqId);
    });
    const afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('update', this._items);
    }
  }

  uniq(item) {
    this._items.forEach((i) => {
      if (i === item) {
        return;
      }
      this.removeSameWatchId(i);
    });
  }

  _onItemUpdate(item, key, value) {
    this.emit('item-update', item, key, value);
  }

  serialize() {
    return this._items.map(item => item.serialize());
  }

  unserialize(itemDataList) {
    const items = [];
    itemDataList.forEach(itemData => {
      items.push(new VideoListItem(itemData));
    });
    this.setItem(items);
  }

  sortBy(key, isDesc) {
    const table = {
      watchId: 'watchId',
      duration: 'getDuration',
      title: 'getSortTitle',
      comment: 'getCommentCount',
      mylist: 'getMylistCount',
      view: 'getViewCount',
      postedAt: 'getPostedAt',
    };
    const func = table[key];
    if (!func) {
      return;
    }
    this._items = _.sortBy(this._items, item => {
      return typeof item[func] === 'function' ? item[func](): item[func];
    });
    if (isDesc) {
      this._items.reverse();
    }
    this.onUpdate();
  }

  onUpdate() {
    this.emitAsync('update', this._items);
  }

  get length() {
    return this._items.length;
  }

  get activeIndex() {
    return this._items.findIndex(i => i.isActive);
  }

  get totalDuration() {
    let total = 0;
    this._items.forEach(item => {
      total += item.getDuration();
    });
    return total;
  }
}

// なんか汎用性を持たせようとして失敗してる奴
const VideoListItemView = (() => {

  const ITEM_HEIGHT = 100;
  const THUMBNAIL_WIDTH = 96;
  const THUMBNAIL_HEIGHT = 72;

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  const CSS = (`
      * {
        box-sizing: border-box;
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
        transition:
          transform 0.4s ease, box-shadow 0.4s ease;
        contain: layout size;
      }

      .playlist .videoItem {
        cursor: move;
      }

      .playlist .videoItem::before {
        content: counter(itemIndex);
        counter-increment: itemIndex;
        position: absolute;
        right: 8px;
        top: 80%;
        color: #666;
        font-family: Impact;
        font-size: 45px;
        pointer-events: none;
        z-index: 1;
        line-height: ${ITEM_HEIGHT}px;
        opacity: 0.6;

        transform: translate(0, -50%);
      }

      .videoItem.is-updating {
        opacity: 0.5;
        cursor: wait;
      }

      .videoItem.dragging {
        pointer-events: none;
        box-shadow: 8px 8px 4px #000;
        background: #666;
        opacity: 0.8;
        transition:
          box-shadow 0.4s ease;
        z-index: 10000;
      }

      .dragging * {
        cursor: move;
      }

      .dragging .videoItem.dragover {
        outline: 5px dashed #99f;
      }

      .dragging .videoItem.dragover * {
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
        background-color: black;
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

    `).trim();

  const TPL = (`
      <div class="videoItem">
        <span class="command playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
        <div class="thumbnailContainer">
          <a class="command" data-command="select">
            <span class="duration"></span>
          </a>
          <span class="command playlistAppend" data-command="playlistAppend" title="プレイリストに追加">▶</span>
          <span class="command deflistAdd"  data-command="deflistAdd"  title="とりあえずマイリスト">&#x271A;</span>
          <span class="command pocket-info" data-command="pocket-info"  title="動画情報">？</span>
        </div>
        <div class="videoInfo">
          <div class="postedAt"></div>
          <div class="title">
            <a class="command videoLink" data-command="select"></a>
          </div>
        </div>
        <div class="counter">
          <span class="count">再生: <span class="value viewCount"></span></span>
          <span class="count">コメ: <span class="value commentCount"></span></span>
          <span class="count">マイ: <span class="value mylistCount"></span></span>
        </div>
     </div>
    `).trim();

  let counter = 0;
  let template;

  class VideoListItemView {
    static get template() {
      if (!template) {
        const t = document.createElement('template');
        t.id = `VideoListItemView-template${Date.now()}`;
        t.innerHTML = TPL;
        document.body.appendChild(t);
        const tc = t.content;
        template = {
          t,
          clone: () => {
            return document.importNode(t.content, true).firstChild;
          },
          videoItem: tc.querySelector('.videoItem'),
          duration: tc.querySelector('.duration'),
          thumbnail: tc.querySelector('.thumbnailContainer'),
          thumbnailLink: tc.querySelector('.thumbnailContainer>a'),
          videoLink: tc.querySelector('.videoLink'),
          postedAt: tc.querySelector('.postedAt'),
          viewCount: tc.querySelector('.viewCount'),
          commentCount: tc.querySelector('.commentCount'),
          mylistCount: tc.querySelector('.mylistCount'),
          playlistAppend: tc.querySelector('.playlistAppend'),
          playlistRemove: tc.querySelector('.playlistRemove'),
          deflistAdd: tc.querySelector('.deflistAdd'),
          pocketInfo: tc.querySelector('.pocket-info')
        };
      }
      return template;
    }

    constructor(item) {
      this.initialize(item);
    }

    initialize(item) {
      this._item = item.item;
      this._isLazy = typeof item.enableLazyLoadImage === 'boolean' ?
        item.enableLazyLoadImage : false;
      this._id = counter++;
    }

    build() {
      const template = this.constructor.template;
      const {videoItem, duration, thumbnail, thumbnailLink, videoLink, postedAt, viewCount, commentCount, mylistCount, playlistAppend, playlistRemove, deflistAdd, pocketInfo} = template;
      const item = this._item;
      const title = item.title;
      const count = item.count;
      const itemId = item.itemId;
      const watchId = item.watchId;
      const watchUrl = `//www.nicovideo.jp/watch/${watchId}`;

      videoItem.className = `videoItem watch${watchId} item${itemId} ${item.isActive ? 'is-active' : ''} ${item.isUpdating ? 'is-updating' : ''} ${item.isPlayed ? 'is-played' : ''}`;
      videoItem.setAttribute('data-item-id', itemId);
      videoItem.setAttribute('data-watch-id', watchId);

      thumbnail.classList.toggle('lazy-load', this._isLazy);
      thumbnail.setAttribute('data-watch-id', watchId);
      if (this._isLazy) {
        thumbnail.style.backgroundColor = '#666';
        thumbnail.style.backgroundImage = 'none';
      } else {
        thumbnail.style.backgroundImage = `url(${item.thumbnail})`;
      }
      thumbnail.setAttribute('data-src', item.thumbnail);


      thumbnailLink.setAttribute('href', watchUrl);
      thumbnailLink.setAttribute('data-param', itemId);
      videoLink.setAttribute('href', watchUrl);
      videoLink.setAttribute('data-param', itemId);
      videoLink.setAttribute('title', title);
      videoLink.textContent = title;

      duration.textContent = util.secToTime(item.getDuration());
      postedAt.textContent = item.getPostedAt();

      viewCount.textContent = this._addComma(count.view);
      commentCount.textContent = this._addComma(count.comment);
      mylistCount.textContent = this._addComma(count.mylist);

      playlistAppend.setAttribute('data-param', watchId);
      playlistRemove.setAttribute('data-param', watchId);
      deflistAdd.setAttribute('data-param', watchId);
      pocketInfo.setAttribute('data-param', watchId);

      this._view = template.clone();
    }

    rebuild(item) {
      this._isLazy = false;
      this._item = item;
      const lastView = this._view;
      if (!lastView) {
        return this.build();
      }
      this.build();
      if (lastView.parentNode) {
        lastView.parentNode.replaceChild(this.getViewElement(), lastView);
      }
    }

    get watchId() {
      return this._item.watchId;
    }

    getViewElement() {
      if (!this._view) {
        this.build();
      }
      return this._view;
    }

    remove() {
      if (!this._view) {
        return;
      }
      this._view.remove();
    }

    toString() {
      return this.getView().outerHTML;
    }

    _addComma(m) {
      if (isNaN(m)) {
        return '---';
      }
      return m.toLocaleString ? m.toLocaleString() : util.escapeHtml(m);
    }

    addClass(className) {
      this.toggleClass(className, true);
    }

    removeClass(className) {
      this.toggleClass(className, false);
    }

    toggleClass(className, v) {
      if (!this._view) {
        this.build();
      }
      this._view.classList.toggle(className, v);
    }
  }

  VideoListItemView.CSS = CSS;
  VideoListItemView.TPL = TPL;
  return VideoListItemView;
})();


/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
class VideoListView extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }

  get hasFocus() {
    return this._hasFocus;
  }
}
VideoListView.__css__ = '';

VideoListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">

  ${CONSTANT.BASE_CSS_VARS}
  ${CONSTANT.SCROLLBAR_CSS}

  body {
    user-select: none;
    background: #333;
    overflow: hidden;
  }

  .drag-over>* {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .is-updating #listContainer {
    pointer-events: none;
    opacity: 0.5;
    transition: none;
  }
  
  #listContainer {
    position: absolute;
    top: 0;
    left:0;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow-x: hidden;
    overflow-y: scroll;
    overscroll-behavior: contain;
    transition: 0.2s opacity;
    counter-reset: itemIndex;
    will-change: transform;
  }
  
  .playlist #listContainerInner {
    margin-bottom: calc(100vh - 100px);
  }
  
  .is-scrolling #listContainerInner {
    pointer-events: none;
    animation-play-state: paused !important;
  }

  .scrollToTop, .scrollToActive {
    position: fixed;
    width: 32px;
    height: 32px;
    right: 48px;
    bottom: 8px;
    font-size: 24px;
    line-height: 32px;
    text-align: center;
    z-index: 100;
    background: #ccc;
    color: #000;
    border-radius: 100%;
    cursor: pointer;
    opacity: 0.3;
    transition: opacity 0.4s ease;
  }
  
  .scrollToActive {
    --progress: calc(var(--active-index) / var(--list-length) * 100%);
    display: none;
    top: var(--progress);
    border-radius: 0;
    bottom: auto;
    right: 0;
    transform: translateY(calc(var(--progress) * -1));
    background: none;
    opacity: 0.5;
    color: #f99;
  }
  .playlist .scrollToActive {
    display: block;
  }
  .playlist .scrollToActive:hover {
    background: #ccc;
  }

  .scrollToTop:hover {
    opacity: 0.9;
    box-shadow: 0 0 8px #fff;
  }

</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
<div id="listContainer">
  <div id="listContainerInner"></div>
</div>
<div class="scrollToActive command" title="いまここ" data-command="scrollToActiveItem">&#9658;</div>

<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>

  `).trim();

_.assign(VideoListView.prototype, {
  initialize: function (params) {
    this._ItemView = params.itemView || VideoListItemView;
    this._itemCss = params.itemCss || VideoListItemView.CSS;
    this._className = params.className || 'videoList';
    this._container = params.container;

    this._retryGetIframeCount = 0;

    this._itemViewCache = new WeakMap();
    this._maxItems = params.max || 100;
    this._dragdrop = typeof params.dragdrop === 'boolean' ? params.dragdrop : false;
    this._dropfile = typeof params.dropfile === 'boolean' ? params.dropfile : false;
    this._enablePocketWatch = params.enablePocketWatch;
    this._hasFocus = false;

    this._model = params.model;
    if (this._model) {
      this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 100));
      this._model.on('item-update', this._onModelItemUpdate.bind(this));
      this._model.on('item-remove', this._onModelItemRemove.bind(this));
    }

    this._enableLazyLoadImage = window.IntersectionObserver ? true : false;

    this._initializeView(params);
  },
  _initializeView: function (params) {
    let html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
    this._frame = new FrameLayer({
      container: params.container,
      html: html,
      className: 'videoListFrame'
    });
    this._frame.on('load', this._onIframeLoad.bind(this));
  },
  _onIframeLoad: function (w) {
    const doc = this._document = w.document;
    const $body = this._$body = $(doc.body);
    if (this._className) {
      doc.body.classList.add(this._className);
    }

    const container = this._container = doc.querySelector('#listContainer');
    const list = this._list = doc.getElementById('listContainerInner');
    if (this._documentFragment instanceof Node) {
      list.appendChild(this._documentFragment);
      this._setInviewObserver();
      this._documentFragment = null;
    }
    doc.body.addEventListener('click', this._onClick.bind(this));
    doc.body.addEventListener('keydown', e => ZenzaWatch.emitter.emit('keydown', e));
    doc.body.addEventListener('keyup', e => ZenzaWatch.emitter.emit('keyup', e));
    w.addEventListener('focus', () => this._hasFocus = true);
    w.addEventListener('blur', () => this._hasFocus = false);
    this._updateCSSVars();

    if (this._dragdrop) {
      doc.body.addEventListener('mousedown', this._onBodyMouseDown.bind(this), {passive: true});
    }

    const onScroll = () => {
     if (!container.classList.contains('is-scrolling')) {
       container.classList.add('is-scrolling');
     }
     onScrollEnd();
    };
    const onScrollEnd = _.debounce(() => {
     if (container.classList.contains('is-scrolling')) {
       container.classList.remove('is-scrolling');
     }
    }, 500);
    container.addEventListener('scroll', onScroll, {passive: true});

    if (this._dropfile) {
      $body
        .on('dragover', this._onBodyDragOverFile.bind(this))
        .on('dragenter', this._onBodyDragEnterFile.bind(this))
        .on('dragleave', this._onBodyDragLeaveFile.bind(this))
        .on('drop', this._onBodyDropFile.bind(this));
    }

    MylistPocketDetector.detect().then(pocket => {
      this._pocket = pocket;
      $body.addClass('is-pocketReady');
      if (pocket.external.observe && this._enablePocketWatch) {
        pocket.external.observe({
          query: 'a.videoLink',
          container,
          closest: '.videoItem'
        });
      }
    });
  },
  _onBodyMouseDown: function (e) {
    let $item = $(e.target).closest('.videoItem');
    if ($item.length < 1) {
      return;
    }
    if ($(e.target).closest('.command').length > 0) {
      return;
    }
    this._$dragging = $item;
    this._dragOffset = {
      x: e.pageX,
      y: e.pageY,
      st: this.scrollTop()
    };
    this._$dragTarget = null;
    this._$body.find('.dragover').removeClass('dragover');
    this._bindDragStartEvents();
  },
  _bindDragStartEvents: function () {
    this._$body
      .on('mousemove.drag', this._onBodyMouseMove.bind(this))
      .on('mouseup.drag', this._onBodyMouseUp.bind(this))
      .on('blur.drag', this._onBodyBlur.bind(this))
      .on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
  },
  _unbindDragStartEvents: function () {
    this._$body
      .off('mousemove.drag')
      .off('mouseup.drag')
      .off('blur.drag')
      .off('mouseleave.drag');
  },
  _onBodyMouseMove: function (e) {
    if (!this._$dragging) {
      return;
    }
    let x = e.pageX - this._dragOffset.x;
    let y = e.pageY - this._dragOffset.y + (this.scrollTop() - this._dragOffset.st);
    let translate = `translate(${x}px, ${y}px)`;

    if (x * x + y * y < 100) {
      return;
    }

    this._$body.addClass('dragging');
    this._$dragging
      .addClass('dragging')
      .css('transform', translate);

    this._$body.find('.dragover').removeClass('dragover');
    let $target = $(e.target).closest('.videoItem');
    if ($target.length < 1) {
      return;
    }
    this._$dragTarget = $target.addClass('dragover');
  },
  _onBodyMouseUp: function (e) {
    this._unbindDragStartEvents();

    let $dragging = this._$dragging;
    this._endBodyMouseDragging();
    if (!$dragging) {
      return;
    }

    let $target = $(e.target).closest('.videoItem');
    if ($target.length < 1) {
      $target = this._$dragTarget;
    }
    if (!$target || $target.length < 1) {
      return;
    }
    let srcId = $dragging.attr('data-item-id'), destId = $target.attr('data-item-id');
    if (srcId === destId) {
      return;
    }

    $dragging.css('opacity', 0);
    $target.css('opacity', 0);
    this.emit('moveItem', srcId, destId);
  },
  _onBodyBlur: function () {
    this._endBodyMouseDragging();
  },
  _onBodyMouseLeave: function () {
    this._endBodyMouseDragging();
  },
  _endBodyMouseDragging: function () {
    this._unbindDragStartEvents();
    this._$body.removeClass('dragging');

    this._$dragTarget = null;
    this._$body.find('.dragover').removeClass('dragover');
    if (this._$dragging) {
      this._$dragging.removeClass('dragging').css('transform', '');
    }
    this._$dragging = null;
  },
  _onBodyDragOverFile: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this._$body.addClass('drag-over');
  },
  _onBodyDragEnterFile: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this._$body.addClass('drag-over');
  },
  _onBodyDragLeaveFile: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this._$body.removeClass('drag-over');
  },
  _onBodyDropFile: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this._$body.removeClass('drag-over');

    let file = e.originalEvent.dataTransfer.files[0];
    if (!/\.playlist\.json$/.test(file.name)) {
      return;
    }

    let fileReader = new FileReader();
    fileReader.onload = ev => {
      window.console.log('file data: ', ev.target.result);
      this.emit('filedrop', ev.target.result, file.name);
    };

    fileReader.readAsText(file);
  },
  _onModelUpdate: function (itemList, replaceAll) {
    const timeLabel = `update playlistView  replaceAll=${!!replaceAll}`;
    window.console.time(timeLabel);
    this.addClass('is-updating');
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    const itemViews = [];

    itemList.forEach(item => {
      let id = item.getItemId();
      if (this._itemViewCache.has(id)) {
        itemViews.push(this._itemViewCache.get(item));
      } else {
        const isLazy = this._enableLazyLoadImage;
        const itemView = new this._ItemView({item, enableLazyLoadImage: isLazy});
        this._itemViewCache.set(item, itemView);
        itemViews.push(itemView);
      }
    });
    this._updateCSSVars();

    this._itemViews = itemViews;
    if (itemViews.length < 1) {
      this.removeClass('is-updating');
      window.console.timeEnd(timeLabel);
      return;
    }

    window.setTimeout(() => {
      const f = document.createDocumentFragment();
      f.append(...itemViews.map(i => i.getViewElement()));

      if (this._list) {
        this._list.textContent = '';
        this._list.appendChild(f);
        this._documentFragment = null;
        this._setInviewObserver();
      } else {
        this._documentFragment = f;
      }

      this.removeClass('is-updating');
      this.emit('update');
    }, 0);
    window.console.timeEnd(timeLabel);
  },
  _onModelItemRemove: function (item) {
    const itemView = this._itemViewCache.get(item);
    if (!itemView) {
      return;
    }
    this._updateCSSVars();
    itemView.remove();
    this._itemViewCache.delete(item);
  },
  _setInviewObserver: function () {
    if (!this._enableLazyLoadImage || !this._document) {
      return;
    }
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }
    let images = [...this._document.querySelectorAll('.lazy-load')];
    if (!images.length) { return; }
    let onInview = this._onImageInview_bind || this._onImageInview.bind(this);
    let observer = this._intersectionObserver = new window.IntersectionObserver(onInview);
    images.forEach(img => observer.observe(img));
  },
  _onImageInview: function (entries) {
    const observer = this._intersectionObserver;
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      const thumbnail = entry.target;
      const src = thumbnail.dataset.src;
      thumbnail.classList.remove('lazy-load');
      observer.unobserve(thumbnail);

      if (!src) {
        return;
      }
      thumbnail.style.backgroundImage = `url(${src})`;
      thumbnail.style.backgroundColor = 'transparent';
    });
  },
  _onModelItemUpdate: function (item, key, value) {
    if (!this._$body) {
      return;
    }
    const itemId = item.getItemId();

    const itemView = this._itemViewCache.get(item);

    if (!itemView) {
      const newItemView = new this._ItemView({item});
      this._itemViewCache.set(item, newItemView);
      const itemViewElement = this._document.querySelector(`.videoItem.item${itemId}`);
      this._list.insertBefore(
        newItemView.getViewElement(), itemViewElement);
      if (itemViewElement) {
        this._document.body.removeChild(itemViewElement);
      }
      return;
    }

    if (['active', 'updating', 'played'].includes(key)) {
      itemView.toggleClass(`is-${key}`, value);
      if (key === 'active' && value) {
        this._updateCSSVars();
        if (!this._hasFocus) {
          this.scrollToItem(itemId);
        }
      }
    } else {
      itemView.rebuild(item);
    }
  },
  _updateCSSVars: function() {
    if (this._document) {
      let body = this._document.body;
      body.style.setProperty('--list-length', this._model.length);
      body.style.setProperty('--active-index', this._model.activeIndex);
    }
  },
  _onClick: function (e) {
    e.stopPropagation();
    ZenzaWatch.emitter.emitAsync('hideHover');
    let $target = $(e.target).closest('.command');
    let $item = $(e.target).closest('.videoItem');
    if ($target.length) {
      e.stopPropagation();
      e.preventDefault();
      let command = $target.attr('data-command');
      let param = $target.attr('data-param');
      let itemId = $item.attr('data-item-id');
      switch (command) {
        case 'deflistAdd':
          this.emit('deflistAdd', param, itemId);
          break;
        case 'playlistAppend':
          this.emit('playlistAppend', param, itemId);
          break;
        case 'pocket-info':
          window.setTimeout(() => {
            this._pocket.external.info(param);
          }, 100);
          break;
        case 'scrollToTop':
          this.scrollTop(0, 300);
          break;
        case 'playlistRemove':
          $item.remove();
          this.emit('command', command, param, itemId);
          break;
        default:
          this.emit('command', command, param, itemId);
      }
    }
  },
  addClass: function (className) {
    this.toggleClass(className, true);
  },
  removeClass: function (className) {
    this.toggleClass(className, false);
  },
  toggleClass: function (className, v) {
    if (!this._$body) {
      return;
    }
    this._$body.toggleClass(className, v);
  },
  scrollTop: function (v) {
    if (!this._container) {
      return 0;
    }
    if (typeof v === 'number') {
      this._container.scrollTop = v;
    } else {
      return this._container.scrollTop;
    }
  },
  scrollToItem: function (itemId) {
    if (!this._$body) {
      return;
    }
    if (_.isFunction(itemId.getItemId)) {
      itemId = itemId.getItemId();
    }
    let $target = this._$body.find(`.item${itemId}`);
    if (!$target.length) {
      return;
    }
    $target[0].scrollIntoView({block: 'start', behavior: 'instant'});
  }
});


class VideoListItem extends Emitter {
  static createByThumbInfo(info) {
    return new this({
      _format: 'thumbInfo',
      id: info.id,
      title: info.title,
      length_seconds: info.duration,
      num_res: info.commentCount,
      mylist_counter: info.mylistCount,
      view_counter: info.viewCount,
      thumbnail_url: info.thumbnail,
      first_retrieve: info.postedAt,

      tags: info.tagList,
      movieType: info.movieType,
      owner: info.owner,
      lastResBody: info.lastResBody
    });
  }

  static createBlankInfo(id) {
    let postedAt = '0000/00/00 00:00:00';
    if (!isNaN(id)) {
      postedAt = util.dateToString(new Date(id * 1000));
    }
    return new this({
      _format: 'blank',
      id: id,
      title: id + '(動画情報不明)',
      length_seconds: 0,
      num_res: 0,
      mylist_counter: 0,
      view_counter: 0,
      thumbnail_url: 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank_s.jpg',
      first_retrieve: postedAt,
    });
  }

  static createByMylistItem(item) {
    if (item.item_data) {
      const item_data = item.item_data || {};
      return new VideoListItem({
        _format: 'mylistItemOldApi',
        id: item_data.watch_id,
        uniq_id: item_data.watch_id,
        title: item_data.title,
        length_seconds: item_data.length_seconds,
        num_res: item_data.num_res,
        mylist_counter: item_data.mylist_counter,
        view_counter: item_data.view_counter,
        thumbnail_url: item_data.thumbnail_url,
        first_retrieve: util.dateToString(new Date(item_data.first_retrieve * 1000)),

        videoId: item_data.video_id,
        lastResBody: item_data.last_res_body,
        mylistItemId: item.item_id,
        item_type: item.item_type
      });
    }

    // APIレスポンスの統一されてなさよ・・・
    if (!item.length_seconds && typeof item.length === 'string') {
      const [min, sec] = item.length.split(':');
      item.length_seconds = min * 60 + sec * 1;
    }
    return new VideoListItem({
      _format: 'mylistItemRiapi',
      id: item.id,
      uniq_id: item.id,
      title: item.title,
      length_seconds: item.length_seconds,
      num_res: item.num_res,
      mylist_counter: item.mylist_counter,
      view_counter: item.view_counter,
      thumbnail_url: item.thumbnail_url,
      first_retrieve: item.first_retrieve,
      lastResBody: item.last_res_body
    });
  }

  static createByVideoInfoModel(info) {
    const count = info.count;
    return new VideoListItem({
      _format: 'videoInfo',
      id: info.watchId,
      uniq_id: info.contextWatchId,
      title: info.title,
      length_seconds: info.duration,
      num_res: count.comment,
      mylist_counter: count.mylist,
      view_counter: count.view,
      thumbnail_url: info.thumbnail,
      first_retrieve: info.postedAt,
      owner: info.owner
    });
  }

  constructor(rawData) {
    super();
    this._rawData = rawData;
    this._itemId = VideoListItem._itemId++;
    this.state = {
      isActive: false,
      lastActivated: rawData.last_activated || 0,
      isUpdating: false,
      isPlayed: !!rawData.played
    };
    this._uniq_id = rawData.uniqId || this.watchId;
    rawData.first_retrieve = util.dateToString(rawData.first_retrieve);

    this._sortTitle = util.convertKansuEi(this.getTitle())
      .replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
  }

  get uniqId() {
    return this._uniq_id;
  }

  get itemId() {
    return this._itemId;
  }

  get watchId() {
    return (this._getData('id', '') || '').toString();
  }

  get title() {
    return this._getData('title', '');
  }

  get sortTitle() {
    return this._sortTitle;
  }

  get duration() {
    return parseInt(this._getData('length_seconds', '0'), 10);
  }

  get count() {
    return {
      comment: parseInt(this._rawData.num_res, 10),
      mylist: parseInt(this._rawData.mylist_counter, 10),
      view: parseInt(this._rawData.view_counter, 10)
    };
  }
  get thumbnail() {
    return this._rawData.thumbnail_url;
  }

  get postedAt() {
    return this._rawData.first_retrieve;
  }

  equals(item) {
    return this.uniqId === item.uniqId;
  }

  _getData(key, defValue) {
    return this._rawData.hasOwnProperty(key) ?
      this._rawData[key] : defValue;
  }

  getItemId() {
    return this.itemId;
  }
  getWatchId() {
    return this.watchId;
  }
  getTitle() {
    return this.title;
  }
  getSortTitle() {
    return this.sortTitle;
  }
  getDuration() {
    return this.duration;
  }
  getCount() {
    return this.count;
  }
  getCommentCount() {
    return this.count.comment;
  }
  getMylistCount() {
    return this.count.mylist;
  }
  getViewCount() {
    return this.count.view;
  }
  getPostedAt() {
    return this.postedAt;
  }
  get isActive() {
    return this.state.isActive;
  }
  set isActive(v) {
    v = !!v;
    if (this.isActive !== v) {
      this.state.isActive = v;
      if (v) {
        this.state.lastActivated = Date.now();
      }
      this.emit('update', this, 'active', v);
    }
  }
  get isUpdating() {
    return this.state.isUpdating;
  }
  set isUpdating(v) {
    v = !!v;
    if (this.isUpdating !== v) {
      this.state.isUpdating = v;
      this.emit('update', this, 'updating', v);
    }
  }
  get isPlayed() {
    return this.state.isPlayed;
  }
  set isPlayed(v) {
    v = !!v;
    if (this.isPlayed !== v) {
      this.state.isPlayed = v;
      this.emit('update', this, 'played', v);
    }
  }
  get isBlankData() {
    return this._rawData._format === 'blank';
  }
  serialize() {
    return {
      active: this.isActive,
      last_activated: this.state.lastActivated || 0,
      played: this.isPlayed,
      uniq_id: this._uniq_id,
      id: this._rawData.id,
      title: this._rawData.title,
      length_seconds: this._rawData.length_seconds,
      num_res: this._rawData.num_res,
      mylist_counter: this._rawData.mylist_counter,
      view_counter: this._rawData.view_counter,
      thumbnail_url: this._rawData.thumbnail_url,
      first_retrieve: this._rawData.first_retrieve,
    };
  }
  updateByVideoInfo(videoInfo) {
    const before = JSON.stringify(this.serialize());
    const rawData = this._rawData;
    const count = videoInfo.count;
    rawData.first_retrieve = util.dateToString(videoInfo.postedAt);

    rawData.num_res = count.comment;
    rawData.mylist_counter = count.mylist;
    rawData.view_counter = count.view;

    rawData.thumbnail_url = videoInfo.thumbnail;

    if (JSON.stringify(this.serialize()) !== before) {
      this.emit('update', this);
    }
  }
}
VideoListItem._itemId = 0;

class VideoList extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
}
_.assign(VideoList.prototype, {
  initialize: function (params) {
    this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
    this._container = params.container;

    this._model = new VideoListModel({
      uniq: true,
      maxItem: 100
    });

    this._initializeView();
  },
  _initializeView: function () {
    if (this._view) {
      return;
    }
    this._view = new VideoListView({
      container: this._container,
      model: this._model,
      enablePocketWatch: true
    });

    this._view.on('command', this._onCommand.bind(this));
    this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
    this._view.on('playlistAppend', this._onPlaylistAppend.bind(this));
  },
  update: function (listData, watchId) {
    if (!this._view) {
      this._initializeView();
    }
    this._watchId = watchId;
    const items = listData.filter(itemData => itemData.has_data)
      .map(itemData => new VideoListItem(itemData));
    if (items.length < 1) {
      return;
    }
    this._view.insertItem(items);
  },
  _onCommand: function (command, param) {
    if (command === 'select') {
      const item = this._model.findByItemId(param);
      const watchId = item.watchId;
      this.emit('command', 'open', watchId);
      return;
    }
    this.emit('command', command, param);
  },
  _onPlaylistAppend: function (watchId, itemId) {
    this.emit('command', 'playlistAppend', watchId);
    if (this._isUpdatingPlaylist) {
      return;
    }
    let item = this._model.findByItemId(itemId);

    const unlock = () => {
      item.isUpdating = false;
      this._isUpdatingPlaylist = false;
    };

    item.isUpdating = true;
    this._isUpdatingPlaylist = true;

    window.setTimeout(unlock, 1000);
  },
  _onDeflistAdd: function (watchId, itemId) {
    if (this._isUpdatingDeflist) {
      return;
    }

    let item = this._model.findByItemId(itemId);

    const unlock = () => {
      item.isUpdating = false;
      this._isUpdatingDeflist = false;
    };

    item.isUpdating = true;
    this._isUpdatingDeflist = true;

    window.setTimeout(unlock, 1000);

    this.emit('command', 'deflistAdd', watchId);
  }
});

class RelatedVideoList extends VideoList {
  constructor(...args) {
    super(...args);
  }

  update(listData, watchId) {
    if (!this._view) {
      this._initializeView();
    }
    this._watchId = watchId;
    let items = [];
    listData.forEach(itemData => {
      if (!itemData.id) {
        return;
      }
      items.push(new VideoListItem(itemData));
    });
    if (!items.length) {
      return;
    }
    this._model.insertItem(items);
    this._view.scrollTop(0);
  }
}


class PlaylistModel extends VideoListModel {
  constructor(params) {
    super(params);
  }

  initialize() {
    this._maxItems = 10000;
    this._items = [];
    this._isUniq = true;

    this._boundOnItemUpdate = this._onItemUpdate.bind(this);
  }
}

class PlaylistView extends Emitter {
  constructor(...args) {
    super(...args);
    this.initialize(...args);
  }
  initialize(params) {
    this._container = params.container;
    this._model = params.model;
    this._playlist = params.playlist;

    util.addStyle(PlaylistView.__css__);
    let $view = this._$view = $(PlaylistView.__tpl__);
    this._container.appendChild($view[0]);

    this._$index = $view.find('.playlist-index');
    this._$length = $view.find('.playlist-length');
    let $menu = this._$menu = this._$view.find('.playlist-menu');
    let $fileDrop = this._$fileDrop = $view.find('.playlist-file-drop');
    let $fileSelect = $view.find('.playlist-import-file-select');

    ZenzaWatch.debug.playlistView = this._$view;

    let listView = this._listView = new VideoListView({
      container: this._$view.find('.playlist-frame')[0],
      model: this._model,
      className: 'playlist',
      dragdrop: true,
      dropfile: true,
      enablePocketWatch: false
    });
    listView.on('command', this._onCommand.bind(this));
    listView.on('deflistAdd', this._onDeflistAdd.bind(this));
    listView.on('moveItem', (src, dest) => this.emit('moveItem', src, dest));
    listView.on('filedrop', data => this.emit('command', 'importFile', data));

    this._playlist.on('update',
      _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));

    this._$view.on('click', '.playlist-command', this._onPlaylistCommandClick.bind(this));
    ZenzaWatch.emitter.on('hideHover', () => {
      $menu.removeClass('show');
      $fileDrop.removeClass('show');
    });
    $('.zenzaVideoPlayerDialog')
      .on('dragover', this._onDragOverFile.bind(this))
      .on('dragenter', this._onDragEnterFile.bind(this))
      .on('dragleave', this._onDragLeaveFile.bind(this))
      .on('drop', this._onDropFile.bind(this));

    $fileSelect.on('change', this._onImportFileSelect.bind(this));

    ['addClass',
      'removeClass',
      'scrollTop',
      'scrollToItem',
    ].forEach(func => this[func] = listView[func].bind(listView));
  }
  toggleClass(className, v) {
    this._view.toggleClass(className, v);
    this._$view.toggleClass(className, v);
  }
  _onCommand(command, param, itemId) {
    switch (command) {
      default:
        this.emit('command', command, param, itemId);
        break;
    }
  }
  _onDeflistAdd(watchId, itemId) {
    this.emit('deflistAdd', watchId, itemId);
  }
  _onPlaylistCommandClick(e) {
    let $target = $(e.target).closest('.playlist-command');
    let command = $target.attr('data-command');
    let param = $target.attr('data-param');
    e.stopPropagation();
    if (!command) {
      return;
    }
    switch (command) {
      case 'importFileMenu':
        this._$menu.removeClass('show');
        this._$fileDrop.addClass('show');
        return;
      case 'toggleMenu':
        e.stopPropagation();
        e.preventDefault();
        this._$menu.addClass('show');
        return;
      case 'shuffle':
      case 'sortBy':
        this._$view.addClass('shuffle');
        window.setTimeout(() => this._$view.removeClass('shuffle'), 1000);
        this.emit('command', command, param);
        break;
      default:
        this.emit('command', command, param);
    }
    ZenzaWatch.emitter.emitAsync('hideHover');
  }
  _onPlaylistStatusUpdate() {
    let playlist = this._playlist;
    this._$view
      .toggleClass('enable', playlist.isEnable)
      .toggleClass('loop', playlist.isLoop)
    ;
    this._$index.text(playlist.getIndex() + 1);
    this._$length.text(playlist.length);
  }
  _onDragOverFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this._$fileDrop.addClass('drag-over');
  }
  _onDragEnterFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this._$fileDrop.addClass('drag-over');
  }
  _onDragLeaveFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this._$fileDrop.removeClass('drag-over');
  }
  _onDropFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this._$fileDrop.removeClass('show drag-over');

    let file = e.originalEvent.dataTransfer.files[0];
    if (!/\.playlist\.json$/.test(file.name)) {
      return;
    }

    let fileReader = new FileReader();
    fileReader.onload = ev => {
      window.console.log('file data: ', ev.target.result);
      this.emit('command', 'importFile', ev.target.result);
    };

    fileReader.readAsText(file);
  }
  _onImportFileSelect(e) {
    e.preventDefault();

    let file = e.originalEvent.target.files[0];
    if (!/\.playlist\.json$/.test(file.name)) {
      return;
    }

    let fileReader = new FileReader();
    fileReader.onload = ev => {
      window.console.log('file data: ', ev.target.result);
      this.emit('command', 'importFile', ev.target.result);
    };

    fileReader.readAsText(file);

  }

  get hasFocus() {
    return this._listView.hasFocus;
  }
}
PlaylistView.__css__ = (`

    .is-playlistEnable .tabSelect.playlist::after {
      content: '▶';
      color: #fff;
      text-shadow: 0 0 8px orange;
    }
    .zenzaScreenMode_sideView .is-playlistEnable .is-notFullscreen .tabSelect.playlist::after  {
      text-shadow: 0 0 8px #336;
    }

    .playlist-container {
      height: 100%;
      overflow: hidden;
      user-select: none;
    }

    .playlist-header {
      height: 32px;
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
      user-select: none;
    }

    .playlist-menu-button {
      display: inline-block;
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 0 0 4px;
      background: #666;
      font-size: 16px;
      line-height: 28px;
      white-space: nowrap;
    }
    .playlist-menu-button:hover {
      border: 1px outset;
    }
    .playlist-menu-button:active {
      border: 1px inset;
    }
    .playlist-menu-button .playlist-menu-icon {
      font-size: 24px;
      line-height: 28px;
    }

    .playlist-container.enable .toggleEnable,
    .playlist-container.loop   .toggleLoop {
      text-shadow: 0 0 6px #f99;
      color: #ff9;
    }
    .playlist-container .toggleLoop icon {
      font-family: STIXGeneral;
    }

    .playlist-container .shuffle {
      font-size: 14px;
    }
    .playlist-container .shuffle::after {
      content: '(´・ω・｀)';
    }
    .playlist-container .shuffle:hover::after {
      content: '(｀・ω・´)';
    }

    .playlist-frame {
      height: calc(100% - 32px);
      transition: opacity 0.3s;
    }
    .shuffle .playlist-frame {
      opacity: 0;
    }

    .playlist-count {
      position: absolute;
      top: 0;
      right: 8px;
      display: inline-block;
      font-size: 14px;
      line-height: 32px;
      cursor: pointer;
    }

    .playlist-count:before {
      content: '▼';
    }
    .playlist-count:hover {
      text-decoration: underline;
    }
    .playlist-menu {
      position: absolute;
      right: 0px;
      top: 24px;
      min-width: 150px;
      background: #333 !important;
    }

    .playlist-menu li {
      line-height: 20px;
      border: none !important;
    }

    .playlist-menu .separator {
      border: 1px inset;
      border-radius: 3px;
      margin: 8px 8px;
    }

    .playlist-file-drop {
      display: none;
      position: absolute;
      width: 94%;
      height: 94%;
      top: 3%;
      left: 3%;
      background: #000;
      color: #ccc;
      opacity: 0.8;
      border: 2px solid #ccc;
      box-shadow: 0 0 4px #fff;
      padding: 16px;
      z-index: 100;
    }

    .playlist-file-drop.show {
      opacity: 0.98 !important;
    }

    .playlist-file-drop.drag-over {
      box-shadow: 0 0 8px #fe9;
      background: #030;
    }

    .playlist-file-drop * {
      pointer-events: none;
    }

    .playlist-file-drop-inner {
      padding: 8px;
      height: 100%;
      border: 1px dotted #888;
    }

    .playlist-import-file-select {
      position: absolute;
      text-indent: -9999px;
      width: 100%;
      height: 20px;
      opacity: 0;
      cursor: pointer;
    }

  `).trim();
PlaylistView.__tpl__ = (`
    <div class="playlist-container">
      <div class="playlist-header">
        <label class="playlist-menu-button toggleEnable playlist-command"
          data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</label>
        <label class="playlist-menu-button toggleLoop playlist-command"
          data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</label>

        <div class="playlist-count playlist-command" data-command="toggleMenu">
          <span class="playlist-index">---</span> / <span class="playlist-length">---</span>
          <div class="zenzaPopupMenu playlist-menu">
            <div class="listInner">
            <ul>
              <li class="playlist-command" data-command="shuffle">
                シャッフル
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="postedAt">
                古い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="view:desc">
                再生の多い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="comment:desc">
                コメントの多い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="title">
                タイトル順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="duration:desc">
                動画の長い順に並べる
              </li>
              <li class="playlist-command" data-command="sortBy" data-param="duration">
                動画の短い順に並べる
              </li>

              <hr class="separator">
              <li class="playlist-command" data-command="exportFile">ファイルに保存 &#x1F4BE;</li>
              
              <li class="playlist-command" data-command="importFileMenu">
                <input type="file" class="playlist-import-file-select" accept=".json">
                ファイルから読み込む
              </li>

              <hr class="separator">
              <li class="playlist-command" data-command="resetPlayedItemFlag">すべて未視聴にする</li>
              <li class="playlist-command" data-command="removePlayedItem">視聴済み動画を消す ●</li>
              <li class="playlist-command" data-command="removeNonActiveItem">リストの消去 ×</li>

            </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="playlist-frame"></div>
      <div class="playlist-file-drop">
        <div class="playlist-file-drop-inner">
          ファイルをここにドロップ
        </div>
      </div>
    </div>
  `).trim();

_.assign(PlaylistView.prototype, {
});

const PlaylistSession = (storage => {
  const KEY = 'ZenzaWatchPlaylist';
  let lastJson = '';

  return {
    isExist: function () {
      let data = storage.getItem(KEY);
      if (!data) {
        return false;
      }
      try {
        JSON.parse(data);
        return true;
      } catch (e) {
        return false;
      }
    },
    save: function (data) {
      const json = JSON.stringify(data);
      if (lastJson === json) { return; }
      lastJson = json;
      try {
        storage.setItem(KEY, json);
      } catch(e) {
        window.console.error(e);
        if (e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          storage.clear();
          storage.setItem(KEY, json);
        }
      }
    },
    restore: function () {
      let data = storage.getItem(KEY);
      if (!data) {
        return null;
      }
      try {
        lastJson = data;
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
  };
})(sessionStorage);

class Playlist extends VideoList {
  constructor(...args) {
    super(...args);
  }
  initialize(params) {
    this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
    this._container = params.container;

    this._index = -1;
    this._isEnable = false;
    this._isLoop = params.loop;

    this._model = new PlaylistModel({});

    ZenzaWatch.debug.playlist = this;
    this.on('update', _.debounce(() => PlaylistSession.save(this.serialize()), 3000));
    ZenzaWatch.emitter.on('tabChange', tab => {
      if (tab === 'playlist') {
        this.scrollToActiveItem();
      }
    });
  }
  serialize() {
    return {
      items: this._model.serialize(),
      index: this._index,
      enable: this._isEnable,
      loop: this._isLoop
    };
  }
  unserialize(data) {
    if (!data) {
      return;
    }
    this._initializeView();
    console.log('unserialize: ', data);
    this._model.unserialize(data.items);
    this._isEnable = data.enable;
    this._isLoop = data.loop;
    this.emit('update');
    this.setIndex(data.index);
  }
  restoreFromSession() {
    this.unserialize(PlaylistSession.restore());
  }
  _initializeView() {
    if (this._view) {
      return;
    }
    this._view = new PlaylistView({
      container: this._container,
      model: this._model,
      playlist: this
    });
    this._view.on('command', this._onCommand.bind(this));
    this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
    this._view.on('moveItem', this._onMoveItem.bind(this));
  }
  _onCommand(command, param, itemId) {
    let item;
    switch (command) {
      case 'toggleEnable':
        this.toggleEnable();
        break;
      case 'toggleLoop':
        this.toggleLoop();
        break;
      case 'shuffle':
        this.shuffle();
        break;
      case 'sortBy': {
        let [key, order] = param.split(':');
        this.sortBy(key, order === 'desc');
        break;
      }
      case 'clear':
        this._setItemData([]);
        break;
      case 'select':
        item = this._model.findByItemId(itemId);
        this.setIndex(this._model.indexOf(item));
        this.emit('command', 'openNow', item.watchId);
        break;
      case 'playlistRemove':
        item = this._model.findByItemId(itemId);
        this._model.removeItem(item);
        this._refreshIndex();
        this.emit('update');
        break;
      case 'removePlayedItem':
        this.removePlayedItem();
        break;
      case 'resetPlayedItemFlag':
        this._model.resetPlayedItemFlag();
        break;
      case 'removeNonActiveItem':
        this.removeNonActiveItem();
        break;
      case 'exportFile':
        this._onExportFileCommand();
        break;
      case 'importFile':
        this._onImportFileCommand(param);
        break;
      case 'scrollToActiveItem':
        this.scrollToActiveItem(true);
        break;
      default:
        this.emit('command', command, param);
    }
  }
  _onExportFileCommand() {
    let dt = new Date();
    let title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます',
      util.dateToString(dt) + 'のプレイリスト');
    if (!title) {
      return;
    }

    let data = JSON.stringify(this.serialize(), null, 2);

    let blob = new Blob([data], {'type': 'text/html'});
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.setAttribute('download', title + '.playlist.json');
    a.setAttribute('rel', 'noopener');
    a.setAttribute('href', url);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }
  _onImportFileCommand(fileData) {
    if (!util.isValidJson(fileData)) {
      return;
    }

    this.emit('command', 'pause');
    this.emit('command', 'notify', 'プレイリストを復元');
    this.unserialize(JSON.parse(fileData));

    window.setTimeout(() => {
      let index = Math.max(0, fileData.index || 0);
      let item = this._model.getItemByIndex(index);
      if (item) {
        this.setIndex(index, true);
        this.emit('command', 'openNow', item.watchId);
      }
    }, 2000);
  }
  _onMoveItem(srcItemId, destItemId) {
    let srcItem = this._model.findByItemId(srcItemId);
    let destItem = this._model.findByItemId(destItemId);
    if (!srcItem || !destItem) {
      return;
    }
    let destIndex = this._model.indexOf(destItem);
    this._model.removeItem(srcItem);
    this._model.insertItem(srcItem, destIndex);
    this._refreshIndex();
  }
  _setItemData(listData) {
    const items = listData.map(itemData => new VideoListItem(itemData));
    this._model.setItem(items);
    this.setIndex(items.length > 0 ? 0 : -1);
  }
  _replaceAll(videoListItems, options) {
    options = options || {};
    this._model.setItem(videoListItems);
    const item = this._model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._activeItem = item;
      setTimeout(() => this._view.scrollToItem(item), 1000);
    }
    this.setIndex(this._model.indexOf(item));
  }
  _appendAll(videoListItems, options) {
    options = options || {};
    this._model.appendItem(videoListItems);
    const item = this._model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._refreshIndex(false);
    }
    setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
  }
  _insertAll(videoListItems, options) {
    options = options || {};

    this._model.insertItem(
      videoListItems, //.filter(item => item.watchId !== this._activeItem.watchId),
      this.getIndex() + 1);
    const item = this._model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._refreshIndex(false);
    }
    setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
  }
  loadFromMylist(mylistId, options) {
    this._initializeView();

    if (!this._mylistApiLoader) {
      this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
    }
    window.console.time('loadMylist: ' + mylistId);

    return this._mylistApiLoader
      .getMylistItems(mylistId, options).then(items => {
        window.console.timeEnd('loadMylist: ' + mylistId);
        let videoListItems = items.filter(item => {
          // マイリストはitem_typeがint
          // とりまいはitem_typeがstringっていうね
          if (item.id === null) {
            return;
          } // ごく稀にある？idが抹消されたレコード
          if (item.item_data) {
            if (parseInt(item.item_type, 10) !== 0) {
              return;
            } // not video
            if (parseInt(item.item_data.deleted, 10) !== 0) {
              return;
            } // 削除動画を除外
          } else {
            if (item.thumbnail_url && item.thumbnail_url.indexOf('video_deleted') >= 0) {
              return;
            }
          }
          return true;
        }).map(item => VideoListItem.createByMylistItem(item));

        if (videoListItems.length < 1) {
          return Promise.reject({
            status: 'fail',
            message: 'マイリストの取得に失敗しました'
          });
        }
        if (options.shuffle) {
          videoListItems = _.shuffle(videoListItems);
        }

        if (options.insert) {
          this._insertAll(videoListItems, options);
        } else if (options.append) {
          this._appendAll(videoListItems, options);
        } else {
          this._replaceAll(videoListItems, options);
        }

        this.emit('update');
        return Promise.resolve({
          status: 'ok',
          message:
            options.append ?
              'マイリストの内容をプレイリストに追加しました' :
              'マイリストの内容をプレイリストに読み込みしました'
        });
      });
  }
  loadUploadedVideo(userId, options) {
    this._initializeView();

    if (!this._uploadedVideoApiLoader) {
      this._uploadedVideoApiLoader = new ZenzaWatch.api.UploadedVideoApiLoader();
    }

    window.console.time('loadUploadedVideos' + userId);

    return this._uploadedVideoApiLoader
      .getUploadedVideos(userId, options).then(items => {
        window.console.timeEnd('loadUploadedVideos' + userId);
        let videoListItems = items.filter(item => {
          return (item.item_data &&
            parseInt(item.item_type, 10) === 0 && // video 以外を除外
            parseInt(item.item_data.deleted, 10) === 0) ||
            (item.thumbnail_url || '').indexOf('video_deleted') < 0;
        }).map(item => VideoListItem.createByMylistItem(item));

        if (videoListItems.length < 1) {
          return Promise.reject({});
        }

        // 投稿動画一覧は新しい順に渡されるので、プレイリストではreverse＝古い順にする
        videoListItems.reverse();
        if (options.shuffle) {
          videoListItems = _.shuffle(videoListItems);
        }

        if (options.insert) {
          this._insertAll(videoListItems, options);
        } else if (options.append) {
          this._appendAll(videoListItems, options);
        } else {
          this._replaceAll(videoListItems, options);
        }

        this.emit('update');
        return Promise.resolve({
          status: 'ok',
          message:
            options.append ?
              '投稿動画一覧をプレイリストに追加しました' :
              '投稿動画一覧をプレイリストに読み込みしました'
        });
      });
  }
  loadSearchVideo(word, options, limit = 300) {
    this._initializeView();

    if (!this._searchApiLoader) {
      this._nicoSearchApiLoader = NicoSearchApiV2Loader;
    }

    window.console.time('loadSearchVideos' + word);
    options = options || {};

    return this._nicoSearchApiLoader
      .searchMore(word, options, limit).then(result => {
        window.console.timeEnd('loadSearchVideos' + word);
        let items = result.list || [];
        let videoListItems = items
          .filter(item => {
            return (item.item_data &&
              parseInt(item.item_type, 10) === 0 && // video 以外を除外
              parseInt(item.item_data.deleted, 10) === 0) ||
              (item.thumbnail_url || '').indexOf('video_deleted') < 0;
          }).map(item => VideoListItem.createByMylistItem(item));

        if (videoListItems.length < 1) {
          return Promise.reject({});
        }

        if (options.playlistSort) {
          // 連続再生のために結果を古い順に並べる
          // 検索対象のソート順とは別
          videoListItems = _.sortBy(
            videoListItems, item =>  item.postedAt + item.sortTitle);
        }

        if (options.shuffle) {
          videoListItems = _.shuffle(videoListItems);
        }

        if (options.insert) {
          this._insertAll(videoListItems, options);
        } else if (options.append) {
          this._appendAll(videoListItems, options);
        } else {
          this._replaceAll(videoListItems, options);
        }

        this.emit('update');
        return Promise.resolve({
          status: 'ok',
          message:
            options.append ?
              '検索結果をプレイリストに追加しました' :
              '検索結果をプレイリストに読み込みしました'
        });
      });
  }
  insert(watchId) {
    this._initializeView();
    if (this._activeItem && this._activeItem.watchId === watchId) {
      return Promise.resolve();
    }

    const model = this._model;
    const index = this._index;
    return this._thumbInfoLoader.load(watchId).then(info => {
      // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
      // チャンネル動画はsoXXXXに統一したいのでvideoIdを使う. バッドノウハウ
      info.id = info.isChannel ? info.id : watchId;
      const item = VideoListItem.createByThumbInfo(info);
      model.insertItem(item, index + 1);
      this._refreshIndex(true);

      this.emit('update');

      this.emit('command', 'notifyHtml',
        `次に再生: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
      );
    }).catch(result => {
      const item = VideoListItem.createBlankInfo(watchId);
      model.insertItem(item, index + 1);
      this._refreshIndex(true);

      this.emit('update');

      window.console.error(result);
      this.emit('command', 'alert', `動画情報の取得に失敗: ${watchId}`);
    });
  }
  insertCurrentVideo(videoInfo) {
    this._initializeView();

    if (this._activeItem &&
      !this._activeItem.isBlankData &&
      this._activeItem.watchId === videoInfo.watchId) {
      this._activeItem.updateByVideoInfo(videoInfo);
      this._activeItem.isPlayed = true;
      this.scrollToActiveItem();
      return;
    }

    let currentItem = this._model.findByWatchId(videoInfo.watchId);
    if (currentItem && !currentItem.isBlankData) {
      currentItem.updateByVideoInfo(videoInfo);
      currentItem.isPlayed = true;
      this.setIndex(this._model.indexOf(currentItem));
      this.scrollToActiveItem();
      return;
    }

    const item = VideoListItem.createByVideoInfoModel(videoInfo);
    item.isPlayed = true;
    if (this._activeItem) {
      this._activeItem.isActive = false;
    }
    this._model.insertItem(item, this._index + 1);
    this._activeItem = this._model.findByItemId(item.getItemId());
    this._refreshIndex(true);
  }
  removeItemByWatchId(watchId) {
    const item = this._model.findByWatchId(watchId);
    if (!item || item.isActive) {
      return;
    }
    this._model.removeItem(item);
    this._refreshIndex(true);
  }
  append(watchId) {
    this._initializeView();
    if (this._activeItem && this._activeItem.watchId === watchId) {
      return Promise.resolve();
    }

    const model = this._model;
    return this._thumbInfoLoader.load(watchId).then(info => {
      // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
      info.id = watchId;
      const item = VideoListItem.createByThumbInfo(info);
      //window.console.info(item, info);
      model.appendItem(item);
      this._refreshIndex();
      this.emit('update');
      this.emit('command', 'notifyHtml',
        `リストの末尾に追加: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
      );
    }).catch(result => {
      const item = VideoListItem.createBlankInfo(watchId);
      model.appendItem(item);
      this._refreshIndex(true);
      this._refreshIndex();

      window.console.error(result);
      this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
    });
  }
  getIndex() {
    return this._activeItem ? this._index : -1;
  }
  setIndex(v, force) {
    v = parseInt(v, 10);
    if (this._index !== v || force) {
      this._index = v;
      if (this._activeItem) {
        this._activeItem.isActive = false;
      }
      this._activeItem = this._model.getItemByIndex(v);
      if (this._activeItem) {
        this._activeItem.isActive = true;
      }
      this.emit('update');
    }
  }
  _refreshIndex(scrollToActive) {
    this.setIndex(this._model.indexOf(this._activeItem), true);
    if (scrollToActive) {
      setTimeout(() => this.scrollToActiveItem(true), 1000);
    }
  }
  _setIndexByItemId(itemId) {
    const item = this._model.findByItemId(itemId);
    if (item) {
      this._setIndexByItem(item);
    }
  }
  _setIndexByItem(item) {
    const index = this._model.indexOf(item);
    if (index >= 0) {
      this.setIndex(index);
    }
  }
  toggleEnable(v) {
    if (!_.isBoolean(v)) {
      this._isEnable = !this._isEnable;
      this.emit('update');
      return;
    }

    if (this._isEnable !== v) {
      this._isEnable = v;
      this.emit('update');
    }
  }
  toggleLoop() {
    this._isLoop = !this._isLoop;
    this.emit('update');
  }
  shuffle() {
    this._model.shuffle();
    if (this._activeItem) {
      this._model.removeItem(this._activeItem);
      this._model.insertItem(this._activeItem, 0);
      this.setIndex(0);
    } else {
      this.setIndex(-1);
    }
    this._view.scrollTop(0);
  }
  sortBy(key, isDesc) {
    this._model.sortBy(key, isDesc);
    this._refreshIndex(true);
    setTimeout(() => {
      this._view.scrollToItem(this._activeItem);
    }, 1000);
  }
  removePlayedItem() {
    this._model.removePlayedItem();
    this._refreshIndex(true);
    setTimeout(() => {
      this._view.scrollToItem(this._activeItem);
    }, 1000);
  }
  removeNonActiveItem() {
    this._model.removeNonActiveItem();
    this._refreshIndex(true);
    this.toggleEnable(false);
  }
  selectNext() {
    if (!this.hasNext) {
      return null;
    }
    let index = this.getIndex();
    let len = this.length;
    if (len < 1) {
      return null;
    }

    if (index < -1) {
      this.setIndex(0);
    } else if (index + 1 < len) {
      this.setIndex(index + 1);
    } else if (this.isLoop) {
      this.setIndex((index + 1) % len);
    }
    return this._activeItem ? this._activeItem.watchId : null;
  }
  selectPrevious() {
    let index = this.getIndex();
    let len = this.length;
    if (len < 1) {
      return null;
    }

    if (index < -1) {
      this.setIndex(0);
    } else if (index > 0) {
      this.setIndex(index - 1);
    } else if (this.isLoop) {
      this.setIndex((index + len - 1) % len);
    } else {
      return null;
    }

    return this._activeItem ? this._activeItem.watchId : null;
  }
  scrollToActiveItem(force) {
    if (this._activeItem && (force || !this._view.hasFocus)) {
      this._view.scrollToItem(this._activeItem, force);
    }
  }
  scrollToWatchId(watchId) {
    const item = this._model.findByWatchId(watchId);
    if (item) {
      this._view.scrollToItem(item);
    }
  }
  findByWatchId(watchId) {
    return this._model.findByWatchId(watchId);
  }

  get isEnable() {
    return this._isEnable;
  }
  get isLoop() {
    return this._isLoop;
  }

  get length() {
    return this._model.length;
  }

  get hasNext() {
    const len = this.length;
    return len > 0 && (this.isLoop || this._index < len - 1);
  }

}

//===END===

export {
  VideoListModel,
  VideoListItemView,
  VideoListView,
  VideoListItem,
  VideoList,
  RelatedVideoList,
  PlaylistModel,
  PlaylistView,
  PlaylistSession,
  Playlist
};
