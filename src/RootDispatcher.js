import {ZenzaWatch} from './ZenzaWatchIndex';
import {PopupMessage} from './util';
import {PlayerConfig} from './NicoVideoPlayerDialog';
import {util} from './util';
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

    static execCommand(command, param) {
      switch(command) {
        case 'notifyHtml':
          PopupMessage.notify(param, true);
          break;
        case 'notify':
          PopupMessage.notify(param);
          break;
        case 'alert':
          PopupMessage.alert(param);
          break;
        case 'alertHtml':
          PopupMessage.alert(param, true);
          break;
        case 'copy-video-watch-url':
          util.copyToClipBoard(playerState.videoInfo.watchUrl);
          break;
        case 'tweet':
          util.openTweetWindow(playerState.videoInfo);
          break;
        case 'toggleConfig': {
          let v = config.getValue(param);
          config.setValue(param, !v);
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
          command = command.replace(/^toggle-/, '');
          config.setValue(command, !config.getValue(command));
          break;
        case 'baseFontFamily':
        case 'baseChatScale':
        case 'enableFilter':
        case 'update-enableFilter':
        case 'screenMode':
        case 'update-screenMode':
        case 'update-sharedNgLevel':
        case 'update-commentSpeedRate':
          command = command.replace(/^update-/, '');
          if (config.getValue(command) === param) {
            break;
          }
          config.setValue(command, param);
          break;

        case 'nop':
          break;
        default:
          ZenzaWatch.emitter.emit(`command-${command}`, command, param);
          window.dispatchEvent(new CustomEvent(`${PRODUCT}-command`, {detail: {command, param}}));
      }
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
