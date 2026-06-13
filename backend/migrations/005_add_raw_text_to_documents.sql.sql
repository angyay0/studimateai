-- Agrega columna raw_text para almacenar el texto plano extraído del PDF.
-- Este texto se usa para RAG (HU-06) y generación de quizzes (HU-07).
-- Se almacena como TEXT porque los PDFs pueden ser muy largos.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS raw_text TEXT;
