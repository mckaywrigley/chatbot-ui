/**
 * @jest-environment node
 *
 * Verifies the Anthropic call shape: cache_control breakpoint sits on
 * the document block, model = haiku 4.5, blurb prepended onto chunk.
 */
export {} // mark as module so top-level decls don't collide across test files
const mockCreate = jest.fn()

jest.mock("@anthropic-ai/sdk", () => {
  const mock = jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate }
  }))
  return { __esModule: true, default: mock }
})

beforeEach(() => {
  mockCreate.mockReset()
  process.env.ANTHROPIC_API_KEY = "test-key"
})

describe("contextualize", () => {
  test("sends doc with cache_control + chunk after, returns blurb", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "blurb about chunk" }]
    })

    const { contextualize } = await import("@/lib/rag/contextualize")
    const out = await contextualize("DOC TEXT", "CHUNK TEXT")
    expect(out).toBe("blurb about chunk")

    const args = mockCreate.mock.calls[0][0]
    expect(args.model).toBe("claude-haiku-4-5-20251001")
    expect(args.max_tokens).toBe(120)
    expect(args.system).toMatch(/retrieval/i)
    const blocks = args.messages[0].content
    expect(blocks[0].text).toContain("DOC TEXT")
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" })
    expect(blocks[1].text).toContain("CHUNK TEXT")
    expect(blocks[1].cache_control).toBeUndefined()
  })

  test("returns empty string on non-text response (defensive)", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] })
    const { contextualize } = await import("@/lib/rag/contextualize")
    const out = await contextualize("D", "C")
    expect(out).toBe("")
  })
})

describe("contextualizeAll", () => {
  test("processes chunks serially so cache stays warm + prepends blurb", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "ctx1" }]
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "ctx2" }]
      })

    const { contextualizeAll } = await import("@/lib/rag/contextualize")
    const out = await contextualizeAll("DOC", ["chunk one", "chunk two"])
    expect(out).toEqual(["ctx1\n\nchunk one", "ctx2\n\nchunk two"])
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  test("falls back to raw chunk on per-chunk failure", async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [{ type: "text", text: "ctxA" }] })
      .mockRejectedValueOnce(new Error("Anthropic 429"))

    const { contextualizeAll } = await import("@/lib/rag/contextualize")
    const out = await contextualizeAll("DOC", ["A", "B"])
    expect(out[0]).toBe("ctxA\n\nA")
    expect(out[1]).toBe("B")
  })
})
