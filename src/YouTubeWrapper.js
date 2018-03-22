import * as _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {util, AsyncEmitter} from './util';

//===BEGIN===

const {YouTubeWrapper} = (() => {

  const STATE_PLAYING = 1;

  class YouTubeWrapper extends AsyncEmitter {
    constructor({parentNode, autoplay = true, volume = 0.3, playbackRate = 1, loop = false}) {
      super();
      this._isInitialized = false;
      this._parentNode = parentNode;
      this._autoplay = autoplay;
      this._volume = volume;
      this._playbackRate = playbackRate;
      this._loop = loop;

      this._isSeeking = false;
      this._seekTime = 0;

      this._onSeekEnd = _.debounce(this._onSeekEnd.bind(this), 500);
    }

    setSrc(url, startSeconds = 0) {
      this._src = url;
      this._videoId = this._parseVideoId(url);
      this._canPlay = false;
      this._isSeeking = false;
      this._seekTime = 0;
      const player = this._player;
      const isFirst = !!player ? false : true;
      if (isFirst && !url) {
        return Promise.resolve();
      }
      if (isFirst) {
        return this._initPlayer(this._videoId, startSeconds).then(({player}) => {
          // YouTube APIにはプレイリストのループしか存在しないため、
          // プレイリストにも同じ動画を入れる
          // player.loadPlaylist({list: [this._videoId]});
        });
      }

      if (!url) {
        player.stopVideo();
        return Promise.resolve();
      }

      player.loadVideoById({
        videoId: this._videoId,
        startSeconds: startSeconds
      });
      player.loadPlaylist({list: [this._videoId]});
      return Promise.resolve();
    }

    set src(v) {
      this.setSrc(v);
    }

    get src() {
      return this._src;
    }

    _parseVideoId(url) {
      let videoId = (() => {
        const a = document.createElement('a');
        a.href = url;
        if (a.hostname === 'youtu.be') {
          return a.pathname.substring(1);
        } else {
          const query = util.parseQuery(a.search.substring(1));
          return query.v;
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

    _initPlayer(videoId, startSeconds = 0) {
      if (this._player) {
        return Promise.resolve({player: this._player});
      }

      let resolved = false;
      return this._initYT().then((YT) => {
        return new Promise(resolve => {
          this._player = new YT.Player(
            this._parentNode, {
              videoId,
              events: {
                onReady: () => {
                  if (!resolved) {
                    resolved = true;
                    resolve({player: this._player});
                  }
                  this._onPlayerReady();
                },
                onStateChange: this._onPlayerStateChange.bind(this),
                onPlaybackQualityChange: e => {
                  window.console.info('video quality: ', e.data);
                },
                onError: (e) => {
                  this.emit('error', e);
                }
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
                showInfo: 1,
              }
            });
        });
      });
    }

    _initYT() {
      if (window.YT) {
        return Promise.resolve(window.YT);
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
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      });
    }

    _onPlayerReady() {
      this.emitAsync('loadedMetaData');
      this.emitAsync('canplay');
    }

    _onPlayerStateChange(e) {
      const state = e.data;
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
            this.emitAsync('loadedMetaData');
            this.emit('canplay');
          }
          this.emit('play');
          this.emit('playing');
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

    _onSeekEnd() {
      this._isSeeking = false;
      this._player.seekTo(this._seekTime);
    }

    set currentTime(v) {
      this._isSeeking = true;
      this._seekTime = Math.max(0, Math.min(v, this.duration));
      this._onSeekEnd();
    }

    get currentTime() {
      const now = performance.now();
      if (this._isSeeking) {
        this._lastTime = now;
        return this._seekTime;
      }
      const state = this._player.getPlayerState();
      const currentTime = this._player.getCurrentTime();

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
      return this._player.getDuration();
    }

    set mute(v) {
      if (v) {
        this._player.mute();
      } else {
        this._player.unMute();
      }
      this._mute = !!v;
    }

    get mute() {
      return this._player.mute;
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

ZenzaWatch.debug.YouTubeWrapper = YouTubeWrapper;

//===END===

export {
  YouTubeWrapper
};

