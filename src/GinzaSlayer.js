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
    var initialize = function(dialog) {
      $('.notify_update_flash_player').remove();
      $('body').addClass('ginzaSlayer');

      var watchId = getWatchId();
      dialog.open(watchId, {
        economy: Config.getValue('forceEconomy')
      });
      $('#external_nicoplayer').remove();

    };

    return initialize;
  })();

//===END===

initializeGinzaSlayer();
