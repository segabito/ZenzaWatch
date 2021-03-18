import {Handler, PromiseHandler} from '../Emitter';

//===BEGIN===
const Observable = (() => {
  // if (window.Observable) {
  //   return window.Observable;
  // }
  const observableSymbol = Symbol.observable || Symbol('observable');
  const nop = Handler.nop;
  class Subscription {
    constructor({observable, subscriber, unsubscribe, closed}) {
      this.callbacks = {unsubscribe, closed};
      this.observable = observable;
      const next = subscriber.next.bind(subscriber);
      subscriber.next = args => {
        if (this.closed || (this._filterFunc && !this._filterFunc(args))) {
          return;
        }
        return this._mapFunc ? next(this._mapFunc(args)) : next(args);
      };
      this._closed = false;
    }
    subscribe(subscriber, onError, onCompleted) {
      return this.observable.subscribe(subscriber, onError, onCompleted)
        .filter(this._filterFunc)
        .map(this._mapFunc);
    }
    unsubscribe() {
      this._closed = true;
      if (this.callbacks.unsubscribe) {
        this.callbacks.unsubscribe();
      }
      return this;
    }
    dispose() {
      return this.unsubscribe();
    }
    filter(func) {
      const _func = this._filterFunc;
      this._filterFunc = _func ? (arg => _func(arg) && func(arg)) : func;
      return this;
    }
    map(func) {
      const _func = this._mapFunc;
      this._mapFunc = _func ? arg => func(_func(arg)) : func;
      return this;
    }
    get closed() {
      if (this.callbacks.closed) {
        return this._closed || this.callbacks.closed();
      } else {
        return this._closed;
      }
    }
  }

  class Subscriber {
    static create(onNext = null, onError = null, onCompleted = null) {
      if (typeof onNext === 'function') {
        return new this({
          next: onNext,
          error: onError,
          complete: onCompleted
        });
      }
      return new this(onNext || {});
    }
    constructor({start, next, error, complete} = {start:nop, next:nop, error:nop, complete:nop}) {
      this.callbacks = {start, next, error, complete};
    }
    start(arg) {this.callbacks.start(arg);}
    next(arg) {this.callbacks.next(arg);}
    error(arg) {this.callbacks.error(arg);}
    complete(arg) {this.callbacks.complete(arg);}
    get closed() {
      return this._callbacks.closed ? this._callbacks.closed() : false;
    }
  }
  Subscriber.nop = {start: nop, next: nop, error: nop, complete: nop, closed: nop};

  const eleMap = new WeakMap();
  class Observable {
    static of(...args) {
      return new this(o => {
        for (const arg of args) {
          o.next(arg);
        }
        o.complete();
        return () => {};
      });
    }
    static from(arg) {
      if (arg[Symbol.iterator]) {
        return this.of(...arg);
      } else if (arg[Observable.observavle]) {
        return arg[Observable.observavle]();
      }
    }
    static fromEvent(element, eventName) {
      const em = eleMap.get(element) || {};
      if (em && em[eventName]) {
        return em[eventName];
      }
      eleMap.set(element, em);
      return em[eventName] = new this(o => {
        const onUpdate = e => o.next(e);
        element.addEventListener(eventName, onUpdate, {passive: true});
        return () => element.removeEventListener(eventName, onUpdate);
      });
    }
    static interval(ms) {
      return new this(function(o) {
        const timer = setInterval(() => o.next(this.i++), ms);
        return () => clearInterval(timer);
      }.bind({i: 0}));
    }
    constructor(subscriberFunction) {
      this._subscriberFunction = subscriberFunction;
      this._completed = false;
      this._cancelled = false;
      this._handlers = new Handler();
    }
    _initSubscriber() {
      if (this._subscriber) {
        return;
      }
      const handlers = this._handlers;
      this._completed = this._cancelled = false;
      return this._subscriber = new Subscriber({
        start: arg => handlers.execMethod('start', arg),
        next: arg => handlers.execMethod('next', arg),
        error: arg => handlers.execMethod('error', arg),
        complete: arg => {
          if (this._nextObservable) {
            this._nextObservable.subscribe(this._subscriber);
            this._nextObservable = this._nextObservable._nextObservable;
          } else {
            this._completed = true;
            handlers.execMethod('complete', arg);
          }
        },
        closed: () => this.closed
      });
    }
    get closed() {
      return this._completed || this._cancelled;
    }
    filter(func) {
      return this.subscribe().filter(func);
    }
    map(func) {
      return this.subscribe().map(func);
    }
    concat(arg) {
      const observable = Observable.from(arg);
      if (this._nextObservable) {
        this._nextObservable.concat(observable);
      } else {
        this._nextObservable = observable;
      }
      return this;
    }
    forEach(callback) {
      let p = new PromiseHandler();
      callback(p);
      return this.subscribe({
        next: arg => {
          const lp = p;
          p = new PromiseHandler();
          lp.resolve(arg);
          callback(p);
        },
        error: arg => {
          const lp = p;
          p = new PromiseHandler();
          lp.reject(arg);
          callback(p);
      }});
    }
    onStart(arg) { this._subscriber.start(arg); }
    onNext(arg) { this._subscriber.next(arg); }
    onError(arg) { this._subscriber.error(arg); }
    onComplete(arg) { this._subscriber.complete(arg);}
    disconnect() {
      if (!this._disconnectFunction) {
        return;
      }
      this._closed = true;
      this._disconnectFunction();
      delete this._disconnectFunction;
      this._subscriber;
      this._handlers.clear();
    }
    [observableSymbol]() {
      return this;
    }
    subscribe(onNext = null, onError = null, onCompleted = null) {
      this._initSubscriber();
      const isNop = [onNext, onError, onCompleted].every(f => f === null);
      const subscriber = Subscriber.create(onNext, onError, onCompleted);
      return this._subscribe({subscriber, isNop});
    }
    _subscribe({subscriber, isNop}) {

      if (!isNop && !this._disconnectFunction) {
        this._disconnectFunction = this._subscriberFunction(this._subscriber);
      }

      !isNop && this._handlers.add(subscriber);

      return new Subscription({
        observable: this,
        subscriber,
        unsubscribe: () => {
          if (isNop) { return; }
          this._handlers.remove(subscriber);
          if (this._handlers.isEmpty) {
            this.disconnect();
          }
        },
        closed: () => this.closed
      });
    }
  }

  Observable.observavle = observableSymbol;

  return Observable;
})();

const WindowResizeObserver = Observable.fromEvent(window, 'resize')
  .map(o => { return {width: window.innerWidth, height: window.innerHeight}; });
//===END===

export {Observable, WindowResizeObserver};

// _subscribe({subscriber, isNop}) {
//   const complete = subscriber.complete;
//   subscriber.complete = (...args) => {
//     this._completed = true;
//     complete(...args);
//   };
//   const disconnectFunction = isNop ? nop : this._subscriberFunction(subscriber);
//   this._disconnectors ?
//     this._disconnectors.add(disconnectFunction) :
//     (this._disconnectors = Handler.of(disconnectFunction));
//   this._members ? this._members.add(subscriber) : (this._members = Handler.of(subscriber));
//   return new Subscription({
//     observable: this,
//     subscriber,
//     unsubscribe: disconnectFunction,
//     closed: () => this.closed
//   });
// }

// disconnect() {
//   this._closed = true;
//   if (this._disconnectors) {
//     this._disconnectors.exec();
//     this._disconnectors.clear();
//   }
//   this._members && this._members.clear();
// }

// static fromEvent(element, eventName) {
//   return new this(o => {
//     const onUpdate = e => {
//       const val = {};
//       for (const key of Object.getOwnPropertyNames(e)) {
//         const v = e[key];
//         if (typeof v === 'function') { continue; }
//         val[key] = v;
//       }
//       o.next(val);
//     }
//     element.addEventListener(eventNName, onUpdate, {passive: true});
//     return () => element.removeEventListener(eventName, onUpdate);
//   });
// }
