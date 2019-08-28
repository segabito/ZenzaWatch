// import {html, render} from 'lit-html';
// import * as lit from 'https://unpkg.com/lit-html?module'; //https://cdn.jsdelivr.net/npm/lit-html@0.9.0/lit-html.min.js';
import * as lit from '../../../../node_modules/lit-html/lit-html.js';
// import * as lit from 'https://unpkg.com/lit-html?module'; //'https://cdn.jsdelivr.net/npm/lit-html@1.1.0/lit-html.min.js';
// const {html, render} = lit;
const dll = {lit};
import {util} from '../util/util.js';
//===BEGIN===

class BaseCommandElement extends HTMLElement {

  static toAttributeName(camel) {
    return 'data-' + camel.replace(/([A-Z])/g, s =>  '-' + s.toLowerCase());
  }

  static toPropName(snake) {
    return snake.replace(/^data-/, '').replace(/(-.)/g, s =>  s.charAt(1).toUpperCase());
  }

  static async importLit() {
    if (dll.lit) {
      return dll.lit;
    }
    dll.lit = await util.dimport('https://unpkg.com/lit-html?module');
    return dll.lit;
  }

  static get observedAttributes() {
    return [];
  }

  static get propTypes() {
    return {};
  }

  static get defaultProps() {
    return {};
  }

  static get defaultState() {
    return {};
  }

  static async getTemplate(state = {}, props = {}, events = {}) {
    let {html} = dll.lit || await this.importLit();
    return html`<div id="root" data-state="${JSON.stringify(state)}"
      data-props="${JSON.stringify(props)}" @click=${events.onClick}></div>`;
  }

  constructor() {
    super();
    this._isConnected = false;
    this.props = Object.assign({}, this.constructor.defaultProps, this._initialProps);
    this.state = Object.assign({}, this.constructor.defaultState);
    this._boundOnUIEvent = this.onUIEvent.bind(this);
    this._boundOnCommand = this.onCommand.bind(this);
    this.events = {
      onClick: this._boundOnUIEvent
    };

    this._idleRenderCallback = async () => {
      this._idleCallbackId = null;
      return await this.render();
    };
  }

  get _initialProps() {
    const props = {};
    for (let key of Object.keys(this.constructor.propTypes)) {
      if (!this.dataset[key]) { continue; }
      const type = typeof this.constructor.propTypes[key];
      props[key] = type !== 'string' ? JSON.parse(this.dataset[key]) : this.dataset[key];
    }
    return props;
  }

  async render() {
    if (!this._isConnected) {
      return;
    }
    let {render} = dll.lit || await this.constructor.importLit();
    if (!this._shadow) {
      this._shadow = this.attachShadow({mode: 'open'});
    }
    render(await this.constructor.getTemplate(this.state, this.props, this.events), this._shadow);

    if (!this._root) {
      const root = this._shadow.querySelector('#root');
      if (!root) {
        return;
      }
      this._root = root;
      this._root.addEventListener('command', this._boundOnCommand);
    }
  }

  requestRender(isImmediate = false) {
    if (this._idleCallbackId) {
      cancelIdleCallback(this._idleCallbackId);
    }
    if (isImmediate) {
      this._idleRenderCallback();
    } else {
      this._idleCallbackId = requestIdleCallback(this._idleRenderCallback, {});
    }
  }

  async connectedCallback() {
    this._isConnected = true;
    await this.render();
  }

  async disconnectedCallback() {
    this._isConnected = false;
    if (this._root) {
      this._root.removeEventListener('click', this._boundOnUIEvent);
      this._root.removeEventListener('command', this._boundOnCommand);
      this._root = null;
    }
    let {render} = dll.lit || await this.constructor.importLit();
    render('', this._shadow);
    this._shadow = null;
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    attr = attr.startsWith('data-') ? this.constructor.toPropName(attr) : attr;
    // const defProp = this.constructor.defaultProps[attr];
    const type = typeof this.constructor.propTypes[attr];
    if (type !== 'string') {
      newValue = JSON.parse(newValue);
    }
    if (this.props[attr] === newValue) {
      return;
    }
    this.props[attr] = newValue;
    this.requestRender();
  }

  setProp(prop, value) {
    this.setAttribute(prop, value);
  }

  setState(key, value) {
    if (this._setState(key, value)) {
      this.requestRender();
      return true;
    }
    return false;
  }

  _setState(key, value) {
    if (typeof key !== 'string') { return this._setStates(key); }
    if (!this.state.hasOwnProperty(key)) { return false; }
    if (this.state[key] === value) { return false; }
    this.state[key] = value;
    return true;
  }

  _setStates(states) {
    return Object.keys(states).filter(key => this._setState(key, states[key])).length > 0;
  }

  onUIEvent(e) {
    let target = e.target.closest('[data-command]');
    if (!target) {
      return;
    }
    let {command, param, type} = target.dataset;
    if (['number', 'boolean', 'json'].includes(type)) {
      param = JSON.parse(param);
    }
    e.preventDefault();
    e.stopPropagation();
    return this.dispatchCommand(command, param, e, target);
  }

  dispatchCommand(command, param, originalEvent = null, target = null) {
    (target || this).dispatchEvent(new CustomEvent('command', {detail: {command, param, originalEvent}, bubbles: true, composed: true}));
  }

  onCommand(e) {
    //console.log('on-command', e.detail.command, e.detail.param);
  }

  get propset() {
    return Object.assign({}, this.props);
  }

  set propset(props) {
    const keys = Object.keys(props).filter(key => this.props.hasOwnProperty(key));
    const changed = keys.filter(key => {
      if (this.props[key] === props[key]) {
        return false;
      }
      this.props[key] = props[key];
      return true;
    }).length > 0;

    if (changed) {
      this.requestRender();
    }
  }
}

//===END===

export { BaseCommandElement };
