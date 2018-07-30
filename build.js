var srcDir = './src';
var templateFile =  '_template.js';
var outFile = 'dist/ZenzaWatch.user.js';

var templates = [
  { src: '_template.js', dist: 'dist/ZenzaWatch.user.js' },
  { src: '_navi.js',    dist: 'dist/Navi.user.js' },
  { src: '_yomi.js',    dist: 'dist/Yomi.user.js' }
];

const DEV_HEADER = {
  '_template.js': {
    name: '// @name           ZenzaWatch DEV版',
    description: '// @description    ZenzaWatchの開発 先行バージョン'
  },
  '_navi.js': {

  },
  '_yomi.js': {

  }
};

function writeIfModified(file, newData, callback) {
  var fs = require('fs');
  try {
    var oldData = fs.readFileSync(file, 'utf-8');
    if (oldData === newData) {
      callback('Not Modified', null);
      return;
    }

    fs.writeFileSync(file, newData);
    callback('OK', newData);

  } catch(e) {
    console.log('Exception: ', e);
    fs.writeFileSync(file, newData);
    callback('OK', newData);
  }
}

function requireFile(srcDir, file, params) {
  var fs = require('fs');
  var path = require('path');
  var lines = [];
  var begin = false;
  var trim = !params.dev && !/NicoTextParser\.js/.test(file);
  var srcFile = path.join(srcDir, file);

  fs.readFileSync(srcFile, 'utf-8').split('\n').some(function(line) {
    if (line.trim().indexOf('//===BEGIN===') === 0) {
      begin = true;
      return;
    }

    if (begin) {
      if (line.trim().indexOf('//===END===') === 0) {
        return true;
      }

      if ((params.dev && line.match(/^\s*\/\/@dev-require (.+)$/)) ||
          line.match(/^\s*\/\/@require (.+)$/)) {
        var f = path.join(path.dirname(srcFile), RegExp.$1);
        console.log('require ' + f);
        lines.push(requireFile(path.dirname(f), path.basename(f), params));
        return;
      }

      if (!trim) {
        lines.push(line);
        return;
      }
      if (line.trim().length === 0) { return; }
      lines.push(line
        .replace(/^[ ]+/g, '')
        .replace(/([ ]+)/g, ' ')
      );
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
    console.log('deploy To: ', dir);
    if (!fs.existsSync(dir)) {
      console.log('path not exist: ', dir);
      return;
    }
    var destFile = dir.replace(/\/+$/, '') + '/' + path.basename(srcFile);
    console.log('deploy file: ', destFile);

    fs.createReadStream(srcFile).pipe(fs.createWriteStream(destFile));
  });
}


function loadTemplateFile(srcDir, indexFile, outFile, params) {
  var fs = require('fs');
  var path = require('path');
  var lines = [];
  var ver = null;
  fs.readFileSync(path.join(srcDir, indexFile), 'utf-8').split('\n').some(function(line) {
    if (params.dev) {
      if (line.match(/^\/\/\s*@([a-z0-9+]+)(.*)$/)) {
        let name = RegExp.$1;
        // console.log('header:', name, RegExp.$2);
        if (DEV_HEADER[indexFile][name]) {
          line = DEV_HEADER[indexFile][name].trim();
        }
      }
    }
    if (line.match(/^(\s*)\/\/\s*@environment$/)) {
      lines.push(`${RegExp.$1}const ENV = '${params.dev ? 'DEV' : 'STABLE'}';\n`);
    }
    if (line.match(/^(\s*)\/\/\s*@version(.*)$/)) {
      if (!ver) {
        ver = RegExp.$2.trim();
        console.log('ver = ' + ver);
        lines.push(line);

      } else {
        lines.push(RegExp.$1 + 'var VER = \'' + ver + '\';');
      }
    } else if (params.dev && line.match(/^\s*\/\/@dev-require (.+)$/)) {
      console.log('dev require ' + RegExp.$1);
      lines.push(requireFile(srcDir, RegExp.$1, params));
    } else if (line.match(/^\s*\/\/@require (.+)$/)) {
      console.log('require ' + RegExp.$1);
      lines.push(requireFile(srcDir, RegExp.$1, params));
    } else {
      lines.push(line);
    }
  });

  writeIfModified(outFile, lines.join('\n'), function(err, newData) {
    console.log(err);
    if (newData) {
      deploy(outFile);
    }
  });
}

function build(params) {
  templates.forEach(t => {
    var templateFile = t.src;
    var outFile = t.dist;
    if (params.dev && !/-dev\.user\.js$/.test(outFile)) {
      outFile = outFile.replace(/\.user\.js$/, '-dev.user.js');
    }
    console.log('src: %s, dist: %s', templateFile, outFile);
    loadTemplateFile(srcDir, templateFile, outFile, params);
  });
}


function watch(srcDir, params) {
  var fs = require('fs');
  fs.watch(srcDir, {recursive: true}, function(event, filename) {
    console.log('\n\n\n', event, filename);
    try {
      build(params);
    } catch(e) {
      console.error('error: ', e);
    }
  });
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
    watch(srcDir, params);
  }
}

run();


