import {nicoUtil} from '../../../lib/src/nico/nicoUtil';
import {PRODUCT} from '../../../../src/ZenzaWatchIndex';
const NicoVideoApi = {};

//===BEGIN===
/**
 *  pushStateを使ってブラウザバックの履歴に載せようと思ったけど、
 *  あらゆるページに寄生するシステムの都合上断念。
 *  とりあえず既読リンクの色が変わるようにだけする
 */
const WatchPageHistory = (() => {
  if (!window || !window.location) {
    return {
      initialize: () => {},
      pushHistory: () => {},
      pushHistoryAgency: () => {}
    };
  }

  let originalUrl = window && window.location && window.location.href;
  let originalTitle = window && window.document && window.document.title;
  let isOpen = false;
  let dialog, watchId, path, title;

  const restore = () => {
    history.replaceState(null, null, originalUrl);
    document.title = (isOpen ? '📺' : '') + originalTitle.replace(/^📺/, '');
    bouncedRestore.cancel();
  };
  const bouncedRestore = _.debounce(restore, 30000);

  const pushHistory = (path, title) => {
    if (nicoUtil.isGinzaWatchUrl(originalUrl)) {
      originalUrl = location.href;
      originalTitle = document.title;
    }
    history.replaceState(null, null, path);
    document.title = (isOpen ? '📺' : '') + title.replace(/^📺/, '');
    bouncedRestore();
  };

  const onVideoInfoLoad = _.debounce(({watchId, title, owner: {name}}) => {
    if (!watchId || !isOpen) {
      return;
    }
    title = `${title} by ${name} - ${PRODUCT}`;
    path = `/watch/${watchId}`;

    if (location.host === 'www.nicovideo.jp') {
      return pushHistory(path, title);
    }
    if (NicoVideoApi && NicoVideoApi.pushHistory) {
      return NicoVideoApi.pushHistory(path, title);
    }
  });

  const onDialogOpen = () => isOpen = true;

  const onDialogClose = () => {
    isOpen = false;
    watchId = title = path = null;
    history.replaceState(null, null, originalUrl);
    document.title = originalTitle;
  };

  const initialize = _dialog => {
    if (dialog) {
      return;
    }
    dialog = _dialog;

    if (location.host === 'www.nicovideo.jp') {
      dialog.on('close', onDialogClose);
    }
    dialog.on('open', onDialogOpen);
    dialog.on('loadVideoInfo', onVideoInfoLoad);

    if (location.host !== 'www.nicovideo.jp') { return; }
    window.addEventListener('beforeunload', restore, {passive: true});
    window.addEventListener('error', restore, {passive: true});
    window.addEventListener('unhandledrejection', restore, {passive: true});
  };
  // www.nicovideo.jp 以外で開いた時、
  // www.nicovideo.jp 配下のタブがあったら代わりに既読リンクの色を変える
  const pushHistoryAgency = async (path, title) => {
    if (!navigator || !navigator.locks) {
      pushHistory(path, title);
      bouncedRestore.cancel();
      await new Promise(r => setTimeout(r, 3000));
      return restore();
    }
    let lastTitle = document.title;
    let lastUrl = location.href;
    // どれかひとつのタブで動けばいい
    await navigator.locks.request('pushHistoryAgency', {ifAvailable: true}, async lock => {
      if (!lock) {
        return;
      }
      history.replaceState(null, title, path);
      await new Promise(r => setTimeout(r, 3000));
      history.replaceState(null, lastTitle, lastUrl);
      await new Promise(r => setTimeout(r, 10000));
    });
  };

  return {
    initialize,
    pushHistory,
    pushHistoryAgency
  };
})();
//===END===

export {WatchPageHistory};