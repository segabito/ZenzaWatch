import {NicoChatInitFunc} from './NicoChat';
import {NicoTextParserInitFunc} from './NicoTextParser';
import {workerUtil} from '../../../lib/src/infra/workerUtil';
//===BEGIN===
const NicoChatParseWorker = (() => {
  const _func = function(self) {
    const NicoTextParser = NicoTextParserInitFunc();
    const NicoChat = NicoChatInitFunc();

    const parse = (chatsData = [], options = {}) => {
      let nicoChats = [];
      const nicoscripts = [];
      const videoDuration = parseInt(options.duration || 0x7FFFFF);
      const mainThreadId = options.mainThreadId || 0;
      const maxCommentsByDuration = options.maxCommentsByDuration || 1000;
      const MAX_COMMENT = options.MAX_COMMENT || 5000;

      const create = options.format !== 'xml' ? NicoChat.create : NicoChat.createFromChatElement;
      for (let i = 0, len = Math.min(chatsData.length, MAX_COMMENT); i < len; i++) {
        const nicoChat = create(chatsData[i], {videoDuration, mainThreadId});
        if (nicoChat.isDeleted) {
          continue;
        }

        if (nicoChat.isNicoScript) {
          nicoscripts.push(nicoChat);
        }
        nicoChats.push(nicoChat);
      }
      nicoChats = []
        .concat(...
          nicoChats.filter(c => c.isPatissier && c.fork < 1 && c.isSubThread)
            .splice(maxCommentsByDuration))
        .concat(...
          nicoChats.filter(c => c.isPatissier && c.fork < 1 && !c.isSubThread)
            .splice(maxCommentsByDuration))
        .concat(...nicoChats.filter(c => !c.isPatissier || c.fork > 0));

      nicoChats.forEach(nicoChat => {
        const htmlText = nicoChat.commentVer === 'html5' ?
          NicoTextParser.likeHTML5(nicoChat.text) :
          NicoTextParser.likeXP(nicoChat.text);
        nicoChat.htmlText = htmlText;
      });

      return {
        nicoChats,
        nicoscripts
      };
    };

    self.onmessage = async ({command, params}) => {
      let result;
      console.time(`NicoChatParseWorker.${command}`);
        switch (command) {
          case 'parse':
            result = parse(params);
            break;
        }
      console.timeEnd(`NicoChatParseWorker.${command}`);
      return result;
    };
  };
  const func = `
  function(self) {
    ${NicoTextParserInitFunc.toString()}
    ${NicoChatInitFunc.toString()}
    (${_func.toString()})(self);
  }
  `;

  let worker;

  // const videoDuration;
  // const mainThreadId;
  // const maxCommentsByDuration;
  // const MAX_COMMENT;
  // const format
  const parse = async (chatsData, options = {}) => {
    worker = worker || workerUtil.createCrossMessageWorker(func);
    return worker.post({command: 'parse', params: {chatsData, options}});
  };

  return {parse};
});
//===END===
export {NicoChatParseWorker};