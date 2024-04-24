const llmConfig = {
  openrouter: {
    url: `https://openrouter.ai/api/v1/chat/completions`,
    providerRouting: {
      order: [
        `${process.env.OPENROUTER_FIRST_PROVIDER}`,
        "Together",
        "Mistral"
      ]
    }
  },
  together: {
    url: `https://api.together.xyz/v1/chat/completions`
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  pinecone: {
    apiKey: process.env.SECRET_PINECONE_API_KEY || "defaultApiKey",
    index: process.env.SECRET_PINECONE_INDEX || "defaultIndex",
    projectId: process.env.SECRET_PINECONE_PROJECT_ID || "defaultProjectId",
    environment:
      process.env.SECRET_PINECONE_ENVIRONMENT || "defaultEnvironment",
    namespace: process.env.SECRET_PINECONE_NAMESPACE,
    temperature: 0.4,
    messageLength: {
      min: parseInt(process.env.MIN_LAST_MESSAGE_LENGTH || "25", 10),
      max: parseInt(process.env.MAX_LAST_MESSAGE_LENGTH || "1000", 10)
    }
  },
  cohere: {
    rerank: (process.env.USE_COHERE_RERANK || "false").toLowerCase() == "true",
    apiKey: process.env.SECRET_COHERE_API_KEY || "defaultApiKey"
  },
  systemPrompts: {
    hackerGPT: process.env.SECRET_HACKERGPT_SYSTEM_PROMPT,
    pinecone: process.env.PINECONE_SYSTEM_PROMPT
  },
  models: {
    hackerGPT_default: process.env.OPENROUTER_HACKERGPT_DEFUALT_MODEL,
    hackerGPT_RAG_openrouter: process.env.OPENROUTER_HACKERGPT_RAG_MODEL,
    hackerGPT_RAG_together: process.env.TOGETHER_HACKERGPT_RAG_MODEL,
    hackerGPT_standalone_question_openrouter:
      process.env.OPENROUTER_STANDALONE_QUESTION_MODEL,
    hackerGPT_standalone_question_together:
      process.env.TOGETHER_STANDALONE_QUESTION_MODEL,
    hackerGPT_pro_openrouter: process.env.OPENROUTER_HACKERGPT_PRO_MODEL,
    hackerGPT_pro_together: process.env.TOGETHER_HACKERGPT_PRO_MODEL
  },
  usePinecone: process.env.USE_PINECONE === "TRUE"
}

export default llmConfig
