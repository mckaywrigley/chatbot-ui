import * as dotenv from 'dotenv';
import { Serper, Calculator } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain';
import express from 'express';
import { Readable } from 'stream';
import cors from 'cors';
import { ChatBody } from "@/types/chat";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

const corsOptions = {
  origin: process.env.UI_DOMAIN || 'http://localhost:3000',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}

app.use(cors(corsOptions));
app.use(express.json())

app.post('/langchain-chat', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');

  const requestBody = req.body as ChatBody;
  console.log(requestBody);

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
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
