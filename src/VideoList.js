var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};
var PopupMessage = {};

//===BEGIN===

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
      this._ItemBuilder = params.builder;
      this._itemCss     = params.itemCss;
      this._$container  = params.$container;

      this._retryGetIframeCount = 0;

      this._itemViews = [];
      this._maxItems = params.max || 100;

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

      iframe.onload = function() {
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
      iframe.srcdoc = html;
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
      var $list = this._$list = $(doc.getElementById('listContainer'));
      if (this._html) {
        $list.html(this._html);
      }
      $body.on('click', _.bind(this._onClick, this));
      $body.on('keydown', function(e) {
        ZenzaWatch.emitter.emit('keydown', e);
      });
    },
    _onClick: function(e) {
      e.stopPropagation();
      var $target = $(e.target).closest('.command');
      if ($target.length > 0) {
        e.stopPropagation();
        e.preventDefault();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        switch (command) {
          case 'deflistAdd':
            this.emit('deflistAdd', param);
            break;
          case 'scrollToTop':
            this.scrollTop(0, 300);
            break;
          default:
            this.emit('command', command, param);
        }
      }
    },
    _onResize: function(width, height) {
      //window.console.log('resize videoList', width, height);
    },
    _onScroll: function(top, left) {
      //window.console.log('scroll videoList', top, left);
    },
    _updateView: function() {
      if (!this._$list) {
        return;
      }
      //var scrollTop = this.scrollTop();
      //var before = this._$list.innerHeight();
      this.addClass('updating');
      this.scrollTop(0);
      ZenzaWatch.util.callAsync(function() {
        this._$list.html(this._html);
      }, this, 0);

      ZenzaWatch.util.callAsync(function() {
       // var after  = this._$list.innerHeight();
       // var diff = after - before;
       // // なるべく元のスクロール位置を維持
       // if (diff > 0) {
       //   this.scrollTop(Math.max(0, scrollTop + diff));
       // } else {
       //   this.scrollTop(0);
       // }
        this.removeClass('updating');
        this.emit('update');
      }, this, 100);
    },
    insertItem: function(itemList) {
      itemList = typeof itemList.length === 'number' ? itemList: [itemList];
      if (itemList.length < 1) { return; }
      itemList.reverse();
      _.each(itemList, _.bind(function(item) {
        this._itemViews.unshift(
          this._ItemBuilder.build(item)
        );
      }, this));

      this._itemViews = _.uniq(this._itemViews, 'watchId');
      this._itemViews.splice(this._maxItems);
      this._html = this._itemViews.join('');
      this._updateView();
    },
    appendItem: function(itemList) {
      itemList = typeof itemList.length === 'number' ? itemList: [itemList];
      if (itemList.length < 1) { return; }

      _.each(itemList, _.bind(function(item) {
        this._itemViews.push(
          this._ItemBuilder.build(item)
        );
      }, this));

      this._itemViews = _.uniq(this._itemViews, 'watchId');
      this._itemViews.splice(this._maxItems);
      this._html = this._itemViews.join('');
      this._updateView();
    },
    isUpdatingDeflist: function() {
      if (!this._$body) { return false; }
      return this._$body.hasClass('updatingDeflist');
    },
    setIsUpdatingDeflist: function(v) {
      this.toggleClass('updatingDeflist', v);
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
    scrollToItem: function(watchId) {
      var $target = this._$body.find('.watch' + watchId);
      if ($target.length < 1) { return; }
      var top = $target.offset().top;
      this.scrollTop(top);
    }
  });

  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);
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

    .updatingDeflist {
      cusror: wait !important;
    }

    .updatingDeflist * {
      opacity: 0.8;
      pointer-events: none;
    }

    .videoItem {
      position: relative;
      display: inline-block;
      width: 100%;
      min-height: 88px;
      overflow: hidden;
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
    }
    .videoItem .thumbnailContainer .thumbnail {
      width:  96px;
      height: 72px;
    }

    .videoItem .thumbnailContainer .deflistAdd {
      position: absolute;
      display: none;
      right: 0;
      bottom: 0;
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
    .videoItem:hover .thumbnailContainer .deflistAdd {
      display: inline-block;
      border: 1px outset;
    }
    .videoItem:hover .thumbnailContainer .deflistAdd:hover {
      transform: scale(1.5);
      box-shadow: 2px 2px 2px #000;
    }
    .videoItem:hover .thumbnailContainer .deflistAdd:active {
      transform: scale(0.9);
      border: 1px inset;
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

    .videoItem .videoLink {
      font-size: 14px;
      color: #ff9;
    }
    .videoItem .videoLink:visited {
      color: #ffd;
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

  */});

  VideoListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="videoItem %className% watch%watchId%" data-watch-id="%watchId%">
      <div class="thumbnailContainer">
        <a href="//www.nicovideo.jp/watch/%watchId%" class="command" data-command="open" data-param="%watchId%">
          <img class="thumbnail" data-src="%thumbnail%" src="%thumbnail%">
          <span class="duration">%duration%</span>
          <span class="command deflistAdd" data-command="deflistAdd" data-param="%watchId%" title="とりあえずマイリスト">&#x271A;</span>
        </a>
      </div>
      <div class="videoInfo">
        <div class="postedAt">%postedAt%</div>
        <div class="title">
          <a href="//www.nicovideo.jp/watch/%watchId%" class="command videoLink" data-command="open" data-param="%watchId%">
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

  VideoListItemView.build = function(item) {
    var tpl = VideoListItemView.__tpl__;
    var secToTime = function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    };
    var addComma = function(m) {
      return m.toLocaleString ? m.toLocaleString() : m;
    };

    var count = item.getCount();
    tpl = tpl
      .replace(/%watchId%/g,    item.getWatchId())
      .replace(/%postedAt%/g,   item.getPostedAt())
      .replace(/%videoTitle%/g, item.getTitle())
      .replace(/%thumbnail%/g,  item.getThumbnail())
      .replace(/%duration%/g,   secToTime(item.getDuration()))
      .replace(/%viewCount%/g,     addComma(count.view))
      .replace(/%commentCount%/g,  addComma(count.comment))
      .replace(/%mylistCount%/g,   addComma(count.mylist))
      .replace(/%className%/g, '')
      ;
    return {
      tpl: tpl,
      toString: function() { return this.tpl; },
      watchId: item.getWatchId()
    };
  };

  var VideoListItem = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItem.prototype, AsyncEmitter.prototype);
  _.assign(VideoListItem.prototype, {
    initialize: function(rawWata) {
      this._rawData = rawWata;
    },
    _getData: function(key, defValue) {
      return this._rawData.hasOwnProperty(key) ?
        this._rawData[key] : defValue;
    },
    getTitle: function() {
      return this._getData('title', '');
    },
    getDuration: function() {
      return parseInt(this._getData('length_seconds', '0'), 10);
    },
    getWatchId: function() {
      return this._getData('id', '');
    },
    getCount: function() {
      return {
        comment: parseInt(this._rawData.num_res,        10),
        mylist:  parseInt(this._rawData.mylist_counter, 10),
        view:    parseInt(this._rawData.view_counter,   10)
      };
    },
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
    }
  });

  var RelatedVideoList = function() { this.initialize.apply(this, arguments); };
  _.extend(RelatedVideoList.prototype, AsyncEmitter.prototype);
  _.assign(RelatedVideoList.prototype, {
    initialize: function(params) {
      this._$container = params.$container;
    },
    _initializeView: function() {
      this._videoListView = new VideoListView({
        $container: this._$container,
        builder: VideoListItemView,
        itemCss: VideoListItemView.__css__
      });
      this._videoListView.on('command', _.bind(function(command, param) {
        this.emit('command', command, param);
      }, this));

      this._videoListView.on('deflistAdd', _.bind(this._onDeflistAdd, this));

      this._videoListView.on('update', _.bind(function() {
        this._videoListView.scrollToItem(this._watchId);
      }, this));

    },
    update: function(listData, watchId) {
      if (!this._videoListView) { this._initializeView(); }
      this._watchId = watchId;
      var items = [];
      _.each(listData, function(itemData) {
        if (!itemData.has_data) { return; }
        items.push(new VideoListItem(itemData));
      });
      if (items.length < 1) { return; }
      this._videoListView.insertItem(items);
    },
    _onDeflistAdd: function(watchId) {
      if (this._videoListView.isUpdatingDeflist()) { return; }

      var videoListView = this._videoListView;
      var unlock = function() {
        videoListView.setIsUpdatingDeflist(false);
      };

      videoListView.setIsUpdatingDeflist(true);

      var timer = window.setTimeout(unlock, 10000);

      if (!this._mylistApiLoader) {
        this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
      }

      return this._mylistApiLoader.addDeflistItem(watchId)
        .then(function(result) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.notify(result.message);
      }, function(err) {
        window.clearTimeout(timer);
        timer = window.setTimeout(unlock, 2000);
        PopupMessage.alert(err.message);
      });
    }
   });

//===END===
/*
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
*/
