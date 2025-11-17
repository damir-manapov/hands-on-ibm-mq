#!/usr/bin/env bash
set -euo pipefail

echo "Checking dependency freshness..."
pnpm dlx npm-check-updates --errorLevel 2

echo "Checking for known vulnerabilities..."
pnpm audit --prod --dev

