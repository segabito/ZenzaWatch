import {Emitter} from '../../../../src/baselib.js';
import {MylistPocketDetector} from '../../../zenza/src/init/MylistPocketDetector';
//===BEGIN===

const ZenzaDetector = (() => {
  const promise =
    (window.ZenzaWatch && window.ZenzaWatch.ready) ?
      Promise.resolve(window.ZenzaWatch) :
      new Promise(resolve => {
        [window, (document.body || document.documentElement)]
          .forEach(e => e.addEventListener('ZenzaWatchInitialize', () => {
            resolve(window.ZenzaWatch);
          }));
      });
  return {detect: () => promise};
})();


//===END===

export {ZenzaDetector, MylistPocketDetector};

// const MylistPocketDetector = (() => {
//   let isReady = false;
//   let pocket = null;
//   const emitter = new Emitter();

//   const initialize = () => {
//     const onPocketReady = () => {
//       isReady = true;
//       pocket = window.MylistPocket;

//       emitter.emit('ready', pocket);
//     };

//     if (window.MylistPocket && window.MylistPocket.isReady) {
//       onPocketReady();
//     } else {
//       document.body.addEventListener('MylistPocketInitialized', () => {
//         onPocketReady();
//       }, {once: true});
//     }
//   };

//   const detect = () => {
//     return new Promise(res => {
//       if (isReady) {
//         return res(pocket);
//       }
//       emitter.once('ready', () => {
//         res(pocket);
//       });
//     });
//   };

//   initialize();
//   return {
//     detect: detect
//   };

// })();

