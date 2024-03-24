import { Database, Tables, TablesUpdate } from "@/supabase/types"
import { VALID_ENV_KEYS } from "@/types/valid-keys"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import * as ebisu from "ebisu-js"
import { AssertionError } from "assert"
import { createClient } from "@supabase/supabase-js"

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
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single()

  return user?.email ?? null
}

// Function that returns all chats where revise_date is before the current time
export async function getChatsByReviseDate(cutoffDate: Date, request: any) {
  const cutoffDateString = cutoffDate.toISOString()
  console.log("Cutoff date", cutoffDateString)

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  // Perform the query to get chats where revise_date is less than the current time
  const { data: chats, error } = await supabaseAdmin
    .from("chats")
    .select("*")
    .lt("revise_date", cutoffDateString)

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

export async function updateTopicQuizResult(
  chatId: string,
  test_result: number
) {
  const chat = await getChatById(chatId)

  // if updated_at is null, set it to created_at
  const updated_at = (chat?.updated_at || chat?.created_at) as string

  const chatEbisuModel = chat?.ebisu_model || [4, 4, 24]
  const [arg1, arg2, arg3] = chatEbisuModel

  const model = ebisu.defaultModel(arg3, arg1, arg2)
  var successes = test_result / 100
  var total = 1
  // elapsed time in hours from last update to now
  var elapsed = (Date.now() - new Date(updated_at).getTime()) / 1000 / 60 / 60
  let newModel
  try {
    newModel = ebisu.updateRecall(model, successes, total, elapsed)
  } catch (error) {
    if (error instanceof AssertionError) {
      // Handle the AssertionError by using a more reasonable elapsed time
      newModel = ebisu.updateRecall(model, successes, total, 2)
    } else {
      // If it's not an AssertionError, rethrow the error
      throw error
    }
  }
  const now = new Date()
  const halfLifeHours = ebisu.modelToPercentileDecay(newModel)

  const revise_date = new Date(
    now.getTime() + halfLifeHours * 60 * 60 * 1000
  ).toISOString()

  console.log({ test_result }, { elapsed }, { newModel }, { revise_date })

  const chatUpdateStatus = await updateChat(chatId, {
    test_result,
    ebisu_model: newModel,
    revise_date
  })
  if (chatUpdateStatus.success === false) {
    return chatUpdateStatus
  }

  return {
    success: true,
    revise_date
  }
}

export async function updateTopicContent(chatId: string, content: string) {
  const chatUpdateStatus = await updateChat(chatId, {
    topic_description: content
  })
  return chatUpdateStatus
}

// update revise date by chat id and hours time
export async function updateReviseDate(chatId: string, hours_time: number) {
  let currentTime = new Date()
  const reviseDate = currentTime.setHours(currentTime.getHours() + 12)

  const chatUpdateStatus = await updateChat(chatId, {
    revise_date: new Date(reviseDate).toISOString()
  })
  return chatUpdateStatus
}

// Function-specific argument types
interface FunctionArguments {
  updateTopicQuizResult: { test_result: number }
  updateTopicContent: { content: string }
  scheduleTestSession: { hours_time: number }
  updateRecallAnalysis: { recall_analysis: string }
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
    case "updateTopicQuizResult":
      // Explicitly assert the type of bodyContent for this case
      const quizResultArgs = bodyContent as FunctionArg<"updateTopicQuizResult">
      tempData = await updateTopicQuizResult(chatId, quizResultArgs.test_result)
      break
    case "updateTopicContent":
      // Assert the type for this case
      const contentArgs = bodyContent as FunctionArg<"updateTopicContent">
      tempData = await updateTopicContent(chatId, contentArgs.content)
      break
    case "scheduleTestSession":
      // And so on for each case...
      const sessionArgs = bodyContent as FunctionArg<"scheduleTestSession">
      tempData = await updateReviseDate(chatId, sessionArgs.hours_time)
      break
    case "updateRecallAnalysis":
      const recallArgs = bodyContent as FunctionArg<"updateRecallAnalysis">
      tempData = await updateChat(chatId, recallArgs)
      break
    default:
      console.error(`Function ${functionName} is not supported.`)
      return { success: false }
  }

  return tempData
}
