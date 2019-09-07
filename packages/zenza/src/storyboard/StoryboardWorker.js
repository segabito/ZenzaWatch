import {workerUtil} from '../../../lib/src/infra/workerUtil';
//===BEGIN===

const StoryboardWorker = (() => {
  const func = function(self) {
    const BLANK_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVQoU2NkYGD4z4AHMI4MBQCFZAgB+jxHYAAAAABJRU5ErkJggg==';
    let BLANK_IMG = self.Image ? new Image(BLANK_SRC) : null;
    const items = {};
    const ImageCacheMap = new class {
      constructor() {
        this.map = new Map();
      }
      async get(url) {
        let cache = this.map.get(url);
        if (!cache) {
          cache = {
            ref: 0,
            image: self.Image ?
              new Image(url) :
              createImageBitmap(await fetch(url).then(r => r.blob()).catch(() => BLANK_IMG))
          };
          if (cache.image === BLANK_IMG) {
            return BLANK_IMG;
          }
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
          cache.image.src = BLANK_SRC;
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
          map.delete(url);
        }
      }
    };

    class StoryboardModel {
      constructor(info) {
        this.update(info);
      }

      update(info) {
        this._info = info;
        this.primary = info.storyboard[0];
        return this;
      }

      get isAvailable() {return !!this.isAvailable;}

      get hasSubStoryboard() {return false; }

      get status() {return this._info.status;}
      get message() {return this._info.message;}
      get duration() {return this._info.duration * 1;}
      get isDmc() {return this._info.format === 'dmc';}
      get url() {
        return this.isDmc ? this.primary.urls[0] : this.primary.url;
      }
      get imageUrls() {
        return [...Array(this.pageCount)].map((a, i) => this.getPageUrl(i));
      }
      get width() { return this.primary.thumbnail.width * 1; }
      get height() { return this.primary.thumbnail.height * 1; }
      get interval() { return this.primary.thumbnail.interval * 1; }
      get count() {
        return Math.max(
          Math.ceil(this.duration / Math.max(0.01, this.interval)),
          this.primary.thumbnail.number * 1
        );
      }
      get rows() { return this.primary.board.rows * 1; }
      get cols() { return this.primary.board.cols * 1; }
      get pageCount() { return this.primary.board.number * 1; }
      get totalRows() { return Math.ceil(this.count / this.cols); }
      get pageWidth() { return this.width * this.cols; }
      get pageHeight() { return this.height * this.rows; }
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
        const n = this.count / Math.max(1, this.duration);

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
        const thumbnailIndex = this.getIndex(ms);
        const pageIndex = this.getPageIndex(thumbnailIndex);

        const mod = thumbnailIndex % this.countPerPage;
        const row = Math.floor(mod / Math.max(1, this.cols));
        const col = mod % this.rows;
        return {
          page: pageIndex,
          url: this.getPageUrl(pageIndex),
          index: thumbnailIndex,
          row,
          col
        };
      }

      /**
       * nページ目のx, y座標をmsに変換して返す
       */
      getPointMs(x, y, page) {
        const width = Math.max(1, this.width);
        const height = Math.max(1, this.height);
        const row = Math.floor(y / height);
        const col = Math.floor(x / width);
        const mod = x % width;


        // 何番目のサムネに相当するか？
        const point =
          page * this.countPerPage +
          row * this.cols +
          col +
          (mod / width) // 小数点以下は、n番目の左端から何%あたりか
        ;

        // 全体の何%あたり？
        let percent = point / Math.max(1, this.count);
        percent = Math.max(0, Math.min(100, percent));

        // msは㍉秒単位なので1000倍
        return Math.floor(this.duration * percent * 1000);
      }

      /**
       * msは何ページ目に当たるか？を返す
       */
      getmsPage(ms) {
        const index = this._storyboard.getIndex(ms);
        return this._storyboard.getPageIndex(index);
      }
    }

    class ThumbnailView {
      constructor({canvas, info, name}) {
        this.canvas = canvas;
        this.name = name;
        this._currentTime = -1;
        this._info = new StoryboardModel(info);
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
        const width = this.info.width;
        const height = this.info.height;
        const image = await this.images.get(url);
        const imageLeft = col * width;
        const imageTop = row * height;
        const ratio = Math.min(this.width / width, this.height / height);
        this.cls();
        this.ctx.drawImage(
          image,
          imageLeft, imageTop, width, height,
          (this.width  - width * ratio) / 2,
          (this.height - height * ratio) / 2,
          width * ratio, height * ratio
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



    const createThumbnail = async ({canvas, info, name}) => {
      const id = getId();
      const view = new ThumbnailView({canvas, info, name});
      items[id] = view;
      return {status: 'ok', id};
    };

    const info = ({id, info}) => {
      const item = items[id];
      if (!item) { throw new Error('known id', id); }
      item.info = info;
      return {status: 'ok'};
    };

    const currentTime = ({id, currentTime}) => {
      const item = items[id];
      if (!item) { throw new Error('known id', id); }
      item.setCurrentTime(currentTime);
      return {status: 'ok'};
    };

    const resize = (params) => {
      const item = items[params.id];
      if (!item) { throw new Error('known id', params.id); }
      item.resize(params);
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
          return createThumbnail(params);
        case 'info':
          return info(params);
        case 'currentTime':
          return currentTime(params);
        case 'resize':
          return resize(params);
        case 'dispose':
          return dispose(params);
      }
    };
  };

  const isOffscreenCanvasAvailable = !!HTMLCanvasElement.prototype.transferControlToOffscreen;

  const NAME = 'StoryboardWorker';

  let worker;
  const createThumbnail = async ({container, canvas, info, ratio, name, style}) => {
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
      {command: 'createThumbnail', params: {canvas: layer, info, style, name}},
      {transfer: [layer]}
    );
    const id = init.id;
    let currentTime = -1;

    const result = {
      container,
      canvas,
      info(info) {
        return worker.post({command: 'info', params: {id, info}});
      },
      resize({width, height}) {
        return worker.post({command: 'resize', params: {id, width, height}});
      },
      get currentTime() {
        return currentTime;
      },
      set currentTime(time) {
        currentTime = time;
        worker.post({command: 'currentTime', params: {id, currentTime}});
      },
      dispose() {
        worker.post({command: 'dispose', params: {id}});
      }
    };
    return result;
  };
  return {createThumbnail};
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
