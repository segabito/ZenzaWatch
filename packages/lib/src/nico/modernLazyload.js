// ==UserScript==
// @name         modern lazyload
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.nicovideo.jp/*
// @grant        none
// @run-at       document-body
// @noframes
// ==/UserScript==

//===BEGIN===
(() => { // 古いページで使われているがパフォーマンス的にちょっとアレなのでリプレースする
  if (window !== top || location.host !== 'www.nicovideo.jp') {
    return;
  }
  const override = () => {
    const LazyImage = window.Nico && window.Nico.LazyImage;
    if (!LazyImage) { return; }
    const isInitialized = !!LazyImage.pageObserver;
    console.log('override Nico.LazyImage...');
    if (isInitialized) {
      clearInterval(LazyImage.pageObserver);
    }

    Object.assign(LazyImage, {
      waitings: {
        get length() { return 0; },
        push(v) { return v; },
        splice() { return []; }
      },
      initialize() {
        this._setPageObserver();
      },
      reset() {
      },
      enqueue() {
        if (!this.intersectionObserver) {
          this.initialize();
        }
        const items = document.querySelectorAll(`.${this.className}:not(.is-loading)`);
        for (const item of items) {
          item.classList.add('is-loading');
          this.intersectionObserver.observe(item);
        }
      },
      _loadImage(item) {
        if (!(item instanceof HTMLElement)) {
          throw new Error('無視していいエラー'); // override前のメソッドから呼ばれたので例外を投げて強制ストップ
        }
        const src = item.getAttribute(this.attrName);
        item.classList.remove(this.className, 'is-loading');
        if (src && item.getAttribute(this.adjustAttrName)) {
          this._adjustSizeAndLoad(item, src);
        } else {
          item.setAttribute('src', src);
        }
        item.setAttribute(this.attrName, '');
        item.addEventListener('error', e => {
          console.warn('error', e.target);
          (e.target || item)
            .dispatchEvent(
              new CustomEvent(this.errorEventName,
                {detail: {src}, bubbles: true, composed: true}));
        });
      },
      _adjustSizeAndLoad(item, src) {
        const img = document.createElement('img');
        img.addEventListener('load', () => {
          let itemWidth = item.offsetWidth;
          let itemHeight = item.offsetHeight;
          const imageWidth = img.width;
          const imageHeight = img.height;
          if (imageWidth >= imageHeight) {
            itemHeight = itemHeight / imageWidth * imageHeight;
          } else {
            itemWidth = itemWidth / imageHeight * imageWidth;
          }
          requestAnimationFrame(() => {
            Object.assign(item.style, {
              width: `${itemWidth}px`,
              height: `${itemHeight}px`
            });
            item.setAttribute('src', src);
          });
        }, {once: true});

        img.src = src;
      },
      _setPageObserver() {
        this.intersectionObserver && this.intersectionObserver.disconnect();
        const intersectionObserver = this.intersectionObserver = new IntersectionObserver(entries => {
          const inviews =
            entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
            for (const item of inviews) {
              intersectionObserver.unobserve(item);
              this._loadImage(item);
            }
        }, { rootMargin: `${this.margin}px`});

        this.mutationObserver && this.mutationObserver.disconnect();
        const mutationObserver = this.mutationObserver = new MutationObserver(mutations => {
          const isAdded = mutations.find(
            mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
          if (isAdded) { this.enqueue(); }
        });
        mutationObserver.observe(
          document.body,
          {childList: true, characterData: false, attributes: false, subtree: true}
        );

        this.enqueue();
      },
      _getBottomLoadingThreshold() {
        return Number.MAX_SAFE_INTEGER;
      },
      _sortWaitings() {
      }
    });

    if (isInitialized) {
      LazyImage.initialize();
    }
  };


  if (window.Nico && window.Nico.LazyImage && IntersectionObserver && MutationObserver) {
    override();
  } else if (IntersectionObserver && MutationObserver) {
    window.addEventListener('DOMContentLoaded', override, {once: true, bubbles: true});
  }
})();

//===END===