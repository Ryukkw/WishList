#!/bin/bash
# WishList server deployment script. Run as root on Ubuntu/Debian.
# Usage: copy project to /opt/wishlist, then: sudo bash scripts/deploy-server.sh

set -e

# --- Configure these (or set env vars before running) ---
DOMAIN="${DOMAIN:-6693237-xl58731.twc1.net}"
DB_PASSWORD="${DB_PASSWORD:-wishlist_secure_password_change_me}"
APP_DIR="${APP_DIR:-/opt/wishlist}"

echo "=== WishList deploy: domain=$DOMAIN app_dir=$APP_DIR ==="

# --- Install system packages ---
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git nginx postgresql postgresql-contrib python3 python3-pip python3-venv

# Node.js 20
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# --- PostgreSQL ---
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='wishlist'" | grep -q 1 || sudo -u postgres createuser -s wishlist
sudo -u postgres psql -c "ALTER USER wishlist PASSWORD '$DB_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='wishlist'" | grep -q 1 || sudo -u postgres createdb -O wishlist wishlist

# --- App directory: use current dir if we're inside the project ---
if [[ -f "$APP_DIR/package.json" ]] && [[ -f "$APP_DIR/backend/requirements.txt" ]]; then
  echo "Using app at $APP_DIR"
elif [[ -f "./package.json" ]] && [[ -f "./backend/requirements.txt" ]]; then
  APP_DIR="$(pwd)"
  echo "Using app at $APP_DIR"
else
  echo "Error: Run this script from project root or set APP_DIR to project path. Not found: package.json + backend/requirements.txt"
  exit 1
fi

cd "$APP_DIR"
BASE_URL="http://$DOMAIN"

# --- Backend .env ---
mkdir -p backend/uploads
BACKEND_ENV="$APP_DIR/backend/.env"
if [[ ! -f "$BACKEND_ENV" ]]; then
  SECRET_KEY=$(openssl rand -base64 32 2>/dev/null || echo "change-me-in-production-$(date +%s)")
  cat > "$BACKEND_ENV" << EOF
DATABASE_URL=postgresql+asyncpg://wishlist:${DB_PASSWORD}@localhost:5432/wishlist
SECRET_KEY=$SECRET_KEY
CORS_ORIGINS=$BASE_URL,https://$DOMAIN
UPLOAD_DIR=$APP_DIR/backend/uploads
EMAIL_ECHO_CODE=1
EOF
  echo "Created $BACKEND_ENV"
fi

# --- Backend venv and run ---
cd "$APP_DIR/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
alembic upgrade head
deactivate

# --- Backend systemd ---
cat > /etc/systemd/system/wishlist-api.service << EOF
[Unit]
Description=WishList API
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
Environment=PATH=$APP_DIR/backend/.venv/bin
ExecStart=$APP_DIR/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable wishlist-api
systemctl restart wishlist-api

# --- Frontend .env.local ---
FRONTEND_ENV="$APP_DIR/.env.local"
if [[ ! -f "$FRONTEND_ENV" ]]; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-me-$(date +%s)")
  cat > "$FRONTEND_ENV" << EOF
NEXT_PUBLIC_API_URL=$BASE_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$BASE_URL
EOF
  echo "Created $FRONTEND_ENV"
fi

# --- Frontend build and run ---
cd "$APP_DIR"
npm ci
npm run build

cat > /etc/systemd/system/wishlist-web.service << EOF
[Unit]
Description=WishList Next.js
After=network.target wishlist-api.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable wishlist-web
systemctl restart wishlist-web

# --- Nginx ---
cat > /etc/nginx/sites-available/wishlist << EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
        proxy_set_header Host \$host;
    }
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
ln -sf /etc/nginx/sites-available/wishlist /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=== Done. App should be at http://$DOMAIN ==="
echo "Backend API: systemctl status wishlist-api"
echo "Frontend:   systemctl status wishlist-web"
echo "Nginx:      systemctl status nginx"
echo "DB password is in backend/.env (DATABASE_URL). Change DB_PASSWORD and re-run if needed."
