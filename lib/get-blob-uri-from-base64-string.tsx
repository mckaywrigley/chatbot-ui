// Helper function to generate blob URI from base64 string
function generateBlobUriFromBase64String(
  base64String: string,
  type = "audio/mp3"
) {
  if (!base64String) {
    return null
  }

  // Convert base64 string to binary data
  const byteCharacters = atob(base64String)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)

  // Create blob from binary data
  const blob = new Blob([byteArray], { type })

  // Generate blob URI
  return URL.createObjectURL(blob)
}

export default generateBlobUriFromBase64String
