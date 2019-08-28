const PRODUCT = 'ZenzaWatch';
import {workerUtil} from '../infra/workerUtil';
/*
post = {
  id: 'PRODUCT',
  type: 'nicovideoApi',
  token: 22222,
  sessionId: 11111,
  url: location.href,
  body: {command: 'hello', params: {}, status: 'ok'},
}
*/
//===BEGIN===
const gate = () => {

  const post = function(body, {type, token, sessionId, origin} = {}) {
    sessionId = sessionId || '';
    origin = origin || '';
    this.origin = origin = origin || this.origin || document.referrer;
    this.token = token = token || this.token;
    this.type = type = type || this.type;
    if (!this.channel) {
      this.channel = new MessageChannel;
    }
    const url = location.href;
    const id = PRODUCT;
    try {
      const msg = {id, type, token, url, sessionId, body};
      if (!this.port) {
        msg.body = {command: 'initialized', params: msg.body};
        parent.postMessage(msg, origin, [this.channel.port2]);
        this.port = this.channel.port1;
        this.port.start();
      } else {
        this.port.postMessage(msg);
      }
    } catch (e) {
      console.error('%cError: parent.postMessage - ', 'color: red; background: yellow', e);
    }
    return this.port;
  }.bind({channel: null, port: null, origin: null, token: null, type: null});

  const parseUrl = url => {
    url = url || 'https://unknown.example.com/';
    const a = document.createElement('a');
    a.href = url;
    return a;
  };

  const isNicoServiceHost = url => {
    const host = parseUrl(url).hostname;
    return /(^[a-z0-9.-]*\.nicovideo\.jp$|^[a-z0-9.-]*\.nico(|:[0-9]+)$)/.test(host);
  };

  const isWhiteHost = url => {
    const u = parseUrl(url);
    const host = u.hostname;
    if (['account.nicovideo.jp', 'point.nicovideo.jp'].includes(host)) {
      return false;
    }
    if (isNicoServiceHost(url)) {
      return true;
    }
    if (['localhost', '127.0.0.1'].includes(host)) { return true; }
    if (localStorage.ZenzaWatch_whiteHost) {
      if (localStorage.ZenzaWatch_whiteHost.split(',').includes(host)) {
        return true;
      }
    }
    if (u.protocol !== 'https:') { return false; }
    return [
      'google.com',
      'www.google.com',
      'www.google.co.jp',
      'www.bing.com',
      'twitter.com',
      'friends.nico',
      'feedly.com',
      'www.youtube.com',
    ].includes(host) || host.endsWith('.slack.com');
  };

  const uFetch = params => {
    const {url, options}= params;
    if (!isWhiteHost(url) || !isNicoServiceHost(url)) {
      return Promise.reject({status: 'fail', message: 'network error'});
    }
    const racers = [];
    let timer;
    const timeout = (typeof params.timeout === 'number' && !isNaN(params.timeout)) ? params.timeout : 30 * 1000;
    if (timeout > 0) {
      racers.push(new Promise((resolve, reject) =>
        timer = setTimeout(() => timer ? reject({name: 'timeout', message: 'timeout'}) : resolve(), timeout))
      );
    }

    const controller = AbortController ? (new AbortController()) : null;
    if (controller) {
      params.signal = controller.signal;
    }

    racers.push(fetch(url, options));
    return Promise.race(racers)
      .catch(err => {
      let message = 'uFetch fail';
      if (err && err.name === 'timeout') {
        if (controller) {
          console.warn('request timeout');
          controller.abort();
        }
        message = 'timeout';
      }
      return Promise.reject({status: 'fail', message});
    }).finally(() => { timer && clearTimeout(timer); });
  };

  const xFetch = (params, sessionId = null) => {
    const command = 'fetch';
    return uFetch(params).then(async resp => {
      const buffer = await resp.arrayBuffer();
      const init = ['type', 'url', 'redirected', 'status', 'ok', 'statusText']
          .reduce((map, key) => {map[key] = resp[key]; return map;}, {});
      const headers = [...resp.headers.entries()];
      return Promise.resolve({buffer, init, headers});
    }).then(({buffer, init, headers}) => {
      const result = {status: 'ok', command, params: {buffer, init, headers}};
      post(result, {sessionId});
      return result;
    }).catch(({status, message}) => {
      post({status, message, command}, {sessionId});
    });
  };


  const init = ({prefix, type}) => {
    if (!window.name.startsWith(prefix)) {
      throw new Error(`unknown name "${window.name}"`);
    }
    const PID = `${window && window.name || 'self'}:${location.host}:${name}:${Date.now().toString(16).toUpperCase()}`;

    type = type || window.name.replace(new RegExp(`/(${PRODUCT}|)Loader$/`), '');
    const origin = document.referrer || window.name.split('#')[1];
    console.log('%cCrossDomainGate: %s', 'background: lightgreen;', location.host, window.name, {prefix, type});

    if (!isWhiteHost(origin)) {
      throw new Error(`disable bridge "${origin}"`);
    }

    const TOKEN = location.hash ? location.hash.substring(1) : null;
    window.history.replaceState(null, null, location.pathname);
    const port = post({status: 'ok', command: 'initialized'}, {type, token: TOKEN, origin});
    workerUtil && workerUtil.env({TOKEN, PRODUCT});
    return {port, TOKEN, origin, type, PID};
  };

  return {post, parseUrl, isNicoServiceHost, isWhiteHost, uFetch, xFetch, init};
};

//===END===
export {gate};

// const xmlHttp = options => {
//   try {
//     //window.console.log('xmlHttp bridge: ', options.url, options);
//     let req = new XMLHttpRequest();
//     let method = options.method || options.type || 'GET';
//     let xhrFields = options.xhrFields || {};

//     if (typeof xhrFields.withCredentials === 'boolean') {
//       req.withCredentials = xhrFields.withCredentials;
//     }

//     req.onreadystatechange = () => {
//       if (req.readyState === 4) {
//         if (typeof options.onload === 'function') options.onload(req);
//       }
//     };
//     req.open(method, options.url, true);

//     if (options.headers) {
//       for (let h in options.headers) {
//         req.setRequestHeader(h, options.headers[h]);
//       }
//     }

//     req.send(options.data || null);
//   } catch (e) {
//     window.console.error(e);
//   }
// };
// const ajax = (params, sessionId) => {
//   let timeoutTimer = null, isTimeout = false;
//   const {url, options} = params;
//   const command = 'loadUrl';
//   if (!url || !isWhiteHost(url) || !isNicoServiceHost(url)) {
//     return;
//   }

//   xmlHttp({
//     url,
//     method: options.method || options.type || 'GET',
//     data: options.data,
//     headers: options.headers || [],
//     xhrFields: options.xhrFields,
//     onload: resp => {
//       if (isTimeout) {
//         return;
//       } else {
//         window.clearTimeout(timeoutTimer);
//       }

//       try {
//         post(
//           {status: 'ok', command, params: {body: resp.responseText}}, {sessionId});
//       } catch (e) {
//         console.log(
//           '%cError: parent.postMessage - ',
//           'color: red; background: yellow',
//           e, event.origin, event.data);
//       }
//     }
//   });

//   timeoutTimer = window.setTimeout(() => {
//     isTimeout = true;
//     post({status: 'timeout', command, params}, {sessionId});
//   }, 30000);
// };
