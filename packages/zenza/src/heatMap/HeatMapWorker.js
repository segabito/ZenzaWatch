import {workerUtil} from '../../../lib/src/infra/workerUtil';
import {global} from '../../../../src/ZenzaWatchIndex';
// import {WatchInfoCacheDb} from '../../../lib/src/nico/WatchInfoCacheDb';

//===BEGIN===
function HeatMapInitFunc(self) {
class HeatMapModel {
  constructor(params) {
    this.resolution = params.resolution || HeatMapModel.RESOLUTION;
    this.reset();
  }
  reset() {
    this._duration = -1;
    this._chatReady = false;
    this.map = [];
  }
  set duration(duration) {
    if (this._duration === duration) { return; }
    this._duration = duration;
    this.update();
  }
  get duration() {
    return this._duration;
  }
  set chatList(comment) {
    this._chat = comment;
    this._chatReady = true;
    this.update();
  }
  update() {
    if (this._duration < 0 || !this._chatReady) {
      return false;
    }
    const map = this.map = this.getHeatMap();
    return !!map.length;
  }
  getHeatMap() {
    const chatList =
      this._chat.top.concat(this._chat.naka, this._chat.bottom);
    const duration = this._duration;
    if (duration < 1) { return []; }
    const map = new Array(Math.max(Math.min(this.resolution, Math.floor(duration)), 1));
    const length = map.length;
    let i = length;
    while(i > 0) map[--i] = 0;

    const ratio = duration > map.length ? (map.length / duration) : 1;

    for (i = chatList.length - 1; i >= 0; i--) {
      let nicoChat = chatList[i];
      let pos = nicoChat.vpos;
      let mpos = Math.min(Math.floor(pos * ratio / 100), map.length -1);
      map[mpos]++;
    }
    map.length = length;
    return map;
  }
}
HeatMapModel.RESOLUTION = 200;

class HeatMapView {
  constructor(params) {
    this.model  = params.model;
    this.container = params.container;
    this.canvas = params.canvas;
  }
  initializePalette() {
    this._palette = [];
    for (let c = 0; c < 256; c++) {
      const
        r = Math.floor((c > 127) ? (c / 2 + 128) : 0),
        g = Math.floor((c > 127) ? (255 - (c - 128) * 2) : (c * 2)),
        b = Math.floor((c > 127) ? 0 : (255  - c * 2));
      this._palette.push(`rgb(${r}, ${g}, ${b})`);
    }
  }
  initializeCanvas() {
    if (!this.canvas) {
      this.canvas = this.container.querySelector('canvas.heatMap');
    }

    this.context = this.canvas.getContext('2d', {alpha: false, desynchronized: true});
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.reset();
  }
  reset() {
    if (!this.context) { return; }
    this.context.fillStyle = this._palette[0];
    this.context.beginPath();
    this.context.fillRect(0, 0, this.width, this.height);
  }
  async toDataURL() {
    if (!this.canvas) {
      return '';
    }
    const type = 'image/png';
    const canvas = this.canvas;
    try {
      return canvas.toDataURL(type);
    } catch(e) {
      const blob = await new Promise(res => {
        if (canvas.convertToBlob) {
          return res(canvas.convertToBlob({type}));
        }
        this.canvas.toBlob(res, type);
      }).catch(e => null);
      if (!blob) {
        return '';
      }
      return new Promise((ok, ng) => {
        const reader = new FileReader();
        reader.onload = () => { ok(reader.result); };
        reader.onerror = e => ng(e);
        reader.readAsDataURL(blob);
      }).catch(e => '');
    }
  }
  update(map) {
    if (!this._isInitialized) {
      this._isInitialized = true;
      this.initializePalette();
      this.initializeCanvas();
      this.reset();
    }
    map = map || this.model.map;
    if (!map.length) { return false; }

    console.time('draw HeatMap');

    // 一番コメント密度が高い所を100%として相対的な比率にする
    // 赤い所が常にピークになってわかりやすいが、
    // コメントが一カ所に密集している場合はそれ以外が薄くなってしまうのが欠点
    let max = 0, i;
    // -4 してるのは、末尾にコメントがやたら集中してる事があるのを集計対象外にするため (ニコニ広告に付いてたコメントの名残？)
    for (i = Math.max(map.length - 4, 0); i >= 0; i--) max = Math.max(map[i], max);

    if (max > 0) {
      let rate = 255 / max;
      for (i = map.length - 1; i >= 0; i--) {
        map[i] = Math.min(255, Math.floor(map[i] * rate));
      }
    } else {
      console.timeEnd('draw HeatMap');
      return false;
    }

    const
      scale = map.length >= this.width ? 1 : (this.width / Math.max(map.length, 1)),
      blockWidth = (this.width / map.length) * scale,
      context = this.context;

    for (i = map.length - 1; i >= 0; i--) {
      context.fillStyle = this._palette[parseInt(map[i], 10)] || this._palette[0];
      context.beginPath();
      context.fillRect(i * scale, 0, blockWidth, this.height);
    }
    console.timeEnd('draw HeatMap');
    context.commit && context.commit();
    return true;
  }
}

class HeatMap {
  /**
   *
   * @param {object} params
   * @prop {Element?} container
   * @prop {HTMLCamvasElement?} canvas
   */
  constructor(params) {
    /** @type {HeatMapModel} */
    this.model = new HeatMapModel({});
    /** @type {HeatMapView} */
    this.view = new HeatMapView({
      model: this.model,
      container: params.container,
      canvas: params.canvas
    });
    this.reset();
  }
  reset() {
    this.model.reset();
    this.view.reset();
  }
  /**
   * @params {number} duration
   */
  set duration(duration) {
    if (this.model.duration === duration) { return; }
    this.model.duration = duration;
    this.view.update() && this.toDataURL().then(dataURL => {
      self.emit('heatMapUpdate', {map: this.map, duration: this.duration, dataURL});
    });
  }
  get duration() {
    return this.model.duration;
  }
  /**
   * @params {NicoChat[]} chatList
   */
  set chatList(chatList) {
    this.model.chatList = chatList;
    this.view.update() && this.toDataURL().then(dataURL => {
      self.emit('heatMapUpdate', {map: this.map, duration: this.duration, dataURL});
    });
  }
  get canvas() {
    return this.view.canvas || {};
  }
  get map() {
    return this.model.map;
  }
  async toDataURL() {
    return this.view.toDataURL();
  }
}
  return HeatMap;
} // end of HeatMapInitFunc

const HeatMapWorker = (() => {
  const _func = function(self) {
    const HeatMap = HeatMapInitFunc(self);

    let heatMap;
    const init = ({canvas}) => heatMap = new HeatMap({canvas});
    const update = ({chatList}) => heatMap.chatList = chatList;
    const duration = ({duration}) => heatMap.duration = duration;
    const reset = () => heatMap.reset();
    self.onmessage = async ({command, params}) => {
      let result = {status: 'ok'};
      switch (command) {
        case 'init':
          init(params);
          break;
        case 'update':
          update(params);
          break;
        case 'duration':
          duration(params);
          break;
        case 'reset':
          reset(params);
          break;
        case 'getData':
          result.dataURL  = await heatMap.toDataURL();
          result.map      = heatMap.map;
          result.duration = heatMap.duration;
          break;
      }
      return result;
    };
  };
  const func = `
  function(self) {
    ${HeatMapInitFunc.toString()};
    (${_func.toString()})(self);
  }
  `;
  const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;
  let worker;
  const init = async ({container, width, height}) => {
    if (!isOffscreenCanvasAvailable) {
      const HeatMap = HeatMapInitFunc();
      return new HeatMap({container, width, height});
    }
    worker = worker || workerUtil.createCrossMessageWorker(func, {name: 'HeatMapWorker'});
    const canvas = container.querySelector('canvas.heatMap');
    const layer = canvas.transferControlToOffscreen();
    await worker.post({command: 'init', params: {canvas: layer}}, {transfer: [layer]});
    let _chatList, _duration;
    return {
      canvas,
      update(chatList) {
        chatList = {
          top:    chatList.top.map(c => { return {...c.props, ...{group: null}}; }),
          naka:   chatList.naka.map(c => { return {...c.props, ...{group: null}}; }),
          bottom: chatList.bottom.map(c => { return {...c.props, ...{group: null}}; })
        };
        return worker.post({command: 'update', params: {chatList}});
      },
      get duration() { return _duration; },
      set duration(d) {
        _duration = d;
        worker.post({command: 'duration', params: {duration: d}}); },
      reset: () => worker.post({command: 'reset', params: {}}),
      get chatList() {return _chatList;},
      set chatList(chatList) { this.update(_chatList = chatList); }
    };
  };
  return {init};
})();

const HeatMap = HeatMapInitFunc({
  emit: (...args) => global.emitter.emit(...args)
});

//===END===

export {HeatMap, HeatMapWorker};