// import {browser} from './browser';

//===BEGIN===
const env = {
  hasFlashPlayer() {
    return !!navigator.mimeTypes['application/x-shockwave-flash'];
  },
  isEdgePC() {
    return navigator.userAgent.toLowerCase().includes('edge');
  },
  isFirefox() {
    return navigator.userAgent.toLowerCase().includes('firefox');
  },
  isWebkit() {
    return !this.isEdgePC() && navigator.userAgent.toLowerCase().includes('webkit');
  },
  isChrome() {
    return !this.isEdgePC() && navigator.userAgent.toLowerCase().includes('chrome');
  }
};

//===END===
export {env};