var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};
var PopupMessage = {};

//===BEGIN===

  var CommentListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListModel.prototype, AsyncEmitter.prototype);
  _.assign(CommentListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._maxItems = params.maxItems || 100;
      this._currentSortKey = 'vpos';
      this._isDesc = false;
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }

    },
    clear: function() {
      this.setItem([]);
    },
    setChatList: function(chatList) {
      chatList = this._chat.top.concat(this._chat.naka, this._chat.bottom);
      var items = [];
      for (var i = 0, len = chatList.length; i < len; i++) {
        items = new CommentListItem(chatList[i]);
      }
      this._items = items;

      this.sort();
      this.emit('update', this._items, true);

    },
    insertItem: function(itemList, index) {
      //window.console.log('insertItem', itemList, index);
      itemList = _.isArray(itemList) ? itemList : [itemList];
      if (itemList.length < 1) { return; }
      index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));

      Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));

      if (this._isUniq) {
        _.each(itemList, function(i) { this.removeSameWatchId(i); }.bind(this));
      }

      this._items.splice(this._maxItems);

      this.sort();
      this.emit('update', this._items);

      return this.indexOf(itemList[0]);
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
        vpos: 'getVpos()',
        date: 'getDate()',
        text: 'getText()',
        user: 'getUserId()',
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
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var CommentListView = function() { this.initialize.apply(this, arguments); };
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
</style>
<style id="listItemStyle">%CSS%</style>
<body>
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

      this._model = params.model;
      if (this._model) {
        this._model.on('update',     _.debounce(_.bind(this._onModelUpdate, this), 100));
        this._model.on('itemUpdate', _.bind(this._onModelItemUpdate, this));
      }

      this._initializeView(params, 0);
    },
    _initializeView: function(params, retryCount) {
      var html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);

      var iframe = this._getIframe();
      iframe.className = 'videoListFrame';

      var onLoad = _.bind(this._onIframeLoad, this);
      var onResize = _.bind(this._onResize, this);
      var onScroll = _.bind(this._onScroll, this);
      var self = this;

      var onload = function() {
        var win, doc;
        iframe.onload = null;
        try {
          win = iframe.contentWindow;
          doc = iframe.contentWindow.document;
        } catch (e) {
          window.console.error(e);
          window.console.log('変な広告に乗っ取られました');
          iframe.remove();
          if (retryCount < 3) {
            self._initializeView(params, retryCount + 1);
          }
          return;
        }

        self._view = iframe;

        win.addEventListener('resize', function() {
          var w = win.innerWidth, h = win.innerHeight;
          onResize(w, h);
        });
        win.addEventListener('scroll', function() {
          onScroll(doc.body.scrollTop, doc.body.scrollLeft);
        });

        onLoad(win);
      };

      this._$container.append(iframe);
      if (iframe.srcdocType === 'string') {
        iframe.onload = onload;
        iframe.srcdoc = html;
      } else {
        // MS IE/Edge用
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
        window.setTimeout(onload, 0);
      }
    },
    _getIframe: function() {
      var reserved = document.getElementsByClassName('reservedFrame');
      var iframe;
      if (reserved && reserved.length > 0) {
        iframe = reserved[0];
        document.body.removeChild(iframe);
        iframe.style.position = '';
        iframe.style.left = '';
      } else {
        iframe = document.createElement('iframe');
      }

      try {
        iframe.srcdocType = iframe.srcdocType || typeof iframe.srcdoc;
        iframe.srcdoc = '<html></html>';
      } catch (e) {
        // 行儀の悪い広告にiframeを乗っ取られた？
        window.console.error('Error: ', e);
        this._retryGetIframeCount++;
        if (this._retryGetIframeCount < 5) {
          return this._getIframe();
        }
      }
      return iframe;
    },
    _onIframeLoad: function(w) {
      var doc = this._document = w.document;
      this._$window = $(w);
      var $body = this._$body = $(doc.body);
      if (this._className) {
        $body.addClass(this._className);
      }
      var $list = this._$list = $(doc.getElementById('listContainer'));
      if (this._html) {
        $list.html(this._html);
      }
      $body.on('click', _.bind(this._onClick, this));
      $body.on('keydown', function(e) {
        ZenzaWatch.emitter.emit('keydown', e);
      });

    },
    _onModelUpdate: function(itemList, replaceAll) {
      window.console.time('update commentlistView');
      this.addClass('updating');
      itemList = _.isArray(itemList) ? itemList: [itemList];
      var itemViews = [], Builder = this._ItemBuilder;

      if (replaceAll) { this._cache = {}; }

      _.each(itemList, _.bind(function (item) {
        var id = item.getItemId();
        if (this._cache[id]) {
          //window.console.log('from cache');
          itemViews.push(this._cache[id]);
        } else {
          var tpl = this._cache[id] = (new Builder({item: item})).toString();
          itemViews.push(tpl);
        }
      }, this));

      this._html = itemViews.join('');

      ZenzaWatch.util.callAsync(function() {
        if (this._$list) { this._$list.html(this._html); }
      }, this, 0);

      ZenzaWatch.util.callAsync(function() {
        this.removeClass('updating');
        this.emit('update');
      }, this, 100);
      window.console.timeEnd('update commentlistView');
    },
    _onModelItemUpdate: function(item, key, value) {
      //window.console.log('_onModelItemUpdate', item, item.getItemId(), item.getTitle(), key, value);
      if (!this._$body) { return; }
      var itemId = item.getItemId();
      var $item = this._$body.find('.videoItem.item' + itemId);

      this._cache[itemId] = (new this._ItemBuilder({item: item})).toString();
      if (key === 'active') {
        this._$body.find('.videoItem.active').removeClass('active');

        $item.toggleClass('active', value);
        //if (value) { this.scrollToItem(itemId); }

      } else if (key === 'updating' || key === 'played') {
        $item.toggleClass(key, value);
      } else {
        var $newItem = $(this._cache[itemId]);
        $item.before($newItem);
        $item.remove();
      }
    },
    _onClick: function(e) {
      e.stopPropagation();
      ZenzaWatch.emitter.emitAsync('hideHover');
      var $target = $(e.target).closest('.command');
      var $item = $(e.target).closest('.videoItem');
      if ($target.length > 0) {
        e.stopPropagation();
        e.preventDefault();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        var itemId  = $item.attr('data-item-id');
        switch (command) {
          case '':
            this.emit('seek', param, itemId);
            break;
         default:
            this.emit('command', command, param, itemId);
        }
      }
    },
    _onResize: function(width, height) {
      //window.console.log('resize videoList', width, height);
    },
    _onScroll: function(top, left) {
      //window.console.log('scroll videoList', top, left);
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
        this._$window.scrollTop(v);
      } else {
        return this._$window.scrollTop();
      }
    },
    scrollToItem: function(itemId) {
      if (!this._$body) { return; }
      if (_.isFunction(itemId.getItemId)) { itemId = itemId.getItemId(); }
      var $target = this._$body.find('.item' + itemId);
      if ($target.length < 1) { return; }
      var top = $target.offset().top;
      this.scrollTop(top);
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
      background: #333;
      overflow-x: hidden;
      counter-reset: video;
    }

    .scrollToTop {
      position: fixed;
      width: 32px;
      height: 32px;
      right: 8px;
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

    .scrollToTop:hover {
      opacity: 0.9;
      box-shadow: 0 0 8px #fff;
    }


    .commentListItem {
      position: relative;
      display: inline-block;
      width: 100%;
      height: 40px;
      line-height: 20px
      font-size: 20px;
      overflow: hidden;
    }

    .commentListItem.updating {
      opacity: 0.5;
      cursor: wait;
    }


    .commentListItem + .commentListItem {
    }

    .separator + .commentListItem {
      border-top: 1px dotted #333;
    }

    .commentListItem.active {
      outline: dashed 2px #ff8;
      outline-offset: 4px;
    }

  */});

  CommentListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="commentListItem %className% no%no% item%itemId% %active% %updating%"
      data-item-id="%itemId%"
      data-no="%no%" data-vpos"%vpos%>
      <p>
        <span class="no">%no%</span>:
        <span class="postedAt">%postedAt%</span>
        ID: <span class="userId">%userId%</span>
      </p>
      <p class="text" title="%text%">%text%</p>
    </div>
  */});

  _.assign(CommentListItemView.prototype, {
    initialize: function(params) {
      this._nicoChat = params.nicoChat;
    },
    build: function() {
      var tpl = CommentListItemView.__tpl__;
      var item = this._item;

      // 動画タイトルはあらかじめエスケープされている。
      // ・・・のだが、データのいいかげんさから見て、
      // 本当に全部やってあるの？って信用できない。(古い動画は特にいいかげん)
      // なので念のためescapeしておく。過剰エスケープになっても気にしない
      var title = ZenzaWatch.util.escapeToZenkaku(item.getTitle());

      var count = item.getCount();
      tpl = tpl
        .replace(/%active%/g,     item.isActive() ? 'active' : '')
        .replace(/%played%/g,     item.isPlayed() ? 'played' : '')
        .replace(/%updating%/g,   item.isUpdating() ? 'updating' : '')
        .replace(/%watchId%/g,    item.getWatchId())
        .replace(/%itemId%/g,     item.getItemId())
        .replace(/%postedAt%/g,   item.getPostedAt())
        .replace(/%videoTitle%/g, title)
        .replace(/%thumbnail%/g,  item.getThumbnail())
        .replace(/%duration%/g,   this._secToTime(item.getDuration()))
        .replace(/%viewCount%/g,    this._addComma(count.view))
        .replace(/%commentCount%/g, this._addComma(count.comment))
        .replace(/%mylistCount%/g,  this._addComma(count.mylist))
        .replace(/%className%/g, '')
        ;
      return tpl;
    },
    getWatchId: function() {
      return this._item.getWatchId();
    },
    toString: function() {
      return this.build();
    },
    _secToTime: function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    },
    _addComma: function(m) {
      return m.toLocaleString ? m.toLocaleString() : m;
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
      this._userId = nicoChat.getUserId();
      this._date = nicoChat.getDate();
      this._fork = nicoChat.getFork();
    },
    getItemId: function() {
      return this._itemId;
    },
    getVpos: function() {
      return this._vpos;
    },
    getText: function() {
      return this._text;
    },
    getUserId: function() {
      return this._userId;
    },
    getDate: function() {
      return this._date;
    },
    getFork: function() {
      return this._fork;
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
      this._view.on('deflistAdd', _.bind(this._onDeflistAdd, this));
      this._view.on('commentListAdd', _.bind(this._onCommentListAdd, this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new CommentListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._view.insertItem(items);
    },
    _onCommand: function(command, param) {
      if (command === 'select') {
        var item = this._model.findByItemId(param);
        var watchId = item.getWatchId();
        this.emit('command', 'open', watchId);
        return;
      }
      this.emit('command', command, param);
    },
    _onCommentListAdd: function(watchId , itemId) {
      this.emit('command', 'commentListAdd', watchId);
      if (this._isUpdatingCommentList) { return; }
      var item = this._model.findByItemId(itemId);

      var unlock = _.bind(function() {
        item.setIsUpdating(false);
        this._isUpdatingCommentList = false;
      }, this);

      item.setIsUpdating(true);
      this._isUpdatingCommentList = true;

      window.setTimeout(unlock, 1000);
    },
    _onDeflistAdd: function(watchId , itemId) {
      if (this._isUpdatingDeflist) { return; }
      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      var item = this._model.findByItemId(itemId);

      var unlock = _.bind(function() {
        item.setIsUpdating(false);
        this._isUpdatingDeflist = false;
      }, this);

      item.setIsUpdating(true);
      this._isUpdatingDeflist = true;

      var timer = window.setTimeout(unlock, 10000);

      var onSuccess = _.bind(this._onDeflistAddSuccess, this, timer, unlock);
      var onFail    = _.bind(this._onDeflistAddFail,    this, timer, unlock);
      return this._thumbInfoLoader.load(watchId).then(function(info) {
        var description = '投稿者: ' + info.owner.name;
        return this._mylistApiLoader.addDeflistItem(watchId, description)
          .then(onSuccess, onFail);
      }.bind(this), function() {
        return this._mylistApiLoader.addDeflistItem(watchId)
          .then(onSuccess, onFail);
      }.bind(this));
    },
    _onDeflistAddSuccess: function(timer, unlock, result) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 500);
      this.emit('command', 'notify', result.message);
    },
    _onDeflistAddFail: function(timer, unlock, err) {
      window.clearTimeout(timer);
      timer = window.setTimeout(unlock, 2000);
      this.emit('command', 'alert', err.message);
    }
  });


  var CommentListView = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentListView.prototype, AsyncEmitter.prototype);
  CommentListView.__css__ = ZenzaWatch.util.hereDoc(function() {/*

    .commentListEnable .tabSelect.commentList::after {
      content: '▶';
      color: #fff;
      text-shadow: 0 0 8px orange;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .commentListEnable .tabSelect.commentList::after  {
      text-shadow: 0 0 8px #336;
    }

    .commentList-container {
      height: 100%;
      overflow: hidden;
    }

    .commentList-header {
      height: 32px;
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .commentList-menu-button {
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 4px;
      background: #666;
      font-size: 16px;
      line-height: 28px;
      white-space: nowrap;
    }
    .commentList-menu-button:hover {
      border: 1px outset;
    }
    .commentList-menu-button:active {
      border: 1px inset;
    }
    .commentList-menu-button .commentList-menu-icon {
      font-size: 24px;
      line-height: 28px;
    }

    .commentList-container.enable .toggleEnable,
    .commentList-container.loop   .toggleLoop {
      text-shadow: 0 0 6px #f99;
      color: #ff9;
    }

    .commentList-container .shuffle {
      font-size: 14px;
    }
    .commentList-container .shuffle::after {
      content: '(´・ω・｀)';
    }
    .commentList-container .shuffle:hover::after {
      content: '(｀・ω・´)';
    }

    .commentList-frame {
      height: calc(100% - 32px);
      transition: opacity 0.3s;
    }
    .shuffle .commentList-frame {
      opacity: 0;
    }

    .commentList-count {
      position: absolute;
      right: 8px;
      display: inline-block;
      font-size: 14px;
      line-height: 32px;
      cursor: pointer;
    }

    .commentList-count:before {
      content: '▼';
    }
    .commentList-count:hover {
      text-decoration: underline;
    }
    .commentList-menu {
      position: absolute;
      right: 0px;
      top: 24px;
      min-width: 150px;
    }

    .commentList-menu li {
      line-height: 20px;
    }
  */});
  CommentListView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="commentList-container">
      <div class="commentList-header">
        <lavel class="commentList-menu-button toggleEnable commentList-command"
          data-command="toggleEnable"><icon class="commentList-menu-icon">▶</icon> 連続再生</lavel>
        <lavel class="commentList-menu-button toggleLoop commentList-command"
          data-command="toggleLoop"><icon class="commentList-menu-icon">&#8635;</icon> リピート</lavel>

        <div class="commentList-count commentList-command" data-command="toggleMenu">
          <span class="commentList-index"></span> / <span class="commentList-length"></span>
          <div class="zenzaPopupMenu commentList-menu">
            <div class="listInner">
            <ul>
              <li class="commentList-command" data-command="shuffle">
                シャッフル
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="postedAt">
                古い順に並べる
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="view:desc">
                再生の多い順に並べる
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="comment:desc">
                コメントの多い順に並べる
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="title">
                タイトル順に並べる
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="duration:desc">
                動画の長い順に並べる
              </li>
              <li class="commentList-command" data-command="sortBy" data-param="duration">
                動画の短い順に並べる
              </li>
              <hr class="separator">
              <li class="commentList-command" data-command="resetPlayedItemFlag">すべて未視聴にする</li>
              <li class="commentList-command" data-command="removePlayedItem">視聴済み動画を消す ●</li>
              <li class="commentList-command" data-command="removeNonActiveItem">リストの消去 ×</li>

            </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="commentList-frame"></div>
    </div>
  */});

  _.assign(CommentListView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._commentList = params.commentList;


      ZenzaWatch.util.addStyle(CommentListView.__css__);
      var $view = this._$view = $(CommentListView.__tpl__);
      this._$container.append($view);

      this._$index  = $view.find('.commentList-index');
      this._$length = $view.find('.commentList-length');
      var $menu = this._$menu = this._$view.find('.commentList-menu');

      ZenzaWatch.debug.commentListView = this._$view;

      var listView = this._listView = new CommentListView({
        $container: this._$view.find('.commentList-frame'),
        model: this._model,
        className: 'commentList',
        dragdrop: true,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      listView.on('command', _.bind(this._onCommand, this));
      listView.on('deflistAdd', _.bind(this._onDeflistAdd, this));
      listView.on('moveItem',
        _.bind(function(src, dest) { this.emit('moveItem', src, dest); }, this));

      this._commentList.on('update',
        _.debounce(_.bind(this._onCommentListStatusUpdate, this), 100));

      this._$view.on('click', '.commentList-command', _.bind(this._onCommentListCommandClick, this));
      ZenzaWatch.emitter.on('hideHover', function() {
        $menu.removeClass('show');
      });


      _.each([
        'addClass',
        'removeClass',
        'scrollTop',
        'scrollToItem',
      ], _.bind(function(func) {
        this[func] = _.bind(listView[func], listView);
      }, this));
    },
    toggleClass: function(className, v) {
      this._view.toggleClass(className, v);
      this._$view.toggleClass(className, v);
    },
    _onCommand: function(command, param, itemId) {
      switch (command) {
        default:
          this.emit('command', command, param, itemId);
          break;
      }
    },
    _onDeflistAdd: function(watchId, itemId) {
      this.emit('deflistAdd', watchId, itemId);
    },
    _onCommentListCommandClick: function(e) {
      var $target = $(e.target).closest('.commentList-command');
      var command = $target.attr('data-command');
      var param   = $target.attr('data-param');
      e.stopPropagation();
      if (!command) { return; }
      switch (command) {
        case 'toggleMenu':
          e.stopPropagation();
          e.preventDefault();
          this._$menu.addClass('show');
          return;
        case 'shuffle':
        case 'sortBy':
          var $view = this._$view;
          $view.addClass('shuffle');
          window.setTimeout(function() { this._$view.removeClass('shuffle'); }.bind(this), 1000);
          this.emit('command', command, param);
          break;
        default:
          this.emit('command', command, param);
      }
      ZenzaWatch.emitter.emitAsync('hideHover');
    },
    _onCommentListStatusUpdate: function() {
      var commentList = this._commentList;
      this._$view
        .toggleClass('enable', commentList.isEnable())
        .toggleClass('loop',   commentList.isLoop())
        ;
      this._$index.text(commentList.getIndex() + 1);
      this._$length.text(commentList.getLength());
    }
  });

  var CommentListSession = (function(storage) {
    var KEY = 'ZenzaWatchCommentList';
    
    return {
      isExist: function() { //return false;
        var data = storage.getItem(KEY);
        if (!data) { return false; }
        try {
          JSON.parse(data);
          return true;
        } catch(e) {
          return false;
        }
      },
      save: function(data) {
        storage.setItem(KEY, JSON.stringify(data));
      },
      restore: function() {
        var data = storage.getItem(KEY);
        if (!data) { return null; }
        try {
          return JSON.parse(data);
        } catch(e) {
          return null;
        }
      }
    };
  })(sessionStorage);


  var CommentList = function() { this.initialize.apply(this, arguments); };
  _.extend(CommentList.prototype, CommentList.prototype);
  _.assign(CommentList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._index = -1;
      this._isEnable = false;
      this._isLoop = params.loop;

      this._model = new CommentListModel({});

      ZenzaWatch.debug.commentList = this;
      this.on('update', _.debounce(_.bind(function() {
        var data = this.serialize();
        CommentListSession.save(data);
      }, this), 3000));
    },
    serialize: function() {
      return {
        items: this._model.serialize(),
        index: this._index,
        enable: this._isEnable,
        loop: this._isLoop
      };
    },
    unserialize: function(data) {
      if (!data) { return; }
      this._initializeView();
      window.console.log('unserialize: ', data);
      this._model.unserialize(data.items);
      this._isEnable = data.enable;
      this._isLoop   = data.loop;
      this.emit('update');
      this.setIndex(data.index);
    },
    restoreFromSession: function() {
      this.unserialize(CommentListSession.restore());
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new CommentListView({
        $container: this._$container,
        model: this._model,
        commentList: this,
        builder: CommentListItemView,
        itemCss: CommentListItemView.__css__
      });
      this._view.on('command',    _.bind(this._onCommand, this));
      this._view.on('deflistAdd', _.bind(this._onDeflistAdd, this));
      this._view.on('moveItem',   _.bind(this._onMoveItem, this));
    },
    _onCommand: function(command, param, itemId) {
      var item;
      switch (command) {
        case 'toggleScroll':
          //this.toggleScroll();
          break;
       case 'sortBy':
          //var tmp = param.split(':');
          //this.sortBy(tmp[0], tmp[1] === 'desc');
          break;
       case 'select':
          item = this._model.findByItemId(itemId);
          var vpos = item.getVpos();
          this.emit('command', 'seek', vpos / 100);
          break;
        default:
          this.emit('command', command, param);
      }
    },
    _setItemData: function(listData) {
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new CommentListItem(itemData));
      });
      //window.console.log('_setItemData', listData);
      this._model.setItem(items);
      this.setIndex(items.length > 0 ? 0 : -1);
    },
    setChatList: function(chatList) {
      if (!this._model) { return; }
      this._model.setChatList(chatList);
    },
    getLength: function() {
      return this._model.getLength();
    },
    isEnable: function() {
      return this._isEnable;
    },
    toggleEnable: function(v) {
      if (!_.isBoolean(v)) {
        this._isEnable = !this._isEnable;
        this.emit('update');
        return;
      }

      if (this._isEnable !== v) {
        this._isEnable = v;
        this.emit('update');
      }
    },
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      this._refreshIndex(true);
      //ZenzaWatch.util.callAsync(function() {
      //  this._view.scrollToItem(this._activeItem);
      //}, this, 1000);
    },
    setCurrentTime: function(sec) {
      if (!this._view) {
        return;
      }
      if (this._model.getSortKey() !== 'vpos') {
        return;
      }
      this._view.setCurrentTime(sec);
    }
  });

//===END===

