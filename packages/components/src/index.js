import { VideoItemElement } from './element/VideoItemElement';
import { VideoSeriesLabel } from './element/VideoSeriesLabel';
import { RangeBarElement }  from './element/RangeBarElement';
import { SettingPanelElement }  from './element/SettingPanelElement';

//===BEGIN===
//@require element/BaseCommandElement.js
//@require VideoItemElement
//@require VideoSeriesLabel
//@require RangeBarElement
//@require element/DialogElement.js
//@require SettingPanelElement

const components = (() => {
  if (window.customElements) {
    customElements.get('zenza-video-item') || customElements.define('zenza-video-item', VideoItemElement);
  }

  return {
    VideoItemElement,
    VideoSeriesLabel,
    RangeBarElement,
    SettingPanelElement
  };
})();


//===END===

export {components};
