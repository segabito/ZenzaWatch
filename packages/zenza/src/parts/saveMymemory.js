import {ZenzaWatch} from '../../../../src/ZenzaWatchIndex';

//===BEGIN===
const saveMymemory = (player, videoInfo) => {
  const info = (`
    <div>
      <h2>${videoInfo.title}</h2>
      <a href="//www.nicovideo.jp/watch/${videoInfo.watchId}?from=${Math.floor(player.currentTime)}">元動画</a><br>
      作成環境: ${navigator.userAgent}<br>
      作成日: ${(new Date()).toLocaleString()}<br>
      ZenzaWatch: ver${ZenzaWatch.version} (${ZenzaWatch.env})<br>

      <button
        onclick="document.body.classList.toggle('debug');return false;">
        デバッグON/OFF
      </button>
    </div>
  `).trim();
    const title = `${videoInfo.watchId} - ${videoInfo.title}`; // titleはエスケープされてる
    const html = player.getMymemory()
      .replace(/<title>(.*?)<\/title>/, `<title>${title}</title>`)
      .replace(/(<body.*?>)/, '$1' + info);

  const blob = new Blob([html], {'type': 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    download: `${title}.html`,
    href: url,
    rel: 'noopener'
  });
  document.body.append(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
};
//===END===

export {saveMymemory};