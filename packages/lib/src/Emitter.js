//===BEGIN===
function EmitterInitFunc() {
class Handler { //extends Array {
  constructor(...args) {
    this._list = args;
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
    this._list = this._list.filter(m => m !== member);
    return this;
  }

  clear() {
    this._list.length = 0;
    return this;
  }

  get isEmpty() {
    return this._list.length < 1;
  }

  *[Symbol.iterator]() {
    const list = this._list || [];
    for (const member of list) {
      yield member;
    }
  }

  next() {
    return this[Symbol.iterator]();
  }
}
Handler.nop = () => {/*     ( ˘ω˘ ) スヤァ    */};

const PromiseHandler = (() => {
  const id = function() { return `Promise${this.id++}`; }.bind({id: 0});

  class PromiseHandler extends Promise {
    constructor(callback = () => {}) {
      const key = new Object({id: id(), callback, status: 'pending'});

      const cb = function(res, rej) {
        const resolve = (...args) => { this.status = 'resolved'; this.value = args; res(...args); };
        const reject  = (...args) => { this.status = 'rejected'; this.value = args; rej(...args); };
        if (this.result) {
          return this.result.then(resolve, reject);
        }
        Object.assign(this, {resolve, reject});
        return callback(resolve, reject);
      }.bind(key);

      super(cb);
      this.resolve = this.resolve.bind(this);
      this.reject = this.reject.bind(this);
      this.key = key;
    }

    resolve(...args) {
      if (this.key.resolve) {
        this.key.resolve(...args);
      } else {
        this.key.result = Promise.resolve(...args);
      }
      return this;
    }

    reject(...args) {
      if (this.key.reject) {
        this.key.reject(...args);
      } else {
        this.key.result = Promise.reject(...args);
      }
      return this;
    }

    addCallback(callback) {
      Promise.resolve().then(() => callback(this.resolve, this.reject));
      return this;
    }
  }
  return PromiseHandler;
})();


const {Emitter} = (() => {
  let totalCount = 0;
  let warnings = [];
  class Emitter {
    on(name, callback) {
      if (!this._events) {
        Emitter.totalCount++;
        this._events = new Map();
      }

      name = name.toLowerCase();
      let e = this._events.get(name);
      if (!e) {
        e = this._events.set(name, new Handler(callback));
      } else {
        e.add(callback);
      }
      if (e.length > 10) {
        // console.warn('listener count > 10', name, e, callback);
        !Emitter.warnings.includes(this) && Emitter.warnings.push(this);
      }
      return this;
    }

    off(name, callback) {
      if (!this._events) {
        return;
      }

      name = name.toLowerCase();
      const e = this._events.get(name);

      if (!this._events.has(name)) {
        return;
      } else if (!callback) {
        this._events.delete(name);
      } else {
        e.remove(callback);

        if (e.isEmpty) {
          this._events.delete(name);
        }
      }

      if (this._events.size < 1) {
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
        this._events.delete(name);
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
      const e = this._events.get(name);

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

      setTimeout(() => this.emit(...args), 0);
      return this;
    }
    promise(name, callback) {
      if (!this._promise) {
        this._promise = new Map;
      }
      const p = this._promise.get(name);
      if (p) {
        return callback ? p.addCallback(callback) : p;
      }
      this._promise.set(name, new PromiseHandler(callback));
      return this._promise.get(name);
    }
    emitResolve(name, ...args) {
      if (!this._promise) {
        this._promise = new Map;
      }
      if (!this._promise.has(name)) {
        this._promise.set(name, new PromiseHandler());
      }
      this._promise.get(name).resolve(...args);
    }
    emitReject(name, ...args) {
      if (!this._promise) {
        this._promise = new Map;
      }
      if (!this._promise.has(name)) {
        this._promise.set(name, new PromiseHandler);
      }
      this._promise.get(name).reject(...args);
    }
    resetPromise(name) {
      if (!this._promise) { return; }
      this._promise.delete(name);
    }
    hasPromise(name) {
      return this._promise && this._promise.has(name);
    }
    addEventListener(...args) { return this.on(...args); }
    removeEventListener(...args) { return this.off(...args);}
  }
  Emitter.totalCount = totalCount;
  Emitter.warnings = warnings;
  return {Emitter};
})();

  return {Handler, PromiseHandler, Emitter};
}
const {Handler, PromiseHandler, Emitter} = EmitterInitFunc();

//===END===

export {
  EmitterInitFunc,
  Handler,
  PromiseHandler,
  Emitter
};

