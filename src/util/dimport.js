
//===BEGIN===
const dimport = url => {
  const now = Date.now();
  const callbackName = `dimport_${now}`;
  const loader = `
    import * as module${now} from "${url}";
    window.${callbackName}(module${now});
    `.trim();
  return new Promise((res) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.appendChild(document.createTextNode(loader));
    s.dataset.import = url;
    window[callbackName] = (module) => {
      res(module);
      delete window[callbackName];
    };
    document.head.appendChild(s);
  });
};

//===END===

export {dimport};
