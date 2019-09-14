//===BEGIN===
const AntiPrototypeJs = function() {
  if (this.promise || !window.Prototype || window.PureArray) {
    return this.promise || Promise.resolve(window.PureArray || window.Array);
  }
  if (document.getElementsByClassName.toString().indexOf('B,A') >= 0) {
    console.info('%cI don\'t like prototype.js 1.5.x', 'font-family: "Arial Black";');
    delete document.getElementsByClassName;
  }
  // window.jQuery && !window.jQuery.browser && window.jQuery.noConflict(true);
  const f = document.createElement('iframe');
  f.srcdoc = '<html><title>ここだけ時間が10年遅れてるスレ</title></html>';
  f.id = 'prototype';
  f.loading = 'eager';
  Object.assign(f.style, { position: 'absolute', left: '-100vw', top: '-100vh' });
  return this.promise = new Promise(res => {
    f.onload = res;
    document.documentElement.append(f);
  }).then(() => {
    window.PureArray = f.contentWindow.Array;
    // 副作用あるかも？
    delete window.Array.prototype.toJSON;
    delete window.String.prototype.toJSON;
    f.remove();
    return Promise.resolve(window.PureArray);
  }).catch(err => console.error(err));
}.bind({promise: null});
//===END===

export {AntiPrototypeJs};