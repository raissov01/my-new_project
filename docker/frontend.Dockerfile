FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid 1001 nextjs

# Copy the standalone output (server.js may be nested under app/ due to outputFileTracingRoot)
COPY --from=builder /app/.next/standalone ./

# Copy static assets and public files into BOTH possible locations
# so they're found regardless of where server.js runs from
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./app/public
COPY --from=builder /app/.next/static ./app/.next/static

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "node $(find /app -name server.js -maxdepth 3 | head -1)"]
