# Guía de Configuración e Instalación

## Requisitos del Sistema

- **Node.js**: >= 18.0.0 (recomendado 20.x LTS)
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 13
- **Git**: >= 2.30

## Instalación Step by Step

### 1. Clonar el repositorio

```bash
git clone <GITHUB_REPO_URL>
cd studymate-ai
```

### 2. Crear archivo .env

```bash
cp .env.example .env
```

Edita `.env` y configura:

```env
# Backend Server
BACKEND_PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studymate_ai
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studymate_ai
DB_USER=postgres
DB_PASSWORD=postgres

# OpenAI (obtén tu API key en https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4-turbo

# JWT Authentication
JWT_SECRET=tu-secret-super-seguro-cambiar-en-produccion
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:5000
```

Importante:
- Nunca subas `.env` al repositorio.
- `.env.example` solo debe contener valores de ejemplo.
- `OPENAI_API_KEY` y `JWT_SECRET` se leen desde variables de entorno en runtime.

### 2.1 Verificar conexion segura con OpenAI

Con el backend instalado, prueba la conexion sin imprimir la llave:

```bash
npm --workspace backend run openai:test
```

Tambien puedes verificarlo desde el endpoint seguro del backend:

```bash
curl http://localhost:5000/api/openai/health
```

Respuestas esperadas:

```json
{
  "configured": true,
  "ok": true,
  "model": "gpt-4-turbo",
  "status": 200,
  "message": "OpenAI API connection successful"
}
```

Si la llave no existe o sigue como placeholder, la respuesta sera `503`:

```json
{
  "configured": false,
  "ok": false,
  "model": "gpt-4-turbo",
  "message": "OPENAI_API_KEY is not configured"
}
```

### 3. Instalar dependencias del monorepo

```bash
npm install
```

Esto instalará dependencias para:
- Root package (workspaces)
- `./backend/node_modules`
- `./frontend/node_modules`

### 4. Configurar PostgreSQL

#### Opción A: PostgreSQL Local

```bash
# Windows (si tienes instalado PostgreSQL)
psql -U postgres

# O Linux/Mac
sudo -u postgres psql
```

```sql
-- Crear base de datos
CREATE DATABASE studymate_ai;

-- Crear usuario (si es necesario)
CREATE USER studymate_user WITH PASSWORD 'segura_password';

-- Dar permisos
ALTER ROLE studymate_user CREATEDB;
ALTER ROLE studymate_user SUPERUSER;
```

#### Opción B: Docker (Recomendado)

```bash
# Usando docker-compose (instala PostgreSQL automáticamente)
docker-compose up -d postgres
```

### 5. (Opcional) Instalar extensión pgvector

PostgreSQL necesita la extensión pgvector para almacenar embeddings:

```bash
# Primero conéctate a la BD
psql -U postgres -d studymate_ai

# Instalar extensión
CREATE EXTENSION IF NOT EXISTS vector;
```

O si usas Docker, ya viene preconfigurada en el `docker-compose.yml`.

## Desarrollo Local

### Terminal 1: Backend

```bash
npm run dev:backend
```

Espera a ver:
```
╔════════════════════════════════════════╗
║     StudyMate AI - Backend Server      ║
╚════════════════════════════════════════╝
  Server running on: http://localhost:5000
```

### Terminal 2: Frontend

```bash
npm run dev:frontend
```

Verás:
```
  VITE v5.0.2  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

### Terminal 3: (Opcional) Base de Datos

Si ejecutas PostgreSQL localmente:

```bash
# En Windows
psql -U postgres

# En Linux/Mac
sudo -u postgres psql studymate_ai
```

## Desarrollo con Docker

La forma más fácil de tener todo listo:

```bash
# Inicia todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Logs específicos
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

Accede a:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database: localhost:5432

Para detener:

```bash
docker-compose down

# O para limpiar todo (incluyendo datos)
docker-compose down -v
```

## Verificación de Instalación

### Health Checks

```bash
# Backend está vivo?
curl http://localhost:5000/api/health

# Respuesta esperada:
# {"status":"ok","environment":"development","timestamp":"2026-06-06T10:00:00.000Z"}

# Frontend cargando?
curl http://localhost:3000

# Debe devolver HTML de la aplicación
```

### Compilación y Lint

```bash
# Compilar TypeScript
npm run build

# Verificar tipos
npm run type-check

# Lint de código
npm run lint

# Formatear código
npm run format
```

## Troubleshooting

### Puerto ya en uso

```bash
# Backend puerto 5000 en uso?
# Windows
netstat -ano | findstr :5000
# Linux/Mac
lsof -i :5000

# Liberar puerto o cambiar en .env
BACKEND_PORT=5001
VITE_API_URL=http://localhost:5001
```

### Error de conexión a BD

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Solución:
- Verifica PostgreSQL esté corriendo: `psql -U postgres -d postgres -c "SELECT version();"`
- Actualiza DATABASE_URL en .env
- Si usas Docker: `docker-compose up -d postgres`

### OpenAI API Error

```
401 Unauthorized: Invalid Authentication
```

Verifica:
- API key correcta en .env
- Has activado billing en OpenAI
- Key no tiene espacios: `echo $OPENAI_API_KEY`

### npm install falla

```bash
# Limpiar caché
npm cache clean --force

# Eliminar node_modules
rm -rf node_modules backend/node_modules frontend/node_modules

# Reinstalar
npm install
```

## Configuración de IDE (VS Code)

Recomendado instalar extensiones:

1. **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
2. **Prettier - Code formatter** - esbenp.prettier-vscode
3. **ESLint** - dbaeumer.vscode-eslint
4. **Thunder Client** - rangav.vscode-thunder-client (para probar API)
5. **PostgreSQL** - ckolkman.vscode-postgres (opcional)
6. **Thunder Client** o **REST Client** para testear endpoints

Configuración de settings.json (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Próximos Pasos

1. ✅ Instalación completada
2. Leer [Documentación de Arquitectura](ARCHITECTURE.md)
3. Revisar [Endpoints de API](API.md)
4. Empezar a desarrollar siguiendo [Guía de Desarrollo](DEVELOPMENT.md)

---

**¿Necesitas ayuda?** Abre un issue o contacta al equipo.
