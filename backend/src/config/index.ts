/**
 * Configuración de la aplicación, agrupada por dominio.
 *
 * Todos los valores derivan del objeto `env` (única fuente de verdad para las
 * variables de entorno). No leas `process.env` directamente en otros módulos:
 * importa desde aquí o desde `./env`.
 */
import { env } from './env';

export { env, assertEnvValid } from './env';

// Configuración del servidor HTTP
export const serverConfig = {
  port: env.port,
  nodeEnv: env.nodeEnv,
  isProduction: env.isProduction,
};

// Configuración de CORS
export const corsConfig = {
  origin: env.corsOrigin,
  credentials: true,
};

// Configuración de logging
export const loggingConfig = {
  level: env.logLevel,
};

// Configuración de base de datos
export const databaseConfig = {
  connectionString: env.databaseUrl,
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  user: env.dbUser,
  password: env.dbPassword,
};

// Configuración de OpenAI
export const openAiConfig = {
  apiKey: env.openaiApiKey,
  model: env.openaiModel,
  embeddingModel: env.embeddingModel,
};

// Configuración de JWT
export const jwtConfig = {
  secret: env.jwtSecret,
  expiresIn: env.jwtExpiration,
};

// Configuración de subida de archivos
export const uploadConfig = {
  maxFileSize: env.maxFileSize,
  allowedFileTypes: env.allowedFileTypes,
  uploadDir: env.uploadDir,
};
