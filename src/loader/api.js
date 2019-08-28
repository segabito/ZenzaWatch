import {ZenzaWatch} from '../ZenzaWatchIndex';
import {browser} from '../browser';
const {location} = browser.window;

import {CacheStorage} from '../../packages/lib/src/infra/CacheStorage';
import {NicoRssLoader} from '../../packages/lib/src/nico/NicoRssLoader';
import {MatrixRankingLoader} from '../../packages/lib/src/nico/MatrixRankingLoader';
import {UaaLoader} from '../../packages/lib/src/nico/UaaLoader';
import {IchibaLoader} from '../../packages/lib/src/nico/IchibaLoader';
import {CommonsTreeLoader} from '../../packages/lib/src/nico/CommonsTreeLoader';
import {UploadedVideoApiLoader} from '../../packages/lib/src/nico/UploadedVideoApiLoader';
import {CrossDomainGate} from '../../packages/lib/src/infra/CrossDomainGate';
import {RecommendAPILoader} from '../../packages/lib/src/nico/RecommendAPILoader';
import {NVWatchCaller} from '../../packages/lib/src/nico/NVWatchCaller';
import {PlaybackPosition} from '../../packages/lib/src/nico/PlaybackPosition';
import {VideoInfoLoader} from '../../packages/lib/src/nico/VideoInfoLoader';
import {ThumbInfoLoader} from '../../packages/lib/src/nico/ThumbInfoLoader';
import {MylistApiLoader} from '../../packages/lib/src/nico/MylistApiLoader';

//===BEGIN===
//@require CacheStorage
//@require VideoInfoLoader
//@require ThumbInfoLoader
//@require MylistApiLoader
//@require NicoRssLoader
//@require MatrixRankingLoader
//@require IchibaLoader
//@require CommonsTreeLoader
//@require UploadedVideoApiLoader
//@require UaaLoader
//@require RecommendAPILoader
//@require NVWatchCaller
//@require PlaybackPosition
//@require CrossDomainGate

let NicoVideoApi = {};
if (location.host !== 'www.nicovideo.jp') {
  class NVGate extends CrossDomainGate {
    _onCommand({command, status, params, value}, sessionId = null) {
      switch (command) {
        case 'configSync':
            this._config.props[params.key] = params.value;
          break;
        default:
          return super._onCommand({command, status, params, value}, sessionId);
      }
    }
  }

  NicoVideoApi = new NVGate({
    baseUrl: 'https://www.nicovideo.jp/favicon.ico',
    origin: 'https://www.nicovideo.jp/',
    type: 'nicovideoApi',
    suffix: location.href
  });
}

if (ZenzaWatch && ZenzaWatch.api) {
  Object.assign(ZenzaWatch.api, {
    VideoInfoLoader,
    ThumbInfoLoader,
    MylistApiLoader,
    UploadedVideoApiLoader,
    CacheStorage,
    IchibaLoader,
    UaaLoader,
    PlaybackPosition,
    NicoVideoApi,
    RecommendAPILoader,
    NVWatchCaller,
    CommonsTreeLoader,
    NicoRssLoader,
    MatrixRankingLoader
  });
  ZenzaWatch.init.mylistApiLoader = MylistApiLoader;
  ZenzaWatch.init.UploadedVideoApiLoader = UploadedVideoApiLoader;
}
//===END===

export {
  VideoInfoLoader,
  ThumbInfoLoader,
  MylistApiLoader,
  UploadedVideoApiLoader,
  CacheStorage,
  CrossDomainGate,
  IchibaLoader,
  UaaLoader,
  PlaybackPosition,
  NicoVideoApi,
  RecommendAPILoader,
  NVWatchCaller,
  CommonsTreeLoader,
  NicoRssLoader,
  MatrixRankingLoader
};
