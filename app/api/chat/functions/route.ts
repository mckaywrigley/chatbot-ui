import { StudyState, getQuickResponseByUserText } from "@/lib/studyStates"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByLLM
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse, MistralStream } from "ai"
import OpenAI from "openai"
import MistralClient from "@mistralai/mistralai"
import { parseISO, formatDistanceToNow } from "date-fns/esm"

// export const runtime = "edge"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const callLLM = async (
  chatId: string,
  openai: OpenAI,
  mistral: MistralClient,
  topicDescription: string,
  messages: any[],
  studyState: StudyState,
  studentMessage: { content: string; role: string }
) => {
  let stream, chatResponse, chatStreamResponse, analysis, serverResult
  let newStudyState: StudyState
  let defaultModel = "mistral-medium-latest"
  const copyEditResponse = `You are an upbeat, encouraging tutor who helps the student to develop a detailed topic description; the goal of which is to serve as comprehensive learning resources for future study. 
Only ask one question at a time.
First, the student will provide a topic name and possibly a topic description with source learning materials or ideas, whether in structured formats (like course webpages, PDFs from books) or unstructured notes or insights.
Given this source information, copy edit the content. In addition outline the key facts in a list.
Next, ask the student if they would like to change anything. Wait for a response.`
  const finalFeedback = `Finally, ask the student if they wish to revisit the topic's source material to enhance understanding or clarify any uncertainties.`

  switch (studyState) {
    case "topic_creation":
      chatStreamResponse = await mistral.chatStream({
        model: defaultModel,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: copyEditResponse
          },
          ...messages
        ]
      })

      stream = MistralStream(chatStreamResponse)
      newStudyState = "topic_edit"
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })

    case "topic_updated":
    case "topic_edit":
      // TOPIC MANAGEMENT ///////////////////////////////

      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "updateTopicContent",
            description:
              "This function updates the detailed topic description based on student inputs and finalized content.",
            parameters: {
              type: "object",
              required: ["description"],
              properties: {
                content: {
                  type: "string",
                  description: "The full topic content to be saved."
                }
              }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "testMeNow",
            description:
              "This function initiates a topic recall session immediately upon student's request.",
            parameters: {
              type: "object",
              properties: {
                start_test: {
                  type: "boolean",
                  description: "Flag to start the test immediately."
                }
              },
              required: ["start_test"]
            }
          }
        }
      ]

      let toolMessages = [
        {
          role: "system",
          content: `${copyEditResponse}
  If the student wants to change anything, work with the student to change the topic content. Always use the the tool/functional "updateTopicContent" and pass the final generated topic description. If you update the topic content, ask if the student wants to start the recall session immediately.`
        },
        ...messages
      ]

      chatResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: toolMessages,
        tools
      })

      const message = chatResponse.choices[0].message
      toolMessages.push(message)
      const toolCalls = message.tool_calls || []

      if (toolCalls.length === 0) {
        return new Response(message.content, {
          headers: {
            "Content-Type": "application/json"
          }
        })
      }

      newStudyState = "topic_updated"
      for (const toolCall of toolCalls) {
        let functionName = toolCall.function.name
        const argumentsString = toolCall.function.arguments.trim()
        const parsedArgs = JSON.parse(argumentsString)

        let functionResponse = {}
        let bodyContent = parsedArgs.requestBody || parsedArgs
        let toolId = toolCall.id

        if (functionName === "updateTopicContent") {
          functionResponse = await functionCalledByLLM(
            "updateTopicContent",
            bodyContent,
            chatId
          )
        } else {
          // has to be testMeNow
          functionResponse = { success: true }
          newStudyState = "recall_first_attempt"
        }

        toolMessages.push({
          tool_call_id: toolId,
          role: "tool",
          name: functionName,
          content: JSON.stringify(functionResponse)
        })
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: toolMessages,
        stream: true
      })

      stream = OpenAIStream(secondResponse)

      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })

    case "recall_first_attempt":
      // GET FORGOTTEN FACTS AND SCORE AND SAVE TO DB ///////////////////////////////
      chatResponse = await mistral.chat({
        model: defaultModel,
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
            """${studentMessage.content}"""
            `
          }
        ]
      } as any)

      analysis = await chatResponse.choices[0]?.message?.content
      console.log("analysis:", analysis)
      const { score, forgotten_facts } = JSON.parse(analysis)

      serverResult = await functionCalledByLLM(
        "updateRecallAnalysis",
        {
          recall_analysis: JSON.stringify(forgotten_facts)
        },
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error")
      }

      // WORK OUT IF PERFECT SCORE
      // ROUTE TO HINTING OR SCORE UPDATED

      const perfectRecall = score >= 95 // LLM model is not perfect, so we need to set a threshold

      serverResult = await functionCalledByLLM(
        "updateTopicQuizResult",
        {
          test_result: perfectRecall ? 100 : score
        },
        chatId
      )
      if (serverResult.success === false) {
        throw new Error("Server error saving score.")
      }

      const { revise_date } = serverResult
      const date = parseISO(revise_date)
      const dateFromNow = formatDistanceToNow(date)

      const scoreFeedback = `Inform the student of their recall score: ${score}% and the next recall session date; ${dateFromNow} from now, to ensure consistent study progress.`

      let systemMessage = `You are a study mentor. You help students remember facts on their own by providing hints and clues without giving away answers.`
      let userMessage = `Follow these steps:
1. Commend the student on the facts they've correctly recalled, providing positive reinforcement.
2. Go through each fact recalled by the student and Correct any inaccuracies WITHOUT providing answers to forgotten facts.
3. Offer a hints to help the student recall facts they have omitted by referring to the Topic source only. Make sure the hints are not about the facts they recalled.
4. ${scoreFeedback}`
      newStudyState = "recall_hinting"

      if (perfectRecall) {
        systemMessage = "You are a helpful and friendly study tutor."
        userMessage = `Generate upbeat feedback based on the students recall performance. 
${scoreFeedback}
${finalFeedback}`
        newStudyState = "recall_finished"
      }

      chatStreamResponse = await mistral.chatStream({
        model: defaultModel,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: `${userMessage}

Topic source: """${topicDescription}"""

Student recall: """${studentMessage.content}"""`
          }
        ]
      })

      stream = MistralStream(chatStreamResponse)
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })
    case "recall_hinting":
      // PROVIDE ANSWER TO HINTS  ////////////////////
      chatStreamResponse = await mistral.chatStream({
        model: defaultModel,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `Act as a study mentor, guiding student through active recall sessions. Do not calculate the score again.
Given the original topic source material and the student's attempt at recalling after you provided hints, perform the following tasks:
1. Provide friendly supportive constructive feedback with the answers to each hint using the topic description below.
2. ${finalFeedback}
            
Original topic source material:
"""${topicDescription}"""`
          },
          ...messages
        ]
      })

      console.log("recall_hinting streaming ")

      stream = MistralStream(chatStreamResponse)
      newStudyState = "recall_finished"
      return new StreamingTextResponse(stream, {
        headers: {
          "NEW-STUDY-STATE": newStudyState
        }
      })

    case "recall_finished":
    case "reviewing":
      // SHOW FULL TOPIC DESCRIPTION ///////////////////////////////

      chatStreamResponse = await mistral.chatStream({
        model: defaultModel,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Act as a study mentor, guiding student through active recall sessions."
          },
          ...messages
        ]
      })

      stream = MistralStream(chatStreamResponse)
      return new StreamingTextResponse(stream)

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
    const { messages, chatId, chatStudyState, topicDescription } = json

    const studentMessage = messages[messages.length - 1]

    const quickResponse = getQuickResponseByUserText(studentMessage.content)
    if (quickResponse && quickResponse.responseText !== "LLM") {
      const responseText =
        quickResponse.responseText === "{{topicDescription}}"
          ? topicDescription
          : quickResponse.responseText

      return new Response(responseText, {
        status: 200,
        headers: {
          "NEW-STUDY-STATE": quickResponse.newStudyState
        }
      })
    }

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
      studentMessage
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
