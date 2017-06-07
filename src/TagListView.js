const $ = require('jquery');
const _ = require('lodash');
const ZenzaWatch = {
  util:{},
  debug: {}
};
const util = {};
const TagEditApi = function() {};

//===BEGIN===

  class TagListView extends BaseViewComponent {
    constructor({parentNode}) {
      super({
        parentNode,
        name: 'TagListView',
        template: '<div class="TagListView"></div>',
        shadow: TagListView.__shadow__,
        css: ''
      });

      this._state = {
        isInputing: false,
        isUpdating: false,
        isEditing: false
      };

      this._tagEditApi = new TagEditApi();
    }

    _initDom(...args) {
      super._initDom(...args);

      const v = this._shadow || this._view;
      Object.assign(this._elm, {
        videoTags: v.querySelector('.videoTags')
      });
    }

    _onCommand(command, param) {
      switch (command) {
        default:
          this.emit('command', command, param);
          break;
      }
    }

    update({tagList = [], watchId = null, token = null, watchAuthKey = null}) {
      if (watchId) { this._watchId = null; }
      if (token) { this._token = token; }
      if (watchAuthKey) { this._watchAuthKey = null; }

      this.setState({
        isInputing: false,
        isUpdating: false,
        isEditing: false
      });
      this._update(tagList);
    }

    _update(tagList = []) {
      let tags = [];
      tagList.forEach(tag => {
        tags.push(this._createTag(tag));
      });
      this._elm.videoTags.innerHTML = tags.join('');
    }

    _onApiResult(watchId, result) {
      if (watchId !== this._watchId) {
        return; // 通信してる間に動画変わったぽい
      }
      const err = result.error_message;
      if (err) {
        this.emit('command', 'alert', err);
      }

      this.update(result.tags);
    }

    _addTag(tag) {
      this.setState({isUpdating: true});

      const wait3s = new Promise(resolve => { setTimeout(() => { resolve(); }, 3000); });
      const watchId = this._watchId;
      const csrfToken = this._token;
      const watchAuthKey = this._watchAuthKey;

      return Promise.all(
        wait3s,
        () => {
          return this._tagEditApi.add({
            watchId,
            tag,
            csrfToken,
            watchAuthKey
          });
        }
      ).then((result) => {
        this._onApiResult(watchId, result);
      });
    }

    _removeTag(tagId, tag = '') {
      this.setState({isUpdating: true});

      const wait3s = new Promise(resolve => { setTimeout(() => { resolve(); }, 3000); });
      const watchId = this._watchId;
      const csrfToken = this._token;
      const watchAuthKey = this._watchAuthKey;

      return Promise.all(
        wait3s,
        () => {
          return this._tagEditApi.remove({
            watchId,
            tag,
            id: tagId,
            csrfToken,
            watchAuthKey
          });
        }
      ).then((result) => {
        this._onApiResult(watchId, result);
      });
    }

    _createDicIcon(text, hasDic) {
      let href= `//dic.nicovideo.jp/a/${encodeURIComponent(text)}`;
      let src = hasDic ?
        '//live.nicovideo.jp/img/2012/watch/tag_icon002.png' :
        '//live.nicovideo.jp/img/2012/watch/tag_icon003.png';
      let icon = `<img class="dicIcon" src="${src}">`;
      return `<a target="_blank" class="nicodic" href="${href}">${icon}</a>`;
    }

    _createLink(text) {
      let href = `//www.nicovideo.jp/tag/${encodeURIComponent(text)}`;
      // タグはエスケープされた物が来るのでそのままでつっこんでいいはずだが、
      // 古いのはけっこういい加減なデータもあったりして信頼できない
      text = util.escapeToZenkaku(util.unescapeHtml(text));
      return `<a class="tagLink" href="${href}">${text}</a>`;
    }

    _createSearch(text) {
      let title = '投稿者の動画を検索';
      let command = 'owner-video-search';
      let param = util.escapeHtml(text);
      return (`<a class="playlistAppend command" title="${title}" data-command="${command}" data-param="${param}">▶</a>`);
    }

    _createTag(tag) {
      let text = tag.tag;
      let dic  = this._createDicIcon(text, !!tag.dic);
      let link = this._createLink(text);
      let search = this._createSearch(text);
      let data = util.escapeHtml(JSON.stringify(tag));
      let className = tag.locked ? 'tagItem is-Locked' : 'tagItem';
      return `<li class="${className}" data-tag="${data}" data-tag-id="${tag.id}">${dic}${link}${search}</li>`;
    }

  }

  TagListView.__shadow__ = (`
    <style>
      .button {
        display: inline-block;
        min-width: 50px;
        user-select: none;
        transition: 0.2s transform, 0.2s box-shadow;
      }
      .button:hover {
        transform: translate(0, -4px);
        box-shadow: 0 -2px 2px #333;
      }
      .button:active {
        transform: translate(0, 0);
        box-shadow: 0 0 2px #333 inset;
      }

      .videoTags {
        display: inline-block;
        padding: 0;
      }

      .tagItem {
        position: relative;
        list-style-type: none;
        display: inline-block;
        margin-right: 4px;
        padding: 4px 4px 0;
        line-height: 20px;
      }

      .tagLink {
        color: #fff;
        text-decoration: none;
        user-select: none;
      }

      .nicodic {
        display: inline-block;
        margin-right: 4px;
        line-height: 20px;
      }

      .playlistAppend {
        display: inline-block;
        position: relative;
        left: auto;
        bottom: auto;
      }

      .playlistAppend {
        display: inline-block;
        font-size: 16px;
        line-height: 20px;
        width: 24px;
        height: 24px;
        bottom: 4px;
        background: #666;
        color: #ccc;
        background: #666;
        text-decoration: none;
        border: 1px outset;
        transition: transform 0.2s ease;
        cursor: pointer;
        text-align: center;
        user-select: none;
        visibility: hidden;
      }

      .tagItem:hover .playlistAppend {
        visibility: visible;
        transition: transform 0.2s ease;
      }

      .tagItem:hover .playlistAppend:hover {
        transform: scale(1.5);
      }

      .tagItem:hover .playlistAppend:active {
        transform: scale(1.4);
      }

      .is-Editing .playlistAppend {
        visibility: hidden !important;
      }

      .is-Editing .tagLink {
        pointer-events: none;
      }
      .is-Editing .dicIcon {
        display: none;
      }

      .is-Editing .tagItem.is-Locked {
        pointer-events: none;
        border: 1px solid #888;
        border-radius: 4px;
      }

      .is-Editing .tagItem:not(.is-Locked) {
        transform: translate(0, -12px);
        text-shadow: 0 12px 4px rgba(0, 0, 0, 0.5);
        transition: transform 0.2s, text-shadow 0.2s;
      }


      .tagInputContainer {
        display: none;
        padding: 0 8px;
        background: #666;
      }
      .is-Inputing .tagInputContainer {
        display: inline-block;
      }
        .tagInput {
          border: 1px solid;
        }
        .tagInput:active {
          box-shadow: 0 0 4px #fe9;
        }
        .submit, .cancel {
          background: #666;
          color: #ccc;
          cursor: pointer;
          border: 1px solid;
          text-align: center;
        }


    </style>
    <div class="root TagListView">
      <div class="videoTags"></div>
      <div>
      <div class="tagInputContainer">
        <input type="text" class="tagInput">
        <div class="submit button">O K</div>
        <div class="cancel button">キャンセル</div>
      </div>
    </div>
  `).trim();

//===END===

module.exports = {TagListView};
