#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
module_dir="${root_dir}/infra/signoz"
plan_file="${module_dir}/temporalguard.tfplan"
action="${1:-}"

if command -v terraform >/dev/null 2>&1; then
  terraform_command=(terraform)
elif command -v docker >/dev/null 2>&1; then
  terraform_command=(docker run --rm -v "${root_dir}:/workspace" -w /workspace/infra/signoz hashicorp/terraform:1.14.3)
else
  echo "Terraform or Docker is required." >&2
  exit 1
fi

run_terraform() {
  if [[ "${terraform_command[0]}" == "terraform" ]]; then
    "${terraform_command[@]}" -chdir="${module_dir}" "$@"
  else
    "${terraform_command[@]}" "$@"
  fi
}

case "${action}" in
  fmt)
    run_terraform fmt -recursive
    ;;
  validate)
    run_terraform init -backend=false
    run_terraform validate
    ;;
  plan)
    : "${SIGNOZ_ENDPOINT:?Set SIGNOZ_ENDPOINT before planning.}"
    : "${SIGNOZ_ACCESS_TOKEN:?Set SIGNOZ_ACCESS_TOKEN before planning.}"
    run_terraform init
    run_terraform plan -out=temporalguard.tfplan
    ;;
  apply)
    if [[ ! -f "${plan_file}" ]]; then
      echo "Create and review ${plan_file} with the plan command first." >&2
      exit 1
    fi
    if [[ ! -t 0 ]]; then
      echo "Apply requires an interactive terminal and explicit confirmation." >&2
      exit 1
    fi
    printf 'Type APPLY TEMPORALGUARD SIGNOZ to apply the reviewed plan: '
    read -r confirmation
    if [[ "${confirmation}" != "APPLY TEMPORALGUARD SIGNOZ" ]]; then
      echo "Confirmation did not match; nothing was applied." >&2
      exit 1
    fi
    run_terraform apply temporalguard.tfplan
    ;;
  *)
    echo "Usage: $0 {fmt|validate|plan|apply}" >&2
    exit 2
    ;;
esac
