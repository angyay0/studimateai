# Development image for the Vite workspace
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Needs to be independant for the CICD
#COPY backend/package*.json ./backend/
COPY front/package*.json ./front/

RUN npm install

COPY front ./front

EXPOSE 3000

CMD ["npm", "--workspace", "front", "run", "dev"]
