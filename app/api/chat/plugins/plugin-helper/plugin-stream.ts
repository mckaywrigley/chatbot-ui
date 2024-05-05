export const handlePluginStreamError = (
  errorMessage: string,
  invokedByToolId: boolean,
  sendMessage: (data: string, addExtraLineBreaks: boolean) => void,
  controller: ReadableStreamController<string>
) => {
  const formattedErrorMessage = invokedByToolId
    ? `\n\n${errorMessage}`
    : errorMessage
  sendMessage(formattedErrorMessage, true)
  controller.close()
}

export function handlePluginError(
  response: Response,
  intervalId: NodeJS.Timeout,
  controller: ReadableStreamDefaultController,
  sendMessage: (message: string, addExtraLineBreaks: boolean) => void
) {
  return async () => {
    if (!response.ok) {
      const errorData = await response.json()
      const errorMessage = errorData.error || "Unknown error occurred"

      sendMessage(`🚨 Plugin scan failed with status ${response.status}`, true)
      sendMessage(`\`\`\`\n${errorMessage}\n\`\`\``, false)
      clearInterval(intervalId)
      controller.close()
      return new Response("Error fetching plugin data.", {
        status: response.status
      })
    }
  }
}
