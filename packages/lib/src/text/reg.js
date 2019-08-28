//===BEGIN===
const reg = (() => {
  const $ = Symbol('$');
  const undef = Symbol.for('undefined');
  const MAX_RESULT = 30;
  const smap = new WeakMap();
  const self = {};

  const reg = function(regex = undef, str = undef) {
    const {results, last} = smap.has(this) ?
      smap.get(this) : {results: [], last: {result: null}};
    smap.set(this, {results, last});
    if (regex === undef) {
      return last ? last.result : null;
    }
    const regstr = regex.toString();
    if (str !== undef) {
      const found = results.find(r => regstr === r.regstr && str === r.str);
      return found ? found.result : reg(regex).exec(str);
    }
    return {
      exec(str) {
        const result = regex.exec(str);
        Array.isArray(result) && result.forEach((r, i) => result['$' + i] = r);
        Object.assign(last, {str, regstr, result});
        results.push(last);
        results.length > MAX_RESULT && results.shift();
        this[$] = str[$] = regex[$] = result;
        return result;
      },
      test(str) { return !!this.exec(str); }
    };
  };

  const scope = (scopeObj = {}) => reg.bind(scopeObj);

  return Object.assign(reg.bind(self), {$, scope});
})();

//===END===

export {reg};