import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { shortenMessagesBaseOnTokenLimit } from '@/utils/server/api';
import {
  addUsageEntry,
  getAdminSupabaseClient,
  getUserProfile,
  hasUserRunOutOfCredits,
  subtractCredit,
} from '@/utils/server/supabase';

import { ChatBody } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { PluginID } from '@/types/plugin';

const supabase = getAdminSupabaseClient();

export const config = {
  runtime: 'edge',
};

const unauthorizedResponse = new Response('Unauthorized', { status: 401 });

const handler = async (req: Request): Promise<Response> => {
  const userToken = req.headers.get('user-token');

  const { data, error } = await supabase.auth.getUser(userToken || '');
  if (!data || error) return unauthorizedResponse;

  const user = await getUserProfile(data.user.id);
  if (!user || user.plan === 'free') return unauthorizedResponse;

  if (await hasUserRunOutOfCredits(data.user.id, PluginID.GPT4)) {
    return new Response('Error', {
      status: 402,
      statusText: 'Ran out of GPT-4 credit',
    });
  }

  try {
    const selectedOutputLanguage = req.headers.get('Output-Language')
      ? `{lang=${req.headers.get('Output-Language')}}`
      : '';

    const { messages, prompt, temperature } = (await req.json()) as ChatBody;

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
      OpenAIModels['gpt-4'].tokenLimit,
    );

    if (selectedOutputLanguage) {
      messagesToSend[
        messagesToSend.length - 1
      ].content = `${selectedOutputLanguage} ${
        messagesToSend[messagesToSend.length - 1].content
      }`;
    }

    addUsageEntry(PluginID.GPT4, data.user.id);
    subtractCredit(data.user.id, PluginID.GPT4);

    // Only enable GPT-4 in production
    const modelToUse =
      process.env.NEXT_PUBLIC_ENV === 'production'
        ? OpenAIModels[OpenAIModelID.GPT_4]
        : OpenAIModels[OpenAIModelID.GPT_3_5];

    const stream = await OpenAIStream(
      modelToUse,
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
