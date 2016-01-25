var ZenzaWatch = {
  util:{},
  debug: {},
  api: {}
};
/**






 */
//===BEGIN===

  var NicoTextParser = function() {};
  NicoTextParser._FONT_REG = {
    // TODO: wikiにあるテーブルを正規表現に落とし込む
    GOTHIC: /[ｧ-ﾝﾞﾟ]/,
    MINCHO: /([ˊˋ⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛▁▂▃▄▅▆▇█▉▊▋▌▍▎▏◢◣◤◥〡〢〣〤〥〦〧〨〩ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄﹉﹊﹋﹌﹍﹎﹏﹐﹑﹒﹔﹕﹖﹗﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫▓])/g,
    GULIM: /([㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㉿ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵￦⊙ㅂㅑㅜㆁ▒ㅅㅒㅡㆍㄱㅇㅓㅣㆎㄴㅏㅕㅤ♡ㅁㅐㅗㅿ♥])/g,
    MING_LIU: /([])/g,
    GR: /<group>(.*?([ˊˋ⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛▁▂▃▄▅▆▇█▉▊▋▌▍▎▏◢◣◤◥〡〢〣〤〥〦〧〨〩ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ︰︱︳︴︵︶︷︸︹︺︻︼︽︾︿﹀﹁﹂﹃﹄﹉﹊﹋﹌﹍﹎﹏﹐﹑﹒﹔﹕﹖﹗﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫▓㈀㈁㈂㈃㈄㈅㈆㈇㈈㈉㈊㈋㈌㈍㈎㈏㈐㈑㈒㈓㈔㈕㈖㈗㈘㈙㈚㈛㈜㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻㉿ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵￦⊙ㅂㅑㅜㆁ▒ㅅㅒㅡㆍㄱㅇㅓㅣㆎㄴㅏㅕㅤ♡ㅁㅐㅗㅿ♥]).*?)<\/group>/g
  };


// 画面レイアウトに影響ありそうなCSSをこっちにまとめる
  NicoTextParser.__css__ = ZenzaWatch.util.hereDoc(function() {/*
body {
  marign: 0;
  padding: 0;
  overflow: hidden;
  pointer-events: none;
}

.gothic  {font-family:  Arial, 'ＭＳ Ｐゴシック'; }
.mincho  {font-family: Simsun, monospace; }
.gulim   {font-family: Gulim,  monospace; }
.mingLiu {font-family: mingLiu,monospace; }

  {*
  .ue .mincho  , .shita .mincho {font-family: Simsun, monospace; }
  .ue .gulim   , .shita .gulim  {font-family: Gulim,  monospace; }
  .ue .mingLiu , .shita .mingLiu{font-family: mingLiu,monospace; }
  *}

.nicoChat {
  position: absolute;
  padding: 1px;

  font-family: 'ＭＳ Ｐゴシック';
  letter-spacing: 1px;
  margin: 2px 1px 1px 1px;
  white-space: pre;
  font-weight: bolder;

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


.nicoChat .backslash {
  font-family: Arial;
}


  */});

/**
 *  たぶんこんな感じ
 *  1. 全角文字(半角スペース含む)でグループ化
 *  2. グループ内でフォント変化文字が1つある場合はグループ全体がそのフォント
 *  3. 二つ以上ある場合は、一番目がグループ内のベースフォント、
 *     二番目以降はそのフォントにチェンジ
 *  4. 最初のグループにフォントチェンジがあった場合は、
 *     グループ全体のベースフォントがグループ1の奴になる
 *
 *  Vista以降だともうちょっと複雑らしい
 */
  NicoTextParser.likeXP = function(text) {
    var htmlText =
      ZenzaWatch.util.escapeHtml(text)
        .replace(/([\x20|\u3000|\t])+([\n$])/g , '$2')
        // 全角文字の連続をグループ化
        .replace(/([^\x01-\x0A^\x0b-\x1f^\x21-\x7E^\xA0]+)/g, '<group>$1</group>')
        .replace(/([\u0020]+)/g,   '<span class="han_space type0020">$1</span>')
        .replace(/([\u00A0]+)/g,   '<span class="han_space type00A0">$1</span>')
        .replace(/([\u2003]+)/g, '<span class="em_space">$1</span>')
        .replace(/(\t+)/g ,      '<span class="tab_space">$1</span>');

      var hasFontChanged = false;
      // フォント変化処理  XPをベースにしたい
      // CA職人のマイメモリーでもない限りフォント変化文字にマッチすること自体がレアなので、
      // 一文字ずつ走査してもさほど問題ないはず
      htmlText =
        htmlText.replace(NicoTextParser._FONT_REG.GR, function(all, group, firstChar) {
          hasFontChanged = true;
          var baseFont = '';
          if (firstChar.match(NicoTextParser._FONT_REG.MINCHO)) {
            baseFont = 'mincho';
          } else if (firstChar.match(NicoTextParser._FONT_REG.GULIM)) {
            baseFont = 'gulim';
          } else {
            baseFont = 'mingLiu';
          }

          var tmp = [], closer = [], currentFont = baseFont;
          for (var i = 0, len = group.length; i < len; i++) {
            var c = group.charAt(i);
            if (currentFont !== 'mincho' && c.match(NicoTextParser._FONT_REG.MINCHO)) {
              tmp.push('<span class="mincho">');
              closer.push('</span>');
              currentFont = 'mincho';
            } else if (currentFont !== 'gulim' && c.match(NicoTextParser._FONT_REG.GULIM)) {
              tmp.push('<span class="gulim">');
              closer.push('</span>');
              currentFont = 'gulim';
            } else if (currentFont !== 'mingLiu' && c.match(NicoTextParser._FONT_REG.MING_LIU)) {
              tmp.push('<span class="mingLiu">');
              closer.push('</span>');
              currentFont = 'mingLiu';
            }
            tmp.push(c);
          }

          var result = [
            '<group class="', baseFont, '">',
              tmp.join(''),
              closer.join(''),
            '</group>'
          ].join('');

          return result;
        });

      htmlText =
        htmlText
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
          .replace(/([\u2001]+)/g ,  '<span class="zen_space type2001">$1</span>')
        // 全角スペース
          .replace(/([\u3000]+)/g ,  '<span class="zen_space type3000">$1</span>')
        // バックスラッシュ
          .replace(/\\/g, '<span lang="en" class="backslash">&#x5c;</span>')
        // ゼロ幅文字. ゼロ幅だけどdisplay: none; にすると狂う
          .replace(/([\u0323\u200b\u2029\u202a\u200c\u200b]+)/g ,
            '<span class="zero_space">$1</span>')
          .replace(/[\r\n]+$/g, '')
  //        .replace(/[\n]$/g, '<br><span class="han_space">|</span>')
          .replace(/[\n]/g, '<br>')
          ;

      if (hasFontChanged) {
        if (htmlText.match(/^<group class="(mincho|gulim|mingLiu)"/)) {
          var baseFont = RegExp.$1;
          htmlText = htmlText.replace(/<group>/g, '<group class="' + baseFont + '">');
        }
      }

      return htmlText;
    };

//===END===

