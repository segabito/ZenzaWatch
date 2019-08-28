import {netUtil} from '../infra/netUtil';

//===BEGIN===
const IchibaLoader = {
  load: watchId => {
    const api = 'https://ichiba.nicovideo.jp/embed/zero/show_ichiba';
    const country = 'ja-jp';
    const url = `${api}?v=${watchId}&country=${country}&ch=&is_adult=1&rev=20120220`;
    return netUtil.jsonp(url);
  }
};

//===END===

export {IchibaLoader};