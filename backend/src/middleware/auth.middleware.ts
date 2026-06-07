# Middleware de Autenticación Placeholder

import { Request, Response, NextFunction } from 'express';

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

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // TODO: Verify JWT token
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded as any;

    console.log('Auth middleware: Token verified (TODO: implement)');
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      // TODO: Verify JWT token
      // req.user = jwt.verify(token, process.env.JWT_SECRET) as any;
    }
    next();
  } catch {
    // Silently continue without auth
    next();
  }
}
