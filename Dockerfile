ARG BASE_PATH=''
# ---- Base Node ----
FROM node:19-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Dependencies ----
FROM base AS dependencies
RUN npm ci

# ---- Build ----
FROM dependencies AS build
ARG BASE_PATH
COPY . .
ENV BASEPATH=${BASE_PATH}
ENV NEXT_PUBLIC_BASEPATH=${BASE_PATH}
RUN npm run build

# ---- Production ----
FROM node:19-alpine AS production-base
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.byted.org/g' /etc/apk/repositories && \
    apk upgrade && apk add bash vim

FROM production-base AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/entrypoint.sh ./entrypoint.sh
COPY --from=build /app/env.sh ./env.sh
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/next-i18next.config.js ./next-i18next.config.js

# Expose the port the app will run on
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
# Start the application
CMD ["npm", "start"]


