
//===BEGIN===
const objUtil = (() => {
  const isObject = e => e !== null && e instanceof Object;
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
      const map = new mapper();
      for(const [key, val] of Object.entries(obj)) {
        map.set(key, val);
      }
      return map;
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
    }
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