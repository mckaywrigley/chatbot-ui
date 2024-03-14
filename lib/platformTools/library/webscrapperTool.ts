import axios from "axios"
import html2md from "html-to-md"

// This is a helper function that fetches data from a URL and returns it.
const fetchAndReturn = async (url: string) => {
  const response = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome"
    }
  })

  return response
}

// This function fetches data from a URL and returns it in markdown format.
export const webscrapper = async ({
  parameters: { url }
}: {
  parameters: { url: string }
}) => {
  if (url === undefined) {
    throw new Error("URL is required")
  }

  if (typeof url !== "string") {
    throw new Error("URL must be a string")
  }

  let modifiedUrl = url
  let mdDoc = ""
  try {
    if (!url.startsWith("http")) {
      modifiedUrl = "http://" + url
      try {
        const scrape = await fetchAndReturn(modifiedUrl)
        mdDoc = html2md(scrape.data)
      } catch (error) {
        modifiedUrl = "https://" + url
        const scrape = await fetchAndReturn(modifiedUrl)
        mdDoc = html2md(scrape.data)
      }
    } else {
      const scrape = await fetchAndReturn(modifiedUrl)
      mdDoc = html2md(scrape.data)
    }
  } catch (error: any) {
    mdDoc = "Failed to fetch the URL: " + error.message
  }

  return { url, mdDoc }
}
