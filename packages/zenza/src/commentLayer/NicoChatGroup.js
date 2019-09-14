import {Emitter} from '../../../lib/src/Emitter';
import {NicoChatFilter} from './NicoChatFilter';

//===BEGIN===
class NicoChatGroup extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  initialize(nicoComment, type, params) {
    this._type = type;

    this._nicoChatFilter = params.nicoChatFilter;
    this._nicoChatFilter.on('change', this._onFilterChange.bind(this));

    this.reset();
  }
  reset() {
    this._members = [];
    this._filteredMembers = [];
  }
  addChatArray(nicoChatArray) {
    let members = this._members;
    let newMembers = [];
    for (const nicoChat of nicoChatArray) {
      newMembers.push(nicoChat);
      members.push(nicoChat);
      nicoChat.group = this;
    }

    newMembers = this._nicoChatFilter.applyFilter(nicoChatArray);
    if (newMembers.length > 0) {
      this._filteredMembers = this._filteredMembers.concat(newMembers);
      this.emit('addChatArray', newMembers);
    }
  }
  addChat(nicoChat) {
    this._members.push(nicoChat);
    nicoChat.group = this;

    if (this._nicoChatFilter.isSafe(nicoChat)) {
      this._filteredMembers.push(nicoChat);
      this.emit('addChat', nicoChat);
    }
  }
  get type() {return this._type;}
  get members() {
    if (this._filteredMembers.length > 0) {
      return this._filteredMembers;
    }
    return this._filteredMembers = this._nicoChatFilter.applyFilter(this._members);
  }
  get nonFilteredMembers() { return this._members; }
  onChange(e) {
    console.log('NicoChatGroup.onChange: ', e);
    this._filteredMembers = [];
    this.emit('change', {
      chat: e,
      group: this
    });
  }
  _onFilterChange() {
    this._filteredMembers = [];
    this.onChange(null);
  }
  get currentTime() {return this._currentTime;}
  set currentTime(sec) {
    this._currentTime = sec;
    let m = this._members;
    for (let i = 0, len = m.length; i < len; i++) {
      m[i].currentTime = sec;
    }
  }
  setSharedNgLevel(level) {
    if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this.onChange(null);
    }
  }
  includes(nicoChat) {
    const uno = nicoChat.uniqNo;
    return this._members.find(m => m.uniqNo === uno);
  }
}

//===END===

export {NicoChatGroup};