//===BEGIN===
  const CONSTANT = {
    BASE_Z_INDEX: 100000,

    CONTROL_BAR_HEIGHT: 40,

    SIDE_PLAYER_WIDTH: 400,
    SIDE_PLAYER_HEIGHT: 225,

    BIG_PLAYER_WIDTH: 896,
    BIG_PLAYER_HEIGHT: 480,

    RIGHT_PANEL_WIDTH: 320,
    BOTTOM_PANEL_HEIGHT: 240,

    // video.src クリア用。
    // 空文字だとbase hrefと連結されて https://www.nicovideo.jp が参照されるという残念な理由で // を指定している
    BLANK_VIDEO_URL : '//',

    MEDIA_ERROR: {
      MEDIA_ERR_ABORTED: 1,
      MEDIA_ERR_NETWORK: 2,
      MEDIA_ERR_DECODE:  3,
      MEDIA_ERR_SRC_NOT_SUPPORTED: 4
    }

  };


