#!/bin/bash
# PLN Monitor — VPS deployment script (Ubuntu/Debian, no Docker)
# Run as a regular user with sudo access.
set -e

APP_DIR="/opt/pln-monitor"

# ─── Check .env ───────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and set API_KEY."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

if [ -z "$API_KEY" ] || [ "$API_KEY" = "change-this-to-a-strong-random-key" ]; then
  echo "ERROR: Set API_KEY in .env first."
  echo "       Generate: openssl rand -hex 32"
  exit 1
fi

# ─── Install system dependencies ──────────────────────────────────────────────
echo "Installing system dependencies..."
sudo apt-get update -qq

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Build tools for better-sqlite3 native module
sudo apt-get install -y python3 make g++ nginx

# PM2
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi

# ─── Copy app files ───────────────────────────────────────────────────────────
echo "Deploying app files..."
sudo mkdir -p "$APP_DIR" /opt/pln-monitor/data
sudo cp -r . "$APP_DIR/"
sudo cp .env "$APP_DIR/.env"
sudo chown -R "$USER:$USER" "$APP_DIR"

# ─── Build frontend ───────────────────────────────────────────────────────────
echo "Building frontend..."
cd "$APP_DIR/frontend"
npm install --silent
npm run build

# Copy build output into backend/public (Express serves it)
mkdir -p "$APP_DIR/backend/public"
cp -r dist/* "$APP_DIR/backend/public/"

# ─── Install backend dependencies ─────────────────────────────────────────────
echo "Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --production --silent

# ─── Generate self-signed certificate ────────────────────────────────────────
echo "Generating self-signed certificate (1 year)..."
sudo mkdir -p /etc/nginx/certs/pln-monitor
sudo openssl req -x509 -nodes -newkey rsa:4096 -days 365 \
  -keyout /etc/nginx/certs/pln-monitor/privkey.pem \
  -out    /etc/nginx/certs/pln-monitor/fullchain.pem \
  -subj   "/CN=pln-monitor" 2>/dev/null
sudo chmod 600 /etc/nginx/certs/pln-monitor/privkey.pem

# ─── Configure nginx ──────────────────────────────────────────────────────────
echo "Configuring nginx..."
sudo tee /etc/nginx/sites-available/pln-monitor > /dev/null << 'EOF'
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name _;

    ssl_certificate     /etc/nginx/certs/pln-monitor/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/pln-monitor/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_buffering    off;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/pln-monitor /etc/nginx/sites-enabled/pln-monitor
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# ─── Start app with PM2 ───────────────────────────────────────────────────────
echo "Starting app with PM2..."
cd "$APP_DIR"

# Inject API_KEY into PM2 env — PM2 will persist this
pm2 delete pln-monitor 2>/dev/null || true
API_KEY="$API_KEY" pm2 start ecosystem.config.cjs
pm2 save

# Configure PM2 to auto-start on server reboot
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash

echo ""
echo "Done! PLN Monitor is running at: https://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_SERVER_IP)"
echo ""
echo "Browser will show a security warning — click 'Advanced' → 'Proceed'."
echo ""
echo "Useful commands:"
echo "  pm2 status          — check if app is running"
echo "  pm2 logs pln-monitor — view app logs"
echo "  pm2 restart pln-monitor — restart app"
