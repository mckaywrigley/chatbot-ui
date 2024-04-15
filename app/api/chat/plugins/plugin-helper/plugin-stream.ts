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
