import {bounce} from './bounce';
//===BEGIN===
const objUtil = (() => {
  const isObject = e => e !== null && e instanceof Object;
  const PROPS = Symbol('PROPS');
  const REVISION = Symbol('REVISION');
  const CHANGED = Symbol('CHANGED');
  const HAS = Symbol('HAS');
  const SET = Symbol('SET');
  const GET = Symbol('GET');
  return {
    bridge: (self, target, keys = null) => {
      (keys || Object.getOwnPropertyNames(target.constructor.prototype))
        .filter(key => typeof target[key] === 'function')
        .forEach(key => self[key] = target[key].bind(target));
    },
    isObject,
    toMap: (obj, mapper = Map) => {
      if (obj instanceof mapper) {
        return obj;
      }
      return new mapper(Object.entries(obj));
    },
    mapToObj: map => {
      if (!(map instanceof Map)) {
        return map;
      }
      const obj = {};
      for (const [key, val] of map) {
        obj[key] = val;
      }
      return obj;
    },
    // makeProps(self, defaultProps = {}, options = {}) {
    //   let {scope, onChange, root, parent} =
    //     {...{scope: [], root: self}, ...options};
    //     typeof self[REVISION] === 'number' && (self[REVISION] = 0);
    //   const def = {};
    //   const props = new Map;
    //   const changed = parent ? parent[CHANGED] : new Map;
    //   const changeset = new Map;
    //   const haskey = new Set;
    //   self[PROPS] = props;
    //   self[CHANGED] = changed;
    //   self[HAS] = key => haskey.has(key);

    //   const _onChange = options.onChange = options.onChange || bounce.time(() => {
    //     changeset.clear();
    //     for (const [key, val] of changed) {
    //       changeset.set(key, val);
    //     }
    //     changed.clear();
    //     onChange(changeset);
    //   });

    //   const getValue = key => {
    //     if (key.includes('.')) {
    //       return key.split('.').reduce((child, key) => {
    //         return (child !== null && child[HAS](key)) ? child[GET](key) : null;
    //       }, self);
    //     }
    //     return props.get(key);
    //   };
    //   self[GET] = getValue;

    //   const setValue = (key, value) => {
    //     const rev = self[REVISION];
    //     if (key.includes('.')) {
    //       const keys = key.split('.');
    //       const len = keys.length - 1;
    //       keys.reduce((child, key, idx) => {
    //         if (idx === len) {
    //           child[SET](key, value) && self[REVISION]++;
    //           return;
    //         }
    //         return (child !== null && child[HAS](key)) ? child[GET](key) : null;
    //       }, self);
    //       return rev !== self[REVISION];
    //     }

    //     const current = props.get(key);
    //     const rkey = scope.length ? `${scope.join('.')}.${key}` : key;
    //     // const pkey = scope.length ? `${scope[0]}.${key}` : key;
    //     if (value !== current) {
    //       if (isObject(value)) {
    //         if (Array.isArray(value) && value.length !== current.length) {
    //           for (let i = current.length, len = value.length; i < len; i++) {
    //             haskey.delete('' + i);
    //           }
    //           current.length = Math.max(value.length, current.length);
    //           self[REVISION]++;
    //         }
    //         for (const [k, v] of (value instanceof Map ? value : Object.entries(value))) {
    //           current[SET](k, v) && self[REVISION]++;
    //         }
    //         if (rev !== current[REVISION]) {
    //           self[REVISION]++;
    //           changed.set(rkey, value);
    //           onChange && _onChange();
    //         }
    //       } else {
    //         props.set(key, current);
    //         self[REVISION]++;
    //         changed.set(rkey, {parent, target: self, value, scope});
    //         onChange && _onChange();
    //       }
    //     }
    //     return rev !== self[REVISION];
    //   };
    //   self[SET] = setValue;

    //   Object.keys(defaultProps).sort()
    //     .forEach(key => {
    //       haskey.add(key);
    //       const val = defaultProps[key];
    //       if (key.includes('.')) {
    //         const ns = key.slice(0, key.indexOf('.'));
    //         if (!props.has(key)) {
    //           const nprops =
    //             Object.keys(defaultProps).filter(key => key.includes(ns)).reduce((nprops, key) => {
    //               nprops[key] = defaultProps[key];
    //               return nprops;
    //             }, {});
    //           props.set(ns,
    //             this.makeProps(
    //               {},
    //               nprops,
    //               {...options, ...{scope: [...scope, ns], root, parent: self}})
    //             );
    //         }
    //       } else if (isObject(val)) {
    //         const ns = key;
    //         const nprops = val;
    //         props.set(ns,
    //           this.makeProps(
    //             Array.isArray(val) ? [] : {},
    //             nprops,
    //             {...options, ...{scope: [...scope, ns], root, parent: self}})
    //         );
    //       } else {
    //         props.set(key, val);
    //       }

    //       def[key] = {
    //         enumerable: !!key.startsWith('_'),
    //         get() {
    //           return getValue(key);
    //         },
    //         set(value) {
    //           return setValue(key, value);
    //         }
    //       };
    //   });
    //   Object.defineProperties(self, def);
    //   return self;
    // }
  };
})();

//===END===
// const ガッ = (target, defValue) => {
//   const func = (...args) =>
//     typeof defValue === 'function' ? defValue.apply(target, [...args]) : defValue;
//   func[SRC] = target;
//   const ぬるぽ = new Proxy(func, {
//     get(target, prop, receiver) {
//       return new Proxy(receiver, {});
//     },
//     apply(target, thisArg, args) {
//       if (target === func) {
//         return target.apply(thisArg, args);
//       } else {
//         return defValue;
//       }
//     }
//   });
//   return ぬるぽ;
// };
// const SRC = Symbol('SRC');
// const ぬ = Object.create(null);
// const safe = (obj, defValue = undefined) => {
//   const safeAccessHandler = {
//     get(_target, prop) {
//       const target = _target[SRC];
//       try {
//         if (!(prop in target)) {
//           return safe(ぬ, defValue);
//         }
//         const val = Reflect.get(target, prop);
//         return safe(
//           typeof val === 'function' ? val.bind(target) : val,
//           defValue
//         );
//       } catch(e) {
//         console.warn('Null Pointer Exception? get', {obj, target, prop}, e);
//         return safe(ぬ, defValue);
//       }
//     },
//     set(_target, prop, newValue) {
//       const target = _target[SRC];
//       try {
//         if (target) {
//           target[prop] = newValue;
//         }
//       } catch(e) {
//         console.warn('Null Pointer Exception? set', {obj, target, prop, newValue}, e);
//       }
//       return true;
//     },
//     apply(target, thisArg, args) {
//       try {
//         return target.apply(thisArg, args);
//       } catch(e) {
//         console.warn('Null Pointer Exception? apply', {obj, target, thisArg, args}, e);
//         return safe({}, defValue);
//       }
//     },
//     construct(target, args) {
//       try {
//         return new target[SRC](...args);
//       } catch(e) {
//         console.warn('Null Pointer Exception? construct', {obj, target, args}, e);
//         return safe({}, defValue);
//       }
//     }
//   };
//   const func = (...args) => typeof obj === 'function' ? obj(...args) : obj;
//   func[SRC] = obj;
//   return new Proxy(func, safeAccessHandler);
// };

export {objUtil};