import {workerUtil} from '../infra/workerUtil';
import {StoryboardCacheDb} from './StoryboardCacheDb';
//===BEGIN===

const VideoSessionWorker = (() => {
  const func = function(self) {
    const SMILE_HEART_BEAT_INTERVAL_MS = 10 * 60 * 1000; // 10min
    const DMC_HEART_BEAT_INTERVAL_MS = 30 * 1000;      // 30sec

    const SESSION_CLOSE_FAIL_COUNT = 3;

    const VIDEO_QUALITY = {
      auto: /.*/,
      veryhigh: /_(1080p)$/,
      high: /_(720p)$/,
      mid: /_(540p|480p)$/,
      low: /_(360p)$/
    };

    const util = {
      fetch(url, params = {}) {
        if (!location.origin.endsWith('.nicovideo.jp')) {
          return self.xFetch(url, params);
        }
        const racers = [];
        let timer;

        const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
        if (timeout > 0) {
          racers.push(new Promise((resolve, reject) =>
            timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
          );
        }

        const controller = AbortController ? (new AbortController()) : null;
        if (controller) {
          params.signal = controller.signal;
        }
        racers.push(fetch(url, params));
        return Promise.race(racers).catch(err => {
          if (err.name === 'timeout') {
            console.warn('request timeout', url, params);
            if (controller) {
              controller.abort();
            }
          }
          return Promise.reject(err.message || err);
        }).finally(() => timer = null);
      }
    };

    class DmcPostData {
      constructor(dmcInfo, videoQuality, {useHLS = true, useSSL = false}) {
        this._dmcInfo = dmcInfo;
        this._videoQuality = videoQuality || 'auto';
        this._useHLS = useHLS;
        this._useSSL = useSSL;
        this._useWellKnownPort = true;
      }

      toString() {
        let dmcInfo = this._dmcInfo;

        let videos = [];
        let availableVideos =
          dmcInfo.quality.videos.filter(v => v.available)
            .sort((a, b) => b.level_index - a.level_index);
        let reg = VIDEO_QUALITY[this._videoQuality] || VIDEO_QUALITY.auto;
        if (reg === VIDEO_QUALITY.auto) {
          videos = availableVideos.map(v => v.id);
        } else {
          availableVideos.forEach(format => {
            if (reg.test(format.id)) {
              videos.push(format.id);
            }
          });
          if (videos.length < 1) {
            videos[0] = availableVideos[0].id;
          }
        }

        let audios = [dmcInfo.audios[0]];

        let contentSrcIdSets =
          (this._useHLS && reg === VIDEO_QUALITY.auto) ?
            this._buildAbrContentSrcIdSets(videos, audios) :
            this._buildContentSrcIdSets(videos, audios);

        let http_parameters = {};
        let parameters = {
          use_ssl: this._useSSL ? 'yes' : 'no',
          use_well_known_port: this._useWellKnownPort ? 'yes' : 'no',
          transfer_preset: dmcInfo.transferPreset
        };
        if (this._useHLS) {
          parameters.segment_duration = 6000;//Config.getValue('video.hls.segmentDuration');
          if (dmcInfo.encryption){
            parameters.encryption = dmcInfo.encryption;
          }
        } else if (!dmcInfo.protocols.includes('http')) {
          throw new Error('HLSに未対応');
        }
        http_parameters.parameters = this._useHLS ?
          {hls_parameters: parameters} :
          {http_output_download_parameters: parameters};

        const request = {
          session: {
            client_info: {
              player_id: dmcInfo.playerId
            },
            content_auth: {
              auth_type: dmcInfo.authTypes[this._useHLS ? 'hls' : 'http'] || 'ht2',
              content_key_timeout: 600 * 1000,
              service_id: 'nicovideo',
              service_user_id: dmcInfo.serviceUserId,
              //max_content_count: 10,
            },
            content_id: dmcInfo.contentId,
            content_src_id_sets: contentSrcIdSets,
            content_type: 'movie',
            content_uri: '',
            keep_method: {
              heartbeat: {lifetime: dmcInfo.heartBeatLifeTimeMs}
            },
            priority: dmcInfo.priority,
            protocol: {
              name: 'http',
              parameters: {http_parameters}
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

      _buildContentSrcIdSets(videos, audios) {
        return [
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
        ];
      }

      _buildAbrContentSrcIdSets(videos, audios) {
        const v = videos.concat();
        const contentSrcIds = [];
        while (v.length > 0) {
          contentSrcIds.push({
            src_id_to_mux: {
              audio_src_ids: [audios[0]],
              video_src_ids: v.concat()
            }
          });
          v.shift();
        }
        return [{content_src_ids: contentSrcIds}];
      }
    }


    class VideoSession {

      static create(params) {
        if (params.serverType === 'dmc') {
          return new DmcSession(params);
        } else {
          return new SmileSession(params);
        }
      }

      constructor(params) {
        this._videoInfo = params.videoInfo;
        this._dmcInfo = params.dmcInfo;

        this._isPlaying = () => true;
        this._pauseCount = 0;
        this._failCount = 0;
        this._lastResponse = '';
        this._videoQuality = params.videoQuality || 'auto';
        this._videoSessionInfo = {};
        this._isDeleted = false;
        this._isAbnormallyClosed = false;

        this._heartBeatTimer = null;

        this._useSSL = !!params.useSSL;
        this._useWellKnownPort = true;

        this._onHeartBeatSuccess = this._onHeartBeatSuccess.bind(this);
        this._onHeartBeatFail = this._onHeartBeatFail.bind(this);
      }

      connect() {
        this._createdAt = Date.now();
        return this._createSession(this._videoInfo, this._dmcInfo);
      }

      enableHeartBeat() {
        this.disableHeartBeat();
        this._heartBeatTimer =
          setInterval(this._onHeartBeatInterval.bind(this), this._heartBeatInterval);
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
        this._heartBeatTimer = null;
      }

      _onHeartBeatInterval() {
        if (this._isClosed) {
          return;
        }
        this._heartBeat();
      }

      _onHeartBeatSuccess() {}

      _onHeartBeatFail() {
        this._failCount++;
        if (this._failCount >= SESSION_CLOSE_FAIL_COUNT) {
          this._isAbnormallyClosed = true;
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

      _createSession(videoInfo, dmcInfo) {
        console.time('create DMC session');
        const baseUrl = (dmcInfo.urls.find(url => url.is_well_known_port === this._useWellKnownPort) || dmcInfo.urls[0]).url;
        return new Promise((resolve, reject) => {
          const url = `${baseUrl}?_format=json`;

          this._heartbeatLifeTime = dmcInfo.heartbeatLifeTime;
          const postData = new DmcPostData(dmcInfo, this._videoQuality, {
            useHLS: this.useHLS,
            useSSL: url.startsWith('https://'),
            useWellKnownPort: true
          });

          util.fetch(url, {
            method: 'post',
            timeout: 10000,
            dataType: 'text',
            body: postData.toString()
          }).then(res => res.json())
            .then(json => {
              const data = json.data || {}, session = data.session || {};
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
                url: session.content_uri,
                sessionId,
                videoFormat,
                audioFormat,
                heartBeatUrl: this._heartBeatUrl,
                deleteSessionUrl: this._deleteSessionUrl,
                lastResponse: json
              };
              this.enableHeartBeat();
              console.timeEnd('create DMC session');
              resolve(this._videoSessionInfo);
            }).catch(err => {
            console.error('create api fail', err);
            reject(err.message || err);
          });
        });
      }

      get useHLS() {
        return this._useHLS &&
          this._dmcInfo.protocols.includes('hls');
      }

      _heartBeat() {
        let url = this._videoSessionInfo.heartBeatUrl;
        util.fetch(url, {
          method: 'post',
          dataType: 'text',
          timeout: 10000,
          body: JSON.stringify(this._lastResponse)
        }).then(res => res.json())
          .then(this._onHeartBeatSuccess)
          .catch(this._onHeartBeatFail);
      }

      _deleteSession() {
        if (this._isDeleted) {
          return Promise.resolve();
        }
        this._isDeleted = true;
        let url = this._videoSessionInfo.deleteSessionUrl;
        return new Promise(res => setTimeout(res, 3000)).then(() => {
          return util.fetch(url, {
            method: 'post',
            dataType: 'text',
            timeout: 10000,
            body: JSON.stringify(this._lastResponse)
          });
        }).catch(err => console.error('delete fail', err));
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
        return Promise.resolve(videoInfo.videoUrl);
      }

      _heartBeat() {
         let url = this._videoInfo.watchUrl;
         let query = [
           'mode=pc_html5',
           'playlist_token=' + this._videoInfo.playlistToken,
           'continue_watching=1',
           'watch_harmful=2'
         ];
         if (this._videoInfo.isEconomy) {
           query.push(this._videoInfo.isEconomy ? 'eco=1' : 'eco=0');
         }

         if (query.length > 0) {
           url += '?' + query.join('&');
         }

         util.fetch(url, {
           timeout: 10000,
           credentials: 'include'
         }).then(res => res.json())
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


    const DmcStoryboardInfoLoader = (() => {
      const parseStoryboard = sb => {
        const result = {
          id: 0,
          urls: [],
          quality: sb.quality,
          thumbnail: {
            width: sb.thumbnail_width,
            height: sb.thumbnail_height,
            number: null,
            interval: sb.interval
          },
          board: {
            rows: sb.rows,
            cols: sb.columns,
            number: sb.images.length
          }
        };
        sb.images.forEach(image => result.urls.push(image.uri));

        return result;
      };


      const parseMeta = meta => {
        const result = {
          format: 'dmc',
          status: meta.meta.message,
          url: null,
          movieId: null,
          storyboard: []
        };

        meta.data.storyboards.forEach(sb => {
          result.storyboard.unshift(parseStoryboard(sb));
        });

        // 画質の良い順にソート
        result.storyboard.sort((a, b) => {
          if (a.quality < b.quality) {
            return 1;
          }
          if (a.quality > b.quality) {
            return -1;
          }
          return 0;
        });

        return result;
      };


      const load = url => {
        return util.fetch(url, {credentials: 'include'}).then(res => res.json())
          .then(info => {
            if (!info.meta || !info.meta.message || info.meta.message !== 'ok') {
              return Promise.reject('storyboard request fail');
            }
            return parseMeta(info);
          });
      };

      return {
        load,
        _parseMeta: parseMeta,
        _parseStoryboard: parseStoryboard
      };
    })();

    class StoryboardSession {
      constructor(info) {
        this._info = info;
        this._url = info.urls[0].url;
      }

      create() {
        const url = `${this._url}?_format=json`;
        const body = this._createRequestString(this._info);
        return util.fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body
        }).then(res => res.json()).catch(err => {
          console.error('create dmc session fail', err);
          return Promise.reject('create dmc session fail');
        });
      }

      _createRequestString(info) {
        if (!info) {
          info = this._info;
        }

        // 階層が深くて目が疲れた
        const request = {
          session: {
            client_info: {
              player_id: info.player_id
            },
            content_auth: {
              auth_type: info.auth_types.storyboard,
              content_key_timeout: info.content_key_timeout,
              service_id: 'nicovideo',
              service_user_id: info.service_user_id
            },
            content_id: info.content_id,
            content_src_id_sets: [{
              content_src_ids: []
            }],
            content_type: 'video',
            content_uri: '',
            keep_method: {
              heartbeat: {
                lifetime: info.heartbeat_lifetime
              }
            },
            priority: info.priority,
            protocol: {
              name: 'http',
              parameters: {
                http_parameters: {
                  parameters: {
                    storyboard_download_parameters: {
                      use_well_known_port: info.urls[0].is_well_known_port ? 'yes' : 'no',
                      use_ssl: info.urls[0].is_ssl ? 'yes' : 'no'
                    }
                  }
                }
              }
            },
            recipe_id: info.recipe_id,
            session_operation_auth: {
              session_operation_auth_by_signature: {
                signature: info.signature,
                token: info.token
              }
            },
            timing_constraint: 'unlimited'
          }
        };

        (info.videos || []).forEach(video => {
          request.session.content_src_id_sets[0].content_src_ids.push(video);
        });

        //console.log('storyboard session request', JSON.stringify(request, null, ' '));
        return JSON.stringify(request);
      }
    }




    const SESSION_ID = Symbol('SESSION_ID');
    const getSessionId = function() { return `session_${this.id++}`; }.bind({id: 0});

    let current = null;
    const create = async ({videoInfo, dmcInfo, videoQuality, serverType, useHLS}) => {
      if (current) {
        current.close();
        current = null;
      }
      current = await VideoSession.create({
        videoInfo, dmcInfo, videoQuality, serverType, useHLS});
      const sessionId = getSessionId();
      current[SESSION_ID] = sessionId;

      // console.log('create', sessionId, current[SESSION_ID]);
      return {
        isDmc: current.isDmc,
        sessionId
      };
    };

    const connect = async () => {
      // console.log('connect', sessionId, current[SESSION_ID]);
      return current.connect();
    };

    const getState = () => {
      if (!current) {
        return {};
      }
      // console.log('getState', sessionId, current[SESSION_ID]);
      return {
        isDmc: current.isDmc,
        isDeleted: current.isDeleted,
        isAbnormallyClosed: current.isAbnormallyClosed,
        sessionId: current[SESSION_ID]
      };
    };

    const close = () => {
      // current && console.log('close', sessionId, current[SESSION_ID]);
      current && current.close();
      current = null;
    };

    const storyboard = async ({info, duration}) => {
      const result = await new StoryboardSession(info).create();
      if (!result || !result.data || !result.data.session || !result.data.session.content_uri) {
        return Promise.reject('DMC storyboard api not exist');
      }
      const uri = result.data.session.content_uri;
      const sbInfo = await DmcStoryboardInfoLoader.load(uri);
      for (let board of sbInfo.storyboard) {
        board.thumbnail.number = Math.floor(duration * 1000 / board.thumbnail.interval);
        board.urls = await Promise.all(
          board.urls.map(url => fetch(url).then(r => r.arrayBuffer()).catch(() => url)
        ));
        break; // 二番目以降は低画質
      }
      sbInfo.duration = duration;
      return sbInfo;
    };

    self.onmessage = async ({command, params}) => {
      switch (command) {
        case 'create':
          return create(params);
        case 'connect':
          return await connect();
        case 'getState':
          return getState();
        case 'close':
          return close();
        case 'storyboard':
          return await storyboard(params);
      }
    };
  };

  let worker;
  const initWorker = () => {
    if (worker) { return worker; }
    worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'VideoSessionWorker'});
  };
  const create = async ({videoInfo, videoQuality, serverType, useHLS}) => {
    await initWorker();
    const params = {
      videoInfo: videoInfo.getData(),
      dmcInfo: videoInfo.dmcInfo ? videoInfo.dmcInfo.getData() : null,
      videoQuality,
      serverType,
      useHLS
    };
    const result = await worker.post({command: 'create', params});
    const sessionId = result.sessionId;
    return Object.assign(result, {
      connect: () => worker.post({command: 'connect', params: {sessionId}}),
      getState: () => worker.post({command: 'getState', params: {sessionId}}),
      close: () => worker.post({command: 'close', params: {sessionId}})
    });
  };

  const storyboard = async (watchId, sbSessionInfo, duration) => {
    const cache = await StoryboardCacheDb.get(watchId);
    if (cache) {
      return cache;
    }
    worker = worker || workerUtil.createCrossMessageWorker(func);
    const params = {info: sbSessionInfo, duration};
    const sbInfo = await worker.post({command: 'storyboard', params});
    sbInfo.watchId = watchId;
    StoryboardCacheDb.put(watchId, sbInfo);
    return sbInfo;
  };

  return {initWorker, create, storyboard};
})();

//===END===

export {VideoSessionWorker};