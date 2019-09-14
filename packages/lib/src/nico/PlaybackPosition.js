import {netUtil} from '../infra/netUtil';

//===BEGIN===
const PlaybackPosition = {
  record: (watchId, playbackPosition, csrfToken) => {
    const url = 'https://flapi.nicovideo.jp/api/record_current_playback_position';
    const body =
      `watch_id=${watchId}&playback_position=${playbackPosition}&csrf_token=${csrfToken}`;
    return netUtil.fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
  }
};

//===END===

export {PlaybackPosition};