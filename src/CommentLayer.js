import _ from 'lodash';
import {AsyncEmitter} from './util';
const Emitter = AsyncEmitter;

//===BEGIN===
//
const __LAYOUT_CSS__ = (`
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.default {}

.cmd-gothic {font-family: "游ゴシック", "Yu Gothic", YuGothic, 'ＭＳ ゴシック', 'IPAMonaPGothic', sans-serif, Arial, 'Menlo';}
.cmd-mincho {font-family: "游明朝体", "Yu Mincho", YuMincho, Simsun, Osaka-mono, "Osaka−等幅", 'ＭＳ 明朝', 'ＭＳ ゴシック', 'モトヤLシーダ3等幅', monospace;}
.cmd-defont {font-family: 'Meiryo', 'IPAMonaPGothic', sans-serif, monospace, 'Menlo'; }


.nicoChat {
  position: absolute;
  padding: 1px;

  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: nowrap;
  font-weight: bolder;
  font-kerning: none;
}

  .nicoChat.big {
    line-height: 47.5px;
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

  .nicoChat .zero_space {
  }
    .nicoChat .zen_space.type115A {
    }

  .type2001 {
  }

  .arial.type2001 {
    font-family: Arial;
  }

  spacer { display: inline-block; overflow: hidden; margin: 0; padding: 0; height: 8px; vertical-align: middle;}

.html5_tab_space, .html5_space { opacity: 0; }

  `).trim();


const {CommentLayer} = (({}) => {
  const OffscreenLayer = (() => {
    const __offscreen_tpl__ = (`
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
        height: 385px;
        overflow: visible;
        background: #fff;
        white-space: pre;
    "></div>
    </body></html>
      `).trim();

    const emitter = new AsyncEmitter();
    const noop = function () {
    };
    let offScreenFrame;
    let offScreenLayer;
    let textField;

    const createFrame = function () {
      const frame = document.createElement('iframe');
      frame.className = 'offScreenLayer';
      frame.setAttribute('sandbox', 'allow-same-origin');
      document.body.appendChild(frame);
      frame.style.position = 'fixed';
      frame.style.top = '200vw';
      frame.style.left = '200vh';
      return frame;
    };

    const createTextField = function () {
      var layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');
      if (!layer) {
        return false;
      }

      const span = document.createElement('span');
      span.className = 'nicoChat';

      textField = {
        setText: function ({text, type = '', size = '', fontCommand = ''}) {
          span.innerHTML = text;
          span.className = `nicoChat ${type} ${size} ${fontCommand}`;
        },
        getOriginalWidth: function () {
          return span.offsetWidth;
        },
        getWidth: function () {
          return span.offsetWidth;
        }
      };

      layer.appendChild(span);
      return span;
    };


    let initialized = false;
    const initialize = function () {
      initialized = true;
      if (initialized) {
        return;
      }
      const frame = createFrame();
      offScreenFrame = frame;

      let layer;
      const onload = function () {
        frame.onload = noop;

        createTextField();
        let doc = offScreenFrame.contentWindow.document;
        layer = doc.getElementById('offScreenLayer');

        let resolve = function () {
          offScreenLayer = {
            getTextField: function () {
              return textField;
            },
            appendChild: function (elm) {
              layer.appendChild(elm);
            },
            removeChild: function (elm) {
              layer.removeChild(elm);
            }
          };
        };

        resolve();
      };

      let html = __offscreen_tpl__.replace('%LAYOUT_CSS%', __LAYOUT_CSS__);
      frame.onload = onload;
      frame.srcdoc = html;
    };

    let getLayer = function () {
      if (offScreenLayer) {
        return Promise.resolve(offScreenLayer);
      }

      return new Promise((resolve) => {
        emitter.on('initialized', () => {
          resolve(offScreenLayer);
        });
      });
    };

    return {
      get: getLayer,
      initialize: function () {
        setTimeout(initialize, 0);
      }
    };
  })();


  class CommentLayer extends Emitter {
    constructor(params) {
      super();
      OffscreenLayer.initialize();

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
    }
  }


  class NicoChat extends Emitter {
    constructor({chat, videoDuration}) {
      super();
      this._id = 'chat' + NicoChat.id++;
      this._currentTime = 0;

      this._date = parseInt(chat.date, 10) || Math.floor(Date.now() / 1000);

      const text = this._text = chat.text;
      this._cmd = chat.mail || '';
      this._isPremium = (chat.premium === '1');
      this._userId = chat.userId;
      this._vpos = parseInt(chat.vpos);
      this._deleted = chat.deleted === '1';
      this._color = null;
      this._size = NicoChat.SIZE.MEDIUM;
      this._type = NicoChat.TYPE.NAKA;
      this._duration = 4; //NicoChatViewModel.DURATION.NAKA;
      this._isMine = chat.mine === '1';
      this._isUpdating = chat.updating === '1';
      this._ngScore = parseInt(chat.score || '0', 10);
      this._fork = parseInt(chat.fork || '0', 10);
      this._leaf = parseInt(chat.leaf || '-1', 10);
      // fork * 100000000を足してるのは苦し紛れの措置. いつか直す (本当に？)
      this._no =
        parseInt(chat.no || '0', 10) + this._fork * 100000000;
      if (this._fork > 0 && text.match(/^[/＠@]/)) {
        this._isNicoScript = true;
        this._isInvisible = true;
      }

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

  NicoChat._CMD_DURATION = /(@|＠)([0-9.]+)/;
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


  return {
    CommentLayer,
    NicoChat
  };
})();


//===END===
//
//
module.exports = {
  CommentLayer
};
