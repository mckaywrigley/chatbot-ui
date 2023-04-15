import { initializeAgentExecutor } from 'langchain/agents';
import { LLMChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAI } from 'langchain/llms/openai';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from 'langchain/prompts';
import { Calculator } from 'langchain/tools/calculator';

const PREFIX =
  'Answer the following questions as best you can. You have access to the following tools:';

const PROMPT = `
Assistant is a large language model trained by OpenAI.

Assistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.

Assistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.

Overall, Assistant is a powerful tool that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist.

TOOLS:
------

Assistant has access to the following tools:
{tool_descriptions}


To use a tool, please use the following format:

"""
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
"""

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

"""
Thought: Do I need to use a tool? No
AI: [your response here]
"""
`;
const SUFFIX = `
Begin!

Previous conversation history:
[]

New input: {input}
`;

export type Action = {
  type: 'action';
  action: string;
  actionInput: string;
};
export type Answer = {
  type: 'answer';
  answer: string;
};
export type ReactAgentOutput = Action | Answer;

export const executeReactAgent = async (input: string) => {
  const tools = [new Calculator()];

  const model = new OpenAI({ temperature: 0 });
  const prompt = PromptTemplate.fromTemplate(PREFIX + PROMPT + SUFFIX);
  const chainA = new LLMChain({ llm: model, prompt });
  // TODO: tool
  const result = await chainA.call({
    tool_descriptions: `
Search: useful for when you need to ask with search.
Lookup: useful for when you need to lookup the search result.
`,
    tool_names: 'Search, Calculator',
    input,
  });
  return _parseResult(result.text);
};

const _parseResult = (result: string): ReactAgentOutput => {
  const m1 = result.match(/Action: (.*)/);
  if (m1) {
    const action = m1 ? m1[1] : '';
    const matchActionInput = result.match(/Action Input: (.*)/);
    const actionInput = matchActionInput ? matchActionInput[1] : '';
    return {
      type: 'action',
      action,
      actionInput,
    };
  } else {
    const matchAnswer = result.match(/AI:(.*)/);
    const answer = matchAnswer ? matchAnswer[1] : '';
    return {
      type: 'answer',
      answer,
    };
  }
};
