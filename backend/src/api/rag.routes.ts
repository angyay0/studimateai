import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { OpenAIRagService } from '../services/OpenAIRagService';

const router = Router();

router.post(
  '/query',
  authMiddleware,
  body('query').isString().notEmpty().withMessage('Query es requerido'),
  body('courseId').optional().isUUID().withMessage('courseId debe ser un UUID válido'),
  body('documentIds').optional().isArray().withMessage('documentIds debe ser un array'),
  body('topK').optional().isInt({ min: 1, max: 20 }).withMessage('topK debe ser entre 1 y 20'),
  validate,
  asyncHandler(async (req, res) => {
    const { query, courseId, documentIds, topK } = req.body;
    const userId = req.user!.id;

    const result = await OpenAIRagService.queryDocuments({
      userId,
      courseId: courseId || null,
      query,
      documentIds,
      topK,
    });

    res.json({
      success: true,
      answer: result.answer,
      citations: result.citations,
    });
  })
);

export default router;
