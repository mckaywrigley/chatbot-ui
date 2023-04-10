import { LLMChain } from "langchain";
import { AgentExecutor, ZeroShotAgent } from "langchain/agents";
import { CallbackManager } from "langchain/callbacks";
import { ChatOpenAI } from "langchain/chat_models";
import { SerpAPI, Calculator } from "langchain/tools";
import { ChatBody, Message } from '@/types/chat';
import { OpenAIError } from '@/utils/server';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt } = (await req.json()) as ChatBody;

    let messagesToSend: Message[] = [];

    const callbackManager = CallbackManager.fromHandlers({
      async handleLLMNewToken(token: string) {
        console.log("token", { token });
      },
    });

    const llmModel = new ChatOpenAI({
      temperature: 0,
      callbackManager,
      streaming: true,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const tools = [
      new SerpAPI(),
      new Calculator(),
    ];

    const agentPrompt = ZeroShotAgent.createPrompt(tools);
    const llmChain = new LLMChain({
      llm: llmModel,
      prompt: agentPrompt,
      callbackManager,
    });

    const agent = new ZeroShotAgent({
      llmChain,
      allowedTools: ["search"],
    });

    const agentExecutor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      callbackManager,
    });

    const result = await agentExecutor.call({
      input: prompt,
    });

    return new Response(JSON.stringify(result));
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
