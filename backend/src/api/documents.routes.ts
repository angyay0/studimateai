/**
 * Rutas de documentos: /api/documents  (ST-04.3)
 *
 * POST   /api/documents/upload  — Subir un PDF
 * GET    /api/documents          — Listar documentos del usuario
 * DELETE /api/documents/:id      — Eliminar un documento
 */
import { Router, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { uploadConfig } from '../config';
import { DocumentService } from '../services/DocumentService';

const router = Router();

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const isAllowedMime = file.mimetype === 'application/pdf';
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
 * GET /api/documents — Listar documentos del usuario autenticado.
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const docs = await DocumentService.getUserDocuments(req.user!.id);
    res.json(docs);
  })
);

/**
 * POST /api/documents/upload — Subir un PDF (ST-04.3).
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest('No se recibió ningún archivo en el campo "file".');
    }
    const doc = await DocumentService.uploadDocument(req.user!.id, req.file);
    res.status(201).json(doc);
  })
);

/**
 * DELETE /api/documents/:id — Eliminar un documento.
 */
router.delete(
  '/:id',
  authMiddleware,
  param('id').isUUID().withMessage('El id del documento debe ser un UUID válido'),
  validate,
  asyncHandler(async (req: Request, res: Response) => {
    await DocumentService.deleteDocument(req.user!.id, req.params.id);
    res.status(204).send();
  })
);

export default router;
