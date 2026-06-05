#!/usr/bin/env bash
set -euo pipefail

# One-click bootstrap for cyber-avatar integration on Ubuntu server.
# It assumes:
# - Busy-as-a-shrimp repo exists
# - DeerFlow is deployed on localhost:2026
# - Hermes gateway is deployed on localhost:18789

APP_DIR="${APP_DIR:-/home/ubuntu/Busy-as-a-shrimp}"
HERMES_DIR="${HERMES_DIR:-/home/ubuntu/.hermes/hermes-agent}"
DEERFLOW_DIR="${DEERFLOW_DIR:-/home/ubuntu/deer-flow}"

API_BASE="${API_BASE:-http://127.0.0.1:8081/api/v1}"
DEERFLOW_BASE_URL="${DEERFLOW_BASE_URL:-http://127.0.0.1:2026}"
HERMES_GATEWAY_URL="${HERMES_GATEWAY_URL:-http://127.0.0.1:18789/mcp}"
OPENCLAW_BASE_URL="${OPENCLAW_BASE_URL:-http://127.0.0.1:18789}"
NESTJS_BASE_URL="${NESTJS_BASE_URL:-http://127.0.0.1:8081/api/v1}"

ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
RABBITMQ_USER="${RABBITMQ_USER:-airp}"
RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD:-airp}"
RABBITMQ_HOST="${RABBITMQ_HOST:-127.0.0.1}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"

if [[ -z "${DEERFLOW_API_KEY:-}" ]]; then
  echo "[ERROR] Missing DEERFLOW_API_KEY. Export it first."
  echo "Example: export DEERFLOW_API_KEY='your_real_key'"
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Missing required command: $1"
    exit 1
  fi
}

upsert_env() {
  local key="$1"
  local value="$2"
  local env_file="$3"
  if grep -q "^${key}=" "${env_file}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${env_file}"
  else
    echo "${key}=${value}" >>"${env_file}"
  fi
}

echo "[STEP] Checking required commands"
require_cmd git
require_cmd docker
require_cmd curl
require_cmd python3
require_cmd openssl

echo "[STEP] Checking paths"
[[ -d "${APP_DIR}" ]] || { echo "[ERROR] APP_DIR not found: ${APP_DIR}"; exit 1; }
[[ -d "${HERMES_DIR}" ]] || { echo "[ERROR] HERMES_DIR not found: ${HERMES_DIR}"; exit 1; }
[[ -d "${DEERFLOW_DIR}" ]] || { echo "[ERROR] DEERFLOW_DIR not found: ${DEERFLOW_DIR}"; exit 1; }

cd "${APP_DIR}"

if ! command -v corepack >/dev/null 2>&1; then
  echo "[ERROR] corepack not found. Please install Node.js >= 20 first."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[STEP] Installing pm2"
  sudo npm i -g pm2
fi

echo "[STEP] Pulling latest code"
git fetch origin
git checkout main
git pull --rebase origin main

echo "[STEP] Installing dependencies"
corepack enable
corepack pnpm install --frozen-lockfile

ENV_FILE="${APP_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${APP_DIR}/.env.example" "${ENV_FILE}"
fi
cp "${ENV_FILE}" "${ENV_FILE}.bak.$(date +%F-%H%M%S)"

CALLBACK_SECRET="${DEERFLOW_CALLBACK_SECRET:-$(openssl rand -hex 32)}"

echo "[STEP] Updating .env"
upsert_env "NESTJS_BASE_URL" "${NESTJS_BASE_URL}" "${ENV_FILE}"
upsert_env "DEERFLOW_BASE_URL" "${DEERFLOW_BASE_URL}" "${ENV_FILE}"
upsert_env "DEERFLOW_API_KEY" "${DEERFLOW_API_KEY}" "${ENV_FILE}"
upsert_env "DEERFLOW_CALLBACK_SECRET" "${CALLBACK_SECRET}" "${ENV_FILE}"
upsert_env "OPENCLAW_BASE_URL" "${OPENCLAW_BASE_URL}" "${ENV_FILE}"
upsert_env "RABBITMQ_HOST" "${RABBITMQ_HOST}" "${ENV_FILE}"
upsert_env "RABBITMQ_PORT" "${RABBITMQ_PORT}" "${ENV_FILE}"
upsert_env "RABBITMQ_USER" "${RABBITMQ_USER}" "${ENV_FILE}"
upsert_env "RABBITMQ_PASSWORD" "${RABBITMQ_PASSWORD}" "${ENV_FILE}"

echo "[STEP] Bring up infra containers"
docker compose up -d mysql redis rabbitmq elasticsearch
docker compose stop api || true

echo "[STEP] Database migration and api build"
corepack pnpm --filter @airp/database migrate:deploy
corepack pnpm --filter @airp/database generate
corepack pnpm --filter @airp/api build

echo "[STEP] Restart api with pm2"
pm2 delete airp-api || true
pm2 start "corepack pnpm --filter @airp/api start" --name airp-api --cwd "${APP_DIR}"
pm2 save

echo "[STEP] Health checks"
curl -fsS "${API_BASE}/health" >/dev/null
curl -fsS "http://127.0.0.1:2026/health" >/dev/null

echo "[STEP] Admin login to fetch token"
ADMIN_LOGIN_RESP="$(curl -fsS "${API_BASE}/admin/login" -H 'Content-Type: application/json' -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
ADMIN_TOKEN="$(python3 - <<'PY' "${ADMIN_LOGIN_RESP}"
import json, sys
obj = json.loads(sys.argv[1])
print(obj["data"]["token"])
PY
)"

echo "[STEP] Fetching current mcp config"
curl -fsS "${API_BASE}/admin/deerflow/mcp/config" -H "Authorization: Bearer ${ADMIN_TOKEN}" > /tmp/mcp-wrap.json

echo "[STEP] Merging hermes-agent mcp server config"
python3 - <<'PY' "${HERMES_GATEWAY_URL}"
import json, sys
gateway_url = sys.argv[1]
wrap = json.load(open("/tmp/mcp-wrap.json", "r", encoding="utf-8"))
cfg = wrap.get("data", wrap)
servers = cfg.setdefault("mcpServers", {})
servers["hermes-agent"] = {
    "transport": "sse",
    "url": gateway_url
}
json.dump(cfg, open("/tmp/mcp-put.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY

echo "[STEP] Updating mcp config in deerflow"
curl -fsS -X PUT "${API_BASE}/admin/deerflow/mcp/config" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/mcp-put.json >/dev/null

echo "[STEP] Signature callback smoke test"
BODY='{"run_id":"run_test_001","thread_id":"thread_test_001","status":"completed","metadata":{"userId":"1","taskType":"smart_matcher"},"values":{"ok":true}}'
TS="$(date +%s)"
SIG="$(python3 - <<'PY' "${TS}" "${BODY}" "${CALLBACK_SECRET}"
import sys, hmac, hashlib
ts, body, secret = sys.argv[1], sys.argv[2], sys.argv[3]
msg = f"{ts}.{body}".encode()
print(hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest())
PY
)"

curl -fsS -X POST "${API_BASE}/lobster/webhook/callback" \
  -H "Content-Type: application/json" \
  -H "x-deerflow-timestamp: ${TS}" \
  -H "x-deerflow-signature: ${SIG}" \
  -d "${BODY}" >/dev/null

echo
echo "[DONE] Cyber-avatar bootstrap finished."
echo "API health: ${API_BASE}/health"
echo "Callback secret used: ${CALLBACK_SECRET}"
echo "Check logs: pm2 logs airp-api --lines 120"
