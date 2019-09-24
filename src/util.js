import {CONSTANT} from './constant';
import {Emitter} from './baselib';
import {Config} from './Config';
import {browser} from './browser';
import {ZenzaWatch, PRODUCT} from './ZenzaWatchIndex';
import {StyleSwitcher} from '../packages/lib/src/css/StyleSwitcher';
import {dimport} from '../packages/lib/src/infra/dimport';
import {VideoItemObserver} from '../packages/lib/src/nico/VideoItemObserver';
import {NicoQuery} from '../packages/lib/src/nico/NicoQuery';
import {uQuery} from '../packages/lib/src/uQuery';
import {defineElement} from '../packages/lib/src/defineElement';
import {textUtil} from '../packages/lib/src/text/textUtil';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
import {netUtil} from '../packages/lib/src/infra/netUtil';
import {messageUtil} from '../packages/lib/src/message/messageUtil';
import {sleep} from '../packages/lib/src/infra/sleep';
import {bounce} from '../packages/lib/src/infra/bounce';
import {css} from '../packages/lib/src/css/css';
import {reg} from '../packages/lib/src/text/reg';
import {Fullscreen} from '../packages/lib/src/dom/Fullscreen';
import {PopupMessage} from '../packages/lib/src/ui/PopupMessage';
import {RequestAnimationFrame} from '../packages/lib/src/infra/RequestAnimationFrame';
import {env} from '../packages/lib/src/infra/env';
import {Clipboard} from '../packages/lib/src/dom/Clipboard';
import {createVideoElement} from '../packages/zenza/src/videoPlayer/createVideoElement';
import {domEvent} from '../packages/lib/src/dom/domEvent';
import {VideoCaptureUtil} from '../packages/lib/src/dom/VideoCaptureUtil';
import {speech} from '../packages/lib/src/infra/speech';
import {MylistPocketDetector} from '../packages/zenza/src/init/MylistPocketDetector';
import {ShortcutKeyEmitter} from '../packages/zenza/src/ShortcutKeyEmitter';
import {PlayerSession} from '../packages/zenza/src/init/PlayerSession';
import {WatchPageHistory} from '../packages/zenza/src/init/WatchPageHistory';
import {watchResize} from '../packages/lib/src/dom/watchResize';
import {BaseViewComponent} from '../packages/zenza/src/parts/BaseViewComponent';

const {navigator, location} = browser.window;
const window = browser.window;
const document = browser.document;
const history = window.history;
let console = window.console;

Object.assign(window, {
  ZenzaWatch,
});

let NicoVideoApi = {};
const util = {};


//===BEGIN===
//@require reg
util.reg = reg;
//@require PopupMessage

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

//@require Fullscreen
util.fullscreen = Fullscreen;


const dummyConsole = {};
window.console.timeLog || (window.console.timeLog = () => {});
for (const k of Object.keys(window.console)) {
  if (typeof window.console[k] !== 'function') {continue;}
  dummyConsole[k] = _.noop;
}
['assert', 'error', 'warn', 'nicoru'].forEach(k =>
  dummyConsole[k] = window.console[k].bind(window.console));

console = Config.props.debug ? window.console : dummyConsole;
Config.onkey('debug', v => console = v ? window.console : dummyConsole);



//@require css
Object.assign(util, css);
//@require textUtil
Object.assign(util, textUtil);

//@require nicoUtil
Object.assign(util, nicoUtil);

//@require messageUtil
Object.assign(util, messageUtil);

//@require PlayerSession

//@require WatchPageHistory

//@require env
Object.assign(util, env);

//@require Clipboard
util.copyToClipBoard = Clipboard.copyText;

//@require netUtil
Object.assign(util, netUtil);

//@require VideoCaptureUtil
util.videoCapture = VideoCaptureUtil.capture;
util.capTube = VideoCaptureUtil.capTube;

util.saveMymemory = function(player, videoInfo) {
  let html = player.getMymemory();
  const title =
    videoInfo.watchId + ' - ' +
    videoInfo.title; // エスケープされてる
  const info = (`
        <div>
          <h2>${videoInfo.title}</h2>
          <a href="//www.nicovideo.jp/watch/${videoInfo.watchId}?from=${Math.floor(player.currentTime)}">元動画</a><br>
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
  document.body.append(a);
  a.click();
  window.setTimeout(() => a.remove(), 1000);
};

//@require speech
util.speak = speech.speak;
//@require watchResize
util.watchResize = watchResize;

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

//@require createVideoElement
util.createVideoElement = createVideoElement;

//@require domEvent
Object.assign(util, domEvent);

//@require defineElement
util.defineElement = defineElement;
util.$ = uQuery;
util.createDom = util.$.html;
util.isTL = util.$.isTL;

//@require ShortcutKeyEmitter

//@require RequestAnimationFrame
util.RequestAnimationFrame = RequestAnimationFrame;


class FrameLayer extends Emitter {
  constructor(params) {
    super();
    this._container = params.container;
    this._retryGetIframeCount = 0;

    this._initializeView(params, 0);
  }
  _initializeView(params, retryCount) {
    const iframe = this._getIframe();
    iframe.className = params.className || '';
    iframe.loading = 'eager';

    const onload = () => {
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
      this.emitResolve('GetReady!', win);
    };

    const html = this._html = params.html;
    this._container.append(iframe);
    if (iframe.srcdocType === 'string') {
      iframe.onload = onload;
      iframe.srcdoc = html;
    } else {
      // MS IE/Edge用
      const d = iframe.contentWindow.document;
      d.open();
      d.write(html);
      d.close();
      window.setTimeout(onload, 0);
    }
  }
  _getIframe() {
    let reserved = document.getElementsByClassName('reservedFrame');
    let iframe;
    if (reserved && reserved.length > 0) {
      iframe = reserved[0];
      iframe.remove();
      iframe.style.position = '';
      iframe.style.left = '';
    } else {
      iframe = document.createElement('iframe');
      iframe.loading = 'eager';
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
}

//@require MylistPocketDetector
//@require BaseViewComponent
//@require StyleSwitcher
util.StyleSwitcher = StyleSwitcher;
util.dimport = dimport;
//@require VideoItemObserver
util.VideoItemObserver = VideoItemObserver;
//@require NicoQuery
util.NicoQuery = NicoQuery;
//@require sleep
util.sleep = sleep;
//@require bounce
util.bounce = bounce;
//===END===
//

export {
  util,
  console,
  Config,
  Fullscreen,
  AsyncEmitter,
  ShortcutKeyEmitter,
  PopupMessage,
  PlayerSession,
  WatchPageHistory,
  RequestAnimationFrame,
  FrameLayer,
  MylistPocketDetector,
  VideoCaptureUtil,
  BaseViewComponent
};

