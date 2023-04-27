import { i18n } from '../../next.config.js';

function getAvailableLocales() {
  return i18n!.locales;
}

export { getAvailableLocales };