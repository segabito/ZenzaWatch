import {util} from '../../../../src/util';
import {VideoSessionWorker} from './VideoSessionWorker';
//===BEGIN===

const SmileStoryboardInfoLoader = (()=> {

  let parseStoryboard = ($storyboard, url) => {
    let id = $storyboard.attr('id') || '1';
    return {
      id,
      url: url.replace('sb=1', `sb=${id}`),
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

  let parseXml = (xml, url) => {
    let $xml = util.$.html(xml), $storyboard = $xml.find('storyboard');

    if ($storyboard.length < 1) {
      return null;
    }

    let info = {
      format: 'smile',
      status: 'ok',
      message: '成功',
      url,
      movieId: $xml.find('movie').attr('id'),
      duration: $xml.find('duration').text(),
      storyboard: []
    };

    for (let i = 0, len = $storyboard.length; i < len; i++) {
      let sbInfo = parseStoryboard(util.$($storyboard[i]), url);
      info.storyboard.push(sbInfo);
    }
    info.storyboard.sort((a, b) => {
      let idA = parseInt(a.id.substr(1), 10), idB = parseInt(b.id.substr(1), 10);
      return (idA < idB) ? 1 : -1;
    });
    return info;
  };


  let load = videoFileUrl => {
    let a = document.createElement('a');
    a.href = videoFileUrl;
    let server = a.host;
    let search = a.search;

    if (!/\?(.)=(\d+)\.(\d+)/.test(search)) {
      return Promise.reject({status: 'fail', message: 'invalid url', url: videoFileUrl});
    }

    let fileType = RegExp.$1;
    let fileId = RegExp.$2;
    let key = RegExp.$3;

    if (fileType !== 'm') {
      return Promise.reject({status: 'fail', message: 'unknown file type', url: videoFileUrl});
    }

    return new Promise((resolve, reject) => {
      let url = '//' + server + '/smile?m=' + fileId + '.' + key + '&sb=1';

      util.fetch(url, {credentials: 'include'})
        .then(res => res.text())
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

  return {load};
})();


const StoryboardInfoLoader = {
  load: videoInfo => {
    if (!videoInfo.hasDmcStoryboard) {
      const url = videoInfo.storyboardUrl;
      return url ?
        StoryboardInfoLoader.load(url) :
        Promise.reject('smile storyboard api not exist');
    }

    const watchId = videoInfo.watchId;
    const info = videoInfo.dmcStoryboardInfo;
    const duration = videoInfo.duration;
    return VideoSessionWorker.storyboard(watchId, info, duration);
  }
};


//===END===
//
export {
  SmileStoryboardInfoLoader,
  StoryboardInfoLoader,
};


