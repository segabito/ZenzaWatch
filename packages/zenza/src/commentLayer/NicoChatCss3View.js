import {NicoChat} from './NicoChat';
import {CommentLayer} from './CommentLayer';
import {cssUtil} from '../../../lib/src/css/css';
//===BEGIN===
class NicoChatCss3View {
  /**
   *
   * @param {NicoChatViewModel}chat
   * @param {string} type
   * @param {string} size
   * @param {{inline: string, keyframes: string}} cssText
   * @return {HTMLElement}
   */
  static buildChatDom (chat, type, size, cssText, document = window.document) {
    const span = document.createElement('span');
    const ver = chat.commentVer;
    const className = ['nicoChat', type, size];
    if (ver === 'html5') {
      className.push(ver);
    }
    if (chat.color === '#000000') {
      className.push('black');
    }

    if (chat.isDoubleResized) {
      className.push('is-doubleResized');
    } else if (chat.isLineResized) {
      className.push('is-lineResized');
    }

    if (chat.isOverflow) {
      className.push('overflow');
    }
    if (chat.isMine) {
      className.push('mine');
    }
    if (chat.isUpdating) {
      className.push('updating');
    }
    let fork = chat.fork;
    className.push(`fork${fork}`);

    // if (chat.isSubThread) {
    //   className.push('subThread');
    // }

    if (chat.isPostFail) {
      className.push('fail');
    }

    const fontCommand = chat.fontCommand;
    if (fontCommand) {
      className.push(`cmd-${fontCommand}`);
    }

    span.className = className.join(' ');
    span.id = chat.id;
    span.dataset.meta = chat.meta;

    if (!chat.isInvisible) {
      const {inline, keyframes} = cssText || {};
      if (inline) {
        span.style.cssText = inline;
      }
      span.innerHTML = chat.htmlText;
      if (keyframes) {
        const style = document.createElement('style');
        style.append(keyframes);
        span.append(style);
      }
    }
    return span;
  }

  static buildStyleElement (cssText, document = window.document) {
    const elm = document.createElement('style');
    elm.type = 'text/css';
    elm.append(cssText);
    return elm;
  }

  static buildChatHtml (chat, type, cssText, document = window.document) {
    const result = NicoChatCss3View.buildChatDom(chat, type, chat.size, cssText, document);
    result.removeAttribute('data-meta');
    return result.outerHTML;
  }

  static buildChatCss (chat, type, currentTime = 0, playbackRate = 1) {
    return type === NicoChat.TYPE.NAKA ?
      NicoChatCss3View._buildNakaCss(chat, type, currentTime, playbackRate) :
      NicoChatCss3View._buildFixedCss(chat, type, currentTime, playbackRate);
  }

  static _buildNakaCss(chat, type, currentTime, playbackRate) {
    let scaleCss;
    let id = chat.id;
    let commentVer = chat.commentVer;
    let duration = chat.duration / playbackRate;
    let scale = chat.cssScale;
    let scaleY = chat.cssScaleY;
    let beginL = chat.beginLeftTiming;
    let screenWidth = CommentLayer.SCREEN.WIDTH;
    // let screenWidthFull = NicoCommentViewModel.SCREEN.WIDTH_FULL;
    let screenHeight = CommentLayer.SCREEN.HEIGHT;
    // let width = chat.width;
    let height = chat.height;
    let ypos = chat.ypos;
    let isSub = chat.isSubThread;
    let color = chat.color;
    //color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
    let colorCss = color ? `color: ${color};` : '';
    let fontSizePx = chat.fontSizePixel;
    let lineHeightCss = '';
    if (commentVer !== 'html5') {
      lineHeightCss = `line-height: ${Math.floor(chat.lineHeight)}px;`;
    }
    let speed = chat.speed;
    let delay = (beginL - currentTime) / playbackRate;
    let slot = chat.slot;
    let zIndex =
      (slot >= 0) ?
        (slot * 1000 + chat.fork * 1000000 + 1) :
        (1000 + beginL * 1000 + chat.fork * 1000000);
    zIndex = isSub ? zIndex: zIndex * 2;
    // let time3d = '0';//`${delay * 10}px`; //${chat.time3dp * 100}px`;
    let opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';

    // 4:3ベースに計算されたタイミングを16:9に補正する
    // scale無指定だとChromeでフォントがぼけるので1.0の時も指定だけする
    // TODO: 環境によって重くなるようだったらオプションにする
    scaleCss =
      (scale === 1.0) ? 'scale3d(1, 1, 1)' : `scale3d(${scale}, ${scaleY}, 1)`;
    const outerScreenWidth = CommentLayer.SCREEN.OUTER_WIDTH_FULL;
    const screenDiff = outerScreenWidth - screenWidth;
    const leftPos = screenWidth + screenDiff / 2;
    const durationDiff = screenDiff / speed / playbackRate;
    duration += durationDiff;
    delay -= (durationDiff * 0.5);
    // 逆再生
    const reverse = chat.isReverse ? 'animation-direction: reverse;' : '';
    let isAlignMiddle = false;
    if ((commentVer === 'html5' && (height >= screenHeight - fontSizePx / 2 || chat.isOverflow)) ||
      (commentVer !== 'html5' && height >= screenHeight - fontSizePx / 2 && height < screenHeight + fontSizePx)
    ) {
        isAlignMiddle = true;
    }
    let top = isAlignMiddle ? '50%' : `${ypos}px`;
    // let transY = isAlignMiddle ? 'translateY(-50%)' : '';

    const inline = `
      --chat-trans-x: -${outerScreenWidth + chat.width*scale}px;
      --chat-trans-y: ${isAlignMiddle ? '-50' : '0'}%;
      --chat-scale-x: ${scale === 1.0 ? 1 : scale};
      --chat-scale-y: ${scale === 1.0 ? 1 : scaleY};
      position: absolute;
      will-change: transform, opacity;
      contain: layout style paint;
      line-height: 1.235;
      z-index: ${zIndex};
      top: ${top};
      left: ${leftPos}px;
      ${colorCss}
      ${lineHeightCss}
      ${opacity}
      font-size: ${fontSizePx}px;
      animation-name: idou-props;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      ${reverse}
      ${chat.isReverse ?
        `transform:
          translateX(var(--chat-trans-x))
          scale(var(--chat-scale-x), var(--chat-scale-y))
          translateY(var(--chat-trans-y));` :
        `transform:
          translate(0, 0)
          scale(var(--chat-scale-x), var(--chat-scale-y))
          translateY(var(--chat-trans-y));`
      }
    `;

    // const keyframes = `
    //   @keyframes idou-${id} {
    //     0%   {
    //       visibility: visible;
    //       transform:
    //         translate3d(0, 0, 0) ${scaleCss} ${transY};
    //     }
    //     100% {
    //       visibility: hidden;
    //       transform:
    //         translate3d(-${outerScreenWidth + chat.width*scale}px, 0, 0)
    //         ${scaleCss}
    //         ${transY};
    //     }
    //   }
    // `.trim();
    return {inline, keyframes: ''};
  }
  /**
   * @param {NicoChatViewModel} chat
   */
  static _buildFixedCss(chat, type, currentTime, playbackRate) {
    let scaleCss;
    let commentVer = chat.commentVer;
    let duration = chat.duration / playbackRate;
    let scale = chat.cssScale;// * (chat.isLineResized ? 0.5 : 1);
    let scaleY = chat.cssScaleY;
    let beginL = chat.beginLeftTiming;
    let screenHeight = CommentLayer.SCREEN.HEIGHT;
    let height = chat.height;
    let ypos = chat.ypos;
    let isSub = chat.isSubThread;
    let color = chat.color;
    // color = isSub ? util.toRgba(color ? color : '#FFFFFF', 1) : color;
    let colorCss = color ? `color: ${color};` : '';
    let fontSizePx = chat.fontSizePixel;
    let lineHeightCss = '';
    if (commentVer !== 'html5') {
      lineHeightCss = `line-height: ${Math.floor(chat.lineHeight)}px;`;
    }
    let delay = (beginL - currentTime) / playbackRate;
    let slot = chat.slot;
    let zIndex =
      (slot >= 0) ?
        (slot * 1000 + chat.fork * 1000000 + 1) :
        (1000 + beginL * 1000 + chat.fork * 1000000);
    zIndex = isSub ? zIndex: zIndex * 2;
    let time3d = '0';//`${delay * 10}px`; //${chat.time3dp * 100}px`;
    let opacity = chat.opacity !== 1 ? `opacity: ${chat.opacity};` : '';

    let top;
    let transY;

    // 画面高さに近い・超える時は上端または下端にぴったりつける
    if ((commentVer === 'html5' && height >= screenHeight - fontSizePx / 2 /*|| chat.isOverflow*/) ||
        (commentVer !== 'html5' && height >= screenHeight * 0.7)) {
      top = `${type === NicoChat.TYPE.BOTTOM ? 100 : 0}%`;
      transY = `${type === NicoChat.TYPE.BOTTOM ? -100 : 0}%`;
    } else {
      top = ypos + 'px';
      transY = '0';
    }
    scaleCss =
      scale === 1.0 ?
        `transform: scale3d(1, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});` :
        `transform: scale3d(${scale}, ${scaleY}, 1) translate3d(-50%, ${transY}, ${time3d});`;

    const inline = `
      z-index: ${zIndex};
      top: ${top};
      left: 50%;
      ${colorCss}
      ${lineHeightCss}
      ${opacity}
      font-size: ${fontSizePx}px;
      ${scaleCss}
      animation-duration: ${duration / 0.95}s;
      animation-delay: ${delay}s;
      --dokaben-scale: ${scale};
    `.trim();
    return {inline};
  }

}

//===END===
export {NicoChatCss3View};