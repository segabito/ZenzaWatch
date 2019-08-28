//===BEGIN===
const AntiPrototypeJs = function() {
  if (this.promise || !window.Prototype || window.PureArray) {
    return this.promise || Promise.resolve(window.PureArray || window.Array);
  }
  const f = document.createElement('iframe');
  f.srcdoc = '<html><title>ここだけ時間が10年遅れてるスレ</title></html>';
  Object.assign(f.style, { position: 'absolute', left: '-100vw', top: '-100vh' });
  return this.promise = new Promise(res => {
    f.onload = res;
    document.documentElement.append(f);
  }).then(() => {
    window.PureArray = f.contentWindow.Array;
    // 副作用あるかも？
    delete window.Array.prototype.toJSON;
    delete window.Array.prototype.toJSON;
    delete window.String.prototype.toJSON;
    f.remove();
    return Promise.resolve(window.PureArray);
  });
}.bind({promise: null});
//===END===

export {AntiPrototypeJs};