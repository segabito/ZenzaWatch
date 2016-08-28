var _ = require('lodash');
var Config = {};
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};

//===BEGIN===

var CommentLayoutWorker = (function(config, NicoChat, NicoCommentViewModel) {
  var func = function(self) {

    // 暫定設置
    var NicoChat = {
      TYPE: {
        TOP:    'ue',
        NAKA:   'naka',
        BOTTOM: 'shita'
      }
    };

    var NicoCommentViewModel = {
      SCREEN: {
        WIDTH_INNER:      512,
        WIDTH_FULL_INNER: 640,
        WIDTH:      512 + 32,
        WIDTH_FULL: 640 + 32,
        HEIGHT:     384 +  1
      }
    };


    var isConflict = function(target, others) {
      // 一度はみ出した文字は当たり判定を持たない
      if (target.isOverflow || others.isOverflow || others.isInvisible) { return false; }

      if (target.fork !== others.fork) { return false; }

      // Y座標が合わないなら絶対衝突しない
      var othersY = others.ypos;
      var targetY = target.ypos;
      if (othersY + others.height < targetY ||
          othersY > targetY + target.height) {
        return false;
      }

      // ターゲットと自分、どっちが右でどっちが左か？の判定
      var rt, lt;
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

    var moveToNextLine = function(target, others) {
      var margin = 1;
      var othersHeight = others.height + margin;
      // 本来はちょっとでもオーバーしたらランダムすべきだが、
      // 本家とまったく同じサイズ計算は難しいのでマージンを入れる
      // コメントアートの再現という点では有効な妥協案
      var overflowMargin = 10;
      var rnd =  Math.max(0, NicoCommentViewModel.SCREEN.HEIGHT - target.height);
      var yMax = NicoCommentViewModel.SCREEN.HEIGHT - target.height + overflowMargin;
      //var rnd =  Math.max(0, 385 - target.height);
      //var yMax = 385 - target.height + overflowMargin;
      var yMin = 0 - overflowMargin;

      var type = target.type;
      var ypos = target.ypos;

      if (type !== NicoChat.TYPE.BOTTOM) {
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
    var findCollisionStartIndex = function(target, members) {
      var o;
      var tl = target.beginLeft;
      var tr = target.endRight;
      var fork = target.fork;
      for (var i = 0, len = members.length; i < len; i++) {
        o = members[i];
        var ol = o.beginLeft;
        var or = o.endRight;

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return -1; }

        if (fork !== o.fork || o.invisible || o.isOverflow) { continue; }

        if (tl <= or && tr >= ol) { return i; }
      }

      return -1;
    };

    var _checkCollision = function(target, members, collisionStartIndex) {
      var o;
      const beginLeft = target.beginLeft;
      for (var i = collisionStartIndex, len = members.length; i < len; i++) {
        o = members[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return target; }

        if (beginLeft > o.endRight)  { continue; }

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

    var checkCollision = function(target, members) {
      if (target.isInvisible) { return target; }

      var collisionStartIndex = findCollisionStartIndex(target, members);

      if (collisionStartIndex < 0) { return target; }
    
      return _checkCollision(target, members, collisionStartIndex);
    };


    /**
     * findCollisionStartIndexの効率化を適用する前の物
     */
    var checkCollision_old = function(target, members) {
      if (target.isInvisible) { return target; }

      var o;
      var beginLeft = target.beginLeft;
      for (var i = 0, len = members.length; i < len; i++) {
        o = members[i];

        // 自分よりうしろのメンバーには影響を受けないので処理不要
        if (o.id === target.id) { return target; }

        if (beginLeft > o.endRight)  { continue; }


        if (isConflict(target, o)) {
          target = moveToNextLine(target, o);

          // ずらした後は再度全チェックするのを忘れずに(再帰)
          if (!target.isOverflow) {
            return checkCollision(target, members);
          }
        }
      }
      return target;
    };

    var groupCollision = function(members) {
      for (var i = 0, len = members.length; i < len; i++) {
        members[i] = checkCollision(members[i], members);
      }
      return members;
    };

    self.onmessage = function(e) {
      var result;

      console.time('CommentLayoutWorker: ' + e.data.type);
      result = groupCollision(e.data.members);
      console.timeEnd('CommentLayoutWorker: ' + e.data.type);

      result.lastUpdate = e.data.lastUpdate;
      result.type = e.data.type;
      result.requestId = e.data.requestId;
      self.postMessage(result);
      //self.close();
    };

  };

  var instance = null;
  return {
    _func: func,
    create: function() {
      if (!config.getValue('enableCommentLayoutWorker') || !ZenzaWatch.util.isWebWorkerAvailable()) {
        return null;
      }
      return ZenzaWatch.util.createWebWorker(func);
    },
    getInstance: function() {
      if (!config.getValue('enableCommentLayoutWorker') || !ZenzaWatch.util.isWebWorkerAvailable()) {
        return null;
      }
      if (!instance) {
        instance = ZenzaWatch.util.createWebWorker(func);
      }
      return instance;
    }
  };
})(Config, NicoChat, NicoCommentViewModel);

ZenzaWatch.util.createWebWorker = function(func) {
  var src = func.toString().replace(/^function.*?\{/, '').replace(/}$/, '');

  var blob = new Blob([src], {type: 'text\/javascript'});
  var url = URL.createObjectURL(blob);

  //window.console.log('WebWorker src:', src);

  return new Worker(url);
};

ZenzaWatch.util.isWebWorkerAvailable = function() {
  return !!(window.Blob && window.Worker && window.URL);
};




//===END===

/*

// 前のが処理中にどんどん追加でpostMessageしたらどうなるの？の実験
// 結果:
// どんどん積まれて、順に処理されるっぽい。
// 待ってる間メインスレッドがブロックされる心配はなさそう

var testWorker = ZenzaWatch.util.createWebWorker(function(self) {
  self.onmessage = function(e) {
    console.time('work start 111' + e.data.num);
    var c = 0;
    for (var i = 0; i < 0xffffff; i++) {
      c += Math.random();
    }
    console.timeEnd('work start 111' + e.data.num);
    console.log('%s', e.data.num, c);
  };
});

for (var i = 0; i < 10; i++) {
  window.console.log('post :' + i);
    testWorker.postMessage({num: i});
  window.console.log('post done: ' + i);
}
*/

module.exports = {
  CommentLayoutWorker: CommentLayoutWorker
};


