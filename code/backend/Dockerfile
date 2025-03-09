FROM node:18.20.4-alpine AS server-deps
WORKDIR /app
COPY .yarnrc package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:18.20.4-alpine AS server-builder
WORKDIR /app
COPY . .
COPY --from=server-deps /app/node_modules ./node_modules
RUN yarn build

FROM node:18.20.4-alpine
WORKDIR /app

ENV NODE_ENV production

COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=server-builder /app/dist .
COPY /migrations ./migrations

EXPOSE 3000

CMD node main.js
