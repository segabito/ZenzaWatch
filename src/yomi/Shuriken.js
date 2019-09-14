import {ShadowDancer} from '../ShadowDancer/ShadowDancer';
import {html, render} from 'lit-html';
//===BEGIN===

class Shuriken extends ShadowDancer {
  constructor() {
    super();
  }

  html(state, prop) {
    return html`
      <style>
        @keyframes move {
          0% {
              /*transform: translate(${prop.left}, 0);*/
              visibility: visible;
              transform: translate(calc(var(--content-width, 650) * 1px), 0);
          }
          100% {
              transform: translate(-100%, 0);
          }
        }
        ${prop.tagName} {
            position: absolute;
            left: 0;
            /*top: ${prop.top}px;*/
            display: inline-block;
            user-select: none;
            pointer-events: none;
            visiblity: hidden;
            font-size: 24px;
            line-height: 24px;
            color: #8f8;
            text-shadow: 
              -2px -2px 1px #000,
               2px -2px 1px #000,
              -2px  2px 1px #000,
               2px  2px 1px #000
                ;
            white-space: nowrap;
            transform: translate(calc(var(--content-width, 650) * 1px), 0);
            animation: move 4s linear;
            animation-fill-mode: forwards;
            /*animation-delay: ${prop.delay}s;*/
            z-index: 1000;
        }
        :host-context(.page .stream_comment) * {
          background: rgba(0, 0, 0, 0.5);
        }
        :host-context(
            .stream_comment + 
            .stream_comment + 
            .stream_comment
            ) ${prop.tagName} {
          animation-play-state: paused;
          color: red;
        }
      </style>
      <span class="shuriken root">${prop.text}</span>
    `;
  }

  attachLight(element) {
    this.prop.left = element.style.left;
    this.prop.top = element.style.top;//parseFloat((element.style.top || '').replace(/[^0-9]/g,''));
    this.prop.text = element.textContent;
    this.prop.delay = Math.max(parseInt(element.style.left) / 650 * 2 - 2, 0);
    // this.prop.t
    // this._root = this.querySelector('.root');
    setTimeout(() => {
      super.attachLight(element);
      element.dataset.shuriken = '1';
      // console.log(element.outerHTML);
      this.addEventListener('animationend', e => {
        setTimeout(() => {
          // element.remove();
          // this.textContent = '';
          // this.shadow.removeChild(this);
          // this.remove();
        }, 1000);
        // debugger;
      }, {once: true});
    }, this.prop.delay * 1000);
    // debugger;
    // console.log(this.prop, this.outerHTML);
  }
}
window.customElements.define('yomi-shuriken', Shuriken);
//===END===
export {Shuriken};
