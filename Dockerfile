# ==============================================================================
#  AgriERP Frontend (Next.js) — production image. Build context = Frontend/.
#  Serves the web app AND the installable PWA (manifest, sw.js, icons in public/).
# ==============================================================================

# ---- dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# React 19 peer conflicts need --legacy-peer-deps (same as local installs).
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
# The API base URL is baked into the client bundle at BUILD time.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# public/ carries the PWA manifest, service worker and icons.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
