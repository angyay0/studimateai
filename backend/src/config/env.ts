/**
 * Carga y validación centralizada de variables de entorno.
 *
 * Este módulo es la ÚNICA fuente de verdad para leer `process.env`.
 * El resto de la aplicación debe importar el objeto `env` (tipado e inmutable)
 * en lugar de acceder a `process.env` directamente.
 *
 * Responsabilidades:
 *  1. Localizar y cargar el archivo `.env` (soporta monorepo con workspaces).
 *  2. Parsear y tipar cada variable (string, number, boolean, lista).
 *  3. Aplicar valores por defecto seguros para desarrollo.
 *  4. Validar que las variables críticas existan y no usen valores inseguros.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Busca el primer archivo `.env` disponible.
 *
 * Al ejecutarse dentro de un monorepo con workspaces npm, el proceso puede
 * arrancar desde la raíz o desde `backend/`, por lo que probamos varias rutas
 * candidatas en orden de prioridad.
 */
function loadEnvFile(): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'), // cwd (raíz del monorepo en npm workspaces)
    path.resolve(__dirname, '../../.env'), // backend/.env
    path.resolve(__dirname, '../../../.env'), // raíz del monorepo (desde dist/config)
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
  }

  // Si no se encuentra ningún archivo, dotenv usará las variables ya presentes
  // en el entorno (útil en Docker / CI donde se inyectan directamente).
  dotenv.config();
}

loadEnvFile();

/** Acumula errores de validación para reportarlos todos juntos. */
const validationErrors: string[] = [];

/** Acumula advertencias no bloqueantes (defaults inseguros en desarrollo). */
const validationWarnings: string[] = [];

type Environment = 'development' | 'test' | 'production';

const NODE_ENV = (process.env.NODE_ENV || 'development') as Environment;
const IS_PRODUCTION = NODE_ENV === 'production';

/** Marca un problema: error duro en producción, advertencia en desarrollo. */
function flagMissing(key: string, hint: string): void {
  const message = `${key} no está configurada. ${hint}`;
  if (IS_PRODUCTION) {
    validationErrors.push(message);
  } else {
    validationWarnings.push(message);
  }
}

function getString(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

function getNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    validationErrors.push(`${key} debe ser numérica, se recibió "${raw}".`);
    return defaultValue;
  }
  return parsed;
}

function getList(key: string, defaultValue: string[]): string[] {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// Valores por defecto considerados inseguros: solo se toleran fuera de producción.
const INSECURE_DEFAULTS = new Set([
  'your-secret-key',
  'your-super-secret-jwt-key-change-this-in-production',
  'tu-secret-super-seguro-cambiar-en-produccion',
  'change-me',
]);

// --- JWT_SECRET (crítico para seguridad) -----------------------------------
const jwtSecret = getString('JWT_SECRET', 'dev-only-insecure-jwt-secret');
if (!process.env.JWT_SECRET) {
  flagMissing('JWT_SECRET', 'Es obligatoria para firmar tokens de sesión.');
} else if (IS_PRODUCTION && (INSECURE_DEFAULTS.has(jwtSecret) || jwtSecret.length < 32)) {
  validationErrors.push(
    'JWT_SECRET es demasiado débil para producción (usa un valor aleatorio de 32+ caracteres).'
  );
}

// --- OPENAI_API_KEY (requerida para RAG / IA) ------------------------------
if (!process.env.OPENAI_API_KEY) {
  flagMissing('OPENAI_API_KEY', 'Es necesaria para las funciones de IA (chat y quizzes).');
}

// --- DATABASE_URL (requerida para persistencia) ----------------------------
if (!process.env.DATABASE_URL) {
  flagMissing('DATABASE_URL', 'Es necesaria para conectar con PostgreSQL.');
}

/**
 * Objeto de configuración tipado e inmutable derivado del entorno.
 * Importa esto en lugar de leer `process.env` directamente.
 */
export const env = Object.freeze({
  /** Entorno de ejecución actual. */
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  isDevelopment: NODE_ENV === 'development',
  isTest: NODE_ENV === 'test',

  // Servidor
  port: getNumber('BACKEND_PORT', 5000),
  corsOrigin: getString('CORS_ORIGIN', 'http://localhost:3000'),
  logLevel: getString('LOG_LEVEL', IS_PRODUCTION ? 'info' : 'debug'),

  // Base de datos
  databaseUrl: getString(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/studymate_ai'
  ),
  dbHost: getString('DB_HOST', 'localhost'),
  dbPort: getNumber('DB_PORT', 5432),
  dbName: getString('DB_NAME', 'studymate_ai'),
  dbUser: getString('DB_USER', 'postgres'),
  dbPassword: getString('DB_PASSWORD', 'postgres'),

  // OpenAI / IA
  openaiApiKey: getString('OPENAI_API_KEY', ''),
  openaiModel: getString('OPENAI_MODEL', 'gpt-4-turbo'),
  embeddingModel: getString('EMBEDDING_MODEL', 'text-embedding-3-small'),

  // Autenticación
  jwtSecret,
  jwtExpiration: getString('JWT_EXPIRATION', '7d'),

  // Subida de archivos
  maxFileSize: getNumber('MAX_FILE_SIZE', 20971520), // 20 MB
  allowedFileTypes: getList('ALLOWED_FILE_TYPES', ['pdf']),
  uploadDir: getString('UPLOAD_DIR', 'uploads'),
});

export type Env = typeof env;

/**
 * Reporta advertencias y aborta el arranque si hay errores críticos.
 * Debe invocarse una vez al iniciar el servidor (después de configurar el logger).
 */
export function assertEnvValid(
  log: { warn: (msg: string) => void; error: (msg: string) => void } = console
): void {
  for (const warning of validationWarnings) {
    log.warn(`[env] ${warning}`);
  }

  if (validationErrors.length > 0) {
    for (const error of validationErrors) {
      log.error(`[env] ${error}`);
    }
    throw new Error(
      `Configuración de entorno inválida: ${validationErrors.length} error(es). ` +
        'Revisa tu archivo .env (usa .env.example como plantilla).'
    );
  }
}
