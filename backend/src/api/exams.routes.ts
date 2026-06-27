import { Router } from 'express';
import { body, query as validateQuery } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { OpenAIRagService } from '../services/OpenAIRagService';
import { ExamAttemptService } from '../services/ExamAttemptService';
import { query } from '../config/database';

const router = Router();

// Get generated questions
router.get(
  '/',
  authMiddleware,
  validateQuery('documentId').optional().isUUID().withMessage('documentId must be a valid UUID'),
  validateQuery('courseId').optional().isUUID().withMessage('courseId must be a valid UUID'),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { documentId, courseId } = req.query;

    const questions = await OpenAIRagService.getGeneratedQuestions({
      userId,
      documentId: documentId as string | undefined,
      courseId: courseId as string | undefined,
    });

    res.json({
      success: true,
      questions,
      count: questions.length,
    });
  })
);

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

// Save exam attempt
router.post(
  '/attempts',
  authMiddleware,
  body('score').isInt({ min: 0, max: 100 }).withMessage('score must be between 0 and 100'),
  body('correctAnswers').isInt({ min: 0 }).withMessage('correctAnswers must be a positive integer'),
  body('incorrectAnswers').isInt({ min: 0 }).withMessage('incorrectAnswers must be a positive integer'),
  body('timeTakenSeconds').isInt({ min: 0 }).withMessage('timeTakenSeconds must be a positive integer'),
  body('submitReason').isIn(['manual', 'auto']).withMessage('submitReason must be manual or auto'),
  body('questions').isArray().withMessage('questions must be an array'),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { score, correctAnswers, incorrectAnswers, timeTakenSeconds, submitReason, questions } = req.body;

    const result = await query(
      `INSERT INTO exam_attempts 
       (user_id, score, correct_answers, incorrect_answers, time_taken_seconds, submit_reason, questions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, user_id as "userId", score, correct_answers as "correctAnswers", 
                 incorrect_answers as "incorrectAnswers", time_taken_seconds as "timeTakenSeconds",
                 submit_reason as "submitReason", questions, created_at as "createdAt"`,
      [userId, score, correctAnswers, incorrectAnswers, timeTakenSeconds, submitReason, JSON.stringify(questions)]
    );

    res.json({
      success: true,
      attempt: result.rows[0],
    });
  })
);

// Get recent exam attempts
router.get(
  '/attempts',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const result = await query(
      `SELECT id, user_id as "userId", score, correct_answers as "correctAnswers",
              incorrect_answers as "incorrectAnswers", time_taken_seconds as "timeTakenSeconds",
              submit_reason as "submitReason", questions, created_at as "createdAt"
       FROM exam_attempts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    const attempts = result.rows.map((row: any) => ({
      ...row,
      questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions,
    }));

    res.json({
      success: true,
      attempts,
    });
  })
);

// Delete all generated questions (or by document/course)
router.delete(
  '/',
  authMiddleware,
  validateQuery('documentId').optional().isUUID().withMessage('documentId must be a valid UUID'),
  validateQuery('courseId').optional().isUUID().withMessage('courseId must be a valid UUID'),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { documentId, courseId } = req.query;

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

    const result = await OpenAIRagService.deleteGeneratedQuestions({
      userId,
      documentId: documentId as string | undefined,
      courseId: courseId as string | undefined,
    });

    res.json({
      success: true,
      message: 'Questions deleted successfully',
      deletedCount: result,
    });
  })
);

export default router;
