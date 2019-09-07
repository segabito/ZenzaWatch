// import {PRODUCT} from './ZenzaWatchIndex';
const PRODUCT = 'ZenzaWatch';
import { DataStorage } from '../packages/lib/src/infra/DataStorage';

const location = {host: 'www.nicovideo.jp'};
const navigator = {};
const window = {console: console};
// let console = window.console;

//===BEGIN===
//@require ../packages/lib/src/infra/StorageWriter.js
//@require ../packages/lib/src/infra/objUtil.js
//@require ../packages/lib/src/infra/DataStorage.js
const Config = (() => {
  const DEFAULT_CONFIG = {
    debug: false,
    volume: 0.3,
    forceEnable: false,
    showComment: true,
    autoPlay: true,
    'autoPlay:ginza': true,
    'autoPlay:others': true,
    loop: false,
    mute: false,
    screenMode: 'normal',
    'screenMode:ginza': 'normal',
    'screenMode:others': 'normal',
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
    fullscreenControlBarMode: 'auto', // 'always-show' 'always-hide'


    // forceEconomy: false,
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
    cssFontWeight: 'bold',

    allowOtherDomain: true,

    overrideWatchLink: false, // すべての動画リンクをZenzaWatchで開く
    'overrideWatchLink:others': false, // すべての動画リンクをZenzaWatchで開く

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
    'commentLayer.ownerCommentShadowColor': '#008800', // 投稿者コメントの影の色

    overrideGinza: false,     // 動画視聴ページでもGinzaの代わりに起動する
    enableGinzaSlayer: false, // まだ実験中
    lastPlayerId: '',
    playbackRate: 1.0,
    lastWatchId: 'sm9',
    message: '',

    enableVideoSession: true,
    videoServerType: 'dmc',
    // enableDmc: true, // 新サーバーを使うかどうか
    autoDisableDmc: true, // smileのほうが高画質と思われる動画でdmcを無効にする
    dmcVideoQuality: 'auto',   // 優先する画質 auto, veryhigh, high, mid, low
    smileVideoQuality: 'default', // default eco
    useWellKnownPort: false, // この機能なくなったぽい (常時true相当になった)
    'video.hls.enable': true,
    'video.hls.segmentDuration': 6000,
    'video.hls.enableOnlyRequired': true, // hlsが必須の動画だけ有効化する

    enableNicosJumpVideo: true, // @ジャンプを有効にするかどうか
    'videoSearch.ownerOnly': true,
    'videoSearch.mode': 'tag',
    'videoSearch.order': 'desc',
    'videoSearch.sort': 'playlist',
    'videoSearch.word': '',

    'uaa.enable': true,

    'screenshot.prefix': '', // スクリーンショットのファイル名の先頭につける文字

    'search.limit': 300, // 検索する最大件数(最大1600) 100件ごとにAPIを叩くので多くするほど遅くなる

    //タッチパネルがある場合は null ない場合は undefined になるらしい
    //うちのデスクトップは無いのに null だが…
    'touch.enable': window.ontouchstart !== undefined,
    'touch.tap2command': '',
    'touch.tap3command': 'toggle-mute',
    'touch.tap4command': 'toggle-showComment',
    'touch.tap5command': 'screenShot',

    'navi.favorite': [],
    'navi.playlistButtonMode': 'insert',
    'navi.ownerFilter': false,
    'navi.lastSearchQuery': '',

    autoZenTube: false,
    bestZenTube: false,

    KEY_CLOSE: 27,          // ESC
    KEY_RE_OPEN: 27 + 0x1000, // SHIFT + ESC
    KEY_HOME: 36 + 0x1000, // SHIFT + HOME

    KEY_SEEK_LEFT: 37 + 0x1000, // SHIFT + LEFT
    KEY_SEEK_RIGHT: 39 + 0x1000, // SHIFT + RIGHT
    KEY_SEEK_LEFT2: 99999999, // カスタマイズ用
    KEY_SEEK_RIGHT2: 99999999, //
    // 1/60秒戻る・進む  本当は1コマ単位の移動にしたいが動画のフレームレートを取得できないため
    KEY_SEEK_PREV_FRAME: 188, // ,
    KEY_SEEK_NEXT_FRAME: 190, // .

    KEY_VOL_UP: 38 + 0x1000, // SHIFT + UP
    KEY_VOL_DOWN: 40 + 0x1000, // SHIFT + DOWN

    KEY_INPUT_COMMENT: 67, // C
    KEY_FULLSCREEN: 70, // F
    KEY_MUTE: 77, // M
    KEY_TOGGLE_COMMENT: 86, // V

    KEY_TOGGLE_LOOP: 82, // R 76, // L

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

  return new DataStorage(
    DEFAULT_CONFIG,
    {
      prefix: PRODUCT,
      ignoreExportKeys: ['message', 'lastPlayerId', 'lastWatchId', 'debug'],
      readonly: !location || location.host !== 'www.nicovideo.jp',
      storage: localStorage
    }
  );
})();
Config.exportConfig = () => Config.export();
const NaviConfig = Config;

//===END===


export {
  Config,
  NaviConfig
};
