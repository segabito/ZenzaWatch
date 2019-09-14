import {ZenzaWatch} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
const createVideoElement = (...args) => {
  if (window.ZenzaHLS && window.ZenzaHLS.createVideoElement) {
    return window.ZenzaHLS.createVideoElement(...args);
  } else
  if (ZenzaWatch.debug.createVideoElement) {
    return ZenzaWatch.debug.createVideoElement(...args);
  }
  return document.createElement('video');
};
//===END===
export {createVideoElement};