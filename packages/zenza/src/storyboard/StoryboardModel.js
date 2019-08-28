import {Emitter} from '../../../lib/src/Emitter';
//===BEGIN===

class StoryboardModel extends Emitter {
  static createBlankData(info = {}) {
    Object.assign(info, {
      format: 'smile',
      status: 'fail',
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
  }

  constructor() {
    super();
    this._isAvailable = false;
  }
  update(info) {
    if (!info || info.status !== 'ok') {
      this._info = StoryboardModel.createBlankData();
      this._isAvailable = false;
    } else {
      this._info = info;
      this._isAvailable = true;
    }

    this.emit('update');
  }

  get info() {
    if (!this._info) {
      return StoryboardModel.createBlankData();
    } else {
      return this._info;
    }
  }

  reset() {
    this._isAvailable = false;
    this.emit('reset');
  }

  unload() {
    this._isAvailable = false;
    this.emit('unload');
  }

  get isAvailable() {return !!this._isAvailable;}

  get hasSubStoryboard() {return this._info.storyboard.length > 1;}

  get status() {return this._info.status;}
  get message() {return this._info.message;}
  get duration() {return parseInt(this._info.duration, 10);}
  get isDmc() {return this._info.format === 'dmc';}
  getUrl(i = 0) {
    if (!this.isDmc) {
      return this._info.storyboard[i].url;
    } else {
      return this._info.storyboard[i].urls[0];
    }
  }
  get url() { return this.getUrl(); }
  getWidth(i = 0) {return parseInt(this._info.storyboard[i].thumbnail.width, 10);}
  get width() { return this.getWidth(); }
  getHeight(i = 0) {return parseInt(this._info.storyboard[i].thumbnail.height, 10);}
  get height() { return this.getHeight(); }
  getInterval(i = 0) {return parseInt(this._info.storyboard[i].thumbnail.interval, 10);}
  get interval() { return this.getInterval(); }
  getCount(i = 0) {
    return Math.max(
      Math.ceil(this.duration / Math.max(0.01, this.getInterval())),
      parseInt(this._info.storyboard[i].thumbnail.number, 10)
    );
  }
  get count() { return this.getCount(); }
  getRows(i = 0) {return parseInt(this._info.storyboard[i].board.rows, 10);}
  get rows() { return this.getRows(); }
  getCols(i = 0) {return parseInt(this._info.storyboard[i].board.cols, 10);}
  get cols() { return this.getCols(); }
  getPageCount(i = 0) {return parseInt(this._info.storyboard[i].board.number, 10);}
  get pageCount() { return this.getPageCount(); }
  getTotalRows(i = 0) {return Math.ceil(this.getCount(i) / this.getCols(i));}
  get totalRows() { return this.getTotalRows(); }
  getPageWidth(i = 0) {return this.getWidth(i) * this.getCols(i);}
  get pageWidth() { return this.getPageWidth(); }
  getPageHeight(i = 0) {return this.getHeight(i) * this.getRows(i);}
  get pageHeight() { return this.getPageHeight(); }
  getCountPerPage(i = 0) {return this.getRows(i) * this.getCols(i);}
  get countPerPage() { return this.getCountPerPage(); }

  /**
   *  nページ目のURLを返す。 ゼロオリジン
   */
  getPageUrl(page, storyboardIndex) {
    if (!this.isDmc) {
      page = Math.max(0, Math.min(this.getPageCount(storyboardIndex) - 1, page));
      return this.getUrl(storyboardIndex) + '&board=' + (page + 1);
    } else {
      return this._info.storyboard[storyboardIndex || 0].urls[page];
    }
  }

  /**
   * msに相当するサムネは何番目か？を返す
   */
  getIndex(ms, storyboardIndex) {
    // msec -> sec
    let v = Math.floor(ms / 1000);
    v = Math.max(0, Math.min(this.duration, v));

    // サムネの総数 ÷ 秒数
    // Math.maxはゼロ除算対策
    let n = this.getCount(storyboardIndex) / Math.max(1, this.duration);

    return parseInt(Math.floor(v * n), 10);
  }

  /**
   * Indexのサムネイルは何番目のページにあるか？を返す
   */
  getPageIndex(thumbnailIndex, storyboardIndex) {
    let perPage = this.getCountPerPage(storyboardIndex);
    let pageIndex = parseInt(thumbnailIndex / perPage, 10);
    return Math.max(0, Math.min(this.getPageCount(storyboardIndex), pageIndex));
  }

  /**
   *  msに相当するサムネは何ページの何番目にあるか？を返す
   */
  getThumbnailPosition(ms, storyboardIndex) {
    let thumbnailIndex = this.getIndex(ms, storyboardIndex);
    let pageIndex = this.getPageIndex(thumbnailIndex);

    let mod = thumbnailIndex % this.getCountPerPage(storyboardIndex);
    let row = Math.floor(mod / Math.max(1, this.getCols()));
    let col = mod % this.getRows(storyboardIndex);

    return {
      page: pageIndex,
      index: thumbnailIndex,
      row: row,
      col: col
    };
  }

  /**
   * nページ目のx, y座標をmsに変換して返す
   */
  getPointMs(x, y, page, storyboardIndex) {
    let width = Math.max(1, this.getWidth(storyboardIndex));
    let height = Math.max(1, this.getHeight(storyboardIndex));
    let row = Math.floor(y / height);
    let col = Math.floor(x / width);
    let mod = x % width;


    // 何番目のサムネに相当するか？
    let point =
      page * this.getCountPerPage(storyboardIndex) +
      row * this.getCols(storyboardIndex) +
      col +
      (mod / width) // 小数点以下は、n番目の左端から何%あたりか
    ;

    // 全体の何%あたり？
    let percent = point / Math.max(1, this.getCount(storyboardIndex));
    percent = Math.max(0, Math.min(100, percent));

    // msは㍉秒単位なので1000倍
    return Math.floor(this.duration * percent * 1000);
  }

  /**
   * msは何ページ目に当たるか？を返す
   */
  getmsPage(ms, storyboardIndex) {
    let index = this._storyboard.getIndex(ms, storyboardIndex);
    let page = this._storyboard.getPageIndex(index, storyboardIndex);

    return page;
  }

  /**
   * nページ目のCols, Rowsがsubではどこになるかを返す
   */
  getPointPageColAndRowForSub(page, row, col) {
    let mainPageCount = this.getCountPerPage();
    let subPageCount = this.getCountPerPage(1);
    let mainCols = this.getCols();
    let subCols = this.getCols(1);

    let mainIndex = mainPageCount * page + mainCols * row + col;
    let subOffset = mainIndex % subPageCount;

    let subPage = Math.floor(mainIndex / subPageCount);
    let subRow = Math.floor(subOffset / subCols);
    let subCol = subOffset % subCols;

    return {
      page: subPage,
      row: subRow,
      col: subCol
    };
  }
}

//===END===
export {StoryboardModel};