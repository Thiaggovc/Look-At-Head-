#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "Installing root dependencies..."
cd "$ROOT"
npm install

echo "Installing backend dependencies..."
cd "$ROOT/backend"
npm install

echo "Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install

echo "Building backend..."
cd "$ROOT/backend"
npm run build

echo "Session start hook complete."
