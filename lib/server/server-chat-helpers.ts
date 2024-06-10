import { Database, Tables, TablesUpdate } from "@/supabase/types"
import { VALID_ENV_KEYS } from "@/types/valid-keys"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import {
  Card,
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  RecordLog,
  RecordLogItem
} from "ts-fsrs"

export async function getServerProfile() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    throw new Error("User not found")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!profile) {
    throw new Error("Profile not found")
  }

  const profileWithKeys = addApiKeysToProfile(profile)

  return profileWithKeys
}

function addApiKeysToProfile(profile: Tables<"profiles">) {
  const apiKeys = {
    [VALID_ENV_KEYS.OPENAI_API_KEY]: "openai_api_key",
    [VALID_ENV_KEYS.ANTHROPIC_API_KEY]: "anthropic_api_key",
    [VALID_ENV_KEYS.GOOGLE_GEMINI_API_KEY]: "google_gemini_api_key",
    [VALID_ENV_KEYS.MISTRAL_API_KEY]: "mistral_api_key",
    [VALID_ENV_KEYS.GROQ_API_KEY]: "groq_api_key",
    [VALID_ENV_KEYS.PERPLEXITY_API_KEY]: "perplexity_api_key",
    [VALID_ENV_KEYS.AZURE_OPENAI_API_KEY]: "azure_openai_api_key",
    [VALID_ENV_KEYS.OPENROUTER_API_KEY]: "openrouter_api_key",
    [VALID_ENV_KEYS.DEEPINFRA_API_KEY]: "deepinfra_api_key",

    [VALID_ENV_KEYS.OPENAI_ORGANIZATION_ID]: "openai_organization_id",

    [VALID_ENV_KEYS.AZURE_OPENAI_ENDPOINT]: "azure_openai_endpoint",
    [VALID_ENV_KEYS.AZURE_GPT_35_TURBO_NAME]: "azure_openai_35_turbo_id",
    [VALID_ENV_KEYS.AZURE_GPT_45_VISION_NAME]: "azure_openai_45vision_id",
    [VALID_ENV_KEYS.AZURE_GPT_45_TURBO_NAME]: "azure_openai_45_turbo_id",
    [VALID_ENV_KEYS.AZURE_EMBEDDINGS_NAME]: "azure_openai_embeddings_id"
  }

  for (const [envKey, profileKey] of Object.entries(apiKeys)) {
    if (process.env[envKey]) {
      ;(profile as any)[profileKey] = process.env[envKey]
    }
  }

  return profile
}

export function checkApiKey(apiKey: string | null, keyName: string) {
  if (apiKey === null || apiKey === "") {
    throw new Error(`${keyName} API Key not found`)
  }
}

export const getChatById = async (chatId: string) => {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle()

  return chat
}

// getUserEmailById
export async function getUserEmailById(userId: string) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // This gets the user details from the auth users
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

  if (error) {
    throw new Error(error.message)
  }

  return data.user.email
}

// Function that returns all chats where revise_date is today
export async function getChatsByDueDate(request: any) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayString = today.toISOString()

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowString = tomorrow.toISOString()

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // Perform the query to get chats where revise_date is today
  const { data: chats, error } = await supabaseAdmin
    .from("chats")
    .select("*")
    .gte("due_date", todayString)
    .lt("due_date", tomorrowString)

  // Error handling
  if (error) {
    throw new Error(error.message)
  }

  if (!chats) {
    return []
  }

  return chats
}

const updateChat = async (chatId: string, chat: TablesUpdate<"chats">) => {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )

  const { error } = await supabase
    .from("chats")
    .update(chat)
    .eq("id", chatId)
    .select("*")
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateTopicOnRecall(
  chatId: string,
  test_result: number,
  recall_analysis: string
) {
  const chat = await getChatById(chatId)

  if (!chat) {
    return { success: false, error: "Chat not found" }
  }

  const params = generatorParameters({ enable_fuzz: true })
  const f = fsrs(params)

  const card: Card =
    chat.srs_card === null
      ? createEmptyCard()
      : typeof chat.srs_card === "string"
        ? JSON.parse(chat.srs_card)
        : chat.srs_card

  // map test_result to a rating
  let rating: Rating
  if (test_result < 10) {
    rating = Rating.Again
  } else if (test_result < 50) {
    rating = Rating.Hard
  } else if (test_result < 85) {
    rating = Rating.Good
  } else {
    rating = Rating.Easy
  }

  const scheduling_cards: RecordLog = f.repeat(card, Date.now())
  const record: RecordLogItem = scheduling_cards[rating]

  const chatUpdateStatus = await updateChat(chatId, {
    test_result: Math.round(test_result),
    srs_card: JSON.stringify(record.card),
    recall_analysis,
    due_date: record.card.due.toISOString()
  })
  if (chatUpdateStatus.success === false) {
    return chatUpdateStatus
  }

  return {
    success: true,
    due_date: record.card.due
  }
}

export async function updateTopicContent(chatId: string, content: string) {
  const chatUpdateStatus = await updateChat(chatId, {
    topic_description: content
  })
  return chatUpdateStatus
}

// Function-specific argument types
interface FunctionArguments {
  updateTopicOnRecall: { test_result: number; recall_analysis: string }
  updateTopicContent: { content: string }
}

// Helper type for extracting the specific argument type
type FunctionArg<F extends keyof FunctionArguments> = FunctionArguments[F]

export async function functionCalledByLLM<F extends keyof FunctionArguments>(
  functionName: F,
  bodyContent: FunctionArg<F>,
  chatId: string
): Promise<any> {
  let tempData = {}

  switch (functionName) {
    case "updateTopicOnRecall":
      // Explicitly assert the type of bodyContent for this case
      const quizResultArgs = bodyContent as FunctionArg<"updateTopicOnRecall">
      tempData = await updateTopicOnRecall(
        chatId,
        quizResultArgs.test_result,
        quizResultArgs.recall_analysis
      )
      break
    case "updateTopicContent":
      // Assert the type for this case
      const contentArgs = bodyContent as FunctionArg<"updateTopicContent">
      tempData = await updateTopicContent(chatId, contentArgs.content)
      break
    default:
      console.error(`Function ${functionName} is not supported.`)
      return { success: false }
  }

  return tempData
}
