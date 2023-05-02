import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { shortenMessagesBaseOnTokenLimit } from '@/utils/server/api';
import { retrieveUserSessionAndLogUsages } from '@/utils/server/usagesTracking';

import { ChatBody } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  retrieveUserSessionAndLogUsages(req);

  try {
    const selectedOutputLanguage = req.headers.get('Output-Language')
      ? `{lang=${req.headers.get('Output-Language')}}`
      : '';
    const { model, messages, prompt, temperature } =
      (await req.json()) as ChatBody;

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const messagesToSend = await shortenMessagesBaseOnTokenLimit(
      prompt,
      messages,
      model.tokenLimit,
    );

    if (selectedOutputLanguage) {
      messagesToSend[
        messagesToSend.length - 1
      ].content = `${selectedOutputLanguage} ${
        messagesToSend[messagesToSend.length - 1].content
      }`;
    }

    const stream = await OpenAIStream(
      OpenAIModels[OpenAIModelID.GPT_3_5],
      promptToSend,
      temperatureToUse,
      messagesToSend,
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
