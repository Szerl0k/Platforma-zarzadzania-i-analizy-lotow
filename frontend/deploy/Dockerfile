FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Dev stage
FROM base AS dev
RUN npm install
ENV NODE_ENV=development
COPY .. .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Prod build stage
FROM base AS builder
RUN npm install
COPY .. .

ARG INTERNAL_API_URL

ENV INTERNAL_API_URL=$INTERNAL_API_URL

RUN npm run build

# Prod stage
FROM base AS prod
ENV NODE_ENV=prod
ENV NEXT_TELEMETRY_DISABLED=1

# Install OpenSSH, set root password, and generate host keys for Azure SSH
RUN apk add --no-cache openssh \
    && echo "root:Docker!" | chpasswd \
    && ssh-keygen -A

# Copy the SSH config and init script
COPY deploy/sshd_config /etc/ssh/
COPY deploy/init.sh /usr/local/bin/
RUN chmod u+x /usr/local/bin/init.sh

COPY --from=builder /app/public ./public

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 2222 - Azure SSH port
EXPOSE 3000 2222

ENTRYPOINT ["init.sh"]
CMD ["node", "server.js"]