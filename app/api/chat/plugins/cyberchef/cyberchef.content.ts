import { Message } from "@/types/chat"
import { pluginUrls } from "@/types/plugins"

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
      toolId: undefined,
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
    return new Response("The CyberChef is disabled.", {
      status: 200
    })
  }

  let aiResponse = ""
  if (invokedByToolId) {
    const answerPrompt = transformUserQueryToCyberChefCommand(lastMessage)
    answerMessage.content = answerPrompt

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

    const openAIResponseStream = await OpenAIStream(
      model,
      messagesToSend,
      answerMessage,
      undefined,
      tools
    )
    const reader = openAIResponseStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      aiResponse += new TextDecoder().decode(value, { stream: true })
    }

    try {
      const jsonMatch =
        aiResponse.match(/```json\n([\s\S]*?)\n```/s) ||
        aiResponse.match(/{[\s\S]*}/)
      if (jsonMatch && jsonMatch[0]) {
        let jsonResponseString = jsonMatch[0]
          .replace(/```json\n|```/g, "")
          .trim()

        const jsonResponse = JSON.parse(jsonResponseString)

        const formattedJsonString = JSON.stringify(jsonResponse, null, 4)

        lastMessage.content = `\`\`\`json\n${formattedJsonString}\n\`\`\``
      } else {
        return new Response(
          `${aiResponse}\n\nNo valid JSON command found in the AI response.`,
          { status: 200 }
        )
      }
    } catch (error) {
      console.error("Error parsing JSON input:", error)
      console.error("Original String:", aiResponse)
      return new Response(
        `${aiResponse}\n\nError parsing JSON input: ${error}`,
        { status: 200 }
      )
    }
  }

  const params = parseCyberChefJSONInput(lastMessage.content)
  if (params.error && invokedByToolId) {
    return new Response(`${aiResponse}\n\n${params.error}`, {
      status: 200
    })
  } else if (params.error) {
    return new Response(params.error, { status: 200 })
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

  const headers = new Headers()
  headers.set("Content-Type", "text/event-stream")
  headers.set("Cache-Control", "no-cache")
  headers.set("Connection", "keep-alive")

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
        sendMessage(aiResponse, true)
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
          return new Response(forbiddenMessage, {
            status: 200
          })
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
          return new Response(noDataMessage, {
            status: 200
          })
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

const transformUserQueryToCyberChefCommand = (lastMessage: Message) => {
  const answerMessage = `
    Query: "${lastMessage.content}"
  
    DON'T USE DOUBLE QUOTES ("") for any variable.
  
    Based on this query, generate a command for the 'CyberChef' tool using the specified operations ('op') and recipe structures, or use CyberChef Magic if the format is not provided. Ensure that the command follows the required JSON format and only includes the provided operations.

    IMPORTANT: The AI response must strictly adhere to the JSON format specified below for CyberChef Bake. For CyberChef Magic, no specific format is required. If user asks for help or explanation related to plugin than help them to understand the plugin and its usage in short form.
  
    FORMAT FOR AI RESPONSE (CyberChef Bake):
    \`\`\`json
    { 
        "input": "[input data]",
        "recipe": "[recipe instructions]",
        "outputType": "[output type]"
    }
    \`\`\`
    Replace '[input data]', '[recipe instructions]', and '[output type]' with the actual data and values. The recipe should be constructed using only the specified operations and their corresponding structures. The 'outputType' should be one of 'string', 'number', or 'byteArray'.
  
    FORMAT FOR AI RESPONSE (CyberChef Magic):
    If no specific format is provided in the query, use CyberChef Magic which automatically determines the best operation to apply:
    \`\`\`json
    {
        "input": "[input data]"
    }
    \`\`\`
  
    CyberChef Operations for Bake:
    - To Hex, To Base64, From Hex, From Base64, To Morse Code, From Morse Code, MD5, SHA1, To Upper case, To Lower case, Entropy, AES Encrypt, AES Decrypt, To Hexdump, To Braille, From Braille, URL Decode
  
    Recipe Construction Guidelines for Bake:
    - The recipe should be an object for a single operation or an array of objects for multiple operations.
    - Each operation object must include 'op' (operation name) and may include 'args' (arguments) if required.
  
    Example Commands (CyberChef Bake):
    For a simple conversion to Base64:
    \`\`\`json
    { "input": "sample text", "recipe": {"op": "To Base64"}, "outputType": "string" }
    \`\`\`
  
    For a combination of operations:
    \`\`\`json
    { 
        "input": "sample text", 
        "recipe": [
            {"op": "To Hex", "args": {"delimiter": "Space"}},
            {"op": "MD5"}
        ],
        "outputType": "string"
    }
    \`\`\`
  
    For an AES encryption followed by a conversion to Hex:
    \`\`\`json
    { 
        "input": "example", 
        "recipe": [
            {"op": "AES Encrypt", "args": {"key": "mysecretkey", "iv": "initialvector"}},
            {"op": "To Hex"}
        ],
        "outputType": "string"
    }
    \`\`\`
    
    Response:`

  return answerMessage
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
