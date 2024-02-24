export const convert = async (file: Blob): Promise<string> => {
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const textDecoder = new TextDecoder("utf-8")
  return textDecoder.decode(fileBuffer)
}
