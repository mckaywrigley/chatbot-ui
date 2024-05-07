--------------- FILE ITEMS ---------------

create table file_items (
  -- ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- RELATIONSHIPS
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- METADATA
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ,

  -- SHARING
  sharing TEXT NOT NULL DEFAULT 'private',

  -- REQUIRED
  content TEXT NOT NULL,
  local_embedding vector(384), -- 384 works for local w/ Xenova/all-MiniLM-L6-v2
  openai_embedding vector(1536), -- 1536 for OpenAI
  tokens INT NOT NULL
);

-- INDEXES --

CREATE INDEX file_items_custom_file_id_idx ON file_items_custom(file_id);

CREATE INDEX file_items_custom_embedding_idx ON file_items_custom
  USING hnsw (openai_embedding vector_cosine_ops);

CREATE INDEX file_items_custom_local_embedding_idx ON file_items_custom
  USING hnsw (local_embedding vector_cosine_ops);

-- RLS

ALTER TABLE file_items_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own file items"
    ON file_items_custom
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow view access to non-private file items"
    ON file_items_custom
    FOR SELECT
    USING (file_id IN (
        SELECT id FROM files WHERE sharing <> 'private'
    ));

-- TRIGGERS --

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON file_items_custom
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- FUNCTIONS --

create function match_file_items_custom_local (
  query_embedding vector(384),
  match_count int DEFAULT null,
  file_ids UUID[] DEFAULT null
) returns table (
  id UUID,
  file_id UUID,
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
    file_id,
    content,
    tokens,
    1 - (file_items_custom.local_embedding <=> query_embedding) as similarity
  from file_items_custom
  where (file_id = ANY(file_ids))
  order by file_items_custom.local_embedding <=> query_embedding
  limit match_count;
end;
$$;

create function match_file_items_custom_openai (
  query_embedding vector(1536),
  match_count int DEFAULT null,
  file_ids UUID[] DEFAULT null
) returns table (
  id UUID,
  file_id UUID,
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
    file_id,
    content,
    tokens,
    1 - (file_items_custom.openai_embedding <=> query_embedding) as similarity
  from file_items_custom
  where (file_id = ANY(file_ids))
  order by file_items_custom.openai_embedding <=> query_embedding
  limit match_count;
end;
$$;