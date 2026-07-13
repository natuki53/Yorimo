FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci
COPY . .
# This value is intentionally public in the compiled browser bundle. Google
# Cloud HTTP-referrer and API restrictions protect its use.
ARG VITE_GOOGLE_MAPS_BROWSER_PUBLIC_ID=""
RUN npm run prisma:generate && npm run build && \
    VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_BROWSER_PUBLIC_ID}" npm run frontend:build

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]
