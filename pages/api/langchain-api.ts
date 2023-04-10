import { Serper } from 'langchain/tools';
import { Calculator } from "langchain/tools/calculator";
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ChatBody } from "@/types/chat";
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: "edge"
};

const handler = async (req: NextRequest, res: any) => {
  const requestBody = (await req.json()) as ChatBody;
  
  const latestUserPrompt = requestBody.messages[requestBody.messages.length - 1].content;
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const writeToStream = async (text: string) => {
    await writer.write(encoder.encode(text));
  };

  const callbackManager = CallbackManager.fromHandlers({
    handleChainStart: async () => {
      console.log('handleChainStart');
      await writer.ready;
      await writeToStream("```Mindlog \n");
      await writeToStream("Start thinking ... \n\n");
    },
    handleAgentAction: async (action) => {
      console.log('handleAgentAction', action);
      await writer.ready
      await writeToStream(`${action.log}\n\n`);
      await writeToStream(`--- \n\n`);
    },
    handleAgentEnd: async (action) => {
      console.log('handleAgentEnd', action);
      await writer.ready;
      await writeToStream("``` \n\n");
      await writeToStream(action.returnValues.output);
      await writeToStream("[DONE]");
    },
    handleLLMError: async (e) => {
      await writer.ready;
      await writeToStream("``` \n\n");
      await writeToStream("Sorry, I am not able to answer your question. \n\n");
      await writer.abort(e);
    },
  });

  const model = new ChatOpenAI({
    temperature: 0.2,
    callbackManager,
    openAIApiKey: process.env.OPENAI_API_KEY,
    streaming: true,
  });

  const tools = [new Serper(), new Calculator(true, callbackManager)];

  const agentPrompt = ZeroShotAgent.createPrompt(tools);
  const llmChain = new LLMChain({
    llm: model,
    prompt: agentPrompt,
  });

  const agent = new ZeroShotAgent({
    llmChain,
    allowedTools: ['search'],
  });

  const agentExecutor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    callbackManager,
  });

  try{
    agentExecutor.call({
      input: latestUserPrompt,
    });

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

  }catch(e){
    await writeToStream("Unable to fullfil request");
    writer.abort(e);
    console.log('Request closed');
    console.error(e);
    console.log(typeof e)
  }
};

export default handler;
