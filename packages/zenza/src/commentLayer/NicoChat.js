//===BEGIN===
/**
 * コメントの最小単位
 *
 */
function NicoChatInitFunc() {
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
      isCA: false,
      thread: 0,
      nicoru: 0,
      opacity: 1
    }, options);
  }

  static create(data, options = {}) {
    return new NicoChat(NicoChat.createBlank(data), options);
  }

  static createFromChatElement(elm, options = {}) {
    const data = {
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
    return new NicoChat(data, options);
  }


  static parseCmd(command, isFork = false, props = {}) {
    const tmp = command.toLowerCase().split(/[\x20\xA0\u3000\t\u2003\s]+/);
    const cmd = {};
    for (const c of tmp) {
      if (NicoChat.COLORS[c]) {
        cmd.COLOR = NicoChat.COLORS[c];
      } else if (NicoChat._COLOR_MATCH.test(c)) {
        cmd.COLOR = c;
      } else if (isFork && NicoChat._CMD_DURATION.test(c)) {
        cmd.duration = RegExp.$1;
      } else {
        cmd[c] = true;
      }
    }

    if (cmd.COLOR) {
      props.color = cmd.COLOR;
      props.hasColorCommand = true;
    }

    if (cmd.big) {
      props.size = NicoChat.SIZE.BIG;
      props.hasSizeCommand = true;
    } else if (cmd.small) {
      props.size = NicoChat.SIZE.SMALL;
      props.hasSizeCommand = true;
    }

    if (cmd.ue) {
      props.type = NicoChat.TYPE.TOP;
      props.duration = NicoChat.DURATION.TOP;
      props.hasTypeCommand = true;
    } else if (cmd.shita) {
      props.type = NicoChat.TYPE.BOTTOM;
      props.duration = NicoChat.DURATION.BOTTOM;
      props.hasTypeCommand = true;
    }

    if (cmd.ender) {
      props.isEnder = true;
    }
    if (cmd.full) {
      props.isFull = true;
    }
    if (cmd.pattisier) {
      props.isPatissier = true;
    }
    if (cmd.ca) {
      props.isCA = true;
    }

    if (cmd.duration) {
      props.hasDurationSet = true;
      props.duration = Math.max(0.01, parseFloat(cmd.duration, 10));
    }

    if (cmd.mincho) {
      props.fontCommand = 'mincho';
      props.commentVer = 'html5';
    } else if (cmd.gothic) {
      props.fontCommand = 'gothic';
      props.commentVer = 'html5';
    } else if (cmd.defont) {
      props.fontCommand = 'defont';
      props.commentVer = 'html5';
    }

    if (cmd._live) {
      props.opacity *= 0.5;
    }

    return props;
  }

  static SORT_FUNCTION(a, b) {
    const av = a.vpos, bv = b.vpos;
    if (av !== bv) {
      return av - bv;
    } else {
      return a.uniqNo < b.uniqNo ? -1 : 1;
    }
  }

  constructor(data, options = {}) {
    options = Object.assign({videoDuration: 0x7FFFFF, mainThreadId: 0, format: ''}, options);
    const props = this.props = {};
    props.id = `chat${NicoChat.id++}`;
    props.currentTime = 0;

    Object.assign(props, data);
    if (options.format === 'bulk') {
      return;
    }
    props.userId = data.user_id;
    props.fork = data.fork * 1;
    props.thread = data.thread * 1;
    props.isPremium = data.premium ? '1' : '0';
    props.isSubThread = (options.mainThreadId && props.thread !== options.mainThreadId);
    props.layerId = typeof data.layerId === 'number' ?
      data.layerId : (/* this.props.thread * 10 + */ props.fork * 1);
    props.uniqNo =
      (data.no                 %   10000) +
      (data.fork               *  100000) +
      ((data.thread % 1000000) * 1000000);
    props.color = null;
    props.size = NicoChat.SIZE.MEDIUM;
    props.type = NicoChat.TYPE.NAKA;
    props.duration = NicoChat.DURATION.NAKA;
    props.commentVer = 'flash';
    props.nicoru = data.nicoru || 0;
    props.valhalla = data.valhala;
    props.lastNicoruDate = data.last_nicoru_date || null;
    props.opacity = 1;

    props.time3d = 0;
    props.time3dp = 0;

    const text = props.text;
    if (props.fork > 0 && text.match(/^[/＠@]/)) {
      props.isNicoScript = true;
      props.isInvisible = true;
    }

    if (props.deleted) {
      return;
    }

    const cmd = props.cmd;
    if (cmd.length > 0 && cmd.trim() !== '184') {
      NicoChat.parseCmd(cmd, props.fork > 0, props);
    }

    // durationを超える位置にあるコメントを詰める vposはセンチ秒なので気をつけ
    const maxv =
      props.isNicoScript ?
        Math.min(props.vpos, options.videoDuration * 100) :
        Math.min(props.vpos, (1 + options.videoDuration - props.duration) * 100);
    const minv = Math.max(maxv, 0);
    props.vpos = minv;
  }

  reset () {
    Object.assign(this.props, {
      text: '',
      date: '000000000',
      cmd: '',
      isPremium: false,
      userId: '',
      vpos: 0,
      deleted: '',
      color: '#FFFFFF',
      size: NicoChat.SIZE.MEDIUM,
      type: NicoChat.TYPE.NAKA,
      isMine: false,
      score: 0,
      no: 0,
      fork: 0,
      isInvisible: false,
      isReverse: false,
      isPatissier: false,
      fontCommand: '',
      commentVer: 'flash',
      nicoru: 0,
      currentTime: 0,
      hasDurationSet: false
    });
  }
  onChange () {
    if (this.props.group) {
      this.props.group.onChange({chat: this});
    }
  }
  set currentTime(sec) { this.props.currentTime = sec;}
  get currentTime() { return this.props.currentTime;}
  set group(group) {this.props.group = group;}
  get group() { return this.props.group;}
  get isUpdating() { return !!this.props.isUpdating; }
  set isUpdating(v) {
    if (this.props.isUpdating !== v) {
      this.props.isUpdating = !!v;
      if (!v) {
        this.onChange();
      }
    }
  }
  set isPostFail(v) {this.props.isPostFail = v;}
  get isPostFail() {return !!this.props.isPostFail;}
  get id() {return this.props.id;}
  get text() {return this.props.text;}
  set text(v) {
    this.props.text = v;
    this.props.htmlText = null;
  }
  get htmlText() {return this.props.htmlText || '';}
  set htmlText(v) { this.props.htmlText = v; }
  get date() {return this.props.date;}
  get dateUsec() {return this.props.date_usec;}
  get lastNicoruDate() {return this.props.lastNicoruDate;}
  get cmd() {return this.props.cmd;}
  get isPremium() {return !!this.props.isPremium;}
  get isEnder() {return !!this.props.isEnder;}
  get isFull() {return !!this.props.isFull;}
  get isMine() {return !!this.props.isMine;}
  get isInvisible() {return this.props.isInvisible;}
  get isNicoScript() {return this.props.isNicoScript;}
  get isPatissier() {return this.props.isPatissier;}
  get isSubThread() {return this.props.isSubThread;}
  get hasColorCommand() {return !!this.props.hasColorCommand;}
  get hasSizeCommand() {return !!this.props.hasSizeCommand;}
  get hasTypeCommand() {return !!this.props.hasTypeCommand;}
  get duration() {return this.props.duration;}
  get hasDurationSet() {return !!this.props.hasDurationSet;}
  set duration(v) {
    this.props.duration = v;
    this.props.hasDurationSet = true;
  }
  get userId() {return this.props.userId;}
  get vpos() {return this.props.vpos;}
  get beginTime() {return this.vpos / 100;}
  get isDeleted() {return !!this.props.deleted;}
  get color() {return this.props.color;}
  set color(v) {this.props.color = v;}
  get size() {return this.props.size;}
  set size(v) {this.props.size = v;}
  get type() {return this.props.type;}
  set type(v) {this.props.type = v;}
  get score() {return this.props.score;}
  get no() {return this.props.no;}
  set no(no) {
    const props = this.props;
    props.no = no;
    props.uniqNo =
      (no     %  100000) +
      (props.fork   *  1000000) +
      (props.thread * 10000000);
  }
  get uniqNo() {return this.props.uniqNo;}
  get layerId() {return this.props.layerId;}
  get leaf() {return this.props.leaf;}
  get fork() {return this.props.fork;}
  get isReverse() {return this.props.isReverse;}
  set isReverse(v) {this.props.isReverse = !!v;}
  get fontCommand() {return this.props.fontCommand;}
  get commentVer() {return this.props.commentVer;}
  get threadId() {return this.props.thread;}
  get nicoru() {return this.props.nicoru;}
  set nicoru(v) {this.props.nicoru = v;}
  get nicotta() { return !!this.props.nicotta;}
  set nicotta(v) { this.props.nicotta = v;
    // this.onChange();
  }
  get opacity() {return this.props.opacity;}
  get valhalla() {return this.props.valhalla || 0; }
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
NicoChat.DURATION = {
  TOP: 3 - 0.1,
  NAKA: 4,
  BOTTOM: 3 - 0.1
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
  return NicoChat;
} // worker用
const NicoChat = NicoChatInitFunc();
//===END===
export {NicoChat, NicoChatInitFunc};

//   getDuration() {return this.props.duration;}
//   // hasDurationSet () {return !!this.props.hasDurationSet;}
//   setDuration (v) {
//     this.props.duration = v;
//     this.props.hasDurationSet = true;
//   }
//   getUserId() {return this.props.userId;}
//   getVpos() {return this.props.vpos;}
//   getBeginTime() {return this.getVpos() / 100;}
//   setCurrentTime (sec) { this.props.currentTime = sec;}
//   getCurrentTime() { return this.props.currentTime;}
//   setGroup (group) {this.props.group = group;}
//   getId() {return this.props.id;}
//   getText() {return this.props.text;}
//   setText(v) {this.props.text = v;}
//   getDate() {return this.props.date;}
//   getCmd() {return this.props.cmd;}
//   getColor() {return this.props.color;}
//   setColor(v) {this.props.color = v;}
//   getSize() {return this.props.size;}
//   setSize(v) {this.props.size = v;}
//   getType() {return this.props.type;}
//   setType(v) {this.props.type = v;}
//   getScore() {return this.props.score;}
//   getNo() {return this.props.no;}
//   setNo(no) { this.no = no;}

//   getUniqNo() {return this.props.uniqNo;}
//   getLayerId() {return this.props.layerId;}
//   getLeaf() {return this.props.leaf;}
//   getFork() {return this.props.fork;}
//   // isReverse() {return this.props.isReverse;}
//   setIsReverse(v) {this.props.isReverse = !!v;}
//   getFontCommand() {return this.props.fontCommand;}
//   getCommentVer() {return this.props.commentVer;}
//   getThreadId() {return this.props.thread;}
