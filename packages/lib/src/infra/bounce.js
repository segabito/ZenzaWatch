//===BEGIN===
const bounce = {
  origin: Symbol('origin'),
  raf(func) {
    let reqId = null;
    let lastArgs = null;
    const callback = () => {
      func(...lastArgs);
      reqId = lastArgs = null;
    };
    const result =  (...args) => {
      if (reqId) {
        cancelAnimationFrame(reqId);
      }
      lastArgs = args;
      reqId = requestAnimationFrame(callback);
    };
    result[this.origin] = func;
    return result;
  },
  idle(func, time) {
    let reqId = null;
    let lastArgs = null;
    const [caller, canceller] =
      (time === undefined && window.requestIdleCallback) ?
      [window.requestIdleCallback, window.cancelIdleCallback] : [window.setTimeout, window.clearTimeout];
    const callback = () => {
      reqId = null;
      func(...lastArgs);
      lastArgs = null;
    };
    const result = (...args) => {
      if (reqId) {
        reqId = canceller(reqId);
      }
      lastArgs = args;
      reqId = caller(callback, time);
    };
    result[this.origin] = func;
    return result;
  },
  time(func, time = 0) {
    return this.idle(func, time);
  }
};
//===END===

export {bounce};
