import {textUtil} from '../text/textUtil';
import {netUtil} from '../infra/netUtil';
import {MylistApiLoader} from './MylistApiLoader';
import {RecommendAPILoader} from './RecommendAPILoader';
import {NicoRssLoader} from './NicoRssLoader';
import {NicoSearchApiV2Loader} from './VideoSearch';

//===BEGIN===

const ItemDataConverter = {
  makeSortText: text => {
    return textUtil.convertKansuEi(text)
      .replace(/([0-9]{1,9})/g, m => m.padStart(10, '0')).replace(/([０-９]{1,9})/g, m => m.padStart(10, '０'));
  },
  fromFlapiMylistItem: (data) => {
    const isChannel = data.id.startsWith('so');
    const isMymemory = /^[0-9]+$/.test(data.id);
    const thumbnail =
      data.is_middle_thumbnail ?
        `${data.thumbnail_url}.M` : data.thumbnail_url;
    return {
      watchId: data.id,
      videoId: data.id,
      title: data.title,
      duration: data.length_seconds * 1,
      commentCount: data.num_res * 1,
      mylistCount: data.mylist_counter * 1,
      viewCount: data.view_counter * 1,
      thumbnail,
      postedAt: new Date(data.first_retrieve.replace(/-/g, '/')).toISOString(),
      createdAt: new Date(data.create_time * 1000).toISOString(),
      updatedAt: new Date(data.thread_update_time.replace(/-/g, '/')).toISOString(),
      isChannel,
      isMymemory,
      mylistComment: data.mylist_comment || '',
      _sortTitle: ItemDataConverter.makeSortText(data.title),
    };
  },
  fromDeflistItem: (item) => {
    const data = item.item_data;
    const isChannel = data.video_id.startsWith('so');
    const isMymemory = !isChannel && /^[0-9]+$/.test(data.watch_id);
    return {
      watchId: isChannel ? data.video_id : data.watch_id,
      videoId: data.video_id,
      title: data.title,
      duration: data.length_seconds * 1,
      commentCount: data.num_res * 1,
      mylistCount: data.mylist_counter * 1,
      viewCount: data.view_counter * 1,
      thumbnail: data.thumbnail_url,
      postedAt: new Date(data.first_retrieve * 1000).toISOString(),
      createdAt: new Date(item.create_time * 1000).toISOString(),
      updatedAt: new Date(data.update_time * 1000).toISOString(),
      isChannel,
      isMymemory,
      mylistComment: item.description || '',
      _sortTitle: ItemDataConverter.makeSortText(data.title),
    };
  },
  fromUploadedVideo: data => {
    const isChannel = data.id.startsWith('so');
    const isMymemory = /^[0-9]+$/.test(data.id);
    const thumbnail =
      data.is_middle_thumbnail ?
        `${data.thumbnail_url}.M` : data.thumbnail_url;
    const [min, sec] = data.length.split(':');
    const postedAt = new Date(data.first_retrieve.replace(/-/g, '/')).toISOString();
    return {
      watchId: data.id,
      videoId: data.id,
      title: data.title,
      duration: min * 60 + sec * 1,
      commentCount: data.num_res * 1,
      mylistCount: data.mylist_counter * 1,
      viewCount: data.view_counter * 1,
      thumbnail,
      postedAt,
      createdAt: postedAt,
      updatedAt: postedAt,
      _sortTitle: ItemDataConverter.makeSortText(data.title),
    };
  },
  fromSearchApiV2: data => {
    const isChannel = data.id.startsWith('so');
    const isMymemory = /^[0-9]+$/.test(data.id);
    const thumbnail =
      data.is_middle_thumbnail ?
        `${data.thumbnail_url}.M` : data.thumbnail_url;
    const postedAt = new Date(data.first_retrieve.replace(/-/g, '/')).toISOString();
    return {
      watchId: data.id,
      videoId: data.id,
      title: data.title,
      duration: data.length_seconds,
      commentCount: data.num_res * 1,
      mylistCount: data.mylist_counter * 1,
      viewCount: data.view_counter * 1,
      thumbnail,
      postedAt,
      createdAt: postedAt,
      updatedAt: postedAt,
      isChannel,
      isMymemory,
      _sortTitle: ItemDataConverter.makeSortText(data.title),
    };
  }
};

class NicoQuery {
  static parse(query) {
    if (query instanceof NicoQuery) {
      return query;
    }
    const [type, vars] = query.split('/');
    let [id, p] = (vars || '').split('?');
    id = decodeURIComponent(id || '');
    const params = textUtil.parseQuery(p || '');
    Object.keys(params).forEach(key => {
      try { params[key] = JSON.parse(params[key]);} catch(e) {}
    });
    return {
      type,
      id,
      params
    };
  }

  static build(type, id, params) {
    const p = Object.keys(params)
    .sort()
    .filter(key => !!params[key] && key !== 'title')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(params[key]))}`);
    // .map(key => `${encodeURIComponent(key)}=${
    //   typeof params[key] === 'string' ?
    //     encodeURIComponent(`"${escape(params[key])}"`) :
    //     encodeURIComponent(params[key])
    // }`);
    if (params.title) {
      p.push(`title=${encodeURIComponent(params.title)}`);
    }
    return `${type}/${encodeURIComponent(id)}?${p.join('&')}`;
  }

  static async fetch(query) {
    if (typeof query === 'string') {
      query = new NicoQuery(query);
    }

    const {type, id, params} = query;
    // self.console.info('NicoQ.query', JSON.stringify(query), query, query.toString());
    const _req = {
      query: query.toString(),
      type,
      id,
      params,
    };
    let result;
    switch (type) {
      case 'mylist':
        _req.url = `https://flapi.nicovideo.jp/api/watch/mylistvideo?id=${id}`;
        break;
      case 'user':
        _req.url = `https://flapi.nicovideo.jp/api/watch/uploadedvideo?user_id=${id}`;
        break;
      case 'mymylist':
        _req.url = `https://www.nicovideo.jp/api/mylist/list?group_id=${id}`;
        break;
      case 'deflist':
        _req.url = 'https://www.nicovideo.jp/api/deflist/list';
        break;
      case 'nicorepo':
        _req.url = 'https://www.nicovideo.jp/api/nicorepo/timeline/my/all?attribute_filter=upload&object_filter=video&client_app=pc_myrepo';
        break;
      case 'mylistlist':
        return Object.assign(
          await MylistApiLoader.getMylistList(),
          {_req}
        );
      case 'series':
        return Object.assign(
          await RecommendAPILoader.loadSeries(id, {}),
          {_req}
        );
      case 'ranking':
        return Object.assign(
          await NicoRssLoader.loadRanking({genre: id || 'all'}),
          {_req}
        );
      case 'channel':
        _req.url = `https://ch.nicovideo.jp/${id}/video?rss=2.0`;
        return Object.assign(
          await NicoRssLoader.load(_req.url),
          {_req}
        );
      case 'tag':
      case 'search':
        return Object.assign(
          await NicoSearchApiV2Loader.searchMore(id, query.searchParams),
          {_req}
        );
      default:
          throw new Error('unknown query: ' + query);
    }
    result = await netUtil.fetch(_req.url, {credentials: 'include'})
      .then(res => res.json());
    return Object.assign(result, {_req});
  }

  constructor(arg) {
    if (typeof arg === 'string') {
      arg = NicoQuery.parse(arg);
    }
    const {type, id, params} = arg;
    this.type = type;
    this.id = id || '';
    this.params = Object.assign({}, params || {});
  }

  toString() {
    // const {type, id, params} = this;
    return NicoQuery.build(this.type, this.id, this.params);
  }

  get title() {
    if(this.params.title) {
      return this.params.title;
    }
    const {type, id} = this;
    switch(type) {
      case 'tag':
        return `タグ検索 「${this.searchWord}」`;
      case 'search':
        return `キーワード検索 「${this.searchWord}」`;
      case 'user':
        return `投稿動画一覧 user/${id}`;
      case 'deflist':
        return 'とりあえずマイリスト';
      case 'nicorepo':
        return 'ニコレポ新着動画';
      case 'mylist':
      case 'mymylist':
        return `マイリスト mylist/${id}`;
      case 'series':
        return `シリーズ series/${id}`;
      case 'ranking':
        return `ランキング ranking/${id || 'all'}`;
      case '':
        return `チャンネル動画 channel/${id}`;
      default:
        return '';
    }
  }

  set title(v) {
    this.params.title = v;
  }

  get baseString() {
    return NicoQuery.build(this.type, this.id, this.baseParams);
  }

  get string() {
    return this.toString();
  }

  get baseParams() {
    const params = Object.assign({}, this.params);
    delete params.title;
    return params;
  }

  get isSearch() {
    return this.type === 'search' || this.type === 'tag';
  }

  get isSearchReady() {
    return this.isSearch && this.searchWord;
  }

  get searchWord() {
    return (this.id || '').trim();
  }

  get isOwnerFilterEnable() {
    return this.params.ownerFilter || this.params.userId || this.params.chanelId;
  }

  set isOwnerFilterEnable(v) {
    this.params.userId = this.params.chanelId = null;
    if (v) {
      this.params.ownerFilter = true;
    } else {
      this.params.ownerFilter = false;
    }
  }

  get searchParams() {
    const {type, params} = this;
    return {
      searchType: type,
      order: (params.sort || '').charAt(0) === '-' ? 'd' : 'a',
      sort: (params.sort || '').substring(1),
      userId: this.isOwnerFilterEnable && params.userId || null,
      channelId: this.isOwnerFilterEnable && params.channelId || null,
      dateFrom: params.start || null,
      dateTo: params.end || null,
      commentCount: params.commentCount || null,
      f_range: params.fRange || null,
      l_range: params.lRange || null
    };
  }

  nearlyEquals(query) {
    if (typeof query === 'string') {
      query = new NicoQuery(query);
    }
    return this.baseString === query.baseString;
  }

  equals(query) {
    if (typeof query === 'string') {
      query = new NicoQuery(query);
    }
    return this.toString() === query.toString();
  }
}


//===END===

export {NicoQuery, ItemDataConverter};