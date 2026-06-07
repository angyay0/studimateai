# StudyMate API Documentation (En Construcción)

## Endpoints Principales

### Autenticación

#### POST /api/auth/register
Registrar nuevo usuario
```json
{
  "email": "student@example.com",
  "password": "securePassword123",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

**Respuesta (201)**
```json
{
  "id": "user-uuid",
  "email": "student@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "student"
}
```

#### POST /api/auth/login
Login de usuario
```json
{
  "email": "student@example.com",
  "password": "securePassword123"
}
```

**Respuesta (200)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-uuid",
    "email": "student@example.com",
    "role": "student"
  }
}
```

### Documentos

#### GET /api/documents
Listar documentos del usuario

**Headers**
```
Authorization: Bearer <token>
```

**Respuesta (200)**
```json
[
  {
    "id": "doc-uuid",
    "fileName": "Math Textbook.pdf",
    "fileSize": 2048576,
    "uploadedAt": "2026-06-06T10:00:00Z",
    "status": "indexed"
  }
]
```

#### POST /api/documents/upload
Subir nuevo documento

**Headers**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data**
- file: PDF file

**Respuesta (201)**
```json
{
  "id": "doc-uuid",
  "fileName": "Math Textbook.pdf",
  "status": "processing"
}
```

#### DELETE /api/documents/:id
Eliminar documento

**Headers**
```
Authorization: Bearer <token>
```

**Respuesta (204)**
No content

### Chat

#### POST /api/chat
Enviar mensaje

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
  "message": "¿Qué es el teorema de Pitágoras?",
  "documentIds": ["doc-uuid-1", "doc-uuid-2"]
}
```

**Respuesta (200)**
```json
{
  "response": "El teorema de Pitágoras establece...",
  "sources": [
    {
      "documentId": "doc-uuid-1",
      "fileName": "Math Textbook.pdf",
      "snippet": "Teorema de Pitágoras..."
    }
  ]
}
```

### Quizzes

#### POST /api/quizzes/generate
Generar un nuevo quiz

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
  "documentIds": ["doc-uuid"],
  "numQuestions": 10,
  "difficulty": "medium"
}
```

**Respuesta (201)**
```json
{
  "id": "quiz-uuid",
  "questions": [
    {
      "id": "q-1",
      "question": "¿Cuál es...?",
      "options": ["A", "B", "C", "D"],
      "type": "multiple-choice"
    }
  ]
}
```

#### POST /api/quizzes/:id/submit
Enviar respuestas del quiz

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
  "answers": [
    { "questionId": "q-1", "answer": "A" },
    { "questionId": "q-2", "answer": "B" }
  ]
}
```

**Respuesta (200)**
```json
{
  "score": 80,
  "totalQuestions": 10,
  "correctAnswers": 8,
  "results": [
    {
      "questionId": "q-1",
      "correct": true,
      "yourAnswer": "A",
      "explanation": "La respuesta correcta es..."
    }
  ]
}
```

---

**Nota**: Esta es una documentación preliminar. Se actualizará conforme avance el desarrollo.

Ver [DEVELOPMENT.md](DEVELOPMENT.md) para guía de desarrollo.
