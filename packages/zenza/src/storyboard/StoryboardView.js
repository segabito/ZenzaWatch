import {Emitter} from '../../../lib/src/Emitter';
import {StoryboardInfoModel} from './StoryboardInfoModel';
import {global} from '../../../../src/ZenzaWatchIndex';
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

    this._isHover = false;
    this._scrollLeft = 0;
    this._pointerLeft = 0;
    this.isOpen = false;
    this.isEnable = _.isBoolean(params.enable) ? params.enable : true;
    this.totalWidth = global.innerWidth;
    this.state = params.state;
    this.state.onkey('isDragging', () => this.updateAnimation());

    sb.on('update', this._onStoryboardUpdate.bind(this));
    sb.on('reset', this._onStoryboardReset.bind(this));

  }
  get isHover() {
    return this._isHover;
  }
  set isHover(v) {
    this._isHover = v;
    this.updateAnimation();
  }
  updateAnimation() {
    if (!this.canvas || !MediaTimeline.isSharable) { return; }
    if (!this.isHover && this.isOpen && !this.state.isDragging) {
      this.canvas.startAnimation();
    } else {
      this.canvas.stopAnimation();
    }
  }
  enable() {
    this.isEnable = true;
    if (this._view && this._model.isAvailable) {
      this.open();
    }
  }
  open() {
    if (!this._view) {
      return;
    }
    this.isOpen = true;
    ClassList(this._view).add('is-open');
    ClassList(this._body).add('zenzaStoryboardOpen');
    ClassList(this._container).add('zenzaStoryboardOpen');
    this.updateAnimation();
    this.updatePointer();
  }
  close() {
    if (!this._view) {
      return;
    }
    this.isOpen = false;
    ClassList(this._view).remove('is-open');
    ClassList(this._body).remove('zenzaStoryboardOpen');
    ClassList(this._container).remove('zenzaStoryboardOpen');
    this.updateAnimation();
  }
  disable() {
    this.isEnable = false;
    this.close();
  }
  toggle(v) {
    if (typeof v === 'boolean') {
      this.isEnable = !v;
    }
    if (this.isEnable) {
      this.disable();
    } else {
      this.enable();
    }
  }
  _initializeStoryboard() {
    if (this._view) { return; }
    window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');

    this._body = document.body;

    cssUtil.addStyle(StoryboardView.__css__);
    const view = this._view = uq.html(StoryboardView.__tpl__)[0];

    const inner = this._inner = view.querySelector('.storyboardInner');
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

    const onHoverIn = () => this.isHover = true;
    const onHoverOut = () => this.isHover = false;
    uq(inner)
      .on('click', this._onBoardClick.bind(this))
      .on('mousemove', this._onBoardMouseMove.bind(this))
      .on('mousemove', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
      .on('wheel', this._onMouseWheel.bind(this))
      .on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300), {passive: true})
      .on('mouseenter', onHoverIn)
      .on('mouseleave',  _.debounce(onHoverOut, 1000))
      .on('touchstart', this._onTouchStart.bind(this), {passive: true})
      .on('touchmove', this._onTouchMove.bind(this), {passive: true});
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

    this.emitResolve('dom-ready');
  }
  _parsePointerEvent(event) {
    const model = this._model;
    const left = event.offsetX + this._scrollLeft;
    const cellIndex = left / model.cellWidth;
    const sec = cellIndex * model.cellIntervalMs / 1000;
    return {sec, x: event.x};
  }
  _onBoardClick(e) {
    const {sec} = this._parsePointerEvent(e);
    cssUtil.setProps([this._cursorTime, '--trans-x-pp', cssUtil.px(-1000)]);

    domEvent.dispatchCommand(this._view, 'seekTo', sec);
  }
  _onBoardMouseMove(e) {
    const {sec, x} = this._parsePointerEvent(e);

    this.cursorTimeLabel.text = textUtil.secToTime(sec);
    cssUtil.setProps([this._cursorTime, '--trans-x-pp', cssUtil.px(x)]);

    this.isHover = true;
    this.isMouseMoving = true;
  }
  _onBoardMouseMoveEnd(e) {
    this.isMouseMoving = false;
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
    this.isMouseMoving = true;
    // this.setScrollLeft(this.scrollLeft + delta * 5, true);
    this.scrollLeft += delta * 5;
  }
  _onMouseWheelEnd() {
    this.isMouseMoving = false;
  }
  _onTouchStart(e) {
    this.isHover = true;
    this.isMouseMoving = true;
    e.stopPropagation();
  }
  _onTouchEnd() {
  }
  _onTouchMove(e) {
    e.stopPropagation();
    this.isHover = true;
    this.isMouseMoving = true;
    this.isTouchMoving = true;
    this._bouncedOnToucheMoveEnd();
  }
  _onTouchMoveEnd() {
    this.isTouchMoving = false;
    this.isMouseMoving = false;
  }
  _onTouchCancel() {
  }
  update() {
    this.isHover = false;
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
  get isCanvasAnimating() {
    return this.isEnable && this.canvas.isAnimating;
  }
  get scrollLeft() {
    return this._scrollLeft;
  }
  set scrollLeft(left) {
    left = Math.min(Math.max(0, left), this.totalWidth - global.innerWidth);

    if (this._scrollLeft === left) {
      return;
    }

    this._scrollLeftChanged = true;
    this._scrollLeft = left;
    !this.isCanvasAnimating && (this.isOpen || this.state.isDragging) && (this.canvas.scrollLeft = left);
    this.updatePointer();
  }
  get pointerLeft() {
    return this._pointerLeft;
  }
  set pointerLeft(left) {
    if (this._pointerLeft === left) {
      return;
    }
    this._pointerLeftChanged = true;
    this._pointerLeft = left;
    this.updatePointer();
  }
  updatePointer() {
    if (!this._pointer || !this.isOpen || this._pointerUpdating ||
      (this.isCanvasAnimating && !this.isHover) ||
      (!this._pointerLeftChanged && !this._scrollLeftChanged)) {
      return;
    }
    this._pointerUpdating = true;
    this._pointerLeftChanged = false;
    this._scrollLeftChanged = false;
    cssUtil.setProps([this._pointer, '--trans-x-pp',
      cssUtil.px(this._pointerLeft - this._scrollLeft -  this._model.cellWidth / 2)]);
    this._pointerUpdating = false;
  }
  _updateSuccess() {
    const view = this._view;
    const cl = ClassList(view);
    cl.add('is-success');

    window.console.time('createStoryboardDOM');
    this._updateSuccessDom();
    window.console.timeEnd('createStoryboardDOM');

    if (!this.isEnable) {
      return;
    }
    cl.add('opening', 'is-open');
    this.scrollLeft = 0;
    this.open();
    window.setTimeout(() => cl.remove('opening'), 1000);
  }
  _updateSuccessDom() {
    const model = this._model;
    const infoRawData = model.rawData;
    if (!this.canvas) {
      this.canvas = StoryboardWorker.createBoard({
        container: this._view.querySelector('.storyboardCanvasContainer'),
        canvas: this._view.querySelector('.storyboardCanvas'),
        info: infoRawData,
        name: 'StoryboardCanvasView'
      });
      this.canvas.resize({width: global.innerWidth, height: model.cellHeight});
      if (MediaTimeline.isSharable) {
        const mt = MediaTimeline.get('main');
        this.canvas.currentTime = mt.currentTime;
        this.canvas.sharedMemory({buffer: mt.buffer, MAP: MediaTimeline.MAP});
      }
    } else {
      this.canvas.setInfo(infoRawData);
      this.canvas.resize({width: global.innerWidth, height: model.cellHeight});
    }

    this.totalWidth = Math.ceil(model.duration * 1000 / model.cellIntervalMs) * model.cellWidth;
    cssUtil.setProps(
      [this._pointer, '--width-pp',  cssUtil.px(model.cellWidth)],
      [this._pointer, '--height-pp', cssUtil.px(model.cellHeight)],
      [this._inner,   '--height-pp', cssUtil.px(model.cellHeight + 8)]
    );
  }
  _updateFail() {
    ClassList(this._view).remove('is-uccess').add('is-fail');
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
    const duration = Math.max(1, model.duration);
    const per = sec / duration;
    const intervalMs = model.cellIntervalMs;
    const totalWidth = this.totalWidth;
    const innerWidth = global.innerWidth;

    const cellWidth = model.cellWidth;
    const cellIndex = sec * 1000 / intervalMs;
    const scrollLeft =
      Math.min(Math.max(cellWidth * cellIndex - innerWidth * per, 0), totalWidth - innerWidth);

    if (forceUpdate || !this.isHover) {
      this.scrollLeft = scrollLeft;
    }
    this.pointerLeft = cellWidth * cellIndex;
  }
  get currentTime() {
    return this._currentTime;
  }
  set currentTime(sec) {
    this.setCurrentTime(sec);
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
    <div class="storyboardCanvasContainer"><canvas class="storyboardCanvas is-loading" height="90"></canvas></div>
    <div class="storyboardPointer"></div>
    <div class="storyboardInner"></div>
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
    opacity: 1;
    transition: opacity 0.5s ease 0.5s;
  }
  .storyboardCanvas.is-loading {
    opacity: 0;
    transition: none;
  }

  .storyboardContainer .storyboardInner {
    --height-pp: 98px;
    height: var(--height-pp);
    display: none;
    overflow: hidden;
    margin: 0;
    contain: strict;
    width: 100vw;
    overscroll-behavior: none;
  }
  .storyboardContainer.is-success .storyboardInner {
    display: block;
  }

  .storyboardContainer .cursorTime {
    display: none;
    position: absolute;
    top: 12px;
    left: 0;
    width: 54px; height: 29px;
    z-index: 9010;
    background: #ffc;
    pointer-events: none;
    contain: strict;
    transform: translate(var(--trans-x-pp), 30px) translate(-50%, -100%);
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
    visibility: hidden;
    position: absolute;
    top: 0;
    z-index: 100;
    pointer-events: none;
    --width-pp: 160px;
    --height-pp: 90px;
    --trans-x-pp: -100%;
    width: var(--width-pp);
    height: var(--height-pp);
    will-change: transform;
    transform: translate(var(--trans-x-pp), 0);
    background: #ff9;
    opacity: 0.5;
  }

  .storyboardContainer:hover .storyboardPointer {
    visibility: visible;
    transition: --trans-x-pp 0.4s ease-out;
  }

`).trim();

//===END===
export {StoryboardView};