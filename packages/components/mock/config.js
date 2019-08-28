
const config = {
  setValue: function(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  getValue: function(key, value) {
    return JSON.parse(sessionStorage.getItem(key));
  }

};


export {config};