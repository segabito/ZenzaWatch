import {util, Config} from './util';

const PRODUCT = 'ZenzaWatch';
const ZenzaWatch = {
  config: Config,
  util,
  debug: {
    contextMenu: {},
    dialog: {},
    getInViewElements: function () {
      return [];
    },
    ping: function () {
      return Promise.resolve();
    },
    video: HTMLElement,
    watchApiData: {}
  },
  api: {}
};

export {
  ZenzaWatch,
  PRODUCT
};