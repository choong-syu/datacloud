#!/usr/bin/env bash
set -euo pipefail

# Ubuntu VM startup script for datacloud.
# Open only inbound TCP 80 (web) and 22 (SSH) in the cloud firewall/security group.
# Nginx serves the built frontend and proxies /api to the internal API on 127.0.0.1:8787.

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
apt-get install -y ca-certificates curl git nginx

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
Environment=ANALYSIS_API_HOST=127.0.0.1
Environment=OPENAI_MODEL=$OPENAI_MODEL
Environment=OPENAI_REASONING_EFFORT=$OPENAI_REASONING_EFFORT
Environment=ALLOW_ANY_ORIGIN=true
ExecStart=/usr/bin/npm run api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

cat >/etc/nginx/sites-available/datacloud <<NGINX
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;

  root $APP_DIR/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8787/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 700s;
    proxy_send_timeout 700s;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
NGINX

ln -sf /etc/nginx/sites-available/datacloud /etc/nginx/sites-enabled/datacloud
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl daemon-reload
systemctl disable --now datacloud-web.service 2>/dev/null || true
systemctl enable --now datacloud-api.service nginx.service
systemctl reload nginx.service

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
fi

echo "Datacloud started."
echo "Web: http://<VM_PUBLIC_IP>/"
echo "API: http://<VM_PUBLIC_IP>/api/health"
