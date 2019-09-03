import _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {BaseViewComponent, FrameLayer} from './util';
import {CONSTANT} from './constant';
import {Emitter} from './baselib';
import {bounce} from '../packages/lib/src/infra/bounce';
import {textUtil} from '../packages/lib/src/text/textUtil';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
import {css} from '../packages/lib/src/css/css';
import {uq} from '../packages/lib/src/uQuery';
import {Clipboard} from '../packages/lib/src/dom/Clipboard';
import {cssUtil} from '../packages/lib/src/css/css';

//===BEGIN===

class CommentListModel extends Emitter {
  constructor(params) {
    super();
    this._isUniq = params.uniq;
    this._items = [];
    this._positions = [];
    this._maxItems = params.maxItems || 100;
    this._currentSortKey = 'vpos';
    this._isDesc = false;
    this._currentTime = 0;
  }
  setItem(itemList) {
    this._items = Array.isArray(itemList) ? itemList : [itemList];
  }
  clear() {
    this._items = [];
    this._positions = [];
    this._currentTime = 0;
    this.emit('update', [], true);
  }
  setChatList(chatList) {
    chatList = chatList.top.concat(chatList.naka, chatList.bottom);
    let items = [];
    let positions = [];
    for (let i = 0, len = chatList.length; i < len; i++) {
      items.push(new CommentListItem(chatList[i]));
      positions.push(parseFloat(chatList[i].vpos, 10) / 100);
    }
    this._items = items;
    this._positions = positions.sort((a, b) => a - b);
    this._currentTime = 0;

    this.sort();
    this.emit('update', this._items, true);
  }
  removeItemByIndex(index) {
    let target = this._getItemByIndex(index);
    if (!target) {
      return;
    }
    this._items = _.reject(this._items, item => item === target);
  }
  getLength() {
    return this._items.length;
  }
  _getItemByIndex(index) {
    let item = this._items[index];
    return item;
  }
  indexOf(item) {
    return (this._items || []).indexOf(item);
  }
  getItemByIndex(index) {
    let item = this._getItemByIndex(index);
    if (!item) {
      return null;
    }
    return item;
  }
  findByItemId(itemId) {
    itemId = parseInt(itemId, 10);
    return this._items.find(item => item.itemId === itemId);
  }
  removeItem(item) {
    let beforeLen = this._items.length;
    _.pull(this._items, item);
    let afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('update', this._items);
    }
  }
  _onItemUpdate(item, key, value) {
    this.emit('itemUpdate', item, key, value);
  }
  sortBy(key, isDesc) {
    let table = {
      vpos: 'vpos',
      date: 'date',
      text: 'text',
      user: 'userId',
    };
    let func = table[key];
    if (!func) {
      return;
    }
    this._items = _.sortBy(this._items, item => item[func]);
    if (isDesc) {
      this._items.reverse();
    }
    this._currentSortKey = key;
    this._isDesc = isDesc;
    this.onUpdate();
  }
  sort() {
    this.sortBy(this._currentSortKey, this._isDesc);
  }
  getCurrentSortKey() {
    return this._currentSortKey;
  }
  onUpdate() {
    this.emitAsync('update', this._items);
  }
  getInViewIndex(sec) {
    return Math.max(0, _.sortedLastIndex(this._positions, sec + 1) - 1);
  }
  set currentTime(sec) {
    if (this._currentTime !== sec && typeof sec === 'number') {
      this._currentTime = sec;
      if (this._currentSortKey === 'vpos') {
        this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
      }
    }
  }
  get currentTime() {return this._currentTime;}
}

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
class CommentListView extends Emitter {
  constructor(params) {
    super();
    this._ItemView = CommentListItemView;
    this._itemCss = CommentListItemView.CSS;
    this._className = params.className || 'commentList';

    this._retryGetIframeCount = 0;

    this._cache = {};
    this._maxItems = 100000;
    this._inviewItemList = new Map;
    this._scrollTop = 0;

    this._model = params.model;
    if (this._model) {
      this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 500));
    }

    this.scrollTop = bounce.raf(this.scrollTop.bind(this));
    this._initializeView(params, 0);
  }
  async _initializeView(params) {
    const html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
    const frame = new FrameLayer({
      container: params.container,
      html,
      className: 'commentListFrame'
    });
    // this._frame.on('load', this._onIframeLoad.bind(this));
    this._onIframeLoad(await frame.promise('GetReady!'));
  }
  _onIframeLoad(w) {
    const doc = this._document = w.document;
    this._window = w;
    const body = this._body = doc.body;
    const $body = this._$body = uq(body);
    if (this._className) {
      body.classList.add(this._className);
    }
    this._container = doc.querySelector('#listContainer');
    this._list = doc.getElementById('listContainerInner');
    if (this._html) {
      this._list.innerHTML = this._html;
    }
    this._$menu = $body.find('.listMenu');

    this._$itemDetail = $body.find('.itemDetailContainer');

    $body
      .on('click', this._onClick.bind(this))
      .on('dblclick', this._onDblClick.bind(this))
      .on('keydown', e => ZenzaWatch.emitter.emit('keydown', e))
      .on('keyup', e => ZenzaWatch.emitter.emit('keyup', e))
      .toggleClass('is-guest', !nicoUtil.isLogin());

    this._$menu.on('click', this._onMenuClick.bind(this));
    this._$itemDetail.on('click', this._onItemDetailClick.bind(this));

    this._container.addEventListener('mouseover', this._onMouseOver.bind(this));
    this._container.addEventListener('mouseleave', this._onMouseOut.bind(this));
    this._container.addEventListener('scroll', this._onScroll.bind(this), {passive: true});
    this._debouncedOnScrollEnd = _.debounce(this._onScrollEnd.bind(this), 500);

    w.addEventListener('resize', this._onResize.bind(this));
    this._innerHeight = w.innerHeight;

    this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
    //this._appendNewItems = bounce.raf(this._appendNewItems.bind(this));
    cssUtil.registerProps(
      {name: '--current-time', syntax: '<time>', initialValue: '0s', inherits: true, window: w},
      {name: '--duration', syntax: '<time>', initialValue: '4s', inherits: true, window: w},
      {name: '--scroll-top',   syntax: '<length>', initialValue: '0px', inherits: true, window: w},
      {name: '--vpos-time', syntax: '<time>', initialValue: '0s', inherits: true, window: w},
      {name: '--zenza-comment-panel-header-height',   syntax: '<length>', initialValue: '64px', inherits: true}
    );

    this._debouncedOnItemClick = _.debounce(this._onItemClick.bind(this), 300);

    // 互換用
    ZenzaWatch.debug.$commentList = uq(this._list);
    ZenzaWatch.debug.getCommentPanelItems = () =>
      Array.from(doc.querySelectorAll('.commentListItem'));
  }
  _onModelUpdate(itemList, replaceAll) {
    window.console.time('update commentlistView');
    this.addClass('updating');
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    let itemViews = [];
    this._isActive = false;

    if (replaceAll) {
      this._scrollTop = 0;
    }

    itemViews = itemList.map((item, i) =>
      new this._ItemView({item: item, index: i, height: CommentListView.ITEM_HEIGHT})
    );

    this._itemViews = itemViews;

    window.setTimeout(() => {
      if (!this._list) { return; }
      this._list.textContent = '';
      this._list.style.height =
        `${CommentListView.ITEM_HEIGHT * itemViews.length + 100}px`;
      this._inviewItemList.clear();
      this._$menu.removeClass('show');
      this._refreshInviewElements();
      this.hideItemDetail();
    }, 0);

    window.setTimeout(() => {
      this.removeClass('updating');
      this.emit('update');
    }, 100);

    window.console.timeEnd('update commentlistView');
  }
  _onClick(e) {
    e.stopPropagation();
    ZenzaWatch.emitter.emitAsync('hideHover');
    let item = e.target.closest('.commentListItem');
    if (item) {
      return this._debouncedOnItemClick(item);
    }
  }
  _onItemClick(item) {
    this._$menu
      // .css('top', $item.attr('data-top') + 'px')
      .css('transform', `translate3d(0, ${item.dataset.top}px, 0)`)
        // $item.attr('data-time-3dp') + 'px) translateZ(-50px)')
      .attr('data-item-id', item.dataset.itemId)
      .addClass('show');
  }
  _onMenuClick(e) {
    const target = e.target.closest('.menuButton');
    this._$menu.removeClass('show');
    if (!target) {
      return;
    }
    const {itemId} = e.target.closest('.listMenu').dataset;
    if (!itemId) {
      return;
    }

    const {command} = target.dataset;

    if (command === 'addUserIdFilter' || command === 'addWordFilter') {
      Array.from(this._list.querySelectorAll(`.item${itemId}`))
        .forEach(e => e.remove());
    }

    this.emit('command', command, null, itemId);
  }
  _onItemDetailClick(e) {
    const target = e.target.closest('.command');
    if (!target) {
      return;
    }
    const itemId = this._$itemDetail.attr('data-item-id');
    if (!itemId) {
      return;
    }
    const {command, param} = target.dataset;
    if (command === 'hideItemDetail') {
      return this.hideItemDetail();
    }
    if (command === 'reloadComment') {
      this.hideItemDetail();
    }
    this.emit('command', command, param, itemId);
  }
  _onDblClick(e) {
    e.stopPropagation();
    let $item = $(e.target).closest('.commentListItem');
    if ($item.length < 0) {
      return;
    }
    e.preventDefault();

    let itemId = $item.attr('data-item-id');
    this.emit('command', 'select', null, itemId);
  }
  _onMouseMove() {
  }
  _onMouseOver() {
    this._isActive = true;
    this.addClass('active');
  }
  _onMouseOut() {
    this._isActive = false;
    this.removeClass('active');
  }
  _onResize() {
    this._innerHeight = this._window.innerHeight;
    this._refreshInviewElements();
  }
  _onScroll() {
    if (!this.hasClass('is-scrolling')) {
      this.addClass('is-scrolling');
    }
    this._refreshInviewElements();
    this._debouncedOnScrollEnd();
  }
  _onScrollEnd() {
    this.removeClass('is-scrolling');
  }
  _refreshInviewElements() {
    if (!this._list) {
      return;
    }
    let itemHeight = CommentListView.ITEM_HEIGHT;
    let scrollTop = this._container.scrollTop;
    let innerHeight = this._innerHeight;
    let windowBottom = scrollTop + innerHeight;
    let itemViews = this._itemViews;
    let startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
    let endIndex = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
    let i;

    const newItems = [], inviewItemList = this._inviewItemList;
    for (i = startIndex; i < endIndex; i++) {
      if (inviewItemList.has(i) || !itemViews[i]) {
        continue;
      }
      newItems.push(itemViews[i]);
      inviewItemList.set(i, itemViews[i]);
    }

    if (newItems.length < 1) {
      return;
    }

    for (const i of inviewItemList.keys()) { // Object.keys(inviewItemList).forEach(i => {
      if (i >= startIndex && i <= endIndex) {
        continue;
      }
      inviewItemList.get(i).remove();
      inviewItemList.delete(i);
    }

    // this._inviewItemList = inviewItemList;


    this._newItems = this._newItems ? this._newItems.concat(newItems) : newItems;


    this._appendNewItems();
  }
  _appendNewItems() {
    if (this._newItems) {
      const f = document.createDocumentFragment();
      f.append(...this._newItems.map(i => i.viewElement));
      // this._newItems.forEach(i => {
      //   f.append(i.viewElement);
      // });
      this._list.appendChild(f);
      // this._updatePerspective();
    }
    this._newItems = null;
  }
  _updatePerspective() {
    let keys = Object.keys(this._inviewItemList);
    let avr = 0;
    if (!this._inviewItemList.size) {
      avr = 50;
    } else {
      let min = 0xffff;
      let max = -0xffff;
      keys.forEach(key => {
        let item = this._inviewItemList.get(key);
        min = Math.min(min, item.time3dp);
        max = Math.max(max, item.time3dp);
        avr += item.time3dp;
      });
      avr = avr / keys.length * 100 + 50; //max * 100; //(min + max) / 2 + 10; //50 + avr / keys.length;
    }
    this._list.style.transform = `translateZ(-${avr}px)`;
  }
  addClass(className) {
    this.toggleClass(className, true);
  }
  removeClass(className) {
    this.toggleClass(className, false);
  }
  toggleClass(className, v) {
    if (!this._body) {
      return;
    }
    this._body.classList.toggle(className, v);
  }
  hasClass(className) {
    return this._body.classList.contains(className);
  }
  find(query) {
    return this._document.querySelectorAll(query);
  }
  scrollTop(v) {
    if (!this._window) {
      return 0;
    }

    if (typeof v === 'number') {
      this._scrollTop = v;
      this._container.scrollTop = v;
    } else {
      this._scrollTop = this._container.scrollTop;
      return this._scrollTop;
    }
  }
  setCurrentPoint(sec, idx) {
    if (!this._window || !this._itemViews) {
      return;
    }
    let innerHeight = this._innerHeight;
    let itemViews = this._itemViews;
    let len = itemViews.length;
    let view = itemViews[idx];
    if (len < 1 || !view) {
      return;
    }

    if (!this._isActive) {
      const itemHeight = CommentListView.ITEM_HEIGHT;
      const top = Math.max(0, view.top - innerHeight + itemHeight);
      this.scrollTop(top);
    }
    // requestAnimationFrame(() => {
    //   this._container.style.setProperty('--current-time', css.s(sec));
    //   this._container.style.setProperty('--scroll-top', css.px(view.top));
    // });
  }
  showItemDetail(item) {
    const $d = this._$itemDetail;
    $d.attr('data-item-id', item.itemId);
    $d.find('.resNo').text(item.no).end()
      .find('.vpos').text(item.timePos).end()
      .find('.time').text(item.formattedDate).end()
      .find('.userId').text(item.userId).end()
      .find('.cmd').text(item.cmd).end()
      .find('.text').text(item.text).end()
      .addClass('show');
    ZenzaWatch.debug.$itemDetail = $d;
  }
  hideItemDetail() {
    this._$itemDetail.removeClass('show');
  }
}
CommentListView.ITEM_HEIGHT = 40;

CommentListView.__css__ = '';

CommentListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
  ${CONSTANT.BASE_CSS_VARS}

  body {
    user-select: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  body .is-debug {
    perspective: 100px;
    perspective-origin: left top;
    transition: perspective 0.2s ease;
  }

  body.is-scrolling #listContainerInner *{
    pointer-events: none;
  }

  #listContainer {
    position: absolute;
    top: -1px;
    left:0;
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
    overflow: auto;
    overscroll-behavior: contain;
    /*transition: --current-time 0.2s linear;*/
  }

  .is-debug #listContainerInner {
    transform-style: preserve-3d;
    transform: translateZ(-50px);
    transition: transform 0.2s;
  }

  #listContainerInner:empty::after {
    content: 'コメントは空です';
    color: #666;
    display: inline-block;
    text-align: center;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .is-guest .forMember {
    display: none !important;
  }

  .itemDetailContainer {
    position: fixed;
    display: block;
    top: 50%;
    left: 50%;
    line-height: normal;
    min-width: 280px;
    max-height: 100%;
    overflow-y: scroll;
    overscroll-behavior: contain;
    font-size: 14px;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    z-index: 100;
    border: 2px solid #fc9;
    background-color: rgba(255, 255, 232, 0.9);
    box-shadow: 4px 4px 0 rgba(99, 99, 66, 0.8);
    transition: opacity 0.2s;
  }

  .itemDetailContainer.show {
    opacity: 1;
    pointer-events: auto;
  }
  .itemDetailContainer>* {
  }
  .itemDetailContainer * {
    word-break: break-all;
  }
  .itemDetailContainer .reloadComment {
    display: inline-block;
    padding: 0 4px;
    cursor: pointer;
    transform: scale(1.4);
    transition: transform 0.1s;
  }
  .itemDetailContainer .reloadComment:hover {
    transform: scale(1.8);
  }
  .itemDetailContainer .reloadComment:active {
    transform: scale(1.2);
    transition: none;
  }
  .itemDetailContainer .resNo,
  .itemDetailContainer .vpos,
  .itemDetailContainer .time,
  .itemDetailContainer .userId,
  .itemDetailContainer .cmd {
    font-size: 12px;
  }
  .itemDetailContainer .time {
    cursor: pointer;
    color: #339;
  }
  .itemDetailContainer .time:hover {
    text-decoration: underline;
  }
  .itemDetailContainer .time:hover:after {
    position: absolute;
    content: '${'\\00231A'} 過去ログ';
    right: 16px;
    text-decoration: none;
    transform: scale(1.4);
  }
  .itemDetailContainer .resNo:before,
  .itemDetailContainer .vpos:before,
  .itemDetailContainer .time:before,
  .itemDetailContainer .userId:before,
  .itemDetailContainer .cmd:before {
    display: inline-block;
    min-width: 50px;
  }
  .itemDetailContainer .resNo:before {
    content: 'no';
  }
  .itemDetailContainer .vpos:before {
    content: 'pos';
  }
  .itemDetailContainer .time:before {
    content: 'date';
  }
  .itemDetailContainer .userId:before {
    content: 'user';
  }
  .itemDetailContainer .cmd:before {
    content: 'cmd';
  }
  .itemDetailContainer .text {
    border: 1px inset #ccc;
    padding: 8px;
    margin: 4px 8px;
  }
  .itemDetailContainer .close {
    border: 2px solid #666;
    width: 50%;
    cursor: pointer;
    text-align: center;
    margin: auto;
    user-select: none;
  }

</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
  <div class="itemDetailContainer">
    <div class="resNo"></div>
    <div class="vpos"></div>
    <div class="time command" data-command="reloadComment"></div>
    <div class="userId"></div>
    <div class="cmd"></div>
    <div class="text"></div>
    <div class="command close" data-command="hideItemDetail">O K</div>
  </div>
  <div id="listContainer">
    <div class="listMenu">
      <span class="menuButton itemDetailRequest"
        data-command="itemDetailRequest" title="詳細">？</span>
      <span class="menuButton clipBoard"        data-command="clipBoard" title="クリップボードにコピー">copy</span>
      <span class="menuButton addUserIdFilter"  data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
      <span class="menuButton addWordFilter"    data-command="addWordFilter" title="NGワード">NGword</span>

    </div>

    <div id="listContainerInner"></div>
  </div>
</body>
</html>

  `).trim();


const CommentListItemView = (() => {
  // なんか汎用性を持たせようとして失敗してる奴

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  const CSS = (`
      * {
        box-sizing: border-box;
      }

      body {
        background: #000;
        margin: 0;
        padding: 0;
        overflow: hidden;
        line-height: 0;
      }

      ${CONSTANT.SCROLLBAR_CSS}

      .listMenu {
        position: absolute;
        display: block;
      }

      .listMenu.show {
        display: block;
        width: 100%;
        left: 0;
        z-index: 100;
      }

      .listMenu  .menuButton {
        display: inline-block;
        position: absolute;
        font-size: 13px;
        line-height: 20px;
        border: 1px solid #666;
        color: #fff;
        background: #666;
        cursor: pointer;
        top: 0;
        text-align: center;
      }

      .listMenu  .menuButton:hover {
        border: 1px solid #ccc;
        box-shadow: 2px 2px 2px #333;
      }

      .listMenu  .menuButton:active {
        box-shadow: none;
        transform: translate(0, 1px);
      }

      .listMenu .itemDetailRequest {
        right: 176px;
        width: auto;
        padding: 0 8px;
      }

      .listMenu .clipBoard {
        right: 120px;
        width: 48px;
      }

      .listMenu .addWordFilter {
        right: 64px;
        width: 48px;
      }

      .listMenu .addUserIdFilter {
        right: 8px;
        width: 48px;
      }

      .commentListItem {
        position: absolute;
        display: inline-block;
        width: 100%;
        height: 40px;
        line-height: 20px;
        font-size: 20px;
        white-space: nowrap;
        margin: 0;
        padding: 0;
        background: #222;
        z-index: 50;
        contain: layout;
      }

      .active .commentListItem {
        pointer-events: auto;
      }

      .commentListItem * {
        cursor: default;
      }

      .commentListItem.odd {
        background: #333;
      }

      .commentListItem.updating {
        opacity: 0.5;
        cursor: wait;
      }

      .commentListItem .info {
        display: block;
        width: 100%;
        font-size: 14px;
        height: 20px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: #888;
        margin: 0;
        padding: 0 4px;
      }

      .commentListItem .timepos {
        display: inline-block;
        width: 100px;
      }

      .commentListItem .text {
        display: block;
        font-size: 16px;
        height: 20px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: #ccc;
        margin: 0;
        padding: 0 4px;
        font-family: '游ゴシック', 'Yu Gothic', 'YuGothic', arial, 'Menlo';
        font-feature-settings: "palt" 1;
      }

      .active .commentListItem:hover {
        overflow-x: hidden;
        overflow-y: visible;
        z-index: 60;
        height: auto;
        box-shadow: 2px 2px 2px #000, 2px -2px 2px #000;
      }

      .active .commentListItem:hover .text {
        white-space: normal;
        word-break: break-all;
        height: auto;
      }

      .commentListItem.fork1 .timepos {
        text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
      }
      .commentListItem.fork2 .timepos {
        text-shadow: 1px 1px 0 #880000, -1px -1px 0 #880000 !important;
      }
      .commentListItem.fork2 .text,
      .commentListItem.fork1 .text {
        font-weight: bolder;
      }

      .begin ~ .commentListItem .text {
        color: #ffe;
        font-weight: bolder;
      }

      .end ~ .commentListItem .text {
        color: #ccc;
        font-weight: normal;
      }

      .commentListItem.subThread {
        opacity: 0.6;
      }

      .commentListItem.active {
        outline: dashed 2px #ff8;
        outline-offset: 4px;
      }

      .font-gothic .text {font-family: "游ゴシック", "Yu Gothic", 'YuGothic', "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
      .font-mincho .text {font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, Osaka-mono, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;}
      .font-defont .text {font-family: 'Yu Gothic', 'YuGothic', "ＭＳ ゴシック", "MS Gothic", "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }
/*
      .commentListItem .pointer {
        position: absolute;
        width: 100%;
        height: 1px;
        bottom: 0;
        left: 0;
        pointer-events: none;
        background: #ffc;
        will-change: transform, opacity;
        transform-origin: left top;
        transition: transform var(--duration) linear;
        visibility: visible;
        opacity: 0.3;
        animation-duration: var(--duration);
        animation-delay: calc(var(--vpos-time) - var(--current-time) - 1s);
        animation-name: pointer-moving;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
        animation-play-state: paused !important;
        contain: paint layout style size;
      }
      @keyframes pointer-moving {
        0% {
          visibility: visible;
          opacity: 0.3;
          transform: translateX(0);
        }
        100% {
          visibility: hidden;
          opacity: 1;
          transform: translateX(-100%);
        }
      }
*/
    `).trim();


  const TPL = (`
      <div class="commentListItem">
        <p class="info">
          <span class="timepos"></span>&nbsp;&nbsp;<span class="date"></span>
        </p>
        <p class="text"></p>
        <!--span class="pointer"></span-->
      </div>
    `).trim();

  let counter = 0;
  let template;

  class CommentListItemView {
    static get template() {
      if (!template) {
        const t = document.createElement('template');
        t.id = 'CommentListItemView-template' + Date.now();
        t.innerHTML = TPL;
        document.body.appendChild(t);
        template = {
          t,
          clone: () => {
            return document.importNode(t.content, true).firstChild;
          },
          commentListItem: t.content.querySelector('.commentListItem'),
          timepos: t.content.querySelector('.timepos'),
          date: t.content.querySelector('.date'),
          text: t.content.querySelector('.text')
        };
      }
      return template;
    }

    constructor(params) {
      this.initialize(params);
    }

    initialize(params) {
      this._item = params.item;
      this._index = params.index;
      this._height = params.height;

      this._id = counter++;
    }

    build() {
      const template = this.constructor.template;
      const {commentListItem, timepos, date, text} = template;
      const item = this._item;
      const oden = (this._index % 2 === 0) ? 'even' : 'odd';
      const time3dp = Math.round(this._item.time3dp * 100);

      const formattedDate = item.formattedDate;
      commentListItem.id = this.domId;
      const font = item.fontCommand || 'default';
      commentListItem.className =
        `commentListItem no${item.no} item${this._id} ${oden} fork${item.fork} font-${font} ${item.isSubThread ? 'subThread' : ''}`;
      commentListItem.style.cssText = `
          top: ${this.top}px;
          --duration: ${item.duration}s;
          --vpos-time: ${item.vpos / 100}s;
        `;
      // commentListItem.style.transform = `translateZ(${time3dp}px)`;
      //commentListItem.setAttribute('data-time-3dp', time3dp);

      Object.assign(commentListItem.dataset, {
        itemId: item.itemId,
        no: item.no,
        uniqNo: item.uniqNo,
        vpos: item.vpos,
        top: this.top,
        thread: item.threadId,
        title: `${item.nno}: ${formattedDate} ID:${item.userId}\n${item.text}`,
        time3dp,
        nicoru: item.nicoru
      });

      timepos.textContent = item.timePos;
      date.textContent = formattedDate;
      text.textContent = item.text.trim();

      const color = item.color;
      text.style.textShadow = color ? `0px 0px 2px ${color}` : '';
      this._view = template.clone();
    }

    get viewElement() {
      if (!this._view) {
        this.build();
      }
      return this._view;
    }

    get itemId() {
      return this._item.itemId;
    }

    get domId() {
      return `item${this._item.itemId}`;
    }

    get top() {
      return this._index * this._height;
    }

    remove() {
      if (!this._view) {
        return;
      }
      this._view.remove();
    }

    toString() {
      return this.viewElement.outerHTML;
    }

    get time3dp() {
      return this._item.time3dp;
    }

    get time3d() {
      return this._item.time3d;
    }
  }

  CommentListItemView.TPL = TPL;
  CommentListItemView.CSS = CSS;
  return CommentListItemView;
})();

class CommentListItem {
  constructor(nicoChat) {
    this._nicoChat = nicoChat;
    this._itemId = CommentListItem._itemId++;
    this._vpos = nicoChat.vpos;
    this._text = nicoChat.text;
    this._escapedText = textUtil.escapeHtml(this._text);
    this._userId = nicoChat.userId;
    this._date = nicoChat.date;
    this._fork = nicoChat.fork;
    this._no = nicoChat.no;
    this._color = nicoChat.color;
    this._fontCommand = nicoChat.fontCommand;
    this._isSubThread = nicoChat.isSubThread;

    this._formattedDate = textUtil.dateToString(this._date * 1000);
    let sec = this._vpos / 100;
    this._timePos = textUtil.secToTime(sec);
  }
  get itemId() {return this._itemId;}
  get vpos() {return this._vpos;}
  get timePos() {return this._timePos;}
  get cmd() {return this._nicoChat.cmd;}
  get text() {return this._text;}
  get escapedText() {return this._escapedText;}
  get userId() {return this._userId;}
  get color() {return this._color;}
  get date() {return this._date;}
  get time() {return this._date * 1000;}
  get formattedDate() {return this._formattedDate;}
  get fork() {return this._fork;}
  get no() {return this._no;}
  get uniqNo() {return this._nicoChat.uniqNo;}
  get fontCommand() {return this._fontCommand;}
  get isSubThread() {return this._isSubThread;}
  get threadId() {return this._nicoChat.threadId;}
  get time3d() {return this._nicoChat.time3d;}
  get time3dp() {return this._nicoChat.time3dp;}
  get nicoru() {return this._nicoChat.nicoru;}
  get duration() {return this._nicoChat.duration;}
}
CommentListItem._itemId = 0;


class CommentPanelView extends Emitter {
  constructor(params) {
    super();
    this._$container = params.$container;
    this._model = params.model;
    this._commentPanel = params.commentPanel;

    css.addStyle(CommentPanelView.__css__);
    let $view = this._$view = uq.html(CommentPanelView.__tpl__);
    this._$container.append($view);

    let $menu = this._$menu = this._$view.find('.commentPanel-menu');

    ZenzaWatch.debug.commentPanelView = this;

    let listView = this._listView = new CommentListView({
      container: this._$view.find('.commentPanel-frame')[0],
      model: this._model,
      className: 'commentList',
      builder: CommentListItemView,
      itemCss: CommentListItemView.__css__
    });
    listView.on('command', this._onCommand.bind(this));

    this._timeMachineView = new TimeMachineView({
      parentNode: document.querySelector('.timeMachineContainer')
    });
    this._timeMachineView.on('command', this._onCommand.bind(this));

    this._commentPanel.on('threadInfo',
      _.debounce(this._onThreadInfo.bind(this), 100));
    this._commentPanel.on('update',
      _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
    this._commentPanel.on('itemDetailResp',
      _.debounce(item => listView.showItemDetail(item), 100));
    this._onCommentPanelStatusUpdate();

    this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));

    this._$view.on('click', '.commentPanel-command', this._onCommentListCommandClick.bind(this));

    ZenzaWatch.emitter.on('hideHover', () => $menu.removeClass('show'));
  }
  toggleClass(className, v) {
    this._view.toggleClass(className, v);
    this._$view.toggleClass(className, v);
  }
  _onModelCurrentTimeUpdate(sec, viewIndex) {
    if (!this._$view){ //} || !this._$view.is(':visible')) {
      return;
    }

    this._lastCurrentTime = sec;
    this._listView.setCurrentPoint(sec, viewIndex);
  }
  _onCommand(command, param, itemId) {
    switch (command) {
      default:
        this.emit('command', command, param, itemId);
        break;
    }
  }
  _onCommentListCommandClick(e) {
    let $target = $(e.target).closest('.commentPanel-command');
    let command = $target.attr('data-command');
    let param = $target.attr('data-param');
    e.stopPropagation();
    if (!command) {
      return;
    }

    let $view = this._$view;
    let setUpdating = () => {
      document.body.focus();
      $view.addClass('updating');
      window.setTimeout(() => $view.removeClass('updating'), 1000);
    };

    switch (command) {
      case 'sortBy':
        setUpdating();
        this.emit('command', command, param);
        break;
      case 'reloadComment':
        setUpdating();
        this.emit('command', command, param);
        break;
      default:
        this.emit('command', command, param);
    }
    ZenzaWatch.emitter.emitAsync('hideHover');
  }
  _onThreadInfo(threadInfo) {
    this._timeMachineView.update(threadInfo);
  }
  _onCommentPanelStatusUpdate() {
    let commentPanel = this._commentPanel;
    const $view = this._$view
      .toggleClass('autoScroll', commentPanel.isAutoScroll());

    const langClass = `lang-${commentPanel.getLanguage()}`;
    if (!$view.hasClass(langClass)) {
      $view.removeClass('lang-ja_JP lang-en_US lang-zh_TW').addClass(langClass);
    }
  }
}
CommentPanelView.__css__ = `
    :root {
      --zenza-comment-panel-header-height: 64px;
    }

    .commentPanel-container {
      height: 100%;
      overflow: hidden;
      user-select: none;
    }

    .commentPanel-header {
      height: var(--zenza-comment-panel-header-height);
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .commentPanel-menu-button {
      display: inline-block;
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 4px;
      background: #666;
      font-size: 16px;
      line-height: 28px;
      white-space: nowrap;
    }
    .commentPanel-menu-button:hover {
      border: 1px outset;
    }
    .commentPanel-menu-button:active {
      border: 1px inset;
    }
    .commentPanel-menu-button .commentPanel-menu-icon {
      font-size: 24px;
      line-height: 28px;
    }

    .commentPanel-container.autoScroll .autoScroll {
      text-shadow: 0 0 6px #f99;
      color: #ff9;
    }

    .commentPanel-frame {
      height: calc(100% - var(--zenza-comment-panel-header-height));
      transition: opacity 0.3s;
    }

    .updating .commentPanel-frame,
    .shuffle .commentPanel-frame {
      opacity: 0;
    }

    .commentPanel-menu-toggle {
      position: absolute;
      right: 8px;
      display: inline-block;
      font-size: 14px;
      line-height: 32px;
      cursor: pointer;
      outline: none;
    }
    .commentPanel-menu-toggle:focus-within {
      pointer-events: none;
    }
    .commentPanel-menu-toggle:focus-within .zenzaPopupMenu {
      pointer-events: auto;
      visibility: visible;
      opacity: 0.99;
      pointer-events: auto;
      transition: opacity 0.3s;
    }

    .commentPanel-menu {
      position: absolute;
      right: 0px;
      top: 24px;
      min-width: 150px;
    }

    .commentPanel-menu li {
      line-height: 20px;
    }

    .commentPanel-container.lang-ja_JP .commentPanel-command[data-param=ja_JP],
    .commentPanel-container.lang-en_US .commentPanel-command[data-param=en_US],
    .commentPanel-container.lang-zh_TW .commentPanel-command[data-param=zh_TW] {
      font-weight: bolder;
      color: #ff9;
    }


  `.trim();

CommentPanelView.__tpl__ = (`
    <div class="commentPanel-container">
      <div class="commentPanel-header">
        <label class="commentPanel-menu-button autoScroll commentPanel-command"
          data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</label>

        <div class="commentPanel-command commentPanel-menu-toggle" tabindex="-1">
          ▼ メニュー
          <div class="zenzaPopupMenu commentPanel-menu">
            <div class="listInner">
            <ul>
              <li class="commentPanel-command" data-command="sortBy" data-param="vpos">
                コメント位置順に並べる
              </li>
              <li class="commentPanel-command" data-command="sortBy" data-param="date:desc">
                コメントの新しい順に並べる
              </li>

              <hr class="separator">
              <li class="commentPanel-command" data-command="update-commentLanguage" data-param="ja_JP">
                日本語
              </li>
              <li class="commentPanel-command" data-command="update-commentLanguage" data-param="en_US">
                English
              </li>
              <li class="commentPanel-command" data-command="update-commentLanguage" data-param="zh_TW">
                中文
              </li>
            </ul>
            </div>
          </div>
        </div>
      <div class="timeMachineContainer"></div>
      </div>
      <div class="commentPanel-frame"></div>
    </div>
  `).trim();



class CommentPanel extends Emitter {
  constructor(params) {
    super();
    this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
    this._$container = params.$container;
    let player = this._player = params.player;

    this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;

    this._model = new CommentListModel({});
    this._language = params.language || 'ja_JP';

    player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
    player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
    player.on('commentReady', _.debounce(this._onCommentReady.bind(this), 500));
    player.on('open', this._onPlayerOpen.bind(this));
    player.on('close', this._onPlayerClose.bind(this));

    ZenzaWatch.debug.commentPanel = this;
  }
  _initializeView() {
    if (this._view) {
      return;
    }
    this._view = new CommentPanelView({
      $container: this._$container,
      model: this._model,
      commentPanel: this,
      builder: CommentListItemView,
      itemCss: CommentListItemView.__css__
    });
    this._view.on('command', this._onCommand.bind(this));
  }
  startTimer() {
    this.stopTimer();
    this._timer = window.setInterval(this._onTimer.bind(this), 200);
  }
  stopTimer() {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }
  _onTimer() {
    if (this._autoScroll) {
      this.currentTime=this._player.currentTime;
    }
  }
  _onCommand(command, param, itemId) {
    let item;
    if (itemId) {
      item = this._model.findByItemId(itemId);
    }
    switch (command) {
      case 'toggleScroll':
        this.toggleScroll();
        break;
      case 'sortBy': {
        let tmp = param.split(':');
        this.sortBy(tmp[0], tmp[1] === 'desc');
        break;}
      case 'select':{
        let vpos = item.vpos;
        this.emit('command', 'seek', vpos / 100);
        // TODO: コメント強調
        break;}
      case 'clipBoard':
        Clipboard.copyText(item.text);
        this.emit('command', 'notify', 'クリップボードにコピーしました');
        break;
      case 'addUserIdFilter':
        this._model.removeItem(item);
        this.emit('command', command, item.userId);
        break;
      case 'addWordFilter':
        this._model.removeItem(item);
        this.emit('command', command, item.text);
        break;
      case 'reloadComment':
        if (item) {
          param = {};
          let dt = new Date(item.time);
          this.emit('command', 'notify', item.formattedDate + '頃のログ');
          param.when = Math.floor(dt.getTime() / 1000);
        }
        this.emit('command', command, param);

        break;
      case 'itemDetailRequest':
        if (item) {
          this.emit('itemDetailResp', item);
        }
        break;
      default:
        this.emit('command', command, param);
    }
  }
  _onCommentParsed(language) {
    this.setLanguage(language);
    this._initializeView();
    this.setChatList(this._player.chatList);
    this.startTimer();
  }
  _onCommentChange(language) {
    this.setLanguage(language);
    this._initializeView();
    this.setChatList(this._player.chatList);
  }
  _onCommentReady(result, threadInfo) {
    this._threadInfo = threadInfo;
    this.emit('threadInfo', threadInfo);
  }
  _onPlayerOpen() {
    this._model.clear();
  }
  _onPlayerClose() {
    this._model.clear();
    this.stopTimer();
  }
  setChatList(chatList) {
    if (!this._model) {
      return;
    }
    this._model.setChatList(chatList);
  }
  isAutoScroll() {
    return this._autoScroll;
  }
  getLanguage() {
    return this._language || 'ja_JP';
  }
  getThreadInfo() {
    return this._threadInfo;
  }
  setLanguage(lang) {
    if (lang !== this._language) {
      this._language = lang;
      this.emit('update');
    }
  }
  toggleScroll(v) {
    if (!_.isBoolean(v)) {
      this._autoScroll = !this._autoScroll;
      if (this._autoScroll) {
        this._model.sortBy('vpos');
      }
      this.emit('update');
      return;
    }

    if (this._autoScroll !== v) {
      this._autoScroll = v;
      if (this._autoScroll) {
        this._model.sortBy('vpos');
      }
      this.emit('update');
    }
  }
  sortBy(key, isDesc) {
    this._model.sortBy(key, isDesc);
    if (key !== 'vpos') {
      this.toggleScroll(false);
    }
  }
  set currentTime(sec) {
    if (!this._view) {
      return;
    }
    if (!this._autoScroll) {
      return;
    }
    this._model.currentTime = sec;
  }
  get currentTime() {
    return this._model.currentTime;
  }
}

class TimeMachineView extends BaseViewComponent {
  constructor({parentNode}) {
    super({
      parentNode,
      name: 'TimeMachineView',
      template: '<div class="TimeMachineView"></div>',
      shadow: TimeMachineView._shadow_,
      css: ''
    });


    this._bound._onTimer = this._onTimer.bind(this);

    this._state = {
      isWaybackMode: false,
      isSelecting: false,
    };

    this._currentTimestamp = Date.now();

    ZenzaWatch.debug.timeMachineView = this;

    window.setInterval(this._bound._onTimer, 3 * 1000);
  }

  _initDom(...args) {
    super._initDom(...args);

    const v = this._shadow || this._view;
    Object.assign(this._elm, {
      time: v.querySelector('.dateTime'),
      back: v.querySelector('.backToTheFuture'),
      input: v.querySelector('.dateTimeInput'),
      submit: v.querySelector('.dateTimeSubmit'),
      cancel: v.querySelector('.dateTimeCancel')
    });

    this._updateTimestamp();
    this._elm.time.addEventListener('click', this._toggle.bind(this));
    this._elm.back.addEventListener('mousedown', _.debounce(this._onBack.bind(this), 300));
    this._elm.submit.addEventListener('click', this._onSubmit.bind(this));
    this._elm.cancel.addEventListener('click', this._onCancel.bind(this));
  }

  update(threadInfo) {
    //window.console.info('TimeMachineView update', threadInfo);
    this._videoPostTime = threadInfo.threadId * 1000;
    const isWaybackMode = threadInfo.isWaybackMode;
    this.setState({isWaybackMode, isSelecting: false});

    if (isWaybackMode) {
      this._currentTimestamp = threadInfo.when * 1000;
    } else {
      this._currentTimestamp = Date.now();
    }
    this._updateTimestamp();
  }

  _updateTimestamp() {
    if (isNaN(this._currentTimestamp)) {
      return;
    }
    this._elm.time.textContent = this._currentTime = this._toDate(this._currentTimestamp);
  }

  openSelect() {
    const input = this._elm.input;
    const now = this._toTDate(Date.now());
    input.setAttribute('max', now);
    input.setAttribute('value', this._toTDate(this._currentTimestamp));
    input.setAttribute('min', this._toTDate(this._videoPostTime));
    this.setState({isSelecting: true});
    window.setTimeout(() => {
      input.focus();
    }, 0);
  }

  closeSelect() {
    this.setState({isSelecting: false});
  }

  _toggle() {
    if (this._state.isSelecting) {
      this.closeSelect();
    } else {
      this.openSelect();
    }
  }

  _onTimer() {
    if (this._state.isWaybackMode) {
      return;
    }
    let now = Date.now();
    let str = this._toDate(now);

    if (this._currentTime === str) {
      return;
    }
    this._currentTimestamp = now;
    this._updateTimestamp();
  }

  _padTime(time) {
    let pad = v => {
      return v.toString().padStart(2, '0');
    };
    let dt = new Date(time);
    return {
      yyyy: dt.getFullYear(),
      mm: pad(dt.getMonth() + 1),
      dd: pad(dt.getDate()),
      h: pad(dt.getHours()),
      m: pad(dt.getMinutes()),
      s: pad(dt.getSeconds())
    };
  }

  _toDate(time) {
    let {yyyy, mm, dd, h, m} = this._padTime(time);
    return `${yyyy}/${mm}/${dd} ${h}:${m}`;
  }

  _toTDate(time) {
    let {yyyy, mm, dd, h, m, s} = this._padTime(time);
    return `${yyyy}-${mm}-${dd}T${h}:${m}:${s}`;
  }

  _onSubmit() {
    const val = this._elm.input.value;
    if (!val || !/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(|:\d\d)$/.test(val)) {
      return;
    }
    const dt = new Date(val);
    const when =
      Math.floor(Math.max(dt.getTime(), this._videoPostTime) / 1000);
    this.emit('command', 'reloadComment', {when});
    this.closeSelect();
  }

  _onCancel() {
    this.closeSelect();
  }

  _onBack() {
    this.setState({isWaybackMode: false});
    this.closeSelect();
    this.emit('command', 'reloadComment', {when: 0});
  }
}

TimeMachineView._shadow_ = (`
    <style>
      .dateTime {
        display: inline-block;
        margin: auto 4px 4px;
        padding: 0 4px;
        border: 1px solid;
        background: #888;
        color: #000;
        font-size: 20px;
        line-height: 24px;
        font-family: monospace;
        cursor: pointer;
      }

      .is-WaybackMode .dateTime {
        background: #000;
        color: #888;
        box-shadow: 0 0 4px #ccc, 0 0 4px #ccc inset;
      }
      .reloadButton {
        display: inline-block;
        line-height: 24px;
        font-size: 16px;
        margin: auto 4px;
        cursor: pointer;
        user-select: none;
        transition: transform 0.1s;
      }

      .is-WaybackMode .reloadButton {
        display: none;
      }
        .reloadButton .icon {
          display: inline-block;
          transform: rotate(90deg) scale(1.3);
          transition: transform 1s, color 0.2s, text-shadow 0.2s;
          text-shadow: none;
          font-family: 'STIXGeneral';
          margin-right: 8px;
        }
        .reloadButton:hover {
          text-decoration: underline;
        }
        .reloadButton:active {
          color: #888;
          cursor: wait;
        }
        .reloadButton:active .icon {
          text-decoration: none;
          transform: rotate(-270deg) scale(2);
          transition: none;
          color: #ff0;
          text-shadow: 0 0 4px #ff8;
        }

      .backToTheFuture {
        display: none;
        line-height: 24px;
        font-size: 16px;
        margin: auto 4px;
        cursor: pointer;
        transition: transform 0.1s;
        user-select: none;
      }
      .backToTheFuture:hover {
        text-shadow: 0 0 8px #ffc;
        transform: translate(0, -2px);
      }
      .backToTheFuture:active {
        text-shadow: none;
        transform: translate(0px, -1000px);
      }

      .is-WaybackMode .backToTheFuture {
        display: inline-block;
      }

      .inputContainer {
        display: none;
        position: absolute;
        top: 32px;
        left: 4px;
        background: #333;
        box-shadow: 0 0 4px #fff;
      }
      .is-Selecting .inputContainer {
        display: block;
      }
        .dateTimeInput {
          display: block;
          font-size: 16px;
        }
        .submitContainer {
          text-align: right;
        }
          .dateTimeSubmit, .dateTimeCancel {
            display: inline-block;
            min-width: 50px;
            cursor: pointer;
            padding: 4px 8px;
            margin: 4px;
            border: 1px solid #888;
            text-align: center;
            transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
            user-select: none;
          }
          .dateTimeSubmit:hover, .dateTimeCancel:hover {
            background: #666;
            transform: translate(0, -2px);
            box-shadow: 0 4px 2px #000;
          }
          .dateTimeSubmit:active, .dateTimeCancel:active {
            background: #333;
            transform: translate(0, 0);
            box-shadow: 0 0 2px #000 inset;
          }

          .dateTimeSubmit {
          }
          .dateTimeCancel {
          }

    </style>
    <div class="root TimeMachine">
      <div class="dateTime" title="TimeMachine">0000/00/00 00:00</div>
      <div class="reloadButton command" data-command="reloadComment" data-param="0" title="コメントのリロード"><span class="icon">&#8635;</span>リロード</div>
      <div class="backToTheFuture" title="Back To The Future">&#11152; Back</div>
      <div class="inputContainer">
        <input type="datetime-local" class="dateTimeInput">
        <div class="submitContainer">
        <div class="dateTimeSubmit">G&nbsp;&nbsp;O</div>
        <div class="dateTimeCancel">Cancel</div>
        </div>
      </div>
    </div>
  `).trim();

TimeMachineView.__tpl__ = ('<div class="TimeMachineView"></div>').trim();


//===END===


export {
  CommentPanel
};
