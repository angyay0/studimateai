# StudyMate AI

**Simulador Inteligente de Exámenes con IA** - Asistente de Estudio Basado en Inteligencia Artificial

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yourusername/studymate-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## 📋 Descripción del Proyecto

StudyMate AI es una plataforma educativa inteligente que utiliza Inteligencia Artificial (GPT-4) y Retrieval-Augmented Generation (RAG) para ayudar a estudiantes a mejorar su comprensión académica. El sistema permite a los estudiantes:

- **📄 Gestionar documentos**: Subir y organizar PDFs de materiales de estudio
- **🤖 Chat IA**: Hacer preguntas y recibir respuestas contextualizadas basadas en sus documentos
- **✏️ Generar cuestionarios**: Crear quizzes automáticos para autoevaluación
- **🎯 Simulador de examen**: Practicar con exámenes simulados bajo presión de tiempo
- **📊 Dashboard**: Visualizar progreso y desempeño académico
- **🎓 Flashcards**: Estudiar con repetición espaciada

Desarrollado por **Equipo 1** en el curso *Administración del Desarrollo de Software* (ITESM)

## 🏗️ Estructura del Proyecto

```
studymate-ai/
├── backend/                 # API REST con Node.js/Express
│   ├── src/
│   │   ├── api/            # Rutas de la API
│   │   ├── models/         # Modelos de datos
│   │   ├── services/       # Lógica de negocio
│   │   ├── middleware/     # Middleware personalizado
│   │   ├── config/         # Configuración
│   │   └── utils/          # Utilidades
│   ├── tests/              # Tests unitarios
│   ├── dist/               # Código compilado
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                # Aplicación React con Vite
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas/vistas
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Servicios de API
│   │   ├── utils/          # Funciones auxiliares
│   │   └── styles/         # Estilos globales
│   ├── public/             # Archivos estáticos
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
│
├── docs/                    # Documentación del proyecto
│   ├── API.md              # Documentación de endpoints
│   ├── SETUP.md            # Guía de instalación
│   ├── ARCHITECTURE.md     # Arquitectura del sistema
│   └── DEVELOPMENT.md      # Guía de desarrollo
│
├── .github/                 # Configuración de GitHub
├── docker-compose.yml       # Orquestación de contenedores
├── .env.example            # Variables de entorno de ejemplo
├── .gitignore              # Git ignore
├── .prettierrc              # Configuración de Prettier
├── package.json            # Configuración del monorepo
└── README.md               # Este archivo
```

## 🚀 Inicio Rápido

### Requisitos Previos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** (opcional, para uso con contenedores)
- **OpenAI API Key** (para funcionalidades de IA)
- **PostgreSQL** (para base de datos)

### Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/yourusername/studymate-ai.git
   cd studymate-ai
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones reales
   ```

3. **Instalar dependencias** (monorepo)
   ```bash
   npm install
   ```

4. **Iniciar en modo desarrollo**
   ```bash
   # En dos terminales diferentes:
   npm run dev:backend    # Terminal 1: inicia backend en :5000
   npm run dev:frontend   # Terminal 2: inicia frontend en :3000
   ```

5. **Acceder a la aplicación**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health check: http://localhost:5000/api/health

### Con Docker

```bash

# Reconstruye la imagen Docker del servidor
docker compose build --no-cache backend

# Iniciar todos los servicios (PostgreSQL, Backend, Frontend)
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

## 📦 Scripts Disponibles

### Monorepo
```bash
npm run dev              # Inicia backend y frontend simultáneamente
npm run build            # Compila backend y frontend
npm run test             # Ejecuta tests en ambas partes
npm run lint             # Ejecuta linter
npm run format           # Formatea código con Prettier
npm run clean            # Limpia node_modules y dist
```

### Backend
```bash
npm --workspace backend run dev         # Modo desarrollo con watch
npm --workspace backend run build       # Compilar TypeScript
npm --workspace backend run start       # Ejecutar código compilado
npm --workspace backend run test        # Ejecutar tests
npm --workspace backend run lint        # Análisis de código
npm --workspace backend run lint:fix    # Arreglar problemas de lint
npm --workspace backend run format      # Formatear código
```

### Frontend
```bash
npm --workspace frontend run dev        # Servidor de desarrollo (Vite)
npm --workspace frontend run build      # Build para producción
npm --workspace frontend run preview    # Previsualizar build
npm --workspace frontend run test       # Ejecutar tests
npm --workspace frontend run lint       # Análisis de código
npm --workspace frontend run lint:fix   # Arreglar problemas de lint
npm --workspace frontend run format     # Formatear código
```

## 🗄️ Base de Datos

Se utiliza **PostgreSQL** con las siguientes características:

- **Extensión pgvector**: Para almacenamiento de embeddings (vector store para RAG)
- **Modelos principales**: Users, Documents, ChatHistory, QuizResults, etc.

### Inicializar base de datos

```bash
# Las migraciones se ejecutarán automáticamente en el primer arranque
# O ejecutar manualmente:
npm --workspace backend run db:migrate
```

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura:

```env
# Backend
BACKEND_PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/studymate_ai

# OpenAI
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4-turbo

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:5000
```

## 🏛️ Arquitectura

### Backend (Node.js/Express)

- **Patrón RAG**: Retrieval-Augmented Generation para respuestas contextualizadas
- **OpenAI API**: Integración con GPT-4 para IA
- **pgvector**: Vector store para embeddings
- **JWT**: Autenticación con tokens
- **Multer**: Manejo de carga de archivos

### Frontend (React/TypeScript/Vite)

- **React 18**: UI library
- **React Router**: Navegación
- **Axios**: HTTP client
- **Zustand**: State management
- **Vite**: Build tool moderno

### Base de Datos

- **PostgreSQL**: Base de datos relacional
- **pgvector**: Extensión para operaciones con vectores

## 📚 Documentación Detallada

Consulta las siguientes guías para más información:

- [📖 Guía de Instalación y Setup](docs/SETUP.md)
- [🏗️ Documentación de Arquitectura](docs/ARCHITECTURE.md)
- [📡 API Reference](docs/API.md)
- [💻 Guía de Desarrollo](docs/DEVELOPMENT.md)

## 🔄 Flujo de Desarrollo

### Workflow Git

1. Crear rama: `git checkout -b feature/SMAI-XX/nombre-feature`
2. Desarrollar y commitear: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/SMAI-XX/nombre-feature`
4. Pull Request en GitHub
5. Code Review
6. Merge a `main`

### Convenciones de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva característica
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios que no afectan lógica
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Cambios en configuración

## 📋 Sprint Planning

Este proyecto sigue metodología **Scrum** con:

- **Sprint 1** (Semanas 1-2): MVP - Cuenta, documentos, RAG, chat IA
- **Sprint 2** (Semanas 3-4): Herramientas - Quizzes, simulador, flashcards, dashboard

Ver [Product Backlog Detallado](Product_Backlog_StudyMateAI.txt) para todos los detalles.

## 👥 Equipo

| Nombre | Rol | Responsabilidades |
|--------|-----|-------------------|
| Sergio Jardon | Product Owner | Priorización, validación de HUs |
| Oscar Guadarrama | Scrum Master | Ceremonias, DevOps, infraestructura |
| Angel Perez | Developer (Lead) | IA/RAG, Backend, Frontend |
| Jose Toledo | QA / Backend | Testing, validación, soporte backend |

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Contacto y Soporte

- 📧 **Email**: equipo1-studymate@tec.mx (ejemplo)
- 🐛 **Issues**: Usa el [tracker de GitHub Issues](../../issues)
- 💬 **Discussions**: Disponibles en [GitHub Discussions](../../discussions)

## 🙏 Agradecimientos

- **ITESM** - Instituto Tecnológico y de Estudios Superiores de Monterrey
- **Mtro. Gilberto Carlo Grajales Arana** - Profesor del curso
- **OpenAI** - Por la API de GPT-4
- Comunidad de código abierto

---

**Última actualización**: Junio 6, 2026

**Versión**: 1.0.0 - MVP (En Desarrollo)
