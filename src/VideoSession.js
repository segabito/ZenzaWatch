var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var AsyncEmitter = function() {};
var VideoInfoLoader = {};

//===BEGIN===

  var VideoSession = function() { this.initialize.apply(this, arguments); };
  _.extend(VideoSession.prototype, AsyncEmitter.prototype);
  _.assign(VideoSession.prototype, {
    initialize: function(params) {
      this._videoInfo = params.videoInfo;
      this._videoWatchOptions = params.videoWatchOptions;

      this._heartBeatInterval = params.interval || 1000 * 60 * 20;
      this._heartBeatTimer = null;
    },
    create: function() {
      return Promise(function(resolve, reject) {

        var videoUrl = this._videoInfo.getVideoUrl();

        window.setTimeout(function() {
          if (videoUrl) {
            this.enableHeartBeat();
            resolve(this._videoInfo.getVideoUrl());
          } else {
            reject({status: 'fail', message: 'video not found'});
          }
        }.bind(this));

      }.bind(this));
    },
    enableHeartBeat: function() {
      this.disableHeartBeat();
      this._heartBeatTimer =
        window.setInterval(this._onHeartBeat.bind(this), this._heartBeatInterval);
    },
    disableHeartBeat: function() {
      if (this._heartBeatTimer) { window.clearInterval(this._heartBeatTimer); }
    },
    _onHeartBeat: function() {
      //視聴権のcookieを取得するだけなのでwatchページを叩くだけでもいいはず
      window.console.log('HeartBeat');
      //VideoInfoLoader.load(
      //  this._videoInfo.getWatchId(),
      //  this._videoWatchOptions.getVideoLoadOptions()
      //);
    },
    close: function() {
      this.disableHeartBeat();
    }
  });



//===END===
