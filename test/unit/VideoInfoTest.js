import {VideoInfoModel} from '../../src/VideoInfo';
import assert from 'power-assert';

let rawData;

describe('maybeBetterQualityServerType smileとdmc どっちがたぶん高画質？の判定', function () {

  let reload = () => {
    let fs = require('fs');
    let path = './test/fixtures/VideoInfoRawData.json';
    rawData = JSON.parse(fs.readFileSync(path, 'utf8'));
  };

  beforeEach(() => {
    reload();
  });

  it('smile側が エコノミー or swf orない 場合は無条件に smile', function () {
    let info;

    rawData.flvInfo.url = 'http://smile-com42.nicovideo.jp/smile?m=9.0468low';
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType, 'エコノミー');

    rawData.flvInfo.url = 'http://smile-com42.nicovideo.jp/smile?s=9.0468low';
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType, 'swf');

    rawData.flvInfo.url = '';
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType, 'smileがない');
  });

  it('dmc未対応の動画は無条件に smile', function () {
    let info;

    rawData.dmcInfo = null;
    rawData.isDmc = false;
    rawData.flvInfo.url = 'http://smile-com42.nicovideo.jp/smile?m=9.0468';
    info = new VideoInfoModel(rawData);
    // console.log('dmcInfo', info.dmcInfo, info.isDmc, info.videoUrl);
    assert.equal('smile', info.maybeBetterQualityServerType, 'dmcがない');
  });

  it('dmcに取り込まれた古い動画はエンコードがひどいので smile', function () {
    rawData.dmcInfo.session_api.videos = ['archive_h264_2000kbps_720p', 'archive_h264_1000kbps_540p'];
    let info;

    rawData.flvInfo.url = 'http://smile-com42.nicovideo.jp/smile?m=9.0468';
    rawData.watchApiData.videoDetail.width = 512;
    rawData.watchApiData.videoDetail.height = 384;
    rawData.dmcInfo.import_version = 2;
    info = new VideoInfoModel(rawData);
    // console.log('importVersion', info.dmcInfo.importVersion);
    assert.equal('smile', info.maybeBetterQualityServerType, 'import_version=2');

    rawData.dmcInfo.import_version = 0;
    info = new VideoInfoModel(rawData);
    // console.log('importVersion', info.dmcInfo.importVersion);
    assert.equal('dmc', info.maybeBetterQualityServerType, 'import_version=0');
  });

  it('smile側が1280x720を超える場合は smile', function () {
    let info;
    rawData.dmcInfo.import_version = 0;

    rawData.watchApiData.videoDetail.width = 1280;
    rawData.watchApiData.videoDetail.height = 720;
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 1280;
    rawData.watchApiData.videoDetail.height = 721;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 1281;
    rawData.watchApiData.videoDetail.height = 720;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 1281;
    rawData.watchApiData.videoDetail.height = 721;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 1920;
    rawData.watchApiData.videoDetail.height = 1080;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType);
  });

  it('smileが720p以下でDMC側が720以上を持っている場合は DMC', function () {
    rawData.dmcInfo.session_api.videos = ['archive_h264_6000kbps_1080p', 'archive_h264_2000kbps_720p', 'archive_h264_1000kbps_540p'];
    let info;

    rawData.watchApiData.videoDetail.width = 1280;
    rawData.watchApiData.videoDetail.height = 720;
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 1280;
    rawData.watchApiData.videoDetail.height = 721;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType);
  });

  it('smile側が縦360を下回る場合smileが高画質と判断(レトロゲームのTASなど)', function () {
    rawData.dmcInfo.session_api.videos = ['archive_h264_2000kbps_720p', 'archive_h264_1000kbps_540p'];
    let info;

    rawData.watchApiData.videoDetail.width = 640;
    rawData.watchApiData.videoDetail.height = 480;
    info = new VideoInfoModel(rawData);
    assert.equal('dmc', info.maybeBetterQualityServerType);

    rawData.watchApiData.videoDetail.width = 256;
    rawData.watchApiData.videoDetail.height = 224;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, 'FC');

    rawData.watchApiData.videoDetail.width = 256;
    rawData.watchApiData.videoDetail.height = 224;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, 'MD');
  });

  it('旧プレイヤーぴったりの解像度はsmileが高画質と判断', function () {
    let info;

    // 640x360 はDMCにも存在するので判断を保留

    rawData.watchApiData.videoDetail.width = 522;
    rawData.watchApiData.videoDetail.height = 288;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, '昔の16:9');

    rawData.watchApiData.videoDetail.width = 512;
    rawData.watchApiData.videoDetail.height = 384;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, '原宿までの4:3');

    rawData.watchApiData.videoDetail.width = 640;
    rawData.watchApiData.videoDetail.height = 384;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, '原宿までの15:9');

    rawData.watchApiData.videoDetail.width = 864;
    rawData.watchApiData.videoDetail.height = 486;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, 'ZeroWatch 16:9');

    rawData.watchApiData.videoDetail.width = 648;
    rawData.watchApiData.videoDetail.height = 486;
    info = new VideoInfoModel(rawData);
    assert.equal('smile', info.maybeBetterQualityServerType, 'ZeroWatch 16:9');
  });

});
