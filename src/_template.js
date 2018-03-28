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
// @version        1.15.7
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js
// @require        https://cdnjs.cloudflare.com/ajax/libs/fetch/2.0.1/fetch.js
// ==/UserScript==


(function (window) {
  const PRODUCT = 'ZenzaWatch';
// 公式プレイヤーがurlを書き換えてしまうので読み込んでおく
  const START_PAGE_QUERY = (location.search ? location.search.substring(1) : '');
  const monkey = (PRODUCT, START_PAGE_QUERY) => {
    let console = window.console;
    let $ = window.ZenzaJQuery || window.jQuery, _ = window._;
    let TOKEN = 'r:' + (Math.random());
    START_PAGE_QUERY = encodeURIComponent(START_PAGE_QUERY);
    //@version

    console.log(`%c${PRODUCT} v${VER}`, 'font-size: 200%;');
    console.log('%cjQuery v%s, lodash v%s', 'font-size: 200%;', $.fn.jquery, _ && _.VERSION);

//@require baselib.js

//@require Config.js

    const ZenzaWatch = {
      version: VER,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {}
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {};
    }
    window.ZenzaWatch.emitter = ZenzaWatch.emitter = new Emitter();
    const debug = ZenzaWatch.debug;
    const emitter = ZenzaWatch.emitter;
    const util = ZenzaWatch.util;
    // const modules = ZenzaWatch.modules;


//@require constant.js

//@require util.js

//@require loader/api.js

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

//@require parts/CustomElements.js

    if (window.name === 'commentLayerFrame') {
      return;
    }

    if (location.host === 'www.nicovideo.jp') {
      return initialize();
    }

    NicoVideoApi.configBridge(Config).then(() => {
      window.console.log('%cZenzaWatch Bridge: %s', 'background: lightgreen;', location.host);
      if (document.getElementById('siteHeaderNotification')) {
        initialize();
        return;
      }
      NicoVideoApi.ajax({url: '//www.nicovideo.jp/'})
        .then(result => {
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
    }, () => {
      window.console.log('ZenzaWatch Bridge disabled');
    });


  }; // end of monkey


//@require loader/GateAPI.js

//@require boot.js

  boot(monkey, PRODUCT, START_PAGE_QUERY);

})(window.unsafeWindow || window);
