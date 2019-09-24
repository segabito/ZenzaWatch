import {workerUtil} from '../../../lib/src/infra/workerUtil';
//===BEGIN===

const StoryboardWorker = (() => {
  const func = function(self) {
    const SCROLL_BAR_WIDTH = 8;
    const BLANK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVQoU2NkYGD4z4AHMI4MBQCFZAgB+jxHYAAAAABJRU5ErkJggg==';
    let BLANK_IMG;
    const items = {};
    const getCanvas = (width, height) => {
      if (self.OffscreenCanvas) {
        return new OffscreenCanvas(width, height);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };
    // ArrayBuffer -> DataURL
    const a2d = (arrayBuffer, type = 'image/jpeg') => {
      return new Promise((ok, ng) => {
        const reader = new FileReader();
        reader.onload = () => ok(reader.result);
        reader.onerror = ng;
        reader.readAsDataURL(new Blob([arrayBuffer], {type}));
      });
    };
    /**
     * @param {ArrayBuffer|string} src
     */
    const loadImage = async src => {
      try {
        if (self.createImageBitmap) {
          return createImageBitmap(
            src instanceof ArrayBuffer ?
              new Blob([src], {type: 'image/jpeg'}) :
              (await fetch(src).then(r => r.blob()))
            );
        } else {
          const img = new Image();
          img.src = src instanceof ArrayBuffer ? (await a2d(src)) : src;
          await img.decode();
          return img;
        }
      } catch(e) {
        console.warn('load image fail', e);
        return BLANK_IMG;
      }
    };
    loadImage(BLANK_SRC).then(img => BLANK_IMG = img);

    const ImageCacheMap = new class {
      constructor() {
        this.map = new Map();
      }
      async get(src) {
        let cache = this.map.get(src);
        if (!cache) {
          cache = {
            ref: 0,
            image: await loadImage(src)
          };
        }
        cache.ref++;
        cache.updated = Date.now();
        this.map.set(src, cache);
        this.gc();
        return cache.image;
      }
      release(src) {
        const cache = this.map.get(src);
        if (!cache) {
          return;
        }
        cache.ref--;
        if (cache.ref <= 0) {
          cache.image.close && cache.image.close();
          this.map.delete(src);
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
          const [src] = sorted.shift();
          const cache = map.get(src);
          cache && cache.image && cache.image.close && cache.image.close();
          map.delete(src);
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
        this.bitmapCtx = canvas.getContext('bitmaprenderer');
        this.bufferCanvas = getCanvas(canvas.width, canvas.height);
        this.bufferCtx = this.bufferCanvas.getContext('2d', {alpha: false, desynchronized: true});
        this.images = ImageCacheMap;
        this.totalWidth = 0;
        this.isReady = false;
        this.boards = [];
        this.isAnimating = false;
        this.raf = null;
        this.cls();
        this.onRequestAnimationFrame = this.onRequestAnimationFrame.bind(this);
        if (info) {
          this.isInitialized = this.setInfo(info);
        } else {
          this.isInitialized = Promise.resolve();
        }
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
        console.time('BoardView setInfo');
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
        console.timeEnd('BoardView setInfo');
        this.isReady = true;
        this.reDraw();
      }
      reDraw() {
        const left = this._scrollLeft;
        this._scrollLeft = -1;
        this.scrollLeft = left;
      }
      get scrollLeft() {
        return this._scrollLeft;
      }
      set scrollLeft(left) {
        if (this._scrollLeft === left) {
          return;
        }
        this._scrollLeft = left;
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
          bctx.fillStyle = 'rgba(32, 32, 32, 0.3)';
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
        const scrollBarLength = width * width / totalWidth;
        // const scrollBarMovableLength = width - scrollBarLength;
        if (scrollBarLength < width) {
          const scrollBarLeft = width * left / totalWidth;
          bctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
          bctx.fillRect(scrollBarLeft, height - SCROLL_BAR_WIDTH, scrollBarLength, SCROLL_BAR_WIDTH);
        }
        if (this.bufferCanvas.transferToImageBitmap && this.bitmapCtx && this.bitmapCtx.transferFromImageBitmap) {
          const bitmap = this.bufferCanvas.transferToImageBitmap();
          this.bitmapCtx.transferFromImageBitmap(bitmap);
        } else {
          this.ctx.beginPath();
          this.ctx.drawImage(this.bufferCanvas, 0, 0, width, height,0, 0, width, height);
        }
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
      setCurrentTime(sec) {
        const ms = sec * 1000;
        const duration = Math.max(1, this.info.duration);
        const per = ms / (duration * 1000);
        const r = sec / duration;
        const left = Math.min(Math.max(this.totalWidth * r - this.width * per, 0), this.totalWidth - this.width);
        this.scrollLeft = left;
      }
      resize({width, height}) {
        width && (this.width = width);
        height && (this.height = height);
        if (this.isReady) {
          this.reDraw();
        } else {
          this.cls();
        }
      }

      sharedMemory({buffer, MAP}) {
        const view = new Float32Array(buffer);
        const iview = new Int32Array(buffer);
        this.buffer = {
          get currentTime() {
            return view[MAP.currentTime];
          },
          get timestamp() {
            return iview[MAP.timestamp];
          },
          wait() {
            const tm = Atomics.load(iview, MAP.timestamp);
            Atomics.wait(iview, MAP.timestamp, tm, 3000);
            return Atomics.load(iview, MAP.timestamp);
          },
          get duration() {
            return view[MAP.duration];
          },
          get playbackRate() {
            return view[MAP.playbackRate];
          },
          get paused() {
            return iview[MAP.paused] !== 0;
          }
        };
      }

      onRequestAnimationFrame() {
        this.currentTime = this.buffer.currentTime;
        this.isAnimating && (this.raf = requestAnimationFrame(this.onRequestAnimationFrame));
      }

      async execAnimation() { // SharedArrayBufferで遊びたかっただけ. 最適化の余地はありそう
        this.isAnimating = true;
        const buffer = this.buffer;
        while (this.isAnimating) {
          while (!this.isReady) {
            await new Promise(res => setTimeout(res, 500));
          }
          while (this.isReady && this.isAnimating && !buffer.paused) {
            buffer.wait();
            this.currentTime = this.buffer.currentTime;
            await new Promise(res => setTimeout(res, 8));
          }
          if (!this.isAnimating) { return; }
          await new Promise(res => setTimeout(res, 1000));
        }
      }
      startAnimation() {
        // console.log('startAnimation', this.buffer, this.animation, this.isReady);
        if (!this.buffer || this.isAnimating) { return; }
        this.currentTime = this.buffer.currentTime;
        this.execAnimation();
      }
      stopAnimation() {
        // console.log('stopAnimation', this.buffer, this.animation);
        cancelAnimationFrame(this.raf);
        this.isAnimating = false;
      }

      dispose() {
        this.stopAnimation();
        this.isReady = false;
        this.boards.length = 0;
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
        this.isInitialized = Promise.resolve();
        this.isAnimating = false;
      }
      get info() { return this._info; }

      set info(info) {
        this.isReady = false;
        this.info && this.info.imageUrls.forEach(url => this.images.release(url));

        this._info.update(info);
        this._currentTime = -1;
        this.cls();
        if (!info.isAvailable) {
          return;
        }
        this.isReady = true;
      }
      async setInfo(info) {
        this.info = info;
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
      sharedMemory() {}

      async execAnimation() {
        while (this.isAnimating) {
          while (!this.isReady) {
            await new Promise(res => setTimeout(res, 500));
          }
          await this.setCurrentTime((this.currentTime + this.info.interval / 1000) % this.info.duration);
          if (!this.isAnimating) { return; }
          await new Promise(res => setTimeout(res, 1000));
        }
      }
      startAnimation() {
        if (this.isAnimating) { return; }
        this.isAnimating = true;
        this.execAnimation();
      }
      stopAnimation() {
        this.isAnimating = false;
      }
    }

    const getId = function() {return `Storyboard-${this.id++}`;}.bind({id: 0});

    const createView = async ({canvas, info, name}, type = 'thumbnail') => {
      const id = getId();
      const view = type === 'thumbnail' ?
        new ThumbnailView({canvas, info, name}) :
        new BoardView({canvas, info, name});
      items[id] = view;
      await view.isInitialized;
      return {status: 'ok', id};
    };

    const info = async ({id, info}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      await item.setInfo(info);
      return {status: 'ok'};
    };

    const currentTime = ({id, currentTime}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      item.setCurrentTime(currentTime);
      return {status: 'ok'};
    };

    const scrollLeft = ({id, scrollLeft}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      item.scrollLeft = scrollLeft;
      return {status: 'ok'};
    };

    const resize = (params) => {
      const item = items[params.id];
      if (!item) { throw new Error(`unknown id:${params.id}`); }
      item.resize(params);
      return {status: 'ok'};
    };

    const cls = (params) => {
      const item = items[params.id];
      if (!item) { throw new Error(`unknown id:${params.id}`); }
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

    const sharedMemory = ({id, buffer, MAP}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      item.sharedMemory({buffer, MAP});
      return {status: 'ok'};
    };

    const startAnimation = ({id, interval}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      item.startAnimation();
      return {status: 'ok'};
    };

    const stopAnimation = ({id, interval}) => {
      const item = items[id];
      if (!item) { throw new Error(`unknown id:${id}`); }
      item.stopAnimation();
      return {status: 'ok'};
    };

    self.onmessage = async ({command, params}) => {
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
        case 'sharedMemory':
          return sharedMemory(params);
        case 'startAnimation':
          return startAnimation(params);
        case 'stopAnimation':
          return stopAnimation(params);
        }
    };
  };

  const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;

  const NAME = 'StoryboardWorker';

  let worker;
  const initWorker = async () => {
    if (worker) { return worker; }
    if (!isOffscreenCanvasAvailable) {
      if (!worker) {
        worker = {
          name: NAME,
          onmessage: () => {},
          post: ({command, params}) => worker.onmessage({command, params})
        };
        func(worker);
      }
    } else {
      worker = worker || workerUtil.createCrossMessageWorker(func, {name: NAME});
    }
    return worker;
  };

  const createView = ({container, canvas, info, ratio, name, style}, type = 'thumbnail') => {
    style = style || {};
    ratio = ratio || window.devicePixelRatio || 1;
    name = name || 'Storyboard';
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
    canvas.classList.add('is-loading');

    // const worker = await ;

    const layer = isOffscreenCanvasAvailable ? canvas.transferControlToOffscreen() : canvas;

    const promiseSetup = (async () => {
      const worker = await initWorker();
      const result = await worker.post(
        {command:
          type === 'thumbnail' ? 'createThumbnail' : 'createBoard',
          params: {canvas: layer, info, style, name}},
        {transfer: [layer]}
      );
      canvas.classList.remove('is-loading');
      return result.id;
    })();
    let currentTime = -1, scrollLeft = -1, isAnimating = false;

    const post = async ({command, params}, transfer = {}) => {
      const id = await promiseSetup;
      params = params || {};
      params.id = id;
      return worker.post({command, params}, transfer);
    };

    const result = {
      container,
      canvas,
      setInfo(info) {
        currentTime = -1;
        scrollLeft = -1;
        canvas.classList.add('is-loading');
        return post({command: 'info', params: {info}})
          .then(() => canvas.classList.remove('is-loading'));
      },
      resize({width, height}) {
        scrollLeft = -1;
        return post({command: 'resize', params: {width, height}});
      },
      get scrollLeft() {
        return scrollLeft;
      },
      set scrollLeft(left) {
        if (scrollLeft === left) { return; }
        scrollLeft = left;
        post({command: 'scrollLeft', params: {scrollLeft}});
      },
      get currentTime() {
        return currentTime;
      },
      set currentTime(time) {
        if (currentTime === time) { return; }
        currentTime = time;
        post({command: 'currentTime', params: {currentTime}});
      },
      dispose() {
        post({command: 'dispose', params: {}});
      },
      sharedMemory({MAP, buffer}) {
        post({command: 'sharedMemory', params: {MAP, buffer}});
      },
      startAnimation() {
        isAnimating = true;
        post({command: 'startAnimation', params: {}});
      },
      stopAnimation() {
        isAnimating = false;
        post({command: 'stopAnimation', params: {}});
      },
      get isAnimating() {
        return isAnimating;
      }
    };
    return result;
  };
  return {
    initWorker,
    createThumbnail: args => createView(args, 'thumbnail'),
    createBoard:     args => createView(args, 'board')
  };
})();

//===END===
export {StoryboardWorker};
