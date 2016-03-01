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
      var cacheStorage = new CacheStorage(localStorage);

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
              $.ajax({
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

        $.ajax({
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
        if (isLogin() && isSameOrigin()) {
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
      var BASE_URL = 'http://ext.nicovideo.jp/'; // thumb_watch';
      var MESSAGE_ORIGIN = 'http://ext.nicovideo.jp/';
      var loaderFrame, loaderWindow;
      var emitter = new AsyncEmitter();
      var cacheStorage;
      var sessions = {};
      var isInitialized = false;
      var isInitializing = false;

      var onMessage = function(data, type) {
        if (type !== 'thumbInfoApi') { return; }
        window.console.log('thumbInfoApi.onMessage', data, type);
        var info      = data.message;
        var sessionId = info.sessionId;
        var status    = info.status;
        var session   = sessions[sessionId];

        //window.console.log('status:', status);
        if (status === 'initialized') {
          isInitialized = true;
          isInitializing = false;
          sessions.initial.resolve();
          emitter.emit('initialize', {status: 'ok'});
        }
        if (!session) {
          return;
        }

        if (status === 'ok') {
          session.resolve(parseXml(info.body));
        } else {
          session.reject({
            message: status
          });
        }

      };
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
        var duration = (function() {
          var tmp = val('length').split(':');
          return parseInt(tmp[0], 10) * 60 + parseInt(tmp[1], 10);
        })();
        var watchId = val('watch_url').split('/').reverse()[0];
        var postedAt = (new Date(val('first_retrieve'))).toLocaleString();
        var tags = (function() {
          var result = [];
          var t = xml.getElementsByTagName('tag');
          t.forEach(function(tag) {
            result.push(tag.innerHTML);
          });
          return result;
        });

        var result = {
          v:     watchId,
          id:    val('video_id'),
          title: val('title'),
          description: val('description'),
          thumbnail: val('thumbnail_url'),
          movieType: val('movie_type'),
          lastResBody: val('last_res_body'),
          duration: duration,
          postedAt: postedAt,
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

      // クロスドメインの壁を越えるゲートを開く
      var initializeCrossDomainGate = function() {

        initializeCrossDomainGate = _.noop;
        WindowMessageEmitter.on('onMessage', onMessage);

        console.log('%c initialize videoInfoLoader', 'background: lightgreen;');

        loaderFrame = document.createElement('iframe');
        loaderFrame.name = 'thumbInfoLoader';
        loaderFrame.src  = BASE_URL;
        loaderFrame.className = 'xDomainLoaderFrame thumbInfo';
        document.body.appendChild(loaderFrame);

        loaderWindow = loaderFrame.contentWindow;

      };

      var initialize = function() {
        if (isInitialized) {
          return new Promise(function(resolve) {
            ZenzaWatch.util.callAsync(function() {
              resolve();
            });
          });
        }

        if (isInitializing) {
          return new Promise(function(resolve, reject) {
            emitter.on('initialize', function(e) {
              if (e.status === 'ok') { resolve(); } else { reject(e); }
            });
          });
        }

        isInitializing = true;
        var initialPromise = new Promise(function(resolve, reject) {
          sessions.initial = {
            promise: initialPromise,
            resolve: resolve,
            reject: reject
          };
          window.setTimeout(function() {
            if (!isInitialized) {
              var rej = {
                status: 'fail',
                message: '初期化タイムアウト(getThumbInfo)'
              };
              reject(rej);
              emitter.emit('initialize', rej);
            }
          }, 60 * 1000);
          initializeCrossDomainGate(resolve, reject);

        });
        return initialPromise;
      };

      var load = function(watchId) {
        if (!cacheStorage) {
          cacheStorage = new CacheStorage(sessionStorage);
        }

        return new Promise(function(resolve, reject) {
          var cache = cacheStorage.getItem('thumbInfo_' + watchId);
          if (cache) {
            window.console.log('cache exist');
            ZenzaWatch.util.callAsync(function() { resolve(cache); });
            return;
          }

          var sessionId = watchId + '_' + Math.random();

          sessions[sessionId] = {
            resolve: resolve,
            reject: reject
          };

          initialize().then(function() {
            window.console.log('thumbInfoApiWindow initialized');
            try {
              var url = BASE_URL + 'api/getthumbinfo/' + watchId;
              loaderWindow.postMessage(JSON.stringify({
                sessionId: sessionId,
                url: url
              }),
              MESSAGE_ORIGIN);
            } catch (e) {
              console.log('%cException!', 'background: red;', e);
              delete sessions[sessionId];
              ZenzaWatch.util.callAsync(function() { reject({messge: 'postMessage fail'}); });
              return Promise.reject({
                status: 'fail',
                message: 'メッセージ送信失敗(getThumbInfo)'
              });
            }
          });
        });
      };

      _.assign(emitter, {
        load: load
      });

      return emitter;
    })();
    ZenzaWatch.api.ThumbInfoLoader = ThumbInfoLoader;
// ZenzaWatch.api.ThumbInfoLoader.load('sm9').then(function() {console.log(true, arguments); }, function() { console.log(false, arguments)});

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
            $.ajax({
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
            $.ajax({
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
            $.ajax({
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

          return new Promise(function(resolve, reject) {
            self._load(
              server,
              threadId,
              duration,
              userId,
              isNeedKey,
              optionalThreadId,
              userKey
            ).then(
              function(result) {
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
              },
              function(e) {
                window.console.timeEnd(timeKey);
                window.console.error('loadComment fail: ', e);
                reject({
                  message: 'コメントサーバーの通信失敗: ' + server
                });
              }
            );
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
      var CACHE_EXPIRE_TIME = Config.getValue('debug') ? 10000 : 5 * 60 * 1000;
      var TOKEN_EXPIRE_TIME = 59 * 60 * 1000;
//      var LONG_EXPIRE_TIME  = 90 * 24 * 60 * 60 * 1000;
      var token = '';
      var cacheStorage = null;

      var ajax = ZenzaWatch.util.ajax;

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
            cacheStorage = new CacheStorage(localStorage);
          }
          if (!token) {
            token = cacheStorage.getItem('csrfToken');
            if (token) { console.log('cached token exists', token); }
          }
        },
        getDeflistItems: function() {
          var url = 'http://www.nicovideo.jp/api/deflist/list';
          var cacheKey = 'deflistItems';

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); }, this);
              return;
            }

            ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || !result.mylistitem) {
                reject({
                  result: result,
                  message: 'とりあえずマイリストの取得失敗(1)'
                });
                return;
              }

              var data = result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              resolve(data);
            }, function(err) {
              reject({
                result: err,
                message: 'とりあえずマイリストの取得失敗(2)'
              });
            });
          });
        },
        getMylistItems: function(groupId) {
          var url = 'http://www.nicovideo.jp/api/mylist/list?group_id=' + groupId;
          var cacheKey = 'mylistItems: ' + groupId;

          return new Promise(function(resolve, reject) {

            var cacheData = cacheStorage.getItem(cacheKey);
            if (cacheData) {
              console.log('cache exists: ', cacheKey, cacheData);
              ZenzaWatch.util.callAsync(function() { resolve(cacheData); }, this);
              return;
            }

            return ajax({
              url: url,
              timeout: 60000,
              cache: false,
              dataType: 'json',
              xhrFields: { withCredentials: true }
            }).then(function(result) {
              if (result.status !== 'ok' || !result.mylistitem) {
                return reject({
                  result: result,
                  message: 'マイリストの取得失敗(1)'
                });
              }

              var data = result.mylistitem;
              cacheStorage.setItem(cacheKey, data, CACHE_EXPIRE_TIME);
              return resolve(data);
            }, function(err) {
              this.reject({
                result: err,
                message: 'マイリストの取得失敗(2)'
              });
            });
          });
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
              var item = items[i], wid = item.item_data.watch_id;
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


//===END===

/*
<nicovideo_thumb_response status="ok">
<thumb>
<video_id>so28281724</video_id>
<title>この素晴らしい世界に祝福を！　第6話「このろくでもない戦いに決着を！」</title>
<description>
「なぜ城に来ないのだ、この人でなしどもがああっ！」魔王軍の幹部、デュラハンが再び大激怒で街に現れた。大きくて硬いモノでないと我慢できない体になってしまったというめぐみんは、あの事件の後も毎日せっせとデュラハンの居城に爆裂魔法を撃ち込んでいたというのだ。おまけに共犯者の駄女神からも小バカにされ、デュラハンの怒りゲージは怒髪天に。とうとう戦闘に突入するが、相手は腐っても魔王軍幹部のひとり。その力は想像以上に圧倒的で……。「愚かな駆け出し冒険者どもよ、魔王軍に刃向かった報いと知れ！」。八方塞がり、絶体絶命の大ピンチに!!コミック版がニコニコ静画ですぐ読める！動画一覧はこちら第5話 watch/1455593126
</description>
<thumbnail_url>http://tn-skr1.smilevideo.jp/smile?i=28281724</thumbnail_url>
<first_retrieve>2016-02-27T12:00:00+09:00</first_retrieve>
<length>23:40</length>
<movie_type>mp4</movie_type>
<size_high>147764562</size_high>
<size_low>46961882</size_low>
<view_counter>403878</view_counter>
<comment_num>0</comment_num>
<mylist_counter>2599</mylist_counter>
<last_res_body/>
<watch_url>http://www.nicovideo.jp/watch/so28281724</watch_url>
<thumb_type>video</thumb_type>
<embeddable>1</embeddable>
<no_live_play>0</no_live_play>
<tags domain="jp">
<tag category="1" lock="1">アニメ</tag>
<tag lock="1">この素晴らしい世界に祝福を！</tag>
<tag>【タグ編集はできません】</tag>
</tags>
</thumb>
</nicovideo_thumb_response>



<nicovideo_thumb_response status="ok">
<thumb>
<size_high>21138631</size_high>
<size_low>17436492</size_low>

</thumb>
</nicovideo_thumb_response>
_videoDetail: Object
area: "jp"
can_translate: false
category: null
channelId: null
commons_tree_exists: true
communityId: null
description: "様"
dicArticleURL: "http://dic.nicovideo.jp/v/sm28211015"
for_bgm: false
has_owner_thread: null
height: 360
highest_rank: null
id: "sm28211015"
isDeleted: false
isMonetized: false
isMymemory: false
isR18: false
is_adult: null
is_nicowari: null
is_official: false
is_public: true
is_thread_owner: false
is_translated: false
is_uneditable_tag: false
is_video_owner: null
language: "ja-jp"
mainCommunityId: null
main_genre: null
no_ichiba: false
tagList: Array[5]
thread_id: "1455355346"
video_translation_info: false
width: 640
yesterday_rank: null
__proto__: Object
 * */
 console.log(VideoInfoLoader);
