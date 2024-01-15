interface Parameter {
  name: string
  in: string
  description: string
  required: boolean
  schema: { type: string }
}

export const openapiToFunctions = (schema: string) => {
  // EXAMPLE SCHEMA:
  // {
  //     "openapi": "3.1.0",
  //     "info": {
  //       "title": "Get weather data",
  //       "description": "Retrieves current weather data for a location.",
  //       "version": "v1.0.0"
  //     },
  //     "servers": [
  //       {
  //         "url": "https://weather.example.com"
  //       }
  //     ],
  //     "paths": {
  //       "/location": {
  //         "get": {
  //           "description": "Get temperature for a specific location",
  //           "operationId": "GetCurrentWeather",
  //           "parameters": [
  //             {
  //               "name": "location",
  //               "in": "query",
  //               "description": "The city and state to retrieve the weather for",
  //               "required": true,
  //               "schema": {
  //                 "type": "string"
  //               }
  //             }
  //           ]
  //         }
  //       }
  //     }
  //   }
  // EXTRACT:
  // - Title
  // - Description
  // - URL
  // - Paths
  // ---- Route
  // ---- Method
  // ---- Description
  // ---- Operation ID
  // ---- Parameters
  // -------- Name
  // -------- In
  // -------- Description
  // -------- Required
  // -------- Schema
  // Check if schema is valid openapi
  const schemaObject = JSON.parse(schema)

  if (!schemaObject.openapi || schemaObject.openapi !== "3.1.0") {
    throw new Error("Invalid OpenAPI schema. Only version 3.1.0 is supported.")
  }

  // Extract info
  const title = schemaObject.info.title
  const description = schemaObject.info.description
  const url = schemaObject.servers[0].url

  // Extract paths
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
