import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { getAdminSupabaseClient, getUserProfile } from '@/utils/server/supabase';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

const supabase = getAdminSupabaseClient();

export const config = {
  runtime: 'edge',
};

const unauthorizedResponse = new NextResponse('Unauthorized', { status: 401 });

const handler = async (req: NextRequest): Promise<Response> => {
  
  const userToken = req.headers.get('user-token');

  const { data, error } = await supabase.auth.getUser(userToken || "");
  if (!data || error) return unauthorizedResponse;

  const user = await getUserProfile(data.user.id);
  if (!user || user.plan === 'free') return unauthorizedResponse;

  try {
    const selectedOutputLanguage = req.headers.get('Output-Language')
      ? `{lang=${req.headers.get('Output-Language')}}`
      : '';
    const { model, messages, prompt, temperature } =
      (await req.json()) as ChatBody;

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();

    if (selectedOutputLanguage) {
      messagesToSend[
        messagesToSend.length - 1
      ].content = `${selectedOutputLanguage} ${
        messagesToSend[messagesToSend.length - 1].content
      }`;
    }

    // TODO: SWITCH THIS TO 4
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
