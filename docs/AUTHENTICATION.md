# StudyMate AI - Autenticacion y Sesiones

Esta guia resume lo implementado para usuarios, sesiones y recuperacion de contrasena usando el stack del proyecto:

- Frontend: React + Vite.
- Backend: Node.js + Express + TypeScript.
- Base de datos: PostgreSQL.
- Seguridad: bcrypt para contrasenas, JWT para sesion y variables de entorno para secretos.

## Servicios Locales

Con Docker Compose:

```text
Frontend:  http://localhost:3001
Backend:   http://localhost:5000
Postgres:  localhost:5433
```

Comandos utiles:

```bash
docker compose up -d
docker compose exec backend npm --workspace backend run db:migrate
docker compose exec backend npm --workspace backend run build
docker compose exec frontend npm --workspace front run build
```

## Variables de Entorno

Las llaves y secretos no se suben al repositorio. Deben vivir en `.env`.

```env
OPENAI_API_KEY=sk-tu-llave-real
JWT_SECRET=un-secret-local-seguro
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/studymate_ai
```

`.env` esta ignorado por Git. `.env.example` solo debe contener valores de ejemplo.

## Base de Datos

La base real es PostgreSQL. Tablas agregadas:

- `users`: usuarios registrados.
- `sessions`: sesiones activas, expiradas o revocadas.
- `password_reset_tokens`: tokens temporales para recuperar contrasena.

Migraciones:

```text
backend/migrations/001_create_users.sql
backend/migrations/002_create_sessions.sql
backend/migrations/003_create_password_reset_tokens.sql
```

Verificar tablas:

```bash
docker compose exec postgres psql -U postgres -d studymate_ai -c "\dt"
```

## Registro

El registro ya no es mock.

```text
React form -> POST /api/auth/register -> AuthService -> bcrypt hash -> PostgreSQL users
```

Endpoint:

```http
POST /api/auth/register
```

Body:

```json
{
  "email": "alumno@tec.mx",
  "password": "password123",
  "firstName": "Alumno",
  "lastName": "Tec"
}
```

Reglas:

- Email requerido y unico.
- Contrasena minima de 8 caracteres, al menos una letra y al menos un simbolo.
- La contrasena se guarda como `password_hash`.
- Nunca se guarda en texto plano.
- Si el email ya existe, responde `409`.

## Login

Endpoint:

```http
POST /api/auth/login
```

Body:

```json
{
  "email": "alumno@tec.mx",
  "password": "password123",
  "rememberMe": true
}
```

Si las credenciales son correctas, el backend devuelve:

- `token`: JWT con `sessionId`.
- `user`: datos publicos del usuario.
- `session`: datos de sesion.

Si las credenciales son incorrectas, responde `401` con mensaje generico:

```json
{
  "error": "Invalid email or password."
}
```

No revela si fallo el correo o la contrasena.

## Remember Me

`Remember me` funciona asi:

- Marcado:
  - El token se guarda en `localStorage`.
  - El JWT dura 30 dias.
  - El correo se recuerda para rellenar el login.
- No marcado:
  - El token se guarda en `sessionStorage`.
  - El JWT dura 1 dia.
  - Se pierde al cerrar navegador o pestana.

Por seguridad, la app no guarda ni rellena contrasenas. Eso debe manejarlo el navegador o un password manager.

## Limite de Sesiones

Cada usuario puede tener maximo 2 sesiones activas.

Cuando se crea una tercera sesion:

```text
sesion nueva entra -> se conserva la sesion nueva y la anterior -> se revoca la mas vieja
```

Esto se controla en la tabla `sessions`.

## Expiracion por Inactividad

Cada sesion expira despues de 45 minutos sin uso.

Cada request autenticado al backend actualiza `last_seen_at`. Si pasan mas de 45 minutos:

- La sesion se revoca.
- El endpoint responde `401`.
- El frontend limpia sesion y redirige al login.

El frontend tambien tiene un temporizador local de 45 minutos sin actividad.

## Rutas Privadas

El frontend revisa si existe sesion antes de mostrar rutas privadas:

- `/dashboard`
- `/upload`
- `/quiz-mode`
- `/progress`

El backend valida sesion real con:

```http
GET /api/auth/me
```

Requiere:

```http
Authorization: Bearer <token>
```

Si la sesion es valida, responde `200`. Si no, responde `401`.

## Logout

Endpoint:

```http
POST /api/auth/logout
```

Al cerrar sesion:

- Se marca `revoked_at` en `sessions`.
- El frontend borra `authToken` y `user`.
- Si `Remember me` estaba activo, conserva el correo recordado.

## Recuperacion de Contrasena

El boton `Forgot password?` abre el flujo de recuperacion.

Paso 1:

```http
POST /api/auth/forgot-password
```

Body:

```json
{
  "email": "alumno@tec.mx"
}
```

El backend genera un token temporal que expira en 15 minutos.

En desarrollo (`NODE_ENV=development`) el token se devuelve en la respuesta para poder probar sin SMTP. En produccion debe enviarse por correo y no devolverse al frontend.

Paso 2:

```http
POST /api/auth/reset-password
```

Body:

```json
{
  "email": "alumno@tec.mx",
  "token": "token-temporal",
  "password": "nuevaPassword123"
}
```

Al cambiar contrasena:

- Se actualiza `password_hash`.
- Se marca el token como usado.
- Se invalidan las sesiones activas del usuario.

## Mostrar u Ocultar Contrasena

El formulario tiene boton de ojo para mostrar u ocultar contrasena en:

- Login.
- Registro.
- Confirmar contrasena.
- Nueva contrasena.
- Confirmar nueva contrasena.

## OpenAI API

La conexion segura a OpenAI se valida con:

```bash
npm --workspace backend run openai:test
```

O por endpoint:

```http
GET /api/openai/health
```

La llave se lee desde `OPENAI_API_KEY`. No se imprime ni se sube al repositorio.

## Pruebas Realizadas

Se verifico:

- Registro real contra PostgreSQL.
- Password guardado como bcrypt hash.
- Login correcto.
- Login incorrecto con error generico.
- Email duplicado con `409`.
- Maximo 2 sesiones por usuario.
- Tercera sesion revoca la mas vieja.
- Logout invalida sesion.
- Inactividad simulada de 46 minutos responde `401`.
- Recuperacion de contrasena genera token.
- Reset password permite login con nueva contrasena.
- Remember me recuerda correo y cambia persistencia.
- Build backend y frontend pasan.

## Pendientes Recomendados

- Configurar SMTP real para enviar tokens de recuperacion por correo.
- Definir `JWT_SECRET` en `.env` local.
- Agregar tests automatizados para auth y sesiones.
- Conectar documentos, quizzes y progreso a backend real; esas partes aun usan datos mock.
