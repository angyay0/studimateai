import express, { Express, Request, Response } from 'express';
import cors from 'cors';
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

// Middlewares globales
app.use(cors(corsConfig));
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

// Información de la API
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'StudyMate AI API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      documents: '/api/documents',
      chat: '/api/chat',
      quizzes: '/api/quizzes',
      health: '/api/health',
    },
  });
});

// Rutas de la API
app.use('/api', apiRouter);

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
