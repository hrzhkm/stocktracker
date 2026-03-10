#!/bin/bash

set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ ! -f "$ROOT_DIR/.env.local" ] && [ -f "$ROOT_DIR/.env.local.example" ]; then
  cp "$ROOT_DIR/.env.local.example" "$ROOT_DIR/.env.local"
fi

if [ ! -f "$SCRIPT_DIR/stg/.env" ]; then
  cp "$SCRIPT_DIR/stg/.env.example" "$SCRIPT_DIR/stg/.env"
fi
