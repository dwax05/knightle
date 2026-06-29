FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx typescript
COPY . .
EXPOSE 3500
CMD ["npx", "tsx", "index.ts"]
