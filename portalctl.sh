#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PATH="${APP_ROOT}/.venv"
PYTHON_BIN="${PYTHON_BINARY:-python3}"
FLASK_BIN="${VENV_PATH}/bin/flask"
PLIST_PATH="${HOME}/Library/LaunchAgents/com.home.portal.plist"
SYSTEMD_UNIT_DIR="${HOME}/.config/systemd/user"
SYSTEMD_UNIT="${SYSTEMD_UNIT_DIR}/home-portal.service"

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

cmd_setup() {
  ensure_venv
  echo "[portalctl] Environment ready."
}

cmd_run() {
  ensure_venv
  export FLASK_APP="${APP_ROOT}/app.py"
  exec "${FLASK_BIN}" run --host 0.0.0.0 --port 8000
}

install_launchagent() {
  mkdir -p "${APP_ROOT}/logs" "$(dirname "${PLIST_PATH}")"
  cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.home.portal</string>
    <key>ProgramArguments</key>
    <array>
      <string>${VENV_PATH}/bin/flask</string>
      <string>run</string>
      <string>--host</string>
      <string>0.0.0.0</string>
      <string>--port</string>
      <string>8000</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>FLASK_APP</key>
      <string>${APP_ROOT}/app.py</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>${APP_ROOT}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${APP_ROOT}/logs/flask.out.log</string>
    <key>StandardErrorPath</key>
    <string>${APP_ROOT}/logs/flask.err.log</string>
  </dict>
</plist>
EOF
  launchctl unload "${PLIST_PATH}" >/dev/null 2>&1 || true
  launchctl load -w "${PLIST_PATH}"
  echo "[portalctl] LaunchAgent installed: ${PLIST_PATH}"
}

install_systemd() {
  mkdir -p "${APP_ROOT}/logs" "${SYSTEMD_UNIT_DIR}"
  cat > "${SYSTEMD_UNIT}" <<EOF
[Unit]
Description=Home Portal
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=${APP_ROOT}
ExecStart=${VENV_PATH}/bin/flask run --host 0.0.0.0 --port 8000
Environment=FLASK_APP=${APP_ROOT}/app.py
Restart=always
StandardOutput=append:${APP_ROOT}/logs/flask.out.log
StandardError=append:${APP_ROOT}/logs/flask.err.log

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
  }
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
  }
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
