import {ZenzaWatch} from '../../../../src/ZenzaWatchIndex';
import {workerUtil} from '../../../lib/src/infra/workerUtil';

const Config = ZenzaWatch.config;

//===BEGIN===

const CommentLayoutWorker = (config => {
  const func = function(self) {

    // 暫定設置
    const TYPE = {
      TOP: 'ue',
      NAKA: 'naka',
      BOTTOM: 'shita'
    };

    const SCREEN = {
      WIDTH_INNER: 512,
      WIDTH_FULL_INNER: 640,
      WIDTH: 512 + 32,
      WIDTH_FULL: 640 + 32,
      HEIGHT: 384
    };


    const isConflict = (target, others) => {
      // 一度はみ出した文字は当たり判定を持たない
      if (target.isOverflow || others.isOverflow || others.isInvisible) {
        return false;
      }

      if (target.layerId !== others.layerId) {
        return false;
      }

      // Y座標が合わないなら絶対衝突しない
      const othersY = others.ypos;
      const targetY = target.ypos;
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

    const moveToNextLine = (self, others) => {
      const margin = 1;
      const othersHeight = others.height + margin;
      // 本来はちょっとでもオーバーしたらランダムすべきだが、
      // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
      // コメントアートの再現という点では有効な妥協案
      const overflowMargin = 10;
      const rnd = Math.max(0, SCREEN.HEIGHT - self.height);
      const yMax = SCREEN.HEIGHT - self.height + overflowMargin;
      const yMin = 0 - overflowMargin;

      const type = self.type;
      let ypos = self.ypos;

      if (type !== TYPE.BOTTOM) {
        ypos += othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos > yMax) {
          self.isOverflow = true;
        }
      } else {
        ypos -= othersHeight;
        // 画面内に入りきらなかったらランダム配置
        if (ypos < yMin) {
          self.isOverflow = true;
        }
      }

      self.ypos = self.isOverflow ? Math.floor(Math.random() * rnd) : ypos;

      return self;
    };


    /**
     * 最初に衝突が起こりうるindexを返す。
     * 処理効率化のための物
     */
    const findCollisionStartIndex = (target, members) => {
      const tl = target.beginLeft;
      const tr = target.endRight;
      const fork = target.fork;
      for (let i = 0, len = members.length; i < len; i++) {
        const o = members[i];
        const ol = o.beginLeft;
        const or = o.endRight;

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

    const _checkCollision = (target, members, collisionStartIndex) => {
      const beginLeft = target.beginLeft;
      for (let i = collisionStartIndex, len = members.length; i < len; i++) {
        const o = members[i];

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

    const checkCollision = (target, members) => {
      if (target.isInvisible) {
        return target;
      }

      const collisionStartIndex = findCollisionStartIndex(target, members);

      if (collisionStartIndex < 0) {
        return target;
      }

      return _checkCollision(target, members, collisionStartIndex);
    };


    const groupCollision = members => {
      for (let i = 0, len = members.length; i < len; i++) {
        //members[i] =
        checkCollision(members[i], members);
      }
      return members;
    };

    self.onmessage = ({command, params}) => {
      const {type, members, lastUpdate} = params;
      console.time('CommentLayoutWorker: ' + type);
      groupCollision(members);
      console.timeEnd('CommentLayoutWorker: ' + type);
      return {type, members, lastUpdate};
    };

  };

  let instance = null;
  return {
    _func: func,
    create: () => workerUtil.createCrossMessageWorker(func, {name: 'CommentLayoutWorker'}),
    getInstance() {
      if (!instance) {
        instance = this.create();
      }
      return instance;
    }
  };
})(Config);

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
