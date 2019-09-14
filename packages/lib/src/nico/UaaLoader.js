import {netUtil} from '../infra/netUtil';

//===BEGIN===
// typoじゃなくて変なブロッカーと干渉しないために名前を変えている
const UaaLoader = {
  load: (videoId, {limit = 50} = {}) => {
    const url = `https://api.nicoad.nicovideo.jp/v1/contents/video/${videoId}/thanks?limit=${limit}`;
    return netUtil.fetch(url, {credentials: 'include'}).then(res => res.json());
  }
};

//===END===

export {UaaLoader};