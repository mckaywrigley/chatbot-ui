


   

export const saveOutputLanguage = (lang:string) => {
  if (!lang || lang === 'default') {
    localStorage.setItem('outputLanguage', '');
    return
  }
  localStorage.setItem('outputLanguage', lang);
};
