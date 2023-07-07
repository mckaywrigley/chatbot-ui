import { NextResponse } from 'next/server';

import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import {
  BitAPAIConversation,
  BitAPAIError,
  ValidatorEndpointConversation,
  ValidatorEndpointError,
} from '@/utils/server';
import {
  APIError,
  ConversationApi,
} from '@/utils/server/integrations/conversation';

import { ChatBody, Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { messages, key, prompt, api } = (await req.json()) as ChatBody;

    // let promptToSend = prompt;
    // if (!promptToSend) {
    //   promptToSend = DEFAULT_SYSTEM_PROMPT;
    // }

    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      messagesToSend = [message, ...messagesToSend];
    }

    const response = await ConversationApi({
      key,
      messages: messagesToSend,
      systemPrompt: prompt,
      apiId: api,
    });

    // let response;

    // switch (api) {
    //   case 'BITAPAI':
    //     // add Respond using markdown to BitAPAI cause it supports markdown response
    //     response = await BitAPAIConversation(
    //       key,
    //       messagesToSend,
    //       `${promptToSend} Respond using markdown.`,
    //     );
    //     break;
    //   case 'Validator Endpoint':
    //     response = await ValidatorEndpointConversation(
    //       key,
    //       messagesToSend,
    //       promptToSend,
    //     );
    //     break;
    //   default:
    //     throw new Error(`${api} not implemented`);
    // }

    return new Response(response);
  } catch (error) {
    console.error(error);
    if (
      error instanceof APIError
      // error instanceof BitAPAIError ||
      // error instanceof ValidatorEndpointError
    ) {
      return NextResponse.json(
        { type: 'Error', error: error.message },
        {
          status: 500,
        },
      );
    } else {
      return NextResponse.json(
        { type: 'Error', error: 'Unknown error occured' },
        { status: 500 },
      );
    }
  }
};

export default handler;
