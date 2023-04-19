module.exports = {
  i18n: {
    defaultLocale: 'en',
    localeDetection: true,
    locales: [
      "bn",
      "de",
      "en",
      "es",
      "fr",
      "he",
      "id",
      "it",
      "ja",
      "ko",
      "pl",
      "pt",
      "ru",
      "ro",      
      "sv",
      "te",
      "vi",
      "ar",
      "zh", // even tho this is not a valid locale, it is needed for the fallback
      "zh-Hant",
      "zh-Hans",
    ],
  },
  localePath:
    typeof window === 'undefined'
      ? require('path').resolve('./public/locales')
      : '/public/locales',
};
