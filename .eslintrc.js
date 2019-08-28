module.exports = {
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  // "parser": "babel-eslint",
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2018
  },
  "rules": {
    "indent": [
      0, //"warn", // "error",
      2,
      {"SwitchCase": 1}
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "always"
    ],
    "no-unused-vars": 1,
    "no-console": 0,
    "no-extra-boolean-cast": 0,
    "no-empty": 1,
    "no-var": 1
  },
  "globals": {
    "_": true,
    "$": true,
    "describe": true,
    "it": true,
    "beforeEach": true
  }
};