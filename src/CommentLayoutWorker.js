var _ = require('lodash');
var Config = {};
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
var self = this;

var postMessage = function() {};
  NicoChat.TYPE = {
    TOP:    'ue',
    NAKA:   'naka',
    BOTTOM: 'shita'
  };


//===BEGIN===

var CommentLayoutWorker = (function(NicoChat, NicoCommentViewModel) {
  var func = function() {

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

    var checkCollision = function(target, members) {
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
      console.time('CommentLayoutWorker: ' + e.data.type);
      var result = groupCollision(e.data.members);
      console.timeEnd('CommentLayoutWorker: ' + e.data.type);

      postMessage(result);
      close();
    };

  };

  return {
    get: function() {
      if (!ZenzaWatch.util.isWebWorkerAvailable()) {
        return null;
      }
      return ZenzaWatch.util.createWebWorker(func);
    }
  };
})(NicoChat, NicoCommentViewModel);

ZenzaWatch.util.createWebWorker = function(func) {
  var src = func.toString().replace(/^function.*?\{/, '').replace(/}$/, '');

  var blob = new Blob([src], {type: 'text\/javascript'});
  var url = URL.createObjectURL(blob);

  //window.console.log('WebWorker src:', src);

  return new Worker(url);
};

ZenzaWatch.util.isWebWorkerAvailable = function() {
  return !!(Config.getValue('enableCommentLayoutWorker') && window.Blob && window.Worker && window.URL);
};



//===END===

