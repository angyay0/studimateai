CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL
    CHECK (file_size > 0),

  mime_type TEXT NOT NULL
    CHECK (mime_type = 'application/pdf'),

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'processing',
        'indexed',
        'error'
      )
    ),

  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON documents (user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_uploaded_at
  ON documents (user_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_status
  ON documents (status);
