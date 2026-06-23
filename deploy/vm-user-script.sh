#!/usr/bin/env bash
set -euo pipefail

# Ubuntu VM startup script for datacloud.
# 1. Set OPENAI_API_KEY below or inject it as a VM metadata/environment secret.
# 2. Open inbound TCP ports 5173 and 8787 in the cloud firewall/security group.

REPO_URL="https://github.com/choong-syu/datacloud.git"
APP_DIR="/opt/datacloud"
APP_USER="datacloud"
OPENAI_API_KEY="${OPENAI_API_KEY:-REPLACE_WITH_OPENAI_API_KEY}"
OPENAI_MODEL="${OPENAI_MODEL:-gpt-5.5}"
OPENAI_REASONING_EFFORT="${OPENAI_REASONING_EFFORT:-high}"

if [[ "$OPENAI_API_KEY" == "REPLACE_WITH_OPENAI_API_KEY" ]]; then
  echo "ERROR: Set OPENAI_API_KEY before running this startup script." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
printf "%s" "$OPENAI_API_KEY" > key.txt
chmod 600 key.txt
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build

cat >/etc/systemd/system/datacloud-api.service <<SERVICE
[Unit]
Description=Datacloud analysis API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
Environment=ANALYSIS_API_PORT=8787
Environment=OPENAI_MODEL=$OPENAI_MODEL
Environment=OPENAI_REASONING_EFFORT=$OPENAI_REASONING_EFFORT
Environment=ALLOW_ANY_ORIGIN=true
ExecStart=/usr/bin/npm run api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/systemd/system/datacloud-web.service <<SERVICE
[Unit]
Description=Datacloud Vite preview web
After=network-online.target datacloud-api.service
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run preview -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now datacloud-api.service datacloud-web.service

echo "Datacloud started."
echo "Web: http://<VM_PUBLIC_IP>:5173"
echo "API: http://<VM_PUBLIC_IP>:8787/api/health"
