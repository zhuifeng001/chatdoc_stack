FROM node:20.17.0-alpine AS build-deps
RUN mkdir -p /app
WORKDIR /app

ARG MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}

COPY package.json .npmrc yarn.lock /app/

RUN npm config set registry https://registry.npmmirror.com
RUN yarn config set registry https://registry.npmmirror.com
RUN yarn install --frozen-lockfile



FROM node:20.17.0-alpine AS build-pro
RUN mkdir -p /app
WORKDIR /app

ARG MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}

COPY . .
RUN rm -rf ./node_modules ./.nuxt ./.output
COPY --from=build-deps /app/node_modules ./node_modules
RUN yarn build




FROM node:20.17.0-alpine AS builder

RUN mkdir -p /app
WORKDIR /app

ARG MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS=--max-old-space-size=${MAX_OLD_SPACE_SIZE}
ENV KB_API=
ENV AI_API=

COPY --from=build-pro /app/.output ./.output
COPY entrypoint.sh .

EXPOSE 3000



COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
# CMD ['node', '.output/server/index.mjs']