import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenAIService } from './services/OpenAIService';
import { AuthError, AuthService, passwordPolicyMessage } from './services/AuthService';
import { authMiddleware } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.BACKEND_PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3001,http://127.0.0.2:3001')
  .split(',')
  .map((origin) => origin.trim());

// Middleware
app.use(cors({
  origin(origin, callback) {
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

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    environment: NODE_ENV,
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

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     StudyMate AI - Backend Server      ║
╚════════════════════════════════════════╝
  
  Server running on: http://localhost:${PORT}
  Environment: ${NODE_ENV}
  API Docs: http://localhost:${PORT}/api
  
  Ready to receive requests...
  `);
});

export default app;
