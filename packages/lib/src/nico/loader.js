import {ZenzaWatch} from '../../../../src/ZenzaWatchIndex';
import {browser} from '../../../../src/browser';

import {CacheStorage} from '../infra/CacheStorage';
import {NicoRssLoader} from './NicoRssLoader';
import {MatrixRankingLoader} from './MatrixRankingLoader';
import {UaaLoader} from './UaaLoader';
import {IchibaLoader} from './IchibaLoader';
import {CommonsTreeLoader} from './CommonsTreeLoader';
import {CrossDomainGate} from '../infra/CrossDomainGate';
import {RecommendAPILoader} from './RecommendAPILoader';
import {NVWatchCaller} from './NVWatchCaller';
import {PlaybackPosition} from './PlaybackPosition';
import {VideoInfoLoader} from './VideoInfoLoader';
import {ThumbInfoLoader} from './ThumbInfoLoader';
import {MylistApiLoader} from './MylistApiLoader';
import {PlaylistApiLoader} from './PlaylistApiLoader';
import {NicoVideoApi} from './NicoVideoApi';

//===BEGIN===
//@require CacheStorage
//@require VideoInfoLoader
//@require ThumbInfoLoader
//@require PlaylistApiLoader
//@require MylistApiLoader
//@require NicoRssLoader
//@require MatrixRankingLoader
//@require IchibaLoader
//@require CommonsTreeLoader
//@require UaaLoader
//@require RecommendAPILoader
//@require NVWatchCaller
//@require PlaybackPosition
//@require CrossDomainGate
//@require NicoVideoApi

//===END===

export {
  VideoInfoLoader,
  ThumbInfoLoader,
  PlaylistApiLoader,
  MylistApiLoader,
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
