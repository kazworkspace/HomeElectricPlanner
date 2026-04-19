# ⚡ PLN Monitor v2.0

Monitor konsumsi listrik rumah tangga Indonesia — estimasi biaya PLN, simulasi beban MCB, dan tips hemat listrik.

## Features

- **Dashboard** — Estimasi biaya bulanan/harian, breakdown per kategori, top consumers
- **Device Management** — Tambah perangkat manual atau dari 23+ preset alat rumah tangga
- **Usage Analysis** — Analisis biaya per aktivitas (rebus air, masak, dll)
- **Load Simulation** — Simulasi beban listrik real-time dengan gauge Ampere & Power Factor
- **Tips Hemat** — Saran praktis untuk menghemat listrik
- **Export/Import** — Backup dan restore data dalam format JSON
- **Responsive** — Optimized untuk desktop dan mobile
- **Secure** — Rate limiting, input validation, security headers, CSP

## Architecture

**Single-server deployment** — Express serves both API and frontend static files in production.

```
┌────────────────────────────┐
│     Express Server         │
│  ┌──────────┬───────────┐  │
│  │ REST API │  Static   │  │
│  │ /api/*   │  Files    │  │
│  └──────────┴───────────┘  │
│         SQLite DB          │
└────────────────────────────┘
```

## Quick Start

### Development
```bash
docker compose up
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

### Production
```bash
docker compose -f docker-compose.prod.yml up -d
# App: http://localhost:3001
```

### Without Docker
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## v2.0 Changes

- **Merged storage**: 6 API calls → 1 (single key `elmon:state`)
- **Debounced saves**: 500ms debounce prevents excessive writes
- **Batch API**: New `/api/batch-get` and `/api/batch-set` endpoints
- **Security**: Rate limiting (120 req/min), input validation, security headers, CSP
- **Prepared statements**: SQLite queries are pre-compiled for speed
- **Device presets**: 23+ common Indonesian household appliances
- **Export/Import**: Backup and restore all data
- **Custom confirm dialogs**: No more browser `confirm()` popups
- **CSS variables**: Consistent theming, smaller bundle
- **Memoized components**: React.memo + useMemo for expensive computations
- **Graceful shutdown**: Proper DB cleanup on SIGTERM/SIGINT
- **Tips hemat listrik**: Energy-saving tips on dashboard
- **Better mobile UX**: Slide-up modals, touch-friendly, smooth animations
- **Removed `cors` dependency**: Inline CORS handling (dev only)
