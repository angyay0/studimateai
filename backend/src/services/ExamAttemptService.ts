import { query } from '../config/database';

export interface ExamAttemptInput {
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  submitReason: 'manual' | 'auto';
  config: Record<string, unknown>;
  questions: unknown[];
}

export interface ExamAttempt {
  id: string;
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  submitReason: 'manual' | 'auto';
  config: Record<string, unknown>;
  questions: unknown[];
  submittedAt: string;
}

export class ExamAttemptService {
  static async create(userId: string, input: ExamAttemptInput): Promise<ExamAttempt> {
    const result = await query<ExamAttempt>(
      `INSERT INTO exam_attempts (
        user_id,
        score,
        correct_answers,
        incorrect_answers,
        total_questions,
        time_taken_seconds,
        submit_reason,
        config,
        questions
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        score,
        correct_answers as "correctAnswers",
        incorrect_answers as "incorrectAnswers",
        total_questions as "totalQuestions",
        time_taken_seconds as "timeTakenSeconds",
        submit_reason as "submitReason",
        config,
        questions,
        submitted_at as "submittedAt"`,
      [
        userId,
        input.score,
        input.correctAnswers,
        input.incorrectAnswers,
        input.totalQuestions,
        input.timeTakenSeconds,
        input.submitReason,
        JSON.stringify(input.config),
        JSON.stringify(input.questions),
      ]
    );

    return result.rows[0];
  }

  static async listRecent(userId: string, limit = 10): Promise<ExamAttempt[]> {
    const result = await query<ExamAttempt>(
      `SELECT
        id,
        score,
        correct_answers as "correctAnswers",
        incorrect_answers as "incorrectAnswers",
        total_questions as "totalQuestions",
        time_taken_seconds as "timeTakenSeconds",
        submit_reason as "submitReason",
        config,
        questions,
        submitted_at as "submittedAt"
       FROM exam_attempts
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }
}
