const path = require("path");

module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "ru"],
  },
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/public/locales",
};
