#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_dir"

env_file="${ENV_FILE:-.env.production}"
compose=(docker compose --env-file "$env_file" -f compose.production.yml)

"${compose[@]}" config --quiet
"${compose[@]}" up -d --build postgres app

for _ in $(seq 1 36); do
  if curl --fail --silent http://127.0.0.1:8085/health >/dev/null; then
    break
  fi
  sleep 5
done
curl --fail --silent --show-error http://127.0.0.1:8085/health >/dev/null
"${compose[@]}" exec -T app node dist/prisma/seed.js

for _ in $(seq 1 18); do
  if curl --fail --silent http://127.0.0.1:8085/ready >/dev/null; then
    break
  fi
  sleep 5
done
curl --fail --silent --show-error http://127.0.0.1:8085/health
printf '\n'
curl --fail --silent --show-error http://127.0.0.1:8085/ready
printf '\nYorimo application is ready on http://127.0.0.1:8085\n'
