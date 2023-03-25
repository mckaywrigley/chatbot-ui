module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["de", "en", "fr", "ru", "zh", "es"],
  },
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/public/locales",
};
