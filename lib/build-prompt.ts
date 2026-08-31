import { Tables } from "@/supabase/types"
import { ChatPayload, MessageImage } from "@/types"
import { encode } from "gpt-tokenizer"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"

/**
 * Append the active answer-style instruction. Kept out of the user-
 * facing prompt so the scientist can flip the toggle without
 * rewriting their assistant brief. The string deliberately sits in
 * the system prompt's tail so it overrides any earlier "be helpful
 * and thorough" framing from the workspace instructions.
 */
const ANSWER_STYLE_INSTRUCTIONS: Record<"concise" | "elaborate", string> = {
  concise:
    "Answer style: CONCISE. Default to 1-2 sentence answers. No preamble, no recap, no closing 'let me know if…'. Expand only when the user explicitly asks for more.",
  elaborate:
    "Answer style: ELABORATE. Take the time to explain your reasoning, list relevant considerations, and walk the user through the answer. Multi-paragraph responses are welcome when the topic warrants it; bullet lists when listing ≥3 distinct items."
}

const buildBasePrompt = (
  prompt: string,
  profileContext: string,
  workspaceInstructions: string,
  assistant: Tables<"assistants"> | null,
  answerStyle?: "concise" | "elaborate"
) => {
  let fullPrompt = ""

  if (assistant) {
    fullPrompt += `<INJECT ROLE>\nYou are not an AI. You are ${assistant.name}.\n</INJECT ROLE>\n\n`
  }

  fullPrompt += `Today is ${new Date().toLocaleDateString()}.\n\n`

  if (profileContext) {
    fullPrompt += `User Info:\n${profileContext}\n\n`
  }

  if (workspaceInstructions) {
    fullPrompt += `System Instructions:\n${workspaceInstructions}\n\n`
  }

  fullPrompt += `User Instructions:\n${prompt}`

  // Answer-style suffix - last thing in the system prompt so it wins
  // when earlier instructions push the model toward thorough answers
  // and the user has selected Concise (or vice versa).
  const style = answerStyle ?? "concise"
  fullPrompt += `\n\n${ANSWER_STYLE_INSTRUCTIONS[style]}`

  return fullPrompt
}

export async function buildFinalMessages(
  payload: ChatPayload,
  profile: Tables<"profiles">,
  chatImages: MessageImage[]
) {
  const {
    chatSettings,
    workspaceInstructions,
    chatMessages,
    assistant,
    messageFileItems,
    chatFileItems
  } = payload

  const BUILT_PROMPT = buildBasePrompt(
    chatSettings.prompt,
    chatSettings.includeProfileContext ? profile.profile_context || "" : "",
    chatSettings.includeWorkspaceInstructions ? workspaceInstructions : "",
    assistant,
    payload.answerStyle
  )

  const CHUNK_SIZE = chatSettings.contextLength
  const PROMPT_TOKENS = encode(chatSettings.prompt).length

  let remainingTokens = CHUNK_SIZE - PROMPT_TOKENS

  let usedTokens = 0
  usedTokens += PROMPT_TOKENS

  const processedChatMessages = chatMessages.map((chatMessage, index) => {
    const nextChatMessage = chatMessages[index + 1]

    if (nextChatMessage === undefined) {
      return chatMessage
    }

    const nextChatMessageFileItems = nextChatMessage.fileItems

    if (nextChatMessageFileItems.length > 0) {
      const findFileItems = nextChatMessageFileItems
        .map(fileItemId =>
          chatFileItems.find(chatFileItem => chatFileItem.id === fileItemId)
        )
        .filter(item => item !== undefined) as Tables<"file_items">[]

      const retrievalText = buildRetrievalText(findFileItems)

      return {
        message: {
          ...chatMessage.message,
          content:
            `${chatMessage.message.content}\n\n${retrievalText}` as string
        },
        fileItems: []
      }
    }

    return chatMessage
  })

  let finalMessages = []

  for (let i = processedChatMessages.length - 1; i >= 0; i--) {
    const message = processedChatMessages[i].message
    const messageTokens = encode(message.content).length

    // ALWAYS include the most recent message (the user's current question), even
    // if the system prompt already blew the token budget. When the system prompt
    // is large - e.g. the tier-3 design chat dumps the whole experiment into it,
    // ~25k tokens vs a default contextLength of 4096 - remainingTokens goes
    // negative and this loop would otherwise drop EVERY message, leaving the
    // model with only the system prompt. It then replies with a content-free
    // greeting ("Ready." / "How can I help?") instead of answering. Keeping at
    // least the latest turn guarantees the user's question reaches the model.
    if (messageTokens <= remainingTokens || finalMessages.length === 0) {
      remainingTokens -= messageTokens
      usedTokens += messageTokens
      finalMessages.unshift(message)
    } else {
      break
    }
  }

  let tempSystemMessage: Tables<"messages"> = {
    chat_id: "",
    assistant_id: null,
    content: BUILT_PROMPT,
    created_at: "",
    id: processedChatMessages.length + "",
    image_paths: [],
    model: payload.chatSettings.model,
    role: "system",
    sequence_number: processedChatMessages.length,
    updated_at: "",
    user_id: ""
  }

  finalMessages.unshift(tempSystemMessage)

  finalMessages = finalMessages.map(message => {
    let content

    if (message.image_paths.length > 0) {
      content = [
        {
          type: "text",
          text: message.content
        },
        ...message.image_paths.map(path => {
          let formedUrl = ""

          if (path.startsWith("data")) {
            formedUrl = path
          } else {
            const chatImage = chatImages.find(image => image.path === path)

            if (chatImage) {
              formedUrl = chatImage.base64
            }
          }

          return {
            type: "image_url",
            image_url: {
              url: formedUrl
            }
          }
        })
      ]
    } else {
      content = message.content
    }

    return {
      role: message.role,
      content
    }
  })

  if (messageFileItems.length > 0) {
    const retrievalText = buildRetrievalText(messageFileItems)

    finalMessages[finalMessages.length - 1] = {
      ...finalMessages[finalMessages.length - 1],
      content: `${
        finalMessages[finalMessages.length - 1].content
      }\n\n${retrievalText}`
    }
  }

  return finalMessages
}

/**
 * Format retrieved items as numbered citations the model can reference
 * with `[N]` markers. The accompanying answer instruction tells the
 * model HOW to cite - frontend will then convert `[1]` etc. into
 * clickable chips that resolve to source_url (PR-8).
 *
 * Accepts both legacy `Tables<"file_items">` rows (no source_title /
 * source_url) and new `RagItem`s; missing metadata falls back to
 * "Untitled source" / no link, so the model still has the content.
 */
function buildRetrievalText(
  items: Array<{
    id?: string
    content?: string | null
    source_title?: string | null
    source_url?: string | null
    source_section?: string | null
  }>
) {
  const numbered = items.map((item, i) => {
    const n = i + 1
    const title = item.source_title?.trim() || "Untitled source"
    const section = item.source_section?.trim()
    const heading = section ? `${title} - ${section}` : title
    return `[${n}] ${heading}\n${item.content ?? ""}`
  })

  const refList = items
    .map((item, i) => {
      const n = i + 1
      const title = item.source_title?.trim() || "Untitled source"
      const url = item.source_url?.trim()
      return url ? `[${n}] ${title} (${url})` : `[${n}] ${title}`
    })
    .join("\n")

  return `You are given numbered sources [1]..[${items.length}]. When you use a source in your answer, cite it inline as [N]. End the answer with a "References" list mapping each [N] to its title. If a fact is not in the sources, say "I don't know" rather than guessing.

Sources:

${numbered.join("\n\n")}

References (for your end-of-answer list):
${refList}`
}

function adaptSingleMessageForGoogleGemini(message: any) {
  let adaptedParts = []

  let rawParts = []
  if (!Array.isArray(message.content)) {
    rawParts.push({ type: "text", text: message.content })
  } else {
    rawParts = message.content
  }

  for (let i = 0; i < rawParts.length; i++) {
    let rawPart = rawParts[i]

    if (rawPart.type == "text") {
      adaptedParts.push({ text: rawPart.text })
    } else if (rawPart.type === "image_url") {
      adaptedParts.push({
        inlineData: {
          data: getBase64FromDataURL(rawPart.image_url.url),
          mimeType: getMediaTypeFromDataURL(rawPart.image_url.url)
        }
      })
    }
  }

  let role = "user"
  if (["user", "system"].includes(message.role)) {
    role = "user"
  } else if (message.role === "assistant") {
    role = "model"
  }

  return {
    role: role,
    parts: adaptedParts
  }
}

function adaptMessagesForGeminiVision(messages: any[]) {
  // Gemini Pro Vision cannot process multiple messages
  // Reformat, using all texts and last visual only

  const basePrompt = messages[0].parts[0].text
  const baseRole = messages[0].role
  const lastMessage = messages[messages.length - 1]
  const visualMessageParts = lastMessage.parts
  let visualQueryMessages = [
    {
      role: "user",
      parts: [
        `${baseRole}:\n${basePrompt}\n\nuser:\n${visualMessageParts[0].text}\n\n`,
        visualMessageParts.slice(1)
      ]
    }
  ]
  return visualQueryMessages
}

export async function adaptMessagesForGoogleGemini(
  payload: ChatPayload,
  messages: any[]
) {
  let geminiMessages = []
  for (let i = 0; i < messages.length; i++) {
    let adaptedMessage = adaptSingleMessageForGoogleGemini(messages[i])
    geminiMessages.push(adaptedMessage)
  }

  if (payload.chatSettings.model === "gemini-pro-vision") {
    geminiMessages = adaptMessagesForGeminiVision(geminiMessages)
  }
  return geminiMessages
}
