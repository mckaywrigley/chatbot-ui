import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';

export const initVectorStore = async ({
  key,
  pineconeKey,
  environment,
  index,
}: {
  key: string;
  pineconeKey: string;
  environment: string;
  index: string;
}): Promise<PineconeStore> => {
  const openaiKey = key ? key : process.env.OPENAI_API_KEY;
  const client = new PineconeClient();
  await client.init({
    apiKey: pineconeKey,
    environment,
  });
  const pineconeIndex = client.Index(index);
  const vectorStore: PineconeStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({ openAIApiKey: openaiKey }),
    { pineconeIndex },
  );
  return vectorStore;
};
