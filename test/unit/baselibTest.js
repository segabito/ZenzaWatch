import {Handler} from '../../src/baselib';
import {Emitter} from '../../src/baselib';
import assert from 'power-assert';

let called = {};
let count = 0;
const a = (v) => {
  called.a = v;
  count++;
};
const b = (v) => {
  called.b = v;
  count++;
};
const c = (v) => {
  called.c = v;
  count++;
};

describe('Handler', function () {

  beforeEach(() => {
    called = {};
    count = 0;
  });

  it('add', () => {
    let handler = new Handler(a);
    let r = Math.random();
    console.log('handler', handler[0], handler.add);
    handler.add(b);
    handler.add(c);

    handler.exec(r);
    assert.equal(r, called.a);
    assert.equal(r, called.b);
    assert.equal(r, called.c);
    assert.equal(3, count);
  });

  it('重複登録はされない', () => {
    let handler = new Handler(a);
    let r = Math.random();

    handler.add(a);
    handler.add(a);
    handler.add(a);
    handler.add(b);

    handler.exec(r);
    assert.equal(r, called.a);
    assert.equal(r, called.b);
    assert.equal(undefined, called.c);
    assert.equal(2, count);
    assert.equal(2, handler.length);
  });

  it('removeしたものは呼ばれない', () => {
    let handler = new Handler(a);
    let r = Math.random();

    handler.add(b);
    handler.add(c);
    handler.remove(b);

    handler.exec(r);
    assert.equal(r, called.a);
    assert.equal(undefined, called.b);
    assert.equal(r, called.c);

    assert.equal(2, count);
    assert.equal(true,  handler._list.includes(a));
    assert.equal(false, handler._list.includes(b));
    assert.equal(true,  handler._list.includes(c));
  });

  it('clear', () => {
    let handler = new Handler(a);
    let r = Math.random();

    handler.add(b);
    handler.add(c);

    handler.clear();
    handler.exec(r);
    assert.equal(undefined, called.a);
    assert.equal(undefined, called.b);
    assert.equal(undefined, called.c);
    assert.equal(0, count);
    assert.equal(true, handler.isEmpty);
  });

});

describe('Emitter', function () {
  beforeEach(() => {
    called = {};
    count = 0;
  });

  it('on', () => {
    let emitter = new Emitter();
    let r = Math.random();

    emitter.on('foo', a);
    emitter.on('foo', b);
    emitter.on('foo', c);

    emitter.emit('foo', r);
    assert.equal(r, called.a);
    assert.equal(r, called.b);
    assert.equal(r, called.c);
    assert.equal(3, count);

    r = Math.random();
    emitter.emit('foo', r);
    assert.equal(r, called.a);
    assert.equal(r, called.b);
    assert.equal(r, called.c);
    assert.equal(6, count);
  });

  it('once', () => {
    let emitter = new Emitter();
    let r = Math.random();

    emitter.on('foo', a);
    emitter.once('foo', b);
    emitter.on('foo', c);

    emitter.emit('foo', r);
    assert.equal(r, called.a);
    assert.equal(r, called.b);
    assert.equal(r, called.c);
    assert.equal(3, count);

    called = {};
    r = Math.random();
    emitter.emit('foo', r);
    assert.equal(r, called.a);
    assert.equal(undefined, called.b);
    assert.equal(r, called.c);
    assert.equal(5, count);
  });

});