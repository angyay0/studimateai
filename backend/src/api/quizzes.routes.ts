/**
 * Rutas de cuestionarios: /api/quizzes
 *
 * Esqueleto de endpoints. La generación y calificación se conectarán con
 * `QuizService` en sprints posteriores.
 */
import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

/**
 * POST /api/quizzes/generate — Generar un cuestionario a partir de documentos.
 */
router.post(
  '/generate',
  authMiddleware,
  body('documentIds').isArray({ min: 1 }).withMessage('Debes indicar al menos un documento'),
  body('documentIds.*').isUUID().withMessage('Cada documentId debe ser un UUID válido'),
  body('numQuestions')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('numQuestions debe estar entre 1 y 50'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('difficulty debe ser easy, medium o hard'),
  validate,
  asyncHandler(async () => {
    // TODO: const quiz = await QuizService.generate(req.user.id, req.body);
    //       res.status(201).json(quiz);
    throw ApiError.notImplemented('Generación de cuestionarios pendiente.');
  })
);

/**
 * POST /api/quizzes/:id/submit — Enviar respuestas y obtener la calificación.
 */
router.post(
  '/:id/submit',
  authMiddleware,
  param('id').isUUID().withMessage('El id del cuestionario debe ser un UUID válido'),
  body('answers').isArray({ min: 1 }).withMessage('Debes enviar al menos una respuesta'),
  validate,
  asyncHandler(async () => {
    // TODO: const result = await QuizService.submit(req.user.id, req.params.id, req.body.answers);
    //       res.json(result);
    throw ApiError.notImplemented('Calificación de cuestionarios pendiente.');
  })
);

export default router;
