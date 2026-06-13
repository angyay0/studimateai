CREATE TABLE IF NOT EXISTS vector_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID,
  openai_vector_store_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vector_stores_user_id ON vector_stores (user_id);
CREATE INDEX IF NOT EXISTS idx_vector_stores_course_id ON vector_stores (course_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vector_stores_unique 
ON vector_stores (user_id, COALESCE(course_id::text, ''));
