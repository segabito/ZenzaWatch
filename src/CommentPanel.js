import _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {AsyncEmitter, BaseViewComponent, FrameLayer, util} from './util';

//===BEGIN===

var CommentListModel = function () {
  this.initialize.apply(this, arguments);
};
_.extend(CommentListModel.prototype, AsyncEmitter.prototype);
_.assign(CommentListModel.prototype, {
  initialize: function (params) {
    this._isUniq = params.uniq;
    this._items = [];
    this._positions = [];
    this._maxItems = params.maxItems || 100;
    this._currentSortKey = 'vpos';
    this._isDesc = false;
    this._currentTime = 0;
  },
  setItem: function (itemList) {
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    this._items = itemList;
  },
  clear: function () {
    this._items = [];
    this._positions = [];
    this._currentTime = 0;
    this.emit('update', [], true);
  },
  setChatList: function (chatList) {
    chatList = chatList.top.concat(chatList.naka, chatList.bottom);
    var items = [];
    var positions = [];
    for (var i = 0, len = chatList.length; i < len; i++) {
      items.push(new CommentListItem(chatList[i]));
      positions.push(parseFloat(chatList[i].getVpos(), 10) / 100);
    }
    this._items = items;
    this._positions = positions.sort((a, b) => {
      return a - b;
    });
    this._currentTime = 0;

    this.sort();
    this.emit('update', this._items, true);
  },
  removeItemByIndex: function (index) {
    var target = this._getItemByIndex(index);
    if (!target) {
      return;
    }
    this._items = _.reject(this._items, item => {
      return item === target;
    });
  },
  getLength: function () {
    return this._items.length;
  },
  _getItemByIndex: function (index) {
    var item = this._items[index];
    return item;
  },
  indexOf: function (item) {
    return (this._items || []).indexOf(item);
  },
  getItemByIndex: function (index) {
    var item = this._getItemByIndex(index);
    if (!item) {
      return null;
    }
    return item;
  },
  findByItemId: function (itemId) {
    itemId = parseInt(itemId, 10);
    return _.find(this._items, (item) => {
      if (item.getItemId() === itemId) {
        return true;
      }
    });
  },
  removeItem: function (item) {
    var beforeLen = this._items.length;
    _.pull(this._items, item);
    var afterLen = this._items.length;
    if (beforeLen !== afterLen) {
      this.emit('update', this._items);
    }
  },
  _onItemUpdate: function (item, key, value) {
    this.emit('itemUpdate', item, key, value);
  },
  sortBy: function (key, isDesc) {
    var table = {
      vpos: 'getVpos',
      date: 'getDate',
      text: 'getText',
      user: 'getUserId',
    };
    var func = table[key];
    if (!func) {
      return;
    }
    this._items = _.sortBy(this._items, function (item) {
      return item[func]();
    });
    if (isDesc) {
      this._items.reverse();
    }
    this._currentSortKey = key;
    this._isDesc = isDesc;
    this.onUpdate();
  },
  sort: function () {
    this.sortBy(this._currentSortKey, this._isDesc);
  },
  getCurrentSortKey: function () {
    return this._currentSortKey;
  },
  onUpdate: function () {
    this.emitAsync('update', this._items);
  },
  getInViewIndex: function (sec) {
    return Math.max(0, util.sortedLastIndex(this._positions, sec + 1) - 1);
  },
  setCurrentTime: function (sec) {
    if (this._currentTime !== sec && typeof sec === 'number') {
      this._currentTime = sec;
      if (this._currentSortKey === 'vpos') {
        this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
      }
    }
  }
});

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
var CommentListView = function () {
  this.initialize.apply(this, arguments);
};
CommentListView.ITEM_HEIGHT = 40;

_.extend(CommentListView.prototype, AsyncEmitter.prototype);
CommentListView.__css__ = '';

CommentListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
  body {
    user-select: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
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
    overflow-y: auto;
    font-size: 14px;
    transform: translate(-50%, -50%);
    opacity: 0;
    pointer-events: none;
    z-index: 100;
    border: 2px solid #fc9;
    background-color: rgba(255, 255, 232, 0.9);
    box-shadow: 4px 4px 0 rgba(99, 99, 66, 0.8);
    transition: 0.2s opacity;
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
<body>
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
      <span class="menuButton addUserIdFilter forMember"  data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
      <span class="menuButton addWordFilter forMember"    data-command="addWordFilter" title="NGワード">NGword</span>

    </div>

    <div id="listContainerInner"></div>
  </div>
</body>
</html>

  `).trim();

_.extend(CommentListView.prototype, AsyncEmitter.prototype);
_.assign(CommentListView.prototype, {
  initialize: function (params) {
    this._ItemView = CommentListItemView;
    this._itemCss = CommentListItemView.CSS;
    this._className = params.className || 'commentList';
    this._$container = params.$container;

    this._retryGetIframeCount = 0;

    this._cache = {};
    this._maxItems = 100000;
    this._scrollTop = 0;

    this._model = params.model;
    if (this._model) {
      this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 500));
    }

    this.scrollTop = ZenzaWatch.util.createDrawCallFunc(this.scrollTop.bind(this));
    this._initializeView(params, 0);
  },
  _initializeView: function (params) {
    var html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
    this._frame = new FrameLayer({
      $container: params.$container,
      html: html,
      className: 'commentListFrame'
    });
    this._frame.on('load', this._onIframeLoad.bind(this));
  },
  _onIframeLoad: function (w) {
    var doc = this._document = w.document;
    this._window = w; //$(w);
    var body = this._body = doc.body;
    var $body = this._$body = $(body);
    if (this._className) {
      body.classList.add(this._className);
    }
    this._$container = $body.find('#listContainer');
    var $list = this._$list = $(doc.getElementById('listContainerInner'));
    if (this._html) {
      $list.html(this._html);
    }
    this._$menu = $body.find('.listMenu');

    this._$itemDetail = $body.find('.itemDetailContainer');

    $body
      .on('click', this._onClick.bind(this))
      .on('dblclick', this._onDblClick.bind(this))
      .on('keydown', e => {
        ZenzaWatch.emitter.emit('keydown', e);
      })
      .on('keyup', e => {
        ZenzaWatch.emitter.emit('keyup', e);
      })
      .toggleClass('is-guest', !util.isLogin());

    this._$menu.on('click', this._onMenuClick.bind(this));
    this._$itemDetail.on('click', this._onItemDetailClick.bind(this));

    this._$container
      .on('mouseover', this._onMouseOver.bind(this))
      .on('mouseleave', this._onMouseOut.bind(this));
    this._$container[0].addEventListener('scroll',
      this._onScroll.bind(this), {passive: true});
    this._debouncedOnScrollEnd = _.debounce(this._onScrollEnd.bind(this), 500);

    w.addEventListener('resize', this._onResize.bind(this));
    this._innerHeight = w.innerHeight;

    this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
    this._appendNewItems = util.createDrawCallFunc(this._appendNewItems.bind(this));

    this._debouncedOnItemClick = _.debounce(this._onItemClick.bind(this), 300);
    this._$begin = $('<span class="begin"/>');
    this._$end = $('<span class="end"/>');

    // 互換用
    ZenzaWatch.debug.$commentList = $list;
    ZenzaWatch.debug.getCommentPanelItems = () => {
      return Array.from(doc.querySelectorAll('.commentListItem'));
    };
  },
  _onModelUpdate: function (itemList, replaceAll) {
    window.console.time('update commentlistView');
    this.addClass('updating');
    itemList = Array.isArray(itemList) ? itemList : [itemList];
    let itemViews = [];
    this._lastEndPoint = null;
    this._isActive = false;

    if (replaceAll) {
      this._scrollTop = 0;
    }

    itemList.forEach((item, i) => {
      itemViews.push(new this._ItemView({item: item, index: i, height: CommentListView.ITEM_HEIGHT}));
    });

    this._itemViews = itemViews;
    this._inviewItemList = {};
    this._newItems = null;

    window.setTimeout(() => {
      if (this._$list) {
        this._$list.html('');
        this._$list.css({'height': CommentListView.ITEM_HEIGHT * itemViews.length + 100});
        this._$menu.removeClass('show');
        this._refreshInviewElements();
        this.hideItemDetail();
      }
    }, 0);

    window.setTimeout(() => {
      this.removeClass('updating');
      this.emit('update');
    }, 100);

    window.console.timeEnd('update commentlistView');
  },
  _onClick: function (e) {
    e.stopPropagation();
    ZenzaWatch.emitter.emitAsync('hideHover');
    var $item = $(e.target).closest('.commentListItem');
    if ($item.length > 0) {
      return this._debouncedOnItemClick($item);
    }
  },
  _onItemClick: function ($item) {
    this._$menu
      .css('top', $item.attr('data-top') + 'px')
      .attr('data-item-id', $item.attr('data-item-id'))
      .addClass('show');
  },
  _onMenuClick: function (e) {
    var $target = $(e.target).closest('.menuButton');
    this._$menu.removeClass('show');
    if ($target.length < 1) {
      return;
    }
    var itemId = $target.closest('.listMenu').attr('data-item-id');
    if ($target.length < 1) {
      return;
    }
    if (!itemId) {
      return;
    }

    var command = $target.attr('data-command');

    if (command === 'addUserIdFilter' || command === 'addWordFilter') {
      this._$list.find('.item' + itemId).hide();
    }

    this.emit('command', command, null, itemId);
  },
  _onItemDetailClick: function (e) {
    let $target = $(e.target).closest('.command');
    if ($target.length < 1) {
      return;
    }
    let itemId = this._$itemDetail.attr('data-item-id');
    if (!itemId) {
      return;
    }
    let command = $target.attr('data-command');
    let param = $target.attr('data-param');
    if (command === 'hideItemDetail') {
      return this.hideItemDetail();
    }
    if (command === 'reloadComment') {
      this.hideItemDetail();
    }
    this.emit('command', command, param, itemId);
  },
  _onDblClick: function (e) {
    e.stopPropagation();
    var $item = $(e.target).closest('.commentListItem');
    if ($item.length < 0) {
      return;
    }
    e.preventDefault();

    var itemId = $item.attr('data-item-id');
    this.emit('command', 'select', null, itemId);
  },
  _onMouseMove: function () {
  },
  _onMouseOver: function () {
    //window.console.info('Active!');
    this._isActive = true;
    this.addClass('active');
  },
  _onMouseOut: function () {
    //window.console.info('Blur!');
    this._isActive = false;
    this.removeClass('active');
  },
  _onResize: function () {
    this._innerHeight = this._window.innerHeight;
    this._refreshInviewElements();
  },
  _onScroll: function () {
    if (!this.hasClass('is-scrolling')) {
      this.addClass('is-scrolling');
    }
    this._refreshInviewElements();
    this._debouncedOnScrollEnd();
  },
  _onScrollEnd: function () {
    this.removeClass('is-scrolling');
  },
  _refreshInviewElements: function () {
    if (!this._$list) {
      return;
    }
    let itemHeight = CommentListView.ITEM_HEIGHT;
    let $container = this._$container;
    let scrollTop = $container.scrollTop();
    let innerHeight = this._innerHeight;
    //if (innerHeight > window.innerHeight) { return; }
    let windowBottom = scrollTop + innerHeight;
    let itemViews = this._itemViews;
    let startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
    let endIndex = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
    let i;

    const newItems = [], inviewItemList = this._inviewItemList;
    for (i = startIndex; i < endIndex; i++) {
      if (inviewItemList[i] || !itemViews[i]) {
        continue;
      }
      newItems.push(itemViews[i]);
      inviewItemList[i] = itemViews[i];
    }

    if (newItems.length < 1) {
      return;
    }

    Object.keys(inviewItemList).forEach(i => {
      if (i >= startIndex && i <= endIndex) {
        return;
      }
      inviewItemList[i].remove();
      delete inviewItemList[i];
    });

    this._inviewItemList = inviewItemList;


    this._newItems = this._newItems ? this._newItems.concat(newItems) : newItems;


    this._appendNewItems();
  },
  _appendNewItems: function () {
    if (this._newItems) {
      const f = document.createDocumentFragment();
      this._newItems.forEach(i => {
        f.appendChild(i.getViewElement());
      });
      this._$list[0].appendChild(f);
    }
    this._newItems = null;
  },
  addClass: function (className) {
    this.toggleClass(className, true);
  },
  removeClass: function (className) {
    this.toggleClass(className, false);
  },
  toggleClass: function (className, v) {
    if (!this._body) {
      return;
    }
    this._body.classList.toggle(className, v);
  },
  hasClass: function (className) {
    return this._body.classList.contains(className);
  },
  find: function (query) {
    return this._document.querySelectorAll(query);
  },
  scrollTop: function (v) {
    if (!this._window) {
      return 0;
    }

    if (typeof v === 'number') {
      this._scrollTop = v;
      this._$container[0].scrollTop = v;
    } else {
      this._scrollTop = this._$container[0].scrollTop;
      return this._scrollTop;
    }
  },
  scrollToItem: function (itemId) {
    if (!this._$body) {
      return;
    }
    if (typeof itemId.getItemId === 'function') {
      itemId = itemId.getItemId();
    }

    // scrollIntoViewIfNeed() があればそれでいいかも
    var $target = this._$body.find('.item' + itemId);
    if ($target.length < 1) {
      return;
    }
    var top = $target.offset().top;
    this.scrollTop(top);
  },
  setCurrentPoint: function (idx) {
    if (!this._window || !this._itemViews) {
      return;
    }
    var innerHeight = this._innerHeight;
    var itemViews = this._itemViews;
    var len = itemViews.length;
    var view = itemViews[idx];
    if (len < 1 || !view) {
      return;
    }

    if (!this._isActive) {
      var itemHeight = CommentListView.ITEM_HEIGHT;
      var top = view.getTop();
      this.scrollTop(Math.max(0, top - innerHeight + itemHeight));
    }
  },
  showItemDetail: function (item) {
    let $d = this._$itemDetail;
    $d.attr('data-item-id', item.getItemId());
    $d.find('.resNo').text(item.getNo()).end()
      .find('.vpos').text(item.getTimePos()).end()
      .find('.time').text(item.getFormattedDate()).end()
      .find('.userId').text(item.getUserId()).end()
      .find('.cmd').text(item.getCmd()).end()
      .find('.text').text(item.getText()).end()
      .addClass('show');
    ZenzaWatch.debug.$itemDetail = $d;
  },
  hideItemDetail: function () {
    this._$itemDetail.removeClass('show');
  }
});

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

      #listContainer::-webkit-scrollbar {
        background: #222;
      }

      #listContainer::-webkit-scrollbar-thumb {
        border-radius: 0;
        background: #666;
      }

      #listContainer::-webkit-scrollbar-button {
        background: #666;
        display: none;
      }


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
        font-family: arial, 'Menlo';
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
        /*overflow-x: hidden;
        overflow-y: visible;*/
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


      .commentListItem.active {
        outline: dashed 2px #ff8;
        outline-offset: 4px;
      }

      .font-gothic .text {font-family: "游ゴシック", "Yu Gothic", 'YuGothic', "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
      .font-mincho .text {font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, Osaka-mono, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;}
      .font-defont .text {font-family: 'Yu Gothic', 'YuGothic', "ＭＳ ゴシック", "MS Gothic", "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }
      

    `).trim();


  const TPL = (`
      <div class="commentListItem">
        <p class="info">
          <span class="timepos"></span>&nbsp;&nbsp;<span class="date"></span>
        </p>
        <p class="text"></p>
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

      const formattedDate = item.getFormattedDate();
      commentListItem.setAttribute('id', this.getDomId());
      commentListItem.setAttribute('data-item-id', item.getItemId());
      commentListItem.setAttribute('data-no', item.getNo());
      commentListItem.setAttribute('data-vpos', item.getVpos());
      commentListItem.setAttribute('data-top', this.getTop());
      commentListItem.setAttribute('data-title',
        `${item.getNo()}: ${formattedDate} ID:${item.getUserId()}\n${item.getText()}`
      );
      const font = item.getFontCommand() || 'default';
      commentListItem.className =
        `commentListItem no${item.getNo()} item${this._id} ${oden} fork${item.getFork()} font-${font}`;
      commentListItem.style.top = `${this.getTop()}px`;

      timepos.textContent = item.getTimePos();
      date.textContent = formattedDate;
      text.textContent = item.getText().trim();

      const color = item.getColor();
      text.style.textShadow = color ? `0px 0px 2px ${color}` : '';
      this._view = template.clone();
    }

    getViewElement() {
      if (!this._view) {
        this.build();
      }
      return this._view;
    }

    getItemId() {
      return this._item.getItemId();
    }

    getDomId() {
      return 'item' + this._item.getItemId();
    }

    getTop() {
      return this._index * this._height;
    }

    remove() {
      if (!this._view) {
        return;
      }
      this._view.remove();
    }

    toString() {
      return this.getViewElement().outerHTML;
    }
  }

  CommentListItemView.TPL = TPL;
  CommentListItemView.CSS = CSS;
  return CommentListItemView;
})();

var CommentListItem = function () {
  this.initialize.apply(this, arguments);
};
CommentListItem._itemId = 0;

_.extend(CommentListItem.prototype, AsyncEmitter.prototype);
_.assign(CommentListItem.prototype, {
  initialize: function (nicoChat) {
    this._nicoChat = nicoChat;
    this._itemId = CommentListItem._itemId++;
    this._vpos = nicoChat.getVpos();
    this._text = nicoChat.getText();
    this._escapedText = util.escapeHtml(this._text);
    this._userId = nicoChat.getUserId();
    this._date = nicoChat.getDate();
    this._fork = nicoChat.getFork();
    this._no = nicoChat.getNo();
    this._color = nicoChat.getColor();
    this._fontCommand = nicoChat.getFontCommand();

    this._formattedDate = util.dateToString(this._date * 1000);
    let sec = this._vpos / 100;
    this._timePos = util.secToTime(sec);
  },
  getItemId: function () {
    return this._itemId;
  },
  getVpos: function () {
    return this._vpos;
  },
  getTimePos: function () {
    return this._timePos;
  },
  getCmd: function () {
    return this._nicoChat.getCmd();
  },
  getText: function () {
    return this._text;
  },
  getEscapedText: function () {
    return this._escapedText;
  },
  getUserId: function () {
    return this._userId;
  },
  getColor: function () {
    return this._color;
  },
  getDate: function () {
    return this._date;
  },
  getTime: function () {
    return this._date * 1000;
  },
  getFormattedDate: function () {
    return this._formattedDate;
  },
  getFork: function () {
    return this._fork;
  },
  getNo: function () {
    return this._no;
  },
  getFontCommand: function () {
    return this._fontCommand;
  }
});

var CommentList = function () {
  this.initialize.apply(this, arguments);
};
_.extend(CommentList.prototype, AsyncEmitter.prototype);
_.assign(CommentList.prototype, {
  initialize: function (params) {
    this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
    this._$container = params.$container;

    this._model = new CommentListModel({
      uniq: true,
      maxItem: 100
    });

    this._initializeView();
  },
  _initializeView: function () {
    if (this._view) {
      return;
    }
    this._view = new CommentListView({
      $container: this._$container,
      model: this._model
    });
    this._view.on('command', this._onCommand.bind(this));
  },
  update: function (listData, watchId) {
    if (!this._view) {
      this._initializeView();
    }
    this._watchId = watchId;
    var items = [];
    listData.forEach(itemData => {
      items.push(new CommentListItem(itemData));
    });
    if (items.length < 1) {
      return;
    }
    this._view.insertItem(items);
  },
  _onCommand: function (command, param, itemId) {
    this.emit('command', command, param, itemId);
  }
});


var CommentPanelView = function () {
  this.initialize.apply(this, arguments);
};
_.extend(CommentPanelView.prototype, AsyncEmitter.prototype);
CommentPanelView.__css__ = (`
    :root {
      --zenza-comment-panel-header-height: 64px;
    }

    .commentPanel-container {
      height: 100%;
      overflow: hidden;
    }

    .commentPanel-header {
      height: var(--zenza-comment-panel-header-height);
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .commentPanel-menu-button {
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


  `).trim();

CommentPanelView.__tpl__ = (`
    <div class="commentPanel-container">
      <div class="commentPanel-header">
        <label class="commentPanel-menu-button autoScroll commentPanel-command"
          data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</label>

        <div class="commentPanel-command commentPanel-menu-toggle" data-command="toggleMenu">
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
      <div class="timeMachineContainer forMember"></div>
      </div>
      <div class="commentPanel-frame"></div>
    </div>
  `).trim();

_.assign(CommentPanelView.prototype, {
  initialize: function (params) {
    this._$container = params.$container;
    this._model = params.model;
    this._commentPanel = params.commentPanel;


    util.addStyle(CommentPanelView.__css__);
    var $view = this._$view = $(CommentPanelView.__tpl__);
    this._$container.append($view);

    var $menu = this._$menu = this._$view.find('.commentPanel-menu');

    ZenzaWatch.debug.commentPanelView = this;

    var listView = this._listView = new CommentListView({
      $container: this._$view.find('.commentPanel-frame'),
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
      _.debounce((item) => {
        listView.showItemDetail(item);
      }, 100));
    this._onCommentPanelStatusUpdate();

    this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));

    this._$view.on('click', '.commentPanel-command', this._onCommentListCommandClick.bind(this));


    ZenzaWatch.emitter.on('hideHover', () => {
      $menu.removeClass('show');
    });

  },
  toggleClass: function (className, v) {
    this._view.toggleClass(className, v);
    this._$view.toggleClass(className, v);
  },
  _onModelCurrentTimeUpdate: function (sec, viewIndex) {
    if (!this._$view || !this._$view.is(':visible')) {
      return;
    }

    this._lastCurrentTime = sec;
    this._listView.setCurrentPoint(viewIndex);
  },
  _onCommand: function (command, param, itemId) {
    switch (command) {
      default:
        this.emit('command', command, param, itemId);
        break;
    }
  },
  _onCommentListCommandClick: function (e) {
    var $target = $(e.target).closest('.commentPanel-command');
    var command = $target.attr('data-command');
    var param = $target.attr('data-param');
    e.stopPropagation();
    if (!command) {
      return;
    }

    var $view = this._$view;
    var setUpdating = () => {
      $view.addClass('updating');
      window.setTimeout(() => {
        $view.removeClass('updating');
      }, 1000);
    };

    switch (command) {
      case 'toggleMenu':
        e.stopPropagation();
        e.preventDefault();
        this._$menu.addClass('show');
        return;
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
  },
  _onThreadInfo(threadInfo) {
    this._timeMachineView.update(threadInfo);
  },
  _onCommentPanelStatusUpdate: function () {
    let commentPanel = this._commentPanel;
    const $view = this._$view
      .toggleClass('autoScroll', commentPanel.isAutoScroll());

    const langClass = 'lang-' + commentPanel.getLanguage();
    if (!$view.hasClass(langClass)) {
      $view.removeClass('lang-ja_JP lang-en_US lang-zh_TW').addClass(langClass);
    }
  }
});


var CommentPanel = function () {
  this.initialize.apply(this, arguments);
};
_.extend(CommentPanel.prototype, AsyncEmitter.prototype);
_.assign(CommentPanel.prototype, {
  initialize: function (params) {
    this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
    this._$container = params.$container;
    var player = this._player = params.player;

    this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;

    this._model = new CommentListModel({});
    this._language = params.language || 'ja_JP';

    player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
    player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
    player.on('commentReady', _.debounce(this._onCommentReady.bind(this), 500));
    player.on('open', this._onPlayerOpen.bind(this));
    player.on('close', this._onPlayerClose.bind(this));

    ZenzaWatch.debug.commentPanel = this;
  },
  _initializeView: function () {
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
  },
  startTimer: function () {
    this.stopTimer();
    this._timer = window.setInterval(this._onTimer.bind(this), 200);
  },
  stopTimer: function () {
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  },
  _onTimer: function () {
    if (this._autoScroll) {
      this.setCurrentTime(this._player.getCurrentTime());
    }
  },
  _onCommand: function (command, param, itemId) {
    var item;
    if (itemId) {
      item = this._model.findByItemId(itemId);
    }
    switch (command) {
      case 'toggleScroll':
        this.toggleScroll();
        break;
      case 'sortBy':
        var tmp = param.split(':');
        this.sortBy(tmp[0], tmp[1] === 'desc');
        break;
      case 'select':
        var vpos = item.getVpos();
        this.emit('command', 'seek', vpos / 100);
        // TODO: コメント強調
        break;
      case 'clipBoard':
        ZenzaWatch.util.copyToClipBoard(item.getText());
        this.emit('command', 'notify', 'クリップボードにコピーしました');
        break;
      case 'addUserIdFilter':
        this._model.removeItem(item);
        this.emit('command', command, item.getUserId());
        break;
      case 'addWordFilter':
        this._model.removeItem(item);
        this.emit('command', command, item.getText());
        break;
      case 'reloadComment':
        if (item) {
          param = {};
          let dt = new Date(item.getTime());
          this.emit('command', 'notify', item.getFormattedDate() + '頃のログ');
          //window.console.log('when!', dt.getTime(), item);
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
  },
  _onCommentParsed: function (language) {
    this.setLanguage(language);
    this._initializeView();
    this.setChatList(this._player.getChatList());
    this.startTimer();
  },
  _onCommentChange: function (language) {
    this.setLanguage(language);
    this._initializeView();
    this.setChatList(this._player.getChatList());
  },
  _onCommentReady: function (result, threadInfo) {
    this._threadInfo = threadInfo;
    this.emit('threadInfo', threadInfo);
  },
  _onPlayerOpen: function () {
    this._model.clear();
  },
  _onPlayerClose: function () {
    this._model.clear();
    this.stopTimer();
  },
  setChatList: function (chatList) {
    if (!this._model) {
      return;
    }
    this._model.setChatList(chatList);
  },
  isAutoScroll: function () {
    return this._autoScroll;
  },
  getLanguage: function () {
    return this._language || 'ja_JP';
  },
  getThreadInfo: function () {
    return this._threadInfo;
  },
  setLanguage: function (lang) {
    if (lang !== this._language) {
      this._language = lang;
      this.emit('update');
    }
  },
  toggleScroll: function (v) {
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
  },
  sortBy: function (key, isDesc) {
    this._model.sortBy(key, isDesc);
    if (key !== 'vpos') {
      this.toggleScroll(false);
    }
  },
  setCurrentTime: function (sec) {
    if (!this._view) {
      return;
    }
    if (!this._autoScroll) {
      return;
    }
    this._model.setCurrentTime(sec);
  }
});

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

TimeMachineView.__tpl__ = ('<div class="TimeMachineView forMember"></div>').trim();


//===END===


export {
  CommentPanel
};
