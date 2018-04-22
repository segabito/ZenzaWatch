import jsdom from 'jsdom';
import * as $ from 'jquery';
// import {Emitter} from './baselib';

const html = `
<!doctype html><html><body>
</body></html>
`;
const config = {
  url: 'http://localhost.nicovideo.jp'
};


const browser = {};
const noop = () => {};


if (typeof window !== 'object') {
  let document = new jsdom.JSDOM(html, config);
  let window = document.defaultView || {};

  Object.assign(window, {
    navigator: {userAgent: 'Mozilla'},
    location: { href: config.url, host: 'http://localhost.nicovideo.jp', protocol: 'http:' },
    addEventListener: noop,
    removeEventListener: noop,
    console: console,
    jQuery: $.default,
    MylistPocket: {isReady: true},
    localStorage: {},
    sessionStorage: {},
    history: {}
  });
  window.top = window;

  browser.Node = jsdom.JSDOM;
  browser.NodeList = jsdom.JSDOM;
  browser.document = document;
  browser.window = window;
} else {
  browser.document = window.document;
  browser.window = window;
}


export {browser};