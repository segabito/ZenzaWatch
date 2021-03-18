//===BEGIN===
const AntiPrototypeJs = function() {
  if (this.promise !== null || !window.Prototype || window.PureArray) {
    return this.promise || Promise.resolve(window.PureArray || window.Array);
  }
  if (document.getElementsByClassName.toString().indexOf('B,A') >= 0) {
    // console.info('%cI don\'t like prototype.js 1.5.x', 'font-family: "Arial Black";');
    delete document.getElementsByClassName;
  }

  const waitForDom = new Promise(resolve => {
    if (['interactive', 'complete'].includes(document.readyState)) {
      return resolve();
    }
    document.addEventListener('DOMContentLoaded', resolve, {once: true});
  });

  const f = Object.assign(document.createElement('iframe'), {
    srcdoc: '<html><title>ここだけ時間が10年遅れてるスレ</title></html>',
    id: 'prototype',
    loading: 'eager'
  });
  Object.assign(f.style, {position: 'absolute', left: '-100vw', top: '-100vh'});
  return this.promise = waitForDom
    .then(() => new Promise(res => {
      f.onload = res;
      document.body.append(f);
    })).then(() => {
      // const PureArray = window.PureArray = f.contentWindow.Array;
      // const PureObject = window.PureObject = f.contentWindow.Object;
      // const decontaminated = [];
			window.PureArray = f.contentWindow.Array;
			delete window.Array.prototype.toJSON;
      delete window.String.prototype.toJSON;
      // 副作用あるかも？
      // for (const o of PureArray('Array', 'String', 'Function', 'Number', 'Element', 'Object')) {
      //   const obj = window[o];
      //   const pobj = f.contentWindow[o];
      //   const protos = PureArray(...Object.getOwnPropertyNames(obj.prototype));
      //   const props  = PureArray(...Object.getOwnPropertyNames(obj));
      //   for (const proto of protos) {
      //     if (o === 'Object') { break; }
      //     const op = PureObject.getOwnPropertyDescriptor(obj.prototype, proto);
      //     const pp = PureObject.getOwnPropertyDescriptor(pobj.prototype, proto);
      //     if (pp) {
      //       if (pp.value !== op.value && pp.value.toString() !== op.value.toString()) {
      //         decontaminated.push(`rollback ${o}.prototype.${proto}`);
      //         obj.prototype[proto] = pp.value;
      //       }
      //     } else if (proto.match(/^to[A-Z]/)) {
      //       decontaminated.push(`delete ${o}.prototype.${proto}`);
      //       delete obj.prototype[proto];
      //     }
      //   }
      //   for (const prop of props) {
      //     const op = PureObject.getOwnPropertyDescriptor(obj, prop);
      //     const pp = PureObject.getOwnPropertyDescriptor(pobj, prop);
      //     if (pp) {
      //       if (pp.value !== op.value && pp.value.toString() !== op.value.toString()) {
      //         decontaminated.push(`rollback ${o}.${prop}`);
      //         obj[prop] = pp.value;
      //       }
      //     } else if (prop.match(/^to[A-Z]/)) {
      //       decontaminated.push(`delete ${o}.${prop}`);
      //       delete obj[prop];
      //     }
      //   }

      // }
      // console.info('Decontamination result', decontaminated);
      f.remove();
      return Promise.resolve(window.PureArray);
    }).catch(err => console.error(err));
}.bind({promise: null});
//===END===

export {AntiPrototypeJs};