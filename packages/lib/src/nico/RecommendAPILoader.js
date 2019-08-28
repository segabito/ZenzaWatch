import {netUtil} from '../infra/netUtil';
import {textUtil} from '../text/textUtil';

//===BEGIN===
const RecommendAPILoader = (() => {

  const load = ({videoId, recipe}) => {
    recipe = recipe || {id: 'video_playlist_common', videoId};
    recipe = textUtil.encodeBase64(JSON.stringify(recipe));
    const url = `https://nvapi.nicovideo.jp/v1/recommend?recipe=${encodeURIComponent(recipe)}&site=nicovideo&_frontendId=6&_frontendVersion=0`;
    return netUtil
      .fetch(url, {credentials: 'include'})
      .then(res => res.json())
      .then(res => {
        if (!res.meta || res.meta.status !== 200) {
          window.console.warn('load recommend fail', res);
          throw new Error('load recommend fail');
        }
        return res.data;
      });
  };

  return {
    load,
    loadSeries: (seriesId, options = {}) => {
      const recipe = {
        id: 'video_watch_playlist_series',
        seriesId,
        frontendId: 6,
        seriesTitle: options.title || `series/${seriesId}`
      };
      return load({recipe});
    }
  };
})();

//===END===

export {RecommendAPILoader};