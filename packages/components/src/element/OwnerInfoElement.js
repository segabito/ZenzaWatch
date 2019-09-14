
      // {
      //   "icon": "https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/86/865591.jpg?1411004988",
      //   "url": "//www.nicovideo.jp/user/865591",
      //   "id": "865591",
      //   "linkId": "user/865591",
      //   "name": "ピノキオピー さん",
      //   "favorite": false,
      //   "type": "user",
      //   "isMyVideoPublic": false
      // }
//===BEGIN===

class VideoOwnerInfoElement extends HTMLElement {
  constructor() {
    super();
    this._shadow = this.attachShadow({mode: 'open'});
    this.props = {
      icon: VideoOwnerInfoElement.DEFAULT_ICON,
      url: '',
      id: 0,
      linkId: '',
      name: 'guest',
      favorite: false,
      type: '',
      isMyVideoPublic: false
    };
  }

  get info() {
    return Object.assign({}, this.props);
  }

  set info(info) {
    let changed = false;
    for (const key of Object.keys(this.props)) {
      if (this.props[key] !== info[key]) {
        changed = true;
        this.props[key] = info[key];
      }
    }
    if (changed) {
      this.render(this.props);
    }
  }

  render() {
    this._shadow.innerHTML = `
    `;
  }
}
Object.assign(VideoOwnerInfoElement, {
  DEFAULT_ICON: 'https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg'
});


//===END===
export {VideoOwnerInfoElement};