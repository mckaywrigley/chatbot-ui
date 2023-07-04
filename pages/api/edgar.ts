import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { RetrievalStream } from '@/utils/server/langchain';
import { initVectorStore } from '@/utils/server/pinecone';

import { EdgarBody } from '@/types/edgar';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature, edgarParams } =
      (await req.json()) as EdgarBody;

    // // Add this block to reject GPT-4
    // if (model.id === 'gpt-4') {
    //   throw new Error('GPT-4 model is not supported at this time.');
    // }

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
    const { symbols, formTypes, startDate, endDate } = edgarParams;
    const metadataFilter = {
      $and: [
        { symbol: { $in: symbols } },
        { form_type: { $in: formTypes } },
        { report_date: { $gte: startDate, $lte: endDate } },
      ],
    };
    const retriever = vectorStore.asRetriever(8, metadataFilter);

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
