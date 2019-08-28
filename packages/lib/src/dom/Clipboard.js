import {Fullscreen} from './Fullscreen';

//===BEGIN===
const Clipboard = {
  copyText: text => {
    if (navigator.clipboard) { // httpsじゃないと動かない
      return navigator.clipboard.writeText(text);
    }
    let clip = document.createElement('input');
    clip.type = 'text';
    clip.style.position = 'fixed';
    clip.style.left = '-9999px';
    clip.value = text;
    const node = Fullscreen.element || document.body;
    node.appendChild(clip);
    clip.select();
    document.execCommand('copy');

    window.setTimeout(() => clip.remove(), 0);
  }
};
//===END===
export {Clipboard};