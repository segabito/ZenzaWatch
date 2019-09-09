import {workerUtil} from '../../../lib/src/infra/workerUtil';
// import {WindowResizeObserver} from '../../../lib/src/infra/Observable';
//===BEGIN===

const StoryboardWorker = (() => {
  const func = function(self) {
    const SCROLL_BAR_WIDTH = 8;
    const BLANK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVQoU2NkYGD4z4AHMI4MBQCFZAgB+jxHYAAAAABJRU5ErkJggg==';
    let BLANK_IMG = self.Image ? new Image(BLANK_SRC) : null;
    const items = {};
    const getCanvas = (width, height) => {
      if (OffscreenCanvas) {
        return new OffscreenCanvas(width, height);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };
    const a2d = async (arrayBuffer, type = 'image/jpeg') => {
      return new Promise((ok, ng) => {
        const reader = new FileReader();
        reader.onload = () => ok(reader.result);
        reader.onerror = ng;
        reader.readAsDataURL(new Blob([arrayBuffer], {type}));
      });
    };
    const loadImage = async src => {
      try {
        if (self.createImageBitmap) {
          return createImageBitmap(
            src instanceof ArrayBuffer ?
              new Blob([src], {type: 'image/jpeg'}) :
              (await fetch(src).then(r => r.blob()))
            );
        } else {
          const img = new Image(src instanceof ArrayBuffer ? (await a2d(src)) : src);
          await img.decode;
          return img;
        }
      } catch(e) {
        console.warn('load image fail', e);
        return BLANK_IMG;
      }
    };
    const ImageCacheMap = new class {
      constructor() {
        this.map = new Map();
      }
      async get(url) {
        let cache = this.map.get(url);
        if (!cache) {
          cache = {
            ref: 0,
            image: await loadImage(url)
          };
        }
        cache.ref++;
        cache.updated = Date.now();
        this.map.set(url, cache);
        this.gc();
        return cache.image;
      }
      release(url) {
        const cache = this.map.get(url);
        if (!cache) {
          return;
        }
        cache.ref--;
        if (cache.ref <= 0) {
          cache.image.close && cache.image.close();
          this.map.delete(url);
        }
      }
      async gc() {
        const MAX = 8;
        const map = this.map;
        if (map.size < MAX) {
          return;
        }
        const sorted = [...map].sort((a, b) => a[1].updated - b[1].updated);
        while (map.size >= MAX) {
          const [url] = sorted.shift();
          const cache = map.get(url);
          cache && cache.image && cache.image.close && cache.image.close();
          map.delete(url);
        }
      }
    };

    class StoryboardInfoModel {
      static get blankData() {
        return {
          format: 'dmc',
          status: 'fail',
          duration: 1,
          storyboard: [{
            id: 1,
            urls: ['https://example.com'],
            thumbnail: {
              width: 160,
              height: 90,
              number: 1,
              interval: 1000
            },
            board: {
              rows: 1,
              cols: 1,
              number: 1
            }
          }]
        };
      }

      constructor(rawData) {
        this.update(rawData);
      }

      update(rawData) {
        if (!rawData || rawData.status !== 'ok') {
          this._rawData = this.constructor.blankData;
        } else {
          this._rawData = rawData;
        }
        this.primary = this._rawData.storyboard[0];
        return this;
      }
      get rawData() {
        return this._rawData || this.constructor.blankData;
      }

      get isAvailable() {return this._rawData.status === 'ok';}

      get hasSubStoryboard() { return false; }

      get status() {return this._rawData.status;}
      get message() {return this._rawData.message;}
      get duration() {return this._rawData.duration * 1;}
      get isDmc() {return this._rawData.format === 'dmc';}
      get url() {
        return this.isDmc ? this.primary.urls[0] : this.primary.url;
      }
      get imageUrls() {
        return [...Array(this.pageCount)].map((a, i) => this.getPageUrl(i));
      }
      get cellWidth() { return this.primary.thumbnail.width * 1; }
      get cellHeight() { return this.primary.thumbnail.height * 1; }
      get cellIntervalMs() { return this.primary.thumbnail.interval * 1; }
      get cellCount() {
        return Math.max(
          Math.ceil(this.duration / Math.max(0.01, this.cellIntervalMs)),
          this.primary.thumbnail.number * 1
        );
      }
      get rows() { return this.primary.board.rows * 1; }
      get cols() { return this.primary.board.cols * 1; }
      get pageCount() { return this.primary.board.number * 1; }
      get totalRows() { return Math.ceil(this.cellCount / this.cols); }
      get pageWidth() { return this.cellWidth * this.cols; }
      get pageHeight() { return this.cellHeight * this.rows; }
      get countPerPage() { return this.rows * this.cols; }

      /**
       *  nページ目のURLを返す。 ゼロオリジン
       */
      getPageUrl(page) {
        if (!this.isDmc) {
          page = Math.max(0, Math.min(this.pageCount - 1, page));
          return `${this.url}&board=${page + 1}`;
        } else {
          return this.primary.urls[page];
        }
      }

      /**
       * msに相当するサムネは何番目か？を返す
       */
      getIndex(ms) {
        // msec -> sec
        let v = Math.floor(ms / 1000);
        v = Math.max(0, Math.min(this.duration, v));

        // サムネの総数 ÷ 秒数
        // Math.maxはゼロ除算対策
        const n = this.cellCount / Math.max(1, this.duration);

        return parseInt(Math.floor(v * n), 10);
      }

      /**
       * Indexのサムネイルは何番目のページにあるか？を返す
       */
      getPageIndex(thumbnailIndex) {
        const perPage = this.countPerPage;
        const pageIndex = parseInt(thumbnailIndex / perPage, 10);
        return Math.max(0, Math.min(this.pageCount, pageIndex));
      }

      /**
       *  msに相当するサムネは何ページの何番目にあるか？を返す
       */
      getThumbnailPosition(ms) {
        const index = this.getIndex(ms);
        const page = this.getPageIndex(index);

        const mod = index % this.countPerPage;
        const row = Math.floor(mod / Math.max(1, this.cols));
        const col = mod % this.rows;
        return {
          page,
          url: this.getPageUrl(page),
          index,
          row,
          col
        };
      }

    }

    class BoardView {
      constructor({canvas, info, name}) {
        this.canvas = canvas;
        this.name = name;
        this._currentTime = -1;
        this._scrollLeft = 0;
        this._info = null;
        this.lastPos = {};
        this.ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
        this.bufferCanvas = getCanvas(canvas.width, canvas.height);
        this.bufferCtx = this.bufferCanvas.getContext('2d', {alpha: false, desynchronized: true});
        this.images = ImageCacheMap;
        this.totalWidth = 0;
        this.isReady = false;
        this.boards = [];
        this.cls();
        info && this.setInfo(info);
      }
      get info() { return this._info; }

      set info(infoRawData) { this.setInfo(infoRawData); }

      async setInfo(infoRawData) {
        this.isReady = false;
        this.info ? this._info.update(infoRawData) : (this._info = new StoryboardInfoModel(infoRawData));

        const info = this.info;
        if (!info.isAvailable) {
          return this.cls();
        }
        const cols = info.cols;
        const rows = info.rows;
        const pageWidth  = info.pageWidth;
        const boardWidth = pageWidth * rows;
        const cellWidth  = info.cellWidth;
        const cellHeight = info.cellHeight;

        this.height = cellHeight;
        this.totalWidth = info.cellCount * info.cellWidth;
        // this.boards.forEach(board => board.image && board.image.close && board.image.close());
        this.boards = (await Promise.all(this._info.imageUrls.map(async (url, idx) => {
          const image = await this.images.get(url);
          const boards = [];
          for (let row = 0; row < rows; row++) {
            const canvas = getCanvas(pageWidth, cellHeight);
            const ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
            ctx.beginPath();
            const sy = row * cellHeight;
            ctx.drawImage(image,
              0, sy, pageWidth, cellHeight,
              0,  0, pageWidth, cellHeight
            );
            ctx.strokeStyle = 'rgb(128, 128, 128)';
            ctx.shadowColor = 'rgb(192, 192, 192)';
            ctx.shadowOffsetX = -1;
            for (let col = 0; col < cols; col++) {
              const x = col * cellWidth;
              ctx.strokeRect(x, 1, cellWidth - 1 , cellHeight + 2);
            }

            boards.push({
              image: canvas, //.transferToImageBitmap(), // ImageBitmapじゃないほうが速い？気のせい？
              left:  idx * boardWidth + row * pageWidth,
              right: idx * boardWidth + row * pageWidth + pageWidth,
              width: pageWidth
            });
          }
          this.images.release(url);
          return boards;
        }))).flat();

        this.height = info.cellHeight;
        this._currentTime = -1;
        this.cls();
        this.isReady = true;
      }
      get scrollLeft() {
        return this._scrollLeft;
      }
      set scrollLeft(left) {
        if (!this.info || !this.info.isAvailable || !this.isReady) {
          return;
        }

        const width =  this.width;
        const height = this.height;
        const totalWidth = this.totalWidth;
        left = Math.max(-width / 2, Math.min(totalWidth - width / 2, left));
        const right = left + width;
        const isOutrange = (left < 0 || left > totalWidth - width);

        const bctx = this.bufferCtx;
        bctx.beginPath();
        if (isOutrange) {
          bctx.fillStyle = 'rgb(32, 32, 32)';
          bctx.fillRect(0, 0, width, height);
        }
        for (const board of this.boards) {
          if (
            (left <= board.left  && board.left <= right) ||
            (left <= board.right && board.right <= right) ||
            (board.left <= left  && right <= board.right)
          ) {
            const dx = board.left - left;
            bctx.drawImage(board.image,
              0,  0, board.width, height,
              dx, 0, board.width, height
            );
          }
        }
        const scrollBarLength = width / totalWidth * width;
        if (scrollBarLength < width) {
          const scrollBarLeft = left / totalWidth * width;
          bctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
          bctx.fillRect(scrollBarLeft, height - SCROLL_BAR_WIDTH, scrollBarLength, SCROLL_BAR_WIDTH);
        }

        // requestAnimationFrame(() => {
        if (this.bufferCanvas.transferToImageBitmap && this.canvas.transferFromImageBitmap) {
          this.canvas.transferFromImageBitmap(this.bufferCanvas.transferToImageBitmap());
        } else {
          this.ctx.beginPath();
          this.ctx.drawImage(this.bufferCanvas,
             0, 0, width, height,
             0, 0, width, height
          );
          this.ctx.commit && this.ctx.commit();
        }
        // });
      }

      cls() {
        this.bufferCtx.clearRect(0, 0, this.width, this.height);
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      get currentTime() {
        const center = this._scrollLeft + this.width / 2;
        return this.duration * (center / this.totalWidth);
      }
      set currentTime(time) { this.setCurrentTime(time); }
      get width() {return this.canvas.width;}
      get height() {return this.canvas.height;}
      set width(width) {
        this.canvas.width = width;
        this.bufferCanvas.width = width;
      }
      set height(height) {
        this.canvas.height = height;
        this.bufferCanvas.height = height;
      }
      async setCurrentTime(time) {
        const r = time / Math.max(this.info.duration, 1);
        const left = this.totalWidth * r - this.width / 2;
        this.scrollLeft = left;
      }
      resize({width, height}) {
        width && (this.width = width);
        height && (this.height = height);
        this.cls();
      }
    }

    class ThumbnailView {
      constructor({canvas, info, name}) {
        this.canvas = canvas;
        this.name = name;
        this._currentTime = -1;
        this._info = new StoryboardInfoModel(info);
        this.lastPos = {};
        this.ctx = canvas.getContext('2d', {alpha: false, desynchronized: true});
        this.images = ImageCacheMap;
        this.cls();
      }
      get info() { return this._info; }

      set info(info) {
        this.info && this.info.imageUrls.forEach(url => this.images.release(url));

        this._info.update(info);
        this._currentTime = -1;
        this.cls();
      }
      cls() {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      get currentTime() { return this.currentTime; }
      set currentTime(time) { this.setCurrentTime(time); }
      get width() {return this.canvas.width;}
      get height() {return this.canvas.height;}
      set width(width) {this.canvas.width = width;}
      set height(height) {this.canvas.height = height;}
      async setCurrentTime(time) {
        time > this.info.duration && (time = this.info.duration);
        time < 0 && (time = 0);
        if (this._currentTime === time) {
          return;
        }
        const pos = this.info.getThumbnailPosition(time * 1000);
        if (Object.keys(pos).every(key => pos[key] === this.lastPos[key])) { return; }
        this.lastPos = pos;
        this._currentTime = time;
        const {url, row, col} = pos;
        const width = this.info.cellWidth;
        const height = this.info.cellHeight;
        const image = await this.images.get(url);
        const imageLeft = col * width;
        const imageTop = row * height;
        const scale = Math.min(this.width / width, this.height / height);
        this.cls();
        this.ctx.drawImage(
          image,
          imageLeft, imageTop, width, height,
          (this.width  - width * scale) / 2,
          (this.height - height * scale) / 2,
          width * scale, height * scale
        );

      }
      resize({width, height}) {
        this.width = width;
        this.height = height;
        this.cls();
      }

      dispose() {
        this.info && this.info.imageUrls.forEach(url => this.images.release(url));
        this.info = null;
      }

    }

    const getId = function() {return `Storyboard-${this.id++}`;}.bind({id: 0});

    const createView = async ({canvas, info, name}, type = 'thumbnail') => {
      const id = getId();
      const view = type === 'thumbnail' ?
        new ThumbnailView({canvas, info, name}) :
        new BoardView({canvas, info, name});
      items[id] = view;
      return {status: 'ok', id};
    };

    const info = ({id, info}) => {
      const item = items[id];
      if (!item) { throw new Error('unknown id', id); }
      item.info = info;
      return {status: 'ok'};
    };

    const currentTime = ({id, currentTime}) => {
      const item = items[id];
      if (!item) { throw new Error('unknown id', id); }
      item.setCurrentTime(currentTime);
      return {status: 'ok'};
    };

    const scrollLeft = ({id, scrollLeft}) => {
      const item = items[id];
      if (!item) { throw new Error('unknown id', id); }
      item.scrollLeft = scrollLeft;
      return {status: 'ok'};
    };

    const resize = (params) => {
      const item = items[params.id];
      if (!item) { throw new Error('unknown id', params.id); }
      item.resize(params);
      return {status: 'ok'};
    };

    const cls = (params) => {
      const item = items[params.id];
      if (!item) { throw new Error('unknown id', params.id); }
      item.cls();
      return {status: 'ok'};
    };

    const dispose = ({id}) => {
      const item = items[id];
      if (!item) { return; }
      item.dispose();
      delete items[id];
      return {status: 'ok'};
    };

    self.onmessage = async ({command, params}) => {
      if (!BLANK_IMG) {
        BLANK_IMG = createImageBitmap( await fetch(BLANK_SRC).then(res => res.blob() ));
      }
      // console.log('onmessage', self.name, {command, params});
      switch (command) {
        case 'createThumbnail':
          return createView(params, 'thumbnail');
        case 'createBoard':
          return createView(params, 'board');
        case 'info':
          return info(params);
        case 'currentTime':
          return currentTime(params);
        case 'scrollLeft':
          return scrollLeft(params);
        case 'resize':
          return resize(params);
        case 'cls':
          return cls(params);
        case 'dispose':
          return dispose(params);
      }
    };
  };

  const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;

  const NAME = 'StoryboardWorker';

  let worker;
  const createView = async ({container, canvas, info, ratio, name, style}, type = 'thumbnail') => {
    style = style || {};
    ratio = ratio || window.devicePixelRatio || 1;
    name = name || 'StoryboardThumbnail';
    if (!canvas) {
      canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        width: '100%',
        height: '100%'
      });
      container && container.append(canvas);
      style.widthPx &&  (canvas.width = Math.max(style.widthPx));
      style.heightPx && (canvas.height = Math.max(style.heightPx));
    }
    canvas.dataset.name = name;

    if (!isOffscreenCanvasAvailable) {
      if (!worker) {
        worker = {
          name: NAME,
          onmessage: () => {},
          post: ({command, params}) => setTimeout(() => worker.onmessage({command, params}), 0)
        };
        func(worker);
      }
    } else {
      worker = worker || workerUtil.createCrossMessageWorker(func, {name: NAME});
    }
    const layer = isOffscreenCanvasAvailable ? canvas.transferControlToOffscreen() : canvas;

    const init = await worker.post(
      {command:
        type === 'thumbnail' ? 'createThumbnail' : 'createBoard',
        params: {canvas: layer, info, style, name}},
      {transfer: [layer]}
    );
    const id = init.id;
    let currentTime = -1, scrollLeft = -1;

    const result = {
      container,
      canvas,
      setInfo(info) {
        currentTime = -1;
        scrollLeft = -1;
        return worker.post({command: 'info', params: {id, info}});
      },
      resize({width, height}) {
        scrollLeft = -1;
        return worker.post({command: 'resize', params: {id, width, height}});
      },
      get scrollLeft() {
        return scrollLeft;
      },
      set scrollLeft(left) {
        if (scrollLeft === left) { return; }
        scrollLeft = left;
        worker.post({command: 'scrollLeft', params: {id, scrollLeft}});
      },
      get currentTime() {
        return currentTime;
      },
      set currentTime(time) {
        if (currentTime === time) { return; }
        currentTime = time;
        worker.post({command: 'currentTime', params: {id, currentTime}});
      },
      dispose() {
        worker.post({command: 'dispose', params: {id}});
      }
    };
    return result;
  };
  return {
    createThumbnail: args => createView(args, 'thumbnail'),
    createBoard:     args => createView(args, 'board')
  };
})();


//===END===
export {StoryboardWorker};
//@require storyboardApiData
// (() => {
//   const ddd = document.createElement('div');
//   const ccc = document.createElement('canvas');
//   ddd.id = 'AAAAAAAAAAAAAAAA';
//   Object.assign(ddd.style, {
//     display: 'inline-block',
//     position: 'fixed', left: 0, top: 0, zIndex: 10000, background: '#666',
//     width: '160px', height: '120px', opacity: 0.8
//   });
//   Object.assign(ccc.style, {
//     width: '100%', height: '100%'
//   });
//   const ratio = window.devicePixelRatio;
//   ccc.width = 160 * ratio;
//   ccc.height = 120 * ratio;
//   ddd.append(ccc);
//   document.body.append(ddd);
//   StoryboardWorker.createThumbnail({
//     container: ddd,
//     canvas: ccc,
//     info: storyboardApiData,
//     name: 'StoryboardThumbnail',
//     style: {
//     }
//   }).then(thumbnail => {
//     thumbnail.currentTime = Math.random() * storyboardApiData.duration;
//     ccc.addEventListener('click', () => {
//       thumbnail.currentTime = Math.random() * storyboardApiData.duration;
//     });
//   });

// })();
