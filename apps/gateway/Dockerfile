# syntax=docker/dockerfile:1
FROM node:20-alpine
RUN addgroup -S temporalguard && adduser -S temporalguard -G temporalguard
WORKDIR /app
COPY --chown=temporalguard:temporalguard apps/gateway/server.mjs ./server.mjs
ENV NODE_ENV=production PORT=8080
USER temporalguard
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
  CMD wget --spider -q http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server.mjs"]
