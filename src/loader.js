var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var AsyncEmitter = function() {};
var PopupMessage = function() {};

//===BEGIN===
    var VideoInfoLoader = (function() {
      var BASE_URL = 'http://ext.nicovideo.jp/thumb_watch';
      var loaderFrame, loaderWindow;
      var videoInfoLoader = new AsyncEmitter();

      var onMessage = function(data, type) {
        if (type !== 'videoInfoLoader') { return; }
        console.log('VideoInfoLoader.onMessage', data, type);
        var info = data.message;

        //console.log('%cvideoInfoLoader.onThumbWatchInfoLoad', 'background: lightgreen;', info);
        videoInfoLoader.emitAsync('load', info, 'THUMB_WATCH');
      };

      // jsの壁を越えてクロス†ドメイン通信するための 異世界の"門"(ゲート) を広げる
      // ログインなしで動画を視聴出来る禁呪を発動させるための魔方陣であるが、現在は封印されている。
      // "フォース" の力によって封印を解いた者だけが異世界の"門"をうんたらかんたら
      //
      // やってることはiframeごしに外部サイト用動画プレイヤーのAPIを叩いてるだけ
      // 原理的には、http://〜のサイトならどこでもZenzaWatchを起動できる。
      var initializeCrossDomainGate = function() {
        initializeCrossDomainGate = _.noop;

        console.log('%c initialize videoInfoLoader', 'background: lightgreen;');

        loaderFrame = document.createElement('iframe');
        loaderFrame.name  = 'videoInfoLoaderLoader';
        loaderFrame.className = 'xDomainLoaderFrame thumb';
        document.body.appendChild(loaderFrame);

        loaderWindow = loaderFrame.contentWindow;

        windowMessageEmitter.on('onMessage', onMessage);
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
          
          var playlist = JSON.parse($dom.find('#playlistDataContainer').text());
          var isPlayable = isMp4 && !isSwf && (videoUrl.indexOf('http') === 0);

          var result = {
            watchApiData: watchApiData,
            flvInfo: flvInfo,
            playlist: playlist,
            isPlayable: isPlayable,
            isMp4: isMp4,
            isFlv: isFlv,
            isSwf: isSwf,
            isEco: isEco,
            thumbnail: thumbnail,
            csrfToken: watchApiData.flashvars.csrfToken
          };
          ZenzaWatch.emitter.emitAsync('csrfTokenUpdate', watchApiData.flashvars.csrfToken);
          return result;

        } catch (e) {
          window.console.error('error: parseWatchApiData ', e);
          return null;
        }
      };

      var loadFromWatchApiData = function(watchId) {
        var url = '/watch/' + watchId;
        console.log('%cloadFromWatchApiData...', 'background: lightgreen;', watchId, url);

        var isFallback = false;
        var onLoad = function(req) {
          var data = parseWatchApiData(req);
          ZenzaWatch.debug.watchApiData = data;

          if (!data) {
            PopupMessage.alert('動画情報の取得に失敗(watchApi)');
            return;
          }

          if (data.isFlv && !isFallback) {
            isFallback = true;

            url = url + '?eco=1';
            console.log('%cエコノミーにフォールバック(flv)', 'background: cyan; color: red;', url);
            window.setTimeout(function() {
              $.ajax({
                url: url,
                xhrFields: { withCredentials: true }
              }).then(
                onLoad,
                function() { PopupMessage.alert('動画情報の取得に失敗(watchApi)'); }
              );
            }, 1000);
          } else if (!data.isPlayable) {
            PopupMessage.alert('この動画は再生できません');
          } else if (data.isMp4) {
            videoInfoLoader.emitAsync('load', data, 'WATCH_API', watchId);
            ZenzaWatch.emitter.emitAsync('loadVideoInfo', data, 'WATCH_API', watchId); // 外部連携用
          } else {
            PopupMessage.alert('この動画は再生できません');
          }
        };

        $.ajax({
          url: url,
          xhrFields: { withCredentials: true }
        }).then(
          onLoad,
          function() { PopupMessage.alert('動画情報の取得に失敗(watchApi)'); }
        );
      };

      var load = function(watchId) {
        if (isLogin() && isSameOrigin()) {
          loadFromWatchApiData(watchId);
        } else {
          loadFromThumbWatch(watchId);
        }
      };

      _.assign(videoInfoLoader, {
        load: load
      });

      return videoInfoLoader;
    })();

    var MessageApiLoader = (function() {
      var VERSION_OLD = '20061206';
      var VERSION     = '20090904';

      var MessageApiLoader = function() {
        this.initialize.apply(this, arguments);
      };

      _.assign(MessageApiLoader.prototype, {
        initialize: function() {
        },
        /**
         * 動画の長さに応じて取得するコメント数を変える
         * 本家よりちょっと盛ってる
         */
        getRequestCountByDuration: function(duration) {
          if (duration < 60)  { return 150;}
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

          return new Promise(function(resolve, reject) {
            $.ajax({
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
                message: 'ThreadKeyの取得失敗 ' + threadId
              });
            });
          });
        },
        _createThreadXml: function(threadId, version, userId, threadKey, force184) {
          var thread = document.createElement('thread');
          thread.setAttribute('thread', threadId);
          thread.setAttribute('version', version);
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

          return thread;
        },
        _createThreadLeavesXml:
          function(threadId, version, userId, threadKey, force184, duration) {
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

          thread_leaves.innerText = threadLeavesParam;

          return thread_leaves;
        },

        buildPacket: function(threadId, duration, userId, threadKey, force184, optionalThreadId)
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

          if (duration < 60) {
            packet.appendChild(
              this._createThreadXml(threadId, VERSION_OLD, userId, threadKey, force184)
            );
          } else {
            packet.appendChild(
              this._createThreadXml(threadId, VERSION, userId, threadKey, force184)
            );
            packet.appendChild(
              this._createThreadLeavesXml(threadId, VERSION, userId, threadKey, force184, duration)
            );
          }

          span.appendChild(packet);
          var packetXml = span.innerHTML;

          return packetXml;
        },
        _post: function(server, xml) {
          // マイページのjQueryが古いためかおかしな挙動をするのでPromiseで囲う
          var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
          return new Promise(function(resolve, reject) {
            $.ajax({
              url: server,
              data: xml,
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
                message: 'コメントの取得失敗' + server
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
            $.ajax({
              url: url,
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
        _load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId) {
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
            var isNmsg = server.indexOf('nmsg.nicovideo.jp') >= 0;
            if (isNmsg) {
              console.log('load from nmsg.nicovideo.jp...');
              return this._get(server, threadId, duration);
            } else {
              // nmsg.nicovideo.jpもできればこっちでやりたい。 うまく取れないので調査中。
              packet = this.buildPacket(
                threadId,
                duration,
                userId
              );
              console.log('post xml...', server, packet);
              return this._post(server, packet, threadId);
            }
          }
        },
        load: function(server, threadId, duration, userId, isNeedKey, optionalThreadId) {

          var timeKey = 'loadComment server: ' + server + ' thread: ' + threadId;
          window.console.time(timeKey);
          var self = this;

          return new Promise(function(resolve, reject) {
            self._load(
              server,
              threadId,
              duration,
              userId,
              isNeedKey,
              optionalThreadId
            ).then(
              function(result) {
                window.console.timeEnd(timeKey);
                ZenzaWatch.debug.lastMessageServerResult = result;

                var resultCode = null;
                try {
                  var thread = result.documentElement.getElementsByTagName('thread')[0];
                  resultCode = thread.getAttribute('resultcode');
                } catch (e) {
                  console.error(e);
                }

                if (resultCode !== '0') {
                  window.console.log(result.xml);
                  reject({
                    message: 'コメント取得失敗' + resultCode
                  });
                  return;
                }

                resolve({
                  resultCode: parseInt(resultCode, 10),
                  xml: result.documentElement
                });
              },
              function(e) {
                window.console.timeEnd(timeKey);
                window.console.error('loadComment fail: ', e);
                reject({
                  message: 'コメント通信失敗'
                });
              }
            );
          });
        }
      });

      return MessageApiLoader;
    })();
    ZenzaWatch.api.MessageApiLoader = MessageApiLoader;

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
            typeof expireTime === 'number' ? (Date.now() + expireTime) : null;
          this._storage[key] = JSON.stringify({
            data: data,
            expiredAt: expiredAt
          });
        },
        getItem: function(key) {
          key = PREFIX + key;
          if (!this._storage.hasOwnProperty(key)) {
            return null;
          }
          var item = null;
          try {
            item = JSON.parse(this._storage[key]);
          } catch(e) {
            window.console.error(e);
            return null;
          }

          if (item.expiredAt === null || item.expiredAt > Date.now()) {
            return item.data;
          }
          return null;
        }
      });

      return CacheStorage;
    });

/*
    var MylistApiLoader = (function() {
      var CACHE_EXPIRE_TIME = 5 * 60 * 1000;
      var token = '';
      var cacheStorage = null;

      function MylistApiLoader() {
        this.initialize.apply(this, arguments);
      }

      ZenzaWatch.emitter.on('csrfTokenUpdate', function(t) {
        token = t;
      });

      _.assign(MylistApiLoader.prototype, {
        initialize: function() {
          if (!cacheStorage) {
            cacheStorage = new CacheStorage(localStorage);
          }
        },
        getDeflistItems: function() {
          var url = 'http://www.nicovideo.jp/api/deflist/list';
          var d = new $.Deferred();
          var cacheKey = 'deflistItems';
          var cacheData = cacheStorage.getItem(cacheKey);

          if (cacheData) {
            ZenzaWatch.util.callAsync(function() { return d.resolve(cacheData); });
            return d.promise();
          }

          $.ajax({
            url: url,
            cache: false,
            xhrFields: { withCredentials: true }
          }).then(function(result) {
            var data;
            try {
              data = JSON.parse(result.responseText);
            } catch (e) {
              window.console.error(e);
              window.console.error(result.responseText);
            }
            window.console.log(result, data);
            if (data.status !== 'ok' || !data.mylistitem) {
              return d.reject();
            }

            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            return d.resolve(data);
          }, function() {
            return d.reject();
          });

          return d.promise();
        },
        getMylistItems: function(groupId) {
          var url = 'http://' + host + '/api/mylist/list?group_id=' + groupId;
          var d = new $.Deferred();
          var cacheKey = 'mylistItems: ' + groupId;
          var cacheData = cacheStorage.getItem(cacheKey);

          if (cacheData) {
            ZenzaWatch.util.callAsync(function() { return d.resolve(cacheData); });
            return d.promise();
          }

          $.ajax({
            url: url,
            cache: false,
            xhrFields: { withCredentials: true }
          }).then(function(result) {
            var data;
            try {
              data = JSON.parse(result.responseText);
            } catch (e) {
              window.console.error(e);
              window.console.error(result.responseText);
            }
            window.console.log(result, data);
            if (data.status !== 'ok' || !data.mylistitem) {
              return d.reject();
            }

            cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
            d.resolve(data);
          });

          return d.promise();
        }
      });

      return MylistApiLoader;
    })();

    ZenzaWatch.api.MylistApiLoader = MylistApiLoader;
 */

//===END===

console.log(VideoInfoLoader);
