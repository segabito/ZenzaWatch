import {cssUtil} from '../../../lib/src/css/css';
import {uQuery} from '../../../lib/src/uQuery';
import {global} from '../../../../src/ZenzaWatchIndex';
import {StoryboardWorker} from './StoryboardWorker';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';
//===BEGIN===
class SeekBarThumbnail {
  constructor(params) {
    this._container = params.container;
    this._scale = _.isNumber(params.scale) ? params.scale : 1.0;
    this._currentTime = 0;

    params.storyboard.on('reset', this._onStoryboardReset.bind(this));
    params.storyboard.on('update', this._onStoryboardUpdate.bind(this));

    global.debug.seekBarThumbnail = this;
  }
  _onStoryboardUpdate(model) {
    this._model = model;
    if (!model.isAvailable) {
      this.isAvailable = false;
      this.hide();
      return;
    }

    this.thumbnail ? this.thumbnail.setInfo(model.rawData) : this.initializeView(model);
    // this.thumbnail.resize({width: model.cellWidth, height: model.cellHeight});

    this.isAvailable = true;
    this.show();
  }
  _onStoryboardReset() {
    this.hide();
  }
  get isVisible() {
    return this._view ? this.classList.contains('is-visible') : false;
  }
  show() {
    if (!this._view) {
      return;
    }
    this.classList.add('is-visible');
  }
  hide() {
    if (!this._view) {
      return;
    }
    this.classList.remove('is-visible');
  }
  initializeView(model) {
    if (this.thumbnail) { return; }

    if (!SeekBarThumbnail.styleAdded) {
      cssUtil.addStyle(SeekBarThumbnail.__css__);
      SeekBarThumbnail.styleAdded = true;
    }
    const view = this._view = uQuery.html(SeekBarThumbnail.__tpl__)[0];
    this.classList = ClassList(view);

    this.thumbnail = StoryboardWorker.createThumbnail({
      container: view.querySelector('.zenzaSeekThumbnail-image'),
      canvas: view.querySelector('.zenzaSeekThumbnail-thumbnail'),
      info: model.rawData,
      name: 'StoryboardThumbnail'
    });

    if (this._container) {
      this._container.append(view);
    }
  }
  set currentTime(sec) {
    this._currentTime = sec;
    if (!this.isAvailable || !this.thumbnail) {
      return;
    }
    this.thumbnail.currentTime = sec;
  }

}
SeekBarThumbnail.BASE_WIDTH = 160;
SeekBarThumbnail.BASE_HEIGHT = 90;

SeekBarThumbnail.__tpl__ = (`
  <div class="zenzaSeekThumbnail">
    <div class="zenzaSeekThumbnail-image"><canvas width="160" height="90" class="zenzaSeekThumbnail-thumbnail"></canvas></div>
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

  .zenzaSeekThumbnail-image {
    width: 160px;
    height: 90px;
    opacity: 0.8;
    margin: auto;
    background: #999;
  }

  .enableCommentPreview .zenzaSeekThumbnail {
    width: 100%;
    height: 100%;
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
`).trim();

//===END===

export {SeekBarThumbnail};
