export const replaceAtPosition = (str: string, values: string[]) => {
  return str?.replace(/(\{\})/g, () => values?.shift() || '');
};