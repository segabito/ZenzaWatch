var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {}
};

//===BEGIN===
//
  class DmcInfo {
    constructor(rawData) {
      this._rawData = rawData;
      this._session = rawData.session_api;
    }

    get apiUrl() {
      return this._session.urls[0].url;
    }

    get audios() {
      return this._session.audios;
    }

    get videos() {
      return this._session.videos;
    }

    get signature() {
      return this._session.signature;
    }

    get token() {
      return this._session.token;
    }

    get serviceUserId() {
      return this._session.service_user_id;
    }

    get contentId() {
      return this._session.content_id;
    }

    get playerId() {
      return this._session.player_id;
    }

    get recipeId() {
      return this._session.recipe_id;
    }

    get heartBeatLifeTimeMs() {
      return this._session.heartbeat_lifetime;
    }

    get protocols() {
      return this._session.protocols;
    }

    get contentKeyTimeout() {
      return this._session.content_key_timeout;
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
 }

  class VideoFilter {
    constructor(ngOwner, ngTag) {
      this.ngOwner = ngOwner;
      this.ngTag   = ngTag;
    }

    get ngOwner() {
      return this._ngOwner || [];
    }

    set ngOwner(owner) {
      owner = _.isArray(owner) ? owner : owner.toString().split(/[\r\n]/);
      var list = [];
      _.each(owner, function(o) {
        list.push(o.replace(/#.*$/, '').trim());
      });
      this._ngOwner = list;
    }

    get ngTag() {
      return this._ngTag || [];
    }

    set ngTag(tag) {
      tag = _.isArray(tag) ? tag : tag.toString().split(/[\r\n]/);
      var list = [];
      _.each(tag, function(t) {
        list.push(t.toLowerCase().trim());
      });
      this._ngTag = list;
    }

    isNgVideo(videoInfo) {
      var isNg = false;
      var isChannel = videoInfo.isChannel();
      var ngTag = this.ngTag;
      _.each(videoInfo.getTagList(), function(tag) {
        var text = (tag.tag || '').toLowerCase();
        if (_.contains(ngTag, text)) {
          isNg = true;
        }
      });
      if (isNg) { return true; }

      var owner = videoInfo.getOwnerInfo();
      var ownerId = isChannel ? ('ch' + owner.id) : owner.id;
      if (ownerId && _.contains(this.ngOwner, ownerId)) {
        isNg = true;
      }

      return isNg;
    }
  }

  class VideoInfoModel {
    constructor(info) {
      this._rawData = info;
      this._watchApiData = info.watchApiData;
      this._videoDetail  = info.watchApiData.videoDetail;
      this._flashvars    = info.watchApiData.flashvars;   // flashに渡す情報
      this._viewerInfo   = info.viewerInfo;               // 閲覧者(＝おまいら)の情報
      this._flvInfo      = info.flvInfo;
      this._msgInfo      = info.msgInfo;
      this._dmcInfo      = info.dmcInfo ? new DmcInfo(info.dmcInfo) : null;
      this._relatedVideo = info.playlist; // playlistという名前だが実質は関連動画
      this._playlistToken = info.playlistToken;
      this._watchAuthKey = info.watchAuthKey;
      this._seekToken    = info.seekToken;
      this._resumeInfo   = info.resumeInfo || {};

      this._isDmcDisable = false;
      this._currentVideoPromise = [];

      if (!ZenzaWatch.debug.videoInfo) { ZenzaWatch.debug.videoInfo = {}; }
      ZenzaWatch.debug.videoInfo[this.getWatchId()] = this;
    }

    getTitle() {
      return this._videoDetail.title_original || this._videoDetail.title;
    }
    getDescription() {
      return this._videoDetail.description || '';
    }
    /**
     * マイリスト等がリンクになっていない物
     */
    getDescriptionOriginal() {
      return this._videoDetail.description_original;
    }
    getPostedAt() {
      return this._videoDetail.postedAt;
    }
    getThumbnail() {
      return this._videoDetail.thumbnail;
    }
    /**
     * 大きいサムネがあればそっちを返す
     */
    getBetterThumbnail() {
      return this._rawData.thumbnail;
    }
    getVideoUrl() {
      return this._flvInfo.url;
    }

    getStoryboardUrl() {
      let url = this._flvInfo.url;
      if (!url.match(/smile\?m=/) || url.match(/^rtmp/)) {
        return null;
      }
      return url;
    }

    getCurrentVideo() {
      if (this._currentVideo) {
        return Promise.resolve(this._currentVideo);
      }
      return new Promise((resolve, reject) => {
        this._currentVideoPromise.push({resolve, reject});
      });
    }

    setCurrentVideo(v) {
      this._currentVideo = v;
      this._currentVideoPromise.forEach(p => {
        p.resolve(this._currentVideo);
      });
    }

    isEconomy() {
      return this.getVideoUrl().match(/low$/) ? true : false;
    }
    getTagList() {
      return this._videoDetail.tagList;
    }
    getVideoId() { // sm12345
      return this.videoId;
    }

    get videoId() {
      return this._videoDetail.id;
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

    getWatchUrl() {
      return location.protocol + '//www.nicovideo.jp/watch/' + this.getWatchId();
    }

    getThreadId() { // watchIdと同一とは限らない
      return this._videoDetail.thread_id;
    }

    getVideoSize() {
      return {
        width:  this._videoDetail.width,
        height: this._videoDetail.height
      };
    }
    getDuration() {
      return this._videoDetail.length;
    }
    getCount() {
      const vd = this._videoDetail;
      return {
        comment: vd.commentCount,
        mylist: vd.mylistCount,
        view: vd.viewCount
      };
    }
    // TODO: このへんgetterにする
    isChannel() {
      return !!this._videoDetail.channelId;
    }
    isMymemory() {
      return !!this._videoDetail.isMymemory;
    }
    isCommunityVideo() {
      return !!(!this.isChannel() && this._videoDetail.communityId);
    }
    hasParentVideo() {
      return !!(this._videoDetail.commons_tree_exists);
    }
    isDmc() {
      return this.isDmcOnly || (this._rawData.isDmc && !this._isDmcDisable);
    }
    getDmcInfo() {
      return this._dmcInfo;
    }
    getMsgInfo() {
      return this._msgInfo;
    }

    get isDmcDisable() {
      return this.isDmcOnly && this._isDmcDisable;
    }

    set isDmcDisable(v) {
      this._isDmcDisable = v;
    }

    get isDmcOnly() {
      return !!this._rawData.isDmcOnly;
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
    getOwnerInfo() {
      var ownerInfo;
      if (this.isChannel()) {
        var c = this._watchApiData.channelInfo || {};
        ownerInfo = {
          icon: c.icon_url || '//res.nimg.jp/img/user/thumb/blank.jpg',
          url: '//ch.nicovideo.jp/ch' + c.id,
          id: c.id,
          name: c.name,
          favorite: c.is_favorited === 1, // こっちは01で
          type: 'channel'
        };
      } else {
        // 退会しているユーザーだと空になっている
        var u = this._watchApiData.uploaderInfo || {};
        var f = this._flashvars || {};
        ownerInfo = {
          icon: u.icon_url || '//res.nimg.jp/img/user/thumb/blank.jpg',
          url:  u.id ? ('//www.nicovideo.jp/user/' + u.id) : '#',
          id:   u.id || f.videoUserId || '',
          name: u.nickname || '(非公開ユーザー)',
          favorite: !!u.is_favorited, // こっちはbooleanという
          type: 'user',
          isMyVideoPublic: !!u.is_user_myvideo_public
        };
      }

      return ownerInfo;
    }
    getRelatedVideoItems() {
      return this._relatedVideo.playlist || [];
    }
    getReplacementWords() {
      if (!this._flvInfo.ng_up) { return null; }
      return ZenzaWatch.util.parseQuery(
        this._flvInfo.ng_up || ''
      );
    }
    getPlaylistToken() {
      return this._playlistToken;
    }

    setPlaylistToken(v) {
      this._playlistToken = v;
    }

    getWatchAuthKey() {
      return this._watchAuthKey;
    }

    setWatchAuthKey(v) {
      this._watchAuthKey = v;
    }

    getSeekToken() {
      return this._seekToken;
    }

    getWidth() {
      return parseInt(this._videoDetail.width, 10);
    }

    getHeight() {
      return parseInt(this._videoDetail.height, 10);
    }

    get initialPlaybackTime() {
      if (!this._resumeInfo || !this._resumeInfo.initialPlaybackPosition) { return 0; }
      return parseFloat(this._resumeInfo.initialPlaybackPosition, 10);
    }

    get csrfToken() {
      return this._rawData.csrfToken || '';
    }

  }


//===END===
// iOS9 constはイケるがletはアカンらしい
//const hoge = 123;
//let fuga = 456;




