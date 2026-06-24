CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  incorrect_answers INTEGER NOT NULL CHECK (incorrect_answers >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  time_taken_seconds INTEGER NOT NULL CHECK (time_taken_seconds >= 0),
  submit_reason TEXT NOT NULL CHECK (submit_reason IN ('manual', 'auto')),
  config JSONB NOT NULL,
  questions JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_submitted_at ON exam_attempts (submitted_at DESC);
