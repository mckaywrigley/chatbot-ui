import { OpenAIError } from '@/utils/server';
import { ChatBody } from '@/types/chat';
import { pinecone } from '@/utils/pinecone/pinecone-client';
import { PINECONE_INDEX_NAME } from '@/utils/pinecone/pinecone';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { makeChain } from '@/utils/pinecone/makechain';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { messages, model, namespace, prompt, temperature } = req.body as ChatBody;

    // OpenAI recommends replacing newlines with spaces for best results
    const sanitizedMessages = messages.map(message => ({
      ...message,
      content: message.content.trim().replaceAll(`\n`, ` `),
    }));

    try {
      const index = pinecone.Index(PINECONE_INDEX_NAME);

      /* create vectorstore*/
      const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({}),
        {
          pineconeIndex: index,
          textKey: 'text',
          namespace
        },
      );

      //create chain
      const chain = makeChain({
        modelName: model.id,
        prompt,
        temperature,
        vectorStore
      });

      //Ask a question using chat history
      const response = await chain.call({
        question: sanitizedMessages[sanitizedMessages.length - 1].content,
        chat_history: sanitizedMessages.map(message => message.content),
      });

      return res.status(200).send(response.text);
    } catch (error: any) {
      console.log({ error });
      return res.status(500).statusMessage = error.message || 'Something went wrong';
    }
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return res.status(500).statusMessage = error.message;
    } else {
      return res.status(500).statusMessage = 'Error';
    }
  }
};
