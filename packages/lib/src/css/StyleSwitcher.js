
//===BEGIN===
class StyleSwitcher {
  static update({on, off, document = window.document}) {
    if (on) {
      Array.from(document.head.querySelectorAll(on))
        .forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
    }
    if (off) {
      Array.from(document.head.querySelectorAll(off))
        .forEach(s => { s.disabled = true;  s.dataset.switch = 'off'; });
    }
  }

  static addClass(selector, ...classNames) {
    classNames.forEach(name => {
      Array.from(document.head.querySelectorAll(`${selector}.${name}`))
        .forEach(s => { s.disabled = false; s.dataset.switch = 'on'; });
    });
  }

  static removeClass(selector, ...classNames) {
    classNames.forEach(name => {
      Array.from(document.head.querySelectorAll(`${selector}.${name}`))
        .forEach(s => { s.disabled = true; s.dataset.switch = 'off'; });
    });
  }

  static toggleClass(selector, className, v) {
    Array.from(document.head.querySelectorAll(`${selector}.${className}`))
      .forEach(s => { s.disabled = v === undefined ? !s.disabled : !v; s.dataset.switch = s.disabled ? 'off' : 'on'; });
  }

}

//===END===

export {StyleSwitcher};
