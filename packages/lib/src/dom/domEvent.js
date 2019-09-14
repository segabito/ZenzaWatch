import {global} from '../../../../src/ZenzaWatchIndex';

//===BEGIN===
const domEvent = {
  dispatchCustomEvent(elm, name, detail = {}, options = {}) {
    const ev = new CustomEvent(name, Object.assign({detail}, options));
    elm.dispatchEvent(ev);
  },
  dispatchCommand(element, command, param, originalEvent = null) {
    return element.dispatchEvent(new CustomEvent('command',
      {detail: {command, param, originalEvent}, bubbles: true, composed: true}
    ));
  },
  bindCommandDispatcher(element, command) {
    element.addEventListener(command, e => {
      const target = e.target.closest('[data-command]');
      if (!target) {
        global.emitter.emitAsync('hideHover');
        return;
      }
      let [command, param, type] = target.dataset;
      if (['number', 'boolean', 'json'].includes(type)) {
        param = JSON.parse(param);
      }
      e.preventDefault();
      return this.dispatchCommand(element, command, param, e);
    });
  }
};

//===END===

export {domEvent};