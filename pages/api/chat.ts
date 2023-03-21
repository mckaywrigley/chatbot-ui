import { Message, OpenAIModel, OpenAIModelID } from "@/types";
import { OpenAIStream } from "@/utils/server";
import tiktokenModel from "@dqbd/tiktoken/encoders/cl100k_base.json";
import { init, Tiktoken } from "@dqbd/tiktoken/lite/init";
// @ts-expect-error
import wasm from "../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key } = (await req.json()) as {
      model: OpenAIModel;
      messages: Message[];
      key: string;
    };

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(tiktokenModel.bpe_ranks, tiktokenModel.special_tokens, tiktokenModel.pat_str);

    const tokenLimit = model.id === OpenAIModelID.GPT_4 ? 6000 : 3000;
    let tokenCount = 0;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length > tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();

    const stream = await OpenAIStream(model, key, messagesToSend);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
