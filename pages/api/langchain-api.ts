import { BingSerpAPI } from 'langchain/tools';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { CallbackManager } from 'langchain/callbacks';
import { AgentExecutor, ZeroShotAgent } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ChatBody } from '@/types/chat';
import { NextRequest, NextResponse } from 'next/server';
import { DynamicTool } from 'langchain/tools';
import { create, all } from 'mathjs';

export const config = {
  runtime: 'edge',
};

const calculator = new DynamicTool({
  name: 'calculator',
  description:
    'Useful for getting the result of a math expression. The input to this tool should ONLY be a valid mathematical expression that could be executed by a simple calculator.',
  func: (input) => {
    const math = create(all, {});

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
      if (
        action.returnValues.output.includes(
          'Agent stopped due to max iterations.',
        )
      ) {
        await writeToStream(
          'Sorry, I ran out of time to think (TnT) Please try again with a more detailed question.',
        );
      } else {
        await writeToStream(action.returnValues.output);
      }
      await writeToStream('[DONE]');
      console.log('Done');
      writer.close();
    },
    handleChainEnd: async (outputs) => {
      console.log('handleChainEnd', outputs);
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
      // This is a hack to get the output from the LLM
      if (err.message.includes('Could not parse LLM output: ')) {
        const output = err.message.split('Could not parse LLM output: ')[1];
        await writeToStream(`${output} \n\n`);
      } else {
        await writeToStream(
          `Sorry, I am not able to answer your question. \n\n`,
        );
        console.log('Chain Error: ', err.message);
        console.error(err, verbose);
      }
      await writer.abort(err);
    },
    handleToolError: async (err, verbose) => {
      console.log('Tool Error: ', err.message);
      console.error(err, verbose);
    },
  });

  const model = new ChatOpenAI({
    temperature: 0,
    callbackManager,
    openAIApiKey: process.env.OPENAI_API_KEY,
    streaming: false,
  });

  const tools = [new BingSerpAPI(), calculator];

  const prompt = ZeroShotAgent.createPrompt(tools, {
    prefix: `You are an AI language model named Chat Everywhere, designed to answer user questions as accurately and helpfully as possible. Make sure to generate responses in the exact same language as the user's query. Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. Additionally, format all responses using Markdown syntax, regardless of the input format.
      
      Your previous conversations with the user is as follows from oldest to latest, and you can use this information to answer the user's question if needed:
      ${requestBody.messages
        .map((message, index) => {
          return `${index + 1}) ${
            message.role === 'assistant' ? 'You' : 'User'
          } ${normalizeTextAnswer(message.content)}`;
        })
        .join('\n')}

      The current date and time is ${new Date().toLocaleString()}.
      
      Make sure you include the reference links to the websites you used to answer the user's question in your response using Markdown syntax. You MUST use the following Markdown syntax to include a link in your response:
      [Link Text](https://www.example.com)

      Use the following format:

      Question: the input question you must answer
      Thought: you should always think about what to do
      Action: the action to take, should be one of ['bing-search', 'calculator']
      Action Input: the input to the action
      Observation: the result of the action
      ... (this Thought/Action/Action Input/Observation can repeat N times)
      Thought: I now know the final answer
      Final Answer: the final answer to the original input question
    `,
  });

  const llmChain = new LLMChain({
    llm: model,
    prompt: prompt,
  });

  const agent = new ZeroShotAgent({
    llmChain,
    allowedTools: ['bing-search', 'calculator'],
  });

  const agentExecutor = AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    callbackManager,
  });

  try {
    agentExecutor
      .call({
        input: latestUserPrompt,
      })

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

const normalizeTextAnswer = (text: string) => {
  const mindlogRegex = /```Mindlog \n(.|\n)*```/g;
  return text.replace(mindlogRegex, '');
};

export default handler;
