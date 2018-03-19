import * as $ from 'jquery';
import {util, AsyncEmitter} from './util';

const Config = ZenzaWatch.config;
const getWatchId = util.getWatchId;

//===BEGIN===
var initializeGinzaSlayer =
  (function () {
    var initializeFlash = function (dialog, query) {
      $('.notify_update_flash_player').remove();

      const watchId = getWatchId();
      const options = {};
      if (!isNaN(query.from)) {
        options.currentTime = parseFloat(query.from, 10);
      }

      dialog.open(watchId, options);
      $('#external_nicoplayer').remove();
    };

    const initializeHtml5 = function (dialog, query) {
      const watchId = getWatchId();
      const options = {};
      if (!isNaN(query.from)) {
        options.currentTime = parseFloat(query.from, 10);
      }

      const v = document.querySelector('#MainVideoPlayer video');
      if (v) {
        v.pause();
        //if (v.currentTime > 0) { options.currentTime = v.currentTime; }
      }
      dialog.open(watchId, options);
    };


    return !!(document.getElementById('watchAPIDataContainer')) ? initializeFlash : initializeHtml5;
  })();

//===END===

export {initializeGinzaSlayer};