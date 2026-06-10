CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256_hash TEXT NOT NULL,
  storage_key TEXT,
  openai_file_id TEXT,
  openai_vector_store_id TEXT,
  openai_vector_store_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_course_id ON documents (course_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_unique_hash 
ON documents (user_id, COALESCE(course_id::text, ''), sha256_hash) 
WHERE status != 'deleted';
