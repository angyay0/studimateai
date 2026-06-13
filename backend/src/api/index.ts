/**
 * Enrutador raíz de la API.
 *
 * Agrupa y monta todos los routers de dominio bajo un mismo punto. Se monta en
 * `src/index.ts` con `app.use('/api', apiRouter)`.
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './documents.routes';
import chatRoutes from './chat.routes';
import quizRoutes from './quizzes.routes';
import ragRoutes from './rag.routes';
import examsRoutes from './exams.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/quizzes', quizRoutes);
router.use('/rag', ragRoutes);
router.use('/exams', examsRoutes);

export default router;
