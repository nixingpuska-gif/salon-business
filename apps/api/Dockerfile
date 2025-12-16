# Production Dockerfile for Salon Platform API
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev for ts-node)
RUN pnpm install || npm install

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application using ts-node
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
