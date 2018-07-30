import {html, render} from 'lit-html';

//===BEGIN===


class ShadowDancer extends HTMLElement {

  static get observeOptions() {
    return {

    };
  }
  constructor() {
    super();

    this.state = {};
    this.prop = {
      tagName: this.tagName.toLowerCase()
    };

    let target = this.getAttribute('target') && document.querySelector(this.getAttribute('target'));
    if (target) {
      this.attachLight(target);
    }
    this._mutationCallback = this._mutationCallback.bind(this);
  }

  html(state, prop) {
    return html`<slot></slot>`;
  }

  render() {
    //this.innerHTML = this.html(this.state, this.prop);
    render(this.html(this.state, this.prop), this);
  }

  attachLight(element) {
    element = typeof element === 'string' ? document.querySelector(element) : element;
    if (!element || element === this.light) {
      return;
    }
    if (this.light) {
      this.dettachLight();
    }
    this.light = element;
    this.shadow = element.attachShadow({mode: 'open'});
    this.shadow.append(this);
    // this.style.width = `${element.offsetWidth}px`;
    // this.style.height = `${element.offsetHeight}px`;

    this.startObserve();
  }

  _mutationCallback(records) {
    for (let record of records) {
      // console.log('record:', record.type, record.target, record.addedNodes, record.removedNodes);
    }
  }

  startObserve() {
    const options = this.constructor.observeOptions;
    if (!Object.keys(options).length) { return; }
    this._banken = this._banken || new MutationObserver(this._mutationCallback);
    this._banken.disconnect();
    this._banken.observe(this.light, this.constructor.observeOptions);
  }

  stopObserve() {
    if (!this._banken) { return; }
    this._banken.unwatch(this.light);
  }

  dettachLight() {
    if (!this.light) { return; }
    const slot = document.createElement('slot');
    this.replaceWith(slot);
    this.light = null;
    this.shadow = null;
    this._banken.disconnect();
  }

  connectedCallback() {
    this.render();
  }
}

window.customElements.define('shadow-element', ShadowDancer);

//===END===

export {ShadowDancer};

