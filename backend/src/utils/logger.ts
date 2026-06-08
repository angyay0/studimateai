/**
 * Logger centralizado basado en Winston.
 *
 * Usa este logger en lugar de `console.log` para tener salidas consistentes,
 * con timestamps y niveles configurables vía la variable de entorno `LOG_LEVEL`.
 */

import winston from 'winston';
import { loggingConfig, env } from '../config';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Formato legible para desarrollo (coloreado, una línea por entrada).
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} [${level}] ${stack || message}`;
  })
);

// Formato estructurado (JSON) para producción, apto para agregadores de logs.
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: loggingConfig.level,
  format: env.isProduction ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  // Evita que el proceso se caiga si el logger encuentra un error interno.
  exitOnError: false,
});
