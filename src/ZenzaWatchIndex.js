import {Emitter, Handler, Observable} from './baselib';
import {Config, util} from './util';

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
  modules: {
    Emitter,
    Handler,
    Observable
  },
  init: {},
  emitter: new Emitter(),
  ready: false,
  version: '1.0.0'
};

export {
  ZenzaWatch,
  PRODUCT
};
