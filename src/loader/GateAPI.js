//===BEGIN===

const GateAPI = (() => {
  let xmlHttp = function (options) {
    try {
      //window.console.log('xmlHttp bridge: ', options.url, options);
      let req = new XMLHttpRequest();
      let method = options.method || options.type || 'GET';
      let xhrFields = options.xhrFields || {};

      if (xhrFields.withCredentials === true) {
        req.withCredentials = true;
      }

      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          if (typeof options.onload === 'function') options.onload(req);
        }
      };
      req.open(method, options.url, true);

      if (options.headers) {
        for (let h in options.headers) {
          req.setRequestHeader(h, options.headers[h]);
        }
      }

      req.send(options.data || null);
    } catch (e) {
      window.console.error(e);
    }
  };

  let parentPostMessage = function (type, message, token) {
    let origin = document.referrer;
    try {
      parent.postMessage(JSON.stringify({
          id: 'ZenzaWatch',
          type: type, // '',
          body: {
            token: token,
            url: location.href,
            message: message
          }
        }),
        origin);
    } catch (e) {
      alert(e);
      console.log('err', e);
    }
  };

  const parseUrl = (url) => {
    const a = document.createElement('a');
    a.href = url;
    return a;
  };

  const isNicoServiceHost = url => {
    const host = parseUrl(url).hostname;
    return /(^[a-z0-9.-]*\.nicovideo\.jp$|^[^.]*\.nico$)/.test(host);
  };

  let loadUrl = function (data, type, token) {
    let timeoutTimer = null, isTimeout = false;

    if (!data.url) {
      return;
    }
    if (!isNicoServiceHost(data.url)) {
      return;
    }

    let options = data.options || {};
    let sessionId = data.sessionId;
    xmlHttp({
      url: data.url,
      method: options.method || options.type || 'GET',
      data: options.data,
      headers: options.headers || [],
      xhrFields: options.xhrFields,
      onload: function (resp) {

        if (isTimeout) {
          return;
        }
        else {
          window.clearTimeout(timeoutTimer);
        }

        try {
          parentPostMessage(type, {
            sessionId: sessionId,
            status: 'ok',
            token: token,
            command: data.command,
            url: data.url,
            body: resp.responseText
          });
        } catch (e) {
          console.log(
            '%cError: parent.postMessage - ',
            'color: red; background: yellow',
            e, event.origin, event.data);
        }
      }
    });

    timeoutTimer = window.setTimeout(function () {
      isTimeout = true;
      parentPostMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrl',
        url: data.url
      });
    }, 30000);
  };

  const loadUrlByFetch = function (data, type, token) {
    let timeoutTimer = null, isTimeout = false;
    const url = data.url;

    if (!isNicoServiceHost(url)) {
      return Promise.reject();
    }
    const options = data.options;
    const sessionId = data.sessionId;

    fetch(url, options).then((resp) => {
      return resp.text();
    }).then(text => {
      if (isTimeout) {
        return;
      }
      else {
        window.clearTimeout(timeoutTimer);
      }
      try {
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'ok',
          token: token,
          command: data.command,
          url: data.url,
          body: text
        });
      } catch (e) {
        console.log(
          '%cError: parent.postMessage - ',
          'color: red; background: yellow',
          e, event.origin, event.data);
      }
    });

    timeoutTimer = window.setTimeout(() => {
      isTimeout = true;
      parentPostMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrlByFetch',
        url: data.url
      });
    }, 30000);
  };

  const HOST_REG = /^[a-z0-9]*\.nicovideo\.jp$/;

  let thumbInfo = function () {
    if (window.name.indexOf('thumbInfoLoader') < 0) {
      return;
    }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    let type = 'thumbInfo';
    let token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    window.addEventListener('message', function (event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
        return;
      }
      let data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      //var command = data.command;

      if (data.token !== token) {
        return;
      }

      if (!data.url) {
        return;
      }
      let sessionId = data.sessionId;
      xmlHttp({
        url: data.url,
        onload: function (resp) {

          if (isTimeout) {
            return;
          }
          else {
            window.clearTimeout(timeoutTimer);
          }

          try {
            parentPostMessage(type, {
              sessionId: sessionId,
              status: 'ok',
              token: token,
              url: data.url,
              body: resp.responseText
            });
          } catch (e) {
            console.log(
              '%cError: parent.postMessage - ',
              'color: red; background: yellow',
              e, event.origin, event.data);
          }
        }
      });

      timeoutTimer = window.setTimeout(function () {
        isTimeout = true;
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          url: data.url
        });
      }, 30000);

    });

    try {
      parentPostMessage(type, {status: 'initialized'});
    } catch (e) {
      console.log('err', e);
    }
  };

  let nicovideo = function () {
    if (window.name.indexOf('nicovideoApiLoader') < 0) {
      return;
    }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    let parentHost = parseUrl(document.referrer).hostname;
    window.console.log('parentHost', parentHost);
    if (!HOST_REG.test(parentHost) &&
      localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
      window.console.log('disable bridge');
      return;
    }
    window.console.log('enable bridge');


    let isOk = false;
    let type = 'nicovideoApi';
    let token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    let pushHistory = function (path) {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, null, path);
    };

    let PREFIX = 'ZenzaWatch_';
    let dumpConfig = function (data) {
      if (!data.keys) {
        return;
      }
      let prefix = PREFIX;
      let config = {};
      let sessionId = data.sessionId;

      data.keys.forEach((key) => {
        let storageKey = prefix + key;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
            //window.console.log('dump config: %s = %s', key, config[key]);
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });

      try {
        parentPostMessage(type, {
          sessionId: sessionId,
          status: 'ok',
          token: token,
          command: data.command,
          body: config
        });
      } catch (e) {
        console.log(
          '%cError: parent.postMessage - ',
          'color: red; background: yellow',
          e, event.origin, event.data);
      }
    };

    let saveConfig = function (data) {
      if (!data.key) {
        return;
      }
      let prefix = PREFIX;
      let storageKey = prefix + data.key;
      //window.console.log('bridge save config: %s = %s', storageKey, data.value);
      localStorage.setItem(storageKey, JSON.stringify(data.value));
    };

    window.addEventListener('message', function (event) {
      //window.console.log('nicovideoApiLoaderWindow.onMessage origin="%s"', event.origin, event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
        return;
      }
      let data = JSON.parse(event.data), command = data.command;

      if (data.token !== token) {
        window.console.log('invalid token: ', data.token, token, command);
        return;
      }

      switch (command) {
        case 'ok':
          window.console.info('initialize ok!');
          isOk = true;
          break;
        case 'loadUrl':
          loadUrl(data, type, token);
          break;
        case 'fetch':
          loadUrlByFetch(data, type, token);
          break;
        case 'dumpConfig':
          dumpConfig(data);
          break;
        case 'saveConfig':
          saveConfig(data);
          break;
        case 'pushHistory':
          pushHistory(data.path, data.title);
          break;
      }
    });

    let onStorage = function (e) {
      let key = e.key || '';
      if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) {
        return;
      }

      key = key.replace('ZenzaWatch_', '');
      let oldValue = e.oldValue;
      let newValue = e.newValue;
      //asyncEmitter.emit('change', key, newValue, oldValue);
      if (oldValue === newValue) {
        return;
      }
      if (!isOk) {
        return;
      }

      parentPostMessage(type, {
        command: 'configSync',
        token: token,
        key: key,
        value: newValue
      });

      switch (key) {
        case 'message':
          //console.log('%cmessage', 'background: cyan;', newValue);
          parentPostMessage(type, {command: 'message', value: newValue, token: token});
          break;
      }
    };


    let onBroadcastMessage = function (e) {
      const packet = e.data;
      //window.console.log('%cmessage', 'background: cyan;', packet);
      if (!isOk) {
        return;
      }

      parentPostMessage(type, {command: 'message', value: JSON.stringify(packet), token: token});
    };

    let broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel('ZenzaWatch')) : null;
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);


    try {
      parentPostMessage(type, {status: 'initialized'});
    } catch (e) {
      console.log('err', e);
    }
  };


  let smile = function () {
    if (window.name.indexOf('storyboard') < 0) {
      return;
    }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    const videoCapture = function (src, sec) {
      return new Promise((resolve, reject) => {
        //console.log('videoCapture', src, sec);
        let resolved = false;
        const v = document.createElement('video');

        v.addEventListener('loadedmetadata', () => {
          v.currentTime = sec;
        });
        v.addEventListener('error', (err) => {
          v.remove();
          return reject(err);
        });

        const onSeeked = () => {
          if (resolved) {
            return;
          }
          const c = document.createElement('canvas');
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(v, 0, 0);
          v.remove();

          resolved = true;
          return resolve(c);
        };

        v.addEventListener('seeked', onSeeked);

        document.body.appendChild(v);
        v.volume = 0;
        v.autoplay = false;
        v.controls = false;
        v.src = src;
        v.currentTime = sec;
      });
    };

    window.addEventListener('message', function (event) {
      const data = JSON.parse(event.data);
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
        return;
      }

      if (data.token !== token) {
        return;
      }

      const command = data.command;
      const sessionId = data.sessionId;
      switch (command) {
        case 'videoCapture':
          videoCapture(data.src, data.sec).then(canvas => {
            const dataUrl = canvas.toDataURL('image/png');
            //console.info('video capture success', dataUrl.length);
            parentPostMessage(type, {
              sessionId,
              status: 'ok',
              token,
              command,
              body: dataUrl
            });
          });
          break;
      }
    });

    try {
      //window.console.log('%cpost initialized:', 'font-weight: bolder;', type);
      parentPostMessage(type, {status: 'initialized'});
    } catch (e) {
      console.log('err', e);
    }

  };

  const search = function () {
    if (window.name.indexOf('search') < 0) {
      return;
    }
    console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    let parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    window.addEventListener('message', (event) => {
      if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
        return;
      }
      const data = JSON.parse(event.data);

      if (data.token !== token) {
        return;
      }

      if (!data.url) {
        return;
      }

      loadUrlByFetch(data, type, token);
    });

    try {
      parentPostMessage(type, {status: 'initialized'});
    } catch (e) {
      console.log('err', e);
    }
  };

  return {
    thumbInfo,
    nicovideo,
    smile,
    search
  };
})();

//===END===


export {GateAPI};