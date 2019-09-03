import {workerUtil} from '../infra/workerUtil';
//===BEGIN===

const TextLabel = (() => {
  const func = function(self) {
    const items = {};

    const getId = function() {return `id${this.id++}`;}.bind({id: 0});

    const create = async ({canvas, style}) => {
      const id = getId();
      const ctx = canvas.getContext('2d', {
        desynchronized: true,
        // preserveDrawingBuffer: true
      });
      items[id] = {
        canvas, style, ctx, text: ''
      };
      return setStyle({id, style});
    };

    const setStyle = ({id, style, name}) => {
      const item = items[id];
      if (!item) { throw new Error('known id', id); }
      name = name || 'label';
      const {canvas, ctx} = item;
      item.text = '';
      style.widthPx && (canvas.width = style.widthPx * style.ratio);
      style.heightPx && (canvas.height = style.heightPx * style.ratio);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return {id, text: ''};
    };

    const drawText = ({id, text}) => {
      const item = items[id];
      if (!item) { throw new Error('known id', id); }
      const {canvas, ctx, style} = item;
      if (item.text === text) {
        return;
      }
      ctx.beginPath();
      ctx.font = `${style.fontWeight || ''} ${style.fontSizePx ? `${style.fontSizePx * style.ratio}px` : ''} ${style.fontFamily || ''}`.trim();
      const measured = ctx.measureText(text);
      let {width, height} = measured;
      height = (height || style.fontSizePx) * style.ratio;
      const left = (canvas.width - width) / 2;
      const top = canvas.height - (canvas.height - height) / 2;
      ctx.fillStyle = style.color;
      ctx.textAlign = style.textAlign;
      ctx.textBaseline = 'bottom';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillText(text, left, top);
      ctx.commit && ctx.commit();
      return {id, text};
    };

    const dispose = ({id}) => {
      delete items[id];
    };

    self.onmessage = async ({command, params}) => {
      switch (command) {
        case 'create':
          return create(params);
        case 'style':
          return setStyle(params);
        case 'drawText':
          return drawText(params);
        case 'dispose':
          return dispose(params);
      }
    };
  };

  const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;
  const getContainerStyle = ({container, canvas, ratio}) => {
    let style = window.getComputedStyle(container || document.body);
    ratio = ratio || window.devicePixelRatio;
    const width = (container.offsetWidth || canvas.width) * ratio;
    const height = (container.offsetHeight || canvas.height) * ratio;
    if (!width || !height) {
      style = window.getComputedStyle(document.body);
    }
    return {
      width,
      height,
      font: style.font,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      fontSizePx: style.fontSize.replace(/[a-z]/g, '') * 1,
      color: style.color,
      backgroundColor: style.backgroundColor,
      textAlign: style.textAlign,
      ratio
    };
  };

  const NAME = 'TextLabelWorker';

  let worker;
  const create = async ({container, canvas, ratio, name, style, text}) => {
    style = style || {};
    // 大した負荷じゃないしRetina前提にしてしまう
    ratio = Math.max(ratio || window.devicePixelRatio || 2, 2);
    style.ratio = style.ratio || ratio;
    name = name || 'label';
    if (!canvas) {
      canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        width: `${style.widthPx}px` || '100%',
        height: `${style.heightPx}px` || '100%',
        backgroundColor: style.backgroundColor || ''
      });
      container && container.append(canvas);
      style.widthPx &&  (canvas.width = Math.max(style.widthPx * ratio));
      style.heightPx && (canvas.height = Math.max(style.heightPx * ratio));
    }
    canvas.dataset.name = name;

    const containerStyle = getContainerStyle({container, canvas, ratio});
    style.fontFamily = style.fontFamily || containerStyle.fontFamily;
    style.fontWeight = style.fontWeight || containerStyle.fontWeight;
    style.color      = style.color      || containerStyle.color;

    if (!isOffscreenCanvasAvailable) {
      worker = worker || {
        name: NAME,
        onmessage: () => {},
        post: ({command, params}) => worker.onmessage({command, params})
      };
      func(worker);
    } else {
      worker = worker || workerUtil.createCrossMessageWorker(func, {name: NAME});
    }
    const layer = isOffscreenCanvasAvailable ? canvas.transferControlToOffscreen() : canvas;

    const init = await worker.post(
      {command: 'create', params: {canvas: layer, style, name}},
      {transfer: [layer]}
    );
    const id = init.id;

    const result = {
      container,
      canvas,
      style() {
        init.text = '';
        const style = getContainerStyle({container, canvas});
        return worker.post({command: 'style', params: {id, style, name}});
      },
      async drawText(text) {
        if (init.text === text) {
          return;
        }
        const result = await worker.post({command: 'drawText', params: {id, text}});
        init.text = result.text;
      },
      get text() { return init.text; },
      set text(t) { this.drawText(t); },
      dispose: () => worker.post({command: 'dispose', params: {id}})
    };
    text && (result.text = text);
    return result;
  };
  return {create};
})();

//===END===
// (() => {
//   const ddd = document.createElement('div');
//   const ccc = document.createElement('canvas');
//   ddd.id = 'AAAAAAAAAAAAAAAA';
//   Object.assign(ddd.style, {
//     display: 'inline-block', position: 'fixed', left: 0, top: 0, zIndex: 10000, background: '#666',
//     width: '44px', height: '24px', fontSize: '12px', color: '#fff'
//   });
//   Object.assign(ccc.style, {
//     width: '100%', height: '100%'
//   });
//   ddd.append(ccc);
//   document.body.append(ddd);
//   TextLabel.create({
//     container: ddd,
//     canvas: ccc,
//     name: 'currentTimeLabelTest',
//     style: {
//       widthPx: 44,
//       heightPx: 24,
//       fontFamily: '\'Yu Gothic\', \'YuGothic\', \'Courier New\', Osaka-mono, \'ＭＳ ゴシック\', monospace',
//       fontWeight: '',
//       fontSizePx: 12,
//       color: '#fff'
//     }
//   }).then(label => {
//     label.text = '00:00';
//   });

// })();

// u = uu`<div style="display:inline-block; background: #888; color: red; width: 200px; height: 80px;font-size: 24px;"><canvas></canvas></div>`; c = u.find('canvas'); document.body.append(u[0]);lbl = await ZenzaWatch.modules.TextLabel.create({container: u[0], canvas: c[0]}); lbl.text = 'hogehoge'
export {TextLabel};
