//var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var AsyncEmitter = {};
var util = {};

//===BEGIN===

  var NicoScripter = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoScripter.prototype, AsyncEmitter.prototype);
  _.assign(NicoScripter.prototype, {
    initialize: function() {
      this.reset();
    },
    reset: function() {
      this._hasSort = false;
      this._list = [];
    },
    add: function(nicoChat) {
      this._hasSort = false;
      this._list.push(nicoChat);
    },
    isExist: function() {
      return this._list.length > 0;
    },
    getNextVideo: function() {
      return this._nextVideo || '';
    },
    getEventScript: function() {
      return this._eventScript || [];
    },
    _sort: function() {
      if (this._hasSort) { return; }
      var list = this._list.concat().sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) {
          return av - bv;
        } else {
          return a.getNo() < b.getNo() ? -1 : 1;
        }
      });
      this._list = list;
      this._hasSort = true;
    },
    _parseNicos: function(text) {
      text = text.trim();
      var text1 = (text || '').split(/[ 　]+/)[0];
      var params;
      var type;
      switch (text1) {
        case '@デフォルト': case '＠デフォルト':
          type = 'DEFAULT';
          break;
        case '@逆': case '＠逆':
          type = 'REVERSE';
          params = this._parse逆(text);
          break;
        case '@ジャンプ': case '＠ジャンプ':
          params = this._parseジャンプ(text);
          type = params.type;
          break;
        default:
          if (text.indexOf('@置換') === 0 || text.indexOf('＠置換') === 0) {
            type = 'REPLACE';
            params = this._parse置換(text);
          } else {
            type = 'PIPE';
            var lines = this._splitLines(text);
            params = this._parseNiwango(lines);
          }
      }
      return {
        type: type,
        params: params
      };
    },
    _parseNiwango: function(lines) {
      // 構文はいったん無視して、対応できる命令だけ拾っていく。
      // ニワン語のフル実装は夢
      var type, params;
      var result = [];
      for (var i = 0, len = lines.length; i < len; i++) {
        var text = lines[i];
        if (text.match(/^\/?replace\((.*?)\)/)) {
          type = 'REPLACE';
          params = this._parseReplace(RegExp.$1);
          result.push({type: type, params: params});
        }
      }
      return result;
    },
    _parseParams: function(str) {
      // 雑なパース
      var result = {}, v = '', lastC = '', key, isStr = false, quot = '';
      for (var i = 0, len = str.length; i < len; i++) {
        var c = str.charAt(i);
        switch (c) {
          case ':':
            key = v.trim();
            v = '';
            break;
          case ',':
            if (isStr) { v += c; }
            else {
              if (key !== '' && v !== '') { result[key] = v.trim(); }
              key = v = '';
            }
            break;
          case ' ':
            if (v !== '') { v+= c; }
            break;
          case "'": case '"':
            if (v !== '') {
              if (quot !== c) {
                v += c;
              } else if (isStr) {
                if (lastC === '\\') { v += c; }
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
      if (key !== '' && v !== '') { result[key] = v.trim(); }

      return result;
    },
    _parseNicosParams: function(str) {
      // 雑なパース
      var result = [], v = '', lastC = '', quot = '';
      for (var i = 0, len = str.length; i < len; i++) {
        var c = str.charAt(i);
        switch (c) {
          case ' ': case '　':
            if (quot) {
              v+= c;
            } else {
              if (v !== '') {
                result.push(v);
                v = quot = '';
              }
            }
            break;
          case "'": case '"':
            if (v !== '') {
              if (quot !== c) {
                v += c;
              } else {
                if (lastC === '\\') { v += c; }
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
          case "「":
            if (v !== '') {
              v += c;
            } else {
              quot = c;
            }
            break;
          case "」":
            if (v !== '') {
              if (quot !== "「") {
                v += c;
              } else {
                if (lastC === '\\') { v += c; }
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
      if (v !== '') { result.push(v.trim()); }

      return result;
     },
    _splitLines: function(str) {
      var result = [], v = '', lastC = '', isStr = false, quot = '';
      for (var i = 0, len = str.length; i < len; i++) {
        var c = str.charAt(i);
        switch (c) {
          case ';':
            if (isStr) { v += c; }
            else {
              result.push(v.trim());
              v = '';
            }
            break;
          case ' ':
            if (v !== '') { v += c; }
            break;
          case "'": case '"':
            if (isStr) {
              if (quot === c) {
                if (lastC !== '\\') { isStr = false; }
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
      if (v !== '') { result.push(v.trim()); }

      return result;
    },
    _parseReplace: function(str) {
      var result = this._parseParams(str);

      if (!result) { return null; }
      return {
        src:     result.src,
        dest:    result.dest || '',
        fill:    result.fill   === 'true' ? true : false,
        target:  result.target || 'user',
        partial: result.partial === 'false' ? false: true
      };
    },
    _parse置換: function(str) {
      var tmp = this._parseNicosParams(str);
      //＠置換キーワード置換後置換範囲投コメ一致条件
      return {
        src:  tmp[1],
        dest: tmp[2] || '',
        fill:    tmp[3] === '全'       ? true : false,          //全体を置き換えるかどうか
        target:  tmp[4] === '含む'     ? 'owner user' : 'user', // 投稿者コメントを含めるかどうか
        partial: tmp[5] === '完全一致' ? false : true           // 完全一致のみを見るかどうか
      };
    },
    _parse逆: function(str) {
      var tmp = this._parseNicosParams(str);
      //var tmp = str.split(/[ 　]+/);
      //＠逆　投コメ
      var target = (tmp[1] || '').trim();
      //＠置換キーワード置換後置換範囲投コメ一致条件
      return {
        target: (target === 'コメ' || target === '投コメ') ? target : '全',
      };
    },
    _parseジャンプ: function(str) {
      //＠ジャンプ ジャンプ先 メッセージ 再生開始位置 戻り秒数 戻りメッセージ
      var tmp = this._parseNicosParams(str);
      var target = tmp[1] || '';
      var type = 'JUMP';
      var time = 0;
      if (/^#(\d+):(\d+)$/.test(target)) {
        type = 'SEEK';
        time = RegExp.$1 * 60 + RegExp.$2 * 1;
      }
      return {target, type, time};
    },
    apply: function(group) {
      this._sort();
      // どうせ全動画の1%も使われていないので
      // 最適化もへったくれもない
      var applyFunc = {
        'DEFAULT': function(nicoChat, nicos) {
          var nicosColor = nicos.getColor();
          var hasColor = nicoChat.hasColorCommand();
          if (nicosColor && !hasColor) { nicoChat.setColor(nicosColor); }

          var nicosSize = nicos.getSize();
          var hasSize = nicoChat.hasSizeCommand();
          if (nicosSize && !hasSize) { nicoChat.setSize(nicosSize); }

          var nicosType = nicos.getType();
          var hasType = nicoChat.hasTypeCommand();
          if (nicosType && !hasType) { nicoChat.setType(nicosType); }

        },
        'REVERSE': function(nicoChat, nicos, params) {
          if (params.target === '全') {
            nicoChat.setIsReverse(true);
          } else if (params.target === '投コメ') {
            if (nicoChat.getFork() > 0)   { nicoChat.setIsReverse(true); }
          } else if (params.target === 'コメ') {
            if (nicoChat.getFork() === 0) { nicoChat.setIsReverse(true); }
          }
        },
        'REPLACE': function(nicoChat, nicos, params) {
          if (!params) { return; }
          if (nicoChat.getFork() > 0 && (params.target || '').indexOf('owner') < 0) { return; }

          var isMatch = false;
          var text = nicoChat.getText();

          if (params.partial === true) {
            isMatch = text.indexOf(params.src) >= 0;
          } else {
            isMatch = text === params.src;
          }
          if (!isMatch) { return; }
          
          if (params.fill === true) {
            text = params.dest;
          } else {
            var reg = new RegExp(util.escapeRegs(params.src), 'g');
            text = text.replace(reg, params.dest.replace(/\$/g, '\\$'));
          }
          nicoChat.setText(text);

          var nicosColor = nicos.getColor();
          var hasColor = nicoChat.hasColorCommand();
          if (nicosColor && !hasColor) { nicoChat.setColor(nicosColor); }

          var nicosSize = nicos.getSize();
          var hasSize = nicoChat.hasSizeCommand();
          if (nicosSize && !hasSize) { nicoChat.setSize(nicosSize); }

          var nicosType = nicos.getType();
          var hasType = nicoChat.hasTypeCommand();
          if (nicosType && !hasType) { nicoChat.setType(nicosType); }

        },
        'PIPE': function(nicoChat, nicos, lines) {
          lines.forEach(line => {
            var type = line.type;
            var f = applyFunc[type];
            if (f) {
              f(nicoChat, nicos, line.params);
            }
          });
        }
      };

      this._eventScript = [];
      this._nextVideo = null;
      var eventFunc = {
        'SEEK': (nicos) => {
          this._eventScript.push(nicos);
        },
        'JUMP': (nicos) => {
          window.console.log('@ジャンプ:', nicos);
          const target = nicos.params.target;
          if (/^([a-z]{2}|)[0-9]+$/.test(target)) {
            this._nextVideo = target;
          }
        }
      };
      

      this._list.forEach((nicos) => {
        var p = this._parseNicos(nicos.getText());
        if (!p) { return; }
        if (!nicos.hasDurationSet()) { nicos.setDuration(99999); }

        var ev = eventFunc[p.type];

        if (ev) { return ev(p); }

        var func = applyFunc[p.type];
        if (!func) { return; }

        var beginTime = nicos.getBeginTime();
        var endTime   = beginTime + nicos.getDuration();

        (group.getMembers ? group.getMembers : group).forEach((nicoChat) => {
          if (nicoChat.isNicoScript()) { return; }
          var ct = nicoChat.getBeginTime();

          if (beginTime > ct || endTime < ct) { return; }

          func(nicoChat, nicos, p.params);
        });
      });
    }
  });


//===END===

module.exports = {
  hoge: function() { return true; },
  parseParams: NicoScripter.prototype._parseParams,
  parseNicosParams: NicoScripter.prototype._parseNicosParams,
  splitLines: NicoScripter.prototype._splitLines
};

//＠置換　U　「( ˘ω˘)ｽﾔｧ」 全
