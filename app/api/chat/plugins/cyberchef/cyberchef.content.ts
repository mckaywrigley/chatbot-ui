import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

import {
  ProcessAIResponseOptions,
  createGKEHeaders,
  processAIResponseAndUpdateMessage
} from "../chatpluginhandlers"

import { transformUserQueryToCyberChefCommand } from "../plugin-helper/transform-query-to-command"
import { handlePluginStreamError } from "../plugin-helper/plugin-stream"

interface CyberChefParams {
  input: string
  recipe?: string | object | Array<any> // recipe is optional
  args?: object | Array<any>
  outputType?: string
  error?: string | null
}

const parseCyberChefJSONInput = (jsonInput: string): CyberChefParams => {
  const params: CyberChefParams = {
    input: "",
    recipe: undefined,
    args: undefined,
    outputType: "",
    error: null
  }

  try {
    const cleanedInput = jsonInput.replace(/```json\n?|```/g, "").trim()
    const inputData = JSON.parse(cleanedInput)

    if (!inputData.input) {
      params.error = '🚨 Error: "input" parameter is required.'
      return params
    } else {
      params.input = inputData.input
    }

    if (inputData.recipe) {
      if (
        typeof inputData.recipe === "string" ||
        typeof inputData.recipe === "object"
      ) {
        params.recipe = inputData.recipe
      } else {
        params.error = '🚨 Error: Invalid format for "recipe" parameter.'
        return params
      }
    }

    if (inputData.args) {
      if (
        typeof inputData.args === "object" &&
        (Array.isArray(inputData.args) ||
          Object.keys(inputData.args).length > 0)
      ) {
        params.args = inputData.args
      } else {
        params.error = '🚨 Error: Invalid format for "args" parameter.'
        return params
      }
    }

    if (inputData.outputType) {
      params.outputType = inputData.outputType
    }
  } catch (error) {
    params.error = `🚨 Error parsing JSON input: ${error}`
  }

  return params
}

export async function handleCyberchefRequest(
  lastMessage: Message,
  enableCyberChefFeature: boolean,
  OpenAIStream: {
    (
      model: string,
      messages: Message[],
      answerMessage: Message,
      tools: any
    ): Promise<ReadableStream<any>>
    (arg0: any, arg1: any, arg2: any, arg3: any): any
  },
  model: string,
  messagesToSend: Message[],
  answerMessage: Message,
  invokedByToolId: boolean
) {
  if (!enableCyberChefFeature) {
    return new Response("The CyberChef is disabled.")
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "cyberchef_bake",
        description: "Process input data using a specified CyberChef recipe.",
        parameters: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "The input data to be processed by CyberChef"
            },
            recipe: {
              type: ["object", "array"],
              description:
                "The recipe defining operations to be applied to the input. Can be a single operation object or an array of operation objects",
              items: {
                type: "object",
                properties: {
                  op: {
                    type: "string",
                    description: "The operation name"
                  },
                  args: {
                    type: "object",
                    description: "Arguments for the operation, if any"
                  }
                },
                required: ["op"]
              }
            },
            outputType: {
              type: "string",
              enum: ["string", "number", "byteArray"],
              description: "Always included, string by default"
            }
          },
          required: ["input", "recipe", "outputType"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "cyberchef_magic",
        description:
          "Automatically identify and decode/encode the input data using the best-fit CyberChef recipe.",
        parameters: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "The input data to be automatically processed."
            },
            args: {
              type: "object",
              description:
                "Optional arguments to fine-tune the processing, such as depth of analysis."
            }
          },
          required: ["input"]
        }
      }
    }
  ]

  let aiResponse = ""

  const headers = createGKEHeaders()

  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (
        data: string,
        addExtraLineBreaks: boolean = false
      ) => {
        const formattedData = addExtraLineBreaks ? `${data}\n\n` : data
        controller.enqueue(new TextEncoder().encode(formattedData))
      }

      if (invokedByToolId) {
        const options: ProcessAIResponseOptions = {
          tools: tools
        }

        try {
          for await (const chunk of processAIResponseAndUpdateMessage(
            lastMessage,
            transformUserQueryToCyberChefCommand,
            OpenAIStream,
            model,
            messagesToSend,
            answerMessage,
            options
          )) {
            sendMessage(chunk, false)
            aiResponse += chunk
          }

          sendMessage("\n\n")

          // Attempt to find and parse the JSON command from the AI response
          const jsonMatch =
            aiResponse.match(/```json\n([\s\S]*?)\n```/s) ||
            aiResponse.match(/{[\s\S]*}/)
          if (!jsonMatch || !jsonMatch[0]) {
            throw new Error("No valid JSON command found in the AI response.")
          }

          let jsonResponseString = jsonMatch[0]
            .replace(/```json\n|```/g, "")
            .trim()
          const jsonResponse = JSON.parse(jsonResponseString)
          const formattedJsonString = JSON.stringify(jsonResponse, null, 4)
          lastMessage.content = `\`\`\`json\n${formattedJsonString}\n\`\`\``
        } catch (error) {
          console.error(
            `Error extracting and parsing JSON from AI response: ${error}`,
            {
              aiResponse,
              messagesToSend
            }
          )
          return new Response(`\n\nError during CyberChef operation: ${error}`)
        }
      }

      const params = parseCyberChefJSONInput(lastMessage.content)

      if (params.error) {
        handlePluginStreamError(
          params.error,
          invokedByToolId,
          sendMessage,
          controller
        )
        return
      }

      let cyberchefUrl = `${process.env.SECRET_CYBERCHEF_BASE_URL}`

      if (
        !params.recipe ||
        (Array.isArray(params.recipe) && params.recipe.length === 0)
      ) {
        cyberchefUrl += "/magic"
      } else {
        cyberchefUrl += "/bake"
      }

      interface CyberChefRequestBody {
        input?: string
        recipe?: string | object | Array<any>
        args?: object | Array<any>
        outputType?: string
      }

      let requestBody: CyberChefRequestBody = {}

      if (params.input) {
        requestBody.input = params.input
      }
      if (
        params.recipe &&
        !(Array.isArray(params.recipe) && params.recipe.length === 0)
      ) {
        requestBody.recipe = params.recipe
      }
      if (
        params.args &&
        !(Array.isArray(params.args) && params.args.length === 0)
      ) {
        requestBody.args = params.args
      }
      if (params.outputType) {
        requestBody.outputType = params.outputType
      }

      sendMessage("🚀 Starting CyberChef operation. Please wait...", true)

      const intervalId = setInterval(() => {
        sendMessage("⏳ Still working on it, please hold on...", true)
      }, 15000)

      try {
        const cyberchefResponse = await fetch(cyberchefUrl, {
          method: "POST",
          headers: {
            Authorization: `${process.env.SECRET_AUTH_CYBERCHEF}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        })

        if (cyberchefResponse.status === 403) {
          const forbiddenMessage =
            "Access forbidden: received 403 response from CyberChef server."
          sendMessage(forbiddenMessage, true)
          controller.close()
          return new Response(forbiddenMessage)
        }

        const jsonResponse = await cyberchefResponse.json()

        let outputString = ""

        if (
          !params.recipe ||
          (Array.isArray(params.recipe) && params.recipe.length === 0)
        ) {
          if (
            Array.isArray(jsonResponse.value) &&
            jsonResponse.value.length > 0
          ) {
            const firstItem = jsonResponse.value[0]
            if (firstItem && firstItem.data) {
              outputString = firstItem.data
            }
          }
        } else {
          outputString = jsonResponse.value
        }

        if (!outputString || outputString.length === 0) {
          const noDataMessage = `🔍 No output was produced for the given input: "${requestBody}"`
          clearInterval(intervalId)
          sendMessage(noDataMessage, true)
          controller.close()
          return new Response(noDataMessage)
        }

        clearInterval(intervalId)
        sendMessage("✅ CyberChef operation completed successfully.", true)

        const formattedResponse = formatResponseString(outputString, params)
        sendMessage(formattedResponse, true)

        controller.close()
      } catch (error) {
        clearInterval(intervalId)
        console.error("Error:", error)
        const errorMessage =
          error instanceof Error
            ? `🚨 Error: ${error.message}`
            : "🚨 There was a problem during the CyberChef operation. Please try again."
        sendMessage(errorMessage, true)
        controller.close()
      }
    }
  })

  return new Response(stream, { headers })
}

function formatResponseString(outputString: any, params: CyberChefParams) {
  return (
    `# [CyberChef](${pluginUrls.Cyberchef}) Results\n` +
    "```\n" +
    outputString +
    "\n" +
    "```\n"
  )
}
