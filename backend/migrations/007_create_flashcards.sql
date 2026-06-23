CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- Spaced repetition metadata (SM-2 algorithm)
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_document_id ON flashcards (document_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_document ON flashcards (user_id, document_id);
