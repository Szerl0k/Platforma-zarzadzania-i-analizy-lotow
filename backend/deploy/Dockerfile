FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dev stage
FROM base AS dev
RUN npm install
COPY .. .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Prod build stage
FROM base AS builder
RUN npm install
COPY .. .
RUN npm run build

# Prod stage
FROM base AS prod
ENV NODE_ENV=prod

# Install OpenSSH, set root password, and generate host keys for Azure SSH
RUN apk add --no-cache openssh \
    && echo "root:Docker!" | chpasswd \
    && ssh-keygen -A

# Copy the SSH config and init script
COPY deploy/sshd_config /etc/ssh/
COPY deploy/init.sh /usr/local/bin/
RUN chmod u+x /usr/local/bin/init.sh

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# 2222 - Azure SSH port
EXPOSE 5000 2222

ENTRYPOINT ["init.sh"]
CMD ["node", "dist/index.js"]
