# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY front/package*.json ./front/

# Install dependencies for all workspaces
RUN npm install

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
