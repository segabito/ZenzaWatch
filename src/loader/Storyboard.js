import * as $ from 'jquery';
import * as _ from 'lodash';
import {ZenzaWatch} from '../ZenzaWatchIndex';

const util = ZenzaWatch.util;
// const location = {
//   protocol: 'http:'
// };


//===BEGIN===

const SmileStoryboardInfoLoader = (function () {
  var reject = function (err) {
    return new Promise(function (res, rej) {
      window.setTimeout(function () {
        rej(err);
      }, 0);
    });
  };

  var parseStoryboard = function ($storyboard, url) {
    var storyboardId = $storyboard.attr('id') || '1';
    return {
      id: storyboardId,
      url: url.replace('sb=1', 'sb=' + storyboardId),
      thumbnail: {
        width: $storyboard.find('thumbnail_width').text(),
        height: $storyboard.find('thumbnail_height').text(),
        number: $storyboard.find('thumbnail_number').text(),
        interval: $storyboard.find('thumbnail_interval').text()
      },
      board: {
        rows: $storyboard.find('board_rows').text(),
        cols: $storyboard.find('board_cols').text(),
        number: $storyboard.find('board_number').text()
      }
    };
  };

  var parseXml = function (xml, url) {
    var $xml = $(xml), $storyboard = $xml.find('storyboard');

    if ($storyboard.length < 1) {
      return null;
    }

    var info = {
      format: 'smile',
      status: 'ok',
      message: '成功',
      url: url,
      movieId: $xml.find('movie').attr('id'),
      duration: $xml.find('duration').text(),
      storyboard: []
    };

    for (var i = 0, len = $storyboard.length; i < len; i++) {
      var sbInfo = parseStoryboard($($storyboard[i]), url);
      info.storyboard.push(sbInfo);
    }
    info.storyboard.sort(function (a, b) {
      var idA = parseInt(a.id.substr(1), 10), idB = parseInt(b.id.substr(1), 10);
      return (idA < idB) ? 1 : -1;
    });
    return info;
  };


  var load = function (videoFileUrl) {
    var a = document.createElement('a');
    a.href = videoFileUrl;
    var server = a.host;
    var search = a.search;

    if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
      return reject({status: 'fail', message: 'invalid url', url: videoFileUrl});
    }

    var fileType = RegExp.$1;
    var fileId = RegExp.$2;
    var key = RegExp.$3;

    if (fileType !== 'm') {
      return reject({status: 'fail', message: 'unknown file type', url: videoFileUrl});
    }

    return new Promise(function (resolve, reject) {
      var url = '//' + server + '/smile?m=' + fileId + '.' + key + '&sb=1';

      util.fetch(url, {credentials: 'include'})
        .then(res => {
          return res.text();
        })
        .then(result => {
          const info = parseXml(result, url);

          if (info) {
            resolve(info);
          } else {
            reject({
              status: 'fail',
              message: 'storyboard not exist (1)',
              result: result,
              url: url
            });
          }
        }).catch(err => {
        reject({
          status: 'fail',
          message: 'storyboard not exist (2)',
          result: err,
          url: url
        });
      });
    });
  };

  return {
    load
  };
})();
ZenzaWatch.api.SmileStoryboardInfoLoader = SmileStoryboardInfoLoader;

const DmcStoryboardInfoLoader = (() => {
  const parseStoryboard = function (sb) {
    const result = {
      id: 0,
      urls: [],
      quality: sb.quality,
      thumbnail: {
        width: sb.thumbnail_width,
        height: sb.thumbnail_height,
        number: null,
        interval: sb.interval
      },
      board: {
        rows: sb.rows,
        cols: sb.columns,
        number: sb.images.length
      }
    };
    sb.images.forEach(image => {
      result.urls.push(image.uri);
    });

    return result;
  };


  const parseMeta = function (meta) {
    const result = {
      format: 'dmc',
      status: meta.meta.message,
      url: null,
      movieId: null,
      storyboard: []
    };

    meta.data.storyboards.forEach(sb => {
      result.storyboard.unshift(parseStoryboard(sb));
    });

    // 画質の良い順にソート
    result.storyboard.sort((a, b) => {
      if (a.quality < b.quality) {
        return 1;
      }
      if (a.quality > b.quality) {
        return -1;
      }
      return 0;
    });

    return result;
  };


  const load = function (url) {
    return util.fetch(url, {credentials: 'include'})
      .then(res => {
        return res.json();
      })
      .then(info => {
        if (!info.meta || !info.meta.message || info.meta.message !== 'ok') {
          return Promise.reject('storyboard request fail');
        }
        return parseMeta(info);
      });
  };

  return {
    load,
    _parseMeta: parseMeta,
    _parseStoryboard: parseStoryboard
  };
})();
ZenzaWatch.api.DmcStoryboardInfoLoader = DmcStoryboardInfoLoader;

const StoryboardInfoLoader = (() => {
  return {
    load: function (url) {
      if (url.match(/dmc\.nico/)) {
        return DmcStoryboardInfoLoader.load(url);
      } else {
        return SmileStoryboardInfoLoader.load(url);
      }
    }
  };
})();
ZenzaWatch.api.StoryboardInfoLoader = StoryboardInfoLoader;

class StoryboardSession {
  constructor(info) {
    this._info = info;
    this._url = info.urls[0].url;
  }

  create() {
    const url = `${this._url}?_format=json`;
    const body = this._createRequestString(this._info);
    return util.fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body
    }).then(res => {
      return res.json();
    }).catch(err => {
      window.console.error('create dmc session fail', err);
      return Promise.reject('create dmc session fail');
    });
  }

  _createRequestString(info) {
    if (!info) {
      info = this._info;
    }

    // 階層が深くて目が疲れた
    const request = {
      session: {
        client_info: {
          player_id: info.player_id
        },
        content_auth: {
          auth_type: info.auth_types.storyboard,
          content_key_timeout: info.content_key_timeout,
          service_id: 'nicovideo',
          service_user_id: info.service_user_id
        },
        content_id: info.content_id,
        content_src_id_sets: [{
          content_src_ids: []
        }],
        content_type: 'video',
        content_uri: '',
        keep_method: {
          heartbeat: {
            lifetime: info.heartbeat_lifetime
          }
        },
        priority: info.priority,
        protocol: {
          name: 'http',
          parameters: {
            http_parameters: {
              parameters: {
                storyboard_download_parameters: {
                  use_well_known_port: info.urls[0].is_well_known_port ? 'yes' : 'no',
                  use_ssl: info.urls[0].is_ssl ? 'yes' : 'no'
                }
              }
            }
          }
        },
        recipe_id: info.recipe_id,
        session_operation_auth: {
          session_operation_auth_by_signature: {
            signature: info.signature,
            token: info.token
          }
        },
        timing_constraint: 'unlimited'
      }
    };

    (info.videos || []).forEach(video => {
      request.session.content_src_id_sets[0].content_src_ids.push(video);
    });

    //window.console.log('storyboard session request', JSON.stringify(request, null, ' '));
    return JSON.stringify(request);
  }
}

//===END===
//
export {
  SmileStoryboardInfoLoader,
  DmcStoryboardInfoLoader,
  StoryboardInfoLoader,
  StoryboardSession
};


