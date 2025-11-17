#!/usr/bin/env bash
set -euo pipefail

run_gitleaks() {
  local args=(detect --source . --no-banner --redact)
  if [[ ! -d .git ]]; then
    args+=(--no-git)
  fi
  if command -v gitleaks >/dev/null 2>&1; then
    gitleaks "${args[@]}"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$PWD:/repo" -w /repo zricethezav/gitleaks:v8.29.0 "${args[@]}"
    return
  fi

  echo "gitleaks is not available. Install it or ensure Docker is running." >&2
  exit 1
}

echo "Installing dependencies (frozen lockfile)..."
pnpm install --frozen-lockfile

echo "Formatting sources..."
pnpm format:fix

echo "Linting sources..."
pnpm lint

echo "Type checking (no emit)..."
pnpm typecheck

echo "Scanning secrets with gitleaks..."
run_gitleaks

echo "Running tests..."
pnpm test

