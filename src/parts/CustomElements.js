import {browser} from '../browser';
import {CONSTANT} from '../constant';
const window = browser.window;

//===BEGIN===

const CustomElements = {};

CustomElements.initialize = (() => {
  if (!window.customElements) {
    return;
  }

  class PlaylistAppend extends HTMLElement {
    static get observedAttributes() { return []; }

    // 末尾に追加するという意味合では add より append らしい
    static template() {
      return `
        <style>
        * {
          box-sizing: border-box;
          user-select: none;
        }

        :host {
          background: none !important;
          border: none !important;
        }

        .playlistAppend {
          display: inline-block;
          font-size: 16px;
          line-height: 22px;
          width: 24px;
          height: 24px;
          background: #666;
          color: #ccc;
          text-decoration: none;
          border: 1px outset;
          border-radius: 3px;
          cursor: pointer;
          text-align: center;
        }

        .playlistAppend:active {
          border: 1px inset;
        }

        .label {
          text-shadow: 1px 1px #333;
          display: inline-block;
        }

        :host-context(.videoList) .playlistAppend {
          width: 24px;
          height: 20px;
          line-height: 18px;
          border-radius: unset;
        }

        :host-context(.videoOwnerInfoContainer) {
        }

      </style>
      <div class="playlistAppend">
        <div class="label">▶</div></div>
       `;
    }

    constructor() {
      super();
      const shadow = this._shadow = this.attachShadow({mode: 'open'});
      shadow.innerHTML = this.constructor.template();
    }

    disconnectedCallback() {
      this._shadow.innerHTML = '';
    }
  }

  window.customElements.define('zenza-playlist-append', PlaylistAppend);
});

//===END===

export {
  CustomElements
};