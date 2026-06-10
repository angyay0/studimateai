import OpenAI from 'openai';
import { openAiConfig, env } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import fs from 'fs';

interface VectorStore {
  id: string;
  userId: string;
  courseId: string | null;
  openaiVectorStoreId: string;
  name: string;
}

interface QueryResult {
  answer: string;
  citations: Array<{
    documentId?: string;
    filename?: string;
    content?: string;
  }>;
}

interface GeneratedQuestion {
  questionText: string;
  questionType: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty?: string;
  citations?: Array<{
    documentId?: string;
    filename?: string;
  }>;
}

export class OpenAIRagService {
  private static client: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.client) {
      if (!openAiConfig.apiKey) {
        throw ApiError.internal('OPENAI_API_KEY no está configurada');
      }
      this.client = new OpenAI({ apiKey: openAiConfig.apiKey });
    }
    return this.client;
  }

  static async getOrCreateVectorStore(params: {
    userId: string;
    courseId?: string | null;
  }): Promise<VectorStore> {
    const { userId, courseId } = params;
    const courseIdValue = courseId || null;

    const existingResult = await query<VectorStore>(
      `SELECT id, user_id as "userId", course_id as "courseId", 
              openai_vector_store_id as "openaiVectorStoreId", name
       FROM vector_stores
       WHERE user_id = $1 AND (course_id = $2 OR (course_id IS NULL AND $2 IS NULL))
       LIMIT 1`,
      [userId, courseIdValue]
    );

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0];
    }

    const client = this.getClient();
    const storeName = courseId
      ? `${env.openaiVectorStorePrefix}-${userId.slice(0, 8)}-course-${courseId.slice(0, 8)}`
      : `${env.openaiVectorStorePrefix}-${userId.slice(0, 8)}`;

    logger.info(`Creando vector store en OpenAI: ${storeName}`);

    const vectorStore = await client.beta.vectorStores.create({
      name: storeName,
    });

    const insertResult = await query<VectorStore>(
      `INSERT INTO vector_stores (user_id, course_id, openai_vector_store_id, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id as "userId", course_id as "courseId", 
                 openai_vector_store_id as "openaiVectorStoreId", name`,
      [userId, courseIdValue, vectorStore.id, storeName]
    );

    return insertResult.rows[0];
  }

  static async uploadAndIndexDocument(params: {
    file: Express.Multer.File;
    userId: string;
    courseId?: string | null;
    documentId: string;
    storageKey: string;
  }): Promise<{
    openaiFileId: string;
    openaiVectorStoreId: string;
    openaiVectorStoreFileId: string;
  }> {
    const { file, userId, courseId, documentId, storageKey } = params;
    const client = this.getClient();

    logger.info(`Subiendo archivo a OpenAI Files API: ${file.originalname}`);

    const fileStream = fs.createReadStream(storageKey);
    const uploadedFile = await client.files.create({
      file: fileStream,
      purpose: 'assistants',
    });

    logger.info(`Archivo subido a OpenAI: ${uploadedFile.id}`);

    const vectorStore = await this.getOrCreateVectorStore({ userId, courseId });

    logger.info(`Adjuntando archivo al vector store: ${vectorStore.openaiVectorStoreId}`);

    const vectorStoreFile = await client.beta.vectorStores.files.create(
      vectorStore.openaiVectorStoreId,
      {
        file_id: uploadedFile.id,
      }
    );

    logger.info(`Archivo adjuntado al vector store: ${vectorStoreFile.id}`);

    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      const fileStatus = await client.beta.vectorStores.files.retrieve(
        vectorStore.openaiVectorStoreId,
        vectorStoreFile.id
      );

      if (fileStatus.status === 'completed') {
        logger.info(`Archivo indexado correctamente: ${vectorStoreFile.id}`);
        break;
      }

      if (fileStatus.status === 'failed' || fileStatus.status === 'cancelled') {
        throw ApiError.internal(
          `Indexación del archivo falló con status: ${fileStatus.status}`
        );
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw ApiError.internal('Timeout esperando indexación del archivo');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return {
      openaiFileId: uploadedFile.id,
      openaiVectorStoreId: vectorStore.openaiVectorStoreId,
      openaiVectorStoreFileId: vectorStoreFile.id,
    };
  }

  static async queryDocuments(params: {
    userId: string;
    courseId?: string | null;
    query: string;
    documentIds?: string[];
    topK?: number;
  }): Promise<QueryResult> {
    const { userId, courseId, query: userQuery, topK = 5 } = params;
    const client = this.getClient();

    const vectorStore = await this.getOrCreateVectorStore({ userId, courseId });

    logger.info(`Consultando documentos con file_search: ${userQuery}`);

    const assistant = await client.beta.assistants.create({
      model: env.openaiRagModel,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.openaiVectorStoreId],
        },
      },
    });

    const thread = await client.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: userQuery,
        },
      ],
    });

    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    if (run.status !== 'completed') {
      throw ApiError.internal(`Run falló con status: ${run.status}`);
    }

    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw ApiError.internal('No se recibió respuesta del asistente');
    }

    const textContent = assistantMessage.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw ApiError.internal('Respuesta del asistente no contiene texto');
    }

    const citations: Array<{ documentId?: string; filename?: string; content?: string }> = [];
    if (textContent.text.annotations) {
      for (const annotation of textContent.text.annotations) {
        if (annotation.type === 'file_citation' && annotation.file_citation) {
          citations.push({
            content: annotation.text,
          });
        }
      }
    }

    await client.beta.assistants.delete(assistant.id);

    return {
      answer: textContent.text.value,
      citations,
    };
  }

  static async generateExamQuestions(params: {
    userId: string;
    courseId?: string | null;
    documentIds?: string[];
    topic?: string;
    questionCount: number;
    difficulty?: string;
    questionTypes?: string[];
  }): Promise<GeneratedQuestion[]> {
    const {
      userId,
      courseId,
      topic,
      questionCount,
      difficulty = 'medium',
      questionTypes = ['multiple_choice'],
    } = params;
    const client = this.getClient();

    const vectorStore = await this.getOrCreateVectorStore({ userId, courseId });

    const prompt = `Genera exactamente ${questionCount} preguntas de examen basadas ÚNICAMENTE en el contenido de los documentos proporcionados.

Requisitos:
- Dificultad: ${difficulty}
- Tipos de pregunta: ${questionTypes.join(', ')}
${topic ? `- Tema específico: ${topic}` : ''}

Para cada pregunta, proporciona:
1. questionText: El texto de la pregunta
2. questionType: El tipo (${questionTypes.join(', ')})
3. options: Array de opciones (para multiple_choice)
4. correctAnswer: La respuesta correcta
5. explanation: Explicación de por qué es correcta
6. difficulty: ${difficulty}

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "questions": [
    {
      "questionText": "...",
      "questionType": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "...",
      "difficulty": "${difficulty}"
    }
  ]
}

NO incluyas texto adicional, solo el JSON.`;

    logger.info(`Generando ${questionCount} preguntas de examen`);

    const assistant = await client.beta.assistants.create({
      model: env.openaiRagModel,
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStore.openaiVectorStoreId],
        },
      },
      instructions: 'Eres un experto en crear preguntas de examen basadas en material educativo.',
    });

    const thread = await client.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    if (run.status !== 'completed') {
      throw ApiError.internal(`Run falló con status: ${run.status}`);
    }

    const messages = await client.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find((msg) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw ApiError.internal('No se recibió respuesta del asistente');
    }

    const textContent = assistantMessage.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw ApiError.internal('Respuesta del asistente no contiene texto');
    }

    let responseText = textContent.text.value.trim();
    
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    let parsedResponse: { questions: GeneratedQuestion[] };
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      logger.error('Error parseando respuesta de OpenAI:', responseText);
      throw ApiError.internal('No se pudo parsear la respuesta del asistente');
    }

    await client.beta.assistants.delete(assistant.id);

    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      throw ApiError.internal('Formato de respuesta inválido');
    }

    return parsedResponse.questions;
  }

  static async saveGeneratedQuestions(params: {
    userId: string;
    courseId?: string | null;
    documentId?: string | null;
    questions: GeneratedQuestion[];
  }): Promise<void> {
    const { userId, courseId, documentId, questions } = params;

    for (const q of questions) {
      await query(
        `INSERT INTO generated_questions 
         (user_id, course_id, document_id, question_text, question_type, options, 
          correct_answer, explanation, difficulty, citations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          courseId || null,
          documentId || null,
          q.questionText,
          q.questionType,
          q.options ? JSON.stringify(q.options) : null,
          q.correctAnswer,
          q.explanation || null,
          q.difficulty || null,
          q.citations ? JSON.stringify(q.citations) : null,
        ]
      );
    }

    logger.info(`Guardadas ${questions.length} preguntas en la base de datos`);
  }
}
