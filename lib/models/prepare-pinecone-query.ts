// function preparePineconeQuery(
//   cleanedMessages: string | any[],
//   MAX_LAST_MESSAGE_LENGTH: any
// ) {
//   const MAX_LENGTH_FOR_INDIVIDUAL_MESSAGE = 300
//   const MAX_TOTAL_LENGTH = MAX_LAST_MESSAGE_LENGTH
//   const ASSISTANT_SNIPPET_LENGTH = 300
//   let combinedContent = ""

//   // Add a snippet of the latest assistant message for context
//   for (let i = cleanedMessages.length - 2; i >= 0; i--) {
//     if (cleanedMessages[i].role === "assistant") {
//       combinedContent =
//         extractAssistantSnippet(
//           cleanedMessages[i].content,
//           ASSISTANT_SNIPPET_LENGTH
//         ) + " "
//       break
//     }
//   }

//   let latestUserMessage = cleanedMessages[cleanedMessages.length - 1].content
//   let keywords = latestUserMessage.split(" ").slice(0, 5) // Taking first 5 words as keywords

//   // Process user messages starting from the most recent
//   for (let i = cleanedMessages.length - 1; i >= 0; i--) {
//     if (cleanedMessages[i].role === "user") {
//       let messageContent = cleanedMessages[i].content

//       // Check for relevance of the message
//       if (
//         !isMessageRelevant(messageContent, keywords) &&
//         i !== cleanedMessages.length - 1
//       ) {
//         continue
//       }

//       if (combinedContent.length + messageContent.length > MAX_TOTAL_LENGTH) {
//         let remainingLength = MAX_TOTAL_LENGTH - combinedContent.length
//         let breakpoint = findNaturalBreakpoint(messageContent, remainingLength)
//         combinedContent =
//           messageContent.substring(0, breakpoint) + " " + combinedContent
//         break
//       } else if (messageContent.length > MAX_LENGTH_FOR_INDIVIDUAL_MESSAGE) {
//         let breakpoint = findNaturalBreakpoint(
//           messageContent,
//           MAX_LENGTH_FOR_INDIVIDUAL_MESSAGE
//         )
//         combinedContent =
//           messageContent.substring(0, breakpoint) + " " + combinedContent
//       } else {
//         combinedContent = messageContent + " " + combinedContent
//       }
//     }
//   }

//   return combinedContent.trim()
// }

// function extractAssistantSnippet(message: string, length: number) {
//   // Identify key sentences or phrases in the assistant's message
//   // For simplicity, we're still using a quarter way through for now
//   const startOffset = Math.floor(message.length * 0.25)
//   const endOffset = startOffset + length
//   return message.substring(startOffset, Math.min(endOffset, message.length))
// }

// function findNaturalBreakpoint(message: string | string[], maxLength: any) {
//   // Find a natural breakpoint like the end of a sentence
//   let breakpoint = message.lastIndexOf(". ", maxLength)
//   return breakpoint === -1 ? maxLength : breakpoint + 1
// }

// function isMessageRelevant(message: string | any[], keywords: any[]) {
//   // Basic keyword matching for relevance - can be replaced with more advanced NLP
//   return keywords.some(keyword => message.includes(keyword))
// }

// export default preparePineconeQuery
