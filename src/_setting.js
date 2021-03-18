// ==UserScript==
// @name        ZenzaWatch 上級者用設定
// @namespace   https://github.com/segabito/
// @description1 ZenzaWatchの上級者向け設定。変更する時だけ有効にすればOK
// @include     *//www.nicovideo.jp/my*
// @version     0.3.2
// @author      segabito macmoto
// @license     public domain
// @grant       none
// @noframes
// @require     https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.min.js
// ==/UserScript==

import {ZenzaDetector} from '../packages/components/src/util/ZenzaDetector';
import {uq} from '../packages/lib/src/uQuery';
import {cssUtil} from '../packages/lib/src/css/css';
import {DataStorage} from '../packages/lib/src/infra/DataStorage';
import {Config} from './Config';
import {Emitter, Handler} from '../packages/lib/src/Emitter';
((window) => { const self = window;
  const PRODUCT = 'ZenzaWatch';
  const monkey = async (PRODUCT) => {
    const _ = window._ ;
    const Array = window.PureArray || window.Array;
//@require Emitter
//@require Config
await Config.promise('restore');
//@require uq
const $ = uq;
//@require cssUtil
    window.ZenzaAdvancedSettings = {
      config: Config
    };
    const global = {
      PRODUCT
    };

    let panel;

    const __tpl__ = (`
      <span class="openZenzaAdvancedSettingPanel"><span></span>ZenzaWatch上級者設定</span>
    `).trim();

    const __css__ = (`
      .openZenzaAdvancedSettingPanel {
        display: inline-block;
        position: absolute;
        top: 30px;
        right: 0;
        padding: 2px 8px;
        text-align: center;
        background: #fff;
        border: #ccc solid 1px;
        color: #0033cc;
        cursor: pointer;
      }
      .userDetail .openZenzaAdvancedSettingPanel {
        top: 8px;
        right: 148px;
      }

      .openZenzaAdvancedSettingPanel:active {
        background: #ccc;
      }

      .openZenzaAdvancedSettingPanel span {
        display: inline-block;
        width: 10px;
        height: 8px;
        background: url(https://nicovideo.cdn.nimg.jp/uni/img/zero_my/icons.png) no-repeat;
        background-position: -8px -141px;
      }


      .summer2017Area {
        display: none !important;
      }
    `).trim();



    class SettingPanel {
      constructor(...args) {
        this.initialize(...args);
      }
      initialize(params) {
        this._playerConfig     = params.playerConfig;
        this._$container       = params.$container;

        this._update$rawData = _.debounce(this._update$rawData.bind(this), 500);
        this._playerConfig.on('update', this._onPlayerConfigUpdate.bind(this));
      }
      _initializeDom() {
        if (this._$panel) { return; }
        const $container = this._$container;
        const config = this._playerConfig;

        cssUtil.addStyle(SettingPanel.__css__);
        $container.append(uq.html(SettingPanel.__tpl__));

        const $panel = this._$panel = $container.find('.zenzaAdvancedSettingPanel');
        this._$view =
          $container.find('.zenzaAdvancedSettingPanel');
        this._$view.on('click', e => e.stopPropagation());

        this._$rawData = $panel.find('.zenzaAdvancedSetting-rawData');
        this._$rawData.val(config.exportJson());
        this._$rawData.on('change', () => {
          let val = this._$rawData.val();
          let data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('設定データを直接書き換えしますか？')) {
            config.clear();
            config.import(data);
            location.reload();
          }

        });

        this._$playlistData = $panel.find('.zenzaAdvancedSetting-playlistData');
        this._$playlistData.val(JSON.stringify(window.ZenzaWatch.external.playlist.export(), null, 2));
        this._$playlistData.on('change', () => {
          let val = this._$playlistData.val();
          let data;
          if (val === '') { val = '{}'; }

          try {
            data = JSON.parse(val);
          } catch (e) {
            alert(e);
            return;
          }

          if (confirm('プレイリストデータを直接書き換えしますか？')) {
            window.ZenzaWatch.external.playlist.import(data);
            location.reload();
          }

        });

        const onInputItemChange = this._onInputItemChange.bind(this);
        const $check = $panel.find('input[type=checkbox]');
        $check.forEach(check => {
          const {settingName} = check.dataset;
          const val = !!config.props[settingName];
          check.checked = val;
          check.closest('.control').classList.toggle('checked', val);
        });
        $check.on('change', this._onToggleItemChange.bind(this));

        const $input = $panel.find('input[type=text], select, .textAreaInput');
        $input.forEach(input => {
          const {settingName} = input.dataset;
          const val = config.props[settingName];
          input.value = val;
        });
        $input.on('change', onInputItemChange);


        $panel.find('.zenzaAdvancedSetting-close').on('mousedown', e => {
          e.stopPropagation();
          this.hide();
        });

        $panel.toggleClass('debug', config.props.debug);
      }
      _onPlayerConfigUpdate(key, value) {
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
      }
      _update$rawData() {
        this._$rawData.val(this._playerConfig.exportJson());
      }
      _onToggleItemChange(e) {
        const {settingName} = e.target.dataset;
        const val = !!e.target.checked;

        this._playerConfig.props[settingName] = val;
        e.target.closest('.control').classList.toggle('checked', val);
      }
      _onInputItemChange(e) {
        const $target = $(e.target);
        const {settingName} = e.target.dataset;
        const val = e.target.value;

        window.setTimeout(() => $target.removeClass('update error'), 300);

        window.console.log('onInputItemChange', settingName, val);
        switch (settingName) {
          case 'wordRegFilter':
            try {
              const reg = new RegExp(val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
            break;
          case 'wordRegFilterFlags': {
            try {
              const reg = new RegExp(/./, val);
              $target.addClass('update');
            } catch(err) {
              $target.addClass('error');
              //alert('正規表現にエラーがあります');
              return;
            }
          }
            break;
          default:
            $target.addClass('update');
            break;
        }

        this._playerConfig.props[settingName] = val;
      }
      _beforeShow() {
        if (this._$playlistData) {
          this._$playlistData.val(
            JSON.stringify(window.ZenzaWatch.external.playlist.export(), null, 2)
          );
        }
      }
      toggle(v) {
        this._initializeDom();
        // window.ZenzaWatch.external.execCommand('close');
        this._$view.toggleClass('show', v);
        if (this._$view.hasClass('show')) { this._beforeShow(); }
      }
      show() {
        this.toggle(true);
      }
      hide() {
        this.toggle(false);
      }
    }


    SettingPanel.__css__ = (`
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
        background: rgba(192, 192, 192, 1);
        transition: top 0.4s ease;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        overflow: hidden;
      }
      .zenzaAdvancedSettingPanel.show {
        opacity: 1;
        top: 50%;
      }

      .zenzaAdvancedSettingPanel.show {
        border: 2px outset #fff;
        box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
        pointer-events: auto;
      }

      .zenzaAdvancedSettingPanel .settingPanelInner {
        box-sizing: border-box;
        margin: 8px;
        padding: 8px;
        overflow: auto;
        height: calc(100% - 86px);
        overscroll-behavior: contain;
        border: 1px inset;
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
        height: 100%;
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
        background: rgba(88, 88, 128, 0.3);
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
        cursor: pointer;
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
        position: absolute;
        width: 50%;
        left: 50%;
        bottom: 8px;
        transform: translate(-50%);
        z-index: 160000;
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

    `).trim();

    const commands = (`
      <option value="">なし</option>
      <option value="togglePlay">再生/停止</option>
      <option value="fullScreen">フルスクリーン ON/OFF</option>
      <option value="toggle-mute">ミュート ON/OFF</option>
      <option value="toggle-showComment">コメント表示 ON/OFF</option>
      <option value="toggle-backComment">コメントの背面表示 ON/OFF</option>
      <option value="toggle-loop">ループ ON/OFF</option>
      <option value="toggle-enableFilter">NG設定 ON/OFF</option>
      <option value="screenShot">スクリーンショット</option>
      <option value="deflistAdd">とりあえずマイリスト</option>
      <option value="picture-in-picture">picture-in-picture</option>
    `).trim();

    SettingPanel.__tpl__ = (`
      <div class="zenzaAdvancedSettingPanel zen-family">
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

          <div class="autoDisableDmc control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoDisableDmc">
              旧システムのほうが画質が良さそうな時は旧システムにする。(旧システム側が1280x720を超える時)
            </label>
          </div>

          <div class="autoZenTube control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="autoZenTube">
              自動ZenTube (ZenTubeから戻す時は動画を右クリックからリロード または 右下の「画」)
            </label>
          </div>

          <div class="enableSlotLayoutEmulation control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="commentLayer.enableSlotLayoutEmulation">
              Flash版のコメントスロット処理をエミュレーションする
            </label>
          </div>

          <div class="touch-tap2command control toggle">
            <label>
              2本指タッチ
              <select data-setting-name="touch.tap2command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap3command control toggle">
            <label>
              3本指タッチ
              <select data-setting-name="touch.tap3command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap3command control toggle">
            <label>
              4本指タッチ
              <select data-setting-name="touch.tap4command">
                ${commands}
              </select>
            </label>
          </div>

          <div class="touch-tap5command control toggle">
            <label>
              5本指タッチ
              <select data-setting-name="touch.tap5command">
                ${commands}
              </select>
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

        </div>
        <div class="zenzaAdvancedSetting-close">閉じる</div>
      </div>
    `).trim();



    const initializePanel = () => {
      // Config.watch();
      panel = new SettingPanel({
        playerConfig: Config,
        $container: $('body')
      });
    };

    const initialize = () => {
      const $button = $(__tpl__);
      cssUtil.addStyle(__css__);

      document.querySelector('#js-initial-userpage-data') ?
        $('.Dropdown-button').before($button) :
        $('.accountEdit').after($button);

      $button.on('click', e => {
        initializePanel();
        panel.toggle();
      });

    };

    initialize();
  };

  const loadGM = () => {
    const script = document.createElement('script');
    script.id = 'ZenzaWatchAdvancedSettingsLoader';
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.append(`(${monkey})('${PRODUCT}');`);
    document.body.append(script);
  };


//@require ZenzaDetector
ZenzaDetector.detect().then(() => loadGM());


})(globalThis ? globalThis.window : window);
