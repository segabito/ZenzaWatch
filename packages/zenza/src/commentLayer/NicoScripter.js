import {Emitter} from '../../../lib/src/Emitter';
import {textUtil} from '../../../lib/src/text/textUtil';

//===BEGIN===

class NicoScriptParser {
  static get parseId() {
    if (!NicoScriptParser._count) {
      NicoScriptParser._count = 1;
    }
    return NicoScriptParser._count++;
  }

  static parseNiwango(lines) {
    // 構文はいったん無視して、対応できる命令だけ拾っていく。
    // ニワン語のフル実装は夢
    let type, params, m;
    let result = [];
    for (let i = 0, len = lines.length; i < len; i++) {
      let text = lines[i];
      const id = NicoScriptParser.parseId;
      if ((m = /^\/?replace\((.*?)\)/.exec(text)) !== null) {
        type = 'REPLACE';
        params = NicoScriptParser.parseReplace(m[1]);
        result.push({id, type, params});
      } else if ((m = /^\/?commentColor\s*=\s*0x([0-9a-f]{6})/i.exec(text)) !== null) {
        result.push({id, type: 'COLOR', params: {color: '#' + m[1]}});
      } else if ((m = /^\/?seek\((.*?)\)/i.exec(text)) !== null) {
        params = NicoScriptParser.parseSeek(m[1]);
        result.push({id, type: 'SEEK', params});
      }
    }
    return result;
  }


  static parseParams(str) {
    // 雑なパース
    let result = {}, v = '', lastC = '', key, isStr = false, quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ':':
          key = v.trim();
          v = '';
          break;
        case ',':
          if (isStr) {
            v += c;
          }
          else {
            if (key !== '' && v !== '') {
              result[key] = v.trim();
            }
            key = v = '';
          }
          break;
        case ' ':
          if (v !== '') {
            v += c;
          }
          break;
        case '\'':
        case '"':
          if (v !== '') {
            if (quot !== c) {
              v += c;
            } else if (isStr) {
              if (lastC === '\\') {
                v += c;
              }
              else {
                if (quot === '"') {
                  // ダブルクォートの時だけエスケープがあるらしい
                  v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
                }
                result[key] = v;
                key = v = '';
                isStr = false;
              }
            } else {
              window.console.error('parse fail?', isStr, lastC, str);
              return null;
            }
          } else {
            quot = c;
            isStr = true;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (key !== '' && v !== '') {
      result[key] = v.trim();
    }

    return result;
  }

  static parseNicosParams(str) {
    // 雑なパース
    let result = [], v = '', lastC = '', quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ' ':
        case '　':
          if (quot) {
            v += c;
          } else {
            if (v !== '') {
              result.push(v);
              v = quot = '';
            }
          }
          break;
        case '\'':
        case '"':
          if (v !== '') {
            if (quot !== c) {
              v += c;
            } else {
              if (lastC === '\\') {
                v += c;
              }
              else {
                v = v.replace(/(\\r|\\n)/g, '\n').replace(/(\\t)/g, '\t');
                result.push(v);
                v = quot = '';
              }
            }
          } else {
            quot = c;
          }
          break;
        case '「':
          if (v !== '') {
            v += c;
          } else {
            quot = c;
          }
          break;
        case '」':
          if (v !== '') {
            if (quot !== '「') {
              v += c;
            } else {
              if (lastC === '\\') {
                v += c;
              }
              else {
                result.push(v);
                v = quot = '';
              }
            }
          } else {
            v += c;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (v !== '') {
      result.push(v.trim());
    }

    return result;
  }

  static parseNicos(text) {
    text = text.trim();
    let text1 = (text || '').split(/[ 　:：]+/)[0]; // eslint-disable-line
    let params;
    let type;
    switch (text1) {
      case '@デフォルト':
      case '＠デフォルト':
        type = 'DEFAULT';
        break;
      case '@逆':
      case '＠逆':
        type = 'REVERSE';
        params = NicoScriptParser.parse逆(text);
        break;
      case '@ジャンプ':
      case '＠ジャンプ':
        params = NicoScriptParser.parseジャンプ(text);
        type = params.type;
        break;
      case '@ジャンプマーカー':
      case '＠ジャンプマーカー':
        type = 'MARKER'; //@ジャンプマーカー：ループ
        params = NicoScriptParser.parseジャンプマーカー(text);
        break;
      default:
        if (text.indexOf('@置換') === 0 || text.indexOf('＠置換') === 0) {
          type = 'REPLACE';
          params = NicoScriptParser.parse置換(text);
        } else {
          type = 'PIPE';
          let lines = NicoScriptParser.splitLines(text);
          params = NicoScriptParser.parseNiwango(lines);
        }
    }

    const id = NicoScriptParser.parseId;
    return {id, type, params};
  }

  static splitLines(str) {
    let result = [], v = '', lastC = '', isStr = false, quot = '';
    for (let i = 0, len = str.length; i < len; i++) {
      let c = str.charAt(i);
      switch (c) {
        case ';':
          if (isStr) {
            v += c;
          }
          else {
            result.push(v.trim());
            v = '';
          }
          break;
        case ' ':
          if (v !== '') {
            v += c;
          }
          break;
        case '\'':
        case '"':
          if (isStr) {
            if (quot === c) {
              if (lastC !== '\\') {
                isStr = false;
              }
            }
            v += c;
          } else {
            quot = c;
            isStr = true;
            v += c;
          }
          break;
        default:
          v += c;
      }
      lastC = c;
    }
    if (v !== '') {
      result.push(v.trim());
    }

    return result;
  }


  static parseReplace(str) {
    let result = NicoScriptParser.parseParams(str);

    if (!result) {
      return null;
    }
    return {
      src: result.src,
      dest: result.dest || '',
      fill: result.fill === 'true' ? true : false,
      target: result.target || 'user',
      partial: result.partial === 'false' ? false : true
    };
  }


  static parseSeek(str) {
    let result = NicoScriptParser.parseParams(str);
    if (!result) {
      return null;
    }
    return {
      time: result.vpos
    };
  }


  static parse置換(str) {
    let tmp = NicoScriptParser.parseNicosParams(str);
    //＠置換 キーワード 置換後 置換範囲 投コメ 一致条件
    //＠置換 "И"       "██" 単       投コメ

    // 投稿者コメントを含めるかどうか
    let target = 'user'; // '投コメ'
    if (tmp[4] === '含む' || tmp[4] === '全') { // マニュアルにはないが '全' もあるらしい
      target = 'owner user';
    } else if (tmp[4] === '投コメ') {
      target = 'owner';
    }
    return {
      src: tmp[1],
      dest: tmp[2] || '',
      fill: tmp[3] === '全' ? true : false,          //全体を置き換えるかどうか
      target, //(tmp[4] === '含む' || tmp[4] === '投コメ')     ? 'owner user' : 'user',
      partial: tmp[5] === '完全一致' ? false : true           // 完全一致のみを見るかどうか
    };
  }


  static parse逆(str) {
    let tmp = NicoScriptParser.parseNicosParams(str);
    /* eslint-disable */
    //＠逆　投コメ
    /* eslint-enable */
    let target = (tmp[1] || '').trim();
    //＠置換キーワード置換後置換範囲投コメ一致条件
    return {
      target: (target === 'コメ' || target === '投コメ') ? target : '全',
    };
  }


  static parseジャンプ(str) {
    //＠ジャンプ ジャンプ先 メッセージ 再生開始位置 戻り秒数 戻りメッセージ
    let tmp = NicoScriptParser.parseNicosParams(str);
    let target = tmp[1] || '';
    let type = 'JUMP';
    let time = 0;
    let m;
    if ((m = /^#(\d+):(\d+)$/.test(target)) !== null) {
      type = 'SEEK';
      time = m[1] * 60 + m[2] * 1;
    } else if ((m = /^#(\d+):(\d+\.\d+)$/.test(target)) !== null) {
      type = 'SEEK';
      time = m[1] * 60 + m[2] * 1;
    } else if ((m = /^(#|＃)(.+)/.test(target)) !== null) {
      type = 'SEEK_MARKER';
      time = m[2];
    }
    return {target, type, time};
  }


  static parseジャンプマーカー(str) {
    let tmp = NicoScriptParser.parseNicosParams(str);
    let name = tmp[0].split(/[:： 　]/)[1]; // eslint-disable-line
    return {name};
  }

}


class NicoScripter extends Emitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this._hasSort = false;
    this._list = [];
    this._eventScript = [];
    this._nextVideo = null;
    this._marker = {};
    this._inviewEvents = {};
    this._currentTime = 0;
    this._eventId = 0;
  }

  add(nicoChat) {
    this._hasSort = false;
    this._list.push(nicoChat);
  }

  get isExist() {
    return this._list.length > 0;
  }

  getNextVideo() {
    return this._nextVideo || '';
  }

  getEventScript() {
    return this._eventScript || [];
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(v) {
    this._currentTime = v;
    if (this._eventScript.length > 0) {
      this._updateInviewEvents();
    }
  }

  _sort() {
    if (this._hasSort) {
      return;
    }
    const list = this._list.concat().sort((a, b) => {
      const av = a.vpos, bv = b.vpos;
      if (av !== bv) {
        return av - bv;
      } else {
        return a.no < b.no ? -1 : 1;
      }
    });
    this._list = list;
    this._hasSort = true;
  }

  _updateInviewEvents() {
    const ct = this._currentTime;
    this._eventScript.forEach(({p, nicos}) => {
      const beginTime = nicos.vpos / 100;
      const endTime = beginTime + nicos.duration;
      if (beginTime > ct || endTime < ct) {
        delete this._inviewEvents[p.id];
        return;
      }
      if (this._inviewEvents[p.id]) {
        return;
      }
      this._inviewEvents[p.id] = true;
      let diff = nicos.vpos / 100 - ct;
      diff = Math.min(1, Math.abs(diff)) * (diff / Math.abs(diff));
      switch (p.type) {
        case 'SEEK':
          this.emit('command', 'nicosSeek', Math.max(0, p.params.time * 1 + diff));
          break;
        case 'SEEK_MARKER': {
          let time = this._marker[p.params.time] || 0;
          this.emit('command', 'nicosSeek', Math.max(0, time + diff));
          break;
        }
      }
    });
  }

  apply(group) {
    this._sort();
    const assigned = {};

    // どうせ全動画の1%も使われていないので
    // 最適化もへったくれもない
    const eventFunc = {
      'JUMP': (p, nicos) => {
        console.log('@ジャンプ: ', p, nicos);
        const target = p.params.target;
        if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
          this._nextVideo = target;
        }
      },
      'SEEK': (p, nicos) => {
        if (assigned[p.id]) {
          return;
        }
        assigned[p.id] = true;
        this._eventScript.push({p, nicos});
      },
      'SEEK_MARKER': (p, nicos) => {
        if (assigned[p.id]) {
          return;
        }
        assigned[p.id] = true;

        console.log('SEEK_MARKER: ', p, nicos);
        this._eventScript.push({p, nicos});
      },
      'MARKER': (p, nicos) => {
        console.log('@ジャンプマーカー: ', p, nicos);
        this._marker[p.params.name] = nicos.vpos / 100;
      }
    };

    const applyFunc = {
      DEFAULT(nicoChat, nicos) {
        let nicosColor = nicos.color;
        let hasColor = nicoChat.hasColorCommand;
        if (nicosColor && !hasColor) {
          nicoChat.color = nicosColor;
        }

        let nicosSize = nicos.size;
        let hasSize = nicoChat.hasSizeCommand;
        if (nicosSize && !hasSize) {
          nicoChat.size = nicosSize;
        }

        let nicosType = nicos.type;
        let hasType = nicoChat.hasTypeCommand;
        if (nicosType && !hasType) {
          nicoChat.type = nicosType;
        }

      },
      COLOR(nicoChat, nicos, params) {
        let hasColor = nicoChat.hasColorCommand;
        if (!hasColor) {
          nicoChat.color = params.color;
        }
      },
      REVERSE(nicoChat, nicos, params) {
        if (params.target === '全') {
          nicoChat.isReverse = true;
        } else if (params.target === '投コメ') {
          if (nicoChat.fork > 0) {
            nicoChat.isReverse = true;
          }
        } else if (params.target === 'コメ') {
          if (nicoChat.fork === 0) {
            nicoChat.isReverse = true;
          }
        }
      },
      REPLACE(nicoChat, nicos, params) {
        if (!params) {
          return;
        }
        // if (nicoChat.isNicoScript()) { return; }
        if (nicoChat.fork > 0 && (params.target || '').indexOf('owner') < 0) {
          return;
        }
        if (nicoChat.fork < 1 && params.target === 'owner') {
          return;
        }

        let isMatch = false;
        let text = nicoChat.text;

        if (params.partial === true) {
          isMatch = text.indexOf(params.src) >= 0;
        } else {
          isMatch = text === params.src;
        }
        if (!isMatch) {
          return;
        }

        if (params.fill === true) {
          text = params.dest;
        } else {// ＠置換 "~" "\n" 単 全
          let reg = new RegExp(textUtil.escapeRegs(params.src), 'g');
          text = text.replace(reg, params.dest);
        }
        nicoChat.text = text;

        let nicosColor = nicos.clor;
        let hasColor = nicoChat.hasColorCommand;
        if (nicosColor && !hasColor) {
          nicoChat.color = nicosColor;
        }

        let nicosSize = nicos.size;
        let hasSize = nicoChat.hasSizeCommand;
        if (nicosSize && !hasSize) {
          nicoChat.size = nicosSize;
        }

        let nicosType = nicos.type;
        let hasType = nicoChat.hasTypeCommand;
        if (nicosType && !hasType) {
          nicoChat.type = nicosType;
        }

      },
      PIPE(nicoChat, nicos, lines) {
        lines.forEach(line => {
          let type = line.type;
          let f = applyFunc[type];
          if (f) {
            f(nicoChat, nicos, line.params);
          }
        });
      }
    };


    this._list.forEach(nicos => {
      let p = NicoScriptParser.parseNicos(nicos.text);
      if (!p) {
        return;
      }
      if (!nicos.hasDurationSet) {
        nicos.duration = 99999;
      }

      let ev = eventFunc[p.type];
      if (ev) {
        return ev(p, nicos);
      }
      else if (p.type === 'PIPE') {
        p.params.forEach(line => {
          let type = line.type;
          let ev = eventFunc[type];
          if (ev) {
            return ev(line, nicos);
          }
        });
      }


      let func = applyFunc[p.type];
      if (!func) {
        return;
      }

      let beginTime = nicos.beginTime;
      let endTime = beginTime + nicos.duration;

      (group.members ? group.members : group).forEach(nicoChat => {
        if (nicoChat.isNicoScript) {
          return;
        }
        let ct = nicoChat.beginTime;

        if (beginTime > ct || endTime < ct) {
          return;
        }
        func(nicoChat, nicos, p.params);
      });
    });
  }
}


//===END===

export {
  NicoScripter,
  NicoScriptParser
};
/* eslint-disable */
//＠置換　U　「( ˘ω˘)ｽﾔｧ」 全
/* eslint-enable */

