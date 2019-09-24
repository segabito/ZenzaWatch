import {PromiseHandler} from '../Emitter';
//===BEGIN===
const bounce = {
  origin: Symbol('origin'),
  raf(func) {
    let reqId = null;
    let lastArgs = null;
    let promise = new PromiseHandler();
    const callback = () => {
      const lastResult = func(...lastArgs);
      promise.resolve({lastResult, lastArgs});
      reqId = lastArgs = null;
      promise = new PromiseHandler();
    };
    const result =  (...args) => {
      if (reqId) {
        cancelAnimationFrame(reqId);
      }
      lastArgs = args;
      reqId = requestAnimationFrame(callback);
      return promise;
    };
    result[this.origin] = func;
    return result;
  },
  idle(func, time) {
    let reqId = null;
    let lastArgs = null;
    let promise = new PromiseHandler();

    const [caller, canceller] =
      (time === undefined && window.requestIdleCallback) ?
      [window.requestIdleCallback, window.cancelIdleCallback] : [window.setTimeout, window.clearTimeout];
    const callback = () => {
      const lastResult = func(...lastArgs);
      promise.resolve({lastResult, lastArgs});
      reqId = lastArgs = null;
      promise = new PromiseHandler();
    };
    const result = (...args) => {
      if (reqId) {
        reqId = canceller(reqId);
      }
      lastArgs = args;
      reqId = caller(callback, time);
      return promise;
    };
    result[this.origin] = func;
    return result;
  },
  time(func, time = 0) {
    return this.idle(func, time);
  }
};
const throttle = (func, interval) => {
  let lastTime = 0;
  let timer;
  let promise = new PromiseHandler();
  const result = (...args) => {
    const now = performance.now();
    const timeDiff = now - lastTime;

    if (timeDiff < interval) {
      if (!timer) {
        timer = setTimeout(() => {
          lastTime = performance.now();
          timer = null;
          const lastResult = func(...args);
          promise.resolve({lastResult, lastArgs: args});
          promise = new PromiseHandler();
        }, Math.max(interval - timeDiff, 0));
      }
      return;
    }

    if (timer) {
      timer = clearTimeout(timer);
    }
    lastTime = now;
    const lastResult = func(...args);
    promise.resolve({lastResult, lastArgs: args});
    promise = new PromiseHandler();
};
  result.cancel = () => {
    if (timer) {
      timer = clearTimeout(timer);
    }
    promise.resolve({lastResult: null, lastArgs: null});
    promise = new PromiseHandler();
  };
  return result;
};

//===END===

export {bounce, throttle};
