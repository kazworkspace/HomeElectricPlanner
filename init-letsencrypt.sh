#!/bin/bash
set -e

# ─── Load .env ────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in values."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "your-domain.com" ]; then
  echo "ERROR: Set DOMAIN in .env (e.g. DOMAIN=monitor.example.com)"
  exit 1
fi

if [ -z "$EMAIL" ] || [ "$EMAIL" = "your-email@example.com" ]; then
  echo "ERROR: Set EMAIL in .env (used for Let's Encrypt expiry notices)"
  exit 1
fi

if [ -z "$API_KEY" ] || [ "$API_KEY" = "change-this-to-a-strong-random-key" ]; then
  echo "ERROR: Set API_KEY in .env. Generate one with: openssl rand -hex 32"
  exit 1
fi

echo "Setting up HTTPS for: $DOMAIN"

# ─── Create directories ───────────────────────────────────────────────────────
mkdir -p certbot/conf certbot/www nginx

# ─── Generate nginx.conf from template ───────────────────────────────────────
echo "Generating nginx config..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.conf.template > nginx/nginx.conf

# ─── Create temporary self-signed cert (so nginx can start before real cert) ─
echo "Creating temporary certificate..."
mkdir -p "certbot/conf/live/$DOMAIN"
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "certbot/conf/live/$DOMAIN/privkey.pem" \
  -out    "certbot/conf/live/$DOMAIN/fullchain.pem" \
  -subj   "/CN=localhost" 2>/dev/null

# ─── Start app + nginx ────────────────────────────────────────────────────────
echo "Starting services..."
docker compose -f docker-compose.prod.yml up -d app nginx

echo "Waiting for nginx to be ready..."
sleep 5

# ─── Get real Let's Encrypt certificate ──────────────────────────────────────
echo "Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# ─── Reload nginx with real cert ─────────────────────────────────────────────
echo "Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# ─── Start certbot auto-renewal daemon ───────────────────────────────────────
docker compose -f docker-compose.prod.yml up -d certbot

echo ""
echo "Done! PLN Monitor is live at: https://$DOMAIN"
echo "Certbot will auto-renew your certificate every 12 hours."
