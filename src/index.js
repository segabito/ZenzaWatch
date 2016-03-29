// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    Ginzaに行かなくても動画を再生
// @match          http://www.nicovideo.jp/*
// @match          http://ext.nicovideo.jp/
// @match          http://ext.nicovideo.jp/thumb/*
// @match          http://api.ce.nicovideo.jp/api/v1/system.unixtime
// @match          http://blog.nicovideo.jp/*
// @match          http://ch.nicovideo.jp/*
// @match          http://com.nicovideo.jp/*
// @match          http://commons.nicovideo.jp/*
// @match          http://dic.nicovideo.jp/*
// @match          http://info.nicovideo.jp/*
// @match          http://search.nicovideo.jp/*
// @match          http://uad.nicovideo.jp/*
// @match          http://*.nicovideo.jp/smile*
// @exclude        http://ads*.nicovideo.jp/*
// @exclude        http://www.upload.nicovideo.jp/*
// @exclude        http://ch.nicovideo.jp/tool/*
// @exclude        http://flapi.nicovideo.jp/*
// @exclude        http://dic.nicovideo.jp/p/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.14.0
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.1/lodash.js
// ==/UserScript==


(function() {

var monkey = function() {
  var console = window.console;
  console.log('exec ZenzaWatch..');
  var $ = window.ZenzaJQuery || window.jQuery, _ = window._;
  var TOKEN = 'r:' + (Math.random());
  console.log('jQuery version: ', $.fn.jquery);

    var ZenzaWatch = {
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      util: {
        hereDoc: function(func) { // えせヒアドキュメント
          return func.toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1].replace(/\{\*/g, '/*').replace(/\*\}/g, '*/').trim();
        },
        callAsync: function(func, self, delay) {
          delay = delay || 0;
          if (self) {
            window.setTimeout(_.bind(func, self), delay);
          } else {
            window.setTimeout(func, delay);
          }
        }
      }
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {};
    }

//@require util.js

//@require loader.js

//@require NicoVideoPlayer.js

//@require StoryBoard.js

//@require VideoControlBar.js

//@require NicoTextParser.js

//@require CommentPlayer.js

//@require VideoList.js

//@require VideoSession.js

//@require NicoVideoPlayerDialog.js

//@require CommentInputPanel.js

//@require SettingPanel.js

//@require VideoInfoPanel.js

//@require GinzaSlayer.js

//@require initializer.js

};

//@require exApi.js

  var host = window.location.host || '';
  var href = (location.href || '').replace(/#.*$/, '');
  if (href === 'http://www.nicovideo.jp/favicon.ico' &&
      window.name === 'nicovideoApiLoader') {
    nicovideoApi();
  } else if (href ==='http://api.ce.nicovideo.jp/api/v1/system.unixtime' &&
      window.name === 'vitaApiLoader') {
    vitaApi();
  } else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
    smileApi();
  } else if (host === 'ext.nicovideo.jp' && location.pathname.indexOf('/thumb/') === 0) {
    blogPartsApi();
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('thumbInfoLoader') >= 0) {
    thumbInfoApi();
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    exApi();
  } else if (window === top) {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    // 効果はいまいち・・・
    var iframe;
    for (var i = 0; i < 3; i++) {
      iframe = document.createElement('iframe');
      iframe.className = 'reservedFrame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.srcdocType = typeof iframe.srcdoc;
      iframe.srcdoc = '<html></html>';
      document.body.appendChild(iframe);
    }


    var loadGm = function() {
      var script = document.createElement('script');
      script.id = 'ZenzaWatchLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.appendChild(document.createTextNode( '(' + monkey + ')();' ));
      document.body.appendChild(script);
    };

    var MIN_JQ = 10000600000;
    var getJQVer = function() {
      if (!window.jQuery) {
        return 0;
      }
      var ver = [];
      var t = window.jQuery.fn.jquery.split('.');
      while(t.length < 3) { t.push(0); }
      _.each(t, function(v) { ver.push((v * 1 + 100000).toString().substr(1)); });
      return ver.join('') * 1;
    };

    var loadJq = function() {
      window.console.log('JQVer: ', getJQVer());
      window.console.info('load jQuery from cdn...');

      return new Promise(function (resolve, reject) {
        var $j = window.jQuery || null;
        var $$ = window.$ || null;
        var script = document.createElement('script');
        script.id = 'jQueryLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
        document.body.appendChild(script);
        var count = 0;

        var tm = window.setInterval(function() {
          count++;

          if (getJQVer() >= MIN_JQ)  {
            window.clearInterval(tm);
            window.ZenzaJQuery = window.jQuery;
            if ($j) { window.jQuery = $j; }
            if ($$) { window.$      = $$; }
            resolve();
          }

          if (count >= 100) {
            window.clearInterval(tm);
            window.console.error('load jQuery timeout');
            reject();
          }

        }, 300);
      });
    };

    if (getJQVer() >= MIN_JQ) {
      loadGm();
    } else {
      loadJq().then(loadGm);
    }
  }
})();
