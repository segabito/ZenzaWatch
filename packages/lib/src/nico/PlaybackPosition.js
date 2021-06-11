import {netUtil} from '../infra/netUtil';

//===BEGIN===
const PlaybackPosition = {
  record: (watchId, playbackPosition, frontendId, frontendVersion) => {
    const url = 'https://nvapi.nicovideo.jp/v1/users/me/watch/history/playback-position';
    const body =
        `watchId=${watchId}&seconds=${playbackPosition}`;
    return netUtil.fetch(url, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Frontend-Id': frontendId,
        'X-Frontend-Version': frontendVersion,
        'X-Request-With': 'https://www.nicovideo.jp'
      },
      body
    });
  }
};

//===END===

export {PlaybackPosition};