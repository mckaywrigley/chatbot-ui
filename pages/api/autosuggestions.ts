import { MinimalChatGPTMessage } from '@copilotkit/react-textarea';

import { OpenAIError, OpenAIStream } from '@/utils/server';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, key, messages, ...forwardedParams } = (await req.json()) as {
      model: OpenAIModel;
      key: string;
      messages: MinimalChatGPTMessage[];
      forwardedParams: { [key: string]: any };
    };

    const systemPrompt =
      messages.find((message) => message.role === 'system')?.content ?? '';
    const nextMessages = messages.filter(
      (message) => message.role !== 'system',
    );

    const stream = await OpenAIStream(
      model,
      systemPrompt,
      0.5,
      key,
      nextMessages as Message[],
      {
        max_tokens: 10, // the default max_tokens for this endpoint, in case it's not specified by callers 
        ...forwardedParams,
      },
    );
    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
