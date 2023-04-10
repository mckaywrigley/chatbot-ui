import * as dotenv from 'dotenv';
import { Serper, Calculator } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain';
import express from 'express';
import { Readable } from 'stream';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/langchain-chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const tokenStream = new Readable({
    read() {},
  });

  const callbackManager = await CallbackManager.fromHandlers({
    async handleLLMNewToken(token: string) {
      tokenStream.push(`data: ${JSON.stringify({ token })}\n\n`);
    },
    async handleAgentAction(action) {
      console.log('handleAgentAction', action);
    },
  });

  const model = new ChatOpenAI({
    temperature: 0,
    callbackManager,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
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

  const result = await agentExecutor.call({
    input:
      "What's the distance between Moon and Mars? and how long would it take to travel there in 0.5 light speed?",
  });

  console.log(`Got output: ${result.output}`);
  tokenStream.pipe(res);

  req.on('close', () => {
    tokenStream.destroy();
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
