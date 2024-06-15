import { Database } from "@/supabase/types";
import { ChatSettings } from "@/types";
import { createClient } from "@supabase/supabase-js";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { ServerRuntime } from "next";
import OpenAI from "openai";
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs";

export const runtime: ServerRuntime = "edge";

// Helper function to log messages
const log = (message: string, data?: any) => {
  console.log(`[LOG] ${message}`, data || '');
};

export async function POST(request: Request) {
  try {
    // Parse the JSON body
    const json = await request.json();
    const { chatSettings, messages, customModelId } = json as {
      chatSettings: ChatSettings;
      messages: any[];
      customModelId: string;
    };

    // Validate the parsed data
    if (!chatSettings || !messages || !customModelId) {
      throw new Error("Invalid request payload");
    }

    log("Parsed request payload", { chatSettings, messages, customModelId });

    // Initialize Supabase client
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    log("Initialized Supabase client");

    // Fetch the custom model data
    const { data: customModel, error } = await supabaseAdmin
      .from("models")
      .select("*")
      .eq("id", customModelId)
      .single();

    if (error || !customModel) {
      throw new Error(error?.message || "Custom model not found");
    }

    log("Fetched custom model", customModel);

    // Initialize OpenAI client
    const custom = new OpenAI({
      apiKey: customModel.api_key || "",
      baseURL: customModel.base_url
    });

    log("Initialized OpenAI client");

    // Create chat completion with streaming response
    const response = await custom.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      stream: true
    });

    log("Created chat completion");

    const stream = OpenAIStream(response);

    log("Generated streaming response");

    return new StreamingTextResponse(stream);

  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred";
    const errorCode = error.status || 500;

    log("Error occurred", { errorMessage, errorCode });

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage = "Custom API Key not found. Please set it in your profile settings.";
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage = "Custom API Key is incorrect. Please fix it in your profile settings.";
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    });
  }
}
