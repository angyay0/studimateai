CREATE TABLE IF NOT EXISTS generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  citations JSONB,
  difficulty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_questions_user_id ON generated_questions (user_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_course_id ON generated_questions (course_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_document_id ON generated_questions (document_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_difficulty ON generated_questions (difficulty);
CREATE INDEX IF NOT EXISTS idx_generated_questions_type ON generated_questions (question_type);
