#!/usr/bin/env bash
set -euo pipefail

API_LOG=".postman-local-api.log"
API_PID=""

cleanup() {
  local exit_code=$?

  if [ -n "${API_PID}" ]; then
    kill "${API_PID}" >/dev/null 2>&1 || true
  fi

  docker compose down >/dev/null 2>&1 || true
  rm -f "${API_LOG}"

  exit "${exit_code}"
}

trap cleanup EXIT

echo "[postman-local] Starting infrastructure..."
docker compose up -d --wait

echo "[postman-local] Preparing Prisma..."
pnpm prisma generate
pnpm prisma migrate deploy
pnpm prisma db seed

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:secret@127.0.0.1:5432/postgres?schema=public}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export PORT="${PORT:-3000}"
export JWT_SECRET="${JWT_SECRET:-local-postman-ephemeral-secret}"

echo "[postman-local] Starting API..."
pnpm start >"${API_LOG}" 2>&1 &
API_PID=$!

echo "[postman-local] Waiting API readiness..."
for attempt in $(seq 1 45); do
  if curl --fail --silent "http://127.0.0.1:${PORT}/docs-json" >/dev/null; then
    break
  fi

  if [ "${attempt}" = "45" ]; then
    echo "[postman-local] API did not become ready. Log:"
    cat "${API_LOG}"
    exit 1
  fi

  sleep 2
done

echo "[postman-local] Running Newman suite..."
pnpm test:postman:ci

echo "[postman-local] Done."
