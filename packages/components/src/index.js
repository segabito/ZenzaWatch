import { BaseCommandElement } from './element/BaseCommandElement';
import { VideoItemElement } from './element/VideoItemElement';
import { VideoSeriesLabel } from './element/VideoSeriesLabel';
import { RangeBarElement }  from './element/RangeBarElement';

//===BEGIN===
//@require ./element/BaseCommandElement.js
//@require ./element/VideoItemElement.js
//@require ./element/VideoSeriesLabel.js
//@require ./element/NoWebComponent.js
//@require ./element/RangeBarElement.js

const components = (() => {
  if (window.customElements) {
    customElements.get('zenza-video-item') || customElements.define('zenza-video-item', VideoItemElement);
  }

  return {
    BaseCommandElement,
    VideoItemElement,
    VideoSeriesLabel,
    RangeBarElement
  };
})();


//===END===

export {components};
