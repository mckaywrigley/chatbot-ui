// export async function cleanMessagesFromWarnings(messages: string | any[]) {
//   let cleanedMessages = []
//   const warnings = [
//     "Hold On! You've Hit Your Usage Cap.",
//     "Whoa, hold on a sec!",
//     "⏰ You can use the tool again in",
//     "We apologize for any inconvenience, but"
//   ]

//   for (let i = 0; i < messages.length; i++) {
//     const message = messages[i]

//     // Check if message or next message is undefined or if they don't have a role property
//     if (!message || typeof message.role === "undefined") {
//       console.error(
//         "One of the messages is undefined or does not have a role property"
//       )
//       continue
//     }

//     // Determine if we should skip the message based on warnings in the next message
//     let skipMessage = false
//     if (i < messages.length - 1) {
//       const nextMessage = messages[i + 1]
//       skipMessage =
//         nextMessage.role === "assistant" &&
//         warnings.some(warning => nextMessage.content.includes(warning)) &&
//         message.role === "user"
//     }

//     // Skip this message and the next if it's a warning after a user message
//     if (skipMessage) {
//       i++ // Increment to skip the next message as well
//     } else if (
//       !(
//         i < messages.length - 1 &&
//         message.role === "user" &&
//         messages[i + 1].role === "user"
//       )
//     ) {
//       // Add message if not consecutive user messages
//       cleanedMessages.push(message)
//     }
//   }

//   // Add last message conditionally if it's a user message and doesn't contain any warnings
//   const lastMessage = messages[messages.length - 1]
//   if (
//     lastMessage &&
//     lastMessage.role === "user" &&
//     !warnings.some(warning => lastMessage.content.includes(warning))
//   ) {
//     if (
//       cleanedMessages.length === 0 ||
//       cleanedMessages[cleanedMessages.length - 1].role !== "user"
//     ) {
//       cleanedMessages.push(lastMessage)
//     }
//   }

//   // Ensure first message is not an assistant message if cleanedMessages length is even
//   if (
//     cleanedMessages.length % 2 === 0 &&
//     cleanedMessages[0]?.role === "assistant"
//   ) {
//     cleanedMessages.shift()
//   }

//   return cleanedMessages
// }
