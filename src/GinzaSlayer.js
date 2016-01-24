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
    // なにかの実験場
    //
    //

    var ProxyExternalContent = function() { this._initialize.apply(this, arguments); };
    _.extend(ProxyExternalContent.prototype, AsyncEmitter.prototype);
    _.assign(ProxyExternalContent.prototype, {
      _initialize: function($originalContent, externalInterface) {
        this._$originalContent = $originalContent;
        var i, len;

        var JS2SWF = externalInterface.JS2SWF;

        var createJS2SWF = function(name) {
          return function() {
            window.console.log('%cJS -> SWF: ', 'background: lightgreen; ', name, arguments);
            return $originalContent[name].apply($originalContent, arguments.length > 0 ? arguments : []);
          };
        };

        for (i = 0, len = JS2SWF.length; i < len; i++) {
          var name = JS2SWF[i];
          //window.console.log('crete JS2SWF: %s', name);
          this[name] = createJS2SWF(name);
        }
      }
    });

    var ProxyConnector = function() { this._initialize.apply(this, arguments); };
    _.extend(ProxyConnector.prototype, AsyncEmitter.prototype);
    _.assign(ProxyConnector.prototype, {
      _initialize: function(originConnector, externalInterface) {
        this._originConnector = originConnector;
        var i, len;
        var SWF2JS = externalInterface.SWF2JS;

        var createSWF2JS = function(name) {
          return function() {
            window.console.log('%cSWF -> JS: ', 'background: cyan; ', name, arguments);
            //originConnector[name].apply(originConnector, arguments.length > 0 ? arguments : []);
          };
        };

        for (i = 0, len = SWF2JS.length; i < len; i++) {
          var name = SWF2JS[i];
          //window.console.log('crete SWF2JS: %s', name);
          this[name] = createSWF2JS(name);
        }

      },
      setStartupLogTimestamp: function() {
      }
    });


    var swf2js, js2swf;
    var replaceConnector = function(target, externalInterface) {
      var connectorInstance = target.getInstance();
      var $externalPlayer  = connectorInstance.getExternalNicoplayer();
      connectorInstance._externalNicoplayer_org = connectorInstance._externalContent;
      js2swf = connectorInstance._externalNicoplayer =
        new ProxyExternalContent($externalPlayer, externalInterface);

      connectorInstance.startJS_org = connectorInstance.startJS;
      connectorInstance.startJS = function(connector) {
        this._connector_org = connector;
        swf2js = new ProxyConnector(connector, externalInterface);
        this.startJS_org(swf2js);
      };
      swf2js = new ProxyConnector(null, externalInterface);
    };



    var initializeGinzaSlayer = function(dialog, watchId) {
      var target = window.PlayerApp.ns.player.Nicoplayer;
      var externalInterface = window.PlayerApp.ns.player.NicoplayerExternalInterface;
      replaceConnector(target, externalInterface);

      $('#external_nicoplayer').remove();

      dialog.on('canPlay', function() {
        swf2js.onVideoInitialized(true);
      });
      dialog.on('commentParsed', function() {
        swf2js.onCommentListInitialized(true);
        //swf2js.onCommentListUpdated(TODO: 変換して渡す);
      });
      dialog.on('ended', function() {
        swf2js.onVideoEnded(false);
      });

      js2swf.ext_getPlayheadTime = function() {
        return dialog.getCurrentTime();
      };
      js2swf.externalChangeVideo = function(videoInfo) {
        window.console.log('externalChangeVideo');
        dialog.open(videoInfo.v, {
          economy: Config.getValue('forceEconomy')
        });
      };
      js2swf.ext_getTotalTime = function() {
        return dialog._nicoVideoPlayer.getDuration();
      };

      dialog.open(watchId, {
        economy: Config.getValue('forceEconomy')
      });
      $('#nicoplayerContainer').append($('.zenzaVideoPlayerDialog').detach());
    };

    var initialize = function(dialog) {
      $('.notify_update_flash_player').remove();
      $('body').addClass('ginzaSlayer');


      var watchId = getWatchId();
      if (Config.getValue('enableGinzaSlayer')) {
        initializeGinzaSlayer(dialog, watchId);
      } else {
        dialog.open(watchId, {
          economy: Config.getValue('forceEconomy')
        });
        $('#external_nicoplayer').remove();
      }

    };

    return initialize;
  })();

//===END===

initializeGinzaSlayer();
