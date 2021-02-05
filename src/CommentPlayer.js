import * as _ from 'lodash';
import {global} from './ZenzaWatchIndex';
import {Config, PopupMessage, VideoCaptureUtil} from './util';
import {NicoScripter} from '../packages/zenza/src/commentLayer/NicoScripter';
import {SlotLayoutWorker} from '../packages/zenza/src/commentLayer/SlotLayoutWorker';
import {Emitter} from './baselib';
import {bounce} from '../packages/lib/src/infra/bounce';
import {sleep} from '../packages/lib/src/infra/sleep';

import {CommentLayer} from '../packages/zenza/src/commentLayer/CommentLayer';
import {NicoChatFilter} from '../packages/zenza/src/commentLayer/NicoChatFilter';
import {NicoTextParser} from '../packages/zenza/src/commentLayer/NicoTextParser';
import {NicoChat} from '../packages/zenza/src/commentLayer/NicoChat';
import {NicoChatViewModel} from '../packages/zenza/src/commentLayer/NicoChatViewModel';
import {OffscreenLayer} from '../packages/zenza/src/commentLayer/OffscreenLayer';
import {NicoChatCss3View} from '../packages/zenza/src/commentLayer/NicoChatCss3View';
import {NicoChatGroup} from '../packages/zenza/src/commentLayer/NicoChatGroup';
import {NicoChatGroupViewModel} from '../packages/zenza/src/commentLayer/NicoChatGroupViewModel';
import {NicoComment} from '../packages/zenza/src/commentLayer/NicoComment';
import {NicoCommentViewModel} from '../packages/zenza/src/commentLayer/NicoCommentViewModel';
import {NicoCommentCss3PlayerView} from '../packages/zenza/src/commentLayer/NicoCommentCss3PlayerView';
//===BEGIN===
//@require NicoTextParser
//@require CommentLayer

//@require NicoChat
//@require NicoChatViewModel
//@require NicoChatCss3View
//@require NicoChatFilter

class NicoCommentPlayer extends Emitter {
  constructor(params) {
    super();

    this._model = new NicoComment(params);
    this._viewModel = new NicoCommentViewModel(this._model);
    this._view = new NicoCommentCss3PlayerView({
      viewModel: this._viewModel,
      playbackRate: params.playbackRate,
      show: params.showComment,
      opacity: _.isNumber(params.commentOpacity) ? params.commentOpacity : 1.0
    });

    const onCommentChange = _.throttle(this._onCommentChange.bind(this), 1000);
    this._model.on('change', onCommentChange);
    this._model.on('filterChange', this._onFilterChange.bind(this));
    this._model.on('parsed', this._onCommentParsed.bind(this));
    this._model.on('command', this._onCommand.bind(this));
    global.emitter.on('commentLayoutChange', onCommentChange);

    global.debug.nicoCommentPlayer = this;
    this.emitResolve('GetReady!');
  }
  setComment(data, options) {
    if (typeof data === 'string') {
      if (options.format === 'json') {
        this._model.setData(JSON.parse(data), options);
      } else {
        this._model.setXml(new DOMParser().parseFromString(data, 'text/xml'), options);
      }
    } else if (typeof data.getElementsByTagName === 'function') {
      this._model.setXml(data, options);
    } else {
      this._model.setData(data, options);
    }
  }
  _onCommand(command, param) {
    this.emit('command', command, param);
  }
  _onCommentChange(e) {
    console.log('onCommentChange', e);
    if (this._view) {
      setTimeout(() => this._view.refresh(), 0);
    }
    this.emit('change');
  }
  _onFilterChange(nicoChatFilter) {
    this.emit('filterChange', nicoChatFilter);
  }
  _onCommentParsed() {
    this.emit('parsed');
  }
  getMymemory() {
    if (!this._view) {
      this._view = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel
      });
    }
    return this._view.export();
  }
  set currentTime(sec) {this._model.currentTime=sec;}
  get currentTime() {return this._model.currentTime;}
  set vpos(vpos) {this._model.currentTime=vpos / 100;}
  get vpos() {return this._model.currentTime * 100;}

  setVisibility(v) {
    if (v) {
      this._view.show();
    } else {
      this._view.hide();
    }
  }
  addChat(text, cmd, vpos, options) {
    if (typeof vpos !== 'number') {
      vpos = this.vpos;
    }
    const nicoChat = NicoChat.create(Object.assign({text, cmd, vpos}, options));
    this._model.addChat(nicoChat);

    return nicoChat;
  }
  set playbackRate(v) {
    if (this._view) {
      this._view.playbackRate = v;
    }
  }
  get playbackRate() {
    if (this._view) { return this._view.playbackRate; }
    return 1;
  }
  setAspectRatio(ratio) {
    this._view.setAspectRatio(ratio);
  }
  appendTo(node) {
    this._view.appendTo(node);
  }
  show() {
    this._view.show();
  }
  hide() {
    this._view.hide();
  }
  close() {
    this._model.clear();
    if (this._view) {
      this._view.clear();
    }
  }
  /**
   * @returns {NicoChatFilter}
   */
  get filter() {return this._model.filter;}
  // getChatList() {return this._model.getChatList();}
  get chatList() {return this._model.chatList;}
  /**
   * NGフィルタなどのかかってない全chatを返す
   */
  get nonfilteredChatList() {return this._model.nonfilteredChatList;}
  // getNonfilteredChatList() {return this._model.getNonfilteredChatList();}
  export() {
    return this._viewModel.export();
  }
  getCurrentScreenHtml() {
    return this._view.getCurrentScreenHtml();
  }
}

//@require NicoComment
//@require OffscreenLayer
NicoComment.offscreenLayer = OffscreenLayer(Config);
//@require NicoCommentViewModel
//@require NicoChatGroup
//@require NicoChatGroupViewModel


const updateSpeedRate = () => {
  let rate = Config.props.commentSpeedRate * 1;
  if (Config.props.autoCommentSpeedRate) {
    rate = rate / Math.max(Config.props.playbackRate, 1);
  }
  // window.console.info('updateSpeedRate', rate, Config.getValue('commentSpeedRate'), NicoChatViewModel.SPEED_RATE);
  if (rate !== NicoChatViewModel.SPEED_RATE) {
    NicoChatViewModel.SPEED_RATE = rate;
    NicoChatViewModel.emitter.emit('updateCommentSpeedRate', rate);
  }
};
Config.onkey('commentSpeedRate', updateSpeedRate);
Config.onkey('autoCommentSpeedRate', updateSpeedRate);
Config.onkey('playbackRate', updateSpeedRate);
updateSpeedRate();


//@require NicoCommentCss3PlayerView

Object.assign(global.debug, {
  NicoChat,
  NicoChatViewModel
});
//===END===

export {
  NicoCommentPlayer,
  NicoComment,
  NicoCommentViewModel,
  NicoChatGroup,
  NicoChatGroupViewModel,
  NicoChat,
  NicoChatViewModel,
  NicoCommentCss3PlayerView,
  NicoChatFilter
};
