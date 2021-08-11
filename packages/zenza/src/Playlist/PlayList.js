import {VideoListItem} from './VideoListItem';
import {VideoListModel} from './VideoListModel';
import {VideoListItemView} from './VideoListItemView';
import {PlayListModel} from './PlayListModel';
import {VideoList} from './VideoList';
import {RelatedVideoList} from './RelatedVideoList';
import {NicoSearchApiV2Loader} from '../../../lib/src/nico/VideoSearch';
import {PlayListSession} from './PlayListSession';
import {VideoListView} from './VideoListView';
import {PlayListView} from './PlayListView';

import {textUtil} from '../../../lib/src/text/textUtil';
import {PlaylistApiLoader} from '../../../lib/src/nico/PlaylistApiLoader';
import {MylistApiLoader} from '../../../lib/src/nico/MylistApiLoader';
//===BEGIN===
//@require VideoListItem
//@require VideoListModel
//@require VideoListItemView
//@require PlayListModel
//@require VideoList
//@require RelatedVideoList
//@require PlayListSession
//@require VideoListView
//@require PlayListView

class PlayList extends VideoList {
  initialize(params) {
    this._thumbInfoLoader = params.loader || global.api.ThumbInfoLoader;
    this._container = params.container;

    this._index = -1;
    this._isEnable = false;
    this._isLoop = params.loop;

    this.model = new PlayListModel({});

    global.debug.playlist = this;
    this.on('update', _.debounce(() => PlayListSession.save(this.serialize()), 3000));
    global.emitter.on('tabChange', tab => {
      if (tab === 'playlist') {
        this.scrollToActiveItem();
      }
    });
  }
  serialize() {
    return {
      items: this.model.serialize(),
      index: this._index,
      enable: this._isEnable,
      loop: this._isLoop
    };
  }
  unserialize(data) {
    if (!data) {
      return;
    }
    this._initializeView();
    console.log('unserialize: ', data);
    this.model.unserialize(data.items);
    this._isEnable = data.enable;
    this._isLoop = data.loop;
    this.emit('update');
    this.setIndex(data.index);
  }
  restoreFromSession() {
    this.unserialize(PlayListSession.restore());
  }
  _initializeView() {
    if (this.view) {
      return;
    }
    this.view = new PlayListView({
      container: this._container,
      model: this.model,
      playlist: this
    });
    this.view.on('command', this._onCommand.bind(this));
    this.view.on('deflistAdd', this._onDeflistAdd.bind(this));
    this.view.on('moveItem', this._onMoveItem.bind(this));
  }
  _onCommand(command, param, itemId) {
    let item;
    switch (command) {
      case 'toggleEnable':
        this.toggleEnable();
        break;
      case 'toggleLoop':
        this.toggleLoop();
        break;
      case 'shuffle':
        this.shuffle();
        break;
      case 'reverse':
        this.model.reverse();
        break;
      case 'sortBy': {
        let [key, order] = param.split(':');
        this.sortBy(key, order === 'desc');
        break;
      }
      case 'clear':
        this._setItemData([]);
        break;
      case 'select':
        item = this.model.findByItemId(itemId);
        this.setIndex(this.model.indexOf(item));
        this.emit('command', 'openNow', item.watchId);
        break;
      case 'playlistRemove':
        item = this.model.findByItemId(itemId);
        this.model.removeItem(item);
        this._refreshIndex();
        this.emit('update');
        break;
      case 'removePlayedItem':
        this.removePlayedItem();
        break;
      case 'resetPlayedItemFlag':
        this.model.resetPlayedItemFlag();
        break;
      case 'removeNonActiveItem':
        this.removeNonActiveItem();
        break;
      case 'exportFile':
        this._onExportFileCommand();
        break;
      case 'importFile':
        this._onImportFileCommand(param);
        break;
      case 'scrollToActiveItem':
        this.scrollToActiveItem(true);
        break;
      default:
        this.emit('command', command, param);
    }
  }
  _onExportFileCommand() {
    const dt = new Date();
    const title = prompt('プレイリストを保存\nプレイヤーにドロップすると復元されます',
      textUtil.dateToString(dt) + 'のプレイリスト');
    if (!title) {
      return;
    }

    const data = JSON.stringify(this.serialize(), null, 2);

    const blob = new Blob([data], {'type': 'text/html'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    Object.assign(a, {
      download: title + '.playlist.json',
      rel: 'noopener',
      href: url
    });
    document.body.append(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }
  _onImportFileCommand(fileData) {
    if (!textUtil.isValidJson(fileData)) {
      return;
    }

    this.emit('command', 'pause');
    this.emit('command', 'notify', 'プレイリストを復元');
    this.unserialize(JSON.parse(fileData));

    window.setTimeout(() => {
      const index = Math.max(0, fileData.index || 0);
      const item = this.model.getItemByIndex(index);
      if (item) {
        this.setIndex(index, true);
        this.emit('command', 'openNow', item.watchId);
      }
    }, 2000);
  }
  _onMoveItem(fromItemId, toItemId) {
    const fromItem = this.model.findByItemId(fromItemId);
    const toItem = this.model.findByItemId(toItemId);
    if (!fromItem || !toItem) {
      return;
    }
    // const destIndex = this._model.indexOf(destItem);
    // this._model.removeItem(srcItem);
    // this._model.insertItem(srcItem, destIndex);
    this.model.moveItemTo(fromItem, toItem);
    this._refreshIndex();
  }
  _setItemData(listData) {
    const items = listData.map(itemData => new VideoListItem(itemData));
    this.model.setItem(items);
    this.setIndex(items.length > 0 ? 0 : -1);
  }
  _replaceAll(videoListItems, options) {
    options = options || {};
    this.model.setItem(videoListItems);
    const item = this.model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._activeItem = item;
      setTimeout(() => this.view.scrollToItem(item), 1000);
    }
    this.setIndex(this.model.indexOf(item));
  }
  _appendAll(videoListItems, options) {
    options = options || {};
    this.model.appendItem(videoListItems);
    const item = this.model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._refreshIndex(false);
    }
    setTimeout(() => this.view.scrollToItem(videoListItems[0]), 1000);
  }
  _insertAll(videoListItems, options) {
    options = options || {};

    this.model.insertItem(
      videoListItems,
      this.getIndex() + 1);
    const item = this.model.findByWatchId(options.watchId);
    if (item) {
      item.isActive = true;
      item.isPlayed = true;
      this._refreshIndex(false);
    }
    setTimeout(() => this.view.scrollToItem(videoListItems[0]), 1000);
  }
  replaceItems(videoListItemsRawData, options) {
    const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
    return this._replaceAll(items, options);
  }
  appendItems(videoListItemsRawData, options) {
    const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
    return this._appendAll(items, options);
  }
  insertItems(videoListItemsRawData, options) {
    const items = videoListItemsRawData.map(raw => new VideoListItem(raw));
    return this._insertAll(items, options);
  }
  load(playlist, options, msgInfo) {
    this._initializeView();

    if (!this._playlistApiLoader) {
      this._playlistApiLoader = PlaylistApiLoader;
    }
    const timeKey = `loadPlaylist: ${playlist.type} ${playlist.id || playlist.options.tag || playlist.options.keyword}`;
    window.console.time(timeKey);

    return this._playlistApiLoader
      .load(playlist, msgInfo).then(items => {
        window.console.timeEnd(timeKey);
        if (options.ownerId) {
          items = items.filter(item => item.content.owner.id == options.ownerId);
        }
        let videoListItems = items.map(item => VideoListItem.createByMylistItem(item));

        if (videoListItems.length < 1) {
          return Promise.reject({
            status: 'fail',
            message: 'プレイリストの取得に失敗しました'
          });
        }

        if (options.shuffle) {
          videoListItems = _.shuffle(videoListItems);
        } else if (playlist.type === 'user-uploaded' && playlist.options == null || options.playlistSort) {
          videoListItems.reverse();
        }

        if (options.insert) {
          this._insertAll(videoListItems, options);
        } else if (options.append) {
          this._appendAll(videoListItems, options);
        } else {
          this._replaceAll(videoListItems, options);
        }

        this.emit('update');
        return Promise.resolve({
          status: 'ok',
          message:
            options.append ?
              'プレイリストに追加しました' :
              'プレイリストに読み込みしました'
        });
      });
  }
  loadSearchVideo(word, options, limit = 300) {
    this._initializeView();

    if (!this._searchApiLoader) {
      this._nicoSearchApiLoader = NicoSearchApiV2Loader;
    }

    window.console.time('loadSearchVideos' + word);
    options = options || {};

    return this._nicoSearchApiLoader
      .searchMore(word, options, limit).then(result => {
        window.console.timeEnd('loadSearchVideos' + word);
        const items = result.list || [];
        let videoListItems = items
          .filter(item => {
            return (item.item_data &&
              parseInt(item.item_data.deleted, 10) === 0) ||
              (item.thumbnail_url || '').indexOf('video_deleted') < 0;
          }).map(item => VideoListItem.createByMylistItem(item));

        if (videoListItems.length < 1) {
          return Promise.reject({});
        }

        if (options.playlistSort) {
          // 連続再生のために結果を古い順に並べる
          // 検索対象のソート順とは別
          videoListItems = _.sortBy(
            videoListItems, item =>  item.postedAt + item.sortTitle);
        }

        if (options.shuffle) {
          videoListItems = _.shuffle(videoListItems);
        }

        if (options.insert) {
          this._insertAll(videoListItems, options);
        } else if (options.append) {
          this._appendAll(videoListItems, options);
        } else {
          this._replaceAll(videoListItems, options);
        }

        this.emit('update');
        return Promise.resolve({
          status: 'ok',
          message:
            options.append ?
              '検索結果をプレイリストに追加しました' :
              '検索結果をプレイリストに読み込みしました'
        });
      });
  }
  insert(watchId) {
    this._initializeView();
    if (this._activeItem && this._activeItem.watchId === watchId) {
      return Promise.resolve();
    }

    const model = this.model;
    const index = this._index;
    return this._thumbInfoLoader.load(watchId).then(info => {
      // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
      // チャンネル動画はsoXXXXに統一したいのでvideoIdを使う. バッドノウハウ
      info.id = info.isChannel ? info.id : watchId;
      const item = VideoListItem.createByThumbInfo(info);
      model.insertItem(item, index + 1);
      this._refreshIndex(true);

      this.emit('update');

      this.emit('command', 'notifyHtml',
        `次に再生: <img src="${item.thumbnail}" style="width: 96px;">${textUtil.escapeToZenkaku(item.title)}`
      );
    }).catch(result => {
      const item = VideoListItem.createBlankInfo(watchId);
      model.insertItem(item, index + 1);
      this._refreshIndex(true);

      this.emit('update');

      window.console.error(result);
      this.emit('command', 'alert', `動画情報の取得に失敗: ${watchId}`);
    });
  }
  insertCurrentVideo(videoInfo) {
    this._initializeView();

    if (this._activeItem &&
      !this._activeItem.isBlankData &&
      this._activeItem.watchId === videoInfo.watchId) {
      this._activeItem.updateByVideoInfo(videoInfo);
      this._activeItem.isPlayed = true;
      this.scrollToActiveItem();
      return;
    }

    let currentItem = this.model.findByWatchId(videoInfo.watchId);
    if (currentItem && !currentItem.isBlankData) {
      currentItem.updateByVideoInfo(videoInfo);
      currentItem.isPlayed = true;
      this.setIndex(this.model.indexOf(currentItem));
      this.scrollToActiveItem();
      return;
    }

    const item = VideoListItem.createByVideoInfoModel(videoInfo);
    item.isPlayed = true;
    if (this._activeItem) {
      this._activeItem.isActive = false;
    }
    this.model.insertItem(item, this._index + 1);
    this._activeItem = this.model.findByItemId(item.itemId);
    this._refreshIndex(true);
  }
  removeItemByWatchId(watchId) {
    const item = this.model.findByWatchId(watchId);
    if (!item || item.isActive) {
      return;
    }
    this.model.removeItem(item);
    this._refreshIndex(true);
  }
  append(watchId) {
    this._initializeView();
    if (this._activeItem && this._activeItem.watchId === watchId) {
      return Promise.resolve();
    }

    const model = this.model;
    return this._thumbInfoLoader.load(watchId).then(info => {
      // APIにwatchIdを指定してもvideoIdが返るので上書きする. バッドノウハウ
      info.id = watchId;
      const item = VideoListItem.createByThumbInfo(info);
      //window.console.info(item, info);
      model.appendItem(item);
      this._refreshIndex();
      this.emit('update');
      this.emit('command', 'notifyHtml',
        `リストの末尾に追加: <img src="${item.thumbnail}" style="width: 96px;">${textUtil.escapeToZenkaku(item.title)}`
      );
    }).catch(result => {
      const item = VideoListItem.createBlankInfo(watchId);
      model.appendItem(item);
      this._refreshIndex(true);
      this._refreshIndex();

      window.console.error(result);
      this.emit('command', 'alert', '動画情報の取得に失敗: ' + watchId);
    });
  }
  getIndex() {
    return this._activeItem ? this._index : -1;
  }
  setIndex(v, force) {
    v = parseInt(v, 10);
    if (this._index !== v || force) {
      this._index = v;
      if (this._activeItem) {
        this._activeItem.isActive = false;
      }
      this._activeItem = this.model.getItemByIndex(v);
      if (this._activeItem) {
        this._activeItem.isActive = true;
      }
      this.emit('update');
    }
  }
  _refreshIndex(scrollToActive) {
    this.setIndex(this.model.indexOf(this._activeItem), true);
    if (scrollToActive) {
      setTimeout(() => this.scrollToActiveItem(true), 1000);
    }
  }
  _setIndexByItemId(itemId) {
    const item = this.model.findByItemId(itemId);
    if (item) {
      this._setIndexByItem(item);
    }
  }
  _setIndexByItem(item) {
    const index = this.model.indexOf(item);
    if (index >= 0) {
      this.setIndex(index);
    }
  }
  toggleEnable(v) {
    if (!_.isBoolean(v)) {
      this._isEnable = !this._isEnable;
      this.emit('update');
      return;
    }

    if (this._isEnable !== v) {
      this._isEnable = v;
      this.emit('update');
    }
  }
  toggleLoop() {
    this._isLoop = !this._isLoop;
    this.emit('update');
  }
  shuffle() {
    this.model.shuffle();
    if (this._activeItem) {
      this.model.removeItem(this._activeItem);
      this.model.insertItem(this._activeItem, 0);
      this.setIndex(0);
    } else {
      this.setIndex(-1);
    }
    this.view.scrollTop(0);
  }
  sortBy(key, isDesc) {
    this.model.sortBy(key, isDesc);
    this._refreshIndex(true);
    setTimeout(() => {
      this.view.scrollToItem(this._activeItem);
    }, 1000);
  }
  removePlayedItem() {
    this.model.removePlayedItem();
    this._refreshIndex(true);
    setTimeout(() => this.view.scrollToItem(this._activeItem), 1000);
  }
  removeNonActiveItem() {
    this.model.removeNonActiveItem();
    this._refreshIndex(true);
    this.toggleEnable(false);
  }
  selectNext() {
    if (!this.hasNext) {
      return null;
    }
    const index = this.getIndex();
    const len = this.length;
    if (len < 1) {
      return null;
    }

    if (index < -1) {
      this.setIndex(0);
    } else if (index + 1 < len) {
      this.setIndex(index + 1);
    } else if (this.isLoop) {
      this.setIndex((index + 1) % len);
    }
    return this._activeItem ? this._activeItem.watchId : null;
  }
  selectPrevious() {
    const index = this.getIndex();
    const len = this.length;
    if (len < 1) {
      return null;
    }

    if (index < -1) {
      this.setIndex(0);
    } else if (index > 0) {
      this.setIndex(index - 1);
    } else if (this.isLoop) {
      this.setIndex((index + len - 1) % len);
    } else {
      return null;
    }

    return this._activeItem ? this._activeItem.watchId : null;
  }
  scrollToActiveItem(force) {
    if (this._activeItem && (force || !this.view.hasFocus)) {
      this.view.scrollToItem(this._activeItem, force);
    }
  }
  scrollToWatchId(watchId) {
    const item = this.model.findByWatchId(watchId);
    if (item) {
      this.view.scrollToItem(item);
    }
  }
  findByWatchId(watchId) {
    return this.model.findByWatchId(watchId);
  }

  get isEnable() {
    return this._isEnable;
  }
  get isLoop() {
    return this._isLoop;
  }

  get length() {
    return this.model.length;
  }

  get hasNext() {
    const len = this.length;
    return len > 0 && (this.isLoop || this._index < len - 1);
  }
}
//===END===

export {
  PlayList,
  PlayListSession,
  VideoListItem,
  VideoListModel,
  VideoListItemView,
  VideoListView,
  PlayListView,
  PlayListModel,
  VideoList,
  RelatedVideoList
};