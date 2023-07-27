
export const runPlugin = async () => {
  return "Hello World!";
}

export default {
  id: 'news',
  name: 'News',
  description: 'Provides news based on location.',
  parameters: {
  },
  run: runPlugin
};