//===BEGIN===

const ResizeWatchDog = (() => {
  const optionMap = new WeakMap();
  const jsonMap = new WeakMap();
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const rect = entry.contentRect;
      const target = entry.target;
      const options = optionMap.get(target) || {};
      const prefix = options.prefix || 'content';
      const {width, height, top, left} = rect;
      const resultJson = JSON.stringify(rect);
      if (jsonMap.get(target) === resultJson) {
        return;
      }
      jsonMap.set(target, resultJson);
      if (options.once) {
        observer.unobserve(target);
      }

      requestIdleCallback(() => {
        target.style.setProperty(
          `--${prefix}-width`, `${width}`);
        target.style.setProperty(
          `--${prefix}-height`, `${height}`);
        //
        target.style.setProperty(
          `--${prefix}-top`, `${top}`);
        target.style.setProperty(
          `--${prefix}-left`, `${left}`);

      });
    }
  });
  const watch = (target, options = {}) => {
    optionMap.set(target, options);
    observer.observe(target);
  };
  const unwatch = (target) => {
    optionMap.delete(target);
    observer.unobserve(target);
  };
  return {watch, unwatch};
})();

const ScrollWatchDog = (() => {
  const optionMap = new WeakMap();

  const onScroll = e => {
    const options = optionMap.get(e.target) || {};
    const prefix = options.prefix || 'scroll';
    const target =
      options.target ||
      (e.target instanceof Document ? e.target.documentElement : e.target);
    const top = target.scrollTop;
    const left = target.scrollLeft;

    requestIdleCallback(() => {
      target.style.setProperty(`--${prefix}-top`, top);
      target.style.setProperty(`--${prefix}-left`, left);
      target.dataset.scrollTop = top;
      target.dataset.scrollLeft = left;
    });
  };

  const watch = (target, options = {}) => {
    optionMap.set(target instanceof Window ? target.document : target, options);
    target.addEventListener('scroll', onScroll, {passive: true, once: !!options.once});
    onScroll({target});
  };
  const unwatch = element => {
    optionMap.delete(element);
    element.removeEventListener('scroll', onScroll);
  };

  return {watch, unwatch};
})();

//===END===
export {ResizeWatchDog, ScrollWatchDog};