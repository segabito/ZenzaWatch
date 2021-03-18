// ==UserScript==
// @name        MylistPocket
// @namespace   https://github.com/segabito/
// @description 動画をあとで見る ＋ 簡易NG機能。 ZenzaWatchとの連携も可能。
// @match       *://www.nicovideo.jp/*
// @match       *://ext.nicovideo.jp/
// @match       *://ext.nicovideo.jp/#*
// @match       *://ch.nicovideo.jp/*
// @match       *://com.nicovideo.jp/*
// @match       *://commons.nicovideo.jp/*
// @match       *://dic.nicovideo.jp/*
// @match       *://ex.nicovideo.jp/*
// @match       *://info.nicovideo.jp/*
// @match       *://search.nicovideo.jp/*
// @match       *://uad.nicovideo.jp/*
// @match       *://site.nicovideo.jp/*
// @match       *://anime.nicovideo.jp/*
// @match       https://www.google.com/search?*
// @match       https://www.google.co.jp/search?*
// @match       https://*.bing.com/*
// @exclude     *://ads*.nicovideo.jp/*
// @exclude     *://www.upload.nicovideo.jp/*
// @exclude     *://www.nicovideo.jp/watch/*?edit=*
// @exclude     *://ch.nicovideo.jp/tool/*
// @exclude     *://flapi.nicovideo.jp/*
// @exclude     *://dic.nicovideo.jp/p/*
// @exclude     *://ext.nicovideo.jp/thumb/*
// @exclude     *://ext.nicovideo.jp/thumb_channel/*
// @version     0.5.14
// @grant       none
// @author      segabito macmoto
// @license     public domain
// @require     https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.5/lodash.min.js
// ==/UserScript==

import {gate} from '../packages/lib/src/message/gate';
import {nicoUtil} from '../packages/lib/src/nico/nicoUtil';
import {netUtil} from '../packages/lib/src/infra/netUtil';
import {textUtil} from '../packages/lib/src/text/textUtil';
import {workerUtil} from '../packages/lib/src/infra/workerUtil';
import {IndexedDbStorage} from '../packages/lib/src/infra/IndexedDbStorage';
import {css} from '../packages/lib/src/css/css';
import {Emitter, PromiseHandler} from '../packages/lib/src/Emitter';
import {AntiPrototypeJs} from '../packages/lib/src/infra/AntiPrototype-js';
import {CrossDomainGate} from '../packages/lib/src/infra/CrossDomainGate';
import {StorageWriter} from '../packages/lib/src/infra/StorageWriter';
import {DataStorage} from '../packages/lib/src/infra/DataStorage';
import {reg} from '../packages/lib/src/text/reg';
import {parseThumbInfo} from '../packages/lib/src/nico/parseThumbInfo';
import {ThumbInfoCacheDb} from '../packages/lib/src/nico/ThumbInfoCacheDb';
import {objUtil} from '../packages/lib/src/infra/objUtil';
import {bounce} from '../packages/lib/src/infra/bounce';
//@require AntiPrototypeJs
AntiPrototypeJs().then(() => {
  const PRODUCT = 'MylistPocket';

  const monkey = (PRODUCT) => {
    const console = window.console;
    const {workerUtil} = window.MylistPocketLib;
    //const $ = window.jQuery;
    console.log(`%c${PRODUCT}`,
      'font-family: "Apple LiGothic"; padding: 4px; background: red; color: white; font-size: 150%;'
    );
    const TOKEN = 'r:' + (Math.random());

    const CONSTANT = {
      BASE_Z_INDEX: 100000
    };
    const MylistPocket = {debug: {}};
    window.MylistPocket = MylistPocket;

    const protocol = location.protocol;
    const global = {
      debug: MylistPocket.debug,
      TOKEN,
      PRODUCT
    };

    const __css__ = (`
      a[href*='watch/'] > g-img {
        position: inherit;
      }

      .mylistPocketHoverMenu {
        display: none;
        opacity: 0.8;
        position: absolute;
        z-index: ${CONSTANT.BASE_Z_INDEX + 100000};
        font-size: 8pt;
        padding: 0;
        line-height: 26px;
        font-weight: bold;
        text-align: center;
        transition: box-shadow 0.2s ease, opacity 0.4s ease, padding 0.2s ease;
        user-select: none;
      }

      .mylistPocketHoverMenu.is-busy {
        opacity: 0 !important;
        pointer-events: none;
      }
        .mylistPocketHoverMenu.is-otherDomain .wwwOnly {
          display: none;
        }
        .mylistPocketHoverMenu.is-otherDomain:not(.is-zenzaReady) .wwwZenzaOnly {
          display: none;
        }
        .mylistPocketHoverMenu .zenzaMenu {
          display: none;
        }
        .mylistPocketHoverMenu.is-zenzaReady .zenzaMenu {
          display: inline-block;
        }


      .mylistPocketButton {
        /*font-family: Menlo;*/
        display: block;
        font-weight: bolder;
        cursor: pointer;
        width: 32px;
        height: 26px;
        background: #ccc;
        color: black;
        cursor: pointer;
        box-shadow: 1px 1px 1px #000;
        transition:
          0.1s box-shadow ease,
          0.1s transform ease;
        font-size: 16px;
        line-height: 24px;
        -webkit-user-select: none;
        -moz-use-select: none;
        user-select: none;
        outline: none;
      }

      .mylistPocketButton:hover {
        transform: scale(1.2);
        box-shadow: 4px 4px 5px #000;
      }

      .mylistPocketButton:active {
        transform: scale(1.0);
        box-shadow: none;
        transition: none;
      }

      .is-deflistUpdating .mylistPocketButton.deflist-add::after,
      .is-deflistSuccess  .mylistPocketButton.deflist-add::after,
      .is-deflistFail     .mylistPocketButton.deflist-add::after,
      .mylistPocketButton:hover::after, #mylistPocket-poupup [tooltip] {
        content: attr(tooltip);
        position: absolute;
        /*top:  0px;
        left: 50%;*/
        top:  50%;
        right: -8px;
        padding: 2px 4px;
        white-space: nowrap;
        font-size: 12px;
        color: #fff;
        background: #333;
        transform: translate3d(-50%, -120%, 0);
        transform: translate3d(100%, -50%, 0);
        pointer-events: none;
      }

      .is-deflistUpdating .mylistPocketButton.deflist-add {
        cursor: wait;
        opacity: 0.9;
        transform: scale(1.0);
        box-shadow: none;
        transition: none;
        background: #888;
        border-style: inset;
      }
      .is-deflistSuccess .mylistPocketButton.deflist-add,
      .is-deflistFail    .mylistPocketButton.deflist-add {
        transform: scale(1.0);
        box-shadow: none;
        transition: none;
      }
      .is-deflistSuccess  .mylistPocketButton.deflist-add::after {
        content: attr(data-result);
        background: #393;
      }
      .is-deflistFail     .mylistPocketButton.deflist-add::after {
        content: attr(data-result);
        background: #933;
      }
      .is-deflistUpdating .mylistPocketButton.deflist-add::after {
        content: '更新中';
        background: #333;
      }

      .mylistPocketButton + .mylistPocketButton {
        margin-top: 4px;
      }

      .mylistPocketHoverMenu:hover {
        font-weibht: bolder;
        opacity: 1;
      }

      .mylistPocketHoverMenu:active {
      }

      .mylistPocketHoverMenu.is-show {
        display: block;
      }

      #mylistPocket-popup {
        display: none;
        perspective: 800px;
      }
      #mylistPocket-popup.is-firefox {
        /*perspective: none !important;*/
        position: fixed;
        z-index: 200000;
        transform: translate3d(-50%, -50%, 0);
        opacity: 0;
        transition: 0.3s opacity ease;
        top: -9999px; left: -9999px;
      }

      #mylistPocket-popup.show {
        display: block;
      }
      #mylistPocket-popup.is-firefox.show {
        top: 50%;
        left: 50%;
        opacity: 1;
      }


      #mylistPocket-popup .owner-icon {
        width: 64px;
        height: 64px;
        transform-origin: center;
        transform-origin: center;
        transition:
          0.2s transform ease,
          0.2s box-shadow ease
        ;
      }
      #mylistPocket-popup .owner-icon:hover {
      }

      #mylistPocket-popup .description a {
        color: #ffff00 !important;
        text-decoration: none !important;
        font-weight: normal !important;
        display: inline-block;
      }
      #mylistPocket-popup .description a.watch {
        position: relative;
        display: block;
        backface-visibility: hidden;
      }

      #mylistPocket-popup .description a[data-title]:hover::after {
        content: attr(data-title);
        position: absolute;
        top: -16px;
        left: 0;
        word-break: break-all;
        line-height: 12px;
        padding: 4px;
        font-size: 12px;
        color: #333;
        background: #ffc;
        opacity: 0.8;
        user-select: none;
        pointer-events: none;
      }

      #mylistPocket-popup .description a:visited {
        color: #ffff99 !important;
      }
      #mylistPocket-popup .description button {
        /*font-family: Menlo;*/
        font-size: 16px;
        font-weight: bolder;
        margin: 4px 8px;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 0;
        background: #333;
        color: #ccc;
        border: solid 2px #ccc;
        outline: none;
      }
      #mylistPocket-popup .description button:hover {
        transform: translate(-2px,-2px);
        box-shadow: 2px 2px 2px #000;
        background: #666;
        transition:
          0.2s transform ease,
          0.2s box-shadow ease
          ;
      }
      #mylistPocket-popup .description button:active {
        transform: none;
        box-shadow: none;
        transition: none;
      }
      #mylistPocket-popup .description button:active::hover {
        opacity: 0;
      }

      #mylistPocket-popup .watch {
        display: block;
        position: relative;
        line-height: 60px;
        box-sizing: border-box;
        padding: 4px 16px;;
        min-height: 60px;
        width: 280px;
        margin: 8px 10px;
        background: #444;
        border-radius: 4px;
      }

      #mylistPocket-popup .watch:hover {
        background: #446;
      }

      #mylistPocket-popup .videoThumbnail {
        position: absolute;
        right: 16px;
        height: 60px;
        transform-origin: center;
        transition:
          0.2s transform ease,
          0.2s box-shadow ease
        ;
      }
      #mylistPocket-popup .videoThumbnail:hover {
        transform: scale(2);
        box-shadow: 0 0 8px #888;
        transition:
          0.2s transform ease 0.5s,
          0.2s box-shadow ease 0.5s
        ;
      }


    .zenzaPlayerContainer.is-error   #mylistPocket-popup,
    .zenzaPlayerContainer.is-loading #mylistPocket-popup,
    .zenzaPlayerContainer.error   #mylistPocket-popup,
    .zenzaPlayerContainer.loading #mylistPocket-popup {
      opacity: 0;
      pointer-events: none;
    }

    .mylistPocketHoverMenu.is-guest .is-need-login {
      display: none !important;
    }

      .xDomainLoaderFrame {
        position: fixed;
        left: -100%;
        top: -100%;
        width: 64px;
        height: 64px;
        opacity: 0;
        border: 0;
      }

      body.BaseLayout {
        margin-top: 0 !important;
      }
      ${
      location.host === 'www.niovideo.jp' ? `
      #siteHeader {
        position: sticky;
        left: 0 !important;
        will-change: transform;
      }

      body.nofix #siteHeader {
        position: static;
      }

      .RankingMainContainer-header {
        position: sticky;
        top: 36px;
        z-index: 1000;
        background:
          linear-gradient(to bottom,
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0.7),
            rgba(255, 255, 255, 1.0),
            rgba(255, 255, 255, 0.8),
            rgba(232, 232, 255, 0)
          );
      }
      .nofix .RankingMainContainer-header {
        top: 0;
      }

      .RankingBaseItem {
        border-radius: 0 !important;
        box-shadow: none !important;
        border: 1px solid silver;
        pointer-events: none;
        user-select: none;
        display: grid;
      }
        .RankingBaseItem .Card-link {
          display: grid;
          grid-template-rows: 108px auto;
        }
          .RankingBaseItem .Card-media {
            position: static;
            pointer-events: auto;
          }
            .VideoThumbnail {
              border-radius: 0 !important;
            }
          .RankingBaseItem .Card-title {
            pointer-events: auto;
            user-select: auto;
            height: auto;
            max-height: 49px;
            -webkit-line-clamp: unset;

          }
          .RankingBaseItem .Card-secondary {
            width: 100%;
            user-select: none;
            pointer-events: none;
            align-self: end;
            overflow: hidden;

          }

      [data-nicoad-grade=gold] .Thumbnail.VideoThumbnail {
        background: #f7e01c;
      }
      [data-nicoad-grade=silver] .Thumbnail.VideoThumbnail {
        background: #dfeaec;
      }

      .MatrixRanking-body.GlobalHeader#siteHeader #siteHeaderInner {
        width: 1232px;
      }

      .MatrixRanking-body .RankingRowRank {
        line-height: 48px;
        height: 48px;
        pointer-events: none;
        user-select: none;
      }
      .MatrixRanking-body .RankingMatrixVideosRow {
        width: ${1232 + 64}px;
        margin-left: ${-64}px;
      }
      .MatrixRanking-body .RankingRowRank {
        position: sticky;
        left: -8px;
        z-index: 100;
        transform: none;
        padding-right: 16px;
        width: 64px;
        overflow: visible;
        text-align: right;
        mix-blend-mode: difference;
        text-shadow:
           1px  1px 0 #fff,
           1px -1px 0 #fff,
          -1px  1px 0 #fff,
          -1px -1px 0 #fff;

              }
      ` : ''}
    `).trim();

    const nicoadHideCss = `
      .nicoadVideoItem {
        display: none;
      }
      .MatrixRankingBannerAd,
      .RankingMatrixNicoadsRow, .RankingMainNicoad {
        display: none;
      }
    `.trim();

    const responsiveCss = `

      @media screen and (max-width: 1350px) {
        .RankingGenreListContainer {
          border-right: 0;
          border-left: 56px solid #fafafa;
        }
        .RankingGenreListContainer-categoryHelp {
          position: static;
        }
        .GlobalHeader#siteHeader #siteHeaderInner {
          width: 1024px;
        }
        .RankingHeaderContainer-headerInner {
          margin-left: 64px;
          width: 1214px;
        }
        .LaneHeader {
          flex: 1 1 160px;
          width: 160px;
        }
        .LaneHeader+.LaneHeader {
          /*margin-left: 13px;*/
        }
        .LaneHeader>p {
          white-space: normal;
          height: 32px;
          line-height: 16px;
        }
        .CustomButton {
          width: 136px;
        }
        .MatrixRanking-body .BaseLayout-block {
          width: ${1280}px;
        }
        .RankingMainContainer-decorateChunk+.RankingMainContainer-decorateChunk,
         .RankingMainContainer-decorateChunk>*+* {
           margin-top: 0;
        }
        .RankingMainContainer {
          width: ${1024}px;
        }
        .MatrixRanking-body .RankingMatrixVideosRow {
          width: ${1024 + 64}px;
          margin-left: ${-64}px;
        }
          .RankingMatrixNicoadsRow>*+*,
          .RankingMatrixVideosRow>:nth-child(n+3) {
              margin-left: 13px;
          }
          .RankingBaseItem {
            width: 160px;
            height: 196px;
          }
            .RankingBaseItem .Card-link {
            grid-template-rows: 90px auto;
            }
            .VideoItem.RankingBaseItem .VideoThumbnail {
              border-radius: 3px 3px 0 0;
            }

            [data-nicoad-grade] .Thumbnail.VideoThumbnail .Thumbnail-image {
                margin: 3px;
                background-size: calc(100% + 6px);
            }
            [data-nicoad-grade] .Thumbnail.VideoThumbnail:after {
                width: 40px;
                height: 40px;
                background-size: 80px 80px;
            }
            .Thumbnail.VideoThumbnail .VideoLength {
              bottom: 3px;
              right: 3px;
            }
            .VideoThumbnailComment {
              transform: scale(0.8333);
            }
            .RankingBaseItem-meta {
              position: static;
              padding: 0 4px 8px;
            }
            .VideoItem.RankingBaseItem .VideoItem-metaCount>.VideoMetaCount {
              white-space: nowrap;
            }
        .RankingMainContainer .ToTopButton {
          transform: translateX(calc(100vw / 2 - 100% - 36px));
          user-select: none;
        }
      }
    `;

    const __tpl__ = (`
      <div class="mylistPocketHoverMenu scalingUI zen-family">
        <button class="mylistPocketButton command deflist-add wwwZenzaOnly is-need-login" data-command="deflist"
          tooltip="とりあえずマイリスト">&#x271A;</button>
        <button class="mylistPocketButton command info" data-command="info"
          tooltip="動画情報を表示">？</button>
        <button class="mylistPocketButton command playlist-queue zenzaMenu" data-command="playlist-queue"
          tooltip="ZenzaWatchのプレイリストに追加">▶</button>
      </div>
      </div>

      <div id="mylistPocket-popup" class="zen-family">
        <span slot="video-title">【実況】どんぐりころころの大冒険 Part1(最終回)</span>
        <a href="/watch/sm9" slot="watch-link"></a>
        <img slot="video-thumbnail" data-type="image">
        <a slot="owner-page-link" href="https://www.nicovideo.jp/user/1234" class="owner-page-link target-change" data-type="link" rel="noopener"><img slot="owner-icon" class="owner-icon" src="https://nicovideo.cdn.nimg.jp/web/img/user/thumb/blank_s.jpg" data-type="image"></img></a>

        <span slot="upload-date"     data-type="date">1970/01/01 00:00</span>
        <span slot="view-counter"    data-type="int">12,345</span>
        <span slot="mylist-counter"  data-type="int">6,789</span>
        <span slot="comment-counter" data-type="int">2,525</span>

        <span slot="duration" class="duration">1:23</span>

        <span slot="owner-id">1234</span>
        <span slot="locale-owner-name">ほげほげ</span>

        <div slot="error-description"></div>
        <div class="description" slot="description" data-type="html"></div>
        <span slot="last-res-body"></span>

      </div>

      <template id="mylistPocket-popup-template">
        <style>

          :host(#mylistPocket-popup) {
            position: fixed;
            z-index: 200000;
            transform: translate3d(-50%, -50%, 0);
            opacity: 0;
            transition: 0.3s opacity ease;
            top: -9999px; left: -9999px;
          }

          :host(#mylistPocket-popup.show) {
            top: 50%;
            left: 50%;
            opacity: 1;
            pointer-events: auto;
          }

          .root.is-otherDomain .wwwOnly {
            display: none;
          }
          .root.is-otherDomain:not(.is-zenzaReady) .wwwZenzaOnly {
            display: none;
          }

          * {
            box-sizing: border-box;
            font-kerning: none;
          }

          a {
            color: #ffff00;
            font-weight: bold;
            display: inline-block;
          }

          a:visited {
            color: #ffff99;
          }

          button {
            font-size: 14px;
            padding: 8px 8px;
            cursor: pointer;
            border-radius: 0;
            margin: 0;
            background: #333;
            color: #ccc;
            border: solid 2px #ccc;
            outline: none;
            line-height: 20px;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
          }
          button:hover {
            transform: translate(-4px,-4px);
            box-shadow: 4px 4px 4px #000;
            background: #666;
            transition:
              0.2s transform ease,
              0.2s box-shadow ease
              ;
          }

          button.is-updating {
            cursor: wait;
          }
          button.is-active,
          button:active {
            transform: none;
            box-shadow: none;
            transition: none;
          }
          button.is-active::after,
          button:active::after {
            opacity: 0;
          }


          [tooltip] {
            position: relative;
          }

          .is-deflistUpdating .deflist-add::after,
          .is-deflistSuccess  .deflist-add::after,
          .is-deflistFail     .deflist-add::after,
          [tooltip]:hover::after {
            content: attr(tooltip);
            position: absolute;
            top:  0px;
            left: 50%;
            padding: 2px 4px;
            white-space: nowrap;
            font-size: 14px;
            color: #fff;
            background: #333;
            transform: translate3d(-50%, -120%, 0);
            pointer-events: none;

          }


          .root {
            text-align: left;
            outline-offset: 8px;
            border: 12px solid rgba(32, 32, 32, 0);
            border-radius: 20px;
            padding: 8px 0;
            background: rgba(0, 0, 0, 0.7);
            color: #ccc;
            box-shadow: 0 0 16px #000;
            transition:
              0.6s -webkit-clip-path ease,
              0.6s clip-path ease,
              0.5s transform ease;
              /*0.4s border-radius ease-out 0.4s,
              0.4s height ease-out 0.4s*/
            ;
          }

          .root * {
          }

          .root.show {
            opacity: 1;
            pointer-events: auto !important;
          }

          .root.is-loading,
          .root.is-loading.is-ok,
          .root.is-loading.is-fail {
            text-align: center;
            position: relative;
            width: 190px;
            height: 190px;
            padding: 32px;
            opacity: 0.8;
            cursor: wait;
            border-radius: 100%;
            clip-path: circle(100px at center) !important;
            transition: none;
            outline: none;
            transform: none !important;
          }
          .root.is-firefox {
          }
          .root.is-loading > * {
            pointer-events: none;
          }

          .root.is-setting {
            transform: rotateX(180deg);
          }

          .root.is-setting > *:not(.setting-panel) {
            pointer-events: none;
            z-index: 1;
          }

          .root:not(.is-setting) > .setting-panel {
            pointer-events: none;
          }

          .root.is-setting > .setting-panel {
            display: block;
            opacity: 1;
            pointer-events: auto;
          }

          .root.is-loading         .loading-inner,
          .root.is-loading.is-ok   .loading-inner,
          .root.is-loading.is-fail .loading-inner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate3d(-50%, -50%, 0);
          }

          .loading-inner .spinner {
            font-size: 64px;
            display: inline-block;
            animation-name: spin;
            animation-iteration-count: infinite;
            animation-duration: 3s;
            animation-timing-function: linear;
          }

          @keyframes spin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(1800deg); }
          }



          .root.is-ok {
            width: 800px;
            /*clip-path: circle(800px at center);*/
          }

          .root.is-ok.noclip {
            clip-path: none;
          }

          .root.is-fail {
            font-size: 120%;
            white-space: nowrap;
            text-align: center;
            padding: 16px;
          }

          .root.is-loading>*:not(.loading-now),
          .root.is-loading.is-ok>*:not(.loading-now),
          .root.is-loading.is-fail>*:not(.loading-now),
          .root.is-fail:not(.is-loading)>*:not(.error-info),
          .root.is-ok:not(.is-loading)>*:not(.video-detail):not(.setting-panel) {
            display: none !important;
          }

          .root.is-loading>.loading-now,
          .root.is-fail>.error-info,
          .root.is-ok>.video-detail {
            display: block;
          }

          .header {
            padding: 8px 8px 8px;
            font-size: 12px;
          }
            .upload-date {
              margin-right: 8px;
            }
            .counter span + span {
              margin-left: 8px;
            }
            .video-title {
              font-weight: bolder;
              font-size: 22px;
              margin-bottom: 4px;
            }

            .close-button {
              position: absolute;
              right: 0;
              top: 0;
              transition: 0.2s background ease, 0.2s border-color ease;
              cursor: pointer;
              width: 48px;
              height: 48px;
              font-size: 28px;
              line-height: 36px;
              text-align: center;
              user-select: none;
              border: 6px solid rgba(80, 80, 80, 0.5);
              border-color: transparent;
              border-radius: 0 16px 0 0;
            }
            .close-button:hover {
              background: #333;
              /*border-color: rgba(0, 0, 0, 0.9);*/
              /*transform: translate(-50%, -50%) scale(2.5);*/
            }
            .close-button:active {
              /*transform: translate(-50%, -50%) scale(2) rotate(360deg);*/
              box-shadow: none;
              transition: none;
            }

            .is-setting .close-button {
              display: none;
            }




          .main {
            display: flex;
            background: rgba(0, 0, 0, 0.2);
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5) inset;
          }

          .main-left {
            width: 360px;
            padding: 8px;
            z-index: 100;
          }
            .video-thumbnail-container {
              position: relative;
              width: 360px;
              height: 270px;
              background: #000;
              /*box-shadow: 2px 2px 4px #000;*/
            }
            .video-thumbnail-container ::slotted(img) {
              width: 360px !important;
              height: 270px !important;
              object-fit: contain;
            }

            .video-thumbnail-container .duration {
              position: absolute;
              display: inline-block;
              right: 0;
              bottom: 0;
              font-size: 14px;
              background: #000;
              color: #fff;
              padding: 2px 4px;
            }
            .video-thumbnail-container:hover .duration {
              display: none;
            }


          .main-right {
            position: relative;
            padding: 0;
            flex-grow: 1;
            font-size: 14px;
          }

            ::slotted(.owner-page-link) {
              display: inline-block;
              vertical-align: middle;
            }

            .owner-page-link img {
              border: 1px solid #333;
              border-radius: 3px;
            }

            .video-info {
              /*background: rgba(0, 0, 0, 0.2);*/
              max-height: 282px;
              overflow-x: hidden;
              overflow-y: scroll;
              overscroll-behavior: contain;
            }

            *::-webkit-scrollbar,
            .video-info::-webkit-scrollbar {
              background: rgba(34, 34, 34, 0.5);
            }

            *::-webkit-scrollbar-thumb,
            .video-info::-webkit-scrollbar-thumb {
              border-radius: 0;
              background: #666;
            }

            *::-webkit-scrollbar-button,
            .video-info::-webkit-scrollbar-button {
              background: #666;
              display: none;
            }

            *::scrollbar,
            .video-info::scrollbar {
              background: #222;
            }

            *::scrollbar-thumb,
            .video-info::scrollbar-thumb {
              border-radius: 0;
              background: #666;
            }

            *::scrollbar-button,
            .video-info::scrollbar-button {
              background: #666;
              display: none;
            }

            .scrollable {
              overscroll-behavior: contain;
            }

            .owner-info {
              margin: 16px;
              display: table;
            }

              .owner-info * {
                vertical-align: middle;
                word-break: break-all;
              }

              .owner-info>* {
                display: table-cell !important;
              }

              .owner-name {
                display: inline-block;
                padding: 8px;
                font-size: 18px;
              }
              .owner-info.is-favorited {
                font-weight: bolder;
                color: orange;
              }

              .owner-info.is-ng {
                color: #888;
                text-decoration: line-through;
              }

              .is-channel .owner-name::before {
                content: 'CH';
                margin: 0 4px;
                background: #999;
                color: #333;
                padding: 2px 4px;
                border: 1px solid;
              }

              .locale-owner-name::after {
                content: ' さん';
              }

              .owner-info .add-ng-button,
              .owner-info .add-fav-button {
                visibility: hidden;
                pointer-events: none;
              }
              .is-ng-enable .owner-info:hover .add-ng-button,
              .is-ng-enable .owner-info:hover .add-fav-button {
                visibility: visible;
                pointer-events: auto;
              }

            .description {
              word-break: break-all;
              line-height: 1.5;
              padding: 0 16px 8px;
            }

            .description:first-letter {
              font-size: 24px;
            }

            .last-res-body {
              margin: 16px 16px 0;
              border: 1px solid #ccc;
              padding: 4px;
              border-radius: 4px;
              word-break: break-all;
              font-size: 12px;
              min-height: 24px;
            }


          .footer {
            padding: 8px;
            backface-visibility: hidden;
          }

            .pocket-button {
              cusror: pointer;
            }

            .pocket-button:active {
            }


            .video-tags {
              display: block;
            }

              .tag-container {
                display: inline-block;
                position: relative;
                padding: 4px 8px;
                border: 1px solid #888;
                border-radius: 4px;
                margin: 0 20px 4px 0;
              }
              .tag-container .tag {
                display: inline-block;
                font-size: 14px;
                color: #ccc;
                text-decoration: none;
                cursor: pointer;
              }
              .tag-container .tag.channel-search {
                margin-left: 8px;
                color: #ccc !important;
                padding: 0 8px;
              }
              .tag-container:hover .tag {
                color: #fff !important;
              }
              .tag-container.is-favorited .tag {
                font-weight: bolder;
                color: orange !important;
              }
              .tag-container.is-ng .tag {
                text-decoration: line-through;
                color: #888 !important;
              }
              .zenzaPlayerContainer .tagItemMenu {
                margin: 0 8px;
              }


              .tag-container       .add-ng-button,
              .tag-container       .add-fav-button {
                position: absolute !important;
                visibility: hidden;
                pointer-events: none;
              }
              .is-ng-enable .tag-container:hover .add-ng-button,
              .is-ng-enable .tag-container:hover .add-fav-button {
                visibility: visible;
                pointer-events: auto;
                width: 24px;
                height: 24px;
                line-height: 24px;
                font-size: 24px;
                vertical-align: bottom;
                display: inline-block;
              }
              .is-ng-enable .tag-container:hover .add-ng-button {
                right: -16px;
              }
              .is-ng-enable .tag-container:hover .add-fav-button {
                left: -16px;
              }

            .footer-menu {
              position: absolute;
              right: 0px;
              bottom: 0px;
              transform: translate3d(0, 120%, 0);
              opacity: 1;
              transition:
                0.4s opacity ease 0.4s,
                0.4s transform ease 0.4s;
            }

            .is-setting .video-detail .footer-menu {
              transform: translate3d(0, 0, 0);
              opacity: 0;
            }

              .footer-menu button {
                min-width: 70px;
              }

              .regular-menu {
                display: inline-block;
                background: rgba(0, 0, 0, 0.7);
                position: relative;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 0 16px #000;
              }

              .is-deflistUpdating .deflist-add {
                cursor: wait;
                opacity: 0.9;
                transform: scale(1.0);
                box-shadow: none;
                transition: none;
              }
              .is-deflistSuccess .deflist-add,
              .is-deflistFail    .deflist-add {
                transform: scale(1.0);
                box-shadow: none;
                transition: none;
              }
              .is-deflistSuccess  .deflist-add::after {
                content: attr(data-result);
                background: #393;
              }
              .is-deflistFail     .deflist-add::after {
                content: attr(data-result);
                background: #933;
              }
              .is-deflistUpdating .deflist-add::after {
                content: '更新中';
                background: #333;
              }

              .zenza-menu {
                display: none;
              }

              .is-zenzaReady .zenza-menu {
                display: inline-block;
                background: rgba(0, 0, 0, 0.7);
                margin-left: 32px;
                position: relative;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 0 16px #000;
              }

              .is-zenzaReady .zenza-menu::after {
                content: 'ZenzaWatch';
                position: absolute;
                left: 50%;
                bottom: 10px;
                padding: 2px 8px;
                transform: translate(-50%, 100%);
                pointer-events: none;
                font-weith: bolder;
                background: rgba(0, 0, 0, 0.7);
                pointer-events: none;
                border-radius: 4px;
                white-space: nowrap;
              }

              .setting-menu {
                display: inline-block;
                background: rgba(0, 0, 0, 0.7);
                margin-left: 32px;
                position: relative;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 0 16px #000;
              }

          .toggle-setting-button {
            font-size: 32px;
            border-radius: 100%;
            border: 12px solid #333;
            cursor: pointer;
            background: rgba(32, 32, 32, 1);
            transition:
              0.2s transform ease
              ;
          }

          .toggle-setting-button:hover {
            transform: scale(1.2);
            box-shadow: none;
            background: rgba(32, 32, 32, 1);
            background: transparent;
          }

          .toggle-setting-button:active {
            transform: scale(1.0);
          }

          .mylist-comment-link {
            cursor: pointer;
          }

          .setting-panel {
            opacity: 0;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            padding: 8px 12px;
            z-index: 10000;
            background: rgba(50, 50, 64, 0.9);
            border-radius: 16px;
            color: #ccc;
            /*-webkit-user-select: none;
            user-select: none;*/
            transform: rotateX(180deg);
            transition: 0.25s opacity ease 0.25s;
          }
          .is-setting .setting-panel {
            transition: 0.25s opacity ease;
          }
            .setting-panel-main {
              width: 100%;
              height: 100%;
              overflow-y: scroll;
              overflow-x: hidden;
            }

            .root:not(.is-setting) .setting-panel .footer-menu {
              transform: translate3d(0, 0, 0);
              opacity: 0;
            }

            .root.is-setting       .setting-panel .footer-menu {
              right:  -12px;
              bottom: -12px;
              transform: translate3d(0, 120%, 0);
              opacity: 1;
              transition:
                opacity 0.4s ease 0.4s,
                transform 0.4s ease 0.4s;
            }


            .close-setting-menu {
              display: inline-block;
              background: rgba(0, 0, 0, 0.7);
              margin-left: 32px;
              position: relative;
              border-radius: 8px;
              padding: 12px 16px;
              box-shadow: 0 0 16px #000;
            }

            .setting-label {
              display: inline-block;
              line-height: 24px;
              padding: 8px;
            }

            .setting-label:hover {
              text-shadow: 0 0 4px #996;
            }

            .setting-label * {
              cursor: pointer;
            }

            .setting-label input[type=checkbox] {
              transform: scale(2);
              margin: 8px;
              vertical-align: middle;
            }

            .setting-label input + span {
              font-size: 16px;
            }

            .setting-label input:checked + span {
            }


            .setting-fav,
            .setting-ng-textarea,
            .setting-fav-textarea {
              display: none;
            }

            .is-ng-enable .setting-fav {
              display: block;
            }
            .is-ng-enable .setting-ng-textarea,
            .is-ng-enable .setting-fav-textarea {
              display: flex;
            }

              .setting-ng-text-column,
              .setting-fav-text-column {
                flex: 1;
                position: relative;
                padding: 8px;
              }

                .setting-ng-text-column textarea,
                .setting-fav-text-column textarea {
                  width: 100%;
                  height: 150px;
                  background: transparent;
                  color: #ccc;
                }

            .setting-ng-label {
              display: none;
            }

            .is-ng-enable .setting-ng-label {
              display: inline-block;
            }


          .add-ng-button,
          .add-fav-button {
            display: none;
          }

          .is-ng-enable .add-ng-button,
          .is-ng-enable .add-fav-button {
            display: inline-block;
            position: relative;
            width: 32px;
            height: 32px;
            line-height: 32px;
            font-size: 28px;
            padding: 0;
            margin: 0;
            /*border-radius: 100%;*/
            border: none;
            text-align: center;
            color: red;
            font-weight: bolder;
            cursor: pointer;
            background: transparent;
            box-shadow: none;
            transition:
              0.2s transform ease,
              0.2s text-shadow ease;
          }
          .is-ng-enable .add-fav-button {
            color: orange;
          }
          .is-ng-enable .add-ng-button:hover,
          .is-ng-enable .add-fav-button:hover {
            transform: scale(1.2);
            text-shadow: 2px 2px 4px black;
          }
          .is-ng-enable .add-ng-button:active,
          .is-ng-enable .add-fav-button:active {
            transform: scale(1.0);
            text-shadow: 0   0   2px black;
          }
          .is-ng-enable .add-ng-button:hover::after,
          .is-ng-enable .add-fav-button:hover::after {
            content: 'NG登録';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translate(-50%, -80%);
            font-size: 12px;
            line-height: 12px;
            white-space: nowrap;
            background: rgba(192, 192, 192, 0.8);
            color: #000;
            opacity: 0.9;
            padding: 2px 4px;
            text-shadow: none;
            font-weight: normal;
            pointer-evnets: none !important;
          }
          .is-ng-enable .is-ng .add-ng-button:hover::after,
          .is-ng-enable .is-ng .add-fav-button:hover::after {
            content: 'NG解除';
          }
          .is-ng-enable .add-fav-button:hover::after {
            content: '強調登録';
          }
          .is-ng-enable .is-favorited .add-fav-button:hover::after {
            content: '強調解除';
          }
          .is-ng-enable .add-ng-button:active:hover::after,
          .is-ng-enable .add-fav-button:active:hover::after {
            display: none;
          }

       </style>
        <div class="popup root">
          <div class="loading-now">
            <div class="loading-inner">
              <span class="spinner">&#8987;</span>
            </div>
          </div>
          <div class="error-info">
            <slot name="error-description"></slot>
          </div>
          <div class="video-detail">
            <div class="header">
              <div class="video-title"><slot name="video-title"></slot></div>

              <span class="upload-date">投稿: <slot name="upload-date"/></span>
              <span class="counter">
                <span class="view-counter">再生: <slot name="view-counter"/></span>
                <span class="comment-counter">コメント: <slot name="comment-counter"/></span>
                <span class="mylist-counter command2" data-command="mylist-comment-open">マイリスト:
                  <span class="mylist-comment-link command" data-command="mylist-comment-open">&#x274F;</span>
                  <slot name="mylist-counter"/>
                </span>
              </span>
              <div class="close-button command" data-command="close" tooltip="閉じる">
                &#x2716;
              </div>
            </div>

            <div class="main">

              <div class=" main-left">
                <div class="video-thumbnail-container">
                  <slot name="video-thumbnail"></slot>
                  <span class="duration"><slot name="duration"></slot></slot>
                </div>
              </div>

              <div class="video-info main-right scrollable">

                <div class="owner-info">
                  <slot name="owner-page-link"></slot>
                  <span class="owner-name"><slot name="locale-owner-name"></slot>
                  <button class="add-fav-button command" data-command="toggle-fav-owner">★</button>
                  <button class="add-ng-button command" data-command="toggle-ng-owner">&#x2716;</button>
                  </span>
                </div>

                <div class="description">
                  <slot name="description"></slot>
                </div>

                <div class="last-res-body">
                  <slot name="last-res-body"></slot>
                </div>


              </div>

            </div>

            <div class="footer">
              <div class="video-tags">
                <slot name="tag"></slot>
              </div>
            </div>
            <div class="footer-menu scalingUI">
              <div class="regular-menu">
                <button
                  class="mylistPocketButton deflist-add pocket-button command command-watch-id wwwZenzaOnly"
                  data-command="deflist-add"
                  tooltip="とりあえずマイリスト"
                >とり</button>
                <button
                  class="pocket-button command command-watch-id"
                  data-command="mylist-window"
                  tooltip="マイリスト"
                >マイ</button>
                <button
                  class="pocket-button command command-watch-id"
                  data-command="open-mylist-open"
                  tooltip="公開マイリスト"
                >公開</button>
                 <button
                  class="pocket-button command command-video-id"
                  data-command="twitter-hash-open"
                  tooltip="Twitterの反応"
                >#Twitter</button>
              </div>


              <div class="zenza-menu">
                <button
                  class="pocket-button command command-watch-id"
                  data-command="zenza-open-now"
                  tooltip="ZenzaWatchで開く"
                >Zen</button>
                <button
                  class="pocket-button command command-watch-id"
                  data-command="playlist-inert"
                  tooltip="プレイリスト(次に再生)"
                >playlist</button>
                <button
                  class="pocket-button command command-watch-id"
                  data-command="playlist-queue"
                  tooltip="プレイリスト(末尾に追加)"
                >▶</button>
              </div>

              <div class="setting-menu">
                <button
                  class="pocket-button command"
                  data-command="toggle-setting"
                >設 定</button>
              </div>

            </div>
          </div>
          <div class="setting-panel">

            <div class="setting-panel-main scrollable">
              <h2>MylistPocket 設定</h2>
              <label class="setting-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="openNewWindow"
                >
                <span>タグやリンクを新しいタブで開く (次回から反映)</span>
              </label>

              <label class="setting-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="enableAutoComment"
                  data-config-namespace="mylist"
                >
                <span>マイリストコメントに投稿者名を入れる</span>
              </label>

              <label class="setting-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="responsive.matrix"
                  data-config-namespace=""
                >
                <span>ランキングTOPのサムネイルを画面幅に合わせて小さくする</span>
              </label>

              <h2>NG設定(リロード後に反映)</h2>
              <label class="setting-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="enable"
                  data-config-namespace="ng"
                >
                <span>簡易NG＆強調機能を使う</span>
              </label>

              <label class="setting-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="hide"
                  data-config-namespace="nicoad"
                >
                <span>検索結果やランキングのニコニ広告を消す</span>
              </label>

              <label class="setting-label wwwOnly wwwZenzaOnly setting-ng-label">
                <input
                  type="checkbox"
                  class="setting-form"
                  data-config-name="syncZenza"
                  data-config-namespace="ng"
                >
                <span>NGタグ・投稿者をZenzaWatchにも反映する</span>
              </label>

              <div class="setting-ng-textarea setting-ng">
                <div class="setting-ng-text-column">
                  投稿者ID
                  <textarea
                    class="setting-form"
                    data-config-name="owner"
                    data-config-namespace="ng"
                  ></textarea>
                </div>
                <div class="setting-ng-text-column">
                  タグ
                  <textarea
                    class="setting-form"
                    data-config-name="tag"
                    data-config-namespace="ng"
                  ></textarea>
                </div>
                <div class="setting-ng-text-column">
                  タイトル・説明文
                  <textarea
                    class="setting-form"
                    data-config-name="word"
                    data-config-namespace="ng"
                  ></textarea>
                </div>
               </div>
              <h2 class="setting-fav">強調表示設定</h2>
              <div class="setting-fav-textarea setting-fav">
                <div class="setting-fav-text-column">
                  投稿者ID
                  <textarea
                    class="setting-form"
                    data-config-name="owner"
                    data-config-namespace="fav"
                  ></textarea>
                </div>
                <div class="setting-fav-text-column">
                  タグ
                  <textarea
                    class="setting-form"
                    data-config-name="tag"
                    data-config-namespace="fav"
                  ></textarea>
                </div>
                <div class="setting-fav-text-column">
                  タイトル・説明文
                  <textarea
                    class="setting-form"
                    data-config-name="word"
                    data-config-namespace="fav"
                  ></textarea>
                </div>
               </div>

             </div>

            <div class="footer-menu">
              <div class="close-setting-menu">
                <button
                  class="pocket-button command"
                  data-command="toggle-setting"
                >戻 る</button>
              </div>
            </div>

          </div>
        </div>
      </template>
    `).trim();

    const __ng_css__ = `
      /* .item_cell 将棋盤ランキング  .item 従来のランキングと検索 */

      .RankingMainVideo.is-ng-wait,
      .RankingBaseItem.is-ng-wait,
      .item_cell.is-ng-wait .item,
      .item.is-ng-wait {
        outline: 1px dotted rgba(192, 192, 192, 0.8);
      }

      .RankingMainVideo.is-ng-queue,
      .RankingBaseItem.is-ng-queue,
      .item_cell.is-ng-queue .item,
      .item.is-ng-queue {
        outline: 2px dotted rgba(192, 192, 192, 0.8);
      }

      .RankingMainVideo.is-ng-current,
      .RankingBaseItem.is-ng-current,
      .item_cell.is-ng-current .item,
      .item.is-ng-current {
        outline: 3px dotted rgba(128, 225, 128, 0.8);
      }

      .RankingMainVideo.is-ng-resolved,
      .RankingBaseItem.is-ng-resolved,
      .item_cell.is-ng-resolved .item,
      .item.is-ng-resolved {
        outline: 0px solid green;
      }

      .RankingMainVideo.is-ng-favorited,
      .RankingBaseItem.is-ng-favorited,
      .item_cell.is-fav-favorited .item,
      .item.is-fav-favorited {
        outline: 3px dotted orange;
        outline-offset: 3px;
      }
      .item.videoRanking.is-fav-favorited {
        outline-offset: -3px;
      }

      .RankingBaseItem.is-ng-rejected,
      .item_cell.is-ng-rejected {
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      }

      .VideoItem .VideoItem-postDate {
        line-height: 16px;
        vertical-align: top;
        font-size: 12px;
        color: #666;
      }

      .RankingMainVideo.is-ng-rejected,
      .item.is-ng-rejected {
        display: none;
        opacity: 0;
        pointer-events: none;
      }

      .NicorepoTimelineItem.is-ng-rejected {
        display: none;
        opacity: 0;
        pointer-events: none;
      }

      body.is-ng-disable .is-ng-rejected {
        outline: none;
        display: block !important;
        pointer-events: auto;
        opacity: 0.5;
        visibility: visible;
      }

      /* チャンネル検索 */
        #search .item.is-ng-rejected {
          display: none;
        }
    `;

    // TODO: ライブラリ化
    const util = MylistPocket.util = (() => {
      const util = {};

      util.mixin = function(self, o) {
        Object.keys(o).forEach(f => {
          if (!_.isFunction(o[f])) { return; }
          if (_.isFunction(self[f])) { return; }
          self[f] = o[f].bind(o);
        });
      };
      util.attachShadowDom = function({host, tpl, mode = 'open'}) {
        const root = host.attachShadow ?
          host.attachShadow({mode}) : host.createShadowRoot();
        const node = document.importNode(tpl.content, true);
        root.appendChild(node);
        return root;
      };
      util.httpLink = function(html) {
        let links = {}, keyCount = 0;
        const getTmpKey = function() { return ` <!--${keyCount++}--> `; };
        html = html.replace(/@([a-zA-Z0-9_]+)/g,
          (g, id) => {
            const tmpKey = getTmpKey();
            links[tmpKey] =
              ` <a href="https://twitter.com/${id}" class="twitterLink" rel="noopener" target="_blank">@${id}</a> `;
            return tmpKey;
          });


        html = html.replace(/(im)(\d+)/g,
          ' <a href="//seiga.nicovideo.jp/seiga/$1$2" class="seigaLink" rel="noopener" target="_blank">$1$2</a> ');
        html = html.replace(/(co)(\d+)/g,
          ' <a href="//com.nicovideo.jp/community/$1$2" class="communityLink" rel="noopener" target="_blank">$1$2</a> ');
        html = html.replace(/(watch|mylist|user)\/(\d+)/g, ' <a href="https://www.nicovideo.jp/$1/$2" rel="noopener" class="videoLink target-change">$1/$2</a> ');
        html = html.replace(/(sm|nm|so)(\d+)/g,       ' <a href="https://www.nicovideo.jp/watch/$1$2" rel="noopener" class="videoLink target-change">$1$2</a> ');

        let linkmatch = /<a.*?<\/a>/, n;
        html = html.split('<br />').join(' <br /> ');
        while ((n = linkmatch.exec(html)) !== null) {
          let tmpKey = getTmpKey();
          links[tmpKey] = n;
          html = html.replace(n, tmpKey);
        }

        html = html.replace(/\((https?:\/\/[\x21-\x3b\x3d-\x7e]+)\)/gi, '( $1 )');
        html = html.replace(/(https?:\/\/[\x21-\x3b\x3d-\x7e]+)http/gi, '$1 http');
        html = html.replace(/(https?:\/\/[\x21-\x3b\x3d-\x7e]+)/gi, '<a href="$1" rel="noopener" target="_blank" class="otherSite">$1</a>');
        Object.keys(links).forEach(tmpKey => {
          html = html.replace(tmpKey, links[tmpKey]);
        });

        html = html.split(' <br /> ').join('<br />');
        return html;
      };

      util.getSleepPromise = function(sleepTime, label = 'sleep') {
        return function(result) {
          return new Promise(resolve => {
            window.setTimeout(() => {
              return resolve(result);
            }, sleepTime);
          });
        };
      };

      util.isFirefox = () =>
        navigator.userAgent.toLowerCase().indexOf('firefox') >= 0;

      return util;
    })();
//@require bounce
//@require css
Object.assign(util, css);
Object.assign(util, workerUtil);
//@require nicoUtil
Object.assign(util, nicoUtil);
//@require textUtil
Object.assign(util, textUtil);
//@require reg

    MylistPocket.emitter = util.emitter = new Emitter();

    const ZenzaDetector = (function() {
      let isReady = false;
      let Zenza = null;
      const emitter = new Emitter();

      const initialize = function() {
        const onZenzaReady = () => {
          isReady = true;
          Zenza = window.ZenzaWatch;

          Zenza.emitter.on('hideHover', () => {
            util.emitter.emit('hideHover');
          });

          Zenza.emitter.on('csrfToken', (token) => {
            util.emitter.emit('csrfToken', token);
          });

          let popup = document.getElementById('mylistPocket-popup');
          let defaultContainer = document.getElementById('mylistPocketDomContainer');
          defaultContainer.classList.add('zen-family');
          let zenzaContainer;
          Zenza.emitter.on('fullScreenStatusChange', isFull => {
            if (isFull) {
              if (!zenzaContainer) {
                zenzaContainer = document.querySelector('.zenzaPlayerContainer');
              }
              zenzaContainer.appendChild(popup);
            } else {
              defaultContainer.appendChild(popup);
            }
          });
          emitter.emit('ready', Zenza);
        };

        if (window.ZenzaWatch && window.ZenzaWatch.ready) {
          window.console.log('ZenzaWatch is Ready');
          onZenzaReady();
        } else {
          document.body.addEventListener('ZenzaWatchInitialize', function() {
            window.console.log('ZenzaWatchInitialize MylistPocket');
            onZenzaReady();
          });
        }
      };

      const detect = function() {
        return new Promise(res => {
          if (isReady) {
            return res(Zenza);
          }
          emitter.on('ready', () => {
            res(Zenza);
          });
        });
      };

      return {
        initialize: initialize,
        detect: detect
      };

    })();
    //@require objUtil
    //@require StorageWriter
    //@require DataStorage

    const config = (() => {
      const DEFAULT_CONFIG = {
        debug: false,

        'videoInfo.openNewWindow': false,
        'mylist.enableAutoComment': true, // マイリストコメントに投稿者を入れる

        'responsive.matrix': false,

        'nicoad.hide': false,

        'ng.enable': false,
        'ng.owner':   '',
        'ng.word':    '',
        'ng.tag':     '',
        'ng.syncZenza': false,

        'fav.owner':   '',
        'fav.word':    '',
        'fav.tag':     ''
      };
      return new DataStorage(
        DEFAULT_CONFIG,
        {
          prefix: `${PRODUCT}_config`,
          ignoreExportKeys: [],
          readonly: !location || location.host !== 'www.nicovideo.jp',
          storage: localStorage
        }
      );
    })();

    MylistPocket.broadcast = (function(config) {
      if (!window.BroadcastChannel) { return; }
      const broadcastChannel = new window.BroadcastChannel(PRODUCT);

      const onBroadcastMessage = (e) => {
        const data = e.data;
        switch (data.type) {
          case 'config-update':
            config.refresh(true);
            break;
        }
      };

      broadcastChannel.addEventListener('message', onBroadcastMessage);

      return {
        postMessage: (...args) => { broadcastChannel.postMessage(...args); }
      };

    })(config);
    config.on('update', (key, value) => {
      if (!config.props.hasOwnProperty(key)) { return; }
      MylistPocket.broadcast.postMessage(
        {type: 'config-update', key, value, storage: 'local'}
      );
    });

    MylistPocket.config = config;



    const CacheStorage = (function() {
      let PREFIX = PRODUCT + '_cache_';

      class CacheStorage {

        constructor(storage, gc = false) {
          this._storage = storage;
          this._memory = {};
          if (gc) { this.gc(); }
          Object.keys(storage).forEach((key) => {
            if (key.indexOf(PREFIX) === 0) {
              this._memory[key] = storage[key];
            }
          });
          this.gc = bounce.time(this.gc.bind(this), 100);
        }

        gc(now = -1) {
          const storage = this._storage;
          now = now >= 0 ? now : Date.now();
          Object.keys(storage).forEach((key, index) => {
            if (key.indexOf(PREFIX) === 0) {
              let item;
              try {
                item = JSON.parse(this._storage[key]);
              } catch(e) {
                storage.removeItem(key);
              }
              //console.info(
              //  `${index}, key: ${key}, expiredAt: ${new Date(item.expiredAt).toLocaleString()}, now: ${new Date(now).toLocaleString()}`);
              if (item.expiredAt === '' || item.expiredAt > now) {
                //console.info('not expired: ', key);
                return;
              }
              //console.info('cache expired: ', key, item.expiredAt);
              storage.removeItem(key);
            }
          });
        }

        setItem(key, data, expireTime) {
          key = PREFIX + key;
          const expiredAt =
            typeof expireTime === 'number' ? (Date.now() + expireTime) : '';

          const cacheData = {
            data: data,
            type: typeof data,
            expiredAt: expiredAt
          };

          this._memory[key] = cacheData;
          try {
            this._storage[key] = JSON.stringify(cacheData);
            this.gc();
          } catch (e) {
            if (e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
              this.gc(0);
            }
          }
        }

        getItem(key) {
          key = PREFIX + key;
          if (!(this._storage.hasOwnProperty(key) || this._storage[key] !== undefined)) {
            return null;
          }
          let item = null;
          try {
            item = JSON.parse(this._storage[key]);
          } catch(e) {
            delete this._memory[key];
            this._storage.removeItem(key);
            return null;
          }

          if (item.expiredAt === '' || item.expiredAt > Date.now()) {
            return item.data;
          }
          return null;
        }

        removeItem(key) {
          if (this._memory.hasOwnProperty(key)) {
            delete this._memory[key];
          }
          key = PREFIX + key;
          if (this._storage.hasOwnProperty(key) || this._storage[key] !== undefined) {
            this._storage.removeItem(key);
          }
        }

        clear() {
          const storage = this._storage;
          this._memory = {};
          Object.keys(storage).forEach((v) => {
            if (v.indexOf(PREFIX) === 0) {
              storage.removeItem(v);
            }
          });
        }
      }
      return CacheStorage;
    })();
    MylistPocket.debug.sessionCache = new CacheStorage(sessionStorage, true);
    MylistPocket.debug.localCache   = new CacheStorage(localStorage, true);

    const WindowMessageEmitter = (function() {
      const emitter = new Emitter();
      const knownSource = [];

      const onMessage = (event) => {
        if (_.indexOf(knownSource, event.source) < 0 //&&
            //event.origin !== location.protocol + '//ext.nicovideo.jp'
            ) { return; }

        try {
          let data = JSON.parse(event.data);
          if (data.id !== PRODUCT) { return; }

          emitter.emit('onMessage', data.body, data.type);
        } catch (e) {
          console.log(
            '%cMylistPocket.Error: window.onMessage  - ',
            'color: red; background: yellow',
            e,
            event
          );
          console.log('%corigin: ', 'background: yellow;', event.origin);
          console.log('%cdata: ',   'background: yellow;', event.data);
          console.trace();
        }
      };

      emitter.addKnownSource = (win) => {
        knownSource.push(win);
      };

      window.addEventListener('message', onMessage);

      return emitter;
    })();

//@require CrossDomainGate

    const CsrfTokenLoader = (() => {
      const cacheStorage = new CacheStorage(
        location.host === 'www.nicovideo.jp' ? localStorage : sessionStorage);
      const TIMEOUT = 10 * 1000;
      const CACHE_EXPIRE_TIME = 60 * 30 * 1000;

      class CsrfTokenLoader {
        static load() {
          return new Promise((resolve, reject) => {
            const cache = cacheStorage.getItem('csrfToken');
            if (cacheStorage.getItem('csrfToken')) {
              return resolve(cache);
            }

            let timeoutTimer = window.setTimeout(() => {
              reject('timeout');
            }, TIMEOUT);

            return CsrfTokenLoader._getToken().then((token) => {
              window.clearTimeout(timeoutTimer);
              CsrfTokenLoader.saveToCache(token);
              resolve(token);
            });
          });
        }

        static saveToCache(token) {
          cacheStorage.setItem('csrfToken', token, CACHE_EXPIRE_TIME);
        }

        static _getToken() {
          const url = 'https://www.nicovideo.jp/mylist_add/video/sm9';
          const tokenReg = /NicoAPI\.token *= *["']([a-z0-9-]+)["'];/;
          let m;
          return fetch(url, { credentials: 'include', _format: 'text'})
            .then(res => res.text())
            .then(result => {
            if ((m = tokenReg.exec(result))) {
              const token = m[1];
              return Promise.resolve(token);
            } else {
              return Promise.reject('token parse error');
            }
          });
        }
      }

      util.emitter.on('csrfToken', (token) => {
        CsrfTokenLoader.saveToCache(token);
      });

      return CsrfTokenLoader;
    })();

    MylistPocket.debug.CsrfTokenLoader = CsrfTokenLoader;

    const ThumbInfoLoader = (() => {
      const BASE_URL = 'https://ext.nicovideo.jp/';
      const MESSAGE_ORIGIN = 'https://ext.nicovideo.jp/';
      const CACHE_EXPIRE_TIME = 60 * 60 * 1000;
      //const CACHE_EXPIRE_TIME = 60 * 1000;
      let gate = null;
      let cacheStorage = new CacheStorage(sessionStorage, true);
      let failedResult = {};

      class ThumbInfoLoader {

        constructor() {
          this._emitter = new Emitter();

          gate = new CrossDomainGate({
            baseUrl: BASE_URL,
            origin: MESSAGE_ORIGIN,
            type: 'thumbInfo',
            messager: WindowMessageEmitter
          });
        }

        _onMessage(data, type) {
          if (type !== 'videoInfoLoader') { return; }
          const info = data.message;

          this.emit('load', info, 'THUMB_WATCH');
        }

        _parseXml(xmlText) {
          return parseThumbInfo(xmlText);
        }

        async load(watchId, options = {}) {
          const cacheKey = `thumbInfo_${watchId}`;
          const cache = cacheStorage.getItem(cacheKey);

          if (failedResult[`${watchId}`]) {
            return Promise.reject({data: failedResult[`${watchId}`], watchId});
          }
          if (cache) {
            return cache;
          }

          const thumbInfo =
            await gate.fetch(`${BASE_URL}api/getthumbinfo/${watchId}`, options)
              .catch(e => { return {status: 'fail', message: e.message || `gate.fetch('${watchId}') failed` }; });
          thumbInfo.fromCache = !!cache;
          if (thumbInfo.status !== 'ok') {
            failedResult[`${watchId}`] = thumbInfo;
            return Promise.reject(thumbInfo);
          }
          cacheStorage.setItem(cacheKey, thumbInfo, CACHE_EXPIRE_TIME);
          return thumbInfo;
        }
      }

      const loader = new ThumbInfoLoader();
      return {
        load: watchId => loader.load(watchId),
        loadOwnerInfo: async watchId => {
          const info = await loader.load(watchId);
          const owner = info.owner;
          if (!owner) {
            return {};
          }

          const lang = util.getPageLanguage();
          const prefix = owner.type === 'user' ? '投稿者: ' : '提供: ';
          const suffix =
            (owner.type === 'user' && lang === 'ja-JP') ? ' さん' : '';
          owner.linkId =
            owner.id ?
              (owner.type === 'user' ? `user/${owner.id}` : `ch${owner.id}`) :
              '';
          owner.localeName = `${prefix}${owner.name}${suffix}`;
          return owner;
        }
      };

    })();

    MylistPocket.debug.ThumbInfoLoader = ThumbInfoLoader;



    const DeflistApiLoader = ((CsrfTokenLoader) => {
      const cacheStorage = new CacheStorage(
        location.host === 'www.nicovideo.jp' ? localStorage : sessionStorage);
      const TIMEOUT = 30000;
      const CACHE_EXPIRE_TIME = 60 * 3 * 1000;
      let isZenzaReady = false;

      class DeflistApiLoader {

        static getItems() {
          const url = 'https://www.nicovideo.jp/api/deflist/list';
          const cacheKey = 'deflistItems';

          return new Promise(function(resolve, reject) {

            const cache = cacheStorage.getItem(cacheKey);
            if (cache) {
              window.setTimeout(() => {
                resolve({items: cache.mylistitem, status: cache.status, from: 'cache'});
              }, 0);
              return;
            }

            let timeoutTimer = window.setTimeout(() => {
              timeoutTimer = null;
              reject({status: 'fail', description: 'timeout'});
            }, TIMEOUT);

            fetch(url, {
              credentials: 'include'
            }).then((res) => {
              return res.json();
            }).then((json) => {
              if (json.status !== 'ok') {
                return reject(json);
              }

              if (timeoutTimer) { window.clearTimeout(timeoutTimer);
              } else { return; }

              cacheStorage.setItem(cacheKey, json, CACHE_EXPIRE_TIME);
              resolve({items: json.mylistitem, status: json.status, from: 'fetch'});
            });
          });
        }

        static findItemByWatchId(watchId) {
          return DeflistApiLoader.getItems().then(({items}) => {
            for (let i = 0, len = items.length; i < len; i++) {
              let item = items[i], wid = item.id || item.item_data.watch_id;
              if (wid === watchId) {
                return Promise.resolve(item);
              }
            }
            return Promise.reject();
          });
        }

        static _removeItem({watchId, token}) {
          const cacheKey = 'deflistItems';
          DeflistApiLoader.findItemByWatchId(watchId).then((item) => {
          const url = 'https://www.nicovideo.jp/api/deflist/delete';
          const body = 'id_list[0][]=' + item.item_id + '&token=' + token;

          const req = {
            credentials: 'include',
            method: 'post',
            body,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
          };

          return fetch(url, req)
            .then(res => { return res.json(); })
            .then((result) => {
              if (result.status !== 'ok') {
                return Promise.reject({
                  status: 'fail',
                  result: result,
                  code: result.error.code,
                  message: result.error.description
                });
              }


              cacheStorage.removeItem(cacheKey);
              util.emitter.emitAsync('deflistRemove', watchId);
              return Promise.resolve({
                status: 'ok',
                result: result,
                message: 'とりあえずマイリストから削除'
              });

            }, (err) => {
              return Promise.reject({
                result: err,
                message: 'とりあえずマイリストから削除失敗(2)'
              });
            });

          }, (err) => {
            return Promise.reject({
              status: 'fail',
              result: err,
              message: '動画が見つかりません'
            });
          });
        }

        static removeItem(watchId) {
          return CsrfTokenLoader.load().then((token) => {
            return DeflistApiLoader._removeItem({watchId, token});
          });
        }

        static __addItem({watchId, description, token, isRetry = false}) {
          const cacheKey = 'deflistItems';
          const url = 'https://www.nicovideo.jp/api/deflist/add';
          let body = 'item_id=' + watchId + '&token=' + token;
          if (description) {
            body += '&description='+ encodeURIComponent(description);
          }

          const req = {
            method: 'post',
            credentials: 'include',
            body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          };

          return new Promise((resolve, reject) => {
            fetch(url, req)
              .then((res) => { return res.json(); })
              .then((result) => {

              if (result.status && result.status === 'ok') {
                cacheStorage.removeItem(cacheKey);
                //ZenzaWatch.emitter.emitAsync('deflistAdd', watchId, description);
                return resolve({
                  status: 'ok',
                  result: result,
                  message: 'とりあえずマイリスト登録'
                });
              }

              if (!result.status || !result.error) {
                return reject({
                  status: 'fail',
                  result: result,
                  message: 'とりあえずマイリスト登録失敗(100)'
                });
              }

              if (result.error.code !== 'EXIST' || isRetry) {
                return reject({
                  status: 'fail',
                  result: result,
                  code: result.error.code,
                  message: result.error.description
                });
              }

              /**
              * すでに登録されている場合は、いったん削除して再度追加(先頭に移動)
              */
              return DeflistApiLoader.removeItem(watchId)
                .then(util.getSleepPromise(1500, 'deflist remove'))
                .then(() => {
                return DeflistApiLoader._addItem(watchId, description, true)
                  .then((result) => {
                    resolve({
                      status: 'ok',
                      result: result,
                      message: 'とりあえずマイリストの先頭に移動'
                    });
                });
              }, (err) => {

                reject({
                  status: 'fail',
                  result: err.result,
                  code:   err.code,
                  message: 'とりあえずマイリスト登録失敗(101)'
                });
              });

            }, (err) => {
              reject({
                status: 'fail',
                result: err,
                message: 'とりあえずマイリスト登録失敗(200)'
              });
            });
          });
        }

        static _addItem(watchId, description, isRetry = false) {
          return CsrfTokenLoader.load().then((token) => {
            return DeflistApiLoader.__addItem({watchId, description, isRetry, token});
          });
        }

        static addItem(watchId, description) {
          return DeflistApiLoader._addItem(watchId, description, false);
        }

        static addItemWithOwnerName(watchId) {
          return ThumbInfoLoader.loadOwnerInfo(watchId).then((owner) => {
            if (!owner.id) {
              return DeflistApiLoader.addItem(watchId);
            }

            const description = `${owner.localeName} ${owner.linkId}`;
            return DeflistApiLoader.addItem(watchId, description);
          }, () => DeflistApiLoader.addItem(watchId));
        }

        static clearCache() {
          cacheStorage.removeItem('deflistItems');
        }

      }

      ZenzaDetector.detect().then((ZenzaWatch) => {
        isZenzaReady = true;
        ZenzaWatch.emitter.on('deflistRemove', () => DeflistApiLoader.clearCache());
      });

      //DeflistApiLoader.clearCache();

      return DeflistApiLoader;
    })(CsrfTokenLoader);

    MylistPocket.debug.DeflistApiLoader = DeflistApiLoader;

    class HoverMenu extends Emitter {
      constructor() {
        super();
        this._init();
      }

      _init() {
        this._view = document.querySelector('.mylistPocketHoverMenu');

        this._view.addEventListener(location.host.includes('google') ? 'mouseup' : 'click', this._onClick.bind(this));
        this._view.addEventListener('mousedown', this._onMousedown.bind(this));
        this._view.addEventListener('contextmenu', this._onContextMenu.bind(this));

        this._onHoverEnd = bounce.time(this._onHoverEnd.bind(this), 500);
        document.body.addEventListener(
          'mouseover', this._onHover.bind(this), {passive: true});
        document.body.addEventListener(
          'mouseout',  this._onMouseout.bind(this), {passive: true});
        document.body.addEventListener(
          'mouseover', this._onHoverEnd, {passive: true});
        document.body.addEventListener(
          'click', () => { this.hide(); }, {passive: true});


        util.emitter.on('hideHover', () => this.hide());

        this._x = this._y = 0;

        ZenzaDetector.detect().then(ZenzaWatch => {
          this._isZenzaReady = true;
          this.addClass('is-zenzaReady');
          ZenzaWatch.emitter.on('DialogPlayerOpen', bounce.time(() => {
            this.hide();
          }, 1000));
        });

        this.toggleClass('is-otherDomain', location.host !== 'www.nicovideo.jp');
        this.toggleClass('is-guest', !util.isLogin());
        this._deflistButton = this._view.querySelector('.mylistPocketButton.deflist-add');
        MylistPocket.debug.hoverMenu = this._view;
      }

      toggleClass(className, v) {
        className.split(/ +/).forEach((c) => {
          this._view.classList.toggle(c, v);
        });
      }

      addClass(className)    { this.toggleClass(className, true); }
      removeClass(className) { this.toggleClass(className, false); }

      hide() {
        this.removeClass('is-show');
      }

      show() {
        this.addClass('is-show');
      }

      moveTo(x, y) {
        this._x = x;
        this._y = y;
        this._view.style.left = x + 'px';
        this._view.style.top  = y + 'px';
      }

      _onClick(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      _onContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      _onMousedown(e) {
        const watchId = this._watchId;
        const target = e.target.classList.contains('command') ?
          e.target : e.target.closest('.command');
        const command = target.getAttribute('data-command');
        e.preventDefault();
        e.stopPropagation();

        if (command === 'info') {
          this._videoInfo(watchId);
          this.hide();
        } else if (command === 'playlist-queue') {
          this.emit('playlist-queue', watchId, this);
        } else {
          if (e.button !== 0 || e.shiftKey) {
            this._deflistRemove(watchId);
          } else {
            this._deflist(watchId);
          }
        }
      }

      _videoInfo(watchId) {
        this.emit('info', watchId || this._watchId, this);
      }

      _deflist(watchId) {
        this.emit('deflist-add', watchId || this._watchId, this);
      }

      _deflistRemove(watchId) {
        this.emit('deflist-remove', watchId || this._watchId, this);
      }

      _onHover(e) {
        const target = this._isTargetElement(e);
        if (!target) { return; }

        this._hoverElement = target;
      }

      _onHoverEnd(e) {
        const target =
          e.target.tagName === 'A' ? e.target : e.target.closest('a');
        if (!target || this._hoverElement !== target) { return; }
        const href = target.getAttribute('data-href') || target.getAttribute('href');
        const watchId = target.dataset.nicoVideoId || util.getWatchId(href);
        const offset = target.getBoundingClientRect();
        //const bodyOffset = document.body.getBoundingClientRect();
        const scrollTop  = document.documentElement.scrollTop  || document.body.scrollTop  || 0;
        const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const left = offset.left + scrollLeft;
        const top  = offset.top  + scrollTop;
        const host = target.hostname;
        if (host !== 'www.nicovideo.jp' && host !== 'nico.ms' && host !== 'sp.nicovideo.jp') { return; }

        if (target.classList.contains('noHoverMenu')) { return; }
        if (!watchId || !watchId.match(/^[a-z0-9]+$/)) { return; }
        if (watchId.indexOf('lv') === 0) { return; }

        this._watchId = watchId;
        this.show();
        this.moveTo(
          left + target.offsetWidth  - this._view.offsetWidth / 2,
          top  + target.offsetHeight / 2 - this._view.offsetHeight / 2
        );
      }

      _onMouseout(e) {
        const target = this._isTargetElement(e);
        if (!target) { return; }

        if (this._hoverElement === e.target) {
          this._hoverElement = null;
        }
      }

      _isTargetElement(e) {
        const target =
          e.target.tagName === 'A' ? e.target : e.target.closest('a');
        if (!target) { return false; }
        const href = target.href || '';
        if (!/(watch\/[a-z0-9]+|nico\.ms\/[a-z0-9]+)/.test(href)) { return false; }
        return target;
      }

      set isBusy(v) {
        this._isBusy = v;
        this.toggleClass('is-busy', v);
      }

      get isBusy() {
        return !!this._isBusy;
      }

      notifyBeginDeflistUpdate(/*watchId*/) {
        this.addClass('is-deflistUpdating');
      }

      notifyEndDeflistUpdate(result) {
        this.addClass('is-deflistSuccess');
        window.setTimeout(() => { this.removeClass('is-deflistSuccess'); }, 3000);

        this._deflistButton.setAttribute('data-result', result.message || '登録しました');
        this.removeClass('is-deflistUpdating');
      }

      notifyFailDeflistUpdate(result) {
        this.addClass('is-deflistFail');
        window.setTimeout(() => { this.removeClass('is-deflistFail'); }, 3000);

        this._deflistButton.setAttribute('data-result', result.message || '登録失敗');
        this.removeClass('is-deflistUpdating');
      }
    }


    class VideoInfoView extends Emitter {
      constructor({host, tpl}) {
        super();
        this._host = host;
        this._tpl = tpl;
        this._slot = {};

        this._baseConfig = config;
        this._config    = config.namespace('videoInfo');
        this._mylistConfig = config.namespace('mylist');
        const ngConfig  = this._ngConfig  = config.namespace('ng');
        const favConfig = this._favConfig = config.namespace('fav');
        this._nicoadConfig = config.namespace('nicoad');

        const {ngChecker, favChecker} = initNgChecker({ngConfig, favConfig});
        this._ngChecker  = ngChecker;
        this._favChecker = favChecker;
      }

      _initialize() {
        if (this._isInitialized) { return; }
        const host = this._host;
        const tpl = this._tpl;

        this._shadowRoot = util.attachShadowDom({host, tpl});
        Array.prototype.forEach.call(this._host.querySelectorAll('*'), (elm) => {
          //this._host.querySelectorAll('*').forEach((elm) => {
          const slot = elm.getAttribute('slot');
          if (!slot) { return; }
          //const type = elm.getAttribute('data-type') || 'string';
          this._slot[slot] = elm;
        });

        this._rootDom = this._shadowRoot.querySelector('.root');
        this._hostDom = this._host;

        this._rootDom.addEventListener('mousedown', e => { e.stopPropagation(); });
        this._shadowRoot.addEventListener('mousedown', e => { e.stopPropagation(); });
        this._rootDom.querySelector('.setting-panel-main').addEventListener('click', e => {
          e.stopPropagation();
        });

        this._initSettingPanel();

        const updateNgEnable = v => { this.toggleClass('is-ng-enable', v); };
        updateNgEnable(this._ngConfig.props.enable);
        this._ngConfig.onkey('enable', updateNgEnable);

        this._rootDom.addEventListener('click', this._onClick.bind(this));

        this._boundOnBodyMouseDown = this._onBodyMouseDown.bind(this);

        MylistPocket.debug.view = this;

        util.emitter.on('hideHover', () => {
          this.hide();
        });

        const debUpdateFavNg = bounce.time(this._updateFavNg.bind(this), 100);
        this._ngConfig    .on('update', debUpdateFavNg);
        this._favConfig   .on('update', debUpdateFavNg);
        //this._mylistConfig.on('update', debUpdateFavNg);

        ZenzaDetector.detect().then(() => {
          this._isZenzaReady = true;
          this.addClass('is-zenzaReady');
          window.ZenzaWatch.emitter.on('DialogPlayerOpen', bounce.time(() => {
            this.hide();
          }, 1000));
        });

        this._videoInfoArea = this._rootDom.querySelector('.video-info');
        this._deflistButton =
          this._rootDom.querySelector('.mylistPocketButton.deflist-add');

        this.toggleClass('is-otherDomain', location.host !== 'www.nicovideo.jp');
        this.toggleClass('is-firefox', util.isFirefox());

        MylistPocket.external.observe({
          query: 'a.videoLink',
          container: this._hostDom.querySelector('.description'),
        });

        this._isInitialized = true;
      }

      _initSettingPanel() {
        const onSettingFormChange = this._onSettingFormChange.bind(this);

        const refresh = () => {
          Array.from(this._rootDom.querySelectorAll('.setting-form')).forEach(elm => {
            const name = elm.getAttribute('data-config-name');
            if (!name) { return; }
            const namespace = elm.getAttribute('data-config-namespace') || '';
            let config = this._config;
            switch (namespace) {
              case 'ng':
                config = this._ngConfig;
                break;
              case 'fav':
                config = this._favConfig;
                break;
              case 'mylist':
                config = this._mylistConfig;
                break;
              case 'nicoad':
                config = this._nicoadConfig;
                break;
              default:
                config = this._baseConfig;
            }
            const tagName = (elm.tagName.toLowerCase()).toLowerCase();
            if (tagName === 'input') {
              const type = (elm.type || '').toLowerCase();
              switch (type) {
                case 'checkbox':
                  elm.checked = !!config.props[name];
                  break;
                default:
                  elm.value   = config.props[name];
                  break;
              }
            } else if (tagName === 'select' || tagName === 'textarea') {
              elm.value = config.props[name];
            }

            elm.removeEventListener('change', onSettingFormChange);
            elm.addEventListener('change', onSettingFormChange);
          });
        };

        const onUpdate = bounce.time(refresh, 100);

        const syncZenza = bounce.time(() => {
          if (!this._ngConfig.props.syncZenza || !this._isZenzaReady) { return; }
          window.ZenzaWatch.config.setValue('videoTagFilter', this._ngConfig.props.tag);
          window.ZenzaWatch.config.setValue('videoOwnerFilter', this._ngConfig.props.owner);
        }, 1000);

        refresh();

        this._config.on('update',  onUpdate);
        this._favConfig.on('update', onUpdate);
        this._ngConfig.on('update', () => {
          onUpdate();
          syncZenza();
        });

      }

      _onSettingFormChange(e) {
        const elm = e.target;
        const name = elm.getAttribute('data-config-name');
        if (!name) { return; }
        const namespace = elm.getAttribute('data-config-namespace') || '';
        let config = this._config;
        switch (namespace) {
          case 'ng':
            config = this._ngConfig;
            break;
          case 'fav':
            config = this._favConfig;
            break;
          case 'mylist':
            config = this._mylistConfig;
            break;
          case 'nicoad':
            config = this._nicoadConfig;
            break;
          default:
            config = this._baseConfig;
        }

        const tagName = (elm.tagName.toLowerCase()).toLowerCase();
        if (tagName === 'input') {
          const type = (elm.type || '').toLowerCase();
          switch (type) {
            case 'checkbox':
              config.props[name] = elm.checked;
              break;
            default:
              config.props[name] = elm.value;
              break;
          }
        } else if (tagName === 'select' || tagName === 'textarea') {
          config.props[name] = elm.value;
        }
      }

      toggleClass(className, v) {
        className.split(/ +/).forEach((c) => {
          this._rootDom.classList.toggle(c, v);
          this._hostDom.classList.toggle(c, v);
        });
      }

      addClass(className)    { this.toggleClass(className, true); }
      removeClass(className) { this.toggleClass(className, false); }

      bind(videoInfo) {
        this._videoInfo = videoInfo;
        if (videoInfo.status === 'ok') {
          this._bindSuccess(videoInfo);
        } else {
          this._bindFail(videoInfo);
        }
        window.setTimeout(() => {
          this.removeClass('is-loading');
        }, 0);
      }

      _onClick(e) {
        const t = e.target;
        const elm =
          t.classList.contains('command') ?
            t : e.target.closest('.command');
        if (!elm) { return; }

        // 簡易 throttle
        if (elm.classList.contains('is-active')) { return; }
        elm.classList.add('is-active');
        window.setTimeout(() => { elm.classList.remove('is-active'); }, 500);

        e.preventDefault();
        e.stopPropagation();
        const command = elm.getAttribute('data-command');
        const param   = elm.getAttribute('data-param');
        switch (command) {
          case 'toggle-setting':
            this.toggleSettingPanel();
            break;
          case 'add-ng-tag':    case 'add-fav-tag':
          case 'toggle-ng-tag': case 'toggle-fav-tag': {
              const tag = elm.getAttribute('data-tag') || '';
              if (!tag) { break; }
              this.emit('command', command, {
                watchId: this._videoInfo.watchId,
                value: tag
              }, this);
            }
            break;
          case 'add-ng-owner':    case 'add-fav-owner':
          case 'toggle-ng-owner': case 'toggle-fav-owner': {
              let owner =
                (this._videoInfo.isChannel ? 'ch' : '') +
                 this._videoInfo.ownerId + '#' + this._videoInfo.ownerName;
              this.emit('command', command, {
                watchId: this._videoInfo.watchId,
                value: owner
              }, this);
            }
            break;
          case 'mylist-comment-open':
            this.emit('command', command, this._videoInfo.watchId);
            break;
          case 'close':
            this.hide();
            break;
           default:
            this.emit('command', command, param, this);
        }
      }

      _updateFavNg() {
        if (!this._isInitialized) { return; }
        if (!this._videoInfo  || this._videoInfo.status !== 'ok') { return; }

        const videoInfo = this._videoInfo;
        const ownerInfo = this._rootDom.querySelector('.owner-info');
        ownerInfo.classList.toggle('is-favorited',
          this._favChecker.isMatchOwner(videoInfo.owner));
        ownerInfo.classList.toggle('is-ng',
          this._ngChecker .isMatchOwner(videoInfo.owner));

        Array.prototype.forEach.call(
          this._rootDom.querySelectorAll('.tag-container'),
          (elm) => {
            const tag = elm.getAttribute('data-tag');
            elm.classList.toggle('is-favorited', this._favChecker.isMatchTag(tag));
            elm.classList.toggle('is-ng',        this._ngChecker.isMatchTag(tag));
          });
      }

      toggleSettingPanel() {
        this.toggleClass('is-setting');
      }

      _onBodyMouseDown() {
        document.body.removeEventListener('mousedown', this._boundOnBodyMouseDown);
        this.hide();
      }

      reset() {
        this._initialize();
        window.setTimeout(() => { this._videoInfoArea.scrollTop = 0; }, 0);
        this.removeClass('noclip');
        this.addClass('is-loading');
      }

      show() {
        this.addClass('show');
        document.body.addEventListener('mousedown', this._boundOnBodyMouseDown);
      }

      hide() {
        this._videoInfoArea.scrollTop = 0;
        this.removeClass('show is-ok is-fail noclip is-setting');
      }

      _bindSuccess(videoInfo) {
        const toCamel = p => {
          return p.replace(/-./g, s => { return s.charAt(1).toUpperCase(); });
        };

        Object.keys(this._slot).forEach((key) => {
          const camelKey = toCamel(key);
          const data = videoInfo[camelKey];

          const elm = this._slot[key];
          const type = elm.getAttribute('data-type') || 'string';
          switch (type) {
            case 'html':
              this._createDescription(elm, data);
              break;
            case 'int': {
              let i = parseInt(data, 10);
              i = i.toLocaleString ? i.toLocaleString() : i;
              elm.textContent = i;
            }
              break;
            case 'link':
              elm.href = data;
              break;
            case 'image':
              elm.src = data.replace('http:', 'https:');
              break;
            case 'date':
              elm.textContent = data.toLocaleString();
              break;
            default:
              elm.textContent = data;
          }
        });

        const df = document.createDocumentFragment();
        //Array.prototype.forEach.call(this._host.querySelectorAll('.tag'), t => { t.remove(); });
        videoInfo.tags.forEach(tag => {
          df.appendChild((this._createTagSlot(tag, videoInfo)));
        });
        const videoTags = this._rootDom.querySelector('.video-tags');
        videoTags.innerHTML = '';
        videoTags.appendChild(df);

        Array.prototype.forEach.call(this._rootDom.querySelectorAll('.command-watch-id'), elm => {
          elm.setAttribute('data-param', videoInfo.watchId);
        });
        Array.prototype.forEach.call(this._rootDom.querySelectorAll('.command-video-id'), elm => {
          elm.setAttribute('data-param', videoInfo.videoId);
        });

        const target = this._config.props.openNewWindow ? '_blank' : '_self';
        Array.prototype.forEach.call(
          this._host.querySelectorAll('.target-change'), elm => {
          elm.target = target;
          elm.rel = 'noopener';
        });

        this._updateFavNg();

        this.toggleClass('is-channel', videoInfo.isChannel);
        this.addClass('is-ok');
        this.removeClass('is-fail');
        window.setTimeout(() => { this.addClass('noclip'); }, 800);
      }

      _createDescription(elm, data) {
        elm.innerHTML = util.httpLink(data);
        const watchReg = /watch\/([a-z0-9]+)/;
        const isZenzaReady = this._isZenzaReady;
        //if (util.isFirefox()) { return; }
        Array.from(elm.querySelectorAll('.videoLink[href*=\'watch/\']')).forEach((link) => {
          const href = link.getAttribute('href');
          if (!watchReg.test(href)) { return; }
          const watchId = RegExp.$1;
          if (isZenzaReady) {
            link.classList.add('noHoverMenu');
            link.classList.add('command');
            link.setAttribute('data-command', 'zenza-open');
            link.setAttribute('data-param', watchId);
          }
          const label = document.createElement('span');
          label.className = 'label';
          label.textContent = link.textContent;
          link.textContent = '';
          link.append(label);

          const btn = document.createElement('button');
          btn.innerHTML = '？';
          btn.className = 'command command-button noHoverMenu';
          btn.setAttribute('slot', 'command-button');
          btn.setAttribute('tooltip', '動画情報');
          btn.setAttribute('data-command', 'info');
          btn.setAttribute('data-param', watchId);
          link.appendChild(btn);

          const thumbnail = util.getThumbnailUrlByVideoId(watchId);
          const img = document.createElement('img');
          img.className = 'videoThumbnail preview';
          img.src = 'https://nicovideo.cdn.nimg.jp/uni/img/common/video_deleted.jpg';//(thumbnail || '').replace(/^http:/, '');
          link.classList.add('popupThumbnail');
          link.appendChild(img);

          link.dataset.videoId = watchId;
          link.classList.add('watch');
        });
      }

      _bindFail(videoInfo) {
        this._slot['error-description'].textContent =
          `動画情報の取得に失敗しました (${videoInfo.description})`;
        this.addClass('is-fail');
        this.removeClass('is-ok');
      }


      _createTagSlot(tag, {isChannel, owner}) {
        const text = util.escapeHtml(tag.text);
        const lock = tag.isLocked ? 'is-locked' : '';
        const span = document.createElement('span');
        const ownerId = owner ? owner.id : '';

        const a = document.createElement('a');
        const target = this._config.props.openNewWindow ? '_blank' : '_self';
        a.textContent = tag.text;
        a.className = `tag ${lock}`;
        a.target    = target;
        a.rel       = 'noopener';
        a.href      = `https://www.nicovideo.jp/tag/${encodeURIComponent(text)}`;
        span.appendChild(a);

        if (isChannel) {
          const ch = document.createElement('a');
          const target = this._config.props.openNewWindow ? '_blank' : '_self';
          ch.textContent = '[ch]';
          ch.className = `tag ${lock} channel-search`;
          ch.target    = target;
          ch.rel       = 'noopener';
          ch.title     = 'チャンネル検索';
          //ch.href      = `http://ch.nicovideo.jp/search/${encodeURIComponent(text)}?channel_id=ch${ownerId}&type=video&mode=t`;
          ch.href      = `https://ch.nicovideo.jp/search/${encodeURIComponent(text)}?type=video&mode=t`;
          span.appendChild(ch);
        }

        const fav = document.createElement('button');
        fav.className = 'add-fav-button command';
        fav.setAttribute('data-command', 'toggle-fav-tag');
        fav.setAttribute('data-tag', tag.text);
        fav.innerHTML = '★'; //'&#8416;'; // &#x2716;
        span.appendChild(fav);

        const bt = document.createElement('button');
        bt.className = 'add-ng-button command';
        bt.setAttribute('data-command', 'toggle-ng-tag');
        bt.setAttribute('data-tag', tag.text);
        bt.innerHTML = '&#x2716;'; //'&#8416;'; // &#x2716;
        span.appendChild(bt);

        const menu = `<zenza-tag-item-menu
          class="tagItemMenu"
          data-text="${encodeURIComponent(text)}"
          data-has-nicodic="0"
        ></zenza-tag-item-menu>`;
        span.insertAdjacentHTML('afterbegin', menu);

        span.className = 'tag-container';
        span.setAttribute('data-tag', tag.text);
        span.slot = 'tag';
        return span;
      }

      notifyBeginDeflistUpdate(/*watchId*/) {
        this.addClass('is-deflistUpdating');
      }

      notifyEndDeflistUpdate(result) {
        this.addClass('is-deflistSuccess');
        window.setTimeout(() => { this.removeClass('is-deflistSuccess'); }, 3000);

        this._deflistButton.setAttribute('data-result', result.message || '登録しました');
        this.removeClass('is-deflistUpdating');
      }

      notifyFailDeflistUpdate(result) {
        this.addClass('is-deflistFail');
        window.setTimeout(() => { this.removeClass('is-deflistFail'); }, 3000);

        this._deflistButton.setAttribute('data-result', result.message || '登録失敗');
        this.removeClass('is-deflistUpdating');
      }
    }


    class VideoInfo {
      static createByThumbInfo(thumbInfo) {
        let thumbnail = thumbInfo.thumbnail;
        if (util.hasLargeThumbnail(thumbInfo.videoId)) {
          thumbnail = thumbnail.replace(/\.[ML]$/) + '.L';
        }
        const owner = thumbInfo.owner || {};
        const isChannel = thumbInfo.isChannel;
        const rawData = {
          status:  thumbInfo.status,
          videoId: thumbInfo.id,
          watchId: thumbInfo.v,
          videoTitle: thumbInfo.title,
          videoThumbnail: thumbnail,
          uploadDate:     thumbInfo.postedAt,
          duration:       textUtil.secToTime(thumbInfo.duration),
          viewCounter:    thumbInfo.viewCount,
          mylistCounter:  thumbInfo.mylistCount,
          commentCounter: thumbInfo.commentCount,
          description:    thumbInfo.description,
          lastResBody:    thumbInfo.lastResBody,
          isChannel,
          ownerId:   owner.id,
          ownerName: owner.name,
          ownerIcon: owner.icon,
          tags: thumbInfo.tagList.map(tag => { return {text: tag.text, isLocked: tag.lock}; })
        };

        return new VideoInfo(rawData);
      }

      constructor(rawData) {
        this._rawData = rawData;
      }

      get status()           { return this._rawData.status; }
      get videoId()          { return this._rawData.videoId; }
      get watchId()          { return this._rawData.watchId; }
      get originalVideoId() {
        return (!this.isChannel && this.videoId !== this.watchId) ? this.videoId : '';
      }
      get videoTitle()       { return this._rawData.videoTitle; }
      get videoThumbnail()   { return this._rawData.videoThumbnail; }
      get description()      { return this._rawData.description; }
      get duration()         { return this._rawData.duration; }
      get owner() {
        return {
          type: this.isChannel ? 'channel' : 'user',
          id:   this.ownerId,
          linkId: this.ownerId ? (this.isChannel ? `ch${this.ownerId}` : `user/${this.ownerId}`) : 'xx',
          name: this.ownerName,
          icon: this.ownerIcon
        };
      }

      get ownerPageLink()  {
        const ownerId = this.ownerId;
        if (this.isChannel) {
          return `${protocol}//ch.nicovideo.jp/ch${ownerId}`;
        } else {
          return `${protocol}//www.nicovideo.jp/user/${ownerId}`;
        }
      }
      get ownerIcon()      { return this._rawData.ownerIcon; }
      get ownerName()      { return this._rawData.ownerName; }
      get localeOwnerName() {
        if (this.isChannel) {
          return this.ownerName;
        } else {
          // TODO: 言語依存
          return this.ownerName + ' さん';
        }
      }
      get ownerId()        { return this._rawData.ownerId; }
      get isChannel()      { return this._rawData.isChannel; }
      get uploadDate()     { return new Date(this._rawData.uploadDate); }

      get viewCounter()    { return this._rawData.viewCounter; }
      get mylistCounter()  { return this._rawData.mylistCounter; }
      get commentCounter() { return this._rawData.commentCounter; }

      get lastResBody()    { return this._rawData.lastResBody; }
      get tags() { return this._rawData.tags; }
    }



    const deflistAdd = (watchId) => {
      const enableAutoComment = config.props.mylist.enableAutoComment;
      if (location.host === 'www.nicovideo.jp') {
        if (enableAutoComment) {
          return DeflistApiLoader.addItemWithOwnerName(watchId);
        } else {
          return DeflistApiLoader.addItem(watchId, '');
        }
      }

      let zenza;
      let token;
      return ZenzaDetector.detect().then((z) => {
        zenza = z;
      }).then(() => {
        return CsrfTokenLoader.load().then((t) => {
          token = t;
        }, () => { return Promise.resolve(); });
      }).then(() => {
        if (!enableAutoComment) { return {}; }
        return ThumbInfoLoader.loadOwnerInfo(watchId);
      }).then((owner) => {
        if (!owner.id) {
          return zenza.external.deflistAdd({watchId});
        }

        const description = `${owner.localeName} ${owner.linkId}`;
        return zenza.external.deflistAdd({watchId, description, token});
      });
    };

    const deflistRemove = (watchId) => {
      if (location.host === 'www.nicovideo.jp') {
        return DeflistApiLoader.removeItem(watchId);
      }

      let zenza;
      let token;
      return ZenzaDetector.detect().then((z) => {
        zenza = z;
      }).then(() => {
        return CsrfTokenLoader.load().then((t) => {
          token = t;
        }, () => { return Promise.resolve(); });
      }).then(() => {
        return zenza.external.deflistRemove({watchId, token});
      });

    };



    class MatchChecker {
      constructor({word = '', tag = '', owner = ''}) {
        this.init({word, tag, owner});
      }

      init({word, tag, owner}) {
        this._tag = [];
        tag.split(/[\r\n]+/).forEach((t) => {
          if (t) { this._tag.push(t.trim()); }
        });
        this._tag = _.uniq(this._tag);

        let wordTmp = [];
        this._word = null;
        word.split(/[\r\n]+/).forEach((w) => {
          if (w) { wordTmp.push(util.escapeRegs(w.trim())); }
        });
        wordTmp = _.uniq(wordTmp);
        if (wordTmp.length > 0) {
          this._word = new RegExp('(' + wordTmp.join('|') + ')', 'i');
        }

        this._userId    = [];
        this._channelId = [];
        owner.split(/[\r\n]+/).forEach((o) => {
          if (typeof o === 'string') {
            const id = o.split('#')[0].trim();
            if (id.startsWith('ch')) {
              this._channelId.push(parseInt(id.substring(2)));
            } else {
              this._userId.push(parseInt(id));
            }
          }
        });
        this._userId    = _.uniq(this._userId);
        this._channelId = _.uniq(this._channelId);

      }

      isMatch(data) {
        if (this._isMatchTag(data.tagList)) { return true; }
        if (this._isMatchOwner(data.owner)) { return true; }
        if (this._isMatchWord({title: data.title, description: data.description})) { return true; }
      }

      _isMatchTag(tagList = []) {
        if (this._tag.length < 1) { return false; }

        const tagTmp = [];
        tagList.forEach(t => { if (t) { tagTmp.push(util.escapeRegs(t.trim ? t.trim() : t.text.trim())); } });
        const tagReg = new RegExp(' (' + tagTmp.join('|') + ') ', 'i');
        const _tag = ' ' + this._tag.join(' ') + ' ';
        return tagReg.test(_tag);
      }

      _isMatchOwner(owner) {
        const _id = owner.type === 'user' ? this._userId : this._channelId;
        return _id.includes(parseInt(owner.id, 10));
      }

      _isMatchWord({title, description}) {
        if (!this._word) { return false; }
        return this._word.test(title) || this._word.test(description);
      }

      isMatchTag(tag) {
        return this._isMatchTag([tag]);
      }

      isMatchOwner(owner) {
        return this._isMatchOwner(owner);
      }
    }

    class NgChecker extends MatchChecker {
      isNg(data) {
        return super.isMatch(data);
      }
    }

    const initDom = () => {
      util.addStyle(__css__);
      const f = document.createElement('div');
      f.id = 'mylistPocketDomContainer';
      f.innerHTML = __tpl__;
      document.body.appendChild(f);
    };

    const initZenzaBridge = () => {
      ZenzaDetector.initialize();
    };

    const createVideoInfoView = () => {
      const host = document.getElementById('mylistPocket-popup');
      const tpl  = document.getElementById('mylistPocket-popup-template');
      const vv = new VideoInfoView({host, tpl});
      return vv;
    };

    const createVideoInfoLoader = vv => {

      const onVideoInfoLoad = thumbInfo => {
        const vi = VideoInfo.createByThumbInfo(thumbInfo);
        vv.bind(vi);
      };

      const onVideoInfoFail = () => {
        vv.bind({status: 'fail', description: '通信失敗'});
        return Promise.resolve();
      };

      return watchId => {
        vv.reset();
        vv.show();
        return ThumbInfoLoader.load(watchId, {expireTime: 60 * 60 * 1000}).then(onVideoInfoLoad, onVideoInfoFail);
      };
    };

    const createCommandDispatcher = ({infoView}) => {
      const info = createVideoInfoLoader(infoView);

      const ngConfig  = config.namespace('ng');
      const favConfig = config.namespace('fav');
      const {ngChecker, favChecker} = initNgChecker({ngConfig, favConfig});

      const toggleFavNg = (command, param) => {
        let [cmd, namespace, key] = command.split('-');
        let _config = namespace === 'fav' ? favConfig : ngConfig;
        _config.refresh();
        const value = param.value.trim();
        let ngs = _config.props[key].trim().split(/[\r\n]/);
        const isContain = ngs.includes(value);

        if (isContain || cmd === 'remove') {
          ngs = ngs.filter((line) => {
            if (line === value) {
              window.console.info('%c-%s:%s', 'background: cyan', key, value);
            }
            return line !== value;
          });
          cmd = 'remove';
        } else if (!isContain || cmd === 'add') {
          ngs.push(value);
          window.console.info('%c+%s:%s', 'background: cyan', key, value);
          cmd = 'add';
        }

        ngs = _.uniq(ngs);

        _config.props[key] = ngs.join('\n').trim();

        const className = namespace === 'fav' ? 'is-fav-favorited' : 'is-ng-rejected';
        Array.prototype.forEach.call(
          document.querySelectorAll(`*[data-watch-id=${param.watchId}]`),
          item => { item.classList.toggle(className, cmd === 'add'); });
      };

      return (command, param, src) => {
        switch(command) {
          case 'info':
            return info(param);
          case 'load':
            return QueueLoader.load(param);
          case 'fav-status':
            return QueueLoader.load(param).then((result) => {
              if (!result || result.status === 'fail' || result.code === 'DELETED') {
                return Promise.reject({status: 'unknown', result});
              }
              if (ngChecker.isMatch(result)) {
                return {status: 'ng', result};
              }
              if (favChecker.isMatch(result)) {
                return {status: 'favorite', result};
              }
              return {status: 'default', result};
            });
          case 'mylist-window':
            window.open(
             protocol + '//www.nicovideo.jp/mylist_add/video/' + param,
             'nicomylistadd',
             'width=500, height=400, menubar=no, scrollbars=no');
            break;
          case 'twitter-hash-open':
            window.open('https://twitter.com/hashtag/' + param + '?src=hash');
            break;
          case 'open-mylist-open':
            window.open(protocol + '//www.nicovideo.jp/openlist/' + param);
            break;
          case 'mylist-comment-open':
            window.open(protocol + '//www.nicovideo.jp/mylistcomment/video/' + param);
            break;
           case 'zenza-open-now':
            if (window.ZenzaWatch.config &&
              window.ZenzaWatch.config.getValue('enableSingleton')) {
              window.ZenzaWatch.external.sendOrExecCommand('openNow', param);
            } else {
              window.ZenzaWatch.external.execCommand('openNow', param);
            }
            break;
          case 'zenza-open':
            if (window.ZenzaWatch.config.getValue('enableSingleton')) {
              window.ZenzaWatch.external.sendOrOpen(param);
            } else {
              window.ZenzaWatch.external.open(param);
            }
            break;
          case 'playlist-inert':
            window.ZenzaWatch.external.playlist.insert(param);
            break;
          case 'playlist-queue':
            window.ZenzaWatch.external.playlist.add(param);
            break;
          case 'deflist-add':
            src.notifyBeginDeflistUpdate('is-deflistUpdating');

            return deflistAdd(param)
              .then(util.getSleepPromise(1000, 'deflist-add'))
              .then((result) => {
                src.notifyEndDeflistUpdate(result);
              }, (err) => {
                console.error('deflist-add-result', err);
                src.notifyFailDeflistUpdate(err);
              });
          case 'deflist-remove':
            src.notifyBeginDeflistUpdate('is-deflistUpdating');

            return deflistRemove(param)
              .then(util.getSleepPromise(1000, 'deflist-remove'))
              .then(() => {
                src.notifyEndDeflistUpdate({message: '削除しました'});
              }, (err) => {
                console.error('deflist-remove-result', err);
                src.notifyFailDeflistUpdate(err);
              });
          case 'add-ng-word':  case 'add-ng-tag':  case 'add-ng-owner':
          case 'add-fav-word': case 'add-fav-tag': case 'add-fav-owner':
          case 'remove-ng-word':  case 'remove-ng-tag':  case 'remove-ng-owner':
          case 'remove-fav-word': case 'remove-fav-tag': case 'remove-fav-owner':
          case 'toggle-ng-word':  case 'toggle-ng-tag':  case 'toggle-ng-owner':
          case 'toggle-fav-word': case 'toggle-fav-tag': case 'toggle-fav-owner':
            toggleFavNg(command, param);
            break;
        }
      };
    };

    const initExternal = (dispatcher, hoverMenu, infoView) => {
      MylistPocket.external = {
        info: watchId => { return dispatcher('info', watchId); },
        load: watchId => { return dispatcher('load', watchId, {expireTime: 60 * 60 * 1000}); },
        getFavStatus: (watchId) => { return dispatcher('fav-status', watchId); },
        observe: (params /*{query, container, closest}*/) => { initNg(params); },
        hide: () => {
          hoverMenu.hide();
          infoView.hide();
        }
      };

      MylistPocket.isReady = true;

      const ev = new CustomEvent('MylistPocketInitialized', { detail: { MylistPocket } });
      document.body.dispatchEvent(ev);
      // 過去の互換用
      if (window.jQuery) {
        window.jQuery('body').trigger('MylistPocketReady', MylistPocket);
      }
    };


    const QueueLoader = (() => {
      let lastPromise = null;
      let count = 0;
      const MAX_LOAD = 6;
      const promises = [];

      const load = function(watchId, item) {
        count = (count + 1) % MAX_LOAD;
        lastPromise = promises[count];

        const onLoad = info => {
          if (item) {
            watchId = info.watchId;
            item.setAttribute('data-watch-id', watchId);
            item.setAttribute('data-thumb-info', JSON.stringify(info));
          }
          const sleepTime = info.fromCache ? 0 : 50;
          return (util.getSleepPromise(sleepTime,  'success-' + watchId))(info);
        };
        const onFail = util.getSleepPromise(1000, 'fail-'    + watchId);

        if (!lastPromise) {
          if (item) { item.classList.add('is-ng-current'); }
          lastPromise = ThumbInfoLoader.load(watchId).then(onLoad, onFail);
        } else {
          //lastPromise = Promise.all([lastPromise]).then(() => {
          lastPromise = Promise.race(promises).then(() => {
            if (item) { item.classList.add('is-ng-current'); }
            return ThumbInfoLoader.load(watchId).then(onLoad, onFail);
          });
        }

        promises[count] = lastPromise;
        return lastPromise;
      };

      return {
        load
      };
    })();

    const waitForDom = (query, timeout = 30000) => {
      const now = Date.now();
      return new Promise(async (ok, ng) => {
        while (now + timeout > Date.now()) {
          const dom = document.querySelector(query);
          console.log('waitForDom', query, dom, now + timeout, Date.now());
          if (dom) {
            return ok(dom);
          }
          await new Promise(wait => setTimeout(wait, 1000));
        }
        ng('timeout');
      });
    };

    const getNgEnv = async () => {
      if (location.host === 'www.nicovideo.jp' &&
         (location.pathname.startsWith('/ranking') ||
          location.pathname.startsWith('/tag')     ||
          location.pathname.startsWith('/search'))
      ) {
        if (document.querySelector('#MatrixRanking-app')) {
          await waitForDom('.RankingMatrixVideosRow');
        }
        return {
          query:
            '.item[data-video-id]:not(.is-ng-wait), .item_cell[data-video-id]:not(.is-ng-wait), '+
            '.VideoItem:not(.is-ng-wait), .RankingMainVideo[data-video-id]:not(.is-ng-wait)',
          container:
            Array.from(
              document.querySelectorAll(
                '.contentBody .list, .container.column1024-0,'+
                '.RankingMatrixVideosRow, '+
                '.RankingMainContainer, .RankingVideoListContainer')
            ),
          subtree: false
        };
      }
      if (location.host === 'www.nicovideo.jp' &&
          document.querySelector('#MyPageNicorepoApp, #UserPageNicorepoApp')) {
        return {
          query: '.NicorepoTimelineItem:not(.is-ng-wait)',
          container: document.querySelector('#MyPageNicorepoApp, #UserPageNicorepoApp'),
        };
      }

      if (location.host === 'ch.nicovideo.jp' &&
          location.pathname.startsWith('/search')) {
        return {
          query: '.item:not(.is-ng-wait)',
          container: document.querySelector('.site_body')
        };
      }

      if (location.host === 'search.nicovideo.jp') {
        return {
          query: '.video:not(.is-ng-wait)',
          container: document.querySelector('#row-results')
        };
      }


      return {query: null, container: null};
    };

    const initNgConfig = () => {
      const ngConfig = config.namespace('ng');
      const updateEnable = v => { document.body.classList.toggle('is-ng-disable', !v); };
      updateEnable(ngConfig.props.enable);
      if (!ngConfig.props.enable) { return {}; }
      ngConfig.onkey('enable', updateEnable);

      const favConfig = config.namespace('fav');
      return {ngConfig, favConfig};
    };

    const initNgChecker = ({ngConfig, favConfig}) => {
      const ngChecker = new NgChecker({
        word:  ngConfig.props.word,
        tag:   ngConfig.props.tag,
        owner: ngConfig.props.owner
      });

      ngConfig.on('update', bounce.time(({key, value}) => {
        ngChecker.init({
          word:  ngConfig.props.word,
          tag:   ngConfig.props.tag,
          owner: ngConfig.props.owner
        });
      }, 100));


      const favChecker = new MatchChecker({
        word:  favConfig.props.word,
        tag:   favConfig.props.tag,
        owner: favConfig.props.owner
      });

      favConfig.on('update', bounce.time(({key, value}) => {
        favChecker.init({
          word:  favConfig.props.word,
          tag:   favConfig.props.tag,
          owner: favConfig.props.owner
        });
      }, 100));

       return {ngChecker, favChecker};
    };

    const initIntersectionObserver = onInview => {

      const onItemInview = item => {
        let watchId = item.getAttribute('data-id') ||
          item.getAttribute('data-video-id') ||
          item.getAttribute('data-watch-id');
        const ignore = () => item.classList.add('is-ng-ignore');
        if (!watchId) {
          const a = item.querySelector('a[href*=\'watch/\']');
          let m;
          if (!a) { return ignore(); }
          if (a.hostname !== 'www.nicovideo.jp') { return ignore(); }
          if ((m = /^\/watch\/([a-z0-9]+)/.exec(a.pathname)) === null) { return ignore(); }
          watchId = m[1];
        }

        if (!watchId) {
          item.classList.add('.no-watch-id');
          return ignore();
        }

        item.classList.add('is-ng-queue');
        onInview(item, watchId);
      };

      const intersectionObserver = new window.IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting).forEach(entry => {
          const item = entry.target;
          intersectionObserver.unobserve(item);
          onItemInview(item);
        });
      }, { rootMargin: '400px'});

      return intersectionObserver;
    };

    const initNgDom = ({intersectionObserver, query, closest, container, subtree}) => {
      subtree = typeof subtree !== 'boolean' ? false : subtree;
      if (!container) { return; }
      util.addStyle(__ng_css__);

      const update = container => {
        let items = (container || document).querySelectorAll(query);
        if (!items || items.length < 1) { return; }
        if (closest) {
          let tmp = [];
          [...items].forEach(item => {
            const c = item.closest(closest);
            if (c && !tmp.includes(c)) {
              tmp.push(c);
            }
          });
          items = tmp;
        }
        if (!items || items.length < 1) { return; }
        [...items].forEach(item => {
          //if (item.offsetLeft < 0) { return; }
          if (item.classList.contains('is-ng-ignore')) { return; }
          item.classList.add('is-ng-wait');
          intersectionObserver.observe(item);
        });
      };
      update();

      if (!container) { return; }
      const mutationObserver = new MutationObserver(mutations => {
        for (const record of mutations) {
          const container = record.target;
          if (record.addedNodes && record.addedNodes.length) {
            update(container);
          }
        }
      });

      const containers = Array.isArray(container) ? container : [container];
      containers.forEach(container => {
        container.dataset.isWatching = 1;
        mutationObserver.observe(
          container,
          {childList: true, characterData: false, attributes: false, subtree}
        );
      });

    };

    const initNg = async params => {
      if (!window.IntersectionObserver) { return; }

      let {query, container, closest, subtree, callback} = params ? params : await getNgEnv();

      if (!query) { return; }

      const {ngConfig, favConfig} = initNgConfig();
      if (!ngConfig) { return; }

      const {ngChecker, favChecker} = initNgChecker({ngConfig, favConfig});

      const onItemInview = (item, watchId) => {

        const loadLazy = () => {
          const lazyImage = item.querySelector('.jsLazyImage');
          if (lazyImage) {
            const origImage = lazyImage.getAttribute('data-original');
            if (origImage) {
              lazyImage.src = origImage;
              lazyImage.classList.remove('jsLazyImage');
            }
          }
        };

        QueueLoader.load(watchId, item).then(
          info => {
            item.classList.remove('is-ng-current');
            if (!info || info.status === 'fail' || info.code === 'DELETED') {
              if (info && info.code !== 'COMMUNITY') {
                console.error('empty data', watchId, info, info ? info.code : 'unknown');
              }
              item.classList.add('is-ng-failed', info ? info.code : 'is-no-data');
            } else {
              if (callback) {
                return callback(item,
                  {watchId, info, isNg: ngChecker.isNg(info), isFav: favChecker.isMatch(info)});
              }
              item.classList.add(
                ngChecker.isNg(info) ? 'is-ng-rejected' : 'is-ng-resolved');
              if (favChecker.isMatch(info)) {
                item.classList.add('is-fav-favorited');
              }

              for (let img of item.querySelectorAll('img.videoThumbnail.preview')) {
                img.src = info.thumbnail;
              }

              let label = item.querySelector('.label');
              item.dataset.title = info.title;
              // チャンネル動画のリンクを watch/so〜 に置き換える
              if (!(info.id || '').startsWith('so')) { return; }
              if (label &&
                  item.classList.contains('videoLink')
              ) {
                label.textContent = info.id;
                item.dataset.param = item.dataset.videoId = info.id;
                item.href = `https://www.nicovideo.jp/watch/${info.id}`;
              }
              for (let a of item.querySelectorAll(`a[href*="watch/${watchId}"]`)) {
                let href = a.getAttribute('href');
                href = href.replace(/watch\/([0-9]+)/, `watch/${info.id}`);
                a.setAttribute('href', href.replace(/^http:/, 'https:'));
              }
            }

            loadLazy();
          },
          () => {
            item.classList.remove('is-ng-current');
            item.classList.add('is-ng-failed');
            loadLazy();
          }
        );
      };

      const intersectionObserver = initIntersectionObserver(onItemInview);

      initNgDom({intersectionObserver, query, container, closest, subtree});

      return intersectionObserver;
    };

    const init = async () => {
      await config.promise('restore');
      initDom();
      initZenzaBridge();

      const infoView = createVideoInfoView();
      const dispatcher = createCommandDispatcher({infoView});

      infoView.on('command', dispatcher);

      const hoverMenu = new HoverMenu();
      hoverMenu.on('info', (watchId) => {
        hoverMenu.isBusy = true;

        dispatcher('info', watchId)
          .then(() => { hoverMenu.isBusy = false; });
      });
      hoverMenu.on('deflist-add', (watchId, src) => {
        dispatcher('deflist-add', watchId, src);
      });
      hoverMenu.on('deflist-remove', (watchId, src) => {
        dispatcher('deflist-remove', watchId, src);
      });
      hoverMenu.on('playlist-queue', (watchId, src) => {
        dispatcher('playlist-queue', watchId, src);
      });
      MylistPocket.debug.hoverMenu = hoverMenu;

      initNg();

      if (config.props.nicoad.hide) {
        util.addStyle(nicoadHideCss);
      }
      if (document.body.classList.contains('MatrixRanking-body') &&
          config.props.responsive.matrix) {
        util.addStyle(responsiveCss);
      }

      initExternal(dispatcher, hoverMenu, infoView);
    };

    init();
  };
//@require Emitter
//@require parseThumbInfo
//@require workerUtil
//@require IndexedDbStorage
//@require ThumbInfoCacheDb
window.MylistPocketLib = {
  workerUtil
};
const thumbInfoApi = async function() {
//@require gate
  const {post, parseUrl, uFetch, init} = gate();
  const {port, TOKEN} = init({prefix: `thumbInfo${PRODUCT}`, type: 'thumbInfo'});
  const db = await ThumbInfoCacheDb.open();
  port.addEventListener('message', async e => {
    const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    const {body, sessionId, token} = data;
    const {command, params} = body;
    if (command !== 'fetch') { return; }
    const p = parseUrl(params.url);
    if (TOKEN !== token ||
      p.hostname !== location.host ||
      !p.pathname.startsWith('/api/getthumbinfo/')) {
      console.log('invalid msg: ', {origin: e.origin, TOKEN, token, body});
      return;
    }
    params.options = params.options || {};

    const watchId = params.url.split('/').reverse()[0];
    const expiresAt = Date.now() - (params.options.expireTime || 0);
    const cache = await db.get(watchId);
    if (cache && cache.thumbInfo.status === 'ok' && cache.updatedAt > expiresAt) {
      return post({status: 'ok', command, params: cache.thumbInfo}, {sessionId});
    }


    delete params.options.credentials;
    return uFetch(params, sessionId)
      .then(res => res.text())
      .then(async xmlText => {
        let thumbInfo = parseThumbInfo(xmlText);
        if (thumbInfo.status === 'ok') {
          db.put(xmlText, thumbInfo);
        } else if (cache && cache.thumbInfo.status === 'ok') {
          thumbInfo = cache.thumbInfo;
        }
        const result = {status: 'ok', command, params: thumbInfo};
        post(result, {sessionId});
      }).catch(({status, message}) => {
        if (cache && cache.thumbInfo.status === 'ok') {
          return post({status: 'ok', command, params: cache.thumbInfo}, {sessionId});
        }
        return post({status, message, command}, {sessionId});
      });
  });
};

  const loadGm = () => {
    const script = document.createElement('script');
    script.id = `${PRODUCT}Loader`;
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'UTF-8');
    script.append(`
    (() => {
      const {Handler, PromiseHandler, Emitter} = (${EmitterInitFunc.toString()})();
      ${parseThumbInfo.toString()}

      (${monkey.toString()})("${PRODUCT}");
    })();`);
    (document.head || document.documentElement).append(script);
  };

  const host = window.location.host || '';
  if (host === 'ext.nicovideo.jp' &&
      window.name.indexOf(`thumbInfo${PRODUCT}Loader`) >= 0) {
    thumbInfoApi();
  } else if (window === top) {
    loadGm();
  }
});
