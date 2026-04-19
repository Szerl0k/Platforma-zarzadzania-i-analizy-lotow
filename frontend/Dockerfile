FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Dev stage
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Prod build stage
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Prod stage
FROM base as prod
ENV NODE_ENV=prod
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]