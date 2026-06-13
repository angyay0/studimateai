import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { OpenAIRagService } from '../services/OpenAIRagService';

const router = Router();

router.post(
  '/generate',
  authMiddleware,
  body('questionCount')
    .isInt({ min: 1, max: 50 })
    .withMessage('questionCount debe ser entre 1 y 50'),
  body('courseId').optional().isUUID().withMessage('courseId debe ser un UUID válido'),
  body('documentIds').optional().isArray().withMessage('documentIds debe ser un array'),
  body('topic').optional().isString().withMessage('topic debe ser un string'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('difficulty debe ser easy, medium o hard'),
  body('questionTypes')
    .optional()
    .isArray()
    .withMessage('questionTypes debe ser un array'),
  validate,
  asyncHandler(async (req, res) => {
    const { questionCount, courseId, documentIds, topic, difficulty, questionTypes } = req.body;
    const userId = req.user!.id;

    const questions = await OpenAIRagService.generateExamQuestions({
      userId,
      courseId: courseId || null,
      documentIds,
      topic,
      questionCount,
      difficulty,
      questionTypes,
    });

    await OpenAIRagService.saveGeneratedQuestions({
      userId,
      courseId: courseId || null,
      documentId: documentIds && documentIds.length === 1 ? documentIds[0] : null,
      questions,
    });

    res.json({
      success: true,
      questions,
      count: questions.length,
    });
  })
);

export default router;
