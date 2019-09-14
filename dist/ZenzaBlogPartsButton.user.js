// ==UserScript==
// @name           ZenzaBlogPartsButton
// @namespace      https://github.com/segabito/
// @description    ニコニコ動画のブログパーツにZenzaWatch起動用ボタンを追加
// @match          *://ext.nicovideo.jp/thumb/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.0.2
// ==/UserScript==


(function() {
  const addStyle = function(styles, id) {
    const elm = document.createElement('style');
    //window.setTimeout(function() {
      elm.type = 'text/css';
      if (id) { elm.id = id; }

      var text = styles.toString();
      text = document.createTextNode(text);
      elm.appendChild(text);
      var head = document.getElementsByTagName('head');
      head = head[0];
      head.appendChild(elm);
    //}, 0);
    return elm;
  };

  const postMessage = function(type, message, token) {
    const origin = document.referrer;
    try {
      parent.postMessage(JSON.stringify({
          id: 'ZenzaWatch',
          type: type, // '',
          body: {
            token: token,
            url: location.href,
            message: message
          }
        }),
        origin);
    } catch (e) {
      alert(e);
      console.log('err', e);
    }
  };

  const __css__ = (`
    #zenzaButton {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 10000;
      line-height: 24px;
      padding: 4px 4px;
      cursor: pointer;
      font-weight: bolder;
      display: none;
    }
    body:hover #zenzaButton {
      display: inline-block;
    }
  `).trim();

  const blogPartsApi = function() {
    const watchId = location.href.split('/').reverse()[0];

    const parentHost = document.referrer.split('/')[2];
    if (!parentHost.match(/^[a-z0-9]*\.nicovideo\.jp$/)) {
      window.console.log('disable bridge');
      return;
    }

    addStyle(__css__);
    const button = document.createElement('button');
    button.innerHTML = '<span>Zen</span>';
    button.id = 'zenzaButton';
    document.body.appendChild(button);
    button.onclick = (e) => {
      postMessage('blogParts', {
        command: e.shiftKey ? 'send' : 'open',
        watchId: watchId
      });
    };
  };

  blogPartsApi();
})();
