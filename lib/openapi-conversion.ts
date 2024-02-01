import $RefParser from "@apidevtools/json-schema-ref-parser"

interface OpenAPIData {
  info: {
    title: string
    description: string
    server: string
  }
  routes: {
    path: string
    method: string
    operationId: string
  }[]
  functions: any
}

export const openapiToFunctions = async (
  openapiSpec: any
): Promise<OpenAPIData> => {
  const functions: any[] = [] // Define a proper type for function objects
  const routes: { path: string; method: string; operationId: string }[] = []

  for (const [path, methods] of Object.entries(openapiSpec.paths)) {
    // Check if methods is an object
    if (typeof methods !== "object" || methods === null) {
      continue // Skip this iteration if methods is not an object
    }

    for (const [method, specWithRef] of Object.entries(
      methods as Record<string, any>
    )) {
      // 1. Resolve JSON references.
      const spec: any = await $RefParser.dereference(specWithRef)

      // 2. Extract a name for the functions.
      const functionName = spec.operationId

      // 3. Extract a description and parameters.
      const desc = spec.description || spec.summary || ""

      const schema: { type: string; properties: any; required?: string[] } = {
        type: "object",
        properties: {}
      }

      const reqBody = spec.requestBody?.content?.["application/json"]?.schema
      if (reqBody) {
        schema.properties.requestBody = reqBody
      }

      const params = spec.parameters || []
      if (params.length > 0) {
        const paramProperties = params.reduce((acc: any, param: any) => {
          if (param.schema) {
            acc[param.name] = param.schema
          }
          return acc
        }, {})

        schema.properties.parameters = {
          type: "object",
          properties: paramProperties
        }
      }

      functions.push({
        type: "function",
        function: {
          name: functionName,
          description: desc,
          parameters: schema
        }
      })

      // Add route information to the routes array
      routes.push({
        path,
        method,
        operationId: functionName
      })
    }
  }

  return {
    info: {
      title: openapiSpec.info.title,
      description: openapiSpec.info.description,
      server: openapiSpec.servers[0].url
    },
    routes,
    functions
  }
}
