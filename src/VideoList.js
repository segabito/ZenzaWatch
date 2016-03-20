var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};
var PopupMessage = {};

//===BEGIN===

  var VideoListModel = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListModel.prototype, AsyncEmitter.prototype);
  _.assign(VideoListModel.prototype, {
    initialize: function(params) {
      //this._$container = params.$container;
      this._isUniq = params.uniq;
      this._items = [];
      this._maxItems = params.maxItems || 100;
    },
    setItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];

      this._items = itemList;
      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }

      this.emit('update', this._items, true);
    },
    clear: function() {
      this.setItem([]);
    },
    insertItem: function(itemList, index) {
      //window.console.log('insertItem', itemList, index);
      itemList = _.isArray(itemList) ? itemList : [itemList];
      if (itemList.length < 1) { return; }
      index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));

      Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));

      if (this._isUniq) {
        _.each(itemList, (i) => { this.removeSameWatchId(i); });
      }

      this._items.splice(this._maxItems);
      this.emit('update', this._items);

      return this.indexOf(itemList[0]);
    },
    appendItem: function(itemList) {
      itemList = _.isArray(itemList) ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      this._items = this._items.concat(itemList);

      if (this._isUniq) {
        this._items =
          _.uniq(this._items, false, function(item) { return item.getWatchId(); });
      }
      //this._items.splice(this._maxItems);
      while (this._items.length > this._maxItems) { this._items.shift(); }
      this.emit('update', this._items);

      return this._items.length - 1;
    },
    removeItemByIndex: function(index) {
      var target = this._getItemByIndex(index);
      if (!target) { return; }
      this._items = _.reject(this._items, function(item) { return item === target; });
    },
    removePlayedItem: function() {
      var beforeLen = this._items.length;
      this._items =
        _.reject(this._items, function(item) { return !item.isActive() && item.isPlayed(); });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    shuffle: function() {
      this._items = _.shuffle(this._items);
      this.emit('update', this._items);
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
      return _.find(this._items, (item) => {
        if (item.getItemId() === itemId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', _.bind(this._onItemUpdate, this, item));
          }
          return true;
        }
      });
    },
    findByWatchId: function(watchId) {
      watchId = watchId + '';
      return _.find(this._items, (item) => {
        if (item.getWatchId() === watchId) {
          if (!item.hasBind) {
            item.hasBind = true;
            item.on('update', _.bind(this._onItemUpdate, this, item));
          }
          return true;
        }
      });
    },
    removeItem: function(item) {
      var beforeLen = this._items.length;
      _.pull(this._items, item);
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update', this._items);
      }
    },
    /**
     * パラメータで指定されたitemと同じwatchIdのitemを削除
     */
    removeSameWatchId: function(item) {
      var watchId = item.getWatchId();
      var beforeLen = this._items.length;
      _.remove(this._items, function(i) {
        return item !== i && i.getWatchId() === watchId;
      });
      var afterLen = this._items.length;
      if (beforeLen !== afterLen) {
        this.emit('update');
      }
    },
    _onItemUpdate: function(item, key, value) {
      this.emit('itemUpdate', item, key, value);
    },
    getTotalDuration: function() {
      return _.reduce(this._items, function(result, item) {
        return result + item.getDuration();
      }, 0);
    },
    serialize: function() {
      return _.reduce(this._items, function(result, item) {
        result.push(item.serialize());
        return result;
      }, []);
    },
    unserialize: function(itemDataList) {
      var items = [];
      _.each(itemDataList, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      this.setItem(items);
    },
    sortBy: function(key, isDesc) {
      var table = {
        watchId:  'getWatchId',
        duration: 'getDuration',
        title:    'getTitle',
        comment:  'getCommentCount',
        mylist:   'getMylistCount',
        view:     'getViewCount',
        postedAt: 'getPostedAt',
      };
      var func = table[key];
      //window.console.log('sortBy', key, func, isDesc);
      if (!func) { return; }
      this._items = _.sortBy(this._items, function(item) { return item[func](); });
      if (isDesc) {
        this._items.reverse();
      }
      this.onUpdate();
    },
    onUpdate: function() {
      this.emitAsync('update', this._items);
    }
  });

/**
 * DOM的に隔離したiframeの中に生成する。
 * かなり実験要素が多いのでまだまだ変わる。
 */
  var VideoListView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  VideoListView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
  */});

  VideoListView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
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
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>

  */});

  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  _.assign(VideoListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder || VideoListItemView;
      this._itemCss     = params.itemCss || VideoListItemView.__css__;
      this._className   = params.className || 'videoList';
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._cache = {};
      this._maxItems = params.max || 100;

      this._model = params.model;
      if (this._model) {
        this._model.on('update',     _.debounce(_.bind(this._onModelUpdate, this), 100));
        this._model.on('itemUpdate', _.bind(this._onModelItemUpdate, this));
      }

      this._initializeView(params, 0);
    },
    _initializeView: function(params, retryCount) {
      var html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);

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
      window.console.time('update playlistView');
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
      window.console.timeEnd('update playlistView');
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
          case 'deflistAdd':
            this.emit('deflistAdd', param, itemId);
            break;
          case 'playlistAdd':
            this.emit('playlistAdd', param, itemId);
            break;
          case 'scrollToTop':
            this.scrollTop(0, 300);
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
  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);

  // ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
  VideoListItemView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    * {
      box-sizing: border-box;
    }

    body {
      background: #333;
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



    .videoItem {
      position: relative;
      display: inline-block;
      width: 100%;
      min-height: 88px;
      overflow: hidden;
    }

    .videoItem.updating {
      opacity: 0.5;
      cursor: wait;
    }


    .videoItem + .videoItem {
      border-top: 1px dotted #888;
      margin-top: 16px;
      outline-offset: 8px;
    }

    .videoItem .thumbnailContainer {
      position: absolute;
      top: 0;
      left: 0;
      width:  96px;
      height: 72px;
      margin: 8px 0;
      transition: box-shaow 0.4s ease, outline 0.4s ease, transform 0.4s ease;
    }
    .videoItem .thumbnailContainer:active {
      box-shadow: 0 0 8px #f99;
      transform: translate(0, 4px);
      transition: none;
    }

    .videoItem .thumbnailContainer .thumbnail {
      width:  96px;
      height: 72px;
    }

    .videoItem .thumbnailContainer .playlistAdd,
    .videoItem .playlistRemove,
    .videoItem .thumbnailContainer .deflistAdd {
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

      color: #fff;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .videoItem .thumbnailContainer .playlistAdd {
      left: 0;
      bottom: 0;
    }
    .videoItem .playlistRemove {
      right: 8px;
      top: 0;
    }
    .videoItem .thumbnailContainer .deflistAdd {
      right: 0;
      bottom: 0;
    }
    .playlist .videoItem .playlistAdd {
      display: none !important;
    }
    .videoItem .playlistRemove {
      display: none;
    }
    .playlist .videoItem:not(.active):hover .playlistRemove {
      display: inline-block;
    }


    .playlist .videoItem:not(.active):hover .playlistRemove,
    .videoItem:hover .thumbnailContainer .playlistAdd,
    .videoItem:hover .thumbnailContainer .deflistAdd {
      display: inline-block;
      border: 1px outset;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:hover,
    .videoItem:hover .thumbnailContainer .playlistAdd:hover,
    .videoItem:hover .thumbnailContainer .deflistAdd:hover {
      transform: scale(1.5);
      box-shadow: 2px 2px 2px #000;
    }

    .playlist .videoItem:not(.active):hover .playlistRemove:active,
    .videoItem:hover .thumbnailContainer .playlistAdd:active,
    .videoItem:hover .thumbnailContainer .deflistAdd:active {
      transform: scale(0.9);
      border: 1px inset;
    }

    .videoItem.updating .thumbnailContainer .deflistAdd {
      transform: scale(1.0) !important;
      border: 1px inset !important;
      pointer-events: none;
    }

    .videoItem .thumbnailContainer .duration {
      position: absolute;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      font-size: 12px;
      color: #fff;
    }
    .videoItem:hover .thumbnailContainer .duration {
      display: none;
    }
    .videoItem .videoInfo {
      top: 0;
      margin-left: 104px;
    }

    .videoItem .postedAt {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem.played .postedAt::after {
      content: ' ●';
      font-size: 10px;
    }


    .videoItem .videoLink {
      font-size: 14px;
      color: #ff9;
      transition: background 0.4s ease, color 0.4s ease;
    }
    .videoItem .videoLink:visited {
      color: #ffd;
    }

    .videoItem .videoLink:active {
      color: #fff;
      background: #663;
      transition: none;
    }


    .videoItem.noVideoCounter .counter {
      display: none;
    }
    .videoItem .counter {
      font-size: 12px;
      color: #ccc;
    }
    .videoItem .counter .value {
      font-weight: bolder;
    }
    .videoItem .counter .count {
      white-space: nowrap;
    }
    .videoItem .counter .count + .count {
      margin-left: 8px;
    }

    .videoItem.active {
      outline: dashed 2px #ff8;
      outline-offset: 4px;
    }

    @media screen and (min-width: 640px)
    {
      .videoItem {
        width: calc(100% / 2 - 16px);
        margin: 0 8px;
        border-top: none !important;
        border-bottom: 1px dotted #888;
      }
    }
    @media screen and (min-width: 900px) {
      .videoItem {
        width: calc(100% / 3 - 16px);
      }
    }
    @media screen and (min-width: 1200px) {
      .videoItem {
        width: calc(100% / 4 - 16px);
      }
    }


  */});

  VideoListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoItem %className% watch%watchId% item%itemId% %active% %updating% %played%"
      data-item-id="%itemId%"
      data-watch-id="%watchId%">
      <span class="command playlistRemove" data-command="playlistRemove" data-param="%watchId%" title="プレイリストから削除">×</span>
      <div class="thumbnailContainer">
        <a href="//www.nicovideo.jp/watch/%watchId%" class="command" data-command="select" data-param="%itemId%">
          <img class="thumbnail" data-src="%thumbnail%" src="%thumbnail%">
          <span class="duration">%duration%</span>
          <span class="command playlistAdd" data-command="playlistAdd" data-param="%watchId%" title="プレイリストに追加">▶</span>
          <span class="command deflistAdd" data-command="deflistAdd" data-param="%watchId%" title="とりあえずマイリスト">&#x271A;</span>
        </a>
      </div>
      <div class="videoInfo">
        <div class="postedAt">%postedAt%</div>
        <div class="title">
          <a href="//www.nicovideo.jp/watch/%watchId%" class="command videoLink" data-command="select" data-param="%itemId%">
            %videoTitle%
          </a>
        </div>
        <div class="counter">
          <span class="count">再生: <span class="value">%viewCount%</span></span>
          <span class="count">コメ: <span class="value">%commentCount%</span></span>
          <span class="count">マイ: <span class="value">%mylistCount%</span></span>
        </div>
      </div>
    </div>
  */});

  _.assign(VideoListItemView.prototype, {
    initialize: function(params) {
      this.watchId = params.watchId;
      this._item = params.item;
    },
    build: function() {
      var tpl = VideoListItemView.__tpl__;
      var item = this._item;

      var count = item.getCount();
      tpl = tpl
        .replace(/%active%/g,     item.isActive() ? 'active' : '')
        .replace(/%played%/g,     item.isPlayed() ? 'played' : '')
        .replace(/%updating%/g,   item.isUpdating() ? 'updating' : '')
        .replace(/%watchId%/g,    item.getWatchId())
        .replace(/%itemId%/g,     item.getItemId())
        .replace(/%postedAt%/g,   item.getPostedAt())
        .replace(/%videoTitle%/g, item.getTitle())
        .replace(/%thumbnail%/g,  item.getThumbnail())
        .replace(/%duration%/g,   this._secToTime(item.getDuration()))
        .replace(/%viewCount%/g,     this._addComma(count.view))
        .replace(/%commentCount%/g,  this._addComma(count.comment))
        .replace(/%mylistCount%/g,   this._addComma(count.mylist))
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

  var VideoListItem = function() { this.initialize.apply(this, arguments); };
  VideoListItem._itemId = 0;
  VideoListItem.createByThumbInfo = function(info) {
    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.id,
      title:          info.title,
      length_seconds: info.duration,
      num_res:        info.commentCount,
      mylist_counter: info.mylistCount,
      view_counter:   info.viewCount,
      thumbnail_url:  info.thumbnail,
      first_retrieve: info.postedAt,

      tags:           info.tagList,
      movieType:      info.movieType,
      owner:          info.owner,
      lastResBody:    info.lastResBody
    });
  };

  VideoListItem.createBlankInfo = function(id) {
    var postedAt = '0000/00/00 00:00:00';
    if (!isNaN(id)) {
      postedAt = (new Date(id * 1000)).toLocaleString();
    }
    return new VideoListItem({
      _format:        'blank',
      id:             id,
      title:          id + '(動画情報不明)',
      length_seconds: 0,
      num_res:        0,
      mylist_counter: 0,
      view_counter:   0,
      thumbnail_url:  'http://uni.res.nimg.jp/img/user/thumb/blank_s.jpg',
      first_retrieve: postedAt,
    });
  };

  VideoListItem.createByMylistItem = function(item) {
    if (item.item_data) {
      var item_data = item.item_data || {};
      return new VideoListItem({
        _format:        'mylistItemOldApi',
        id:             item_data.watch_id,
        title:          item_data.title,
        length_seconds: item_data.length_seconds,
        num_res:        item_data.num_res,
        mylist_counter: item_data.mylist_counter,
        view_counter:   item_data.view_counter,
        thumbnail_url:  item_data.thumbnail_url,
        first_retrieve: (new Date(item_data.first_retrieve * 1000)).toLocaleString(),

        videoId:        item_data.video_id,
        lastResBody:    item_data.last_res_body,
        mylistItemId:   item.item_id,
        item_type:      item.item_type
      });
    }
    return new VideoListItem({
      _format:        'mylistItemRiapi',
      id:             item.id,
      title:          item.title,
      length_seconds: item.length_seconds,
      num_res:        item.num_res,
      mylist_counter: item.mylist_counter,
      view_counter:   item.view_counter,
      thumbnail_url:  item.thumbnail_url,
      first_retrieve: item.first_retrieve,

      lastResBody:    item.last_res_body,
    });
  };

  VideoListItem.createByVideoInfoModel = function(info) {
    var count = info.getCount();

    return new VideoListItem({
      _format:        'thumbInfo',
      id:             info.getWatchId(),
      title:          info.getTitle(),
      length_seconds: info.getDuration(),
      num_res:        count.comment,
      mylist_counter: count.mylist,
      view_counter:   count.view,
      thumbnail_url:  info.getThumbnail(),
      first_retrieve: info.getPostedAt(),

      owner:          info.getOwnerInfo()
    });
  };


  _.extend(VideoListItem.prototype, AsyncEmitter.prototype);
  _.assign(VideoListItem.prototype, {
    initialize: function(rawData) {
      this._rawData = rawData;
      this._itemId = VideoListItem._itemId++;
      this._isActive = false;
      this._isUpdating = false;
      this._isPlayed = !!rawData.played;
    },
    _getData: function(key, defValue) {
      return this._rawData.hasOwnProperty(key) ?
        this._rawData[key] : defValue;
    },
    getItemId: function() {
      return this._itemId;
    },
    getWatchId: function() {
      return this._getData('id', '');
    },
    getTitle: function() {
      return this._getData('title', '');
    },
    getDuration: function() {
      return parseInt(this._getData('length_seconds', '0'), 10);
    },
    getCount: function() {
      return {
        comment: parseInt(this._rawData.num_res,        10),
        mylist:  parseInt(this._rawData.mylist_counter, 10),
        view:    parseInt(this._rawData.view_counter,   10)
      };
    },
    getCommentCount: function() { return parseInt(this._rawData.num_res,        10); },
    getMylistCount:  function() { return parseInt(this._rawData.mylist_counter, 10); },
    getViewCount:    function() { return parseInt(this._rawData.view_counter,   10); },
    getThumbnail: function() {
      return this._rawData.thumbnail_url;
    },
    getBetterThumbnail: function() {
      var watchId = this.getWatchId();
      var hasLargeThumbnail = ZenzaWatch.util.hasLargeThumbnail(watchId);
      return this._rawData.thumbnail + (hasLargeThumbnail ? '.L' : '');
    },
    getPostedAt: function() {
      var fr = this._rawData.first_retrieve;
      return fr.replace(/-/g, '/');
    },
    isActive: function() {
      return this._isActive;
    },
    setIsActive: function(v) {
      v = !!v;
      if (this._isActive !== v) {
        this._isActive = v;
        this.emit('update', 'active', v);
      }
    },
    isUpdating: function() {
      return this._isUpdating;
    },
    setIsUpdating: function(v) {
      v = !!v;
      if (this._isUpdating !== v) {
        this._isUpdating = v;
        this.emit('update', 'updating', v);
      }
    },
    isPlayed: function() {
      return this._isPlayed;
    },
    setIsPlayed: function(v) {
      v = !!v;
      if (this._isPlayed !== v) {
        this._isPlayed = v;
        this.emit('update', 'played', v);
      }
    },
    isBlankData: function() {
      return this._rawData._format === 'blank';
    },
    serialize: function() {
      return {
        active:         this._isActive,
        played:         this._isPlayed,
        id:             this._rawData.id,
        title:          this._rawData.title,
        length_seconds: this._rawData.length_seconds,
        num_res:        this._rawData.num_res,
        mylist_counter: this._rawData.mylist_counter,
        view_counter:   this._rawData.view_counter,
        thumbnail_url:  this._rawData.thumbnail_url,
        first_retrieve: this._rawData.first_retrieve,
      };
    }
  });

  var VideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoList.prototype, AsyncEmitter.prototype);
  _.assign(VideoList.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._model = new VideoListModel({
        uniq: true,
        maxItem: 100
      });

      this._initializeView();
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new VideoListView({
        $container: this._$container,
        model: this._model,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._view.on('command', _.bind(this._onCommand, this));
      this._view.on('deflistAdd', _.bind(this._onDeflistAdd, this));
      this._view.on('playlistAdd', _.bind(this._onPlaylistAdd, this));
    },
    update: function(listData, watchId) {
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
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
    _onPlaylistAdd: function(watchId , itemId) {
      this.emit('command', 'playlistAdd', watchId);
      if (this._isUpdatingPlaylist) { return; }
      var item = this._model.findByItemId(itemId);

      var unlock = _.bind(function() {
        item.setIsUpdating(false);
        this._isUpdatingPlaylist = false;
      }, this);

      item.setIsUpdating(true);
      this._isUpdatingPlaylist = true;

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
      return this._thumbInfoLoader.load(watchId).then((info) => {
        var description = '投稿者: ' + info.owner.name;
        return this._mylistApiLoader.addDeflistItem(watchId, description)
          .then(onSuccess, onFail);
      }, () => {
        return this._mylistApiLoader.addDeflistItem(watchId)
          .then(onSuccess, onFail);
      });
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

  var RelatedVideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(RelatedVideoList.prototype, VideoList.prototype);
  _.assign(RelatedVideoList.prototype, {
    update: function(listData, watchId) {
      //window.console.log('RelatedVideoList: ', listData, watchId);
      if (!this._view) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      //window.console.log('insertItem: ', items);
      this._model.insertItem(items);
      this._view.scrollTop(0);
    },
  });


  var PlaylistModel = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistModel.prototype, VideoListModel.prototype);
  _.assign(PlaylistModel.prototype, {
    initialize: function() {
      this._maxItems = 10000;
      this._items = [];
      this._isUniq = true;
    },
  });

  var PlaylistView = function() { this.initialize.apply(this, arguments); };
  _.extend(PlaylistView.prototype, AsyncEmitter.prototype);
  PlaylistView.__css__ = ZenzaWatch.util.hereDoc(function() {/*

    .playlistEnable .tabSelect.playlist::after {
      content: '▶';
      color: #fff;
      text-shadow: 0 0 8px orange;
    }
    body:not(.fullScreen).zenzaScreenMode_sideView .playlistEnable .tabSelect.playlist::after  {
      text-shadow: 0 0 8px #336;
    }

    .playlist-container {
      height: 100%;
      overflow: hidden;
    }

    .playlist-header {
      height: 32px;
      border-bottom: 1px solid #000;
      background: #333;
      color: #ccc;
    }

    .playlist-menu-button {
      cursor: pointer;
      border: 1px solid #333;
      padding: 0px 4px;
      margin: 0 4px;
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
    }

    .playlist-menu li {
      line-height: 20px;
    }
  */});
  PlaylistView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="playlist-container">
      <div class="playlist-header">
        <lavel class="playlist-menu-button toggleEnable playlist-command"
          data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</lavel>
        <lavel class="playlist-menu-button toggleLoop playlist-command"
          data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</lavel>

        <div class="playlist-count playlist-command" data-command="toggleMenu">
          <span class="playlist-index"></span> / <span class="playlist-length"></span>
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
              <li class="playlist-command" data-command="removePlayedItem">再生済を消す ●</li>

            </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="playlist-frame"></div>
    </div>
  */});

  _.assign(PlaylistView.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
      this._model = params.model;
      this._playlist = params.playlist;


      ZenzaWatch.util.addStyle(PlaylistView.__css__);
      var $view = this._$view = $(PlaylistView.__tpl__);
      this._$container.append($view);

      this._$index  = $view.find('.playlist-index');
      this._$length = $view.find('.playlist-length');
      var $menu = this._$menu = this._$view.find('.playlist-menu');

      ZenzaWatch.debug.playlistView = this._$view;

      var listView = this._listView = new VideoListView({
        $container: this._$view.find('.playlist-frame'),
        model: this._model,
        className: 'playlist',
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      listView.on('command', _.bind(this._onCommand, this));
      listView.on('deflistAdd', _.bind(this._onDeflistAdd, this));

      this._playlist.on('update',
        _.debounce(_.bind(this._onPlaylistStatusUpdate, this), 100));

      this._$view.on('click', '.playlist-command', _.bind(this._onPlaylistCommandClick, this));
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
    _onPlaylistCommandClick: function(e) {
      var $target = $(e.target).closest('.playlist-command');
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
          window.setTimeout(() => { this._$view.removeClass('shuffle'); }, 1000);
          this.emit('command', command, param);
          break;
        default:
          this.emit('command', command, param);
      }
      ZenzaWatch.emitter.emitAsync('hideHover');
    },
    _onPlaylistStatusUpdate: function() {
      var playlist = this._playlist;
      this._$view
        .toggleClass('enable', playlist.isEnable())
        .toggleClass('loop',   playlist.isLoop())
        ;
      this._$index.text(playlist.getIndex() + 1);
      this._$length.text(playlist.getLength());
    }
  });

  var PlaylistSession = (function(storage) {
    var KEY = 'ZenzaWatchPlaylist';
    
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


  var Playlist = function() { this.initialize.apply(this, arguments); };
  _.extend(Playlist.prototype, VideoList.prototype);
  _.assign(Playlist.prototype, {
    initialize: function(params) {
      this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
      this._$container = params.$container;

      this._index = -1;
      this._isEnable = false;
      this._isLoop = params.loop;

      this._model = new PlaylistModel({});

      ZenzaWatch.debug.playlist = this;
      this.on('update', _.debounce(_.bind(function() {
        var data = this.serialize();
        PlaylistSession.save(data);
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
      this.unserialize(PlaylistSession.restore());
    },
    _initializeView: function() {
      if (this._view) { return; }
      this._view = new PlaylistView({
        $container: this._$container,
        model: this._model,
        playlist: this,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._view.on('command', _.bind(this._onCommand, this));
      this._view.on('deflistAdd', _.bind(this._onDeflistAdd, this));
    },
    _onCommand: function(command, param, itemId) {
      var item;
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
        case 'sortBy':
          var tmp = param.split(':');
          this.sortBy(tmp[0], tmp[1] === 'desc');
          break;
        case 'clear':
          this._setItemData([]);
          break;
        case 'select':
          item = this._model.findByItemId(itemId);
          this.setIndex(this._model.indexOf(item));
          this.emit('command', 'openNow', item.getWatchId());
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
        default:
          this.emit('command', command, param);
      }
    },
    _setItemData: function(listData) {
      var items = [];
      _.each(listData, function(itemData) {
        items.push(new VideoListItem(itemData));
      });
      //window.console.log('_setItemData', listData);
      this._model.setItem(items);
      this.setIndex(items.length > 0 ? 0 : -1);
    },
    loadFromMylist: function(mylistId, options) {
      this._initializeView();

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }
      var self = this;
      window.console.time('loadMylist' + mylistId);
      return this._mylistApiLoader
        .getMylistItems(mylistId, options).then(function(items) {
          window.console.timeEnd('loadMylist' + mylistId);
          var videoListItems = [];

          //var excludeId = /^(ar|sg)/; // nmは含めるべきかどうか
          _.each(items, function(item) {
            // マイリストはitem_typeがint
            // とりまいはitem_typeがstringっていうね
            if (item.item_data) {
              if (parseInt(item.item_type, 10) !== 0) { return; } // not video
              if (parseInt(item.item_data.deleted, 10) !== 0) { return; } // 削除動画を除外
            } else {
              //if (excludeId.test(item.id)) { return; } // not video
              if (item.thumbnail_url.indexOf('video_deleted') >= 0) { return; }
            }
            videoListItems.push(
              VideoListItem.createByMylistItem(item)
            );
          });
          //window.console.log('videoListItems!!', videoListItems);
          
          self._model.setItem(videoListItems);
          var item = self._model.findByWatchId(options.watchId);
          if (item) {
            item.setIsActive(true);
            item.setIsPlayed(true);
            self._activeItem = item;
            ZenzaWatch.util.callAsync(function() {
              self._view.scrollToItem(item);
            }, self, 1000);
          }
          self.setIndex(self._model.indexOf(item));
          self.emit('update');
          return Promise.resolve({
            status: 'ok',
            message: 'マイリストをロードしました'
          });
        });
    },
    insert: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) { return; }

      var model = this._model;
      var index = this._index;
      return this._thumbInfoLoader.load(watchId).then((info) => {
         // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        info.id = watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        this.emit('command', 'notifyHtml',
          '次に再生: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.insertItem(item, index + 1);
        this._refreshIndex(true);

        this.emit('update');

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    insertCurrentVideo: function(videoInfo) {
      this._initializeView();

      //window.console.log('insertCurrentVideo', videoInfo);
      if (this._activeItem &&
          !this._activeItem.isBlankData() &&
          this._activeItem.getWatchId() === videoInfo.getWatchId()) {
        this._activeItem.setIsPlayed(true);
        this.scrollToActiveItem();
        //window.console.log('insertCurrentVideo.getWatchId() === videoInfo.getWatchId()');
        return;
      }

      var currentItem = this._model.findByWatchId(videoInfo.getWatchId());
      //window.console.log('currentItem: ', currentItem);
      if (currentItem && !currentItem.isBlankData()) {
        currentItem.setIsPlayed(true);
        this.setIndex(this._model.indexOf(currentItem));
        this.scrollToActiveItem();
        return;
      }

      var item = VideoListItem.createByVideoInfoModel(videoInfo);
      item.setIsPlayed(true);
      //window.console.log('create item', item, 'index', this._index);
      if (this._activeItem) { this._activeItem.setIsActive(false); }
      this._model.insertItem(item, this._index + 1);
      //window.console.log('findByItemId', item.getItemId(), this._model.findByItemId(item.getItemId()));
      this._activeItem = this._model.findByItemId(item.getItemId());
      this._refreshIndex(true);

    },
    append: function(watchId) {
      this._initializeView();
      if (this._activeItem && this._activeItem.getWatchId() === watchId) { return; }

      var model = this._model;
      return this._thumbInfoLoader.load(watchId).then((info) => {
         // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
        info.id = watchId;
        var item = VideoListItem.createByThumbInfo(info);
        //window.console.info(item, info);
        model.appendItem(item);
        this._refreshIndex();
        this.emit('update');
        this.emit('command', 'notifyHtml',
          'リストに追加: ' +
          '<img src="' + item.getThumbnail() + '" style="width: 96px;">' +
          item.getTitle()
        );
      },
      (result) => {
        var item = VideoListItem.createBlankInfo(watchId);
        model.appendItem(item);
        this._refreshIndex(true);
        this._refreshIndex();

        window.console.error(result);
        this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
      });
    },
    getIndex: function() {
      return this._activeItem ? this._index : -1;
    },
    setIndex: function(v, force) {
      v = parseInt(v, 10);
      //window.console.log('setIndex: %s -> %s', this._index, v);
      if (this._index !== v || force) {
        this._index = v;
        //window.console.log('before active', this._activeItem);
        if (this._activeItem) {
          this._activeItem.setIsActive(false);
        }
        this._activeItem = this._model.getItemByIndex(v);
        if (this._activeItem) {
          this._activeItem.setIsActive(true);
        }
        //window.console.log('after active', this._activeItem);
        this.emit('update');
      }
    },
    _refreshIndex: function(scrollToActive) {
      this.setIndex(this._model.indexOf(this._activeItem), true);
      if (scrollToActive) {
        ZenzaWatch.util.callAsync(function() {
          this.scrollToActiveItem();
        }, this, 1000);
      }
    },
    _setIndexByItemId: function(itemId) {
      var item = this._model.findByItemId(itemId);
      if (item) {
        this._setIndexByItem(item);
      }
    },
    _setIndexByItem: function(item) {
      var index = this._model.indexOf(item);
      if (index >= 0) {
        this.setIndex(index);
      }
    },
    getLength: function() {
      return this._model.getLength();
    },
    hasNext: function() {
      var len = this._model.getLength();
      return len > 0 && (this.isLoop() || this._index < len - 1);
    },
    isEnable: function() {
      return this._isEnable;
    },
    isLoop: function() {
      return this._isLoop;
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
    toggleLoop: function() {
      this._isLoop = !this._isLoop;
      this.emit('update');
    },
    shuffle: function() {
      this._model.shuffle();
      if (this._activeItem) {
        this._model.removeItem(this._activeItem);
        this._model.insertItem(this._activeItem, 0);
        this.setIndex(0);
      } else {
        this.setIndex(-1);
      }
      this._view.scrollTop(0);
    },
    sortBy: function(key, isDesc) {
      this._model.sortBy(key, isDesc);
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    removePlayedItem: function() {
      this._model.removePlayedItem();
      this._refreshIndex(true);
      ZenzaWatch.util.callAsync(function() {
        this._view.scrollToItem(this._activeItem);
      }, this, 1000);
    },
    selectNext: function() {
      if (!this.hasNext()) { return null; }
      var index = this.getIndex();
      var len = this.getLength();

      //window.console.log('selectNext', index, len);
      if (index < -1) {
        this.setIndex(0);
      } else if (index + 1< len) {
        this.setIndex(index + 1);
      } else if (this.isLoop()) {
        this.setIndex((index + 1) % len);
      }
      return this._activeItem ? this._activeItem.getWatchId() : null;
    },
    scrollToActiveItem: function() {
      if (this._activeItem) {
        this._view.scrollToItem(this._activeItem);
      }
    }
  });

//===END===
//
     //ZenzaWatch.api.ThumbInfoLoader.load('sm9').then(function() {console.log(true, arguments); }, function() { console.log(false, arguments)});
//
/*

// watchApiData.playlistItem
{
  first_retrieve: "2014-01-03 00:00:00",
  has_data: true,
  id: "111111111",
  is_translated: false,
  length_seconds: "79",
  mylist_counter: "8428",
  num_res: "513",
  thumbnail_url: "http://tn-skr3.smilevideo.jp/smile?i=111111111",
  title: "タイトル",
  view_counter: "123456"
}


// mylistItem
create_time: 1349261270
description: ""
item_data: Object
deleted: "0"
first_retrieve: 1175404430
group_type: "default"
last_res_body: "おまいらwww ↓激しく同意 これはひどい \(^o^)/ ロックマンと考えなけ エアーシュー... "
length_seconds: "1316"
mylist_counter: "145"
num_res: "2566"
thumbnail_url: "http://tn-skr3.smilevideo.jp/smile?i=94674"
title: "ロックマン2 メドレー forメガドライブ"
update_time: 1457603039
video_id: "sm94674"
view_counter: "19245"
watch_id: "sm94674"
__proto__: Object
item_id: "1175404429"
item_type: 0
update_time: 1349261270
watch: 0


http://www.nicovideo.jp/watch/sm123456?playlist_type=mylist_playlist&group_id=123456&mylist_sort=1

http://www.nicovideo.jp/watch/sm28401802?playlist_type=deflist&mylist_sort=1&ref=my_deflist_s1_p1_n398


// とりまい内の動画リンク
http://www.nicovideo.jp/watch/sm28401802?playlist_type=deflist&mylist_sort=1&ref=my_deflist_s1_p1_n398
// ここから連続再生  のリンク
http://www.nicovideo.jp/watch/sm28401802?playlist_type=mylist_playlist&group_id=deflist&mylist_sort=1

// マイリスト内の動画リンク
http://www.nicovideo.jp/watch/sm2049295?playlist_type=mylist&group_id=15690144&mylist_sort=1&ref=my_mylist_s1_p1_n486
// ここから連続再生  のリンク
http://www.nicovideo.jp/watch/sm2049295?playlist_type=mylist_playlist&group_id=15690144&mylist_sort=1


// VOCALOIDランキングの連続再生ボタン
http://www.nicovideo.jp/watch/sm28427945?playlist_type=ranking&type=fav&span=daily&category=vocaloid&continuous=1
// 検索結果の連続再生ボタン
http://www.nicovideo.jp/watch/sm2406770?playlist_type=tag&tag=VOCALOID&sort=n&order=d&page=1&continuous=1

http://www.nicovideo.jp/watch/sm26625313?playlist_type=mylist_playlist&group_id=15689839&mylist_sort=1
http://www.nicovideo.jp/watch/sm8535320?playlist_type=mylist_playlist&group_id=deflist&mylist_sort=1


// thumbInfo
commentCount: 4370138
description: "レッツゴー！陰陽師（フルコーラスバージョン）"
duration: 319
id: "sm9"
lastResBody: "ヤバイ倒れる陰陽師 遺影 うううううううううう "
movieType: "flv"
mylistCount: 162637
owner: Object
postedAt: "2007/3/6 0:33:00"
status: "ok"
tagList: Array[8]
thumbnail: "http://tn-skr2.smilevideo.jp/smile?i=9"
title: "新・豪血寺一族 -煩悩解放 - レッツゴー！陰陽師"
v: "sm9"
viewCount: 15529324


http://riapi.nicovideo.jp/api/watch/relatedvideo?video_id=sm9
{Object {list: Array[16], status: "ok"}
description_short : "これ…無編集なんだぜ…？　【追記】劇場版『遊☆戯☆王 THE DARK SIDE OF DIMENSIONS』特報2https://www.yo..."
first_retrieve : "2007-03-06 04:59:46"
id : "sm117"
is_middle_thumbnail : false
last_res_body : "死す☆ 「追加攻撃できる」だ "
length : "2:30"
mylist_counter : "20896"
num_res : 35550
thumbnail_style : Object
thumbnail_url : "http://tn-skr2.smilevideo.jp/smile?i=117"
title : "ドロー！！モンスターカード！！！"
type : "video"
view_counter : "1598797"
__proto__ : Object













*/