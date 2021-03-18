import {netUtil} from '../infra/netUtil';
import {NVApi} from './NVApi';

//===BEGIN===
//@require NVApi

const LikeApi = {
  call: (videoId, method = 'POST') => {
    const api = 'https://nvapi.nicovideo.jp/v1/users/me/likes/items';
    const url = `${api}?videoId=${videoId}`;
    return NVApi.call(url, {method}).then(e => e.json());
  },
  like: videoId => LikeApi.call(videoId, 'POST'),
  unlike: videoId => LikeApi.call(videoId, 'DELETE')
};

//===END===
// {"meta":{"status":201},"data":{"thanksMessage": 'hogehoge'}}
export {LikeApi};