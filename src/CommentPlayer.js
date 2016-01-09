var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var Config = {};
var AsyncEmitter = {};
var PopupMessage = {};

//===BEGIN===


  // 大百科より
  var SHARED_NG_LEVEL = {
    NONE: 'NONE',
    LOW:  'LOW',
    MID:  'MID',
    HIGH: 'HIGH'
  };
  var SHARED_NG_SCORE = {
    NONE: -99999,//Number.MIN_VALUE,
    LOW:  -10000,
    MID:   -5000,
    HIGH:  -1000
  };

  /**
   * コメント描画まわり。MVVMもどき
   * 追加(投稿)はまだサポートしてない。
   *
   * Model
   *  コメントのデータ構造
   *
   * ViowModel
   *  コメントの表示位置・タイミング等を計算する担当。
   *  この実装ではあらかじめ全て計算してしまう。
   *  停止した時間の中で一生懸命ナイフを並べるDIOのような存在
   *
   * View
   *  そして時は動きだす・・・。
   *  ViewModelが算出した結果を基に実際の描画を担当する。
   *  あらかじめ全て計算済みなので、静的なHTMLを吐き出す事もできる。
   *  将来的にはChromecastのようなデバイスに描画したりすることも。
   *
   *  コメントを静的なCSS3アニメーションとして保存
   *  console.log(ZenzaWatch.debug.css3Player.toString())*
   */
  var NicoCommentPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(NicoCommentPlayer.prototype, AsyncEmitter.prototype);

  _.assign(NicoCommentPlayer.prototype, {
    initialize: function(params) {
      this._offScreen = params.offScreenLayer;

      this._model     = new NicoComment(params);
      this._viewModel = new NicoCommentViewModel(this._model, params.offScreenLayer);
      this._view      = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel,
        playbackRate: params.playbackRate,
        show: params.showComment
      });

      this._model.on('change', $.proxy(this._onCommentChange, this));
      this._model.on('parsed', $.proxy(this._onCommentParsed, this));

      this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;

      ZenzaWatch.debug.nicoCommentPlayer = this;
    },
    setComment: function(xml) {
      var parser = new DOMParser();
      if (typeof xml.getElementsByTagName === 'function') {
        this._model.setXml(xml);
      } else if (typeof xml === 'string') {
        xml = parser.parseFromString(xml, 'text/xml');
        this._model.setXml(xml);
      } else {
        PopupMessage.alert('コメントの読み込み失敗');
      }
    },
    _onCommentChange: function(e) {
      console.log('onCommentChange', e);
      if (this._view) {
        ZenzaWatch.util.callAsync(function() {
          this._view.refresh();
        }, this);
      }
    },
    _onCommentParsed: function() {
      this.emit('parsed');
    },
    getCss3PlayerHtml: function() {
      console.log('createCss3PlayerHtml...');

      if (this._view) {
        return this._view.toString();
      }

      this._view = new NicoCommentCss3PlayerView({
        viewModel: this._viewModel
      });
      return this._view.toString();
    },
    setCurrentTime: function(sec) {
      this._model.setCurrentTime(sec);
    },
    setVpos: function(vpos) {
      this._model.setCurrentTime(vpos / 100);
    },
    getCurrentTime: function() {
      return this._model.getCurrentTime();
    },
    getVpos: function() {
      return this._model.getCurrentTime() * 100;
    },
    setVisibility: function(v) {
      if (v) {
        this._view.show();
      } else {
        this._view.hide();
      }
    },
    addChat: function(text, cmd, vpos, options) {
      if (typeof vpos !== 'number') {
        vpos = this.getVpos();
      }
      var nicoChat = NicoChat.create(text, cmd, vpos, options);
      this._model.addChat(nicoChat);

      return nicoChat;
    },
    setPlaybackRate: function(playbackRate) {
      if (this._view && this._view.setPlaybackRate) {
        this._view.setPlaybackRate(playbackRate);
      }
    },
    setAspectRatio: function(ratio) {
      this._view.setAspectRatio(ratio);
    },
    appendTo: function($node) {
      this._view.appendTo($node);
    },
    show: function() {
      this._view.show();
    },
    hide: function() {
      this._view.hide();
    },
    close: function() {
      this._model.clear();
    },
    setSharedNgLevel: function(level) {
      this._model.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._model.getSharedNgLevel();
    },
    getAllChat: function() {
      return this._model.getAllChat();
    },
    toString: function() {
      return this._viewModel.toString();
    }
  });




  var NicoComment = function() { this.initialize.apply(this, arguments); };
  NicoComment.MAX_COMMENT = 5000;

  _.assign(NicoComment.prototype, {
    initialize: function(params) {
      this._currentTime = 0;
      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;

      this._topGroup    = new NicoChatGroup(this, NicoChat.TYPE.TOP,    params);
      this._normalGroup = new NicoChatGroup(this, NicoChat.TYPE.NORMAL, params);
      this._bottomGroup = new NicoChatGroup(this, NicoChat.TYPE.BOTTOM, params);
      this._topGroup   .on('change', $.proxy(this._onChange, this));
      this._normalGroup.on('change', $.proxy(this._onChange, this));
      this._bottomGroup.on('change', $.proxy(this._onChange, this));
    },
    setXml: function(xml) {
      window.console.time('NicoComment.setXml');

      this._xml = xml;
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();

      var chats = xml.getElementsByTagName('chat');

      var top = [], bottom = [], normal = [];
      for (var i = 0, len = Math.min(chats.length, NicoComment.MAX_COMMENT); i < len; i++) {
        var chat = chats[i];
        if (!chat.firstChild) continue;

        var nicoChat = new NicoChat(chat);

        if (nicoChat.isDeleted()) { continue; }

        var type = nicoChat.getType();
        var group;
        switch (type) {
          case NicoChat.TYPE.TOP:
            group = top;
            break;
          case NicoChat.TYPE.BOTTOM:
            group = bottom;
            break;
          default:
            group = normal;
            break;
        }
        group.push(nicoChat);
      }
      this._topGroup   .addChatArray(top);
      this._normalGroup.addChatArray(normal);
      this._bottomGroup.addChatArray(bottom);

      window.console.timeEnd('NicoComment.setXml');
      console.log('chats: ', chats.length);
      console.log('top: ',    this._topGroup   .getNonFilteredMembers().length);
      console.log('normal: ', this._normalGroup.getNonFilteredMembers().length);
      console.log('bottom: ', this._bottomGroup.getNonFilteredMembers().length);
      this.emit('parsed');
    },
    getAllChat: function() {
      return {
        top:    this._topGroup   .getNonFilteredMembers(),
        normal: this._normalGroup.getNonFilteredMembers(),
        bottom: this._bottomGroup.getNonFilteredMembers()
      };
    },
    addChat: function(nicoChat) {
      if (nicoChat.isDeleted()) { return; }
      var type = nicoChat.getType();
      var group;
      switch (type) {
        case NicoChat.TYPE.TOP:
          group = this._topGroup;
          break;
        case NicoChat.TYPE.BOTTOM:
          group = this._bottomGroup;
          break;
        default:
          group = this._normalGroup;
          break;
      }
      group.addChat(nicoChat, group);
      this.emit('addChat');
    },
    /**
     * コメントの内容が変化した通知
     * NG設定、フィルタ反映時など
     */
    _onChange: function(e) {
      console.log('NicoComment.onChange: ', e);
      var ev = {
        nicoComment: this,
        group: e.group,
        chat: e.chat
      };
      this.emit('change', ev);
    },
    clear: function() {
      this._xml = '';
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();
      this.emit('clear');
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;

      this._topGroup   .setCurrentTime(sec);
      this._normalGroup.setCurrentTime(sec);
      this._bottomGroup.setCurrentTime(sec);

      this.emit('currentTime', sec);
    },
    seek: function(time) {
      this.setCurrentTime(time);
    },
    setVpos: function(vpos) {
      this.setCurrentTime(vpos / 100);
    },
    getGroup: function(type) {
      switch (type) {
        case NicoChat.TYPE.TOP:
          return this._topGroup;
        case NicoChat.TYPE.BOTTOM:
          return this._bottomGroup;
        default:
          return this._normalGroup;
      }
    },
    setSharedNgLevel: function(level) {
      if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
        this._sharedNgLevel = level;
        this._topGroup   .setSharedNgLevel(level);
        this._normalGroup.setSharedNgLevel(level);
        this._bottomGroup.setSharedNgLevel(level);
        this.emit('sharedNgLevel', level);
      }
    },
    getSharedNgLevel: function() {
      return this._model.getSharedNgLevel();
    }
  });

  // フォントサイズ計算用の非表示レイヤーを取得
  // 変なCSSの影響を受けないように、DOM的に隔離されたiframe内で計算する。
  NicoComment.offScreenLayer = (function() {
    var __offscreen_tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="utf-8">
    <title>CommentLayer</title>
    <style type="text/css">
      .mincho  {font-family:  Simsun, monospace; }
      .gulim   {font-family:  Gulim,  monospace; }
      .mingLiu {font-family:  mingLiu,monospace; }

      .ue .mincho  , .shita .mincho {font-family:  Simsun, monospace; }
      .ue .gulim   , .shita .gulim  {font-family:  Gulim,  monospace; }
      .ue .mingLiu , .shita .mingLiu{font-family:  mingLiu,monospace; }

      .nicoChat {
        padding: 1px;
      }
      .nicoChat.big {
        line-height: 48px;
      }
      .nicoChat.big.noScale {
        line-height: 45px;
      }

      .backslash {
        font-family: Arial;
      }


      .nicoChat.medium {
        line-height: 30px;
      }
      .nicoChat.medium.noScale {
        line-height: 29px;
      }


      .nicoChat.small {
        line-height: 20px;
      }
      .nicoChat.small.noScale {
        line-height: 18px;
      }

      .nicoChat .zen_space {
        {*font-family: monospace;*}
      }
    </style>
    <body style="pointer-events: none;" >
    <div id="offScreenLayer"
      style="
        width: 4096px;
        height: 385px;
        overflow: visible;
        background: #fff;

        font-family: 'ＭＳ Ｐゴシック';
        letter-spacing: 1px;
        margin: 2px 1px 1px 1px;
        white-space: nowrap;
        font-weight: bolder;

    "></div>
    </body></html>
      */});

    var emitter = new AsyncEmitter();
    var offScreenFrame;
    var offScreenLayer;
    var textField;

    var initialize = function($d) {
      initialize = _.noop;
      var frame = document.createElement('iframe');
      frame.className = 'offScreenLayer';
      document.body.appendChild(frame);
      frame.style.position = 'fixed';
      frame.style.top = '200vw';
      frame.style.left = '200vh';
      
      offScreenFrame = frame;

      var layer;
      frame.onload = function() {
        frame.onload = _.noop;

        console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
        createTextField();
        layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');

        offScreenLayer = {
          getTextField: function() {
            return textField;
          },
          appendChild: function(elm) {
            layer.appendChild(elm);
          },
          removeChild: function(elm) {
            layer.removeChild(elm);
          }
        };

        emitter.emit('create', offScreenLayer);
        emitter.clear();
        $d.resolve(offScreenLayer);
      };

      frame.srcdoc = __offscreen_tpl__;
    };

    var getLayer = function(callback) {
      var $d = new $.Deferred();
      callback = callback || _.noop;
      if (offScreenLayer) {
        window.setTimeout(function() {
          callback(offScreenLayer);
        }, 0);
        $d.resolve(offScreenLayer);
        return;
      }
      emitter.on('create', callback);

      initialize($d);
      return $d.promise();
    };

    var createTextField = function() {
      var layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
      if (!layer) {
        return false;
      }

      var span = document.createElement('span');
      span.style.position   = 'absolute';
      span.style.fontWeight = 'bolder';
      span.style.whiteSpace = 'nowrap';

      textField = {
        setText: function(text) {
          span.innerHTML = text;
        },
        setType: function(type) {
          span.className = type;
        },
        setFontSizePixel: function(pixel) {
          span.style.fontSize = pixel + 'px';
        },
        getWidth: function() {
          return span.offsetWidth;
        }
      };

      layer.appendChild(span);
  
      return span;
    };

    return {
      get: getLayer
    };
  })();



  var NicoCommentViewModel = function() { this.initialize.apply(this, arguments); };

  // この数字はレイアウト計算上の仮想領域の物であり、実際に表示するサイズはview依存
  NicoCommentViewModel.SCREEN = {
    WIDTH_INNER:      512,
    WIDTH_FULL_INNER: 640,
    WIDTH:      512 + 32,
    WIDTH_FULL: 640 + 32,
    HEIGHT:     384 +  1
  };

  _.assign(NicoCommentViewModel.prototype, {
    initialize: function(nicoComment, offScreen) {
      this._nicoComment = nicoComment;
      this._offScreen   = offScreen;

      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this._currentTime = 0;

      this._topGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
      this._normalGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NORMAL), offScreen);
      this._bottomGroup =
        new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

      nicoComment.on('setXml', $.proxy(this._onSetXml, this));
      nicoComment.on('clear',  $.proxy(this._onClear,  this));
      nicoComment.on('change', $.proxy(this._onChange,  this));
      nicoComment.on('currentTime', $.proxy(this._onCurrentTime,   this));
    },
    _onSetXml: function() {
      this.emit('setXml');
    },
    _onClear: function() {
      this._topGroup.reset();
      this._normalGroup.reset();
      this._bottomGroup.reset();

      this.emit('clear');
    },
    _onCurrentTime: function(sec) {
      this._currentTime = sec;
      this.emit('currentTime', this._currentTime);
    },
    _onChange: function(e) {
      console.log('NicoCommentViewModel.onChange: ', e);
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    toString: function() {
      var result = [];

      result.push(['<comment ',
        '>'
      ].join(''));

      result.push(this._normalGroup.toString());
      result.push(this._topGroup.toString());
      result.push(this._bottomGroup.toString());

      result.push('</comment>');
      return result.join('\n');
    },
    getGroup: function(type) {
      switch (type) {
        case NicoChat.TYPE.TOP:
          return this._topGroup;
        case NicoChat.TYPE.BOTTOM:
          return this._bottomGroup;
        default:
          return this._normalGroup;
      }
    }
});

  var NicoChatGroup = function() { this.initialize.apply(this, arguments); };

  _.assign(NicoChatGroup.prototype, {
    initialize: function(nicoComment, type, params) {
      this._nicoComment = nicoComment;
      this._type = type;

      this._sharedNgLevel = params.sharedNgLevel || SHARED_NG_LEVEL.MID;

      // TODO: mixin
      var emitter = new AsyncEmitter();
      this.on        = $.proxy(emitter.on,        emitter);
      this.emit      = $.proxy(emitter.emit,      emitter);
      this.emitAsync = $.proxy(emitter.emitAsync, emitter);

      this.reset();
    },
    reset: function() {
      this._members = [];
    },
    addChatArray: function(nicoChatArray) {
      var members = this._members;
      var newMembers = [];
      $(nicoChatArray).each(function(i, nicoChat) {
        newMembers.push(nicoChat);
        members.push(nicoChat);
        nicoChat.setGroup(this);
      });

      newMembers = this._applyFilter(nicoChatArray);
      if (newMembers.length > 0) {
        this.emit('addChatArray', newMembers);
      }
    },
    addChat: function(nicoChat) {
      this._members.push(nicoChat);
      nicoChat.setGroup(this);
      var filter = this._getFilterFunc();
      if (filter(nicoChat)) {
        this.emit('addChat', nicoChat);
      }
    },
    getType: function() {
      return this._type;
    },
    _getFilterFunc: function() {
      var threthold = SHARED_NG_SCORE[this._sharedNgLevel];
      if (Config.getValue('debug')) {
        return function(nicoChat) {
          var score = nicoChat.getScore();
          if (score <= threthold) {
            window.console.log('%cNG共有適用: %s <= %s %s %s秒 %s', 'background: yellow;',
              score, threthold, nicoChat.getType(), nicoChat.getVpos() / 100, nicoChat.getText()
            );
          }
          return score > threthold;
        };
      }
      return function(nicoChat) {
        var score = nicoChat.getScore();
        //  window.console.log('filter?', score, threthold, nicoChat.getText());
        return score > threthold;
      };
    },
    _applyFilter: function(nicoChatArray) {
      return _.filter(nicoChatArray, this._getFilterFunc());
    },
    getMembers: function() {
      // TODO: フィルター結果をキャッシュする？
      return this._applyFilter(this._members);
    },
    getNonFilteredMembers: function() {
      return this._members;
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    onChange: function(e) {
      console.log('NicoChatGroup.onChange: ', e);
      this.emit('change', {
        chat: e,
        group: this
      });
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].setCurrentTime(sec);
      }
    },
    setSharedNgLevel: function(level) {
      if (SHARED_NG_LEVEL[level] && this._sharedNgLevel !== level) {
        this._sharedNgLevel = level;
        this.onChange(null, this);
      }
    }
  });

  var NicoChatGroupViewModel = function() { this.initialize.apply(this, arguments); };

  _.assign(NicoChatGroupViewModel.prototype, {
    initialize: function(nicoChatGroup, offScreen) {
      this._nicoChatGroup = nicoChatGroup;
      this._offScreen = offScreen;
      this._members = [];

      // メンバーをvposでソートした物. 計算効率改善用
      this._vSortedMembers = [];

      nicoChatGroup.on('addChat',      $.proxy(this._onAddChat,      this));
      nicoChatGroup.on('addChatArray', $.proxy(this._onAddChatArray, this));
      nicoChatGroup.on('reset',        $.proxy(this._onReset,        this));
      nicoChatGroup.on('change',       $.proxy(this._onChange,        this));

      this.addChatArray(nicoChatGroup.getMembers());
    },
    _onAddChatArray: function(nicoChatArray) {
      this.addChatArray(nicoChatArray);
    },
    _onAddChat: function(nicoChat) {
      this.addChat(nicoChat);
    },
    _onReset: function() {
      this.reset();
    },
    _onChange: function(e) {
      console.log('NicoChatGroupViewModel.onChange: ', e);
      window.console.time('_onChange');
      this.reset();
      this.addChatArray(e.group.getMembers());
      window.console.timeEnd('_onChange');
    },
    addChatArray: function(nicoChatArray) {
      for (var i = 0, len = nicoChatArray.length; i < len; i++) {
        var nicoChat = nicoChatArray[i];
        var nc = new NicoChatViewModel(nicoChat, this._offScreen);
        this._members.push(nc);
      }
      this._groupCollision();
    },
    _groupCollision: function() {
      this._createVSortedMembers();
      var members = this._vSortedMembers;
      for (var i = 0, len = members.length; i < len; i++) {
        this.checkCollision(members[i]);
      }
    },
    addChat: function(nicoChat) {
      var timeKey = 'addChat:' + nicoChat.getText();
      window.console.time(timeKey);
      var nc = new NicoChatViewModel(nicoChat, this._offScreen);

      // 内部処理効率化の都合上、
      // 自身を追加する前に判定を行っておくこと
      this.checkCollision(nc);

      this._members.push(nc);
      this._createVSortedMembers();
      window.console.timeEnd(timeKey);
    },
    reset: function() {
      var m = this._members;
      for (var i = 0, len = m.length; i < len; i++) {
        m[i].reset();
      }

      this._members = [];
      this._vSortedMembers = [];
    },
    getCurrentTime: function() {
      return this._nicoChatGroup.getCurrentTime();
    },
    getType: function() {
      return this._nicoChatGroup.getType();
    },
    checkCollision: function(target) {
      var m = this._vSortedMembers;//this._members;
      var o;
      var beginLeft = target.getBeginLeftTiming();
//      var endRight  = target.getEndRightTiming();
      for (var i = 0, len = m.length; i < len; i++) {
        o = m[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o === target) { return; }

        if (beginLeft > o.getEndRightTiming())  { continue; }


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

    /**
     * vposでソートされたメンバーを生成. 計算効率改善用
     */
    _createVSortedMembers: function() {
      this._vSortedMembers = this._members.concat().sort(function(a, b) {
        var av = a.getVpos(), bv = b.getVpos();
        if (av !== bv) {
          return av - bv;
        } else {
          // 文字列比較なので桁上がりのタイミングで狂うじゃないですかーやだー
          // レアケースだからって放置するんですかー
          return a.getId() < b.getId() ? -1 : 1;
        }
      });
      return this._vSortedMembers;
    },

    getMembers: function() {
      return this._members;
    },

    /**
     * 現時点で表示状態のメンバーのみを返す
     */
    getInViewMembers: function() {
      return this.getInViewMembersBySecond(this.getCurrentTime());
    },

    /**
     * secの時点で表示状態のメンバーのみを返す
     */
    getInViewMembersBySecond: function(sec) {
      // TODO: もっと効率化
      //var maxDuration = NicoChatViewModel.DURATION.NORMAL;

      var result = [], m = this._vSortedMembers, len = m.length;
      for (var i = 0; i < len; i++) {
        var chat = m[i]; //, s = m.getBeginLeftTiming();
        //if (sec - s > maxDuration) { break; }
        if (chat.isInViewBySecond(sec)) {
          result.push(chat);
        }
      }
      //console.log('inViewMembers.length: ', result.length, sec);
      return result;
    },
    getInViewMembersByVpos: function(vpos) {
      if (!this._hasLayout) { this._layout(); }
      return this.getInViewMembersBySecond(vpos / 100);
    },
    toString: function() {
      var result = [], m = this._members, len = m.length;

      result.push(['\t<group ',
        'type="',   this._nicoChatGroup.getType(), '" ',
        'length="', m.length, '" ',
        '>'
      ].join(''));

      for (var i = 0; i < len; i++) {
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
  var NicoChat = function() { this.initialize.apply(this, arguments); };
  NicoChat.create = function(text, cmd, vpos, options) {
    var dom = document.createElement('chat');
    dom.appendChild(document.createTextNode(text));

    dom.setAttribute('mail', cmd || '');
    dom.setAttribute('vpos', vpos);
    for (var v in options) {
      dom.setAttribute(v, options[v]);
    }
    //console.log('NicoChat.create', dom);
    return new NicoChat(dom);
  };

  NicoChat.id = 1000000;

  NicoChat.SIZE = {
    BIG: 'big',
    MEDIUM: 'medium',
    SMALL: 'small'
  };
  NicoChat.TYPE = {
    TOP:    'ue',
    NORMAL: 'normal',
    BOTTOM: 'shita'
  };
  NicoChat._CMD_REPLACE = /(ue|shita|sita|big|small|ender|full|[ ])/g;
  NicoChat._COLOR_MATCH = /(#[0-9a-f]+)/i;
  NicoChat._COLOR_NAME_MATCH = /([a-z]+)/i;
  NicoChat.COLORS = {
    'red'    : '#FF0000',
    'pink'   : '#FF8080',
    'orange' : '#FFC000',
    'yellow' : '#FFFF00',
    'green'  : '#00FF00',
    'cyan'   : '#00FFFF',
    'blue'   : '#0000FF',
    'purple' : '#C000FF',
    'black'  : '#000000',

    'white2'         : '#CCCC99',
    'niconicowhite'  : '#CCCC99',
    'red2'           : '#CC0033',
    'truered'        : '#CC0033',
    'pink2'          : '#FF33CC',
    'orange2'        : '#FF6600',
    'passionorange'  : '#FF6600',
    'yellow2'        : '#999900',
    'madyellow'      : '#999900',
    'green2'         : '#00CC66',
    'elementalgreen' : '#00CC66',
    'cyan2'          : '#00CCCC',
    'blue2'          : '#3399FF',
    'marineblue'     : '#3399FF',
    'purple2'        : '#6633CC',
    'nobleviolet'    : '#6633CC',
    'black2'         : '#666666'
  };

  _.assign(NicoChat.prototype, {
    reset: function() {
      this._text = '';
      this._date = '000000000';
      this._cmd =  '';
      this._isPremium = false;
      this._userId = '';
      this._vpos = 0;
      this._deleted = '';
      this._color = '#FFF';
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NORMAL;
      this._isMine = false;
      this._score = 0;
      this._no = 0;

      this._currentTime = 0;
    },
    initialize: function(chat) {
      this._id = 'chat' + NicoChat.id++;
      this._currentTime = 0;

      this._text = chat.firstChild.nodeValue;
      var attr = chat.attributes;
      if (!attr) { this.reset(); return; }

      this._date = chat.getAttribute('date') || '000000000';
      this._cmd  = chat.getAttribute('mail') || '';
      this._isPremium = (chat.getAttribute('premium') === '1');
      this._userId = chat.getAttribute('user_id');
      this._vpos = parseInt(chat.getAttribute('vpos'));
      this._deleted = chat.getAttribute('deleted') === '1';
      this._color = '#FFF';
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NORMAL;
      this._duration = NicoChatViewModel.DURATION.NORMAL;
      this._isMine = chat.getAttribute('mine') === '1';
      this._isUpdating = chat.getAttribute('updating') === '1';
      this._score = parseInt(chat.getAttribute('score') || '0', 10);
      this._no = chat.getAttribute('no') || '';

      if (this._deleted) { return; }

      var cmd = this._cmd;
      if (cmd.length > 0) {
        var pcmd = this._parseCmd(cmd);

        if (pcmd['COLOR']) {
          this._color = pcmd['COLOR'];
        }

        // TODO: 両方指定されてたらどっちが優先されるのかを検証
        if (pcmd['big']) {
          this._size = NicoChat.SIZE.BIG;
        } else if (pcmd['small']) {
          this._size = NicoChat.SIZE.SMALL;
        }

        if (pcmd['ue']) {
          this._type = NicoChat.TYPE.TOP;
        } else if (pcmd['shita']) {
          this._type = NicoChat.TYPE.BOTTOM;
        }

        if (pcmd['ender']) {
          this._isEnder = true;
        }
        if (pcmd['full']) {
          this._isFull = true;
        }
      }
    },
    _parseCmd: function(cmd) {
      var tmp = cmd.split(/ +/);
      var result = {};
      $(tmp).each(function(i, c) {
        if (NicoChat.COLORS[c]) {
          result['COLOR'] = NicoChat.COLORS[c];
        } else if (NicoChat._COLOR_MATCH.test(c)) {
          result['COLOR'] = c;
        } else {
          result[c] = true;
        }
      });
      return result;
    },
    setCurrentTime: function(sec) {
      this._currentTime = sec;
    },
    getCurrentTime: function() {
      return this._currentTime;
    },
    setGroup: function(group) {
      this._group = group;
    },
    onChange: function() {
      if (this._group) {
        console.log('NicoChat.onChange: ', this, this._group);
        this._group.onChange({
          chat: this
        });
      }
    },
    setIsUpdating: function(v) {
      if (this._isUpdating !== v) {
        this._isUpdating = !!v;
        if (!v) { this.onChange(); }
      }
    },
    setIsPostFail: function(v) {
      this._isPostFail = v;
    },
    isPostFail: function() {
      return !!this._isPostFail;
    },
    getId: function() { return this._id; },
    getText: function() { return this._text; },
    setText: function(v) { this._text = v; },
    getDate: function() { return this._date; },
    getCmd: function() { return this._cmd; },
    isPremium: function() { return !!this._isPremium; },
    isEnder: function() { return !!this._isEnder; },
    isFull: function() { return !!this._isFull; },
    isMine: function() { return !!this._isMine; },
    isUpdating: function() { return !!this._isUpdating; },
    getUserId: function() { return this._userId; },
    getVpos: function() { return this._vpos; },
    isDeleted: function() { return !!this._deleted; },
    getColor: function() { return this._color; },
    getSize: function() { return this._size; },
    getType: function() { return this._type; },
    getScore: function() { return this._score; },
    getNo: function() { return this._no; }
  });


  /**
   * 個別のコメントの表示位置・タイミング計算
   * コメントアート互換は大体こいつにかかっている
   *
   * コメントのサイズ計算まわりが意味不明なコードだらけだが、
   * 仕様書にもない本家のバグを再現しようとするとこうなるので仕方ない。
   * (しかも、これでも全然足りない)
   * 互換性にこだわらないのであれば7割くらいが不要。
   */
  var NicoChatViewModel = function() { this.initialize.apply(this, arguments); };
  // ここの値はレイアウト計算上の仮想領域の物であり、実際の表示はviewに依存
  NicoChatViewModel.DURATION = {
    TOP:    3,
    NORMAL: 4,
    BOTTOM: 3
  };

  NicoChatViewModel.FONT = '\'ＭＳ Ｐゴシック\''; // &#xe7cd;
  NicoChatViewModel.FONT_SIZE_PIXEL = {
    BIG:    39 + 0,
    NORMAL: 24 + 0,
    SMALL:  15 + 0
  };

  NicoChatViewModel.LINE_HEIGHT = {
    BIG:    45,
    NORMAL: 29,
    SMALL:  18
  };

  NicoChatViewModel.CHAT_MARGIN = 5;
  
  NicoChatViewModel._FONT_REG = {
    // [^ -~｡-ﾟ]* は半角以外の文字の連続
    MINCHO: /([^ -~｡-ﾟ]*[ˊˋ⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛▁▂▃▄▅▆▇█▉▊▋▌▍▎▏◢◣◤◥〡〢〣〤〥〦〧〨〩ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄﹉﹊﹋﹌﹍﹎﹏﹐﹑﹒﹔﹕﹖﹗﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫▓]+[^ -~｡-ﾟ]*)/g,
    GULIM: /([^ -~｡-ﾟ]*[㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㉿ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵￦⊙ㅂㅑㅜㆁ▒ㅅㅒㅡㆍㄱㅇㅓㅣㆎㄴㅏㅕㅤ♡ㅁㅐㅗㅿ♥]+[^ -~｡-ﾟ]*)/g,
    MING_LIU: /([^ -~｡-ﾟ]*[]+[^ -~｡-ﾟ]*)/g
  };

  _.assign(NicoChatViewModel.prototype, {
    initialize: function(nicoChat, offScreen) {
      this._nicoChat = nicoChat;
      this._offScreen = offScreen;
      this._trace = [];

      // 画面からはみ出したかどうか(段幕時)
      this._isOverflow = false;
      // 表示時間
      this._duration = NicoChatViewModel.DURATION.NORMAL;

      // 固定されたコメントか、流れるコメントか
      this._isFixed = false;

      this._scale = 1.0;
      this._y = 0;

      this._setType(nicoChat.getType());

      // ここでbeginLeftTiming, endRightTimintが確定する
      this._setVpos(nicoChat.getVpos());

      this._setSize(nicoChat.getSize());

      // 文字を設定
      // この時点で字幕の大きさが確定するので、
      // Z座標・beginRightTiming, endLeftTimingまでが確定する
      this._setText(nicoChat.getText());

      if (this._isFixed) {
        this._setupFixedMode();
      } else {
        this._setupMarqueeMode();
      }

      // この時点で画面の縦幅を超えるようなコメントは縦幅に縮小しつつoverflow扱いにしてしまう
      // こんなことをしなくてもおそらく本家ではぴったり合うのだろうし苦し紛れだが、
      // 画面からはみ出すよりはマシだろうという判断
      if (this._height > NicoCommentViewModel.SCREEN.HEIGHT + 8) {
        this._isOverflow = true;
        //this._y = (NicoCommentViewModel.SCREEN.HEIGHT - this._height) / 2;
        this._setScale(this._scale * NicoCommentViewModel.SCREEN.HEIGHT / this._height);
      }
    },
    _setType: function(type) {
      this._type = type;
      switch (type) {
        case NicoChat.TYPE.TOP:
          this._duration = NicoChatViewModel.DURATION.TOP;
          this._isFixed = true;
          break;
        case NicoChat.TYPE.BOTTOM:
          this._duration = NicoChatViewModel.DURATION.BOTTOM;
          this._isFixed = true;
          break;
        default:
          break;
      }
    },
    _setVpos: function(vpos) {
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
    },
    _setSize: function(size) {
      this._size = size;
      switch (size) {
        case NicoChat.SIZE.BIG:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.BIG;
          break;
        case NicoChat.SIZE.SMALL:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.SMALL;
          break;
        default:
          this._fontSizePixel = NicoChatViewModel.FONT_SIZE_PIXEL.NORMAL;
          break;
      }
    },
    _setText: function(text) {
      var han_replace = function(m) {
        var bar = '________________________________________';
        return ['<span class="han_space">', bar.substr(0, m.length), '</span>'].join('');
      };
      var zen_replace = function(m) {
        var bar = '＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃＃';
        return ['<span class="zen_space">', bar.substr(0, m.length), '</span>'].join('');
      };
      var zen_replace2 = function(m) {
        var bar = '、、、、、、、、、、、、、、、、、、、、、、、、、、、、、、';
        return ['<span class="zen_space">', bar.substr(0, m.length), '</span>'].join('');
      };

      var htmlText =
        ZenzaWatch.util.escapeHtml(text)
          .replace(/( |　|\t)+([\n$])/g , '$1')
          .replace(/( |\xA0){1,30}/g , han_replace)
          .replace(/[\t]/g , '<span class="tab_space">&nbsp;</span>');

      // 特殊文字と、その前後の全角文字のフォントが変わるらしい
      htmlText =
        htmlText
          .replace(NicoChatViewModel._FONT_REG.MINCHO,   '<span class="mincho">$1</span>')
          .replace(NicoChatViewModel._FONT_REG.GULIM,    '<span class="gulim">$1</span>')
          .replace(NicoChatViewModel._FONT_REG.MING_LIU, '<span class="mingLiu">$1</span>')
//          .replace(/ /g , '<span class="zen_space">＃</span>')
          .replace(/[ ]{1,20}/g ,  zen_replace)
//          .replace(/　/g , '<span class="zen_space">、</span>');
          .replace(/[　]{1,20}/g , zen_replace2);

      // 最初の一文字目が特殊文字だった場合は全体のフォントが変わるらしい
      var firstLetter = text.charAt(0);
      if (firstLetter.match(NicoChatViewModel._FONT_REG.MINCHO)) {
        htmlText = '<span class="mincho">'  + htmlText + '</span>';
      } else if (firstLetter.match(NicoChatViewModel._FONT_REG.GULIM)) {
        htmlText = '<span class="gulim">'   + htmlText + '</span>';
      } else if (firstLetter.match(NicoChatViewModel._FONT_REG.MING_LIU)) {
        htmlText = '<span class="mingLiu">' + htmlText + '</span>';
      }
      htmlText = htmlText
        .replace(/[\r\n]+$/g, '')
        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
        .replace(/[\n]/g, '<br>')
        .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>') // バックスラッシュ
        .replace(/(\x0323|\x200b|\x2029|\x202a|\x200c)+/g , '<span class="zero_space">[0]</span>')
        ;

      this._htmlText = htmlText;
      this._text = text;

      var field = this._offScreen.getTextField();
      field.setText(htmlText);
      field.setFontSizePixel(this._fontSizePixel);
      field.setType(this._type);
      
      this._width  = this._originalWidth  = field.getWidth();
      this._height = this._originalHeight = this._calculateHeight();

      if (!this._isFixed) {
        var speed =
          this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / this._duration;
        this._endLeftTiming    = this._endRightTiming  - this._width / speed;
        this._beginRightTiming = this._beginLeftTiming + this._width / speed;
      } else {
        this._speed = 0;
        this._endLeftTiming    = this._endRightTiming;
        this._beginRightTiming = this._beginLeftTiming;
      }
    },
    /**
     * 高さ計算。 リサイズ後が怪しいというか多分間違ってる。
     */
    _calculateHeight: function() {
      // ブラウザから取得したouterHeightを使うより、職人の実測値のほうが信頼できる
      // http://tokeiyadiary.blog48.fc2.com/blog-entry-90.html
      // http://www37.atwiki.jp/commentart/pages/43.html#id_a759b2c2
      var lc = this._htmlText.split('<br>').length;
      var isEnder = this._nicoChat.isEnder();

      var margin     = NicoChatViewModel.CHAT_MARGIN;
      var lineHeight = NicoChatViewModel.LINE_HEIGHT.NORMAL; // 29
      var size       = this._size;
      switch (size) {
        case NicoChat.SIZE.BIG:
          lineHeight = NicoChatViewModel.LINE_HEIGHT.BIG;    // 45
          break;
        default:
          break;
        case NicoChat.SIZE.SMALL:
          lineHeight = NicoChatViewModel.LINE_HEIGHT.SMALL;  // 18
          break;
      }

      if (!this._isFixed) {
        // 流れるコメント
        // 中の数字は職人の実測値
        switch (size) {
          case NicoChat.SIZE.BIG:
            lineHeight = (isEnder || lc <= 2) ? lineHeight : 24;
            margin     = (isEnder || lc <= 2) ? margin : 3;
            //return ((lc <= 2) ? (45 * lc + 5) : (24 * lc + 3));
            break;
          default:
            lineHeight = (isEnder || lc <= 4) ? lineHeight : 15;
            margin     = (isEnder || lc <= 4) ? margin : 3;
            //return ((lc <= 4) ? (29 * lc + 5) : (15 * lc + 3));
            break;
          case NicoChat.SIZE.SMALL:
            lineHeight = (isEnder || lc <= 6) ? lineHeight : 10;
            margin     = (isEnder || lc <= 6) ? margin : 3;
            //return ((lc <= 6) ? (18 * lc + 5) : (10 * lc + 3));
            break;
        }
      } else if (this._scale === 0.5) {
        switch (size) {
          case NicoChat.SIZE.BIG: // 16行 = (24 * 16 + 3) = 387
            lineHeight = 24;
            margin     = 3;
            //return (24 * lc + 3);
            break;
          default:
            lineHeight = 15;
            margin     = 3;
            //return (15 * lc + 3);
            break;
          case NicoChat.SIZE.SMALL:
            lineHeight = 10;
            margin     = 3;
            //return (10 * lc + 3);
            break;
        }
      } else if (this._scale !== 1.0) {
        /**
         *  上の実測に合うようなCSSを書ければ色々解決する。今後の課題
         */
        //  45 -> 24   39 + 6
        //  29 -> 15   24 + 5
        //  18 -> 10   15 + 3
        lineHeight = Math.floor((lineHeight + Math.ceil(lineHeight / 15)) * this._scale);
        margin     = Math.round(margin * this._scale);
        //margin = 5;
        //switch (size) {
        //  case NicoChat.SIZE.BIG:   lineHeight = 48; break;
        //  default:                  lineHeight = 30; break;
        //  case NicoChat.SIZE.SMALL: lineHeight = 20; break;
        //}
        //this._lineHeight = lineHeight;
        //return Math.ceil((lineHeight * lc + margin) * this._scale) - 1;
      }

      this._lineHeight = lineHeight;
      return lineHeight * lc + margin;
    },

    /**
     *  位置固定モードにする(ueかshita)
     */
    _setupFixedMode: function() {
      var isScaled = false;
      var nicoChat = this._nicoChat;
      var screenWidth =
        nicoChat.isFull() ?
          NicoCommentViewModel.SCREEN.WIDTH_FULL_INNER :
          NicoCommentViewModel.SCREEN.WIDTH_INNER;
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      var isEnder = nicoChat.isEnder();
      //メモ
      //█　　　　　　　　　　　　　　　　　　　　　　　　　　　█
      // メモ
      // "        "

      // 改行リサイズ
      // 参考: http://ch.nicovideo.jp/meg_nakagami/blomaga/ar217381
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (!isEnder && this._height > screenHeight / 3) {
        this._setScale(this._scale * 0.5);
        isScaled = true;
      }
      
      // TODO: この判定は改行リサイズより前？後？を検証
      var isOverflowWidth = this._width > screenWidth;

      // 臨界幅リサイズ
      // 画面幅よりデカい場合の調整
      if (isOverflowWidth) {
        if (isScaled && !isEnder) {
          // なんかこれバグってね？と思った方は正しい。
          // 元々は本家のバグなのだが、いまさら修正出来ない。
          // なので、コメント描画の再現としては正しい…らしい。
          //
          // そのバグを発動しなくするためのコマンドがender
          this._setScale(screenWidth / this._width);
        } else {
          this._setScale(this._scale * (screenWidth  / this._width));
        }
      }

      // BOTTOMの時だけy座標を画面の下端に合わせる
      // 内部的には0 originで表示の際に下から詰むだけでもいいような気がしてきた。
      if (this._type === NicoChat.TYPE.BOTTOM) {
        //var margin = 1; //NicoChatViewModel.CHAT_MARGIN;
        //var outerHeight = this._height + margin;
        this._y = screenHeight - this._height;
      }

    },

    /**
     *  流れる文字のモード
     */
    _setupMarqueeMode: function() {
      var screenHeight = NicoCommentViewModel.SCREEN.HEIGHT;
      // 画面の高さの1/3を超える場合は大きさを半分にする
      if (!this._nicoChat.isEnder() && this._height > screenHeight / 3) {
        this._setScale(this._scale * 0.5);
        var speed =
          this._speed = (this._width + NicoCommentViewModel.SCREEN.WIDTH) / this._duration;
        this._endLeftTiming    = this._endRightTiming  - this._width / speed;
        this._beginRightTiming = this._beginLeftTiming + this._width / speed;
      }
    },

    _setScale: function(scale) {
      this._scale = scale;
      this._width = (this._originalWidth * scale);
      this._height = this._calculateHeight(); // 再計算
    },


    /**
     * コメント同士の衝突を判定
     *
     * @param {NicoChatViewModel} o
     * @return boolean
     */
    checkCollision: function(target) {
      // 一度はみ出した文字は当たり判定を持たない
      if (this.isOverflow() || target.isOverflow()) { return false; }

      // Y座標が合わないなら絶対衝突しない
      var targetY = target.getYpos();
      var selfY   = this.getYpos();
      if (targetY + target.getHeight() < selfY ||
          targetY > selfY + this.getHeight()) {
        return false;
      }

      // ターゲットと自分、どっちが右でどっちが左か？の判定
      var rt, lt;
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
    },

    /**
     * (衝突判定に引っかかったので)自分自身を一段ずらす.
     *
     * @param NicoChatViewModel others 示談相手
     */
    moveToNextLine: function(others) {
      var margin = 1; //NicoChatViewModel.CHAT_MARGIN;
      var othersHeight = others.getHeight() + margin;
      var yMax = NicoCommentViewModel.SCREEN.HEIGHT - this._height; //lineHeight;

      var type = this._nicoChat.getType();
      var y = this._y;

      if (type !== NicoChat.TYPE.BOTTOM) {
        y += othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (y > yMax) {
          this._isOverflow = true;
        }
      } else {
        y -= othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (y < 0) {
          this._isOverflow = true;
        }
      }

      this._y = this._isOverflow ? Math.max(0, Math.floor(Math.random() * yMax)) : y;
    },

    reset: function() {
    },

    getId: function() {
      return this._nicoChat.getId();
    },
    getText: function() {
      return this._text;
    },
    getHtmlText: function() {
      return this._htmlText;
    },
    isInView: function() {
      return this.isInViewBySecond(this.getCurrentTime());
    },
    isInViewBySecond: function(sec) {
      if (sec + 0.5 /* margin */ < this._beginLeftTiming) { return false; }
      if (sec > this._endRightTiming ) { return false; }
      return true;
    },
    isOverflow: function() {
      return this._isOverflow;
    },
    getWidth: function() {
      return this._width;
    },
    getHeight: function() {
      return this._height;
    },
    getDuration: function() {
      return this._duration;
    },
    getSpeed: function() {
      return this._speed;
    },
    // 左端が見えるようになるタイミング
    getBeginLeftTiming: function() {
      return this._beginLeftTiming;
    },
    // 右端が見えるようになるタイミング
    getBeginRightTiming: function() {
      return this._beginRightTiming;
    },
    // 左端が見えなくなるタイミング
    getEndLeftTiming: function() {
      return this._endLeftTiming;
    },
    // 右端が見えなくなるタイミング
    getEndRightTiming: function() {
      return this._endRightTiming;
    },
    getVpos: function() {
      return this._nicoChat.getVpos();
    },
    getXpos: function() {
      return this.getXposBySecond(this.getCurrentTime());
    },
    getYpos: function() {
      return this._y;
    },
    getColor: function() {
      return this._nicoChat.getColor();
    },
    getSize: function() {
      return this._nicoChat.getSize();
    },
    getType: function() {
      return this._nicoChat.getType();
    },
    getScale: function() {
      return this._scale;
    },
    getFontSizePixel: function() {
      return this._fontSizePixel;
    },
    getLineHeight: function() {
      return this._lineHeight;
    },
    /**
     * second時の左端座標を返す
     */
    getXposBySecond: function(sec) {
      if (this._isFixed) {
        return (NicoCommentViewModel.SCREEN.WIDTH - this._width) / 2;
      } else {
        var diff = sec - this._beginLeftTiming;
        return NicoCommentViewModel.SCREEN.WIDTH + diff * this._speed;
      }
    },
    getXposByVpos: function(vpos) {
      return this.getXposBySecond(vpos / 100);
    },
    getCurrentTime: function() {
      return this._nicoChat.getCurrentTime();
    },
    isFull: function() {
      return this._nicoChat.isFull();
    },
    isMine: function()     { return this._nicoChat.isMine(); },
    isUpdating: function() { return this._nicoChat.isUpdating(); },
    isPostFail: function() { return this._nicoChat.isPostFail(); },
    toString: function() { // debug用
      // コンソールから
      // ZenzaWatch.debug.getInViewElements()
      // 叩いた時にmeta中に出る奴
      var chat = JSON.stringify({
        width:    this.getWidth(),
        height:   this.getHeight(),
        scale:    this.getScale(),
        fontSize: this.getFontSizePixel(),
        vpos:     this.getVpos(),
        xpos:     this.getXpos(),
        ypos:     this.getYpos(),
        type:     this.getType(),
        begin:    this.getBeginLeftTiming(),
        end:      this.getEndRightTiming(),
        speed:    this.getSpeed(),
        color:    this.getColor(),
        size:     this.getSize(),
        duration: this.getDuration(),
        inView:   this.isInView(),

        ender:    this._nicoChat.isEnder(),
        full:     this._nicoChat.isFull(),
        no:       this._nicoChat.getNo(),
        score:    this._nicoChat.getScore(),
        userId:   this._nicoChat.getUserId(),
        date:     this._nicoChat.getDate(),
        deleted:  this._nicoChat.isDeleted(),
        cmd:      this._nicoChat.getCmd(),
        text:     this.getText()
      });
      return chat;
    }
  });


//==================================================
//==================================================
//==================================================
  /**
   * ニコニコ動画のコメントをCSS3アニメーションだけで再現出来るよ
   * という一発ネタのつもりだったのだが意外とポテンシャルが高かった。
   *
   * DOM的に隔離されたiframeの領域内で描画する
   */
  var NicoCommentCss3PlayerView = function() { this.initialize.apply(this, arguments); };

  NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT = 40;

  NicoCommentCss3PlayerView.__TPL__ = ZenzaWatch.util.hereDoc(function() {/*
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>CommentLayer</title>
<style type="text/css">

.mincho  {font-family: Simsun, monospace; }
.gulim   {font-family: Gulim,  monospace; }
.mingLiu {font-family: mingLiu,monospace; }

.ue .mincho  , .shita .mincho {font-family: Simsun, monospace; }
.ue .gulim   , .shita .gulim  {font-family: Gulim,  monospace; }
.ue .mingLiu , .shita .mingLiu{font-family: mingLiu,monospace; }

.debug .mincho  { background: rgba(128, 0, 0, 0.3); }
.debug .gulim   { background: rgba(0, 128, 0, 0.3); }
.debug .mingLiu { background: rgba(0, 0, 128, 0.3); }

 .backslash {
   font-family: Arial;
 }


body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

{* 稀に変な広告が紛れ込む *}
iframe {
  display: none !important;
}

.commentLayerOuter {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 672px;
  padding: 0 64px;
  height: 385px;
  right: 0;
  bottom: 0;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
}

.commentLayer {
  position: relative;
  width: 544px;
  height: 385px;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.debug .commentLayer {
  border: 1px dotted #800;
}

.nicoChat {
  position: absolute;
  opacity: 0;
  text-shadow:
  {*-1px -1px 0 #ccc, *}
     1px  1px 0 #000;

  font-family: 'ＭＳ Ｐゴシック';
  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: nowrap;
  font-weight: bolder;

{*line-height: 123.5%;*}
  padding: 0;

  transform-origin: 0% 0%;
  animation-timing-function: linear;
}

.nicoChat.black {
  text-shadow: -1px -1px 0 #888, 1px  1px 0 #888;
}

.nicoChat.big {
  line-height: 48px;
}
.nicoChat.big.noScale {
  line-height: 45px;
}


.nicoChat.medium {
  line-height: 30px;
}
.nicoChat.medium.noScale {
  line-height: 29px;
}


.nicoChat.small {
  line-height: 20px;
}
.nicoChat.small.noScale {
  line-height: 18px;
}


.nicoChat.overflow {
  {*mix-blend-mode: overlay;*}
}


.nicoChat.ue,
.nicoChat.shita {
  display: inline-block;
  text-shadow: 0 0 3px #000; {* 全部こっちにしたいが重いので *}
  {*text-align: center;*}
}
.nicoChat.ue.black,
.nicoChat.shita.black {
  text-shadow: 0 0 3px #fff; {* 全部こっちにしたいが重いので *}
}

.nicoChat .han_space,
.nicoChat .zen_space {
  opacity: 0;
  {*font-family: monospace;*}
}

.debug .nicoChat .han_space,
.debug .nicoChat .zen_space {
  color: yellow;
  opacity: 0.3;
}

.nicoChat .zero_space {
  display: none;
}
.debug .nicoChat .zero_space {
  display: inline;
  position: absolute;
}



.nicoChat .zero_space {
  display: none;
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

@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(3600deg); }
}

.nicoChat.updating::before {
  content: '❀'; {* 砂時計にしたい *}
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
  color: #ff9;
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
  color: #ff9;
  font-size: 80%;
  opacity: 0.8;
  color: #ccc;
}

.debug .nicoChat {
  border: 1px outset;
}

.stalled .nicoChat,
.paused  .nicoChat {
  animation-play-state: paused !important;
}
</style>
<style id="nicoChatAnimationDefinition">
%CSS%
</style>
</head>
<body>
<div class="commentLayerOuter">
<div class="commentLayer" id="commentLayer">%MSG%</div>
</div>
</body></html>

  */});

  _.assign(NicoCommentCss3PlayerView.prototype, {
    initialize: function(params) {
      this._viewModel = params.viewModel;

      this._viewModel.on('setXml', $.proxy(this._onSetXml, this));
      this._viewModel.on('currentTime', $.proxy(this._onCurrentTime, this));

      this._lastCurrentTime = 0;
      this._isShow = true;

      this._aspectRatio = 9 / 16;

      this._inViewTable = {};
      this._playbackRate = params.playbackRate || 1.0;

      this._isStalled = undefined;
      this._isPaused  = undefined;

      console.log('NicoCommentCss3PlayerView playbackRate', this._playbackRate);

      this._initializeView(params);

      var _refresh = $.proxy(this.refresh, this);
      // Firefoxでフルスクリーン切り替えするとコメントの描画が止まる問題の暫定対処
      // ここに書いてるのは手抜き
      if (ZenzaWatch.util.isFirefox()) {
        ZenzaWatch.emitter.on('fullScreenStatusChange',
          _.debounce(_refresh, 3000)
        );
      }

      // ウィンドウがアクティブじゃない時にブラウザが描画をサボっているので、
      // アクティブになったタイミングで粛正する
      $(window).on('focus', _refresh);

      ZenzaWatch.debug.css3Player = this;
    },
    _initializeView: function(params) {

      window.console.time('initialize NicoCommentCss3PlayerView');
      this._style = null;
      this._commentLayer = null;
      this._view = null;
      var iframe;
      var reserved = document.getElementsByClassName('commentLayerFrameReserve');
      if (reserved && reserved.length > 0) {
        iframe = reserved[0];
        document.body.removeChild(iframe);
        iframe.style.position = '';
        iframe.style.left = '';
      } else {
        iframe = document.createElement('iframe');
      }
      iframe.className = 'commentLayerFrame';

      var html =
        NicoCommentCss3PlayerView.__TPL__
        .replace('%CSS%', '').replace('%MSG%', '');


      var self = this;
      iframe.onload = function() {
        var win = iframe.contentWindow;
        var doc = iframe.contentWindow.document;

        self._style        = doc.getElementById('nicoChatAnimationDefinition');
        var commentLayer = self._commentLayer = doc.getElementById('commentLayer');

        // Config直接参照してるのは手抜き
        doc.body.className = Config.getValue('debug') ? 'debug' : '';
        Config.on('update-debug', function(val) {
          doc.body.className = val ? 'debug' : '';
        });

        win.addEventListener('resize', function() {
          var w = win.innerWidth, h = win.innerHeight;
          // 基本は元動画の縦幅合わせだが、16:9より横長にはならない
          var aspectRatio = Math.max(self._aspectRatio, 9 / 16);
          var targetHeight = Math.min(h, w * aspectRatio);
          commentLayer.style.transform = 'scale(' + targetHeight / 385 + ')';
        });
        //win.addEventListener('resize', _.debounce($.proxy(self._onResizeEnd, self), 500);
        //
        ZenzaWatch.debug.getInViewElements = function() {
          return doc.getElementsByClassName('nicoChat');
        };

        if (self._isPaused) {
          self.pause();
        }

        //ZenzaWatch.util.callAsync(self._adjust, this, 1000);
        window.console.timeEnd('initialize NicoCommentCss3PlayerView');
      };

      iframe.srcdoc = html;
      this._view = iframe;
      ZenzaWatch.debug.commentLayer = iframe;

      if (!params.show) { this.hide(); }
    },
    _onResize: function(e) {
      this._adjust(e);
    },
    // リサイズイベントを発動させる
    _adjust: function() {
      if (!this._view) {
        return;
      }
      var $view = $(this._view);
      $view.css({ width: $view.outerWidth() + 1, height: $view.outerHeight() + 1 }).offset();
      window.setTimeout(function() {
        $view.css({width: '', height: ''});
      }, 0);
    },
    getView: function() {
      return this._view;
    },
    setPlaybackRate: function(playbackRate) {
      this._playbackRate = Math.min(Math.max(playbackRate, 0.01), 10);
      this.refresh();
    },
    setAspectRatio: function(ratio) {
      this._aspectRatio = ratio;
      this._adjust();
    },
    _onSetXml: function() {
      this.clear();
      this._adjust();
    },
    _onCurrentTime: function(sec) {
      var REFRESH_THRESHOLD = 1;
      this._lastCurrentTime = this._currentTime;
      this._currentTime = sec;

      if (this._lastCurrentTime === this._currentTime) {
        // pauseでもないのにcurrentTimeの更新が途絶えたらロードが詰まった扱い
        if (!this._isPaused) {
          this._setStall(true);
        }
      } else
      if (this._currentTime < this._lastCurrentTime ||
        Math.abs(this._currentTime - this._lastCurrentTime) > REFRESH_THRESHOLD) {
        // 後方へのシーク、または 境界値以上の前方シーク時は全体を再描画
        this.refresh();
      } else {
        this._setStall(false);
        this._updateInviewElements();
      }
    },
    _addClass: function(name) {
      if (!this._commentLayer) { return; }
      var cn = this._commentLayer.className.split(/ +/);
      if (_.indexOf(cn, name) >= 0) { return; }

      cn.push(name);
      this._commentLayer.className = cn.join(' ');
    },
    _removeClass: function(name) {
      if (!this._commentLayer) { return; }
      var cn = this._commentLayer.className.split(/ +/);
      if (_.indexOf(cn, name) < 0) { return; }

      _.pull(cn, name);
      this._commentLayer.className = cn.join(' ');
    },
    _setStall: function(v) {
      if (this._commentLayer) {
        if (v) { this._addClass('stalled'); }
        else   { this._removeClass('stalled'); }
      }
      this._isStalled = v;
    },
    pause: function() {
      if (this._commentLayer) {
        this._addClass('paused');
      }
      this._isPaused = true;
    },
    play: function() {
      if (this._commentLayer) {
        this._removeClass('paused');
      }
      this._isPaused = false;
    },
    clear: function() {
      if (this._commentLayer) {
        this._commentLayer.innerHTML = '';
      }
      if (this._style) {
        this._style.innerHTML = '';
      }

      this._inViewTable = {};
    },
    refresh: function() {
      this.clear();
      this._updateInviewElements();
    },
    _updateInviewElements: function() {
      if (!this._commentLayer || !this._style || !this._isShow) { return; }

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NORMAL),
        this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
        this._viewModel.getGroup(NicoChat.TYPE.TOP)
      ];

      var css = [], inView = [], dom = [];
      var i, len;
      // 表示状態にあるchatを集める
      for(i = 0, len = groups.length; i < len; i++) {
        var group = groups[i];
        inView = inView.concat(group.getInViewMembers());
      }

      var ct = this._currentTime;
      for (i = 0, len = inView.length; i < len; i++) {
        var nicoChat = inView[i];
        var domId = nicoChat.getId();
        if (this._inViewTable[domId]) {
          continue;
        }
        // 新規に表示状態になったchatがあればdom生成
        this._inViewTable[domId] = nicoChat;
        var type = nicoChat.getType();
        var size = nicoChat.getSize();
        dom.push(this._buildChatDom(nicoChat, type, size));
        css.push(this._buildChatCss(nicoChat, type, ct));
      }

      // DOMへの追加
      if (css.length > 0) {
        var fragment = document.createDocumentFragment();
        while (dom.length > 0) { fragment.appendChild(dom.shift()); }
        this._commentLayer.appendChild(fragment);
        this._style.innerHTML += css.join('');
        this._gcInviewElements();
      }
    },
    /**
     * 表示された要素を古い順に除去していく
     * 本家は単純なFIFOではなく、画面からいなくなった要素から除去→FIFOの順番だと思うが、
     * そこを再現するメリットもないと思うので手抜きしてFIFOしていく
     */
    _gcInviewElements: function() {
      if (!this._commentLayer || !this._style) { return; }

      var max = NicoCommentCss3PlayerView.MAX_DISPLAY_COMMENT;

      var commentLayer = this._commentLayer;
      var inViewElements = commentLayer.getElementsByClassName('nicoChat');
      for (var i = inViewElements.length - max - 1; i >= 0; i--) {
        inViewElements[i].remove();
      }
    },

    buildHtml: function(currentTime) {
      currentTime = currentTime || this._viewModel.getCurrentTime();
      window.console.time('buildHtml');

      var groups = [
        this._viewModel.getGroup(NicoChat.TYPE.NORMAL),
        this._viewModel.getGroup(NicoChat.TYPE.BOTTOM),
        this._viewModel.getGroup(NicoChat.TYPE.TOP)
      ];

      var css = [], html = [];
      for(var i = 0; i < groups.length; i++) {
        var group = groups[i];
        html.push(this._buildGroupHtml(group, currentTime));
        css .push(this._buildGroupCss(group, currentTime));
      }

      var tpl = NicoCommentCss3PlayerView.__TPL__;

      tpl = tpl.replace('%CSS%', css.join(''));
      tpl = tpl.replace('%MSG%', html.join(''));

      window.console.timeEnd('buildHtml');
      return tpl;
    },

    _buildGroupHtml: function(group/*, currentTime*/) {
      var m = group.getMembers();
      var type = group.getType();
      var result = [];
      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
        result.push(this._buildChatHtml(chat, type /*, currentTime */));
      }
      return result.join('\n');
    },
    _buildGroupCss: function(group, currentTime) {
      var m = group.getMembers();
      var type = group.getType();
      var result = [];
      for(var i = 0, len = m.length; i < len; i++) {
        var chat = m[i];
        result.push(this._buildChatCss(chat, type, currentTime));
      }
      return result.join('\n');
    },
    _buildChatDom: function(chat , type, size) {
      var span = document.createElement('span');
      var className = ['nicoChat',type, size];
      var scale = chat.getScale();
      if (chat.getColor() === '#000000') {
        className.push('black');
      }

      // 泥臭い
      if (scale === 0.5) {
        className.push('half');
      } else if (scale === 1.0) {
        className.push('noScale');
      } else if (scale > 1.0) {
        className.push('largeScale');
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
      if (chat.isPostFail()) {
        className.push('fail');
      }



      span.className = className.join(' ');
      span.id = chat.getId();
      span.innerHTML = chat.getHtmlText();
      span.setAttribute('data-meta', chat.toString());
      return span;
    },
    _buildChatHtml: function(chat , type /*, currentTime */) {
      var size = chat.getSize();
      var className = ['nicoChat',type, size];
      var scale = chat.getScale();
      if (chat.getColor() === '#000000') {
        className.push('black');
      }

      if (scale === 0.5) {
        className.push('half');
      } else if (scale === 1.0) {
        className.push('noScale');
      } if (scale > 1.0) {
        className.push('largeScale');
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

      var result = [
        '<span id="', chat.getId(), '" class="', className.join(' '), '">',
          chat.getHtmlText(),
        '</span>'
      ];
      return result.join('');
    },
    _buildChatCss: function(chat, type, currentTime) {
      var result;
      var scaleCss;
      var id = chat.getId();
      var playbackRate = this._playbackRate;
      var duration = chat.getDuration() / playbackRate;
      var scale = chat.getScale();
      var beginL = chat.getBeginLeftTiming();
      var screenWidth     = NicoCommentViewModel.SCREEN.WIDTH;
      var screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
      var width = chat.getWidth();
//      var height = chat.getHeight();
      var ypos = chat.getYpos();
      var color = chat.getColor();
      var fontSizePx = chat.getFontSizePixel();
      //var lineHeight = chat.getLineHeight();
      var speed = chat.getSpeed();
      var delay = (beginL - currentTime) / playbackRate;
      // 本家は「古いコメントほど薄くなる」という仕様だが、特に再現するメリットもなさそうなので
      var opacity = chat.isOverflow() ? 0.8 : 1;
      //var zid = parseInt(id.substr('4'), 10);
      //var zIndex = 10000 - (zid % 5000);
      var zIndex = beginL * 1000;

      if (type === NicoChat.TYPE.NORMAL) {
        // 4:3ベースに計算されたタイミングを16:9に補正する
        scaleCss = (scale === 1.0) ? '' : (' scale(' + scale + ')');
        var outerScreenWidth = screenWidthFull * 1.1;
        var screenDiff = outerScreenWidth - screenWidth;
        var leftPos = screenWidth + screenDiff / 2;
        var durationDiff = screenDiff / speed / playbackRate;
        duration += durationDiff;
        delay -= (durationDiff * 0.5);

        result = ['',
          ' @keyframes idou', id, ' {\n',
          '    0%  {opacity: ', opacity, '; transform: translate(0px, 0px) ', scaleCss, ';}\n',
          '  100%  {opacity: ', opacity, '; transform: translate(', - (outerScreenWidth + width), 'px, 0px) ', scaleCss, ';}\n',
          ' }\n',
          '',
          ' #', id, ' {\n',
          '  z-index: ', zIndex , ';\n',
          '  top:', ypos, 'px;\n',
          '  left:', leftPos, 'px;\n',
          '  color:', color,';\n',
          '  font-size:', fontSizePx, 'px;\n',
//          '  line-height:',  lineHeight, 'px;\n',
          '  animation-name: idou', id, ';\n',
          '  animation-duration: ', duration, 's;\n',
          '  animation-delay: ', delay, 's;\n',
          ' }\n',
          '\n\n'];
      } else {
        scaleCss =
          scale === 1.0 ?
            ' transform: translate(-50%, 0);' :
            (' transform: translate(-50%, 0) scale(' + scale + ');');

        //var left = ((screenWidth - width) / 2);
        result = ['',
          ' @keyframes fixed', id, ' {\n',
          '    0% {opacity: ', opacity, ';}\n',
          '  100% {opacity: ', 0.5, ';}\n',
          ' }\n',
          '',
          ' #', id, ' {\n',
          '  z-index: ', zIndex, ';\n',
          '  top:', ypos, 'px;\n',
          '  left: 50% ;\n',
          '  color:',  color, ';\n',
          '  font-size:', fontSizePx,  'px;\n',
//          '  line-height:', lineHeight,  'px;\n',
          '  width:', width, 'px;\n',
//          '  height:', height, 'px;\n',
          scaleCss,
          '  animation-name: fixed', id, ';\n',
          '  animation-duration: ', duration, 's;\n',
          '  animation-delay: ', delay, 's;\n',
          ' }\n',
          '\n\n'];
      }

      return result.join('') + '\n';
    },
    show: function() {
      if (!this._isShow) {
        this.refresh();
      }
      console.log('show!');
      this._isShow = true;
    },
    hide: function() {
      this.clear();
      this._isShow = false;
    },
    appendTo: function($node) {
      //var $view = $(this._view);
      //$view.css({width: 1}).offset();
      $node.append(this._view);

      // リサイズイベントを発動させる。 バッドノウハウ的
      //ZenzaWatch.util.callAsync(this._adjust, this, 1000);
    },
    /**
     * toStringで、コメントを静的なCSS3アニメーションHTMLとして出力する。
     * 生成されたHTMLを開くだけで、スクリプトもなにもないのに
     * ニコニコ動画のプレイヤーのようにコメントが流れる。 ふしぎ！
     */
    toString: function() {
      return this.buildHtml(0);
    }
  });
