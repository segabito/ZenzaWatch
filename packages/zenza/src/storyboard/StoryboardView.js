import {Emitter} from '../../../lib/src/Emitter';
import {StoryboardInfoModel} from './StoryboardInfoModel';
import {global} from '../../../../src/ZenzaWatchIndex';
import {RequestAnimationFrame} from '../../../lib/src/infra/RequestAnimationFrame';
import {cssUtil} from '../../../lib/src/css/css';
import {textUtil} from '../../../lib/src/text/textUtil';
import {uq} from '../../../lib/src/uQuery';
import {domEvent} from '../../../lib/src/dom/domEvent';
import {TextLabel} from '../../../lib/src/ui/TextLabel';
import {StoryboardWorker} from './StoryboardWorker';
import {MediaTimeline} from '../../../lib/src/dom/MediaTimeline';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';

// import {bounce} from '';
//===BEGIN===


class StoryboardView extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }

  initialize(params) {
    console.log('%c initialize StoryboardView', 'background: lightgreen;');
    this._container = params.container;

    /** @type {StoryboardInfoModel} */
    const sb = this._model = params.model;

    this.isHover = false;
    this._currentUrl = '';
    this._lastPage = -1;
    this._lastMs = -1;
    this._lastGetMs = -1;
    this._scrollLeft = 0;
    this._isEnable = _.isBoolean(params.enable) ? params.enable : true;

    sb.on('update', this._onStoryboardUpdate.bind(this));
    sb.on('reset', this._onStoryboardReset.bind(this));

    const frame = this._requestAnimationFrame = new RequestAnimationFrame(
      this._onRequestAnimationFrame.bind(this), 3
    );

    global.emitter.on('DialogPlayerClose', () => frame.disable());
  }
  enable() {
    this._isEnable = true;
    if (this._view && this._model.isAvailable) {
      this.open();
    }
  }
  open() {
    if (!this._view) {
      return;
    }
    ClassList(this._view).add('is-open');
    ClassList(this._body).add('zenzaStoryboardOpen');
    ClassList(this._container).add('zenzaStoryboardOpen');
    this._requestAnimationFrame.enable();
  }
  close() {
    if (!this._view) {
      return;
    }
    ClassList(this._view).remove('is-open');
    ClassList(this._body).remove('zenzaStoryboardOpen');
    ClassList(this._container).remove('zenzaStoryboardOpen');
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
  get isEnable() {
    return !!this._isEnable;
  }
  _initializeStoryboard() {
    if (this._body) { return; }
    window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');

    this._body = document.body;

    cssUtil.addStyle(StoryboardView.__css__);
    const view = this._view = uq.html(StoryboardView.__tpl__)[0];

    const inner = this._inner = view.querySelector('.storyboardInner');
    this._bone = view.querySelector('.storyboardInner-bone');
    this._failMessage = view.querySelector('.failMessage');
    this._cursorTime = view.querySelector('.cursorTime');
    this._pointer = view.querySelector('.storyboardPointer');
    this._inner = inner;
    this.cursorTimeLabel = TextLabel.create({
      container: this._cursorTime,
      name: 'cursorTimeLabel',
      text: '00:00',
      style: {
        widthPx: 54,
        heightPx: 29,
        fontFamily: 'monospace',
        fontWeight: '',
        fontSizePx: 13.3,
        color: '#000'
      }
    });

     uq(inner)
      .on('click', this._onBoardClick.bind(this))
      .on('mousemove', this._onBoardMouseMove.bind(this))
      .on('mousemove', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
      .on('wheel', this._onMouseWheel.bind(this))
      .on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));

    const onHoverIn = () => this.isHover = true;

    const onHoverOut = () => this.isHover = false;

    uq(inner)
      .on('mouseenter', onHoverIn)
      .on('mouseleave',  _.debounce(onHoverOut, 1000))
      .on('touchstart', this._onTouchStart.bind(this))
      .on('touchmove', this._onTouchMove.bind(this));
    this._bouncedOnToucheMoveEnd = _.debounce(this._onTouchMoveEnd.bind(this), 2000);

    this._container.append(view);
    view.closest('.zen-root')
      .addEventListener('touchend', () => this.isHover = false, {passive: true});

    window.addEventListener('resize',
      _.throttle(() => {
        if (this.canvas) {
          this.canvas.resize({width: global.innerWidth, height: this._model.cellHeight});
        }
      }, 500), {passive: true});
  }
  _onBoardClick(e) {
    const model = this._model;
    const totalWidth = model.cellCount * model.cellWidth;
    const x = e.clientX + this._scrollLeft;
    const duration = model.duration;
    const sec = x / totalWidth * duration;

    const view = this._view;
    cssUtil.setProps([this._cursorTime, '--trans-x-pp', cssUtil.px(-1000)]);

    domEvent.dispatchCommand(view, 'seekTo', sec);
  }
  _onBoardMouseMove(e) {
    const model = this._model;
    const totalWidth = model.cellCount * model.cellWidth;
    const x = e.clientX + this._scrollLeft;
    const duration = model.duration;
    const sec = x / totalWidth * duration;

    const time = textUtil.secToTime(sec);
    if (this.cursorTimeLabel && this.cursorTimeLabel.text !== time) {
      this.cursorTimeLabel.text = time;
    }
    cssUtil.setProps([this._cursorTime, '--trans-x-pp', cssUtil.px(e.x)]);

    this.isHover = true;
    this._isMouseMoving = true;
  }
  _onBoardMouseMoveEnd(e) {
    this._isMouseMoving = false;
  }
  _onMouseWheel(e) {
    // 縦ホイールで左右スクロールできるようにする
    e.stopPropagation();
    const deltaX = parseInt(e.deltaX, 10);
    const delta = parseInt(e.deltaY, 10);
    if (Math.abs(deltaX) > Math.abs(delta)) {
      // 横ホイールがある環境ならなにもしない
      return;
    }
    e.preventDefault();
    this.isHover = true;
    this._isMouseMoving = true;
    const left = this.scrollLeft();
    this.scrollLeft(left + delta * 5, true);
  }
  _onMouseWheelEnd(e) {
    this._isMouseMoving = false;
  }
  _onTouchStart(e) {
    this.isHover = true;
    this._isMouseMoving = true;
    e.stopPropagation();
  }
  _onTouchEnd(e) {
  }
  _onTouchMove(e) {
    e.stopPropagation();
    this.isHover = true;
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
    this.isHover = false;
    this._timerCount = 0;
    this._scrollLeft = 0;

    this._initializeStoryboard(this._model);

    this.close();
    ClassList(this._view).remove('is-success', 'is-fail');
    if (this._model.status === 'ok') {
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

    if (forceUpdate) {
      this._requestAnimationFrame.execOnce();
    }
    if (left === undefined) {
      return this._scrollLeft;
    } else {
      if (Math.abs(this._scrollLeft - left) < 1) {
        return;
      }
      this.isEnable && this.canvas && (this.canvas.scrollLeft = left);

      this._scrollLeft = left;
      this._scrollLeftChanged = true;
    }
  }
  _updateSuccess() {
    const view = this._view;
    const cl = ClassList(view);
    cl.add('is-success');

    window.console.time('createStoryboardDOM');
    this._updateSuccessDom();
    window.console.timeEnd('createStoryboardDOM');

    if (this._isEnable) {
      cl.add('opening', 'is-open');
      this.scrollLeft(0);
      this.open();
      window.setTimeout(() => cl.remove('opening'), 1000);
    }

  }
  _updateSuccessDom() {
    const model = this._model;
    const infoRawData = model.rawData;
    if (!this.canvas) {
      StoryboardWorker.createBoard({
        container: this._view.querySelector('.storyboardCanvasContainer'),
        canvas: this._view.querySelector('.storyboardCanvas'),
        info: infoRawData,
        name: 'StoryboardCanvasView'
      }).then(v => {
        this.canvas = v;
        this.canvas.resize({width: global.innerWidth, height: model.cellHeight});
      });
    } else {
      this.canvas.setInfo(infoRawData);
      this.canvas.resize({width: global.innerWidth, height: model.cellHeight});
    }

    cssUtil.setProps(
      [this._bone,    '--width-pp',  cssUtil.px(model.cellCount * model.cellWidth)],
      [this._bone,    '--height-pp', cssUtil.px(model.cellHeight)],
      [this._pointer, '--width-pp',  cssUtil.px(model.cellWidth)],
      [this._pointer, '--height-pp', cssUtil.px(model.cellHeight)],
      [this._inner,   '--height-pp', cssUtil.px(model.cellHeight + 8)]
    );
  }
  _updateFail() {
    const cl = ClassList(this._view);
    cl.remove('is-uccess');
    cl.add('is-fail');
  }
  clear() {
  }
  _onRequestAnimationFrame() {
    if (!this._view || !this._model.isAvailable) {
      return;
    }

    if (this._scrollLeftChanged) {
      this._inner.scrollLeft = this._scrollLeft;
      this._scrollLeftChanged = false;
      this._pointerLeftChanged = true;
    }
    if (this._pointerLeftChanged) {
      cssUtil.setProps([this._pointer, '--trans-x-pp',
        cssUtil.px(this._pointerLeft - this._scrollLeft)]);
      this._pointerLeftChanged = false;
    }
  }
  setCurrentTime(sec, forceUpdate) {
    const model = this._model;
    if (!this._view || !model.isAvailable) {
      return;
    }
    if (this._currentTime === sec) {
      return;
    }

    this._currentTime = sec;
    const ms = sec * 1000;
    const duration = Math.max(1, model.duration);
    const per = ms / (duration * 1000);
    const width = model.cellWidth;
    const totalWidth = model.cellCount * width;
    const targetLeft = totalWidth * per;

    if (this._pointerLeft !== targetLeft) {
      this._pointerLeft = targetLeft;
      this._pointerLeftChanged = true;
    }

    if (forceUpdate) {
      this.scrollLeft(targetLeft - global.innerWidth * per, true);
    } else {
      if (this.isHover) {
        return;
      }
      this.scrollLeft(targetLeft - global.innerWidth * per);
    }
  }
  get currentTime() {
    return this._currentTime;
  }
  set currentTime(sec) {
    this.setCurrentTime(sec);
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
    ClassList(this._view).remove('is-open', 'is-fail');
  }

}

StoryboardView.__tpl__ = `
  <div id="storyboardContainer" class="storyboardContainer">
    <div class="cursorTime"></div>
    <div class="storyboardCanvasContainer"><canvas class="storyboardCanvas" height="90"></canvas></div>
    <div class="storyboardPointer"></div>
    <div class="storyboardInner"><div class="storyboardInner-bone"></div></div>
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
    /*border-top: 2px solid #ccc;
    background: rgba(32, 32, 32, 0.3);*/
    z-index: 9005;
    overflow: hidden;
    pointer-events: none;
    will-change: tranform;
    display: none;
    contain: layout paint style;
    user-select: none;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out, visibility 0.2s;
  }

  .storyboardContainer.opening {
    pointer-events: none !important;
  }

  .storyboardContainer.is-success {
    display: block;
    opacity: 0;
  }

  .storyboardContainer * {
    box-sizing: border-box;
  }

  .is-wheelSeeking .storyboardContainer.is-success,
  .is-dragging .storyboardContainer.is-success,
  .storyboardContainer.is-success.is-open {
    z-index: 50;
    opacity: 1;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
    visibility: visible;
    pointer-events: auto;
    transform: translate3d(0, -100%, 0) translateY(10px);
  }

  .is-wheelSeeking .storyboardContainer,
  .is-dragging     .storyboardContainer {
    pointer-events: none;
  }

  .is-fullscreen .is-wheelSeeking .storyboardContainer,
  .is-fullscreen .is-dragging     .storyboardContainer,
  .is-fullscreen                  .storyboardContainer.is-open {
    position: fixed;
    top: calc(100% - 10px);
  }

  .storyboardCanvasContainer {
    position: absolute;
    pointer-events: none;
    width: 100vw;
    z-index: 90;
    contain: layout size style;
  }
  .storyboardCanvas {
    width: 100%;
    height: 100%;
  }

  .storyboardContainer .storyboardInner {
    --height-pp: 98px;
    height: var(--height-pp);
    display: none;
    overflow: hidden;
    /*background: rgba(32, 32, 32, 0.5);*/
    margin: 0;
    contain: strict;
    width: 100vw;
    will-change: transform;
    overscroll-behavior: contain;
  }
  .storyboardContainer.is-success .storyboardInner {
    display: block;
  }
  .storyboardInner-bone {
    contain: strict;
    pointer-events: none;
    width:  var(--width-pp);
    height: var(--height-pp);
    visibility: hidden;
  }

  .storyboardContainer .cursorTime {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9010;
    background: #ffc;
    pointer-events: none;
    padding: 0;
    transform: translate3d(var(--trans-x-pp), 30px, 0) translate(-50%, -100%);
  }
  .storyboardContainer:hover .cursorTime {
    transition: --trans-x-pp 0.1s ease-out;
    display: block;
  }

  .storyboardContainer:active  .cursorTime,
  .storyboardContainer.opening .cursorTime {
    display: none;
  }

  .storyboardPointer {
    position: absolute;
    top: 0;
    z-index: 100;
    pointer-events: none;
    --width-pp: 160px;
    --height-pp: 90px;
    --trans-x-pp: -100%;
    width: var(--width-pp);
    height: var(--height-pp);
    transform: translate3d(calc( var(--trans-x-pp) - var(--width-pp) / 2), 0, 0);
    transition: --trans-x-pp 0.1s linear;
    background: #ff9;
    opacity: 0.5;
  }

  .storyboardContainer:hover .storyboardPointer {
    transition: --trans-x-pp 0.4s ease-out;
  }

    `).trim();

//===END===
export {StoryboardView};