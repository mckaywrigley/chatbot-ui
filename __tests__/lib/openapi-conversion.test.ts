import { openapiToFunctions } from "@/lib/openapi-conversion"

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
  it("should parse a valid OpenAPI url schema", async () => {
    const { info, routes, functions } = await openapiToFunctions(
      JSON.parse(validSchemaURL)
    )

    expect(info.title).toBe("Get weather data")
    expect(info.description).toBe(
      "Retrieves current weather data for a location."
    )
    expect(info.server).toBe("https://weather.example.com")

    expect(routes).toHaveLength(2)

    expect(functions).toHaveLength(2)
    expect(functions[0].function.name).toBe("GetCurrentWeather")
    expect(functions[1].function.name).toBe("GetWeatherSummary")
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
  it("should parse a valid OpenAPI body schema", async () => {
    const { info, routes, functions } = await openapiToFunctions(
      JSON.parse(validSchemaBody)
    )

    expect(info.title).toBe("Get weather data")
    expect(info.description).toBe(
      "Retrieves current weather data for a location."
    )
    expect(info.server).toBe("https://weather.example.com")

    expect(routes).toHaveLength(1)
    expect(routes[0].path).toBe("/location")
    expect(routes[0].method).toBe("post")
    expect(routes[0].operationId).toBe("GetCurrentWeather")

    expect(functions).toHaveLength(1)
    expect(
      functions[0].function.parameters.properties.requestBody.properties
        .location.type
    ).toBe("string")
    expect(
      functions[0].function.parameters.properties.requestBody.properties
        .location.description
    ).toBe("The city and state to retrieve the weather for")
  })
})

const validSchemaBody2 = JSON.stringify({
  openapi: "3.1.0",
  info: {
    title: "Polygon.io Stock and Crypto Data API",
    description:
      "API schema for accessing stock and crypto data from Polygon.io.",
    version: "1.0.0"
  },
  servers: [
    {
      url: "https://api.polygon.io"
    }
  ],
  paths: {
    "/v1/open-close/{stocksTicker}/{date}": {
      get: {
        summary: "Get Stock Daily Open and Close",
        description: "Get the daily open and close for a specific stock.",
        operationId: "getStockDailyOpenClose",
        parameters: [
          {
            name: "stocksTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "date",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "date"
            }
          }
        ]
      }
    },
    "/v2/aggs/ticker/{stocksTicker}/prev": {
      get: {
        summary: "Get Stock Previous Close",
        description: "Get the previous closing data for a specific stock.",
        operationId: "getStockPreviousClose",
        parameters: [
          {
            name: "stocksTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    },
    "/v3/trades/{stockTicker}": {
      get: {
        summary: "Get Stock Trades",
        description: "Retrieve trades for a specific stock.",
        operationId: "getStockTrades",
        parameters: [
          {
            name: "stockTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    },
    "/v3/trades/{optionsTicker}": {
      get: {
        summary: "Get Options Trades",
        description: "Retrieve trades for a specific options ticker.",
        operationId: "getOptionsTrades",
        parameters: [
          {
            name: "optionsTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    },
    "/v2/last/trade/{optionsTicker}": {
      get: {
        summary: "Get Last Options Trade",
        description: "Get the last trade for a specific options ticker.",
        operationId: "getLastOptionsTrade",
        parameters: [
          {
            name: "optionsTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    },
    "/v1/open-close/crypto/{from}/{to}/{date}": {
      get: {
        summary: "Get Crypto Daily Open and Close",
        description:
          "Get daily open and close data for a specific cryptocurrency.",
        operationId: "getCryptoDailyOpenClose",
        parameters: [
          {
            name: "from",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "to",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "date",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "date"
            }
          }
        ]
      }
    },
    "/v2/aggs/ticker/{cryptoTicker}/prev": {
      get: {
        summary: "Get Crypto Previous Close",
        description:
          "Get the previous closing data for a specific cryptocurrency.",
        operationId: "getCryptoPreviousClose",
        parameters: [
          {
            name: "cryptoTicker",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          }
        ]
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key"
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ]
})

describe("extractOpenapiData for body 2", () => {
  it("should parse a valid OpenAPI body schema for body 2", async () => {
    const { info, routes, functions } = await openapiToFunctions(
      JSON.parse(validSchemaBody2)
    )

    expect(info.title).toBe("Polygon.io Stock and Crypto Data API")
    expect(info.description).toBe(
      "API schema for accessing stock and crypto data from Polygon.io."
    )
    expect(info.server).toBe("https://api.polygon.io")

    expect(routes).toHaveLength(7)
    expect(routes[0].path).toBe("/v1/open-close/{stocksTicker}/{date}")
    expect(routes[0].method).toBe("get")
    expect(routes[0].operationId).toBe("getStockDailyOpenClose")

    expect(functions[0].function.parameters.properties).toHaveProperty(
      "stocksTicker"
    )
    expect(functions[0].function.parameters.properties.stocksTicker.type).toBe(
      "string"
    )
    expect(
      functions[0].function.parameters.properties.stocksTicker
    ).toHaveProperty("required", true)
    expect(functions[0].function.parameters.properties).toHaveProperty("date")
    expect(functions[0].function.parameters.properties.date.type).toBe("string")
    expect(functions[0].function.parameters.properties.date).toHaveProperty(
      "format",
      "date"
    )
    expect(functions[0].function.parameters.properties.date).toHaveProperty(
      "required",
      true
    )
    expect(routes[1].path).toBe("/v2/aggs/ticker/{stocksTicker}/prev")
    expect(routes[1].method).toBe("get")
    expect(routes[1].operationId).toBe("getStockPreviousClose")
    expect(functions[1].function.parameters.properties).toHaveProperty(
      "stocksTicker"
    )
    expect(functions[1].function.parameters.properties.stocksTicker.type).toBe(
      "string"
    )
    expect(
      functions[1].function.parameters.properties.stocksTicker
    ).toHaveProperty("required", true)
  })
})
