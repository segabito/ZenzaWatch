import {objUtil} from '../infra/objUtil';
import {sleep} from '../infra/sleep';
//===BEGIN===

/*
 * アニメーション基準用の時間ゲッターとしてはperformance.now()よりWeb Animations APIのほうが優れている。
 */
class MediaTimeline {

  constructor(options = {}) {
    this.buffer = new (MediaTimeline.isSharable ? self.SharedArrayBuffer : ArrayBuffer)(Float32Array.BYTES_PER_ELEMENT * 100);
    this.fview = new Float32Array(this.buffer);
    this.iview = new Int32Array(this.buffer);
    const span = document.createElement('span');
    this.anime = span.animate ?
      span.animate([], {duration: 3 * 24 * 60 * 60 * 1000}) :
      {currentTime: 0, playbackRate: 1, paused: true};
    this.isWAAvailable = !!span.animate;
    this.interval = options.interval || 200;
    this.onTimer = this.onTimer.bind(this);
    this.onRaf = this.onRaf.bind(this);
    this.eventMap = this.initEventMap();
    this._isBusy = false;
    if (options.media) {
      this.attach(options.media);
    }
  }
  initEventMap() {
    const map = {
      'pause': e => {
        // console.nicoru('paused', this.paused, this.media.paused, this.currentTime, this.media.currentTime);
        this.paused = true;
        this.currentTime = this.media.currentTime;
      },
      'play': e => {
        // console.nicoru('play');
        this.currentTime = this.media.currentTime;
        this.paused = false;
      },
      'seeked': e => {
        // console.nicoru('seeked');
        this.currentTime = this.media.currentTime;
      },
      'ratechange': e => {
        // console.nicoru('ratechange');
        this.playbackRate = this.media.playbackRate;
        this.currentTime = this.media.currentTime;
      }
    };
    return objUtil.toMap(map);
  }
  attach(media) {
    if (this.media) {
      this.detach();
    }
    this.media = media;
    this.currentTime  = media.currentTime;
    this.playbackRate = media.playbackRate;
    this.duration     = media.duration;
    this.paused       = media.paused;
    this.timer = setInterval(this.onTimer, this.interval);
    for (const [eventName, handler] of this.eventMap) {
      media.addEventListener(eventName, handler, {passive: true});
    }
  }
  detach() {
    const media = this.media;
    for (const [eventName, handler] of this.eventMap) {
      media.removeEventListener(eventName, handler);
    }
    this.media = null;
    clearInterval(this.timer);
  }
  onTimer() {
    const media = this.media;
    const ac = this.anime.currentTime / 1000;
    const mc = media.currentTime;
    const diffMs = Math.abs(mc - ac) * 1000;
    if (!this.isWAAvailable || diffMs >= this.interval * 3 || media.paused !== this.paused) {
      // console.warn('fix diff', diff);
      this.currentTime  = mc;
      this.playbackRate = media.playbackRate;
      this.paused       = media.paused;
    }
  }
  onRaf() {
    if (this._isBusy) {
      this.raf = null;
      return;
    }
    this._isBusy = true;
    this.currentTime = Math.min(this.anime.currentTime / 1000, this.media.duration);
    this.timestamp = Math.round(performance.now() * 1000);
    if (!this.media.paused) {
      this.callRaf();
      // sleep.resolve.then(this.callRaf);
    } else {
      this.raf = null;
      this._isBusy = false;
    }
  }
  async callRaf() {
    await sleep.resolve;
    this.raf = requestAnimationFrame(this.onRaf);
    this._isBusy = false;
  }
  get timestamp() {
    // if (MediaTimeline.isSharable) {
    //   return Atomics.load(this.iview, MediaTimeline.MAP.timestamp);
    // }
    return this.iview[MediaTimeline.MAP.timestamp];
  }
  set timestamp(v) {
    if (this.iview[MediaTimeline.MAP.timestamp] === v) { return; }
    if (MediaTimeline.isSharable) {
      Atomics.store(this.iview, MediaTimeline.MAP.timestamp, v);
      Atomics.notify(this.iview, MediaTimeline.MAP.timestamp);
    } else {
      this.iview[MediaTimeline.MAP.timestamp] = v;
    }
  }
  get currentTime() {
    return this.fview[MediaTimeline.MAP.currentTime];
  }
  set currentTime(v) {
    v = isNaN(v) ? 0 : v;
    if (this.fview[MediaTimeline.MAP.currentTime] !== v) {
      this.fview[MediaTimeline.MAP.currentTime] = v;
    }
    const ac = this.anime.currentTime / 1000;
    const diffMs = Math.abs(ac - v) * 1000;
    if (v === 0 || diffMs > 1000) {
      this.anime.currentTime = v * 1000;
    }
  }
  get duration() {
    return this.fview[MediaTimeline.MAP.duration];
  }
  set duration(v) {
    this.fview[MediaTimeline.MAP.duration] = v;
  }
  get playbackRate() {
    return this.fview[MediaTimeline.MAP.playbackRate];
  }
  set playbackRate(v) {
    this.fview[MediaTimeline.MAP.playbackRate] = v;
    (this.anime.playbackRate !== v) && (this.anime.playbackRate = v);
  }
  get paused() {
    return this.iview[MediaTimeline.MAP.paused] !== 0;
  }
  set paused(v) {
    this.iview[MediaTimeline.MAP.paused] = v ? 1 : 0;
    if (!this.isWAAvailable) { return; }
    if (v) {
      this.anime.pause();
      this.raf = cancelAnimationFrame(this.raf);
      this.timestamp = 0;
    } else {
      this.anime.play();
      if (!this.raf) {
        this.raf = requestAnimationFrame(this.onRaf);
      }
    }
  }
}
MediaTimeline.MAP = {
  currentTime: 0,
  duration: 1,
  playbackRate: 2,
  paused: 3,
  timestamp: 10
};
MediaTimeline.isSharable = ('SharedArrayBuffer' in self) && ('animate' in document.documentElement);
MediaTimeline.register = function(name = 'main', media = null) {
  if (!this.map.has(name)) {
    const mt = new MediaTimeline({media});
    this.map.set(name, mt);
    return mt;
  }
  const mt = this.map.get(name);
  media && mt.attach(media);
  return mt;
}.bind({map: new Map()});

MediaTimeline.get = name => MediaTimeline.register(name);

//===END===

export {MediaTimeline};