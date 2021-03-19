import {textUtil} from '../packages/lib/src/text/textUtil';
import {PromiseHandler} from '../packages/lib/src/Emitter';

//===BEGIN===
//
class DmcInfo {
  constructor(rawData) {
    this._rawData = rawData;
    this._session = rawData.movie.session;
  }

  get apiUrl() {
    return this._session.urls[0].url;
  }

  get urls() {
    return this._session.urls;
  }

  get audios() {
    return this._session.audios;
  }

  get videos() {
    return this._rawData.movie.videos;
  }

  get quality() {
    return this._rawData.movie.quality;
  }

  get signature() {
    return this._session.signature;
  }

  get token() {
    return this._session.token;
  }

  get serviceUserId() {
    return this._session.serviceUserId;
  }

  get contentId() {
    return this._session.contentId;
  }

  get playerId() {
    return this._session.playerId;
  }

  get recipeId() {
    return this._session.recipeId;
  }

  get heartBeatLifeTimeMs() {
    return this._session.heartbeatLifetime;
  }

  get protocols() {
    return this._session.protocols || [];
  }

  get isHLSRequired() {
    return !this.protocols.includes('http');
  }

  get contentKeyTimeout() {
    return this._session.contentKeyTimeout;
  }

  get priority() {
    return this._session.priority;
  }

  get authTypes() {
    return this._session.authTypes;
  }

  get videoFormatList() {
    return (this.videos || []).concat();
  }

  get hasStoryboard() {
    return !!this._rawData.storyboard_session_api;
  }

  get storyboardInfo() {
    return this._rawData.storyboard_session_api;
  }

  get transferPreset() {
    return (this._session.transferPresets || [''])[0] || '';
  }

  get heartbeatLifeTime() {
    return this._session.heartbeatLifetime || 120 * 1000;
  }

  get importVersion() {
    return this._rawData.import_version || 0;
  }

  get trackingId() {
    return this._rawData.trackingId || '';
  }

  get encryption() {
    return this._rawData.encryption || null;
  }

  getData() {
    const data = {};
    for (const prop of Object.getOwnPropertyNames(this.constructor.prototype)) {
      if (typeof this[prop] === 'function') { continue; }
      data[prop] = this[prop];
    }
    return data;
  }

  toJSON() {
    return JSON.stringify(this.getData());
  }
}

class VideoFilter {
  constructor(ngOwner, ngTag) {
    this.ngOwner = ngOwner;
    this.ngTag = ngTag;
  }

  get ngOwner() {
    return this._ngOwner || [];
  }

  set ngOwner(owner) {
    owner = _.isArray(owner) ? owner : owner.toString().split(/[\r\n]/);
    let list = [];
    owner.forEach(o => {
      list.push(o.replace(/#.*$/, '').trim());
    });
    this._ngOwner = list;
  }

  get ngTag() {
    return this._ngTag || [];
  }

  set ngTag(tag) {
    tag = Array.isArray(tag) ? tag : tag.toString().split(/[\r\n]/);
    const list = [];
    tag.forEach(t => {
      list.push(t.toLowerCase().trim());
    });
    this._ngTag = list;
  }

  isNgVideo(videoInfo) {
    let isNg = false;
    let isChannel = videoInfo.isChannel;
    let ngTag = this.ngTag;
    videoInfo.tagList.forEach(tag => {
      let text = (tag.tag || '').toLowerCase();
      if (ngTag.includes(text)) {
        isNg = true;
      }
    });
    if (isNg) {
      return true;
    }

    let owner = videoInfo.owner;
    let ownerId = isChannel ? ('ch' + owner.id) : owner.id;
    if (ownerId && this.ngOwner.includes(ownerId)) {
      isNg = true;
    }

    return isNg;
  }
}

class VideoInfoModel {
  constructor(videoInfoData, localCacheData = {}) {
    this._update(videoInfoData, localCacheData);
    this._currentVideoPromise = null;
  }

  update(videoInfoModel) {
    this._update(videoInfoModel._rawData);
    return true;
  }

  _update(info, localCacheData = {}) {
    this._rawData = info;
    this._cacheData = localCacheData;
    this._watchApiData = info.watchApiData;
    this._videoDetail = info.watchApiData.videoDetail;
    this._flashvars = info.watchApiData.flashvars;   // flashに渡す情報
    this._viewerInfo = info.viewerInfo;               // 閲覧者(＝おまいら)の情報
    this._flvInfo = info.flvInfo;
    this._msgInfo = info.msgInfo;
    this._dmcInfo = (info.dmcInfo && info.dmcInfo.movie.session) ? new DmcInfo(info.dmcInfo) : null;
    this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画
    this._playlistToken = info.playlistToken;
    this._watchAuthKey = info.watchAuthKey;
    this._seekToken = info.seekToken;
    this._resumeInfo = info.resumeInfo || {};
    this._currentVideo = null;
    this._currentVideoPromise = null;
    return true;
  }

  get title() {
    return this._videoDetail.title_original || this._videoDetail.title;
  }

  get description() {
    return this._videoDetail.description || '';
  }

  /**
   * マイリスト等がリンクになっていない物
   */
  get descriptionOriginal() {
    return this._videoDetail.description_original;
  }

  get postedAt() {
    return this._videoDetail.postedAt;
  }

  get thumbnail() {
    return this._videoDetail.thumbnail;
  }

  /**
   * 大きいサムネがあればそっちを返す
   */
  get betterThumbnail() {
    return this._rawData.thumbnail;
  }

  get largeThumbnnail() {
    return this._videoDetail.largeThumbnnail;
  }

  get videoUrl() {
    return (this._flvInfo.url || '');//.replace(/^http:/, '');
  }

  get storyboardUrl() {
    let url = this._flvInfo.url;
    if (!url || !url.match(/smile\?m=/) || url.match(/^rtmp/)) {
      return null;
    }
    return url;
  }

  /**
   * @return Promise
   */
  getCurrentVideo() {
    if (this._currentVideoPromise) {
      return this._currentVideoPromise;
    }
    return this._currentVideoPromise = new PromiseHandler();
  }

  setCurrentVideo(v) {
    this._currentVideo = v;
    this._currentVideoPromise && this._currentVideoPromise.resolve(v);
  }

  get isEconomy() {
    return this.videoUrl.match(/low$/) ? true : false;
  }

  get tagList() {
    return this._videoDetail.tagList;
  }

  getVideoId() { // sm12345
    return this.videoId;
  }

  get videoId() {
    return this._videoDetail.id;
  }

  get originalVideoId() {
    return (this.isMymemory || this.isCommunityVideo) ? this.videoId : '';
  }

  getWatchId() { // sm12345だったりスレッドIDだったり
    return this.watchId;
  }

  get watchId() {
    if (this.videoId.substring(0, 2) === 'so') {
      return this.videoId;
    }
    return this._videoDetail.v;
  }

  get contextWatchId() {
    return this._videoDetail.v;
  }

  get watchUrl() {
    return `https://www.nicovideo.jp/watch/${this.watchId}`;
  }

  get threadId() { // watchIdと同一とは限らない
    return this._msgInfo.threadId;
  }

  get videoSize() {
    return {
      width: this._videoDetail.width,
      height: this._videoDetail.height
    };
  }

  get duration() {
    return this._videoDetail.length;
  }

  get count() {
    const vd = this._videoDetail;
    return {
      comment: vd.commentCount,
      mylist: vd.mylistCount,
      view: vd.viewCount
    };
  }

  get isChannel() {
    return !!this._videoDetail.channelId;
  }

  get isMymemory() {
    return !!this._videoDetail.isMymemory;
  }

  get isCommunityVideo() {
    return !!(!this.isChannel && this._videoDetail.communityId);
  }

  get isPremiumOnly() {
    return !!this._videoDetail.isPremiumOnly;
  }

  get isLiked() {
    return !!this._videoDetail.isLiked;
  }
  set isLiked(v) {
    this._videoDetail.isLiked = v;
  }

  get hasParentVideo() {
    return !!(this._videoDetail.commons_tree_exists);
  }

  get isDmc() {
    return this.isDmcOnly || (this._rawData.isDmc);
  }

  get isDmcAvailable() {
    return this._rawData.isDmc;
  }

  get dmcInfo() {
    return this._dmcInfo;
  }

  get msgInfo() {
    return this._msgInfo;
  }

  get isDmcOnly() {
    return !!this._rawData.isDmcOnly || !this.videoUrl;
  }

  get hasDmcStoryboard() {
    return this._dmcInfo && this._dmcInfo.hasStoryboard;
  }

  get dmcStoryboardInfo() {
    return !!this._dmcInfo ? this._dmcInfo.storyboardInfo : null;
  }

  /**
   * 投稿者の情報
   * チャンネル動画かどうかで分岐
   */
  get owner() {
    let ownerInfo;
    if (this.isChannel) {
      let c = this._watchApiData.channelInfo || {};
      ownerInfo = {
        icon: c.icon_url || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg',
        url: `https://ch.nicovideo.jp/ch${c.id}`,
        id: c.id,
        linkId: c.id ? `ch${c.id}` : '',
        name: c.name,
        favorite: c.is_favorited === 1, // こっちは01で
        type: 'channel'
      };
    } else {
      // 退会しているユーザーだと空になっている
      let u = this._watchApiData.uploaderInfo || {};
      let f = this._flashvars || {};
      ownerInfo = {
        icon: u.icon_url || 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg',
        url: u.id ? `//www.nicovideo.jp/user/${u.id}` : '#',
        id: u.id || f.videoUserId || '',
        linkId: u.id ? `user/${u.id}` : '',
        name: u.nickname || '(非公開ユーザー)',
        favorite: !!u.is_favorited, // こっちはbooleanという
        type: 'user',
        isMyVideoPublic: !!u.is_user_myvideo_public
      };
    }

    return ownerInfo;
  }

  get series() {
    if (!this._rawData.series || !this._rawData.series.id) {
      return null;
    }
    const series = this._rawData.series;
    const thumbnailUrl = series.thumbnailUrl || this.betterThumbnail;
    return Object.assign({}, series, {thumbnailUrl});
  }

  get firstVideo() {
    return this.series ? this.series.video.first : null;
  }

  get prevVideo() {
    return this.series ? this.series.video.prev : null;
  }

  get nextVideo() {
    return this.series ? this.series.video.next : null;
  }

  get relatedVideoItems() {
    return this._relatedVideo.playlist || [];
  }

  get replacementWords() {
    if (!this._flvInfo.ng_up || this._flvInfo.ng_up === '') {
      return null;
    }
    return textUtil.parseQuery(
      this._flvInfo.ng_up || ''
    );
  }

  get playlistToken() {
    return this._playlistToken;
  }

  set playlistToken(v) {
    this._playlistToken = v;
  }

  get watchAuthKey() {
    return this._watchAuthKey;
  }

  set watchAuthKey(v) {
    this._watchAuthKey = v;
  }

  get seekToken() {
    return this._seekToken;
  }

  get width() {
    return parseInt(this._videoDetail.width, 10);
  }

  get height() {
    return parseInt(this._videoDetail.height, 10);
  }

  get initialPlaybackTime() {
    return this.resumePoints[0] && (this.resumePoints[0].time || 0);
  }

  get resumePoints() {
    const duration = this.duration;
    const MARGIN = 10;
    const resumePoints =
      ((this._cacheData && this._cacheData.resume) ? this._cacheData.resume : [])
        .filter(({now, time}) => time > MARGIN && time < duration - MARGIN)
        .map(({now, time}) => { return {now: new Date().toLocaleString(), time}; })
        .reverse();
    const lastResumePoint = this._resumeInfo ? this._resumeInfo.initialPlaybackPosition : 0;

    lastResumePoint && resumePoints.unshift({now: '前回', time: lastResumePoint});
    return resumePoints;
  }

  get csrfToken() {
    return this._rawData.csrfToken || '';
  }

  get extension() {
    if (this.isDmc) {
      return 'mp4';
    }
    const url = this.videoUrl;
    if (url.match(/smile\?m=/)) {
      return 'mp4';
    }
    if (url.match(/smile\?v=/)) {
      return 'flv';
    }
    if (url.match(/smile\?s=/)) {
      return 'swf';
    }
    return 'unknown';
  }

  get community() {
    return this._rawData.community || null;
  }

  get maybeBetterQualityServerType() {
    if (this.isDmcOnly) {
      return 'dmc';
    }
    if (this.isEconomy) {
      return 'dmc';
    }
    let dmcInfo = this.dmcInfo;
    if (!dmcInfo) {
      return 'smile';
    }
    if (/smile\?[sv]=/.test(this.videoUrl)) {
      return 'dmc';
    }

    let smileWidth = this.width;
    let smileHeight = this.height;
    let dmcVideos = dmcInfo.videos;
    let importVersion = dmcInfo.importVersion;

    // ぜんぜんわからん 時はdmc
    if (isNaN(smileWidth) || isNaN(smileHeight)) {
      return 'dmc';
    }

    // smile側に 1280w 720h を上回る動画がある場合は再エンコードされていない
    // smile側の再エンコードでは1280x720以下の動画しか生成されないため
    if (smileWidth > 1280 || smileHeight > 720) {
      return 'smile';
    }

    // if (importVersion > 0) {
    //   return 'smile';
    // }

    // smileのほうがdmcの下限以下を持っている ≒ 再エンコードされていない
    if (smileHeight < 360) {
      return 'smile';
    }

    const highestDmc = Math.max(...dmcVideos.map(v => {
      return (/_([0-9]+)p$/.exec(v)[1] || '') * 1;
    }));

    if (highestDmc >= 720) {
      return 'dmc';
    }

    // 864x486 648x486 640x384 512x384 旧プレイヤーぴったい合わせの解像度
    if (smileHeight === 486 || smileHeight === 384) {
      return 'smile';
    }

    // DMCのほうが高解像度を持っているなら恐らくDMC側が高画質
    if (highestDmc >= smileHeight) {
      return 'dmc';
    }

    // それ以外はsmile...と行きたいが判断保留は dmc
    return 'dmc';
  }

  getData() {
    const data = {};
    for (const prop of Object.getOwnPropertyNames(this.constructor.prototype)) {
      if (typeof this[prop] === 'function') { continue; }
      data[prop] = this[prop];
    }
    return data;
  }
}


//===END===

export {
  DmcInfo, VideoInfoModel, VideoFilter
};
