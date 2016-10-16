// ==UserScript==
// @name        ZenzaWatch Advanced Settings
// @namespace   https://github.com/segabito/
// @description ZenzaWatchの上級者向け設定をするアドオン。設定する時だけ有効にすればOK
// @include     http://www.nicovideo.jp/my/*
// @version     0.2.3
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
    var __tpl__ = ZenzaWatch.util.hereDoc(function() {/*
      <span class="openZenzaAdvancedSettingPanel"><span></span>ZenzaWatch上級者設定</span>
    */});

    var __css__ = ZenzaWatch.util.hereDoc(function() {/*
      .userDetail .openZenzaAdvancedSettingPanel {
        display: inline-block;
        position: absolute;
        top: 40px;
        right: 8px;
        padding: 2px 8px;
        text-align: center;
        background: #fff;
        border: #ccc solid 1px;
        color: #0033cc;
        cursor: pointer;
      }

      .userDetail .openZenzaAdvancedSettingPanel:active {
        background: #ccc;
      }

      .openZenzaAdvancedSettingPanel span {
        display: inline-block;
        width: 10px;
        height: 8px;
        background: url(http://uni.res.nimg.jp/img/zero_my/icons.png) no-repeat;
        background-position: -8px -141px;
      }
    */});



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
        background: rgba(192, 192, 192, 0.95);
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
        background: #ccc;
        color: #000;
        width: 90%;
        margin: 0 5%;
        padding: 8px;
        border-radius: 8px;
      }
      .zenzaAdvancedSettingPanel input[type=text].update {
        color: #003;
        background: #fff;
        box-shadow: 0 0 8px #ff9;
      }
      .zenzaAdvancedSettingPanel input[type=text].update:before {
        content: 'ok';
        position: absolute;
        left: 0;
        z-index: 100;
        color: blue;
      }

      .zenzaAdvancedSettingPanel input[type=text].error {
        color: #300;
        background: #f00;
      }

      .zenzaAdvancedSettingPanel select {
        font-size:24px;
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

      .textAreaInput {
        width: 90%;
        height: 200px;
        margin: 0 5%;
        word-break: break-all;
        overflow: scroll;
      }

      .zenzaAdvancedSetting-rawData,
      .zenzaAdvancedSetting-playlistData {
        width: 90%;
        height: 300px;
        margin: 0 5%;
        word-break: break-all;
        overflow: scroll;
      }

      .zenzaAdvancedSetting-close:active {
        box-shadow: none;
        border: inset 2px;
        transform: scale(0.8);
      }

      .zenzaAdvancedSettingPanel:not(.debug) .debugOnly {
        display: none !important;
      }


      .example code {
        font-family: monospace;
        display: inline-block;
        margin: 4px;
        padding: 4px 8px;
        background: #333;
        color: #fe8;
        border-radius: 4px;
      }

    */});

    SettingPanel.__tpl__ = (`
      <div class="zenzaAdvancedSettingPanel">
        <div class="settingPanelInner">
          <div class="enableFullScreenOnDoubleClickControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="enableFullScreenOnDoubleClick">
              画面ダブルクリックでフルスクリーン切り換え
            </label>
          </div>

          <div class="autoCloseFullScreenControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoCloseFullScreen">
              再生終了時に自動でフルスクリーン解除

            </label>
          </div>

          <div class="continueNextPageControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="continueNextPage">
              再生中にページを切り換えても続きから再開する
            </label>
          </div>

          <div class="enableDblclickClose control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="enableDblclickClose">
              背景のダブルクリックでプレイヤーを閉じる
            </label>
          </div>


          <p class="caption sub">NGワード正規表現</p>
          <span class="example">入力例: <code>([wWｗＷ]+$|^ん[？\?]$|洗った？$)</code> 文法エラーがある時は更新されません</span>
          <input type="text" class="textInput wordRegFilterInput"
            data-setting-name="wordRegFilter">

          <p class="caption sub">NGワード正規表現フラグ</p>
          <span class="example">入力例: <code>i</code></span>
          <input type="text" class="textInput wordRegFilterFlagsInput"
            data-setting-name="wordRegFilterFlags">

          <p class="caption sub">NG tag</p>
          <span class="example">連続再生中にこのタグのある動画があったらスキップ</span>
          <textarea class="videoTagFilter textAreaInput"
            data-setting-name="videoTagFilter"></textarea>

          <p class="caption sub">NG owner</p>
          <span class="example">連続再生中にこの投稿者IDがあったらスキップ。 チャンネルの場合はchをつける 数字の後に 入力例<code>2525 #コメント</code></span>
          <textarea class="videoOwnerFilter textAreaInput"
            data-setting-name="videoOwnerFilter"></textarea>

          <div class="debugControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="debug">
              デバッグモード
            </label>
          </div>

          <div class="debugOnly">
            <p class="caption sub">生データ(ZenzaWatch設定)</p>
            <span class="example">丸ごとコピペで保存/復元可能。 ここを消すと設定がリセットされます。</span>
            <textarea class="zenzaAdvancedSetting-rawData"></textarea>

            <p class="caption sub">生データ(プレイリスト)</p>
            <span class="example">丸ごとコピペで保存/復元可能。 編集は自己責任で</span>
            <textarea class="zenzaAdvancedSetting-playlistData"></textarea>

          </div>

          <div class="zenzaAdvancedSetting-close">閉じる</div>

        </div>
      </div>
    `).trim();

    _.assign(SettingPanel.prototype, {
      initialize: function(params) {
        this._playerConfig     = params.playerConfig;
        this._$container       = params.$container;

        this._update$rawData = _.debounce(this._update$rawData.bind(this), 500);
        this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
        this._initializeDom();
      },
      _initializeDom: function() {
        var $container = this._$container;
        var config = this._playerConfig;

        ZenzaWatch.util.addStyle(SettingPanel.__css__);
        $container.append(SettingPanel.__tpl__);

        var $panel = this._$panel = $container.find('.zenzaAdvancedSettingPanel');
        this._$view =
          $container.find('.zenzaAdvancedSettingPanel');
        this._$view.on('click', function(e) {
          e.stopPropagation();
        });
        this._$view.on('wheel', function(e) {
          e.stopPropagation();
        });

        this._$rawData = $panel.find('.zenzaAdvancedSetting-rawData');
        this._$rawData.val(JSON.stringify(config.exportConfig()));
        this._$rawData.on('change', function() {
          var val = this._$rawData.val();
          var data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('設定データを直接書き換えしますか？')) {
            config.clearConfig();
            config.importConfig(data);
            location.reload();
          }

        }.bind(this));

        this._$playlistData = $panel.find('.zenzaAdvancedSetting-playlistData');
        this._$playlistData.val(JSON.stringify(ZenzaWatch.external.playlist.export()));
        this._$playlistData.on('change', function() {
          var val = this._$playlistData.val();
          var data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('プレイリストデータを直接書き換えしますか？')) {
            ZenzaWatch.external.playlist.import(data);
            location.reload();
          }

        }.bind(this));

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

        var $textarea = $panel.find('.textAreaInput');
        $textarea.each(function(i, textarea) {
          var $t = $(textarea);
          var settingName = $t.attr('data-setting-name');
          var val = config.getValue(settingName);
          $t.val(val);
        });
        $textarea.on('change', onInputItemChange);


        $panel.find('.zenzaAdvancedSetting-close').on('mousedown', function(e) {
          e.stopPropagation();
          this.hide();
        }.bind(this));

        $panel.toggleClass('debug', config.getValue('debug'));

        //ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        //  this.hide();
        //}, this));

      },
      _onPlayerConfigUpdate: function(key, value) {
        switch (key) {
          case 'debug':
            this._$panel.toggleClass('debug', value);
            break;
          case 'wordRegFilter':
          case 'wordRegFilterFlags':
            this._$panel.find('.' + key + 'Input').val(value);
            break;
          case 'enableFullScreenOnDoubleClick':
          case 'autoCloseFullScreen':
          case 'continueNextPage':
            this._$panel
              .find('.' + key + 'Control').toggleClass('checked', value)
              .find('input[type=checkbox]').prop('checked', value);
            break;
        }
        this._update$rawData();
      },
      _update$rawData: function() {
        this._$rawData.val(JSON.stringify(this._playerConfig.exportConfig()));
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
      _beforeShow: function() {
        if (this._$playlistData) {
          this._$playlistData.val(
            JSON.stringify(ZenzaWatch.external.playlist.export())
          );
        }
      },
      toggle: function(v) {
        ZenzaWatch.external.execCommand('close');
        this._$view.toggleClass('show', v);
        if (this._$view.hasClass('show')) { this._beforeShow(); }
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
    };

    var initialize = function() {
      var $button = $(__tpl__);
      ZenzaWatch.util.addStyle(__css__);

      $('.accountEdit').after($button);
      $button.on('click', function() {
        initializePanel();
        panel.toggle();
      });

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
