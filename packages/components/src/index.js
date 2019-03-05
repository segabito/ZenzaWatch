import { BaseCommandElement } from './element/BaseCommandElement.js';
import { VideoItemElement } from './element/VideoItemElement.js';

//===BEGIN===
//@require ./element/BaseCommandElement.js
//@require ./element/VideoItemElement.js

const components = (() => {
  if (window.customElements) {
    window.customElements.define('zenza-video-item', VideoItemElement);
  }

  return {
    BaseCommandElement,
    VideoItemElement
  };
})();


//===END===

export {components};
