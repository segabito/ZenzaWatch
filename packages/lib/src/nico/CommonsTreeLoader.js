import {netUtil} from '../infra/netUtil';

//===BEGIN===
const CommonsTreeLoader = {
  load: contentId => {
    const api = 'https://api.commons.nicovideo.jp/tree/summary/get';
    const url = `${api}?id=${contentId}&limit=200`;
    return netUtil.jsonp(url);
  }
};

//===END===

export {CommonsTreeLoader};