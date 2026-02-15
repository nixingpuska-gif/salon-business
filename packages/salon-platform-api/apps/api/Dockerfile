# Production Dockerfile for Salon Platform API
FROM node:22-alpine

# Install build dependencies for bcrypt native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev for ts-node)
RUN pnpm install --unsafe-perm || npm install

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run migrations and seed data before starting the app
# The application will try to connect to the database, so we run the seed/migration first.
# The app is built to `dist`, so we use `node dist/main.js` to run the app.
# The seed/migration needs `ts-node`.
CMD npx ts-node ./src/database/seed.ts && npx ts-node --transpile-only src/main.ts
