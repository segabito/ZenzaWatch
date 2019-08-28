import {ThumbInfoLoader} from './ThumbInfoLoader';
const _ = {
  throttle: () => {}
};
//===BEGIN===

const VideoItemObserver = (() => {

  let intersectionObserver;
  const mutationMap = new WeakMap();

  const onItemInview = async (item, watchId) => {
    const result = await ThumbInfoLoader.load(watchId).catch(() => null);
    item.classList.remove('is-fetch-current');
    if (!result || result.status === 'fail' || result.code === 'DELETED') {
      if (result && result.code !== 'COMMUNITY') {
        // console.error('empty data', watchId, result, result.data ? result.code : 'unknown');
      }
      item.classList.add('is-fetch-failed', (result) ? result.code : 'is-no-data');
    } else {
      // watchId = (result.data.id || '').startsWith('so') ? result.data.id : watchId;
      // item.dataset.watchId = watchId;
      item.dataset.thumbInfo = JSON.stringify({data: result});
    }
  };

  const initIntersectionObserver = onItemInview => {
    if (intersectionObserver) {
      return intersectionObserver;
    }
    const _onInview = item => {
      item.classList.add('is-fetch-current');
      onItemInview(item, item.dataset.videoId);
    };

    intersectionObserver = new window.IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach(entry => {
        const item = entry.target;
        intersectionObserver.unobserve(item);
        _onInview(item);
      });
    }, { rootMargin: '200px' });

    return intersectionObserver;
  };


  const initMutationObserver = ({query, container}) => {
    let mutationObserver = mutationMap.get(container);
    if (mutationObserver) {
      return mutationObserver;
    }
    const update = () => {
      const items = (container || document).querySelectorAll(query);
      if (!items || items.length < 1) { return; }
      if (!items || items.length < 1) { return; }
      for (const item of items) {
        if (item.classList.contains('is-fetch-ignore')) { continue; }
        item.classList.add('is-fetch-wait');
        intersectionObserver.observe(item);
      }
    };
    // update();

    const onUpdate = _.throttle(update, 1000);

    mutationObserver = new MutationObserver(mutations => {
      const isAdded = mutations.find(
        mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
      if (isAdded) { onUpdate(); }
    });

    mutationObserver.observe(
      container,
      {childList: true, characterData: false, attributes: false, subtree: true}
    );
    mutationMap.set(container, mutationObserver);
    return mutationObserver;
  };

  const observe = ({query, container} = {}) => {
    if (!window.IntersectionObserver || !window.MutationObserver) {
      return;
    }
    if (!container) {
      return;
    }
    query = query || 'zenza-video-item';
    initIntersectionObserver(onItemInview);
    initMutationObserver({query, container});
  };

  const unobserve = ({container}) => {
    let mutationObserver = mutationMap.get(container);
    if (!mutationObserver) {
      return;
    }
    mutationObserver.disconnect();
    mutationMap.delete(container);
  };


  return {observe, unobserve};
})();
//===END===

export {VideoItemObserver};