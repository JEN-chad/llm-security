FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src ./src

# Build TypeScript
RUN npm run build

EXPOSE 8002

# Push schema to Neon DB with retry logic (Neon may need time to wake up), then start the server
CMD ["sh", "-c", "for i in 1 2 3 4 5; do echo \"Attempt $i: pushing schema...\"; npx drizzle-kit push && break; echo \"Retry in 5s...\"; sleep 5; done && node dist/index.js"]
