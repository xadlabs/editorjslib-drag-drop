module.exports = {
  extends: "airbnb-base",
  plugins: ["jest"],
  rules: {
    "class-methods-use-this": ["off"],
    "no-underscore-dangle": ["error", { allowAfterThis: true }],
    "linebreak-style": ["off"],
    quotes: ["off"],
  },
  env: {
    browser: true,
    "jest/globals": true,
  },
};
