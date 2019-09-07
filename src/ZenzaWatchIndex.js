import {Emitter, Handler} from './baselib';
import {Config} from './Config';
const TOKEN = Math.random();

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
const global = {
  debug: ZenzaWatch.debug,
  emitter: ZenzaWatch.emitter,
  external: ZenzaWatch.external,
  PRODUCT,
  TOKEN,
  config: Config,
  api: ZenzaWatch.api
};
const Navi = Object.assign({}, ZenzaWatch);
const ENV = 'dev';
const VER = '2.0.0';

export {
  ZenzaWatch,
  Navi,
  PRODUCT,
  TOKEN,
  global,
  ENV,
  VER
};
