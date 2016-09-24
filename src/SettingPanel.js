var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

//===BEGIN===

  var SettingPanel = function() { this.initialize.apply(this, arguments); };
  SettingPanel.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaSettingPanelShadow1,
    .zenzaSettingPanelShadow2,
    .zenzaSettingPanel {
      position: absolute;
      left: 50%;
      top: -100vh;
      pointer-events: none;
      transform: translate(-50%, -50%);
      z-index: 170000;
      width: 500px;
      height: 300px;
      color: #fff;
      transition: top 0.4s ease;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      overflow-y: hidden;
    }
    .zenzaSettingPanelShadow1.show,
    .zenzaSettingPanelShadow2.show,
    .zenzaSettingPanel.show {
      opacity: 1;
      top: 50%;
      overflow-y: scroll;
      overflow-x: hidden;
    }

    .zenzaScreenMode_sideView .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_sideView .zenzaSettingPanel.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_small    .zenzaSettingPanel.show {
      position: fixed;
    }
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow1.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow1.show  {
      display: none;
    }
    .zenzaScreenMode_sideView .zenzaSettingPanelShadow2.show,
    .zenzaScreenMode_small    .zenzaSettingPanelShadow2.show {
      background: #006;
      opacity: 0.8;
    }

    .zenzaSettingPanel.show {
      border: 2px outset #fff;
      box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
    }
    .zenzaSettingPanelShadow1,
    .zenzaSettingPanelShadow2 {
      width:  492px;
      height: 292px;
    }

    {* mix-blend-mode使ってみたかっただけ。 飽きたら消す。 *}
    .zenzaSettingPanelShadow1.show {
      background: #88c;
      {*mix-blend-mode: difference;*}
      display: none;
    }
    .zenzaSettingPanelShadow2.show {
      background: #000;
      opacity: 0.8;
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

    .zenzaSettingPanel .control.checked {
    }


    .zenzaSettingPanel .filterEditContainer {
      color: #fff;
      margin-bottom: 32px;
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

  */});
  SettingPanel.__tpl__ = (`
    <!-- mix-blend-mode を使ってみたかっただけのためのレイヤーx2 飽きたら消す -->
    <div class="zenzaSettingPanelShadow1"></div>
    <div class="zenzaSettingPanelShadow2"></div>
    <div class="zenzaSettingPanel">
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
            動画視聴ページでもGINZAのかわりに起動する
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
            <input type="checkbox" class="checkbox" data-setting-name="enableStoryBoard">
            シークバーにサムネイルを表示 (重いかも)
          </label>
        </div>

        <div class="overrideWatchLinkControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableCommentPanel">
            右パネルにコメント一覧を表示 (重いかも)
          </label>
        </div>


        <div class="enableAutoMylistCommentControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableAutoMylistComment">
            マイリストコメントに投稿者名を入れる
          </label>
        </div>


        <div class="enableCommentLayoutWorker control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableCommentLayoutWorker">
            コメント初期化を一部マルチスレッド化(実験中)
          </label>
        </div>

        <div class="enableSingleton control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="enableSingleton">
            ZenzaWatchを起動してるタブがあればそちらで開く
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

        <p class="caption">フォントの設定</p>
        <div class="fontEdit">

          <div class="baseFontBolderControl control toggle">
            <label>
              <input type="checkbox" class="checkbox" data-setting-name="baseFontBolder">
              フォントを太くする
            </label>
          </div>

          <p>フォント名</p>
          <span class="info">入力例: 「'遊ゴシック', 'メイリオ', '戦国TURB'」</span>
          <input type="text" class="textInput"
            data-setting-name="baseFontFamily">

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

        </div>

        <p class="caption">NG設定</p>
        <div class="filterEditContainer">
          <span class="info">
            １行ごとに入力。プレミアム会員に上限はありませんが、増やしすぎると重くなります。
          </span>
          <p>NGワード (一般会員は20まで)</p>
          <textarea
            class="filterEdit wordFilterEdit"
            data-command="setWordFilterList"></textarea>
          <p>NGコマンド (一般会員は10まで)</p>
          <textarea
            class="filterEdit commandFilterEdit"
            data-command="setCommandFilterList"></textarea>
          <p>NGユーザー (一般会員は10まで)</p>
          <textarea
            class="filterEdit userIdFilterEdit"
            data-command="setUserIdFilterList"></textarea>
        </div>

        <!--
        <p class="caption">一発ネタ系(飽きたら消します)</p>
        <div class="speakLarkControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="speakLark">
            コメントの読み上げ(対応ブラウザのみ)
          </label>
        </div>
        <div class="speakLarkVolumeControl control toggle">
          <label>
            <select class="speakLarkVolume" data-setting-name="speakLarkVolume">
              <option value="1.0" selected>100%</option>
              <option value="0.9" selected>90%</option>
              <option value="0.8" selected>80%</option>
              <option value="0.7" selected>70%</option>
              <option value="0.6" selected>60%</option>
              <option value="0.5" selected>50%</option>
              <option value="0.4" selected>40%</option>
              <option value="0.3" selected>30%</option>
              <option value="0.2" selected>20%</option>
              <option value="0.1" selected>10%</option>
            </select>
            読み上げの音量
          </label>
        </div>
        -->

        <!--
        <p class="caption">開発中・テスト中の項目</p>
        <div class="debugControl control toggle">
          <label>
            <input type="checkbox" class="checkbox" data-setting-name="debug">
            デバッグ
          </label>
        </div>
        -->


      </div>
    </div>
  `).trim();
  _.extend(SettingPanel.prototype, AsyncEmitter.prototype);

  _.assign(SettingPanel.prototype, {
    initialize: function(params) {
      this._playerConfig     = params.playerConfig;
      this._$playerContainer = params.$playerContainer;
      this._player           = params.player;

      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
      this._initializeDom();
      this._initializeCommentFilterEdit();
    },
    _initializeDom: function() {
      var $container = this._$playerContainer;
      var config = this._playerConfig;

      ZenzaWatch.util.addStyle(SettingPanel.__css__);
      $container.append(SettingPanel.__tpl__);

      var $panel = this._$panel = $container.find('.zenzaSettingPanel');
      this._$view =
        $container.find('.zenzaSettingPanel, .zenzaSettingPanelShadow1, .zenzaSettingPanelShadow2');
      this._$view.on('click', function(e) {
        e.stopPropagation();
      });
      this._$view.on('wheel', function(e) {
        e.stopPropagation();
      });

      var $check = $panel.find('input[type=checkbox]');
      $check.each(function(i, check) {
        var $c = $(check);
        var settingName = $c.attr('data-setting-name');
        var val = config.getValue(settingName);
        $c.prop('checked', val);
        $c.closest('.control').toggleClass('checked', val);
      });
      $check.on('change', _.bind(this._onToggleItemChange, this));

      var $text = $panel.find('input[type=text]');
      $text.each(function(i, text) {
        var $t = $(text);
        var settingName = $t.attr('data-setting-name');
        var val = config.getValue(settingName);
        $t.val(val);
      });
      $text.on('change', _.bind(this._onInputItemChange, this));

      var $select = $panel.find('select');
      $select.each(function(i, select) {
        var $s = $(select);
        var settingName = $s.attr('data-setting-name');
        var val = config.getValue(settingName);
        $s.val(val);
      });
      $select.on('change', _.bind(this._onInputItemChange, this));


      ZenzaWatch.emitter.on('hideHover', _.bind(function() {
        this.hide();
      }, this));

    },
    _initializeCommentFilterEdit: function() {
      var self = this;
      var config = this._playerConfig;
      var $view = this._$view;
      var $edit          = $view.find('.filterEdit');
      var $wordFilter    = $view.find('.wordFilterEdit');
      var $userIdFilter  = $view.find('.userIdFilterEdit');
      var $commandFilter = $view.find('.commandFilterEdit');
      var map = {
        wordFilter:    $wordFilter,
        userIdFilter:  $userIdFilter,
        commandFilter: $commandFilter
      };

      $edit.on('change', function(e) {
        var $target = $(e.target);
        var command = $target.attr('data-command');
        var value   = $target.val();
        self.emit('command', command, value);
      });

      _.each(Object.keys(map), function(v) {
        var value = config.getValue(v) || [];
        value = _.isArray(value) ? value.join('\n') : value;
        map[v].val(value);
      });

      var onConfigUpdate = function(key, value) {
        if (_.contains(['wordFilter', 'userIdFilter', 'commandFilter'], key)) {
          map[key].val(value.join('\n'));
        }
      };
      config.on('update', onConfigUpdate);
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'mute':
        case 'loop':
        case 'autoPlay':
        case 'enableHeatMap':
        case 'showComment':
        case 'autoFullScreen':
        case 'enableStoryBoard':
        case 'enableCommentPanel':
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

      this._playerConfig.setValue(settingName, val);
    },
    toggle: function(v) {
      var eventName = 'click.ZenzaSettingPanel';
      var $container = this._$playerContainer.off(eventName);
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

//===END===
//

