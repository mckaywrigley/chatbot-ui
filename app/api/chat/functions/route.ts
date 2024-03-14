import { StudyState } from "@/lib/assistants"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByLLM
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse, MistralStream } from "ai"
import OpenAI from "openai"
import MistralClient from "@mistralai/mistralai"
import { convertLLMStringToJson } from "@/lib/server/server-utils"
import { parseISO, formatDistanceToNow } from "date-fns/esm"

const callLLM = async (
  chatId: string,
  openai: OpenAI,
  mistral: MistralClient,
  topicDescription: string,
  messages: any[],
  studyState: StudyState,
  recallAnalysis: string
) => {
  let stream, chatResponse, chatStreamResponse, analysis, serverResult
  const messagesWithoutLast = messages.slice(0, -1)
  const studentMessage = await messages[messages.length - 1].content

  switch (studyState) {
    case "recall_first_attempt":
      // GET FORGOTTEN FACTS AND SAVE TO DB
      chatResponse = await mistral.chat({
        model: "open-mixtral-8x7b",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: `Given the original topic source material and a student's recall attempt, perform the following tasks:
            1. Calculate a recall score representing how accurately the student's recall matches the original material. The score should reflect the percentage of the material correctly recalled, ranging from 0 (no recall) to 100 (perfect recall).
            2. Identify any significant omissions in the student's recall. List these omissions as succinctly as possible, providing clear and educational summaries for review.
            
            Output the results in JSON format with the following structure:
            - "score": A numerical value between 0 and 100 indicating the recall accuracy.
            - "forgotten_facts": An array of strings, each summarizing a key fact or concept omitted from the student's recall.
            
            Original topic source material:
            """${topicDescription}"""
            
            Student's recall attempt:
            """${studentMessage}"""
            `
          }
        ]
      } as any)

      analysis = await chatResponse.choices[0]?.message?.content
      console.log("analysis:", analysis)
      const { score, forgotten_facts } = JSON.parse(analysis)

      serverResult = await functionCalledByLLM(
        "updateRecallAnalysis",
        [forgotten_facts],
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error")
      }

      const perfectRecall = score >= 95 // LLM model is not perfect, so we need to set a threshold

      let systemMessage = `You are a study mentor. You help students remember facts on their own by providing hints and clues without giving away answers.`
      let userMessage = `Follow these steps:
1. Commend the student on the facts they've correctly recalled, providing positive reinforcement.
2. Go through each fact recalled by the student and Correct any inaccuracies WITHOUT providing answers to forgotten facts.
3. Offer a hints to help the student recall facts they have omitted by referring to the Topic source only. Make sure the hints are not about the facts they recalled.
4. If no errors are present, offer encouragement and inquire if they wish to proceed to view the topic source.`

      if (perfectRecall) {
        serverResult = await functionCalledByLLM(
          "updateTopicQuizResult",
          [100],
          chatId
        )
        if (serverResult.success === false) {
          throw new Error("Server error")
        }
        systemMessage = "You are a helpful and friendly study tutor."
        userMessage = `Generate upbeat feedback based on the students recall performance. Then ask the student if they wish to revisit the topic's source material to enhance understanding or clarify any uncertainties.`
      }

      chatStreamResponse = await mistral.chatStream({
        model: "open-mixtral-8x7b",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: `${userMessage}

Topic source: """${topicDescription}"""

Student recall: """${studentMessage}"""`
          }
        ]
      })

      stream = MistralStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": perfectRecall ? "score_updated" : "recall_hinting"
        }
      })
    case "recall_hinting":
      // PROVIDE ANSWER TO HINTS AND PERFORRM FINAL SCORE

      chatResponse = await mistral.chat({
        model: "open-mixtral-8x7b",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a friendly and supportive study mentor. You are tasked with helping a student through an active free recall session."
          },
          ...messagesWithoutLast,
          {
            role: "user",
            content: `Given the original topic source material and the student's attempt at recalling after you provided hints, perform the following tasks:
            1. Provide constructive feedback with the answers to each hint using the topic description below.
            2. Then assess the student's overall recall attempt based on all messages in this conversation on a scale from 0 (no recall) to 100 (perfect recall).
            
            Output the results in JSON format with the following structure:
            - "feedback": A string with generated feedback with the answers to hints content.
            - "score": A numerical value between 0 and 100 indicating the recall accuracy.
            
            Original topic source material:
            """${topicDescription}"""
            
            Student's answer to hints:
            """${studentMessage}"""

            Output the results in JSON format only.
            `
          }
        ]
      } as any)

      analysis = await chatResponse.choices[0]?.message?.content
      console.log("analysis:", analysis)

      const { score: final_score, feedback: hint_feedback } =
        convertLLMStringToJson<{
          feedback: string
          score: number
        }>(analysis)

      serverResult = await functionCalledByLLM(
        "updateTopicQuizResult",
        [final_score],
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error")
      }

      const { revise_date } = serverResult
      const date = parseISO(revise_date)
      const dateFromNow = formatDistanceToNow(date)

      chatStreamResponse = await mistral.chatStream({
        model: "open-mixtral-8x7b",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Act as a study mentor, guiding student through active recall sessions. Your tasks include giving detailed feedback, scheduling the next session based on student performance, and suggesting review of source material if needed. Write in a chat message format. Do not write as a letter or email format."
          },
          {
            role: "user",
            content: `Provide concise feedback considering the hint feedback ('${hint_feedback}') and final score (${final_score}) in chat message format, focusing on both strengths and areas for improvement. 
            Inform the student of the next recall session date; ${dateFromNow} from now, to ensure consistent study progress. 
            Ask the student if they wish to revisit the topic's source material to enhance understanding or clarify any uncertainties.`
          }
        ]
      })

      stream = MistralStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": "score_updated"
        }
      })

    case "score_updated":
      if (studentMessage === "Show full topic description.") {
        return new Response(JSON.stringify(topicDescription), {
          status: 200,
          headers: {
            "NEW-STUDY-STATE": "topic_created"
          }
        })
      }

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

    const mistral = new MistralClient(process.env.MISTRAL_API_KEY)

    const response = await callLLM(
      chatId,
      openai,
      mistral,
      topicDescription,
      messages,
      chatStudyState,
      recallAnalysis
    )

    return response
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
