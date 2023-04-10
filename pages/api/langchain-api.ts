import { Serper, Calculator } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain';
import { Readable } from 'stream';
import { ChatBody } from "@/types/chat";
import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
  res.setHeader('Cache-Control', 'no-cache');

  const requestBody = req.body as ChatBody;

  const latestUserPrompt = requestBody.messages[requestBody.messages.length - 1].content;
  
  const tokenStream = new Readable({
    read() {},
  });

  const callbackManager = await CallbackManager.fromHandlers({
    async handleAgentAction(action) {
      console.log('handleAgentAction', action);
      tokenStream.push(`${action.log}\n\n`);
      tokenStream.push(`--- \n\n`);
    },
  });

  const model = new ChatOpenAI({
    temperature: 0,
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
    tokenStream.pipe(res);
    tokenStream.push("```Mindlog \n");
    tokenStream.push("Start thinking ... \n\n");

    const result = await agentExecutor.call({
      input: latestUserPrompt,
    });

    tokenStream.push("```\n");
  
    tokenStream.push(`${result.output} \n\n`);
    tokenStream.push(`[DONE]`);
    tokenStream.destroy();
    console.log('Request closed');

    req.on('close', () => {
      tokenStream.destroy();
      console.log('Request closed');
    });
  }catch(e){
    tokenStream.push("Unable to fullfil request");
    tokenStream.destroy();
    console.log('Request closed');
    console.error(e);
    console.log(typeof e)
  }

  if(tokenStream.closed === true){
    tokenStream.push(`[DONE]`);
    tokenStream.destroy();
  }
};

export default handler;
