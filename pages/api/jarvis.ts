import { JarvisAIStream } from '@/utils/server';

import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages } = (await req.json()) as ChatBody;
    const stream = await JarvisAIStream(
      messages[messages.length - 1]?.content || '',
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
