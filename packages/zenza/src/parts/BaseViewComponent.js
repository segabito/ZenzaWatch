import {Emitter} from '../../../lib/src/Emitter';
import {PRODUCT} from '../../../../src/ZenzaWatchIndex';
import {cssUtil} from '../../../lib/src/css/css';
import {bounce} from '../../../lib/src/infra/bounce';
import {ClassList} from '../../../lib/src/dom/ClassListWrapper';
//===BEGIN===

class BaseViewComponent extends Emitter {
  constructor({parentNode = null, name = '', template = '', shadow = '', css = ''}) {
    super();

    this._params = {parentNode, name, template, shadow, css};
    this._bound = {};
    this._state = {};
    this._props = {};
    this._elm = {};

    this._initDom({
      parentNode,
      name,
      template,
      shadow,
      css
    });
  }

  _initDom(params) {
    const {parentNode, name, template, css: style, shadow} = params;
    const tplId = `${PRODUCT}${name}Template`;
    let tpl = BaseViewComponent[tplId];
    if (!tpl) {
      if (style) {
        cssUtil.addStyle(style, `${name}Style`);
      }
      tpl = document.createElement('template');
      tpl.innerHTML = template;
      tpl.id = tplId;
      BaseViewComponent[tplId] = tpl;
    }
    const onClick = this._bound.onClick = this._onClick.bind(this);

    const view = document.importNode(tpl.content, true);
    this._view = view.querySelector('*') || document.createDocumentFragment();
    this._view.addEventListener('click', onClick);
    this.appendTo(parentNode);

    if (shadow) {
      this._attachShadow({host: this._view, name, shadow});
      if (!this._isDummyShadow) {
        this._shadow.addEventListener('click', onClick);
      }
    }
  }

  _attachShadow({host, shadow, name, mode = 'open'}) {
    const tplId = `${PRODUCT}${name}Shadow`;
    let tpl = BaseViewComponent[tplId];
    if (!tpl) {
      tpl = document.createElement('template');
      tpl.innerHTML = shadow;
      tpl.id = tplId;
      BaseViewComponent[tplId] = tpl;
    }

    if (!host.attachShadow && !host.createShadowRoot) {
      return this._fallbackNoneShadowDom({host, tpl, name});
    }

    const root = host.attachShadow ?
      host.attachShadow({mode}) : host.createShadowRoot();
    const node = document.importNode(tpl.content, true);
    root.append(node);
    this._shadowRoot = root;
    this._shadow = root.querySelector('.root');
    this._isDummyShadow = false;
  }

  _fallbackNoneShadowDom({host, tpl, name}) {
    const node = document.importNode(tpl.content, true);
    const style = node.querySelector('style');
    style.remove();
    cssUtil.addStyle(style.innerHTML, `${name}Shadow`);
    host.append(node);
    this._shadow = this._shadowRoot = host.querySelector('.root');
    this._isDummyShadow = true;
  }

  setState(key, val) {
    if (typeof key === 'string') {
      return this._setState(key, val);
    }
    for (const k of Object.keys(key)) {
      this._setState(k, key[k]);
    }
  }

  _setState(key, val) {
    let m;
    if (this._state[key] !== val) {
      this._state[key] = val;
      if ((m = (/^is(.*)$/.exec(key))) !== null) {
        this.toggleClass(`is-${m[1]}`, !!val);
      }
      this.emit('update', {key, val});
    }
  }

  _onClick(e) {
    const target = e.target.closest('[data-command]');

    if (!target) {
      return;
    }

    let {command, type = 'string', param} = target.dataset;
    e.stopPropagation();
    e.preventDefault();
    if (type !== 'string') { param = JSON.parse(param); }

    this._onCommand(command, param);
  }

  appendTo(parentNode) {
    if (!parentNode) {
      return;
    }
    this._parentNode = parentNode;
    parentNode.appendChild(this._view);
  }

  _onCommand(command, param) {
    this.dispatchCommand(command, param);
  }

  dispatchCommand(command, param) {
    this._view.dispatchEvent(new CustomEvent('command',
      {detail: {command, param}, bubbles: true, composed: true}
    ));
  }

  toggleClass(className, v) {
    const vc = ClassList(this._view);
    const sc = this._shadow ? ClassList(this._shadow) : null;
    (className || '').trim().split(/\s+/).forEach(c => {
      vc.toggle(c, v);
      if (sc) {
        sc.toggle(c, vc.contains(c));
      }
    });
  }

  addClass(name) {
    const names = name.trim().split(/[\s]+/);
    ClassList(this._view).add(...names);
    this._shadow && ClassList(this._shadow).add(...names);
  }

  removeClass(name) {
    const names = name.trim().split(/[\s]+/);
    ClassList(this._view).remove(...names);
    this._shadow && ClassList(this._shadow).remove(...names);
  }
}

//===END===
export {BaseViewComponent};