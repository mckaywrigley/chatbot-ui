--------------- FILE ITEMS ---------------

create table custom_context (
  -- ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- METADATA
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- REQUIRED
  content TEXT NOT NULL,
  local_embedding vector(384), -- 384 works for local w/ Xenova/all-MiniLM-L6-v2
  tokens INT NOT NULL
);

-- INDEXES --

CREATE INDEX custom_context_local_embedding_idx ON custom_context
  USING hnsw (local_embedding vector_cosine_ops);

-- RLS

-- ALTER TABLE custom_context ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow full access to own file items"
--     ON custom_context
--     USING (user_id = auth.uid())
--     WITH CHECK (user_id = auth.uid());
--
-- CREATE POLICY "Allow view access to non-private file items"
--     ON custom_context
--     FOR SELECT
--     USING (file_id IN (
--         SELECT id FROM files WHERE sharing <> 'private'
--     ));

-- TRIGGERS --

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON custom_context
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- FUNCTIONS --

create function match_custom_context_local (
  query_embedding vector(384),
  match_count int DEFAULT null
) returns table (
  id UUID,
  content TEXT,
  tokens INT,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    tokens,
    1 - (custom_context.local_embedding <=> query_embedding) as similarity
  from custom_context
  order by custom_context.local_embedding <=> query_embedding
  limit match_count;
end;
$$;
