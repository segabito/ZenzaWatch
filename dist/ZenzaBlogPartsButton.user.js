// ==UserScript==
// @name           ZenzaBlogPartsButton
// @namespace      https://github.com/segabito/
// @description    ニコニコ動画のブログパーツにZenzaWatch起動用ボタンを追加
// @match          *://ext.nicovideo.jp/thumb/*
// @grant          none
// @author         segabito macmoto
// @license        public domain
// @version        0.0.3
// ==/UserScript==
/* eslint-disable */


(window => {
  const addStyle = (styles, id) => {
    const elm = document.createElement('style');
    elm.type = 'text/css';
    if (id) { elm.id = id; }
    elm.append(styles);
    document.head.append(elm);
    return elm;
  };

  const postMessage = (type, message, token) => {
    const origin = document.referrer;
    const {command, watchId} = message;
    try {
          parent.postMessage(JSON.stringify({ // 互換のため冗長
          id: 'ZenzaWatch',
          type,
          token,
          body: {
            token,
            url: location.href,
            message: {command, watchId},
            command: 'message', params: {
              command, params: { watchId }
            }
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

  const blogPartsApi = () => {
    const [watchId] = location.href.split('/').reverse();

    const [,,parentHost] = document.referrer.split('/');
    if (!parentHost.endsWith('.nicovideo.jp')) {
      window.console.log('disable bridge');
      return;
    }

    addStyle(__css__);
    const button = document.createElement('button');
    button.innerHTML = '<span>Zen</span>';
    button.id = 'zenzaButton';
    document.body.append(button);
    button.onclick = e => {
      postMessage('blogParts', {
        command: e.shiftKey ? 'send' : 'open',
        watchId
      });
    };
  };

  blogPartsApi();
})(globalThis ? globalThis.window : window);
