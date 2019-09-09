import {Emitter} from '../../../lib/src/Emitter';
//===BEGIN===

class StoryboardInfoModel extends Emitter {
  static get blankData() {
    return {
      format: 'dmc',
      status: 'fail',
      duration: 1,
      storyboard: [{
        id: 1,
        urls: ['https://example.com'],
        thumbnail: {
          width: 160,
          height: 90,
          number: 1,
          interval: 1000
        },
        board: {
          rows: 1,
          cols: 1,
          number: 1
        }
      }]
    };
  }

  constructor(rawData) {
    super();
    this.update(rawData);
  }

  update(rawData) {
    if (!rawData || rawData.status !== 'ok') {
      this._rawData = this.constructor.blankData;
    } else {
      this._rawData = rawData;
    }
    this.primary = this._rawData.storyboard[0];
    this.emit('update', this);
    return this;
  }
  reset() {
    this._rawData = this.constructor.blankData;
    this.emit('reset');
  }
  get rawData() {
    return this._rawData || this.constructor.blankData;
  }

  get isAvailable() {return this._rawData.status === 'ok';}

  get hasSubStoryboard() { return false; }

  get status() {return this._rawData.status;}
  get message() {return this._rawData.message;}
  get duration() {return this._rawData.duration * 1;}
  get isDmc() {return this._rawData.format === 'dmc';}
  get url() {
    return this.isDmc ? this.primary.urls[0] : this.primary.url;
  }
  get imageUrls() {
    return [...Array(this.pageCount)].map((a, i) => this.getPageUrl(i));
  }
  get cellWidth() { return this.primary.thumbnail.width * 1; }
  get cellHeight() { return this.primary.thumbnail.height * 1; }
  get cellIntervalMs() { return this.primary.thumbnail.interval * 1; }
  get cellCount() {
    return Math.max(
      Math.ceil(this.duration / Math.max(0.01, this.cellIntervalMs)),
      this.primary.thumbnail.number * 1
    );
  }
  get rows() { return this.primary.board.rows * 1; }
  get cols() { return this.primary.board.cols * 1; }
  get pageCount() { return this.primary.board.number * 1; }
  get totalRows() { return Math.ceil(this.cellCount / this.cols); }
  get pageWidth() { return this.cellWidth * this.cols; }
  get pageHeight() { return this.cellHeight * this.rows; }
  get countPerPage() { return this.rows * this.cols; }


}

//===END===
export {StoryboardInfoModel};