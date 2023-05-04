import { OpenAI } from 'langchain/llms/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { pinecone } from '../pinecone/pinecone-client';
import { PINECONE_INDEX_NAME } from '../pinecone/pinecone';


const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

{context}

Question: {question}
Helpful answer in markdown:`;

export const createQAChain = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  key: string,
  messages: Message[],
  namespace: string,
) => {
    // TODO: replace this with the passed in model
    const newModel = new OpenAI({
      temperature: 0, // increase temepreature to get more creative answers
      modelName: 'gpt-3.5-turbo', //change this to gpt-4 if you have access
    });

    const index = pinecone.Index(PINECONE_INDEX_NAME);
    /* create vectorstore*/
    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings({}),
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: namespace,
      },
    );

    const chain = ConversationalRetrievalQAChain.fromLLM(
      newModel,
      vectorStore.asRetriever(),
      {
        qaTemplate: QA_PROMPT, // maybe replace with the passed in systemPrompt
        questionGeneratorTemplate: CONDENSE_PROMPT,
        returnSourceDocuments: true, //The number of source documents returned is 4 by default
      },
    );

    // These steps make a lot of assumptions
    const localMessages = [...messages];
    const sanitizedQuestion = `${localMessages.pop()?.content ?? ''}`.trim().replaceAll(`\n`, ` `);
    const history = [];
    while(localMessages.length > 0) {
      history.push(localMessages.splice(0,2));
    }

    return chain.call({
      question: sanitizedQuestion,
      chat_history: history,
    });
}
