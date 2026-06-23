import OpenAI from 'openai';
import { openAiConfig, env } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { StorageService } from './StorageService';
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

    const storeName = courseId
      ? `${env.openaiVectorStorePrefix}-${userId.slice(0, 8)}-course-${courseId.slice(0, 8)}`
      : `${env.openaiVectorStorePrefix}-${userId.slice(0, 8)}`;

    logger.info(`Creando vector store (usando assistant): ${storeName}`);

    const vectorStoreId = `vs-${userId.slice(0, 16)}-${Date.now()}`;

    const insertResult = await query<VectorStore>(
      `INSERT INTO vector_stores (user_id, course_id, openai_vector_store_id, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id as "userId", course_id as "courseId", 
                 openai_vector_store_id as "openaiVectorStoreId", name`,
      [userId, courseIdValue, vectorStoreId, storeName]
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

    // Obtener la ruta del archivo (descarga desde Spaces si es necesario)
    const filePath = await StorageService.getFilePath(storageKey);
    const fileStream = fs.createReadStream(filePath);
    
    // Timeout de 60s y 1 reintento: si la llamada a OpenAI se cuelga (red, cuota),
    // lanza un error en vez de quedarse esperando indefinidamente. Así el documento
    // no se queda atascado en 'indexing'.
    const uploadedFile = await client.files.create(
      {
        file: fileStream,
        purpose: 'assistants',
      },
      { maxRetries: 1, timeout: 60_000 }
    );

    logger.info(`Archivo subido a OpenAI: ${uploadedFile.id}`);

    const vectorStore = await this.getOrCreateVectorStore({ userId, courseId });

    logger.info(`Archivo listo para usar con file_search`);

    return {
      openaiFileId: uploadedFile.id,
      openaiVectorStoreId: vectorStore.openaiVectorStoreId,
      openaiVectorStoreFileId: uploadedFile.id,
    };
  }

  static async queryDocuments(params: {
    userId: string;
    courseId?: string | null;
    query: string;
    documentIds?: string[];
    topK?: number;
  }): Promise<QueryResult> {
    const { userId, courseId, query: userQuery, documentIds } = params;
    const client = this.getClient();

    let fileIds: string[] = [];
    
    if (documentIds && documentIds.length > 0) {
      const docsResult = await query(
        `SELECT openai_file_id FROM documents 
         WHERE id = ANY($1)
           AND user_id = $2
           AND status = 'indexed'
           AND openai_file_id IS NOT NULL`,
        [documentIds, userId]
      );
      fileIds = docsResult.rows.map((row: any) => row.openai_file_id);

      if (fileIds.length === 0) {
        throw ApiError.badRequest(
          'El documento seleccionado todavía no está indexado. Espera a que termine el procesamiento antes de generar el examen.'
        );
      }
    } else {
      const docsResult = await query(
        `SELECT openai_file_id FROM documents 
         WHERE user_id = $1 AND status = 'indexed' AND openai_file_id IS NOT NULL
         ${courseId ? 'AND course_id = $2' : ''}
         ORDER BY created_at DESC LIMIT 10`,
        courseId ? [userId, courseId] : [userId]
      );
      fileIds = docsResult.rows.map((row: any) => row.openai_file_id);
    }

    if (fileIds.length === 0) {
      throw ApiError.badRequest('No hay documentos indexados disponibles');
    }

    logger.info(`Consultando ${fileIds.length} documentos con file_search: ${userQuery}`);

    const assistant = await client.beta.assistants.create({
      model: env.openaiRagModel,
      tools: [{ type: 'file_search' }],
    });

    const thread = await client.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: userQuery,
          attachments: fileIds.map(fileId => ({
            file_id: fileId,
            tools: [{ type: 'file_search' as const }],
          })),
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
      documentIds,
      topic,
      questionCount,
      difficulty = 'medium',
      questionTypes = ['multiple_choice'],
    } = params;
    const client = this.getClient();

    let fileIds: string[] = [];
    
    if (documentIds && documentIds.length > 0) {
      const docsResult = await query(
        `SELECT openai_file_id FROM documents 
         WHERE id = ANY($1) AND user_id = $2 AND openai_file_id IS NOT NULL`,
        [documentIds, userId]
      );
      fileIds = docsResult.rows.map((row: any) => row.openai_file_id);

      const indexedDocsResult = await query(
        `SELECT id, original_filename as "originalFilename", status
         FROM documents
         WHERE id = ANY($1) AND user_id = $2 AND status != 'indexed'`,
        [documentIds, userId]
      );

      if (indexedDocsResult.rows.length > 0) {
        const blockedDoc = indexedDocsResult.rows[0];
        throw ApiError.badRequest(
          `El documento "${blockedDoc.originalFilename}" aún no está indexado. Espera a que termine el procesamiento antes de generar el examen.`
        );
      }

      if (fileIds.length === 0) {
        throw ApiError.badRequest(
          'No se encontraron documentos indexados para generar el examen.'
        );
      }
    } else {
      const docsResult = await query(
        `SELECT openai_file_id FROM documents 
         WHERE user_id = $1 AND status = 'indexed' AND openai_file_id IS NOT NULL
         ${courseId ? 'AND course_id = $2' : ''}
         ORDER BY created_at DESC LIMIT 10`,
        courseId ? [userId, courseId] : [userId]
      );
      fileIds = docsResult.rows.map((row: any) => row.openai_file_id);
    }

    if (fileIds.length === 0) {
      throw ApiError.badRequest('No hay documentos indexados disponibles');
    }

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

    logger.info(`Generando ${questionCount} preguntas de examen usando ${fileIds.length} documentos`);

    const assistant = await client.beta.assistants.create({
      model: env.openaiRagModel,
      tools: [{ type: 'file_search' }],
      instructions: 'Eres un experto en crear preguntas de examen basadas en material educativo.',
    });

    const thread = await client.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: prompt,
          attachments: fileIds.map(fileId => ({
            file_id: fileId,
            tools: [{ type: 'file_search' as const }],
          })),
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

  /**
   * Genera un resumen estructurado y fiel de un texto.
   *
   * Para documentos largos usa una estrategia map-reduce: divide el texto en
   * secciones, resume cada una (map) y luego combina los resúmenes parciales
   * en un resumen final (reduce). Para documentos cortos resume en una pasada.
   */
  static async summarizeText(text: string): Promise<string> {
    const cleanText = text.trim();
    if (cleanText.length === 0) {
      throw ApiError.badRequest('El documento no contiene texto para resumir');
    }

    // Tamaño máximo de cada fragmento (en caracteres) para mantenernos dentro
    // de los límites de tokens del modelo.
    const CHUNK_SIZE = 12000;

    // Documento corto: resumen en una sola pasada.
    if (cleanText.length <= CHUNK_SIZE) {
      return this.generateFinalSummary(cleanText, false);
    }

    // Documento largo: estrategia map-reduce.
    const chunks = this.splitIntoChunks(cleanText, CHUNK_SIZE);
    logger.info(`Resumiendo documento largo en ${chunks.length} secciones (map-reduce)`);

    // MAP: resumir cada sección por separado.
    const partialSummaries: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const partial = await this.summarizeChunk(chunks[i], i + 1, chunks.length);
      partialSummaries.push(partial);
    }

    // REDUCE: combinar los resúmenes parciales en un resumen final.
    const combined = partialSummaries.map((s, i) => `--- Sección ${i + 1} ---\n${s}`).join('\n\n');

    return this.generateFinalSummary(combined, true);
  }

  /** Divide el texto en fragmentos respetando límites de párrafo cuando es posible. */
  private static splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let current = '';

    for (const paragraph of paragraphs) {
      // Si un solo párrafo excede el tamaño, lo cortamos de forma dura.
      if (paragraph.length > chunkSize) {
        if (current.trim()) {
          chunks.push(current.trim());
          current = '';
        }
        for (let i = 0; i < paragraph.length; i += chunkSize) {
          chunks.push(paragraph.slice(i, i + chunkSize));
        }
        continue;
      }

      if ((current + '\n\n' + paragraph).length > chunkSize) {
        if (current.trim()) {
          chunks.push(current.trim());
        }
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  /** MAP: resume una sección individual del documento. */
  private static async summarizeChunk(
    chunk: string,
    index: number,
    total: number
  ): Promise<string> {
    const client = this.getClient();

    const completion = await client.chat.completions.create({
      model: env.openaiRagModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que resume material de estudio. Resume ÚNICAMENTE con ' +
            'información presente en el texto proporcionado. NO inventes datos, nombres, ' +
            'cifras ni conclusiones que no aparezcan en el texto.',
        },
        {
          role: 'user',
          content:
            `Resume de forma concisa los puntos clave de esta sección ` +
            `(parte ${index} de ${total}) del documento. Conserva las definiciones, ` +
            `datos y conceptos importantes:\n\n${chunk}`,
        },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
  }

  /** REDUCE / pasada única: genera el resumen final estructurado y fiel. */
  private static async generateFinalSummary(
    content: string,
    fromPartials: boolean
  ): Promise<string> {
    const client = this.getClient();

    const sourceDescription = fromPartials
      ? 'los siguientes resúmenes parciales de las secciones de un documento'
      : 'el siguiente documento';

    const completion = await client.chat.completions.create({
      model: env.openaiRagModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente que crea resúmenes de estudio claros y estructurados. ' +
            'Usa ÚNICAMENTE la información proporcionada. NO agregues información, datos ' +
            'ni conclusiones que no estén presentes en el texto. Responde en español.',
        },
        {
          role: 'user',
          content:
            `A partir de ${sourceDescription}, crea un resumen final claro y bien ` +
            `estructurado usando EXACTAMENTE este formato:\n\n` +
            `## Resumen general\n(2 a 4 frases que describan de qué trata el documento)\n\n` +
            `## Puntos clave\n- (punto importante 1)\n- (punto importante 2)\n- (añade los que sean necesarios)\n\n` +
            `## Conclusión\n(1 o 2 frases de cierre)\n\n` +
            `Reglas:\n` +
            `- Escribe los títulos de sección tal cual ("## Resumen general", "## Puntos clave", "## Conclusión").\n` +
            `- Usa "- " al inicio de cada viñeta.\n` +
            `- No uses negritas ni otros símbolos de markdown dentro de las líneas.\n` +
            `- Sé fiel al contenido: no inventes nada que no esté en el texto.\n\n` +
            `Contenido:\n\n${content}`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) {
      throw ApiError.internal('No se pudo generar el resumen');
    }
    return summary;
  }

  static async getGeneratedQuestions(params: {
    userId: string;
    documentId?: string;
    courseId?: string;
  }): Promise<GeneratedQuestion[]> {
    const { userId, documentId, courseId } = params;

    let queryText = `
      SELECT 
        id,
        user_id as "userId",
        course_id as "courseId",
        document_id as "documentId",
        question_text as "questionText",
        question_type as "questionType",
        options,
        correct_answer as "correctAnswer",
        explanation,
        difficulty,
        citations,
        created_at as "createdAt"
      FROM generated_questions
      WHERE user_id = $1
    `;

    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (documentId) {
      queryText += ` AND document_id = $${paramIndex}`;
      queryParams.push(documentId);
      paramIndex++;
    }

    if (courseId) {
      queryText += ` AND course_id = $${paramIndex}`;
      queryParams.push(courseId);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, queryParams);

    return result.rows.map((row: any) => {
      let options;
      if (row.options) {
        // PostgreSQL may return JSON columns as already-parsed objects or as strings
        if (Array.isArray(row.options)) {
          options = row.options;
        } else if (typeof row.options === 'string') {
          try {
            options = JSON.parse(row.options);
          } catch (e) {
            // If not valid JSON, try to split by comma (legacy format)
            options = row.options.split(',').map((opt: string) => opt.trim());
          }
        }
      }

      let citations;
      if (row.citations) {
        if (Array.isArray(row.citations)) {
          citations = row.citations;
        } else if (typeof row.citations === 'string') {
          try {
            citations = JSON.parse(row.citations);
          } catch (e) {
            citations = undefined;
          }
        }
      }

      return {
        questionText: row.questionText,
        questionType: row.questionType,
        options,
        correctAnswer: row.correctAnswer,
        explanation: row.explanation,
        difficulty: row.difficulty,
        citations,
      };
    });
  }

  static async deleteGeneratedQuestions(params: {
    userId: string;
    documentId?: string;
    courseId?: string;
  }): Promise<number> {
    const { userId, documentId, courseId } = params;

    let queryText = 'DELETE FROM generated_questions WHERE user_id = $1';
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (documentId) {
      queryText += ` AND document_id = $${paramIndex}`;
      queryParams.push(documentId);
      paramIndex++;
    }

    if (courseId) {
      queryText += ` AND course_id = $${paramIndex}`;
      queryParams.push(courseId);
      paramIndex++;
    }

    const result = await query(queryText, queryParams);
    return result.rowCount || 0;
  }
}
