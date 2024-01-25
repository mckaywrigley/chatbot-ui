import OpenAI from "openai"

interface Parameter {
  name: string
  in: string
  description: string
  required: boolean
  schema: { type: string }
}

interface SchemaDetail {
  description?: string
  type: string
}

interface OpenAPIData {
  title: string
  description: string
  url: string
  routes: {
    path: string
    methods: {
      method: string
      description: string
      operationId: string
      params: {
        name: string
        location: string
        description: string
        required: boolean
        schema: { type: string }
      }[]
    }[]
  }[]
}

export const extractOpenapiDataUrl = (schema: string): OpenAPIData => {
  const schemaObject = JSON.parse(schema)

  if (!schemaObject.openapi || schemaObject.openapi !== "3.1.0") {
    throw new Error("Invalid OpenAPI schema. Only version 3.1.0 is supported.")
  }

  const title = schemaObject.info.title
  const description = schemaObject.info.description
  const url = schemaObject.servers[0].url

  const paths = schemaObject.paths
  const routes = Object.keys(paths).map(path => {
    const methods = Object.keys(paths[path]).map(method => {
      const { description, operationId, parameters } = paths[path][method]

      const params = parameters.map((param: Parameter) => {
        const { name, in: location, description, required, schema } = param

        return {
          name,
          location,
          description,
          required,
          schema
        }
      })

      return {
        method,
        description,
        operationId,
        params
      }
    })

    return {
      path,
      methods
    }
  })

  return {
    title,
    description,
    url,
    routes
  }
}

export const extractOpenapiDataBody = (schemaString: string): OpenAPIData => {
  const schema = JSON.parse(schemaString)

  if (schema.openapi !== "3.1.0") {
    throw new Error("Invalid OpenAPI schema. Only version 3.1.0 is supported.")
  }

  const title = schema.info.title
  const description = schema.info.description
  const url = schema.servers[0].url

  const routes = Object.entries(schema.paths).map(([path, pathItem]) => {
    const methods = Object.entries(pathItem as Record<string, any>).map(
      ([method, methodData]) => {
        const params = methodData.requestBody?.content["application/json"]
          ?.schema?.properties
          ? Object.entries(
              methodData.requestBody.content["application/json"].schema
                .properties
            ).map(([name, schemaDetail]) => {
              const detail = schemaDetail as SchemaDetail
              const required = methodData.requestBody.required || false

              return {
                name,
                location: "body",
                schema: { type: detail.type },
                required,
                description: detail.description || ""
              }
            })
          : []

        return {
          method,
          operationId: methodData.operationId || "",
          description: methodData.description || "",
          params
        }
      }
    )

    return {
      path,
      methods
    }
  })

  return {
    title,
    description,
    url,
    routes
  }
}

export const openapiDataToFunctions = (data: OpenAPIData) => {
  let functions: OpenAI.Chat.Completions.ChatCompletionTool[] = []

  data.routes.map(route => {
    route.methods.map(method => {
      let properties: any = {}
      let required: string[] = []

      method.params.map(param => {
        properties[param.name] = {
          type: param.schema.type,
          description: param.description
        }

        if (param.required) {
          required.push(param.name)
        }
      })

      functions.push({
        type: "function",
        function: {
          name: method.operationId,
          description: method.description,
          parameters: {
            type: "object",
            properties: properties,
            required: required
          }
        }
      })
    })
  })

  return functions
}
