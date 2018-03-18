var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var FullScreen = {};
var AsyncEmitter = function() {};
var CONSTANT = {};

//===BEGIN===

  var CommentInputPanel = function() { this.initialize.apply(this, arguments); };
  CommentInputPanel.__css__ = (`
    .commentInputPanel {
      position: fixed;
      top:  calc(-50vh + 50% + 100vh);
      left: calc(-50vw + 50% + 50vw);
      box-sizing: border-box;

      width: 200px;
      height: 50px;
      z-index: ${CONSTANT.BASE_Z_INDEX + 30000};
      transform: translate(-50%, -170px);
      overflow: visible;
    }
    .zenzaPlayerContainer.is-notPlayed .commentInputPanel,
    .zenzaPlayerContainer.is-waybackMode .commentInputPanel,
    .zenzaPlayerContainer.is-mymemory .commentInputPanel,
    .zenzaPlayerContainer.is-loading  .commentInputPanel,
    .zenzaPlayerContainer.is-error    .commentInputPanel {
      display: none;
    }

    .commentInputPanel.active {
      left: calc(-50vw + 50% + 50vw);
      width: 500px;
      z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
    }
    .zenzaScreenMode_wide .commentInputPanel,
    .fullScreen           .commentInputPanel {
      position: absolute !important; /* fixedだとFirefoxのバグで消える */
      top:  auto !important;
      bottom: 120px !important;
      transform: translate(-50%, 0);
      /*left: calc(-50vw + 50% + 50vw) !important;*/
      left: 50%;
    }
    .zenzaScreenMode_wide .commentInputPanel.active,
    .fullScreen           .commentInputPanel.active {
      /*left: calc(-50vw + 50% + 50vw) !important;*/
    }

    /* 縦長モニター */
    @media
      screen and
      (max-width: 991px) and (min-height: 700px)
    {
      .zenzaScreenMode_normal .commentInputPanel {
        /*top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);*/
        transform: translate(-50%, -230px);
      }
    }
    @media
      screen and
      (max-width: 1215px) and (min-height: 700px)
    {
      .zenzaScreenMode_big .commentInputPanel {
        /*top: calc(-50vh + 50% + 100vh - 60px - 70px - 120px);*/
        transform: translate(-50%, -230px);
      }
    }


    .commentInputPanel>* {
      pointer-events: none;
    }
    
    .commentInputPanel input {
      font-size: 18px;
    }

    .commentInputPanel.active>*,
    .commentInputPanel:hover>* {
      pointer-events: auto;
    }

    .is-mouseMoving .commentInputOuter {
      border: 1px solid #888;
      box-sizing: border-box;
      border-radius: 8px;
      opacity: 0.5;
    }
    .is-mouseMoving:not(.active) .commentInputOuter {
      box-shadow: 0 0 8px #fe9, 0 0 4px #fe9 inset;
    }

    .commentInputPanel.active .commentInputOuter,
    .commentInputPanel:hover  .commentInputOuter {
      border: none;
      opacity: 1;
    }

    .commentInput {
      width: 100%;
      height: 30px !important;
      font-size: 24px;
      background: transparent;
      border: none;
      opacity: 0;
      transition: opacity 0.3s ease, box-shadow 0.4s ease;
      text-align: center;
      line-height: 26px !important;
      padding-right: 32px !important;
      margin-bottom: 0 !important;
    }

    .commentInputPanel:hover  .commentInput {
      opacity: 0.5;
    }
    .commentInputPanel.active .commentInput {
      opacity: 0.9 !important;
    }
    .commentInputPanel.active .commentInput,
    .commentInputPanel:hover  .commentInput {
      box-sizing: border-box;
      border: 1px solid #888;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 0 8px #fff;
    }

    .commentInputPanel .autoPauseLabel {
      display: none;
    }

    .commentInputPanel.active .autoPauseLabel {
      position: absolute;
      top: 36px;
      left: 50%;
      transform: translate(-50%, 0);
      display: block;
      background: #336;
      z-index: 100;
      color: #ccc;
      padding: 0 8px;
    }

    .commandInput {
      position: absolute;
      width: 100px;
      height: 30px !important;
      font-size: 24px;
      top: 0;
      left: 0;
      border-radius: 8px;
      z-index: -1;
      opacity: 0;
      transition: left 0.2s ease, opacity 0.2s ease;
      text-align: center;
      line-height: 26px !important;
      padding: 0 !important;
      margin-bottom: 0 !important;
    }
    .commentInputPanel.active .commandInput {
      left: -108px;
      z-index: 1;
      opacity: 0.9;
      border: none;
      pointer-evnets: auto;
      box-shadow: 0 0 8px #fff;
      padding: 0;
    }

    .commentSubmit {
      position: absolute;
      width: 100px !important;
      height: 30px !important;
      font-size: 24px;
      top: 0;
      right: 0;
      border: none;
      border-radius: 8px;
      z-index: -1;
      opacity: 0;
      transition: right 0.2s ease, opacity 0.2s ease;
      line-height: 26px;
      letter-spacing: 0.2em;
    }
    .commentInputPanel.active .commentSubmit {
      right: -108px;
      z-index: 1;
      opacity: 0.9;
      box-shadow: 0 0 8px #fff;
    }
    .commentInputPanel.active .commentSubmit:active {
      color: #000;
      background: #fff;
      box-shadow: 0 0 16px #ccf;
    }
  `).trim();

  CommentInputPanel.__tpl__ = (`
    <div class="commentInputPanel forMember">
      <form action="javascript: void(0);">
      <div class="commentInputOuter">
          <input
            type="text"
            value=""
            autocomplete="on"
            name="mail"
            placeholder="コマンド"
            class="commandInput"
            maxlength="30"
          >
          <input
            type="text"
            value=""
            autocomplete="on"
            name="chat"
            accesskey="c"
            placeholder="コメント入力(C)"
            class="commentInput"
            maxlength="75"
            >
          <input
            type="submit"
            value="送信"
            name="post"
            class="commentSubmit"
            >
          <div class="recButton" title="音声入力">
          </div>
      </div>
      </form>
      <label class="autoPauseLabel">
        <input type="checkbox" class="autoPause" checked="checked">
        入力時に一時停止
      </label>
    </div>
  `).trim();

  _.extend(CommentInputPanel.prototype, AsyncEmitter.prototype);
  _.assign(CommentInputPanel.prototype, {
    initialize: function(params) {
      this._$playerContainer = params.$playerContainer;
      this._playerConfig     = params.playerConfig;


      this._recognizer = new ZenzaWatch.util.Recognizer();

      this._initializeDom();

      this._playerConfig.on('update-autoPauseCommentInput',
        _.bind(this._onAutoPauseCommentInputChange, this));
    },
    _initializeDom: function() {
      var $container = this._$playerContainer;
      var config = this._playerConfig;

      ZenzaWatch.util.addStyle(CommentInputPanel.__css__);
      $container.append(CommentInputPanel.__tpl__);

      var $view = this._$view = $container.find('.commentInputPanel');
      var $input = this._$input = $view.find('.commandInput, .commentInput');
      this._$form = $container.find('form');
      var $autoPause = this._$autoPause = $container.find('.autoPause');
      this._$commandInput = $container.find('.commandInput');
      var $cmt = this._$commentInput = $container.find('.commentInput');
      this._$commentSubmit = $container.find('.commentSubmit');
      var preventEsc = _.bind(function(e) {
        if (e.keyCode === 27) { // ESC
          e.preventDefault();
          e.stopPropagation();
          this.emit('esc');
          $input.blur();
        }
      }, this);


      $input
        .on('focus', _.bind(this._onFocus, this))
        .on('blur', _.debounce(_.bind(this._onBlur, this), 500))
        .on('keydown', preventEsc)
        .on('keyup', preventEsc);

      $autoPause.prop('checked', config.getValue('autoPauseCommentInput'));
      this._$autoPause.on('change', function() {
        config.setValue('autoPauseCommentInput', !!$autoPause.prop('checked'));
        $cmt.focus();
      });
      this._$view.find('label').on('click', function(e) {
        e.stopPropagation();
      });
      this._$form.on('submit', _.bind(this._onSubmit, this));
      this._$commentSubmit.on('click', _.bind(this._onSubmitButtonClick, this));
      $view.on('click', function(e) {
        e.stopPropagation();
      });
      $view.toggleClass('availableRecognizer', this._recognizer.isAvailable());
    },
    _onFocus: function() {
      this._$view.addClass('active');
      if (!this._hasFocus) {
        this.emit('focus', this.isAutoPause());
      }
      this._hasFocus = true;
    },
    _onBlur: function() {
      if (this._$commandInput.is(':focus') ||
          this._$commentInput.is(':focus')) {
        return;
      }
      this._$view.removeClass('active');
      this.emit('blur', this.isAutoPause());

      this._hasFocus = false;
    },
    _onSubmit: function() {
      this.submit();
    },
    _onSubmitButtonClick: function() {
      this._$form.submit();
    },
    _onAutoPauseCommentInputChange: function(val) {
      this._$autoPause.prop('checked', !!val);
    },
    submit: function() {
      var chat = this._$commentInput.val().trim();
      var cmd = this._$commandInput.val().trim();
      if (chat.length < 1) {
        return;
      }

    setTimeout(() => {
      this._$commentInput.val('').blur();
      this._$commandInput.blur();

      let $view = this._$view.addClass('updating');
      (new Promise((resolve, reject) => {
        this.emit('post', {resolve, reject}, chat, cmd);
      }))
        .then(() => {
          $view.removeClass('updating');
        })
        .catch(() => {
          $view.removeClass('updating');
        });
      }, this);
    },
    isAutoPause: function() {
      return !!this._$autoPause.prop('checked');
    },
    focus: function() {
      this._$commentInput.focus();
      this._onFocus();
    },
    blur: function() {
      this._$commandInput.blur();
      this._$commentInput.blur();
      this._onBlur();
    },
    _onRecognizerResult: function(text) {
      window.console.log('_onRecognizerResult: ', text);
      if(!this._hasFocus) { return; }
      var $inp = this._$commentInput;
      $inp.val($inp.val() + text);
    }
  });


  var Recognizer = function() { this.initialize.apply(this, arguments); };
  _.extend(Recognizer.prototype, AsyncEmitter.prototype);
  _.assign(Recognizer.prototype, {
    initialize: function() {
      this._enable = false;
      this._recording = false;
    },
    enable: function() {
      if (!this.isAvailable()) { return false;}
      if (this._recognition) { return true; }
      var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
      var rec = this._recognition = new Rec();
      rec.lang = ZenzaWatch.util.getLang();
      rec.maxAlternatives = 1;
      rec.continuous = true;
      rec.addEventListener('result', _.bind(this._onResult, this));
      this._enable = true;
      return true;
    },
    disable: function() {
      this._enable = false;
      return false;
    },
    isEnable: function() {
      return this._enable;
    },
    isAvailable: function() {
      return (window.SpeechRecognition || window.webkitSpeechRecognition) ? true : false;
    },
    isRecording: function() {
      return this._recording;
    },
    start: function() {
      if (!this.isAvailable()) { return false; }
      this.enable();
      this._recording = true;
      this._recognition.start();
    },
    stop: function() {
      if (!this._recognition) { return; }
      this._recording = false;
      this._recognition.stop();
    },
    _onResult: function(e) {
      if (!this._enable) { return; }
      var results = e.results;
      var text = '';
      for (var i = 0, len = results.length; i < len; i++) {
        var result = results.item(i);
        if(result.final === true || result.isFinal === true){
          text = result.item(0).transcript;
        }
      }
      this.emit('result', text);
    }
  });

//===END===
//

