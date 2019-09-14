// ==UserScript==
// @name        WatchDump
// @namespace   https://github.com/segabito/
// @description 動画データをコンソールにダンプする. デバッグ用のヘルパー
// @include     http://*.nicovideo.jp/watch/*
// @version     0.1
// @grant       none
// ==/UserScript==

(function() {
  var monkey = (function() {
    'use strict';
    class Util {
      static parseQuery(query) {
        const result = {};
        query.split('&').forEach(item => {
          const sp = item.split('=');
          const key = decodeURIComponent(sp[0]);
          const val = decodeURIComponent(sp.slice(1).join('='));
          result[key] = val;
        });
        return result;
      }
    }


    (function() {
      const container = document.getElementById('watchAPIDataContainer');
      if (!container) { return; }
      console.info('%cver GINZA', 'font-size: 150%;');

      const data = JSON.parse(container.textContent);

      const flvInfo = Util.parseQuery(decodeURIComponent(data.flashvars.flvInfo));
      const dmcInfo = JSON.parse(decodeURIComponent(data.flashvars.dmcInfo || '{}'));

      window.watchData = {
        data,
        flvInfo,
        dmcInfo
      };
      console.log('watchData:', window.watchData);
    })();

    (function() {
      const container = document.getElementById('js-initial-watch-data');
      if (!container) { return; }
      console.info('%cver HTML5', 'font-size: 150%;');
      const data = JSON.parse(container.getAttribute('data-api-data'));
      const env  = JSON.parse(document.getElementById('js-initial-watch-data').getAttribute('data-environment'));

      window.watchData = {
        data,
        env,
        dmcInfo: data.video.dmcInfo
      };
      console.log('watchData:', window.watchData);
    })();

  });

  var script = document.createElement('script');
  script.id = 'WatchDumpLoader';
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('charset', 'UTF-8');
  script.appendChild(document.createTextNode('(' + monkey + ')()'));
  document.body.appendChild(script);

})();
