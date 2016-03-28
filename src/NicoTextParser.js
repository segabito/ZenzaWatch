var _ = require('lodash');
var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
/**

参考: http://www37.atwiki.jp/commentart/pages/44.html
https://www.w3.org/TR/css3-fonts/#font-kerning-prop

MINCHO

\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593

GULIM
\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6

STRONG MINCHO
\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B


    MINCHO: /([ˊˋ⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛▁▂▃▄▅▆▇█▉▊▋▌▍▎▏◢◣◤◥〡〢〣〤〥〦〧〨〩ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄﹉﹊﹋﹌﹍﹎﹏﹐﹑﹒﹔﹕﹖﹗﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫▓])/g,
    MINCHO: /([\u02CA-\u02CB\u2474-\u2487\u2488-\u249B\u2581-\u258F\u25E2-\u25E5\u2593-\u2595\u3021-\u3029\u3105-\u3129\uFE30-\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/g,
    GULIM: /([㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㉿ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵￦⊙ㅂㅑㅜㆁ▒ㅅㅒㅡㆍㄱㅇㅓㅣㆎㄴㅏㅕㅤ♡ㅁㅐㅗㅿ♥])/g,
    GULIM: /([\u2299\u2592\u3131\u3134\u3141\u3142\u3145\u3147\u314F\u3150\u3151\u3152\u3153\u3155\u3157\u315C\u3161\u3163\u3164\u317F\u3181\u318D\u318E\u2661\u2688\u2665\u3200-\u321C\u3260-\u327B\u24D0-\u24E9\u249C-\u24B5\uFFE6])/g,
    MING_LIU: /([])/g,

 */

/*

  .tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0; }
  .big    .tab_space { letter-spacing: 1.6241em; }
  .medium .tab_space { letter-spacing: 1.6252em; }
  .small  .tab_space { letter-spacing: 1.5375em; }


  .type0020 { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; }
  .big    .type0020 { letter-spacing: -0.2966em; }
  .medium .type0020 { letter-spacing: -0.2806em; }
  .small  .type0020 { letter-spacing: -0.2667em; }


  .gothic > .type3000 { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; }
  .big    .gothic > .type3000 { letter-spacing: -0.3103em; }
  .medium .gothic > .type3000 { letter-spacing: -0.2943em; }
  .small  .gothic > .type3000 { letter-spacing: -0.2693em; }


  .type00A0 { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; }
  .big    .type00A0 { letter-spacing: -0.2966em; }
  .medium .type00A0 { letter-spacing: -0.2806em; }
  .small  .type00A0 { letter-spacing: -0.2667em; }



*/
/*
  {*
    空白文字の幅をWindowsと同等にしたい。調査中
    等幅フォントを縮めることで環境差異のない幅を確保するという狙いだが・・・。

    やりすぎるとMac版Chromeでバグって逆に幅が狂う模様。
  *}
  {*
  .tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0; }
  .big    .tab_space { letter-spacing: 1.6241em; font-size: 39px;}
  .medium .tab_space { letter-spacing: 1.6252em; font-size: 24px;}
  .small  .tab_space { letter-spacing: 1.5375em; font-size: 15px;}

  .gothic > .type3000 {
    font-family: Osaka-mono, 'ＭＳ ゴシック', monospace;
    letter-spacing: -0.2943em;
  }

  .type0020 {
    font-family: Osaka-mono, 'ＭＳ ゴシック', monospace;
    letter-spacing: -0.1805em;
  }

  .type00A0 {
    font-family: Osaka-mono, 'ＭＳ ゴシック', monospace;
    letter-spacing: -0.1805em;
  }
  *}
{*
  .type0020 { font-family: 'Osaka-mono', 'ＭＳ ゴシック', monospace; }
  .big    .type0020 { letter-spacing: -0.216em; font-size: 39px; }
  .medium .type0020 { letter-spacing: -0.2001em; font-size: 24px; }
  .small  .type0020 { letter-spacing: -0.1862em; font-size: 15px; }
*}
{*
  .gothic > .type3000 { font-family: 'Osaka-mono', 'ＭＳ ゴシック', monospace; }
  .big    .gothic > .type3000 { letter-spacing: -0.3103em; font-size: 39px; }
  .medium .gothic > .type3000 { letter-spacing: -0.2943em; font-size: 24px; }
  .small  .gothic > .type3000 { letter-spacing: -0.2693em; font-size: 15px; }
*}
{*
  .type00A0 { font-family: 'Osaka-mono', 'ＭＳ ゴシック', monospace; }
  .big    .type00A0 { letter-spacing: -0.216em; font-size: 39px; }
  .medium .type00A0 { letter-spacing: -0.2001em; font-size: 24px; }
  .small  .type00A0 { letter-spacing: -0.1862em; font-size: 15px; }
*}



*/
//===BEGIN===

  var NicoTextParser = function() {};
  NicoTextParser._FONT_REG = {
    // TODO: wikiにあるテーブルを正規表現に落とし込む
    // MING_LIUは昔どこかで拾ったのだけど出典がわからない
    // wikiの記述だと\u2588はstrongではないっぽいけど、そうじゃないと辻褄が合わないCAがいくつかある。
    // wikiが間違いなのか、まだ知らない法則があるのか・・・？
    //
    GOTHIC: /[ｧ-ﾝﾞ･ﾟ]/,
    MINCHO: /([\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])/,
    GULIM: /([\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6])/,
    MING_LIU: /([\uEF00-\uEF1F])/,
    GR: /<group>([^\x01-\x7E^\xA0]*?([ｧ-ﾝﾞ･ﾟ\u02C9\u2105\u2109\u2196-\u2199\u220F\u2215\u2248\u2264\u2265\u2299\u2474-\u2482\u250D\u250E\u2511\u2512\u2515\u2516\u2519\u251A\u251E\u251F\u2521\u2522\u2526\u2527\u2529\u252A\u252D\u252E\u2531\u2532\u2535\u2536\u2539\u253A\u253D\u253E\u2540\u2541\u2543-\u254A\u2550-\u256C\u2584\u2588\u258C\u2593\u0126\u0127\u0132\u0133\u0138\u013F\u0140\u0149-\u014B\u0166\u0167\u02D0\u02DA\u2074\u207F\u2081-\u2084\u2113\u2153\u2154\u215C-\u215E\u2194-\u2195\u223C\u249C-\u24B5\u24D0-\u24E9\u2592\u25A3-\u25A9\u25B6\u25B7\u25C0\u25C1\u25C8\u25D0\u25D1\u260E\u260F\u261C\u261E\u2660\u2661\u2663-\u2665\u2667-\u2669\u266C\u3131-\u318E\u3200-\u321C\u3260-\u327B\u3380-\u3384\u3388-\u338D\u3390-\u339B\u339F\u33A0\u33A2-\u33CA\u33CF\u33D0\u33D3\u33D6\u33D8\u33DB-\u33DD\uF900-\uF928\uF92A-\uF994\uF996-\uFA0B\uFFE6\uEF00-\uEF1F\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B])[^\x01-\x7E^\xA0]*?)<\/group>/g,
    STRONG_MINCHO: /([\u01CE\u0D00\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u0251\u0261\u02CA\u02CB\u2016\u2035\u216A\u216B\u2223\u2236\u2237\u224C\u226E\u226F\u2295\u2483-\u249B\u2504-\u250B\u256D-\u2573\u2581-\u2583\u2585-\u2586\u2589-\u258B\u258D-\u258F\u2594\u2595\u25E2-\u25E5\u2609\u3016\u3017\u301E\u3021-\u3029\u3105-\u3129\u3220-\u3229\u32A3\u33CE\u33D1\u33D2\u33D5\uE758-\uE864\uFA0C\uFA0D\uFE30\uFE31\uFE33-\uFE44\uFE49-\uFE52\uFE54-\uFE57\uFE59-\uFE66\uFE68-\uFE6B\u2588])/,
    // ドット絵系によく使われる文字. 綺麗に見せるためにエフェクトを変えたい
    BLOCK: /([\u2581-\u258F\u25E2-\u25E5]+)/g,
  };


// 画面レイアウトに影響ありそうなCSSをこっちにまとめる
  NicoTextParser.__css__ = ZenzaWatch.util.hereDoc(function() {/*
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.default {}
.gothic  {font-family: 'ＭＳ Ｐゴシック'; }
.mincho  {font-family: Simsun,            Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', monospace; }
.gulim   {font-family: Gulim,             Osaka-mono,              'ＭＳ ゴシック', monospace; }
.mingLiu {font-family: PmingLiu, mingLiu, Osaka-mono, 'ＭＳ 明朝', 'ＭＳ ゴシック', monospace; }
han_group { font-family: 'Arial'; }

.nicoChat {
  position: absolute;
  padding: 1px;

  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: nowrap;
  font-weight: bolder;
  font-kerning: none;

}

  .nicoChat.big {
    line-height: 47.5px;
  }
    .nicoChat.big.noScale {
      line-height: 45px;
    }

  .nicoChat.medium {
    line-height: 30px;
  }
    .nicoChat.medium.noScale {
      line-height: 29px;
    }

  .nicoChat.small {
    line-height: 20px;
  }
    .nicoChat.small.noScale {
      line-height: 18px;
    }

  .nicoChat .zero_space {
  }
    .nicoChat .zen_space.type115A {
    }

  .type2001 {
  }

  .arial.type2001 {
    font-family: Arial;
  }
  {* フォント変化のあったグループの下にいるということは、
     半角文字に挟まれていないはずである。
   *}
    .gothic > .type2001 {
      font-family: 'ＭＳ Ｐゴシック';
    }
    .mincho > .type2001 {
      font-family: Simsun;
    }
    .gulim > .type2001 {
      font-family: Gulim;
    }
    .mingLiu > .type2001 {
      font-family: PmingLiu, mingLiu;
    }

{*
.tab_space { opacity: 0; }
.big    .tab_space > spacer { width:  86.55875px;  }
.medium .tab_space > spacer { width:  53.4px;  }
.small  .tab_space > spacer { width:  32.0625px;  }
*}

.tab_space { font-family: 'Courier New', Osaka-mono, 'ＭＳ ゴシック', monospace; opacity: 0; }
.big    .tab_space { letter-spacing: 1.6241em; }
.medium .tab_space { letter-spacing: 1.6252em; }
.small  .tab_space { letter-spacing: 1.5375em; }


.big    .type0020 > spacer { width: 11.8359375px; }
.medium .type0020 > spacer { width: 7.668px; }
.small  .type0020 > spacer { width: 5px; }

.big    .type3000 > spacer { width: 40px; }
.medium .type3000 > spacer { width: 25px; }
.small  .type3000 > spacer { width: 16px; }

.big    .gothic > .type3000 > spacer { width: 26.8984375px; }
.medium .gothic > .type3000 > spacer { width: 16.9375px; }
.small  .gothic > .type3000 > spacer { width: 10.9609375px; }

.big    .type00A0 > spacer { width: 11.8359375px; }
.medium .type00A0 > spacer { width: 7.668px; }
.small  .type00A0 > spacer { width: 5px; }

spacer { display: inline-block; overflow: hidden; margin: 0; padding: 0; height: 8px;}


.backslash {
  font-family: Arial;
}


  */});

/**
 *  たぶんこんな感じ
 *  1. 全角文字(半角スペース<s>含む</s>含まない)でグループ化
 *  2. グループ内でフォント変化文字が1つある場合はグループ全体がそのフォント
 *  3. 二つ以上ある場合は、一番目がグループ内のベースフォント、
 *     二番目以降はそのフォントにチェンジ
 *  4. 最初のグループにフォントチェンジがあった場合は、
 *     グループ全体のベースフォントがグループ1の奴になる
 *
 *  Vista以降だともうちょっと複雑らしい
 */
  NicoTextParser.likeXP = function(text) {
    var S = '<spacer> </spacer>';
    var htmlText =
      ZenzaWatch.util.escapeHtml(text)
        // 行末の半角スペース、全角スペース、タブの除去
        .replace(/([\x20|\u3000|\t])+([\n$])/g , '$2')
        // 半角文字グループ(改行以外)
        .replace(/([\x01-\x09\x0B-\x7E\xA0]+)/g, '<han_group>$1</han_group>')
        // 全角文字の連続をグループ化 要検証: \u2003は含む？
        .replace(/([^\x01-\x7E^\xA0]+)/g, '<group>$1</group>')
        .replace(/([\u0020]+)/g, // '<span class="han_space type0020">$1</span>')

          function(g) { return '<span class="han_space type0020">'+ _.repeat(S, g.length) + '</span>'; } )
          //'<span class="han_space type0020">$1</span>')
        .replace(/([\u00A0]+)/g, //  '<span class="han_space type00A0">$1</span>')
          function(g) { return '<span class="han_space type00A0">'+ _.repeat(S, g.length) + '</span>'; } )
        .replace(/(\t+)/g ,      '<span class="tab_space">$1</span>')
        .replace(/[\t]/g ,      '^');

      var hasFontChanged = false, strongFont = 'gothic';
      // フォント変化処理  XPをベースにしたい
      // CA職人のマイメモリーでもない限りフォント変化文字にマッチすること自体がレアなので、
      // 一文字ずつ走査してもさほど問題ないはず
      htmlText =
        htmlText.replace(NicoTextParser._FONT_REG.GR, function(all, group, firstChar) {
          hasFontChanged = true;
          var baseFont = '';
          if (firstChar.match(NicoTextParser._FONT_REG.GOTHIC)) {
            baseFont = 'gothic';
          } else if (firstChar.match(NicoTextParser._FONT_REG.MINCHO)) {
            baseFont = 'mincho';
            if (firstChar.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
              strongFont = 'mincho';
            }
          } else if (firstChar.match(NicoTextParser._FONT_REG.GULIM)) {
            strongFont = baseFont = 'gulim';
          } else {
            strongFont = baseFont = 'mingLiu';
          }

          var tmp = [], closer = [], currentFont = baseFont;
          for (var i = 0, len = group.length; i < len; i++) {
            var c = group.charAt(i);
            if (currentFont !== 'gothic' && c.match(NicoTextParser._FONT_REG.GOTHIC)) {
              tmp.push('<span class="gothic">');
              closer.push('</span>');
              currentFont = 'gothic';
            } else if (currentFont !== 'mincho' && c.match(NicoTextParser._FONT_REG.MINCHO)) {
              tmp.push('<span class="mincho">');
              closer.push('</span>');
              currentFont = 'mincho';
              if (c.match(NicoTextParser._FONT_REG.STRONG_MINCHO)) {
                strongFont = baseFont = 'mincho';
              }
            } else if (currentFont !== 'gulim' && c.match(NicoTextParser._FONT_REG.GULIM)) {
              tmp.push('<span class="gulim">');
              closer.push('</span>');
              currentFont = strongFont = baseFont = 'gulim';
            } else if (currentFont !== 'mingLiu' && c.match(NicoTextParser._FONT_REG.MING_LIU)) {
              tmp.push('<span class="mingLiu">');
              closer.push('</span>');
              currentFont = strongFont = baseFont = 'mingLiu';
            }
            tmp.push(c);
          }

          var result = [
            '<group class="', baseFont, ' fontChanged">',
              tmp.join(''),
              closer.join(''),
            '</group>'
          ].join('');

          return result;
        });

      htmlText =
        htmlText
          .replace(NicoTextParser._FONT_REG.BLOCK, '<span class="block_space">$1</span>')
          .replace(/([\u2588]+)/g, '<span class="fill_space">$1</span>')
        // 非推奨空白文字。 とりあえず化けて出ないように
          .replace(/([\uE800\u2002-\u200A\u007F\u05C1\u0E3A\u3164]+)/g,
            '<span class="invisible_code">$1</span>')
        // 結合文字 前の文字と同じ幅になるらしい
        // http://www.nicovideo.jp/watch/1376820446 このへんで見かけた
          .replace(/(.)[\u0655]/g ,  '$1<span class="type0655">$1</span>')
        //http://www.nicovideo.jp/watch/1236260707 で見かける謎スペース。よくわからない
          .replace(/([\u115a]+)/g ,  '<span class="zen_space type115A">$1</span>')
        // 推奨空白文字
        // なんか前後の文字によって書体(幅)が変わるらしい。 隣接セレクタでどうにかなるか？
        //  .replace(/([\u2001]+)/g ,  '<span class="zen_space type2001">$1</span>')
        // 全角スペース
          .replace(/([\u3000]+)/g , //'<span class="zen_space type3000">$1</span>')
            function(g) { return '<span class="zen_space type3000">'+ _.repeat(S, g.length) + '</span>'; } )
        // バックスラッシュ
          .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>')
        // ゼロ幅文字. ゼロ幅だけどdisplay: none; にすると狂う
          .replace(/([\u0323\u2029\u202a\u200b\u200c]+)/g ,
            '<span class="zero_space">$1</span>')
        // &emsp;
          .replace(/([\u2003]+)/g, '<span class="em_space">$1</span>')
          .replace(/[\r\n]+$/g, '')
  //        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
          .replace(/[\n]/g, '<br>')
          ;

//      if (hasFontChanged) {
//        if (htmlText.match(/^<group class="(mincho|gulim|mingLiu)"/)) {
//          var baseFont = RegExp.$1;
//          htmlText = htmlText.replace(/<group>/g, '<group class="' + baseFont + '">');
//        }
//      }
    // \u2001だけのグループ＝全角文字に隣接してない ≒ 半角に挟まれている
      htmlText.replace(/(.)<group>([\u2001]+)(<\/group>)(.)/, '$1<group class="zen_space arial type2001">$2</group>$3');

      htmlText = htmlText.replace(/<group>/g, '<group class="' + strongFont + '">');



      return htmlText;
    };

ZenzaWatch.NicoTextParser = NicoTextParser;
//===END===

