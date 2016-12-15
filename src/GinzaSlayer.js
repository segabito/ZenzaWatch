var $ = require('jquery');
var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var Config = {};
var AsyncEmitter = function() {};
var getWatchId = function() {};

//===BEGIN===
  var initializeGinzaSlayer =
  (function() {
    var initializeFlash = function(dialog) {
      $('.notify_update_flash_player').remove();
      $('body').addClass('ginzaSlayer');

      var watchId = getWatchId();
      dialog.open(watchId, {
        economy: Config.getValue('forceEconomy')
      });
      $('#external_nicoplayer').remove();

    };

    const initializeHtml5 = function(dialog) {
      document.body.classList.add('ginzaSlayer');
      const watchId = getWatchId();
      dialog.open(watchId, {});
    };


    return !!(document.getElementById('watchAPIDataContainer')) ? initializeFlash : initializeHtml5;
  })();

//===END===

initializeGinzaSlayer();
