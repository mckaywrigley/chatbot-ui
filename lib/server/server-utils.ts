export function createResponse(data: object, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  })
}

export function convertLLMStringToJson<T>(inputString: string): T {
  // Extract the JSON structure starting from the first '{' until the last '}'
  const jsonPart = inputString.substring(
    inputString.indexOf("{"),
    inputString.lastIndexOf("}") + 1
  )

  try {
    const jsonObject: T = JSON.parse(jsonPart)
    return jsonObject
  } catch (error) {
    throw new Error("Invalid JSON format.")
  }
}

// Use the function with different types of input strings as needed
