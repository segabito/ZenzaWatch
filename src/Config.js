import {Emitter} from './baselib';

const location = {host: 'www.nicovideo.jp'};
const navigator = {};
const window = {console: console};
// let console = window.console;

//===BEGIN===
const Config = (() => {
  const prefix = 'ZenzaWatch_';
  const emitter = new Emitter();

  // 古いprototype.jsが使われているページの対処
  if (window.Prototype && Array.prototype.toJSON) {
    let _json_stringify = JSON.stringify;
    JSON.stringify = value => {
      let toj = Array.prototype.toJSON;
      delete Array.prototype.toJSON;
      let r = _json_stringify(value);
      Array.prototype.toJSON = toj;
      return r;
    };
  }

  // 直接変更する時はコンソールで
  // ZenzaWatch.config.setValue('hogehoge' fugafuga);
  const DEFAULT_CONFIG = {
    debug: false,
    volume: 0.3,
    forceEnable: false,
    showComment: true,
    autoPlay: true,
    'autoPlay:ginza': true,
    loop: false,
    mute: false,
    screenMode: 'normal',
    'screenMode:ginza': 'normal',
    autoFullScreen: false,
    autoCloseFullScreen: true, // 再生終了時に自動でフルスクリーン解除するかどうか
    continueNextPage: false,   // 動画再生中にリロードやページ切り替えしたら続きから開き直す
    backComment: false,        // コメントの裏流し
    autoPauseCommentInput: true, // コメント入力時に自動停止する
    sharedNgLevel: 'MID',      // NG共有の強度 NONE, LOW, MID, HIGH, MAX
    enablePushState: true,     // ブラウザの履歴に乗せる
    enableHeatMap: true,
    enableCommentPreview: false,
    enableAutoMylistComment: false, // マイリストコメントに投稿者を入れる
    menuScale: 1.0,
    enableTogglePlayOnClick: false, // 画面クリック時に再生/一時停止するかどうか
    enableDblclickClose: true, //
    enableFullScreenOnDoubleClick: true,
    enableStoryboard: true, // シークバーサムネイル関連
    enableStoryboardBar: false, // シーンサーチ
    videoInfoPanelTab: 'videoInfoTab',

    forceEconomy: false,
    // NG設定
    enableFilter: true,
    wordFilter: '',
    wordRegFilter: '',
    wordRegFilterFlags: 'i',
    userIdFilter: '',
    commandFilter: '',

    videoTagFilter: '',
    videoOwnerFilter: '',

    enableCommentPanel: true,
    enableCommentPanelAutoScroll: true,

    commentSpeedRate: 1.0,
    autoCommentSpeedRate: false,

    playlistLoop: false,
    commentLanguage: 'ja_JP',

    baseFontFamily: '',
    baseChatScale: 1.0,
    baseFontBolder: true,

    allowOtherDomain: false, // 外部サイトでも実行するかどうか

    overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く

    speakLark: false, // 一発ネタのコメント読み上げ機能. 飽きたら消す
    speakLarkVolume: 1.0, // 一発ネタのコメント読み上げ機能. 飽きたら消す


    // enableCommentLayoutWorker: true, // コメントの配置計算を一部マルチスレッド化(テスト中)

    enableSingleton: false,

    // 無料期間の過ぎた動画と同じのがdアニメにあったら、
    // コメントはそのままに映像だけ持ってくる (当然ながらdアニメ加入は必要)
    loadLinkedChannelVideo: false,

    commentLayerOpacity: 1.0, //
    'commentLayer.textShadowType': '', // フォントの修飾タイプ
    'commentLayer.enableSlotLayoutEmulation': false,

    overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
    enableGinzaSlayer: false, // まだ実験中
    lastPlayerId: '',
    playbackRate: 1.0,
    lastWatchId: 'sm9',
    message: '',

    enableVideoSession: true,
    enableDmc: true, // 新サーバーを使うかどうか
    autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
    dmcVideoQuality: 'auto',   // 優先する画質 auto, veryhigh, high, mid, low
    useWellKnownPort: false,
    'video.hls.enable': true,
    'video.hls.segmentDuration': 5000,

    enableNicosJumpVideo: true, // @ジャンプを有効にするかどうか
    'videoSearch.ownerOnly': true,
    'videoSearch.mode': 'tag',
    'videoSearch.order': 'desc',
    'videoSearch.sort': 'playlist',
    'videoSearch.word': '',

    'uaa.enable': true,

    'screenshot.prefix': '',

    'search.limit': 300, // 検索する最大件数(最大1600) 100件ごとにAPIを叩くので多くするほど遅くなる

    //タッチパネルがある場合は null ない場合は undefined になるらしい
    //うちのデスクトップは無いのに null だが…
    'touch.enable': window.ontouchstart !== undefined,
    'touch.tap2command': '',
    'touch.tap3command': 'toggle-mute',
    'touch.tap4command': 'toggle-showComment',
    'touch.tap5command': 'screenShot',

    autoZenTube: false,
    bestZenTube: false,

    KEY_CLOSE: 27,          // ESC
    KEY_RE_OPEN: 27 + 0x1000, // SHIFT + ESC
    KEY_HOME: 36 + 0x1000, // SHIFT + HOME

    KEY_SEEK_LEFT: 37 + 0x1000, // SHIFT + LEFT
    KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
    KEY_SEEK_LEFT2: 99999999, // カスタマイズ用
    KEY_SEEK_RIGHT2: 99999999, //

    KEY_VOL_UP: 38 + 0x1000, // SHIFT + UP
    KEY_VOL_DOWN: 40 + 0x1000, // SHIFT + DOWN

    KEY_INPUT_COMMENT: 67, // C
    KEY_FULLSCREEN: 70, // F
    KEY_MUTE: 77, // M
    KEY_TOGGLE_COMMENT: 86, // V

    KEY_DEFLIST_ADD: 84,          // T
    KEY_DEFLIST_REMOVE: 84 + 0x1000, // SHIFT + T

    KEY_TOGGLE_PLAY: 32, // SPACE
    KEY_TOGGLE_PLAYLIST: 80, // P

    KEY_SCREEN_MODE_1: 49 + 0x1000, // SHIFT + 1
    KEY_SCREEN_MODE_2: 50 + 0x1000, // SHIFT + 2
    KEY_SCREEN_MODE_3: 51 + 0x1000, // SHIFT + 3
    KEY_SCREEN_MODE_4: 52 + 0x1000, // SHIFT + 4
    KEY_SCREEN_MODE_5: 53 + 0x1000, // SHIFT + 5
    KEY_SCREEN_MODE_6: 54 + 0x1000, // SHIFT + 6

    KEY_SHIFT_RESET: 49, // 1
    KEY_SHIFT_DOWN: 188 + 0x1000, // <
    KEY_SHIFT_UP: 190 + 0x1000, // >

    KEY_NEXT_VIDEO: 74, // J
    KEY_PREV_VIDEO: 75, // K

    KEY_SCREEN_SHOT: 83, // S
    KEY_SCREEN_SHOT_WITH_COMMENT: 83 + 0x1000, // SHIFT + S
  };

  if (navigator &&
    navigator.userAgent &&
    navigator.userAgent.match(/(Android|iPad;|CriOS)/i)) {
    DEFAULT_CONFIG.overrideWatchLink = true;
    DEFAULT_CONFIG.enableTogglePlayOnClick = true;
    DEFAULT_CONFIG.autoFullScreen = true;
    DEFAULT_CONFIG.autoCloseFullScreen = false;
    DEFAULT_CONFIG.volume = 1.0;
    DEFAULT_CONFIG.enableVideoSession = true;
    DEFAULT_CONFIG['uaa.enable'] = false;
  }

  const config = {};
  let noEmit = false;

  Object.keys(DEFAULT_CONFIG).forEach(key => {
    let storageKey = prefix + key;
    if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
      try {
        config[key] = JSON.parse(localStorage.getItem(storageKey));
      } catch (e) {
        window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
        config[key] = DEFAULT_CONFIG[key];
      }
    } else {
      config[key] = DEFAULT_CONFIG[key];
    }
  });

  /**
   * ローカルの設定値をlocalStorageから読み直す
   * 他のウィンドウで書き換えられる可能性のある物を読む前に使う
   */
  emitter.refreshValue = (key) => { //function (key) {
    let storageKey = prefix + key;
    if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
      try {
        config[key] = JSON.parse(localStorage.getItem(storageKey));
      } catch (e) {
        window.console.error('config parse error key:"%s" value:"%s" ', key, localStorage.getItem(storageKey), e);
      }
    }
  };

  emitter.getValue = (key, refresh) => {
    if (refresh) {
      emitter.refreshValue(key);
    }
    return config[key];
  };

  emitter.setValue = function (key, value) {
    if (config[key] !== value && arguments.length >= 2) {
      let storageKey = prefix + key;
      if (location.host === 'www.nicovideo.jp') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
          window.console.error(e);
        }
      }
      config[key] = value;

      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
      if (!noEmit) {
        this.emitAsync('update', key, value);
        this.emitAsync('update-' + key, value);
      }
    }
  };

  /**
   * イベントを投げないで設定変更だけする
   * @deprecated
   * @param {string} key
   * @param value
   */
  emitter.setValueSilently = function (key, value) {
    if (config[key] !== value && arguments.length >= 2) {
      let storageKey = prefix + key;
      if (location.host === 'www.nicovideo.jp') {
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
          window.console.error(e);
        }
      }
      config[key] = value;

      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
    }
  };

  /**
   * @deprecated
   * localStorageに保存しないで、ページをリロードするまでの間だけ書き換え
   */
  emitter.setSessionValue = (key, value) => {
    if (config[key] !== value) {
      config[key] = value;
      console.log('%cconfig update "%s" = "%s"', 'background: cyan', key, value);
      this.emitAsync('update', key, value);
      this.emitAsync('update-' + key, value);
    }
  };

  emitter.exportConfig = () => {
    let result = {};
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      let storageKey = prefix + key;
      if ((localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) &&
        DEFAULT_CONFIG[key] !== emitter.getValue(key)) {
        result[key] = emitter.getValue(key);
      }
    });
    return result;
  };

  emitter.importConfig = (data) => {
    noEmit = true;
    Object.keys(data).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      window.console.log('import config: %s=%s', key, data[key]);
      try {
        emitter.setValue(key, data[key]);
      } catch (e) {
      }
    });
    noEmit = false;
  };

  emitter.clearConfig = () => {
    noEmit = true;
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      if (['message', 'lastPlayerId', 'lastWatchId', 'debug'].includes(key)) {
        return;
      }
      let storageKey = prefix + key;
      try {
        if (localStorage.hasOwnProperty(storageKey) || localStorage[storageKey] !== undefined) {
          localStorage.removeItem(storageKey);
        }
        config[key] = DEFAULT_CONFIG[key];
      } catch (e) {
      }
    });
    noEmit = false;
  };

  emitter.getKeys = () => {
    return Object.keys(DEFAULT_CONFIG);
  };

  emitter.namespace = name => {
    return {
      getValue: (key) => {
        return emitter.getValue(name + '.' + key);
      },
      setValue: (key, value) => {
        emitter.setValue(name + '.' + key, value);
      },
      on: (key, func) => {
        if (key === 'update') {
          emitter.on('update', (key, value) => {
            const pre = name + '.';
            if (key.startsWith(pre)) {
              func(key.replace(pre, ''), value);
            }
          });
        } else {
          key = key.replace(/^update-/, '');
          emitter.on('update-' + name + '.' + key, func);
        }
      }
    };
  };

  return emitter;
})();
//===END===

export {
  Config
};
