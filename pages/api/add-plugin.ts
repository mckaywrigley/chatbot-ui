import { getPluginUrl } from '@/utils/app/plugins';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request) => {
  try {
    const { url } = (await req.json()) as { url: string };
    const pluginUrl = getPluginUrl(url);
    const response = await fetch(pluginUrl, { method: 'GET' });
    if (!response.ok) {
      throw new Error('Not found');
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
};

export default handler;
