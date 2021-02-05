import {VideoList} from './VideoListView';
import {VideoListItem} from './VideoListItem';
import {RecommendAPILoader} from '../../../lib/src/nico/RecommendAPILoader';
//===BEGIN===

class RelatedVideoList extends VideoList {
  update(listData, watchId) {
    if (!this.view) {
      this._initializeView();
    }
    this._watchId = watchId;
    const items = listData
      .filter(itemData => itemData.id).map(itemData => new VideoListItem(itemData));
    if (!items.length) {
      return;
    }
    this.model.insertItem(items);
    this.view.scrollTop(0);
  }
  async fetchRecommend(videoId, watchId = null, videoInfo = null) {
    const relatedVideo = [];
    watchId = watchId || videoId;
    videoInfo && relatedVideo.push(VideoListItem.createByVideoInfoModel(videoInfo).serialize());
    const data = await RecommendAPILoader.load({videoId}).catch(() => ({}));
    const items = data.items || [];
    for (const item of items) {
      if (item.contentType && item.contentType !== 'video') {
        continue;
      }
      const content = item.content;
      relatedVideo.push({
        _format: 'recommendApi',
        _data: item,
        id: item.id,
        title: content.title,
        length_seconds: content.duration,
        num_res: content.count.comment,
        mylist_counter: content.count.mylist,
        view_counter: content.count.view,
        thumbnail_url: content.thumbnail.url,
        first_retrieve: content.registeredAt,
        has_data: true,
        is_translated: false
      });
    }
    this.update(relatedVideo, videoId);
  }
}

//===END===

export {RelatedVideoList};