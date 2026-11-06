FROM node:22-alpine AS deps
WORKDIR /src/apps/web
COPY packages/ui /src/packages/ui
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /src/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /src/apps/web/node_modules ./node_modules
COPY packages/ui /src/packages/ui
COPY apps/web /src/apps/web
RUN mkdir -p /src/packages/ui/node_modules \
    && ln -s /src/apps/web/node_modules/react /src/packages/ui/node_modules/react \
    && ln -s /src/apps/web/node_modules/react-dom /src/packages/ui/node_modules/react-dom \
    && ln -s /src/apps/web/node_modules/@types /src/packages/ui/node_modules/@types
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /src/apps/web/.next/standalone ./
COPY --from=build /src/apps/web/.next/static ./apps/web/.next/static
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
