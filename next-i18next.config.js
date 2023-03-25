module.exports = {
  i18n: {
    defaultLocale: "te",
    locales: ["de", "en", "fr", "ru", "zh", "es", "sv", "te"],
  },
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/public/locales",
};
