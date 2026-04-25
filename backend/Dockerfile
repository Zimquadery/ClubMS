FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY prisma.config.mjs ./
RUN npx prisma generate
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
