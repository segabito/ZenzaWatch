import {Emitter} from '../../../lib/src/Emitter';
import {VideoListModel} from './VideoListModel';
import {VideoListView} from './VideoListView';
import {bounce} from '../../../lib/src/infra/bounce';
import {ThumbInfoLoader} from '../../../lib/src/nico/ThumbInfoLoader';

//===BEGIN===
class VideoList extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  initialize(params) {
    this._thumbInfoLoader = params.loader || ThumbInfoLoader;
    this._container = params.container;

    this.model = new VideoListModel({
      uniq: true,
      maxItem: 100
    });

    this._initializeView();
  }
  _initializeView() {
    if (this.view) {
      return;
    }
    this.view = new VideoListView({
      container: this._container,
      model: this.model,
      enablePocketWatch: true
    });

    this.view.on('command', this._onCommand.bind(this));
    this.view.on('deflistAdd', bounce.time(this._onDeflistAdd.bind(this), 300));
    this.view.on('playlistAppend', bounce.time(this._onPlaylistAppend.bind(this), 300));
  }
  update(listData, watchId) {
    if (!this.view) {
      this._initializeView();
    }
    this._watchId = watchId;
    this.model.setItemData(listData);
  }
  _onCommand(command, param) {
    if (command !== 'select') {
      return this.emit('command', command, param);
    }
    const item = this.model.findByItemId(param);
    const watchId = item.watchId;
    this.emit('command', 'open', watchId);
  }
  _onPlaylistAppend(watchId, itemId) {
    this.emit('command', 'playlistAppend', watchId);
    const item = this.model.findByItemId(itemId) || this.model.findByWatchId(watchId);
    item.isUpdating = true;
    window.setTimeout(() => item.isUpdating = false, 1000);
  }
  _onDeflistAdd(watchId, itemId) {
    this.emit('command', 'deflistAdd', watchId);
    const item = this.model.findByItemId(itemId);
    item.isUpdating = true;
    window.setTimeout(() => item.isUpdating = false, 1000);
  }
}

//===END===

export {VideoList};