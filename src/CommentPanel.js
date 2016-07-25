var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};
var FrameLayer = function() {};
var PopupMessage = {};

//===BEGIN===

  var CommentListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListModel.prototype, AsyncEmitter.prototype);
  _.assign(CommentListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._positions = [];
      this._maxItems = params.maxItems || 100;
      this._currentSortKey = 'vpos';
      this._isDesc = false;
      this._currentTime = 0;
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
    },
    clear: function() {
      this._items = [];
      this._positions = [];
      this._currentTime = 0;
      this.emit('update', [], true);
    },
    setChatList: function(chatList) {
      chatList = chatList.top.concat(chatList.naka, chatList.bottom);
      var items = [];
      var positions = [];
      for (var i = 0, len = chatList.length; i < len; i++) {
        items.push(new CommentListItem(chatList[i]));
        positions.push(parseFloat(chatList[i].getVpos(), 10) / 100);
      }
      this._items = items;
      this._positions = positions.sort(function(a, b) { return a - b; });
      this._currentTime = 0;

      //window.console.log(this._positions);
      this.sort();
      this.emit('update', this._items, true);

    },
    removeItemByIndex: function(index) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      this._items = _.reject(this._items, function(item) { return item === target; });
    },
    getLength: function() {
      return this._items.length;
    },
    _getItemByIndex: function(index) {
      var item = this._items[index];
      return item;
    },
    indexOf: function(item) {
      return _.indexOf(this._items, item);
    },
    getItemByIndex: function(index) {
      var item = this._getItemByIndex(index);
      if (!item) { return null; }
      if (!item.hasBind) {
        item.hasBind = true;
        item.on('update', _.bind(this._onItemUpdate, this, item));
      }
      return item;
    },
    findByItemId: function(itemId) {
      itemId = parseInt(itemId, 10);
      return _.find(this._items, function(item) {
        if (item.getItemId() === itemId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', _.bind(this._onItemUpdate, this, item));
          }
          return true;
        }
      }.bind(this));
    },
    removeItem: function(item) {
      var beforeLen = this._items.length;
      _.pull(this._items, item);
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    _onItemUpdate: function(item, key, value) {
      this.emit('itemUpdate', item, key, value);
    },
    sortBy: function(key, isDesc) {
      var table = {
        vpos: 'getVpos',
        date: 'getDate',
        text: 'getText',
        user: 'getUserId',
      };
      var func = table[key];
      if (!func) { return; }
      this._items = _.sortBy(this._items, function(item) { return item[func](); });
      if (isDesc) {
        this._items.reverse();
      }
      this._currentSortKey = key;
      this._isDesc = isDesc;
      this.onUpdate();
    },
    sort: function() {
      this.sortBy(this._currentSortKey, this._isDesc);
    },
    getCurrentSortKey: function() {
      return this._currentSortKey;
    },
    onUpdate: function() {
      this.emitAsync('update', this._items);
    },
    getInViewIndex: function(sec) {
      return Math.max(0, _.sortedLastIndex(this._positions, sec + 1) - 1);
    },
    setCurrentTime: function(sec) {
      if (this._currentTime !== sec && _.isNumber(sec)) {
        this._currentTime = sec;
        if (this._currentSortKey === 'vpos') {
          this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
        }// else { window.console.log('sort: ', this._currentSortKey); }
      }
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var CommentListView = function() { this.initialize.apply(this, arguments); };
  CommentListView.ITEM_HEIGHT = 40;

  _.extend(CommentListView.prototype, AsyncEmitter.prototype);
  CommentListView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
  */});

  CommentListView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
  body {
    -webkit-user-select: none;
    -moz-user-select: none;
  }

  body.scrolling #listContainer *{
    pointer-events: none;
  }

</style>
<style id="listItemStyle">%CSS%</style>
<body>
<div class="listMenu">
  <span class="menuButton clipBoard"        data-command="clipBoard" title="クリップボードにコピー">copy</span>
  <span class="menuButton addUserIdFilter"  data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
  <span class="menuButton addWordFilter"    data-command="addWordFilter" title="NGワード">NGword</span>
</div>
<div id="listContainer">
</div>
</body>
</html>

  */});

  _.extend(CommentListView.prototype, AsyncEmitter.prototype);
  _.assign(CommentListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder || CommentListItemView;
      this._itemCss     = params.itemCss || CommentListItemView.__css__;
      this._className   = params.className || 'commentList';
      this._$container  = params.$container;

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
    _initializeView: function(params) {
      var html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
      this._frame = new FrameLayer({
        $container: params.$container,
        html: html,
        className: 'commentListFrame'
      });
      this._frame.on('load', this._onIframeLoad.bind(this));
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      var $win  = this._$window = $(w);
      var $body = this._$body = $(doc.body);
      if (this._className) {
        $body.addClass(this._className);
      }
      var $list = this._$list = $(doc.getElementById('listContainer'));
      if (this._html) {
        $list.html(this._html);
        this._$items = this._$body.find('.commentListItem');
      }
      this._$menu = $body.find('.listMenu');

      $body
        .on('click',     this._onClick    .bind(this))
        .on('dblclick',  this._onDblClick .bind(this))
//        .on('mousemove', _.debounce(this._onMouseMove.bind(this), 100))
        .on('mouseover', this._onMouseOver.bind(this))
        .on('mouseleave', this._onMouseOut .bind(this))
        .on('keydown', function(e) { ZenzaWatch.emitter.emit('keydown', e); });

      this._$menu.on('click', this._onMenuClick.bind(this));

      $win
        .on('scroll', this._onScroll.bind(this))
        .on('scroll', _.debounce(this._onScrollEnd.bind(this), 500))
        .on('resize', this._onResize.bind(this));

      this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
      this._appendNewItems = ZenzaWatch.util.createDrawCallFunc(this._appendNewItems.bind(this));

      this._$begin = $('<span class="begin"/>');
      this._$end   = $('<span class="end"/>');
      ZenzaWatch.debug.$commentList = $list;
    },
    _onModelUpdate: function(itemList, replaceAll) {
      window.console.time('update commentlistView');
      this.addClass('updating');
      itemList = _.isArray(itemList) ? itemList: [itemList];
      var itemViews = [], Builder = this._ItemBuilder;
      this._lastEndPoint = null;
      this._isActive = false;
      this._$items = null;

      if (replaceAll) {
        this._scrollTop = 0;
      }

      _.each(itemList, function (item, i) {
        itemViews.push(new Builder({item: item, index: i, height: CommentListView.ITEM_HEIGHT}));
      });

      this._itemViews = itemViews;
      this._inviewItemList = {};
      this._$newItems = null;

      ZenzaWatch.util.callAsync(function() {
        if (this._$list) {
          this._$list.html('');
          this._$list.css({'height': CommentListView.ITEM_HEIGHT * itemViews.length});
          this._$items = this._$body.find('.commentListItem');
          this._$menu.removeClass('show');
          this._refreshInviewElements();
        }
      }, this, 0);

      ZenzaWatch.util.callAsync(function() {
        this.removeClass('updating');
        this.emit('update');
      }, this, 100);


      window.console.timeEnd('update commentlistView');
    },
    _onClick: function(e) {
      e.stopPropagation();
      ZenzaWatch.emitter.emitAsync('hideHover');
      var $item = $(e.target).closest('.commentListItem');
      if ($item.length > 0) { return this._onItemClick($item); }
    },
    _onItemClick: function($item) {
      //var offset = $item.offset();
      this._$menu
        .css('top', $item.attr('data-top') + 'px')
        .attr('data-item-id', $item.attr('data-item-id'))
        .addClass('show');
    },
    _onMenuClick: function(e) {
      var $target = $(e.target).closest('.menuButton');
      this._$menu.removeClass('show');
      if ($target.length < 1) { return; }
      var itemId = $target.closest('.listMenu').attr('data-item-id');
      if ($target.length < 1) { return; }
      if (!itemId) { return; }

      var command = $target.attr('data-command');

      if (command === 'addUserIdFilter' || command === 'addWordFilter') {
        this._$list.find('.item' + itemId).hide();
      }

      this.emit('command', command, null, itemId);
    },
    _onDblClick: function(e) {
      e.stopPropagation();
      var $item = $(e.target).closest('.commentListItem');
      if ($item.length < 0) { return; }
      e.preventDefault();

      var itemId = $item.attr('data-item-id');
      this.emit('command', 'select', null, itemId);
    },
    _onMouseMove: function() {
    },
    _onMouseOver: function() {
      //window.console.info('Active!');
      this._isActive = true;
      this._$body.addClass('active');
    },
    _onMouseOut: function() {
      //window.console.info('Blur!');
      this._isActive = false;
      this._$body.removeClass('active');
    },
    _onResize: function() {
      this._refreshInviewElements();
    },
    _onScroll: function() {
      if (!this._$body.hasClass('scrolling')) { this._$body.addClass('scrolling'); }
      this._refreshInviewElements();
    },
    _onScrollEnd: function() {
      this._$body.removeClass('scrolling');
    },
    _refreshInviewElements: function() {
      if (!this._$list) { return; }
      var itemHeight = CommentListView.ITEM_HEIGHT;
      var $win = this._$window;
      var scrollTop   = $win.scrollTop();
      var innerHeight = $win.innerHeight();
      if (innerHeight > window.innerHeight) { return; }
      var windowBottom = scrollTop + innerHeight;
      var itemViews = this._itemViews;
      var startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
      var endIndex   = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
      var i;

      var newItems = [], inviewItemList = this._inviewItemList;
      for (i = startIndex; i < endIndex; i++) {
        if (inviewItemList[i] || !itemViews[i]) { continue; }
        newItems.push(itemViews[i].toString());
        inviewItemList[i] = itemViews[i].getDomId();
      }

      if (newItems.length < 1) { return; }

      // 見えないitemを除去。 見えない場所なのでrequestAnimationFrame不要
      var $list = this._$list;
      _.each(Object.keys(inviewItemList), function(i) {
        if (i >= startIndex && i <= endIndex) { return; }
        $list.find('#' + inviewItemList[i]).remove();
        delete inviewItemList[i];
      });

      this._inviewItemList = inviewItemList;


      //window.console.log('_refreshInviewElements: ',
      //  scrollTop, windowBottom, startIndex, endIndex, newItems.length);

      var $newItems = $(newItems.join(''));
      if (this._$newItems) {
        this._$newItems.append($newItems);
      } else {
        this._$newItems = $newItems;
      }

      this._appendNewItems();
    },
    _appendNewItems: function() {
      if (this._$newItems) {
        this._$list.append(this._$newItems);
      }
      this._$newItems = null;
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      if (!this._$body) { return; }
      this._$body.toggleClass(className, v);
    },
    scrollTop: function(v) {
      if (!this._$window) { return 0; }

      if (typeof v === 'number') {
        this._scrollTop = v;
        this._$window.scrollTop(v);
      } else {
        this._scrollTop = this._$window.scrollTop();
        return this._scrollTop;
      }
    },
    scrollToItem: function(itemId) {
      if (!this._$body) { return; }
      if (_.isFunction(itemId.getItemId)) { itemId = itemId.getItemId(); }
      var $target = this._$body.find('.item' + itemId);
      if ($target.length < 1) { return; }
      var top = $target.offset().top;
      this.scrollTop(top);
    },
    setCurrentPoint: function(idx) {
      if (!this._$window) { return; }
      var innerHeight = this._$window.innerHeight();
      var itemViews = this._itemViews;
      var len  = itemViews.length;
      var view = itemViews[idx];
      if (len < 1 || !view) { return; }

      if (!this._isActive) {
        var itemHeight = CommentListView.ITEM_HEIGHT;
        var top = view.getTop();
        this.scrollTop(Math.max(0, top - innerHeight + itemHeight));
      }
    }
  });

  // なんか汎用性を持たせようとして失敗してる奴
  var CommentListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListItemView.prototype, AsyncEmitter.prototype);

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  CommentListItemView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    * {
      box-sizing: border-box;
    }

    body {
      background: #000;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      overflow-y: scroll;
      line-height: 0;
    }

    body::-webkit-scrollbar {
      background: #222;
    }

    body::-webkit-scrollbar-thumb {
      border-radius: 0;
      background: #666;
    }

    body::-webkit-scrollbar-button {
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
      transform: translate(4px, 4px);
    }

    .listMenu .addUserIdFilter {
      right: 8px;
      width: 48px;
    }
    .listMenu .addWordFilter {
      right: 64px;
      width: 48px;
    }

    .listMenu .clipBoard {
      right: 120px;
      width: 48px;
    }

    .commentListItem {
      position: absolute;
      display: inline-block;
      width: 100%;
      height: 40px;
      line-height: 20px;
      font-size: 20px;
      {*overflow: hidden;*}
      white-space: nowrap;
      margin: 0;
      padding: 0;
      background: #222;
{*pointer-events: none;*}
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
      overflow-y: visible;
      z-index: 60;
      height: auto;
      box-shadow: 2px 2px 0 #000;
    }

    .active .commentListItem:hover .text {
      white-space: normal;
      word-break: break-all;
      overflow-y: visible;
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


    .commentListItem + .commentListItem {
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


  */});

  CommentListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div id="item%itemId%" class="commentListItem no%no% item%itemId% %updating% fork%fork% %odd-even%"
      data-item-id="%itemId%"
      data-no="%no%" data-vpos"%vpos%"
        style="top: %top%px;" data-top="%top%"
data-title="%no%: %date% ID:%userId%
  %text%"
      >
      <p class="info">
        <span class="timepos">%timepos%</span>&nbsp;&nbsp;<span class="date">%date%</span>
      </p>
      <p class="text" style="%shadow%">%trimText%</p>
    </div>
  */});

  _.assign(CommentListItemView.prototype, {
    initialize: function(params) {
      this._item   = params.item;
      this._index  = params.index;
      this._height = params.height;

      this._id = CommentListItemView.counter++;
    },
    build: function() {
      var tpl = CommentListItemView.__tpl__;
      var item = this._item;

      var text = item.getEscapedText();
      var trimText = text.trim();

      tpl = tpl
        .replace(/%domId%/g,    'item' + this._id)
        .replace(/%no%/g,       item.getNo())
        .replace(/%vpos%/g,     item.getVpos())
        .replace(/%fork%/g,     item.getFork())
        .replace(/%timepos%/g,  item.getTimePos())
        .replace(/%itemId%/g,   item.getItemId())
        .replace(/%userId%/g,   item.getUserId())
        .replace(/%date%/g,     item.getFormattedDate())
        .replace(/%text%/g,     text)
        .replace(/%trimText%/g, trimText)
        .replace(/%odd-even%/g, (this._index % 2 === 0) ? 'even' : 'odd')
        .replace(/%top%/g,      this._index * this._height)
        ;
      var color = item.getColor();
      if (color) {
        tpl = tpl.replace('%shadow%', 'text-shadow: 0px 0px 2px ' + color + ';');
      } else {
        tpl = tpl.replace('%shadow%', '');
      }
      return tpl;
    },
    getItemId: function() {
      return this._item.getItemId();
    },
    getDomId: function() {
      return 'item' + this._item.getItemId();
    },
    getTop: function() {
      return this._index * this._height;
    },
    toString: function() {
      return this.build();
    }
  });

  var CommentListItem = function() { this.initialize.apply(this, arguments); };
  CommentListItem._itemId = 0;

  _.extend(CommentListItem.prototype, AsyncEmitter.prototype);
  _.assign(CommentListItem.prototype, {
    initialize: function(nicoChat) {
      this._nicoChat = nicoChat;
      this._itemId = CommentListItem._itemId++;
      this._vpos = nicoChat.getVpos();
      this._text = nicoChat.getText();
      this._escapedText = ZenzaWatch.util.escapeHtml(this._text);
      this._userId = nicoChat.getUserId();
      this._date = nicoChat.getDate();
      this._fork = nicoChat.getFork();
      this._no = nicoChat.getNo();
      this._color = nicoChat.getColor();

      var dt = new Date(this._date * 1000);
      this._formattedDate =
        dt.getFullYear() + '/' +
        ('0' + (dt.getMonth() + 1)).slice(-2) + '/' +
        ('0' + dt.getDate())       .slice(-2) + ' ' +
        ('0' + dt.getHours())      .slice(-2) + ':' +
        ('0' + dt.getMinutes())    .slice(-2);

      var sec = this._vpos / 100;
      var m = (Math.floor(sec / 60) + 100).toString().substr(1);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      this._timePos = m + ':' + s;
    },
    getItemId: function() {
      return this._itemId;
    },
    getVpos: function() {
      return this._vpos;
    },
    getTimePos: function() {
      return this._timePos;
    },
    getText: function() {
      return this._text;
    },
    getEscapedText: function() {
      return this._escapedText;
    },
    getUserId: function() {
      return this._userId;
    },
    getColor: function() {
      return this._color;
    },
    getDate: function() {
      return this._date;
    },
    getFormattedDate: function() {
      return this._formattedDate;
    },
    getFork: function() {
      return this._fork;
    },
    getNo: function() {
      return this._no;
    }
  });

  var CommentList = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentList.prototype, AsyncEmitter.prototype);
  _.assign(CommentList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._model = new CommentListModel({
        uniq: true,
        maxItem: 100
      });

      this._initializeView();
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new CommentListView({
        $container: this._$container,
        model: this._model,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      this._view.on('command', _.bind(this._onCommand, this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new CommentListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._view.insertItem(items);
    },
    _onCommand: function(command, param, itemId) {
      this.emit('command', command, param, itemId);
    }
  });


  var CommentPanelView = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPanelView.prototype, AsyncEmitter.prototype);
  CommentPanelView.__css__ = ZenzaWatch.util.hereDoc(function() {/*


    .commentPanel-container {
      height: 100%;
      overflow: hidden;
    }

    .commentPanel-header {
      height: 32px;
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
      height: calc(100% - 32px);
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

  */});

  CommentPanelView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="commentPanel-container">
      <div class="commentPanel-header">
        <lavel class="commentPanel-menu-button autoScroll commentPanel-command"
          data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</lavel>

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
              <li class="commentPanel-command reloadComment" data-command="reloadComment">
                コメントのリロード
              </li>
            </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="commentPanel-frame"></div>
    </div>
  */});

  _.assign(CommentPanelView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._commentPanel = params.commentPanel;


      ZenzaWatch.util.addStyle(CommentPanelView.__css__);
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
      listView.on('command', _.bind(this._onCommand, this));

      this._commentPanel.on('update',
        _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
      this._onCommentPanelStatusUpdate();

      this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));

      this._$view.on('click', '.commentPanel-command', this._onCommentListCommandClick.bind(this));
      ZenzaWatch.emitter.on('hideHover', function() {
        $menu.removeClass('show');
      });

    },
    toggleClass: function(className, v) {
      this._view.toggleClass(className, v);
      this._$view.toggleClass(className, v);
    },
    _onModelCurrentTimeUpdate: function(sec, viewIndex) {
      if (!this._$view || !this._$view.is(':visible')) { return; }

      this._lastCurrentTime = sec;
      this._listView.setCurrentPoint(viewIndex);
    },
    _onCommand: function(command, param, itemId) {
      switch (command) {
        default:
          this.emit('command', command, param, itemId);
          break;
      }
    },
    _onCommentListCommandClick: function(e) {
      var $target = $(e.target).closest('.commentPanel-command');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      e.stopPropagation();
      if (!command) { return; }

      var $view = this._$view;
      var setUpdating = function() {
        $view.addClass('updating');
        window.setTimeout(function() {
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
    _onCommentPanelStatusUpdate: function() {
      var commentPanel = this._commentPanel;
      this._$view
        .toggleClass('autoScroll', commentPanel.isAutoScroll())
        ;
    }
  });


  var CommentPanel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentPanel.prototype, AsyncEmitter.prototype);
  _.assign(CommentPanel.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;
      var player = this._player = params.player;

      this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;

      this._model = new CommentListModel({});

      player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
      player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
      player.on('open',  this._onPlayerOpen.bind(this));
      player.on('close', this._onPlayerClose.bind(this));

      ZenzaWatch.debug.commentPanel = this;
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new CommentPanelView({
        $container: this._$container,
        model: this._model,
        commentPanel: this,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      this._view.on('command', _.bind(this._onCommand, this));
    },
    startTimer: function() {
      this.stopTimer();
      this._timer = window.setInterval(this._onTimer.bind(this), 200);
    },
    stopTimer: function() {
      if (this._timer) {
        window.clearInterval(this._timer);
        this._timer = null;
      }
    },
    _onTimer: function() {
      if (this._autoScroll) {
        this.setCurrentTime(this._player.getCurrentTime());
      }
    },
    _onCommand: function(command, param, itemId) {
      //window.console.log('CommentPanel.onCommand: ', command, param, itemId);
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
        default:
          this.emit('command', command, param);
      }
    },
    _onCommentParsed: function() {
      this._initializeView();
      this.setChatList(this._player.getChatList());
      this.startTimer();
    },
    _onCommentChange: function() {
      this._initializeView();
      this.setChatList(this._player.getChatList());
    },
    _onPlayerOpen: function() {
      this._model.clear();
    },
    _onPlayerClose: function() {
      this._model.clear();
      this.stopTimer();
    },
    setChatList: function(chatList) {
      if (!this._model) { return; }
      this._model.setChatList(chatList);
    },
    isAutoScroll: function() {
      return this._autoScroll;
    },
    toggleScroll: function(v) {
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
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      if (key !== 'vpos') {
        this.toggleScroll(false);
      }
    },
    setCurrentTime: function(sec) {
      if (!this._view) {
        return;
      }
      if (!this._autoScroll) {
        return;
      }
      this._model.setCurrentTime(sec);
    }
  });

//===END===

