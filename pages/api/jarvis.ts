import { JarvisAIStream } from '@/utils/server';

import { ChatBody } from '@/types/chat';

import { last } from 'lodash';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages } = (await req.json()) as ChatBody;
    const stream = await JarvisAIStream(last(messages)?.content || '');

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
