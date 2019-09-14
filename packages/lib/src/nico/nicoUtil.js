import {textUtil} from '../text/textUtil';

//===BEGIN===

const nicoUtil = {
  parseWatchQuery: query => {
    try {
      const result = textUtil.parseQuery(query);
      const playlist = JSON.parse(textUtil.decodeBase64(result.playlist));
      if (playlist.searchQuery) {
        const sq = playlist.searchQuery;
        if (sq.type === 'tag') {
          result.playlist_type = 'tag';
          result.tag = sq.query;
        } else {
          result.playlist_type = 'search';
          result.keyword = sq.query;
        }
        let [order, sort] = (sq.sort || '+f').split('');
        result.order = order === '-' ? 'a' : 'd';
        result.sort = sort;
        if (sq.fRange) { result.f_range = sq.fRange; }
        if (sq.lRange) { result.l_range = sq.lRange; }
      } else if (playlist.mylistId) {
        result.playlist_type = 'mylist';
        result.group_id = playlist.mylistId;
        result.order =
          document.querySelector('select[name="sort"]') ?
            document.querySelector('select[name="sort"]').value : '1';
      } else if (playlist.id && playlist.id.includes('temporary_mylist')) {
        result.playlist_type = 'deflist';
        result.group_id = 'deflist';
        result.order =
          document.querySelector('select[name="sort"]') ?
            document.querySelector('select[name="sort"]').value : '1';
      }

      return result;
    } catch(e) {
      return {};
    }
  },
  hasLargeThumbnail: videoId => {
    // 大サムネが存在する最初の動画ID。 ソースはちゆ12歳
    // ※この数字以降でもごく稀に例外はある。
    const threthold = 16371888;
    const cid = videoId.substr(0, 2);
    const fid = videoId.substr(2) * 1;
    if (cid === 'nm') { return false; }
    if (cid !== 'sm' && fid < 35000000) { return false; }

    if (fid < threthold) {
      return false;
    }

    return true;
  },
  getThumbnailUrlByVideoId: videoId => {
    const videoIdReg = /^[a-z]{2}\d+$/;
    if (!videoIdReg.test(videoId)) {
      return null;
    }
    const fileId = parseInt(videoId.substr(2), 10);
    const large = nicoUtil.hasLargeThumbnail(videoId) ? '.L' : '';
    return fileId >= 35374758 ? // このIDから先は新サーバー(おそらく)
      `https://nicovideo.cdn.nimg.jp/thumbnails/${fileId}/${fileId}.L` :
      `https://tn.smilevideo.jp/smile?i=${fileId}.${large}`;
  },
  getWatchId: url => {
    let m;
    if (url && url.indexOf('nico.ms') >= 0) {
      m = /\/\/nico\.ms\/([a-z0-9]+)/.exec(url);
     } else {
      m = /\/?watch\/([a-z0-9]+)/.exec(url || location.pathname);
    }
    return m ? m[1] : null;
  },
  isPremium: () => {
    const h = document.getElementById('siteHeaderNotification');
    return h && h.classList.contains('siteHeaderPremium');
  },
  isLogin: () => document.getElementsByClassName('siteHeaderLogin').length < 1,
  getPageLanguage: () => {
    try {
      let h = document.getElementsByClassName('html')[0];
      return h.lang || 'ja-JP';
    } catch (e) {
      return 'ja-JP';
    }
  },
  openMylistWindow: watchId => {
    window.open(
      `//www.nicovideo.jp/mylist_add/video/${watchId}`,
      'nicomylistadd',
      'width=500, height=400, menubar=no, scrollbars=no');
  },
  openTweetWindow: ({watchId, duration, isChannel, title, videoId}) => {
    const nicomsUrl = `https://nico.ms/${watchId}`;
    const watchUrl = `https://www.nicovideo.jp/watch/${watchId}`;

    title = `${title}(${textUtil.secToTime(duration)})`.replace(/@/g, '@ ');
    const nicoch = isChannel ? ',+nicoch' : '';
    const url =
      'https://twitter.com/intent/tweet?' +
      'url=' + encodeURIComponent(nicomsUrl) +
      '&text=' + encodeURIComponent(title) +
      '&hashtags=' + encodeURIComponent(videoId + nicoch) +
      '&original_referer=' + encodeURIComponent(watchUrl) +
      '';
    window.open(url, '_blank', 'width=550, height=480, left=100, top50, personalbar=0, toolbar=0, scrollbars=1, sizable=1', 0);
  },
  isGinzaWatchUrl: url => /^https?:\/\/www\.nicovideo\.jp\/watch\//.test(url || location.href),
  getPlayerVer: () => {
    if (document.getElementById('js-initial-watch-data')) {
      return 'html5';
    }
    if (document.getElementById('watchAPIDataContainer')) {
      return 'flash';
    }
    return 'unknown';
  },
  isZenzaPlayableVideo: () => {
    try {
      // HTML5版プレイヤーなら再生できるはず
      if (nicoUtil.getPlayerVer() === 'html5') {
        return true;
      }
      const watchApiData = JSON.parse(document.querySelector('#watchAPIDataContainer').textContent);
      const flvInfo = textUtil.parseQuery(
        decodeURIComponent(watchApiData.flashvars.flvInfo)
      );
      const dmcInfo = JSON.parse(
        decodeURIComponent(watchApiData.flashvars.dmcInfo || '{}')
      );
      const videoUrl = flvInfo.url ? flvInfo.url : '';
      const isDmc = dmcInfo && dmcInfo.time;
      if (isDmc) {
        return true;
      }
      const isSwf = /\/smile\?s=/.test(videoUrl);
      const isRtmp = (videoUrl.indexOf('rtmp') === 0);
      return (isSwf || isRtmp) ? false : true;
    } catch (e) {
      return false;
    }
  },
  getNicoHistory: window.decodeURIComponent(document.cookie.replace(/^.*(nicohistory[^;+]).*?/, ''))
};

//===END===

export {nicoUtil};