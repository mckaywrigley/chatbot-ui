export interface MessageImage {
  messageId: string
  path: string
  base64: any // base64 image
  url: string
  file: File | null
}
