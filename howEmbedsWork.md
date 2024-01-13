# How Embeds Work
When a file is uploaded to chat
- The file is uploaded to the server
- Broken down into Vectors using the (OpenAI Embed API)[https://platform.openai.com/docs/api-reference/embeddings]
- Stored in PostGres in the `file_items` table

When a enters a prompt into a chat that contains a file
- First we hit the /retrieve endpoint http://localhost:3000/api/retrieval/retrieve with the prompt
- The prompt is broken down into Vectors using the [ OpenAI Embed API ]( https://platform.openai.com/docs/api-reference/embeddings )
- The vectors are compared to the vectors of the files in the chat
- The files with the highest similarity is returned 
- We then append this to our [latest message]( https://github.com/mckaywrigley/chatbot-ui/blob/main/lib/build-prompt.ts#L77 ) as the source of information before sending our message to the chat endpoint 

