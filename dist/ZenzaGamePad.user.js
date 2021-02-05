// ==UserScript==
// @name        ZenzaGamePad
// @namespace   https://github.com/segabito/
// @description ZenzaWatchをゲームパッドで操作
// @include     *://*.nicovideo.jp/*
// @version     1.5.3
// @author      segabito macmoto
// @license     public domain
// @grant       none
// @noframes
// ==/UserScript==
/* eslint-disable */


// 推奨
//
// XInput系 (XboxOne, Xbox360コントローラ等)
// DualShock4
// USBサターンパッド
// 8bitdo FC30系
// Joy-Con L R


(async (window) => {

  const monkey = (ZenzaWatch) => {
    if (!window.navigator.getGamepads) {
      window.console.log('%cGamepad APIがサポートされていません', 'background: red; color: yellow;');
      return;
    }

    const PRODUCT = 'ZenzaGamePad';
    const CONSTANT = {
      BASE_Z_INDEX: 150000
    };

    const ButtonMapJoyConL = {
      Y: 0,
      B: 1,
      X: 2,
      A: 3,
      SUP: 4,
      SDN: 5,
      SEL: 8,
      CAP: 13,
      LR: 14,
      META: 15,
      PUSH: 10
    };
    const ButtonMapJoyConR = {
      Y: 3,
      B: 2,
      X: 1,
      A: 0,
      SUP: 5,
      SDN: 4,
      SEL: 9,
      CAP: 12,
      LR: 14,
      META: 15,
      PUSH: 11
    };

    const JoyConAxisCenter = +1.28571;

    const AxisMapJoyConL = {
      CENTER: JoyConAxisCenter,
      UP:     +0.71429,
      U_R:    +1.00000,
      RIGHT:  -1.00000,
      D_R:    -0.71429,
      DOWN:   -0.42857,
      D_L:    -0.14286,
      LEFT:   +0.14286,
      U_L:    +0.42857,
    };

    const AxisMapJoyConR = {
      CENTER: JoyConAxisCenter,
      UP:     -0.42857,
      U_R:    -0.14286,
      RIGHT:  +0.14286,
      D_R:    +0.42857,
      DOWN:   +0.71429,
      D_L:    +1.00000,
      LEFT:   -1.00000,
      U_L:    -0.71429,
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
    let isMetaButtonDown = false;

    const getVideo = () => {
      return document.querySelector('.zenzaWatchVideoElement');
    };

    const video = {
      get duration() {
        return getVideo().duration;
      }
    };

    const Config = (() => {
      const prefix = PRODUCT + '_config_';
      const emitter = new Emitter();

      const defaultConfig = {
        debug: false,
        enabled: true,
        needFocus: false,
        deviceIndex: 0
       };

      const config = {};

      emitter.refresh = (emitChange = false) => {
        Object.keys(defaultConfig).forEach(key => {
          const storageKey = prefix + key;
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

      emitter.get = (key, refresh) => {
        if (refresh) {
          emitter.refreshValue(key);
        }
        return config[key];
      };

      emitter.set = (key, value = undefined) => {
        if (config[key] !== value && value !== undefined) {
          const storageKey = prefix + key;
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

        this._elm.enabled = v.querySelector('[data-config-name="enabled"]');
        this._elm.needFocus = v.querySelector('[data-config-name="needFocus"]');
        this._elm.deviceIndex = v.querySelector('[data-config-name="deviceIndex"]');

        const onChange = e => {
          const target = e.target, name = target.getAttribute('data-config-name');
          switch (target.tagName) {
            case 'SELECT':
            case 'INPUT':
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
        this._elm.deviceIndex.addEventListener('change', onChange);

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
        this._elm.deviceIndex.value = Config.get('deviceIndex');
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

        <div class="deviceIndex">
          <label>
            デバイス番号
            <select class="deviceIndexSelector"
                data-config-name="deviceIndex" data-type="number">
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <small>(※リロードが必要)</small>
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
          cursor: pointer;
          opacity: 1;
        }
        .controlButton .controlButtonInner {
          filter: grayscale(100%);
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
      <div class="heatSyncSwitch controlButton root command" data-command="toggleZenzaGamePadConfig">
        <div class="controlButtonInner" title="ZenzaGamePad">&#x1F3AE;</div>
        <div class="tooltip">ZenzaGamePad</div>
      </div>
    `.trim();




    const execCommand = (command, param) =>
      ZenzaWatch.external.execCommand(command, param);

    const speedUp = () => {
      // TODO:
      // configを直接参照するのはお行儀が悪いのでexternalのインターフェースをつける
      const current = parseFloat(ZenzaWatch.config.getValue('playbackRate'), 10);
      window.console.log('speedUp', current);
      execCommand('playbackRate', Math.floor(Math.min(current + 0.1, 3) * 10) / 10);
    };

    const speedDown = () => {
      // TODO:
      // configを直接参照するのはお行儀が悪いのでexternalのインターフェースをつける
      const current = parseFloat(ZenzaWatch.config.getValue('playbackRate'), 10);
      window.console.log('speedDown', current);
      execCommand('playbackRate', Math.floor(Math.max(current - 0.1, 0.1) * 10) / 10);
    };

    const scrollUp = () => {
      document.documentElement.scrollTop =
        Math.max(0, document.documentElement.scrollTop - window.innerHeight / 5);
    };

    const scrollDown = () => {
      document.documentElement.scrollTop =
        document.documentElement.scrollTop + window.innerHeight / 5;
    };

    const scrollToVideo = () => {
      getVideo().scrollIntoView({behavior: 'smooth', block: 'center'});
    };

    const swapABXY_FC30 = btn => {
      switch (btn) {
        case 0: return 1;
        case 1: return 0;
        case 3: return 4;
        case 4: return 3;
      }
      return btn;
    };


    const onButtonDown = (button, deviceId) => {
      if (!isZenzaWatchOpen) { return; }
      if (deviceId.match(/Vendor: 04b4 Product: 010a/i)) {
        //USB Gamepad (Vendor: 04b4 Product: 010a)"
        return onButtonDownSaturn(button, deviceId);
      } else
      if (deviceId.match(/Vendor: (3810|05a0|1235|1002)/i)) {
        // FC30なのにみんなVendor違うってどういうことだよ
        // 8Bitdo FC30 Pro (Vendor: 1002 Product: 9000)
        return onButtonDownFC30(button, deviceId);
      } else
      if (deviceId.match(/Vendor: 057e Product: 200[67]/i)) {
        return onButtonDownJoyCon(button, deviceId);
      }

      switch (button) {
        case 0: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 1: // B
          execCommand('toggle-mute');
          break;
        case 2: // X
          execCommand('toggle-showComment');
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
          execCommand('toggle-fullscreen');
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
            speedDown();
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

    const onButtonDownSaturn = (button, deviceId) => {
      switch (button) {
        case 0: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 1: // B
          execCommand('toggle-mute');
          break;
        case 2: // C
          execCommand('toggle-showComment');
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

    const onButtonDownJoyCon = (button, deviceId) => {
      const ButtonMap = deviceId.match(/Vendor: 057e Product: 2006/i) ?
        ButtonMapJoyConL : ButtonMapJoyConR;
      switch (button) {
        case ButtonMap.Y:
          if (isPauseButtonDown) {
            execCommand('seekPrevFrame');
          } else {
            execCommand('toggle-showComment');
          }
          break;
        case ButtonMap.B:
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case ButtonMap.X:
          if (isMetaButtonDown) {
            execCommand('playbackRate', 2);
          } else {
            isRate1ButtonDown = true;
            execCommand('playbackRate', 0.1);
          }
          break;
        case ButtonMap.A:
          if (isPauseButtonDown) {
            execCommand('seekNextFrame');
          } else {
            execCommand('toggle-mute');
          }
           break;
        case ButtonMap.SUP:
          if (isMetaButtonDown) {
            scrollUp();
          } else {
            execCommand('playPreviousVideo');
          }
          break;
        case ButtonMap.SDN:
          if (isMetaButtonDown) {
            scrollDown();
          } else {
            execCommand('playNextVideo');
          }
          break;
        case ButtonMap.SEL:
          if (isMetaButtonDown) {
            execCommand('toggle-loop');
          } else {
            execCommand('deflistAdd');
          }
          break;
        case ButtonMap.CAP:
          execCommand('screenShot');
          break;
        case ButtonMap.PUSH:
          if (isMetaButtonDown) {
            scrollToVideo();
          } else {
            execCommand('seek', 0);
          }
          break;
        case ButtonMap.LR:
          execCommand('toggle-fullscreen');
          break;
        case ButtonMap.META:
          isMetaButtonDown = true;
          break;
      }
    };


    const onButtonDownFC30 = (button, deviceId) => {
      if (deviceId.match(/Product: (3232)/i)) { // FC30 Zero / FC30
        button = swapABXY_FC30(button);
      }

      switch (button) {
        case 0: // B
          execCommand('toggle-mute');
          break;
        case 1: // A
          isPauseButtonDown = true;
          execCommand('togglePlay');
          break;
        case 2: // ???
          //execCommand('toggle-showComment');
          break;
        case 3: // X
          isRate1ButtonDown = true;
          execCommand('playbackRate', 0.1);
          break;
        case 4: // Y
          execCommand('toggle-showComment');
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


    const onButtonUp = (button, deviceId) => {
      if (!isZenzaWatchOpen) { return; }
      if (deviceId.match(/Vendor: 04b4 Product: 010a/i)) {
        //USB Gamepad (Vendor: 04b4 Product: 010a)"
        return onButtonUpSaturn(button, deviceId);
      } else
      if (deviceId.match(/Vendor: (3810|05a0|1235|1002)/i)) {
        // 8Bitdo FC30 Pro (Vendor: 1002 Product: 9000)
        return onButtonUpFC30(button, deviceId);
      } else
      if (deviceId.match(/Vendor: 057e Product: 200[67]/i)) {
        return onButtonUpJoyCon(button, deviceId);
      }
      switch (button) {
        case 0: // A
          isPauseButtonDown = false;
          break;
        case 3: // Y
          isRate1ButtonDown = false;
          execCommand('playbackRate', 1.0);
          break;
        case 7: // RT
          execCommand('playbackRate', 1.5);
          break;
      }
    };

    const onButtonUpSaturn = (button, deviceId) => {
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

    const onButtonUpFC30 = (button, deviceId) => {
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

    const onButtonUpJoyCon = (button, deviceId) => {
      const ButtonMap = deviceId.match(/Vendor: 057e Product: 2006/i) ?
        ButtonMapJoyConL : ButtonMapJoyConR;
      switch (button) {
        case ButtonMap.Y:
          break;
        case ButtonMap.B:
          isPauseButtonDown = false;
          break;
        case ButtonMap.X:
          isRate1ButtonDown = false;
          execCommand('playbackRate', 1);
          break;
        case ButtonMap.META:
          isMetaButtonDown = false;
          break;
      }
    };

    const onButtonRepeat = (button, deviceId) => {
      if (!isZenzaWatchOpen) { return; }

      if (deviceId.match(/Vendor: 057e Product: 200[67]/i)) { // Joy-Con
        return onButtonRepeatJoyCon(button, deviceId);
      }

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

    const onButtonRepeatJoyCon = (button, deviceId) => {
      const ButtonMap = deviceId.match(/Vendor: 057e Product: 2006/i) ?
        ButtonMapJoyConL : ButtonMapJoyConR;
      switch (button) {
        case ButtonMap.Y:
          if (isMetaButtonDown) {
            execCommand('seekBy', -15);
          } else if (isPauseButtonDown) {
            execCommand('seekPrevFrame');
          }
          break;

        case ButtonMap.A:
          if (isMetaButtonDown) {
            execCommand('seekBy', 15);
          } else if (isPauseButtonDown) {
            execCommand('seekNextFrame');
          }
          break;
        case ButtonMap.SUP:
          if (isMetaButtonDown) {
            scrollUp();
          } else {
            execCommand('playPreviousVideo');
          }
          break;
        case ButtonMap.SDN:
          if (isMetaButtonDown) {
            scrollDown();
          } else {
            execCommand('playNextVideo');
          }
          break;
      }
    };

    const onAxisChange = (axis, value, deviceId) => {
      if (!isZenzaWatchOpen) { return; }
      if (Math.abs(value) < 0.1) { return; }

      const isFC30 = deviceId.match(/Vendor: 3810/i) ? true : false;
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

      if (deviceId.match(/Vendor: 057e Product: 200[67]/i)) { // Joy-Con
        return;
      }

      switch (axis) {
        case 0: {// Lスティック X
          const step = isRate1ButtonDown ? 1 : 5;
          execCommand('seekBy', (value < 0 ? -1 : 1) * step);
        }
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

    const onAxisRepeat = (axis, value, deviceId) => {
      if (!isZenzaWatchOpen) { return; }
      if (Math.abs(value) < 0.1) { return; }

      if (deviceId.match(/Vendor: 057e Product: 2006/i)) { // Joy-Con (L)
        return;
      } else
      if (deviceId.match(/Vendor: 057e Product: 2007/i)) { // Joy-Con (R)
        return;
      }

      switch (axis) {
        case 0: {// Lスティック X
          const step = isRate1ButtonDown ? 1 : +5;
          execCommand('seekBy', (value < 0 ? -1 : 1) * step);
        }
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

    const onPovChange = (pov, deviceId) => {
      switch(pov) {
        case 'UP':
          if (isMetaButtonDown) {
            speedUp();
          } else {
            execCommand('volumeUp');
          }
          break;
        case 'DOWN':
          if (isMetaButtonDown) {
            speedDown();
          } else {
            execCommand('volumeDown');
          }
          break;
        case 'LEFT':
          execCommand('seekBy', isRate1ButtonDown || isMetaButtonDown ? -1 : -5);
          break;
        case 'RIGHT':
          execCommand('seekBy', isRate1ButtonDown || isMetaButtonDown ? +1 : +5);
          break;
      }
    };

    const onPovRepeat = onPovChange;

    class PollingTimer {
      constructor(callback, interval) {
        this._timer = null;
        this._callback = callback;
        if (typeof interval === 'number') {
          this.changeInterval(interval);
        }
      }
      changeInterval(interval) {
        if (this._timer) {
          if (this._currentInterval === interval) {
            return;
          }
          window.clearInterval(this._timer);
        }
        console.log('%cupdate Interval:%s', 'background: lightblue;', interval);
        this._currentInterval = interval;
        this._timer = window.setInterval(this._callback, interval);
      }
      pause() {
        window.clearInterval(this._timer);
        this._timer = null;
      }
      start() {
        if (typeof this._currentInterval !== 'number') {
          return;
        }
        this.changeInterval(this._currentInterval);
      }
    }

    const GamePadModel = ((Emitter) => {
      class GamePad extends Emitter {
        constructor(gamepadStatus) {
          super();
          this._gamepadStatus = gamepadStatus;
          this._buttons = [];
          this._axes = [];
          this._pov = '';
          this._lastTimestamp = 0;
          this._povRepeat = 0;
          this.initialize(gamepadStatus);
        }

        get isConnected() {
          return this._gamepadStatus.connected ? true : false;
        }

        get deviceId() {
          return this._id;
        }

        get deviceIndex() {
          return this._index;
        }

        get buttonCount() {
          return this._buttons ? this._buttons.length : 0;
        }

        get axisCount() {
          return this._axes ? this._axes.length : 0;
        }

        get pov() {
          return this._pov;
        }

        get x() {
          return this._axes.length > 0 ? this._axes[0] : 0;
        }

        get y() {
          return this._axes.length > 1 ? this._axes[1] : 0;
        }

        get z() {
          return this._axes.length > 2 ? this._axes[2] : 0;
        }

        initialize(gamepadStatus) {
          this._buttons.length = gamepadStatus.buttons.length;
          this._axes.length = gamepadStatus.axes.length;
          this._id = gamepadStatus.id;
          this._index = gamepadStatus.index;
          this._isRepeating = false;
          this.reset();
        }
        reset() {
          this._pov = '';
          this._povRepeat = 0;

          for (let i = 0, len = this._gamepadStatus.buttons.length + 16; i < len; i++) {
            this._buttons[i] = {pressed: false, repeat: 0};
          }
          for (let i = 0, len = this._gamepadStatus.axes.length + 16; i < len; i++) {
            this._axes[i] = {value: null, repeat: 0};
          }
        }
        update() {
          const gamepadStatus = (navigator.getGamepads())[this._index];
          // gp || this._gamepadStatus;
          if (!gamepadStatus) { console.log('no status'); return; }
          if (!this._isRepeating && this._lastTimestamp === gamepadStatus.timestamp) {
            return;
          }
          this._gamepadStatus = gamepadStatus;
          this._lastTimestamp = gamepadStatus.timestamp;

          const buttons = gamepadStatus.buttons, axes = gamepadStatus.axes;
          let isRepeating = false;

          for (let i = 0, len = Math.min(this._buttons.length, buttons.length); i < len; i++) {
            const buttonStatus = buttons[i].pressed ? 1 : 0;

            if (this._buttons[i].pressed !== buttonStatus) {
              const eventName = (buttonStatus === 1) ? 'onButtonDown' : 'onButtonUp';
              //console.log('%cbutton%s:%s', 'background: lightblue;', i, buttonStatus, 0);
              this.emit(eventName, i, 0);
              this.emit('onButtonStatusChange', i, buttonStatus);
            }
            this._buttons[i].pressed = buttonStatus;
            if (buttonStatus) {
              this._buttons[i].repeat++;
              isRepeating = true;
              if (this._buttons[i].repeat % 5 === 0) {
                //console.log('%cbuttonRepeat%s', 'background: lightblue;', i);
                this.emit('onButtonRepeat', i);
              }
            } else {
              this._buttons[i].repeat = 0;
            }
          }
          for (let i = 0, len = Math.min(8, this._axes.length); i < len; i++) {
            const axis = Math.round(axes[i] * 1000) / 1000;

            if (this._axes[i].value === null) {
              this._axes[i].value = axis;
              continue;
            }

            const diff = Math.round(Math.abs(axis - this._axes[i].value));
            if (diff >= 1) {
              this.emit('onAxisChange', i, axis);
            }
            if (Math.abs(axis) <= 0.1 && this._axes[i].repeat > 0) {
              this._axes[i].repeat = 0;
            } else if (Math.abs(axis) > 0.1) {
              this._axes[i].repeat++;
              isRepeating = true;
            } else {
              this._axes[i].repeat = 0;
            }
            this._axes[i].value = axis;

          }

          if (typeof axes[9] !== 'number') {
            this._isRepeating = isRepeating;
            return;
          }
          let pov = '';
          if (this._id.match(/Vendor: 057e Product: 200[67]/i)) {
            const b = 100000;
            const axis = Math.trunc(axes[9] * b);
            const margin = b / 10;
            const AxisMap = this._id.match(/Vendor: 057e Product: 2006/i) ? AxisMapJoyConL : AxisMapJoyConR;
            if (Math.abs(JoyConAxisCenter * b - axis) <= margin) {
              pov = '';
            } else {
              Object.keys(AxisMap).forEach(key => {
                if (Math.abs(AxisMap[key] * b - axis) <= margin) {
                  pov = key;
                }
              });
            }

          } else if (this._id.match(/Vendor: (3810|05a0|1235|1002)/i)) {
            const p = Math.round(axes[9] * 1000);
            if (p < -500) {        pov = 'UP';
            } else if (p < 0) {    pov = 'RIGHT';
            } else if (p > 3000) { pov = '';
            } else if (p > 500){   pov = 'LEFT';
            } else {               pov = 'DOWN'; }
          }
          if (this._pov !== pov) {
            this._pov = pov;
            this._povRepeat = 0;
            isRepeating = pov !== '';
            this.emit('onPovChange', this._pov);
          } else if (pov !== '') {
            this._povRepeat++;
            isRepeating = true;
            if (this._povRepeat % 5 === 0) {
              this.emit('onPovRepeat', this._pov);
            }
          }
          this._isRepeating = isRepeating;
          //console.log(JSON.stringify(this.dump()));
        }
        dump() {
          const gamepadStatus = this._gamepadStatus, buttons = gamepadStatus.buttons, axes = gamepadStatus.axes;
          const  btmp = [], atmp = [];
          for (let i = 0, len = axes.length; i < len; i++) {
            atmp.push('ax' + i + ': ' + axes[i]);
          }
          for (let i = 0, len = buttons.length; i < len; i++) {
            btmp.push('bt' + i + ': ' + (buttons[i].pressed ? 1 : 0));
          }
          return atmp.join('\n') + '\n' + btmp.join(', ');
        }
        getX() {
          return this._axes.length > 0 ? this._axes[0] : 0;
        }
        getY() {
          return this._axes.length > 1 ? this._axes[1] : 0;
        }
        getZ() {
          return this._axes.length > 2 ? this._axes[2] : 0;
        }
        getButtonCount() {
          return this._buttons ? this._buttons.length : 0;
        }
        getButtonStatus(index) {
          return this._buttons[index] || 0;
        }
        getAxisCount() {
          return this._axes ? this._axes.length : 0;
        }
        getAxisValue(index) {
          return this._axes[index] || 0;
        }
        getDeviceIndex() {
          return this._index;
        }
        getDeviceId() {
          return this._id;
        }
        getPov() {
          return this._pov;
        }
        release() {
          // TODO: clear events
        }
      }

      return GamePad;
    })(Emitter);

    const ZenzaGamePad = (($, PollingTimer, GamePadModel) => {
      let activeGamepad = null;
      let pollingTimer = null;
      let ZenzaGamePad = ZenzaWatch.modules ?
        new ZenzaWatch.modules.Emitter() : new Emitter();

      const padIndex = Config.get('deviceIndex') * 1;

      const detectGamepad = () => {
        if (activeGamepad) {
          return;
        }
        const gamepads = navigator.getGamepads();
        if (gamepads.length < 1) {
          return;
        }
        const pad = Array.from(gamepads).find(pad => {
          return  pad &&
                  pad.connected &&
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
        const gamepad = new GamePadModel(pad);
        activeGamepad = gamepad;

        const self = ZenzaGamePad;
        const onButtonDown = number => {
          self.emit('onButtonDown', number, gamepad.deviceIndex);
        };
        const onButtonRepeat = number => {
          self.emit('onButtonRepeat', number, gamepad.deviceIndex);
        };
        const onButtonUp = number => {
          self.emit('onButtonUp', number, gamepad.deviceIndex);
        };
        const onAxisChange = (number, value) => {
          self.emit('onAxisChange', number, value, gamepad.deviceIndex);
        };
        const onAxisRepeat = (number, value) => {
          self.emit('onAxisRepeat', number, value, gamepad.deviceIndex);
        };
        const onAxisRelease = number => {
          self.emit('onAxisRelease', number, gamepad.deviceIndex);
        };
        const onPovChange = pov => {
          self.emit('onPovChange', pov, gamepad.deviceIndex);
        };
        const onPovRepeat = pov => {
          self.emit('onPovRepeat', pov, gamepad.deviceIndex);
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
      };


      const onGamepadConnectStatusChange = (e, isConnected) => {
        const padIndex = Config.get('deviceIndex') * 1;
        console.log('onGamepadConnetcStatusChange', e, e.gamepad.index, isConnected);
        if (e.gamepad.index !== padIndex) {
          return;
        }

        if (isConnected) {
          console.log('%cgamepad connected id:"%s"', 'background: lightblue;', e.gamepad.id);
          detectGamepad();
        } else {
          ZenzaGamePad.emit('onDeviceDisconnect', activeGamepad.getDeviceIndex());
          if (activeGamepad) {
            activeGamepad.release();
          }
          activeGamepad = null;
          console.log('%cgamepad disconneced id:"%s"', 'background: lightblue;', e.gamepad.id);
        }
      };

      const initializeTimer = () => {
        console.log('%cinitializeGamepadTimer', 'background: lightgreen;');
        const onTimerInterval = () => {
          if (!Config.get('enabled')) {
            return;
          }
          if (Config.get('needFocus') && !document.hasFocus()) {
            return;
          }
          if (!activeGamepad) {
            detectGamepad();
            return;
          }
          if (!activeGamepad.isConnected) {
            return;
          }
          activeGamepad.update();
        };
        pollingTimer = new PollingTimer(onTimerInterval, 1000);
      };

      const initializeGamepadConnectEvent = () => {
        console.log('%cinitializeGamepadConnectEvent', 'background: lightgreen;');

        window.addEventListener('gamepadconnected',
          e => onGamepadConnectStatusChange(e, true));
        window.addEventListener('gamepaddisconnected',
          e => onGamepadConnectStatusChange(e, false));

        if (activeGamepad) {
          return;
        }
        window.setTimeout(detectGamepad, 1000);
      };

      ZenzaGamePad.startDetect = () => {
        ZenzaGamePad.startDetect = _.noop;
        initializeTimer();
        initializeGamepadConnectEvent();
      };

      ZenzaGamePad.startPolling = () => {
        if (pollingTimer) { pollingTimer.start(); }
      };
      ZenzaGamePad.stopPolling = () => {
        if (pollingTimer) { pollingTimer.pause(); }
      };

      return ZenzaGamePad;
    })($, PollingTimer, GamePadModel);

    let hasInitGamePad = false;
    const initGamePad = () => {
      if (hasInitGamePad) { return; }
      hasInitGamePad = true;

      let isActivated = false;
      let isDetected = false;
      let deviceId, deviceIndex;
      const notifyDetect = () => {
        if (!document.hasFocus() || isDetected) { return; }
        isActivated = true;
        isDetected = true;

        // 初めてボタンかキーが押されたタイミングで通知する
        execCommand(
          'notify',
          'ゲームパッド "' + deviceId + '" が検出されました'
        );
      };

      const _onButtonDown = number => {
        notifyDetect();
        if (!isActivated) { return; }
        onButtonDown(number, deviceId);
      };
      const _onButtonRepeat = number => {
        if (!isActivated) { return; }
        onButtonRepeat(number, deviceId);
      };
      const _onButtonUp = number => {
        if (!isActivated) { return; }
        onButtonUp(number, deviceId);
      };
      const _onAxisChange = (number, value) => {
        notifyDetect();
        if (!isActivated) { return; }
        onAxisChange(number, value, deviceId);
      };
      const _onAxisRepeat = (number, value) => {
        if (!isActivated) { return; }
        onAxisRepeat(number, value, deviceId);
      };
      const _onAxisRelease = () => {
        if (!isActivated) { return; }
      };

      const _onPovChange = pov => {
        notifyDetect();
        if (!isActivated) { return; }
        onPovChange(pov, deviceId);
      };

      const _onPovRepeat = pov => {
        if (!isActivated) { return; }
        onPovRepeat(pov, deviceId);
      };

      let hasBound = false;
      const bindEvents = () => {
        if (hasBound) { return; }
        hasBound = true;

        ZenzaGamePad.on('onButtonDown',   _onButtonDown);
        ZenzaGamePad.on('onButtonRepeat', _onButtonRepeat);
        ZenzaGamePad.on('onButtonUp',     _onButtonUp);
        ZenzaGamePad.on('onAxisChange',   _onAxisChange);
        ZenzaGamePad.on('onAxisRepeat',   _onAxisRepeat);
        ZenzaGamePad.on('onAxisRelease',  _onAxisRelease);
        ZenzaGamePad.on('onPovChange',    _onPovChange);
        ZenzaGamePad.on('onPovRepeat',    _onPovRepeat);
      };

      const onDeviceConnect = (index, id) => {
         deviceIndex = index;
         deviceId = id;

         bindEvents();
      };

      ZenzaGamePad.on('onDeviceConnect', onDeviceConnect);
      //ZenzaGamePad.on('onDeviceDisConnect', onDeviceDisConnect);
      ZenzaGamePad.startDetect();
      window.ZenzaWatch.ZenzaGamePad = ZenzaGamePad;
    };

    const onZenzaWatchOpen = () => {
      isZenzaWatchOpen = true;
      initGamePad();
      ZenzaGamePad.startPolling();
    };

    const onZenzaWatchClose = () => {
      isZenzaWatchOpen = false;
      ZenzaGamePad.stopPolling();
    };


    const initialize = async () => {
      ZenzaWatch.emitter.on('DialogPlayerOpen',  onZenzaWatchOpen);
      ZenzaWatch.emitter.on('DialogPlayerClose', onZenzaWatchClose);

      const initButton = (container, handler) => {
        ZenzaGamePad.configPanel = new ConfigPanel({parentNode: document.querySelector('#zenzaVideoPlayerDialog')});
        const toggleButton = new ToggleButton({parentNode: container});
        toggleButton.on('command', handler);
        toggleButton.refresh();
      };
      if (ZenzaWatch.emitter.promise) {
        const {container, handler} = await ZenzaWatch.emitter.promise('videoControBar.addonMenuReady');
        initButton(container, handler);
      } else {
        ZenzaWatch.emitter.on('videoControBar.addonMenuReady', initButton);
      }
      ZenzaWatch.emitter.on('command-toggleZenzaGamePadConfig', () => {
        ZenzaGamePad.configPanel.toggle();
      });

    };

    initialize();
  };

  const loadMonkey = () => {
    const script = document.createElement('script');
    script.id = 'ZenzaGamePadLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.append(`(${monkey})(window.ZenzaWatch);`);
    document.head.append(script);
  };

const ZenzaDetector = (() => {
	const promise =
		(window.ZenzaWatch && window.ZenzaWatch.ready) ?
			Promise.resolve(window.ZenzaWatch) :
			new Promise(resolve => {
				[window, (document.body || document.documentElement)]
					.forEach(e => e.addEventListener('ZenzaWatchInitialize', () => {
						resolve(window.ZenzaWatch);
					}));
			});
	return {detect: () => promise};
})();
await ZenzaDetector.detect();
loadMonkey();

})(globalThis ? globalThis.window : window);
