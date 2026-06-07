/**
 * Rutas de chat con IA (RAG): /api/chat
 *
 * Esqueleto de endpoint (HU-07). La recuperación de contexto y la generación de
 * respuestas se conectarán con `RAGService`.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

/**
 * POST /api/chat — Enviar una pregunta y obtener una respuesta con citas (HU-07).
 */
router.post(
  '/',
  authMiddleware,
  body('message').trim().notEmpty().withMessage('El mensaje no puede estar vacío'),
  body('documentIds').optional().isArray().withMessage('documentIds debe ser un arreglo'),
  body('documentIds.*').optional().isUUID().withMessage('Cada documentId debe ser un UUID válido'),
  validate,
  asyncHandler(async () => {
    // TODO (HU-07): 1. const context = await RAGService.retrieveContext(req.user.id, message);
    //               2. const answer = await RAGService.generateAnswer(message, context);
    //               3. res.json(answer); // { response, sources }
    throw ApiError.notImplemented('Chat con IA pendiente (HU-07).');
  })
);

export default router;
