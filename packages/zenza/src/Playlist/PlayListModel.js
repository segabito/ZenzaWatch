import {VideoListModel} from './VideoListModel';
//===BEGIN===
class PlayListModel extends VideoListModel {

  initialize(params) {
    super.initialize(params);
    this.maxItems = 10000;
    this.items = [];
    this.isUniq = true;

    // this._boundOnItemUpdate = this.onItemUpdate.bind(this);
  }
}

//===END===
export {PlayListModel};