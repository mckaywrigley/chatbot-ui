/**
 * @jest-environment node
 *
 * Guards the token-budget bug that broke the design chat: when the system prompt
 * is large (the tier-3 design dump, ~25k tokens) and contextLength is the small
 * workspace default (4096), buildFinalMessages used to drop EVERY chat message -
 * the model then got only the system prompt and replied with a content-free
 * greeting ("Ready."). The user's latest question must always survive.
 */
import { buildFinalMessages } from "@/lib/build-prompt"

const bigPrompt = "histidine ".repeat(30_000) // ~30k tokens, dwarfs contextLength

const chatSettings: any = {
  model: "gpt-4o",
  prompt: bigPrompt,
  temperature: 1,
  contextLength: 4096, // the stale workspace default that caused the bug
  includeProfileContext: false,
  includeWorkspaceInstructions: false,
  embeddingsProvider: "openai"
}

const profile: any = { profile_context: "" }

function userMessage(content: string): any {
  return {
    message: {
      chat_id: "",
      assistant_id: null,
      content,
      created_at: "",
      id: "m1",
      image_paths: [],
      model: "gpt-4o",
      role: "user",
      sequence_number: 0,
      updated_at: "",
      user_id: ""
    },
    fileItems: []
  }
}

describe("buildFinalMessages token budget", () => {
  it("keeps the latest user message even when the system prompt blows the budget", async () => {
    const payload: any = {
      chatSettings,
      workspaceInstructions: "",
      chatMessages: [userMessage("How much histidine do I weigh for 250 mL?")],
      assistant: null,
      messageFileItems: [],
      chatFileItems: [],
      answerStyle: "concise"
    }

    const messages = await buildFinalMessages(payload, profile, [])

    // System prompt is always present...
    expect(messages[0].role).toBe("system")
    // ...and crucially the user's question is NOT dropped.
    const userTurn = messages.find((m: any) => m.role === "user")
    expect(userTurn).toBeTruthy()
    expect(userTurn?.content).toContain("How much histidine")
  })

  it("still trims older turns when the budget is blown (keeps only the latest)", async () => {
    const payload: any = {
      chatSettings,
      workspaceInstructions: "",
      chatMessages: [
        userMessage("old question one"),
        userMessage("old question two"),
        userMessage("the newest question")
      ],
      assistant: null,
      messageFileItems: [],
      chatFileItems: [],
      answerStyle: "concise"
    }

    const messages = await buildFinalMessages(payload, profile, [])
    const userTurns = messages.filter((m: any) => m.role === "user")
    // Only the most recent survives the negative budget - but it DOES survive.
    expect(userTurns).toHaveLength(1)
    expect(userTurns[0].content).toContain("the newest question")
  })
})
