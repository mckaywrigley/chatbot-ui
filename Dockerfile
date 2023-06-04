# ---- Base Node ----
FROM node:lts-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
RUN npm ci

# ---- Build ----
FROM dependencies AS build
COPY . .
RUN npm run build

# ---- Production ----
FROM node:lts-alpine AS production

ARG USERNAME=chat-ui
ARG USER_UID=1050
ARG USER_GID=$USER_UID

RUN adduser -D -u $USER_UID -g $USER_GID $USERNAME

WORKDIR /chat-ui

COPY --chown=$USERNAME:$USERNAME --from=dependencies /app/node_modules ./node_modules
COPY --chown=$USERNAME:$USERNAME --from=build /app/.next ./.next
COPY --chown=$USERNAME:$USERNAME --from=build /app/public ./public
COPY --chown=$USERNAME:$USERNAME --from=build /app/package*.json ./
COPY --chown=$USERNAME:$USERNAME --from=build /app/next.config.js ./next.config.js
COPY --chown=$USERNAME:$USERNAME --from=build /app/next-i18next.config.js ./next-i18next.config.js

# Expose the port the app will run on
EXPOSE 3000

USER $USERNAME

# Start the application
CMD ["npm", "start"]