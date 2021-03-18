import {createVideoElement} from '../../../zenza/src/videoPlayer/createVideoElement';
import {sleep} from '../infra/sleep';
import {CrossDomainGate} from '../infra/CrossDomainGate';
import {PRODUCT} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===

const VideoCaptureUtil = (() => {
  const crossDomainGates = {};

  const initializeByServer = (server, fileId) => {
    if (crossDomainGates[server]) {
      return crossDomainGates[server];
    }

    const baseUrl = `https://${server}/smile?i=${fileId}`;

    crossDomainGates[server] = new CrossDomainGate({
      baseUrl,
      origin: `https://${server}/`,
      type: `storyboard${PRODUCT}_${server.split('.')[0].replace(/-/g, '_')}`
    });

    return crossDomainGates[server];
  };

  const _toCanvas = (v, width, height) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    context.drawImage(v.drawableElement || v, 0, 0, width, height);
    return canvas;
  };

  const isCORSReadySrc = src => {
    if (src.indexOf('dmc.nico') >= 0) {
      return true;
    }
    return false;
  };

  const videoToCanvas = video => {
    const src = video.src;
    const sec = video.currentTime;
    const a = document.createElement('a');
    a.href = src;
    const server = a.host;
    const search = a.search;

    if (isCORSReadySrc(src)) {
      return Promise.resolve({canvas: _toCanvas(video, video.videoWidth, video.videoHeight)});
    }

    return new Promise(async (resolve, reject) => {
      if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
        return reject({status: 'fail', message: 'invalid url', url: src});
      }
      const fileId = RegExp.$2;

      const gate = initializeByServer(server, fileId);

      const dataUrl = await gate.videoCapture(src, sec);

      const bin = atob(dataUrl.split(',')[1]);
      const buf = new Uint8Array(bin.length);
      for (let i = 0, len = buf.length; i < len; i++) {
        buf[i] = bin.charCodeAt(i);
      }
      const blob = new Blob([buf.buffer], {type: 'image/png'});
      const url = URL.createObjectURL(blob);
      console.info('createObjectUrl', url.length);

      const img = new Image();

      img.src = url;
      img.decode()
        .then(() => resolve({canvas: _toCanvas(img, video.videoWidth, video.videoHeight)}))
        .catch(err => reject(err))
        .finally(() => window.setTimeout(() => URL.revokeObjectURL(url), 10000));
    });
  };

  // 参考
  // https://developer.mozilla.org/ja/docs/Web/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
  const htmlToSvg = (html, width = 682, height = 384) => {
    const data =
      (`<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
          <foreignObject width='100%' height='100%'>${html}</foreignObject>
        </svg>`).trim();
    const svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
    return {svg, data};
  };

  const htmlToCanvas = (html, width = 640, height = 360) => {

    const imageW = height * 16 / 9;
    const imageH = imageW * 9 / 16;
    const {svg, data} = htmlToSvg(html);

    const url = window.URL.createObjectURL(svg);
    if (!url) {
      return Promise.reject(new Error('convert svg fail'));
    }
    const img = new Image();
    img.width = 682;
    img.height = 384;
    const canvas = document.createElement('canvas');

    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    img.src = url;
    img.decode().then(() => {
      context.drawImage(
        img,
        (width - imageW) / 2,
        (height - imageH) / 2,
        imageW,
        imageH);
    }).catch(e => {
      throw new Error('img decode error', e);
    }).finally(() => window.URL.revokeObjectURL(url));
    return {canvas, img};
  };

  const nicoVideoToCanvas = async ({video, html, minHeight = 1080}) => {
    let scale = 1;
    let width =
      Math.max(video.videoWidth, video.videoHeight * 16 / 9);
    let height = video.videoHeight;
    // 動画の解像度が低いときは、可能な範囲で整数倍に拡大する
    if (height < minHeight) {
      scale = Math.floor(minHeight / height);
      width *= scale;
      height *= scale;
    }

    const canvas = document.createElement('canvas');
    const ct = canvas.getContext('2d', {alpha: false});

    canvas.width = width;
    canvas.height = height;

    const {canvas: videoCanvas} = await videoToCanvas(video);

    ct.fillStyle = 'rgb(0, 0, 0)';
    ct.fillRect(0, 0, width, height);

    ct.drawImage(
      videoCanvas,
      (width - video.videoWidth * scale) / 2,
      (height - video.videoHeight * scale) / 2,
      video.videoWidth * scale,
      video.videoHeight * scale
    );

    const {canvas: htmlCanvas, img} = await htmlToCanvas(html, width, height);

    ct.drawImage(htmlCanvas, 0, 0, width, height);
    return {canvas, img};
  };

  const saveToFile = (canvas, fileName = 'sample.png') => {
    const dataUrl = canvas.toDataURL('image/png');
    const bin = atob(dataUrl.split(',')[1]);
    const buf = new Uint8Array(bin.length);
    for (let i = 0, len = buf.length; i < len; i++) {
      buf[i] = bin.charCodeAt(i);
    }
    const blob = new Blob([buf.buffer], {type: 'image/png'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    window.console.info('download fileName: ', fileName);
    a.setAttribute('download', fileName);
    a.setAttribute('href', url);
    a.setAttribute('rel', 'noopener');
    document.body.append(a);
    a.click();
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2000);
  };

  return {
    videoToCanvas,
    htmlToCanvas,
    nicoVideoToCanvas,
    saveToFile
  };
})();
VideoCaptureUtil.capture = function(src, sec) {
  const func = () => {
    return new Promise((resolve, reject) => {
      const v = createVideoElement('capture');
      if (!v) {
        return reject();
      }
      Object.assign(v.style, {
        width: '64px',
        height: '36px',
        position: 'fixed',
        left: '-100px',
        top: '-100px'
      });

      v.volume = 0;
      v.autoplay = false;
      v.controls = false;
      v.addEventListener('loadedmetadata', () => v.currentTime = sec, {once: true});
      v.addEventListener('error', err => { v.remove(); reject(err); }, {once: true});

      const onSeeked = () => {
        const c = document.createElement('canvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(v.drawableElement || v, 0, 0);
        v.remove();
        return resolve(c);
      };

      v.addEventListener('seeked', onSeeked, {once: true});

      setTimeout(() => {v.remove();reject();}, 30000);

      document.body.append(v);
      v.src = src;
      v.currentTime = sec;
    });
  };

  let wait = (this.lastSrc === src && this.wait) ? this.wait : sleep(1000);
  this.lastSrc = src;
  // 連続アクセスでセッションがkillされないように
  let waitTime = 1000;
  waitTime += src.indexOf('dmc.nico') >= 0 ? 2000 : 0;
  waitTime += src.indexOf('.m3u8')    >= 0 ? 2000 : 0;

  let resolve, reject;
  this.wait = new Promise((...args) => [resolve, reject] = args)
    .then(() => sleep(waitTime)).catch(() => sleep(waitTime * 2));

  return wait.then(func)
    .then(r => { resolve(r); return r; })
    .catch(e => { reject(e); return e; });
}.bind({});

VideoCaptureUtil.initCapTube = function() {
  const iframe = document.querySelector(
    '#ZenzaWatchVideoPlayerContainer iframe[title^=YouTube]');
  if (!iframe) {
    return null;
  }
  if (this.bridge) {
    return this.bridge;
  }

  const cw = iframe.contentWindow;
  const promises = this.promises;
  self.addEventListener('message', e => {
    if (e.source !== cw) { return; }
    const {id, body, sessionId, status} = e.data;
    const {command, params} = body;
    if (id !== 'CapTube') {
      return;
    }
    switch (command) {
      case 'commandResult':
        if (promises[sessionId]) {
          if (status === 'ok') {
            promises[sessionId].resolve(params.result);
          } else {
            promises[sessionId].reject(params.result);
          }
          delete promises[sessionId];
        }
        return;
    }
  });
  const post = (body, options = {}) => {
    const sessionId = `send:CapTube:${this.sessionId++}`;
    return new Promise((resolve, reject) => {
        promises[sessionId] = {resolve, reject};
        cw.postMessage({body, sessionId}, location.href, options.transfer);
        if (typeof options.timeout === 'number') {
          setTimeout(() => {
            reject({status: 'fail', message: 'timeout'});
            delete promises[sessionId];
          }, options.timeout);
        }
      }).finally(() => { delete promises[sessionId]; });
  };
  return this.bridge = {post};
}.bind({promises: {}, sessionId: 1, bridge: null});

VideoCaptureUtil.capTube = ({title, videoId, author}) => {
  const tube = VideoCaptureUtil.initCapTube();
  if (!tube) { return; }
  const command = 'capTube';
  tube.post({command, params: {title, videoId, author}}, {timeout: 30000});
};

VideoCaptureUtil.capTubeThumbnail = (width = 320, height = 180, type = 'image/webp') => {
  const tube = VideoCaptureUtil.initCapTube();
  if (!tube) { return; }
  const command = 'capTubeThumbnail';
  tube.post({command, params: {width, height, type}}, {timeout: 30000});
};


//===END===

export {VideoCaptureUtil};