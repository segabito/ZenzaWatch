// ==UserScript==
// @name           ZenzaWatch
// @namespace      https://github.com/segabito/
// @description    ニコニコ動画の速くて軽い動画プレイヤー
// @match          *://www.nicovideo.jp/*
// @match          *://ext.nicovideo.jp/
// @match          *://ext.nicovideo.jp/#*
// @match          *://blog.nicovideo.jp/*
// @match          *://ch.nicovideo.jp/*
// @match          *://com.nicovideo.jp/*
// @match          *://commons.nicovideo.jp/*
// @match          *://dic.nicovideo.jp/*
// @match          *://ex.nicovideo.jp/*
// @match          *://info.nicovideo.jp/*
// @match          *://search.nicovideo.jp/*
// @match          *://uad.nicovideo.jp/*
// @match          *://api.search.nicovideo.jp/*
// @match          *://*.nicovideo.jp/smile*
// @match          *://site.nicovideo.jp/*
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.upload.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        1.15.6
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.1/fetch.js
// ==/UserScript==


(function (window) {
  const PRODUCT = 'ZenzaWatch';
// 公式プレイヤーがurlを書き換えてしまうので読み込んでおく
  const START_PAGE_QUERY = (location.search ? location.search.substring(1) : '');
  const monkey = function (PRODUCT, START_PAGE_QUERY) {
    let console = window.console;
    let $ = window.ZenzaJQuery || window.jQuery, _ = window._;
    let TOKEN = 'r:' + (Math.random());
    START_PAGE_QUERY = encodeURIComponent(START_PAGE_QUERY);
    //@version

    console.log(`%c${PRODUCT} v${VER}`, 'font-size: 200%;');
    console.log('%cjQuery v%s, lodash v%s', 'font-size: 200%;', $.fn.jquery, _ && _.VERSION);

    let ZenzaWatch = {
      version: VER,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {
        callAsync: function (func, self, delay) {
          delay = delay || 0;
          if (self) {
            func = func.bind(self);
          }
          window.setTimeout(func, delay);
        }
      }
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {};
    }

    const util = ZenzaWatch.util;

//@require constant.js

//@require util.js

//@require loader.js

//@require VideoInfo.js

//@require loader/VideoSearch.js

//@require loader/TagEditApi.js

//@require loader/Storyboard.js

//@require YouTubeWrapper.js

//@require NicoVideoPlayer.js

//@require StoryBoard.js

//@require VideoControlBar.js

//@require NicoTextParser.js

//@require CommentPlayer.js

//@require CommentLayoutWorker.js

//@require SlotLayoutWorker.js

//@require NicoScripter.js

//@require CommentPanel.js

//@require VideoList.js

//@require VideoSession.js

//@require NicoVideoPlayerDialog.js

//@require CommentInputPanel.js

//@require SettingPanel.js

//@require TagListView.js

//@require VideoInfoPanel.js

//@require GinzaSlayer.js

//@require initializer.js

    if (window.name !== 'commentLayerFrame') {
      if (location.host === 'www.nicovideo.jp') {
        initialize();
      } else {
        NicoVideoApi.configBridge(Config).then(() => {
          window.console.log('%cZenzaWatch Bridge: %s', 'background: lightgreen;', location.host);
          if (document.getElementById('siteHeaderNotification')) {
            initialize();
            return;
          }
          NicoVideoApi.ajax({url: '//www.nicovideo.jp/'})
            .then(function (result) {
              let $dom = $('<div>' + result + '</div>');
              let isLogin = $dom.find('.siteHeaderLogin, #siteHeaderLogin').length < 1;
              let isPremium =
                $dom.find('#siteHeaderNotification').hasClass('siteHeaderPremium');
              window.console.log('isLogin: %s isPremium: %s', isLogin, isPremium);
              util.isLogin = () => {
                return isLogin;
              };
              util.isPremium = () => {
                return isPremium;
              };
              initialize();
            });
        }, function () {
          window.console.log('ZenzaWatch Bridge disabled');
        });
      }
    }

  }; // end of monkey

  let loadLodash = function () {
    if (window._) {
      return Promise.resolve();
    }
    console.info('load lodash from cdn...');

    return new Promise((resolve, reject) => {
      let script = document.createElement('script');
      script.id = 'lodashLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js';
      document.body.appendChild(script);
      let count = 0;

      let tm = setInterval(() => {
        count++;

        if (window._) {
          clearInterval(tm);
          resolve();
          return;
        }

        if (count >= 100) {
          clearInterval(tm);
          console.error('load lodash timeout');
          reject();
        }

      }, 300);
    });
  };


//@require exApi.js

  if (window.ZenzaWatch) {
    return;
  }
  let document = window.document;
  let host = window.location.host || '';
  let href = (location.href || '').replace(/#.*$/, '');
  let prot = location.protocol;
  if (href === prot + '//www.nicovideo.jp/favicon.ico' &&
    window.name === 'nicovideoApiLoader') {
    loadLodash().then(nicovideoApi);
  } else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
    loadLodash().then(smileApi);
  } else if (host === 'api.search.nicovideo.jp' && window.name.startsWith('searchApiLoader')) {
    loadLodash().then(searchApi);
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('thumbInfoLoader') >= 0) {
    loadLodash().then(thumbInfoApi);
  } else if (host === 'ext.nicovideo.jp' && window.name.indexOf('videoInfoLoaderLoader') >= 0) {
    loadLodash().then(exApi);
  } else if (window === window.top) {
    // ロードのタイミングによって行儀の悪い広告に乗っ取られることがあるので
    // 先にiframeだけ作っておく
    // 効果はいまいち・・・
    let iframe;
    for (let i = 0; i < 3; i++) {
      iframe = document.createElement('iframe');
      iframe.className = 'reservedFrame';
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.srcdocType = typeof iframe.srcdoc;
      iframe.srcdoc = '<html></html>';
      document.body.appendChild(iframe);
    }


    let loadGm = function () {
      let script = document.createElement('script');
      script.id = 'ZenzaWatchLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.appendChild(
        document.createTextNode(`(${monkey})('${PRODUCT}', '${encodeURIComponent(START_PAGE_QUERY)}');`));
      document.body.appendChild(script);
    };

    const MIN_JQ = 10000600000;
    let getJQVer = function () {
      if (!window.jQuery) {
        return 0;
      }
      let ver = [];
      let t = window.jQuery.fn.jquery.split('.');
      while (t.length < 3) {
        t.push(0);
      }
      t.forEach((v) => {
        ver.push((v * 1 + 100000).toString().substr(1));
      });
      return ver.join('') * 1;
    };

    let loadJq = function () {
      console.log('JQVer: ', getJQVer());
      console.info('load jQuery from cdn...');

      return new Promise((resolve, reject) => {
        let $j = window.jQuery || null;
        let $$ = window.$ || null;
        let script = document.createElement('script');
        script.id = 'jQueryLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
        document.body.appendChild(script);
        let count = 0;

        let tm = setInterval(() => {
          count++;

          if (getJQVer() >= MIN_JQ) {
            clearInterval(tm);
            window.ZenzaJQuery = window.jQuery;
            if ($j) {
              window.jQuery = $j;
            }
            if ($$) {
              window.$ = $$;
            }
            resolve();
            return;
          }

          if (count >= 100) {
            clearInterval(tm);
            console.error('load jQuery timeout');
            reject();
          }

        }, 300);
      });
    };

    loadLodash().then(() => {
      if (getJQVer() >= MIN_JQ) {
        loadGm();
      } else {
        loadJq().then(loadGm);
      }
    });
  }
})(window.unsafeWindow || window);
