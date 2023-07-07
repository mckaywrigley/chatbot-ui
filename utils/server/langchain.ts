import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { BaseCallbackHandler } from 'langchain/callbacks';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAI } from 'langchain/llms/openai';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import {
  AIChatMessage,
  ChainValues,
  HumanChatMessage,
  SystemChatMessage,
} from 'langchain/schema';
import { VectorStoreRetriever } from 'langchain/vectorstores/base';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

interface Document {
  pageContent: string;
  metadata: Record<string, any>;
}

// Define the run function
const run = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
  retriever: VectorStoreRetriever<PineconeStore>,
  handler: BaseCallbackHandler,
): Promise<ChainValues> => {
  const openaiKey = key ? key : process.env.OPENAI_API_KEY;

  // Initialize the LLM
  const llm = new OpenAI({
    modelName: 'text-davinci-003',
    temperature,
    openAIApiKey: openaiKey,
  });

  // Initialize the streaming LLM
  const streamingLlm = new ChatOpenAI({
    modelName: model.id,
    temperature,
    streaming: true,
    openAIApiKey: openaiKey,
  });

  // Create the memory
  const pastMessages = [new SystemChatMessage(systemPrompt)];
  messages.slice(0, -1).forEach((message) => {
    if (message.role === 'user') {
      pastMessages.push(new HumanChatMessage(message.content));
    } else {
      pastMessages.push(new AIChatMessage(message.content));
    }
  });
  const memory = new BufferMemory({
    memoryKey: 'chat_history',
    inputKey: 'question', // The key for the input to the chain
    outputKey: 'text', // The key for the final conversational output of the chain
    returnMessages: true, // If using with a chat model
    chatHistory: new ChatMessageHistory(pastMessages),
  });

  // Create the QA chain
  const qa = ConversationalRetrievalQAChain.fromLLM(streamingLlm, retriever, {
    returnSourceDocuments: true,
    memory,
    questionGeneratorChainOptions: { llm },
  });

  // Call the QA chain
  const question = messages[messages.length - 1].content;
  const res = await qa.call({ question }, [handler]);

  return res;
};

export const RetrievalStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature: number,
  key: string,
  messages: Message[],
  retriever: VectorStoreRetriever<PineconeStore>,
) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const handler = BaseCallbackHandler.fromMethods({
        handleLLMNewToken(token: string) {
          const queue = encoder.encode(token);
          controller.enqueue(queue);
        },
        handleLLMError(err: Error) {
          controller.error(err);
        },
      });
      const res = await run(
        model,
        systemPrompt,
        temperature,
        key,
        messages,
        retriever,
        handler,
      );

      // Extract 'page_content' and 'source' from each document in 'source_documents' and format them as desired
      let sourceDocumentsData = '\n\n**Sources:**\n';
      res.sourceDocuments
        .slice(0, 4)
        .forEach((doc: Document, index: number) => {
          sourceDocumentsData += `${index + 1}. Symbol: \`${
            doc.metadata.symbol
          }\`,  Form Type: \`${doc.metadata.form_type}\`,  Report Date: \`${
            doc.metadata.report_date
          }\`,  [more](${doc.metadata.source})\n`;
        });

      // Enqueue the formatted string to the stream
      const sourceDocumentsQueue = encoder.encode(sourceDocumentsData);
      controller.enqueue(sourceDocumentsQueue);

      controller.close();
    },
  });

  return stream;
};
