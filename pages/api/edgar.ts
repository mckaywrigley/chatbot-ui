import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { RetrievalStream } from '@/utils/server/langchain';
import { initVectorStore } from '@/utils/server/pinecone';

import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature } =
      (await req.json()) as ChatBody;

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    // Init the vector store
    const pineconeKey = process.env.PINECONE_API_KEY || '';
    const environment = process.env.PINECONE_ENVIRONMENT || '';
    const index = process.env.PINECONE_INDEX || '';
    const vectorStore = await initVectorStore({
      key,
      pineconeKey,
      environment,
      index,
    });

    // Create the retriever
    const metadataFilter = {
      source:
        'https://www.sec.gov/Archives/edgar/data/1318605/000095017023001409/tsla-20221231.htm', //testing
    };
    const retriever = vectorStore.asRetriever(4, metadataFilter);

    const stream = await RetrievalStream(
      model,
      promptToSend,
      temperatureToUse,
      key,
      messages,
      retriever,
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
