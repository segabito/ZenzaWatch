import {NicoChatViewModel} from './NicoChatViewModel';
import {CommentLayoutWorker} from './CommentLayoutWorker';
import {NicoChat} from './NicoChat';

//===BEGIN===
class NicoChatGroupViewModel {
  constructor(...args) {
    this.initialize(...args);
  }
  initialize(nicoChatGroup, offScreen) {
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

    this.addChatArray(nicoChatGroup.members);
  }
  _initWorker() {
    this._layoutWorker = CommentLayoutWorker.getInstance();
  }
  _onAddChatArray(nicoChatArray) {
    this.addChatArray(nicoChatArray);
  }
  _onAddChat(nicoChat) {
    this.addChat(nicoChat);
  }
  _onReset() {
    this.reset();
  }
  _onChange(e) {
    console.log('NicoChatGroupViewModel.onChange: ', e);
    window.console.time('_onChange');
    this.reset();
    this.addChatArray(this._nicoChatGroup.members);
    window.console.timeEnd('_onChange');
  }
  async _execCommentLayoutWorker() {
    if (this._members.length < 1) {
      return;
    }
    const type = this._members[0].type;
    // this._workerRequestId = `id:${type}-${Math.random()}`;

    const result = await this._layoutWorker.post({
      command: 'layout',
      params: {
        type,
        members: this.bulkLayoutData,
        lastUpdate: this._lastUpdate,
        // requestId: this._workerRequestId
      }
    });
    if (result.lastUpdate !== this._lastUpdate) {
      console.warn('group changed', this._lastUpdate, result.lastUpdate);
      return;
    }
    this.bulkLayoutData = result.members;
  }
  async addChatArray(nicoChatArray) {
    for (let i = 0, len = nicoChatArray.length; i < len; i++) {
      const nicoChat = nicoChatArray[i];
      const nc = NicoChatViewModel.create(nicoChat, this._offScreen);
      this._members.push(nc);
      if (i % 100 === 99) {
        await new Promise(r => setTimeout(r, 10));
      }
    }

    if (this._members.length < 1) {
      return;
    }

    this._lastUpdate = Date.now();
    this._execCommentLayoutWorker();
  }
  _onCommentSpeedRateUpdate() {
    this.changeSpeed(NicoChatViewModel.SPEED_RATE);
  }
  changeSpeed(speedRate = 1) {
    // TODO: y座標と弾幕判定はリセットしないといけない気がする
    for (const member of this._members) {
      member.recalcBeginEndTiming(speedRate);
    }
    this._execCommentLayoutWorker();
  }
  _groupCollision() {
    this._createVSortedMembers();
    let members = this._vSortedMembers;
    for (let i = 0, len = members.length; i < len; i++) {
      let o = members[i];
      this.checkCollision(o);
      o.isLayouted = true;
    }
  }
  addChat(nicoChat) {
    let timeKey = 'addChat:' + nicoChat.text;
    window.console.time(timeKey);
    let nc = NicoChatViewModel.create(nicoChat, this._offScreen);

    this._lastUpdate = Date.now();

    // 内部処理効率化の都合上、
    // 自身を追加する前に判定を行っておくこと
    this.checkCollision(nc);
    nc.isLayouted =true;

    this._members.push(nc);

    this._execCommentLayoutWorker();
    window.console.timeEnd(timeKey);
  }
  reset() {
    let m = this._members;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].reset();
    }

    this._members = [];
    this._vSortedMembers = [];
    this._lastUpdate = Date.now();
  }
  get currentTime() {return this._nicoChatGroup.currentTime;}
  get type() {return this._nicoChatGroup.type;}
  checkCollision(target) {
    if (target.isInvisible) {
      return;
    }

    const m = this._vSortedMembers;
    const beginLeft = target.beginLeftTiming;
    for (let i = 0, len = m.length; i < len; i++) {
      const o = m[i];

      // 自分よりうしろのメンバーには影響を受けないので処理不要
      if (o === target) {
        return;
      }

      if (beginLeft > o.endRightTiming) {
        continue;
      }

      if (o.checkCollision(target)) {
        target.moveToNextLine(o);

        // ずらした後は再度全チェックするのを忘れずに(再帰)
        if (!target.isOverflow) {
          this.checkCollision(target);
          return;
        }
      }
    }
  }
  get bulkLayoutData() {
    this._createVSortedMembers();
    const m = this._vSortedMembers;
    const result = [];
    for (let i = 0, len = m.length; i < len; i++) {
      result.push(m[i].bulkLayoutData);
    }
    return result;
  }
  set bulkLayoutData(data) {
    const m = this._vSortedMembers;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].bulkLayoutData = data[i];
    }
  }
  get bulkSlotData() {
    this._createVSortedMembers();
    let m = this._vSortedMembers;
    let result = [];
    for (let i = 0, len = m.length; i < len; i++) {
      let o = m[i];
      result.push({
        id: o.id,
        slot: o.slot,
        fork: o.fork,
        no: o.no,
        vpos: o.vpos,
        begin: o.inviewTiming,
        end: o.endRightTiming,
        invisible: o.isInvisible
      });
    }
    return result;
  }
  set bulkSlotData(data) {
    let m = this._vSortedMembers;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].slot = data[i].slot;
    }
  }
  /**
   * vposでソートされたメンバーを生成. 計算効率改善用
   */
  _createVSortedMembers() {
    this._vSortedMembers = this._members.concat().sort(NicoChat.SORT_FUNCTION);
    return this._vSortedMembers;
  }

  get members() {return this._members;}

  /**
   * 現時点で表示状態のメンバーのみを返す
   */
  get inViewMembers() {return this.getInViewMembersBySecond(this.currentTime);}
  // getMembers() {return this._members;}
  // getInViewMembers() {return this.inViewMembers;}

  /**
   * secの時点で表示状態のメンバーのみを返す
   */
  getInViewMembersBySecond(sec) {
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
  }
  getInViewMembersByVpos(vpos) {
    if (!this._hasLayout) {
      this._layout();
    }
    return this.getInViewMembersBySecond(vpos / 100);
  }
  export() {
    let result = [], m = this._members, len = m.length;

    result.push(['\t<group ',
      'type="', this._nicoChatGroup.type, '" ',
      'length="', m.length, '" ',
      '>'
    ].join(''));

    for (let i = 0; i < len; i++) {
      result.push(m[i].export());
    }

    result.push('\t</group>');
    return result.join('\n');
  }
  getCurrentTime() {return this.currentTime;}
  getType() {return this.type;}
}
//===END===
export {NicoChatGroupViewModel};