import {Emitter} from '../Emitter';
import {objUtil} from './objUtil';
import {Observable} from './Observable';
import {bounce} from './bounce';
import {dimport} from './dimport';
import {global} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
//@require Observable
//@require bounce
class DataStorage {

  static create(defaultData, options = {}) {
    return new DataStorage(defaultData, options);
    // const {StorageArea} = dimport('std:kv-storage').catch(() => null);
    // if (!StorageArea) {
    //   return new DataStorage(defaultData, options);
    // } else {
    //   options.dbStorage = new DataStorage(defaultData, {...options});
    //   options.storage = new StorageArea(options.PREFIX || global.PRODUCT);
    //   return new DataStorage(defaultData, options);
    // }
  }
  static clone(dataStorage) {
    const options = {
      prefix:  dataStorage.prefix,
      storage: dataStorage.storage,
      ignoreExportKeys: dataStorage.options.ignoreExportKeys,
      readonly: dataStorage.readonly
    };
    return DataStorage.create(dataStorage.default, options);
  }

  constructor(defaultData, options = {}) {

    this.options = options;
    this.default = defaultData;
    this._data = Object.assign({}, defaultData);
    this.prefix = `${options.prefix || 'DATA'}_`;
    this.storage = options.storage || localStorage;
    this._ignoreExportKeys = options.ignoreExportKeys || [];
    this.readonly = options.readonly;
    this.silently = false;
    this._changed = new Map();
    this._onChange = bounce.time(this._onChange.bind(this));

    objUtil.bridge(this, new Emitter());

    this.restore().then(() => {
      this.props = this._makeProps(defaultData);
      this.emitResolve('restore');
    });

    this.logger = (self || window).console;
    this.consoleSubscriber = {
      next: (v, ...args) => this.logger.log('next', v, ...args),
      error: (e, ...args) => this.logger.warn('error', e, ...args),
      complete: (c, ...args) => this.logger.log('complete', c, ...args)
    };
  }

  _makeProps(defaultData = {}, namespace = '') {
    namespace = namespace ? `${namespace}.` : '';
    const self = this;
    const def = {};
    const props = {};
    Object.keys(defaultData).sort()
      // .filter(key => !this._ignoreExportKeys.includes(key) && key.includes(namespace))
      .filter(key => key.includes(namespace))
      .forEach(key => {
        const k = key.slice(namespace.length);
        if (k.includes('.')) {
          const ns = k.slice(0, k.indexOf('.'));
          props[ns] = this._makeProps(defaultData, `${namespace}${ns}`);
        }
        def[k] = {
          enumerable: !this._ignoreExportKeys.includes(key),
          get() { return self.getValue(key); },
          set(v) { self.setValue(key, v); }
        };
    });
    Object.defineProperties(props, def);
    return props;
  }

  _onChange() {
    const changed = this._changed;
    this.emit('change', changed);
    for (const [key, val] of changed) {
      this.emitAsync('update', key, val);
      this.emitAsync(`update-${key}`, val);
    }
    this._changed.clear();
  }

  onkey(key, callback) {
    this.on(`update-${key}`, callback);
  }

  offkey(key, callback) {
    this.off(`update-${key}`, callback);
  }

  async restore(storage) {
    storage = storage || this.storage;
    Object.keys(this.default).forEach(key => {
      const storageKey = this.getStorageKey(key);
      if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
        try {
          this._data[key] = JSON.parse(storage[storageKey]);
        } catch (e) {
          console.error('config parse error key:"%s" value:"%s" ', key, storage[storageKey], e);
          delete storage[storageKey];
          this._data[key] = this.default[key];
        }
      } else {
        this._data[key] = this.default[key];
      }
    });
  }

  getNativeKey(key) {
    return key;
  }

  getStorageKey(key) {
    return `${this.prefix}${key}`;
  }

  async refresh(key, storage) {
    storage = storage || this.storage;
    key = this.getNativeKey(key);
    const storageKey = this.getStorageKey(key);
    if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
      try {
        this._data[key] = JSON.parse(storage[storageKey]);
      } catch (e) {
        console.error('config parse error key:"%s" value:"%s" ', key, storage[storageKey], e);
      }
    }
    return this._data[key];
  }

  getValue(key) {
    key = this.getNativeKey(key);
    return this._data[key];
  }

  deleteValue(key) {
    key = this.getNativeKey(key);
    const storageKey = this.getStorageKey(key);
    this.storage.removeItem(storageKey);
    this._data[key] = this.default[key];
  }

  setValue(key, value) {
    const _key = key;
    key = this.getNativeKey(key);
    if (this._data[key] === value || value === undefined) {
      return;
    }
    const storageKey = this.getStorageKey(key);
    const storage = this.storage;
    if (!this.readonly) {
      try {
        storage[storageKey] = JSON.stringify(value);
      } catch (e) {
        window.console.error(e);
      }
    }
    this._data[key] = value;

    // console.log('%cupdate "%s" = "%s"', 'background: cyan', _key, value);
    if (!this.silently) {
      this._changed.set(_key, value);
      this._onChange();
    }
  }

  setValueSilently(key, value) {
    const isSilent = this.silently;
    this.silently = true;
    this.setValue(key, value);
    this.silently = isSilent;
  }

  export(isAll = false) {
    const result = {};
    const _default = this.default;

    Object.keys(this.props)
      .filter(key => isAll || (_default[key] !== this._data[key]))
      .forEach(key => result[key] = this.getValue(key));
    return result;
  }

  exportJson() {
    return JSON.stringify(this.export(), null, 2);
  }

  import(data) {
    Object.keys(this.props)
      .forEach(key => {
        const val = data.hasOwnProperty(key) ? data[key] : this.default[key];
        console.log('import data: %s=%s', key, val);
        this.setValueSilently(key, val);
    });
  }

  importJson(json) {
    this.import(JSON.parse(json));
  }

  getKeys() {
    return Object.keys(this.props);
  }

  clearConfig() {
    this.silently = true;
    const storage = this.storage;
    Object.keys(this.default)
      .filter(key => !this._ignoreExportKeys.includes(key)).forEach(key => {
        const storageKey = this.getStorageKey(key);
        try {
          if (storage.hasOwnProperty(storageKey) || storage[storageKey] !== undefined) {
            console.nicoru('delete storage', storageKey, storage[storageKey]);
            delete storage[storageKey];
          }
          this._data[key] = this.default[key];
        } catch (e) {}
    });
    this.silently = false;
  }

  namespace(name) {
    const namespace = name ? `${name}.` : '';
    const origin = Symbol(`${namespace}`);
    const result = {
      getValue: key => this.getValue(`${namespace}${key}`),
      setValue: (key, value) => this.setValue(`${namespace}${key}`, value),
      on: (key, func) => {
        if (key === 'update') {
          const onUpdate = (key, value) => {
            if (key.startsWith(namespace)) {
              func(key.slice(namespace.length + 1), value);
            }
          };
          onUpdate[origin] = func;
          this.on('update', onUpdate);
          return result;
        }
        return this.onkey(`${namespace}${key}`, func);
      },
      off: (key, func) => {
        if (key === 'update') {
          func = func[origin] || func;
          this.off('update', func);
          return result;
        }
        return this.offkey(`${namespace}${key}`, func);
      },
      onkey: (key, func) => {
        this.on(`update-${namespace}${key}`, func);
        return result;
      },
      offkey: (key, func) => {
        this.off(`update-${namespace}${key}`, func);
        return result;
      },
      props: this.props[name],
      refresh: () => this.refresh(),
      subscribe: subscriber => {
        return this.subscribe(subscriber)
          .filter(changed => changed.keys().some(k => k.startsWith(namespace)))
          .map(changed => {
            const result = new Map;
            for (const k of changed.keys()) {
              k.startsWith(namespace) && result.set(k, changed.get(k));
            }
            return result;
          });
      }
    };
    return result;
  }

  subscribe(subscriber) {
    subscriber = subscriber || this.consoleSubscriber;
    const observable = new Observable(o => {
      const onChange = changed => o.next(changed);
      this.on('change', onChange);
      return () => this.off('change', onChange);
    });
    return observable.subscribe(subscriber);
  }

  // for debug
  watch() {
    if (this.consoleSubscription) { return; }
    return this.consoleSubscription = this.subscribe();
  }
  unwatch() {
    this.consoleSubscription && this.consoleSubscription.unsubscribe();
    this.consoleSubscription = null;
  }

}



//===END===

class KVSDataStorage extends DataStorage {
  constructor(defaultData, options = {}) {
    super(defaultData, options);
  }

  getStorageKey(key) {
    return key;
  }

  async restore(storage) {
    storage = storage || this.storage;
    const dbs = this.options.dbStorage.export();
    for (const key of Object.keys(dbs)) {
      const value = dbs[key];
      this.storage.set(key, value);
      this.dbStorage.deleteValue(key);
    }
    for (const key of Object.keys(this.default)) {
      const storageKey = key;
      const value = await this.storage.get(storageKey);
      if (value !== undefined) {
          this._data[key] = value;
      } else {
        this._data[key] = this.default[key];
      }
    }
  }

  async refresh(key, storage) { // TODOOOOOO
    storage = storage || this.storage;
    key = this.getNativeKey(key);
    const storageKey = key;
    const value = await this.storage.get(storageKey);
    if (value !== undefined) {
      this._data[key] = value;
    }
    return this._data[key];
  }

  setValue(key, value) {
    const _key = key;
    key = this.getNativeKey(key);
    if (this._data[key] === value || arguments.length < 2 || value === undefined) {
      return;
    }
    const storageKey = key;
    const storage = this.storage;
    if (!this.readonly) {
      storage.set(storageKey, value);
    }
    this._data[key] = value;

    if (!this.silently) {
      this._changed.set(_key, value);
      this._onChange();
    }
  }

}

export {DataStorage};