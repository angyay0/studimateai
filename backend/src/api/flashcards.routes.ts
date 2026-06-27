import { Router } from 'express';
import { body, param, query as validateQuery } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { FlashcardService } from '../services/FlashcardService';

const router = Router();

// Generate flashcards from a document
router.post(
  '/generate',
  authMiddleware,
  body('documentId').isUUID().withMessage('documentId must be a valid UUID'),
  body('count').optional().isInt({ min: 1, max: 50 }).withMessage('count must be between 1 and 50'),
  body('type').optional().isIn(['concept', 'true_false', 'multiple_choice']).withMessage('type must be concept, true_false, or multiple_choice'),
  validate,
  asyncHandler(async (req, res) => {
    const { documentId, count, type } = req.body;
    const userId = req.user!.id;

    const flashcards = await FlashcardService.generateFlashcards({
      userId,
      documentId,
      count: count || 10,
      type: type || 'concept',
    });

    res.json({
      success: true,
      flashcards,
      count: flashcards.length,
    });
  })
);

// Get flashcards (optionally filtered by document)
router.get(
  '/',
  authMiddleware,
  validateQuery('documentId').optional().isUUID().withMessage('documentId must be a valid UUID'),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const documentId = req.query.documentId as string | undefined;

    const flashcards = await FlashcardService.getFlashcards({
      userId,
      documentId,
    });

    res.json({
      success: true,
      flashcards,
      count: flashcards.length,
    });
  })
);

// Get flashcards due for review
router.get(
  '/due',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const flashcards = await FlashcardService.getDueFlashcards(userId);

    res.json({
      success: true,
      flashcards,
      count: flashcards.length,
    });
  })
);

// Get count of flashcards due for review
router.get(
  '/due/count',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const count = await FlashcardService.getDueCount(userId);

    res.json({
      success: true,
      count,
    });
  })
);

// Review a flashcard
router.post(
  '/:id/review',
  authMiddleware,
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('rating')
    .isIn(['difficult', 'good', 'easy'])
    .withMessage('rating must be one of: difficult, good, easy'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user!.id;

    const flashcard = await FlashcardService.reviewFlashcard({
      userId,
      flashcardId: id,
      rating,
    });

    res.json({
      success: true,
      flashcard,
    });
  })
);

// Delete flashcards for a document
router.delete(
  '/document/:documentId',
  authMiddleware,
  param('documentId').isUUID().withMessage('documentId must be a valid UUID'),
  validate,
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    const deletedCount = await FlashcardService.deleteFlashcards({
      userId,
      documentId,
    });

    res.json({
      success: true,
      deletedCount,
    });
  })
);

export default router;
