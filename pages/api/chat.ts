import { ChatBody } from '@/types';
import { getStream } from '@/utils/server';
// @ts-ignore
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request) => {
  try {
    const { model, messages, key, prompt } = (await req.json()) as ChatBody;
    const stream = await getStream({ model, messages, prompt, key, wasm });
    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
