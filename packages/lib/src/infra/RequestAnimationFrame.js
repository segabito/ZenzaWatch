//===BEGIN===
class RequestAnimationFrame {
  constructor(callback, frameSkip) {
    this._frameSkip = Math.max(0, typeof frameSkip === 'number' ? frameSkip : 0);
    this._frameCount = 0;
    this._callback = callback;
    this._enable = false;
    this._onFrame = this._onFrame.bind(this);
    this._isOnce = false;
  }
  _onFrame() {
    if (!this._enable) { return; }
    this._frameCount++;
    if (this._frameCount % (this._frameSkip + 1) === 0) {
      this._callback();
    }
    if (this._isOnce) {
      return this.disable();
    }
    this._requestId = requestAnimationFrame(this._onFrame);
  }
  enable() {
    if (this._enable) {
      return;
    }
    this._enable = true;

    this._requestId = requestAnimationFrame(this._onFrame);
  }
  disable() {
    this._enable = false;
    this._isOnce = false;

    if (!this._requestId) {
      return;
    }
    cancelAnimationFrame(this._requestId);
    this._requestId = null;
  }
  execOnce() {
    if (this._enable) {
      return;
    }
    this._isOnce = true;
    this.enable();
  }
}

//===END===
export {RequestAnimationFrame};