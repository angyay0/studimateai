// Middleware de Autenticación

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Extender tipos de Express
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Protege rutas que requieren autenticación.
 *
 * Falla de forma segura ("fail closed"): si falta el token responde 401, y
 * mientras la verificación de JWT no esté implementada responde 501 en lugar de
 * aceptar tokens sin validar.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Falta el encabezado Authorization con formato "Bearer <token>".'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    next(ApiError.unauthorized('Token no proporcionado.'));
    return;
  }

  // TODO (HU-03): verificar el JWT con AuthService.verifyToken(token)
  // y asignar el resultado a req.user antes de continuar:
  //   req.user = AuthService.verifyToken(token);
  //   next();
  next(ApiError.notImplemented('Verificación de JWT pendiente (HU-03).'));
}

/**
 * Autenticación opcional: adjunta el usuario si hay un token válido, pero nunca
 * bloquea la petición. Útil para endpoints públicos con comportamiento extra
 * cuando el usuario está autenticado.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // TODO (HU-03): intentar verificar el token y asignar req.user si es válido.
    // Cualquier error debe ignorarse silenciosamente para no bloquear la petición.
  }
  next();
}

