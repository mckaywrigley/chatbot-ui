export const consumeReadableStream = async (
  stream: ReadableStream<Uint8Array> | null,
  callback: (chunk: any) => void,
  signal: AbortSignal
) => {
  const reader = stream?.getReader()
  const decoder = new TextDecoder()

  if (reader) {
    try {
      while (true) {
        if (signal.aborted) {
          break
        }

        const { done, value } = await reader.read()

        if (done) {
          break
        }

        if (value) {
          callback(decoder.decode(value))
        }
      }
    } catch (error) {
      console.error("Error consuming stream:", error)
    } finally {
      reader.releaseLock()
    }
  }
}
