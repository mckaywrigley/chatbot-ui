import { OpenAI } from 'langchain/llms/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { ConversationalRetrievalQAChain } from 'langchain/chains';

const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

type MakeChainArgs = {
  modelName: string;
  temperature: number;
  prompt: string;
  vectorStore: PineconeStore;
};

export const makeChain = ({ modelName, temperature, prompt, vectorStore }: MakeChainArgs) => {
  const model = new OpenAI({
    temperature, // increase temepreature to get more creative answers
    modelName, //change this to gpt-4 if you have access
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    {
      qaTemplate: prompt,
      questionGeneratorTemplate: CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};
