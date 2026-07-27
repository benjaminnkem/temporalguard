#!/usr/bin/env bash
set -euo pipefail
gateway_port="${GATEWAY_PORT:-8088}"
signoz_port="${SIGNOZ_UI_PORT:-3301}"
echo "TemporalGuard: http://localhost:${gateway_port}/"
echo "API health:    http://localhost:${gateway_port}/api/health/ready"
echo "Explorer:      http://localhost:${gateway_port}/explorer"
echo "SigNoz route:  http://localhost:${gateway_port}/signoz"
echo "SigNoz direct: http://localhost:${signoz_port}"
