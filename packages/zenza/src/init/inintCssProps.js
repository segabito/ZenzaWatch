import {cssUtil} from '../../../lib/src/css/css';
import {CONSTANT} from '../../../../src/constant';
import {global} from '../../../../src/ZenzaWatchIndex';
//===BEGIN===
const initCssProps = (win) => {
  win = win || window;
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
    // {name: '--inner-width', window: win,
    //   syntax: NUM, initialValue: cssUtil.number(100), inherits},
    // {name: '--inner-height', window: win,
    //   syntax: NUM, initialValue: cssUtil.number(100), inherits},
    {name: '--zenza-ui-scale', window: win,
      syntax: NUM, initialValue: cssUtil.number(1), inherits},
    {name: '--zenza-control-bar-height', window: win,
      syntax: LEN, initialValue: cssUtil.px(48), inherits},
    {name: '--zenza-comment-layer-opacity', window: win,
      syntax: NUM, initialValue: cssUtil.number(1),  inherits},
    {name: '--zenza-comment-panel-header-height', window: win,
      syntax: LEN, initialValue: cssUtil.px(64), inherits},
    {name: '--sideView-left-margin', window: win,
      syntax: LP, initialValue: cssUtil.px(CONSTANT.SIDE_PLAYER_WIDTH + 24), inherits},
    {name: '--sideView-top-margin', window: win,
      syntax: LP, initialValue: cssUtil.px(76), inherits},
    // {name: '--current-time', window: win,
    //   syntax: TM,  initialValue: SEC1, inherits},
    // {name: '--scroll-top', window: win,
    //   syntax: LEN, initialValue: PX0,  inherits},
    // {name: '--vpos-time', window: win,
    //   syntax: TM,  initialValue: SEC1, inherits},
    // {name: '--duration', window: win,
    //   syntax: TM,  initialValue: cssUtil.s(4), inherits},
    // {name: '--playback-rate', window: win,
    //   syntax: NUM, initialValue: cssUtil.number(1), inherits},
    // {name: '--trans-x-pp', window: win,
    //   syntax: LP, initialValue: PX0, inherits: false},
    // {name: '--trans-y-pp', window: win,
    //   syntax: LP, initialValue: PX0, inherits: false},
    // {name: '--width-pp', window: win,
    //   syntax: LP, initialValue: PX0, inherits},
    // {name: '--height-pp', window: win,
    //   syntax: LP, initialValue: PX0, inherits},
    {name: '--base-bg-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--base-fore-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--light-text-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--scrollbar-bg-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--scrollbar-thumb-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--item-border-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--hatsune-color', window: win,
      syntax: CL, initialValue: TP, inherits},
    {name: '--enabled-button-color', window: win,
      syntax: CL, initialValue: TP, inherits}
  );
  cssUtil.setProps(
    [document.documentElement, '--inner-width', cssUtil.number(global.innerWidth)],
    [document.documentElement, '--inner-height', cssUtil.number(global.innerHeight)]
  );
};

//===END===

export {initCssProps};