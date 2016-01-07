// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    Ginzaに行かなくても動画を再生
// @match          http://www.nicovideo.jp/*
// @match          http://ext.nicovideo.jp/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.7.2
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js
// ==/UserScript==

(function() {

var monkey = function() {
  var console = window.console;
  console.log('exec ZenzaWatch..');
    var $ = window.jQuery, _ = window._;

    var ZenzaWatch = {
      debug: {},
      api: {},
      init: {},
      util: {
        hereDoc: function(func) { // えせヒアドキュメント
          return func.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\{\*/g, '/*').replace(/\*\}/g, '*/');
        },
        callAsync: function(func, self) {
          if (self) {
            window.setTimeout($.proxy(func, self), 0);
          } else {
            window.setTimeout(func, 0);
          }
        }
      }
    };

    window.ZenzaWatch = ZenzaWatch;

//@require util.js

//@require loader.js

//@require NicoVideoPlayer.js

//@require VideoControlBar.js

//@require CommentPlayer.js

//@require NicoVideoPlayerDialog.js

//@require initializer.js

};

//@require exApi.js

  var host = window.location.host || '';
  if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    exApi();
  } else {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    var iframe = document.createElement('iframe');
    iframe.className = 'commentLayerFrameReserve';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    var script = document.createElement('script');
    script.id = 'ZenzaWatchLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.appendChild(document.createTextNode( '(' + monkey + ')();' ));
    document.body.appendChild(script);
  }
})();
