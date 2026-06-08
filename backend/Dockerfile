# Use official Node.js runtime as base image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy backend and frontend package.json for workspaces
COPY backend/package.json ./backend/package.json

# Install dependencies for all workspaces (including devDependencies)
RUN npm install --workspaces --include=dev

# Copy backend source
COPY backend ./backend

# Build backend
RUN npm --workspace backend run build

# Expose backend port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start backend server
CMD ["npm", "--workspace", "backend", "run", "start"]
