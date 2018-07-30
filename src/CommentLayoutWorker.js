import {ZenzaWatch} from './ZenzaWatchIndex';

const Config = ZenzaWatch.config;
const util = ZenzaWatch.util;

//===BEGIN===

let CommentLayoutWorker = (config => {
  let func = function (self) {

    // 暫定設置
    let TYPE = {
      TOP: 'ue',
      NAKA: 'naka',
      BOTTOM: 'shita'
    };

    let SCREEN = {
      WIDTH_INNER: 512,
        WIDTH_FULL_INNER: 640,
        WIDTH: 512 + 32,
        WIDTH_FULL: 640 + 32,
        HEIGHT: 384
    };


    let isConflict = function (target, others) {
      // 一度はみ出した文字は当たり判定を持たない
      if (target.isOverflow || others.isOverflow || others.isInvisible) {
        return false;
      }

      if (target.layerId !== others.layerId) {
        return false;
      }

      // Y座標が合わないなら絶対衝突しない
      let othersY = others.ypos;
      let targetY = target.ypos;
      if (othersY + others.height < targetY ||
        othersY > targetY + target.height) {
        return false;
      }

      // ターゲットと自分、どっちが右でどっちが左か？の判定
      let rt, lt;
      if (target.beginLeft <= others.beginLeft) {
        lt = target;
        rt = others;
      } else {
        lt = others;
        rt = target;
      }

      if (target.isFixed) {

        // 左にあるやつの終了より右にあるやつの開始が早いなら、衝突する
        // > か >= で挙動が変わるCAがあったりして正解がわからない
        if (lt.endRight > rt.beginLeft) {
          return true;
        }

      } else {

        // 左にあるやつの右端開始よりも右にあるやつの左端開始のほうが早いなら、衝突する
        if (lt.beginRight >= rt.beginLeft) {
          return true;
        }

        // 左にあるやつの右端終了よりも右にあるやつの左端終了のほうが早いなら、衝突する
        if (lt.endRight >= rt.endLeft) {
          return true;
        }

      }

      return false;
    };

    let moveToNextLine = function (target, others) {
      let margin = 1;
      let othersHeight = others.height + margin;
      // 本来はちょっとでもオーバーしたらランダムすべきだが、
      // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
      // コメントアートの再現という点では有効な妥協案
      let overflowMargin = 10;
      let rnd = Math.max(0, SCREEN.HEIGHT - target.height);
      let yMax = SCREEN.HEIGHT - target.height + overflowMargin;
      let yMin = 0 - overflowMargin;

      let type = target.type;
      let ypos = target.ypos;

      if (type !== TYPE.BOTTOM) {
        ypos += othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos > yMax) {
          target.isOverflow = true;
        }
      } else {
        ypos -= othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos < yMin) {
          target.isOverflow = true;
        }
      }

      target.ypos = target.isOverflow ? Math.floor(Math.random() * rnd) : ypos;

      return target;
    };


    /**
     * 最初に衝突が起こりうるindexを返す。
     * 処理効率化のための物
     */
    let findCollisionStartIndex = function (target, members) {
      let o;
      let tl = target.beginLeft;
      let tr = target.endRight;
      let fork = target.fork;
      for (let i = 0, len = members.length; i < len; i++) {
        o = members[i];
        let ol = o.beginLeft;
        let or = o.endRight;

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) {
          return -1;
        }

        if (fork !== o.fork || o.invisible || o.isOverflow) {
          continue;
        }

        if (tl <= or && tr >= ol) {
          return i;
        }
      }

      return -1;
    };

    let _checkCollision = function (target, members, collisionStartIndex) {
      let o;
      const beginLeft = target.beginLeft;
      for (let i = collisionStartIndex, len = members.length; i < len; i++) {
        o = members[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) {
          return target;
        }

        if (beginLeft > o.endRight) {
          continue;
        }

        if (isConflict(target, o)) {
          target = moveToNextLine(target, o);

          // ずらした後は再度全チェックするのを忘れずに(再帰)
          if (!target.isOverflow) {
            return _checkCollision(target, members, collisionStartIndex);
          }
        }
      }
      return target;
    };

    let checkCollision = function (target, members) {
      if (target.isInvisible) {
        return target;
      }

      let collisionStartIndex = findCollisionStartIndex(target, members);

      if (collisionStartIndex < 0) {
        return target;
      }

      return _checkCollision(target, members, collisionStartIndex);
    };


    let groupCollision = function (members) {
      for (let i = 0, len = members.length; i < len; i++) {
        members[i] = checkCollision(members[i], members);
      }
      return members;
    };

    self.onmessage = function (e) {
      const data = {};
      //console.log('CommentLayoutWorker.onmessage', e.data.type, e.data.members);
      console.time('CommentLayoutWorker: ' + e.data.type);
      data.result = groupCollision(e.data.members);
      console.timeEnd('CommentLayoutWorker: ' + e.data.type);

      data.lastUpdate = e.data.lastUpdate;
      data.type = e.data.type;
      data.requestId = e.data.requestId;
      self.postMessage(data);
      //self.close();
    };

  };

  let instance = null;
  return {
    _func: func,
    create: function () {
      // if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
      //   return null;
      // }
      return util.createWebWorker(func);
    },
    getInstance: function () {
      // if (!config.getValue('enableCommentLayoutWorker') || !util.isWebWorkerAvailable()) {
      //   return null;
      // }
      if (!instance) {
        instance = util.createWebWorker(func);
      }
      return instance;
    }
  };
})(Config);

util.createWebWorker = (func, type = '') => {
  let src = func.toString().replace(/^function.*?{/, '').replace(/}$/, '');

  let blob = new Blob([src], {type: 'text/javascript'});
  let url = URL.createObjectURL(blob);

  if (type === 'SharedWorker') {
    return new SharedWorker(url);
  }
  return new Worker(url);
};

util.isWebWorkerAvailable = () => {
  return !!(window.Blob && window.Worker && window.URL);
};


//===END===


export {
  CommentLayoutWorker
};


// /**
//  * findCollisionStartIndexの効率化を適用する前の物
//  */
// let checkCollision_old = function (target, members) {
//   if (target.isInvisible) {
//     return target;
//   }
//
//   let o;
//   let beginLeft = target.beginLeft;
//   for (let i = 0, len = members.length; i < len; i++) {
//     o = members[i];
//
//     // 自分よりうしろのメンバーには影響を受けないので処理不要
//     if (o.id === target.id) {
//       return target;
//     }
//
//     if (beginLeft > o.endRight) {
//       continue;
//     }
//
//
//     if (isConflict(target, o)) {
//       target = moveToNextLine(target, o);
//
//       // ずらした後は再度全チェックするのを忘れずに(再帰)
//       if (!target.isOverflow) {
//         return checkCollision(target, members);
//       }
//     }
//   }
//   return target;
// };
