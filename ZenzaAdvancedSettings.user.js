// ==UserScript==
// @name        ZenzaWatch Advanced Settings
// @namespace   https://github.com/segabito/
// @description ZenzaWatchの細かな設定をする (わかる人用)
// @include     http://www.nicovideo.jp/my/*
// @version     1.0.0
// @author      segabito macmoto
// @license     public domain
// @grant       none
// @noframes
// ==/UserScript==


(function() {

  var monkey = function(ZenzaWatch) {

    var _ = ZenzaWatch.lib._;
    var $ = ZenzaWatch.lib.$;

    var console;
    var debugMode = !true;
    var panel;

    var dummyConsole = {
      log: _.noop, error: _.noop, time: _.noop, timeEnd: _.noop, trace: _.noop
    };
    console = debugMode ? window.console : dummyConsole;

    var SettingPanel = function() { this.initialize.apply(this, arguments); };
    SettingPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
      .zenzaAdvancedSettingPanel {
        position: fixed;
        left: 50%;
        top: -100vh;
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 200000;
        width: 90vw;
        height: 90vh;
        color: #000;
        background: rgba(192, 192, 192, 0.9);
        transition: top 0.4s ease;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        overflow-y: hidden;
      }
      .zenzaAdvancedSettingPanel.show {
        opacity: 1;
        top: 50%;
        overflow-y: scroll;
        overflow-x: hidden;
      }

      .zenzaAdvancedSettingPanel.show {
        border: 2px outset #fff;
        box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
        pointer-events: auto;
      }

      .zenzaAdvancedSettingPanel .settingPanelInner {
        box-sizing: border-box;
        margin: 16px;
        overflow: visible;
      }
      .zenzaAdvancedSettingPanel .caption {
        background: #333;
        font-size: 20px;
        padding: 4px 8px;
        color: #fff;
      }

      .zenzaAdvancedSettingPanel .caption.sub {
        margin: 8px;
        font-size: 16px;
      }

      .zenzaAdvancedSettingPanel .example {
        display: inline-block;
        margin: 0 16px;
        font-family: sans-serif;
      }

      .zenzaAdvancedSettingPanel label {
        display: inline-block;
        box-sizing: border-box;
        width: 100%;
        padding: 4px 8px;
        cursor: pointer;
      }

      .zenzaAdvancedSettingPanel .control {
        border-radius: 4px;
        background: rgba(88, 88, 88, 0.3);
        padding: 8px;
        margin: 16px 4px;
      }

      .zenzaAdvancedSettingPanel .control:hover {
        border-color: #ff9;
      }

      .zenzaAdvancedSettingPanel button {
        font-size: 10pt;
        padding: 4px 8px;
        background: #888;
        border-radius: 4px;
        border: solid 1px;
        cursor: pointer;
      }

      .zenzaAdvancedSettingPanel input[type=checkbox] {
        transform: scale(2);
        margin-left: 8px;
        margin-right: 16px;
      }

      .zenzaAdvancedSettingPanel .control.checked {
      }

      .zenzaAdvancedSettingPanel input[type=text] {
        font-size: 24px;
        background: #000;
        color: #ccc;
        width: 90%;
        margin: 0 5%;
        padding: 8px;
        border-radius: 8px;
      }
      .zenzaAdvancedSettingPanel input[type=text].update {
        color: #fff;
        background: #003;
      }
      .zenzaAdvancedSettingPanel input[type=text].error {
        color: #f00;
        background: #300;
      }

      .zenzaAdvancedSettingPanel select {
        font-size:24px;
        background: #000;
        color: #ccc;
        margin: 0 5%;
        border-radius: 8px;
       }

      .zenzaAdvancedSetting-close {
        width: 50%;
        z-index: 160000;
        margin: 16px auto;
        padding: 8px 16px;
        cursor: pointer;
        box-sizing: border-box;
        text-align: center;
        line-height: 30px;
        font-size: 24px;
        border: outset 2px;
        box-shadow: 0 0 4px #000;
        transition:
          opacity 0.4s ease,
          transform 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease
            ;
        pointer-events: auto;
        transform-origin: center center;
      }

      .zenzaAdvancedSetting-close:active {
        box-shadow: none;
        border: inset 2px;
        transform: scale(0.8);
      }
    */});
    SettingPanel.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
      <div class="zenzaAdvancedSettingPanel">
        <div class="settingPanelInner">
          <div class="enableFullScreenOnDoubleClick control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="enableFullScreenOnDoubleClick">
              画面ダブルクリックでフルスクリーン
            </label>
          </div>

          <p class="caption sub">NGワード正規表現</p>
          <span class="example">入力例: 「([wWｗＷ]+$|^ん[？\?]$|洗った？$)」</span>
          <input type="text" class="textInput wordRegFilterInput"
            data-setting-name="wordRegFilter">

          <p class="caption sub">NGワード正規表現フラグ</p>
          <span class="example">入力例: 「i」</span>
          <input type="text" class="textInput wordRegFilterFlagsInput"
            data-setting-name="wordRegFilterFlags">

          <div class="zenzaAdvancedSetting-close">閉じる</div>

        </div>
      </div>
    */});

    _.assign(SettingPanel.prototype, {
      initialize: function(params) {
        this._playerConfig     = params.playerConfig;
        this._$container       = params.$container;

        this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
        this._initializeDom();
      },
      _initializeDom: function() {
        var $container = this._$container;
        var config = this._playerConfig;

        ZenzaWatch.util.addStyle(SettingPanel.__css__);
        $container.append(SettingPanel.__tpl__);

        var $panel = this._$panel = $container.find('.zenzaAdvancedSettingPanel');
        this._$view =
          $container.find('.zenzaAdvancedSettingPanel, .zenzaAdvancedSettingPanelShadow1, .zenzaAdvancedSettingPanelShadow2');
        this._$view.on('click', function(e) {
          e.stopPropagation();
        });
        this._$view.on('wheel', function(e) {
          e.stopPropagation();
        });

        var onInputItemChange = this._onInputItemChange.bind(this);
        var $check = $panel.find('input[type=checkbox]');
        $check.each(function(i, check) {
          var $c = $(check);
          var settingName = $c.attr('data-setting-name');
          var val = config.getValue(settingName);
          $c.prop('checked', val);
          $c.closest('.control').toggleClass('checked', val);
        });
        $check.on('change', this._onToggleItemChange.bind(this));

        var $text = $panel.find('input[type=text]');
        $text.each(function(i, text) {
          var $t = $(text);
          var settingName = $t.attr('data-setting-name');
          var val = config.getValue(settingName);
          $t.val(val);
        });
        $text.on('change', onInputItemChange);

        var $select = $panel.find('select');
        $select.each(function(i, select) {
          var $s = $(select);
          var settingName = $s.attr('data-setting-name');
          var val = config.getValue(settingName);
          $s.val(val);
        });
        $select.on('change', onInputItemChange);

        $panel.find('.zenzaAdvancedSetting-close').on('mousedown', function(e) {
          e.stopPropagation();
          this.hide();
        }.bind(this));

        //ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        //  this.hide();
        //}, this));

      },
      _onPlayerConfigUpdate: function(key, value) {
        switch (key) {
          case 'wordRegFilter':
          case 'wordRegFilterFlags':
            this._$panel.find('.' + key + 'Input').val(value);
            break;
          case 'enableFullScreenOnDoubleClick':
          case 'debug':
            this._$panel
              .find('.' + key + 'Control').toggleClass('checked', value)
              .find('input[type=checkbox]').prop('checked', value);
            break;
        }
      },
      _onToggleItemChange: function(e) {
        var $target = $(e.target);
        var settingName = $target.attr('data-setting-name');
        var val = !!$target.prop('checked');

        this._playerConfig.setValue(settingName, val);
        $target.closest('.control').toggleClass('checked', val);
      },
      _onInputItemChange: function(e) {
        var $target = $(e.target);
        var settingName = $target.attr('data-setting-name');
        var val = $target.val();

        window.setTimeout(function() {
          $target.removeClass('update error');
        }, 300);

        window.console.log('onInputItemChange', settingName, val);
        var reg;
        switch (settingName) {
          case 'wordRegFilter':
            try {
              reg = new RegExp(val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
            break;
          case 'wordRegFilterFlags':
            try {
              reg = new RegExp('', val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
            break;
          default:
            $target.addClass('update');
            break;
        }

        this._playerConfig.setValue(settingName, val);
      },
      toggle: function(v) {
        var eventName = 'click.ZenzaAdvancedSettingPanel';
        var $container = this._$container.off(eventName);
        var $body = $('body').off(eventName);
        var $view = this._$view.toggleClass('show', v);

        var onBodyClick = function() {
          $view.removeClass('show');
          $container.off(eventName);
          $body.off(eventName);
        };

        if ($view.hasClass('show')) {
          $container.on(eventName, onBodyClick);
          $body.on(eventName, onBodyClick);
        }
      },
      show: function() {
        this.toggle(true);
      },
      hide: function() {
        this.toggle(false);
      }
    });


    var initializePanel = function() {
      initializePanel = _.noop;
      panel = new SettingPanel({
        playerConfig: ZenzaWatch.config,
        $container: $('body')
      });
      panel.show();
    };

    var initialize = function() {
      initializePanel();
    };

    initialize();
  };

  var loadMonkey = function() {
    var script = document.createElement('script');
    script.id = 'ZenzaWatchAdvancedSettingsLoader';
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
