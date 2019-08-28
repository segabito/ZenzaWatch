import {Emitter} from '../../../lib/src/Emitter';
import {util} from '../../../../src/util';
import {NicoTextParser} from './NicoTextParser';
import {NicoChatViewModel} from './NicoChatViewModel';
import {global} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
// フォントサイズ計算用の非表示レイヤーを取得
// 変なCSSの影響を受けないように、DOM的に隔離されたiframe内で計算する。
const OffscreenLayer = config => {
  const __offscreen_tpl__ = (`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
    <meta charset="utf-8">
    <title>CommentLayer</title>
    <style type="text/css" id="layoutCss">%LAYOUT_CSS%</style>
    <style type="text/css" id="optionCss">%OPTION_CSS%</style>
    <style type="text/css">
      .nicoChat { visibility: hidden; }
    </style>
    <body>
    <div id="offScreenLayer"
      style="
        width: 4096px;
        height: 384px;
        overflow: visible;
        background: #fff;

        white-space: pre;

    "></div>
    </body></html>
      `).trim();

  let emt = new Emitter();
  let offScreenFrame;
  let offScreenLayer;
  let textField;
  let optionStyle;

  let initializeOptionCss = optionStyle => {
    let update = () => {
      let tmp = [];
      let baseFont = config.props.baseFontFamily;
      let inner = optionStyle.innerHTML;
      if (baseFont) {
        baseFont = baseFont.replace(/[;{}*/]/g, '');
        tmp.push(
          [
            '.gothic    {font-family: %BASEFONT%; }\n',
            'han_group {font-family: %BASEFONT%, Arial; }'
          ].join('').replace(/%BASEFONT%/g, baseFont)
        );
      }
      let bolder = config.props.baseFontBolder;
      if (!bolder) {
        tmp.push('.nicoChat { font-weight: normal !important; }');
      }
      let newCss = tmp.join('\n');
      if (inner !== newCss) {
        optionStyle.innerHTML = newCss;
        global.emitter.emit('updateOptionCss', newCss);
      }
    };
    update();
    config.onkey('baseFontFamily', update);
    config.onkey('baseFontBolder', update);
  };

  const initialize = () => {
    if (offScreenFrame) {
      return;
    }
    window.console.time('createOffscreenLayer');
    let frame = document.createElement('iframe');
    offScreenFrame = frame;
    frame.loading = 'eager';
    frame.className = 'offScreenLayer';
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.style.position = 'fixed';
    frame.style.top = '200vw';
    frame.style.left = '200vh';
    document.body.append(frame);


    let layer;
    let onload = () => {
      frame.onload = null;
      if (util.isChrome()) { frame.removeAttribute('srcdoc'); }

      console.log('%conOffScreenLayerLoad', 'background: lightgreen;');
      createTextField();

      let doc = offScreenFrame.contentWindow.document;
      layer = doc.getElementById('offScreenLayer');
      optionStyle = doc.getElementById('optionCss');
      initializeOptionCss(optionStyle);
      offScreenLayer = {
        getTextField: () => textField,
        appendChild: elm => {
          layer.append(elm);
        },
        removeChild: elm => {
          layer.removeChild(elm);
        },
        getOptionCss: () => optionStyle.innerHTML
      };

      window.console.timeEnd('createOffscreenLayer');
      emt.emitResolve('GetReady!', offScreenLayer);
    };

    let html = __offscreen_tpl__
      .replace('%LAYOUT_CSS%', NicoTextParser.__css__)
      .replace('%OPTION_CSS%', '');
    if (typeof frame.srcdoc === 'string') {
      frame.onload = onload;
      frame.srcdoc = html;
    } else {
      // MS IE/Edge用
      const fcd = frame.contentWindow.document;
      fcd.open();
      fcd.write(html);
      fcd.close();
      window.setTimeout(onload, 0);
    }
  };

  const getLayer = _config => {
    config = _config || config;
    initialize();
    return emt.promise('GetReady!');
  };

  let createTextField = () => {
    let layer = offScreenFrame.contentWindow.document.getElementById('offScreenLayer');

    let span = document.createElement('span');
    span.className = 'nicoChat';
    let scale = NicoChatViewModel.BASE_SCALE;
    config.on('baseChatScale', v => scale = v);

    textField = {
      setText: text => {
        span.innerHTML = text;
      },
      setType: (type, size, fontCommand, ver) => {
        fontCommand = fontCommand ? `cmd-${fontCommand}` : '';
        span.className = `nicoChat ${type} ${size} ${fontCommand} ${ver}`;
      },
      setFontSizePixel: pixel => {
        span.style.fontSize = `${pixel}px`;
      },
      getOriginalWidth: () => span.offsetWidth,
      getWidth: () => span.offsetWidth * scale,
      getOriginalHeight: () => span.offsetHeight,
      getHeight: () => span.offsetHeight * scale
    };

    layer.append(span);

    return span;
  };

  return {
    get: getLayer,
    getOptionCss: () => optionStyle.innerHTML
  };
};
//===END===

export {OffscreenLayer};