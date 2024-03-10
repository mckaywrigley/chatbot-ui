import { PlatformTool } from "@/types/platformTools"
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
const webScraper = async ({
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

  // Fix for relative URLs
  const urlRegex = /href="((?:\.\.\/)*(?:\.\/)*)\/?(?!\/)/g
  mdDoc = mdDoc.replace(
    urlRegex,
    (match, p1) => `href="${new URL(p1, modifiedUrl).href}`
  )

  return { url, mdDoc }
}

// This is the definition of the webscrapping tool.
export const webScraperTool: PlatformTool = {
  id: "b3f07a6e-5e01-423e-9f06-ee51830608be", // This is the unique identifier of the tool.
  name: "Web Scraper Tools", // This is the name of the tool.
  toolName: "webScraperTools", // This is the name of the tool in the code.
  version: "v1.0.0", // This is the version of the tool.
  // This is the description of the tool.
  description: "This tool enables data retrieval from URLs mentioned in chat.",
  toolsFunctions: [
    {
      id: "FetchDataFromUrl", // This is the unique identifier of the tool function.
      toolFunction: webScraper, // This is the function that will be called when the tool function is executed.
      description: "Fetch data from a URL and return it in markdown format.", // This is the description of the tool function.
      parameters: [
        // These are the parameters of the tool function.
        {
          name: "url",
          description: "The url to fetch data from.",
          required: true,
          schema: {
            type: "string"
          }
        }
      ]
    }
  ]
}
