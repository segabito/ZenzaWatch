import {html, render} from 'lit-html';
import {ShadowDancer} from '../ShadowDancer/ShadowDancer';
import {ResizeWatchDog} from '../ShadowDancer/WatchDogs';

//===BEGIN===


//@require ../ShadowDancer/ShadowDancer.js

class YomiPage extends ShadowDancer {

  static get observeOptions() {
    return {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true
    };
  }

  constructor() {
    super();
    this.prop.active;
  }

  html(state, prop) {
    return html`
      <style>
      
        /*:host-context(.page.active ~ .page) .root {
          visibility: hidden !important;
        }*/
/*        :host-context(body:not([data-scroll-top="0"]) .active) .root {*/
        :host-context(.page.active) .root {
          position: fixed;
          /*width: calc(100vw - 64px);*/
          min-width: calc(var(--page-width) * 1px);
          height: calc(100vh - 64px);
          top: 48px;
          /*left: 32px;*/
          background: rgba(33, 33, 33, 0.9);
          border-radius: 8px;
          color: #ccc;
          /*outline: 4px solid red;*/
        }
        /*
        :host-context([data-scroll-top="0"] .page.active) .root {
          position: relative;
        }*/
        
        :host-context(.page) .root .inner {
          position: absolute;
          display: flex;
          left: 50%;
          top: 50%;
          --scale: calc((var(--content-height) - 48) / var(--page-height));
          transform: 
            translate(-50%, -50%)
            scale(var(--scale));
          box-shadow: 4px 4px 4px rgba(88, 88, 88, 0.9);
          overflow: hidden;
        }
        /*
        :host-context([data-scroll-top="0"] .page.active) .root .inner {
          position: relative;
          transform: none;
          box-shadow: none;
        }
        */
        
        /*::slotted(.stream_comment) {
          background: rgba(66, 0, 0, 0.5);
        }*/
        /*
        ::slotted(.stream_comment:nth-child(2) ~ .stream_comment) {
          animation-play-state: paused;
          color: yellow;
        }
        */
        /*
        ::slotted(.stream_comment + .stream_comment + .stream_comment) {
          animation-play-state: paused;
          color: orange;
        }
        */
        ::slotted(canvas.balloon) {
          /*top: 0 !important;
          left: 0 !important;*/
          transform: translate(-100%, -50%);
        }
        /*
        ::slotted(canvas.balloon:nth-child(2)) {
          top: 0 !important;
        }*/
        
      </style>
      <div class="root">
        <div class="inner">
        <slot></slot>
        </div>
      </div>
    `;
  }

  attachLight(element) {
    super.attachLight(element);
    this.prop.active = element.classList.contains('active');
    this._root = this.querySelector('.root');
    ResizeWatchDog.watch(this._root);
  }

  _onNodeAdded(elements) {

  }

  _onAttributeChanged(attr, value) {
    switch (attr) {
      case 'class':
        this.prop.active = attr.indexOf('active') >= 0;
        break;
    }
  }
}

window.customElements.define('yomi-page', YomiPage);

//===END===

export {YomiPage};

