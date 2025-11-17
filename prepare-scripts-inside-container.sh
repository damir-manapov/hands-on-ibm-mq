#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/compose/docker-compose.yml"
SERVICE_NAME="ibm-mq"
NODE_VERSION="${NODE_VERSION:-20.11.1}"
NODE_PREFIX="/opt/nodejs"
CACHE_DIR="/tmp/.cache"

echo "Starting IBM MQ stack via docker compose..."
docker compose -f "$COMPOSE_FILE" up -d

CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q "$SERVICE_NAME")"
if [[ -z "$CONTAINER_ID" ]]; then
  echo "Unable to resolve container ID for service '$SERVICE_NAME'." >&2
  exit 1
fi

echo "Installing Node.js v$NODE_VERSION and prerequisites inside container..."
docker compose -f "$COMPOSE_FILE" exec -u 0 "$SERVICE_NAME" bash -lc "
  set -euo pipefail
  microdnf install -y curl xz > /dev/null
  rm -rf $NODE_PREFIX
  mkdir -p $NODE_PREFIX
  curl -fsSL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz -o /tmp/node.tar.xz
  tar -xf /tmp/node.tar.xz -C $NODE_PREFIX --strip-components=1
  rm -f /tmp/node.tar.xz
  export PATH=$NODE_PREFIX/bin:\$PATH
  corepack enable
  mkdir -p $CACHE_DIR
  chmod -R 777 $CACHE_DIR
"

echo "Syncing project sources into the container at /workspace..."
docker exec -u 0 "$CONTAINER_ID" rm -rf /workspace
docker exec -u 0 "$CONTAINER_ID" mkdir -p /workspace
tar -C "$ROOT_DIR" -cf - . | docker exec -i -u 0 "$CONTAINER_ID" tar -C /workspace -xf -
docker exec -u 0 "$CONTAINER_ID" chmod -R 777 /workspace

echo "Installing npm dependencies via pnpm inside the container..."
docker compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" bash -lc "
  set -euo pipefail
  export PATH=$NODE_PREFIX/bin:\$PATH XDG_CACHE_HOME=$CACHE_DIR CI=true
  cd /workspace
  pnpm install --frozen-lockfile
"

cat <<'EOT'
The container is ready. To run the MQ scripts inside the container, use:

docker compose -f compose/docker-compose.yml exec ibm-mq bash -lc '
  export PATH=/opt/nodejs/bin:$PATH XDG_CACHE_HOME=/tmp/.cache \
         MQ_HOST=localhost MQ_PORT=1414 MQ_CHANNEL=DEV.APP.SVRCONN \
         MQ_QMGR=QM1 MQ_INPUT_QUEUE=DEV.QUEUE.1 MQ_OUTPUT_QUEUE=DEV.QUEUE.2 \
         MQ_USER=app MQ_PASSWORD=passw0rd &&
  cd /workspace &&
  . /opt/mqm/bin/setmqenv -s &&
  pnpm mq:write
'
EOT

