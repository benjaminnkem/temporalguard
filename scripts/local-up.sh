#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

docker info >/dev/null
docker compose version >/dev/null
bash scripts/foundry.sh gauge
bash scripts/foundry.sh forge
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml up -d --build --remove-orphans

deadline=$((SECONDS + 600))
ready=false
while (( SECONDS < deadline )); do
  pending=""
  for service in gateway web api worker postgres redis ingester temporalguard-signoz-signoz-0; do
    container_id="$(docker compose -f compose.yaml ps -q "${service}")"
    if [[ -z "${container_id}" ]]; then
      pending="${service}:missing"
      break
    fi
    state="$(docker inspect --format '{{.State.Status}}' "${container_id}")"
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${container_id}")"
    if [[ "${state}" != "running" || ("${health}" != "none" && "${health}" != "healthy") ]]; then
      pending="${service}:${state}/${health}"
      break
    fi
  done
  migrate_id="$(docker compose -f compose.yaml ps -q --all migrate)"
  migrate_status=""
  if [[ -n "${migrate_id}" ]]; then
    migrate_status="$(docker inspect --format '{{.State.ExitCode}}' "${migrate_id}")"
  fi
  if [[ -z "${pending}" && "${migrate_status}" == "0" ]]; then
    ready=true
    break
  fi
  sleep 5
done

docker compose -f compose.yaml ps --all
if [[ "${ready}" != "true" ]]; then
  echo "Local stack did not become ready within 600 seconds (${pending:-migrate:${migrate_status:-missing}})." >&2
  docker compose -f compose.yaml logs --tail=100 api worker ingester temporalguard-signoz-signoz-0 >&2
  exit 1
fi

bash scripts/print-urls.sh

if [[ "${1:-}" == "--demo" ]]; then
  node scripts/demo.mjs all
fi
