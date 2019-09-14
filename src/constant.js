//===BEGIN===

const CONSTANT = {
  BASE_Z_INDEX: 100000,

  CONTROL_BAR_HEIGHT: 40,

  SIDE_PLAYER_WIDTH: 400,
  SIDE_PLAYER_HEIGHT: 225,

  BIG_PLAYER_WIDTH: 896,
  BIG_PLAYER_HEIGHT: 480,

  RIGHT_PANEL_WIDTH: 320,
  BOTTOM_PANEL_HEIGHT: 240,

  // video.src クリア用。
  // 空文字だとbase hrefと連結されて http://www.nicovideo.jp が参照されるという残念な理由で // を指定している
  BLANK_VIDEO_URL: '//',

  BLANK_PNG: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQYV2NgYGD4DwABBAEAcCBlCwAAAABJRU5ErkJggg==',

  MEDIA_ERROR: {
    MEDIA_ERR_ABORTED: 1,
    MEDIA_ERR_NETWORK: 2,
    MEDIA_ERR_DECODE: 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED: 4
  }

};

CONSTANT.BASE_CSS_VARS = (() => {
  const vars = {
    'base-bg-color': '#333',
    'base-fore-color': '#ccc',
    'light-text-color': '#fff',
    'scrollbar-bg-color': '#222',
    'scrollbar-thumb-color': '#666',
    'item-border-color': '#888',
    'hatsune-color': '#039393',
    'enabled-button-color': '#9cf'
  };
  const dt = new Date().toISOString();
  // if (/^\d{4}-(03-09|08-31)/.test(dt)) {
    vars['scrollbar-thumb-color'] = vars['hatsune-color'];
  // }

  return '#zenzaVideoPlayerDialog, .zenzaRoot {\n' +
      Object.keys(vars).map(key => `--${key}:${vars[key]};`).join('\n') +
  '\n}';
})();
CONSTANT.COMMON_CSS = `
  ${CONSTANT.BASE_CSS_VARS}

  .xDomainLoaderFrame {
    border: 0;
    position: fixed;
    top: -999px;
    left: -999px;
    width: 1px;
    height: 1px;
    border: 0;
    contain: paint;
  }

  .ZenButton {
    display: none;
    opacity: 0.8;
    position: absolute;
    z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
    cursor: pointer;
    font-size: 8pt;
    width: 32px;
    height: 26px;
    padding: 0;
    line-height: 26px;
    font-weight: bold;
    text-align: center;
    transition: box-shadow 0.2s ease, opacity 0.4s ease;
    user-select: none;
    transform: translate(-50%, -50%);
    contain: layout style;
  }
  .ZenButton:hover {
    opacity: 1;
  }
    .ZenButtonInner {
      background: #eee;
      color: #000;
      border: outset 1px;
      box-shadow: 2px 2px rgba(0, 0, 0, 0.8);
    }
    .ZenButton:active .ZenButtonInner {
      border: inset 1px;
      transition: translate(2px, 2px);
      box-shadow: 0 0 rgba(0, 0, 0, 0.8);
    }

  .ZenButton.show {
    display: inline-block;
  }

  .zenzaPopupMenu {
    display: block;
    position: absolute;
    background: var(--base-bg-color);
    color: #fff;
    overflow: visible;
    border: 1px solid var(--base-fore-color);
    padding: 0;
    opacity: 0.99;
    box-sizing: border-box;
    transition: opacity 0.3s ease;
    z-index: ${CONSTANT.BASE_Z_INDEX + 50000};
    user-select: none;
  }

  .zenzaPopupMenu:not(.show) {
    transition: none;
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .zenzaPopupMenu ul {
    padding: 0;
  }

  .zenzaPopupMenu ul li {
    position: relative;
    margin: 2px 4px;
    white-space: nowrap;
    cursor: pointer;
    padding: 2px 8px;
    list-style-type: none;
    float: inherit;
  }
  .zenzaPopupMenu ul li + li {
    border-top: 1px dotted var(--item-border-color);
  }

  .zenzaPopupMenu li.selected {
    font-weight: bolder;
  }

  .zenzaPopupMenu ul li:hover {
    background: #663;
  }
  .zenzaPopupMenu ul li.separator {
    border: 1px outset;
    height: 2px;
    width: 90%;
  }
  .zenzaPopupMenu li span {
    box-sizing: border-box;
    margin-left: 8px;
    display: inline-block;
    cursor: pointer;
  }
  .zenzaPopupMenu ul li.selected span:before {
    content: '✔';
    left: 0;
    position: absolute;
  }
  .zenzaPopupMenu.show {
    opacity: 0.8;
  }
  .zenzaPopupMenu .caption {
    padding: 2px 4px;
    text-align: center;
    margin: 0;
    font-weight: bolder;
    background: #666;
    color: #fff;
  }
  .zenzaPopupMenu .triangle {
    position: absolute;
    width: 16px;
    height: 16px;
    border: 1px solid #ccc;
    border-width: 0 0 1px 1px;
    background: #333;
    box-sizing: border-box;
  }

  body.showNicoVideoPlayerDialog #external_nicoplayer {
    transform: translate(-9999px, 0);
  }

  #ZenzaWatchVideoPlayerContainer .atsumori-root {
    position: absolute;
    z-index: 10;
  }

  #zenzaVideoPlayerDialog.is-guest .forMember {
    display: none;
  }
  #zenzaVideoPlayerDialog .forGuest {
    display: none;
  }
  #zenzaVideoPlayerDialog.is-guest .forGuest {
    display: inherit;
  }

  .scalingUI {
    transform: scale(var(--zenza-ui-scale));
  }
`.trim();


CONSTANT.SCROLLBAR_CSS = `
  .videoInfoTab::-webkit-scrollbar,
  #listContainer::-webkit-scrollbar,
  .zenzaCommentPreview::-webkit-scrollbar,
  .mylistSelectMenuInner::-webkit-scrollbar {
    background: var(--scrollbar-bg-color);
    width: 16px;
  }

  .videoInfoTab::-webkit-scrollbar-thumb,
  #listContainer::-webkit-scrollbar-thumb,
  .zenzaCommentPreview::-webkit-scrollbar-thumb,
  .mylistSelectMenuInner::-webkit-scrollbar-thumb {
    border-radius: 0;
    background: var(--scrollbar-thumb-color);
    will-change: transform;
  }

  .videoInfoTab::-webkit-scrollbar-button,
  #listContainer::-webkit-scrollbar-button,
  .zenzaCommentPreview::-webkit-scrollbar-button,
  .mylistSelectMenuInner::-webkit-scrollbar-button {
    display: none;
  }
`.trim();

const NICORU = 'data:image/png;base64,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';
//===END===

export {CONSTANT, NICORU};
