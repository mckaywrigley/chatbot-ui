import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIFunctionCall } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import { PluginApiOperationList, getPluginApiOperationsFromUrl, getOpenAIFunctionFromPluginApiOperation } from '@/types/plugin';
import { OpenAIFunctionList } from '@/types/openai';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature, pluginUrlList=[] } =
      (await req.json()) as ChatBody;

    let functions: OpenAIFunctionList = {};
    let operations: PluginApiOperationList = {};

    for (const pluginUrl of pluginUrlList) {
      const ops = await getPluginApiOperationsFromUrl(pluginUrl);
      operations = { ...operations, ...ops } as PluginApiOperationList;
    }

    for (const key in operations) {
      if (operations.hasOwnProperty(key)) {
        const operation = operations[key];
        const func = getOpenAIFunctionFromPluginApiOperation(operation);
        functions[operation.operationId] = func;
      }
    }

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

    const stream = await OpenAIFunctionCall(
      model,
      promptToSend,
      temperatureToUse,
      key,
      messagesToSend,
      functions,
      operations,
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
