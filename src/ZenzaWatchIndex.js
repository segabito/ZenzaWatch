import {Emitter, Handler} from './baselib';
import {Config} from './Config';

const PRODUCT = 'ZenzaWatch';
const ZenzaWatch = {
  config: Config || {},
  util: {},
  debug: {
    contextMenu: {},
    dialog: {},
    getInViewElements: () => {
      return [];
    },
    ping: () => {
      return Promise.resolve();
    },
    video: {},
    watchApiData: {}
  },
  api: {},
  external: {},
  lib: {},
  modules: {
    Emitter,
    Handler
  },
  init: {},
  emitter: new Emitter(),
  ready: false,
  state: {},
  version: '1.0.0',
  ENV: 'DEV'
};

export {
  ZenzaWatch,
  PRODUCT
};
