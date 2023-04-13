import { Serper } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ChatBody } from '@/types/chat';
import { NextRequest, NextResponse } from 'next/server';
import { DynamicTool } from 'langchain/tools';
import { create, all } from 'mathjs'

export const config = {
  runtime: 'edge',
};

const calculator = new DynamicTool({
  name: 'calculator',
  description:
    'Useful for getting the result of a math expression. The input to this tool should ONLY be a valid mathematical expression that could be executed by a simple calculator.',
  func: (input) => {
    const math = create(all, {})

    try {
      const value = math.evaluate(input);
      return value.toString();
    } catch (e) {
      return 'Unable to evaluate expression, please make sure it is a valid mathematical expression with no unit';
    }
  },
});

const handler = async (req: NextRequest, res: any) => {
  const requestBody = (await req.json()) as ChatBody;

  const latestUserPrompt =
    requestBody.messages[requestBody.messages.length - 1].content;

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
      await writeToStream('```Mindlog \n');
      await writeToStream('Thinking ... \n\n');
    },
    handleAgentAction: async (action) => {
      console.log('handleAgentAction', action);
      await writer.ready;
      await writeToStream(`${action.log}\n\n`);
    },
    handleAgentEnd: async (action) => {
      console.log('handleAgentEnd', action);
      await writer.ready;
      await writeToStream('``` \n\n');
      if(action.returnValues.output.includes('Agent stopped due to max iterations.')){
        await writeToStream("Sorry, I ran out of time to think (TnT) Please try again with a more detailed question.");
      }else{
        await writeToStream(action.returnValues.output);
      }
      await writeToStream('[DONE]');
      console.log("Done");
      writer.close();
    },
    handleLLMError: async (e) => {
      await writer.ready;
      await writeToStream('``` \n\n');
      await writeToStream('Sorry, I am not able to answer your question. \n\n');
      await writer.abort(e);
    },
    handleChainError: async (err, verbose) => {
      await writer.ready;
      await writeToStream('``` \n\n');
      await writeToStream(`Sorry, I am not able to answer your question. \n\n`);
      await writer.abort(err);
      console.log("Chain Error");
      console.error(err, verbose);
    }
  });

  const model = new ChatOpenAI({
    temperature: 0.0,
    callbackManager,
    openAIApiKey: process.env.OPENAI_API_KEY,
    streaming: false,
  });

  const tools = [new Serper(), calculator];

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

  try {
    agentExecutor.call({
      input: latestUserPrompt,
    });

    return new NextResponse(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    await writer.ready;
    await writeToStream('``` \n\n');
    await writeToStream('Sorry, I am not able to answer your question. \n\n');
    await writer.abort(e);
    console.log('Request closed');
    console.error(e);
    console.log(typeof e);
  }
};

export default handler;
