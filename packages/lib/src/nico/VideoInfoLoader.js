import {netUtil} from '../infra/netUtil';
import {textUtil} from '../text/textUtil';
import {nicoUtil} from '../nico/nicoUtil';
import {Emitter} from '../Emitter';
import {CacheStorage} from '../infra/CacheStorage';

const Config = {
  getValue: () => {}
};

const emitter = new Emitter();
const debug = {};

//===BEGIN===
const VideoInfoLoader = (function () {
  const cacheStorage = new CacheStorage(sessionStorage);

  const parseFromGinza = function (dom) {
    try {
      let watchApiData = JSON.parse(dom.querySelector('#watchAPIDataContainer').textContent);
      let videoId = watchApiData.videoDetail.id;
      let hasLargeThumbnail = nicoUtil.hasLargeThumbnail(videoId);
      let flvInfo = textUtil.parseQuery(
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
      let isDmc = watchApiData.flashvars.isDmc === 1 && dmcInfo.movie.session;
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

      dmcInfo.quality = {
        audios: (dmcInfo.movie.session || {audios: []}).audios.map(id => {return {id, available: true, bitrate: 64000};}),
        videos: (dmcInfo.movie.session || {videos: []}).videos.reverse()
        .map((id, level_index) => { return {
          id,
          available: true,
          level_index,
          bitrate: parseInt(id.replace(/^.*_(\d+)kbps.*/, '$1')) * 1000
        };})
        .reverse()
      };

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

      emitter.emitAsync('csrfTokenUpdate', csrfToken);
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
    const hasLargeThumbnail = nicoUtil.hasLargeThumbnail(videoId);
    const flvInfo = data.video.smileInfo || {};
    const dmcInfo = data.media.delivery || {};
    const thumbnail = data.video.thumbnail.largeUrl;
    const videoUrl = flvInfo.url ? flvInfo.url : '';
    const isEco = /\d+\.\d+low$/.test(videoUrl);
    const isFlv = /\/smile\?v=/.test(videoUrl);
    const isMp4 = /\/smile\?m=/.test(videoUrl);
    const isSwf = /\/smile\?s=/.test(videoUrl);
    const isDmc = !!dmcInfo && !!dmcInfo.movie.session;
    const csrfToken = null;
    const watchAuthKey = null;
    const playlistToken = env.playlistToken;
    const context = data.context;
    const commentComposite = data.comment;
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
    const linkedChannelVideo = false;
    const isNeedPayment = false;
    const defaultThread = threads.find(t => t.isDefaultPostTarget);
    const msgInfo = {
      server: commentComposite.server.url,
      threadId: defaultThread ? defaultThread.id : (data.thread.ids.community || data.thread.ids.default),
      duration: data.video.duration,
      userId: data.viewer ? data.viewer.id : 0,
      isNeedKey: threads.findIndex(t => t.isThreadkeyRequired) >= 0, // (isChannel || isCommunity)
      optionalThreadId: '',
      defaultThread,
      optionalThreads: threads.filter(t => t.id !== defaultThread.id) || [],
      threads,
      userKey: data.comment.keys.userKey,
      hasOwnerThread: threads.find(t => t.isOwnerThread),
      when: null,
      frontendId : env.frontendId,
      frontendVersion : env.frontendVersion
    };

    const isPlayableSmile = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);
    const isPlayable = isDmc || (isMp4 && !isSwf && (videoUrl.indexOf('http') === 0));

    cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

    const playlist = {playlist: []};

    const tagList = [];
    data.tag.items.forEach(t => {
      tagList.push({
        _data: t,
        id: t.id,
        tag: t.name,
        dic: t.isNicodicArticleExists,
        lock: t.isLocked, // 形式が統一されてない悲しみを吸収
        owner_lock: t.isLocked ? 1 : 0,
        lck: t.isLocked ? '1' : '0',
        cat: t.isCategory
      });
    });
    let channelInfo = null, channelId = null;
    if (data.channel) {
      channelInfo = {
        icon_url: data.channel.thumbnail.smallUrl || '',
        id: data.channel.id,
        name: data.channel.name,
        is_favorited: data.channel.isFavorited ? 1 : 0
      };
      channelId = channelInfo.id;
    }
    let uploaderInfo = null;
    if (data.owner) {
      uploaderInfo = {
        icon_url: data.owner.iconUrl,
        id: data.owner.id,
        nickname: data.owner.nickname,
        is_favorited: data.owner.isFavorited,
        isMyVideoPublic: data.owner.isUserMyVideoPublic
      };
    }

    const watchApiData = {
      videoDetail: {
        v: data.client.watchId,
        id: data.video.id,
        title: data.video.title,
        title_original: data.video.originalTitle,
        description: data.video.description,
        description_original: data.video.originalDescription,
        postedAt: new Date(data.video.registeredAt).toLocaleString(),
        thumbnail: data.video.thumbnail.url,
        largeThumbnail: data.video.thumbnail.player,
        length: data.video.duration,

        commons_tree_exists: !!data.external.commons.hasContentTree,

        width: data.video.width,
        height: data.video.height,

        isChannel: data.channel && data.channel.id,
        isMymemory: false,
        communityId: data.community ? data.community.id : null,
        isPremiumOnly: data.viewer ? data.viewer.isPremiumOnly : false,
        isLiked: data.video.viewer ? data.video.viewer.like.isLiked : false,
        channelId,

        commentCount: data.video.count.comment,
        mylistCount: data.video.count.mylist,
        viewCount: data.video.count.view,

        tagList,
      },
      viewerInfo: {id: data.viewer ? data.viewer.id : 0},
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
      series: data.series,

      isNeedPayment,
      linkedChannelVideo,
      resumeInfo: {
        initialPlaybackType: (data.player.initialPlayback? data.player.initialPlayback.type : ''),
        initialPlaybackPosition: (data.player.initialPlayback? data.player.initialPlayback.positionSec : 0)
      }
    };

    emitter.emitAsync('csrfTokenUpdate', csrfToken);
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

    const url = `https://www.nicovideo.jp/watch/${videoId}`;
    window.console.info('%cloadLinkedChannelVideoInfo', 'background: cyan', linkedChannelVideo);
    return new Promise(r => {
      setTimeout(r, 1000);
    }).then(() => netUtil.fetch(url, {credentials: 'include'}))
      .then(res => res.text())
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
    debug.watchApiData = data;
    if (!data) {
      return Promise.reject({
        reason: 'network',
        message: '通信エラー。動画情報の取得に失敗しました。(watch api)'
      });
    }

    if (data.reject) {
      return Promise.reject(data);
    }

    if (!data.isDmc && (data.isFlv && !data.isEco)) {
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

    emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId);
    return Promise.resolve(data);
  };

  const createSleep = function (sleepTime) {
    return new Promise(resolve => setTimeout(resolve, sleepTime));
  };

  const loadPromise = function (watchId, options, isRetry = false) {
    let url = `https://www.nicovideo.jp/watch/${watchId}`;
    console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);
    const query = [];
    if (options.economy === true) {
      query.push('eco=1');
    }
    if (query.length > 0) {
      url += '?' + query.join('&');
    }

    return netUtil.fetch(url, {credentials: 'include'})
      .then(res => res.text())
      .catch(() => Promise.reject({reason: 'network', message: '通信エラー(network)'}))
      .then(onLoadPromise.bind(this, watchId, options, isRetry))
      .catch(err => {
        window.console.error('err', {err, isRetry, url, query});
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

//===END===

export {VideoInfoLoader};