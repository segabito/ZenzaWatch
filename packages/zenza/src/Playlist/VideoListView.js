import {Emitter} from '../../../lib/src/Emitter';
import {bounce} from '../../../lib/src/infra/bounce';
import {cssUtil} from '../../../lib/src/css/css';
import {uq} from '../../../lib/src/uQuery';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';
import {sleep} from '../../../lib/src/infra/sleep';
import {VideoListItemView} from './VideoListItemView';
import {MylistPocketDetector} from '../init/MylistPocketDetector.js';
import {CONSTANT} from '../../../../src/constant';
import {FrameLayer} from '../parts/FrameLayer';
import {dll} from '../../../components/src/dll';

//===BEGIN===
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
  initialize(params) {
    this._itemCss = params.itemCss || VideoListItemView.CSS;
    this._className = params.className || 'videoList';

    this._retryGetIframeCount = 0;

    this._maxItems = params.max || 100;
    this._dragdrop = typeof params.dragdrop === 'boolean' ? params.dragdrop : false;
    this._dropfile = typeof params.dropfile === 'boolean' ? params.dropfile : false;
    this._enablePocketWatch = params.enablePocketWatch;
    this._hasFocus = false;
    this.items = [];

    this.model = params.model;
    if (this.model) {
      const onUpdate = this._onModelUpdate.bind(this);
      this.model.on('update', bounce.time(onUpdate));
    }

    this._initializeView(params);
  }
  _initializeView(params) {
    const html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
    const frame = this.frameLayer = new FrameLayer({
      container: params.container,
      html,
      className: 'videoListFrame'
    });
    frame.wait().then(w => this._initializeFrame(w));
  }
  _initializeFrame(w) {
    this.contentWindow = w;
    const doc = this.document = w.document;
    const $body = this.$body = uq(doc.body);
    this.classList = ClassList(doc.body);
    if (this._className) {
      this.addClass(this._className);
    }

    cssUtil.registerProps(
      {name: '--list-length',  syntax: '<integer>', initialValue: 1, inherits: true, window: w},
      {name: '--active-index', syntax: '<integer>', initialValue: 1, inherits: true, window: w},
      // {name: '--trans-x-pp', syntax: '<length-percentage>', initialValue: cssUtil.px(0), inherits: false, window: w},
      // {name: '--trans-y-pp', syntax: '<length-percentage>', initialValue: cssUtil.px(0), inherits: false, window: w},
      {name: '--progress', syntax: '<length-percentage>', initialValue: cssUtil.percent(0), inherits: true, window: w},
    );

    const container = this.listContainer = doc.querySelector('#listContainer');
    const list = this.list = doc.getElementById('listContainerInner');
    if (this.items && this.items.length) {
      this.renderList(this.items);
    }

    $body.on('click', this._onClick.bind(this))
    // this.frameLayer.addEventBridge('keydown').addEventBridge('keyup');
      .on('keydown', e => global.emitter.emit('keydown', e))
      .on('keyup', e => global.emitter.emit('keyup', e));
    w.addEventListener('focus', () => this._hasFocus = true);
    w.addEventListener('blur', () => this._hasFocus = false);
    w.addEventListener('resize',
      _.debounce(() => this.innerWidth = Math.max(w.innerWidth, 300), 100));

    this.innerWidth = Math.max(w.innerWidth, 300);
    this._updateCSSVars();

    if (this._dragdrop) {
      $body.on('mousedown', this._onBodyMouseDown.bind(this), {passive: true});
    }

    const ccl = ClassList(container);
    const onScroll = _.throttle(() => {
      ccl.add('is-scrolling');
      onScrollEnd();
    }, 100);
    const onScrollEnd = _.debounce(() => ccl.remove('is-scrolling'), 500);
    container.addEventListener('scroll', onScroll, {passive: true});

    if (this._dropfile) {
      $body
        .on('dragover', this._onBodyDragOverFile.bind(this))
        .on('dragenter', this._onBodyDragEnterFile.bind(this))
        .on('dragleave', this._onBodyDragLeaveFile.bind(this))
        .on('drop', this._onBodyDropFile.bind(this));
    }

    MylistPocketDetector.detect().then(async pocket => {
      this._pocket = pocket;
      await sleep.idle();
      this.addClass('is-pocketReady');
      if (pocket.external.observe && this._enablePocketWatch) {
        pocket.external.observe({
          query: '.is-not-resolved a.videoLink',
          container: list,
          closest: '.videoItem',
          callback: this._onMylistPocketInfo.bind(this)
        });
      }
    });
  }
  _onMylistPocketInfo(itemView, {info, isNg, isFav}) {
    const item = this.findItemByItemView(itemView);
    if (!item) {
      return;
    }
    if (isNg) {
      this.model.removeItem(item);
      return;
    }
    item.isFavorite = isFav;
    item.isPocketResolved = true;
    item.watchId = info.watchId;
    item.info = info;
  }
  _onBodyMouseDown(e) {
    const itemView = e.target.closest('.videoItem');
    if (!itemView) {
      return;
    }
    if (e.target.closest('[data-command]')) {
      return;
    }
    const item = this.findItemByItemView(itemView);
    if (!item) {
      console.warn('no-item');
      return;
    }
    const dragOffset = {
      x: e.pageX,
      y: e.pageY,
      st: this.scrollTop()
    };
    this._dragging = {item, itemView, dragOffset, dragOver: {}};
    cssUtil.setProps(
      [itemView, '--trans-x-pp', 0], [itemView, '--trans-y-pp', 0]
    );
    this._bindDragStartEvents();
  }
  _bindDragStartEvents() {
    this.$body
      .on('mousemove.drag', this._onBodyDragMouseMove.bind(this))
      .on('mouseup.drag', this._onBodyDragMouseUp.bind(this))
      .on('blur.drag', this._onBodyBlur.bind(this))
      .on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
  }
  _unbindDragStartEvents() {
    this.$body
      .off('mousemove.drag')
      .off('mouseup.drag')
      .off('blur.drag')
      .off('mouseleave.drag');
  }
  _onBodyDragMouseMove(e) {
    if (!this._dragging) {
      return;
    }
    const {item, itemView, dragOffset, dragOver} = this._dragging || {};
    const x = e.pageX - dragOffset.x;
    const y = e.pageY - dragOffset.y + (this.scrollTop() - dragOffset.st);

    if (x * x + y * y < 100) {
      return;
    }
    cssUtil.setProps(
      [itemView, '--trans-x-pp', cssUtil.px(x)], [itemView, '--trans-y-pp', cssUtil.px(y)]
    );
    item.isDragging = true;
    this.addClass('is-dragging');
    const targetView = e.target.closest('.videoItem');
    if (!targetView) {
      dragOver && dragOver.item && (dragOver.item.isDragover = false);
      this._dragging.dragOver = null;
      return;
    }
    const targetItem = this.findItemByItemView(targetView);
    if (!targetItem || (dragOver && dragOver.item === targetItem)) {
      return;
    }
    dragOver && dragOver.item && (dragOver.item.isDragover = false);
    targetItem.isDragover = true;
    this._dragging.dragOver = {
      item: targetItem,
      itemView: targetView
    };
  }
  _onBodyDragMouseUp(e) {
    this._unbindDragStartEvents();
    if (!this._dragging) {
      return;
    }
    const {item, itemView, dragOver} = this._dragging || {};
    this._endBodyMouseDragging();

    const {item: targetItem, itemView: targetView} = dragOver || {};
    if (!targetView || itemView === targetView) {
      return;
    }
    item.isUpdating = true;

    this.addClass('is-updating');

    this._dragging = null;
    this.emit('moveItem', item.itemId, targetItem.itemId);
  }
  _onBodyBlur() {
    this._endBodyMouseDragging();
  }
  _onBodyMouseLeave() {
    this._endBodyMouseDragging();
  }
  _endBodyMouseDragging() {
    this._unbindDragStartEvents();
    this.removeClass('is-dragging');
    const {item} = this._dragging || {};
    item && (item.isDragging = false);
    this._dragging = null;
  }
  _onBodyDragOverFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this.addClass('is-dragover');
  }
  _onBodyDragEnterFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this.addClass('is-dragover');
  }
  _onBodyDragLeaveFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-dragover');
  }
  _onBodyDropFile(e) {
    e.preventDefault();
    e.stopPropagation();
    this.removeClass('is-dragover');

    const file = e.originalEvent.dataTransfer.files[0];
    if (!/\.playlist\.json$/.test(file.name)) {
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = ev => {
      window.console.log('file data: ', ev.target.result);
      this.emit('filedrop', ev.target.result, file.name);
    };

    fileReader.readAsText(file);
  }
  async _onModelUpdate(items) {
    this.items = items;
    this.addClass('is-updating');
    await this.renderList(items);
    this.removeClass('is-updating');
    this.emit('update');
  }
  findItemByItemView(itemView) {
    const itemId = itemView.dataset.itemId * 1;
    return this.model.findByItemId(itemId);
  }
  async renderList(items) {
    if (!this.list) { return; }
    items = items || this.items || [];
    const lit = dll.lit || await global.emitter.promise('lit-html');
    const {render} = lit;
    const timeLabel = `update playlistView items = ${items.length}`;
    console.time(timeLabel);
    render(await this._buildList(items), this.list);
    console.timeEnd(timeLabel);
    this._updateCSSVars();
    this._setInviewObserver();
  }
  async _buildList(items) {
    items = items || this.items || [];
    const lit = dll.lit || await global.emitter.promise('lit-html');
    const {html} = lit;
    const mapper = (item, index) => VideoListItemView.build(item, index);
    const result = html`${items.map(mapper)}`;
    this.lastBuild = {result, time: performance.now()};
    return result;
  }
  _setInviewObserver() {
    if (!this.document) {
      return;
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    const targets = [...this.document.querySelectorAll('.videoItem')];
    if (!targets.length) { return; }
    const onInview = this._boundOnItemInview =
      this._boundOnItemInview || this._onItemInview.bind(this);
    const observer = this.intersectionObserver =
      new this.contentWindow.IntersectionObserver(onInview, {rootMargin: '800px', root: this.listContainer});
    targets.forEach(target => observer.observe(target));
  }
  _onItemInview(entries) {
    for (const entry of entries) {
      const itemView = entry.target;
      const item = this.findItemByItemView(itemView);
      if (!item) { continue; }
      item.isLazy = !entry.isIntersecting;
    }
  }
  _updateCSSVars() {
    if (!this.document) { return; }
    const body = this.document.body;
    cssUtil.setProps(
      [body, '--list-length', cssUtil.number(this.model.length)],
      [body, '--active-index', cssUtil.number(this.model.activeIndex)]
    );
  }
  _onClick(e) {
    e.stopPropagation();
    global.emitter.emitAsync('hideHover');
    const target = e.target.closest('.command');
    const itemView = e.target.closest('.videoItem');
    const item = itemView ? this.findItemByItemView(itemView) : null;
    if (!target) {
      return;
    }
    e.preventDefault();
    const {command, param} = target.dataset;
    const itemId = item ? item.itemId : 0;
    switch (command) {
      case 'deflistAdd':
        this.emit('deflistAdd', param, itemId);
        break;
      case 'playlistAppend':
        this.emit('playlistAppend', param, itemId);
        break;
      case 'pocket-info':
        window.setTimeout(() => this._pocket.external.info(param), 100);
        break;
      case 'scrollToTop':
        this.scrollTop(0, 300);
        break;
      case 'playlistRemove':
        item && (item.isUpdating = true);
        this.emit('command', command, param, itemId);
        break;
      default:
        this.emit('command', command, param, itemId);
    }
  }
  addClass(name) {
    this.classList && this.classList.add(name);
  }
  removeClass(name) {
    this.classList && this.classList.remove(name);
  }
  toggleClass(name, v) {
    this.classList && this.classList.toggle(name, v);
  }
  scrollTop(v) {
    if (!this.listContainer) {
      return 0;
    }
    if (typeof v === 'number') {
      this.listContainer.scrollTop = v;
    } else {
      return this.listContainer.scrollTop;
    }
  }
  scrollToItem(itemId) {
    if (!this.$body) {
      return;
    }
    if (typeof itemId === 'object') {
      itemId = itemId.itemId;
    }
    const $target = this.$body.find(`.item${itemId}`);
    if (!$target.length) {
      return;
    }
    $target[0].scrollIntoView({block: 'start', behavior: 'instant'});
  }
}

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
    overscroll-behavior: none;
    transition: 0.2s opacity;
    counter-reset: itemIndex;
    will-change: transform;
  }

  #listContainerInner {
    display: grid;
    grid-auto-rows: 100px;
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

//===END===
export {VideoListView};