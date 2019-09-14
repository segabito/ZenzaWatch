import {netUtil} from '../infra/netUtil';

//===BEGIN===
const UploadedVideoApiLoader = (() => {
  let loader = null;
  class UploadedVideoApiLoader {
    async load(userId) {
      const url = `https://flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=${userId}`;

      const result = await netUtil.fetch(url, {credentials: 'include'})
        .then(r => r.json())
        .catch(e => { throw new Error('動画一覧の取得失敗(2)', e); });
      if (result.status !== 'ok' || !result.list) {
        throw new Error(`動画一覧の取得失敗(1) ${result && result.message}`, result);
      }

      return result.list;
    }
  }
  return {
    load: userId => {
      loader = loader || new UploadedVideoApiLoader();
      return loader.load(userId);
    },
    getUploadedVideos: userId => {
      loader = loader || new UploadedVideoApiLoader();
      return loader.load(userId);
    }
  };
})();

//===END===

export {UploadedVideoApiLoader};