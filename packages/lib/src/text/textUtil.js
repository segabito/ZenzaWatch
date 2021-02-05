//===BEGIN===

const textUtil = {
  secToTime: sec => {
    return [
      Math.floor(sec / 60).toString().padStart(2, '0'),
      (Math.floor(sec) % 60).toString().padStart(2, '0')
    ].join(':');
  },
  parseQuery: (query = '') => {
    query = query.startsWith('?') ? query.substr(1) : query;
    const result = {};
    query.split('&').forEach(item => {
      const sp = item.split('=');
      const key = decodeURIComponent(sp[0]);
      const val = decodeURIComponent(sp.slice(1).join('='));
      result[key] = val;
    });
    return result;
  },
  parseUrl: url => {
    url = url || 'https://unknown.example.com/';
    return Object.assign(document.createElement('a'), {href: url});
  },
  decodeBase64: str => {
    try {
      return decodeURIComponent(
        escape(atob(
          str.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(str.length / 4) * 4, '=')
        )));
    } catch(e) {
      return '';
    }
  },
  encodeBase64: str => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch(e) {
      return '';
    }
  },
  escapeHtml: text => {
    const map = {
      '&': '&amp;',
      '\x27': '&#39;',
      '"': '&quot;',
      '<': '&lt;',
      '>': '&gt;'
    };
    return text.replace(/[&"'<>]/g, char => map[char]);
  },
  unescapeHtml: text => {
    const map = {
      '&amp;': '&',
      '&#39;': '\x27',
      '&quot;': '"',
      '&lt;': '<',
      '&gt;': '>'
    };
    return text.replace(/(&amp;|&#39;|&quot;|&lt;|&gt;)/g, char => map[char]);
  },
  // 基本的に動画タイトルはエスケープされている。
  // だが、なんかたまにいいかげんなデータがあるし、本当に信用できるか？
  // そこで、全角に置き換えてごますんだ！
  escapeToZenkaku: text => {
    const map = {
      '&': '＆',
      '\'': '’',
      '"': '”',
      '<': '＜',
      '>': '＞'
    };
    return text.replace(/["'<>]/g, char => map[char]);
  },
  escapeRegs: text => {
    const match = /[\\^$.*+?()[\]{}|]/g;
    // return text.replace(/[\\\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/]/g, char => {
    return text.replace(match, '\\$&');
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

    const [yy, mm, dd, h, m, s] = [
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      ].map(n => n.toString().padStart(2, '0'));
    return `${yy}/${mm}/${dd} ${h}:${m}:${s}`;
  },
  isValidJson: data => {
    try {
      JSON.parse(data);
      return true;
    } catch (e) {
      return false;
    }
  },
  toRgba: (c, alpha = 1) =>
    `rgba(${parseInt(c.substr(1, 2), 16)}, ${parseInt(c.substr(3, 2), 16)}, ${parseInt(c.substr(5, 2), 16)}, ${alpha})`,
  snakeToCamel: snake => snake.replace(/-./g, s => s.charAt(1).toUpperCase()),
  camelToSnake: (camel, separator = '_') => camel.replace(/([A-Z])/g, s =>  separator + s.toLowerCase())
};

//===END===

export {textUtil};