var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};

//===BEGIN===

  var xmlHttp = function(options) {
    try {
      //window.console.log('xmlHttp bridge: ', options.url, options);
      var req = new XMLHttpRequest();
      var method = options.method || options.type || 'GET';
      var xhrFields = options.xhrFields || {};

      if (xhrFields.withCredentials === true) {
        req.withCredentials = true;
      }

      req.onreadystatechange = function() {
        if (req.readyState === 4) {
          if (typeof options.onload === 'function') options.onload(req);
        }
      };
      req.open(method, options.url, true);

      if (options.headers) {
        for (var h in options.headers) {
          req.setRequestHeader(h, options.headers[h]);
        }
      }

      req.send(options.data || null);
    } catch (e) {
      window.console.error(e);
    }
  };

  var parentPostMessage = function(type, message, token) {
    var origin = document.referrer;
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

  var parseQuery = function(query) {
    var result = {};
    query.split('&').forEach(function(item) {
      var sp = item.split('=');
      var key = sp[0];
      var val = decodeURIComponent(sp.slice(1).join('='));
      result[key] = val;
    });
    return result;
  };

  var loadUrl = function(data, type, token) {
    var timeoutTimer = null, isTimeout = false;

    if (!data.url) { return; }

    var options = data.options || {};
    var sessionId = data.sessionId;
    xmlHttp({
      url:     data.url,
      method:  options.method || options.type || 'GET',
      data:    options.data,
      headers: options.headers || [],
      xhrFields: options.xhrFields,
      onload: function(resp) {

        if (isTimeout) { return; }
        else { window.clearTimeout(timeoutTimer); }

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

    timeoutTimer = window.setTimeout(function() {
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

  const loadUrlByFetch = function(data, type, token) {
    let timeoutTimer = null, isTimeout = false;

    const url     = data.url;
    const options = data.options;
    const sessionId = data.sessionId;

    fetch(url, options).then((resp) => {
      return resp.text();
    }).then(text => {
      if (isTimeout) { return; }
      else { window.clearTimeout(timeoutTimer); }
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

  const hostReg = /^[a-z0-9]*\.nicovideo\.jp$/;


  var thumbInfoApi = function() {
    if (window.name.indexOf('thumbInfoLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var parentHost = document.referrer.split('/')[2];
    if (!hostReg.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    var type = 'thumbInfo';
    var token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    window.addEventListener('message', function(event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      if (!hostReg.test(event.origin.split('/')[2])) { return; }
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      //var command = data.command;

      if (data.token !== token) { return; }


      if (!data.url) { return; }
      var sessionId = data.sessionId;
      xmlHttp({
        url: data.url,
        onload: function(resp) {

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

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

      timeoutTimer = window.setTimeout(function() {
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
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };

  var nicovideoApi = function() {
    if (window.name.indexOf('nicovideoApiLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    let parentHost = document.referrer.split('/')[2];
    window.console.log('parentHost', parentHost);
    if (!hostReg.test(parentHost) &&
        localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
      window.console.log('disable bridge');
      return;
    }
    window.console.log('enable bridge');


    let isOk = false;
    var type = 'nicovideoApi';
    var token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    var originalUrl = location.href;
    var pushHistory = function(path) {
      // ブラウザの既読リンクの色をつけるためにreplaceStateする
      // という目的だったのだが、iframeの中では効かないようだ。残念。
      window.history.replaceState(null, null, path);
    };

    var PREFIX = 'ZenzaWatch_';
    var dumpConfig = function(data) {
      if (!data.keys) { return; }
      var prefix = PREFIX;
      var config = {};
      var sessionId = data.sessionId;

      data.keys.forEach((key) => {
        var storageKey = prefix + key;
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

    var saveConfig = function(data) {
      if (!data.key) { return; }
      var prefix = PREFIX;
      var storageKey = prefix + data.key;
      //window.console.log('bridge save config: %s = %s', storageKey, data.value);
      localStorage.setItem(storageKey, JSON.stringify(data.value));
    };

    window.addEventListener('message', function(event) {
      //window.console.log('nicovideoApiLoaderWindow.onMessage origin="%s"', event.origin, event.data);
      if (!hostReg.test(event.origin.split('/')[2])) { return; }
      var data = JSON.parse(event.data), command = data.command;

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

    var onStorage = function(e) {
      var key = e.key || '';
      if (e.type !== 'storage' || key.indexOf('ZenzaWatch_') !== 0) { return; }

      key = key.replace('ZenzaWatch_', '');
      var oldValue = e.oldValue;
      var newValue = e.newValue;
      //asyncEmitter.emit('change', key, newValue, oldValue);
      if (oldValue === newValue) { return; }
      if (!isOk) { return; }

      parentPostMessage(type, {
        command: 'configSync',
        token: token,
        key:   key,
        value: newValue
      });

      switch(key) {
        case 'message':
          //console.log('%cmessage', 'background: cyan;', newValue);
          parentPostMessage(type, { command: 'message', value: newValue, token: token });
          break;
      }
    };


    var onBroadcastMessage = function(e) {
      const packet = e.data;
      //window.console.log('%cmessage', 'background: cyan;', packet);
      if (!isOk) { return; }

      parentPostMessage(type, { command: 'message', value: JSON.stringify(packet), token: token});
    };

    var broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel('ZenzaWatch')) : null;
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);
    


    try {
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };



  var smileApi = function() {
    if (window.name.indexOf('storyboard') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    const parentHost = document.referrer.split('/')[2];
    if (!hostReg.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    const videoCapture = function(src, sec) {
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
          if (resolved) { return; }
          const c = document.createElement('canvas');
          c.width  = v.videoWidth;
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

    window.addEventListener('message', function(event) {
      const data = JSON.parse(event.data);
      if (!hostReg.test(event.origin.split('/')[2])) { return; }

      if (data.token !== token) { return; }

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
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }

  };

  const searchApi = function() {
    if (window.name.indexOf('search') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    const parentHost = document.referrer.split('/')[2];
    if (!hostReg.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }

    const type = window.name.replace(/Loader$/, '');
    const token = location.hash ? location.hash.substring(1) : null;

    window.addEventListener('message', function(event) {
      const data = JSON.parse(event.data);

      if (data.token !== token) { return; }

      if (!data.url) { return; }

      loadUrlByFetch(data, type, token);
    });

    try {
      parentPostMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };


//===END===

