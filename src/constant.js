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
  let dt = new Date().toISOString();
  // if (/^\d{4}-(03-09|08-31)/.test(dt)) {
    vars['scrollbar-thumb-color'] = vars['hatsune-color'];
  // }

  return '#zenzaVideoPlayerDialog, .zenzaRoot {\n' +
      Object.keys(vars).map(key => `--${key}: ${vars[key]};`).join('\n') +
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
    transform: scale(var(--zenza-ui-scale, 1));
  }
`.trim();


CONSTANT.SCROLLBAR_CSS = `
  .videoInfoTab::-webkit-scrollbar,
  #listContainer::-webkit-scrollbar,
  .zenzaCommentPreview::-webkit-scrollbar,
  .mylistSelectMenuInner::-webkit-scrollbar {
    background: var(--scrollbar-bg-color);
  }

  .videoInfoTab::-webkit-scrollbar-thumb,
  #listContainer::-webkit-scrollbar-thumb,
  .zenzaCommentPreview::-webkit-scrollbar-thumb,
  .mylistSelectMenuInner::-webkit-scrollbar-thumb {
    border-radius: 0;
    background: var(--scrollbar-thumb-color);
  }

  .videoInfoTab::-webkit-scrollbar-button,
  #listContainer::-webkit-scrollbar-button,
  .zenzaCommentPreview::-webkit-scrollbar-button,
  .mylistSelectMenuInner::-webkit-scrollbar-button {
    display: none;
  }
`.trim();
//===END===

export {CONSTANT};
