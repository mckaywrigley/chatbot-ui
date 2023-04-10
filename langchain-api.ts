import * as dotenv from 'dotenv';
import { Serper, Calculator } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain';
import express from 'express';
import { Readable } from 'stream';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors())

app.post('/langchain-chat', async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');

  const tokenStream = new Readable({
    read() {},
  });

  const callbackManager = await CallbackManager.fromHandlers({
    async handleAgentAction(action) {
      console.log('handleAgentAction', action);
      tokenStream.push(`${action.log}\n\n`);
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
    tokenStream.push("```markdown \n");
    tokenStream.push("Start thinking ... \n\n");

    const result = await agentExecutor.call({
      input:
        "How old is the actor of John Wick? Multiple that by 3",
    });

    tokenStream.push("```\n");
  
    tokenStream.push(`Answer: ${result.output}\n\n`);
    await setTimeout(() => {}, 100); // Wait to send the DONE flag
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
    console.log(e);
    console.log(typeof e);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
