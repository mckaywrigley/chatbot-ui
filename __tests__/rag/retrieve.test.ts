/**
 * @jest-environment node
 *
 * Pure-function tests for the retrieval scorer. Does not hit Postgres.
 */
import { computeScore, fuseAndScore } from "@/lib/rag/retrieve"
import type { MatchRagItemRow } from "@/lib/rag/types"

const mkRow = (overrides: Partial<MatchRagItemRow>): MatchRagItemRow => ({
  id: "r1",
  source_type: "design",
  source_id: "d1",
  content: "hi",
  source_title: "Design",
  source_url: "/d/1",
  source_section: null,
  metadata: {},
  source_updated_at: null,
  similarity: 0,
  bm25_rank: 0,
  age_days: 0,
  ...overrides
})

describe("computeScore", () => {
  test("RRF combines dense + sparse with k=60", () => {
    const onlyDense = computeScore({
      denseRank: 1,
      bm25Rank: null,
      ageDays: 0,
      sourceType: "design"
    })
    const onlySparse = computeScore({
      denseRank: null,
      bm25Rank: 1,
      ageDays: 0,
      sourceType: "design"
    })
    const both = computeScore({
      denseRank: 1,
      bm25Rank: 1,
      ageDays: 0,
      sourceType: "design"
    })
    // 1/(60+1) ≈ 0.01639
    expect(onlyDense).toBeCloseTo(1 / 61, 5)
    expect(onlySparse).toBeCloseTo(1 / 61, 5)
    expect(both).toBeCloseTo(2 / 61, 5)
  })

  test("recency boost halves at 90-day half-life", () => {
    const fresh = computeScore({
      denseRank: 1,
      bm25Rank: null,
      ageDays: 0,
      sourceType: "design"
    })
    const aged = computeScore({
      denseRank: 1,
      bm25Rank: null,
      ageDays: 90,
      sourceType: "design"
    })
    expect(aged / fresh).toBeCloseTo(Math.exp(-1), 4)
  })

  test("chat_message gets 0.7 multiplier", () => {
    const design = computeScore({
      denseRank: 1,
      bm25Rank: null,
      ageDays: 0,
      sourceType: "design"
    })
    const chat = computeScore({
      denseRank: 1,
      bm25Rank: null,
      ageDays: 0,
      sourceType: "chat_message"
    })
    expect(chat / design).toBeCloseTo(0.7, 4)
  })

  test("missing both ranks scores zero", () => {
    expect(
      computeScore({
        denseRank: null,
        bm25Rank: null,
        ageDays: 0,
        sourceType: "file"
      })
    ).toBe(0)
  })
})

describe("fuseAndScore", () => {
  test("ranks by combined score, slices to sourceCount", () => {
    const rows: MatchRagItemRow[] = [
      mkRow({ id: "a", similarity: 0.9, bm25_rank: 0.0 }),
      mkRow({ id: "b", similarity: 0.7, bm25_rank: 0.5 }),
      mkRow({ id: "c", similarity: 0.0, bm25_rank: 0.9 }),
      mkRow({ id: "d", similarity: 0.4, bm25_rank: 0.3 })
    ]
    const top2 = fuseAndScore(rows, 2)
    expect(top2.length).toBe(2)
    // b should win - has both signals (rank-1 sparse, rank-2 dense)
    expect(top2[0].id).toBe("b")
  })

  test("recency demotes older docs over equally-relevant fresh ones", () => {
    const rows: MatchRagItemRow[] = [
      mkRow({ id: "fresh", similarity: 0.5, bm25_rank: 0.5, age_days: 0 }),
      mkRow({ id: "old", similarity: 0.5, bm25_rank: 0.5, age_days: 365 })
    ]
    const ranked = fuseAndScore(rows, 2)
    expect(ranked[0].id).toBe("fresh")
    expect(ranked[1].id).toBe("old")
  })

  test("chat_message penalty: equally-ranked design beats chat", () => {
    const rows: MatchRagItemRow[] = [
      mkRow({
        id: "design",
        source_type: "design",
        similarity: 0.5,
        bm25_rank: 0.5
      }),
      mkRow({
        id: "chat",
        source_type: "chat_message",
        similarity: 0.5,
        bm25_rank: 0.5
      })
    ]
    const ranked = fuseAndScore(rows, 2)
    expect(ranked[0].id).toBe("design")
    expect(ranked[1].id).toBe("chat")
  })

  test("rows with no signals on either side score 0 and rank last", () => {
    const rows: MatchRagItemRow[] = [
      mkRow({ id: "scored", similarity: 0.1, bm25_rank: 0 }),
      mkRow({ id: "noisy", similarity: 0, bm25_rank: 0 })
    ]
    const ranked = fuseAndScore(rows, 5)
    expect(ranked[0].id).toBe("scored")
    expect(ranked[ranked.length - 1].id).toBe("noisy")
    expect(ranked[ranked.length - 1].score).toBe(0)
  })
})

/**
 * Two-pass retrieval for design/report scopes.
 *
 * The RPC ANDs source_type with source_id, so one call can search the design's
 * own document OR files, never both. Because the chunker indexes only
 * FILENAMES for a design/report's attachments and embeds their contents
 * separately under source_type='file', a single document-scoped call left the
 * chat unable to see inside any uploaded file — which is what produced the
 * "I don't have access to that file" answers.
 */
describe("retrieve — file pass for design/report scopes", () => {
  const rpcCalls: any[] = []

  const loadRetrieve = () => {
    jest.resetModules()
    rpcCalls.length = 0
    jest.doMock("@/lib/rag/embed", () => ({
      embedBatch: jest.fn(async () => [[0.1, 0.2, 0.3]])
    }))
    jest.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        rpc: async (_name: string, args: any) => {
          rpcCalls.push(args)
          return { data: [], error: null }
        }
      })
    }))
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@/lib/rag/retrieve").retrieve
  }

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost"
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-key"
  })

  afterEach(() => jest.dontMock("@/lib/rag/embed"))

  test("design scope also searches file content", async () => {
    const retrieve = loadRetrieve()
    await retrieve({
      query: "what is in my data file",
      workspaceId: "w1",
      scope: "design",
      scopeId: "d1",
      sourceCount: 5
    })

    expect(rpcCalls).toHaveLength(2)
    expect(rpcCalls[0].p_source_types).toEqual(["design"])
    expect(rpcCalls[0].p_only_source_ids).toEqual(["d1"])
    // The second pass is what lets the chat read an uploaded file at all.
    expect(rpcCalls[1].p_source_types).toEqual(["file", "project_file"])
    expect(rpcCalls[1].p_only_source_ids).toBeNull()
    expect(rpcCalls[1].p_workspace_id).toBe("w1")
  })

  test("report scope also searches file content", async () => {
    const retrieve = loadRetrieve()
    await retrieve({
      query: "summarise the results",
      workspaceId: "w1",
      scope: "report",
      scopeId: "r1",
      sourceCount: 5
    })

    expect(rpcCalls).toHaveLength(2)
    expect(rpcCalls[0].p_source_types).toEqual(["report"])
    expect(rpcCalls[1].p_source_types).toEqual(["file", "project_file"])
  })

  test("explicitly attached files are the only pass", async () => {
    const retrieve = loadRetrieve()
    await retrieve({
      query: "explain this",
      workspaceId: "w1",
      scope: "design",
      scopeId: "d1",
      sourceCount: 5,
      fileIds: ["f1", "f2"]
    })

    // The caller named the files; a workspace-wide file sweep would only
    // dilute them.
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].p_source_types).toEqual(["file"])
    expect(rpcCalls[0].p_only_source_ids).toEqual(["f1", "f2"])
  })

  test("workspace scope is unchanged — a single pass", async () => {
    const retrieve = loadRetrieve()
    await retrieve({
      query: "anything",
      workspaceId: "w1",
      scope: null,
      scopeId: null,
      sourceCount: 5
    })

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].p_source_types).toBeNull()
  })
})
