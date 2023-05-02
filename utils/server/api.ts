import { Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const shortenMessagesBaseOnTokenLimit = async (
  prompt: string,
  messages: Message[],
  tokenLimit: number,
): Promise<Message[]> => {
  await init((imports) => WebAssembly.instantiate(wasm, imports));
  const encoding = new Tiktoken(
    tiktokenModel.bpe_ranks,
    tiktokenModel.special_tokens,
    tiktokenModel.pat_str,
  );

  const promptTokens = encoding.encode(prompt);

  let tokenCount = promptTokens.length;
  let messagesToSend: Message[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const tokens = encoding.encode(message.content);

    if (tokenCount + tokens.length + 1000 > tokenLimit) {
      break;
    }
    tokenCount += tokens.length;
    messagesToSend = [message, ...messagesToSend];
  }
  
  if(messagesToSend.length === 0) {
    // Shorten the last message if it's too long
    const lastMessage = messages[messages.length - 1];
    let shortenedMessageContent = "";
    for (let i = 0; i < lastMessage.content.length; i++) {
      const char = lastMessage.content[i];
      const tokens = encoding.encode(char);
      if (tokenCount + tokens.length + 1000 > tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      shortenedMessageContent += char;
    }

    encoding.free();
    return [
      {
        ...lastMessage,
        content: shortenedMessageContent,
      }
    ]
  }else{
    encoding.free();
    return messagesToSend;
  }
};
