
//===BEGIN===
const sleep = Object.assign(function(time = 0) {
    return new Promise(res => setTimeout(res, time));
  },{
  idle: (() => {
    if (window.requestIdleCallback) {
      return () => new Promise(res => requestIdleCallback(res));
    }
    return () => new Promise(res => setTimeout(res, 0));
  }),
  raf: () => new Promise(res => requestAnimationFrame(res)),
  promise: () => Promise.resolve()
});
//===END===
export {sleep};