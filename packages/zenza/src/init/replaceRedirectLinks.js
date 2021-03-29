import {uq} from '../../../lib/src/uQuery';
import {textUtil} from '../../../lib/src/text/textUtil';
import {cssUtil} from '../../../lib/src/css';
import {nicoUtil} from '../../../lib/src/nico/nicoUtil';

//===BEGIN===
const replaceRedirectLinks = async () => {
  await uq.ready();
  uq('a[href*="www.flog.jp/j.php/http://"]').forEach(a => {
    a.href = a.href.replace(/^.*https?:/, '');
  });

  uq('a[href*="rd.nicovideo.jp/cc/"]').forEach(a => {
    const href = a.href;
    const m = /cc_video_id=([a-z0-9+]+)/.exec(href);
    if (m) {
      const watchId = m[1];
      if (!watchId.startsWith('lv')) {
        a.href = `//www.nicovideo.jp/watch/${watchId}`;
      }
    }
  });


  // マイリストページの連続再生ボタン横に「シャッフル再生」を追加する
  if (window.Nico && window.Nico.onReady) {
    window.Nico.onReady(() => {
      let shuffleButton;
      const query = 'a[href*="continuous=1"]';
      const addShufflePlaylistLink = _.debounce(() => {
        if (shuffleButton) {
          return;
        }
        let $a = uq(query);
        if (!$a.length) {
          return false;
        }
        const a = $a[0];
        const search = (a.search || '').substr(1);
        const css = {
          'display': 'inline-block',
          'padding': '8px 6px'
        };
        const $shuffle = uq.html(a.outerHTML).text('シャッフル再生')
          .addClass('zenzaPlaylistShuffleStart')
          .attr('href', `//www.nicovideo.jp/watch/1470321133?${search}&shuffle=1`)
          .css(css);

        $a.css(css).after($shuffle);
        shuffleButton = $shuffle;
        return true;
      }, 100);
      addShufflePlaylistLink();
      const container = uq('#myContBody, #SYS_box_mylist_header')[0];
      if (!container) { return; }
      new MutationObserver(records => {
        for (const rec of records) {
          const changed = [].concat(Array.from(rec.addedNodes), Array.from(rec.removedNodes));
          if (changed.some(i => i.querySelector && i.querySelector(query))) {
            shuffleButton = null;
            addShufflePlaylistLink();
            return;
          }
        }
      }).observe(container, {childList: true});
    });
  }
  if (location.host === 'www.nicovideo.jp' && nicoUtil.getMypageVer() === 'spa') {
    await uq.ready(); // DOMContentLoaded
    let shuffleButton;
    const query = '.ContinuousPlayButton';
    const addShufflePlaylistLink = async () => {
      const lp = location.pathname;
      if (!lp.startsWith('/my/watchlater') && !lp.includes('/mylist')) {
        return;
      }
      if (shuffleButton && shuffleButton[0].parentNode && shuffleButton[0].parentNode.parentNode) {
        return;
      }
      const $a = uq(query);
      if (!$a.length) {
        return false;
      }
      if (!shuffleButton) {
        const $shuffle = uq.html($a[0].outerHTML).text('シャッフル再生')
          .addClass('zenzaPlaylistShuffleStart');
        shuffleButton = $shuffle;
      }
      const mylistId = lp.replace(/^.*\//, '');
      const playlistType = mylistId ? 'mylist' : 'deflist';
      shuffleButton.attr('href', $a[0].href + '&shuffle=1');

      $a.before(shuffleButton);
      return true;
    };
    setInterval(addShufflePlaylistLink, 1000);
  }

  if (location.host === 'www.nicovideo.jp' &&
    (location.pathname.indexOf('/search/') === 0 || location.pathname.indexOf('/tag/') === 0)) {
    let $autoPlay = uq('.autoPlay');
    let $target = $autoPlay.find('a');
    let search = (location.search || '').substr(1);
    let href = $target.attr('href') + '&' + search;
    $target.attr('href', href);
    let $shuffle = $autoPlay.clone();
    let a = $target[0];
    $shuffle.find('a').attr('href', href + '&shuffle=1').text('シャッフル再生');
    $autoPlay.after($shuffle);

    // ニコニ広告枠のリンクを置き換える
    window.setTimeout(() => {
      uq('.nicoadVideoItem').forEach(item => {
        const pointLink = item.querySelector('.count .value a');
        if (!pointLink) {
          return;
        }

        // 動画idはここから取るしかなさそう
        const {pathname} = textUtil.parseUrl(pointLink);
        const videoId = pathname.replace(/^.*\//, '');
        uq(item)
          .find('a[data-link]').attr('href', `//www.nicovideo.jp/watch/${videoId}`);
      });
    }, 3000);
  }

  if (location.host === 'ch.nicovideo.jp') {
    uq('#sec_current a.item').closest('li').forEach(li => {
      let $li = uq(li), $img = $li.find('img');
      let thumbnail = $img.attr('src') || $img.attr('data-original') || '';
      let $a = $li.find('a');
      let m = /smile\?i=([0-9]+)/.exec(thumbnail);
      if (m) {
        $a[0].href = `//www.nicovideo.jp/watch/so${m[1]}`;
      }
    });
    uq('.playerNavContainer .video img').forEach(img => {
      let video = img.closest('.video');
      if (!video) {
        return;
      }
      let thumbnail = img.src || img.dataset.original || '';
      let m = /smile\?i=([0-9]+)/.exec(thumbnail);
      if (m) {
        let $a =
        uq('<a class="more zen" rel="noopener" target="_blank">watch</a>')
            .css('right', cssUtil.px(128))
            .attr('href', `//www.nicovideo.jp/watch/so${m[1]}`);

        uq(video).find('.more').after($a);
      }
    });
  }
};
//===END===

export {replaceRedirectLinks};