
//===BEGIN===
// <noscript> <noframes> のようなもの. 未対応ブラウザでだけ中が見える
if (window.customElements && !customElements.get('no-web-component')) {
  window.customElements.define('no-web-component', class extends HTMLElement {
    constructor() {
      super();
      this.hidden = true;
      this.attachShadow({mode: 'open'});
    }
  });
}
//===END===

export {};