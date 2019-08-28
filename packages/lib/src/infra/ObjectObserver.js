import {Handler} from '../Emitter';
import {objUtil} from './objUtil';
import {Observable} from './Observable';
import {bounce} from './bounce';

//===BEGIN===
const ObjectObserver = (() => {
  const disconnected = Symbol('disconnected');
  const disconnect = Symbol('disconnect');
  const listen = Symbol('listen');
  const revision = Symbol('revision');
  const parent = Symbol('parent');
  const dispatch = Symbol('dispatch');
  const id = Symbol('id');
  const isObjectObserver = Symbol['isObjectObserver'];
  const handler = Symbol('handler');

  const isObject = objUtil.isObject;

  const listKeys = obj => {
    const keys = Object.keys(obj).sort();
    const objKeys = keys.filter(key => isObject(obj[key]));
    const prmKeys = keys.filter(key => !isObject(obj[key]));
    return prmKeys.concat(objKeys);
  };
  const updateObject = (prev, next, mode = 'update') => {
    const prevKeys = listKeys(prev);
    const nextKeys = listKeys(next);
    const removedKeys = prevKeys.filter(key => !nextKeys.includes(key));
    const addedKeys = nextKeys.filter(key => !prevKeys.includes(key));
    const changedKeys = nextKeys
      .filter(key => prevKeys.includes(key))
      .filter(key => prev[key] !== next[key]);

    let changed = 0;
    if (mode !== 'merge') {
      for (const key of removedKeys) {
        delete prev[key];
        changed++;
      }
    }
    for (const key of addedKeys) {
      prev[key] = next[key];
      changed++;
    }
    for (const key of changedKeys) {
      prev[key] = next[key];
      changed++;
    }
    return changed;
  };

  class ObserveHandler {
    static getId() {
      this.id = this.id || 0;
      return this.id++;
    }
    constructor(params = {target: null, callback: null, parent: null, path: ''}) {
      this.id = this.constructor.getId();
      this.childProxy = {};
      this.childCallback = {};
      this.listener = Handler.of(params.callback);
      this.revision = 0;
      Object.assign(this, params);
    }
    createChild(target, prop, thisProxy) {
      const callback = (key, newValue, oldValue, details = {parent: null, path: ''}) => {
        details = Object.assign({}, details);
        details.path = details.path ? `${details.path}.${prop}` : prop;
        thisProxy[dispatch](key, newValue, oldValue, details);
      };
      if (target[isObjectObserver]) {
        this.childCallback[prop] = callback;
        target[listen](callback);
        return target;
      }
      const path = this.path ? `{this.path}.${prop}` : prop;
      return observe(target, callback, {parent: thisProxy, path});
    }
    set (target, prop, newValue, receiver) {
      if (prop === revision) {
        return true;
      }
      let oldValue = Reflect.get(target, prop, receiver);
      if (oldValue === newValue) {
        return true;
      }
      this.revision++;
      if (isObject(oldValue)) {
        if (isObject(newValue)) { // object to object
          if (!oldValue[isObjectObserver]) {
            const child = oldValue = this.createChild(oldValue, prop, receiver);
            Reflect.set(target, prop, child, receiver);
          }
          this.revision += updateObject(oldValue, newValue);
          return;
        } else { // object to primitive
          oldValue[isObjectObserver] && oldValue[disconnect](this.childCallback[prop]);
          Reflect.set(target, prop, newValue, receiver);
          this.revision++;
        }
      } else { // primitive to object|primitive
        target[prop] = isObject(newValue) ? this.createChild(newValue, prop, receiver) : newValue;
        this.revision++;
      }
      this.listener.exec(prop, newValue, oldValue, {target: receiver});
    }
    get (target, prop, receiver) {
      switch (prop) {
        case revision:
          return this.revision;
        case id:
          return this.id;
      }
      if (typeof prop === 'symbol' && receiver.hasOwnProperty(prop)) {
        return receiver[prop];
      }

      let val = Reflect.get(target, prop, receiver); //target[prop];
      if (!isObject(val)) {
        return val;
      }
      if (!this.childProxy[prop]) {
        if (typeof val === 'function') {
          val = val.bind(target);
        }
        this.childProxy[prop] = this.createChild(val, prop, receiver);
      }
      return this.childProxy[prop];
    }
    deleteProperty(target, prop) {
      if (!target.hasOwnProperty(prop)) {
        return true;
      }
      const val = target[prop];
      if (val[isObjectObserver]) {
        val[parent] = null;
        val[disconnect](this.childCallback[prop]);
      }
      Reflect.deleteProperty(target, prop);
      delete this.childProxy[prop];
      this.revision++;
      this.listener.exec(prop, val, undefined, {target});
      return true;
    }
    dispatch(...args) {
      this.listener.exec(...args);
    }
    add(callback) {
      this.listener.add(callback);
    }
    remove(callback) {
      this.listener.remove(callback);
    }
  }

  class NestedHandler {
    constructor({callback, target}) {
      this.callback = callback;
      this.target = target;
    }
    get (target, prop) {
      switch (prop) {
        case disconnect:
          return () => target[disconnect](this.callback);
      }
      return target[prop];
    }
  }

  const defCallback = (key, newValue, oldValue, details) =>
      window.console.log({key, newValue, oldValue, details});

  const observe = (target, callback, params = {parent: null, path: ''}) => {
    callback = callback || defCallback;
    if (target[isObjectObserver]) {
      target[listen](callback);
      return new Proxy(target, new NestedHandler({callback, target}));
    }
    const _handler = new ObserveHandler(Object.assign(params, {callback, target}));
    const proxy = new Proxy(target, _handler);
    proxy[handler] = _handler;
    proxy[revision] = 0;
    proxy[parent] = params.parent;
    proxy[isObjectObserver] = true;
    proxy[disconnected] = false;
    proxy[dispatch] = (...args) => _handler.dispatch(...args);
    proxy[disconnect] = _callback => {
      _handler.remove(_callback || callback);
      if (!_handler.isEmpty) {
        return;
      }
      proxy[disconnected] = true;
      for (const key of Object.keys(_handler.childProxy)) {
        _handler.childProxy[key][disconnect]();
        delete _handler.childProxy[key];
        delete _handler.bound[key];
      }
    };
    proxy[listen] = callback => _handler.add(callback);
    return proxy;
  };

  const getHandler = proxy => proxy[isObjectObserver] ? proxy[handler] : null;

  const subscribe = (target, subscripter) => {
    const observable = new Observable(o => {
      let changed = {};
      const onNext = bounce.idle(() => {
        const cp = Object.assign({}, changed);
        changed = {};
        o.next(cp);
      });
      const onChange = (key, newValue, oldValue, details) => {
        changed[key] = {newValue, oldValue, details};
        onNext();
      };
      const observer = observe(target, onChange);
      observe(target);
      return observer[disconnect]();
    });
    return observable.subscribe(subscripter);
  };

  return {
    observe,
    getHandler,
    'disconnect': (observer) => observer[disconnect](),
    subscribe
  };
})();
//===END===

// const ObjectSubscriber = (() => {
//   const subscribe = (target) => {
//     let nextFunc = (key, newValue, oldValue = null, details = {}) => {
//       window.console.log('next', {key, newValue, oldValue, details});
//     };

//     const subscribeChild = (child, path = '') => {
//       return Observable.object(child).subscribe((key, newValue, oldValue, details = {}) => {
//         details = details || {};
//         details.path = details.path || [];
//         details.path.push(path);
//         nextFunc(key, newValue, oldValue, details);
//       });
//     };

//     const observer = new Observable(o => {
//       nextFunc = (key, newValue, oldValue = null, details = {}) => {
//         window.console.log('next', {key, newValue, oldValue, details});
//         o.next(key, newValue, oldValue, details);
//       };
//       const p = Observable.proxy(target, (key, newValue, oldValue) => {
//         nextFunc(key, newValue, oldValue, {path: [], target: p});
//       });
//       o.start(p);
//       return () => {
//         p[ObjectObserver.disconnect]();
//       };
//     });

//     for (const key of Object.keys(target)) {
//       const val = target[key];
//       if (val !== null && typeof val === 'object') {
//         subscribeChild(target[key], key);
//       }
//     }
//     return observer;
//   };
//   return {
//     subscribe
//   };
// })();


export {ObjectObserver};

