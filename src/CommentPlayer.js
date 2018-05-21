import * as $ from 'jquery';
import * as _ from 'lodash';
import {ZenzaWatch} from './ZenzaWatchIndex';
import {util, Config, PopupMessage, VideoCaptureUtil} from './util';
import {CommentLayoutWorker} from './CommentLayoutWorker';
import {NicoScripter} from './NicoScripter';
import {NicoTextParser} from './NicoTextParser';
import {SlotLayoutWorker} from './SlotLayoutWorker';
import {Emitter} from './baselib';

//===BEGIN===


// 大百科より
const SHARED_NG_LEVEL = {
  NONE: 'NONE',
  LOW: 'LOW',
  MID: 'MID',
  HIGH: 'HIGH',
  MAX: 'MAX'
};
const SHARED_NG_SCORE = {
  NONE: -99999,//Number.MIN_VALUE,
  LOW: -10000,
  MID: -5000,
  HIGH: -1000,
  MAX: -1
};

const MAX_COMMENT = 10000;

class NicoCommentPlayer extends Emitter {
  constructor(params) {
    super();
    this._offScreen = params.offScreenLayer;

    this._model = new NicoComment(params);
    this._viewModel = new NicoCommentViewModel(this._model, params.offScreenLayer);
    this._view = new NicoCommentCss3PlayerView({
      viewModel: this._viewModel,
      playbackRate: params.playbackRate,
      show: params.showComment,
      opacity: _.isNumber(params.commentOpacity) ? params.commentOpacity : 1.0
    });

    let onCommentChange = _.throttle(this._onCommentChange.bind(this), 1000);
    this._model.on('change', onCommentChange);
    this._model.on('filterChange', this._onFilterChange.bind(this));
    this._model.on('parsed', this._onCommentParsed.bind(this));
    this._model.on('command', this._onCommand.bind(this));
    ZenzaWatch.emitter.on('commentLayoutChange', onCommentChange);

    ZenzaWatch.debug.nicoCommentPlayer = this;
  }
}

_.assign(NicoCommentPlayer.prototype, {
  setComment: function (data, options) {
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
  },
  _onCommand: function (command, param) {
    this.emit('command', command, param);
  },
  _onCommentChange: function (e) {
    console.log('onCommentChange', e);
    if (this._view) {
      setTimeout(() => this._view.refresh(), 0);
    }
    this.emit('change');
  },
  _onFilterChange: function (nicoChatFilter) {
    this.emit('filterChange', nicoChatFilter);
  },
  _onCommentParsed: function () {
    this.emit('parsed');
  },
  getMymemory: function () {
    if (!this._view) {
      this._view = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel
      });
    }
    return this._view.toString();
  },
  setCurrentTime: function (sec) {
    this._model.setCurrentTime(sec);
  },
  setVpos: function (vpos) {
    this._model.setCurrentTime(vpos / 100);
  },
  getCurrentTime: function () {
    return this._model.getCurrentTime();
  },
  getVpos: function () {
    return this._model.getCurrentTime() * 100;
  },
  setVisibility: function (v) {
    if (v) {
      this._view.show();
    } else {
      this._view.hide();
    }
  },
  addChat: function (text, cmd, vpos, options) {
    if (typeof vpos !== 'number') {
      vpos = this.getVpos();
    }
    let nicoChat = NicoChat.create(Object.assign({text, cmd, vpos}, options));
    this._model.addChat(nicoChat);

    return nicoChat;
  },
  setPlaybackRate: function (playbackRate) {
    if (this._view && this._view.setPlaybackRate) {
      this._view.setPlaybackRate(playbackRate);
    }
  },
  setAspectRatio: function (ratio) {
    this._view.setAspectRatio(ratio);
  },
  appendTo: function ($node) {
    this._view.appendTo($node);
  },
  show: function () {
    this._view.show();
  },
  hide: function () {
    this._view.hide();
  },
  close: function () {
    this._model.clear();
    if (this._view) {
      this._view.clear();
    }
  },
  setSharedNgLevel: function (level) {
    this._model.setSharedNgLevel(level);
  },
  getSharedNgLevel: function () {
    return this._model.getSharedNgLevel();
  },
  setIsFilterEnable: function (v) {
    this._model.setIsFilterEnable(v);
  },
  isFilterEnable: function () {
    return this._model.isFilterEnable();
  },
  addWordFilter: function (text) {
    this._model.addWordFilter(text);
  },
  setWordFilterList: function (list) {
    this._model.setWordFilterList(list);
  },
  getWordFilterList: function () {
    return this._model.getWordFilterList();
  },
  setWordRegFilter: function (list) {
    this._model.setWordRegFilter(list);
  },
  addUserIdFilter: function (text) {
    this._model.addUserIdFilter(text);
  },
  setUserIdFilterList: function (list) {
    this._model.setUserIdFilterList(list);
  },
  getUserIdFilterList: function () {
    return this._model.getUserIdFilterList();
  },
  addCommandFilter: function (text) {
    this._model.addCommandFilter(text);
  },
  setCommandFilterList: function (list) {
    this._model.setCommandFilterList(list);
  },
  getCommandFilterList: function () {
    return this._model.getCommandFilterList();
  },
  getChatList: function () {
    return this._model.getChatList();
  },
  /**
   * NGフィルタなどのかかってない全chatを返す
   */
  getNonfilteredChatList: function () {
    return this._model.getNonfilteredChatList();
  },
  toString: function () {
    return this._viewModel.toString();
  },
  getCurrentScreenHtml: function () {
    return this._view.getCurrentScreenHtml();
  }
});


class NicoComment extends Emitter {
  static getMaxCommentsByDuration(duration = 6 * 60 * 60 * 1000) {
    if (duration < 64) { return 100; }
    if (duration < 300) { return 250; }
    if (duration < 600) { return 500; }
    return 1000;
  }

  constructor(params) {
    super();
    this._currentTime = 0;

    params.nicoChatFilter = this._nicoChatFilter = new NicoChatFilter(params);
    this._nicoChatFilter.on('change', this._onFilterChange.bind(this));

    this._topGroup = new NicoChatGroup(this, NicoChat.TYPE.TOP, params);
    this._nakaGroup = new NicoChatGroup(this, NicoChat.TYPE.NAKA, params);
    this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);

    this._nicoScripter = new NicoScripter();
    this._nicoScripter.on('command', (command, param) => {
      this.emit('command', command, param);
    });

    let onChange = _.debounce(this._onChange.bind(this), 100);
    this._topGroup.on('change', onChange);
    this._nakaGroup.on('change', onChange);
    this._bottomGroup.on('change', onChange);
    ZenzaWatch.emitter.on('updateOptionCss', onChange);
  }
}

_.assign(NicoComment.prototype, {
  setXml: function(xml, options) {
    let chatsData = Array.from(xml.getElementsByTagName('chat')).filter(chat => chat.firstChild);
    this.setChats(chatsData, options);
  },
  setData: function(data, options) {
    let chatsData = data.filter(d => d.chat).map(d => {
      return Object.assign({text: d.chat.content || '', cmd: d.chat.mail || ''}, d.chat);
    });
    this.setChats(chatsData, options);
  },
  setChats: function (chatsData, options) {

    this._options = options || {};

    window.console.time('コメントのパース処理');
    let nicoScripter = this._nicoScripter;
    if (!options.append) {
      this._topGroup.reset();
      this._nakaGroup.reset();
      this._bottomGroup.reset();
      nicoScripter.reset();
    }
    const duration = this._duration =
      parseInt(options.duration || 0x7FFFFF);
    let mainThreadId = options.mainThreadId || 0;
    let nicoChats = [];

    let top = [], bottom = [], naka = [];
    let create = options.format !== 'xml' ? NicoChat.create : NicoChat.createFromChatElement;
    for (let i = 0, len = Math.min(chatsData.length, MAX_COMMENT); i < len; i++) {
      let chat = chatsData[i];

      let nicoChat = create(chat, duration, mainThreadId);
      if (nicoChat.isDeleted()) {
        continue;
      }

      if (nicoChat.isNicoScript()) {
        nicoScripter.add(nicoChat);
      }
      nicoChats.push(nicoChat);
    }
    nicoChats =
      new Array(...nicoChats.filter(c => c.isPatissier() && c.getFork() < 1))
        .splice(this.constructor.getMaxCommentsByDuration(duration))
        .concat(...nicoChats.filter(c => !c.isPatissier() || c.getFork() > 0));

    if (options.append) {
      nicoChats = nicoChats.filter(chat => {
        return !this._topGroup.includes(chat) && !this._nakaGroup.includes(chat) && !this._bottomGroup.includes(chat);
      });
    }

    if (_.isObject(options.replacement) && _.size(options.replacement) > 0) {
      window.console.time('コメント置換フィルタ適用');
      this._wordReplacer = this._compileWordReplacer(options.replacement);
      this._preProcessWordReplacement(nicoChats, this._wordReplacer);
      window.console.timeEnd('コメント置換フィルタ適用');
    } else {
      this._wordReplacer = null;
    }

    if (nicoScripter.isExist) {
      window.console.time('ニコスクリプト適用');
      nicoScripter.apply(nicoChats);
      window.console.timeEnd('ニコスクリプト適用');
      const nextVideo = nicoScripter.getNextVideo();
      window.console.info('nextVideo', nextVideo);
      if (nextVideo) {
        this.emitAsync('command', 'nextVideo', nextVideo);
      }
    }

    nicoChats.forEach(nicoChat => {
      let type = nicoChat.getType();
      let group;
      switch (type) {
        case NicoChat.TYPE.TOP:
          group = top;
          break;
        case NicoChat.TYPE.BOTTOM:
          group = bottom;
          break;
        default:
          group = naka;
          break;
      }
      group.push(nicoChat);
    });

    this._topGroup.addChatArray(top);
    this._nakaGroup.addChatArray(naka);
    this._bottomGroup.addChatArray(bottom);

    window.console.timeEnd('コメントのパース処理');
    console.log('chats: ', chatsData.length);
    console.log('top: ', this._topGroup.getNonFilteredMembers().length);
    console.log('naka: ', this._nakaGroup.getNonFilteredMembers().length);
    console.log('bottom: ', this._bottomGroup.getNonFilteredMembers().length);
    this.emit('parsed');
  },

  /**
   * コメント置換器となる関数を生成
   * なにがやりたかったのやら
   */
  _compileWordReplacer(replacement) {
    let func = function (text) {
      return text;
    };

    let makeFullReplacement = function (f, src, dest) {
      return function (text) {
        return f(text.indexOf(src) >= 0 ? dest : text);
      };
    };

    let makeRegReplacement = function (f, src, dest) {
      let reg = new RegExp(util.escapeRegs(src), 'g');
      return function (text) {
        return f(text.replace(reg, dest));
      };
    };

    Object.keys(replacement).forEach(key => {
      if (!key) {
        return;
      }
      let val = replacement[key];
      window.console.log('コメント置換フィルタ: "%s" => "%s"', key, val);

      if (key.charAt(0) === '*') {
        func = makeFullReplacement(func, key.substr(1), val);
      } else {
        func = makeRegReplacement(func, key, val);
      }
    });

    return func;
  },
  /**
   * 投稿者が設定したコメント置換フィルタを適用する
   */
  _preProcessWordReplacement(group, replacementFunc) {
    group.forEach(nicoChat => {
      let text = nicoChat.getText();
      let newText = replacementFunc(text);
      if (text !== newText) {
        nicoChat.setText(newText);
      }
    });
  },
  getChatList: function () {
    return {
      top: this._topGroup.getMembers(),
      naka: this._nakaGroup.getMembers(),
      bottom: this._bottomGroup.getMembers()
    };
  },
  getNonFilteredChatList: function () {
    return {
      top: this._topGroup.getNonFilteredMembers(),
      naka: this._nakaGroup.getNonFilteredMembers(),
      bottom: this._bottomGroup.getNonFilteredMembers()
    };
  },
  addChat: function (nicoChat) {
    if (nicoChat.isDeleted()) {
      return;
    }
    let type = nicoChat.getType();
    if (this._wordReplacer) {
      nicoChat.setText(this._wordReplacer(nicoChat.getText()));
    }

    if (this._nicoScripter.isExist) {
      window.console.time('ニコスクリプト適用');
      this._nicoScripter.apply([nicoChat]);
      window.console.timeEnd('ニコスクリプト適用');
    }

    let group;
    switch (type) {
      case NicoChat.TYPE.TOP:
        group = this._topGroup;
        break;
      case NicoChat.TYPE.BOTTOM:
        group = this._bottomGroup;
        break;
      default:
        group = this._nakaGroup;
        break;
    }

    group.addChat(nicoChat, group);
    this.emit('addChat');
  },
  /**
   * コメントの内容が変化した通知
   * NG設定、フィルタ反映時など
   */
  _onChange: function (e) {
    console.log('NicoComment.onChange: ', e);
    e = e || {};
    let ev = {
      nicoComment: this,
      group: e.group,
      chat: e.chat
    };
    this.emit('change', ev);
  },
  _onFilterChange: function () {
    this.emit('filterChange', this._nicoChatFilter);
  },
  clear: function () {
    this._xml = '';
    this._topGroup.reset();
    this._nakaGroup.reset();
    this._bottomGroup.reset();
    this.emit('clear');
  },
  getCurrentTime: function () {
    return this._currentTime;
  },
  setCurrentTime: function (sec) {
    this._currentTime = sec;

    this._topGroup.setCurrentTime(sec);
    this._nakaGroup.setCurrentTime(sec);
    this._bottomGroup.setCurrentTime(sec);

    this._nicoScripter.currentTime = sec;

    this.emit('currentTime', sec);
  },
  seek: function (time) {
    this.setCurrentTime(time);
  },
  setVpos: function (vpos) {
    this.setCurrentTime(vpos / 100);
  },
  getGroup: function (type) {
    switch (type) {
      case NicoChat.TYPE.TOP:
        return this._topGroup;
      case NicoChat.TYPE.BOTTOM:
        return this._bottomGroup;
      default:
        return this._nakaGroup;
    }
  },
  setSharedNgLevel: function (level) {
    this._nicoChatFilter.setSharedNgLevel(level);
  },
  getSharedNgLevel: function () {
    return this._nicoChatFilter.getSharedNgLevel();
  },
  setIsFilterEnable: function (v) {
    this._nicoChatFilter.setEnable(v);
  },
  isFilterEnable: function () {
    return this._nicoChatFilter.isEnable();
  },
  addWordFilter: function (text) {
    this._nicoChatFilter.addWordFilter(text);
  },
  setWordFilterList: function (list) {
    this._nicoChatFilter.setWordFilterList(list);
  },
  getWordFilterList: function () {
    return this._nicoChatFilter.getWordFilterList();
  },
  setWordRegFilter: function (list) {
    this._nicoChatFilter.setWordRegFilter(list);
  },
  addUserIdFilter: function (text) {
    this._nicoChatFilter.addUserIdFilter(text);
  },
  setUserIdFilterList: function (list) {
    this._nicoChatFilter.setUserIdFilterList(list);
  },
  getUserIdFilterList: function () {
    return this._nicoChatFilter.getUserIdFilterList();
  },
  addCommandFilter: function (text) {
    this._nicoChatFilter.addCommandFilter(text);
  },
  setCommandFilterList: function (list) {
    this._nicoChatFilter.setCommandFilterList(list);
  },
  getCommandFilterList: function () {
    return this._nicoChatFilter.getCommandFilterList();
  },
});

// フォントサイズ計算用の非表示レイヤーを取得
// 変なCSSの影響を受けないように、DOM的に隔離されたiframe内で計算する。
NicoComment.offScreenLayer = (() => {
  let __offscreen_tpl__ = (`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="utf-8">
    <title>CommentLayer</title>
    <style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
    <style type="text/css" id="optionCss">%OPTION_CSS%</style>
    <style type="text/css">

      .nicoChat { visibility: hidden; }
    </style>
    <body>
    <div id="offScreenLayer"
      style="
        width: 4096px;
        height: 384px;
        overflow: visible;
        background: #fff;

        white-space: pre;

    "></div>
    </body></html>
      `).trim();

  let emitter = new Emitter();
  let offScreenFrame;
  let offScreenLayer;
  let textField;
  let optionStyle;
  let config;

  let initializeOptionCss = optionStyle => {
    let update = () => {
      let tmp = [];
      let baseFont = config.getValue('baseFontFamily');
      let inner = optionStyle.innerHTML;
      if (baseFont) {
        baseFont = baseFont.replace(/[;{}*/]/g, '');
        tmp.push(
          [
            '.gothic    {font-family: %BASEFONT%; }\n',
            'han_group {font-family: %BASEFONT%, Arial; }'
          ].join('').replace(/%BASEFONT%/g, baseFont)
        );
      }
      let bolder = config.getValue('baseFontBolder');
      if (!bolder) {
        tmp.push('.nicoChat { font-weight: normal !important; }');
      }
      let newCss = tmp.join('\n');
      if (inner !== newCss) {
        optionStyle.innerHTML = newCss;
        ZenzaWatch.emitter.emit('updateOptionCss', newCss);
      }
    };
    update();
    config.on('update-baseFontFamily', update);
    config.on('update-baseFontBolder', update);
  };

  let initialize = resolve => {
    initialize = _.noop;
    let frame = document.createElement('iframe');
    frame.className = 'offScreenLayer';
    frame.setAttribute('sandbox', 'allow-same-origin');
    document.body.appendChild(frame);
    frame.style.position = 'fixed';
    frame.style.top = '200vw';
    frame.style.left = '200vh';

    offScreenFrame = frame;

    let layer;
    let onload = () => {
      frame.onload = null;

      console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
      createTextField();

      let doc = offScreenFrame.contentWindow.document;
      layer = doc.getElementById('offScreenLayer');
      optionStyle = doc.getElementById('optionCss');
      initializeOptionCss(optionStyle);
      offScreenLayer = {
        getTextField: () => {
          return textField;
        },
        appendChild: elm => {
          layer.appendChild(elm);
        },
        removeChild: elm => {
          layer.removeChild(elm);
        },
        getOptionCss: () => {
          return optionStyle.innerHTML;
        }
      };

      emitter.emit('create', offScreenLayer);
      emitter.clear();

      resolve(offScreenLayer);
    };

    let html = __offscreen_tpl__
      .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
      .replace('%OPTION_CSS%', '');
    if (typeof frame.srcdoc === 'string') {
      frame.onload = onload;
      frame.srcdoc = html;
    } else {
      // MS IE/Edge用
      frame.contentWindow.document.open();
      frame.contentWindow.document.write(html);
      frame.contentWindow.document.close();
      window.setTimeout(onload, 0);
    }
  };

  let getLayer = _config => {
    config = _config;
    return new Promise(resolve => {
      if (offScreenLayer) {
        return resolve(offScreenLayer);
      }

      initialize(resolve);
    });
  };

  let createTextField = () => {
    let layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
    if (!layer) {
      return false;
    }

    let span = document.createElement('span');
    span.className = 'nicoChat';
    let scale = NicoChatViewModel.BASE_SCALE;
    NicoChatViewModel.emitter.on('updateBaseChatScale', v => {
      scale = v;
    });

    textField = {
      setText: text => {
        span.innerHTML = text;
      },
      setType: function (type, size, fontCommand, ver) {
        fontCommand = fontCommand ? `cmd-${fontCommand}` : '';
        span.className = `nicoChat ${type} ${size} ${fontCommand} ${ver}`;
      },
      setFontSizePixel: pixel => {
        span.style.fontSize = `${pixel}px`;
      },
      getOriginalWidth: () => {
        return span.offsetWidth;
      },
      getWidth: () => {
        return span.offsetWidth * scale;
      },
      getOriginalHeight: () => {
        return span.offsetHeight;
      },
      getHeight: () => {
        return span.offsetHeight * scale;
      }
    };

    layer.appendChild(span);

    return span;
  };

  return {
    get: getLayer,
    getOptionCss: function () {
      return optionStyle.innerHTML;
    }
  };
})();


class NicoCommentViewModel extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
}

// この数字はレイアウト計算上の仮想領域の物であり、実際に表示するサイズはview依存
NicoCommentViewModel.SCREEN = {
  WIDTH_INNER: 512,
  WIDTH_FULL_INNER: 640,
  WIDTH_FULL_INNER_HTML5: 684,
  WIDTH: 512 + 32,
  WIDTH_FULL: 640 + 32,
  OUTER_WIDTH_FULL: (640 + 32) * 1.1,
  HEIGHT: 384
};

_.assign(NicoCommentViewModel.prototype, {
  initialize: function (nicoComment, offScreen) {
    this._offScreen = offScreen;

    this._currentTime = 0;
    this._lastUpdate = 0;

    this._topGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
    this._nakaGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA), offScreen);
    this._bottomGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

    let config = Config.namespace('commentLayer');
    if (config.getValue('enableSlotLayoutEmulation')) {
      this._slotLayoutWorker = SlotLayoutWorker.create();
    }
    if (this._slotLayoutWorker) {
      this._slotLayoutWorker.addEventListener('message',
        this._onSlotLayoutWorkerComplete.bind(this));
      this._updateSlotLayout = _.debounce(this._updateSlotLayout.bind(this), 100);
    }

    nicoComment.on('setData', this._onSetData.bind(this));
    nicoComment.on('clear', this._onClear.bind(this));
    nicoComment.on('change', this._onChange.bind(this));
    nicoComment.on('parsed', this._onCommentParsed.bind(this));
    nicoComment.on('currentTime', this._onCurrentTime.bind(this));
  },
  _onSetData: function () {
    this.emit('setData');
  },
  _onClear: function () {
    this._topGroup.reset();
    this._nakaGroup.reset();
    this._bottomGroup.reset();

    this._lastUpdate = Date.now();
    this.emit('clear');
  },
  _onCurrentTime: function (sec) {
    this._currentTime = sec;
    this.emit('currentTime', this._currentTime);
  },
  _onChange: function (e) {
    this._lastUpdate = Date.now();
    this._updateSlotLayout();
    console.log('NicoCommentViewModel.onChange: ', e);
  },
  _onCommentParsed: function () {
    this._lastUpdate = Date.now();
    this._updateSlotLayout();
  },
  _updateSlotLayout: function () {
    if (!this._slotLayoutWorker) {
      return;
    }

    window.console.time('SlotLayoutWorker call');
    this._slotLayoutWorker.postMessage({
      lastUpdate: this._lastUpdate,
      top: this._topGroup.getBulkSlotData(),
      naka: this._nakaGroup.getBulkSlotData(),
      bottom: this._bottomGroup.getBulkSlotData()
    });
  },
  _onSlotLayoutWorkerComplete: function (e) {
    // Workerが処理してる間にスレッドが変更された。
    if (e.data.lastUpdate !== this._lastUpdate) {
      window.console.warn('slotLayoutWorker changed',
        this._lastUpdate, e.data.lastUpdate);
      return;
    }
    //window.console.log('SlotLayoutWorker result', e.data);
    this._topGroup.setBulkSlotData(e.data.top);
    this._nakaGroup.setBulkSlotData(e.data.naka);
    this._bottomGroup.setBulkSlotData(e.data.bottom);
    window.console.timeEnd('SlotLayoutWorker call');
  },
  getCurrentTime: function () {
    return this._currentTime;
  },
  toString: function () {
    let result = [];

    result.push(['<comment ',
      '>'
    ].join(''));

    result.push(this._nakaGroup.toString());
    result.push(this._topGroup.toString());
    result.push(this._bottomGroup.toString());

    result.push('</comment>');
    return result.join('\n');
  },
  getGroup: function (type) {
    switch (type) {
      case NicoChat.TYPE.TOP:
        return this._topGroup;
      case NicoChat.TYPE.BOTTOM:
        return this._bottomGroup;
      default:
        return this._nakaGroup;
    }
  },
  getBulkLayoutData: function () {
    return {
      top: this._topGroup.getBulkLayoutData(),
      naka: this._nakaGroup.getBulkLayoutData(),
      bottom: this._bottomGroup.getBulkLayoutData()
    };
  },
  setBulkLayoutData: function (data) {
    this._topGroup.setBulkLayoutData(data.top);
    this._nakaGroup.setBulkLayoutData(data.naka);
    this._bottomGroup.setBulkLayoutData(data.bottom);
  }
});

class NicoChatGroup extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
}
_.assign(NicoChatGroup.prototype, {
  initialize: function (nicoComment, type, params) {
    this._type = type;

    this._nicoChatFilter = params.nicoChatFilter;
    this._nicoChatFilter.on('change', this._onFilterChange.bind(this));

    this.reset();
  },
  reset: function () {
    this._members = [];
    this._filteredMembers = [];
  },
  addChatArray: function (nicoChatArray) {
    let members = this._members;
    let newMembers = [];
    nicoChatArray.forEach(nicoChat => {
      newMembers.push(nicoChat);
      members.push(nicoChat);
      nicoChat.setGroup(this);
    });

    newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
    if (newMembers.length > 0) {
      this._filteredMembers = this._filteredMembers.concat(newMembers);
      this.emit('addChatArray', newMembers);
    }
  },
  addChat: function (nicoChat) {
    this._members.push(nicoChat);
    nicoChat.setGroup(this);

    if (this._nicoChatFilter.isSafe(nicoChat)) {
      this._filteredMembers.push(nicoChat);
      this.emit('addChat', nicoChat);
    }
  },
  getType: function () {
    return this._type;
  },
  getMembers: function () {
    if (this._filteredMembers.length > 0) {
      return this._filteredMembers;
    }
    let members = this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
    return members;
  },
  getNonFilteredMembers: function () {
    return this._members;
  },
  getCurrentTime: function () {
    return this._currentTime;
  },
  onChange: function (e) {
    console.log('NicoChatGroup.onChange: ', e);
    this._filteredMembers = [];
    this.emit('change', {
      chat: e,
      group: this
    });
  },
  _onFilterChange: function () {
    this._filteredMembers = [];
    this.onChange(null);
  },
  setCurrentTime: function (sec) {
    this._currentTime = sec;
    let m = this._members;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].setCurrentTime(sec);
    }
  },
  setSharedNgLevel: function (level) {
    if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this.onChange(null, this);
    }
  },
  includes: function(nicoChat) {
    let uno = nicoChat.getUniqNo();
    return this._members.find(m => m.getUniqNo() === uno);
  }
});

class NicoChatGroupViewModel {
  constructor(...args) {
    this.initialize(...args);
  }
}

_.assign(NicoChatGroupViewModel.prototype, {
  initialize: function (nicoChatGroup, offScreen) {
    this._nicoChatGroup = nicoChatGroup;
    this._offScreen = offScreen;
    this._members = [];
    this._lastUpdate = 0;

    // メンバーをvposでソートした物. 計算効率改善用
    this._vSortedMembers = [];

    this._initWorker();

    nicoChatGroup.on('addChat', this._onAddChat.bind(this));
    nicoChatGroup.on('addChatArray', this._onAddChatArray.bind(this));
    nicoChatGroup.on('reset', this._onReset.bind(this));
    nicoChatGroup.on('change', this._onChange.bind(this));
    NicoChatViewModel.emitter.on('updateBaseChatScale', this._onChange.bind(this));
    NicoChatViewModel.emitter.on('updateCommentSpeedRate', this._onCommentSpeedRateUpdate.bind(this));

    this.addChatArray(nicoChatGroup.getMembers());
  },
  _initWorker: function () {
    if (this._layoutWorker) {
      this._layoutWorker.removeEventListener('message', this._boundOnCommentLayoutWorkerComplete);
    }
    this._layoutWorker = CommentLayoutWorker.getInstance();

    this._boundOnCommentLayoutWorkerComplete =
      this._boundOnCommentLayoutWorkerComplete || this._onCommentLayoutWorkerComplete.bind(this);

    if (this._layoutWorker) {
      this._layoutWorker.addEventListener('message', this._boundOnCommentLayoutWorkerComplete);
    }
  },
  _onAddChatArray: function (nicoChatArray) {
    this.addChatArray(nicoChatArray);
  },
  _onAddChat: function (nicoChat) {
    this.addChat(nicoChat);
  },
  _onReset: function () {
    this.reset();
  },
  _onChange: function (e) {
    console.log('NicoChatGroupViewModel.onChange: ', e);
    window.console.time('_onChange');
    this.reset();
    this.addChatArray(this._nicoChatGroup.getMembers());
    window.console.timeEnd('_onChange');
  },
  _onCommentLayoutWorkerComplete: function (e) {
    //window.console.info('_onCommentLayoutWorkerComplete', e.data.type, e.data.result);
    // 自分用のデータじゃない
    if (e.data.requestId !== this._workerRequestId) {
      return;
    }
    // Workerが処理してる間にスレッドが変更された。
    if (e.data.lastUpdate !== this._lastUpdate) {
      window.console.warn('group changed', this._lastUpdate, e.data.lastUpdate);
      return;
    }
    this.setBulkLayoutData(e.data.result);
  },
  _execCommentLayoutWorker: function () {
    if (this._members.length < 1) {
      return;
    }
    let type = this._members[0].getType();
    this._workerRequestId = `id:${type}-${Math.random()}`;

    console.log('request worker: ', type);
    this._layoutWorker.postMessage({
      type: type,
      members: this.getBulkLayoutData(),
      lastUpdate: this._lastUpdate,
      requestId: this._workerRequestId
    });
  },
  addChatArray: function (nicoChatArray) {
    for (let i = 0, len = nicoChatArray.length; i < len; i++) {
      let nicoChat = nicoChatArray[i];
      let nc = NicoChatViewModel.create(nicoChat, this._offScreen);
      this._members.push(nc);
    }

    if (this._members.length < 1) {
      return;
    }

    this._lastUpdate = Date.now();

    // if (this._layoutWorker) {
      this._execCommentLayoutWorker();
    // } else {
    //   this._groupCollision();
    // }
  },
  _onCommentSpeedRateUpdate() {
    this.changeSpeed(NicoChatViewModel.SPEED_RATE);
  },
  changeSpeed: function(speedRate = 1) {
    // TODO: y座標と弾幕判定はリセットしないといけない気がする
    this._members.forEach(member => member.recalcBeginEndTiming(speedRate));
    this._execCommentLayoutWorker();
  },
  _groupCollision: function () {
    this._createVSortedMembers();
    let members = this._vSortedMembers;
    for (let i = 0, len = members.length; i < len; i++) {
      let o = members[i];
      this.checkCollision(o);
      o.setIsLayouted(true);
    }
  },
  addChat: function (nicoChat) {
    let timeKey = 'addChat:' + nicoChat.getText();
    window.console.time(timeKey);
    let nc = NicoChatViewModel.create(nicoChat, this._offScreen);

    this._lastUpdate = Date.now();

    // 内部処理効率化の都合上、
    // 自身を追加する前に判定を行っておくこと
    this.checkCollision(nc);
    nc.setIsLayouted(true);

    this._members.push(nc);

    // if (this._layoutWorker) {
    this._execCommentLayoutWorker();
    // } else {
    //   this._createVSortedMembers();
    // }
    window.console.timeEnd(timeKey);
  },
  reset: function () {
    let m = this._members;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].reset();
    }

    this._members = [];
    this._vSortedMembers = [];
    this._lastUpdate = Date.now();
  },
  getCurrentTime: function () {
    return this._nicoChatGroup.getCurrentTime();
  },
  getType: function () {
    return this._nicoChatGroup.getType();
  },
  checkCollision: function (target) {
    if (target.isInvisible()) {
      return;
    }

    let m = this._vSortedMembers;
    let o;
    let beginLeft = target.getBeginLeftTiming();
    for (let i = 0, len = m.length; i < len; i++) {
      o = m[i];

      // 自分よりうしろのメンバーには影響を受けないので処理不要
      if (o === target) {
        return;
      }

      if (beginLeft > o.getEndRightTiming()) {
        continue;
      }


      if (o.checkCollision(target)) {
        target.moveToNextLine(o);

        // ずらした後は再度全チェックするのを忘れずに(再帰)
        if (!target.isOverflow()) {
          this.checkCollision(target);
          return;
        }
      }
    }
  },
  getBulkLayoutData: function () {
    this._createVSortedMembers();
    let m = this._vSortedMembers;
    let result = [];
    for (let i = 0, len = m.length; i < len; i++) {
      result.push(m[i].getBulkLayoutData());
    }
    return result;
  },
  setBulkLayoutData: function (data) {
    let m = this._vSortedMembers;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].setBulkLayoutData(data[i]);
    }
  },
  getBulkSlotData: function () {
    this._createVSortedMembers();
    let m = this._vSortedMembers;
    let result = [];
    for (let i = 0, len = m.length; i < len; i++) {
      let o = m[i];
      result.push({
        id: o.getId(),
        slot: o.getSlot(),
        fork: o.getFork(),
        no: o.getNo(),
        vpos: o.getVpos(),
        begin: o.getInviewTiming(),
        end: o.getEndRightTiming(),
        invisible: o.isInvisible()
      });
    }
    return result;
  },
  setBulkSlotData: function (data) {
    let m = this._vSortedMembers;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].setSlot(data[i].slot);
    }
  },
  /**
   * vposでソートされたメンバーを生成. 計算効率改善用
   */
  _createVSortedMembers: function () {
    this._vSortedMembers = this._members.concat().sort(function (a, b) {
      let av = a.getVpos(), bv = b.getVpos();
      if (av !== bv) {
        return av - bv;
      } else {
        return a.getUniqNo() < b.getUniqNo() ? -1 : 1;
      }
    });
    return this._vSortedMembers;
  },

  getMembers: function () {
    return this._members;
  },

  /**
   * 現時点で表示状態のメンバーのみを返す
   */
  getInViewMembers: function () {
    return this.getInViewMembersBySecond(this.getCurrentTime());
  },

  /**
   * secの時点で表示状態のメンバーのみを返す
   */
  getInViewMembersBySecond: function (sec) {
    // TODO: もっと効率化
    //var maxDuration = NicoChatViewModel.DURATION.NAKA;

    let result = [], m = this._vSortedMembers, len = m.length;
    for (let i = 0; i < len; i++) {
      let chat = m[i]; //, s = m.getBeginLeftTiming();
      //if (sec - s > maxDuration) { break; }
      if (chat.isInViewBySecond(sec)) {
        result.push(chat);
      }
    }
    //console.log('inViewMembers.length: ', result.length, sec);
    return result;
  },
  getInViewMembersByVpos: function (vpos) {
    if (!this._hasLayout) {
      this._layout();
    }
    return this.getInViewMembersBySecond(vpos / 100);
  },
  toString: function () {
    let result = [], m = this._members, len = m.length;

    result.push(['\t<group ',
      'type="', this._nicoChatGroup.getType(), '" ',
      'length="', m.length, '" ',
      '>'
    ].join(''));

    for (let i = 0; i < len; i++) {
      result.push(m[i].toString());
    }

    result.push('\t</group>');
    return result.join('\n');
  }
});


/**
 * コメントの最小単位
 *
 */
class NicoChat {

  static createBlank(options = {}) {
    return Object.assign({
      text: '',
      date: '000000000',
      cmd: '',
      premium: false,
      user_id: '0',
      vpos: 0,
      deleted: '',
      color: '#FFFFFF',
      size: NicoChat.SIZE.MEDIUM,
      type: NicoChat.TYPE.NAKA,
      score: 0,
      no: 0,
      fork: 0,
      isInvisible: false,
      isReverse: false,
      isPatissier: false,
      fontCommand: '',
      commentVer: 'flash',
      currentTime: 0,
      hasDurationSet: false,
      isMine: false,
      isUpdating: false,
      thread: 0
    }, options);
  }

  static create(data, ...options) {
    return new NicoChat(NicoChat.createBlank(data), ...options);
  }

  static createFromChatElement(elm, ...options) {
    let data = {
      text: elm.textContent,
      date: parseInt(elm.getAttribute('date'), 10) || Math.floor(Date.now() / 1000),
      cmd: elm.getAttribute('mail') || '',
      isPremium: elm.getAttribute('premium') === '1',
      userId: elm.getAttribute('user_id'),
      vpos: parseInt(elm.getAttribute('vpos'), 10),
      deleted: elm.getAttribute('deleted') === '1',
      isMine: elm.getAttribute('mine') === '1',
      isUpdating: elm.getAttribute('updating') === '1',
      score: parseInt(elm.getAttribute('score') || '0', 10),
      fork: parseInt(elm.getAttribute('fork') || '0', 10),
      leaf: parseInt(elm.getAttribute('leaf') || '-1', 10),
      no: parseInt(elm.getAttribute('no') || '0', 10),
      thread: parseInt(elm.getAttribute('thread'), 10)
    };
    return new NicoChat(data, ...options);
  }


  static parseCmd(cmd, isFork) {
    let tmp = cmd.toLowerCase().split(/[\x20\u3000\t\u2003]+/);
    let result = {};
    tmp.forEach(c => {
      if (NicoChat.COLORS[c]) {
        result.COLOR = NicoChat.COLORS[c];
      } else if (NicoChat._COLOR_MATCH.test(c)) {
        result.COLOR = c;
      } else if (isFork && NicoChat._CMD_DURATION.test(c)) {
        result.duration = RegExp.$1;
      } else {
        result[c] = true;
      }
    });
    return result;
  }


  constructor(data, videoDuration = 0x7FFFFF, mainThreadId = 0) {
    this._id = `chat${NicoChat.id++}`;
    this._currentTime = 0;

    let text = this._text = data.text;

    this._date = data.date;
    //if (this._date >= 1483196400) { // 2017/01/01
    //  this._commentVer = 'html5';
    //} else {
    //  this._commentVer = 'flash';
    //}
    this._cmd = data.cmd;
    this._isPremium = data.premium ? '1' : '0';
    this._userId = data.user_id;
    this._vpos = data.vpos;
    this._deleted = data.deleted;
    this._isMine = data.isMine;
    this._isUpdating = data.isUpdating;
    this._score = data.score;
    this._fork = data.fork * 1;
    this._leaf = data.leaf;
    this._thread = data.thread * 1;
    this._isSubThread = (mainThreadId && this._thread !== mainThreadId);
    this._layerId = typeof data.layerId === 'number' ?
      data.layerId : (/* this._thread * 10 + */ this._fork * 1);
    this._no = data.no;
    this._uniqNo =
      (data.no                 %   10000) +
      (data.fork               *  100000) +
      ((data.thread % 1000000) * 1000000);
    this._color = null;
    this._size = NicoChat.SIZE.MEDIUM;
    this._type = NicoChat.TYPE.NAKA;
    this._duration = NicoChatViewModel.DURATION.NAKA;
    this._commentVer = 'flash';

    if (this._fork > 0 && text.match(/^[/＠@]/)) {
      this._isNicoScript = true;
      this._isInvisible = true;
    }

    if (this._deleted) {
      return;
    }

    let cmd = this._cmd;
    if (cmd.length > 0) {
      let pcmd = this.constructor.parseCmd(cmd, this._fork > 0);

      if (pcmd.COLOR) {
        this._color = pcmd.COLOR;
        this._hasColorCommand = true;
      }

      if (pcmd.big) {
        this._size = NicoChat.SIZE.BIG;
        this._hasSizeCommand = true;
      } else if (pcmd.small) {
        this._size = NicoChat.SIZE.SMALL;
        this._hasSizeCommand = true;
      }

      if (pcmd.ue) {
        this._type = NicoChat.TYPE.TOP;
        this._duration = NicoChatViewModel.DURATION.TOP;
        this._hasTypeCommand = true;
      } else if (pcmd.shita) {
        this._type = NicoChat.TYPE.BOTTOM;
        this._duration = NicoChatViewModel.DURATION.BOTTOM;
        this._hasTypeCommand = true;
      }

      if (pcmd.ender) {
        this._isEnder = true;
      }
      if (pcmd.full) {
        this._isFull = true;
      }
      if (pcmd.pattisier) {
        this._isPatissier = true;
      }

      if (pcmd.duration) {
        this._hasDurationSet = true;
        this._duration = Math.max(0.01, parseFloat(pcmd.duration, 10));
      }

      if (pcmd.mincho) {
        this._fontCommand = 'mincho';
        this._commentVer = 'html5';
      } else if (pcmd.gothic) {
        this._fontCommand = 'gothic';
        this._commentVer = 'html5';
      } else if (pcmd.defont) {
        this._fontCommand = 'defont';
        this._commentVer = 'html5';
      }

    }

    // durationを超える位置にあるコメントを詰める vposはセンチ秒なので気をつけ
    const maxv =
      this._isNicoScript ?
        Math.min(this._vpos, videoDuration * 100) :
        Math.min(this._vpos, (1 + videoDuration - this._duration) * 100);
    const minv = Math.max(maxv, 0);
    this._vpos = minv;
  }

  reset () {
    this._text = '';
    this._date = '000000000';
    this._cmd = '';
    this._isPremium = false;
    this._userId = '';
    this._vpos = 0;
    this._deleted = '';
    this._color = '#FFFFFF';
    this._size = NicoChat.SIZE.MEDIUM;
    this._type = NicoChat.TYPE.NAKA;
    this._isMine = false;
    this._score = 0;
    this._no = 0;
    this._fork = 0;
    this._isInvisible = false;
    this._isReverse = false;
    this._isPatissier = false;
    this._fontCommand = '';
    this._commentVer = 'flash';

    this._currentTime = 0;
    this._hasDurationSet = false;
  }
  setCurrentTime (sec) {
    this._currentTime = sec;
  }
  getCurrentTime () {
    return this._currentTime;
  }
  setGroup (group) {
    this._group = group;
  }
  onChange () {
    if (this._group) {
      this._group.onChange({
        chat: this
      });
    }
  }
  setIsUpdating (v) {
    if (this._isUpdating !== v) {
      this._isUpdating = !!v;
      if (!v) {
        this.onChange();
      }
    }
  }
  setIsPostFail (v) {
    this._isPostFail = v;
  }
  isPostFail () {
    return !!this._isPostFail;
  }
  getId () {
    return this._id;
  }
  getText () {
    return this._text;
  }
  setText (v) {
    this._text = v;
  }
  getDate () {
    return this._date;
  }
  getCmd () {
    return this._cmd;
  }
  isPremium () {
    return !!this._isPremium;
  }
  isEnder () {
    return !!this._isEnder;
  }
  isFull () {
    return !!this._isFull;
  }
  isMine () {
    return !!this._isMine;
  }
  isUpdating () {
    return !!this._isUpdating;
  }
  isInvisible () {
    return this._isInvisible;
  }
  isNicoScript () {
    return this._isNicoScript;
  }
  isPatissier () {
    return this._isPatissier;
  }
  isSubThread() {
    return this._isSubThread;
  }
  hasColorCommand () {
    return !!this._hasColorCommand;
  }
  hasSizeCommand () {
    return !!this._hasSizeCommand;
  }
  hasTypeCommand () {
    return !!this._hasTypeCommand;
  }
  getDuration () {
    return this._duration;
  }
  hasDurationSet () {
    return !!this._hasDurationSet;
  }
  setDuration (v) {
    this._duration = v;
    this._hasDurationSet = true;
  }
  getUserId () {
    return this._userId;
  }
  getVpos () {
    return this._vpos;
  }
  getBeginTime () {
    return this.getVpos() / 100;
  }
  isDeleted () {
    return !!this._deleted;
  }
  getColor () {
    return this._color;
  }
  setColor (v) {
    this._color = v;
  }
  getSize () {
    return this._size;
  }
  setSize (v) {
    this._size = v;
  }
  getType () {
    return this._type;
  }
  setType (v) {
    this._type = v;
  }
  getScore () {
    return this._score;
  }
  getNo () {
    return this._no;
  }
  setNo(no) {
    this._no = no;
    this._uniqNo =
      (no     %  100000) +
      (this._fork   *  1000000) +
      (this._thread * 10000000);
  }
  getUniqNo() {
    return this._uniqNo;
  }
  getLayerId() {
    return this._layerId;
  }
  getLeaf () {
    return this._leaf;
  }
  getFork () {
    return this._fork;
  }
  isReverse () {
    return this._isReverse;
  }
  setIsReverse (v) {
    this._isReverse = !!v;
  }
  getFontCommand () {
    return this._fontCommand;
  }
  getCommentVer () {
    return this._commentVer;
  }
  getThreadId() {
    return this._thread;
  }
}
NicoChat.id = 1000000;

NicoChat.SIZE = {
  BIG: 'big',
  MEDIUM: 'medium',
  SMALL: 'small'
};
NicoChat.TYPE = {
  TOP: 'ue',
  NAKA: 'naka',
  BOTTOM: 'shita'
};

NicoChat._CMD_DURATION = /[@＠]([0-9.]+)/;
NicoChat._CMD_REPLACE = /(ue|shita|sita|big|small|ender|full|[ ])/g;
NicoChat._COLOR_MATCH = /(#[0-9a-f]+)/i;
NicoChat._COLOR_NAME_MATCH = /([a-z]+)/i;
NicoChat.COLORS = {
  'red': '#FF0000',
  'pink': '#FF8080',
  'orange': '#FFC000',
  'yellow': '#FFFF00',
  'green': '#00FF00',
  'cyan': '#00FFFF',
  'blue': '#0000FF',
  'purple': '#C000FF',
  'black': '#000000',

  'white2': '#CCCC99',
  'niconicowhite': '#CCCC99',
  'red2': '#CC0033',
  'truered': '#CC0033',
  'pink2': '#FF33CC',
  'orange2': '#FF6600',
  'passionorange': '#FF6600',
  'yellow2': '#999900',
  'madyellow': '#999900',
  'green2': '#00CC66',
  'elementalgreen': '#00CC66',
  'cyan2': '#00CCCC',
  'blue2': '#3399FF',
  'marineblue': '#3399FF',
  'purple2': '#6633CC',
  'nobleviolet': '#6633CC',
  'black2': '#666666'
};


/**
 * 個別のコメントの表示位置・タイミング計算
 * コメントアート互換は大体こいつにかかっている
 *
 * コメントのサイズ計算まわりが意味不明なコードだらけだが、
 * 仕様書にもない本家のバグを再現しようとするとこうなるので仕方ない。
 * (しかも、これでも全然足りない)
 * 互換性にこだわらないのであれば7割くらいが不要。
 */
class NicoChatViewModel {
  static create(nicoChat, offScreen) {
    if (nicoChat.getCommentVer() === 'html5') {
      return new HTML5NicoChatViewModel(nicoChat, offScreen);

    }
    return new FlashNicoChatViewModel(nicoChat, offScreen);
  }

  constructor(nicoChat, offScreen) {
    this._speedRate = NicoChatViewModel.SPEED_RATE;

    this.initialize(nicoChat, offScreen);

    if (this._height >= NicoCommentViewModel.SCREEN.HEIGHT - this._fontSizePixel / 2) {
      this._isOverflow = true;
    }
    // // line-height は小数点以下切り捨てっぽいのでscaleYで補正する
    let cssLineHeight = this._cssLineHeight;
    this._cssScaleY = cssLineHeight / Math.floor(cssLineHeight);
    this._cssLineHeight = Math.floor(cssLineHeight);

    if (this._isOverflow || nicoChat.isInvisible()) {
      this.checkCollision = () => {
        return false;
      };
    }
  }

  initialize(nicoChat, offScreen) {
    this._nicoChat = nicoChat;
    this._offScreen = offScreen;

    // 画面からはみ出したかどうか(段幕時)
    this._isOverflow = false;
    // 表示時間
    this._duration = nicoChat.getDuration();

    // 固定されたコメントか、流れるコメントか
    this._isFixed = false;

    this._scale = NicoChatViewModel.BASE_SCALE;
    this._cssLineHeight = 29;
    this._cssScaleY = 1;
    this._y = 0;
    this._slot = -1;

    this._setType(nicoChat.getType());

    // ここでbeginLeftTiming, endRightTimingが確定する
    this._setVpos(nicoChat.getVpos());

    this._setSize(nicoChat.getSize(), nicoChat.getCommentVer());


    this._isLayouted = false;

    // 文字を設定
    // この時点で字幕の大きさが確定するので、
    // Z座標・beginRightTiming, endLeftTimingまでが確定する
    this._setText(nicoChat.getText());

    if (this._isFixed) {
      this._setupFixedMode();
    } else {
      this._setupMarqueeMode();
    }
  }

  _setType (type) {
    this._type = type;
    switch (type) {
      case NicoChat.TYPE.TOP:
        this._isFixed = true;
        break;
      case NicoChat.TYPE.BOTTOM:
        this._isFixed = true;
        break;
    }
  }

  _setVpos (vpos) {
    switch (this._type) {
      case NicoChat.TYPE.TOP:
        this._beginLeftTiming = vpos / 100;
        break;
      case NicoChat.TYPE.BOTTOM:
        this._beginLeftTiming = vpos / 100;
        break;
      default:
        this._beginLeftTiming = vpos / 100 - 1;
        break;
    }
    this._endRightTiming = this._beginLeftTiming + this._duration;
  }

  _setSize (size) {
    this._size = size;
    const SIZE_PIXEL = this._nicoChat.getCommentVer() === 'html5' ?
      NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 : NicoChatViewModel.FONT_SIZE_PIXEL;
    switch (size) {
      case NicoChat.SIZE.BIG:
        this._fontSizePixel = SIZE_PIXEL.BIG;
        break;
      case NicoChat.SIZE.SMALL:
        this._fontSizePixel = SIZE_PIXEL.SMALL;
        break;
      default:
        this._fontSizePixel = SIZE_PIXEL.MEDIUM;
        break;
    }
  }

  _setText (text) {

    const fontCommand = this.getFontCommand();
    const commentVer = this.getCommentVer();
    let htmlText =
      commentVer === 'html5' ?
        NicoTextParser.likeHTML5(text) :
        NicoTextParser.likeXP(text);

    this._htmlText = htmlText;
    this._text = text;

    let field = this._offScreen.getTextField();
    field.setText(htmlText);
    field.setFontSizePixel(this._fontSizePixel);
    field.setType(this._type, this._size, fontCommand, this.getCommentVer());

    this._originalWidth = field.getOriginalWidth();
    this._width = this._originalWidth * this._scale;
    this._originalHeight = field.getOriginalHeight();
    this._height = this._calculateHeight({});

    // Chrome59で起こる謎の現象。一度ローカル変数に落とすと直る
    // w を使わずにspwを計算するとNaNになる。謎
    let w = this._width;
    let speed;
    let duration = this._duration / this._speedRate;
    if (!this._isFixed) { // 流れるコメント (naka)
      speed =
        this._speed = (w + NicoCommentViewModel.SCREEN.WIDTH) / duration;
      let spw = w / speed;
      this._endLeftTiming = this._endRightTiming - spw;
      this._beginRightTiming = this._beginLeftTiming + spw;
    } else { // ue shita などの固定コメント
      this._speed = 0;
      this._endLeftTiming = this._endRightTiming;
      this._beginRightTiming = this._beginLeftTiming;
    }
  }

  recalcBeginEndTiming(speedRate = 1) {
    let width = this._width;
    let duration = this._duration / speedRate;
    this._endRightTiming = this._beginLeftTiming + duration;
    this._speedRate = speedRate;
    if (isNaN(width)) {
      return;
    }
    if (!this._isFixed) {
      let speed =
        this._speed = (width + NicoCommentViewModel.SCREEN.WIDTH) / duration;
      let spw = width / speed;
      this._endLeftTiming = this._endRightTiming - spw;
      this._beginRightTiming = this._beginLeftTiming + spw;
    } else {
      this._speed = 0;
      this._endLeftTiming = this._endRightTiming;
      this._beginRightTiming = this._beginLeftTiming;
    }
  }

  _calcLineHeight({size, scale = 1}) {
    const SIZE = NicoChat.SIZE;
    const MARGIN = 5;
    //const TABLE_HEIGHT = 385;
    scale *= NicoChatViewModel.BASE_SCALE;
    let lineHeight;
    if (scale >= 0.75) {
      switch (size) {
        case SIZE.BIG:
          lineHeight = (50 - MARGIN * scale);
          break;
        case SIZE.SMALL:
          lineHeight = (23 - MARGIN * scale);
          break;
        default:
          lineHeight = (34 - MARGIN * scale);
          break;
      }
    } else {
      switch (size) {
        case SIZE.BIG:
          lineHeight = (387 - MARGIN * scale * 0.5) / 16;
          break;
        case SIZE.SMALL:
          lineHeight = (383 - MARGIN * scale * 0.5) / 38;
          break;
        default:
          lineHeight = (378 - MARGIN * scale * 0.5) / 25;
      }
    }
    return lineHeight;
  }

  _calcDoubleResizedLineHeight({lc = 1, cssScale, size = NicoChat.SIZE.BIG}) {
    const MARGIN = 5;
    // ニコスクリプトだとBIG以外の二重リサイズもあり得る?
    if (size !== NicoChat.SIZE.BIG) {
      return (size === NicoChat.SIZE.MEDIUM ? 24 : 13) + MARGIN;
    }
    // @see https://www37.atwiki.jp/commentart/pages/20.html
    cssScale = typeof cssScale === 'number' ? cssScale : this.getCssScale();
    // 本当は行数ではなく縮小率から計算すべきなのだろうけど
    let lineHeight;
    if (lc <= 9) {
      lineHeight = ((392 / cssScale) - MARGIN) / lc -1;
      // lineHeight = ((392 - MARGIN * cssScale) / cssScale) / lc -1;
    } else if (lc <= 10) {
      lineHeight = ((384 / cssScale) - MARGIN) / lc -1;
    } else if (lc <= 11) {
      lineHeight = ((389 / cssScale) - MARGIN) / lc -1;
    } else if (lc <= 12) {
      lineHeight = ((388 / cssScale) - MARGIN) / lc -1;
    } else if (lc <= 13) {
      lineHeight = ((381 / cssScale) - MARGIN) / lc -1;
    } else {
      lineHeight = ((381 / cssScale) - MARGIN) / 14;
    }
    return lineHeight;
  }

  /**
   * 高さ計算。
   * 改行リサイズなどが起こる場合はそれを反映した結果の高さを返す
   * Flashのほうはだんだん計算を諦めていく
   */
  _calculateHeight ({scale = 1, lc = 0, size, isEnder, isDoubleResized}) {
    lc = lc || this._lineCount;
    isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder();
    isDoubleResized = typeof isDoubleResized === 'boolean' ? isDoubleResized : this.isDoubleResized();
    size = size || this._size;
    const MARGIN = 5;
    const TABLE_HEIGHT = 385;
    let lineHeight;
    scale *= NicoChatViewModel.BASE_SCALE;
    if (isDoubleResized) {
      this._cssLineHeight = this._calcDoubleResizedLineHeight({lc, size});
      return ((this._cssLineHeight - MARGIN) * lc) * scale * 0.5  + MARGIN -1;
    }

    let height;
    lineHeight = this._calcLineHeight({lc, size, scale});
    this._cssLineHeight = lineHeight;
    height = (lineHeight * lc + MARGIN) * scale;
    if (lc === 1) {
      this._isLineResized = false;
      return height - 1;
    }

    if (isEnder || height < TABLE_HEIGHT / 3) {
      this._isLineResized = false;
      return height - 1;
    }
    // 非enderで画面の高さの1/3を超える時は改行リサイズ
    this._isLineResized = true;
    lineHeight = this._calcLineHeight({lc, size, scale: scale * 0.5});
    this._cssLineHeight = lineHeight * 2 -1;
    return (lineHeight * lc + MARGIN) * scale - 1;
  }

  _setupFixedMode () {
    const nicoChat = this._nicoChat;
    const SCREEN = NicoCommentViewModel.SCREEN;
    let ver = nicoChat.getCommentVer();
    let fullWidth = ver === 'html5' ? SCREEN.WIDTH_FULL_INNER_HTML5 : SCREEN.WIDTH_FULL_INNER;
    let screenWidth =
      nicoChat.isFull() ? fullWidth : SCREEN.WIDTH_INNER;
    let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;

    let width = this._width;
    if (this._isLineResized) {
      width = width * 0.5 + 4 * 0.5;
    }

    let isOverflowWidth = width > screenWidth;

    // 臨界幅リサイズ
    // 画面幅よりデカい場合の調整
    if (isOverflowWidth) {
      // 改行リサイズかつ臨界幅リサイズが起こるとき、基準が 画面幅 * 2 になる
      // Flash時代のバグ由来の仕様
      if (this._isLineResized) {
        screenWidth *= 2;
        this._isDoubleResized = true;
      }
      this._setScale(screenWidth / width);
    } else {
      this._setScale(1);
    }

    // BOTTOMの時だけy座標を画面の下端に合わせる
    // 内部的には0 originで表示の際に下から詰むだけでもいいような気がしてきた。
    if (this._type === NicoChat.TYPE.BOTTOM) {
      this._y = screenHeight - this._height;
    }
  }

  /**
   *  流れる文字のモード
   */
  _setupMarqueeMode () {
    if (this._isLineResized) {
      let duration = this._duration / this._speedRate;
      this._setScale(this._scale);
      let speed =
        this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / duration;
      this._endLeftTiming = this._endRightTiming - this._width / speed;
      this._beginRightTiming = this._beginLeftTiming + this._width / speed;
    }
  }

  _setScale (scale) {
    this._scale = scale;
    let lsscale = scale * (this._isLineResized ? 0.5 : 1);
    this._height = this._calculateHeight({isDoubleResized: this.isDoubleResized()}) * scale;
    this._width = this._originalWidth * lsscale;
  }

  getBulkLayoutData () {
    return {
      id: this.getId(),
      fork: this.getFork(),
      type: this.getType(),
      isOverflow: this.isOverflow(),
      isInvisible: this.isInvisible(),
      isFixed: this._isFixed,
      ypos: this.getYpos(),
      slot: this.getSlot(),
      height: this.getHeight(),
      beginLeft: this.getBeginLeftTiming(),
      beginRight: this.getBeginRightTiming(),
      endLeft: this.getEndLeftTiming(),
      endRight: this.getEndRightTiming(),
      layerId: this.getLayerId()
    };
  }

  setBulkLayoutData (data) {
    this._isOverflow = data.isOverflow;
    this._y = data.ypos;
    this._isLayouted = true;
  }

  reset () {
  }

  get _lineCount() {
    return (this._htmlText || '').split('<br>').length;
  }

  getId () {
    return this._nicoChat.getId();
  }

  getText () {
    return this._text;
  }

  getHtmlText () {
    return this._htmlText;
  }

  setIsLayouted (v) {
    this._isLayouted = v;
  }

  isInView () {
    return this.isInViewBySecond(this.getCurrentTime());
  }

  isInViewBySecond (sec) {
    if (!this._isLayouted || sec + 1 /* margin */ < this._beginLeftTiming) {
      return false;
    }
    if (sec > this._endRightTiming) {
      return false;
    }
    if (this.isInvisible()) {
      return false;
    }
    return true;
  }

  isOverflow () {
    return this._isOverflow;
  }

  isInvisible () {
    return this._nicoChat.isInvisible();
  }

  getWidth () {
    return this._width;
  }

  getHeight () {
    return this._height;
  }

  getDuration () {
    return this._duration / this._speedRate;
  }

  getSpeed () {
    return this._speed;
  }

  getInviewTiming () {
    return this._beginLeftTiming;
  }
  // 左端が見えるようになるタイミング(4:3規準)
  getBeginLeftTiming () {
    return this._beginLeftTiming;
  }
  // 右端が見えるようになるタイミング(4:3規準)
  getBeginRightTiming () {
    return this._beginRightTiming;
  }
  // 左端が見えなくなるタイミング(4:3規準)
  getEndLeftTiming () {
    return this._endLeftTiming;
  }
  // 右端が見えなくなるタイミング(4:3規準)
  getEndRightTiming () {
    return this._endRightTiming;
  }
  getVpos () {
    return this._nicoChat.getVpos();
  }
  getXpos () {
    return this.getXposBySecond(this.getCurrentTime());
  }
  getYpos () {
    return this._y;
  }
  getSlot () {
    return this._slot;
  }
  setSlot (v) {
    this._slot = v;
  }
  getColor () {
    return this._nicoChat.getColor();
  }
  getSize () {
    return this._nicoChat.getSize();
  }
  getType () {
    return this._nicoChat.getType();
  }
  getCssScale () {
    return this._scale * (this._isLineResized ? 0.5 : 1);
  }
  getFontSizePixel () {
    return this._fontSizePixel;
  }
  getLineHeight () {
    return this._cssLineHeight;
  }
  isLineResized() {
    return this._isLineResized;
  }
  isDoubleResized() {
    return this._isDoubleResized;
  }
  getNo () {
    return this._nicoChat.getNo();
  }
  getUniqNo () {
    return this._nicoChat.getUniqNo();
  }
  getLayerId() {
    return this._nicoChat.getLayerId();
  }
  getFork () {
    return this._nicoChat.getFork();
  }
  /**
   * second時の左端座標を返す
   */
  getXposBySecond (sec) {
    if (this._isFixed) {
      return (NicoCommentViewModel.SCREEN.WIDTH - this._width) / 2;
    } else {
      let diff = sec - this._beginLeftTiming;
      return NicoCommentViewModel.SCREEN.WIDTH + diff * this._speed;
    }
  }
  getXposByVpos (vpos) {
    return this.getXposBySecond(vpos / 100);
  }
  getCurrentTime () {
    return this._nicoChat.getCurrentTime();
  }
  isFull () {
    return this._nicoChat.isFull();
  }
  isNicoScript () {
    return this._nicoChat.isNicoScript();
  }
  isMine () {
    return this._nicoChat.isMine();
  }
  isUpdating () {
    return this._nicoChat.isUpdating();
  }
  isPostFail () {
    return this._nicoChat.isPostFail();
  }
  isReverse () {
    return this._nicoChat.isReverse();
  }
  isSubThread () {
    return this._nicoChat.isSubThread();
  }
  getFontCommand () {
    return this._nicoChat.getFontCommand();
  }
  getCommentVer () {
    return this._nicoChat.getCommentVer();
  }

  getCssScaleY() {
    return this.getCssScale() * this._cssScaleY;
  }

  toString () { // debug用
    // コンソールから
    // ZenzaWatch.debug.getInViewElements()
    // 叩いた時にmeta中に出る奴
    let chat = JSON.stringify({
      width: this.getWidth(),
      height: this.getHeight(),
      scale: this.getCssScale(),
      cmd: this._nicoChat.getCmd(),
      fontSize: this.getFontSizePixel(),
      vpos: this.getVpos(),
      xpos: this.getXpos(),
      ypos: this.getYpos(),
      slot: this.getSlot(),
      type: this.getType(),
      begin: this.getBeginLeftTiming(),
      end: this.getEndRightTiming(),
      speed: this.getSpeed(),
      color: this.getColor(),
      size: this.getSize(),
      duration: this.getDuration(),
      // inView: this.isInView(),

      ender: this._nicoChat.isEnder(),
      full: this._nicoChat.isFull(),
      no: this._nicoChat.getNo(),
      uniqNo: this._nicoChat.getUniqNo(),
      score: this._nicoChat.getScore(),
      userId: this._nicoChat.getUserId(),
      date: this._nicoChat.getDate(),
      fork: this._nicoChat.getFork(),
      layerId: this._nicoChat.getLayerId(),
      ver: this._nicoChat.getCommentVer(),
      lc: this._lineCount,
      ls: this.isLineResized(),
      thread: this._nicoChat.getThreadId(),
      isSub: this._nicoChat.isSubThread(),
      text: this.getText()
    });
    return chat;
  }

  /**
   * コメント同士の衝突を判定
   *
   * @param {NicoChatViewModel} target
   * @return boolean
   */
  checkCollision (target) {
    // 一度はみ出した文字は当たり判定を持たない
    if (this.isOverflow() || target.isOverflow() || target.isInvisible()) {
      return false;
    }

    if (this.getLayerId() !== target.getLayerId()) {
      return false;
    }

    // Y座標が合わないなら絶対衝突しない
    let targetY = target.getYpos();
    let selfY = this.getYpos();
    if (targetY + target.getHeight() < selfY ||
      targetY > selfY + this.getHeight()) {
      return false;
    }

    // ターゲットと自分、どっちが右でどっちが左か？の判定
    let rt, lt;
    if (this.getBeginLeftTiming() <= target.getBeginLeftTiming()) {
      lt = this;
      rt = target;
    } else {
      lt = target;
      rt = this;
    }

    if (this._isFixed) {

      // 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
      // > か >= で挙動が変わるCAがあったりして正解がわからない
      if (lt.getEndRightTiming() > rt.getBeginLeftTiming()) {
        return true;
      }

    } else {

      // 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
      if (lt.getBeginRightTiming() >= rt.getBeginLeftTiming()) {
        return true;
      }

      // 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
      if (lt.getEndRightTiming() >= rt.getEndLeftTiming()) {
        return true;
      }

    }

    return false;
  }

  /**
   * (衝突判定に引っかかったので)自分自身を一段ずらす.
   *
   * @param {NicoChatViewModel} others 示談相手
   */
  moveToNextLine (others) {
    let margin = 1; //NicoChatViewModel.CHAT_MARGIN;
    let othersHeight = others.getHeight() + margin;
    // 本来はちょっとでもオーバーしたらランダムすべきだが、
    // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
    // コメントアートの再現という点では有効な妥協案
    let overflowMargin = 10;
    let rnd = Math.max(0, NicoCommentViewModel.SCREEN.HEIGHT - this._height);
    let yMax = NicoCommentViewModel.SCREEN.HEIGHT - this._height + overflowMargin;
    let yMin = 0 - overflowMargin;

    let type = this._nicoChat.getType();
    let y = this._y;

    if (type !== NicoChat.TYPE.BOTTOM) {
      y += othersHeight;
      // 画面内に入りきらなかったらランダム配置
      if (y > yMax) {
        this._isOverflow = true;
      }
    } else {
      y -= othersHeight;
      // 画面内に入りきらなかったらランダム配置
      if (y < yMin) {
        this._isOverflow = true;
      }
    }

    this._y = this._isOverflow ? Math.floor(Math.random() * rnd) : y;
  }


}
NicoChatViewModel.emitter = new Emitter();

// ここの値はレイアウト計算上の仮想領域の物であり、実際の表示はviewに依存
NicoChatViewModel.DURATION = {
  TOP: 3 - 0.1,
  NAKA: 4,
  BOTTOM: 3 - 0.1
};

NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
NicoChatViewModel.FONT_SIZE_PIXEL = {
  BIG: 39, // 39
  MEDIUM: 24,
  SMALL: 16 //15
};
NicoChatViewModel.FONT_SIZE_PIXEL_VER_HTML5 = {
  BIG: 40 - 1,      // 684 / 17 > x > 684 / 18
  MEDIUM: 27 -1,   // 684 / 25 > x > 684 / 26
  SMALL: 18.4 -1     // 684 / 37 > x > 684 / 38
};

NicoChatViewModel.LINE_HEIGHT = {
  BIG: 45,
  MEDIUM: 29,
  SMALL: 18
};

NicoChatViewModel.CHAT_MARGIN = 5;

NicoChatViewModel.BASE_SCALE = parseFloat(Config.getValue('baseChatScale'), 10);
Config.on('update-baseChatScale', scale => {
  if (isNaN(scale)) {
    return;
  }
  scale = parseFloat(scale, 10);
  NicoChatViewModel.BASE_SCALE = scale;
  NicoChatViewModel.emitter.emit('updateBaseChatScale', scale);
});

NicoChatViewModel.SPEED_RATE = 1.0;
let updateSpeedRate = () => {
  let rate = Config.getValue('commentSpeedRate') * 1;
  if (Config.getValue('autoCommentSpeedRate')) {
    rate = rate / Math.max(Config.getValue('playbackRate'), 1);
  }
  // window.console.info('updateSpeedRate', rate, Config.getValue('commentSpeedRate'), NicoChatViewModel.SPEED_RATE);
  if (rate !== NicoChatViewModel.SPEED_RATE) {
    NicoChatViewModel.SPEED_RATE = rate;
    NicoChatViewModel.emitter.emit('updateCommentSpeedRate', rate);
  }
};
Config.on('update-commentSpeedRate', updateSpeedRate);
Config.on('update-autoCommentSpeedRate', updateSpeedRate);
Config.on('update-playbackRate', updateSpeedRate);
updateSpeedRate();

class FlashNicoChatViewModel extends NicoChatViewModel {
  // getCssScaleY() {
  //   return this.isDoubleResized() ? this.getCssScale() : super.getCssScaleY();
  // }
}

class HTML5NicoChatViewModel extends NicoChatViewModel {

  _calculateHeight ({scale = 1, lc = 0, size, isEnder/*, isDoubleResized*/}) {
    lc = lc || this._lineCount;
    isEnder = typeof isEnder === 'boolean' ? isEnder : this._nicoChat.isEnder();
    // isDoubleResized = typeof isDoubleResized === 'boolean' ? isDoubleResized : this.isDoubleResized();
    size = size || this._size;
    const SIZE = NicoChat.SIZE;
    const MARGIN = 4;
    const SCREEN_HEIGHT = NicoCommentViewModel.SCREEN.HEIGHT;
    const INNER_HEIGHT = SCREEN_HEIGHT - MARGIN;
    const TABLE_HEIGHT = 360 - MARGIN;
    // 参考データは縦360での計測なので補正する比率
    const RATIO = INNER_HEIGHT / TABLE_HEIGHT;
    scale *= RATIO;
    scale *= NicoChatViewModel.BASE_SCALE;

    this._isLineResized = false;
    let lineHeight;
    let height;
      // @see http://ch.nicovideo.jp/883797/blomaga/ar1149544
    switch (size) {
      case SIZE.BIG:
        lineHeight = 47;
        break;
      case SIZE.SMALL:
        lineHeight = 22;
        break;
      default:
        lineHeight = 32;
        break;
    }

    this._cssLineHeight = lineHeight;
    if (lc === 1) {
      return lineHeight * scale - 1;
    }
    switch (size) {
      case SIZE.BIG:
        lineHeight = TABLE_HEIGHT / (8 * (TABLE_HEIGHT / 340));
        break;
      case SIZE.SMALL:
        lineHeight = TABLE_HEIGHT / (21 * (TABLE_HEIGHT / 354));
        break;
      default:
        lineHeight = TABLE_HEIGHT / (13 * (TABLE_HEIGHT / 357));
        break;
    }
    height = (lineHeight * lc + MARGIN) * scale;
    if (isEnder || height < TABLE_HEIGHT / 3) {
      this._cssLineHeight = lineHeight;
      return height - 1;
    }
    // 非enderで画面の高さの1/3を超える時は改行リサイズ
    this._isLineResized = true;
    switch (size) {
      case SIZE.BIG:
        lineHeight = TABLE_HEIGHT / 16;
        break;
      case SIZE.SMALL:
        lineHeight = TABLE_HEIGHT / 38;
        break;
      default:
        lineHeight = TABLE_HEIGHT / (25 * (TABLE_HEIGHT / 351));
    }
    this._cssLineHeight = lineHeight * 2;
    return (lineHeight * lc + MARGIN) * scale - 1;
  }

  _setScale_ (scale) {
    this._scale = scale;
    this._height = this._calculateHeight({}) * scale;
    this._width = this._originalWidth * scale * (this._isLineResized ? 0.5 : 1);
  }

  getCssScaleY() {
    return this.getCssScale();
  }
}
//==================================================
//==================================================
//==================================================
/**
 * ニコニコ動画のコメントをCSS3アニメーションだけで再現出来るよ
 * という一発ネタのつもりだったのだが意外とポテンシャルが高かった。
 *
 * DOM的に隔離されたiframeの領域内で描画する
 */
class NicoCommentCss3PlayerView extends Emitter {
  constructor(params) {
    super();

    this._viewModel = params.viewModel;

    this._viewModel.on('setData', this._onSetData.bind(this));
    this._viewModel.on('currentTime', this._onCurrentTime.bind(this));

    this._lastCurrentTime = 0;
    this._isShow = true;

    this._aspectRatio = 9 / 16;

    this._inViewTable = {};
    this._inSlotTable = {};
    this._playbackRate = params.playbackRate || 1.0;

    this._isPaused = undefined;

    this._retryGetIframeCount = 0;

    console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

    this._initializeView(params, 0);

    this._config = Config.namespace('commentLayer');

    let _refresh = this.refresh.bind(this);

    // ウィンドウが非表示の時にブラウザが描画をサボっているので、
    // 表示になったタイミングで粛正する
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        _refresh();
      }
    });
    // NicoChatViewModel.emitter.on('updateCommentSpeedRate', () => {
    //   this.refresh();
    // });
    ZenzaWatch.debug.css3Player = this;

  }
  _initializeView (params, retryCount) {
    if (retryCount === 0) {
      window.console.time('initialize NicoCommentCss3PlayerView');
    }
    this._style = null;
    this._commentLayer = null;
    this._view = null;
    let iframe = this._getIframe();
    iframe.setAttribute('sandbox', 'allow-same-origin');

    iframe.className = 'commentLayerFrame';

    let html =
      NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '')
        .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
        .replace('%OPTION_CSS%', '');


    const onload = () => {
      let win, doc;
      iframe.onload = null;
      try {
        win = iframe.contentWindow;
        doc = iframe.contentWindow.document;
      } catch (e) {
        window.console.error(e);
        window.console.log('変な広告に乗っ取られました');
        iframe.remove();
        this._view = null;
        ZenzaWatch.debug.commentLayer = null;
        if (retryCount < 3) {
          this._initializeView(params, retryCount + 1);
        } else {
          PopupMessage.alert('コメントレイヤーの生成に失敗');
        }
        return;
      }

      this._window = win;
      this._document = doc;
      this._optionStyle = doc.getElementById('optionCss');
      this._style = doc.getElementById('nicoChatAnimationDefinition');
      const commentLayer = this._commentLayer = doc.getElementById('commentLayer');
      const subLayer = this._subLayer = document.createElement('div');
      subLayer.className = 'subLayer';
      commentLayer.appendChild(subLayer);
      // Config直接参照してるのは手抜き
      doc.body.className = Config.getValue('debug') ? 'debug' : '';
      Config.on('update-debug', val => doc.body.className = val ? 'debug' : '');
      // 手抜きその2
      this._optionStyle.innerHTML = NicoComment.offScreenLayer.getOptionCss();
      ZenzaWatch.emitter.on('updateOptionCss', newCss => {
        this._optionStyle.innerHTML = newCss;
      });

      ZenzaWatch.debug.getInViewElements = () => doc.getElementsByClassName('nicoChat');

      const onResize = () => {
        const w = win.innerWidth, h = win.innerHeight;
        // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
        const aspectRatio = Math.max(this._aspectRatio, 9 / 16);
        const targetHeight = Math.min(h, w * aspectRatio);
        const scale = targetHeight / 384;
        commentLayer.style.transform = `scale3d(${scale}, ${scale}, 1)`;
      };

      const chkSizeInit = () => {
        const h = win.innerHeight;
        if (!h) {
          window.setTimeout(chkSizeInit, 500);
        } else {
          util.watchResize(iframe.parentElement, _.throttle(onResize, 100));
          this._onResize = onResize;
          onResize();
        }
      };
      ZenzaWatch.emitter.on('fullScreenStatusChange', _.debounce(onResize, 2000));
      document.addEventListener('visibilitychange', _.debounce(() => {
        if (!document.hidden) {
          onResize();
        }
      }, 500));
      window.setTimeout(chkSizeInit, 100);

      if (this._isPaused) {
        this.pause();
      }

      const updateTextShadow = type => {
        const types = ['shadow-type2', 'shadow-type3', 'shadow-stroke', 'shadow-dokaben'];
        types.forEach(t => doc.body.classList.toggle(t, t === type));
      };
      updateTextShadow(this._config.getValue('textShadowType'));
      this._config.on('update-textShadowType', _.debounce(updateTextShadow, 100));

      ZenzaWatch.debug.nicoVideoCapture = () => {
        const html = this.getCurrentScreenHtml();
        const video = document.querySelector('video.nico');

        return VideoCaptureUtil.nicoVideoToCanvas({video, html})
          .then(({canvas, img}) => {
            canvas.style.border = '2px solid blue';
            canvas.className = 'debugCapture';
            canvas.addEventListener('click', () => {
              VideoCaptureUtil.saveToFile(canvas, 'sample.png');
            });
            document.body.appendChild(canvas);
            window.console.log('ok', canvas);
            return Promise.resolve({canvas, img});
          }, err => {
            sessionStorage.lastCaptureErrorSrc = html;
            window.console.error('!', err);
            return Promise.reject(err);
          });
      };

      ZenzaWatch.debug.svgTest = () => {
        const svg = this.getCurrentScreenSvg();
        const blob = new Blob([svg], {'type': 'text/plain'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('download', 'test.svg');
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener');
        a.setAttribute('href', url);
        document.body.appendChild(a);
        a.click();
        window.setTimeout(() => a.remove(), 1000);
      };

      window.console.timeEnd('initialize NicoCommentCss3PlayerView');
    };

    this._view = iframe;
    if (this._$node) {
      this._$node.append(iframe);
    }

    if (iframe.srcdocType === 'string') {
      iframe.onload = onload;
      iframe.srcdoc = html;
    } else {
      // MS IE/Edge用
      if (!this._$node) {
        this._msEdge = true;
        // ここに直接書いてるのは掟破り。 動かないよりはマシということで・・・
        $('.zenzaPlayerContainer').append(iframe);
      }
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(html);
      iframe.contentWindow.document.close();
      window.setTimeout(onload, 0);
    }

    ZenzaWatch.debug.commentLayer = iframe;
    if (!params.show) {
      this.hide();
    }
  }
  _getIframe () {
    let reserved = document.getElementsByClassName('reservedFrame');
    let iframe;
    if (reserved && reserved.length > 0) {
      iframe = reserved[0];
      document.body.removeChild(iframe);
      iframe.style.position = '';
      iframe.style.left = '';
    } else {
      iframe = document.createElement('iframe');
    }
    try {
      iframe.srcdocType = iframe.srcdocType || (typeof iframe.srcdoc);
      iframe.srcdoc = '<html></html>';
    } catch (e) {
      // 行儀の悪い広告にiframeを乗っ取られた？
      this._retryGetIframeCount++;
      window.console.error('Error: ', e);
      if (this._retryGetIframeCount < 5) {
        window.console.log('変な広告に乗っ取られたのでリトライ', this._retryGetIframeCount);
        return this._getIframe();
      } else {
        PopupMessage.alert('コメントレイヤーの生成に失敗しました');
      }
    }
//    iframe.setAttribute('allow', 'vr');
    return iframe;
  }
  _onCommand (command, param) {
    this.emit('command', command, param);
  }
  _adjust () {
    if (!this._view) {
      return;
    }
    if (typeof this._onResize === 'function') {
      return this._onResize();
    }
  }
  getView () {
    return this._view;
  }
  setPlaybackRate (playbackRate) {
    // let isSpeedUp = this._playbackRate < playbackRate;
    this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
    if (!Config.getValue('autoCommentSpeedRate') || this._playbackRate <= 1) {
      this.refresh();
    }
  }
  setAspectRatio (ratio) {
    this._aspectRatio = ratio;
    this._adjust();
  }
  _onSetData () {
    this.clear();
  }
  _onCurrentTime (sec) {
    let REFRESH_THRESHOLD = 1;
    this._lastCurrentTime = this._currentTime;
    this._currentTime = sec;

    if (this._lastCurrentTime === this._currentTime) {
      // pauseでもないのにcurrentTimeの更新が途絶えたらロードが詰まった扱い
      if (!this._isPaused) {
        this._setStall(true);
      }
    } else if (this._currentTime < this._lastCurrentTime ||
      Math.abs(this._currentTime - this._lastCurrentTime) > REFRESH_THRESHOLD) {
      // 後方へのシーク、または 境界値以上の前方シーク時は全体を再描画
      this.refresh();
    } else {
      this._setStall(false);
      this._updateInviewElements();
    }
  }
  _addClass (name) {
    if (!this._commentLayer) {
      return;
    }
    this._commentLayer.classList.add(name);
  }
  _removeClass (name) {
    if (!this._commentLayer) {
      return;
    }
    this._commentLayer.classList.remove(name);
  }
  _setStall (v) {
    if (v) {
      this._addClass('is-stalled');
    }
    else {
      this._removeClass('is-stalled');
    }
  }
  pause () {
    if (this._commentLayer) {
      this._addClass('paused');
    }
    this._isPaused = true;
  }
  play () {
    if (this._commentLayer) {
      this._removeClass('paused');
    }
    this._isPaused = false;
  }
  clear () {
    if (this._commentLayer) {
      this._commentLayer.textContent = '';
      this._commentLayer.appendChild(this._subLayer);
    }
    if (this._style) {
      this._style.textContent = '';
    }

    this._inViewTable = {};
    this._inSlotTable = {};
  }
  refresh () {
    this.clear();
    this._updateInviewElements();
  }
  _updateInviewElements () {
    if (!this._commentLayer || !this._style || !this._isShow || document.hidden) {
      return;
    }

    let groups = [
      this._viewModel.getGroup(NicoChat.TYPE.NAKA),
      this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
      this._viewModel.getGroup(NicoChat.TYPE.TOP)
    ];

    let css = [], inView = [], dom = [], subDom = [];
    let i, len;
    // 表示状態にあるchatを集める
    for (i = 0, len = groups.length; i < len; i++) {
      let group = groups[i];
      inView = inView.concat(group.getInViewMembers());
    }

    let nicoChat;
    let ct = this._currentTime;
    let newView = [];
    for (i = 0, len = inView.length; i < len; i++) {
      nicoChat = inView[i];
      let domId = nicoChat.getId();
      if (this._inViewTable[domId]) {
        continue;
      }
      this._inViewTable[domId] = nicoChat;
      this._inSlotTable[domId] = nicoChat;
      newView.push(nicoChat);
    }

    if (newView.length > 1) {
      newView.sort(function (a, b) {
        let av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) {
          return av - bv;
        }
        else {
          return a.getNo() < b.getNo() ? -1 : 1;
        }
      });
    }

    for (i = 0, len = newView.length; i < len; i++) {
      nicoChat = newView[i];
      let type = nicoChat.getType();
      let size = nicoChat.getSize();
      (nicoChat.isSubThread() ? subDom : dom)
        .push(NicoChatCss3View.buildChatDom(nicoChat, type, size));
      css.push(NicoChatCss3View.buildChatCss(nicoChat, type, ct, this._playbackRate));
    }

    // DOMへの追加
    if (css.length > 0) {
      let inSlotTable = this._inSlotTable, currentTime = this._currentTime;
      let outViewIds = [];
      let margin = 2 / NicoChatViewModel.SPEED_RATE;
      Object.keys(inSlotTable).forEach(key => {
        let chat = inSlotTable[key];
        if (currentTime - margin < chat.getEndRightTiming()) {
          return;
        }
        delete inSlotTable[key];
        outViewIds.push(key);
      });
      this._updateDom(dom, subDom, css, outViewIds);
    }
  }

  _updateDom (dom, subDom, css, outViewIds) {
    let fragment = document.createDocumentFragment();
    while (dom.length > 0) {
      fragment.appendChild(dom.shift());
    }
    this._commentLayer.appendChild(fragment);
    let subFragment = document.createDocumentFragment();
    while (subDom.length > 0) {
      subFragment.appendChild(subDom.shift());
    }
    this._subLayer.appendChild(subFragment);
    this._style.insertAdjacentHTML('beforeend', css.join(''));
    this._removeOutviewElements(outViewIds);
    this._gcInviewElements();
  }
  /*
     * アニメーションが終わっているはずの要素を除去
     */
  _removeOutviewElements (outViewIds) {
    let doc = this._document;
    if (!doc) {
      return;
    }
    outViewIds.forEach(id => {
      let elm = doc.getElementById(id);
      if (!elm) {
        return;
      }
      elm.remove();
    });
  }
  /*
     * 古い順に要素を除去していく
     */
  _gcInviewElements (/*outViewIds*/) {
    if (!this._commentLayer || !this._style) {
      return;
    }

    let max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;

    let commentLayer = this._commentLayer;
    let i, inViewElements;
    //inViewElements = commentLayer.getElementsByClassName('nicoChat');
    inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork0'));
    for (i = inViewElements.length - max - 1; i >= 0; i--) {
      inViewElements[i].remove();
    }
    inViewElements = Array.from(commentLayer.querySelectorAll('.nicoChat.fork1'));
    for (i = inViewElements.length - max - 10 - 1; i >= 0; i--) {
      inViewElements[i].remove();
    }
  }

  buildHtml (currentTime) {
    currentTime = currentTime || this._viewModel.getCurrentTime();
    window.console.time('buildHtml');

    let groups = [
      this._viewModel.getGroup(NicoChat.TYPE.NAKA),
      this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
      this._viewModel.getGroup(NicoChat.TYPE.TOP)
    ];

    let members = [];
    for (let i = 0; i < groups.length; i++) {
      let group = groups[i];
      members = members.concat(group.getMembers());
    }

    members.sort(function (a, b) {
      let av = a.getVpos(), bv = b.getVpos();
      if (av !== bv) {
        return av - bv;
      }
      else {
        return a.getNo() < b.getNo() ? -1 : 1;
      }
    });

    let css = [], html = [];
    html.push(this._buildGroupHtml(members, currentTime));
    css.push(this._buildGroupCss(members, currentTime));

    let tpl = NicoCommentCss3PlayerView.__TPL__
      .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
      .replace('%OPTION_CSS%', NicoComment.offScreenLayer.getOptionCss());

    tpl = tpl.replace('%CSS%', css.join(''));
    tpl = tpl.replace('%MSG%', html.join(''));

    window.console.timeEnd('buildHtml');
    return tpl;
  }
  _buildGroupHtml (m) {
    let result = [];

    for (let i = 0, len = m.length; i < len; i++) {
      let chat = m[i];
      let type = chat.getType();
      result.push(NicoChatCss3View.buildChatHtml(chat, type /*, currentTime */));
    }
    return result.join('\n');
  }
  _buildGroupCss (m, currentTime) {
    let result = [];

    for (let i = 0, len = m.length; i < len; i++) {
      let chat = m[i];
      let type = chat.getType();
      result.push(NicoChatCss3View.buildChatCss(chat, type, currentTime));
    }
    return result.join('\n');
  }
  show () {
    if (!this._isShow) {
      this._isShow = true;
      this.refresh();
    }
    console.log('show!');
  }
  hide () {
    this.clear();
    this._isShow = false;
  }
  appendTo ($node) {
    if (this._msEdge) {
      return;
    } // MS IE/Edge...
    this._$node = $node;
    $node.append(this._view);
  }
  /**
   * toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
   * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
   * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
   */
  toString () {
    return this.buildHtml(0)
      .replace('<html', '<html class="saved"');
  }

  getCurrentScreenHtml () {
    const win = this._window;
    if (!win) {
      return null;
    }
    this.refresh();
    let body = win.document.body;
    body.classList.add('in-capture');
    let html = win.document.querySelector('html').outerHTML;
    body.classList.remove('in-capture');
    html = html
      .replace('<html ', '<html xmlns="http://www.w3.org/1999/xhtml" ')
      .replace(/<meta.*?>/g, '')
      .replace(/data-meta=".*?"/g, '')
      .replace(/<br>/g, '<br/>');
    return html;
  }

  getCurrentScreenSvg () {
    const win = this._window;
    if (!win) {
      return null;
    }

    this.refresh();
    let body = win.document.body;
    body.classList.add('in-capture');
    let style = win.document.querySelector('style').innerHTML;

    const w = 682, h = 382;
    const head =
      (`<svg
  xmlns="http://www.w3.org/2000/svg"
  version="1.1">
`);
    const defs = (`
<defs>
  <style type="text/css" id="layoutCss"><![CDATA[
    ${style}

    .nicoChat {
      animation-play-state: paused !important;
    }
  ]]>
  </style>
</defs>
`).trim();

    const textList = [];
    Array.from(win.document.querySelectorAll('.nicoChat')).forEach(chat => {
      let j = JSON.parse(chat.getAttribute('data-meta'));
      chat.removeAttribute('data-meta');
      chat.setAttribute('y', j.ypos);
      let c = chat.outerHTML;
      c = c.replace(/<span/g, '<text');
      c = c.replace(/<\/span>$/g, '</text>');
      c = c.replace(/<(\/?)(span|group|han_group|zen_group|spacer)/g, '<$1tspan');
      c = c.replace(/<br>/g, '<br/>');
      textList.push(c);
    });

    const view =
      (`
<g fill="#00ff00">
  ${textList.join('\n\t')}
</g>

`);

    const foot =
      (`
<g style="background-color: #333; overflow: hidden; width: ${w}; height: ${h}; padding: 0 69px;" class="shadow-dokaben in-capture paused">
  <g class="commentLayerOuter" width="682" height="384">
    <g class="commentLayer is-stalled" id="commentLayer" width="544" height="384">
    </g>
  </g>
</g>
</svg> `).trim();

    return `${head}${defs}${view}${foot}`;
  }

}

NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;
/* eslint-disable */
NicoCommentCss3PlayerView.__TPL__ = (`
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
<style type="text/css" id="optionCss">%OPTION_CSS%</style>
<style type="text/css">

body.in-capture .commentLayerOuter {
  overflow: hidden;
  width: 682px;
  height: 384px;
  padding: 0 69px;
}
body.in-capture .commentLayer {
  transform: none !important;
}

.saved body {
  pointer-events: auto;
}

.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }

@keyframes idou {
  0%   {
    opacity: 1;
    transform:
      translate3d(0, 0, 0) translate3d(0, 0, 0);
  }
  100% {
    opacity: 1;
    transform:
      translate3d(${-NicoCommentViewModel.SCREEN.OUTER_WIDTH_FULL}px, 0, 0) translate3d(-100%, 0, 0);
  }
}
@keyframes idou-middle {
  0%   {
    opacity: 1;
    transform: translate3d(0, 0, 0) translate3d(0, -50%, 0);
  }
  100% {
    opacity: 1;
    transform:
        translate3d(${-NicoCommentViewModel.SCREEN.OUTER_WIDTH_FULL}px, 0, 0) translate3d(-100%, -50%, 0);
  }
}

@keyframes fixed {
   0% {opacity: 1;}
  95% {opacity: 1;}
 100% {opacity: 0.5;}
}

@keyframes showhide {
   0% { display: block;}
  99% { display: block;}
 100% { display: none; }
}

@keyframes dokaben {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(90deg);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(0deg);
  }
  90% {
    opacity: 1;
    transform: translate(-50%, 0) perspective(200px) rotateX(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, 0) perspective(200px) rotateX(90deg);
  }
}

.commentLayerOuter {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 672px;
  padding: 0 64px;
  height: 384px;
  right: 0;
  bottom: 0;
  transform: translate3d(-50%, -50%, 0);
  box-sizing: border-box;
}

.saved .commentLayerOuter {
  background: #333;
}

.commentLayer {
  position: absolute;
  width: 544px;
  height: 384px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.subLayer {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.7;
}

.debug .commentLayer {
  outline: 1px solid green;
  transform: none !important;
}

.nicoChat {
  line-height: 1.235;
  opacity: 0;
  text-shadow: 1px 1px 0 #000;
  transform-origin: 0 0;
  animation-timing-function: linear;
  will-change: transform, opacity;
  color: #fff;
}

.shadow-type2 .nicoChat {
  text-shadow:
     1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px  1px 0 rgba(0, 0, 0, 0.5),
    -1px -1px 0 rgba(0, 0, 0, 0.5),
     1px -1px 0 rgba(0, 0, 0, 0.5);
}

.shadow-type3 .nicoChat {
  text-shadow:
     1px  1px 1px rgba(  0,   0,   0, 0.8),
     0  0 2px rgba(  0,   0,   0, 0.8),
    -1px -1px 1px rgba(128, 128, 128, 0.8);
}

.shadow-stroke .nicoChat {
  text-shadow: none;
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.7);
  text-stroke:         1px rgba(0, 0, 0, 0.7);
}

/*「RGBは大体　文字200、80、0　縁150,50,0　くらい」らしい*/
.shadow-dokaben .nicoChat.ue,
.shadow-dokaben .nicoChat.shita {
  color: rgb(200, 80, 0);
  font-family: 'dokaben_ver2_1' !important;
  font-weight: bolder;
  animation-name: dokaben !important;
  text-shadow:
    1px  1px 0 rgba(150, 50, 0, 1),
   -1px  1px 0 rgba(150, 50, 0, 1),
   -1px -1px 0 rgba(150, 50, 0, 1),
    1px -1px 0 rgba(150, 50, 0, 1) !important;
  transform-origin: center bottom;
  animation-timing-function: steps(10);
  perspective-origin: center bottom;
}

.shadow-dokaben .nicoChat.ue *,
.shadow-dokaben .nicoChat.shita * {
  font-family: 'dokaben_ver2_1' !important;
}
.shadow-dokaben .nicoChat {
  text-shadow:
     1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px  1px 0px rgba(0, 0, 0, 0.5),
    -1px -1px 0px rgba(0, 0, 0, 0.5),
     1px -1px 0px rgba(0, 0, 0, 0.5);
}


.nicoChat.ue,
.nicoChat.shita {
  animation-name: fixed;
}

.nicoChat.black {
  text-shadow: -1px -1px 0 #888, 1px  1px 0 #888;
}

.nicoChat.overflow {
}

.nicoChat.ue,
.nicoChat.shita {
  display: inline-block;
  text-shadow: 0 0 3px #000;
}
.nicoChat.ue.black,
.nicoChat.shita.black {
  text-shadow: 0 0 3px #fff;
}

.nicoChat .type0655,
.nicoChat .zero_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
  opacity: 0;
}

.nicoChat .han_space,
.nicoChat .zen_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
  opacity: 0;
}

.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
  color: yellow;
  background: #fff;
  opacity: 0.3;
}

.debug .nicoChat .tab_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
  background: #ff0;
  opacity: 0.3;
}

.nicoChat .invisible_code {
  text-shadow: none;
  -webkit-text-stroke: unset;
  opacity: 0;
}

.nicoChat .zero_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
  opacity: 0;
}

.debug .nicoChat .zero_space {
  display: inline;
  position: absolute;
}
.debug .html5_zen_space {
  color: #888;
  opacity: 0.5;
}

.nicoChat .fill_space, .nicoChat .html5_fill_space {
  text-shadow: none;
  -webkit-text-stroke: unset !important;
  text-stroke: unset !important;
  background: currentColor;
}

.nicoChat .mesh_space {
  text-shadow: none;
  -webkit-text-stroke: unset;
}

.nicoChat .block_space, .nicoChat .html5_block_space {
  text-shadow: none;
}

.debug .nicoChat.ue {
  text-decoration: overline;
}

.debug .nicoChat.shita {
  text-decoration: underline;
}



.nicoChat.mine {
  border: 1px solid yellow;
}

.nicoChat.updating {
  border: 1px dotted;
}

.nicoChat.fork1 {
  text-shadow: 1px 1px 0 #008800, -1px -1px 0 #008800 !important;
  -webkit-text-stroke: unset;
}
.nicoChat.ue.fork1,
.nicoChat.shita.fork1 {
  display: inline-block;
  text-shadow: 0 0 3px #080 !important;
  -webkit-text-stroke: unset;
}

.nicoChat.fork2 {
  outline: dotted 1px #000088;
}

.nicoChat.blink {
  border: 1px solid #f00;
}

.nicoChat.subThread {
  filter: opacity(0.7);
}

@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(3600deg); }
}

.nicoChat.updating::before {
  content: '❀';
  opacity: 0.8;
  color: #f99;
  display: inline-block;
  text-align: center;
  animation-name: spin;
  animation-iteration-count: infinite;
  animation-duration: 10s;
}

.nicoChat.updating::after {
  content: ' 通信中...';
  font-size: 50%;
  opacity: 0.8;
  color: #ccc;
}

.nicoChat.updating::after {
  animation-direction: alternate;
}

.nicoChat.fail {
  border: 1px dotted red;
  text-decoration: line-through;
}

.nicoChat.fail:after {
  content: ' 投稿失敗...';
  text-decoration: none;
  font-size: 80%;
  opacity: 0.8;
  color: #ccc;
}

.debug .nicoChat {
  outline: 1px outset;
}

spacer {
  visibility: hidden;
}
.debug spacer {
  visibility: visible;
  outline: 3px dotted orange;
}

.is-stalled .nicoChat,
.paused  .nicoChat {
  animation-play-state: paused !important;
}

</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body style="background-color: transparent !important;background: transparent !important;">
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>

  `).trim();
/* eslint-enable */

class NicoChatCss3View {
  /**
   *
   * @param {NicoChatViewModel}chat
   * @param type
   * @param size
   * @returns {HTMLSpanElement}
   */
  static buildChatDom (chat, type, size) {
    let span = document.createElement('span');
    let ver = chat.getCommentVer();
    let className = ['nicoChat', type, size];
    if (ver === 'html5') {
      className.push(ver);
    }
    if (chat.getColor() === '#000000') {
      className.push('black');
    }

    if (chat.isDoubleResized()) {
      className.push('is-doubleResized');
    } else if (chat.isLineResized()) {
      className.push('is-lineResized');
    }

    if (chat.isOverflow()) {
      className.push('overflow');
    }
    if (chat.isMine()) {
      className.push('mine');
    }
    if (chat.isUpdating()) {
      className.push('updating');
    }
    let fork = chat.getFork();
    if (fork) {
      className.push(`fork${fork}`);
    }

    // if (chat.isSubThread()) {
    //   className.push('subThread');
    // }

    if (chat.isPostFail()) {
      className.push('fail');
    }

    const fontCommand = chat.getFontCommand();
    if (fontCommand) {
      className.push(`cmd-${fontCommand}`);
    }

    span.className = className.join(' ');
    span.id = chat.getId();
    if (!chat.isInvisible()) {
      span.innerHTML = chat.getHtmlText();
    }
    span.setAttribute('data-meta', chat.toString());
    return span;
  }

  static buildChatHtml (chat, type) {
    const result = NicoChatCss3View.buildChatDom(chat, type, chat.getSize());
    result.removeAttribute('data-meta');
    return result.outerHTML;
  }

  static buildChatCss (chat, type, currentTime = 0, playbackRate = 1) {
    return type === NicoChat.TYPE.NAKA ?
      NicoChatCss3View._buildNakaCss(chat, type, currentTime, playbackRate) :
      NicoChatCss3View._buildFixedCss(chat, type, currentTime, playbackRate);
  }

  static _buildNakaCss (chat, type, currentTime, playbackRate) {
    let result;
    let scaleCss;
    let id = chat.getId();
    let commentVer = chat.getCommentVer();
    let duration = chat.getDuration() / playbackRate;
    let scale = chat.getCssScale();
    let scaleY = chat.getCssScaleY();
    let beginL = chat.getBeginLeftTiming();
    let screenWidth = NicoCommentViewModel.SCREEN.WIDTH;
    // let screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
    let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
    // let width = chat.getWidth();
    let height = chat.getHeight();
    let ypos = chat.getYpos();
    let isSub = chat.isSubThread();
    let color = chat.getColor();
    //color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
    let colorCss = color ? `color: ${color};` : '';
    let fontSizePx = chat.getFontSizePixel();
    let lineHeightCss = '';
    if (commentVer !== 'html5') {
      lineHeightCss = `line-height: ${Math.floor(chat.getLineHeight())}px;`;
    }
    let speed = chat.getSpeed();
    let delay = (beginL - currentTime) / playbackRate;
    let slot = chat.getSlot();
    let zIndex =
      (slot >= 0) ?
        (slot * 1000 + chat.getFork() * 1000000 + 1) :
        (1000 + beginL * 1000 + chat.getFork() * 1000000);
    zIndex = isSub ? zIndex: zIndex * 2;

    // 4:3ベースに計算されたタイミングを16:9に補正する
    // scale無指定だとChromeでフォントがぼけるので1.0の時も指定だけする
    // TODO: 環境によって重くなるようだったらオプションにする
    scaleCss =
      (scale === 1.0) ? 'scale3d(1, 1, 1)' : `scale3d(${scale}, ${scaleY}, 1)`;
    const outerScreenWidth = NicoCommentViewModel.SCREEN.OUTER_WIDTH_FULL;
    const screenDiff = outerScreenWidth - screenWidth;
    const leftPos = screenWidth + screenDiff / 2;
    const durationDiff = screenDiff / speed / playbackRate;
    duration += durationDiff;
    delay -= (durationDiff * 0.5);
    // 逆再生
    const reverse = chat.isReverse() ? 'animation-direction: reverse;' : '';
    let isAlignMiddle = false;
    if ((commentVer === 'html5' && (height >= screenHeight - fontSizePx / 2 || chat.isOverflow())) ||
      (commentVer !== 'html5' && height >= screenHeight - fontSizePx / 2 && height < screenHeight + fontSizePx)
    ) {
        isAlignMiddle = true;
    }
    let top = isAlignMiddle ? '50%' : `${ypos}px`;
    let vAlign = isAlignMiddle ? '-middle' : '';

      result = `
        #${id} {
           z-index: ${zIndex};
           top: ${top};
           left: ${leftPos}px;
           ${colorCss}
           ${lineHeightCss}
           font-size: ${fontSizePx}px;
           animation-name: idou${scale === 1.0 ? '' : id}${vAlign};
           animation-duration: ${duration}s;
           animation-delay: ${delay}s;
           ${reverse}
        }
        `;
      if (scale !== 1.0) {
        let transY = isAlignMiddle ? '-50%' : '0';
        result += `
        @keyframes idou${id}${vAlign} {
          0%   {
            opacity: 1;
            transform:
              translate3d(0, 0, 0) ${scaleCss} translate3d(0, ${transY}, 0);
          }
          100% {
            opacity: 1;
            transform:
              translate3d(-${outerScreenWidth}px, 0, 0) ${scaleCss} translate3d(-100%, ${transY}, 0);
          }
        }
      `;
      }
    return `\n${result.trim().replace(/[ ]+/g, ' ')}\n`;
  }

  static _buildFixedCss (chat, type, currentTime, playbackRate) {
    let result;
    let scaleCss;
    let id = chat.getId();
    let commentVer = chat.getCommentVer();
    let duration = chat.getDuration() / playbackRate;
    let scale = chat.getCssScale();// * (chat.isLineResized() ? 0.5 : 1);
    let scaleY = chat.getCssScaleY();
    let beginL = chat.getBeginLeftTiming();
    let screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
    let height = chat.getHeight();
    let ypos = chat.getYpos();
    let isSub = chat.isSubThread();
    let color = chat.getColor();
    // color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
    let colorCss = color ? `color: ${color};` : '';
    let fontSizePx = chat.getFontSizePixel();
    let lineHeightCss = '';
    if (commentVer !== 'html5') {
      lineHeightCss = `line-height: ${Math.floor(chat.getLineHeight())}px;`;
    }
    let delay = (beginL - currentTime) / playbackRate;
    let slot = chat.getSlot();
    let zIndex =
      (slot >= 0) ?
        (slot * 1000 + chat.getFork() * 1000000 + 1) :
        (1000 + beginL * 1000 + chat.getFork() * 1000000);
    zIndex = isSub ? zIndex: zIndex * 2;

    let top;
    let transY;

    // 画面高さに近い・超える時は上端または下端にぴったりつける
    if ((commentVer === 'html5' && height >= screenHeight - fontSizePx / 2 || chat.isOverflow()) ||
        (commentVer !== 'html5' && height >= screenHeight * 0.7)) {
      top = `${type === NicoChat.TYPE.BOTTOM ? 100 : 0}%`;
      transY = `${type === NicoChat.TYPE.BOTTOM ? -100 : 0}%`;
    } else {
      top = ypos + 'px';
      transY = '0';
    }
    scaleCss =
      scale === 1.0 ?
        `transform: scale3d(1, ${scaleY}, 1) translate3d(-50%, ${transY}, 0);` :
        `transform: scale3d(${scale}, ${scaleY}, 1) translate3d(-50%, ${transY}, 0);`;

    result = `
      #${id} {
         z-index: ${zIndex};
         top: ${top};
         left: 50%;
         ${colorCss}
         ${lineHeightCss}
         font-size: ${fontSizePx}px;
         ${scaleCss}
         animation-duration: ${duration / 0.95}s;
         animation-delay: ${delay}s;
      }
      
      @keyframes dokaben${id} {
        0% {
          opacity: 1;
          transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale3d(${scale}, ${scale}, 1);
        }
        50% {
          transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg)  scale3d(${scale}, ${scale}, 1);
        }
        90% {
          transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(0deg)  scale3d(${scale}, ${scale}, 1);
        }
        100% {
          opacity: 1;
          transform: translate3d(-50%, 0, 0) perspective(200px) rotateX(90deg) scale3d(${scale}, ${scale}, 1);
        }
      }
      
      .shadow-dokaben #${id} {
        animation-name: dokaben${id} !important;
      }
    `;
    return `\n${result.trim()}\n`;
  }

}

class NicoChatFilter extends Emitter {
  constructor(params) {
    super();
    this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;

    this._wordFilterList = [];
    this._userIdFilterList = [];
    this._commandFilterList = [];
    this.setWordFilterList(params.wordFilter || '');
    this.setUserIdFilterList(params.userIdFilter || '');
    this.setCommandFilterList(params.commandFilter || '');

    this._enable = typeof params.enableFilter === 'boolean' ? params.enableFilter : true;

    this._wordReg = null;
    this._wordRegReg = null;
    this._userIdReg = null;
    this._commandReg = null;

    this._onChange = _.debounce(this._onChange.bind(this), 50);

    if (params.wordRegFilter) {
      this.setWordRegFilter(params.wordRegFilter, params.wordRegFilterFlags);
    }
  }
}
_.assign(NicoChatFilter.prototype, {
  setEnable: function (v) {
    v = !!v;
    if (this._enable !== v) {
      this._enable = v;
      this._onChange();
    }
  },
  isEnable: function () {
    return this._enable;
  },
  addWordFilter: function (text) {
    let before = this._wordFilterList.join('\n');
    this._wordFilterList.push((text || '').trim());
    this._wordFilterList = _.uniq(this._wordFilterList);
    let after = this._wordFilterList.join('\n');
    if (before !== after) {
      this._wordReg = null;
      this._onChange();
    }
  },
  setWordFilterList: function (list) {
    list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

    let before = this._wordFilterList.join('\n');
    let tmp = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before !== after) {
      this._wordReg = null;
      this._wordFilterList = tmp;
      this._onChange();
    }
  },
  getWordFilterList: function () {
    return this._wordFilterList;
  },
  setWordRegFilter: function (source, flags) {
    if (this._wordRegReg) {
      if (this._wordRegReg.source === source && this._flags === flags) {
        return;
      }
    }
    try {
      this._wordRegReg = new RegExp(source, flags);
    } catch (e) {
      window.console.error(e);
      return;
    }
    this._onChange();
  },
  addUserIdFilter: function (text) {
    let before = this._userIdFilterList.join('\n');
    this._userIdFilterList.push(text);
    this._userIdFilterList = _.uniq(this._userIdFilterList);
    let after = this._userIdFilterList.join('\n');
    if (before !== after) {
      this._userIdReg = null;
      this._onChange();
    }
  },
  setUserIdFilterList: function (list) {
    list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

    let before = this._userIdFilterList.join('\n');
    let tmp = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before !== after) {
      this._userIdReg = null;
      this._userIdFilterList = tmp;
      this._onChange();
    }
  },
  getUserIdFilterList: function () {
    return this._userIdFilterList;
  },
  addCommandFilter: function (text) {
    let before = this._commandFilterList.join('\n');
    this._commandFilterList.push(text);
    this._commandFilterList = _.uniq(this._commandFilterList);
    let after = this._commandFilterList.join('\n');
    if (before !== after) {
      this._commandReg = null;
      this._onChange();
    }
  },
  setCommandFilterList: function (list) {
    list = _.uniq(typeof list === 'string' ? list.trim().split('\n') : list);

    let before = this._commandFilterList.join('\n');
    let tmp = [];
    list.forEach(text => {
      if (!text) { return; }
      tmp.push(text.trim());
    });
    tmp = _.compact(tmp);
    let after = tmp.join('\n');

    if (before !== after) {
      this._commandReg = null;
      this._commandFilterList = tmp;
      this._onChange();
    }
  },
  getCommandFilterList: function () {
    return this._commandFilterList;
  },

  setSharedNgLevel: function (level) {
    if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this._onChange();
    }
  },
  getSharedNgLevel: function () {
    return this._sharedNgLevel;
  },
  getFilterFunc: function () {
    if (!this._enable) {
      return () => true;
    }
    let threthold = SHARED_NG_SCORE[this._sharedNgLevel];
    let isPremium = util.isPremium();

    // NG設定の数×コメント数だけループを回すのはアホらしいので、
    // 連結した一個の正規表現を生成する
    if (!this._wordReg) {
      this._wordReg = this._buildFilterReg(
        isPremium ? this._wordFilterList : this._wordFilterList.concat().splice(40));
    }
    if (!this._userIdReg) {
      this._userIdReg = this._buildFilterPerfectMatchinghReg(
        isPremium ? this._userIdFilterList : this._userIdFilterList.concat().splice(40));
    }
    if (!this._commandReg) {
      this._commandReg = this._buildFilterReg(
        isPremium ? this._commandFilterList : this._commandFilterList.concat().splice(40));
    }
    let wordReg = this._wordReg;
    let wordRegReg = this._wordRegReg;
    let userIdReg = this._userIdReg;
    let commandReg = this._commandReg;

    if (Config.getValue('debug')) {
      return nicoChat => {
        if (nicoChat.getFork() > 0) {
          return true;
        }
        let score = nicoChat.getScore();
        if (score <= threthold) {
          window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
            score,
            threthold,
            nicoChat.getType(),
            nicoChat.getVpos() / 100,
            nicoChat.getText()
          );
          return false;
        }

        if (wordReg && wordReg.test(nicoChat.getText())) {
          window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
            RegExp.$1,
            nicoChat.getType(),
            nicoChat.getVpos() / 100,
            nicoChat.getText()
          );
          return false;
        }

        if (wordRegReg && wordRegReg.test(nicoChat.getText())) {
          window.console.log(
            '%cNGワード(正規表現): "%s" %s %s秒 %s',
            'background: yellow;',
            RegExp.$1,
            nicoChat.getType(),
            nicoChat.getVpos() / 100,
            nicoChat.getText()
          );
          return false;
        }

        if (userIdReg && userIdReg.test(nicoChat.getUserId())) {
          window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
            RegExp.$1,
            nicoChat.getType(),
            nicoChat.getVpos() / 100,
            nicoChat.getUserId(),
            nicoChat.getText()
          );
          return false;
        }

        if (commandReg && commandReg.test(nicoChat.getCmd())) {
          window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
            RegExp.$1,
            nicoChat.getType(),
            nicoChat.getVpos() / 100,
            nicoChat.getCmd(),
            nicoChat.getText()
          );
          return false;
        }


        return true;
      };
    }

    return nicoChat => {
      if (nicoChat.getFork() > 0) {
        return true;
      }

      if (nicoChat.getScore() <= threthold) {
        return false;
      }

      if (wordReg && wordReg.test(nicoChat.getText())) {
        return false;
      }

      if (wordRegReg && wordRegReg.test(nicoChat.getText())) {
        return false;
      }

      if (userIdReg && userIdReg.test(nicoChat.getUserId())) {
        return false;
      }

      if (commandReg && commandReg.test(nicoChat.getCmd())) {
        return false;
      }

      return true;
    };
  },
  applyFilter: function (nicoChatArray) {
    let before = nicoChatArray.length;
    if (before < 1) {
      return nicoChatArray;
    }
    let timeKey = 'applyNgFilter: ' + nicoChatArray[0].getType();
    window.console.time(timeKey);
    let filterFunc = this.getFilterFunc();
    let result = nicoChatArray.filter(c => filterFunc(c));
    window.console.timeEnd(timeKey);
    window.console.log('NG判定結果: %s/%s', result.length, before);
    return result;
  },
  isSafe: function (nicoChat) {
    return (this.getFilterFunc())(nicoChat);
  },
  _buildFilterReg: function (filterList) {
    if (filterList.length < 1) {
      return null;
    }
    const escapeRegs = util.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('(' + r.join('|') + ')', 'i');
  },
  _buildFilterPerfectMatchinghReg: function (filterList) {
    if (filterList.length < 1) {
      return null;
    }
    const escapeRegs = util.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('^(' + r.join('|') + ')$');
  },
  _onChange: function () {
    console.log('NicoChatFilter.onChange');
    this.emit('change');
  }
});

Object.assign(ZenzaWatch.debug, {
  NicoChat,
  NicoChatViewModel
});
//===END===

export {
  SHARED_NG_LEVEL,
  SHARED_NG_SCORE,
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
