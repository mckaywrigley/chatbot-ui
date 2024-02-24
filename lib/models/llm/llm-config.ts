const llmConfig = {
  openrouter: {
    url: `https://openrouter.ai/api/v1/chat/completions`
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  pinecone: {
    apiKey: process.env.SECRET_PINECONE_API_KEY,
    index: process.env.SECRET_PINECONE_INDEX,
    projectId: process.env.SECRET_PINECONE_PROJECT_ID,
    environment: process.env.SECRET_PINECONE_ENVIRONMENT,
    namespace: process.env.SECRET_PINECONE_NAMESPACE,
    temperature: 0.6,
    messageLength: {
      min: parseInt(process.env.MIN_LAST_MESSAGE_LENGTH || "50", 10),
      max: parseInt(process.env.MAX_LAST_MESSAGE_LENGTH || "1000", 10)
    }
  },
  systemPrompts: {
    hackerGPT: process.env.SECRET_HACKERGPT_SYSTEM_PROMPT,
    pinecone: process.env.PINECONE_SYSTEM_PROMPT
  },
  models: {
    translation: process.env.OPENROUTER_TRANSLATION_MODEL,
    hackerGPT_default: process.env.OPENROUTER_HACKERGPT_DEFUALT_MODEL,
    hackerGPT_enhance: process.env.OPENROUTER_HACKERGPT_ENHANCE_MODEL
  },
  usePinecone: process.env.USE_PINECONE === "TRUE"
}

export default llmConfig
