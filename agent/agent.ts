import { ReactAgentResult, ToolActionResult } from '@/types/agent';

import { tools } from '@/agent/tools';
import { LLMChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';

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
{agent_scratchpad}
`;

export const executeReactAgent = async (
  input: string,
  toolActionResult?: ToolActionResult,
): Promise<ReactAgentResult> => {
  const model: OpenAI = new OpenAI({ temperature: 0 });
  const prompt: PromptTemplate = PromptTemplate.fromTemplate(
    PREFIX + PROMPT + SUFFIX,
  );
  const chainA: LLMChain = new LLMChain({ llm: model, prompt });

  let agentScratchpad = '';
  if (toolActionResult) {
    agentScratchpad = `
\nThought: Do I need to use a tool? Yes
Action:${toolActionResult.action.tool}
Action Input: ${toolActionResult.action.toolInput}
Observation: ${toolActionResult.result}

Thought:
    `;
  }

  const toolDescriptions = tools
    .map((tool) => tool.name + ': ' + tool.description)
    .join('\n');
  const toolNames = tools.map((tool) => tool.name).join(',');
  const result = await chainA.call({
    tool_descriptions: toolDescriptions,
    tool_names: toolNames,
    input,
    agent_scratchpad: agentScratchpad,
  });
  return _parseResult(result.text);
};

const _parseResult = (result: string): ReactAgentResult => {
  const matchAction = result.match(/Action: (.*)/);
  if (matchAction) {
    const action = matchAction[1];
    const matchActionInput = result.match(/Action Input: (.*)/);
    const actionInput = matchActionInput ? (matchActionInput[1] as string) : '';
    return {
      type: 'action',
      tool: action,
      toolInput: actionInput,
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
