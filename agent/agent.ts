import notConversational from './prompts/react';

import { ReactAgentResult, Tool, ToolActionResult } from '@/types/agent';

import conversational from './prompts/conversational';
import { ToolExecutionContext } from './tools/executor';
import { listTools } from './tools/list';

import { createDefaultTools } from '@/agent/tools';
import { CallbackManager, ConsoleCallbackHandler } from 'langchain/callbacks';
import { LLMChain } from 'langchain/chains';
import { LLMResult } from 'langchain/dist/schema';
import { OpenAI, OpenAIChat } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';

const strip = (str: string, c: string) => {
  const m = str.match(new RegExp(`${c}(.*)${c}`));
  if (m) {
    return m[1];
  }
  return str;
};

const stripQuotes = (str: string) => {
  return strip(strip(str, '"'), "'");
};
class _DebugCallbackHandler extends ConsoleCallbackHandler {
  alwaysVerbose: boolean = true;
  async handleLLMStart(
    llm: {
      name: string;
    },
    prompts: string[],
    verbose?: boolean,
  ): Promise<void> {
    console.log('handleLLMStart ============');
    console.log(prompts[0]);
  }
  async handleLLMEnd(output: LLMResult, verbose?: boolean): Promise<void> {
    console.log('handleLLMEnd ==============');
    console.log(output.generations[0][0].text);
  }
  async handleText(text: string, verbose?: boolean): Promise<void> {
    console.log('handleText', text);
  }
}

export const executeReactAgent = async (
  context: ToolExecutionContext,
  enabledToolNames: string[],
  input: string,
  toolActionResults: ToolActionResult[],
  verbose: boolean = false,
): Promise<ReactAgentResult> => {
  const callbackManager = new CallbackManager();
  if (verbose) {
    const handler = new _DebugCallbackHandler();
    callbackManager.addHandler(handler);
  }

  const model: OpenAI = new OpenAI({
    temperature: 0,
    verbose: true,
    callbackManager,
  });
  const prompt: PromptTemplate = PromptTemplate.fromTemplate(
    conversational.prefix +
      '\n\n' +
      conversational.prompt +
      '\n\n' +
      conversational.suffix,
  );
  const llmChain: LLMChain = new LLMChain({
    llm: model,
    prompt,
    verbose: true,
    callbackManager,
  });

  let agentScratchpad = '';
  if (toolActionResults.length > 0) {
    for (const actionResult of toolActionResults) {
      agentScratchpad += `Thought:${actionResult.action.thought}
Action:${actionResult.action.tool}
Action Input: ${actionResult.action.toolInput}
Observation: ${actionResult.result}\n`;
    }
  }
  agentScratchpad += 'Thought:';

  const additionalTools = (await listTools()).filter((tool) =>
    enabledToolNames.includes(tool.nameForModel),
  );
  const tools = [...createDefaultTools(context), ...additionalTools];
  const toolDescriptions = tools
    .map((tool) => tool.nameForModel + ': ' + tool.descriptionForModel)
    .join('\n');
  const toolNames = tools.map((tool) => tool.nameForModel).join(',');
  const result = await llmChain.call({
    tool_descriptions: toolDescriptions,
    tool_names: toolNames,
    input,
    agent_scratchpad: agentScratchpad,
  });
  return _parseResult(tools, result.text);
};

const _parseResult = (tools: Tool[], result: string): ReactAgentResult => {
  const matchThought = result.match(/(.*)\nAction:/);
  let thought = '';
  if (matchThought) {
    thought = matchThought[1] || '';
  }
  const matchAction = result.match(/Action: (.*)/);
  if (thought && matchAction) {
    const actionStr = matchAction[1];
    const matchActionInput = result.match(/Action Input: (.*)/);
    const toolInputStr = matchActionInput
      ? (matchActionInput[1] as string)
      : '';
    const toolInput = stripQuotes(toolInputStr.trim());
    const action = stripQuotes(actionStr.trim());
    const tool = tools.find((tool) => tool.nameForModel === action);
    if (!tool) throw new Error('Tool not found: ' + action);
    return {
      type: 'action',
      thought: thought.trim(),
      tool,
      toolInput,
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

export const executeNotConversationalReactAgent = async (
  context: ToolExecutionContext,
  enabledToolNames: string[],
  input: string,
  toolActionResults: ToolActionResult[],
  verbose: boolean = false,
): Promise<ReactAgentResult> => {
  const callbackManager = new CallbackManager();
  if (verbose) {
    const handler = new _DebugCallbackHandler();
    callbackManager.addHandler(handler);
  }

  const model: OpenAIChat = new OpenAIChat({
    temperature: 0,
    callbackManager,
    verbose,
  });
  const prompt: PromptTemplate = PromptTemplate.fromTemplate(
    notConversational.prefix +
      '\n\n' +
      notConversational.prompt +
      '\n\n' +
      notConversational.suffix,
  );
  const chainA: LLMChain = new LLMChain({
    llm: model,
    prompt,
    callbackManager,
    verbose,
  });

  let agentScratchpad = '';
  if (toolActionResults.length > 0) {
    for (const actionResult of toolActionResults) {
      agentScratchpad += `Thought:${actionResult.action.thought}
Action:${actionResult.action.tool}
Action Input: ${actionResult.action.toolInput}
Observation: ${actionResult.result}\n`;
    }
  }
  agentScratchpad += 'Thought:';

  const additionalTools = (await listTools()).filter((tool) =>
    enabledToolNames.includes(tool.nameForModel),
  );
  const tools = [...createDefaultTools(context), ...additionalTools];
  const toolDescriptions = tools
    .map((tool) => tool.nameForModel + ': ' + tool.descriptionForModel)
    .join('\n');
  const toolNames = tools.map((tool) => tool.nameForModel).join(', ');
  const result = await chainA.call({
    tool_descriptions: toolDescriptions,
    tool_names: toolNames,
    input,
    agent_scratchpad: agentScratchpad,
  });
  const output = parseResultForNotConversational(tools, result.text);
  return output;
};

export const parseResultForNotConversational = (
  tools: Tool[],
  result: string,
): ReactAgentResult => {
  const matchThought = result.match(/(.*)\nAction:/);
  let thought = '';
  if (matchThought) {
    thought = matchThought[1] || '';
  }
  const matchAction = result.match(/Action:(.*)(\n|$)/);
  if (thought && matchAction) {
    const actionStr = matchAction[1];
    const action = stripQuotes(actionStr.trim());
    const tool = tools.find((t) => t.nameForModel === action);
    if (!tool) {
      throw new Error(`Tool ${action} not found`);
    }
    const matchActionInput = result.match(/Action Input: (.*)(\n|$)/);
    const toolInputStr = matchActionInput
      ? (matchActionInput[1] as string)
      : '';
    const toolInput = stripQuotes(toolInputStr.trim());
    return {
      type: 'action',
      thought: thought.trim(),
      tool: {
        nameForModel: tool.nameForModel,
        nameForHuman: tool.nameForHuman,
        descriptionForHuman: tool.descriptionForHuman,
        descriptionForModel: tool.descriptionForModel,
        logoUrl: tool.logoUrl,
        displayForUser: tool.displayForUser,
      },
      toolInput: toolInput,
    };
  } else {
    const matchAnswer = result.match(/Final Answer:(.*)/);
    const answer = matchAnswer ? matchAnswer[1] : '';
    return {
      type: 'answer',
      answer: answer.trim(),
    };
  }
};
