import {PromiseHandler} from '../Emitter';
//===BEGIN===
// let bid = 0;
const bounce = {
  origin: Symbol('origin'),
  // raf(func) {
  //   let reqId = null;
  //   let lastArgs = null;
  //   let promise = new PromiseHandler();
  //   // let id = bid++;
  //   const callback = () => {
  //     // performance.mark(`bounce.raf.callback:${id}`);
  //     const lastResult = func(...lastArgs);
  //     // performance.mark(`bounce.raf.callback:${id}:end`);
  //     // performance.measure(`exec callback bounce.raf.callback:${id}`,
  //     // `bounce.raf.callback:${id}`, `bounce.raf.callback:${id}:end`);
  //     promise.resolve({lastResult, lastArgs});
  //     reqId = lastArgs = null;
  //     promise = new PromiseHandler();
  //   };

  //   const result =  (...args) => {
  //     // performance.mark(`call0.requestAnimationFrame.bounce.raf:${id}`);
  //     if (reqId) {
  //       cancelAnimationFrame(reqId);
  //     }
  //     lastArgs = args;
  //     reqId = requestAnimationFrame(callback);
  //     // performance.mark(`call1.requestAnimationFrame.bounce.raf:${id}`);
  //     // performance.measure('bounce.requestAnimationFrame',
  //     //   `call0.requestAnimationFrame.bounce.raf:${id}`,
  //     //   `call1.requestAnimationFrame.bounce.raf:${id}`
  //     // );
  //       return promise;
  //   };

  //   result[this.origin] = func;
  //   return result;
  // },
  idle(func, time) {
    let reqId = null;
    let lastArgs = null;
    let promise = new PromiseHandler();

    const [caller, canceller] =
      (time === undefined && self.requestIdleCallback) ?
        [self.requestIdleCallback, self.cancelIdleCallback] : [self.setTimeout, self.clearTimeout];
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
    if (timer) {
      return promise;
    }
    const now = performance.now();
    const timeDiff = now - lastTime;

    timer = setTimeout(() => {
      lastTime = performance.now();
      timer = null;
      const lastResult = func(...args);
      promise.resolve({lastResult, lastArgs: args});
      promise = new PromiseHandler();
    }, Math.max(interval - timeDiff, 0));

    return promise;
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

throttle.time = (func, interval = 0) => throttle(func, interval);


throttle.raf = function(func) {
  let promise;
  let cancelled = false;
  let lastArgs = [];

  const callRaf = res => requestAnimationFrame(res);
  const onRaf = () => this.req = null;
  const onCall = () => {
    if (cancelled) {
      cancelled = false;
      return;
    }
    try { func(...lastArgs); } catch (e) { console.warn(e); }
    promise = null;
  };
  const result = (...args) => {
    lastArgs = args;
    if (promise) {
      return promise;
    }
    if (!this.req) {
      this.req = new Promise(callRaf).then(onRaf);
    }
    promise = this.req.then(onCall);
    return promise;
  };

  result.cancel = () => {
    cancelled = true;
    promise = null;
  };

  return result;
}.bind({req: null, count: 0, id: 0});

// throttle.raf = func => throttle.time(func, 0);

throttle.idle = func => {
  let id;
  const request = (self.requestIdleCallback || self.setTimeout);
  const cancel = (self.cancelIdleCallback || self.clearTimeout);

  const result = (...args) => {
    if (id) {
      return;
    }
    id = request(() => {
      id = null;
      func(...args);
    }, 0);
  };

  result.cancel = () => {
    if (id) {
      id = cancel(id);
    }
  };

  return result;
};

//===END===

export {bounce, throttle};
