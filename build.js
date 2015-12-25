var srcDir = './src';
var indexFile =  'index.js';
var outFile = 'ZenzaWatch.user.js';

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
  if (!path.existsSync('setting.json')) {
    console.log('setting.json not exist');
    return;
  }

  var setting = JSON.parse(fs.readFileSync('setting.json', 'utf-8'));
  setting.deployTo.some(function(dir) {
    if (!path.existsSync(dir)) {
      console.log('path not exist: ', dir);
      return;
    }
    var destFile = dir.replace(/\/+$/, '') + '/' + path.basename(srcFile);
    console.log('deploy file: ', destFile);

    fs.createReadStream(srcFile).pipe(fs.createWriteStream(destFile));
  });
}


function loadIndexFile(srcDir, indexFile, outFile) {
  var fs = require('fs');
  var lines = [];
  fs.readFileSync(srcDir + '/' + indexFile, 'utf-8').split('\n').some(function(line) {
    if (line.match(/^\s*\/\/@require (.+)$/)) {
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

function build() {
  loadIndexFile(srcDir, indexFile, outFile);
}

function watch(srcDir) {
  var fs = require('fs');
  fs.watch(srcDir, function(event, filename) {
    console.log('\n\n\n', event, filename);
    build();
  });
}

function run() {
  build();

  watch(srcDir);
}

run();


