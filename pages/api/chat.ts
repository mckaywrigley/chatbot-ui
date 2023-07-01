import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { BitapaiConversation, BitapaiError } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages, key, prompt, model } = (await req.json()) as ChatBody;

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      messagesToSend = [message, ...messagesToSend];
    }

    let response;

    switch (model) {
      case 'BITAPAI':
        response = await BitapaiConversation(key, messagesToSend, promptToSend);
        break;
      default:
        throw new Error(`${model} Model not implemented`);
    }

    return new Response(response);
  } catch (error) {
    console.error(error);
    if (error instanceof BitapaiError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
