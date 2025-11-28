#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${APP_ROOT}/.venv"
PYTHON_BIN="${PYTHON_BINARY:-python3}"
GUNICORN_BIN="${VENV_PATH}/bin/gunicorn"
PLIST_PATH="${HOME}/Library/LaunchAgents/com.home.portal.plist"
SYSTEMD_UNIT_DIR="${HOME}/.config/systemd/user"
SYSTEMD_UNIT="${SYSTEMD_UNIT_DIR}/home-portal.service"
PORTAL_HOST="${PORTAL_HOST:-0.0.0.0}"
TLS_CERT="${PORTAL_TLS_CERT:-}"
TLS_KEY="${PORTAL_TLS_KEY:-}"
TLS_CA="${PORTAL_TLS_CA:-}"
DEFAULT_PORT="8000"
if [[ -n "${TLS_CERT}" || -n "${TLS_KEY}" ]]; then
  DEFAULT_PORT="443"
fi
PORTAL_PORT="${PORTAL_PORT:-${DEFAULT_PORT}}"
BIND_ADDRESS="${PORTAL_HOST}:${PORTAL_PORT}"
WORKERS="${PORTAL_WORKERS:-2}"
GUNICORN_TIMEOUT="${PORTAL_TIMEOUT:-30}"
APP_MODULE="${PORTAL_APP_MODULE:-app:app}"
LOG_DIR="${APP_ROOT}/logs"
EXTRA_ARGS_STR="${PORTAL_EXTRA_GUNICORN_ARGS:-}"

ensure_venv() {
  if [[ ! -d "${VENV_PATH}" ]]; then
    echo "[portalctl] Creating virtualenv at ${VENV_PATH}"
    "${PYTHON_BIN}" -m venv "${VENV_PATH}"
  fi
  # shellcheck disable=SC1090
  source "${VENV_PATH}/bin/activate"
  pip install --upgrade pip >/dev/null
  pip install -r "${APP_ROOT}/requirements.txt"
}

build_gunicorn_cmd() {
  GUNICORN_CMD=(
    "${GUNICORN_BIN}"
    "--bind" "${BIND_ADDRESS}"
    "--workers" "${WORKERS}"
    "--timeout" "${GUNICORN_TIMEOUT}"
    "--chdir" "${APP_ROOT}"
    "${APP_MODULE}"
  )

  if [[ -n "${TLS_CERT}" || -n "${TLS_KEY}" ]]; then
    if [[ -z "${TLS_CERT}" || -z "${TLS_KEY}" ]]; then
      echo "[portalctl] ERROR: both PORTAL_TLS_CERT and PORTAL_TLS_KEY must be set to enable TLS" >&2
      exit 1
    fi
    GUNICORN_CMD+=("--certfile" "${TLS_CERT}" "--keyfile" "${TLS_KEY}")
    if [[ -n "${TLS_CA}" ]]; then
      GUNICORN_CMD+=("--ca-certs" "${TLS_CA}")
    fi
  fi

  if [[ -n "${EXTRA_ARGS_STR}" ]]; then
    # shellcheck disable=SC2206
    local -a extra_args=(${EXTRA_ARGS_STR})
    GUNICORN_CMD+=("${extra_args[@]}")
  fi
}

cmd_setup() {
  ensure_venv
  echo "[portalctl] Environment ready."
}

cmd_run() {
  ensure_venv
  mkdir -p "${LOG_DIR}"
  build_gunicorn_cmd
  exec "${GUNICORN_CMD[@]}"
}

install_launchagent() {
  mkdir -p "${LOG_DIR}" "$(dirname "${PLIST_PATH}")"
  build_gunicorn_cmd
  cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.home.portal</string>
    <key>ProgramArguments</key>
    <array>
EOF
  for arg in "${GUNICORN_CMD[@]}"; do
    printf '      <string>%s</string>\n' "$arg"
  done >> "${PLIST_PATH}"
  cat >> "${PLIST_PATH}" <<EOF
    </array>
    <key>WorkingDirectory</key>
    <string>${APP_ROOT}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/gunicorn.out.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/gunicorn.err.log</string>
  </dict>
</plist>
EOF
  launchctl unload "${PLIST_PATH}" >/dev/null 2>&1 || true
  launchctl load -w "${PLIST_PATH}"
  echo "[portalctl] LaunchAgent installed: ${PLIST_PATH}"
}

install_systemd() {
  mkdir -p "${LOG_DIR}" "${SYSTEMD_UNIT_DIR}"
  build_gunicorn_cmd
  local exec_cmd=""
  printf -v exec_cmd '%q ' "${GUNICORN_CMD[@]}"
  exec_cmd="${exec_cmd% }"
  cat > "${SYSTEMD_UNIT}" <<EOF
[Unit]
Description=Home Portal
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=${APP_ROOT}
ExecStart=${exec_cmd}
Restart=always
StandardOutput=append:${LOG_DIR}/gunicorn.out.log
StandardError=append:${LOG_DIR}/gunicorn.err.log

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now "$(basename "${SYSTEMD_UNIT}")"
  echo "[portalctl] systemd user service installed: ${SYSTEMD_UNIT}"
  echo "Hint: run 'loginctl enable-linger ${USER}' if the service should run without active login."
}

cmd_install() {
  ensure_venv
  if [[ "$(uname -s)" == "Darwin" ]]; then
    install_launchagent
  else
    install_systemd
  fi
}

uninstall_launchagent() {
  if [[ -f "${PLIST_PATH}" ]]; then
    launchctl unload "${PLIST_PATH}" >/dev/null 2>&1 || true
    rm -f "${PLIST_PATH}"
    echo "[portalctl] LaunchAgent removed."
  else
    echo "[portalctl] No LaunchAgent found."
  fi
}

uninstall_systemd() {
  if [[ -f "${SYSTEMD_UNIT}" ]]; then
    systemctl --user disable --now "$(basename "${SYSTEMD_UNIT}")" >/dev/null 2>&1 || true
    rm -f "${SYSTEMD_UNIT}"
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    echo "[portalctl] systemd user service removed."
  else
    echo "[portalctl] No systemd unit found."
  fi
}

cmd_uninstall() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    uninstall_launchagent
  else
    uninstall_systemd
  fi
}

case "${1:-}" in
  setup) cmd_setup ;;
  run) cmd_run ;;
  install) cmd_install ;;
  uninstall) cmd_uninstall ;;
  *)
    echo "Usage: ./portalctl.sh {setup|run|install|uninstall}"
    exit 1
    ;;
esac
