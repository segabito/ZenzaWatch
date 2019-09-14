import {Emitter} from '../../../lib/src/Emitter';
import {SlotLayoutWorker} from './SlotLayoutWorker';
import {NicoChatGroupViewModel} from './NicoChatGroupViewModel';
import {NicoChat} from './NicoChat';
import {Config} from '../../../../src/ZenzaWatchIndex';
import {NicoComment} from './NicoComment';
//===BEGIN===

class NicoCommentViewModel extends Emitter {
  constructor(...args) {
    super();
    this.initialize(...args);
  }
  async initialize(nicoComment) {
    const offScreen = this._offScreen = await NicoComment.offscreenLayer.get();

    this._currentTime = 0;
    this._lastUpdate = 0;

    this._topGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.TOP), offScreen);
    this._nakaGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.NAKA), offScreen);
    this._bottomGroup =
      new NicoChatGroupViewModel(nicoComment.getGroup(NicoChat.TYPE.BOTTOM), offScreen);

    const config = Config.namespace('commentLayer');
    if (config.props.enableSlotLayoutEmulation) {
      this._slotLayoutWorker = SlotLayoutWorker.create();
      this._updateSlotLayout = _.debounce(this._updateSlotLayout.bind(this), 100);
    }

    nicoComment.on('setData', this._onSetData.bind(this));
    nicoComment.on('clear', this._onClear.bind(this));
    nicoComment.on('change', this._onChange.bind(this));
    nicoComment.on('parsed', this._onCommentParsed.bind(this));
    nicoComment.on('currentTime', this._onCurrentTime.bind(this));
  }
  _onSetData() {
    this.emit('setData');
  }
  _onClear() {
    this._topGroup.reset();
    this._nakaGroup.reset();
    this._bottomGroup.reset();

    this._lastUpdate = Date.now();
    this.emit('clear');
  }
  _onCurrentTime(sec) {
    this._currentTime = sec;
    this.emit('currentTime', this._currentTime);
  }
  _onChange(e) {
    this._lastUpdate = Date.now();
    this._updateSlotLayout();
    console.log('NicoCommentViewModel.onChange: ', e);
  }
  _onCommentParsed() {
    this._lastUpdate = Date.now();
    this._updateSlotLayout();
  }
  async _updateSlotLayout() {
    if (!this._slotLayoutWorker) {
      return;
    }

    window.console.time('SlotLayoutWorker call');
    const result = await this._slotLayoutWorker.post({
      command: 'layout',
      params: {
        lastUpdate: this._lastUpdate,
        top: this._topGroup.bulkSlotData,
        naka: this._nakaGroup.bulkSlotData,
        bottom: this._bottomGroup.bulkSlotData
      }
    });
    if (result.lastUpdate !== this._lastUpdate) {
      return console.warn('slotLayoutWorker changed', this._lastUpdate, result.lastUpdate);
    }
    this._topGroup.bulkSlotData = result.top;
    this._nakaGroup.bulkSlotData = result.naka;
    this._bottomGroup.bulkSlotData = result.bottom;
    window.console.timeEnd('SlotLayoutWorker call');
  }
  get currentTime() {return this._currentTime;}
  export() {
    const result = [];

    result.push(['<comment ',
      '>'
    ].join(''));

    result.push(this._nakaGroup.export());
    result.push(this._topGroup.export());
    result.push(this._bottomGroup.export());

    result.push('</comment>');
    return result.join('\n');
  }
  getGroup(type) {
    switch (type) {
      case NicoChat.TYPE.TOP:
        return this._topGroup;
      case NicoChat.TYPE.BOTTOM:
        return this._bottomGroup;
      default:
        return this._nakaGroup;
    }
  }
  get bulkLayoutData() {
    return {
      top: this._topGroup.bulkLayoutData,
      naka: this._nakaGroup.bulkLayoutData,
      bottom: this._bottomGroup.bulkLayoutData
    };
  }
  set bulkLayoutData(data) {
    this._topGroup.bulkLayoutData = data.top;
    this._nakaGroup.bulkLayoutData = data.naka;
    this._bottomGroup.bulkLayoutData = data.bottom;
  }
}
//===END===

export {NicoCommentViewModel};