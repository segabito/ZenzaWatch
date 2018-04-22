
new Promise(resolve => {
  if (window.ZenzaWatch && window.ZenzaWatch.ready) {
    return resolve(window.ZenzaWatch);
  }
  document.body.addEventListener('ZenzaWatchInitialize', () => resolve(window.ZenzaWatch));
}).then(ZenzaWatch => {

  let assert = window.assert || {
    equal: (a, b, msg = '') => {
      if (a !== b) {
        console.error('fail', a, b, msg);
      } else {
        console.log('ok', a, b, msg);
      }
    }
  };

  ZenzaWatch.test = Object.assign({}, ZenzaWatch.test, {e2e: {}});
  Promise.all([
    import(`./utilTest.js?${Math.random()}`).then(({test}) => {
      // console.info('test test', $test);
      ZenzaWatch.test.e2e.util = () => {
        test({assert, ZenzaWatch});
      };
    })
  ]).then(() => {
    console.info('test ready');
  });

  ZenzaWatch.test.exec = () => {
    for (let name of Object.keys(ZenzaWatch.test.e2e)) {
      console.info('%crun test: %s', 'font-weight: bold;', name);
      ZenzaWatch.test.e2e[name]();
    }
  };


});
