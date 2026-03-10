#!/bin/bash

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/stg/.env"
COMPOSE_FILE="$SCRIPT_DIR/stg/docker-compose.yml"

if [ -f "$ENV_FILE" ]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down
else
  docker compose -f "$COMPOSE_FILE" down
fi
