import {PromiseHandler} from '../../../lib/src/Emitter';

//===BEGIN===
class FrameLayer {
  constructor(params) {
    this.promise = new PromiseHandler();
    this.container = params.container;
    this._initialize(params);
    this._isVisible = null;

    this.intersectionObserver = new IntersectionObserver(entries => {
      const win = this.contentWindow;
      const isVisible = entries[0].isIntersecting;
      if (this._isVisible !== isVisible) {
        this._isVisible = win.isVisible = isVisible;
        this.iframe.dispatchEvent(new CustomEvent('visibilitychange', {detail: {isVisible, name: win.name}}));
      }
    });
}
  get isVisible() {
    return this._isVisible;
  }
  get frame() {
    return this.iframe;
  }
  /**
   * @returns Promise<window>
   */
  wait() {
    return this.promise;
  }
  _initialize(params) {
    const iframe = this._getIframe();
    iframe.className = params.className || '';
    iframe.loading = 'eager';

    const onload = () => {
      iframe.onload = null;
      this.iframe = iframe;
      const contentWindow = this.contentWindow = iframe.contentWindow;
      this.intersectionObserver.observe(iframe);
      this.bridgeFunc = e => {
        this.iframe.dispatchEvent(new e.constructor(this.iframe, e));
      };
      this.promise.resolve(contentWindow);
    };

    const html = this._html = params.html;
    this.container.append(iframe);
    if ('srcdoc' in iframe.constructor.prototype) {
      iframe.onload = onload;
      iframe.srcdoc = html;
    } else {
      // MS IE/Edge用
      const d = iframe.contentWindow.document;
      d.open();
      d.write(html);
      d.close();
      window.setTimeout(onload, 0);
    }
  }
  _getIframe() {
    const iframe = Object.assign(document.createElement('iframe'), {
      loading: 'eager', srcdoc: '<html></html>', sandbox: 'allow-same-origin allow-scripts'
    });
    return iframe;
  }
  addEventBridge(name, options) {
    this.wait().then(w => w.addEventListener(name, this.bridgeFunc, options));
    return this;
  }
  removeEventBridge(name) {
    this.wait().then(w => w.removeEventListener(name, this.bridgeFunc));
    return this;
  }
}
//===END===
export {FrameLayer};