import {Emitter} from '../../../lib/src/Emitter';
import {StoryboardModel} from './StoryboardModel';
import {ZenzaWatch, global} from '../../../../src/ZenzaWatchIndex';
import {RequestAnimationFrame} from '../../../lib/src/infra/RequestAnimationFrame';
import {css} from '../../../lib/src/css/css';
import {env} from '../../../lib/src/infra/env';
import {textUtil} from '../../../lib/src/text/textUtil';
import {uq} from '../../../lib/src/uQuery';
import {domEvent} from '../../../lib/src/dom/domEvent';
import {TextLabel} from '../../../lib/src/ui/TextLabel';

// import {bounce} from '';
//===BEGIN===
class StoryboardBlockList {
  static createBlock(option) {
    const height = option.boardHeight;
    const backgroundPosition = `0 ${height * option.row * -1}px`;

    const view = document.createElement('div');
    view.className = 'board';
    view.style.cssText = `
      background-image: url(${option.src});
      background-position: ${backgroundPosition};
    `;
    Object.assign(view.dataset, {
      src: option.src,
      page: option.page,
      top: height * option.row + height / 2,
      backgroundPosition
    });

    return view;
  }
  static createBorder(cols) {
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

  constructor(storyboard) {
    if (storyboard) {
      this.create(storyboard);
    }
  }

  /**
   * @params {StoryboardModel} storyboard
   */
  create(storyboard) {
    let pages = storyboard.getPageCount();
    let pageWidth = storyboard.getPageWidth();
    let width = storyboard.getWidth();
    let height = storyboard.getHeight();
    let rows = storyboard.getRows();
    let cols = storyboard.getCols();

    let totalRows = storyboard.getTotalRows();
    let rowCnt = 0;
    this._innerBorder = StoryboardBlockList.createBorder(cols);
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
    const block = StoryboardBlockList.createBlock(option);
    block.append(this._innerBorder.cloneNode(true));
    this._blocks.push(block);
    this._view.append(...this._blocks);
  }
  loadImage() {
  }
  clear() {
    this._view.remove();
  }
  get view() {
    return this._view;
  }
}
css.registerProps(
  {name: '--cell-width',  syntax: '<number>', initialValue: 160,   inherits: true},
  {name: '--cell-height', syntax: '<number>', initialValue: 90,    inherits: true},
  {name: '--board-width',  syntax: '<number>', initialValue: 1600, inherits: true},
  {name: '--board-height', syntax: '<number>', initialValue: 900,  inherits: true},
);


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

    const frame = this._requestAnimationFrame = new RequestAnimationFrame(
      this._onRequestAnimationFrame.bind(this)
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
  get isEnable() {
    return !!this._isEnable;
  }
  _initializeStoryboard() {
    if (this._body) { return; }
    window.console.log('%cStoryboardView.initializeStoryboard', 'background: lightgreen;');

    this._body = document.body;

    css.addStyle(StoryboardView.__css__);
    let view = this._view = uq.html(StoryboardView.__tpl__)[0];

    let inner = this._inner = view.querySelector('.storyboardInner');
    this._failMessage = view.querySelector('.failMessage');
    this._cursorTime = view.querySelector('.cursorTime');
    this._pointer = view.querySelector('.storyboardPointer');
    this._inner = inner;
    TextLabel.create({
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
    }).then(label => this.cursorTimeLabel = label);

     view.classList.toggle('webkit', env.isWebkit());
     uq(view)
      .on('click', this._onBoardClick.bind(this))
      .on('mousemove', this._onBoardMouseMove.bind(this))
      .on('mousemove', _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
      .on('wheel', this._onMouseWheel.bind(this))
      .on('wheel', _.debounce(this._onMouseWheelEnd.bind(this), 300));

    let onHoverIn = () => this._isHover = true;

    let onHoverOut = () => this._isHover = false;

    uq(inner)
      .on('mouseenter', onHoverIn)
      .on('mouseleave',  _.debounce(onHoverOut, 1000))
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
    const board = e.target.closest('.board');
    if (!board) { return; }
    const rect = board.getBoundingClientRect();
    const y = board.dataset.top * 1;
    const x = e.pageX - rect.left;
    const page = board.dataset.page * 1;
    const ms = this._model.getPointMs(x, y, page);
    if (isNaN(ms)) {
      return;
    }

    const view = this._view;
    view.classList.add('clicked');
    window.setTimeout(() => view.classList.remove('clicked'), 1000);
    this._cursorTime.style.transform = 'translate(-100vw, 0)';

    domEvent.dispatchCommand(view, 'seekTo', ms / 1000);
  }
  _onBoardMouseMove(e) {
    const board = e.target.closest('.board');
    if (!board) { return; }
    const rect = board.getBoundingClientRect();
    const y = board.dataset.top * 1;
    const x = e.pageX - rect.left;
    const page = board.dataset.page * 1;
    const ms = this._model.getPointMs(x, y, page);
    if (isNaN(ms)) {
      return;
    }
    const sec = Math.floor(ms / 1000);

    const time = textUtil.secToTime(sec);
    if (this.cursorTimeLabel && this.cursorTimeLabel.text !== time) {
      this.cursorTimeLabel.text = time;
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
    if (!this._model.isAvailable) {
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
    if (!this._model.isAvailable) {
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
    let duration = Math.max(1, storyboard.duration);
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
    will-change: tranform;
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

  .is-wheelSeeking .storyboardContainer.success,
  .is-dragging .storyboardContainer.success,
  .storyboardContainer.success.show {
    z-index: 50;
    opacity: 1;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
    visibility: visible;
    pointer-events: auto;
    transform: translate3d(0, -100%, 0) translateY(10px);
  }

  .is-wheelSeeking .storyboardContainer,
  .is-dragging .storyboardContainer {
    pointer-events: none;
  }

  .is-fullscreen .is-wheelSeeking .storyboardContainer,
  .is-fullscreen .is-dragging .storyboardContainer,
  .is-fullscreen             .storyboardContainer.show {
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
    display: grid;
    grid-auto-columns: var(--board-width);
    grid-auto-flow: column;
  }

  .storyboardContainer .boardList .board {
    /*position: absolute;*/
    top: 0;
    display: grid;
    grid-auto-columns: var(--cell-width);
    grid-auto-flow: column;
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

  .storyboardContainer .boardList .board .border {
    box-sizing: border-box;
    border-style: solid;
    border-color: #000 #333 #000 #999;
    border-width: 0     2px    0  2px;
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

//===END===
export {StoryboardView};