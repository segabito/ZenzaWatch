var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};
var AsyncEmitter = function() {};

// シークバーのサムネイル関連
//===BEGIN===

/*
// マスコットキャラクターのサムネーヨちゃん
　∧ ∧　 　 　┌─────────────
　( ´ー｀)　　 ＜　サムネーヨ
 　＼　< 　　　 └───/|────────
　　　＼.＼＿＿＿＿__／/
　　　　 ＼　　　　　　　／
　　　　　　∪∪￣∪∪
*/

//===END===


  var StoryBoardModel = function() { this.initialize.apply(this, arguments); };
  _.extend(StoryBoardModel.prototype, AsyncEmitter.prototype);

  _.assign(StoryBoardModel.prototype,{
      initialize: function(params) {
        this._isEnabled       = params.isEnabled;
        this.update(params.info);
      },
      _createBlankData: function(info) {
        _.assign(info, {
          duration: 1,
          url: '',
          storyboard: [{
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
        if (info.status !== 'ok') {
          info = this.createBlankData();
        }
        this._info = info;

        this.emitAsync('update');
      },

      reset: function() {
        //if (this.isEnabled()) {
        //  ZenzaWatch.util.callAsync(function() {
        //    this.load();
        //  }, this, 1000);
        //}
        //this.emitAsync('reset');
      },

//      load: function() {
//        this._isEnabled = true;
//        this._thumbnailInfo.load(this._watchId);
//      },
//
//      setWatchId: function(watchId) {
//        this._watchId = watchId;
//      },
//
      unload: function() {
        this._isEnabled = false;
        this.emitAsync('unload');
      },

      isEnabled: function() {
        return this._isEnabled;
      },

      hasSubStoryBoard: function() {
        return this._info.storyboard.length > 1;
      },

      getStatus:   function() { return this._info.status; },
      getMessage:  function() { return this._info.message; },
      getDuration: function() { return parseInt(this._info.duration, 10); },

      getUrl: function(i) { return this._info.storyboard[i || 0].url; },
      getWidth:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.width, 10); },
      getHeight:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.height, 10); },
      getInterval:
        function(i) { return parseInt(this._info.storyboard[i || 0].thumbnail.interval, 10); },
      getCount: function(i) {
        return Math.max(
          Math.ceil(this.getDuration() / Math.max(0.01, this.getInterval())),
          parseInt(this._info.storyboard[i || 0].thumbnail.number, 10)
        );
      },
      getRows: function(i) { return parseInt(this._info.storyboard[i || 0].board.rows, 10); },
      getCols: function(i) { return parseInt(this._info.storyboard[i || 0].board.cols, 10); },
      getPageCount: function(i) { return parseInt(this._info.storyboard[i || 0].board.number, 10); },
      getTotalRows: function(i) {
        return Math.ceil(this.getCount(i) / this.getCols(i));
      },

      getPageWidth:    function(i) { return this.getWidth(i)  * this.getCols(i); },
      getPageHeight:   function(i) { return this.getHeight(i) * this.getRows(i); },
      getCountPerPage: function(i) { return this.getRows(i)   * this.getCols(i); },

      /**
       *  nページ目のURLを返す。 ゼロオリジン
       */
      getPageUrl: function(page, storyboardIndex) {
        page = Math.max(0, Math.min(this.getPageCount(storyboardIndex) - 1, page));
        return this.getUrl(storyboardIndex) + '&board=' + (page + 1);
      },

      /**
       * vposに相当するサムネは何番目か？を返す
       */
      getIndex: function(vpos, storyboardIndex) {
        // msec -> sec
        var v = Math.floor(vpos / 1000);
        v = Math.max(0, Math.min(this.getDuration(), v));

        // サムネの総数 ÷ 秒数
        // Math.maxはゼロ除算対策
        var n = this.getCount(storyboardIndex) / Math.max(1, this.getDuration());

        return parseInt(Math.floor(v * n), 10);
      },

      /**
       * Indexのサムネイルは何番目のページにあるか？を返す
       */
      getPageIndex: function(thumbnailIndex, storyboardIndex) {
        var perPage   = this.getCountPerPage(storyboardIndex);
        var pageIndex = parseInt(thumbnailIndex / perPage, 10);
        return Math.max(0, Math.min(this.getPageCount(storyboardIndex), pageIndex));
      },

      /**
       *  vposに相当するサムネは何ページの何番目にあるか？を返す
       */
      getThumbnailPosition: function(vpos, storyboardIndex) {
        var thumbnailIndex = this.getIndex(vpos, storyboardIndex);
        var pageIndex      = this.getPageIndex(thumbnailIndex);

        var mod = thumbnailIndex % this.getCountPerPage(storyboardIndex);
        var row = Math.floor(mod / Math.max(1, this.getCols()));
        var col = mod % this.getRows(storyboardIndex);

        return {
          page: pageIndex,
          index: thumbnailIndex,
          row: row,
          col: col
        };
      },

      /**
       * nページ目のx, y座標をvposに変換して返す
       */
      getPointVpos: function(x, y, page, storyboardIndex) {
        var width  = Math.max(1, this.getWidth(storyboardIndex));
        var height = Math.max(1, this.getHeight(storyboardIndex));
        var row = Math.floor(y / height);
        var col = Math.floor(x / width);
        var mod = x % width;


        // 何番目のサムネに相当するか？
        var point =
          page * this.getCountPerPage(storyboardIndex) +
          row  * this.getCols(storyboardIndex)         +
          col +
          (mod / width) // 小数点以下は、n番目の左端から何%あたりか
          ;

        // 全体の何%あたり？
        var percent = point / Math.max(1, this.getCount(storyboardIndex));
        percent = Math.max(0, Math.min(100, percent));

        // vposは㍉秒単位なので1000倍
        return Math.floor(this.getDuration() * percent * 1000);
      },

      /**
       * vposは何ページ目に当たるか？を返す
       */
      getVposPage: function(vpos, storyboardIndex) {
        var index = this._storyboard.getIndex(vpos, storyboardIndex);
        var page  = this._storyboard.getPageIndex(index, storyboardIndex);

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

    var RequestAnimationFrame = function() { this.initialize.apply(this, arguments); };
    _.assign(RequestAnimationFrame.prototype, {
      initialize: function(callback, frameSkip) {
        this.requestAnimationFrame = _.bind((window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame), window);
        this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
        this._frameCount = 0;
        this._callback = callback;
        this._enable = false;
        this._onFrame = _.bind(this._onFrame, this);
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


    var StoryBoard = function() { this.initialize.apply(this, arguments); };
    _.extend(StoryBoard.prototype, AsyncEmitter.prototype);
    _.assign(StoryBoard.prototype, {
      initialize: function(params) {

        this._player = params.player;
        this._playerConfig  = params.config;
        this._loader = params.loader || ZenzaWatch.api.StoryBoardInfoLoader;
        this._isEnable =
          _.isBoolean(params.enable) ? params.enable : ZenzaWatch.util.isPremium();

        /*
        evt.addEventListener('onStoryBoardSelect',
          $.proxy(this._onStoryboardSelect, this));
        */
        this._initializeStoryboard();
      },

      _initializeStoryboard: function() {
        this._initializeStoryboard = _.noop;

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

      load: function(watchId) {
        //if (watchId) {
        //  this._storyboardModel.setWatchId(watchId);
        //}
        //this._storyboardModel.load();
      },

      unload: function() {
        if (this._model) {
          this._model.unload();
        }
      },

      _onVideoCanPlay: function(watchId, videoInfo) {
        if (!this._isEnable) { return; }

        var url = videoInfo.getVideoUrl();
        if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
          return;
        }

        this._initializeStoryboard();
        this._watchId = watchId;
        ZenzaWatch.api.StoryBoardInfoLoader.load(url).then(
          _.bind(this._onStoryBoardInfoLoad, this),
          _.bind(this._onStoryBoardInfoLoadFail, this)
        );
      },
      _onStoryBoardInfoLoad: function(info) {
        window.console.log('onStoryBoardInfoLoad', info);
        this._model.update(info);
      },
      _onStoryBoardInfoLoadFail: function() {
      },

      _onStoryboardSelect: function(vpos) {
        //console.log('_onStoryboardSelect', vpos);
        //this._watchController.setVpos(vpos);
        this._emit('command', 'seek', vpos / 100);
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





