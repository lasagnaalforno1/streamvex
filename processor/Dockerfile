FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    fonts-liberation \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
       -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json index.ts ./
COPY assets ./assets

RUN npm run build
RUN mkdir -p dist/assets && cp assets/watermark.png dist/assets/watermark.png

RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]