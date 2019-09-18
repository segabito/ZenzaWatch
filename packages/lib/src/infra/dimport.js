
//===BEGIN===
const dimport = Object.assign(url => {
  if (dimport.map[url]) {
    return dimport.map[url];
  }
  try {
    const now = Date.now();
    const callbackName = `dimport_${now}`;
    const loader = `
      import * as module${now} from "${url}";
      console.log('%cdynamic import from "${url}"',
        'font-weight: bold; background: #333; color: #ff9; display: block; padding: 4px; width: 100%;');
      window.${callbackName}(module${now});
      `.trim();
    window.console.time(`"${url}" import time`);
    const p = new Promise((ok, ng) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.onerror = ng;
      s.append(document.createTextNode(loader));
      s.dataset.import = url;
      window[callbackName] = module => {
        window.console.timeEnd(`"${url}" import time`);
        ok(module);
        delete window[callbackName];
      };
      document.head.append(s);
    });
    dimport.map[url] = p;
    return p;
  } catch (e) {
    console.warn(url, e);
    return Promise.reject(e);
  }
}, {map: {}});
//===END===

export {dimport};
