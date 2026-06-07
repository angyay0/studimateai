# Documentación de Arquitectura

## Visión General

StudyMate AI utiliza una arquitectura moderna de **microservicios monorepo** con:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │◄─────►  │   Backend    │◄─────►  │  PostgreSQL │
│  React/Vite │  HTTP   │  Express/TS  │   SQL   │  + pgvector │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  OpenAI API  │
                        │  (GPT-4 IA)  │
                        └──────────────┘
```

## Stack Tecnológico

### Backend

| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Runtime | Node.js 20+ | Ejecución de JavaScript/TypeScript |
| Framework Web | Express.js | Servidor HTTP y rutas API |
| Lenguaje | TypeScript | Tipado estático y mejor DX |
| Autenticación | JWT + bcrypt | Tokens seguros |
| BD Relacional | PostgreSQL 15 | Datos estructurados (users, docs, etc.) |
| Vector Store | pgvector | Embeddings para RAG |
| IA | OpenAI API | GPT-4 para generación de texto |
| Upload Files | Multer | Manejo seguro de cargas |
| Testing | Jest | Tests unitarios |

### Frontend

| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Librería | React 18 | UI components |
| Lenguaje | TypeScript | Tipado estático |
| Build Tool | Vite 5 | Build rápido y moderno |
| Routing | React Router v6 | Navegación SPA |
| HTTP | Axios | Cliente HTTP |
| State | Zustand | Gestión de estado ligera |
| Testing | Vitest | Tests unitarios |
| Estilos | CSS + Tailwind* | Estilización (*opcional) |

## Arquitectura de Capas (Backend)

```
┌──────────────────────────────────────┐
│         Express Routes (API)         │  ← Endpoints /api/*
├──────────────────────────────────────┤
│         Middleware Layer             │  ← Auth, validation, error handling
├──────────────────────────────────────┤
│         Service Layer                │  ← Business logic
│  ┌────────────┐ ┌────────────┐     │
│  │   Auth     │ │ Document   │     │
│  │ Service    │ │ Service    │     │
│  └────────────┘ └────────────┘     │
│  ┌────────────┐ ┌────────────┐     │
│  │   RAG      │ │   Chat     │     │
│  │ Service    │ │ Service    │     │
│  └────────────┘ └────────────┘     │
├──────────────────────────────────────┤
│         Data Access Layer            │  ← Database queries
│  ┌──────────────┐ ┌─────────────┐  │
│  │   Models     │ │  Queries    │  │
│  │  (Types)     │ │  (SQL)      │  │
│  └──────────────┘ └─────────────┘  │
├──────────────────────────────────────┤
│    External Services Integration     │  ← OpenAI, Storage
├──────────────────────────────────────┤
│      PostgreSQL + pgvector           │  ← Persistencia
└──────────────────────────────────────┘
```

## Patrón RAG (Retrieval-Augmented Generation)

Este es el corazón del sistema IA:

### 1. Ingesta (Indexing)

```
Document Upload
    ▼
Extract Text (PDF Parser)
    ▼
Text Chunking (estrategia de segmentación)
    ▼
Generate Embeddings (OpenAI text-embedding-3-small)
    ▼
Store in pgvector (PostgreSQL)
    ▼
Indexed & Ready for Queries
```

### 2. Consulta (Retrieval)

```
User Question
    ▼
Generate Query Embedding
    ▼
Vector Search (pgvector similarity)
    ▼
Retrieve Top-K Similar Chunks
    ▼
Extract Metadata (source doc, page, section)
```

### 3. Generación (Generation)

```
Retrieved Context + User Question
    ▼
Build Prompt (RAG prompt template)
    ▼
Call OpenAI API (GPT-4)
    ▼
Generate Answer with Source Citations
    ▼
Return to User
```

**Beneficio**: El modelo solo responde basado en documentos reales del usuario → Menos alucinaciones

## Estructura de Carpetas (Backend)

```
backend/
├── src/
│   ├── index.ts                    # Punto de entrada
│   │
│   ├── api/
│   │   ├── auth.routes.ts          # Rutas de autenticación
│   │   ├── documents.routes.ts     # Rutas de documentos
│   │   ├── chat.routes.ts          # Rutas de chat
│   │   ├── quizzes.routes.ts       # Rutas de cuestionarios
│   │   └── admin.routes.ts         # Rutas administrativas
│   │
│   ├── models/
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── User.ts                 # User schema/type
│   │   ├── Document.ts             # Document schema/type
│   │   ├── ChatMessage.ts          # Chat message type
│   │   └── Quiz.ts                 # Quiz type
│   │
│   ├── services/
│   │   ├── AuthService.ts          # Lógica de autenticación
│   │   ├── DocumentService.ts      # Gestión de documentos
│   │   ├── RAGService.ts           # Lógica de RAG/embeddings
│   │   ├── ChatService.ts          # Chat con IA
│   │   └── QuizService.ts          # Generación de quizzes
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Protección de rutas
│   │   ├── errorHandler.ts         # Manejo de errores
│   │   ├── validation.ts           # Validación de entrada
│   │   └── logger.ts               # Logging
│   │
│   ├── config/
│   │   ├── index.ts                # Configuración general
│   │   ├── database.ts             # Configuración BD
│   │   └── openai.ts               # Configuración OpenAI
│   │
│   └── utils/
│       ├── validators.ts           # Funciones de validación
│       ├── security.ts             # Seguridad (hash, etc.)
│       ├── fileHandler.ts          # Manejo de archivos
│       └── logger.ts               # Logger utility
│
├── tests/
│   ├── unit/                       # Tests unitarios
│   └── integration/                # Tests de integración
│
├── dist/                           # Output compilado
├── package.json
├── tsconfig.json
├── .eslintrc.json
└── Dockerfile
```

## Estructura de Carpetas (Frontend)

```
frontend/
├── src/
│   ├── main.tsx                    # Punto de entrada
│   ├── App.tsx                     # Componente raíz
│   ├── index.css                   # Estilos globales
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── Document/
│   │   │   ├── DocumentList.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   └── DocumentPreview.tsx
│   │   ├── Chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── Quiz/
│   │   │   ├── QuizList.tsx
│   │   │   ├── QuizQuestion.tsx
│   │   │   └── QuizResults.tsx
│   │   └── Common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Documents.tsx
│   │   ├── Chat.tsx
│   │   ├── Quizzes.tsx
│   │   └── NotFound.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Hook de autenticación
│   │   ├── useDocuments.ts         # Hook de documentos
│   │   ├── useChat.ts              # Hook de chat
│   │   └── useFetch.ts             # Hook genérico de fetch
│   │
│   ├── services/
│   │   ├── api.ts                  # Cliente HTTP
│   │   ├── authService.ts          # Servicio de auth
│   │   ├── documentService.ts      # Servicio de docs
│   │   └── chatService.ts          # Servicio de chat
│   │
│   ├── utils/
│   │   ├── validators.ts           # Validadores
│   │   ├── formatters.ts           # Formateadores
│   │   └── constants.ts            # Constantes
│   │
│   └── styles/
│       ├── variables.css           # Variables CSS
│       ├── components.css          # Estilos de componentes
│       └── responsive.css          # Media queries
│
├── public/                         # Assets estáticos
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .eslintrc.json
└── Dockerfile
```

## Flujo de Autenticación

```
┌─────────────────────────────────────┐
│  1. User Registration               │
├─────────────────────────────────────┤
│  Frontend → POST /api/auth/register │
│  Email + Password (validado)        │
├─────────────────────────────────────┤
│  2. Backend                         │
│  • Validar inputs                   │
│  • Hash password (bcrypt)           │
│  • Guardar en DB                    │
├─────────────────────────────────────┤
│  3. Respuesta                       │
│  ✓ Usuario creado o ✗ Error        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  1. User Login                      │
├─────────────────────────────────────┤
│  Frontend → POST /api/auth/login    │
│  Email + Password                   │
├─────────────────────────────────────┤
│  2. Backend                         │
│  • Buscar usuario                   │
│  • Comparar password hash           │
│  • Generar JWT token                │
│  • Guardar en localStorage (FE)     │
├─────────────────────────────────────┤
│  3. Respuesta                       │
│  { token, user }                    │
├─────────────────────────────────────┤
│  4. Protected Routes                │
│  Authorization: Bearer <token>      │
│  (verificado en middleware)         │
└─────────────────────────────────────┘
```

## Flujo de Upload de Documento

```
┌────────────────────────────────────────┐
│  1. Frontend - Seleccionar PDF         │
│  File <input> o Drag & Drop            │
├────────────────────────────────────────┤
│  2. Validación Frontend                │
│  • Tipo = PDF                          │
│  • Tamaño <= 20MB                      │
├────────────────────────────────────────┤
│  3. Upload con FormData                │
│  POST /api/documents/upload            │
├────────────────────────────────────────┤
│  4. Backend - Procesar                 │
│  • Guardar archivo en storage          │
│  • Extraer texto del PDF               │
│  • Validar contenido                   │
├────────────────────────────────────────┤
│  5. Indexar en RAG                     │
│  • Chunking de texto                   │
│  • Generar embeddings (OpenAI)         │
│  • Guardar en pgvector                 │
├────────────────────────────────────────┤
│  6. Guardar Metadata                   │
│  • ID documento                        │
│  • Nombre, fecha, usuario              │
│  • Estado (indexado)                   │
├────────────────────────────────────────┤
│  7. Respuesta                          │
│  ✓ Documento indexado o ✗ Error       │
└────────────────────────────────────────┘
```

## Seguridad

### 1. Autenticación
- JWT tokens con expiración
- Refresh tokens (futuro)
- Rate limiting en login

### 2. Autorización
- Middleware de verificación JWT
- Control de acceso por recurso (user only owns his docs)

### 3. Encriptación
- Contraseñas: bcrypt con salt
- CORS habilitado solo para frontend
- HTTPS en producción

### 4. Validación
- Input validation en backend
- SQL injection prevention (ORM/parameterized queries)
- XSS prevention (sanitizar output)

### 5. Secretos
- Variables de entorno (.env no en repo)
- API keys no loguear
- JWT secret configurado en runtime

## Performance & Escalabilidad

### Optimizaciones Implementadas

1. **Caching**: Redis para sesiones (futuro)
2. **Lazy Loading**: Componentes React lazy-loaded
3. **Code Splitting**: Vite automático
4. **Vector Search**: Índices en pgvector
5. **Rate Limiting**: Protección de API
6. **Paginación**: Listados grandes paginados

### Monitoreo

- Logs centralizados (Winston)
- Métricas de API (response time, errores)
- Health checks periódicos

## Deployment

### Ambiente de Desarrollo
```bash
npm run dev  # Ambos servicios
```

### Ambiente de Producción
```bash
# Build
npm run build

# Con Docker
docker-compose -f docker-compose.prod.yml up
```

---

**Próxima sección**: [Documentación de API](API.md)
