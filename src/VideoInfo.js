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
      // //api.dmc.nico:2805/api/sessions + ?_format=xml&suppress_response_codes=true
      return this._session.api_urls[0];
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
      return this._flvInfo.url;
    }
    isEconomy() {
      return this.getVideoUrl().match(/low$/) ? true : false;
    }
    getTagList() {
      return this._videoDetail.tagList;
    }
    getVideoId() { // sm12345
      return this._videoDetail.id;
    }
    getWatchId() { // sm12345だったりスレッドIDだったり
      return this._videoDetail.v;
    }
    getWatchUrl() {
      return '//www.nicovideo.jp/watch/' + this.getWatchId();
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
      return this._rawData.isDmc;
    }
    getDmcInfo() {
      return this._dmcInfo;
    }
    getMsgInfo() {
      return this._msgInfo;
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



const memo = {
  "time":1471496101,
  "time_ms":1471496101976,
  "video":{"video_id":"sm29469479","length_seconds":74,"deleted":0},
  "thread":{"server_url":"http:\/\/nmsg.nicovideo.jp\/api\/","sub_server_url":"http:\/\/nmsg.nicovideo.jp\/api\/","thread_id":1471491375,"nicos_thread_id":null,"optional_thread_id":null,"thread_key_required":false,"channel_ng_words":[],"owner_ng_words":[],"maintenances_ng":false,"postkey_available":true,"ng_revision":290},
  "user":{"user_id":1472081,"is_premium":true,"nickname":"\u305b\u304c\u3073\u3068"},
  "hiroba":{"fms_token":null,"server_url":"hiroba.nicovideo.jp","server_port":2564,"thread_id":400,"thread_key":"1471496161.O4zPf3jl3US4WfiL8hLaqBMuPvg"},
  "error":null,

  "session_api":{
    "api_urls":
      ["http:\/\/api.dmc.nico:2805\/api\/sessions"],
    "recipe_id":"nicovideo-sm29469479",
    "player_id":"nicovideo-6-bdASBw29LO_1471496101893",
    "videos":
      ["archive_h264_2000kbps_720p","archive_h264_1000kbps_540p","archive_h264_600kbps_360p","archive_h264_300kbps_360p"],
    "audios":
      ["archive_aac_64kbps"],
    "movies":[],
    "protocols":["http"],
    "auth_types":{"http":"ht2"},
    "service_user_id":"1472081",
    "token":
      "{\"service_id\":\"nicovideo\",\"player_id\":\"nicovideo-6-bdASBw29LO_1471496101893\",\"recipe_id\":\"nicovideo-sm29469479\",\"service_user_id\":\"1472081\",\"protocols\":[{\"name\":\"http\",\"auth_type\":\"ht2\"}],\"videos\":[\"archive_h264_1000kbps_540p\",\"archive_h264_2000kbps_720p\",\"archive_h264_300kbps_360p\",\"archive_h264_600kbps_360p\"],\"audios\":[\"archive_aac_64kbps\"],\"movies\":[],\"created_time\":1471496101000,\"expire_time\":1471582501000,\"content_ids\":[\"out1\"],\"heartbeat_lifetime\":60000,\"content_key_timeout\":600000,\"priority\":0.8,\"transfer_presets\":[]}",
    "signature":"4889d38f4dbf0b324809109c8eb064aac2b07acb32697fc7ab7b4f54f2a69744",
    "content_id":"out1",
    "heartbeat_lifetime":60000,
    "content_key_timeout":600000,
    "priority":0.8
  }
};





