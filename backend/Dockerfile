# Build stage
FROM node:18-alpine as build

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
FROM node:18-alpine

# Build arguments from CICD (runtime environment variables)
ARG NODE_ENV=production
ARG BACKEND_PORT=3000
ARG DATABASE_URL
ARG JWT_SECRET
ARG OPENAI_API_KEY
ARG OPENAI_MODEL=gpt-4-turbo
ARG EMBEDDING_MODEL=text-embedding-3-small
ARG CORS_ORIGIN=http://localhost:3000
ARG LOG_LEVEL=info
ARG MAX_FILE_SIZE=20971520
ARG ALLOWED_FILE_TYPES=pdf
ARG UPLOAD_DIR=uploads
ARG JWT_EXPIRATION=7d

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV BACKEND_PORT=$BACKEND_PORT
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV OPENAI_MODEL=$OPENAI_MODEL
ENV EMBEDDING_MODEL=$EMBEDDING_MODEL
ENV CORS_ORIGIN=$CORS_ORIGIN
ENV LOG_LEVEL=$LOG_LEVEL
ENV MAX_FILE_SIZE=$MAX_FILE_SIZE
ENV ALLOWED_FILE_TYPES=$ALLOWED_FILE_TYPES
ENV UPLOAD_DIR=$UPLOAD_DIR
ENV JWT_EXPIRATION=$JWT_EXPIRATION

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create upload directory
RUN mkdir -p uploads && chown -R node:node uploads

# Use non-root user for security
USER node

# Expose backend port
EXPOSE $BACKEND_PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${BACKEND_PORT}/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]