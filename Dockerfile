# Dockerfile for CodeArena Backend

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for node-gyp and PostgreSQL client
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Copy package files and npm config
COPY package*.json .npmrc ./

# Install dependencies
RUN npm ci --legacy-peer-deps --omit=dev

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
