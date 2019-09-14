import jsdom from 'jsdom';
// import {ZenzaWatch} from '../src/ZenzaWatchIndex';
// import {Config, util, AsyncEmitter, PopupMessage, WindowMessageEmitter} from '../src/util';


const html = `
<!doctype html><html><body>
</body></html>
`;
const config = {
  url: 'http://localhost.nicovideo.jp'
};


console.log('*** run setup...\n\n\n');


// if (typeof window !== 'object') {
  let document = new jsdom.JSDOM(html, config);

  global.document = document;
  global.window = document.defaultView;
  global.HTMLElement = () => {};
  global.location = {
    protocol: 'http:'
  };
  global.ZenzaWatch = {
    api: {}
  };
  global.AsyncEmitter = {
    on: () => {}
  };
  // global.Config = Config;
  // global.ZenzaWatch = ZenzaWatch;
  // global.AsyncEmitter = AsyncEmitter;
// }

