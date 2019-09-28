import {Emitter} from '../../../lib/src/Emitter';
import {StoryboardInfoLoader} from '../../../lib/src/nico/StoryboardInfoLoader';
import {StoryboardView} from './StoryboardView';
import {StoryboardInfoModel} from './StoryboardInfoModel';
import {SeekBarThumbnail} from './SeekBarThumbnail';
import {StoryboardWorker} from './StoryboardWorker';
import {global} from '../../../../src/ZenzaWatchIndex';
import {nicoUtil} from '../../../lib/src/nico/nicoUtil';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';

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
    this.config = params.playerConfig;
    this.container = params.container;
    this.state = params.state;
    this.loader = params.loader || StoryboardInfoLoader;
    /** @type {StoryboardInfoModel} */
    this.model = new StoryboardInfoModel({});
    global.debug.storyboard = this;
  }
  _initializeStoryboard() {
    if (this.view) {
      return;
    }
    this.view = new StoryboardView({
      model: this.model,
      container: this.container,
      enable: this.config.props.enableStoryboardBar,
      state: this.state
    });
    this.emitResolve('dom-ready');
  }
  reset() {
    if (!this.model) { return; }
    this.state.isStoryboardAvailable = false;
    this.model.reset();
    this.emit('reset', this.model);
  }
  onVideoCanPlay(watchId, videoInfo) {
    if (!nicoUtil.isPremium()) {
      return;
    }
    if (!this.config.props.enableStoryboard) {
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
    this.model.update(rawData);
    this.emit('update', this.model);

    this.state.isStoryboardAvailable = true;
  }
  _onStoryboardInfoLoadFail(resuestId, err) {
    console.warn('onStoryboardInfoFail',this._watchId, err);
    if (resuestId !== this._requestId) {return;} // video changed
    this.model.update(null);
    this.emit('update', this.model);
    this.state.isStoryboardAvailable = false;
  }
  setCurrentTime(sec, forceUpdate) {
    if (this.view && this.model.isAvailable) {
      this.view.setCurrentTime(sec, forceUpdate);
    }
  }
  set currentTime(sec) {
    this.setCurrentTime(sec);
  }
  toggle() {
    if (!this.view) { return; }
    this.view.toggle();
    this.config.props.enableStoryboardBar = this.view.isEnable;
  }
}

//===END===
export {Storyboard, SeekBarThumbnail, StoryboardWorker};