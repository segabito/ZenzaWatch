import * as _ from 'lodash';
import {ZenzaWatch} from '../ZenzaWatchIndex';
import {util, Config, PopupMessage, WindowMessageEmitter} from '../util';
import {browser} from '../browser';
const {location, localStorage, sessionStorage} = browser.window;
import {Emitter} from '../baselib';
import {PRODUCT} from '../ZenzaWatchIndex';

const TOKEN = Math.random();

//===BEGIN===
const {
  VideoInfoLoader,
  ThumbInfoLoader,
  MylistApiLoader,
  UploadedVideoApiLoader,
  CacheStorage,
  CrossDomainGate,
  IchibaLoader,
  UaaLoader,
  PlaybackPosition,
  NicoVideoApi,
  NicoRssLoader,
  RecommendAPILoader,
  NVWatchCaller
} = (() => {

  let CacheStorage = (() => {
    const PREFIX = `${PRODUCT}_cache_`;

    class CacheStorage {
      constructor(storage) {
        this._storage = storage;
        this.gc = _.debounce(this.gc.bind(this), 100);
      }

      gc(now = NaN) {
        const storage = this._storage;
        now = isNaN(now) ? Date.now() : now;
        Object.keys(storage).forEach(key => {
          if (key.indexOf(PREFIX) === 0) {
            let item;
            try {
              item = JSON.parse(this._storage[key]);
            } catch(e) {
              storage.removeItem(key);
            }
            if (item.expiredAt === '' || item.expiredAt > now) {
              return;
            }
            storage.removeItem(key);
          }
        });
      }

      setItem(key, data, expireTime) {
        key = PREFIX + key;
        const expiredAt =
          typeof expireTime === 'number' ? (Date.now() + expireTime) : '';

        const cacheData = {
          data: data,
          type: typeof data,
          expiredAt: expiredAt
        };

        try {
          this._storage[key] = JSON.stringify(cacheData);
          this.gc();
        } catch (e) {
          if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            this.gc(0);
          }
        }
      }

      getItem(key) {
        key = PREFIX + key;
        if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
          return null;
        }
        let item = null;
        try {
          item = JSON.parse(this._storage[key]);
        } catch(e) {
          this._storage.removeItem(key);
          return null;
        }

        if (item.expiredAt === '' || item.expiredAt > Date.now()) {
          return item.data;
        }
        return null;
      }

      removeItem(key) {
        key = PREFIX + key;
        if (this._storage.hasOwnProperty(key) || this._storage[key] !== undefined) {
          this._storage.removeItem(key);
        }
      }

      clear() {
        const storage = this._storage;
        Object.keys(storage).forEach((v) => {
          if (v.indexOf(PREFIX) === 0) {
            storage.removeItem(v);
          }
        });
      }
    }

    return CacheStorage;
  })();
  if (ZenzaWatch) {
    ZenzaWatch.api.CacheStorage = CacheStorage;
    ZenzaWatch.debug.localCache = new CacheStorage(localStorage);
  }


  const VideoInfoLoader = (function () {
    const cacheStorage = new CacheStorage(sessionStorage);

    //JSON.parse(decodeURIComponent(JSON.parse($('#watchAPIDataContainer').text()).flashvars.dmcInfo))
    const parseFromGinza = function (dom) {
      try {
        let watchApiData = JSON.parse(dom.querySelector('#watchAPIDataContainer').textContent);
        let videoId = watchApiData.videoDetail.id;
        let hasLargeThumbnail = util.hasLargeThumbnail(videoId);
        let flvInfo = util.parseQuery(
          decodeURIComponent(watchApiData.flashvars.flvInfo)
        );
        let dmcInfo = JSON.parse(
          decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
        );
        let thumbnail =
          watchApiData.flashvars.thumbImage +
          (hasLargeThumbnail ? '.L' : '');
        let videoUrl = flvInfo.url ? flvInfo.url : '';
        let isEco = /\d+\.\d+low$/.test(videoUrl);
        let isFlv = /\/smile\?v=/.test(videoUrl);
        let isMp4 = /\/smile\?m=/.test(videoUrl);
        let isSwf = /\/smile\?s=/.test(videoUrl);
        let isDmc = watchApiData.flashvars.isDmc === 1 && dmcInfo.session_api;
        let csrfToken = watchApiData.flashvars.csrfToken;
        let playlistToken = watchApiData.playlistToken;
        let watchAuthKey = watchApiData.flashvars.watchAuthKey;
        let seekToken = watchApiData.flashvars.seek_token;
        let threads = [];
        let msgInfo = {
          server: flvInfo.ms,
          threadId: flvInfo.thread_id * 1,
          duration: flvInfo.l,
          userId: flvInfo.user_id,
          isNeedKey: flvInfo.needs_key === '1',
          optionalThreadId: flvInfo.optional_thread_id,
          defaultThread: {id: flvInfo.thread_id * 1},
          optionalThreads: [],
          layers: [],
          threads,
          userKey: flvInfo.userkey,
          hasOwnerThread: !!watchApiData.videoDetail.has_owner_thread,
          when: null
        };
        if (msgInfo.hasOwnerThread) {
          threads.push({
            id: flvInfo.thread_id * 1,
            isThreadkeyRequired: flvInfo.needs_key === '1',
            isDefaultPostTarget: false,
            fork: 1,
            isActive: true,
            label: 'owner'
          });
        }
        threads.push({
          id: flvInfo.thread_id * 1,
          isThreadkeyRequired: flvInfo.needs_key === '1',
          isDefaultPostTarget: true,
          isActive: true,
          label: flvInfo.needs_key === '1' ? 'community' : 'default'
        });
        let playlist =
          JSON.parse(dom.querySelector('#playlistDataContainer').textContent);
        const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
        const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));

        cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

        let result = {
          _format: 'watchApi',
          watchApiData,
          flvInfo,
          dmcInfo,
          msgInfo,
          playlist,
          isDmcOnly: isPlayable && !isPlayableSmile,
          isPlayable,
          isMp4,
          isFlv,
          isSwf,
          isEco,
          isDmc,
          thumbnail,
          csrfToken,
          playlistToken,
          watchAuthKey,
          seekToken
        };

        ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
        return result;

      } catch (e) {
        window.console.error('error: parseFromGinza ', e);
        return null;
      }
    };

    const parseFromHtml5Watch = function (dom) {
      const watchDataContainer = dom.querySelector('#js-initial-watch-data');
      const data = JSON.parse(watchDataContainer.getAttribute('data-api-data'));
      const env = JSON.parse(watchDataContainer.getAttribute('data-environment'));

      const videoId = data.video.id;
      const hasLargeThumbnail = util.hasLargeThumbnail(videoId);
      const flvInfo = data.video.smileInfo || {};
      const dmcInfo = data.video.dmcInfo || {};
      const thumbnail = data.video.thumbnailURL + (hasLargeThumbnail ? '.L' : '');
      const videoUrl = flvInfo.url ? flvInfo.url : '';
      const isEco = /\d+\.\d+low$/.test(videoUrl);
      const isFlv = /\/smile\?v=/.test(videoUrl);
      const isMp4 = /\/smile\?m=/.test(videoUrl);
      const isSwf = /\/smile\?s=/.test(videoUrl);
      const isDmc = !!dmcInfo && !!dmcInfo.session_api;
      // const isChannel = !!data.channel;
      // const isCommunity = !!data.community;
      const csrfToken = data.context.csrfToken;
      const watchAuthKey = data.context.watchAuthKey;
      const playlistToken = env.playlistToken;
      const context = data.context;
      const commentComposite = data.commentComposite;
      const threads = commentComposite.threads.map(t => Object.assign({}, t));
      const layers  = commentComposite.layers.map(t => Object.assign({}, t));
      layers.forEach(layer => {
        layer.threadIds.forEach(({id, fork}) => {
          threads.forEach(thread => {
            if (thread.id === id && fork === 0) {
              thread.layer = layer;
            }
          });
        });
      });
      const linkedChannelVideo =
        (context.linkedChannelVideos || []).find(ch => {
          return !!ch.isChannelMember;
        });
      const isNeedPayment = context.isNeedPayment;
      const defaultThread = threads.find(t => t.isDefaultPostTarget);
      const msgInfo = {
        server: data.thread.serverUrl,
        threadId: defaultThread ? defaultThread.id : (data.thread.ids.community || data.thread.ids.default),
        duration: data.video.duration,
        userId: data.viewer.id,
        isNeedKey: threads.findIndex(t => t.isThreadkeyRequired) >= 0, // (isChannel || isCommunity)
        optionalThreadId: '',
        defaultThread,
        optionalThreads: threads.filter(t => t.id !== defaultThread.id) || [],
        threads,
        userKey: data.context.userkey,
        hasOwnerThread: data.thread.hasOwnerThread,
        when: null
      };

      const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
      const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));

      cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

      const playlist = {playlist: []};

      const tagList = [];
      data.tags.forEach(t => {
        tagList.push({
          _data: t,
          id: t.id,
          tag: t.name,
          dic: t.isDictionaryExists,
          lock: t.isLocked, // 形式が統一されてない悲しみを吸収
          owner_lock: t.isLocked ? 1 : 0,
          lck: t.isLocked ? '1' : '0',
          cat: t.isCategory
        });
      });
      let channelInfo = null, channelId = null;
      if (data.channel) {
        channelInfo = {
          icon_url: data.channel.iconURL || '',
          id: data.channel.id,
          name: data.channel.name,
          is_favorited: data.channel.isFavorited ? 1 : 0
        };
        channelId = channelInfo.id;
      }
      let uploaderInfo = null;
      if (data.owner) {
        uploaderInfo = {
          icon_url: data.owner.iconURL,
          id: data.owner.id,
          nickname: data.owner.nickname,
          is_favorited: data.owner.isFavorited,
          isMyVideoPublic: data.owner.isUserMyVideoPublic
        };
      }

      const watchApiData = {
        videoDetail: {
          v: data.context.watchId,
          id: data.video.id,
          title: data.video.title,
          title_original: data.video.originalTitle,
          description: data.video.description,
          description_original: data.video.originalDescription,
          postedAt: data.video.postedDateTime,
          thumbnail: data.video.thumbnailURL,
          length: data.video.duration,

          commons_tree_exists: !!data.video.isCommonsTreeExists,

          width: data.video.width,
          height: data.video.height,

          isChannel: data.channel && data.channel.id,
          isMymemory: data.context.isMyMemory, // 大文字小文字注意
          communityId: data.community ? data.community.id : null,
          channelId,

          commentCount: data.thread.commentCount,
          mylistCount: data.video.mylistCount,
          viewCount: data.video.viewCount,

          tagList
        },
        viewerInfo: {id: data.viewer.id},
        channelInfo,
        uploaderInfo
      };

      let ngFilters = null;
      if (data.video && data.video.dmcInfo && data.video.dmcInfo.thread && data.video.dmcInfo.thread) {
        if (data.video.dmcInfo.thread.channel_ng_words && data.video.dmcInfo.thread.channel_ng_words.length) {
          ngFilters = data.video.dmcInfo.thread.channel_ng_words;
        } else if (data.video.dmcInfo.thread.owner_ng_words && data.video.dmcInfo.thread.owner_ng_words.length) {
          ngFilters = data.video.dmcInfo.thread.owner_ng_words;
        }
      }
      if (data.context && data.context.ownerNGList && data.context.ownerNGList.length) {
        ngFilters = data.context.ownerNGList;
      }
      if (ngFilters && ngFilters.length) {
        const ngtmp = [];
        ngFilters.forEach(ng => {
          if (!ng.source || !ng.destination) { return; }
          ngtmp.push(
            encodeURIComponent(ng.source) + '=' + encodeURIComponent(ng.destination));
        });
        flvInfo.ng_up = ngtmp.join('&');
      }

      const result = {
        _format: 'html5watchApi',
        _data: data,
        watchApiData,
        flvInfo,
        dmcInfo,
        msgInfo,
        playlist,
        isDmcOnly: isPlayable && !isPlayableSmile,
        isPlayable,
        isMp4,
        isFlv,
        isSwf,
        isEco,
        isDmc,
        thumbnail,
        csrfToken,
        watchAuthKey,
        playlistToken,

        isNeedPayment,
        linkedChannelVideo,
        resumeInfo: {
          initialPlaybackType: data.context.initialPlaybackType || '',
          initialPlaybackPosition: data.context.initialPlaybackPosition || 0
        }
      };

      ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', csrfToken);
      return result;
    };


    const parseWatchApiData = function (src) {
      const dom = document.createElement('div');
      dom.innerHTML = src;
      if (dom.querySelector('#watchAPIDataContainer')) {
        return parseFromGinza(dom);
      } else if (dom.querySelector('#js-initial-watch-data')) {
        return parseFromHtml5Watch(dom);
      } else if (dom.querySelector('#PAGEBODY .mb16p4 .font12')) {
        return {
          reject: true,
          reason: 'forbidden',
          message: dom.querySelector('#PAGEBODY .mb16p4 .font12').textContent,
        };
      } else {
        return null;
      }
    };


    const loadLinkedChannelVideoInfo = (originalData) => {
      const linkedChannelVideo = originalData.linkedChannelVideo;
      const originalVideoId = originalData.watchApiData.videoDetail.id;
      const videoId = linkedChannelVideo.linkedVideoId;

      originalData.linkedChannelData = null;
      if (originalVideoId === videoId) {
        return Promise.reject();
      }

      const url = `//www.nicovideo.jp/watch/${videoId}`;
      window.console.info('%cloadLinkedChannelVideoInfo', 'background: cyan', linkedChannelVideo);
      return new Promise(r => {
        setTimeout(() => {
          r();
        }, 1000);
      }).then(() => {
        return util.fetch(url, {credentials: 'include'});
      })
        .then(res => {
          return res.text();
        })
        .then(html => {
          const dom = document.createElement('div');
          dom.innerHTML = html;
          const data = parseFromHtml5Watch(dom);
          //window.console.info('linkedChannelData', data);
          originalData.dmcInfo = data.dmcInfo;
          originalData.isDmcOnly = data.isDmcOnly;
          originalData.isPlayable = data.isPlayable;
          originalData.isMp4 = data.isMp4;
          originalData.isFlv = data.isFlv;
          originalData.isSwf = data.isSwf;
          originalData.isEco = data.isEco;
          originalData.isDmc = data.isDmc;
          return originalData;
        })
        .catch(() => {
          return Promise.reject({reason: 'network', message: '通信エラー(loadLinkedChannelVideoInfo)'});
        });
    };

    const onLoadPromise = (watchId, options, isRetry, resp) => {
      const data = parseWatchApiData(resp);
      ZenzaWatch.debug.watchApiData = data;
      if (!data) {
        return Promise.reject({
          reason: 'network',
          message: '通信エラー。動画情報の取得に失敗しました。(watch api)'
        });
      }

      if (data.reject) {
        return Promise.reject(data);
      }

      if (data.isFlv && !data.isEco) {
        return Promise.reject({
          reason: 'flv',
          info: data,
          message: 'この動画はZenzaWatchで再生できません(flv)'
        });
      }

      if (
        !data.isPlayable &&
        data.isNeedPayment &&
        data.linkedChannelVideo &&
        Config.getValue('loadLinkedChannelVideo')) {
        return loadLinkedChannelVideoInfo(data);
      }

      if (!data.isPlayable) {
        return Promise.reject({
          reason: 'not supported',
          info: data,
          message: 'この動画はZenzaWatchで再生できません'
        });
      }

      ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId);
      return Promise.resolve(data);
    };

    const createSleep = function (sleepTime) {
      return new Promise(resolve => {
        window.setTimeout(() => {
          return resolve();
        }, sleepTime);
      });
    };

    const loadPromise = function (watchId, options, isRetry = false) {
      let url = `${location.protocol}//www.nicovideo.jp/watch/${watchId}`;
      console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);
      const query = [];
      if (options.economy === true) {
        query.push('eco=1');
      }
      if (query.length > 0) {
        url += '?' + query.join('&');
      }

      return util.fetch(url, {credentials: 'include'})
        .then(res => {
          return res.text();
        })
        .catch(() => {
          return Promise.reject({reason: 'network', message: '通信エラー(network)'});
        })
        .then(onLoadPromise.bind(this, watchId, options, isRetry))
        .catch(err => {
          if (isRetry) {
            return Promise.reject({
              watchId,
              message: err.message || '動画情報の取得に失敗したか、未対応の形式です',
              type: 'watchapi'
            });
          }

          if (err.reason === 'forbidden') {
            return Promise.reject(err);
          } else if (err.reason === 'network') {
            return createSleep(5000).then(() => {
              window.console.warn('network error & retry');
              return loadPromise(watchId, options, true);
            });
          } else if (err.reason === 'flv' && !options.economy) {
            options.economy = true;
            window.console.log(
              '%cエコノミーにフォールバック(flv)',
              'background: cyan; color: red;');
            return createSleep(500).then(() => {
              return loadPromise(watchId, options, true);
            });
          } else {
            window.console.info('watch api fail', err);
            return Promise.reject({
              watchId,
              message: err.message || '動画情報の取得に失敗',
              info: err.info
            });
          }
        });
    };

    return {
      load: function (watchId, options) {
        const timeKey = `watchAPI:${watchId}`;
        window.console.time(timeKey);
        return loadPromise(watchId, options).then(
          (result) => {
            window.console.timeEnd(timeKey);
            return result;
          },
          (err) => {
            err.watchId = watchId;
            window.console.timeEnd(timeKey);
            return Promise.reject(err);
          }
        );
      }
    };
  })();


  let ThumbInfoLoader = (function () {
    let BASE_URL = 'https://ext.nicovideo.jp/';
    let MESSAGE_ORIGIN = 'https://ext.nicovideo.jp/';
    let gate = null;
    let cacheStorage;

    let parseXml = function (xmlText) {
      let parser = new DOMParser();
      let xml = parser.parseFromString(xmlText, 'text/xml');
      let val = function (name) {
        let elms = xml.getElementsByTagName(name);
        if (elms.length < 1) {
          return null;
        }
        return elms[0].innerHTML;
      };

      let resp = xml.getElementsByTagName('nicovideo_thumb_response');
      if (resp.length < 1 || resp[0].getAttribute('status') !== 'ok') {
        return {
          status: 'fail',
          code: val('code'),
          message: val('description')
        };
      }

      let duration = (function () {
        let tmp = val('length').split(':');
        return parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
      })();
      let watchId = val('watch_url').split('/').reverse()[0];
      let postedAt = util.dateToString(new Date(val('first_retrieve')));
      let tags = (function () {
        let t = Array.from(xml.getElementsByTagName('tag'));
        let result = t.map(tag => {
          return {
            text: tag.innerHTML,
            category: tag.hasAttribute('category'),
            lock: tag.hasAttribute('lock')
          };
        });
        return result;
      })();

      let videoId = val('video_id');
      let isChannel = videoId.substring(0, 2) === 'so';

      let result = {
        status: 'ok',
        _format: 'thumbInfo',
        v: isChannel ? videoId : watchId,
        id: videoId,
        originalVideoId: (!isChannel && watchId !== videoId) ? videoId : '',
        isChannel,
        title: val('title'),
        description: val('description'),
        thumbnail: val('thumbnail_url').replace(/^http:/, ''),
        movieType: val('movie_type'),
        lastResBody: val('last_res_body'),
        duration,
        postedAt,
        mylistCount: parseInt(val('mylist_counter'), 10),
        viewCount: parseInt(val('view_counter'), 10),
        commentCount: parseInt(val('comment_num'), 10),
        tagList: tags
      };
      let userId = val('user_id');
      if (userId !== null && userId !== '') {
        result.owner = {
          type: 'user',
          id: userId,
          linkId: userId ? `user/${userId}` : '',
          name: val('user_nickname') || '(非公開ユーザー)',
          url: userId ? ('//www.nicovideo.jp/user/' + userId) : '#',
          icon: val('user_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
        };
      }
      let channelId = val('ch_id');
      if (channelId !== null && channelId !== '') {
        result.owner = {
          type: 'channel',
          id: channelId,
          linkId: channelId ? `ch${channelId}` : '',
          name: val('ch_name') || '(非公開ユーザー)',
          url: '//ch.nicovideo.jp/ch' + channelId,
          icon: val('ch_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
        };
      }
      console.log('thumbinfo: ', watchId, result);

      cacheStorage.setItem('thumbInfo_' + result.v, result, 1000 * 60 * 10);

      return result;
    };

    let initialize = function () {
      if (cacheStorage) { return; }
      cacheStorage = new CacheStorage(sessionStorage);
      gate = new CrossDomainGate({
        baseUrl: BASE_URL,
        origin: MESSAGE_ORIGIN,
        type: 'thumbInfo',
        messager: WindowMessageEmitter
      });
    };

    let load = function (watchId) {
      initialize();

      return new Promise(function (resolve, reject) {
        let cache = cacheStorage.getItem('thumbInfo_' + watchId);
        if (cache) {
          console.log('cache exist: ', watchId);
          setTimeout(() => {
            resolve(cache);
          }, 0);
          return;
        }

        gate.load(BASE_URL + 'api/getthumbinfo/' + watchId).then(function (result) {
          result = parseXml(result);
          if (result.status === 'ok') {
            resolve(result);
          } else {
            reject(result);
          }
        });
      });
    };

    return {
      load: load
    };
  })();
  if (ZenzaWatch) {
    ZenzaWatch.api.ThumbInfoLoader = ThumbInfoLoader;
  }



  let MylistApiLoader = (function () {
    // マイリスト/とりあえずマイリストの取得APIには
    // www.nicovideo.jp配下とflapi.nicovideo.jp配下の２種類がある
    // 他人のマイリストを取得するにはflapi、マイリストの編集にはwwwのapiが必要
    // データのフォーマットが微妙に異なるのでめんどくさい
    //
    // おかげでソート処理が悲しいことに
    //
    let CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
    let TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
    let token = '';
    let cacheStorage = null;

    function MylistApiLoader() {
      this.initialize.apply(this, arguments);
    }

    if (ZenzaWatch) {
      ZenzaWatch.emitter.on('csrfTokenUpdate', t => {
        token = t;
        if (cacheStorage) {
          cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
        }
      });
    }

    _.assign(MylistApiLoader.prototype, {
      initialize: function () {
        if (!cacheStorage) {
          cacheStorage = new CacheStorage(sessionStorage);
        }
        if (!token) {
          token = cacheStorage.getItem('csrfToken');
          if (token) {
            console.log('cached token exists', token);
          }
        }
      },
      setCsrfToken: function (t) {
        token = t;
        if (cacheStorage) {
          cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
        }
      },
      getDeflistItems: function (options) {
        options = options || {};
        let url = '//www.nicovideo.jp/api/deflist/list';
        //var url = 'https://flapi.nicovideo.jp/api/watch/deflistvideo';
        let cacheKey = 'deflistItems';
        let sortItem = this.sortItem;
        options = options || {};

        return new Promise(function (resolve, reject) {

          let cacheData = cacheStorage.getItem(cacheKey);
          if (cacheData) {
            console.log('cache exists: ', cacheKey, cacheData);
            setTimeout(() => {
              if (options.sort) {
                cacheData = sortItem(cacheData, options.sort, 'www');
              }
              resolve(cacheData);
            }, 0);
            return;
          }

          util.ajax({
            url: url,
            timeout: 60000,
            cache: false,
            dataType: 'json',
            xhrFields: {withCredentials: true}
          }).then(function (result) {
            if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
              reject({
                result: result,
                message: 'とりあえずマイリストの取得失敗(1)'
              });
              return;
            }

            let data = result.list || result.mylistitem;
            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            if (options.sort) {
              data = sortItem(data, options.sort, 'www');
            }
            resolve(data);
          }, function (err) {
            reject({
              result: err,
              message: 'とりあえずマイリストの取得失敗(2)'
            });
          });
        });
      },
      getMylistItems: function (groupId, options) {
        options = options || {};
        if (groupId === 'deflist') {
          return this.getDeflistItems(options);
        }
        // flapiじゃないと自分のマイリストしか取れないことが発覚
        let url = 'https://flapi.nicovideo.jp/api/watch/mylistvideo?id=' + groupId;
        let cacheKey = 'mylistItems: ' + groupId;
        let sortItem = this.sortItem;

        return new Promise(function (resolve, reject) {

          let cacheData = cacheStorage.getItem(cacheKey);
          if (cacheData) {
            console.log('cache exists: ', cacheKey, cacheData);
            setTimeout(() => {
              if (options.sort) {
                cacheData = sortItem(cacheData, options.sort, 'flapi');
              }
              resolve(cacheData);
            }, 0);
            return;
          }

          return util.ajax({
            url: url,
            timeout: 60000,
            cache: false,
            dataType: 'json',
            xhrFields: {withCredentials: true}
          }).then(function (result) {
            if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
              return reject({
                result: result,
                message: 'マイリストの取得失敗(1)'
              });
            }

            let data = result.list || result.mylistitem;
            data.id = groupId;
            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            if (options.sort) {
              data = sortItem(data, options.sort, 'flapi');
            }
            return resolve(data);
          }, function (err) {
            this.reject({
              result: err,
              message: 'マイリストの取得失敗(2)'
            });
          });
        });
      },
      sortItem: function (items, sortId, format) {
        // wwwの時とflapiの時で微妙にフォーマットが違うのでめんどくさい
        // 自分以外のマイリストが開けるのはflapiだけの模様
        // 編集時にはitem_idが必要なのだが、それはwwwのほうにしか入ってない
        // flapiに統一したい
        sortId = parseInt(sortId, 10);

        let sortKey = ([
          'create_time', 'create_time',
          'mylist_comment', 'mylist_comment', // format = wwwの時はdescription
          'title', 'title',
          'first_retrieve', 'first_retrieve',
          'view_counter', 'view_counter',
          'thread_update_time', 'thread_update_time',
          'num_res', 'num_res',
          'mylist_counter', 'mylist_counter',
          'length_seconds', 'length_seconds'
        ])[sortId];

        if (format === 'www' && sortKey === 'mylist_comment') {
          sortKey = 'description';
        }
        if (format === 'www' && sortKey === 'thread_update_time') {
          sortKey = 'update_time';
        }

        let order;
        switch (sortKey) {
          // 偶数がascで奇数がdescかと思ったら特に統一されてなかった
          case 'first_retrieve':
          case 'thread_update_time':
          case 'update_time':
            order = (sortId % 2 === 1) ? 'asc' : 'desc';
            break;
          // 数値系は偶数がdesc
          case 'num_res':
          case 'mylist_counter':
          case 'view_counter':
          case 'length_seconds':
            order = (sortId % 2 === 1) ? 'asc' : 'desc';
            break;
          default:
            order = (sortId % 2 === 0) ? 'asc' : 'desc';
        }

        //window.console.log('sortKey?', sortId, sortKey, order);
        if (!sortKey) {
          return items;
        }

        let getKeyFunc = (function (sortKey, format) {
          switch (sortKey) {
            case 'create_time':
            case 'description':
            case 'mylist_comment':
            case 'update_time':
              return function (item) {
                return item[sortKey];
              };
            case 'num_res':
            case 'mylist_counter':
            case 'view_counter':
            case 'length_seconds':
              if (format === 'flapi') {
                return function (item) {
                  return item[sortKey] * 1;
                };
              } else {
                return function (item) {
                  return item.item_data[sortKey] * 1;
                };
              }
            default:
              if (format === 'flapi') {
                return function (item) {
                  return item[sortKey];
                };
              } else {
                return function (item) {
                  return item.item_data[sortKey];
                };
              }
          }
        })(sortKey, format);

        let compareFunc = (function (order, getKey) {
          switch (order) {
            // sortKeyが同一だった場合は動画IDでソートする
            // 銀魂など、一部公式チャンネル動画向けの対応
            case 'asc':
              return function (a, b) {
                let ak = getKey(a), bk = getKey(b);
                if (ak !== bk) {
                  return ak > bk ? 1 : -1;
                }
                //else { return a.item_data.watch_id > b.item_data.watch_id ? 1 : -1; }
                else {
                  return a.id > b.id ? 1 : -1;
                }
              };
            case 'desc':
              return function (a, b) {
                let ak = getKey(a), bk = getKey(b);
                if (ak !== bk) {
                  return (ak < bk) ? 1 : -1;
                }
                else {
                  return a.id < b.id ? 1 : -1;
                }
              };
          }
        })(order, getKeyFunc);

        //window.console.log('before sort', items[0], items, order, sortKey, compareFunc);
        items.sort(compareFunc);
        //window.console.log('after sort', items[0], items);
        return items;
      },
      getMylistList: function () {
        let url = '//www.nicovideo.jp/api/mylistgroup/list';
        let cacheKey = 'mylistList';

        return new Promise(function (resolve, reject) {

          let cacheData = cacheStorage.getItem(cacheKey);
          if (cacheData) {
            console.log('cache exists: ', cacheKey, cacheData);
            setTimeout(() => {
              resolve(cacheData);
            }, 0);
            return;
          }

          util.ajax({
            url: url,
            timeout: 60000,
            cache: false,
            dataType: 'json',
            xhrFields: {withCredentials: true}
          }).then(function (result) {
            if (result.status !== 'ok' || !result.mylistgroup) {
              return reject({
                result: result,
                message: 'マイリスト一覧の取得失敗(1)'
              });
            }

            let data = result.mylistgroup;
            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            return resolve(data);
          }, function (err) {
            return reject({
              result: err,
              message: 'マイリスト一覧の取得失敗(2)'
            });
          });
        });
      },
      findDeflistItemByWatchId: function (watchId) {
        return this.getDeflistItems().then(function (items) {
          for (let i = 0, len = items.length; i < len; i++) {
            let item = items[i], wid = item.id || item.item_data.watch_id;
            if (wid === watchId) {
              return Promise.resolve(item);
            }
          }
          return Promise.reject();
        });
      },
      findMylistItemByWatchId: function (watchId, groupId) {
        return this._getMylistItemsFromWapi(groupId).then(function (items) {
          for (let i = 0, len = items.length; i < len; i++) {
            let item = items[i], wid = item.id || item.item_data.watch_id;
            if (wid === watchId) {
              return Promise.resolve(item);
            }
          }
          return Promise.reject();
        });
      },
      _getMylistItemsFromWapi: function (groupId) {
        // めんどくさいが、マイリスト取得APIは2種類ある
        // こっちは自分のマイリストだけを取る奴。 編集にはこっちが必要。
        let url = '//www.nicovideo.jp/api/mylist/list?group_id=' + groupId;
        return util.ajax({
          url: url,
          timeout: 60000,
          cache: false,
          dataType: 'json',
          xhrFields: {withCredentials: true}
        }).then(function (result) {
          if (result.status === 'ok' && result.mylistitem) {
            return Promise.resolve(result.mylistitem);
          }
          return Promise.reject();
        });
      },
      removeDeflistItem: function (watchId) {
        return this.findDeflistItemByWatchId(watchId).then(function (item) {
          let url = '//www.nicovideo.jp/api/deflist/delete';
          let data = 'id_list[0][]=' + item.item_id + '&token=' + token;
          let cacheKey = 'deflistItems';
          let req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          };

          return util.ajax(req).then(function (result) {
            if (result.status && result.status === 'ok') {
              cacheStorage.removeItem(cacheKey);
              ZenzaWatch.emitter.emitAsync('deflistRemove', watchId);
              return Promise.resolve({
                status: 'ok',
                result: result,
                message: 'とりあえずマイリストから削除'
              });
            }

            return Promise.reject({
              status: 'fail',
              result: result,
              code: result.error.code,
              message: result.error.description
            });

          }, function (err) {
            return Promise.reject({
              result: err,
              message: 'とりあえずマイリストから削除失敗(2)'
            });
          });

        }).catch(err => {
          return Promise.reject({
            status: 'fail',
            result: err,
            message: '動画が見つかりません'
          });
        });
      },
      removeMylistItem: function (watchId, groupId) {
        return this.findMylistItemByWatchId(watchId, groupId).then(function (item) {
          let url = '//www.nicovideo.jp/api/mylist/delete';
          window.console.log('delete item:', item);
          let data = 'id_list[0][]=' + item.item_id + '&token=' + token + '&group_id=' + groupId;
          let cacheKey = 'mylistItems: ' + groupId;
          let req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          };

          return util.ajax(req).then(function (result) {
            if (result.status && result.status === 'ok') {
              cacheStorage.removeItem(cacheKey);
              ZenzaWatch.emitter.emitAsync('mylistRemove', watchId, groupId);
              return Promise.resolve({
                status: 'ok',
                result: result,
                message: 'マイリストから削除'
              });
            }

            return Promise.reject({
              status: 'fail',
              result: result,
              code: result.error.code,
              message: result.error.description
            });

          }, function (err) {
            return Promise.reject({
              result: err,
              message: 'マイリストから削除失敗(2)'
            });
          });

        }, function (err) {
          window.console.error(err);
          return Promise.reject({
            status: 'fail',
            result: err,
            message: '動画が見つかりません'
          });
        });
      },
      _addDeflistItem: function (watchId, description, isRetry) {
        let url = '//www.nicovideo.jp/api/deflist/add';
        let data = 'item_id=' + watchId + '&token=' + token;
        if (description) {
          data += '&description=' + encodeURIComponent(description);
        }
        let cacheKey = 'deflistItems';

        let req = {
          url: url,
          method: 'POST',
          data: data,
          dataType: 'json',
          timeout: 60000,
          xhrFields: {withCredentials: true},
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        };

        let self = this;
        return new Promise(function (resolve, reject) {
          util.ajax(req).then(function (result) {
            if (result.status && result.status === 'ok') {
              cacheStorage.removeItem(cacheKey);
              ZenzaWatch.emitter.emitAsync('deflistAdd', watchId, description);
              return resolve({
                status: 'ok',
                result: result,
                message: 'とりあえずマイリスト登録'
              });
            }

            if (!result.status || !result.error) {
              return reject({
                status: 'fail',
                result: result,
                message: 'とりあえずマイリスト登録失敗(100)'
              });
            }

            if (result.error.code !== 'EXIST' || isRetry) {
              return reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });
            }

            /**
             すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
             例えば、とりマイの300番目に登録済みだった場合に「登録済みです」と言われても探すのがダルいし、
             他の動画を追加していけば、そのうち押し出されて消えてしまう。
             なので、重複時にエラーを出すのではなく、「消してから追加」することによって先頭に持ってくる。
             */
            return self.removeDeflistItem(watchId).then(function () {
              return self._addDeflistItem(watchId, description, true).then(function (result) {
                resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリストの先頭に移動'
                });
              });
            }, function (err) {
              reject({
                status: 'fail',
                result: err.result,
                code: err.code,
                message: 'とりあえずマイリスト登録失敗(101)'
              });
            });

          }, function (err) {
            reject({
              status: 'fail',
              result: err,
              message: 'とりあえずマイリスト登録失敗(200)'
            });
          });
        });
      },
      addDeflistItem: function (watchId, description) {
        return this._addDeflistItem(watchId, description, false);
      },
      addMylistItem: function (watchId, groupId, description) {
        let url = '//www.nicovideo.jp/api/mylist/add';
        let data = 'item_id=' + watchId + '&token=' + token + '&group_id=' + groupId;
        if (description) {
          data += '&description=' + encodeURIComponent(description);
        }
        let cacheKey = 'mylistItems: ' + groupId;

        let req = {
          url: url,
          method: 'POST',
          data: data,
          dataType: 'json',
          timeout: 60000,
          xhrFields: {withCredentials: true},
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        };

        let self = this;
        return new Promise(function (resolve, reject) {
          util.ajax(req).then(function (result) {
            if (result.status && result.status === 'ok') {
              cacheStorage.removeItem(cacheKey);
              // マイリストに登録したらとりあえずマイリストから除去(=移動)
              self.removeDeflistItem(watchId).then(_.noop, _.noop);
              return resolve({
                status: 'ok',
                result: result,
                message: 'マイリスト登録'
              });
            }

            if (!result.status || !result.error) {
              return reject({
                status: 'fail',
                result: result,
                message: 'マイリスト登録失敗(100)'
              });
            }

            // マイリストの場合は重複があっても「追加して削除」しない。
            // とりまいと違って押し出されることがないし、
            // シリーズ物が勝手に入れ替わっても困るため

            ZenzaWatch.emitter.emitAsync('mylistAdd', watchId, groupId, description);
            return reject({
              status: 'fail',
              result: result,
              code: result.error.code,
              message: result.error.description
            });
          }, function (err) {
            reject({
              status: 'fail',
              result: err,
              message: 'マイリスト登録失敗(200)'
            });
          });
        });
      }
    });

    return MylistApiLoader;
  })();
  if (ZenzaWatch) {
    ZenzaWatch.api.MylistApiLoader = MylistApiLoader;
    ZenzaWatch.init.mylistApiLoader = new MylistApiLoader();
  }

  let UploadedVideoApiLoader = (function () {
    let CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
    let cacheStorage = null;

    function UploadedVideoApiLoader() {
      this.initialize.apply(this, arguments);
    }

    _.assign(UploadedVideoApiLoader.prototype, {
      initialize: function () {
        if (!cacheStorage) {
          cacheStorage = new CacheStorage(sessionStorage);
        }
      },
      getUploadedVideos: function (userId/*, options*/) {
        let url = '//flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=' + userId;
        let cacheKey = 'uploadedvideo: ' + userId;

        return new Promise(function (resolve, reject) {

          let cacheData = cacheStorage.getItem(cacheKey);
          if (cacheData) {
            console.log('cache exists: ', cacheKey, cacheData);
            setTimeout(() => {
              resolve(cacheData);
            }, 0);
            return;
          }

          return util.ajax({
            url: url,
            timeout: 60000,
            cache: false,
            dataType: 'json',
            xhrFields: {withCredentials: true}
          }).then(function (result) {
            if (result.status !== 'ok' || !result.list) {
              return reject({
                result: result,
                message: result.message
              });
            }

            let data = result.list;
            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            return resolve(data);
          }, function (err) {
            this.reject({
              result: err,
              message: '動画一覧の取得失敗(2)'
            });
          });
        });
      },
    });
    return UploadedVideoApiLoader;
  })();
  if (ZenzaWatch) {
    ZenzaWatch.api.UploadedVideoApiLoader = UploadedVideoApiLoader;
    ZenzaWatch.init.UploadedVideoApiLoader = new UploadedVideoApiLoader();
  }


  class CrossDomainGate extends Emitter {
    constructor(...args) {
      super();
      this.initialize(...args);
    }
  }
  _.assign(CrossDomainGate.prototype, {
    initialize: function (params) {
      this._baseUrl = params.baseUrl;
      this._origin = params.origin || location.href;
      this._type = params.type;
      this._suffix = params.suffix || '';
      this._messager = params.messager || WindowMessageEmitter;

      this._sessions = {};
      this._initializeStatus = '';
    },
    _initializeFrame: function () {
      switch (this._initializeStatus) {
        case 'done':
          return new Promise(resolve => {
            setTimeout(resolve, 0);
          });
        case 'initializing':
          return new Promise((resolve, reject) => {
            this.on('initialize', e => {
              if (e.status === 'ok') {
                resolve();
              } else {
                reject(e);
              }
            });
          });
        case '': {
          this._initializeStatus = 'initializing';
          let initialPromise;
          initialPromise = new Promise((resolve, reject) => {
            this._sessions.initial = {
              promise: initialPromise,
              resolve: resolve,
              reject: reject
            };
            window.setTimeout(() => {
              if (this._initializeStatus !== 'done') {
                let rej = {
                  status: 'fail',
                  message: `CrossDomainGate初期化タイムアウト (${this._type})`
                };
                reject(rej);
                this.emit('initialize', rej);
              }
            }, 60 * 1000);
            this._initializeCrossDomainGate();

          });
          return initialPromise;
        }
      }
    },
    _initializeCrossDomainGate: function () {
      this._initializeCrossDomainGate = _.noop;
      this._messager.on('onMessage', this._onMessage.bind(this));

      console.log('%c initialize ' + this._type, 'background: lightgreen;');

      let loaderFrame = document.createElement('iframe');
      loaderFrame.referrerPolicy = 'origin';
      loaderFrame.sandbox = 'allow-scripts allow-same-origin';
      loaderFrame.lazyload = 'off';
      loaderFrame.name = `${this._type}Loader${this._suffix ? `#${this._suffix}` : ''}`;
      loaderFrame.className = 'xDomainLoaderFrame ' + this._type;
      loaderFrame.style.cssText = `
        position: fixed; left: -100vw; pointer-events: none;user-select: none;`;
      document.body.appendChild(loaderFrame);

      this._loaderWindow = loaderFrame.contentWindow;
      this._messager.addKnownSource(this._loaderWindow);
      this._loaderWindow.location.replace(this._baseUrl + '#' + TOKEN);
    },
    _onMessage: function (data, type) {
      if (type !== this._type) {
        return;
      }
      let info = data.message;
      let token = info.token;
      let sessionId = info.sessionId;
      let status = info.status;
      let command = info.command || 'loadUrl';
      let session = this._sessions[sessionId];

      if (status === 'initialized') {
        this._initializeStatus = 'done';
        this._sessions.initial.resolve();
        this.emitAsync('initialize', {status: 'ok'});
        this._postMessage({command: 'ok'});
        return;
      }

      if (token !== TOKEN) {
        window.console.log('invalid token:', token, TOKEN);
        return;
      }

      switch (command) {
        case 'dumpConfig':
          this._onDumpConfig(info.body);
          break;

        default:
          if (!session) {
            return;
          }
          if (status === 'ok') {
            session.resolve(info.body);
          }
          else {
            session.reject({message: status});
          }
          session = null;
          delete this._sessions[sessionId];
          break;
      }
    },
    load: function (url, options) {
      return this._postMessage({
        command: 'loadUrl',
        url: url,
        options: options
      }, true);
    },
    ajax: function (options) {
      let url = options.url;
      return this.load(url, options).then(result => {
        ZenzaWatch.debug.lastCrossDomainAjaxResult = result;
        try {
          let dataType = (options.dataType || '').toLowerCase();
          switch (dataType) {
            case 'json':
              return Promise.resolve(JSON.parse(result));
            case 'xml':
              return Promise.resolve(new DOMParser().parseFromString(result, 'text/xml'));
          }
          return Promise.resolve(result);
        } catch (e) {
          return Promise.reject({
            status: 'fail',
            message: 'パース失敗',
            error: e
          });
        }
      });
    },
    videoCapture: function (src, sec) {
      return this._postMessage({
        command: 'videoCapture',
        src,
        sec
      }, true);
    },
    _fetch: function (url, options) {
      return this._postMessage({
        command: 'fetch',
        url: url,
        options: options
      }, true);
    },
    fetch: function (url, options) {
      return this._fetch(url, options).then((text) => {
        ZenzaWatch.debug.lastCrossDomainFetchResult = text;
        return Promise.resolve({
          text: () => {
            return new Promise(res => {
              return res(text);
            });
          },
          json: () => {
            return new Promise(res => {
              return res(JSON.parse(text));
            });
          },
          xml: () => {
            return new Promise(res => {
              return res(new DOMParser().parseFromString(text, 'text/xml'));
            });
          }
        });
      });
    },
    configBridge: function (config) {
      let keys = config.getKeys();
      this._config = config;

      return new Promise((resolve, reject) => {
        this._configBridgeResolve = resolve;
        this._configBridgeReject = reject;
        this._postMessage({
          url: '',
          command: 'dumpConfig',
          keys: keys
        });
      });
    },
    _postMessage: function (message, needPromise) {
      return new Promise((resolve, reject) => {
        message.sessionId = this._type + '_' + Math.random();
        message.token = TOKEN;
        if (needPromise) {
          this._sessions[message.sessionId] = {
            resolve: resolve,
            reject: reject
          };
        }

        return this._initializeFrame().then(() => {
          try {
            this._loaderWindow.postMessage(
              JSON.stringify(message),
              this._origin
            );
          } catch (e) {
            console.log('%cException!', 'background: red;', e);
          }
        });
      });
    },
    postMessage: function(...args) {
      return this._postMessage(...args);
    },
    sendCommandPacket: function(packet) {
      return this._postMessage({command: 'commandPacket', token: TOKEN, packet});
    },
    _onDumpConfig: function (configData) {
      _.each(Object.keys(configData), (key) => {
        this._config.setValue(key, configData[key]);
      });

      if (!location.host.match(/^[a-z0-9]*\.nicovideo\.jp$/) &&
        !this._config.getValue('allowOtherDomain')) {
        window.console.log('allowOtherDomain', this._config.getValue('allowOtherDomain'));
        this._configBridgeReject();
        return;
      }
      this._config.on('update', (key, value) => {
        if (key === 'autoCloseFullScreen') {
          return;
        }

        this._postMessage({
          command: 'saveConfig',
          key: key,
          value: value
        });
      });
      this._configBridgeResolve();
    },
    pushHistory: function (path, title) {
      const sessionId = this._type + '_' + Math.random();
      this._initializeFrame().then(() => {
        try {
          this._loaderWindow.postMessage(JSON.stringify({
              sessionId: sessionId,
              command: 'pushHistory',
              token: TOKEN,
              path: path,
              title: title || ''
            }),
            this._origin);
        } catch (e) {
          console.log('%cException!', 'background: red;', e);
        }
      });
    },
  });

  let NicoVideoApi = {};
  if (location.host !== 'www.nicovideo.jp') {
    NicoVideoApi = new CrossDomainGate({
      baseUrl: location.protocol + '//www.nicovideo.jp/favicon.ico',
      origin: location.protocol + '//www.nicovideo.jp/',
      type: 'nicovideoApi',
      suffix: location.href,
      messager: WindowMessageEmitter
    });
  }


  const IchibaLoader = (() => {

    let callbackId = 0;

    const load = (watchId) => {
      return new Promise((resolve, reject) => {
        const country = 'ja-jp';
        const api = '//ichiba.nicovideo.jp/embed/zero/show_ichiba';
        const sc = document.createElement('script');

        let timeoutTimer = null;

        const funcName = (() => {
          const funcName = `zenza_callback_${callbackId++}`;

          window[funcName] = (ichibaData) => {
            //window.console.info(ichibaData);
            window.clearTimeout(timeoutTimer);
            timeoutTimer = null;
            sc.remove();
            delete window[funcName];

            resolve(ichibaData);
          };

          return funcName;
        })();

        timeoutTimer = window.setTimeout(() => {
          sc.remove();
          delete window[funcName];
          if (timeoutTimer) {
            reject(new Error('ichiba timeout'));
          }
        }, 30000);

        const url = `${api}?v=${watchId}&country=${country}&ch=&is_adult=1&rev=20120220&callback=${funcName}`;
        sc.src = url;
        document.body.appendChild(sc);
      });
    };

    return {
      load
    };
  })();


  const PlaybackPosition = (function () {
    const record = (watchId, playbackPosition, csrfToken) => {
      const url = 'https://flapi.nicovideo.jp/api/record_current_playback_position';
      const body =
        `watch_id=${watchId}&playback_position=${playbackPosition}&csrf_token=${csrfToken}`;
      return util.fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      });
    };

    return {
      record
    };
  })();

// typoじゃなくて変なブロッカーと干渉しないために名前を変えている
  const UaaLoader = (() => {

    const load = (videoId, {limit = 50} = {}) => {
      const url = `https://api.nicoad.nicovideo.jp/v1/contents/video/${videoId}/thanks?limit=${limit}`;
      return util
        .fetch(url, {credentials: 'include'})
        .then(res => {
          return res.json();
        });
    };

    return {
      load
    };
  })();

  const RecommendAPILoader = (() => {

    const load = ({videoId}) => {
      const recipe = btoa(JSON.stringify({
        id: 'video_playlist_common', videoId
      }));
      const url = `https://nvapi.nicovideo.jp/v1/recommend?recipe=${recipe}&site=nicovideo&_frontendId=6&_frontendVersion=0`;
      return util
        .fetch(url, {credentials: 'include'})
        .then(res => res.json())
        .then(res => {
          if (!res.meta || res.meta.status !== 200) {
            window.console.warn('load recommend fail', res);
            throw new Error('load recommend fail');
          }
          return res.data;
        });
    };

    return {
      load
    };
  })();


  return {
    VideoInfoLoader,
    ThumbInfoLoader,
    MylistApiLoader,
    UploadedVideoApiLoader,
    CacheStorage,
    CrossDomainGate,
    IchibaLoader,
    UaaLoader,
    PlaybackPosition,
    NicoVideoApi,
    NicoRssLoader,
    RecommendAPILoader,
    NVWatchCaller
  };
})();

//===END===

export {
  VideoInfoLoader,
  ThumbInfoLoader,
  MylistApiLoader,
  UploadedVideoApiLoader,
  CacheStorage,
  CrossDomainGate,
  IchibaLoader,
  UaaLoader,
  PlaybackPosition,
  NicoVideoApi,
  NicoRssLoader,
  RecommendAPILoader,
  NVWatchCaller
};

