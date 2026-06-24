import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { OpenAIRagService } from '../services/OpenAIRagService';
import { ExamAttemptService } from '../services/ExamAttemptService';

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

router.post(
  '/attempts',
  authMiddleware,
  body('score').isInt({ min: 0, max: 100 }).withMessage('score debe estar entre 0 y 100'),
  body('correctAnswers').isInt({ min: 0 }).withMessage('correctAnswers debe ser un entero positivo'),
  body('incorrectAnswers').isInt({ min: 0 }).withMessage('incorrectAnswers debe ser un entero positivo'),
  body('totalQuestions').isInt({ min: 1 }).withMessage('totalQuestions debe ser mayor a 0'),
  body('timeTakenSeconds').isInt({ min: 0 }).withMessage('timeTakenSeconds debe ser un entero positivo'),
  body('submitReason').isIn(['manual', 'auto']).withMessage('submitReason debe ser manual o auto'),
  body('config').isObject().withMessage('config debe ser un objeto'),
  body('questions').isArray({ min: 1 }).withMessage('questions debe incluir al menos un reactivo'),
  validate,
  asyncHandler(async (req, res) => {
    const attempt = await ExamAttemptService.create(req.user!.id, req.body);

    res.status(201).json({
      success: true,
      attempt,
    });
  })
);

router.get(
  '/attempts',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const attempts = await ExamAttemptService.listRecent(req.user!.id);

    res.json({
      success: true,
      attempts,
    });
  })
);

export default router;
