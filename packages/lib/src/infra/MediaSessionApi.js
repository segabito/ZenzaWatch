import {Emitter} from '../Emitter';


//===BEGIN===

const MediaSessionApi = (() => {
  const emitter = new Emitter();
  let init = false;

  const update = (
    {title, artist, album, artwork, duration} = {title: '', artist: '', album: '', artwork: [], duration: 1}) => {
    if (!('mediaSession' in navigator)) {
      return;
    }
    navigator.mediaSession.metadata = new self.MediaMetadata({
      title,
      artist,
      album,
      artwork
    });

    const nm = navigator.mediaSession;
    if ('setPositionState' in nm) {
      nm.setPositionState({duration});
    }
    if (init) {
      return;
    }
    init = true;
    nm.setActionHandler('play',          () => emitter.emit('command', 'play'));
    nm.setActionHandler('pause',         () => emitter.emit('command', 'pause'));
    nm.setActionHandler('seekbackward',  () => emitter.emit('command', 'seekBy', -5));
    nm.setActionHandler('seekforward',   () => emitter.emit('command', 'seekBy', +5));
    nm.setActionHandler('previoustrack', () => emitter.emit('command', 'playPreviousVideo'));
    nm.setActionHandler('nexttrack',     () => emitter.emit('command', 'playNextVideo'));
    nm.setActionHandler('stop',          () => emitter.emit('command', 'close'));
    nm.setActionHandler('seekto',        e => {
      emitter.emit('command', 'seekTo', e.seekTime);
    });
  };

  const updateByVideoInfo = videoInfo => {
    const title = videoInfo.title;
    const artist = videoInfo.owner.name;
    const album = '';
    const artwork = [{src: videoInfo.thumbnail, sizes: '130x100', type: 'image/jpg'}];
    if (videoInfo.betterThumbnail) {
      artwork.push({src: videoInfo.betterThumbnail, sizes: '320x270', type: 'image/jpg'});
    }
    if (videoInfo.largeThumbnail) {
      artwork.push({src: videoInfo.largeThumbnail, sizes: '1280x720', type: 'image/jpg'});
    }
    // self.console.info({title, artist, album, artwork});
    update({title, artist, album, artwork, duration: videoInfo.duration});
  };

  const updatePositionState = ({duration, playbackRate, currentTime}) => {
    const nm = navigator.mediaSession;
    if (!('setPositionState' in nm)) {
      return;
    }
    nm.setPositionState({duration, playbackRate, currentTime});
  };
  const updatePositionStateByMedia = media => {
    updatePositionState({
      duration: media.duration,
      playbackRate: media.playbackRate,
      currentTime: media.currentTime
    });
  };

  return {
    onCommand: callback => emitter.on('command', callback),
    update,
    updateByVideoInfo,
    updatePositionState,
    updatePositionStateByMedia
  };
})();

//===END===

export {MediaSessionApi};
