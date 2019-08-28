import {ZenzaWatch} from '../../../../src/ZenzaWatchIndex';
import {uq} from '../../../lib/src/uQuery';
import {nicoUtil} from '../../../lib/src/nico/nicoUtil';
//===BEGIN===

class HoverMenu {
  constructor(param) {
    this.initialize(param);
  }
  initialize(param) {
    this._playerConfig = param.playerConfig;

    const $view = this._$view = uq(
      '<zen-button class="ZenButton"><div class="ZenButtonInner scalingUI">Zen</div></zen-button>'
    );

    if (!nicoUtil.isGinzaWatchUrl() &&
      this._playerConfig.props.overrideWatchLink &&
      location && location.host.endsWith('.nicovideo.jp')) {
      this._overrideWatchLink();
    } else {
      this._onHoverEnd = _.debounce(this._onHoverEnd.bind(this), 500);
      $view.on('click', this._onClick.bind(this));
      ZenzaWatch.emitter.on('hideHover', () => $view.removeClass('show'));
      uq('body')
        .on('mouseover', this._onHover.bind(this))
        .on('mouseover', this._onHoverEnd)
        .on('mouseout', this._onMouseout.bind(this))
        .append($view);
    }
  }
  setPlayer(player) {
    this._player = player;
    if (this._playerResolve) {
      this._playerResolve(player);
    }
  }
  _getPlayer() {
    if (this._player) {
      return Promise.resolve(this._player);
    }
    if (!this._playerPromise) {
      this._playerPromise = new Promise(resolve => {
        this._playerResolve = resolve;
      });
    }
    return this._playerPromise;
  }
  _closest(target) {
    return target.closest('a[href*="watch/"],a[href*="nico.ms/"],.UadVideoItem-link');
  }
  _onHover (e) {
    const target = this._closest(e.target);
    if (target) {
      this._hoverElement = target;
    }
  }
  _onMouseout (e) {
    if (this._hoverElement === this._closest(e.target)) {
      this._hoverElement = null;
    }
  }
  _onHoverEnd (e) {
    if (!this._hoverElement) { return; }
    const target = this._closest(e.target);
    if (this._hoverElement !== target) {
      return;
    }
    if (!target || target.classList.contains('noHoverMenu')) {
      return;
    }
    let href = target.dataset.href || target.href;
    let watchId = nicoUtil.getWatchId(href);
    let host = target.hostname;
    if (!['www.nicovideo.jp', 'sp.nicovideo.jp', 'nico.ms'].includes(host)) {
      return;
    }
    this._query = nicoUtil.parseWatchQuery((target.search || '').substr(1));

    if (!watchId || !watchId.match(/^[a-z0-9]+$/)) {
      return;
    }
    if (watchId.startsWith('lv')) {
      return;
    }

    this._watchId = watchId;

    const offset = target.getBoundingClientRect();
    this._$view.css({
      top: offset.top + window.pageYOffset,
      left: offset.left + window.pageXOffset
    }).addClass('show');
    document.body.addEventListener('click', () => this._$view.removeClass('show'), {once: true});
  }
  _onClick (e) {
    const watchId = this._watchId;
    if (e.ctrlKey) {
      return;
    }

    if (e.shiftKey) {
      // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
      this._send(watchId);
    } else {
      this._open(watchId);
    }
  }
  open (watchId, params) {
    this._open(watchId, params);
  }
  async _open (watchId, params) {
    this._playerOption = Object.assign({
      economy: this._playerConfig.getValue('forceEconomy'),
      query: this._query,
      eventType: 'click'
    }, params);

    const player = await this._getPlayer();
    if (this._playerConfig.getValue('enableSingleton')) {
      ZenzaWatch.external.sendOrOpen(watchId, this._playerOption);
    } else {
      player.open(watchId, this._playerOption);
    }
  }
  send (watchId, params) {
    this._send(watchId, params);
  }
  async _send (watchId, params) {
    await this._getPlayer();
    ZenzaWatch.external.send(watchId, Object.assign({query: this._query}, params));
  }
  _overrideWatchLink () {
    uq('body').on('click', e => {
      if (e.ctrlKey) {
        return;
      }
      const target = this._closest(e.target);
      if (!target || target.classList.contains('noHoverMenu')) {
        return;
      }
      let href = target.dataset.href || target.href;
      let watchId = nicoUtil.getWatchId(href);
      let host = target.hostname;
      if (!['www.nicovideo.jp', 'sp.nicovideo.jp', 'nico.ms'].includes(host)) {
        return;
      }
      this._query = nicoUtil.parseWatchQuery((target.search || '').substr(1));

      if (!watchId || !watchId.match(/^[a-z0-9]+$/)) {
        return;
      }
      if (watchId.startsWith('lv')) {
        return;
      }

      e.preventDefault();

      if (e.shiftKey) {
        // 秘密機能。最後にZenzaWatchを開いたウィンドウで開く
        this._send(watchId);
      } else {
        this._open(watchId);
      }

      window.setTimeout(() => ZenzaWatch.emitter.emit('hideHover'), 1500);
    });
  }
}

//===END===

export {HoverMenu};