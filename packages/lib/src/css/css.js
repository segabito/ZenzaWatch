const PRODUCT = 'Zenza';
//===BEGIN===
/**
 * @typedef registerPropertyDefinition
 * @property {string} name
 * @property {string} syntax
 * @property {string} initialValue
 * @property {boolean?} inherits
 */
const css = {
  addStyle: (styles, option, document = window.document) => {
    const elm = document.createElement('style');
    elm.type = 'text/css';
    if (typeof option === 'string') {
      elm.id = option;
    } else if (option) {
      Object.assign(elm, option);
    }
    elm.classList.add(PRODUCT);

    elm.append(styles.toString());
    (document.head || document.body || document.documentElement).append(elm);
    elm.disabled = option && option.disabled;
    elm.dataset.switch = elm.disabled ? 'off' : 'on';
    return elm;
  },
  /**
   * @param  {...registerPropertyDefinition} definitions
   */
  registerProps(...args) {
    if (!CSS || !('registerProperty' in CSS)) {
      return;
    }
    /** @type registerPropertyDefinition */
    for (const definition of args) {
      try {
        (definition.window || window).CSS.registerProperty(definition);
      } catch (err) { console.warn('CSS.registerProperty fail', definition, err); }
    }
  },
  setProps(element, ...args) {
    for (const {prop, value} of args) {
      try {
        element.style.setProperty(prop, value);
      } catch (err) { console.warn('element.style.setProperty fail', {prop, value}, element, err); }
    }
  },
  addModule: async function(func, options = {}) {
    if (!CSS || !('paintWorklet' in CSS) || this.set.has(func)) {
      return;
    }
    this.set.add(func);
    const src =
    `(${func.toString()})(
      this,
      registerPaint,
      ${JSON.stringify(options.config || {}, null, 2)}
      );`;
    const blob = new Blob([src], {type: 'text/javascript'});
    const url = URL.createObjectURL(blob);
    await CSS.paintWorklet.addModule(url).then(() => URL.revokeObjectURL(url));
    return true;
  }.bind({set: new WeakSet}),
  number:  value => CSS.number  ? CSS.number(value) : value,
  s:       value => CSS.s       ? CSS.s(value) :  `${value}s`,
  ms:      value => CSS.ms      ? CSS.ms(value) : `${value}ms`,
  pt:      value => CSS.pt      ? CSS.pt(value) : `${value}pt`,
  px:      value => CSS.px      ? CSS.px(value) : `${value}px`,
  percent: value => CSS.percent ? CSS.percent(value) : `${value}%`,
  vh:      value => CSS.vh      ? CSS.vh(value) : `${value}vh`,
  vw:      value => CSS.vw      ? CSS.vw(value) : `${value}vw`,

};
const cssUtil = css;
//===END===
export {css, cssUtil};