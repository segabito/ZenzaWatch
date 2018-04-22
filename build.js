var srcDir = './src';
var templateFile =  '_template.js';
var outFile = 'dist/ZenzaWatch.user.js';

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

function requireFile(srcDir, file) {
  var fs = require('fs');
  var lines = [];
  var begin = false;
  fs.readFileSync(srcDir + '/' + file, 'utf-8').split('\n').some(function(line) {
    if (line.trim().indexOf('//===BEGIN===') === 0) {
      begin = true;
      return;
    }

    if (begin) {
      if (line.trim().indexOf('//===END===') === 0) {
        return true;
      }
      lines.push(line);
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
  var lines = [];
  var ver = null;
  fs.readFileSync(srcDir + '/' + indexFile, 'utf-8').split('\n').some(function(line) {
    if (params.dev) {
      if (line.match(/^(\s*)\/\/\s*@(name|description)(.*)$/)) {
        line = line.replace(/[\r\n]/g, '');
        lines.push(line + '(DEV版)');
      }
    }
    if (line.match(/^(\s*)\/\/\s*@version(.*)$/)) {
      if (!ver) {
        ver = RegExp.$2.trim();
        console.log('ver = ' + ver);
        lines.push(line);

      } else {
        lines.push(RegExp.$1 + 'var VER = \'' + ver + '\';');
      }
    } else if (line.match(/^\s*\/\/@require (.+)$/)) {
      console.log('require ' + RegExp.$1);
      lines.push(requireFile(srcDir, RegExp.$1));
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
  if (params.dev && !/-dev\.user\.js$/.test(outFile)) {
    outFile = outFile.replace(/\.user\.js$/, '-dev.user.js');
  }
  loadTemplateFile(srcDir, templateFile, outFile, params);
}

function watch(srcDir, params) {
  var fs = require('fs');
  fs.watch(srcDir, {recursive: true}, function(event, filename) {
    console.log('\n\n\n', event, filename);
    try {
      build(params);
    } catch(e) {
      console.log(e);
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


