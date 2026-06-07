# StudyMate AI - Instrucciones de Desarrollo

## Visión General del Proyecto

StudyMate AI es una plataforma educativa inteligente que funciona como un **simulador de exámenes con IA**. El sistema permite a estudiantes:

- Subir y gestionar documentos PDF de estudio
- Hacer preguntas sobre sus documentos y recibir respuestas basadas en IA (RAG)
- Generar cuestionarios automáticos para practicar
- Realizar exámenes simulados con tiempo límite
- Repasar con flashcards de repetición espaciada
- Ver su progreso en un dashboard

**Stack**: Node.js/Express (Backend) + React/Vite (Frontend) + PostgreSQL + OpenAI API

**Equipo**: Sergio Jardon (PO), Oscar Guadarrama (SM), Angel Perez (Developer Lead), Jose Toledo (QA/Backend)

## Estructura del Repositorio

Este es un **monorepo** con workspaces npm:

```
studymate-ai/
├── backend/          # Node.js/Express API
├── frontend/         # React/Vite UI
├── docs/             # Documentación
├── .github/          # GitHub workflows
├── package.json      # Workspaces root
├── docker-compose.yml
└── README.md
```

## Guías Principales

1. **[SETUP.md](SETUP.md)** - Instalación y configuración inicial
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Diseño del sistema y patrones
3. **[DEVELOPMENT.md](DEVELOPMENT.md)** - Convenciones y workflow
4. **[API.md](API.md)** - Documentación de endpoints (en construcción)

## Configuración Rápida

```bash
# 1. Clonar y entrar
git clone <repo> && cd studymate-ai

# 2. Copiar env
cp .env.example .env

# 3. Instalar
npm install

# 4. Iniciar (2 terminales)
npm run dev:backend      # Terminal 1
npm run dev:frontend     # Terminal 2

# O con Docker
docker-compose up -d
```

## Sprint 1 (Ejecutable)

**Objetivo**: MVP con autenticación, gestión de documentos y RAG/Chat

### Tickets Principales

- **HU-01**: Setup técnico (repos, CI, ambiente)
- **HU-02**: Registro de estudiante
- **HU-03**: Inicio de sesión
- **HU-04**: Subir PDFs
- **HU-05**: Ver y organizar documentos
- **HU-06**: Indexación RAG (embeddings + vector store)
- **HU-07**: Chat IA con citas

### Patrón de Desarrollo

Para cada Historia de Usuario:

1. **Crear rama**: `git checkout -b feature/HU-XX-nombre`
2. **Implementar servicio** (Backend)
3. **Crear rutas/API** (Backend)
4. **Implementar UI** (Frontend)
5. **Tests** (ambos lados)
6. **Pull Request** y code review

## Convenciones Importantes

### TypeScript

- Usar tipos explícitos en funciones públicas
- Preferir `interface` para tipos públicos, `type` para utilidades
- Evitar `any`, usar `unknown` si es necesario
- Habilitar strict mode en tsconfig.json

### Commits

Usar **Conventional Commits**:
- `feat:` Nueva característica
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `test:` Agregar tests
- `refactor:` Refactorización
- `chore:` Cambios de configuración

Ejemplo: `git commit -m "feat(auth): implement JWT token generation"`

### Código

- **Backend**: Express routes → Services → Data layer
- **Frontend**: Pages → Components → Hooks → Services
- **Estilo**: Prettier + ESLint (ejecutar antes de commit)
- **Error Handling**: Try/catch con logging
- **Validation**: Validar inputs en backend

## Stack de Tecnologías

| Aspecto | Tecnología |
|--------|-----------|
| Backend | Node.js 20 + Express + TypeScript |
| Frontend | React 18 + Vite + TypeScript |
| Base de Datos | PostgreSQL 15 |
| Vector Store | pgvector (para embeddings) |
| IA | OpenAI API (GPT-4) |
| Autenticación | JWT + bcrypt |
| Testing | Jest (backend) + Vitest (frontend) |
| Deployment | Docker + Docker Compose |

## Flujos Principales

### 1. Autenticación

```
Login → POST /api/auth/login → JWT Token → localStorage → Protected Routes
```

### 2. Upload de Documento

```
Select PDF → POST /api/documents/upload 
  → Extract text → Chunking → Generate Embeddings 
  → Store in pgvector → Ready for RAG
```

### 3. Chat IA (RAG)

```
User Question → Embed Query → Vector Search (pgvector) 
  → Get Top-K Chunks → Build Prompt → Call OpenAI 
  → Answer with Sources → Show to User
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev                  # Backend + Frontend
npm run dev:backend          # Solo backend
npm run dev:frontend         # Solo frontend

# Build
npm run build                # Build todo
npm run build:backend        # Build solo backend
npm run build:frontend       # Build solo frontend

# Testing
npm run test                 # Tests todo
npm test --workspace backend # Tests backend
npm test --workspace frontend # Tests frontend

# Linting
npm run lint                 # Lint todo
npm run lint:fix             # Fix problemas de lint
npm run format               # Formatear con Prettier

# Docker
docker-compose up -d         # Iniciar servicios
docker-compose down          # Parar servicios
docker-compose logs -f       # Ver logs
```

## Requisitos de Calidad

Antes de hacer un Pull Request:

- [ ] Código compila sin errores (`npm run build`)
- [ ] Tests pasan (`npm run test`)
- [ ] Lint pasa (`npm run lint`)
- [ ] Tipos correctos (`npm run type-check`)
- [ ] Documentado (comentarios en código complejo)
- [ ] Sigue convenciones del equipo

## Variables de Entorno Necesarias

```env
# Backend
BACKEND_PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/studymate_ai
OPENAI_API_KEY=sk-...
JWT_SECRET=tu-secret-seguro

# Frontend
VITE_API_URL=http://localhost:5000
```

## Donde Pedir Ayuda

1. **Documentación**: [docs/](docs/)
2. **Issues**: GitHub Issues para bugs o preguntas
3. **Team**: Contactar a Oscar (SM) o Angel (Tech Lead)
4. **Product Backlog**: [Product_Backlog_StudyMateAI.txt](../Product_Backlog_StudyMateAI.txt)

## Links Importantes

- 📋 Product Backlog: `Product_Backlog_StudyMateAI.txt`
- 🏗️ Arquitectura: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- 📖 Setup: [docs/SETUP.md](SETUP.md)
- 💻 Desarrollo: [docs/DEVELOPMENT.md](DEVELOPMENT.md)
- 📡 API Docs: [docs/API.md](API.md) (en construcción)

---

**Última actualización**: Junio 6, 2026  
**Version**: 1.0.0 - MVP  
**Curso**: Administración del Desarrollo de Software (ITESM)
