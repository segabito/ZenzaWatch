
import { DialogElement } from './DialogElement.js';
import { domEvent } from '../../../lib/src/dom/domEvent';
// import {textUtil} from '../../../lib/src/text/textUtil';
// import {cssUtil} from '../../../lib/src/css/css';
const dll = {};
//===BEGIN===



const {SettingPanelElement} = (() => {

  class SettingPanelElement extends DialogElement {

    static get defaultState() {
      return {
        isOpen: false,
        revision: 0
      };
    }

    static getPlayerSettingMenu(html, conf) {
      return html`
        <details class="player-setting">
        <summary>プレイヤーの設定</summary>
        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="autoPlay"
              ?checked=${conf.autoPlay}>
              自動で再生する
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
            data-setting-name="enableTogglePlayOnClick"
              ?checked=${conf.enableTogglePlayOnClick}>
              画面クリックで再生/一時停止
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="autoFullScreen"
              ?checked=${conf.autoFullScreen}>
              自動でフルスクリーンにする
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="enableSingleton"
              ?checked=${conf.enableSingleton}>
              ZenzaWatchを起動してるタブがあればそちらで開く<br>
              <smal>(singletonモード)</small>
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="enableHeatMap"
              ?checked=${conf.enableHeatMap}>
              コメントの盛り上がりをシークバーに表示
          </label>
        </div>
        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="overrideGinza"
              ?checked=${conf.overrideGinza}>
              動画視聴ページでも公式プレイヤーの代わりに起動する
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="overrideWatchLink"
              ?checked=${conf.overrideWatchLink}>
              [Zen]ボタンなしでZenzaWatchを開く(リロード後に反映)
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="enableStoryboard"
              ?checked=${conf.enableStoryboard}>
              シークバーにサムネイルを表示 <small>(※ プレミアム)</small>
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="uaa.enable"
              ?checked=${conf['uaa.enable']}>
              ニコニ広告の情報を取得する(対応ブラウザのみ)
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="enableAutoMylistComment"
              ?checked=${conf.enableAutoMylistComment}>
              マイリストコメントに投稿者名を入れる
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="autoDisableDmc"
              ?checked=${conf.autoDisableDmc}>
              旧システムのほうが画質が良さそうな時は旧システムを使う<br>
              <small>たまに誤爆することがあります (回転情報の含まれる動画など)</small>
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="enableNicosJumpVideo"
              ?checked=${conf.enableNicosJumpVideo}
              data-command="toggle-enableNicosJumpVideo">
              ＠ジャンプで指定された動画をプレイリストに入れる
          </label>
        </div>

        <div class="enableOnlyRequired control toggle">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="video.hls.enableOnlyRequired"
              ?checked=${conf.video.hls.enableOnlyRequired}
              data-command="toggle-video.hls.enableOnlyRequired">
              HLSが必須の動画だけHLSを使用する (※ HLSが重い環境用)
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="touch.enable"
            data-command="toggle-touchEnable"
            ?checked=${conf.touch.enable}>
              タッチパネルのジェスチャを有効にする
              <smal>(2本指左右シーク・上下で速度変更/3本指で動画切替)</small>
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="bestZenTube"
              ?checked=${conf.bestZenTube}
              data-command="toggle-bestZenTube">
              ZenTube使用時に最高画質をリクエストする (※ 機能してないかも)
          </label>
        </div>

        <div class="control">
          <label>
            <input type="checkbox" class="checkbox"
              data-setting-name="loadLinkedChannelVideo"
              ?checked=${conf.loadLinkedChannelVideo}>
              無料期間の切れた動画はdアニメの映像を流す<br>
              <small>(当然ながらdアニメニコニコチャンネル加入が必要)</small>
          </label>
        </div>

        <div class="control">
          <label>
            <select class="menuScale" data-setting-name="menuScale" data-type="number">
              <option value="0.8" ?selected=${conf.menuScale == 0.8}>0.8倍</option>
              <option value="1"   ?selected=${conf.menuScale == 1}>標準</option>
              <option value="1.2" ?selected=${conf.menuScale == 1.2}>1.2倍</option>
              <option value="1.5" ?selected=${conf.menuScale == 1.5}>1.5倍</option>
              <option value="2.0" ?selected=${conf.menuScale == 2}>2倍</option>
            </select>
            ボタンの大きさ(倍率)
            <small>※ 一部レイアウトが崩れます</small>
          </label>
        </div>
      </div>
      `;
    }
    static getCommentSettingMenu(html, conf) {
      return html`
        <details class="comment-setting">
        <summary>コメント・フォントの設定</summary>
          <div class="control">
            <label>
              <input type="checkbox" class="checkbox"
                data-setting-name="autoCommentSpeedRate"
                ?checked=${conf.autoCommentSpeedRate}>
                倍速再生でもコメントは速くしない
                <small>※ コメントのレイアウトが一部崩れます</small>
            </label>
          </div>
          <div class="control">
            <label>
              <input type="checkbox" class="checkbox"
                data-setting-name="backComment"
                ?checked=${conf.backComment}>
                コメントを動画の後ろに流す
            </label>
          </div>
          <div class="control">
            <label>
              <input type="checkbox" class="checkbox"
                data-setting-name="baseFontBolder"
                ?checked=${conf.baseFontBolder}>
                フォントを太くする
            </label>
          </div>

        <div class="control">
          <label>
            <select class="commentSpeedRate"
              data-setting-name="commentSpeedRate" data-type="number">
                <option value="0.5" ?selected=${conf.commentSpeedRate==0.5}>0.5倍</option>
                <option value="0.8" ?selected=${conf.commentSpeedRate==0.8}>0.8倍</option>
                <option value="1"   ?selected=${conf.commentSpeedRate==1}>標準</option>
                <option value="1.2" ?selected=${conf.commentSpeedRate==1.2}>1.2倍</option>
                <option value="1.5" ?selected=${conf.commentSpeedRate==1.5}>1.5倍</option>
                <option value="2.0" ?selected=${conf.commentSpeedRate==2.0}>2倍</option>
            </select>
            コメントの速度(倍率)
              <small>※ コメントのレイアウトが一部崩れます</small>
          </label>
        </div>

        <div class="control">
          <h3>フォント名</h3>
          <label>
          <span class="info">入力例: 「'游ゴシック', 'メイリオ', '戦国TURB'」</span>
            <input type="text" class="textInput" value=${conf.baseFontFamily}
              data-setting-name="baseFontFamily">
          </label>
        </div>
        <div class="control">
          <h3>投稿者コメントの影の色</h3>
          <label>
          <span class="info">※ リロード後に反映</span>
          <input type="text" class="textInput"
            pattern="(#[0-9A-Fa-f]{3}|#[0-9A-Fa-f]{6}|^[a-zA-Z]+$)"
            data-setting-name="commentLayer.ownerCommentShadowColor"
            value=${conf.commentLayer.ownerCommentShadowColor}
            >
          </label>
        </div>

        <div class="control">
          <label>
            フォントサイズ(倍率)
            <input type="number" value=${conf.baseChatScale}
              min="0.5" max="2.0" step="0.1"
              data-setting-name="baseChatScale" data-type="number"
            >
          </label>
        </div>

        <div class="control">
          <label>
            コメントの透明度
            <input type="range" value=${conf.commentLayerOpacity}
              min="0.1" max="1.0" step="0.1"
              data-setting-name="commentLayerOpacity" data-type="number"
            >
          </label>
          <label>
            かんたんコメント
            <input type="range" value=${conf.commentLayer.easyCommentOpacity}
              min="0.1" max="1.0" step="0.1"
              data-setting-name="commentLayer.easyCommentOpacity" data-type="number"
            >
          </label>
        </div>

        <div class="control">
          <h3>コメントの影</h3>
          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              ?checked=${conf.commentLayer.textShadowType==''}
              value="">
              標準 (軽い)
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              ?checked=${conf.commentLayer.textShadowType=='shadow-type2'}
              value="shadow-type2">
              縁取り
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              ?checked=${conf.commentLayer.textShadowType=='shadow-type3'}
              value="shadow-type3">
            ぼかし (重い)
          </label>

          <label>
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              ?checked=${conf.commentLayer.textShadowType=='shadow-stroke'}
              value="shadow-stroke">
              縁取り2 (対応ブラウザのみ。やや重い)
          </label>

          <label style="font-family: 'dokaben_ver2_1' !important;">
            <input type="radio"
              name="textShadowType"
              data-setting-name="commentLayer.textShadowType"
              ?checked=${conf.commentLayer.textShadowType=='shadow-dokaben'}
              value="shadow-dokaben">
              ドカベン <s>(飽きたら消します)</s>
          </label>
        </div>
      </details>
      `;
    }
    static getFilterSettingMenu(html, conf) {
      const word    = Array.isArray(conf.wordFilter)    ? conf.wordFilter   .join('\n') : conf.wordFilter;
      const command = Array.isArray(conf.commandFilter) ? conf.commandFilter.join('\n') : conf.commandFilter;
      const userId  = Array.isArray(conf.userIdFilter)  ? conf.userIdFilter .join('\n') : conf.userIdFilter;
      return html`
        <style>
          .filterEdit {
            display: block;
            width: 100%;
            min-height: 100px;
            margin: 0 auto 0;
            color: currentcolor;
          }
        </style>
        <details class="filter-setting">
          <summary>NG・フィルタ設定</summary>
          <div class="control">
            <label>
              <input type="checkbox" class="checkbox"
                data-setting-name="enableFilter"
                ?checked=${conf.enableFilter}>
                NGを有効にする
            </label>
          </div>

          <div class="control">
            <label>
              <input type="checkbox" class="checkbox"
                data-setting-name="removeNgMatchedUser"
                ?checked=${conf.removeNgMatchedUser}>
                コメントがNGにマッチしたら、その発言者のコメントを全て消す
            </label>
          </div>

          <div class="control" style="text-align: center;">
            <h3>NG共有</h3>
            <label class="short">
              <input type="radio"
                name="sharedNgLevel"
                data-setting-name="sharedNgLevel"
                ?checked=${conf.sharedNgLevel=='NONE'}
                value="NONE">
                OFF
            </label>
            <label class="short">
              <input type="radio"
                name="sharedNgLevel"
                data-setting-name="sharedNgLevel"
                ?checked=${conf.sharedNgLevel=='LOW'}
                value="LOW">
                弱
            </label>
            <label class="short">
              <input type="radio"
                name="sharedNgLevel"
                data-setting-name="sharedNgLevel"
                ?checked=${conf.sharedNgLevel=='MID'}
                value="MID">
                中
            </label>
            <label class="short">
              <input type="radio"
                name="sharedNgLevel"
                data-setting-name="sharedNgLevel"
                ?checked=${conf.sharedNgLevel=='HIGH'}
                value="HIGH">
                強
            </label>
            <label class="short">
              <input type="radio"
                name="sharedNgLevel"
                data-setting-name="sharedNgLevel"
                ?checked=${conf.sharedNgLevel=='MAX'}
                value="MAX">
                MAX
            </label>
          </div>



          <div class="control" style="text-align: center;">
            <h3>表示するコメント</h3>
            <label class="short">
              <input type="checkbox"
                data-setting-name="filter.fork0"
                ?checked=${conf.filter.fork0}
                value="">
                通常コメント
            </label>
            <label class="short">
              <input type="checkbox"
                data-setting-name="filter.fork1"
                ?checked=${conf.filter.fork1}
                value="">
                投稿者コメント
            </label>
            <label class="short">
              <input type="checkbox"
                data-setting-name="filter.fork2"
                ?checked=${conf.filter.fork2}
                value="">
                かんたんコメント
            </label>
          </div>
          <div class="control">
            <h3>NGワード</h3>
            <label>
              <textarea
                class="filterEdit"
                data-setting-name="wordFilter" data-type="array"
                >${word}</textarea>
            </label>
            <h3>NGコマンド</h3>
            <label>
              <textarea
                class="filterEdit"
                data-setting-name="commandFilter" data-type="array"
                >${command}</textarea>
            </label>
            <h3>NGユーザー</h3>
            <label>
              <textarea
                class="filterEdit"
                data-setting-name="userIdFilter" data-type="array"
                >${userId}</textarea>
            </label>
          </div>

        </details>
      `;
    }

    static getContentsTemplate(html, state = {}, props = {}, events = {}) {
      const conf = props.config.props;
      return html`
        <style>
          label {
            display: block;
            margin: 8px;
            padding: 8px;
            cursor: pointer;
          }
          label.short {
            display: inline-block;
            min-width: 15%;
          }
          label:hover {
            border-radius: 4px;
            background: rgba(80, 80, 80, 0.3);
          }
          input[type=checkbox], input[type=radio] {
            transform: scale(2);
            margin-right: 8px;
          }
          input[type=text], input[type=number], select {
            border-radius: 4px;
            border: 1px solid currentcolor;
            font-size: 150%;
            padding: 8px;
            background: transparent;
            color: currentcolor;
          }
          input[type=range] {
            width: 70%;
            margin: auto;
            cursor: pointer;
            border-radius: 4px;
            border: 1px solid currentcolor;
          }

          .import-export {
            padding: 8px;
            text-align: center;
            outline: none;
          }

          .export-config-button {
            display: inline-block;
          }

          .import-config-file-select {
            position: absolute;
            text-indent: -9999px;
            width: 160px;
            padding: 8px;
            opacity: 0;
            cursor: pointer;
          }

          .import-config-file-select-label {
            pointer-events: none;
            user-select: none;
          }
          .import-config-file-select-label,
          .export-config-button {
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

        </style>
        <div data-revision="${state.revision}">
          ${this.getPlayerSettingMenu(html, conf)}
          ${this.getCommentSettingMenu(html, conf)}
          ${this.getFilterSettingMenu(html, conf)}

        <details>
          <summary>設定のインポート・エクスポート</summary>
          <div class="import-export">
            <button class="export-config-button" data-command="export-config">ファイルに保存</button>
            <input type="file"
              @change=${events.onImportFileSelect}
              class="import-config-file-select"
              accept=".json"
              data-command="nop">
            <div class="import-config-file-select-label">ファイルから読み込む</div>
          </div>
        </details>
        </div>
      `;
    }

    constructor() {
      super();
      Object.assign(this.events, {
        onChange: this.onChange.bind(this),
        onImportFileSelect: this.onImportFileSelect.bind(this)
      });
    }

    get config() {
      return this.props.config;
    }
    set config(v) {
      this.props.config = v;
      this.state.revision++;
    }

    onUIEvent(e) {
      // console.nicoru('target', e.target.closest('label, input, select, textarea'), e.target);
      if (e.target.closest('label, input, select, textarea') || e.target.tagName === 'SUMMARY') {
        e.stopPropagation();
        return;
      }
      super.onUIEvent(e);
    }

    onChange(e) {
      const elm = ((e.path && e.path[0]) ? e.path[0] : e.target) || {};
      const {settingName, type} = elm.dataset || {};
      if (!settingName) {
        return super.onChange(e);
      }
      let value = elm.value;
      // console.nicoru('onChange',
      //   {settingName, checked: elm.checked, value, type, tagName: elm.tagName}, elm, e);

      if (elm.tagName === 'INPUT' && elm.type === 'checkbox') {
        value = elm.checked;
      } else {
        if (['number', 'boolean', 'json'].includes(type)) {
          value = JSON.parse(value);
        } else if (type === 'array') {
          value = value.split('\n');
        }
      }
      // console.nicoru({settingName, value, type});
      this.config.props[settingName] = value;
      e.stopPropagation();
    }

    onOpen() {
      super.onOpen();
      this.state.revision++;
    }

    async onImportFileSelect(e) {
      e.preventDefault();
      e.stopPropagation();

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
  return {SettingPanelElement};
})();


//===END===

export { SettingPanelElement };
