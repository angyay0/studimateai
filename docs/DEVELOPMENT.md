# Guía de Desarrollo

## Convenciones de Código

### TypeScript

- **Tipos**: Usar tipos explícitos en funciones públicas
- **Interfaces vs Types**: Usar `interface` para objetos públicos, `type` para tipos de utilidad
- **Null/Undefined**: Usar strict null checks
- **Any**: Evitar `any`, usar `unknown` si es necesario

```typescript
// ✓ Bueno
export interface User {
  id: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

export async function getUser(id: string): Promise<User | null> {
  // ...
}

// ✗ Evitar
export function getUser(id: any): any {
  // ...
}
```

### Estructura de Archivos

Cada característica tiene su propia carpeta con estructura clara:

```
feature/
├── models/          # Tipos/interfaces
├── services/        # Lógica de negocio
├── routes.ts        # Rutas (backend) o Pages (frontend)
└── tests/           # Tests específicos de la feature
```

### Nombres de Variables y Funciones

- **camelCase** para variables y funciones
- **PascalCase** para clases y componentes React
- **UPPER_SNAKE_CASE** para constantes
- **Prefijos**: `is`, `has`, `should` para booleanos

```typescript
// Variables
const maxUploadSize = 20971520;
const isAuthenticated = true;

// Funciones
function validateEmail(email: string): boolean { }

// Componentes React
function DocumentList() { }

// Constantes
const ALLOWED_FILE_TYPES = ['pdf'];
```

## Desarrollo Backend

### Estructura de una Nueva Feature

1. **Crear modelo** en `src/models/`

```typescript
// src/models/Document.ts
export interface Document {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'indexed';
}
```

2. **Crear servicio** en `src/services/`

```typescript
// src/services/DocumentService.ts
import { Document } from '@models/Document';

export class DocumentService {
  static async uploadDocument(
    userId: string,
    file: Express.Multer.File
  ): Promise<Document> {
    // Validar
    // Procesar
    // Guardar
    // Retornar
  }

  static async getDocuments(userId: string): Promise<Document[]> {
    // Implementar
  }
}
```

3. **Crear rutas** en `src/api/`

```typescript
// src/api/documents.routes.ts
import { Router } from 'express';
import { authMiddleware } from '@middleware/auth.middleware';
import { DocumentService } from '@services/DocumentService';

const router = Router();

router.post(
  '/upload',
  authMiddleware,
  async (req, res) => {
    try {
      const document = await DocumentService.uploadDocument(
        req.user.id,
        req.file
      );
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
```

4. **Registrar rutas** en `src/index.ts`

```typescript
import documentsRouter from '@api/documents.routes';

app.use('/api/documents', documentsRouter);
```

### Testing Backend

```typescript
// tests/services/DocumentService.test.ts
import { DocumentService } from '@services/DocumentService';
import { describe, it, expect } from '@jest/globals';

describe('DocumentService', () => {
  describe('uploadDocument', () => {
    it('should upload a valid PDF', async () => {
      const mockFile = { /* ... */ };
      const userId = 'user123';

      const result = await DocumentService.uploadDocument(userId, mockFile);

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(userId);
    });

    it('should reject non-PDF files', async () => {
      const mockFile = { /* .doc file */ };

      expect(() =>
        DocumentService.uploadDocument('user123', mockFile)
      ).rejects.toThrow('Invalid file type');
    });
  });
});
```

## Desarrollo Frontend

### Estructura de un Componente React

```typescript
// src/components/Document/DocumentList.tsx
import React, { useState, useEffect } from 'react';
import { useDocuments } from '@hooks/useDocuments';
import { DocumentCard } from './DocumentCard';
import './DocumentList.css';

interface DocumentListProps {
  courseId?: string;
  onSelect?: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  courseId,
  onSelect,
}) => {
  const { documents, loading, error } = useDocuments(courseId);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="document-list">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
```

### Custom Hooks

```typescript
// src/hooks/useDocuments.ts
import { useState, useEffect } from 'react';
import { Document } from '@services/documentService';
import api from '@services/api';

export function useDocuments(courseId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/documents`, {
          params: { courseId },
        });
        setDocuments(response.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [courseId]);

  return { documents, loading, error };
}
```

### Estilos

Usar CSS Modules o CSS-in-JS para evitar conflictos:

```css
/* src/components/Document/DocumentList.css */
.document-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding: 20px;
}

.document-list__item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.document-list__item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

## Workflow Git

### 1. Crear una rama

```bash
# Rama para feature
git checkout -b feature/upload-documents

# Rama para bug fix
git checkout -b fix/auth-token-expiration

# Rama para documentación
git checkout -b docs/update-readme
```

### 2. Desarrollar

```bash
# Cambios
git add src/
git commit -m "feat(documents): add file upload functionality"

# Múltiples commits están bien
git commit -m "feat(documents): implement PDF parsing"
git commit -m "test(documents): add upload tests"
```

### 3. Push y Pull Request

```bash
git push origin feature/upload-documents
```

Crear PR en GitHub con descripción clara.

### 4. Code Review

- Esperar aprobación
- Responder comentarios
- Hacer cambios si es necesario

```bash
git add .
git commit -m "chore: address code review feedback"
git push origin feature/upload-documents
```

### 5. Merge

Una vez aprobado:

```bash
git checkout main
git pull origin main
git merge feature/upload-documents
git push origin main
```

O usar "Squash and merge" si son muchos commits.

## Testing

### Backend

```bash
# Ejecutar todos los tests
npm --workspace backend run test

# Tests específicos
npm --workspace backend run test -- DocumentService

# Coverage
npm --workspace backend run test -- --coverage
```

### Frontend

```bash
# Ejecutar tests
npm --workspace frontend run test

# Watch mode
npm --workspace frontend run test -- --watch

# Coverage
npm --workspace frontend run test -- --coverage
```

## Debugging

### Backend

```bash
# Terminal 1: Start con debugging
node --inspect-brk dist/index.js

# Terminal 2: Conectar inspector
# Abre chrome://inspect en Chrome
```

O usa VS Code:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/backend/dist/index.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### Frontend

Chrome DevTools integrado en Vite:
- Abre DevTools (F12)
- Sources tab para breakpoints
- Console para debugging

## Linting y Formatting

### Antes de cada commit

```bash
# Lint
npm run lint

# Fix automatically
npm run lint:fix

# Format código
npm run format
```

### Pre-commit hook (futuro)

Configurar Husky para ejecutar automáticamente antes de commit.

## Buenas Prácticas

### 1. Errores y Logging

```typescript
// ✓ Bueno
try {
  const user = await getUser(id);
  if (!user) {
    logger.warn(`User ${id} not found`);
    return null;
  }
} catch (error) {
  logger.error(`Failed to get user: ${error.message}`);
  throw new Error('Failed to fetch user data');
}

// ✗ Evitar
try {
  const user = await getUser(id);
} catch (e) {
  console.log(e);
}
```

### 2. Async/Await

```typescript
// ✓ Bueno - async/await legible
async function processDocument(file: File) {
  const text = await extractText(file);
  const chunks = chunkText(text);
  const embeddings = await generateEmbeddings(chunks);
  return embeddings;
}

// ✗ Evitar - Promise hell
function processDocument(file: File) {
  return extractText(file)
    .then((text) => chunkText(text))
    .then((chunks) => generateEmbeddings(chunks));
}
```

### 3. Validación de Input

```typescript
// ✓ Bueno
function createUser(email: string, password: string): Promise<User> {
  if (!email || !isValidEmail(email)) {
    throw new Error('Invalid email');
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  // Procesar...
}

// ✗ Evitar
function createUser(email: any, password: any) {
  // Sin validación
}
```

### 4. Composabilidad (DRY)

```typescript
// ✓ Reutilizable
const withAuth = (handler: Handler) => async (req, res) => {
  const token = extractToken(req);
  if (!token) return res.status(401).send('Unauthorized');

  try {
    req.user = await verifyToken(token);
    handler(req, res);
  } catch {
    res.status(401).send('Invalid token');
  }
};

// Usar
router.post('/protected', withAuth(async (req, res) => {
  // req.user disponible
}));
```

## Recursos

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)

---

¿Preguntas? Abre un issue o contacta al equipo.
