import NAMES from '@/utils/app/names';
import { JarvisAIStream } from '@/utils/server';

import { ChatBody } from '@/types/chat';

import cookie from 'cookie';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  const cookies = cookie.parse(req.headers.get('cookie') || '');
  const jarvisAuthCookie = cookies[NAMES.COOKIES.AUTH] || '';

  try {
    const { id = '', messages } = (await req.json()) as ChatBody;
    const stream = await JarvisAIStream(
      jarvisAuthCookie,
      id,
      messages[messages.length - 1]?.content || '',
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
