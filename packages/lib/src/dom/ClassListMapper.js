import {bounce} from '../infra/bounce';
//===BEGIN===
class ClassListWrapper {
  constructor(element) {
    this._element = element;
    this._next = Array.from(element.classList).sort();
    this._last = this._next;
    this.apply = bounce.raf(this.apply.bind(this));
  }
  add(...names) {
    this._next.push(...names.filter(name => !this._next.includes(name)));
    this.apply();
    return true;
  }
  remove(...names) {
    this._next = this._next.filter(name => !names.includes(name));
    this.apply();
    return false;
  }
  contains(name) {
    return this._next.includes(name);
  }
  toggle(name, v) {
    if (v !== undefined) {
      v = !!v;
    } else {
      v = !this.contains(name);
    }
    return v ? this.add(name) : this.remove(name);
  }
  apply() {
    const last = this._last.join(',');
    const next = this._next.sort().join(',');
    if (next === last) { return; }
    const added   = this._next.filter(name => !this._last.includes(name));
    const removed = this._last.filter(name => !this._next.includes(name));
    if (added.length)   { this._element.classList.add(...added); }
    if (removed.length) { this._element.classList.remove(...removed); }
    this._next = Array.from(this._element.classList).sort();
    this._last = this._next.concat();
    return this;
  }
}

//===END===
export {ClassListWrapper};