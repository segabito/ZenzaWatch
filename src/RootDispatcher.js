import {ZenzaWatch, PRODUCT} from './ZenzaWatchIndex';
import {PopupMessage} from './util';
import {PlayerConfig} from './NicoVideoPlayerDialog';
import {Clipboard} from '../packages/lib/src/dom/Clipboard';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
//===BEGIN===
const RootDispatcher = (() => {
  let config;
  let player;
  let playerState;
  class RootDispatcher {
    static initialize(dialog) {
      player = dialog;
      playerState = ZenzaWatch.state.player;
      config = PlayerConfig.getInstance(config);
      config.on('update', RootDispatcher.onConfigUpdate);
      player.on('command', RootDispatcher.execCommand);
    }

    static execCommand(command, params) {
      let result = {status: 'ok'};
      switch(command) {
        case 'notifyHtml':
          PopupMessage.notify(params, true);
          break;
        case 'notify':
          PopupMessage.notify(params);
          break;
        case 'alert':
          PopupMessage.alert(params);
          break;
        case 'alertHtml':
          PopupMessage.alert(params, true);
          break;
        case 'copy-video-watch-url':
          Clipboard.copyText(playerState.videoInfo.watchUrl);
          break;
        case 'tweet':
          nicoUtil.openTweetWindow(playerState.videoInfo);
          break;
        case 'toggleConfig': {
          config.props[params] = !config.props[params];
          break;
        }
        case 'picture-in-picture':
          document.querySelector('.zenzaWatchVideoElement').requestPictureInPicture();
          break;
        case 'toggle-comment':
        case 'toggle-showComment':
        case 'toggle-backComment':
        case 'toggle-mute':
        case 'toggle-loop':
        case 'toggle-debug':
        case 'toggle-enableFilter':
        case 'toggle-enableNicosJumpVideo':
        case 'toggle-useWellKnownPort':
        case 'toggle-bestZenTube':
        case 'toggle-autoCommentSpeedRate':
        case 'toggle-video.hls.enableOnlyRequired':
          command = command.replace(/^toggle-/, '');
          config.props[command] = !config.props[command];
          break;
        case 'baseFontFamily':
        case 'baseChatScale':
        case 'enableFilter':
        case 'update-enableFilter':
        case 'screenMode':
        case 'update-screenMode':
        case 'update-sharedNgLevel':
        case 'update-commentSpeedRate':
        case 'update-fullscreenControlBarMode':
          command = command.replace(/^update-/, '');
          if (config.props[command] === params) {
            break;
          }
          config.props[command] = params;
          break;

        case 'nop':
          break;
        case 'echo':
          window.console.log('%cECHO', 'font-weight: bold;', {params});
          PopupMessage.notify(`ECHO: 「${typeof params === 'string' ? params : JSON.stringify(params)}」`);
          break;
        default:
          ZenzaWatch.emitter.emit(`command-${command}`, command, params);
          window.dispatchEvent(new CustomEvent(`${PRODUCT}-command`, {detail: {command, params, param: params}}));
      }
      return result;
    }

    static onConfigUpdate(key, value) {
      switch (key) {
        case 'enableFilter':
          playerState.isEnableFilter = value;
          break;
        case 'backComment':
          playerState.isBackComment = !!value;
          break;
        case 'showComment':
          playerState.isShowComment = !!value;
          break;
        case 'loop':
          playerState.isLoop = !!value;
          break;
        case 'mute':
          playerState.isMute = !!value;
          break;
        case 'debug':
          playerState.isDebug = !!value;
          PopupMessage.notify('debug: ' + (value ? 'ON' : 'OFF'));
          break;
        case 'sharedNgLevel':
        case 'screenMode':
        case 'playbackRate':
          playerState[key] = value;
          break;
      }
    }
  }
  return RootDispatcher;
})();
//===END===
export {RootDispatcher};
