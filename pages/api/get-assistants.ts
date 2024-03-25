// pages/api/get-assistants.ts
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers";
import { ServerRuntime } from "next";
import OpenAI from "openai";

export const runtime: ServerRuntime = "edge";

const handler = async (req: Request) => {
  try {
    const profile = await getServerProfile();

    checkApiKey(profile.openai_api_key, "OpenAI");

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id,
    });

    const myAssistants = await openai.beta.assistants.list({
      limit: 100,
    });

    return new Response(JSON.stringify({ assistants: myAssistants.data }), {
      status: 200,
    });
  } catch (error: any) {
    console.error(error); // Log the error to the console for more detailed diagnostics
    const errorMessage = error.error?.message || "An unexpected error occurred";
    const errorCode = error.status || 500;
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
    });
  }
};

export default handler;