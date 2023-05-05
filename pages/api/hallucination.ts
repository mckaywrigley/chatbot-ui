import { OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const delay = async (ms: number) => new Promise(res => setTimeout(res, ms));

const handler = async (req: Request): Promise<Response> => {
  try {
    await delay(500)
    return new Response(JSON.stringify({'id': 'halu1', 'message': 'this is hallucination'}), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
