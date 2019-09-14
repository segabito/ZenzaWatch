// ==UserScript==
// @name        ZenzaGamePad
// @namespace   https://github.com/segabito/
// @description ZenzaWatchをゲームパッドで操作
// @include     *://*.nicovideo.jp/*
// @version     1.3.9
// @author      segabito macmoto
// @license     public domain
// @grant       none
// @noframes
// ==/UserScript==


// 推奨
//
// XInput系 (XboxOne, Xbox360コントローラ等)
// DualShock4
// USBサターンパッド
// 8bitdo FC30系



(function() {

  var monkey = function(ZenzaWatch) {
    if (!window.navigator.getGamepads) {
      window.console.log('%cGamepad APIがサポートされていません', 'background: red; color: yellow;');
      return;
    }

    const PRODUCT = 'ZenzaGamePad';
    const CONSTANT = {
      BASE_Z_INDEX: 150000
    };
    let _ = window._ || ZenzaWatch.lib._;
    let $ = window.jQuery || ZenzaWatch.lib.$;
    let util = ZenzaWatch.util;
    let Emitter = ZenzaWatch.modules ? ZenzaWatch.modules.Emitter : ZenzaWatch.lib.AsyncEmitter;

    let isZenzaWatchOpen = false;

    let console;
    let debugMode = !true;

    let dummyConsole = {
      log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop
    };
    console = debugMode ? window.console : dummyConsole;

    let isPauseButtonDown = false;
    let isRate1ButtonDown = false;

    const Config = (() => {
      const prefix = PRODUCT + '_config_';
      const emitter = new Emitter();

      const defaultConfig = {
        debug: false,
        enabled: true,
        needFocus: false,
        deviceIndex: 1
       };

      const config = {};

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

      emitter.get = function(key, refresh) {
        if (refresh) {
          emitter.refreshValue(key);
        }
        return config[key];
      };

      emitter.set = function(key, value) {
        if (config[key] !== value && arguments.length >= 2) {
          let storageKey = prefix + key;
          localStorage.setItem(storageKey, JSON.stringify(value));
          config[key] = value;
          emitter.emit(key, value);
          emitter.emit('@update', {key, value});
        }
      };

      return emitter;
    })();

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
        parentNode.appendChild(this._view);
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
          name: 'ZenzaGamePadConfigPanel',
          shadow: ConfigPanel.__shadow__,
          template: '<div class="ZenzaGamePadConfigPanelContainer zen-family"></div>',
          css: ''
        });
        this._state = {
          isOpen: false,
          isVisible: false
        };
        Config.on('refresh', this._onBeforeShow.bind(this));
      }

      _initDom(...args) {
        super._initDom(...args);
        const v = this._shadow;

        this._elm.enabled = v.querySelector('*[data-config-name="enabled"]');
        this._elm.needFocus = v.querySelector('*[data-config-name="needFocus"]');

        const onChange = e => {
          const target = e.target, name = target.getAttribute('data-config-name');
          switch (target.tagName) {
            case 'INPUT':
            case 'SELECT':
              if (target.type === 'checkbox') {
                Config.set(name, target.checked);
              } else {
                const type = target.getAttribute('data-type');
                const value = this._parseParam(target.value, type);
                Config.set(name, value);
              }
              break;
            default:
              //console.info('target', e, target, name, target.checked);
              Config.set(name, !!target.checked);
              break;
          }
        };

        this._elm.enabled.addEventListener('change', onChange);
        this._elm.needFocus.addEventListener('change', onChange);

        v.querySelector('.closeButton')
          .addEventListener('click', this.hide.bind(this));
      }

      _onClick(e) {
        super._onClick(e);
      }

      _onMouseDown(e) {
        this.hide();
        this._onClick(e);
      }

      show() {
        document.body.addEventListener('click', this._bound.onBodyClick);
        this._onBeforeShow();

        this.setState({isOpen: true});
        if (this._shadow.showModal) {
          this._shadow.showModal();
        }
        window.setTimeout(() => {
          this.setState({isVisible: true});
        }, 100);
      }

      hide() {
        document.body.removeEventListener('click', this._bound.onBodyClick);
        if (this._shadow.close) {
          this._shadow.close();
        }
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
        this._elm.enabled.checked   = !!Config.get('enabled');
        this._elm.needFocus.checked = !!Config.get('needFocus');
      }
    }

    ConfigPanel.__shadow__ = (`
      <style>
        .ZenzaGamePadConfigPanel {
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
          transition: opacity 0.5s;
          transform-origin: center bottom;
          animation-timing-function: steps(10);
          perspective-origin: center bottom;
          user-select: none;
          margin: 0;
          pointer-events: auto !important;
        }
        .ZenzaGamePadConfigPanel[open] {
          display: block;
          opacity: 1;
        }

        .ZenzaGamePadConfigPanel.is-Open {
          display: block;
          opacity: 0;
        }
        
        .ZenzaGamePadConfigPanel.is-Open.is-Visible {
          opacity: 1;
        }

        .title {
          margin: 0;
          font-weight: bolder;
          font-size: 120%;
          font-family: 'arial black';
          margin: 0 0 8px;
          text-align: center;
        }

        .closeButton {
          display: block;
          text-align: center;
        }

        .closeButton {
          display: block;
          padding: 8px 16px;
          cursor: pointer;
          margin: auto;
        }

        label {
          cursor: pointer;
        }

        input[type="number"] {
          width: 50px;
        }

        input[type="checkbox"] {
          transform: scale(2);
          margin-right: 16px;
        }

        .ZenzaGamePadConfigPanel>div {
          padding: 8px;
        }
      </style>
      <dialog class="root ZenzaGamePadConfigPanel zen-family">
        <p class="title">†ZenzaGamePad†</p>

        <div class="enableSelect">
          <label>
            <input type="checkbox" data-config-name="enabled" data-type="bool">
            ZenzaGamePadを有効にする
          </label>
        </div>

        <div class="needFocusSelect">
          <label>
            <input type="checkbox" data-config-name="needFocus" data-type="bool">
            ウィンドウフォーカスのあるときのみ有効
          </label>
        </div>


        <div class="closeButtonContainer">
          <button class="closeButton" type="button">
           閉じる
          </button>
        </div>

      </dialog>
    `).trim();


    class ToggleButton extends BaseViewComponent {
      constructor({parentNode}) {
        super({
          parentNode,
          name: 'ZenzaGamePadToggleButton',
          shadow: ToggleButton.__shadow__,
          template: '<div class="ZenzaGamePadToggleButtonContainer"></div>',
          css: ''
        });

        this._state = {
          isEnabled: undefined
        };

        Config.on('enabled', () => {
          this.refresh();
        });
      }

      refresh() {
        this.setState({isEnabled: Config.get('enabled')});
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
      <div class="heatSyncSwitch controlButton root command" data-command="toggleZenzaGamePadConfig">
        <div class="controlButtonInner" title="ZenzaGamePad">GP</div>
        <div class="tooltip">ZenzaGamePad</div>
      </div>
    `.trim();




    var execCommand = function(command, param) {
      ZenzaWatch.external.execCommand(command, param);
    };

    var speedUp = function() {
      // TODO:
      // configを直接参照するのはお行儀が悪いのでexternalのインターフェースをつける
      var current = parseFloat(ZenzaWatch.config.getValue('playbackRate'), 10);
      window.console.log('speedUp', current);
      execCommand('playbackRate', Math.floor(Math.min(current + 0.1, 3) * 10) / 10);
    };

    var speedDown = function() {
      // TODO:
      // configを直接参照するのはお行儀が悪いのでexternalのインターフェースをつける
      var current = parseFloat(ZenzaWatch.config.getValue('playbackRate'), 10);
      window.console.log('speedDown', current);
      execCommand('playbackRate', Math.floor(Math.max(current - 0.1, 0.1) * 10) / 10);
    };

    var swapABXY_FC30 = function(btn) {
      switch (btn) {
        case 0: return 1;
        case 1: return 0;
        case 3: return 4;
        case 4: return 3;
      }
      return btn;
    };

    var onButtonDown = function(button, deviceId) {
      if (!isZenzaWatchOpen) { return; }
      if (deviceId.match(/Vendor: 04b4 Product: 010a/i)) {
        //USB Gamepad (Vendor: 04b4 Product: 010a)"
        return onButtonDownSaturn(button, deviceId);
      }
      // FC30なのにみんなVendor違うってどういうことだよ
      // 8Bitdo FC30 Pro (Vendor: 1002 Product: 9000)
      if (deviceId.match(/Vendor: (3810|05a0|1235|1002)/i)) {
        return onButtonDownFC30(button, deviceId);
      }

      switch (button) {
        case 0: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 1: // B
          execCommand('toggleMute');
          break;
        case 2: // X
          execCommand('toggleComment');
          break;
        case 3: // Y
          isRate1ButtonDown = true;
          execCommand('playbackRate', 0.1);
          break;
        case 4: // LB
          execCommand('playPreviousVideo');
          break;
        case 5: // RB
          execCommand('playNextVideo');
          break;
        case 6: // LT
          execCommand('playbackRate', 0.5);
          break;
        case 7: // RT
          execCommand('playbackRate', 3);
          break;
        case 8: // しいたけの左 ビューボタン (Back)
          execCommand('screenShot');
          break;
        case 9: // しいたけの右 メニューボタン (Start)
          execCommand('deflistAdd');
          break;
        case 10: // Lスティック
          execCommand('seek', 0);
          break;
        case 11: // Rスティック
          break;
        case 12: // up
          if (isPauseButtonDown) {
            speedUp();
          } else {
            execCommand('volumeUp');
          }
          break;
        case 13: // down
          if (isPauseButtonDown) {
            speedUp();
          } else {
            execCommand('volumeDown');
          }
          break;
        case 14: // left
          if (isPauseButtonDown) {
            execCommand('seekPrevFrame');
          } else {
            execCommand('seekBy', isRate1ButtonDown ? -1 : -5);
          }
          break;
        case 15: // right
          if (isPauseButtonDown) {
            execCommand('seekNextFrame');
          } else {
            execCommand('seekBy', isRate1ButtonDown ? +1 : +5);
          }
          break;
      }
    };

    var onButtonDownSaturn = function(button, deviceId) {
      switch (button) {
        case 0: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 1: // B
          execCommand('toggleMute');
          break;
        case 2: // C
          execCommand('toggleComment');
          break;
        case 3: // X
          execCommand('playbackRate', 0.5);
          break;
        case 4: // Y
          isRate1ButtonDown = true;
          execCommand('playbackRate', 0.1);
          break;
        case 5: // Z
          execCommand('playbackRate', 3);
          break;
        case 6: // L
          execCommand('playPreviousVideo');
          break;
        case 7: // R
          execCommand('playNextVideo');
          break;
        case 8: // START
          execCommand('deflistAdd');
          break;
       }
    };

    var onButtonDownFC30 = function(button, deviceId) {
      if (deviceId.match(/Product: (3232)/i)) { // FC30 Zero / FC30
        button = swapABXY_FC30(button);
      }

      switch (button) {
        case 0: // B
          execCommand('toggleMute');
          break;
        case 1: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 2: // ???
          //execCommand('toggleComment');
          break;
        case 3: // X
          isRate1ButtonDown = true;
          execCommand('playbackRate', 0.1);
          break;
        case 4: // Y
          execCommand('toggleComment');
          break;
        case 5: // 
          break;
        case 6: // L1
          if (isPauseButtonDown) {
            execCommand('playPreviousVideo');
          } else {
            execCommand('playbackRate', 0.5);
          }
          break;
        case 7: // R1
          if (isPauseButtonDown) {
            execCommand('playNextVideo');
          } else {
            execCommand('playbackRate', 3);
          }
          break;
        case 8: // L2
          execCommand('playPreviousVideo');
          break;
        case 9: // R2
          execCommand('playNextVideo');
          break;
        case 10: // SELECT
          execCommand('screenShot');
          break;
        case 11: // START
          execCommand('deflistAdd');
          break;
        case 13: // Lスティック
          execCommand('seek', 0);
          break;
        case 14: // Rスティック
          break;
          
       }
    };


    var onButtonUp = function(button, deviceId) {
      if (!isZenzaWatchOpen) { return; }
      if (deviceId.match(/Vendor: 04b4 Product: 010a/i)) {
        //USB Gamepad (Vendor: 04b4 Product: 010a)"
        return onButtonUpSaturn(button, deviceId);
      }
      // 8Bitdo FC30 Pro (Vendor: 1002 Product: 9000)
      if (deviceId.match(/Vendor: (3810|05a0|1235|1002)/i)) {
        return onButtonUpFC30(button, deviceId);
      }

      switch (button) {
        case 0: // A
          isPauseButtonDown = false;
          break;
        case 1: // B
          break;
        case 2: // X
          break;
        case 3: // Y
          isRate1ButtonDown = false;
          execCommand('playbackRate', 1.0);
          break;
        case 4: // LB
          break;
        case 5: // RB
          break;
        case 6: // LT
          break;
        case 7: // RT
          execCommand('playbackRate', 1.5);
          break;
        case 8: // しいたけの左 ビューボタン (Back)
          break;
        case 9: // しいたけの右 メニューボタン (Start)
          break;
        case 10: // Lスティック
          break;
        case 11: // Rスティック
          break;
        case 12: // up
          break;
        case 13: // down
          break;
        case 14: // left
          break;
        case 15: // right
          break;
      }
    };

    var onButtonUpSaturn = function(button, deviceId) {
      switch (button) {
        case 0: // A
          isPauseButtonDown = false;
          break;
        case 1: // B
          break;
        case 2: // C
          break;
        case 3: // X
          break;
        case 4: // Y
          isRate1ButtonDown = false;
          execCommand('playbackRate', 1.0);
          break;
        case 5: // Z
          execCommand('playbackRate', 1.5);
          break;
        case 6: // L
          break;
        case 7: // R
          break;
        case 8: // START
          break;
       }
    };

    var onButtonUpFC30 = function(button, deviceId) {
      if (deviceId.match(/Product: (3232)/i)) { // FC30Zero / FC30
        button = swapABXY_FC30(button);
      }

      switch (button) {
        case 0: // B
          break;
        case 1: // A
          isPauseButtonDown = false;
          break;
        case 2: // ???
          break;
        case 3: // X
          isRate1ButtonDown = false;
          execCommand('playbackRate', 1.0);
          break;
        case 4: // Y
          break;
        case 5: //
          break;
        case 6: // L1
          break;
        case 7: // R1
          if (isPauseButtonDown) { return; }
          execCommand('playbackRate', 1.5);
          break;
        case 8: // L2
          break;
        case 9: // R2
          break;
        case 10: // SELECT
          break;
        case 11: // START
          break;
        case 13: // Lスティック
          break;
        case 14: // Rスティック
          break;
       }
    };


    var onButtonRepeat = function(button) {
      if (!isZenzaWatchOpen) { return; }

      switch (button) {
        case 12: // up
          if (isPauseButtonDown) {
            speedUp();
          } else {
            execCommand('volumeUp');
          }
          break;
        case 13: // down
          if (isPauseButtonDown) {
            speedUp();
          } else {
            execCommand('volumeDown');
          }
          break;
        case 14: // left
          if (isPauseButtonDown) {
            execCommand('seekPrevFrame');
          } else {
            execCommand('seekBy', isRate1ButtonDown ? -1 : -5);
          }
          break;
        case 15: // right
          if (isPauseButtonDown) {
            execCommand('seekNextFrame');
          } else {
            execCommand('seekBy', isRate1ButtonDown ? +1 : +5);
          }
          break;
      }
    };

    var onAxisChange = function(axis, value, deviceId) {
      if (!isZenzaWatchOpen) { return; }
      if (Math.abs(value) < 0.1) { return; }

      var isFC30 = deviceId.match(/Vendor: 3810/i) ? true : false;
      if (isFC30) {
        switch (axis) {
          case 3: // L2なぜか反応する
          case 4: // R2なぜか反応する
            return;
          case 5: // FC30のRスティック上下？
            axis = 3;
            break;
        }
      }

      switch (axis) {
        case 0: // Lスティック X
          var step = isRate1ButtonDown ? 1 : 5;
          execCommand('seekBy', (value < 0 ? -1 : 1) * step);
          break;
        case 1: // Lスティック Y
          if (isPauseButtonDown) {
            if (value < 0) { speedUp(); }
            else {         speedDown(); }
          } else {
            execCommand(value < 0 ? 'volumeUp' : 'volumeDown');
          }
          break;
        case 2: // Rスティック X
          break;
        case 3: // Rスティック Y
          if (value < 0) { speedUp(); }
          else {         speedDown(); }
          break;
      }
    };

    var onAxisRepeat = function(axis, value) {
      if (!isZenzaWatchOpen) { return; }
      if (Math.abs(value) < 0.1) { return; }
      switch (axis) {
        case 0: // Lスティック X
          var step = isRate1ButtonDown ? 1 : +5;
          execCommand('seekBy', (value < 0 ? -1 : 1) * step);
          break;
        case 1: // Lスティック Y
          if (isPauseButtonDown) {
            if (value < 0) { speedUp(); }
            else {         speedDown(); }
          } else {
            execCommand(value < 0 ? 'volumeUp' : 'volumeDown');
          }
          break;
        case 2: // Rスティック X
          break;
        case 3: // Rスティック Y
          if (value < 0) { speedUp(); }
          else {         speedDown(); }
          break;
      }
    };

    var onPovChange = function(pov) {
      switch(pov) {
        case 'up':
          execCommand('volumeUp');
          break;
        case 'down':
          execCommand('volumeDown');
          break;
        case 'left':
          execCommand('seekBy', isRate1ButtonDown ? -1 : -5);
          break;
        case 'right':
          execCommand('seekBy', isRate1ButtonDown ? +1 : +5);
          break;
      }
    };

    var onPovRepeat = function(pov) {
      switch(pov) {
        case 'up':
          execCommand('volumeUp');
          break;
        case 'down':
          execCommand('volumeDown');
          break;
        case 'left':
          execCommand('seekBy', isRate1ButtonDown ? -1 : -5);
          break;
        case 'right':
          execCommand('seekBy', isRate1ButtonDown ? +1 : +5);
          break;
      }
    };



    var PollingTimer = (function() {
      var id = 0;
      var PollingTimer = function(callback, interval) {
        this._id = id++;
        this.initialize(callback, interval);
      };
      _.assign(PollingTimer.prototype, {
        initialize: function(callback, interval) {
          this._timer = null;
          this._callback = callback;
          if (typeof interval === 'number') {
            this.changeInterval(interval);
          }
        },
        changeInterval: function(interval) {
          if (this._timer) {
            if (this._currentInterval === interval) {
              return;
            }
            window.clearInterval(this._timer);
          }
          console.log('%cupdate Interval:%s', 'background: lightblue;', interval);
          this._currentInterval = interval;
          this._timer = window.setInterval(this._callback, interval);
        },
        pause: function() {
          window.clearInterval(this._timer);
          this._timer = null;
        },
        start: function() {
          if (typeof this._currentInterval !== 'number') {
            return;
          }
          this.changeInterval(this._currentInterval);
        }
      });
      return PollingTimer;
    })();

    let GamePadModel = (function($, _, emitter) {
      class GamePadModel extends emitter {
        constructor(gamepadStatus) {
          super();
          this._gamepadStatus = gamepadStatus;
          this._buttons = [];
          this._axes = [];
          this._pov = '';
          this._povRepeat = 0;
          this.initialize(gamepadStatus);
        }
      }
      _.assign(GamePadModel.prototype, {
        initialize: function(gamepadStatus) {
          this._buttons.length = gamepadStatus.buttons.length;
          this._axes.length = gamepadStatus.axes.length;
          this._id = gamepadStatus.id;
          this._index = gamepadStatus.index;
          this.reset();
        },
        reset: function() {
          var i, len;
          this._pov = '';
          this._povRepeat = 0;

          for (i = 0, len = this._gamepadStatus.buttons.length + 16; i < len; i++) {
            this._buttons[i] = {pressed: false, repeat: 0};
          }
          for (i = 0, len = this._gamepadStatus.axes.length; i < len; i++) {
            this._axes[i] = {value: null, repeat: 0};
          }
        },
        update: function() {
          var gamepadStatus = (navigator.getGamepads())[this._index];
          // gp || this._gamepadStatus;
          if (!gamepadStatus) { console.log('no status'); return; }
          this._gamepadStatus = gamepadStatus;

          var buttons = gamepadStatus.buttons, axes = gamepadStatus.axes;
          var i, len, axis;

          for (i = 0, len = Math.min(this._buttons.length, buttons.length); i < len; i++) {
            var buttonStatus = buttons[i].pressed ? 1 : 0;

            if (this._buttons[i].pressed !== buttonStatus) {
              var eventName = (buttonStatus === 1) ? 'onButtonDown' : 'onButtonUp';
              //console.log('%cbutton%s:%s', 'background: lightblue;', i, buttonStatus, 0);
              this.emit(eventName, i, 0);
              this.emit('onButtonStatusChange', i, buttonStatus);
            }
            this._buttons[i].pressed = buttonStatus;
            if (buttonStatus) {
              this._buttons[i].repeat++;
              if (this._buttons[i].repeat % 5 === 0) {
                //console.log('%cbuttonRepeat%s', 'background: lightblue;', i);
                this.emit('onButtonRepeat', i);
              }
            } else {
              this._buttons[i].repeat = 0;
            }
          }
          for (i = 0, len = Math.min(8, this._axes.length); i < len; i++) {
            axis = Math.round(axes[i] * 1000) / 1000;

            if (this._axes[i].value === null) {
              this._axes[i].value = axis;
              continue;
            }

            var diff = Math.round(Math.abs(axis - this._axes[i].value));
            if (diff >= 1) {
              //window.console.log(
              //  '%c%s %s',
              //  'background: lightblue;', 'onAxisChange',
              //  i, axis, 0, this._axes[i]);
              this.emit('onAxisChange', i, axis);
            }
            if (Math.abs(axis) <= 0.1 && this._axes[i].repeat > 0) {
              this._axes[i].repeat = 0;
              //this.emit('onAxisRelease', i);
            } else if (Math.abs(axis) > 0.1) {
              this._axes[i].repeat++;
              //if (this._axes[i].repeat % 5 === 0) {
              //  //window.console.log('%caxisRepeat%s:%s', 'background: lightblue;', i, axis);
              //  this.emit('onAxisRepeat', i, axis);
              //}
            } else {
              this._axes[i].repeat = 0;
            }
            this._axes[i].value = axis;
            
          }

          // ハットスイッチ？ FC30だけ？
          if (axes[9]) {
            var p = Math.round(axes[9] * 1000);
            var d;
            if (p < -500) {        d = 'up';
            } else if (p < 0) {    d = 'right';
            } else if (p > 3000) { d = '';
            } else if (p > 500){   d = 'left';
            } else {               d = 'down'; }

            //if (d) { window.console.log('pov?:', axes[9], d, p); }

            if (this._pov !== d) {
              this._pov = d;
              this._povRepeat = 0;
              this.emit('onPovChange', this._pov);
            } else if (d !== '') {
              this._povRepeat++;
              if (this._povRepeat % 5 === 0) {
                this.emit('onPovRepeat', this._pov);
              }
            }
          }
          //console.log(JSON.stringify(this.dump()));
        },
        dump: function() {
          var gamepadStatus = this._gamepadStatus, buttons = gamepadStatus.buttons, axes = gamepadStatus.axes;
          var i, len, btmp = [], atmp = [];
          for (i = 0, len = axes.length; i < len; i++) {
            atmp.push('ax' + i + ': ' + axes[i]);
          }
          for (i = 0, len = buttons.length; i < len; i++) {
            btmp.push('bt' + i + ': ' + (buttons[i].pressed ? 1 : 0));
          }
          return atmp.join('\n') + '\n' + btmp.join(', ');
        },
        getX: function() {
          return this._axes.length > 0 ? this._axes[0] : 0;
        },
        getY: function() {
          return this._axes.length > 1 ? this._axes[1] : 0;
        },
        getZ: function() {
          return this._axes.length > 2 ? this._axes[2] : 0;
        },
        getButtonCount: function() {
          return this._buttons ? this._buttons.length : 0;
        },
        getButtonStatus: function(index) {
          return this._buttons[index] || 0;
        },
        getAxisCount: function() {
          return this._axes ? this._axes.length : 0;
        },
        getAxisValue: function(index) {
          return this._axes[index] || 0;
        },
        isConnected: function() {
          return !!this._gamepadStatus.connected;
        },
        getDeviceIndex: function() {
          return this._index;
        },
        getDeviceId: function() {
          return this._id;
        },
        getPov: function() {
          return this._pov;
        },
        release: function() {
          // TODO: clear events
        }
      });

      return GamePadModel;
    })($, _, Emitter);

    var ZenzaGamePad = (function ($, PollingTimer, GamePadModel) {
      var primaryGamepad = null;
      var pollingTimer = null;
      var ZenzaGamePad = ZenzaWatch.modules ?
        new ZenzaWatch.modules.Emitter() : new Emitter();

      const padIndex = localStorage['ZenzaGamePadpadIndex'] || 0;

      var detectGamepad = function() {
        if (primaryGamepad) {
          return;
        }
        var gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
          var pad = _.find(gamepads, (pad) => {
            return  pad &&
                    pad.id &&
                    pad.index === padIndex &&
                    // windowsにDualShock4を繋ぐとあらわれる謎のデバイス
                    !pad.id.match(/Vendor: 00ff/i);
          });
          if (!pad) { return; }
          window.console.log(
            '%cdetect gamepad index: %s, id: "%s"',
            'background: lightgreen; font-weight: bolder;',
            pad.index, pad.id
          );

          var gamepad = new GamePadModel(pad);
          primaryGamepad = gamepad;

          var self = ZenzaGamePad;
          var onButtonDown = function(number) {
            self.emit('onButtonDown', number, gamepad.getDeviceIndex());
          };
          var onButtonRepeat = function(number) {
            self.emit('onButtonRepeat', number, gamepad.getDeviceIndex());
          };
          var onButtonUp = function(number) {
            self.emit('onButtonUp', number, gamepad.getDeviceIndex());
          };
          var onAxisChange = function(number, value) {
            self.emit('onAxisChange', number, value, gamepad.getDeviceIndex());
          };
          var onAxisRepeat = function(number, value) {
            self.emit('onAxisRepeat', number, value, gamepad.getDeviceIndex());
          };
          var onAxisRelease = function(number) {
            self.emit('onAxisRelease', number, gamepad.getDeviceIndex());
          };
          var onPovChange = function(pov) {
            self.emit('onPovChange', pov, gamepad.getDeviceIndex());
          };
          var onPovRepeat = function(pov) {
            self.emit('onPovRepeat', pov, gamepad.getDeviceIndex());
          };


          gamepad.on('onButtonDown',   onButtonDown);
          gamepad.on('onButtonRepeat', onButtonRepeat);
          gamepad.on('onButtonUp',     onButtonUp);
          gamepad.on('onAxisChange',   onAxisChange);
          gamepad.on('onAxisRepeat',   onAxisRepeat);
          gamepad.on('onAxisRelease',  onAxisRelease);
          gamepad.on('onPovChange',    onPovChange);
          gamepad.on('onPovRepeat',    onPovRepeat);

          self.emit('onDeviceConnect', gamepad.getDeviceIndex(), gamepad.getDeviceId());

          pollingTimer.changeInterval(30);
        }
      };


      var onGamepadConnectStatusChange = function(e, isConnected) {
        console.log('onGamepadConnetcStatusChange', e, isConnected);
        if (e.gamepad.index !== 0) {
          return;
        }

        if (isConnected) {
          console.log('%cgamepad connected id:"%s"', 'background: lightblue;', e.gamepad.id);
          detectGamepad();
        } else {
          ZenzaGamePad.emit('onDeviceDisconnect', primaryGamepad.getDeviceIndex());
          if (primaryGamepad) {
            primaryGamepad.release();
          }
          primaryGamepad = null;
          console.log('%cgamepad disconneced id:"%s"', 'background: lightblue;', e.gamepad.id);
        }
      };

      var initializeTimer = function() {
        console.log('%cinitializeGamepadTimer', 'background: lightgreen;');
        let onTimerInterval = function() {
          if (!Config.get('enabled')) {
            return;
          }
          if (Config.get('needFocus') && !document.hasFocus()) {
            return;
          }
          if (!primaryGamepad) {
            detectGamepad();
            return;
          }
          if (!primaryGamepad.isConnected) {
            return;
          }
          primaryGamepad.update();
        };
        pollingTimer = new PollingTimer(onTimerInterval, 1000);
      };

      var initializeGamepadConnectEvent = function() {
        console.log('%cinitializeGamepadConnectEvent', 'background: lightgreen;');

        window.addEventListener('gamepadconnected',
          function(e) { onGamepadConnectStatusChange(e, true); }, false);
        window.addEventListener('gamepaddisconnected',
          function(e) { onGamepadConnectStatusChange(e, false); }, false);

        if (primaryGamepad) {
          return;
        }
        window.setTimeout(detectGamepad, 1000);
      };

      ZenzaGamePad.startDetect = function() {
        ZenzaGamePad.startDetect = _.noop;
        initializeTimer();
        initializeGamepadConnectEvent();
      };

      ZenzaGamePad.startPolling = function() {
        if (pollingTimer) { pollingTimer.start(); }
      };
      ZenzaGamePad.stopPolling = function() {
        if (pollingTimer) { pollingTimer.pause(); }
      };

      return ZenzaGamePad;
    })($, PollingTimer, GamePadModel);


    var initGamePad = function() {
      initGamePad = _.noop;

      var isActivated = false;
      var deviceId, deviceIndex;
      var notifyDetect = function() {
        if (!document.hasFocus()) { return; }
        isActivated = true;
        notifyDetect = _.noop;

        // 初めてボタンかキーが押されたタイミングで通知する
        execCommand(
          'notify',
          'ゲームパッド "' + deviceId + '" が検出されました'
        );
      };

      var _onButtonDown = function(number /*, deviceIndex*/) {
        notifyDetect();
        if (!isActivated) { return; }
        onButtonDown(number, deviceId);
        //console.log('%conButtonDown: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
      };
      var _onButtonRepeat = function(number /*, deviceIndex*/) {
        if (!isActivated) { return; }
        onButtonRepeat(number, deviceId);
        //console.log('%conButtonRepeat: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
      };
      var _onButtonUp = function(number /*, deviceIndex*/) {
        //console.log('%conButtonUp: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
        if (!isActivated) { return; }
        onButtonUp(number, deviceId);
      };
      var _onAxisChange = function(number, value /*, deviceIndex */) {
        notifyDetect();
        if (!isActivated) { return; }
        onAxisChange(number, value, deviceId);
        //console.log('%conAxisChange: number=%s, value=%s, device=%s', 'background: lightblue;', number, value, deviceIndex);
      };
      var _onAxisRepeat = function(number, value /*, deviceIndex */) {
        //console.log('%conAxisChange: number=%s, value=%s, device=%s', 'background: lightblue;', number, value, deviceIndex);
        if (!isActivated) { return; }
        onAxisRepeat(number, value, deviceId);
      };
      var _onAxisRelease = function(/* number, deviceIndex */) {
        if (!isActivated) { return; }
      };

      var _onPovChange = function(pov /*, deviceIndex */) {
        notifyDetect();
        if (!isActivated) { return; }
        onPovChange(pov, deviceId);
      };

      var _onPovRepeat = function(pov /*, deviceIndex */) {
        if (!isActivated) { return; }
        onPovRepeat(pov, deviceId);
      };

      var bindEvents = function() {
        bindEvents = _.noop;

        ZenzaGamePad.on('onButtonDown',   _onButtonDown);
        ZenzaGamePad.on('onButtonRepeat', _onButtonRepeat);
        ZenzaGamePad.on('onButtonUp',     _onButtonUp);
        ZenzaGamePad.on('onAxisChange',   _onAxisChange);
        ZenzaGamePad.on('onAxisRepeat',   _onAxisRepeat);
        ZenzaGamePad.on('onAxisRelease',  _onAxisRelease);
        ZenzaGamePad.on('onPovChange',    _onPovChange);
        ZenzaGamePad.on('onPovRepeat',    _onPovRepeat);
      };

      var onDeviceConnect = function(index, id) {
         deviceIndex = index;
         deviceId = id;

         bindEvents();
      };

      ZenzaGamePad.on('onDeviceConnect', onDeviceConnect);
      //ZenzaGamePad.on('onDeviceDisConnect', onDeviceDisConnect);
      ZenzaGamePad.startDetect();
      window.ZenzaWatch.ZenzaGamePad = ZenzaGamePad;
    };

    var onZenzaWatchOpen = function() {
      isZenzaWatchOpen = true;
      initGamePad();
      ZenzaGamePad.startPolling();
    };

    var onZenzaWatchClose = function() {
      isZenzaWatchOpen = false;
      ZenzaGamePad.stopPolling();
    };


    let initialize = function() {
      ZenzaWatch.emitter.on('DialogPlayerOpen',  onZenzaWatchOpen);
      ZenzaWatch.emitter.on('DialogPlayerClose', onZenzaWatchClose);

      ZenzaWatch.emitter.on('videoControBar.addonMenuReady', (container, handler) => {
        ZenzaGamePad.configPanel = new ConfigPanel({parentNode: document.querySelector('#zenzaVideoPlayerDialog')});
        let toggleButton = new ToggleButton({parentNode: container});
        toggleButton.on('command', handler);
        toggleButton.refresh();
      });
      ZenzaWatch.emitter.on('command-toggleZenzaGamePadConfig', () => {
        ZenzaGamePad.configPanel.toggle();
      });

    };

    initialize();
  };

  var loadMonkey = function() {
    var script = document.createElement('script');
    script.id = 'ZenzaGamePadLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.appendChild(document.createTextNode('(' + monkey + ')(window.ZenzaWatch);'));
    document.body.appendChild(script);
  };

  var waitForZenzaWatch = function() {
    if (window.ZenzaWatch && window.ZenzaWatch.ready) {
      window.console.log('ZenzaWatch is Ready');
      loadMonkey();
    } else {
      document.body.addEventListener('ZenzaWatchInitialize', () => {
      //document.body.addEventListener('ZenzaWatchReady', function() {
        window.console.log('onZenzaWatchInitialize');
        loadMonkey();
      }, {once: true});
    }
  };
  waitForZenzaWatch();

})();
