import {Emitter} from '../../../lib/src/Emitter';
import {textUtil} from '../../../lib/src/text/textUtil';
import {Config} from '../../../../src/Config';

//===BEGIN===
class NicoChatFilter extends Emitter {
  constructor(params) {
    super();
    this._sharedNgLevel = params.sharedNgLevel || NicoChatFilter.SHARED_NG_LEVEL.MID;

    this._wordFilterList = [];
    this._userIdFilterList = [];
    this._commandFilterList = [];
    this.wordFilterList = params.wordFilter || '';
    this.userIdFilterList = params.userIdFilter || '';
    this.commandFilterList = params.commandFilter || '';

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
  set isEnable(v) {
    v = !!v;
    if (this._enable !== v) {
      this._enable = v;
      this._onChange();
    }
  }
  get isEnable() {
    return this._enable;
  }
  addWordFilter(text) {
    let before = this._wordFilterList.join('\n');
    this._wordFilterList.push((text || '').trim());
    this._wordFilterList = [...new Set(this._wordFilterList)];
    let after = this._wordFilterList.join('\n');
    if (before !== after) {
      this._wordReg = null;
      this._onChange();
    }
  }
  set wordFilterList(list) {
    list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];

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
  }
  get wordFilterList() {
    return this._wordFilterList;
  }

  setWordRegFilter(source, flags) {
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
  }

  addUserIdFilter(text) {
    const before = this._userIdFilterList.join('\n');
    this._userIdFilterList.push(text);
    this._userIdFilterList = [...new Set(this._userIdFilterList)];
    const after = this._userIdFilterList.join('\n');
    if (before !== after) {
      this._userIdReg = null;
      this._onChange();
    }
  }
  set userIdFilterList(list) {
    list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];

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
  }
  get userIdFilterList() {
    return this._userIdFilterList;
  }
  addCommandFilter(text) {
    let before = this._commandFilterList.join('\n');
    this._commandFilterList.push(text);
    this._commandFilterList = [...new Set(this._commandFilterList)];
    let after = this._commandFilterList.join('\n');
    if (before !== after) {
      this._commandReg = null;
      this._onChange();
    }
  }
  set commandFilterList(list) {
    list = [...new Set(typeof list === 'string' ? list.trim().split('\n') : list)];

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
  }
  get commandFilterList() {
    return this._commandFilterList;
  }

  set sharedNgLevel(level) {
    if (NicoChatFilter.SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
      this._sharedNgLevel = level;
      this._onChange();
    }
  }
  get sharedNgLevel() {
    return this._sharedNgLevel;
  }
  getFilterFunc() {
    if (!this._enable) {
      return () => true;
    }
    const threthold = NicoChatFilter.SHARED_NG_SCORE[this._sharedNgLevel];

    // NG設定の数×コメント数だけループを回すのはアホらしいので、
    // 連結した一個の正規表現を生成する
    if (!this._wordReg) {
      this._wordReg = this._buildFilterReg(this._wordFilterList);
    }
    const umatch = this._userIdFilterList.length ? this._userIdFilterList : null;
    if (!this._commandReg) {
      this._commandReg = this._buildFilterReg(this._commandFilterList);
    }
    const wordReg = this._wordReg;
    const wordRegReg = this._wordRegReg;
    const commandReg = this._commandReg;

    if (Config.getValue('debug')) {
      return nicoChat => {
        if (nicoChat.fork > 0) {
          return true;
        }
        const score = nicoChat.score;
        if (score <= threthold) {
          window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
            score,
            threthold,
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }
        let m;
        wordReg && (m = wordReg.exec(nicoChat.text));
        if (m) {
          window.console.log('%cNGワード: "%s" %s %s秒 %s', 'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }

        wordRegReg && (m = wordRegReg.exec(nicoChat.text));
        if (m) {
          window.console.log(
            '%cNGワード(正規表現): "%s" %s %s秒 %s',
            'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.text
          );
          return false;
        }

        if (umatch && umatch.includes(nicoChat.userId)) {
          window.console.log('%cNGID: "%s" %s %s秒 %s %s', 'background: yellow;',
            nicoChat.userId,
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.userId,
            nicoChat.text
          );
          return false;
        }
        commandReg && (m = commandReg.test(nicoChat.cmd));
        if (m) {
          window.console.log('%cNG command: "%s" %s %s秒 %s %s', 'background: yellow;',
            m[1],
            nicoChat.type,
            nicoChat.vpos / 100,
            nicoChat.cmd,
            nicoChat.text
          );
          return false;
        }

        return true;
      };
    }

    return nicoChat => {
      if (nicoChat.fork > 0) {
        return true;
      }
      const text = nicoChat.text;
      return !(
        (nicoChat.score <= threthold) ||
        (wordReg && wordReg.test(text)) ||
        (wordRegReg && wordRegReg.test(text)) ||
        (umatch && umatch.includes(nicoChat.userId)) ||
        (commandReg && commandReg.test(nicoChat.cmd))
        );
    };
  }
  applyFilter(nicoChatArray) {
    let before = nicoChatArray.length;
    if (before < 1) {
      return nicoChatArray;
    }
    let timeKey = 'applyNgFilter: ' + nicoChatArray[0].type;
    window.console.time(timeKey);
    let filterFunc = this.getFilterFunc();
    let result = nicoChatArray.filter(filterFunc);
    window.console.timeEnd(timeKey);
    window.console.log('NG判定結果: %s/%s', result.length, before);
    return result;
  }
  isSafe(nicoChat) {
    return (this.getFilterFunc())(nicoChat);
  }
  _buildFilterReg(filterList) {
    if (filterList.length < 1) {
      return null;
    }
    const escapeRegs = textUtil.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('(' + r.join('|') + ')', 'i');
  }
  _buildFilterPerfectMatchinghReg(filterList) {
    if (filterList.length < 1) {
      return null;
    }
    const escapeRegs = textUtil.escapeRegs;
    let r = filterList.filter(f => f).map(f => escapeRegs(f));
    return new RegExp('^(' + r.join('|') + ')$');
  }
  _onChange() {
    console.log('NicoChatFilter.onChange');
    this.emit('change');
  }
}

NicoChatFilter.SHARED_NG_LEVEL = {
  NONE: 'NONE',
  LOW: 'LOW',
  MID: 'MID',
  HIGH: 'HIGH',
  MAX: 'MAX'
};
NicoChatFilter.SHARED_NG_SCORE = {
  NONE: -99999,//Number.MIN_VALUE,
  LOW: -10000,
  MID: -5000,
  HIGH: -1000,
  MAX: -1
};

//===END===
export {NicoChatFilter};

// return nicoChat => {
//   if (nicoChat.fork > 0) {
//     return true;
//   }

//   if (nicoChat.score <= threthold) {
//     return false;
//   }

//   if (wordReg && wordReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (wordRegReg && wordRegReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (userIdReg && userIdReg.test(nicoChat.text)) {
//     return false;
//   }

//   if (commandReg && commandReg.test(nicoChat.cmd)) {
//     return false;
//   }

//   return true;
// };
// }
