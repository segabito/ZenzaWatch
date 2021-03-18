import {CrossDomainGate} from '../infra/CrossDomainGate';

//===BEGIN===
const NicoVideoApi = (() => {
  let gate = null;
  const init = () => {
    if (gate) { return gate; }

    if (location.host === 'www.nicovideo.jp') {
      return gate = {};
    }
    class NVGate extends CrossDomainGate {
      _onCommand({command, status, params, value}, sessionId = null) {
        switch (command) {
          case 'configSync':
              this._config.props[params.key] = params.value;
            break;
          default:
            return super._onCommand({command, status, params, value}, sessionId);
        }
      }
    }

    return gate = new NVGate({
      baseUrl: 'https://www.nicovideo.jp/robots.txt',
      origin: 'https://www.nicovideo.jp/',
      type: 'nicovideoApi',
      suffix: location.href
    });
  };

  return {
    fetch(...args) { return init().fetch(...args); },
    configBridge(...args) { return init().configBridge(...args); },
    postMessage(...args) { return init().postMessage(...args); },
    sendMessage(...args) { return init().sendMessage(...args); },
    pushHistory(...args) { return init().pushHistory(...args); },
    bridgeDb(...args)    { return init().bridgeDb(...args); }
  };

})();
//===END===

export {NicoVideoApi};