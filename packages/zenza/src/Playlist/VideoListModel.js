import {Emitter} from '../../../lib/src/Emitter';
import {bounce, throttle} from '../../../lib/src/infra/bounce';
import {VideoListItem} from './VideoListItem';
//===BEGIN===
class VideoListModel extends Emitter {
  constructor(params) {
    super();
    this.watchIds = new Map();
    this.itemIds = new Map();
    this.uset = new Set();
    this.initialize(params);
    this.onUpdate = throttle.raf(this.onUpdate.bind(this));
  }

  initialize(params) {
    this.isUniq = params.uniq;
    this.items = [];
    this.maxItems = params.maxItems || 100;
  }

  setItemData(itemData) {
    itemData = Array.isArray(itemData) ? itemData : [itemData];
    const items = itemData.filter(itemData => itemData.has_data)
      .map(itemData => new VideoListItem(itemData));
    this.setItem(items);
  }

  setItem(items = []) {
    items = (Array.isArray(items) ? items : [items]);
    if (this.isUniq) {
      const uset = new Set(), iset = new Set();
      items = items.filter(item => {
        const has = uset.has(item.uniqId) || iset.has(item.itemId);
        uset.add(item.uniqId);
        iset.add(item.itemId);
        return !has;
      });
    }

    this.items = items;
    this._refreshMaps();
    this.onUpdate();
  }

  _refreshMaps() {
    this.uset.clear();
    this.watchIds.clear();
    this.itemIds.clear();
    this.items.forEach(item => {
      this.watchIds.set(item.watchId, item);
      this.itemIds.set(item.itemId, item);
      this.uset.add(item.uniqId);
      item.groupList = this;
    });
  }

  includes(item) {
    return this.uset.has(item.uniqId) || this.watchIds.has(item.watchId) || this.itemIds.has(item.itemId);
  }

  clear() {
    this.setItem([]);
  }

  insertItem(items, index) {
    //window.console.log('insertItem', itemList, index);
    items = Array.isArray(items) ? items : [items];
    if (this.isUniq) {
      items = items.filter(item => !this.includes(item));
    }
    if (!items.length) {
      return;
    }

    index = Math.min(this.items.length, (_.isNumber(index) ? index : 0));

    Array.prototype.splice.apply(this.items, [index, 0].concat(items));

    this.items.splice(this.maxItems);
    this._refreshMaps();
    this.onUpdate();

    return this.indexOf(items[0]);
  }

  appendItem(items) {
    items = Array.isArray(items) ? items : [items];
    if (this.isUniq) {
      items = items.filter(item => !this.includes(item));
    }
    if (!items.length) {
      return;
    }

    this.items = this.items.concat(items);

    while (this.items.length > this.maxItems) {
      this.items.shift();
    }

    this._refreshMaps();
    this.onUpdate();

    return this.items.length - 1;
  }

  moveItemTo(fromItem, toItem) {
    fromItem.isUpdating = true;
    toItem.isUpdating = true;
    // console.nicoru('before moveItemTo',
    //   {fromItem, index:this.indexOf(fromItem)},
    //   {toItem, index: this.indexOf(toItem)}
    // );
    const destIndex = this.indexOf(toItem);
    this.items = this.items.filter(item => item !== fromItem);
    this._refreshMaps();
    this.insertItem(fromItem, destIndex);
    // console.nicoru('after moveItemTo',
    //   {fromItem, index:this.indexOf(fromItem)},
    //   {toItem, index: this.indexOf(toItem)}
    // );
    this.resetUiFlags([fromItem, toItem]);
  }

  resetUiFlags(items) {
    items = items || this.items;
    items = Array.isArray(items) ? items : [items];
    for (const item of items) {
      item.isDragging = false;
      item.isDragover = false;
      item.isDropped = false;
      item.isUpdating = false;
    }
  }

  removeByFilter(filterFunc) {
    const befores = [...this.items];
    const afters = this.items.filter(filterFunc);
    if (befores.length === afters.length) {
      return false;
    }
    for (const item of befores) {
      !afters.includes(item) && (item.groupList = null);
    }
    this.items = afters;
    this._refreshMaps();
    this.onUpdate();
    return true;
  }

  removePlayedItem() {
    this.removeByFilter(item => item.isActive || !item.isPlayed);
  }

  removeNonActiveItem() {
    this.removeByFilter(item => item.isActive);
  }

  resetPlayedItemFlag() {
    this.items.forEach(item => item.isPlayed = false);
    this.onUpdate();
  }

  shuffle() {
    this.items = _.shuffle(this.items);
    this.onUpdate();
  }

  indexOf(item) {
    if (!item || !item.itemId) { return -1; }
    return this.items.findIndex(i => i.itemId === item.itemId);
  }

  getItemByIndex(index) {
    return this.items[index] || null;
  }

  findByItemId(itemId) {
    itemId = parseInt(itemId, 10);
    return this.itemIds.get(itemId);
  }

  findByWatchId(watchId) {
    watchId = watchId.toString();
    return this.watchIds.get(watchId);
  }

  removeItem(...items) {
    this.removeByFilter(item => !items.includes(item));
  }

  onItemUpdate(item) {
    // this.emit('item-update', item);
    this.onUpdate();
  }

  serialize() {
    return this.items.map(item => item.serialize());
  }

  unserialize(itemDataList) {
    const items = itemDataList.map(itemData => new VideoListItem(itemData));
    this.setItem(items);
  }

  sortBy(key, isDesc) {
    const table = {
      watchId: 'watchId',
      duration: 'duration',
      title: 'sortTitle',
      comment: 'commentCount',
      mylist: 'mylistCount',
      view: 'viewCount',
      postedAt: 'postedAt',
    };
    const prop = table[key];
    if (!prop) {
      return;
    }
    this.items = _.sortBy(this.items, item => item[prop]);
    if (isDesc) {
      this.items.reverse();
    }
    this.onUpdate();
  }

  reverse() {
    this.items.reverse();
    this.onUpdate();
  }

  onUpdate() {
    this.emitAsync('update', this.items);
  }

  get length() {
    return this.items.length;
  }

  get activeIndex() {
    return this.items.findIndex(i => i.isActive);
  }
}

//===END===

export {VideoListModel};