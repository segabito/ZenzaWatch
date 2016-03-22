var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var Config = {};
var AsyncEmitter = function() {};
var PopupMessage = function() {};
var WindowMessageEmitter = function() {};
var isLogin = function() {};
var isSameOrigin = function() {};
var TOKEN = Math.random();
var ajax = function() {};

//===BEGIN===
    var CacheStorage = (function() {
      var PREFIX = 'ZenzaWatch_cache_';

      function CacheStorage() {
        this.initialize.apply(this, arguments);
      }

      _.assign(CacheStorage.prototype, {
        initialize: function(storage) {
          this._storage = storage;
        },
        setItem: function(key, data, expireTime) {
          key = PREFIX + key;
          var expiredAt =
            typeof expireTime === 'number' ? (Date.now() + expireTime) : '';
          console.log('%ccacheStorage.setItem', 'background: cyan;', key, typeof data, data);
          this._storage[key] = JSON.stringify({
            data: data,
            type: typeof data,
            expiredAt: expiredAt
          });
        },
        getItem: function(key) {
          key = PREFIX + key;
          if (!this._storage.hasOwnProperty(key)) {
            return null;
          }
          var item = null, data = null;
          try {
            item = JSON.parse(this._storage[key]);
            if (item.type === 'string') {
              data = item.data;
            } else if (typeof item.data === 'string') {
              data = JSON.parse(item.data);
            } else {
              data = item.data;
            }
          } catch(e) {
            window.console.error('CacheStorage json parse error:', e);
            window.console.log(this._storage[key]);
            this._storage.removeItem(key);
            return null;
          }

          if (item.expiredAt === '' || item.expiredAt > Date.now()) {
            return data;
          }
          return null;
        },
        removeItem: function(key) {
          key = PREFIX + key;
          if (!this._storage.hasOwnProperty(key)) {
            return null;
          }

          this._storage.removeItem(key);
        },
        clear: function() {
          var storage = this._storage;
          _.each(Object.keys(storage), function(v) {
            if (v.indexOf(PREFIX) === 0) {
              window.console.log('remove item', v, storage[v]);
              storage.removeItem(v);
            }
          });
        }
      });

      return CacheStorage;
    })();
    ZenzaWatch.api.CacheStorage = CacheStorage;
    ZenzaWatch.debug.localCache = new CacheStorage(localStorage);


    var VideoInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/thumb_watch';
      var loaderFrame, loaderWindow;
      var videoInfoLoader = new AsyncEmitter();
      var cacheStorage = new CacheStorage(sessionStorage);

      var onMessage = function(data, type) {
        if (type !== 'videoInfoLoader') { return; }
        console.log('VideoInfoLoader.onMessage', data, type);
        var info = data.message;

        //console.log('%cvideoInfoLoader.onThumbWatchInfoLoad', 'background: lightgreen;', info);
        videoInfoLoader.emitAsync('load', info, 'THUMB_WATCH');
      };

      // 外部プレイヤーと同じ方法で起動するやつ。 ログイン不要で動画が再生できる。
      // CrossDomainGateを使って書き直す。 そのうち
      var initializeCrossDomainGate = function() {
        initializeCrossDomainGate = _.noop;

        console.log('%c initialize videoInfoLoader', 'background: lightgreen;');

        loaderFrame = document.createElement('iframe');
        loaderFrame.name  = 'videoInfoLoaderLoader';
        loaderFrame.className = 'xDomainLoaderFrame thumb';
        document.body.appendChild(loaderFrame);

        loaderWindow = loaderFrame.contentWindow;

        WindowMessageEmitter.addKnownSource(loaderWindow);
        WindowMessageEmitter.on('onMessage', onMessage);
      };

      var loadFromThumbWatch = function(watchId) {
        initializeCrossDomainGate();
        //http://ext.nicovideo.jp/thumb_watch/sm9?cb=onPlayerLoaded&eb=onPlayerError
        var url = [
          BASE_URL, '/',
          watchId,
          '?cb=onPlayerLoaded&eb=onPlayerError'].join('');

        console.log('getVideoInfo: ', url);

        loaderWindow.location.replace(url);
      };

      var parseWatchApiData = function(dom) {
        var $dom = $('<div>' + dom + '</div>');
        try {
          var watchApiData = JSON.parse($dom.find('#watchAPIDataContainer').text());
          var videoId = watchApiData.videoDetail.id;
          var hasLargeThumbnail = ZenzaWatch.util.hasLargeThumbnail(videoId);
          var flvInfo = ZenzaWatch.util.parseQuery(
              decodeURIComponent(watchApiData.flashvars.flvInfo)
            );
          var thumbnail =
            watchApiData.flashvars.thumbImage +
              (hasLargeThumbnail ? '.L' : '');
          var videoUrl = flvInfo.url;
          var isEco = /\d+\.\d+low$/.test(videoUrl);
          var isFlv = /\/smile\?v=/.test(videoUrl);
          var isMp4 = /\/smile\?m=/.test(videoUrl);
          var isSwf = /\/smile\?s=/.test(videoUrl);
          var csrfToken = watchApiData.flashvars.csrfToken;
          
          var playlist = JSON.parse($dom.find('#playlistDataContainer').text());
          var isPlayable = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);

          cacheStorage.setItem('csrfToken', csrfToken, 30 * 60 * 1000);

          var result = {
            _format: 'watchApi',
            watchApiData: watchApiData,
            flvInfo: flvInfo,
            playlist: playlist,
            isPlayable: isPlayable,
            isMp4: isMp4,
            isFlv: isFlv,
            isSwf: isSwf,
            isEco: isEco,
            thumbnail: thumbnail,
            csrfToken: csrfToken
          };

          ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', watchApiData.flashvars.csrfToken);
          return result;

        } catch (e) {
          window.console.error('error: parseWatchApiData ', e);
          return null;
        }
      };

      var loadFromWatchApiData = function(watchId, options) {
        var url = '/watch/' + watchId;
        var query = [];
        if (options.economy === true) {
          query.push('eco=1');
        }
        var isApiMode = false;
        if (query.length > 0) {
          url += '?' + query.join('&');
        }

        console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);

        var isFallback = false;
        var onLoad = function(req) {
          var data = parseWatchApiData(req);
          ZenzaWatch.debug.watchApiData = data;

          if (!data) {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: '動画情報の取得に失敗(watchApi)'
            });
            return;
          }

          if (data.isFlv && !isFallback && options.economy !== true) {
            isFallback = true;

            url = url + '?eco=1';
            console.log('%cエコノミーにフォールバック(flv)', 'background: cyan; color: red;', url);
            window.setTimeout(function() {
              ajax({
                url: url,
                xhrFields: { withCredentials: true },
                //beforeSend: function(xhr) {
                //  xhr.setRequestHeader('Referer', 'http://www.nicovideo.jp');
                //},
                headers: {
//                  'Referer': 'http://www.nicovideo.jp/',
                  'X-Alt-Referer': 'http://www.nicovideo.jp/'
                }
              }).then(
                onLoad,
                function() {
                  videoInfoLoader.emitAsync('fail', watchId, {
                    message: '動画情報の取得に失敗(watchApi)'
                  });
                }
              );
            }, 1000);
          } else if (!data.isPlayable) {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: 'この動画はZenzaWatchで再生できません',
              info: data
            });
          } else if (data.isMp4) {
            videoInfoLoader.emitAsync('load', data, 'WATCH_API', watchId);
            ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId); // 外部連携用
          } else {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: 'この動画はZenzaWatchで再生できません',
              info: data
            });
          }
        };

        ajax({
          url: url,
          xhrFields: { withCredentials: true },
          // referrerによってplaylistの中身が変わるので無難な物にする
          //beforeSend: function(xhr) {
          //  xhr.setRequestHeader('Referer', 'http://www.nicovideo.jp');
          //},
          headers: {
//            'Referer': 'http://www.nicovideo.jp/',
            'X-Alt-Referer': 'http://www.nicovideo.jp/'
          }
        }).then(
          onLoad,
          function() {
            videoInfoLoader.emitAsync('fail', watchId, {
              message: '動画情報の取得に失敗(watchApi)'
            });
          }
        );
      };

      var load = function(watchId, options) {
        if (isLogin()) {
          loadFromWatchApiData(watchId, options);
        } else {
          loadFromThumbWatch(watchId, options);
        }
      };

      _.assign(videoInfoLoader, {
        load: load
      });

      return videoInfoLoader;
    })();



    var ThumbInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/';
      var MESSAGE_ORIGIN = 'http://ext.nicovideo.jp/';
      var gate = null;
      var cacheStorage;

      var parseXml = function(xmlText) {
        var parser = new DOMParser();
        var xml = parser.parseFromString(xmlText, 'text/xml');
        var val = function(name) {
          var elms = xml.getElementsByTagName(name);
          if (elms.length < 1) {
            return null;
          }
          return elms[0].innerHTML;
        };

        var resp = xml.getElementsByTagName('nicovideo_thumb_response');
        if (resp.length < 1 || resp[0].getAttribute('status') !== 'ok') {
          return {
            status: 'fail',
            code: val('code'),
            message: val('description')
          };
        }

        var duration = (function() {
          var tmp = val('length').split(':');
          return parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
        })();
        var watchId = val('watch_url').split('/').reverse()[0];
        var postedAt = (new Date(val('first_retrieve'))).toLocaleString();
        var tags = (function() {
          var result = [], t = xml.getElementsByTagName('tag');
          _.each(t, function(tag) {
            result.push(tag.innerHTML);
          });
          return result;
        })();

        var result = {
          status: 'ok',
          _format: 'thumbInfo',
          v:     watchId,
          id:    val('video_id'),
          title: val('title'),
          description:  val('description'),
          thumbnail:    val('thumbnail_url'),
          movieType:    val('movie_type'),
          lastResBody:  val('last_res_body'),
          duration:     duration,
          postedAt:     postedAt,
          mylistCount:  parseInt(val('mylist_counter'), 10),
          viewCount:    parseInt(val('view_counter'), 10),
          commentCount: parseInt(val('comment_num'), 10),
          tagList: tags
        };
        var userId = val('user_id');
        if (userId !== null) {
          result.owner = {
            type: 'user',
            id: userId,
            name: val('user_nickname') || '(非公開ユーザー)',
            url:  userId ? ('//www.nicovideo.jp/user/' + userId) : '#',
            icon: val('user_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
          };
        }
        var channelId  = val('ch_id');
        if (channelId !== null) {
          result.owner = {
            type: 'channel',
            id: channelId,
            name: val('ch_name') || '(非公開ユーザー)',
            url: '//ch.nicovideo.jp/ch' + channelId,
            icon: val('ch_icon_url') || '//res.nimg.jp/img/user/thumb/blank.jpg'
          };
        }
        console.log('thumbinfo: ', watchId, result);

        cacheStorage.setItem('thumbInfo_' + result.v, result);

        return result;
      };

      var initialize = function() {
        initialize = _.noop;
        cacheStorage = new CacheStorage(sessionStorage);
        gate = new CrossDomainGate({
          baseUrl: BASE_URL,
          origin: MESSAGE_ORIGIN,
          type: 'thumbInfo',
          messager: WindowMessageEmitter
        });
      };

      var load = function(watchId) {
        initialize();

        return new Promise(function(resolve, reject) {
          var cache = cacheStorage.getItem('thumbInfo_' + watchId);
          if (cache) {
            console.log('cache exist: ', watchId);
            ZenzaWatch.util.callAsync(function() { resolve(cache); });
            return;
          }

          gate.load(BASE_URL + 'api/getthumbinfo/' + watchId).then(function(result) {
            result = parseXml(result);
            if (result.status === 'ok') {
              resolve(result);
            } else {
              reject(result);
            }
          });
        });
      };

      return {
        load: load
      };
    })();
    ZenzaWatch.api.ThumbInfoLoader = ThumbInfoLoader;
// ZenzaWatch.api.ThumbInfoLoader.load('sm9').then(function() {console.log(true, arguments); }, function() { console.log(false, arguments)});

    var VitaApiLoader = (function() {
      var BASE_URL = 'http://api.ce.nicovideo.jp/api/v1/system.unixtime';
      var MESSAGE_ORIGIN = 'http://api.ce.nicovideo.jp/';
      var gate = null;
      var cacheStorage;
      var STORAGE_PREFIX = 'vitaApi_';

      var initialize = function() {
        initialize = _.noop;
        cacheStorage = new CacheStorage(sessionStorage);
        gate = new CrossDomainGate({
          baseUrl: BASE_URL,
          origin: MESSAGE_ORIGIN,
          type: 'vitaApi',
          messager: WindowMessageEmitter
        });
      };

      var saveCache = function(videoInfoList) {
        _.each(videoInfoList, function(videoInfo) {
          var videoId = videoInfo.video.id;
          cacheStorage.setItem(STORAGE_PREFIX + videoId, videoInfo);
        });
      };
      var loadCache = function(watchIds) {
        var result = {};
        _.each(watchIds, function(watchId) {
          var videoInfo = cacheStorage.getItem(STORAGE_PREFIX + watchId);
          if (!videoInfo) { return; }
          videoInfo._format = 'vitaApi';
          result[watchId] = videoInfo;
        });
        return result;
      };

      var load = function(watchIds) {
        initialize();
        watchIds = _.isArray(watchIds) ? watchIds : [watchIds];

        var cacheList = {};
        var noChacheWatchIds = _.filter(watchIds, function(watchId) {
          var cache = cacheStorage.getItem(STORAGE_PREFIX + watchId);
          if (cache) {
            cacheList[watchId] = cache;
            return false;
          }
          return true;
        });

        return new Promise(function(resolve, reject) {
          if (watchIds.length < 1) {
            ZenzaWatch.util.callAsync(function() {
              resolve(cacheList);
            });
            return;
          }

          var url = '/nicoapi/v1/video.array?v=' +
            noChacheWatchIds.join(',') + '&__format=json';

          gate.ajax({
            url: url,
            dataType: 'json'
          }).then(function(json) {
            ZenzaWatch.debug.lastVitaApiResult = json;
            var status = json.nicovideo_video_response['@status'];
            if (status === 'ok') {
              var videoInfoList = json.nicovideo_video_response.video_info || [];
              videoInfoList = _.isArray(videoInfoList) ? videoInfoList : [videoInfoList];
              saveCache(videoInfoList);
              resolve(loadCache(watchIds));
            } else {
              reject({
                status: status,
                message: '取得失敗',
                resp: json
              });
            }
          });
        });
      };

      return {
        load: load
      };
    })();
    ZenzaWatch.api.VitaApiLoader = VitaApiLoader;


    var MessageApiLoader = (function() {
      var VERSION_OLD = '20061206';
      var VERSION     = '20090904';

      var MessageApiLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.assign(MessageApiLoader.prototype, {
        initialize: function() {
          this._threadKeys = {};
        },
        /**
         * 動画の長さに応じて取得するコメント数を変える
         * 本家よりちょっと盛ってる
         */
        getRequestCountByDuration: function(duration) {
          if (duration < 60)  { return 100;}
          if (duration < 240) { return 200;}
          if (duration < 300) { return 400;}
          return 1000;
        },
        getThreadKey: function(threadId) {
          // memo:
          // http://flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          var url =
            'http://flapi.nicovideo.jp/api/getthreadkey?thread=' + threadId +
            '&language_id=0';

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then(function(e) {
              var result = ZenzaWatch.util.parseQuery(e);
              self._threadKeys[threadId] = result;
              resolve(result);
            }, function(result) {
              //PopupMessage.alert('ThreadKeyの取得失敗 ' + threadId);
              reject({
                result: result,
                message: 'ThreadKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        getPostKey: function(threadId, blockNo) {
          // memo:
          // http://flapi.nicovideo.jp/api/getthreadkey?thread={optionalじゃないほうのID}
          var url =
            'http://flapi.nicovideo.jp/api/getpostkey?thread=' + threadId +
            '&block_no=' + blockNo +
            //'&version=1&yugi=' +
            '&language_id=0';

          console.log('getPostkey url: ', url);
          return new Promise(function(resolve, reject) {
            ajax({
              url: url,
              contentType: 'text/plain',
              crossDomain: true,
              cache: false,
              xhrFields: {
                withCredentials: true
              }
            }).then(function(e) {
              resolve(ZenzaWatch.util.parseQuery(e));
            }, function(result) {
              //PopupMessage.alert('ThreadKeyの取得失敗 ' + threadId);
              reject({
                result: result,
                message: 'PostKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        _createThreadXml:
          function(threadId, version, userId, threadKey, force184, duration, userKey) {
          var thread = document.createElement('thread');
          thread.setAttribute('thread', threadId);
          thread.setAttribute('version', version);
          if (duration) {
            var resCount = this.getRequestCountByDuration(duration);
            thread.setAttribute('fork', '1');
            thread.setAttribute('click_revision', '-1');
            thread.setAttribute('res_from', '-' + resCount);
          }
          if (typeof userId !== 'undefined') {
            thread.setAttribute('user_id', userId);
          }
          if (typeof threadKey !== 'undefined') {
            thread.setAttribute('threadkey', threadKey);
          }
          if (typeof force184 !== 'undefined') {
            thread.setAttribute('force_184', force184);
          }
          thread.setAttribute('scores', '1');
          thread.setAttribute('nicoru', '1');
          thread.setAttribute('with_global', '1');

          if (userKey) { thread.setAttribute('userkey', userKey); }
          return thread;
        },
        _createThreadLeavesXml:
          function(threadId, version, userId, threadKey, force184, duration, userKey) {
          var thread_leaves = document.createElement('thread_leaves');
          var resCount = this.getRequestCountByDuration(duration);
          var threadLeavesParam =
            ['0-', (Math.floor(duration / 60) + 1), ':100,', resCount].join('');
          thread_leaves.setAttribute('thread', threadId);
          if (typeof userId !== 'undefined') {
            thread_leaves.setAttribute('user_id', userId);
          }
          if (typeof threadKey !== 'undefined') {
            thread_leaves.setAttribute('threadkey', threadKey);
          }
          if (typeof force184 !== 'undefined') {
            thread_leaves.setAttribute('force_184', force184);
          }
          thread_leaves.setAttribute('scores', '1');
          thread_leaves.setAttribute('nicoru', '1');
          if (userKey) { thread_leaves.setAttribute('userkey', userKey); }

          thread_leaves.innerHTML = threadLeavesParam;

          return thread_leaves;
        },

        buildPacket: function(threadId, duration, userId, threadKey, force184, optionalThreadId, userKey)
        {
          var span = document.createElement('span');
          var packet = document.createElement('packet');

//          if (typeof optionalThreadId !== 'undefined') {
//            packet.appendChild(
//              this._createThreadXml(optionalThreadId, VERSION, userId, threadKey, force184)
//            );
//            packet.appendChild(
//              this._createThreadLeavesXml(optionalThreadId, VERSION, userId, threadKey, force184, duration)
//            );
//          }

          packet.appendChild(
            this._createThreadXml(threadId, VERSION_OLD, userId, threadKey, force184, duration)
          );
          packet.appendChild(
            this._createThreadXml(threadId, VERSION, userId, threadKey, force184, null, userKey)
          );
          packet.appendChild(
            this._createThreadLeavesXml(threadId, VERSION, userId, threadKey, force184, duration, userKey)
          );

          span.appendChild(packet);
          var packetXml = span.innerHTML;

          return packetXml;
        },
        _post: function(server, xml) {
          // マイページのjQueryが古いためかおかしな挙動をするのでPromiseで囲う
          var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
          return new Promise(function(resolve, reject) {
            ajax({
              url: server,
              data: xml,
              timeout: 60000,
              type: 'POST',
              contentType: isNmsg ? 'text/xml' : 'text/plain',
              dataType: 'xml',
    //          xhrFields: { withCredentials: true },
              crossDomain: true,
              cache: false
            }).then(function(result) {
              //console.log('post success: ', result);
              resolve(result);
            }, function(result) {
              //console.log('post fail: ', result);
              reject({
                result: result,
                message: 'コメントの通信失敗 server: ' + server
              });
            });
          });
        },
        _get: function(server, threadId, duration, threadKey, force184) {
          // nmsg.nicovideo.jpでググったら出てきた。
          // http://favstar.fm/users/koizuka/status/23032783744012288
          // xmlじゃなくてもいいのかよ!

          var resCount = this.getRequestCountByDuration(duration);

          var url = server +
            'thread?version=' + VERSION +
            '&thread=' + threadId +
            '&scores=1' +
            '&res_from=-' + resCount;
          if (threadKey) {
            url += '&threadkey=' + threadKey;
          }
          if (force184) {
            url += '&force_184=' + force184;
          }

          console.log('%cthread url:', 'background: cyan;', url);
          return new Promise(function(resolve, reject) {
            ajax({
              url: url,
              timeout: 60000,
              crossDomain: true,
              cache: false
            }).then(function(result) {
              //console.log('post success: ', result);
              resolve(result);
            }, function(result) {
              //console.log('post fail: ', result);
              reject({
                result: result,
                message: 'コメントの取得失敗' + server
              });
            });
          });
        },
        _load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId, userKey) {
          var packet, self = this;
          if (isNeedKey) {
            return this.getThreadKey(threadId).then(function(info) {
              console.log('threadkey: ', info);
              packet = self.buildPacket(
                threadId,
                duration,
                userId,
                info.threadkey,
                info.force_184,
                optionalThreadId
              );
              console.log('post xml...', server, packet);
              //get(server, threadId, duration, info.threadkey, info.force_184);
              return self._post(server, packet, threadId);
            });
          } else {
            packet = this.buildPacket(
              threadId,
              duration,
              userId,
              undefined, //  info.threadkey,
              undefined, //  info.force_184,
              optionalThreadId,
              userKey
            );
            console.log('post xml...', server, packet);
            return this._post(server, packet, threadId);
          }
        },
        load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId, userKey) {

          var timeKey = 'loadComment server: ' + server + ' thread: ' + threadId;
          window.console.time(timeKey);
          var self = this;

          var resolve, reject;
          var onSuccess = function(result) {
            window.console.timeEnd(timeKey);
            ZenzaWatch.debug.lastMessageServerResult = result;

            var lastRes;
            var resultCode = null, thread, xml, ticket, lastRes = 0;
            try {
              xml = result.documentElement;
              var threads = xml.getElementsByTagName('thread');

              thread = threads[0];
              _.each(threads, function(t) {
                var tk = t.getAttribute('ticket');
                if (tk && tk !== '0') { ticket = tk; }
                var lr = t.getAttribute('last_res');
                if (!isNaN(lr)) { lastRes = Math.max(lastRes, lr); }
              });

              resultCode = thread.getAttribute('resultcode');
            } catch (e) {
              console.error(e);
            }

            if (resultCode !== '0') {
              reject({
                message: 'コメント取得失敗' + resultCode
              });
              return;
            }

            var threadInfo = {
              server:     server,
              userId:     userId,
              resultCode: thread.getAttribute('resultcode'),
              thread:     thread.getAttribute('thread'),
              serverTime: thread.getAttribute('server_time'),
              lastRes:    lastRes,
              blockNo:    Math.floor((lastRes + 1) / 100),
              ticket:     ticket,
              revision:   thread.getAttribute('revision')
            };

            if (self._threadKeys[threadId]) {
              threadInfo.threadKey = self._threadKeys[threadId].threadkey;
              threadInfo.force184  = self._threadKeys[threadId].force_184;
            }

            window.console.log('threadInfo: ', threadInfo);
            resolve({
              resultCode: parseInt(resultCode, 10),
              threadInfo: threadInfo,
              xml: xml
            });
          };

          var onFailFinally = function(e) {
            window.console.timeEnd(timeKey);
            window.console.error('loadComment fail: ', e);
            reject({
              message: 'コメントサーバーの通信失敗: ' + server
            });
          };

          var onFail1st = function(e) {
            window.console.timeEnd(timeKey);
            window.console.error('loadComment fail: ', e);
            PopupMessage.alert('コメントの取得失敗: 3秒後にリトライ');

            window.setTimeout(function() {
              self._load(
                server, threadId, duration,
                userId, isNeedKey,
                optionalThreadId, userKey
              ).then(onSuccess, onFailFinally);
            }, 3000);
          };


          return new Promise(function(res, rej) {
            resolve = res;
            reject  = rej;
            self._load(
              server, threadId, duration,
              userId, isNeedKey,
              optionalThreadId, userKey
            ).then(onSuccess, onFail1st);
          });
        },
        _postChat: function(threadInfo, postKey, text, cmd, vpos) {
          var self = this;
          var div = document.createElement('div');
          var chat = document.createElement('chat');
          chat.setAttribute('premium', ZenzaWatch.util.isPremium() ? '1' : '0');
          chat.setAttribute('postkey', postKey);
          chat.setAttribute('user_id', threadInfo.userId);
          chat.setAttribute('ticket',  threadInfo.ticket);
          chat.setAttribute('thread',  threadInfo.thread);
          chat.setAttribute('mail',    cmd);
          chat.setAttribute('vpos',    vpos);
          chat.innerHTML = text;
          div.appendChild(chat);
          var xml = div.innerHTML;

          window.console.log('post xml: ', xml);
          return self._post(threadInfo.server, xml).then(function(result) {
            var status = null, chat_result, no = 0, blockNo = 0;
            try {
              xml = result.documentElement;
              chat_result = xml.getElementsByTagName('chat_result')[0];
              status = chat_result.getAttribute('status');
              no = parseInt(chat_result.getAttribute('no'), 10);
              blockNo = Math.floor((no + 1) / 100);
            } catch (e) {
              console.error(e);
            }

            if (status !== '0') {
              return Promise.reject({
                status: 'fail',
                no: no,
                blockNo: blockNo,
                code: status,
                message: 'コメント投稿失敗 status: ' + status + ' server: ' + threadInfo.server
              });
            }

            return Promise.resolve({
              status: 'ok',
              no: no,
              blockNo: blockNo,
              code: status,
              message: 'コメント投稿成功'
            });
          });
        },
        postChat: function(threadInfo, text, cmd, vpos) {
          var self = this;
          return this.getPostKey(threadInfo.thread, threadInfo.blockNo)
            .then(function(result) {
            return self._postChat(threadInfo, result.postkey, text, cmd, vpos);
          });
        }
      });

      return MessageApiLoader;
    })();
    ZenzaWatch.api.MessageApiLoader = MessageApiLoader;

    var MylistApiLoader = (function() {
      // マイリスト/とりあえずマイリストの取得APIには
      // www.nicovideo.jp配下とriapi.nicovideo.jp配下の２種類がある
      // 他人のマイリストを取得するにはriapi、マイリストの編集にはwwwのapiが必要
      // データのフォーマットが微妙に異なるのでめんどくさい
      //
      // おかげでソート処理が悲しいことに
      //
      var CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
      var TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
      var token = '';
      var cacheStorage = null;

      function MylistApiLoader() {
        this.initialize.apply(this, arguments);
      }

      ZenzaWatch.emitter.on('csrfTokenUpdate', function(t) {
        token = t;
        if (cacheStorage) {
          cacheStorage.setItem('csrfToken', token, TOKEN_EXPIRE_TIME);
        }
      });

      _.assign(MylistApiLoader.prototype, {
        initialize: function() {
          if (!cacheStorage) {
            cacheStorage = new CacheStorage(sessionStorage);
          }
          if (!token) {
            token = cacheStorage.getItem('csrfToken');
            if (token) { console.log('cached token exists', token); }
          }
        },
        getDeflistItems: function(options) {
          var url = 'http://www.nicovideo.jp/api/deflist/list';
          //var url = 'http://riapi.nicovideo.jp/api/watch/deflistvideo';
          var cacheKey = 'deflistItems';
          var sortItem = this.sortItem;
          options = options || {};

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() {
                if (options.sort) { cacheData = sortItem(cacheData, options.sort, 'www'); }
                resolve(cacheData);
              }, this);
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
                reject({
                  result: result,
                  message: 'とりあえずマイリストの取得失敗(1)'
                });
                return;
              }

              var data = result.list || result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              if (options.sort) { data = sortItem(data, options.sort, 'www'); }
              resolve(data);
            }, function(err) {
              reject({
                result: err,
                message: 'とりあえずマイリストの取得失敗(2)'
              });
            });
          });
        },
        getMylistItems: function(groupId, options) {
          if (groupId === 'deflist') { return this.getDeflistItems(options); }
          // riapiじゃないと自分のマイリストしか取れないことが発覚
          var url = 'http://riapi.nicovideo.jp/api/watch/mylistvideo?id=' + groupId;
          var cacheKey = 'mylistItems: ' + groupId;
          var sortItem = this.sortItem;

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() {
                if (options.sort) { cacheData = sortItem(cacheData, options.sort, 'riapi'); }
                resolve(cacheData);
              }, this);
              return;
            }

            return ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || (!result.list && !result.mylistitem)) {
                return reject({
                  result: result,
                  message: 'マイリストの取得失敗(1)'
                });
              }

              var data = result.list || result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              if (options.sort) { data = sortItem(data, options.sort, 'riapi'); }
              return resolve(data);
            }, function(err) {
              this.reject({
                result: err,
                message: 'マイリストの取得失敗(2)'
              });
            });
          });
        },
        sortItem: function(items, sortId, format) {
          // wwwの時とriapiの時で微妙にフォーマットが違うのでめんどくさい
          // 自分以外のマイリストが開けるのはriapiだけの模様
          // 編集時にはitem_idが必要なのだが、それはwwwのほうにしか入ってない
          // riapiに統一したい
          sortId = parseInt(sortId, 10);

          var sortKey = ([
            'create_time',    'create_time',
            'mylist_comment', 'mylist_comment', // format = wwwの時はdescription
            'title',          'title',
            'first_retrieve', 'first_retrieve',
            'view_counter',   'view_counter',
            'thread_update_time', 'thread_update_time',
            'num_res',        'num_res',
            'mylist_counter', 'mylist_counter',
            'length_seconds', 'length_seconds'
          ])[sortId];

          if (format === 'www' && sortKey === 'mylist_comment') {
            sortKey = 'description';
          }
          if (format === 'www' && sortKey === 'thread_update_time') {
            sortKey = 'update_time';
          }

          var order;
          switch (sortKey) {
            // 偶数がascで奇数がdescかと思ったら特に統一されてなかった
            case 'first_retrieve':
            case 'thread_update_time':
            case 'update_time':
              order = (sortId % 2 === 1) ? 'asc' : 'desc';
              break;
            // 数値系は偶数がdesc
            case 'num_res':
            case 'mylist_counter':
            case 'view_counter':
            case 'length_seconds':
              order = (sortId % 2 === 1) ? 'asc' : 'desc';
              break;
            default:
              order = (sortId % 2 === 0) ? 'asc' : 'desc';
          }

          //window.console.log('sortKey?', sortId, sortKey, order);
          if (!sortKey) { return items; }

          var getKeyFunc = (function(sortKey, format) {
            switch (sortKey) {
              case 'create_time':
              case 'description':
              case 'mylist_comment':
              case 'update_time':
                return function(item) { return item[sortKey]; };
              case 'num_res':
              case 'mylist_counter':
              case 'view_counter':
              case 'length_seconds':
                if (format === 'riapi') {
                  return function(item) { return item[sortKey] * 1; };
                } else {
                  return function(item) { return item.item_data[sortKey] * 1; };
                }
                break;
              default:
                if (format === 'riapi') {
                  return function(item) { return item[sortKey]; };
                } else {
                  return function(item) { return item.item_data[sortKey]; };
                }
            }
          })(sortKey, format);

          var compareFunc = (function(order, getKey) {
            switch (order) {
              // sortKeyが同一だった場合は動画IDでソートする
              // 銀魂など、一部公式チャンネル動画向けの対応
              case 'asc':
                return function(a, b) {
                  var ak = getKey(a), bk = getKey(b);
                  if (ak !== bk) { return ak > bk ? 1 : -1; }
                  //else { return a.item_data.watch_id > b.item_data.watch_id ? 1 : -1; }
                  else { return a.id > b.id ? 1 : -1; }
                };
              case 'desc':
                return function(a, b) {
                  var ak = getKey(a), bk = getKey(b);
                  if (ak !== bk) { return (ak < bk) ? 1 : -1; }
                  else { return a.id < b.id ? 1 : -1; }
                };
            }
          })(order, getKeyFunc);

          //window.console.log('before sort', items[0], items, order, sortKey, compareFunc);
          items.sort(compareFunc);
          //window.console.log('after sort', items[0], items);
          return items;
        },
        getMylistList: function() {
          var url = 'http://www.nicovideo.jp/api/mylistgroup/list';
          var cacheKey = 'mylistList';

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); });
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
              }).then(function(result) {
                if (result.status !== 'ok' || !result.mylistgroup) {
                  return reject({
                    result: result,
                    message: 'マイリスト一覧の取得失敗(1)'
                  });
                }

                var data = result.mylistgroup;
                cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
                return resolve(data);
              }, function(err) {
                return reject({
                  result: err,
                  message: 'マイリスト一覧の取得失敗(2)'
                });
              });
          });
        },
        findDeflistItemByWatchId: function(watchId) {
          return this.getDeflistItems().then(function(items) {
            for (var i = 0, len = items.length; i < len; i++) {
              var item = items[i], wid = item.id || item.item_data.watch_id;
              if (wid === watchId) {
                return Promise.resolve(item);
              }
            }
            return Promise.reject();
          });
        },
        removeDeflistItem: function(watchId) {
          return this.findDeflistItemByWatchId(watchId).then(function(item) {
            var url = 'http://www.nicovideo.jp/api/deflist/delete';
            var data = 'id_list[0][]=' + item.item_id + '&token=' + token;
            var cacheKey = 'deflistItems';
            var req = {
              url: url,
              method: 'POST',
              data: data,
              dataType: 'json',
              headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            };

            return ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                ZenzaWatch.emitter.emitAsync('deflistRemove', watchId);
                return Promise.resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリストから削除'
                });
              }

              return Promise.reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });

            }, function(err) {
              return Promise.reject({
                result: err,
                message: 'とりあえずマイリストから削除失敗(2)'
              });
            });

          }, function(err) {
            return Promise.reject({
              status: 'fail',
              result: err,
              message: '動画が見つかりません'
            });
          });
         },
        _addDeflistItem: function(watchId, description, isRetry) {
          var url = 'http://www.nicovideo.jp/api/deflist/add';
          var data = 'item_id=' + watchId + '&token=' + token;
          if (description) {
            data += '&description='+ encodeURIComponent(description);
          }
          var cacheKey = 'deflistItems';

          var req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            timeout: 60000,
            xhrFields: { withCredentials: true },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          };

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                ZenzaWatch.emitter.emitAsync('deflistAdd', watchId, description);
                return resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリスト登録'
                });
              }

              if (!result.status || !result.error) {
                return reject({
                  status: 'fail',
                  result: result,
                  message: 'とりあえずマイリスト登録失敗(100)'
                });
              }

              if (result.error.code !== 'EXIST' || isRetry) {
                return reject({
                  status: 'fail',
                  result: result,
                  code: result.error.code,
                  message: result.error.description
                });
              }

              /**
               すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
               例えば、とりマイの300番目に登録済みだった場合に「登録済みです」と言われても探すのがダルいし、
               他の動画を追加していけば、そのうち押し出されて消えてしまう。
               なので、重複時にエラーを出すのではなく、「消してから追加」することによって先頭に持ってくる。
              */
              self.removeDeflistItem(watchId).then(function() {
                self._addDeflistItem(watchId, description, true).then(function(result) {
                  resolve({
                    status: 'ok',
                    result: result,
                    message: 'とりあえずマイリストの先頭に移動'
                  });
                });
              }, function(err) {
                reject({
                  status: 'fail',
                  result: err.result,
                  code:   err.code,
                  message: 'とりあえずマイリスト登録失敗(101)'
                });
              });

            }, function(err) {
              reject({
                status: 'fail',
                result: err,
                message: 'とりあえずマイリスト登録失敗(200)'
              });
            });
          });
        },
        addDeflistItem: function(watchId, description) {
          return this._addDeflistItem(watchId, description, false);
        },
        addMylistItem: function(watchId, groupId, description) {
          var url = 'http://www.nicovideo.jp/api/mylist/add';
          var data = 'item_id=' + watchId + '&token=' + token + '&group_id=' + groupId;
          if (description) {
            data += '&description='+ encodeURIComponent(description);
          }
          var cacheKey = 'mylistItems: ' + groupId;

          var req = {
            url: url,
            method: 'POST',
            data: data,
            dataType: 'json',
            timeout: 60000,
            xhrFields: { withCredentials: true },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          };

          var self = this;
          return new Promise(function(resolve, reject) {
            ajax(req).then(function(result) {
              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                // マイリストに登録したらとりあえずマイリストから除去(=移動)
                self.removeDeflistItem(watchId).then(_.noop, _.noop);
                return resolve({
                  status: 'ok',
                  result: result,
                  message: 'マイリスト登録'
                });
              }

              if (!result.status || !result.error) {
                return reject({
                  status: 'fail',
                  result: result,
                  message: 'マイリスト登録失敗(100)'
                });
              }

              // マイリストの場合は重複があっても「追加して削除」しない。
              // とりまいと違って押し出されることがないし、
              // シリーズ物が勝手に入れ替わっても困るため

              ZenzaWatch.emitter.emitAsync('mylistAdd', watchId, groupId, description);
              return reject({
                status: 'fail',
                result: result,
                code: result.error.code,
                message: result.error.description
              });
            }, function(err) {
              reject({
                status: 'fail',
                result: err,
                message: 'マイリスト登録失敗(200)'
              });
            });
          });
        }
      });

      return MylistApiLoader;
    })();
    ZenzaWatch.api.MylistApiLoader = MylistApiLoader;
    ZenzaWatch.init.mylistApiLoader = new MylistApiLoader();
//    window.mmm = ZenzaWatch.init.mylistApiLoader;


    var CrossDomainGate = function() { this.initialize.apply(this, arguments); };
    _.extend(CrossDomainGate.prototype, AsyncEmitter.prototype);
    _.assign(CrossDomainGate.prototype, {
      initialize: function(params) {
        this._baseUrl  = params.baseUrl;
        this._origin   = params.origin || location.href;
        this._type     = params.type;
        this._messager = params.messager || WindowMessageEmitter;

        this._loaderFrame = null;
        this._sessions = {};
        this._initializeStatus = '';
      },
      _initializeFrame: function() {
        var self = this;
        switch (this._initializeStatus) {
          case 'done':
            return new Promise(function(resolve) {
              ZenzaWatch.util.callAsync(function() {
                resolve();
              });
            });
          case 'initializing':
            return new Promise(function(resolve, reject) {
              self.on('initialize', function(e) {
                if (e.status === 'ok') { resolve(); } else { reject(e); }
              });
            });
          case '':
            this._initializeStatus = 'initializing';
            var initialPromise = new Promise(function(resolve, reject) {
              self._sessions.initial = {
                promise: initialPromise,
                resolve: resolve,
                reject: reject
              };
              window.setTimeout(function() {
                if (self._initializeStatus !== 'done') {
                  var rej = {
                    status: 'fail',
                    message: 'CrossDomainGate初期化タイムアウト (' + self._type + ')'
                  };
                  reject(rej);
                  self.emit('initialize', rej);
                }
              }, 60 * 1000);
              self._initializeCrossDomainGate();

            });
          return initialPromise;
        }
      },
      _initializeCrossDomainGate: function() {
        this._initializeCrossDomainGate = _.noop;
        this._messager.on('onMessage', _.bind(this._onMessage, this));

        console.log('%c initialize ' + this._type, 'background: lightgreen;');

        var loaderFrame = document.createElement('iframe');
        loaderFrame.name = this._type + 'Loader';
        //loaderFrame.src  = this._baseUrl;
        loaderFrame.className = 'xDomainLoaderFrame ' + this._type;
        document.body.appendChild(loaderFrame);

        this._loaderFrame = loaderFrame;
        this._loaderWindow = loaderFrame.contentWindow;
        this._messager.addKnownSource(this._loaderWindow);
        this._loaderWindow.location.href = this._baseUrl + '#' + TOKEN;
      },
      _onMessage: function(data, type) {
        if (type !== this._type) { return; }
        var info      = data.message;
        var token     = info.token;
        var sessionId = info.sessionId;
        var status    = info.status;
        var command   = info.command || 'loadUrl';
        var session   = this._sessions[sessionId];

        if (status === 'initialized') {
          window.console.log(type + ' initialized');
          this._initializeStatus = 'done';
          this._sessions.initial.resolve();
          this.emitAsync('initialize', {status: 'ok'});
          return;
        }

        if (token !== TOKEN) {
          window.console.log('invalid token:', token, TOKEN);
          return;
        }

        switch (command) {
          case 'dumpConfig':
            this._onDumpConfig(info.body);
            break;

          default:
            if (!session) { return; }
            if (status === 'ok') { session.resolve(info.body); }
            else { session.reject({ message: status }); }
            session = null;
            delete this._sessions[sessionId];
            break;
        }
      },
      load: function(url, options) {
        return this._postMessage({
          command: 'loadUrl',
          url: url,
          options: options
        }, true);
      },
      ajax: function(options) {
        var url = options.url;
        return this.load(url, options).then(function(result) {
          //window.console.log('xDomain ajax result', result);
          ZenzaWatch.debug.lastCrossDomainAjaxResult = result;
          try {
            var dataType = (options.dataType || '').toLowerCase();
            switch (dataType) {
              case 'json':
                var json = JSON.parse(result);
                return Promise.resolve(json);
              case 'xml':
                var parser = new DOMParser();
                var xml = parser.parseFromString(result, 'text/xml');
                return Promise.resolve(xml);
            }
            return Promise.resolve(result);
          } catch (e) {
            return Promise.reject({
              status: 'fail',
              message: 'パース失敗',
              error: e
            });
          }
        });
      },
      configBridge: function(config) {
        var self = this;
        var keys = config.getKeys();
        self._config = config;

        return new Promise(function(resolve, reject) {
          self._configBridgeResolve = resolve;
          self._configBridgeReject  = reject;
          self._postMessage({
            url: '',
            command: 'dumpConfig',
            keys: keys
          });
        });
      },
      _postMessage: function(message, needPromise) {
        var self = this;
        return new Promise(function(resolve, reject) {
          message.sessionId = self._type + '_' + Math.random();
          message.token = TOKEN;
          if (needPromise) {
            self._sessions[message.sessionId] = {
              resolve: resolve,
              reject: reject
            };
          }

          return self._initializeFrame().then(function() {
            try {
              self._loaderWindow.postMessage(
                JSON.stringify(message),
                self._origin
              );
            } catch (e) {
              console.log('%cException!', 'background: red;', e);
            }
          });
        });
      },
      _onDumpConfig: function(configData) {
        //window.console.log('_onDumpConfig', configData);
        var self = this;
        _.each(Object.keys(configData), function(key) {
          //window.console.log('config %s: %s', key, configData[key]);
          self._config.setValue(key, configData[key]);
        });

        if (!location.host.match(/^[a-z0-9]*.nicovideo.jp$/) &&
            !this._config.getValue('allowOtherDomain')) {
          window.console.log('allowOtherDomain', this._config.getValue('allowOtherDomain'));
          self._configBridgeReject();
          return;
        }
        this._config.on('update', function(key, value) {
          if (key === 'autoCloseFullScreen') { return; }

          self._postMessage({
            command: 'saveConfig',
            key: key,
            value: value
          });
        });
        self._configBridgeResolve();
      },
      pushHistory: function(path, title) {
        var self = this;
        var sessionId = self._type +'_' + Math.random();
        self._initializeFrame().then(function() {
          try {
            self._loaderWindow.postMessage(JSON.stringify({
              sessionId: sessionId,
              command: 'pushHistory',
              path: path,
              title: title || ''
            }),
            self._origin);
          } catch (e) {
            console.log('%cException!', 'background: red;', e);
          }
        });
      },
    });

    if (location.host !== 'www.nicovideo.jp') {
      NicoVideoApi = new CrossDomainGate({
        baseUrl: 'http://www.nicovideo.jp/favicon.ico',
        origin: 'http://www.nicovideo.jp/',
        type: 'nicovideoApi',
        messager: WindowMessageEmitter
      });
    }

//===END===
/*
create_time : 1458338784
description_short : "GWって「ガンバレ、私」ってこと？天気の良さがうらめしい（１号）です。これからたくさんの方に「初音..."
first_retrieve : "2010-05-03 15:00:00"
id : "1272596175"
is_middle_thumbnail : false
last_res_body : "これ持ってるw 持ってる ルカさん美人だしミク お前らいい加減にしろ きたあ ... "
length : "2:03"
length_seconds : "123"
mylist_comment : ""
mylist_counter : "333"
num_res : "1232"
thread_update_time : "2015-05-09 06:54:09"
thumbnail_style : {offset_x: 0, offset_y: -15, width: 160}
thumbnail_url : "http://tn-skr3.smilevideo.jp/smile?i=10555830"
title : "【初音ミク】「magnet」のプレイ動画をちょっとだけ公開してみた【Project DIVA 2nd】"
view_counter : "123929"
*/
console.log(VideoInfoLoader);
