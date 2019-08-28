import {IndexedDbStorage} from '../infra/IndexedDbStorage';
import {parseThumbInfo} from './parseThumbInfo';
import {global} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
const ThumbInfoCacheDb = (() => {
  const THUMB_INFO = {
    name: 'thumb-info',
    ver: 1,
    stores: [
      {
        name: 'cache',
        indexes: [
          {name: 'postedAt', keyPath: 'postedAt', params: {unique: false}},
          {name: 'updatedAt', keyPath: 'updatedAt', params: {unique: false}}
        ],
        definition: {keyPath: 'watchId', autoIncrement: false}
      }
    ]
  };

  let db;
  const open = async () => {
    db = db || await IndexedDbStorage.open(THUMB_INFO);
    const cacheDb = db['cache'];
    cacheDb.gc(90 * 24 * 60 * 60 * 1000);
    return {
      /**
       * @params {string} xmlText
       * @params {ThumbInfoData?}
       */
      put: (xml, thumbInfo = null) => {
        thumbInfo = thumbInfo || parseThumbInfo(xml);
        if (thumbInfo.status !== 'ok') {
          return;
        }
        const watchId = thumbInfo.v;
        const videoId = thumbInfo.id;
        const postedAt = new Date(thumbInfo.postedAt).getTime();
        const updatedAt = Date.now();
        const record = {
          watchId,
          videoId,
          postedAt,
          updatedAt,
          xml,
          thumbInfo
        };
        cacheDb.put(record);
        return {watchId, updatedAt};
      },
      get: watchId => cacheDb.updateTime({key: watchId}),
      delete: watchId => cacheDb.delete({key: watchId}),
      close: () => cacheDb.close()
    };
  };

  return {open};
})();

//===END===
export {ThumbInfoCacheDb};