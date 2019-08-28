import {textUtil} from '../text/textUtil';
import {CrossDomainGate} from '../infra/CrossDomainGate';
import {WindowMessageEmitter} from '../message/messageUtil';
import {CacheStorage} from '../infra/CacheStorage';
import {parseThumbInfo} from './parseThumbInfo';
//===BEGIN===
const ThumbInfoLoader = (() => {
  const BASE_URL = 'https://ext.nicovideo.jp/';
  const MESSAGE_ORIGIN = 'https://ext.nicovideo.jp/';
  let gate = null;

  const initialize = () => {
    if (gate) { return; }
    gate = new CrossDomainGate({
      baseUrl: BASE_URL,
      origin: MESSAGE_ORIGIN,
      type: 'thumbInfo'
    });
  };

  const load = async watchId =>  {
    initialize();

    const thumbInfo = await gate
      .fetch(
        `${BASE_URL}api/getthumbinfo/${watchId}`,
        {_format: 'text', expireTime: 24 * 60 * 60 * 1000})
        .catch(e => { return {status: 'fail', message: e.message || `gate.fetch('${watchId}') failed` }; });

    if (thumbInfo.status !== 'ok') {
      return Promise.reject(thumbInfo);
    }
    return thumbInfo;
  };

  return {load};
})();

//===END===

export {ThumbInfoLoader, parseThumbInfo};