import {Emitter} from '../../../lib/src/Emitter';
import {NicoChatFilter} from './NicoChatFilter';
import {ZenzaWatch, global, Config} from '../../../../src/ZenzaWatchIndex';
import {bounce} from '../../../lib/src/infra/bounce';
import {NicoChat} from './NicoChat';
import {NicoComment} from './NicoComment';
import {NicoTextParser} from './NicoTextParser';
import {env} from '../../../lib/src/infra/env';
import {PopupMessage} from '../../../lib/src/ui/PopupMessage';
import {VideoCaptureUtil} from '../../../lib/src/dom/VideoCaptureUtil';
import {NicoChatCss3View} from './NicoChatCss3View';
import {NicoChatViewModel} from './NicoChatViewModel';
import {watchResize} from '../../../lib/src/dom/watchResize';
import {cssUtil} from '../../../lib/src/css/css';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';
//===BEGIN===
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

    this._inViewTable = new Map();
    this._inSlotTable = new Map();
    this._domTable = new Map();
    this._playbackRate = params.playbackRate || 1.0;

    this._isPaused = undefined;

    this._retryGetIframeCount = 0;

    console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

    this._initializeView(params, 0);

    this._config = Config.namespace('commentLayer');

    this._updateDom = bounce.raf(this._updateDom.bind(this));

    // ウィンドウが非表示の時にブラウザが描画をサボっているので、
    // 表示になったタイミングで粛正する
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.refresh();
        this.onResize();
      }
    });
    global.debug.css3Player = this;
  }
  _initializeView (params, retryCount) {
    if (retryCount === 0) {
      window.console.time('initialize NicoCommentCss3PlayerView');
    }
    this._style = null;
    this.commentLayer = null;
    this._view = null;
    const iframe = this._getIframe();
    iframe.loading = 'eager';
    iframe.setAttribute('sandbox', 'allow-same-origin');

    iframe.className = 'commentLayerFrame';

    const html =
      NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '')
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');


    const onload = () => {
      let win, doc;
      iframe.onload = null;
      if (env.isChrome()) {iframe.removeAttribute('srcdoc');}
      try {
        win = iframe.contentWindow;
        doc = iframe.contentWindow.document;
      } catch (e) {
        window.console.error(e);
        window.console.log('変な広告に乗っ取られました');
        iframe.remove();
        this._view = null;
        global.debug.commentLayer = null;
        if (retryCount < 3) {
          this._initializeView(params, retryCount + 1);
        } else {
          PopupMessage.alert('コメントレイヤーの生成に失敗');
        }
        return;
      }
      cssUtil.registerProps(
        {name: '--dokaben-scale', syntax: '<number>', initialValue: 1, inherits: true, window: win},
        {name: '--chat-trans-x', syntax: '<length-percentage>', initialValue: 0,  inherits: false, window: win},
        {name: '--chat-trans-y', syntax: '<length-percentage>', initialValue: 0, inherits: false, window: win},
        {name: '--chat-scale-x', syntax: '<number>', initialValue: 1, inherits: false, window: win},
        {name: '--chat-scale-y', syntax: '<number>', initialValue: 1, inherits: false, window: win},
        {name: '--layer-scale',  syntax: '<number>', initialValue: 1, inherits: false, window: win}
      );

      this.window = win;
      this.document = doc;
      this.fragment = doc.createDocumentFragment();
      this._gcFragment = doc.createElement('div');
      this._gcFragment.hidden = true;
      this._optionStyle = doc.getElementById('optionCss');
      this._style = doc.getElementById('nicoChatAnimationDefinition');
      this._keyframesContainer = doc.getElementById('keyframesContainer');
      const commentLayer = this.commentLayer = doc.getElementById('commentLayer');
      const subLayer = this.subLayer = doc.createElement('div');
      subLayer.className = 'subLayer';
      commentLayer.append(subLayer);
      // Config直接参照してるのは手抜き
      doc.body.classList.toggle('debug', Config.props.debug);
      Config.onkey('debug', v => doc.body.classList.toggle('debug', v));
      ClassList(doc.body).toggle('debug', Config.props.debug);
      // 手抜きその2
      NicoComment.offscreenLayer.get().then(layer => { this._optionStyle.innerHTML = layer.optionCss; });
      global.emitter.on('updateOptionCss', newCss => {
        this._optionStyle.innerHTML = newCss;
      });

      global.debug.getInViewElements = () => doc.getElementsByClassName('nicoChat');

      const onResize = () => {
        const w = win.innerWidth, h = win.innerHeight;
        if (!w || !h) { return; }
        // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
        const aspectRatio = Math.max(this._aspectRatio, 9 / 16);
        const targetHeight = Math.min(h, w * aspectRatio);
        const scale = targetHeight / 384;
        commentLayer.style.setProperty('--layer-scale', scale);
      };

      const chkSizeInit = () => {
        const h = win.innerHeight;
        if (!h) {
          window.setTimeout(chkSizeInit, 500);
        } else {
          watchResize(iframe, _.throttle(onResize, 100));
          this.onResize = onResize;
          onResize();
        }
      };
      global.emitter.on('fullscreenStatusChange', _.debounce(onResize, 2000));
      window.setTimeout(chkSizeInit, 100);

      if (this._isPaused) {
        this.pause();
      }

      const updateTextShadow = type => {
        const types = ['shadow-type2', 'shadow-type3', 'shadow-stroke', 'shadow-dokaben'];
        const cl = ClassList(doc.body);
        types.forEach(t => cl.toggle(t, t === type));
      };
      updateTextShadow(this._config.props.textShadowType);
      this._config.onkey('textShadowType', _.debounce(updateTextShadow, 100));

      window.console.timeEnd('initialize NicoCommentCss3PlayerView');
    };

    this._view = iframe;
    if (this._node) {
      this._node.append(iframe);
    }

    if (iframe.srcdocType === 'string') {
      iframe.onload = onload;
      iframe.srcdoc = html;
    } else {
      // MS IE/Edge用
      if (!this._node) {
        this._msEdge = true;
        // ここに直接書いてるのは掟破り。 動かないよりはマシということで・・・
        document.querySelector('.zenzaPlayerContainer').append(iframe);
      }
      const icd = iframe.contentWindow.document;
      icd.open();
      icd.write(html);
      icd.close();
      window.setTimeout(onload, 0);
    }

    global.debug.commentLayer = iframe;
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
//    iframe.setAttribute('allow', 'vr');
    return iframe;
  }
  _onCommand (command, param) {
    this.emit('command', command, param);
  }
  _adjust () {
    if (!this._view) {
      return;
    }
    if (typeof this.onResize === 'function') {
      return this.onResize();
    }
  }
  getView () {
    return this._view;
  }
  set playbackRate (playbackRate) {
    // let isSpeedUp = this._playbackRate < playbackRate;
    this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
    if (!Config.props.autoCommentSpeedRate || this._playbackRate <= 1) {
      this.refresh();
    }
  }
  get playbackRate() { return this._playbackRate; }
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
    if (!this.commentLayer) {
      return;
    }
    ClassList(this.commentLayer).add(name);
  }
  _removeClass (name) {
    if (!this.commentLayer) {
      return;
    }
    ClassList(this.commentLayer).remove(name);
  }
  _setStall (v) {
    if (v) {
      this._addClass('is-stalled');
    } else {
      this._removeClass('is-stalled');
    }
  }
  pause () {
    if (this.commentLayer) {
      this._addClass('paused');
    }
    this._isPaused = true;
  }
  play () {
    if (this.commentLayer) {
      this._removeClass('paused');
    }
    this._isPaused = false;
  }
  clear () {
    if (this.commentLayer) {
      this.commentLayer.textContent = '';
      this.subLayer.textContent = '';
      this.commentLayer.append(this.subLayer);
      this._gcFragment.textContent = '';
      this._keyframesContainer.textContent = '';
      this.fragment.textContent = '';
    }
    if (this._style) {
      this._style.textContent = '';
    }

    this._inViewTable.clear();
    this._inSlotTable.clear();
    this._domTable.clear();
  }
  refresh () {
    this.clear();
    this._updateInviewElements();
  }
  _updateInviewElements () {
    if (!this.commentLayer || !this._style || !this._isShow || document.hidden) {
      return;
    }

    const vm = this._viewModel;
    const inView = [
      vm.getGroup(NicoChat.TYPE.NAKA).inViewMembers,
      vm.getGroup(NicoChat.TYPE.BOTTOM).inViewMembers,
      vm.getGroup(NicoChat.TYPE.TOP).inViewMembers
    ].flat();

    const css = [], dom = [], subDom = [];

    const ct = this._currentTime;
    const newView = [];
    for (let i = 0, len = inView.length; i < len; i++) {
      const nicoChat = inView[i];
      const domId = nicoChat.id;
      if (this._inViewTable.has(domId)) {
        continue;
      }
      this._inViewTable.set(domId, nicoChat);
      this._inSlotTable.set(domId, nicoChat);
      newView.push(nicoChat);
    }

    if (newView.length > 1) {
      newView.sort(NicoChat.SORT_FUNCTION);
    }

    for (let i = 0, len = newView.length; i < len; i++) {
      const nicoChat = newView[i];
      const type = nicoChat.type;
      const size = nicoChat.size;
      const cssText = NicoChatCss3View.buildChatCss(nicoChat, type, ct, this._playbackRate);
      const element = NicoChatCss3View.buildChatDom(nicoChat, type, size, cssText, this.document);
      this._domTable.set(nicoChat.id, element);
      (nicoChat.isSubThread ? subDom : dom).push(element);
    }

    // DOMへの追加
    if (newView.length > 0) {
      const inSlotTable = this._inSlotTable, currentTime = this._currentTime;
      const outViewIds = [];
      const margin = 2 / NicoChatViewModel.SPEED_RATE;
      for (const key of inSlotTable.keys()) {
        const chat = inSlotTable.get(key);
        if (currentTime - margin < chat.endRightTiming) {
          continue;
        }
        inSlotTable.delete(key);
        outViewIds.push(key);
      }
      this._updateDom(dom, subDom, css, outViewIds);
    }
  }

  _updateDom() {
    // performance.mark('updateDom:start-add');
    // this._removeOutviewElements(outViewChats);
    this._gcInviewElements();
    if (this.removingElements.length) {
      this.gcFragment.append(...this.removingElements);
      this.removingElements.length = 0;
    }
    if (this.fragment.firstElementChild) {
      this.commentLayer.append(this.fragment);
    }
    if (this.subFragment.firstElementChild) {
      this.subLayer.append(this.subFragment);
    }
    // performance.mark('updateDom:end-add');
    // performance.mark('updateDom:start-remove');
    // performance.mark('updateDom:end-remove');
    // performance.measure('updateDom');
  }
  /*
  * 古い順に要素を除去していく
  */
  _gcInviewElements () {
    if (!this.commentLayer || !this._style) {
      return;
    }

    const max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;

    const commentLayer = this.commentLayer;
    let inViewElements;
    const elements = [];
    inViewElements = this.window.Array.from(commentLayer.querySelectorAll('.nicoChat.fork0'));
    for (let i = inViewElements.length - max - 1; i >= 0; i--) {
      elements.push(inViewElements[i]);
    }
    //inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork1'));
    //for (i = inViewElements.length - max - 10 - 1; i >= 0; i--) {
    //  elements.push(inViewElements[i]);
    //}
    if (elements.length < 1) { return; }
    const fragment = this.fragment;
    fragment.append(...elements);
    this._gcFragment.append(fragment);
  }

  buildHtml (currentTime) {
    window.console.time('buildHtml');

    const vm = this._viewModel;
    currentTime = currentTime || vm.currentTime;
    const members = [
      vm.getGroup(NicoChat.TYPE.NAKA).members,
      vm.getGroup(NicoChat.TYPE.BOTTOM).members,
      vm.getGroup(NicoChat.TYPE.TOP).members
    ].flat();

    members.sort(NicoChat.SORT_FUNCTION);

    const html = [];
    html.push(this._buildGroupHtml(members, currentTime));

    const tpl = NicoCommentCss3PlayerView.__TPL__
      .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
      .replace('%OPTION_CSS%', NicoComment.offscreenLayer.optionCss)
      .replace('%CSS%', '')
      .replace('%MSG%', html.join(''));

    window.console.timeEnd('buildHtml');
    return tpl;
  }
  _buildGroupHtml (m, currentTime = 0) {
    const result = [];

    for (let i = 0, len = m.length; i < len; i++) {
      let chat = m[i];
      let type = chat.type;
      let cssText = NicoChatCss3View.buildChatCss(chat, type, currentTime);
      let element = NicoChatCss3View.buildChatHtml(chat, type, cssText, this.document);
      result.push(element);
    }
    return result.join('\n');
  }
  _buildGroupCss (m, currentTime) {
    let result = [];

    for (let i = 0, len = m.length; i < len; i++) {
      let chat = m[i];
      let type = chat.type;
      result.push(NicoChatCss3View.buildChatCss(chat, type, currentTime));
    }
    return result.join('\n');
  }
  show () {
    if (!this._isShow) {
      this._isShow = true;
      this.refresh();
    }
  }
  hide () {
    this.clear();
    this._isShow = false;
  }
  appendTo (node) {
    if (this._msEdge) {
      return;
    } // MS IE/Edge...
    this._node = node;
    node.append(this._view);
  }
  /**
   * exportで、コメントを静的なCSS3アニメーションHTMLとして出力する。
   * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
   * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
   */
  export () {
    return this.buildHtml(0)
      .replace('<html', '<html class="saved"');
  }

  getCurrentScreenHtml () {
    const win = this.window;
    if (!win) {
      return null;
    }
    this.refresh();
    const body = win.document.body;
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
    const win = this.window;
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
body {
  pointer-events: none;
  user-select: none;
}
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

.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }

@keyframes fixed {
   0% { opacity: 1; visibility: visible; }
  95% { opacity: 1; }
 100% { opacity: 0; visibility: hidden;}
}

@keyframes show-hide {
 0% { visibility: visible; opacity: 1; }
 /* Chrome 73のバグ？対策 hidden が適用されない */
 95% { visibility: visible; opacity: 1; }
 100% { visibility: hidden; opacity: 0; }

 /*100% { visibility: hidden; }*/
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

@keyframes idou-props {
  0%   {
    visibility: visible;
    transform: translateX(0);
  }
  100% {
    visibility: hidden;
    transform: translateX(var(--chat-trans-x));
  }
}
@keyframes idou-props-scaled {
  0%   {
    visibility: visible;
    transform:
      translateX(0)
      scale(var(--chat-scale-x), var(--chat-scale-y));
  }
  100% {
    visibility: hidden;
    transform:
      translateX(var(--chat-trans-x))
      scale(var(--chat-scale-x), var(--chat-scale-y));
  }
}
@keyframes idou-props-scaled-middle {
  0%   {
    visibility: visible;
    transform:
      translateX(0)
      scale(var(--chat-scale-x), var(--chat-scale-y))
      translateY(-50%);
  }
  100% {
    visibility: hidden;
    transform:
      translateX(var(--chat-trans-x))
      scale(var(--chat-scale-x), var(--chat-scale-y))
      translateY(-50%);
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
  transform: scale(var(--layer-scale));
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

  /*-webkit-font-smoothing: initial;
  font-smooth: auto;
  text-rendering: optimizeSpeed;
  font-kerning: none;*/
}

.shadow-type2 .nicoChat {
  text-shadow:
     1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px -1px 0 rgba(0, 0, 0, 0.5),
     1px -1px 0 rgba(0, 0, 0, 0.5);
}

.shadow-type3 .nicoChat {
  text-shadow:
     1px  1px 1px rgba(  0,   0,   0, 0.8),
     0  0 2px rgba(  0,   0,   0, 0.8),
    -1px -1px 1px rgba(128, 128, 128, 0.8);
}

.shadow-stroke .nicoChat {
  text-shadow: none;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.7);
  text-stroke:         1px rgba(0, 0, 0, 0.7);
}

/*「RGBは大体　文字200、80、0　縁150,50,0　くらい」らしい*/
.shadow-dokaben .nicoChat.ue,
.shadow-dokaben .nicoChat.shita {
  color: rgb(200, 80, 0);
  font-family: 'dokaben_ver2_1' !important;
  font-weight: bolder;
  animation-name: dokaben !important;
  text-shadow:
    1px  1px 0 rgba(150, 50, 0, 1),
   -1px  1px 0 rgba(150, 50, 0, 1),
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
     1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px -1px 0 rgba(0, 0, 0, 0.5),
     1px -1px 0 rgba(0, 0, 0, 0.5);
}


.nicoChat.ue, .nicoChat.shita {
  animation-name: fixed;
  visibility: hidden;
}

.nicoChat.ue.html5, .nicoChat.shita.html5 {
  animation-name: show-hide;
  animation-timing-function: steps(20, jump-none);
}

.nicoChat.black, .nicoChat.black.fork1 {
  text-shadow:
   -1px -1px 0 ${textShadowGray},
   1px  1px 0 ${textShadowGray};
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
.nicoChat.nicotta {
  border: 1px solid orange;
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
  0%   { transform: rotate(0deg); }
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

//===END===

export {NicoCommentCss3PlayerView};

