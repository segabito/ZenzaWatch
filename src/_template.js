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
// @match          *://anime.nicovideo.jp/*
// @match          https://www.upload.nicovideo.jp/garage/*
// @match          https://www.google.co.jp/search*
// @match          https://www.google.com/search*
// @match          https://*.bing.com/*
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @exclude        *://ext.nicovideo.jp/thumb/*
// @exclude        *://ext.nicovideo.jp/thumb_channel/*
// @grant          none
// @author         segabito
// @version        2.4.8
// @run-at         document-body
// @require        https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js
// ==/UserScript==
import {AntiPrototypeJs} from '../packages/lib/src/infra/AntiPrototype-js';
import {Emitter} from '../packages/lib/src/Emitter';
import {Config} from './Config';
import {uQuery} from '../packages/lib/src/uQuery';
import {util} from './util';
import {components} from '../packages/components/src/index';
import {State} from './State';
import {api, NicoVideoApi} from './loader/api';
import {VideoInfoModel} from './VideoInfo';
import {VideoSearch} from '../packages/lib/src/nico/VideoSearch';
import {TagEditApi} from '../packages/lib/src/nico/TagEditApi';
import {StoryboardInfoLoader} from '../packages/lib/src/nico/StoryboardInfoLoader';
import {ThreadLoader} from '../packages/lib/src/nico/ThreadLoader';
import {workerUtil} from '../packages/lib/src/infra/workerUtil';
import {IndexedDbStorage} from '../packages/lib/src/infra/IndexedDbStorage';
import {GateAPI} from '../packages/lib/src/nico/GateAPI';
import {boot} from './boot';
import {YouTubeWrapper} from '../packages/zenza/src/videoPlayer/YouTubeWrapper';
import {NicoVideoPlayer} from './NicoVideoPlayer';
import {StoryBoardModel} from './StoryBoard';
import {VideoControlBar} from './VideoControlBar';
import {NicoTextParser} from '../packages/zenza/src/commentLayer/NicoTextParser';
import {CommentPlayer} from './CommentPlayer';
import {CommentLayoutWorker} from '../packages/zenza/src/commentLayer/CommentLayoutWorker';
import {SlotLayoutWorker} from '../packages/zenza/src/commentLayer/SlotLayoutWorker';
import {NicoScripter} from '../packages/zenza/src/commentLayer/NicoScripter';
import {CommentPanel} from './CommentPanel';
import {VideoList} from './VideoList';
import {VideoSessionWorker} from '../packages/lib/src/nico/VideoSessionWorker';
import {StoryboardCacheDb} from '../packages/lib/src/nico/StoryboardCacheDb';
import {NicoVideoPlayerDialog} from './NicoVideoPlayerDialog';
import {RootDispatcher} from './RootDispatcher';
import {CommentInputPanel} from './CommentInputPanel';
import {SettingPanel} from './SettingPanel';
import {TagListView} from './TagListView';
import {VideoInfoPanel} from './VideoInfoPanel';
import {GinzaSlayer} from './GinzaSlayer';
import {initializer} from './initializer';
import {CustomElements} from '../packages/zenza/src/parts/CustomElements';
import {CONSTANT} from './constant';
import {TextLabel} from '../packages/lib/src/ui/TextLabel';
import {parseThumbInfo} from '../packages/lib/src/nico/parseThumbInfo';
import {WatchInfoCacheDb} from '../packages/lib/src/nico/WatchInfoCacheDb';
import {ENV,VER} from './ZenzaWatchIndex';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
//@require AntiPrototypeJs
AntiPrototypeJs();
(() => {
  try {
    if (window.top === window) {
      window.ZenzaLib = { _ };
      console.log('@require', JSON.stringify({lodash: _.VERSION}));
    }
  } catch(e) {
    window.top === window && console.warn('@require failed!', location, e);
  }
})();

(function (window) {
  'use strict';
  const PRODUCT = 'ZenzaWatch';
// 公式プレイヤーがurlを書き換えてしまうので読み込んでおく
  const START_PAGE_QUERY = (location.search ? location.search.substring(1) : '');
  const monkey = (PRODUCT, START_PAGE_QUERY) /*** (｀・ω・´)9m ***/ => {
    const Array = window.PureArray ? window.PureArray : window.Array;
    let console = window.console;
    let $ = window.ZenzaJQuery || window.jQuery, _ = window.ZenzaLib ? window.ZenzaLib._ : window._;
    let TOKEN = 'r:' + (Math.random());
    let CONFIG = null;
    const dll = {};
    const util = {};
    let {workerUtil, IndexedDbStorage, Handler, PromiseHandler, Emitter, parseThumbInfo, WatchInfoCacheDb, StoryboardCacheDb, VideoSessionWorker} = window.ZenzaLib;
    START_PAGE_QUERY = encodeURIComponent(START_PAGE_QUERY);
    //@version
    //@environment

    console.log(
      `%c${PRODUCT}@${ENV} v${VER}`,
      `font-family: "AppleMyungjo"; font-size: 200%; background: #039393; color: #ffc; padding: 8px; text-shadow: 2px 2px #888;`
    );

//@require Config
//@require uQuery

    const ZenzaWatch = {
      version: VER,
      env: ENV,
      debug: {},
      api: {},
      init: {},
      lib: { $: window.ZenzaLib.$ || $, _ },
      external: {},
      util,
      modules: {Emitter, Handler},
      config: Config,
      emitter: new Emitter(),
      state: {},
      dll
    };

    const Navi = {
      version: VER,
      env: ENV,
      debug: {},
      config: NaviConfig,
      emitter: new Emitter(),
      state: {}
    };
    delete window.ZenzaLib;

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
      window.Navi = Navi;
    } else {
      window.ZenzaWatch = {config: ZenzaWatch.config};
      window.Navi = {config: Navi.config};
    }
    window.ZenzaWatch.emitter = ZenzaWatch.emitter = new Emitter();
    const debug = ZenzaWatch.debug;
    const emitter = ZenzaWatch.emitter;

    // const modules = ZenzaWatch.modules;
//@require CONSTANT
const global = {
  emitter, debug,
  external: ZenzaWatch.external, PRODUCT, TOKEN, CONSTANT,
  notify: msg => ZenzaWatch.external.execCommand('notify', msg),
  alert: msg => ZenzaWatch.external.execCommand('alert', msg),
  config: Config,
  api: ZenzaWatch.api
};
//@require util
ZenzaWatch.lib.$ = uQuery;
workerUtil.env({netUtil, global});
//@require components
//@require State
//@require api
//@require VideoInfoModel
//@require VideoSearch
//@require TagEditApi
Object.assign(ZenzaWatch.api, {NicoSearchApiV2Loader});
// global.api.StoryboardCacheDb = StoryboardCacheDb;
WatchInfoCacheDb.api(NicoVideoApi);
StoryboardCacheDb.api(NicoVideoApi);

//@require StoryboardInfoLoader
// ZenzaWatch.api.DmcStoryboardInfoLoader = DmcStoryboardInfoLoader;
ZenzaWatch.api.StoryboardInfoLoader = StoryboardInfoLoader;

//@require ThreadLoader

//@require YouTubeWrapper

//@require NicoVideoPlayer

//@require StoryBoardModel

//@require VideoControlBar

//@require CommentPlayer

//@require CommentLayoutWorker

//@require SlotLayoutWorker

//@require NicoScripter

//@require CommentPanel

//@require VideoList

//@require NicoVideoPlayerDialog

//@require RootDispatcher

//@require CommentInputPanel

//@require SettingPanel

//@require TagListView

//@require VideoInfoPanel

//@require GinzaSlayer

//@require initializer

//@require CustomElements

//@require TextLabel
ZenzaWatch.modules.TextLabel = TextLabel;

    if (window.name === 'commentLayerFrame') {
      return;
    }

    if (location.host === 'www.nicovideo.jp') {
      return initialize();
    }

    NicoVideoApi.configBridge(Config).then(() => {
      window.console.log('%cZenzaWatch Bridge: %s', 'background: lightgreen;', location.host);
      if (document.getElementById('siteHeaderNotification')) {
        return initialize();
      }
      NicoVideoApi.fetch('https://www.nicovideo.jp/',{credentials: 'include'})
        .then(r => r.text())
        .then(result => {
          const $dom = util.$(`<div>${result}</div>`);
          const isLogin = $dom.find('.siteHeaderLogin, #siteHeaderLogin').length < 1;
          const isPremium =
            $dom.find('#siteHeaderNotification').hasClass('siteHeaderPremium');
          window.console.log('isLogin: %s isPremium: %s', isLogin, isPremium);
          nicoUtil.isLogin = () => isLogin;
          nicoUtil.isPremium = util.isPremium = () => isPremium;
          initialize();
        });
    }, err => window.console.log('ZenzaWatch Bridge disabled', err));


  }; // end of monkey
(() => {
//@require Emitter
//@require workerUtil
//@require IndexedDbStorage
//@require WatchInfoCacheDb
//@require parseThumbInfo
//@require StoryboardCacheDb
//@require VideoSessionWorker

  window.ZenzaLib = Object.assign(window.ZenzaLib || {}, {
    workerUtil,
    IndexedDbStorage, WatchInfoCacheDb,
    Handler, PromiseHandler, Emitter, EmitterInitFunc,
    parseThumbInfo, StoryboardCacheDb, VideoSessionWorker
  });
})();

//@require GateAPI

//@require boot
  boot(monkey, PRODUCT, START_PAGE_QUERY);

})(window.unsafeWindow || window);
