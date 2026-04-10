# ⚡ PLN Monitor

Monitor konsumsi listrik rumah tangga dengan penyimpanan data persisten via SQLite.

## Arsitektur

```
pln-monitor/
├── backend/          Express API + SQLite (better-sqlite3)
│   ├── server.js     REST API: GET/POST/DELETE /api/storage/:key
│   └── Dockerfile
├── frontend/         React + Vite
│   ├── src/App.jsx   (useStorage hook → fetch /api/storage)
│   └── Dockerfile
├── data/             SQLite database (auto-created, mount as volume)
├── docker-compose.yml        Development (hot reload)
├── docker-compose.prod.yml   Production (single container)
└── Dockerfile.prod           Multi-stage production build
```

---

## 🚀 Cara Menjalankan

### Development (dengan hot reload)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

Edit file di `frontend/src/` → browser otomatis reload.

---

### Production (single container, optimal)

```bash
docker compose -f docker-compose.prod.yml up --build
```

- App: http://localhost:3001  (frontend + API dalam satu container)

---

### Tanpa Docker (lokal)

```bash
# Terminal 1 - Backend
cd backend
npm install
node server.js

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## 💾 Data Persistence

Data disimpan di `./data/storage.db` (SQLite).  
File ini di-mount sebagai Docker volume, sehingga **data tidak hilang** meskipun container dihapus/restart.

Untuk backup:
```bash
cp data/storage.db data/storage.db.backup
```

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/storage/:key` | Ambil nilai |
| POST | `/api/storage/:key` | Simpan nilai `{ value: "..." }` |
| DELETE | `/api/storage/:key` | Hapus nilai |
| GET | `/api/storage?prefix=elmon:` | List semua key |
| GET | `/api/health` | Health check |

Keys yang digunakan:
- `elmon:devices` — daftar perangkat
- `elmon:usage-logs` — log aktivitas
- `elmon:tariff` — golongan tarif PLN terpilih
