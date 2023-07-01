export const getPlugins = () => {
  const plugins = localStorage.getItem('plugins');
  if (!plugins) return null;
  return JSON.parse(localStorage.getItem('plugins') as string);
};

const hasSuffix = (url: string) => {
  const regex = /.*\/\.well-known\/ai-plugin\.json$/;
  return regex.test(url);
};
export const getPluginUrl = (url: string) => {
  const pluginUrl = url.trim();
  const testResult = hasSuffix(pluginUrl);
  if (!testResult) {
    if (pluginUrl.endsWith('/')) {
      return pluginUrl + '.well-known/ai-plugin.json';
    } else {
      return pluginUrl + '/.well-known/ai-plugin.json';
    }
  }
  return pluginUrl;
};
