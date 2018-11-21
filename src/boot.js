import GateAPI from 'loader/GateAPI';


//===BEGIN===

const boot = ((monkey, PRODUCT, START_PAGE_QUERY) => {
  if (window.ZenzaWatch) {
    return;
  }
  let document = window.document;
  let host = window.location.host || '';
  let href = (location.href || '').replace(/#.*$/, '');
  let prot = location.protocol;
  if (href === prot + '//www.nicovideo.jp/favicon.ico' &&
    window.name.startsWith('nicovideoApiLoader')) {
    GateAPI.nicovideo();
  } else if (host.match(/^smile-.*?\.nicovideo\.jp$/)) {
    GateAPI.smile();
  } else if (host === 'api.search.nicovideo.jp' && window.name.startsWith('searchApiLoader')) {
    GateAPI.search();
  } else if (host === 'ext.nicovideo.jp' && window.name.startsWith('thumbInfoLoader')) {
    GateAPI.thumbInfo();
  } else if (host === 'ext.nicovideo.jp' && window.name.startsWith('videoInfoLoader')) {
    GateAPI.exApi();
  } else if (window === window.top) {

    let loadLodash = function () {
      if (window._) {
        return Promise.resolve();
      }
      console.info('load lodash from cdn...');

      return new Promise((resolve, reject) => {
        let script = document.createElement('script');
        script.id = 'lodashLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js';
        document.head.append(script);
        let count = 0;

        let tm = setInterval(() => {
          count++;

          if (window._) {
            clearInterval(tm);
            resolve();
            return;
          }

          if (count >= 100) {
            clearInterval(tm);
            console.error('load lodash timeout');
            reject();
          }

        }, 300);
      });
    };

    let loadGm = function () {
      let script = document.createElement('script');
      script.id = 'ZenzaWatchLoader';
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('charset', 'UTF-8');
      script.appendChild(
        document.createTextNode(`(${monkey})('${PRODUCT}', '${encodeURIComponent(START_PAGE_QUERY)}');`));
      document.head.append(script);
    };

    const MIN_JQ = 10000600000;
    let getJQVer = function () {
      if (!window.jQuery) {
        return 0;
      }
      let ver = [];
      let t = window.jQuery.fn.jquery.split('.');
      while (t.length < 3) {
        t.push(0);
      }
      t.forEach((v) => {
        ver.push((v * 1 + 100000).toString().substr(1));
      });
      return ver.join('') * 1;
    };

    let loadJq = function () {
      console.log('JQVer: ', getJQVer());
      console.info('load jQuery from cdn...');

      return new Promise((resolve, reject) => {
        let $j = window.jQuery || null;
        let $$ = window.$ || null;
        let script = document.createElement('script');
        script.id = 'jQueryLoader';
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('charset', 'UTF-8');
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
        document.head.append(script);
        let count = 0;

        let tm = setInterval(() => {
          count++;

          if (getJQVer() >= MIN_JQ) {
            clearInterval(tm);
            window.ZenzaJQuery = window.jQuery;
            if ($j) {
              window.jQuery = $j;
            }
            if ($$) {
              window.$ = $$;
            }
            resolve();
            return;
          }

          if (count >= 100) {
            clearInterval(tm);
            console.error('load jQuery timeout');
            reject();
          }

        }, 300);
      });
    };

    loadLodash().then(() => {
      if (getJQVer() >= MIN_JQ) {
        loadGm();
      } else {
        loadJq().then(loadGm);
      }
    });
  }

});


//===END===


export {boot};
