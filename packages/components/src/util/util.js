const util = {};
//===BEGIN===


Object.assign(util, {
  secToTime: sec => {
    let m = Math.floor(sec / 60).toString().padStart(2, '0');
    let s = (Math.floor(sec) % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },
  dimport: url => {
    const now = Date.now();
    const callbackName = `dimport_${now}`;
    const loader = `
      import * as module${now} from "${url}";
      window.${callbackName}(module${now});
      `.trim();
    return new Promise((res) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.appendChild(document.createTextNode(loader));
      s.dataset.import = url;
      window[callbackName] = (module) => {
        res(module);
        delete window[callbackName];
      };
      document.head.appendChild(s);
    });
  }
});

//===END===

export {util};