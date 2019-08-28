import {workerUtil} from './workerUtil';
//===BEGIN===

const StorageWriter = (() => {
  const func = function(self) {
    self.onmessage = ({command, params}) => {
      const {obj, replacer, space} = params;
      return JSON.stringify(obj, replacer || null, space || 0);
    };
  };

  let worker;
  const prototypePollution = window.Prototype && Array.prototype.hasOwnProperty('toJSON');

  const toJson = async (obj, replacer = null, space = 0) => {
    if (!prototypePollution || obj === null || ['string', 'number', 'boolean'].includes(typeof obj)) {
      return JSON.stringify(obj, replacer, space);
    }
    worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'ToJsonWorker'});
    return worker.post({command: 'toJson', params: {obj, replacer, space}});
  };

  const writer = Symbol('StorageWriter');
  const setItem = (storage, key, value) => {
    if (!prototypePollution || value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      storage.setItem(key, JSON.stringify(value));
    } else {
      toJson(value).then(json => storage.setItem(key, json));
    }
  };

  localStorage[writer] = (key, value) => setItem(localStorage, key, value);
  sessionStorage[writer] = (key, value) => setItem(sessionStorage, key, value);


  return { writer, toJson };
})();


//===END===

export {StorageWriter};