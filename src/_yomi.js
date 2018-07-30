// ==UserScript==
// @name           Yomi
// @namespace      https://github.com/segabito/
// @description    niconico comic reader
// @match          *://seiga.nicovideo.jp/watch/*
// @grant          none
// @author         segabito
// @version        0.0.1
// ==/UserScript==


(function (window) {
  const PRODUCT = 'Yomi';
  const monkey = (PRODUCT) => {
    let console = window.console;
    let $ = window.jQuery;
    let html, render;

    //@version
    //@environment

    window.console.log(`%c${PRODUCT}@${ENV} v${VER}`, 'font-size: 200%;');

//@require baselib.js

//@require Config.js

    const Yomi = {
      version: VER,
      env: ENV,
      debug: {},
      api: {},
      init: {},
      lib: {
        $: $,
        _: _
      },
      external: {},
      util: {},
      modules: {Emitter, Handler},
      config: Config,
      emitter: new Emitter(),
      state: {}
    };

    if (location.host.match(/\.nicovideo\.jp$/)) {
      window.Yomi = Yomi;
    } else {
      window.Yomi = {};
    }
    const debug = Yomi.debug;
    const emitter = Yomi.emitter;
    const util = Yomi.util;
    const addStyle = function (styles, id) {
      let elm = document.createElement('style');
      elm.type = 'text/css';
      if (id) {
        elm.id = id;
      }

      let text = styles.toString();
      text = document.createTextNode(text);
      elm.appendChild(text);
      let head = document.getElementsByTagName('head');
      head = head[0];
      head.appendChild(elm);
      return elm;
    };
    addStyle(`
      .page.active ~ .page {
        /*visibility: hidden;*/
        opacity: 0;
      }
      .content_list .pages .image_container .page {
       /* overflow: visible !important;*/
      }

      .stream_comment {
        opacity: 0 !important;
        visibility: hidden !important;
        left: 0 !important;
        /*top: 0 !important;*/
        height: 24px !important;
        overflow: visible !important; 
        z-index: 1;
      }
      .stream_comment[data-shuriken] {
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      .page .hoge:nth-child(3) {
        border: 1px solid blue;
      }
      
    `);
//@require ShadowDancer/WatchDogs.js
//@require yomi/YomiPage.js
//@require yomi/Shuriken.js

  const initialize = () => {
    let m = new WeakMap();
    let o = new MutationObserver(records => {
      for (let record of records) {
        Array.from(record.addedNodes).forEach(n => {
          if (!n.classList || !n.classList.contains('stream_comment')) { return; }
          requestIdleCallback(() => {
            m.set(n, Date.now());
            const s = document.createElement('yomi-shuriken');
            s.attachLight(n);
          });
        });
        Array.from(record.removedNodes).forEach(n => {
          let past = Date.now() - m.get(n);
          let className = n.className;
        });
      }
    });
    ScrollWatchDog.watch(window, {prefix: 'window-scroll'});
    o.observe(document.querySelector('#page_contents'), {childList: true, subtree: true});
    Array.from(document.querySelectorAll('.content_list .page[data-page-index] .note')).forEach(elm => {
      ResizeWatchDog.watch(elm, {prefix: 'page', once: true});
      const shadow = document.createElement('yomi-page');
      shadow.attachLight(elm);
    });
  };


   return Promise.all([
     import('https://cdn.jsdelivr.net/npm/lit-html@0.9.0/lit-html.min.js')
   ]).then(([lit]) => {
     window.console.log('import ', lit);
     html = lit.html;
     render = lit.render;
     initialize();
   });

}; // end of monkey



if (window !== window.top) {
  return;
}

const loadGm = () => {
  let script = document.createElement('script');
  script.id = `${PRODUCT}Loader`;
  script.setAttribute('type', 'module');
  script.setAttribute('charset', 'UTF-8');
  script.appendChild(document.createTextNode(`(${monkey})('${PRODUCT}');`));
  document.body.appendChild(script);
};

loadGm();

})(window.unsafeWindow || window);
