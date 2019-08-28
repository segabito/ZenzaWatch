// import * as jQuery from 'jQuery';
// const $ = jQuery.default;
const NicoVideoApi = {ajax: () => {}};

//===BEGIN===
const netUtil = {
  ajax: params => {
    if (location.host !== 'www.nicovideo.jp') {
      return NicoVideoApi.ajax(params);
    }
    return $.ajax(params);
  },
  abortableFetch: (url, params) => {
    params = params || {};
    const racers = [];
    let timer;
    const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
    if (timeout > 0) {
      racers.push(new Promise((resolve, reject) =>
        timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
      );
    }
    const controller = window.AbortController ? (new AbortController()) : null;
    if (controller) {
      params.signal = controller.signal;
    }
    racers.push(fetch(url, params));
    return Promise.race(racers)
      .catch(err => {
        if (err.name === 'timeout') {
          if (controller) {
            controller.abort();
          }
        }
        return Promise.reject(err.message || err);
      }).finally(() => timer = null);
  },
  fetch(url, params) {
    if (location.host !== 'www.nicovideo.jp') {
      return NicoVideoApi.fetch(url, params);
    }
    return this.abortableFetch(url, params);
  },
  jsonp: (() => {
    let callbackId = 0;
    const getFuncName = () => `JsonpCallback${callbackId++}`;

    let cw = null;
    const getFrame = () => {
      if (cw) { return cw; }
      return new Promise(resolve => {
        const iframe = document.createElement('iframe');
        iframe.srcdoc = `
          <html><head></head></html>
        `.trim();
        iframe.sandbox = 'allow-same-origin allow-scripts';
        Object.assign(iframe.style, {
          width: '32px', height: '32px', position: 'fixed', left: '-100vw', top: '-100vh',
          pointerEvents: 'none', overflow: 'hidden'
        });
        iframe.onload = () => {
          cw = iframe.contentWindow;
          resolve(cw);
        };
        (document.body || document.documentElement).append(iframe);
      });
    };

    const createFunc = async (url, funcName) => {
      let timeoutTimer = null;
      const win = await getFrame();
      const doc = win.document;
      const script = doc.createElement('script');
      return new Promise((resolve, reject) => {
        win[funcName] = result => {
          win.clearTimeout(timeoutTimer);
          timeoutTimer = null;
          script.remove();
          delete win[funcName];

          resolve(result);
        };
        timeoutTimer = win.setTimeout(() => {
          script.remove();
          delete win[funcName];
          if (timeoutTimer) {
            reject(new Error(`jsonp timeout ${url}`));
          }
        }, 30000);
        script.src = url;
        doc.head.append(script);
      });
    };

    return (url, funcName) => {
      if (!funcName) {
        funcName = getFuncName();
      }
      url = `${url}${url.includes('?') ? '&' : '?'}callback=${funcName}`;
      return createFunc(url, funcName);
    };
  })()
};

//===END===

export {netUtil};