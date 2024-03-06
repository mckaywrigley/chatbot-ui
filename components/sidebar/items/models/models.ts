export async function getModels() {
  try {
    const response = await fetch("/api/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    })

    const data = await response.json()
    const models: Array<string> = []

    if (Object.keys(data).length == 0) return models

    for (const model of data.allModels) {
      models.push(model)
    }

    return models
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

export async function sendURL(baseUrl: string) {
  try {
    await fetch("/api/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: baseUrl
      })
    })
    return new Response(JSON.stringify({ message: "success" }))
  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}

export const isValidUrl = urlString => {
  const cleanURL = urlString.replace(/[^\w\s.:/?&=%-<>]/g, "")
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // validate domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*"
  ) // validate port and path

  if (urlPattern.test(cleanURL)) {
    let url

    try {
      url = new URL(cleanURL)
    } catch (e) {
      return false
    }

    return url.protocol === "http:" || url.protocol === "https:"
  } else {
    return false
  }
}

export function removeSearchParams(urlString) {
  try {
    const url = new URL(urlString)
    url.searchParams.forEach((_, paramName) => {
      url.searchParams.delete(paramName)
    })
    return url.toString().slice(0, -1)
  } catch (error) {
    console.error("Error removing search params:", error)
    return urlString
  }
}
