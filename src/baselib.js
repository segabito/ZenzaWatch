import * as _ from 'lodash';

//===BEGIN===

// 登録した順番は保証されない
class Handler { //extends Array {
  constructor(...args) {
    this._list = new Array(...args);
    //super(...args);
    // if (this._list.length > 1) { this.reverse(); }
  }

  get length() {
    return this._list.length;
  }

  exec(...args) {
    if (!this._list.length) {
      return;
    } else if (this._list.length === 1) {
      this._list[0](...args);
      return;
    }
    for (let i = this._list.length - 1; i >= 0; i--) {
      this._list[i](...args);
    }
  }

  execMethod(name, ...args) {
    if (!this._list.length) {
      return;
    } else if (this._list.length === 1) {
      this._list[0][name](...args);
      return;
    }
    for (let i = this._list.length - 1; i >= 0; i--) {
      this._list[i][name](...args);
    }
  }

  add(member) {
    if (this._list.includes(member)) {
      return this;
    }
    this._list.unshift(member);
    return this;
  }

  remove(member) {
    _.pull(this._list, member);
    return this;
  }

  clear() {
    this._list.length = 0;
    return this;
  }

  get isEmpty() {
    return this._list.length < 1;
  }
}


const {Emitter} = (() => {
  class Emitter {

    on(name, callback) {
      if (!this._events) {
        Emitter.totalCount++;
        this._events = {};
      }

      name = name.toLowerCase();
      let e = this._events[name];
      if (!e) {
        e = this._events[name] = new Handler(callback);
      } else {
        e.add(callback);
      }
      if (e.length > 10) {
        Emitter.warnings.push(this);
      }
      return this;
    }

    off(name, callback) {
      if (!this._events) {
        return;
      }

      name = name.toLowerCase();
      const e = this._events[name];

      if (!this._events[name]) {
        return;
      } else if (!callback) {
        delete this._events[name];
      } else {
        e.remove(callback);

        if (e.isEmpty) {
          delete this._events[name];
        }
      }

      if (Object.keys(this._events).length < 1) {
        delete this._events;
      }
      return this;
    }

    once(name, func) {
      const wrapper = (...args) => {
        func(...args);
        this.off(name, wrapper);
        wrapper._original = null;
      };
      wrapper._original = func;
      return this.on(name, wrapper);
    }

    clear(name) {
      if (!this._events) {
        return;
      }

      if (name) {
        delete this._events[name];
      } else {
        delete this._events;
        Emitter.totalCount--;
      }
      return this;
    }

    emit(name, ...args) {
      if (!this._events) {
        return;
      }

      name = name.toLowerCase();
      const e = this._events[name];

      if (!e) {
        return;
      }

      e.exec(...args);
      return this;
    }

    emitAsync(...args) {
      if (!this._events) {
        return;
      }

      setTimeout(() => {
        this.emit(...args);
      }, 0);
      return this;
    }
  }

  Emitter.totalCount = 0;
  Emitter.warnings = [];

  return {
    Emitter
  };
})();


//===END===

export {
  Emitter,
  Handler
};

