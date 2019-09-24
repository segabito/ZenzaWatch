import {bounce} from '../infra/bounce';
//===BEGIN===
class ClassListWrapper {
  constructor(element) {
    this.applyNow = this.apply.bind(this);
    this.apply = bounce.raf(this.applyNow);
    if (element) {
      this.setElement(element);
    } else {
      this._next = new Set;
      this._last = new Set;
    }
  }
  setElement(element) {
    if (this._element) {
      this.applyNow();
    }
    this._element = element;
    this._next = new Set(element.classList);
    this._last = new Set(this._next);
    return this;
  }
  add(...names) {
    for (const name of names) {
      this._next.add(name);
    }
    this.apply();
    return this;
  }
  remove(...names) {
    for (const name of names) {
      this._next.delete(name);
    }
    this.apply();
    return this;
  }
  contains(name) {
    return this._next.has(name);
  }
  toggle(name, v) {
    if (v !== undefined) {
      v = !!v;
    } else {
      v = !this.contains(name);
    }
    v ? this.add(name) : this.remove(name);
    return this;
  }
  apply() {
    const last = [...this._last].sort().join(',');
    const next = [...this._next].sort().join(',');
    if (next === last) { return; }
    const element = this._element;
    const added = [], removed = [];
    for (const name of this._next) {
      if (!this._last.has(name)) { added.push(name); }
    }
    for (const name of this._last) {
      if (!this._next.has(name)) { removed.push(name); }
    }
    if (removed.length) { element.classList.remove(...removed); }
    if (added.length)   { element.classList.add(...added); }
    this._last = this._next;
    this._next = new Set(element.classList);
    return this;
  }
}

const ClassList = function(element) {
  if (this.map.has(element)) {
    return this.map.get(element);
  }
  const m = new ClassListWrapper(element);
  this.map.set(element, m);
  return m;
}.bind({map: new WeakMap()});

//===END===
export {ClassListWrapper, ClassList};