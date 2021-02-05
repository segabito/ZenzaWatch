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

//@require saveMymemory
util.saveMymemory = saveMymemory;

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

//@require FrameLayer

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

