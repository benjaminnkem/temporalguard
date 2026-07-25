#!/usr/bin/env bash
set -euo pipefail
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${1:-}" != "--confirm" ]]; then
  echo "Reset deletes local PostgreSQL, Redis, ClickHouse, and SigNoz volumes." >&2
  echo "Re-run with: pnpm local:reset -- --confirm" >&2
  exit 2
fi
docker compose -f "${repository_root}/compose.yaml" down --volumes --remove-orphans
echo "TemporalGuard local containers and named data volumes were removed."
