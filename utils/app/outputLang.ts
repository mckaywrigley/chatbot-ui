

enum Lang {
    bn = 'bn',
    de = 'de',
    en = 'en',
    es = 'es',
    fr = 'fr',
    he = 'he',
    id = 'id',
    it = 'it',
    ja = 'ja',
    ko = 'ko',
    pl = 'pl',
    pt = 'pt',
    ru = 'ru',
    ro = 'ro',
    sv = 'sv',
    te = 'te',
    vi = 'vi',
    ar = 'ar',
    zh = 'zh',
    zhHant = 'zh-Hant',
    zhHans = 'zh-Hans',
}
    

export const saveOutputLang = (lang: Lang) => {
  localStorage.setItem('outputLang', JSON.stringify(lang));
};
