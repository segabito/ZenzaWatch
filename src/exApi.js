var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};

//===BEGIN===

  var xmlHttpRequest = function(options) {
    try {
      //window.console.log('xmlHttpRequest bridge: ', options.url, options);
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

  var postMessage = function(type, message, token) {
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
    xmlHttpRequest({
      url:     data.url,
      method:  options.method || options.type || 'GET',
      data:    options.data,
      headers: options.headers || [],
      xhrFields: options.xhrFields,
      onload: function(resp) {

        if (isTimeout) { return; }
        else { window.clearTimeout(timeoutTimer); }

        try {
          postMessage(type, {
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
      postMessage(type, {
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
        postMessage(type, {
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
      postMessage(type, {
        sessionId: sessionId,
        status: 'timeout',
        token: token,
        command: 'loadUrlByFetch',
        url: data.url
      });
    }, 30000);
  };




  var thumbInfoApi = function() {
    if (window.name.indexOf('thumbInfoLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var parentHost = document.referrer.split('/')[2];
    if (!parentHost.match(/^[a-z0-9]*\.nicovideo\.jp$/)) {
      window.console.log('disable bridge');
      return;
    }

    var type = 'thumbInfo';
    var token = location.hash ? location.hash.substring(1) : null;
    location.hash = '';

    window.addEventListener('message', function(event) {
      //window.console.log('thumbInfoLoaderWindow.onMessage', event.data);
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      //var command = data.command;

      if (data.token !== token) { return; }


      if (!data.url) { return; }
      var sessionId = data.sessionId;
      xmlHttpRequest({
        url: data.url,
        onload: function(resp) {

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

          try {
            postMessage(type, {
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
        postMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          url: data.url
        });
      }, 30000);

    });

    try {
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };

  var nicovideoApi = function() {
    if (window.name.indexOf('nicovideoApiLoader') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host);

    var parentHost = document.referrer.split('/')[2];
    window.console.log('parentHost', parentHost);
    if (!parentHost.match(/^[a-z0-9]*\.nicovideo\.jp$/) &&
        localStorage.ZenzaWatch_allowOtherDomain !== 'true') {
      window.console.log('disable bridge');
      return;
    }


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
        if (localStorage.hasOwnProperty(storageKey)) {
          try {
            config[key] = JSON.parse(localStorage.getItem(storageKey));
            //window.console.log('dump config: %s = %s', key, config[key]);
          } catch (e) {
            window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
          }
        }
      });

      try {
        postMessage(type, {
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
      //window.console.log('nicovideoApiLoaderWindow.onMessage', event.origin, event.data);
      var data = JSON.parse(event.data), command = data.command;

      if (data.token !== token) {
        window.console.log('invalid token: ', data.token, token, command);
        return;
      }

      switch (command) {
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

      postMessage(type, {
        command: 'configSync',
        token: token,
        key:   key,
        value: newValue
      });

      switch(key) {
        case 'message':
          //console.log('%cmessage', 'background: cyan;', newValue);
          postMessage(type, { command: 'message', value: newValue, token: token });
          break;
      }
    };


    var onBroadcastMessage = function(e) {
      const packet = e.data;
      //window.console.log('%cmessage', 'background: cyan;', packet);

      postMessage(type, { command: 'message', value: JSON.stringify(packet), token: token});
    };

    var broadcastChannel =
      window.BroadcastChannel ? (new window.BroadcastChannel('ZenzaWatch')) : null;
    broadcastChannel = null; //まだ実験中
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', onBroadcastMessage);
    }
    window.addEventListener('storage', onStorage);
    


    try {
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };



  var smileApi = function() {
    if (window.name.indexOf('storyboard') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    var parentHost = document.referrer.split('/')[2];
    if (!parentHost.match(/^[a-z0-9]*\.nicovideo\.jp$/)) {
      window.console.log('disable bridge');
      return;
    }

    var type = window.name.replace(/Loader$/, '');
    var token = location.hash ? location.hash.substring(1) : null;


    window.addEventListener('message', function(event) {
      //window.console.log('StoryBoardLoaderWindow.onMessage', event.data, type);
      var data = JSON.parse(event.data), timeoutTimer = null, isTimeout = false;
      //var command = data.command;

      if (data.token !== token) { return; }


      if (!data.url) { return; }
      var sessionId = data.sessionId;
      //window.console.log('StoryBoardLoaderWindow.load', data.url, type);

      xmlHttpRequest({
        url: data.url,
        onload: function(resp) {
          //window.console.log('StoryBoardLoaderWindow.onXmlHttpRequst', resp, type);

          if (isTimeout) { return; }
          else { window.clearTimeout(timeoutTimer); }

          try {
            postMessage(type, {
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
        postMessage(type, {
          sessionId: sessionId,
          status: 'timeout',
          command: 'loadUrl',
          url: data.url
        });
      }, 30000);

    });

    try {
      //window.console.log('%cpost initialized:', 'font-weight: bolder;', type);
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }

  };

  const searchApi = function() {
    if (window.name.indexOf('search') < 0 ) { return; }
    window.console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name);

    const parentHost = document.referrer.split('/')[2];
    if (!parentHost.match(/^[a-z0-9]*\.nicovideo\.jp$/)) {
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
      postMessage(type, { status: 'initialized' });
    } catch (e) {
      console.log('err', e);
    }
  };


//===END===

