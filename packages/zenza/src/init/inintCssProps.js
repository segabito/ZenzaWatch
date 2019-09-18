import {cssUtil} from '../../../lib/src/css/css';
import {CONSTANT} from '../../../../src/constant';
import {global} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
const initCssProps = () => {
  const LEN = '<length>';
  const TM = '<time>';
  const LP = '<length-percentage>';
  const CL = '<color>';
  const NUM = '<number>';
  const SEC1 = cssUtil.s(1);
  const PX0 = cssUtil.px(0);
  const TP = 'transparent';
  const inherits = true;
  cssUtil.registerProps(
    {name: '--inner-width',
      syntax: NUM, initialValue: 100,  inherits},
    {name: '--inner-height',
      syntax: NUM, initialValue: 100, inherits},
    {name: '--zenza-ui-scale',
      syntax: NUM, initialValue: 1,  inherits},
    {name: '--zenza-control-bar-height',
      syntax: LEN, initialValue: cssUtil.px(48), inherits},
    {name: '--zenza-comment-layer-opacity',
      syntax: NUM, initialValue: 1,  inherits},
    {name: '--zenza-comment-panel-header-height',
      syntax: LEN, initialValue: cssUtil.px(64), inherits},
    {name: '--sideView-left-margin',
      syntax: LP, initialValue: cssUtil.px(CONSTANT.SIDE_PLAYER_WIDTH + 24), inherits},
    {name: '--sideView-top-margin',
      syntax: LP, initialValue: cssUtil.px(76), inherits},
    {name: '--current-time',
      syntax: TM,  initialValue: SEC1, inherits},
    {name: '--scroll-top',
      syntax: LEN, initialValue: PX0,  inherits},
    {name: '--vpos-time',
      syntax: TM,  initialValue: SEC1, inherits},
    {name: '--duration',
      syntax: TM,  initialValue: cssUtil.s(4), inherits},
    {name: '--playback-rate',
      syntax: NUM, initialValue: 1, inherits},
    {name: '--trans-x-pp',
      syntax: LP, initialValue: PX0, inherits: false},
    {name: '--trans-y-pp',
      syntax: LP, initialValue: PX0, inherits: false},
    {name: '--width-pp',
      syntax: LP, initialValue: PX0, inherits},
    {name: '--height-pp',
      syntax: LP, initialValue: PX0, inherits},
    {name: '--base-bg-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--base-fore-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--light-text-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--scrollbar-bg-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--scrollbar-thumb-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--item-border-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--hatsune-color',
      syntax: CL, initialValue: TP, inherits},
    {name: '--enabled-button-color',
      syntax: CL, initialValue: TP, inherits}
  );
  document.documentElement.style.setProperty('--inner-width', global.innerWidth);
  document.documentElement.style.setProperty('--inner-height', global.innerHeight);
};

//===END===

export {initCssProps};