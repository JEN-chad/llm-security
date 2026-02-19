FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

# Run migrations and then start
CMD ["sh", "-c", "npm run db:push && npm start"]
