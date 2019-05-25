const util = {};
//===BEGIN===


Object.assign(util, {
  secToTime: sec => {
    let m = Math.floor(sec / 60).toString().padStart(2, '0');
    let s = (Math.floor(sec) % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },
  dimport: url => {
    const now = Date.now();
    const callbackName = `dimport_${now}`;
    const loader = `
      import * as module${now} from "${url}";
      window.${callbackName}(module${now});
      `.trim();
    return new Promise((res) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.appendChild(document.createTextNode(loader));
      s.dataset.import = url;
      window[callbackName] = (module) => {
        res(module);
        delete window[callbackName];
      };
      document.documentElement.append(s);
    });
  },
  dateToString: date => {
    if (typeof date === 'string') {
      const origDate = date;
      date = date.replace(/\//g, '-');
      // 時差とか考慮してない
      const m = /^(\d+-\d+-\d+) (\d+):(\d+):(\d+)/.exec(date);
      if (m) {
        date = new Date(m[1]);
        date.setHours(m[2]);
        date.setMinutes(m[3]);
        date.setSeconds(m[4]);
      } else {
        const t = Date.parse(date);
        if (isNaN(t)) {
          return origDate;
        }
        date = new Date(t);
      }
    } else if (typeof date === 'number') {
      date = new Date(date);
    }
    if (!date || isNaN(date.getTime())) {
      return '1970/01/01 00:00:00';
    }

    let [yy, mm, dd, h, m, s] = [
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    ].map(n => n.toString().padStart(2, '0'));
    return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
  },
  // 漢数字のタイトルのソートに使うだけなので百とか千とか考えない
  convertKansuEi: text => {
    // `〇話,一話,二話,三話,四話,五話,六話,七話,八話,九話,十話,十一話,十二話,十三話,
    // 十四話,十五話,十六話,十七話,十八話,十九話,二十話,二十一話,二十二話,二十三話,二十四話,二十五話,二十六話`
    // .split(',').map(c => convertKansuEi(c).replace(/([0-9]{1,9})/g, m =>  m.padStart(3, '0'))).sort()
    let match = /[〇一二三四五六七八九零壱弐惨伍]/g;
    let map = {
      '〇': '0', '零': '0',
      '一': '1', '壱': '1',
      '二': '2', '弐': '2',
      '三': '3', '惨': '3',
      '四': '4',
      '五': '5', '伍': '5',
      '六': '6',
      '七': '7',
      '八': '8',
      '九': '9',
      // '十': 'Ａ', '拾': 'Ａ'
    };
    text = text.replace(match, char => map[char]);
    text = text.replace(/([1-9]?)[十拾]([0-9]?)/g, (n, a, b) => (a && b) ? `${a}${b}` : (a ? a * 10 : 10 + b * 1));
    return text;
  },
  fetch: (url, params) => window.fetch(url, params)

});

//===END===

export {util};