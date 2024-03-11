import { StudyState } from "@/lib/assistants"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByOpenAI
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

export async function POST(request: Request) {
  const json = await request.json()
  const { messages, chatId, chatStudyState, topicDescription, recallAnalysis } =
    json as {
      messages: any[]
      chatId: string
      chatStudyState: StudyState
      topicDescription: string
      recallAnalysis: string
    }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const studentMessage = messages[messages.length - 1].content
    const messagesWithoutLast = messages.slice(0, -1)

    console.log({ studentMessage })

    const getScore = async (messagesFromLLM: any) => {
      console.log({ messagesFromLLM })
      const scoreRunner = await openai.beta.chat.completions.stream({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Based on the student's recall attempt and any subsequent hints provided, calculate the recall score on a scale from 0 to 100. Points should be awarded fully for correct initial recalls and halved for correct recalls post-hint. Return the score as a single number.`
          },
          ...messages
        ]
      })
      return await scoreRunner.finalContent()
    }

    if (chatStudyState === "recall_first_attempt") {
      const analysisRunner = await openai.beta.chat.completions.stream({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `"Given the student's recall attempt and the original source material, identify discrepancies and omissions. 
Please provide the results in JSON format, listing incorrect facts under 'incorrect_facts' and forgotten facts under 'forgotten_facts'. 
Each list should contain strings that succinctly summarise the errors or omissions. Ensure the facts are presented clearly for educational review."`
          },
          {
            role: "user",
            content: `Topic source: """${topicDescription}"""
          
Student recall: """${studentMessage}"""`
          }
        ],
        response_format: { type: "json_object" }
      })

      const analysis = await analysisRunner.finalContent()
      const serverResult = await functionCalledByOpenAI(
        "updateRecallAnalysis",
        [analysis],
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error")
      }

      console.log("analysis:", analysis)

      const feedbackRunner = await openai.beta.chat.completions.stream({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `As a friendly and supportive tutor, your goal is to guide the user through an active free recall study session. Follow these steps:
1. Commend the student on the facts they've correctly recalled, providing positive reinforcement.
2. Correct any inaccuracies in the student's recall, supplying the right information.
3. For any forgotten facts, offer hints that encourage recall without directly giving away the answers.
4. If no errors are present, offer encouragement and inquire if they wish to proceed to evaluate their recall attempt.`
          },
          {
            role: "user",
            content: `Topic source: """${topicDescription}"""
Student recall: """${studentMessage}"""
Analysis: """${analysis}"""`
          }
        ]
      })

      const stream = OpenAIStream(feedbackRunner)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": "recall_hinting",
          ANALYSIS: JSON.stringify(analysis)
        }
      })
    }

    if (chatStudyState === "recall_hinting") {
      let newStudyState: StudyState = "recall_hinting"
      const newMessages = [
        {
          role: "system",
          content: `You are a friendly and supportive tutor. Your tasks are to:
          1. Analyze the given 'forgotten facts' and assist the student in recalling them by providing hints. Ensure the hints encourage thinking without revealing the answers directly.
          2. Respond to the student's guesses by affirming correct answers or gently correcting wrong ones.
          3. If all hints have been given, or the student wishes to proceed, use the 'getScore' tool to evaluate the recall attempt. Provide a score and generate constructive feedback based on this outcome. Ensure to motivate the student for future learning endeavors.`
        },
        ...messagesWithoutLast,
        {
          role: "user",
          content: `Topic source: """${topicDescription}"""
Student response: """${studentMessage}"""
Analysis: """${recallAnalysis}"""`
        }
      ]
      const feedbackRunner = await openai.beta.chat.completions
        .runTools({
          stream: true,
          model: "gpt-3.5-turbo",
          messages: newMessages,
          tools: [
            {
              type: "function",
              function: {
                function: getScore,
                parameters: {
                  type: "object",
                  properties: {
                    messages: { type: "string" }
                  }
                },
                description:
                  "Function to calculate the score of the student's recall attempt and provide constructive feedback."
              }
            }
          ]
        })
        .on("message", msg => console.log(msg))
        .on("finalFunctionCall", (result: any) => {
          console.log("finalFunctionCall getScore result:", result)
          const functionName = result.function.function.name
          if (functionName === "getScore") {
            newStudyState = "score_updated"
          }
        })

      const stream = OpenAIStream(feedbackRunner)

      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })
    }
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
