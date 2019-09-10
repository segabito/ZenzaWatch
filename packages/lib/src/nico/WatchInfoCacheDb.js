import {IndexedDbStorage} from '../infra/IndexedDbStorage';
import {VideoInfoModel} from '../../../../src/VideoInfo';

//===BEGIN===
const WatchInfoCacheDb = (() => {
  const WATCH_INFO = {
    name: 'watch-info',
    ver: 2,
    stores: [
      {
        name: 'cache',
        indexes: [
          {name: 'videoId',    keyPath: 'videoId',    params: {unique: false}},
          {name: 'threadId',   keyPath: 'threadId',   params: {unique: false}},
          {name: 'ownerId',    keyPath: 'ownerId',    params: {unique: false}},
          {name: 'watchCount', keyPath: 'watchCount', params: {unique: false}},
          {name: 'postedAt',   keyPath: 'postedAt',   params: {unique: false}},
          {name: 'updatedAt',  keyPath: 'updatedAt',  params: {unique: false}},
        ],
        definition: {keyPath: 'watchId', autoIncrement: false}
      }
    ]
  };

  let db, instance, NicoVideoApi;
  const initWorker = async () => {
    if (db) { return db; }
    if (location.host === 'www.nicovideo.jp') {
      db = db || await IndexedDbStorage.open(WATCH_INFO);
    } else {
      db = db || await NicoVideoApi.bridgeDb(WATCH_INFO);
    }
    return db;
  };

  const open = async () => {
    if (instance) { return instance; }
    await initWorker();
    const cacheDb = db['cache'];
    return instance = {
      async put(watchId, options = {}) {
        /** @type {VideoInfoModel|null} */
        const videoInfo = options.videoInfo || null;
        const videoInfoRawData = (videoInfo && videoInfo.getData) ? videoInfo.getData() : videoInfo;
        const cache = await this.get(watchId) || {};
        const now = Date.now();
        /** @type {string} */
        const videoId = videoInfo ? videoInfo.videoId : watchId;
        /** @type {string} */
        const postedAt = videoInfo ? new Date(videoInfo.postedAt).getTime() : 0;
        /** @type {number} */
        const threadId = videoInfo ? (videoInfo.threadId * 1) : 0;
        /** @type {number} */
        const updatedAt = Date.now();
        const resume = cache.resume || [];
        const watchCount = (cache.watchCount || 0) + (options.watchCount === 1 ? 1 : 0);

        typeof options.currentTime === 'number' && options.currentTime > 0 &&
          (resume.unshift({now, time: options.currentTime}));
        resume.length = Math.min(10, resume.length);
        const ownerId = videoInfo && videoInfo.owner.id ?
          `${videoInfo.isChannel? 'ch' : 'user/'}${videoInfo.owner.id}` : '';

        const comment = cache.comment || [];
        options.comment && (comment.push(comment));
        const record = {
          watchId,
          videoId:  (cache.videoId  ? cache.videoId  : videoId) || '',
          threadId: (cache.threadId ? cache.threadId : threadId) || '',
          ownerId:  (ownerId ? ownerId : cache.ownerId) || '',
          watchCount,
          postedAt: cache && cache.postedAt ? cache.postedAt : postedAt,
          updatedAt,
          videoInfo: videoInfoRawData ? videoInfoRawData : cache.videoInfo,
          threadInfo: (options.threadInfo ? options.threadInfo : cache.threadInfo) || 0,
          comment,
          resume,
          heatMap:    (options.heatMap    ? options.heatMap    : cache.heatMap) || null,
          config:     (options.config     ? options.config     : cache.config) || ''
        };
        cacheDb.put(record);
        return record;
      },
      get(watchId) { return cacheDb.updateTime({key: watchId}); },
      delete(watchId) { return cacheDb.delete({key: watchId}); },
      close() { return cacheDb.close(); },
      gc(expireTime) { return cacheDb.gc(expireTime); }
    };
  };
  const put = (watchId, options = {}) => open().then(db => db.put(watchId, options));
  const get = watchId => open().then(db => db.get(watchId));
  const del = watchId => open().then(db => db.delete(watchId));
  const close = () => open().then(db => db.close());
  const gc = (expireTime) => open().then(db => db.gc(expireTime));
  const api = api => NicoVideoApi = api;

  return {initWorker, open, put, get, delete: del, close, gc, api};
})();
//===END===
export {WatchInfoCacheDb};