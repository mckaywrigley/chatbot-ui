import {
  extractOpenapiData,
  openapiDataToFunctions
} from "@/lib/openapi-conversion"

const validSchema = JSON.stringify({
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

describe("extractOpenapiData", () => {
  const invalidSchema = JSON.stringify({
    openapi: "2.0" // Invalid version
  })

  it("should parse a valid OpenAPI schema", () => {
    const result = extractOpenapiData(validSchema)

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
    expect(() => extractOpenapiData(invalidSchema)).toThrow(
      "Invalid OpenAPI schema. Only version 3.1.0 is supported."
    )
  })
})

describe("openapiDataToFunctions", () => {
  it("should convert OpenAPI data to functions", () => {
    const result = extractOpenapiData(validSchema)
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
