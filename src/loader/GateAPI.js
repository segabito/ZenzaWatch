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
      console.error(
        '%cError: parent.postMessage - ',
        'color: red; background: yellow',
        e);
    }
  };

  const parseUrl = (url) => {
    const a = document.createElement('a');
    a.href = url;
    return a;
  };

  const isNicoServiceHost = url => {
    const host = parseUrl(url).hostname;
    return /(^[a-z0-9.-]*\.nicovideo\.jp$|^[a-z0-9.-]*\.nico(|:[0-9]+)$)/.test(host);
  };

  const isWhiteHost = url => {
    if (isNicoServiceHost(url)) {
      return true;
    }
    const u = parseUrl(url);
    if (u.protocol !== 'https:') { return false; }
    const host = u.hostname;
    return [
      'google.com',
      'www.google.co.jp',
      'twitter.com',
      'friends.nico',
    ].includes(host);
  };

  let loadUrl = function (data, type, token) {
    let timeoutTimer = null, isTimeout = false;

    if (!data.url) {
      return;
    }
    if (!isWhiteHost(data.url)) {
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

    timeoutTimer = window.setTimeout(() => {
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
    // let timeoutTimer = null, isTimeout = false;
    const url = data.url;

    const sessionId = data.sessionId;
    const result = {
      sessionId,
      token,
      command: data.command,
      url
    };

    if (!isWhiteHost(url)) {
      return Promise.reject();
    }

    const params = data.options || {};

    const racers = [];

    const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
    if (timeout > 0) {
      racers.push(new Promise((resolve, reject) => {
          setTimeout(() => {
            reject({name: 'timeout'});
          }, timeout);
        })
      );
    }

    const controller = window.AbortController ? (new AbortController()) : null;
    if (controller) {
      params.signal = controller.signal;
    }

    racers.push(window.fetch(url, params));
    return Promise.race(racers).then(resp => {
      return resp.text();
    }).then(text => {
      parentPostMessage(type, Object.assign(result, {
        status: 'ok',
        body: text
      }));
    }).catch(err => {
      if (err && err.name === 'timeout') {
        if (controller) {
          console.warn('request timeout');
          controller.abort();
        }
        result.status = 'timeout';
      } else {
        result.status = 'fail';
      }
      parentPostMessage(type, result);
    });
  };


  let thumbInfo = function () {
    if (window.name.indexOf('thumbInfoLoader') < 0) {
      return;
    }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    if (!isWhiteHost(document.referrer)) {
      window.console.log('disable bridge');
      return;
    }

    let type = 'thumbInfo';
    let token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    window.addEventListener('message', function (event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      if (!isWhiteHost(event.origin)) {
      // if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
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

    const parentHost = parseUrl(document.referrer).hostname;
    window.console.log('parentHost', parentHost);
    //if (!HOST_REG.test(parentHost) &&
    if (!isWhiteHost(document.referrer) &&
      localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
      window.console.log('disable bridge');
      return;
    }
    window.console.log('enable bridge');


    let isOk = false;
    const apiType = 'nicovideoApi';
    const token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    const pushHistory = (path, title = '') => {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, null, path);
      if (title) {
        document.title = title;
      }
    };

    const PREFIX = 'ZenzaWatch';
    const dumpConfig = (data) => {
      if (!data.keys) {
        return;
      }
      const prefix = PREFIX;
      const config = {};
      const sessionId = data.sessionId;

      data.keys.forEach(key => {
        let storageKey = `${prefix}_${key}`;
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });

      parentPostMessage(apiType, {
        sessionId,
        status: 'ok',
        token,
        command: data.command,
        body: config
      });
    };

    const saveConfig = data => {
      if (!data.key) {
        return;
      }
      const storageKey = `${PREFIX}_${data.key}`;
      //window.console.log('bridge save config: %s = %s', storageKey, data.value);
      localStorage.setItem(storageKey, JSON.stringify(data.value));
    };

    window.addEventListener('message', event => {
      // window.console.log('nicovideoApiLoaderWindow.onMessage origin="%s"', event.origin, event.data);
      if (!isWhiteHost(event.origin)) {
        // if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
        return;
      }
      const data = JSON.parse(event.data);
      const command = data.command;

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
          return loadUrl(data, apiType, token);
        case 'fetch':
          return loadUrlByFetch(data, apiType, token);
        case 'dumpConfig':
          return dumpConfig(data);
        case 'saveConfig':
          return saveConfig(data);
        case 'pushHistory':
          return pushHistory(data.path, data.title);
      }
    });

    const onStorage = e => {
      let key = e.key || '';
      if (e.type !== 'storage' || key.indexOf(`${PREFIX}_`) !== 0) {
        return;
      }

      key = key.replace(`${PREFIX}_`, '');
      const oldValue = e.oldValue;
      const newValue = e.newValue;
      if (oldValue === newValue) {
        return;
      }
      if (!isOk) {
        return;
      }

      parentPostMessage(apiType, {
        command: 'configSync',
        token: token,
        key: key,
        value: newValue
      });

      switch (key) {
        case 'message':
          //console.log('%cmessage', 'background: cyan;', newValue);
          return parentPostMessage(apiType, {command: 'message', value: newValue, token: token});
      }
    };


    const onBroadcastMessage = e => {
      const packet = e.data;
      if (!isOk) {
        return;
      }

      parentPostMessage(apiType, {command: 'message', value: JSON.stringify(packet), token: token});
    };

    const broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel(PREFIX)) : null;
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);

    parentPostMessage(apiType, {status: 'initialized'});
  };


  let smile = function () {
    if (window.name.indexOf('storyboard') < 0) {
      return;
    }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    // let parentHost = parseUrl(document.referrer).hostname;
    if (!isWhiteHost(document.referrer)) {    // if (!HOST_REG.test(parentHost)) {
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
      if (!isWhiteHost(event.origin)) {
        // if (!HOST_REG.test(parseUrl(event.origin).hostname)) {
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

    parentPostMessage(type, {status: 'initialized'});
  };

  const search = function () {
    if (window.name.indexOf('search') < 0) {
      return;
    }
    console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    if (!isWhiteHost(document.referrer)) {
      console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    window.addEventListener('message', (event) => {
      if (!isWhiteHost(event.origin)) {
        window.console.warn('not white host', event.origin);
        return;
      }
      const data = JSON.parse(event.data);

      if (data.token !== token) {
        return;
      }

      if (data.command !== 'fetch') {
        return;
      }

      if (!data.url) {
        return;
      }

      if (parseUrl(data.url).hostname !== location.host) {
        return;
      }

      data.options = data.options || {};
      delete data.options.credentials;

      loadUrlByFetch(data, type, token);
    });

    parentPostMessage(type, {status: 'initialized'});
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
