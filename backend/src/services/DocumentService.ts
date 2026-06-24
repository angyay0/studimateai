import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { StorageService } from './StorageService';
import { TextExtractor } from '../utils/textExtractor';
import { OpenAIRagService } from './OpenAIRagService';

interface Document {
  id: string;
  userId: string;
  courseId: string | null;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  storageKey: string | null;
  openaiFileId: string | null;
  openaiVectorStoreId: string | null;
  openaiVectorStoreFileId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DocumentService {
  static async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    courseId?: string | null
  ): Promise<Document> {
    try {
      // multer/busboy decodifica el nombre como Latin-1; lo convertimos a UTF-8
      // para que acentos y ñ se guarden correctamente (ej. "certificación" no "certificaciÃ³n")
      const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');

      const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      const existingDoc = await this.findExistingDocument(userId, courseId, sha256Hash);
      if (existingDoc && existingDoc.status === 'indexed') {
        logger.info(`Documento duplicado encontrado: ${existingDoc.id}`);
        return existingDoc;
      }

      const documentId = uuidv4();
      const filename = `${documentId}-${originalFilename}`;

      const doc = await query<Document>(
        `INSERT INTO documents 
         (id, user_id, course_id, original_filename, mime_type, size_bytes, sha256_hash, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, user_id as "userId", course_id as "courseId", 
                   original_filename as "originalFilename", mime_type as "mimeType",
                   size_bytes as "sizeBytes", sha256_hash as "sha256Hash",
                   storage_key as "storageKey", openai_file_id as "openaiFileId",
                   openai_vector_store_id as "openaiVectorStoreId",
                   openai_vector_store_file_id as "openaiVectorStoreFileId",
                   status, error_message as "errorMessage",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [documentId, userId, courseId || null, originalFilename, file.mimetype, file.size, sha256Hash, 'uploaded']
      );

      const document = doc.rows[0];

      this.processDocumentAsync(document.id, file, filename, userId, courseId).catch((error) => {
        logger.error(`Error procesando documento ${document.id}:`, error);
      });

      return document;
    } catch (error) {
      logger.error('Error en uploadDocument:', error);
      throw error;
    }
  }

  private static async processDocumentAsync(
    documentId: string,
    file: Express.Multer.File,
    filename: string,
    userId: string,
    courseId?: string | null
  ): Promise<void> {
    try {
      await this.updateDocumentStatus(documentId, 'processing');

      const storageKey = await StorageService.saveFile(file, filename);

      await query(
        `UPDATE documents SET storage_key = $1, updated_at = NOW() WHERE id = $2`,
        [storageKey, documentId]
      );

      // Obtener la ruta del archivo (descarga desde Spaces si es necesario)
      const filePath = await StorageService.getFilePath(storageKey);
      const textResult = await TextExtractor.extractText(filePath, file.mimetype);

      if (!textResult.hasText) {
        await this.updateDocumentStatus(
          documentId,
          'no_text_detected',
          'El documento no contiene suficiente texto extraíble. Puede ser una imagen escaneada.'
        );
        return;
      }

      // La indexación en OpenAI (RAG) es best-effort: si falla por falta de
      // créditos, API key o red, el documento NO se queda atascado en 'indexing'
      // ni se marca como 'failed'. Queda como 'uploaded' y se puede resumir igual,
      // porque el resumen usa el texto extraído, no la indexación.
      try {
        await this.updateDocumentStatus(documentId, 'indexing');

        const ragResult = await OpenAIRagService.uploadAndIndexDocument({
          file,
          userId,
          courseId,
          documentId,
          storageKey,
        });

        await query(
          `UPDATE documents 
           SET openai_file_id = $1, 
               openai_vector_store_id = $2,
               openai_vector_store_file_id = $3,
               status = $4,
               updated_at = NOW()
           WHERE id = $5`,
          [
            ragResult.openaiFileId,
            ragResult.openaiVectorStoreId,
            ragResult.openaiVectorStoreFileId,
            'indexed',
            documentId,
          ]
        );

        logger.info(`Documento ${documentId} indexado correctamente`);
      } catch (indexError) {
        logger.warn(
          `No se pudo indexar el documento ${documentId} en OpenAI; queda como 'uploaded' y se podrá resumir igualmente:`,
          indexError
        );
        await this.updateDocumentStatus(documentId, 'uploaded');
      }
    } catch (error) {
      logger.error(`Error procesando documento ${documentId}:`, error);
      await this.updateDocumentStatus(
        documentId,
        'failed',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }
  }

  private static async updateDocumentStatus(
    documentId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await query(
      `UPDATE documents SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMessage || null, documentId]
    );
  }

  private static async findExistingDocument(
    userId: string,
    courseId: string | null | undefined,
    sha256Hash: string
  ): Promise<Document | null> {
    const result = await query<Document>(
      `SELECT id, user_id as "userId", course_id as "courseId", 
              original_filename as "originalFilename", mime_type as "mimeType",
              size_bytes as "sizeBytes", sha256_hash as "sha256Hash",
              storage_key as "storageKey", openai_file_id as "openaiFileId",
              openai_vector_store_id as "openaiVectorStoreId",
              openai_vector_store_file_id as "openaiVectorStoreFileId",
              status, error_message as "errorMessage",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM documents
       WHERE user_id = $1 
         AND (course_id = $2 OR (course_id IS NULL AND $2 IS NULL))
         AND sha256_hash = $3
         AND status != 'deleted'
       LIMIT 1`,
      [userId, courseId || null, sha256Hash]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async getUserDocuments(userId: string, courseId?: string): Promise<Document[]> {
    try {
      let queryText = `
        SELECT id, user_id as "userId", course_id as "courseId", 
               original_filename as "originalFilename", mime_type as "mimeType",
               size_bytes as "sizeBytes", sha256_hash as "sha256Hash",
               storage_key as "storageKey", openai_file_id as "openaiFileId",
               openai_vector_store_id as "openaiVectorStoreId",
               openai_vector_store_file_id as "openaiVectorStoreFileId",
               status, error_message as "errorMessage",
               created_at as "createdAt", updated_at as "updatedAt"
        FROM documents
        WHERE user_id = $1 AND status != 'deleted'
      `;
      const params: any[] = [userId];

      if (courseId) {
        queryText += ' AND course_id = $2';
        params.push(courseId);
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await query<Document>(queryText, params);
      return result.rows;
    } catch (error) {
      logger.error('Error en getUserDocuments:', error);
      throw error;
    }
  }

  static async getDocument(userId: string, documentId: string): Promise<Document> {
    const result = await query<Document>(
      `SELECT id, user_id as "userId", course_id as "courseId",
              original_filename as "originalFilename", mime_type as "mimeType",
              size_bytes as "sizeBytes", sha256_hash as "sha256Hash",
              storage_key as "storageKey", openai_file_id as "openaiFileId",
              openai_vector_store_id as "openaiVectorStoreId",
              openai_vector_store_file_id as "openaiVectorStoreFileId",
              status, error_message as "errorMessage",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM documents
       WHERE id = $1 AND user_id = $2 AND status != 'deleted'`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('Documento no encontrado o no tienes permiso para verlo.');
    }

    return result.rows[0];
  }

  static async renameDocument(userId: string, documentId: string, newName: string): Promise<Document> {
    // Verifica propiedad antes de renombrar
    const check = await query<Document>(
      `SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND status != 'deleted'`,
      [documentId, userId]
    );

    if (check.rows.length === 0) {
      throw ApiError.notFound('Documento no encontrado o no tienes permiso para modificarlo.');
    }

    const result = await query<Document>(
      `UPDATE documents
         SET original_filename = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id as "userId", course_id as "courseId",
                 original_filename as "originalFilename", mime_type as "mimeType",
                 size_bytes as "sizeBytes", sha256_hash as "sha256Hash",
                 storage_key as "storageKey", openai_file_id as "openaiFileId",
                 openai_vector_store_id as "openaiVectorStoreId",
                 openai_vector_store_file_id as "openaiVectorStoreFileId",
                 status, error_message as "errorMessage",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [newName, documentId]
    );

    logger.info(`Documento ${documentId} renombrado a "${newName}" por usuario ${userId}`);
    return result.rows[0];
  }

  static async deleteDocument(userId: string, documentId: string): Promise<void> {
    try {
      const result = await query<Document>(
        `SELECT id, user_id as "userId", storage_key as "storageKey"
         FROM documents
         WHERE id = $1 AND user_id = $2 AND status != 'deleted'`,
        [documentId, userId]
      );

      if (result.rows.length === 0) {
        throw ApiError.notFound('Documento no encontrado');
      }

      const document = result.rows[0];

      if (document.storageKey) {
        await StorageService.deleteFile(document.storageKey);
      }

      await query(
        `UPDATE documents SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
        [documentId]
      );

      logger.info(`Documento ${documentId} eliminado`);
    } catch (error) {
      logger.error('Error en deleteDocument:', error);
      throw error;
    }
  }

  /**
   * Genera un resumen estructurado y fiel del contenido de un documento.
   * Soporta documentos largos mediante la estrategia map-reduce del servicio RAG.
   */
  static async summarizeDocument(
    userId: string,
    documentId: string
  ): Promise<{ documentId: string; title: string; summary: string }> {
    // 1. Verifica propiedad y obtiene el documento
    const document = await this.getDocument(userId, documentId);

    if (!document.storageKey) {
      throw ApiError.badRequest('El documento no tiene un archivo asociado.');
    }

    // 2. Obtiene la ruta local del archivo (descarga de Spaces si es necesario)
    const filePath = await StorageService.getFilePath(document.storageKey);

    // 3. Extrae el texto del documento
    const extraction = await TextExtractor.extractText(filePath, document.mimeType);

    if (!extraction.hasText || extraction.text.trim().length === 0) {
      throw ApiError.badRequest(
        'No se pudo extraer texto del documento. Es posible que sea un PDF escaneado sin texto seleccionable.'
      );
    }

    logger.info(
      `Generando resumen del documento ${documentId} (${extraction.characterCount} caracteres)`
    );

    // 4. Genera el resumen (map-reduce para documentos largos)
    const summary = await OpenAIRagService.summarizeText(extraction.text);

    return {
      documentId: document.id,
      title: document.originalFilename,
      summary,
    };
  }
}
