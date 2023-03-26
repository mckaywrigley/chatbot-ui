module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: [
      "bn",
      "de",
      "en",
      "es",
      "fr",
      "ja",
      "ko",
      "pt",
      "ru",
      "sv",
      "te",
      "vi",
      "zh",
      "he",
    ],
  },
  localePath:
    typeof window === 'undefined'
      ? require('path').resolve('./public/locales')
      : '/public/locales',
};
