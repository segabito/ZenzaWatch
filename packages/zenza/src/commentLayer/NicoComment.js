import {Emitter} from '../../../lib/src/Emitter';
import {NicoChatFilter} from './NicoChatFilter';
import {SlotLayoutWorker} from './SlotLayoutWorker';
import {NicoChatGroupViewModel} from './NicoChatGroupViewModel';
import {NicoChat} from './NicoChat';
import {NicoChatGroup} from './NicoChatGroup';
import {NicoScripter} from './NicoScripter';
import {global, Config} from '../../../../src/ZenzaWatchIndex';
import {sleep} from '../../../lib/src/infra/sleep';
import {textUtil} from '../../../lib/src/text/textUtil';
import {CommentLayer} from './CommentLayer';
//===BEGIN===
const {MAX_COMMENT} = CommentLayer;

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

    NicoComment.offscreenLayer.get().then(async offscreen => {
      params.offScreen = offscreen;
      this.topGroup = new NicoChatGroup(this, NicoChat.TYPE.TOP, params);
      this.nakaGroup = new NicoChatGroup(this, NicoChat.TYPE.NAKA, params);
      this.bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);

      this.nicoScripter = new NicoScripter();
      this.nicoScripter.on('command', (command, param) => this.emit('command', command, param));

      const onChange = _.debounce(this._onChange.bind(this), 100);
      this.topGroup.on('change', onChange);
      this.nakaGroup.on('change', onChange);
      this.bottomGroup.on('change', onChange);
      global.emitter.on('updateOptionCss', onChange);

      await sleep.idle();
      this.emitResolve('GetReady!');
    });
  }

  setXml(xml, options) {
    const chatsData = Array.from(xml.getElementsByTagName('chat')).filter(chat => chat.firstChild);
    return this.setChats(chatsData, options);
  }
  async setData(data, options) {
    await this.promise('GetReady!');

    const chatsData = data.filter(d => d.chat).map(d =>
      Object.assign({text: d.chat.content || '', cmd: d.chat.mail || ''}, d.chat));
    return this.setChats(chatsData, options);
  }
  async setChats(chatsData, options = {}) {

    this._options = options;

    window.console.time('コメントのパース処理');
    const nicoScripter = this.nicoScripter;
    if (!options.append) {
      this.topGroup.reset();
      this.nakaGroup.reset();
      this.bottomGroup.reset();
      nicoScripter.reset();
    }
    const videoDuration = this._duration = parseInt(options.duration || 0x7FFFFF);
    const maxCommentsByDuration = this.constructor.getMaxCommentsByDuration(videoDuration);
    const mainThreadId = options.mainThreadId || 0;
    let nicoChats = [];

    const top = [], bottom = [], naka = [];
    const create = options.format !== 'xml' ? NicoChat.create : NicoChat.createFromChatElement;
    for (let i = 0, len = Math.min(chatsData.length, MAX_COMMENT); i < len; i++) {
      const chat = chatsData[i];

      const nicoChat = create(chat, {videoDuration, mainThreadId});
      if (nicoChat.isDeleted) {
        continue;
      }

      if (nicoChat.isNicoScript) {
        nicoScripter.add(nicoChat);
      }
      nicoChats.push(nicoChat);
    }
    nicoChats = []
      .concat(...
        nicoChats.filter(c => (c.isPatissier || c.isCA) && c.fork < 1 && c.isSubThread)
          .splice(maxCommentsByDuration))
      .concat(...
        nicoChats.filter(c => (c.isPatissier || c.isCA) && c.fork < 1 && !c.isSubThread)
          .splice(maxCommentsByDuration))
      .concat(...nicoChats.filter(c => !(c.isPatissier || c.isCA) || c.fork > 0));
      window.console.timeLog('コメントのパース処理', 'NicoChat created');

    if (_.isObject(options.replacement) && _.size(options.replacement) > 0) {
      window.console.time('コメント置換フィルタ適用');
      this._wordReplacer = this.buildWordReplacer(options.replacement);
      this._preProcessWordReplacement(nicoChats, this._wordReplacer);
      window.console.timeEnd('コメント置換フィルタ適用');
    } else {
      this._wordReplacer = null;
    }

    if (options.append) {
      nicoChats = nicoChats.filter(chat => {
        return !this.topGroup.includes(chat) && !this.nakaGroup.includes(chat) && !this.bottomGroup.includes(chat);
      });
    }

    let minTime = Date.now();
    let maxTime = 0;
    for (const c of nicoChats) {
      minTime = Math.min(minTime, c.date);
      maxTime = Math.max(maxTime, c.date);
    }
    const timeDepth = maxTime - minTime;
    for (const c of nicoChats) {
      c.time3d = c.date - minTime;
      c.time3dp = c.time3d / timeDepth;
    }

    if (!nicoScripter.isEmpty) {
      window.console.time('ニコスクリプト適用');
      nicoScripter.apply(nicoChats);
      window.console.timeEnd('ニコスクリプト適用');
      const nextVideo = nicoScripter.getNextVideo();
      window.console.info('nextVideo', nextVideo);
      if (nextVideo) {
        this.emitAsync('command', 'nextVideo', nextVideo);
      }
    }

    const TYPE = NicoChat.TYPE;
    for (const nicoChat of nicoChats) {
      switch(nicoChat.type) {
        case TYPE.TOP:
          top.push(nicoChat);
          break;
        case TYPE.BOTTOM:
          bottom.push(nicoChat);
          break;
        default:
          naka.push(nicoChat);
          break;
      }
    }

    this.topGroup.addChatArray(top);
    this.nakaGroup.addChatArray(naka);
    this.bottomGroup.addChatArray(bottom);

    window.console.timeEnd('コメントのパース処理');
    console.log('chats: ', chatsData.length);
    console.log('top: ', this.topGroup.nonFilteredMembers.length);
    console.log('naka: ', this.nakaGroup.nonFilteredMembers.length);
    console.log('bottom: ', this.bottomGroup.nonFilteredMembers.length);
    this.emit('parsed');
  }

  /**
   * コメント置換器となる関数を生成
   * なにがやりたかったのやら
   */
  buildWordReplacer(replacement) {
    let func = text => text;

    const makeFullReplacement = (f, src, dest) => {
      return text => f(text.indexOf(src) >= 0 ? dest : text);
    };

    const makeRegReplacement = (f, src, dest) => {
      const reg = new RegExp(textUtil.escapeRegs(src), 'g');
      return text => f(text.replace(reg, dest));
    };

    for (const key of Object.keys(replacement)) {
      if (!key) {
        continue;
      }
      const val = replacement[key];
      window.console.log('コメント置換フィルタ: "%s" => "%s"', key, val);

      if (key.charAt(0) === '*') {
        func = makeFullReplacement(func, key.substr(1), val);
      } else {
        func = makeRegReplacement(func, key, val);
      }
    }

    return func;
  }
  /**
   * 投稿者が設定したコメント置換フィルタを適用する
   */
  _preProcessWordReplacement(group, replacementFunc) {
    for (const nicoChat of group) {
      const text = nicoChat.text;
      const newText = replacementFunc(text);
      if (text !== newText) {
        nicoChat.text = newText;
      }
    }
  }
  get chatList() {
    return {
      top: this.topGroup.members,
      naka: this.nakaGroup.members,
      bottom: this.bottomGroup.members
    };
  }
  get nonFilteredChatList() {
    return {
      top: this.topGroup.nonFilteredMembers,
      naka: this.nakaGroup.nonFilteredMembers,
      bottom: this.bottomGroup.nonFilteredMembers
    };
  }
  addChat(nicoChat) {
    if (nicoChat.isDeleted) {
      return;
    }
    const type = nicoChat.type;
    if (this._wordReplacer) {
      nicoChat.text = this._wordReplacer(nicoChat.text);
    }

    if (!this.nicoScripter.isEmpty) {
      window.console.time('ニコスクリプト適用');
      this.nicoScripter.apply([nicoChat]);
      window.console.timeEnd('ニコスクリプト適用');
    }

    let group;
    switch (type) {
      case NicoChat.TYPE.TOP:
        group = this.topGroup;
        break;
      case NicoChat.TYPE.BOTTOM:
        group = this.bottomGroup;
        break;
      default:
        group = this.nakaGroup;
        break;
    }

    group.addChat(nicoChat, group);
    this.emit('addChat');
  }
  /**
   * コメントの内容が変化した通知
   * NG設定、フィルタ反映時など
   */
  _onChange(e) {
    console.log('NicoComment.onChange: ', e);
    e = e || {};
    const ev = {
      nicoComment: this,
      group: e.group,
      chat: e.chat
    };
    this.emit('change', ev);
  }
  _onFilterChange() {
    this.emit('filterChange', this._nicoChatFilter);
  }
  clear() {
    this._xml = '';
    this.topGroup.reset();
    this.nakaGroup.reset();
    this.bottomGroup.reset();
    this.emit('clear');
  }
  get currentTime() {
    return this._currentTime;
  }
  set currentTime(sec) {
    this._currentTime = sec;

    this.topGroup.currentTime = sec;
    this.nakaGroup.currentTime = sec;
    this.bottomGroup.currentTime = sec;

    this.nicoScripter.currentTime = sec;

    this.emit('currentTime', sec);
  }
  seek(time) { this.currentTime = time; }
  set vpos(vpos) { this.currentTime = vpos / 100; }
  getGroup(type) {
    switch (type) {
      case NicoChat.TYPE.TOP:
        return this.topGroup;
      case NicoChat.TYPE.BOTTOM:
        return this.bottomGroup;
      default:
        return this.nakaGroup;
    }
  }
  /**
   * @returns {NicoChatFilter}
   */
  get filter() {return this._nicoChatFilter;}
}

//===END===

export {NicoComment};