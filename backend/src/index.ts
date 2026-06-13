import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIService } from './services/OpenAIService';
import { AuthError, AuthService, passwordPolicyMessage } from './services/AuthService';
import { authMiddleware } from './middleware/auth.middleware';
import { env, corsConfig, serverConfig, assertEnvValid } from './config';
import { checkDatabaseConnection, closePool } from './config/database';
import { logger } from './utils/logger';
import apiRouter from './api';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Validar la configuración de entorno antes de arrancar (aborta si falta algo crítico en producción).
assertEnvValid({
  warn: (message) => logger.warn(message),
  error: (message) => logger.error(message),
});

const app: Express = express();
const PORT = process.env.BACKEND_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001,http://127.0.0.2:3001')
  .split(',')
  .map((origin) => origin.trim());

// Middleware
// En desarrollo, permitir cualquier origen para facilitar desarrollo local.
// En producción, usar whitelist estricta.
app.use(cors({
  origin(origin, callback) {
    // En desarrollo, permitir cualquier origen (más fácil para testing)
    if (NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    // En producción, verificar contra whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check (incluye estado de la base de datos)
app.get('/api/health', async (_req: Request, res: Response) => {
  const databaseConnected = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    environment: env.nodeEnv,
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// OpenAI connection health check. This never returns the API key.
app.get('/api/openai/health', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await OpenAIService.testConnection();
    res.status(result.ok ? 200 : 503).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, name } = req.body;
    const resolvedFirstName = firstName || name;

    if (!email || !password || !resolvedFirstName) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (!AuthService.validatePasswordPolicy(password)) {
      res.status(400).json({ error: passwordPolicyMessage });
      return;
    }

    const result = await AuthService.register(email, password, resolvedFirstName, lastName || '');
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const result = await AuthService.login(email, password, Boolean(rememberMe));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const result = await AuthService.requestPasswordReset(email);
    res.json({
      success: true,
      message: 'If the email exists, password reset instructions will be sent.',
      expiresInMinutes: result.expiresInMinutes,
      resetToken: NODE_ENV === 'development' ? result.resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      res.status(400).json({ error: 'Email, token, and password are required.' });
      return;
    }

    await AuthService.resetPassword(email, token, password);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ authenticated: true, user: req.user });
});

app.post('/api/auth/logout', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.sessionId) {
      await AuthService.logout(req.user.sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Montar rutas de la API (documentos, RAG, exams, etc.)
// Se monta después de las rutas de auth para que las implementadas tomen precedencia
app.use('/api', apiRouter);

// API Routes (to be implemented)
app.get('/api', (req: Request, res: Response) => {
  res.json({ 
    message: 'StudyMate AI API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      documents: '/api/documents',
      chat: '/api/chat',
      quizzes: '/api/quizzes',
      exams: '/api/exams',
      openaiHealth: '/api/openai/health',
      health: '/api/health',
    },
  });
});

// Monta los routers de dominio (documentos, chat, quizzes, etc.) bajo /api.
app.use('/api', apiRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AuthError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Manejo de rutas no encontradas y de errores (deben ir al final).
app.use(notFoundHandler);
app.use(errorHandler);

// Arranque del servidor
const server = app.listen(serverConfig.port, () => {
  logger.info(
    `StudyMate AI backend escuchando en http://localhost:${serverConfig.port} (${env.nodeEnv})`
  );
  logger.info(`Documentación de endpoints: http://localhost:${serverConfig.port}/api`);
});

// Apagado ordenado: cierra el servidor HTTP y el pool de la base de datos.
function shutdown(signal: string): void {
  logger.info(`${signal} recibido. Cerrando el servidor...`);
  server.close(async () => {
    await closePool();
    logger.info('Servidor cerrado correctamente.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
