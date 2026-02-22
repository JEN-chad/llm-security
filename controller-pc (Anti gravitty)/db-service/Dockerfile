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

# Skip drizzle-kit push — schema is managed by admin-side via npx drizzle-kit push
# We only start the server here. The /init endpoint seeds data if needed.
CMD ["node", "dist/index.js"]
