import {netUtil} from '../infra/netUtil';

//===BEGIN===
const MatrixRankingLoader = {
  load: async () => {
    const htmlText = await netUtil.fetch(
      'https://www.nicovideo.jp/ranking', {cledentials: 'include'}
      ).then(r => r.text());
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    return JSON.parse(doc.getElementById('MatrixRanking-app').dataset.app);
  }
};

//===END===

export {MatrixRankingLoader};