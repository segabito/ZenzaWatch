import * as _ from 'lodash';
import {Emitter} from '../packages/lib/src/Emitter';
import {cssUtil} from '../packages/lib/src/css/css';
import {uq} from '../packages/lib/src/uQuery';
import {domEvent} from '../packages/lib/src/dom/domEvent';

//===BEGIN===

class SettingPanel extends Emitter {
  constructor(params) {
    super();
    this._params = params;
    this._initialized = false;
  }
  initialize () {
    if (this._initialized) {
      return;
    }
    const params = this._params;
    this._playerConfig = params.playerConfig;
    this._$parent = params.$parent;
    this._player = params.player;

    this._playerConfig.on('change', this._onPlayerConfigChange.bind(this));
    this._initializeDom();
    this._initializeCommentFilterEdit();
    this.sync();
    this._initialized = true;
  }
  _initializeDom () {
    const $parent = this._$parent;

    cssUtil.addStyle(SettingPanel.__css__);
    const $view = this._$view = uq.html(SettingPanel.__tpl__);
    $view.appendTo($parent[0]);
    this.elm = $view.mapQuery({
      $check: 'input[type=checkbox]',
      $radio: 'input[type=radio]',
      $text: 'input[type=text], select',
      $filterEdit: '.filterEdit',
      wordFilter: '.wordFilterEdit',
      userIdFilter: '.userIdFilterEdit',
      commandFilter: '.commandFilterEdit',
      fileSelect: '.import-config-file-select'
    }).result;

    $view.on('click', this._onClick.bind(this))
      .on('wheel', e => e.stopPropagation(), {passive: true})
      .on('paste', e => e.stopPropagation());

    const {$check, $radio, $text, $filterEdit} = this.elm;
    $check.on('change', this._onToggleItemChange.bind(this));
    $radio.on('change', this._onRadioItemChange.bind(this));
    $text.on('change', this._onInputItemChange.bind(this));
    $filterEdit.on('change', this._onFilterEditChange.bind(this));

    this.elm.fileSelect.addEventListener('change', this._onImportFileSelect.bind(this));
  }
  _initializeCommentFilterEdit() {
    this.elm.$filterEdit.on('change', e =>
      this.emit('command', e.target.dataset.command, e.target.value));
  }
  sync() {
    const config = this._playerConfig;
    const {wordFilter, userIdFilter, commandFilter, $check, $radio, $text} = this.elm;
    const filterMap = {wordFilter, userIdFilter, commandFilter};
    Object.keys(filterMap).forEach(v => {
      let value = config.props[v] || [];
      value = Array.isArray(value) ? value.join('\n') : value;
      filterMap[v].value = value;
    });

    for (const check of $check) {
      const settingName = check.dataset.settingName;
      const val = config.props[settingName];
      check.checked = val;
      (check.closest('.control') || check).classList.toggle('checked', val);
    }

    for (const check of $radio) {
      const settingName = check.dataset.settingName;
      const val = config.props[settingName];
      check.checked = val === check.value;
    }

    for (const elm of $text) {
      const settingName = elm.dataset.settingName;
      const val = config.props[settingName];
      elm.value = val;
    }
  }
  _onClick(e) {
    const target = e.target.closest('[data-command]');
    e.stopPropagation();

    if (!target) {
      return;
    }

    let {command, type = 'string', param} = target.dataset;
    if (type !== 'string') { param = JSON.parse(param); }

    domEvent.dispatchCommand(target, command, param);
  }
  _onPlayerConfigChange(changed) {
    const keys = [
      'wordFilter', 'userIdFilter', 'commandFilter',
      'loop','autoPlay','enableHeatMap',
      'autoFullScreen','enableStoryboard',
      'loadLinkedChannelVideo'];
    if ([...changed.keys()].some(key => keys.includes(key))) {
      this.sync();
    }
  }
  _onToggleItemChange(e) {
    const name = e.target.dataset.settingName;
    const val = !!e.target.checked;

    this._playerConfig.props[name] = val;
    e.target.closest('.control').classList.toggle('checked', val);
  }
  _onRadioItemChange(e) {
    const name = e.target.dataset.settingName;
    const checked = !!e.target.checked;
    if (!checked) {
      return;
    }
    this._playerConfig.props[name] = e.target.value;
  }
  _onInputItemChange(e) {
    const name = e.target.dataset.settingName;
    const val = e.target.value;
    this._playerConfig.props[name] = val;
  }
  _onFilterEditChange(e) {
    const command = e.target.dataset.commandName;
    const param = e.target.value;
    domEvent.dispatchCommand(e.target, command, param);
  }
  toggle(v) {
    if (v !== false) {
      this.initialize();
    } else if (!this._initialized) {
      return;
    }
    const view = this._$view[0];
    if (typeof v !== 'boolean') {
      v = !view.contains(document.activeElement);
    }
    v ? view.focus() : view.blur();
    if (v) {
      this.sync();
    }
  }
  show () {
    this.toggle(true);
  }
  hide () {
    this.toggle(false);
  }
  async _onImportFileSelect(e) {
    e.preventDefault();

    const file = e.target.files[0];
    if (!/\.config\.json$/.test(file.name)) {
      return;
    }
    if (!confirm(`ファイル "${file.name}" で書き換えますか？`)) {
      return;
    }

    domEvent.dispatchCommand(e.target, 'close');

    const fileReader = new FileReader();
    fileReader.onload = ev => {
      this._playerConfig.importJson(ev.target.result);
      location.reload();
    };

    fileReader.readAsText(file);
  }

}
SettingPanel.__css__ = (`
  .zenzaSettingPanel {
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -100vh);
    z-index: 170000;
    color: #fff;
    transition: transform 0.4s ease;
    will-change: transform;
    pointer-events: none;
    user-select: none;
    overflow-y: hidden;
    outline: none;
    contain: strict;
  }
  .zenzaSettingPanel:not(:focus-within) >* {
    display: none;
  }
  .zenzaSettingPanel:focus-within {
    width: 500px;
    height: 400px;
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%);
    overflow-y: scroll;
    overflow-x: hidden;
    overscroll-behavior: contain;
    background: rgba(0, 0, 0, 0.8);
  }

  .zenzaSettingPanel:focus-within::-webkit-scrollbar {
    width: 16px;
    background: var(--scrollbar-bg-color);
  }
  .zenzaSettingPanel:focus-within::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb-color);
  }

  .zenzaScreenMode_sideView .zenzaSettingPanel:focus-within,
  .zenzaScreenMode_small    .zenzaSettingPanel:focus-within {
    position: fixed;
  }

  .zenzaSettingPanel:focus-within {
    border: 2px outset #fff;
    box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
    pointer-events: auto;
  }


  .zenzaSettingPanel .settingPanelInner {
    box-sizing: border-box;
    margin: 16px;
    overflow: visible;
  }
  .zenzaSettingPanel .caption {
    background: #333;
    font-size: 20px;
    padding: 4px 2px;
    color: #fff;
  }

  .zenzaSettingPanel label {
    display: inline-block;
    box-sizing: border-box;
    width: 100%;
    padding: 4px 8px;
    cursor: pointer;
  }

  .zenzaSettingPanel .control {
    border-radius: 4px;
    background: rgba(88, 88, 88, 0.3);
    padding: 8px;
    margin: 16px 4px;
  }

  .zenzaSettingPanel .control:hover {
    border-color: #ff9;
  }

  .zenzaSettingPanel button {
    font-size: 10pt;
    padding: 4px 8px;
    background: #888;
    border-radius: 4px;
    border: solid 1px;
    cursor: pointer;
  }

  .zenzaSettingPanel input[type=checkbox] {
    transform: scale(2);
    margin-left: 8px;
    margin-right: 16px;
  }

  .zenzaSettingPanel .filterEditContainer {
    color: #fff;
    margin-bottom: 32px;
  }
  .zenzaSettingPanel .filterEditContainer.forGuest {
    padding: 8px;
  }
  .zenzaSettingPanel .filterEditContainer p {
    color: #fff;
    font-size: 120%;
  }

  .zenzaSettingPanel .filterEditContainer .info {
    color: #ccc;
    font-size: 90%;
    display: inline-block;
    margin: 8px 0;
  }

  .zenzaSettingPanel .filterEdit {
    background: #000;
    color: #ccc;
    width: 90%;
    margin: 0 5%;
    min-height: 150px;
    white-space: pre;
  }

  .zenzaSettingPanel .fontEdit .info {
    color: #ccc;
    font-size: 90%;
    display: inline-block;
    margin: 8px 0;
  }

  .zenzaSettingPanel .fontEdit p {
    color: #fff;
    font-size: 120%;
  }

  .zenzaSettingPanel input[type=text] {
    font-size: 24px;
    background: #000;
    color: #ccc;
    width: 90%;
    margin: 0 5%;
    border-radius: 8px;
  }
  .zenzaSettingPanel select {
    font-size:24px;
    background: #000;
    color: #ccc;
    margin: 0 5%;
    border-radius: 8px;
    }

  .zenzaSettingPanel .import-export {
    padding: 8px;
    text-align: center;
  }

  .zenzaSettingPanel .export-config-button {
    display: inline-block;
  }

  .zenzaSettingPanel  .import-config-file-select {
    position: absolute;
    text-indent: -9999px;
    width: 160px;
    padding: 8px;
    opacity: 0;
    cursor: pointer;
  }

  .zenzaSettingPanel  .import-config-file-select-label {
    pointer-events: none;
    user-select: none;
  }
  .zenzaSettingPanel .import-config-file-select-label,
  .zenzaSettingPanel .export-config-button {
    display: inline-block;
    width: 160px;
    padding: 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    color: #000;
    background: #ccc;
    border: 0;
  }
  `).trim();

SettingPanel.__tpl__ = (`
  <div class="zenzaSettingPanel" tabindex="0">
    <div class="settingPanelInner">
      <p class="caption">プレイヤーの設定</p>
      <div class="autoPlayControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="autoPlay">
          自動で再生する
        </label>
      </div>

      <div class="enableTogglePlayOnClickControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableTogglePlayOnClick">
          画面クリックで再生/一時停止
        </label>
      </div>

      <div class="autoFullScreenControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="autoFullScreen">
          自動でフルスクリーンにする
          <small>(singletonモードでは使えません)</small>
        </label>
      </div>

      <div class="enableSingleton control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableSingleton">
          ZenzaWatchを起動してるタブがあればそちらで開く<br>
          <smal>(singletonモード)</small>
        </label>
      </div>

      <div class="enableHeatMapControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableHeatMap">
          コメントの盛り上がりをシークバーに表示
        </label>
      </div>

      <div class="overrideGinzaControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="overrideGinza">
          動画視聴ページでも公式プレイヤーの代わりに起動する
        </label>
      </div>

      <div class="overrideWatchLinkControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="overrideWatchLink">
          [Zen]ボタンなしでZenzaWatchを開く(リロード後に反映)
        </label>
      </div>

      <div class="overrideWatchLinkControl control toggle forPremium">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableStoryboard">
          シークバーにサムネイルを表示 <small>(※ プレミアム)</small>
        </label>
      </div>

      <div class="UaaEnableControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="uaa.enable">
          ニコニ広告の情報を取得する(対応ブラウザのみ)
        </label>
      </div>

      <div class="enableAutoMylistCommentControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableAutoMylistComment">
          マイリストコメントに投稿者名を入れる
        </label>
      </div>

      <div class="autoDisableDmc control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="autoDisableDmc">
          旧システムのほうが画質が良さそうな時は旧システムを使う<br>
          <small>たまに誤爆することがあります (回転情報の含まれる動画など)</small>
        </label>
      </div>

      <div class="enableNicosJumpVideo control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="enableNicosJumpVideo"
          data-command="toggle-enableNicosJumpVideo">
          ＠ジャンプで指定された動画をプレイリストに入れる
        </label>
      </div>

      <div class="enableOnlyRequired control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="video.hls.enableOnlyRequired"
          data-command="toggle-video.hls.enableOnlyRequired">
          HLSが必須の動画だけHLSを使用する (※ HLSが重い環境用)
        </label>
      </div>

      <div class="touchEnable control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="touch.enable"
          data-command="toggle-touchEnable">
          タッチパネルのジェスチャを有効にする
          <smal>(2本指左右シーク・上下で速度変更/3本指で動画切替)</small>
        </label>
      </div>

      <div class="bestZenTube control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="bestZenTube"
          data-command="toggle-bestZenTube">
            ZenTube使用時に最高画質をリクエストする (※ 機能してないかも)
        </label>
      </div>

      <div class="loadLinkedChannelVideoControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="loadLinkedChannelVideo">
          無料期間の切れた動画はdアニメの映像を流す<br>
          <small>(当然ながらdアニメニコニコチャンネル加入が必要)</small>
        </label>
      </div>

      <div class="menuScaleControl control toggle">
        <label>
          <select class="menuScale" data-setting-name="menuScale">
              <option value="0.8">0.8倍</option>
              <option value="1" selected>標準</option>
              <option value="1.2">1.2倍</option>
              <option value="1.5">1.5倍</option>
              <option value="2.0">2倍</option>
          </select>
          ボタンの大きさ(倍率)
          <small>※ 一部レイアウトが崩れます</small>
        </label>
      </div>

      <p class="caption">コメント・フォントの設定</p>
      <div class="fontEdit">

        <div class="autoCommentSpeedRate control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="autoCommentSpeedRate">
            倍速再生でもコメントは速くしない<br>
              <small>※ コメントのレイアウトが一部崩れます</small>
          </label>
        </div>

        <div class="commentSpeedRate control toggle">
          <label>
            <select class="commentSpeedRate" data-setting-name="commentSpeedRate">
                <option value="0.5">0.5倍</option>
                <option value="0.8">0.8倍</option>
                <option value="1" selected>標準</option>
                <option value="1.2">1.2倍</option>
                <option value="1.5">1.5倍</option>
                <option value="2.0"2倍</option>
            </select>
            コメントの速度(倍率)<br>
              <small>※ コメントのレイアウトが一部崩れます</small>
          </label>
        </div>

        <div class="baseFontBolderControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="baseFontBolder">
            フォントを太くする
          </label>
        </div>

        <p>フォント名</p>
        <span class="info">入力例: 「'游ゴシック', 'メイリオ', '戦国TURB'」</span>
        <input type="text" class="textInput"
          data-setting-name="baseFontFamily">

        <p>投稿者コメントの影の色</p>
        <span class="info">※ リロード後に反映</span>
        <input type="text" class="textInput" pattern="(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|^[a-zA-Z]+$)"
          data-setting-name="commentLayer.ownerCommentShadowColor">

        <div class="baseChatScaleControl control toggle">
          <label>
          <select class="baseChatScale" data-setting-name="baseChatScale">
            <option value="0.5">0.5</option>
            <option value="0.6">0.6</option>
            <option value="0.7">0.7</option>
            <option value="0.8">0.8</option>
            <option value="0.9">0.9</option>
            <option value="1"  selected>1.0</option>
            <option value="1.1">1.1</option>
            <option value="1.2">1.2</option>
            <option value="1.3">1.3</option>
            <option value="1.4">1.4</option>
            <option value="1.5">1.5</option>
            <option value="1.6">1.6</option>
            <option value="1.7">1.7</option>
            <option value="1.8">1.8</option>
            <option value="1.9">1.9</option>
            <option value="2.0">2.0</option>
          </select>
          フォントサイズ(倍率)
          </label>
        </div>

        <div class="commentLayerOpacityControl control">
          <label>
          <select class="commentLayerOpacity" data-setting-name="commentLayerOpacity">
            <option value="0.1">90%</option>
            <option value="0.2">80%</option>
            <option value="0.3">70%</option>
            <option value="0.4">60%</option>
            <option value="0.5">50%</option>
            <option value="0.6">40%</option>
            <option value="0.7">30%</option>
            <option value="0.8">20%</option>
            <option value="0.9">10%</option>
            <option value="1" selected>0%</option>
          </select>
          コメントの透明度
          </label>
        </div>

        <div class="commentLayer-textShadowType control">
          <p>コメントの影</p>
          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              value="">
              標準 (軽い)
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              value="shadow-type2">
              縁取り
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              value="shadow-type3">
            ぼかし (重い)
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              value="shadow-stroke">
              縁取り2 (対応ブラウザのみ。やや重い)
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              value="shadow-dokaben">
              ドカベン <s>(飽きたら消します)</s>
          </label>

        </div>

      <div class="backCommentControl control toggle">
        <label>
          <input type="checkbox" class="checkbox" data-setting-name="backComment">
          コメントを動画の後ろに流す
        </label>
      </div>

      </div>

      <p class="caption">NG設定</p>
      <div class="filterEditContainer forGuest">
        設定の変更はログイン中のみ可能です。<br>
        非ログインでも、設定済みの内容は反映されます。
      </div>
      <div class="filterEditContainer forMember">
        <span class="info">
          １行ごとに入力。上限はありませんが、増やしすぎると重くなります。
        </span>
        <p>NGワード</p>
        <textarea
          class="filterEdit wordFilterEdit"
          data-command-name="setWordFilterList"></textarea>
        <p>NGコマンド</p>
        <textarea
          class="filterEdit commandFilterEdit"
          data-command-name="setCommandFilterList"></textarea>
        <p>NGユーザー</p>
        <textarea
          class="filterEdit userIdFilterEdit"
          data-command-name="setUserIdFilterList"></textarea>
      </div>

      <p class="caption">インポート・エクスポート</p>
      <div class="import-export">
        <button class="export-config-button" data-command="export-config">ファイルに保存</button>
        <input type="file" class="import-config-file-select" accept=".json" data-command="nop">
        <div class="import-config-file-select-label">ファイルから読み込む</div>
      </div>
    </div>
  </div>
  `).trim();


//===END===
//

export {
  SettingPanel
};
