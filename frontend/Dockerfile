FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Dev stage
FROM base AS dev
RUN npm install
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Prod build stage
FROM base AS builder
RUN npm install
COPY . .

ARG INTERNAL_API_URL

ENV INTERNAL_API_URL=$INTERNAL_API_URL

RUN npm run build

# Prod stage
FROM base AS prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
