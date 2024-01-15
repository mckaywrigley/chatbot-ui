import { openapiToFunctions } from "@/lib/openapi-to-functions"

describe("openapiToFunctions", () => {
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
      }
    }
  })

  const invalidSchema = JSON.stringify({
    openapi: "2.0" // Invalid version
    // ... rest of the schema
  })

  it("should parse a valid OpenAPI schema", () => {
    const result = openapiToFunctions(validSchema)
    expect(result.title).toBe("Get weather data")
    expect(result.description).toBe(
      "Retrieves current weather data for a location."
    )
    expect(result.url).toBe("https://weather.example.com")
    expect(result.routes).toHaveLength(1)
    expect(result.routes[0].path).toBe("/location")
    // Add more assertions as needed
  })

  it("should throw an error for an invalid OpenAPI schema", () => {
    expect(() => openapiToFunctions(invalidSchema)).toThrow(
      "Invalid OpenAPI schema. Only version 3.1.0 is supported."
    )
  })

  // Add more tests as needed
})
