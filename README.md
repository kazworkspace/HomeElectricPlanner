# ⚡ PLN Monitor v2.2

Monitor konsumsi listrik rumah tangga Indonesia — estimasi biaya PLN, simulasi beban MCB, dan tips hemat listrik.

## Features

- **Dashboard** — Estimasi biaya bulanan/harian, breakdown per kategori, top consumers
- **Device Management** — Tambah perangkat manual atau dari 23+ preset alat rumah tangga
- **Usage Analysis** — Analisis biaya per aktivitas (rebus air, masak, dll)
- **Load Simulation** — Simulasi beban listrik real-time dengan gauge Ampere & Power Factor
- **Tips Hemat** — Saran praktis untuk menghemat listrik
- **Export/Import** — Backup dan restore data dalam format JSON
- **Auth / Guest Mode** — API key login untuk menyimpan data; Guest mode tanpa simpan
- **Tutorial** — Panduan penggunaan lengkap untuk pengguna baru, dengan navigasi langsung ke setiap fitur
- **Responsive** — Optimized untuk desktop dan mobile
- **Secure** — Rate limiting, brute-force protection, security headers, CSP, HTTPS

## Auth vs Guest Mode

| | Guest | Auth |
|---|---|---|
| Kalkulator & Simulasi | ✅ | ✅ |
| Data persisten (server) | ❌ | ✅ |
| Export/Import JSON | ✅ | ✅ |
| Login required | — | API Key |

- **Guest** (default) — Semua fitur tersedia, data hilang saat tab ditutup
- **Auth** — Klik 🔑 di header, masukkan API key, data tersimpan ke server
- API key disimpan di `sessionStorage` — otomatis logout saat tab ditutup

## Architecture

**Production:** Nginx (HTTPS/TLS) → Express (API + static files) → SQLite

```
Internet
   │ HTTPS :443
   ▼
┌─────────────┐
│    Nginx    │  ← TLS termination, HSTS, gzip
└──────┬──────┘
       │ HTTP (internal)
       ▼
┌─────────────┐
│   Express   │  ← API + serve frontend static files
│  :3001      │
└──────┬──────┘
       │
┌─────────────┐
│   SQLite    │  ← persistent storage
└─────────────┘
```

## Quick Start (Local Dev)

```bash
# 1. Create .env
cp .env.example .env
# Edit .env — set API_KEY

# 2. Start
docker compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Deploy to Production (Public, HTTPS)

### Option A: Self-signed cert (public IP, no domain needed)

Browser will show a security warning — click **Advanced → Proceed**. Fine for personal use.

**Prerequisites:** Docker + Docker Compose, ports 80 + 443 open.

```bash
# 1. Clone and configure
git clone <repo-url> && cd pln-monitor
cp .env.example .env
nano .env   # set API_KEY (generate: openssl rand -hex 32)

# 2. Run
chmod +x init-selfsigned.sh
./init-selfsigned.sh
```

App available at `https://YOUR_SERVER_IP`. Cert valid 1 year — re-run script to renew.

```bash
# Update app
git pull
docker compose -f docker-compose.selfsigned.yml up --build -d app
```

---

### Option B: Let's Encrypt (domain name required, trusted cert)

**Prerequisites:** Domain with DNS A record → server IP, ports 80 + 443 open.

```bash
# 1. Clone and configure
git clone <repo-url> && cd pln-monitor
cp .env.example .env
nano .env   # set API_KEY, DOMAIN, EMAIL

# 2. Run
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

The script:
1. Generates `nginx/nginx.conf` from template
2. Creates temporary self-signed cert so Nginx can start
3. Requests real Let's Encrypt certificate
4. Reloads Nginx with real cert
5. Starts certbot auto-renewal daemon (renews every 12h)

App available at `https://your-domain.com`.

```bash
# Update app
git pull
docker compose -f docker-compose.prod.yml up --build -d app
```

### Option C: No Docker (VPS with Ubuntu/Debian)

Uses **Nginx** + **PM2** + **Node.js 20** directly on the server.

```bash
# 1. Clone and configure
git clone <repo-url> && cd pln-monitor
cp .env.example .env
nano .env   # set API_KEY (generate: openssl rand -hex 32)

# 2. Run deploy script (installs everything + starts app)
chmod +x deploy-vps.sh
./deploy-vps.sh
```

The script installs: Node.js 20, nginx, PM2 (process manager), build tools.
Then: builds frontend → installs backend deps → generates self-signed cert → configures nginx → starts app.

**Update app:**
```bash
git pull
./deploy-vps.sh   # re-run — idempotent
```

**Manage app:**
```bash
pm2 status                  # check running
pm2 logs pln-monitor        # live logs
pm2 restart pln-monitor     # restart
```

---

## API

All storage endpoints require header: `X-API-Key: <your-key>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (public) |
| GET | `/api/auth/verify` | Verify API key (rate limited: 10/15min per IP) |
| GET | `/api/storage/:key` | Get value |
| POST | `/api/storage/:key` | Set value |
| DELETE | `/api/storage/:key` | Delete key |
| GET | `/api/storage?prefix=x` | List keys |
| POST | `/api/batch-get` | Get multiple keys |
| POST | `/api/batch-set` | Set multiple keys |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_KEY` | Yes | Secret key for storage API auth |
| `DOMAIN` | Prod only | Domain for HTTPS cert (e.g. `monitor.example.com`) |
| `EMAIL` | Prod only | Email for Let's Encrypt expiry notices |
| `PORT` | No (default `3001`) | Server port |
| `DB_DIR` | No (default `./data`) | SQLite database directory |
| `NODE_ENV` | No | `production` enables static file serving |

## Security

- **HTTPS** enforced in production via Nginx + Let's Encrypt (auto-renews every 12h)
- **HSTS** header — `max-age=63072000; includeSubDomains`
- **API key** — timing-safe comparison (`crypto.timingSafeEqual`)
- **Brute-force protection** — auth endpoint limited to 10 attempts / 15 min per IP
- **Rate limiting** — 120 req/min per IP (global)
- **Security headers** — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **X-Powered-By** removed (no Express fingerprint)
- **Input validation** — all keys/values validated before DB write
- **sessionStorage** — API key never stored in localStorage, clears on tab close

## Changelog

### v2.2
- **Tutorial Tab** — Panduan penggunaan interaktif lengkap: Quick Start 3-langkah, penjelasan per tab, Auth vs Guest, tips akurasi, tombol navigasi langsung ke setiap fitur

### v2.1
- **Auth / Guest Mode** — API key login, guest mode without persistence
- **Save status indicator** — header shows Menyimpan/Tersimpan/Gagal in Auth mode
- **Brute-force protection** — strict rate limit on `/api/auth/verify`
- **HTTPS** — Nginx + Let's Encrypt via `init-letsencrypt.sh`
- **HSTS** — enforced via Nginx
- **X-Powered-By** removed
- **`.env` file** — API_KEY moved out of docker-compose files

### v2.0
- **Merged storage** — 6 API calls → 1 (single key `elmon:state`)
- **Debounced saves** — 500ms debounce prevents excessive writes
- **Batch API** — `/api/batch-get` and `/api/batch-set` endpoints
- **Security** — Rate limiting, input validation, security headers, CSP
- **Prepared statements** — SQLite queries pre-compiled for speed
- **Device presets** — 23+ common Indonesian household appliances
- **Export/Import** — Backup and restore all data
- **Better mobile UX** — Slide-up modals, touch-friendly, smooth animations
