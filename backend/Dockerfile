# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Build arguments from CICD (runtime environment variables)
ARG NODE_ENV=production
ARG BACKEND_PORT=3000
ARG DATABASE_URL
ARG JWT_SECRET
ARG JWT_EXPIRATION=7d
ARG CORS_ORIGIN=http://localhost:3000
ARG LOG_LEVEL=info

# OpenAI Configuration
ARG OPENAI_API_KEY
ARG OPENAI_MODEL=gpt-4-turbo
ARG EMBEDDING_MODEL=text-embedding-3-small
ARG OPENAI_RAG_MODEL=gpt-4-turbo
ARG OPENAI_VECTOR_STORE_PREFIX=exam-rag

# File Upload Configuration
ARG MAX_FILE_SIZE=20971520
ARG ALLOWED_FILE_TYPES=pdf,txt,md,docx
ARG UPLOAD_DIR=uploads
ARG STORAGE_PROVIDER=local
ARG STORAGE_BUCKET=

# DigitalOcean Spaces Configuration (optional)
ARG SPACES_ACCESS_KEY=
ARG SPACES_SECRET_KEY=
ARG SPACES_ENDPOINT=
ARG SPACES_REGION=nyc3
ARG SPACES_BUCKET=

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV BACKEND_PORT=$BACKEND_PORT
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV JWT_EXPIRATION=$JWT_EXPIRATION
ENV CORS_ORIGIN=$CORS_ORIGIN
ENV LOG_LEVEL=$LOG_LEVEL

# OpenAI
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV OPENAI_MODEL=$OPENAI_MODEL
ENV EMBEDDING_MODEL=$EMBEDDING_MODEL
ENV OPENAI_RAG_MODEL=$OPENAI_RAG_MODEL
ENV OPENAI_VECTOR_STORE_PREFIX=$OPENAI_VECTOR_STORE_PREFIX

# File Upload
ENV MAX_FILE_SIZE=$MAX_FILE_SIZE
ENV ALLOWED_FILE_TYPES=$ALLOWED_FILE_TYPES
ENV UPLOAD_DIR=$UPLOAD_DIR
ENV STORAGE_PROVIDER=$STORAGE_PROVIDER
ENV STORAGE_BUCKET=$STORAGE_BUCKET

# DigitalOcean Spaces
ENV SPACES_ACCESS_KEY=$SPACES_ACCESS_KEY
ENV SPACES_SECRET_KEY=$SPACES_SECRET_KEY
ENV SPACES_ENDPOINT=$SPACES_ENDPOINT
ENV SPACES_REGION=$SPACES_REGION
ENV SPACES_BUCKET=$SPACES_BUCKET

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create upload and temp directories
RUN mkdir -p uploads temp && chown -R node:node uploads temp

# Use non-root user for security
USER node

# Expose backend port
EXPOSE $BACKEND_PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${BACKEND_PORT}/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]