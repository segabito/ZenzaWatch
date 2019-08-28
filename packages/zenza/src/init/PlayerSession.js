import {PRODUCT} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
const PlayerSession = {
  session: {},
  init(storage) {
    this.storage = storage;
    return this;
  },
  save(playingStatus) {
    this.storage[this.KEY] = JSON.stringify(playingStatus);
  },
  restore() {
    let ss = {};
    try {
      const data = this.storage[this.KEY];
      if (!data) {return ss;}
      ss = JSON.parse(this.storage[this.KEY]);
      this.storage.removeItem(this.KEY);
    } catch (e) {
      window.console.error('PlayserSession restore fail: ', this.KEY, e);
    }
    console.log('lastSession', ss);
    return ss;
  },
  clear() { this.storage.removeItem(this.KEY); },
  hasRecord() { return this.storage.hasOwnProperty(this.KEY); }
};
PlayerSession.KEY = `ZenzaWatch_PlayingStatus`;
//===END===
export {PlayerSession};
