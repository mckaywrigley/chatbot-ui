export const prefix = `Answer the following questions as best you can. You have access to the following tools:

{tool_descriptions}`;

export const prompt = `Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}].
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question
Positivity: the positivity of the final answer. the range is 0 - 10
`;

export const suffix = `Begin!

Question: {input}
{agent_scratchpad}`;

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  prefix,
  prompt,
  suffix,
};
