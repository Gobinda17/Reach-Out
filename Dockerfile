# syntax=docker/dockerfile:1

# Reach-Out — Next.js (App Router) + Prisma + PostgreSQL.
#
# Three stages so the shipped image carries neither the source tree nor the
# build toolchain: deps installs, builder compiles, runner holds only the
# standalone server output.
#
#   docker build -t reach-out .
#   docker run --env-file .env -p 3000:3000 reach-out

# ---------- deps: node_modules only, cached until the lockfile changes -------
FROM node:22-alpine AS deps
# Prisma's query engine is a native binary that needs glibc shims and OpenSSL
# on Alpine; without these it fails at runtime with a loader error.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder: prisma client + next build ------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Generated before the build because server code imports @prisma/client at
# module scope. No database is contacted here — `generate` only reads the schema.
RUN npx prisma generate
# Deliberately no DATABASE_URL or SESSION_SECRET: every route in this app is
# dynamic, so nothing touches the database or signs a token at build time. Keep
# it that way, or secrets end up baked into an image layer.
RUN npm run build

# Next's output tracing copies any .env it finds into .next/standalone. The
# .dockerignore already keeps .env out of the build context, but if one ever
# slipped in, that copy would ship inside the image with SESSION_SECRET and the
# Razorpay keys in it. Removed here, in the builder — deleting it in the runner
# instead would leave it recoverable in the layer below.
RUN rm -f .next/standalone/.env .next/standalone/.env.*

# ---------- runner: what actually ships --------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# The standalone server plus the two directories it does NOT copy for itself
# (documented in the output.md guide): public/ and .next/static.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# The schema and migration history, plus the Prisma CLI, so the container can
# apply migrations on boot. Drop these three COPYs and set RUN_MIGRATIONS=false
# if you would rather run `prisma migrate deploy` as a separate release step —
# it is the larger part of this image.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Required at run time (not build time): DATABASE_URL, SESSION_SECRET.
# Optional: COMING_SOON, OTP_DEV_MODE, RAZORPAY_*, CALL_PROVIDER, CALLMASK_API_KEY
# — though most of those are also settable from /admin/settings without a redeploy.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
