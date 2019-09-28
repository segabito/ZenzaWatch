import {bounce} from '../../../lib/src/infra/bounce';
import {uq} from '../../../lib/src/uQuery';
import {cssUtil} from '../../../lib/src/css/css';
import {domEvent} from '../../../lib/src/dom/domEvent';
//===BEGIN===


class RangeBarElement extends HTMLElement {
  getTemplate() {
    return uq.html`
      <div id="root">
      <style>
        * {
          box-sizing: border-box;
          user-select: none;
          --back-color: #333;
          --fore-color: #ccc;
          --width: 64px;
          --height: 8px;
          --range-percent: 0%;
        }
        #root {
          width: var(--width);
          height: 100%;
          display: flex;
          align-items: center;
        }
        input, .meter {
          width: var(--width);
          height: var(--height);
        }
        input {
          -webkit-appearance: none;
          pointer-events: auto;
          opacity: 0;
          outline: none;
          cursor: pointer;
        }
        input::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: var(--height);
          width: 2px;
        }
        input::-moz-range-thumb {
          height: var(--height);
          width: 2px;
        }
        .meter {
          position: absolute;
          display: inline-block;
          vertical-align: middle;
          background-color: var(--back-color);
          background:
            linear-gradient(to right,
              var(--fore-color), var(--fore-color) var(--range-percent),
              var(--back-color) 0, var(--back-color)
            );
          contain: style layout size;
          pointer-events: none;
        }
        .tooltip {
          display: none;
          pointer-events: none;
          position: absolute;
          left: 50%;
          top: -24px;
          transform: translateX(-50%);
          font-size: 12px;
          line-height: 16px;
          padding: 2px 4px;
          border: 1px solid #000;
          background: #ffc;
          color: black;
          text-shadow: none;
          white-space: nowrap;
          z-index: 100;
        }
        .tooltip:empty { display: none !mportant; }
        #root:active .tooltip { display: inline-block; }
      </style>
      <div class="meter"><div class="tooltip"></div></div>
    </div>`;
  }

  constructor() {
    super();
    this.update = bounce.raf(this.update.bind(this));
    this._value = this.getAttribute('value') || '';
  }

  connectedCallback() {
    if (this._rangeInput) {
      return;
    }
    const range = this.querySelector('input[type=range]');
    if (range) {
      this.rangeInput = range;
    }
  }

  onChange() {
    this.update();
    domEvent.dispatchCustomEvent(this, 'input', {value: this.value}, {bubbles: true, composed: true});
  }

  update() {
    if (!this.rangeInput) { return; }
    const range = this.rangeInput;
    const min   = range.min * 1;
    const max   = range.max * 1;
    const value = range.value * 1;
    if (this.lastValue === value) {
      return;
    }
    this.lastValue = value;
    const per = value / Math.abs(max - min) * 100;
    this.meter.style.setProperty('--range-percent', cssUtil.percent(per));
    this.tooltip.textContent = `${Math.round(per)}%`;
  }

  initShadow() {
    if (this.shadowRoot) {
      return;
    }
    this.attachShadow({mode: 'open'});
    const $tpl = this.$tpl = this.getTemplate();
    $tpl.appendTo(this.shadowRoot);
    this.meter = $tpl.find('.meter')[0];
    this.tooltip = $tpl.find('.tooltip')[0];
  }

  get rangeInput() {
    return this._rangeInput;
  }

  set rangeInput(range) {
    this._rangeInput = range;
    range.view = this;
    this._value && (range.value = this._value);
    this.initShadow();
    this.meter.after(range);
    this.update();
    uq(range).on('input', this.onChange.bind(this));
  }

  get value() {
    return this.rangeInput ? this.rangeInput.value : this._value;
  }

  set value(v) {
    this._value = v;
    if (this.rangeInput) {
      this.rangeInput.value = v;
      this.update();
     }
  }
}
cssUtil.registerProps(
  {name: '--range-percent', syntax: '<percentage>', initialValue: cssUtil.percent(0), inherits: true}
);
if (window.customElements) {
  customElements.get('zenza-range-bar') || window.customElements.define('zenza-range-bar', RangeBarElement);
}

//===END===

export {RangeBarElement};