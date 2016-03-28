var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

// シークバーのサムネイル関連
// 動ける間になんとか作り上げよう
//===BEGIN===

/*
// マスコットキャラクターのサムネーヨちゃん サムネイルがない時にあらわれる
　 ∧  ∧　  　┌────────────
　( ´ー｀)　 ＜　サムネーヨ
 　＼　< 　　　└───/|────────
　　　＼.＼＿＿＿＿__／/
　　　　 ＼　　　　　／
　　　　　 ∪∪￣∪∪
*/



  var StoryBoardModel = function() { this.initialize.apply(this, arguments); };
  _.extend(StoryBoardModel.prototype, AsyncEmitter.prototype);

  _.assign(StoryBoardModel.prototype,{
      initialize: function(params) {
        //this._isEnabled       = params.isEnabled;
      },
      _createBlankData: function(info) {
        _.assign(info, {
          duration: 1,
          url: '',
          storyBoard: [{
            id: 1,
            url: '',
            thumbnail: {
              width: 1,
              height: 1,
              number: 1,
              interval: 1
            },
            board: {
              rows: 1,
              cols: 1,
              number: 1
            }
          }]
        });
        return info;
      },

      update: function(info) {
        if (!info || info.status !== 'ok') {
          this._info = this._createBlankData();
          this._isEnabled = false;
        } else {
          this._info = info;
          this._isEnabled = true;
        }

        this.emitAsync('update');
      },

      reset: function() {
        this._isEnabled = false;
        this.emitAsync('reset');
      },

      unload: function() {
        this._isEnabled = false;
        this.emitAsync('unload');
      },

      isEnabled: function() {
        return !!this._isEnabled;
      },

      hasSubStoryBoard: function() {
        return this._info.storyBoard.length > 1;
      },

      getStatus:   function() { return this._info.status; },
      getMessage:  function() { return this._info.message; },
      getDuration: function() { return parseInt(this._info.duration, 10); },

      getUrl: function(i) { return this._info.storyBoard[i || 0].url; },
      getWidth:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.width, 10); },
      getHeight:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.height, 10); },
      getInterval:
        function(i) { return parseInt(this._info.storyBoard[i || 0].thumbnail.interval, 10); },
      getCount: function(i) {
        return Math.max(
          Math.ceil(this.getDuration() / Math.max(0.01, this.getInterval())),
          parseInt(this._info.storyBoard[i || 0].thumbnail.number, 10)
        );
      },
      getRows: function(i) { return parseInt(this._info.storyBoard[i || 0].board.rows, 10); },
      getCols: function(i) { return parseInt(this._info.storyBoard[i || 0].board.cols, 10); },
      getPageCount: function(i) { return parseInt(this._info.storyBoard[i || 0].board.number, 10); },
      getTotalRows: function(i) {
        return Math.ceil(this.getCount(i) / this.getCols(i));
      },

      getPageWidth:    function(i) { return this.getWidth(i)  * this.getCols(i); },
      getPageHeight:   function(i) { return this.getHeight(i) * this.getRows(i); },
      getCountPerPage: function(i) { return this.getRows(i)   * this.getCols(i); },

      /**
       *  nページ目のURLを返す。 ゼロオリジン
       */
      getPageUrl: function(page, storyBoardIndex) {
        page = Math.max(0, Math.min(this.getPageCount(storyBoardIndex) - 1, page));
        return this.getUrl(storyBoardIndex) + '&board=' + (page + 1);
      },

      /**
       * msに相当するサムネは何番目か？を返す
       */
      getIndex: function(ms, storyBoardIndex) {
        // msec -> sec
        var v = Math.floor(ms / 1000);
        v = Math.max(0, Math.min(this.getDuration(), v));

        // サムネの総数 ÷ 秒数
        // Math.maxはゼロ除算対策
        var n = this.getCount(storyBoardIndex) / Math.max(1, this.getDuration());

        return parseInt(Math.floor(v * n), 10);
      },

      /**
       * Indexのサムネイルは何番目のページにあるか？を返す
       */
      getPageIndex: function(thumbnailIndex, storyBoardIndex) {
        var perPage   = this.getCountPerPage(storyBoardIndex);
        var pageIndex = parseInt(thumbnailIndex / perPage, 10);
        return Math.max(0, Math.min(this.getPageCount(storyBoardIndex), pageIndex));
      },

      /**
       *  msに相当するサムネは何ページの何番目にあるか？を返す
       */
      getThumbnailPosition: function(ms, storyBoardIndex) {
        var thumbnailIndex = this.getIndex(ms, storyBoardIndex);
        var pageIndex      = this.getPageIndex(thumbnailIndex);

        var mod = thumbnailIndex % this.getCountPerPage(storyBoardIndex);
        var row = Math.floor(mod / Math.max(1, this.getCols()));
        var col = mod % this.getRows(storyBoardIndex);

        return {
          page: pageIndex,
          index: thumbnailIndex,
          row: row,
          col: col
        };
      },

      /**
       * nページ目のx, y座標をmsに変換して返す
       */
      getPointms: function(x, y, page, storyBoardIndex) {
        var width  = Math.max(1, this.getWidth(storyBoardIndex));
        var height = Math.max(1, this.getHeight(storyBoardIndex));
        var row = Math.floor(y / height);
        var col = Math.floor(x / width);
        var mod = x % width;


        // 何番目のサムネに相当するか？
        var point =
          page * this.getCountPerPage(storyBoardIndex) +
          row  * this.getCols(storyBoardIndex)         +
          col +
          (mod / width) // 小数点以下は、n番目の左端から何%あたりか
          ;

        // 全体の何%あたり？
        var percent = point / Math.max(1, this.getCount(storyBoardIndex));
        percent = Math.max(0, Math.min(100, percent));

        // msは㍉秒単位なので1000倍
        return Math.floor(this.getDuration() * percent * 1000);
      },

      /**
       * msは何ページ目に当たるか？を返す
       */
      getmsPage: function(ms, storyBoardIndex) {
        var index = this._storyBoard.getIndex(ms, storyBoardIndex);
        var page  = this._storyBoard.getPageIndex(index, storyBoardIndex);

        return page;
      },

      /**
       * nページ目のCols, Rowsがsubではどこになるかを返す
       */
      getPointPageColAndRowForSub: function(page, row, col) {
        var mainPageCount = this.getCountPerPage();
        var subPageCount  = this.getCountPerPage(1);
        var mainCols = this.getCols();
        var subCols = this.getCols(1);

        var mainIndex = mainPageCount * page + mainCols * row + col;
        var subOffset = mainIndex % subPageCount;

        var subPage = Math.floor(mainIndex / subPageCount);
        var subRow = Math.floor(subOffset / subCols);
        var subCol = subOffset % subCols;

        return {
          page: subPage,
          row: subRow,
          col: subCol
        };
      }

    });


    var SeekBarThumbnail = function() { this.initialize.apply(this, arguments); };
    SeekBarThumbnail.__tpl__ = ZenzaWatch.util.hereDoc(function() {/*
      <div class="zenzaSeekThumbnail">
        <div class="zenzaSeekThumbnail-image">
        </div>
      </div>
    */});
    SeekBarThumbnail.__css__ = ZenzaWatch.util.hereDoc(function() {/*
      .error .zenzaSeekThumbnail,
      .loading .zenzaSeekThumbnail {
        display: none !important;
      }

      .zenzaSeekThumbnail {
        display: none;
        pointer-events: none;
      }

      .seekBarContainer:not(.enableCommentPreview) .zenzaSeekThumbnail.show {
        display: block;
      }

      .zenzaSeekThumbnail-image {
        margin: 4px;
        background: none repeat scroll 0 0 #999;
        border: 1px inset;
        margin: auto;
      }

    */});
    _.extend(SeekBarThumbnail.prototype, AsyncEmitter.prototype);
    _.assign(SeekBarThumbnail.prototype, {
      initialize: function(params) {
        this._model      = params.model;
        this._$container = params.$container;
        this._scale      = _.isNumber(params.scale) ? params.scale : 0.8;

        this._preloadImages =
          _.debounce(this._preloadImages.bind(this), 60 * 1000 * 5);
        this._model.on('reset',  this._onModelReset.bind(this));
        this._model.on('update', this._onModelUpdate.bind(this));

        ZenzaWatch.debug.seekBarThumbnail = this;
      },
      _onModelUpdate: function() {
        if (!this._model.isEnabled()) {
          this._isEnabled = false;
          this.hide();
          return;
        }
        this.initializeView();

        var model = this._model;
        this._isEnabled = true;
        this._colWidth  = model.getWidth();
        this._rowHeight = model.getHeight();
        this._$image.css({
          width:  this._colWidth  * this._scale,
          height: this._rowHeight * this._scale,
          'background-size':
            (model.getCols() * this._colWidth  * this._scale) + 'px ' +
            (model.getRows() * this._rowHeight * this._scale) + 'px'
        });
        //this._$view.css('height', this._rowHeight * this + 4);

        this._preloadImages();
        this.show();
      },
      _onModelReset: function() {
        this.hide();
        this._imageUrl = '';
        if (this._$image) { this._$image.css('background-image', ''); }
      },
      _preloadImages: function() {
        // セッションの有効期限が切れる前に全部の画像をロードしてキャッシュに収めておく
        // やっておかないと、しばらく放置した時に読み込めない
        var model = this._model;
        if (!model.isEnabled()) {
          return;
        }
        var pages = model.getPageCount();
        var div = document.createElement('div');
        for (var i = 0; i < pages; i++) {
          var url = model.getPageUrl(i);
          var img = document.createElement('img');
          img.src = url;
          div.appendChild(img);
        }

        this._$preloadImageContainer.html(div.innerHTML);
      },
      show: function() {
        if (!this._$view) { return; }
        this._$view.addClass('show');
      },
      hide: function() {
        if (!this._$view) { return; }
        this._$view.removeClass('show');
      },
      initializeView: function() {
        this.initializeView = _.noop;

        if (!SeekBarThumbnail.styleAdded) {
          ZenzaWatch.util.addStyle(SeekBarThumbnail.__css__);
          SeekBarThumbnail.styleAdded = true;
        }
        var $view = this._$view = $(SeekBarThumbnail.__tpl__);
        this._$image = $view.find('.zenzaSeekThumbnail-image');

        this._$preloadImageContainer =
          $('<div class="preloadImageContaienr" style="display: none !important;"></div>');
        $('body').append(this._$preloadImageContainer);

        if (this._$container) {
          this._$container.append($view);
        }
      },
      setCurrentTime: function(sec) {
        if (!this._model.isEnabled() || !this._$image) { return; }

        var ms = Math.floor(sec * 1000);
        var model = this._model;
        var pos = model.getThumbnailPosition(ms, 0);
        var url = model.getPageUrl(pos.page);
        var x = pos.col * this._colWidth  * -1 * this._scale;
        var y = pos.row * this._rowHeight * -1 * this._scale;
        var css = {};
        var updated = false;

        if (this._imageUrl !== url) {
          css.backgroundImage = 'url(' + url + ')';
          updated = true;
        }
        if (this._imageX !== x || this._imageY !== y) {
          css.backgroundPosition = x + 'px ' + y + 'px';
          this._imageX = x;
          this._imageY = y;
          updated = true;
        }

        if (updated) {
          this._$image.css(css);
        }
      }
    });

    var StoryBoard = function() { this.initialize.apply(this, arguments); };
    _.extend(StoryBoard.prototype, AsyncEmitter.prototype);
    _.assign(StoryBoard.prototype, {
      initialize: function(params) {

        //this._player = params.player;
        this._playerConfig  = params.playerConfig;
        this._loader = params.loader || ZenzaWatch.api.StoryBoardInfoLoader;
        this._isEnable = true;
        //  _.isBoolean(params.enable) ? params.enable : ZenzaWatch.util.isPremium();

        /*
        evt.addEventListener('onStoryBoardSelect',
          this._onStoryBoardSelect.bind(this));
        */
        this._initializeStoryBoard();
        ZenzaWatch.debug.storyBoard = this;
      },

      _initializeStoryBoard: function() {
        this._initializeStoryBoard = _.noop;

        if (!this._model) {
          this._model = new StoryBoardModel({
          });
        }
        //if (!this._view) {
        //  this._view = StoryBoardView({
        //    model: this._model,
        //    frameSkip: this._playerConfig.get('frameSkip')
        //  });
        //}
      },
      reset: function() {
        this._model.reset();
      },
      onVideoCanPlay: function(watchId, videoInfo) {
        if (!this._isEnable) { return; }
        if (!ZenzaWatch.util.isPremium()) { return; }
        if (!this._playerConfig.getValue('enableStoryBoard')) { return; }

        var url = videoInfo.getVideoUrl();
        if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
          return;
        }

        this._initializeStoryBoard();
        this._watchId = watchId;
        ZenzaWatch.api.StoryBoardInfoLoader.load(url).then(
          this._onStoryBoardInfoLoad.bind(this),
          this._onStoryBoardInfoLoadFail.bind(this)
        );
      },
      _onStoryBoardInfoLoad: function(info) {
        window.console.log('onStoryBoardInfoLoad', info);
        this._model.update(info);
      },
      _onStoryBoardInfoLoadFail: function(err) {
        window.console.log('onStoryBoardInfoFail', err);
      },

      getSeekBarThumbnail: function(params) {
        if (this._seekBarThumbnail) {
          return this._seekBarThumbnail;
        }
        this._seekBarThumbnail = new SeekBarThumbnail({
          model: this._model,
          $container: params.$container
        });
        return this._seekBarThumbnail;
      },

      _onStoryBoardSelect: function(ms) {
        window.console.log('_onStoryBoardSelect: ', ms);
        //this._watchController.setms(ms);
        this._emit('command', 'seek', ms / 100);
      },

      toggleEnable: function(v) {
        if (!_.isBoolean(v)) {
          this._isEnable = !this._isEnable;
          this.emit('update');
          return;
        }

        if (this._isEnable !== v) {
          this._isEnable = v;
          this.emit('update');
        }
      }
    });


//===END===



    var RequestAnimationFrame = function() { this.initialize.apply(this, arguments); };
    _.assign(RequestAnimationFrame.prototype, {
      initialize: function(callback, frameSkip) {
        this.requestAnimationFrame = (window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame).bind(window);
        this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
        this._frameCount = 0;
        this._callback = callback;
        this._enable = false;
        this._onFrame = this._onFrame.bind(this);
      },
      _onFrame: function() {
        if (this._enable) {
          this._frameCount++;
          try {
            if (this._frameCount % (this._frameSkip + 1) === 0) {
              this._callback();
            }
          } catch (e) {
            console.log('%cException!', 'background: red;', e);
          }
          this.requestAnimationFrame(this._onFrame);
        }
      },
      enable: function() {
        if (this._enable) { return; }
        this._enable = true;
        this.requestAnimationFrame(this._onFrame);
      },
      disable: function() {
        this._enable = false;
      }
    });



    var StoryBoardBlockList = (function() {
      var StoryBoardBlock = function(option) { this.initialize(option); };
      _.assign(StoryBoardBlock.prototype, {
        initialize: function(option) {
          var height = option.boardHeight;

          this._backgroundPosition = '0 -' + height * option.row + 'px';
          this._src = option.src;
          this._page = option.page;
          this._isLoaded = false;

          var $view = $('<div class="board"/>')
            .css({
              width: option.pageWidth,
              height: height,
              backgroundPosition: '0 -' + height * option.row + 'px'
            })
            .attr({
              'data-src': option.src,
              'data-page': option.page,
              'data-top': height * option.row + height / 2,
              'data-backgroundPosition': this._backgroundPosition
            })
            .append(option.$inner);

          this._isLoaded = true;
          $view.css('background-image', 'url(' + option.src + ')');

          this._$view = $view;
         },
         loadImage: function() {
           if (this._isLoaded) {
             return;
           }
           var $view = this._$view;
           var img = new Image();
           img.onload = function() {
             $view
             .css({
               'background-image': 'url(' + this._src + ')',
               'background-position': this._backgroundPosition,
               'background-size': '',
             })
             .removeClass('lazyImage page-' + this._page);
             $view = img = null;
           }.bind(this);
           img.onerror = function() {
             $view = img = null;
           };
           img.src = this._src;
           this._isLoaded = true;
         },
         getPage: function() { return this._page; },
         getView: function() { return this._$view; }
      });
      var StoryBoardBlockBorder = function(width, height, cols) {
        this.initialize(width, height, cols);
      };
      _.assign(StoryBoardBlockBorder.prototype, {
        initialize: function(width, height, cols) {
          var $border = $('<div class="border"/>').css({
            width: width,
            height: height
          });
          var $div = $('<div />');
          for (var i = 0; i < cols; i++) {
            $div.append($border.clone());
          }
          this._$view = $div;
        },
        getView: function() {
          return this._$view.clone();
        }
      });

      var StoryBoardBlockList = function(storyBoard) {
        this.initialize(storyBoard);
      };
      _.assign(StoryBoardBlockList.prototype, {
        initialize: function(storyBoard) {
          if (storyBoard) {
            this.create(storyBoard);
          }
        },
        create: function(storyBoard) {
          var pages      = storyBoard.getPageCount();
          var pageWidth  = storyBoard.getPageWidth();
          var width      = storyBoard.getWidth();
          var height     = storyBoard.getHeight();
          var rows       = storyBoard.getRows();
          var cols       = storyBoard.getCols();

          var totalRows = storyBoard.getTotalRows();
          var rowCnt = 0;
          this._$innerBorder =
            new StoryBoardBlockBorder(width, height, cols);
          var $view = $('<div class="boardList"/>')
            .css({
              width: storyBoard.getCount() * width,
            //  paddingLeft: '50%',
            //  paddingRight: '50%',
              height: height
            });
          this._$view = $view;
          this._blocks = [];
          this._lazyLoaded = [];

          for (var i = 0; i < pages; i++) {
            var src = storyBoard.getPageUrl(i);
            for (var j = 0; j < rows; j++) {
              var option = {
                width: width,
                pageWidth: pageWidth,
                boardHeight: height,
                page: i,
                row: j,
                src: src
              };
              this.appendBlock(option);
              rowCnt++;
              if (rowCnt >= totalRows) {
                break;
              }
            }
          }

          this._lazyLoadImageTimer =
            window.setTimeout(this._lazyLoadAll.bind(this), 1000 * 60 * 4);
        },
        appendBlock: function(option) {
          option.$inner = this._$innerBorder.getView();
          var block = new StoryBoardBlock(option);
          this._blocks.push(block);
          this._$view.append(block.getView());
        },
        loadImage: function(pageNumber) {
          if (pageNumber < 1 || this._lazyLoaded[pageNumber]) {
            return;
          }
          this._lazyLoaded[pageNumber] = true;
          for (var i = 0, len = this._blocks.length; i < len; i++) {
            var block = this._blocks[i];
            if (block.getPage() <= pageNumber) {
              block.loadImage();
            }
          }
       },
       _lazyLoadAll: function() {
         console.log('%clazyLoadAll', 'background: cyan;');
         for (var i = 1, len = this._blocks.length; i < len; i++) {
           this._blocks[i].loadImage();
         }
       },
       clear: function() {
         this._$view.remove();
         if (this._lazyLoadImageTimer) {
           window.clearTimeout(this._lazyLoadImageTimer);
         }
       },
       getView: function() {
          return this._$view;
       }
      });

      return StoryBoardBlockList;
    })();


    var StoryBoardView = (function() {
      return {};
      var MS_RATE = 10;

      function StoryBoardView(params) {
        this.initialize(params);
      }

      _.assign(StoryBoardView.prototype, {
        initialize: function(params) {
          console.log('%c initialize StoryBoardView', 'background: lightgreen;');

          //this._watchController = params.watchController;
          var evt = this._eventDispatcher = params.eventDispatcher;
          var sb  = this._storyBoard = params.storyBoard;

          this._isHover = false;
          this._autoScroll = true;
          this._currentUrl = '';
          this._lazyImage = {};
          this._lastPage = -1;
          this._lastMs = 0;
          this._lastGetMs = 0;
          this._timerCount = 0;
          this._scrollLeft = 0;
          this._frameSkip = params.frameSkip || 1;

          //this._enableButtonView =
          //  new window.NicoVideoStoryBoard.view.SetToEnableButtonView({
          //    storyBoard:      sb,
          //    eventDispatcher: this._eventDispatcher,
          //    watchController: this._watchController
          //  });

          this._fullScreenModeView =
            new window.NicoVideoStoryBoard.view.FullScreenModeView();
          //evt.addEventListener('onWatchInfoReset', this._onWatchInfoReset.bind(this));

          sb.addEventListener('update', this._onStoryBoardUpdate.bind(this));
          sb.addEventListener('reset',  this._onStoryBoardReset .bind(this));
          sb.addEventListener('unload', this._onStoryBoardUnload.bind(this));

          this._requestAnimationFrame = new RequestAnimationFrame(this._onTimerInterval.bind(this), this._frameSkip);
        },
        _initializeStoryBoard: function() {
          this._initializeStoryBoard = _.noop;
          window.console.log('%cStoryBoardView.initializeStoryBoard', 'background: lightgreen;');

          var $view = this._$view = $(storyBoardTemplate);

          var $inner = this._$inner = $view.find('.storyBoardInner');
          this._$failMessage   = $view.find('.failMessage');
          this._$cursorTime    = $view.find('.cursorTime');
          this._$disableButton = $view.find('.setToDisable button');

          $view
            .on('click',     '.board',
                this._onBoardClick.bind(this))
            .on('mousemove', '.board',
                this._onBoardMouseMove.bind(this))
            .on('mousemove', '.board',
                _.debounce(this._onBoardMouseMoveEnd.bind(this), 300))
            .on('wheel',
                this._onMouseWheel.bind(this))
            .on('wheel',
                _.debounce(this._onMouseWheelEnd.bind(this), 300));

          var onHoverIn  = function() { this._isHover = true;  }.bind(this);
          var onHoverOut = function() { this._isHover = false; }.bind(this);
          $inner
            .hover(onHoverIn, onHoverOut)
            .on('touchstart',  this._onTouchStart.bind(this))
            .on('touchend',    this._onTouchEnd  .bind(this))
            .on('touchmove',   this._onTouchMove .bind(this))
            .on('scroll', _.throttle(function() { this._onScroll(); }.bind(this), 500));

          //this._watchController
          //  .addEventListener('onVideoSeeked', this._onVideoSeeked.bind(this));

          //this._watchController
          //  .addEventListener('onVideoSeeking', this._onVideoSeeking.bind(this));

          this._$disableButton.on('click', this._onDisableButtonClick.bind(this));

          $('body')
            .append($view)
            .on('touchend', function() { this._isHover = false; }.bind(this));
        },
        _onBoardClick: function(e) {
          var $board = $(e.target), offset = $board.offset();
          var y = $board.attr('data-top') * 1;
          var x = e.pageX - offset.left;
          var page = $board.attr('data-page');
          var ms = this._storyBoard.getPointMs(x, y, page);
          if (isNaN(ms)) { return; }

          var $view = this._$view;
          $view.addClass('clicked');
          window.setTimeout(function() { $view.removeClass('clicked'); }, 1000);
          this._eventDispatcher.dispatchEvent('onStoryBoardSelect', ms);
          this._$cursorTime.css({left: -999});

          this._isHover = false;
          if ($board.hasClass('lazyImage')) { this._lazyLoadImage(page); }
        },
        _onBoardMouseMove: function(e) {
          var $board = $(e.target), offset = $board.offset();
          var y = $board.attr('data-top') * 1;
          var x = e.pageX - offset.left;
          var page = $board.attr('data-page');
          var ms = this._storyBoard.getPointMs(x, y, page);
          if (isNaN(ms)) { return; }
          var sec = Math.floor(ms / 1000);

          var time = Math.floor(sec / 60) + ':' + ((sec % 60) + 100).toString().substr(1);
          this._$cursorTime.text(time).css({left: e.pageX});

          this._isHover = true;
          this._isMouseMoving = true;
          if ($board.hasClass('lazyImage')) { this._lazyLoadImage(page); }
        },
        _onBoardMouseMoveEnd: function(e) {
          this._isMouseMoving = false;
        },
        _onMouseWheel: function(e, delta) {
          e.preventDefault();
          e.stopPropagation();
          this._isHover = true;
          this._isMouseMoving = true;
          var left = this.scrollLeft();
          this.scrollLeft(left - delta * 140);
        },
        _onMouseWheelEnd: function(e, delta) {
          this._isMouseMoving = false;
        },
        _onTouchStart: function(e) {
          e.stopPropagation();
          this._syncScrollLeft();
        },
        _onTouchEnd: function(e) {
          e.stopPropagation();
        },
        _onTouchMove: function(e) {
          e.stopPropagation();
          this._isHover = true;
          this._syncScrollLeft();
        },
        _onTouchCancel: function(e) {
        },
        _onVideoSeeking: function() {
        },
        _onVideoSeeked: function() {
//          if (!this._storyBoard.isEnabled()) {
//            return;
//          }
//          if (this._storyBoard.getStatus() !== 'ok') {
//            return;
//          }
//          var ms  = this._watchController.getMs();
//          var page = this._storyBoard.getMsPage(ms);
//
//          this._lazyLoadImage(page);
//          if (this.isHover || !this._watchController.isPlaying()) {
//            this._onMsUpdate(ms, true);
//          } else {
//            this._onMsUpdate(ms);
//          }
        },
        update: function() {
          this.disableTimer();

          this._initializeStoryBoard();
          this._$view.removeClass('show success');
          $('body').removeClass('NicoVideoStoryBoardOpen');
          if (this._storyBoard.getStatus() === 'ok') {
            this._updateSuccess();
          } else {
            this._updateFail();
          }
        },
        scrollLeft: function(left) {
          if (left === undefined) {
            return this._scrollLeft;
          } else
          if (left === 0 || Math.abs(this._scrollLeft - left) >= 1) {
            this._$inner[0].scrollLeft = left;
            this._scrollLeft = left;
          }
        },
        /**
         * 現在の動画の位置に即スクロール
         */
        scrollToMs: function(ms) {
          //var ms = this._watchController.getMs();
          this._onMsUpdate(ms, true);
        },
        scrollToNext: function() {
          this.scrollLeft(this._storyBoard.getWidth());
        },
        scrollToPrev: function() {
          this.scrollLeft(-this._storyBoard.getWidth());
        },
        /**
         * 変数として持ってるscrollLeftを実際の値と同期
         */
        _syncScrollLeft: function() {
          this._scrollLeft = this._$inner[0].scrollLeft;
        },
        _updateSuccess: function() {
          var url = this._storyBoard.getUrl();
          var $view = this._$view.addClass('opening');

          if (this._currentUrl === url) {
            $view.addClass('show success');
            this.enableTimer();
          } else {
            this._currentUrl = url;
            console.time('createStoryBoardDOM');
            this._updateSuccessFull();
            console.timeEnd('createStoryBoardDOM');
          }
          $('body').addClass('NicoVideoStoryBoardOpen');

          window.setTimeout(function() {
            $view.removeClass('opening');
            $view = null;
          }, 1000);
        },
        _updateSuccessFull: function() {

          var list = new StoryBoardBlockList(this._storyBoard);
          this._storyBoardBlockList = list;
          this._$inner.empty().append(list.getView()).append(this._$pointer);

          var $view = this._$view;
          $view.removeClass('fail').addClass('success');

          this._fullScreenModeView.update($view);

          window.setTimeout(function() { $view.addClass('show'); }, 100);

          this.scrollLeft(0);
          this.enableTimer();
        },
        _lazyLoadImage: function(pageNumber) { //return;
          if (this._storyBoardBlockList) {
            this._storyBoardBlockList.loadImage(pageNumber);
          }
        },
        _updateFail: function() {
          this._$view.removeClass('success').addClass('fail');
          this.disableTimer();
        },
        clear: function() {
          if (this._$view) {
            this._$inner.empty();
          }
          this.disableTimer();
        },
        _clearTimer: function() {
          this._requestAnimationFrame.disable();
        },
        enableTimer: function() {
          this._clearTimer();
          this._isHover = false;
          this._requestAnimationFrame.enable();
        },
        disableTimer: function() {
          this._clearTimer();
        },
        _onTimerInterval: function() {
          if (this._isHover) { return; }
          if (!this._autoScroll) { return; }
          if (!this._storyBoard.isEnabled()) { return; }

          //var div = MS_RATE;
          //var mod = this._timerCount % div;
          this._timerCount++;

          //var ms;

          //if (!this._watchController.isPlaying()) {
          //  return;
          //}

          //if (mod === 0) {
          //  ms = this._watchController.getMs();
          //} else {
          //  ms = this._lastMs;
          //}

          //this._onMsUpdate(ms);
        },
        _onMsUpdate: function(ms, isImmediately) {
          var storyBoard = this._storyBoard;
          var duration = Math.max(1, storyBoard.getDuration());
          var per = ms / (duration * 1000);
          var width = storyBoard.getWidth();
          var boardWidth = storyBoard.getCount() * width;
          var targetLeft = boardWidth * per + width * 0.4;
          var currentLeft = this.scrollLeft();
          var leftDiff = targetLeft - currentLeft;

          if (Math.abs(leftDiff) > 5000) {
            leftDiff = leftDiff * 0.93; // 大きくシークした時
          } else {
            leftDiff = leftDiff / MS_RATE;
          }

          this._lastMs = ms;

          this.scrollLeft(isImmediately ? targetLeft : (currentLeft + Math.round(leftDiff)));
        },
        _onScroll: function() {
          var storyBoard = this._storyBoard;
          var scrollLeft = this.scrollLeft();
          var page = Math.round(scrollLeft / (storyBoard.getPageWidth() * storyBoard.getRows()));
          this._lazyLoadImage(Math.min(page, storyBoard.getPageCount() - 1));
        },
        reset: function() {
          this._lastMs = -1;
          this._lastPage = -1;
          this._currentUrl = '';
          this._timerCount = 0;
          this._scrollLeft = 0;
          this._lazyImage = {};
          this._autoScroll = true;
          if (this._storyBoardBlockList) {
            this._storyBoardBlockList.clear();
          }
          if (this._$view) {
            $('body').removeClass('NicoVideoStoryBoardOpen');
            this._$view.removeClass('show');
            this._$inner.empty();
          }
        },
        _onDisableButtonClick: function(e) {
          e.preventDefault();
          e.stopPropagation();

          var $button = this._$disableButton;
          $button.addClass('clicked');
          window.setTimeout(function() {
            $button.removeClass('clicked');
          }, 1000);

          this._eventDispatcher.dispatchEvent('onDisableStoryBoard');
        },
        _onStoryBoardUpdate: function() {
          this.update();
        },
        _onStoryBoardReset:  function() {
        },
        _onStoryBoardUnload: function() {
          $('body').removeClass('NicoVideoStoryBoardOpen');
          if (this._$view) {
            this._$view.removeClass('show');
          }
        },
        _onWatchInfoReset:  function() {
          this.reset();
        }
      });

      return StoryBoardView;
    })();

    StoryBoardView.__css__ = ZenzaWatch.util.hereDoc(function() {/*
      .storyBoardContainer {
        position: fixed;
        bottom: -300px;
        left: 0;
        right: 0;
        width: 100%;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        background: #999;
        border: 2px outset #000;
        z-index: 9005;
        overflow: visible;
        border-radius: 10px 10px 0 0;
        border-width: 2px 2px 0;
        box-shadow: 0 -2px 2px #666;

        transition: bottom 0.5s ease-in-out;
      }

      .storyBoardContainer.show {
        bottom: 0;
      }

      .storyBoardContainer .storyBoardInner {
        display: none;
        position: relative;
        text-align: center;
        overflow-x: scroll;
        white-space: nowrap;
        background: #222;
        margin: 4px 12px 3px;
        border-style: inset;
        border-width: 2px 4px;
        border-radius: 10px 10px 0 0;
      }

      .storyBoardContainer.success .storyBoardInner {
        display: block;
      }

      .storyBoardContainer .storyBoardInner .boardList {
        overflow: hidden;
      }

      .storyBoardContainer .boardList .board {
        display: inline-block;
        cursor: pointer;
        background-color: #101010;
      }

      .storyBoardContainer.clicked .storyBoardInner * {
        opacity: 0.3;
        pointer-events: none;
      }

      .storyBoardContainer.opening .storyBoardInner .boardList .board {
        pointer-events: none;
      }

      .storyBoardContainer .boardList .board.lazyImage:not(.hasSub) {
        background-color: #ccc;
        cursor: wait;
      }
      .storyBoardContainer .boardList .board.loadFail {
        background-color: #c99;
      }

      .storyBoardContainer .boardList .board > div {
        white-space: nowrap;
      }
      .storyBoardContainer .boardList .board .border {
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        border-style: solid;
        border-color: #000 #333 #000 #999;
        border-width: 0     2px    0  2px;
        display: inline-block;
        pointer-events: none;
      }

      .storyBoardContainer .storyBoardHeader {
        position: relative;
        width: 100%;
      }
      .storyBoardContainer .pointer {
        position: absolute;
        bottom: -15px;
        left: 50%;
        width: 32px;
        margin-left: -16px;
        color: #333;
        z-index: 9010;
        text-align: center;
      }

      .storyBoardContainer .cursorTime {
        display: none;
        position: absolute;
        bottom: -30px;
        left: -999px;
        font-size: 10pt;
        border: 1px solid #000;
        z-index: 9010;
        background: #ffc;
        pointer-events: none;
      }
      .storyBoardContainer:hover .cursorTime {
        display: block;
      }

      .storyBoardContainer.clicked .cursorTime,
      .storyBoardContainer.opening .cursorTime {
        display: none;
      }

      .storyBoardContainer .setToDisable {
        position: absolute;
        display: inline-block;
        right: 300px;
        bottom: -32px;
        transition: bottom 0.3s ease-in-out;
      }
      .storyBoardContainer:hover .setToDisable {
        bottom: 0;
      }

      .storyBoardContainer .setToDisable button,
      .setToEnableButtonContainer button {
        background: none repeat scroll 0 0 #999;
        border-color: #666;
        border-radius: 18px 18px 0 0;
        border-style: solid;
        border-width: 2px 2px 0;
        width: 200px;
        overflow: auto;
        white-space: nowrap;
        cursor: pointer;
        box-shadow: 0 -2px 2px #666;
      }

      .full_with_browser .setToEnableButtonContainer button {
        box-shadow: none;
        color: #888;
        background: #000;
      }

      .full_with_browser .storyBoardContainer .setToDisable,
      .full_with_browser .setToEnableButtonContainer {
        background: #000; {* Firefox対策 *}
      }

      .setToEnableButtonContainer button {
        width: 200px;
      }

      .storyBoardContainer .setToDisable button:hover,
      .setToEnableButtonContainer:not(.loading):not(.fail) button:hover {
        background: #ccc;
        transition: none;
      }

      .storyBoardContainer .setToDisable button.clicked,
      .setToEnableButtonContainer.loading button,
      .setToEnableButtonContainer.fail button,
      .setToEnableButtonContainer button.clicked {
        border-style: inset;
        box-shadow: none;
      }

      .setToEnableButtonContainer {
        position: fixed;
        z-index: 9003;
        right: 300px;
        bottom: 0px;
        transition: bottom 0.5s ease-in-out;
      }

      .setToEnableButtonContainer.loadingVideo {
        bottom: -50px;
      }

      .setToEnableButtonContainer.loading *,
      .setToEnableButtonContainer.loadingVideo *{
        cursor: wait;
        font-size: 80%;
      }
      .setToEnableButtonContainer.fail {
        color: #999;
        cursor: default;
        font-size: 80%;
      }

    */});



