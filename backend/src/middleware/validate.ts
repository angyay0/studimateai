/**
 * Middleware de validación basado en `express-validator`.
 *
 * Se coloca después de las cadenas de validación de una ruta; si alguna falla,
 * responde con 400 y la lista de errores en un formato consistente.
 *
 * @example
 *   router.post('/login',
 *     body('email').isEmail(),
 *     body('password').notEmpty(),
 *     validate,
 *     handler
 *   );
 */
import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    next();
    return;
  }

  const formatted = errors.array().map((err) => ({
    field: err.type === 'field' ? err.path : undefined,
    message: err.msg,
  }));

  next(ApiError.badRequest('Error de validación en los datos enviados', formatted));
}
