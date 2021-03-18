import {netUtil} from '../infra/netUtil';

//===BEGIN===

const NVApi = {
  FRONT_ID: '6',
  FRONT_VER:'0',
  REQUEST_WITH: 'https://www.nicovideo.jp',
  call: (url, params = {}) => {
    return netUtil
      .fetch(url, {
        mode: 'cors',
        credentials: 'include',
        timeout: 5000,
        method: params.method || 'GET',
        headers: {
          'X-Frontend-Id': NVApi.FRONT_ID,
          'X-Frontend-Version': NVApi.FRONT_VER,
          'X-Request-with': NVApi.REQUEST_WITH
        }
      })
      .catch(err => console.warn('nvapi fail', {err, url, params}));
  }
};

//===END===

export {NVApi};