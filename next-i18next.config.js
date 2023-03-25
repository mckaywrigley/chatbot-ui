const path = require("path");

module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["de", "en", "fr", "ru", "zh"],
  },
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/public/locales",
};
