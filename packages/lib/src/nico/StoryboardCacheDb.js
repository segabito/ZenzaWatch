import {IndexedDbStorage} from '../infra/IndexedDbStorage';
import {NicoVideoApi} from '../../../../src/loader/api';

//===BEGIN===
const StoryboardCacheDb = (() => {
  const WATCH_INFO = {
    name: 'storyboard',
    ver: 2,
    stores: [
      {
        name: 'cache',
        indexes: [
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
    instance = {
      async put(watchId, sbInfo = {}) {
        if (sbInfo.status !== 'ok') {
          console.warn('invalid sbInfo', watchId, sbInfo);
          return;
        }
        const record = {
          watchId,
          updatedAt: Date.now(),
          sbInfo
        };
        cacheDb.put(record);
        return record;
      },
      async get(watchId) {
        const record = await cacheDb.updateTime({key: watchId});
        if (!record) { return null; }
        return record.sbInfo;
      },
      delete(watchId) { return cacheDb.delete({key: watchId}); },
      close() { return cacheDb.close(); },
      gc(expireTime) { return cacheDb.gc(expireTime); }
    };
    instance.gc(7 * 24 * 60 * 60 * 1000);
    return instance;
  };
  const put = (watchId, sbInfo = {}) => open().then(db => db.put(watchId, sbInfo));
  const get = watchId => open().then(db => db.get(watchId));
  const del = watchId => open().then(db => db.delete(watchId));
  const close = () => open().then(db => db.close());
  const gc = (expireTime = 24 * 60 * 60 * 1000) => open().then(db => db.gc(expireTime));
  const api = api => NicoVideoApi = api;

  return {initWorker, open, put, get, delete: del, close, gc, db, api};
})();
//===END===
export {StoryboardCacheDb};