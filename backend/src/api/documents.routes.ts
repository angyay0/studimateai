/**
 * Rutas de documentos: /api/documents
 *
 * Esqueleto de endpoints (HU-04 / HU-05). La subida valida tipo y tamaño de
 * archivo; el almacenamiento y la indexación RAG se conectarán con los servicios.
 */
import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { param, body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { uploadConfig } from '../config';
import { DocumentService } from '../services/DocumentService';

const router = Router();

/**
 * Configuración de Multer para la subida de PDFs.
 * Usa almacenamiento en memoria: valida el archivo sin persistir basura en disco
 * mientras la lógica de almacenamiento real (disco/S3) no esté implementada.
 */
function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const allowedMimes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const isAllowedMime = allowedMimes.includes(file.mimetype);
  const isAllowedExt = uploadConfig.allowedFileTypes.some((ext) =>
    file.originalname.toLowerCase().endsWith(`.${ext.toLowerCase()}`)
  );

  if (isAllowedMime && isAllowedExt) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Tipo de archivo no permitido. Solo se aceptan: ${uploadConfig.allowedFileTypes.join(', ')}`));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter,
});

/**
 * GET /api/documents — Listar los documentos del usuario (HU-05).
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { courseId } = req.query;
    const docs = await DocumentService.getUserDocuments(
      req.user!.id,
      courseId as string | undefined
    );
    res.json({ success: true, documents: docs });
  })
);

/**
 * POST /api/documents/upload — Subir un PDF (HU-04).
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.badRequest('No se recibió ningún archivo en el campo "file".');
    }
    const { courseId } = req.body;
    const doc = await DocumentService.uploadDocument(req.user!.id, req.file, courseId);
    res.status(201).json({ success: true, document: doc });
  })
);

/**
 * GET /api/documents/:id — Obtener un documento por ID (verifica propiedad).
 */
router.get(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('El id del documento debe ser un UUID válido'),
  validate,
  asyncHandler(async (req, res) => {
    const doc = await DocumentService.getDocument(req.user!.id, req.params.id);
    res.json({ success: true, document: doc });
  })
);

/**
 * PATCH /api/documents/:id — Renombrar un documento (verifica propiedad).
 * Body: { name: string }
 */
router.patch(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('El id del documento debe ser un UUID válido'),
  body('name')
    .isString().withMessage('El nombre debe ser texto')
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('El nombre debe tener entre 1 y 255 caracteres'),
  validate,
  asyncHandler(async (req, res) => {
    const doc = await DocumentService.renameDocument(req.user!.id, req.params.id, req.body.name);
    res.json({ success: true, document: doc });
  })
);

/**
 * DELETE /api/documents/:id — Eliminar un documento (verifica propiedad).
 */
router.delete(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('El id del documento debe ser un UUID válido'),
  validate,
  asyncHandler(async (req, res) => {
    await DocumentService.deleteDocument(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

/**
 * POST /api/documents/:id/summarize — Generar un resumen del documento (verifica propiedad).
 * Usa IA (OpenAI) con estrategia map-reduce para soportar documentos largos.
 */
router.post(
  '/:id/summarize',
  authMiddleware,
  param('id').isUUID().withMessage('El id del documento debe ser un UUID válido'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await DocumentService.summarizeDocument(req.user!.id, req.params.id);
    res.json({ success: true, ...result });
  })
);

export default router;
