# SigNoz observability assets

This module manages seven TemporalGuard dashboards and eight initially disabled
alerts. It supports SigNoz Cloud and self-hosted instances through the official
provider's environment variables:

```sh
export SIGNOZ_ENDPOINT=https://your-signoz.example
export SIGNOZ_ACCESS_TOKEN=...
```

Credentials must not be written to Terraform files, variable files, browser
configuration, shell history, plans, or version control.

From the repository root:

```sh
pnpm signoz:fmt
pnpm signoz:validate
pnpm signoz:plan
pnpm signoz:apply
```

`plan` writes `infra/signoz/temporalguard.tfplan`. `apply` only accepts that
saved plan and requires an interactive, exact confirmation phrase. Review and
enable alert resources in SigNoz only after their thresholds match the target
environment.
