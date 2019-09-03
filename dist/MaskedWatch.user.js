// ==UserScript==
// @name        Masked Watch
// @namespace   https://github.com/segabito/
// @description 動画上のテキストや顔を検出してコメントを透過する
// @match       *://www.nicovideo.jp/*
// @match       *://live.nicovideo.jp/*
// @match       *://anime.nicovideo.jp/*
// @match       *://embed.nicovideo.jp/watch/*
// @match       *://sp.nicovideo.jp/watch/*
// @exclude     *://ads*.nicovideo.jp/*
// @exclude     *://www.nicovideo.jp/favicon.ico*
// @version     0.3.0
// @grant       none
// @author      名無しさん
// @license     public domain
// ==/UserScript==
/* eslint-disable */

// chrome://flags/#enable-experimental-web-platform-features


/**
 * @typedf BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {'face'|'text'} type
 */


(() => {
  const PRODUCT = 'MaskedWatch';

  const monkey = (PRODUCT) => {
    'use strict';
    var VER = '0.3.0';
    const ENV = 'STABLE';

    let ZenzaWatch = null;

    const DEFAULT_CONFIG = {
      interval: 300,
      enabled: true,
      debug: false,
      faceDetection: true,
      textDetection: !navigator.userAgent.toLowerCase().includes('windows'),
      fastMode: true,
      tmpWidth: 854,
      tmpHeight: 480,
    };
    const config = new class extends Function {
      toString() {
        return `
*** CONFIG MENU (設定はサービスごとに保存) ***
enabled: ${config.enabled},       // 有効/無効
debug: ${config.debug},        // デバッグON/OFF
faceDetection: ${config.faceDetection}, // 顔検出ON/OFF
textDetection: ${config.textDetection}, // テキスト検出ON/OFF
fastMode: ${config.fastMode},     // false 精度重視 true 速度重視
tmpWidth: ${config.tmpWidth},      // 検出処理用キャンバスの横解像度
tmpHeight: ${config.tmpHeight}        // 検出処理用キャンバスの縦解像度
interval: ${config.interval}        // マスクの更新間隔
`;
      }
    }, def = {};
    Object.keys(DEFAULT_CONFIG).sort().forEach(key => {
      const storageKey = `${PRODUCT}_${key}`;
      def[key] = {
        enumerable: true,
        get() {
          return localStorage.hasOwnProperty(storageKey) ?
            JSON.parse(localStorage[storageKey]) : DEFAULT_CONFIG[key];
        },
        set(value) {
          const currentValue = this[key];
          if (value === currentValue) {
            return;
          }
          if (value === DEFAULT_CONFIG[key]) {
            localStorage.removeItem(storageKey);
          } else {
            localStorage[storageKey] = JSON.stringify(value);
          }
          document.body.dispatchEvent(
            new CustomEvent(`${PRODUCT}-config.update`,
            {detail: {key, value, lastValue: currentValue}, bubbles: true, composed: true}
          ));
        }
      };
    });
    Object.defineProperties(config, def);

    const MaskedWatch = window.MaskedWatch = { config };

    const createWorker = (func, options = {}) => {
      const src = `(${func.toString()})(self);`;
      const blob = new Blob([src], {type: 'text/javascript'});
      const url = URL.createObjectURL(blob);
      return new Worker(url, options);
    };
const css = {
	addStyle: (styles, option, document = window.document) => {
		const elm = document.createElement('style');
		elm.type = 'text/css';
		if (typeof option === 'string') {
			elm.id = option;
		} else if (option) {
			Object.assign(elm, option);
		}
		elm.classList.add(PRODUCT);
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
	number:  value => CSS.number  ? CSS.number(value) : value,
	s:       value => CSS.s       ? CSS.s(value) :  `${value}s`,
	ms:      value => CSS.ms      ? CSS.ms(value) : `${value}ms`,
	pt:      value => CSS.pt      ? CSS.pt(value) : `${value}pt`,
	px:      value => CSS.px      ? CSS.px(value) : `${value}px`,
	percent: value => CSS.percent ? CSS.percent(value) : `${value}%`,
	vh:      value => CSS.vh      ? CSS.vh(value) : `${value}vh`,
	vw:      value => CSS.vw      ? CSS.vw(value) : `${value}vw`,
};
const cssUtil = css;

    const 業務 = function(self) {
      let fastMode, faceDetection, textDetection, debug, enabled;
      const init = params => {
        updateConfig({config: params.config});
      };

      const updateConfig = ({config}) => {
        ({fastMode, faceDetection, textDetection, debug, enabled} = config);
        faceDetector = new (self || window).FaceDetector({fastMode});
        textDetector = new (self || window).TextDetector();
      };

      let faceDetector;
      let textDetector;
      const detect = async ({bitmap}) => {
        // debug && console.time('detect');
        const tasks = [];
        faceDetection && (tasks.push(faceDetector.detect(bitmap).catch(() => [])));
        textDetection && (tasks.push(textDetector.detect(bitmap).catch(() => [])));
        const detected = (await Promise.all(tasks)).flat();

        const boxes = detected.map(d => {
          const {x, y , width, height} = d.boundingBox;
          return {x, y , width, height, type: d.landmarks ? 'face' : 'text'};
        });
        // debug && console.timeEnd('detect');
        return {boxes};
      };

      self.onmessage = async e => {
        const {command, params} = e.data.body;
        try {
          switch (command) {
            case 'init':
              init(params);
              self.postMessage({body: {command: 'init', params: {}, status: 'ok'}});
              break;
            case 'config':
              updateConfig(params);
              break;
            case 'detect': {
              const {dataURL, boxes} = await detect(params);
              self.postMessage({body: {command: 'data', params: {dataURL, boxes}, status: 'ok'}});
            }
              break;
          }
        } catch(err) {
          console.error('error', {command, params}, err);
        }
      };
    };

    const 下請 = function(self, registerPaint, config) {
      registerPaint('塗装', class {
        static get inputProperties() {
          return ['--json-args', '--config'];
        }
        paint(ctx, {width, height}, props) {
          const args   = JSON.parse(props.get('--json-args').toString() || '{}');
          const config = JSON.parse(props.get('--config').toString() || '{}');

          ctx.beginPath();
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          ctx.fillRect(0, 0, width, height);
          if (!args.history || !config.enabled) {
            return;
          }

          const ratio = Math.min(width / config.tmpWidth, height / config.tmpHeight);
          const transX = (width  - (config.tmpWidth  * ratio)) / 2;
          const transY = (height - (config.tmpHeight * ratio)) / 2;
          const tmpArea = (config.tmpWidth  * ratio) * (config.tmpHeight * ratio);


          /** @type {(BoundingBox[])[]} */
          const history = args.history;
          for (const boxes of history) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(0, 0, width, height);

            for (const box of boxes) {
              let {x, y , width, height, type} = box;
              const area = width * height;
              const opacity = area / tmpArea * 0.3;
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

              x = x * ratio + transX;
              y = y * ratio + transY;
              width  *= ratio;
              height *= ratio;
              if (type === 'face') {
                const mx = 16 * ratio, my = 24 * ratio; // margin
                ctx.clearRect(x - mx, y  - my, width + mx * 2, height + my * 2);
                ctx.fillRect (x - mx, y  - my, width + mx * 2, height + my * 2);
              } else {
                const mx = 16 * ratio, my = 16 * ratio; // margin
                ctx.clearRect(x - mx, y  - my, width + mx * 2, height + my * 2);
                ctx.fillRect (x - mx, y  - my, width + mx * 2, height + my * 2);
              }
            }
          }
        }
      });
    };

    const createDetector = async ({video, layer, interval, type}) => {
      const worker = createWorker(業務, {name: 'Facelook'});
      await css.addModule(下請, {config: {...config}});
      const transferCanvas = new OffscreenCanvas(config.tmpWidth, config.tmpHeight);
      const ctx = transferCanvas.getContext('2d', {alpha: false, desynchronized: true});
      const debugLayer = document.createElement('div');
      [layer, debugLayer].forEach(layer => {
        layer.style.setProperty('--config', JSON.stringify({...config}));
        layer.style.setProperty('--json-args', '{}');
      });
      'maskImage' in layer.style ?
        (layer.style.maskImage = 'paint(塗装)') :
        (layer.style.webkitMaskImage = 'paint(塗装)');

      // for debug
      Object.assign(debugLayer.style, {
        border: '1px solid #888',
        left: 0,
        bottom: '48px',
        position: 'fixed',
        zIndex: '100000',
        width: '160px',
        height: '90px',
        opacity: 0.5,
        background: '#333',
        pointerEvents: 'none',
        userSelect: 'none'
      });
      debugLayer.classList.add('zen-family');
      debugLayer.dataset.type = type;
      debugLayer.style.backgroundImage = 'paint(塗装)';
      config.debug && document.body.append(debugLayer);
      worker.postMessage({body: {command: 'init', params: {config: {...config}}}});

      let isBusy = true, currentTime = video.currentTime, boxHistory = [];
      worker.addEventListener('message', e => {
        const {command, params} = e.data.body;
        switch (command) {
          case 'init':
            console.log('initialized');
            isBusy = false;
            break;
          case 'data': {
            isBusy = false;
            if (!config.enabled) { return; }
            /** @type {BoundingBox[]} */
            const boxes = params.boxes;
            boxHistory.push(boxes);
            while (boxHistory.length > 5) { boxHistory.shift(); }
            const arg = JSON.stringify({
              tmpWidth: config.tmpWidth, tmpHeight: config.tmpHeight,
              history: boxHistory
            });
            layer.style.setProperty('--json-args', arg);
            config.debug && debugLayer.style.setProperty('--json-args', arg);
          }
          break;
        }
      });

      const onTimer = () => {
        if (isBusy ||
            currentTime === video.currentTime ||
            document.visibilityState !== 'visible') {
          return;
        }

        currentTime = video.currentTime;
        const vw = video.videoWidth, vh = video.videoHeight;
        const tmpWidth = config.tmpWidth, tmpHeight = config.tmpHeight;
        const ratio = Math.min(tmpWidth / vw, tmpHeight / vh);
        const dw = vw * ratio, dh = vh * ratio;
        ctx.beginPath();
        ctx.drawImage(
          video,
          0, 0, vw, vh,
          (tmpWidth - dw) / 2, (tmpHeight - dh) / 2, dw, dh
        );
        const bitmap = transferCanvas.transferToImageBitmap();
        isBusy = true;
        worker.postMessage({body: {command: 'detect', params: {bitmap}}}, [bitmap]);
      };
      let timer = setInterval(onTimer, interval);

      const start = () => timer = setInterval(onTimer, interval);
      const stop = () => timer = clearInterval(timer);

      window.addEventListener(`${PRODUCT}-config.update`, e => {
        worker.postMessage({body: {command: 'config', params: {config: {...config}}}});
        const {key, value} = e.detail;
        layer.style.setProperty('--config', JSON.stringify({...config}));
        debugLayer.style.setProperty('--config', JSON.stringify({...config}));
        switch (key) {
          case 'enabled':
            value ? start() : stop();
            break;
          case 'debug':
            value ? document.body.append(debugLayer) : debugLayer.remove();
            break;
          case 'tmpWidth':
            transferCanvas.width = value;
            break;
          case 'tmpHeight':
            transferCanvas.height = value;
            break;
        }
      }, {passive: true});
      return { start, stop };
    };

    const dialog = ((config) => {
      class MaskedWatchDialog extends HTMLElement {
        init() {
          if (this.shadow) { return; }
          this.shadow = this.attachShadow({mode: 'open'});
          this.shadow.innerHTML = this.getTemplate(config);
          this.root = this.shadow.querySelector('#root');
          this.shadow.querySelector('.close-button').addEventListener('click', e => {
            this.close(); e.stopPropagation(); e.preventDefault();
          });
          this.root.addEventListener('click', e => {
            if (e.target === this.root) { this.close(); }
            e.stopPropagation();
          });
          this.classList.add('zen-family');
          this.root.classList.add('zen-family');
          this.update();

          this.root.addEventListener('change', e => {
            const input = e.target;
            const name = input.name;
            const value = JSON.parse(input.value);
            config.debug && console.log('update config', {name, value});
            config[name] = value;
          });
        }
        getTemplate(config) {
          return `
          <dialog id="root" class="root">
            <div>
            <style>
              .root {
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 50%;
                transform: translate(0, -50%);
                background: rgba(240, 240, 240, 0.95);
                color: #222;
                padding: 16px 24px 8px;
                border: 0;
                user-select: none;
                box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.8);
                text-shadow: 1px 1px 0 #fff;
                border-radius: 4px;
              }
              .title {
                margin: 0;
                padding: 0 0 16px;
                font-size: 20px;
                text-align: center;
              }
              .config {
                padding: 0 0 16px;
                line-height: 20px;
              }
              .name {
                display: inline-block;
                min-width: 240px;
                white-space: nowrap;
                margin: 0;
              }
              label {
                display: inline-block;
                padding: 8px;
                line-height: 20px;
                min-width: 100px;
                border: 1px groove silver;
                border-radius: 4px;
                cursor: pointer;
              }
              label + label {
                margin-left: 8px;
              }
              label:hover {
                background: rgba(255, 255, 255, 1);
              }
              input[type=radio] {
                transform: scale(1.5);
                margin-right: 12px;
              }
              .close-button {
                display: block;
                margin: 8px auto 0;
                min-width: 180px;
                padding: 8px;
                font-size: 16px;
                border-radius: 4px;
                text-align: center;
                cursor: pointer;
                outline: none;
              }
            </style>
            <h1 class="title">††† Masked Watch 設定 †††</h1>
            <div class="config">
              <h3 class="name">顔の検出</h3>
              <label><input type="radio" name="faceDetection" value="true">ON</label>
              <label><input type="radio" name="faceDetection" value="false">OFF</label>
            </div>

            <div class="config">
              <h3 class="name">テキストの検出<br>
                <span class="name" style="font-size: 80%;">windowsで動かないっぽい？</span>
              </h3>
              <label><input type="radio" name="textDetection" value="true">ON</label>
              <label><input type="radio" name="textDetection" value="false">OFF</label>
            </div>

            <div class="config">
              <h3 class="name">動作モード</h3>
              <label><input type="radio" name="fastMode" value="true">速度重視</label>
              <label><input type="radio" name="fastMode" value="false">精度重視</label>
            </div>

            <div class="config">
              <h3 class="name">デバッグ</h3>
              <label><input type="radio" name="debug" value="true">ON</label>
              <label><input type="radio" name="debug" value="false">OFF</label>
            </div>

            <div class="config">
              <h3 class="name">MaskedWatch有効/無効</h3>
              <label><input type="radio" name="enabled" value="true">有効</label>
              <label><input type="radio" name="enabled" value="false">無効</label>
            </div>
            <div class="config">
              <button class="close-button">閉じる</button>
            </div>
            </div>
          </dialog>
          `;
        }

        update() {
          this.init();
          [...this.shadow.querySelectorAll('input')].forEach(input => {
            const name = input.name, value = JSON.parse(input.value);
            input.checked = config[name] === value;
          });
        }

        get isOpen() {
          return !!this.root && !!this.root.open;
        }

        open() {
          this.update();
          this.root.showModal();
        }

        close() {
          this.root && this.root.close();
        }

        toggle() {
          this.init();
          if (this.isOpen) {
            this.root.close();
          } else {
            this.open();
          }
        }
      }
      window.customElements.define(`${PRODUCT.toLowerCase()}-dialog`, MaskedWatchDialog);
      return document.createElement(`${PRODUCT.toLowerCase()}-dialog`);
    })(config);
    MaskedWatch.dialog = dialog;

    const createToggleButton = (config, dialog) => {
      class ToggleButton extends HTMLElement {
        constructor() {
          super();
          this.init();
        }
        init() {
          if (this.shadow) { return; }
          this.shadow = this.attachShadow({mode: 'open'});
          this.shadow.innerHTML = this.getTemplate(config);
          this.root = this.shadow.querySelector('#root');
          this.root.addEventListener('click', e => {
            dialog.toggle(); e.stopPropagation(); e.preventDefault();
          });
        }
        getTemplate() {
          return `
          <style>
          .controlButton {
            position: relative;
            display: inline-block;
            transition: opacity 0.4s ease, margin-left 0.2s ease, margin-top 0.2s ease;
            box-sizing: border-box;
            text-align: center;
            cursor: pointer;
            color: #fff;
            opacity: 0.8;
            vertical-align: middle;
          }
          .controlButton:hover {
            cursor: pointer;
            opacity: 1;
          }
          .controlButton .controlButtonInner {
            filter: grayscale(100%);
          }
          .switch {
            font-size: 16px;
            width: 32px;
            height: 32px;
            line-height: 30px;
            cursor: pointer;
          }
          .is-Enabled .controlButtonInner {
            color: #aef;
            filter: none;
          }

          .controlButton .tooltip {
            display: none;
            pointer-events: none;
            position: absolute;
            left: 16px;
            top: -30px;
            transform:  translate(-50%, 0);
            font-size: 12px;
            line-height: 16px;
            padding: 2px 4px;
            border: 1px solid !000;
            background: #ffc;
            color: #000;
            text-shadow: none;
            white-space: nowrap;
            z-index: 100;
            opacity: 0.8;
          }

          .controlButton:hover {
            background: #222;
          }

          .controlButton:hover .tooltip {
            display: block;
            opacity: 1;
          }

        </style>
        <div id="root" class="switch controlButton root">
          <div class="controlButtonInner" title="MaskedWatch">&#9787;</div>
          <div class="tooltip">Masked Watch</div>
        </div>
            `;
        }
      }
      window.customElements.define(`${PRODUCT.toLowerCase()}-toggle-button`, ToggleButton);
      return document.createElement(`${PRODUCT.toLowerCase()}-toggle-button`);
    };

    const ZenzaDetector = (() => {
      const promise =
        (window.ZenzaWatch && window.ZenzaWatch.ready) ?
          Promise.resolve(window.ZenzaWatch) :
          new Promise(resolve => {
            [window, (document.body || document.documentElement)]
              .forEach(e => e.addEventListener('ZenzaWatchInitialize', () => {
                resolve(window.ZenzaWatch);
              }, {once: true}));
          });
      return {detect: () => promise};
    })();

    const vmap = new WeakMap();
    let timer;
    const watch = () => {
      if (!config.enabled || document.visibilityState !== 'visible') { return; }
      [...document.querySelectorAll('video, zenza-video')]
        .filter(video => !video.paused && !vmap.has(video))
        .forEach(video => {
          // 対応プレイヤー増やすならココ
          let layer, type = 'UNKNOWN';
          if (video.closest('#MainVideoPlayer')) {
            layer = document.querySelector('.CommentRenderer');
            type = 'NICO VIDEO';
          } else if (video.closest('#rootElementId')) {
            layer = document.querySelector('#comment canvas');
            type = 'NICO EMBED';
          } else if (video.closest('#watchVideoContainer')) {
            layer = document.querySelector('#jsPlayerCanvasComment canvas');
            type = 'NICO SP';
          } else if (video.closest('.zenzaPlayerContainer')) {
            layer = document.querySelector('.commentLayerFrame');
            type = 'ZenzaWatch';
          } else if (video.closest('[class*="__leo"]')) {
            layer = document.querySelector('#comment-layer-container canvas');
            type = 'NICO LIVE';
          } else if (video.closest('#bilibiliPlayer')) {
            layer = document.querySelector('.bilibili-player-video-danmaku').parentElement;
            type = 'BILI BILI [´ω`]';
          } else if (video.id === 'js-video') {
            layer = document.querySelector('#cmCanvas');
            type = 'HIMAWARI';
          }

          console.log('%ctype: "%s"', 'font-weight: bold', layer ? type : 'UNKNOWN???');
          layer && Object.assign(layer.style, {
            backgroundSize:     'contain',
            maskSize:           'contain',
            webkitMaskSize:     'contain',
            maskRepeat:         'no-repeat',
            webkitMaskRepeat:   'no-repeat',
            maskPosition:       'center center',
            webkitMaskPosition: 'center center'
          });
          layer && video.dispatchEvent(
            new CustomEvent(`${PRODUCT}-start`,
            {detail: {type, video, layer}, bubbles: true, composed: true}
          ));

          vmap.set(video,
            layer ?
            createDetector({video: video.drawableElement || video, layer, interval: config.interval, type}) :
            type
          );
          layer && !location.href.startsWith('https://www.nicovideo.jp/watch/') && clearInterval(timer);
        });
    };

    const init = () => {
      css.registerProps(
        {name: '--json-args', syntax: '*', initialValue: '{}', inherits: false },
        {name: '--config',    syntax: '*', initialValue: '{}', inherits: false }
      );
      timer = setInterval(watch, 1000);

      document.body.append(dialog);

      window.setTimeout(() => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="javascript:;">${PRODUCT}設定</a>`;
        li.style.whiteSpace = 'nowrap';
        li.addEventListener('click', () => dialog.toggle());
        document.querySelector('#siteHeaderRightMenuContainer').append(li);
      }, document.querySelector('#siteHeaderRightMenuContainer') ? 1000 : 15000);

      ZenzaDetector.detect().then(zen => {
        console.log('ZenzaWatch found ver.%s', zen.version);
        ZenzaWatch = zen;
        ZenzaWatch.emitter.on('videoControBar.addonMenuReady', (container, handler) => {
          container.append(createToggleButton(config, dialog));
        });
        ZenzaWatch.emitter.on('videoContextMenu.addonMenuReady.list', (menuContainer) => {
          const faceMenu = document.createElement('li');
          faceMenu.className = 'command';
          faceMenu.dataset.command = 'nop';
          faceMenu.textContent = '顔の検出';
          faceMenu.classList.toggle('selected', config.faceDetection);
          faceMenu.addEventListener('click', () => {
            config.faceDetection = !config.faceDetection;
          });
          const textMenu = document.createElement('li');
          textMenu.className = 'command';
          textMenu.dataset.command = 'nop';
          textMenu.textContent = 'テキストの検出';
          textMenu.classList.toggle('selected', config.textDetection);
          textMenu.addEventListener('click', () => {
            config.textDetection = !config.textDetection;
          });
          ZenzaWatch.emitter.on('showMenu', () => {
            faceMenu.classList.toggle('selected', config.faceDetection);
            textMenu.classList.toggle('selected', config.textDetection);
          });

          menuContainer.append(faceMenu, textMenu);
        });

      });
    };
    init();

    // eslint-disable-next-line no-undef
    console.log('%cMasked Watch', 'font-size: 200%;', `ver ${VER}`, '\nconfig: ', JSON.stringify({...config}));
  };

  const loadGm = () => {
    const script = document.createElement('script');
    script.id = `${PRODUCT}Loader`;
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.append(`
    (() => {
      (${monkey.toString()})("${PRODUCT}");
    })();`);
    (document.head || document.documentElement).append(script);
  };

  loadGm();
})();