import {BaseCommandElement} from './BaseCommandElement.js';
import {util} from '../util/util.js';
// import {VideoItemElement, VideoItemProps} from './VideoItemElement';
import {VideoSearchFormElement} from './VideoSearchFormElement';
import {defineElement} from '../../../lib/src/defineElement';
// console.info('BaseCommandElement', BaseCommandElement);
const {ItemDataConverter} = util;

//===BEGIN===



const {VideoListElement} = (() => {
  const SortSelectorProps = {
    type: '',
    sortKey: '',
    defaultSortKey: ''
  };
  const SortSelectorAttributes = Object.keys(SortSelectorProps).map(prop => BaseCommandElement.toAttributeName(prop));

  class SortSelector extends BaseCommandElement {
    static get propTypes() {
      return SortSelectorProps;
    }

    static get defaultProps() {
      return SortSelectorProps;
    }

    static get observedAttributes() {
      return SortSelectorAttributes;
    }

    static get defaultState() {
      return {};
    }

    static getSortOptions(srcType) {
      switch (srcType) {
        case 'mylist':
        case 'deflist':
          return this.mylistSortOptions;
        default:
          return this.videoSortOptions;
      }
    }

    static getOptionByKey(sortKey, type) {
      const options = this.getSortOptions(type);
      return options.find(option => {
        return sortKey === option.sortKey;
      }) || { number: -1, sortKey: '', text: '' };
    }

    static getOptionByNumber(number, type) {
      const options = this.getSortOptions(type);
      number *= 1;
      return options.find(option => {
        return number === option.number;
      }) || { number: -1, sortKey: '', text: '' };
    }

    static get videoSortOptions() {
      return this.mylistSortOptions.filter(option => ![0, 1, 2, 3].includes(option.number));
    }

    static get mylistSortOptions() {
      return [
        { number: 0, sortKey: '-createdAt', text: '登録が新しい順' },
        { number: 1, sortKey: '+createdAt', text: '登録が古い順' },
        { number: 2, sortKey: '+mylistComment', text: 'マイリストコメント昇順' },
        { number: 3, sortKey: '-mylistComment', text: 'マイリストコメント降順' },
        { number: 4, sortKey: '+title', text: 'タイトル昇順' },
        { number: 5, sortKey: '-title', text: 'タイトル降順' },
        { number: 6, sortKey: '-postedAt', text: '投稿が新しい順' },
        { number: 7, sortKey: '+postedAt', text: '投稿が古い順' },
        { number: 8, sortKey: '-viewCount', text: '再生が多い順' },
        { number: 9, sortKey: '+viewCount', text: '再生が少ない順' },
        { number: 10, sortKey: '-updatedAt', text: 'コメントが新しい順' },
        { number: 11, sortKey: '+updatedAt', text: 'コメントが古い順' },
        { number: 12, sortKey: '-commentCount', text: 'コメントが多い順' },
        { number: 13, sortKey: '+commentCount', text: 'コメントが少ない順' },
        { number: 14, sortKey: '-mylistCount', text: 'マイリスト登録が多い順' },
        { number: 15, sortKey: '+mylistCount', text: 'マイリスト登録が少ない順' },
        { number: 16, sortKey: '-duration', text: '時間が長い順' },
        { number: 17, sortKey: '+duration', text: '時間が短い順' },
      ];
    }

    static async getTemplate(state = {}, props = {}, events = {}) {
      let { html } = await this.importLit();
      const options = this.getSortOptions(props.type);
      const defaultOption = this.getOptionByNumber(props.defaultSort);
      return html`
        <div class="root" id="root" @click=${events.onClick}>
          <style>
            * {
              background-color: var(--list-bg-color, #666);
              color: var(--list-text-color, #ccc);
            }

            .root {
              display: flex;
              min-width: 320px;
              font-size: 16px;
            }

            .select {
              font-size: inherit;
              flex: 1;
            }

            .submit {
              font-size: inherit;
              width: 60px;
              outline: none;
              cursor: pointer;
            }

          </style>
          <select class="select">
            <option value="${defaultOption ? defaultOption.sortKey : props.sortKey}"
            >並び替え</option>
            ${options.map(option =>
              html`<option
                value="${option.sortKey}"
                data-sort-number="${option.number}"
                ?selected=${option.sortKey === props.sortKey}
              >${option.text}</option>`
            )}
          </select>
          <button class="submit" data-command="submit">&#9166;</button>
        </div>
      `;
    }

    async connectedCallback() {
      await super.connectedCallback();
    }

    onCommand(e) {
      const {command, param} = e.detail;
      switch (command) {
        case 'submit':
          e.stopPropagation();
          e.preventDefault();
          this.dispatchCommand('change-sort-key', this._root.querySelector('.select').value);
          break;
      }
    }

    get sortKey() {
      return this.props.sortKey;
    }

  }

    defineElement('zenza-video-sort-selector', SortSelector);
    defineElement('zenza-video-search-form', VideoSearchFormElement);



  const VideoListProps = {
    id: '',
    title: '',
    description: '',
    query: '',
    defaultSortKey: '',
    sortKey: '',
    items: [],
    srcType: '',
    apiResponse: {}
  };

  const VideoListAttributes = Object.keys(VideoListProps).map(prop => BaseCommandElement.toAttributeName(prop));

  class VideoListElement extends BaseCommandElement {

    static get propTypes() {
      return VideoListProps;
    }

    static get defaultProps() {
      return VideoListProps;
    }

    static get observedAttributes() {
      return VideoListAttributes;
    }

    static get defaultState() {
      return {
        sortKey: '',
        sort: -1,
        items: [],
        isLoading: false,
        userSorted: false
      };
    }

    static async getTemplate(state = {}, props = {}, events = {}) {
      let {html} = await this.importLit();

      const ITEM_HEIGHT = 100;
      const title = props.title || '';
      const items = state.items;
      const isEmpty = items.length < 1;
      const classes = [];
      isEmpty && classes.push('is-empty');
      state.isLoading && classes.push('is-loading');
      return html`
    <div id="root" @click=${events.onClick} class="${classes.join(' ')}">
    <style>
      *, *::after, *::before {
        box-sizing: border-box;
      }
      #root {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        user-select: none;
        background-color: var(--list-bg-color, #666);
        color: var(--list-text-color, #ccc);
        contain: strict;
      }

      #root.is-loading {
        cusror: wait;
      }
      #root.is-loading * {
        pointer-events: none;
        opacity: 0.5;
      }

      *::-webkit-scrollbar {
        background: var(--scrollbar-bg-color, #222);
      }

      *::-webkit-scrollbar-thumb {
        border-radius: 0;
        background: var(--scrollbar-thumb-color, #039393);
      }

      *::-webkit-scrollbar-button {
        display: none;
      }

      .title {
        padding: 4px 8px;
        font-weight: bold;
        white-space: nowrap;
        user-select: auto;
        ovewflow: hidden;
        text-overflow: ellipsis;
      }

      .listContainer {
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        contain: strict;
      }

      .videoList {
        transition: 0.2s opacity;
        counter-reset: itemIndex;
      }

      .is-empty .videoList {
        display: none;
      }

      .videoListInner {
        display: grid;
        grid-auto-rows: ${ITEM_HEIGHT}px;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }

      .is-scrolling .videoListInner {
        pointer-events: none;
        animation-play-state: paused !important;
      }

      .videoItem {
        display: inline-block;
        width: 100%;
        height: 100%;
        contain: strict;
      }

      .videoItem + .videoItem {
        border-top: 1px dotted;
      }

      .scrollToTop {
        position: fixed;
        width: 32px;
        height: 32px;
        right: 32px;
        bottom: 48px;
        font-size: 24px;
        line-height: 32px;
        text-align: center;
        z-index: 100;
        background: #ccc;
        color: #000;
        border-radius: 100%;
        cursor: pointer;
        opacity: 0.3;
        transition: opacity 0.4s ease;
      }

      .scrollToTop:hover {
        opacity: 0.9;
        box-shadow: 0 0 8px #fff;
      }

      .foot {
        height: 48px;
        background: #666;
      }

      </style>
      ${(props.srcType === 'search' || props.srcType === 'tag') ?
        html`<zenza-video-search-form class="searchForm" data-query=${props.query}></zenza-video-search-form>` :
        html`
          <div class="head">
            <div class="title">${title}</div>
          </div>
          <zenza-video-sort-selector data-sort-key="${state.sortKey}" data-type="${props.srcType}"></zenza-video-sort-selector>
        `
      }

      <div class="listContainer">
        <div class="videoList">
          <div class="videoListInner">
            ${items.map((item) => html`
              <zenza-video-item class="videoItem lazy"
                data-watch-id="${item.watchId || item.videoId}"
                data-video-id="${item.videoId}"
                data-title="${item.title}"
                data-description="${item.description || ''}"
                data-owner-id="${item.ownerId || 0}"
                data-owner-name="${item.ownerName || 'ゲスト'}"
                data-duration="${item.duration}"
                data-comment-count="${item.commentCount}"
                data-mylist-count="${item.mylistCount}"
                data-view-count="${item.viewCount}"
                data-thumbnail="${item.thumbnail}"
                data-posted-at="${item.postedAt}"
                data-created-at="${item.createdAt}"
                data-updated-at="${item.updatedAt}"
                data-is-channel="${!!item.isChannel}"
                data-is-mymemory="${!!item.isMymemory}"
                data-mylist-comment="${item.mylistComment || ''}"
                data-lazyload="true"
              />`
            )}
          </div>
        </div>
      </div>
      <div class="scrollToTop" title="一番上にスクロール" data-command="scroll-to-top">&#x2303;</div>
      <div class="foot">
        <slot name="foot-buttons"></slot>
      </div>
   </div>`;
    }

    static sortByKey(items, sortKey) {
      const func = sortKey.charAt(0) === '-' ?
        (a, b) => { return a[sortKey] < b[sortKey] ? 1 : -1; } : // desc
        (a, b) => { return a[sortKey] > b[sortKey] ? 1 : -1; } ; // asc
      sortKey = sortKey.substring(1);
      sortKey = sortKey === 'title' ? '_sortTitle' : sortKey;
      return items.concat().sort(func);
    }

    _applyFlapiMylist(data) {
      const items = (data.list || data.mylistitem || [])
        .map(item => ItemDataConverter.fromFlapiMylistItem(item));
      const req = data._req || {};
      const title = data.name || this.dataset.title || '';
      const query = `mylist/${data.id || req.id}`;
      const sort = (data.default_sort || 0) * 1;
      const sortKey = req.params.sortKey || SortSelector.getOptionByNumber(sort, 'mylist').sortKey;
      this.state.sortKey = sortKey;
      this.state.userSorted = false;
      this.state.items = items.concat();
      this.props.items = items;
      Object.assign(this.dataset, {
        id: data.id || req.id || '',
        srcType: 'mylist',
        title,
        query,
        sortKey,
        defaultSortKey: sortKey
      });
    }

    _applyDeflist(data) {
      const req = data._req || {};
      const items = (data.mylistitem || [])
        .map(item => ItemDataConverter.fromDeflistItem(item));
      const title = (req.id ? req.title : 'とりあえずマイリスト') || this.dataset.title || `マイリスト mylist/${req.id}`;
      const query = req.id ? data.req.query : 'deflist';
      const sortKey = req.params.sortKey || '-createdAt';
      const srcType = req.id ? 'mymylist' : 'deflist';
      this.state.sortKey = sortKey;
      this.state.userSorted = false;
      this.state.items = items.concat();
      this.props.items = items;
      Object.assign(this.dataset, {
        id: req.id || '',
        srcType,
        title,
        query,
        sortKey,
        defaultSortKey: sortKey
      });
    }

    _applyUploadedVideo(data) {
      const req = data._req || {};
      const items = (data.list || data.mylistitem || [])
        .map(item => ItemDataConverter.fromUploadedVideo(item));
      const title = req.title || `投稿動画一覧 user/${req.id}`;
      const query = req.query || '';
      const sortKey = req.params.sortKey || '-postedAt';
      this.state.srcType = 'uploaded';
      this.state.userSorted = false;
      this.state.items = items.concat();
      this.props.items = items;
      Object.assign(this.dataset, {
        id: req.id || '',
        srcType: 'user',
        title,
        query,
        sortKey,
        defaultSortKey: sortKey
      });
    }

    _applyVideoSearch(data) {
      const req = data._req || {};
      const items = (data.list || [])
        .map(item => ItemDataConverter.fromSearchApiV2(item));
      const title = `${req.type === 'tag' ? 'タグ検索' : 'キーワード検索'}: 「${req.id}」`;
      const query = req.query || '';
      const sortKey = req.sort || '-f';
      this.state.sortKey = sortKey;
      this.state.userSorted = true;
      this.state.items = items.concat();
      this.props.items = items;
      Object.assign(this.dataset, {
        id: req.id,
        srcType: req.type,
        title,
        query,
        sortKey,
        defaultSortKey: sortKey
      });
    }


    attributeChangedCallback(attr, oldValue, newValue) {
      switch (attr) {
        case 'data-api-response': {
          const data = JSON.parse(newValue);
          if (!data._req || data.status !== 'ok') {
            return;
          }
          this._listContainer && (this._listContainer.scrollTop = 0);
          switch (data._req.type) {
            case 'mylist':
              this._applyFlapiMylist(data);
              break;
            case 'user':
              this._applyUploadedVideo(data);
              break;
            case 'mymylist':
            case 'deflist':
              this._applyDeflist(data);
              break;
            case 'search':
            case 'tag':
              this._applyVideoSearch(data);
              break;
          }
          this.refreshObserver();
          return;
        }
        case 'data-sort-key': {
            if (this.state.sortKey === newValue) {
              return;
            }
            const items =
              newValue ? this.constructor.sortByKey(this.state.items, newValue) : this.props.items.concat();
            this.setState({
              sortKey: newValue,
              items
            });
          }
          break;
      }
      return super.attributeChangedCallback(attr, oldValue, newValue);
    }

    initIntersectionObserver() {
      if (this.observer) {
        this.observer.disconnect();
      }
      const onInview = (inviews, observer) => {
        for (const elm of inviews) {
          observer.unobserve(elm);
          elm.dataset.lazyload = false;
          elm.classList.remove('lazy');
        }
      };
      const observer = this.observer = new IntersectionObserver(entries => {
        const inviews =
          entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
        if (inviews.length) {
          onInview(inviews, observer);
        }
      }, {
        root: this._listContainer || document
      });

      this.mutationObserver && this.mutationObserver.disconnect();
      this.mutationObserver = new MutationObserver(mutations => {
        const isAdded =
          mutations.some(mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
        if (isAdded) { this.refreshObserver(); }
      });

      this.mutationObserver.observe(
        this._root.querySelector('.videoListInner'),
        {childList: true, characterData: false, attributes: false, subtree: false}
      );

      this.refreshObserver();
    }

    refreshObserver() {
      if (!this.observer) {
        return;
      }
      for (const elm of Array.from(this._root.querySelectorAll('.videoItem.lazy'))) {
        this.observer.observe(elm);
      }
    }

    async connectedCallback() {
      await super.connectedCallback();
      this._sortSelector = this._root.querySelector('zenza-video-sort-selector');
      this._listContainer = this._root.querySelector('.listContainer');
      this.initIntersectionObserver();
      if (this.dataset.initialQuery) {
        this.dispatchCommand('fetch-by-query', {target: this, query: this.dataset.initialQuery});
        this.initialQuery = '';
      }
    }

    async disconnectedCallback() {
      await super.disconnectedCallback();
      if (this.observer) {
        this.observer.unobserve();
      }
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      this.inviews = [];
      this.observer = this.mutationObserver = null;
    }

    onCommand(e) {
      const {command, param} = e.detail;
      switch (command) {
        case 'change-sort-key':
          this._listContainer.scrollTop = 0;
          this.dataset.sortKey = param;
          this.state.userSorted = true;
          break;
        case 'shuffle':
          this._listContainer.scrollTop = 0;
          this.setState({
            items: this.state.items.concat().sort(() => Math.random() - 0.5),
            userSorted: true
          });
          break;
        case 'scroll-to-top':
          this._listContainer.scrollTop = 0;
          break;
        case 'send-playlist-items': {
          const items = this.videoListItemsRawData;
          if (!this.state.userSorted && ['-createdAt', '-postedAt'].includes(this.state.sortKey)) {
            items.reverse();
          } else if (['tag', 'search'].includes(this.props.srcType) && this.props.sort === '-f') {
            items.reverse();
          }
          e.detail.param = items;
        }
          break;
        case 'fetch-by-query':
          param.target = this;
          return;
        case 'toggle-favorite':
          e.detail.param = this.query;
          break;
        default:
          return;
      }
      e.stopPropagation();
      e.preventDefault();
    }

    get query() {
      switch (this.props.srcType) {
        case 'search':
          return this._root.querySelector('.searchForm').query;
        case 'mylist':
        default:
          return util.NicoQuery.build(
            this.props.srcType,
            this.props.id,
            {sort: this.state.sortKey, title: this.props.title}
          );
      }
    }

    get videoListItemsRawData() {
      const items = this.state.userSorted ? this.state.items : this.props.items;
      return items.map(item => {
        return Object.assign({}, item, {
          length_seconds: item.duration,
          num_res: item.commentCount,
          mylist_counter: item.mylistCount,
          view_counter: item.viewCount,
          thumbnail_url: item.thumbnail,
          first_retrieve: util.dateToString(new Date(item.postedAt))
        });
      });
    }
  }



  return {VideoListElement};
})();


//===END===

export {VideoListElement};