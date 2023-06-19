export const getPlugins = () => {
    const plugins = localStorage.getItem('plugins');
    if (!plugins) return null;
    return JSON.parse(localStorage.getItem('plugins') as string);
};
