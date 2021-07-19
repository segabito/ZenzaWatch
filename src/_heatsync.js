// ==UserScript==
// @name        HeatSync
// @namespace   https://github.com/segabito/
// @description コメントの少ないところだけ自動で早送りする、忙しい人のためのZenzaWatch拡張
// @match       *://www.nicovideo.jp/*
// @match       *://ext.nicovideo.jp/
// @match       *://ext.nicovideo.jp/#*
// @match       *://ch.nicovideo.jp/*
// @match       *://com.nicovideo.jp/*
// @match       *://commons.nicovideo.jp/*
// @match       *://dic.nicovideo.jp/*
// @exclude     *://ads*.nicovideo.jp/*
// @exclude     *://www.upload.nicovideo.jp/*
// @exclude     *://www.nicovideo.jp/watch/*?edit=*
// @exclude     *://ch.nicovideo.jp/tool/*
// @exclude     *://flapi.nicovideo.jp/*
// @exclude     *://dic.nicovideo.jp/p/*
// @version     0.0.18 Another.1
// @grant       none
// @author      segabito macmoto
// @license     public domain
// @noframes
// ==/UserScript==
import {Emitter, Handler, EmitterInitFunc, PromiseHandler} from '../packages/lib/src/Emitter';
import {ZenzaDetector} from '../packages/components/src/util/ZenzaDetector';

(() => {
  const PRODUCT = 'HeatSync';
  const monkey = function(PRODUCT) {
    const console = window.console;
    let ZenzaWatch = null;
    //const $ = window.jQuery;
    console.log(`exec ${PRODUCT}..`);

    const CONSTANT = {
      BASE_Z_INDEX: 150000
    };
    const product = {debug: {_const: CONSTANT}};
    window[PRODUCT] = product;

//@require Emitter
    const {util} = (function() {
      const util = {};

      util.addStyle = function(styles, id) {
        var elm = document.createElement('style');
        elm.type = 'text/css';
        if (id) { elm.id = id; }

        var text = styles.toString();
        text = document.createTextNode(text);
        elm.appendChild(text);
        var head = document.getElementsByTagName('head');
        head = head[0];
        head.appendChild(elm);
        return elm;
      };

      util.mixin = function(self, o) {
        _.each(Object.keys(o), f => {
          if (!_.isFunction(o[f])) { return; }
          if (_.isFunction(self[f])) { return; }
          self[f] = o[f].bind(o);
        });
      };

      util.attachShadowDom = function({host, tpl, mode = 'open'}) {
        const root = host.attachShadow ?
          host.attachShadow({mode}) : host.createShadowRoot();
        const node = document.importNode(tpl.content, true);
        root.appendChild(node);
        return root;
      };

      util.getWatchId = function(url) {
        /\/?watch\/([a-z0-9]+)/.test(url || location.pathname);
        return RegExp.$1;
      };

      util.isLogin = function() {
        return document.getElementsByClassName('siteHeaderLogin').length < 1;
      };

      util.escapeHtml = function(text) {
        var map = {
          '&':    '&amp;',
          '\x27': '&#39;',
          '"':    '&quot;',
          '<':    '&lt;',
          '>':    '&gt;'
        };
        return text.replace(/[&"'<>]/g, char => {
          return map[char];
        });
      };

      util.unescapeHtml = function(text) {
        var map = {
          '&amp;'  : '&' ,
          '&#39;'  : '\x27',
          '&quot;' : '"',
          '&lt;'   : '<',
          '&gt;'   : '>'
        };
        return text.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, char => {
          return map[char];
        });
      };

      util.escapeRegs = function(text) {
        const map = {
          '\\': '\\\\',
          '*':  '\\*',
          '+':  '\\+',
          '.':  '\\.',
          '?':  '\\?',
          '{':  '\\{',
          '}':  '\\}',
          '(':  '\\(',
          ')':  '\\)',
          '[':  '\\[',
          ']':  '\\]',
          '^':  '\\^',
          '$':  '\\$',
          '-':  '\\-',
          '|':  '\\|',
          '/':  '\\/',
        };
        return text.replace(/[\\\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/]/g, char => {
          return map[char];
        });
      };

      util.hasLargeThumbnail = function(videoId) { // return true;
        // 大サムネが存在する最初の動画ID。 ソースはちゆ12歳
        // ※この数字以降でもごく稀に例外はある。
        var threthold = 16371888;
        var cid = videoId.substr(0, 2);
        if (cid !== 'sm') { return false; }

        var fid = videoId.substr(2) * 1;
        if (fid < threthold) { return false; }

        return true;
      };

      const videoIdReg = /^[a-z]{2}\d+$/;
      util.getThumbnailUrlByVideoId = function(videoId) {
        if (!videoIdReg.test(videoId)) {
          return null;
        }
        const fileId = parseInt(videoId.substr(2), 10);
        const num = (fileId % 4) + 1;
        const large = util.hasLargeThumbnail(videoId) ? '.L' : '';
        return '//tn-skr' + num + '.smilevideo.jp/smile?i=' + fileId + large;
      };

      util.isFirefox = function() {
        return navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;
      };

      util.emitter = new Emitter;

      return {util, Emitter};
    })(PRODUCT);
    product.util = util;

//@require ZenzaDetector

    const broadcast = (() => {
      if (!window.BroadcastChannel) { return {send: () => {}}; }
      const bc = new window.BroadcastChannel(PRODUCT);

      const onMessage = (e) => {
        const packet = e.data;
        //console.log('%creceive message', 'background: cyan;', packet);
        util.emitter.emit('broadcast', packet);
      };

      const send = (packet) => {
        //console.log('%csend message', 'background: cyan;', packet);
        bc.postMessage(packet);
      };

      bc.addEventListener('message', onMessage);

      return {
        send
      };
    })();



    const config = (function() {
      const prefix = PRODUCT + '_config_';
      const emitter = new Emitter();

      const defaultConfig = {
        debug: false,

        'turbo.enabled': true,
        'turbo.red': 1,
        'turbo.smile-blue':   1.7,
        'turbo.dmc-blue':   1.7,
        'turbo.minDuration': 30,

        'turbo.ignoreTags': 'VOCALOID 音楽 作業用BGM 演奏してみた 歌ってみた'

       };

      const config = {};
      let noEmit = false;


      emitter.refresh = (emitChange = false) => {
        Object.keys(defaultConfig).forEach(key => {
          var storageKey = prefix + key;
          if (localStorage.hasOwnProperty(storageKey)) {
            try {
              let lastValue = config[key];
              let newValue = JSON.parse(localStorage.getItem(storageKey));
              if (lastValue !== newValue) {
                config[key] = newValue;
                if (emitChange) {
                  emitter.emit('key', newValue);
                  emitter.emit('@update', {key, value: newValue});
                }
              }
            } catch (e) {
              window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
              config[key] = defaultConfig[key];
            }
          } else {
            config[key] = defaultConfig[key];
          }
        });
      };
      emitter.refresh();

      emitter.getValue = function(key, refresh) {
        if (refresh) {
          emitter.refreshValue(key);
        }
        return config[key];
      };

      emitter.setValue = function(key, value) {
        if (config[key] !== value && arguments.length >= 2) {
          var storageKey = prefix + key;
          localStorage.setItem(storageKey, JSON.stringify(value));
          config[key] = value;
          emitter.emit(key, value);
          emitter.emit('@update', {key, value});
          broadcast.send('configUpdate');
          //console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
        }
      };

      emitter.clearConfig = function() {
        noEmit = true;
        Object.keys(defaultConfig).forEach(key => {
          if (_.contains(['message', 'debug'], key)) { return; }
          var storageKey = prefix + key;
          try {
            if (localStorage.hasOwnProperty(storageKey)) {
              localStorage.removeItem(storageKey);
            }
            config[key] = defaultConfig[key];
          } catch (e) {}
        });
        noEmit = false;
      };

      emitter.getKeys = function() {
        return Object.keys(defaultConfig);
      };

      emitter.namespace = function(name) {
        return {
          getValue: (key) => { return emitter.getValue(name + '.' + key); },
          setValue: (key, value) => { emitter.setValue(name + '.' + key, value); },
          refresh: () => { emitter.refresh(); },
          on: (key, func) => {
            if (key === '@update') {
              emitter.on('@update', ({key, value}) => {
                const pre = name + '.';
                //console.log('@update', key, value, pre);
                if (key.startsWith(pre)) {
                  func({key: key.replace(pre, ''), value});
                }
              });
            } else {
              emitter.on(name + '.' + key, func);
            }
          }
        };
      };

      util.emitter.on('broadcast', (type) => {
        //if (type !== 'configUpdate') { return; }
        emitter.refresh(false);
        emitter.emit('refresh');
      });

      return emitter;
    })();
    product.config = config;

    class Syncer extends Emitter {
      constructor() {
        super();
        this._timer = null;
        this._videoElement = null;
        this._rate = 1.0;

        this._config = config.namespace('turbo');

        util.emitter.on('heatMapUpdate', this._onHeatMapUpdate.bind(this));
        util.emitter.on('zenzaClose', this._onZenzaClose.bind(this));
        util.emitter.on('zenzaOpen', this._onZenzaOpen.bind(this));
        util.emitter.on('broadcast', this._onBroadcast.bind(this));
      }

      enable() {
        if (this._timer) { return; }
        console.info('start timer', this._timer, this._rate); //, this._map);
        this._enabled = true;
        this._timer = setInterval(this._onTimer.bind(this), 500);
      }

      disable() {
        clearInterval(this._timer);
        this._rate = config.getValue('turbo.red');
        if (this._enabled && config.getValue('turbo.enabled')) {
          window.ZenzaWatch.config.setValue('playbackRate', this._rate);
        }
        this._enabled = false;
        this._timer = null;
      }

      _onZenzaOpen() {
        if (this._dialog || !window.ZenzaWatch.debug.dialog) { return; }
        this._dialog = window.ZenzaWatch.debug.dialog;
        this._dialog.on('loadVideoInfo', this._onVideoInfoLoad.bind(this));
      }

      _onZenzaClose() {
        this.disable();
      }

      _onVideoInfoLoad(videoInfo) {
        const tags = (videoInfo.tagList || [])
          .map(t => { return t.name.toUpperCase(); });
        this._tags = tags;
      }

      _onHeatMapUpdate({map, duration}) {
        this._map = map;
        this._duration = duration;
        this._rate = config.getValue('turbo.red');
        if (duration < config.getValue('turbo.minDuration')) {
          window.console.log('disable HeatSync by duration', duration);
          return this.disable();
        }
        //if (this._videoElement && this._videoElement.playbackRate < this._rate) {
        //  window.console.log('disable HeatSync by playbackRate',
        //    this._videoElement.playbackRate);
        //  return this.disable();
        //}
        const currentTags = this._tags || [];
        const ignoreTags = config.getValue('turbo.ignoreTags').split(/[ 　]/);
        if (currentTags.some(t => { return ignoreTags.includes(t.toUpperCase()); })) {
          window.console.log('disable HeatSync by tag'); //, currentTags, ignoreTags);
          return this.disable();
        }
        this.enable();
      }

      _onTimer() {
        //if (!this._videoElement) {
          this._videoElement = window.ZenzaWatch.external.getVideoElement();
          if (!this._videoElement) { return; }
        //}
        const video = this._videoElement;
        const isEconomy = /smile\?m=[\d\.]+low$/.test(video.src);
        this._lastEnabled = config.getValue('turbo.enabled');
        if (video.paused || !this._lastEnabled || isEconomy) { return; }
        const duration = video.duration;
        const current  = video.currentTime;
        const per = current / duration;
        const perNear = Math.min(duration, current + 3) / duration;
        const isDmc = /dmc\.nico/.test(video.src);
        const map = this._map;
        const pos = Math.floor(map.length * per);
        const posNear = Math.floor(map.length * perNear);

        const blue = parseFloat(isDmc ?
          config.getValue('turbo.dmc-blue') : config.getValue('turbo.smile-blue'));
        const red = parseFloat(config.getValue('turbo.red'));

        const pt = Math.max(map[pos], map[posNear]);

        let ratePer = (256 - pt) / 256;
        if (ratePer > 0.95) { ratePer = 1; }
        if (ratePer < 0.4) { ratePer = 0; }
        let rate = red + (blue - red) * ratePer;

        rate = Math.round(rate * 100) / 100;
        //console.info('onTimer', pt, pt / 255, Math.round(ratePer * 100) / 100, rate);
        if (isNaN(rate)) { return; }
        if (Math.abs(rate - this._rate) < 0.05) { return; }
        // ユーザーが自分でスロー再生してるっぽい時は何もしない
        if (video.playbackRate < red) {
          return;
        }
        // スローは即時、加速はちょっと遅く反映
        this._rate = rate > this._rate ? (rate * 2 + this._rate) / 3 : rate;
        window.ZenzaWatch.config.setValue('playbackRate',
          Math.floor(this._rate * 100) / 100);
      }

      _onBroadcast() {
        const lastEnabled = this._lastEnabled;
        window.setTimeout(() => {
          const currentEnabled = config.getValue('turbo.enabled');
          if (lastEnabled && !currentEnabled) {
            this.disable();
          }
        }, 1000);
      }
    }

    class BaseViewComponent extends Emitter {
      constructor({parentNode = null, name = '', template = '', shadow = '', css = ''}) {
        super();

        this._params = {parentNode, name, template, shadow, css};
        this._bound = {};
        this._state = {};
        this._props = {};
        this._elm = {};

        this._initDom({
          parentNode,
          name,
          template,
          shadow,
          css
        });
      }

      _initDom({parentNode, name, template, css = '', shadow = ''}) {
        let tplId = `${PRODUCT}${name}Template`;
        let tpl = document.getElementById(tplId);
        if (!tpl) {
          if (css) { util.addStyle(css, `${name}Style`); }
          tpl = document.createElement('template');
          tpl.innerHTML = template;
          tpl.id = tplId;
          document.body.appendChild(tpl);
        }
        const onClick = this._bound.onClick = this._onClick.bind(this);

        const view = document.importNode(tpl.content, true);
        this._view = view.querySelector('*') || document.createDocumentFragment();
        if (this._view) {
          this._view.addEventListener('click', onClick);
        }
        this.appendTo(parentNode);

        if (shadow) {
          this._attachShadow({host: this._view, name, shadow});
          if (!this._isDummyShadow) {
            this._shadow.addEventListener('click', onClick);
          }
        }
      }

      _attachShadow ({host, shadow, name, mode = 'open'}) {
        let tplId = `${PRODUCT}${name}Shadow`;
        let tpl = document.getElementById(tplId);
        if (!tpl) {
          tpl = document.createElement('template');
          tpl.innerHTML = shadow;
          tpl.id = tplId;
          document.body.appendChild(tpl);
        }

        if (!host.attachShadow && !host.createShadowRoot) {
          return this._fallbackNoneShadowDom({host, tpl, name});
        }

        const root = host.attachShadow ?
          host.attachShadow({mode}) : host.createShadowRoot();
        const node = document.importNode(tpl.content, true);
        root.appendChild(node);
        this._shadowRoot = root;
        this._shadow = root.querySelector('.root');
        this._isDummyShadow = false;
      }

      _fallbackNoneShadowDom({host, tpl, name}) {
        const node = document.importNode(tpl.content, true);
        const style = node.querySelector('style');
        style.remove();
        util.addStyle(style.innerHTML, `${name}Shadow`);
        host.appendChild(node);
        this._shadow = this._shadowRoot = host.querySelector('.root');
        this._isDummyShadow = true;
      }

      setState(key, val) {
        if (typeof key === 'string') {
          this._setState(key, val);
        }
        Object.keys(key).forEach(k => {
          this._setState(k, key[k]);
        });
      }

      _setState(key, val) {
        if (this._state[key] !== val) {
          this._state[key] = val;
          if (/^is(.*)$/.test(key))  {
            this.toggleClass(`is-${RegExp.$1}`, !!val);
          }
          this.emit('update', {key, val});
        }
      }

      _onClick(e) {
        const target = e.target.classList.contains('command') ?
          e.target : e.target.closest('.command');

        if (!target) { return; }

        const command = target.getAttribute('data-command');
        if (!command) { return; }
        const type  = target.getAttribute('data-type') || 'string';
        let param   = target.getAttribute('data-param');
        e.stopPropagation();
        e.preventDefault();
        param = this._parseParam(param, type);
        this._onCommand(command, param);
      }

      _parseParam(param, type) {
        switch (type) {
          case 'json':
          case 'bool':
          case 'number':
            param = JSON.parse(param);
            break;
        }
        return param;
      }

      appendTo(parentNode) {
        if (!parentNode) { return; }
        this._parentNode = parentNode;
        parentNode.append(this._view);
      }

      _onCommand(command, param) {
        this.emit('command', command, param);
      }

      toggleClass(className, v) {
        (className || '').split(/ +/).forEach((c) => {
          if (this._view && this._view.classList) {
            this._view.classList.toggle(c, v);
          }
          if (this._shadow && this._shadow.classList) {
            this._shadow.classList.toggle(c, this._view.classList.contains(c));
          }
        });
      }

      addClass(name)    { this.toggleClass(name, true); }
      removeClass(name) { this.toggleClass(name, false); }
    }

    class ConfigPanel extends BaseViewComponent {
      constructor({parentNode}) {
        super({
          parentNode,
          name: 'HeatSyncConfigPanel',
          shadow: ConfigPanel.__shadow__,
          template: '<div class="HeatSyncConfigPanelContainer"></div>',
          css: ''
        });
        this._state = {
          isOpen: false,
          isVisible: false
        };
        config.on('refresh', this._onBeforeShow.bind(this));
      }

      get view() {
        return this._view;
      }

      _initDom(...args) {
        super._initDom(...args);
        const v = this._shadow;

        this._elm.red     = v.querySelector('*[data-config-name="turbo.red"]');
        this._elm.dmc     = v.querySelector('*[data-config-name="turbo.dmc-blue"]');
        this._elm.smile   = v.querySelector('*[data-config-name="turbo.smile-blue"]');
        this._elm.minDur  = v.querySelector('*[data-config-name="turbo.minDuration"]');
        this._elm.enabled = v.querySelector('*[data-config-name="turbo.enabled"]');
        this._elm.ignores = v.querySelector('*[data-config-name="turbo.ignoreTags"]');

        const onChange = (e) => {
          const target = e.target, name = target.getAttribute('data-config-name');
          switch (target.tagName) {
            case 'INPUT':
            case 'SELECT':
              if (target.type === 'checkbox') {
                config.setValue(name, target.checked);
              } else {
                const type = target.getAttribute('data-type');
                const value = this._parseParam(target.value, type);
                config.setValue(name, value);
              }
              break;
            default:
              //console.info('target', e, target, name, target.checked);
              config.setValue(name, !!target.checked);
              break;
          }
        };
        this._elm.red    .addEventListener('change', onChange);
        this._elm.dmc    .addEventListener('change', onChange);
        this._elm.smile  .addEventListener('change', onChange);
        this._elm.minDur .addEventListener('change', onChange);
        this._elm.enabled.addEventListener('change', onChange);
        this._elm.ignores.addEventListener('change', onChange);

        v.querySelector('.closeButton')
          .addEventListener('click', this.hide.bind(this));
      }

      _onClick(e) {
        super._onClick(e);
        e.stopPropagation();
      }

      _onMouseDown(e) {
        this.hide();
        this._onClick(e);
      }

      show() {
        document.body.addEventListener('click', this._bound.onBodyClick);
        this._onBeforeShow();

        this.setState({isOpen: true});
        window.setTimeout(() => {
          this.setState({isVisible: true});
        }, 100);
      }

      hide() {
        document.body.removeEventListener('click', this._bound.onBodyClick);
        this.setState({isVisible: false});
        window.setTimeout(() => {
          this.setState({isOpen: false});
        }, 2100);
      }

      toggle() {
        if (this._state.isOpen) {
          this.hide();
        } else {
          this.show();
        }
      }

      _onBeforeShow() {
        this._elm.red.value    = '' + config.getValue('turbo.red');
        this._elm.dmc.value    = '' + config.getValue('turbo.dmc-blue');
        this._elm.smile.value  = '' + config.getValue('turbo.smile-blue');
        this._elm.minDur.value = '' + config.getValue('turbo.minDuration');
        this._elm.ignores.value = '' + config.getValue('turbo.ignoreTags');

        this._elm.enabled.checked = !!config.getValue('turbo.enabled');
      }
    }

    ConfigPanel.__shadow__ = (`
      <style>
        .HeatSyncConfigPanel {
          display: none;
          position: fixed;
          z-index: ${CONSTANT.BASE_Z_INDEX};
          top: 50vh;
          left: 50vw;
          padding: 8px;
          border: 2px outset;
          box-shadow: 0 0 8px #000;
          background: #ccc;
          transform: translate(-50%, -50%);
          /*transform: translate(-50%, -50%) perspective(200px) rotateX(90deg);*/
          transition: opacity 0.5s;
          transform-origin: center bottom;
          animation-timing-function: steps(10);
          perspective-origin: center bottom;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          pointer-events: auto !important;
        }

        .HeatSyncConfigPanel.is-Open {
          display: block;
          opacity: 0;
          /*animation-name: dokahide;*/
        }

        .HeatSyncConfigPanel.is-Open.is-Visible {
          opacity: 1;
          /*animation-name: dokashow;*/
          /*transform: translate(-50%, -50%) perspective(200px) rotateX(0deg);*/
        }

        @keyframes dokashow {
           0% {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(200px) rotateX(90deg);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(200px) rotateX(0deg);
          }
        }

        @keyframes dokahide {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(200px) rotateX(0deg);
          }
          99% {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(200px) rotateX(90deg);
          }
          100% {
            opacity: 0;
          }
        }

        .title {
          margin: 0;
          font-weight: bolder;
          font-size: 120%;
        }

        .speedSelect {
          margin: 8px;
        }

        .minDuration {
          margin: 8px;
        }

        .ignoreTags {
          margin: 8px;
        }
          .ignoreTags input {
            margin: auto;
            width: 100%;
            font-size: 110%;
          }


        .enableSelect {
          margin: 8px;
        }

        .closeButton {
          display: block;
          text-align: center;
        }

        .closeButton {
          display: block;
          pading: 8px;
          cursor: pointer;
          margin: auto;
        }

        label {
          cursor: pointer;
        }

        input[type="number"] {
          width: 50px;
        }
      </style>
      <div class="root HeatSyncConfigPanel">
        <p class="title">†HeatSync†</p>

        <div class="speedSelect dmc">
          <span>最高倍率(新仕様サーバー)</span>
          <select data-config-name="turbo.dmc-blue" data-type="number">
            <option value="3">3.0</option>
            <option>2.9</option>
            <option>2.8</option>
            <option>2.7</option>
            <option>2.6</option>
            <option>2.5</option>
            <option>2.4</option>
            <option>2.3</option>
            <option>2.2</option>
            <option>2.1</option>
            <option value="2">2.0</option>
            <option>1.9</option>
            <option>1.8</option>
            <option>1.7</option>
            <option>1.6</option>
            <option>1.5</option>
            <option>1.4</option>
            <option>1.3</option>
            <option>1.2</option>
            <option>1.1</option>
            <option value="1">1</option>
          </select>
        </div>

        <div class="speedSelect smile">
          <span>最高倍率(旧仕様サーバー)</span>
          <select data-config-name="turbo.smile-blue" data-type="number">
            <option value="3">3.0</option>
            <option>2.9</option>
            <option>2.8</option>
            <option>2.7</option>
            <option>2.6</option>
            <option>2.5</option>
            <option>2.4</option>
            <option>2.3</option>
            <option>2.2</option>
            <option>2.1</option>
            <option value="2">2.0</option>
            <option>1.9</option>
            <option>1.8</option>
            <option>1.7</option>
            <option>1.6</option>
            <option>1.5</option>
            <option>1.4</option>
            <option>1.3</option>
            <option>1.2</option>
            <option>1.1</option>
            <option value="1">1</option>
          </select>
        </div>

        <div class="speedSelect minimum">
          <span>最低倍率</span>
          <select data-config-name="turbo.red" data-type="number">
            <option value="3">3.0</option>
            <option>2.9</option>
            <option>2.8</option>
            <option>2.7</option>
            <option>2.6</option>
            <option>2.5</option>
            <option>2.4</option>
            <option>2.3</option>
            <option>2.2</option>
            <option>2.1</option>
            <option value="2">2.0</option>
            <option>1.9</option>
            <option>1.8</option>
            <option>1.7</option>
            <option>1.6</option>
            <option>1.5</option>
            <option>1.4</option>
            <option>1.3</option>
            <option>1.2</option>
            <option>1.1</option>
            <option value="1">1.0</option>
          </select>
        </div>

        <div class="minDuration">
          <label>
            <input type="number" data-config-name="turbo.minDuration" data-type="number">
            秒未満の動画には適用しない
          </label>
        </div>

        <div class="ignoreTags">
          <label>
            このタグが含まれる動画では無効(スペース区切)
            <input type="text" data-config-name="turbo.ignoreTags">
          </label>
        </div>

        <div class="enableSelect">
          <label>
            <input type="checkbox" data-config-name="turbo.enabled" data-type="bool">
            HeatSyncを有効にする
          </label>
        </div>

        <div class="closeButtonContainer">
          <button class="closeButton" type="button">
           閉じる
          </button>
        </div>

      </div>
    `).trim();


    class ToggleButton extends BaseViewComponent {
      constructor({parentNode}) {
        super({
          parentNode,
          name: 'HeatSyncToggleButton',
          shadow: ToggleButton.__shadow__,
          template: '<div class="HeatSyncToggleButtonContainer"></div>',
          css: ''
        });

        this._state = {
          isEnabled: undefined
        };

        config.on('turbo.enabled', () => {
          this.refresh();
        });
      }

      refresh() {
        this.setState({isEnabled: config.getValue('turbo.enabled')});
      }
    }



    ToggleButton.__shadow__ = `
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
          text-shadow: 0 0 8px #ff9;
          cursor: pointer;
          opacity: 1;
        }
        .heatSyncSwitch {
          font-size: 16px;
          width: 32px;
          height: 32px;
          line-height: 30px;
          cursor: pointer;
        }
        .is-Enabled .controlButtonInner {
          color: #aef;
          text-shadow: 0 0 4px #fea, 0 0 8px orange;
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
      <div class="heatSyncSwitch controlButton root command" data-command="toggleHeatSyncDialog">
        <div class="controlButtonInner" title="HeatSync">HS</div>
        <div class="tooltip">HeatSync</div>
      </div>
    `.trim();



    const initExternal = (syncer) => {
      product.external = {
        syncer
      };

      product.isReady = true;
      const ev = new CustomEvent(`${PRODUCT}Initialized`, { detail: { product } });
      document.body.dispatchEvent(ev);
    };

    let configPanel;
    const initDom = async (ZenzaWatch) => {
      const li = document.createElement('li');
      li.innerHTML = '<a href="javascript:;">†HeatSync†設定</a>';
      li.addEventListener('click', () => {
        if (!configPanel) {
          configPanel = new ConfigPanel({parentNode: document.body});
        }
        configPanel.toggle();
      });
      const header = document.querySelector('#siteHeaderRightMenuContainer');
      header && header.appendChild(li);

      const initButton = (container, handler) => {
        const toggleButton = new ToggleButton({parentNode: container});
        product.toggleButton = toggleButton;
        toggleButton.on('command', handler);
        if (!configPanel) {
          configPanel = new ConfigPanel({parentNode: document.querySelector('.zenzaPlayerContainer')});
        }
        toggleButton.refresh();
      };
      if (ZenzaWatch.emitter.promise) {
        const {container, handler} = await ZenzaWatch.emitter.promise('videoControBar.addonMenuReady');
        initButton(container, handler);
      } else {
        ZenzaWatch.emitter.on('videoControBar.addonMenuReady', initButton);
      }
    };

    const init = () => {
      let syncer;
      console.log('init HeatSync...');
      ZenzaDetector.detect().then(() => {
        const ZenzaWatch = window.ZenzaWatch;
        ZenzaWatch.emitter.on('DialogPlayerOpen', () => {
          util.emitter.emit('zenzaOpen');
          if (configPanel) {
            document.querySelector('.zenzaPlayerContainer').append(configPanel.view);
          }
        });

        ZenzaWatch.emitter.on('DialogPlayerClose', () => {
          util.emitter.emit('zenzaClose');
          if (configPanel) {
            document.body.append(configPanel.view);
          }
        });

        ZenzaWatch.emitter.on('heatMapUpdate', (p) => {
          util.emitter.emit('heatMapUpdate', p);
        });

        ZenzaWatch.emitter.on('command-toggleHeatSyncDialog', () => {
          if (!configPanel) {
            configPanel = new ConfigPanel({parentNode: document.querySelector('.zenzaPlayerContainer')});
          }
          configPanel.toggle();
        });

        initDom(ZenzaWatch);


        //console.info('detect zenzawatch...');

        syncer = new Syncer();

        initExternal(syncer);
      });
    };

    init();
  };

  (() => {
    const script = document.createElement('script');
    script.id = `${PRODUCT}Loader`;
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.appendChild(document.createTextNode( '(' + monkey + ')("' + PRODUCT + '");' ));
    document.body.appendChild(script);
  })();
})();
