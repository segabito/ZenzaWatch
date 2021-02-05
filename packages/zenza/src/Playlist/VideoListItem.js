import {bounce, throttle} from '../../../lib/src/infra/bounce';
import {textUtil} from '../../../lib/src/text/textUtil';
//===BEGIN===
class VideoListItem {
  static createByThumbInfo(info) {
    return new this({
      _format: 'thumbInfo',
      id: info.id,
      title: info.title,
      length_seconds: info.duration,
      num_res: info.commentCount,
      mylist_counter: info.mylistCount,
      view_counter: info.viewCount,
      thumbnail_url: info.thumbnail,
      first_retrieve: info.postedAt,

      tags: info.tagList,
      movieType: info.movieType,
      owner: info.owner,
      lastResBody: info.lastResBody
    });
  }

  static createBlankInfo(id) {
    let postedAt = '0000/00/00 00:00:00';
    if (!isNaN(id)) {
      postedAt = textUtil.dateToString(new Date(id * 1000));
    }
    return new this({
      _format: 'blank',
      id: id,
      title: id + '(動画情報不明)',
      length_seconds: 0,
      num_res: 0,
      mylist_counter: 0,
      view_counter: 0,
      thumbnail_url: 'https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank_s.jpg',
      first_retrieve: postedAt,
    });
  }

  static createByMylistItem(item) {
    if (item.item_data) {
      const item_data = item.item_data || {};
      return new VideoListItem({
        _format: 'mylistItemOldApi',
        id: item_data.watch_id,
        uniq_id: item_data.watch_id,
        title: item_data.title,
        length_seconds: item_data.length_seconds,
        num_res: item_data.num_res,
        mylist_counter: item_data.mylist_counter,
        view_counter: item_data.view_counter,
        thumbnail_url: item_data.thumbnail_url,
        first_retrieve: textUtil.dateToString(new Date(item_data.first_retrieve * 1000)),

        videoId: item_data.video_id,
        lastResBody: item_data.last_res_body,
        mylistItemId: item.item_id,
        item_type: item.item_type
      });
    }

    // APIレスポンスの統一されてなさよ・・・
    if (!item.length_seconds && typeof item.length === 'string') {
      const [min, sec] = item.length.split(':');
      item.length_seconds = min * 60 + sec * 1;
    }
    return new VideoListItem({
      _format: 'mylistItemRiapi',
      id: item.id,
      uniq_id: item.id,
      title: item.title,
      length_seconds: item.length_seconds,
      num_res: item.num_res,
      mylist_counter: item.mylist_counter,
      view_counter: item.view_counter,
      thumbnail_url: item.thumbnail_url,
      first_retrieve: item.first_retrieve,
      lastResBody: item.last_res_body
    });
  }

  static createByVideoInfoModel(info) {
    const count = info.count;
    return new VideoListItem({
      _format: 'videoInfo',
      id: info.watchId,
      uniq_id: info.contextWatchId,
      title: info.title,
      length_seconds: info.duration,
      num_res: count.comment,
      mylist_counter: count.mylist,
      view_counter: count.view,
      thumbnail_url: info.thumbnail,
      first_retrieve: info.postedAt,
      owner: info.owner
    });
  }

  constructor(rawData) {
    this._rawData = rawData;
    this._itemId = VideoListItem._itemId++;
    this._watchId = (this._getData('id', '') || '').toString();
    this._groupList = null;
    this.state = {
      isActive: false,
      lastActivated: rawData.last_activated || 0,
      isUpdating: false,
      isPlayed: !!rawData.played,
      isLazy: true,
      isDragging: false,
      isFavorite: false,
      isDragover: false,
      isDropped: false,
      isPocketResolved: false,
      timestamp: performance.now(),
    };
    this._uniq_id = rawData.uniqId || this.watchId;
    rawData.first_retrieve = textUtil.dateToString(rawData.first_retrieve);

    this.notifyUpdate = throttle.raf(this.notifyUpdate.bind(this));
    this._sortTitle = textUtil.convertKansuEi(this.title)
      .replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
  }

  equals(item) {
    return this.uniqId === item.uniqId;
  }

  _getData(key, defValue) {
    return this._rawData.hasOwnProperty(key) ?
      this._rawData[key] : defValue;
  }

  get groupList() { return this._groupList;}
  set groupList(v) { this._groupList = v;}

  notifyUpdate() {
    this.updateTimestamp();
    this._groupList && this._groupList.onItemUpdate(this);
  }

  get uniqId() { return this._uniq_id;}

  get itemId() { return this._itemId; }

  get watchId() { return this._watchId; }
  set watchId(v) {
    if (v === this._watchId) { return; }
    this._watchId = v;
    this.notifyUpdate();
  }

  get title() { return this._getData('title', ''); }

  get sortTitle() { return this._sortTitle; }

  get duration() { return parseInt(this._getData('length_seconds', '0'), 10); }

  get count() {
    return {
      comment: parseInt(this._rawData.num_res, 10),
      mylist: parseInt(this._rawData.mylist_counter, 10),
      view: parseInt(this._rawData.view_counter, 10)
    };
  }

  get thumbnail() { return this._rawData.thumbnail_url; }

  get postedAt() { return this._rawData.first_retrieve; }

  get commentCount() { return this.count.comment; }
  get mylistCount() { return this.count.mylist; }
  get viewCount() { return this.count.view; }
  get isActive() { return this.state.isActive; }
  set isActive(v) {
    if (this.isActive === v) { return; }
    this.state.isActive = v;
    v && (this.state.lastActivated = Date.now());
    this.notifyUpdate();
  }
  get isLazy() { return this.state.isLazy; }
  set isLazy(v) {
    if (this.isLazy === v) { return; }
    this.state.isLazy = v;
    this.notifyUpdate();
  }
  get isDragging() { return this.state.isDragging; }
  set isDragging(v) {
    if (this.isDragging === v) { return; }
    this.state.isDragging = v;
    this.notifyUpdate();
  }
  get isDragover() { return this.state.isDragover; }
  set isDragover(v) {
    if (this.isDragover === v) { return; }
    this.state.isDragover = v;
    this.notifyUpdate();
  }
  get isDropped() { return this.state.isDropped; }
  set isDropped(v) {
    if (this.isDropped === v) { return; }
    this.state.isDropped = v;
    this.notifyUpdate();
  }
  get isUpdating() { return this.state.isUpdating; }
  set isUpdating(v) {
    if (this.isUpdating === v) { return; }
    this.state.isUpdating = v;
    this.notifyUpdate();
  }
  get isPlayed() { return this.state.isPlayed; }
  set isPlayed(v) {
    if (this.isPlayed === v) { return; }
    this.state.isPlayed = v;
    this.notifyUpdate();
  }
  get isFavorite() { return this.state.isFavorite; }
  set isFavorite(v) {
    if (this.isFavorite === v) { return; }
    this.state.isFavorite = v;
    this.notifyUpdate();
  }
  get isPocketResolved() { return this.state.isPocketResolved; }
  set isPocketResolved(v) {
    if (this.isPocketResolved === v) { return; }
    this.state.isPocketResolved = v;
    this.notifyUpdate();
  }
  get timestamp() { return this.state.timestamp;}
  updateTimestamp() { this.state.timestamp = performance.now();}
  get isBlankData() { return this._rawData._format === 'blank'; }
  remove() {
    if (!this.groupList) { return; }
    this.groupList.removeItem(this);
    this.groupList = null;
  }
  serialize() {
    return {
      active: this.isActive,
      last_activated: this.state.lastActivated || 0,
      played: this.isPlayed,
      uniq_id: this._uniq_id,
      id: this._rawData.id,
      title: this._rawData.title,
      length_seconds: this._rawData.length_seconds,
      num_res: this._rawData.num_res,
      mylist_counter: this._rawData.mylist_counter,
      view_counter: this._rawData.view_counter,
      thumbnail_url: this._rawData.thumbnail_url,
      first_retrieve: this._rawData.first_retrieve,
    };
  }
  updateByVideoInfo(videoInfo) {
    const before = JSON.stringify(this.serialize());
    const rawData = this._rawData;
    const count = videoInfo.count;
    rawData.first_retrieve = textUtil.dateToString(videoInfo.postedAt);

    rawData.num_res = count.comment;
    rawData.mylist_counter = count.mylist;
    rawData.view_counter = count.view;

    rawData.thumbnail_url = videoInfo.thumbnail;

    if (JSON.stringify(this.serialize()) !== before) {
      this.notifyUpdate();
    }
  }
}
VideoListItem._itemId = 1;
//===END===
export {VideoListItem};
