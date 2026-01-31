#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

ENV_FILE="${SMOKE_ENV_FILE:-}"
if [[ -z "${ENV_FILE}" ]]; then
  if [[ -f "${ROOT_DIR}/.env.mock" ]]; then
    ENV_FILE="${ROOT_DIR}/.env.mock"
  elif [[ -f "${ROOT_DIR}/.env.smoke" ]]; then
    ENV_FILE="${ROOT_DIR}/.env.smoke"
  fi
fi
if [[ -n "${ENV_FILE}" && -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

log() {
  echo "[$(date +"%H:%M:%S")] $*"
}

run() {
  log "RUN $*"
  "$@"
}

SKIP_SEND="${SKIP_SEND:-0}"
SKIP_QUEUE="${SKIP_QUEUE:-0}"
SKIP_INBOUND="${SKIP_INBOUND:-0}"
SKIP_BOOKING="${SKIP_BOOKING:-0}"
SKIP_CALCOM="${SKIP_CALCOM:-0}"
SKIP_VOICE="${SKIP_VOICE:-0}"
SKIP_INVENTORY="${SKIP_INVENTORY:-0}"
SKIP_FEEDBACK="${SKIP_FEEDBACK:-0}"

ALLOW_SEND="${ALLOW_SEND:-0}"
ALLOW_INBOUND="${ALLOW_INBOUND:-0}"
ALLOW_BOOKING="${ALLOW_BOOKING:-0}"
ALLOW_CALCOM="${ALLOW_CALCOM:-0}"
ALLOW_VOICE="${ALLOW_VOICE:-0}"
ALLOW_INVENTORY="${ALLOW_INVENTORY:-0}"
ALLOW_FEEDBACK="${ALLOW_FEEDBACK:-0}"

ALLOW_UNSIGNED_WEBHOOK="${ALLOW_UNSIGNED_WEBHOOK:-0}"
ALLOW_UNSIGNED_CALCOM="${ALLOW_UNSIGNED_CALCOM:-0}"

log "Starting smoke run"

run "${ROOT_DIR}/scripts/smoke/health_check.sh"

if [[ "${SKIP_INBOUND}" == "1" ]]; then
  log "Skip inbound webhook test (SKIP_INBOUND=1)"
else
  if [[ "${ALLOW_INBOUND}" != "1" ]]; then
    log "Skip inbound webhook test (set ALLOW_INBOUND=1)"
  elif [[ -z "${ERXES_INTEGRATION_ID:-}" ]]; then
    log "Skip inbound webhook test (ERXES_INTEGRATION_ID not set)"
  elif [[ -z "${WEBHOOK_SECRET:-}" && "${ALLOW_UNSIGNED_WEBHOOK}" != "1" ]]; then
    log "Skip inbound webhook test (WEBHOOK_SECRET not set; set ALLOW_UNSIGNED_WEBHOOK=1 to run unsigned)"
  else
    run "${ROOT_DIR}/scripts/smoke/webhook_inbound_test.sh"
  fi
fi

if [[ "${SKIP_BOOKING}" == "1" ]]; then
  log "Skip booking webhook test (SKIP_BOOKING=1)"
else
  if [[ "${ALLOW_BOOKING}" != "1" ]]; then
    log "Skip booking webhook test (set ALLOW_BOOKING=1)"
  elif [[ -z "${ERXES_INTEGRATION_ID:-}" || -z "${EVENT_TYPE_ID:-}" ]]; then
    log "Skip booking webhook test (ERXES_INTEGRATION_ID or EVENT_TYPE_ID not set)"
  elif [[ -z "${WEBHOOK_SECRET:-}" && "${ALLOW_UNSIGNED_WEBHOOK}" != "1" ]]; then
    log "Skip booking webhook test (WEBHOOK_SECRET not set; set ALLOW_UNSIGNED_WEBHOOK=1 to run unsigned)"
  else
    run "${ROOT_DIR}/scripts/smoke/booking_webhook_test.sh"
  fi
fi

if [[ "${SKIP_CALCOM}" == "1" ]]; then
  log "Skip calcom webhook test (SKIP_CALCOM=1)"
else
  if [[ "${ALLOW_CALCOM}" != "1" ]]; then
    log "Skip calcom webhook test (set ALLOW_CALCOM=1)"
  elif [[ -z "${CALCOM_WEBHOOK_SECRET:-}" && "${ALLOW_UNSIGNED_CALCOM}" != "1" ]]; then
    log "Skip calcom webhook test (CALCOM_WEBHOOK_SECRET not set; set ALLOW_UNSIGNED_CALCOM=1 to run unsigned)"
  else
    run "${ROOT_DIR}/scripts/smoke/calcom_webhook_test.sh"
  fi
fi

if [[ "${SKIP_QUEUE}" == "1" ]]; then
  log "Skip queue test (SKIP_QUEUE=1)"
else
  if [[ "${ALLOW_SEND}" != "1" ]]; then
    log "Skip queue test (set ALLOW_SEND=1)"
  else
    run "${ROOT_DIR}/scripts/smoke/queue_test.sh"
  fi
fi

if [[ "${SKIP_SEND}" == "1" ]]; then
  log "Skip send test (SKIP_SEND=1)"
else
  if [[ "${ALLOW_SEND}" != "1" ]]; then
    log "Skip send test (set ALLOW_SEND=1)"
  else
    run "${ROOT_DIR}/scripts/smoke/send_test.sh"
  fi
fi

if [[ "${SKIP_VOICE}" == "1" ]]; then
  log "Skip voice booking test (SKIP_VOICE=1)"
else
  if [[ "${ALLOW_VOICE}" != "1" ]]; then
    log "Skip voice booking test (set ALLOW_VOICE=1)"
  elif [[ -z "${SERVICE_ID:-}" || -z "${PREFERRED_TIME:-}" ]]; then
    log "Skip voice booking test (SERVICE_ID or PREFERRED_TIME not set)"
  else
    run "${ROOT_DIR}/scripts/smoke/voice_booking_test.sh"
  fi
fi

if [[ "${SKIP_INVENTORY}" == "1" ]]; then
  log "Skip inventory flow test (SKIP_INVENTORY=1)"
else
  if [[ "${ALLOW_INVENTORY}" != "1" ]]; then
    log "Skip inventory flow test (set ALLOW_INVENTORY=1)"
  else
    run "${ROOT_DIR}/scripts/smoke/inventory_flow_test.sh"
  fi
fi

if [[ "${SKIP_FEEDBACK}" == "1" ]]; then
  log "Skip feedback flow test (SKIP_FEEDBACK=1)"
else
  if [[ "${ALLOW_FEEDBACK}" != "1" ]]; then
    log "Skip feedback flow test (set ALLOW_FEEDBACK=1)"
  else
    run "${ROOT_DIR}/scripts/smoke/feedback_flow_test.sh"
  fi
fi

log "Smoke run complete"
