var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

//===BEGIN===

/**
 * DOM的に隔離したiframeの中に生成する。 どちらかというと実験。
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
</body>
</html>

  */});

  _.extend(VideoListView.prototype, AsyncEmitter.prototype);
  _.assign(VideoListView.prototype, {
    initialize: function(params) {
      this._ItemBuilder = params.builder;
      this._itemCss     = params.itemCss;

      this._retryGetIframeCount = 0;
    },
    _initializeview: function() {
      var html = VideoListView.__tpl__;
        html.replace('%CSS%', this._itemCss);

      var iframe = this._getIframe();
      iframe.className = 'videoListFrame';

      var onLoad = _.bind(this._onIframeLoad, this);
      var onResize = _.bind(this._onResize, this);
      var onScroll = _.bind(this._onScroll, this);

      iframe.onload = function() {
        var win = iframe.contentWindow;
        var doc = iframe.contentWindow.document;

        onLoad(win);

        win.addEventListener('resize', function() {
          var w = win.innerWidth, h = win.innerHeight;
          onResize(w, h);
        });
        win.addEventListener('scroll', function() {
          onScroll(doc.documentElement.scrollTop, doc.documentElement.scrollLeft);
        });
      };

      iframe.srcdoc = html;
      this._view = iframe;
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
      var $container = this._$container = $(doc.getElementById('listContainer'));
      if (this._html) {
        $container.html(this._html);
      }
      $container.on('click', _.bind(this._onClick, this));
    },
    _onClick: function(e) {
      window.console.log('click videoList', e);
      e.stopPropagation();
      var $target = $(e.target).closest('.command');
      if ($target.length > 0) {
        e.stopPropagation();
        var command = $target.attr('data-command');
        var param   = $target.attr('data-param');
        this.emit('command', command, param);
      }
    },
    _onResize: function(width, height) {
      window.console.log('resize videoList', width, height);
    },
    _onScroll: function(top, left) {
      window.console.log('scroll videoList', top, left);
    }
  });

  var VideoListItemView = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoListItemView.prototype, AsyncEmitter.prototype);
  VideoListItemView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .videoItem {
      display: inline-block;
      width: 100%;

    }

    .videoItem .thumbnailContainer {
      position: relative;
      width:  128px;
      height: 96px;
    }
    .videoItem .thumbnailContainer .duration {
      position: absolute;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0,8);
      color: #fff;
    }

    .videoItem.noVideoCounter .counter {
      display: none;
    }
    .videoItem .counter .count {
      font-weight: bolder;
    }
    .videoItem .counter .count + .count {
      margin-right: 
    }

  */});

  VideoListItemView.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class"videoItem %className%">
      <div class="thumbnailContainer">
        <a href="/watch/%watchId%" class="command" data-command="open" data-param="%watchId%" title="%videoTitle%">
          <img class="thumbnail" data-src="%thumbnail%">
          <span class="duration">%duration%</span>
        </a>
      </div>
      <div class="videoInfo">
        <span class="title">
          <a href="/watch/%watchId%" class="command" data-command="open" data-param="%watchId%" title="%videoTitle%">
            %videoTitle%
          </a>
        </span>
        <span class="counter">
          再生: <span class="count">%viewCount%</span>
          コメ: <span class="count">%commentCount%</span>
          マイ: <span class="count">%mylistCount%</span>
        </span>
      </div>
    </div>
  */});

  VideoListItemView.build = function(videoInfoModel) {
    var tpl = VideoListItemView.__tpl__;
    var secToTime = function(sec) {
      var m = Math.floor(sec / 60);
      var s = (Math.floor(sec) % 60 + 100).toString().substr(1);
      return [m, s].join(':');
    };
    tpl
      .replace(/%watchId%/g,    videoInfoModel.getWatchId())
      .replace(/%videoTitle%/g, videoInfoModel.getTitle())
      .replace(/%duration%/g,   secToTime(videoInfoModel.getDuration()))
      .replace(/%className%/g, '')
      ;
    return tpl;
  };


