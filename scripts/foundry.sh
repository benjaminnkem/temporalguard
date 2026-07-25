#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
foundry_version="${FOUNDRY_VERSION:-0.2.16}"
tool_cache="${repository_root}/.cache/foundry/${foundry_version}"
binary="${tool_cache}/foundryctl"

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) archive="foundry_darwin_arm64.tar.gz" ;;
  Darwin-x86_64) archive="foundry_darwin_amd64.tar.gz" ;;
  Linux-aarch64) archive="foundry_linux_arm64.tar.gz" ;;
  Linux-x86_64) archive="foundry_linux_amd64.tar.gz" ;;
  *) echo "Unsupported Foundry platform: $(uname -s) $(uname -m)" >&2; exit 1 ;;
esac

if [[ ! -x "${binary}" ]]; then
  mkdir -p "${tool_cache}"
  release_url="https://github.com/SigNoz/foundry/releases/download/v${foundry_version}"
  curl -fsSL "${release_url}/${archive}" -o "${tool_cache}/${archive}"
  curl -fsSL "${release_url}/foundry_${foundry_version}_checksums.txt" -o "${tool_cache}/checksums.txt"
  expected="$(awk -v name="${archive}" '$2 == name { print $1 }' "${tool_cache}/checksums.txt")"
  actual="$(shasum -a 256 "${tool_cache}/${archive}" | awk '{ print $1 }')"
  [[ -n "${expected}" && "${expected}" == "${actual}" ]] || {
    echo "Foundry checksum verification failed." >&2
    exit 1
  }
  tar -xzf "${tool_cache}/${archive}" -C "${tool_cache}"
  mv "${tool_cache}"/foundry_*/bin/foundryctl "${binary}"
  chmod +x "${binary}"
fi

action="${1:-}"
case "${action}" in
  gauge)
    "${binary}" gauge -f "${repository_root}/infra/foundry/casting.local.yaml" --no-ledger --no-updater
    "${binary}" gauge -f "${repository_root}/infra/foundry/casting.render.yaml" --no-ledger --no-updater
    ;;
  forge)
    "${binary}" forge -f "${repository_root}/infra/foundry/casting.local.yaml" -p "${repository_root}/infra/foundry/generated/local" --no-ledger --no-updater
    "${binary}" forge -f "${repository_root}/infra/foundry/casting.render.yaml" -p "${repository_root}/infra/foundry/generated/render" --no-ledger --no-updater
    node "${repository_root}/scripts/merge-deployments.mjs"
    ;;
  version) "${binary}" version ;;
  *) echo "Usage: $0 {gauge|forge|version}" >&2; exit 2 ;;
esac
