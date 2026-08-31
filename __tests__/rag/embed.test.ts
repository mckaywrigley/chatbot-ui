/**
 * @jest-environment node
 *
 * Verifies batching behavior + dimensions = 1536 + correct order preserved.
 */
export {} // mark as module so top-level decls don't collide across test files
const mockCreate = jest.fn()

jest.mock("@/lib/azure-openai", () => ({
  __esModule: true,
  getAzureOpenAIEmbeddingsClient: () => ({
    embeddings: { create: mockCreate }
  }),
  getAzureOpenAIEmbeddingsDeployment: () => "test-embed-deployment"
}))

beforeEach(() => {
  mockCreate.mockReset()
})

describe("embedBatch", () => {
  test("returns [] for empty input without calling API", async () => {
    const { embedBatch } = await import("@/lib/rag/embed")
    const out = await embedBatch([])
    expect(out).toEqual([])
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test("single batch (≤100 inputs) → one API call, 1536 dims requested", async () => {
    mockCreate.mockResolvedValueOnce({
      data: [
        { embedding: new Array(1536).fill(0.1) },
        { embedding: new Array(1536).fill(0.2) }
      ]
    })
    const { embedBatch } = await import("@/lib/rag/embed")
    const out = await embedBatch(["a", "b"])
    expect(out.length).toBe(2)
    expect(out[0][0]).toBe(0.1)
    expect(out[1][0]).toBe(0.2)
    expect(mockCreate).toHaveBeenCalledTimes(1)
    expect(mockCreate.mock.calls[0][0].dimensions).toBe(1536)
    expect(mockCreate.mock.calls[0][0].input).toEqual(["a", "b"])
  })

  test("> 100 inputs → split into batches, order preserved", async () => {
    mockCreate.mockImplementation(({ input }: any) => ({
      data: input.map((s: string) => ({
        embedding: new Array(1536).fill(s.charCodeAt(0))
      }))
    }))
    const { embedBatch } = await import("@/lib/rag/embed")
    const inputs = Array.from({ length: 250 }, (_, i) =>
      String.fromCharCode(65 + (i % 26))
    )
    const out = await embedBatch(inputs)
    expect(out.length).toBe(250)
    expect(mockCreate).toHaveBeenCalledTimes(3) // 100 + 100 + 50
    expect(out[0][0]).toBe(inputs[0].charCodeAt(0))
    expect(out[150][0]).toBe(inputs[150].charCodeAt(0))
  })
})
