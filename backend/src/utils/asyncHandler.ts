/**
 * Envuelve un manejador de ruta asíncrono para capturar errores y delegarlos
 * al middleware de manejo de errores de Express mediante `next(err)`.
 *
 * Evita tener que escribir bloques try/catch repetitivos en cada ruta.
 *
 * @example
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const data = await service.getData();
 *     res.json(data);
 *   }));
 */
import { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
