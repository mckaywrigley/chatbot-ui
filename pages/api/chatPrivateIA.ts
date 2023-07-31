import { ChatBody } from "@/types/chat";
import { OpenAIError } from "@/utils/server";

export const config = {
  runtime: 'edge',
};

const paramDefaults = {
  stream: true,
  n_predict: 500,
  temperature: 0.2,
  stop: ["</s>", "user:", "ChatGPT:"],
  repeat_last_n: 256,
  repeat_penalty: 1.18,
  top_k: 40,
  top_p: 0.5,
  tfs_z: 1,
  typical_p: 1,
  presence_penalty: 0,
  frequency_penalty: 0,
  mirostat: 0,
  mirostat_tau: 5,
  mirostat_eta: 0.1,
};

let generation_settings = null;

const handler = async (req: Request)/*: Promise<Response>*/ => {
  try {
    const { model, messages, key, prompt, temperature } = (await req.json()) as ChatBody;

    let controller;

    if (!controller) {
      controller = new AbortController();
    }

    // merge prompt and messages
    let mergedPrompt = `${prompt}\n\n${messages.map((m: { role: string, content: string }, index) => `${m.role}: ${m.content}`).join('\n')}`;

    const completionParams = { ...paramDefaults, temperature, prompt: mergedPrompt };

    const response = await fetch(`${process.env.PRIVATE_IA_URL}/completion`, {
      method: 'POST',
      body: JSON.stringify(completionParams),
      headers: {
        'Connection': 'keep-alive',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      signal: controller.signal,
    });

    const reader = response?.body?.getReader();
    const decoder = new TextDecoder();

    let content = "";

    // try {
    let cont = true;

    while (cont) {
      const result = await reader?.read();
      if (result?.done) {
        break;
      }

      if (result === undefined) {
        continue;
      }

      // sse answers in the form multiple lines of: value\n with data always present as a key. in our case we
      // mainly care about the data: key here, which we expect as json
      const text = decoder.decode(result.value);

      // parse all sse events and add them to result
      const regex = /^(\S+):\s(.*)$/gm;
      // @ts-ignore
      for (const match of text.matchAll(regex)) {
        (result as any)[match[1]] = match[2]
      }

      // since we know this is llama.cpp, let's just decode the json in data
      // @ts-ignore
      result.data = JSON.parse(result.data);
      // @ts-ignore
      content += result.data.content;
      console.log('content', content)

      // // yield
      // yield result;

      // if we got a stop token from server, we will break here
      // @ts-ignore
      // if (result.data.stop) {
      //   // @ts-ignore
      //   if (result.data.generation_settings) {
      //     // @ts-ignore
      //     generation_settings = result.data.generation_settings;
      //   }
      //   break;
      // }
    }
    // } catch (e: any) {
    //   if (e.name !== 'AbortError') {
    //     console.error("llama error: ", e);
    //   }
    //   throw e;
    // }
    // finally {
    //   controller.abort();
    // }

    return new Response(content);

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
