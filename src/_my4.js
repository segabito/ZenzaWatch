// ==UserScript==
// @name           Mylist Filter
// @namespace      https://github.com/segabito/
// @description    視聴不可能な動画だけ表示して一括削除とかできるやつ
// @match          *://www.nicovideo.jp/my/mylist*
// @grant          none
// @author         名無しさん@匿名希望
// @version        0.0.1
// @run-at         document-body
// @license        public domain
// @noframes
// ==/UserScript==

import {dimport} from '../packages/lib/src/infra/dimport';
import {bounce} from '../packages/lib/src/infra/bounce';
import {cssUtil} from '../packages/lib/src/css/css';
import {PromiseHandler} from '../packages/lib/src/Emitter';

(async (window) => {
const global = {
  PRODUCT: 'MylistFilter'
};
//@require PromiseHandler
//@require dimport
//@require bounce
//@require cssUtil
  const [lit] = await Promise.all([
    dimport('https://unpkg.com/lit-html?module')
  ]);
  const {html} = lit;
  const $ = self.jQuery;

  cssUtil.addStyle(`
    .ItemSelectMenuContainer-itemSelect {
      display: grid;
      grid-template-columns: 160px 1fr
    }

    .itemFilterContainer {
      display: grid;
      background: #f0f0f0;
      grid-template-rows: 1fr 1fr;
      grid-template-columns: auto 1fr;
      user-select: none;
    }

    .itemFilterContainer-title {
      grid-row: 1 / 3;
      grid-column: 1 / 2;
      display: flex;
      align-items: center;
      white-space: nowrap;
      padding: 8px;
    }

    .playableFilter {
      grid-row: 1;
      grid-column: 2;
      padding: 4px 8px;
    }

    .wordFilter {
      grid-row: 2;
      grid-column: 2;
      padding: 0 8px 4px;
    }

    .playableFilter, .wordFilter {
      display: inline-flex;
      align-items: center;
    }

    .playableFilter .caption, .wordFilter .caption {
      display: inline-block;
      margin-right: 8px;
    }

    .playableFilter input[type="radio"] {
      transform: scale(1.2);
      margin-right: 8px;
    }

    .playableFilter label {
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
    }

    .playableFilter input[checked] + span {
      background: linear-gradient(transparent 80%, #99ccff 0%);
    }

    .wordFilter input[type="text"] {
      padding: 4px;
    }
    .wordFilter input[type="button"] {
      padding: 4px;
      border: 1px solid #ccc;
    }
  `);

  const playableFilterTpl = props => {
    const playable = props.playable || '';
    return html`
      <div class="playableFilter">
        <span class="caption">状態</span>
        <label
          data-click-command="set-playable-filter"
          data-command-param=""
        >
          <input type="radio" name="playable-filter" value=""
           ?checked=${playable !== 'playable' && playable !== 'not-playable'}>
          <span>指定なし</span>
        </label>
        <label
          data-click-command="set-playable-filter"
          data-command-param="playable"
        >
          <input type="radio" name="playable-filter" value="playable"
           ?checked=${playable === 'playable'}>
          <span>視聴可能</span>
        </label>
        <label
          data-click-command="set-playable-filter"
          data-command-param="not-playable"
        >
          <input type="radio" name="playable-filter" value="not-playable"
          ?checked=${playable === 'not-playable'}>
          <span>視聴不可</span>
        </label>
      </div>`;
  };

  const wordFilterTpl = props => {
    return html`
    <div class="wordFilter">
      <input type="text" name="word-filter" class="wordFilterInput" placeholder="キーワード"
        value=${props.word || ''}>
        <input type="button" data-click-command="clear-word-filter"
title="・✗・" value=" ✗ ">
        <small>　タイトル・マイリストコメント検索</small>
    </div>`;
  };

  const resetForm = () => {
    [...document.querySelectorAll('.itemFilterContainer input[name="playable-filter"]')]
      .forEach(r => r.checked = r.hasAttribute('checked'));
    [...document.querySelectorAll('.wordFilterInput')]
    .forEach(r => r.value = r.getAttribute('value'));
  };

  const itemFilterContainer = Object.assign(document.createElement('div'), {
    className: 'itemFilterContainer'
  });

  const render = props => {
    if (!document.body.contains(itemFilterContainer)) {
      const parentNode = document.querySelector('.ItemSelectMenuContainer-itemSelect');
      if (parentNode) {
        parentNode.append(itemFilterContainer);
      }
    }

    lit.render(html`
      <div class="itemFilterContainer-title">絞り込み</div>
      ${playableFilterTpl(props)}
      ${wordFilterTpl(props)}
    `, itemFilterContainer);

    resetForm();
  };

  let override = false;
  const overrideFilter = () => {
    if (!window.MylistHelper || override) {
      return;
    }
    override = true;
    const self = window.MylistHelper.itemFilter;
    Object.defineProperty(self, 'wordFilterCallback', {
      get: () => {
        const word = self.word.trim();

        return word ?
          item => {
            return (
              (item.item_data.title || '')       .toLowerCase().indexOf(word) >= 0 ||
              (item.item_data.description || '') .toLowerCase().indexOf(word) >= 0 ||
              (item.description || '')           .toLowerCase().indexOf(word) >= 0
            );
          } :
          () => true
        ;
      }
    });
  };

  const parseProps = () => {
    if (!location.hash || location.length <= 2) { return {}; }
    return location.hash.substring(1).split('+').reduce((map, entry) => {
      const [key, val] = entry.split('=').map(e => decodeURIComponent(e));
      map[key] = val;
      return map;
    }, {});
  };

  const update = () => {
    overrideFilter();
    const props = parseProps();
    // console.log('update form', props);
    render(props);
  };

  const init = () => {
    const _update = bounce.time(update, 100);
    _update();
    $('.content').on('nicoPageChanged', _update);
  };

  $(() => init());
})(globalThis ? globalThis.window : window);

