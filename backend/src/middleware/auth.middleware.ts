import { Request, Response, NextFunction } from 'express';
import { AuthError, AuthService } from '../services/AuthService';
// Middleware de Autenticación
import { ApiError } from '../utils/ApiError';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        sessionId: string;
      };
    }
  }
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({ error: 'Missing authorization header' });
      return;
    }

    req.user = await AuthService.verifySessionToken(token);
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(401).json({ error: 'Invalid session' });
  }

  // TODO (HU-03): verificar el JWT con AuthService.verifyToken(token)
  // y asignar el resultado a req.user antes de continuar:
  //   req.user = AuthService.verifyToken(token);
  //   next();
  next(ApiError.notImplemented('Verificación de JWT pendiente (HU-03).'));
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (token) {
      req.user = await AuthService.verifySessionToken(token);
    }
  } catch {
    // Continue without auth for optional routes.
  }

  next();
}

