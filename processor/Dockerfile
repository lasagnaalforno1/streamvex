FROM node:20-slim

# Install yt-dlp standalone binary (x86_64 Linux — matches Railway's default architecture).
# ffmpeg is provided by the ffmpeg-static npm package; we pass --ffmpeg-location to yt-dlp
# so it can mux video+audio streams without a separate system ffmpeg install.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
       -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

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

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*