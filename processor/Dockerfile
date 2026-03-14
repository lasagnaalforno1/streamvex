FROM node:20-slim

WORKDIR /app

# Install all deps (including devDeps needed for the TypeScript build)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json index.ts ./
RUN npm run build

# Drop dev dependencies after build
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]
