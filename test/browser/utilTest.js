const test = (({assert, ZenzaWatch}) => {
  const util = ZenzaWatch.util;

  let called = {};
  let count = 0;
  const a = () => {
    called.a = 1;
    count++;
  };
  const b = () => {
    called.b = 1;
    count++;
  };
  const c = () => {
    called.c = 1;
    count++;
  };
  let $body;
  let body;

  body = document.createElement('span');
  $body = util.$(body);
  $body.on('hoge.1', a);
  $body.on('hoge.2', b);
  $body.on('hoge.3', c);
  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 3, '3  hoge.1, hoge.2, hoge.3');

  called = {};
  count = 0;
  $body.on('hoge.1', a);
  $body.on('hoge.2', b);
  $body.on('hoge.3', c);
  $body.off('hoge');
  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 0, '');

  called = {};
  count = 0;
  body = document.createElement('span');
  $body = util.$(body);
  $body.on('hoge.1', a);
  $body.on('hoge.2', b);
  $body.on('foo.1', c);
  $body.off('hoge');
  body.dispatchEvent(new CustomEvent('foo'));
  assert.equal(count, 1, 'foo.1');

  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 1);
  assert.equal(called.c, 1);

  called = {};
  count = 0;
  body = document.createElement('span');
  $body = util.$(body);
  $body.on('hoge.1', a);
  $body.on('hoge.2', b);
  $body.on('hoge.2', c);
  $body.off('.2');
  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 1);
  assert.equal(called.a, 1);


  called = {};
  count = 0;
  body = document.createElement('span');
  $body = util.$(body);
  $body.on('hoge.1', a);
  $body.on('hoge.2', a);
  $body.on('hoge.3', a);

  $body.off('hoge.2', a);
  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 1);
  assert.equal(called.a, 1);

  called = {};
  count = 0;
  body = document.createElement('span');
  $body = util.$(body);
  $body.on('hoge.1', a);
  $body.on('hoge.3', a);
  body.dispatchEvent(new CustomEvent('hoge'));
  assert.equal(count, 1);
  assert.equal(called.a, 1);

});

export {test};