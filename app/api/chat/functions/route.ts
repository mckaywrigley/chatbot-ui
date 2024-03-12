import { StudyState } from "@/lib/assistants"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByOpenAI
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

const callLLM = async (
  chatId: string,
  openai: OpenAI,
  topicDescription: string,
  messages: any[],
  studyState: StudyState,
  recallAnalysis: string
) => {
  let stream
  const messagesWithoutLast = messages.slice(0, -1)
  const studentMessage = await messages[messages.length - 1].content

  switch (studyState) {
    case "recall_first_attempt":
      const firstMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          {
            role: "system",
            content: `"Given the student's recall attempt and the original source material, identify omissions. 
  Please provide the results of forgotten facts in JSON format using key 'forgotten_facts'. 
  Each list should contain strings that succinctly summarise the omissions. Ensure the facts are presented clearly for educational review."`
          },
          {
            role: "user",
            content: `Topic source: """${topicDescription}"""
Student recall: """${studentMessage}"""`
          }
        ]

      console.log({ firstMessages })
      const analysisRunner = await openai.chat.completions.create({
        stream: false,
        model: "gpt-3.5-turbo",
        messages: firstMessages,
        response_format: { type: "json_object" }
      })

      const analysis = await analysisRunner.choices[0]?.message?.content
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
            content: `You are a friendly and supportive tutor. Follow these steps:
    1. Commend the student on the facts they've correctly recalled, providing positive reinforcement.
    2. Correct any inaccuracies in the student's recall, supplying the right information. DO NOT PROVIDE ANSWERS TO FORGOTTEN FACTS.
    3. For any forgotten facts, offer a hint for each item in the Forgotton facts list that will encourage recall without directly giving away the answer. 
    4. If no errors are present, offer encouragement and inquire if they wish to proceed to view the topic source.`
          },
          {
            role: "user",
            content: `Topic source: """${topicDescription}"""
    Student recall: """${studentMessage}"""
    Forgotton facts: """${analysis}"""`
          }
        ]
      })

      stream = OpenAIStream(feedbackRunner)
      return { stream, newStudyState: "recall_hinting" }
    case "recall_hinting":
      const updateTopicQuizResult = async (response: { score: number }) => {
        const serverResult = await functionCalledByOpenAI(
          "updateTopicQuizResult",
          [response.score],
          chatId
        )
        if (serverResult.success === false) {
          return { success: false }
        }
        return { success: true }
      }

      const newMessages = [
        {
          role: "system",
          content: `Compare the source material below with the students recall attempt(s) for this conversation. 
          Assess the student's recall attempt on a scale from 0 (no recall) to 100 (perfect recall). Consider the accuracy, detail, and number of facts recalled in your scoring.
          Call the tool/function updateTopicQuizResult with score to save to database.
          Confirm Score with the User: Present the recall score to the student with a confirmation message, e.g.: \"Based on our session, I'd score your recall at [insert score here] out of 100. This reflects the great details you've remembered. Do you feel this score accurately represents your recall attempt?\"
          The student can change the score if they so wish.
          <source>${topicDescription}</source>`
        },
        ...messages
      ]

      const feedbackHinting = await openai.beta.chat.completions.runTools({
        stream: true,
        model: "gpt-3.5-turbo",
        messages: newMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "updateTopicQuizResult",
              description:
                "This function updates the free recall and quiz test result for a topic.",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "integer" }
                }
              },
              function: updateTopicQuizResult,
              parse: JSON.parse
            }
          }
        ]
      })

      stream = OpenAIStream(feedbackHinting)
      return { stream, newStudyState: "score_updated" }

    default:
      // Handle other states or error
      throw new Error("Invalid study state")
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getServerProfile()
    checkApiKey(profile.openai_api_key, "OpenAI")
    const json = await request.json()
    const {
      messages,
      chatId,
      chatStudyState,
      topicDescription,
      recallAnalysis
    } = json

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const { stream, newStudyState } = await callLLM(
      chatId,
      openai,
      topicDescription,
      messages,
      chatStudyState,
      recallAnalysis
    )

    return new StreamingTextResponse(stream, {
      headers: {
        "NEW-STUDY-STATE": newStudyState
      }
    })
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
