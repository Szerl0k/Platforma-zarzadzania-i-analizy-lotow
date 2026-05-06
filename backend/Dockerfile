FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dev stage
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Prod build stage
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Prod stage
FROM base AS prod
ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]