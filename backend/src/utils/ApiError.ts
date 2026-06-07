/**
 * Error de aplicación con código de estado HTTP asociado.
 *
 * Permite lanzar errores semánticos desde servicios y rutas; el middleware
 * `errorHandler` los traduce a respuestas JSON con el `statusCode` correcto.
 *
 * @example
 *   throw ApiError.notFound('Documento no encontrado');
 *   throw ApiError.badRequest('Email inválido', { field: 'email' });
 */
export class ApiError extends Error {
  public readonly statusCode: number;

  /** Distingue errores esperados (operacionales) de bugs inesperados. */
  public readonly isOperational: boolean;

  /** Información adicional opcional para el cliente (p. ej. campos inválidos). */
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Solicitud inválida', details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'No autenticado'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Acceso denegado'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = 'Recurso no encontrado'): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflicto con el estado actual del recurso'): ApiError {
    return new ApiError(409, message);
  }

  static payloadTooLarge(message = 'El archivo excede el tamaño máximo permitido'): ApiError {
    return new ApiError(413, message);
  }

  static internal(message = 'Error interno del servidor'): ApiError {
    return new ApiError(500, message, undefined, false);
  }

  /** Para endpoints declarados pero aún sin implementar (esqueleto). */
  static notImplemented(message = 'Funcionalidad aún no implementada'): ApiError {
    return new ApiError(501, message);
  }
}
