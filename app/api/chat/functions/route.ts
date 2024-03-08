import recallAssistants from "@/lib/assistants"
import {
  nextStudyStateForFunction,
  StudyState,
  FunctionCalls
} from "@/lib/assistants"
import {
  checkApiKey,
  getServerProfile,
  functionCalledByOpenAI
} from "@/lib/server/server-chat-helpers"
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export async function POST(request: Request) {
  const json = await request.json()
  const { messages, chatId, chatStudyState, topicDescription } = json as {
    messages: any[]
    chatId: string
    chatStudyState: StudyState
    topicDescription: string
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const studentMessage = messages[messages.length - 1].message.content
    console.log({ studentMessage })

    if (chatStudyState === "recall_first_attempt") {
      const analysisRunner = await openai.beta.chat.completions.stream({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Compare the students recall attempt with the source material.
Then compile a list of correct, incorrect and forgotten facts in JSON format; use keys "correct", "incorrect" and "forgotten" with an array of strings in each. `
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
      console.log("analysis:", analysis)

      const feedbackRunner = await openai.beta.chat.completions.stream({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a friendly and supportive tutor dedicated to guiding the user (student) through an active free recall study session.
Given the analysis of correct, incorrect and forgotten facts, offer positive reinforcement for the facts the student has successfully recalled.
Give the correct answers to the incorrect facts recalled.
If the student forgot facts, offer a hint to the student in a way that does not reveal the answer. 
If the student did not make an error, simply offer them an encouraging comment and ask them if they would like to continue to scoring their attempt.`
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
      // return new StreamingTextResponse(stream, {
      //   headers: {
      //     "NEW-STUDY-STATE": "score"
      //   }
      // })

      return new StreamingTextResponse(stream)
    }

    // const firstResponse = await openai.chat.completions.create({
    //   model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
    //   messages,
    //   tools: recallAssistantFunctions
    // })

    // const message = firstResponse.choices[0].message
    // messages.push(message)
    // const toolCalls = message.tool_calls || []

    // console.log("firstResponse message:", message)

    // if (toolCalls.length === 0) {
    //   // If no tool calls, return the first response directly without a second OpenAI call
    //   return new Response(message.content, {
    //     headers: {
    //       "Content-Type": "application/json",
    //       ...(chatStudyState === "recall_first_attempt" && {
    //         "NEW-STUDY-STATE": "recall_hinting"
    //       })
    //     }
    //   })
    // }

    // // assume only one tool call
    // const toolCall = toolCalls[0]

    // let functionName = toolCall.function.name as FunctionCalls
    // const argumentsString = toolCall.function.arguments.trim()
    // const parsedArgs = JSON.parse(argumentsString)

    // let functionResponse = {}
    // let bodyContent = parsedArgs.requestBody || parsedArgs
    // let toolId = toolCall.id

    // if (functionName === "recallComplete") {
    //   // call openAI with scoring recall agent
    //   messages.push({
    //     tool_call_id: toolCall.id,
    //     role: "tool",
    //     name: functionName,
    //     content: JSON.stringify({ success: true })
    //   })

    //   const secondResponse = await openai.chat.completions.create({
    //     model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
    //     messages
    //   })

    //   const recallSummary = secondResponse.choices[0].message.content

    //   const scoreRecallAssistant = recallAssistants.find(
    //     assistant => assistant.name === "score"
    //   )

    //   if (!scoreRecallAssistant) {
    //     throw new Error("No score assistant found")
    //   }

    //   messages.push({
    //     role: "user",
    //     content: scoreRecallAssistant?.prompt
    //   })

    //   functionName = "updateTopicQuizResult"
    //   const updateTopicQuizResultFunction = scoreRecallAssistant.functions.find(
    //     func => func.function.name === functionName
    //   )
    //   // error if no updateTopicQuizResultFunction is found
    //   if (!updateTopicQuizResultFunction) {
    //     throw new Error("No updateTopicQuizResult function found")
    //   }

    //   const scoreFirstResponse = await openai.chat.completions.create({
    //     model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
    //     messages,
    //     tools: [updateTopicQuizResultFunction] // Wrap the function in an array
    //   })

    //   const scoreMessage = scoreFirstResponse.choices[0].message
    //   messages.push(scoreMessage)

    //   const scoreToolCalls = scoreMessage.tool_calls || []
    //   const finalMessageContent = scoreFirstResponse.choices[0].message.content

    //   if (scoreToolCalls.length === 0) {
    //     return new Response(finalMessageContent, {
    //       headers: {
    //         "Content-Type": "application/json"
    //       }
    //     })
    //   }

    //   const scoreToolCall = scoreToolCalls[0]

    //   const updateTopicQuizArgumentsString =
    //     scoreToolCall.function.arguments.trim()
    //   const updateTopicQuizParsedArgs = JSON.parse(
    //     updateTopicQuizArgumentsString
    //   )

    //   bodyContent =
    //     updateTopicQuizParsedArgs.requestBody || updateTopicQuizParsedArgs

    //   toolId = scoreToolCall.id
    // }

    // functionResponse = await functionCalledByOpenAI(
    //   functionName,
    //   bodyContent,
    //   chatId
    // )

    // messages.push({
    //   tool_call_id: toolId,
    //   role: "tool",
    //   name: functionName,
    //   content: JSON.stringify(functionResponse)
    // })

    // const finalResponse = await openai.chat.completions.create({
    //   model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
    //   messages,
    //   stream: true
    // })

    // const stream = OpenAIStream(finalResponse)

    // const nextStudyState = nextStudyStateForFunction(functionName)

    // if (nextStudyState) {
    //   return new StreamingTextResponse(stream, {
    //     headers: {
    //       "NEW-STUDY-STATE": nextStudyState
    //     }
    //   })
    // } else {
    //   return new StreamingTextResponse(stream)
    // }
  } catch (error: any) {
    console.error(error)
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
