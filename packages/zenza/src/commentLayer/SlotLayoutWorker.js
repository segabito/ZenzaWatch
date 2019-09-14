import {workerUtil} from '../../../lib/src/infra/workerUtil';

// const Config = ZenzaWatch.config;

//===BEGIN===

const SlotLayoutWorker = (() => {
  const func = function (self) {

    // 暫定設置
    const SLOT_COUNT = 40;

    /**
     * スロット≒Z座標をよしなに割り当てる。
     * デザパタ的にいうならFlyweightパターンの亜種。
     * ゲームプログラミングではよくあるやつ。
     */
    class SlotEntry {
      constructor(slotCount) {
        this.slotCount = slotCount || SLOT_COUNT;
        this.slot = [];
        this.itemTable = {};
        this.p = 1;
      }
      findIdle(sec) {
        const {count, slot, table} = this;
        for (let i = 0; i < count; i++) {
          if (!slot[i]) {
            //console.log('empty found! idx=%s, sec=%s slot=%s', i, sec, JSON.stringify(slot));
            slot[i] = this.p++;
            return i;
          }

          let item = table[i];
          if (sec < item.begin || sec > item.end) {
            //console.log('idle found! idx=%s, sec=%s ', i, sec, JSON.stringify(slot), JSON.stringify(item));
            slot[i] = this.p++;
            return i;
          }
        }
        return -1;
      }
      get mostOld() {
        let idx = 0, slot = this.slot, min = slot[0];
        for (let i = 1, len = this.slot.length; i < len; i++) {
          if (slot[i] < min) {
            min = slot[i];
            idx = i;
          }
        }
        return idx;
      }
      find(item, sec) {
        // まずは空いてるスロットを小さい順に探す
        let slot = this.findIdle(sec);
        // なかったら、一番古いやつから奪い取る
        if (slot < 0) {
          slot = this.mostOld;
        }
        this.itemTable[slot] = item;
        return slot;
      }
    }

    const sortByBeginTime = data => {
      data = data.concat().sort((a, b) => {
        const av = a.begin, bv = b.begin;
        if (av !== bv) {
          return av - bv;
        } else {
          return a.no < b.no ? -1 : 1;
        }
      });
      return data;
    };

    const execute = ({top, naka, bottom}) => {
      const data = sortByBeginTime([top, naka, bottom].flat());

      const slotEntries = [new SlotEntry(), new SlotEntry(), new SlotEntry()];

      for (let i = 0, len = data.length; i < len; i++) {
        const o = data[i];
        if (o.invisible) {
          continue;
        }
        const sec = o.begin;
        const fork = o.fork % 3;
        o.slot = slotEntries[fork].find(o, sec);
      }
      return data;
    };

    self.onmessage = ({command, params}) => {
      console.time('SlotLayoutWorker');

      const result = execute(params);

      console.timeEnd('SlotLayoutWorker');

      result.lastUpdate = params.lastUpdate;
      return result;
    };

  };

  return {
    _func: func,
    create: function () {
      if (!workerUtil.isAvailable) {
        return null;
      }
      return workerUtil.createCrossMessageWorker(func, {name: 'SlotLayoutWorker'});
    }
  };
})();


//===END===

export {
  SlotLayoutWorker
};


