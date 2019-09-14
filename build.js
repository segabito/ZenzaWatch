var srcDir = './src';
var outFile = 'dist/ZenzaWatch.user.js';
var watchDirs = [
  srcDir,
  './packages/components/src',
  './packages/navi/src',
  './packages/lib/src',
  './packages/zenza/src',
];

var templates = [
  { src: '_template.js', dist: 'dist/ZenzaWatch.user.js', dev: true },
  { src: '_uquery.js', dist: 'dist/uQuery.user.js', dev: true },
  { src: '_pocket.js', dist: 'dist/MylistPocket.user.js', dev: false },
  { src: '_shape.js', dist: 'dist/MaskedWatch.user.js', dev: false },
  // { src: '_navi.js',    dist: 'dist/Navi.user.js', dev: false },
  // { src: '_yomi.js',    dist: 'dist/Yomi.user.js', dev: false },
  // { src: '_vc.js',    dist: 'dist/VoiceControl.user.js', dev: false }
];

const DEV_HEADER = {
  '_template.js': {
    name: '// @name           ZenzaWatch DEV版',
    description: '// @description    ZenzaWatchの開発 先行バージョン'
  },
  '_uquery.js': {

  },
  '_pocket.js': {

  },
  '_yomi.js': {

  },
  '_vc.js': {

  },
  '_shape.js': {

  }
};

let REQMAP = {};

const throttle = (func, interval) => {
  let lastTime = 0;
  let lastArgs = null;
  let timer;
  const result = (...args) => {
    const now = Date.now();
    const timeDiff = now - lastTime;

    if (timeDiff < interval) {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          lastTime = Date.now();
          timer = null;
          func.apply(null, lastArgs);
          lastArgs = null;
        }, Math.max(interval - timeDiff, 0));
      }
      return;
    }

    if (timer) {
      timer = clearTimeout(timer);
    }
    lastTime = now;
    lastArgs = null;
    func(...args);
  };
  result.cancel = () => {
    if (timer) {
      timer = clearTimeout(timer);
    }
  };
  return result;
};


const debounce = (func, interval) => {
  let timer;
  const result = (...args) => {
    if (timer) {
      timer = clearTimeout(timer);
    }
    timer = setTimeout(() => func(...args), interval);
  };
  result.cancel = () => {
    if (timer) { timer = clearTimeout(timer); }
  };
  return result;
};

async function writeIfModified(file, newData, callback) {
  var fs = require('fs');
  return new Promise(res => setTimeout(res, Math.random() * 1000)).then(() => {
    var oldData = fs.readFileSync(file, 'utf-8');
    if (oldData === newData) {
      // callback('Not Modified', null);
      return;
    }

    fs.writeFileSync(file, newData);
    callback('OK', newData);
  }).catch(e => {
    console.log('Exception: ', e);
    fs.writeFileSync(file, newData);
    callback('OK', newData);
  });
}

async function notify(title, message, options = {timeout: 3, subtitle: undefined}) {
  const notifier = require('node-notifier');
  let {timeout, subtitle} = options;
  notifier.notify({title, message, timeout, subtitle});
}

function requireFile(srcDir, file, params, parent = '') {
  var fs = require('fs');
  var path = require('path');
  var lines = [];
  var begin = false;
  var isComment = false;
  var trim = false; //!params.dev && !/NicoTextParser\.js/.test(file);
  var srcFile = path.join(srcDir, file);
  var ignore = false;
  const imports = {};
  const fullpath = path.resolve(srcFile);
  if (REQMAP[fullpath]) {
    REQMAP[fullpath].push(parent);
    console.warn('***WARN***\n"%s" has already required\n in\n %s', fullpath, REQMAP[fullpath].join('\n '));
    // notify('already required', srcFile, parent);
    return `// already required`;
  }
  REQMAP[fullpath] = REQMAP[fullpath] || [];
  REQMAP[fullpath].push(parent || 1);
  try {
    fs.statSync(srcFile);
  } catch (e) {
    console.error('*** Error: %s\n\t   "%s"', e.message || e, srcFile);
    console.log(` required by "${parent}"`);
    notify('build error', `${e.message}\n${file}`);
    return `fild not exist "${srcFile}"\nfrom "${parent}"`;
  }
  fs.readFileSync(srcFile, 'utf-8').split('\n').some(function(line) {
    let lt = line.trim();
    if (!begin && line.trim().match(/^import\s+\{?(.+)\}?\s+from\s+['"](.+)['"]/)) {
      const [$1, $2] = [RegExp.$1, RegExp.$2];
      const modules = $1.split(/[\s,]+/).map(m => m.replace(/[{}*]/g, '').trim()).filter(m => m);
      const modulePath = $2.replace(/\.js$/, '') + '.js';
      modules.forEach(m => imports[m] = modulePath);
    }

    if (lt.startsWith('//@ignore-disable')) {
      ignore = false;
      return;
    } else if (ignore) {
      return;
    } else if (lt.startsWith('//@ignore-enable')) {
      ignore = true;
      return;
    }

    if (lt.match(/\/\/=+BEGIN=+/)) {
      begin = true;
      return;
    }

    lt = lt.replace(/\/\*\*(.*)\*\//g, '');
    if (!isComment && lt.match(/\/\*\*/)) {
      isComment = true;
      // console.log(file, '>', lt);
      lt = lt.replace(/\/\*\*.*/, '');
    } else if (isComment && lt.match(/\*\//)) {
      isComment = false;
      // console.log(file, '>', lt);
      lt = lt.replace(/^.*\*\//, '');
    } else if (isComment) {
      // console.log(file, '>', lt);
      return;
    }
    if (lt.startsWith('//') && !lt.match(/\/\/\s*[@=]/)) {
      return;
    }

    if (begin) {
      if (lt.match(/\/\/=+END=+/)) {
        return true;
      }

      if ((params.dev && line.match(/^\s*\/\/@dev-require (.+)$/)) ||
          line.match(/^\s*\/\/@require (.+)$/)) {
        const m = (RegExp.$1 || '').trim()
        var f = path.join(path.dirname(srcFile), imports[m] || m);
        // imports[m] ? console.log('import ' + f) : console.log('require ' + f);
        lines.push(requireFile(path.dirname(f), path.basename(f), params, path.resolve(srcFile)));
        return;
      }

      // if (!trim) {
      //   lines.push(line);
      //   return;
      // }
      if (lt.length === 0) { return; }
      if (trim) {
        lines.push(line.replace(/^[\s]+/g, '').replace(/([ ]+)/g, ' ')
        );
      } else {
        lines.push(line.replace(/^([\s+]+)/, g => '\t'.repeat(g.length / 2)));
      }
    }
  });

  return lines.join('\n');
}

function deploy(srcFile) {
  var path = require('path');
  var fs   = require('fs');
  if (!fs.existsSync('setting.json')) {
    console.log('setting.json not exist');
    return;
  }

  var setting = JSON.parse(fs.readFileSync('setting.json', 'utf-8'));
  setting.deployTo.some(function(dir) {
    // console.log('deploy To: ', dir);
    if (!fs.existsSync(dir)) {
      // console.log('path not exist: ', dir);
      return;
    }
    var destFile = dir.replace(/\/+$/, '') + '/' + path.basename(srcFile);
    // console.log('deploy file: ', destFile);

    // fs.createReadStream(srcFile).pipe(fs.createWriteStream(destFile));
    writeIfModified(destFile, fs.readFileSync(srcFile, 'utf-8'), function(err, newData) {
      // console.log(err);
    })
  });
}


function loadTemplateFile(srcDir, indexFile, outFile, params) {
  var fs = require('fs');
  var path = require('path');
  var lines = [];
  var ver = null;
  const imports = {};
  const srcFile = path.join(srcDir, indexFile);

  fs.readFileSync(srcFile, 'utf-8').split('\n').some(function(line) {
    if (line.trim().match(/^import\s+\{?(.+)\}?\s+from\s+['"](.+)['"]/)) {
      const [$1, $2] = [RegExp.$1, RegExp.$2];
      const modules = $1.split(/[\s,]+/).map(m => m.replace(/[{}*]/g, '').trim()).filter(m => m);
      const modulePath = $2.replace(/\.js$/, '') + '.js';
      modules.forEach(m => imports[m] = modulePath);
      return;
    }
    if (params.dev) {
      if (line.match(/^\/\/\s*@([a-z0-9+]+)(.*)$/)) {
        let name = RegExp.$1;
        // console.log('header:', indexFile, name, RegExp.$2);
        if (DEV_HEADER[indexFile][name]) {
          line = DEV_HEADER[indexFile][name].trim();
        }
      }
    }
    if (line.match(/\/\/ *==\/UserScript==/)) {
      line +='\n/* eslint-disable */';
    }
    if (line.match(/^(\s*)\/\/\s*@environment$/)) {
      lines.push(`${RegExp.$1}const ENV = '${params.dev ? 'DEV' : 'STABLE'}';\n`);
      return;
    }
    if (line.match(/^(\s*)\/\/\s*@version(.*)$/)) {
      if (!ver) {
        ver = RegExp.$2.trim();
        console.log('ver: ' + ver);
        lines.push(line);
      } else {
        lines.push(RegExp.$1 + 'var VER = \'' + ver + '\';');
      }
      return;
    } else
    if ((params.dev && line.match(/^\s*\/\/@dev-require (.+)$/)) ||
      line.match(/^\s*\/\/@require (.+)$/)) {
      const m = (RegExp.$1 || '').trim()
      var f = path.join(path.dirname(srcFile), imports[m] || m);
      // imports[m] ? console.log('import ' + f) : console.log('require ' + f);
      lines.push(requireFile(path.dirname(f), path.basename(f), params, path.resolve(srcFile)));
      return;
    }
    lines.push(line);
  });

  writeIfModified(outFile, lines.join('\n'), function(err, newData) {
    err && console.log(err);
    if (newData) {
      console.log(`\n>>>>>>update "${outFile}" (${lines.join('\n').split('\n').length} lines)`);
      deploy(outFile);
    }
  });
}

function build(params) {
  var path = require('path');
  templates.forEach(template => {
    var _params = {...params};
    var templateFile = template.src;
    var outFile = template.dist;
    _params.dev = template.dev && params.dev;
    if (_params.dev && !/-dev\.user\.js$/.test(outFile)) {
      outFile = outFile.replace(/\.user\.js$/, '-dev.user.js');
    }
    console.log('\n>>>>>>build: %s', path.basename(outFile));
    REQMAP = {};
    loadTemplateFile(srcDir, templateFile, outFile, _params);
  });
}
const _build = debounce(build, 1000);

function watch(srcDir, params) {
  var fs = require('fs');
  const onChange = async function(event, filename) {
    if (event === 'rename') { // Dropbox経由の更新など
      _build.cancel();
      await new Promise(res => setTimeout(res, Math.random() * 3000));
    }
    console.log('event: "%s", file: "%s"', event, filename);
    try {
      _build(params);
    } catch(e) {
      console.error('error: ', e);
      notify('build error', `${e.message}`);
    }
  };

  fs.watch(srcDir, {recursive: true}, onChange);
}

function run() {
  let params = {};
  process.argv.concat().splice(-2).forEach(v => {
    if (/^--(.+)$/.test(v)) {
      params[RegExp.$1] = 1;
    } else if (/^([a-z0-9]+)=(.*)$/.test(v)) {
      params[RegExp.$1] = RegExp.$2;
    }
  });

  console.log(params);
  build(params);
  if (params.watch) {
    notify('watch start', new Date().toLocaleString());
    watchDirs.forEach(dir => { watch(dir, params); });
  }
}

try {
  run();
} catch(e) {
  console.error('error', e);
  console.trace();
  notify('error', `${e.message || e}`);
}


