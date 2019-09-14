//===BEGIN===
class speech {
  static async speak(text, option = {}) {
    if (!window.speechSynthesis) {
      return Promise.resolve();
    }
    const msg = new window.SpeechSynthesisUtterance();

    ['lang', 'pitch', 'rate', 'voice', 'volume'].forEach(prop => {
      option.hasOwnProperty(prop) && (msg[prop] = option[prop]);
    });

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    } else {
      await this.promise;
    }

    return this.promise = new Promise(res => {
      msg.addEventListener('end', res, {once: true});
      msg.addEventListener('error', res, {once: true});
      msg.text = text;
      window.speechSynthesis.speak(msg);
    });
  }
  static voices(lang) {
    if (!window.speechSynthesis) {
      return [];
    }
    this._voices = this._voices || window.speechSynthesis.getVoices();
    return lang ? this._voices.filter(v => v.lang === lang) : this._voices;
  }
}
speech.promise = Promise.resolve();
//===END===

export {speech};