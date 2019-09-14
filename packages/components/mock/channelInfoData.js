// https://public.api.nicovideo.jp/v1/channels.json?channelIds=2632720&responseGroup=detail

export const channelInfoData = {
  'meta': {
    'status': 200
  },
  'data': [
    {
      'id': 2632720,
      'name': 'dアニメストア ニコニコ支店',
      'description': '「ｄアニメストア ニコニコ支店」は1,500以上のアニメ作品が月額432円（税込）の定額で見放題！\r\nテレビで放送中の最新のアニメから定番アニメまで幅広い作品をコメントつきで楽しめます。',
      'isFree': false,
      'screenName': 'danime',
      'ownerName': '株式会社NTTドコモ',
      'price': 432,
      'bodyPrice': 400,
      'url': 'https://ch.nicovideo.jp/danime',
      'thumbnailUrl': 'https://secure-dcdn.cdn.nimg.jp/comch/channel-icon/128x128/ch2632720.jpg?1561107667',
      'thumbnailSmallUrl': 'https://secure-dcdn.cdn.nimg.jp/comch/channel-icon/64x64/ch2632720.jpg?1561107667',
      'canAdmit': true,
      'isAdult': false,
      'detail': {
        'tags': [
          {
            'text': 'dアニメストア'
          },
          {
            'text': 'アニメ'
          },
          {
            'text': 'ドコモ'
          },
          {
            'text': 'ニコニコ支店'
          }
        ],
        'category': {
          'categoryId': 7,
          'categoryName': 'アニメ',
          'categoryTopPageUrl': 'https://ch.nicovideo.jp/portal/anime'
        }
      }
    }
  ]
};