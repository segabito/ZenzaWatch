// ==UserScript==
// @name        CapTube
// @namespace   https://github.com/segabito/
// @description "S"キーでYouTubeのスクリーンショット保存
// @include     https://www.youtube.com/*
// @include     https://www.youtube.com/embed/*
// @include     https://youtube.com/*
// @version     0.0.11
// @grant       none
// @license     public domain
// ==/UserScript==
/* eslint-disable */


(() => {
  const PRODUCT = 'CapTube';
const css = (() => {
	const setPropsTask = [];
	const applySetProps = throttle.raf(
		() => {
		const tasks = setPropsTask.concat();
		setPropsTask.length = 0;
		for (const [element, prop, value] of tasks) {
			try {
				element.style.setProperty(prop, value);
			} catch (error) {
				console.warn('element.style.setProperty fail', {element, prop, value, error});
			}
		}
	});
	const css = {
		addStyle: (styles, option, document = window.document) => {
			const elm = Object.assign(document.createElement('style'), {
				type: 'text/css'
			}, typeof option === 'string' ? {id: option} : (option || {}));
			if (typeof option === 'string') {
				elm.id = option;
			} else if (option) {
				Object.assign(elm, option);
			}
			elm.classList.add(global.PRODUCT);
			elm.append(styles.toString());
			(document.head || document.body || document.documentElement).append(elm);
			elm.disabled = option && option.disabled;
			elm.dataset.switch = elm.disabled ? 'off' : 'on';
			return elm;
		},
		registerProps(...args) {
			if (!CSS || !('registerProperty' in CSS)) {
				return;
			}
			for (const definition of args) {
				try {
					(definition.window || window).CSS.registerProperty(definition);
				} catch (err) { console.warn('CSS.registerProperty fail', definition, err); }
			}
		},
		setProps(...tasks) {
			setPropsTask.push(...tasks);
			return setPropsTask.length ? applySetProps() : Promise.resolve();
		},
		addModule: async function(func, options = {}) {
			if (!CSS || !('paintWorklet' in CSS) || this.set.has(func)) {
				return;
			}
			this.set.add(func);
			const src =
			`(${func.toString()})(
				this,
				registerPaint,
				${JSON.stringify(options.config || {}, null, 2)}
				);`;
			const blob = new Blob([src], {type: 'text/javascript'});
			const url = URL.createObjectURL(blob);
			await CSS.paintWorklet.addModule(url).then(() => URL.revokeObjectURL(url));
			return true;
		}.bind({set: new WeakSet}),
		escape:  value => CSS.escape  ? CSS.escape(value) : value.replace(/([\.#()[\]])/g, '\\$1'),
		number:  value => CSS.number  ? CSS.number(value) : value,
		s:       value => CSS.s       ? CSS.s(value) :  `${value}s`,
		ms:      value => CSS.ms      ? CSS.ms(value) : `${value}ms`,
		pt:      value => CSS.pt      ? CSS.pt(value) : `${value}pt`,
		px:      value => CSS.px      ? CSS.px(value) : `${value}px`,
		percent: value => CSS.percent ? CSS.percent(value) : `${value}%`,
		vh:      value => CSS.vh      ? CSS.vh(value) : `${value}vh`,
		vw:      value => CSS.vw      ? CSS.vw(value) : `${value}vw`,
		trans:   value => self.CSSStyleValue ? CSSStyleValue.parse('transform', value) : value,
		word:    value => self.CSSKeywordValue ? new CSSKeywordValue(value) : value,
		image:   value => self.CSSStyleValue ? CSSStyleValue.parse('background-image', value) : value,
	};
	return css;
})();
const cssUtil = css;
const workerUtil = (() => {
	let config, TOKEN, PRODUCT = 'ZenzaWatch?', netUtil, CONSTANT, NAME = '';
	let global = null, external = null;
	const isAvailable = !!(window.Blob && window.Worker && window.URL);
	const messageWrapper = function(self) {
		const _onmessage = self.onmessage || (() => {});
		const promises = {};
		const onMessage = async function(self, type, e) {
			const {body, sessionId, status} = e.data;
			const {command, params} = body;
			try {
				let result;
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
					case 'ping':
						result = {now: Date.now(), NAME, PID, url: location.href};
						break;
					case 'port': {
						const port = e.ports[0];
						portMap[params.name] = port;
						port.addEventListener('message', onMessage.bind({}, port, params.name));
						bindFunc(port, 'MessageChannel');
						if (params.ping) {
							console.time('ping:' + sessionId);
							port.ping().then(result => {
								console.timeEnd('ping:' + sessionId);
								console.log('ok %smec', Date.now() - params.now, params);
							}).catch(err => {
								console.timeEnd('ping:' + sessionId);
								console.warn('ping fail', {err, data: e.data});
							});
						}
					}
						return;
					case 'broadcast': {
						if (!BroadcastChannel) { return; }
						const channel = new BroadcastChannel(`${params.name}`);
						channel.addEventListener('message', onMessage.bind({}, channel, 'BroadcastChannel'));
						bindFunc(channel, 'BroadcastChannel');
						bcast[params.basename] = channel;
					}
						return;
					case 'env':
						({config, TOKEN, PRODUCT, CONSTANT} = params);
						return;
					default:
						result = await _onmessage({command, params}, type, PID);
						break;
					}
				self.postMessage({body:
					{command: 'commandResult', params:
						{command, result}}, sessionId, TYPE: type, PID, status: 'ok'
					});
			} catch(err) {
				console.error('failed', {err, command, params, sessionId, TYPE: type, PID, data: e.data});
				self.postMessage({body:
						{command: 'commandResult', params: {command, result: err.message || null}},
						sessionId, TYPE: type, PID, status: err.status || 'fail'
					});
			}
		};
		self.onmessage = onMessage.bind({}, self, self.name);
		self.onconnect = e => {
			const port = e.ports[0];
			port.onmessage = self.onmessage;
			port.start();
		};
		const bindFunc = (self, type = 'Worker') => {
			const post = function(self, body, options = {}) {
				const sessionId = `recv:${NAME}:${type}:${this.sessionId++}`;
				return new Promise((resolve, reject) => {
					promises[sessionId] = {resolve, reject};
					self.postMessage({body, sessionId, PID}, options.transfer);
					if (typeof options.timeout === 'number') {
						setTimeout(() => {
							reject({status: 'fail', message: 'timeout'});
							delete promises[sessionId];
						}, options.timeout);
					}
				}).finally(() => { delete promises[sessionId]; });
			};
			const emit = function(self, eventName, data = null) {
				self.post({command: 'emit', params: {eventName, data}});
			};
			const notify = function(self, message) {
				self.post({command: 'notify', params: {message}});
			};
			const alert = function(self, message) {
				self.post({command: 'alert', params: {message}});
			};
			const ping = async function(self, options = {}) {
				const timekey = `PING "${self.name}"`;
				console.log(timekey);
				let result;
				options.timeout = options.timeout || 10000;
				try {
					console.time(timekey);
					result = await self.post({command: 'ping', params: {now: Date.now(), NAME, PID, url: location.href}}, options);
					console.timeEnd(timekey);
				} catch (e) {
					console.timeEnd(timekey);
					console.warn('ping fail', e);
				}
				return result;
			};
			self.post = post.bind({sessionId: 0}, this.port || self);
			self.emit = emit.bind({}, self);
			self.notify = notify.bind({}, self);
			self.alert = alert.bind({}, self);
			self.ping = ping.bind({}, self);
			return self;
		};
		bindFunc(self);
		self.xFetch = async (url, options = {}) => {
			options = {...options, ...{signal: null}}; // remove AbortController
			if (url.startsWith(location.origin)) {
				return fetch(url, options);
			}
			const result = await self.post({command: 'fetch', params: {url, options}});
			const {buffer, init, headers} = result;
			const _headers = new Headers();
			(headers || []).forEach(a => _headers.append(...a));
			const _init = {
				status: init.status,
				statusText: init.statusText || '',
				headers: _headers
			};
			return new Response(buffer, _init);
		};
	};
	const workerUtil = {
		isAvailable,
		js: (q, ...args) => {
			const strargs = args.map(a => typeof a === 'string' ? a : a.toString);
			return String.raw(q, ...strargs);
		},
		env: params => {
			({config, TOKEN, PRODUCT, netUtil, CONSTANT, global} =
				Object.assign({config, TOKEN, PRODUCT, netUtil, CONSTANT, global}, params));
			if (global) { ({config, TOKEN, PRODUCT, CONSTANT} = global); }
		},
		create: function(func, options = {}) {
			let cache = this.urlMap.get(func);
			const name = options.name || 'Worker';
			if (!cache) {
				const src = `
				const PID = '${window && window.name || 'self'}:${location.href.replace(/\'/g, '\\\'')}:${name}:${Date.now().toString(16).toUpperCase()}';
				console.log('%cinit %s %s', 'font-weight: bold;', self.name || '', '${PRODUCT}', location.origin);
				(${func.toString()})(self);
				`;
				const blob = new Blob([src], {type: 'text/javascript'});
				const url = URL.createObjectURL(blob);
				this.urlMap.set(func, url);
				cache = url;
			}
			if (options.type === 'SharedWorker') {
				const w = this.workerMap.get(func) || new SharedWorker(cache);
				this.workerMap.set(func, w);
				return w;
			}
			return new Worker(cache, options);
		}.bind({urlMap: new Map(), workerMap: new Map()}),
		createCrossMessageWorker: function(func, options = {}) {
			const promises = this.promises;
			const name = options.name || 'Worker';
			const PID = `${window && window.name || 'self'}:${location.host}:${name}:${Date.now().toString(16).toUpperCase()}`;
			const _func = `
			function (self) {
			let config = {}, PRODUCT, TOKEN, CONSTANT, NAME = decodeURI('${encodeURI(name)}'), bcast = {}, portMap = {};
			const {Handler, PromiseHandler, Emitter} = (${EmitterInitFunc.toString()})();
			(${func.toString()})(self);
			//===================================
			(${messageWrapper.toString()})(self);
			}
			`;
			const worker = workerUtil.create(_func, options);
			const self = options.type === 'SharedWorker' ? worker.port : worker;
			self.name = name;
			const onMessage = async function(self, e) {
				const {body, sessionId, status} = e.data;
				const {command, params} = body;
				try {
					let result = 'ok';
					let transfer = null;
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
						case 'ping':
								result = {now: Date.now(), NAME, PID, url: location.href};
								console.timeLog && console.timeLog(params.NAME, 'PONG');
								break;
						case 'emit':
							global && global.emitter.emitAsync(params.eventName, params.data);
							break;
						case 'fetch':
							result = await (netUtil || window).fetch(params.url,
								Object.assign({}, params.options || {}, {_format: 'arraybuffer'}));
							transfer = [result.buffer];
							break;
						case 'notify':
							global && global.notify(params.message);
							break;
						case 'alert':
							global && global.alert(params.message);
							break;
						default:
							self.oncommand && (result = await self.oncommand({command, params}));
							break;
					}
					self.postMessage({body: {command: 'commandResult', params: {command, result}}, sessionId, status: 'ok'}, transfer);
				} catch (err) {
					console.error('failed', {err, command, params, sessionId});
					self.postMessage({body: {command: 'commandResult', params: {command, result: err.message || null}}, sessionId, status: err.status || 'fail'});
				}
			};
			const bindFunc = (self, type = 'Worker') => {
				const post = function(self, body, options = {}) {
					const sessionId = `send:${name}:${type}:${this.sessionId++}`;
					return new Promise((resolve, reject) => {
							promises[sessionId] = {resolve, reject};
							self.postMessage({body, sessionId, TYPE: type, PID}, options.transfer);
							if (typeof options.timeout === 'number') {
								setTimeout(() => {
									reject({status: 'fail', message: 'timeout'});
									delete promises[sessionId];
								}, options.timeout);
							}
						}).finally(() => { delete promises[sessionId]; });
				};
				const ping = async function(self, options = {}) {
					const timekey = `PING "${self.name}" total time`;
					window.console.log(`PING "${self.name}"...`);
					let result;
					options.timeout = options.timeout || 10000;
					try {
					window.console.time(timekey);
					result = await self.post({command: 'ping', params: {now: Date.now(), NAME: self.name, PID, url: location.href}}, options);
					window.console.timeEnd(timekey);
					} catch (e) {
						console.timeEnd(timekey);
						console.warn('ping fail', e);
					}
					return result;
				};
				self.post = post.bind({sessionId: 0}, self);
				self.ping = ping.bind({}, self);
				self.addEventListener('message', onMessage.bind({sessionId: 0}, self));
				self.start && self.start();
			};
			bindFunc(self);
			if (config) {
				self.post({
					command: 'env',
					params: {config: config.export(true), TOKEN, PRODUCT, CONSTANT}
				});
			}
			self.addPort = (port, options = {}) => {
				const name = options.name || 'MessageChannel';
				return self.post({command: 'port', params: {port, name}}, {transfer: [port]});
			};
			const channel = new MessageChannel();
			self.addPort(channel.port2);
			bindFunc(channel.port1, {name: 'MessageChannel'});
			self.bridge = async (worker, options = {}) => {
				const name = options.name || 'MessageChannelBridge';
				const channel = new MessageChannel();
				await self.addPort(channel.port1, {name: worker.name || name});
				await worker.addPort(channel.port2, {name: self.name || name});
				console.log('ping self -> other', await channel.port1.ping());
				console.log('ping other -> self', await channel.port2.ping());
			};
			self.BroadcastChannel = basename => {
				const name = `${basename || 'Broadcast'}${TOKEN || Date.now().toString(16)}`;
				self.post({command: 'broadcast', params: {basename, name}});
				const channel = new BroadcastChannel(name);
				channel.addEventListener('message', onMessage.bind({}, channel, 'BroadcastChannel'));
				bindFunc(channel, 'BroadcastChannel');
				return name;
			};
			self.ping()
				.catch(result => console.warn('FAIL', result));
			return self;
		}.bind({
			sessionId: 0,
			promises: {}
		})
	};
	return workerUtil;
})();
  let previewContainer = null, meterContainer = null;

  const callOnIdle = func => {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(func);
    } else {
      setTimeout(func, 0);
    }
  };

  const DataUrlConv = (() => {
    const func = function(self) {

      let canvas, ctx;
      const initCanvas = () => {
        if (canvas) { return; }
        canvas =
          ('OffscreenCanvas' in self) ?
            new OffscreenCanvas(100, 100) : document.createElement('canvas');
        ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
      };

      const fromBitmap = async ({bitmap, type, quality}) => {
        type = type || 'image/png';
        quality = quality || 1;
        initCanvas();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        console.time('bitmap to ObjectURL');
        ctx.drawImage(bitmap, 0, 0);
        const blob = canvas.convertToBlob ?
          (await canvas.convertToBlob({type, quality})) : canvas.toDataURL(type, quality);
        const url = URL.createObjectURL(blob);
        console.timeEnd('bitmap to ObjectURL');
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
        return {status: 'ok', command: 'commandResult', params: {url}};
      };

      const fromDataURL = async ({dataURL}) => {
        console.time('dataURL to objectURL');
        const blob = fetch(dataURL).then(r => r.blob());
        const url = URL.createObjectURL(blob);
        console.timeEnd('dataURL to objectURL');
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
        return {status: 'ok', command: 'commandResult', params: {url}};
      };

      self.onmessage = async ({command, params}) => {
        switch (command) {
          case 'fromBitmap':
            return fromBitmap(params);
          case 'fromDataURL':
            return fromDataURL(params);
        }
      };
    };

    let worker;

    return {
      fromBitmap: (bitmap) => {
        worker = worker || workerUtil.createCrossMessageWorker(func);
        return worker.post({
            command: 'fromBitmap',
            params: {bitmap}
          },
          {transfer: [bitmap]}
        );
      },
      fromDataURL: (dataURL) => {
        worker = worker || workerUtil.createCrossMessageWorker(func);
        return worker.post({
            command: 'fromDataURL',
            params: {dataURL}
          }
        );
        // return new Promise(resolve => {
        //   const sessionId = 'id:' + Math.random();
        //   sessions[sessionId] = resolve;
        //   worker.postMessage({dataURL, sessionId});
        // });
      }
    };
  })();


  const __css__ = (`
    #CapTubePreviewContainer {
      position: fixed;
      padding: 16px 0 0 16px;
      width: 90%;
      bottom: 100px;
      left: 5%;
      z-index: 10000;
      pointer-events: none;
      transform: translateZ(0);
      /*background: rgba(192, 192, 192, 0.4);*/
      border: 1px solid #ccc;
      -webkit-user-select: none;
      user-select: none;
    }

    #CapTubePreviewContainer:empty {
      display: none;
    }
      #CapTubePreviewContainer canvas {
        display: inline-block;
        width: 256px;
        margin-right: 16px;
        margin-bottom: 16px;
        outline: solid 1px #ccc;
        outline-offset: 4px;
        transform: translateZ(0);
        transition:
          1s opacity      linear,
          1s margin-right linear;
      }

      #CapTubePreviewContainer canvas.is-removing {
        opacity: 0;
        margin-right: -272px;
        /*width: 0;*/
      }

    #CapTubeMeterContainer {
      pointer-events: none;
      position: fixed;
      width: 26px;
      bottom: 100px;
      left: 16px;
      z-index: 10000;
      border: 1px solid #ccc;
      transform: translateZ(0);
      -webkit-user-select: none;
      user-select: none;
     }

     #CapTubeMeterContainer::after {
       content: 'queue';
       position: absolute;
       bottom: -2px;
       left: 50%;
       transform: translate(-50%, 100%);
       color: #666;
     }

    #CapTubeMeterContainer:empty {
      display: none;
    }

      #CapTubeMeterContainer .memory {
        display: block;
        width: 24px;
        height: 8px;
        margin: 1px 0 0;
        background: darkgreen;
        opacity: 0.5;
        border: 1px solid #ccc;
      }

  `).trim();

  cssUtil.addStyle(__css__);

  const getVideoId = () => {
    let id = '';
    location.search.substring(1).split('&').forEach(item => {
      if (item.split('=')[0] === 'v') { id = item.split('=')[1]; }
    });
    return id;
  };

  const toSafeName = text => {
    return text.trim()
      .replace(/</g, '＜')
      .replace(/>/g, '＞')
      .replace(/\?/g, '？')
      .replace(/:/g, '：')
      .replace(/\|/g, '｜')
      .replace(/\//g, '／')
      .replace(/\\/g, '￥')
      .replace(/"/g, '”')
      .replace(/\./g, '．')
      ;
  };

  const getVideoTitle = (params = {}) => {
    const prefix = localStorage['CapTube-prefix']  || '';
    const videoId = params.videoId || getVideoId();
    const title = document.querySelector('.title yt-formatted-string') || document.querySelector('.watch-title') || {textContent: document.title};
    const authorName = toSafeName(
      params.author || document.querySelector('#owner-container yt-formatted-string').textContent || '');
    let titleText = toSafeName(params.title || title.textContent);
    titleText = `${prefix}${titleText} - by ${authorName} (v=${videoId})`;

    return titleText;
  };

  const createCanvasFromVideo = video => {
    console.time('createCanvasFromVideo');
    const width = video.videoWidth;
    const height = video.videoHeight;
    const {canvas, ctx} = getTransferCanvas();
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0);
    const bitmap = ('transferToImageBitmap' in canvas) ?
     canvas.transferToImageBitmap() : null;


    const thumbnail = document.createElement('canvas');
    thumbnail.width = 256;
    thumbnail.height = canvas.height * (256 / canvas.width);
    thumbnail.getContext('2d', {alpha: false, desynchronized: true})
      .drawImage(bitmap || canvas, 0, 0, thumbnail.width, thumbnail.height);
    console.timeEnd('createCanvasFromVideo');

    return {canvas, thumbnail, bitmap};
  };

  const getFileName = (video, params = {}) => {
    const title = getVideoTitle(params);
    const currentTime = video.currentTime;
    const min = Math.floor(currentTime / 60);
    const sec = (currentTime % 60 + 100).toString().substr(1, 6);
    const time = `${min}_${sec}`;

    return `${title}@${time}.png`;
  };

  const createBlobLinkElementAsync = async (canvas, fileName, bitmap) => {
    let url;
    if (bitmap) {
      ({url} = await DataUrlConv.fromBitmap(bitmap));
    } else {
      console.time('canvas to DataURL');
      const dataURL = canvas.toDataURL('image/png');
      console.timeEnd('canvas to DataURL');

      ({url} = await DataUrlConv.fromDataURL(dataURL));
    }
    return Object.assign(document.createElement('a'), {
      download: fileName, href: url
    });
   };

  const saveScreenShot = (params = {}) => {
    const video = document.querySelector('.html5-main-video');
    if (!video) { return; }

    const meter = document.createElement('div');
    if (meterContainer) {
      meter.className = 'memory';
      meterContainer.append(meter);
    }

    const {canvas, thumbnail, bitmap} = createCanvasFromVideo(video);
    const fileName = getFileName(video, params);

    createBlobLinkElementAsync(canvas, fileName, bitmap).then(link => {
      document.body.append(link);
      link.click();
      setTimeout(() => {
        link.remove();
        meter.remove();
        URL.revokeObjectURL(link.href);
      }, 1000);
    });

    if (!previewContainer) { return; }
    previewContainer.append(thumbnail);
    setTimeout(() => {
      thumbnail.classList.add('is-removing');
      setTimeout(() => { thumbnail.remove(); }, 2000);
    }, 1500);
  };

  const getThumbnailDataURL = async (width, height, type) => {
    const video = document.querySelector('.html5-main-video');
    if (!video) { return; }
    const canvas = document.createElement('canvas');
    const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    canvas.width = dw;
    canvas.height = dh;
    canvas
      .getContext('2d', {alpha: false, desynchronized: true})
      .drawImage(video, 0, 0, dw, dh);
    return canvas.toDataURL(type);
  };

  const setPlaybackRate = v => {
    const video = document.querySelector('.html5-main-video');
    if (!video) { return; }
    video.playbackRate = v;
  };

  const togglePlay = () => {
    const video = document.querySelector('.html5-main-video');
    if (!video) { return; }

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const seekBy = v => {
    const video = document.querySelector('.html5-main-video');
    if (!video) { return; }

    const ct = Math.max(video.currentTime + v, 0);
    video.currentTime = ct;
  };

  let isVerySlow = false;
  const onKeyDown = e => {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'd':
        setPlaybackRate(0.1);
        isVerySlow = true;
        break;
      case 's':
        saveScreenShot({});
        break;
    }
  };

  const onKeyUp = e => {
    //console.log('onKeyUp', e);
    const key = e.key.toLowerCase();
    switch (key) {
      case 'd':
        setPlaybackRate(1);
        isVerySlow = false;
        break;
    }
  };

  const onKeyPress = e => {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'w':
        togglePlay();
        break;
      case 'a':
        seekBy(isVerySlow ? -0.5 : -5);
        break;
    }
  };

  const getTransferCanvas = function(width = 640, height = 480) {
    const canvas = this.canvas = this.canvas ||
      ('OffscreenCanvas' in self) ?
        new OffscreenCanvas(width, height) :
        Object.assign(document.createElement('canvas'), {width, height});
    const ctx = this.ctx =
      this.ctx || this.canvas.getContext('2d', {alpha: false, desynchronized: true});
    return {canvas, ctx};
  }.bind({canvas: null, ctx: null});

  const initDom = () => {
    const div = document.createElement('div');
    div.id = 'CapTubePreviewContainer';
    previewContainer = div;

    meterContainer = document.createElement('div');
    meterContainer.id = 'CapTubeMeterContainer';
    document.body.append(div, meterContainer);
   };

  const HOST_REG = /^[a-z0-9]*\.nicovideo\.jp$/;

  const parseUrl = url => Object.assign(document.createElement('a'), {href: url});

  const initialize = () => {
    initDom();

    window.addEventListener('keydown',  onKeyDown);
    window.addEventListener('keyup',    onKeyUp);
    window.addEventListener('keypress', onKeyPress);
  };

  const initializeEmbed = () => {
    const parentHost = parseUrl(document.referrer).hostname;
    if (!HOST_REG.test(parentHost)) {
      window.console.log('disable bridge');
      return;
    }
    const origin = document.referrer;
    console.log('%cinit embed CapTube', 'background: lightgreen;');
    window.addEventListener('message', e =>  {
      if (!HOST_REG.test(parseUrl(e.origin).hostname)) { return; }
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      const {body, sessionId} = data;
      const {command, params} = body;

      switch (command || data.command) {
        case 'capTube': {
          const {title, videoId, author} = (params || data);
          saveScreenShot({ title, videoId, author });
        }
          break;
        case 'capTubeThumbnail':{
          const url = getThumbnailDataURL(params);
          const body = {
            command: 'commandResult',
            status: 'ok',
            params: {url}
          };
          const msg = {id: PRODUCT, sessionId, body};
          parent.postMessage(msg, origin);
        }
          break;
      }
    });

  };

  if (window.top !== window && location.pathname.indexOf('/embed/') === 0) {
    initializeEmbed();
  } else {
    initialize();
  }
})();
