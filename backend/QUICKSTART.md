# Backend Setup - StudyMate AI

## Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 15
- OpenAI API Key

## Setup Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env
```

Edita `.env` con:
- `DB_*`: Credenciales de PostgreSQL
- `OPENAI_API_KEY`: Tu API key de OpenAI
- `JWT_SECRET`: Clave segura para JWT (cambia en producción)

### 3. Base de datos

```bash
# TODO: Crear base de datos
# psql -U postgres -c "CREATE DATABASE studymate_ai;"

# TODO: Ejecutar migraciones
# npm run db:migrate
```

### 4. Iniciar servidor en desarrollo

```bash
npm run dev
```

El servidor estará en: `http://localhost:5000`
API Docs en: `http://localhost:5000/api`
Health check: `http://localhost:5000/api/health`

## Comandos Disponibles

| Comando | Descripción |
|---------|-----------|
| `npm run dev` | Iniciar servidor con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Iniciar desde dist/ compilado |
| `npm test` | Ejecutar tests (Jest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run lint` | Ejecutar ESLint |
| `npm run lint:fix` | Arreglar problemas de lint |
| `npm run format` | Formatear código con Prettier |
| `npm run type-check` | Verificar tipos TypeScript |

## Estructura de Carpetas

```
backend/
├── src/
│   ├── index.ts                    # Punto de entrada
│   ├── api/                        # Rutas de API
│   │   ├── auth.routes.ts          # Autenticación
│   │   ├── documents.routes.ts     # Documentos
│   │   ├── chat.routes.ts          # Chat/RAG
│   │   └── quizzes.routes.ts       # Cuestionarios
│   ├── config/                     # Configuración
│   │   └── index.ts                # Env vars & config
│   ├── middleware/                 # Express middlewares
│   │   └── auth.middleware.ts      # Validación JWT
│   ├── models/                     # TypeScript interfaces/types
│   │   └── types.ts                # User, Document, ChatMessage, etc
│   ├── services/                   # Business logic (TODO)
│   │   ├── AuthService.ts
│   │   ├── DocumentService.ts
│   │   └── RAGService.ts
│   └── utils/                      # Utilidades
│       └── path.ts
├── tests/                          # Tests (Jest)
├── .env                            # Variables de entorno (local)
├── .env.example                    # Template de env vars
├── package.json
├── tsconfig.json
├── jest.config.js
└── Dockerfile
```

## Desarrollo

### Agregar nueva ruta

1. Crear archivo en `src/api/feature.routes.ts`
2. Implementar rutas con Express Router
3. Importar en `src/index.ts`
4. Registrar con `app.use('/api/feature', routes)`

### Estructura de Rutas

```typescript
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Ruta protegida (requiere autenticación)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const userId = req.user?.id; // Usuario autenticado disponible
  // ... lógica ...
  res.json({ /* respuesta */ });
});

export default router;
```

### Respuestas de Error

Usar formato consistente:

```json
{
  "error": "Error type",
  "message": "Descripción del error",
  "timestamp": "ISO timestamp"
}
```

## Debugging

### Ver logs en desarrollo

El servidor muestra logs de todas las requests:

```
[2024-06-06T10:30:45.123Z] POST /api/auth/login - 200 (45ms)
[2024-06-06T10:30:46.456Z] GET /api/documents - 401 (12ms)
```

### Variables de entorno

Verifica que todas las env vars requeridas estén configuradas:

```bash
grep "process.env" src/**/*.ts
```

## Next Steps (Según el Sprint)

- [ ] HU-02: Implementar servicio de autenticación
- [ ] HU-04: Servicio de upload de PDFs
- [ ] HU-06: Integración RAG con pgvector
- [ ] HU-07: Chat con OpenAI

Ver [ARCHITECTURE.md](../docs/ARCHITECTURE.md) para detalles de diseño.

---

**Última actualización**: Junio 6, 2024  
**Contacto**: Angel Perez (Tech Lead)
