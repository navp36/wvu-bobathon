# DEPLOY_TARGET: code-engine
# BUILD_ARCH: arm64
# Zero-dependency Node server + static app. Alpine is permitted for Code Engine (not for OpenShift).
# Runtime is pinned to linux/amd64 so the image runs natively on Code Engine even when built on Apple Silicon.
# Build:  podman build --platform linux/amd64 -t wvu-bobathon-judging:latest .
FROM --platform=linux/amd64 node:20-alpine

WORKDIR /app
COPY server/server.js /app/server/server.js
COPY app/ /app/app/

# server.js serves ../app relative to itself, so the layout above must be kept.
# Scores live in DATA_FILE. /tmp is writable by the non-root user but is EPHEMERAL:
# it is lost when the instance restarts or is redeployed. Download a backup before that happens.
ENV PORT=8080 \
    DATA_FILE=/tmp/data.json \
    NODE_ENV=production

USER node
EXPOSE 8080
CMD ["node", "/app/server/server.js"]
