import {netUtil} from '../infra/netUtil';

//===BEGIN===
const NVWatchCaller = (() => {
  const FRONT_ID = '6';
  const FRONT_VER = '0';
  const call = trackingId => {
    const url = `https://nvapi.nicovideo.jp/v1/2ab0cbaa/watch?t=${encodeURIComponent(trackingId)}`;//&_frontendId=${FRONT_ID}`;
    return netUtil
      .fetch(url, {
        mode: 'cors',
        credentials: 'include',
        timeout: 5000,
        headers: {
          'X-Frontend-Id': FRONT_ID,
          'X-Frontend-Version': FRONT_VER
        }
      })
      .catch(e => {
        console.warn('nvlog fail', e);
      });
  };

  return {call};
})();

//===END===

export {NVWatchCaller};