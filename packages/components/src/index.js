import { BaseCommandElement } from './element/BaseCommandElement';
import { VideoItemElement } from './element/VideoItemElement';
import { VideoSeriesLabel } from './element/VideoSeriesLabel';
import { NoWebComponent } from './element/NoWebComponent';
import { RangeBarElement }  from './element/RangeBarElement';
import { DialogElement }  from './element/DialogElement';
import { SettingPanelElement } from './element/SettingPanelElement';

//===BEGIN===
//@require ./element/BaseCommandElement.js
//@require ./element/VideoItemElement.js
//@require ./element/VideoSeriesLabel.js
//@require ./element/NoWebComponent.js
//@require ./element/RangeBarElement.js
//@require ./element/DialogElement.js
//@require ./element/SettingPanelElement.js

const components = (() => {
  if (self.customElements) {
    customElements.get('zenza-video-item') || customElements.define('zenza-video-item', VideoItemElement);
    customElements.get('zenza-dialog') || customElements.define('zenza-dialog', DialogElement);
    customElements.get('zenza-setting-panel') || customElements.define('zenza-setting-panel', SettingPanelElement);
  }

  return {
    BaseCommandElement,
    VideoItemElement,
    VideoSeriesLabel,
    RangeBarElement,
    DialogElement,
    SettingPanelElement
  };
})();


//===END===

export {components};
