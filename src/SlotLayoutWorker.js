var _ = require('lodash');
var Config = {};
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};

//===BEGIN===

var SlotLayoutWorker = (function() {
  var func = function(self) {

    // 暫定設置
    var SLOT_COUNT = 40;

    var SlotEntry = function() { this.initialize.apply(this, arguments); };
    SlotEntry.prototype = {
      initialize: function(slotCount) {
        this._slotCount = slotCount || SLOT_COUNT;
        this._slot = [];
        this._itemTable = {};

        this._p = 1;
      },
      _findIdle: function(sec) {
        var count = this._slotCount, slot = this._slot, table = this._itemTable;
        for (var i = 0; i < count; i++) {
          if (!slot[i]) {
            //console.log('empty found! idx=%s, sec=%s slot=%s', i, sec, JSON.stringify(slot));
            slot[i] = this._p++;
            return i;
          }

          var item = table[i];
          if (sec < item.begin || sec > item.end) {
            //console.log('idle found! idx=%s, sec=%s ', i, sec, JSON.stringify(slot), JSON.stringify(item));
            slot[i] = this._p++;
            return i;
          }
        }
        return -1;
      },
      _findOldest: function() {
        var idx = 0, slot = this._slot, min = slot[0];
        for (var i = 1, len = this._slot.length; i < len; i++) {
          if (slot[i] < min) {
            min = slot[i];
            idx = i;
          }
        }
        return idx;
      },
      find: function(item, sec) {
        // まずは空いてるスロットを小さい順に探す
        var slot = this._findIdle(sec);
        // なかったら、一番古いやつから奪い取る
        if (slot < 0) { slot = this._findOldest(); }
        this._itemTable[slot] = item;
        return slot;
      }
    };

    var vposSort = function(data) {
      data = data.concat().sort(function(a, b) {
        var av = a.vpos, bv = b.vpos;
        if (av !== bv) {
          return av - bv;
        } else {
          return a.no < b.no ? -1 : 1;
        }
      });
      return data;
    };

    var execute = function(e) {
      var data = [];
      data = data.concat(e.data.top);
      data = data.concat(e.data.naka);
      data = data.concat(e.data.bottom);
      data = vposSort(data);

      var slotEntries = [new SlotEntry(), new SlotEntry(), new SlotEntry()];

      for (var i = 0, len = data.length; i < len; i++) {
        var o = data[i];
        if (o.invisible) { continue; }
        var sec = o.begin;
        var fork = o.fork % 3;
        o.slot = slotEntries[fork].find(o, sec);
      }
      return data;
    };

    self.onmessage = function(e) {
      //console.log('SlotLayout', e.data);
      console.time('SlotLayoutWorker');

      var result = execute(e);

      console.timeEnd('SlotLayoutWorker');

      result.lastUpdate = e.data.lastUpdate;
      //console.log('SlotLayoutResult', result);
      self.postMessage(e.data);
    };

  };

  return {
    _func: func,
    create: function() {
      if (!ZenzaWatch.util.isWebWorkerAvailable()) {
        return null;
      }
      return ZenzaWatch.util.createWebWorker(func);
    }
  };
})();



//===END===

var workerWrapper = (function(worker) {

  var wrapper = {};

  var workerInterface = {
    postMessage: function(data) {
      var packet = { data: data };
      wrapper.onmessage(packet);
    }
  };

  wrapper.postMessage = function(data) {
    var packet = { data: data };
    worker(workerInterface);
    workerInterface.onmessage(packet);
  };

  wrapper.addEventListener = function(name, callback) {
    wrapper['on' + name.toLowerCase()] = callback;
  };

  return wrapper;
})(SlotLayoutWorker._func);


module.exports = {
  SlotLayoutWorker: workerWrapper
};


