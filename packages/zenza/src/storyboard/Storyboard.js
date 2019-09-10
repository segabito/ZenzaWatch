import {Emitter} from '../../../lib/src/Emitter';
import {StoryboardInfoLoader} from '../../../lib/src/nico/StoryboardInfoLoader';
import {StoryboardView} from './StoryboardView';
import {StoryboardInfoModel} from './StoryboardInfoModel';
import {SeekBarThumbnail} from './SeekBarThumbnail';
import {StoryboardWorker} from './StoryboardWorker';
import {global} from '../../../../src/ZenzaWatchIndex';
import {nicoUtil} from '../../../lib/src/nico/nicoUtil';
import {StoryboardCacheDb} from '../../../lib/src/nico/StoryboardCacheDb';

//===BEGIN===
//@require StoryboardInfoModel
//@require StoryboardView
//@require SeekBarThumbnail
//@require StoryboardWorker

class Storyboard extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  initialize(params) {
    this._playerConfig = params.playerConfig;
    this._container = params.container;
    this._loader = params.loader || StoryboardInfoLoader;
    /** @type {StoryboardInfoModel} */
    this._model = new StoryboardInfoModel({});
    global.debug.storyboard = this;
  }
  _initializeStoryboard() {
    this._initializeStoryboard = _.noop;

    if (!this._view) {
      this._view = new StoryboardView({
        model: this._model,
        container: this._container,
        enable: this._playerConfig.props.enableStoryboardBar
      });
    }
    this.emitResolve('dom-ready');
  }
  reset() {
    if (!this._model) { return; }
    this._container.classList.remove('storyboardAvailable');
    this._model.reset();
    this.emit('reset', this._model);
  }
  onVideoCanPlay(watchId, videoInfo) {
    if (!nicoUtil.isPremium()) {
      return;
    }
    if (!this._playerConfig.props.enableStoryboard) {
      return;
    }

    this._watchId = watchId;
    const resuestId = this._requestId =  Math.random();

    StoryboardInfoLoader.load(videoInfo)
      .then(async (info) => {
        await this.promise('dom-ready');
        return info;
      })
      .then(this._onStoryboardInfoLoad.bind(this, resuestId))
      .catch(this._onStoryboardInfoLoadFail.bind(this, resuestId));

    this._initializeStoryboard();
  }
  _onStoryboardInfoLoad(resuestId, rawData) {
    if (resuestId !== this._requestId) {return;} // video changed
    this._model.update(rawData);
    this.emit('update', this._model);

    this._container.classList.toggle('storyboardAvailable', this._model.isAvailable);
  }
  _onStoryboardInfoLoadFail(resuestId, err) {
    console.warn('onStoryboardInfoFail',this._watchId, err);
    if (resuestId !== this._requestId) {return;} // video changed
    this._model.update(null);
    this.emit('update', this._model);
    this._container.classList.remove('storyboardAvailable');
  }
  setCurrentTime(sec, forceUpdate) {
    if (this._view && this._model.isAvailable) {
      this._view.setCurrentTime(sec, forceUpdate);
    }
  }
  set currentTime(sec) {
    this.setCurrentTime(sec);
  }
  toggle() {
    if (!this._view) { return; }
    this._view.toggle();
    this._playerConfig.props.enableStoryboardBar = this._view.isEnable;
  }
}

//===END===
export {Storyboard, SeekBarThumbnail, StoryboardWorker};