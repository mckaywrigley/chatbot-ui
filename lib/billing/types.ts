/** Coarse feature buckets - MUST match the CHECK constraint on usage_events. */
export type UsageFeature =
  | "design"
  | "lit_search"
  | "chat"
  | "report"
  | "data_collection"
  | "embeddings"
  | "title"
  | "tools"
  | "jarvis"
  | "other"
