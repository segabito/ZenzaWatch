import {Emitter} from './baselib';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {CONSTANT} from './constant';

//===BEGIN===

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

//===END===

export {
  BaseState,
  PlayerState
}