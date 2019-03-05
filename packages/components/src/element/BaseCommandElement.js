// import {html, render} from 'lit-html';
import * as lit from 'https://unpkg.com/lit-html?module'; //https://cdn.jsdelivr.net/npm/lit-html@0.9.0/lit-html.min.js';
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
    let {html} = await this.importLit();
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
    let {render} = await this.constructor.importLit();
    if (!this._shadow) {
      this._shadow = this.attachShadow({mode: 'open'});
      render(await this.constructor.getTemplate(this.state, this.props, {onClick: this._boundOnUIEvent}), this._shadow);
      this._root = this._shadow.querySelector('#root');
      this._root.addEventListener('command', this._boundOnCommand);
    } else {
      render(await this.constructor.getTemplate(this.state, this.props, {onClick: this._boundOnUIEvent}), this._shadow);
    }
  }

  requestRender() {
    if (this._idleCallbackId) {
      cancelIdleCallback(this._idleCallbackId);
    }
    this._idleCallbackId = requestIdleCallback(this._idleRenderCallback, {});
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
    let {render} = await this.constructor.importLit();
    render('', this._shadow);
    this._shadow = null;
  }

  attributeChangedCallback(attr, oldValue, newValue) {
    attr = attr.startsWith('data-') ? this.constructor.toPropName(attr) : attr;
    const type = this.constructor.defaultProps[attr];
    if (['number', 'boolean', 'json'].includes(type)) {
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
    if (!this.state.hasOwnProperty(key)) { return false; }
    if (this.state[key] === value) { return false; }
    this.state[key] = value;
    return true;
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
    return this.dispatchCommand(command, param, e);
  }

  dispatchCommand(command, param, originalEvent = null) {
    this.dispatchEvent(new CustomEvent('command', {detail: {command, param, originalEvent}, bubbles: true, composed: true}));
  }

  onCommand(e) {
    //console.log('on-command', e.detail.command, e.detail.param);
  }
}

//===END===

export { BaseCommandElement };
