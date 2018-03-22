import {Config, AsyncEmitter, util} from './util';

const PRODUCT = 'ZenzaWatch';
const ZenzaWatch = {
  config: Config || {},
  util: util || {},
  debug: {
    contextMenu: {},
    dialog: {},
    getInViewElements: () => {
      return [];
    },
    ping: () => {
      return Promise.resolve();
    },
    video: {}, /* HTMLElement */
    watchApiData: {}
  },
  api: {},
  external: {},
  lib: {},
  init: {},
  emitter: new AsyncEmitter(),
  ready: false,
  version: '1.0.0'
};

export {
  ZenzaWatch,
  PRODUCT
};
