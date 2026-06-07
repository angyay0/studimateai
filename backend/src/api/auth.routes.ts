/**
 * Rutas de autenticación: /api/auth
 *
 * Esqueleto de endpoints (HU-02 / HU-03). Las validaciones de entrada ya son
 * funcionales; la lógica de negocio se conectará con `AuthService`.
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

/**
 * POST /api/auth/register — Registrar un nuevo estudiante (HU-02).
 */
router.post(
  '/register',
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('firstName').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('lastName').trim().notEmpty().withMessage('El apellido es obligatorio'),
  validate,
  asyncHandler(async () => {
    // TODO (HU-02): const user = await AuthService.register(email, password, firstName, lastName);
    //               res.status(201).json(user);
    throw ApiError.notImplemented('Registro de usuario pendiente (HU-02).');
  })
);

/**
 * POST /api/auth/login — Iniciar sesión y devolver un JWT (HU-03).
 */
router.post(
  '/login',
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  validate,
  asyncHandler(async () => {
    // TODO (HU-03): const result = await AuthService.login(email, password);
    //               res.json(result); // { token, user }
    throw ApiError.notImplemented('Inicio de sesión pendiente (HU-03).');
  })
);

/**
 * GET /api/auth/me — Datos del usuario autenticado.
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

export default router;
