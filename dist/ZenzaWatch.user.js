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
// @match          https://www.google.co.jp/search*
// @match          https://www.google.com/search*
// @match          https://friends.nico/*
// @match          https://*.slack.com/*
// @match          https://*.bing.com/*
// @exclude        *://ads.nicovideo.jp/*
// @exclude        *://www.upload.nicovideo.jp/*
// @exclude        *://www.nicovideo.jp/watch/*?edit=*
// @exclude        *://ch.nicovideo.jp/tool/*
// @exclude        *://flapi.nicovideo.jp/*
// @exclude        *://dic.nicovideo.jp/p/*
// @exclude        *://ext.nicovideo.jp/thumb/*
// @exclude        *://ext.nicovideo.jp/thumb_channel/*
// @grant          none
// @author         segabito
// @version        2.1.17beta
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
    let CONFIG = null;
    let dll = {};
    START_PAGE_QUERY = encodeURIComponent(START_PAGE_QUERY);
    var VER = '2.1.17beta';
    const ENV = 'STABLE';

    //@environment

    console.log(`%c${PRODUCT}@${ENV} v${VER}`, 'font-size: 200%;');
    console.log('%cjQuery v%s, lodash v%s', 'font-size: 200%;', $.fn.jquery, _ && _.VERSION);

// 登録した順番は保証されない
class Handler { //extends Array {
constructor(...args) {
this._list = new Array(...args);
//super(...args);
// if (this._list.length > 1) { this.reverse(); }
}
get length() {
return this._list.length;
}
exec(...args) {
if (!this._list.length) {
return;
} else if (this._list.length === 1) {
this._list[0](...args);
return;
}
for (let i = this._list.length - 1; i >= 0; i--) {
this._list[i](...args);
}
}
execMethod(name, ...args) {
if (!this._list.length) {
return;
} else if (this._list.length === 1) {
this._list[0][name](...args);
return;
}
for (let i = this._list.length - 1; i >= 0; i--) {
this._list[i][name](...args);
}
}
add(member) {
if (this._list.includes(member)) {
return this;
}
this._list.unshift(member);
return this;
}
remove(member) {
_.pull(this._list, member);
return this;
}
clear() {
this._list.length = 0;
return this;
}
get isEmpty() {
return this._list.length < 1;
}
}
const {Emitter} = (() => {
class Emitter {
on(name, callback) {
if (!this._events) {
Emitter.totalCount++;
this._events = {};
}
name = name.toLowerCase();
let e = this._events[name];
if (!e) {
e = this._events[name] = new Handler(callback);
} else {
e.add(callback);
}
if (e.length > 10) {
Emitter.warnings.push(this);
}
return this;
}
off(name, callback) {
if (!this._events) {
return;
}
name = name.toLowerCase();
const e = this._events[name];
if (!this._events[name]) {
return;
} else if (!callback) {
delete this._events[name];
} else {
e.remove(callback);
if (e.isEmpty) {
delete this._events[name];
}
}
if (Object.keys(this._events).length < 1) {
delete this._events;
}
return this;
}
once(name, func) {
const wrapper = (...args) => {
func(...args);
this.off(name, wrapper);
wrapper._original = null;
};
wrapper._original = func;
return this.on(name, wrapper);
}
clear(name) {
if (!this._events) {
return;
}
if (name) {
delete this._events[name];
} else {
delete this._events;
Emitter.totalCount--;
}
return this;
}
emit(name, ...args) {
if (!this._events) {
return;
}
name = name.toLowerCase();
const e = this._events[name];
if (!e) {
return;
}
e.exec(...args);
return this;
}
emitAsync(...args) {
if (!this._events) {
return;
}
setTimeout(() => {
this.emit(...args);
}, 0);
return this;
}
}
Emitter.totalCount = 0;
Emitter.warnings = [];
return {
Emitter
};
})();

const Config = ((CONFIG) => {
const prefix = `${PRODUCT}_`;
const emitter = new Emitter();
// 古いprototype.jsが使われているページの対処
if (window.Prototype && Array.prototype.toJSON) {
let _json_stringify = JSON.stringify;
JSON.stringify = (...args) => {
let aj = Array.prototype.toJSON;
let sj = String.prototype.toJSON;
delete Array.prototype.toJSON;
delete String.prototype.toJSON;
let r = _json_stringify(...args);
Array.prototype.toJSON = aj;
String.prototype.toJSON = sj;
return r;
};
}
// 直接変更する時はコンソールで
// ZenzaWatch.config.setValue('hogehoge' fugafuga);
const DEFAULT_CONFIG = CONFIG || {
debug: false,
volume: 0.3,
forceEnable: false,
showComment: true,
autoPlay: true,
'autoPlay:ginza': true,
'autoPlay:others': true,
loop: false,
mute: false,
screenMode: 'normal',
'screenMode:ginza': 'normal',
'screenMode:others': 'normal',
autoFullScreen: false,
autoCloseFullScreen: true, // 再生終了時に自動でフルスクリーン解除するかどうか
continueNextPage: false, // 動画再生中にリロードやページ切り替えしたら続きから開き直す
backComment: false, // コメントの裏流し
autoPauseCommentInput: true, // コメント入力時に自動停止する
sharedNgLevel: 'MID', // NG共有の強度 NONE, LOW, MID, HIGH, MAX
enablePushState: true, // ブラウザの履歴に乗せる
enableHeatMap: true,
enableCommentPreview: false,
enableAutoMylistComment: false, // マイリストコメントに投稿者を入れる
menuScale: 1.0,
enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
enableDblclickClose: true, //
enableFullScreenOnDoubleClick: true,
enableStoryboard: true, // シークバーサムネイル関連
enableStoryboardBar: false, // シーンサーチ
videoInfoPanelTab: 'videoInfoTab',
fullscreenControlBarMode: 'auto', // 'always-show' 'always-hide'
// forceEconomy: false,
// NG設定
enableFilter: true,
wordFilter: '',
wordRegFilter: '',
wordRegFilterFlags: 'i',
userIdFilter: '',
commandFilter: '',
videoTagFilter: '',
videoOwnerFilter: '',
enableCommentPanel: true,
enableCommentPanelAutoScroll: true,
commentSpeedRate: 1.0,
autoCommentSpeedRate: false,
playlistLoop: false,
commentLanguage: 'ja_JP',
baseFontFamily: '',
baseChatScale: 1.0,
baseFontBolder: true,
allowOtherDomain: true,
overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く
'overrideWatchLink:others': false, // すべての動画リンクをZenzaWatchで開く
speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す
// enableCommentLayoutWorker: true, // コメントの配置計算を一部マルチスレッド化(テスト中)
enableSingleton: false,
// 無料期間の過ぎた動画と同じのがdアニメにあったら、
// コメントはそのままに映像だけ持ってくる (当然ながらdアニメ加入は必要)
loadLinkedChannelVideo: false,
commentLayerOpacity: 1.0, //
'commentLayer.textShadowType': '', // フォントの修飾タイプ
'commentLayer.enableSlotLayoutEmulation': false,
'commentLayer.ownerCommentShadowColor': '#008800', // 投稿者コメントの影の色
overrideGinza: false, // 動画視聴ページでもGinzaの代わりに起動する
enableGinzaSlayer: false, // まだ実験中
lastPlayerId: '',
playbackRate: 1.0,
lastWatchId: 'sm9',
message: '',
enableVideoSession: true,
videoServerType: 'dmc',
// enableDmc: true, // 新サーバーを使うかどうか
autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
dmcVideoQuality: 'auto', // 優先する画質 auto, veryhigh, high, mid, low
smileVideoQuality: 'default', // default eco
useWellKnownPort: false, // この機能なくなったぽい (常時true相当になった)
'video.hls.enable': true,
'video.hls.segmentDuration': 5000,
enableNicosJumpVideo: true, // @ジャンプを有効にするかどうか
'videoSearch.ownerOnly': true,
'videoSearch.mode': 'tag',
'videoSearch.order': 'desc',
'videoSearch.sort': 'playlist',
'videoSearch.word': '',
'uaa.enable': true,
'screenshot.prefix': '', // スクリーンショットのファイル名の先頭につける文字
'search.limit': 300, // 検索する最大件数(最大1600) 100件ごとにAPIを叩くので多くするほど遅くなる
//タッチパネルがある場合は null ない場合は undefined になるらしい
//うちのデスクトップは無いのに null だが…
'touch.enable': window.ontouchstart !== undefined,
'touch.tap2command': '',
'touch.tap3command': 'toggle-mute',
'touch.tap4command': 'toggle-showComment',
'touch.tap5command': 'screenShot',
autoZenTube: false,
bestZenTube: false,
KEY_CLOSE: 27, // ESC
KEY_RE_OPEN: 27 + 0x1000, // SHIFT + ESC
KEY_HOME: 36 + 0x1000, // SHIFT + HOME
KEY_SEEK_LEFT: 37 + 0x1000, // SHIFT + LEFT
KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
KEY_SEEK_LEFT2: 99999999, // カスタマイズ用
KEY_SEEK_RIGHT2: 99999999, //
// 1/60秒戻る・進む 本当は1コマ単位の移動にしたいが動画のフレームレートを取得できないため
KEY_SEEK_PREV_FRAME: 188, // ,
KEY_SEEK_NEXT_FRAME: 190, // .
KEY_VOL_UP: 38 + 0x1000, // SHIFT + UP
KEY_VOL_DOWN: 40 + 0x1000, // SHIFT + DOWN
KEY_INPUT_COMMENT: 67, // C
KEY_FULLSCREEN: 70, // F
KEY_MUTE: 77, // M
KEY_TOGGLE_COMMENT: 86, // V
KEY_TOGGLE_LOOP: 76, // L
KEY_DEFLIST_ADD: 84, // T
KEY_DEFLIST_REMOVE: 84 + 0x1000, // SHIFT + T
KEY_TOGGLE_PLAY: 32, // SPACE
KEY_TOGGLE_PLAYLIST: 80, // P
KEY_SCREEN_MODE_1: 49 + 0x1000, // SHIFT + 1
KEY_SCREEN_MODE_2: 50 + 0x1000, // SHIFT + 2
KEY_SCREEN_MODE_3: 51 + 0x1000, // SHIFT + 3
KEY_SCREEN_MODE_4: 52 + 0x1000, // SHIFT + 4
KEY_SCREEN_MODE_5: 53 + 0x1000, // SHIFT + 5
KEY_SCREEN_MODE_6: 54 + 0x1000, // SHIFT + 6
KEY_SHIFT_RESET: 49, // 1
KEY_SHIFT_DOWN: 188 + 0x1000, // <
KEY_SHIFT_UP: 190 + 0x1000, // >
KEY_NEXT_VIDEO: 74, // J
KEY_PREV_VIDEO: 75, // K
KEY_SCREEN_SHOT: 83, // S
KEY_SCREEN_SHOT_WITH_COMMENT: 83 + 0x1000, // SHIFT + S
};
if (navigator &&
navigator.userAgent &&
navigator.userAgent.match(/(Android|iPad;|CriOS)/i)) {
DEFAULT_CONFIG.overrideWatchLink = true;
DEFAULT_CONFIG.enableTogglePlayOnClick = true;
DEFAULT_CONFIG.autoFullScreen = true;
DEFAULT_CONFIG.autoCloseFullScreen = false;
DEFAULT_CONFIG.volume = 1.0;
DEFAULT_CONFIG.enableVideoSession = true;
DEFAULT_CONFIG['uaa.enable'] = false;
}
const config = {};
let noEmit = false;
Object.keys(DEFAULT_CONFIG).forEach(key => {
let storageKey = prefix + key;
if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
try {
config[key] = JSON.parse(localStorage.getItem(storageKey));
} catch (e) {
window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
config[key] = DEFAULT_CONFIG[key];
}
} else {
config[key] = DEFAULT_CONFIG[key];
}
});
/**
* ローカルの設定値をlocalStorageから読み直す
* 他のウィンドウで書き換えられる可能性のある物を読む前に使う
*/
emitter.refreshValue = (key) => { //function (key) {
let storageKey = prefix + key;
if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
try {
config[key] = JSON.parse(localStorage.getItem(storageKey));
} catch (e) {
window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
}
}
};
emitter.getValue = (key, refresh) => {
if (refresh) {
emitter.refreshValue(key);
}
return config[key];
};
emitter.setValue = function (key, value) {
if (config[key] !== value && arguments.length >= 2) {
let storageKey = prefix + key;
if (location.host === 'www.nicovideo.jp') {
try {
localStorage.setItem(storageKey, JSON.stringify(value));
} catch (e) {
window.console.error(e);
}
}
config[key] = value;
console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
if (!noEmit) {
this.emitAsync('update', key, value);
this.emitAsync('update-' + key, value);
}
}
};
/**
* イベントを投げないで設定変更だけする
* @deprecated
* @param {string} key
* @param value
*/
emitter.setValueSilently = function (key, value) {
if (config[key] !== value && arguments.length >= 2) {
let storageKey = prefix + key;
if (location.host === 'www.nicovideo.jp') {
try {
localStorage.setItem(storageKey, JSON.stringify(value));
} catch (e) {
window.console.error(e);
}
}
config[key] = value;
console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
}
};
/**
* @deprecated
* localStorageに保存しないで、ページをリロードするまでの間だけ書き換え
*/
emitter.setSessionValue = (key, value) => {
if (config[key] !== value) {
config[key] = value;
console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
this.emitAsync('update', key, value);
this.emitAsync('update-' + key, value);
}
};
emitter.exportConfig = () => {
let result = {};
Object.keys(DEFAULT_CONFIG).forEach(key => {
if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
return;
}
let storageKey = prefix + key;
if ((localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) &&
DEFAULT_CONFIG[key] !== emitter.getValue(key)) {
result[key] = emitter.getValue(key);
}
});
return result;
};
emitter.importConfig = (data) => {
noEmit = true;
Object.keys(data).forEach(key => {
if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
return;
}
window.console.log('import config: %s=%s', key, data[key]);
try {
emitter.setValue(key, data[key]);
} catch (e) {
}
});
noEmit = false;
};
emitter.clearConfig = () => {
noEmit = true;
Object.keys(DEFAULT_CONFIG).forEach(key => {
if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
return;
}
let storageKey = prefix + key;
try {
if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
localStorage.removeItem(storageKey);
}
config[key] = DEFAULT_CONFIG[key];
} catch (e) {
}
});
noEmit = false;
};
emitter.getKeys = () => {
return Object.keys(DEFAULT_CONFIG);
};
emitter.namespace = name => {
return {
getValue: (key) => {
return emitter.getValue(name + '.' + key);
},
setValue: (key, value) => {
emitter.setValue(name + '.' + key, value);
},
on: (key, func) => {
if (key === 'update') {
emitter.on('update', (key, value) => {
const pre = name + '.';
if (key.startsWith(pre)) {
func(key.replace(pre, ''), value);
}
});
} else {
key = key.replace(/^update-/, '');
emitter.on('update-' + name + '.' + key, func);
}
}
};
};
return emitter;
})(CONFIG);

    const ZenzaWatch = {
      version: VER,
      env: ENV,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {},
      modules: {Emitter, Handler},
      config: Config,
      emitter: new Emitter(),
      state: {},
      dll
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.ZenzaWatch = ZenzaWatch;
    } else {
      window.ZenzaWatch = {config: ZenzaWatch.config};
    }
    window.ZenzaWatch.emitter = ZenzaWatch.emitter = new Emitter();
    const debug = ZenzaWatch.debug;
    const emitter = ZenzaWatch.emitter;
    const util = ZenzaWatch.util;
    // const modules = ZenzaWatch.modules;


const CONSTANT = {
BASE_Z_INDEX: 100000,
CONTROL_BAR_HEIGHT: 40,
SIDE_PLAYER_WIDTH: 400,
SIDE_PLAYER_HEIGHT: 225,
BIG_PLAYER_WIDTH: 896,
BIG_PLAYER_HEIGHT: 480,
RIGHT_PANEL_WIDTH: 320,
BOTTOM_PANEL_HEIGHT: 240,
// video.src クリア用。
// 空文字だとbase hrefと連結されて http://www.nicovideo.jp が参照されるという残念な理由で // を指定している
BLANK_VIDEO_URL: '//',
BLANK_PNG: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABBAEAcCBlCwAAAABJRU5ErkJggg==',
MEDIA_ERROR: {
MEDIA_ERR_ABORTED: 1,
MEDIA_ERR_NETWORK: 2,
MEDIA_ERR_DECODE: 3,
MEDIA_ERR_SRC_NOT_SUPPORTED: 4
}
};
CONSTANT.BASE_CSS_VARS = (() => {
const vars = {
'base-bg-color': '#333',
'base-fore-color': '#ccc',
'light-text-color': '#fff',
'scrollbar-bg-color': '#222',
'scrollbar-thumb-color': '#666',
'item-border-color': '#888',
'hatsune-color': '#039393',
'enabled-button-color': '#9cf'
};
let dt = new Date().toISOString();
if (/^\d{4}-(03-09|08-31)/.test(dt)) {
vars['scrollbar-thumb-color'] = vars['hatsune-color'];
}
return '#zenzaVideoPlayerDialog, .zenzaRoot {\n' +
Object.keys(vars).map(key => `--${key}: ${vars[key]};`).join('\n') +
'\n}';
})();
CONSTANT.COMMON_CSS = `
${CONSTANT.BASE_CSS_VARS}
.xDomainLoaderFrame {
border: 0;
position: fixed;
top: -999px;
left: -999px;
width: 1px;
height: 1px;
border: 0;
contain: paint;
}
.ZenButton {
display: none;
opacity: 0.8;
position: absolute;
background: #eee;
color: #000;
z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
cursor: pointer;
border: outset 1px;
font-size: 8pt;
width: 32px;
height: 26px;
padding: 0;
line-height: 26px;
font-weight: bold;
text-align: center;
transition: box-shadow 0.2s ease, opacity 0.4s ease;
box-shadow: 2px 2px rgba(0, 0, 0, 0.8);
user-select: none;
}
.ZenButton:hover {
opacity: 1;
}
.ZenButton:active {
border: inset 1px;
transition: translate(2px, 2px);
box-shadow: 0 0 rgba(0, 0, 0, 0.8);
}
.ZenButton.show {
display: block;
}
.zenzaPopupMenu {
position: absolute;
background: var(--base-bg-color);
color: #fff;
overflow: visible;
border: 1px solid var(--base-fore-color);
padding: 0;
opacity: 0.99;
box-sizing: border-box;
transition: opacity 0.3s ease;
z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
user-select: none;
}
.zenzaPopupMenu:not(.show) {
transition: none;
visibility: hidden;
opacity: 0;
pointer-events: none;
}
.zenzaPopupMenu ul {
padding: 0;
}
.zenzaPopupMenu ul li {
position: relative;
margin: 2px 4px;
white-space: nowrap;
cursor: pointer;
padding: 2px 8px;
list-style-type: none;
float: inherit;
}
.zenzaPopupMenu ul li + li {
border-top: 1px dotted var(--item-border-color);
}
.zenzaPopupMenu li.selected {
font-weight: bolder;
}
.zenzaPopupMenu ul li:hover {
background: #663;
}
.zenzaPopupMenu ul li.separator {
border: 1px outset;
height: 2px;
width: 90%;
}
.zenzaPopupMenu li span {
box-sizing: border-box;
margin-left: 8px;
display: inline-block;
cursor: pointer;
}
.zenzaPopupMenu ul li.selected span:before {
content: '✔';
left: 0;
position: absolute;
}
.zenzaPopupMenu.show {
opacity: 0.8;
}
.zenzaPopupMenu .caption {
padding: 2px 4px;
text-align: center;
margin: 0;
font-weight: bolder;
background: #666;
color: #fff;
}
.zenzaPopupMenu .triangle {
position: absolute;
width: 16px;
height: 16px;
border: 1px solid #ccc;
border-width: 0 0 1px 1px;
background: #333;
box-sizing: border-box;
}
body.showNicoVideoPlayerDialog #external_nicoplayer {
transform: translate(-9999px, 0);
}
#ZenzaWatchVideoPlayerContainer .atsumori-root {
position: absolute;
z-index: 10;
}
#zenzaVideoPlayerDialog.is-guest .forMember {
display: none;
}
#zenzaVideoPlayerDialog .forGuest {
display: none;
}
#zenzaVideoPlayerDialog.is-guest .forGuest {
display: inherit;
}
.scalingUI {
transform: scale(var(--zenza-ui-scale, 1));
}
`.trim();
CONSTANT.SCROLLBAR_CSS = `
.videoInfoTab::-webkit-scrollbar,
#listContainer::-webkit-scrollbar,
.zenzaCommentPreview::-webkit-scrollbar,
.mylistSelectMenuInner::-webkit-scrollbar {
background: var(--scrollbar-bg-color);
}
.videoInfoTab::-webkit-scrollbar-thumb,
#listContainer::-webkit-scrollbar-thumb,
.zenzaCommentPreview::-webkit-scrollbar-thumb,
.mylistSelectMenuInner::-webkit-scrollbar-thumb {
border-radius: 0;
background: var(--scrollbar-thumb-color);
}
.videoInfoTab::-webkit-scrollbar-button,
#listContainer::-webkit-scrollbar-button,
.zenzaCommentPreview::-webkit-scrollbar-button,
.mylistSelectMenuInner::-webkit-scrollbar-button {
display: none;
}
`.trim();

class Sleep {
constructor(time, result) {
return new Promise(resolve => setTimeout(() => {
resolve(result);
}, time));
}
}
util.sleep = async ms => new Promise(rs => setTimeout(rs, ms), ms);
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
let Fullscreen = {
now: function () {
// return matchMedia('(display-mode: fullscreen)').matches;
if (document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen) {
return true;
}
return false;
},
get element() {
return document.fullScreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || null;
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
},
_handleEvents: function () {
this._handleEvnets = _.noop;
let handle = () => {
let isFullscreen = this.now();
if (isFullscreen) {
document.body.classList.add('is-fullscreen');
} else {
document.body.classList.remove('is-fullscreen');
}
ZenzaWatch.emitter.emit('fullscreenStatusChange', isFullscreen);
};
document.addEventListener('webkitfullscreenchange', handle, false);
document.addEventListener('mozfullscreenchange', handle, false);
document.addEventListener('MSFullscreenChange', handle, false);
document.addEventListener('fullscreenchange', handle, false);
}
};
util.fullscreen = Fullscreen;
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
</div>
`.trim();
const __css__ = `
.zenzaPopupMessage {
--notify-color: #0c0;
--alert-color: #c00;
--shadow-color: #ccc;
z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
opacity: 0;
display: block;
min-width: 150px;
margin-bottom: 8px;
padding: 8px 16px;
white-space: nowrap;
font-weight: bolder;
overflow-y: hidden;
text-align: center;
color: rgba(255, 255, 255, 0.8);
box-shadow: 2px 2px 0 var(--shadow-color, #ccc);
border-radius: 4px;
pointer-events: none;
user-select: none;
animation: zenza-popup-message-animation 5s;
animation-fill-mode: forwards;
}
.zenzaPopupMessage.notify {
background: var(--notify-color, #0c0);
}
.zenzaPopupMessage.alert {
background: var(--alert-color, #0c0);
}
.zenzaPopupMessage.debug {
background: #333;
}
/* できれば広告に干渉したくないけど仕方なく */
div[data-follow-container] {
position: static !important;
}
@keyframes zenza-popup-message-animation {
0% { transform: translate3d(0, -100px, 0); opacity: 0; }
10% { transform: translate3d(0, 0, 0); }
20% { opacity: 0.8; }
80% { opacity: 0.8; }
90% { opacity: 0; }
}
`;
let initialized = false;
let initialize = () => {
if (initialized) { return; }
initialized = true;
util.addStyle(__css__);
};
let create = (html, className) => {
const d = document.createElement('div');
d.className = `zenzaPopupMessage ${className}`;
d.innerHTML = html;
d.addEventListener('animationend', () => d.remove(), {once: true});
return d;
};
let show = msg => {
initialize();
const target = document.querySelector('.popupMessageContainer');
if (!target) {
return;
}
target.insertAdjacentElement('afterbegin', msg);
};
let notify = (msg, allowHtml) => {
if (msg === undefined) {
msg = '不明なエラー';
window.console.error('undefined message sent');
window.console.trace();
}
console.log('%c%s', 'background: #080; color: #fff; padding: 8px;', msg);
if (allowHtml !== true) {
msg = util.escapeHtml(msg);
}
show(create(msg, 'notify'));
};
let alert = (msg, allowHtml) => {
if (msg === undefined) {
msg = '不明なエラー';
window.console.error('undefined message sent');
window.console.trace();
}
console.log('%c%s', 'background: #800; color: #fff; padding: 8px;', msg);
if (allowHtml !== true) {
msg = util.escapeHtml(msg);
}
show(create(msg, 'alert'));
};
let debug = (msg, allowHtml) => {
if (msg === undefined) {
msg = '不明なエラー';
window.console.info('undefined message sent');
window.console.trace();
}
window.console.log('%c%s', 'background: #333; color: #fff; padding: 8px;', msg);
if (allowHtml !== true) {
msg = util.escapeHtml(msg);
}
show(create(msg, 'debug'));
};
return { notify, alert, debug };
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
util.addStyle = function (styles, option, document = window.document) {
let elm = document.createElement('style');
elm.type = 'text/css';
if (typeof option === 'string') {
elm.id = option;
} else if (option) {
Object.assign(elm, option);
}
elm.classList.add(PRODUCT);
let text = styles.toString();
text = document.createTextNode(text);
elm.appendChild(text);
(document.head || document).append(elm);
elm.disabled = option && option.disabled;
elm.dataset.switch = elm.disabled ? 'off' : 'on';
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
util.parseWatchQuery = query => {
try {
const result = util.parseQuery(query);
const playlist = JSON.parse(util.decodeBase64(result.playlist));
if (playlist.searchQuery) {
const sq = playlist.searchQuery;
if (sq.type === 'tag') {
result.playlist_type = 'tag';
result.tag = sq.query;
} else {
result.playlist_type = 'search';
result.keyword = sq.query;
}
let [order, sort] = (sq.sort || '+f').split('');
result.order = order === '-' ? 'a' : 'd';
result.sort = sort;
if (sq.fRange) { result.f_range = sq.fRange; }
if (sq.lRange) { result.l_range = sq.lRange; }
} else if (playlist.mylistId) {
result.playlist_type = 'mylist';
result.group_id = playlist.mylistId;
result.order =
document.querySelector('select[name="sort"]') ?
document.querySelector('select[name="sort"]').value : '1';
} else if (playlist.id && playlist.id.includes('temporary_mylist')) {
result.playlist_type = 'deflist';
result.group_id = 'deflist';
result.order =
document.querySelector('select[name="sort"]') ?
document.querySelector('select[name="sort"]').value : '1';
}
return result;
} catch(e) {
return {};
}
};
util.decodeBase64 = str => {
try {
return decodeURIComponent(
escape(atob(
str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=')
)));
} catch(e) {
return '';
}
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
//const num = (fileId % 4) + 1;
const large = util.hasLargeThumbnail(videoId) ? '.L' : '';
//return '//tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
return 'https://tn.smilevideo.jp/smile?i=' + fileId + large;
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
'%cNicoCommentLayer.Error: window.onMessage - ',
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
broadcastEmitter.emitAsync('change', key, newValue, oldValue);
switch (key) {
case 'message': {
const packet = JSON.parse(newValue);
if (packet.type === 'pong' && pingResolve) {
pingReject = null;
return pingResolve(packet);
}
console.log('%cmessage', 'background: cyan;', newValue);
broadcastEmitter.emitAsync('message', packet);
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
broadcastEmitter.emitAsync('message', packet);
};
broadcastEmitter.send = packet => {
if (broadcastChannel) {
broadcastChannel.postMessage(packet);
}
if (location.host !== 'www.nicovideo.jp' &&
NicoVideoApi && NicoVideoApi.sendCommandPacket) {
NicoVideoApi.sendCommandPacket(packet);
// packet.__now = Date.now();
// console.log('send Packet', packet);
// Config.setValue('message', packet);
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
broadcastEmitter.emitAsync('message', packet);
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
watchId,
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
} else {
window.addEventListener('storage', onStorage);
}
}
return broadcastEmitter;
})();
/**
* pushStateを使ってブラウザバックの履歴に載せようと思ったけど、
* あらゆるページに寄生するシステムの都合上断念。
* とりあえず既読リンクの色が変わるようにだけする
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
history.replaceState(null, null, originalUrl);
document.title = originalTitle;
}, 3000);
const pushHistory = (path, title) => {
history.replaceState(null, null, path);
document.title = title;
if (util.isGinzaWatchUrl(originalUrl)) {
return;
}
restore();
};
const onVideoInfoLoad = _.debounce(videoInfo => {
if (!videoInfo.watchId || !isOpen) {
return;
}
watchId = videoInfo.watchId;
title = `${videoInfo.title} by ${videoInfo.owner.name} - ZenzaWatch`;
path = `/watch/${watchId}`;
if (location.host !== 'www.nicovideo.jp') {
if (NicoVideoApi && NicoVideoApi.pushHistory) {
NicoVideoApi.pushHistory(path, title);
}
return;
}
pushHistory(path, title);
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
// www.nicovideo.jp 以外で開いた時、
// www.nicovideo.jp 配下のタブがあったら代わりに既読リンクの色を変える
const pushHistoryAgency = async (path, title) => {
if (!navigator || !navigator.locks) {
return pushHistory(path, title);
}
let lastTitle = document.title;
let lastUrl = location.href;
// どれかひとつのタブで動けばいい
let result = await navigator.locks.request('pushHistoryAgency', {ifAvailable: true}, async (lock) => {
if (!lock) {
return;
}
history.replaceState(null, title, path);
await new Promise(r => setTimeout(r, 3000));
history.replaceState(null, lastTitle, lastUrl);
await new Promise(r => setTimeout(r, 5000));
});
};
return {
initialize,
pushHistory,
pushHistoryAgency
};
})({config: Config, location, document, history});
util.getWatchId = url => {
let m;
if (url && url.indexOf('nico.ms') >= 0) {
m = /\/\/nico\.ms\/([a-z0-9]+)/.exec(url);
} else {
m = /\/?watch\/([a-z0-9]+)/.exec(url || location.pathname);
}
return m ? m[1] : null;
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
util.isEdgePC = () => {
return navigator.userAgent.toLowerCase().indexOf('edge') >= 0;
};
util.isFirefox = () => {
return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
};
util.isWebkit = () => {
return !util.isEdgePC() && navigator.userAgent.toLowerCase().indexOf('webkit') >= 0;
};
util.isChrome = () => {
return !util.isEdgePC() && navigator.userAgent.toLowerCase().indexOf('chrome') >= 0;
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
// .split(',').map(c => convertKansuEi(c).replace(/([0-9]{1,9})/g, m => m.padStart(3, '0'))).sort()
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
if (!date || isNaN(date.getTime())) {
return '1970/01/01 00:00:00';
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
if (navigator.clipboard) { // httpsじゃないと動かない
return navigator.clipboard.writeText(text);
}
let clip = document.createElement('input');
clip.type = 'text';
clip.style.position = 'fixed';
clip.style.left = '-9999px';
clip.value = text;
const node = Fullscreen.element || document.body;
node.appendChild(clip);
clip.select();
document.execCommand('copy');
window.setTimeout(() => clip.remove(), 0);
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
let nicomsUrl = 'https://nico.ms/' + watchId;
let watchUrl = location.protocol + '//www.nicovideo.jp/watch/' + watchId;
let sec = videoInfo.duration;
let m = Math.floor(sec / 60);
let s = (Math.floor(sec) % 60).toString().padStart(2, '0');
let dur = `(${m}:${s})`;
let nicoch = videoInfo.isChannel ? ',+nicoch' : '';
let url =
'https://twitter.com/intent/tweet?' +
'url=' + encodeURIComponent(nicomsUrl) +
'&text=' + encodeURIComponent(videoInfo.title + dur).replace(/@/g, '@ ') +
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
//if (!location.host.match(/\.nicovideo\.jp$/) && (true)) {
// util.ajax = util.fetch = () => {};
//}
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
util.videoCapture = function(src, sec) {
let func = () => {
return new Promise((resolve, reject) => {
let resolved = false;
const v = util.createVideoElement('capture');
if (!v) {
return reject();
}
Object.assign(v.style, {
width: '64px',
height: '36px',
position: 'fixed',
left: '-100px',
top: '-100px'
});
v.volume = 0;
v.autoplay = false;
v.controls = false;
v.addEventListener('loadedmetadata', () => v.currentTime = sec, {once: true});
v.addEventListener('error', err => { v.remove(); reject(err); }, {once: true});
const onSeeked = () => {
const c = document.createElement('canvas');
c.width = v.videoWidth;
c.height = v.videoHeight;
const ctx = c.getContext('2d');
ctx.drawImage(v.drawableElement || v, 0, 0);
v.remove();
resolved = true;
return resolve(c);
};
v.addEventListener('seeked', onSeeked, {once: true});
setTimeout(() => {
if (resolved) {
return;
}
v.remove();
reject();
}, 30000);
document.body.appendChild(v);
v.src = src;
v.currentTime = sec;
});
};
let wait = (this.lastSrc === src && this.wait) ? this.wait : new Sleep(1000);
this.lastSrc = src;
// 連続アクセスでセッションがkillされないように
let waitTime = 1000;
waitTime += src.indexOf('dmc.nico') >= 0 ? 2000 : 0;
waitTime += src.indexOf('.m3u8') >= 0 ? 2000 : 0;
let resolve, reject;
this.wait = new Promise((...args) => [resolve, reject] = args)
.then(() => new Sleep(waitTime)).catch(() => new Sleep(waitTime * 2));
return wait.then(func)
.then(r => { resolve(r); return r; })
.catch(e => { reject(e); return e; });
}.bind({});
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
window.setTimeout(() => a.remove(), 1000);
};
util.speak = (text, option = {}) => {
if (!window.speechSynthesis) {
return Promise.reject();
}
let msg = new window.SpeechSynthesisUtterance();
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
}
msg.text = text;
return new Promise((res, rej) => {
msg.addEventListener('end', () => res, {once: true});
msg.addEventListener('error', () => rej, {once: true});
window.speechSynthesis.speak(msg);
});
};
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
iframe.lazyload = 'off';
iframe.className = 'resizeObserver';
Object.assign(iframe.style, {
width: '100%',
height: '100%',
position: 'absolute',
pointerEvents: 'none',
border: 0,
//transform: 'translate3d(0, 0, 0)',
opacity: 0
});
target.parentElement.append(iframe);
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
util.dispatchCommand = (element, command, param, originalEvent = null) => {
return element.dispatchEvent(new CustomEvent('command',
{detail: {command, param, originalEvent}, bubbles: true, composed: true}
));
};
util.bindCommandDispatcher = (element, command) => {
element.addEventListener(command, e => {
let target = e.target.closest('[data-command]');
if (!target) {
ZenzaWatch.emitter.emitAsync('hideHover');
return;
}
let command = target.dataset.command;
let param = target.dataset.param;
let type = target.dataset.type;
if (['number', 'boolean', 'json'].includes(type)) {
param = JSON.parse(param);
}
e.preventDefault();
return util.dispatchCommand(element, command, param, e);
});
};
util.$ = (() => {
const elementEventsMap = new WeakMap();
const HAS_CSSTOM = (window.CSS && CSS.number) ? true : false;
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
if (HAS_CSSTOM) {
if (/(width|height|top|left)$/i.test(key) && /^[0-9+.]+$/.test(val)) {
val = CSS.px(val);
}
try {
this.forEach(e => {
if (val === '') { e.attributeStyleMap.delete(key); }
else { e.attributeStyleMap.set(key, val); }
});
} catch (e) {
window.console.warn('invalid style prop', key, val, e);
}
return;
}
const camelKey = toCamel(key);
if (/(width|height|top|left)$/i.test(key) && /^[0-9+.]+$/.test(val)) {
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
if (elm instanceof ($Elements) || Array.isArray(elm)) {
node.append(...elm);
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
TOGGLE_LOOP: 0,
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
case map.TOGGLE_LOOP:
key = 'TOGGLE_LOOP';
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
let initialized = false;
let initialize = () => {
if (initialized) { return; }
initialized = true;
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
iframe.lazyload = 'off';
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
iframe.lazyload = 'off';
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
const baseUrl = 'https://' + server + '/smile?i=' + fileId;
crossDomainGates[server] = new CrossDomainGate({
baseUrl: baseUrl,
origin: 'https://' + server + '/',
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
const target = e.target.closest('[data-command]');
if (!target) {
return;
}
const command = target.dataset.command;
const type = target.dataset.type || 'string';
let param = target.dataset.param;
e.stopPropagation();
e.preventDefault();
if (type !== 'string') { param = JSON.parse(param); }
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
this.dispatchCommand(command, param);
}
dispatchCommand(command, param) {
this._view.dispatchEvent(new CustomEvent('command',
{detail: {command, param}, bubbles: true, composed: true}
));
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
class StyleSwitcher {
static update({on, off, document = window.document}) {
if (on) {
Array.from(document.head.querySelectorAll(on))
.forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
}
if (off) {
Array.from(document.head.querySelectorAll(off))
.forEach(s => { s.disabled = true; s.dataset.switch = 'off'; });
}
}
static addClass(selector, ...classNames) {
classNames.forEach(name => {
Array.from(document.head.querySelectorAll(`${selector}.${name}`))
.forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
});
}
static removeClass(selector, ...classNames) {
classNames.forEach(name => {
Array.from(document.head.querySelectorAll(`${selector}.${name}`))
.forEach(s => { s.disabled = true; s.dataset.switch = 'off'; });
});
}
static toggleClass(selector, className, v) {
Array.from(document.head.querySelectorAll(`${selector}.${className}`))
.forEach(s => { s.disabled = v === undefined ? !s.disabled : !v; s.dataset.switch = s.disabled ? 'off' : 'on'; });
}
}
util.StyleSwitcher = StyleSwitcher;
const dimport = url => {
const now = Date.now();
const callbackName = `dimport_${now}`;
const loader = `
import * as module${now} from "${url}";
window.${callbackName}(module${now});
`.trim();
return new Promise((res) => {
const s = document.createElement('script');
s.type = 'module';
s.appendChild(document.createTextNode(loader));
s.dataset.import = url;
window[callbackName] = (module) => {
res(module);
delete window[callbackName];
};
document.head.appendChild(s);
});
};
util.dimport = dimport;

class BaseCommandElement extends HTMLElement {
static toAttributeName(camel) {
return 'data-' + camel.replace(/([A-Z])/g, s => '-' + s.toLowerCase());
}
static toPropName(snake) {
return snake.replace(/^data-/, '').replace(/(-.)/g, s => s.charAt(1).toUpperCase());
}
static async importLit() {
if (dll.lit) {
return dll.lit;
}
dll.lit = await util.dimport('https://unpkg.com/lit-html?module');
return dll.lit;
}
static get observedAttributes() {
return [];
}
static get propTypes() {
return {};
}
static get defaultProps() {
return {};
}
static get defaultState() {
return {};
}
static async getTemplate(state = {}, props = {}, events = {}) {
let {html} = await this.importLit();
return html`<div id="root" data-state="${JSON.stringify(state)}"
data-props="${JSON.stringify(props)}" @click=${events.onClick}></div>`;
}
constructor() {
super();
this._isConnected = false;
this.props = Object.assign({}, this.constructor.defaultProps, this._initialProps);
this.state = Object.assign({}, this.constructor.defaultState);
this._boundOnUIEvent = this.onUIEvent.bind(this);
this._boundOnCommand = this.onCommand.bind(this);
this._idleRenderCallback = async () => {
this._idleCallbackId = null;
return await this.render();
};
}
get _initialProps() {
const props = {};
for (let key of Object.keys(this.constructor.propTypes)) {
if (!this.dataset[key]) { continue; }
const type = typeof this.constructor.propTypes[key];
props[key] = type !== 'string' ? JSON.parse(this.dataset[key]) : this.dataset[key];
}
return props;
}
async render() {
if (!this._isConnected) {
return;
}
let {render} = await this.constructor.importLit();
if (!this._shadow) {
this._shadow = this.attachShadow({mode: 'open'});
render(await this.constructor.getTemplate(this.state, this.props, {onClick: this._boundOnUIEvent}), this._shadow);
this._root = this._shadow.querySelector('#root');
this._root.addEventListener('command', this._boundOnCommand);
} else {
render(await this.constructor.getTemplate(this.state, this.props, {onClick: this._boundOnUIEvent}), this._shadow);
}
}
requestRender() {
if (this._idleCallbackId) {
cancelIdleCallback(this._idleCallbackId);
}
this._idleCallbackId = requestIdleCallback(this._idleRenderCallback, {});
}
async connectedCallback() {
this._isConnected = true;
await this.render();
}
async disconnectedCallback() {
this._isConnected = false;
if (this._root) {
this._root.removeEventListener('click', this._boundOnUIEvent);
this._root.removeEventListener('command', this._boundOnCommand);
this._root = null;
}
let {render} = await this.constructor.importLit();
render('', this._shadow);
this._shadow = null;
}
attributeChangedCallback(attr, oldValue, newValue) {
attr = attr.startsWith('data-') ? this.constructor.toPropName(attr) : attr;
const type = this.constructor.defaultProps[attr];
if (['number', 'boolean', 'json'].includes(type)) {
newValue = JSON.parse(newValue);
}
if (this.props[attr] === newValue) {
return;
}
this.props[attr] = newValue;
this.requestRender();
}
setProp(prop, value) {
this.setAttribute(prop, value);
}
setState(key, value) {
if (this._setState(key, value)) {
this.requestRender();
return true;
}
return false;
}
_setState(key, value) {
if (!this.state.hasOwnProperty(key)) { return false; }
if (this.state[key] === value) { return false; }
this.state[key] = value;
return true;
}
onUIEvent(e) {
let target = e.target.closest('[data-command]');
if (!target) {
return;
}
let {command, param, type} = target.dataset;
if (['number', 'boolean', 'json'].includes(type)) {
param = JSON.parse(param);
}
e.preventDefault();
e.stopPropagation();
return this.dispatchCommand(command, param, e);
}
dispatchCommand(command, param, originalEvent = null) {
this.dispatchEvent(new CustomEvent('command', {detail: {command, param, originalEvent}, bubbles: true, composed: true}));
}
onCommand(e) {
//console.log('on-command', e.detail.command, e.detail.param);
}
}
const {VideoItemElement} = (() => {
const ITEM_HEIGHT = 100;
const THUMBNAIL_WIDTH = 96;
const THUMBNAIL_HEIGHT = 72;
const DELETED_THUMBNAIL = 'https://nicovideo.cdn.nimg.jp/uni/img/common/video_deleted.jpg';
const VideoItemProps = {
watchId: '',
videoId: '',
threadId: '',
title: '',
duration: 0,
commentCount: 0,
mylistCount: 0,
viewCount: 0,
thumbnail: DELETED_THUMBNAIL,
postedAt: '',
description: '',
mylistComment: '',
isChannel: false,
isMymemory: false,
ownerId: 0,
ownerName: '',
thumbInfo: {},
hasInview: false
};
const VideoItemAttributes = Object.keys(VideoItemProps).map(prop => BaseCommandElement.toAttributeName(prop));
class VideoItemElement extends BaseCommandElement {
static get propTypes() {
return VideoItemProps;
}
static get defaultProps() {
return VideoItemProps;
}
static get observedAttributes() {
return VideoItemAttributes;
};
static get defaultState() {
return {
isActive: false,
isPlayed: false
};
}
static async getTemplate(state = {}, props = {}, events = {}) {
let {html} = await this.importLit();
const watchId = props.watchId;
const watchUrl = `https://www.nicovideo.jp/watch/${props.watchId}`;
const title = props.title ? html`<span title="${props.title}">${props.title}<span>` : props.watchId;
const duration = props.duration ? html`<span class="duration">${util.secToTime(props.duration)}</span>` : '';
const postedAt = props.postedAt ? `${new Date(props.postedAt).toLocaleString()}` : '';
const counter = (props.viewCount || props.commentCount || props.mylistCount) ? html`
<div class="counter">
<span class="count">再生: <span class="value viewCount">${props.viewCount}</span></span>
<span class="count">コメ: <span class="value commentCount">${props.commentCount}</span></span>
<span class="count">マイ: <span class="value mylistCount">${props.mylistCount}</span></span>
</div>
` : '';
// console.log('props', props);
// console.log('state', state);
// console.log('events', events);
return html`
<div id="root" @click=${events.onClick}>
<style>
#root {
background-color: #666;
box-sizing: border-box;
user-select: none;
}
.videoItem {
position: relative;
display: grid;
width: 100%;
height: ${ITEM_HEIGHT}px;
overflow: hidden;
grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
grid-template-rows: ${THUMBNAIL_HEIGHT}px 1fr;
padding: 2px;
transition:
transform 0.4s ease, box-shadow 0.4s ease;
contain: layout size;
}
.playlist .videoItem {
cursor: move;
}
.playlist .videoItem::before {
content: counter(itemIndex);
counter-increment: itemIndex;
position: absolute;
right: 8px;
top: 80%;
color: #666;
font-family: Impact, serif;
font-size: 45px;
pointer-events: none;
z-index: 1;
line-height: ${ITEM_HEIGHT}px;
opacity: 0.6;
transform: translate(0, -50%);
}
:host-context(.is-fav-favorited) .videoItem .postedAt::after {
content: ' ★';
color: #fea;
text-shadow: 2px 2px 2px #000;
}
.thumbnailContainer {
position: relative;
transform: translate(0, 2px);
margin: 0;
background-color: black;
background-size: contain;
background-repeat: no-repeat;
background-position: center;
}
.thumbnail {
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
object-fit: contain;
}
.thumbnailContainer a {
display: inline-block;
width: 100%;
height: 100%;
transition: box-shaow 0.4s ease, transform 0.4s ease;
}
.thumbnailContainer a:active {
box-shadow: 0 0 8px #f99;
transform: translate(0, 4px);
transition: none;
}
.thumbnailContainer .playlistAppend,
.playlistRemove,
.thumbnailContainer .deflistAdd,
.thumbnailContainer .pocket-info {
position: absolute;
display: none;
color: #fff;
background: #666;
width: 24px;
height: 20px;
line-height: 18px;
font-size: 14px;
box-sizing: border-box;
text-align: center;
font-weight: bolder;
cursor: pointer;
}
.thumbnailContainer .playlistAppend {
left: 0;
bottom: 0;
}
.playlistRemove {
right: 8px;
top: 0;
}
.thumbnailContainer .deflistAdd {
right: 0;
bottom: 0;
}
.thumbnailContainer .pocket-info {
display: none !important;
right: 24px;
bottom: 0;
}
:host-context(.is-pocketReady) .videoItem:hover .pocket-info {
display: inline-block !important;
}
.videoItem:hover .thumbnailContainer .playlistAppend,
.videoItem:hover .thumbnailContainer .deflistAdd,
.videoItem:hover .thumbnailContainer .pocket-info {
display: inline-block;
border: 1px outset;
}
.videoItem:hover .thumbnailContainer .playlistAppend:hover,
.videoItem:hover .thumbnailContainer .deflistAdd:hover,
.videoItem:hover .thumbnailContainer .pocket-info:hover {
transform: scale(1.5);
box-shadow: 2px 2px 2px #000;
}
.videoItem:hover .thumbnailContainer .playlistAppend:active,
.videoItem:hover .thumbnailContainer .deflistAdd:active,
.videoItem:hover .thumbnailContainer .pocket-info:active {
transform: scale(1.3);
border: 1px inset;
transition: none;
}
.videoItem.is-updating .thumbnailContainer .deflistAdd {
transform: scale(1.0) !important;
border: 1px inset !important;
pointer-events: none;
}
.thumbnailContainer .duration {
position: absolute;
right: 0;
bottom: 0;
background: #000;
font-size: 12px;
color: #fff;
}
.videoItem:hover .thumbnailContainer .duration {
display: none;
}
.videoInfo {
height: 100%;
padding-left: 4px;
}
.postedAt {
font-size: 12px;
color: #ccc;
}
.is-played .postedAt::after {
content: ' ●';
font-size: 10px;
}
.counter {
position: absolute;
top: 80px;
width: 100%;
text-align: center;
}
.title {
height: 52px;
overflow: hidden;
}
.videoLink {
font-size: 14px;
color: #ff9;
transition: background 0.4s ease, color 0.4s ease;
}
.videoLink:visited {
color: #ffd;
}
.videoLink:active {
color: #fff;
background: #663;
transition: none;
}
.noVideoCounter .counter {
display: none;
}
.counter {
font-size: 12px;
color: #ccc;
}
.counter .value {
font-weight: bolder;
}
.counter .count {
white-space: nowrap;
}
.counter .count + .count {
margin-left: 8px;
}
/*
@media screen and (min-width: 600px)
{
#listContainerInner {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.videoItem {
margin: 4px 8px 0;
border-top: none !important;
border-bottom: 1px dotted var(--item-border-color, #ccc);
}
}
*/
</style>
<div class="videoItem">
<span class="playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
<div class="thumbnailContainer ${props.hasInview ? 'has-inview' : ''}">
<a class="command" data-command="select" href="${watchUrl}">
<img src="${props.thumbnail}" class="thumbnail" lazyload="on">
${duration}
</a>
<span class="playlistAppend" data-command="playlistAppend" data-param="${watchId}" title="プレイリストに追加">▶</span>
<span class="deflistAdd" data-command="deflistAdd" data-param="${watchId}" title="とりあえずマイリスト">&#x271A;</span>
<span class="pocket-info" data-command="pocket-info" data-param="${watchId}" title="動画情報">？</span>
</div>
<div class="videoInfo">
<div class="postedAt">${postedAt}</div>
<div class="title">
<a class="videoLink" data-command="select" href="${watchUrl}">${title}</a>
</div>
</div>
${counter}
</div>
</div>`;
}
_applyThumbInfo(thumbInfo) {
const data = thumbInfo.data;
const thumbnail = this.props.thumbnail.match(/smile\?i=/) || data.thumbnail;
const isChannel = data.v.startsWith('so') || data.owner.type === 'channel';
const watchId = isChannel ? data.id : data.v;
Object.assign(this.dataset, {
watchId,
videoId: data.id,
title: data.title,
duration: data.duration,
commentCount: data.commentCount,
mylistCount: data.mylistCount,
viewCount: data.viewCount,
thumbnail,
postedAt: data.postedAt,
ownerId: data.owner.id,
ownerName: data.owner.name,
ownerIcon: data.owner.icon,
owerUrl: data.owner.url,
isChannel
});
this.dispatchEvent(new CustomEvent('thumb-info', {detail: {props: this.props}, bubbles: true, composed: true}));
}
attributeChangedCallback(attr, oldValue, newValue) {
if (attr !== 'data-thumb-info') {
return super.attributeChangedCallback(attr, oldValue, newValue);
}
const info = JSON.parse(newValue);
if (!info.data || info.data.status !== 'ok') {
return;
}
this._applyThumbInfo(info);
}
}
return {VideoItemElement};
})();
const components = (() => {
if (window.customElements) {
window.customElements.define('zenza-video-item', VideoItemElement);
}
return {
BaseCommandElement,
VideoItemElement
};
})();

class BaseState extends Emitter {
constructor() {
super();
this._name = '';
this._state = {};
this._props = {};
}
_defineProperty() {
Object.keys(this._state).forEach(key => {
Object.defineProperty(
this,
key, {
get: () => this._state[key],
set: v => {
this._setState(key, v);
}
});
});
}
setState(key, val) {
if (_.isString(key)) {
return this._setState(key, val);
}
Object.keys(key).forEach(k => this._setState(k, key[k]));
}
_setState(key, val) {
if (!this._state.hasOwnProperty(key)) {
window.console.warn('%cUnknown property %s = %s', 'background: yellow;', key, val);
console.trace();
}
if (this._state[key] === val) {
return;
}
this._state[key] = val;
this.emit('change', key, val);
this.emit(`update-${key}`, val);
}
}
class PlayerState extends BaseState {
static getInstance(config) {
if (!PlayerState.instance) {
PlayerState.instance = new PlayerState(config);
}
return PlayerState.instance;
}
constructor(config) {
super();
this._name = 'Player';
this._state = {
isAbort: false,
isBackComment: config.getValue('backComment'),
isChanging: false,
isChannel: false,
isShowComment: config.getValue('showComment'),
isCommentReady: false,
isCommentPosting: false,
isCommunity: false,
isWaybackMode: false,
isDebug: config.getValue('debug'),
isDmcAvailable: false,
isDmcPlaying: false,
isError: false,
isLoading: false,
isLoop: config.getValue('loop'),
isMute: config.getValue('mute'),
isMymemory: false,
isOpen: false,
isPausing: false,
isPlaylistEnable: false,
isPlaying: false,
isSeeking: false,
isRegularUser: !util.isPremium(),
isStalled: false,
isUpdatingDeflist: false,
isUpdatingMylist: false,
isNotPlayed: true,
isYouTube: false,
isEnableFilter: config.getValue('enableFilter'),
sharedNgLevel: config.getValue('sharedNgLevel'),
currentSrc: '',
currentTab: config.getValue('videoInfoPanelTab'),
// aspectRatio: 9/16,
errorMessage: '',
screenMode: config.getValue('screenMode'),
playbackRate: config.getValue('playbackRate'),
thumbnail: '',
videoCount: {},
videoSession: {}
};
this._defineProperty();
}
set videoInfo(videoInfo) {
if (this._videoInfo) {
this._videoInfo.update(videoInfo);
} else {
this._videoInfo = videoInfo;
}
ZenzaWatch.debug.videoInfo = videoInfo;
this.videoCount = videoInfo.count;
this.thumbnail = videoInfo.betterThumbnail;
this.emit('update-videoInfo', videoInfo);
}
get videoInfo() {
return this._videoInfo;
}
resetVideoLoadingStatus() {
this.setState({
isLoading: true,
isPlaying: false,
isSeeking: false,
isStalled: false,
isError: false,
isAbort: false,
isMymemory: false,
isCommunity: false,
isChannel: false,
currentSrc: CONSTANT.BLANK_VIDEO_URL
});
}
setVideoCanPlay() {
this.setState({
isStalled: false, isLoading: false, isPausing: false, isNotPlayed: true, isError: false, isSeeking: false
});
}
setPlaying() {
this.setState({
isPlaying: true,
isPausing: false,
isLoading: false,
isNotPlayed: false,
isError: false,
isStalled: false
});
}
setPausing() {
this.setState({isPlaying: false, isPausing: true});
}
setVideoEnded() {
this.setState({isPlaying: false, isPausing: false, isSeeking: false});
}
setVideoErrorOccurred() {
this.setState({isError: true, isPlaying: false, isLoading: false, isSeeking: false});
}
}

const {
VideoInfoLoader,
ThumbInfoLoader,
MylistApiLoader,
UploadedVideoApiLoader,
CacheStorage,
CrossDomainGate,
IchibaLoader,
UaaLoader,
PlaybackPosition,
NicoVideoApi,
NicoRssLoader,
RecommendAPILoader,
NVWatchCaller
} = (() => {
let CacheStorage = (() => {
const PREFIX = `${PRODUCT}_cache_`;
class CacheStorage {
constructor(storage) {
this._storage = storage;
this.gc = _.debounce(this.gc.bind(this), 100);
}
gc(now = NaN) {
const storage = this._storage;
now = isNaN(now) ? Date.now() : now;
Object.keys(storage).forEach(key => {
if (key.indexOf(PREFIX) === 0) {
let item;
try {
item = JSON.parse(this._storage[key]);
} catch(e) {
storage.removeItem(key);
}
if (item.expiredAt === '' || item.expiredAt > now) {
return;
}
storage.removeItem(key);
}
});
}
setItem(key, data, expireTime) {
key = PREFIX + key;
const expiredAt =
typeof expireTime === 'number' ? (Date.now() + expireTime) : '';
const cacheData = {
data: data,
type: typeof data,
expiredAt: expiredAt
};
try {
this._storage[key] = JSON.stringify(cacheData);
this.gc();
} catch (e) {
if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
this.gc(0);
}
}
}
getItem(key) {
key = PREFIX + key;
if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
return null;
}
let item = null;
try {
item = JSON.parse(this._storage[key]);
} catch(e) {
this._storage.removeItem(key);
return null;
}
if (item.expiredAt === '' || item.expiredAt > Date.now()) {
return item.data;
}
return null;
}
removeItem(key) {
key = PREFIX + key;
if (this._storage.hasOwnProperty(key) || this._storage[key] !== undefined) {
this._storage.removeItem(key);
}
}
clear() {
const storage = this._storage;
Object.keys(storage).forEach((v) => {
if (v.indexOf(PREFIX) === 0) {
storage.removeItem(v);
}
});
}
}
return CacheStorage;
})();
if (ZenzaWatch) {
ZenzaWatch.api.CacheStorage = CacheStorage;
ZenzaWatch.debug.localCache = new CacheStorage(localStorage);
}
const VideoInfoLoader = (function () {
const cacheStorage = new CacheStorage(sessionStorage);
//JSON.parse(decodeURIComponent(JSON.parse($('#watchAPIDataContainer').text()).flashvars.dmcInfo))
const parseFromGinza = function (dom) {
try {
let watchApiData = JSON.parse(dom.querySelector('#watchAPIDataContainer').textContent);
let videoId = watchApiData.videoDetail.id;
let hasLargeThumbnail = util.hasLargeThumbnail(videoId);
let flvInfo = util.parseQuery(
decodeURIComponent(watchApiData.flashvars.flvInfo)
);
let dmcInfo = JSON.parse(
decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
);
let thumbnail =
watchApiData.flashvars.thumbImage +
(hasLargeThumbnail ? '.L' : '');
let videoUrl = flvInfo.url ? flvInfo.url : '';
let isEco = /\d+\.\d+low$/.test(videoUrl);
let isFlv = /\/smile\?v=/.test(videoUrl);
let isMp4 = /\/smile\?m=/.test(videoUrl);
let isSwf = /\/smile\?s=/.test(videoUrl);
let isDmc = watchApiData.flashvars.isDmc === 1 && dmcInfo.session_api;
let csrfToken = watchApiData.flashvars.csrfToken;
let playlistToken = watchApiData.playlistToken;
let watchAuthKey = watchApiData.flashvars.watchAuthKey;
let seekToken = watchApiData.flashvars.seek_token;
let threads = [];
let msgInfo = {
server: flvInfo.ms,
threadId: flvInfo.thread_id * 1,
duration: flvInfo.l,
userId: flvInfo.user_id,
isNeedKey: flvInfo.needs_key === '1',
optionalThreadId: flvInfo.optional_thread_id,
defaultThread: {id: flvInfo.thread_id * 1},
optionalThreads: [],
layers: [],
threads,
userKey: flvInfo.userkey,
hasOwnerThread: !!watchApiData.videoDetail.has_owner_thread,
when: null
};
if (msgInfo.hasOwnerThread) {
threads.push({
id: flvInfo.thread_id * 1,
isThreadkeyRequired: flvInfo.needs_key === '1',
isDefaultPostTarget: false,
fork: 1,
isActive: true,
label: 'owner'
});
}
threads.push({
id: flvInfo.thread_id * 1,
isThreadkeyRequired: flvInfo.needs_key === '1',
isDefaultPostTarget: true,
isActive: true,
label: flvInfo.needs_key === '1' ? 'community' : 'default'
});
let playlist =
JSON.parse(dom.querySelector('#playlistDataContainer').textContent);
const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));
cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);
let result = {
_format: 'watchApi',
watchApiData,
flvInfo,
dmcInfo,
msgInfo,
playlist,
isDmcOnly: isPlayable && !isPlayableSmile,
isPlayable,
isMp4,
isFlv,
isSwf,
isEco,
isDmc,
thumbnail,
csrfToken,
playlistToken,
watchAuthKey,
seekToken
};
ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
return result;
} catch (e) {
window.console.error('error: parseFromGinza ', e);
return null;
}
};
const parseFromHtml5Watch = function (dom) {
const watchDataContainer = dom.querySelector('#js-initial-watch-data');
const data = JSON.parse(watchDataContainer.getAttribute('data-api-data'));
const env = JSON.parse(watchDataContainer.getAttribute('data-environment'));
const videoId = data.video.id;
const hasLargeThumbnail = util.hasLargeThumbnail(videoId);
const flvInfo = data.video.smileInfo || {};
const dmcInfo = data.video.dmcInfo || {};
const thumbnail = data.video.thumbnailURL + (hasLargeThumbnail ? '.L' : '');
const videoUrl = flvInfo.url ? flvInfo.url : '';
const isEco = /\d+\.\d+low$/.test(videoUrl);
const isFlv = /\/smile\?v=/.test(videoUrl);
const isMp4 = /\/smile\?m=/.test(videoUrl);
const isSwf = /\/smile\?s=/.test(videoUrl);
const isDmc = !!dmcInfo && !!dmcInfo.session_api;
// const isChannel = !!data.channel;
// const isCommunity = !!data.community;
const csrfToken = data.context.csrfToken;
const watchAuthKey = data.context.watchAuthKey;
const playlistToken = env.playlistToken;
const context = data.context;
const commentComposite = data.commentComposite;
const threads = commentComposite.threads.map(t => Object.assign({}, t));
const layers = commentComposite.layers.map(t => Object.assign({}, t));
layers.forEach(layer => {
layer.threadIds.forEach(({id, fork}) => {
threads.forEach(thread => {
if (thread.id === id && fork === 0) {
thread.layer = layer;
}
});
});
});
const linkedChannelVideo =
(context.linkedChannelVideos || []).find(ch => {
return !!ch.isChannelMember;
});
const isNeedPayment = context.isNeedPayment;
const defaultThread = threads.find(t => t.isDefaultPostTarget);
const msgInfo = {
server: data.thread.serverUrl,
threadId: defaultThread ? defaultThread.id : (data.thread.ids.community || data.thread.ids.default),
duration: data.video.duration,
userId: data.viewer.id,
isNeedKey: threads.findIndex(t => t.isThreadkeyRequired) >= 0, // (isChannel || isCommunity)
optionalThreadId: '',
defaultThread,
optionalThreads: threads.filter(t => t.id !== defaultThread.id) || [],
threads,
userKey: data.context.userkey,
hasOwnerThread: data.thread.hasOwnerThread,
when: null
};
const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));
cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);
const playlist = {playlist: []};
const tagList = [];
data.tags.forEach(t => {
tagList.push({
_data: t,
id: t.id,
tag: t.name,
dic: t.isDictionaryExists,
lock: t.isLocked, // 形式が統一されてない悲しみを吸収
owner_lock: t.isLocked ? 1 : 0,
lck: t.isLocked ? '1' : '0',
cat: t.isCategory
});
});
let channelInfo = null, channelId = null;
if (data.channel) {
channelInfo = {
icon_url: data.channel.iconURL || '',
id: data.channel.id,
name: data.channel.name,
is_favorited: data.channel.isFavorited ? 1 : 0
};
channelId = channelInfo.id;
}
let uploaderInfo = null;
if (data.owner) {
uploaderInfo = {
icon_url: data.owner.iconURL,
id: data.owner.id,
nickname: data.owner.nickname,
is_favorited: data.owner.isFavorited,
isMyVideoPublic: data.owner.isUserMyVideoPublic
};
}
const watchApiData = {
videoDetail: {
v: data.context.watchId,
id: data.video.id,
title: data.video.title,
title_original: data.video.originalTitle,
description: data.video.description,
description_original: data.video.originalDescription,
postedAt: data.video.postedDateTime,
thumbnail: data.video.thumbnailURL,
length: data.video.duration,
commons_tree_exists: !!data.video.isCommonsTreeExists,
width: data.video.width,
height: data.video.height,
isChannel: data.channel && data.channel.id,
isMymemory: data.context.isMyMemory, // 大文字小文字注意
communityId: data.community ? data.community.id : null,
channelId,
commentCount: data.thread.commentCount,
mylistCount: data.video.mylistCount,
viewCount: data.video.viewCount,
tagList
},
viewerInfo: {id: data.viewer.id},
channelInfo,
uploaderInfo
};
let ngFilters = null;
if (data.video && data.video.dmcInfo && data.video.dmcInfo.thread && data.video.dmcInfo.thread) {
if (data.video.dmcInfo.thread.channel_ng_words && data.video.dmcInfo.thread.channel_ng_words.length) {
ngFilters = data.video.dmcInfo.thread.channel_ng_words;
} else if (data.video.dmcInfo.thread.owner_ng_words && data.video.dmcInfo.thread.owner_ng_words.length) {
ngFilters = data.video.dmcInfo.thread.owner_ng_words;
}
}
if (data.context && data.context.ownerNGList && data.context.ownerNGList.length) {
ngFilters = data.context.ownerNGList;
}
if (ngFilters && ngFilters.length) {
const ngtmp = [];
ngFilters.forEach(ng => {
if (!ng.source || !ng.destination) { return; }
ngtmp.push(
encodeURIComponent(ng.source) + '=' + encodeURIComponent(ng.destination));
});
flvInfo.ng_up = ngtmp.join('&');
}
const result = {
_format: 'html5watchApi',
_data: data,
watchApiData,
flvInfo,
dmcInfo,
msgInfo,
playlist,
isDmcOnly: isPlayable && !isPlayableSmile,
isPlayable,
isMp4,
isFlv,
isSwf,
isEco,
isDmc,
thumbnail,
csrfToken,
watchAuthKey,
playlistToken,
isNeedPayment,
linkedChannelVideo,
resumeInfo: {
initialPlaybackType: data.context.initialPlaybackType || '',
initialPlaybackPosition: data.context.initialPlaybackPosition || 0
}
};
ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
return result;
};
const parseWatchApiData = function (src) {
const dom = document.createElement('div');
dom.innerHTML = src;
if (dom.querySelector('#watchAPIDataContainer')) {
return parseFromGinza(dom);
} else if (dom.querySelector('#js-initial-watch-data')) {
return parseFromHtml5Watch(dom);
} else if (dom.querySelector('#PAGEBODY .mb16p4 .font12')) {
return {
reject: true,
reason: 'forbidden',
message: dom.querySelector('#PAGEBODY .mb16p4 .font12').textContent,
};
} else {
return null;
}
};
const loadLinkedChannelVideoInfo = (originalData) => {
const linkedChannelVideo = originalData.linkedChannelVideo;
const originalVideoId = originalData.watchApiData.videoDetail.id;
const videoId = linkedChannelVideo.linkedVideoId;
originalData.linkedChannelData = null;
if (originalVideoId === videoId) {
return Promise.reject();
}
const url = `//www.nicovideo.jp/watch/${videoId}`;
window.console.info('%cloadLinkedChannelVideoInfo', 'background: cyan', linkedChannelVideo);
return new Promise(r => {
setTimeout(() => {
r();
}, 1000);
}).then(() => {
return util.fetch(url, {credentials: 'include'});
})
.then(res => {
return res.text();
})
.then(html => {
const dom = document.createElement('div');
dom.innerHTML = html;
const data = parseFromHtml5Watch(dom);
//window.console.info('linkedChannelData', data);
originalData.dmcInfo = data.dmcInfo;
originalData.isDmcOnly = data.isDmcOnly;
originalData.isPlayable = data.isPlayable;
originalData.isMp4 = data.isMp4;
originalData.isFlv = data.isFlv;
originalData.isSwf = data.isSwf;
originalData.isEco = data.isEco;
originalData.isDmc = data.isDmc;
return originalData;
})
.catch(() => {
return Promise.reject({reason: 'network', message: '通信エラー(loadLinkedChannelVideoInfo)'});
});
};
const onLoadPromise = (watchId, options, isRetry, resp) => {
const data = parseWatchApiData(resp);
ZenzaWatch.debug.watchApiData = data;
if (!data) {
return Promise.reject({
reason: 'network',
message: '通信エラー。動画情報の取得に失敗しました。(watch api)'
});
}
if (data.reject) {
return Promise.reject(data);
}
if (data.isFlv && !data.isEco) {
return Promise.reject({
reason: 'flv',
info: data,
message: 'この動画はZenzaWatchで再生できません(flv)'
});
}
if (
!data.isPlayable &&
data.isNeedPayment &&
data.linkedChannelVideo &&
Config.getValue('loadLinkedChannelVideo')) {
return loadLinkedChannelVideoInfo(data);
}
if (!data.isPlayable) {
return Promise.reject({
reason: 'not supported',
info: data,
message: 'この動画はZenzaWatchで再生できません'
});
}
ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId);
return Promise.resolve(data);
};
const createSleep = function (sleepTime) {
return new Promise(resolve => {
window.setTimeout(() => {
return resolve();
}, sleepTime);
});
};
const loadPromise = function (watchId, options, isRetry = false) {
let url = `${location.protocol}//www.nicovideo.jp/watch/${watchId}`;
console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);
const query = [];
if (options.economy === true) {
query.push('eco=1');
}
if (query.length > 0) {
url += '?' + query.join('&');
}
return util.fetch(url, {credentials: 'include'})
.then(res => {
return res.text();
})
.catch(() => {
return Promise.reject({reason: 'network', message: '通信エラー(network)'});
})
.then(onLoadPromise.bind(this, watchId, options, isRetry))
.catch(err => {
if (isRetry) {
return Promise.reject({
watchId,
message: err.message || '動画情報の取得に失敗したか、未対応の形式です',
type: 'watchapi'
});
}
if (err.reason === 'forbidden') {
return Promise.reject(err);
} else if (err.reason === 'network') {
return createSleep(5000).then(() => {
window.console.warn('network error & retry');
return loadPromise(watchId, options, true);
});
} else if (err.reason === 'flv' && !options.economy) {
options.economy = true;
window.console.log(
'%cエコノミーにフォールバック(flv)',
'background: cyan; color: red;');
return createSleep(500).then(() => {
return loadPromise(watchId, options, true);
});
} else {
window.console.info('watch api fail', err);
return Promise.reject({
watchId,
message: err.message || '動画情報の取得に失敗',
info: err.info
});
}
});
};
return {
load: function (watchId, options) {
const timeKey = `watchAPI:${watchId}`;
window.console.time(timeKey);
return loadPromise(watchId, options).then(
(result) => {
window.console.timeEnd(timeKey);
return result;
},
(err) => {
err.watchId = watchId;
window.console.timeEnd(timeKey);
return Promise.reject(err);
}
);
}
};
})();
let ThumbInfoLoader = (function () {
let BASE_URL = 'https://ext.nicovideo.jp/';
let MESSAGE_ORIGIN = 'https://ext.nicovideo.jp/';
let gate = null;
let cacheStorage;
let parseXml = function (xmlText) {
let parser = new DOMParser();
let xml = parser.parseFromString(xmlText, 'text/xml');
let val = function (name) {
let elms = xml.getElementsByTagName(name);
if (elms.length < 1) {
return null;
}
return elms[0].innerHTML;
};
let resp = xml.getElementsByTagName('nicovideo_thumb_response');
if (resp.length < 1 || resp[0].getAttribute('status') !== 'ok') {
return {
status: 'fail',
code: val('code'),
message: val('description')
};
}
let duration = (function () {
let tmp = val('length').split(':');
return parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
})();
let watchId = val('watch_url').split('/').reverse()[0];
let postedAt = util.dateToString(new Date(val('first_retrieve')));
let tags = (function () {
let t = Array.from(xml.getElementsByTagName('tag'));
let result = t.map(tag => {
return {
text: tag.innerHTML,
category: tag.hasAttribute('category'),
lock: tag.hasAttribute('lock')
};
});
return result;
})();
let videoId = val('video_id');
let isChannel = videoId.substring(0, 2) === 'so';
let result = {
status: 'ok',
_format: 'thumbInfo',
v: isChannel ? videoId : watchId,
id: videoId,
originalVideoId: (!isChannel && watchId !== videoId) ? videoId : '',
isChannel,
title: val('title'),
description: val('description'),
thumbnail: val('thumbnail_url').replace(/^http:/, ''),
movieType: val('movie_type'),
lastResBody: val('last_res_body'),
duration,
postedAt,
mylistCount: parseInt(val('mylist_counter'), 10),
viewCount: parseInt(val('view_counter'), 10),
commentCount: parseInt(val('comment_num'), 10),
tagList: tags
};
let userId = val('user_id');
if (userId !== null && userId !== '') {
result.owner = {
type: 'user',
id: userId,
linkId: userId ? `user/${userId}` : '',
name: val('user_nickname') || '(非公開ユーザー)',
url: userId ? ('//www.nicovideo.jp/user/' + userId) : '#',
icon: val('user_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
};
}
let channelId = val('ch_id');
if (channelId !== null && channelId !== '') {
result.owner = {
type: 'channel',
id: channelId,
linkId: channelId ? `ch${channelId}` : '',
name: val('ch_name') || '(非公開ユーザー)',
url: '//ch.nicovideo.jp/ch' + channelId,
icon: val('ch_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
};
}
console.log('thumbinfo: ', watchId, result);
cacheStorage.setItem('thumbInfo_' + result.v, result, 1000 * 60 * 10);
return result;
};
let initialize = function () {
if (cacheStorage) { return; }
cacheStorage = new CacheStorage(sessionStorage);
gate = new CrossDomainGate({
baseUrl: BASE_URL,
origin: MESSAGE_ORIGIN,
type: 'thumbInfo',
messager: WindowMessageEmitter
});
};
let load = function (watchId) {
initialize();
return new Promise(function (resolve, reject) {
let cache = cacheStorage.getItem('thumbInfo_' + watchId);
if (cache) {
console.log('cache exist: ', watchId);
setTimeout(() => {
resolve(cache);
}, 0);
return;
}
gate.load(BASE_URL + 'api/getthumbinfo/' + watchId).then(function (result) {
result = parseXml(result);
if (result.status === 'ok') {
resolve(result);
} else {
reject(result);
}
});
});
};
return {
load: load
};
})();
if (ZenzaWatch) {
ZenzaWatch.api.ThumbInfoLoader = ThumbInfoLoader;
}
let MylistApiLoader = (function () {
// マイリスト/とりあえずマイリストの取得APIには
// www.nicovideo.jp配下とflapi.nicovideo.jp配下の２種類がある
// 他人のマイリストを取得するにはflapi、マイリストの編集にはwwwのapiが必要
// データのフォーマットが微妙に異なるのでめんどくさい
//
// おかげでソート処理が悲しいことに
//
let CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
let TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
let token = '';
let cacheStorage = null;
function MylistApiLoader() {
this.initialize.apply(this, arguments);
}
if (ZenzaWatch) {
ZenzaWatch.emitter.on('csrfTokenUpdate', t => {
token = t;
if (cacheStorage) {
cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
}
});
}
_.assign(MylistApiLoader.prototype, {
initialize: function () {
if (!cacheStorage) {
cacheStorage = new CacheStorage(sessionStorage);
}
if (!token) {
token = cacheStorage.getItem('csrfToken');
if (token) {
console.log('cached token exists', token);
}
}
},
setCsrfToken: function (t) {
token = t;
if (cacheStorage) {
cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
}
},
getDeflistItems: function (options) {
options = options || {};
let url = '//www.nicovideo.jp/api/deflist/list';
//var url = 'https://flapi.nicovideo.jp/api/watch/deflistvideo';
let cacheKey = 'deflistItems';
let sortItem = this.sortItem;
options = options || {};
return new Promise(function (resolve, reject) {
let cacheData = cacheStorage.getItem(cacheKey);
if (cacheData) {
console.log('cache exists: ', cacheKey, cacheData);
setTimeout(() => {
if (options.sort) {
cacheData = sortItem(cacheData, options.sort, 'www');
}
resolve(cacheData);
}, 0);
return;
}
util.ajax({
url: url,
timeout: 60000,
cache: false,
dataType: 'json',
xhrFields: {withCredentials: true}
}).then(function (result) {
if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
reject({
result: result,
message: 'とりあえずマイリストの取得失敗(1)'
});
return;
}
let data = result.list || result.mylistitem;
cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
if (options.sort) {
data = sortItem(data, options.sort, 'www');
}
resolve(data);
}, function (err) {
reject({
result: err,
message: 'とりあえずマイリストの取得失敗(2)'
});
});
});
},
getMylistItems: function (groupId, options) {
options = options || {};
if (groupId === 'deflist') {
return this.getDeflistItems(options);
}
// flapiじゃないと自分のマイリストしか取れないことが発覚
let url = 'https://flapi.nicovideo.jp/api/watch/mylistvideo?id=' + groupId;
let cacheKey = 'mylistItems: ' + groupId;
let sortItem = this.sortItem;
return new Promise(function (resolve, reject) {
let cacheData = cacheStorage.getItem(cacheKey);
if (cacheData) {
console.log('cache exists: ', cacheKey, cacheData);
setTimeout(() => {
if (options.sort) {
cacheData = sortItem(cacheData, options.sort, 'flapi');
}
resolve(cacheData);
}, 0);
return;
}
return util.ajax({
url: url,
timeout: 60000,
cache: false,
dataType: 'json',
xhrFields: {withCredentials: true}
}).then(function (result) {
if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
return reject({
result: result,
message: 'マイリストの取得失敗(1)'
});
}
let data = result.list || result.mylistitem;
cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
if (options.sort) {
data = sortItem(data, options.sort, 'flapi');
}
return resolve(data);
}, function (err) {
this.reject({
result: err,
message: 'マイリストの取得失敗(2)'
});
});
});
},
sortItem: function (items, sortId, format) {
// wwwの時とflapiの時で微妙にフォーマットが違うのでめんどくさい
// 自分以外のマイリストが開けるのはflapiだけの模様
// 編集時にはitem_idが必要なのだが、それはwwwのほうにしか入ってない
// flapiに統一したい
sortId = parseInt(sortId, 10);
let sortKey = ([
'create_time', 'create_time',
'mylist_comment', 'mylist_comment', // format = wwwの時はdescription
'title', 'title',
'first_retrieve', 'first_retrieve',
'view_counter', 'view_counter',
'thread_update_time', 'thread_update_time',
'num_res', 'num_res',
'mylist_counter', 'mylist_counter',
'length_seconds', 'length_seconds'
])[sortId];
if (format === 'www' && sortKey === 'mylist_comment') {
sortKey = 'description';
}
if (format === 'www' && sortKey === 'thread_update_time') {
sortKey = 'update_time';
}
let order;
switch (sortKey) {
// 偶数がascで奇数がdescかと思ったら特に統一されてなかった
case 'first_retrieve':
case 'thread_update_time':
case 'update_time':
order = (sortId % 2 === 1) ? 'asc' : 'desc';
break;
// 数値系は偶数がdesc
case 'num_res':
case 'mylist_counter':
case 'view_counter':
case 'length_seconds':
order = (sortId % 2 === 1) ? 'asc' : 'desc';
break;
default:
order = (sortId % 2 === 0) ? 'asc' : 'desc';
}
//window.console.log('sortKey?', sortId, sortKey, order);
if (!sortKey) {
return items;
}
let getKeyFunc = (function (sortKey, format) {
switch (sortKey) {
case 'create_time':
case 'description':
case 'mylist_comment':
case 'update_time':
return function (item) {
return item[sortKey];
};
case 'num_res':
case 'mylist_counter':
case 'view_counter':
case 'length_seconds':
if (format === 'flapi') {
return function (item) {
return item[sortKey] * 1;
};
} else {
return function (item) {
return item.item_data[sortKey] * 1;
};
}
default:
if (format === 'flapi') {
return function (item) {
return item[sortKey];
};
} else {
return function (item) {
return item.item_data[sortKey];
};
}
}
})(sortKey, format);
let compareFunc = (function (order, getKey) {
switch (order) {
// sortKeyが同一だった場合は動画IDでソートする
// 銀魂など、一部公式チャンネル動画向けの対応
case 'asc':
return function (a, b) {
let ak = getKey(a), bk = getKey(b);
if (ak !== bk) {
return ak > bk ? 1 : -1;
}
//else { return a.item_data.watch_id > b.item_data.watch_id ? 1 : -1; }
else {
return a.id > b.id ? 1 : -1;
}
};
case 'desc':
return function (a, b) {
let ak = getKey(a), bk = getKey(b);
if (ak !== bk) {
return (ak < bk) ? 1 : -1;
}
else {
return a.id < b.id ? 1 : -1;
}
};
}
})(order, getKeyFunc);
//window.console.log('before sort', items[0], items, order, sortKey, compareFunc);
items.sort(compareFunc);
//window.console.log('after sort', items[0], items);
return items;
},
getMylistList: function () {
let url = '//www.nicovideo.jp/api/mylistgroup/list';
let cacheKey = 'mylistList';
return new Promise(function (resolve, reject) {
let cacheData = cacheStorage.getItem(cacheKey);
if (cacheData) {
console.log('cache exists: ', cacheKey, cacheData);
setTimeout(() => {
resolve(cacheData);
}, 0);
return;
}
util.ajax({
url: url,
timeout: 60000,
cache: false,
dataType: 'json',
xhrFields: {withCredentials: true}
}).then(function (result) {
if (result.status !== 'ok' || !result.mylistgroup) {
return reject({
result: result,
message: 'マイリスト一覧の取得失敗(1)'
});
}
let data = result.mylistgroup;
cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
return resolve(data);
}, function (err) {
return reject({
result: err,
message: 'マイリスト一覧の取得失敗(2)'
});
});
});
},
findDeflistItemByWatchId: function (watchId) {
return this.getDeflistItems().then(function (items) {
for (let i = 0, len = items.length; i < len; i++) {
let item = items[i], wid = item.id || item.item_data.watch_id;
if (wid === watchId) {
return Promise.resolve(item);
}
}
return Promise.reject();
});
},
findMylistItemByWatchId: function (watchId, groupId) {
return this._getMylistItemsFromWapi(groupId).then(function (items) {
for (let i = 0, len = items.length; i < len; i++) {
let item = items[i], wid = item.id || item.item_data.watch_id;
if (wid === watchId) {
return Promise.resolve(item);
}
}
return Promise.reject();
});
},
_getMylistItemsFromWapi: function (groupId) {
// めんどくさいが、マイリスト取得APIは2種類ある
// こっちは自分のマイリストだけを取る奴。 編集にはこっちが必要。
let url = '//www.nicovideo.jp/api/mylist/list?group_id=' + groupId;
return util.ajax({
url: url,
timeout: 60000,
cache: false,
dataType: 'json',
xhrFields: {withCredentials: true}
}).then(function (result) {
if (result.status === 'ok' && result.mylistitem) {
return Promise.resolve(result.mylistitem);
}
return Promise.reject();
});
},
removeDeflistItem: function (watchId) {
return this.findDeflistItemByWatchId(watchId).then(function (item) {
let url = '//www.nicovideo.jp/api/deflist/delete';
let data = 'id_list[0][]=' + item.item_id + '&token=' + token;
let cacheKey = 'deflistItems';
let req = {
url: url,
method: 'POST',
data: data,
dataType: 'json',
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
};
return util.ajax(req).then(function (result) {
if (result.status && result.status === 'ok') {
cacheStorage.removeItem(cacheKey);
ZenzaWatch.emitter.emitAsync('deflistRemove', watchId);
return Promise.resolve({
status: 'ok',
result: result,
message: 'とりあえずマイリストから削除'
});
}
return Promise.reject({
status: 'fail',
result: result,
code: result.error.code,
message: result.error.description
});
}, function (err) {
return Promise.reject({
result: err,
message: 'とりあえずマイリストから削除失敗(2)'
});
});
}).catch(err => {
return Promise.reject({
status: 'fail',
result: err,
message: '動画が見つかりません'
});
});
},
removeMylistItem: function (watchId, groupId) {
return this.findMylistItemByWatchId(watchId, groupId).then(function (item) {
let url = '//www.nicovideo.jp/api/mylist/delete';
window.console.log('delete item:', item);
let data = 'id_list[0][]=' + item.item_id + '&token=' + token + '&group_id=' + groupId;
let cacheKey = 'mylistItems: ' + groupId;
let req = {
url: url,
method: 'POST',
data: data,
dataType: 'json',
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
};
return util.ajax(req).then(function (result) {
if (result.status && result.status === 'ok') {
cacheStorage.removeItem(cacheKey);
ZenzaWatch.emitter.emitAsync('mylistRemove', watchId, groupId);
return Promise.resolve({
status: 'ok',
result: result,
message: 'マイリストから削除'
});
}
return Promise.reject({
status: 'fail',
result: result,
code: result.error.code,
message: result.error.description
});
}, function (err) {
return Promise.reject({
result: err,
message: 'マイリストから削除失敗(2)'
});
});
}, function (err) {
window.console.error(err);
return Promise.reject({
status: 'fail',
result: err,
message: '動画が見つかりません'
});
});
},
_addDeflistItem: function (watchId, description, isRetry) {
let url = '//www.nicovideo.jp/api/deflist/add';
let data = 'item_id=' + watchId + '&token=' + token;
if (description) {
data += '&description=' + encodeURIComponent(description);
}
let cacheKey = 'deflistItems';
let req = {
url: url,
method: 'POST',
data: data,
dataType: 'json',
timeout: 60000,
xhrFields: {withCredentials: true},
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
};
let self = this;
return new Promise(function (resolve, reject) {
util.ajax(req).then(function (result) {
if (result.status && result.status === 'ok') {
cacheStorage.removeItem(cacheKey);
ZenzaWatch.emitter.emitAsync('deflistAdd', watchId, description);
return resolve({
status: 'ok',
result: result,
message: 'とりあえずマイリスト登録'
});
}
if (!result.status || !result.error) {
return reject({
status: 'fail',
result: result,
message: 'とりあえずマイリスト登録失敗(100)'
});
}
if (result.error.code !== 'EXIST' || isRetry) {
return reject({
status: 'fail',
result: result,
code: result.error.code,
message: result.error.description
});
}
/**
すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
例えば、とりマイの300番目に登録済みだった場合に「登録済みです」と言われても探すのがダルいし、
他の動画を追加していけば、そのうち押し出されて消えてしまう。
なので、重複時にエラーを出すのではなく、「消してから追加」することによって先頭に持ってくる。
*/
return self.removeDeflistItem(watchId).then(function () {
return self._addDeflistItem(watchId, description, true).then(function (result) {
resolve({
status: 'ok',
result: result,
message: 'とりあえずマイリストの先頭に移動'
});
});
}, function (err) {
reject({
status: 'fail',
result: err.result,
code: err.code,
message: 'とりあえずマイリスト登録失敗(101)'
});
});
}, function (err) {
reject({
status: 'fail',
result: err,
message: 'とりあえずマイリスト登録失敗(200)'
});
});
});
},
addDeflistItem: function (watchId, description) {
return this._addDeflistItem(watchId, description, false);
},
addMylistItem: function (watchId, groupId, description) {
let url = '//www.nicovideo.jp/api/mylist/add';
let data = 'item_id=' + watchId + '&token=' + token + '&group_id=' + groupId;
if (description) {
data += '&description=' + encodeURIComponent(description);
}
let cacheKey = 'mylistItems: ' + groupId;
let req = {
url: url,
method: 'POST',
data: data,
dataType: 'json',
timeout: 60000,
xhrFields: {withCredentials: true},
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
};
let self = this;
return new Promise(function (resolve, reject) {
util.ajax(req).then(function (result) {
if (result.status && result.status === 'ok') {
cacheStorage.removeItem(cacheKey);
// マイリストに登録したらとりあえずマイリストから除去(=移動)
self.removeDeflistItem(watchId).then(_.noop, _.noop);
return resolve({
status: 'ok',
result: result,
message: 'マイリスト登録'
});
}
if (!result.status || !result.error) {
return reject({
status: 'fail',
result: result,
message: 'マイリスト登録失敗(100)'
});
}
// マイリストの場合は重複があっても「追加して削除」しない。
// とりまいと違って押し出されることがないし、
// シリーズ物が勝手に入れ替わっても困るため
ZenzaWatch.emitter.emitAsync('mylistAdd', watchId, groupId, description);
return reject({
status: 'fail',
result: result,
code: result.error.code,
message: result.error.description
});
}, function (err) {
reject({
status: 'fail',
result: err,
message: 'マイリスト登録失敗(200)'
});
});
});
}
});
return MylistApiLoader;
})();
if (ZenzaWatch) {
ZenzaWatch.api.MylistApiLoader = MylistApiLoader;
ZenzaWatch.init.mylistApiLoader = new MylistApiLoader();
}
let UploadedVideoApiLoader = (function () {
let CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
let cacheStorage = null;
function UploadedVideoApiLoader() {
this.initialize.apply(this, arguments);
}
_.assign(UploadedVideoApiLoader.prototype, {
initialize: function () {
if (!cacheStorage) {
cacheStorage = new CacheStorage(sessionStorage);
}
},
getUploadedVideos: function (userId/*, options*/) {
let url = '//flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=' + userId;
let cacheKey = 'uploadedvideo: ' + userId;
return new Promise(function (resolve, reject) {
let cacheData = cacheStorage.getItem(cacheKey);
if (cacheData) {
console.log('cache exists: ', cacheKey, cacheData);
setTimeout(() => {
resolve(cacheData);
}, 0);
return;
}
return util.ajax({
url: url,
timeout: 60000,
cache: false,
dataType: 'json',
xhrFields: {withCredentials: true}
}).then(function (result) {
if (result.status !== 'ok' || !result.list) {
return reject({
result: result,
message: result.message
});
}
let data = result.list;
cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
return resolve(data);
}, function (err) {
this.reject({
result: err,
message: '動画一覧の取得失敗(2)'
});
});
});
},
});
return UploadedVideoApiLoader;
})();
if (ZenzaWatch) {
ZenzaWatch.api.UploadedVideoApiLoader = UploadedVideoApiLoader;
ZenzaWatch.init.UploadedVideoApiLoader = new UploadedVideoApiLoader();
}
class CrossDomainGate extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
_.assign(CrossDomainGate.prototype, {
initialize: function (params) {
this._baseUrl = params.baseUrl;
this._origin = params.origin || location.href;
this._type = params.type;
this._suffix = params.suffix || '';
this._messager = params.messager || WindowMessageEmitter;
this._sessions = {};
this._initializeStatus = '';
},
_initializeFrame: function () {
switch (this._initializeStatus) {
case 'done':
return new Promise(resolve => {
setTimeout(resolve, 0);
});
case 'initializing':
return new Promise((resolve, reject) => {
this.on('initialize', e => {
if (e.status === 'ok') {
resolve();
} else {
reject(e);
}
});
});
case '': {
this._initializeStatus = 'initializing';
let initialPromise;
initialPromise = new Promise((resolve, reject) => {
this._sessions.initial = {
promise: initialPromise,
resolve: resolve,
reject: reject
};
window.setTimeout(() => {
if (this._initializeStatus !== 'done') {
let rej = {
status: 'fail',
message: `CrossDomainGate初期化タイムアウト (${this._type})`
};
reject(rej);
this.emit('initialize', rej);
}
}, 60 * 1000);
this._initializeCrossDomainGate();
});
return initialPromise;
}
}
},
_initializeCrossDomainGate: function () {
this._initializeCrossDomainGate = _.noop;
this._messager.on('onMessage', this._onMessage.bind(this));
console.log('%c initialize ' + this._type, 'background: lightgreen;');
let loaderFrame = document.createElement('iframe');
loaderFrame.referrerPolicy = 'origin';
loaderFrame.sandbox = 'allow-scripts allow-same-origin';
loaderFrame.lazyload = 'off';
loaderFrame.name = `${this._type}Loader${this._suffix ? `#${this._suffix}` : ''}`;
loaderFrame.className = 'xDomainLoaderFrame ' + this._type;
loaderFrame.style.cssText = `
position: fixed; left: -100vw; pointer-events: none;user-select: none;`;
document.body.appendChild(loaderFrame);
this._loaderWindow = loaderFrame.contentWindow;
this._messager.addKnownSource(this._loaderWindow);
this._loaderWindow.location.replace(this._baseUrl + '#' + TOKEN);
},
_onMessage: function (data, type) {
if (type !== this._type) {
return;
}
let info = data.message;
let token = info.token;
let sessionId = info.sessionId;
let status = info.status;
let command = info.command || 'loadUrl';
let session = this._sessions[sessionId];
if (status === 'initialized') {
this._initializeStatus = 'done';
this._sessions.initial.resolve();
this.emitAsync('initialize', {status: 'ok'});
this._postMessage({command: 'ok'});
return;
}
if (token !== TOKEN) {
window.console.log('invalid token:', token, TOKEN);
return;
}
switch (command) {
case 'dumpConfig':
this._onDumpConfig(info.body);
break;
default:
if (!session) {
return;
}
if (status === 'ok') {
session.resolve(info.body);
}
else {
session.reject({message: status});
}
session = null;
delete this._sessions[sessionId];
break;
}
},
load: function (url, options) {
return this._postMessage({
command: 'loadUrl',
url: url,
options: options
}, true);
},
ajax: function (options) {
let url = options.url;
return this.load(url, options).then(result => {
ZenzaWatch.debug.lastCrossDomainAjaxResult = result;
try {
let dataType = (options.dataType || '').toLowerCase();
switch (dataType) {
case 'json':
return Promise.resolve(JSON.parse(result));
case 'xml':
return Promise.resolve(new DOMParser().parseFromString(result, 'text/xml'));
}
return Promise.resolve(result);
} catch (e) {
return Promise.reject({
status: 'fail',
message: 'パース失敗',
error: e
});
}
});
},
videoCapture: function (src, sec) {
return this._postMessage({
command: 'videoCapture',
src,
sec
}, true);
},
_fetch: function (url, options) {
return this._postMessage({
command: 'fetch',
url: url,
options: options
}, true);
},
fetch: function (url, options) {
return this._fetch(url, options).then((text) => {
ZenzaWatch.debug.lastCrossDomainFetchResult = text;
return Promise.resolve({
text: () => {
return new Promise(res => {
return res(text);
});
},
json: () => {
return new Promise(res => {
return res(JSON.parse(text));
});
},
xml: () => {
return new Promise(res => {
return res(new DOMParser().parseFromString(text, 'text/xml'));
});
}
});
});
},
configBridge: function (config) {
let keys = config.getKeys();
this._config = config;
return new Promise((resolve, reject) => {
this._configBridgeResolve = resolve;
this._configBridgeReject = reject;
this._postMessage({
url: '',
command: 'dumpConfig',
keys: keys
});
});
},
_postMessage: function (message, needPromise) {
return new Promise((resolve, reject) => {
message.sessionId = this._type + '_' + Math.random();
message.token = TOKEN;
if (needPromise) {
this._sessions[message.sessionId] = {
resolve: resolve,
reject: reject
};
}
return this._initializeFrame().then(() => {
try {
this._loaderWindow.postMessage(
JSON.stringify(message),
this._origin
);
} catch (e) {
console.log('%cException!', 'background: red;', e);
}
});
});
},
postMessage: function(...args) {
return this._postMessage(...args);
},
sendCommandPacket: function(packet) {
return this._postMessage({command: 'commandPacket', token: TOKEN, packet});
},
_onDumpConfig: function (configData) {
_.each(Object.keys(configData), (key) => {
this._config.setValue(key, configData[key]);
});
if (!location.host.match(/^[a-z0-9]*\.nicovideo\.jp$/) &&
!this._config.getValue('allowOtherDomain')) {
window.console.log('allowOtherDomain', this._config.getValue('allowOtherDomain'));
this._configBridgeReject();
return;
}
this._config.on('update', (key, value) => {
if (key === 'autoCloseFullScreen') {
return;
}
this._postMessage({
command: 'saveConfig',
key: key,
value: value
});
});
this._configBridgeResolve();
},
pushHistory: function (path, title) {
const sessionId = this._type + '_' + Math.random();
this._initializeFrame().then(() => {
try {
this._loaderWindow.postMessage(JSON.stringify({
sessionId: sessionId,
command: 'pushHistory',
token: TOKEN,
path: path,
title: title || ''
}),
this._origin);
} catch (e) {
console.log('%cException!', 'background: red;', e);
}
});
},
});
let NicoVideoApi = {};
if (location.host !== 'www.nicovideo.jp') {
NicoVideoApi = new CrossDomainGate({
baseUrl: location.protocol + '//www.nicovideo.jp/favicon.ico',
origin: location.protocol + '//www.nicovideo.jp/',
type: 'nicovideoApi',
suffix: location.href,
messager: WindowMessageEmitter
});
}
const IchibaLoader = (() => {
let callbackId = 0;
const load = (watchId) => {
return new Promise((resolve, reject) => {
const country = 'ja-jp';
const api = '//ichiba.nicovideo.jp/embed/zero/show_ichiba';
const sc = document.createElement('script');
let timeoutTimer = null;
const funcName = (() => {
const funcName = `zenza_callback_${callbackId++}`;
window[funcName] = (ichibaData) => {
//window.console.info(ichibaData);
window.clearTimeout(timeoutTimer);
timeoutTimer = null;
sc.remove();
delete window[funcName];
resolve(ichibaData);
};
return funcName;
})();
timeoutTimer = window.setTimeout(() => {
sc.remove();
delete window[funcName];
if (timeoutTimer) {
reject(new Error('ichiba timeout'));
}
}, 30000);
const url = `${api}?v=${watchId}&country=${country}&ch=&is_adult=1&rev=20120220&callback=${funcName}`;
sc.src = url;
document.body.appendChild(sc);
});
};
return {
load
};
})();
const PlaybackPosition = (function () {
const record = (watchId, playbackPosition, csrfToken) => {
const url = 'https://flapi.nicovideo.jp/api/record_current_playback_position';
const body =
`watch_id=${watchId}&playback_position=${playbackPosition}&csrf_token=${csrfToken}`;
return util.fetch(url, {
method: 'POST',
credentials: 'include',
headers: {
'Content-Type': 'application/x-www-form-urlencoded'
},
body
});
};
return {
record
};
})();
// typoじゃなくて変なブロッカーと干渉しないために名前を変えている
const UaaLoader = (() => {
const load = (videoId, {limit = 50} = {}) => {
const url = `https://api.nicoad.nicovideo.jp/v1/contents/video/${videoId}/thanks?limit=${limit}`;
return util
.fetch(url, {credentials: 'include'})
.then(res => {
return res.json();
});
};
return {
load
};
})();
const RecommendAPILoader = (() => {
const load = ({videoId}) => {
const recipe = btoa(JSON.stringify({
id: 'video_playlist_common', videoId
}));
const url = `https://nvapi.nicovideo.jp/v1/recommend?recipe=${recipe}&site=nicovideo&_frontendId=6&_frontendVersion=0`;
return util
.fetch(url, {credentials: 'include'})
.then(res => res.json())
.then(res => {
if (!res.meta || res.meta.status !== 200) {
window.console.warn('load recommend fail', res);
throw new Error('load recommend fail');
}
return res.data;
});
};
return {
load
};
})();
const NicoRssLoader = (() => {
/**
*
* @param item
* @returns {{
* _format: string,
* id: string,
* uniq_id: string,
* title: string,
* length_seconds: number,
* num_res: number,
* mylist_counter: number,
* view_counter: number,
* thumbnail_url: string,
* description: string
* }}
*/
const parseItem = item => {
const id = item.querySelector('link').textContent.replace(/^.+\//, '');
const guid = item.querySelector('guid').textContent;
const desc = new DOMParser().parseFromString(item.querySelector('description').textContent, 'text/html');
const [min, sec] = desc.querySelector('.nico-info-length').textContent.split(':');
const dt = guid.match(/,([\d]+-[\d]+-[\d]+):/)[1];
const tm = desc.querySelector('.nico-info-date').textContent.replace(/[：]/g, ':').match(/([\d]+:[\d]+:[\d]+)/)[0];
const date = new Date(`${dt} ${tm}`);
const result = {
_format: 'nicorss',
id,
uniq_id: guid.replace(/^.+\//, ''),
title: item.querySelector('title').textContent,
length_seconds: min * 60 + sec * 1,
thumbnail_url: desc.querySelector('.nico-thumbnail img').src,
first_retrieve: util.dateToString(date),
description: desc.querySelector('.nico-description').textContent
};
if (desc.querySelector('.nico-info-total-res')) {
Object.assign(result, {
num_res: parseInt(desc.querySelector('.nico-info-total-res').textContent.replace(/,/g, ''), 10),
mylist_counter: parseInt(desc.querySelector('.nico-info-total-mylist').textContent.replace(/,/g, ''), 10),
view_counter: parseInt(desc.querySelector('.nico-info-total-view').textContent.replace(/,/g, ''), 10)
});
}
return result;
};
const load = (url) => {
return fetch(url).then(r => r.text()).then(rssText => {
const xml = new DOMParser().parseFromString(rssText, 'application/xml');
const items = Array.from(xml.querySelectorAll('item')).map(i => parseItem(i));
return items;
});
};
/**
*
* @param {string} category
* @param {'ja-jp'|'en-us'|'zh-tw'} lang
* @param {'hourly'|'daily'||'weekly'|'monthly'|'total'} span
* @param {'fav'|'view'|'res'|'mylist'} type
* @returns ItemData[]
*/
const loadRanking = ({category = 'all', lang= 'ja-jp', span = 'hourly', type='fav'}) => {
const url = `//www.nicovideo.jp/ranking/${type}/${span}/${category}?rss=2.0&lang=${lang}`;
return load(url);
};
return {
load,
loadRanking
};
})();
const NVWatchCaller = (() => {
const FRONT_ID = '6';
const FRONT_VER = '0'
const call = (trackingId) => {
const url = `https://nvapi.nicovideo.jp/v1/2ab0cbaa/watch?t=${encodeURIComponent(trackingId)}`;//&_frontendId=${FRONT_ID}`;
return util
.fetch(url, {
mode: 'cors',
credentials: 'include',
timeout: 5000,
headers: {
'X-Frontend-Id': FRONT_ID,
'X-Frontend-Version': FRONT_VER
}
})
.catch(e => {
console.warn('nvlog fail', e);
});
};
return {
call
};
})();
return {
VideoInfoLoader,
ThumbInfoLoader,
MylistApiLoader,
UploadedVideoApiLoader,
CacheStorage,
CrossDomainGate,
IchibaLoader,
UaaLoader,
PlaybackPosition,
NicoVideoApi,
NicoRssLoader,
RecommendAPILoader,
NVWatchCaller
};
})();

//
class DmcInfo {
constructor(rawData) {
this._rawData = rawData;
this._session = rawData.session_api;
}
get apiUrl() {
return this._session.urls[0].url;
}
get urls() {
return this._session.urls;
}
get audios() {
return this._session.audios;
}
get videos() {
return this._session.videos;
}
get quality() {
return this._rawData.quality;
}
get signature() {
return this._session.signature;
}
get token() {
return this._session.token;
}
get serviceUserId() {
return this._session.service_user_id;
}
get contentId() {
return this._session.content_id;
}
get playerId() {
return this._session.player_id;
}
get recipeId() {
return this._session.recipe_id;
}
get heartBeatLifeTimeMs() {
return this._session.heartbeat_lifetime;
}
get protocols() {
return this._session.protocols;
}
get contentKeyTimeout() {
return this._session.content_key_timeout;
}
get priority() {
return this._session.priority;
}
get authTypes() {
return this._session.auth_types;
}
get videoFormatList() {
return (this.videos || []).concat();
}
get hasStoryboard() {
return !!this._rawData.storyboard_session_api;
}
get storyboardInfo() {
return this._rawData.storyboard_session_api;
}
get transferPreset() {
return (this._session.transfer_presets || [''])[0] || '';
}
get heartbeatLifeTime() {
return this._session.heartbeat_lifetime || 120 * 1000;
}
get importVersion() {
return this._rawData.import_version || 0;
}
get trackingId() {
return this._rawData.tracking_id || '';
}
get encryption() {
return this._rawData.encryption || null;
}
}
class VideoFilter {
constructor(ngOwner, ngTag) {
this.ngOwner = ngOwner;
this.ngTag = ngTag;
}
get ngOwner() {
return this._ngOwner || [];
}
set ngOwner(owner) {
owner = _.isArray(owner) ? owner : owner.toString().split(/[\r\n]/);
let list = [];
owner.forEach(o => {
list.push(o.replace(/#.*$/, '').trim());
});
this._ngOwner = list;
}
get ngTag() {
return this._ngTag || [];
}
set ngTag(tag) {
tag = Array.isArray(tag) ? tag : tag.toString().split(/[\r\n]/);
const list = [];
tag.forEach(t => {
list.push(t.toLowerCase().trim());
});
this._ngTag = list;
}
isNgVideo(videoInfo) {
let isNg = false;
let isChannel = videoInfo.isChannel;
let ngTag = this.ngTag;
videoInfo.tagList.forEach(tag => {
let text = (tag.tag || '').toLowerCase();
if (ngTag.includes(text)) {
isNg = true;
}
});
if (isNg) {
return true;
}
let owner = videoInfo.owner;
let ownerId = isChannel ? ('ch' + owner.id) : owner.id;
if (ownerId && this.ngOwner.includes(ownerId)) {
isNg = true;
}
return isNg;
}
}
class VideoInfoModel {
constructor(videoInfoData) {
this._update(videoInfoData);
this._currentVideoPromise = [];
}
update(videoInfoModel) {
this._update(videoInfoModel._rawData);
return true;
}
_update(info) {
this._rawData = info;
this._watchApiData = info.watchApiData;
this._videoDetail = info.watchApiData.videoDetail;
this._flashvars = info.watchApiData.flashvars; // flashに渡す情報
this._viewerInfo = info.viewerInfo; // 閲覧者(＝おまいら)の情報
this._flvInfo = info.flvInfo;
this._msgInfo = info.msgInfo;
this._dmcInfo = (info.dmcInfo && info.dmcInfo.session_api) ? new DmcInfo(info.dmcInfo) : null;
this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画
this._playlistToken = info.playlistToken;
this._watchAuthKey = info.watchAuthKey;
this._seekToken = info.seekToken;
this._resumeInfo = info.resumeInfo || {};
return true;
}
get title() {
return this._videoDetail.title_original || this._videoDetail.title;
}
get description() {
return this._videoDetail.description || '';
}
/**
* マイリスト等がリンクになっていない物
*/
get descriptionOriginal() {
return this._videoDetail.description_original;
}
get postedAt() {
return this._videoDetail.postedAt;
}
get thumbnail() {
return this._videoDetail.thumbnail;
}
/**
* 大きいサムネがあればそっちを返す
*/
get betterThumbnail() {
return this._rawData.thumbnail;
}
get videoUrl() {
return (this._flvInfo.url || '');//.replace(/^http:/, '');
}
get storyboardUrl() {
let url = this._flvInfo.url;
if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
return null;
}
return url;
}
/**
* @return Promise
*/
getCurrentVideo() {
if (this._currentVideo) {
return Promise.resolve(this._currentVideo);
}
return new Promise((resolve, reject) => {
this._currentVideoPromise.push({resolve, reject});
});
}
setCurrentVideo(v) {
this._currentVideo = v;
this._currentVideoPromise.forEach(p => {
p.resolve(this._currentVideo);
});
}
get isEconomy() {
return this.videoUrl.match(/low$/) ? true : false;
}
get tagList() {
return this._videoDetail.tagList;
}
getVideoId() { // sm12345
return this.videoId;
}
get videoId() {
return this._videoDetail.id;
}
get originalVideoId() {
return (this.isMymemory || this.isCommunityVideo) ? this.videoId : ''
}
getWatchId() { // sm12345だったりスレッドIDだったり
return this.watchId;
}
get watchId() {
if (this.videoId.substring(0, 2) === 'so') {
return this.videoId;
}
return this._videoDetail.v;
}
get contextWatchId() {
return this._videoDetail.v;
}
get watchUrl() {
return `https://www.nicovideo.jp/watch/${this.watchId}`;
}
get threadId() { // watchIdと同一とは限らない
return this._videoDetail.thread_id;
}
get videoSize() {
return {
width: this._videoDetail.width,
height: this._videoDetail.height
};
}
get duration() {
return this._videoDetail.length;
}
get count() {
const vd = this._videoDetail;
return {
comment: vd.commentCount,
mylist: vd.mylistCount,
view: vd.viewCount
};
}
get isChannel() {
return !!this._videoDetail.channelId;
}
get isMymemory() {
return !!this._videoDetail.isMymemory;
}
get isCommunityVideo() {
return !!(!this.isChannel && this._videoDetail.communityId);
}
get hasParentVideo() {
return !!(this._videoDetail.commons_tree_exists);
}
get isDmc() {
return this.isDmcOnly || (this._rawData.isDmc);
}
get isDmcAvailable() {
return this._rawData.isDmc;
}
get dmcInfo() {
return this._dmcInfo;
}
get msgInfo() {
return this._msgInfo;
}
get isDmcOnly() {
return !!this._rawData.isDmcOnly || !this.videoUrl;
}
get hasDmcStoryboard() {
return this._dmcInfo && this._dmcInfo.hasStoryboard;
}
get dmcStoryboardInfo() {
return !!this._dmcInfo ? this._dmcInfo.storyboardInfo : null;
}
/**
* 投稿者の情報
* チャンネル動画かどうかで分岐
*/
get owner() {
let ownerInfo;
if (this.isChannel) {
let c = this._watchApiData.channelInfo || {};
ownerInfo = {
icon: c.icon_url || 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank.jpg',
url: '//ch.nicovideo.jp/ch' + c.id,
id: c.id,
linkId: c.id ? `ch${c.id}` : '',
name: c.name,
favorite: c.is_favorited === 1, // こっちは01で
type: 'channel'
};
} else {
// 退会しているユーザーだと空になっている
let u = this._watchApiData.uploaderInfo || {};
let f = this._flashvars || {};
ownerInfo = {
icon: u.icon_url || 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank.jpg',
url: u.id ? ('//www.nicovideo.jp/user/' + u.id) : '#',
id: u.id || f.videoUserId || '',
linkId: u.id ? `user/${u.id}` : '',
name: u.nickname || '(非公開ユーザー)',
favorite: !!u.is_favorited, // こっちはbooleanという
type: 'user',
isMyVideoPublic: !!u.is_user_myvideo_public
};
}
return ownerInfo;
}
get relatedVideoItems() {
return this._relatedVideo.playlist || [];
}
get replacementWords() {
if (!this._flvInfo.ng_up || this._flvInfo.ng_up === '') {
return null;
}
return util.parseQuery(
this._flvInfo.ng_up || ''
);
}
get playlistToken() {
return this._playlistToken;
}
set playlistToken(v) {
this._playlistToken = v;
}
get watchAuthKey() {
return this._watchAuthKey;
}
set watchAuthKey(v) {
this._watchAuthKey = v;
}
get seekToken() {
return this._seekToken;
}
get width() {
return parseInt(this._videoDetail.width, 10);
}
get height() {
return parseInt(this._videoDetail.height, 10);
}
get initialPlaybackTime() {
if (!this._resumeInfo || !this._resumeInfo.initialPlaybackPosition) {
return 0;
}
return parseFloat(this._resumeInfo.initialPlaybackPosition, 10);
}
get csrfToken() {
return this._rawData.csrfToken || '';
}
get extension() {
if (this.isDmc) {
return 'mp4';
}
const url = this.videoUrl;
if (url.match(/smile\?m=/)) {
return 'mp4';
}
if (url.match(/smile\?v=/)) {
return 'flv';
}
if (url.match(/smile\?s=/)) {
return 'swf';
}
return 'unknown';
}
get community() {
return this._rawData.community || null;
}
get maybeBetterQualityServerType() {
if (this.isDmcOnly) {
return 'dmc';
}
if (this.isEconomy) {
return 'dmc';
}
let dmcInfo = this.dmcInfo;
if (!dmcInfo) {
return 'smile';
}
if (/smile\?[sv]=/.test(this.videoUrl)) {
return 'dmc';
}
let smileWidth = this.width;
let smileHeight = this.height;
let dmcVideos = dmcInfo.videos;
let importVersion = dmcInfo.importVersion;
// ぜんぜんわからん 時はdmc
if (isNaN(smileWidth) || isNaN(smileHeight)) {
return 'dmc';
}
// smile側に 1280w 720h を上回る動画がある場合は再エンコードされていない
// smile側の再エンコードでは1280x720以下の動画しか生成されないため
if (smileWidth > 1280 || smileHeight > 720) {
return 'smile';
}
if (importVersion > 0) {
return 'smile';
}
// smileのほうがdmcの下限以下を持っている ≒ 再エンコードされていない
if (smileHeight < 360) {
return 'smile';
}
const highestDmc = Math.max(...dmcVideos.map(v => {
return (/_([0-9]+)p$/.exec(v)[1] || '') * 1;
}));
if (highestDmc >= 720) {
return 'dmc';
}
// 864x486 648x486 640x384 512x384 旧プレイヤーぴったい合わせの解像度
if (smileHeight === 486 || smileHeight === 384) {
return 'smile';
}
// DMCのほうが高解像度を持っているなら恐らくDMC側が高画質
if (highestDmc >= smileHeight) {
return 'dmc';
}
// それ以外はsmile...と行きたいが判断保留は dmc
return 'dmc';
}
}

const {NicoSearchApiV2Query, NicoSearchApiV2Loader} =
(function () {
// 参考: http://site.nicovideo.jp/search-api-docs/search.html
// http://ch.nicovideo.jp/nico-lab/blomaga/ar930955
const BASE_URL = `https://api.search.nicovideo.jp/api/v2/`;
const API_BASE_URL = `${BASE_URL}/video/contents/search`;
const MESSAGE_ORIGIN = `https://api.search.nicovideo.jp/`;
const SORT = {
f: 'startTime',
v: 'viewCounter',
r: 'commentCounter',
m: 'mylistCounter',
l: 'lengthSeconds',
n: 'lastCommentTime',
// v1からの推測で見つけたけどドキュメントにはのってないやつ
h: '_hotMylistCounter', // 人気が高い順
'_hot': '_hotMylistCounter', // 人気が高い順(↑と同じだけど互換用に残ってる)
'_popular': '_popular', // 並び順指定なしらしい
};
// 公式検索の日時指定パラメータ -1h -24h -1w -1m
const F_RANGE = {
U_1H: 4,
U_24H: 1,
U_1W: 2,
U_30D: 3
};
// 公式検索の動画長指定パラメータ -5min 20min-
const L_RANGE = {
U_5MIN: 1,
O_20MIN: 2
};
let gate;
// なぜかv2はCORSがついてないのでCrossDomainGateの力を借りる
let initializeCrossDomainGate = function () {
initializeCrossDomainGate = function () {
};
gate = new CrossDomainGate({
baseUrl: BASE_URL,
origin: MESSAGE_ORIGIN,
type: 'searchApi',
messager: WindowMessageEmitter
});
};
/**
* 公式検索ページのqueryパラメータをv2用に変換するやつ＋α
*/
class NicoSearchApiV2Query {
constructor(word, params = {}) {
if (word.searchWord) {
this._initialize(word.searchWord, word);
} else {
this._initialize(word, params);
}
}
get q() {
return this._q;
}
get targets() {
return this._targets;
}
get sort() {
return this._sort;
}
get order() {
return this._order;
}
get limit() {
return this._limit;
}
get offset() {
return this._offset;
}
get fields() {
return this._fields;
}
get context() {
return this._context;
}
get hotField() {
return this._hotField;
}
get hotFrom() {
return this._hotFrom;
}
get hotTo() {
return this._hotTo;
}
_initialize(word, params) {
if (params._now) {
this.now = params._now;
}
const sortTable = SORT;
this._filters = [];
this._q = word || params.searchWord || 'ZenzaWatch';
this._targets =
params.searchType === 'tag' ?
['tagsExact'] : ['tagsExact', 'title', 'description'];
this._sort =
(params.order === 'd' ? '-' : '+') +
(params.sort && sortTable[params.sort] ?
sortTable[params.sort] : 'lastCommentTime');
this._order = params.order === 'd' ? 'desc' : 'asc';
this._limit = 100;
this._offset = Math.min(
params.page ? Math.max(parseInt(params.page, 10) - 1, 0) * 25 : 0,
1600
);
this._fields = [
'contentId', 'title', 'description', 'tags', 'categoryTags',
'viewCounter', 'commentCounter', 'mylistCounter', 'lengthSeconds',
'startTime', 'thumbnailUrl',
// 公式ドキュメントからは消えてるけど指定できた
'lengthSeconds', 'lastResBody'
];
this._context = 'ZenzaWatch';
const n = new Date(), now = this.now;
if (/^._hot/.test(this.sort)) {
// 人気が高い順ソート
(() => {
this._hotField = 'mylistCounter';
this._hotFrom = new Date(now - 1 * 24 * 60 * 60 * 1000);
this._hotTo = n;
this._sort = '-_hotMylistCounter';
})();
}
if (params.f_range &&
[F_RANGE.U_1H, F_RANGE.U_24H, F_RANGE.U_1W, F_RANGE.U_30D]
.includes(params.f_range * 1)) {
this._filters.push(this._buildFRangeFilter(params.f_range * 1));
}
if (params.l_range &&
[L_RANGE.U_5MIN, L_RANGE.O_20MIN].includes(params.l_range * 1)) {
this._filters.push(this._buildLRangeFilter(params.l_range * 1));
}
if (params.userId && (params.userId + '').match(/^\d+$/)) {
this._filters.push({type: 'equal', field: 'userId', value: params.userId * 1});
}
if (params.channelId && (params.channelId + '').match(/^\d+$/)) {
this._filters.push({type: 'equal', field: 'channelId', value: params.channelId * 1});
}
if (params.commentCount && (params.commentCount + '').match(/^[0-9]+$/)) {
this._filters.push({
type: 'range',
field: 'commentCounter',
from: params.commentCount * 1
});
}
if (params.utimeFrom || params.utimeTo) {
this._filters.push(this._buildStartTimeRangeFilter({
from: params.utimeFrom ? params.utimeFrom * 1 : 0,
to: params.utimeTo ? params.utimeTo * 1 : now
}));
}
if (params.dateFrom || params.dateTo) {
this._filters.push(this._buildStartTimeRangeFilter({
from: params.dateFrom ? (new Date(params.dateFrom)).getTime() : 0,
to: params.dateTo ? (new Date(params.dateTo)).getTime() : now
}));
}
// 公式検索ページの日付指定
const dateReg = /^\d{4}-\d{2}-\d{2}$/;
if (dateReg.test(params.start) && dateReg.test(params.end)) {
this._filters.push(this._buildStartTimeRangeFilter({
from: (new Date(params.start)).getTime(),
to: (new Date(params.end)).getTime()
}));
}
}
get stringfiedFilters() {
if (this._filters.length < 1) {
return '';
}
const result = [];
const TIMEFIELDS = ['startTime'];
this._filters.forEach((filter) => {
let isTimeField = TIMEFIELDS.includes(filter.field);
if (!filter) {
return;
}
if (filter.type === 'equal') {
result.push(`filters[${filter.field}][0]=${filter.value}`);
} else if (filter.type === 'range') {
let from = isTimeField ? this._formatDate(filter.from) : filter.from;
if (filter.from) {
result.push(`filters[${filter.field}][gte]=${from}`);
}
if (filter.to) {
let to = isTimeField ? this._formatDate(filter.to) : filter.to;
result.push(`filters[${filter.field}][lte]=${to}`);
}
}
});
return result.join('&');
}
get filters() {
return this._filters;
}
_formatDate(time) {
const dt = new Date(time);
return dt.toISOString().replace(/\.\d*Z/, '') + '%2b00:00'; // '%2b00:00'
}
_buildStartTimeRangeFilter({from = 0, to}) {
const range = {field: 'startTime', type: 'range'};
if (from !== undefined && to !== undefined) {
[from, to] = [from, to].sort(); // from < to になるように
}
if (from !== undefined) {
range.from = from;
}
if (to !== undefined) {
range.to = to;
}
return range;
}
_buildLengthSecondsRangeFilter({from, to}) {
const range = {field: 'lengthSeconds', type: 'range'};
if (from !== undefined && to !== undefined) {
[from, to] = [from, to].sort(); // from < to になるように
}
if (from !== undefined) {
range.from = from;
}
if (to !== undefined) {
range.to = to;
}
return range;
}
_buildFRangeFilter(range) {
const now = this.now;
switch (range * 1) {
case F_RANGE.U_1H:
return this._buildStartTimeRangeFilter({
from: now - 1000 * 60 * 60,
to: now
});
case F_RANGE.U_24H:
return this._buildStartTimeRangeFilter({
from: now - 1000 * 60 * 60 * 24,
to: now
});
case F_RANGE.U_1W:
return this._buildStartTimeRangeFilter({
from: now - 1000 * 60 * 60 * 24 * 7,
to: now
});
case F_RANGE.U_30D:
return this._buildStartTimeRangeFilter({
from: now - 1000 * 60 * 60 * 24 * 30,
to: now
});
default:
return null;
}
}
_buildLRangeFilter(range) {
switch (range) {
case L_RANGE.U_5MIN:
return this._buildLengthSecondsRangeFilter({
from: 0,
to: 60 * 5
});
case L_RANGE.O_20MIN:
return this._buildLengthSecondsRangeFilter({
from: 60 * 20
});
}
}
toString() {
const result = [];
result.push('q=' + encodeURIComponent(this._q));
result.push('targets=' + this.targets.join(','));
result.push('fields=' + this.fields.join(','));
result.push('_sort=' + encodeURIComponent(this.sort));
result.push('_limit=' + this.limit);
result.push('_offset=' + this.offset);
result.push('_context=' + this.context);
if (this.sort === '-_hot') {
result.push('hotField=' + this.hotField);
result.push('hotFrom=' + this.hotFrom);
result.push('hotTo=' + this.hotTo);
}
const filters = this.stringfiedFilters;
if (filters) {
result.push(filters);
}
return result.join('&');
}
set now(v) {
this._now = v;
}
get now() {
return this._now || Date.now();
}
}
NicoSearchApiV2Query.SORT = SORT;
NicoSearchApiV2Query.F_RANGE = F_RANGE;
NicoSearchApiV2Query.L_RANGE = L_RANGE;
class NicoSearchApiV2Loader {
static async search(word, params) {
initializeCrossDomainGate();
const query = new NicoSearchApiV2Query(word, params);
const url = API_BASE_URL + '?' + query.toString();
return gate.fetch(url).then(result => {
return result.text();
}).then(result => {
result = NicoSearchApiV2Loader.parseResult(result);
if (typeof result !== 'number' && result.status === 'ok') {
return Promise.resolve(result);
} else {
let description;
switch (result) {
default:
description = 'UNKNOWN ERROR';
break;
case 400:
description = 'INVALID QUERY';
break;
case 500:
description = 'INTERNAL SERVER ERROR';
break;
case 503:
description = 'MAINTENANCE';
break;
}
return Promise.reject({
status: 'fail',
description
});
}
});
}
/**
* 100件以上検索する用
*/
static async searchMore(word, params, maxLimit = 300) {
const ONCE_LIMIT = 100; // 一回で取れる件数
const PER_PAGE = 25; // 検索ページで1ページあたりに表示される件数
const MAX_PAGE = 64; // 25 * 64 = 1600
const result = await NicoSearchApiV2Loader.search(word, params);
const currentPage = params.page ? parseInt(params.page, 10) : 1;
const currentOffset = (currentPage - 1) * PER_PAGE;
if (result.count <= ONCE_LIMIT) {
return result;
}
const searchCount = Math.min(
Math.ceil((result.count - currentOffset) / PER_PAGE) - 1,
Math.ceil((maxLimit - ONCE_LIMIT) / ONCE_LIMIT)
);
//// TODO: 途中で失敗したらそこまででもいいので返す？
for (let i = 1; i <= searchCount; i++) {
await util.sleep(300 * i);
let page = currentPage + i * (ONCE_LIMIT / PER_PAGE);
console.log('searchNext: "%s"', word, page, params);
let res = await NicoSearchApiV2Loader.search(word, Object.assign(params, {page}));
if (res && res.list && res.list.length) {
result.list = result.list.concat(res.list);
} else {
break;
}
}
return result;
}
static _jsonParse(result) {
try {
return JSON.parse(result);
} catch (e) {
window.console.error('JSON parse error', e);
return null;
}
}
static parseResult(jsonText) {
const data = NicoSearchApiV2Loader._jsonParse(jsonText);
if (!data) {
return 0;
}
const status = data.meta.status;
const result = {
status: status === 200 ? 'ok' : 'fail',
count: data.meta.totalCount,
list: []
};
if (status !== 200) {
return status;
}
const midThumbnailThreshold = 23608629; // .Mのついた最小ID?
data.data.forEach(item => {
let description = item.description ? item.description.replace(/<.*?>/g, '') : '';
if (item.thumbnailUrl.indexOf('.M') >= 0) {
item.thumbnail_url = item.thumbnail_url.replace(/\.M$/, '');
item.is_middle_thumbnail = true;
} else if (item.thumbnailUrl.indexOf('.M') < 0 &&
item.contentId.indexOf('sm') === 0) {
let _id = parseInt(item.contentId.substring(2), 10);
if (_id >= midThumbnailThreshold) {
item.is_middle_thumbnail = true;
}
}
const dt = util.dateToString(new Date(item.startTime));
result.list.push({
id: item.contentId,
type: 0, // 0 = VIDEO,
length: item.lengthSeconds ?
Math.floor(item.lengthSeconds / 60) + ':' +
(item.lengthSeconds % 60 + 100).toString().substring(1) : '',
mylist_counter: item.mylistCounter,
view_counter: item.viewCounter,
num_res: item.commentCounter,
first_retrieve: dt,
create_time: dt,
thumbnail_url: item.thumbnailUrl,
title: item.title,
description_short: description.substring(0, 150),
description_full: description,
length_seconds: item.lengthSeconds,
//last_res_body: item.lastResBody,
is_middle_thumbnail: item.is_middle_thumbnail
});
});
return result;
}
}
return {NicoSearchApiV2Query, NicoSearchApiV2Loader};
})();

class TagEditApi {
load(videoId) {
const url = `/tag_edit/${videoId}/?res_type=json&cmd=tags&_=${Date.now()}`;
return this._fetch(url, {credentials: 'include'});
}
add({videoId, tag, csrfToken, watchAuthKey, ownerLock = 0}) {
const url = `/tag_edit/${videoId}/`;
const body = this._buildQuery({
cmd: 'add',
tag,
id: '',
token: csrfToken,
watch_auth_key: watchAuthKey,
owner_lock: ownerLock,
res_type: 'json'
});
const options = {
method: 'POST',
credentials: 'include',
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
body
};
return this._fetch(url, options);
}
remove({videoId, tag = '', id, csrfToken, watchAuthKey, ownerLock = 0}) {
const url = `/tag_edit/${videoId}/`;
const body = this._buildQuery({
cmd: 'remove',
tag, // いらないかも
id,
token: csrfToken,
watch_auth_key: watchAuthKey,
owner_lock: ownerLock,
res_type: 'json'
});
const options = {
method: 'POST',
credentials: 'include',
headers: {'Content-Type': 'application/x-www-form-urlencoded'},
body
};
return this._fetch(url, options);
}
_buildQuery(params) {
const t = [];
Object.keys(params).forEach(key => {
t.push(`${key}=${encodeURIComponent(params[key])}`);
});
return t.join('&');
}
_fetch(url, options) {
return util.fetch(url, options).then(result => {
return result.json();
});
}
}

const SmileStoryboardInfoLoader = (function () {
let reject = function (err) {
return new Promise(function (res, rej) {
window.setTimeout(function () {
rej(err);
}, 0);
});
};
let parseStoryboard = function ($storyboard, url) {
let storyboardId = $storyboard.attr('id') || '1';
return {
id: storyboardId,
url: url.replace('sb=1', 'sb=' + storyboardId),
thumbnail: {
width: $storyboard.find('thumbnail_width').text(),
height: $storyboard.find('thumbnail_height').text(),
number: $storyboard.find('thumbnail_number').text(),
interval: $storyboard.find('thumbnail_interval').text()
},
board: {
rows: $storyboard.find('board_rows').text(),
cols: $storyboard.find('board_cols').text(),
number: $storyboard.find('board_number').text()
}
};
};
let parseXml = function (xml, url) {
let $xml = $(xml), $storyboard = $xml.find('storyboard');
if ($storyboard.length < 1) {
return null;
}
let info = {
format: 'smile',
status: 'ok',
message: '成功',
url: url,
movieId: $xml.find('movie').attr('id'),
duration: $xml.find('duration').text(),
storyboard: []
};
for (let i = 0, len = $storyboard.length; i < len; i++) {
let sbInfo = parseStoryboard($($storyboard[i]), url);
info.storyboard.push(sbInfo);
}
info.storyboard.sort(function (a, b) {
let idA = parseInt(a.id.substr(1), 10), idB = parseInt(b.id.substr(1), 10);
return (idA < idB) ? 1 : -1;
});
return info;
};
let load = function (videoFileUrl) {
let a = document.createElement('a');
a.href = videoFileUrl;
let server = a.host;
let search = a.search;
if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
return reject({status: 'fail', message: 'invalid url', url: videoFileUrl});
}
let fileType = RegExp.$1;
let fileId = RegExp.$2;
let key = RegExp.$3;
if (fileType !== 'm') {
return reject({status: 'fail', message: 'unknown file type', url: videoFileUrl});
}
return new Promise(function (resolve, reject) {
let url = '//' + server + '/smile?m=' + fileId + '.' + key + '&sb=1';
util.fetch(url, {credentials: 'include'})
.then(res => {
return res.text();
})
.then(result => {
const info = parseXml(result, url);
if (info) {
resolve(info);
} else {
reject({
status: 'fail',
message: 'storyboard not exist (1)',
result: result,
url: url
});
}
}).catch(err => {
reject({
status: 'fail',
message: 'storyboard not exist (2)',
result: err,
url: url
});
});
});
};
return {
load
};
})();
ZenzaWatch.api.SmileStoryboardInfoLoader = SmileStoryboardInfoLoader;
const DmcStoryboardInfoLoader = (() => {
const parseStoryboard = function (sb) {
const result = {
id: 0,
urls: [],
quality: sb.quality,
thumbnail: {
width: sb.thumbnail_width,
height: sb.thumbnail_height,
number: null,
interval: sb.interval
},
board: {
rows: sb.rows,
cols: sb.columns,
number: sb.images.length
}
};
sb.images.forEach(image => {
result.urls.push(image.uri);
});
return result;
};
const parseMeta = function (meta) {
const result = {
format: 'dmc',
status: meta.meta.message,
url: null,
movieId: null,
storyboard: []
};
meta.data.storyboards.forEach(sb => {
result.storyboard.unshift(parseStoryboard(sb));
});
// 画質の良い順にソート
result.storyboard.sort((a, b) => {
if (a.quality < b.quality) {
return 1;
}
if (a.quality > b.quality) {
return -1;
}
return 0;
});
return result;
};
const load = function (url) {
return util.fetch(url, {credentials: 'include'})
.then(res => {
return res.json();
})
.then(info => {
if (!info.meta || !info.meta.message || info.meta.message !== 'ok') {
return Promise.reject('storyboard request fail');
}
return parseMeta(info);
});
};
return {
load,
_parseMeta: parseMeta,
_parseStoryboard: parseStoryboard
};
})();
ZenzaWatch.api.DmcStoryboardInfoLoader = DmcStoryboardInfoLoader;
const StoryboardInfoLoader = (() => {
return {
load: function (url) {
if (url.match(/dmc\.nico/)) {
return DmcStoryboardInfoLoader.load(url);
} else {
return SmileStoryboardInfoLoader.load(url);
}
}
};
})();
ZenzaWatch.api.StoryboardInfoLoader = StoryboardInfoLoader;
class StoryboardSession {
constructor(info) {
this._info = info;
this._url = info.urls[0].url;
}
create() {
const url = `${this._url}?_format=json`;
const body = this._createRequestString(this._info);
return util.fetch(url, {
method: 'POST',
credentials: 'include',
headers: {
'Content-Type': 'application/json'
},
body
}).then(res => {
return res.json();
}).catch(err => {
window.console.error('create dmc session fail', err);
return Promise.reject('create dmc session fail');
});
}
_createRequestString(info) {
if (!info) {
info = this._info;
}
// 階層が深くて目が疲れた
const request = {
session: {
client_info: {
player_id: info.player_id
},
content_auth: {
auth_type: info.auth_types.storyboard,
content_key_timeout: info.content_key_timeout,
service_id: 'nicovideo',
service_user_id: info.service_user_id
},
content_id: info.content_id,
content_src_id_sets: [{
content_src_ids: []
}],
content_type: 'video',
content_uri: '',
keep_method: {
heartbeat: {
lifetime: info.heartbeat_lifetime
}
},
priority: info.priority,
protocol: {
name: 'http',
parameters: {
http_parameters: {
parameters: {
storyboard_download_parameters: {
use_well_known_port: info.urls[0].is_well_known_port ? 'yes' : 'no',
use_ssl: info.urls[0].is_ssl ? 'yes' : 'no'
}
}
}
}
},
recipe_id: info.recipe_id,
session_operation_auth: {
session_operation_auth_by_signature: {
signature: info.signature,
token: info.token
}
},
timing_constraint: 'unlimited'
}
};
(info.videos || []).forEach(video => {
request.session.content_src_id_sets[0].content_src_ids.push(video);
});
//window.console.log('storyboard session request', JSON.stringify(request, null, ' '));
return JSON.stringify(request);
}
}

const {ThreadLoader} = (() => {
const VERSION_OLD = '20061206';
const VERSION = '20090904';
const LANG_CODE = {
'en_us': 1,
'zh_tw': 2
};
class ThreadLoader extends Emitter {
constructor() {
super();
this._threadKeys = {};
}
/**
* 動画の長さに応じて取得するコメント数を変える
* 本家よりちょっと盛ってる
*/
getRequestCountByDuration(duration) {
if (duration < 60) { return 100; }
if (duration < 240) { return 200; }
if (duration < 300) { return 400; }
return 1000;
}
getThreadKey(threadId, language = '', options = {}) {
let url = `//flapi.nicovideo.jp/api/getthreadkey?thread=${threadId}`;
let langCode = this.getLangCode(language);
if (langCode) { url = `${url}&language_id=${langCode}`; }
let headers = options.cookie ? {Cookie: options.cookie} : {};
return util.fetch(url, {
method: 'post',
dataType: 'text',
headers,
credentials: 'include'
}).then(res => res.text()).then(e => {
let result = util.parseQuery(e);
this._threadKeys[threadId] = result;
return result;
}).catch(result => {
return Promise.reject({
result: result,
message: `ThreadKeyの取得失敗 ${threadId}`
});
});
}
// getWaybackKey(threadId, language = '', options = {}) {
// let url = `//flapi.nicovideo.jp/api/getwaybackkey?thread=${threadId}`;
// let langCode = this.getLangCode(language);
// if (langCode) { url = `${url}&language_id=${langCode}`; }
//
// let headers = options.cookie ? {Cookie: options.cookie} : {};
// return util.fetch(url, {
// method: 'post',
// dataType: 'text',
// headers,
// credentials: 'include'
// }).then(res => res.text()).then(e => {
// let result = util.parseQuery(e);
// return result;
// }).catch(result => {
// return Promise.reject({
// result: result,
// message: `WaybackKeyの取得失敗 ${threadId} `
// });
// });
// }
getLangCode(language = '') {
language = language.replace('-', '_').toLowerCase();
if (LANG_CODE[language]) {
return LANG_CODE[language];
}
return 0;
}
getPostKey(threadId, blockNo, options = {}) {
let url =
`//flapi.nicovideo.jp/api/getpostkey?device=1&thread=${threadId}&block_no=${blockNo}&version=1&version_sub=2&yugi=`;
console.log('getPostkey url: ', url);
let headers = options.cookie ? {Cookie: options.cookie} : {};
return util.fetch(url, {
method: 'post',
dataType: 'text',
headers,
credentials: 'include'
}).then(res => res.text()).then(e => {
return util.parseQuery(e);
}).catch(result => {
return Promise.reject({
result,
message: `PostKeyの取得失敗 ${threadId}`
});
});
}
buildPacketData(msgInfo, options = {}) {
let packets = [];
const resCount = this.getRequestCountByDuration(msgInfo.duration);
const leafContent = `0-${Math.floor(msgInfo.duration / 60) + 1}:100,${resCount}`;
const language = this.getLangCode(msgInfo.language);
msgInfo.threads.forEach(thread => {
if (!thread.isActive) { return; }
let t = {
thread: thread.id.toString(),
user_id: msgInfo.userId > 0 ? msgInfo.userId.toString() : '', // 0の時は空文字
language,
nicoru: 1,
scores: 1
};
if (thread.isThreadkeyRequired) {
t.threadkey = msgInfo.threadKey[thread.id].key;
t.force_184 = msgInfo.threadKey[thread.id].force184 ? '1' : '0';
}
// if (msgInfo.when > 0 && msgInfo.waybackKey[thread.id]) {
// t.waybackkey = msgInfo.waybackKey[thread.id].key || '';
// }
if (msgInfo.when > 0) {
t.when = msgInfo.when;
}
if (thread.fork) {
t.fork = thread.fork;
}
if (options.resFrom > 0) {
t.res_from = options.resFrom;
}
// threadkeyかwaybackkeyがある場合にuserkeyをつけてしまうとエラー。いらないなら無視すりゃいいだろが
if (!t.threadkey /*&& !t.waybackkey*/ && msgInfo.userKey) {
t.userkey = msgInfo.userKey;
}
if (t.fork || thread.isLeafRequired === false) { // 投稿者コメントなど
packets.push({thread: Object.assign({with_blobal: 1, version: VERSION_OLD, res_from: -1000}, t)});
} else {
packets.push({thread: Object.assign({with_blobal: 1, version: VERSION}, t)});
packets.push({thread_leaves: Object.assign({content: leafContent}, t)});
}
});
return packets;
}
buildPacket(msgInfo, options = {}) {
let packet = document.createElement('packet');
let data = this.buildPacketData(msgInfo);
if (options.format !== 'xml') {
return JSON.stringify(data);
}
data.forEach(d => {
let t = document.createElement(d.thread ? 'thread' : 'thread_leaves');
let thread = d.thread ? d.thread : d.thread_leaves;
Object.keys(thread).forEach(attr => {
if (attr === 'content') {
t.textContent = thread[attr];
return;
}
t.setAttribute(attr, thread[attr]);
});
packet.appendChild(t);
});
return packet.outerHTML;
}
_post(server, body, options = {}) {
let url = server;
return util.fetch(url, {
method: 'POST',
dataType: 'text',
headers: {
'Content-Type': 'text/plain; charset=UTF-8'
},
body: body
}).then(res => {
if (options.format !== 'xml') {
return res.json();
}
return res.text().then(text => {
if (DOMParser) {
return new DOMParser().parseFromString(text, 'application/xml');
}
return (new JSDOM(text)).window.document;
});
}).catch(result => {
return Promise.reject({
result,
message: `コメントの通信失敗 server: ${server}`
});
});
}
_load(msgInfo, options = {}) {
let packet;
let language = msgInfo.language;
msgInfo.threadKey = msgInfo.threadKey || {};
// msgInfo.waybackKey = msgInfo.waybackKey || {};
const loadThreadKey = threadId => {
if (msgInfo.threadKey[threadId]) { return; }
msgInfo.threadKey[threadId] = {};
return this.getThreadKey(threadId, language, options).then(info => {
console.log('threadKey: ', threadId, info);
msgInfo.threadKey[threadId] = {key: info.threadkey, force184: info.force_184};
});
};
const loadThreadKeys = () => {
return Promise.all(msgInfo.threads.filter(t => t.isThreadkeyRequired).map(t => loadThreadKey(t.id)));
};
// const loadWaybackKey = threadId => {
// if (msgInfo.waybackKey[threadId]) { return; }
// msgInfo.waybackKey[threadId] = {};
// return this.getWaybackKey(threadId, language, options).then(info => {
// console.log('waybackKey: ', threadId, info);
// msgInfo.waybackKey[threadId] = {key: info.waybackkey};
// });
// };
// const loadWaybackKeys = () => {
// if (!msgInfo.when) {
// return Promise.resolve();
// }
// return Promise.all(msgInfo.threads.map(t => loadWaybackKey(t.id)));
// };
return Promise.all([loadThreadKeys()/*, loadWaybackKeys()*/]).then(() => {
let format = options.format === 'xml' ? 'xml' : 'json';
let server = format === 'json' ? msgInfo.server.replace('/api/', '/api.json/') : msgInfo.server;
server = server.replace(/^http:/, '');
packet = this.buildPacket(msgInfo, format);
console.log('post packet...', server, packet);
return this._post(server, packet, format);
});
}
load(msgInfo, options = {}) {
const server = msgInfo.server;
const threadId = msgInfo.threadId;
const userId = msgInfo.userId;
const timeKey = `loadComment server: ${server} thread: ${threadId}`;
console.time(timeKey);
const onSuccess = result => {
console.timeEnd(timeKey);
ZenzaWatch.debug.lastMessageServerResult = result;
let format = 'array';
let thread, totalResCount = 0;
let resultCode = null;
try {
let threads = result.filter(t => t.thread).map(t => t.thread);
let lastId = null;
Array.from(threads).forEach(t => {
let id = parseInt(t.thread, 10);
let fork = t.fork || 0;
if (lastId === id || fork) {
return;
}
lastId = id;
msgInfo[id] = thread;
if (parseInt(id, 10) === parseInt(threadId, 10)) {
thread = t;
resultCode = t.resultcode;
}
if (!isNaN(t.last_res) && !fork) { // 投稿者コメントはカウントしない
totalResCount += t.last_res;
}
});
} catch (e) {
console.error(e);
}
if (resultCode !== 0) {
console.log('comment fail:\n', result);
return Promise.reject({
message: `コメント取得失敗[${resultCode}]`
});
}
let last_res = isNaN(thread.last_res) ? 0 : thread.last_res * 1;
let threadInfo = {
server,
userId,
resultCode,
threadId,
thread: thread.thread,
serverTime: thread.server_time,
force184: msgInfo.defaultThread.isThreadkeyRequired ? '1' : '0',
lastRes: last_res,
totalResCount,
blockNo: Math.floor((last_res + 1) / 100),
ticket: thread.ticket || '0',
revision: thread.revision,
language: msgInfo.language,
when: msgInfo.when,
isWaybackMode: !!msgInfo.when
};
msgInfo.threadInfo = threadInfo;
console.log('threadInfo: ', threadInfo);
return Promise.resolve({resultCode, threadInfo, body: result, format});
};
const onFailFinally = e => {
console.timeEnd(timeKey);
window.console.error('loadComment fail finally: ', e);
return Promise.reject({
message: 'コメントサーバーの通信失敗: ' + server
});
};
const onFail1st = e => {
console.timeEnd(timeKey);
window.console.error('loadComment fail 1st: ', e);
PopupMessage.alert('コメントの取得失敗: 3秒後にリトライ');
return new Sleep(3000).then(() => this._load(msgInfo, options).then(onSuccess).catch(onFailFinally));
};
return this._load(msgInfo, options).then(onSuccess).catch(onFail1st);
}
_postChat(threadInfo, postKey, text, cmd, vpos) {
let packet = JSON.stringify([{chat: {
content: text,
mail: cmd || '',
vpos: vpos || 0,
premium: util.isPremium() ? 1 : 0,
postkey: postKey,
user_id: threadInfo.userId.toString(),
ticket: threadInfo.ticket,
thread: threadInfo.threadId.toString()
}}]);
console.log('post packet: ', packet);
let server = threadInfo.server.replace('/api/', '/api.json/');
return this._post(server, packet, 'json').then(result => {
let status = null, chat_result, no = 0, blockNo = 0;
try {
chat_result = result.find(t => t.chat_result).chat_result;
status = chat_result.status;
no = parseInt(chat_result.no, 10);
blockNo = Math.floor((no + 1) / 100);
} catch (e) {
console.error(e);
}
if (parseInt(status) !== 0) {
return Promise.reject({
status: 'fail',
no,
blockNo,
code: status,
message: `コメント投稿失敗 status: ${status} server: ${threadInfo.server}`
});
}
return Promise.resolve({
status: 'ok',
no,
blockNo,
code: status,
message: 'コメント投稿成功'
});
});
}
postChat(threadInfo, text, cmd, vpos, language) {
return this.getPostKey(threadInfo.threadId, threadInfo.blockNo, language)
.then(result => {
return this._postChat(threadInfo, result.postkey, text, cmd, vpos);
});
}
}
return {ThreadLoader};
})();

const {YouTubeWrapper} = (() => {
const STATE_PLAYING = 1;
class YouTubeWrapper extends Emitter {
constructor({parentNode, autoplay = true, volume = 0.3, playbackRate = 1, loop = false}) {
super();
this._isInitialized = false;
this._parentNode = parentNode;
this._autoplay = autoplay;
this._volume = volume;
this._playbackRate = playbackRate;
this._loop = loop;
this._startDiff = 0;
this._isSeeking = false;
this._seekTime = 0;
this._onSeekEnd = _.debounce(this._onSeekEnd.bind(this), 500);
}
setSrc(url, startSeconds = 0) {
this._src = url;
this._videoId = this._parseVideoId(url);
this._canPlay = false;
this._isSeeking = false;
this._seekTime = 0;
const player = this._player;
const isFirst = !!player ? false : true;
const urlParams = this._parseUrlParams(url);
this._startDiff = /[0-9]+s/.test(urlParams.t) ? parseInt(urlParams.t) : 0;
startSeconds += this._startDiff;
if (isFirst && !url) {
return Promise.resolve();
}
if (isFirst) {
return this._initPlayer(this._videoId, startSeconds).then(({player}) => {
// YouTube APIにはプレイリストのループしか存在しないため、
// プレイリストにも同じ動画を入れる
// player.loadPlaylist({list: [this._videoId]});
});
}
if (!url) {
player.stopVideo();
return Promise.resolve();
}
player.loadVideoById({
videoId: this._videoId,
startSeconds: startSeconds
});
player.loadPlaylist({list: [this._videoId]});
return Promise.resolve();
}
set src(v) {
this.setSrc(v);
}
get src() {
return this._src;
}
_parseVideoId(url) {
let videoId = (() => {
const a = document.createElement('a');
a.href = url;
if (a.hostname === 'youtu.be') {
return a.pathname.substring(1);
} else {
const query = util.parseQuery(a.search.substring(1));
return query.v;
}
})();
if (!videoId) {
return videoId;
}
// 自動リンクでURLの前後につきそうな文字列を除去
// たぶんYouTubeのVideoIdには使われない奴
return videoId
.replace(/[?[\]()"'@]/g, '')
.replace(/<[a-z0-9]*>/, '');
}
_parseUrlParams(url) {
const a = document.createElement('a');
a.href= url;
return a.search.startsWith('?') ? util.parseQuery(a.search.substring(1)) : {};
}
_initPlayer(videoId, startSeconds = 0) {
if (this._player) {
return Promise.resolve({player: this._player});
}
let resolved = false;
return this._initYT().then(YT => {
return new Promise(resolve => {
this._player = new YT.Player(
this._parentNode, {
videoId,
events: {
onReady: () => {
setTimeout(() => {
if (!resolved) {
resolved = true;
resolve({player: this._player});
}
this._onPlayerReady();
}, 0);
},
onStateChange: this._onPlayerStateChange.bind(this),
onPlaybackQualityChange: e => {
window.console.info('video quality: ', e.data);
},
onError: (e) => {
this.emit('error', e);
}
},
playerVars: {
autoplay: this.autoplay ? 0 : 1,
volume: this._volume * 100,
start: startSeconds,
fs: 0,
loop: 0,
controls: 1,
disablekb: 1,
modestbranding: 0,
playsinline: 1,
rel: 0,
showInfo: 1,
}
});
});
});
}
_initYT() {
if (window.YT) {
return Promise.resolve(window.YT);
}
return new Promise(resolve => {
if (window.onYouTubeIframeAPIReady) {
window.onYouTubeIframeAPIReady_ = window.onYouTubeIframeAPIReady;
}
window.onYouTubeIframeAPIReady = () => {
if (window.onYouTubeIframeAPIReady_) {
window.onYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady_;
}
resolve(window.YT);
};
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});
}
_onPlayerReady() {
this.emitAsync('loadedMetaData');
// this.emitAsync('canplay');
}
_onPlayerStateChange(e) {
const state = e.data;
const YT = window.YT;
switch (state) {
case YT.PlayerState.ENDED:
if (this._loop) {
this.currentTime = 0;
this.play();
} else {
this.emit('ended');
}
break;
case YT.PlayerState.PLAYING:
if (!this._canPlay) {
this._canPlay = true;
this.muted = this._muted;
this.emit('loadedmetadata');
this.emit('canplay');
}
this.emit('play');
this.emit('playing');
if (this._isSeeking) {
this.emit('seeked');
}
break;
case YT.PlayerState.PAUSED:
this.emit('pause');
break;
case YT.PlayerState.BUFFERING:
//this.emit('stalled');
break;
case YT.PlayerState.CUED:
break;
}
}
play() {
this._player.playVideo();
return Promise.resolve(); // 互換のため
}
pause() {
this._player.pauseVideo();
}
selectBestQuality() {
let levels = this._player.getAvailableQualityLevels();
let best = levels[0];
let current = this._player.getPlaybackQuality();
//let currentTime = this.currentTime();
this._player.pauseVideo();
this._player.setPlaybackQuality(best);
//this.currentTime = currentTime;
this._player.playVideo();
// window.console.info('bestQuality', levels, best, current);
}
_onSeekEnd() {
this._isSeeking = false;
this._player.seekTo(this._seekTime + this._startDiff);
}
set currentTime(v) {
this._isSeeking = true;
this._seekTime = Math.max(0, Math.min(v, this.duration));
this._onSeekEnd();
this.emit('seeking');
}
get currentTime() {
const now = performance.now();
if (this._isSeeking) {
this._lastTime = now;
return this._seekTime;
}
const state = this._player.getPlayerState();
const currentTime = this._player.getCurrentTime() + this._startDiff;
if (state !== STATE_PLAYING || this._lastCurrentTime !== currentTime) {
this._lastCurrentTime = currentTime;
this._lastTime = now;
return currentTime;
}
// 本家watchページ上ではなぜかgetCurrentTimeの精度が落ちるため、
// status===PLAYINGにもかかわらずcurrentTimeが進んでいない時は、wrapper側で補完する。
// 精度が落ちると断続的なstalled判定になりコメントがカクカクする
const timeDiff = (now - this._lastTime) * this.playbackRate / 1000000;
this._lastCurrentTime = Math.min(currentTime, this.duration);
return currentTime + timeDiff;
}
get duration() {
return this._player.getDuration() - this._startDiff;
}
set muted(v) {
if (v) {
this._player.mute();
} else {
this._player.unMute();
}
this._muted = !!v;
}
get muted() {
return this._player.isMuted();
}
set volume(v) {
if (this._volume !== v) {
this._volume = v;
this._player.setVolume(v * 100);
this.emit('volumeChange', v);
}
}
get volume() {
return this._volume;
}
set playbackRate(v) {
if (this._playbackRate !== v) {
this._playbackRate = v;
this._player.setPlaybackRate(v);
//this.emit('changePlaybackRate');
}
}
get playbackRate() {
return this._playbackRate;
}
set loop(v) {
if (this._loop !== v) {
this._loop = v;
this._player.setLoop(v);
}
}
get loop() {
return this._loop;
}
get _state() {
return this._player.getPlayerState();
}
get playing() {
return this._state === 1;
}
// 互換のためのダミー実装
get videoWidth() {
return 1280;
}
get videoHeight() {
return 720;
}
getAttribute(k) {
return this[k];
}
removeAttribute() {
}
}
return {YouTubeWrapper};
})();
ZenzaWatch.debug.YouTubeWrapper = YouTubeWrapper;

/**
* VideoPlayer + CommentPlayer = NicoVideoPlayer
*
* とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
*
*/
class NicoVideoPlayer extends Emitter {
constructor(params) {
super();
this.initialize(params);
}
}
_.assign(NicoVideoPlayer.prototype, {
initialize: function (params) {
let conf = this._playerConfig = params.playerConfig;
this._fullscreenNode = params.fullscreenNode;
this._state = params.playerState;
this._state.on('update-videoInfo', this.setVideoInfo.bind(this));
const playbackRate = conf.getValue('playbackRate');
const onCommand = (command, param) => this.emit('command', command, param);
this._videoPlayer = new VideoPlayer({
volume: conf.getValue('volume'),
loop: conf.getValue('loop'),
mute: conf.getValue('mute'),
autoPlay: conf.getValue('autoPlay'),
playbackRate,
debug: conf.getValue('debug')
});
this._videoPlayer.on('command', onCommand);
this._commentPlayer = new NicoCommentPlayer({
offScreenLayer: params.offScreenLayer,
enableFilter: params.enableFilter,
wordFilter: params.wordFilter,
wordRegFilter: params.wordRegFilter,
wordRegFilterFlags: params.wordRegFilterFlags,
userIdFilter: params.userIdFilter,
commandFilter: params.commandFilter,
showComment: conf.getValue('showComment'),
debug: conf.getValue('debug'),
playbackRate,
sharedNgLevel: conf.getValue('sharedNgLevel')
});
this._commentPlayer.on('command', onCommand);
this._contextMenu = new ContextMenu({
parentNode: params.node.length ? params.node[0] : params.node,
playerState: this._state
});
this._contextMenu.on('command', onCommand);
if (params.node) {
this.appendTo(params.node);
}
this._initializeEvents();
this._beginTimer();
ZenzaWatch.debug.nicoVideoPlayer = this;
},
_beginTimer: function () {
this._stopTimer();
this._videoWatchTimer =
window.setInterval(this._onTimer.bind(this), 100);
},
_stopTimer: function () {
if (!this._videoWatchTimer) {
return;
}
window.clearInterval(this._videoWatchTimer);
this._videoWatchTimer = null;
},
_initializeEvents: function () {
const eventBridge = function(...args) {
this.emit(...args);
};
this._videoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
this._videoPlayer.on('dblclick', this._onDblClick.bind(this));
this._videoPlayer.on('aspectRatioFix', this._onAspectRatioFix.bind(this));
this._videoPlayer.on('play', this._onPlay.bind(this));
this._videoPlayer.on('playing', this._onPlaying.bind(this));
this._videoPlayer.on('seeking', this._onSeeking.bind(this));
this._videoPlayer.on('seeked', this._onSeeked.bind(this));
this._videoPlayer.on('stalled', eventBridge.bind(this, 'stalled'));
this._videoPlayer.on('timeupdate', eventBridge.bind(this, 'timeupdate'));
this._videoPlayer.on('waiting', eventBridge.bind(this, 'waiting'));
this._videoPlayer.on('progress', eventBridge.bind(this, 'progress'));
this._videoPlayer.on('pause', this._onPause.bind(this));
this._videoPlayer.on('ended', this._onEnded.bind(this));
this._videoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
this._videoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
this._videoPlayer.on('durationChange', eventBridge.bind(this, 'durationChange'));
this._videoPlayer.on('playerTypeChange', eventBridge.bind(this, 'videoPlayerTypeChange'));
this._videoPlayer.on('buffercomplete', eventBridge.bind(this, 'buffercomplete'));
// マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
this._videoPlayer.on('mouseWheel',
_.throttle(this._onMouseWheel.bind(this), 50));
this._videoPlayer.on('abort', eventBridge.bind(this, 'abort'));
this._videoPlayer.on('error', eventBridge.bind(this, 'error'));
this._videoPlayer.on('click', this._onClick.bind(this));
this._videoPlayer.on('contextMenu', this._onContextMenu.bind(this));
this._commentPlayer.on('parsed', eventBridge.bind(this, 'commentParsed'));
this._commentPlayer.on('change', eventBridge.bind(this, 'commentChange'));
this._commentPlayer.on('filterChange', eventBridge.bind(this, 'commentFilterChange'));
this._state.on('change', this._onPlayerStateChange.bind(this));
},
_onVolumeChange: function (vol, mute) {
this._playerConfig.setValue('volume', vol);
this._playerConfig.setValue('mute', mute);
this.emit('volumeChange', vol, mute);
},
_onPlayerStateChange: function (key, value) {
switch (key) {
case 'isLoop':
this._videoPlayer.setIsLoop(value);
break;
case 'playbackRate':
this._videoPlayer.setPlaybackRate(value);
this._commentPlayer.setPlaybackRate(value);
break;
case 'isAutoPlay':
this._videoPlayer.setIsAutoPlay(value);
break;
case 'isShowComment':
if (value) {
this._commentPlayer.show();
} else {
this._commentPlayer.hide();
}
break;
case 'isMute':
this._videoPlayer.setMute(value);
break;
case 'sharedNgLevel':
this.setSharedNgLevel(value);
break;
case 'currentSrc':
this.setVideo(value);
break;
}
},
_onMouseWheel: function (e, delta) {
if (delta > 0) { // up
this.volumeUp();
} else { // down
this.volumeDown();
}
},
volumeUp: function () {
let v = Math.max(0.01, this._videoPlayer.getVolume());
let r = v < 0.05 ? 1.3 : 1.1;
this._videoPlayer.setVolume(v * r);
},
volumeDown: function () {
let v = this._videoPlayer.getVolume();
let r = 1 / 1.2;
this._videoPlayer.setVolume(v * r);
},
_onTimer: function () {
let currentTime = this._videoPlayer.getCurrentTime();
this._commentPlayer.setCurrentTime(currentTime);
},
_onAspectRatioFix: function (ratio) {
this._commentPlayer.setAspectRatio(ratio);
this.emit('aspectRatioFix', ratio);
},
_onLoadedMetaData: function () {
this.emit('loadedMetaData');
},
_onVideoCanPlay: function () {
this.emit('canPlay');
if (this.autoplay && !this.paused) {
this._video.play().catch(err => {
if (err instanceof DOMException) {
// 他によくあるのはcode: 20 Aborted など
if (err.code === 35 /* NotAllowedError */) {
this.dispatchEvent(new CustomEvent('autoplay-rejected'));
}
}
});
}
},
_onPlay: function () {
this._isPlaying = true;
this.emit('play');
},
_onPlaying: function () {
this._isPlaying = true;
this.emit('playing');
},
_onSeeking: function () {
this._isSeeking = true;
this.emit('seeking');
},
_onSeeked: function () {
this._isSeeking = false;
this.emit('seeked');
},
_onPause: function () {
this._isPlaying = false;
this.emit('pause');
},
_onEnded: function () {
this._isPlaying = false;
this._isEnded = true;
this.emit('ended');
},
_onClick: function () {
this._contextMenu.hide();
},
_onDblClick: function () {
if (this._playerConfig.getValue('enableFullScreenOnDoubleClick')) {
this.toggleFullScreen();
}
},
_onContextMenu: function (e) {
if (!this._contextMenu.isOpen) {
e.stopPropagation();
e.preventDefault();
this._contextMenu.show(e.clientX, e.clientY);
}
},
setVideo: function (url) {
let e = {src: url, url: null, promise: null};
// デバッグ用
ZenzaWatch.emitter.emit('beforeSetVideo', e);
if (e.url) {
url = e.url;
}
if (e.promise) {
return e.promise.then(url => {
this._videoPlayer.setSrc(url);
this._isEnded = false;
});
}
this._videoPlayer.setSrc(url);
this._isEnded = false;
this._isSeeking = false;
},
setThumbnail: function (url) {
this._videoPlayer.setThumbnail(url);
},
play: function () {
return this._videoPlayer.play();
},
pause: function () {
this._videoPlayer.pause();
return Promise.resolve();
},
togglePlay: function () {
return this._videoPlayer.togglePlay();
},
setPlaybackRate: function (playbackRate) {
playbackRate = Math.max(0, Math.min(playbackRate, 10));
this._videoPlayer.setPlaybackRate(playbackRate);
this._commentPlayer.setPlaybackRate(playbackRate);
},
setCurrentTime: function (t) {
this._videoPlayer.setCurrentTime(Math.max(0, t));
},
fastSeek: function (t) {
this._videoPlayer.fastSeek(Math.max(0, t));
},
getDuration: function () {
return this._videoPlayer.getDuration();
},
getCurrentTime: function () {
return this._videoPlayer.getCurrentTime();
},
getVpos: function () {
return Math.floor(this._videoPlayer.getCurrentTime() * 100);
},
setComment: function (xmlText, options) {
this._commentPlayer.setComment(xmlText, options);
},
getChatList: function () {
return this._commentPlayer.getChatList();
},
getNonFilteredChatList: function () {
return this._commentPlayer.getNonFilteredChatList();
},
setVolume: function (v) {
this._videoPlayer.setVolume(v);
},
appendTo: function (node) {
let $node = typeof node === 'string' ? $(node) : node;
this._$parentNode = node;
this._videoPlayer.appendTo($node[0]);
this._commentPlayer.appendTo($node);
},
close: function () {
this._videoPlayer.close();
this._commentPlayer.close();
},
closeCommentPlayer: function () {
this._commentPlayer.close();
},
toggleFullScreen: function () {
if (Fullscreen.now()) {
Fullscreen.cancel();
} else {
this.requestFullScreen();
}
},
requestFullScreen: function () {
Fullscreen.request(this._fullscreenNode || this._$parentNode[0]);
},
canPlay: function () {
return this._videoPlayer.canPlay();
},
isPlaying: function () {
return !!this._isPlaying;
},
isSeeking: function () {
return !!this._isSeeking;
},
getBufferedRange: function () {
return this._videoPlayer.getBufferedRange();
},
addChat: function (text, cmd, vpos, options) {
if (!this._commentPlayer) {
return;
}
let nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
console.log('addChat:', text, cmd, vpos, options, nicoChat);
return nicoChat;
},
setIsCommentFilterEnable: function (v) {
this._commentPlayer.setIsFilterEnable(v);
},
isCommentFilterEnable: function () {
return this._commentPlayer.isFilterEnable();
},
setSharedNgLevel: function (level) {
this._commentPlayer.setSharedNgLevel(level);
},
getSharedNgLevel: function () {
return this._commentPlayer.getSharedNgLevel();
},
addWordFilter: function (text) {
this._commentPlayer.addWordFilter(text);
},
setWordFilterList: function (list) {
this._commentPlayer.setWordFilterList(list);
},
getWordFilterList: function () {
return this._commentPlayer.getWordFilterList();
},
addUserIdFilter: function (text) {
this._commentPlayer.addUserIdFilter(text);
},
setUserIdFilterList: function (list) {
this._commentPlayer.setUserIdFilterList(list);
},
getUserIdFilterList: function () {
return this._commentPlayer.getUserIdFilterList();
},
getCommandFilterList: function () {
return this._commentPlayer.getCommandFilterList();
},
addCommandFilter: function (text) {
this._commentPlayer.addCommandFilter(text);
},
setCommandFilterList: function (list) {
this._commentPlayer.setCommandFilterList(list);
},
setVideoInfo: function (info) {
this._videoInfo = info;
},
getVideoInfo: function () {
return this._videoInfo;
},
getMymemory: function () {
return this._commentPlayer.getMymemory();
},
getScreenShot: function () {
window.console.time('screenShot');
const fileName = this._getSaveFileName();
const video = this._videoPlayer.getVideoElement();
return VideoCaptureUtil.videoToCanvas(video).then(({canvas}) => {
VideoCaptureUtil.saveToFile(canvas, fileName);
window.console.timeEnd('screenShot');
});
},
getScreenShotWithComment: function () {
window.console.time('screenShotWithComment');
const fileName = this._getSaveFileName({suffix: 'C'});
const video = this._videoPlayer.getVideoElement();
const html = this._commentPlayer.getCurrentScreenHtml();
return VideoCaptureUtil.nicoVideoToCanvas({video, html}).then(({canvas}) => {
VideoCaptureUtil.saveToFile(canvas, fileName);
window.console.timeEnd('screenShotWithComment');
});
},
_getSaveFileName: function ({suffix = ''} = {}) {
const title = this._videoInfo.title;
const watchId = this._videoInfo.watchId;
const currentTime = this._videoPlayer.getCurrentTime();
const time = util.secToTime(currentTime).replace(':', '_');
const prefix = Config.getValue('screenshot.prefix') || '';
return `${prefix}${title} - ${watchId}@${time}${suffix}.png`;
},
isCorsReady: function () {
return this._videoPlayer && this._videoPlayer.isCorsReady();
}
});
class ContextMenu extends BaseViewComponent {
constructor({parentNode, playerState}) {
super({
parentNode,
name: 'VideoContextMenu',
template: ContextMenu.__tpl__,
css: ContextMenu.__css__
});
this._playerState = playerState;
this._state = {
isOpen: false
};
this._bound.onBodyClick = this.hide.bind(this);
}
_initDom(...args) {
super._initDom(...args);
ZenzaWatch.debug.contextMenu = this;
const onMouseDown = this._bound.onMouseDown = this._onMouseDown.bind(this);
this._bound.onBodyMouseUp = this._onBodyMouseUp.bind(this);
this._bound.onRepeat = this._onRepeat.bind(this);
this._view.classList.toggle('is-pictureInPictureEnabled', document.pictureInPictureEnabled);
this._view.addEventListener('mousedown', onMouseDown);
this._isFirstShow = true;
this._view.addEventListener('contextmenu', (e) => {
setTimeout(() => {
this.hide();
}, 100);
e.preventDefault();
e.stopPropagation();
});
}
_onClick(e) {
if (e && e.button !== 0) {
return;
}
if (e.type !== 'mousedown') {
e.preventDefault();
e.stopPropagation();
return;
}
e.stopPropagation();
super._onClick(e);
}
_onMouseDown(e) {
if (e.target && e.target.getAttribute('data-is-no-close') === 'true') {
e.stopPropagation();
this._onClick(e);
} else if (e.target && e.target.getAttribute('data-repeat') === 'on') {
e.stopPropagation();
this._onClick(e);
this._beginRepeat(e);
} else {
e.stopPropagation();
this._onClick(e);
setTimeout(() => {
this.hide();
}, 100);
}
}
_onBodyMouseUp() {
this._endRepeat();
}
_beginRepeat(e) {
this._repeatEvent = e;
document.body.addEventListener('mouseup', this._bound.onBodyMouseUp);
this._repeatTimer = window.setInterval(this._bound.onRepeat, 200);
this._isRepeating = true;
}
_endRepeat() {
this._repeatEvent = null;
// this._isRepeating = false;
if (this._repeatTimer) {
window.clearInterval(this._repeatTimer);
this._repeatTimer = null;
}
document.body.removeEventListener('mouseup', this._bound.onBodyMouseUp);
}
_onRepeat() {
if (!this._isRepeating) {
this._endRepeat();
return;
}
if (this._repeatEvent) {
this._onClick(this._repeatEvent);
}
}
show(x, y) {
document.body.addEventListener('click', this._bound.onBodyClick);
const view = this._view;
this._onBeforeShow(x, y);
view.style.left =
Math.max(0, Math.min(x, window.innerWidth - view.offsetWidth)) + 'px';
view.style.top =
Math.max(0, Math.min(y + 20, window.innerHeight - view.offsetHeight)) + 'px';
this.setState({isOpen: true});
ZenzaWatch.emitter.emitAsync('showMenu');
}
hide() {
document.body.removeEventListener('click', this._bound.onBodyClick);
util.$(this._view).css({left: '', top: ''});
this._endRepeat();
this.setState({isOpen: false});
ZenzaWatch.emitter.emitAsync('hideMenu');
}
get isOpen() {
return this._state.isOpen;
}
_onBeforeShow() {
// チェックボックスなどを反映させるならココ
const pr = parseFloat(this._playerState.playbackRate, 10);
const view = util.$(this._view);
view.find('.selected').removeClass('selected');
view.find('.playbackRate').forEach(elm => {
const p = parseFloat(elm.getAttribute('data-param'), 10);
if (Math.abs(p - pr) < 0.01) {
elm.classList.add('selected');
}
});
view.find('.debug')
.toggleClass('selected', this._playerState.isDebug);
if (this._isFirstShow) {
this._isFirstShow = false;
const handler = (command, param) => {
this.emit('command', command, param);
};
ZenzaWatch.emitter.emitAsync('videoContextMenu.addonMenuReady',
view.find('.empty-area-top'), handler
);
ZenzaWatch.emitter.emitAsync('videoContextMenu.addonMenuReady.list',
view.find('.listInner ul'), handler
);
}
}
}
ContextMenu.__css__ = (`
.zenzaPlayerContextMenu {
position: fixed;
background: rgba(255, 255, 255, 0.8);
overflow: visible;
padding: 8px;
border: 1px outset #333;
box-shadow: 2px 2px 4px #000;
transition: opacity 0.3s ease;
min-width: 200px;
z-index: 150000;
user-select: none;
color: #000;
}
.zenzaPlayerContextMenu.is-Open {
opacity: 0.5;
}
.zenzaPlayerContextMenu.is-Open:hover {
opacity: 1;
}
.is-fullscreen .zenzaPlayerContextMenu {
position: absolute;
}
.zenzaPlayerContextMenu:not(.is-Open) {
left: -9999px;
top: -9999px;
opacity: 0;
}
.zenzaPlayerContextMenu ul {
padding: 0;
margin: 0;
}
.zenzaPlayerContextMenu ul li {
position: relative;
line-height: 120%;
margin: 2px;
overflow-y: visible;
white-space: nowrap;
cursor: pointer;
padding: 2px 14px;
list-style-type: none;
float: inherit;
}
.is-loop .zenzaPlayerContextMenu li.toggleLoop:before,
.is-playlistEnable .zenzaPlayerContextMenu li.togglePlaylist:before,
.is-showComment .zenzaPlayerContextMenu li.toggleShowComment:before,
.zenzaPlayerContextMenu ul li.selected:before {
content: '✔';
left: -10px;
color: #000 !important;
position: absolute;
}
.zenzaPlayerContextMenu ul li:hover {
background: #336;
color: #fff;
}
.zenzaPlayerContextMenu ul li.separator {
border: 1px outset;
height: 2px;
width: 90%;
}
.zenzaPlayerContextMenu.show {
opacity: 0.8;
}
.zenzaPlayerContextMenu .listInner {
}
.zenzaPlayerContextMenu .controlButtonContainer {
position: absolute;
bottom: 100%;
left: 50%;
width: 110%;
transform: translate(-50%, 0);
white-space: nowrap;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex {
display: flex;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton {
flex: 1;
height: 48px;
font-size: 24px;
line-height: 46px;
border: 1px solid;
border-radius: 4px;
color: #333;
background: rgba(192, 192, 192, 0.95);
cursor: pointer;
transition: transform 0.1s, box-shadow 0.1s;
box-shadow: 0 0 0;
opacity: 1;
margin: auto;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.screenShot {
flex: 1;
font-size: 24px;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.playbackRate {
flex: 2;
font-size: 14px;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate010,
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate100,
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.rate200 {
flex: 3;
font-size: 24px;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek5s {
flex: 2;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton.seek15s {
flex: 3;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:hover {
transform: translate(0px, -4px);
box-shadow: 0px 4px 2px #666;
}
.zenzaPlayerContextMenu .controlButtonContainerFlex > .controlButton:active {
transform: none;
box-shadow: 0 0 0;
border: 1px inset;
}
[data-command="picture-in-picture"] {
display: none;
}
.is-pictureInPictureEnabled [data-command="picture-in-picture"] {
display: block;
}
`).trim();
ContextMenu.__tpl__ = (`
<div class="zenzaPlayerContextMenu">
<div class="controlButtonContainer">
<div class="controlButtonContainerFlex">
<div class="controlButton command screenShot" data-command="screenShot"
data-param="0.1" data-type="number" data-is-no-close="true">
&#128247;<div class="tooltip">スクリーンショット</div>
</div>
<div class="empty-area-top" style="flex:4;" data-is-no-close="true"></div>
</div>
<div class="controlButtonContainerFlex">
<div class="controlButton command rate010 playbackRate" data-command="playbackRate"
data-param="0.1" data-type="number" data-repeat="on">
&#128034;<div class="tooltip">コマ送り(0.1倍)</div>
</div>
<div class="controlButton command rate050 playbackRate" data-command="playbackRate"
data-param="0.5" data-type="number" data-repeat="on">
<div class="tooltip">0.5倍速</div>
</div>
<div class="controlButton command rate075 playbackRate" data-command="playbackRate"
data-param="0.75" data-type="number" data-repeat="on">
<div class="tooltip">0.75倍速</div>
</div>
<div class="controlButton command rate100 playbackRate" data-command="playbackRate"
data-param="1.0" data-type="number" data-repeat="on">
&#9655;<div class="tooltip">標準速</div>
</div>
<div class="controlButton command rate125 playbackRate" data-command="playbackRate"
data-param="1.25" data-type="number" data-repeat="on">
<div class="tooltip">1.25倍速</div>
</div>
<div class="controlButton command rate150 playbackRate" data-command="playbackRate"
data-param="1.5" data-type="number" data-repeat="on">
<div class="tooltip">1.5倍速</div>
</div>
<div class="controlButton command rate200 playbackRate" data-command="playbackRate"
data-param="2.0" data-type="number" data-repeat="on">
&#128007;<div class="tooltip">2倍速</div>
</div>
</div>
<div class="controlButtonContainerFlex">
<div class="controlButton command seek5s"
data-command="seekBy" data-param="-5" data-type="number" data-repeat="on"
>⇦
<div class="tooltip">5秒戻る</div>
</div>
<div class="controlButton command seek15s"
data-command="seekBy" data-param="-15" data-type="number" data-repeat="on"
>⇦
<div class="tooltip">15秒戻る</div>
</div>
<div class="controlButton command seek15s"
data-command="seekBy" data-param="15" data-type="number" data-repeat="on"
>⇨
<div class="tooltip">15秒進む</div>
</div>
<div class="controlButton command seek5s"
data-command="seekBy" data-param="5" data-type="number" data-repeat="on"
>⇨
<div class="tooltip">5秒進む</div>
</div>
</div>
</div>
<div class="listInner">
<ul>
<li class="command" data-command="togglePlay">停止/再開</li>
<li class="command" data-command="seekTo" data-param="0">先頭に戻る</li>
<hr class="separator">
<li class="command toggleLoop" data-command="toggle-loop">リピート</li>
<li class="command togglePlaylist" data-command="togglePlaylist">連続再生</li>
<li class="command toggleShowComment" data-command="toggle-showComment">コメントを表示</li>
<li class="command" data-command="picture-in-picture">P in P</li>
<hr class="separator">
<li class="command forPremium"
data-command="toggle-flipH">左右反転</li>
<li class="command"
data-command="toggle-flipV">上下反転</li>
<hr class="separator">
<li class="command"
data-command="reload">動画のリロード</li>
<li class="command"
data-command="copy-video-watch-url">動画URLをコピー</li>
<li class="command debug"
data-command="toggle-debug">デバッグ</li>
<li class="command mymemory"
data-command="saveMymemory">コメントの保存</li>
</ul>
</div>
</div>
`).trim();
/**
* Video要素をラップした物
*
*/
class VideoPlayer extends Emitter {
constructor(params) {
super();
this._initialize(params);
}
_initialize(params) {
//console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
this._id = 'video' + Math.floor(Math.random() * 100000);
this._resetVideo(params);
util.addStyle(VideoPlayer.__css__);
}
_reset() {
this.removeClass('is-play is-pause is-abort is-error');
this._isPlaying = false;
this._canPlay = false;
}
addClass(className) {
this.toggleClass(className, true);
}
removeClass(className) {
this.toggleClass(className, false);
}
toggleClass(className, v) {
const body = this._body;
className.split(/[ ]+/).forEach(name => {
body.classList.toggle(name, v);
});
}
_resetVideo(params) {
params = params || {};
if (this._videoElement) {
params.autoplay = this._videoElement.autoplay;
params.loop = this._videoElement.loop;
params.mute = this._videoElement.muted;
params.volume = this._videoElement.volume;
params.playbackRate = this._videoElement.playbackRate;
this._videoElement.remove();
}
const options = {
autobuffer: true,
preload: 'auto',
mute: !!params.mute,
'playsinline': true,
'webkit-playsinline': true
};
const volume =
params.hasOwnProperty('volume') ? parseFloat(params.volume) : 0.5;
const playbackRate = this._playbackRate =
params.hasOwnProperty('playbackRate') ? parseFloat(params.playbackRate) : 1.0;
const video = util.createVideoElement();
const body = document.createElement('div');
util.$(body)
.addClass(`videoPlayer nico ${this._id}`);
util.$(video)
.addClass('videoPlayer-video')
.attr(options);
body.id = 'ZenzaWatchVideoPlayerContainer';
this._body = body;
body.appendChild(video);
video.pause();
this._video = video;
this._video.className = 'zenzaWatchVideoElement';
video.controlslist = 'nodownload';
video.controls = false;
video.autoplay = !!params.autoPlay;
video.loop = !!params.loop;
this._videoElement = video;
this._isPlaying = false;
this._canPlay = false;
this.setVolume(volume);
this.setMute(params.mute);
this.setPlaybackRate(playbackRate);
this._touchWrapper = new TouchWrapper({
parentElement: body
});
this._touchWrapper.on('command', (command, param) => {
if (command === 'contextMenu') {
this._emit('contextMenu', param);
return;
}
this.emit('command', command, param);
});
this._initializeEvents();
ZenzaWatch.debug.video = this._video;
Object.assign(ZenzaWatch.external, {
getVideoElement: () => {
return this._video;
}
});
}
_initializeEvents() {
const eventBridge = function(name, ...args) {
console.log('%c_on-%s:', 'background: cyan;', name, ...args);
this.emit(name, ...args);
};
util.$(this._video)
.on('canplay', this._onCanPlay.bind(this))
.on('canplaythrough', eventBridge.bind(this, 'canplaythrough'))
.on('loadstart', eventBridge.bind(this, 'loadstart'))
.on('loadeddata', eventBridge.bind(this, 'loadeddata'))
.on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'))
.on('ended', eventBridge.bind(this, 'ended'))
.on('emptied', eventBridge.bind(this, 'emptied'))
.on('stalled', this._onStalled.bind(this))
.on('suspend', eventBridge.bind(this, 'suspend'))
.on('waiting', eventBridge.bind(this, 'waiting'))
.on('progress', this._onProgress.bind(this))
.on('durationchange', this._onDurationChange.bind(this))
.on('abort', this._onAbort.bind(this))
.on('error', this._onError.bind(this))
.on('buffercomplete', eventBridge.bind(this, 'buffercomplete'))
.on('pause', this._onPause.bind(this))
.on('play', this._onPlay.bind(this))
.on('playing', this._onPlaying.bind(this))
.on('seeking', this._onSeeking.bind(this))
.on('seeked', this._onSeeked.bind(this))
.on('volumechange', this._onVolumeChange.bind(this))
.on('contextmenu', eventBridge.bind(this, 'contextmenu'))
.on('click', eventBridge.bind(this, 'click'))
;
const touch = util.$(this._touchWrapper.body);
touch
.on('click', eventBridge.bind(this, 'click'))
.on('dblclick', this._onDoubleClick.bind(this))
.on('contextmenu', eventBridge.bind(this, 'contextmenu'))
.on('wheel', this._onMouseWheel.bind(this), {passive: true})
;
}
_onCanPlay(...args) {
console.log('%c_onCanPlay:', 'background: cyan; color: blue;', ...args);
this.setPlaybackRate(this.getPlaybackRate());
// リピート時にも飛んでくるっぽいので初回だけにする
if (!this._canPlay) {
this._canPlay = true;
this.removeClass('is-loading');
this.emit('canPlay', ...args);
if (this._video.videoHeight < 1) {
this._isAspectRatioFixed = false;
} else {
this._isAspectRatioFixed = true;
this.emit('aspectRatioFix',
this._video.videoHeight / Math.max(1, this._video.videoWidth));
}
if (this._isYouTube && Config.getValue('bestZenTube')) {
this._videoYouTube.selectBestQuality();
}
}
}
_onProgress() {
//console.log('%c_onProgress:', 'background: cyan;', arguments);
this.emit('progress', this._video.buffered, this._video.currentTime);
}
_onDurationChange() {
console.log('%c_onDurationChange:', 'background: cyan;', arguments);
this.emit('durationChange', this._video.duration);
}
_onAbort() {
if (this._isYouTube) {
return;
} // TODO: YouTube側のエラーハンドリング
console.warn('%c_onAbort:', 'background: cyan; color: red;');
this._isPlaying = false;
this.addClass('is-abort');
this.emit('abort');
}
_onError(e) {
if (this._isYouTube) {
return;
}
if (this._videoElement.src === CONSTANT.BLANK_VIDEO_URL ||
!this._videoElement.src ||
this._videoElement.src.match(/^https?:$/) ||
this._videoElement.src === '//'
) {
return;
}
window.console.error('error src', this._video.src);
window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
this.addClass('is-error');
this._canPlay = false;
this.emit('error', {
code: (e && e.target && e.target.error && e.target.error.code) || 0,
target: e.target || this._video,
type: 'normal'
});
}
_onYouTubeError(e) {
window.console.error('error src', this._video.src);
window.console.error('%c_onError:', 'background: cyan; color: red;', e);
this.addClass('is-error');
this._canPlay = false;
let fallback = false;
const code = e.data;
const description = (() => {
switch (code) {
case 2:
return 'YouTube Error: パラメータエラー (2 invalid parameter)';
case 5:
return 'YouTube Error: HTML5 関連エラー (5 HTML5 error)';
case 100:
fallback = true;
return 'YouTube Error: 動画が見つからないか、非公開 (100 video not found)';
case 101:
case 150:
fallback = true;
return `YouTube Error: 外部での再生禁止 (${code} forbidden)`;
default:
return `YouTube Error: (code${code})`;
}
})();
this.emit('error', {
code,
description,
fallback,
target: this._videoElement,
type: 'youtube'
});
}
_onPause() {
console.log('%c_onPause:', 'background: cyan;', arguments);
//this.removeClass('is-play');
this._isPlaying = false;
this.emit('pause');
}
_onPlay() {
console.log('%c_onPlay:', 'background: cyan;', arguments);
this.addClass('is-play');
this._isPlaying = true;
this.emit('play');
}
_onPlaying() {
console.log('%c_onPlaying:', 'background: cyan;', arguments);
this._isPlaying = true;
if (!this._isAspectRatioFixed) {
this._isAspectRatioFixed = true;
this.emit('aspectRatioFix',
this._video.videoHeight / Math.max(1, this._video.videoWidth));
}
this.emit('playing');
}
_onSeeking() {
console.log('%c_onSeeking:', 'background: cyan;', arguments);
this.emit('seeking', this._video.currentTime);
}
_onSeeked() {
console.log('%c_onSeeked:', 'background: cyan;', arguments);
// なぜかシークのたびにリセットされるので再設定 (Chromeだけ？)
this.setPlaybackRate(this.getPlaybackRate());
this.emit('seeked', this._video.currentTime);
}
_onVolumeChange() {
console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
this.emit('volumeChange', this.getVolume(), this.isMuted());
}
_onDoubleClick(e) {
console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
e.preventDefault();
e.stopPropagation();
this.emit('dblclick');
}
_onMouseWheel(e) {
console.log('%c_onMouseWheel:', 'background: cyan;', e);
// e.preventDefault();
e.stopPropagation();
const delta = -parseInt(e.deltaY, 10);
if (delta !== 0) {
this.emit('mouseWheel', e, delta);
}
}
_onStalled(e) {
this.emit('stalled', e);
this._video.addEventListener('timeupdate', () => this.emit('timeupdate'), {once: true});
}
canPlay() {
return !!this._canPlay;
}
play() {
if (this._currentVideo.currentTime === this.getDuration()) {
this.setCurrentTime(0);
}
const p = this._video.play();
// video.play()がPromiseを返すかどうかはブラウザによって異なるっぽい。。。
if (p instanceof (Promise)) {
return p.then(() => {
this._isPlaying = true;
});
}
this._isPlaying = true;
return Promise.resolve();
}
pause() {
this._video.pause();
this._isPlaying = false;
return Promise.resolve();
}
isPlaying() {
return !!this._isPlaying && !!this._canPlay;
}
setThumbnail(url) {
console.log('%csetThumbnail: %s', 'background: cyan;', url);
this._thumbnail = url;
this._video.poster = url;
//this.emit('setThumbnail', url);
}
setSrc(url) {
console.log('%csetSc: %s', 'background: cyan;', url);
this._reset();
this._src = url;
this._isPlaying = false;
this._canPlay = false;
this._isAspectRatioFixed = false;
this.addClass('is-loading');
if (/(youtube\.com|youtu\.be)/.test(url)) {
const currentTime = this._currentVideo.currentTime;
this._initYouTube().then(() => {
// 通常使用では(video|YouTube) -> YouTubeへの遷移しか存在しないので
// 逆方向の想定は色々端折っている
return this._videoYouTube.setSrc(url, currentTime);
}).then(() => {
this._changePlayer('YouTube');
});
return;
}
this._changePlayer('normal');
if (url.indexOf('dmc.nico') >= 0 && location.host.indexOf('.nicovideo.jp') >= 0) {
this._video.crossOrigin = 'use-credentials';
} else if (this._video.crossOrigin) {
this._video.crossOrigin = null;
}
this._video.src = url;
}
get _isYouTube() {
return this._videoYouTube && this._currentVideo === this._videoYouTube;
}
_initYouTube() {
if (this._videoYouTube) {
return Promise.resolve(this._videoYouTube);
}
const yt = this._videoYouTube = new YouTubeWrapper({
parentNode: this._body.appendChild(document.createElement('div')),
volume: this._volume,
autoplay: this._videoElement.autoplay
});
const eventBridge = function(...args) {
this.emit(...args);
};
yt.on('canplay', this._onCanPlay.bind(this));
yt.on('loadedmetadata', eventBridge.bind(this, 'loadedmetadata'));
yt.on('ended', eventBridge.bind(this, 'ended'));
yt.on('stalled', eventBridge.bind(this, 'stalled'));
yt.on('pause', this._onPause.bind(this));
yt.on('play', this._onPlay.bind(this));
yt.on('playing', this._onPlaying.bind(this));
yt.on('seeking', this._onSeeking.bind(this));
yt.on('seeked', this._onSeeked.bind(this));
yt.on('volumechange', this._onVolumeChange.bind(this));
yt.on('error', this._onYouTubeError.bind(this));
ZenzaWatch.debug.youtube = yt;
return Promise.resolve(this._videoYouTube);
}
_changePlayer(type) {
switch (type.toLowerCase()) {
case 'youtube':
if (this._currentVideo !== this._videoYouTube) {
const yt = this._videoYouTube;
this.addClass('is-youtube');
yt.autoplay = this._currentVideo.autoplay;
yt.loop = this._currentVideo.loop;
yt.muted = this._currentVideo.muted;
yt.volume = this._currentVideo.volume;
yt.playbackRate = this._currentVideo.playbackRate;
this._currentVideo = yt;
this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
this.emit('playerTypeChange', 'youtube');
}
break;
default:
if (this._currentVideo === this._videoYouTube) {
this.removeClass('is-youtube');
this._videoElement.loop = this._currentVideo.loop;
this._videoElement.muted = this._currentVideo.muted;
this._videoElement.volume = this._currentVideo.volume;
this._videoElement.playbackRate = this._currentVideo.playbackRate;
this._currentVideo = this._videoElement;
this._videoYouTube.src = '';
this.emit('playerTypeChange', 'normal');
}
break;
}
}
setVolume(vol) {
vol = Math.max(Math.min(1, vol), 0);
this._video.volume = vol;
}
getVolume() {
return parseFloat(this._video.volume);
}
setMute(v) {
v = !!v;
if (this._video.muted !== v) {
this._video.muted = v;
}
}
isMuted() {
return this._video.muted;
}
getCurrentTime() {
if (!this._canPlay) {
return 0;
}
return this._video.currentTime;
}
setCurrentTime(sec) {
let cur = this._video.currentTime;
if (cur !== sec) {
this._video.currentTime = sec;
this.emit('seek', this._video.currentTime);
}
}
/**
* fastSeekが使えたら使う。 現状Firefoxのみ？
* - currentTimeによるシーク 位置は正確だが遅い
* - fastSeekによるシーク キーフレームにしか飛べないが速い(FLashに近い)
* なので、smile動画のループはこっちを使ったほうが再現度が高くなりそう
*/
fastSeek(sec) {
if (typeof this._video.fastSeek !== 'function' || this._isYouTube) {
return this.setCurrentTime(sec);
}
// dmc動画はキーフレーム間隔が1秒とか意味不明な仕様なのでcurrentTimeでいい
if (this._src.indexOf('dmc.nico') >= 0) {
return this.setCurrentTime(sec);
}
this._video.fastSeek(sec);
this.emit('seek', this._video.currentTime);
}
getDuration() {
return this._video.duration;
}
togglePlay() {
if (this.isPlaying()) {
return this.pause();
} else {
return this.play();
}
}
getVpos() {
return this._video.currentTime * 100;
}
setVpos(vpos) {
this._video.currentTime = vpos / 100;
}
getIsLoop() {
return !!this._video.loop;
}
setIsLoop(v) {
this._video.loop = !!v;
}
setPlaybackRate(v) {
console.log('setPlaybackRate', v);
//if (!ZenzaWatch.util.isPremium()) { v = Math.min(1, v); }
// たまにリセットされたり反映されなかったりする？
this._playbackRate = v;
let video = this._video;
video.playbackRate = 1;
window.setTimeout(function () {
video.playbackRate = parseFloat(v);
}, 100);
}
getPlaybackRate() {
return this._playbackRate;
}
getBufferedRange() {
return this._video.buffered;
}
setIsAutoPlay(v) {
this._video.autoplay = v;
}
getIsAutoPlay() {
return this._video.autoPlay;
}
appendTo(node) {
node.appendChild(this._body);
}
close() {
this._video.pause();
this._video.removeAttribute('src');
this._video.removeAttribute('poster');
// removeAttribute('src')では動画がクリアされず、
// 空文字を指定しても base hrefと連結されて
// http://www.nicovideo.jpへのアクセスが発生する. どないしろと.
this._videoElement.src = CONSTANT.BLANK_VIDEO_URL;
//window.console.info('src', this._video.src, this._video.getAttribute('src'));
if (this._videoYouTube) {
this._videoYouTube.src = '';
}
}
/**
* 画面キャプチャを取る。
* CORSの制限があるので保存できない。
*/
getScreenShot() {
if (!this.isCorsReady()) {
return null;
}
const video = this._video;
const width = video.videoWidth;
const height = video.videoHeight;
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const context = canvas.getContext('2d');
context.drawImage(video.drawableElement || video, 0, 0);
return canvas;
}
isCorsReady() {
return this._video.crossOrigin === 'use-credentials';
}
getVideoElement() {
return this._videoElement;
}
get _video() {
return this._currentVideo;
}
set _video(v) {
this._currentVideo = v;
}
}
VideoPlayer.__css__ = `
.videoPlayer iframe,
.videoPlayer .zenzaWatchVideoElement {
margin: 0;
padding: 0;
width: 100%;
height: 100%;
z-index: 5;
}
.zenzaWatchVideoElement {
display: block;
transition: transform 0.4s ease;
}
/* iOSだとvideo上でマウスイベントが発生しないのでカバーを掛ける */
.touchWrapper {
display: block;
position: absolute;
opacity: 0;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 10;
}
/* YouTubeのプレイヤーを触れる用にするための隙間 */
.is-youtube .touchWrapper {
width: calc(100% - 100px);
height: calc(100% - 150px);
}
.is-loading .touchWrapper,
.is-error .touchWrapper {
display: none !important;
}
.videoPlayer.is-youtube .zenzaWatchVideoElement {
display: none;
}
.videoPlayer iframe {
display: none;
}
.videoPlayer.is-youtube iframe {
display: block;
border: 1px dotted;
}
.is-flipH .zenzaWatchVideoElement {
transform: perspective(400px) rotateY(180deg);
}
.is-flipV .zenzaWatchVideoElement {
transform: perspective(400px) rotateX(180deg);
}
`.trim();
class TouchWrapper extends Emitter {
constructor({parentElement}) {
super();
this._parentElement = parentElement;
this._config = ZenzaWatch.config.namespace('touch');
this._isTouching = false;
this._maxCount = 0;
this._currentTouches = [];
this._debouncedOnSwipe2Y = _.debounce(this._onSwipe2Y.bind(this), 400);
this._debouncedOnSwipe3X = _.debounce(this._onSwipe3X.bind(this), 400);
this.initializeDom();
}
initializeDom() {
let body = this._body = document.createElement('div');
body.className = 'touchWrapper';
body.addEventListener('click', this._onClick.bind(this));
body.addEventListener('touchstart', this._onTouchStart.bind(this), {passive: true});
body.addEventListener('touchmove', this._onTouchMove.bind(this), {passive: true});
body.addEventListener('touchend', this._onTouchEnd.bind(this), {passive: true});
body.addEventListener('touchcancel', this._onTouchCancel.bind(this), {passive: true});
this._onTouchMoveThrottled =
_.throttle(this._onTouchMoveThrottled.bind(this), 200);
if (this._parentElement) {
this._parentElement.appendChild(body);
}
ZenzaWatch.debug.touchWrapper = this;
}
get body() {
return this._body;
}
_onClick() {
this._lastTap = 0;
}
_onTouchStart(e) {
let identifiers =
this._currentTouches.map(touch => {
return touch.identifier;
});
if (e.changedTouches.length > 1) {
e.preventDefault();
}
Array.from(e.changedTouches).forEach(touch => {
if (identifiers.includes(touch.identifier)) {
return;
}
this._currentTouches.push(touch);
});
this._maxCount = Math.max(this._maxCount, this.touchCount);
this._startCenter = this._getCenter(e);
this._lastCenter = this._getCenter(e);
this._isMoved = false;
}
_onTouchMove(e) {
if (e.targetTouches.length > 1) {
e.preventDefault();
}
this._onTouchMoveThrottled(e);
}
_onTouchMoveThrottled(e) {
if (!e.targetTouches) {
return;
}
if (e.targetTouches.length > 1) {
e.preventDefault();
}
let startPoint = this._startCenter;
let lastPoint = this._lastCenter;
let currentPoint = this._getCenter(e);
if (!startPoint || !currentPoint) {
return;
}
let width = this._body.offsetWidth;
let height = this._body.offsetHeight;
let diff = {
count: this.touchCount,
startX: startPoint.x,
startY: startPoint.y,
currentX: currentPoint.x,
currentY: currentPoint.y,
moveX: currentPoint.x - lastPoint.x,
moveY: currentPoint.y - lastPoint.y,
x: currentPoint.x - startPoint.x,
y: currentPoint.y - startPoint.y,
};
diff.perX = diff.x / width * 100;
diff.perY = diff.y / height * 100;
diff.perStartX = diff.startX / width * 100;
diff.perStartY = diff.startY / height * 100;
diff.movePerX = diff.moveX / width * 100;
diff.movePerY = diff.moveY / height * 100;
if (Math.abs(diff.perX) > 2 || Math.abs(diff.perY) > 1) {
this._isMoved = true;
}
if (diff.count === 2) {
if (Math.abs(diff.movePerX) >= 0.5) {
this._execCommand('seekRelativePercent', diff);
}
if (Math.abs(diff.perY) >= 20) {
this._debouncedOnSwipe2Y(diff);
}
}
if (diff.count === 3) {
if (Math.abs(diff.perX) >= 20) {
this._debouncedOnSwipe3X(diff);
}
}
this._lastCenter = currentPoint;
return diff;
}
_onSwipe2Y(diff) {
this._execCommand(diff.perY < 0 ? 'shiftUp' : 'shiftDown');
this._startCenter = this._lastCenter;
}
_onSwipe3X(diff) {
this._execCommand(diff.perX < 0 ? 'playNextVideo' : 'playPreviousVideo');
this._startCenter = this._lastCenter;
}
_execCommand(command, param) {
if (!this._config.getValue('enable')) {
return;
}
if (!command) {
return;
}
this.emit('command', command, param);
}
_onTouchEnd(e) {
if (!e.changedTouches) {
return;
}
let identifiers =
Array.from(e.changedTouches).map(touch => {
return touch.identifier;
});
let currentTouches = [];
currentTouches = this._currentTouches.filter(touch => {
return !identifiers.includes(touch.identifier);
});
this._currentTouches = currentTouches;
//touchstartは複数タッチでも一回にまとまって飛んでくるが、
//touchendは指の数だけ飛んでくるっぽい？
//window.console.log('onTouchEnd', this._isMoved, e.changedTouches.length, this._maxCount, this.touchCount);
if (!this._isMoved && this.touchCount === 0) {
const config = this._config;
this._lastTap = this._maxCount;
window.console.info('touchEnd', this._maxCount, this._isMoved);
switch (this._maxCount) {
case 2:
this._execCommand(config.getValue('tap2command'));
break;
case 3:
this._execCommand(config.getValue('tap3command'));
break;
case 4:
this._execCommand(config.getValue('tap4command'));
break;
case 5:
this._execCommand(config.getValue('tap5command'));
break;
}
this._maxCount = 0;
this._isMoved = false;
}
}
_onTouchCancel(e) {
if (!e.changedTouches) {
return;
}
let identifiers =
Array.from(e.changedTouches).map(touch => {
return touch.identifier;
});
let currentTouches = [];
window.console.log('onTouchCancel', this._isMoved, e.changedTouches.length);
currentTouches = this._currentTouches.filter(touch => {
return !identifiers.includes(touch.identifier);
});
this._currentTouches = currentTouches;
}
get touchCount() {
return this._currentTouches.length;
}
_getCenter(e) {
let x = 0, y = 0;
Array.from(e.touches).forEach(t => {
x += t.pageX;
y += t.pageY;
});
return {x: x / e.touches.length, y: y / e.touches.length};
}
}

class StoryboardModel extends Emitter {
constructor(params) {
super();
this._isAvailable = false;
}
_createBlankData(info) {
info = info || {};
Object.assign(info, {
format: 'smile',
status: 'fail',
duration: 1,
url: '',
storyboard: [{
id: 1,
url: '',
thumbnail: {
width: 1,
height: 1,
number: 1,
interval: 1
},
board: {
rows: 1,
cols: 1,
number: 1
}
}]
});
return info;
}
update(info, duration) {
if (!info || info.status !== 'ok') {
this._info = this._createBlankData();
this._isAvailable = false;
} else {
this._info = info;
this._isAvailable = true;
}
if (this.isDmc()) { // dmcはdurationを返してくれないので仕方なく
info.duration = duration;
info.storyboard.forEach(board => {
board.thumbnail.number =
Math.floor(duration * 1000 / board.thumbnail.interval);
});
}
this.emit('update');
}
reset() {
this._isAvailable = false;
this.emit('reset');
}
unload() {
this._isAvailable = false;
this.emit('unload');
}
isAvailable() {
return !!this._isAvailable;
}
hasSubStoryboard() {
return this._info.storyboard.length > 1;
}
getStatus() {
return this._info.status;
}
getMessage() {
return this._info.message;
}
getDuration() {
return parseInt(this._info.duration, 10);
}
isDmc() {
return this._info.format === 'dmc';
}
getUrl(i) {
if (!this.isDmc()) {
return this._info.storyboard[i || 0].url;
} else {
return this._info.storyboard[i || 0].urls[0];
}
}
getWidth(i) {
return parseInt(this._info.storyboard[i || 0].thumbnail.width, 10);
}
getHeight(i) {
return parseInt(this._info.storyboard[i || 0].thumbnail.height, 10);
}
getInterval(i) {
return parseInt(this._info.storyboard[i || 0].thumbnail.interval, 10);
}
getCount(i) {
return Math.max(
Math.ceil(this.getDuration() / Math.max(0.01, this.getInterval())),
parseInt(this._info.storyboard[i || 0].thumbnail.number, 10)
);
}
getRows(i) {
return parseInt(this._info.storyboard[i || 0].board.rows, 10);
}
getCols(i) {
return parseInt(this._info.storyboard[i || 0].board.cols, 10);
}
getPageCount(i) {
return parseInt(this._info.storyboard[i || 0].board.number, 10);
}
getTotalRows(i) {
return Math.ceil(this.getCount(i) / this.getCols(i));
}
getPageWidth(i) {
return this.getWidth(i) * this.getCols(i);
}
getPageHeight(i) {
return this.getHeight(i) * this.getRows(i);
}
getCountPerPage(i) {
return this.getRows(i) * this.getCols(i);
}
/**
* nページ目のURLを返す。 ゼロオリジン
*/
getPageUrl(page, storyboardIndex) {
if (!this.isDmc()) {
page = Math.max(0, Math.min(this.getPageCount(storyboardIndex) - 1, page));
return this.getUrl(storyboardIndex) + '&board=' + (page + 1);
} else {
return this._info.storyboard[storyboardIndex || 0].urls[page];
}
}
/**
* msに相当するサムネは何番目か？を返す
*/
getIndex(ms, storyboardIndex) {
// msec -> sec
let v = Math.floor(ms / 1000);
v = Math.max(0, Math.min(this.getDuration(), v));
// サムネの総数 ÷ 秒数
// Math.maxはゼロ除算対策
let n = this.getCount(storyboardIndex) / Math.max(1, this.getDuration());
return parseInt(Math.floor(v * n), 10);
}
/**
* Indexのサムネイルは何番目のページにあるか？を返す
*/
getPageIndex(thumbnailIndex, storyboardIndex) {
let perPage = this.getCountPerPage(storyboardIndex);
let pageIndex = parseInt(thumbnailIndex / perPage, 10);
return Math.max(0, Math.min(this.getPageCount(storyboardIndex), pageIndex));
}
/**
* msに相当するサムネは何ページの何番目にあるか？を返す
*/
getThumbnailPosition(ms, storyboardIndex) {
let thumbnailIndex = this.getIndex(ms, storyboardIndex);
let pageIndex = this.getPageIndex(thumbnailIndex);
let mod = thumbnailIndex % this.getCountPerPage(storyboardIndex);
let row = Math.floor(mod / Math.max(1, this.getCols()));
let col = mod % this.getRows(storyboardIndex);
return {
page: pageIndex,
index: thumbnailIndex,
row: row,
col: col
};
}
/**
* nページ目のx, y座標をmsに変換して返す
*/
getPointMs(x, y, page, storyboardIndex) {
let width = Math.max(1, this.getWidth(storyboardIndex));
let height = Math.max(1, this.getHeight(storyboardIndex));
let row = Math.floor(y / height);
let col = Math.floor(x / width);
let mod = x % width;
// 何番目のサムネに相当するか？
let point =
page * this.getCountPerPage(storyboardIndex) +
row * this.getCols(storyboardIndex) +
col +
(mod / width) // 小数点以下は、n番目の左端から何%あたりか
;
// 全体の何%あたり？
let percent = point / Math.max(1, this.getCount(storyboardIndex));
percent = Math.max(0, Math.min(100, percent));
// msは㍉秒単位なので1000倍
return Math.floor(this.getDuration() * percent * 1000);
}
/**
* msは何ページ目に当たるか？を返す
*/
getmsPage(ms, storyboardIndex) {
let index = this._storyboard.getIndex(ms, storyboardIndex);
let page = this._storyboard.getPageIndex(index, storyboardIndex);
return page;
}
/**
* nページ目のCols, Rowsがsubではどこになるかを返す
*/
getPointPageColAndRowForSub(page, row, col) {
let mainPageCount = this.getCountPerPage();
let subPageCount = this.getCountPerPage(1);
let mainCols = this.getCols();
let subCols = this.getCols(1);
let mainIndex = mainPageCount * page + mainCols * row + col;
let subOffset = mainIndex % subPageCount;
let subPage = Math.floor(mainIndex / subPageCount);
let subRow = Math.floor(subOffset / subCols);
let subCol = subOffset % subCols;
return {
page: subPage,
row: subRow,
col: subCol
};
}
}
class SeekBarThumbnail {
constructor(params) {
this._container = params.container;
this._scale = _.isNumber(params.scale) ? params.scale : 1.0;
this._preload = _.debounce(this._preload.bind(this), 1000 * 5);
params.storyboard.on('reset', this._onStoryboardReset.bind(this));
params.storyboard.on('update', this._onStoryboardUpdate.bind(this));
ZenzaWatch.debug.seekBarThumbnail = this;
}
_onStoryboardUpdate(model) {
this._model = model;
if (!model.isAvailable()) {
this._isAvailable = false;
this.hide();
return;
}
this.initializeView();
this._isAvailable = true;
let width = this._colWidth = Math.max(1, model.getWidth());
let height = this._rowHeight = Math.max(1, model.getHeight());
let scale = Math.min(
SeekBarThumbnail.BASE_WIDTH / width,
SeekBarThumbnail.BASE_HEIGHT / height
);
Object.assign(this._image.style, {
width: `${width * this._scale}px`,
height: `${height * this._scale}px`,
transform: `scale(${scale})`,
backgroundSize:
`${model.getCols() * width * this._scale}px ${model.getRows() * height * this._scale}px`
});
this._preload(model);
this.show();
}
_onStoryboardReset() {
this.hide();
this._imageUrl = '';
if (this._image) {
this._image.style.backgroundImage = '';
}
}
_preload(model) {
if (!model.isAvailable()) {
return;
}
// セッションの有効期限が切れる前に全部の画像をロードしてキャッシュに収めておく
// やっておかないと、しばらく放置した時に読み込めない
let pages = model.getPageCount();
let v = document.createDocumentFragment();
for (let i = 0; i < pages; i++) {
let url = model.getPageUrl(i);
let img = document.createElement('img');
img.src = url;
img.decoding = 'async';
v.append(img);
}
this._preloadImageContainer.textContent = '';
this._preloadImageContainer.append(v);
}
get isVisible() {
return this._view ? this._view.classList.contains('is-visible') : false;
}
show() {
if (!this._view) {
return;
}
this._view.classList.add('is-visible');
}
hide() {
if (!this._view) {
return;
}
this._view.classList.remove('is-visible');
}
initializeView() {
this.initializeView = _.noop;
if (!SeekBarThumbnail.styleAdded) {
util.addStyle(SeekBarThumbnail.__css__);
SeekBarThumbnail.styleAdded = true;
}
let view = this._view = util.createDom(SeekBarThumbnail.__tpl__).firstElementChild;
this._image = view.querySelector('.zenzaSeekThumbnail-image');
this._preloadImageContainer =
util.createDom('<div class="preloadImageContainer" style="display: none !important;"></div>').firstElementChild;
document.body.append(this._preloadImageContainer);
if (this._container) {
this._container.append(view);
}
}
setCurrentTime(sec) {
if (!this._isAvailable || !this._image) {
return;
}
let ms = Math.floor(sec * 1000);
let model = this._model;
let pos = model.getThumbnailPosition(ms, 0);
let url = model.getPageUrl(pos.page);
let x = pos.col * this._colWidth * -1 * this._scale;
let y = pos.row * this._rowHeight * -1 * this._scale;
let css = {};
let updated = false;
if (this._imageUrl !== url) {
css.backgroundImage = `url(${url})`;
this._imageUrl = url;
updated = true;
}
if (this._imageX !== x || this._imageY !== y) {
css.backgroundPosition = `${x}px ${y}px`;
this._imageX = x;
this._imageY = y;
updated = true;
}
if (updated) {
Object.assign(this._image.style, css);
}
}
}
SeekBarThumbnail.BASE_WIDTH = 160;
SeekBarThumbnail.BASE_HEIGHT = 90;
SeekBarThumbnail.__tpl__ = (`
<div class="zenzaSeekThumbnail">
<div class="zenzaSeekThumbnail-image"></div>
</div>
`).trim();
SeekBarThumbnail.__css__ = (`
.is-error .zenzaSeekThumbnail,
.is-loading .zenzaSeekThumbnail {
display: none !important;
}
.zenzaSeekThumbnail {
display: none;
pointer-events: none;
}
.enableCommentPreview .zenzaSeekThumbnail {
display: none !important;
}
.zenzaSeekThumbnail.is-visible {
display: block;
overflow: hidden;
box-sizing: border-box;
background: rgba(0, 0, 0, 0.3);
margin: 0 auto 4px;
z-index: 100;
}
.zenzaSeekThumbnail-image {
background: none repeat scroll 0 0 #999;
border: 0;
margin: auto;
transform-origin: center top;
transition: background-position 0.1s steps(1, start) 0;
opacity: 0.8;
}
`).trim();
class Storyboard extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
_.assign(Storyboard.prototype, {
initialize: function (params) {
this._playerConfig = params.playerConfig;
this._container = params.container;
this._loader = params.loader || ZenzaWatch.api.StoryboardInfoLoader;
this._initializeStoryboard();
ZenzaWatch.debug.storyboard = this;
},
_initializeStoryboard: function () {
this._initializeStoryboard = _.noop;
if (!this._model) {
this._model = new StoryboardModel({});
}
if (!this._view) {
this._view = new StoryboardView({
model: this._model,
container: this._container,
enable: this._playerConfig.getValue('enableStoryboardBar')
});
}
},
reset: function () {
this._container.classList.remove('storyboardAvailable');
this._model.reset();
this.emit('reset', this._model);
},
onVideoCanPlay: function (watchId, videoInfo) {
if (!util.isPremium()) {
return;
}
if (!this._playerConfig.getValue('enableStoryboard')) {
return;
}
this._watchId = watchId;
this._getStoryboardUrl(videoInfo).then(url => {
if (this._watchId !== watchId) {
return Promise.reject('video changed');
}
if (!url) {
return Promise.reject('getStoryboardUrl failure');
}
this._initializeStoryboard();
return ZenzaWatch.api.StoryboardInfoLoader.load(url);
}).then(
this._onStoryboardInfoLoad.bind(this, watchId, videoInfo.duration)
).catch(
this._onStoryboardInfoLoadFail.bind(this, watchId)
);
},
_getStoryboardUrl: function (videoInfo) {
let url;
if (!videoInfo.hasDmcStoryboard) {
url = videoInfo.storyboardUrl;
return url ? Promise.resolve(url) : Promise.reject('smile storyboard api not exist');
}
const info = videoInfo.dmcStoryboardInfo;
return (new StoryboardSession(info)).create().then(result => {
if (result && result.data && result.data.session && result.data.session.content_uri) {
return Promise.resolve(result.data.session.content_uri);
} else {
return Promise.reject('dmc storyboard api not exist');
}
});
},
_onStoryboardInfoLoad: function (watchId, duration, info) {
if (watchId !== this._watchId) {
return;
} // video changed
this._model.update(info, duration);
this.emit('update', this._model);
this._container.classList.toggle('storyboardAvailable', this._model.isAvailable());
},
_onStoryboardInfoLoadFail: function (watchId, err) {
// window.console.warn('onStoryboardInfoFail', watchId, err);
if (watchId !== this._watchId) {
return;
} // video changed
this._model.update(null);
this.emit('update', this._model);
this._container.classList.remove('storyboardAvailable');
},
setCurrentTime: function (sec, forceUpdate) {
if (this._view && this._model.isAvailable()) {
this._view.setCurrentTime(sec, forceUpdate);
}
},
toggle: function () {
if (this._view) {
this._view.toggle();
this._playerConfig.setValue('enableStoryboardBar', this._view.isEnable());
}
}
});
class StoryboardBlock {
static create(option) {
let height = option.boardHeight;
let backgroundPosition = `0 ${height * option.row * -1}px`;
let view = document.createElement('div');
view.className = 'board';
view.style.cssText = `
background-image: url(${option.src});
background-position: ${backgroundPosition};
left: ${(option.page * option.rows + option.row) * option.pageWidth}px; 
`;
Object.assign(view.dataset, {
src: option.src,
page: option.page,
top: height * option.row + height / 2,
backgroundPosition
});
return view;
}
}
class StoryboardBlockBorder {
static create(cols) {
const v = document.createDocumentFragment();
const items = [];
const tpl = document.createElement('div');
tpl.className = 'border';
for (let i = 0; i < cols; i++) {
items.push(tpl.cloneNode());
}
v.append(...items);
return v;
}
}
class StoryboardBlockList {
constructor(storyboard) {
if (storyboard) {
this.create(storyboard);
}
}
create(storyboard) {
let pages = storyboard.getPageCount();
let pageWidth = storyboard.getPageWidth();
let width = storyboard.getWidth();
let height = storyboard.getHeight();
let rows = storyboard.getRows();
let cols = storyboard.getCols();
let totalRows = storyboard.getTotalRows();
let rowCnt = 0;
this._innerBorder =StoryboardBlockBorder.create(cols);
let view = document.createElement('div');
view.className = 'boardList';
view.style.cssText = `
width: ${storyboard.getCount() * width}px; 
height: ${height}px;
--cell-width: ${width}px;
--cell-height: ${height}px;
--board-width: ${pageWidth}px;
--board-height: ${height}px
`;
this._view = view;
this._blocks = [];
for (let page = 0; page < pages; page++) {
let src = storyboard.getPageUrl(page);
for (let row = 0; row < rows; row++) {
let option = {
width,
pageWidth,
boardHeight: height,
page,
row,
rows,
src
};
this.appendBlock(option);
rowCnt++;
if (rowCnt >= totalRows) {
return;
}
}
}
}
appendBlock(option) {
let block = StoryboardBlock.create(option);
block.append(this._innerBorder.cloneNode(true));
this._blocks.push(block);
this._view.append(...this._blocks);
}
loadImage(pageNumber) {
}
clear() {
this._view.remove();
}
get view() {
return this._view;
}
}
class StoryboardView extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
initialize(params) {
console.log('%c initialize StoryboardView', 'background: lightgreen;');
this._container = params.container;
let sb = this._model = params.model;
this._isHover = false;
this._currentUrl = '';
this._lastPage = -1;
this._lastMs = -1;
this._lastGetMs = -1;
this._scrollLeft = 0;
this._isEnable = _.isBoolean(params.enable) ? params.enable : true;
sb.on('update', this._onStoryboardUpdate.bind(this));
sb.on('reset', this._onStoryboardReset.bind(this));
let frame = this._requestAnimationFrame = new util.RequestAnimationFrame(
this._onRequestAnimationFrame.bind(this)
);
ZenzaWatch.emitter.on('DialogPlayerClose', () => frame.disable());
}
enable() {
this._isEnable = true;
if (this._view && this._model.isAvailable()) {
this.open();
}
}
open() {
if (!this._view) {
return;
}
this._view.classList.add('show');
this._body.classList.add('zenzaStoryboardOpen');
this._container.classList.add('zenzaStoryboardOpen');
this._requestAnimationFrame.enable();
}
close() {
if (!this._view) {
return;
}
this._view.classList.remove('show');
this._body.classList.remove('zenzaStoryboardOpen');
this._container.classList.remove('zenzaStoryboardOpen');
this._requestAnimationFrame.disable();
}
disable() {
this._isEnable = false;
this.close();
}
toggle(v) {
if (typeof v === 'boolean') {
this._isEnable = !v;
}
if (this._isEnable) {
this.disable();
} else {
this.enable();
}
}
isEnable() {
return !!this._isEnable;
}
_initializeStoryboard() {
if (this._body) { return; }
window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');
this._body = document.body;
util.addStyle(StoryboardView.__css__);
let view = this._view = util.createDom(StoryboardView.__tpl__).firstElementChild;
let inner = this._inner = view.querySelector('.storyboardInner');
this._failMessage = view.querySelector('.failMessage');
this._cursorTime = view.querySelector('.cursorTime');
this._pointer = view.querySelector('.storyboardPointer');
this._inner = inner;
view.classList.toggle('webkit', util.isWebkit());
util.$(view)
.on('click', this._onBoardClick.bind(this))
.on('mousemove', this._onBoardMouseMove.bind(this))
.on('mousemove', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
.on('wheel', this._onMouseWheel.bind(this))
.on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));
let onHoverIn = () => this._isHover = true;
let onHoverOut = () => this._isHover = false;
util.$(inner)
.on('mouseenter', onHoverIn)
.on('mouseleave', _.debounce(onHoverOut, 1000))
.on('touchstart', this._onTouchStart.bind(this))
.on('touchmove', this._onTouchMove.bind(this));
this._bouncedOnToucheMoveEnd = _.debounce(this._onTouchMoveEnd.bind(this), 2000);
this._container.append(view);
document.body.addEventListener('touchend',
() => this._isHover = false, {passive: true});
this._innerWidth = window.innerWidth;
window.addEventListener('resize',
_.throttle(() => this._innerWidth = window.innerWidth, 500), {passive: true});
}
_onBoardClick(e) {
let board = e.target.closest('.board');
if (!board) { return; }
let offset = $(board).offset(); // TODO
let y = board.dataset.top * 1;
let x = e.pageX - offset.left;
let page = board.dataset.page * 1;
let ms = this._model.getPointMs(x, y, page);
if (isNaN(ms)) {
return;
}
let view = this._view;
view.classList.add('clicked');
window.setTimeout(() => view.classList.remove('clicked'), 1000);
this._cursorTime.style.transform = 'translate(-100vw, 0)';
util.dispatchCommand(view, 'seekTo', ms / 1000);
}
_onBoardMouseMove(e) {
let board = e.target.closest('.board');
if (!board) { return; }
let offset = $(board).offset(); // TODO
let y = board.dataset.top * 1;
let x = e.pageX - offset.left;
let page = board.dataset.page * 1;
let ms = this._model.getPointMs(x, y, page);
if (isNaN(ms)) {
return;
}
let sec = Math.floor(ms / 1000);
let time = util.secToTime(sec);
if (this._cursorTime.textContent !== time) {
this._cursorTime.textContent = time;
}
this._cursorTime.style.transform = `translate3d(${e.pageX}px, 30px, 0) translate(-50%, -100%)`;
this._isHover = true;
this._isMouseMoving = true;
}
_onBoardMouseMoveEnd(e) {
this._isMouseMoving = false;
}
_onMouseWheel(e) {
// 縦ホイールで左右スクロールできるようにする
e.stopPropagation();
let deltaX = parseInt(e.deltaX, 10);
let delta = parseInt(e.deltaY, 10);
if (Math.abs(deltaX) > Math.abs(delta)) {
// 横ホイールがある環境ならなにもしない
return;
}
e.preventDefault();
this._isHover = true;
this._isMouseMoving = true;
let left = this.scrollLeft();
this.scrollLeft(left + delta * 5, true);
}
_onMouseWheelEnd(e) {
this._isMouseMoving = false;
}
_onTouchStart(e) {
this._isHover = true;
this._isMouseMoving = true;
e.stopPropagation();
}
_onTouchEnd(e) {
}
_onTouchMove(e) {
e.stopPropagation();
this._isHover = true;
this._isMouseMoving = true;
this._isTouchMoving = true;
this._bouncedOnToucheMoveEnd();
}
_onTouchMoveEnd() {
this._isTouchMoving = false;
this._isMouseMoving = false;
}
_onTouchCancel(e) {
}
update() {
this._isHover = false;
this._timerCount = 0;
this._scrollLeft = 0;
this._initializeStoryboard();
this.close();
this._view.classList.remove('success', 'fail');
if (this._model.getStatus() === 'ok') {
this._updateSuccess();
} else {
this._updateFail();
}
}
scrollLeft(left, forceUpdate) {
const inner = this._inner;
if (!inner) {
return 0;
}
if (left === undefined) {
return this._scrollLeft;
} else {
if (Math.abs(this._scrollLeft - left) < 1) {
return;
}
this._scrollLeft = left;
this._scrollLeftChanged = true;
this._scrollBehavior = 'unset';
}
}
_updateSuccess() {
let url = this._model.getUrl();
let view = this._view;
view.classList.add('success');
if (this._currentUrl !== url) {
// 前と同じurl == 同じ動画なら再作成する必要なし
this._currentUrl = url;
window.console.time('createStoryboardDOM');
this._updateSuccessDom();
window.console.timeEnd('createStoryboardDOM');
}
if (this._isEnable) {
view.classList.add('opening', 'show');
this.scrollLeft(0);
this.open();
window.setTimeout(() => view.classList.remove('opening'), 1000);
}
}
_updateSuccessDom() {
let list = new StoryboardBlockList(this._model);
this._storyboardBlockList = list;
this._pointer.style.width = `${this._model.getWidth()}px`;
this._pointer.style.height = `${this._model.getHeight()}px`;
this.clear();
this._inner.append(list.view);
}
_updateFail() {
this._view.classList.remove('success');
this._view.classList.add('fail');
}
clear() {
if (this._inner) {
this._inner.textContent = '';
}
}
_onRequestAnimationFrame() {
if (!this._model.isAvailable()) {
return;
}
if (!this._view) {
return;
}
if (this._scrollLeftChanged) {
this._inner.style.scrollBehavior = this._scrollBehavior;
this._inner.scrollLeft = this._scrollLeft;
this._scrollLeftChanged = false;
this._pointerLeftChanged = true;
}
if (this._pointerLeftChanged) {
this._pointer.style.transform =
`translate3d(${this._pointerLeft - this._scrollLeft}px, 0, 0) translate(-50%, 0)`;
this._pointerLeftChanged = false;
}
}
setCurrentTime(sec, forceUpdate) {
if (!this._model.isAvailable()) {
return;
}
if (!this._view) {
return;
}
if (this._lastCurrentTime === sec) {
return;
}
this._lastCurrentTime = sec;
let ms = sec * 1000;
let storyboard = this._model;
let duration = Math.max(1, storyboard.getDuration());
let per = ms / (duration * 1000);
let width = storyboard.getWidth();
let boardWidth = storyboard.getCount() * width;
let targetLeft = boardWidth * per;
if (this._pointerLeft !== targetLeft) {
this._pointerLeft = targetLeft;
this._pointerLeftChanged = true;
}
if (forceUpdate) {
this.scrollLeft(targetLeft - this._innerWidth * per, true);
} else {
if (this._isHover) {
return;
}
this.scrollLeft(targetLeft - this._innerWidth * per);
}
}
_onScroll() {
}
_onStoryboardUpdate() {
this.update();
}
_onStoryboardReset() {
if (!this._view) {
return;
}
this.close();
this._view.classList.remove('show', 'fail');
}
}
StoryboardView.__tpl__ = `
<div id="storyboardContainer" class="storyboardContainer">
<div class="cursorTime"></div>
<div class="storyboardPointer"></div>
<div class="storyboardInner"></div>
<div class="failMessage"></div>
</div>
`.trim();
StoryboardView.__css__ = (`
.storyboardContainer {
position: absolute;
top: 0;
opacity: 0;
visibility: hidden;
left: 0;
right: 0;
width: 100vw;
box-sizing: border-box;
border-top: 2px solid #ccc;
z-index: 9005;
overflow: hidden;
pointer-events: none;
transform: translateZ(0);
display: none;
contain: layout paint style;
user-select: none;
transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out, visibility 0.2s;
}
.storyboardContainer.opening {
pointer-events: none !important;
}
.storyboardContainer.success {
display: block;
opacity: 0;
}
.storyboardContainer * {
box-sizing: border-box;
}
.is-dragging .storyboardContainer.success,
.storyboardContainer.success.show {
z-index: 50;
opacity: 1;
transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
visibility: visible;
pointer-events: auto;
transform: translate3d(0, -100%, 0) translateY(10px);
}
.is-dragging .storyboardContainer {
pointer-events: none;
}
.is-fullscreen .is-dragging .storyboardContainer,
.is-fullscreen .storyboardContainer.show {
position: fixed;
top: calc(100% - 10px);
}
.storyboardContainer .storyboardInner {
display: none;
text-align: center;
overflow: hidden;
white-space: nowrap;
background: #222;
margin: 0;
contain: paint layout;
will-change: transform;
scrollbar-width: 6px;
scrollbar-color: #f8f transparent;
}
.storyboardInner:hover {
scroll-behavior: unset !important;
}
.storyboardContainer.webkit .storyboardInner,
.storyboardContainer .storyboardInner:hover {
overflow-x: auto;
overscroll-behavior: contain;
}
.storyboardContainer .storyboardInner::-webkit-scrollbar {
width: 6px;
height: 6px;
background: transparent;
contain: paint layout;
will-change: transform;
}
.storyboardContainer .storyboardInner::-webkit-scrollbar-thumb {
border-radius: 6px;
background: #f8f;
}
.storyboardContainer .storyboardInner::-webkit-scrollbar-button {
display: none;
}
.storyboardContainer.success .storyboardInner {
display: block;
}
.storyboardContainer .storyboardInner .boardList {
overflow: hidden;
contain: paint layout style size;
}
.storyboardContainer .boardList .board {
position: absolute;
top: 0;
display: inline-block;
cursor: pointer;
background-color: #101010;
width: var(--board-width);
height: var(--board-height);
contain: paint layout style size;
}
.storyboardContainer.clicked .storyboardInner * {
opacity: 0.3;
pointer-events: none;
}
.storyboardContainer .boardList .board.loadFail {
background-color: #c99;
}
.storyboardContainer .boardList .board > div {
white-space: nowrap;
}
.storyboardContainer .boardList .board .border {
box-sizing: border-box;
border-style: solid;
border-color: #000 #333 #000 #999;
border-width: 0 2px 0 2px;
display: inline-block;
pointer-events: none;
width: var(--cell-width);
height: var(--cell-height);
}
.storyboardContainer .cursorTime {
display: none;
position: absolute;
top: 0;
left: 0;
padding: 4px 8px;
font-size: 10pt;
border: 1px solid #000;
z-index: 9010;
background: #ffc;
pointer-events: none;
}
.storyboardContainer:hover .cursorTime {
transition: transform 0.1s ease-out;
display: block;
}
.storyboardContainer.clicked .cursorTime,
.storyboardContainer.opening .cursorTime {
display: none;
}
.storyboardPointer {
position: absolute;
top: 0;
z-index: 100;
pointer-events: none;
transform: translate3d(-50%, 0, 0);
transition: transform 0.1s linear;
background: #ff9;
opacity: 0.5;
}
.storyboardContainer:hover .storyboardPointer {
box-shadow: 0 0 8px #ccc;
transition: transform 0.4s ease-out;
}
`).trim();

class VideoControlBar extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
VideoControlBar.BASE_HEIGHT = CONSTANT.CONTROL_BAR_HEIGHT;
VideoControlBar.BASE_SEEKBAR_HEIGHT = 10;
util.addStyle(`
.videoControlBar {
position: fixed;
bottom: 0;
left: 0;
transform: translate3d(0, 0, 0);
width: 100vw;
height: var(--zenza-control-bar-height, ${VideoControlBar.BASE_HEIGHT}px);
z-index: 150000;
background: #000;
transition: opacity 0.3s ease, transform 0.3s ease;
user-select: none;
contain: layout;
}
.videoControlBar * {
box-sizing: border-box;
user-select: none;
}
.controlItemContainer {
position: absolute;
top: 10px;
height: 40px;
z-index: 200;
}
.controlItemContainer:hover,
.videoControlBar.is-menuOpen .controlItemContainer {
z-index: 260;
}
.controlItemContainer.left {
left: 0;
height: 40px;
white-space: nowrap;
overflow: visible;
transition: transform 0.2s ease, left 0.2s ease;
}
.controlItemContainer.left .scalingUI {
padding: 0 8px 0;
}
.controlItemContainer.left .scalingUI:empty {
display: none;
}
.controlItemContainer.left .scalingUI>* {
background: #222;
display: inline-block;
}
.controlItemContainer.center {
left: 50%;
height: 40px;
transform: translate(-50%, 0);
background:
linear-gradient(to bottom,
transparent, transparent 4px, #222 0, #222 30px, transparent 0, transparent);
white-space: nowrap;
overflow: visible;
transition: transform 0.2s ease, left 0.2s ease;
}
.controlItemContainer.center .scalingUI {
transform-origin: top center;
}
.controlItemContainer.right {
right: 0;
}
.is-mouseMoving .controlItemContainer.right .controlButton{
background: #333;
}
.controlItemContainer.right .scalingUI {
transform-origin: top right;
}
.controlButton {
position: relative;
display: inline-block;
transition: opacity 0.4s ease;
font-size: 20px;
width: 32px;
height: 32px;
line-height: 30px;
box-sizing: border-box;
text-align: center;
cursor: pointer;
color: #fff;
opacity: 0.8;
margin-right: 8px;
min-width: 32px;
vertical-align: middle;
outline: none; 
}
.controlButton:hover {
cursor: pointer;
opacity: 1;
}
.controlButton:active .controlButtonInner {
transform: translate(0, 2px);
}
.is-abort .playControl,
.is-error .playControl,
.is-loading .playControl {
opacity: 0.4 !important;
pointer-events: none;
}
.controlButton .tooltip {
display: none;
pointer-events: none;
position: absolute;
left: 16px;
top: -30px;
transform: translate(-50%, 0);
font-size: 12px;
line-height: 16px;
padding: 2px 4px;
border: 1px solid #000;
background: #ffc;
color: #000;
text-shadow: none;
white-space: nowrap;
z-index: 100;
opacity: 0.8;
}
.is-mouseMoving .controlButton:hover .tooltip {
display: block;
opacity: 1;
}
.videoControlBar:hover .controlButton {
opacity: 1;
pointer-events: auto;
}
.videoControlBar .controlButton:focus-within {
pointer-events: none;
}
.videoControlBar .controlButton:focus-within .zenzaPopupMenu,
.videoControlBar .controlButton .zenzaPopupMenu:hover {
pointer-events: auto;
visibility: visible;
opacity: 0.99;
pointer-events: auto;
transition: opacity 0.3s;
}
.videoControlBar .controlButton:focus-within .tooltip {
display: none;
}
.settingPanelSwitch {
width: 32px;
}
.settingPanelSwitch:hover {
text-shadow: 0 0 8px #ff9;
}
.settingPanelSwitch .tooltip {
left: 0;
}
.videoControlBar .zenzaSubMenu {
left: 50%;
transform: translate(-50%, 0);
bottom: 44px;
white-space: nowrap;
}
.videoControlBar .triangle {
transform: translate(-50%, 0) rotate(-45deg);
bottom: -8.5px;
left: 50%;
}
.controlButtonInner {
display: inline-block;
}
.seekTop {
left: 0px;
width: 32px;
transform: scale(1.1);
}
.togglePlay {
width: 36px;
transition: transform 0.2s ease;
transform: scale(1.1);
}
.togglePlay:active {
transform: scale(0.75);
}
.togglePlay .play,
.togglePlay .pause {
display: inline-block;
position: absolute;
top: 50%;
left: 50%;
transition: transform 0.1s linear, opacity 0.1s linear;
user-select: none;
pointer-events: none;
}
.togglePlay .play {
width: 100%;
height: 100%;
transform: scale(1.2) translate(-50%, -50%) translate(10%, 10%);
}
.is-playing .togglePlay .play {
opacity: 0;
}
.togglePlay>.pause {
width: 24px;
height: 16px;
background-image: linear-gradient(
to right, 
transparent 0, transparent 12.5%, 
currentColor 0, currentColor 43.75%, 
transparent 0, transparent 56.25%, 
currentColor 0, currentColor 87.5%, 
transparent 0);
opacity: 0;
transform: scaleX(0);
}
.is-playing .togglePlay>.pause {
opacity: 1;
transform: translate(-50%, -50%);
}
.seekBarContainer {
position: absolute;
top: 0;
left: 0;
width: 100%;
cursor: pointer;
z-index: 250;
}
/* 見えないマウス判定 */
.seekBarContainer .seekBarShadow {
position: absolute;
background: transparent;
opacity: 0;
width: 100vw;
height: 8px;
top: -8px;
}
.is-mouseMoving .seekBarContainer:hover .seekBarShadow {
height: 48px;
top: -48px;
}
.is-abort .seekBarContainer,
.is-loading .seekBarContainer,
.is-error .seekBarContainer {
pointer-events: none;
}
.is-abort .seekBarContainer *,
.is-error .seekBarContainer * {
display: none;
}
.seekBar {
position: relative;
width: 100%;
height: 10px;
margin: 2px 0 2px;
border-top: 1px solid #333;
border-bottom: 1px solid #333;
cursor: pointer;
transition: height 0.2s ease 1s, margin-top 0.2s ease 1s;
}
.seekBar:hover {
height: 24px;
/* このmargin-topは見えないマウスオーバー判定を含む */
margin-top: -14px;
transition: none;
background-color: rgba(0, 0, 0, 0.5);
}
.seekBarContainer .seekBar * {
pointer-events: none;
}
.bufferRange {
position: absolute;
width: 100%;
height: 110%;
left: 0px;
top: 0px;
box-shadow: 0 0 6px #ff9 inset, 0 0 4px #ff9;
z-index: 190;
background: #ff9;
transform-origin: left;
transform: translate3d(0, 0, 0) scaleX(0);
transition: transform 0.2s;
mix-blend-mode: overlay;
opacity: 0.6;
}
.is-youTube .bufferRange {
width: 100% !important;
height: 110% !important;
background: #f99;
transition: transform 0.5s ease 1s;
transform: translate3d(0, 0, 0) scaleX(1) !important;
}
.seekBarPointer {
position: absolute;
display: inline-block;
top: 50%;
left: 0;
width: 12px;
background: rgba(255, 255, 255, 0.7);
height: calc(100% + 2px);
z-index: 200;
box-shadow: 0 0 4px #ffc inset;
pointer-events: none;
transform: translate3d(-6px, -50%, 0);
mix-blend-mode: lighten;
}
.is-loading .seekBarPointer {
display: none !important;
}
.is-dragging .seekBarPointer.is-notSmooth {
transition: none;
}
@keyframes seekBarPointerMove {
0% { transform: translate3d(-6px, -50%, 0) translate3d(0, 0, 0); }
100% { transform: translate3d(-6px, -50%, 0) translate3d(100vw, 0, 0); }
}
.videoControlBar .videoTime {
display: inline-flex;
top: 0;
padding: 0;
color: #fff;
font-size: 12px;
white-space: nowrap;
vertical-align: middle;
background: rgba(33, 33, 33, 0.5);
border: 0;
pointer-events: none;
user-select: none;
}
.videoControlBar .videoTime .currentTime,
.videoControlBar .videoTime .duration {
display: inline-block;
color: #fff;
text-align: center;
background: inherit;
border: 0;
width: 44px;
font-family: 'Yu Gothic', 'YuGothic', 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace;
}
.videoControlBar.is-loading .videoTime {
display: none;
}
.seekBarContainer .tooltip {
position: absolute;
padding: 1px;
bottom: 12px;
left: 0;
transform: translate(-50%, 0);
white-space: nowrap;
font-size: 10px;
opacity: 0;
border: 1px solid #000;
background: #fff;
color: #000;
z-index: 150;
}
.is-dragging .seekBarContainer .tooltip,
.seekBarContainer:hover .tooltip {
opacity: 0.8;
}
.resumePointer {
position: absolute;
mix-blend-mode: color-dodge;
top: 0;
z-index: 200;
}
.zenzaHeatMap {
position: absolute;
pointer-events: none;
top: 0; left: 0;
width: 100%;
height: 100%;
transform-origin: 0 0 0;
transform: translateZ(0);
opacity: 0.5;
z-index: 110;
}
.noHeatMap .zenzaHeatMap {
display: none;
}
.loopSwitch {
width: 32px;
height: 32px;
line-height: 30px;
font-size: 20px;
color: #888;
}
.loopSwitch:active {
font-size: 15px;
}
.is-loop .loopSwitch {
color: var(--enabled-button-color);
}
.loopSwitch .controlButtonInner {
font-family: STIXGeneral;
}
.playbackRateMenu {
bottom: 0;
width: auto;
min-width: 40px;
height: 32px;
line-height: 30px;
font-size: 18px;
white-space: nowrap;
margin-right: 0;
}
.playbackRateSelectMenu {
width: 180px;
text-align: left;
line-height: 20px;
font-size: 18px !important;
}
.playbackRateSelectMenu ul {
margin: 2px 8px;
}
.playbackRateSelectMenu li {
padding: 3px 4px;
}
.screenModeMenu {
width: 32px;
height: 32px;
line-height: 30px;
font-size: 20px;
}
.screenModeMenu:active {
font-size: 15px;
}
.screenModeMenu:focus-within {
background: #888;
}
.screenModeMenu:focus-within .tooltip {
display: none;
}
.screenModeMenu:active {
font-size: 10px;
}
.screenModeSelectMenu {
width: 148px;
padding: 2px 4px;
font-size: 12px;
line-height: 15px;
}
.screenModeSelectMenu ul {
display: grid;
grid-template-columns: 1fr 1fr;
}
.screenModeSelectMenu ul li {
display: inline-block;
text-align: center;
border: none !important;
margin: 0 !important;
padding: 0 !important;
}
.screenModeSelectMenu ul li span {
border: 1px solid #ccc;
width: 50px;
margin: 2px 8px;
padding: 4px 0;
}
body[data-screen-mode="3D"] .screenModeSelectMenu li.mode3D span,
body[data-screen-mode="sideView"] .screenModeSelectMenu li.sideView span,
body[data-screen-mode="small"] .screenModeSelectMenu li.small span,
body[data-screen-mode="normal"] .screenModeSelectMenu li.normal span,
body[data-screen-mode="big"] .screenModeSelectMenu li.big span,
body[data-screen-mode="wide"] .screenModeSelectMenu li.wide span {
color: #ff9;
border-color: #ff0;
}
.fullscreenControlBarModeMenu {
display: none;
}
.fullscreenControlBarModeMenu .controlButtonInner {
filter: grayscale(100%);
}
.fullscreenControlBarModeMenu:focus-within .controlButtonInner,
.fullscreenControlBarModeMenu:hover .controlButtonInner {
filter: grayscale(50%);
}
.is-fullscreen .fullscreenSwitch .controlButtonInner .toFull,
body:not(.is-fullscreen) .fullscreenSwitch .controlButtonInner .returnFull {
display: none;
}
.videoControlBar .muteSwitch {
margin-right: 0;
}
.videoControlBar .muteSwitch:active {
font-size: 15px;
}
.zenzaPlayerContainer:not(.is-mute) .muteSwitch .mute-on,
.is-mute .muteSwitch .mute-off {
display: none;
}
.videoControlBar .volumeControl {
display: inline-block;
width: 64px;
height: 8px;
position: relative;
vertical-align: middle;
margin-right: 16px;
--back-color: #333;
--fore-color: #ccc;
background-color: var(--back-color);
}
.is-mute .videoControlBar .volumeControl {
pointer-events: none;
background-image: unset !important;
}
.videoControlBar .volumeControl .tooltip {
display: none;
pointer-events: none;
position: absolute;
left: 6px;
top: -24px;
font-size: 12px;
line-height: 16px;
padding: 2px 4px;
border: 1px solid #000;
background: #ffc;
color: black;
text-shadow: none;
white-space: nowrap;
z-index: 100;
}
.videoControlBar .volumeControl:hover .tooltip {
display: block;
}
.prevVideo.playControl,
.nextVideo.playControl {
display: none;
}
.is-playlistEnable .prevVideo.playControl,
.is-playlistEnable .nextVideo.playControl {
display: inline-block;
}
.prevVideo,
.nextVideo {
font-size: 23px;
}
.prevVideo .controlButtonInner {
transform: scaleX(-1);
}
.toggleStoryboard {
visibility: hidden;
pointer-events: none;
}
.storyboardAvailable .toggleStoryboard {
visibility: visible;
pointer-events: auto;
}
.zenzaStoryboardOpen .storyboardAvailable .toggleStoryboard {
color: var(--enabled-button-color);
}
.toggleStoryboard .controlButtonInner {
position: absolute;
width: 20px;
height: 20px;
top: 50%;
left: 50%;
border-radius: 75% 16%;
border: 1px solid;
transform: translate(-50%, -50%) rotate(45deg);
pointer-events: none;
background: 
radial-gradient(
currentColor,
currentColor 6px, 
transparent 0
);
}
.toggleStoryboard:active .controlButtonInner {
transform: translate(-50%, -50%) scaleY(0.1) rotate(45deg);
}
.toggleStoryboard:active {
transform: scale(0.75);
}
.videoServerTypeMenu {
bottom: 0;
min-width: 40px;
height: 32px;
line-height: 30px;
font-size: 16px;
white-space: nowrap;
}
.videoServerTypeMenu.is-dmc-playing {
text-shadow:
0px 0px 8px var(--enabled-button-color), 
0px 0px 6px var(--enabled-button-color), 
0px 0px 4px var(--enabled-button-color),
0px 0px 2px var(--enabled-button-color);
}
.is-mouseMoving .videoServerTypeMenu.is-dmc-playing {
background: #336;
}
.is-youTube .videoServerTypeMenu {
text-shadow:
0px 0px 8px #fc9, 0px 0px 6px #fc9, 0px 0px 4px #fc9, 0px 0px 2px #fc9 !important;
}
.is-youTube .videoServerTypeMenu:not(.forYouTube),
.videoServerTypeMenu.forYouTube {
display: none;
}
.is-youTube .videoServerTypeMenu.forYouTube {
display: inline-block;
}
.videoServerTypeMenu:active {
font-size: 13px;
}
.videoServerTypeMenu:focus-within {
background: #888;
}
.videoServerTypeMenu:focus-within .tooltip {
display: none;
}
.videoServerTypeSelectMenu {
bottom: 44px;
left: 50%;
transform: translate(-50%, 0);
width: 180px;
text-align: left;
line-height: 20px;
font-size: 16px !important;
text-shadow: none !important;
cursor: default;
}
.videoServerTypeSelectMenu ul {
margin: 2px 8px;
}
.videoServerTypeSelectMenu li {
padding: 3px 4px;
}
.videoServerTypeSelectMenu li.selected {
pointer-events: none;
text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
}
.videoServerTypeSelectMenu .smileVideoQuality,
.videoServerTypeSelectMenu .dmcVideoQuality {
font-size: 80%;
padding-left: 28px;
}
.videoServerTypeSelectMenu .currentVideoQuality {
color: #ccf;
font-size: 80%;
text-align: center;
}
.videoServerTypeSelectMenu .dmcVideoQuality.selected span:before,
.videoServerTypeSelectMenu .smileVideoQuality.selected span:before {
left: 22px;
font-size: 80%;
}
.videoServerTypeSelectMenu .currentVideoQuality.selected span:before {
display: none;
}
/* dmcを使用不能の時はdmc選択とdmc画質選択を薄く */
.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc,
.zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality,
.zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
opacity: 0.4;
pointer-events: none;
text-shadow: none !important;
}
.zenzaPlayerContainer:not(.is-dmcAvailable) .currentVideoQuality {
display: none;
}
.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType.select-server-dmc span:before,
.zenzaPlayerContainer:not(.is-dmcAvailable) .dmcVideoQuality span:before{
display: none !important;
}
.zenzaPlayerContainer:not(.is-dmcAvailable) .serverType {
pointer-events: none;
}
/* dmcを使用している時はsmileの画質選択を薄く */
.is-dmc-playing .smileVideoQuality {
display: none;
}
/* dmcを選択していない状態ではdmcの画質選択を隠す */
.is-smile-playing .currentVideoQuality,
.is-smile-playing .dmcVideoQuality {
display: none;
}
@media screen and (max-width: 864px) {
.controlItemContainer.center {
left: 0%;
transform: translate(0, 0);
}
}
.ZenzaWatchVer {
display: none;
}
.ZenzaWatchVer[data-env="DEV"] {
display: inline-block;
color: #999;
position: absolute;
right: 0;
background: transparent !important;
transform: translate(100%, 0);
font-size: 12px;
line-height: 32px;
pointer-events: none;
}
.progressWave {
display: none;
}
.is-stalled .progressWave,
.is-loading .progressWave {
display: inline-block;
position: absolute;
left: 0;
top: 1px;
z-index: 400;
width: 40%;
height: calc(100% - 2px);
background: linear-gradient(
to right,
rgba(0,0,0,0),
${util.toRgba('#ffffcc', 0.3)},
rgba(0,0,0)
);
mix-blend-mode: lighten;
animation-name: progressWave;
animation-iteration-count: infinite;
animation-duration: 4s;
animation-timing-function: linear;
animation-delay: -1s;
}
@keyframes progressWave {
0% { transform: translate3d(-100%, 0, 0) translate3d(-5vw, 0, 0); }
100% { transform: translate3d(100%, 0, 0) translate3d(150vw, 0, 0); }
}
.is-seeking .progressWave {
display: none;
}
`, {className: 'videoControlBar'});
util.addStyle(`
.videoControlBar {
width: 100% !important; /* 100vwだと縦スクロールバーと被る */
}
`, {className: 'screenMode for-popup videoControlBar', disabled: true});
util.addStyle(`
body .videoControlBar {
position: absolute !important; /* firefoxのバグ対策 */
opacity: 0;
background: none;
}
.volumeChanging .videoControlBar,
.is-mouseMoving .videoControlBar {
opacity: 0.7;
background: rgba(0, 0, 0, 0.5);
}
.showVideoControlBar .videoControlBar {
opacity: 1 !important;
background: #000 !important;
}
.videoControlBar.is-dragging,
.videoControlBar:hover {
opacity: 1;
background: rgba(0, 0, 0, 0.9);
}
.fullscreenControlBarModeMenu {
display: inline-block;
}
.fullscreenControlBarModeSelectMenu {
padding: 2px 4px;
font-size: 12px;
line-height: 15px;
font-size: 16px !important;
text-shadow: none !important;
}
.fullscreenControlBarModeSelectMenu ul {
margin: 2px 8px;
}
.fullscreenControlBarModeSelectMenu li {
padding: 3px 4px;
}
.videoServerTypeSelectMenu li.selected {
pointer-events: none;
text-shadow: 0 0 4px #99f, 0 0 8px #99f !important;
}
.fullscreenControlBarModeMenu li:focus-within,
body[data-fullscreen-control-bar-mode="auto"] .fullscreenControlBarModeMenu [data-param="auto"],
body[data-fullscreen-control-bar-mode="always-show"] .fullscreenControlBarModeMenu [data-param="always-show"],
body[data-fullscreen-control-bar-mode="always-hide"] .fullscreenControlBarModeMenu [data-param="always-hide"] {
color: #ff9;
outline: none;
}
`, {className: 'screenMode for-full videoControlBar', disabled: true});
util.addStyle(`
.screenModeSelectMenu {
display: none;
}
.controlItemContainer.left {
top: auto;
transform-origin: top left;
}
.seekBarContainer {
top: auto;
bottom: 0;
z-index: 300;
}
.seekBarContainer:hover .seekBarShadow {
height: 14px;
top: -12px;
}
.seekBar {
margin-top: 0px;
margin-bottom: -14px;
height: 24px;
transition: none;
}
.screenModeMenu {
display: none;
}
.controlItemContainer.center {
top: auto;
}
.zenzaStoryboardOpen .controlItemContainer.center {
background: transparent;
}
.zenzaStoryboardOpen .controlItemContainer.center .scalingUI {
background: rgba(32, 32, 32, 0.5);
}
.zenzaStoryboardOpen .controlItemContainer.center .scalingUI:hover {
background: rgba(32, 32, 32, 0.8);
}
.controlItemContainer.right {
top: auto;
}
`, {className: 'screenMode for-screen-full videoControlBar', disabled: true});
VideoControlBar.__tpl__ = (`
<div class="videoControlBar" data-command="nop">
<div class="seekBarContainer">
<div class="seekBarShadow"></div>
<div class="seekBar">
<div class="seekBarPointer"></div>
<div class="bufferRange"></div>
<div class="progressWave"></div>
</div>
<zenza-seekbar-label class="resumePointer" data-command="seekTo" data-text="ここまで見た">
</zenza-seekbar-label>
</div>
<div class="controlItemContainer left">
<div class="scalingUI">
<div class="ZenzaWatchVer" data-env="${ZenzaWatch.env}">ver ${ZenzaWatch.version}${ZenzaWatch.env === 'DEV' ? '(Dev)' : ''}</div>
</div>
</div>
<div class="controlItemContainer center">
<div class="scalingUI">
<div class="toggleStoryboard controlButton playControl forPremium" data-command="toggleStoryboard">
<div class="controlButtonInner"></div>
<div class="tooltip">シーンサーチ</div>
</div>
<div class="loopSwitch controlButton playControl" data-command="toggle-loop">
<div class="controlButtonInner">&#8635;</div>
<div class="tooltip">リピート</div>
</div>
<div class="seekTop controlButton playControl" data-command="seek" data-param="0">
<div class="controlButtonInner">&#8676;<!-- &#x23EE; --><!--&#9475;&#9666;&#9666;--></div>
<div class="tooltip">先頭</div>
</div>
<div class="togglePlay controlButton playControl" data-command="togglePlay">
<span class="pause"></span>
<span class="play">▶</span>
</div>
<div class="playbackRateMenu controlButton" tabindex="-1" data-has-submenu="1">
<div class="controlButtonInner">x1</div>
<div class="tooltip">再生速度</div>
<div class="playbackRateSelectMenu zenzaPopupMenu zenzaSubMenu">
<div class="triangle"></div>
<p class="caption">再生速度</p>
<ul>
<li class="playbackRate" data-command="playbackRate" data-param="10"><span>10倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="5" ><span>5倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="4" ><span>4倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="3" ><span>3倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="2" ><span>2倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="1.75"><span>1.75倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="1.5"><span>1.5倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="1.25"><span>1.25倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="1.0"><span>標準速度(x1)</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="0.75"><span>0.75倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="0.5"><span>0.5倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="0.25"><span>0.25倍</span></li>
<li class="playbackRate" data-command="playbackRate" data-param="0.1"><span>0.1倍</span></li>
</ul>
</div>
</div>
<div class="videoTime">
<input type="text" class="currentTime" value="00:00">/<input type="text" class="duration" value="00:00">
</div>
<div class="muteSwitch controlButton" data-command="toggle-mute">
<div class="tooltip">ミュート(M)</div>
<div class="menuButtonInner mute-off">&#x1F50A;</div>
<div class="menuButtonInner mute-on">&#x1F507;</div>
</div>
<div class="volumeControl">
<div class="tooltip">音量調整</div>
</div>
<div class="prevVideo controlButton playControl" data-command="playPreviousVideo" data-param="0">
<div class="controlButtonInner">&#x27A0;</div>
<div class="tooltip">前の動画</div>
</div>
<div class="nextVideo controlButton playControl" data-command="playNextVideo" data-param="0">
<div class="controlButtonInner">&#x27A0;</div>
<div class="tooltip">次の動画</div>
</div>
</div>
</div>
<div class="controlItemContainer right">
<div class="scalingUI">
<div class="videoServerTypeMenu controlButton forYouTube" data-command="reload" title="ZenTube解除">
<div class="controlButtonInner">画</div>
</div>
<div class="videoServerTypeMenu controlButton" tabindex="-1" data-has-submenu="1">
<div class="controlButtonInner">画</div>
<div class="tooltip">動画サーバー・画質</div>
<div class="videoServerTypeSelectMenu zenzaPopupMenu zenzaSubMenu">
<div class="triangle"></div>
<p class="caption">動画サーバー・画質</p>
<ul>
<li class="serverType select-server-dmc" data-command="update-videoServerType" data-param="dmc">
<span>新システムを使用</span>
<p class="currentVideoQuality"></p>
</li>
<li class="dmcVideoQuality selected select-dmc-auto" data-command="update-dmcVideoQuality" data-param="auto"><span>自動(auto)</span></li>
<li class="dmcVideoQuality selected select-dmc-veryhigh" data-command="update-dmcVideoQuality" data-param="veryhigh"><span>超(1080) 優先</span></li>
<li class="dmcVideoQuality selected select-dmc-high" data-command="update-dmcVideoQuality" data-param="high"><span>高(720) 優先</span></li>
<li class="dmcVideoQuality selected select-dmc-mid" data-command="update-dmcVideoQuality" data-param="mid"><span>中(480-540)</span></li>
<li class="dmcVideoQuality selected select-dmc-low" data-command="update-dmcVideoQuality" data-param="low"><span>低(360)</span></li>
<li class="serverType select-server-smile" data-command="update-videoServerType" data-param="smile">
<span>旧システムを使用</span>
</li>
<li class="smileVideoQuality select-smile-default" data-command="update-forceEconomy" data-param="false" data-type="bool"><span>自動</span></li>
<li class="smileVideoQuality select-smile-economy" data-command="update-forceEconomy" data-param="true" data-type="bool"><span>エコノミー固定</span></li>
</ul>
</div>
</div>
<div class="screenModeMenu controlButton" tabindex="-1" data-has-submenu="1">
<div class="tooltip">画面サイズ・モード変更</div>
<div class="controlButtonInner">&#9114;</div>
<div class="screenModeSelectMenu zenzaPopupMenu zenzaSubMenu">
<div class="triangle"></div>
<p class="caption">画面モード</p>
<ul>
<li class="screenMode mode3D" data-command="screenMode" data-param="3D"><span>3D</span></li>
<li class="screenMode small" data-command="screenMode" data-param="small"><span>小</span></li>
<li class="screenMode sideView" data-command="screenMode" data-param="sideView"><span>横</span></li>
<li class="screenMode normal" data-command="screenMode" data-param="normal"><span>中</span></li>
<li class="screenMode wide" data-command="screenMode" data-param="wide"><span>WIDE</span></li>
<li class="screenMode big" data-command="screenMode" data-param="big"><span>大</span></li>
</ul>
</div>
</div>
<div class="fullscreenControlBarModeMenu controlButton" tabindex="-1" data-has-submenu="1">
<div class="tooltip">ツールバーの表示</div>
<div class="controlButtonInner">&#128204;</div>
<div class="fullscreenControlBarModeSelectMenu zenzaPopupMenu zenzaSubMenu">
<div class="triangle"></div>
<p class="caption">ツールバーの表示</p>
<ul>
<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-show"><span>常に固定</span></li>
<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="always-hide"><span>常に隠す</span></li>
<li tabindex="-1" data-command="update-fullscreenControlBarMode" data-param="auto"><span>画面サイズ自動</span></li>
</ul>
</div>
</div>
<div class="fullscreenSwitch controlButton" data-command="fullscreen">
<div class="tooltip">フルスクリーン(F)</div>
<div class="controlButtonInner">
<!-- TODO: YouTubeと同じにする -->
<span class="toFull">&#8690;</span>
<span class="returnFull">&#8689;</span>
</div>
</div>
<div class="settingPanelSwitch controlButton" data-command="settingPanel">
<div class="controlButtonInner">&#x2699;</div>
<div class="tooltip">設定</div>
</div>
</div>
</div>
</div>
`).trim();
_.assign(VideoControlBar.prototype, {
initialize: function(params) {
this._playerConfig = params.playerConfig;
this._$playerContainer = params.$playerContainer;
this._playerState = params.playerState;
let player = this._player = params.player;
player.on('open', this._onPlayerOpen.bind(this));
player.on('canPlay', this._onPlayerCanPlay.bind(this));
player.on('durationChange', this._onPlayerDurationChange.bind(this));
player.on('close', this._onPlayerClose.bind(this));
player.on('progress', this._onPlayerProgress.bind(this));
player.on('loadVideoInfo', this._onLoadVideoInfo.bind(this));
player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 100));
this._initializeDom();
this._initializeScreenModeSelectMenu();
this._initializePlaybackRateSelectMenu();
this._initializeVolumeControl();
this._initializeVideoServerTypeSelectMenu();
this._isFirstVideoInitialized = false;
ZenzaWatch.debug.videoControlBar = this;
},
_initializeDom: function() {
let $view = this._$view = $(VideoControlBar.__tpl__);
let $container = this._$playerContainer;
let config = this._playerConfig;
this._$seekBarContainer = $view.find('.seekBarContainer');
this._$seekBar = $view.find('.seekBar');
this._pointer = new SmoothSeekBarPointer({
pointer: $view.find('.seekBarPointer')[0],
playerState: this._playerState
});
this._bufferRange = $view.find('.bufferRange')[0];
this._$seekBar
.on('mousedown', this._onSeekBarMouseDown.bind(this))
.on('mousemove', this._onSeekBarMouseMove.bind(this))
.on('mousemove', _.debounce(this._onSeekBarMouseMoveEnd.bind(this), 1000));
$view.on('click', this._onClick.bind(this));
this._$view[0].addEventListener('command', this._onCommandEvent.bind(this));
this._$currentTime = $view.find('.currentTime');
this._$duration = $view.find('.duration');
this._resumePointer = $view.find('zenza-seekbar-label')[0];
this._heatMap = new HeatMap({
$container: this._$seekBarContainer.find('.seekBar')
});
let updateHeatMapVisibility = v => {
this._$seekBarContainer.toggleClass('noHeatMap', !v);
};
updateHeatMapVisibility(this._playerConfig.getValue('enableHeatMap'));
this._playerConfig.on('update-enableHeatMap', updateHeatMapVisibility);
this._storyboard = new Storyboard({
playerConfig: config,
player: this._player,
container: $view[0]
});
this._seekBarToolTip = new SeekBarToolTip({
$container: this._$seekBarContainer,
storyboard: this._storyboard
});
this._commentPreview = new CommentPreview({
$container: this._$seekBarContainer
});
let updateEnableCommentPreview = v => {
this._$seekBarContainer.toggleClass('enableCommentPreview', v);
this._commentPreview.mode = v ? 'list' : 'hover';// setIsEnable(v);
};
updateEnableCommentPreview(config.getValue('enableCommentPreview'));
config.on('update-enableCommentPreview', updateEnableCommentPreview);
this._$screenModeMenu = $view.find('.screenModeMenu');
this._$screenModeSelectMenu = $view.find('.screenModeSelectMenu');
this._$playbackRateMenu = $view.find('.playbackRateMenu');
this._$playbackRateSelectMenu = $view.find('.playbackRateSelectMenu');
this._$videoServerTypeMenu = $view.find('.videoServerTypeMenu');
this._$videoServerTypeSelectMenu = $view.find('.videoServerTypeSelectMenu');
ZenzaWatch.emitter.on('hideHover', () => {
this._hideMenu();
this._commentPreview.hide();
});
$container.append($view);
this._width = this._$seekBarContainer.innerWidth();
},
_initializeScreenModeSelectMenu: function() {
},
_initializePlaybackRateSelectMenu: function() {
let config = this._playerConfig;
let $btn = this._$playbackRateMenu;
let $label = $btn.find('.controlButtonInner');
let $menu = this._$playbackRateSelectMenu;
let updatePlaybackRate = rate => {
$label.text(`x${rate}`);
$menu.find('.selected').removeClass('selected');
let fr = Math.floor( parseFloat(rate, 10) * 100) / 100;
$menu.find('.playbackRate').each((i, item) => {
let r = parseFloat(item.getAttribute('data-param'), 10);
if (fr === r) {
item.classList.add('selected');
}
});
this._pointer.playbackRate = rate;
};
updatePlaybackRate(config.getValue('playbackRate'));
config.on('update-playbackRate', updatePlaybackRate);
},
_initializeVolumeControl: function() {
let $container = this._$view.find('.volumeControl');
let tooltip = $container.find('.tooltip').get(0);
let $body = $('body');
let $window = $(window);
let config = this._playerConfig;
let setVolumeBar = this._setVolumeBar = v => {
let per = `${Math.round(v * 100)}%`;
$container.css('background-image',
`linear-gradient(to right, var(--fore-color), var(--fore-color) ${per}, var(--back-color) 0, var(--back-color))`);
tooltip.textContent = `音量 (${per})`;
};
let posToVol = x => {
let width = $container.outerWidth();
let vol = x / width;
return Math.max(0, Math.min(vol, 1.0));
};
let onBodyMouseMove = e => {
let offset = $container.offset();
let scale = Math.max(0.1, parseFloat(config.getValue('menuScale'), 10));
let left = (e.clientX - offset.left) / scale;
let vol = posToVol(left);
util.dispatchCommand(e.target, 'volume', vol);
};
let bindDragEvent = () => {
let unbindDragEvent = () => {
$body
.off('mousemove.ZenzaWatchVolumeBar')
.off('mouseup.ZenzaWatchVolumeBar');
$window.off('blur.ZenzaWatchVolumeBar');
};
$body
.on('mousemove.ZenzaWatchVolumeBar', onBodyMouseMove)
.on('mouseup.ZenzaWatchVolumeBar', unbindDragEvent);
$window.on('blur.ZenzaWatchVolumeBar', unbindDragEvent);
};
let onVolumeBarMouseDown = e => {
e.preventDefault();
e.stopPropagation();
util.dispatchCommand(e.target, 'volume', posToVol(e.offsetX));
bindDragEvent();
};
$container.on('mousedown', onVolumeBarMouseDown);
setVolumeBar(this._playerConfig.getValue('volume'));
this._playerConfig.on('update-volume', setVolumeBar);
},
_initializeVideoServerTypeSelectMenu: function() {
const config = this._playerConfig;
const $button = this._$videoServerTypeMenu;
const $select = this._$videoServerTypeSelectMenu;
const $current = $select.find('.currentVideoQuality');
const updateSmileVideoQuality = value => {
const $dq = $select.find('.smileVideoQuality');
$dq.removeClass('selected');
$select.find('.select-smile-' + (value === 'eco' ? 'economy' : 'default')).addClass('selected');
};
const updateDmcVideoQuality = value => {
const $dq = $select.find('.dmcVideoQuality');
$dq.removeClass('selected');
$select.find('.select-dmc-' + value).addClass('selected');
};
const onVideoServerType = (type, videoSessionInfo) => {
$button.removeClass('is-smile-playing is-dmc-playing')
.addClass(`is-${type === 'dmc' ? 'dmc' : 'smile'}-playing`);
$select.find('.serverType').removeClass('selected');
$select.find(`.select-server-${type === 'dmc' ? 'dmc' : 'smile'}`).addClass('selected');
$current.text(type !== 'dmc' ? '----' : videoSessionInfo.videoFormat.replace(/^.*h264_/, ''));
};
updateSmileVideoQuality( config.getValue('smileVideoQuality'));
updateDmcVideoQuality(config.getValue('dmcVideoQuality'));
config.on('update-forceEconomy', updateSmileVideoQuality);
config.on('update-dmcVideoQuality', updateDmcVideoQuality);
this._player.on('videoServerType', onVideoServerType);
},
_onCommandEvent: function(e) {
const command = e.detail.command;
switch (command) {
case 'toggleStoryboard':
this._storyboard.toggle();
break;
default:
return;
}
e.stopPropagation();
},
_onClick: function(e) {
e.preventDefault();
let target = e.target.closest('[data-command]');
if (!target) {
return;
}
let {command, param, type} = target.dataset;
if (param && (type === 'bool' || type === 'json')) {
param = JSON.parse(param);
}
switch (command) {
case 'toggleStoryboard':
this._storyboard.toggle();
break;
default:
util.dispatchCommand(target, command, param);
break;
}
e.stopPropagation();
},
_posToTime: function(pos) {
let width = this._$seekBar.innerWidth();
return this._duration * (pos / Math.max(width, 1));
},
_timeToPos: function(time) {
return this._width * (time / Math.max(this._duration, 1));
},
_timeToPer: function(time) {
return (time / Math.max(this._duration, 1)) * 100;
},
_onPlayerOpen: function() {
this._startTimer();
this.setDuration(0);
this.setCurrentTime(0);
this._heatMap.reset();
this._storyboard.reset();
this.resetBufferedRange();
},
_onPlayerCanPlay: function(watchId, videoInfo) {
let duration = this._player.getDuration();
this.setDuration(duration);
this._storyboard.onVideoCanPlay(watchId, videoInfo);
this._heatMap.setDuration(duration);
},
_onCommentParsed: function() {
this._chatList = this._player.getChatList();
this._heatMap.setChatList(this._chatList);
this._commentPreview.setChatList(this._chatList);
},
_onCommentChange: function() {
this._chatList = this._player.getChatList();
this._heatMap.setChatList(this._chatList);
this._commentPreview.setChatList(this._chatList);
},
_onPlayerDurationChange: function() {
this._pointer.duration = this._playerState.videoInfo.duration;
this._heatMap.setChatList(this._chatList);
},
_onPlayerClose: function() {
this._stopTimer();
},
_onPlayerProgress: function(range, currentTime) {
this.setBufferedRange(range, currentTime);
},
_startTimer: function() {
this._timerCount = 0;
this._timer = window.setInterval(this._onTimer.bind(this), 100);
},
_stopTimer: function() {
if (this._timer) {
window.clearInterval(this._timer);
this._timer = null;
}
},
_onSeekBarMouseDown: function(e) {
e.preventDefault();
e.stopPropagation();
let left = e.offsetX;
let sec = this._posToTime(left);
util.dispatchCommand(e.target, 'seek', sec);
this._beginMouseDrag();
},
_onSeekBarMouseMove: function(e) {
if (!this._$view.hasClass('is-dragging')) {
e.stopPropagation();
}
let left = e.offsetX;
let sec = this._posToTime(left);
this._seekBarMouseX = left;
this._commentPreview.setCurrentTime(sec);
this._commentPreview.update(left);
this._seekBarToolTip.update(sec, left);
},
_onSeekBarMouseMoveEnd: function(e) {
},
_beginMouseDrag: function() {
this._bindDragEvent();
this._$view.addClass('is-dragging');
},
_endMouseDrag: function() {
this._unbindDragEvent();
this._$view.removeClass('is-dragging');
},
_onBodyMouseMove: function(e) {
let offset = this._$seekBar.offset();
let left = e.clientX - offset.left;
let sec = this._posToTime(left);
util.dispatchCommand(this._$view[0], 'seek', sec);
this._seekBarToolTip.update(sec, left);
this._storyboard.setCurrentTime(sec, true);
},
_onBodyMouseUp: function() {
this._endMouseDrag();
},
_onWindowBlur: function() {
this._endMouseDrag();
},
_bindDragEvent: function() {
$('body')
.on('mousemove.ZenzaWatchSeekBar', this._onBodyMouseMove.bind(this))
.on('mouseup.ZenzaWatchSeekBar', this._onBodyMouseUp.bind(this));
$(window).on('blur.ZenzaWatchSeekBar', this._onWindowBlur.bind(this));
},
_unbindDragEvent: function() {
$('body')
.off('mousemove.ZenzaWatchSeekBar')
.off('mouseup.ZenzaWatchSeekBar');
$(window).off('blur.ZenzaWatchSeekBar');
},
_onTimer: function() {
this._timerCount++;
let player = this._player;
let currentTime = player.getCurrentTime();
if (this._timerCount % 2 === 0) {
this.setCurrentTime(currentTime);
}
this._storyboard.setCurrentTime(currentTime);
},
_onLoadVideoInfo: function(videoInfo) {
this.setDuration(videoInfo.duration);
if (!this._isFirstVideoInitialized) {
this._isFirstVideoInitialized = true;
const handler = (command, param) => this.emit('command', command, param);
ZenzaWatch.emitter.emitAsync('videoControBar.addonMenuReady',
this._$view[0].querySelector('.controlItemContainer.left .scalingUI'), handler
);
ZenzaWatch.emitter.emitAsync('seekBar.addonMenuReady',
this._$view[0].querySelector('.seekBar'), handler
);
}
this._resumePointer.setAttribute('duration', videoInfo.duration);
this._resumePointer.setAttribute('time', videoInfo.initialPlaybackTime);
},
setCurrentTime: function(sec) {
if (this._currentTime === sec) { return; }
this._currentTime = sec;
let currentTimeText = util.secToTime(sec);
if (this._currentTimeText !== currentTimeText) {
this._currentTimeText = currentTimeText;
this._$currentTime[0].value = currentTimeText;
}
this._pointer.currentTime = sec;
},
setDuration: function(sec) {
if (sec === this._duration) { return; }
this._duration = sec;
this._pointer.duration = sec;
this._pointer.currentTime = -1;
if (sec === 0 || isNaN(sec)) {
this._$duration[0].value = '--:--';
}
this._$duration[0].value = util.secToTime(sec);
this.emit('durationChange');
},
setBufferedRange: function(range, currentTime) {
let bufferRange = this._bufferRange;
if (!range || !range.length || !this._duration) {
return;
}
for (let i = 0, len = range.length; i < len; i++) {
try {
let start = range.start(i);
let end = range.end(i);
let width = end - start;
if (start <= currentTime && end >= currentTime) {
if (this._bufferStart !== start ||
this._bufferEnd !== end) {
const perLeft = (this._timeToPer(start) - 1);
const scaleX = (this._timeToPer(width) + 2) / 100;
bufferRange.style.transform =
`translate3d(${perLeft}%, 0, 0) scaleX(${scaleX})`;
this._bufferStart = start;
this._bufferEnd = end;
}
break;
}
} catch (e) {
}
}
},
resetBufferedRange: function() {
this._bufferStart = 0;
this._bufferEnd = 0;
this._bufferRange.style.transform = 'scaleX(0)';
},
_hideMenu: function() {
document.body.focus();
}
});
class HeatMapModel extends Emitter {
constructor(params) {
super();
this._resolution = params.resolution || HeatMapModel.RESOLUTION;
this.reset();
}
}
HeatMapModel.RESOLUTION = 100;
_.assign(HeatMapModel.prototype, {
reset: function() {
this._duration = -1;
this._chatReady = false;
this.emit('reset');
},
setDuration: function(duration) {
if (this._duration === duration) { return; }
this._duration = duration;
this.update();
},
setChatList: function(comment) {
this._chat = comment;
this._chatReady = true;
this.update();
},
update: function() {
if (this._duration < 0 || !this._chatReady) {
return;
}
let map = this._getHeatMap();
this.emitAsync('update', map);
ZenzaWatch.emitter.emit('heatMapUpdate', {map, duration: this._duration});
// 無駄な処理を避けるため同じ動画では2回作らないようにしようかと思ったけど、
// CoreMのマシンでも数ミリ秒程度なので気にしない事にした。
// Firefoxはもうちょっとかかるかも
//this._isUpdated = true;
},
_getHeatMap: function() {
let chatList =
this._chat.top.concat(this._chat.naka, this._chat.bottom);
let duration = this._duration;
if (!duration) { return; }
let map = new Array(Math.max(Math.min(this._resolution, Math.floor(duration)), 1));
let i = map.length;
while(i > 0) map[--i] = 0;
let ratio = duration > map.length ? (map.length / duration) : 1;
for (i = chatList.length - 1; i >= 0; i--) {
let nicoChat = chatList[i];
let pos = nicoChat.getVpos();
let mpos = Math.min(Math.floor(pos * ratio / 100), map.length -1);
map[mpos]++;
}
return map;
}
});
class HeatMapView {
constructor(params) {
this._model = params.model;
this._$container = params.$container;
this._width = params.width || 100;
this._height = params.height || 10;
this._model.on('update', this._onUpdate.bind(this));
this._model.on('reset', this._onReset.bind(this));
}
}
_.assign(HeatMapView.prototype, {
_canvas: null,
_palette: null,
_width: 100,
_height: 12,
_initializePalette: function() {
this._palette = [];
for (let c = 0; c < 256; c++) {
let
r = Math.floor((c > 127) ? (c / 2 + 128) : 0),
g = Math.floor((c > 127) ? (255 - (c - 128) * 2) : (c * 2)),
b = Math.floor((c > 127) ? 0 : (255 - c * 2));
this._palette.push(`rgb(${r}, ${g}, ${b})`);
}
},
_initializeCanvas: function() {
this._canvas = document.createElement('canvas');
this._canvas.className = 'zenzaHeatMap';
this._canvas.width = this._width;
this._canvas.height = this._height;
this._$container.append(this._canvas);
this._context = this._canvas.getContext('2d');
this.reset();
},
_onUpdate: function(map) {
this.update(map);
},
_onReset: function() {
this.reset();
},
reset: function() {
if (!this._context) { return; }
this._context.fillStyle = this._palette[0];
this._context.beginPath();
this._context.fillRect(0, 0, this._width, this._height);
},
update: function(map) {
if (!this._isInitialized) {
this._isInitialized = true;
this._initializePalette();
this._initializeCanvas();
this.reset();
}
console.time('update HeatMap');
// 一番コメント密度が高い所を100%として相対的な比率にする
// 赤い所が常にピークになってわかりやすいが、
// コメントが一カ所に密集している場合はそれ以外が薄くなってしまうのが欠点
let max = 0, i;
// -4 してるのは、末尾にコメントがやたら集中してる事があるのを集計対象外にするため (ニコニ広告に付いてたコメントの名残？)
for (i = Math.max(map.length - 4, 0); i >= 0; i--) max = Math.max(map[i], max);
if (max > 0) {
let rate = 255 / max;
for (i = map.length - 1; i >= 0; i--) {
map[i] = Math.min(255, Math.floor(map[i] * rate));
}
} else {
console.timeEnd('update HeatMap');
return;
}
let
scale = map.length >= this._width ? 1 : (this._width / Math.max(map.length, 1)),
blockWidth = (this._width / map.length) * scale,
context = this._context;
for (i = map.length - 1; i >= 0; i--) {
context.fillStyle = this._palette[parseInt(map[i], 10)] || this._palette[0];
context.beginPath();
context.fillRect(i * scale, 0, blockWidth, this._height);
}
console.timeEnd('update HeatMap');
}
});
class HeatMap {
constructor(params) {
this._model = new HeatMapModel({});
this._view = new HeatMapView({
model: this._model,
$container: params.$container
});
this.reset();
}
reset() {
this._model.reset();
}
setDuration(duration) {
this._model.setDuration(duration);
}
setChatList(chatList) {
this._model.setChatList(chatList);
}
}
class CommentPreviewModel extends Emitter {
constructor() {
super();
}
}
_.assign(CommentPreviewModel.prototype, {
reset: function() {
this._chatReady = false;
this._vpos = -1;
this.emit('reset');
},
setChatList: function(chatList) {
let list = chatList.top.concat(chatList.naka, chatList.bottom);
list.sort((a, b) => {
let av = a.getVpos(), bv = b.getVpos();
return av - bv;
});
this._chatList = list;
this._chatReady = true;
this.update();
},
getChatList: function() {
return this._chatList || [];
},
setCurrentTime: function(sec) {
this.setVpos(sec * 100);
},
setVpos: function(vpos) {
if (this._vpos !== vpos) {
this._vpos = vpos;
this.emit('vpos', vpos);
}
},
getCurrentIndex: function() {
if (this._vpos < 0 || !this._chatReady) {
return -1;
}
return this.getVposIndex(this._vpos);
},
getVposIndex: function(vpos) {
let list = this._chatList;
for (let i = list.length - 1; i >= 0; i--) {
let chat = list[i], cv = chat.getVpos();
if (cv <= vpos - 400) {
return i + 1;
}
}
return -1;
},
getCurrentChatList: function() {
if (this._vpos < 0 || !this._chatReady) {
return [];
}
return this.getItemByVpos(this._vpos);
},
getItemByVpos: function(vpos) {
let list = this._chatList;
let result = [];
for (let i = 0, len = list.length; i < len; i++) {
let chat = list[i], cv = chat.getVpos(), diff = vpos - cv;
if (diff >= -100 && diff <= 400) {
result.push(chat);
}
}
return result;
},
getItemByUniqNo: function(uniqNo) {
return this._chatList.find(chat => chat.getUniqNo() === uniqNo);
},
update: function() {
this.emit('update');
}
});
class CommentPreviewView {
constructor(params) {
let model = this._model = params.model;
this._$parent = params.$container;
this._inviewTable = {};
this._chatList = [];
this._initializeDom(this._$parent);
model.on('reset', this._onReset.bind(this));
model.on('update', _.debounce(this._onUpdate.bind(this), 10));
// model.on('vpos', _.throttle(this._onVpos .bind(this), 100));
model.on('vpos', this._onVpos.bind(this));
this._mode = 'hover';
this.update = _.throttle(this.update.bind(this), 200);
}
_initializeDom($parent) {
let $view = $(CommentPreviewView.__tpl__);
let view = this._view = $view[0];
this._list = view.querySelector('.listContainer');
view.addEventListener('click', this._onClick.bind(this));
view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
view.addEventListener('scroll',
_.throttle(this._onScroll.bind(this), 50, {trailing: false}), {passive: true});
$parent.append($view);
}
set mode(v) {
if (v === 'list') {
util.StyleSwitcher.update({
on: '.commentPreview.list', off: '.commentPreview.hover'});
} else {
util.StyleSwitcher.update({
on: '.commentPreview.hover', off: '.commentPreview.list'});
}
this._mode = v;
}
_onClick(e) {
e.stopPropagation();
let target = e.target.closest('[data-command]');
let view = this._view;
let command = target ? target.dataset.command : '';
let nicoChatElement = e.target.closest('.nicoChat');
let uniqNo = parseInt(nicoChatElement.dataset.nicochatUniqNo, 10);
let nicoChat = this._model.getItemByUniqNo(uniqNo);
if (command && nicoChat) {
view.classList.add('is-updating');
window.setTimeout(() => view.classList.remove('is-updating'), 3000);
switch (command) {
case 'addUserIdFilter':
util.dispatchCommand(e.target, command, nicoChat.getUserId());
break;
case 'addWordFilter':
util.dispatchCommand(e.target, command, nicoChat.getText());
break;
case 'addCommandFilter':
util.dispatchCommand(e.target, command, nicoChat.getCmd());
break;
}
return;
}
let vpos = nicoChatElement.dataset.vpos;
if (vpos !== undefined) {
util.dispatchCommand(e.target, 'seek', vpos / 100);
}
}
_onUpdate() {
this._updateList();
}
_onVpos(vpos) {
let itemHeight = CommentPreviewView.ITEM_HEIGHT;
let index = this._currentStartIndex = Math.max(0, this._model.getCurrentIndex());
this._currentEndIndex = Math.max(0, this._model.getVposIndex(vpos + 400));
this._scrollTop = itemHeight * index;
this._currentTime = vpos / 100;
this._refreshInviewElements(this._scrollTop);
}
_onResize() {
this._refreshInviewElements();
}
_onScroll() {
this._scrollTop = -1;
this._refreshInviewElements();
}
_onReset() {
this._list.textContent = '';
this._inviewTable = {};
this._scrollTop = 0;
this._newListElements = null;
this._chatList = [];
}
_updateList() {
let chatList = this._chatList = this._model.getChatList();
if (chatList.length < 1) {
// this.hide();
this._isListUpdated = false;
return;
}
let itemHeight = CommentPreviewView.ITEM_HEIGHT;
this._list.style.height = `${(chatList.length + 2) * itemHeight}px`;
this._isListUpdated = false;
}
_refreshInviewElements(scrollTop) {
if (!this._view) { return; }
let itemHeight = CommentPreviewView.ITEM_HEIGHT;
scrollTop = _.isNumber(scrollTop) ? scrollTop : this._view.scrollTop;
let viewHeight = CommentPreviewView.MAX_HEIGHT;
let viewBottom = scrollTop + viewHeight;
let chatList = this._chatList;
if (!chatList || chatList.length < 1) { return; }
let startIndex =
this._mode === 'list' ?
Math.max(0, Math.floor(scrollTop / itemHeight) - 5) :
this._currentStartIndex;
let endIndex =
this._mode === 'list' ?
Math.min(chatList.length, Math.floor(viewBottom / itemHeight) + 5) :
Math.min(this._currentEndIndex, this._currentStartIndex + 15);
let i;
let newItems = [], inviewTable = this._inviewTable;
for (i = startIndex; i < endIndex; i++) {
let chat = chatList[i];
if (inviewTable[i] || !chat) { continue; }
let listItem = CommentPreviewChatItem.create(chat, i);
newItems.push(listItem);
inviewTable[i] = listItem;
}
if (newItems.length < 1) { return; }
Object.keys(inviewTable).forEach(i => {
if (i >= startIndex && i <= endIndex) { return; }
inviewTable[i].remove();
delete inviewTable[i];
});
this._newListElements = this._newListElements || document.createDocumentFragment();
this._newListElements.append(...newItems);
this._applyView();
}
_isEmpty() {
return this._chatList.length < 1;
}
update(left) {
if (this._isListUpdated) {
this._updateList();
}
if (this._isEmpty()) {
return;
}
let width = this._mode === 'list' ?
CommentPreviewView.WIDTH : CommentPreviewView.HOVER_WIDTH;
let containerWidth = window.innerWidth;
left = Math.min(Math.max(0, left - CommentPreviewView.WIDTH / 2), containerWidth - width);
this._left = left;
requestAnimationFrame(() => this._applyView());
}
_applyView() {
let view = this._view;
view.style.setProperty('--current-time', CSS.number ? CSS.number(this._currentTime) : this._currentTime);
view.style.setProperty('--scroll-top', CSS.number ? CSS.number(this._scrollTop) : this._scrollTop);
if (this._newListElements) {
this._list.append(this._newListElements);
this._newListElements = null;
}
if (this._scrollTop > 0 && this._mode === 'list') {
this._view.scrollTop = this._scrollTop;
this._scrollTop = -1;
}
view.style.transform = `translate3d(${this._left}px, 0, 0)`;
}
hide() {
// this._isShowing = false;
// this._$view.removeClass('show');
}
}
class CommentPreviewChatItem {
static get html() {
return `
<li class="nicoChat">
<span class="vposTime"></span>
<span class="text"></span>
<span class="addFilter addUserIdFilter"
data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
<span class="addFilter addWordFilter"
data-command="addWordFilter" title="NGワード">NGword</span>
</li>
`.trim();
}
static get template() {
if (!this._template) {
const t = document.createElement('template');
t.id = `${this.name}_${Date.now()}`;
t.innerHTML = this.html;
let content = t.content;
document.body.appendChild(t);
this._template = {
clone: () => document.importNode(t.content, true),
chat: content.querySelector('.nicoChat'),
time: content.querySelector('.vposTime'),
text: t.content.querySelector('.text')
};
}
return this._template;
}
static create(chat, idx) {
let itemHeight = CommentPreviewView.ITEM_HEIGHT;
let text = chat.getText();
let date = (new Date(chat.getDate() * 1000)).toLocaleString();
let vpos = chat.getVpos();
let no = chat.getNo();
let uniqNo = chat.getUniqNo();
let oe = idx % 2 === 0 ? 'even' : 'odd';
let title = `${no} : 投稿日 ${date}\nID:${chat.getUserId()}\n${text}\n`;
let color = chat.getColor() || '#fff';
let shadow = color === '#fff' ? '' : `text-shadow: 0 0 1px ${color};`;
let vposToTime = vpos => util.secToTime(Math.floor(vpos / 100));
let t = this.template;
t.chat.className = `nicoChat fork${chat.getFork()} ${oe}`;
t.chat.id = `commentPreviewItem${idx}`;
t.chat.dataset.vpos = vpos;
t.chat.dataset.nicochatUniqNo = uniqNo;
t.time.textContent = `${vposToTime(vpos)}: `;
t.text.title = title;
t.text.style = shadow;
t.text.textContent = text;
t.chat.style.cssText = `
top: ${idx * itemHeight}px;
--duration: ${chat.getDuration()};
--vpos: ${chat.getVpos()}
`;
return t.clone().firstElementChild;
}
}
CommentPreviewView.MAX_HEIGHT = 200;
CommentPreviewView.WIDTH = 350;
CommentPreviewView.HOVER_WIDTH = 180;
CommentPreviewView.ITEM_HEIGHT = 20;
CommentPreviewView.__tpl__ = (`
<div class="zenzaCommentPreview">
<div class="listContainer"></div>
</div>
`).trim();
util.addStyle(`
.zenzaCommentPreview {
display: none;
position: absolute;
bottom: 16px;
opacity: 0.8;
max-height: ${CommentPreviewView.MAX_HEIGHT}px;
width: ${CommentPreviewView.WIDTH}px;
box-sizing: border-box;
color: #ccc;
overflow: hidden;
transform: translate3d(0, 0, 0);
transition: transform 0.2s;
}
.zenzaCommentPreview * {
box-sizing: border-box;
}
.seekBarContainer:hover .zenzaCommentPreview {
display: block;
}
`, {className: 'commentPreview'});
util.addStyle(`
.zenzaCommentPreview {
border-bottom: 24px solid transparent;
background: rgba(0, 0, 0, 0.4);
z-index: 100;
overflow: auto;
}
.zenzaCommentPreview:hover {
background: black;
}
.zenzaCommentPreview.is-updating {
transition: opacity 0.2s ease;
opacity: 0.3;
cursor: wait;
}
.zenzaCommentPreview.is-updating * {
pointer-evnets: none;
}
.listContainer {
bottom: auto;
padding: 4px;
pointer-events: none;
}
.zenzaCommentPreview:hover .listContainer {
pointer-events: auto;
}
.listContainer .nicoChat {
position: absolute;
left: 0;
display: block;
width: 100%;
height: ${CommentPreviewView.ITEM_HEIGHT}px;
padding: 2px 4px;
cursor: pointer;
white-space: nowrap;
text-overflow: ellipsis;
overflow: hidden;
animation-duration: calc(var(--duration) * 1s);
animation-delay: calc(((var(--vpos) / 100) - var(--current-time)) * 1s - 1s);
animation-name: preview-text-inview;
animation-timing-function: linear;
animation-play-state: paused !important;
}
@keyframes preview-text-inview {
0% {
color: #ffc;
}
100% {
color: #ffc;
}
}
.listContainer:hover .nicoChat.odd {
background: #333;
}
.listContainer .nicoChat.fork1 .vposTime {
color: #6f6;
}
.listContainer .nicoChat.fork2 .vposTime {
color: #66f;
}
.listContainer .nicoChat .no,
.listContainer .nicoChat .date,
.listContainer .nicoChat .userId {
display: none;
}
.listContainer .nicoChat:hover .no,
.listContainer .nicoChat:hover .date,
.listContainer .nicoChat:hover .userId {
display: inline-block;
white-space: nowrap;
}
.listContainer .nicoChat .text {
color: inherit !important;
}
.listContainer .nicoChat:hover .text {
color: #fff !important;
}
.listContainer .nicoChat .text:hover {
text-decoration: underline;
}
.listContainer .nicoChat .addFilter {
display: none;
position: absolute;
font-size: 10px;
color: #fff;
background: #666;
cursor: pointer;
top: 0;
}
.listContainer .nicoChat:hover .addFilter {
display: inline-block;
border: 1px solid #ccc;
box-shadow: 2px 2px 2px #333;
}
.listContainer .nicoChat .addFilter.addUserIdFilter {
right: 8px;
width: 48px;
}
.listContainer .nicoChat .addFilter.addWordFilter {
right: 64px;
width: 48px;
}
.listContainer .nicoChat .addFilter:active {
transform: translateY(2px);
}
.zenzaScreenMode_sideView .zenzaCommentPreview,
.zenzaScreenMode_small .zenzaCommentPreview {
background: rgba(0, 0, 0, 0.9);
}
`, {className: 'commentPreview list'});
util.addStyle(`
.zenzaCommentPreview {
bottom: 24px;
box-sizing: border-box;
height: 140px;
z-index: 160;
transition: none;
color: #fff;
opacity: 0.6;
overflow: hidden;
pointer-events: none;
user-select: none;
contain: layout style size paint;
filter: drop-shadow(0 0 1px #000);
}
.listContainer {
bottom: auto;
width: 100%;
height: 100% !important;
margin: auto;
border: none;
contain: layout style size paint;
}
.listContainer .nicoChat {
display: block;
top: auto !important;
font-size: 16px;
line-height: 18px;
height: 18px;
white-space: nowrap;
}
.listContainer .nicoChat:nth-child(n + 8) {
transform: translateY(-144px);
}
.listContainer .nicoChat:nth-child(n + 16) {
transform: translateY(-288px);
}
.listContainer .nicoChat .text {
display: inline-block;
text-shadow: 1px 1px 1px #fff;
transform: translateX(260px);
visibility: hidden; 
will-change: transform;
animation-duration: calc(var(--duration) * 1s);
animation-delay: calc(((var(--vpos) / 100) - var(--current-time)) * 1s - 1s);
animation-play-state: paused !important;
animation-name: preview-text-moving;
animation-timing-function: linear;
animation-fill-mode: forwards;
}
.listContainer .nicoChat .vposTime,
.listContainer .nicoChat .addFilter {
display: none !important;
}
@keyframes preview-text-moving {
0% {
visibility: visible;
}
100% {
visibility: hidden;
transform: translateX(85px) translateX(-100%);
}
}
`, {className: 'commentPreview hover', disabled: true});
class CommentPreview {
constructor(params) {
this._model = new CommentPreviewModel({});
this._view = new CommentPreviewView({
model: this._model,
$container: params.$container
});
this.reset();
}
reset() {
this._model.reset();
this._view.hide();
}
setChatList(chatList) {
this._model.setChatList(chatList);
}
setCurrentTime(sec) {
this._model.setCurrentTime(sec);
}
update(left) {
this._view.update(left);
}
hide() {
}
set mode(v) {
if (v === this._mode) { return; }
this._mode = v;
this._view.mode = v;
}
get mode() {
return this._mode;
}
}
class SeekBarToolTip {
constructor(params) {
this._$container = params.$container;
this._storyboard = params.storyboard;
this._initializeDom(params.$container);
this._boundOnRepeat = this._onRepeat.bind(this);
this._boundOnMouseUp = this._onMouseUp.bind(this);
}
}
SeekBarToolTip.__css__ = (`
.seekBarToolTip {
position: absolute;
display: none;
z-index: 300;
position: absolute;
box-sizing: border-box;
bottom: 16px;
left: 0;
width: 180px;
white-space: nowrap;
font-size: 10px;
background: rgba(0, 0, 0, 0.3);
z-index: 150;
opacity: 0;
border: 1px solid #666;
border-radius: 8px;
padding: 8px 4px 0;
transform: translate3d(0, 0, 10px);
transition: transform 0.1s steps(1, start) 0, opacity 0.2s ease 0.5s;
pointer-events: none;
}
.is-dragging .seekBarToolTip,
.seekBarContainer:hover .seekBarToolTip {
opacity: 1;
display: inline-block;
}
.seekBarToolTipInner {
padding-bottom: 10px;
pointer-events: auto;
display: flex;
text-align: center;
vertical-aligm: middle;
width: 100%;
}
.is-dragging .seekBarToolTipInner {
pointer-events: none;
}
.seekBarToolTipInner>* {
flex: 1;
}
.seekBarToolTip .currentTime {
display: inline-block;
height: 16px;
margin: 4px 0;
padding: 0 8px;
color: #ccc;
text-align: center;
font-size: 12px;
line-height: 16px;
text-shadow: 0 0 2px #000;
}
.seekBarToolTip .controlButton {
display: inline-block;
width: 40px;
height: 28px;
line-height: 22px;
font-size: 20px;
border-radius: 50%;
margin: 0;
cursor: pointer;
}
.seekBarToolTip .controlButton * {
cursor: pointer;
}
.seekBarToolTip .controlButton:hover {
text-shadow: 0 0 8px #fe9;
box-shdow: 0 0 8px #fe9;
}
.seekBarToolTip .controlButton:active {
font-size: 16px;
}
.seekBarToolTip .controlButton.toggleCommentPreview {
opacity: 0.5;
}
.enableCommentPreview .seekBarToolTip .controlButton.toggleCommentPreview {
opacity: 1;
background: rgba(0,0,0,0.01);
}
.is-fullscreen .seekBarToolTip {
bottom: 10px;
}
`).trim();
SeekBarToolTip.__tpl__ = (`
<div class="seekBarToolTip">
<div class="seekBarThumbnailContainer"></div>
<div class="seekBarToolTipInner">
<div class="seekBarToolTipButtonContainer">
<div class="controlButton backwardSeek" data-command="seekBy" data-param="-5" title="5秒戻る" data-repeat="on">
<div class="controlButtonInner">⇦</div>
</div>
<div class="currentTime"></div>
<div class="controlButton toggleCommentPreview" data-command="toggleConfig" data-param="enableCommentPreview" title="コメントのプレビュー表示">
<div class="menuButtonInner">💬</div>
</div>
<div class="controlButton forwardSeek" data-command="seekBy" data-param="5" title="5秒進む" data-repeat="on">
<div class="controlButtonInner">⇨</div>
</div>
</div>
</div>
</div>
`).trim();
_.assign(SeekBarToolTip .prototype, {
_initializeDom: function($container) {
util.addStyle(SeekBarToolTip.__css__);
let $view = this._$view = $(SeekBarToolTip.__tpl__);
this._currentTime = $view.find('.currentTime')[0];
$view
.on('mousedown',this._onMouseDown.bind(this))
.on('click', e => { e.stopPropagation(); e.preventDefault(); });
this._seekBarThumbnail = new SeekBarThumbnail({
storyboard: this._storyboard,
container: $view.find('.seekBarThumbnailContainer')[0]
});
$container.append($view);
},
_onMouseDown: function(e) {
e.stopPropagation();
let target = e.target.closest('[data-command]');
if (!target) {
return;
}
let command = target.dataset.command;
if (!command) { return; }
let param = target.dataset.param;
let repeat = target.dataset.repeat === 'on';
util.dispatchCommand(e.target, command, param);
if (repeat) {
this._beginRepeat(command, param);
}
},
_onMouseUp: function(e) {
e.preventDefault();
this._endRepeat();
},
_beginRepeat(command, param) {
this._repeatCommand = command;
this._repeatParam = param;
$('body').on('mouseup.zenzaSeekbarToolTip', this._boundOnMouseUp);
this._$view.on('mouseleave mouseup', this._boundOnMouseUp);
if (this._repeatTimer) {
window.clearInterval(this._repeatTimer);
}
this._repeatTimer = window.setInterval(this._boundOnRepeat, 200);
this._isRepeating = true;
},
_endRepeat: function() {
this._isRepeating = false;
if (this._repeatTimer) {
window.clearInterval(this._repeatTimer);
this._repeatTimer = null;
}
$('body').off('mouseup.zenzaSeekbarToolTip');
this._$view.off('mouseleave mouseup');
},
_onRepeat: function() {
if (!this._isRepeating) {
this._endRepeat();
return;
}
util.dispatchCommand(this._$view[0], this._repeatCommand, this._repeatParam);
},
update: function(sec, left) {
let timeText = util.secToTime(sec);
if (this._timeText === timeText) { return; }
this._timeText = timeText;
this._currentTime.textContent = timeText;
let w = this._$view.outerWidth();
let vw = this._$container.innerWidth();
left = Math.max(0, Math.min(left - w / 2, vw - w));
this._$view.css('transform', `translate3d(${left}px, 0, 10px)`);
this._seekBarThumbnail.setCurrentTime(sec);
}
});
class SmoothSeekBarPointer {
constructor(params) {
this._pointer = params.pointer;
this._currentTime = 0;
this._duration = 1;
this._playbackRate = 1;
this._isSmoothMode = true;
this._isPausing = false;
this._isSeeking = false;
this._isStalled = false;
if (!this._pointer.animate) {
this._isSmoothMode = false;
}
this._pointer.classList.toggle('is-notSmooth', !this._isSmoothMode);
params.playerState.on('update-isPausing', v => this.isPausing = v);
params.playerState.on('update-isSeeking', v => this.isSeeking = v);
params.playerState.on('update-isStalled', v => this.isStalled = v);
}
get currentTime() {
return this._currentTime;
}
set currentTime(v) {
if (!this._isSmoothMode) {
const per = Math.min(100, this._timeToPer(v));
this._pointer.style.transform = `translate3d(${per}vw, 0, 0) translate3d(-50%, -50%, 0)`;
}
if (document.hidden) { return; }
this._currentTime = v;
// 誤差が一定以上になったときのみ補正する
// videoのcurrentTimeは秒. Animation APIのcurrentTimeはミリ秒
if (this._animation &&
Math.abs(v * 1000 - this._animation.currentTime) > 500) {
this._animation.currentTime = v * 1000;
// window.console.info('refreshed!', v*1000, this._animation.currentTime);
}
}
_timeToPer(time) {
return (time / Math.max(this._duration, 1)) * 100;
}
set duration(v) {
if (this._duration === v) { return; }
this._duration = v;
this.refresh();
}
set playbackRate(v) {
if (this._playbackRate === v) { return; }
this._playbackRate = v;
if (!this._animation) { return; }
this._animation.playbackRate = v;
}
get isPausing() {
return this._isPausing;
}
set isPausing(v) {
if (this._isPausing === v) { return; }
this._isPausing = v;
this._updatePlaying();
}
get isSeeking() {
return this._isSeeking;
}
set isSeeking(v) {
if (this._isSeeking === v) { return; }
this._isSeeking = v;
this._updatePlaying();
}
get isStalled() {
return this._isStalled;
}
set isStalled(v) {
if (this._isStalled === v) { return; }
this._isStalled = v;
this._updatePlaying();
}
get isPlaying() {
return !this.isPausing && !this.isStalled && !this.isSeeking;
}
_updatePlaying() {
if (!this._animation) { return; }
if (this.isPlaying) {
this._animation.play();
} else {
this._animation.pause();
}
}
refresh() {
if (!this._isSmoothMode) { return; }
if (this._animation) {
this._animation.finish();
}
this._animation = this._pointer.animate([
{transform: 'translate3d(-6px, -50%, 0) translate3d(0, 0, 0)'},
{transform: 'translate3d(-6px, -50%, 0) translate3d(100vw, 0, 0)'}
], {
duration: this._duration * 1000
});
this._animation.currentTime = this._currentTime * 1000;
this._animation.playbackRate = this._playbackRate;
if (!this._isPausing) {
this._animation.play();
}
}
}


class NicoTextParser {
}
NicoTextParser._FONT_REG = {
  // TODO: wikiにあるテーブルを正規表現に落とし込む
  // MING_LIUは昔どこかで拾ったのだけど出典がわからない
  // wikiの記述だと\u2588はstrongではないっぽいけど、そうじゃないと辻褄が合わないCAがいくつかある。
  // wikiが間違いなのか、まだ知らない法則があるのか・・・？
  //
//    GOTHIC: /[ｧ-ﾝﾞ･ﾟ]/,
  /* eslint-disable */
  GOTHIC: /[\uFF67-\uFF9D\uFF9E\uFF65\uFF9F]/,
  MINCHO: /([\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/,
  GULIM: /([\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6])/,
  MING_LIU: /([\uEF00-\uEF1F])/,
  GR: /<group>([^\x01-\x7E^\xA0]*?([\uFF67-\uFF9D\uFF9E\uFF65\uFF9F\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6\uEF00-\uEF1F\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])[^\x01-\x7E^\xA0]*?)<\/group>/g,
  STRONG_MINCHO: /([\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\u2588])/,
  // ドット絵系によく使われる文字. 綺麗に見せるためにエフェクトを変えたい
  BLOCK: /([\u2581-\u258F\u25E2-\u25E5■]+)/g,
  /* eslint-enable */
};


// 画面レイアウトに影響ありそうなCSSをこっちにまとめる
NicoTextParser.__css__ = (`
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

.default {}
.gothic  {font-family: 'ＭＳ Ｐゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo'; }
.mincho  {font-family: Simsun,            "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', 'Hiragino Mincho ProN'; }
.gulim   {font-family: Gulim,             Osaka-mono, "Osaka−等幅",              'ＭＳ ゴシック', 'モトヤLシーダ3等幅'; }
.mingLiu {font-family: PmingLiu, mingLiu, MingLiU, Osaka-mono, "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅'; }
han_group { font-family: 'Arial'; }


/* 参考: https://www65.atwiki.jp/commentart2/pages/16.html */
.cmd-gothic {
  font-weight: 400;
  font-family: "游ゴシック", "Yu Gothic", 'YuGothic', Simsun, "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
.cmd-mincho {
  font-weight: 400;
  font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;
}
.cmd-defont {
  font-family: arial, "ＭＳ Ｐゴシック", "MS PGothic", "MSPGothic", "ヒラギノ角ゴ", "ヒラギノ角ゴシック", "Hiragino Sans", "IPAMonaPGothic", sans-serif, monospace, Menlo;
}

.nicoChat {
  position: absolute;

  letter-spacing: 1px;
  padding: 2px 0 2px;
  margin: 0;
  white-space: nowrap;
  font-weight: 600;
  -webkit-font-smoothing: none;
  font-smooth: never;
  /* text-rendering: optimizeSpeed; */
  /*font-kerning: none;*/
}

  .nicoChat.big {
    line-height: 45px;
  }
    .nicoChat.big.html5 {
      line-height: ${47.5 -1}px;
    }
    .nicoChat.big.is-lineResized {
      line-height: ${48}px;
    }

  .nicoChat.medium {
    line-height: 29px; 
  }
    .nicoChat.medium.html5 {
      line-height: ${(384 - 4) / 13}px;
    }
    .nicoChat.medium.is-lineResized {
      line-height: ${(384 - 4) * 2 / 25 -0.4}px;
    }

  .nicoChat.small {
    line-height: 18px;
  }
    .nicoChat.small.html5 {
      line-height: ${(384 - 4) / 21}px;
    }
    .nicoChat.small.is-lineResized {
      line-height: ${(384 - 4) * 2 / 38}px;
    }

  .arial.type2001 {
    font-family: Arial;
  }
  /* フォント変化のあったグループの下にいるということは、
     半角文字に挟まれていないはずである。
   */
    .gothic > .type2001 {
      font-family: 'ＭＳ Ｐゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo';
    }
    .mincho > .type2001 {
      font-family: Simsun,            Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace
    }
    .gulim > .type2001 {
      font-family: Gulim,             Osaka-mono,              'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace;
    }
    .mingLiu > .type2001 {
      font-family: PmingLiu, mingLiu, Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace;
    }

/*
.tab_space { opacity: 0; }
.big    .tab_space > spacer { width:  86.55875px;  }
.medium .tab_space > spacer { width:  53.4px;  }
.small  .tab_space > spacer { width:  32.0625px;  }
*/

.tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0 !important; }
.big    .tab_space { letter-spacing: 1.6241em; }
.medium .tab_space { letter-spacing: 1.6252em; }
.small  .tab_space { letter-spacing: 1.5375em; }


.big    .type0020 > spacer { width: 11.8359375px; }
.medium .type0020 > spacer { width: 7.668px; }
.small  .type0020 > spacer { width: 5px; }
/*
.big    .type3000 > spacer { width: 40px; }
.medium .type3000 > spacer { width: 25px; }
.small  .type3000 > spacer { width: 17px; }
*/
/*
.type3000 > spacer::after { content: ' '; }
.mincho > .type3000 > spacer::after, .gulim > .type3000 > spacer::after, .mincho > .type3000 > spacer::after {
  content: '全'; 
}
*/

.big    .gothic > .type3000 > spacer { width: 26.8984375px; }
.medium .gothic > .type3000 > spacer { width: 16.9375px; }
.small  .gothic > .type3000 > spacer { width: 10.9609375px; }

.big    .type00A0 > spacer { width: 11.8359375px; }
.medium .type00A0 > spacer { width: 7.668px; }
.small  .type00A0 > spacer { width: 5px; }

spacer { display: inline-block; overflow: hidden; margin: 0; padding: 0; height: 8px; vertical-align: middle;}

.mesh_space {
  display: inline-block; overflow: hidden; margin: 0; padding: 0; letter-spacing: 0;
  vertical-align: middle; font-weight: normal;
  white-space: nowrap;
}
.big    .mesh_space { width: 40px; }
.medium .mesh_space { width: 26px; }
.small  .mesh_space { width: 18px; }

/*
.fill_space {
  display: inline-block; overflow: hidden; margin: 0; padding: 0; letter-spacing: 0;
           vertical-align: bottom; font-weight: normal;
  white-space: nowrap;
}
.big    .fill_space { width: 40px; height: 40px; }
.medium .fill_space { width: 25px; height: 25px; }
.small  .fill_space { width: 16px; height: 16px; }
*/

.backslash {
  font-family: Arial;
}

/* Mac Chrome バグ対策？ 空白文字がなぜか詰まる これでダメならspacer作戦 */
.invisible_code {
  font-family: gulim;
}

.block_space {
  font-family: Simsun, 'IPAMonaGothic', Gulim, PmingLiu;
}

.html5_tab_space, .html5_space, .html5_zen_space { opacity: 0; }

/*
.nicoChat.small .html5_zen_space > spacer { width: 25.6px; }
                .html5_zen_space > spacer { width: 25.6px; margin: 0; }
.nicoChat.big   .html5_zen_space > spacer { width: 25.6px; }
*/
.html5_zero_width { display: none; }

.no-height { 
  line-height: 0 !important;
  opacity: 0;
  display: block;
  visibility: hidden;
 }

  `).trim();

/**
 *  たぶんこんな感じ
 *  1. 全角文字(半角スペース含まない)でグループ化
 *  2. グループ内でフォント変化文字が1つある場合はグループ全体がそのフォント
 *  3. 二つ以上ある場合は、一番目がグループ内のベースフォント、
 *     二番目以降はそのフォントにチェンジ
 *  4. 最初のグループにフォントチェンジがあった場合は、
 *     グループ全体のベースフォントがグループ1の奴になる
 *
 *  Vista以降だともうちょっと複雑らしい
 *
 *
 *  もし新規でニコニコ動画のようなシステムを作るのであれば、こんな複雑怪奇な物を実装する必要はない。
 *  ならどうしてやっているのかといえば、過去のコメントアートを再現したいからである。
 */
NicoTextParser.likeXP = function (text) {
  let S = '<spacer> </spacer>';
  let ZS = '<spacer>全</spacer>';
  let htmlText =
    util.escapeHtml(text)
    // 行末の半角スペース、全角スペース、タブの除去
    //.replace(/([\x20|\u3000|\t])+([\n$])/g , '$2')
    // 半角文字グループ(改行以外)
      .replace(/([\x01-\x09\x0B-\x7E\xA0]+)/g, '<han_group>$1</han_group>') // eslint-disable-line
      // 全角文字の連続をグループ化 要検証: \u2003は含む？
      .replace(/([^\x01-\x7E^\xA0]+)/g, '<group>$1</group>') // eslint-disable-line
      .replace(/([\u0020]+)/g, // '<span class="han_space type0020">$1</span>')
        g => `<span class="han_space type0020">${S.repeat(g.length)}</span>`)
      //'<span class="han_space type0020">$1</span>')
      .replace(/([\u00A0]+)/g, //  '<span class="han_space type00A0">$1</span>')
        g => `<span class="han_space type00A0">${S.repeat(g.length)}</span>`)
      .replace(/(\t+)/g, '<span class="tab_space">$1</span>')
      .replace(/[\t]/g, '^');

  let /* hasFontChanged = false, */ strongFont = 'gothic';
  // フォント変化処理  XPをベースにしたい
  // CA職人のマイメモリーでもない限りフォント変化文字にマッチすること自体がレアなので、
  // 一文字ずつ走査してもさほど問題ないはず
  htmlText =
    htmlText.replace(NicoTextParser._FONT_REG.GR, (all, group, firstChar) => {
      // hasFontChanged = true;
      let baseFont = '';
      if (firstChar.match(NicoTextParser._FONT_REG.GOTHIC)) {
        baseFont = 'gothic';
      } else if (firstChar.match(NicoTextParser._FONT_REG.MINCHO)) {
        baseFont = 'mincho';
        if (firstChar.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
          strongFont = 'mincho';
        }
      } else if (firstChar.match(NicoTextParser._FONT_REG.GULIM)) {
        strongFont = baseFont = 'gulim';
      } else {
        strongFont = baseFont = 'mingLiu';
      }

      let tmp = [], closer = [], currentFont = baseFont;
      for (let i = 0, len = group.length; i < len; i++) {
        let c = group.charAt(i);
        if (currentFont !== 'gothic' && c.match(NicoTextParser._FONT_REG.GOTHIC)) {
          tmp.push('<span class="gothic">');
          closer.push('</span>');
          currentFont = 'gothic';
        } else if (currentFont !== 'mincho' && c.match(NicoTextParser._FONT_REG.MINCHO)) {
          tmp.push('<span class="mincho">');
          closer.push('</span>');
          currentFont = 'mincho';
          if (c.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
            strongFont = baseFont = 'mincho';
          }
        } else if (currentFont !== 'gulim' && c.match(NicoTextParser._FONT_REG.GULIM)) {
          tmp.push('<span class="gulim">');
          closer.push('</span>');
          currentFont = strongFont = baseFont = 'gulim';
        } else if (currentFont !== 'mingLiu' && c.match(NicoTextParser._FONT_REG.MING_LIU)) {
          tmp.push('<span class="mingLiu">');
          closer.push('</span>');
          currentFont = strongFont = baseFont = 'mingLiu';
        }
        tmp.push(c);
      }

      let result = [
        '<group class="', baseFont, ' fontChanged">',
        tmp.join(''),
        closer.join(''),
        '</group>'
      ].join('');

      return result;
    });

  htmlText =
    htmlText
      .replace(NicoTextParser._FONT_REG.BLOCK, '<span class="block_space">$1</span>')
      .replace(/([\u2588]+)/g, //'<span class="fill_space">$1</span>')
        g => `<span class="fill_space">${'田'.repeat(g.length)}</span>`)
            //+ g + '</span>';
            //'■'._repeat(g.length) + '</span>';
      .replace(/([\u2592])/g, '<span class="mesh_space">$1$1</span>')
      // 非推奨空白文字。 とりあえず化けて出ないように
      .replace(/([\uE800\u2002-\u200A\u007F\u05C1\u0E3A\u3164]+)/g,
        //'<span class="invisible_code">$1</span>')
        g => `<span class="invisible_code" data-code="${escape(g)}">${g}</span>`)
        // function (g) {
        //   let e = window.escape(g);
        //   return '<span class="invisible_code" data-code="' + e + '">' + g + '</span>';
        // })
      // 結合文字 前の文字と同じ幅になるらしい
      // http://www.nicovideo.jp/watch/1376820446 このへんで見かけた
      .replace(/(.)[\u0655]/g, '$1<span class="type0655">$1</span>')
      //http://www.nicovideo.jp/watch/1236260707 で見かける謎スペース。よくわからない
      .replace(/([\u115a]+)/g, '<span class="zen_space type115A">$1</span>')
      // 推奨空白文字
      // なんか前後の文字によって書体(幅)が変わるらしい。 隣接セレクタでどうにかなるか？
      //  .replace(/([\u2001]+)/g ,  '<span class="zen_space type2001">$1</span>')
      // 全角スペース
      .replace(/([\u3000]+)/g, //'<span class="zen_space type3000">$1</span>')
        g => `<span class="zen_space type3000">${ZS.repeat(g.length)}</span>`)
        // function (g) {
        //   return '<span class="zen_space type3000">' + ZS.repeat(g.length) + '</span>';
        // })
      // バックスラッシュ
      .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>')
      // ゼロ幅文字. ゼロ幅だけどdisplay: none; にすると狂う
      .replace(/([\u0323\u2029\u202a\u200b\u200c]+)/g, '<span class="zero_space">$1</span>')
      // &emsp;
      .replace(/([\u2003]+)/g, '<span class="em_space">$1</span>')
      .replace(/\r\n/g, '\n').replace(/([^\n])[\n]$/, '$1') //.replace(/^[\r\n]/, '')
      //        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
      .replace(/[\n]/g, '<br>')
  ;

  // \u2001だけのグループ＝全角文字に隣接してない ≒ 半角に挟まれている
  htmlText = htmlText.replace(/(.)<group>([\u2001]+)<\/group>(.)/, '$1<group class="zen_space arial type2001">$2</group>$3');

  htmlText = htmlText.replace(/<group>/g, `<group class="${strongFont}">`);

  return htmlText;
};

NicoTextParser.likeHTML5 = function (text) {
  let htmlText =
    util.escapeHtml(text)
      .replace(/([\x20\xA0]+)/g, g => {
        return `<span class="html5_space" data-text="${encodeURIComponent(g)}">${'&nbsp;'.repeat(g.length)}</span>`;
      })
      .replace(/([\u2000\u2002]+)/g, g => {
        return `<span class="html5_space half" data-text="${encodeURIComponent(g)}">${g}</span>`;
      })
      .replace(/([\u3000\u2001\u2003]+)/g, g => {
        return `<span class="html5_zen_space" data-text="${encodeURIComponent(g)}">${'全'.repeat(g.length)}</span>`;
      })
      .replace(/[\u200B-\u200F]+/g, g => {
        return `<span class="html5_zero_width" data-text="${encodeURIComponent(g)}">${g}</span>`;
      })
      .replace(/([\t]+)/g, g => {
        return '<span class="html5_tab_space">' +
          '丁'.repeat(g.length * 2) + '</span>';
      })
      .replace(NicoTextParser._FONT_REG.BLOCK, '<span class="html5_block_space">$1</span>')
      .replace(/([\u2588]+)/g, g => {
        return '<span class="html5_fill_space u2588">' + //g + '</span>';
           '田'.repeat(g.length) + '</span>';
      })
      .replace(/[\n]/g, '<br>')
  ;

  let sp = htmlText.split('<br>');
  if (sp.length >= 100) {
    htmlText = `<span class="line100">${sp.slice(0, 100).join('<br>')}</span><span class="no-height">${sp.slice(100).join('<br>')}</span>`;
  } else if (sp.length >= 70) {
    htmlText = `<span class="line70">${sp.slice(0, 70).join('<br>')}</span><span class="no-height">${sp.slice(70).join('<br>')}</span>`;
  } else if (sp.length >= 53) {
    htmlText = `<span class="line53">${sp.slice(0,53).join('<br>')}</span><span class="no-height">${sp.slice(53).join('<br>')}</span>`;
  }

  return htmlText;
};

ZenzaWatch.NicoTextParser = NicoTextParser;

// 大百科より
const SHARED_NG_LEVEL = {
NONE: 'NONE',
LOW: 'LOW',
MID: 'MID',
HIGH: 'HIGH',
MAX: 'MAX'
};
const SHARED_NG_SCORE = {
NONE: -99999,//Number.MIN_VALUE,
LOW: -10000,
MID: -5000,
HIGH: -1000,
MAX: -1
};
const MAX_COMMENT = 10000;
class NicoCommentPlayer extends Emitter {
constructor(params) {
super();
this._offScreen = params.offScreenLayer;
this._model = new NicoComment(params);
this._viewModel = new NicoCommentViewModel(this._model, params.offScreenLayer);
this._view = new NicoCommentCss3PlayerView({
viewModel: this._viewModel,
playbackRate: params.playbackRate,
show: params.showComment,
opacity: _.isNumber(params.commentOpacity) ? params.commentOpacity : 1.0
});
let onCommentChange = _.throttle(this._onCommentChange.bind(this), 1000);
this._model.on('change', onCommentChange);
this._model.on('filterChange', this._onFilterChange.bind(this));
this._model.on('parsed', this._onCommentParsed.bind(this));
this._model.on('command', this._onCommand.bind(this));
ZenzaWatch.emitter.on('commentLayoutChange', onCommentChange);
ZenzaWatch.debug.nicoCommentPlayer = this;
}
}
_.assign(NicoCommentPlayer.prototype, {
setComment: function (data, options) {
if (typeof data === 'string') {
if (options.format === 'json') {
this._model.setData(JSON.parse(data), options);
} else {
this._model.setXml(new DOMParser().parseFromString(data, 'text/xml'), options);
}
} else if (typeof data.getElementsByTagName === 'function') {
this._model.setXml(data, options);
} else {
this._model.setData(data, options);
}
},
_onCommand: function (command, param) {
this.emit('command', command, param);
},
_onCommentChange: function (e) {
console.log('onCommentChange', e);
if (this._view) {
setTimeout(() => this._view.refresh(), 0);
}
this.emit('change');
},
_onFilterChange: function (nicoChatFilter) {
this.emit('filterChange', nicoChatFilter);
},
_onCommentParsed: function () {
this.emit('parsed');
},
getMymemory: function () {
if (!this._view) {
this._view = new NicoCommentCss3PlayerView({
viewModel: this._viewModel
});
}
return this._view.toString();
},
setCurrentTime: function (sec) {
this._model.setCurrentTime(sec);
},
setVpos: function (vpos) {
this._model.setCurrentTime(vpos / 100);
},
getCurrentTime: function () {
return this._model.getCurrentTime();
},
getVpos: function () {
return this._model.getCurrentTime() * 100;
},
setVisibility: function (v) {
if (v) {
this._view.show();
} else {
this._view.hide();
}
},
addChat: function (text, cmd, vpos, options) {
if (typeof vpos !== 'number') {
vpos = this.getVpos();
}
let nicoChat = NicoChat.create(Object.assign({text, cmd, vpos}, options));
this._model.addChat(nicoChat);
return nicoChat;
},
setPlaybackRate: function (playbackRate) {
if (this._view && this._view.setPlaybackRate) {
this._view.setPlaybackRate(playbackRate);
}
},
setAspectRatio: function (ratio) {
this._view.setAspectRatio(ratio);
},
appendTo: function ($node) {
this._view.appendTo($node);
},
show: function () {
this._view.show();
},
hide: function () {
this._view.hide();
},
close: function () {
this._model.clear();
if (this._view) {
this._view.clear();
}
},
setSharedNgLevel: function (level) {
this._model.setSharedNgLevel(level);
},
getSharedNgLevel: function () {
return this._model.getSharedNgLevel();
},
setIsFilterEnable: function (v) {
this._model.setIsFilterEnable(v);
},
isFilterEnable: function () {
return this._model.isFilterEnable();
},
addWordFilter: function (text) {
this._model.addWordFilter(text);
},
setWordFilterList: function (list) {
this._model.setWordFilterList(list);
},
getWordFilterList: function () {
return this._model.getWordFilterList();
},
setWordRegFilter: function (list) {
this._model.setWordRegFilter(list);
},
addUserIdFilter: function (text) {
this._model.addUserIdFilter(text);
},
setUserIdFilterList: function (list) {
this._model.setUserIdFilterList(list);
},
getUserIdFilterList: function () {
return this._model.getUserIdFilterList();
},
addCommandFilter: function (text) {
this._model.addCommandFilter(text);
},
setCommandFilterList: function (list) {
this._model.setCommandFilterList(list);
},
getCommandFilterList: function () {
return this._model.getCommandFilterList();
},
getChatList: function () {
return this._model.getChatList();
},
/**
* NGフィルタなどのかかってない全chatを返す
*/
getNonfilteredChatList: function () {
return this._model.getNonfilteredChatList();
},
toString: function () {
return this._viewModel.toString();
},
getCurrentScreenHtml: function () {
return this._view.getCurrentScreenHtml();
}
});
class NicoComment extends Emitter {
static getMaxCommentsByDuration(duration = 6 * 60 * 60 * 1000) {
if (duration < 64) { return 100; }
if (duration < 300) { return 250; }
if (duration < 600) { return 500; }
return 1000;
}
constructor(params) {
super();
this._currentTime = 0;
params.nicoChatFilter = this._nicoChatFilter = new NicoChatFilter(params);
this._nicoChatFilter.on('change', this._onFilterChange.bind(this));
this._topGroup = new NicoChatGroup(this, NicoChat.TYPE.TOP, params);
this._nakaGroup = new NicoChatGroup(this, NicoChat.TYPE.NAKA, params);
this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);
this._nicoScripter = new NicoScripter();
this._nicoScripter.on('command', (command, param) => {
this.emit('command', command, param);
});
let onChange = _.debounce(this._onChange.bind(this), 100);
this._topGroup.on('change', onChange);
this._nakaGroup.on('change', onChange);
this._bottomGroup.on('change', onChange);
ZenzaWatch.emitter.on('updateOptionCss', onChange);
}
}
_.assign(NicoComment.prototype, {
setXml: function(xml, options) {
let chatsData = Array.from(xml.getElementsByTagName('chat')).filter(chat => chat.firstChild);
this.setChats(chatsData, options);
},
setData: function(data, options) {
let chatsData = data.filter(d => d.chat).map(d => {
return Object.assign({text: d.chat.content || '', cmd: d.chat.mail || ''}, d.chat);
});
this.setChats(chatsData, options);
},
setChats: function (chatsData, options) {
this._options = options || {};
window.console.time('コメントのパース処理');
let nicoScripter = this._nicoScripter;
if (!options.append) {
this._topGroup.reset();
this._nakaGroup.reset();
this._bottomGroup.reset();
nicoScripter.reset();
}
const duration = this._duration =
parseInt(options.duration || 0x7FFFFF);
let mainThreadId = options.mainThreadId || 0;
let nicoChats = [];
let top = [], bottom = [], naka = [];
let create = options.format !== 'xml' ? NicoChat.create : NicoChat.createFromChatElement;
for (let i = 0, len = Math.min(chatsData.length, MAX_COMMENT); i < len; i++) {
let chat = chatsData[i];
let nicoChat = create(chat, duration, mainThreadId);
if (nicoChat.isDeleted()) {
continue;
}
if (nicoChat.isNicoScript()) {
nicoScripter.add(nicoChat);
}
nicoChats.push(nicoChat);
}
nicoChats = []
.concat(...
nicoChats.filter(c => c.isPatissier() && c.getFork() < 1 && c.isSubThread())
.splice(this.constructor.getMaxCommentsByDuration(duration)))
.concat(...
nicoChats.filter(c => c.isPatissier() && c.getFork() < 1 && !c.isSubThread())
.splice(this.constructor.getMaxCommentsByDuration(duration)))
.concat(...nicoChats.filter(c => !c.isPatissier() || c.getFork() > 0));
if (options.append) {
nicoChats = nicoChats.filter(chat => {
return !this._topGroup.includes(chat) && !this._nakaGroup.includes(chat) && !this._bottomGroup.includes(chat);
});
}
let minTime = Date.now();
let maxTime = 0;
nicoChats.forEach(c => {
minTime = Math.min(minTime, c.getDate());
maxTime = Math.max(maxTime, c.getDate());
});
let timeDepth = maxTime - minTime;
nicoChats.forEach(c => {
c.time3d = c.getDate() - minTime;
c.time3dp = c.time3d / timeDepth;
});
if (_.isObject(options.replacement) && _.size(options.replacement) > 0) {
window.console.time('コメント置換フィルタ適用');
this._wordReplacer = this._compileWordReplacer(options.replacement);
this._preProcessWordReplacement(nicoChats, this._wordReplacer);
window.console.timeEnd('コメント置換フィルタ適用');
} else {
this._wordReplacer = null;
}
if (nicoScripter.isExist) {
window.console.time('ニコスクリプト適用');
nicoScripter.apply(nicoChats);
window.console.timeEnd('ニコスクリプト適用');
const nextVideo = nicoScripter.getNextVideo();
window.console.info('nextVideo', nextVideo);
if (nextVideo) {
this.emitAsync('command', 'nextVideo', nextVideo);
}
}
nicoChats.forEach(nicoChat => {
let type = nicoChat.getType();
let group;
switch (type) {
case NicoChat.TYPE.TOP:
group = top;
break;
case NicoChat.TYPE.BOTTOM:
group = bottom;
break;
default:
group = naka;
break;
}
group.push(nicoChat);
});
this._topGroup.addChatArray(top);
this._nakaGroup.addChatArray(naka);
this._bottomGroup.addChatArray(bottom);
window.console.timeEnd('コメントのパース処理');
console.log('chats: ', chatsData.length);
console.log('top: ', this._topGroup.getNonFilteredMembers().length);
console.log('naka: ', this._nakaGroup.getNonFilteredMembers().length);
console.log('bottom: ', this._bottomGroup.getNonFilteredMembers().length);
this.emit('parsed');
},
/**
* コメント置換器となる関数を生成
* なにがやりたかったのやら
*/
_compileWordReplacer(replacement) {
let func = function (text) {
return text;
};
let makeFullReplacement = function (f, src, dest) {
return function (text) {
return f(text.indexOf(src) >= 0 ? dest : text);
};
};
let makeRegReplacement = function (f, src, dest) {
let reg = new RegExp(util.escapeRegs(src), 'g');
return function (text) {
return f(text.replace(reg, dest));
};
};
Object.keys(replacement).forEach(key => {
if (!key) {
return;
}
let val = replacement[key];
window.console.log('コメント置換フィルタ: "%s" => "%s"', key, val);
if (key.charAt(0) === '*') {
func = makeFullReplacement(func, key.substr(1), val);
} else {
func = makeRegReplacement(func, key, val);
}
});
return func;
},
/**
* 投稿者が設定したコメント置換フィルタを適用する
*/
_preProcessWordReplacement(group, replacementFunc) {
group.forEach(nicoChat => {
let text = nicoChat.getText();
let newText = replacementFunc(text);
if (text !== newText) {
nicoChat.setText(newText);
}
});
},
getChatList: function () {
return {
top: this._topGroup.getMembers(),
naka: this._nakaGroup.getMembers(),
bottom: this._bottomGroup.getMembers()
};
},
getNonFilteredChatList: function () {
return {
top: this._topGroup.getNonFilteredMembers(),
naka: this._nakaGroup.getNonFilteredMembers(),
bottom: this._bottomGroup.getNonFilteredMembers()
};
},
addChat: function (nicoChat) {
if (nicoChat.isDeleted()) {
return;
}
let type = nicoChat.getType();
if (this._wordReplacer) {
nicoChat.setText(this._wordReplacer(nicoChat.getText()));
}
if (this._nicoScripter.isExist) {
window.console.time('ニコスクリプト適用');
this._nicoScripter.apply([nicoChat]);
window.console.timeEnd('ニコスクリプト適用');
}
let group;
switch (type) {
case NicoChat.TYPE.TOP:
group = this._topGroup;
break;
case NicoChat.TYPE.BOTTOM:
group = this._bottomGroup;
break;
default:
group = this._nakaGroup;
break;
}
group.addChat(nicoChat, group);
this.emit('addChat');
},
/**
* コメントの内容が変化した通知
* NG設定、フィルタ反映時など
*/
_onChange: function (e) {
console.log('NicoComment.onChange: ', e);
e = e || {};
let ev = {
nicoComment: this,
group: e.group,
chat: e.chat
};
this.emit('change', ev);
},
_onFilterChange: function () {
this.emit('filterChange', this._nicoChatFilter);
},
clear: function () {
this._xml = '';
this._topGroup.reset();
this._nakaGroup.reset();
this._bottomGroup.reset();
this.emit('clear');
},
getCurrentTime: function () {
return this._currentTime;
},
setCurrentTime: function (sec) {
this._currentTime = sec;
this._topGroup.setCurrentTime(sec);
this._nakaGroup.setCurrentTime(sec);
this._bottomGroup.setCurrentTime(sec);
this._nicoScripter.currentTime = sec;
this.emit('currentTime', sec);
},
seek: function (time) {
this.setCurrentTime(time);
},
setVpos: function (vpos) {
this.setCurrentTime(vpos / 100);
},
getGroup: function (type) {
switch (type) {
case NicoChat.TYPE.TOP:
return this._topGroup;
case NicoChat.TYPE.BOTTOM:
return this._bottomGroup;
default:
return this._nakaGroup;
}
},
setSharedNgLevel: function (level) {
this._nicoChatFilter.setSharedNgLevel(level);
},
getSharedNgLevel: function () {
return this._nicoChatFilter.getSharedNgLevel();
},
setIsFilterEnable: function (v) {
this._nicoChatFilter.setEnable(v);
},
isFilterEnable: function () {
return this._nicoChatFilter.isEnable();
},
addWordFilter: function (text) {
this._nicoChatFilter.addWordFilter(text);
},
setWordFilterList: function (list) {
this._nicoChatFilter.setWordFilterList(list);
},
getWordFilterList: function () {
return this._nicoChatFilter.getWordFilterList();
},
setWordRegFilter: function (list) {
this._nicoChatFilter.setWordRegFilter(list);
},
addUserIdFilter: function (text) {
this._nicoChatFilter.addUserIdFilter(text);
},
setUserIdFilterList: function (list) {
this._nicoChatFilter.setUserIdFilterList(list);
},
getUserIdFilterList: function () {
return this._nicoChatFilter.getUserIdFilterList();
},
addCommandFilter: function (text) {
this._nicoChatFilter.addCommandFilter(text);
},
setCommandFilterList: function (list) {
this._nicoChatFilter.setCommandFilterList(list);
},
getCommandFilterList: function () {
return this._nicoChatFilter.getCommandFilterList();
},
});
// フォントサイズ計算用の非表示レイヤーを取得
// 変なCSSの影響を受けないように、DOM的に隔離されたiframe内で計算する。
NicoComment.offScreenLayer = (() => {
let __offscreen_tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">
.nicoChat { visibility: hidden; }
</style>
<body>
<div id="offScreenLayer"
style="
width: 4096px;
height: 384px;
overflow: visible;
background: #fff;
white-space: pre;
"></div>
</body></html>
`).trim();
let emitter = new Emitter();
let offScreenFrame;
let offScreenLayer;
let textField;
let optionStyle;
let config;
let initializeOptionCss = optionStyle => {
let update = () => {
let tmp = [];
let baseFont = config.getValue('baseFontFamily');
let inner = optionStyle.innerHTML;
if (baseFont) {
baseFont = baseFont.replace(/[;{}*/]/g, '');
tmp.push(
[
'.gothic {font-family: %BASEFONT%; }\n',
'han_group {font-family: %BASEFONT%, Arial; }'
].join('').replace(/%BASEFONT%/g, baseFont)
);
}
let bolder = config.getValue('baseFontBolder');
if (!bolder) {
tmp.push('.nicoChat { font-weight: normal !important; }');
}
let newCss = tmp.join('\n');
if (inner !== newCss) {
optionStyle.innerHTML = newCss;
ZenzaWatch.emitter.emit('updateOptionCss', newCss);
}
};
update();
config.on('update-baseFontFamily', update);
config.on('update-baseFontBolder', update);
};
let initialize = resolve => {
initialize = _.noop;
let frame = document.createElement('iframe');
frame.lazyload = 'off';
frame.className = 'offScreenLayer';
frame.setAttribute('sandbox', 'allow-same-origin');
document.body.appendChild(frame);
frame.style.position = 'fixed';
frame.style.top = '200vw';
frame.style.left = '200vh';
offScreenFrame = frame;
let layer;
let onload = () => {
frame.onload = null;
if (util.isChrome()) { frame.removeAttribute('srcdoc'); }
console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
createTextField();
let doc = offScreenFrame.contentWindow.document;
layer = doc.getElementById('offScreenLayer');
optionStyle = doc.getElementById('optionCss');
initializeOptionCss(optionStyle);
offScreenLayer = {
getTextField: () => {
return textField;
},
appendChild: elm => {
layer.appendChild(elm);
},
removeChild: elm => {
layer.removeChild(elm);
},
getOptionCss: () => {
return optionStyle.innerHTML;
}
};
emitter.emit('create', offScreenLayer);
emitter.clear();
resolve(offScreenLayer);
};
let html = __offscreen_tpl__
.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
.replace('%OPTION_CSS%', '');
if (typeof frame.srcdoc === 'string') {
frame.onload = onload;
frame.srcdoc = html;
} else {
// MS IE/Edge用
frame.contentWindow.document.open();
frame.contentWindow.document.write(html);
frame.contentWindow.document.close();
window.setTimeout(onload, 0);
}
};
let getLayer = _config => {
config = _config;
return new Promise(resolve => {
if (offScreenLayer) {
return resolve(offScreenLayer);
}
initialize(resolve);
});
};
let createTextField = () => {
let layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
if (!layer) {
return false;
}
let span = document.createElement('span');
span.className = 'nicoChat';
let scale = NicoChatViewModel.BASE_SCALE;
NicoChatViewModel.emitter.on('updateBaseChatScale', v => {
scale = v;
});
textField = {
setText: text => {
span.innerHTML = text;
},
setType: function (type, size, fontCommand, ver) {
fontCommand = fontCommand ? `cmd-${fontCommand}` : '';
span.className = `nicoChat ${type} ${size} ${fontCommand} ${ver}`;
},
setFontSizePixel: pixel => {
span.style.fontSize = `${pixel}px`;
},
getOriginalWidth: () => {
return span.offsetWidth;
},
getWidth: () => {
return span.offsetWidth * scale;
},
getOriginalHeight: () => {
return span.offsetHeight;
},
getHeight: () => {
return span.offsetHeight * scale;
}
};
layer.appendChild(span);
return span;
};
return {
get: getLayer,
getOptionCss: function () {
return optionStyle.innerHTML;
}
};
})();
class NicoCommentViewModel extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
// この数字はレイアウト計算上の仮想領域の物であり、実際に表示するサイズはview依存
NicoCommentViewModel.SCREEN = {
WIDTH_INNER: 512,
WIDTH_FULL_INNER: 640,
WIDTH_FULL_INNER_HTML5: 684,
WIDTH: 512 + 32,
WIDTH_FULL: 640 + 32,
OUTER_WIDTH_FULL: (640 + 32) * 1.1,
HEIGHT: 384
};
_.assign(NicoCommentViewModel.prototype, {
initialize: function (nicoComment, offScreen) {
this._offScreen = offScreen;
this._currentTime = 0;
this._lastUpdate = 0;
this._topGroup =
new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
this._nakaGroup =
new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA), offScreen);
this._bottomGroup =
new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);
let config = Config.namespace('commentLayer');
if (config.getValue('enableSlotLayoutEmulation')) {
this._slotLayoutWorker = SlotLayoutWorker.create();
}
if (this._slotLayoutWorker) {
this._slotLayoutWorker.addEventListener('message',
this._onSlotLayoutWorkerComplete.bind(this));
this._updateSlotLayout = _.debounce(this._updateSlotLayout.bind(this), 100);
}
nicoComment.on('setData', this._onSetData.bind(this));
nicoComment.on('clear', this._onClear.bind(this));
nicoComment.on('change', this._onChange.bind(this));
nicoComment.on('parsed', this._onCommentParsed.bind(this));
nicoComment.on('currentTime', this._onCurrentTime.bind(this));
},
_onSetData: function () {
this.emit('setData');
},
_onClear: function () {
this._topGroup.reset();
this._nakaGroup.reset();
this._bottomGroup.reset();
this._lastUpdate = Date.now();
this.emit('clear');
},
_onCurrentTime: function (sec) {
this._currentTime = sec;
this.emit('currentTime', this._currentTime);
},
_onChange: function (e) {
this._lastUpdate = Date.now();
this._updateSlotLayout();
console.log('NicoCommentViewModel.onChange: ', e);
},
_onCommentParsed: function () {
this._lastUpdate = Date.now();
this._updateSlotLayout();
},
_updateSlotLayout: function () {
if (!this._slotLayoutWorker) {
return;
}
window.console.time('SlotLayoutWorker call');
this._slotLayoutWorker.postMessage({
lastUpdate: this._lastUpdate,
top: this._topGroup.getBulkSlotData(),
naka: this._nakaGroup.getBulkSlotData(),
bottom: this._bottomGroup.getBulkSlotData()
});
},
_onSlotLayoutWorkerComplete: function (e) {
// Workerが処理してる間にスレッドが変更された。
if (e.data.lastUpdate !== this._lastUpdate) {
window.console.warn('slotLayoutWorker changed',
this._lastUpdate, e.data.lastUpdate);
return;
}
//window.console.log('SlotLayoutWorker result', e.data);
this._topGroup.setBulkSlotData(e.data.top);
this._nakaGroup.setBulkSlotData(e.data.naka);
this._bottomGroup.setBulkSlotData(e.data.bottom);
window.console.timeEnd('SlotLayoutWorker call');
},
getCurrentTime: function () {
return this._currentTime;
},
toString: function () {
let result = [];
result.push(['<comment ',
'>'
].join(''));
result.push(this._nakaGroup.toString());
result.push(this._topGroup.toString());
result.push(this._bottomGroup.toString());
result.push('</comment>');
return result.join('\n');
},
getGroup: function (type) {
switch (type) {
case NicoChat.TYPE.TOP:
return this._topGroup;
case NicoChat.TYPE.BOTTOM:
return this._bottomGroup;
default:
return this._nakaGroup;
}
},
getBulkLayoutData: function () {
return {
top: this._topGroup.getBulkLayoutData(),
naka: this._nakaGroup.getBulkLayoutData(),
bottom: this._bottomGroup.getBulkLayoutData()
};
},
setBulkLayoutData: function (data) {
this._topGroup.setBulkLayoutData(data.top);
this._nakaGroup.setBulkLayoutData(data.naka);
this._bottomGroup.setBulkLayoutData(data.bottom);
}
});
class NicoChatGroup extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
_.assign(NicoChatGroup.prototype, {
initialize: function (nicoComment, type, params) {
this._type = type;
this._nicoChatFilter = params.nicoChatFilter;
this._nicoChatFilter.on('change', this._onFilterChange.bind(this));
this.reset();
},
reset: function () {
this._members = [];
this._filteredMembers = [];
},
addChatArray: function (nicoChatArray) {
let members = this._members;
let newMembers = [];
nicoChatArray.forEach(nicoChat => {
newMembers.push(nicoChat);
members.push(nicoChat);
nicoChat.setGroup(this);
});
newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
if (newMembers.length > 0) {
this._filteredMembers = this._filteredMembers.concat(newMembers);
this.emit('addChatArray', newMembers);
}
},
addChat: function (nicoChat) {
this._members.push(nicoChat);
nicoChat.setGroup(this);
if (this._nicoChatFilter.isSafe(nicoChat)) {
this._filteredMembers.push(nicoChat);
this.emit('addChat', nicoChat);
}
},
getType: function () {
return this._type;
},
getMembers: function () {
if (this._filteredMembers.length > 0) {
return this._filteredMembers;
}
let members = this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
return members;
},
getNonFilteredMembers: function () {
return this._members;
},
getCurrentTime: function () {
return this._currentTime;
},
onChange: function (e) {
console.log('NicoChatGroup.onChange: ', e);
this._filteredMembers = [];
this.emit('change', {
chat: e,
group: this
});
},
_onFilterChange: function () {
this._filteredMembers = [];
this.onChange(null);
},
setCurrentTime: function (sec) {
this._currentTime = sec;
let m = this._members;
for (let i = 0, len = m.length; i < len; i++) {
m[i].setCurrentTime(sec);
}
},
setSharedNgLevel: function (level) {
if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
this._sharedNgLevel = level;
this.onChange(null, this);
}
},
includes: function(nicoChat) {
let uno = nicoChat.getUniqNo();
return this._members.find(m => m.getUniqNo() === uno);
}
});
class NicoChatGroupViewModel {
constructor(...args) {
this.initialize(...args);
}
}
_.assign(NicoChatGroupViewModel.prototype, {
initialize: function (nicoChatGroup, offScreen) {
this._nicoChatGroup = nicoChatGroup;
this._offScreen = offScreen;
this._members = [];
this._lastUpdate = 0;
// メンバーをvposでソートした物. 計算効率改善用
this._vSortedMembers = [];
this._initWorker();
nicoChatGroup.on('addChat', this._onAddChat.bind(this));
nicoChatGroup.on('addChatArray', this._onAddChatArray.bind(this));
nicoChatGroup.on('reset', this._onReset.bind(this));
nicoChatGroup.on('change', this._onChange.bind(this));
NicoChatViewModel.emitter.on('updateBaseChatScale', this._onChange.bind(this));
NicoChatViewModel.emitter.on('updateCommentSpeedRate', this._onCommentSpeedRateUpdate.bind(this));
this.addChatArray(nicoChatGroup.getMembers());
},
_initWorker: function () {
if (this._layoutWorker) {
this._layoutWorker.removeEventListener('message', this._boundOnCommentLayoutWorkerComplete);
}
this._layoutWorker = CommentLayoutWorker.getInstance();
this._boundOnCommentLayoutWorkerComplete =
this._boundOnCommentLayoutWorkerComplete || this._onCommentLayoutWorkerComplete.bind(this);
if (this._layoutWorker) {
this._layoutWorker.addEventListener('message', this._boundOnCommentLayoutWorkerComplete);
}
},
_onAddChatArray: function (nicoChatArray) {
this.addChatArray(nicoChatArray);
},
_onAddChat: function (nicoChat) {
this.addChat(nicoChat);
},
_onReset: function () {
this.reset();
},
_onChange: function (e) {
console.log('NicoChatGroupViewModel.onChange: ', e);
window.console.time('_onChange');
this.reset();
this.addChatArray(this._nicoChatGroup.getMembers());
window.console.timeEnd('_onChange');
},
_onCommentLayoutWorkerComplete: function (e) {
//window.console.info('_onCommentLayoutWorkerComplete', e.data.type, e.data.result);
// 自分用のデータじゃない
if (e.data.requestId !== this._workerRequestId) {
return;
}
// Workerが処理してる間にスレッドが変更された。
if (e.data.lastUpdate !== this._lastUpdate) {
window.console.warn('group changed', this._lastUpdate, e.data.lastUpdate);
return;
}
this.setBulkLayoutData(e.data.result);
},
_execCommentLayoutWorker: function () {
if (this._members.length < 1) {
return;
}
let type = this._members[0].getType();
this._workerRequestId = `id:${type}-${Math.random()}`;
console.log('request worker: ', type);
this._layoutWorker.postMessage({
type: type,
members: this.getBulkLayoutData(),
lastUpdate: this._lastUpdate,
requestId: this._workerRequestId
});
},
addChatArray: function (nicoChatArray) {
for (let i = 0, len = nicoChatArray.length; i < len; i++) {
let nicoChat = nicoChatArray[i];
let nc = NicoChatViewModel.create(nicoChat, this._offScreen);
this._members.push(nc);
}
if (this._members.length < 1) {
return;
}
this._lastUpdate = Date.now();
// if (this._layoutWorker) {
this._execCommentLayoutWorker();
// } else {
// this._groupCollision();
// }
},
_onCommentSpeedRateUpdate() {
this.changeSpeed(NicoChatViewModel.SPEED_RATE);
},
changeSpeed: function(speedRate = 1) {
// TODO: y座標と弾幕判定はリセットしないといけない気がする
this._members.forEach(member => member.recalcBeginEndTiming(speedRate));
this._execCommentLayoutWorker();
},
_groupCollision: function () {
this._createVSortedMembers();
let members = this._vSortedMembers;
for (let i = 0, len = members.length; i < len; i++) {
let o = members[i];
this.checkCollision(o);
o.setIsLayouted(true);
}
},
addChat: function (nicoChat) {
let timeKey = 'addChat:' + nicoChat.getText();
window.console.time(timeKey);
let nc = NicoChatViewModel.create(nicoChat, this._offScreen);
this._lastUpdate = Date.now();
// 内部処理効率化の都合上、
// 自身を追加する前に判定を行っておくこと
this.checkCollision(nc);
nc.setIsLayouted(true);
this._members.push(nc);
// if (this._layoutWorker) {
this._execCommentLayoutWorker();
// } else {
// this._createVSortedMembers();
// }
window.console.timeEnd(timeKey);
},
reset: function () {
let m = this._members;
for (let i = 0, len = m.length; i < len; i++) {
m[i].reset();
}
this._members = [];
this._vSortedMembers = [];
this._lastUpdate = Date.now();
},
getCurrentTime: function () {
return this._nicoChatGroup.getCurrentTime();
},
getType: function () {
return this._nicoChatGroup.getType();
},
checkCollision: function (target) {
if (target.isInvisible()) {
return;
}
let m = this._vSortedMembers;
let o;
let beginLeft = target.getBeginLeftTiming();
for (let i = 0, len = m.length; i < len; i++) {
o = m[i];
// 自分よりうしろのメンバーには影響を受けないので処理不要
if (o === target) {
return;
}
if (beginLeft > o.getEndRightTiming()) {
continue;
}
if (o.checkCollision(target)) {
target.moveToNextLine(o);
// ずらした後は再度全チェックするのを忘れずに(再帰)
if (!target.isOverflow()) {
this.checkCollision(target);
return;
}
}
}
},
getBulkLayoutData: function () {
this._createVSortedMembers();
let m = this._vSortedMembers;
let result = [];
for (let i = 0, len = m.length; i < len; i++) {
result.push(m[i].getBulkLayoutData());
}
return result;
},
setBulkLayoutData: function (data) {
let m = this._vSortedMembers;
for (let i = 0, len = m.length; i < len; i++) {
m[i].setBulkLayoutData(data[i]);
}
},
getBulkSlotData: function () {
this._createVSortedMembers();
let m = this._vSortedMembers;
let result = [];
for (let i = 0, len = m.length; i < len; i++) {
let o = m[i];
result.push({
id: o.getId(),
slot: o.getSlot(),
fork: o.getFork(),
no: o.getNo(),
vpos: o.getVpos(),
begin: o.getInviewTiming(),
end: o.getEndRightTiming(),
invisible: o.isInvisible()
});
}
return result;
},
setBulkSlotData: function (data) {
let m = this._vSortedMembers;
for (let i = 0, len = m.length; i < len; i++) {
m[i].setSlot(data[i].slot);
}
},
/**
* vposでソートされたメンバーを生成. 計算効率改善用
*/
_createVSortedMembers: function () {
this._vSortedMembers = this._members.concat().sort(NicoChat.SORT_FUNCTION);
return this._vSortedMembers;
},
getMembers: function () {
return this._members;
},
/**
* 現時点で表示状態のメンバーのみを返す
*/
getInViewMembers: function () {
return this.getInViewMembersBySecond(this.getCurrentTime());
},
/**
* secの時点で表示状態のメンバーのみを返す
*/
getInViewMembersBySecond: function (sec) {
// TODO: もっと効率化
//var maxDuration = NicoChatViewModel.DURATION.NAKA;
let result = [], m = this._vSortedMembers, len = m.length;
for (let i = 0; i < len; i++) {
let chat = m[i]; //, s = m.getBeginLeftTiming();
//if (sec - s > maxDuration) { break; }
if (chat.isInViewBySecond(sec)) {
result.push(chat);
}
}
//console.log('inViewMembers.length: ', result.length, sec);
return result;
},
getInViewMembersByVpos: function (vpos) {
if (!this._hasLayout) {
this._layout();
}
return this.getInViewMembersBySecond(vpos / 100);
},
toString: function () {
let result = [], m = this._members, len = m.length;
result.push(['\t<group ',
'type="', this._nicoChatGroup.getType(), '" ',
'length="', m.length, '" ',
'>'
].join(''));
for (let i = 0; i < len; i++) {
result.push(m[i].toString());
}
result.push('\t</group>');
return result.join('\n');
}
});
/**
* コメントの最小単位
*
*/
class NicoChat {
static createBlank(options = {}) {
return Object.assign({
text: '',
date: '000000000',
cmd: '',
premium: false,
user_id: '0',
vpos: 0,
deleted: '',
color: '#FFFFFF',
size: NicoChat.SIZE.MEDIUM,
type: NicoChat.TYPE.NAKA,
score: 0,
no: 0,
fork: 0,
isInvisible: false,
isReverse: false,
isPatissier: false,
fontCommand: '',
commentVer: 'flash',
currentTime: 0,
hasDurationSet: false,
isMine: false,
isUpdating: false,
thread: 0,
nicoru: 0,
opacity: 1
}, options);
}
static create(data, ...options) {
return new NicoChat(NicoChat.createBlank(data), ...options);
}
static createFromChatElement(elm, ...options) {
let data = {
text: elm.textContent,
date: parseInt(elm.getAttribute('date'), 10) || Math.floor(Date.now() / 1000),
cmd: elm.getAttribute('mail') || '',
isPremium: elm.getAttribute('premium') === '1',
userId: elm.getAttribute('user_id'),
vpos: parseInt(elm.getAttribute('vpos'), 10),
deleted: elm.getAttribute('deleted') === '1',
isMine: elm.getAttribute('mine') === '1',
isUpdating: elm.getAttribute('updating') === '1',
score: parseInt(elm.getAttribute('score') || '0', 10),
fork: parseInt(elm.getAttribute('fork') || '0', 10),
leaf: parseInt(elm.getAttribute('leaf') || '-1', 10),
no: parseInt(elm.getAttribute('no') || '0', 10),
thread: parseInt(elm.getAttribute('thread'), 10)
};
return new NicoChat(data, ...options);
}
static parseCmd(cmd, isFork) {
let tmp = cmd.toLowerCase().split(/[\x20\xA0\u3000\t\u2003\s]+/);
let result = {};
tmp.forEach(c => {
if (NicoChat.COLORS[c]) {
result.COLOR = NicoChat.COLORS[c];
} else if (NicoChat._COLOR_MATCH.test(c)) {
result.COLOR = c;
} else if (isFork && NicoChat._CMD_DURATION.test(c)) {
result.duration = RegExp.$1;
} else {
result[c] = true;
}
});
return result;
}
static SORT_FUNCTION(a, b) {
let av = a.getVpos(), bv = b.getVpos();
if (av !== bv) {
return av - bv;
} else {
return a.getUniqNo() < b.getUniqNo() ? -1 : 1;
}
}
constructor(data, videoDuration = 0x7FFFFF, mainThreadId = 0) {
this._id = `chat${NicoChat.id++}`;
this._currentTime = 0;
let text = this._text = data.text;
this._date = data.date;
this._cmd = data.cmd;
this._isPremium = data.premium ? '1' : '0';
this._userId = data.user_id;
this._vpos = data.vpos;
this._deleted = data.deleted;
this._isMine = data.isMine;
this._isUpdating = data.isUpdating;
this._score = data.score;
this._fork = data.fork * 1;
this._leaf = data.leaf;
this._thread = data.thread * 1;
this._isSubThread = (mainThreadId && this._thread !== mainThreadId);
this._layerId = typeof data.layerId === 'number' ?
data.layerId : (/* this._thread * 10 + */ this._fork * 1);
this._no = data.no;
this._uniqNo =
(data.no % 10000) +
(data.fork * 100000) +
((data.thread % 1000000) * 1000000);
this._color = null;
this._size = NicoChat.SIZE.MEDIUM;
this._type = NicoChat.TYPE.NAKA;
this._duration = NicoChatViewModel.DURATION.NAKA;
this._commentVer = 'flash';
this._nicoru = data.nicoru || 0;
this._opacity = 1;
this.time3d = 0;
this.time3dp = 0;
if (this._fork > 0 && text.match(/^[/＠@]/)) {
this._isNicoScript = true;
this._isInvisible = true;
}
if (this._deleted) {
return;
}
let cmd = this._cmd;
if (cmd.length > 0) {
let pcmd = this.constructor.parseCmd(cmd, this._fork > 0);
if (pcmd.COLOR) {
this._color = pcmd.COLOR;
this._hasColorCommand = true;
}
if (pcmd.big) {
this._size = NicoChat.SIZE.BIG;
this._hasSizeCommand = true;
} else if (pcmd.small) {
this._size = NicoChat.SIZE.SMALL;
this._hasSizeCommand = true;
}
if (pcmd.ue) {
this._type = NicoChat.TYPE.TOP;
this._duration = NicoChatViewModel.DURATION.TOP;
this._hasTypeCommand = true;
} else if (pcmd.shita) {
this._type = NicoChat.TYPE.BOTTOM;
this._duration = NicoChatViewModel.DURATION.BOTTOM;
this._hasTypeCommand = true;
}
if (pcmd.ender) {
this._isEnder = true;
}
if (pcmd.full) {
this._isFull = true;
}
if (pcmd.pattisier) {
this._isPatissier = true;
}
if (pcmd.duration) {
this._hasDurationSet = true;
this._duration = Math.max(0.01, parseFloat(pcmd.duration, 10));
}
if (pcmd.mincho) {
this._fontCommand = 'mincho';
this._commentVer = 'html5';
} else if (pcmd.gothic) {
this._fontCommand = 'gothic';
this._commentVer = 'html5';
} else if (pcmd.defont) {
this._fontCommand = 'defont';
this._commentVer = 'html5';
}
if (pcmd._live) {
this._opacity *= 0.5;
}
}
// durationを超える位置にあるコメントを詰める vposはセンチ秒なので気をつけ
const maxv =
this._isNicoScript ?
Math.min(this._vpos, videoDuration * 100) :
Math.min(this._vpos, (1 + videoDuration - this._duration) * 100);
const minv = Math.max(maxv, 0);
this._vpos = minv;
}
reset () {
this._text = '';
this._date = '000000000';
this._cmd = '';
this._isPremium = false;
this._userId = '';
this._vpos = 0;
this._deleted = '';
this._color = '#FFFFFF';
this._size = NicoChat.SIZE.MEDIUM;
this._type = NicoChat.TYPE.NAKA;
this._isMine = false;
this._score = 0;
this._no = 0;
this._fork = 0;
this._isInvisible = false;
this._isReverse = false;
this._isPatissier = false;
this._fontCommand = '';
this._commentVer = 'flash';
this._nicoru = 0;
this._currentTime = 0;
this._hasDurationSet = false;
}
setCurrentTime (sec) {
this._currentTime = sec;
}
getCurrentTime () {
return this._currentTime;
}
setGroup (group) {
this._group = group;
}
onChange () {
if (this._group) {
this._group.onChange({
chat: this
});
}
}
setIsUpdating (v) {
if (this._isUpdating !== v) {
this._isUpdating = !!v;
if (!v) {
this.onChange();
}
}
}
setIsPostFail (v) {
this._isPostFail = v;
}
isPostFail () {
return !!this._isPostFail;
}
getId () {
return this._id;
}
getText () {
return this._text;
}
setText (v) {
this._text = v;
}
getDate () {
return this._date;
}
getCmd () {
return this._cmd;
}
isPremium () {
return !!this._isPremium;
}
isEnder () {
return !!this._isEnder;
}
isFull () {
return !!this._isFull;
}
isMine () {
return !!this._isMine;
}
isUpdating () {
return !!this._isUpdating;
}
isInvisible () {
return this._isInvisible;
}
isNicoScript () {
return this._isNicoScript;
}
isPatissier () {
return this._isPatissier;
}
isSubThread() {
return this._isSubThread;
}
hasColorCommand () {
return !!this._hasColorCommand;
}
hasSizeCommand () {
return !!this._hasSizeCommand;
}
hasTypeCommand () {
return !!this._hasTypeCommand;
}
getDuration () {
return this._duration;
}
hasDurationSet () {
return !!this._hasDurationSet;
}
setDuration (v) {
this._duration = v;
this._hasDurationSet = true;
}
getUserId () {
return this._userId;
}
getVpos () {
return this._vpos;
}
getBeginTime () {
return this.getVpos() / 100;
}
isDeleted () {
return !!this._deleted;
}
getColor () {
return this._color;
}
setColor (v) {
this._color = v;
}
getSize () {
return this._size;
}
setSize (v) {
this._size = v;
}
getType () {
return this._type;
}
setType (v) {
this._type = v;
}
getScore () {
return this._score;
}
getNo () {
return this._no;
}
setNo(no) {
this._no = no;
this._uniqNo =
(no % 100000) +
(this._fork * 1000000) +
(this._thread * 10000000);
}
getUniqNo() {
return this._uniqNo;
}
getLayerId() {
return this._layerId;
}
getLeaf () {
return this._leaf;
}
getFork () {
return this._fork;
}
isReverse () {
return this._isReverse;
}
setIsReverse (v) {
this._isReverse = !!v;
}
getFontCommand () {
return this._fontCommand;
}
getCommentVer () {
return this._commentVer;
}
getThreadId() {
return this._thread;
}
get nicoru() {
return this._nicoru;
}
get opacity() {
return this._opacity;
}
}
NicoChat.id = 1000000;
NicoChat.SIZE = {
BIG: 'big',
MEDIUM: 'medium',
SMALL: 'small'
};
NicoChat.TYPE = {
TOP: 'ue',
NAKA: 'naka',
BOTTOM: 'shita'
};
NicoChat._CMD_DURATION = /[@＠]([0-9.]+)/;
NicoChat._CMD_REPLACE = /(ue|shita|sita|big|small|ender|full|[ ])/g;
NicoChat._COLOR_MATCH = /(#[0-9a-f]+)/i;
NicoChat._COLOR_NAME_MATCH = /([a-z]+)/i;
NicoChat.COLORS = {
'red': '#FF0000',
'pink': '#FF8080',
'orange': '#FFC000',
'yellow': '#FFFF00',
'green': '#00FF00',
'cyan': '#00FFFF',
'blue': '#0000FF',
'purple': '#C000FF',
'black': '#000000',
'white2': '#CCCC99',
'niconicowhite': '#CCCC99',
'red2': '#CC0033',
'truered': '#CC0033',
'pink2': '#FF33CC',
'orange2': '#FF6600',
'passionorange': '#FF6600',
'yellow2': '#999900',
'madyellow': '#999900',
'green2': '#00CC66',
'elementalgreen': '#00CC66',
'cyan2': '#00CCCC',
'blue2': '#3399FF',
'marineblue': '#3399FF',
'purple2': '#6633CC',
'nobleviolet': '#6633CC',
'black2': '#666666'
};
/**
* 個別のコメントの表示位置・タイミング計算
* コメントアート互換は大体こいつにかかっている
*
* コメントのサイズ計算まわりが意味不明なコードだらけだが、
* 仕様書にもない本家のバグを再現しようとするとこうなるので仕方ない。
* (しかも、これでも全然足りない)
* 互換性にこだわらないのであれば7割くらいが不要。
*/
class NicoChatViewModel {
static create(nicoChat, offScreen) {
if (nicoChat.getCommentVer() === 'html5') {
return new HTML5NicoChatViewModel(nicoChat, offScreen);
}
return new FlashNicoChatViewModel(nicoChat, offScreen);
}
constructor(nicoChat, offScreen) {
this._speedRate = NicoChatViewModel.SPEED_RATE;
this.initialize(nicoChat, offScreen);
if (this._height >= NicoCommentViewModel.SCREEN.HEIGHT - this._fontSizePixel / 2) {
this._isOverflow = true;
}
// // line-height は小数点以下切り捨てっぽいのでscaleYで補正する
let cssLineHeight = this._cssLineHeight;
this._cssScaleY = cssLineHeight / Math.floor(cssLineHeight);
this._cssLineHeight = Math.floor(cssLineHeight);
if (this._isOverflow || nicoChat.isInvisible()) {
this.checkCollision = () => {
return false;
};
}
}
initialize(nicoChat, offScreen) {
this._nicoChat = nicoChat;
this._offScreen = offScreen;
// 画面からはみ出したかどうか(段幕時)
this._isOverflow = false;
// 表示時間
this._duration = nicoChat.getDuration();
// 固定されたコメントか、流れるコメントか
this._isFixed = false;
this._scale = NicoChatViewModel.BASE_SCALE;
this._cssLineHeight = 29;
this._cssScaleY = 1;
this._y = 0;
this._slot = -1;
this._setType(nicoChat.getType());
// ここでbeginLeftTiming, endRightTimingが確定する
this._setVpos(nicoChat.getVpos());
this._setSize(nicoChat.getSize(), nicoChat.getCommentVer());
this._isLayouted = false;
// 文字を設定
// この時点で字幕の大きさが確定するので、
// Z座標・beginRightTiming, endLeftTimingまでが確定する
this._setText(nicoChat.getText());
if (this._isFixed) {
this._setupFixedMode();
} else {
this._setupMarqueeMode();
}
}
_setType (type) {
this._type = type;
switch (type) {
case NicoChat.TYPE.TOP:
this._isFixed = true;
break;
case NicoChat.TYPE.BOTTOM:
this._isFixed = true;
break;
}
}
_setVpos (vpos) {
switch (this._type) {
case NicoChat.TYPE.TOP:
this._beginLeftTiming = vpos / 100;
break;
case NicoChat.TYPE.BOTTOM:
this._beginLeftTiming = vpos / 100;
break;
default:
this._beginLeftTiming = vpos / 100 - 1;
break;
}
this._endRightTiming = this._beginLeftTiming + this._duration;
}
_setSize (size) {
this._size = size;
const SIZE_PIXEL = this._nicoChat.getCommentVer() === 'html5' ?
NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 : NicoChatViewModel.FONT_SIZE_PIXEL;
switch (size) {
case NicoChat.SIZE.BIG:
this._fontSizePixel = SIZE_PIXEL.BIG;
break;
case NicoChat.SIZE.SMALL:
this._fontSizePixel = SIZE_PIXEL.SMALL;
break;
default:
this._fontSizePixel = SIZE_PIXEL.MEDIUM;
break;
}
}
_setText (text) {
const fontCommand = this.getFontCommand();
const commentVer = this.getCommentVer();
let htmlText =
commentVer === 'html5' ?
NicoTextParser.likeHTML5(text) :
NicoTextParser.likeXP(text);
this._htmlText = htmlText;
this._text = text;
let field = this._offScreen.getTextField();
field.setText(htmlText);
field.setFontSizePixel(this._fontSizePixel);
field.setType(this._type, this._size, fontCommand, this.getCommentVer());
this._originalWidth = field.getOriginalWidth();
this._width = this._originalWidth * this._scale;
this._originalHeight = field.getOriginalHeight();
this._height = this._calculateHeight({});
// Chrome59で起こる謎の現象。一度ローカル変数に落とすと直る
// w を使わずにspwを計算するとNaNになる。謎
let w = this._width;
let speed;
let duration = this._duration / this._speedRate;
if (!this._isFixed) { // 流れるコメント (naka)
speed =
this._speed = (w + NicoCommentViewModel.SCREEN.WIDTH) / duration;
let spw = w / speed;
this._endLeftTiming = this._endRightTiming - spw;
this._beginRightTiming = this._beginLeftTiming + spw;
} else { // ue shita などの固定コメント
this._speed = 0;
this._endLeftTiming = this._endRightTiming;
this._beginRightTiming = this._beginLeftTiming;
}
}
recalcBeginEndTiming(speedRate = 1) {
let width = this._width;
let duration = this._duration / speedRate;
this._endRightTiming = this._beginLeftTiming + duration;
this._speedRate = speedRate;
if (isNaN(width)) {
return;
}
if (!this._isFixed) {
let speed =
this._speed = (width + NicoCommentViewModel.SCREEN.WIDTH) / duration;
let spw = width / speed;
this._endLeftTiming = this._endRightTiming - spw;
this._beginRightTiming = this._beginLeftTiming + spw;
} else {
this._speed = 0;
this._endLeftTiming = this._endRightTiming;
this._beginRightTiming = this._beginLeftTiming;
}
}
_calcLineHeight({size, scale = 1}) {
const SIZE = NicoChat.SIZE;
const MARGIN = 5;
//const TABLE_HEIGHT = 385;
scale *= NicoChatViewModel.BASE_SCALE;
let lineHeight;
if (scale >= 0.75) {
switch (size) {
case SIZE.BIG:
lineHeight = (50 - MARGIN * scale);
break;
case SIZE.SMALL:
lineHeight = (23 - MARGIN * scale);
break;
default:
lineHeight = (34 - MARGIN * scale);
break;
}
} else {
switch (size) {
case SIZE.BIG:
lineHeight = (387 - MARGIN * scale * 0.5) / 16;
break;
case SIZE.SMALL:
lineHeight = (383 - MARGIN * scale * 0.5) / 38;
break;
default:
lineHeight = (378 - MARGIN * scale * 0.5) / 25;
}
}
return lineHeight;
}
_calcDoubleResizedLineHeight({lc = 1, cssScale, size = NicoChat.SIZE.BIG}) {
const MARGIN = 5;
// ニコスクリプトだとBIG以外の二重リサイズもあり得る?
if (size !== NicoChat.SIZE.BIG) {
return (size === NicoChat.SIZE.MEDIUM ? 24 : 13) + MARGIN;
}
// @see https://www37.atwiki.jp/commentart/pages/20.html
cssScale = typeof cssScale === 'number' ? cssScale : this.getCssScale();
// 本当は行数ではなく縮小率から計算すべきなのだろうけど
let lineHeight;
if (lc <= 9) {
lineHeight = ((392 / cssScale) - MARGIN) / lc -1;
// lineHeight = ((392 - MARGIN * cssScale) / cssScale) / lc -1;
} else if (lc <= 10) {
lineHeight = ((384 / cssScale) - MARGIN) / lc -1;
} else if (lc <= 11) {
lineHeight = ((389 / cssScale) - MARGIN) / lc -1;
} else if (lc <= 12) {
lineHeight = ((388 / cssScale) - MARGIN) / lc -1;
} else if (lc <= 13) {
lineHeight = ((381 / cssScale) - MARGIN) / lc -1;
} else {
lineHeight = ((381 / cssScale) - MARGIN) / 14;
}
return lineHeight;
}
/**
* 高さ計算。
* 改行リサイズなどが起こる場合はそれを反映した結果の高さを返す
* Flashのほうはだんだん計算を諦めていく
*/
_calculateHeight ({scale = 1, lc = 0, size, isEnder, isDoubleResized}) {
lc = lc || this._lineCount;
isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder();
isDoubleResized = typeof isDoubleResized === 'boolean' ? isDoubleResized : this.isDoubleResized();
size = size || this._size;
const MARGIN = 5;
const TABLE_HEIGHT = 385;
let lineHeight;
scale *= NicoChatViewModel.BASE_SCALE;
if (isDoubleResized) {
this._cssLineHeight = this._calcDoubleResizedLineHeight({lc, size});
return ((this._cssLineHeight - MARGIN) * lc) * scale * 0.5 + MARGIN -1;
}
let height;
lineHeight = this._calcLineHeight({lc, size, scale});
this._cssLineHeight = lineHeight;
height = (lineHeight * lc + MARGIN) * scale;
if (lc === 1) {
this._isLineResized = false;
return height - 1;
}
if (isEnder || height < TABLE_HEIGHT / 3) {
this._isLineResized = false;
return height - 1;
}
// 非enderで画面の高さの1/3を超える時は改行リサイズ
this._isLineResized = true;
lineHeight = this._calcLineHeight({lc, size, scale: scale * 0.5});
this._cssLineHeight = lineHeight * 2 -1;
return (lineHeight * lc + MARGIN) * scale - 1;
}
_setupFixedMode () {
const nicoChat = this._nicoChat;
const SCREEN = NicoCommentViewModel.SCREEN;
let ver = nicoChat.getCommentVer();
let fullWidth = ver === 'html5' ? SCREEN.WIDTH_FULL_INNER_HTML5 : SCREEN.WIDTH_FULL_INNER;
let screenWidth =
nicoChat.isFull() ? fullWidth : SCREEN.WIDTH_INNER;
let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
let width = this._width;
if (this._isLineResized) {
width = ver === 'html5' ? Math.floor(width * 0.5 - 8) : (width * 0.5 + 4 * 0.5);
}
let isOverflowWidth = width > screenWidth;
// 臨界幅リサイズ
// 画面幅よりデカい場合の調整
if (isOverflowWidth) {
// 改行リサイズかつ臨界幅リサイズが起こるとき、基準が 画面幅 * 2 になる
// Flash時代のバグ由来の仕様
if (this._isLineResized) {
screenWidth *= 2;
this._isDoubleResized = true;
}
this._setScale(screenWidth / width);
} else {
this._setScale(1);
}
// BOTTOMの時だけy座標を画面の下端に合わせる
// 内部的には0 originで表示の際に下から詰むだけでもいいような気がしてきた。
if (this._type === NicoChat.TYPE.BOTTOM) {
this._y = screenHeight - this._height;
}
}
/**
* 流れる文字のモード
*/
_setupMarqueeMode () {
if (this._isLineResized) {
let duration = this._duration / this._speedRate;
this._setScale(this._scale);
let speed =
this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / duration;
this._endLeftTiming = this._endRightTiming - this._width / speed;
this._beginRightTiming = this._beginLeftTiming + this._width / speed;
}
}
_setScale (scale) {
this._scale = scale;
let lsscale = scale * (this._isLineResized ? 0.5 : 1);
this._height = this._calculateHeight({isDoubleResized: this.isDoubleResized()}) * scale;
this._width = this._originalWidth * lsscale;
}
getBulkLayoutData () {
return {
id: this.getId(),
fork: this.getFork(),
type: this.getType(),
isOverflow: this.isOverflow(),
isInvisible: this.isInvisible(),
isFixed: this._isFixed,
ypos: this.getYpos(),
slot: this.getSlot(),
height: this.getHeight(),
beginLeft: this.getBeginLeftTiming(),
beginRight: this.getBeginRightTiming(),
endLeft: this.getEndLeftTiming(),
endRight: this.getEndRightTiming(),
layerId: this.getLayerId()
};
}
setBulkLayoutData (data) {
this._isOverflow = data.isOverflow;
this._y = data.ypos;
this._isLayouted = true;
}
reset () {
}
get _lineCount() {
return (this._htmlText || '').split('<br>').length;
}
getId () {
return this._nicoChat.getId();
}
getText () {
return this._text;
}
getHtmlText () {
return this._htmlText;
}
setIsLayouted (v) {
this._isLayouted = v;
}
isInView () {
return this.isInViewBySecond(this.getCurrentTime());
}
isInViewBySecond (sec) {
if (!this._isLayouted || sec + 1 /* margin */ < this._beginLeftTiming) {
return false;
}
if (sec > this._endRightTiming) {
return false;
}
if (this.isInvisible()) {
return false;
}
return true;
}
isOverflow () {
return this._isOverflow;
}
isInvisible () {
return this._nicoChat.isInvisible();
}
getWidth () {
return this._width;
}
getHeight () {
return this._height;
}
getDuration () {
return this._duration / this._speedRate;
}
getSpeed () {
return this._speed;
}
getInviewTiming () {
return this._beginLeftTiming;
}
// 左端が見えるようになるタイミング(4:3規準)
getBeginLeftTiming () {
return this._beginLeftTiming;
}
// 右端が見えるようになるタイミング(4:3規準)
getBeginRightTiming () {
return this._beginRightTiming;
}
// 左端が見えなくなるタイミング(4:3規準)
getEndLeftTiming () {
return this._endLeftTiming;
}
// 右端が見えなくなるタイミング(4:3規準)
getEndRightTiming () {
return this._endRightTiming;
}
getVpos () {
return this._nicoChat.getVpos();
}
getXpos () {
return this.getXposBySecond(this.getCurrentTime());
}
getYpos () {
return this._y;
}
getSlot () {
return this._slot;
}
setSlot (v) {
this._slot = v;
}
getColor () {
return this._nicoChat.getColor();
}
getSize () {
return this._nicoChat.getSize();
}
getType () {
return this._nicoChat.getType();
}
getCssScale () {
return this._scale * (this._isLineResized ? 0.5 : 1);
}
getFontSizePixel () {
return this._fontSizePixel;
}
getLineHeight () {
return this._cssLineHeight;
}
isLineResized() {
return this._isLineResized;
}
isDoubleResized() {
return this._isDoubleResized;
}
getNo () {
return this._nicoChat.getNo();
}
getUniqNo () {
return this._nicoChat.getUniqNo();
}
getLayerId() {
return this._nicoChat.getLayerId();
}
getFork () {
return this._nicoChat.getFork();
}
/**
* second時の左端座標を返す
*/
getXposBySecond (sec) {
if (this._isFixed) {
return (NicoCommentViewModel.SCREEN.WIDTH - this._width) / 2;
} else {
let diff = sec - this._beginLeftTiming;
return NicoCommentViewModel.SCREEN.WIDTH + diff * this._speed;
}
}
getXposByVpos (vpos) {
return this.getXposBySecond(vpos / 100);
}
getCurrentTime () {
return this._nicoChat.getCurrentTime();
}
isFull () {
return this._nicoChat.isFull();
}
isNicoScript () {
return this._nicoChat.isNicoScript();
}
isMine () {
return this._nicoChat.isMine();
}
isUpdating () {
return this._nicoChat.isUpdating();
}
isPostFail () {
return this._nicoChat.isPostFail();
}
isReverse () {
return this._nicoChat.isReverse();
}
isSubThread () {
return this._nicoChat.isSubThread();
}
getFontCommand () {
return this._nicoChat.getFontCommand();
}
getCommentVer () {
return this._nicoChat.getCommentVer();
}
getCssScaleY() {
return this.getCssScale() * this._cssScaleY;
}
toString () { // debug用
// コンソールから
// ZenzaWatch.debug.getInViewElements()
// 叩いた時にmeta中に出る奴
let chat = JSON.stringify({
width: this.getWidth(),
height: this.getHeight(),
scale: this.getCssScale(),
cmd: this._nicoChat.getCmd(),
fontSize: this.getFontSizePixel(),
vpos: this.getVpos(),
xpos: this.getXpos(),
ypos: this.getYpos(),
slot: this.getSlot(),
type: this.getType(),
begin: this.getBeginLeftTiming(),
end: this.getEndRightTiming(),
speed: this.getSpeed(),
color: this.getColor(),
size: this.getSize(),
duration: this.getDuration(),
opacity: this.opacity,
// inView: this.isInView(),
ender: this._nicoChat.isEnder(),
full: this._nicoChat.isFull(),
no: this._nicoChat.getNo(),
uniqNo: this._nicoChat.getUniqNo(),
score: this._nicoChat.getScore(),
userId: this._nicoChat.getUserId(),
date: this._nicoChat.getDate(),
fork: this._nicoChat.getFork(),
layerId: this._nicoChat.getLayerId(),
ver: this._nicoChat.getCommentVer(),
lc: this._lineCount,
ls: this.isLineResized(),
thread: this._nicoChat.getThreadId(),
isSub: this._nicoChat.isSubThread(),
text: this.getText()
});
return chat;
}
/**
* コメント同士の衝突を判定
*
* @param {NicoChatViewModel} target
* @return boolean
*/
checkCollision (target) {
// 一度はみ出した文字は当たり判定を持たない
if (this.isOverflow() || target.isOverflow() || target.isInvisible()) {
return false;
}
if (this.getLayerId() !== target.getLayerId()) {
return false;
}
// Y座標が合わないなら絶対衝突しない
let targetY = target.getYpos();
let selfY = this.getYpos();
if (targetY + target.getHeight() < selfY ||
targetY > selfY + this.getHeight()) {
return false;
}
// ターゲットと自分、どっちが右でどっちが左か？の判定
let rt, lt;
if (this.getBeginLeftTiming() <= target.getBeginLeftTiming()) {
lt = this;
rt = target;
} else {
lt = target;
rt = this;
}
if (this._isFixed) {
// 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
// > か >= で挙動が変わるCAがあったりして正解がわからない
if (lt.getEndRightTiming() > rt.getBeginLeftTiming()) {
return true;
}
} else {
// 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
if (lt.getBeginRightTiming() >= rt.getBeginLeftTiming()) {
return true;
}
// 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
if (lt.getEndRightTiming() >= rt.getEndLeftTiming()) {
return true;
}
}
return false;
}
/**
* (衝突判定に引っかかったので)自分自身を一段ずらす.
*
* @param {NicoChatViewModel} others 示談相手
*/
moveToNextLine (others) {
let margin = 1; //NicoChatViewModel.CHAT_MARGIN;
let othersHeight = others.getHeight() + margin;
// 本来はちょっとでもオーバーしたらランダムすべきだが、
// 本家とまったく同じサイズ計算は難しいのでマージンを入れる
// コメントアートの再現という点では有効な妥協案
let overflowMargin = 10;
let rnd = Math.max(0, NicoCommentViewModel.SCREEN.HEIGHT - this._height);
let yMax = NicoCommentViewModel.SCREEN.HEIGHT - this._height + overflowMargin;
let yMin = 0 - overflowMargin;
let type = this._nicoChat.getType();
let y = this._y;
if (type !== NicoChat.TYPE.BOTTOM) {
y += othersHeight;
// 画面内に入りきらなかったらランダム配置
if (y > yMax) {
this._isOverflow = true;
}
} else {
y -= othersHeight;
// 画面内に入りきらなかったらランダム配置
if (y < yMin) {
this._isOverflow = true;
}
}
this._y = this._isOverflow ? Math.floor(Math.random() * rnd) : y;
}
get time3d() {
return this._nicoChat.time3d;
}
get time3dp() {
return this._nicoChat.time3dp;
}
get opacity() {
return this._nicoChat.opacity;
}
}
NicoChatViewModel.emitter = new Emitter();
// ここの値はレイアウト計算上の仮想領域の物であり、実際の表示はviewに依存
NicoChatViewModel.DURATION = {
TOP: 3 - 0.1,
NAKA: 4,
BOTTOM: 3 - 0.1
};
NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
NicoChatViewModel.FONT_SIZE_PIXEL = {
BIG: 39, // 39
MEDIUM: 24,
SMALL: 16 //15
};
NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 = {
BIG: 40 - 1, // 684 / 17 > x > 684 / 18
MEDIUM: 27 -1, // 684 / 25 > x > 684 / 26
SMALL: 18.4 -1 // 684 / 37 > x > 684 / 38
};
NicoChatViewModel.LINE_HEIGHT = {
BIG: 45,
MEDIUM: 29,
SMALL: 18
};
NicoChatViewModel.CHAT_MARGIN = 5;
NicoChatViewModel.BASE_SCALE = parseFloat(Config.getValue('baseChatScale'), 10);
Config.on('update-baseChatScale', scale => {
if (isNaN(scale)) {
return;
}
scale = parseFloat(scale, 10);
NicoChatViewModel.BASE_SCALE = scale;
NicoChatViewModel.emitter.emit('updateBaseChatScale', scale);
});
NicoChatViewModel.SPEED_RATE = 1.0;
let updateSpeedRate = () => {
let rate = Config.getValue('commentSpeedRate') * 1;
if (Config.getValue('autoCommentSpeedRate')) {
rate = rate / Math.max(Config.getValue('playbackRate'), 1);
}
// window.console.info('updateSpeedRate', rate, Config.getValue('commentSpeedRate'), NicoChatViewModel.SPEED_RATE);
if (rate !== NicoChatViewModel.SPEED_RATE) {
NicoChatViewModel.SPEED_RATE = rate;
NicoChatViewModel.emitter.emit('updateCommentSpeedRate', rate);
}
};
Config.on('update-commentSpeedRate', updateSpeedRate);
Config.on('update-autoCommentSpeedRate', updateSpeedRate);
Config.on('update-playbackRate', updateSpeedRate);
updateSpeedRate();
class FlashNicoChatViewModel extends NicoChatViewModel {
// getCssScaleY() {
// return this.isDoubleResized() ? this.getCssScale() : super.getCssScaleY();
// }
}
class HTML5NicoChatViewModel extends NicoChatViewModel {
_calculateHeight ({scale = 1, lc = 0, size, isEnder/*, isDoubleResized*/}) {
lc = lc || this._lineCount;
isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder();
// isDoubleResized = typeof isDoubleResized === 'boolean' ? isDoubleResized : this.isDoubleResized();
size = size || this._size;
const SIZE = NicoChat.SIZE;
const MARGIN = 4;
const SCREEN_HEIGHT = NicoCommentViewModel.SCREEN.HEIGHT;
const INNER_HEIGHT = SCREEN_HEIGHT - MARGIN;
const TABLE_HEIGHT = 360 - MARGIN;
// 参考データは縦360での計測なので補正する比率
const RATIO = INNER_HEIGHT / TABLE_HEIGHT;
scale *= RATIO;
scale *= NicoChatViewModel.BASE_SCALE;
this._isLineResized = false;
let lineHeight;
let height;
// @see http://ch.nicovideo.jp/883797/blomaga/ar1149544
switch (size) {
case SIZE.BIG:
lineHeight = 47;
break;
case SIZE.SMALL:
lineHeight = 22;
break;
default:
lineHeight = 32;
break;
}
this._cssLineHeight = lineHeight;
if (lc === 1) {
return lineHeight * scale - 1;
}
switch (size) {
case SIZE.BIG:
lineHeight = TABLE_HEIGHT / (8 * (TABLE_HEIGHT / 340));
break;
case SIZE.SMALL:
lineHeight = TABLE_HEIGHT / (21 * (TABLE_HEIGHT / 354));
break;
default:
lineHeight = TABLE_HEIGHT / (13 * (TABLE_HEIGHT / 357));
break;
}
height = (lineHeight * lc + MARGIN) * scale;
if (isEnder || height < TABLE_HEIGHT / 3) {
this._cssLineHeight = lineHeight;
return height - 1;
}
// 非enderで画面の高さの1/3を超える時は改行リサイズ
this._isLineResized = true;
switch (size) {
case SIZE.BIG:
lineHeight = TABLE_HEIGHT / 16;
break;
case SIZE.SMALL:
lineHeight = TABLE_HEIGHT / 38;
break;
default:
lineHeight = TABLE_HEIGHT / (25 * (TABLE_HEIGHT / 351));
}
this._cssLineHeight = lineHeight * 2;
return (lineHeight * lc + MARGIN) * scale - 1;
}
_setScale_ (scale) {
this._scale = scale;
this._height = this._calculateHeight({}) * scale;
this._width = this._originalWidth * scale * (this._isLineResized ? 0.5 : 1);
}
getCssScaleY() {
return this.getCssScale();
}
}
//==================================================
//==================================================
//==================================================
/**
* ニコニコ動画のコメントをCSS3アニメーションだけで再現出来るよ
* という一発ネタのつもりだったのだが意外とポテンシャルが高かった。
*
* DOM的に隔離されたiframeの領域内で描画する
*/
class NicoCommentCss3PlayerView extends Emitter {
constructor(params) {
super();
this._viewModel = params.viewModel;
this._viewModel.on('setData', this._onSetData.bind(this));
this._viewModel.on('currentTime', this._onCurrentTime.bind(this));
this._lastCurrentTime = 0;
this._isShow = true;
this._aspectRatio = 9 / 16;
this._inViewTable = {};
this._inSlotTable = {};
this._playbackRate = params.playbackRate || 1.0;
this._isPaused = undefined;
this._retryGetIframeCount = 0;
console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);
this._initializeView(params, 0);
this._config = Config.namespace('commentLayer');
this._gcElements = document.createElement('div');
this._gcElements.hidden = true;
let _refresh = this.refresh.bind(this);
// ウィンドウが非表示の時にブラウザが描画をサボっているので、
// 表示になったタイミングで粛正する
document.addEventListener('visibilitychange', () => {
if (!document.hidden) {
_refresh();
}
});
ZenzaWatch.debug.css3Player = this;
}
_initializeView (params, retryCount) {
if (retryCount === 0) {
window.console.time('initialize NicoCommentCss3PlayerView');
}
this._style = null;
this._commentLayer = null;
this._view = null;
let iframe = this._getIframe();
iframe.lazyload = 'off';
iframe.setAttribute('sandbox', 'allow-same-origin');
iframe.className = 'commentLayerFrame';
let html =
NicoCommentCss3PlayerView.__TPL__
.replace('%CSS%', '').replace('%MSG%', '')
.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
.replace('%OPTION_CSS%', '');
const onload = () => {
let win, doc;
iframe.onload = null;
if (util.isChrome()) {iframe.removeAttribute('srcdoc');}
try {
win = iframe.contentWindow;
doc = iframe.contentWindow.document;
} catch (e) {
window.console.error(e);
window.console.log('変な広告に乗っ取られました');
iframe.remove();
this._view = null;
ZenzaWatch.debug.commentLayer = null;
if (retryCount < 3) {
this._initializeView(params, retryCount + 1);
} else {
PopupMessage.alert('コメントレイヤーの生成に失敗');
}
return;
}
this._window = win;
this._document = doc;
this._optionStyle = doc.getElementById('optionCss');
this._style = doc.getElementById('nicoChatAnimationDefinition');
this._keyframesContainer = doc.getElementById('keyframesContainer');
const commentLayer = this._commentLayer = doc.getElementById('commentLayer');
const subLayer = this._subLayer = document.createElement('div');
subLayer.className = 'subLayer';
commentLayer.appendChild(subLayer);
// Config直接参照してるのは手抜き
doc.body.className = Config.getValue('debug') ? 'debug' : '';
Config.on('update-debug', val => doc.body.className = val ? 'debug' : '');
// 手抜きその2
this._optionStyle.innerHTML = NicoComment.offScreenLayer.getOptionCss();
ZenzaWatch.emitter.on('updateOptionCss', newCss => {
this._optionStyle.innerHTML = newCss;
});
ZenzaWatch.debug.getInViewElements = () => doc.getElementsByClassName('nicoChat');
const onResize = () => {
const w = win.innerWidth, h = win.innerHeight;
if (!w || !h) { return; }
// 基本は元動画の縦幅合わせだが、16:9より横長にはならない
const aspectRatio = Math.max(this._aspectRatio, 9 / 16);
const targetHeight = Math.min(h, w * aspectRatio);
const scale = targetHeight / 384;
commentLayer.style.transform = `scale3d(${scale}, ${scale}, 1)`;
};
const chkSizeInit = () => {
const h = win.innerHeight;
if (!h) {
window.setTimeout(chkSizeInit, 500);
} else {
util.watchResize(iframe, _.throttle(onResize, 100));
this._onResize = onResize;
onResize();
}
};
ZenzaWatch.emitter.on('fullscreenStatusChange', _.debounce(onResize, 2000));
document.addEventListener('visibilitychange', _.debounce(() => {
if (!document.hidden) {
onResize();
}
}, 500));
window.setTimeout(chkSizeInit, 100);
if (this._isPaused) {
this.pause();
}
const updateTextShadow = type => {
const types = ['shadow-type2', 'shadow-type3', 'shadow-stroke', 'shadow-dokaben'];
types.forEach(t => doc.body.classList.toggle(t, t === type));
};
updateTextShadow(this._config.getValue('textShadowType'));
this._config.on('update-textShadowType', _.debounce(updateTextShadow, 100));
ZenzaWatch.debug.nicoVideoCapture = () => {
const html = this.getCurrentScreenHtml();
const video = document.querySelector('video.nico');
return VideoCaptureUtil.nicoVideoToCanvas({video, html})
.then(({canvas, img}) => {
canvas.style.border = '2px solid blue';
canvas.className = 'debugCapture';
canvas.addEventListener('click', () => {
VideoCaptureUtil.saveToFile(canvas, 'sample.png');
});
document.body.appendChild(canvas);
window.console.log('ok', canvas);
return Promise.resolve({canvas, img});
}, err => {
sessionStorage.lastCaptureErrorSrc = html;
window.console.error('!', err);
return Promise.reject(err);
});
};
ZenzaWatch.debug.svgTest = () => {
const svg = this.getCurrentScreenSvg();
const blob = new Blob([svg], {'type': 'text/plain'});
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.setAttribute('download', 'test.svg');
a.setAttribute('target', '_blank');
a.setAttribute('rel', 'noopener');
a.setAttribute('href', url);
document.body.appendChild(a);
a.click();
window.setTimeout(() => a.remove(), 1000);
};
window.console.timeEnd('initialize NicoCommentCss3PlayerView');
};
this._view = iframe;
if (this._$node) {
this._$node.append(iframe);
}
if (iframe.srcdocType === 'string') {
iframe.onload = onload;
iframe.srcdoc = html;
} else {
// MS IE/Edge用
if (!this._$node) {
this._msEdge = true;
// ここに直接書いてるのは掟破り。 動かないよりはマシということで・・・
$('.zenzaPlayerContainer').append(iframe);
}
iframe.contentWindow.document.open();
iframe.contentWindow.document.write(html);
iframe.contentWindow.document.close();
window.setTimeout(onload, 0);
}
ZenzaWatch.debug.commentLayer = iframe;
if (!params.show) {
this.hide();
}
}
_getIframe () {
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
iframe.srcdocType = iframe.srcdocType || (typeof iframe.srcdoc);
iframe.srcdoc = '<html></html>';
} catch (e) {
// 行儀の悪い広告にiframeを乗っ取られた？
this._retryGetIframeCount++;
window.console.error('Error: ', e);
if (this._retryGetIframeCount < 5) {
window.console.log('変な広告に乗っ取られたのでリトライ', this._retryGetIframeCount);
return this._getIframe();
} else {
PopupMessage.alert('コメントレイヤーの生成に失敗しました');
}
}
// iframe.setAttribute('allow', 'vr');
return iframe;
}
_onCommand (command, param) {
this.emit('command', command, param);
}
_adjust () {
if (!this._view) {
return;
}
if (typeof this._onResize === 'function') {
return this._onResize();
}
}
getView () {
return this._view;
}
setPlaybackRate (playbackRate) {
// let isSpeedUp = this._playbackRate < playbackRate;
this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
if (!Config.getValue('autoCommentSpeedRate') || this._playbackRate <= 1) {
this.refresh();
}
}
setAspectRatio (ratio) {
this._aspectRatio = ratio;
this._adjust();
}
_onSetData () {
this.clear();
}
_onCurrentTime (sec) {
let REFRESH_THRESHOLD = 1;
this._lastCurrentTime = this._currentTime;
this._currentTime = sec;
if (this._lastCurrentTime === this._currentTime) {
// pauseでもないのにcurrentTimeの更新が途絶えたらロードが詰まった扱い
if (!this._isPaused) {
this._setStall(true);
}
} else if (this._currentTime < this._lastCurrentTime ||
Math.abs(this._currentTime - this._lastCurrentTime) > REFRESH_THRESHOLD) {
// 後方へのシーク、または 境界値以上の前方シーク時は全体を再描画
this.refresh();
} else {
this._setStall(false);
this._updateInviewElements();
}
}
_addClass (name) {
if (!this._commentLayer) {
return;
}
this._commentLayer.classList.add(name);
}
_removeClass (name) {
if (!this._commentLayer) {
return;
}
this._commentLayer.classList.remove(name);
}
_setStall (v) {
if (v) {
this._addClass('is-stalled');
}
else {
this._removeClass('is-stalled');
}
}
pause () {
if (this._commentLayer) {
this._addClass('paused');
}
this._isPaused = true;
}
play () {
if (this._commentLayer) {
this._removeClass('paused');
}
this._isPaused = false;
}
clear () {
if (this._commentLayer) {
this._commentLayer.textContent = '';
this._subLayer.textContent = '';
this._commentLayer.appendChild(this._subLayer);
this._gcElements.textContent = '';
this._keyframesContainer.textContent = '';
}
if (this._style) {
this._style.textContent = '';
}
this._inViewTable = {};
this._inSlotTable = {};
}
refresh () {
this.clear();
this._updateInviewElements();
}
_updateInviewElements () {
if (!this._commentLayer || !this._style || !this._isShow || document.hidden) {
return;
}
let groups = [
this._viewModel.getGroup(NicoChat.TYPE.NAKA),
this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
this._viewModel.getGroup(NicoChat.TYPE.TOP)
];
let css = [], inView = [], dom = [], subDom = [];
let i, len;
// 表示状態にあるchatを集める
for (i = 0, len = groups.length; i < len; i++) {
let group = groups[i];
inView = inView.concat(group.getInViewMembers());
}
let nicoChat;
let ct = this._currentTime;
let newView = [];
for (i = 0, len = inView.length; i < len; i++) {
nicoChat = inView[i];
let domId = nicoChat.getId();
if (this._inViewTable[domId]) {
continue;
}
this._inViewTable[domId] = nicoChat;
this._inSlotTable[domId] = nicoChat;
newView.push(nicoChat);
}
if (newView.length > 1) {
newView.sort(NicoChat.SORT_FUNCTION);
}
for (i = 0, len = newView.length; i < len; i++) {
nicoChat = newView[i];
let type = nicoChat.getType();
let size = nicoChat.getSize();
let cssText = NicoChatCss3View.buildChatCss(nicoChat, type, ct, this._playbackRate);
let element = NicoChatCss3View.buildChatDom(nicoChat, type, size, cssText);
(nicoChat.isSubThread() ? subDom : dom).push(element);
if (cssText.keyframes) {
css.push(cssText.keyframes);
}
}
// DOMへの追加
if (newView.length > 0) {
let inSlotTable = this._inSlotTable, currentTime = this._currentTime;
let outViewIds = [];
let margin = 2 / NicoChatViewModel.SPEED_RATE;
Object.keys(inSlotTable).forEach(key => {
let chat = inSlotTable[key];
if (currentTime - margin < chat.getEndRightTiming()) {
return;
}
delete inSlotTable[key];
outViewIds.push(key);
});
requestAnimationFrame(() => this._updateDom(dom, subDom, css, outViewIds));
// this._updateDom(dom, subDom, css, outViewIds);
}
}
_updateDom (dom, subDom, css, outViewIds) {
this._style.insertAdjacentText('beforeend', css.join(''));
if (dom.length) {
let fragment = document.createDocumentFragment();
fragment.append(...dom);
this._commentLayer.append(fragment);
}
if (subDom.length) {
let subFragment = document.createDocumentFragment();
subFragment.append(...subDom);
this._subLayer.append(subFragment);
}
this._removeOutviewElements(outViewIds);
this._gcInviewElements();
}
/*
* アニメーションが終わっているはずの要素を除去
*/
_removeOutviewElements (outViewIds) {
let doc = this._document;
if (!doc) {
return;
}
let elements =
outViewIds.map(id => doc.getElementById(id)).filter(e => e);
if (elements.length < 1) { return; }
let fragment = document.createDocumentFragment();
fragment.append(...elements);
this._gcElements.append(fragment);
}
/*
* 古い順に要素を除去していく
*/
_gcInviewElements (/*outViewIds*/) {
if (!this._commentLayer || !this._style) {
return;
}
let max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;
let commentLayer = this._commentLayer;
let i, inViewElements;
let elements = [];
inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork0'));
for (i = inViewElements.length - max - 1; i >= 0; i--) {
elements.push(inViewElements[i]);
}
//inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork1'));
//for (i = inViewElements.length - max - 10 - 1; i >= 0; i--) {
// elements.push(inViewElements[i]);
//}
if (elements.length < 1) { return; }
let fragment = document.createDocumentFragment();
fragment.append(...elements);
this._gcElements.append(fragment);
}
buildHtml (currentTime) {
currentTime = currentTime || this._viewModel.getCurrentTime();
window.console.time('buildHtml');
let groups = [
this._viewModel.getGroup(NicoChat.TYPE.NAKA),
this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
this._viewModel.getGroup(NicoChat.TYPE.TOP)
];
let members = [];
for (let i = 0; i < groups.length; i++) {
let group = groups[i];
members = members.concat(group.getMembers());
}
members.sort(NicoChat.SORT_FUNCTION);
let html = [];
html.push(this._buildGroupHtml(members, currentTime));
// css.push(this._buildGroupCss(members, currentTime));
let tpl = NicoCommentCss3PlayerView.__TPL__
.replace('%LAYOUT_CSS%', NicoTextParser.__css__)
.replace('%OPTION_CSS%', NicoComment.offScreenLayer.getOptionCss());
tpl = tpl.replace('%CSS%', '');
tpl = tpl.replace('%MSG%', html.join(''));
window.console.timeEnd('buildHtml');
return tpl;
}
_buildGroupHtml (m, currentTime = 0) {
let result = [];
for (let i = 0, len = m.length; i < len; i++) {
let chat = m[i];
let type = chat.getType();
let cssText = NicoChatCss3View.buildChatCss(chat, type, currentTime);
let element = NicoChatCss3View.buildChatHtml(chat, type, cssText);
if (cssText.keyframes) {
result.push(`<style>${cssText.keyframes}</style>`);
}
result.push(element);
}
return result.join('\n');
}
_buildGroupCss (m, currentTime) {
let result = [];
for (let i = 0, len = m.length; i < len; i++) {
let chat = m[i];
let type = chat.getType();
result.push(NicoChatCss3View.buildChatCss(chat, type, currentTime));
}
return result.join('\n');
}
show () {
if (!this._isShow) {
this._isShow = true;
this.refresh();
}
console.log('show!');
}
hide () {
this.clear();
this._isShow = false;
}
appendTo ($node) {
if (this._msEdge) {
return;
} // MS IE/Edge...
this._$node = $node;
$node.append(this._view);
}
/**
* toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
* 生成されたHTMLを開くだけで、スクリプトもなにもないのに
* ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
*/
toString () {
return this.buildHtml(0)
.replace('<html', '<html class="saved"');
}
getCurrentScreenHtml () {
const win = this._window;
if (!win) {
return null;
}
this.refresh();
let body = win.document.body;
body.classList.add('in-capture');
let html = win.document.querySelector('html').outerHTML;
body.classList.remove('in-capture');
html = html
.replace('<html ', '<html xmlns="http://www.w3.org/1999/xhtml" ')
.replace(/<meta.*?>/g, '')
.replace(/data-meta=".*?"/g, '')
.replace(/<br>/g, '<br/>');
return html;
}
getCurrentScreenSvg () {
const win = this._window;
if (!win) {
return null;
}
this.refresh();
let body = win.document.body;
body.classList.add('in-capture');
let style = win.document.querySelector('style').innerHTML;
const w = 682, h = 382;
const head =
(`<svg
xmlns="http://www.w3.org/2000/svg"
version="1.1">
`);
const defs = `
<defs>
<style type="text/css" id="layoutCss"><![CDATA[
${style}
.nicoChat {
animation-play-state: paused !important;
}
]]>
</style>
</defs>
`.trim();
const textList = [];
Array.from(win.document.querySelectorAll('.nicoChat')).forEach(chat => {
let j = JSON.parse(chat.getAttribute('data-meta'));
chat.removeAttribute('data-meta');
chat.setAttribute('y', j.ypos);
let c = chat.outerHTML;
c = c.replace(/<span/g, '<text');
c = c.replace(/<\/span>$/g, '</text>');
c = c.replace(/<(\/?)(span|group|han_group|zen_group|spacer)/g, '<$1tspan');
c = c.replace(/<br>/g, '<br/>');
textList.push(c);
});
const view =
(`
<g fill="#00ff00">
${textList.join('\n\t')}
</g>
`);
const foot =
(`
<g style="background-color: #333; overflow: hidden; width: ${w}; height: ${h}; padding: 0 69px;" class="shadow-dokaben in-capture paused">
<g class="commentLayerOuter" width="682" height="384">
<g class="commentLayer is-stalled" id="commentLayer" width="544" height="384">
</g>
</g>
</g>
</svg> `).trim();
return `${head}${defs}${view}${foot}`;
}
}
NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;
/* eslint-disable */
NicoCommentCss3PlayerView.__TPL__ = ((Config) => {
let ownerShadowColor = Config.getValue('commentLayer.ownerCommentShadowColor');
ownerShadowColor = ownerShadowColor.replace(/([^a-z^0-9^#])/ig, '');
let textShadowColor = '#000';
let textShadowColor2 = '#fff';
let textShadowGray = '#888';
return (`
<!DOCTYPE html>
<html lang="ja"
style="background-color: unset !important; background: none !important;"
>
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">
body.in-capture .commentLayerOuter {
overflow: hidden;
width: 682px;
height: 384px;
padding: 0 69px;
}
body.in-capture .commentLayer {
transform: none !important;
}
.mode-3d .commentLayer {
perspective: 50px;
}
.saved body {
pointer-events: auto;
}
.debug .mincho { background: rgba(128, 0, 0, 0.3); }
.debug .gulim { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }
@keyframes fixed {
0% { opacity: 1; visibility: visible; }
95% { opacity: 1; }
100% { opacity: 0.5; visibility: hidden;}
}
@keyframes show-hide {
0% { visibility: visible; }
100% { visibility: hidden; }
}
@keyframes dokaben {
0% {
visibility: visible;
transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale(var(--dokaben-scale));
}
50% {
transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg) scale(var(--dokaben-scale));
}
90% {
transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg) scale(var(--dokaben-scale));
}
100% {
visibility: hidden;
transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale(var(--dokaben-scale));
}
}
@keyframes idou-var {
0% {
visibility: visible;
transform: var(--transform-start);
}
100% {
transform: var(--transform-end);
}
}
.commentLayerOuter {
position: fixed;
top: 50%;
left: 50%;
width: 672px;
padding: 0 64px;
height: 384px;
right: 0;
bottom: 0;
transform: translate3d(-50%, -50%, 0);
box-sizing: border-box;
}
.saved .commentLayerOuter {
background: #333;
}
.commentLayer {
position: relative;
width: 544px;
height: 384px;
margin: 0;
padding: 0;
box-sizing: border-box;
contain: layout style size;
}
.subLayer {
position: absolute;
width: 100%;
height: 100%;
opacity: 0.7;
contain: layout style size;
}
.debug .commentLayer {
outline: 1px solid green;
transform: none !important;
}
.nicoChat {
line-height: 1.235;
visibility: hidden;
text-shadow: 1px 1px 0 ${textShadowColor};
transform-origin: 0 0;
animation-timing-function: linear;
animation-fill-mode: forwards;
will-change: transform, opacity;
contain: layout style paint;
color: #fff;
-webkit-font-smoothing: initial;
font-smooth: auto;
text-rendering: optimizeSpeed;
font-kerning: none;
}
.shadow-type2 .nicoChat {
text-shadow:
1px 1px 0 rgba(0, 0, 0, 0.5),
-1px 1px 0 rgba(0, 0, 0, 0.5),
-1px -1px 0 rgba(0, 0, 0, 0.5),
1px -1px 0 rgba(0, 0, 0, 0.5);
}
.shadow-type3 .nicoChat {
text-shadow:
1px 1px 1px rgba( 0, 0, 0, 0.8),
0 0 2px rgba( 0, 0, 0, 0.8),
-1px -1px 1px rgba(128, 128, 128, 0.8);
}
.shadow-stroke .nicoChat {
text-shadow: none;
-webkit-text-stroke: 1px rgba(0, 0, 0, 0.7);
text-stroke: 1px rgba(0, 0, 0, 0.7);
}
/*「RGBは大体　文字200、80、0　縁150,50,0　くらい」らしい*/
.shadow-dokaben .nicoChat.ue,
.shadow-dokaben .nicoChat.shita {
color: rgb(200, 80, 0);
font-family: 'dokaben_ver2_1' !important;
font-weight: bolder;
animation-name: dokaben !important;
text-shadow:
1px 1px 0 rgba(150, 50, 0, 1),
-1px 1px 0 rgba(150, 50, 0, 1),
-1px -1px 0 rgba(150, 50, 0, 1),
1px -1px 0 rgba(150, 50, 0, 1) !important;
transform-origin: center bottom;
animation-timing-function: steps(10);
perspective-origin: center bottom;
}
.shadow-dokaben .nicoChat.ue *,
.shadow-dokaben .nicoChat.shita * {
font-family: 'dokaben_ver2_1' !important;
}
.shadow-dokaben .nicoChat {
text-shadow:
1px 1px 0 rgba(0, 0, 0, 0.5),
-1px 1px 0 rgba(0, 0, 0, 0.5),
-1px -1px 0 rgba(0, 0, 0, 0.5),
1px -1px 0 rgba(0, 0, 0, 0.5);
}
.nicoChat.ue, .nicoChat.shita {
animation-name: fixed;
}
.nicoChat.ue.html5, .nicoChat.shita.html5 {
animation-name: show-hide;
}
.nicoChat.black, .nicoChat.black.fork1 {
text-shadow:
-1px -1px 0 ${textShadowGray},
1px 1px 0 ${textShadowGray};
}
.nicoChat.ue,
.nicoChat.shita {
display: inline-block;
text-shadow: 0 0 3px #000;
}
.nicoChat.ue.black,
.nicoChat.shita.black {
text-shadow: 0 0 3px #fff;
}
.nicoChat .type0655,
.nicoChat .zero_space {
text-shadow: none;
-webkit-text-stroke: unset;
opacity: 0;
}
.nicoChat .han_space,
.nicoChat .zen_space {
text-shadow: none;
-webkit-text-stroke: unset;
opacity: 0;
}
.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
text-shadow: none;
-webkit-text-stroke: unset;
color: yellow;
background: #fff;
opacity: 0.3;
}
.debug .nicoChat .tab_space {
text-shadow: none;
-webkit-text-stroke: unset;
background: #ff0;
opacity: 0.3;
}
.nicoChat .invisible_code {
text-shadow: none;
-webkit-text-stroke: unset;
opacity: 0;
}
.nicoChat .zero_space {
text-shadow: none;
-webkit-text-stroke: unset;
opacity: 0;
}
.debug .nicoChat .zero_space {
display: inline;
position: absolute;
}
.debug .html5_zen_space {
color: #888;
opacity: 0.5;
}
.nicoChat .fill_space, .nicoChat .html5_fill_space {
text-shadow: none;
-webkit-text-stroke: unset !important;
text-stroke: unset !important;
background: currentColor;
}
.nicoChat .mesh_space {
text-shadow: none;
-webkit-text-stroke: unset;
}
.nicoChat .block_space, .nicoChat .html5_block_space {
text-shadow: none;
}
.debug .nicoChat.ue {
text-decoration: overline;
}
.debug .nicoChat.shita {
text-decoration: underline;
}
.nicoChat.mine {
border: 1px solid yellow;
}
.nicoChat.updating {
border: 1px dotted;
}
.nicoChat.fork1 {
text-shadow:
1px 1px 0 ${ownerShadowColor},
-1px -1px 0 ${ownerShadowColor};
-webkit-text-stroke: unset;
}
.nicoChat.ue.fork1,
.nicoChat.shita.fork1 {
display: inline-block;
text-shadow: 0 0 3px ${ownerShadowColor};
-webkit-text-stroke: unset;
}
.nicoChat.fork2 {
outline: dotted 1px #000088;
}
.nicoChat.blink {
border: 1px solid #f00;
}
.nicoChat.subThread {
filter: opacity(0.7);
}
@keyframes spin {
0% { transform: rotate(0deg); }
100% { transform: rotate(3600deg); }
}
.nicoChat.updating::before {
content: '❀';
opacity: 0.8;
color: #f99;
display: inline-block;
text-align: center;
animation-name: spin;
animation-iteration-count: infinite;
animation-duration: 10s;
}
.nicoChat.updating::after {
content: ' 通信中...';
font-size: 50%;
opacity: 0.8;
color: #ccc;
}
.nicoChat.updating::after {
animation-direction: alternate;
}
.nicoChat.fail {
border: 1px dotted red;
text-decoration: line-through;
}
.nicoChat.fail:after {
content: ' 投稿失敗...';
text-decoration: none;
font-size: 80%;
opacity: 0.8;
color: #ccc;
}
.debug .nicoChat {
outline: 1px outset;
}
spacer {
visibility: hidden;
}
.debug spacer {
visibility: visible;
outline: 3px dotted orange;
}
.is-stalled *,
.paused *{
animation-play-state: paused !important;
}
</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body style="background-color: unset !important; background: none !important;">
<div hidden="true" id="keyframesContainer"></div>
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>
`).trim();
})(Config);
/* eslint-enable */
class NicoChatCss3View {
/**
*
* @param {NicoChatViewModel}chat
* @param {string} type
* @param {string} size
* @param {{inline: string, keyframes: string}} cssText
* @return {HTMLElement}
*/
static buildChatDom (chat, type, size, cssText) {
let span = document.createElement('span');
let ver = chat.getCommentVer();
let className = ['nicoChat', type, size];
if (ver === 'html5') {
className.push(ver);
}
if (chat.getColor() === '#000000') {
className.push('black');
}
if (chat.isDoubleResized()) {
className.push('is-doubleResized');
} else if (chat.isLineResized()) {
className.push('is-lineResized');
}
if (chat.isOverflow()) {
className.push('overflow');
}
if (chat.isMine()) {
className.push('mine');
}
if (chat.isUpdating()) {
className.push('updating');
}
let fork = chat.getFork();
className.push(`fork${fork}`);
// if (chat.isSubThread()) {
// className.push('subThread');
// }
if (chat.isPostFail()) {
className.push('fail');
}
const fontCommand = chat.getFontCommand();
if (fontCommand) {
className.push(`cmd-${fontCommand}`);
}
span.className = className.join(' ');
span.id = chat.getId();
span.dataset.meta = chat.toString();
if (cssText && cssText.inline) {
span.style.cssText = cssText.inline;
}
if (!chat.isInvisible()) {
span.innerHTML = chat.getHtmlText();
}
return span;
}
static buildStyleElement (cssText) {
let elm = document.createElement('style');
elm.type = 'text/css';
elm.appendChild(document.createTextNode(cssText));
return elm;
}
static buildChatHtml (chat, type, cssText) {
const result = NicoChatCss3View.buildChatDom(chat, type, chat.getSize(), cssText);
result.removeAttribute('data-meta');
return result.outerHTML;
}
static buildChatCss (chat, type, currentTime = 0, playbackRate = 1) {
return type === NicoChat.TYPE.NAKA ?
NicoChatCss3View._buildNakaCss(chat, type, currentTime, playbackRate) :
NicoChatCss3View._buildFixedCss(chat, type, currentTime, playbackRate);
}
static _buildNakaCss (chat, type, currentTime, playbackRate) {
let scaleCss;
let id = chat.getId();
let commentVer = chat.getCommentVer();
let duration = chat.getDuration() / playbackRate;
let scale = chat.getCssScale();
let scaleY = chat.getCssScaleY();
let beginL = chat.getBeginLeftTiming();
let screenWidth = NicoCommentViewModel.SCREEN.WIDTH;
// let screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
// let width = chat.getWidth();
let height = chat.getHeight();
let ypos = chat.getYpos();
let isSub = chat.isSubThread();
let color = chat.getColor();
//color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
let colorCss = color ? `color: ${color};` : '';
let fontSizePx = chat.getFontSizePixel();
let lineHeightCss = '';
if (commentVer !== 'html5') {
lineHeightCss = `line-height: ${Math.floor(chat.getLineHeight())}px;`;
}
let speed = chat.getSpeed();
let delay = (beginL - currentTime) / playbackRate;
let slot = chat.getSlot();
let zIndex =
(slot >= 0) ?
(slot * 1000 + chat.getFork() * 1000000 + 1) :
(1000 + beginL * 1000 + chat.getFork() * 1000000);
zIndex = isSub ? zIndex: zIndex * 2;
// let time3d = '0';//`${delay * 10}px`; //${chat.time3dp * 100}px`;
let opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';
// 4:3ベースに計算されたタイミングを16:9に補正する
// scale無指定だとChromeでフォントがぼけるので1.0の時も指定だけする
// TODO: 環境によって重くなるようだったらオプションにする
scaleCss =
(scale === 1.0) ? 'scale3d(1, 1, 1)' : `scale3d(${scale}, ${scaleY}, 1)`;
const outerScreenWidth = NicoCommentViewModel.SCREEN.OUTER_WIDTH_FULL;
const screenDiff = outerScreenWidth - screenWidth;
const leftPos = screenWidth + screenDiff / 2;
const durationDiff = screenDiff / speed / playbackRate;
duration += durationDiff;
delay -= (durationDiff * 0.5);
// 逆再生
const reverse = chat.isReverse() ? 'animation-direction: reverse;' : '';
let isAlignMiddle = false;
if ((commentVer === 'html5' && (height >= screenHeight - fontSizePx / 2 || chat.isOverflow())) ||
(commentVer !== 'html5' && height >= screenHeight - fontSizePx / 2 && height < screenHeight + fontSizePx)
) {
isAlignMiddle = true;
}
let top = isAlignMiddle ? '50%' : `${ypos}px`;
let transY = isAlignMiddle ? 'translateY(-50%)' : '';
let inline = `
z-index: ${zIndex};
top: ${top};
left: ${leftPos}px;
${colorCss}
${lineHeightCss}
${opacity}
font-size: ${fontSizePx}px;
animation-name: idou-${id};
animation-duration: ${duration}s;
animation-delay: ${delay}s;
${reverse}
`;
let keyframes = `
@keyframes idou-${id} {
0% {
visibility: visible;
transform:
translate3d(0, 0, 0) ${scaleCss} ${transY};
}
100% {
visibility: hidden;
transform:
translate3d(-${outerScreenWidth + chat.getWidth()*scale}px, 0, 0)
${scaleCss}
${transY};
}
}
/*#${id} {
z-index: ${zIndex};
top: ${top};
left: ${leftPos}px;
${colorCss}
${lineHeightCss}
${opacity}
transform: ${scaleCss};
font-size: ${fontSizePx}px;
animation-name: idou-${id};
animation-duration: ${duration}s;
animation-delay: ${delay}s;
${reverse}
}*/
`.trim();
return {inline, keyframes};
}
static _buildFixedCss (chat, type, currentTime, playbackRate) {
let scaleCss;
let commentVer = chat.getCommentVer();
let duration = chat.getDuration() / playbackRate;
let scale = chat.getCssScale();// * (chat.isLineResized() ? 0.5 : 1);
let scaleY = chat.getCssScaleY();
let beginL = chat.getBeginLeftTiming();
let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
let height = chat.getHeight();
let ypos = chat.getYpos();
let isSub = chat.isSubThread();
let color = chat.getColor();
// color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
let colorCss = color ? `color: ${color};` : '';
let fontSizePx = chat.getFontSizePixel();
let lineHeightCss = '';
if (commentVer !== 'html5') {
lineHeightCss = `line-height: ${Math.floor(chat.getLineHeight())}px;`;
}
let delay = (beginL - currentTime) / playbackRate;
let slot = chat.getSlot();
let zIndex =
(slot >= 0) ?
(slot * 1000 + chat.getFork() * 1000000 + 1) :
(1000 + beginL * 1000 + chat.getFork() * 1000000);
zIndex = isSub ? zIndex: zIndex * 2;
let time3d = '0';//`${delay * 10}px`; //${chat.time3dp * 100}px`;
let opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';
let top;
let transY;
// 画面高さに近い・超える時は上端または下端にぴったりつける
if ((commentVer === 'html5' && height >= screenHeight - fontSizePx / 2 /*|| chat.isOverflow()*/) ||
(commentVer !== 'html5' && height >= screenHeight * 0.7)) {
top = `${type === NicoChat.TYPE.BOTTOM ? 100 : 0}%`;
transY = `${type === NicoChat.TYPE.BOTTOM ? -100 : 0}%`;
} else {
top = ypos + 'px';
transY = '0';
}
scaleCss =
scale === 1.0 ?
`transform: scale3d(1, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});` :
`transform: scale3d(${scale}, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});`;
let inline = `
z-index: ${zIndex};
top: ${top};
left: 50%;
${colorCss}
${lineHeightCss}
${opacity}
font-size: ${fontSizePx}px;
${scaleCss}
animation-duration: ${duration / 0.95}s;
animation-delay: ${delay}s;
--dokaben-scale: ${scale};
`.trim();
return {inline};
}
}
class NicoChatFilter extends Emitter {
constructor(params) {
super();
this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;
this._wordFilterList = [];
this._userIdFilterList = [];
this._commandFilterList = [];
this.setWordFilterList(params.wordFilter || '');
this.setUserIdFilterList(params.userIdFilter || '');
this.setCommandFilterList(params.commandFilter || '');
this._enable = typeof params.enableFilter === 'boolean' ? params.enableFilter : true;
this._wordReg = null;
this._wordRegReg = null;
this._userIdReg = null;
this._commandReg = null;
this._onChange = _.debounce(this._onChange.bind(this), 50);
if (params.wordRegFilter) {
this.setWordRegFilter(params.wordRegFilter, params.wordRegFilterFlags);
}
}
}
_.assign(NicoChatFilter.prototype, {
setEnable: function (v) {
v = !!v;
if (this._enable !== v) {
this._enable = v;
this._onChange();
}
},
isEnable: function () {
return this._enable;
},
addWordFilter: function (text) {
let before = this._wordFilterList.join('\n');
this._wordFilterList.push((text || '').trim());
this._wordFilterList = _.uniq(this._wordFilterList);
let after = this._wordFilterList.join('\n');
if (before !== after) {
this._wordReg = null;
this._onChange();
}
},
setWordFilterList: function (list) {
list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);
let before = this._wordFilterList.join('\n');
let tmp = [];
list.forEach(text => {
if (!text) { return; }
tmp.push(text.trim());
});
tmp = _.compact(tmp);
let after = tmp.join('\n');
if (before !== after) {
this._wordReg = null;
this._wordFilterList = tmp;
this._onChange();
}
},
getWordFilterList: function () {
return this._wordFilterList;
},
setWordRegFilter: function (source, flags) {
if (this._wordRegReg) {
if (this._wordRegReg.source === source && this._flags === flags) {
return;
}
}
try {
this._wordRegReg = new RegExp(source, flags);
} catch (e) {
window.console.error(e);
return;
}
this._onChange();
},
addUserIdFilter: function (text) {
let before = this._userIdFilterList.join('\n');
this._userIdFilterList.push(text);
this._userIdFilterList = _.uniq(this._userIdFilterList);
let after = this._userIdFilterList.join('\n');
if (before !== after) {
this._userIdReg = null;
this._onChange();
}
},
setUserIdFilterList: function (list) {
list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);
let before = this._userIdFilterList.join('\n');
let tmp = [];
list.forEach(text => {
if (!text) { return; }
tmp.push(text.trim());
});
tmp = _.compact(tmp);
let after = tmp.join('\n');
if (before !== after) {
this._userIdReg = null;
this._userIdFilterList = tmp;
this._onChange();
}
},
getUserIdFilterList: function () {
return this._userIdFilterList;
},
addCommandFilter: function (text) {
let before = this._commandFilterList.join('\n');
this._commandFilterList.push(text);
this._commandFilterList = _.uniq(this._commandFilterList);
let after = this._commandFilterList.join('\n');
if (before !== after) {
this._commandReg = null;
this._onChange();
}
},
setCommandFilterList: function (list) {
list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);
let before = this._commandFilterList.join('\n');
let tmp = [];
list.forEach(text => {
if (!text) { return; }
tmp.push(text.trim());
});
tmp = _.compact(tmp);
let after = tmp.join('\n');
if (before !== after) {
this._commandReg = null;
this._commandFilterList = tmp;
this._onChange();
}
},
getCommandFilterList: function () {
return this._commandFilterList;
},
setSharedNgLevel: function (level) {
if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
this._sharedNgLevel = level;
this._onChange();
}
},
getSharedNgLevel: function () {
return this._sharedNgLevel;
},
getFilterFunc: function () {
if (!this._enable) {
return () => true;
}
let threthold = SHARED_NG_SCORE[this._sharedNgLevel];
// let isPremium = util.isPremium();
// NG設定の数×コメント数だけループを回すのはアホらしいので、
// 連結した一個の正規表現を生成する
if (!this._wordReg) {
this._wordReg = this._buildFilterReg(this._wordFilterList);
}
if (!this._userIdReg) {
this._userIdReg = this._buildFilterPerfectMatchinghReg(this._userIdFilterList);
}
if (!this._commandReg) {
this._commandReg = this._buildFilterReg(this._commandFilterList);
}
let wordReg = this._wordReg;
let wordRegReg = this._wordRegReg;
let userIdReg = this._userIdReg;
let commandReg = this._commandReg;
// let anonymousFilter =
if (Config.getValue('debug')) {
return nicoChat => {
if (nicoChat.getFork() > 0) {
return true;
}
let score = nicoChat.getScore();
if (score <= threthold) {
window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
score,
threthold,
nicoChat.getType(),
nicoChat.getVpos() / 100,
nicoChat.getText()
);
return false;
}
if (wordReg && wordReg.test(nicoChat.getText())) {
window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
RegExp.$1,
nicoChat.getType(),
nicoChat.getVpos() / 100,
nicoChat.getText()
);
return false;
}
if (wordRegReg && wordRegReg.test(nicoChat.getText())) {
window.console.log(
'%cNGワード(正規表現): "%s" %s %s秒 %s',
'background: yellow;',
RegExp.$1,
nicoChat.getType(),
nicoChat.getVpos() / 100,
nicoChat.getText()
);
return false;
}
if (userIdReg && userIdReg.test(nicoChat.getUserId())) {
window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
RegExp.$1,
nicoChat.getType(),
nicoChat.getVpos() / 100,
nicoChat.getUserId(),
nicoChat.getText()
);
return false;
}
if (commandReg && commandReg.test(nicoChat.getCmd())) {
window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
RegExp.$1,
nicoChat.getType(),
nicoChat.getVpos() / 100,
nicoChat.getCmd(),
nicoChat.getText()
);
return false;
}
return true;
};
}
return nicoChat => {
if (nicoChat.getFork() > 0) {
return true;
}
if (nicoChat.getScore() <= threthold) {
return false;
}
if (wordReg && wordReg.test(nicoChat.getText())) {
return false;
}
if (wordRegReg && wordRegReg.test(nicoChat.getText())) {
return false;
}
if (userIdReg && userIdReg.test(nicoChat.getUserId())) {
return false;
}
if (commandReg && commandReg.test(nicoChat.getCmd())) {
return false;
}
return true;
};
},
applyFilter: function (nicoChatArray) {
let before = nicoChatArray.length;
if (before < 1) {
return nicoChatArray;
}
let timeKey = 'applyNgFilter: ' + nicoChatArray[0].getType();
window.console.time(timeKey);
let filterFunc = this.getFilterFunc();
let result = nicoChatArray.filter(filterFunc);
window.console.timeEnd(timeKey);
window.console.log('NG判定結果: %s/%s', result.length, before);
return result;
},
isSafe: function (nicoChat) {
return (this.getFilterFunc())(nicoChat);
},
_buildFilterReg: function (filterList) {
if (filterList.length < 1) {
return null;
}
const escapeRegs = util.escapeRegs;
let r = filterList.filter(f => f).map(f => escapeRegs(f));
return new RegExp('(' + r.join('|') + ')', 'i');
},
_buildFilterPerfectMatchinghReg: function (filterList) {
if (filterList.length < 1) {
return null;
}
const escapeRegs = util.escapeRegs;
let r = filterList.filter(f => f).map(f => escapeRegs(f));
return new RegExp('^(' + r.join('|') + ')$');
},
_onChange: function () {
console.log('NicoChatFilter.onChange');
this.emit('change');
}
});
Object.assign(ZenzaWatch.debug, {
NicoChat,
NicoChatViewModel
});

let CommentLayoutWorker = (config => {
let func = function (self) {
// 暫定設置
let TYPE = {
TOP: 'ue',
NAKA: 'naka',
BOTTOM: 'shita'
};
let SCREEN = {
WIDTH_INNER: 512,
WIDTH_FULL_INNER: 640,
WIDTH: 512 + 32,
WIDTH_FULL: 640 + 32,
HEIGHT: 384
};
let isConflict = function (target, others) {
// 一度はみ出した文字は当たり判定を持たない
if (target.isOverflow || others.isOverflow || others.isInvisible) {
return false;
}
if (target.layerId !== others.layerId) {
return false;
}
// Y座標が合わないなら絶対衝突しない
let othersY = others.ypos;
let targetY = target.ypos;
if (othersY + others.height < targetY ||
othersY > targetY + target.height) {
return false;
}
// ターゲットと自分、どっちが右でどっちが左か？の判定
let rt, lt;
if (target.beginLeft <= others.beginLeft) {
lt = target;
rt = others;
} else {
lt = others;
rt = target;
}
if (target.isFixed) {
// 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
// > か >= で挙動が変わるCAがあったりして正解がわからない
if (lt.endRight > rt.beginLeft) {
return true;
}
} else {
// 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
if (lt.beginRight >= rt.beginLeft) {
return true;
}
// 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
if (lt.endRight >= rt.endLeft) {
return true;
}
}
return false;
};
let moveToNextLine = function (target, others) {
let margin = 1;
let othersHeight = others.height + margin;
// 本来はちょっとでもオーバーしたらランダムすべきだが、
// 本家とまったく同じサイズ計算は難しいのでマージンを入れる
// コメントアートの再現という点では有効な妥協案
let overflowMargin = 10;
let rnd = Math.max(0, SCREEN.HEIGHT - target.height);
let yMax = SCREEN.HEIGHT - target.height + overflowMargin;
let yMin = 0 - overflowMargin;
let type = target.type;
let ypos = target.ypos;
if (type !== TYPE.BOTTOM) {
ypos += othersHeight;
// 画面内に入りきらなかったらランダム配置
if (ypos > yMax) {
target.isOverflow = true;
}
} else {
ypos -= othersHeight;
// 画面内に入りきらなかったらランダム配置
if (ypos < yMin) {
target.isOverflow = true;
}
}
target.ypos = target.isOverflow ? Math.floor(Math.random() * rnd) : ypos;
return target;
};
/**
* 最初に衝突が起こりうるindexを返す。
* 処理効率化のための物
*/
let findCollisionStartIndex = function (target, members) {
let o;
let tl = target.beginLeft;
let tr = target.endRight;
let fork = target.fork;
for (let i = 0, len = members.length; i < len; i++) {
o = members[i];
let ol = o.beginLeft;
let or = o.endRight;
// 自分よりうしろのメンバーには影響を受けないので処理不要
if (o.id === target.id) {
return -1;
}
if (fork !== o.fork || o.invisible || o.isOverflow) {
continue;
}
if (tl <= or && tr >= ol) {
return i;
}
}
return -1;
};
let _checkCollision = function (target, members, collisionStartIndex) {
let o;
const beginLeft = target.beginLeft;
for (let i = collisionStartIndex, len = members.length; i < len; i++) {
o = members[i];
// 自分よりうしろのメンバーには影響を受けないので処理不要
if (o.id === target.id) {
return target;
}
if (beginLeft > o.endRight) {
continue;
}
if (isConflict(target, o)) {
target = moveToNextLine(target, o);
// ずらした後は再度全チェックするのを忘れずに(再帰)
if (!target.isOverflow) {
return _checkCollision(target, members, collisionStartIndex);
}
}
}
return target;
};
let checkCollision = function (target, members) {
if (target.isInvisible) {
return target;
}
let collisionStartIndex = findCollisionStartIndex(target, members);
if (collisionStartIndex < 0) {
return target;
}
return _checkCollision(target, members, collisionStartIndex);
};
let groupCollision = function (members) {
for (let i = 0, len = members.length; i < len; i++) {
members[i] = checkCollision(members[i], members);
}
return members;
};
self.onmessage = function (e) {
const data = {};
//console.log('CommentLayoutWorker.onmessage', e.data.type, e.data.members);
console.time('CommentLayoutWorker: ' + e.data.type);
data.result = groupCollision(e.data.members);
console.timeEnd('CommentLayoutWorker: ' + e.data.type);
data.lastUpdate = e.data.lastUpdate;
data.type = e.data.type;
data.requestId = e.data.requestId;
self.postMessage(data);
//self.close();
};
};
let instance = null;
return {
_func: func,
create: function () {
// if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
// return null;
// }
return util.createWebWorker(func);
},
getInstance: function () {
// if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
// return null;
// }
if (!instance) {
instance = util.createWebWorker(func);
}
return instance;
}
};
})(Config);
util.createWebWorker = (func, type = '') => {
let src = func.toString().replace(/^function.*?{/, '').replace(/}$/, '');
let blob = new Blob([src], {type: 'text/javascript'});
let url = URL.createObjectURL(blob);
if (type === 'SharedWorker') {
return new SharedWorker(url);
}
return new Worker(url);
};
util.isWebWorkerAvailable = () => {
return !!(window.Blob && window.Worker && window.URL);
};

var SlotLayoutWorker = (function () {
var func = function (self) {
// 暫定設置
var SLOT_COUNT = 40;
/**
* スロット≒Z座標をよしなに割り当てる。
* デザパタ的にいうならFlyweightパターンの亜種。
* ゲームプログラミングではよくあるやつ。
*/
var SlotEntry = function () {
this.initialize.apply(this, arguments);
};
SlotEntry.prototype = {
initialize: function (slotCount) {
this._slotCount = slotCount || SLOT_COUNT;
this._slot = [];
this._itemTable = {};
this._p = 1;
},
_findIdle: function (sec) {
var count = this._slotCount, slot = this._slot, table = this._itemTable;
for (var i = 0; i < count; i++) {
if (!slot[i]) {
//console.log('empty found! idx=%s, sec=%s slot=%s', i, sec, JSON.stringify(slot));
slot[i] = this._p++;
return i;
}
var item = table[i];
if (sec < item.begin || sec > item.end) {
//console.log('idle found! idx=%s, sec=%s ', i, sec, JSON.stringify(slot), JSON.stringify(item));
slot[i] = this._p++;
return i;
}
}
return -1;
},
_findOldest: function () {
var idx = 0, slot = this._slot, min = slot[0];
for (var i = 1, len = this._slot.length; i < len; i++) {
if (slot[i] < min) {
min = slot[i];
idx = i;
}
}
return idx;
},
find: function (item, sec) {
// まずは空いてるスロットを小さい順に探す
var slot = this._findIdle(sec);
// なかったら、一番古いやつから奪い取る
if (slot < 0) {
slot = this._findOldest();
}
this._itemTable[slot] = item;
return slot;
}
};
var sortByBeginTime = function (data) {
data = data.concat().sort(function (a, b) {
var av = a.begin, bv = b.begin;
if (av !== bv) {
return av - bv;
} else {
return a.no < b.no ? -1 : 1;
}
});
return data;
};
var execute = function (e) {
var data = [];
data = data.concat(e.data.top);
data = data.concat(e.data.naka);
data = data.concat(e.data.bottom);
data = sortByBeginTime(data);
var slotEntries = [new SlotEntry(), new SlotEntry(), new SlotEntry()];
for (var i = 0, len = data.length; i < len; i++) {
var o = data[i];
if (o.invisible) {
continue;
}
var sec = o.begin;
var fork = o.fork % 3;
o.slot = slotEntries[fork].find(o, sec);
}
return data;
};
self.onmessage = function (e) {
//console.log('SlotLayout', e.data);
console.time('SlotLayoutWorker');
var result = execute(e);
console.timeEnd('SlotLayoutWorker');
result.lastUpdate = e.data.lastUpdate;
//console.log('SlotLayoutResult', result);
self.postMessage(e.data);
};
};
return {
_func: func,
create: function () {
if (!ZenzaWatch.util.isWebWorkerAvailable()) {
return null;
}
return ZenzaWatch.util.createWebWorker(func);
}
};
})();

class NicoScriptParser {
static get parseId() {
if (!NicoScriptParser._count) {
NicoScriptParser._count = 1;
}
return NicoScriptParser._count++;
}
static parseNiwango(lines) {
// 構文はいったん無視して、対応できる命令だけ拾っていく。
// ニワン語のフル実装は夢
let type, params;
let result = [];
for (let i = 0, len = lines.length; i < len; i++) {
let text = lines[i];
const id = NicoScriptParser.parseId;
if (text.match(/^\/?replace\((.*?)\)/)) {
type = 'REPLACE';
params = NicoScriptParser.parseReplace(RegExp.$1);
result.push({id, type, params});
} else if (text.match(/^\/?commentColor\s*=\s*0x([0-9a-f]{6})/i)) {
result.push({id, type: 'COLOR', params: {color: '#' + RegExp.$1}});
} else if (text.match(/^\/?seek\((.*?)\)/i)) {
params = NicoScriptParser.parseSeek(RegExp.$1);
result.push({id, type: 'SEEK', params});
}
}
return result;
}
static parseParams(str) {
// 雑なパース
let result = {}, v = '', lastC = '', key, isStr = false, quot = '';
for (let i = 0, len = str.length; i < len; i++) {
let c = str.charAt(i);
switch (c) {
case ':':
key = v.trim();
v = '';
break;
case ',':
if (isStr) {
v += c;
}
else {
if (key !== '' && v !== '') {
result[key] = v.trim();
}
key = v = '';
}
break;
case ' ':
if (v !== '') {
v += c;
}
break;
case '\'':
case '"':
if (v !== '') {
if (quot !== c) {
v += c;
} else if (isStr) {
if (lastC === '\\') {
v += c;
}
else {
if (quot === '"') {
// ダブルクォートの時だけエスケープがあるらしい
v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
}
result[key] = v;
key = v = '';
isStr = false;
}
} else {
window.console.error('parse fail?', isStr, lastC, str);
return null;
}
} else {
quot = c;
isStr = true;
}
break;
default:
v += c;
}
lastC = c;
}
if (key !== '' && v !== '') {
result[key] = v.trim();
}
return result;
}
static parseNicosParams(str) {
// 雑なパース
let result = [], v = '', lastC = '', quot = '';
for (let i = 0, len = str.length; i < len; i++) {
let c = str.charAt(i);
switch (c) {
case ' ':
case '　':
if (quot) {
v += c;
} else {
if (v !== '') {
result.push(v);
v = quot = '';
}
}
break;
case '\'':
case '"':
if (v !== '') {
if (quot !== c) {
v += c;
} else {
if (lastC === '\\') {
v += c;
}
else {
v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
result.push(v);
v = quot = '';
}
}
} else {
quot = c;
}
break;
case '「':
if (v !== '') {
v += c;
} else {
quot = c;
}
break;
case '」':
if (v !== '') {
if (quot !== '「') {
v += c;
} else {
if (lastC === '\\') {
v += c;
}
else {
result.push(v);
v = quot = '';
}
}
} else {
v += c;
}
break;
default:
v += c;
}
lastC = c;
}
if (v !== '') {
result.push(v.trim());
}
return result;
}
static parseNicos(text) {
text = text.trim();
let text1 = (text || '').split(/[ 　:：]+/)[0]; // eslint-disable-line
let params;
let type;
switch (text1) {
case '@デフォルト':
case '＠デフォルト':
type = 'DEFAULT';
break;
case '@逆':
case '＠逆':
type = 'REVERSE';
params = NicoScriptParser.parse逆(text);
break;
case '@ジャンプ':
case '＠ジャンプ':
params = NicoScriptParser.parseジャンプ(text);
type = params.type;
break;
case '@ジャンプマーカー':
case '＠ジャンプマーカー':
type = 'MARKER'; //@ジャンプマーカー：ループ
params = NicoScriptParser.parseジャンプマーカー(text);
break;
default:
if (text.indexOf('@置換') === 0 || text.indexOf('＠置換') === 0) {
type = 'REPLACE';
params = NicoScriptParser.parse置換(text);
} else {
type = 'PIPE';
let lines = NicoScriptParser.splitLines(text);
params = NicoScriptParser.parseNiwango(lines);
}
}
const id = NicoScriptParser.parseId;
return {id, type, params};
}
static splitLines(str) {
let result = [], v = '', lastC = '', isStr = false, quot = '';
for (let i = 0, len = str.length; i < len; i++) {
let c = str.charAt(i);
switch (c) {
case ';':
if (isStr) {
v += c;
}
else {
result.push(v.trim());
v = '';
}
break;
case ' ':
if (v !== '') {
v += c;
}
break;
case '\'':
case '"':
if (isStr) {
if (quot === c) {
if (lastC !== '\\') {
isStr = false;
}
}
v += c;
} else {
quot = c;
isStr = true;
v += c;
}
break;
default:
v += c;
}
lastC = c;
}
if (v !== '') {
result.push(v.trim());
}
return result;
}
static parseReplace(str) {
let result = NicoScriptParser.parseParams(str);
if (!result) {
return null;
}
return {
src: result.src,
dest: result.dest || '',
fill: result.fill === 'true' ? true : false,
target: result.target || 'user',
partial: result.partial === 'false' ? false : true
};
}
static parseSeek(str) {
let result = NicoScriptParser.parseParams(str);
if (!result) {
return null;
}
return {
time: result.vpos
};
}
static parse置換(str) {
let tmp = NicoScriptParser.parseNicosParams(str);
//＠置換 キーワード 置換後 置換範囲 投コメ 一致条件
//＠置換 "И" "██" 単 投コメ
// 投稿者コメントを含めるかどうか
let target = 'user'; // '投コメ'
if (tmp[4] === '含む' || tmp[4] === '全') { // マニュアルにはないが '全' もあるらしい
target = 'owner user';
} else if (tmp[4] === '投コメ') {
target = 'owner';
}
return {
src: tmp[1],
dest: tmp[2] || '',
fill: tmp[3] === '全' ? true : false, //全体を置き換えるかどうか
target, //(tmp[4] === '含む' || tmp[4] === '投コメ') ? 'owner user' : 'user',
partial: tmp[5] === '完全一致' ? false : true // 完全一致のみを見るかどうか
};
}
static parse逆(str) {
let tmp = NicoScriptParser.parseNicosParams(str);
/* eslint-disable */
//＠逆　投コメ
/* eslint-enable */
let target = (tmp[1] || '').trim();
//＠置換キーワード置換後置換範囲投コメ一致条件
return {
target: (target === 'コメ' || target === '投コメ') ? target : '全',
};
}
static parseジャンプ(str) {
//＠ジャンプ ジャンプ先 メッセージ 再生開始位置 戻り秒数 戻りメッセージ
let tmp = NicoScriptParser.parseNicosParams(str);
let target = tmp[1] || '';
let type = 'JUMP';
let time = 0;
if (/^#(\d+):(\d+)$/.test(target)) {
type = 'SEEK';
time = RegExp.$1 * 60 + RegExp.$2 * 1;
} else if (/^#(\d+):(\d+\.\d+)$/.test(target)) {
type = 'SEEK';
time = RegExp.$1 * 60 + RegExp.$2 * 1;
} else if (/^(#|＃)(.+)/.test(target)) {
type = 'SEEK_MARKER';
time = RegExp.$2;
}
return {target, type, time};
}
static parseジャンプマーカー(str) {
let tmp = NicoScriptParser.parseNicosParams(str);
let name = tmp[0].split(/[:： 　]/)[1]; // eslint-disable-line
return {name};
}
}
class NicoScripter extends Emitter {
constructor() {
super();
this.reset();
}
reset() {
this._hasSort = false;
this._list = [];
this._eventScript = [];
this._nextVideo = null;
this._marker = {};
this._inviewEvents = {};
this._currentTime = 0;
this._eventId = 0;
}
add(nicoChat) {
this._hasSort = false;
this._list.push(nicoChat);
}
get isExist() {
return this._list.length > 0;
}
getNextVideo() {
return this._nextVideo || '';
}
getEventScript() {
return this._eventScript || [];
}
get currentTime() {
return this._currentTime;
}
set currentTime(v) {
this._currentTime = v;
if (this._eventScript.length > 0) {
this._updateInviewEvents();
}
}
_sort() {
if (this._hasSort) {
return;
}
const list = this._list.concat().sort((a, b) => {
const av = a.getVpos(), bv = b.getVpos();
if (av !== bv) {
return av - bv;
} else {
return a.getNo() < b.getNo() ? -1 : 1;
}
});
this._list = list;
this._hasSort = true;
}
_updateInviewEvents() {
const ct = this._currentTime;
this._eventScript.forEach(({p, nicos}) => {
const beginTime = nicos.getVpos() / 100;
const endTime = beginTime + nicos.getDuration();
if (beginTime > ct || endTime < ct) {
delete this._inviewEvents[p.id];
return;
}
if (this._inviewEvents[p.id]) {
return;
}
this._inviewEvents[p.id] = true;
let diff = nicos.getVpos() / 100 - ct;
diff = Math.min(1, Math.abs(diff)) * (diff / Math.abs(diff));
switch (p.type) {
case 'SEEK':
this.emit('command', 'nicosSeek', Math.max(0, p.params.time * 1 + diff));
break;
case 'SEEK_MARKER': {
let time = this._marker[p.params.time] || 0;
this.emit('command', 'nicosSeek', Math.max(0, time + diff));
break;
}
}
});
}
apply(group) {
this._sort();
const assigned = {};
// どうせ全動画の1%も使われていないので
// 最適化もへったくれもない
const eventFunc = {
'JUMP': (p, nicos) => {
console.log('@ジャンプ: ', p, nicos);
const target = p.params.target;
if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
this._nextVideo = target;
}
},
'SEEK': (p, nicos) => {
if (assigned[p.id]) {
return;
}
assigned[p.id] = true;
this._eventScript.push({p, nicos});
},
'SEEK_MARKER': (p, nicos) => {
if (assigned[p.id]) {
return;
}
assigned[p.id] = true;
console.log('SEEK_MARKER: ', p, nicos);
this._eventScript.push({p, nicos});
},
'MARKER': (p, nicos) => {
console.log('@ジャンプマーカー: ', p, nicos);
this._marker[p.params.name] = nicos.getVpos() / 100;
}
};
const applyFunc = {
'DEFAULT': function (nicoChat, nicos) {
let nicosColor = nicos.getColor();
let hasColor = nicoChat.hasColorCommand();
if (nicosColor && !hasColor) {
nicoChat.setColor(nicosColor);
}
let nicosSize = nicos.getSize();
let hasSize = nicoChat.hasSizeCommand();
if (nicosSize && !hasSize) {
nicoChat.setSize(nicosSize);
}
let nicosType = nicos.getType();
let hasType = nicoChat.hasTypeCommand();
if (nicosType && !hasType) {
nicoChat.setType(nicosType);
}
},
'COLOR': function (nicoChat, nicos, params) {
let hasColor = nicoChat.hasColorCommand();
if (!hasColor) {
nicoChat.setColor(params.color);
}
},
'REVERSE': function (nicoChat, nicos, params) {
if (params.target === '全') {
nicoChat.setIsReverse(true);
} else if (params.target === '投コメ') {
if (nicoChat.getFork() > 0) {
nicoChat.setIsReverse(true);
}
} else if (params.target === 'コメ') {
if (nicoChat.getFork() === 0) {
nicoChat.setIsReverse(true);
}
}
},
'REPLACE': function (nicoChat, nicos, params) {
if (!params) {
return;
}
// if (nicoChat.isNicoScript()) { return; }
if (nicoChat.getFork() > 0 && (params.target || '').indexOf('owner') < 0) {
return;
}
if (nicoChat.getFork() < 1 && params.target === 'owner') {
return;
}
let isMatch = false;
let text = nicoChat.getText();
if (params.partial === true) {
isMatch = text.indexOf(params.src) >= 0;
} else {
isMatch = text === params.src;
}
if (!isMatch) {
return;
}
if (params.fill === true) {
text = params.dest;
} else {// ＠置換 "~" "\n" 単 全
let reg = new RegExp(util.escapeRegs(params.src), 'g');
text = text.replace(reg, params.dest);
}
nicoChat.setText(text);
let nicosColor = nicos.getColor();
let hasColor = nicoChat.hasColorCommand();
if (nicosColor && !hasColor) {
nicoChat.setColor(nicosColor);
}
let nicosSize = nicos.getSize();
let hasSize = nicoChat.hasSizeCommand();
if (nicosSize && !hasSize) {
nicoChat.setSize(nicosSize);
}
let nicosType = nicos.getType();
let hasType = nicoChat.hasTypeCommand();
if (nicosType && !hasType) {
nicoChat.setType(nicosType);
}
},
'PIPE': function (nicoChat, nicos, lines) {
lines.forEach(line => {
let type = line.type;
let f = applyFunc[type];
if (f) {
f(nicoChat, nicos, line.params);
}
});
}
};
this._list.forEach(nicos => {
let p = NicoScriptParser.parseNicos(nicos.getText());
if (!p) {
return;
}
if (!nicos.hasDurationSet()) {
nicos.setDuration(99999);
}
let ev = eventFunc[p.type];
if (ev) {
return ev(p, nicos);
}
else if (p.type === 'PIPE') {
p.params.forEach(line => {
let type = line.type;
let ev = eventFunc[type];
if (ev) {
return ev(line, nicos);
}
});
}
let func = applyFunc[p.type];
if (!func) {
return;
}
let beginTime = nicos.getBeginTime();
let endTime = beginTime + nicos.getDuration();
(group.getMembers ? group.getMembers : group).forEach(nicoChat => {
if (nicoChat.isNicoScript()) {
return;
}
let ct = nicoChat.getBeginTime();
if (beginTime > ct || endTime < ct) {
return;
}
func(nicoChat, nicos, p.params);
});
});
}
}

class CommentListModel extends Emitter {
constructor(params) {
super();
this._isUniq = params.uniq;
this._items = [];
this._positions = [];
this._maxItems = params.maxItems || 100;
this._currentSortKey = 'vpos';
this._isDesc = false;
this._currentTime = 0;
}
setItem(itemList) {
this._items = Array.isArray(itemList) ? itemList : [itemList];
}
clear() {
this._items = [];
this._positions = [];
this._currentTime = 0;
this.emit('update', [], true);
}
setChatList(chatList) {
chatList = chatList.top.concat(chatList.naka, chatList.bottom);
let items = [];
let positions = [];
for (let i = 0, len = chatList.length; i < len; i++) {
items.push(new CommentListItem(chatList[i]));
positions.push(parseFloat(chatList[i].getVpos(), 10) / 100);
}
this._items = items;
this._positions = positions.sort((a, b) => a - b);
this._currentTime = 0;
this.sort();
this.emit('update', this._items, true);
}
removeItemByIndex(index) {
let target = this._getItemByIndex(index);
if (!target) {
return;
}
this._items = _.reject(this._items, item => item === target);
}
getLength() {
return this._items.length;
}
_getItemByIndex(index) {
let item = this._items[index];
return item;
}
indexOf(item) {
return (this._items || []).indexOf(item);
}
getItemByIndex(index) {
let item = this._getItemByIndex(index);
if (!item) {
return null;
}
return item;
}
findByItemId(itemId) {
itemId = parseInt(itemId, 10);
return this._items.find(item => item.getItemId() === itemId);
}
removeItem(item) {
let beforeLen = this._items.length;
_.pull(this._items, item);
let afterLen = this._items.length;
if (beforeLen !== afterLen) {
this.emit('update', this._items);
}
}
_onItemUpdate(item, key, value) {
this.emit('itemUpdate', item, key, value);
}
sortBy(key, isDesc) {
let table = {
vpos: 'getVpos',
date: 'getDate',
text: 'getText',
user: 'getUserId',
};
let func = table[key];
if (!func) {
return;
}
this._items = _.sortBy(this._items, item => item[func]());
if (isDesc) {
this._items.reverse();
}
this._currentSortKey = key;
this._isDesc = isDesc;
this.onUpdate();
}
sort() {
this.sortBy(this._currentSortKey, this._isDesc);
}
getCurrentSortKey() {
return this._currentSortKey;
}
onUpdate() {
this.emitAsync('update', this._items);
}
getInViewIndex(sec) {
return Math.max(0, util.sortedLastIndex(this._positions, sec + 1) - 1);
}
setCurrentTime(sec) {
if (this._currentTime !== sec && typeof sec === 'number') {
this._currentTime = sec;
if (this._currentSortKey === 'vpos') {
this.emit('currentTimeUpdate', sec, this.getInViewIndex(sec));
}
}
}
}
/**
* DOM的に隔離したiframeの中に生成する。
* かなり実験要素が多いのでまだまだ変わる。
*/
class CommentListView extends Emitter {
constructor(params) {
super();
this._ItemView = CommentListItemView;
this._itemCss = CommentListItemView.CSS;
this._className = params.className || 'commentList';
this._retryGetIframeCount = 0;
this._cache = {};
this._maxItems = 100000;
this._inviewItemList = {};
this._scrollTop = 0;
this._model = params.model;
if (this._model) {
this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 500));
}
this.scrollTop = util.createDrawCallFunc(this.scrollTop.bind(this));
this._initializeView(params, 0);
}
_initializeView(params) {
let html = CommentListView.__tpl__.replace('%CSS%', this._itemCss);
this._frame = new FrameLayer({
container: params.container,
html: html,
className: 'commentListFrame'
});
this._frame.on('load', this._onIframeLoad.bind(this));
}
_onIframeLoad(w) {
let doc = this._document = w.document;
this._window = w;
let body = this._body = doc.body;
let $body = this._$body = $(body);
if (this._className) {
body.classList.add(this._className);
}
// this._$container = $body.find('#listContainer');
this._container = doc.querySelector('#listContainer');
this._list = doc.getElementById('listContainerInner');
if (this._html) {
this._list.innerHTML = this._html;
}
this._$menu = $body.find('.listMenu');
this._$itemDetail = $body.find('.itemDetailContainer');
$body
.on('click', this._onClick.bind(this))
.on('dblclick', this._onDblClick.bind(this))
.on('keydown', e => ZenzaWatch.emitter.emit('keydown', e))
.on('keyup', e => ZenzaWatch.emitter.emit('keyup', e))
.toggleClass('is-guest', !util.isLogin());
this._$menu.on('click', this._onMenuClick.bind(this));
this._$itemDetail.on('click', this._onItemDetailClick.bind(this));
this._container.addEventListener('mouseover', this._onMouseOver.bind(this));
this._container.addEventListener('mouseleave', this._onMouseOut.bind(this));
this._container.addEventListener('scroll', this._onScroll.bind(this), {passive: true});
this._debouncedOnScrollEnd = _.debounce(this._onScrollEnd.bind(this), 500);
w.addEventListener('resize', this._onResize.bind(this));
this._innerHeight = w.innerHeight;
this._refreshInviewElements = _.throttle(this._refreshInviewElements.bind(this), 100);
//this._appendNewItems = util.createDrawCallFunc(this._appendNewItems.bind(this));
this._debouncedOnItemClick = _.debounce(this._onItemClick.bind(this), 300);
// 互換用
ZenzaWatch.debug.$commentList = $(this._list);
ZenzaWatch.debug.getCommentPanelItems = () => {
return Array.from(doc.querySelectorAll('.commentListItem'));
};
}
_onModelUpdate(itemList, replaceAll) {
window.console.time('update commentlistView');
this.addClass('updating');
itemList = Array.isArray(itemList) ? itemList : [itemList];
let itemViews = [];
this._isActive = false;
if (replaceAll) {
this._scrollTop = 0;
}
itemViews = itemList.map((item, i) =>
new this._ItemView({item: item, index: i, height: CommentListView.ITEM_HEIGHT})
);
this._itemViews = itemViews;
window.setTimeout(() => {
if (!this._list) { return; }
this._list.textContent = '';
this._list.style.height =
`${CommentListView.ITEM_HEIGHT * itemViews.length + 100}px`;
this._inviewItemList = {};
this._$menu.removeClass('show');
this._refreshInviewElements();
this.hideItemDetail();
}, 0);
window.setTimeout(() => {
this.removeClass('updating');
this.emit('update');
}, 100);
window.console.timeEnd('update commentlistView');
}
_onClick(e) {
e.stopPropagation();
ZenzaWatch.emitter.emitAsync('hideHover');
let $item = $(e.target).closest('.commentListItem');
if ($item.length > 0) {
return this._debouncedOnItemClick($item);
}
}
_onItemClick($item) {
this._$menu
// .css('top', $item.attr('data-top') + 'px')
.css('transform', `translate3d(0, ${$item.attr('data-top')}px, 0)`)
// $item.attr('data-time-3dp') + 'px) translateZ(-50px)')
.attr('data-item-id', $item.attr('data-item-id'))
.addClass('show');
}
_onMenuClick(e) {
let $target = $(e.target).closest('.menuButton');
this._$menu.removeClass('show');
if ($target.length < 1) {
return;
}
let itemId = $target.closest('.listMenu').attr('data-item-id');
if ($target.length < 1) {
return;
}
if (!itemId) {
return;
}
let command = $target.attr('data-command');
if (command === 'addUserIdFilter' || command === 'addWordFilter') {
Array.from(this._list.querySelectorAll(`.item${itemId}`))
.forEach(e => e.remove());
}
this.emit('command', command, null, itemId);
}
_onItemDetailClick(e) {
let $target = $(e.target).closest('.command');
if ($target.length < 1) {
return;
}
let itemId = this._$itemDetail.attr('data-item-id');
if (!itemId) {
return;
}
let command = $target.attr('data-command');
let param = $target.attr('data-param');
if (command === 'hideItemDetail') {
return this.hideItemDetail();
}
if (command === 'reloadComment') {
this.hideItemDetail();
}
this.emit('command', command, param, itemId);
}
_onDblClick(e) {
e.stopPropagation();
let $item = $(e.target).closest('.commentListItem');
if ($item.length < 0) {
return;
}
e.preventDefault();
let itemId = $item.attr('data-item-id');
this.emit('command', 'select', null, itemId);
}
_onMouseMove() {
}
_onMouseOver() {
this._isActive = true;
this.addClass('active');
}
_onMouseOut() {
this._isActive = false;
this.removeClass('active');
}
_onResize() {
this._innerHeight = this._window.innerHeight;
this._refreshInviewElements();
}
_onScroll() {
if (!this.hasClass('is-scrolling')) {
this.addClass('is-scrolling');
}
this._refreshInviewElements();
this._debouncedOnScrollEnd();
}
_onScrollEnd() {
this.removeClass('is-scrolling');
}
_refreshInviewElements() {
if (!this._list) {
return;
}
let itemHeight = CommentListView.ITEM_HEIGHT;
let scrollTop = this._container.scrollTop;
let innerHeight = this._innerHeight;
let windowBottom = scrollTop + innerHeight;
let itemViews = this._itemViews;
let startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
let endIndex = Math.min(itemViews.length, Math.floor(windowBottom / itemHeight) + 10);
let i;
const newItems = [], inviewItemList = this._inviewItemList;
for (i = startIndex; i < endIndex; i++) {
if (inviewItemList[i] || !itemViews[i]) {
continue;
}
newItems.push(itemViews[i]);
inviewItemList[i] = itemViews[i];
}
if (newItems.length < 1) {
return;
}
Object.keys(inviewItemList).forEach(i => {
if (i >= startIndex && i <= endIndex) {
return;
}
inviewItemList[i].remove();
delete inviewItemList[i];
});
this._inviewItemList = inviewItemList;
this._newItems = this._newItems ? this._newItems.concat(newItems) : newItems;
this._appendNewItems();
}
_appendNewItems() {
if (this._newItems) {
const f = document.createDocumentFragment();
this._newItems.forEach(i => {
f.appendChild(i.getViewElement());
});
this._list.appendChild(f);
// this._updatePerspective();
}
this._newItems = null;
}
_updatePerspective() {
let keys = Object.keys(this._inviewItemList);
let avr = 0;
if (!keys.length) {
avr = 50;
} else {
let min = 0xffff;
let max = -0xffff;
keys.forEach(key => {
let item = this._inviewItemList[key];
min = Math.min(min, item.time3dp);
max = Math.max(max, item.time3dp);
avr += item.time3dp;
});
avr = avr / keys.length * 100 + 50; //max * 100; //(min + max) / 2 + 10; //50 + avr / keys.length;
}
this._list.style.transform = `translateZ(-${avr}px)`;
}
addClass(className) {
this.toggleClass(className, true);
}
removeClass(className) {
this.toggleClass(className, false);
}
toggleClass(className, v) {
if (!this._body) {
return;
}
this._body.classList.toggle(className, v);
}
hasClass(className) {
return this._body.classList.contains(className);
}
find(query) {
return this._document.querySelectorAll(query);
}
scrollTop(v) {
if (!this._window) {
return 0;
}
if (typeof v === 'number') {
this._scrollTop = v;
this._container.scrollTop = v;
} else {
this._scrollTop = this._container.scrollTop;
return this._scrollTop;
}
}
setCurrentPoint(sec, idx) {
if (!this._window || !this._itemViews) {
return;
}
let innerHeight = this._innerHeight;
let itemViews = this._itemViews;
let len = itemViews.length;
let view = itemViews[idx];
if (len < 1 || !view) {
return;
}
if (!this._isActive) {
let itemHeight = CommentListView.ITEM_HEIGHT;
let top = view.getTop();
this.scrollTop(Math.max(0, top - innerHeight + itemHeight));
}
// requestAnimationFrame(() => {
// this._container.style.setProperty('--current-time', sec);
// this._container.style.setProperty('--scroll-top', view.getTop());
// });
}
showItemDetail(item) {
let $d = this._$itemDetail;
$d.attr('data-item-id', item.getItemId());
$d.find('.resNo').text(item.getNo()).end()
.find('.vpos').text(item.getTimePos()).end()
.find('.time').text(item.getFormattedDate()).end()
.find('.userId').text(item.getUserId()).end()
.find('.cmd').text(item.getCmd()).end()
.find('.text').text(item.getText()).end()
.addClass('show');
ZenzaWatch.debug.$itemDetail = $d;
}
hideItemDetail() {
this._$itemDetail.removeClass('show');
}
}
CommentListView.ITEM_HEIGHT = 40;
CommentListView.__css__ = '';
CommentListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentList</title>
<style type="text/css">
${CONSTANT.BASE_CSS_VARS}
body {
user-select: none;
margin: 0;
padding: 0;
overflow: hidden;
}
body .is-debug {
perspective: 100px;
perspective-origin: left top;
transition: perspective 0.2s ease;
}
body.is-scrolling #listContainerInner *{
pointer-events: none;
}
#listContainer {
position: absolute;
top: -1px;
left:0;
margin: 0;
padding: 0;
width: 100vw;
height: 100vh;
overflow: auto;
overscroll-behavior: contain;
}
.is-debug #listContainerInner {
transform-style: preserve-3d;
transform: translateZ(-50px);
transition: transform 0.2s;
}
#listContainerInner:empty::after {
content: 'コメントは空です';
color: #666;
display: inline-block;
text-align: center;
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
pointer-events: none;
}
.is-guest .forMember {
display: none !important;
}
.itemDetailContainer {
position: fixed;
display: block;
top: 50%;
left: 50%;
line-height: normal;
min-width: 280px;
max-height: 100%;
overflow-y: scroll;
overscroll-behavior: contain;
font-size: 14px;
transform: translate(-50%, -50%);
opacity: 0;
pointer-events: none;
z-index: 100;
border: 2px solid #fc9;
background-color: rgba(255, 255, 232, 0.9);
box-shadow: 4px 4px 0 rgba(99, 99, 66, 0.8);
transition: opacity 0.2s;
}
.itemDetailContainer.show {
opacity: 1;
pointer-events: auto;
}
.itemDetailContainer>* {
}
.itemDetailContainer * {
word-break: break-all;
}
.itemDetailContainer .reloadComment {
display: inline-block;
padding: 0 4px;
cursor: pointer;
transform: scale(1.4);
transition: transform 0.1s;
}
.itemDetailContainer .reloadComment:hover {
transform: scale(1.8);
}
.itemDetailContainer .reloadComment:active {
transform: scale(1.2);
transition: none;
}
.itemDetailContainer .resNo,
.itemDetailContainer .vpos,
.itemDetailContainer .time,
.itemDetailContainer .userId,
.itemDetailContainer .cmd {
font-size: 12px;
}
.itemDetailContainer .time {
cursor: pointer;
color: #339;
}
.itemDetailContainer .time:hover {
text-decoration: underline;
}
.itemDetailContainer .time:hover:after {
position: absolute;
content: '${'\\00231A'} 過去ログ';
right: 16px;
text-decoration: none;
transform: scale(1.4);
}
.itemDetailContainer .resNo:before,
.itemDetailContainer .vpos:before,
.itemDetailContainer .time:before,
.itemDetailContainer .userId:before,
.itemDetailContainer .cmd:before {
display: inline-block;
min-width: 50px;
}
.itemDetailContainer .resNo:before {
content: 'no';
}
.itemDetailContainer .vpos:before {
content: 'pos';
}
.itemDetailContainer .time:before {
content: 'date';
}
.itemDetailContainer .userId:before {
content: 'user';
}
.itemDetailContainer .cmd:before {
content: 'cmd';
}
.itemDetailContainer .text {
border: 1px inset #ccc;
padding: 8px;
margin: 4px 8px;
}
.itemDetailContainer .close {
border: 2px solid #666;
width: 50%;
cursor: pointer;
text-align: center;
margin: auto;
user-select: none;
}
</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
<div class="itemDetailContainer">
<div class="resNo"></div>
<div class="vpos"></div>
<div class="time command" data-command="reloadComment"></div>
<div class="userId"></div>
<div class="cmd"></div>
<div class="text"></div>
<div class="command close" data-command="hideItemDetail">O K</div>
</div>
<div id="listContainer">
<div class="listMenu">
<span class="menuButton itemDetailRequest"
data-command="itemDetailRequest" title="詳細">？</span>
<span class="menuButton clipBoard" data-command="clipBoard" title="クリップボードにコピー">copy</span>
<span class="menuButton addUserIdFilter forMember" data-command="addUserIdFilter" title="NGユーザー">NGuser</span>
<span class="menuButton addWordFilter forMember" data-command="addWordFilter" title="NGワード">NGword</span>
</div>
<div id="listContainerInner"></div>
</div>
</body>
</html>
`).trim();
const CommentListItemView = (() => {
// なんか汎用性を持たせようとして失敗してる奴
// ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
const CSS = (`
* {
box-sizing: border-box;
}
body {
background: #000;
margin: 0;
padding: 0;
overflow: hidden;
line-height: 0;
}
${CONSTANT.SCROLLBAR_CSS}
.listMenu {
position: absolute;
display: block;
}
.listMenu.show {
display: block;
width: 100%;
left: 0;
z-index: 100;
}
.listMenu .menuButton {
display: inline-block;
position: absolute;
font-size: 13px;
line-height: 20px;
border: 1px solid #666;
color: #fff;
background: #666;
cursor: pointer;
top: 0;
text-align: center;
}
.listMenu .menuButton:hover {
border: 1px solid #ccc;
box-shadow: 2px 2px 2px #333;
}
.listMenu .menuButton:active {
box-shadow: none;
transform: translate(0, 1px);
}
.listMenu .itemDetailRequest {
right: 176px;
width: auto;
padding: 0 8px;
}
.listMenu .clipBoard {
right: 120px;
width: 48px;
}
.listMenu .addWordFilter {
right: 64px;
width: 48px;
}
.listMenu .addUserIdFilter {
right: 8px;
width: 48px;
}
.commentListItem {
position: absolute;
display: inline-block;
width: 100%;
height: 40px;
line-height: 20px;
font-size: 20px;
white-space: nowrap;
margin: 0;
padding: 0;
background: #222;
z-index: 50;
contain: layout;
}
.active .commentListItem {
pointer-events: auto;
}
.commentListItem * {
cursor: default;
}
.commentListItem.odd {
background: #333;
}
.commentListItem.updating {
opacity: 0.5;
cursor: wait;
}
.commentListItem .info {
display: block;
width: 100%;
font-size: 14px;
height: 20px;
overflow: hidden;
white-space: nowrap;
text-overflow: ellipsis;
color: #888;
margin: 0;
padding: 0 4px;
}
.commentListItem .timepos {
display: inline-block;
width: 100px;
}
.commentListItem .text {
display: block;
font-size: 16px;
height: 20px;
overflow: hidden;
white-space: nowrap;
text-overflow: ellipsis;
color: #ccc;
margin: 0;
padding: 0 4px;
font-family: '游ゴシック', 'Yu Gothic', 'YuGothic', arial, 'Menlo';
font-feature-settings: "palt" 1;
}
.active .commentListItem:hover {
overflow-x: hidden;
overflow-y: visible;
z-index: 60;
height: auto;
box-shadow: 2px 2px 2px #000, 2px -2px 2px #000;
}
.active .commentListItem:hover .text {
white-space: normal;
word-break: break-all;
height: auto;
}
.commentListItem.fork1 .timepos {
text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
}
.commentListItem.fork2 .timepos {
text-shadow: 1px 1px 0 #880000, -1px -1px 0 #880000 !important;
}
.commentListItem.fork2 .text,
.commentListItem.fork1 .text {
font-weight: bolder;
}
.begin ~ .commentListItem .text {
color: #ffe;
font-weight: bolder;
}
.end ~ .commentListItem .text {
color: #ccc;
font-weight: normal;
}
.commentListItem.subThread {
opacity: 0.6;
}
.commentListItem.active {
outline: dashed 2px #ff8;
outline-offset: 4px;
}
.font-gothic .text {font-family: "游ゴシック", "Yu Gothic", 'YuGothic', "ＭＳ ゴシック", "IPAMonaPGothic", sans-serif, Arial, Menlo;}
.font-mincho .text {font-family: "游明朝体", "Yu Mincho", 'YuMincho', Simsun, Osaka-mono, "Osaka−等幅", "ＭＳ 明朝", "ＭＳ ゴシック", "モトヤLシーダ3等幅", 'Hiragino Mincho ProN', monospace;}
.font-defont .text {font-family: 'Yu Gothic', 'YuGothic', "ＭＳ ゴシック", "MS Gothic", "Meiryo", "ヒラギノ角ゴ", "IPAMonaPGothic", sans-serif, monospace, Menlo; }
/*
.commentListItem .pointer {
position: absolute;
width: 100%;
height: 10px;
bottom: 0;
left: 0;
pointer-events: none;
background: #ffc;
transform-origin: left top;
transition: transform var(--duration) linear;
visibility: hidden;
opacity: 0.3;
animation-duration: calc(var(--duration) * 1s);
animation-delay: calc(((var(--vpos) / 100) - var(--current-time)) * 1s - 1s);
animation-name: pointer-moving;
animation-timing-function: linear;
animation-fill-mode: forwards;
animation-play-state: paused !important;
contain: paint layout style size;
}
@keyframes pointer-moving {
0% {
visibility: visible;
transform: scaleX(1);
}
100% {
visibility: hidden;
transform: scaleX(0.01);
}
}
*/
`).trim();
const TPL = (`
<div class="commentListItem">
<p class="info">
<span class="timepos"></span>&nbsp;&nbsp;<span class="date"></span>
</p>
<p class="text"></p>
</div>
`).trim();
let counter = 0;
let template;
class CommentListItemView {
static get template() {
if (!template) {
const t = document.createElement('template');
t.id = 'CommentListItemView-template' + Date.now();
t.innerHTML = TPL;
document.body.appendChild(t);
template = {
t,
clone: () => {
return document.importNode(t.content, true).firstChild;
},
commentListItem: t.content.querySelector('.commentListItem'),
timepos: t.content.querySelector('.timepos'),
date: t.content.querySelector('.date'),
text: t.content.querySelector('.text')
};
}
return template;
}
constructor(params) {
this.initialize(params);
}
initialize(params) {
this._item = params.item;
this._index = params.index;
this._height = params.height;
this._id = counter++;
}
build() {
const template = this.constructor.template;
const {commentListItem, timepos, date, text} = template;
const item = this._item;
const oden = (this._index % 2 === 0) ? 'even' : 'odd';
const time3dp = Math.round(this._item.time3dp * 100);
const formattedDate = item.getFormattedDate();
commentListItem.id = this.getDomId();
const font = item.getFontCommand() || 'default';
commentListItem.className =
`commentListItem no${item.getNo()} item${this._id} ${oden} fork${item.getFork()} font-${font} ${item.isSubThread() ? 'subThread' : ''}`;
commentListItem.style.cssText = `
top: ${this.getTop()}px;
--duration: ${item.duration};
--vpos: ${item.vpos}
`;
// commentListItem.style.transform = `translateZ(${time3dp}px)`;
//commentListItem.setAttribute('data-time-3dp', time3dp);
Object.assign(commentListItem.dataset, {
itemId: item.getItemId(),
no: item.getNo(),
uniqNo: item.getUniqNo(),
vpos: item.getVpos(),
top: this.getTop(),
thread: item.getThreadId(),
title: `${item.getNo()}: ${formattedDate} ID:${item.getUserId()}\n${item.getText()}`,
time3dp,
nicoru: item.nicoru
});
timepos.textContent = item.getTimePos();
date.textContent = formattedDate;
text.textContent = item.getText().trim();
const color = item.getColor();
text.style.textShadow = color ? `0px 0px 2px ${color}` : '';
this._view = template.clone();
}
getViewElement() {
if (!this._view) {
this.build();
}
return this._view;
}
getItemId() {
return this._item.getItemId();
}
getDomId() {
return `item${this._item.getItemId()}`;
}
getTop() {
return this._index * this._height;
}
remove() {
if (!this._view) {
return;
}
this._view.remove();
}
toString() {
return this.getViewElement().outerHTML;
}
get time3dp() {
return this._item.time3dp;
}
get time3d() {
return this._item.time3d;
}
}
CommentListItemView.TPL = TPL;
CommentListItemView.CSS = CSS;
return CommentListItemView;
})();
class CommentListItem {
constructor(nicoChat) {
this._nicoChat = nicoChat;
this._itemId = CommentListItem._itemId++;
this._vpos = nicoChat.getVpos();
this._text = nicoChat.getText();
this._escapedText = util.escapeHtml(this._text);
this._userId = nicoChat.getUserId();
this._date = nicoChat.getDate();
this._fork = nicoChat.getFork();
this._no = nicoChat.getNo();
this._color = nicoChat.getColor();
this._fontCommand = nicoChat.getFontCommand();
this._isSubThread = nicoChat.isSubThread();
this._formattedDate = util.dateToString(this._date * 1000);
let sec = this._vpos / 100;
this._timePos = util.secToTime(sec);
}
getItemId() {
return this._itemId;
}
getVpos() {
return this._vpos;
}
getTimePos() {
return this._timePos;
}
getCmd() {
return this._nicoChat.getCmd();
}
getText() {
return this._text;
}
getEscapedText() {
return this._escapedText;
}
getUserId() {
return this._userId;
}
getColor() {
return this._color;
}
getDate() {
return this._date;
}
getTime() {
return this._date * 1000;
}
getFormattedDate() {
return this._formattedDate;
}
getFork() {
return this._fork;
}
getNo() {
return this._no;
}
getUniqNo() {
return this._nicoChat.getUniqNo();
}
getFontCommand() {
return this._fontCommand;
}
isSubThread() {
return this._isSubThread;
}
getThreadId() {
return this._nicoChat.getThreadId();
}
get time3d() {
return this._nicoChat.time3d;
}
get time3dp() {
return this._nicoChat.time3dp;
}
get nicoru() {
return this._nicoChat.nicoru;
}
get vpos() {
return this._nicoChat.getVpos();
}
get duration() {
return this._nicoChat.getDuration();
}
}
CommentListItem._itemId = 0;
class CommentPanelView extends Emitter {
constructor(params) {
super();
this._$container = params.$container;
this._model = params.model;
this._commentPanel = params.commentPanel;
util.addStyle(CommentPanelView.__css__);
let $view = this._$view = $(CommentPanelView.__tpl__);
this._$container.append($view);
let $menu = this._$menu = this._$view.find('.commentPanel-menu');
ZenzaWatch.debug.commentPanelView = this;
let listView = this._listView = new CommentListView({
container: this._$view.find('.commentPanel-frame')[0],
model: this._model,
className: 'commentList',
builder: CommentListItemView,
itemCss: CommentListItemView.__css__
});
listView.on('command', this._onCommand.bind(this));
this._timeMachineView = new TimeMachineView({
parentNode: document.querySelector('.timeMachineContainer')
});
this._timeMachineView.on('command', this._onCommand.bind(this));
this._commentPanel.on('threadInfo',
_.debounce(this._onThreadInfo.bind(this), 100));
this._commentPanel.on('update',
_.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
this._commentPanel.on('itemDetailResp',
_.debounce(item => listView.showItemDetail(item), 100));
this._onCommentPanelStatusUpdate();
this._model.on('currentTimeUpdate', this._onModelCurrentTimeUpdate.bind(this));
this._$view.on('click', '.commentPanel-command', this._onCommentListCommandClick.bind(this));
ZenzaWatch.emitter.on('hideHover', () => $menu.removeClass('show'));
}
toggleClass(className, v) {
this._view.toggleClass(className, v);
this._$view.toggleClass(className, v);
}
_onModelCurrentTimeUpdate(sec, viewIndex) {
if (!this._$view){ //} || !this._$view.is(':visible')) {
return;
}
this._lastCurrentTime = sec;
this._listView.setCurrentPoint(sec, viewIndex);
}
_onCommand(command, param, itemId) {
switch (command) {
default:
this.emit('command', command, param, itemId);
break;
}
}
_onCommentListCommandClick(e) {
let $target = $(e.target).closest('.commentPanel-command');
let command = $target.attr('data-command');
let param = $target.attr('data-param');
e.stopPropagation();
if (!command) {
return;
}
let $view = this._$view;
let setUpdating = () => {
document.body.focus();
$view.addClass('updating');
window.setTimeout(() => $view.removeClass('updating'), 1000);
};
switch (command) {
case 'sortBy':
setUpdating();
this.emit('command', command, param);
break;
case 'reloadComment':
setUpdating();
this.emit('command', command, param);
break;
default:
this.emit('command', command, param);
}
ZenzaWatch.emitter.emitAsync('hideHover');
}
_onThreadInfo(threadInfo) {
this._timeMachineView.update(threadInfo);
}
_onCommentPanelStatusUpdate() {
let commentPanel = this._commentPanel;
const $view = this._$view
.toggleClass('autoScroll', commentPanel.isAutoScroll());
const langClass = `lang-${commentPanel.getLanguage()}`;
if (!$view.hasClass(langClass)) {
$view.removeClass('lang-ja_JP lang-en_US lang-zh_TW').addClass(langClass);
}
}
}
CommentPanelView.__css__ = `
:root {
--zenza-comment-panel-header-height: 64px;
}
.commentPanel-container {
height: 100%;
overflow: hidden;
user-select: none;
}
.commentPanel-header {
height: var(--zenza-comment-panel-header-height);
border-bottom: 1px solid #000;
background: #333;
color: #ccc;
}
.commentPanel-menu-button {
display: inline-block;
cursor: pointer;
border: 1px solid #333;
padding: 0px 4px;
margin: 0 4px;
background: #666;
font-size: 16px;
line-height: 28px;
white-space: nowrap;
}
.commentPanel-menu-button:hover {
border: 1px outset;
}
.commentPanel-menu-button:active {
border: 1px inset;
}
.commentPanel-menu-button .commentPanel-menu-icon {
font-size: 24px;
line-height: 28px;
}
.commentPanel-container.autoScroll .autoScroll {
text-shadow: 0 0 6px #f99;
color: #ff9;
}
.commentPanel-frame {
height: calc(100% - var(--zenza-comment-panel-header-height));
transition: opacity 0.3s;
}
.updating .commentPanel-frame,
.shuffle .commentPanel-frame {
opacity: 0;
}
.commentPanel-menu-toggle {
position: absolute;
right: 8px;
display: inline-block;
font-size: 14px;
line-height: 32px;
cursor: pointer;
outline: none;
}
.commentPanel-menu-toggle:focus-within {
pointer-events: none;
}
.commentPanel-menu-toggle:focus-within .zenzaPopupMenu {
pointer-events: auto;
visibility: visible;
opacity: 0.99;
pointer-events: auto;
transition: opacity 0.3s;
}
.commentPanel-menu {
position: absolute;
right: 0px;
top: 24px;
min-width: 150px;
}
.commentPanel-menu li {
line-height: 20px;
}
.commentPanel-container.lang-ja_JP .commentPanel-command[data-param=ja_JP],
.commentPanel-container.lang-en_US .commentPanel-command[data-param=en_US],
.commentPanel-container.lang-zh_TW .commentPanel-command[data-param=zh_TW] {
font-weight: bolder;
color: #ff9;
}
`.trim();
CommentPanelView.__tpl__ = (`
<div class="commentPanel-container">
<div class="commentPanel-header">
<label class="commentPanel-menu-button autoScroll commentPanel-command"
data-command="toggleScroll"><icon class="commentPanel-menu-icon">⬇️</icon> 自動スクロール</label>
<div class="commentPanel-command commentPanel-menu-toggle" tabindex="-1">
▼ メニュー
<div class="zenzaPopupMenu commentPanel-menu">
<div class="listInner">
<ul>
<li class="commentPanel-command" data-command="sortBy" data-param="vpos">
コメント位置順に並べる
</li>
<li class="commentPanel-command" data-command="sortBy" data-param="date:desc">
コメントの新しい順に並べる
</li>
<hr class="separator">
<li class="commentPanel-command" data-command="update-commentLanguage" data-param="ja_JP">
日本語
</li>
<li class="commentPanel-command" data-command="update-commentLanguage" data-param="en_US">
English
</li>
<li class="commentPanel-command" data-command="update-commentLanguage" data-param="zh_TW">
中文
</li>
</ul>
</div>
</div>
</div>
<div class="timeMachineContainer forMember"></div>
</div>
<div class="commentPanel-frame"></div>
</div>
`).trim();
class CommentPanel extends Emitter {
constructor(params) {
super();
this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
this._$container = params.$container;
let player = this._player = params.player;
this._autoScroll = _.isBoolean(params.autoScroll) ? params.autoScroll : true;
this._model = new CommentListModel({});
this._language = params.language || 'ja_JP';
player.on('commentParsed', _.debounce(this._onCommentParsed.bind(this), 500));
player.on('commentChange', _.debounce(this._onCommentChange.bind(this), 500));
player.on('commentReady', _.debounce(this._onCommentReady.bind(this), 500));
player.on('open', this._onPlayerOpen.bind(this));
player.on('close', this._onPlayerClose.bind(this));
ZenzaWatch.debug.commentPanel = this;
}
_initializeView() {
if (this._view) {
return;
}
this._view = new CommentPanelView({
$container: this._$container,
model: this._model,
commentPanel: this,
builder: CommentListItemView,
itemCss: CommentListItemView.__css__
});
this._view.on('command', this._onCommand.bind(this));
}
startTimer() {
this.stopTimer();
this._timer = window.setInterval(this._onTimer.bind(this), 200);
}
stopTimer() {
if (this._timer) {
window.clearInterval(this._timer);
this._timer = null;
}
}
_onTimer() {
if (this._autoScroll) {
this.setCurrentTime(this._player.getCurrentTime());
}
}
_onCommand(command, param, itemId) {
let item;
if (itemId) {
item = this._model.findByItemId(itemId);
}
switch (command) {
case 'toggleScroll':
this.toggleScroll();
break;
case 'sortBy': {
let tmp = param.split(':');
this.sortBy(tmp[0], tmp[1] === 'desc');
break;}
case 'select':{
let vpos = item.getVpos();
this.emit('command', 'seek', vpos / 100);
// TODO: コメント強調
break;}
case 'clipBoard':
util.copyToClipBoard(item.getText());
this.emit('command', 'notify', 'クリップボードにコピーしました');
break;
case 'addUserIdFilter':
this._model.removeItem(item);
this.emit('command', command, item.getUserId());
break;
case 'addWordFilter':
this._model.removeItem(item);
this.emit('command', command, item.getText());
break;
case 'reloadComment':
if (item) {
param = {};
let dt = new Date(item.getTime());
this.emit('command', 'notify', item.getFormattedDate() + '頃のログ');
param.when = Math.floor(dt.getTime() / 1000);
}
this.emit('command', command, param);
break;
case 'itemDetailRequest':
if (item) {
this.emit('itemDetailResp', item);
}
break;
default:
this.emit('command', command, param);
}
}
_onCommentParsed(language) {
this.setLanguage(language);
this._initializeView();
this.setChatList(this._player.getChatList());
this.startTimer();
}
_onCommentChange(language) {
this.setLanguage(language);
this._initializeView();
this.setChatList(this._player.getChatList());
}
_onCommentReady(result, threadInfo) {
this._threadInfo = threadInfo;
this.emit('threadInfo', threadInfo);
}
_onPlayerOpen() {
this._model.clear();
}
_onPlayerClose() {
this._model.clear();
this.stopTimer();
}
setChatList(chatList) {
if (!this._model) {
return;
}
this._model.setChatList(chatList);
}
isAutoScroll() {
return this._autoScroll;
}
getLanguage() {
return this._language || 'ja_JP';
}
getThreadInfo() {
return this._threadInfo;
}
setLanguage(lang) {
if (lang !== this._language) {
this._language = lang;
this.emit('update');
}
}
toggleScroll(v) {
if (!_.isBoolean(v)) {
this._autoScroll = !this._autoScroll;
if (this._autoScroll) {
this._model.sortBy('vpos');
}
this.emit('update');
return;
}
if (this._autoScroll !== v) {
this._autoScroll = v;
if (this._autoScroll) {
this._model.sortBy('vpos');
}
this.emit('update');
}
}
sortBy(key, isDesc) {
this._model.sortBy(key, isDesc);
if (key !== 'vpos') {
this.toggleScroll(false);
}
}
setCurrentTime(sec) {
if (!this._view) {
return;
}
if (!this._autoScroll) {
return;
}
this._model.setCurrentTime(sec);
}
}
class TimeMachineView extends BaseViewComponent {
constructor({parentNode}) {
super({
parentNode,
name: 'TimeMachineView',
template: '<div class="TimeMachineView"></div>',
shadow: TimeMachineView._shadow_,
css: ''
});
this._bound._onTimer = this._onTimer.bind(this);
this._state = {
isWaybackMode: false,
isSelecting: false,
};
this._currentTimestamp = Date.now();
ZenzaWatch.debug.timeMachineView = this;
window.setInterval(this._bound._onTimer, 3 * 1000);
}
_initDom(...args) {
super._initDom(...args);
const v = this._shadow || this._view;
Object.assign(this._elm, {
time: v.querySelector('.dateTime'),
back: v.querySelector('.backToTheFuture'),
input: v.querySelector('.dateTimeInput'),
submit: v.querySelector('.dateTimeSubmit'),
cancel: v.querySelector('.dateTimeCancel')
});
this._updateTimestamp();
this._elm.time.addEventListener('click', this._toggle.bind(this));
this._elm.back.addEventListener('mousedown', _.debounce(this._onBack.bind(this), 300));
this._elm.submit.addEventListener('click', this._onSubmit.bind(this));
this._elm.cancel.addEventListener('click', this._onCancel.bind(this));
}
update(threadInfo) {
//window.console.info('TimeMachineView update', threadInfo);
this._videoPostTime = threadInfo.threadId * 1000;
const isWaybackMode = threadInfo.isWaybackMode;
this.setState({isWaybackMode, isSelecting: false});
if (isWaybackMode) {
this._currentTimestamp = threadInfo.when * 1000;
} else {
this._currentTimestamp = Date.now();
}
this._updateTimestamp();
}
_updateTimestamp() {
if (isNaN(this._currentTimestamp)) {
return;
}
this._elm.time.textContent = this._currentTime = this._toDate(this._currentTimestamp);
}
openSelect() {
const input = this._elm.input;
const now = this._toTDate(Date.now());
input.setAttribute('max', now);
input.setAttribute('value', this._toTDate(this._currentTimestamp));
input.setAttribute('min', this._toTDate(this._videoPostTime));
this.setState({isSelecting: true});
window.setTimeout(() => {
input.focus();
}, 0);
}
closeSelect() {
this.setState({isSelecting: false});
}
_toggle() {
if (this._state.isSelecting) {
this.closeSelect();
} else {
this.openSelect();
}
}
_onTimer() {
if (this._state.isWaybackMode) {
return;
}
let now = Date.now();
let str = this._toDate(now);
if (this._currentTime === str) {
return;
}
this._currentTimestamp = now;
this._updateTimestamp();
}
_padTime(time) {
let pad = v => {
return v.toString().padStart(2, '0');
};
let dt = new Date(time);
return {
yyyy: dt.getFullYear(),
mm: pad(dt.getMonth() + 1),
dd: pad(dt.getDate()),
h: pad(dt.getHours()),
m: pad(dt.getMinutes()),
s: pad(dt.getSeconds())
};
}
_toDate(time) {
let {yyyy, mm, dd, h, m} = this._padTime(time);
return `${yyyy}/${mm}/${dd} ${h}:${m}`;
}
_toTDate(time) {
let {yyyy, mm, dd, h, m, s} = this._padTime(time);
return `${yyyy}-${mm}-${dd}T${h}:${m}:${s}`;
}
_onSubmit() {
const val = this._elm.input.value;
if (!val || !/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(|:\d\d)$/.test(val)) {
return;
}
const dt = new Date(val);
const when =
Math.floor(Math.max(dt.getTime(), this._videoPostTime) / 1000);
this.emit('command', 'reloadComment', {when});
this.closeSelect();
}
_onCancel() {
this.closeSelect();
}
_onBack() {
this.setState({isWaybackMode: false});
this.closeSelect();
this.emit('command', 'reloadComment', {when: 0});
}
}
TimeMachineView._shadow_ = (`
<style>
.dateTime {
display: inline-block;
margin: auto 4px 4px;
padding: 0 4px;
border: 1px solid;
background: #888;
color: #000;
font-size: 20px;
line-height: 24px;
font-family: monospace;
cursor: pointer;
}
.is-WaybackMode .dateTime {
background: #000;
color: #888;
box-shadow: 0 0 4px #ccc, 0 0 4px #ccc inset;
}
.reloadButton {
display: inline-block;
line-height: 24px;
font-size: 16px;
margin: auto 4px;
cursor: pointer;
user-select: none;
transition: transform 0.1s;
}
.is-WaybackMode .reloadButton {
display: none;
}
.reloadButton .icon {
display: inline-block;
transform: rotate(90deg) scale(1.3);
transition: transform 1s, color 0.2s, text-shadow 0.2s;
text-shadow: none;
font-family: 'STIXGeneral';
margin-right: 8px;
}
.reloadButton:hover {
text-decoration: underline;
}
.reloadButton:active {
color: #888;
cursor: wait;
}
.reloadButton:active .icon {
text-decoration: none;
transform: rotate(-270deg) scale(2);
transition: none;
color: #ff0;
text-shadow: 0 0 4px #ff8;
}
.backToTheFuture {
display: none;
line-height: 24px;
font-size: 16px;
margin: auto 4px;
cursor: pointer;
transition: transform 0.1s;
user-select: none;
}
.backToTheFuture:hover {
text-shadow: 0 0 8px #ffc;
transform: translate(0, -2px);
}
.backToTheFuture:active {
text-shadow: none;
transform: translate(0px, -1000px);
}
.is-WaybackMode .backToTheFuture {
display: inline-block;
}
.inputContainer {
display: none;
position: absolute;
top: 32px;
left: 4px;
background: #333;
box-shadow: 0 0 4px #fff;
}
.is-Selecting .inputContainer {
display: block;
}
.dateTimeInput {
display: block;
font-size: 16px;
}
.submitContainer {
text-align: right;
}
.dateTimeSubmit, .dateTimeCancel {
display: inline-block;
min-width: 50px;
cursor: pointer;
padding: 4px 8px;
margin: 4px;
border: 1px solid #888;
text-align: center;
transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
user-select: none;
}
.dateTimeSubmit:hover, .dateTimeCancel:hover {
background: #666;
transform: translate(0, -2px);
box-shadow: 0 4px 2px #000;
}
.dateTimeSubmit:active, .dateTimeCancel:active {
background: #333;
transform: translate(0, 0);
box-shadow: 0 0 2px #000 inset;
}
.dateTimeSubmit {
}
.dateTimeCancel {
}
</style>
<div class="root TimeMachine">
<div class="dateTime" title="TimeMachine">0000/00/00 00:00</div>
<div class="reloadButton command" data-command="reloadComment" data-param="0" title="コメントのリロード"><span class="icon">&#8635;</span>リロード</div>
<div class="backToTheFuture" title="Back To The Future">&#11152; Back</div>
<div class="inputContainer">
<input type="datetime-local" class="dateTimeInput">
<div class="submitContainer">
<div class="dateTimeSubmit">G&nbsp;&nbsp;O</div>
<div class="dateTimeCancel">Cancel</div>
</div>
</div>
</div>
`).trim();
TimeMachineView.__tpl__ = ('<div class="TimeMachineView forMember"></div>').trim();

class VideoListModel extends Emitter {
constructor(params) {
super();
this._boundSet = new WeakSet();
this.initialize(params);
}
initialize(params) {
this._isUniq = params.uniq;
this._items = [];
this._maxItems = params.maxItems || 100;
this._boundOnItemUpdate = this._onItemUpdate.bind(this);
}
setItem(itemList) {
itemList = Array.isArray(itemList) ? itemList : [itemList];
this._items = itemList;
if (this._isUniq) {
this._items =
_.uniq(this._items, false, item => {
return item.uniqId;
});
}
this.emit('update', this._items, true);
}
clear() {
this.setItem([]);
}
insertItem(itemList, index) {
//window.console.log('insertItem', itemList, index);
itemList = Array.isArray(itemList) ? itemList : [itemList];
if (itemList.length < 1) {
return;
}
index = Math.min(this._items.length, (_.isNumber(index) ? index : 0));
Array.prototype.splice.apply(this._items, [index, 0].concat(itemList));
if (this._isUniq) {
itemList.forEach(i => this.removeSameWatchId(i));
}
this._items.splice(this._maxItems);
this.emit('update', this._items);
return this.indexOf(itemList[0]);
}
appendItem(itemList) {
itemList = Array.isArray(itemList) ? itemList : [itemList];
if (itemList.length < 1) {
return;
}
this._items = this._items.concat(itemList);
if (this._isUniq) {
itemList.forEach(i => this.removeSameWatchId(i));
}
while (this._items.length > this._maxItems) {
this._items.shift();
}
this.emit('update', this._items);
return this._items.length - 1;
}
removeItemByIndex(index) {
const item = this._getItemByIndex(index);
if (!item) {
return;
}
this._items = this._items.filter(i => {
return i !== item;
});
}
removePlayedItem() {
const beforeLen = this._items.length;
this._items = this._items.filter(item => {
return item.isActive || !item.isPlayed;
});
const afterLen = this._items.length;
if (beforeLen !== afterLen) {
this.emit('update', this._items);
}
}
resetPlayedItemFlag() {
this._items.forEach(item => {
if (item.isPlayed) {
item.isPlayed = false;
}
});
this.onUpdate();
}
removeNonActiveItem() {
const beforeLen = this._items.length;
this._items = this._items.filter(item => {
return item.isActive;
});
const afterLen = this._items.length;
if (beforeLen !== afterLen) {
this.emit('update', this._items);
}
}
shuffle() {
this._items = _.shuffle(this._items);
this.emit('update', this._items);
}
_getItemByIndex(index) {
return this._items[index];
}
indexOf(item) {
if (!item || !item.itemId) { return -1; }
return this._items.findIndex(i => i.itemId === item.itemId);
}
getItemByIndex(index) {
const item = this._getItemByIndex(index);
if (!item) {
return null;
}
if (!this._boundSet.has(item)) {
this._boundSet.add(item);
item.on('update', this._boundOnItemUpdate);
}
return item;
}
findByItemId(itemId) {
itemId = parseInt(itemId, 10);
const item = this._items.find(item => {
return item.itemId === itemId;
});
if (item && !this._boundSet.has(item)) {
this._boundSet.add(item);
item.on('update', this._boundOnItemUpdate);
}
return item;
}
findByWatchId(watchId) {
watchId = watchId + '';
const item = this._items.find(item => {
return item.watchId === watchId;
});
if (item && !this._boundSet.has(item)) {
this._boundSet.add(item);
item.on('update', this._boundOnItemUpdate);
}
return item;
}
removeItem(item) {
const beforeLen = this._items.length;
_.pull(this._items, item);
item.off('update', this._boundOnItemUpdate);
this._boundSet.delete(item);
const afterLen = this._items.length;
if (beforeLen !== afterLen) {
this.emit('item-remove', item);
}
}
/**
* パラメータで指定されたitemと同じwatchIdのitemを削除
*/
removeSameWatchId(item) {
const watchId = item.watchId;
const uniqId = item.uniqId;
const beforeLen = this._items.length;
_.remove(this._items, i => {
return item !== i && (i.watchId === watchId || i.uniqId === uniqId);
});
const afterLen = this._items.length;
if (beforeLen !== afterLen) {
this.emit('update', this._items);
}
}
uniq(item) {
this._items.forEach((i) => {
if (i === item) {
return;
}
this.removeSameWatchId(i);
});
}
_onItemUpdate(item, key, value) {
this.emit('item-update', item, key, value);
}
serialize() {
return this._items.map(item => item.serialize());
}
unserialize(itemDataList) {
const items = [];
itemDataList.forEach(itemData => {
items.push(new VideoListItem(itemData));
});
this.setItem(items);
}
sortBy(key, isDesc) {
const table = {
watchId: 'watchId',
duration: 'getDuration',
title: 'getSortTitle',
comment: 'getCommentCount',
mylist: 'getMylistCount',
view: 'getViewCount',
postedAt: 'getPostedAt',
};
const func = table[key];
if (!func) {
return;
}
this._items = _.sortBy(this._items, item => {
return typeof item[func] === 'function' ? item[func](): item[func];
});
if (isDesc) {
this._items.reverse();
}
this.onUpdate();
}
onUpdate() {
this.emitAsync('update', this._items);
}
get length() {
return this._items.length;
}
get activeIndex() {
return this._items.findIndex(i => i.isActive);
}
get totalDuration() {
let total = 0;
this._items.forEach(item => {
total += item.getDuration();
});
return total;
}
}
// なんか汎用性を持たせようとして失敗してる奴
const VideoListItemView = (() => {
const ITEM_HEIGHT = 100;
const THUMBNAIL_WIDTH = 96;
const THUMBNAIL_HEIGHT = 72;
// ここはDOM的に隔離されてるので外部要因との干渉を考えなくてよい
const CSS = (`
* {
box-sizing: border-box;
}
.videoItem {
position: relative;
display: grid;
width: 100%;
height: ${ITEM_HEIGHT}px;
overflow: hidden;
grid-template-columns: ${THUMBNAIL_WIDTH}px 1fr;
grid-template-rows: ${THUMBNAIL_HEIGHT}px 1fr;
padding: 2px;
transition:
transform 0.4s ease, box-shadow 0.4s ease;
contain: layout size;
}
.playlist .videoItem {
cursor: move;
}
.playlist .videoItem::before {
content: counter(itemIndex);
counter-increment: itemIndex;
position: absolute;
right: 8px;
top: 80%;
color: #666;
font-family: Impact;
font-size: 45px;
pointer-events: none;
z-index: 1;
line-height: ${ITEM_HEIGHT}px;
opacity: 0.6;
transform: translate(0, -50%);
}
.videoItem.is-updating {
opacity: 0.5;
cursor: wait;
}
.videoItem.dragging {
pointer-events: none;
box-shadow: 8px 8px 4px #000;
background: #666;
opacity: 0.8;
transition:
box-shadow 0.4s ease;
z-index: 10000;
}
.dragging * {
cursor: move;
}
.dragging .videoItem.dragover {
outline: 5px dashed #99f;
}
.dragging .videoItem.dragover * {
opacity: 0.3;
}
.videoItem + .videoItem {
border-top: 1px dotted var(--item-border-color);
margin-top: 4px;
outline-offset: -8px;
}
.videoItem.is-ng-rejected {
display: none;
}
.videoItem.is-fav-favorited .postedAt::after {
content: ' ★';
color: #fea;
text-shadow: 2px 2px 2px #000;
}
.thumbnailContainer {
position: relative;
transform: translate(0, 2px);
margin: 0;
background-color: black;
background-size: contain;
background-repeat: no-repeat;
background-position: center;
}
.thumbnailContainer a {
display: inline-block;
width: 100%;
height: 100%;
transition: box-shaow 0.4s ease, transform 0.4s ease;
}
.thumbnailContainer a:active {
box-shadow: 0 0 8px #f99;
transform: translate(0, 4px);
transition: none;
}
.thumbnailContainer .playlistAppend,
.playlistRemove,
.thumbnailContainer .deflistAdd,
.thumbnailContainer .pocket-info {
position: absolute;
display: none;
color: #fff;
background: #666;
width: 24px;
height: 20px;
line-height: 18px;
font-size: 14px;
box-sizing: border-box;
text-align: center;
font-weight: bolder;
color: #fff;
cursor: pointer;
}
.thumbnailContainer .playlistAppend {
left: 0;
bottom: 0;
}
.playlistRemove {
right: 8px;
top: 0;
}
.thumbnailContainer .deflistAdd {
right: 0;
bottom: 0;
}
.thumbnailContainer .pocket-info {
display: none !important;
right: 24px;
bottom: 0;
}
.is-pocketReady .videoItem:hover .pocket-info {
display: inline-block !important;
}
.playlist .playlistAppend {
display: none !important;
}
.playlistRemove {
display: none;
}
.playlist .videoItem:not(.is-active):hover .playlistRemove {
display: inline-block;
}
.playlist .videoItem:not(.is-active):hover .playlistRemove,
.videoItem:hover .thumbnailContainer .playlistAppend,
.videoItem:hover .thumbnailContainer .deflistAdd,
.videoItem:hover .thumbnailContainer .pocket-info {
display: inline-block;
border: 1px outset;
}
.playlist .videoItem:not(.is-active):hover .playlistRemove:hover,
.videoItem:hover .thumbnailContainer .playlistAppend:hover,
.videoItem:hover .thumbnailContainer .deflistAdd:hover,
.videoItem:hover .thumbnailContainer .pocket-info:hover {
transform: scale(1.5);
box-shadow: 2px 2px 2px #000;
}
.playlist .videoItem:not(.is-active):hover .playlistRemove:active,
.videoItem:hover .thumbnailContainer .playlistAppend:active,
.videoItem:hover .thumbnailContainer .deflistAdd:active,
.videoItem:hover .thumbnailContainer .pocket-info:active {
transform: scale(1.3);
border: 1px inset;
transition: none;
}
.videoItem.is-updating .thumbnailContainer .deflistAdd {
transform: scale(1.0) !important;
border: 1px inset !important;
pointer-events: none;
}
.thumbnailContainer .duration {
position: absolute;
right: 0;
bottom: 0;
background: #000;
font-size: 12px;
color: #fff;
}
.videoItem:hover .thumbnailContainer .duration {
display: none;
}
.videoInfo {
height: 100%;
padding-left: 4px;
}
.postedAt {
font-size: 12px;
color: #ccc;
}
.is-played .postedAt::after {
content: ' ●';
font-size: 10px;
}
.counter {
position: absolute;
top: 80px;
width: 100%;
text-align: center;
}
.title {
height: 52px;
overflow: hidden;
}
.videoLink {
font-size: 14px;
color: #ff9;
transition: background 0.4s ease, color 0.4s ease;
}
.videoLink:visited {
color: #ffd;
}
.videoLink:active {
color: #fff;
background: #663;
transition: none;
}
.noVideoCounter .counter {
display: none;
}
.counter {
font-size: 12px;
color: #ccc;
}
.counter .value {
font-weight: bolder;
}
.counter .count {
white-space: nowrap;
}
.counter .count + .count {
margin-left: 8px;
}
.videoItem.is-active {
border: none !important;
background: #776;
}
@media screen and (min-width: 600px)
{
#listContainerInner {
display: grid;
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.videoItem {
margin: 4px 8px 0;
border-top: none !important;
border-bottom: 1px dotted var(--item-border-color);
}
}
`).trim();
const TPL = (`
<div class="videoItem">
<span class="command playlistRemove" data-command="playlistRemove" title="プレイリストから削除">×</span>
<div class="thumbnailContainer">
<a class="command" data-command="select">
<span class="duration"></span>
</a>
<span class="command playlistAppend" data-command="playlistAppend" title="プレイリストに追加">▶</span>
<span class="command deflistAdd" data-command="deflistAdd" title="とりあえずマイリスト">&#x271A;</span>
<span class="command pocket-info" data-command="pocket-info" title="動画情報">？</span>
</div>
<div class="videoInfo">
<div class="postedAt"></div>
<div class="title">
<a class="command videoLink" data-command="select"></a>
</div>
</div>
<div class="counter">
<span class="count">再生: <span class="value viewCount"></span></span>
<span class="count">コメ: <span class="value commentCount"></span></span>
<span class="count">マイ: <span class="value mylistCount"></span></span>
</div>
</div>
`).trim();
let counter = 0;
let template;
class VideoListItemView {
static get template() {
if (!template) {
const t = document.createElement('template');
t.id = `VideoListItemView-template${Date.now()}`;
t.innerHTML = TPL;
document.body.appendChild(t);
const tc = t.content;
template = {
t,
clone: () => {
return document.importNode(t.content, true).firstChild;
},
videoItem: tc.querySelector('.videoItem'),
duration: tc.querySelector('.duration'),
thumbnail: tc.querySelector('.thumbnailContainer'),
thumbnailLink: tc.querySelector('.thumbnailContainer>a'),
videoLink: tc.querySelector('.videoLink'),
postedAt: tc.querySelector('.postedAt'),
viewCount: tc.querySelector('.viewCount'),
commentCount: tc.querySelector('.commentCount'),
mylistCount: tc.querySelector('.mylistCount'),
playlistAppend: tc.querySelector('.playlistAppend'),
playlistRemove: tc.querySelector('.playlistRemove'),
deflistAdd: tc.querySelector('.deflistAdd'),
pocketInfo: tc.querySelector('.pocket-info')
};
}
return template;
}
constructor(item) {
this.initialize(item);
}
initialize(item) {
this._item = item.item;
this._isLazy = typeof item.enableLazyLoadImage === 'boolean' ?
item.enableLazyLoadImage : false;
this._id = counter++;
}
build() {
const template = this.constructor.template;
const {videoItem, duration, thumbnail, thumbnailLink, videoLink, postedAt, viewCount, commentCount, mylistCount, playlistAppend, playlistRemove, deflistAdd, pocketInfo} = template;
const item = this._item;
const title = item.title;
const count = item.count;
const itemId = item.itemId;
const watchId = item.watchId;
const watchUrl = `//www.nicovideo.jp/watch/${watchId}`;
videoItem.className = `videoItem watch${watchId} item${itemId} ${item.isActive ? 'is-active' : ''} ${item.isUpdating ? 'is-updating' : ''} ${item.isPlayed ? 'is-played' : ''}`;
videoItem.setAttribute('data-item-id', itemId);
videoItem.setAttribute('data-watch-id', watchId);
thumbnail.classList.toggle('lazy-load', this._isLazy);
thumbnail.setAttribute('data-watch-id', watchId);
if (this._isLazy) {
thumbnail.style.backgroundColor = '#666';
thumbnail.style.backgroundImage = 'none';
} else {
thumbnail.style.backgroundImage = `url(${item.thumbnail})`;
}
thumbnail.setAttribute('data-src', item.thumbnail);
thumbnailLink.setAttribute('href', watchUrl);
thumbnailLink.setAttribute('data-param', itemId);
videoLink.setAttribute('href', watchUrl);
videoLink.setAttribute('data-param', itemId);
videoLink.setAttribute('title', title);
videoLink.textContent = title;
duration.textContent = util.secToTime(item.getDuration());
postedAt.textContent = item.getPostedAt();
viewCount.textContent = this._addComma(count.view);
commentCount.textContent = this._addComma(count.comment);
mylistCount.textContent = this._addComma(count.mylist);
playlistAppend.setAttribute('data-param', watchId);
playlistRemove.setAttribute('data-param', watchId);
deflistAdd.setAttribute('data-param', watchId);
pocketInfo.setAttribute('data-param', watchId);
this._view = template.clone();
}
rebuild(item) {
this._isLazy = false;
this._item = item;
const lastView = this._view;
if (!lastView) {
return this.build();
}
this.build();
if (lastView.parentNode) {
lastView.parentNode.replaceChild(this.getViewElement(), lastView);
}
}
get watchId() {
return this._item.watchId;
}
getViewElement() {
if (!this._view) {
this.build();
}
return this._view;
}
remove() {
if (!this._view) {
return;
}
this._view.remove();
}
toString() {
return this.getView().outerHTML;
}
_addComma(m) {
if (isNaN(m)) {
return '---';
}
return m.toLocaleString ? m.toLocaleString() : util.escapeHtml(m);
}
addClass(className) {
this.toggleClass(className, true);
}
removeClass(className) {
this.toggleClass(className, false);
}
toggleClass(className, v) {
if (!this._view) {
this.build();
}
this._view.classList.toggle(className, v);
}
}
VideoListItemView.CSS = CSS;
VideoListItemView.TPL = TPL;
return VideoListItemView;
})();
/**
* DOM的に隔離したiframeの中に生成する。
* かなり実験要素が多いのでまだまだ変わる。
*/
class VideoListView extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
get hasFocus() {
return this._hasFocus;
}
}
VideoListView.__css__ = '';
VideoListView.__tpl__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>VideoList</title>
<style type="text/css">
${CONSTANT.BASE_CSS_VARS}
${CONSTANT.SCROLLBAR_CSS}
body {
user-select: none;
background: #333;
overflow: hidden;
}
.drag-over>* {
opacity: 0.5;
pointer-events: none;
}
.is-updating #listContainer {
pointer-events: none;
opacity: 0.5;
transition: none;
}
#listContainer {
position: absolute;
top: 0;
left:0;
margin: 0;
padding: 0;
width: 100vw;
height: 100vh;
overflow-x: hidden;
overflow-y: scroll;
overscroll-behavior: contain;
transition: 0.2s opacity;
counter-reset: itemIndex;
will-change: transform;
}
#listContainerInner {
margin-bottom: calc(100vh - 100px);
}
.is-scrolling #listContainerInner {
pointer-events: none;
animation-play-state: paused !important;
}
.scrollToTop, .scrollToActive {
position: fixed;
width: 32px;
height: 32px;
right: 48px;
bottom: 8px;
font-size: 24px;
line-height: 32px;
text-align: center;
z-index: 100;
background: #ccc;
color: #000;
border-radius: 100%;
cursor: pointer;
opacity: 0.3;
transition: opacity 0.4s ease;
}
.scrollToActive {
--progress: calc(var(--active-index) / var(--list-length) * 100%);
display: none;
top: var(--progress);
border-radius: 0;
bottom: auto;
right: 0;
transform: translateY(calc(var(--progress) * -1));
background: none;
opacity: 0.5;
color: #f99;
}
.playlist .scrollToActive {
display: block;
}
.playlist .scrollToActive:hover {
background: #ccc;
}
.scrollToTop:hover {
opacity: 0.9;
box-shadow: 0 0 8px #fff;
}
</style>
<style id="listItemStyle">%CSS%</style>
<body class="zenzaRoot">
<div id="listContainer">
<div id="listContainerInner"></div>
</div>
<div class="scrollToActive command" title="いまここ" data-command="scrollToActiveItem">&#9658;</div>
<div class="scrollToTop command" title="一番上にスクロール" data-command="scrollToTop">&#x2303;</div>
</body>
</html>
`).trim();
_.assign(VideoListView.prototype, {
initialize: function (params) {
this._ItemView = params.itemView || VideoListItemView;
this._itemCss = params.itemCss || VideoListItemView.CSS;
this._className = params.className || 'videoList';
this._container = params.container;
this._retryGetIframeCount = 0;
this._itemViewCache = new WeakMap();
this._maxItems = params.max || 100;
this._dragdrop = typeof params.dragdrop === 'boolean' ? params.dragdrop : false;
this._dropfile = typeof params.dropfile === 'boolean' ? params.dropfile : false;
this._enablePocketWatch = params.enablePocketWatch;
this._hasFocus = false;
this._model = params.model;
if (this._model) {
this._model.on('update', _.debounce(this._onModelUpdate.bind(this), 100));
this._model.on('item-update', this._onModelItemUpdate.bind(this));
this._model.on('item-remove', this._onModelItemRemove.bind(this));
}
this._enableLazyLoadImage = window.IntersectionObserver ? true : false;
this._initializeView(params);
},
_initializeView: function (params) {
let html = VideoListView.__tpl__.replace('%CSS%', this._itemCss);
this._frame = new FrameLayer({
container: params.container,
html: html,
className: 'videoListFrame'
});
this._frame.on('load', this._onIframeLoad.bind(this));
},
_onIframeLoad: function (w) {
const doc = this._document = w.document;
const $body = this._$body = $(doc.body);
if (this._className) {
doc.body.classList.add(this._className);
}
const container = this._container = doc.querySelector('#listContainer');
const list = this._list = doc.getElementById('listContainerInner');
if (this._documentFragment instanceof Node) {
list.appendChild(this._documentFragment);
this._setInviewObserver();
this._documentFragment = null;
}
doc.body.addEventListener('click', this._onClick.bind(this));
doc.body.addEventListener('keydown', e => ZenzaWatch.emitter.emit('keydown', e));
doc.body.addEventListener('keyup', e => ZenzaWatch.emitter.emit('keyup', e));
w.addEventListener('focus', () => this._hasFocus = true);
w.addEventListener('blur', () => this._hasFocus = false);
this._updateCSSVars();
if (this._dragdrop) {
doc.body.addEventListener('mousedown', this._onBodyMouseDown.bind(this), {passive: true});
}
const onScroll = () => {
if (!container.classList.contains('is-scrolling')) {
container.classList.add('is-scrolling');
}
onScrollEnd();
};
const onScrollEnd = _.debounce(() => {
if (container.classList.contains('is-scrolling')) {
container.classList.remove('is-scrolling');
}
}, 500);
container.addEventListener('scroll', onScroll, {passive: true});
if (this._dropfile) {
$body
.on('dragover', this._onBodyDragOverFile.bind(this))
.on('dragenter', this._onBodyDragEnterFile.bind(this))
.on('dragleave', this._onBodyDragLeaveFile.bind(this))
.on('drop', this._onBodyDropFile.bind(this));
}
MylistPocketDetector.detect().then(pocket => {
this._pocket = pocket;
$body.addClass('is-pocketReady');
if (pocket.external.observe && this._enablePocketWatch) {
pocket.external.observe({
query: 'a.videoLink',
container,
closest: '.videoItem'
});
}
});
},
_onBodyMouseDown: function (e) {
let $item = $(e.target).closest('.videoItem');
if ($item.length < 1) {
return;
}
if ($(e.target).closest('.command').length > 0) {
return;
}
this._$dragging = $item;
this._dragOffset = {
x: e.pageX,
y: e.pageY,
st: this.scrollTop()
};
this._$dragTarget = null;
this._$body.find('.dragover').removeClass('dragover');
this._bindDragStartEvents();
},
_bindDragStartEvents: function () {
this._$body
.on('mousemove.drag', this._onBodyMouseMove.bind(this))
.on('mouseup.drag', this._onBodyMouseUp.bind(this))
.on('blur.drag', this._onBodyBlur.bind(this))
.on('mouseleave.drag', this._onBodyMouseLeave.bind(this));
},
_unbindDragStartEvents: function () {
this._$body
.off('mousemove.drag')
.off('mouseup.drag')
.off('blur.drag')
.off('mouseleave.drag');
},
_onBodyMouseMove: function (e) {
if (!this._$dragging) {
return;
}
let x = e.pageX - this._dragOffset.x;
let y = e.pageY - this._dragOffset.y + (this.scrollTop() - this._dragOffset.st);
let translate = `translate(${x}px, ${y}px)`;
if (x * x + y * y < 100) {
return;
}
this._$body.addClass('dragging');
this._$dragging
.addClass('dragging')
.css('transform', translate);
this._$body.find('.dragover').removeClass('dragover');
let $target = $(e.target).closest('.videoItem');
if ($target.length < 1) {
return;
}
this._$dragTarget = $target.addClass('dragover');
},
_onBodyMouseUp: function (e) {
this._unbindDragStartEvents();
let $dragging = this._$dragging;
this._endBodyMouseDragging();
if (!$dragging) {
return;
}
let $target = $(e.target).closest('.videoItem');
if ($target.length < 1) {
$target = this._$dragTarget;
}
if (!$target || $target.length < 1) {
return;
}
let srcId = $dragging.attr('data-item-id'), destId = $target.attr('data-item-id');
if (srcId === destId) {
return;
}
$dragging.css('opacity', 0);
$target.css('opacity', 0);
this.emit('moveItem', srcId, destId);
},
_onBodyBlur: function () {
this._endBodyMouseDragging();
},
_onBodyMouseLeave: function () {
this._endBodyMouseDragging();
},
_endBodyMouseDragging: function () {
this._unbindDragStartEvents();
this._$body.removeClass('dragging');
this._$dragTarget = null;
this._$body.find('.dragover').removeClass('dragover');
if (this._$dragging) {
this._$dragging.removeClass('dragging').css('transform', '');
}
this._$dragging = null;
},
_onBodyDragOverFile: function (e) {
e.preventDefault();
e.stopPropagation();
this._$body.addClass('drag-over');
},
_onBodyDragEnterFile: function (e) {
e.preventDefault();
e.stopPropagation();
this._$body.addClass('drag-over');
},
_onBodyDragLeaveFile: function (e) {
e.preventDefault();
e.stopPropagation();
this._$body.removeClass('drag-over');
},
_onBodyDropFile: function (e) {
e.preventDefault();
e.stopPropagation();
this._$body.removeClass('drag-over');
let file = e.originalEvent.dataTransfer.files[0];
if (!/\.playlist\.json$/.test(file.name)) {
return;
}
let fileReader = new FileReader();
fileReader.onload = ev => {
window.console.log('file data: ', ev.target.result);
this.emit('filedrop', ev.target.result, file.name);
};
fileReader.readAsText(file);
},
_onModelUpdate: function (itemList, replaceAll) {
const timeLabel = `update playlistView replaceAll=${!!replaceAll}`;
window.console.time(timeLabel);
this.addClass('is-updating');
itemList = Array.isArray(itemList) ? itemList : [itemList];
const itemViews = [];
itemList.forEach(item => {
let id = item.getItemId();
if (this._itemViewCache.has(id)) {
itemViews.push(this._itemViewCache.get(item));
} else {
const isLazy = this._enableLazyLoadImage;
const itemView = new this._ItemView({item, enableLazyLoadImage: isLazy});
this._itemViewCache.set(item, itemView);
itemViews.push(itemView);
}
});
this._updateCSSVars();
this._itemViews = itemViews;
if (itemViews.length < 1) {
this.removeClass('is-updating');
window.console.timeEnd(timeLabel);
return;
}
window.setTimeout(() => {
const f = document.createDocumentFragment();
f.append(...itemViews.map(i => i.getViewElement()));
if (this._list) {
this._list.textContent = '';
this._list.appendChild(f);
this._documentFragment = null;
this._setInviewObserver();
} else {
this._documentFragment = f;
}
this.removeClass('is-updating');
this.emit('update');
}, 0);
window.console.timeEnd(timeLabel);
},
_onModelItemRemove: function (item) {
const itemView = this._itemViewCache.get(item);
if (!itemView) {
return;
}
this._updateCSSVars();
itemView.remove();
this._itemViewCache.delete(item);
},
_setInviewObserver: function () {
if (!this._enableLazyLoadImage || !this._document) {
return;
}
if (this._intersectionObserver) {
this._intersectionObserver.disconnect();
}
let images = [...this._document.querySelectorAll('.lazy-load')];
if (!images.length) { return; }
let onInview = this._onImageInview_bind || this._onImageInview.bind(this);
let observer = this._intersectionObserver = new window.IntersectionObserver(onInview);
images.forEach(img => observer.observe(img));
},
_onImageInview: function (entries) {
const observer = this._intersectionObserver;
entries.filter(entry => entry.isIntersecting).forEach(entry => {
const thumbnail = entry.target;
const src = thumbnail.dataset.src;
thumbnail.classList.remove('lazy-load');
observer.unobserve(thumbnail);
if (!src) {
return;
}
thumbnail.style.backgroundImage = `url(${src})`;
thumbnail.style.backgroundColor = 'transparent';
});
},
_onModelItemUpdate: function (item, key, value) {
if (!this._$body) {
return;
}
const itemId = item.getItemId();
const itemView = this._itemViewCache.get(item);
if (!itemView) {
const newItemView = new this._ItemView({item});
this._itemViewCache.set(item, newItemView);
const itemViewElement = this._document.querySelector(`.videoItem.item${itemId}`);
this._list.insertBefore(
newItemView.getViewElement(), itemViewElement);
if (itemViewElement) {
this._document.body.removeChild(itemViewElement);
}
return;
}
if (['active', 'updating', 'played'].includes(key)) {
itemView.toggleClass(`is-${key}`, value);
if (key === 'active' && value) {
this._updateCSSVars();
if (!this._hasFocus) {
this.scrollToItem(itemId);
}
}
} else {
itemView.rebuild(item);
}
},
_updateCSSVars: function() {
if (this._document) {
let body = this._document.body;
body.style.setProperty('--list-length', this._model.length);
body.style.setProperty('--active-index', this._model.activeIndex);
}
},
_onClick: function (e) {
e.stopPropagation();
ZenzaWatch.emitter.emitAsync('hideHover');
let $target = $(e.target).closest('.command');
let $item = $(e.target).closest('.videoItem');
if ($target.length) {
e.stopPropagation();
e.preventDefault();
let command = $target.attr('data-command');
let param = $target.attr('data-param');
let itemId = $item.attr('data-item-id');
switch (command) {
case 'deflistAdd':
this.emit('deflistAdd', param, itemId);
break;
case 'playlistAppend':
this.emit('playlistAppend', param, itemId);
break;
case 'pocket-info':
window.setTimeout(() => {
this._pocket.external.info(param);
}, 100);
break;
case 'scrollToTop':
this.scrollTop(0, 300);
break;
case 'playlistRemove':
$item.remove();
this.emit('command', command, param, itemId);
break;
default:
this.emit('command', command, param, itemId);
}
}
},
addClass: function (className) {
this.toggleClass(className, true);
},
removeClass: function (className) {
this.toggleClass(className, false);
},
toggleClass: function (className, v) {
if (!this._$body) {
return;
}
this._$body.toggleClass(className, v);
},
scrollTop: function (v) {
if (!this._container) {
return 0;
}
if (typeof v === 'number') {
this._container.scrollTop = v;
} else {
return this._container.scrollTop;
}
},
scrollToItem: function (itemId) {
if (!this._$body) {
return;
}
if (_.isFunction(itemId.getItemId)) {
itemId = itemId.getItemId();
}
let $target = this._$body.find(`.item${itemId}`);
if (!$target.length) {
return;
}
$target[0].scrollIntoView({block: 'start', behavior: 'instant'});
}
});
class VideoListItem extends Emitter {
static createByThumbInfo(info) {
return new this({
_format: 'thumbInfo',
id: info.id,
title: info.title,
length_seconds: info.duration,
num_res: info.commentCount,
mylist_counter: info.mylistCount,
view_counter: info.viewCount,
thumbnail_url: info.thumbnail,
first_retrieve: info.postedAt,
tags: info.tagList,
movieType: info.movieType,
owner: info.owner,
lastResBody: info.lastResBody
});
}
static createBlankInfo(id) {
let postedAt = '0000/00/00 00:00:00';
if (!isNaN(id)) {
postedAt = util.dateToString(new Date(id * 1000));
}
return new this({
_format: 'blank',
id: id,
title: id + '(動画情報不明)',
length_seconds: 0,
num_res: 0,
mylist_counter: 0,
view_counter: 0,
thumbnail_url: 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank_s.jpg',
first_retrieve: postedAt,
});
}
static createByMylistItem(item) {
if (item.item_data) {
const item_data = item.item_data || {};
return new VideoListItem({
_format: 'mylistItemOldApi',
id: item_data.watch_id,
uniq_id: item_data.watch_id,
title: item_data.title,
length_seconds: item_data.length_seconds,
num_res: item_data.num_res,
mylist_counter: item_data.mylist_counter,
view_counter: item_data.view_counter,
thumbnail_url: item_data.thumbnail_url,
first_retrieve: util.dateToString(new Date(item_data.first_retrieve * 1000)),
videoId: item_data.video_id,
lastResBody: item_data.last_res_body,
mylistItemId: item.item_id,
item_type: item.item_type
});
}
// APIレスポンスの統一されてなさよ・・・
if (!item.length_seconds && typeof item.length === 'string') {
const [min, sec] = item.length.split(':');
item.length_seconds = min * 60 + sec * 1;
}
return new VideoListItem({
_format: 'mylistItemRiapi',
id: item.id,
uniq_id: item.id,
title: item.title,
length_seconds: item.length_seconds,
num_res: item.num_res,
mylist_counter: item.mylist_counter,
view_counter: item.view_counter,
thumbnail_url: item.thumbnail_url,
first_retrieve: item.first_retrieve,
lastResBody: item.last_res_body
});
}
static createByVideoInfoModel(info) {
const count = info.count;
return new VideoListItem({
_format: 'videoInfo',
id: info.watchId,
uniq_id: info.contextWatchId,
title: info.title,
length_seconds: info.duration,
num_res: count.comment,
mylist_counter: count.mylist,
view_counter: count.view,
thumbnail_url: info.thumbnail,
first_retrieve: info.postedAt,
owner: info.owner
});
}
constructor(rawData) {
super();
this._rawData = rawData;
this._itemId = VideoListItem._itemId++;
this.state = {
isActive: false,
lastActivated: rawData.last_activated || 0,
isUpdating: false,
isPlayed: !!rawData.played
};
this._uniq_id = rawData.uniqId || this.watchId;
rawData.first_retrieve = util.dateToString(rawData.first_retrieve);
this._sortTitle = util.convertKansuEi(this.getTitle())
.replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
}
get uniqId() {
return this._uniq_id;
}
get itemId() {
return this._itemId;
}
get watchId() {
return (this._getData('id', '') || '').toString();
}
get title() {
return this._getData('title', '');
}
get sortTitle() {
return this._sortTitle;
}
get duration() {
return parseInt(this._getData('length_seconds', '0'), 10);
}
get count() {
return {
comment: parseInt(this._rawData.num_res, 10),
mylist: parseInt(this._rawData.mylist_counter, 10),
view: parseInt(this._rawData.view_counter, 10)
};
}
get thumbnail() {
return this._rawData.thumbnail_url;
}
get postedAt() {
return this._rawData.first_retrieve;
}
equals(item) {
return this.uniqId === item.uniqId;
}
_getData(key, defValue) {
return this._rawData.hasOwnProperty(key) ?
this._rawData[key] : defValue;
}
getItemId() {
return this.itemId;
}
getWatchId() {
return this.watchId;
}
getTitle() {
return this.title;
}
getSortTitle() {
return this.sortTitle;
}
getDuration() {
return this.duration;
}
getCount() {
return this.count;
}
getCommentCount() {
return this.count.comment;
}
getMylistCount() {
return this.count.mylist;
}
getViewCount() {
return this.count.view;
}
getPostedAt() {
return this.postedAt;
}
get isActive() {
return this.state.isActive;
}
set isActive(v) {
v = !!v;
if (this.isActive !== v) {
this.state.isActive = v;
if (v) {
this.state.lastActivated = Date.now();
}
this.emit('update', this, 'active', v);
}
}
get isUpdating() {
return this.state.isUpdating;
}
set isUpdating(v) {
v = !!v;
if (this.isUpdating !== v) {
this.state.isUpdating = v;
this.emit('update', this, 'updating', v);
}
}
get isPlayed() {
return this.state.isPlayed;
}
set isPlayed(v) {
v = !!v;
if (this.isPlayed !== v) {
this.state.isPlayed = v;
this.emit('update', this, 'played', v);
}
}
get isBlankData() {
return this._rawData._format === 'blank';
}
serialize() {
return {
active: this.isActive,
last_activated: this.state.lastActivated || 0,
played: this.isPlayed,
uniq_id: this._uniq_id,
id: this._rawData.id,
title: this._rawData.title,
length_seconds: this._rawData.length_seconds,
num_res: this._rawData.num_res,
mylist_counter: this._rawData.mylist_counter,
view_counter: this._rawData.view_counter,
thumbnail_url: this._rawData.thumbnail_url,
first_retrieve: this._rawData.first_retrieve,
};
}
updateByVideoInfo(videoInfo) {
const before = JSON.stringify(this.serialize());
const rawData = this._rawData;
const count = videoInfo.count;
rawData.first_retrieve = util.dateToString(videoInfo.postedAt);
rawData.num_res = count.comment;
rawData.mylist_counter = count.mylist;
rawData.view_counter = count.view;
rawData.thumbnail_url = videoInfo.thumbnail;
if (JSON.stringify(this.serialize()) !== before) {
this.emit('update', this);
}
}
}
VideoListItem._itemId = 0;
class VideoList extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
_.assign(VideoList.prototype, {
initialize: function (params) {
this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
this._container = params.container;
this._model = new VideoListModel({
uniq: true,
maxItem: 100
});
this._initializeView();
},
_initializeView: function () {
if (this._view) {
return;
}
this._view = new VideoListView({
container: this._container,
model: this._model,
enablePocketWatch: true
});
this._view.on('command', this._onCommand.bind(this));
this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
this._view.on('playlistAppend', this._onPlaylistAppend.bind(this));
},
update: function (listData, watchId) {
if (!this._view) {
this._initializeView();
}
this._watchId = watchId;
const items = listData.filter(itemData => itemData.has_data)
.map(itemData => new VideoListItem(itemData));
if (items.length < 1) {
return;
}
this._view.insertItem(items);
},
_onCommand: function (command, param) {
if (command === 'select') {
const item = this._model.findByItemId(param);
const watchId = item.watchId;
this.emit('command', 'open', watchId);
return;
}
this.emit('command', command, param);
},
_onPlaylistAppend: function (watchId, itemId) {
this.emit('command', 'playlistAppend', watchId);
if (this._isUpdatingPlaylist) {
return;
}
let item = this._model.findByItemId(itemId);
const unlock = () => {
item.isUpdating = false;
this._isUpdatingPlaylist = false;
};
item.isUpdating = true;
this._isUpdatingPlaylist = true;
window.setTimeout(unlock, 1000);
},
_onDeflistAdd: function (watchId, itemId) {
if (this._isUpdatingDeflist) {
return;
}
let item = this._model.findByItemId(itemId);
const unlock = () => {
item.isUpdating = false;
this._isUpdatingDeflist = false;
};
item.isUpdating = true;
this._isUpdatingDeflist = true;
window.setTimeout(unlock, 1000);
this.emit('command', 'deflistAdd', watchId);
}
});
class RelatedVideoList extends VideoList {
constructor(...args) {
super(...args);
}
update(listData, watchId) {
if (!this._view) {
this._initializeView();
}
this._watchId = watchId;
let items = [];
listData.forEach(itemData => {
if (!itemData.id) {
return;
}
items.push(new VideoListItem(itemData));
});
if (!items.length) {
return;
}
this._model.insertItem(items);
this._view.scrollTop(0);
}
}
class PlaylistModel extends VideoListModel {
constructor(params) {
super(params);
}
initialize() {
this._maxItems = 10000;
this._items = [];
this._isUniq = true;
this._boundOnItemUpdate = this._onItemUpdate.bind(this);
}
}
class PlaylistView extends Emitter {
constructor(...args) {
super(...args);
this.initialize(...args);
}
initialize(params) {
this._container = params.container;
this._model = params.model;
this._playlist = params.playlist;
util.addStyle(PlaylistView.__css__);
let $view = this._$view = $(PlaylistView.__tpl__);
this._container.appendChild($view[0]);
this._$index = $view.find('.playlist-index');
this._$length = $view.find('.playlist-length');
let $menu = this._$menu = this._$view.find('.playlist-menu');
let $fileDrop = this._$fileDrop = $view.find('.playlist-file-drop');
let $fileSelect = $view.find('.playlist-import-file-select');
ZenzaWatch.debug.playlistView = this._$view;
let listView = this._listView = new VideoListView({
container: this._$view.find('.playlist-frame')[0],
model: this._model,
className: 'playlist',
dragdrop: true,
dropfile: true,
enablePocketWatch: false
});
listView.on('command', this._onCommand.bind(this));
listView.on('deflistAdd', this._onDeflistAdd.bind(this));
listView.on('moveItem', (src, dest) => this.emit('moveItem', src, dest));
listView.on('filedrop', data => this.emit('command', 'importFile', data));
this._playlist.on('update',
_.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
this._$view.on('click', '.playlist-command', this._onPlaylistCommandClick.bind(this));
ZenzaWatch.emitter.on('hideHover', () => {
$menu.removeClass('show');
$fileDrop.removeClass('show');
});
$('.zenzaVideoPlayerDialog')
.on('dragover', this._onDragOverFile.bind(this))
.on('dragenter', this._onDragEnterFile.bind(this))
.on('dragleave', this._onDragLeaveFile.bind(this))
.on('drop', this._onDropFile.bind(this));
$fileSelect.on('change', this._onImportFileSelect.bind(this));
['addClass',
'removeClass',
'scrollTop',
'scrollToItem',
].forEach(func => this[func] = listView[func].bind(listView));
}
toggleClass(className, v) {
this._view.toggleClass(className, v);
this._$view.toggleClass(className, v);
}
_onCommand(command, param, itemId) {
switch (command) {
default:
this.emit('command', command, param, itemId);
break;
}
}
_onDeflistAdd(watchId, itemId) {
this.emit('deflistAdd', watchId, itemId);
}
_onPlaylistCommandClick(e) {
let $target = $(e.target).closest('.playlist-command');
let command = $target.attr('data-command');
let param = $target.attr('data-param');
e.stopPropagation();
if (!command) {
return;
}
switch (command) {
case 'importFileMenu':
this._$menu.removeClass('show');
this._$fileDrop.addClass('show');
return;
case 'toggleMenu':
e.stopPropagation();
e.preventDefault();
this._$menu.addClass('show');
return;
case 'shuffle':
case 'sortBy':
this._$view.addClass('shuffle');
window.setTimeout(() => this._$view.removeClass('shuffle'), 1000);
this.emit('command', command, param);
break;
default:
this.emit('command', command, param);
}
ZenzaWatch.emitter.emitAsync('hideHover');
}
_onPlaylistStatusUpdate() {
let playlist = this._playlist;
this._$view
.toggleClass('enable', playlist.isEnable)
.toggleClass('loop', playlist.isLoop)
;
this._$index.text(playlist.getIndex() + 1);
this._$length.text(playlist.length);
}
_onDragOverFile(e) {
e.preventDefault();
e.stopPropagation();
this._$fileDrop.addClass('drag-over');
}
_onDragEnterFile(e) {
e.preventDefault();
e.stopPropagation();
this._$fileDrop.addClass('drag-over');
}
_onDragLeaveFile(e) {
e.preventDefault();
e.stopPropagation();
this._$fileDrop.removeClass('drag-over');
}
_onDropFile(e) {
e.preventDefault();
e.stopPropagation();
this._$fileDrop.removeClass('show drag-over');
let file = e.originalEvent.dataTransfer.files[0];
if (!/\.playlist\.json$/.test(file.name)) {
return;
}
let fileReader = new FileReader();
fileReader.onload = ev => {
window.console.log('file data: ', ev.target.result);
this.emit('command', 'importFile', ev.target.result);
};
fileReader.readAsText(file);
}
_onImportFileSelect(e) {
e.preventDefault();
let file = e.originalEvent.target.files[0];
if (!/\.playlist\.json$/.test(file.name)) {
return;
}
let fileReader = new FileReader();
fileReader.onload = ev => {
window.console.log('file data: ', ev.target.result);
this.emit('command', 'importFile', ev.target.result);
};
fileReader.readAsText(file);
}
get hasFocus() {
return this._listView.hasFocus;
}
}
PlaylistView.__css__ = (`
.is-playlistEnable .tabSelect.playlist::after {
content: '▶';
color: #fff;
text-shadow: 0 0 8px orange;
}
.zenzaScreenMode_sideView .is-playlistEnable .is-notFullscreen .tabSelect.playlist::after {
text-shadow: 0 0 8px #336;
}
.playlist-container {
height: 100%;
overflow: hidden;
user-select: none;
}
.playlist-header {
height: 32px;
border-bottom: 1px solid #000;
background: #333;
color: #ccc;
user-select: none;
}
.playlist-menu-button {
display: inline-block;
cursor: pointer;
border: 1px solid #333;
padding: 0px 4px;
margin: 0 0 0 4px;
background: #666;
font-size: 16px;
line-height: 28px;
white-space: nowrap;
}
.playlist-menu-button:hover {
border: 1px outset;
}
.playlist-menu-button:active {
border: 1px inset;
}
.playlist-menu-button .playlist-menu-icon {
font-size: 24px;
line-height: 28px;
}
.playlist-container.enable .toggleEnable,
.playlist-container.loop .toggleLoop {
text-shadow: 0 0 6px #f99;
color: #ff9;
}
.playlist-container .toggleLoop icon {
font-family: STIXGeneral;
}
.playlist-container .shuffle {
font-size: 14px;
}
.playlist-container .shuffle::after {
content: '(´・ω・｀)';
}
.playlist-container .shuffle:hover::after {
content: '(｀・ω・´)';
}
.playlist-frame {
height: calc(100% - 32px);
transition: opacity 0.3s;
}
.shuffle .playlist-frame {
opacity: 0;
}
.playlist-count {
position: absolute;
top: 0;
right: 8px;
display: inline-block;
font-size: 14px;
line-height: 32px;
cursor: pointer;
}
.playlist-count:before {
content: '▼';
}
.playlist-count:hover {
text-decoration: underline;
}
.playlist-menu {
position: absolute;
right: 0px;
top: 24px;
min-width: 150px;
background: #333 !important;
}
.playlist-menu li {
line-height: 20px;
border: none !important;
}
.playlist-menu .separator {
border: 1px inset;
border-radius: 3px;
margin: 8px 8px;
}
.playlist-file-drop {
display: none;
position: absolute;
width: 94%;
height: 94%;
top: 3%;
left: 3%;
background: #000;
color: #ccc;
opacity: 0.8;
border: 2px solid #ccc;
box-shadow: 0 0 4px #fff;
padding: 16px;
z-index: 100;
}
.playlist-file-drop.show {
opacity: 0.98 !important;
}
.playlist-file-drop.drag-over {
box-shadow: 0 0 8px #fe9;
background: #030;
}
.playlist-file-drop * {
pointer-events: none;
}
.playlist-file-drop-inner {
padding: 8px;
height: 100%;
border: 1px dotted #888;
}
.playlist-import-file-select {
position: absolute;
text-indent: -9999px;
width: 100%;
height: 20px;
opacity: 0;
cursor: pointer;
}
`).trim();
PlaylistView.__tpl__ = (`
<div class="playlist-container">
<div class="playlist-header">
<label class="playlist-menu-button toggleEnable playlist-command"
data-command="toggleEnable"><icon class="playlist-menu-icon">▶</icon> 連続再生</label>
<label class="playlist-menu-button toggleLoop playlist-command"
data-command="toggleLoop"><icon class="playlist-menu-icon">&#8635;</icon> リピート</label>
<div class="playlist-count playlist-command" data-command="toggleMenu">
<span class="playlist-index">---</span> / <span class="playlist-length">---</span>
<div class="zenzaPopupMenu playlist-menu">
<div class="listInner">
<ul>
<li class="playlist-command" data-command="shuffle">
シャッフル
</li>
<li class="playlist-command" data-command="sortBy" data-param="postedAt">
古い順に並べる
</li>
<li class="playlist-command" data-command="sortBy" data-param="view:desc">
再生の多い順に並べる
</li>
<li class="playlist-command" data-command="sortBy" data-param="comment:desc">
コメントの多い順に並べる
</li>
<li class="playlist-command" data-command="sortBy" data-param="title">
タイトル順に並べる
</li>
<li class="playlist-command" data-command="sortBy" data-param="duration:desc">
動画の長い順に並べる
</li>
<li class="playlist-command" data-command="sortBy" data-param="duration">
動画の短い順に並べる
</li>
<hr class="separator">
<li class="playlist-command" data-command="exportFile">ファイルに保存 &#x1F4BE;</li>
<li class="playlist-command" data-command="importFileMenu">
<input type="file" class="playlist-import-file-select" accept=".json">
ファイルから読み込む
</li>
<hr class="separator">
<li class="playlist-command" data-command="resetPlayedItemFlag">すべて未視聴にする</li>
<li class="playlist-command" data-command="removePlayedItem">視聴済み動画を消す ●</li>
<li class="playlist-command" data-command="removeNonActiveItem">リストの消去 ×</li>
</ul>
</div>
</div>
</div>
</div>
<div class="playlist-frame"></div>
<div class="playlist-file-drop">
<div class="playlist-file-drop-inner">
ファイルをここにドロップ
</div>
</div>
</div>
`).trim();
_.assign(PlaylistView.prototype, {
});
const PlaylistSession = (storage => {
const KEY = 'ZenzaWatchPlaylist';
let lastJson = '';
return {
isExist: function () {
let data = storage.getItem(KEY);
if (!data) {
return false;
}
try {
JSON.parse(data);
return true;
} catch (e) {
return false;
}
},
save: function (data) {
const json = JSON.stringify(data);
if (lastJson === json) { return; }
lastJson = json;
try {
storage.setItem(KEY, json);
} catch(e) {
window.console.error(e);
if (e.name === 'QuotaExceededError' ||
e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
storage.clear();
storage.setItem(KEY, json);
}
}
},
restore: function () {
let data = storage.getItem(KEY);
if (!data) {
return null;
}
try {
lastJson = data;
return JSON.parse(data);
} catch (e) {
return null;
}
}
};
})(sessionStorage);
class Playlist extends VideoList {
constructor(...args) {
super(...args);
}
initialize(params) {
this._thumbInfoLoader = params.loader || ZenzaWatch.api.ThumbInfoLoader;
this._container = params.container;
this._index = -1;
this._isEnable = false;
this._isLoop = params.loop;
this._model = new PlaylistModel({});
ZenzaWatch.debug.playlist = this;
this.on('update', _.debounce(() => PlaylistSession.save(this.serialize()), 3000));
}
serialize() {
return {
items: this._model.serialize(),
index: this._index,
enable: this._isEnable,
loop: this._isLoop
};
}
unserialize(data) {
if (!data) {
return;
}
this._initializeView();
console.log('unserialize: ', data);
this._model.unserialize(data.items);
this._isEnable = data.enable;
this._isLoop = data.loop;
this.emit('update');
this.setIndex(data.index);
}
restoreFromSession() {
this.unserialize(PlaylistSession.restore());
}
_initializeView() {
if (this._view) {
return;
}
this._view = new PlaylistView({
container: this._container,
model: this._model,
playlist: this
});
this._view.on('command', this._onCommand.bind(this));
this._view.on('deflistAdd', this._onDeflistAdd.bind(this));
this._view.on('moveItem', this._onMoveItem.bind(this));
}
_onCommand(command, param, itemId) {
let item;
switch (command) {
case 'toggleEnable':
this.toggleEnable();
break;
case 'toggleLoop':
this.toggleLoop();
break;
case 'shuffle':
this.shuffle();
break;
case 'sortBy': {
let [key, order] = param.split(':');
this.sortBy(key, order === 'desc');
break;
}
case 'clear':
this._setItemData([]);
break;
case 'select':
item = this._model.findByItemId(itemId);
this.setIndex(this._model.indexOf(item));
this.emit('command', 'openNow', item.watchId);
break;
case 'playlistRemove':
item = this._model.findByItemId(itemId);
this._model.removeItem(item);
this._refreshIndex();
this.emit('update');
break;
case 'removePlayedItem':
this.removePlayedItem();
break;
case 'resetPlayedItemFlag':
this._model.resetPlayedItemFlag();
break;
case 'removeNonActiveItem':
this.removeNonActiveItem();
break;
case 'exportFile':
this._onExportFileCommand();
break;
case 'importFile':
this._onImportFileCommand(param);
break;
case 'scrollToActiveItem':
this.scrollToActiveItem(true);
break;
default:
this.emit('command', command, param);
}
}
_onExportFileCommand() {
let dt = new Date();
let title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます',
util.dateToString(dt) + 'のプレイリスト');
if (!title) {
return;
}
let data = JSON.stringify(this.serialize(), null, 2);
let blob = new Blob([data], {'type': 'text/html'});
let url = window.URL.createObjectURL(blob);
let a = document.createElement('a');
a.setAttribute('download', title + '.playlist.json');
a.setAttribute('rel', 'noopener');
a.setAttribute('href', url);
document.body.appendChild(a);
a.click();
setTimeout(() => a.remove(), 1000);
}
_onImportFileCommand(fileData) {
if (!util.isValidJson(fileData)) {
return;
}
this.emit('command', 'pause');
this.emit('command', 'notify', 'プレイリストを復元');
this.unserialize(JSON.parse(fileData));
window.setTimeout(() => {
let index = Math.max(0, fileData.index || 0);
let item = this._model.getItemByIndex(index);
if (item) {
this.setIndex(index, true);
this.emit('command', 'openNow', item.watchId);
}
}, 2000);
}
_onMoveItem(srcItemId, destItemId) {
let srcItem = this._model.findByItemId(srcItemId);
let destItem = this._model.findByItemId(destItemId);
if (!srcItem || !destItem) {
return;
}
let destIndex = this._model.indexOf(destItem);
this._model.removeItem(srcItem);
this._model.insertItem(srcItem, destIndex);
this._refreshIndex();
}
_setItemData(listData) {
const items = listData.map(itemData => new VideoListItem(itemData));
this._model.setItem(items);
this.setIndex(items.length > 0 ? 0 : -1);
}
_replaceAll(videoListItems, options) {
options = options || {};
this._model.setItem(videoListItems);
const item = this._model.findByWatchId(options.watchId);
if (item) {
item.isActive = true;
item.isPlayed = true;
this._activeItem = item;
setTimeout(() => this._view.scrollToItem(item), 1000);
}
this.setIndex(this._model.indexOf(item));
}
_appendAll(videoListItems, options) {
options = options || {};
this._model.appendItem(videoListItems);
const item = this._model.findByWatchId(options.watchId);
if (item) {
item.isActive = true;
item.isPlayed = true;
this._refreshIndex(false);
}
setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
}
_insertAll(videoListItems, options) {
options = options || {};
this._model.insertItem(
videoListItems, //.filter(item => item.watchId !== this._activeItem.watchId),
this.getIndex() + 1);
const item = this._model.findByWatchId(options.watchId);
if (item) {
item.isActive = true;
item.isPlayed = true;
this._refreshIndex(false);
}
setTimeout(() => this._view.scrollToItem(videoListItems[0]), 1000);
}
loadFromMylist(mylistId, options) {
this._initializeView();
if (!this._mylistApiLoader) {
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
}
window.console.time('loadMylist: ' + mylistId);
return this._mylistApiLoader
.getMylistItems(mylistId, options).then(items => {
window.console.timeEnd('loadMylist: ' + mylistId);
let videoListItems = items.filter(item => {
// マイリストはitem_typeがint
// とりまいはitem_typeがstringっていうね
if (item.id === null) {
return;
} // ごく稀にある？idが抹消されたレコード
if (item.item_data) {
if (parseInt(item.item_type, 10) !== 0) {
return;
} // not video
if (parseInt(item.item_data.deleted, 10) !== 0) {
return;
} // 削除動画を除外
} else {
if (item.thumbnail_url && item.thumbnail_url.indexOf('video_deleted') >= 0) {
return;
}
}
return true;
}).map(item => VideoListItem.createByMylistItem(item));
if (videoListItems.length < 1) {
return Promise.reject({
status: 'fail',
message: 'マイリストの取得に失敗しました'
});
}
if (options.shuffle) {
videoListItems = _.shuffle(videoListItems);
}
if (options.insert) {
this._insertAll(videoListItems, options);
} else if (options.append) {
this._appendAll(videoListItems, options);
} else {
this._replaceAll(videoListItems, options);
}
this.emit('update');
return Promise.resolve({
status: 'ok',
message:
options.append ?
'マイリストの内容をプレイリストに追加しました' :
'マイリストの内容をプレイリストに読み込みしました'
});
});
}
loadUploadedVideo(userId, options) {
this._initializeView();
if (!this._uploadedVideoApiLoader) {
this._uploadedVideoApiLoader = new ZenzaWatch.api.UploadedVideoApiLoader();
}
window.console.time('loadUploadedVideos' + userId);
return this._uploadedVideoApiLoader
.getUploadedVideos(userId, options).then(items => {
window.console.timeEnd('loadUploadedVideos' + userId);
let videoListItems = items.filter(item => {
return (item.item_data &&
parseInt(item.item_type, 10) === 0 && // video 以外を除外
parseInt(item.item_data.deleted, 10) === 0) ||
(item.thumbnail_url || '').indexOf('video_deleted') < 0;
}).map(item => VideoListItem.createByMylistItem(item));
if (videoListItems.length < 1) {
return Promise.reject({});
}
// 投稿動画一覧は新しい順に渡されるので、プレイリストではreverse＝古い順にする
videoListItems.reverse();
if (options.shuffle) {
videoListItems = _.shuffle(videoListItems);
}
if (options.insert) {
this._insertAll(videoListItems, options);
} else if (options.append) {
this._appendAll(videoListItems, options);
} else {
this._replaceAll(videoListItems, options);
}
this.emit('update');
return Promise.resolve({
status: 'ok',
message:
options.append ?
'投稿動画一覧をプレイリストに追加しました' :
'投稿動画一覧をプレイリストに読み込みしました'
});
});
}
loadSearchVideo(word, options, limit = 300) {
this._initializeView();
if (!this._searchApiLoader) {
this._nicoSearchApiLoader = NicoSearchApiV2Loader;
}
window.console.time('loadSearchVideos' + word);
options = options || {};
return this._nicoSearchApiLoader
.searchMore(word, options, limit).then(result => {
window.console.timeEnd('loadSearchVideos' + word);
let items = result.list || [];
let videoListItems = items
.filter(item => {
return (item.item_data &&
parseInt(item.item_type, 10) === 0 && // video 以外を除外
parseInt(item.item_data.deleted, 10) === 0) ||
(item.thumbnail_url || '').indexOf('video_deleted') < 0;
}).map(item => VideoListItem.createByMylistItem(item));
if (videoListItems.length < 1) {
return Promise.reject({});
}
if (options.playlistSort) {
// 連続再生のために結果を古い順に並べる
// 検索対象のソート順とは別
videoListItems = _.sortBy(
videoListItems, item => item.postedAt + item.sortTitle);
}
if (options.shuffle) {
videoListItems = _.shuffle(videoListItems);
}
if (options.insert) {
this._insertAll(videoListItems, options);
} else if (options.append) {
this._appendAll(videoListItems, options);
} else {
this._replaceAll(videoListItems, options);
}
this.emit('update');
return Promise.resolve({
status: 'ok',
message:
options.append ?
'検索結果をプレイリストに追加しました' :
'検索結果をプレイリストに読み込みしました'
});
});
}
insert(watchId) {
this._initializeView();
if (this._activeItem && this._activeItem.watchId === watchId) {
return Promise.resolve();
}
const model = this._model;
const index = this._index;
return this._thumbInfoLoader.load(watchId).then(info => {
// APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
// チャンネル動画はsoXXXXに統一したいのでvideoIdを使う. バッドノウハウ
info.id = info.isChannel ? info.id : watchId;
const item = VideoListItem.createByThumbInfo(info);
model.insertItem(item, index + 1);
this._refreshIndex(true);
this.emit('update');
this.emit('command', 'notifyHtml',
`次に再生: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
);
}).catch(result => {
const item = VideoListItem.createBlankInfo(watchId);
model.insertItem(item, index + 1);
this._refreshIndex(true);
this.emit('update');
window.console.error(result);
this.emit('command', 'alert', `動画情報の取得に失敗: ${watchId}`);
});
}
insertCurrentVideo(videoInfo) {
this._initializeView();
if (this._activeItem &&
!this._activeItem.isBlankData &&
this._activeItem.watchId === videoInfo.watchId) {
this._activeItem.updateByVideoInfo(videoInfo);
this._activeItem.isPlayed = true;
this.scrollToActiveItem();
return;
}
let currentItem = this._model.findByWatchId(videoInfo.watchId);
if (currentItem && !currentItem.isBlankData) {
currentItem.updateByVideoInfo(videoInfo);
currentItem.isPlayed = true;
this.setIndex(this._model.indexOf(currentItem));
this.scrollToActiveItem();
return;
}
const item = VideoListItem.createByVideoInfoModel(videoInfo);
item.isPlayed = true;
if (this._activeItem) {
this._activeItem.isActive = false;
}
this._model.insertItem(item, this._index + 1);
this._activeItem = this._model.findByItemId(item.getItemId());
this._refreshIndex(true);
}
removeItemByWatchId(watchId) {
const item = this._model.findByWatchId(watchId);
if (!item || item.isActive) {
return;
}
this._model.removeItem(item);
this._refreshIndex(true);
}
append(watchId) {
this._initializeView();
if (this._activeItem && this._activeItem.watchId === watchId) {
return Promise.resolve();
}
const model = this._model;
return this._thumbInfoLoader.load(watchId).then(info => {
// APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
info.id = watchId;
const item = VideoListItem.createByThumbInfo(info);
//window.console.info(item, info);
model.appendItem(item);
this._refreshIndex();
this.emit('update');
this.emit('command', 'notifyHtml',
`リストの末尾に追加: <img src="${item.thumbnail}" style="width: 96px;">${util.escapeToZenkaku(item.title)}`
);
}).catch(result => {
const item = VideoListItem.createBlankInfo(watchId);
model.appendItem(item);
this._refreshIndex(true);
this._refreshIndex();
window.console.error(result);
this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
});
}
getIndex() {
return this._activeItem ? this._index : -1;
}
setIndex(v, force) {
v = parseInt(v, 10);
if (this._index !== v || force) {
this._index = v;
if (this._activeItem) {
this._activeItem.isActive = false;
}
this._activeItem = this._model.getItemByIndex(v);
if (this._activeItem) {
this._activeItem.isActive = true;
}
this.emit('update');
}
}
_refreshIndex(scrollToActive) {
this.setIndex(this._model.indexOf(this._activeItem), true);
if (scrollToActive) {
setTimeout(() => this.scrollToActiveItem(true), 1000);
}
}
_setIndexByItemId(itemId) {
const item = this._model.findByItemId(itemId);
if (item) {
this._setIndexByItem(item);
}
}
_setIndexByItem(item) {
const index = this._model.indexOf(item);
if (index >= 0) {
this.setIndex(index);
}
}
toggleEnable(v) {
if (!_.isBoolean(v)) {
this._isEnable = !this._isEnable;
this.emit('update');
return;
}
if (this._isEnable !== v) {
this._isEnable = v;
this.emit('update');
}
}
toggleLoop() {
this._isLoop = !this._isLoop;
this.emit('update');
}
shuffle() {
this._model.shuffle();
if (this._activeItem) {
this._model.removeItem(this._activeItem);
this._model.insertItem(this._activeItem, 0);
this.setIndex(0);
} else {
this.setIndex(-1);
}
this._view.scrollTop(0);
}
sortBy(key, isDesc) {
this._model.sortBy(key, isDesc);
this._refreshIndex(true);
setTimeout(() => {
this._view.scrollToItem(this._activeItem);
}, 1000);
}
removePlayedItem() {
this._model.removePlayedItem();
this._refreshIndex(true);
setTimeout(() => {
this._view.scrollToItem(this._activeItem);
}, 1000);
}
removeNonActiveItem() {
this._model.removeNonActiveItem();
this._refreshIndex(true);
this.toggleEnable(false);
}
selectNext() {
if (!this.hasNext) {
return null;
}
let index = this.getIndex();
let len = this.length;
if (len < 1) {
return null;
}
if (index < -1) {
this.setIndex(0);
} else if (index + 1 < len) {
this.setIndex(index + 1);
} else if (this.isLoop) {
this.setIndex((index + 1) % len);
}
return this._activeItem ? this._activeItem.watchId : null;
}
selectPrevious() {
let index = this.getIndex();
let len = this.length;
if (len < 1) {
return null;
}
if (index < -1) {
this.setIndex(0);
} else if (index > 0) {
this.setIndex(index - 1);
} else if (this.isLoop) {
this.setIndex((index + len - 1) % len);
} else {
return null;
}
return this._activeItem ? this._activeItem.watchId : null;
}
scrollToActiveItem(force) {
if (this._activeItem && (force || !this._view.hasFocus)) {
this._view.scrollToItem(this._activeItem, force);
}
}
scrollToWatchId(watchId) {
const item = this._model.findByWatchId(watchId);
if (item) {
this._view.scrollToItem(item);
}
}
findByWatchId(watchId) {
return this._model.findByWatchId(watchId);
}
get isEnable() {
return this._isEnable;
}
get isLoop() {
return this._isLoop;
}
get length() {
return this._model.length;
}
get hasNext() {
const len = this.length;
return len > 0 && (this.isLoop || this._index < len - 1);
}
}

const VideoSession = (() => {
const SMILE_HEART_BEAT_INTERVAL_MS = 10 * 60 * 1000; // 10min
const DMC_HEART_BEAT_INTERVAL_MS = 30 * 1000; // 30sec
const CHECK_PAUSE_INTERVAL = 30 * 1000;
const SESSION_CLOSE_PAUSE_COUNT = 10;
const SESSION_CLOSE_FAIL_COUNT = 3;
const SESSION_CLOSE_TIME_MS = 60 * 60 * 60 * 1000;
const VIDEO_QUALITY = {
auto: /.*/,
veryhigh: /_(1080p)$/,
high: /_(720p)$/,
mid: /_(540p|480p)$/,
low: /_(360p)$/
};
class DmcPostData {
constructor(dmcInfo, videoQuality, {useHLS = true, useSSL = false, useWellKnownPort = false}) {
this._dmcInfo = dmcInfo;
this._videoQuality = videoQuality || 'auto';
this._useHLS = useHLS;
this._useSSL = useSSL;
this._useWellKnownPort = true; //useWellKnownPort;
}
toString() {
let dmcInfo = this._dmcInfo;
let videos = [];
let availableVideos =
dmcInfo.quality.videos.filter(v => v.available)
.sort((a, b) => b.level_index - a.level_index);
let reg = VIDEO_QUALITY[this._videoQuality] || VIDEO_QUALITY.auto;
if (reg === VIDEO_QUALITY.auto) {
videos = availableVideos.map(v => v.id);
} else {
availableVideos.forEach(format => {
if (reg.test(format.id)) {
videos.push(format.id);
}
});
if (videos.length < 1) {
videos[0] = availableVideos[0].id;
}
}
let audios = [dmcInfo.audios[0]];
let contentSrcIdSets =
(this._useHLS && reg === VIDEO_QUALITY.auto) ?
this._buildAbrContentSrcIdSets(videos, audios) :
this._buildContentSrcIdSets(videos, audios);
let http_parameters = {};
let parameters = {
use_ssl: this._useSSL ? 'yes' : 'no',
use_well_known_port: this._useWellKnownPort ? 'yes' : 'no',
transfer_preset: dmcInfo.transferPreset
};
if (this._useHLS) {
parameters.segment_duration = Config.getValue('video.hls.segmentDuration');
if (dmcInfo.encryption){
parameters.encryption = dmcInfo.encryption;
}
}
http_parameters.parameters = this._useHLS ?
{hls_parameters: parameters} :
{http_output_download_parameters: parameters};
let request = {
session: {
client_info: {
player_id: dmcInfo.playerId
},
content_auth: {
auth_type: dmcInfo.authTypes[this._useHLS ? 'hls' : 'http'] || 'ht2',
content_key_timeout: 600 * 1000,
service_id: 'nicovideo',
service_user_id: dmcInfo.serviceUserId,
//max_content_count: 10,
},
content_id: dmcInfo.contentId,
content_src_id_sets: contentSrcIdSets,
content_type: 'movie',
content_uri: '',
keep_method: {
heartbeat: {lifetime: dmcInfo.heartBeatLifeTimeMs}
},
priority: dmcInfo.priority,
protocol: {
name: 'http',
parameters: {http_parameters}
},
recipe_id: dmcInfo.recipeId,
session_operation_auth: {
session_operation_auth_by_signature: {
signature: dmcInfo.signature,
token: dmcInfo.token
}
},
timing_constraint: 'unlimited'
}
};
return JSON.stringify(request, null, 2);
}
_buildContentSrcIdSets(videos, audios) {
return [
{
content_src_ids: [
{
src_id_to_mux: {
audio_src_ids: audios,
video_src_ids: videos
}
}
]
}
];
}
_buildAbrContentSrcIdSets(videos, audios) {
const v = videos.concat();
const contentSrcIds = [];
while (v.length > 0) {
contentSrcIds.push({
src_id_to_mux: {
audio_src_ids: [audios[0]],
video_src_ids: v.concat()
}
});
v.shift();
}
return [{content_src_ids: contentSrcIds}];
}
}
class VideoSession {
static createInstance(params) {
if (params.serverType === 'dmc') {
return new DmcSession(params);
} else {
return new SmileSession(params);
}
}
constructor(params) {
this._videoInfo = params.videoInfo;
this._videoWatchOptions = params.videoWatchOptions;
this._isPlaying = params.isPlayingCallback || (() => {
});
this._pauseCount = 0;
this._failCount = 0;
this._lastResponse = '';
this._videoQuality = params.videoQuality || 'auto';
this._videoSessionInfo = {};
this._isDeleted = false;
this._isAbnormallyClosed = false;
this._heartBeatTimer = null;
this._useSSL = !!params.useSSL;
this._useWellKnownPort = true;
this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
}
connect() {
this._createdAt = Date.now();
return this._createSession(this._videoInfo);
}
enableHeartBeat() {
this.disableHeartBeat();
this._heartBeatTimer =
setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
this._pauseCheckTimer =
setInterval(this._onPauseCheckInterval.bind(this), CHECK_PAUSE_INTERVAL);
}
changeHeartBeatInterval(interval) {
if (this._heartBeatTimer) {
clearInterval(this._heartBeatTimer);
}
this._heartBeatInterval = interval;
this._heartBeatTimer =
setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
}
disableHeartBeat() {
if (this._heartBeatTimer) {
clearInterval(this._heartBeatTimer);
}
if (this._pauseCheckTimer) {
clearInterval(this._pauseCheckTimer);
}
this._heartBeatTimer = this._pauseCheckTimer = null;
}
_onHeartBeatInterval() {
if (this._isClosed) {
return;
}
this._heartBeat();
}
_onHeartBeatSuccess(/* result */) {
//console.log('HeartBeat success');
}
_onHeartBeatFail() {
this._failCount++;
if (this._failCount >= SESSION_CLOSE_FAIL_COUNT) {
this._isAbnormallyClosed = true;
this.close();
}
}
_onPauseCheckInterval() {
if (this._isClosed) {
return;
}
let isPlaying = this._isPlaying();
if (!isPlaying) {
this._pauseCount++;
} else {
this._pauseCount = 0;
}
// 一定時間停止が続いた and 生成から一定時間経過している場合は破棄
if (this._pauseCount >= SESSION_CLOSE_PAUSE_COUNT &&
Date.now() - this._createdAt >= SESSION_CLOSE_TIME_MS) {
//PopupMessage.debug('VideoSession closed.');
this.close();
}
}
close() {
this._isClosed = true;
this.disableHeartBeat();
return this._deleteSession();
}
get isDeleted() {
return !!this._isDeleted;
}
get isDmc() {
return this._serverType === 'dmc';
}
get isAbnormallyClosed() {
return this._isAbnormallyClosed;
}
}
class DmcSession extends VideoSession {
constructor(params) {
super(params);
this._serverType = 'dmc';
this._heartBeatInterval = DMC_HEART_BEAT_INTERVAL_MS;
this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
this._useHLS = typeof params.useHLS === 'boolean' ? params.useHLS : true;
this._lastUpdate = Date.now();
this._heartbeatLifeTime = this._heartbeatInterval;
}
_createSession(videoInfo) {
let dmcInfo = videoInfo.dmcInfo;
console.time('create DMC session');
const baseUrl = (dmcInfo.urls.find(url => url.is_well_known_port === this._useWellKnownPort) || dmcInfo.urls[0]).url;
return new Promise((resolve, reject) => {
let url = `${baseUrl}?_format=json`;
this._heartbeatLifeTime = dmcInfo.heartbeatLifeTime;
const postData = new DmcPostData(dmcInfo, this._videoQuality, {
useHLS: this.useHLS,
useSSL: url.startsWith('https://'),
useWellKnownPort: true
});
//console.log('dmc post', url); console.log(postData.toString());
util.fetch(url, {
method: 'post',
timeout: 10000,
dataType: 'text',
body: postData.toString()
}).then(res => {
return res.json();
})
.then(json => {
const data = json.data || {}, session = data.session || {};
let url = session.content_uri;
let sessionId = session.id;
let content_src_id_sets = session.content_src_id_sets;
let videoFormat =
content_src_id_sets[0].content_src_ids[0].src_id_to_mux.video_src_ids[0];
let audioFormat =
content_src_id_sets[0].content_src_ids[0].src_id_to_mux.audio_src_ids[0];
this._heartBeatUrl =
`${baseUrl}/${sessionId}?_format=json&_method=PUT`;
this._deleteSessionUrl =
`${baseUrl}/${sessionId}?_format=json&_method=DELETE`;
this._lastResponse = data;
this._lastUpdate = Date.now();
this._videoSessionInfo = {
type: 'dmc',
url: url,
sessionId: sessionId,
videoFormat: videoFormat,
audioFormat: audioFormat,
heartBeatUrl: this._heartBeatUrl,
deleteSessionUrl: this._deleteSessionUrl,
lastResponse: json
};
this.enableHeartBeat();
console.timeEnd('create DMC session');
resolve(this._videoSessionInfo);
}).catch(err => {
console.error('create api fail', err);
reject(err);
});
});
}
get useHLS() {
return this._useHLS &&
this._videoInfo.dmcInfo.protocols.includes('hls');
}
_heartBeat() {
let url = this._videoSessionInfo.heartBeatUrl;
util.fetch(url, {
method: 'post',
dataType: 'text',
timeout: 10000,
body: JSON.stringify(this._lastResponse)
}).then(res => {
return res.json();
})
.then(this._onHeartBeatSuccess)
.catch(this._onHeartBeatFail);
}
_deleteSession() {
if (this._isDeleted) {
return Promise.resolve();
}
this._isDeleted = true;
let url = this._videoSessionInfo.deleteSessionUrl;
// video側はsessionの概念を持たないため、動画クローズと同時にsessionを消すと、
// たまに微妙な時間差でvideoにネットワークエラーが出る。
// その緩和のため、フラグ上はdeletedを立てるけど実際のdeleteは遅延させる
//
// こっちからdeleteしなくてもいずれsessionは勝手に消えるので、
// 失敗は気にしなくていい
return new Promise(res => {
setTimeout(res, 3000);
}).then(() => {
return util.fetch(url, {
method: 'post',
dataType: 'text',
timeout: 10000,
body: JSON.stringify(this._lastResponse)
});
}).then(res => res.text())
.then(() => {
console.log('delete success');
})
.catch(err => {
console.error('delete fail', err);
});
}
_onHeartBeatSuccess(result) {
let json = result;
this._lastResponse = json.data;
this._lastUpdate = Date.now();
}
get isDeleted() {
return !!this._isDeleted || (Date.now() - this._lastUpdate) > this._heartbeatLifeTime * 1.2;
}
}
class SmileSession extends VideoSession {
constructor(params) {
super(params);
this._serverType = 'smile';
this._heartBeatInterval = SMILE_HEART_BEAT_INTERVAL_MS;
this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
this._lastUpdate = Date.now();
}
_createSession(videoInfo) {
this.enableHeartBeat();
return new Promise((resolve) => {
let videoUrl = videoInfo.videoUrl;
return resolve(videoUrl);
});
}
_heartBeat() {
let url = this._videoInfo.watchUrl;
let query = [
'mode=pc_html5',
'playlist_token=' + this._videoInfo.playlistToken,
'continue_watching=1',
'watch_harmful=2'
];
if (this._videoInfo.isEconomy) {
query.push(this._videoInfo.isEconomy ? 'eco=1' : 'eco=0');
}
if (query.length > 0) {
url += '?' + query.join('&');
}
util.fetch(url, {
timeout: 10000,
credentials: 'include'
}).then(res => {
return res.json();
})
.then(this._onHeartBeatSuccess)
.catch(this._onHeartBeatFail);
}
_deleteSession() {
if (this._isDeleted) {
return Promise.resolve();
}
this._isDeleted = true;
return Promise.resolve();
}
_onHeartBeatSuccess(result) {
this._lastResponse = result;
if (result.status !== 'ok') {
return this._onHeartBeatFail();
}
this._lastUpdate = Date.now();
if (result && result.flashvars && result.flashvars.watchAuthKey) {
this._videoInfo.watchAuthKey = result.flashvars.watchAuthKey;
}
}
// smileには明確なセッション終了の概念がないため、
// cookieの有効期限が切れていそうな時間が経っているかどうかで判断する
get isDeleted() {
return this._isDeleted || (Date.now() - this._lastUpdate > 10 * 60 * 1000);
}
}
return VideoSession;
})();

class PlayerConfig {
static getInstance(config) {
if (!PlayerConfig.instance) {
PlayerConfig.instance = new PlayerConfig(config);
}
return PlayerConfig.instance;
}
constructor(params) {
this.initialize(params);
}
}
_.assign(PlayerConfig.prototype, {
initialize: function (params) {
let config = this._config = params.config;
this._mode = params.mode || '';
if (!this._mode && util.isGinzaWatchUrl()) {
this._mode = 'ginza';
} else if (location && location.host.indexOf('.nicovideo.jp') < 0) {
this._mode = 'others';
}
if (!this._mode) {
[ 'refreshValue',
'getValue',
'setValue',
'setValueSilently',
'setSessionValue',
'on',
'off'
].forEach(func => this[func] = config[func].bind(config));
}
},
// 環境ごとに独立させたい要求が出てきたのでラップする
_getNativeKey: function (key) {
if (!this._mode) {
return key;
}
switch (this._mode) {
case 'ginza':
if (['autoPlay', 'screenMode'].includes(key)) {
return `${key}:${this._mode}`;
}
return key;
case 'others':
if (['autoPlay', 'screenMode', 'overrideWatchLink'].includes(key)) {
return `${key}:${this._mode}`;
}
return key;
default:
return key;
}
},
refreshValue: function (key) {
key = this._getNativeKey(key);
return this._config.refreshValue(key);
},
getValue: function (key, refresh) {
key = this._getNativeKey(key);
return this._config.getValue(key, refresh);
},
setValue: function (key, value) {
key = this._getNativeKey(key);
return this._config.setValue(key, value);
},
setValueSilently: function (key, value) {
key = this._getNativeKey(key);
return this._config.setValueSilently(key, value);
},
setSessionValue: function (key, value) {
key = this._getNativeKey(key);
return this._config.setSessionValue(key, value);
},
_wrapFunc: function (func) {
return function (key, value) {
key = key.replace(/:.*?$/, '');
func(key, value);
};
},
on: function (key, func) {
if (key.match(/^update-(.*)$/)) {
key = RegExp.$1;
let nativeKey = this._getNativeKey(key);
this._config.on('update-' + nativeKey, func);
} else {
this._config.on(key, this._wrapFunc(func));
}
},
off: function (/*key, func*/) {
throw new Error('not supported!');
}
});
class VideoWatchOptions {
constructor(watchId, options, config) {
this._watchId = watchId;
this._options = options || {};
this._config = config;
}
}
_.assign(VideoWatchOptions.prototype, {
getRawData: function () {
return this._options;
},
getEventType: function () {
return this._options.eventType || '';
},
getQuery: function () {
return this._options.query || {};
},
getVideoLoadOptions: function () {
let options = {
economy: this.isEconomySelected()
};
return options;
},
getMylistLoadOptions: function () {
let options = {};
let query = this.getQuery();
if (query.mylist_sort) {
options.sort = query.mylist_sort;
}
options.group_id = query.group_id;
options.watchId = this._watchId;
return options;
},
isPlaylistStartRequest: function () {
let eventType = this.getEventType();
let query = this.getQuery();
if (eventType !== 'click' || query.continuous !== '1') {
return false;
}
if (['mylist', 'deflist', 'tag', 'search'].includes(query.playlist_type) &&
(query.group_id || query.order)) {
return true;
}
return false;
},
hasKey: function (key) {
return _.has(this._options, key);
},
isOpenNow: function () {
return this._options.openNow === true;
},
isEconomySelected: function () {
return _.isBoolean(this._options.economy) ?
this._options.economy : this._config.getValue('smileVideoQuality') === 'eco';
},
isAutoCloseFullScreen: function () {
return !!this._options.autoCloseFullScreen;
},
isReload: function () {
return this._options.reloadCount > 0;
},
getVideoServerType: function() {
return this._options.videoServerType;
},
isAutoZenTubeDisabled: function() {
return !!this._options.isAutoZenTubeDisabled;
},
getReloadCount: function() {
return this._options.reloadCount;
},
getCurrentTime: function () {
return _.isNumber(this._options.currentTime) ?
parseFloat(this._options.currentTime, 10) : 0;
},
createForVideoChange: function (options) {
options = options || {};
delete this._options.economy;
_.defaults(options, this._options);
options.openNow = true;
delete options.videoServerType;
options.isAutoZenTubeDisabled = false;
options.currentTime = 0;
options.reloadCount = 0;
options.query = {};
return options;
},
createForReload: function (options) {
options = options || {};
delete this._options.economy;
options.isAutoZenTubeDisabled = typeof options.isAutoZenTubeDisabled === 'boolean' ?
options.isAutoZenTubeDisabled : true;
_.defaults(options, this._options);
options.openNow = true;
options.reloadCount = options.reloadCount ? (options.reloadCount + 1) : 1;
options.query = {};
return options;
},
createForSession: function (options) {
options = options || {};
_.defaults(options, this._options);
options.query = {};
return options;
}
});
class NicoVideoPlayerDialogView extends Emitter {
constructor(...args) {
super();
this.initialize(...args);
}
}
util.addStyle(`
#zenzaVideoPlayerDialog::before {
display: none;
}
.zenzaPlayerContainer {
left: 0 !important;
top: 0 !important;
width: 100vw !important;
height: 100vh !important;
contain: size layout;
}
.videoPlayer,
.commentLayerFrame,
.resizeObserver {
top: 0 !important;
left: 0 !important;
width: 100vw !important;
height: 100% !important;
right: 0 !important;
/*bottom: 0 !important;*/
border: 0 !important;
z-index: 100 !important;
contain: layout style size paint;
will-change: transform,opacity;
}
.resizeObserver {
z-index: -1;
opacity: 0;
pointer-events: none;
}
.is-open .videoPlayer>* {
cursor: none;
}
.showVideoControlBar {
--padding-bottom: var(--zenza-control-bar-height, ${VideoControlBar.BASE_HEIGHT}px);
} 
.zenzaStoryboardOpen .showVideoControlBar {
--padding-bottom: calc(var(--zenza-control-bar-height) + 80px);
}
.zenzaStoryboardOpen.is-fullscreen .showVideoControlBar {
--padding-bottom: calc(var(--zenza-control-bar-height) + 50px);
}
.showVideoControlBar .videoPlayer,
.showVideoControlBar .commentLayerFrame,
.showVideoControlBar .resizeObserver {
height: calc(100% - var(--padding-bottom)) !important;
}
.showVideoControlBar .videoPlayer {
z-index: 100 !important;
}
.showVideoControlBar .commentLayerFrame {
z-index: 101 !important;
}
.is-showComment.is-backComment .videoPlayer
{
top: 25% !important;
left: 25% !important;
width: 50% !important;
height: 50% !important;
right: 0 !important;
bottom: 0 !important;
border: 0 !important;
z-index: 102 !important;
}
body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
transform: perspective(700px) rotateX(10deg);
margin-top: -5%;
}
.zenzaPlayerContainer {
left: 0;
width: 100vw;
height: 100vh;
box-shadow: none;
}
.is-backComment .videoPlayer {
left: 25%;
top: 25%;
width: 50%;
height: 50%;
z-index: 102;
}
body[data-screen-mode="3D"] .zenzaPlayerContainer .videoPlayer {
transform: perspective(600px) rotateX(10deg);
height: 100%;
}
body[data-screen-mode="3D"] .zenzaPlayerContainer .commentLayerFrame {
transform: translateZ(0) perspective(600px) rotateY(30deg) rotateZ(-15deg) rotateX(15deg);
opacity: 0.9;
height: 100%;
margin-left: 20%;
}
`, {className: 'screenMode for-full', disabled: true});
util.addStyle(`
body #zenzaVideoPlayerDialog {
contain: style size;
}
#zenzaVideoPlayerDialog::before {
display: none;
}
body.zenzaScreenMode_sideView {
--sideView-left-margin: ${CONSTANT.SIDE_PLAYER_WIDTH + 24}px;
--sideView-top-margin: 76px;
margin-left: var(--sideView-left-margin);
margin-top: var(--sideView-top-margin);
width: auto;
}
body.zenzaScreenMode_sideView.nofix {
--sideView-top-margin: 40px;
}
body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
width: auto;
}
body.zenzaScreenMode_sideView:not(.nofix) #siteHeader #siteHeaderInner {
width: auto;
}
.zenzaScreenMode_sideView .zenzaVideoPlayerDialog.is-open,
.zenzaScreenMode_small .zenzaVideoPlayerDialog.is-open {
display: block;
top: 0; left: 0; right: 100%; bottom: 100%;
}
.zenzaScreenMode_sideView .zenzaPlayerContainer,
.zenzaScreenMode_small .zenzaPlayerContainer {
width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
height: ${CONSTANT.SIDE_PLAYER_HEIGHT}px;
}
.is-open .zenzaVideoPlayerDialog {
contain: layout style size;
}
.zenzaVideoPlayerDialogInner {
top: 0;
left: 0;
transform: none;
}
@media screen and (min-width: 1432px)
{
body.zenzaScreenMode_sideView {
--sideView-left-margin: calc(100vw - 1024px);
}
body.zenzaScreenMode_sideView:not(.nofix) #siteHeader {
width: calc(100vw - (100vw - 1024px));
}
.zenzaScreenMode_sideView .zenzaPlayerContainer {
width: calc(100vw - 1024px);
height: calc((100vw - 1024px) * 9 / 16);
}
}
`, {className: 'screenMode for-popup', disabled: true});
util.addStyle(`
body.zenzaScreenMode_sideView .ZenButton,
body.zenzaScreenMode_sideView .mylistPocketHoverMenu.zen-family {
transform:
translate(calc(var(--sideView-left-margin) * -1), calc(var(--sideView-top-margin) * -1))
scale(var(--zenza-ui-scale, 1));
}
`, {className: 'domain friends-nico', disabled: true});
util.addStyle(`
body.zenzaScreenMode_sideView,
body.zenzaScreenMode_small {
border-bottom: 40px solid;
margin-top: 0;
}
`, {className: 'domain slack-com', disabled: true});
util.addStyle(`
.zenzaScreenMode_normal .zenzaPlayerContainer .videoPlayer {
left: 2.38%;
width: 95.23%;
}
.zenzaScreenMode_big .zenzaPlayerContainer {
width: ${CONSTANT.BIG_PLAYER_WIDTH}px;
height: ${CONSTANT.BIG_PLAYER_HEIGHT}px;
}
`, {className: 'screenMode for-dialog', disabled: true});
util.addStyle(`
.zenzaScreenMode_3D,
.zenzaScreenMode_normal,
.zenzaScreenMode_big,
.zenzaScreenMode_wide
{
overflow-x: hidden !important;
overflow-y: hidden !important;
overflow: hidden !important;
}
/*
プレイヤーが動いてる間、裏の余計な物のマウスイベントを無効化
多少軽量化が期待できる？
*/
body.zenzaScreenMode_big >*:not(.zen-family) *,
body.zenzaScreenMode_normal >*:not(.zen-family) *,
body.zenzaScreenMode_wide >*:not(.zen-family) *,
body.zenzaScreenMode_3D >*:not(.zen-family) * {
pointer-events: none;
user-select: none;
animation-play-state: paused !important;
}
body.zenzaScreenMode_3D >:not(.zen-family),
body.zenzaScreenMode_wide >:not(.zen-family),
body.is-fullscreen >:not(.zen-family) {
visibility: hidden;
pointer-events: none;
user-select: none;
}
body.zenzaScreenMode_big .ZenButton,
body.zenzaScreenMode_normal .ZenButton,
body.zenzaScreenMode_wide .ZenButton,
body.zenzaScreenMode_3D .ZenButton {
display: none;
}
.ads, .banner, iframe[name^="ads"] {
visibility: hidden !important;
pointer-events: none;
}
/* 大百科の奴 */
#scrollUp {
display: none !important;
}
`, {className: 'zenza-open', disabled: true});
NicoVideoPlayerDialogView.__css__ = `
.zenzaVideoPlayerDialog {
display: none;
position: fixed;
/*background: rgba(0, 0, 0, 0.8);*/
top: 0;
left: 0;
right: 0;
bottom: 0;
z-index: ${CONSTANT.BASE_Z_INDEX};
font-size: 13px;
text-align: left;
box-sizing: border-box;
contain: size style layout;
}
.zenzaVideoPlayerDialog::before {
content: ' ';
background: rgba(0, 0, 0, 0.8);
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
will-change: transform;
}
.is-regularUser .forPremium {
display: none !important;
}
.forDmc {
display: none;
}
.is-dmcPlaying .forDmc {
display: inherit;
}
.zenzaVideoPlayerDialog * {
box-sizing: border-box;
}
.zenzaVideoPlayerDialog.is-open {
display: flex;
justify-content: center;
align-items: center;
}
.zenzaVideoPlayerDialog li {
text-align: left;
}
.zenzaVideoPlayerDialogInner {
background: #000;
box-sizing: border-box;
z-index: ${CONSTANT.BASE_Z_INDEX + 1};
box-shadow: 4px 4px 4px #000;
}
.zenzaPlayerContainer {
position: relative;
background: #000;
width: 672px;
height: 384px;
background-size: cover;
background-repeat: no-repeat;
background-position: center center;
}
.zenzaPlayerContainer.is-loading {
cursor: wait;
}
.zenzaPlayerContainer:not(.is-loading):not(.is-error) {
background-image: none !important;
background: #000 !important;
}
.zenzaPlayerContainer.is-loading .videoPlayer,
.zenzaPlayerContainer.is-loading .commentLayerFrame,
.zenzaPlayerContainer.is-error .videoPlayer,
.zenzaPlayerContainer.is-error .commentLayerFrame {
display: none;
}
.zenzaPlayerContainer .videoPlayer {
position: absolute;
top: 0;
left: 0;
width: 100%;
right: 0;
bottom: 0;
height: 100%;
border: 0;
z-index: 100;
background: #000;
will-change: transform, opacity;
user-select: none;
}
.is-mouseMoving .videoPlayer>* {
cursor: auto;
}
.is-loading .videoPlayer>* {
cursor: wait;
}
.zenzaPlayerContainer .commentLayerFrame {
position: absolute;
border: 0;
top: 0;
left: 0;
right: 0;
bottom: 0;
width: 100%;
height: 100%;
z-index: 101;
pointer-events: none;
cursor: none;
user-select: none;
opacity: var(--zenza-comment-layer-opacity, 1);
}
.zenzaPlayerContainer.is-backComment .commentLayerFrame {
position: fixed;
top: 0;
left: 0;
width: 100vw;
height: calc(100vh - 40px);
right: auto;
bottom: auto;
z-index: 1;
}
.is-showComment.is-backComment .videoPlayer {
opacity: 0.90;
}
.is-showComment.is-backComment .videoPlayer:hover {
opacity: 1;
}
.loadingMessageContainer {
display: none;
pointer-events: none;
}
.zenzaPlayerContainer.is-loading .loadingMessageContainer {
display: inline-block;
position: absolute;
z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
right: 8px;
bottom: 8px;
font-size: 24px;
color: var(--base-fore-color);
text-shadow: 0 0 8px #003;
font-family: serif;
letter-spacing: 2px;
}
@keyframes spin {
0% { transform: rotate(0deg); }
100% { transform: rotate(-1800deg); }
}
.zenzaPlayerContainer.is-loading .loadingMessageContainer::before,
.zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
display: inline-block;
text-align: center;
content: '${'\\00272A'}';
font-size: 18px;
line-height: 24px;
animation-name: spin;
animation-iteration-count: infinite;
animation-duration: 5s;
animation-timing-function: linear;
}
.zenzaPlayerContainer.is-loading .loadingMessageContainer::after {
animation-direction: reverse;
}
.errorMessageContainer {
display: none;
pointer-events: none;
user-select: none;
}
.zenzaPlayerContainer.is-error .errorMessageContainer {
display: inline-block;
position: absolute;
z-index: ${CONSTANT.BASE_Z_INDEX + 10000};
top: 50%;
left: 50%;
padding: 8px 16px;
transform: translate(-50%, -50%);
background: rgba(255, 0, 0, 0.9);
font-size: 24px;
box-shadow: 8px 8px 4px rgba(128, 0, 0, 0.8);
white-space: nowrap;
}
.errorMessageContainer:empty {
display: none !important;
}
.popupMessageContainer {
top: 50px;
left: 50px;
z-index: 25000;
position: absolute;
pointer-events: none;
transform: translateZ(0);
user-select: none;
}
@media screen {
/* 右パネル分の幅がある時は右パネルを出す */
@media (min-width: 992px) {
.zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
background: none;
}
}
@media (min-width: 1216px) {
.zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
padding-right: ${CONSTANT.RIGHT_PANEL_WIDTH}px;
background: none;
}
}
/* 縦長モニター */
@media
(max-width: 991px) and (min-height: 700px)
{
.zenzaScreenMode_normal .zenzaVideoPlayerDialogInner {
padding-bottom: 240px;
background: none;
}
}
@media
(max-width: 1215px) and (min-height: 700px)
{
.zenzaScreenMode_big .zenzaVideoPlayerDialogInner {
padding-bottom: 240px;
background: none;
}
}
/* 960x540 */
@media
(min-width: 1328px) and (max-width: 1663px) and
(min-height: 700px) and (min-height: 899px)
{
.zenzaScreenMode_big .zenzaPlayerContainer {
width: calc(960px * 1.05);
height: 540px;
}
}
/* 1152x648 */
@media
(min-width: 1530px) and (min-height: 900px)
{
.zenzaScreenMode_big .zenzaPlayerContainer {
width: calc(1152px * 1.05);
height: 648px;
}
}
/* 1280x720 */
@media
(min-width: 1664px) and (min-height: 900px)
{
.zenzaScreenMode_big .zenzaPlayerContainer {
width: calc(1280px * 1.05);
height: 720px;
}
}
/* 1920x1080 */
@media
(min-width: 2336px) and (min-height: 1200px)
{
.zenzaScreenMode_big .zenzaPlayerContainer {
width: calc(1920px * 1.05);
height: 1080px;
}
}
/* 2560x1440 */
@media
(min-width: 2976px) and (min-height: 1660px)
{
.zenzaScreenMode_big .zenzaPlayerContainer {
width: calc(2560px * 1.05);
height: 1440px;
}
}
}
`.trim();
NicoVideoPlayerDialogView.__tpl__ = (`
<div id="zenzaVideoPlayerDialog" class="zenzaVideoPlayerDialog zen-family">
<div class="zenzaVideoPlayerDialogInner">
<div class="menuContainer"></div>
<div class="zenzaPlayerContainer">
<div class="popupMessageContainer"></div>
<div class="errorMessageContainer"></div>
<div class="loadingMessageContainer">動画読込中</div>
</div>
</div>
</div>
`).trim();
_.assign(NicoVideoPlayerDialogView.prototype, {
initialize: function (params) {
const dialog = this._dialog = params.dialog;
this._playerConfig = params.playerConfig;
this._nicoVideoPlayer = params.nicoVideoPlayer;
this._state = params.playerState;
this._currentTimeGetter = params.currentTimeGetter;
this._aspectRatio = 9 / 16;
dialog.on('canPlay', this._onVideoCanPlay.bind(this));
dialog.on('videoCount', this._onVideoCount.bind(this));
dialog.on('error', this._onVideoError.bind(this));
dialog.on('play', this._onVideoPlay.bind(this));
dialog.on('playing', this._onVideoPlaying.bind(this));
dialog.on('pause', this._onVideoPause.bind(this));
dialog.on('stalled', this._onVideoStalled.bind(this));
dialog.on('abort', this._onVideoAbort.bind(this));
dialog.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
dialog.on('volumeChange', this._onVolumeChange.bind(this));
dialog.on('volumeChangeEnd', this._onVolumeChangeEnd.bind(this));
dialog.on('beforeVideoOpen', this._onBeforeVideoOpen.bind(this));
dialog.on('loadVideoInfoFail', this._onVideoInfoFail.bind(this));
dialog.on('videoServerType', this._onVideoServerType.bind(this));
this._initializeDom();
this._state.on('change', this._onPlayerStateChange.bind(this));
this._state.on('update-videoInfo', this._onVideoInfoLoad.bind(this));
},
_initializeDom: function () {
util.addStyle(NicoVideoPlayerDialogView.__css__);
const $dialog = this._$dialog = $(NicoVideoPlayerDialogView.__tpl__);
const onCommand = this._onCommand.bind(this);
const config = this._playerConfig;
const state = this._state;
this._$body = util.$('body, html');
const $container = this._$playerContainer = $dialog.find('.zenzaPlayerContainer');
const container = $container[0];
const classList = this._classList = new ClassListWrapper(container);
container.addEventListener('click', e => {
ZenzaWatch.emitter.emitAsync('hideHover');
if (
e.target.classList.contains('touchWrapper') &&
config.getValue('enableTogglePlayOnClick') &&
!classList.contains('menuOpen')) {
onCommand('togglePlay');
}
e.preventDefault();
e.stopPropagation();
classList.remove('menuOpen');
});
container.addEventListener('command', e=> {
e.stopPropagation();
e.preventDefault();
this._onCommand(e.detail.command, e.detail.param);
});
container.addEventListener('focusin', e => {
let target = (e.path && e.path.length) ? e.path[0] : e.target;
if (target.dataset.hasSubmenu) {
classList.add('menuOpen');
}
});
this._applyState();
// マウスを動かしてないのにmousemoveが飛んできたらスルー
let lastX = 0, lastY = 0;
let onMouseMove = this._onMouseMove.bind(this);
let onMouseMoveEnd = _.debounce(this._onMouseMoveEnd.bind(this), 400);
container.addEventListener('mousemove', _.throttle(e => {
if (e.buttons === 0 && lastX === e.screenX && lastY === e.screenY) {
return;
}
lastX = e.screenX;
lastY = e.screenY;
onMouseMove(e);
onMouseMoveEnd(e);
}, 100));
$dialog
.on('dblclick', e => {
if (!e.target || e.target.id !== 'zenzaVideoPlayerDialog') {
return;
}
if (config.getValue('enableDblclickClose')) {
this.emit('command', 'close');
}
})
.toggleClass('is-guest', !util.isLogin());
this._hoverMenu = new VideoHoverMenu({
playerContainer: container,
playerState: state
});
this._commentInput = new CommentInputPanel({
$playerContainer: $container,
playerConfig: config
});
this._commentInput.on('post', (e, chat, cmd) =>
this.emit('postChat', e, chat, cmd));
let hasPlaying = false;
this._commentInput.on('focus', isAutoPause => {
hasPlaying = state.isPlaying;
if (isAutoPause) {
this.emit('command', 'pause');
}
});
this._commentInput.on('blur', isAutoPause => {
if (isAutoPause && hasPlaying && state.isOpen) {
this.emit('command', 'play');
}
});
this._commentInput.on('esc', () => this._escBlockExpiredAt = Date.now() + 1000 * 2);
this._settingPanel = new SettingPanel({
$playerContainer: $container,
playerConfig: config,
player: this._dialog
});
this._settingPanel.on('command', onCommand);
this._videoControlBar = new VideoControlBar({
$playerContainer: $container,
playerConfig: config,
player: this._dialog,
playerState: this._state
});
this._videoControlBar.on('command', onCommand);
this._$errorMessageContainer = $container.find('.errorMessageContainer');
this._initializeVideoInfoPanel();
this._initializeResponsive();
this.selectTab(this._state.currentTab);
ZenzaWatch.emitter.on('showMenu', () => this.addClass('menuOpen'));
ZenzaWatch.emitter.on('hideMenu', () => this.removeClass('menuOpen'));
ZenzaWatch.emitter.on('fullscreenStatusChange', () => this._applyScreenMode(true));
document.body.appendChild($dialog[0]);
},
_initializeVideoInfoPanel: function () {
if (this._videoInfoPanel) {
return this._videoInfoPanel;
}
this._videoInfoPanel = new VideoInfoPanel({
dialog: this,
node: this._$playerContainer,
currentTimeGetter: this._currentTimeGetter
});
this._videoInfoPanel.on('command', this._onCommand.bind(this));
return this._videoInfoPanel;
},
_onCommand: function (command, param) {
switch (command) {
case 'settingPanel':
this.toggleSettingPanel();
break;
case 'toggle-flipH':
this.toggleClass('is-flipH');
break;
case 'toggle-flipV':
this.toggleClass('is-flipV');
break;
default:
this.emit('command', command, param);
}
},
_initializeResponsive: function () {
window.addEventListener('resize', _.debounce(this._updateResponsive.bind(this), 500));
this._varMapper = new VariablesMapper({config: this._playerConfig});
this._varMapper.on('update', () => this._updateResponsive());
},
_updateResponsive: function () {
if (!this._state.isOpen) {
return;
}
let $container = this._$playerContainer;
let $header = $container.find('.zenzaWatchVideoHeaderPanel');
let config = this._playerConfig;
// 画面の縦幅にシークバー分の余裕がある時は常時表示
const update = () => {
const w = window.innerWidth, h = window.innerHeight;
const vMargin = h - w * this._aspectRatio;
const controlBarMode = config.getValue('fullscreenControlBarMode');
if (controlBarMode === 'always-hide') {
this.toggleClass('showVideoControlBar showVideoControlBar', false);
return;
}
let videoControlBarHeight = this._varMapper.videoControlBarHeight;
let showVideoHeaderPanel = vMargin >= videoControlBarHeight + $header.outerHeight() * 2;
let showVideoControlBar;
switch (controlBarMode) {
case 'always-show':
showVideoControlBar = true;
break;
case 'auto':
default:
showVideoControlBar = vMargin >= videoControlBarHeight;
}
this.toggleClass('showVideoControlBar', showVideoControlBar);
this.toggleClass('showVideoHeaderPanel', showVideoHeaderPanel);
};
update();
},
_onMouseMove: function () {
if (this._isMouseMoving) {
return;
}
this.addClass('is-mouseMoving');
this._isMouseMoving = true;
},
_onMouseMoveEnd: function () {
if (!this._isMouseMoving) {
return;
}
this.removeClass('is-mouseMoving');
this._isMouseMoving = false;
},
_onVideoCanPlay: function (watchId, videoInfo, options) {
this.emit('canPlay', watchId, videoInfo, options);
},
_onVideoCount: function ({comment, view, mylist} = {}) {
this.emit('videoCount', {comment, view, mylist});
},
_onVideoError: function (e) {
this.emit('error', e);
},
_onBeforeVideoOpen: function () {
this._setThumbnail();
},
_onVideoInfoLoad: function (videoInfo) {
this._videoInfoPanel.update(videoInfo);
},
_onVideoInfoFail: function (videoInfo) {
if (videoInfo) {
this._videoInfoPanel.update(videoInfo);
}
},
_onVideoServerType: function (type, sessionInfo) {
this.toggleClass('is-dmcPlaying', type === 'dmc');
this.emit('videoServerType', type, sessionInfo);
},
_onVideoPlay: function () {
},
_onVideoPlaying: function () {
},
_onVideoPause: function () {
},
_onVideoStalled: function () {
},
_onVideoAbort: function () {
},
_onVideoAspectRatioFix: function (ratio) {
this._aspectRatio = ratio;
this._updateResponsive();
},
_onVolumeChange: function (/*vol, mute*/) {
this.addClass('volumeChanging');
},
_onVolumeChangeEnd: function (/*vol, mute*/) {
this.removeClass('volumeChanging');
},
_onScreenModeChange: function () {
this._applyScreenMode();
},
_getStateClassNameTable: function () {
return { // TODO: テーブルなくても対応できるようにcss名を整理
isAbort: 'is-abort',
isBackComment: 'is-backComment',
isShowComment: 'is-showComment',
isDebug: 'is-debug',
isDmcAvailable: 'is-dmcAvailable',
isDmcPlaying: 'is-dmcPlaying',
isError: 'is-error',
isLoading: 'is-loading',
isMute: 'is-mute',
isLoop: 'is-loop',
isOpen: 'is-open',
isPlaying: 'is-playing',
isSeeking: 'is-seeking',
isPausing: 'is-pausing',
// isStalled: 'is-stalled',
isChanging: 'is-changing',
isUpdatingDeflist: 'is-updatingDeflist',
isUpdatingMylist: 'is-updatingMylist',
isPlaylistEnable: 'is-playlistEnable',
isCommentPosting: 'is-commentPosting',
isRegularUser: 'is-regularUser',
isWaybackMode: 'is-waybackMode',
isNotPlayed: 'is-notPlayed',
isYouTube: 'is-youTube'
};
},
_onPlayerStateUpdate: function (changedState) {
Object.keys(changedState).forEach(key =>
this._onPlayerStateChange(key, changedState[key]));
},
_onPlayerStateChange: function (key, value) {
switch (key) {
case 'thumbnail':
return this._setThumbnail(value);
case 'screenMode':
case 'isOpen':
if (this._state.isOpen) {
this.show();
this._onScreenModeChange();
} else {
this.hide();
}
return;
case 'errorMessage':
return this._$errorMessageContainer.text(value);
case 'currentTab':
return this.selectTab(value);
}
const table = this._getStateClassNameTable();
const className = table[key];
if (className) {
this.toggleClass(className, !!value);
}
},
_applyState: function () {
const table = this._getStateClassNameTable();
const state = this._state;
Object.keys(table).forEach(key => {
const className = table[key];
if (!className) {
return;
}
this._classList.toggle(className, state[key]);
});
if (this._state.isOpen) {
this._applyScreenMode();
}
},
_getScreenModeClassNameTable: function () {
return [
'zenzaScreenMode_3D',
'zenzaScreenMode_small',
'zenzaScreenMode_sideView',
'zenzaScreenMode_normal',
'zenzaScreenMode_big',
'zenzaScreenMode_wide'
];
},
_applyScreenMode: function (force = false) {
const screenMode = `zenzaScreenMode_${this._state.screenMode}`;
if (!force && this._lastScreenMode === screenMode) { return; }
this._lastScreenMode = screenMode;
const body = this._$body;
const modes = this._getScreenModeClassNameTable();
const isFull = util.fullscreen.now();
document.body.dataset.screenMode = this._state.screenMode;
document.body.dataset.fullscreen = isFull ? 'yes' : 'no';
modes.forEach(m => body.toggleClass(m, m === screenMode && !isFull));
this._updateScreenModeStyle();
},
_updateScreenModeStyle: function() {
if (!this._state.isOpen) {
util.StyleSwitcher.update({off: 'style.screenMode'});
return;
}
if (Fullscreen.now()) {
util.StyleSwitcher.update({
on: 'style.screenMode.for-full, style.screenMode.for-screen-full',
off: 'style.screenMode:not(.for-full):not(.for-screen-full)'
});
return;
}
let on, off;
switch (this._state.screenMode) {
case '3D':
case 'wide':
on = 'style.screenMode.for-full, style.screenMode.for-window-full';
off = 'style.screenMode:not(.for-full):not(.for-window-full)';
break;
default:
case 'normal':
case 'big':
on = 'style.screenMode.for-dialog, style.screenMode.for-big, style.screenMode.for-normal';
off = 'style.screenMode:not(.for-dialog):not(.for-big):not(.for-normal)';
break;
case 'small':
case 'sideView':
on = 'style.screenMode.for-popup, style.screenMode.for-sideView, .style.screenMode.for-small';
off = 'style.screenMode:not(.for-popup):not(.for-sideView):not(.for-small)';
break;
}
util.StyleSwitcher.update({on, off});
},
show: function () {
this._$dialog.addClass('is-open');
if (!Fullscreen.now()) {
document.body.classList.remove('fullscreen');
}
this._$body.addClass('showNicoVideoPlayerDialog');
util.StyleSwitcher.update({on: 'style.zenza-open'});
this._updateScreenModeStyle();
},
hide: function () {
this._$dialog.removeClass('is-open');
this._settingPanel.hide();
this._$body.removeClass('showNicoVideoPlayerDialog');
util.StyleSwitcher.update({off: 'style.zenza-open, style.screenMode'});
this._clearClass();
},
_clearClass: function () {
const modes = this._getScreenModeClassNameTable().join(' ');
this._lastScreenMode = '';
this._$body.removeClass(modes);
},
_setThumbnail: function (thumbnail) {
if (thumbnail) {
this.css('background-image', `url(${thumbnail})`);
} else {
// base hrefのせいで変なurlを参照してしまうので適当な黒画像にする
this.css('background-image', `url(${CONSTANT.BLANK_PNG})`);
}
},
focusToCommentInput: function () {
// 即フォーカスだと入力欄に"C"が入ってしまうのを雑に対処
window.setTimeout(() => this._commentInput.focus(), 0);
},
toggleSettingPanel: function () {
this._settingPanel.toggle();
},
get$Container: function () {
return this._$playerContainer;
},
css: function (key, val) {
util.$(this._$playerContainer[0]).css(key, val);
},
addClass: function (name) {
return this._classList.add(...name.split(/[ ]+/));
},
removeClass: function (name) {
return this._classList.remove(...name.split(/[ ]+/));
},
toggleClass: function (name, v) {
if (_.isBoolean(v)) {
return v ? this.addClass(name) : this.removeClass(name);
}
name.split(/[ ]+/).forEach(n => this._classList.toggle(n));
},
hasClass: function (name) {
const container = this._$playerContainer[0];
return container.classList.contains(name);
},
appendTab: function (name, title) {
return this._videoInfoPanel.appendTab(name, title);
},
selectTab: function (name) {
this._playerConfig.setValue('videoInfoPanelTab', name);
this._videoInfoPanel.selectTab(name);
},
execCommand: function (command, param) {
this.emit('command', command, param);
},
blinkTab: function (name) {
this._videoInfoPanel.blinkTab(name);
},
clearPanel: function () {
this._videoInfoPanel.clear();
}
});
class ClassListWrapper {
constructor(element) {
this._element = element;
this._next = Array.from(element.classList).sort();
this._last = this._next;
}
add(...names) {
this._next.push(...names.filter(name => !this._next.includes(name)));
this._apply();
return true;
}
remove(...names) {
this._next = this._next.filter(name => !names.includes(name));
this._apply();
return false;
}
contains(name) {
return this._next.includes(name);
}
toggle(name, v) {
if (v !== undefined) {
v = !!v;
} else {
v = !this.contains(name);
}
return v ? this.add(name) : this.remove(name);
}
_apply() {
if (this._applying) { return; }
let last = this._last.join(',');
let next = this._next.sort().join(',');
if (next === last) { return; }
this._applying = requestAnimationFrame(() => {
this._applying = null;
let added = this._next.filter(name => !this._last.includes(name));
let removed = this._last.filter(name => !this._next.includes(name));
if (added.length) { this._element.classList.add(...added); }
if (removed.length) { this._element.classList.remove(...removed); }
this._next = Array.from(this._element.classList).sort();
this._last = this._next.concat();
});
}
}
/**
* TODO: 分割 まにあわなくなっても知らんぞー
*/
class NicoVideoPlayerDialog extends Emitter {
constructor(params) {
super();
this.initialize(params);
}
}
_.assign(NicoVideoPlayerDialog.prototype, {
initialize: function (params) {
this._offScreenLayer = params.offScreenLayer;
this._playerConfig = params.config;
this._state = params.state;
this._keyEmitter = params.keyHandler || ShortcutKeyEmitter;
this._initializeDom();
this._keyEmitter.on('keyDown', this._onKeyDown.bind(this));
this._keyEmitter.on('keyUp', this._onKeyUp.bind(this));
this._id = 'ZenzaWatchDialog_' + Date.now() + '_' + Math.random();
this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
this._escBlockExpiredAt = -1;
this._videoFilter = new VideoFilter(
this._playerConfig.getValue('videoOwnerFilter'),
this._playerConfig.getValue('videoTagFilter')
);
this._savePlaybackPosition =
_.throttle(this._savePlaybackPosition.bind(this), 1000, {trailing: false});
},
_initializeDom: function () {
this._view = new NicoVideoPlayerDialogView({
dialog: this,
playerConfig: this._playerConfig,
nicoVideoPlayer: this._nicoVideoPlayer,
playerState: this._state,
currentTimeGetter: () => this.getCurrentTime()
});
if (this._playerConfig.getValue('enableCommentPanel')) {
this._initializeCommentPanel();
}
this._$playerContainer = this._view.get$Container();
this._view.on('command', this._onCommand.bind(this));
this._view.on('postChat', (e, chat, cmd) => {
this.addChat(chat, cmd)
.then(() => e.resolve())
.catch(() => e.reject());
});
},
_initializeNicoVideoPlayer: function () {
if (this._nicoVideoPlayer) {
return this._nicoVideoPlayer();
}
let config = this._playerConfig;
let nicoVideoPlayer = this._nicoVideoPlayer = new NicoVideoPlayer({
offScreenLayer: this._offScreenLayer,
node: this._$playerContainer,
playerConfig: config,
playerState: this._state,
volume: config.getValue('volume'),
loop: config.getValue('loop'),
enableFilter: config.getValue('enableFilter'),
wordFilter: config.getValue('wordFilter'),
wordRegFilter: config.getValue('wordRegFilter'),
wordRegFilterFlags: config.getValue('wordRegFilterFlags'),
commandFilter: config.getValue('commandFilter'),
userIdFilter: config.getValue('userIdFilter')
});
this._messageApiLoader = new ThreadLoader();
nicoVideoPlayer.on('loadedMetaData', this._onLoadedMetaData.bind(this));
nicoVideoPlayer.on('ended', this._onVideoEnded.bind(this));
nicoVideoPlayer.on('canPlay', this._onVideoCanPlay.bind(this));
nicoVideoPlayer.on('play', this._onVideoPlay.bind(this));
nicoVideoPlayer.on('pause', this._onVideoPause.bind(this));
nicoVideoPlayer.on('playing', this._onVideoPlaying.bind(this));
nicoVideoPlayer.on('seeking', this._onVideoSeeking.bind(this));
nicoVideoPlayer.on('seeked', this._onVideoSeeked.bind(this));
nicoVideoPlayer.on('stalled', this._onVideoStalled.bind(this));
nicoVideoPlayer.on('waiting', this._onVideoStalled.bind(this));
nicoVideoPlayer.on('timeupdate', this._onVideoTimeUpdate.bind(this));
nicoVideoPlayer.on('progress', this._onVideoProgress.bind(this));
nicoVideoPlayer.on('aspectRatioFix', this._onVideoAspectRatioFix.bind(this));
nicoVideoPlayer.on('commentParsed', this._onCommentParsed.bind(this));
nicoVideoPlayer.on('commentChange', this._onCommentChange.bind(this));
nicoVideoPlayer.on('commentFilterChange', this._onCommentFilterChange.bind(this));
nicoVideoPlayer.on('videoPlayerTypeChange', this._onVideoPlayerTypeChange.bind(this));
nicoVideoPlayer.on('error', this._onVideoError.bind(this));
nicoVideoPlayer.on('abort', this._onVideoAbort.bind(this));
nicoVideoPlayer.on('volumeChange', this._onVolumeChange.bind(this));
nicoVideoPlayer.on('volumeChange', _.debounce(this._onVolumeChangeEnd.bind(this), 1500));
nicoVideoPlayer.on('command', this._onCommand.bind(this));
return nicoVideoPlayer;
},
execCommand: function (command, param) {
return this._onCommand(command, param);
},
_onCommand: function (command, param) {
let v;
// console.log('command: %s param: %s', command, param, typeof param);
switch (command) {
case 'volume':
this.setVolume(param);
break;
case 'volumeBy':
this.setVolume(this._nicoVideoPlayer.getVolume() * param);
break;
case 'volumeUp':
this._nicoVideoPlayer.volumeUp();
break;
case 'volumeDown':
this._nicoVideoPlayer.volumeDown();
break;
case 'togglePlay':
this.togglePlay();
break;
case 'pause':
this.pause();
break;
case 'play':
this.play();
break;
case 'fullscreen':
case 'toggle-fullscreen':
this._nicoVideoPlayer.toggleFullScreen();
break;
case 'deflistAdd':
return this._onDeflistAdd(param);
case 'deflistRemove':
return this._onDeflistRemove(param);
case 'playlistAdd':
case 'playlistAppend':
this._onPlaylistAppend(param);
break;
case 'playlistInsert':
this._onPlaylistInsert(param);
break;
case 'playlistSetMylist':
this._onPlaylistSetMylist(param);
break;
case 'playlistSetUploadedVideo':
this._onPlaylistSetUploadedVideo(param);
break;
case 'playlistSetSearchVideo':
this._onPlaylistSetSearchVideo(param);
break;
case 'playNextVideo':
this.playNextVideo();
break;
case 'playPreviousVideo':
this.playPreviousVideo();
break;
case 'shufflePlaylist':
this._playlist.shuffle();
break;
case 'togglePlaylist':
this._playlist.toggleEnable();
break;
case 'mylistAdd':
return this._onMylistAdd(param.mylistId, param.mylistName);
case 'mylistRemove':
return this._onMylistRemove(param.mylistId, param.mylistName);
case 'mylistWindow':
util.openMylistWindow(this._videoInfo.watchId);
break;
case 'seek':
case 'seekTo':
this.setCurrentTime(param * 1);
break;
case 'seekBy':
this.setCurrentTime(this.getCurrentTime() + param * 1);
break;
case 'seekPrevFrame':
case 'seekNextFrame':
this.execCommand('pause');
this.execCommand('seekBy', command === 'seekNextFrame' ? 1/60 : -1/60);
break;
case 'seekRelativePercent': {
let dur = this._videoInfo.duration;
let mv = Math.abs(param.movePerX) > 10 ?
(param.movePerX / 2) : (param.movePerX / 8);
let pos = this.getCurrentTime() + (mv * dur / 100);
this.setCurrentTime(Math.min(Math.max(0, pos), dur));
break;
}
case 'addWordFilter':
this._nicoVideoPlayer.addWordFilter(param);
break;
case 'setWordRegFilter':
case 'setWordRegFilterFlags':
this._nicoVideoPlayer.setWordRegFilter(param);
break;
case 'addUserIdFilter':
this._nicoVideoPlayer.addUserIdFilter(param);
break;
case 'addCommandFilter':
this._nicoVideoPlayer.addCommandFilter(param);
break;
case 'setWordFilterList':
this._nicoVideoPlayer.setWordFilterList(param);
break;
case 'setUserIdFilterList':
this._nicoVideoPlayer.setUserIdFilterList(param);
break;
case 'setCommandFilterList':
this._nicoVideoPlayer.setCommandFilterList(param);
break;
case 'openNow':
this.open(param, {openNow: true});
break;
case 'open':
this.open(param);
break;
case 'close':
this.close(param);
break;
case 'reload':
this.reload({currentTime: this.getCurrentTime()});
break;
case 'openGinza':
window.open('//www.nicovideo.jp/watch/' + this._watchId, 'watchGinza');
break;
case 'reloadComment':
this.reloadComment(param);
break;
case 'playbackRate':
this._playerConfig.setValue(command, param);
break;
case 'shiftUp': {
v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
if (v < 2) {
v += 0.25;
} else {
v = Math.min(10, v + 0.5);
}
this._playerConfig.setValue('playbackRate', v);
}
break;
case 'shiftDown': {
v = parseFloat(this._playerConfig.getValue('playbackRate'), 10);
if (v > 2) {
v -= 0.5;
} else {
v = Math.max(0.1, v - 0.25);
}
this._playerConfig.setValue('playbackRate', v);
}
break;
case 'screenShot':
if (this._state.isYouTube) {
util.capTube({
title: this._videoInfo.title,
videoId: this._videoInfo.videoId,
author: this._videoInfo.owner.name
});
return;
}
this._nicoVideoPlayer.getScreenShot();
break;
case 'screenShotWithComment':
if (this._state.isYouTube) {
return;
}
this._nicoVideoPlayer.getScreenShotWithComment();
break;
case 'nextVideo':
this._nextVideo = param;
break;
case 'nicosSeek':
this._onNicosSeek(param);
break;
case 'fastSeek':
this._nicoVideoPlayer.fastSeek(param);
break;
case 'setVideo':
this.setVideo(param);
break;
case 'selectTab':
this._state.currentTab = param;
break;
case 'update-smileVideoQuality':
this._playerConfig.setValue('videoServerType', 'smile');
this._playerConfig.setValue('smileVideoQuality', param);
this.reload({videoServerType: 'smile', economy: param === 'eco'});
break;
case 'update-dmcVideoQuality':
this._playerConfig.setValue('videoServerType', 'dmc');
this._playerConfig.setValue('dmcVideoQuality', param);
this.reload({videoServerType: 'dmc'});
break;
case 'update-videoServerType':
this._playerConfig.setValue('videoServerType', param);
this.reload({videoServerType: param === 'dmc' ? 'dmc' : 'smile'});
break;
case 'update-commentLanguage':
command = command.replace(/^update-/, '');
if (this._playerConfig.getValue(command) === param) {
break;
}
this._playerConfig.setValue(command, param);
this.reloadComment(param);
break;
case 'saveMymemory':
util.saveMymemory(this, this._state.videoInfo);
break;
default:
this.emit('command', command, param);
}
},
_onKeyDown: function (name, e, param) {
this._onKeyEvent(name, e, param);
},
_onKeyUp: function (name, e, param) {
this._onKeyEvent(name, e, param);
},
_onKeyEvent: function (name, e, param) {
if (!this._state.isOpen) {
let lastWatchId = this._playerConfig.getValue('lastWatchId');
if (name === 'RE_OPEN' && lastWatchId) {
this.open(lastWatchId);
e.preventDefault();
}
return;
}
const TABLE = {
'RE_OPEN': 'reload',
'PAUSE': 'pause',
'TOGGLE_PLAY': 'togglePlay',
'SPACE': 'togglePlay',
'FULL': 'toggle-fullscreen',
'TOGGLE_PLAYLIST': 'togglePlaylist',
'DEFLIST': 'deflistAdd',
'DEFLIST_REMOVE': 'deflistRemove',
'VIEW_COMMENT': 'toggle-showComment',
'TOGGLE_LOOP': 'toggle-loop',
'MUTE': 'toggle-mute',
'VOL_UP': 'volumeUp',
'VOL_DOWN': 'volumeDown',
'SEEK_TO': 'seekTo',
'SEEK_BY': 'seekBy',
'SEEK_PREV_FRAME': 'seekPrevFrame',
'SEEK_NEXT_FRAME': 'seekNextFrame',
'NEXT_VIDEO': 'playNextVideo',
'PREV_VIDEO': 'playPreviousVideo',
'PLAYBACK_RATE': 'playbackRate',
'SHIFT_UP': 'shiftUp',
'SHIFT_DOWN': 'shiftDown',
'SCREEN_MODE': 'screenMode',
'SCREEN_SHOT': 'screenShot',
'SCREEN_SHOT_WITH_COMMENT': 'screenShotWithComment'
};
switch (name) {
case 'ESC':
// ESCキーは連打にならないようブロック期間を設ける
if (Date.now() < this._escBlockExpiredAt) {
window.console.log('block ESC');
break;
}
this._escBlockExpiredAt = Date.now() + 1000 * 2;
if (!Fullscreen.now()) {
this.close();
}
break;
case 'INPUT_COMMENT':
this._view.focusToCommentInput();
break;
default:
if (!TABLE[name]) { return; }
this.execCommand(TABLE[name], param);
}
let screenMode = this._playerConfig.getValue('screenMode');
if (['small', 'sideView'].includes(screenMode) && ['TOGGLE_PLAY'].includes(name)) {
return;
}
e.preventDefault();
e.stopPropagation();
},
_onPlayerConfigUpdate: function (key, value) {
switch (key) {
case 'enableFilter':
this._nicoVideoPlayer.setIsCommentFilterEnable(value);
break;
case 'wordFilter':
this._nicoVideoPlayer.setWordFilterList(value);
break;
case 'setWordRegFilter':
this._nicoVideoPlayer.setWordRegFilter(value);
break;
case 'userIdFilter':
this._nicoVideoPlayer.setUserIdFilterList(value);
break;
case 'commandFilter':
this._nicoVideoPlayer.setCommandFilterList(value);
break;
}
},
_updateScreenMode: function (mode) {
this.emit('screenModeChange', mode);
},
_onPlaylistAppend: function (watchId) {
this._initializePlaylist();
this._playlist.append(watchId);
},
_onPlaylistInsert: function (watchId) {
this._initializePlaylist();
this._playlist.insert(watchId);
},
_onPlaylistSetMylist: function (mylistId, option) {
this._initializePlaylist();
option = option || {watchId: this._watchId};
// デフォルトで古い順にする
option.sort = isNaN(option.sort) ? 7 : option.sort;
// 通常時はプレイリストの置き換え、
// 連続再生中はプレイリストに追加で読み込む
option.insert = this._playlist.isEnable;
let query = this._videoWatchOptions.getQuery();
option.shuffle = parseInt(query.shuffle, 10) === 1;
this._playlist.loadFromMylist(mylistId, option).then(result => {
this.execCommand('notify', result.message);
this._state.currentTab = 'playlist';
this._playlist.insertCurrentVideo(this._videoInfo);
},
() => this.execCommand('alert', 'マイリストのロード失敗'));
},
_onPlaylistSetUploadedVideo: function (userId, option) {
this._initializePlaylist();
option = option || {watchId: this._watchId};
// 通常時はプレイリストの置き換え、
// 連続再生中はプレイリストに追加で読み込む
option.insert = this._playlist.isEnable;
this._playlist.loadUploadedVideo(userId, option).then(result => {
this.execCommand('notify', result.message);
this._state.currentTab = 'playlist';
this._playlist.insertCurrentVideo(this._videoInfo);
},
err => this.execCommand('alert', err.message || '投稿動画一覧のロード失敗'));
},
_onPlaylistSetSearchVideo: function (params) {
this._initializePlaylist();
let option = Object.assign({watchId: this._watchId}, params.option || {});
let word = params.word;
// 通常時はプレイリストの置き換え、
// 連続再生中はプレイリストに追加で読み込む
option.insert = this._playlist.isEnable;
if (option.owner) {
let ownerId = parseInt(this._videoInfo.owner.id, 10);
if (this._videoInfo.isChannel) {
option.channelId = ownerId;
} else {
option.userId = ownerId;
}
}
delete option.owner;
let query = this._videoWatchOptions.getQuery();
option = Object.assign(option, query);
this._state.currentTab = 'playlist';
this._playlist.loadSearchVideo(word, option).then(result => {
this.execCommand('notify', result.message);
this._playlist.insertCurrentVideo(this._videoInfo);
ZenzaWatch.emitter.emitAsync('searchVideo', {word, option});
window.setTimeout(() => this._playlist.scrollToActiveItem(), 1000);
},
err => {
this.execCommand('alert', err.message || '検索失敗または該当無し: 「' + word + '」');
});
},
_onPlaylistStatusUpdate: function () {
let playlist = this._playlist;
this._playerConfig.setValue('playlistLoop', playlist.isLoop);
this._state.isPlaylistEnable = playlist.isEnable;
if (playlist.isEnable) {
this._playerConfig.setValue('loop', false);
}
this._view.blinkTab('playlist');
},
_onCommentPanelStatusUpdate: function () {
let commentPanel = this._commentPanel;
this._playerConfig.setValue(
'enableCommentPanelAutoScroll', commentPanel.isAutoScroll());
},
_onDeflistAdd: function (watchId) {
if (this._state.isUpdatingDeflist || !util.isLogin()) {
return;
}
const unlock = () => this._state.isUpdatingDeflist = false;
this._state.isUpdatingDeflist = true;
let timer = window.setTimeout(unlock, 10000);
watchId = watchId || this._videoInfo.watchId;
let description;
if (!this._mylistApiLoader) {
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
}
(() => {
if (watchId === this._watchId || !this._playerConfig.getValue('enableAutoMylistComment')) {
return Promise.resolve(this._videoInfo);
}
return ZenzaWatch.api.ThumbInfoLoader.load(watchId);
})().then(info => {
const originalVideoId = info.originalVideoId ?
`元動画: ${info.originalVideoId}` : '';
description =
this._playerConfig.getValue('enableAutoMylistComment') ?
`投稿者: ${info.owner.name} ${info.owner.linkId} ${originalVideoId}` : '';
}).then(() => this._mylistApiLoader.addDeflistItem(watchId, description))
.then(result => this.execCommand('notify', result.message))
.catch(err => this.execCommand('alert', err.message ? err.message : 'とりあえずマイリストに登録失敗'))
.then(() => {
window.clearTimeout(timer);
timer = window.setTimeout(unlock, 2000);
});
},
_onDeflistRemove: function (watchId) {
if (this._state.isUpdatingDeflist || !util.isLogin()) {
return;
}
const unlock = () => this._state.isUpdatingDeflist = false;
this._state.isUpdatingDeflist = true;
let timer = window.setTimeout(unlock, 10000);
watchId = watchId || this._videoInfo.watchId;
if (!this._mylistApiLoader) {
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
}
this._mylistApiLoader.removeDeflistItem(watchId)
.then(result => this.execCommand('notify', result.message))
.catch(err => this.execCommand('alert', err.message))
.then(() => {
window.clearTimeout(timer);
timer = window.setTimeout(unlock, 2000);
});
},
_onMylistAdd: function (groupId, mylistName) {
if (this._state.isUpdatingMylist || !util.isLogin()) {
return;
}
const unlock = () => this._state.isUpdatingMylist = false;
this._state.isUpdatingMylist = true;
let timer = window.setTimeout(unlock, 10000);
const owner = this._videoInfo.owner;
const originalVideoId = this._videoInfo.originalVideoId ?
`元動画: ${this._videoInfo.originalVideoId}` : '';
const watchId = this._videoInfo.watchId;
const description =
this._playerConfig.getValue('enableAutoMylistComment') ?
`投稿者: ${owner.name} ${owner.linkId} ${originalVideoId}` : '';
if (!this._mylistApiLoader) {
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
}
this._mylistApiLoader.addMylistItem(watchId, groupId, description)
.then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
.catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
.then(() => {
window.clearTimeout(timer);
timer = window.setTimeout(unlock, 2000);
});
},
_onMylistRemove: function (groupId, mylistName) {
if (this._state.isUpdatingMylist || !util.isLogin()) {
return;
}
const unlock = () => this._state.isUpdatingMylist = false;
this._state.isUpdatingMylist = true;
let timer = window.setTimeout(unlock, 10000);
let watchId = this._videoInfo.watchId;
if (!this._mylistApiLoader) {
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
}
this._mylistApiLoader.removeMylistItem(watchId, groupId)
.then(result => this.execCommand('notify', `${result.message}: ${mylistName}`))
.catch(err => this.execCommand('alert', `${err.message}: ${mylistName}`))
.then(() => {
window.clearTimeout(timer);
timer = window.setTimeout(unlock, 2000);
});
},
_onCommentParsed: function () {
const lang = this._playerConfig.getValue('commentLanguage');
this.emit('commentParsed', lang, this._threadInfo);
ZenzaWatch.emitter.emit('commentParsed');
},
_onCommentChange: function () {
const lang = this._playerConfig.getValue('commentLanguage');
this.emit('commentChange', lang, this._threadInfo);
ZenzaWatch.emitter.emit('commentChange');
},
_onCommentFilterChange: function (filter) {
let config = this._playerConfig;
config.setValue('enableFilter', filter.isEnable());
config.setValue('wordFilter', filter.getWordFilterList());
config.setValue('userIdFilter', filter.getUserIdFilterList());
config.setValue('commandFilter', filter.getCommandFilterList());
this.emit('commentFilterChange', filter);
},
_onVideoPlayerTypeChange: function (type = '') {
switch (type.toLowerCase()) {
case 'youtube':
this._state.setState({isYouTube: true});
break;
default:
this._state.setState({isYouTube: false});
}
},
_onNicosSeek: function (time) {
const ct = this.getCurrentTime();
window.console.info('nicosSeek!', time);
if (this.isPlaylistEnable()) {
// 連続再生中は後方へのシークのみ有効にする
if (ct < time) {
this.execCommand('fastSeek', time);
}
} else {
this.execCommand('fastSeek', time);
}
},
show: function () {
this._state.isOpen = true;
},
hide: function () {
this._state.isOpen = false;
},
open: function (watchId, options) {
if (!watchId) {
return;
}
// 連打対策
if (Date.now() - this._lastOpenAt < 1500 && this._watchId === watchId) {
return;
}
this.refreshLastPlayerId();
this._requestId = 'play-' + Math.random();
this._videoWatchOptions = options = new VideoWatchOptions(watchId, options, this._playerConfig);
if (!options.isPlaylistStartRequest() &&
this.isPlaying() && this.isPlaylistEnable() && !options.isOpenNow()) {
this._onPlaylistInsert(watchId);
return;
}
window.console.log('%copen video: ', 'color: blue;', watchId);
window.console.time('動画選択から再生可能までの時間 watchId=' + watchId);
let nicoVideoPlayer = this._nicoVideoPlayer;
if (!nicoVideoPlayer) {
nicoVideoPlayer = this._initializeNicoVideoPlayer();
} else {
if (this._videoInfo) {
this._savePlaybackPosition(this._videoInfo.contextWatchId, this.getCurrentTime());
}
nicoVideoPlayer.close();
this._view.clearPanel();
this.emit('beforeVideoOpen');
if (this._videoSession) {
this._videoSession.close();
}
}
this._state.resetVideoLoadingStatus();
// watchIdからサムネイルを逆算できる時は最速でセットする
const thumbnail = util.getThumbnailUrlByVideoId(watchId);
this._state.thumbnail = thumbnail;
this._state.isCommentReady = false;
this._watchId = watchId;
this._lastCurrentTime = 0;
this._lastOpenAt = Date.now();
this._state.isError = false;
VideoInfoLoader.load(watchId, options.getVideoLoadOptions()).then(
this._onVideoInfoLoaderLoad.bind(this, this._requestId)).catch(
this._onVideoInfoLoaderFail.bind(this, this._requestId)
);
this.show();
if (this._playerConfig.getValue('autoFullScreen') && !util.fullscreen.now()) {
nicoVideoPlayer.requestFullScreen();
}
this.emit('open', watchId, options);
ZenzaWatch.emitter.emitAsync('DialogPlayerOpen', watchId, options);
},
isOpen: function () {
return this._state.isOpen;
},
reload: function (options) {
options = this._videoWatchOptions.createForReload(options);
if (this._lastCurrentTime > 0) {
options.currentTime = this._lastCurrentTime;
}
this.open(this._watchId, options);
},
getCurrentTime: function () {
if (!this._nicoVideoPlayer) {
return 0;
}
let ct = this._nicoVideoPlayer.getCurrentTime() * 1;
if (!this._state.isError && ct > 0) {
this._lastCurrentTime = ct;
}
return this._lastCurrentTime;
},
setCurrentTime: function (sec) {
if (!this._nicoVideoPlayer) {
return;
}
this._nicoVideoPlayer.setCurrentTime(sec);
this._lastCurrentTime = sec;
},
getId: function () {
return this._id;
},
isLastOpenedPlayer: function () {
return this.getId() === this._playerConfig.getValue('lastPlayerId', true);
},
refreshLastPlayerId: function () {
if (this.isLastOpenedPlayer()) {
return;
}
this._playerConfig.setValue('lastPlayerId', '');
this._playerConfig.setValue('lastPlayerId', this.getId());
},
_onVideoInfoLoaderLoad: function (requestId, videoInfoData, type, watchId) {
console.log('VideoInfoLoader.load!', requestId, watchId, type, videoInfoData);
if (this._requestId !== requestId) {
return;
}
const videoInfo = this._videoInfo = new VideoInfoModel(videoInfoData);
let serverType = 'dmc';
if (!videoInfo.isDmcAvailable) {
serverType = 'smile';
} else if (videoInfo.isDmcOnly) {
serverType = 'dmc';
} else if (['dmc', 'smile'].includes(this._videoWatchOptions.getVideoServerType())) {
serverType = this._videoWatchOptions.getVideoServerType();
} else if (this._playerConfig.getValue('videoServerType') === 'smile') {
serverType = 'smile';
} else {
const disableDmc =
this._playerConfig.getValue('autoDisableDmc') &&
this._videoWatchOptions.getVideoServerType() !== 'smile' &&
videoInfo.maybeBetterQualityServerType === 'smile';
serverType = disableDmc ? 'smile' : 'dmc';
}
this._state.setState({
isDmcAvailable: videoInfo.isDmcAvailable,
isCommunity: videoInfo.isCommunityVideo,
isMymemory: videoInfo.isMymemory,
isChannel: videoInfo.isChannel
});
this._videoSession = VideoSession.createInstance({
videoInfo,
videoWatchOptions: this._videoWatchOptions,
videoQuality: this._playerConfig.getValue('dmcVideoQuality'),
serverType,
isPlayingCallback: this.isPlaying.bind(this),
useWellKnownPort: this._playerConfig.getValue('useWellKnownPort'),
useHLS: !!ZenzaWatch.debug.isHLSSupported
});
if (this._videoFilter.isNgVideo(videoInfo)) {
return this._onVideoFilterMatch();
}
if (this._videoSession.isDmc) {
NVWatchCaller.call(videoInfo.dmcInfo.trackingId)
.then(() => {
return this._videoSession.connect();
})
.then(sessionInfo => {
this.setVideo(sessionInfo.url);
videoInfo.setCurrentVideo(sessionInfo.url);
this.emit('videoServerType', 'dmc', sessionInfo, videoInfo);
})
.catch(this._onVideoSessionFail.bind(this));
} else {
if (this._playerConfig.getValue('enableVideoSession')) {
this._videoSession.connect();
}
videoInfo.setCurrentVideo(videoInfo.videoUrl);
this.setVideo(videoInfo.videoUrl);
this.emit('videoServerType', 'smile', {}, videoInfo);
}
this._state.videoInfo = videoInfo;
this._state.isDmcPlaying = this._videoSession.isDmc;
this.loadComment(videoInfo.msgInfo);
this.emit('loadVideoInfo', videoInfo);
if (Fullscreen.now() || this._playerConfig.getValue('screenMode') === 'wide') {
this.execCommand('notifyHtml',
'<img src="' + videoInfo.thumbnail + '" style="width: 96px;">' +
util.escapeToZenkaku(videoInfo.title)
);
}
},
setVideo: function (url) {
this._state.setState({
isYouTube: url.indexOf('youtube') >= 0,
currentSrc: url
});
},
loadComment: function (msgInfo) {
msgInfo.language = this._playerConfig.getValue('commentLanguage');
this._messageApiLoader.load(msgInfo).then(
this._onCommentLoadSuccess.bind(this, this._requestId),
this._onCommentLoadFail.bind(this, this._requestId)
);
},
reloadComment: function (param = {}) {
const msgInfo = this._videoInfo.msgInfo;
if (typeof param.when === 'number') {
msgInfo.when = param.when;
}
this.loadComment(msgInfo);
},
_onVideoInfoLoaderFail: function (requestId, e) {
const watchId = e.watchId;
window.console.error('_onVideoInfoLoaderFail', watchId, e);
if (this._requestId !== requestId) {
return;
}
this._setErrorMessage(e.message || '通信エラー', watchId);
this._state.isError = true;
if (e.info) {
this._videoInfo = new VideoInfoModel(e.info);
this._state.videoInfo = this._videoInfo;
this.emit('loadVideoInfoFail', this._videoInfo);
} else {
this.emit('loadVideoInfoFail');
}
ZenzaWatch.emitter.emitAsync('loadVideoInfoFail', e);
if (!this.isPlaylistEnable()) {
return;
}
if (e.reason === 'forbidden' || e.info.isPlayable === false) {
window.setTimeout(() => this.playNextVideo(), 3000);
}
},
_onVideoSessionFail: function (result) {
window.console.error('dmc fail', result);
this._setErrorMessage('動画の読み込みに失敗しました(dmc.nico)', this._watchId);
this._state.setState({isError: true, isLoading: false});
if (this.isPlaylistEnable()) {
window.setTimeout(() => {
this.playNextVideo();
}, 3000);
}
},
_onVideoPlayStartFail: function (err) {
window.console.error('動画再生開始に失敗', err);
if (!(err instanceof DOMException)) { //
return;
}
console.warn('play() request was rejected code: %s. message: %s', err.code, err.message);
const message = err.message;
switch (message) {
case 'SessionClosedError':
// TODO: DMCのセッション切れなら自動リロード
// if (this._videoSession.isDeleted && !this._videoSession.isAbnormallyClosed) {
// window.console.info('%cリロードしたら直るかも', 'background: yellow');
//
// }
if (this._playserState.isError) { break; }
this._setErrorMessage('動画の再生開始に失敗しました', this._watchId);
this._state.setVideoErrorOccurred();
break;
case 'AbortError': // 再生開始を待っている間に動画変更などで中断された等
case 'NotAllowedError': // 自動再生のブロック
default:
break;
}
this.emit('loadVideoPlayStartFail');
ZenzaWatch.emitter.emitAsync('loadVideoPlayStartFail');
},
_onVideoFilterMatch: function () {
window.console.error('ng video', this._watchId);
this._setErrorMessage('再生除外対象の動画または投稿者です');
this._state.isError = true;
this.emit('error');
if (this.isPlaylistEnable()) {
window.setTimeout(() => this.playNextVideo(), 3000);
}
},
_setErrorMessage: function (msg) {
this._state.errorMessage = msg;
},
_onCommentLoadSuccess: function (requestId, result) {
if (requestId !== this._requestId) {
return;
}
let options = {
replacement: this._videoInfo.replacementWords,
duration: this._videoInfo.duration,
mainThreadId: result.threadInfo.threadId,
format: result.format
};
this._nicoVideoPlayer.closeCommentPlayer();
this._threadInfo = result.threadInfo;
this._nicoVideoPlayer.setComment(result.body, options);
this._state.isCommentReady = true;
this._state.isWaybackMode = result.threadInfo.isWaybackMode;
this.emit('commentReady', result, this._threadInfo);
this.emit('videoCount', {comment: result.threadInfo.totalResCount});
},
_onCommentLoadFail: function (requestId, e) {
if (requestId !== this._requestId) {
return;
}
this.execCommand('alert', e.message);
},
_onLoadedMetaData: function () {
// YouTubeは動画指定時にパラメータで開始位置を渡すので不要
if (this._state.isYouTube) {
return;
}
// パラメータで開始秒数が指定されていたらそこにシーク
let currentTime = this._videoWatchOptions.getCurrentTime();
if (currentTime > 0) {
this.setCurrentTime(currentTime);
}
},
_onVideoCanPlay: function () {
if (!this._state.isLoading) {
return;
}
window.console.timeEnd('動画選択から再生可能までの時間 watchId=' + this._watchId);
this._playerConfig.setValue('lastWatchId', this._watchId);
if (this._videoWatchOptions.isPlaylistStartRequest()) {
this._initializePlaylist();
let option = this._videoWatchOptions.getMylistLoadOptions();
let query = this._videoWatchOptions.getQuery();
// 通常時はプレイリストの置き換え、
// 連続再生中はプレイリストに追加で読み込む
option.append = this.isPlaying() && this._playlist.isEnable;
// //www.nicovideo.jp/watch/sm20353707 // プレイリスト開幕用動画
option.shuffle = parseInt(query.shuffle, 10) === 1;
console.log('playlist option:', option);
if (query.playlist_type === 'mylist') {
this._playlist.loadFromMylist(option.group_id, option);
} else if (query.playlist_type === 'deflist') {
this._playlist.loadFromMylist('deflist', option);
} else if (query.playlist_type === 'tag' || query.playlist_type === 'search') {
let word = query.tag || query.keyword;
option.searchType = query.tag ? 'tag' : '';
option = Object.assign(option, query);
this._playlist.loadSearchVideo(word, option, this._playerConfig.getValue('search.limit'));
}
this._playlist.toggleEnable(true);
} else if (PlaylistSession.isExist() && !this._playlist) {
this._initializePlaylist();
this._playlist.restoreFromSession();
} else {
this._initializePlaylist();
}
// チャンネル動画は、1本の動画がwatchId表記とvideoId表記で2本登録されてしまう。
// そこでwatchId表記のほうを除去する
this._playlist.insertCurrentVideo(this._videoInfo);
if (this._videoInfo.watchId !== this._videoInfo.videoId &&
this._videoInfo.videoId.indexOf('so') === 0) {
this._playlist.removeItemByWatchId(this._videoInfo.watchId);
}
this._state.setVideoCanPlay();
this.emitAsync('canPlay', this._watchId, this._videoInfo, this._videoWatchOptions);
// プレイリストによって開かれた時は、自動再生設定に関係なく再生する
if (this._videoWatchOptions.getEventType() === 'playlist' && this.isOpen()) {
this.play();
}
if (this._nextVideo) {
const nextVideo = this._nextVideo;
this._nextVideo = null;
if (!this._playlist) {
return;
}
if (!this._playerConfig.getValue('enableNicosJumpVideo')) {
return;
}
const nv = this._playlist.findByWatchId(nextVideo);
if (nv && nv.isPlayed()) {
return;
} // 既にリストにあって再生済みなら追加しない(無限ループ対策)
this.execCommand('notify', '@ジャンプ: ' + nextVideo);
this.execCommand('playlistInsert', nextVideo);
}
},
_onVideoPlay: function () {
this._state.setPlaying();
this.emit('play');
},
_onVideoPlaying: function () {
this._state.setPlaying();
this.emit('playing');
},
_onVideoSeeking: function () {
this._state.isSeeking = true;
this.emit('seeking');
},
_onVideoSeeked: function () {
this._state.isSeeking = false;
this.emit('seeked');
},
_onVideoPause: function () {
this._savePlaybackPosition(this._videoInfo.contextWatchId, this.getCurrentTime());
this.emit('pause');
},
_onVideoStalled: function () {
this._state.isStalled = true;
this.emit('stalled');
},
_onVideoTimeUpdate: function () {
this._state.isStalled = false;
},
_onVideoProgress: function (range, currentTime) {
this.emit('progress', range, currentTime);
},
_onVideoError: function (e) {
this._state.setVideoErrorOccurred();
if (e.type === 'youtube') {
return this._onYouTubeVideoError(e);
}
if (!this._videoInfo) {
this._setErrorMessage('動画の再生に失敗しました。');
return;
}
const retry = params => {
setTimeout(() => {
if (!this.isOpen()) {
return;
}
this.reload(params);
}, 3000);
};
const videoWatchOptions = this._videoWatchOptions;
const isDmcPlaying = this._videoSession.isDmc;
const code = (e && e.target && e.target.error && e.target.error.code) || 0;
window.console.error('VideoError!', code, e, (e.target && e.target.error), this._videoSession.isDeleted, this._videoSession.isAbnormallyClosed);
if (this._state.isPausing && this._videoSession.isDeleted) {
this._setErrorMessage(`停止中に動画のセッションが切断されました。(code:${code})`);
} else if (Date.now() - this._lastOpenAt > 3 * 60 * 1000 &&
this._videoSession.isDeleted && !this._videoSession.isAbnormallyClosed) {
if (videoWatchOptions.getReloadCount() < 5) {
retry();
} else {
this._setErrorMessage('動画のセッションが切断されました。');
}
} else if (!isDmcPlaying && this._videoInfo.isDmcAvailable) {
this._setErrorMessage('SMILE動画の再生に失敗しました。DMC動画に接続します。');
retry({economy: false, videoServerType: 'dmc'});
} else if (!isDmcPlaying && (!this._videoWatchOptions.isEconomySelected() && !this._videoInfo.isEconomy)) {
this._setErrorMessage('動画の再生に失敗しました。エコノミー動画に接続します。');
retry({economy: true, videoServerType: 'smile'});
} else {
this._setErrorMessage('動画の再生に失敗しました。');
}
this.emit('error', e, code);
},
_onYouTubeVideoError: function (e) {
window.console.error('onYouTubeVideoError!', e);
this._setErrorMessage(e.description);
this.emit('error', e);
if (e.fallback) {
setTimeout(() => this.reload({isAutoZenTubeDisabled: true}), 3000);
}
},
_onVideoAbort: function () {
this.emit('abort');
},
_onVideoAspectRatioFix: function (ratio) {
this.emit('aspectRatioFix', ratio);
},
_onVideoEnded: function () {
// ループ再生中は飛んでこない
this.emitAsync('ended');
this._state.setVideoEnded();
this._savePlaybackPosition(this._videoInfo.contextWatchId, 0);
if (this.isPlaylistEnable() && this._playlist.hasNext) {
this.playNextVideo({eventType: 'playlist'});
return;
} else if (this._playlist) {
this._playlist.toggleEnable(false);
}
let isAutoCloseFullScreen =
this._videoWatchOptions.hasKey('autoCloseFullScreen') ?
this._videoWatchOptions.isAutoCloseFullScreen() :
this._playerConfig.getValue('autoCloseFullScreen');
if (Fullscreen.now() && isAutoCloseFullScreen) {
Fullscreen.cancel();
}
ZenzaWatch.emitter.emitAsync('videoEnded');
},
_onVolumeChange: function (vol, mute) {
this.emit('volumeChange', vol, mute);
},
_onVolumeChangeEnd: function (vol, mute) {
this.emit('volumeChangeEnd', vol, mute);
},
_savePlaybackPosition: function (contextWatchId, ct) {
if (!util.isLogin()) {
return;
}
const vi = this._videoInfo;
if (!vi) {
return;
}
const dr = this.getDuration();
console.info('%csave PlaybackPosition:', 'background: cyan', ct, dr, vi.csrfToken);
if (vi.contextWatchId !== contextWatchId) {
return;
}
if (Math.abs(ct - dr) < 3) {
return;
}
if (dr < 120) {
return;
} // 短い動画は記録しない
PlaybackPosition.record(
contextWatchId,
ct,
vi.csrfToken
).catch((e) => {
window.console.warn('save playback fail', e);
});
},
close: function () {
if (this.isPlaying()) {
this._savePlaybackPosition(this._watchId, this.getCurrentTime());
}
if (Fullscreen.now()) {
Fullscreen.cancel();
}
this.pause();
this.hide();
this._refresh();
this.emit('close');
ZenzaWatch.emitter.emitAsync('DialogPlayerClose');
},
_refresh: function () {
if (this._nicoVideoPlayer) {
this._nicoVideoPlayer.close();
}
if (this._videoSession) {
this._videoSession.close();
}
},
_initializePlaylist: function () {
if (this._playlist) {
return;
}
let $container = this._view.appendTab('playlist', 'プレイリスト');
this._playlist = new Playlist({
loader: ZenzaWatch.api.ThumbInfoLoader,
container: $container[0],
loop: this._playerConfig.getValue('playlistLoop')
});
this._playlist.on('command', this._onCommand.bind(this));
this._playlist.on('update', _.debounce(this._onPlaylistStatusUpdate.bind(this), 100));
},
_initializeCommentPanel: function () {
if (this._commentPanel) {
return;
}
let $container = this._view.appendTab('comment', 'コメント');
this._commentPanel = new CommentPanel({
player: this,
$container: $container,
autoScroll: this._playerConfig.getValue('enableCommentPanelAutoScroll'),
language: this._playerConfig.getValue('commentLanguage')
});
this._commentPanel.on('command', this._onCommand.bind(this));
this._commentPanel.on('update', _.debounce(this._onCommentPanelStatusUpdate.bind(this), 100));
},
isPlaylistEnable: function () {
return this._playlist && this._playlist.isEnable;
},
playNextVideo: function (options) {
if (!this._playlist || !this.isOpen()) {
return;
}
let opt = this._videoWatchOptions.createForVideoChange(options);
let nextId = this._playlist.selectNext();
if (nextId) {
this.open(nextId, opt);
}
},
playPreviousVideo: function (options) {
if (!this._playlist || !this.isOpen()) {
return;
}
let opt = this._videoWatchOptions.createForVideoChange(options);
let prevId = this._playlist.selectPrevious();
if (prevId) {
this.open(prevId, opt);
}
},
play: function () {
if (!this._state.isError && this._nicoVideoPlayer) {
this._nicoVideoPlayer.play().catch((e) => {
this._onVideoPlayStartFail(e);
});
}
},
pause: function () {
if (!this._state.isError && this._nicoVideoPlayer) {
this._nicoVideoPlayer.pause();
this._state.setPausing();
}
},
isPlaying: function () {
return this._state.isPlaying;
},
togglePlay: function () {
if (!this._state.isError && this._nicoVideoPlayer) {
if (this.isPlaying()) {
this.pause();
return;
}
this._nicoVideoPlayer.togglePlay().catch((e) => {
this._onVideoPlayStartFail(e);
});
}
},
setVolume: function (v) {
if (this._nicoVideoPlayer) {
this._nicoVideoPlayer.setVolume(v);
}
},
addChat: function (text, cmd, vpos, options) {
if (!this._nicoVideoPlayer ||
!this._messageApiLoader ||
!this._state.isCommentReady ||
this._state.isCommentPosting) {
return Promise.reject();
}
if (!util.isLogin()) {
return Promise.reject();
}
// TODO: 通信周りはThreadLoaderのほうに移す
// force184のスレッドに184コマンドをつけてしまうとエラー. 同じなんだから無視すりゃいいだろが
if (this._threadInfo.force184 !== '1') {
cmd = '184 ' + cmd;
}
options = options || {};
options.isMine = true;
options.isUpdating = true;
options.thread = this._threadInfo.threadId * 1;
vpos = vpos || this._nicoVideoPlayer.getVpos();
const nicoChat = this._nicoVideoPlayer.addChat(text, cmd, vpos, options);
this._state.isCommentPosting = true;
const lang = this._playerConfig.getValue('commentLanguage');
window.console.time('コメント投稿');
const _onSuccess = result => {
window.console.timeEnd('コメント投稿');
nicoChat.setIsUpdating(false);
nicoChat.setNo(result.no);
this.execCommand('notify', 'コメント投稿成功');
this._state.isCommentPosting = false;
this._threadInfo.blockNo = result.blockNo;
return Promise.resolve(result);
};
const _onFailFinal = err => {
err = err || {};
window.console.log('_onFailFinal: ', err);
window.console.timeEnd('コメント投稿');
nicoChat.setIsPostFail(true);
nicoChat.setIsUpdating(false);
this.execCommand('alert', err.message);
this._state.isCommentPosting = false;
if (err.blockNo && typeof err.blockNo === 'number') {
this._threadInfo.blockNo = err.blockNo;
}
return Promise.reject(err);
};
const _retryPost = () => {
window.console.info('retry: コメント投稿');
return new Sleep(3000).then(() => {
return this._messageApiLoader
.postChat(this._threadInfo, text, cmd, vpos, lang);
}).then(_onSuccess).catch(_onFailFinal);
};
const _onTicketFail = err => {
this._messageApiLoader.load(this._videoInfo.msgInfo).then(
result => {
window.console.log('ticket再取得 success');
this._threadInfo = result.threadInfo;
return _retryPost();
}).catch(e => {
window.console.log('ticket再取得 fail: ', e);
_onFailFinal(err);
}
);
};
const _onFail1st = err => {
err = err || {};
const errorCode = parseInt(err.code, 10);
window.console.log('_onFail1st: ', errorCode);
if (err.blockNo && typeof err.blockNo === 'number') {
this._threadInfo.blockNo = err.blockNo;
}
if (errorCode === 3) {
return _onTicketFail(err);
} else if (![2, 4, 5].includes(errorCode)) {
return _onFailFinal(err);
}
return _retryPost();
};
return this._messageApiLoader.postChat(this._threadInfo, text, cmd, vpos, lang)
.then(_onSuccess).catch(_onFail1st);
},
getDuration: function () {
if (!this._videoInfo) {
return 0;
}
return this._videoInfo.duration;
},
getBufferedRange: function () {
return this._nicoVideoPlayer.getBufferedRange();
},
getNonFilteredChatList: function () {
return this._nicoVideoPlayer.getNonFilteredChatList();
},
getChatList: function () {
return this._nicoVideoPlayer.getChatList();
},
getPlayingStatus: function () {
if (!this._nicoVideoPlayer || !this._nicoVideoPlayer.isPlaying()) {
return {};
}
const session = {
playing: true,
watchId: this._watchId,
url: location.href,
currentTime: this._nicoVideoPlayer.getCurrentTime()
};
const options = this._videoWatchOptions.createForSession();
Object.keys(options).forEach(key => {
session[key] = session.hasOwnProperty(key) ? session[key] : options[key];
});
return session;
},
getMymemory: function () {
return this._nicoVideoPlayer.getMymemory();
}
});
class VideoHoverMenu {
constructor(...args) {
this.initialize(...args);
}
}
util.addStyle(`
.menuItemContainer {
box-sizing: border-box;
position: absolute;
z-index: ${CONSTANT.BASE_Z_INDEX + 40000};
overflow: visible;
will-change: transform, opacity;
user-select: none;
}
.menuItemContainer .menuButton {
width: 32px;
height:32px;
font-size: 24px;
background: #888;
color: #000;
border: 1px solid #666;
border-radius: 4px;
line-height: 30px;
white-space: nowrap;
text-align: center;
cursor: pointer;
outline: none;
}
.menuItemContainer:hover .menuButton {
pointer-events: auto;
}
.menuItemContainer.rightTop {
width: 200px;
height: 40px;
right: 0px;
top: 0;
perspective: 150px;
perspective-origin: center;
}
.menuItemContainer.rightTop .scalingUI {
transform-origin: right top;
}
.is-updatingDeflist .menuItemContainer.rightTop,
.is-updatingMylist .menuItemContainer.rightTop {
cursor: wait;
opacity: 1 !important;
}
.is-updatingDeflist .menuItemContainer.rightTop>*,
.is-updatingMylist .menuItemContainer.rightTop>* {
pointer-events: none;
}
.menuItemContainer.leftTop {
width: auto;
height: auto;
left: 32px;
top: 32px;
display: none;
}
.is-debug .menuItemContainer.leftTop {
display: inline-block !important;
opacity: 1 !important;
transition: none !important;
transform: translateZ(0);
max-width: 200px;
}
.menuItemContainer.leftBottom {
width: 120px;
height: 32px;
left: 8px;
bottom: 48px;
transform-origin: left bottom;
}
.menuItemContainer.rightBottom {
width: 120px;
height: 80px;
right: 0;
bottom: 8px;
}
.menuItemContainer.onErrorMenu {
position: absolute;
left: 50%;
top: 60%;
transform: translate(-50%, 0);
display: none;
white-space: nowrap;
}
.is-error .onErrorMenu {
display: block !important;
opacity: 1 !important;
}
.is-youTube .onErrorMenu .for-nicovideo,
.onErrorMenu .for-ZenTube {
display: none;
}
.is-youTube.is-error .onErrorMenu .for-ZenTube {
display: inline-block;
}
.onErrorMenu .menuButton {
position: relative;
display: inline-block !important;
margin: 0 16px;
padding: 8px;
background: #888;
color: #000;
opacity: 1;
cursor: pointer;
border-radius: 0;
box-shadow: 4px 4px 0 #333;
border: 2px outset;
width: 100px;
font-size: 14px;
line-height: 16px;
}
.menuItemContainer.onErrorMenu .menuButton:active {
background: var(--base-fore-color);
border: 2px inset;
}
.menuItemContainer.onErrorMenu .playNextVideo {
display: none !important;
}
.is-playlistEnable .menuItemContainer.onErrorMenu .playNextVideo {
display: inline-block !important;
}
.menuButton {
position: absolute;
opacity: 0;
transition:
opacity 0.4s ease,
box-shadow 0.2s ease,
background 0.4s ease;
box-sizing: border-box;
text-align: center;
text-shadow: none;
user-select: none;
}
.menuButton:focus-within,
.menuButton:hover {
box-shadow: 0 2px 0 #000;
cursor: pointer;
opacity: 1;
background: #888;
color: #000;
}
.menuButton:active {
transform: translate(0, 2px);
box-shadow: 0 0 0 #000;
transition: none;
}
.menuButton .tooltip {
display: none;
pointer-events: none;
position: absolute;
left: 16px;
top: -24px;
font-size: 12px;
line-height: 16px;
padding: 2px 4px;
border: 1px solid !000;
background: #ffc;
color: black;
box-shadow: 2px 2px 2px #fff;
text-shadow: none;
white-space: nowrap;
z-index: 100;
opacity: 0.8;
}
.menuButton:hover .tooltip {
display: block;
}
.menuButton:avtive .tooltip {
display: none;
}
.menuButton:active .zenzaPopupMenu {
transform: translate(0, -2px);
transition: none;
}
.hoverMenuContainer .menuButton:focus-within {
pointer-events: none;
}
.hoverMenuContainer .menuButton:focus-within .zenzaPopupMenu,
.hoverMenuContainer .menuButton .zenzaPopupMenu:hover {
pointer-events: auto;
visibility: visible;
opacity: 0.99;
pointer-events: auto;
transition: opacity 0.3s;
}
.rightTop .menuButton .tooltip {
top: auto;
bottom: -24px;
right: -16px;
left: auto;
}
.rightBottom .menuButton .tooltip {
right: 16px;
left: auto;
}
.is-mouseMoving .menuButton {
opacity: 0.8;
background: rgba(80, 80, 80, 0.5);
border: 1px solid #888;
transition:
box-shadow 0.2s ease,
background 0.4s ease;
}
.is-mouseMoving .menuButton .menuButtonInner {
opacity: 0.8;
word-break: normal;
transition:
box-shadow 0.2s ease,
background 0.4s ease;
}
.showCommentSwitch {
left: 0;
width: 32px;
height: 32px;
background:#888;
color: #000;
border: 1px solid #666;
line-height: 30px;
filter: grayscale(100%);
border-radius: 4px;
}
.is-showComment .showCommentSwitch {
color: #fff;
filter: none;
text-decoration: none;
}
.showCommentSwitch .menuButtonInner {
text-decoration: line-through;
}
.is-showComment .showCommentSwitch .menuButtonInner {
text-decoration: none;
}
.ngSettingMenu {
display: none;
left: 80px;
}
.is-showComment .ngSettingMenu {
display: block;
}
.ngSettingMenu .menuButtonInner {
font-size: 18px;
}
.ngSettingSelectMenu {
white-space: nowrap;
bottom: 0px;
left: 32px;
font-size: 18px;
}
.ngSettingMenu:active .ngSettingSelectMenu {
transition: none;
}
.ngSettingSelectMenu .triangle {
transform: rotate(45deg);
left: -8px;
bottom: 3px;
}
.ngSettingSelectMenu .sharedNgLevelSelect {
display: none;
}
.ngSettingSelectMenu.is-enableFilter .sharedNgLevelSelect {
display: block;
}
.menuItemContainer .mylistButton {
font-size: 21px;
}
.mylistButton.mylistAddMenu {
left: 40px;
top: 0;
}
.mylistButton.deflistAdd {
left: 80px;
top: 0;
}
@keyframes spinX {
0% { transform: rotateX(0deg); }
100% { transform: rotateX(1800deg); }
}
@keyframes spinY {
0% { transform: rotateY(0deg); }
100% { transform: rotateY(1800deg); }
}
.is-updatingDeflist .mylistButton.deflistAdd {
pointer-events: none;
opacity: 1 !important;
border: 1px inset !important;
box-shadow: none !important;
background: #888 !important;
color: #000 !important;
animation-name: spinX;
animation-iteration-count: infinite;
animation-duration: 6s;
animation-timing-function: linear;
}
.is-updatingDeflist .mylistButton.deflistAdd .tooltip {
display: none;
}
.mylistButton.mylistAddMenu:focus-within,
.is-updatingMylist .mylistButton.mylistAddMenu {
pointer-events: none;
opacity: 1 !important;
border: 1px inset #000 !important;
color: #000 !important;
box-shadow: none !important;
}
.mylistButton.mylistAddMenu:focus-within {
background: #888 !important;
}
.is-updatingMylist .mylistButton.mylistAddMenu {
background: #888 !important;
color: #000 !important;
animation-name: spinX;
animation-iteration-count: infinite;
animation-duration: 6s;
animation-timing-function: linear;
}
.mylistSelectMenu {
top: 36px;
right: -48px;
padding: 8px 0;
font-size: 13px;
}
.is-updatingMylist .mylistSelectMenu {
display: none;
}
.mylistSelectMenu .mylistSelectMenuInner {
overflow-y: auto;
overflow-x: hidden;
max-height: 50vh;
overscroll-behavior: contain;
}
.mylistSelectMenu .triangle {
transform: rotate(135deg);
top: -8.5px;
right: 55px;
}
.mylistSelectMenu ul li {
line-height: 120%;
overflow-y: visible;
border-bottom: none;
}
.mylistSelectMenu .mylistIcon {
display: inline-block;
width: 18px;
height: 14px;
margin: -4px 4px 0 0;
vertical-align: middle;
margin-right: 15px;
background: url("//nicovideo.cdn.nimg.jp/uni/img/zero_my/icon_folder_default.png") no-repeat scroll 0 0 transparent;
transform: scale(1.5);
transform-origin: 0 0 0;
transition: transform 0.1s ease, box-shadow 0.1s ease;
cursor: pointer;
}
.mylistSelectMenu .mylistIcon:hover {
background-color: #ff9;
transform: scale(2);
}
.mylistSelectMenu .mylistIcon:hover::after {
background: #fff;
z-index: 100;
opacity: 1;
}
.mylistSelectMenu .deflist .mylistIcon { background-position: 0 -253px;}
.mylistSelectMenu .folder1 .mylistIcon { background-position: 0 -23px;}
.mylistSelectMenu .folder2 .mylistIcon { background-position: 0 -46px;}
.mylistSelectMenu .folder3 .mylistIcon { background-position: 0 -69px;}
.mylistSelectMenu .folder4 .mylistIcon { background-position: 0 -92px;}
.mylistSelectMenu .folder5 .mylistIcon { background-position: 0 -115px;}
.mylistSelectMenu .folder6 .mylistIcon { background-position: 0 -138px;}
.mylistSelectMenu .folder7 .mylistIcon { background-position: 0 -161px;}
.mylistSelectMenu .folder8 .mylistIcon { background-position: 0 -184px;}
.mylistSelectMenu .folder9 .mylistIcon { background-position: 0 -207px;}
.mylistSelectMenu .name {
display: inline-block;
width: calc(100% - 20px);
vertical-align: middle;
font-size: 110%;
color: #fff;
text-decoration: none !important;
}
.mylistSelectMenu .name:hover {
color: #fff;
}
.mylistSelectMenu .name::after {
content: ' に登録';
font-size: 75%;
color: #333;
}
.mylistSelectMenu li:hover .name::after {
color: #fff;
}
.zenzaTweetButton:hover {
text-shadow: 1px 1px 2px #88c;
background: #1da1f2;
color: #fff;
}
.menuItemContainer .menuButton.closeButton {
position: absolute;
font-size: 20px;
top: 0;
right: 0;
z-index: ${CONSTANT.BASE_Z_INDEX + 60000};
margin: 0 0 40px 40px;
color: #ccc;
border: solid 1px #888;
border-radius: 0;
transition:
opacity 0.4s ease,
transform 0.2s ease,
background 0.2s ease,
box-shadow 0.2s ease
;
pointer-events: auto;
transform-origin: center center;
}
.is-mouseMoving .closeButton,
.closeButton:hover {
opacity: 1;
background: rgba(0, 0, 0, 0.8);
}
.closeButton:hover {
background: rgba(33, 33, 33, 0.9);
box-shadow: 4px 4px 4px #000;
}
.closeButton:active {
transform: scale(0.5);
}
.menuItemContainer .toggleDebugButton {
position: relative;
display: inline-block;
opacity: 1 !important;
padding: 8px 16px;
color: #000;
box-shadow: none;
font-size: 21px;
border: 1px solid black;
background: rgba(192, 192, 192, 0.8);
width: auto;
height: auto;
}
.togglePlayMenu {
display: none;
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%) scale(1.5);
width: 80px;
height: 45px;
font-size: 35px;
line-height: 45px;
border-radius: 8px;
text-align: center;
color: var(--base-fore-color);
z-index: ${CONSTANT.BASE_Z_INDEX + 10};
background: rgba(0, 0, 0, 0.8);
transition: transform 0.2s ease, box-shadow 0.2s, text-shadow 0.2s, font-size 0.2s;
box-shadow: 0 0 2px rgba(255, 255, 192, 0.8);
cursor: pointer;
}
.togglePlayMenu:hover {
transform: translate(-50%, -50%) scale(1.6);
text-shadow: 0 0 4px #888;
box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
}
.togglePlayMenu:active {
transform: translate(-50%, -50%) scale(2.0, 1.2);
font-size: 30px;
box-shadow: 0 0 4px inset rgba(0, 0, 0, 0.8);
text-shadow: none;
transition: transform 0.1s ease;
}
.is-notPlayed .togglePlayMenu {
display: block;
}
.is-playing .togglePlayMenu,
.is-error .togglePlayMenu,
.is-loading .togglePlayMenu {
display: none;
}
`, {className: 'videoHoverMenu'});
util.addStyle(`
.menuItemContainer.leftBottom {
bottom: 64px;
}
.menuItemContainer.leftBottom .scalingUI {
transform-origin: left bottom;
}
.menuItemContainer.leftBottom .scalingUI {
height: 64px;
}
.menuItemContainer.rightBottom {
bottom: 64px;
}
.ngSettingSelectMenu {
bottom: 0px;
}
`, {className: 'videoHoverMenu screenMode for-full'});
VideoHoverMenu.__tpl__ = (`
<div class="hoverMenuContainer">
<div class="menuItemContainer leftTop">
<div class="menuButton toggleDebugButton" data-command="toggle-debug">
<div class="menuButtonInner">debug mode</div>
</div>
</div>
<div class="menuItemContainer rightTop">
<div class="scalingUI">
<div class="menuButton zenzaTweetButton" data-command="tweet">
<div class="tooltip">ツイート</div>
<div class="menuButtonInner">t</div>
</div>
<div class="menuButton mylistButton mylistAddMenu forMember"
data-command="nop" tabindex="-1" data-has-submenu="1">
<div class="tooltip">マイリスト登録</div>
<div class="menuButtonInner">My</div>
<div class="mylistSelectMenu selectMenu zenzaPopupMenu forMember">
<div class="triangle"></div>
<div class="mylistSelectMenuInner">
</div>
</div>
</div>
<div class="menuButton mylistButton deflistAdd forMember" data-command="deflistAdd">
<div class="tooltip">とりあえずマイリスト(T)</div>
<div class="menuButtonInner">&#x271A;</div>
</div>
<div class="menuButton closeButton" data-command="close">
<div class="menuButtonInner">&#x2716;</div>
</div>
</div>
</div>
<div class="menuItemContainer leftBottom">
<div class="scalingUI">
<div class="showCommentSwitch menuButton" data-command="toggle-showComment">
<div class="tooltip">コメント表示ON/OFF(V)</div>
<div class="menuButtonInner">💬</div>
</div>
<div class="ngSettingMenu menuButton" data-command="nop"
data-has-submenu="1" tabindex="-1">
<div class="tooltip">NG設定</div>
<div class="menuButtonInner">NG</div>
<div class="ngSettingSelectMenu selectMenu zenzaPopupMenu">
<div class="triangle"></div>
<p class="caption">NG設定</p>
<ul>
<li class="update-enableFilter"
data-command="update-enableFilter"
data-param="true" data-type="bool"><span>ON</span></li>
<li class="update-enableFilter"
data-command="update-enableFilter"
data-param="false" data-type="bool"><span>OFF</span></li>
</ul>
<p class="caption sharedNgLevelSelect">NG共有設定</p>
<ul class="sharedNgLevelSelect">
<li class="sharedNgLevel max"
data-command="update-sharedNgLevel"
data-param="MAX"><span>最強</span></li>
<li class="sharedNgLevel high"
data-command="update-sharedNgLevel"
data-param="HIGH"><span>強</span></li>
<li class="sharedNgLevel mid"
data-command="update-sharedNgLevel"
data-param="MID"><span>中</span></li>
<li class="sharedNgLevel low"
data-command="update-sharedNgLevel"
data-param="LOW"><span>弱</span></li>
<li class="sharedNgLevel none"
data-command="update-sharedNgLevel"
data-param="NONE"><span>なし</span></li>
</ul>
</div>
</div>
</div>
</div>
<div class="menuItemContainer onErrorMenu">
<div class="menuButton openGinzaMenu" data-command="openGinza">
<div class="menuButtonInner">GINZAで視聴</div>
</div>
<div class="menuButton reloadMenu for-nicovideo" data-command="reload">
<div class="menuButtonInner for-nicovideo">リロード</div>
<div class="menuButtonInner for-ZenTube">ZenTube解除</div>
</div>
<div class="menuButton playNextVideo" data-command="playNextVideo">
<div class="menuButtonInner">次の動画</div>
</div>
</div>
<div class="togglePlayMenu menuItemContainer center" data-command="togglePlay">
▶
</div>
</div>
`).trim();
_.assign(VideoHoverMenu.prototype, {
initialize: function (params) {
this._container = params.playerContainer;
this._state = params.playerState;
this._bound = {};
// this._bound.onBodyClick = this._onBodyClick.bind(this);
this._bound.emitClose =
_.debounce(() => util.dispatchCommand(this._container, 'close'), 300);
this._initializeDom();
this._initializeNgSettingMenu();
window.setTimeout(this._initializeMylistSelectMenu.bind(this), 0);
},
_initializeDom: function () {
let container = this._container;
container.appendChild(util.createDom(VideoHoverMenu.__tpl__));
this._view = container.querySelector('.hoverMenuContainer');
let menuContainer = util.$(container.querySelectorAll('.menuItemContainer'));
menuContainer.on('contextmenu',
e => {
e.preventDefault();
e.stopPropagation();
});
menuContainer.on('click', this._onClick.bind(this));
menuContainer.on('mousedown', this._onMouseDown.bind(this));
ZenzaWatch.emitter.on('hideHover', this._hideMenu.bind(this));
},
_initializeMylistSelectMenu: function () {
if (!util.isLogin()) {
return;
}
this._mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
this._mylistApiLoader.getMylistList().then(mylistList => {
this._mylistList = mylistList;
this._initializeMylistSelectMenuDom();
});
},
_initializeMylistSelectMenuDom: function (mylistList) {
if (!util.isLogin()) {
return;
}
mylistList = mylistList || this._mylistList;
let menu = this._container.querySelector('.mylistSelectMenu');
menu.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
let ul = document.createElement('ul');
mylistList.forEach(mylist => {
let li = document.createElement('li');
li.className = `folder${mylist.icon_id}`;
let icon = document.createElement('span');
icon.className = 'mylistIcon command';
util.$(icon).attr({
'data-mylist-id': mylist.id,
'data-mylist-name': mylist.name,
'data-command': 'mylistOpen',
title: mylist.name + 'を開く'
});
let link = document.createElement('a');
link.className = 'mylistLink name command';
link.textContent = mylist.name;
util.$(link).attr({
href: `https://www.nicovideo.jp/my/mylist/#/${mylist.id}`,
'data-mylist-id': mylist.id,
'data-mylist-name': mylist.name,
'data-command': 'mylistAdd'
});
li.appendChild(icon);
li.appendChild(link);
ul.appendChild(li);
});
this._container.querySelector('.mylistSelectMenuInner').appendChild(ul);
},
_initializeNgSettingMenu: function () {
let state = this._state;
let menu = this._container.querySelector('.ngSettingSelectMenu');
let enableFilterItems = Array.from(menu.querySelectorAll('.update-enableFilter'));
const updateEnableFilter = v => {
enableFilterItems.forEach(item => {
const p = JSON.parse(item.getAttribute('data-param'));
item.classList.toggle('selected', v === p);
});
menu.classList.toggle('is-enableFilter', v);
};
updateEnableFilter(state.isEnableFilter);
state.on('update-isEnableFilter', updateEnableFilter);
let sharedNgItems = Array.from(menu.querySelectorAll('.sharedNgLevel'));
const updateNgLevel = level => {
sharedNgItems.forEach(item => {
item.classList.toggle('selected', level === item.getAttribute('data-param'));
});
};
updateNgLevel(state.sharedNgLevel);
state.on('update-sharedNgLevel', updateNgLevel);
},
_onMouseDown: function (e) {
e.stopPropagation();
const target = e.target.closest('[data-command]');
if (!target) {
return;
}
let command = target.dataset.command;
switch (command) {
case 'deflistAdd':
if (e.shiftKey) {
command = 'mylistWindow';
} else {
command = e.which > 1 ? 'deflistRemove' : 'deflistAdd';
}
util.dispatchCommand(target, command);
break;
case 'mylistAdd': {
command = (e.shiftKey || e.which > 1) ? 'mylistRemove' : 'mylistAdd';
let mylistId = target.dataset.mylistId;
let mylistName = target.dataset.mylistName;
this._hideMenu();
util.dispatchCommand(target, command,
{mylistId: mylistId, mylistName: mylistName});
break;
}
case 'mylistOpen': {
let mylistId = target.dataset.mylistId;
location.href = `https://www.nicovideo.jp/my/mylist/#/${mylistId}`;
break;
}
case 'close':
this._bound.emitClose();
break;
default:
return;
}
},
_onClick: function (e) {
e.preventDefault();
e.stopPropagation();
const target = e.target.closest('[data-command]');
if (!target) {
return;
}
let {command, type, param} = target.dataset;
switch (type) {
case 'json':
case 'bool':
case 'number':
param = JSON.parse(param);
break;
}
switch (command) {
case 'deflistAdd':
case 'mylistAdd':
case 'mylistOpen':
case 'close':
this._hideMenu();
break;
case 'mylistMenu':
if (e.shiftKey) {
util.dispatchCommand(target, 'mylistWindow');
}
break;
case 'nop':
break;
default:
this._hideMenu();
util.dispatchCommand(target, command, param);
break;
}
},
_hideMenu: function () {
if (!this._view.contains(document.activeElement)) {
return;
}
window.setTimeout(() => {
document.body.focus();
}, 0);
},
});
class VariablesMapper {
get nextState() {
return {
menuScale: parseFloat(this.config.getValue('menuScale'), 10),
commentLayerOpacity: parseFloat(this.config.getValue('commentLayerOpacity'), 10),
fullscreenControlBarMode: this.config.getValue('fullscreenControlBarMode')
};
}
get videoControlBarHeight() {
return(
(VideoControlBar.BASE_HEIGHT - VideoControlBar.BASE_SEEKBAR_HEIGHT) *
this.state.menuScale + VideoControlBar.BASE_SEEKBAR_HEIGHT);
}
constructor({config, element}){
this.config = config;
this.state = {
menuScale: 0,
commentLayerOpacity: 0,
fullscreenControlBarMode: 'auto'
};
this.element = element || document.body;
this.emitter = new Emitter();
let update = _.debounce(this.update.bind(this), 500);
Object.keys(this.state).forEach(key =>
config.on(`update-${key}`, () => update(key)));
update();
}
on(...args) {
this.emitter.on(...args);
}
shouldUpdate(state, nextState) {
return Object.keys(state).some(key => state[key] !== nextState[key]);
}
setVar(key, value) { this.element.style.setProperty(key, value); }
update(key, val) {
let state = this.state;
let nextState = this.nextState;
if (!this.shouldUpdate(state, nextState)) {
return;
}
let {menuScale, commentLayerOpacity, fullscreenControlBarMode} = nextState;
this.state = nextState;
Object.assign(this.element.dataset, {fullscreenControlBarMode});
if (state.scale !== menuScale) {
this.setVar('--zenza-ui-scale', menuScale);
this.setVar('--zenza-control-bar-height', `${this.videoControlBarHeight}px`);
}
if (state.commentLayerOpacity !== commentLayerOpacity) {
this.setVar('--zenza-comment-layer-opacity', commentLayerOpacity);
}
this.emitter.emit('update', nextState);
}
}

const RootDispatcher = (() => {
let config;
let player;
let playerState;
class RootDispatcher {
static initialize(dialog) {
player = dialog;
playerState = ZenzaWatch.state.player;
config = PlayerConfig.getInstance(config);
config.on('update', RootDispatcher.onConfigUpdate);
player.on('command', RootDispatcher.execCommand);
}
static execCommand(command, param) {
switch(command) {
case 'notifyHtml':
PopupMessage.notify(param, true);
break;
case 'notify':
PopupMessage.notify(param);
break;
case 'alert':
PopupMessage.alert(param);
break;
case 'alertHtml':
PopupMessage.alert(param, true);
break;
case 'copy-video-watch-url':
util.copyToClipBoard(playerState.videoInfo.watchUrl);
break;
case 'tweet':
util.openTweetWindow(playerState.videoInfo);
break;
case 'toggleConfig': {
let v = config.getValue(param);
config.setValue(param, !v);
break;
}
case 'picture-in-picture':
document.querySelector('.zenzaWatchVideoElement').requestPictureInPicture();
break;
case 'toggle-comment':
case 'toggle-showComment':
case 'toggle-backComment':
case 'toggle-mute':
case 'toggle-loop':
case 'toggle-debug':
case 'toggle-enableFilter':
case 'toggle-enableNicosJumpVideo':
case 'toggle-useWellKnownPort':
case 'toggle-bestZenTube':
case 'toggle-autoCommentSpeedRate':
command = command.replace(/^toggle-/, '');
config.setValue(command, !config.getValue(command));
break;
case 'baseFontFamily':
case 'baseChatScale':
case 'enableFilter':
case 'update-enableFilter':
case 'screenMode':
case 'update-screenMode':
case 'update-sharedNgLevel':
case 'update-commentSpeedRate':
case 'update-fullscreenControlBarMode':
command = command.replace(/^update-/, '');
if (config.getValue(command) === param) {
break;
}
config.setValue(command, param);
break;
case 'nop':
break;
default:
ZenzaWatch.emitter.emit(`command-${command}`, command, param);
window.dispatchEvent(new CustomEvent(`${PRODUCT}-command`, {detail: {command, param}}));
}
}
static onConfigUpdate(key, value) {
switch (key) {
case 'enableFilter':
playerState.isEnableFilter = value;
break;
case 'backComment':
playerState.isBackComment = !!value;
break;
case 'showComment':
playerState.isShowComment = !!value;
break;
case 'loop':
playerState.isLoop = !!value;
break;
case 'mute':
playerState.isMute = !!value;
break;
case 'debug':
playerState.isDebug = !!value;
PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
break;
case 'sharedNgLevel':
case 'screenMode':
case 'playbackRate':
playerState[key] = value;
break;
}
}
}
return RootDispatcher;
})();

class CommentInputPanel extends Emitter {
constructor(params) {
super();
this._$playerContainer = params.$playerContainer;
this._playerConfig = params.playerConfig;
this._initializeDom();
this._playerConfig.on('update-autoPauseCommentInput', this._onAutoPauseCommentInputChange.bind(this));
}
}
CommentInputPanel.__css__ = (`
.commentInputPanel {
position: fixed;
top: calc(-50vh + 50% + 100vh);
left: 50vw;
box-sizing: border-box;
width: 200px;
height: 50px;
z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
transform: translate(-50%, -170px);
overflow: visible;
}
.zenzaPlayerContainer.is-notPlayed .commentInputPanel,
.zenzaPlayerContainer.is-waybackMode .commentInputPanel,
.zenzaPlayerContainer.is-mymemory .commentInputPanel,
.zenzaPlayerContainer.is-loading .commentInputPanel,
.zenzaPlayerContainer.is-error .commentInputPanel {
display: none;
}
.commentInputPanel:focus-within {
width: 500px;
z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
}
.zenzaScreenMode_wide .commentInputPanel,
.is-fullscreen .commentInputPanel {
position: absolute !important; /* fixedだとFirefoxのバグで消える */
top: auto !important;
bottom: 120px !important;
transform: translate(-50%, 0);
left: 50%;
}
/* 縦長モニター */
/*
@media
screen and
(max-width: 991px) and (min-height: 700px)
{
.zenzaScreenMode_normal .commentInputPanel {
transform: translate(-50%, -230px);
}
}
@media
screen and
(max-width: 1215px) and (min-height: 700px)
{
.zenzaScreenMode_big .commentInputPanel {
transform: translate(-50%, -230px);
}
}
*/
.commentInputPanel>* {
pointer-events: none;
}
.commentInputPanel input {
font-size: 18px;
}
.commentInputPanel:focus-within>*,
.commentInputPanel:hover>* {
pointer-events: auto;
}
.is-mouseMoving .commentInputOuter {
border: 1px solid #888;
box-sizing: border-box;
border-radius: 8px;
opacity: 0.5;
}
.is-mouseMoving:not(:focus-within) .commentInputOuter {
box-shadow: 0 0 8px #fe9, 0 0 4px #fe9 inset;
}
.commentInputPanel:focus-within .commentInputOuter,
.commentInputPanel:hover .commentInputOuter {
border: none;
opacity: 1;
}
.commentInput {
width: 100%;
height: 30px !important;
font-size: 24px;
background: transparent;
border: none;
opacity: 0;
transition: opacity 0.3s ease, box-shadow 0.4s ease;
text-align: center;
line-height: 26px !important;
padding-right: 32px !important;
margin-bottom: 0 !important;
}
.commentInputPanel:hover .commentInput {
opacity: 0.5;
}
.commentInputPanel:focus-within .commentInput {
opacity: 0.9 !important;
}
.commentInputPanel:focus-within .commentInput,
.commentInputPanel:hover .commentInput {
box-sizing: border-box;
border: 1px solid #888;
border-radius: 8px;
background: #fff;
box-shadow: 0 0 8px #fff;
}
.commentInputPanel .autoPauseLabel {
display: none;
}
.commentInputPanel:focus-within .autoPauseLabel {
position: absolute;
top: 36px;
left: 50%;
transform: translate(-50%, 0);
display: block;
background: #336;
z-index: 100;
color: #ccc;
padding: 0 8px;
}
.commandInput {
position: absolute;
width: 100px;
height: 30px !important;
font-size: 24px;
top: 0;
left: 0;
border-radius: 8px;
z-index: -1;
opacity: 0;
transition: left 0.2s ease, opacity 0.2s ease;
text-align: center;
line-height: 26px !important;
padding: 0 !important;
margin-bottom: 0 !important;
}
.commentInputPanel:focus-within .commandInput {
left: -108px;
z-index: 1;
opacity: 0.9;
border: none;
pointer-evnets: auto;
box-shadow: 0 0 8px #fff;
padding: 0;
}
.commentSubmit {
position: absolute;
width: 100px !important;
height: 30px !important;
font-size: 24px;
top: 0;
right: 0;
border: none;
border-radius: 8px;
z-index: -1;
opacity: 0;
transition: right 0.2s ease, opacity 0.2s ease;
line-height: 26px;
letter-spacing: 0.2em;
}
.commentInputPanel:focus-within .commentSubmit {
right: -108px;
z-index: 1;
opacity: 0.9;
box-shadow: 0 0 8px #fff;
}
.commentInputPanel:focus-within .commentSubmit:active {
color: #000;
background: #fff;
box-shadow: 0 0 16px #ccf;
}
`).trim();
CommentInputPanel.__tpl__ = (`
<div class="commentInputPanel forMember" autocomplete="new-password">
<form action="javascript: void(0);">
<div class="commentInputOuter">
<input
type="text"
value=""
autocomplete="on"
name="mail"
placeholder="コマンド"
class="commandInput"
maxlength="30"
>
<input
type="text"
value=""
autocomplete="off"
name="chat"
accesskey="c"
placeholder="コメント入力(C)"
class="commentInput"
maxlength="75"
>
<input
type="submit"
value="送信"
name="post"
class="commentSubmit"
>
<div class="recButton" title="音声入力">
</div>
</div>
</form>
<label class="autoPauseLabel">
<input type="checkbox" class="autoPause" checked="checked">
入力時に一時停止
</label>
</div>
`).trim();
_.assign(CommentInputPanel.prototype, {
_initializeDom: function () {
let $container = this._$playerContainer;
let config = this._playerConfig;
util.addStyle(CommentInputPanel.__css__);
$container.append(CommentInputPanel.__tpl__);
let $view = this._$view = $container.find('.commentInputPanel');
let $input = this._$input = $view.find('.commandInput, .commentInput');
this._$form = $container.find('form');
let $autoPause = this._$autoPause = $container.find('.autoPause');
this._$commandInput = $container.find('.commandInput');
let $cmt = this._$commentInput = $container.find('.commentInput');
this._$commentSubmit = $container.find('.commentSubmit');
let preventEsc = e => {
if (e.keyCode === 27) { // ESC
e.preventDefault();
e.stopPropagation();
this.emit('esc');
$input.blur();
}
};
$input
.on('focus', this._onFocus.bind(this))
.on('blur', _.debounce(this._onBlur.bind(this), 500))
.on('keydown', preventEsc)
.on('keyup', preventEsc);
$autoPause.prop('checked', config.getValue('autoPauseCommentInput'));
this._$autoPause.on('change', () => {
config.setValue('autoPauseCommentInput', !!$autoPause.prop('checked'));
$cmt.focus();
});
this._$view.find('label').on('click', e => e.stopPropagation());
this._$form.on('submit', this._onSubmit.bind(this));
this._$commentSubmit.on('click', this._onSubmitButtonClick.bind(this));
$view.on('click', e => e.stopPropagation());
},
_onFocus: function () {
if (!this._hasFocus) {
this.emit('focus', this.isAutoPause());
}
this._hasFocus = true;
},
_onBlur: function () {
if (this._$commandInput.is(':focus') ||
this._$commentInput.is(':focus')) {
return;
}
this.emit('blur', this.isAutoPause());
this._hasFocus = false;
},
_onSubmit: function () {
this.submit();
},
_onSubmitButtonClick: function () {
this._$form.submit();
},
_onAutoPauseCommentInputChange: function (val) {
this._$autoPause.prop('checked', !!val);
},
submit: function () {
let chat = this._$commentInput.val().trim();
let cmd = this._$commandInput.val().trim();
if (!chat.length) {
return;
}
setTimeout(() => {
this._$commentInput.val('').blur();
this._$commandInput.blur();
let $view = this._$view.addClass('updating');
(new Promise((resolve, reject) => this.emit('post', {resolve, reject}, chat, cmd)))
.then(() => $view.removeClass('updating'))
.catch(() => $view.removeClass('updating'));
}, 0);
},
isAutoPause: function () {
return !!this._$autoPause.prop('checked');
},
focus: function () {
this._$commentInput.focus();
this._onFocus();
},
blur: function () {
this._$commandInput.blur();
this._$commentInput.blur();
this._onBlur();
}
});

class SettingPanel extends Emitter{
constructor(...args) {
super();
this.initialize(...args);
}
}
SettingPanel.__css__ = (`
.zenzaSettingPanel {
position: absolute;
left: 50%;
top: -100vh;
pointer-events: none;
transform: translate(-50%, -50%);
z-index: 170000;
width: 500px;
height: 400px;
color: #fff;
transition: top 0.4s ease;
user-select: none;
overflow-y: hidden;
}
.zenzaSettingPanel.show {
opacity: 1;
top: 50%;
overflow-y: scroll;
overflow-x: hidden;
overscroll-behavior: contain;
background: rgba(0, 0, 0, 0.8);
}z
.zenzaScreenMode_sideView .zenzaSettingPanel.show,
.zenzaScreenMode_small .zenzaSettingPanel.show {
position: fixed;
}
.zenzaSettingPanel.show {
border: 2px outset #fff;
box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
pointer-events: auto;
}
.zenzaSettingPanel .settingPanelInner {
box-sizing: border-box;
margin: 16px;
overflow: visible;
}
.zenzaSettingPanel .caption {
background: #333;
font-size: 20px;
padding: 4px 2px;
color: #fff;
}
.zenzaSettingPanel label {
display: inline-block;
box-sizing: border-box;
width: 100%;
padding: 4px 8px;
cursor: pointer;
}
.zenzaSettingPanel .control {
border-radius: 4px;
background: rgba(88, 88, 88, 0.3);
padding: 8px;
margin: 16px 4px;
}
.zenzaSettingPanel .control:hover {
border-color: #ff9;
}
.zenzaSettingPanel button {
font-size: 10pt;
padding: 4px 8px;
background: #888;
border-radius: 4px;
border: solid 1px;
cursor: pointer;
}
.zenzaSettingPanel input[type=checkbox] {
transform: scale(2);
margin-left: 8px;
margin-right: 16px;
}
.zenzaSettingPanel .filterEditContainer {
color: #fff;
margin-bottom: 32px;
}
.zenzaSettingPanel .filterEditContainer.forGuest {
padding: 8px;
}
.zenzaSettingPanel .filterEditContainer p {
color: #fff;
font-size: 120%;
}
.zenzaSettingPanel .filterEditContainer .info {
color: #ccc;
font-size: 90%;
display: inline-block;
margin: 8px 0;
}
.zenzaSettingPanel .filterEdit {
background: #000;
color: #ccc;
width: 90%;
margin: 0 5%;
min-height: 150px;
white-space: pre;
}
.zenzaSettingPanel .fontEdit .info {
color: #ccc;
font-size: 90%;
display: inline-block;
margin: 8px 0;
}
.zenzaSettingPanel .fontEdit p {
color: #fff;
font-size: 120%;
}
.zenzaSettingPanel input[type=text] {
font-size: 24px;
background: #000;
color: #ccc;
width: 90%;
margin: 0 5%;
border-radius: 8px;
}
.zenzaSettingPanel select {
font-size:24px;
background: #000;
color: #ccc;
margin: 0 5%;
border-radius: 8px;
}
`).trim();
SettingPanel.__tpl__ = (`
<div class="zenzaSettingPanel">
<div class="settingPanelInner">
<p class="caption">プレイヤーの設定</p>
<div class="autoPlayControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="autoPlay">
自動で再生する
</label>
</div>
<div class="enableTogglePlayOnClickControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableTogglePlayOnClick">
画面クリックで再生/一時停止
</label>
</div>
<div class="autoFullScreenControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="autoFullScreen">
自動でフルスクリーンにする
<small>(singletonモードでは使えません)</small>
</label>
</div>
<div class="enableSingleton control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableSingleton">
ZenzaWatchを起動してるタブがあればそちらで開く<br>
<smal>(singletonモード)</small>
</label>
</div>
<div class="enableHeatMapControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableHeatMap">
コメントの盛り上がりをシークバーに表示
</label>
</div>
<div class="overrideGinzaControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="overrideGinza">
動画視聴ページでも公式プレイヤーの代わりに起動する
</label>
</div>
<div class="overrideWatchLinkControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="overrideWatchLink">
[Zen]ボタンなしでZenzaWatchを開く(リロード後に反映)
</label>
</div>
<div class="overrideWatchLinkControl control toggle forPremium">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableStoryboard">
シークバーにサムネイルを表示 (重いかも)
</label>
</div>
<div class="overrideWatchLinkControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableCommentPanel">
右パネルにコメント一覧を表示
</label>
</div>
<div class="UaaEnableControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="uaa.enable">
ニコニ広告の情報を取得する(対応ブラウザのみ)
</label>
</div>
<div class="enableAutoMylistCommentControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableAutoMylistComment">
マイリストコメントに投稿者名を入れる
</label>
</div>
<div class="autoDisableDmc control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="autoDisableDmc">
旧システムのほうが画質が良さそうな時は旧システムを使う<br>
<small>たまに誤爆することがあります (回転情報の含まれる動画など)</small>
</label>
</div>
<div class="enableNicosJumpVideo control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="enableNicosJumpVideo"
data-command="toggle-enableNicosJumpVideo">
＠ジャンプで指定された動画をプレイリストに入れる
</label>
</div>
<div class="touchEnable control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="touch.enable"
data-command="toggle-touchEnable">
タッチパネルのジェスチャを有効にする
<smal>(2本指左右シーク・上下で速度変更/3本指で動画切替)</small>
</label>
</div>
<div class="bestZenTube control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="bestZenTube"
data-command="toggle-bestZenTube">
ZenTube使用時に最高画質をリクエストする
</label>
</div>
<div class="loadLinkedChannelVideoControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="loadLinkedChannelVideo">
無料期間の切れた動画はdアニメの映像を流す<br>
<small>(当然ながらdアニメニコニコチャンネル加入が必要)</small>
</label>
</div>
<div class="menuScaleControl control toggle">
<label>
<select class="menuScale" data-setting-name="menuScale">
<option value="0.8">0.8倍</option>
<option value="1" selected>標準</option>
<option value="1.2">1.2倍</option>
<option value="1.5">1.5倍</option>
<option value="2.0">2倍</option>
</select>
ボタンの大きさ(倍率)
<small>※ 一部レイアウトが崩れます</small>
</label>
</div>
<p class="caption">コメント・フォントの設定</p>
<div class="fontEdit">
<div class="autoCommentSpeedRate control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="autoCommentSpeedRate">
倍速再生でもコメントは速くしない<br>
<small>※ コメントのレイアウトが一部崩れます</small>
</label>
</div>
<div class="commentSpeedRate control toggle">
<label>
<select class="commentSpeedRate" data-setting-name="commentSpeedRate">
<option value="0.5">0.5倍</option>
<option value="0.8">0.8倍</option>
<option value="1" selected>標準</option>
<option value="1.2">1.2倍</option>
<option value="1.5">1.5倍</option>
<option value="2.0"2倍</option>
</select>
コメントの速度(倍率)<br>
<small>※ コメントのレイアウトが一部崩れます</small>
</label>
</div>
<div class="baseFontBolderControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="baseFontBolder">
フォントを太くする
</label>
</div>
<p>フォント名</p>
<span class="info">入力例: 「'游ゴシック', 'メイリオ', '戦国TURB'」</span>
<input type="text" class="textInput"
data-setting-name="baseFontFamily">
<p>投稿者コメントの影の色</p>
<span class="info">※ リロード後に反映</span>
<input type="text" class="textInput" pattern="(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|^[a-zA-Z]+$)"
data-setting-name="commentLayer.ownerCommentShadowColor">
<div class="baseChatScaleControl control toggle">
<label>
<select class="baseChatScale" data-setting-name="baseChatScale">
<option value="0.5">0.5</option>
<option value="0.6">0.6</option>
<option value="0.7">0.7</option>
<option value="0.8">0.8</option>
<option value="0.9">0.9</option>
<option value="1" selected>1.0</option>
<option value="1.1">1.1</option>
<option value="1.2">1.2</option>
<option value="1.3">1.3</option>
<option value="1.4">1.4</option>
<option value="1.5">1.5</option>
<option value="1.6">1.6</option>
<option value="1.7">1.7</option>
<option value="1.8">1.8</option>
<option value="1.9">1.9</option>
<option value="2.0">2.0</option>
</select>
フォントサイズ(倍率)
</label>
</div>
<div class="commentLayerOpacityControl control">
<label>
<select class="commentLayerOpacity" data-setting-name="commentLayerOpacity">
<option value="0.1">90%</option>
<option value="0.2">80%</option>
<option value="0.3">70%</option>
<option value="0.4">60%</option>
<option value="0.5">50%</option>
<option value="0.6">40%</option>
<option value="0.7">30%</option>
<option value="0.8">20%</option>
<option value="0.9">10%</option>
<option value="1" selected>0%</option>
</select>
コメントの透明度
</label>
</div>
<div class="commentLayer-textShadowType control">
<p>コメントの影</p>
<label>
<input type="radio"
name="textShadowType"
data-setting-name="commentLayer.textShadowType"
value="">
標準 (軽い)
</label>
<label>
<input type="radio"
name="textShadowType"
data-setting-name="commentLayer.textShadowType"
value="shadow-type2">
縁取り
</label>
<label>
<input type="radio"
name="textShadowType"
data-setting-name="commentLayer.textShadowType"
value="shadow-type3">
ぼかし (重い)
</label>
<label>
<input type="radio"
name="textShadowType"
data-setting-name="commentLayer.textShadowType"
value="shadow-stroke">
縁取り2 (対応ブラウザのみ。やや重い)
</label>
<label>
<input type="radio"
name="textShadowType"
data-setting-name="commentLayer.textShadowType"
value="shadow-dokaben">
ドカベン <s>(飽きたら消します)</s>
</label>
</div>
<div class="backCommentControl control toggle">
<label>
<input type="checkbox" class="checkbox" data-setting-name="backComment">
コメントを動画の後ろに流す
</label>
</div>
</div>
<p class="caption">NG設定</p>
<div class="filterEditContainer forGuest">
設定の変更はログイン中のみ可能です。<br>
非ログインでも、設定済みの内容は反映されます。
</div>
<div class="filterEditContainer forMember">
<span class="info">
１行ごとに入力。プレミアム会員に上限はありませんが、増やしすぎると重くなります。
</span>
<p>NGワード</p>
<textarea
class="filterEdit wordFilterEdit"
data-command="setWordFilterList"></textarea>
<p>NGコマンド</p>
<textarea
class="filterEdit commandFilterEdit"
data-command="setCommandFilterList"></textarea>
<p>NGユーザー</p>
<textarea
class="filterEdit userIdFilterEdit"
data-command="setUserIdFilterList"></textarea>
</div>
</div>
</div>
`).trim();
_.assign(SettingPanel.prototype, {
initialize: function (params) {
this._playerConfig = params.playerConfig;
this._$playerContainer = params.$playerContainer;
this._player = params.player;
this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
this._initializeDom();
this._initializeCommentFilterEdit();
},
_initializeDom: function () {
let $container = this._$playerContainer;
let config = this._playerConfig;
util.addStyle(SettingPanel.__css__);
$container.append(SettingPanel.__tpl__);
let $panel = this._$panel = $container.find('.zenzaSettingPanel');
this._$view =
$container.find('.zenzaSettingPanel, .zenzaSettingPanelShadow1, .zenzaSettingPanelShadow2');
let view = this._$view[0];
view.addEventListener('click', e => e.stopPropagation());
view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
let $check = $panel.find('input[type=checkbox]');
$check.each((i, check) => {
let $c = $(check);
let settingName = $c.attr('data-setting-name');
let val = config.getValue(settingName);
$c.prop('checked', val);
$c.closest('.control').toggleClass('checked', val);
});
$check.on('change', this._onToggleItemChange.bind(this));
const $radio = $panel.find('input[type=radio]');
$radio.each((i, check) => {
const $c = $(check);
const settingName = $c.attr('data-setting-name');
const val = config.getValue(settingName);
$c.prop('checked', val === $c.val());
//$c.closest('.control').toggleClass('checked', val);
});
$radio.on('change', this._onRadioItemChange.bind(this));
let $text = $panel.find('input[type=text]');
$text.each((i, text) => {
let $t = $(text);
let settingName = $t.attr('data-setting-name');
let val = config.getValue(settingName);
$t.val(val);
});
$text.on('change', this._onInputItemChange.bind(this));
let $select = $panel.find('select');
$select.each((i, select) => {
let $s = $(select);
let settingName = $s.attr('data-setting-name');
let val = config.getValue(settingName);
$s.val(val);
});
$select.on('change', this._onInputItemChange.bind(this));
ZenzaWatch.emitter.on('hideHover', () => this.hide());
},
_initializeCommentFilterEdit: function () {
let config = this._playerConfig;
let $view = this._$view;
let $edit = $view.find('.filterEdit');
let $wordFilter = $view.find('.wordFilterEdit');
let $userIdFilter = $view.find('.userIdFilterEdit');
let $commandFilter = $view.find('.commandFilterEdit');
let map = {
wordFilter: $wordFilter,
userIdFilter: $userIdFilter,
commandFilter: $commandFilter
};
$edit.on('change', e => {
let $target = $(e.target);
let command = $target.attr('data-command');
let value = $target.val();
this.emit('command', command, value);
});
Object.keys(map).forEach(v => {
let value = config.getValue(v) || [];
value = Array.isArray(value) ? value.join('\n') : value;
map[v].val(value);
});
let onConfigUpdate = (key, value) => {
if (['wordFilter', 'userIdFilter', 'commandFilter'].includes(key)) {
map[key].val(value.join('\n'));
}
};
config.on('update', onConfigUpdate);
},
_onPlayerConfigUpdate: function (key, value) {
switch (key) {
case 'mute':
case 'loop':
case 'autoPlay':
case 'enableHeatMap':
case 'showComment':
case 'autoFullScreen':
case 'enableStoryboard':
case 'enableCommentPanel':
case 'loadLinkedChannelVideo':
case 'debug':
this._$panel
.find(`.${key}Control`).toggleClass('checked', value)
.find('input[type=checkbox]').prop('checked', value);
break;
}
},
_onToggleItemChange: function (e) {
let $target = $(e.target);
let settingName = $target.attr('data-setting-name');
let val = !!$target.prop('checked');
this._playerConfig.setValue(settingName, val);
$target.closest('.control').toggleClass('checked', val);
},
_onRadioItemChange: function (e) {
const $target = $(e.target);
const settingName = $target.attr('data-setting-name');
const checked = !!$target.prop('checked');
if (!checked) {
return;
}
this._playerConfig.setValue(settingName, $target.val());
},
_onInputItemChange: function (e) {
let $target = $(e.target);
let settingName = $target.attr('data-setting-name');
let val = $target.val();
this._playerConfig.setValue(settingName, val);
},
toggle: function (v) {
let eventName = 'click.ZenzaSettingPanel';
let $container = this._$playerContainer.off(eventName);
let $body = $('body').off(eventName);
let $view = this._$view.toggleClass('show', v);
let onBodyClick = () => {
$view.removeClass('show');
$container.off(eventName);
$body.off(eventName);
};
if ($view.hasClass('show')) {
$container.on(eventName, onBodyClick);
$body.on(eventName, onBodyClick);
}
},
show: function () {
this.toggle(true);
},
hide: function () {
this.toggle(false);
}
});

class TagListView extends BaseViewComponent {
constructor({parentNode}) {
super({
parentNode,
name: 'TagListView',
template: '<div class="TagListView"></div>',
shadow: TagListView.__shadow__,
css: TagListView.__css__
});
this._state = {
isInputing: false,
isUpdating: false,
isEditing: false
};
this._tagEditApi = new TagEditApi();
}
_initDom(...args) {
super._initDom(...args);
const v = this._shadow || this._view;
Object.assign(this._elm, {
videoTags: v.querySelector('.videoTags'),
videoTagsInner: v.querySelector('.videoTagsInner'),
tagInput: v.querySelector('.tagInputText'),
form: v.querySelector('form')
});
this._elm.tagInput.addEventListener('keydown', this._onTagInputKeyDown.bind(this));
this._elm.form.addEventListener('submit', this._onTagInputSubmit.bind(this));
v.addEventListener('keydown', e => {
if (this._state.isInputing) {
e.stopPropagation();
}
});
v.addEventListener('click', e => e.stopPropagation());
ZenzaWatch.emitter.on('hideHover', () => {
if (this._state.isEditing) {
this._endEdit();
}
});
}
_onCommand(command, param) {
switch (command) {
case 'refresh':
this._refreshTag();
break;
case 'toggleEdit':
if (this._state.isEditing) {
this._endEdit();
} else {
this._beginEdit();
}
break;
case 'toggleInput':
if (this._state.isInputing) {
this._endInput();
} else {
this._beginInput();
}
break;
case 'beginInput':
this._beginInput();
break;
case 'endInput':
this._endInput();
break;
case 'addTag':
this._addTag(param);
break;
case 'removeTag': {
let elm = this._elm.videoTags.querySelector(`.tagItem[data-tag-id="${param}"]`);
if (!elm) {
return;
}
elm.classList.add('is-Removing');
let data = JSON.parse(elm.getAttribute('data-tag'));
this._removeTag(param, data.tag);
break;
}
case 'tag-search':
this._onTagSearch(param);
break;
default:
super._onCommand(command, param);
break;
}
}
_onTagSearch(word) {
const config = Config.namespace('videoSearch');
let option = {
searchType: config.getValue('mode'),
order: config.getValue('order'),
sort: config.getValue('sort') || 'playlist',
owner: config.getValue('ownerOnly')
};
if (option.sort === 'playlist') {
option.sort = 'f';
option.playlistSort = true;
}
super._onCommand('playlistSetSearchVideo', {word, option});
}
update({tagList = [], watchId = null, videoId = null, token = null, watchAuthKey = null}) {
if (watchId) {
this._watchId = watchId;
}
if (videoId) {
this._videoId = videoId;
}
if (token) {
this._token = token;
}
if (watchAuthKey) {
this._watchAuthKey = watchAuthKey;
}
this.setState({
isInputing: false,
isUpdating: false,
isEditing: false,
isEmpty: false
});
this._update(tagList);
this._boundOnBodyClick = this._onBodyClick.bind(this);
}
_onClick(e) {
if (this._state.isInputing || this._state.isEditing) {
e.stopPropagation();
}
super._onClick(e);
}
_update(tagList = []) {
let tags = [];
tagList.forEach(tag => {
tags.push(this._createTag(tag));
});
tags.push(this._createToggleInput());
this.setState({isEmpty: tagList.length < 1});
this._elm.videoTagsInner.innerHTML = tags.join('');
}
_createToggleInput() {
return (`
<div
class="button command toggleInput"
data-command="toggleInput"
data-tooltip="タグ追加">
<span class="icon">&#8853;</span>
</div>`).trim();
}
_onApiResult(watchId, result) {
if (watchId !== this._watchId) {
return; // 通信してる間に動画変わったぽい
}
const err = result.error_msg;
if (err) {
this.emit('command', 'alert', err);
}
this.update(result.tags);
}
_addTag(tag) {
this.setState({isUpdating: true});
const wait3s = this._makeWait(3000);
const watchId = this._watchId;
const videoId = this._videoId;
const csrfToken = this._token;
const watchAuthKey = this._watchAuthKey;
const addTag = () => {
return this._tagEditApi.add({
videoId,
tag,
csrfToken,
watchAuthKey
});
};
return Promise.all([addTag(), wait3s]).then(results => {
let result = results[0];
if (watchId !== this._watchId) {
return;
} // 待ってる間に動画が変わったぽい
if (result && result.tags) {
this._update(result.tags);
}
this.setState({isInputing: false, isUpdating: false, isEditing: false});
if (result.error_msg) {
this.emit('command', 'alert', result.error_msg);
}
});
}
_removeTag(tagId, tag = '') {
this.setState({isUpdating: true});
const wait3s = this._makeWait(3000);
const watchId = this._watchId;
const videoId = this._videoId;
const csrfToken = this._token;
const watchAuthKey = this._watchAuthKey;
const removeTag = () => {
return this._tagEditApi.remove({
videoId,
tag,
id: tagId,
csrfToken,
watchAuthKey
});
};
return Promise.all([removeTag(), wait3s]).then((results) => {
let result = results[0];
if (watchId !== this._watchId) {
return;
} // 待ってる間に動画が変わったぽい
if (result && result.tags) {
this._update(result.tags);
}
this.setState({isUpdating: false});
if (result.error_msg) {
this.emit('command', 'alert', result.error_msg);
}
});
}
_refreshTag() {
this.setState({isUpdating: true});
const watchId = this._watchId;
const wait1s = this._makeWait(1000);
const load = () => {
return this._tagEditApi.load(this._videoId);
};
return Promise.all([load(), wait1s]).then((results) => {
let result = results[0];
if (watchId !== this._watchId) {
return;
} // 待ってる間に動画が変わったぽい
this._update(result.tags);
this.setState({isUpdating: false, isInputing: false, isEditing: false});
});
}
_makeWait(ms) {
return new Promise(resolve => {
setTimeout(() => {
resolve(ms);
}, ms);
});
}
_createDicIcon(text, hasDic) {
let href = `//dic.nicovideo.jp/a/${encodeURIComponent(text)}`;
// TODO: 本家がHTML5に完全移行したらこのアイコンも消えるかもしれないので代替を探す
let src = hasDic ?
'https://live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
'https://live.nicovideo.jp/img/2012/watch/tag_icon003.png' ;
let icon = `<img class="dicIcon" src="${src}">`;
let hasNicodic = hasDic ? 1 : 0;
return (
`<zenza-tag-item-menu 
class="tagItemMenu" 
data-text="${encodeURIComponent(text)}" 
data-has-nicodic="${hasNicodic}"
><a target="_blank" class="nicodic" href="${href}">${icon}</a></zenza-tag-item-menu>`
);
}
_createDeleteButton(id) {
return `<span target="_blank" class="deleteButton command" title="削除" data-command="removeTag" data-param="${id}">ー</span>`;
}
_createLink(text) {
let href = `//www.nicovideo.jp/tag/${encodeURIComponent(text)}`;
// タグはエスケープされた物が来るのでそのままでつっこんでいいはずだが、
// 古いのはけっこういい加減なデータもあったりして信頼できない
text = util.escapeToZenkaku(util.unescapeHtml(text));
return `<a class="tagLink" href="${href}">${text}</a>`;
}
_createSearch(text) {
let title = 'プレイリストに追加';
let command = 'tag-search';
let param = util.escapeHtml(text);
return (`<zenza-playlist-append class="playlistAppend" title="${title}" data-command="${command}" data-param="${param}">▶</zenza-playlist-append>`);
}
_createTag(tag) {
let text = tag.tag;
let dic = this._createDicIcon(text, !!tag.dic);
let del = this._createDeleteButton(tag.id);
let link = this._createLink(text);
let search = this._createSearch(text);
let data = util.escapeHtml(JSON.stringify(tag));
// APIごとに形式が統一されてなくてひどい
let className = (tag.lock || tag.owner_lock === 1 || tag.lck === '1') ? 'tagItem is-Locked' : 'tagItem';
className = (tag.cat) ? `${className} is-Category` : className;
return `<li class="${className}" data-tag="${data}" data-tag-id="${tag.id}">${dic}${del}${link}${search}</li>`;
}
_onTagInputKeyDown(e) {
if (this._state.isUpdating) {
e.preventDefault();
e.stopPropagation();
}
switch (e.keyCode) {
case 27: // ESC
e.preventDefault();
e.stopPropagation();
this._endInput();
break;
}
}
_onTagInputSubmit(e) {
if (this._state.isUpdating) {
return;
}
e.preventDefault();
e.stopPropagation();
let val = (this._elm.tagInput.value || '').trim();
if (!val) {
this._endInput();
return;
}
this._onCommand('addTag', val);
this._elm.tagInput.value = '';
}
_onBodyClick() {
this._endInput();
this._endEdit();
}
_beginEdit() {
this.setState({isEditing: true});
document.body.addEventListener('click', this._boundOnBodyClick);
}
_endEdit() {
document.body.removeEventListener('click', this._boundOnBodyClick);
this.setState({isEditing: false});
}
_beginInput() {
this.setState({isInputing: true});
document.body.addEventListener('click', this._boundOnBodyClick);
this._elm.tagInput.value = '';
window.setTimeout(() => {
this._elm.tagInput.focus();
}, 100);
}
_endInput() {
this._elm.tagInput.blur();
document.body.removeEventListener('click', this._boundOnBodyClick);
this.setState({isInputing: false});
}
}
TagListView.__shadow__ = (`
<style>
:host-context(.videoTagsContainer.sideTab) .tagLink {
color: #000 !important;
text-decoration: none;
}
.TagListView {
position: relative;
user-select: none;
}
.TagListView.is-Updating {
cursor: wait;
}
:host-context(.videoTagsContainer.sideTab) .TagListView.is-Updating {
overflow: hidden;
}
.TagListView.is-Updating:after {
content: '${'\\0023F3'}';
position: absolute;
top: 50%;
left: 50%;
text-align: center;
transform: translate(-50%, -50%);
z-index: 10001;
color: #fe9;
font-size: 24px;
letter-spacing: 3px;
text-shadow: 0 0 4px #000;
pointer-events: none;
}
.TagListView.is-Updating:before {
content: ' ';
background: rgba(0, 0, 0, 0.6);
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
width: 100%;
height: 100%;
padding: 8px;
z-index: 10000;
box-shadow: 0 0 8px #000;
border-radius: 8px;
pointer-events: none;
}
.TagListView.is-Updating * {
pointer-events: none;
}
*[data-tooltip] {
position: relative;
}
.TagListView .button {
position: relative;
display: inline-block;
min-width: 40px;
min-height: 24px;
cursor: pointer;
user-select: none;
transition: 0.2s transform, 0.2s box-shadow, 0.2s background;
text-align: center;
}
.TagListView .button:hover {
background: #666;
}
.TagListView .button:active {
transition: none;
box-shadow: 0 0 2px #000 inset;
}
.TagListView .button .icon {
position: absolute;
display: inline-block;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
}
.TagListView *[data-tooltip]:hover:after {
content: attr(data-tooltip);
position: absolute;
left: 50%;
bottom: 100%;
transform: translate(-50%, 0) scale(0.9);
pointer-events: none;
background: rgba(192, 192, 192, 0.9);
box-shadow: 0 0 4px #000;
color: black;
font-size: 12px;
margin: 0;
padding: 2px 4px;
white-space: nowrap;
z-index: 10000;
letter-spacing: 2px;
}
.videoTags {
display: inline-block;
padding: 0;
}
.videoTagsInner {
display: flex;
flex-wrap: wrap;
padding: 0 8px;
}
.TagListView .tagItem {
position: relative;
list-style-type: none;
display: inline-flex;
margin-right: 2px;
line-height: 20px;
max-width: 50vw;
align-items: center;
}
.TagListView .tagItem:first-child {
margin-left: 100px;
}
.tagLink {
color: #fff;
text-decoration: none;
user-select: none;
display: inline-block;
border: 1px solid rgba(0, 0, 0, 0);
}
.TagListView .nicodic {
display: inline-block;
margin-right: 4px;
line-height: 20px;
cursor: pointer;
vertical-align: middle;
}
.TagListView.is-Editing .tagItemMenu,
.TagListView.is-Editing .nicodic,
.TagListView:not(.is-Editing) .deleteButton {
display: none !important;
}
.TagListView .deleteButton {
display: inline-block;
margin: 0px;
line-height: 20px;
width: 20px;
height: 20px;
font-size: 16px;
background: #f66;
color: #fff;
cursor: pointer;
border-radius: 100%;
transition: transform 0.2s, background 0.4s;
text-shadow: none;
transform: scale(1.2);
text-align: center;
opacity: 0.8;
}
.TagListView.is-Editing .deleteButton:hover {
transform: rotate(0) scale(1.2);
background: #f00;
opacity: 1;
}
.TagListView.is-Editing .deleteButton:active {
transform: rotate(360deg) scale(1.2);
transition: none;
background: #888;
}
.TagListView.is-Editing .is-Locked .deleteButton {
visibility: hidden;
}
.TagListView .is-Removing .deleteButton {
background: #666;
}
.tagItem .playlistAppend {
display: inline-block;
position: relative;
left: auto;
bottom: auto;
}
.TagListView .tagItem .playlistAppend {
display: inline-block;
font-size: 16px;
line-height: 24px;
width: 24px;
height: 24px;
bottom: 4px;
background: #666;
color: #ccc;
text-decoration: none;
border: 1px outset;
cursor: pointer;
text-align: center;
user-select: none;
visibility: hidden;
margin-right: -2px;
}
.tagItem:hover .playlistAppend {
visibility: visible;
}
.tagItem:hover .playlistAppend:hover {
transform: scale(1.5);
}
.tagItem:hover .playlistAppend:active {
transform: scale(1.4);
}
.tagItem.is-Removing {
transform-origin: right !important;
transform: translate(0, 150vh) !important;
opacity: 0 !important;
max-width: 0 !important;
transition:
transform 2s ease 0.2s,
opacity 1.5s linear 0.2s,
max-width 0.5s ease 1.5s
!important;
pointer-events: none;
overflow: hidden !important;
white-space: nowrap;
}
.is-Editing .playlistAppend {
visibility: hidden !important;
}
.is-Editing .tagLink {
pointer-events: none;
}
.is-Editing .dicIcon {
display: none;
}
.tagItem:not(.is-Locked) {
transition: transform 0.2s, text-shadow 0.2s;
}
.is-Editing .tagItem.is-Locked {
position: relative;
cursor: not-allowed;
}
.is-Editing .tagItem.is-Locked *{
pointer-events: none;
}
.is-Editing .tagItem.is-Locked:hover:after {
content: '${'\\01F6AB'} ロックタグ';
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
color: #ff9;
white-space: nowrap;
background: rgba(0, 0, 0, 0.6);
}
.is-Editing .tagItem:nth-child(11).is-Locked:hover:after {
content: '${'\\01F6AB'} ロックマン';
}
.is-Editing .tagItem:not(.is-Locked) {
text-shadow: 0 4px 4px rgba(0, 0, 0, 0.8);
}
.is-Editing .tagItem.is-Category * {
color: #ff9;
}
.is-Editing .tagItem.is-Category.is-Locked:hover:after {
content: '${'\\01F6AB'} カテゴリタグ';
}
.tagInputContainer {
display: none;
padding: 4px 8px;
background: #666;
z-index: 5000;
box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.8);
font-size: 16px;
}
:host-context(.videoTagsContainer.sideTab) .tagInputContainer {
position: absolute;
background: #999;
}
.tagInputContainer .tagInputText {
width: 200px;
font-size: 20px;
}
.tagInputContainer .submit {
font-size: 20px;
}
.is-Inputing .tagInputContainer {
display: inline-block;
}
.is-Updating .tagInputContainer {
pointer-events: none;
}
.tagInput {
border: 1px solid;
}
.tagInput:active {
box-shadow: 0 0 4px #fe9;
}
.submit, .cancel {
background: #666;
color: #ccc;
cursor: pointer;
border: 1px solid;
text-align: center;
}
.TagListView .tagEditContainer {
position: absolute;
left: 0;
top: 0;
z-index: 1000;
display: inline-block;
}
.TagListView.is-Empty .tagEditContainer {
position: relative;
}
.TagListView:hover .tagEditContainer {
display: inline-block;
}
.TagListView.is-Updating .tagEditContainer * {
pointer-events: none;
}
.TagListView .tagEditContainer .button,
.TagListView .videoTags .button {
border-radius: 16px;
font-size: 24px;
line-height: 24px;
margin: 0;
}
.TagListView.is-Editing .button.toggleEdit,
.TagListView .button.toggleEdit:hover {
background: #c66;
}
.TagListView .button.tagRefresh .icon {
transform: translate(-50%, -50%) rotate(90deg);
transition: transform 0.2s ease;
font-family: STIXGeneral;
}
.TagListView .button.tagRefresh:active .icon {
transform: translate(-50%, -50%) rotate(-330deg);
transition: none;
}
.TagListView.is-Inputing .button.toggleInput {
display: none;
}
.TagListView .button.toggleInput:hover {
background: #66c;
}
.tagEditContainer form {
display: inline;
}
</style>
<div class="root TagListView">
<div class="tagEditContainer">
<div
class="button command toggleEdit"
data-command="toggleEdit"
data-tooltip="タグ編集">
<span class="icon">&#9999;</span>
</div>
<div class="button command tagRefresh"
data-command="refresh"
data-tooltip="リロード">
<span class="icon">&#8635;</span>
</div>
</div>
<div class="videoTags">
<span class="videoTagsInner"></span>
<div class="tagInputContainer">
<form action="javascript: void">
<input type="text" name="tagText" class="tagInputText">
<button class="submit button">O K</button>
</form>
</div>
</div>
</div>
`).trim();
TagListView.__css__ = (`
/* Firefox用 ShaowDOMサポートしたら不要 */
.videoTagsContainer.sideTab .is-Updating {
overflow: hidden;
}
.videoTagsContainer.sideTab a {
color: #000 !important;
text-decoration: none !important;
}
.videoTagsContainer.videoHeader a {
color: #fff !important;
text-decoration: none !important;
}
.videoTagsContainer.sideTab .tagInputContainer {
position: absolute;
}
`).trim();
class TagItemMenu extends HTMLElement {
static template({text}) {
let host = location.host;
return `
<style>
.root {
display: inline-block;
--icon-size: 16px;
margin-right: 4px;
outline: none;
}
.icon {
position: relative;
display: inline-block;
vertical-align: middle;
box-sizing: border-box;
width: var(--icon-size);
height: var(--icon-size);
margin: 0;
padding: 0;
font-size: var(--icon-size);
line-height: calc(var(--icon-size));
text-align: center;
cursor: pointer;
}
.nicodic, .toggle {
background: #888;
color: #ccc;
box-shadow: 0.1em 0.1em 0 #333; 
}
.has-nicodic .nicodic,.has-nicodic .toggle {
background: #900;
}
.toggle::after {
content: '？';
position: absolute;
width: var(--icon-size);
left: 0;
font-size: 0.8em;
font-weight: bolder;
}
.menu {
display: none;
position: fixed;
background-clip: content-box;
border-style: solid;
border-width: 16px 0 16px 0;
border-color: transparent;
padding: 0;
z-index: 100;
transform: translateY(-30px);
}
:host-context(.zenzaWatchVideoInfoPanelFoot) .menu {
position: absolute;
bottom: 0;
transform: translateY(8x);
}
.root .menu:hover,
.root:focus-within .menu {
display: inline-block;
}
li {
list-style-type: none;
padding: 2px 8px 2px 20px;
background: rgba(80, 80, 80, 0.95);
}
li a {
display: inline-block;
white-space: nowrap;
text-decoration: none;
color: #ccc;
}
li a:hover {
text-decoration: underline;
}
</style>
<div class="root" tabindex="-1">
<div class="icon toggle"></div>
<ul class="menu">
<li>
<a href="//dic.nicovideo.jp/a/${text}" 
${host !== 'dic.nicovideo.jp' ? 'target="_blank"' : ''}>
大百科を見る
</a>
</li>
<li>
<a href="//ch.nicovideo.jp/search/${text}?type=video&mode=t" 
${host !== 'ch.nicovideo.jp' ? 'target="_blank"' : ''}>
チャンネル検索
</a>
</li>
<li>
<a href="https://www.google.co.jp/search?q=${text}%20site:www.nicovideo.jp&num=100&tbm=vid" 
${host !== 'www.google.co.jp' ? 'target="_blank"' : ''}>
Googleで検索
</a> 
</li>
<li>
<a href="https://www.bing.com/videos/search?q=${text}&qft=+filterui:msite-nicovideo.jp" 
${host !== 'www.bing.com' ? 'target="_blank"' : ''}>Bingで検索
</a> 
</li>
</ul>
</div>
`;
}
constructor() {
super();
this.hasNicodic = parseInt(this.dataset.hasNicodic) !== 0;
this.text = util.escapeToZenkaku(this.dataset.text);
const shadow = this._shadow = this.attachShadow({mode: 'open'});
shadow.innerHTML = this.constructor.template({text: this.text});
shadow.querySelector('.root').classList.toggle('has-nicodic', this.hasNicodic);
}
}
if (window.customElements) {
window.customElements.define('zenza-tag-item-menu', TagItemMenu);
}

class VideoInfoPanel extends Emitter {
constructor(params) {
super();
this._videoHeaderPanel = new VideoHeaderPanel(params);
this._dialog = params.dialog;
this._config = Config;
this._currentTimeGetter = params.currentTimeGetter;
this._dialog.on('canplay', this._onVideoCanPlay.bind(this));
this._dialog.on('videoCount', this._onVideoCountUpdate.bind(this));
// this._videoHeaderPanel.on('command', this._onCommand.bind(this));
if (params.node) {
this.appendTo(params.node);
}
}
}
util.addStyle(`
.zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
display: none;
pointer-events: none;
overflow: hidden;
}
.zenzaWatchVideoInfoPanel .tabs.activeTab {
margin-top: 32px;
box-sizing: border-box;
position: relative;
width: 100%;
height: calc(100% - 32px);
overflow-x: hidden;
overflow-y: visible;
overscroll-behavior: contain;
text-align: left;
}
.zenzaWatchVideoInfoPanel .tabs.relatedVideoTab.activeTab {
overflow: hidden;
}
.zenzaWatchVideoInfoPanel .tabs:not(.activeTab) {
display: none !important;
pointer-events: none;
opacity: 0;
}
.zenzaWatchVideoInfoPanel .tabSelectContainer {
position: absolute;
display: flex;
height: 32px;
z-index: 100;
width: 100%;
white-space: nowrap;
user-select: none;
}
.zenzaWatchVideoInfoPanel .tabSelect {
flex: 1;
box-sizing: border-box;
display: inline-block;
height: 32px;
font-size: 12px;
letter-spacing: 0;
line-height: 32px;
color: #666;
background: #222;
cursor: pointer;
text-align: center;
transition: text-shadow 0.2s ease, color 0.2s ease;
}
.zenzaWatchVideoInfoPanel .tabSelect.activeTab {
font-size: 14px;
letter-spacing: 0.1em;
color: #ccc;
background: #333;
}
.zenzaWatchVideoInfoPanel .tabSelect.blink:not(.activeTab) {
color: #fff;
text-shadow: 0 0 4px #ff9;
transition: none;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel.is-notFullscreen .tabSelect.blink:not(.activeTab) {
color: #fff;
text-shadow: 0 0 4px #006;
transition: none;
}
.zenzaWatchVideoInfoPanel .tabSelect:not(.activeTab):hover {
background: #888;
}
.zenzaWatchVideoInfoPanel.initializing {
}
.zenzaWatchVideoInfoPanel>* {
transition: opacity 0.4s ease;
pointer-events: none;
}
.is-mouseMoving .zenzaWatchVideoInfoPanel>*,
.zenzaWatchVideoInfoPanel:hover>* {
pointer-events: auto;
}
.zenzaWatchVideoInfoPanel.initializing>* {
opacity: 0;
color: #333;
transition: none;
}
.zenzaWatchVideoInfoPanel {
position: absolute;
top: 0;
width: 320px;
height: 100%;
box-sizing: border-box;
z-index: ${CONSTANT.BASE_Z_INDEX + 25000};
background: #333;
color: #ccc;
overflow-x: hidden;
overflow-y: hidden;
transition: opacity 0.4s ease;
}
.zenzaWatchVideoInfoPanel .ownerPageLink {
display: block;
margin: 0 auto 8px;
width: 104px;
}
.zenzaWatchVideoInfoPanel .ownerIcon {
width: 96px;
height: 96px;
border: none;
border-radius: 4px;
transition: opacity 1s ease;
vertical-align: middle;
}
.zenzaWatchVideoInfoPanel .ownerIcon.is-loading {
opacity: 0;
}
.zenzaWatchVideoInfoPanel .ownerName {
font-size: 20px;
word-break: break-all;
}
.zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
padding: 16px;
display: table;
width: 100%;
}
.zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>*{
display: block;
vertical-align: middle;
text-align: center;
}
.zenzaWatchVideoInfoPanel .videoDescription {
padding: 8px 8px 8px;
margin: 4px 0px;
word-break: break-all;
line-height: 1.5;
}
.zenzaWatchVideoInfoPanel .videoDescription a {
display: inline-block;
font-weight: bold;
text-decoration: none;
color: #ff9;
padding: 2px;
}
.zenzaWatchVideoInfoPanel .videoDescription a:visited {
color: #ffd;
}
.zenzaWatchVideoInfoPanel .videoDescription .watch {
display: block;
position: relative;
line-height: 60px;
box-sizing: border-box;
padding: 4px 16px;;
min-height: 60px;
width: 272px;
margin: 8px 10px;
background: #444;
border-radius: 4px;
}
.zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
background: #446;
}
.zenzaWatchVideoInfoPanel .videoDescription span[style],
.zenzaWatchVideoInfoPanel .videoDescription font[color] {
text-shadow: 1px 1px var(--base-description-color, #888);
}
.zenzaWatchVideoInfoPanel .videoDescription .mylistLink {
white-space: nowrap;
display: inline-block;
}
.zenzaWatchVideoInfoPanel:not(.is-pocketReady) .pocket-info {
display: none !important;
}
.pocket-info {
font-family: Menlo;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist,
.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo {
display: inline-block;
font-size: 16px;
line-height: 20px;
width: 24px;
height: 24px;
background: #666;
color: #ccc !important;
background: #666;
text-decoration: none;
border: 1px outset;
cursor: pointer;
text-align: center;
user-select: none;
margin-left: 8px;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend,
.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info,
.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
display: none;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .owner:hover .playlistAppend,
.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .playlistAppend,
.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .pocket-info,
.zenzaWatchVideoInfoPanel .videoInfoTab .watch:hover .deflistAdd {
display: inline-block;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend {
position: absolute;
bottom: 4px;
left: 16px;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info {
position: absolute;
bottom: 4px;
left: 48px;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd {
position: absolute;
bottom: 4px;
left: 80px;
}
.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:hover,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:hover,
.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:hover,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:hover,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:hover {
transform: scale(1.5);
}
.zenzaWatchVideoInfoPanel .videoInfoTab .pocket-info:active,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistAppend:active,
.zenzaWatchVideoInfoPanel .videoInfoTab .deflistAdd:active,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetMylist:active,
.zenzaWatchVideoInfoPanel .videoInfoTab .playlistSetUploadedVideo:active {
transform: scale(1.2);
border: 1px inset;
}
.zenzaWatchVideoInfoPanel .videoDescription .watch .videoThumbnail {
position: absolute;
right: 16px;
height: 60px;
pointer-events: none;
}
.zenzaWatchVideoInfoPanel .videoDescription:hover .watch .videoThumbnail {
filter: none;
}
.zenzaWatchVideoInfoPanel .publicStatus,
.zenzaWatchVideoInfoPanel .videoTagsContainer {
display: none;
}
.zenzaWatchVideoInfoPanel .publicStatus {
display: none;
position: relative;
margin: 8px 0;
padding: 8px;
line-height: 150%;
text-align; center;
color: #333;
}
.zenzaWatchVideoInfoPanel .videoMetaInfoContainer {
display: inline-block;
padding: 0 8px;
}
.zenzaScreenMode_normal .is-backComment .zenzaWatchVideoInfoPanel,
.zenzaScreenMode_big .is-backComment .zenzaWatchVideoInfoPanel {
opacity: 0.7;
}
.zenzaWatchVideoInfoPanel .relatedVideoTab .relatedVideoContainer {
box-sizing: border-box;
position: relative;
width: 100%;
height: 100%;
margin: 0;
user-select: none;
}
.zenzaWatchVideoInfoPanel .videoListFrame,
.zenzaWatchVideoInfoPanel .commentListFrame {
width: 100%;
height: 100%;
box-sizing: border-box;
border: 0;
background: #333;
}
.zenzaWatchVideoInfoPanel .nowLoading {
display: none;
opacity: 0;
pointer-events: none;
}
.zenzaWatchVideoInfoPanel.initializing .nowLoading {
display: block !important;
opacity: 1 !important;
color: #888;
}
.zenzaWatchVideoInfoPanel .nowLoading {
position: absolute;
top: 0; left: 0;
width: 100%; height: 100%;
}
.zenzaWatchVideoInfoPanel .kurukuru {
position: absolute;
display: inline-block;
font-size: 96px;
left: 50%;
top: 50%;
transform: translate(-50%, -50%);
}
@keyframes loadingRolling {
0% { transform: rotate(0deg); }
100% { transform: rotate(1800deg); }
}
.zenzaWatchVideoInfoPanel.initializing .kurukuruInner {
display: inline-block;
pointer-events: none;
text-align: center;
text-shadow: 0 0 4px #888;
animation-name: loadingRolling;
animation-iteration-count: infinite;
animation-duration: 4s;
}
.zenzaWatchVideoInfoPanel .nowLoading .loadingMessage {
position: absolute;
display: inline-block;
font-family: Impact;
font-size: 32px;
text-align: center;
top: calc(50% + 48px);
left: 0;
width: 100%;
}
${CONSTANT.SCROLLBAR_CSS}
.zenzaWatchVideoInfoPanel .zenzaWatchVideoInfoPanelInner {
display: flex;
flex-direction: column;
height: 100%;
}
.zenzaWatchVideoInfoPanelContent {
flex: 1;
}
.zenzaTubeButton {
display: inline-block;
padding: 4px 8px;
cursor: pointer;
background: #666;
color: #ccc;
border-radius: 4px;
border: 1px outset;
margin: 0 8px;
}
.zenzaTubeButton:hover {
box-shadow: 0 0 8px #fff, 0 0 4px #ccc;
}
.zenzaTubeButton span {
pointer-events: none;
display: inline-block;
background: #ccc;
color: #333;
border-radius: 4px;
}
.zenzaTubeButton:hover span {
background: #f33;
color: #ccc;
}
.zenzaTubeButton:active {
box-shadow: 0 0 2px #ccc, 0 0 4px #000 inset;
border: 1px inset;
}
.zenzaWatchVideoInfoPanel .relatedInfoMenuContainer {
text-align: left;
}
`, {className: 'videoInfoPanel'});
util.addStyle(`
.is-open .zenzaWatchVideoInfoPanel>* {
display: none;
pointer-events: none;
}
.zenzaWatchVideoInfoPanel:hover>* {
display: inherit;
pointer-events: auto;
}
.zenzaWatchVideoInfoPanel:hover .tabSelectContainer {
display: flex;
}
.zenzaWatchVideoInfoPanel {
top: 20%;
right: calc(32px - 320px);
left: auto;
width: 320px;
height: 60%;
background: none;
opacity: 0;
box-shadow: none;
transition: opacity 0.4s ease, transform 0.4s ease 1s;
will-change: opacity, transform;
}
.is-mouseMoving .zenzaWatchVideoInfoPanel {
height: 60%;
background: none;
border: 1px solid #888;
opacity: 0.5;
}
.zenzaWatchVideoInfoPanel.is-slideOpen,
.zenzaWatchVideoInfoPanel:hover {
background: #333;
box-shadow: 4px 4px 4px #000;
border: none;
opacity: 0.9;
transform: translate3d(-288px, 0, 0);
transition: opacity 0.4s ease, transform 0.4s ease 1s;
}
`, {className: 'screenMode for-full videoInfoPanel'});
util.addStyle(`
.zenzaScreenMode_small .zenzaWatchVideoInfoPanel {
display: none;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
width: calc(100% - 16px);
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect {
background: #ccc;
color: #888;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelect.activeTab {
background: #ddd;
color: black;
border: none;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
top: 230px;
left: 0;
width: ${CONSTANT.SIDE_PLAYER_WIDTH}px;
height: calc(100vh - 296px);
bottom: 48px;
padding: 8px;
box-shadow: none;
background: #f0f0f0;
color: #000;
border: 1px solid #333;
margin: 4px 2px;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .publicStatus {
display: block;
text-align: center;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a {
color: #006699;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription a:visited {
color: #666666;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
display: block;
bottom: 48px;
width: 364px;
margin: 0 auto;
padding: 8px;
background: #ccc;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch {
background: #ddd;
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoDescription .watch:hover {
background: #ddf;
}
.zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar {
background: #f0f0f0;
}
.zenzaScreenMode_sideView .videoInfoTab::-webkit-scrollbar-thumb {
border-radius: 0;
background: #ccc;
}
`, {className: 'screenMode for-popup videoInfoPanel'});
util.addStyle(`
.is-open .zenzaWatchVideoInfoPanel {
display: none;
left: calc(100%);
top: 0;
}
@media screen {
@media (min-width: 992px) {
.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
display: inherit;
}
}
@media (min-width: 1216px) {
.zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
display: inherit;
}
}
/* 縦長モニター */
@media
(max-width: 991px) and (min-height: 700px)
{
.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel {
display: inherit;
top: 100%;
left: 0;
width: 100%;
height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
}
.zenzaScreenMode_normal .ZenzaIchibaItemView {
margin: 8px 8px 96px;
}
.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
display: table;
}
.zenzaScreenMode_normal .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
display: table-cell;
text-align: left;
}
.zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel {
width: 100% !important;
}
}
@media
(max-width: 1215px) and (min-height: 700px) {
.zenzaScreenMode_big .zenzaWatchVideoInfoPanel {
display: inherit;
top: 100%;
left: 0;
width: 100%;
height: ${CONSTANT.BOTTOM_PANEL_HEIGHT}px;
z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
}
.zenzaScreenMode_big .ZenzaIchibaItemView {
margin: 8px 8px 96px;
}
.zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer {
display: table;
}
.zenzaScreenMode_big .zenzaWatchVideoInfoPanel .videoOwnerInfoContainer>* {
display: table-cell;
text-align: left;
}
.zenzaScreenMode_big .zenzaWatchVideoHeaderPanel {
width: 100% !important;
}
}
}
`, {className: 'screenMode for-dialog videoInfoPanel'});
util.addStyle(`
.zenzaWatchVideoInfoPanel .comment {
padding-left: 0;
}
`, {className: 'domain slack-com', disabled: true})
VideoInfoPanel.__tpl__ = (`
<div class="zenzaWatchVideoInfoPanel show initializing">
<div class="nowLoading">
<div class="kurukuru"><span class="kurukuruInner">&#x262F;</span></div>
<div class="loadingMessage">Loading...</div>
</div>
<div class="tabSelectContainer"><div class="tabSelect videoInfoTab activeTab" data-command="selectTab" data-param="videoInfoTab">動画情報</div><div class="tabSelect relatedVideoTab" data-command="selectTab" data-param="relatedVideoTab">関連動画</div></div>
<div class="tabs videoInfoTab activeTab">
<div class="zenzaWatchVideoInfoPanelInner">
<div class="zenzaWatchVideoInfoPanelContent">
<div class="videoOwnerInfoContainer">
<a class="ownerPageLink" rel="noopener" target="_blank">
<img class="ownerIcon loading"/>
</a>
<span class="owner">
<span class="ownerName"></span>
<zenza-playlist-append class="playlistSetUploadedVideo userVideo"
data-command="ownerVideo"
title="投稿動画一覧をプレイリストで開く">▶</zenza-playlist-append>
</span>
</div>
<div class="publicStatus">
<div class="videoMetaInfoContainer"></div>
<div class="relatedInfoMenuContainer"></div>
</div>
<div class="videoDescription"></div>
</div>
<div class="zenzaWatchVideoInfoPanelFoot">
<div class="uaaContainer"></div>
<div class="ichibaContainer"></div>
<div class="videoTagsContainer sideTab"></div>
</div>
</div>
</div>
<div class="tabs relatedVideoTab">
<div class="relatedVideoContainer"></div>
</div>
</div>
`).trim();
_.assign(VideoInfoPanel.prototype, {
_initializeDom: function () {
if (this._isInitialized) {
return;
}
this._isInitialized = true;
// util.addStyle(VideoInfoPanel.__css__);
let $view = this._$view = $(VideoInfoPanel.__tpl__);
const view = this._view = $view[0];
let $icon = this._$ownerIcon = $view.find('.ownerIcon');
this._$ownerName = $view.find('.ownerName');
this._$ownerPageLink = $view.find('.ownerPageLink');
this._description = view.querySelector('.videoDescription');
this._tagListView = new TagListView({
parentNode: view.querySelector('.videoTagsContainer')
});
this._relatedInfoMenu = new RelatedInfoMenu({
parentNode: view.querySelector('.relatedInfoMenuContainer')
});
this._videoMetaInfo = new VideoMetaInfo({
parentNode: view.querySelector('.videoMetaInfoContainer')
});
this._uaaContainer = view.querySelector('.uaaContainer');
this._uaaView = new UaaView(
{parentNode: this._uaaContainer});
this._ichibaContainer = view.querySelector('.ichibaContainer');
this._ichibaItemView = new IchibaItemView(
{parentNode: this._ichibaContainer});
view.addEventListener('mousemove', e => e.stopPropagation());
view.addEventListener('command', this._onCommandEvent.bind(this));
view.addEventListener('click', this._onClick.bind(this));
view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
$icon.on('load', () => $icon.removeClass('is-loading'));
view.classList.add(util.fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
ZenzaWatch.emitter.on('fullscreenStatusChange', isFull => {
view.classList.toggle('is-fullscreen', isFull);
view.classList.toggle('is-notFullscreen', !isFull);
});
view.addEventListener('touchenter', () => view.classList.add('is-slideOpen'), {passive: true});
ZenzaWatch.emitter.on('hideHover', () => view.classList.remove('is-slideOpen'));
MylistPocketDetector.detect().then(pocket => {
this._pocket = pocket;
view.classList.add('is-pocketReady');
if (pocket.external.observe) {
pocket.external.observe({
query: 'zenza-video-item',
container: this._description,
// closest: ''
});
}
});
},
update: function (videoInfo) {
this._videoInfo = videoInfo;
this._videoHeaderPanel.update(videoInfo);
let owner = videoInfo.owner;
this._$ownerIcon.attr('src', owner.icon);
this._$ownerPageLink.attr('href', owner.url);
this._$ownerName.text(owner.name);
this._videoMetaInfo.update(videoInfo);
this._tagListView.update({
tagList: videoInfo.tagList,
watchId: videoInfo.watchId,
videoId: videoInfo.videoId,
token: videoInfo.csrfToken,
watchAuthKey: videoInfo.watchAuthKey
});
this._updateVideoDescription(videoInfo.description, videoInfo.isChannel);
this._$view
.removeClass('userVideo channelVideo initializing')
.toggleClass('is-community', this._videoInfo.isCommunityVideo)
.toggleClass('is-mymemory', this._videoInfo.isMymemory)
.addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo');
this._ichibaItemView.clear();
this._ichibaItemView.videoId = videoInfo.videoId;
this._uaaView.clear();
this._uaaView.update(videoInfo);
this._relatedInfoMenu.update(videoInfo);
},
/**
* 説明文中のurlの自動リンク等の処理
*/
_updateVideoDescription: function (html) {
this._description.textContent = '';
this._zenTubeUrl = null;
const watchLink = watchLink => {
let videoId = watchLink.textContent.replace('watch/', '');
if (
!/^(sm|nm|so|)[0-9]+$/.test(videoId) ||
!['www.nicovideo.jp'].includes(watchLink.hostname) || !watchLink.pathname.startsWith('/watch/')) {
return;
}
watchLink.classList.add('noHoverMenu');
Object.assign(watchLink.dataset, {command: 'open', param: videoId});
let $watchLink = util.$(watchLink);
let thumbnail = util.getThumbnailUrlByVideoId(videoId);
if (thumbnail) {
let $img = util.$('<img class="videoThumbnail">').attr('src', thumbnail);
$watchLink.append($img);
}
if (!window.customElements) {
let buttons = util.$(`<zenza-playlist-append
class="playlistAppend clickable-item" title="プレイリストで開く"
data-command="playlistAppend" data-param="${videoId}"
>▶</zenza-playlist-append><div
class="deflistAdd" title="とりあえずマイリスト"
data-command="deflistAdd" data-param="${videoId}"
>&#x271A;</div
><div class="pocket-info" title="動画情報"
data-command="pocket-info" data-param="${videoId}"
>？</div>`);
$watchLink.append(buttons);
} else {
let vitem = document.createElement('zenza-video-item');
vitem.dataset.videoId = videoId;
// watchLink.replaceWith(vitem);
watchLink.insertAdjacentElement('afterend', vitem);
vitem.append(watchLink);
}
};
const seekTime = seek => {
let [min, sec] = (seek.dataset.seektime || '0:0').split(':');
Object.assign(seek.dataset, {command: 'seek', type: 'number', param: min * 60 + sec * 1});
};
const mylistLink = link => {
link.classList.add('mylistLink');
let mylistId = link.textContent.split('/')[1];
let button = util.$(`<zenza-mylist-link data-mylist-id="${mylistId}">
${link.outerHTML}
<zenza-playlist-append
class="playlistSetMylist clickable-item" title="プレイリストで開く"
data-command="playlistSetMylist" data-param="${mylistId}"
>▶</zenza-playlist-append>
</zenza-mylist-link>`)[0];
link.replaceWith(button);
};
const youtube = link => {
const btn = document.createElement('zentube-button');
if (!this._zenTubeUrl) {
this._zenTubeUrl = link.href;
}
btn.className = 'zenzaTubeButton';
btn.innerHTML = '▷Zen<span>Tube</span>';
btn.title = 'ZenzaWatchで開く(実験中)';
btn.setAttribute('accesskey', 'z');
btn.setAttribute('data-command', 'setVideo');
btn.setAttribute('data-param', link.href);
link.parentNode.insertBefore(btn, link);
};
Promise.resolve().then(() => {
const description = util.createDom(html);
Array.from(description.querySelectorAll('a')).forEach(a => {
a.classList.add('noHoverMenu');
let href = a.href;
if (a.classList.contains('watch')) {
watchLink(a);
} else if (a.classList.contains('seekTime')) {
seekTime(a);
} else if (/^mylist\//.test(a.textContent)) {
mylistLink(a);
} else if (/^https?:\/\/((www\.|)youtube\.com\/watch|youtu\.be)/.test(href)) {
youtube(a);
}
});
this._description.append(description);
});
},
_onVideoCanPlay: function (watchId, videoInfo, options) {
// 動画の再生を優先するため、比較的どうでもいい要素はこのタイミングで初期化するのがよい
if (!this._relatedVideoList) {
this._relatedVideoList = new RelatedVideoList({
container: this._$view.find('.relatedVideoContainer')[0]
});
this._relatedVideoList.on('command', this._onCommand.bind(this));
}
if (this._config.getValue('autoZenTube') && this._zenTubeUrl && !options.isAutoZenTubeDisabled()) {
window.setTimeout(() => {
window.console.info('%cAuto ZenTube', this._zenTubeUrl);
this.emit('command', 'setVideo', this._zenTubeUrl);
}, 100);
}
let relatedVideo = [VideoListItem.createByVideoInfoModel(videoInfo).serialize()];
RecommendAPILoader.load({videoId: videoInfo.videoId}).then(data => {
const items = data.items || [];
(items || []).forEach(item => {
if (item.contentType !== 'video') {
return;
}
let content = item.content;
relatedVideo.push({
_format: 'recommendApi',
_data: item,
id: item.id,
title: content.title,
length_seconds: content.duration,
num_res: content.count.comment,
mylist_counter: content.count.mylist,
view_counter: content.count.view,
thumbnail_url: content.thumbnail.url,
first_retrieve: content.registeredAt,
has_data: true,
is_translated: false
});
});
this._relatedVideoList.update(relatedVideo, watchId);
});
},
_onVideoCountUpdate: function (...args) {
if (!this._videoHeaderPanel) {
return;
}
this._videoMetaInfo.updateVideoCount(...args);
this._videoHeaderPanel.updateVideoCount(...args);
},
_onClick: function(e) {
e.stopPropagation();
if (
(e.button !== 0 || e.metaKey || e.shiftKey || e.altKey || e.ctrlKey)) {
return true;
}
let target = e.target.closest('[data-command]');
if (!target) {
ZenzaWatch.emitter.emitAsync('hideHover'); // 手抜き
return;
}
let command = target.dataset.command;
let param = target.dataset.param;
let type = target.dataset.type;
if (param && (type === 'bool' || type === 'json')) {
param = JSON.parse(param);
}
e.preventDefault();
util.dispatchCommand(e.target, command, param);
},
_onCommand: function (command, param) {
switch (command) {
default:
util.dispatchCommand(this._view, command, param);
break;
}
},
_onCommandEvent: function(e) {
const {command, param} = e.detail;
switch (command) {
case 'pocket-info':
this._pocket.external.info(param);
break;
case 'ownerVideo':
util.dispatchCommand(this._view, 'playlistSetUploadedVideo', this._videoInfo.owner.id);
break;
default:
return;
}
e.stopPropagation();
},
appendTo: function (node) {
let $node = $(node);
this._initializeDom();
$node.append(this._$view);
this._videoHeaderPanel.appendTo($node);
},
hide: function () {
this._videoHeaderPanel.hide();
},
close: function () {
this._videoHeaderPanel.close();
},
clear: function () {
this._videoHeaderPanel.clear();
this._$view.addClass('initializing');
this._$ownerIcon.addClass('is-loading');
this._description.textContent = '';
},
selectTab: function (tabName) {
let $view = this._$view;
let $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
this._activeTabName = tabName;
$view.find('.activeTab').removeClass('activeTab');
$target.addClass('activeTab');
},
blinkTab: function (tabName) {
let $view = this._$view;
let $target = $view.find(`.tabs.${tabName}, .tabSelect.${tabName}`);
if (!$target.length) {
return;
}
$target.addClass('blink');
window.setTimeout(() => {
$target.removeClass('blink');
}, 50);
},
appendTab: function (tabName, title, content) {
let $view = this._$view;
let $select =
$('<div class="tabSelect"/>')
.addClass(tabName)
.attr('data-command', 'selectTab')
.attr('data-param', tabName)
.text(title);
let $body = $('<div class="tabs"/>')
.addClass(tabName);
if (content) {
$body.append($(content));
}
$view.find('.tabSelectContainer').append($select);
$view.append($body);
if (this._activeTabName === tabName) {
$select.addClass('activeTab');
$body.addClass('activeTab');
}
return $body;
}
});
class VideoHeaderPanel extends Emitter {
constructor(params) {
super();
this._currentTimeGetter = params.currentTimeGetter;
}
}
util.addStyle(`
.zenzaScreenMode_small .zenzaWatchVideoHeaderPanel {
display: none;
}
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
top: 0;
left: 400px;
width: calc(100vw - 400px);
bottom: auto;
background: #272727;
opacity: 0.9;
height: 40px;
}
/* ヘッダ追従 */
body.zenzaScreenMode_sideView:not(.nofix) .zenzaWatchVideoHeaderPanel {
top: 0;
}
/* ヘッダ固定 */
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTitleContainer {
margin: 0;
}
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .publicStatus,
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel .videoTagsContainer {
display: none;
}
@media screen and (min-width: 1432px)
{
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .tabSelectContainer {
width: calc(100% - 16px);
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel {
top: calc((100vw - 1024px) * 9 / 16 + 4px);
width: calc(100vw - 1024px);
height: calc(100vh - (100vw - 1024px) * 9 / 16 - 70px);
}
.zenzaScreenMode_sideView .zenzaWatchVideoInfoPanel .videoTagsContainer {
width: calc(100vw - 1024px - 26px);
}
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel {
width: calc(100vw - (100vw - 1024px));
left: calc(100vw - 1024px);
}
}
`, {className: 'screenMode for-popup videoHeaderPanel', disabled: true});
util.addStyle(`
body .is-open .zenzaWatchVideoHeaderPanel {
width: calc(100% + ${CONSTANT.RIGHT_PANEL_WIDTH}px);
}
.zenzaWatchVideoHeaderPanel.is-onscreen {
top: 0px;
bottom: auto;
background: rgba(0, 0, 0, 0.5);
opacity: 0;
box-shadow: none;
}
.is-loading .zenzaWatchVideoHeaderPanel.is-onscreen {
opacity: 0.6;
transition: 0.4s opacity;
}
.zenzaWatchVideoHeaderPanel.is-onscreen:hover {
opacity: 1;
transition: 0.5s opacity;
}
.zenzaWatchVideoHeaderPanel.is-onscreen .videoTagsContainer {
display: none;
width: calc(100% - 240px);
}
.zenzaWatchVideoHeaderPanel.is-onscreen:hover .videoTagsContainer {
display: block;
}
.zenzaWatchVideoHeaderPanel.is-onscreen .videoTitleContainer {
width: calc(100% - 180px);
}
`, {className: 'screenMode for-dialog videoHeaderPanel', disabled: true});
util.addStyle(`
.is-open .zenzaWatchVideoHeaderPanel {
position: absolute; /* fixedだとFirefoxのバグでおかしくなる */
top: 0px;
bottom: auto;
background: rgba(0, 0, 0, 0.5);
opacity: 0;
box-shadow: none;
}
.is-open.is-loading .zenzaWatchVideoHeaderPanel,
.is-open.is-mouseMoving .zenzaWatchVideoHeaderPanel {
opacity: 0.6;
transition: 0.4s opacity;
}
.is-open .showVideoHeaderPanel .zenzaWatchVideoHeaderPanel,
.is-open .zenzaWatchVideoHeaderPanel:hover {
opacity: 1;
transition: 0.5s opacity;
}
.is-open .videoTagsContainer {
display: none;
width: calc(100% - 240px);
}
.is-open .zenzaWatchVideoHeaderPanel:hover .videoTagsContainer {
display: block;
}
.is-open .zenzaWatchVideoHeaderPanel .videoTitleContainer {
width: calc(100% - 180px);
}
`, {className: 'screenMode for-full videoHeaderPanel', disabled: true});
VideoHeaderPanel.__css__ = (`
.zenzaWatchVideoHeaderPanel {
position: absolute;
width: calc(100%);
z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
box-sizing: border-box;
padding: 8px 8px 0;
bottom: calc(100% + 8px);
left: 0;
background: #333;
color: #ccc;
text-align: left;
box-shadow: 4px 4px 4px #000;
transition: opacity 0.4s ease;
}
.zenzaWatchVideoHeaderPanel.is-onscreen {
width: 100% !important;
}
.zenzaScreenMode_sideView .zenzaWatchVideoHeaderPanel,
.zenzaWatchVideoHeaderPanel.is-fullscreen {
z-index: ${CONSTANT.BASE_Z_INDEX + 20000};
}
.zenzaWatchVideoHeaderPanel>* {
pointer-events: none;
}
.is-mouseMoving .zenzaWatchVideoHeaderPanel>*,
.zenzaWatchVideoHeaderPanel:hover>* {
pointer-events: auto;
}
.zenzaWatchVideoHeaderPanel.initializing {
display: none;
}
.zenzaWatchVideoHeaderPanel.initializing>*{
opacity: 0;
}
.zenzaWatchVideoHeaderPanel .videoTitleContainer {
margin: 8px;
}
.zenzaWatchVideoHeaderPanel .publicStatus {
position: relative;
color: #ccc;
}
.zenzaWatchVideoHeaderPanel .videoTitle {
font-size: 24px;
color: #fff;
text-overflow: ellipsis;
white-space: nowrap;
overflow: hidden;
display: block;
padding: 2px 0;
}
.zenzaWatchVideoHeaderPanel .videoTitle::before {
display: none;
position: absolute;
font-size: 12px;
top: 0;
left: 0;
background: #333;
border: 1px solid #888;
padding: 2px 4px;
pointer-events: none;
}
.zenzaWatchVideoHeaderPanel.is-mymemory:not(:hover) .videoTitle::before {
content: 'マイメモリー';
display: inline-block;
}
.zenzaWatchVideoHeaderPanel.is-community:not(:hover) .videoTitle::before {
content: 'コミュニティ動画';
display: inline-block;
}
.videoMetaInfoContainer {
display: inline-block;
}
.zenzaScreenMode_normal .is-backComment .zenzaWatchVideoHeaderPanel,
.zenzaScreenMode_big .is-backComment .zenzaWatchVideoHeaderPanel {
opacity: 0.7;
}
.zenzaWatchVideoHeaderPanel .relatedInfoMenuContainer {
display: inline-block;
position: absolute;
top: 0;
margin: 0 16px;
z-index: 1000;
}
.zenzaWatchVideoHeaderPanel:focus-within,
.zenzaWatchVideoHeaderPanel.is-relatedMenuOpen {
z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
}
`);
VideoHeaderPanel.__tpl__ = (`
<div class="zenzaWatchVideoHeaderPanel show initializing" style="display: none;">
<h2 class="videoTitleContainer">
<span class="videoTitle"></span>
</h2>
<p class="publicStatus">
<span class="videoMetaInfoContainer"></span>
<span class="relatedInfoMenuContainer"></span>
</p>
<div class="videoTagsContainer videoHeader">
</div>
</div>
`).trim();
_.assign(VideoHeaderPanel.prototype, {
_initializeDom: function () {
if (this._isInitialized) {
return;
}
this._isInitialized = true;
util.addStyle(VideoHeaderPanel.__css__);
let $view = this._$view = $(VideoHeaderPanel.__tpl__);
let view = $view[0];
this._$videoTitle = $view.find('.videoTitle');
this._searchForm = new VideoSearchForm({
parentNode: view
});
view.addEventListener('wheel', e => e.stopPropagation(), {passive: true});
this._tagListView = new TagListView({
parentNode: view.querySelector('.videoTagsContainer')
});
this._relatedInfoMenu = new RelatedInfoMenu({
parentNode: view.querySelector('.relatedInfoMenuContainer'),
isHeader: true
});
this._relatedInfoMenu.on('open', () => $view.addClass('is-relatedMenuOpen'));
this._relatedInfoMenu.on('close', () => $view.removeClass('is-relatedMenuOpen'));
this._videoMetaInfo = new VideoMetaInfo({
parentNode: view.querySelector('.videoMetaInfoContainer'),
});
view.classList.add(util.fullscreen.now() ? 'is-fullscreen' : 'is-notFullscreen');
ZenzaWatch.emitter.on('fullScreenStatusChange', isFull => {
view.classList.toggle('is-fullscreen', isFull);
view.classList.toggle('is-notFullscreen', !isFull);
});
window.addEventListener('resize', _.debounce(this._onResize.bind(this), 500));
},
update: function (videoInfo) {
this._videoInfo = videoInfo;
const videoTitle = util.unescapeHtml(videoInfo.title);
this._$videoTitle.text(videoTitle).attr('title', videoTitle);
let watchId = videoInfo.watchId;
this._videoMetaInfo.update(videoInfo);
this._tagListView.update({
tagList: videoInfo.tagList,
watchId,
videoId: videoInfo.videoId,
token: videoInfo.csrfToken,
watchAuthKey: videoInfo.watchAuthKey
});
this._relatedInfoMenu.update(videoInfo);
this._$view
.removeClass('userVideo channelVideo initializing')
.toggleClass('is-community', this._videoInfo.isCommunityVideo)
.toggleClass('is-mymemory', this._videoInfo.isMymemory)
.toggleClass('has-Parent', this._videoInfo.hasParentVideo)
.addClass(videoInfo.isChannel ? 'channelVideo' : 'userVideo')
.css('display', '');
window.setTimeout(() => this._onResize(), 1000);
},
updateVideoCount: function (...args) {
this._videoMetaInfo.updateVideoCount(...args);
},
_onResize: function () {
const view = this._$view[0];
const rect = view.getBoundingClientRect();
let isOnscreen = view.classList.contains('is-onscreen');
const height = rect.bottom - rect.top;
const top = isOnscreen ? (rect.top - height) : rect.top;
view.classList.toggle('is-onscreen', top < -32);
},
appendTo: function ($node) {
this._initializeDom();
$node.append(this._$view);
},
hide: function () {
if (!this._$view) {
return;
}
this._$view.removeClass('show');
},
close: function () {
},
clear: function () {
if (!this._$view) {
return;
}
this._$view.addClass('initializing');
this._$videoTitle.text('------');
},
getPublicStatusDom: function () {
return this._$view.find('.publicStatus').html();
}
});
class VideoSearchForm extends Emitter {
constructor(...args) {
super();
this._config = Config.namespace('videoSearch');
this._initDom(...args);
}
_initDom({parentNode}) {
let tpl = document.getElementById('zenzaVideoSearchPanelTemplate');
if (!tpl) {
util.addStyle(VideoSearchForm.__css__);
tpl = document.createElement('template');
tpl.innerHTML = VideoSearchForm.__tpl__;
tpl.id = 'zenzaVideoSearchPanelTemplate';
document.body.appendChild(tpl);
}
const view = document.importNode(tpl.content, true);
this._view = view.querySelector('*');
this._form = view.querySelector('form');
this._word = view.querySelector('.searchWordInput');
this._sort = view.querySelector('.searchSortSelect');
// this._submit = view.querySelector('.searchSubmit');
this._mode = view.querySelector('.searchMode') || 'tag';
this._form.addEventListener('submit', this._onSubmit.bind(this));
const config = this._config;
const form = this._form;
form['ownerOnly'].checked = config.getValue('ownerOnly');
let confMode = config.getValue('mode');
if (typeof confMode === 'string' && ['tag', 'keyword'].includes(confMode)) {
form['mode'].value = confMode;
} else if (typeof confMode === 'boolean') {
form['mode'].value = confMode ? 'tag' : 'keyword';
} else {
form['mode'].value = 'tag';
}
form['word'].value = config.getValue('word');
form['sort'].value = config.getValue('sort');
this._view.addEventListener('click', this._onClick.bind(this));
const submit = _.debounce(this.submit.bind(this), 500);
Array.from(view.querySelectorAll('input, select')).forEach(item => {
if (item.type === 'checkbox') {
item.addEventListener('change', () => {
this._word.focus();
config.setValue(item.name, item.checked);
submit();
});
} else if (item.type === 'radio') {
item.addEventListener('change', () => {
this._word.focus();
config.setValue(item.name, this._form[item.name].value);
submit();
});
} else {
item.addEventListener('change', () => {
config.setValue(item.name, item.value);
if (item.tagName === 'SELECT') {
submit();
}
});
}
});
ZenzaWatch.emitter.on('searchVideo', ({word}) => {
form['word'].value = word;
});
if (parentNode) {
parentNode.appendChild(view);
}
ZenzaWatch.debug.searchForm = this;
}
_onClick(e) {
e.stopPropagation();
const tagName = (e.target.tagName || '').toLowerCase();
const target = e.target.closest('.command');
if (!['input', 'select'].includes(tagName)) {
this._word.focus();
}
if (!target) {
return;
}
const command = target.dataset.command;
if (!command) {
return;
}
e.preventDefault();
const type = target.getAttribute('data-type') || 'string';
let param = target.getAttribute('data-param');
if (type !== 'string') { param = JSON.parse(param); }
switch (command) {
case 'clear':
this._word.value = '';
break;
default:
util.dispatchCommand(e.target, command, param);
}
}
_onSubmit(e) {
this.submit();
e.stopPropagation();
}
submit() {
const word = this.word;
if (!word) {
return;
}
util.dispatchCommand(this._view, 'playlistSetSearchVideo', {
word,
option: {
searchType: this.searchType,
sort: this.sort,
order: this.order,
owner: this.isOwnerOnly,
playlistSort: this.isPlaylistSort
}
});
}
_hasFocus() {
return !!document.activeElement.closest('#zenzaVideoSearchPanel');
}
_updateFocus() {
}
get word() {
return (this._word.value || '').trim();
}
get searchType() {
return this._form.mode.value;
}
get sort() {
const sortTmp = (this._sort.value || '').split(',');
const playlistSort = sortTmp[0] === 'playlist';
return playlistSort ? 'f' : sortTmp[0];
}
get order() {
const sortTmp = (this._sort.value || '').split(',');
return sortTmp[1] || 'd';
}
get isPlaylistSort() {
const sortTmp = (this._sort.value || '').split(',');
return sortTmp[0] === 'playlist';
}
get isOwnerOnly() {
return this._form['ownerOnly'].checked;
}
}
util.addStyle(`
.is-open .zenzaWatchVideoHeaderPanel .zenzaVideoSearchPanel {
top: 120px;
right: 32px;
}
`, {className: 'screenMode for-popup videoSearchPanel', disabled: true});
VideoSearchForm.__css__ = (`
.zenzaVideoSearchPanel {
pointer-events: auto;
position: absolute;
top: 32px;
right: 8px;
padding: 0 8px
width: 248px;
z-index: 1000;
}
.zenzaScreenMode_normal .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
.zenzaScreenMode_big .zenzaWatchVideoHeaderPanel.is-onscreen .zenzaVideoSearchPanel,
.zenzaScreenMode_3D .zenzaVideoSearchPanel,
.zenzaScreenMode_wide .zenzaVideoSearchPanel,
.zenzaWatchVideoHeaderPanel.is-fullscreen .zenzaVideoSearchPanel {
top: 64px;
}
.zenzaVideoSearchPanel:focus-within {
background: rgba(50, 50, 50, 0.8);
}
.zenzaVideoSearchPanel:not(:focus-within) .focusOnly {
display: none;
}
.zenzaVideoSearchPanel .searchInputHead {
position: absolute;
opacity: 0;
pointer-events: none;
padding: 4px;
transition: transform 0.2s ease, opacity 0.2s ease;
}
.zenzaVideoSearchPanel .searchInputHead:hover,
.zenzaVideoSearchPanel:focus-within .searchInputHead {
background: rgba(50, 50, 50, 0.8);
}
.zenzaVideoSearchPanel .searchInputHead:hover,
.zenzaVideoSearchPanel:focus-within .searchInputHead {
pointer-events: auto;
opacity: 1;
transform: translate3d(0, -100%, 0);
}
.zenzaVideoSearchPanel .searchMode {
position: absolute;
opacity: 0;
}
.zenzaVideoSearchPanel .searchModeLabel {
cursor: pointer;
}
.zenzaVideoSearchPanel .searchModeLabel span {
display: inline-block;
padding: 4px 8px;
color: #666;
cursor: pointer;
border-radius: 8px;
border-color: transparent;
border-style: solid;
border-width: 1px;
pointer-events: none;
}
.zenzaVideoSearchPanel .searchModeLabel:hover span {
background: #888;
}
.zenzaVideoSearchPanel .searchModeLabel input:checked + span {
color: #ccc;
border-color: currentColor;
cursor: default;
}
.zenzaVideoSearchPanel .searchWord {
white-space: nowrap;
padding: 4px;
}
.zenzaVideoSearchPanel .searchWordInput {
width: 200px;
margin: 0;
height: 24px;
line-height: 24px;
background: transparent;
font-size: 16px;
padding: 0 4px;
color: #ccc;
border: 1px solid #ccc;
opacity: 0;
transition: opacity 0.2s ease;
}
.zenzaVideoSearchPanel .searchWordInput:-webkit-autofill {
background: transparent;
}
.is-mouseMoving .zenzaVideoSearchPanel:not(:focus-within) .searchWordInput {
opacity: 0.5;
}
.is-mouseMoving .zenzaVideoSearchPanel:not(:focus-within) .searchWordInput:hover {
opacity: 0.8;
}
.zenzaVideoSearchPanel:focus-within .searchWordInput {
opacity: 1 !important;
}
.zenzaVideoSearchPanel .searchSubmit {
width: 34px;
margin: 0;
padding: 0;
font-size: 14px;
line-height: 24px;
height: 24px;
border: solid 1px #ccc;
cursor: pointer;
background: #888;
pointer-events: none;
opacity: 0;
transform: translate3d(-100%, 0, 0);
transition: opacity 0.2s ease, transform 0.2s ease;
}
.zenzaVideoSearchPanel:focus-within .searchSubmit {
pointer-events: auto;
opacity: 1;
transform: translate3d(0, 0, 0);
}
.zenzaVideoSearchPanel:focus-within .searchSubmit:hover {
transform: scale(1.5);
}
.zenzaVideoSearchPanel:focus-within .searchSubmit:active {
transform: scale(1.2);
border-style: inset;
}
.zenzaVideoSearchPanel .searchClear {
display: inline-block;
width: 28px;
margin: 0;
padding: 0;
font-size: 16px;
line-height: 24px;
height: 24px;
border: none;
cursor: pointer;
color: #ccc;
background: transparent;
pointer-events: none;
opacity: 0;
transform: translate3d(100%, 0, 0);
transition: opacity 0.2s ease, transform 0.2s ease;
}
.zenzaVideoSearchPanel:focus-within .searchClear {
pointer-events: auto;
opacity: 1;
transform: translate3d(0, 0, 0);
}
.zenzaVideoSearchPanel:focus-within .searchClear:hover {
transform: scale(1.5);
}
.zenzaVideoSearchPanel:focus-within .searchClear:active {
transform: scale(1.2);
}
.zenzaVideoSearchPanel .searchInputFoot {
white-space: nowrap;
position: absolute;
padding: 4px 0;
opacity: 0;
padding: 4px;
pointer-events: none;
transition: transform 0.2s ease, opacity 0.2s ease;
transform: translate3d(0, -100%, 0);
}
.zenzaVideoSearchPanel .searchInputFoot:hover,
.zenzaVideoSearchPanel:focus-within .searchInputFoot {
pointer-events: auto;
opacity: 1;
background: rgba(50, 50, 50, 0.8);
transform: translate3d(0, 0, 0);
}
.zenzaVideoSearchPanel .searchSortSelect,
.zenzaVideoSearchPanel .searchSortSelect option{
background: #333;
color: #ccc;
}
.zenzaVideoSearchPanel .autoPauseLabel {
cursor: pointer;
}
.zenzaVideoSearchPanel .autoPauseLabel input + span {
display: inline-block;
pointer-events: none;
}
`).trim();
VideoSearchForm.__tpl__ = (`
<div class="zenzaVideoSearchPanel" id="zenzaVideoSearchPanel">
<form action="javascript: void(0);">
<div class="searchInputHead">
<label class="searchModeLabel">
<input type="radio" name="mode" class="searchMode" value="keyword">
<span>キーワード</span>
</label>
<label class="searchModeLabel">
<input type="radio" name="mode" class="searchMode" value="tag"
id="zenzaVideoSearch-tag" checked="checked">
<span>タグ</span>
</label>
</div>
<div class="searchWord">
<button class="searchClear command"
type="button"
data-command="clear"
title="クリア">&#x2716;</button>
<input
type="text"
value=""
autocomplete="on"
name="word"
accesskey="e"
placeholder="簡易検索(テスト中)"
class="searchWordInput"
maxlength="75"
>
<input
type="submit"
value="▶"
name="post"
class="searchSubmit"
>
</div>
<div class="searchInputFoot focusOnly">
<select name="sort" class="searchSortSelect">
<option value="playlist">自動(連続再生用)</option>
<option value="f">新しい順</option>
<option value="h">人気順</option>
<option value="n">最新コメント</option>
<option value="r">コメント数</option>
<option value="m">マイリスト数</option>
<option value="l">長い順</option>
<option value="l,a">短い順</option>
</select>
<label class="autoPauseLabel">
<input type="checkbox" name="ownerOnly" checked="checked">
<span>投稿者の動画のみ</span>
</label>
</div>
</form>
</div>
`).toString();
class IchibaItemView extends BaseViewComponent {
constructor({parentNode}) {
super({
parentNode,
name: 'IchibaItemView',
template: IchibaItemView.__tpl__,
css: IchibaItemView.__css__,
});
ZenzaWatch.debug.ichiba = this;
}
_initDom(...args) {
super._initDom(...args);
this._listContainer =
this._view.querySelector('.ichibaItemListContainer .ichibaItemListInner');
this._listContainerDetails =
this._view.querySelector('.ichibaItemListContainer .ichibaItemListDetails');
}
_onCommand(command, param) {
switch (command) {
case 'load':
this.load(this._videoId);
break;
default:
super._onCommand(command, param);
}
}
load(videoId) {
if (this._isLoading) {
return;
}
videoId = videoId || this._videoId;
this._isLoading = true;
this.addClass('is-loading');
return IchibaLoader.load(videoId)
.then(this._onIchibaLoad.bind(this))
.catch(this._onIchibaLoadFail.bind(this));
}
clear() {
this.removeClass('is-loading');
this.removeClass('is-success');
this.removeClass('is-fail');
this.removeClass('is-empty');
this._listContainer.innerHTML = '';
}
_onIchibaLoad(data) {
this.removeClass('is-loading');
const div = document.createElement('div');
div.innerHTML = data.main;
Array.from(div.querySelectorAll('[id]')).forEach(elm => {
elm.classList.add(`ichiba-${elm.id}`);
elm.removeAttribute('id');
});
Array.from(div.querySelectorAll('[style]'))
.forEach(elm => elm.removeAttribute('style'));
const items = div.querySelectorAll('.ichiba_mainitem');
if (!items || items.length < 1) {
this.addClass('is-empty');
this._listContainer.innerHTML = '<h2>貼られている商品はありません</h2>';
} else {
this._listContainer.innerHTML = div.innerHTML;
}
this.addClass('is-success');
this._listContainerDetails.setAttribute('open', 'open');
this._isLoading = false;
}
_onIchibaLoadFail() {
this.removeClass('is-loading');
this.addClass('is-fail');
this._isLoading = false;
}
get videoId() {
return this._videoId;
}
set videoId(v) {
this._videoId = v;
}
}
IchibaItemView.__tpl__ = (`
<div class="ZenzaIchibaItemView">
<div class="loadStart">
<div class="loadStartButton command" data-command="load">ニコニコ市場</div>
</div>
<div class="ichibaLoadingView">
<div class="loading-inner">
<span class="spinner">&#8987;</span>
</div>
</div>
<div class="ichibaItemListContainer">
<details class="ichibaItemListDetails">
<summary class="ichibaItemSummary loadStartButton">ニコニコ市場</summary>
<div class="ichibaItemListInner"></div>
</details>
</div>
</div>
`).trim();
util.addStyle(`
.ZenzaIchibaItemView .loadStartButton {
color: #000;
}
`, {className: 'screenMode for-popup ichiba', disabled: true});
IchibaItemView.__css__ = (`
.ZenzaIchibaItemView {
text-align: center;
margin: 8px 8px 32px;
color: #ccc;
}
.ZenzaIchibaItemView .loadStartButton {
font-size: 24px;
padding: 8px 8px;
margin: 8px;
background: inherit;
color: inherit;
border: 1px solid #ccc;
outline: none;
line-height: 20px;
border-radius: 8px;
cursor: pointer;
user-select: none;
}
.ZenzaIchibaItemView .loadStartButton:active::after {
opacity: 0;
}
.ZenzaIchibaItemView .loadStartButton:active {
transform: translate(0, 2px);
}
.ZenzaIchibaItemView .ichibaLoadingView,
.ZenzaIchibaItemView .ichibaItemListContainer {
display: none;
}
.ZenzaIchibaItemView.is-loading {
cursor: wait;
user-select: none;
}
.ZenzaIchibaItemView.is-loading * {
pointer-events: none;
}
.ZenzaIchibaItemView.is-loading .ichibaLoadingView {
display: block;
font-size: 32px;
}
.ZenzaIchibaItemView.is-loading .loadStart,
.ZenzaIchibaItemView.is-loading .ichibaItemListContainer {
display: none;
}
.ZenzaIchibaItemView.is-success {
background: none;
}
.ZenzaIchibaItemView.is-success .ichibaLoadingView,
.ZenzaIchibaItemView.is-success .loadStart {
display: none;
}
.ZenzaIchibaItemView.is-success .ichibaItemListContainer {
display: block;
}
.ZenzaIchibaItemView.is-success details[open] {
border: 1px solid #666;
border-radius: 4px;
padding: 0px;
}
.ZenzaIchibaItemView.is-fail .ichibaLoadingView,
.ZenzaIchibaItemView.is-fail .loadStartButton {
display: none;
}
.ZenzaIchibaItemView.is-fail .ichibaItemListContainer {
display: block;
}
.ZenzaIchibaItemView .ichibaItemListContainer {
text-align: center;
}
.ZenzaIchibaItemView .ichibaItemListContainer .ichiba-ichiba_mainpiaitem,
.ZenzaIchibaItemView .ichibaItemListContainer .ichiba_mainitem {
display: inline-table;
width: 220px;
margin: 8px;
padding: 8px;
word-break: break-all;
text-shadow: 1px 1px 0 #000;
background: #666;
border-radius: 4px;
}
.ZenzaIchibaItemView .price,
.ZenzaIchibaItemView .buy,
.ZenzaIchibaItemView .click {
font-weight: bold;
}
.ZenzaIchibaItemView a {
display: inline-block;
font-weight: bold;
text-decoration: none;
color: #ff9;
padding: 2px;
}
.ZenzaIchibaItemView a:visited {
color: #ffd;
}
.ZenzaIchibaItemView .rowJustify,
.ZenzaIchibaItemView .noItem,
.ichiba-ichibaMainLogo,
.ichiba-ichibaMainHeader,
.ichiba-ichibaMainFooter {
display: none;
}
`).trim();
// typoじゃなくてブロック回避のため名前を変えてる
class UaaView extends BaseViewComponent {
constructor({parentNode}) {
super({
parentNode,
name: 'UaaView',
template: UaaView.__tpl__,
shadow: UaaView._shadow_,
css: UaaView.__css__
});
this._state = {
isUpdating: false,
isExist: false,
isSpeaking: false
};
this._config = Config.namespace('uaa');
this._bound.load = this.load.bind(this);
this._bound.update = this.update.bind(this);
}
_initDom(...args) {
super._initDom(...args);
ZenzaWatch.debug.uaa = this;
if (!this._shadow) {
return;
} // ShadowDOM使えなかったらバイバイ
const shadow = this._shadow || this._view;
this._elm.body = shadow.querySelector('.UaaDetailBody');
}
update(videoInfo) {
if (!this._shadow || !this._config.getValue('enable')) {
return;
}
if (!this._elm.body) {
return;
}
if (this._state.isUpdating) {
return;
}
this.setState({isUpdating: true});
this._props.videoInfo = videoInfo;
this._props.videoId = videoInfo.videoId;
window.setTimeout(() => {
this.load(videoInfo);
}, 5000);
}
load(videoInfo) {
const videoId = videoInfo.videoId;
return UaaLoader.load(videoId, {limit: 50})
.then(this._onLoad.bind(this, videoId))
.catch(this._onFail.bind(this, videoId));
}
clear() {
this.setState({isUpdating: false, isExist: false, isSpeaking: false});
if (!this._elm.body) {
return;
}
this._elm.body.innerHTML = '';
}
_onLoad(videoId, result) {
if (this._props.videoId !== videoId) {
return;
}
this.setState({isUpdating: false});
const data = result ? result.data : null;
if (!data || data.sponsors.length < 1) {
return;
}
const df = document.createDocumentFragment();
const div = document.createElement('div');
div.className = 'screenshots';
let idx = 0, screenshots = 0;
data.sponsors.forEach(u => {
if (!u.auxiliary.bgVideoPosition || idx >= 4) {
return;
}
u.added = true;
div.append(this._createItem(u, idx++));
screenshots++;
});
div.setAttribute('data-screenshot-count', screenshots);
df.append(div);
data.sponsors.forEach(u => {
if (!u.auxiliary.bgVideoPosition || u.added) {
return;
}
u.added = true;
df.append(this._createItem(u, idx++));
});
data.sponsors.forEach(u => {
if (u.added) {
return;
}
u.added = true;
df.append(this._createItem(u, idx++));
});
this._elm.body.innerHTML = '';
this._elm.body.appendChild(df);
this.setState({isExist: true});
}
_createItem(data, idx) {
const df = document.createElement('div');
const contact = document.createElement('span');
contact.textContent = data.advertiserName;
contact.className = 'contact';
df.className = 'item';
const aux = data.auxiliary;
const bgkeyframe = aux.bgVideoPosition || 0;
if (data.message) {
data.title = data.message;
}
df.setAttribute('data-index', idx);
if (bgkeyframe && idx < 4) {
const sec = parseFloat(bgkeyframe);
df.setAttribute('data-time', util.secToTime(sec));
df.classList.add('clickable', 'command', 'other');
Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
contact.setAttribute('title', `${data.message}(${util.secToTime(sec)})`);
this._props.videoInfo.getCurrentVideo()
.then(url => util.videoCapture(url, sec))
.then(screenshot => {
const cv = document.createElement('canvas');
const ct = cv.getContext('2d');
cv.width = screenshot.width;
cv.height = screenshot.height;
cv.className = 'screenshot command clickable';
Object.assign(cv.dataset, { command: 'seek', type: 'number', param: sec });
ct.fillStyle = 'rgb(32, 32, 32)';
ct.fillRect(0, 0, cv.width, cv.height);
ct.drawImage(screenshot, 0, 0);
df.classList.add('has-screenshot');
df.classList.remove('clickable', 'other');
df.appendChild(cv);
}).catch(() => {});
} else if (bgkeyframe) {
const sec = parseFloat(bgkeyframe);
df.classList.add('clickable', 'command', 'other');
Object.assign(df.dataset, { command: 'seek', type: 'number', param: sec });
contact.setAttribute('title', `${data.message}(${util.secToTime(sec)})`);
} else {
df.classList.add('other');
}
df.appendChild(contact);
return df;
}
_onFail(videoId) {
if (this._props.videoId !== videoId) {
return;
}
this.setState({isUpdating: false});
}
_onCommand(command, param) {
switch (command) {
default:
super._onCommand(command, param);
}
}
}
UaaView._shadow_ = (`
<style>
.UaaDetails,
.UaaDetails * {
box-sizing: border-box;
user-select: none;
}
.UaaDetails .clickable {
cursor: pointer;
}
.UaaDetails .clickable:active {
transform: translate(0, 2px);
box-shadow: none;
}
.UaaDetails {
opacity: 0;
pointer-events: none;
max-height: 0;
margin: 0 8px 0;
color: #ccc;
overflow: hidden;
text-align: center;
word-break: break-all;
}
.UaaDetails.is-Exist {
display: block;
pointer-events: auto;
max-height: 800px;
margin: 8px;
padding: 8px 4px;
opacity: 1;
transition: opacity 0.4s linear 0.4s, max-height 1s ease-in, margin 0.4s ease-in;
}
.UaaDetails.is-Exist[open] {
border: 1px solid #666;
border-radius: 4px;
overflow: auto;
}
.UaaDetails .uaaSummary {
height: 38px;
margin: 4px 4px 8px;
color: inherit;
outline: none;
border: 1px solid #ccc;
letter-spacing: 12px;
line-height: 38px;
font-size: 24px;
text-align: center;
cursor: pointer;
border-radius: 8px;
}
.UaaDetails .uaaDetailBody {
margin: auto;
}
.UaaDetails .item {
display: inline;
width: inherit;
margin: 0 4px 0 0;
}
.UaaDetails .item.has-screenshot {
position: relative;
display:inline-block;
margin: 4px;
}
.UaaDetails .item.has-screenshot::after {
content: attr(data-time);
position: absolute;
right: 0;
bottom: 0;
padding: 2px 4px;
background: #000;
color: #ccc;
font-size: 12px;
line-height: 14px;
}
.UaaDetails .item.has-screenshot:hover::after {
opacity: 0;
}
.UaaDetails .contact {
display: inline-block;
color: #fff;
font-weight: bold;
font-size: 16px;
text-align: center;
user-select: none;
word-break: break-all;
}
.UaaDetails .item.has-screenshot .contact {
position: absolute;
text-align: center;
width: 100%;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
color: #fff;
text-shadow: 1px 1px 1px #000;
text-stroke: 1px #000;
-webkit-text-stroke: 1px #000;
pointer-events: none;
font-size: 16px;
}
.UaaDetails .item.has-screenshot:hover .contact {
display: none;
}
.UaaDetails .item.other {
display: inline-block;
border: none;
width: inherit;
margin: 0;
padding: 2px 4px;
line-height: normal;
min-height: inherit;
text-align: left;
}
.UaaDetails .item.is-speaking {
text-decoration: underline;
}
.UaaDetails .item.has-screenshot.is-speaking {
outline: none;
transition: transform 0.2s ease;
transform: scale(1.2);
z-index: 1000;
}
.UaaDetails .item .contact {
display: inline;
padding: 2px 4px;
width: auto;
font-size: 12px;
text-stroke: 0;
color: inherit; /*#ccc;*/
outline-offset: -2px;
}
.UaaDetails .item.other.clickable {
display: inline-block;
padding: 2px 4px;
margin: 0 4px;
}
.UaaDetails .item.other.clickable .contact {
display: inline-block;
color: #ffc;
}
.UaaDetails .item.other.clickable .contact::after {
content: attr(title);
color: #ccc;
font-weight: normal;
margin: 0 4px;
}
.UaaDetails .screenshot {
display: block;
width: 128px;
margin: 0;
vertical-align: middle;
cursor: pointer;
}
.screenshots[data-screenshot-count="1"] .screenshot {
width: 192px;
}
.zenzaScreenMode_sideView .is-notFullscreen .UaaDetails {
color: #000;
}
:host-context(.zenzaScreenMode_sideView .is-notFullscreen) .UaaDetails {
color: #000;
}
</style>
<details class="root UaaDetails">
<summary class="uaaSummary clickable">提供</summary>
<div class="UaaDetailBody"></div>
</details>
`).trim();
UaaView.__tpl__ = ('<div class="uaaView"></div>').trim();
UaaView.__css__ = (`
uaaView {
display: none;
}
uaaView.is-Exist {
display: block;
}
`).trim();
class RelatedInfoMenu extends BaseViewComponent {
constructor({parentNode, isHeader}) {
super({
parentNode,
name: 'RelatedInfoMenu',
template: '<div class="RelatedInfoMenu" tabindex="-1"></div>',
shadow: RelatedInfoMenu._shadow_,
css: RelatedInfoMenu.__css__
});
this._state = {};
this._bound.update = this.update.bind(this);
this._bound._onBodyClick = _.debounce(this._onBodyClick.bind(this), 0);
this.setState({isHeader});
}
_initDom(...args) {
super._initDom(...args);
this._view.classList.toggle('is-Edge', /edge/i.test(navigator.userAgent));
const shadow = this._shadow || this._view;
this._elm.body = shadow.querySelector('.RelatedInfoMenuBody');
this._elm.summary = shadow.querySelector('summary');
shadow.addEventListener('click', e => {
e.stopPropagation();
});
this._elm.summary.addEventListener('click', _.debounce(() => {
if (shadow.open) {
document.body.addEventListener('mouseup', this._bound._onBodyClick, {once: true});
this.emit('open');
}
}, 100));
this._ginzaLink = shadow.querySelector('.ginzaLink');
this._originalLink = shadow.querySelector('.originalLink');
this._twitterLink = shadow.querySelector('.twitterHashLink');
this._parentVideoLink = shadow.querySelector('.parentVideoLink');
}
_onBodyClick() {
const shadow = this._shadow || this._view;
shadow.open = false;
document.body.removeEventListener('mouseup', this._bound._onBodyClick);
this.emit('close');
}
update(videoInfo) {
const shadow = this._shadow || this._view;
shadow.open = false;
this._currentWatchId = videoInfo.watchId;
this._currentVideoId = videoInfo.videoId;
this.setState({
isParentVideoExist: videoInfo.hasParentVideo,
isCommunity: videoInfo.isCommunityVideo,
isMymemory: videoInfo.isMymemory
});
const vid = this._currentVideoId;
const wid = this._currentWatchId;
this._ginzaLink.setAttribute('href', `//www.nicovideo.jp/watch/${wid}`);
this._originalLink.setAttribute('href', `//www.nicovideo.jp/watch/${vid}`);
this._twitterLink.setAttribute('href', `https://twitter.com/hashtag/${vid}`);
this._parentVideoLink.setAttribute('href', `//commons.nicovideo.jp/tree/${vid}`);
this.emit('close');
}
_onCommand(command, param) {
let url;
const shadow = this._shadow || this._view;
shadow.open = false;
switch (command) {
case 'watch-ginza':
window.open(this._ginzaLink.href, 'watchGinza');
super._onCommand('pause');
break;
case 'open-uad':
url = `//nicoad.nicovideo.jp/video/publish/${this._currentWatchId}?frontend_id=6&frontend_version=0&zenza_watch`;
window.open(url, '', 'width=428, height=600, toolbar=no, scrollbars=1');
break;
case 'open-twitter-hash':
window.open(this._twitterLink.href);
break;
case 'open-parent-video':
window.open(this._parentVideoLink.href);
break;
case 'copy-video-watch-url':
super._onCommand(command, param);
super._onCommand('notify', 'コピーしました');
break;
case 'open-original-video':
super._onCommand('openNow', this._currentVideoId);
break;
default:
super._onCommand(command, param);
}
this.emit('close');
}
}
RelatedInfoMenu._css_ = ('').trim();
RelatedInfoMenu._shadow_ = (`
<style>
.RelatedInfoMenu,
.RelatedInfoMenu * {
box-sizing: border-box;
user-select: none;
}
.RelatedInfoMenu {
display: inline-block;
padding: 8px;
font-size: 16px;
cursor: pointer;
}
.RelatedInfoMenu summary {
display: inline-block;
background: transparent;
color: #333;
padding: 4px 8px;
border-radius: 4px;
outline: none;
border: 1px solid #ccc;
}
.RelatedInfoMenu ul {
list-style-type: none;
padding-left: 32px;
}
.RelatedInfoMenu li {
padding: 4px;
}
.RelatedInfoMenu li > .command {
display: inline-block;
text-decoration: none;
color: #ccc;
}
.RelatedInfoMenu li > .command:hover {
text-decoration: underline;
}
.RelatedInfoMenu li > .command:hover::before {
content: '▷';
position: absolute;
transform: translate(-100%, 0);
}
.RelatedInfoMenu .originalLinkMenu,
.RelatedInfoMenu .parentVideoMenu {
display: none;
}
.RelatedInfoMenu.is-Community .originalLinkMenu,
.RelatedInfoMenu.is-Mymemory .originalLinkMenu,
.RelatedInfoMenu.is-ParentVideoExist .parentVideoMenu {
display: block;
}
.zenzaScreenMode_sideView .is-fullscreen .RelatedInfoMenu summary{
background: #888;
}
:host-context(.zenzaScreenMode_sideView .is-fullscreen) .RelatedInfoMenu summary {
background: #888;
}
/* :host-contextで分けたいけどFirefox対応のため */
.RelatedInfoMenu.is-Header {
font-size: 13px;
padding: 0 8px;
}
.RelatedInfoMenu.is-Header summary {
background: #666;
color: #ccc;
padding: 0 8px;
border: none;
}
.RelatedInfoMenu.is-Header[open] {
background: rgba(80, 80, 80, 0.9);
}
.RelatedInfoMenu.is-Header ul {
font-size: 16px;
line-height: 20px;
}
:host-context(.zenzaWatchVideoInfoPanel) .RelatedInfoMenu li > .command {
color: #222;
}
.zenzaWatchVideoInfoPanel .RelatedInfoMenu li > .command {
color: #222;
}
/* for Edge */
.is-Edge .RelatedInfoMenuBody {
display: none;
color: #ccc;
background: rgba(80, 80, 80, 0.9);
}
.RelatedInfoMenu[open] .RelatedInfoMenuBody,
.RelatedInfoMenu:focus .RelatedInfoMenuBody,
.RelatedInfoMenuBody:hover {
display: block;
}
</style>
<details class="root RelatedInfoMenu">
<summary class="RelatedInfoMenuSummary clickable">関連メニュー</summary>
<div class="RelatedInfoMenuBody">
<ul>
<li class="ginzaMenu">
<a class="ginzaLink command"
rel="noopener" data-command="watch-ginza">公式プレイヤーで開く</a>
</li>
<li class="uadMenu">
<span class="uadLink command"
rel="noopener" data-command="open-uad">ニコニ広告で宣伝</span>
</li>
<li class="twitterHashMenu">
<a class="twitterHashLink command"
rel="noopener" data-command="open-twitter-hash">twitterの反応を見る</a>
</li>
<li class="originalLinkMenu">
<a class="originalLink command"
rel="noopener" data-command="open-original-video">元動画を開く</a>
</li>
<li class="parentVideoMenu">
<a class="parentVideoLink command"
rel="noopener" data-command="open-parent-video">親作品・コンテンツツリー</a>
</li>
<li class="copyVideoWatchUrlMenu">
<span class="copyVideoWatchUrlLink command"
rel="noopener" data-command="copy-video-watch-url">動画URLをコピー</span>
</li>
</ul>
</div>
</details>
`).trim();
class VideoMetaInfo extends BaseViewComponent {
constructor({parentNode}) {
super({
parentNode,
name: 'VideoMetaInfo',
template: '<div class="VideoMetaInfo"></div>',
shadow: VideoMetaInfo._shadow_,
css: VideoMetaInfo.__css__
});
this._state = {};
this._bound.update = this.update.bind(this);
}
_initDom(...args) {
super._initDom(...args);
const shadow = this._shadow || this._view;
this._elm = Object.assign({}, this._elm, {
postedAt: shadow.querySelector('.postedAt'),
body: shadow.querySelector('.videoMetaInfo'),
viewCount: shadow.querySelector('.viewCount'),
commentCount: shadow.querySelector('.commentCount'),
mylistCount: shadow.querySelector('.mylistCount')
});
}
update(videoInfo) {
this._elm.postedAt.textContent = videoInfo.postedAt;
const count = videoInfo.count;
this.updateVideoCount(count);
}
updateVideoCount({comment, view, mylist}) {
let addComma = m => {
return m.toLocaleString ? m.toLocaleString() : m;
};
if (typeof comment === 'number') {
this._elm.commentCount.textContent = addComma(comment);
}
if (typeof view === 'number') {
this._elm.viewCount.textContent = addComma(view);
}
if (typeof mylist === 'number') {
this._elm.mylistCount.textContent = addComma(mylist);
}
}
}
VideoMetaInfo._css_ = ('').trim();
VideoMetaInfo._shadow_ = (`
<style>
.VideoMetaInfo .postedAtOuter {
display: inline-block;
margin-right: 24px;
}
.VideoMetaInfo .postedAt {
font-weight: bold
}
.VideoMetaInfo .countOuter {
white-space: nowrap;
}
.VideoMetaInfo .countOuter .column {
display: inline-block;
white-space: nowrap;
}
.VideoMetaInfo .count {
font-weight: bolder;
}
.userVideo .channelVideo,
.channelVideo .userVideo
{
display: none !important;
}
:host-context(.userVideo) .channelVideo,
:host-context(.channelVideo) .userVideo
{
display: none !important;
}
</style>
<div class="VideoMetaInfo root">
<span class="postedAtOuter">
<span class="userVideo">投稿日:</span>
<span class="channelVideo">配信日:</span>
<span class="postedAt"></span>
</span>
<span class="countOuter">
<span class="column">再生: <span class="count viewCount"></span></span>
<span class="column">コメント: <span class="count commentCount"></span></span>
<span class="column">マイリスト: <span class="count mylistCount"></span></span>
</span>
</div>
`);

var initializeGinzaSlayer =
(function () {
var initializeFlash = function (dialog, query) {
$('.notify_update_flash_player').remove();
const watchId = util.getWatchId();
const options = {};
if (!isNaN(query.from)) {
options.currentTime = parseFloat(query.from, 10);
}
dialog.open(watchId, options);
$('#external_nicoplayer').remove();
};
const initializeHtml5 = function (dialog, query) {
const watchId = util.getWatchId();
const options = {};
if (!isNaN(query.from)) {
options.currentTime = parseFloat(query.from, 10);
}
const v = document.querySelector('#MainVideoPlayer video');
if (v) {
v.pause();
//if (v.currentTime > 0) { options.currentTime = v.currentTime; }
}
dialog.open(watchId, options);
};
return !!(document.getElementById('watchAPIDataContainer')) ? initializeFlash : initializeHtml5;
})();

const {initialize} = (() => {
// GINZAを置き換えるべきか？の判定
let isOverrideGinza = function () {
// GINZAで視聴のリンクできた場合はfalse
if (window.name === 'watchGinza') {
return false;
}
// GINZAの代わりに起動する設定、かつZenzaで再生可能な動画はtrue
// nmmやrtmpeの動画だとfalseになる
if (Config.getValue('overrideGinza') && util.isZenzaPlayableVideo()) {
return true;
}
return false;
};
let replaceRedirectLinks = function () {
$('a[href*="www.flog.jp/j.php/http://"]').each(function (i, a) {
let $a = $(a), href = $a.attr('href');
let replaced = href.replace(/^.*https?:/, '');
$a.attr('href', replaced);
});
$('a[href*="rd.nicovideo.jp/cc/"]').each(function (i, a) {
let $a = $(a), href = $a.attr('href');
if (href.match(/cc_video_id=([a-z0-9+]+)/)) {
let watchId = RegExp.$1;
if (watchId.indexOf('lv') === 0) {
return;
}
let replaced = '//www.nicovideo.jp/watch/' + watchId;
$a.attr('href', replaced);
}
});
// マイリストページの連続再生ボタン横に「シャッフル再生」を追加する
if (window.Nico && window.Nico.onReady) {
window.Nico.onReady(() => {
let shuffleButton;
let query = 'a[href*="continuous=1"]';
let addShufflePlaylistLink = () => {
if (shuffleButton) {
return;
}
let $a = $(query);
if ($a.length < 1) {
return false;
}
let a = $a[0];
let search = (a.search || '').substr(1);
let css = {
'display': 'inline-block',
'padding': '8px 6px'
};
let $shuffle = $(a).clone().text('シャッフル再生')
.addClass('zenzaPlaylistShuffleStart')
.attr('href', `//www.nicovideo.jp/watch/1470321133?${search}&shuffle=1`)
.css(css);
$a.css(css).after($shuffle);
shuffleButton = $shuffle;
return true;
};
addShufflePlaylistLink();
const container = document.querySelector('#myContBody, #SYS_box_mylist_header');
if (!container) { return; }
new MutationObserver(records => {
for (let rec of records) {
let changed = [].concat(Array.from(rec.addedNodes),Array.from(rec.removedNodes));
if (changed.some(i => i.querySelector && i.querySelector(query))) {
shuffleButton = null;
addShufflePlaylistLink();
return;
}
}
}).observe(container, {childList: true});
});
}
if (location.host === 'www.nicovideo.jp' &&
(location.pathname.indexOf('/search/') === 0 || location.pathname.indexOf('/tag/') === 0)) {
(function () {
let $autoPlay = $('.autoPlay');
let $target = $autoPlay.find('a');
let search = (location.search || '').substr(1);
let href = $target.attr('href') + '&' + search;
$target.attr('href', href);
let $shuffle = $autoPlay.clone();
let a = $target[0];
$shuffle.find('a').attr({
'href': '/watch/1483135673' + a.search + '&shuffle=1'
}).text('シャッフル再生');
$autoPlay.after($shuffle);
// ニコニ広告枠のリンクを置き換える
window.setTimeout(() => {
Array.from(document.querySelectorAll('.nicoadVideoItem')).forEach(item => {
const pointLink = item.querySelector('.count .value a');
if (!pointLink) {
return;
}
// 動画idはここから取るしかなさそう
const a = document.createElement('a');
a.href = pointLink;
const videoId = a.pathname.replace(/^.*\//, '');
Array.from(item.querySelectorAll('a[data-link]')).forEach(link => {
link.href = `//www.nicovideo.jp/watch/${videoId}`;
});
});
}, 3000);
})();
}
if (location.host === 'ch.nicovideo.jp') {
$('#sec_current a.item').closest('li').each(function (i, li) {
let $li = $(li), $img = $li.find('img');
let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
let $a = $li.find('a');
if (thumbnail.match(/smile\?i=([0-9]+)/)) {
let watchId = 'so' + RegExp.$1;
$a.attr('href', '//www.nicovideo.jp/watch/' + watchId);
}
});
$('.playerNavContainer .video img').each(function (i, img) {
let $img = $(img);
let $video = $img.closest('.video');
if ($video.length < 1) {
return;
}
let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
if (thumbnail.match(/smile\?i=([0-9]+)/)) {
let watchId = 'so' + RegExp.$1;
let $a = $('<a class="more zen" rel="noopener" target="_blank">watch</a>')
.css('right', '128px')
.attr('href', '//www.nicovideo.jp/watch/' + watchId);
$video.find('.more').after($a);
}
});
}
};
let initialize = function () {
window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
initialize = _.noop;
util.dispatchCustomEvent(
document.body, 'BeforeZenzaWatchInitialize', window.ZenzaWatch);
util.addStyle(CONSTANT.COMMON_CSS, {className: 'common'});
initializeBySite();
if (location.host === 'www.nicovideo.jp' && location.pathname === '/favicon.ico' && top === window) {
util.addStyle(`
body { background: inherit !important; }
`);
}
const query = util.parseQuery(START_PAGE_QUERY);
let isGinza = util.isGinzaWatchUrl() &&
(!!document.getElementById('watchAPIDataContainer') ||
!!document.getElementById('js-initial-watch-data'));
replaceRedirectLinks();
let hoverMenu = new HoverMenu({playerConfig: Config});
ZenzaWatch.debug.hoverMenu = hoverMenu;
window.console.time('createOffscreenLayer');
NicoComment.offScreenLayer.get(Config).then(function (offScreenLayer) {
window.console.timeEnd('createOffscreenLayer');
// コメントの位置計算用のレイヤーが必要
// スマートじゃないので改善したい
let dialog;
// watchページか？
if (isGinza) {
dialog = initializeDialogPlayer(Config, offScreenLayer);
if (isOverrideGinza()) {
initializeGinzaSlayer(dialog, query);
}
if (window.name === 'watchGinza') {
window.name = '';
}
} else {
dialog = initializeDialogPlayer(Config, offScreenLayer);
}
broadcastEmitter.on('message', (packet) => {
const isLast = dialog.isLastOpenedPlayer();
const isOpen = dialog.isOpen();
const type = packet.type;
if (type === 'ping' && isLast && isOpen) {
window.console.info('pong!');
broadcastEmitter.pong(dialog.getId());
return;
} else if (type === 'notifyClose' && isOpen) {
dialog.refreshLastPlayerId();
return;
} else if (type === 'sendCommand' && isLast && isOpen) {
dialog.execCommand(packet.command, packet.params);
} else {
switch (type) {
case 'pushHistory':
WatchPageHistory.pushHistoryAgency(packet.path, packet.title);
break;
}
}
if (type !== 'openVideo') {
return;
}
if (!isLast) {
return;
}
console.log('recieve packet: ', packet);
dialog.open(packet.watchId, {
autoCloseFullScreen: false,
query: packet.query,
eventType: packet.eventType
});
});
dialog.on('close', () => {
broadcastEmitter.notifyClose();
});
WatchPageHistory.initialize(dialog);
if (dialog) {
hoverMenu.setPlayer(dialog);
}
initializeExternal(dialog, Config, hoverMenu);
if (isGinza) {
return;
}
window.addEventListener('beforeunload', () => {
if (!dialog.isOpen()) {
return;
}
PlayerSession.save(dialog.getPlayingStatus());
dialog.close();
});
let lastSession = PlayerSession.restore();
let screenMode = Config.getValue('screenMode');
if (
lastSession.playing &&
(screenMode === 'small' ||
screenMode === 'sideView' ||
location.href === lastSession.url ||
Config.getValue('continueNextPage')
)
) {
lastSession.eventType = 'session';
dialog.open(lastSession.watchId, lastSession);
} else {
PlayerSession.clear();
}
WindowMessageEmitter.on('onMessage', (data/*, type*/) => {
let watchId = data.message.watchId;
if (watchId && data.message.command === 'open') {
//window.console.log('onMessage!: ', data.message.watchId, type);
dialog.open(data.message.watchId, {
economy: Config.getValue('forceEconomy')
});
} else if (watchId && data.message.command === 'send') {
broadcastEmitter.send({
type: 'openVideo',
watchId: watchId
});
}
});
});
window.ZenzaWatch.ready = true;
CustomElements.initialize();
ZenzaWatch.emitter.emitAsync('ready');
util.dispatchCustomEvent(
document.body, 'ZenzaWatchInitialize', window.ZenzaWatch);
// こっちは過去の互換用
$('body').trigger('ZenzaWatchReady', window.ZenzaWatch);
};
let initializeBySite = () => {
let hostClass = location.host;
hostClass = hostClass.replace(/^.*\.slack\.com$/, 'slack.com');
hostClass = hostClass.replace(/\./g, '-');
document.body.dataset.domain = hostClass;
util.StyleSwitcher.update({on: `style.domain.${hostClass}`});
};
let initializeDialogPlayer = function (config, offScreenLayer) {
console.log('initializeDialog');
config = PlayerConfig.getInstance({config});
let state = PlayerState.getInstance(config);
ZenzaWatch.state.player = state;
let dialog = new NicoVideoPlayerDialog({
offScreenLayer: offScreenLayer,
config,
state
});
RootDispatcher.initialize(dialog);
return dialog;
};
let initializeExternal = function (dialog/*, config*/) {
const command = (command, param) => {
dialog.execCommand(command, param);
};
const open = (watchId, params) => {
dialog.open(watchId, params);
};
// 最後にZenzaWatchを開いたタブに送る
const send = (watchId, params) => {
broadcastEmitter.sendOpen(watchId, params);
};
// 最後にZenzaWatchを開いたタブに送る
// なかったら同じタブで開く. 一見万能だが、pingを投げる都合上ワンテンポ遅れる。
const sendOrOpen = (watchId, params) => {
if (dialog.isLastOpenedPlayer()) {
open(watchId, params);
} else {
broadcastEmitter.ping().then(() => {
send(watchId, params);
}, () => {
open(watchId, params);
});
}
};
const importPlaylist = data => {
PlaylistSession.save(data);
};
const exportPlaylist = () => {
return PlaylistSession.restore() || {};
};
const sendCommand = (command, params) => {
broadcastEmitter.send(
({type: 'sendCommand', command: command, params: params})
);
};
const sendOrExecCommand = (command, params) => {
broadcastEmitter.ping().then(() => {
sendCommand(command, params);
}, () => {
dialog.execCommand(command, params);
});
};
const playlistAdd = (watchId) => {
sendOrExecCommand('playlistAdd', watchId);
};
const playlistInsert = (watchId) => {
sendOrExecCommand('playlistInsert', watchId);
};
const deflistAdd = ({watchId, description, token}) => {
const mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
if (token) {
mylistApiLoader.setCsrfToken(token);
}
return mylistApiLoader.addDeflistItem(watchId, description);
};
const deflistRemove = ({watchId, token}) => {
const mylistApiLoader = new ZenzaWatch.api.MylistApiLoader();
if (token) {
mylistApiLoader.setCsrfToken(token);
}
return mylistApiLoader.removeDeflistItem(watchId);
};
Object.assign(ZenzaWatch.external, {
execCommand: command,
sendCommand: sendCommand,
sendOrExecCommand,
open: open,
send: send,
sendOrOpen,
deflistAdd,
deflistRemove,
playlist: {
add: playlistAdd,
insert: playlistInsert,
import: importPlaylist,
export: exportPlaylist
}
});
Object.assign(ZenzaWatch.debug, {
dialog,
getFrameBodies: () => {
return Array.from(document.querySelectorAll('.zenzaPlayerContainer iframe')).map(f => f.contentWindow.document.body);
}
});
if (ZenzaWatch !== window.ZenzaWatch) {
window.ZenzaWatch.external = {
open,
sendOrOpen,
sendOrExecCommand,
playlist: {
add: playlistAdd,
insert: playlistInsert
}
};
}
};
class HoverMenu {
constructor(param) {
this.initialize(param);
}
}
_.assign(HoverMenu.prototype, {
initialize: function (param) {
this._playerConfig = param.playerConfig;
let $view = $('<div class="ZenButton scalingUI">Zen</div>');
this._$view = $view;
if (!util.isGinzaWatchUrl() &&
this._playerConfig.getValue('overrideWatchLink') &&
location && location.host.indexOf('.nicovideo.jp') >= 0) {
this._overrideGinzaLink();
} else {
this._onHoverEnd = _.debounce(this._onHoverEnd.bind(this), 500);
$view.on('click', this._onClick.bind(this));
ZenzaWatch.emitter.on('hideHover', () => $view.removeClass('show'));
let $body = $('body')
.on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
this._onHover.bind(this))
.on('mouseover', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
this._onHoverEnd)
.on('mouseout', 'a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link',
this._onMouseout.bind(this));
$body.append($view);
}
},
setPlayer: function (player) {
this._player = player;
if (this._playerResolve) {
this._playerResolve(player);
}
},
_getPlayer: function () {
if (this._player) {
return Promise.resolve(this._player);
}
return new Promise(resolve => {
this._playerResolve = resolve;
});
},
_onHover: function (e) {
this._hoverElement = e.target;
},
_onMouseout: function (e) {
if (this._hoverElement === e.target) {
this._hoverElement = null;
}
},
_onHoverEnd: function (e) {
if (this._hoverElement !== e.target) {
return;
}
let target = e.target.closest('a');//$(e.target).closest('a');
if (!target || target.classList.contains('noHoverMenu')) {
return;
}
let href = target.dataset.href || target.href;
let watchId = util.getWatchId(href);
let offset = target.getBoundingClientRect();//$target.offset();
let host = target.hostname;
if (host !== 'www.nicovideo.jp' && host !== 'nico.ms' && host !== 'sp.nicovideo.jp') {
return;
}
this._query = util.parseWatchQuery((target.search || '').substr(1));
if (!watchId.match(/^[a-z0-9]+$/)) {
return;
}
if (watchId.startsWith('lv')) {
return;
}
this._watchId = watchId;
this._$view.css({
top: offset.top + window.pageYOffset,
left: offset.left - this._$view.outerWidth() / 2 + window.pageXOffset
}).addClass('show');
document.body.addEventListener('click', () => this._$view.removeClass('show'), {once: true});
},
_onClick: function (e) {
const watchId = this._watchId;
if (e.ctrlKey) {
return;
}
if (e.shiftKey) {
// 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
this._send(watchId);
} else {
this._open(watchId);
}
},
open: function (watchId, params) {
this._open(watchId, params);
},
_open: function (watchId, params) {
this._playerOption = Object.assign({
economy: this._playerConfig.getValue('forceEconomy'),
query: this._query,
eventType: 'click'
}, params);
this._getPlayer().then(player => {
let isSingleton = this._playerConfig.getValue('enableSingleton');
if (isSingleton) {
ZenzaWatch.external.sendOrOpen(watchId, this._playerOption);
} else {
player.open(watchId, this._playerOption);
}
});
},
send: function (watchId, params) {
this._send(watchId, params);
},
_send: function (watchId, params) {
this._getPlayer().then(() => {
ZenzaWatch.external.send(
watchId,
Object.assign({query: this._query}, params)
);
});
},
_overrideGinzaLink: function () {
$('body').on('click', 'a[href*="watch/"],a[href*="nico.ms/"]', e => {
if (e.ctrlKey) {
return;
}
let $target = $(e.target).closest('a');
let href = $target.attr('data-href') || $target.attr('href');
let watchId = util.getWatchId(href);
let host = $target[0].hostname;
if (host !== 'www.nicovideo.jp' && host !== 'nico.ms' && host !== 'sp.nicovideo.jp') {
return;
}
this._query = util.parseWatchQuery(($target[0].search || '').substr(1));
if ($target.hasClass('noHoverMenu')) {
return;
}
if (!watchId.match(/^[a-z0-9]+$/)) {
return;
}
if (watchId.indexOf('lv') === 0) {
return;
}
e.preventDefault();
if (e.shiftKey) {
// 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
this._send(watchId);
} else {
this._open(watchId);
}
window.setTimeout(() => ZenzaWatch.emitter.emit('hideHover'), 1500);
});
}
});
return {initialize};
})();

const CustomElements = {};
CustomElements.initialize = (() => {
if (!window.customElements) {
return;
}
class PlaylistAppend extends HTMLElement {
static get observedAttributes() { return []; }
// 末尾に追加するという意味合では add より append らしい
static template() {
return `
<style>
* {
box-sizing: border-box;
user-select: none;
}
:host {
background: none !important;
border: none !important;
}
.playlistAppend {
display: inline-block;
font-size: 16px;
line-height: 22px;
width: 24px;
height: 24px;
background: #666;
color: #ccc;
text-decoration: none;
border: 1px outset;
border-radius: 3px;
cursor: pointer;
text-align: center;
}
.playlistAppend:active {
border: 1px inset;
}
.label {
text-shadow: 1px 1px #333;
display: inline-block;
}
:host-context(.videoList) .playlistAppend {
width: 24px;
height: 20px;
line-height: 18px;
border-radius: unset;
}
:host-context(.videoOwnerInfoContainer) {
}
</style>
<div class="playlistAppend">
<div class="label">▶</div></div>
`;
}
constructor() {
super();
const shadow = this._shadow = this.attachShadow({mode: 'open'});
shadow.innerHTML = this.constructor.template();
}
disconnectedCallback() {
this._shadow.textContent = '';
}
}
window.customElements.define('zenza-playlist-append', PlaylistAppend);
class SeekbarLabel extends HTMLElement {
static get observedAttributes() { return [
'time', 'duration', 'text'
]; }
static template() {
return `
<style>
*, *::after, *::before {
box-sizing: border-box;
user-select: none;
--color: #fea;
--bg-color: rgba(0, 0, 0, 0.7);
--pointer-color: rgba(255, 128, 128, 0.6);
}
:host(.owner-comment) * {
--color: #efa;
--pointer-color: rgba(128, 255, 128, 0.6);
}
.root * {
pointer-events: none;
}
.root {
position: absolute;
width: 16px;
height: 16px;
top: calc(100% - 2px);
left: 50%;
color: var(--color);
border-style: solid;
border-width: 8px;
border-color: 
var(--pointer-color) 
transparent
transparent 
transparent;
}
.label {
display: inline-block;
visibility: hidden;
position: absolute;
left: -8px;
bottom: 8px;
white-space: nowrap;
padding: 2px 4px;
background: rgba(0, 0, 0, 0.8);
border-radius: 4px;
border-color: var(--pointer-color);
border-style: solid;
opacity: 0.5;
}
.root:hover .label {
visibility: visible;
}
</style>
<div class="root">
<span class="label"></span>
</div>
`;
}
constructor() {
super();
const shadow = this._shadow = this.attachShadow({mode: 'open'});
shadow.innerHTML = this.constructor.template();
this._root = shadow.querySelector('.root');
this._label = shadow.querySelector('.label');
this._updatePos = _.debounce(this._updatePos.bind(this), 100);
this.props = {
time: -1,
duration: 1,
text: this.getAttribute('text') || this.getAttribute('data-text')
};
this._label.textContent = this.props.text;
}
_updateTime(t) {
this.props.time = isNaN(t) ? -1 : t;
this._updatePos();
}
_updateDuration(d) {
this.props.duration = isNaN(d) ? 1 : d;
this._updatePos();
}
_updatePos() {
const per = this.props.time / Math.max(this.props.duration, 1) * 100;
this.hidden = per <= 0;
this.setAttribute('data-param', this.props.time);
this._root.style.transform = `translate(${per}vw, 0) translateX(-50%)`;
this._label.style.transform = `translate(-${per}%, 0)`;
}
_clear() {
this._root.classList.toggle('has-screenshot', false);
this.props.time = -1;
this.props.duration = 1;
this.hidden = true;
}
hide() {
this.hidden = true;
}
attributeChangedCallback(attr, oldValue, newValue) {
switch (attr) {
case 'time':
this._updateTime(parseFloat(newValue));
break;
case 'duration':
this._updateDuration(parseFloat(newValue));
break;
case 'text':
this._label.textContent = newValue;
break;
}
}
}
window.customElements.define('zenza-seekbar-label', SeekbarLabel);
});

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


const GateAPI = (() => {
let xmlHttp = function (options) {
try {
//window.console.log('xmlHttp bridge: ', options.url, options);
let req = new XMLHttpRequest();
let method = options.method || options.type || 'GET';
let xhrFields = options.xhrFields || {};
if (typeof xhrFields.withCredentials === 'boolean') {
req.withCredentials = xhrFields.withCredentials;
}
req.onreadystatechange = function () {
if (req.readyState === 4) {
if (typeof options.onload === 'function') options.onload(req);
}
};
req.open(method, options.url, true);
if (options.headers) {
for (let h in options.headers) {
req.setRequestHeader(h, options.headers[h]);
}
}
req.send(options.data || null);
} catch (e) {
window.console.error(e);
}
};
let parentPostMessage = function (type, message, token, origin = null) {
origin = origin || document.referrer;
//window.console.info('origin', {type, message, token, origin});
try {
parent.postMessage(JSON.stringify({
id: 'ZenzaWatch',
type, // '',
body: {
token,
url: location.href,
message
}
}),
origin);
} catch (e) {
console.error(
'%cError: parent.postMessage - ',
'color: red; background: yellow',
e);
}
};
const parseUrl = (url) => {
url = url || 'https://unknown.example.com/';
const a = document.createElement('a');
a.href = url;
return a;
};
const isNicoServiceHost = url => {
const host = parseUrl(url).hostname;
return /(^[a-z0-9.-]*\.nicovideo\.jp$|^[a-z0-9.-]*\.nico(|:[0-9]+)$)/.test(host);
};
const isWhiteHost = url => {
if (isNicoServiceHost(url)) {
return true;
}
const u = parseUrl(url);
const host = u.hostname;
if (['localhost', '127.0.0.1'].includes(host)) { return true; }
if (localStorage.ZenzaWatch_whiteHost) {
if (localStorage.ZenzaWatch_whiteHost.split(',').includes(host)) {
return true;
}
}
if (u.protocol !== 'https:') { return false; }
return [
'google.com',
'www.google.com',
'www.google.co.jp',
'www.bing.com',
'twitter.com',
'friends.nico',
'feedly.com',
'www.youtube.com',
].includes(host) || host.endsWith('.slack.com');
};
let loadUrl = function (data, type, token, origin) {
let timeoutTimer = null, isTimeout = false;
if (!data.url) {
return;
}
if (!isWhiteHost(data.url)) {
return;
}
let options = data.options || {};
let sessionId = data.sessionId;
xmlHttp({
url: data.url,
method: options.method || options.type || 'GET',
data: options.data,
headers: options.headers || [],
xhrFields: options.xhrFields,
onload: function (resp) {
if (isTimeout) {
return;
}
else {
window.clearTimeout(timeoutTimer);
}
try {
parentPostMessage(type, {
sessionId: sessionId,
status: 'ok',
token: token,
command: data.command,
url: data.url,
body: resp.responseText
}, token, origin);
} catch (e) {
console.log(
'%cError: parent.postMessage - ',
'color: red; background: yellow',
e, event.origin, event.data);
}
}
});
timeoutTimer = window.setTimeout(() => {
isTimeout = true;
parentPostMessage(type, {
sessionId: sessionId,
status: 'timeout',
token: token,
command: 'loadUrl',
url: data.url
}, token, origin);
}, 30000);
};
const loadUrlByFetch = function (data, type, token, origin) {
// let timeoutTimer = null, isTimeout = false;
const url = data.url;
const sessionId = data.sessionId;
const result = {
sessionId,
token,
command: data.command,
url
};
if (!isWhiteHost(url)) {
return Promise.reject();
}
const params = data.options || {};
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
return Promise.race(racers).then(resp => {
return resp.text();
}).then(text => {
parentPostMessage(type, Object.assign(result, {
status: 'ok',
body: text
}), token, origin);
}).catch(err => {
if (err && err.name === 'timeout') {
if (controller) {
console.warn('request timeout');
controller.abort();
}
result.status = 'timeout';
} else {
result.status = 'fail';
}
parentPostMessage(type, result, token, origin);
});
};
let thumbInfo = function () {
if (window.name.indexOf('thumbInfoLoader') < 0) {
return;
}
window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);
if (!isWhiteHost(document.referrer)) {
window.console.log('disable bridge');
return;
}
let type = 'thumbInfo';
let token = location.hash ? location.hash.substring(1) : null;
window.history.replaceState(null, null, location.pathname);
window.addEventListener('message', function (event) {
//window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
if (!isWhiteHost(event.origin)) {
// if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
return;
}
let data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
//var command = data.command;
if (data.token !== token) {
return;
}
if (!data.url) {
return;
}
let sessionId = data.sessionId;
xmlHttp({
url: data.url,
xhrFields: {
withCredentials: false
},
onload: function (resp) {
if (isTimeout) {
return;
}
else {
window.clearTimeout(timeoutTimer);
}
try {
parentPostMessage(type, {
sessionId: sessionId,
status: 'ok',
token: token,
url: data.url,
body: resp.responseText
});
} catch (e) {
console.log(
'%cError: parent.postMessage - ',
'color: red; background: yellow',
e, event.origin, event.data);
}
}
});
timeoutTimer = window.setTimeout(function () {
isTimeout = true;
parentPostMessage(type, {
sessionId: sessionId,
status: 'timeout',
command: 'loadUrl',
url: data.url
});
}, 30000);
});
try {
parentPostMessage(type, {status: 'initialized'});
} catch (e) {
console.log('err', e);
}
};
let nicovideo = function () {
if (window.name.indexOf('nicovideoApiLoader') < 0) {
return;
}
window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);
const referrer = document.referrer || window.name.split('#')[1];
// const noCredentials = !document.referrer;
if (!isWhiteHost(referrer) &&
localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
window.console.log('disable bridge', referrer);
return;
}
window.console.log('enable bridge', referrer);
let isOk = false;
const apiType = 'nicovideoApi';
const token = location.hash ? location.hash.substring(1) : null;
window.history.replaceState(null, null, location.pathname);
const pushHistory = (path, title = '') => {
// ブラウザの既読リンクの色をつけるためにreplaceStateする
// という目的だったのだが、iframeの中では効かないようだ。残念。
window.history.replaceState(null, title, path);
if (title) {
document.title = title;
}
if (broadcastChannel) {
broadcastChannel.postMessage({
type: 'pushHistory', path, title
});
}
};
const PREFIX = 'ZenzaWatch';
const dumpConfig = (data) => {
if (!data.keys) {
return;
}
const prefix = PREFIX;
const config = {};
const sessionId = data.sessionId;
data.keys.forEach(key => {
let storageKey = `${prefix}_${key}`;
if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
try {
config[key] = JSON.parse(localStorage.getItem(storageKey));
} catch (e) {
window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
}
}
});
parentPostMessage(apiType, {
sessionId,
status: 'ok',
token,
command: data.command,
body: config
}, token, referrer);
};
const saveConfig = data => {
if (!data.key) {
return;
}
const storageKey = `${PREFIX}_${data.key}`;
//window.console.log('bridge save config: %s = %s', storageKey, data.value);
localStorage.setItem(storageKey, JSON.stringify(data.value));
};
window.addEventListener('message', event => {
// window.console.log('nicovideoApiLoaderWindow.onMessage origin="%s"', event.origin, event.data);
if (!isWhiteHost(event.origin)) {
// if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
return;
}
const data = JSON.parse(event.data);
const command = data.command;
if (data.token !== token) {
window.console.log('invalid token: ', event.origin, data.token, token, command, data);
return;
}
switch (command) {
case 'ok':
window.console.info('initialize ok!');
isOk = true;
break;
case 'loadUrl':
return loadUrl(data, apiType, token, referrer);
case 'fetch':
return loadUrlByFetch(data, apiType, token, referrer);
case 'dumpConfig':
return dumpConfig(data);
case 'saveConfig':
return saveConfig(data);
case 'pushHistory':
return pushHistory(data.path, data.title);
case 'commandPacket':
return onCommandPacket(data.packet);
}
});
const onStorage = e => {
let key = e.key || '';
if (e.type !== 'storage' || key.indexOf(`${PREFIX}_`) !== 0) {
return;
}
key = key.replace(`${PREFIX}_`, '');
const oldValue = e.oldValue;
const newValue = e.newValue;
if (oldValue === newValue) {
return;
}
if (!isOk) {
return;
}
parentPostMessage(apiType, {
command: 'configSync',
token: token,
key: key,
value: newValue
}, token, referrer);
switch (key) {
case 'message':
//console.log('%cmessage', 'background: cyan;', newValue);
return parentPostMessage(apiType, {command: 'message', value: newValue, token});
}
};
const onCommandPacket = packet => {
// window.console.info('onCommandPacket', packet, isOk);
if (!isOk || !broadcastChannel) {
return;
}
broadcastChannel.postMessage(packet);
};
const onBroadcastMessage = e => {
const packet = e.data;
if (!isOk) {
return;
}
parentPostMessage(apiType, {command: 'message', value: JSON.stringify(packet), token}, token, referrer);
};
const broadcastChannel =
window.BroadcastChannel ? (new window.BroadcastChannel(PREFIX)) : null;
if (broadcastChannel) {
broadcastChannel.addEventListener('message', onBroadcastMessage);
} else {
window.addEventListener('storage', onStorage);
}
parentPostMessage(apiType, {status: 'initialized'}, token, referrer);
};
let smile = function () {
if (window.name.indexOf('storyboard') < 0) {
return;
}
window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);
// let parentHost = parseUrl(document.referrer).hostname;
if (!isWhiteHost(document.referrer)) { // if (!HOST_REG.test(parentHost)) {
window.console.log('disable bridge');
return;
}
const type = window.name.replace(/Loader$/, '');
const token = location.hash ? location.hash.substring(1) : null;
window.history.replaceState(null, null, location.pathname);
const videoCapture = function (src, sec) {
return new Promise((resolve, reject) => {
//console.log('videoCapture', src, sec);
let resolved = false;
const v = document.createElement('video');
v.addEventListener('loadedmetadata', () => {
v.currentTime = sec;
});
v.addEventListener('error', (err) => {
v.remove();
return reject(err);
});
const onSeeked = () => {
if (resolved) {
return;
}
const c = document.createElement('canvas');
c.width = v.videoWidth;
c.height = v.videoHeight;
const ctx = c.getContext('2d');
ctx.drawImage(v, 0, 0);
v.remove();
resolved = true;
return resolve(c);
};
v.addEventListener('seeked', onSeeked);
document.body.appendChild(v);
v.volume = 0;
v.autoplay = false;
v.controls = false;
v.src = src;
v.currentTime = sec;
});
};
window.addEventListener('message', function (event) {
const data = JSON.parse(event.data);
if (!isWhiteHost(event.origin)) {
// if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
return;
}
if (data.token !== token) {
return;
}
const command = data.command;
const sessionId = data.sessionId;
switch (command) {
case 'videoCapture':
videoCapture(data.src, data.sec).then(canvas => {
const dataUrl = canvas.toDataURL('image/png');
//console.info('video capture success', dataUrl.length);
parentPostMessage(type, {
sessionId,
status: 'ok',
token,
command,
body: dataUrl
});
});
break;
}
});
parentPostMessage(type, {status: 'initialized'});
};
const search = function () {
if (window.name.indexOf('search') < 0) {
return;
}
console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);
if (!isWhiteHost(document.referrer)) {
console.log('disable bridge');
return;
}
const type = window.name.replace(/Loader$/, '');
const token = location.hash ? location.hash.substring(1) : null;
window.history.replaceState(null, null, location.pathname);
window.addEventListener('message', (event) => {
if (!isWhiteHost(event.origin)) {
window.console.warn('not white host', event.origin);
return;
}
const data = JSON.parse(event.data);
if (data.token !== token) {
return;
}
if (data.command !== 'fetch') {
return;
}
if (!data.url) {
return;
}
if (parseUrl(data.url).hostname !== location.host) {
return;
}
data.options = data.options || {};
delete data.options.credentials;
loadUrlByFetch(data, type, token);
});
parentPostMessage(type, {status: 'initialized'});
};
return {
thumbInfo,
nicovideo,
smile,
search
};
})();

const boot = ((monkey, PRODUCT, START_PAGE_QUERY) => {
if (window.ZenzaWatch) {
return;
}
let document = window.document;
let host = window.location.host || '';
let href = (location.href || '').replace(/#.*$/, '');
let prot = location.protocol;
if (href === prot + '//www.nicovideo.jp/favicon.ico' &&
window.name.startsWith('nicovideoApiLoader')) {
GateAPI.nicovideo();
} else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
GateAPI.smile();
} else if (host === 'api.search.nicovideo.jp' && window.name.startsWith('searchApiLoader')) {
GateAPI.search();
} else if (host === 'ext.nicovideo.jp' && window.name.startsWith('thumbInfoLoader')) {
GateAPI.thumbInfo();
} else if (host === 'ext.nicovideo.jp' && window.name.startsWith('videoInfoLoader')) {
GateAPI.exApi();
} else if (window === window.top) {
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
document.head.append(script);
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
let loadGm = function () {
let script = document.createElement('script');
script.id = 'ZenzaWatchLoader';
script.setAttribute('type', 'text/javascript');
script.setAttribute('charset', 'UTF-8');
script.appendChild(
document.createTextNode(`(${monkey})('${PRODUCT}', '${encodeURIComponent(START_PAGE_QUERY)}');`));
document.head.append(script);
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
document.head.append(script);
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
});

  boot(monkey, PRODUCT, START_PAGE_QUERY);

})(window.unsafeWindow || window);
