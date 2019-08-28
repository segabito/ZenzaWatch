//===BEGIN===
const MylistPocketDetector = (() => {
  const promise =
  (window.MylistPocket && window.MylistPocket.isReady) ?
    Promise.resolve(window.MylistPocket) :
    new Promise(resolve => {
      [window, (document.body || document.documentElement)]
        .forEach(e => e.addEventListener('MylistPocketInitialized', () => {
          resolve(window.MylistPocket);
        }, {once: true}));
    });
  return {detect: () => promise};
})();

//===END===
export {MylistPocketDetector};