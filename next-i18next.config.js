module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: [
      "bn",
      "de",
      "en",
      "es",
      "fr",
      "he",
      "id",
      "ja",
      "ko",
      "pt",
      "ru",
      "sv",
      "te",
      "vi",
      "zh",
      "ar",
      "zh-TW",
    ],
  },
  localePath:
    typeof window === 'undefined'
      ? require('path').resolve('./public/locales')
      : '/public/locales',
};
