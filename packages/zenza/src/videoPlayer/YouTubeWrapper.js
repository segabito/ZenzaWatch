// import * as _ from 'lodash';
import {global} from '../../../../src/ZenzaWatchIndex';
import {Emitter} from '../../../lib/src/Emitter';
import {textUtil} from '../../../lib/src/text/textUtil';
//===BEGIN===

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

    async setSrc(url, startSeconds = 0) {
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
        return this._initPlayer(this._videoId, startSeconds);//.then(({player}) => {
          // YouTube APIにはプレイリストのループしか存在しないため、
          // プレイリストにも同じ動画を入れる
          // player.loadPlaylist({list: [this._videoId]});
        // });
      }

      if (!url) {
        player.stopVideo();
        return;
      }

      player.loadVideoById({
        videoId: this._videoId,
        startSeconds: startSeconds
      });
      player.loadPlaylist({list: [this._videoId]});
    }

    set src(v) {
      this.setSrc(v);
    }

    get src() {
      return this._src;
    }

    _parseVideoId(url) {
      const videoId = (() => {
        const a = textUtil.parseUrl(url);
        if (a.hostname === 'youtu.be') {
          return a.pathname.substring(1);
        } else {
          return textUtil.parseQuery(a.search).v;
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
      const a = textUtil.parseUrl(url);
      return a.search.startsWith('?') ? textUtil.parseQuery(a.search) : {};
    }

    async _initPlayer(videoId, startSeconds = 0) {
      if (this._player) {
        return {player: this._player};
      }

      const YT = await this._initYT();
      const {player} = await new Promise(resolve => {
        this._player = new YT.Player(
          this._parentNode, {
            videoId,
            events: {
              onReady: () => resolve({player: this._player}),
              onStateChange: this._onPlayerStateChange.bind(this),
              onPlaybackQualityChange: e => window.console.info('video quality: ', e.data),
              onError: e => this.emit('error', e)
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
              showInfo: 1
            }
          });
      });
      this._onPlayerReady();
    }

    async _initYT() {
      if (window.YT) {
        return window.YT;
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
        // tag.onload = () => resolve(window.YT);
        document.head.append(tag);
      });
    }

    _onPlayerReady() {
      this.emitAsync('loadedMetaData');
      // this.emitAsync('canplay');
    }

    _onPlayerStateChange(e) {
      const state = e.data;
      this.playerState = state;
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

    get paused() {
      return window.YT ?
        this.playerState !== window.YT.PlayerState.PLAYING : true;
    }

    selectBestQuality() {
      const levels = this._player.getAvailableQualityLevels();
      const best = levels[0];
      this._player.pauseVideo();
      this._player.setPlaybackQuality(best);
      this._player.playVideo();
      window.console.info('bestQuality', {levels, best, current: this._player.getPlaybackQuality()});
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

global.debug.YouTubeWrapper = YouTubeWrapper;

//===END===

export {
  YouTubeWrapper
};

