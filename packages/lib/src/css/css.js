const PRODUCT = 'Zenza';
//===BEGIN===

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

    const text = document.createTextNode(styles.toString());
    elm.appendChild(text);
    (document.head || document.body || document.documentElement).append(elm);
    elm.disabled = option && option.disabled;
    elm.dataset.switch = elm.disabled ? 'off' : 'on';
    return elm;
  }
};

//===END===
export {css};