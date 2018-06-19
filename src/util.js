import * as _ from 'lodash';
import * as jQuery from 'jQuery';
import {CONSTANT} from './constant';
import {Emitter} from './baselib';
import {Config} from './Config';
import {browser} from './browser';
import {ZenzaWatch, PRODUCT} from './ZenzaWatchIndex';
const {navigator, location} = browser.window;
const $ = jQuery.default;
const window = browser.window;
const document = browser.document;
const history = window.history;
const Node = browser.Node;
const NodeList = browser.NodeList;
const HTMLCollection = browser.NodeList;
let console = window.console;

Object.assign(window, {
  ZenzaWatch,
});

let NicoVideoApi = {};
let CrossDomainGate = () => {
};
const util = {};


//===BEGIN===


class Sleep {
  constructor(time, result) {
    return new Promise(resolve => setTimeout(() => {
      resolve(result);
    }, time));
  }
}

util.sleep = async function sleep(time = 0) {
  return new Sleep(time);
};


const AsyncEmitter = (() => {
  // 過渡期の措置
  const emitter = function () {
  };
  emitter.prototype.on = Emitter.prototype.on;
  emitter.prototype.once = Emitter.prototype.once;
  emitter.prototype.off = Emitter.prototype.off;
  emitter.prototype.clear = Emitter.prototype.clear;
  emitter.prototype.emit = Emitter.prototype.emit;
  emitter.prototype.emitAsync = Emitter.prototype.emitAsync;
  return emitter;
})();
(ZenzaWatch ? ZenzaWatch.lib : {}).AsyncEmitter = AsyncEmitter;

let FullScreen = {
  now: function () {
    if (document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen) {
      return true;
    }
    return false;
  },
  request: function (target) {
    this._handleEvents();
    let elm = typeof target === 'string' ? document.getElementById(target) : target;
    if (!elm) {
      return;
    }
    if (elm.requestFullScreen) {
      elm.requestFullScreen();
    } else if (elm.webkitRequestFullScreen) {
      elm.webkitRequestFullScreen();
    } else if (elm.mozRequestFullScreen) {
      elm.mozRequestFullScreen();
    }
    //$('body').addClass('fullScreen');
  },
  cancel: function () {
    if (!this.now()) {
      return;
    }

    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
    //$('body').removeClass('fullScreen');
  },
  _handleEvents: function () {
    this._handleEvnets = _.noop;
    let self = this;
    let handle = function () {
      let isFullScreen = self.now();
      if (isFullScreen) {
        document.body.classList.add('fullScreen');
      } else {
        document.body.classList.remove('fullScreen');
      }
      ZenzaWatch.emitter.emit('fullScreenStatusChange', isFullScreen);
    };
    document.addEventListener('webkitfullscreenchange', handle, false);
    document.addEventListener('mozfullscreenchange', handle, false);
    document.addEventListener('MSFullscreenChange', handle, false);
    document.addEventListener('fullscreenchange', handle, false);
  }
};

util.fullScreen = FullScreen;


const dummyConsole = {
  log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop, info: _.noop, warn: _.noop
};
console = Config.getValue('debug') ? window.console : dummyConsole;
Config.on('update-debug', function (v) {
  console = v ? window.console : dummyConsole;
});

const PopupMessage = (() => {
  const __view__ = `
        <div class="zenzaPopupMessage">
          <span>%MSG%</span>
        </div><br>
      `.trim();

  const __css__ = `
        .zenzaPopupMessage {
          z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
          opacity: 0;
          display: inline-block;
          white-space: nowrap;
          font-weight: bolder;
          transform: translate3d(0, -100px, 0);
          overflow-y: hidden;
          box-sizing: border-box;
          min-width: 150px;
          text-align: center;
          box-shadow: 4px 4px 2px #ccc;
          transition:
            transform 2s linear,
            opacity 2s ease,
            z-index 1s ease,
            box-shadow 1s ease,
            background 5s ease;

          pointer-events: none;
          background: #000;
          user-select: none;
        }

        .zenzaPopupMessage.show {
          transform: translate3d(0, 0, 0);
          opacity: 0.8;
          max-height: 200px;
          margin-bottom: 16px;
          padding: 8px 16px;
          box-shadow: 4px 4px 2px #ccc;
          transition:
            transform 0.5s linear,
            opacity 1s ease,
            box-shadow 0.5s ease,
            background 0.5s ease;
         }

        .zenzaPopupMessage.show.removing {
          transform: perspective(300px) rotateX(90deg);
          opacity: 0;
          max-height: 0;
          padding: 0px 8px;
          margin-bottom: 0px;
          box-shadow: 4px 4px 2px rgba(192, 192, 192, 0);
          background: rgba(255,255,255, 0.5);
          transition:
            transform     0.3s ease,
            opacity       0.5s ease 0.5s,
            max-height    0.3s ease 1s,
            padding       0.3s ease 1s,
            margin-bottom 0.3s ease 1s,
            box-shadow    0.5s ease,
            background    0.3s ease;
        }

        .zenzaPopupMessage.notify {
          background: #0c0;
          color: #fff;
        }

        .zenzaPopupMessage.alert {
          background: #c00;
          color: #fff;
        }

        .zenzaPopupMessage.debug {
          background: #333;
          color: #fff;
        }

        /* できれば広告に干渉したくないけど仕方なく */
        div[data-follow-container] {
          position: static !important;
        }

      `;

  let initialize = function () {
    initialize = _.noop;
    util.addStyle(__css__);
  };

  let show = function ($msg) {
    initialize();
    let $target = $('.popupMessageContainer');
    if ($target.length < 1) {
      $target = $('body');
    }

    $target.append($msg);

    window.setTimeout(function () {
      $msg.addClass('show');
    }, 100);
    window.setTimeout(function () {
      $msg.addClass('removing');
    }, 3000);
    window.setTimeout(function () {
      $msg.remove();
    }, 8000);
  };

  let notify = function (msg, allowHtml) {
    if (msg === undefined) {
      msg = '不明なエラー';
      window.console.error('undefined message sent');
      window.console.trace();
    }
    console.log('%c%s', 'background: #080; color: #fff; padding: 8px;', msg);
    if (allowHtml !== true) {
      msg = util.escapeHtml(msg);
    }
    let $msg = $(__view__.replace('%MSG%', msg)).addClass('notify');
    show($msg);
  };

  let alert = function (msg, allowHtml) {
    if (msg === undefined) {
      msg = '不明なエラー';
      window.console.error('undefined message sent');
      window.console.trace();
    }
    console.log('%c%s', 'background: #800; color: #fff; padding: 8px;', msg);
    if (allowHtml !== true) {
      msg = util.escapeHtml(msg);
    }
    let $msg = $(__view__.replace('%MSG%', msg)).addClass('alert');
    show($msg);
  };

  let debug = function (msg, allowHtml) {
    if (msg === undefined) {
      msg = '不明なエラー';
      window.console.info('undefined message sent');
      window.console.trace();
    }
    window.console.log('%c%s', 'background: #333; color: #fff; padding: 8px;', msg);
    if (allowHtml !== true) {
      msg = util.escapeHtml(msg);
    }
    let $msg = $(__view__.replace('%MSG%', msg)).addClass('debug');
    show($msg);
  };


  return {
    notify: notify,
    alert: alert,
    debug: debug
  };
})();

const PlayerSession = (function (storage) {
  let prefix = 'ZenzaWatch_';
  let PlayerSession = {};

  PlayerSession.save = function (playingStatus) {
    let key = prefix + 'PlayingStatus';
    storage[key] = JSON.stringify(playingStatus);
  };

  PlayerSession.restore = function () {
    let key = prefix + 'PlayingStatus';
    let session = {};
    try {
      let data = storage[key];
      if (!data) {
        return session;
      }
      session = JSON.parse(storage[key]);
      storage.removeItem(key);
    } catch (e) {
      window.console.error('PlayserSession restore fail: ', key, e);
    }
    console.log('lastSession', session);
    return session;
  };

  PlayerSession.clear = function () {
    let key = prefix + 'PlayingStatus';
    storage.removeItem(key);
  };

  PlayerSession.hasRecord = function () {
    let key = prefix + 'PlayingStatus';
    return storage.hasOwnProperty(key);
  };

  return PlayerSession;
})(sessionStorage);
//ZenzaWatch.debug.PlayerSession = PlayerSession;

util.addStyle = function (styles, id) {
  let elm = document.createElement('style');
  elm.type = 'text/css';
  if (id) {
    elm.id = id;
  }

  let text = styles.toString();
  text = document.createTextNode(text);
  elm.appendChild(text);
  let head = document.getElementsByTagName('head');
  head = head[0];
  head.appendChild(elm);
  return elm;
};

util.parseQuery = function (query = '') {
  const result = {};
  query.split('&').forEach(item => {
    const sp = item.split('=');
    const key = decodeURIComponent(sp[0]);
    const val = decodeURIComponent(sp.slice(1).join('='));
    result[key] = val;
  });
  return result;
};

util.hasLargeThumbnail = function (videoId) {
  // 大サムネが存在する最初の動画ID。 ソースはちゆ12歳
  // ※この数字以降でもごく稀に例外はある。
  const threthold = 16371888;
  const cid = videoId.substr(0, 2);
  if (cid !== 'sm') {
    return false;
  }

  const fid = videoId.substr(2) * 1;
  if (fid < threthold) {
    return false;
  }

  return true;
};


/**
 * 動画IDからサムネのURLを逆算する。
 * 実際はどのサーバーでもサムネ自体はあるっぽい。
 */
util.getThumbnailUrlByVideoId = (() => {
  const videoIdReg = /^[a-z]{2}\d+$/;
  return function (videoId) {
    if (!videoIdReg.test(videoId)) {
      return null;
    }
    const fileId = parseInt(videoId.substr(2), 10);
    const num = (fileId % 4) + 1;
    const large = util.hasLargeThumbnail(videoId) ? '.L' : '';
    return '//tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
  };
})();

let WindowMessageEmitter = (() => {
  let emitter = new Emitter();
  let knownSource = [];

  let onMessage = function (event) {
    if (_.indexOf(knownSource, event.source) < 0 &&
      event.origin !== 'http://ext.nicovideo.jp' &&
      event.origin !== 'https://ext.nicovideo.jp'
    ) {
      return;
    }
    try {
      let data = JSON.parse(event.data);

      if (data.id !== 'ZenzaWatch') {
        return;
      }

      emitter.emit('onMessage', data.body, data.type);
    } catch (e) {
      console.log(
        '%cNicoCommentLayer.Error: window.onMessage  - ',
        'color: red; background: yellow',
        e,
        event
      );
      console.log('%corigin: ', 'background: yellow;', event.origin);
      console.log('%cdata: ', 'background: yellow;', event.data);
      console.trace();
    }
  };

  emitter.addKnownSource = function (win) {
    knownSource.push(win);
  };

  window.addEventListener('message', onMessage);

  return emitter;
})();

const broadcastEmitter = (() => {
  const broadcastEmitter = new Emitter();
  const broadcastChannel =
    (window.BroadcastChannel && location.host === 'www.nicovideo.jp') ?
      (new window.BroadcastChannel('ZenzaWatch')) : null;

  let pingResolve = null, pingReject = null;

  let onStorage = e => {
    let key = e.key;
    if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) {
      return;
    }

    key = key.replace('ZenzaWatch_', '');
    let oldValue = e.oldValue;
    let newValue = e.newValue;
    broadcastEmitter.emit('change', key, newValue, oldValue);

    switch (key) {
      case 'message': {
        const packet = JSON.parse(newValue);
        if (packet.type === 'pong' && pingResolve) {
          pingReject = null;
          return pingResolve(packet);
        }
        console.log('%cmessage', 'background: cyan;', newValue);
        broadcastEmitter.emit('message', packet);
        break;
      }
    }
  };

  let onBroadcastMessage = e => {
    const packet = e.data;
    if (packet.type === 'pong' && pingResolve) {
      pingReject = null;
      return pingResolve(packet);
    }
    console.log('%cmessage', 'background: cyan;', packet);
    broadcastEmitter.emit('message', packet);
  };

  broadcastEmitter.send = packet => {
    if (broadcastChannel) {
      broadcastChannel.postMessage(packet);
    } else {
      packet.__now = Date.now();
      console.log('send Packet', packet);
      Config.setValue('message', packet);
    }
  };

  WindowMessageEmitter.on('onMessage', (data, type) => {
    if (type !== 'nicovideoApi') {
      return;
    }
    switch (data.message.command) {
      case 'configSync':
        //window.console.log('configSync: ', data.message.key, data.message.value);
        Config.setValueSilently(data.message.key, data.message.value);
        break;
      case 'message': {
        if (!data.message.value) {
          return;
        }
        const packet = JSON.parse(data.message.value);
        if (packet.type === 'pong' && pingResolve) {
          pingReject = null;
          return pingResolve(packet);
        }
        broadcastEmitter.emit('message', packet);
        break;
      }
    }
  });

  broadcastEmitter.pong = playerId => {
    broadcastEmitter.send({id: playerId, type: 'pong'});
  };

  broadcastEmitter.ping = () => {
    const TIMEOUT = broadcastChannel ? 500 : 500;
    return new Promise(function (resolve, reject) {
      pingResolve = resolve;
      pingReject = reject;
      broadcastEmitter.send({type: 'ping'});
      window.setTimeout(function () {
        if (pingReject) {
          pingReject('timeout');
        }
        pingReject = pingResolve = null;
      }, TIMEOUT);
    });
  };

  broadcastEmitter.sendOpen = (watchId, params) => {
    broadcastEmitter.send(Object.assign({
      type: 'openVideo',
      watchId: watchId,
      eventType: 'click'
    }, params));
  };

  broadcastEmitter.notifyClose = () => {
    broadcastEmitter.send({type: 'notifyClose'});
  };

  if (ZenzaWatch && ZenzaWatch.debug) {
    ZenzaWatch.debug.ping = () => {
      window.console.time('ping');
      return broadcastEmitter.ping().then(result => {
        window.console.timeEnd('ping');
        window.console.info('ping result: ok', result);
      }).catch(result => {
        window.console.timeEnd('ping');
        window.console.error('ping result: ', result);
      });
    };
  }

  if (location.host === 'www.nicovideo.jp') {
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);
  }

  return broadcastEmitter;
})();

/**
 *  pushStateを使ってブラウザバックの履歴に載せようと思ったけど、
 *  あらゆるページに寄生するシステムの都合上断念。
 *  とりあえず既読リンクの色が変わるようにだけする
 */
const WatchPageHistory = (({config, location, document, history}) => {
  const originalUrl = location.href;
  const originalTitle = document.title;
  let isOpen = false;
  let dialog;
  let watchId;
  let title;
  let path;
  let restore = _.debounce(() => {
    if (!isOpen) { return; }
    history.replaceState(null, null, originalUrl);
    document.title = originalTitle;
  }, 3000);

  const onVideoInfoLoad = _.debounce(videoInfo => {
    if (!videoInfo.watchId || !isOpen) {
      return;
    }
    watchId = videoInfo.watchId;
    title = `${videoInfo.title} by ${videoInfo.owner.name} - ZenzaWatch`;
    path = `watch/${watchId}`;

    if (location.host !== 'www.nicovideo.jp') {
      if (NicoVideoApi && NicoVideoApi.postMessage) {
        NicoVideoApi.postMessage('pushHistory', {path, title});
      }
      return;
    }

    history.replaceState(null, null, path);
    document.title = title;

    if (util.isGinzaWatchUrl(originalUrl)) {
      return;
    }

    restore();
  });

  const onDialogOpen = () => {
    isOpen = true;
  };

  const onDialogClose = () => {
    isOpen = false;
    watchId = title = path = null;
    history.replaceState(null, null, originalUrl);
    document.title = originalTitle;
  };

  const initialize = _dialog => {
    if (dialog) {
      return;
    }
    if (!config.getValue('enablePushState')) {
      return;
    }
    dialog = _dialog;

    if (location.host === 'www.nicovideo.jp') {
      dialog.on('close', onDialogClose);
    }

    dialog.on('open', onDialogOpen);
    dialog.on('loadVideoInfo', onVideoInfoLoad);
  };

  return {
    initialize: initialize
  };
})({config: Config, location, document, history});

util.getWatchId = url => {
  /\/?watch\/([a-z0-9]+)/.test(url || location.pathname);
  return RegExp.$1;
};

util.isPremium = () => {
  let h = document.getElementById('siteHeaderNotification');
  return h && h.className === 'siteHeaderPremium';
};

util.isLogin = () => {
  return document.getElementsByClassName('siteHeaderLogin').length < 1;
};

util.getPageLanguage = () => {
  try {
    let h = document.getElementsByClassName('html')[0];
    return h.lang || 'ja-JP';
  } catch (e) {
    return 'ja-JP';
  }
};

util.isSameOrigin = () => {
  return location.host === 'www.nicovideo.jp';
};

util.hasFlashPlayer = () => {
  return !!navigator.mimeTypes['application/x-shockwave-flash'];
};

util.isFirefox = () => {
  return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
};

util.isWebkit = () => {
  return navigator.userAgent.toLowerCase().indexOf('webkit') >= 0;
};

util.escapeHtml = text => {
  let map = {
    '&': '&amp;',
    '\x27': '&#39;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
  };
  return text.replace(/[&"'<>]/g, char => map[char]);
};

util.unescapeHtml = text => {
  let map = {
    '&amp;': '&',
    '&#39;': '\x27',
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>'
  };
  return text.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, char => map[char]);
};


// 基本的に動画タイトルはエスケープされている。
// だが、なんかたまにいいかげんなデータがあるし、本当に信用できるか？
// そこで、全角に置き換えてごますんだ！
util.escapeToZenkaku = text => {
  let map = {
    '&': '＆',
    '\'': '’',
    '"': '”',
    '<': '＜',
    '>': '＞'
  };
  return text.replace(/["'<>]/g, char => map[char]);
};


util.escapeRegs = text => {
  let match = /[\\^$.*+?()[\]{}|]/g;
  // return text.replace(/[\\\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/]/g, char => {
  return text.replace(match, '\\$&');
};

// 漢数字のタイトルのソートに使うだけなので百とか千とか考えない
util.convertKansuEi = text => {
  // `〇話,一話,二話,三話,四話,五話,六話,七話,八話,九話,十話,十一話,十二話,十三話,
  // 十四話,十五話,十六話,十七話,十八話,十九話,二十話,二十一話,二十二話,二十三話,二十四話,二十五話,二十六話`
  // .split(',').map(c => convertKansuEi(c).replace(/([0-9]{1,9})/g, m =>  m.padStart(3, '0'))).sort()
  let match = /[〇一二三四五六七八九零壱弐惨伍]/g;
  let map = {
    '〇': '0', '零': '0',
    '一': '1', '壱': '1',
    '二': '2', '弐': '2',
    '三': '3', '惨': '3',
    '四': '4',
    '五': '5', '伍': '5',
    '六': '6',
    '七': '7',
    '八': '8',
    '九': '9',
    // '十': 'Ａ', '拾': 'Ａ'
  };
  text = text.replace(match, char => map[char]);
  text = text.replace(/([1-9]?)[十拾]([0-9]?)/g, (n, a, b) => (a && b) ? `${a}${b}` : (a ? a * 10 : 10 + b * 1));
  return text;
};
util.dateToString = date => {
  if (typeof date === 'string') {
    const origDate = date;
    date = date.replace(/\//g, '-');
    // 時差とか考慮してない
    const m = /^(\d+-\d+-\d+) (\d+):(\d+):(\d+)/.exec(date);
    if (m) {
      date = new Date(m[1]);
      date.setHours(m[2]);
      date.setMinutes(m[3]);
      date.setSeconds(m[4]);
    } else {
      const t = Date.parse(date);
      if (isNaN(t)) {
        return origDate;
      }
      date = new Date(t);
    }
  } else if (typeof date === 'number') {
    date = new Date(date);
  }

  let [yy, mm, dd, h, m, s] = [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ].map(n => n.toString().padStart(2, '0'));
  return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
};

util.copyToClipBoard = text => {
  let clip = document.createElement('input');
  clip.type = 'text';
  clip.style.position = 'fixed';
  clip.style.left = '-9999px';
  clip.value = text;

  document.body.appendChild(clip);
  clip.select();
  document.execCommand('copy');

  window.setTimeout(() => {
    clip.remove();
  }, 0);
};

util.isValidJson = data => {
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
};


util.openTweetWindow = videoInfo => {
  let watchId = videoInfo.watchId;
  let nicomsUrl = 'http://nico.ms/' + watchId;
  let watchUrl = location.protocol + '//www.nicovideo.jp/watch/' + watchId;

  let sec = videoInfo.duration;
  let m = Math.floor(sec / 60);
  let s = (Math.floor(sec) % 60).toString().padStart(2, '0');
  let dur = `(${m}:${s})`;
  let nicoch = videoInfo.isChannel ? ',+nicoch' : '';
  let url =
    'https://twitter.com/intent/tweet?' +
    'url=' + encodeURIComponent(nicomsUrl) +
    '&text=' + encodeURIComponent(videoInfo.title + dur) +
    '&hashtags=' + encodeURIComponent(videoInfo.videoId + nicoch) +
    '&original_referer=' + encodeURIComponent(watchUrl) +
    '';
  window.open(url, '_blank', 'width=550, height=480, left=100, top50, personalbar=0, toolbar=0, scrollbars=1, sizable=1', 0);
};

util.fetch = (url, params) => {
  if (location.host !== 'www.nicovideo.jp') {
    return NicoVideoApi.fetch(url, params);
  }
  params = params || {};
  const racers = [];

  const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
  if (timeout > 0) {
    racers.push(new Promise((resolve, reject) => {
        setTimeout(() => {
          reject({name: 'timeout'});
        }, timeout);
      })
    );
  }

  const controller = window.AbortController ? (new AbortController()) : null;
  if (controller) {
    params.signal = controller.signal;
  }
  racers.push(window.fetch(url, params));
  return Promise.race(racers).catch(err => {
    if (err.name === 'timeout') {
      window.console.warn('request timeout', url, params);
      if (controller) {
        controller.abort();
      }
    }
    return Promise.reject(err);
  });
};


util.ajax = params => {
  if (location.host !== 'www.nicovideo.jp') {
    return NicoVideoApi.ajax(params);
  }
  // マイページのjQueryが古くてDeferredの挙動が怪しいのでネイティブのPromiseで囲う
  return new Promise((resolve, reject) => {
    $.ajax(params).then(
      (result) => {
        return resolve(result);
      },
      (err) => {
        return reject(err);
      }
    );
  });
};

if (!location.host.match(/\.nicovideo\.jp$/)) {
  util.ajax = util.fetch = () => {};
}

util.openMylistWindow = watchId => {
  window.open(
    '//www.nicovideo.jp/mylist_add/video/' + watchId,
    'nicomylistadd',
    'width=500, height=400, menubar=no, scrollbars=no');
};

util.isGinzaWatchUrl = url => {
  url = url || location.href;
  return /^https?:\/\/www\.nicovideo\.jp\/watch\//.test(url);
};

util.getPlayerVer = () => {
  if (!!document.getElementById('js-initial-watch-data')) {
    return 'html5';
  }
  if (!!document.getElementById('watchAPIDataContainer')) {
    return 'flash';
  }
  return 'unknown';
};

util.isZenzaPlayableVideo = () => {
  try {
    // HTML5版プレイヤーなら再生できるはず
    if (util.getPlayerVer() === 'html5') {
      return true;
    }
    const watchApiData = JSON.parse($('#watchAPIDataContainer').text());
    const flvInfo = util.parseQuery(
      decodeURIComponent(watchApiData.flashvars.flvInfo)
    );
    const dmcInfo = JSON.parse(
      decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
    );
    const videoUrl = flvInfo.url ? flvInfo.url : '';
    const isDmc = dmcInfo && dmcInfo.time;
    if (isDmc) {
      return true;
    }
    const isSwf = /\/smile\?s=/.test(videoUrl);
    const isRtmp = (videoUrl.indexOf('rtmp') === 0);
    return (isSwf || isRtmp) ? false : true;
  } catch (e) {
    return false;
  }
};

util.createDrawCallFunc = func => {

  let args, requestId = 0;

  let onFrame = () => {
    func(...args);
    requestId = 0;
  };

  return (..._args) => {
    if (requestId) {
      cancelAnimationFrame(requestId);
      requestId = 0;
    }
    args = _args;
    requestId = requestAnimationFrame(onFrame);
  };
};

util.secToTime = sec => {
  let m = Math.floor(sec / 60).toString().padStart(2, '0');
  let s = (Math.floor(sec) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

util.toRgba = (c, alpha = 1) => {
  return `rgba(${parseInt(c.substr(1, 2), 16)},${parseInt(c.substr(3, 2), 16)},${parseInt(c.substr(5, 2), 16)},${alpha})`;
};

util.videoCapture = (src, sec) => {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const v = util.createVideoElement('capture');
    if (!v) {
      return reject();
    }
    const css = {
      width: '64px',
      height: '36px',
      position: 'fixed',
      left: '-100px',
      top: '-100px'
    };
    Object.keys(css).forEach(key => {
      v.style[key] = css[key];
    });

    v.addEventListener('loadedmetadata', () => {
      v.currentTime = sec;
    });
    v.addEventListener('error', (err) => {
      v.remove();
      reject(err);
    });

    const onSeeked = () => {
      if (resolved) {
        return;
      }
      const c = document.createElement('canvas');
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(v.drawableElement || v, 0, 0);
      v.remove();

      resolved = true;
      return resolve(c);
    };

    v.addEventListener('seeked', onSeeked);

    setTimeout(() => {
      if (resolved) {
        return;
      }
      v.remove();
      reject();
    }, 30000);

    document.body.appendChild(v);
    v.volume = 0;
    v.autoplay = false;
    v.controls = false;
    v.src = src;
    v.currentTime = sec;
  });
};

util.capTube = function ({title, videoId, author}) {
  const iframe = document.querySelector(
    '#ZenzaWatchVideoPlayerContainer iframe[title^=YouTube]');
  if (!iframe) {
    return;
  }
  const command = 'capture';
  iframe.contentWindow.postMessage(
    JSON.stringify({command, title, videoId, author}),
    'https://www.youtube.com'
  );
};

util.saveMymemory = function (player, videoInfo) {
  let html = player.getMymemory();
  const title =
    videoInfo.watchId + ' - ' +
    videoInfo.title; // エスケープされてる
  const info = (`
        <div>
          <h2>${videoInfo.title}</h2>
          <a href="//www.nicovideo.jp/watch/${videoInfo.watchId}?from=${Math.floor(player.getCurrentTime())}">元動画</a><br>
          作成環境: ${navigator.userAgent}<br>
          作成日: ${(new Date()).toLocaleString()}<br>
          ZenzaWatch: ver${ZenzaWatch.version} (${ZenzaWatch.env})<br>

          <button
            onclick="document.body.classList.toggle('debug');return false;">
            デバッグON/OFF
          </button>
        </div>
      `).trim();
  html = html
    .replace(/<title>(.*?)<\/title>/, '<title>' + title + '</title>')
    .replace(/(<body.*?>)/, '$1' + info);

  const blob = new Blob([html], {'type': 'text/html'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('download', title + '.html');
  a.setAttribute('href', url);
  a.setAttribute('rel', 'noopener');
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
  }, 1000);
};

util.speak = (() => {
  let speaking = false;
  let msg = null;
  //let initialized = false;
  let resolve = null, reject = null;

  let initialize = () => {
    // Chromeは使い回しできるけどFirefoxはできないっぽい?
    //if (initialized) { return; }
    //initialized = true;

    msg = new window.SpeechSynthesisUtterance();

    msg.onend = () => {
      speaking = false;
      if (resolve) {
        resolve(msg.text);
      }
      resolve = reject = null;
    };

    msg.onerror = () => {
      speaking = false;
      if (reject) {
        reject(msg.text);
      }
      resolve = reject = null;
    };

  };

  return function (text, option = {}) {
    if (!window.speechSynthesis) {
      return;
    }
    initialize();

    if (option.volume) {
      msg.volume = option.volume;
    }
    if (option.rate) {
      msg.rate = option.rate;
    }
    if (option.lang) {
      msg.lang = option.lang;
    }
    if (option.pitch) {
      msg.pitch = option.pitch;
    }
    if (option.rate) {
      msg.rate = option.rate;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      if (reject) {
        reject(new Error('cancel'));
      }
      resolve = reject = null;
    }

    msg.text = text;

    return new Promise((res, rej) => {
      resolve = res;
      reject = rej;
      window.speechSynthesis.speak(msg);
    });
  };
})();

util.createDom = template => {
  const tpl = document.createElement('template');
  tpl.innerHTML = template;
  return document.importNode(tpl.content, true);
};

util.dispatchCustomEvent = (elm, name, detail) => {
  const ev = new CustomEvent(name, {
    detail
  });
  elm.dispatchEvent(ev);
};

util.getNicoHistory = () => {
  return window.decodeURIComponent(document.cookie.replace(/^.*(nicohistory[^;+]).*?/, ''));
};

util.watchResize = (target, callback) => {
  if (window.ResizeObserver) {
    const ro = new window.ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === target) {
          callback();
          return;
        }
      }
    });
    ro.observe(target);
    return;
  }
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    border: 0,
    //transform: 'translate3d(0, 0, 0)',
    opacity: 0
  });
  target.appendChild(iframe);
  iframe.contentWindow.addEventListener('resize', () => {
    callback();
  });
};

util.sortedLastIndex = (arr, value) => {
  let head = 0;
  let tail = arr.length;
  while (head < tail) {
    let p = Math.floor((head + tail) / 2);
    let v = arr[p];
    if (v <= value) {
      head = p + 1;
    } else {
      tail = p;
    }
  }
  return tail;
};

util.createVideoElement = (...args) => {
  if (ZenzaWatch.debug.createVideoElement) {
    return ZenzaWatch.debug.createVideoElement(...args);
  }
  return document.createElement('video');
};

util.$ = (() => {

  const elementEventsMap = new WeakMap();
  const toCamel = p => {
    return p.replace(/-./g, s => s.charAt(1).toUpperCase());
  };

  class $Elements extends Array {
    constructor(elm) {
      super();
      // window.console.log('$Elements', this, this instanceof Array, this instanceof $Elements, this.on);
      if (elm instanceof Node) {
        this[0] = elm;
      } else if (elm[Symbol.iterator] || elm instanceof NodeList || elm instanceof HTMLCollection) {
        for (let e of elm) {
          this.push(e);
        }
      } else {
        this.push(elm);
      }
    }

    find(query) {
      const found = [];
      this.forEach(elm => {
        for (let e of elm.querySelectorAll(query)) {
          if (!found.includes(e)) {
            found.push(e);
          }
        }
      });
      const result = new $Elements(found);
      result.end = () => { return this; };
      return result;
    }

    end() {
      return this;
    }

    each(callback) {
      this.forEach((elm, index) => {
        callback(index, new $Elements(elm));
      });
    }

    closest(selector) {
      const result = super.find(elm => {
        const e = elm.closest(selector);
        if (e) {
          return e;
        }
      });
      if (result) {
        return new $Elements(result);
      }
      return null;
    }

    toggleClass(className, v) {
      if (typeof v === 'boolean') {
        if (v) {
          return this.addClass(className);
        } else {
          return this.removeClass(className);
        }
      }
      this.forEach(elm => {
        className.trim().split(/[ ]+/).forEach(c => {
          elm.classList.toggle(c, v);
        });
      });
      return this;
    }

    addClass(className) {
      let names = className.split(/[ ]+/);
      this.forEach(elm => {
        elm.classList.add(...names);
      });
      return this;
    }

    removeClass(className) {
      let names = className.split(/[ ]+/);
      this.forEach(elm => {
        elm.classList.remove(...names);
      });
      return this;
    }

    hasClass(className) {
      const names = className.trim().split(/[ ]+/);
      const hasClass = (name) => {
        for (let e of this) {
          if (e.classList.contains(name)) { return true; }
        }
        return false;
      };
      return names.findIndex(hasClass) >= 0;
    }

    _css(key, val) {
      const camelKey = toCamel(key);
      if (/(width|height|top|left)$/i.test(camelKey) && isNaN(val)) {
        val += 'px';
      }
      this.forEach(e => {
        e.style[camelKey] = val;
      });
      return this;
    }

    css(key, val) {
      if (typeof key === 'string') {
        return this._css(key, val);
      }
      Object.keys(key).forEach(k => {
        return this._css(k, key[k]);
      });
      return this;
    }

    on(eventName, callback, options) {
      if (typeof callback !== 'function') {
        return this;
      }
      eventName = eventName.trim();
      const elementEventName = eventName.split('.')[0];
      this.forEach(e => {
        const elementEvents = elementEventsMap.get(e) || {};
        const listeners = elementEvents[eventName] = elementEvents[eventName] || [];
        if (!listeners.includes(callback)) {
          listeners.push(callback);
        }
        elementEventsMap.set(e, elementEvents);

        e.addEventListener(elementEventName, callback, options);
      });
      return this;
    }

    off(eventName, callback) {

      if (!eventName) {
        this.forEach(e => {
          const elementEvents = elementEventsMap.get(e) || {};
          Object.keys(elementEvents).forEach(eventName => {
            this.off(eventName);
          });
          elementEventsMap.delete(e);
        });
        return this;
      }

      eventName = eventName.trim();
      const [elementEventName, eventKey] = eventName.split('.');
      if (!callback) {
        this.forEach(e => {
          const elementEvents = elementEventsMap.get(e) || {};

          for (let cb of (elementEvents[eventName] || [])) {
            e.removeEventListener(elementEventName, cb);
          }
          delete elementEvents[eventName];

          Object.keys(elementEvents).forEach(key => {
            if ((!eventKey && key.startsWith(`${elementEventName}.`)) || (!elementEventName && key.endsWith(`.${eventKey}`))
            ) {
              this.off(key);
            }
          });
        });
        return this;
      }

      this.forEach(e => {
        const elementEvents = elementEventsMap.get(e) || {};
        elementEvents[eventName] = (elementEvents[eventName] || []).find(cb => {
          return cb !== callback;
        });
        let found = Object.keys(elementEvents).find(key => {
          const listeners = elementEvents[key] || [];
          if (key.startsWith(`${elementEventName}.`) && listeners.includes(callback)) {
            return true;
          }
        });
        if (found) { return; }
        e.removeEventListener(elementEventName, callback);
      });

      return this;
    }

    _setAttribute(key, val) {
      if (val === null || val === '' || val === undefined) {
        this.forEach(e => {
          e.removeAttribute(key);
        });
      } else {
        this.forEach(e => {
          e.setAttribute(key, val);
        });
      }
      return this;
    }

    setAttribute(key, val) {
      if (typeof key === 'string') {
        return this._setAttribute(key, val);
      }
      Object.keys(key).forEach(k => {
        this._setAttribute(k, key[k]);
      });
      return this;
    }

    attr(key, val) {
      if (arguments.length >= 2 || _.isObject(key)) {
        return this.setAttribute(key, val);
      } else {
        let result = null;
        this.some(e => {
          if (e.hasAttribute(key)) {
            result = e.getAttribute(key);
            return true;
          }
        });
        return result;
      }
    }

    append(elm) {
      if (!this.length) {
        return this;
      }
      const node = this[0];
      if (elm instanceof ($Elements) || elm.forEach) {
        elm.forEach(e => {
          node.appendChild(e);
        });
      } else if (elm instanceof NodeList || elm instanceof HTMLCollection) {
        for (let e of elm) {
          node.appendChild(e);
        }
      } else if (elm instanceof Node) {
        node.appendChild(elm);
      }
      return this;
    }

    appendChild(...args) {
      return this.append(...args);
    }
  }

  let ret = q => {
    if (q instanceof ($Elements)) {
      return q;
    } else if (q instanceof Node) {
      return new $Elements([q]);
    } else if (q instanceof NodeList || q instanceof HTMLCollection) {
      return new $Elements(q);
    } else if (typeof q === 'string') {
      if (q.startsWith('<')) {
        return new $Elements(Array.from(util.createDom(q).querySelectorAll('*')));
      } else {
        return new $Elements(Array.from(document.querySelectorAll(q)));
      }
    } else {
      return new $Elements(q);
    }
  };

  ret.$Elements = $Elements;
  return ret;
})();

const ShortcutKeyEmitter = (config => {
  if (!ZenzaWatch) {
    return;
  }
  let emitter = new Emitter();
  let isVerySlow = false;

  // コンソールでキーバインド変更
  //
  // 例: ENTERでコメント入力開始
  // ZenzaWatch.config.setValue('KEY_INPUT_COMMENT', 13);
  // SHIFTをつけたいときは 13 + 0x1000

  const map = {
    CLOSE: 0,
    RE_OPEN: 0,
    HOME: 0,
    SEEK_LEFT: 0,
    SEEK_RIGHT: 0,
    SEEK_LEFT2: 0,
    SEEK_RIGHT2: 0,
    SEEK_PREV_FRAME: 0,
    SEEK_NEXT_FRAME: 0,
    VOL_UP: 0,
    VOL_DOWN: 0,
    INPUT_COMMENT: 0,
    FULLSCREEN: 0,
    MUTE: 0,
    TOGGLE_COMMENT: 0,
    DEFLIST_ADD: 0,
    DEFLIST_REMOVE: 0,
    TOGGLE_PLAY: 0,
    TOGGLE_PLAYLIST: 0,
    SCREEN_MODE_1: 0,
    SCREEN_MODE_2: 0,
    SCREEN_MODE_3: 0,
    SCREEN_MODE_4: 0,
    SCREEN_MODE_5: 0,
    SCREEN_MODE_6: 0,
    SHIFT_RESET: 0,
    SHIFT_DOWN: 0,
    SHIFT_UP: 0,
    NEXT_VIDEO: 0,
    PREV_VIDEO: 0,
    SCREEN_SHOT: 0,
    SCREEN_SHOT_WITH_COMMENT: 0
  };

  Object.keys(map).forEach(key => {
    map[key] = parseInt(config.getValue('KEY_' + key), 10);
  });

  let onKeyDown = e => {
    if (e.target.tagName === 'SELECT' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA') {
      return;
    }

    let keyCode = e.keyCode +
      (e.metaKey ? 0x1000000 : 0) +
      (e.altKey ? 0x100000 : 0) +
      (e.ctrlKey ? 0x10000 : 0) +
      (e.shiftKey ? 0x1000 : 0);
    let key = '';
    let param = '';
    switch (keyCode) {
      case 178:
      case 179:
        key = 'TOGGLE_PLAY';
        break;
      case 177:
        key = 'PREV_VIDEO';
        break;
      case 176:
        key = 'NEXT_VIDEO';
        break;
      case map.CLOSE:
        key = 'ESC';
        break;
      case map.RE_OPEN:
        key = 'RE_OPEN';
        break;
      case map.HOME:
        key = 'SEEK_TO';
        param = 0;
        break;
      case map.SEEK_LEFT2:
        key = 'SEEK_BY';
        param = isVerySlow ? -0.5 : -5;
        break;
      case map.SEEK_LEFT:
      case 37: // LEFT
        if (e.shiftKey || isVerySlow) {
          key = 'SEEK_BY';
          param = isVerySlow ? -0.5 : -5;
        }
        break;

      case map.VOL_UP:
        key = 'VOL_UP';
        break;
      case map.SEEK_RIGHT2:
        key = 'SEEK_BY';
        param = isVerySlow ? 0.5 : 5;
        break;
      case map.SEEK_RIGHT:
      case 39: // RIGHT
        if (e.shiftKey || isVerySlow) {
          key = 'SEEK_BY';
          param = isVerySlow ? 0.5 : 5;
        }
        break;
      case map.SEEK_PREV_FRAME:
        key = 'SEEK_PREV_FRAME';
        break;
      case map.SEEK_NEXT_FRAME:
        key = 'SEEK_NEXT_FRAME';
        break;
      case map.VOL_DOWN:
        key = 'VOL_DOWN';
        break;
      case map.INPUT_COMMENT:
        key = 'INPUT_COMMENT';
        break;
      case map.FULLSCREEN:
        key = 'FULL';
        break;
      case map.MUTE:
        key = 'MUTE';
        break;
      case map.TOGGLE_COMMENT:
        key = 'VIEW_COMMENT';
        break;
      case map.DEFLIST_ADD:
        key = 'DEFLIST';
        break;
      case map.DEFLIST_REMOVE:
        key = 'DEFLIST_REMOVE';
        break;
      case map.TOGGLE_PLAY:
        key = 'TOGGLE_PLAY';
        break;
      case map.TOGGLE_PLAYLIST:
        key = 'TOGGLE_PLAYLIST';
        break;
      case map.SHIFT_RESET:
        key = 'PLAYBACK_RATE';
        isVerySlow = true;
        param = 0.1;
        break;
      case map.SCREEN_MODE_1:
        key = 'SCREEN_MODE';
        param = 'small';
        break;
      case map.SCREEN_MODE_2:
        key = 'SCREEN_MODE';
        param = 'sideView';
        break;
      case map.SCREEN_MODE_3:
        key = 'SCREEN_MODE';
        param = '3D';
        break;
      case map.SCREEN_MODE_4:
        key = 'SCREEN_MODE';
        param = 'normal';
        break;
      case map.SCREEN_MODE_5:
        key = 'SCREEN_MODE';
        param = 'big';
        break;
      case map.SCREEN_MODE_6:
        key = 'SCREEN_MODE';
        param = 'wide';
        break;
      case map.NEXT_VIDEO:
        key = 'NEXT_VIDEO';
        break;
      case map.PREV_VIDEO:
        key = 'PREV_VIDEO';
        break;
      case map.SHIFT_DOWN:
        key = 'SHIFT_DOWN';
        break;
      case map.SHIFT_UP:
        key = 'SHIFT_UP';
        break;
      case map.SCREEN_SHOT:
        key = 'SCREEN_SHOT';
        break;
      case map.SCREEN_SHOT_WITH_COMMENT:
        key = 'SCREEN_SHOT_WITH_COMMENT';
        break;
      default:
        break;
    }
    if (key) {
      emitter.emit('keyDown', key, e, param);
    }
  };

  let onKeyUp = e => {
    if (e.target.tagName === 'SELECT' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA') {
      return;
    }

    let key = '';
    let keyCode = e.keyCode +
      (e.metaKey ? 0x1000000 : 0) +
      (e.altKey ? 0x100000 : 0) +
      (e.ctrlKey ? 0x10000 : 0) +
      (e.shiftKey ? 0x1000 : 0);
    let param = '';
    switch (keyCode) {
      case map.SHIFT_RESET:
        key = 'PLAYBACK_RATE';
        isVerySlow = false;
        param = 1;
        break;
    }
    if (key) {
      emitter.emit('keyUp', key, e, param);
    }
  };

  let initialize = () => {
    initialize = _.noop;
    document.body.addEventListener('keydown', onKeyDown);
    document.body.addEventListener('keyup', onKeyUp);
    ZenzaWatch.emitter.on('keydown', onKeyDown);
    ZenzaWatch.emitter.on('keyup', onKeyUp);
  };

  ZenzaWatch.emitter.once('ready', initialize);
  return emitter;
})(Config);
util.ShortcutKeyEmitter = ShortcutKeyEmitter;


let RequestAnimationFrame = function (callback, frameSkip) {
  this.initialize(callback, frameSkip);
};
_.assign(RequestAnimationFrame.prototype, {
  initialize: function (callback, frameSkip) {
    this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
    this._frameCount = 0;
    this._callback = callback;
    this._enable = false;
    this._onFrame = this._onFrame.bind(this);
  },
  _onFrame: function () {
    if (!this._enable) { return; }
    this._frameCount++;
    if (this._frameCount % (this._frameSkip + 1) === 0) {
      this._callback();
    }
    this._requestId = requestAnimationFrame(this._onFrame);
  },
  enable: function () {
    if (this._enable) {
      return;
    }
    this._enable = true;

    this._requestId = requestAnimationFrame(this._onFrame);
  },
  disable: function () {
    this._enable = false;

    if (!this._requestId) {
      return;
    }
    cancelAnimationFrame(this._requestId);
    this._requestId = null;
  }
});
util.RequestAnimationFrame = RequestAnimationFrame;


class FrameLayer extends Emitter {
  constructor(params) {
    super();
    this._container = params.container;
    this._retryGetIframeCount = 0;

    this._initializeView(params, 0);
  }
}

_.assign(FrameLayer.prototype, {
  _initializeView: function (params, retryCount) {

    let iframe = this._getIframe();
    iframe.className = params.className || '';

    let onload = () => {
      let win;
      iframe.onload = null;
      try {
        win = iframe.contentWindow;
      } catch (e) {
        window.console.error(e);
        window.console.log('変な広告に乗っ取られました');
        iframe.remove();
        if (retryCount < 3) {
          this._initializeView(params, retryCount + 1);
        }
        return;
      }

      this.emit('load', win);
    };

    let html = this._html = params.html;
    this._container.appendChild(iframe);
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
  _getIframe: function () {
    let reserved = document.getElementsByClassName('reservedFrame');
    let iframe;
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
  }
});

const MylistPocketDetector = (() => {
  let isReady = false;
  let pocket = null;
  const emitter = new Emitter();

  const initialize = () => {
    const onPocketReady = () => {
      isReady = true;
      pocket = window.MylistPocket;

      emitter.emit('ready', pocket);
    };

    if (window.MylistPocket && window.MylistPocket.isReady) {
      onPocketReady();
    } else {
      document.body.addEventListener('MylistPocketInitialized', () => {
        onPocketReady();
      }, {once: true});
    }
  };

  const detect = () => {
    return new Promise(res => {
      if (isReady) {
        return res(pocket);
      }
      emitter.once('ready', () => {
        res(pocket);
      });
    });
  };

  initialize();
  return {
    detect: detect
  };

})();


const VideoCaptureUtil = (() => {
  const crossDomainGates = {};

  const initializeByServer = (server, fileId) => {
    if (crossDomainGates[server]) {
      return crossDomainGates[server];
    }

    const baseUrl = '//' + server + '/smile?i=' + fileId;

    crossDomainGates[server] = new CrossDomainGate({
      baseUrl: baseUrl,
      origin: location.protocol + '//' + server + '/',
      type: 'storyboard_' + server.split('.')[0].replace(/-/g, '_'),
      messager: WindowMessageEmitter
    });

    return crossDomainGates[server];
  };

  const _toCanvas = (v, width, height) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(v.drawableElement || v, 0, 0, width, height);
    return canvas;
  };

  const isCORSReadySrc = src => {
    if (src.indexOf('dmc.nico') >= 0) {
      return true;
    }
    return false;
  };

  const videoToCanvas = video => {
    const src = video.src;
    const sec = video.currentTime;
    const a = document.createElement('a');
    a.href = src;
    const server = a.host;
    const search = a.search;

    if (isCORSReadySrc(src)) {
      return Promise.resolve({canvas: _toCanvas(video, video.videoWidth, video.videoHeight)});
    }

    return new Promise((resolve, reject) => {
      if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
        return reject({status: 'fail', message: 'invalid url', url: src});
      }
      const fileId = RegExp.$2;

      const gate = initializeByServer(server, fileId);

      gate.videoCapture(src, sec).then(dataUrl => {
        //window.console.info('video capture success ', dataUrl.length);

        const bin = atob(dataUrl.split(',')[1]);
        const buf = new Uint8Array(bin.length);
        for (let i = 0, len = buf.length; i < len; i++) {
          buf[i] = bin.charCodeAt(i);
        }
        const blob = new Blob([buf.buffer], {type: 'image/png'});
        const url = window.URL.createObjectURL(blob);
        console.info('createObjectUrl', url.length);

        const img = new Image();

        img.onload = () => {
          resolve({canvas: _toCanvas(img, video.videoWidth, video.videoHeight)});
          window.setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 10000);
        };

        img.onerror = (err) => {
          reject(err);
          window.setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 10000);
        };

        img.src = url;
        //img.style.border = '2px dotted orange'; document.body.appendChild(img);
      });
    });
  };

  // 参考
  // https://developer.mozilla.org/ja/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
  const htmlToSvg = (html, width = 682, height = 384) => {
    const data =
      (`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
          <foreignObject width='100%' height='100%'>${html}</foreignObject>
        </svg>`).trim();
    const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    return {svg, data};
  };

  const htmlToCanvas = (html, width = 640, height = 360) => {

    const imageW = height * 16 / 9;
    const imageH = imageW * 9 / 16;
    const {svg, data} = htmlToSvg(html);

    const url = window.URL.createObjectURL(svg);
    if (!url) {
      return Promise.reject(new Error('convert svg fail'));
    }
    const img = new Image();
    img.width = 682;
    img.height = 384;
    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    return new Promise((resolve, reject) => {
      img.onload = () => {
        context.drawImage(
          img,
          (width - imageW) / 2,
          (height - imageH) / 2,
          imageW,
          imageH);
        resolve({canvas, img});
        //window.console.info('img size', img.width, img.height);
        window.URL.revokeObjectURL(url);
      };
      img.onerror = (e) => {
        window.console.error('img.onerror', e, data);
        reject(e);
        window.URL.revokeObjectURL(url);
      };

      img.src = url;
    });
  };

  const nicoVideoToCanvas = ({video, html, minHeight = 1080}) => {
    let scale = 1;
    let width =
      Math.max(video.videoWidth, video.videoHeight * 16 / 9);
    let height = video.videoHeight;
    // 動画の解像度が低いときは、可能な範囲で整数倍に拡大する
    if (height < minHeight) {
      scale = Math.floor(minHeight / height);
      width *= scale;
      height *= scale;
    }

    const canvas = document.createElement('canvas');
    const ct = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    return videoToCanvas(video).then(({canvas/*, img*/}) => {

      ct.fillStyle = 'rgb(0, 0, 0)';
      ct.fillRect(0, 0, width, height);

      ct.drawImage(
        canvas,
        (width - video.videoWidth * scale) / 2,
        (height - video.videoHeight * scale) / 2,
        video.videoWidth * scale,
        video.videoHeight * scale
      );

      return htmlToCanvas(html, width, height);
    }).then(({canvas, img}) => {

      ct.drawImage(canvas, 0, 0, width, height);

      return Promise.resolve({canvas, img});
    }).then(() => {
      return Promise.resolve({canvas});
    });
  };


  const saveToFile = (canvas, fileName = 'sample.png') => {
    const dataUrl = canvas.toDataURL('image/png');
    const bin = atob(dataUrl.split(',')[1]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0, len = buf.length; i < len; i++) {
      buf[i] = bin.charCodeAt(i);
    }
    const blob = new Blob([buf.buffer], {type: 'image/png'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    window.console.info('download fileName: ', fileName);
    a.setAttribute('download', fileName);
    a.setAttribute('href', url);
    a.setAttribute('rel', 'noopener');
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2000);
  };

  return {
    videoToCanvas,
    htmlToCanvas,
    nicoVideoToCanvas,
    saveToFile
  };
})();

class BaseViewComponent extends Emitter {
  constructor({parentNode = null, name = '', template = '', shadow = '', css = ''}) {
    super();

    this._params = {parentNode, name, template, shadow, css};
    this._bound = {};
    this._state = {};
    this._props = {};
    this._elm = {};

    this._initDom({
      parentNode,
      name,
      template,
      shadow,
      css
    });
  }

  _initDom({parentNode, name, template, css = '', shadow = ''}) {
    let tplId = `${PRODUCT}${name}Template`;
    let tpl = document.getElementById(tplId);
    if (!tpl) {
      if (css) {
        util.addStyle(css, `${name}Style`);
      }
      tpl = document.createElement('template');
      tpl.innerHTML = template;
      tpl.id = tplId;
      document.body.appendChild(tpl);
    }
    const onClick = this._bound.onClick = this._onClick.bind(this);

    const view = document.importNode(tpl.content, true);
    this._view = view.querySelector('*') || document.createDocumentFragment();
    if (this._view) {
      this._view.addEventListener('click', onClick);
    }
    this.appendTo(parentNode);

    if (shadow) {
      this._attachShadow({host: this._view, name, shadow});
      if (!this._isDummyShadow) {
        this._shadow.addEventListener('click', onClick);
      }
    }
  }

  _attachShadow({host, shadow, name, mode = 'open'}) {
    let tplId = `${PRODUCT}${name}Shadow`;
    let tpl = document.getElementById(tplId);
    if (!tpl) {
      tpl = document.createElement('template');
      tpl.innerHTML = shadow;
      tpl.id = tplId;
      document.body.appendChild(tpl);
    }

    if (!host.attachShadow && !host.createShadowRoot) {
      return this._fallbackNoneShadowDom({host, tpl, name});
    }

    const root = host.attachShadow ?
      host.attachShadow({mode}) : host.createShadowRoot();
    const node = document.importNode(tpl.content, true);
    root.appendChild(node);
    this._shadowRoot = root;
    this._shadow = root.querySelector('.root');
    this._isDummyShadow = false;
  }

  _fallbackNoneShadowDom({host, tpl, name}) {
    const node = document.importNode(tpl.content, true);
    const style = node.querySelector('style');
    style.remove();
    util.addStyle(style.innerHTML, `${name}Shadow`);
    host.appendChild(node);
    this._shadow = this._shadowRoot = host.querySelector('.root');
    this._isDummyShadow = true;
  }

  setState(key, val) {
    if (typeof key === 'string') {
      this._setState(key, val);
    }
    Object.keys(key).forEach(k => {
      this._setState(k, key[k]);
    });
  }

  _setState(key, val) {
    if (this._state[key] !== val) {
      this._state[key] = val;
      if (/^is(.*)$/.test(key)) {
        this.toggleClass(`is-${RegExp.$1}`, !!val);
      }
      this.emit('update', {key, val});
    }
  }

  _onClick(e) {
    const target = e.target.classList.contains('command') ?
      e.target : e.target.closest('.command');

    if (!target) {
      return;
    }

    const command = target.getAttribute('data-command');
    if (!command) {
      return;
    }
    const type = target.getAttribute('data-type') || 'string';
    let param = target.getAttribute('data-param');
    e.stopPropagation();
    e.preventDefault();
    switch (type) {
      case 'json':
      case 'bool':
      case 'number':
        param = JSON.parse(param);
        break;
    }

    this._onCommand(command, param);
  }

  appendTo(parentNode) {
    if (!parentNode) {
      return;
    }
    this._parentNode = parentNode;
    parentNode.appendChild(this._view);
  }

  _onCommand(command, param) {
    this.emit('command', command, param);
  }

  toggleClass(className, v) {
    (className || '').split(/ +/).forEach((c) => {
      this._view.classList.toggle(c, v);
      if (this._shadow) {
        this._shadow.classList.toggle(c, this._view.classList.contains(c));
      }
    });
  }

  addClass(name) {
    this.toggleClass(name, true);
  }

  removeClass(name) {
    this.toggleClass(name, false);
  }
}

//===END===
//

export {
  util,
  console,
  Config,
  FullScreen,
  AsyncEmitter,
  ShortcutKeyEmitter,
  PopupMessage,
  PlayerSession,
  WindowMessageEmitter,
  broadcastEmitter,
  WatchPageHistory,
  // AppendStyle,
  // ViewPort,
  RequestAnimationFrame,
  FrameLayer,
  MylistPocketDetector,
  VideoCaptureUtil,
  BaseViewComponent,
  Sleep
};

