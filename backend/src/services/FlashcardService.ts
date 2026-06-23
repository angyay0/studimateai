import { query } from '../config/database';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { OpenAIRagService } from './OpenAIRagService';
import OpenAI from 'openai';
import { openAiConfig } from '../config';

export interface Flashcard {
  id: string;
  userId: string;
  documentId: string;
  question: string;
  answer: string;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ReviewRating = 'difficult' | 'good' | 'easy';

export class FlashcardService {
  /**
   * Generate flashcards from a document using OpenAI
   */
  static async generateFlashcards(params: {
    userId: string;
    documentId: string;
    count?: number;
    type?: 'concept' | 'true_false' | 'multiple_choice';
  }): Promise<Flashcard[]> {
    const { userId, documentId, count = 10, type = 'concept' } = params;

    // Check if document exists and belongs to user
    const docResult = await query(
      `SELECT id, original_filename, openai_file_id, status 
       FROM documents 
       WHERE id = $1 AND user_id = $2`,
      [documentId, userId]
    );

    if (docResult.rows.length === 0) {
      throw ApiError.notFound('Document not found');
    }

    const document = docResult.rows[0];

    if (document.status !== 'indexed') {
      throw ApiError.badRequest('Document must be indexed before generating flashcards');
    }

    // Check if flashcards already exist for this document
    const existingResult = await query(
      `SELECT COUNT(*) as count FROM flashcards WHERE user_id = $1 AND document_id = $2`,
      [userId, documentId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      throw ApiError.badRequest('Flashcards already exist for this document. Delete them first to regenerate.');
    }

    // Query the document content using RAG
    const ragResult = await OpenAIRagService.queryDocuments({
      userId,
      query: `Summarize the key concepts, definitions, and important information from this document for study purposes.`,
      documentIds: [documentId],
      topK: 10,
    });

    // Generate flashcards using OpenAI
    const client = new OpenAI({ apiKey: openAiConfig.apiKey });

    let typeInstructions = '';
    if (type === 'concept') {
      typeInstructions = 'Generate concept-based flashcards with questions and detailed answers.';
    } else if (type === 'true_false') {
      typeInstructions = 'Generate True/False questions. Answer should be either "True" or "False" followed by a brief explanation.';
    } else if (type === 'multiple_choice') {
      typeInstructions = 'Generate multiple choice questions. Answer should include the correct option and a brief explanation.';
    }

    const prompt = `Based on the following content, generate exactly ${count} study flashcards in strict JSON format.

Content:
${ragResult.answer}

Type: ${type}
${typeInstructions}

Follow these rules:
- Questions should test understanding, not just copy text
- Answers should be concise but complete
- Avoid duplicates
- Focus on important concepts, definitions, processes, formulas, and comparisons
- Generate exactly ${count} flashcards

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "flashcards": [
    {
      "question": "What is...?",
      "answer": "..."
    }
  ]
}`;

    const completion = await client.chat.completions.create({
      model: openAiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful study assistant that creates effective flashcards. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    
    // Clean up response (remove markdown code blocks if present)
    let cleanedResponse = responseText;
    if (responseText.startsWith('```json')) {
      cleanedResponse = responseText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (responseText.startsWith('```')) {
      cleanedResponse = responseText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    let parsedResponse: { flashcards: Array<{ question: string; answer: string }> };
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      logger.error('Failed to parse OpenAI flashcard response:', cleanedResponse);
      throw ApiError.internal('Failed to generate flashcards. Invalid response format.');
    }

    if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
      throw ApiError.internal('Invalid flashcard format from OpenAI');
    }

    // Insert flashcards into database
    const flashcards: Flashcard[] = [];
    for (const card of parsedResponse.flashcards) {
      const result = await query<Flashcard>(
        `INSERT INTO flashcards 
         (user_id, document_id, question, answer, ease_factor, interval_days, review_count, next_review_at)
         VALUES ($1, $2, $3, $4, 2.5, 0, 0, NOW())
         RETURNING 
           id, 
           user_id as "userId", 
           document_id as "documentId",
           question,
           answer,
           ease_factor as "easeFactor",
           interval_days as "intervalDays",
           review_count as "reviewCount",
           last_reviewed_at as "lastReviewedAt",
           next_review_at as "nextReviewAt",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [userId, documentId, card.question, card.answer]
      );
      flashcards.push(result.rows[0]);
    }

    logger.info(`Generated ${flashcards.length} flashcards for document ${documentId}`);
    return flashcards;
  }

  /**
   * Get flashcards for a user, optionally filtered by document
   */
  static async getFlashcards(params: {
    userId: string;
    documentId?: string;
  }): Promise<Flashcard[]> {
    const { userId, documentId } = params;

    let queryText = `
      SELECT 
        id, 
        user_id as "userId", 
        document_id as "documentId",
        question,
        answer,
        ease_factor as "easeFactor",
        interval_days as "intervalDays",
        review_count as "reviewCount",
        last_reviewed_at as "lastReviewedAt",
        next_review_at as "nextReviewAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM flashcards
      WHERE user_id = $1
    `;

    const queryParams: any[] = [userId];

    if (documentId) {
      queryText += ` AND document_id = $2`;
      queryParams.push(documentId);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query<Flashcard>(queryText, queryParams);
    return result.rows;
  }

  /**
   * Get flashcards due for review today
   */
  static async getDueFlashcards(userId: string): Promise<Flashcard[]> {
    const result = await query<Flashcard>(
      `SELECT 
        id, 
        user_id as "userId", 
        document_id as "documentId",
        question,
        answer,
        ease_factor as "easeFactor",
        interval_days as "intervalDays",
        review_count as "reviewCount",
        last_reviewed_at as "lastReviewedAt",
        next_review_at as "nextReviewAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM flashcards
       WHERE user_id = $1 AND next_review_at <= NOW()
       ORDER BY next_review_at ASC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get count of flashcards due for review today
   */
  static async getDueCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM flashcards 
       WHERE user_id = $1 AND next_review_at <= NOW()`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Review a flashcard and update using SM-2 algorithm
   */
  static async reviewFlashcard(params: {
    userId: string;
    flashcardId: string;
    rating: ReviewRating;
  }): Promise<Flashcard> {
    const { userId, flashcardId, rating } = params;

    // Get current flashcard
    const result = await query<Flashcard>(
      `SELECT 
        id, 
        user_id as "userId", 
        document_id as "documentId",
        question,
        answer,
        ease_factor as "easeFactor",
        interval_days as "intervalDays",
        review_count as "reviewCount",
        last_reviewed_at as "lastReviewedAt",
        next_review_at as "nextReviewAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM flashcards
       WHERE id = $1 AND user_id = $2`,
      [flashcardId, userId]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('Flashcard not found');
    }

    const flashcard = result.rows[0];

    // Apply SM-2 algorithm
    const { easeFactor, intervalDays } = this.calculateSM2({
      currentEaseFactor: flashcard.easeFactor,
      currentInterval: flashcard.intervalDays,
      rating,
    });

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

    // Update flashcard
    const updateResult = await query<Flashcard>(
      `UPDATE flashcards
       SET 
         ease_factor = $1,
         interval_days = $2,
         review_count = review_count + 1,
         last_reviewed_at = NOW(),
         next_review_at = $3,
         updated_at = NOW()
       WHERE id = $4
       RETURNING 
         id, 
         user_id as "userId", 
         document_id as "documentId",
         question,
         answer,
         ease_factor as "easeFactor",
         interval_days as "intervalDays",
         review_count as "reviewCount",
         last_reviewed_at as "lastReviewedAt",
         next_review_at as "nextReviewAt",
         created_at as "createdAt",
         updated_at as "updatedAt"`,
      [easeFactor, intervalDays, nextReviewAt, flashcardId]
    );

    logger.info(`Reviewed flashcard ${flashcardId} with rating ${rating}. Next review in ${intervalDays} days.`);
    return updateResult.rows[0];
  }

  /**
   * SM-2 Algorithm implementation
   * https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
   */
  private static calculateSM2(params: {
    currentEaseFactor: number;
    currentInterval: number;
    rating: ReviewRating;
  }): { easeFactor: number; intervalDays: number } {
    const { currentEaseFactor, currentInterval, rating } = params;

    // Convert rating to quality (0-5 scale)
    const quality = rating === 'difficult' ? 0 : rating === 'good' ? 3 : 5;

    // Calculate new ease factor
    let easeFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ease factor should not be less than 1.3
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    // Calculate new interval
    let intervalDays: number;

    if (quality < 3) {
      // Difficult: reset to 1 day
      intervalDays = 1;
    } else {
      if (currentInterval === 0) {
        // First review
        intervalDays = 1;
      } else if (currentInterval === 1) {
        // Second review
        intervalDays = 6;
      } else {
        // Subsequent reviews
        intervalDays = Math.round(currentInterval * easeFactor);
      }
    }

    return {
      easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimals
      intervalDays,
    };
  }

  /**
   * Delete flashcards for a document
   */
  static async deleteFlashcards(params: {
    userId: string;
    documentId: string;
  }): Promise<number> {
    const { userId, documentId } = params;

    const result = await query(
      `DELETE FROM flashcards 
       WHERE user_id = $1 AND document_id = $2`,
      [userId, documentId]
    );

    return result.rowCount || 0;
  }
}
