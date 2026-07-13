#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_dir"

env_file="${ENV_FILE:-.env.production}"
docker compose --env-file "$env_file" -f compose.production.yml exec -T \
  -e ALLOW_DEMO_RESET=true app node dist/prisma/resetDemo.js --confirm
curl --fail --silent --show-error http://127.0.0.1:8085/ready
printf '\nDemo data reset complete.\n'
