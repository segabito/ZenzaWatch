// ==UserScript==
// @name        ZenzaGamePad
// @namespace   https://github.com/segabito/
// @description ZenzaWatchをゲームパッドで操作
// @include     http://www.nicovideo.jp/*
// @version     1.0.1
// @author      segabito macmoto
// @license     public domain
// @grant       none
// ==/UserScript==

(function() {

  var monkey = function(ZenzaWatch) {
    if (!window.navigator.getGamepads) {
      window.console.log('%cGamepad APIがサポートされていません', 'background: red; color: yellow;');
      return;
    }

    var _ = ZenzaWatch.lib._;
    var $ = ZenzaWatch.lib.$;

    var isZenzaWatchOpen = false;

    var console;
    var debugMode = !true;

    var dummyConsole = {
      log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop
    };
    console = debugMode ? window.console : dummyConsole;

    var execCommand = function(command, param) {
      ZenzaWatch.external.execCommand(command, param);
    };

    var onButtonDown = function(button) {
      if (!isZenzaWatchOpen) { return; }

      switch (button) {
        case 0: // A
          execCommand('togglePlay');
          break;
        case 1: // B
          execCommand('toggleMute');
          break;
        case 2: // X
          execCommand('toggleComment');
          break;
        case 3: // Y
          execCommand('playbackRate', 1.0);
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
          execCommand('playbackRate', 1.5);
          break;
        case 8: // ビューボタン (Back)
          execCommand('close');
          break;
        case 9: // メニューボタン (Start)
          execCommand('deflistAdd');
          break;
        case 10: // Lスティック
          execCommand('seek', 0);
          break;
        case 11: // Rスティック
          break;
        case 12: // up
          execCommand('volumeUp');
          break;
        case 13: // down
          execCommand('volumeDown');
          break;
        case 14: // left
          execCommand('seekBy', -5);
          break;
        case 15: // right
          execCommand('seekBy', +5);
          break;
      }
    };

    var onButtonRepeat = function(button) {
      if (!isZenzaWatchOpen) { return; }

      switch (button) {
        case 12: // up
          execCommand('volumeUp');
          break;
        case 13: // down
          execCommand('volumeDown');
          break;
        case 14: // left
          execCommand('seekBy', -5);
          break;
        case 15: // right
          execCommand('seekBy', +5);
          break;
      }
    };

    var onAxisChange = function(axis, value) {
      if (!isZenzaWatchOpen) { return; }

      switch (axis) {
        case 0: // Lスティック X
          execCommand('seekBy', value < 0 ? -5 : 5);
          break;
        case 1: // Lスティック Y
          execCommand(value < 0 ? 'volumeUp' : 'volumeDown');
          break;
        case 2: // Rスティック X
          break;
        case 3: // Rスティック Y
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

    var GamePadModel = (function($, _, emitter) {
      var GamePadModel = function(gamepadStatus) {
        this._gamepadStatus = gamepadStatus;
        this._buttons = [];
        this._axes = [];
        this.initialize(gamepadStatus);
      };
      _.extend(GamePadModel.prototype, emitter.prototype);

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

          for (i = 0, len = this._gamepadStatus.buttons.length; i < len; i++) {
            this._buttons[i] = {pressed: false, repeat: 0};
          }
          for (i = 0, len = this._gamepadStatus.axes.length; i < len; i++) {
            this._axes[i] = {value: 0, repeat: 0};
          }
        },
        update: function() {
          var gamepadStatus = (navigator.getGamepads())[this._index];
          // gp || this._gamepadStatus;
          if (!gamepadStatus) { console.log('no status'); return; }
          this._gamepadStatus = gamepadStatus;

          var buttons = gamepadStatus.buttons, axes = gamepadStatus.axes;
          var i, len;

          for (i = 0, len = this._buttons.length; i < len; i++) {
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
              if (this._buttons[i].repeat % 10 === 0) {
                //console.log('%cbuttonRepeat%s', 'background: lightblue;', i);
                this.emit('onButtonRepeat', i);
              }
            } else {
              this._buttons[i].repeat = 0;
            }
          }
          for (i = 0, len = this._axes.length; i < len; i++) {
            var axis = Math.round(axes[i] * 1000) / 1000;
            if (Math.round(Math.abs(axis - this._axes[i].value)) >= 1) {
              this._axes[i].repeat = 0;

              //console.log('%c%s %s', 'background: lightblue;', 'onAxisChange', i, axis, 0);
              this.emit('onAxisChange', i, axis);
              if (axis <= 0.05) {
                this.emit('onAxisRelease', i);
              } else {
                this._axes[i].repeat++;
                if (this._axes[i].repeat % 10 === 0) {
                  //console.log('%caxisRepeat%s:%s', 'background: lightblue;', i, axis);
                  this.emit('onAxisRepeat', i, axis);
                }
              }
              this._axes[i].value = axis;
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
        release: function() {
          // TODO: clear events
        }
      });

      return GamePadModel;
    })($, _, ZenzaWatch.lib.AsyncEmitter);

    var ZenzaGamePad = (function ($, PollingTimer, GamePadModel) {
      var primaryGamepad = null;
      var pollingTimer = null;
      var ZenzaGamePad = new ZenzaWatch.lib.AsyncEmitter();

      var detectGamepad = function() {
        if (primaryGamepad) {
          return;
        }
        var gamepads = navigator.getGamepads();
        if (gamepads.length > 0) {
          var pad = _.find(gamepads, (pad, i) => { return pad !== undefined && pad.id; });
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

          gamepad.on('onButtonDown',   onButtonDown);
          gamepad.on('onButtonRepeat', onButtonRepeat);
          gamepad.on('onButtonUp',     onButtonUp);
          gamepad.on('onAxisChange',   onAxisChange);
          gamepad.on('onAxisRepeat',   onAxisRepeat);
          gamepad.on('onAxisRelease',  onAxisRelease);

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
        var onTimerInterval = function() {
          if (!primaryGamepad) {
            detectGamepad();
          }
          if (!primaryGamepad || !primaryGamepad.isConnected) {
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

      return ZenzaGamePad;
    })($, PollingTimer, GamePadModel);


    var initGamePad = function() {
      initGamePad = _.noop;

      var deviceId, deviceIndex;
      var notifyDetect = function() {
        notifyDetect = _.noop;

        // 初めてボタンかキーが押されたタイミングで通知する
        execCommand(
          'notify',
          'ゲームパッド "' + deviceId + '" が検出されました'
        );
      };

      var _onButtonDown = function(number /*, deviceIndex*/) {
        notifyDetect();
        onButtonDown(number);
        //console.log('%conButtonDown: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
      };
      var _onButtonRepeat = function(number /*, deviceIndex*/) {
        onButtonRepeat(number);
        //console.log('%conButtonRepeat: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
      };
      var _onButtonUp = function(number /*, deviceIndex*/) {
        //console.log('%conButtonUp: number=%s, device=%s', 'background: lightblue;', number, deviceIndex);
      };
      var _onAxisChange = function(number, value, deviceIndex) {
        notifyDetect();
        onAxisChange(number, value, deviceIndex);
        //console.log('%conAxisChange: number=%s, value=%s, device=%s', 'background: lightblue;', number, value, deviceIndex);
      };
      var _onAxisRepeat = function(number, value, deviceIndex) {
        //console.log('%conAxisChange: number=%s, value=%s, device=%s', 'background: lightblue;', number, value, deviceIndex);
      };
      var _onAxisRelease = function(/* number, deviceIndex */) {
      };

      var onDeviceConnect = function(index, id) {
         onDeviceConnect = _.noop;
         deviceIndex = index;
         deviceId = id;

         ZenzaGamePad.on('onButtonDown',   _onButtonDown);
         ZenzaGamePad.on('onButtonRepeat', _onButtonRepeat);
         ZenzaGamePad.on('onButtonUp',     _onButtonUp);
         ZenzaGamePad.on('onAxisChange',   _onAxisChange);
         ZenzaGamePad.on('onAxisRepeat',   _onAxisRepeat);
         ZenzaGamePad.on('onAxisRelease',  _onAxisRelease);
      };

      ZenzaGamePad.on('onDeviceConnect', onDeviceConnect);
      ZenzaGamePad.startDetect();
    };

    var onZenzaWatchOpen = function() {
      isZenzaWatchOpen = true;
      initGamePad();
    };

    var onZenzaWatchClose = function() {
      isZenzaWatchOpen = false;
    };


    var initialize = function() {
      ZenzaWatch.emitter.on('DialogPlayerOpen',  onZenzaWatchOpen);
      ZenzaWatch.emitter.of('DialogPlayerClose', onZenzaWatchClose);
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
      window.jQuery('body').on('ZenzaWatchReady', function() {
        window.console.log('onZenzaWatchReady');
        loadMonkey();
      });
    }
  };
  waitForZenzaWatch();

})();
