import { PlatformTool } from "@/types/platformTools"
import { platformToolList } from "../platformToolsList"

import { Tables } from "@/supabase/types"
import { t } from "i18next"

const generateToolSchema = (tool: any) => {
  const paths = tool.toolsFunctions.reduce((acc: any, toolFunction: any) => {
    acc[`/${toolFunction.id}`] = {
      get: {
        description: toolFunction.description,
        operationId: `${tool.toolName}__${toolFunction.id}`,
        parameters: toolFunction.parameters,
        deprecated: false
      }
    }
    return acc
  }, {})

  return JSON.stringify({
    openapi: "3.1.0",
    info: {
      title: tool.name,
      description: tool.description,
      version: tool.version
    },
    servers: [
      {
        url: "local://executor"
      }
    ],
    paths: paths,
    components: {
      schemas: {}
    }
  })
}

const getToolIds = (id: string): string[] => id.split("__")

export const platformToolDefinitionById = (id: string) => {
  const tool = platformToolList.find(tool => tool.id === id)

  if (!tool) {
    throw new Error(t("Tool not found"))
  }

  return platformToolDefinition(tool) as Tables<"tools">
}

export const platformToolDefinition = (tool: PlatformTool) => {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    schema: generateToolSchema(tool) // Assuming "FetchDataFromUrl" is the function ID for all tools for simplicity
  } as Tables<"tools">
}

export const platformToolDefinitions = () => {
  return platformToolList.map(platformToolDefinition) as Tables<"tools">[]
}

export const platformToolFunction = (functionName: string): Function => {
  console.log("functionName", functionName)
  const [toolName, toolFunctionId] = getToolIds(functionName)
  const tool = platformToolList.find(tool => tool.toolName === toolName)
  if (!tool) {
    return () => Promise.resolve("Tool not found.")
  }
  const toolFunction = tool.toolsFunctions.find(
    toolFunction => toolFunction.id === toolFunctionId
  )
  return toolFunction
    ? toolFunction.toolFunction
    : () => Promise.resolve("Tool function not found.")
}
