import {util, PopupMessage} from './util';
import {Config} from './Config';

//===BEGIN===
const VideoSession = (() => {

  const SMILE_HEART_BEAT_INTERVAL_MS = 10 * 60 * 1000; // 10min
  const DMC_HEART_BEAT_INTERVAL_MS = 30 * 1000;      // 30sec

  const CHECK_PAUSE_INTERVAL = 30 * 1000;
  const SESSION_CLOSE_PAUSE_COUNT = 10;
  const SESSION_CLOSE_FAIL_COUNT = 3;
  const SESSION_CLOSE_TIME_MS = 12 * 60 * 1000; // 12min

  const VIDEO_QUALITY = {
    auto: /.*/,
    veryhigh: /_(1080p)$/,
    high: /_(720p)$/,
    mid: /_(540p|480p)$/,
    low: /_(360p)$/
  };

  class DmcPostData {
    constructor(dmcInfo, videoQuality) {
      this._dmcInfo = dmcInfo;
      this._videoQuality = videoQuality || 'auto';
    }

    toString() {
      let dmcInfo = this._dmcInfo;

      let videos = [];

      let reg = VIDEO_QUALITY[this._videoQuality] || VIDEO_QUALITY.auto;
      dmcInfo.videos.forEach(format => {
        if (reg.test(format)) {
          videos.push(format);
        }
      });
      dmcInfo.videos.forEach(format => {
        if (!reg.test(format)) {
          videos.push(format);
        }
      });

      let audios = [];
      dmcInfo.audios.forEach(format => {
        audios.push(format);
      });

      let request = {
        session: {
          client_info: {
            player_id: dmcInfo.playerId
          },
          content_auth: {
            auth_type: 'ht2',
            content_key_timeout: 600 * 1000,
            service_id: 'nicovideo',
            service_user_id: dmcInfo.serviceUserId,
            //max_content_count: 10,
          },
          content_id: dmcInfo.contentId,
          content_src_id_sets: [
            {
              content_src_ids: [
                {
                  src_id_to_mux: {
                    audio_src_ids: audios,
                    video_src_ids: videos
                  }
                }
              ]
            }
          ],
          content_type: 'movie',
          content_uri: '',
          keep_method: {
            heartbeat: {lifetime: dmcInfo.heartBeatLifeTimeMs}
          },
          priority: dmcInfo.priority,
          protocol: {
            name: 'http',
            parameters: {
              http_parameters: {
                //method: 'GET',
                parameters: {
                  http_output_download_parameters: {
                    use_ssl: 'no',
                    use_well_known_port: 'no',
                    transfer_preset: dmcInfo.transferPreset
  //                  file_extension: 'mp4'
                  }
                }
              }
            }
          },
          recipe_id: dmcInfo.recipeId,

          session_operation_auth: {
            session_operation_auth_by_signature: {
              signature: dmcInfo.signature,
              token: dmcInfo.token
            }
          },

          timing_constraint: 'unlimited'
        }
      };

      return JSON.stringify(request, null, 2);
    }
  }

  class VideoSession {

    static createInstance(params) {
      if (params.serverType === 'dmc') {
        return new DmcSession(params);
      } else {
        return new SmileSession(params);
      }
    }

    constructor(params) {
      this._videoInfo = params.videoInfo;
      this._videoWatchOptions = params.videoWatchOptions;

      this._isPlaying = params.isPlayingCallback || (() => {
      });
      this._pauseCount = 0;
      this._failCount = 0;
      this._lastResponse = '';
      this._videoQuality = params.videoQuality || 'auto';
      this._videoSessionInfo = {};
      this._isDeleted = false;
      this._isAbnormallyClosed = false;

      this._heartBeatTimer = null;

      this._useSSL = !!params.useSSL;
      this._useWellKnownPort = !!params.useWellKnownPort;

      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
    }

    connect() {
      this._createdAt = Date.now();
      return this._createSession(this._videoInfo);
    }

    enableHeartBeat() {
      this.disableHeartBeat();
      this._heartBeatTimer =
        setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
      this._pauseCheckTimer =
        setInterval(this._onPauseCheckInterval.bind(this), CHECK_PAUSE_INTERVAL);
    }

    changeHeartBeatInterval(interval) {
      if (this._heartBeatTimer) {
        clearInterval(this._heartBeatTimer);
      }
      this._heartBeatInterval = interval;
      this._heartBeatTimer =
        setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
    }

    disableHeartBeat() {
      if (this._heartBeatTimer) {
        clearInterval(this._heartBeatTimer);
      }
      if (this._pauseCheckTimer) {
        clearInterval(this._pauseCheckTimer);
      }
      this._heartBeatTimer = this._pauseCheckTimer = null;
    }

    _onHeartBeatInterval() {
      if (this._isClosed) {
        return;
      }
      this._heartBeat();
    }

    _onHeartBeatSuccess(/* result */) {
      //console.log('HeartBeat success');
    }

    _onHeartBeatFail() {
      this._failCount++;
      if (this._failCount >= SESSION_CLOSE_FAIL_COUNT) {
        this._isAbnormallyClosed = true;
        this.close();
      }
    }

    _onPauseCheckInterval() {
      if (this._isClosed) {
        return;
      }
      let isPlaying = this._isPlaying();
      if (!isPlaying) {
        this._pauseCount++;
      } else {
        this._pauseCount = 0;
      }

      // 一定時間停止が続いた and 生成から一定時間経過している場合は破棄
      if (this._pauseCount >= SESSION_CLOSE_PAUSE_COUNT &&
        Date.now() - this._createdAt >= SESSION_CLOSE_TIME_MS) {
        //PopupMessage.debug('VideoSession closed.');
        this.close();
      }
    }

    close() {
      this._isClosed = true;
      this.disableHeartBeat();
      return this._deleteSession();
    }

    get isDeleted() {
      return !!this._isDeleted;
    }

    get isDmc() {
      return this._serverType === 'dmc';
    }

    get isAbnormallyClosed() {
      return this._isAbnormallyClosed;
    }
  }

  class DmcSession extends VideoSession {
    constructor(params) {
      super(params);

      this._serverType = 'dmc';
      this._heartBeatInterval = DMC_HEART_BEAT_INTERVAL_MS;
      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
      this._useHLS = typeof params.useHLS === 'boolean' ? params.useHLS : true;
      this._lastUpdate = Date.now();
      this._heartbeatLifeTime = this._heartbeatInterval;
    }

    _createSession(videoInfo) {
      let dmcInfo = videoInfo.dmcInfo;
      console.time('create DMC session');
      const baseUrl = dmcInfo.urls.find(url => {
        return url.is_well_known_port === this._useWellKnownPort;
      }).url;
      return new Promise((resolve, reject) => {
        let url = `${baseUrl}?_format=json`;

        this._heartbeatLifeTime = dmcInfo.heartbeatLifeTime;
        const postData = new DmcPostData(dmcInfo, this._videoQuality, {
          useHLS: this.useHLS,
          useSSL: url.startsWith('https://'),
          useWellKnownPort: this._useWellKnownPort
        });
        //console.log('dmc post', url); console.log(postData.toString());

        util.fetch(url, {
          method: 'post',
          timeout: 10000,
          dataType: 'text',
          body: postData.toString()
        }).then(res => {
          return res.json();
        })
          .then(json => {
            const data = json.data || {}, session = data.session || {};
            let url = session.content_uri;
            let sessionId = session.id;
            let content_src_id_sets = session.content_src_id_sets;
            let videoFormat =
              content_src_id_sets[0].content_src_ids[0].src_id_to_mux.video_src_ids[0];
            let audioFormat =
              content_src_id_sets[0].content_src_ids[0].src_id_to_mux.audio_src_ids[0];

            this._heartBeatUrl =
              `${baseUrl}/${sessionId}?_format=json&_method=PUT`;
            this._deleteSessionUrl =
              `${baseUrl}/${sessionId}?_format=json&_method=DELETE`;

            this._lastResponse = data;

            this._lastUpdate = Date.now();
            this._videoSessionInfo = {
              type: 'dmc',
              url: url,
              sessionId: sessionId,
              videoFormat: videoFormat,
              audioFormat: audioFormat,
              heartBeatUrl: this._heartBeatUrl,
              deleteSessionUrl: this._deleteSessionUrl,
              lastResponse: json
            };
            this.enableHeartBeat();
            console.timeEnd('create DMC session');
            resolve(this._videoSessionInfo);
          }).catch(err => {
          console.error('create api fail', err);
          reject(err);
        });
      });
    }

    _heartBeat() {
      let url = this._videoSessionInfo.heartBeatUrl;
      console.log('HeartBeat', url);
      util.fetch(url, {
        method: 'post',
        dataType: 'text',
        timeout: 10000,
        body: JSON.stringify(this._lastResponse)
      }).then(res => {
        return res.json();
      })
        .then(this._onHeartBeatSuccess)
        .catch(this._onHeartBeatFail);
    }

    _deleteSession() {
      if (this._isDeleted) {
        return Promise.resolve();
      }
      this._isDeleted = true;
      let url = this._videoSessionInfo.deleteSessionUrl;
      // video側はsessionの概念を持たないため、動画クローズと同時にsessionを消すと、
      // たまに微妙な時間差でvideoにネットワークエラーが出る。
      // その緩和のため、フラグ上はdeletedを立てるけど実際のdeleteは遅延させる
      //
      // こっちからdeleteしなくてもいずれsessionは勝手に消えるので、
      // 失敗は気にしなくていい
      return new Promise(res => {
        setTimeout(res, 3000);
      }).then(() => {
        return util.fetch(url, {
          method: 'post',
          dataType: 'text',
          timeout: 10000,
          body: JSON.stringify(this._lastResponse)
        });
      }).then(res => res.text())
        .then(() => {
          console.log('delete success');
        })
        .catch(err => {
          console.error('delete fail', err);
        });
    }

    _onHeartBeatSuccess(result) {
      let json = result;
      this._lastResponse = json.data;
      this._lastUpdate = Date.now();
    }

    get isDeleted() {
      return !!this._isDeleted || (Date.now() - this._lastUpdate) > this._heartbeatLifeTime * 1.2;
    }
  }

  class SmileSession extends VideoSession {
    constructor(params) {
      super(params);
      this._serverType = 'smile';
      this._heartBeatInterval = SMILE_HEART_BEAT_INTERVAL_MS;
      this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
      this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
      this._lastUpdate = Date.now();
    }

    _createSession(videoInfo) {
      this.enableHeartBeat();
      return new Promise((resolve) => {
        let videoUrl = videoInfo.videoUrl;
        return resolve(videoUrl);
      });
    }

    _heartBeat() {
      let url = this._videoInfo.watchUrl;
      let query = [
        'mode=normal',
        'playlist_token=' + this._videoInfo.playlistToken,
        'continue_watching=1'
      ];
      if (this._videoInfo.isEconomy) {
        query.push('eco=1');
      }

      if (query.length > 0) {
        url += '?' + query.join('&');
      }

      util.fetch(url, {
        timeout: 10000,
        credentials: 'include'
      }).then(res => {
        return res.json();
      })
        .then(this._onHeartBeatSuccess)
        .catch(this._onHeartBeatFail);
    }

    _deleteSession() {
      if (this._isDeleted) {
        return Promise.resolve();
      }
      this._isDeleted = true;
      return Promise.resolve();
    }

    _onHeartBeatSuccess(result) {
      this._lastResponse = result;
      if (result.status !== 'ok') {
        return this._onHeartBeatFail();
      }

      this._lastUpdate = Date.now();
      if (result && result.flashvars && result.flashvars.watchAuthKey) {
        this._videoInfo.watchAuthKey = result.flashvars.watchAuthKey;
      }
    }

    // smileには明確なセッション終了の概念がないため、
    // cookieの有効期限が切れていそうな時間が経っているかどうかで判断する
    get isDeleted() {
      return this._isDeleted || (Date.now() - this._lastUpdate > 10 * 60 * 1000);
    }
  }

  return VideoSession;
})();


//===END===

export {
  VideoSession
};

