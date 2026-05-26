FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --no-cache
RUN npm install -g npm@latest

# Required for some Next.js build steps
RUN apk add --no-cache git

COPY . .

RUN npm run build

RUN npm install --omit=dev --legacy-peer-deps

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/package.json /app/package-lock.json /app/
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/node_modules /app/node_modules

# Pre-create all directories Next.js writes at runtime so uid 1001 owns them.
RUN mkdir -p /app/.next/cache/images \
    && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
