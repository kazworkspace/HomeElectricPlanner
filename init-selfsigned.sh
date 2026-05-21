#!/bin/bash
set -e

# ─── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy .env.example to .env and fill in API_KEY."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

if [ -z "$API_KEY" ] || [ "$API_KEY" = "change-this-to-a-strong-random-key" ]; then
  echo "ERROR: Set API_KEY in .env first."
  echo "       Generate one: openssl rand -hex 32"
  exit 1
fi

# ─── Generate self-signed certificate (valid 1 year) ─────────────────────────
echo "Generating self-signed certificate..."
mkdir -p nginx/certs

openssl req -x509 -nodes -newkey rsa:4096 -days 365 \
  -keyout nginx/certs/privkey.pem \
  -out    nginx/certs/fullchain.pem \
  -subj   "/CN=pln-monitor" 2>/dev/null

chmod 600 nginx/certs/privkey.pem

# ─── Generate nginx.conf ──────────────────────────────────────────────────────
echo "Generating nginx config..."
cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile     on;
    keepalive_timeout 65;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    server {
        listen 80;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        location / {
            proxy_pass         http://app:3001;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_buffering    off;
        }
    }
}
EOF

# ─── Start services ───────────────────────────────────────────────────────────
echo "Building and starting services..."
docker compose -f docker-compose.selfsigned.yml up -d --build

echo ""
echo "Done! PLN Monitor is running at: https://YOUR_SERVER_IP"
echo ""
echo "Browser will show a security warning — this is normal for self-signed certs."
echo "Click 'Advanced' → 'Proceed' to continue."
echo ""
echo "Certificate expires in 365 days. To renew, run this script again."
