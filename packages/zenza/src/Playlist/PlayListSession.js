//===BEGIN===
const PlayListSession = (storage => {
  const KEY = 'ZenzaWatchPlaylist';
  let lastJson = '';

  return {
    isExist() {
      const data = storage.getItem(KEY);
      if (!data) {
        return false;
      }
      try {
        JSON.parse(data);
        return true;
      } catch (e) {
        return false;
      }
    },
    save(data) {
      const json = JSON.stringify(data);
      if (lastJson === json) { return; }
      lastJson = json;
      try {
        storage.setItem(KEY, json);
      } catch(e) {
        window.console.error(e);
        if (e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          storage.clear();
          storage.setItem(KEY, json);
        }
      }
    },
    restore() {
      const data = storage.getItem(KEY);
      if (!data) {
        return null;
      }
      try {
        lastJson = data;
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
  };
})(sessionStorage);
const PlaylistSession = PlayListSession;


//===END===

export {PlayListSession};