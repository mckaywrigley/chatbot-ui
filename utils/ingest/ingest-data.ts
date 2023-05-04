import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { pinecone } from '@/utils/pinecone/pinecone-client';
import { PINECONE_INDEX_NAME } from '@/utils/pinecone/pinecone';
import { CustomHTMLLoader, CustomPDFLoader } from './dataLoader';

/* Name of directory to retrieve your files from */
const filePath = 'docs';

type RunIngestDataResponse = {
  duplicate: boolean;
  namespace: string;
}

export const runIngestData = async (namespace: string): Promise<RunIngestDataResponse> => {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name

    const response = await index.describeIndexStats({
      describeIndexStatsRequest: {}
    });

    if (response.namespaces?.[namespace]) {
      return {
        duplicate: true,
        namespace,
      };
    }

    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(filePath, {
      '.html': (path) => new CustomHTMLLoader(path),
      '.pdf': (path) => new CustomPDFLoader(path),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split docs', docs);

    console.log('creating vector store...');
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();

    //embed the PDF documents
    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace,
      textKey: 'text',
    });

    console.log('done creating vector store...');

    return {
      duplicate: false,
      namespace,
    };
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to ingest your data');
  }
};
