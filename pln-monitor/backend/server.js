const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Ensure data directory exists
const dataDir = process.env.DB_DIR || path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "storage.db");
const db = new Database(dbPath);

// Init table + WAL mode for better concurrency
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- Serve frontend build in production ---
const publicDir = path.join(__dirname, "public");
if (process.env.NODE_ENV === "production" && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// --- Storage API ---

// GET /api/storage/:key
app.get("/api/storage/:key", (req, res) => {
  const row = db.prepare("SELECT value FROM kv_store WHERE key = ?").get(req.params.key);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ key: req.params.key, value: row.value });
});

// POST /api/storage/:key  { value: "<json-string>" }
app.post("/api/storage/:key", (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: "Missing value" });
  db.prepare(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
  `).run(req.params.key, value);
  res.json({ key: req.params.key, value });
});

// DELETE /api/storage/:key
app.delete("/api/storage/:key", (req, res) => {
  db.prepare("DELETE FROM kv_store WHERE key = ?").run(req.params.key);
  res.json({ deleted: true, key: req.params.key });
});

// GET /api/storage?prefix=elmon:
app.get("/api/storage", (req, res) => {
  const prefix = req.query.prefix || "";
  const rows = db.prepare("SELECT key FROM kv_store WHERE key LIKE ?").all(prefix + "%");
  res.json({ keys: rows.map((r) => r.key) });
});

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, db: dbPath }));

// SPA fallback in production
if (process.env.NODE_ENV === "production" && fs.existsSync(publicDir)) {
  app.get("*", (_req, res) =>
    res.sendFile(path.join(publicDir, "index.html"))
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ PLN Monitor API running on port ${PORT}`);
  console.log(`   DB: ${dbPath}`);
  console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
});
