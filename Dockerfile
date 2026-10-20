# Multi-stage build for Node.js backend
FROM node:20-alpine AS backend

WORKDIR /app

# Install dependencies
COPY backend/package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy backend source
COPY backend/ ./

# /api/version reads ../../frontend/version.json from src/ — without it the
# endpoint answered 0.0.0 forever and VersionManager never saw a release
COPY frontend/version.json /frontend/version.json

# Create directories for databases
RUN mkdir -p /app/data

# Expose backend port
EXPOSE 3000

# Start the backend server
CMD ["node", "server.js"]
