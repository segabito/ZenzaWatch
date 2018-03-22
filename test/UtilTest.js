import assert from 'power-assert';
import {ZenzaWatch} from '../src/ZenzaWatchIndex';
const util = ZenzaWatch.util;

describe('isBetterThanDmcMayBe', function() {

  // it('1280x720を超える場合は無条件にtrue', function() {
  //   assert.equal(false, util.isBetterThanDmcMayBe(1280, 720, 60));
  //
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1280, 721, 60));
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1281, 720, 60));
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1281, 721, 60));
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1920, 1080, 60));
  // });
  //
  // it('16分以上のとき960x540より大きかったらtrue', function() {
  //   let dur = 60 * 16;
  //
  //   assert.equal(false, util.isBetterThanDmcMayBe( 960, 540, dur));
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1280, 720, dur));
  //   assert.equal(false, util.isBetterThanDmcMayBe(1280, 720, dur - 1));
  //
  //   assert.equal(true,  util.isBetterThanDmcMayBe(1280, 720, dur));
  //   assert.equal(true,  util.isBetterThanDmcMayBe( 960, 541, dur));
  //   assert.equal(true,  util.isBetterThanDmcMayBe( 961, 541, dur));
  // });
  //
  // //it('31分以上のとき640x360より大きかったらtrue', function() {
  // //  let dur = 60 * 31;
  //
  // //  assert.equal(false, util.isBetterThanDmcMayBe(640, 360, dur));
  //
  // //  assert.equal(true,  util.isBetterThanDmcMayBe(640, 361, dur));
  // //  assert.equal(true,  util.isBetterThanDmcMayBe(641, 360, dur));
  // //  assert.equal(true,  util.isBetterThanDmcMayBe(641, 361, dur));
  //
  // //  assert.equal(true,  util.isBetterThanDmcMayBe( 960, 540, dur));
  // //  assert.equal(false, util.isBetterThanDmcMayBe( 960, 540, dur - 1));
  // //  assert.equal(true,  util.isBetterThanDmcMayBe( 960, 540, dur));
  // //});
  //
  // it('プリセットに存在しない解像度＝再エンコかかってないと判断していいんじゃないか説', function() {
  //   let dur = 60 * 15;
  //   assert.equal(true, util.isBetterThanDmcMayBe(192, 224, dur), 'TAS動画とか(NES等)');
  //   assert.equal(true, util.isBetterThanDmcMayBe(256, 240, dur), 'TAS動画とか(SNES等)');
  //   assert.equal(true, util.isBetterThanDmcMayBe(320, 240, dur), 'TAS動画とか(PS等)');
  //   assert.equal(true, util.isBetterThanDmcMayBe(352, 240, dur), 'TAS動画とか(SS等)');
  //
  //   assert.equal(true, util.isBetterThanDmcMayBe(1366, 758, dur), 'よくあるPC');
  //   //assert.equal(true, util.isBetterThanDmcMayBe( 864, 486, dur), 'ZeroWatch');
  // });

});


describe('dateToString', function() {
  it ('一桁の列も0埋めされてYYYY/MM/DD hh:mm:ssのフォーマットになる', function() {
    let match = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
    let d;
    for (let i = 0; i < 100; i++) {
      d = new Date(Date.now() * Math.random());
      //console.log(d, util.dateToString(d));
      assert.equal(
        true,
        match.test(util.dateToString(d))
      );
    }
  });
  it ('パースできない文字列を渡したらそのまま返す', function() {
    let d = 'aaaa/bb/cc dd:ee:ff';
    assert.equal(
      d,
      util.dateToString(d)
    );
  });
});

describe('sortedLastIndex', () => {
  it('どのメンバーよりも小さかったら 0.  -1 ではない', () => {
    let array = [1,3,5,7,9,11];
    assert.equal(util.sortedLastIndex(array, -1), 0, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 0), 0, array.join(', '));
  });

  it('どのメンバーよりも大きかったら右端', () => {
    let array = [1,3,5,7,9,11];
    assert.equal(util.sortedLastIndex(array, 15), array.length, array.join(', '));
  });

  it('sortedLastIndex', () => {
    let array = [1,3,5,7,9,11];
    assert.equal(util.sortedLastIndex(array, 0), 0, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 1), 1, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 3), 2, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 4), 2, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 5), 3, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 7), 4, array.join(', '));
  });

});
