var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var FullScreen = {};
var NicoCommentPlayer = function() {};
var AsyncEmitter = function() {};
var VideoInfoLoader = {};

//===BEGIN===


  /**
   * VideoPlayer + CommentPlayer = NicoVideoPlayer
   *
   * とはいえmasterはVideoPlayerでCommentPlayerは表示位置を受け取るのみ。
   *
   */
  var NicoVideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.assign(NicoVideoPlayer.prototype, {
    initialize: function(params) {
      var conf = this._playerConfig = params.playerConfig;

      this._fullScreenNode = params.fullScreenNode;

      this._videoPlayer = new VideoPlayer({
        volume:       conf.getValue('volume'),
        loop:         conf.getValue('loop'),
        mute:         conf.getValue('mute'),
        autoPlay:     conf.getValue('autoPlay'),
        playbackRate: conf.getValue('playbackRate'),
        debug:        conf.getValue('debug')
      });

      this._commentPlayer = new NicoCommentPlayer({
        offScreenLayer: params.offScreenLayer,
        enableFilter:   params.enableFilter,
        wordFilter:         params.wordFilter,
        wordRegFilter:      params.wordRegFilter,
        wordRegFilterFlags: params.wordRegFilterFlags,
        userIdFilter:   params.userIdFilter,
        commandFilter:  params.commandFilter,
        showComment:    conf.getValue('showComment'),
        debug:          conf.getValue('debug'),
        playbackRate:   conf.getValue('playbackRate'),
        sharedNgLevel:  conf.getValue('sharedNgLevel')
      });

      this._contextMenu = new VideoContextMenu({
        player: this,
        playerConfig: conf
      });

      if (params.node) {
        this.appendTo(params.node);
      }

      this._initializeEvents();

      this._beginTimer();

      var emitter = new AsyncEmitter();
      this.on        = _.bind(emitter.on,        emitter);
      this.emit      = _.bind(emitter.emit,      emitter);
      this.emitAsync = _.bind(emitter.emitAsync, emitter);

      ZenzaWatch.debug.nicoVideoPlayer = this;
    },
    _beginTimer: function() {
      this._stopTimer();
      this._videoWatchTimer =
        window.setInterval(
          _.bind(this._onTimer, this), 100);
    },
    _stopTimer: function() {
      if (!this._videoWatchTimer) { return; }
      window.clearInterval(this._videoWatchTimer);
      this._videoWatchTimer = null;
    },
    _initializeEvents: function() {
      this._videoPlayer.on('volumeChange', _.bind(this._onVolumeChange, this));
      this._videoPlayer.on('dblclick', _.bind(this._onDblClick, this));
      this._videoPlayer.on('aspectRatioFix', _.bind(this._onAspectRatioFix, this));
      this._videoPlayer.on('play',    _.bind(this._onPlay, this));
      this._videoPlayer.on('playing', _.bind(this._onPlaying, this));
      this._videoPlayer.on('stalled', _.bind(this._onStalled, this));
      this._videoPlayer.on('progress', _.bind(this._onProgress, this));
      this._videoPlayer.on('pause',   _.bind(this._onPause, this));
      this._videoPlayer.on('ended', _.bind(this._onEnded, this));
      this._videoPlayer.on('loadedMetaData', _.bind(this._onLoadedMetaData, this));
      this._videoPlayer.on('canPlay', _.bind(this._onVideoCanPlay, this));
      this._videoPlayer.on('durationChange', _.bind(this._onDurationChange, this));

      // マウスホイールとトラックパッドで感度が違うのでthrottoleをかますと丁度良くなる(?)
      this._videoPlayer.on('mouseWheel',
        _.throttle(_.bind(this._onMouseWheel, this), 50));

      this._videoPlayer.on('abort', _.bind(this._onAbort, this));
      this._videoPlayer.on('error', _.bind(this._onError, this));

      this._videoPlayer.on('click', _.bind(this._onClick, this));
      this._videoPlayer.on('contextMenu', _.bind(this._onContextMenu, this));

      this._commentPlayer.on('parsed', _.bind(this._onCommentParsed, this));
      this._commentPlayer.on('change', _.bind(this._onCommentChange, this));
      this._commentPlayer.on('filterChange', _.bind(this._onCommentFilterChange, this));
      this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
    },
    _onVolumeChange: function(vol, mute) {
      this._playerConfig.setValue('volume', vol);
      this._playerConfig.setValue('mute', mute);
      this.emit('volumeChange', vol, mute);
    },
    _onPlayerConfigUpdate: function(key, value) {
      switch (key) {
        case 'loop':
          this._videoPlayer.setIsLoop(value);
          break;
        case 'playbackRate':
          if (ZenzaWatch.util.isPremium()) {
            this._videoPlayer.setPlaybackRate(value);
            this._commentPlayer.setPlaybackRate(value);
          }
          break;
        case 'autoPlay':
          this._videoPlayer.setIsAutoPlay(value);
          break;
        case 'showComment':
          if (value) {
            this._commentPlayer.show();
          } else {
            this._commentPlayer.hide();
          }
          break;
        case 'mute':
          this._videoPlayer.setMute(value);
          break;
        case 'sharedNgLevel':
          this.setSharedNgLevel(value);
          break;
        case 'wordFilter':
          this.setWordFilterList(value);
          break;
        case 'userIdFilter':
          this.setUserIdFilterList(value);
          break;
        case 'commandFilter':
          this.setCommandFilterList(value);
          break;
      }
    },
    _onMouseWheel: function(e, delta) {
      // 下げる時は「うわ音でけぇ」
      // 上げる時は「ちょっと上げようかな」
      // なので下げる速度のほうが速い
      if (delta > 0) { // up
        this.volumeUp();
      } else {         // down
        this.volumeDown();
      }
    },
    volumeUp: function() {
      var v = Math.max(0.01, this._videoPlayer.getVolume());
      var r = (v < 0.05) ? 1.3 : 1.1;
      this._videoPlayer.setVolume(v * r);
    },
    volumeDown: function() {
      var v = this._videoPlayer.getVolume();
      this._videoPlayer.setVolume(v / 1.2);
    },
    _onTimer: function() {
      var currentTime = this._videoPlayer.getCurrentTime();
      this._commentPlayer.setCurrentTime(currentTime);
    },
    _onAspectRatioFix: function(ratio) {
      this._commentPlayer.setAspectRatio(ratio);
      this.emit('aspectRatioFix', ratio);
    },
    _onLoadedMetaData: function() {
      this.emit('loadedMetaData');
    },
    _onVideoCanPlay: function() {
      this.emit('canPlay');
    },
    _onDurationChange: function(duration) {
      this.emit('durationChange', duration);
    },
    _onPlay: function() {
      this._isPlaying = true;
      this.emit('play');
    },
    _onPlaying: function() {
      this._isPlaying = true;
      this.emit('playing');
    },
    _onPause: function() {
      this._isPlaying = false;
      this.emit('pause');
    },
    _onStalled: function() {
      this.emit('stalled');
    },
    _onProgress: function(range, currentTime) {
      this.emit('progress', range, currentTime);
    },
    _onEnded: function() {
      this._isPlaying = false;
      this._isEnded = true;
      this.emit('ended');
    },
    _onError: function() {
      this.emit('error');
    },
    _onAbort: function() {
      this.emit('abort');
    },
    _onClick: function() {
      this._contextMenu.hide();
    },
    _onDblClick: function() {
      if (this._playerConfig.getValue('enableFullScreenOnDoubleClick')) {
        this.toggleFullScreen();
      }
    },
    _onContextMenu: function(e) {
      this._contextMenu.show(e.offsetX, e.offsetY);
    },
    _onCommentParsed: function() {
      this.emit('commentParsed');
    },
    _onCommentChange: function() {
      this.emit('commentChange');
    },
    _onCommentFilterChange: function(nicoChatFilter) {
      this.emit('commentFilterChange', nicoChatFilter);
    },
    setVideo: function(url) {
      this._videoPlayer.setSrc(url);
      this._isEnded = false;
    },
    setThumbnail: function(url) {
      this._videoPlayer.setThumbnail(url);
    },
    play: function() {
      this._videoPlayer.play();
    },
    pause: function() {
      this._videoPlayer.pause();
    },
    togglePlay: function() {
      this._videoPlayer.togglePlay();
    },
    setPlaybackRate: function(playbackRate) {
      if (ZenzaWatch.util.isPremium()) {
        playbackRate = Math.max(0, Math.min(playbackRate, 10));
        this._videoPlayer.setPlaybackRate(playbackRate);
        this._commentPlayer.setPlaybackRate(playbackRate);
      }
    },
    setCurrentTime: function(t) {
      this._videoPlayer.setCurrentTime(Math.max(0, t));
    },
    getDuration: function() {
      return this._videoPlayer.getDuration();
    },
    getCurrentTime: function() {
      return this._videoPlayer.getCurrentTime();
    },
    getVpos: function() {
      return Math.floor(this._videoPlayer.getCurrentTime() * 100);
    },
    setComment: function(xmlText, options) {
      this._commentPlayer.setComment(xmlText, options);
    },
    getChatList: function() {
      return this._commentPlayer.getChatList();
    },
    getNonFilteredChatList: function() {
      return this._commentPlayer.getNonFilteredChatList();
    },
    setVolume: function(v) {
      this._videoPlayer.setVolume(v);
    },
    appendTo: function(node) {
      var $node = typeof node === 'string' ? $(node) : node;
      this._$parentNode = node;
      this._videoPlayer.appendTo($node);
      this._commentPlayer.appendTo($node);
      this._contextMenu.appendTo($node);
    },
    close: function() {
      this._videoPlayer.close();
      this._commentPlayer.close();
    },
    closeCommentPlayer: function() {
      this._commentPlayer.close();
    },
    toggleFullScreen: function() {
      if (FullScreen.now()) {
        FullScreen.cancel();
      } else {
        this.requestFullScreen();
      }
    },
    requestFullScreen: function() {
      FullScreen.request(this._fullScreenNode || this._$parentNode[0]);
    },
    canPlay: function() {
      return this._videoPlayer.canPlay();
    },
    isPlaying: function() {
      return !!this._isPlaying;
    },
    getBufferedRange: function() {
      return this._videoPlayer.getBufferedRange();
    },
    addChat: function(text, cmd, vpos, options) {
      if (!this._commentPlayer) {
        return;
      }
      var nicoChat = this._commentPlayer.addChat(text, cmd, vpos, options);
      console.log('addChat:', text, cmd, vpos, options, nicoChat);
      return nicoChat;
    },
    setIsCommentFilterEnable: function(v) {
      this._commentPlayer.setIsFilterEnable(v);
    },
    isCommentFilterEnable: function() {
      return this._commentPlayer.isFilterEnable();
    },
    setSharedNgLevel: function(level) {
      this._commentPlayer.setSharedNgLevel(level);
    },
    getSharedNgLevel: function() {
      return this._commentPlayer.getSharedNgLevel();
    },

    addWordFilter: function(text) {
      this._commentPlayer.addWordFilter(text);
    },
    setWordFilterList: function(list) {
      this._commentPlayer.setWordFilterList(list);
    },
    getWordFilterList: function() {
      return this._commentPlayer.getWordFilterList();
    },

    addUserIdFilter: function(text) {
      this._commentPlayer.addUserIdFilter(text);
    },
    setUserIdFilterList: function(list) {
      this._commentPlayer.setUserIdFilterList(list);
    },
    getUserIdFilterList: function() {
      return this._commentPlayer.getUserIdFilterList();
    },

    getCommandFilterList: function() {
      return this._commentPlayer.getCommandFilterList();
    },
    addCommandFilter: function(text) {
      this._commentPlayer.addCommandFilter(text);
    },
    setCommandFilterList: function(list) {
      this._commentPlayer.setCommandFilterList(list);
    },
    setVideoInfo: function(info) {
      this._videoInfo = info;
    },
    getVideoInfo: function() {
      return this._videoInfo;
    },
    getMymemory: function() {
      return this._commentPlayer.getMymemory();
    }
  });


  var VideoContextMenu = function() { this.initialize.apply(this, arguments); };
  VideoContextMenu.__css__ = ZenzaWatch.util.hereDoc(function() {/*
    .zenzaPlayerContextMenu {
      position: fixed;
      background: #fff;
      overflow: visible;
      padding: 8px;
      border: 1px outset #333;
      opacity: 0.8;
      box-shadow: 2px 2px 4px #000;
      transition: opacity 0.3s ease;
      z-index: 150000;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    .fullScreen .zenzaPlayerContextMenu {
      position: absolute;
    }

    .zenzaPlayerContextMenu:not(.show) {
      left: -9999px;
      top: -9999px;
      opacity: 0;
    }

    .zenzaPlayerContextMenu ul {
      padding: 0;
    }

    .zenzaPlayerContextMenu ul li {
      position: relative;
      line-height: 120%;
      margin: 2px 8px;
      overflow-y: visible;
      white-space: nowrap;
      cursor: pointer;
      padding: 2px 8px;
      list-style-type: none;
      float: inherit;
    }
    .zenzaPlayerContextMenu ul li.selected {
    }
    .zenzaPlayerContextMenu ul li.selected:before {
      content: '✔';
      left: -10px;
      position: absolute;
    }
    .zenzaPlayerContextMenu ul li:hover {
      background: #336;
      color: #fff;
    }
    .zenzaPlayerContextMenu ul li.separator {
      border: 1px outset;
      height: 2px;
      width: 90%;
    }
    .zenzaPlayerContextMenu.show {
      opacity: 0.8;
      {*mix-blend-mode: luminosity;*}
    }
    .zenzaPlayerContextMenu .listInner {
    }
  */});

  VideoContextMenu.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
    <div class="zenzaPlayerContextMenu">
      <div class="listInner">
        <ul>
          <li data-command="togglePlay">停止/再開</li>
          <li data-command="restart">先頭に戻る</li>
          <!--
          <li class="loop"        data-command="loop">リピート再生</li>
          <li class="showComment" data-command="showComment">コメントを表示</li>
          <li class="autoPlay"    data-command="autoPlay">自動再生</li>
          -->

          <hr class="separator">

          <li class="seek" data-command="seek" data-param="-10">10秒戻る</li>
          <li class="seek" data-command="seek" data-param="10" >10秒進む</li>
          <li class="seek" data-command="seek" data-param="-30">30秒戻る</li>
          <li class="seek" data-command="seek" data-param="30" >30秒進む</li>

          <hr class="separator forPremium">

          <li class="playbackRate forPremium" data-command="playbackRate" data-param="0.1">コマ送り(0.1x)</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="0.5">0.5x</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="0.75">0.75x</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="1.0">標準速度</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="1.25">1.25x</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="1.5">1.5x</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="2">倍速(2x)</li>
          <!--
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="4">4倍速(4x)</li>
          <li class="playbackRate forPremium" data-command="playbackRate" data-param="10.0">最高速(10x)</li>
          -->
          <hr class="separator">
          <li class="debug"        data-command="debug">デバッグ</li>
          <li class="mymemory"     data-command="mymemory">コメントの保存</a></li>
        </ul>
      </div>
    </div>
  */});


  _.assign(VideoContextMenu.prototype, {
    initialize: function(params) {
      this._playerConfig = params.playerConfig;
      this._player = params.player;
      this._initializeDom(params);

      //this._playerConfig.on('update', _.bind(this._onPlayerConfigUpdate, this));
    },
    _initializeDom: function(params) {
      ZenzaWatch.util.addStyle(VideoContextMenu.__css__);
      var $view = this._$view = $(VideoContextMenu.__tpl__);
      $view.on('click', _.bind(this._onMouseDown, this));
    },
    _onMouseDown: function(e) {
      var target = e.target, $target = $(target).closest('li');
      var command = $target.attr('data-command');
      var param = $target.attr('data-param');
      this.hide();
      e.preventDefault();
      e.stopPropagation();
      var player = this._player;
      var playerConfig = this._playerConfig;
      switch (command) {
        case 'togglePlay':
          player.togglePlay();
          break;
        case 'showComment':
        case 'loop':
        case 'autoPlay':
        case 'debug':
          this._playerConfig.setValue(command, !this._playerConfig.getValue(command));
          break;
        case 'restart':
          player.setCurrentTime(0);
          break;
        case 'seek':
          var ct = player.getCurrentTime();
          player.setCurrentTime(ct + parseInt(param, 10));
          break;
        case 'playbackRate':
          if (ZenzaWatch.util.isPremium()) {
            playerConfig.setValue('playbackRate', parseFloat(param, 10));
          }
          break;
        case 'mymemory':
          this._createMymemory();
          break;
      }
    },
    _onBodyClick: function() {
      this.hide();
    },
    _onBeforeShow: function() {
      // チェックボックスなどを反映させるならココ
      var pr = this._playerConfig.getValue('playbackRate');
      this._$view.find('.selected').removeClass('selected');
      this._$view.find('.playbackRate').each(function(i, elm) {
        var $elm = $(elm);
        var p = parseFloat($elm.attr('data-param'), 10);
        if (p == pr) {
          $elm.addClass('selected');
        }
      });
      this._$view.find('.showComment')
        .toggleClass('selected', this._playerConfig.getValue('showComment'));
      this._$view.find('.loop')
        .toggleClass('selected', this._playerConfig.getValue('loop'));
      this._$view.find('.autoPlay')
        .toggleClass('selected', this._playerConfig.getValue('autoPlay'));
      this._$view.find('.debug')
        .toggleClass('selected', this._playerConfig.getValue('debug'));
    },
    appendTo: function($node) {
      this._$node = $node;
      $node.append(this._$view);
    },
    show: function(x, y) {
      $('body').on('click.ZenzaMenuOnBodyClick', _.bind(this._onBodyClick, this));
      var $view = this._$view, $window = $(window);

      this._onBeforeShow(x, y);

      $view.css({
        left: Math.max(0, Math.min(x, $window.innerWidth()  - $view.outerWidth())),
        top:  Math.max(0, Math.min(y, $window.innerHeight() - $view.outerHeight())),
      });
      this._$view.addClass('show');
      ZenzaWatch.emitter.emitAsync('showMenu');
    },
    hide: function() {
      $('body').off('click.ZenzaMenuOnBodyClick', this._onBodyClick);
      this._$view.css({top: '', left: ''}).removeClass('show');
      ZenzaWatch.emitter.emitAsync('hideMenu');
    },
    _createMymemory: function() {
      var html = this._player.getMymemory();
      var videoInfo = this._player.getVideoInfo();
      var title =
        videoInfo.getWatchId() + ' - ' +
        videoInfo.getTitle(); // エスケープされてる
      var info = [
        '<div>',
          '<h2>', videoInfo.getTitle(), '</h2>',
          '<a href="//www.nicovideo.jp/watch/', videoInfo.getWatchId(), '?from=', Math.floor(this._player.getCurrentTime()),'">元動画</a><br>',
          '作成環境: ', navigator.userAgent, '<br>',
          '作成日: ', (new Date).toLocaleString(), '<br>',
          '<button ',
          '  onclick="document.body.className = document.body.className !== \'debug\' ? \'debug\' : \'\';return false;">デバッグON/OFF </button>',
        '</div>'
      ].join('');
      html = html
        .replace(/<title>(.*?)<\/title>/, '<title>' + title + '</title>')
        .replace(/(<body.*?>)/, '$1' + info);

      var blob = new Blob([html], { 'type': 'text/html' });
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.setAttribute('download', title + '.html');
      a.setAttribute('target', '_blank');
      a.setAttribute('href', url);
      document.body.appendChild(a);
      a.click();
      window.setTimeout(function() { a.remove(); }, 1000);
    }
  });


  /**
   *  Video要素をラップした物
   *  操作パネル等を自前で用意したいが、まだ手が回らない。
   *  中途半端にjQuery使っててきもい
   *
   *  いずれは同じインターフェースのflash版も作って、swf/flv等の再生もサポートしたい。
   */
  var VideoPlayer = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoPlayer.prototype, AsyncEmitter.prototype);
  _.assign(VideoPlayer.prototype, {
    initialize: function(params) {
      var volume =
        params.hasOwnProperty('volume') ? parseFloat(params.volume) : 0.5;
      var playbackRate = this._playbackRate =
        params.hasOwnProperty('playbackRate') ? parseFloat(params.playbackRate) : 1.0;

      var options = {
        autoPlay: !!params.autoPlay,
        autoBuffer: true,
        preload: 'auto',
        controls: !true,
        loop: !!params.loop,
        mute: !!params.mute
      };

      console.log('%cinitialize VideoPlayer... ', 'background: cyan', options);
      this._id = 'video' + Math.floor(Math.random() * 100000);
      this._$video = $('<video class="videoPlayer nico" preload="auto" autoplay/>')
        .addClass(this._id)
        .attr(options);
      this._video = this._$video[0];

      
      //this._$subVideo =
      //  $('<video class="subVideoPlayer nico" style="position: fixed; left: -9999px; width: 1px; height: 1px;" preload="auto" volume="0" autoplay="false" controls="false"/>')
      //  .addClass(this._id);
      //this._subVideo = this._$subVideo[0];

      this._isPlaying = false;
      this._canPlay = false;

      this.setVolume(volume);
      this.setMute(params.mute);
      this.setPlaybackRate(playbackRate);

      this._initializeEvents();

      ZenzaWatch.debug.video = this._video;
    },
    _reset: function() {
      this.removeClass('play pause abort error');
      this._isPlaying = false;
      this._canPlay = false;
    },
    addClass: function(className) {
      this.toggleClass(className, true);
    },
    removeClass: function(className) {
      this.toggleClass(className, false);
    },
    toggleClass: function(className, v) {
      var video = this._video;
      _.each(className.split(/[ ]+/), function(name) {
        video.classList.toggle(name, v);
      });
    },
    _initializeEvents: function() {
      this._$video
        .on('canplay',        this._onCanPlay        .bind(this))
        .on('canplaythrough', this._onCanPlayThrough .bind(this))
        .on('loadstart',      this._onLoadStart      .bind(this))
        .on('loadeddata',     this._onLoadedData     .bind(this))
        .on('loadedmetadata', this._onLoadedMetaData .bind(this))
        .on('ended',          this._onEnded          .bind(this))
        .on('emptied',        this._onEmptied        .bind(this))
        .on('stalled',        this._onStalled        .bind(this))
        .on('suspend',        this._onSuspend        .bind(this))
        .on('waiting',        this._onWaiting        .bind(this))
        .on('progress',       this._onProgress       .bind(this))
        .on('durationchange', this._onDurationChange .bind(this))
        .on('resize',         this._onResize         .bind(this))
        .on('abort',          this._onAbort          .bind(this))
        .on('error',          this._onError          .bind(this))
                                                            
        .on('pause',          this._onPause          .bind(this))
        .on('play',           this._onPlay           .bind(this))
        .on('playing',        this._onPlaying        .bind(this))
        .on('seeking',        this._onSeeking        .bind(this))
        .on('seeked',         this._onSeeked         .bind(this))
        .on('volumechange',   this._onVolumeChange   .bind(this))
                                                            
                                                            
        .on('click',          this._onClick          .bind(this))
        .on('dblclick',       this._onDoubleClick    .bind(this))
        .on('wheel',          this._onMouseWheel     .bind(this))
        .on('contextmenu',    this._onContextMenu    .bind(this))
        ;
    },
    _onCanPlay: function() {
      console.log('%c_onCanPlay:', 'background: cyan; color: blue;', arguments);

      this.setPlaybackRate(this.getPlaybackRate());
      // リピート時にも飛んでくるっぽいので初回だけにする
      if (!this._canPlay) {
        this._canPlay = true;
        this._video.classList.remove('loading');
        this.emit('canPlay');
        this.emit('aspectRatioFix',
          this._video.videoHeight / Math.max(1, this._video.videoWidth));

        //var subVideo = this._subVideo;
        //subVideo.play();
        //window.setTimeout(function() {
        //  subVideo.pause();
        //}, 500);
      }
    },
    _onCanPlayThrough: function() {
      console.log('%c_onCanPlayThrough:', 'background: cyan;', arguments);
      this.emit('canPlayThrough');
    },
    _onLoadStart: function() {
      console.log('%c_onLoadStart:', 'background: cyan;', arguments);
      this.emit('loadStart');
    },
    _onLoadedData: function() {
      console.log('%c_onLoadedData:', 'background: cyan;', arguments);
      this.emit('loadedData');
    },
    _onLoadedMetaData: function() {
      console.log('%c_onLoadedMetaData:', 'background: cyan;', arguments);
      this.emit('loadedMetaData');
    },
    _onEnded: function() {
      console.log('%c_onEnded:', 'background: cyan;', arguments);
      this.emit('ended');
    },
    _onEmptied: function() {
      console.log('%c_onEmptied:', 'background: cyan;', arguments);
      this.emit('emptied');
    },
    _onStalled: function() {
      console.log('%c_onStalled:', 'background: cyan;', arguments);
      this.emit('stalled');
    },
    _onSuspend: function() {
      ///console.log('%c_onSuspend:', 'background: cyan;', arguments);
      this.emit('suspend');
    },
    _onWaiting: function() {
      console.log('%c_onWaiting:', 'background: cyan;', arguments);
      this.emit('waiting');
    },
    _onProgress: function() {
      this.emit('progress', this._video.buffered, this._video.currentTime);
    },
    _onDurationChange: function() {
      console.log('%c_onDurationChange:', 'background: cyan;', arguments);
      this.emit('durationChange', this._video.duration);
    },
    _onResize: function() {
      console.log('%c_onResize:', 'background: cyan;', arguments);
      this.emit('resize');
    },
    _onAbort: function() {
      window.console.warn('%c_onAbort:', 'background: cyan; color: red;', arguments);
      this.addClass('abort');
      this.emit('abort');
    },
    _onError: function() {
      window.console.error('%c_onError:', 'background: cyan; color: red;', arguments);
      this.addClass('error');
      this._canPlay = false;
      this.emit('error');
    },
    _onPause: function() {
      console.log('%c_onPause:', 'background: cyan;', arguments);
      this.removeClass('play');

      this._isPlaying = false;
      this.emit('pause');
    },
    _onPlay: function() {
      console.log('%c_onPlay:', 'background: cyan;', arguments);
      this.addClass('play');
      this._isPlaying = true;

      //this._subVideo.pause();
      this.emit('play');
    },
    // ↓↑の違いがよくわかってない
    _onPlaying: function() {
      console.log('%c_onPlaying:', 'background: cyan;', arguments);
      this._isPlaying = true;
      this.emit('playing');
    },
    _onSeeking: function() {
      console.log('%c_onSeeking:', 'background: cyan;', arguments);
      this.emit('seeking', this._video.currentTime);
    },
    _onSeeked: function() {
      console.log('%c_onSeeked:', 'background: cyan;', arguments);

      // なぜかシークのたびにリセットされるので再設定 (Chromeだけ？)
      this.setPlaybackRate(this.getPlaybackRate());

      this.emit('seeked', this._video.currentTime);
    },
    _onVolumeChange: function() {
      console.log('%c_onVolumeChange:', 'background: cyan;', arguments);
      this.emit('volumeChange', this.getVolume(), this.isMuted());
    },
    _onClick: function(e) {
      this.emit('click', e);
    },
    _onDoubleClick: function(e) {
      console.log('%c_onDoubleClick:', 'background: cyan;', arguments);
      // Firefoxはここに関係なくプレイヤー自体がフルスクリーンになってしまう。
      // 手前に透明なレイヤーを被せるしかない？
      e.preventDefault();
      e.stopPropagation();
      this.emit('dblclick');
    },
    _onMouseWheel: function(e) {
      //console.log('%c_onMouseWheel:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      var delta = - parseInt(e.originalEvent.deltaY, 10);
      //window.console.log('wheel', e, delta);
      if (delta !== 0) {
        this.emit('mouseWheel', e, delta);
      }
    },
    _onContextMenu: function(e) {
      //console.log('%c_onContextMenu:', 'background: cyan;', e);
      e.preventDefault();
      e.stopPropagation();
      this.emit('contextMenu', e);
    },
    canPlay: function() {
      return !!this._canPlay;
    },
    play: function() {
      this._video.play();
    },
    pause: function() {
      this._video.pause();
    },
    isPlaying: function() {
      return !!this._isPlaying;
    },
    setThumbnail: function(url) {
      console.log('%csetThumbnail: %s', 'background: cyan;', url);

      this._thumbnail = url;
      this._video.poster = url;
      //this.emit('setThumbnail', url);
    },
    setSrc: function(url) {
      console.log('%csetSc: %s', 'background: cyan;', url);

      this._reset();

      this._src = url;
      this._video.src = url;
      //this._$subVideo.attr('src', url);
      this._canPlay = false;
      //this.emit('setSrc', url);
      this.addClass('loading');
    },
    setVolume: function(vol) {
      vol = Math.max(Math.min(1, vol), 0);
      //console.log('setVolume', vol);
      this._video.volume = vol;
    },
    getVolume: function() {
      return parseFloat(this._video.volume);
    },
    setMute: function(v) {
      v = !!v;
      if (this._video.muted !== v) {
        this._video.muted = v;
      }
    },
    isMuted: function() {
      return this._video.muted;
    },
    getCurrentTime: function() {
      if (!this._canPlay) { return 0; }
      return this._video.currentTime;
    },
    setCurrentTime: function(sec) {
      var cur = this._video.currentTime;
      if (cur !== sec) {
        this._video.currentTime = sec;
        this.emit('seek', this._video.currentTime);
      }
    },
    getDuration: function() {
      return this._video.duration;
    },
    togglePlay: function() {
      if (this._isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },
    getVpos: function() {
      return this._video.currentTime * 100;
    },
    setVpos: function(vpos) {
      this._video.currentTime = vpos / 100;
    },
    getIsLoop: function() {
      return !!this._video.loop;
    },
    setIsLoop: function(v) {
      this._video.loop = !!v;
    },
    setPlaybackRate: function(v) {
      console.log('setPlaybackRate', v);
      if (ZenzaWatch.util.isPremium()) {
        // たまにリセットされたり反映されなかったりする？
        this._playbackRate = v;
        var video = this._video;
        video.playbackRate = 1;
        window.setTimeout(function() { video.playbackRate = parseFloat(v); }, 100);
      }
    },
    getPlaybackRate: function() {
      return this._playbackRate; //parseFloat(this._video.playbackRate) || 1.0;
    },
    getBufferedRange: function() {
      return this._video.buffered;
    },
    setIsAutoPlay: function(v) {
      this._video.autoplay = v;
    },
    getIsAutoPlay: function() {
      return this._video.autoPlay;
    },
    appendTo: function($node) {
      this._$node = $node;
      $node.append(this._$video);
      //$node.append(this._$subVideo);
      var videos = document.getElementsByClassName(this._id);
      this._video = videos[0];

      //this._subVideo = videos[1];
      //this._subVideo.muted = true;
      //this._subVideo.volume = 0;
      //this._subVideo.autoplay = false;
    },
    close: function() {
      this._video.pause();

      this._video.removeAttribute('src');
      this._video.removeAttribute('poster');
      //if (this._$node) {
      //  this._$video.detach();
      //  this._$node.append(this._$video);
      //}

      //this._subVideo.removeAttribute('src');
    }
  });

