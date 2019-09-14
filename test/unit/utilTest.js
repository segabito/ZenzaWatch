import assert from 'power-assert';
import {util} from '../../src/util';

describe('dateToString', function () {
  it('一桁の列も0埋めされてYYYY/MM/DD hh:mm:ssのフォーマットになる', function () {
    let match = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
    let d;
    for (let i = 0; i < 100; i++) {
      d = new Date(Date.now() * Math.random());
      assert.equal(
        true,
        match.test(util.dateToString(d))
      );
    }
  });
  it('パースできない文字列を渡したらそのまま返す', function () {
    let d = 'aaaa/bb/cc dd:ee:ff';
    assert.equal(
      d,
      util.dateToString(d)
    );
  });
});

describe('sortedLastIndex', () => {
  it('どのメンバーよりも小さかったら 0.  -1 ではない', () => {
    let array = [1, 3, 5, 7, 9, 11];
    assert.equal(util.sortedLastIndex(array, -1), 0, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 0), 0, array.join(', '));
  });

  it('どのメンバーよりも大きかったら右端', () => {
    let array = [1, 3, 5, 7, 9, 11];
    assert.equal(util.sortedLastIndex(array, 15), array.length, array.join(', '));
  });

  it('sortedLastIndex', () => {
    let array = [1, 3, 5, 7, 9, 11];
    assert.equal(util.sortedLastIndex(array, 0), 0, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 1), 1, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 3), 2, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 4), 2, array.join(', '));

    assert.equal(util.sortedLastIndex(array, 5), 3, array.join(', '));
    assert.equal(util.sortedLastIndex(array, 7), 4, array.join(', '));
  });

});

