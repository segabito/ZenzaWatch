import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
import {uq} from '../packages/lib/src/uQuery';
//===BEGIN===
const initializeGinzaSlayer = (dialog, query) => {
  uq('.notify_update_flash_playerm, #external_nicoplayer').remove();
  const watchId = nicoUtil.getWatchId();
  const options = {};
  if (!isNaN(query.from)) {
    options.currentTime = parseFloat(query.from, 10);
  }

  const v = document.querySelector('#MainVideoPlayer video');
  v && v.pause();
  dialog.open(watchId, options);
};
//===END===

export {initializeGinzaSlayer};