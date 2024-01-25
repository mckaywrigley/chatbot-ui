import {
  extractOpenapiDataBody,
  extractOpenapiDataUrl,
  openapiDataToFunctions
} from "@/lib/openapi-conversion"

const validSchemaURL = JSON.stringify({
  openapi: "3.1.0",
  info: {
    title: "Get weather data",
    description: "Retrieves current weather data for a location.",
    version: "v1.0.0"
  },
  servers: [
    {
      url: "https://weather.example.com"
    }
  ],
  paths: {
    "/location": {
      get: {
        description: "Get temperature for a specific location",
        operationId: "GetCurrentWeather",
        parameters: [
          {
            name: "location",
            in: "query",
            description: "The city and state to retrieve the weather for",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    },
    "/summary": {
      get: {
        description: "Get description of weather for a specific location",
        operationId: "GetWeatherSummary",
        parameters: [
          {
            name: "location",
            in: "query",
            description: "The city and state to retrieve the summary for",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    }
  }
})

describe("extractOpenapiData for url", () => {
  const invalidSchema = JSON.stringify({
    openapi: "2.0" // Invalid version
  })

  it("should parse a valid OpenAPI url schema", () => {
    const result = extractOpenapiDataUrl(validSchemaURL)

    expect(result.title).toBe("Get weather data")
    expect(result.description).toBe(
      "Retrieves current weather data for a location."
    )
    expect(result.url).toBe("https://weather.example.com")
    expect(result.routes).toHaveLength(2)
    expect(result.routes[0].path).toBe("/location")
    expect(result.routes[1].path).toBe("/summary")
  })

  it("should throw an error for an invalid OpenAPI schema", () => {
    expect(() => extractOpenapiDataUrl(invalidSchema)).toThrow(
      "Invalid OpenAPI schema. Only version 3.1.0 is supported."
    )
  })
})

describe("openapiDataToFunctions for url", () => {
  it("should convert OpenAPI data to url functions", () => {
    const result = extractOpenapiDataUrl(validSchemaURL)
    const functions = openapiDataToFunctions(result)

    expect(functions).toHaveLength(2)
    expect(functions[0].function.name).toBe("GetCurrentWeather")
    expect(functions[0].function.description).toBe(
      "Get temperature for a specific location"
    )
    expect(functions[0].function.parameters?.required).toContain("location")

    expect(functions[1].function.name).toBe("GetWeatherSummary")
    expect(functions[1].function.description).toBe(
      "Get description of weather for a specific location"
    )
    expect(functions[1].function.parameters?.required).toContain("location")
  })
})

const validSchemaBody = JSON.stringify({
  openapi: "3.1.0",
  info: {
    title: "Get weather data",
    description: "Retrieves current weather data for a location.",
    version: "v1.0.0"
  },
  servers: [
    {
      url: "https://weather.example.com"
    }
  ],
  paths: {
    "/location": {
      post: {
        description: "Get temperature for a specific location",
        operationId: "GetCurrentWeather",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  location: {
                    type: "string",
                    description:
                      "The city and state to retrieve the weather for",
                    example: "New York, NY"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
})

describe("extractOpenapiData for body", () => {
  const invalidSchema = JSON.stringify({
    openapi: "2.0" // Invalid version
  })

  it("should parse a valid OpenAPI body schema", () => {
    const result = extractOpenapiDataBody(validSchemaBody)

    expect(result.title).toBe("Get weather data")
    expect(result.description).toBe(
      "Retrieves current weather data for a location."
    )
    expect(result.url).toBe("https://weather.example.com")
    expect(result.routes).toHaveLength(1)
    expect(result.routes[0].path).toBe("/location")
    expect(result.routes[0].methods).toHaveLength(1)
    expect(result.routes[0].methods[0].method).toBe("post")
    expect(result.routes[0].methods[0].operationId).toBe("GetCurrentWeather")
    expect(result.routes[0].methods[0].params).toHaveLength(1)
    expect(result.routes[0].methods[0].params[0].name).toBe("location")
    expect(result.routes[0].methods[0].params[0].location).toBe("body")
    expect(result.routes[0].methods[0].params[0].schema.type).toBe("string")
    expect(result.routes[0].methods[0].params[0].required).toBe(true)
    expect(result.routes[0].methods[0].params[0].description).toBe(
      "The city and state to retrieve the weather for"
    )
  })

  it("should throw an error for an invalid OpenAPI schema", () => {
    expect(() => extractOpenapiDataBody(invalidSchema)).toThrow(
      "Invalid OpenAPI schema. Only version 3.1.0 is supported."
    )
  })
})

describe("openapiDataToFunctions for body", () => {
  it("should convert OpenAPI data to body functions", () => {
    const result = extractOpenapiDataBody(validSchemaBody)
    const functions = openapiDataToFunctions(result)

    expect(functions).toHaveLength(1)
    expect(functions[0].function.name).toBe("GetCurrentWeather")
    expect(functions[0].function.description).toBe(
      "Get temperature for a specific location"
    )
    expect(functions[0].function.parameters?.required).toContain("location")
  })
})
