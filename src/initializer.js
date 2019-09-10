import {ZenzaWatch, global} from './ZenzaWatchIndex';
import {
  Config,
  PlayerSession,
  PlaylistSession,
  util,
  WatchPageHistory
} from './util';
import {NicoComment} from './CommentPlayer';
import {NicoVideoPlayerDialog, PlayerConfig, PlayerState} from './NicoVideoPlayerDialog';
import {initializeGinzaSlayer} from './GinzaSlayer';
import {CONSTANT} from './constant';
import {CustomElements} from '../packages/zenza/src/parts/CustomElements';
import {RootDispatcher} from './RootDispatcher';
import {BroadcastEmitter} from '../packages/lib/src/message/messageUtil';
import {HoverMenu} from '../packages/zenza/src/menu/HoverMenu';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
import {replaceRedirectLinks} from '../packages/zenza/src/init/replaceRedirectLinks';
import {cssUtil} from '../packages/lib/src/css/css';
import {ThumbInfoLoader} from '../packages/lib/src/nico/ThumbInfoLoader';
import {StoryboardWorker} from '../packages/zenza/src/storyboard/StoryboardWorker';
import {VideoSessionWorker} from '../packages/lib/src/nico/VideoSessionWorker';
import {StoryboardCacheDb} from '../packages/lib/src/nico/StoryboardCacheDb';
import {CommentLayoutWorker} from '../packages/zenza/src/commentLayer/CommentLayoutWorker';
import {WatchInfoCacheDb} from '../packages/lib/src/nico/WatchInfoCacheDb';
const START_PAGE_QUERY = 'hoge=fuga';

//===BEGIN===

const {initialize} = (() => {
//@require HoverMenu
  // GINZAを置き換えるべきか？の判定
  const isOverrideGinza = () => {
    // GINZAで視聴のリンクできた場合はfalse
    if (window.name === 'watchGinza') {
      return false;
    }
    // GINZAの代わりに起動する設定、かつZenzaで再生可能な動画はtrue
    // nmmやrtmpeの動画だとfalseになる
    if (Config.props.overrideGinza && nicoUtil.isZenzaPlayableVideo()) {
      return true;
    }

    return false;
  };

  const initWorker = () => {
    // 動画ロード直後に初期化するとつっかかる原因になるのでWorkerだけ作っておく
    if (!location.host.endsWith('.nicovideo.jp')) { return; }
    CommentLayoutWorker.getInstance();
    ThumbInfoLoader.load('sm9');
    window.console.time('init Workers');
    return Promise.all([
      StoryboardWorker.initWorker(),
      VideoSessionWorker.initWorker(),
      StoryboardCacheDb.initWorker(),
      WatchInfoCacheDb.initWorker()
    ]).then(() => window.console.timeEnd('init Workers'));
  };

  const initCssProps = () => {
    cssUtil.registerProps(
      {name: '--trans-x-pp', syntax: '<length-percentage>', initialValue: '0px',inherits: false},
      {name: '--trans-y-pp', syntax: '<length-percentage>', initialValue: '0px',inherits: false},
      {name: '--width-pp',   syntax: '<length-percentage>', initialValue: '0px', inherits: true},
      {name: '--height-pp',  syntax: '<length-percentage>', initialValue: '0px', inherits: true}
    );
  };

//@require replaceRedirectLinks

  const initialize = async function (){
    window.console.log('%cinitialize ZenzaWatch...', 'background: lightgreen; ');
    initCssProps();

    util.dispatchCustomEvent(
      document.body, 'BeforeZenzaWatchInitialize', window.ZenzaWatch, {bubbles: true, composed: true});
    util.addStyle(CONSTANT.COMMON_CSS, {className: 'common'});
    initializeBySite();
    replaceRedirectLinks();

    const query = util.parseQuery(START_PAGE_QUERY);

    await util.$.ready(); // DOMContentLoaded
    const isWatch = util.isGinzaWatchUrl() &&
      (!!document.getElementById('watchAPIDataContainer') ||
        !!document.getElementById('js-initial-watch-data'));

    const hoverMenu = global.debug.hoverMenu = new HoverMenu({playerConfig: Config});

    await Promise.all([NicoComment.offscreenLayer.get(Config), initWorker()]);

    const dialog = initializeDialogPlayer(Config);
    hoverMenu.setPlayer(dialog);

    // watchページか？
    if (isWatch) {
      if (isOverrideGinza()) {
        initializeGinzaSlayer(dialog, query);
      }
      if (window.name === 'watchGinza') {
        window.name = '';
      }
    }

    initializeMessage(dialog);
    WatchPageHistory.initialize(dialog);

    initializeExternal(dialog, Config, hoverMenu);

    if (!isWatch) {
      initializeLastSession(dialog);
    }


    CustomElements.initialize();
    window.ZenzaWatch.ready = true;
    global.emitter.emitAsync('ready');
    global.emitter.emitResolve('init');
    util.dispatchCustomEvent(
      document.body, 'ZenzaWatchInitialize', window.ZenzaWatch, {bubbles: true, composed: true});
  };

  const initializeMessage = player => {
    const config = Config;
    const bcast = BroadcastEmitter;
    /**
     * 複数ウィンドウ間
     * @param {CommandBody} cmd
     * @param {string} type
     * @param {string} sessionId
     */
    const onBroadcastMessage = (cmd, type, sessionId) => {
      const isLast = player.isLastOpenedPlayer;
      const isOpen = player.isOpen;
      // window.console.log('initializeMessage.onBroadcastMessage', {cmd, isLast, isOpen, sessionId});
      const {command, params, requestId, now} = cmd;
      let result;
      const localNow = Date.now();

      if (command === 'hello') {
        window.console.log(
          '%cHELLO! \ntime: %s (%smsec)\nmessage: %s \nfrom: %s\nurl: %s\n', 'font-weight: bold;',
          new Date(params.now).toLocaleString(), localNow - now,
          params.message, params.from, params.url,
          {command, isLast, isOpen});
          result = {status: 'ok'};
      } else if (command  === 'sendExecCommand' &&
          (params.command === 'echo' || (isLast && isOpen))) {
        // window.console.log('execCommand', {params});
        result = player.execCommand(params.command, params.params);
      } else if (command === 'ping' && (params.force || (isLast && isOpen))) {
        window.console.info('pong!');
        result = {status: 'ok'};
      } else if (command === 'pong') {
        result = bcast.emitResolve('ping', params);
      } else if (command  === 'notifyClose' && isOpen) {
        result = player.refreshLastPlayerId();
        return;
      } else if (command ==='pushHistory') {
        const {path, title} = params;
        WatchPageHistory.pushHistoryAgency(path, title);
      } else if (command === 'openVideo' && isLast) {
        const {watchId, query, eventType} = params;
        player.open(watchId, {autoCloseFullScreen: false, query, eventType});
      } else if (command === 'messageResult') {
        if (bcast.hasPromise(params.sessionId)) {
          params.status === 'ok' ?
            bcast.emitResolve(params.sessionId, params) :
            bcast.emitReject(params.sessionId, params);
        }
        return;
      } else {
        return;
      }

      result = result || {status: 'ok'};
      Object.assign(result, {
        playerId: player.getId(),
        title: document.title,
        url: location.href,
        windowId: bcast.windowId,
        sessionId,
        isLast,
        isOpen,
        requestId,
        now: localNow,
        time: localNow - now
      });
      bcast.sendMessage({command: 'messageResult', params: result});
  };
    /**
     * 親子ウィンドウ間
     * @param {CommandBody} cmd
     * @param {string} type
     * @param {string} sessionId
     */
    const onWindowMessage = (cmd, type, sessionId) => {
      const {command, params} = cmd;
      const watchId = cmd.watchId || params.watchId; // 互換のため冗長
      // window.console.log('initializeMessage.onWindowMessage', {message: cmd, type, sessionId});

      if (watchId && command === 'open') {
        if (config.props.enableSingleton) {
          global.external.sendOrOpen(watchId);
        } else {
          player.open(watchId, {economy: Config.props.forceEconomy});
        }
      } else if (watchId && command === 'send') {
        BroadcastEmitter.sendExecCommand({command: 'openVideo', params: watchId});
      }
    };
    /**
     * @param {CommandBody} cmd
     * @param {string} type
     * @param {string} sessionId
     */
    BroadcastEmitter.on('message', (message, type, sessionId) => {
      return type === 'broadcast' ?
        onBroadcastMessage(message, type, sessionId) :
        onWindowMessage(message, type, sessionId);
    });

    player.on('close', () => BroadcastEmitter.notifyClose());
  };

  const initializeExternal = dialog => {
    const command = (command, param) => dialog.execCommand(command, param);

    const open = (watchId, params) => dialog.open(watchId, params);

    // 最後にZenzaWatchを開いたタブに送る
    const send = (watchId, params) => BroadcastEmitter.sendOpen(watchId, params);

    // 最後にZenzaWatchを開いたタブに送る
    // なかったら同じタブで開く. 一見万能だが、pingを投げる都合上ワンテンポ遅れる。
    const sendOrOpen = (watchId, params) => {
      if (dialog.isLastOpenedPlayer) {
        open(watchId, params);
      } else {
        return BroadcastEmitter
          .ping()
          .then(() => send(watchId, params), () => open(watchId, params));
      }
    };

    const importPlaylist = data => PlaylistSession.save(data);

    const exportPlaylist = () => PlaylistSession.restore() || {};

    const sendExecCommand = (command, params) => BroadcastEmitter.sendExecCommand({command, params});

    const sendOrExecCommand = (command, params) => {
      return BroadcastEmitter.ping()
        .then(() => sendExecCommand(command, params),
              () => dialog.execCommand(command, params));
    };

    const playlistAdd = watchId => sendOrExecCommand('playlistAdd', watchId);

    const insertPlaylist = watchId => sendOrExecCommand('playlistInsert', watchId);

    const deflistAdd = ({watchId, description, token}) => {
      const mylistApiLoader = ZenzaWatch.api.MylistApiLoader;
      if (token) {
        mylistApiLoader.setCsrfToken(token);
      }
      return mylistApiLoader.addDeflistItem(watchId, description);
    };

    const deflistRemove = ({watchId, token}) => {
      const mylistApiLoader = ZenzaWatch.api.MylistApiLoader;
      if (token) {
        mylistApiLoader.setCsrfToken(token);
      }
      return mylistApiLoader.removeDeflistItem(watchId);
    };

    const echo = (msg = 'こんにちはこんにちは！') => sendExecCommand('echo', msg);

    Object.assign(ZenzaWatch.external, {
      execCommand: command,
      sendExecCommand,
      sendOrExecCommand,
      open,
      send,
      sendOrOpen,
      deflistAdd,
      deflistRemove,
      hello: BroadcastEmitter.hello,
      ping: BroadcastEmitter.ping,
      echo,
      playlist: {
        add: playlistAdd,
        insert: insertPlaylist,
        import: importPlaylist,
        export: exportPlaylist
      }
    });
    Object.assign(ZenzaWatch.debug, {
      dialog,
      getFrameBodies: () => {
        return Array.from(document.querySelectorAll('.zenzaPlayerContainer iframe')).map(f => f.contentWindow.document.body);
      }
    });
    if (ZenzaWatch !== window.ZenzaWatch) {
      window.ZenzaWatch.external = {
        open,
        sendOrOpen,
        sendOrExecCommand,
        hello: BroadcastEmitter.hello,
        ping: BroadcastEmitter.ping,
        echo,
        playlist: {
          add: playlistAdd,
          insert: insertPlaylist
        }
      };
    }
  };

  const initializeLastSession = dialog => {
    window.addEventListener('beforeunload', () => {
      if (!dialog.isOpen) {
        return;
      }
      PlayerSession.save(dialog.playingStatus);
      dialog.close();
    }, {passive: true});
    PlayerSession.init(sessionStorage);
    let lastSession = PlayerSession.restore();
    let screenMode = Config.props.screenMode;
    if (
      lastSession.playing &&
      (screenMode === 'small' ||
        screenMode === 'sideView' ||
        location.href === lastSession.url ||
        Config.props.continueNextPage
      )
    ) {
      lastSession.eventType = 'session';
      dialog.open(lastSession.watchId, lastSession);
    } else {
      PlayerSession.clear();
    }
  };

  const initializeBySite = () => {
    const hostClass = location.host
      .replace(/^.*\.slack\.com$/, 'slack.com')
      .replace(/\./g, '-');
    document.body.dataset.domain = hostClass;
    util.StyleSwitcher.update({on: `style.domain.${hostClass}`});
  };

  const initializeDialogPlayer = (config, offScreenLayer) => {
    console.log('initializeDialog');
    config = PlayerConfig.getInstance(config);
    const state = PlayerState.getInstance(config);
    ZenzaWatch.state.player = state;
    const dialog = new NicoVideoPlayerDialog({
      offScreenLayer,
      config,
      state
    });
    RootDispatcher.initialize(dialog);
    return dialog;
  };


  return {initialize};
})();


//===END===

export {
  initialize
};
