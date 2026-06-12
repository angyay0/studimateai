/**
 * DocumentService — ST-04.3
 *
 * Gestiona la subida, listado y eliminación de documentos PDF.
 * Flujo de upload:
 *   1. Valida tipo/tamaño (ya hecho por multer en la ruta).
 *   2. Persiste el archivo en disco (carpeta uploads/).
 *   3. Extrae el número de páginas del PDF con pdf-parse.
 *   4. Guarda metadatos en la base de datos.
 *   5. Devuelve el registro creado.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// pdf-parse es un módulo CJS sin tipado perfecto; importamos con require para compatibilidad
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ numpages: number; text: string }>;
import { getPool } from '../config/database';
import { uploadConfig } from '../config';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface DocumentRecord {
  id: string;
  userId: string;
  originalName: string;
  storedName: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'indexed' | 'error';
  pageCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Mapea fila de BD (snake_case) → DocumentRecord (camelCase). */
function rowToDocument(row: Record<string, unknown>): DocumentRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    originalName: row.original_name as string,
    storedName: row.stored_name as string,
    fileSize: row.file_size as number,
    mimeType: row.mime_type as string,
    status: row.status as DocumentRecord['status'],
    pageCount: row.page_count as number | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/** Devuelve la ruta absoluta al directorio de uploads, creándolo si no existe. */
function getUploadDir(): string {
  const dir = path.resolve(process.cwd(), uploadConfig.uploadDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Limpia el nombre original del archivo para guardar un título legible:
 *  - Quita la extensión (.pdf).
 *  - Normaliza acentos (á → a, ñ → n, etc.).
 *  - Elimina cualquier carácter que no sea letra, número o espacio.
 *  - Colapsa espacios múltiples y recorta los extremos.
 * Si tras limpiar queda vacío, devuelve "Documento".
 */
function sanitizeTitle(originalName: string): string {
  const withoutExt = originalName.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita marcas de acento
    .replace(/[^a-zA-Z0-9 ]+/g, ' ') // solo letras, números y espacios
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > 0 ? cleaned : 'Documento';
}

export class DocumentService {
  /**
   * Guarda el archivo en disco, extrae metadatos y crea el registro en BD.
   */
  static async uploadDocument(
    userId: string,
    file: Express.Multer.File
  ): Promise<DocumentRecord> {
    // Nombre único en disco para evitar colisiones y path-traversal
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const storedName = `${uuidv4()}${ext}`;
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, storedName);

    // 1. Persistir en disco
    fs.writeFileSync(filePath, file.buffer);
    logger.info(`Archivo guardado: ${storedName}`);

    // 2. Extraer número de páginas del PDF (falla suavemente)
    let pageCount: number | null = null;
    try {
      const parsed = await pdfParse(file.buffer);
      pageCount = parsed.numpages ?? null;
    } catch (err) {
      logger.warn(`No se pudo leer metadatos del PDF "${file.originalname}": ${err}`);
    }

    // 3. Insertar en base de datos
    const pool = getPool();
    const cleanTitle = sanitizeTitle(file.originalname);
    const result = await pool.query<Record<string, unknown>>(
      `INSERT INTO documents
         (user_id, original_name, stored_name, file_size, mime_type, status, page_count)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [userId, cleanTitle, storedName, file.size, file.mimetype, pageCount]
    );

    const doc = rowToDocument(result.rows[0]);
    logger.info(`Documento creado en BD: ${doc.id} para usuario ${userId}`);
    return doc;
  }

  /**
   * Devuelve todos los documentos del usuario ordenados por fecha de creación.
   */
  static async getUserDocuments(userId: string): Promise<DocumentRecord[]> {
    const pool = getPool();
    const result = await pool.query<Record<string, unknown>>(
      `SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(rowToDocument);
  }

  /**
   * Elimina el documento del disco y de la BD.
   * Verifica propiedad antes de borrar (autorización).
   */
  static async deleteDocument(userId: string, documentId: string): Promise<void> {
    const pool = getPool();

    const check = await pool.query<Record<string, unknown>>(
      'SELECT stored_name FROM documents WHERE id = $1 AND user_id = $2',
      [documentId, userId]
    );

    if (check.rowCount === 0) {
      throw ApiError.notFound('Documento no encontrado o no tienes permiso para eliminarlo.');
    }

    const storedName = check.rows[0].stored_name as string;

    await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);

    const filePath = path.join(getUploadDir(), storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    logger.info(`Documento ${documentId} eliminado por usuario ${userId}`);
  }
}
