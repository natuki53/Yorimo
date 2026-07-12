#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_dir"

env_file="${ENV_FILE:-.env.production}"
docker compose --env-file "$env_file" -f compose.production.yml --profile public stop cloudflared
