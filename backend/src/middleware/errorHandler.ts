/**
 * Middleware centralizado de manejo de errores y de rutas no encontradas.
 *
 * Registrar SIEMPRE al final de la cadena de middlewares, después de las rutas:
 *   app.use(notFoundHandler);
 *   app.use(errorHandler);
 */

import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config';

/** Captura cualquier solicitud que no coincida con una ruta registrada. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/** Convierte un error de cualquier tipo en una respuesta JSON consistente. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifica un manejador de errores por su aridad de 4 argumentos,
  // por lo que `next` debe declararse aunque no se use.
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON malformado en el cuerpo de la petición (body-parser).
    statusCode = 400;
    message = 'JSON inválido en el cuerpo de la solicitud';
  } else if (err && typeof err === 'object' && (err as { name?: string }).name === 'MulterError') {
    // Errores de subida de archivos (p. ej. tamaño excedido).
    statusCode = 400;
    message = `Error al subir el archivo: ${(err as Error).message}`;
  } else if (err instanceof Error) {
    message = err.message;
  }

  // Log: 5xx como error (con stack), 4xx como advertencia.
  if (statusCode >= 500) {
    logger.error(err instanceof Error ? err.stack || err.message : String(err));
  } else {
    logger.warn(`${statusCode} ${message}`);
  }

  // No exponer detalles internos de errores 5xx en producción.
  const exposeMessage = statusCode < 500 || !env.isProduction;

  res.status(statusCode).json({
    error: {
      statusCode,
      message: exposeMessage ? message : 'Error interno del servidor',
      ...(details !== undefined ? { details } : {}),
    },
  });
}
