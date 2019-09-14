'use strict';

import assert from 'power-assert';
import {StoryboardSession} from '../../src/loader/Storyboard';
import {DmcStoryboardInfoLoader} from '../../src/loader/Storyboard';

// const assert = require('power-assert');
// const {StoryboardSession} = require('../src/loader/Storyboard');
// const {DmcStoryboardInfoLoader} = require('../src/loader/Storyboard');

describe('Storyboard apiのテスト', () => {

  describe('リクエストデータ生成', () => {
    let info = {
      audios: [],
      auth_types: {
        storyboard: 'auth-12345'
      },
      content_id: '12345',
      content_key_timeout: Math.floor(Math.random() * 60000),
      heartbeat_lifetime: Math.floor(Math.random() * 30000),
      movies: [],
      player_id: 'abcdefg-h-ijklmnopqrstr_1234567890',
      priority: Math.random(),
      protocols: [
        'niconico'
      ],
      recipe_id: 'sushi-sm9',
      service_user_id: '1234',
      signature: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      token: '12345-token',
      urls: [
        {
          is_ssl: Math.random() > 0.5,
          is_well_known_port: Math.random() > 0.5,
          url: '//example.com/api/sessions'
        },
        {
          is_ssl: Math.random() > 0.5,
          is_well_known_port: Math.random() > 0.5,
          url: '//example.com/api/sessions'
        }
      ],
      videos: [
        '720p_aaaaa',
        '540p_bbbbb'
      ]
    };

    let session = new StoryboardSession(info);
    let request = JSON.parse(session._createRequestString());

    // 業が深い ネストが深い XMLで書くよりはましか

    assert.equal(info.player_id, request.session.client_info.player_id);

    assert.equal(info.auth_types.storyboard, request.session.content_auth.auth_type);
    assert.equal(info.content_key_timeout,   request.session.content_auth.content_key_timeout);
    assert.equal(info.service_user_id,       request.session.content_auth.service_user_id);

    assert.equal(info.content_id, request.session.content_id);

    assert.equal(info.heartbeat_lifetime, request.session.keep_method.heartbeat.lifetime);
    
    assert.equal(info.heartbeat_lifetime, request.session.keep_method.heartbeat.lifetime);

    assert.equal(info.priority, request.session.priority);

    assert.equal(info.urls[0].is_ssl             ? 'yes' : 'no',
      request.session.protocol.parameters.http_parameters.parameters.storyboard_download_parameters.use_ssl);
    assert.equal(info.urls[0].is_well_known_port ? 'yes' : 'no',
      request.session.protocol.parameters.http_parameters.parameters.storyboard_download_parameters.use_well_known_port);

    assert.equal(info.recipe_id, request.session.recipe_id);

    assert.equal(info.signature,
      request.session.session_operation_auth.session_operation_auth_by_signature.signature);
    assert.equal(info.token,
      request.session.session_operation_auth.session_operation_auth_by_signature.token);

    assert.equal(info.videos[0], request.session.content_src_id_sets[0].content_src_ids[0]);
    assert.equal(info.videos[1], request.session.content_src_id_sets[0].content_src_ids[1]);

  });

  const metadata = {
    'meta': {
      'status': 200,
      'message': 'ok'
    },
    'data': {
      'version': 1,
      'storyboards': [
        {
          'thumbnail_width': Math.floor(Math.random() * 320),
          'thumbnail_height': Math.floor(Math.random() * 180),
          'rows': Math.floor(Math.random() * 50),
          'columns': 10,
          'interval': 1000,
          'quality': Math.floor(Math.random() * 100),
          'images': [
            {
              'timestamp': 0,
              'uri': 'http://example.com/storyboard/ht2_nicovideo/nicovideo-smXXXXXX1'
            },
            {
              'timestamp': 100000,
              'uri': 'http://example.com/storyboard/ht2_nicovideo/nicovideo-smXXXXXX2'
            }
          ]
        },
        {
          'thumbnail_width': Math.floor(Math.random() * 320),
          'thumbnail_height': Math.floor(Math.random() * 180),
          'rows': Math.floor(Math.random() * 50),
          'columns': 10,
          'interval': 1000,
          'quality': Math.floor(Math.random() * 100),
          'images': [
            {
              'timestamp': 0,
              'uri': 'http://example.com/storyboard/ht2_nicovideo/nicovideo-smXXXXXX3'
            },
            {
              'timestamp': 100000,
              'uri': 'http://example.com/storyboard/ht2_nicovideo/nicovideo-smXXXXXX4'
            }
          ]
        }
      ]
    }
  };

  describe('メタデータのパース', () => {
    const data = DmcStoryboardInfoLoader._parseMeta(metadata);
    //console.log(JSON.stringify(data, null, ' '));
    assert.equal(data.format, 'dmc');
    assert.equal(data.status, 'ok');
    assert.equal(data.url,     null);
    assert.equal(data.movieId, null);

    assert.equal(2, data.storyboard.length);
    assert.equal(true,
      data.storyboard[0].quality >= data.storyboard[1].quality,
      '画質の良い順にソートされる'
    );

  });

});

